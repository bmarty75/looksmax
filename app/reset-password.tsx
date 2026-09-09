import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { ThemeColors, useTheme } from "../contexts/ThemeContext";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:       { flex: 1, backgroundColor: c.bg },
    content:    { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 },
    brand:      { fontSize: 10, letterSpacing: 4, color: c.amber, fontWeight: "700", textAlign: "center" },
    title:      { fontSize: 28, fontWeight: "800", color: c.text, textAlign: "center", marginTop: 6, marginBottom: 4 },
    subtitle:   { fontSize: 13, color: c.textMuted, textAlign: "center", marginBottom: 32, lineHeight: 19 },
    label:      { fontSize: 10, letterSpacing: 2, color: c.textFaint, fontWeight: "700", marginBottom: 6 },
    input:      { backgroundColor: c.input, borderWidth: 1, borderColor: c.border2, borderRadius: 10, color: c.text, padding: 14, fontSize: 15, marginBottom: 16 },
    submitBtn:  { backgroundColor: c.amber, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4 },
    submitText: { color: c.onAmber, fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
    lien:       { marginTop: 22, alignItems: "center", padding: 8 },
    lienTxt:    { fontSize: 13, color: c.amber, fontWeight: "700" },
    msg:        { fontSize: 12, textAlign: "center", marginBottom: 14, lineHeight: 18, fontWeight: "600" },
    msgError:   { color: c.coral },
    msgOk:      { color: c.green },
  });
}

export default function NouveauMotDePasse() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { definirMotDePasse, signOut, recuperation } = useAuth();

  const [nouveau, setNouveau]           = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice]             = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy]                 = useState(false);

  const valider = async () => {
    if (busy) return;
    if (nouveau.length < 6) {
      setNotice({ text: "Le mot de passe doit faire au moins 6 caractères.", ok: false });
      return;
    }
    if (nouveau !== confirmation) {
      setNotice({ text: "Les deux mots de passe ne correspondent pas.", ok: false });
      return;
    }
    setBusy(true);
    setNotice(null);
    const res = await definirMotDePasse(nouveau);
    setBusy(false);
    if (res.message) setNotice({ text: res.message, ok: res.ok });
    if (res.ok) router.replace("/");
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>LOOKSMAX OS</Text>
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>
          {recuperation
            ? "Choisis un mot de passe. Il remplacera l'ancien immédiatement."
            : "Ce lien n'est plus actif. Redemande-en un depuis l'écran de connexion."}
        </Text>

        {notice && (
          <Text style={[styles.msg, notice.ok ? styles.msgOk : styles.msgError]}>{notice.text}</Text>
        )}

        {recuperation && (
          <>
            <Text style={styles.label}>NOUVEAU MOT DE PASSE</Text>
            <TextInput
              style={styles.input}
              placeholder="6 caractères minimum"
              placeholderTextColor={colors.textFaint}
              value={nouveau}
              onChangeText={setNouveau}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
            />

            <Text style={styles.label}>CONFIRMATION</Text>
            <TextInput
              style={styles.input}
              placeholder="le même, pour être sûr"
              placeholderTextColor={colors.textFaint}
              value={confirmation}
              onChangeText={setConfirmation}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              onSubmitEditing={valider}
              returnKeyType="go"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={valider} disabled={busy}>
              {busy
                ? <ActivityIndicator color={colors.onAmber} />
                : <Text style={styles.submitText}>ENREGISTRER</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.lien}
          onPress={async () => { await signOut(); router.replace("/login"); }}
        >
          <Text style={styles.lienTxt}>Retour à la connexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
