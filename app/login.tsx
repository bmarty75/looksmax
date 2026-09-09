import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { ThemeColors, useTheme } from "../contexts/ThemeContext";
import { Disponibilite, PSEUDO_MAX, pseudoDisponible, verifierPseudo } from "../lib/profile";
import { isSupabaseConfigured } from "../lib/supabase";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: c.bg },
    content:     { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 },
    brand:       { fontSize: 10, letterSpacing: 4, color: c.amber, fontWeight: "700", textAlign: "center" },
    title:       { fontSize: 28, fontWeight: "800", color: c.text, textAlign: "center", marginTop: 6, marginBottom: 4 },
    subtitle:    { fontSize: 13, color: c.textMuted, textAlign: "center", marginBottom: 32 },
    label:       { fontSize: 10, letterSpacing: 2, color: c.textFaint, fontWeight: "700", marginBottom: 6 },
    input:       { backgroundColor: c.input, borderWidth: 1, borderColor: c.border2, borderRadius: 10, color: c.text, padding: 14, fontSize: 15, marginBottom: 16 },
    submitBtn:   { backgroundColor: c.amber, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4 },
    submitText:  { color: c.onAmber, fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
    switchBtn:   { marginTop: 22, alignItems: "center", padding: 8 },
    switchText:  { fontSize: 13, color: c.textSub },
    switchStrong:{ color: c.amber, fontWeight: "700" },
    oubliBtn:    { marginTop: 14, alignItems: "center", padding: 6 },
    oubliTxt:    { fontSize: 12.5, color: c.textMuted, fontWeight: "600" },
    msg:         { fontSize: 12, textAlign: "center", marginBottom: 14, lineHeight: 18, fontWeight: "600" },
    msgError:    { color: c.coral },
    msgOk:       { color: c.green },
    aide:        { fontSize: 11, marginTop: -10, marginBottom: 16, lineHeight: 16, fontWeight: "600" },
    aideNeutre:  { color: c.textMuted },
    notice:      { backgroundColor: c.card, borderWidth: 1, borderColor: `${c.amber}44`, borderLeftWidth: 3, borderLeftColor: c.amber, borderRadius: 12, padding: 16, gap: 8 },
    noticeTitle: { fontSize: 13, fontWeight: "800", color: c.text },
    noticeText:  { fontSize: 12, color: c.textSub, lineHeight: 19 },
    code:        { fontSize: 11, color: c.amber, fontWeight: "700" },
  });
}

export default function Login() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signIn, signUp, envoyerLienReinitialisation } = useAuth();

  const [mode, setMode]         = useState<"signin" | "signup" | "oubli">("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo]     = useState("");
  const [dispo, setDispo]       = useState<Disponibilite | null>(null);
  const [notice, setNotice]     = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy]         = useState(false);

  const pseudoFautif = mode === "signup" && pseudo.length > 0 ? verifierPseudo(pseudo) : null;

  // Vérification différée : on interroge le serveur quand la frappe s'arrête,
  // pas à chaque touche. L'index unique reste l'arbitre au moment de créer.
  useEffect(() => {
    setDispo(null);
    if (mode !== "signup" || verifierPseudo(pseudo)) return;
    const t = setTimeout(async () => setDispo(await pseudoDisponible(pseudo)), 450);
    return () => clearTimeout(t);
  }, [pseudo, mode]);

  const submit = async () => {
    if (busy) return;

    if (mode === "oubli") {
      setBusy(true);
      setNotice(null);
      const res = await envoyerLienReinitialisation(email);
      setBusy(false);
      if (res.message) setNotice({ text: res.message, ok: res.ok });
      return;
    }

    if (!email.trim() || !password) {
      setNotice({ text: "Renseigne ton e-mail et ton mot de passe.", ok: false });
      return;
    }

    if (mode === "signup") {
      const refus = verifierPseudo(pseudo);
      if (refus) { setNotice({ text: refus, ok: false }); return; }
      setBusy(true);
      // Dernière vérification juste avant la création : le pseudo a pu être
      // pris entre la frappe et l'envoi.
      if (await pseudoDisponible(pseudo) === "pris") {
        setBusy(false);
        setDispo("pris");
        setNotice({ text: "Ce pseudo est déjà pris. Choisis-en un autre.", ok: false });
        return;
      }
    } else {
      setBusy(true);
    }

    setNotice(null);
    const result = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, pseudo);
    setBusy(false);
    if (result.message) setNotice({ text: result.message, ok: result.ok });
    // Compte créé mais e-mail à confirmer : on ramène sur la connexion,
    // prête à l'emploi, plutôt que de laisser le formulaire d'inscription.
    if (result.ok && result.message && mode === "signup") {
      setMode("signin");
      setPassword("");
    }
  };

  const allerVers = (m: "signin" | "signup" | "oubli") => {
    setMode(m);
    setNotice(null);
    setDispo(null);
  };

  const changerMode = () => allerVers(mode === "signin" ? "signup" : "signin");

  /** Message sous le champ pseudo : format fautif, ou disponibilité. */
  const aidePseudo = (): { texte: string; style: object } => {
    if (pseudoFautif) return { texte: pseudoFautif, style: styles.msgError };
    if (dispo === "pris") return { texte: "Ce pseudo est déjà pris.", style: styles.msgError };
    if (dispo === "libre") return { texte: "Ce pseudo est disponible.", style: styles.msgOk };
    return { texte: "3 à 20 caractères. C'est le nom que tes amis verront.", style: styles.aideNeutre };
  };

  if (!isSupabaseConfigured) {
    return (
      <View style={[styles.root, { justifyContent: "center", paddingHorizontal: 28 }]}>
        <Text style={styles.brand}>LOOKSMAX OS</Text>
        <Text style={styles.title}>Presque prêt</Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Il manque les clés Supabase</Text>
          <Text style={styles.noticeText}>
            Crée un fichier <Text style={styles.code}>.env</Text> à la racine du projet avec :
          </Text>
          <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL=…{"\n"}EXPO_PUBLIC_SUPABASE_ANON_KEY=…</Text>
          <Text style={styles.noticeText}>
            Tu les trouves dans ton projet Supabase, section Settings → API.
            Redémarre ensuite le serveur de développement.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>LOOKSMAX OS</Text>
        <Text style={styles.title}>
          {mode === "signin" ? "Connexion" : mode === "signup" ? "Créer un compte" : "Mot de passe oublié"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "signin"
            ? "Retrouve ta progression sur tous tes appareils"
            : mode === "signup"
              ? "Ta progression sera sauvegardée en ligne"
              : "Indique ton adresse : tu recevras un lien pour en choisir un nouveau."}
        </Text>

        {notice && (
          <Text style={[styles.msg, notice.ok ? styles.msgOk : styles.msgError]}>
            {notice.text}
          </Text>
        )}

        {mode === "signup" && (
          <>
            <Text style={styles.label}>PSEUDO</Text>
            <TextInput
              style={styles.input}
              placeholder="ton pseudo"
              placeholderTextColor={colors.textFaint}
              value={pseudo}
              onChangeText={t => setPseudo(t.slice(0, PSEUDO_MAX))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={PSEUDO_MAX}
            />
            <Text style={[styles.aide, aidePseudo().style]}>{aidePseudo().texte}</Text>
          </>
        )}

        <Text style={styles.label}>E-MAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="toi@exemple.com"
          placeholderTextColor={colors.textFaint}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        {mode !== "oubli" && (
          <>
        <Text style={styles.label}>MOT DE PASSE</Text>
        <TextInput
          style={styles.input}
          placeholder="6 caractères minimum"
          placeholderTextColor={colors.textFaint}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType={mode === "signin" ? "password" : "newPassword"}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
          </>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy}>
          {busy
            ? <ActivityIndicator color={colors.onAmber} />
            : (
              <Text style={styles.submitText}>
                {mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
              </Text>
            )}
        </TouchableOpacity>

        {mode === "signin" && (
          <TouchableOpacity style={styles.oubliBtn} onPress={() => allerVers("oubli")}>
            <Text style={styles.oubliTxt}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.switchBtn} onPress={changerMode}>
          <Text style={styles.switchText}>
            {mode === "signin" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <Text style={styles.switchStrong}>
              {mode === "signin" ? "En créer un" : "Se connecter"}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
