import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { storage } from "../hooks/useStorage";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface Profile {
  pseudo: string;
  bio: string;
  /** Image encodée en data URI, ou null. */
  avatar: string | null;
}

export const PROFILE_KEY = "lm_profile";
export const EMPTY_PROFILE: Profile = { pseudo: "", bio: "", avatar: null };

export const PSEUDO_MIN = 3;
export const PSEUDO_MAX = 20;
export const BIO_MAX = 160;

/** Doit rester aligné sur la contrainte « pseudo_format » de social.sql. */
const PSEUDO_AUTORISE = /^[A-Za-z0-9_.-]+$/;

/** Renvoie le motif du refus, ou null si le pseudo est acceptable. */
export function verifierPseudo(pseudo: string): string | null {
  const p = pseudo.trim();
  if (p.length === 0) return "Choisis un pseudo.";
  if (p.length < PSEUDO_MIN) return `Le pseudo doit faire au moins ${PSEUDO_MIN} caractères.`;
  if (p.length > PSEUDO_MAX) return `Le pseudo ne doit pas dépasser ${PSEUDO_MAX} caractères.`;
  if (!PSEUDO_AUTORISE.test(p)) return "Lettres, chiffres, « _ », « . » et « - » uniquement.";
  return null;
}

export type Disponibilite = "libre" | "pris" | "inconnu";

/**
 * Demande au serveur si le pseudo est déjà porté par quelqu'un d'autre.
 * Le sien compte comme libre. « inconnu » quand le serveur est injoignable :
 * l'appelant décide alors s'il tente quand même l'écriture, que l'index
 * unique refusera le cas échéant.
 */
export async function pseudoDisponible(pseudo: string): Promise<Disponibilite> {
  if (!isSupabaseConfigured) return "inconnu";
  try {
    const { data, error } = await supabase.rpc("pseudo_disponible", { recherche: pseudo.trim() });
    if (error || typeof data !== "boolean") return "inconnu";
    return data ? "libre" : "pris";
  } catch {
    return "inconnu";
  }
}

/** Vrai si l'erreur Postgres vient de l'index unique sur le pseudo. */
export function estPseudoDejaPris(erreur: { code?: string; message?: string } | null): boolean {
  if (!erreur) return false;
  return erreur.code === "23505" || (erreur.message ?? "").includes("profiles_pseudo_unique");
}

/**
 * Pose le pseudo dans public.profiles dès la création du compte, pour qu'il
 * soit réservé sans attendre la première publication du profil.
 */
export async function reserverPseudo(userId: string, pseudo: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, pseudo: pseudo.trim() }, { onConflict: "user_id" });
    return !error;
  } catch {
    return false;
  }
}

/** Côté de l'avatar en pixels : suffisant pour l'affichage, léger à synchroniser. */
const AVATAR_SIZE = 256;

export async function loadProfile(): Promise<Profile> {
  const p = await storage.get(PROFILE_KEY, EMPTY_PROFILE);
  if (!p || typeof p !== "object") return EMPTY_PROFILE;
  return {
    pseudo: typeof p.pseudo === "string" ? p.pseudo : "",
    bio: typeof p.bio === "string" ? p.bio : "",
    avatar: typeof p.avatar === "string" ? p.avatar : null,
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await storage.set(PROFILE_KEY, profile);
}

/** Initiales affichées tant qu'aucune photo n'est choisie. */
export function initiales(pseudo: string, email: string | null): string {
  const source = pseudo.trim() || email?.split("@")[0] || "";
  const mots = source.split(/[\s._-]+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

export type AvatarPick =
  | { ok: true; avatar: string }
  | { ok: false; message: string | null }; // message null = simple annulation

/**
 * Ouvre la galerie, recadre en carré, puis réduit à 256 px avant d'encoder.
 * Sans cette réduction, une photo pleine résolution partirait telle quelle
 * dans le stockage synchronisé et serait retéléchargée à chaque connexion.
 */
export async function pickAvatar(): Promise<AvatarPick> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, message: "Autorise l'accès à tes photos pour choisir un avatar." };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return { ok: false, message: null };

    const rendu = await ImageManipulator.manipulate(result.assets[0].uri)
      .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE })
      .renderAsync();

    const image = await rendu.saveAsync({
      compress: 0.7,
      format: SaveFormat.JPEG,
      base64: true,
    });

    if (!image.base64) return { ok: false, message: "Impossible de lire cette image." };
    return { ok: true, avatar: `data:image/jpeg;base64,${image.base64}` };
  } catch {
    return { ok: false, message: "Impossible de charger cette image." };
  }
}
