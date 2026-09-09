import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { adoptLegacyData, effacerDonneesLocales, pullFromCloud, pushAllToCloud, setActiveUser } from "../hooks/useStorage";
import { EMPTY_PROFILE, reserverPseudo, saveProfile } from "../lib/profile";
import { isSupabaseConfigured, SESSION_STORAGE_KEY, supabase, urlRetourRecuperation } from "../lib/supabase";

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
  signUp: (email: string, password: string, pseudo: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  /** Envoie l'e-mail contenant le lien de réinitialisation. */
  envoyerLienReinitialisation: (email: string) => Promise<AuthResult>;
  /** true quand l'utilisateur arrive depuis ce lien et doit choisir un mot de passe. */
  recuperation: boolean;
  /** Pose le nouveau mot de passe et met fin à la récupération. */
  definirMotDePasse: (nouveau: string) => Promise<AuthResult>;
  /** Efface définitivement le compte et toutes ses données. */
  supprimerCompte: (motDePasse: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthCtx>({
  session: null,
  email: null,
  loading: true,
  syncing: false,
  signIn: async () => ({ ok: false, message: null }),
  signUp: async () => ({ ok: false, message: null }),
  signOut: async () => {},
  changePassword: async () => ({ ok: false, message: null }),
  envoyerLienReinitialisation: async () => ({ ok: false, message: null }),
  recuperation: false,
  definirMotDePasse: async () => ({ ok: false, message: null }),
  supprimerCompte: async () => ({ ok: false, message: null }),
});

/** Traduit les messages d'erreur Supabase, qui sont en anglais. */
function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("user already registered")) return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("password should be at least")) return "Le mot de passe doit faire au moins 6 caractères.";
  // Supabase formule le refus de plusieurs façons : « invalid email »,
  // « unable to validate email », ou « Email address "x" is invalid ».
  if (m.includes("unable to validate email") || m.includes("invalid email")
      || m.includes("email_address_invalid") || (m.includes("email address") && m.includes("is invalid"))) {
    return "Adresse e-mail invalide.";
  }
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
  const [recuperation, setRecuperation] = useState(false);

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

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      // Le lien de l'e-mail ouvre une session valide : sans ce drapeau,
      // l'utilisateur atterrirait sur le tableau de bord sans jamais avoir
      // choisi de nouveau mot de passe, et le lien resterait la seule clé.
      if (event === "PASSWORD_RECOVERY") setRecuperation(true);
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

  const signUp = async (email: string, password: string, pseudo: string): Promise<AuthResult> => {
    const nom = pseudo.trim();
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) return { ok: false, message: traduireErreur(error.message) };

      // Si la confirmation par e-mail est activée dans Supabase, aucune session
      // n'est ouverte tout de suite : on le dit clairement plutôt que de laisser
      // l'utilisateur devant un écran qui ne bouge pas. Le pseudo ne peut pas
      // être réservé sans session ; il le sera au premier enregistrement.
      if (!data.session) {
        return { ok: true, message: "Compte créé. Ouvre l'e-mail de confirmation, puis reviens te connecter." };
      }

      // Le pseudo est posé tout de suite, sans attendre la première visite de
      // l'onglet Amis : sans ça, il resterait libre et un autre pourrait le
      // prendre entre-temps. On rattache d'abord le stockage au compte, sinon
      // le profil irait dans l'espace « déconnecté ».
      const uid = data.session.user.id;
      setActiveUser(uid);
      seenUsers.current.add(uid);            // pas d'écran de synchro : rien à récupérer
      await saveProfile({ ...EMPTY_PROFILE, pseudo: nom });
      await reserverPseudo(uid, nom);
      await pushAllToCloud();

      return { ok: true, message: null };
    } catch {
      return { ok: false, message: "Connexion au serveur impossible." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveUser(null);
    setSession(null);
    setRecuperation(false);
  };

  const supprimerCompte = async (motDePasse: string): Promise<AuthResult> => {
    const adresse = session?.user?.email;
    if (!adresse) return { ok: false, message: "Session expirée, reconnecte-toi." };
    if (!motDePasse) return { ok: false, message: "Saisis ton mot de passe pour confirmer." };

    try {
      // Même précaution que pour le changement de mot de passe : un appareil
      // déverrouillé laissé sans surveillance ne doit pas suffire à effacer
      // un compte, et c'est ici irréversible.
      const { error: erreurVerif } = await supabase.auth.signInWithPassword({
        email: adresse,
        password: motDePasse,
      });
      if (erreurVerif) {
        return erreurVerif.message.toLowerCase().includes("invalid login credentials")
          ? { ok: false, message: "Mot de passe incorrect." }
          : { ok: false, message: traduireErreur(erreurVerif.message) };
      }

      const { error } = await supabase.rpc("supprimer_mon_compte");
      if (error) {
        // La fonction n'existe pas encore : mieux vaut le dire que laisser
        // croire que le compte a été effacé.
        if (error.code === "PGRST202" || error.message.includes("supprimer_mon_compte")) {
          return { ok: false, message: "Suppression indisponible : la fonction manque côté serveur." };
        }
        return { ok: false, message: traduireErreur(error.message) };
      }

      // Le compte n'existe plus : on efface la trace locale avant de fermer
      // la session, tant qu'on sait encore à quel identifiant elle appartient.
      await effacerDonneesLocales();
      await supabase.auth.signOut();
      setActiveUser(null);
      setSession(null);
      setRecuperation(false);
      seenUsers.current.clear();
      return { ok: true, message: null };
    } catch {
      return { ok: false, message: "Connexion au serveur impossible." };
    }
  };

  const envoyerLienReinitialisation = async (email: string): Promise<AuthResult> => {
    const adresse = email.trim();
    if (!adresse) return { ok: false, message: "Renseigne ton adresse e-mail." };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(adresse, {
        redirectTo: urlRetourRecuperation(),
      });
      if (error) return { ok: false, message: traduireErreur(error.message) };
      // Réponse volontairement identique que l'adresse existe ou non : dire
      // « ce compte n'existe pas » permettrait de savoir qui est inscrit.
      return {
        ok: true,
        message: "Si un compte existe avec cette adresse, le lien vient d'y être envoyé. Pense à regarder tes indésirables.",
      };
    } catch {
      return { ok: false, message: "Connexion au serveur impossible." };
    }
  };

  const definirMotDePasse = async (nouveau: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: nouveau });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("should be different")) {
          return { ok: false, message: "Choisis un mot de passe différent de l'ancien." };
        }
        // Le lien n'est valable qu'une heure et qu'une fois.
        if (m.includes("session") || m.includes("expired") || m.includes("token")) {
          return { ok: false, message: "Ce lien a expiré. Redemande-en un depuis l'écran de connexion." };
        }
        return { ok: false, message: traduireErreur(error.message) };
      }
      setRecuperation(false);
      return { ok: true, message: "Mot de passe modifié." };
    } catch {
      return { ok: false, message: "Connexion au serveur impossible." };
    }
  };

  const changePassword = async (current: string, next: string): Promise<AuthResult> => {
    const adresse = session?.user?.email;
    if (!adresse) return { ok: false, message: "Session expirée, reconnecte-toi." };

    try {
      // Supabase autorise le changement avec la seule session ouverte : on
      // revérifie le mot de passe actuel pour qu'un appareil déverrouillé
      // laissé sans surveillance ne suffise pas à verrouiller le compte.
      const { error: erreurVerif } = await supabase.auth.signInWithPassword({
        email: adresse,
        password: current,
      });
      if (erreurVerif) {
        const m = erreurVerif.message.toLowerCase();
        if (m.includes("invalid login credentials")) {
          return { ok: false, message: "Mot de passe actuel incorrect." };
        }
        return { ok: false, message: traduireErreur(erreurVerif.message) };
      }

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("should be different")) {
          return { ok: false, message: "Le nouveau mot de passe doit être différent de l'actuel." };
        }
        return { ok: false, message: traduireErreur(error.message) };
      }
      return { ok: true, message: "Mot de passe modifié." };
    } catch {
      return { ok: false, message: "Connexion au serveur impossible." };
    }
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
        changePassword,
        envoyerLienReinitialisation,
        recuperation,
        definirMotDePasse,
        supprimerCompte,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
