import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ScreenHeader } from "../../components/ScreenHeader";
import { BigButton, Card, Pill, SectionTitle } from "../../components/ui";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { storage } from "../../hooks/useStorage";
import { rangCourant } from "../../lib/metrics";
import { Photo, PhotoPick, choisirPhoto, ecartEnJours, grouperParMois, prendrePhoto } from "../../lib/photos";
import { loadProfile } from "../../lib/profile";

const { width } = Dimensions.get("window");

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: c.bg },
    content:     { paddingHorizontal: 16, paddingBottom: 30 },

    actions:     { flexDirection: "row", gap: 10, marginBottom: 18 },
    action:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.card, borderRadius: 16, paddingVertical: 15 },
    actionTxt:   { fontSize: 13, fontWeight: "700" },

    resumeRow:   { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
    resumeItem:  { alignItems: "center" },
    resumeVal:   { fontSize: 22, fontWeight: "800", color: c.text },
    resumeNom:   { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, color: c.textMuted, marginTop: 4 },
    resumeSep:   { width: 1, height: 30, backgroundColor: c.border },

    grille:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    vignette:    { borderRadius: 16, overflow: "hidden", backgroundColor: c.surface },
    image:       { width: "100%", height: "100%" },
    voile:       { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, paddingTop: 26, backgroundColor: "rgba(0,0,0,0.55)" },
    voileTxt:    { color: "#EDEDED", fontSize: 11, fontWeight: "700" },

    vide:        { alignItems: "center", paddingVertical: 40 },
    videTxt:     { color: c.textMuted, fontSize: 13.5, textAlign: "center", lineHeight: 21, marginTop: 14 },

    visionneuse: { flex: 1, backgroundColor: "#000E", alignItems: "center", justifyContent: "center", padding: 20 },
    fermer:      { position: "absolute", top: 56, right: 20, flexDirection: "row", alignItems: "center", gap: 6 },
    grandeImg:   { width: "100%", height: 420, borderRadius: 20 },
    dateGrande:  { color: "#8A8A92", fontSize: 12, letterSpacing: 1, marginTop: 14, fontWeight: "700" },
    supprimer:   { marginTop: 22, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EFA08D1F", borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13 },
    supprimerTxt:{ color: "#EFA08D", fontSize: 13.5, fontWeight: "800" },
    erreur:      { fontSize: 12, color: c.coral, textAlign: "center", marginBottom: 14, fontWeight: "600" },
  });
}

export default function Progression() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [photos, setPhotos]     = useState<Photo[]>([]);
  const [history, setHistory]   = useState<Record<string, number>>({});
  const [avatar, setAvatar]     = useState<string | null>(null);
  const [choisie, setChoisie]   = useState<Photo | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur]     = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      storage.get("lm_photos", []).then(p => setPhotos(Array.isArray(p) ? p : []));
      storage.get("lm_history", {}).then(h => setHistory(h && typeof h === "object" ? h : {}));
      loadProfile().then(p => setAvatar(p.avatar));
    }, []),
  );

  const enregistrer = async (liste: Photo[]) => {
    setPhotos(liste);
    await storage.set("lm_photos", liste);
  };

  const ajouter = async (pick: PhotoPick) => {
    if (!pick.ok) {
      if (pick.message) setErreur(pick.message);
      return;
    }
    setErreur(null);
    await enregistrer([pick.photo, ...photos]);
    const s = await storage.get("lm_stats", { photos: 0 });
    await storage.set("lm_stats", { ...s, photos: (s.photos || 0) + 1 });
  };

  const supprimer = async (id: number) => {
    await enregistrer(photos.filter(p => p.id !== id));
    setConfirme(false);
    setChoisie(null);
  };

  const taille      = (width - 42) / 2;
  const joursActifs = Object.values(history).filter(v => v > 0).length;
  const suivi       = photos.length >= 2 ? ecartEnJours(photos[photos.length - 1], photos[0]) : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader section="Progression" avatar={avatar} rang={rangCourant(history)} />

      {/* Résumé du suivi */}
      <Card style={{ marginBottom: 18 }}>
        <View style={styles.resumeRow}>
          <View style={styles.resumeItem}>
            <Text style={[styles.resumeVal, { color: colors.amber }]}>{photos.length}</Text>
            <Text style={styles.resumeNom}>PHOTOS</Text>
          </View>
          <View style={styles.resumeSep} />
          <View style={styles.resumeItem}>
            <Text style={[styles.resumeVal, { color: colors.green }]}>{suivi ?? 0}</Text>
            <Text style={styles.resumeNom}>JOURS DE SUIVI</Text>
          </View>
          <View style={styles.resumeSep} />
          <View style={styles.resumeItem}>
            <Text style={[styles.resumeVal, { color: colors.coral }]}>{joursActifs}</Text>
            <Text style={styles.resumeNom}>JOURS ACTIFS</Text>
          </View>
        </View>
      </Card>

      {erreur && <Text style={styles.erreur}>{erreur}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={async () => ajouter(await prendrePhoto())}>
          <MaterialIcons name="photo-camera" size={18} color={colors.amber} />
          <Text style={[styles.actionTxt, { color: colors.amber }]}>Caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={async () => ajouter(await choisirPhoto())}>
          <MaterialIcons name="photo-library" size={18} color={colors.green} />
          <Text style={[styles.actionTxt, { color: colors.green }]}>Galerie</Text>
        </TouchableOpacity>
      </View>

      {photos.length >= 2 && (
        <View style={{ marginBottom: 20 }}>
          <BigButton
            label="COMPARER AVANT / APRÈS"
            onPress={() => router.push("/compare")}
            icone={<MaterialIcons name="compare" size={18} color="#101014" />}
          />
        </View>
      )}

      {photos.length === 0 ? (
        <Card style={styles.vide}>
          <MaterialIcons name="add-a-photo" size={40} color={colors.textFaint} />
          <Text style={styles.videTxt}>
            Ajoute ta première photo{"\n"}pour suivre ton évolution.
          </Text>
        </Card>
      ) : (
        grouperParMois(photos).map(groupe => (
          <View key={groupe.titre} style={{ marginBottom: 22 }}>
            <SectionTitle right={<Pill teinte={colors.card}>{groupe.photos.length}</Pill>}>
              {groupe.titre}
            </SectionTitle>
            <View style={styles.grille}>
              {groupe.photos.map(ph => (
                <TouchableOpacity
                  key={ph.id}
                  style={[styles.vignette, { width: taille, height: taille * 1.3 }]}
                  onPress={() => setChoisie(ph)}
                >
                  <Image source={{ uri: ph.uri }} style={styles.image} />
                  <View style={styles.voile}>
                    <Text style={styles.voileTxt}>{ph.date}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}

      <Modal visible={!!choisie} transparent animationType="fade">
        <View style={styles.visionneuse}>
          <TouchableOpacity style={styles.fermer} onPress={() => setChoisie(null)}>
            <MaterialIcons name="close" size={18} color="#8A8A92" />
            <Text style={{ color: "#8A8A92", fontSize: 14, fontWeight: "700" }}>Fermer</Text>
          </TouchableOpacity>
          {choisie && (
            <>
              <Image source={{ uri: choisie.uri }} style={styles.grandeImg} resizeMode="contain" />
              <Text style={styles.dateGrande}>{choisie.date}</Text>
              <TouchableOpacity style={styles.supprimer} onPress={() => setConfirme(true)}>
                <MaterialIcons name="delete-outline" size={17} color="#EFA08D" />
                <Text style={styles.supprimerTxt}>Supprimer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirme}
        title="Supprimer cette photo ?"
        message="Cette photo sera définitivement supprimée de ta progression."
        onCancel={() => setConfirme(false)}
        onConfirm={() => choisie && supprimer(choisie.id)}
      />
    </ScrollView>
  );
}
