import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { storage } from "../hooks/useStorage";

export interface Profile {
  pseudo: string;
  bio: string;
  /** Image encodée en data URI, ou null. */
  avatar: string | null;
}

export const PROFILE_KEY = "lm_profile";
export const EMPTY_PROFILE: Profile = { pseudo: "", bio: "", avatar: null };

export const PSEUDO_MAX = 20;
export const BIO_MAX = 160;

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
