import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export interface Photo {
  id: number;
  /** Date lisible, format français (historique). */
  date: string;
  /** Date ISO (AAAA-MM-JJ) : sert aux calculs et au tri. Absente sur les photos d'avant. */
  dateKey?: string;
  uri: string;
}

/** Côté le plus long, en pixels. Assez net pour comparer, assez léger pour synchroniser. */
const PHOTO_MAX_SIZE = 1000;

export type PhotoPick =
  | { ok: true; photo: Photo }
  | { ok: false; message: string | null }; // message null = annulation

/**
 * Réduit et réencode avant stockage. Indispensable : les photos partent dans
 * le stockage synchronisé, et une image de smartphone brute (plusieurs Mo)
 * y serait retéléchargée à chaque connexion.
 */
async function versPhoto(uri: string): Promise<PhotoPick> {
  const rendu = await ImageManipulator.manipulate(uri)
    .resize({ width: PHOTO_MAX_SIZE })
    .renderAsync();

  const image = await rendu.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  if (!image.base64) return { ok: false, message: "Impossible de lire cette image." };

  const maintenant = new Date();
  return {
    ok: true,
    photo: {
      id: Date.now(),
      date: maintenant.toLocaleDateString("fr-FR"),
      dateKey: maintenant.toISOString().slice(0, 10),
      uri: `data:image/jpeg;base64,${image.base64}`,
    },
  };
}

export async function prendrePhoto(): Promise<PhotoPick> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { ok: false, message: "Autorise l'accès à la caméra dans les réglages." };
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (res.canceled || !res.assets?.[0]?.uri) return { ok: false, message: null };
    return await versPhoto(res.assets[0].uri);
  } catch {
    return { ok: false, message: "Impossible d'utiliser la caméra." };
  }
}

export async function choisirPhoto(): Promise<PhotoPick> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, message: "Autorise l'accès à ta galerie dans les réglages." };
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return { ok: false, message: null };
    return await versPhoto(res.assets[0].uri);
  } catch {
    return { ok: false, message: "Impossible de charger cette image." };
  }
}

/** Date ISO d'une photo, en repassant si besoin par l'ancien format JJ/MM/AAAA. */
export function photoDateKey(p: Photo): string | null {
  if (p.dateKey) return p.dateKey;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(p.date ?? "");
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/** Nombre de jours entre deux photos, ou null si une date manque. */
export function ecartEnJours(a: Photo, b: Photo): number | null {
  const ka = photoDateKey(a), kb = photoDateKey(b);
  if (!ka || !kb) return null;
  const diff = Date.parse(kb) - Date.parse(ka);
  if (Number.isNaN(diff)) return null;
  return Math.abs(Math.round(diff / 86400000));
}

const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

/** Regroupe les photos par mois, du plus récent au plus ancien. */
export function grouperParMois(photos: Photo[]): { titre: string; photos: Photo[] }[] {
  const groupes = new Map<string, Photo[]>();
  for (const p of photos) {
    const k = photoDateKey(p);
    const cle = k ? k.slice(0, 7) : "0000-00";
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle)!.push(p);
  }
  return Array.from(groupes.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([cle, ps]) => {
      const [annee, mois] = cle.split("-");
      const titre = cle === "0000-00" ? "SANS DATE" : `${MOIS[Number(mois) - 1]} ${annee}`.toUpperCase();
      return { titre, photos: ps };
    });
}

/** Moyenne des scores enregistrés entre deux dates incluses. */
export function moyenneScore(history: Record<string, number>, debut: string, fin: string): number | null {
  const valeurs = Object.entries(history)
    .filter(([k]) => k >= debut && k <= fin)
    .map(([, v]) => v);
  if (valeurs.length === 0) return null;
  return Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length);
}
