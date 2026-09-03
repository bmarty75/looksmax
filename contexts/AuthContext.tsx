import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { adoptLegacyData, pullFromCloud, setActiveUser } from "../hooks/useStorage";
import { isSupabaseConfigured, SESSION_STORAGE_KEY, supabase } from "../lib/supabase";

/**
 * Session déjà mémorisée sur l'appareil, lue directement pour un
 * démarrage instantané même sans réseau. Renvoie null au moindre doute :
 * `getSession()` reste l'autorité, ceci n'est qu'un raccourci d'affichage.
 */
async function readCachedSession(): Promise<Session | null> {
  if (!SESSION_STORAGE_KEY) return null;
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const s = (parsed?.currentSession ?? parsed) as Session | null;
    if (!s?.user?.id) return null;
    if (s.expires_at && s.expires_at * 1000 < Date.now()) return null; // expirée
    return s;
  } catch {
    return null;
  }
}

/** `ok: true` avec un message = succès à annoncer (ex. « confirme ton e-mail »). */
export interface AuthResult {
  ok: boolean;
  message: string | null;
}

interface AuthCtx {
  session: Session | null;
  email: string | null;
  /** true tant qu'on ne sait pas encore si une session existe (évite un flash de l'écran de connexion). */
  loading: boolean;
  /** true pendant la récupération des données du compte, juste après connexion. */
  syncing: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  session: null,
  email: null,
  loading: true,
  syncing: false,
  signIn: async () => ({ ok: false, message: null }),
  signUp: async () => ({ ok: false, message: null }),
  signOut: async () => {},
});

/** Traduit les messages d'erreur Supabase, qui sont en anglais. */
function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("user already registered")) return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("password should be at least")) return "Le mot de passe doit faire au moins 6 caractères.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Adresse e-mail invalide.";
  if (m.includes("email not confirmed")) return "Confirme ton e-mail avant de te connecter.";
  // Supabase plafonne l'envoi d'e-mails à quelques-uns par heure.
  if (m.includes("email rate limit") || m.includes("over_email_send_rate_limit")) {
    return "Trop d'e-mails envoyés. Réessaie dans une heure, ou désactive la confirmation par e-mail dans Supabase.";
  }
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many requests")) {
    return "Trop de tentatives. Patiente quelques instants avant de réessayer.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) return "Connexion au serveur impossible.";
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Comptes déjà rattachés pendant cette session d'app : sert à ne montrer
  // l'écran de synchro qu'à la première connexion d'un compte, et pas à
  // chaque revérification en arrière-plan.
  const seenUsers = useRef(new Set<string>());

  // Rattache le stockage au compte et récupère ses données.
  // La synchro ne doit jamais bloquer l'entrée dans l'app : hors ligne,
  // on continue avec le cache local et on resynchronisera plus tard.
  const activate = async (s: Session | null) => {
    const userId = s?.user?.id ?? null;
    setActiveUser(userId);
    if (!userId) return;

    const première = !seenUsers.current.has(userId);
    seenUsers.current.add(userId);

    if (première) setSyncing(true);
    try {
      await pullFromCloud();
      await adoptLegacyData();
    } catch {
      // réseau indisponible : on garde les données déjà en cache
    } finally {
      if (première) setSyncing(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    (async () => {
      // 1. Décision immédiate à partir de la session mémorisée : l'app est
      //    utilisable tout de suite, y compris sans réseau.
      const cached = await readCachedSession();
      if (cached) {
        setActiveUser(cached.user.id);
        seenUsers.current.add(cached.user.id); // synchro silencieuse ensuite
        setSession(cached);
        setLoading(false);
      }

      // 2. Vérification auprès du serveur, puis synchro, en arrière-plan.
      try {
        const { data } = await supabase.auth.getSession();
        await activate(data.session);
        setSession(data.session);
      } catch {
        // hors ligne : on reste sur la session mémorisée
      } finally {
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      await activate(s);
      setSession(s);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { ok: false, message: traduireErreur(error.message) } : { ok: true, message: null };
    } catch {
      return { ok: false, message: "Connexion au serveur impossible." };
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) return { ok: false, message: traduireErreur(error.message) };
      // Si la confirmation par e-mail est activée dans Supabase, aucune session
      // n'est ouverte tout de suite : on le dit clairement plutôt que de laisser
      // l'utilisateur devant un écran qui ne bouge pas.
      if (!data.session) {
        return { ok: true, message: "Compte créé. Ouvre l'e-mail de confirmation, puis reviens te connecter." };
      }
      return { ok: true, message: null };
    } catch {
      return { ok: false, message: "Connexion au serveur impossible." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        email: session?.user?.email ?? null,
        loading,
        syncing,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
