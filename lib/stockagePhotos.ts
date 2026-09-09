import { isSupabaseConfigured, supabase } from "./supabase";
import type { Photo } from "./photos";

/**
 * Les photos vivent dans le bucket privé « photos », rangées sous
 * « <user_id>/<id>.jpg ». Elles ne transitent plus par la ligne jsonb du
 * compte : celle-ci ne garde qu'un chemin, et l'image se demande à la
 * pièce, avec une URL signée à durée limitée.
 */

export const BUCKET = "photos";

/** Une heure : bien plus que le temps passé sur un écran de galerie. */
const DUREE_SIGNATURE = 3600;
/** Marge avant expiration, pour ne jamais afficher une URL qui vient de mourir. */
const MARGE = 120_000;

const cache = new Map<string, { url: string; expire: number }>();

/* ─── Encodage ────────────────────────────────────────────────── */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * base64 → octets, décodé à la main.
 *
 * `fetch("data:…")` marcherait sur le web mais pas de façon fiable sous
 * React Native, `Buffer` n'existe pas côté client, et `atob` dépend du
 * moteur JavaScript embarqué. Douze lignes valent mieux qu'une image qui
 * ne se dépose que sur une plateforme sur deux.
 */
export function versOctets(base64: string): Uint8Array {
  const propre = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const octets = new Uint8Array((propre.length * 3) >> 2);
  let sortie = 0, tampon = 0, bits = 0;

  for (const c of propre) {
    tampon = (tampon << 6) | ALPHABET.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      octets[sortie++] = (tampon >> bits) & 0xff;
    }
  }
  // Le « = » de bourrage est retiré plus haut : la taille réelle peut donc
  // être inférieure d'un ou deux octets à l'estimation.
  return sortie === octets.length ? octets : octets.subarray(0, sortie);
}

/** Extrait le base64 d'un data URI, ou null si ce n'en est pas un. */
export function base64DepuisDataUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const virgule = uri.indexOf(",");
  return uri.startsWith("data:") && virgule > 0 ? uri.slice(virgule + 1) : null;
}

/* ─── Écriture ────────────────────────────────────────────────── */

async function monId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Dépose l'image et renvoie son chemin, ou null si ça n'a pas pu se faire
 * (hors ligne, bucket absent). L'appelant garde alors le data URI en local
 * et retentera plus tard : une photo ne doit jamais être perdue parce que
 * le réseau manquait au mauvais moment.
 */
export async function televerser(base64: string, idPhoto: number): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const uid = await monId();
  if (!uid) return null;

  const chemin = `${uid}/${idPhoto}.jpg`;
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(chemin, versOctets(base64), { contentType: "image/jpeg", upsert: true });
    return error ? null : chemin;
  } catch {
    return null;
  }
}

/** Retire le fichier. Sans effet si le chemin est absent ou déjà supprimé. */
export async function supprimerFichier(chemin: string | undefined): Promise<void> {
  if (!chemin || !isSupabaseConfigured) return;
  try {
    await supabase.storage.from(BUCKET).remove([chemin]);
    cache.delete(chemin);
  } catch {
    // Le fichier restera : sans conséquence pour l'utilisateur, et le
    // ménage se fera à la suppression du compte.
  }
}

/**
 * Vide le dossier du compte avant sa suppression.
 *
 * Passe par la liste réelle du bucket plutôt que par « lm_photos » : un
 * dépôt dont l'enregistrement local a échoué y figurerait quand même, et
 * serait sinon oublié. Renvoie le nombre de fichiers retirés, ou -1 si
 * l'opération n'a pas pu aboutir.
 */
export async function viderMonDossier(): Promise<number> {
  if (!isSupabaseConfigured) return -1;
  const uid = await monId();
  if (!uid) return -1;

  try {
    let total = 0;
    // La liste est paginée : on boucle tant qu'elle rend une page pleine.
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET).list(uid, { limit: 100 });
      if (error || !data || data.length === 0) return error ? -1 : total;

      const chemins = data.map(f => `${uid}/${f.name}`);
      const { error: erreurRetrait } = await supabase.storage.from(BUCKET).remove(chemins);
      if (erreurRetrait) return -1;

      chemins.forEach(c => cache.delete(c));
      total += chemins.length;
      if (data.length < 100) return total;
    }
  } catch {
    return -1;
  }
}

/* ─── Lecture ─────────────────────────────────────────────────── */

/**
 * URL affichable d'une photo : le data URI tant qu'elle n'est pas montée
 * dans le bucket, sinon une URL signée. Les signatures sont mises en cache
 * pour ne pas rappeler le serveur à chaque rendu de la galerie.
 */
export async function urlPhoto(p: Photo): Promise<string | null> {
  if (!p.chemin) return p.uri ?? null;

  const connue = cache.get(p.chemin);
  if (connue && connue.expire > Date.now()) return connue.url;

  if (!isSupabaseConfigured) return p.uri ?? null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(p.chemin, DUREE_SIGNATURE);
    if (error || !data?.signedUrl) return p.uri ?? null;
    cache.set(p.chemin, { url: data.signedUrl, expire: Date.now() + DUREE_SIGNATURE * 1000 - MARGE });
    return data.signedUrl;
  } catch {
    return p.uri ?? null;
  }
}

/** Résout un lot de photos en une passe. Clé : l'identifiant de la photo. */
export async function urlsPhotos(photos: Photo[]): Promise<Record<number, string>> {
  const paires = await Promise.all(
    photos.map(async p => [p.id, await urlPhoto(p)] as const),
  );
  const sortie: Record<number, string> = {};
  for (const [id, url] of paires) if (url) sortie[id] = url;
  return sortie;
}

/* ─── Reprise des photos existantes ───────────────────────────── */

/**
 * Monte dans le bucket les photos encore stockées en base64, et renvoie la
 * liste corrigée — ou null si rien n'a bougé, pour éviter une écriture
 * inutile.
 *
 * Le data URI n'est retiré qu'après un dépôt confirmé : en cas de coupure,
 * la photo reste lisible en local et repassera à la prochaine ouverture.
 */
export async function migrerPhotos(photos: Photo[]): Promise<Photo[] | null> {
  if (!isSupabaseConfigured || photos.length === 0) return null;
  const aFaire = photos.filter(p => !p.chemin && base64DepuisDataUri(p.uri));
  if (aFaire.length === 0) return null;
  if (!(await monId())) return null;

  let modifie = false;
  const suite = [...photos];

  for (const photo of aFaire) {
    const base64 = base64DepuisDataUri(photo.uri);
    if (!base64) continue;
    const chemin = await televerser(base64, photo.id);
    if (!chemin) break;                  // réseau perdu : on s'arrête là
    const i = suite.findIndex(p => p.id === photo.id);
    if (i >= 0) {
      suite[i] = { ...suite[i], chemin, uri: undefined };
      modifie = true;
    }
  }

  return modifie ? suite : null;
}
