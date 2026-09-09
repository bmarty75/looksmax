import { storage } from "../hooks/useStorage";
import { isSupabaseConfigured, supabase } from "./supabase";
import { computeCompositeScore, computeCurrentStreak, compute30DayAvg, indexPsl, partsParCategorie } from "./metrics";
import { DEFAULT_HABITS, getRank, todayKey } from "../constants/data";
import { estPseudoDejaPris, loadProfile } from "./profile";
import type { Photo } from "./photos";

/* ─── Réglages de partage ─────────────────────────────────── */

export interface Partage {
  /** Score, rang, streak : le cœur du social, partagé par défaut. */
  stats: boolean;
  habits: boolean;
  goals: boolean;
  /** Photos du visage : sensible, donc désactivé par défaut. */
  photos: boolean;
}

export const PARTAGE_DEFAUT: Partage = { stats: true, habits: true, goals: true, photos: false };
const CLE_PARTAGE = "lm_partage";

export async function chargerPartage(): Promise<Partage> {
  const p = await storage.get(CLE_PARTAGE, PARTAGE_DEFAUT);
  if (!p || typeof p !== "object") return PARTAGE_DEFAUT;
  return {
    stats: p.stats !== false,
    habits: p.habits !== false,
    goals: p.goals !== false,
    photos: p.photos === true,
  };
}

export async function enregistrerPartage(p: Partage): Promise<void> {
  await storage.set(CLE_PARTAGE, p);
}

/* ─── Instantané publié ───────────────────────────────────── */

export interface StatsPartagees {
  psl: number;
  score: number;
  rang: string;
  couleurRang: string;
  streak: number;
  joursActifs: number;
  categories: { libelle: string; taux: number; couleur: string }[];
}

export interface ProfilPublic {
  user_id: string;
  pseudo: string;
  bio: string;
  avatar: string | null;
  stats: StatsPartagees | Record<string, never>;
  habits: { label: string; icon: string; category: string; color: string }[] | null;
  goals: { label: string; icon: string; color: string; progress: number; target: number; unit: string }[] | null;
  /** null = non partagé ; objet vide = partagé mais moins de deux photos. */
  photos: { avant: Photo; apres: Photo } | Record<string, never> | null;
  updated_at?: string;
}

/**
 * Construit l'instantané à publier à partir des données locales, en ne
 * retenant que ce que les réglages autorisent. Les catégories utilisent des
 * couleurs fixes : l'ami qui regarde n'a pas forcément le même thème.
 */
async function construireInstantane(): Promise<Omit<ProfilPublic, "user_id">> {
  const partage = await chargerPartage();
  const profil = await loadProfile();
  const history: Record<string, number> = await storage.get("lm_history", {});
  // Même repli que l'écran Routines : tant que rien n'a été modifié, rien
  // n'est écrit en stockage, et publier [] afficherait un profil sans aucune
  // routine alors que l'appli montre bien celles de départ. Les objectifs,
  // eux, partent d'une liste vide.
  const habits: any[] = await storage.get("lm_habits", DEFAULT_HABITS);
  const goals: any[] = await storage.get("lm_goals", []);
  const photos: Photo[] = await storage.get("lm_photos", []);

  let stats: StatsPartagees | Record<string, never> = {};
  if (partage.stats) {
    const streak = computeCurrentStreak(history);
    const score = computeCompositeScore(history[todayKey()] || 0, streak, compute30DayAvg(history));
    const rang = getRank(score, streak);

    // Taux par catégorie sur 7 jours, reconstitués depuis l'historique local.
    const counts: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const jour = await storage.get(`lm_checked_${d.toISOString().slice(0, 10)}`, {});
      if (jour && typeof jour === "object") {
        Object.entries(jour as Record<string, boolean>).forEach(([id, v]) => {
          if (v) counts[id] = (counts[id] || 0) + 1;
        });
      }
    }

    stats = {
      psl: indexPsl(score, streak),
      score,
      rang: rang.label,
      couleurRang: rang.color,
      streak,
      joursActifs: Object.values(history).filter(v => v > 0).length,
      categories: partsParCategorie(habits, counts, ["#F2B01E", "#4BD68C", "#EFA08D"])
        .map(c => ({ libelle: c.libelle, taux: c.taux, couleur: c.couleur })),
    };
  }

  return {
    pseudo: profil.pseudo,
    bio: profil.bio,
    avatar: profil.avatar,
    stats,
    habits: partage.habits
      ? habits.map(h => ({ label: h.label, icon: h.icon, category: h.category, color: h.color }))
      : null,
    goals: partage.goals
      ? goals.map(g => ({ label: g.label, icon: g.icon, color: g.color, progress: g.progress, target: g.target, unit: g.unit }))
      : null,
    // Uniquement la plus ancienne et la plus récente : c'est l'avant/après,
    // et ça évite d'alourdir la ligne avec toute la galerie.
    photos: !partage.photos
      ? null
      : photos.length >= 2
        ? { avant: photos[photos.length - 1], apres: photos[0] }
        : {},
  };
}

export interface Publication {
  ok: boolean;
  /** Vrai si l'écriture a buté sur l'index unique du pseudo. */
  pseudoPris: boolean;
}

/** Publie l'instantané. Ne lève jamais : hors ligne, on réessaiera plus tard. */
export async function publierProfil(): Promise<Publication> {
  if (!isSupabaseConfigured) return { ok: false, pseudoPris: false };
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return { ok: false, pseudoPris: false };
    const instantane = await construireInstantane();
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: uid, ...instantane }, { onConflict: "user_id" });
    return { ok: !error, pseudoPris: estPseudoDejaPris(error) };
  } catch {
    return { ok: false, pseudoPris: false };
  }
}

/* ─── Amis ────────────────────────────────────────────────── */

export interface Lien {
  id: string;
  demandeur: string;
  destinataire: string;
  statut: "en_attente" | "accepte";
}

export interface Ami {
  lien: Lien;
  /** L'autre personne du lien. */
  profil: { user_id: string; pseudo: string; avatar: string | null };
  /** Vrai si c'est moi qui ai envoyé la demande. */
  jenSuisLauteur: boolean;
}

export interface Reseau {
  amis: Ami[];
  recuesEnAttente: Ami[];
  envoyeesEnAttente: Ami[];
}

const RESEAU_VIDE: Reseau = { amis: [], recuesEnAttente: [], envoyeesEnAttente: [] };

export async function chargerReseau(): Promise<Reseau> {
  if (!isSupabaseConfigured) return RESEAU_VIDE;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const moi = auth.user?.id;
    if (!moi) return RESEAU_VIDE;

    const { data: liens, error } = await supabase
      .from("friendships")
      .select("id, demandeur, destinataire, statut");
    if (error || !liens) return RESEAU_VIDE;

    const autres = liens.map(l => (l.demandeur === moi ? l.destinataire : l.demandeur));
    if (autres.length === 0) return RESEAU_VIDE;

    // Le profil d'une demande encore en attente est invisible (RLS) : sans ça,
    // on afficherait « qui ? » à la place du pseudo. Cette fonction ne rend que
    // pseudo et avatar, et seulement pour les comptes déjà liés à moi.
    type Identite = { user_id: string; pseudo: string; avatar: string | null };
    const { data: identites } = await supabase.rpc("identites_liees");
    const profils: Identite[] = (identites as Identite[] | null) ?? (await supabase
      .from("profiles")
      .select("user_id, pseudo, avatar")
      .in("user_id", autres)).data ?? [];

    const parId = new Map<string, Identite>(profils.map(p => [p.user_id, p]));
    const enrichir = (l: any): Ami => {
      const autre = l.demandeur === moi ? l.destinataire : l.demandeur;
      const p = parId.get(autre);
      return {
        lien: l as Lien,
        profil: p ?? { user_id: autre, pseudo: "Compte", avatar: null },
        jenSuisLauteur: l.demandeur === moi,
      };
    };

    const tous = liens.map(enrichir);
    return {
      amis: tous.filter(a => a.lien.statut === "accepte"),
      recuesEnAttente: tous.filter(a => a.lien.statut === "en_attente" && !a.jenSuisLauteur),
      envoyeesEnAttente: tous.filter(a => a.lien.statut === "en_attente" && a.jenSuisLauteur),
    };
  } catch {
    return RESEAU_VIDE;
  }
}

export interface Resultat { ok: boolean; message: string | null }

export async function chercherProfils(recherche: string) {
  if (!isSupabaseConfigured || recherche.trim().length < 3) return [];
  try {
    const { data, error } = await supabase.rpc("chercher_profils", { recherche });
    if (error || !data) return [];
    return data as { user_id: string; pseudo: string; avatar: string | null }[];
  } catch {
    return [];
  }
}

export async function envoyerDemande(destinataire: string): Promise<Resultat> {
  if (!isSupabaseConfigured) return { ok: false, message: "Serveur non configuré." };
  try {
    const { data: auth } = await supabase.auth.getUser();
    const moi = auth.user?.id;
    if (!moi) return { ok: false, message: "Session expirée." };

    // Si l'autre m'a déjà invité, on accepte au lieu de créer un doublon.
    const { data: existant } = await supabase
      .from("friendships")
      .select("id, demandeur, statut")
      .or(`and(demandeur.eq.${moi},destinataire.eq.${destinataire}),and(demandeur.eq.${destinataire},destinataire.eq.${moi})`)
      .limit(1);

    if (existant && existant.length > 0) {
      const l = existant[0];
      if (l.statut === "accepte") return { ok: false, message: "Vous êtes déjà amis." };
      if (l.demandeur === destinataire) return await accepterDemande(l.id);
      return { ok: false, message: "Demande déjà envoyée." };
    }

    const { error } = await supabase
      .from("friendships")
      .insert({ demandeur: moi, destinataire, statut: "en_attente" });
    if (error) return { ok: false, message: "Envoi impossible." };
    return { ok: true, message: "Demande envoyée." };
  } catch {
    return { ok: false, message: "Connexion au serveur impossible." };
  }
}

export async function accepterDemande(idLien: string): Promise<Resultat> {
  try {
    const { error } = await supabase
      .from("friendships")
      .update({ statut: "accepte" })
      .eq("id", idLien);
    return error
      ? { ok: false, message: "Impossible d'accepter." }
      : { ok: true, message: "Demande acceptée." };
  } catch {
    return { ok: false, message: "Connexion au serveur impossible." };
  }
}

export async function retirerLien(idLien: string): Promise<Resultat> {
  try {
    const { error } = await supabase.from("friendships").delete().eq("id", idLien);
    return error
      ? { ok: false, message: "Suppression impossible." }
      : { ok: true, message: null };
  } catch {
    return { ok: false, message: "Connexion au serveur impossible." };
  }
}

/** Profil complet d'un ami. Renvoie null si le lien n'est pas accepté. */
export async function chargerProfilAmi(userId: string): Promise<ProfilPublic | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as ProfilPublic;
  } catch {
    return null;
  }
}
