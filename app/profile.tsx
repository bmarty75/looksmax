import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { RANKS, libelleRang } from "../constants/data";
import { Partage, chargerPartage, enregistrerPartage, publierProfil } from "../lib/social";
import { useAuth } from "../contexts/AuthContext";
import { ThemeColors, useTheme } from "../contexts/ThemeContext";
import {
  BIO_MAX, EMPTY_PROFILE, PSEUDO_MAX, Profile,
  initiales, loadProfile, pickAvatar, pseudoDisponible, saveProfile, verifierPseudo,
} from "../lib/profile";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:          { flex: 1, backgroundColor: c.bg },
    content:       { paddingHorizontal: 20, paddingBottom: 40 },
    header:        { paddingTop: 60, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 22 },
    backBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.border2, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    headerSub:     { fontSize: 10, letterSpacing: 4, color: c.amber, fontWeight: "700", marginBottom: 4 },
    headerTitle:   { fontSize: 24, fontWeight: "800", color: c.text },

    avatarWrap:    { alignItems: "center", marginBottom: 26 },
    avatar:        { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: c.amber, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg:     { width: "100%", height: "100%" },
    avatarInit:    { fontSize: 34, fontWeight: "800", color: c.amber },
    avatarEdit:    { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: c.amber, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.bg },
    avatarHint:    { fontSize: 11, color: c.textMuted, marginTop: 10 },
    avatarRemove:  { fontSize: 11, color: c.coral, fontWeight: "700", marginTop: 8, padding: 4 },

    section:       { marginBottom: 26 },
    sectionTitle:  { fontSize: 10, letterSpacing: 3, color: c.textFaint, fontWeight: "700", marginBottom: 12 },
    label:         { fontSize: 10, letterSpacing: 2, color: c.textFaint, fontWeight: "700", marginBottom: 6 },
    labelRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
    counter:       { fontSize: 10, color: c.textFaint, fontWeight: "700" },
    input:         { backgroundColor: c.input, borderWidth: 1, borderColor: c.border2, borderRadius: 10, color: c.text, padding: 13, fontSize: 15, marginBottom: 16 },
    bioInput:      { minHeight: 92, textAlignVertical: "top" },
    readonly:      { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 13, marginBottom: 16 },
    readonlyText:  { fontSize: 15, color: c.textMuted },

    primaryBtn:    { backgroundColor: c.amber, borderRadius: 12, padding: 15, alignItems: "center" },
    primaryText:   { color: c.onAmber, fontSize: 14, fontWeight: "800" },
    primaryOff:    { backgroundColor: c.surface },
    secondaryBtn:  { borderWidth: 1, borderColor: c.border2, borderRadius: 12, padding: 15, alignItems: "center" },
    secondaryText: { color: c.textSub, fontSize: 13, fontWeight: "700" },
    dangerBtn:     { borderWidth: 1, borderColor: `${c.coral}55`, backgroundColor: `${c.coral}18`, borderRadius: 12, padding: 15, alignItems: "center" },
    dangerText:    { color: c.coral, fontSize: 13, fontWeight: "800" },

    msg:           { fontSize: 12, textAlign: "center", marginBottom: 14, lineHeight: 18, fontWeight: "600" },
    msgOk:         { color: c.green },
    msgError:      { color: c.coral },
    separator:     { height: 1, backgroundColor: c.border, marginBottom: 24 },
    sexeRow:       { flexDirection: "row", gap: 10, marginBottom: 8 },
    sexeBtn:       { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: c.border2, backgroundColor: c.card },
    sexeBtnOn:     { borderColor: `${c.amber}66`, backgroundColor: `${c.amber}14` },
    sexeTxt:       { fontSize: 14, fontWeight: "700", color: c.textSub },
    sexeNote:      { fontSize: 11, color: c.textMuted, lineHeight: 16, marginBottom: 16 },
    zoneTitre:     { fontSize: 10, letterSpacing: 3, color: c.coral, fontWeight: "700", marginBottom: 10 },
    zoneTexte:     { fontSize: 12, color: c.textMuted, lineHeight: 18, marginBottom: 14 },
    supprimerBtn:  { borderWidth: 1, borderColor: `${c.coral}55`, borderRadius: 12, padding: 15, alignItems: "center", marginTop: 4 },
    supprimerTxt:  { color: c.coral, fontSize: 13, fontWeight: "800" },
    themeRow:      { flexDirection: "row", gap: 10 },
    themeBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.card },
    themeBtnOn:    { borderColor: `${c.amber}66`, backgroundColor: `${c.amber}14` },
    themeTxt:      { fontSize: 13, fontWeight: "700", color: c.textSub },
    partageLigne:  { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    partageNom:    { fontSize: 14, fontWeight: "600", color: c.text },
    partageSous:   { fontSize: 11.5, color: c.textMuted, marginTop: 2, lineHeight: 16 },
    bascule:       { width: 46, height: 27, borderRadius: 14, padding: 3, justifyContent: "center" },
    pastilleBasc:  { width: 21, height: 21, borderRadius: 11, backgroundColor: "#FFFFFF" },
    noteConfid:    { fontSize: 11.5, color: c.textMuted, lineHeight: 17, marginTop: 6 },
  });
}

export default function ProfileScreen() {
  const { colors, mode, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { email, signOut, changePassword, supprimerCompte } = useAuth();

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [initial, setInitial] = useState<Profile>(EMPTY_PROFILE);
  const [chargement, setChargement] = useState(true);
  const [avatarOccupe, setAvatarOccupe] = useState(false);
  const [profilOccupe, setProfilOccupe] = useState(false);
  const [profilMsg, setProfilMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mdpOccupe, setMdpOccupe] = useState(false);
  const [mdpMsg, setMdpMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [deconnexionOuverte, setDeconnexionOuverte] = useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);
  const [mdpSuppression, setMdpSuppression]         = useState("");
  const [suppressionOccupee, setSuppressionOccupee] = useState(false);
  const [suppressionMsg, setSuppressionMsg]         = useState<string | null>(null);
  const [partage, setPartage] = useState<Partage | null>(null);

  useEffect(() => {
    loadProfile().then(p => {
      setProfile(p);
      setInitial(p);
      setChargement(false);
    });
    chargerPartage().then(setPartage);
  }, []);

  /** Bascule une rubrique et republie aussitôt : ce qui n'est plus partagé
   *  doit disparaître du profil public sans attendre. */
  const basculerPartage = async (cle: keyof Partage) => {
    if (!partage) return;
    const suivant = { ...partage, [cle]: !partage[cle] };
    setPartage(suivant);
    await enregistrerPartage(suivant);
    await publierProfil();
  };

  const modifie =
    profile.pseudo !== initial.pseudo ||
    profile.bio !== initial.bio ||
    profile.avatar !== initial.avatar ||
    profile.sexe !== initial.sexe;

  const changerAvatar = async () => {
    setAvatarOccupe(true);
    setProfilMsg(null);
    const res = await pickAvatar();
    setAvatarOccupe(false);
    if (res.ok) setProfile(p => ({ ...p, avatar: res.avatar }));
    else if (res.message) setProfilMsg({ text: res.message, ok: false });
  };

  const enregistrerProfil = async () => {
    if (profilOccupe) return;
    const nettoye: Profile = {
      pseudo: profile.pseudo.trim().slice(0, PSEUDO_MAX),
      bio: profile.bio.trim().slice(0, BIO_MAX),
      avatar: profile.avatar,
      sexe: profile.sexe,
    };

    const refus = verifierPseudo(nettoye.pseudo);
    if (refus) { setProfilMsg({ text: refus, ok: false }); return; }

    setProfilOccupe(true);
    setProfilMsg(null);

    if (nettoye.pseudo.toLowerCase() !== initial.pseudo.toLowerCase()
        && await pseudoDisponible(nettoye.pseudo) === "pris") {
      setProfilOccupe(false);
      setProfilMsg({ text: "Ce pseudo est déjà pris. Choisis-en un autre.", ok: false });
      return;
    }

    await saveProfile(nettoye);
    const publication = await publierProfil();
    setProfilOccupe(false);

    // L'index unique a le dernier mot : quelqu'un a pu prendre le pseudo
    // entre la vérification et l'écriture. On remet alors l'ancien.
    if (publication.pseudoPris) {
      await saveProfile(initial);
      setProfile(initial);
      setProfilMsg({ text: "Ce pseudo vient d'être pris. Choisis-en un autre.", ok: false });
      return;
    }

    setProfile(nettoye);
    setInitial(nettoye);
    setProfilMsg({ text: "Profil enregistré.", ok: true });
  };

  const validerSuppression = async () => {
    if (suppressionOccupee) return;
    setSuppressionOccupee(true);
    setSuppressionMsg(null);
    const res = await supprimerCompte(mdpSuppression);
    setSuppressionOccupee(false);
    if (res.ok) {
      // La navigation ramène d'elle-même sur l'écran de connexion : la
      // session est fermée.
      setSuppressionOuverte(false);
      setMdpSuppression("");
      return;
    }
    setSuppressionMsg(res.message);
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
        <Text style={{ color: colors.amber, fontSize: 32 }}>◈</Text>
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
                <ActivityIndicator color={colors.amber} />
              ) : profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInit}>{initiales(profile.pseudo, email)}</Text>
              )}
            </View>
            <View style={styles.avatarEdit}>
              <MaterialIcons name="photo-camera" size={16} color={colors.onAmber} />
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

          <Text style={styles.label}>SEXE</Text>
          <View style={styles.sexeRow}>
            {(["homme", "femme"] as const).map(v => {
              const actif = profile.sexe === v;
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.sexeBtn, actif && styles.sexeBtnOn]}
                  onPress={() => setProfile(p => ({ ...p, sexe: v }))}
                >
                  <Text style={[styles.sexeTxt, actif && { color: colors.amber }]}>
                    {v === "homme" ? "Homme" : "Femme"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.sexeNote}>
            Change les noms des paliers ({libelleRang(RANKS[6], profile.sexe)},
            {" "}{libelleRang(RANKS[8], profile.sexe)}…). Les seuils, eux, sont les mêmes
            pour tout le monde.
          </Text>

          <Text style={styles.label}>E-MAIL</Text>
          <View style={styles.readonly}>
            <Text style={styles.readonlyText}>{email ?? "—"}</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !modifie && styles.primaryOff]}
            onPress={enregistrerProfil}
            disabled={!modifie || profilOccupe}
          >
            {profilOccupe ? (
              <ActivityIndicator color={colors.onAmber} />
            ) : (
              <Text style={[styles.primaryText, !modifie && { color: colors.textMuted }]}>
                {modifie ? "Enregistrer les modifications" : "Aucune modification"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {/* Apparence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPARENCE</Text>
          <View style={styles.themeRow}>
            {([["dark", "Sombre", "dark-mode"], ["light", "Clair", "light-mode"]] as const).map(
              ([valeur, libelle, icone]) => {
                const actif = mode === valeur;
                return (
                  <TouchableOpacity
                    key={valeur}
                    style={[styles.themeBtn, actif && styles.themeBtnOn]}
                    onPress={() => { if (!actif) toggle(); }}
                  >
                    <MaterialIcons
                      name={icone}
                      size={18}
                      color={actif ? colors.amber : colors.textMuted}
                    />
                    <Text style={[styles.themeTxt, actif && { color: colors.amber }]}>{libelle}</Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        </View>

        <View style={styles.separator} />

        {/* Ce que voient les amis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VISIBLE PAR MES AMIS</Text>
          {partage && ([
            ["stats",  "Score et régularité", "Ton index PSL, ton rang, ton streak."],
            ["habits", "Mes routines",        "La liste de tes routines, sans le détail jour par jour."],
            ["goals",  "Mes objectifs",       "Tes objectifs et leur avancement."],
            ["photos", "Mes photos",          "Uniquement ta première et ta dernière photo."],
          ] as [keyof Partage, string, string][]).map(([cle, titre, detail]) => {
            const actif = partage[cle];
            return (
              <TouchableOpacity
                key={cle}
                style={styles.partageLigne}
                onPress={() => basculerPartage(cle)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.partageNom}>{titre}</Text>
                  <Text style={styles.partageSous}>{detail}</Text>
                </View>
                <View style={[
                  styles.bascule,
                  { backgroundColor: actif ? colors.green : colors.surface, alignItems: actif ? "flex-end" : "flex-start" },
                ]}>
                  <View style={styles.pastilleBasc} />
                </View>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.noteConfid}>
            Seuls tes amis acceptés voient ces informations. Ce que tu désactives
            est retiré de ton profil public immédiatement.
          </Text>
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

        <View style={{ height: 28 }} />
        <View style={styles.separator} />

        {/* Zone de danger : irréversible, donc dépliée à la demande et
            confirmée par le mot de passe. */}
        <Text style={styles.zoneTitre}>ZONE DE DANGER</Text>
        {!suppressionOuverte ? (
          <>
            <Text style={styles.zoneTexte}>
              Supprimer ton compte efface définitivement ton historique, tes
              routines, tes objectifs, tes photos et tes liens d&apos;amitié.
              Rien n&apos;est récupérable ensuite.
            </Text>
            <TouchableOpacity
              style={styles.supprimerBtn}
              onPress={() => { setSuppressionOuverte(true); setSuppressionMsg(null); }}
            >
              <Text style={styles.supprimerTxt}>Supprimer mon compte</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.zoneTexte}>
              Saisis ton mot de passe pour confirmer. Cette action est
              immédiate et sans retour possible.
            </Text>

            {suppressionMsg && (
              <Text style={[styles.msg, styles.msgError]}>{suppressionMsg}</Text>
            )}

            <Text style={styles.label}>MOT DE PASSE</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              value={mdpSuppression}
              onChangeText={setMdpSuppression}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={validerSuppression}
              returnKeyType="go"
            />

            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={validerSuppression}
              disabled={suppressionOccupee}
            >
              {suppressionOccupee
                ? <ActivityIndicator color={colors.coral} />
                : <Text style={styles.dangerText}>Supprimer définitivement</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setSuppressionOuverte(false); setMdpSuppression(""); setSuppressionMsg(null); }}
            >
              <Text style={styles.secondaryText}>Annuler</Text>
            </TouchableOpacity>
          </>
        )}
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
