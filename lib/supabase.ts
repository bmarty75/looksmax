import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Renseigné dans .env — tant que c'est faux, l'app reste utilisable hors ligne. */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

export const supabase = createClient(
  isSupabaseConfigured ? url : "http://localhost",
  isSupabaseConfigured ? anonKey : "public-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Le lien de réinitialisation dépose son jeton dans le fragment de
      // l'URL : sans cette détection, cliquer sur l'e-mail ne ferait rien.
      // Sur mobile, le lien passe par le schéma « looksmax:// » et c'est le
      // système, pas la barre d'adresse, qui transporte le jeton.
      detectSessionInUrl: Platform.OS === "web",
    },
  },
);

/** Où Supabase renvoie l'utilisateur après le clic sur l'e-mail de récupération. */
export function urlRetourRecuperation(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/reset-password`;
  }
  return "looksmax://reset-password";
}

/** Table clé/valeur par utilisateur (voir supabase/schema.sql). */
export const USER_DATA_TABLE = "user_data";

/**
 * Clé sous laquelle supabase-js range la session.
 * On la lit nous-mêmes au démarrage pour décider tout de suite si
 * l'utilisateur est connecté : `getSession()` peut mettre plusieurs
 * secondes quand le réseau est injoignable, ce qui figerait l'app
 * sur l'écran de chargement à chaque ouverture hors ligne.
 */
export const SESSION_STORAGE_KEY: string | null = (() => {
  if (!isSupabaseConfigured) return null;
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
})();
