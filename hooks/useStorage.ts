import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSupabaseConfigured, supabase, USER_DATA_TABLE } from "../lib/supabase";

/**
 * Stockage « local d'abord » :
 *   - lecture  → cache local uniquement (instantané, marche hors ligne)
 *   - écriture → cache local immédiat, puis envoi à Supabase en arrière-plan
 *
 * Les écrans cochent des habitudes des dizaines de fois par session ;
 * faire un aller-retour réseau à chaque coche rendrait l'app lente et
 * inutilisable sans connexion. La synchro se fait donc en différé.
 */

/** Préférences de l'appareil, communes à tous les comptes (jamais synchronisées). */
const DEVICE_KEYS = new Set(["lm_theme"]);

/** Clés historiques, avant l'arrivée des comptes (reprises au 1er login). */
const LEGACY_PREFIXES = ["lm_habits", "lm_goals", "lm_photos", "lm_history", "lm_stats", "lm_checked_"];

let activeUserId: string | null = null;

// ─── Fin de synchro ───────────────────────────────────────────
// Les écrans lisent le cache local dès leur affichage, souvent avant que la
// synchro en arrière-plan ne soit revenue. Sans ce signal, ils restaient sur
// ces données incomplètes : un streak à 0 jusqu'à la navigation suivante.
const auditeurs = new Set<() => void>();

/** Appelle `fn` à chaque synchro terminée. Renvoie de quoi se désabonner. */
export function abonnerSynchro(fn: () => void): () => void {
  auditeurs.add(fn);
  return () => { auditeurs.delete(fn); };
}

const namespaced = (key: string) =>
  DEVICE_KEYS.has(key) ? key : `lm:${activeUserId ?? "local"}:${key}`;

// ─── File d'envoi différé ─────────────────────────────────────
const pending = new Map<string, any>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  if (!isSupabaseConfigured || !activeUserId || pending.size === 0) return;

  const batch = Array.from(pending.entries()).map(([key, value]) => ({
    user_id: activeUserId,
    key,
    value,
  }));
  pending.clear();

  try {
    await supabase.from(USER_DATA_TABLE).upsert(batch, { onConflict: "user_id,key" });
  } catch {
    // Hors ligne ou serveur injoignable : les données restent en local,
    // elles repartiront au prochain enregistrement ou à la prochaine ouverture.
    batch.forEach(row => { if (!pending.has(row.key)) pending.set(row.key, row.value); });
  }
}

function queuePush(key: string, value: any) {
  if (DEVICE_KEYS.has(key)) return;
  pending.set(key, value);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 800);
}

// ─── API utilisée par les écrans (inchangée) ──────────────────
export const storage = {
  get: async (key: string, defaultValue: any) => {
    try {
      const val = await AsyncStorage.getItem(namespaced(key));
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  /**
   * Toutes les valeurs dont la clé commence par `prefixe`, indexées par la
   * fin de clé. Sert aux données rangées une ligne par jour.
   */
  parPrefixe: async (prefixe: string): Promise<Record<string, any>> => {
    try {
      const complet = namespaced(prefixe);
      const cles = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(complet));
      if (cles.length === 0) return {};
      const sortie: Record<string, any> = {};
      for (const [k, v] of await AsyncStorage.multiGet(cles)) {
        if (v == null) continue;
        try { sortie[k.slice(complet.length)] = JSON.parse(v); } catch { /* valeur illisible : ignorée */ }
      }
      return sortie;
    } catch {
      return {};
    }
  },
  set: async (key: string, value: any) => {
    // Au démarrage, les onglets se montent le temps d'une image avant que la
    // navigation ne renvoie vers la connexion : sans ce garde-fou, ils
    // écrivent un historique vide dans l'espace « lm:local: », commun à tous
    // les comptes de l'appareil et que rien ne relit jamais.
    if (!DEVICE_KEYS.has(key) && !activeUserId) return;
    try {
      await AsyncStorage.setItem(namespaced(key), JSON.stringify(value));
      queuePush(key, value);
    } catch {}
  },
};

// ─── Cycle de vie du compte ───────────────────────────────────

/** Bascule le stockage sur un compte (ou sur le mode déconnecté si null). */
export function setActiveUser(userId: string | null) {
  // Les écritures en attente ne sont abandonnées que si l'on change vraiment
  // de compte — il ne faut pas pousser les données de l'un chez l'autre.
  // Supabase rappelle cette fonction pour le même compte à chaque
  // renouvellement de jeton, environ toutes les heures : vider la file à ce
  // moment-là perdait une coche faite dans la seconde précédente.
  if (userId !== activeUserId) {
    pending.clear();
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  }
  activeUserId = userId;
}

/**
 * Récupère les données du compte depuis Supabase vers le cache local.
 * Ne lève jamais : hors ligne, on garde simplement le cache existant.
 */
export async function pullFromCloud(): Promise<void> {
  if (!isSupabaseConfigured || !activeUserId) return;

  try {
    const { data, error } = await supabase
      .from(USER_DATA_TABLE)
      .select("key, value")
      .eq("user_id", activeUserId);

    if (error || !data) return;

    // Une clé encore en file d'envoi porte une modification que le serveur
    // n'a pas reçue : sa version distante est plus ancienne, l'écrire en
    // local annulerait ce que l'utilisateur vient de faire.
    await Promise.all(
      data
        .filter(row => !pending.has(row.key))
        .map(row => AsyncStorage.setItem(namespaced(row.key), JSON.stringify(row.value))),
    );
    auditeurs.forEach(fn => fn());
  } catch {
    // réseau indisponible
  }
}

/** Envoie tout le cache local du compte vers Supabase. Ne lève jamais. */
export async function pushAllToCloud(): Promise<void> {
  if (!isSupabaseConfigured || !activeUserId) return;

  try {
    const prefix = `lm:${activeUserId}:`;
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix));
    if (keys.length === 0) return;

    const entries = await AsyncStorage.multiGet(keys);
    const rows = entries
      .filter(([, v]) => v != null)
      .map(([k, v]) => ({
        user_id: activeUserId,
        key: k.slice(prefix.length),
        value: JSON.parse(v as string),
      }));

    if (rows.length > 0) {
      await supabase.from(USER_DATA_TABLE).upsert(rows, { onConflict: "user_id,key" });
    }
  } catch {
    // réseau indisponible : les données restent en local
  }
}

/**
 * Efface du cache local tout ce qui appartient au compte actif.
 * Appelé après la suppression du compte : sans ça, les habitudes, l'historique
 * et les photos resteraient lisibles sur l'appareil, et la personne suivante
 * à se connecter les verrait réapparaître si l'identifiant était réutilisé.
 * Les préférences de l'appareil (thème) ne sont pas touchées.
 */
export async function effacerDonneesLocales(): Promise<void> {
  if (!activeUserId) return;
  pending.clear();
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  try {
    const prefix = `lm:${activeUserId}:`;
    // « lm:local: » part aussi : c'est le résidu laissé par les versions
    // antérieures au garde-fou de storage.set, et il n'appartient à personne.
    const keys = (await AsyncStorage.getAllKeys())
      .filter(k => k.startsWith(prefix) || k.startsWith("lm:local:"));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // Rien à rattraper : le compte n'existe plus côté serveur de toute façon.
  }
}

/**
 * Reprend les données créées avant l'arrivée des comptes.
 * Ne s'exécute que si le compte est encore vide, pour ne jamais
 * écraser des données déjà synchronisées.
 */
export async function adoptLegacyData(): Promise<boolean> {
  if (!activeUserId) return false;

  const allKeys = await AsyncStorage.getAllKeys();
  const legacy = allKeys.filter(k => LEGACY_PREFIXES.some(p => k.startsWith(p)) && !k.startsWith("lm:"));
  if (legacy.length === 0) return false;

  const alreadyThere = allKeys.some(k => k.startsWith(`lm:${activeUserId}:`));
  if (alreadyThere) return false;

  const entries = await AsyncStorage.multiGet(legacy);
  await AsyncStorage.multiSet(
    entries.filter(([, v]) => v != null).map(([k, v]) => [namespaced(k), v as string]),
  );
  await pushAllToCloud();
  return true;
}
