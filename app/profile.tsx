import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../contexts/AuthContext";
import { ThemeColors, useTheme } from "../contexts/ThemeContext";
import {
  BIO_MAX, EMPTY_PROFILE, PSEUDO_MAX, Profile,
  initiales, loadProfile, pickAvatar, saveProfile,
} from "../lib/profile";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:          { flex: 1, backgroundColor: c.bg },
    content:       { paddingHorizontal: 20, paddingBottom: 40 },
    header:        { paddingTop: 60, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 22 },
    backBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.border2, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    headerSub:     { fontSize: 10, letterSpacing: 4, color: "#C9A96E", fontWeight: "700", marginBottom: 4 },
    headerTitle:   { fontSize: 24, fontWeight: "800", color: c.text },

    avatarWrap:    { alignItems: "center", marginBottom: 26 },
    avatar:        { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: "#C9A96E", backgroundColor: c.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg:     { width: "100%", height: "100%" },
    avatarInit:    { fontSize: 34, fontWeight: "800", color: "#C9A96E" },
    avatarEdit:    { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: "#C9A96E", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.bg },
    avatarHint:    { fontSize: 11, color: c.textMuted, marginTop: 10 },
    avatarRemove:  { fontSize: 11, color: "#E07B5A", fontWeight: "700", marginTop: 8, padding: 4 },

    section:       { marginBottom: 26 },
    sectionTitle:  { fontSize: 10, letterSpacing: 3, color: c.textFaint, fontWeight: "700", marginBottom: 12 },
    label:         { fontSize: 10, letterSpacing: 2, color: c.textFaint, fontWeight: "700", marginBottom: 6 },
    labelRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
    counter:       { fontSize: 10, color: c.textFaint, fontWeight: "700" },
    input:         { backgroundColor: c.input, borderWidth: 1, borderColor: c.border2, borderRadius: 10, color: c.text, padding: 13, fontSize: 15, marginBottom: 16 },
    bioInput:      { minHeight: 92, textAlignVertical: "top" },
    readonly:      { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 13, marginBottom: 16 },
    readonlyText:  { fontSize: 15, color: c.textMuted },

    primaryBtn:    { backgroundColor: "#C9A96E", borderRadius: 12, padding: 15, alignItems: "center" },
    primaryText:   { color: "#000", fontSize: 14, fontWeight: "800" },
    primaryOff:    { opacity: 0.4 },
    secondaryBtn:  { borderWidth: 1, borderColor: c.border2, borderRadius: 12, padding: 15, alignItems: "center" },
    secondaryText: { color: c.textSub, fontSize: 13, fontWeight: "700" },
    dangerBtn:     { borderWidth: 1, borderColor: "#E07B5A55", backgroundColor: "#E07B5A18", borderRadius: 12, padding: 15, alignItems: "center" },
    dangerText:    { color: "#E07B5A", fontSize: 13, fontWeight: "800" },

    msg:           { fontSize: 12, textAlign: "center", marginBottom: 14, lineHeight: 18, fontWeight: "600" },
    msgOk:         { color: "#7ECC8A" },
    msgError:      { color: "#E07B5A" },
    separator:     { height: 1, backgroundColor: c.border, marginBottom: 24 },
  });
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { email, signOut, changePassword } = useAuth();

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [initial, setInitial] = useState<Profile>(EMPTY_PROFILE);
  const [chargement, setChargement] = useState(true);
  const [avatarOccupe, setAvatarOccupe] = useState(false);
  const [profilMsg, setProfilMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mdpOccupe, setMdpOccupe] = useState(false);
  const [mdpMsg, setMdpMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [deconnexionOuverte, setDeconnexionOuverte] = useState(false);

  useEffect(() => {
    loadProfile().then(p => {
      setProfile(p);
      setInitial(p);
      setChargement(false);
    });
  }, []);

  const modifie =
    profile.pseudo !== initial.pseudo ||
    profile.bio !== initial.bio ||
    profile.avatar !== initial.avatar;

  const changerAvatar = async () => {
    setAvatarOccupe(true);
    setProfilMsg(null);
    const res = await pickAvatar();
    setAvatarOccupe(false);
    if (res.ok) setProfile(p => ({ ...p, avatar: res.avatar }));
    else if (res.message) setProfilMsg({ text: res.message, ok: false });
  };

  const enregistrerProfil = async () => {
    const nettoye: Profile = {
      pseudo: profile.pseudo.trim().slice(0, PSEUDO_MAX),
      bio: profile.bio.trim().slice(0, BIO_MAX),
      avatar: profile.avatar,
    };
    await saveProfile(nettoye);
    setProfile(nettoye);
    setInitial(nettoye);
    setProfilMsg({ text: "Profil enregistré.", ok: true });
  };

  const validerMotDePasse = async () => {
    if (mdpOccupe) return;
    if (!actuel || !nouveau || !confirmation) {
      setMdpMsg({ text: "Remplis les trois champs.", ok: false });
      return;
    }
    if (nouveau.length < 6) {
      setMdpMsg({ text: "Le nouveau mot de passe doit faire au moins 6 caractères.", ok: false });
      return;
    }
    if (nouveau !== confirmation) {
      setMdpMsg({ text: "Les deux nouveaux mots de passe ne correspondent pas.", ok: false });
      return;
    }
    setMdpOccupe(true);
    setMdpMsg(null);
    const res = await changePassword(actuel, nouveau);
    setMdpOccupe(false);
    if (res.message) setMdpMsg({ text: res.message, ok: res.ok });
    if (res.ok) {
      setActuel("");
      setNouveau("");
      setConfirmation("");
    }
  };

  if (chargement) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#C9A96E", fontSize: 32 }}>◈</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={19} color={colors.textSub} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSub}>LOOKSMAX OS</Text>
            <Text style={styles.headerTitle}>Mon profil</Text>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={changerAvatar} disabled={avatarOccupe} activeOpacity={0.8}>
            <View style={styles.avatar}>
              {avatarOccupe ? (
                <ActivityIndicator color="#C9A96E" />
              ) : profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInit}>{initiales(profile.pseudo, email)}</Text>
              )}
            </View>
            <View style={styles.avatarEdit}>
              <MaterialIcons name="photo-camera" size={16} color="#000" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Touche la photo pour la changer</Text>
          {profile.avatar && (
            <TouchableOpacity onPress={() => setProfile(p => ({ ...p, avatar: null }))}>
              <Text style={styles.avatarRemove}>Retirer la photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {profilMsg && (
          <Text style={[styles.msg, profilMsg.ok ? styles.msgOk : styles.msgError]}>{profilMsg.text}</Text>
        )}

        {/* Identité */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>PSEUDO</Text>
            <Text style={styles.counter}>{profile.pseudo.length}/{PSEUDO_MAX}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ton pseudo"
            placeholderTextColor={colors.textFaint}
            value={profile.pseudo}
            maxLength={PSEUDO_MAX}
            onChangeText={t => setProfile(p => ({ ...p, pseudo: t }))}
            autoCapitalize="none"
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>BIO</Text>
            <Text style={styles.counter}>{profile.bio.length}/{BIO_MAX}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Quelques mots sur toi, tes objectifs…"
            placeholderTextColor={colors.textFaint}
            value={profile.bio}
            maxLength={BIO_MAX}
            onChangeText={t => setProfile(p => ({ ...p, bio: t }))}
            multiline
          />

          <Text style={styles.label}>E-MAIL</Text>
          <View style={styles.readonly}>
            <Text style={styles.readonlyText}>{email ?? "—"}</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !modifie && styles.primaryOff]}
            onPress={enregistrerProfil}
            disabled={!modifie}
          >
            <Text style={styles.primaryText}>
              {modifie ? "Enregistrer les modifications" : "Aucune modification"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {/* Mot de passe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHANGER LE MOT DE PASSE</Text>

          {mdpMsg && (
            <Text style={[styles.msg, mdpMsg.ok ? styles.msgOk : styles.msgError]}>{mdpMsg.text}</Text>
          )}

          <Text style={styles.label}>MOT DE PASSE ACTUEL</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            value={actuel}
            onChangeText={setActuel}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>NOUVEAU MOT DE PASSE</Text>
          <TextInput
            style={styles.input}
            placeholder="6 caractères minimum"
            placeholderTextColor={colors.textFaint}
            value={nouveau}
            onChangeText={setNouveau}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>CONFIRMER LE NOUVEAU</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={validerMotDePasse}
            returnKeyType="go"
          />

          <TouchableOpacity style={styles.secondaryBtn} onPress={validerMotDePasse} disabled={mdpOccupe}>
            {mdpOccupe
              ? <ActivityIndicator color={colors.textSub} />
              : <Text style={styles.secondaryText}>Mettre à jour le mot de passe</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.dangerBtn} onPress={() => setDeconnexionOuverte(true)}>
          <Text style={styles.dangerText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={deconnexionOuverte}
        title="Se déconnecter ?"
        message="Tes données restent sauvegardées en ligne et te seront rendues à la prochaine connexion."
        confirmLabel="Se déconnecter"
        onCancel={() => setDeconnexionOuverte(false)}
        onConfirm={async () => { setDeconnexionOuverte(false); await signOut(); }}
      />
    </KeyboardAvoidingView>
  );
}
