import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

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
      // Pas de redirection OAuth : on est en e-mail/mot de passe.
      detectSessionInUrl: false,
    },
  },
);

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
