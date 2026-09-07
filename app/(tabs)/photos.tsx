import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useEffect, useState } from "react";
import {
  Dimensions, Image, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { storage } from "../../hooks/useStorage";
import { Photo, PhotoPick, choisirPhoto, grouperParMois, prendrePhoto } from "../../lib/photos";

const { width } = Dimensions.get("window");

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:          { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
    header:        { paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 16, flexDirection: "row", alignItems: "flex-end" },
    headerSub:     { fontSize: 10, letterSpacing: 4, color: "#C9A96E", fontWeight: "700", marginBottom: 4 },
    headerTitle:   { fontSize: 24, fontWeight: "800", color: c.text },
    actionRow:     { flexDirection: "row", gap: 10, marginBottom: 20 },
    actionBtn:     { backgroundColor: "#C9A96E11", borderWidth: 1, borderColor: "#C9A96E44", borderRadius: 12, padding: 14, alignItems: "center" },
    actionBtnText: { color: "#C9A96E", fontSize: 14, fontWeight: "700" },
    emptyState:    { alignItems: "center", paddingTop: 60, paddingBottom: 40 },
    emptyText:     { color: c.textFaint, fontSize: 14, textAlign: "center", lineHeight: 24 },
    sectionLabel:  { fontSize: 10, letterSpacing: 3, color: c.textFaint, fontWeight: "700", marginBottom: 12 },
    compareBtn:    { backgroundColor: "#C9A96E", borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 22 },
    compareText:   { color: "#000", fontSize: 14, fontWeight: "800" },
    erreur:        { fontSize: 12, color: "#E07B5A", textAlign: "center", marginBottom: 14, fontWeight: "600" },
    photoGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    photoItem:     { borderRadius: 14, overflow: "hidden", backgroundColor: c.surface },
    photoThumb:    { width: "100%", height: "100%" },
    photoOverlay:  { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, paddingTop: 24, backgroundColor: "rgba(0,0,0,0.5)" },
    photoDate:     { color: "#CCC", fontSize: 11, fontWeight: "700" },
    // Lightbox reste toujours sombre quel que soit le thème
    lightbox:      { flex: 1, backgroundColor: "#000e", alignItems: "center", justifyContent: "center", padding: 20 },
    lightboxClose: { position: "absolute", top: 60, right: 20 },
    lightboxImg:   { width: "100%", height: 400, borderRadius: 16 },
    lightboxDate:  { color: "#555", fontSize: 12, letterSpacing: 1, marginTop: 12, fontWeight: "700" },
    deleteBtn:     { marginTop: 20, backgroundColor: "#E07B5A22", borderWidth: 1, borderColor: "#E07B5A44", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 },
    deleteBtnText: { color: "#E07B5A", fontSize: 14, fontWeight: "700" },
  });
}

export default function Photos() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const router = useRouter();
  const [photos, setPhotos]     = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [erreur, setErreur]     = useState<string | null>(null);

  useEffect(() => {
    storage.get("lm_photos", []).then(p => setPhotos(Array.isArray(p) ? p : []));
  }, []);

  const savePhotos = async (p: Photo[]) => {
    setPhotos(p);
    await storage.set("lm_photos", p);
  };

  /** Ajoute la photo réduite renvoyée par le module, et met à jour le compteur. */
  const ajouter = async (pick: PhotoPick) => {
    if (!pick.ok) {
      if (pick.message) setErreur(pick.message);
      return;
    }
    setErreur(null);
    await savePhotos([pick.photo, ...photos]);
    const s = await storage.get("lm_stats", { photos: 0 });
    await storage.set("lm_stats", { ...s, photos: (s.photos || 0) + 1 });
  };

  const pickImage = async () => ajouter(await choisirPhoto());
  const takePhoto = async () => ajouter(await prendrePhoto());

  const deletePhoto = async (id: number) => {
    await savePhotos(photos.filter(p => p.id !== id));
    setConfirmingDelete(false);
    setSelected(null);
  };

  const imgSize = (width - 48) / 2;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>LOOKSMAX OS</Text>
          <Text style={styles.headerTitle}>Progression</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={takePhoto}>
          <Text style={styles.actionBtnText}>📸 Caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { flex: 1, borderColor: "#7B9EE044" }]} onPress={pickImage}>
          <Text style={[styles.actionBtnText, { color: "#7B9EE0" }]}>🖼️ Galerie</Text>
        </TouchableOpacity>
      </View>

      {erreur && <Text style={styles.erreur}>{erreur}</Text>}

      {photos.length >= 2 && (
        <TouchableOpacity style={styles.compareBtn} onPress={() => router.push("/compare")}>
          <MaterialIcons name="compare" size={17} color="#000" />
          <Text style={styles.compareText}>Comparer avant / après</Text>
        </TouchableOpacity>
      )}

      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>📸</Text>
          <Text style={styles.emptyText}>Ajoute ta première photo{"\n"}pour tracker ton glow up !</Text>
        </View>
      ) : (
        grouperParMois(photos).map(groupe => (
          <View key={groupe.titre} style={{ marginBottom: 22 }}>
            <Text style={styles.sectionLabel}>{groupe.titre} ({groupe.photos.length})</Text>
            <View style={styles.photoGrid}>
              {groupe.photos.map(ph => (
                <TouchableOpacity
                  key={ph.id}
                  style={[styles.photoItem, { width: imgSize, height: imgSize * 1.3 }]}
                  onPress={() => setSelected(ph)}
                >
                  <Image source={{ uri: ph.uri }} style={styles.photoThumb} />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoDate}>{ph.date}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setSelected(null)}>
            <Text style={{ color: "#888", fontSize: 16 }}>✕ Fermer</Text>
          </TouchableOpacity>
          {selected && (
            <>
              <Image source={{ uri: selected.uri }} style={styles.lightboxImg} resizeMode="contain" />
              <Text style={styles.lightboxDate}>{selected.date}</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfirmingDelete(true)}>
                <MaterialIcons name="delete-outline" size={16} color="#E07B5A" />
                <Text style={styles.deleteBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Supprimer cette photo ?"
        message="Cette photo sera définitivement supprimée de ta progression."
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => selected && deletePhoto(selected.id)}
      />
    </ScrollView>
  );
}
