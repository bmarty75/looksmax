import { useMemo, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { ThemeColors, useTheme } from "../contexts/ThemeContext";
import { isSupabaseConfigured } from "../lib/supabase";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: c.bg },
    content:     { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 },
    brand:       { fontSize: 10, letterSpacing: 4, color: "#C9A96E", fontWeight: "700", textAlign: "center" },
    title:       { fontSize: 28, fontWeight: "800", color: c.text, textAlign: "center", marginTop: 6, marginBottom: 4 },
    subtitle:    { fontSize: 13, color: c.textMuted, textAlign: "center", marginBottom: 32 },
    label:       { fontSize: 10, letterSpacing: 2, color: c.textFaint, fontWeight: "700", marginBottom: 6 },
    input:       { backgroundColor: c.input, borderWidth: 1, borderColor: c.border2, borderRadius: 10, color: c.text, padding: 14, fontSize: 15, marginBottom: 16 },
    submitBtn:   { backgroundColor: "#C9A96E", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4 },
    submitText:  { color: "#000", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
    switchBtn:   { marginTop: 22, alignItems: "center", padding: 8 },
    switchText:  { fontSize: 13, color: c.textSub },
    switchStrong:{ color: "#C9A96E", fontWeight: "700" },
    msg:         { fontSize: 12, textAlign: "center", marginBottom: 14, lineHeight: 18, fontWeight: "600" },
    msgError:    { color: "#E07B5A" },
    msgOk:       { color: "#7ECC8A" },
    notice:      { backgroundColor: c.card, borderWidth: 1, borderColor: "#E0C55A44", borderLeftWidth: 3, borderLeftColor: "#E0C55A", borderRadius: 12, padding: 16, gap: 8 },
    noticeTitle: { fontSize: 13, fontWeight: "800", color: c.text },
    noticeText:  { fontSize: 12, color: c.textSub, lineHeight: 19 },
    code:        { fontSize: 11, color: "#C9A96E", fontWeight: "700" },
  });
}

export default function Login() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signIn, signUp } = useAuth();

  const [mode, setMode]         = useState<"signin" | "signup">("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice]     = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy]         = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setNotice({ text: "Renseigne ton e-mail et ton mot de passe.", ok: false });
      return;
    }
    setBusy(true);
    setNotice(null);
    const result = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password);
    setBusy(false);
    if (result.message) setNotice({ text: result.message, ok: result.ok });
    // Compte créé mais e-mail à confirmer : on ramène sur la connexion,
    // prête à l'emploi, plutôt que de laisser le formulaire d'inscription.
    if (result.ok && result.message && mode === "signup") {
      setMode("signin");
      setPassword("");
    }
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
        <Text style={styles.title}>{mode === "signin" ? "Connexion" : "Créer un compte"}</Text>
        <Text style={styles.subtitle}>
          {mode === "signin"
            ? "Retrouve ta progression sur tous tes appareils"
            : "Ta progression sera sauvegardée en ligne"}
        </Text>

        {notice && (
          <Text style={[styles.msg, notice.ok ? styles.msgOk : styles.msgError]}>
            {notice.text}
          </Text>
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

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy}>
          {busy
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.submitText}>{mode === "signin" ? "Se connecter" : "Créer mon compte"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setNotice(null); }}
        >
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
