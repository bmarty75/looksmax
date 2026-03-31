import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
    Alert, Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { storage } from "../../hooks/useStorage";

const { width } = Dimensions.get("window");

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    storage.get("lm_photos", []).then(setPhotos);
  }, []);

  const savePhotos = async (p: any[]) => {
    setPhotos(p);
    await storage.set("lm_photos", p);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Active l'accès à ta galerie dans les réglages.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString("fr-FR"),
        uri: result.assets[0].uri,
      };
      const updated = [entry, ...photos];
      await savePhotos(updated);
      const s = await storage.get("lm_stats", { photos: 0 });
      await storage.set("lm_stats", { ...s, photos: (s.photos || 0) + 1 });
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Active l'accès à la caméra dans les réglages.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString("fr-FR"),
        uri: result.assets[0].uri,
      };
      const updated = [entry, ...photos];
      await savePhotos(updated);
      const s = await storage.get("lm_stats", { photos: 0 });
      await storage.set("lm_stats", { ...s, photos: (s.photos || 0) + 1 });
    }
  };

  const deletePhoto = async (id: number) => {
    Alert.alert("Supprimer", "Supprimer cette photo ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        await savePhotos(photos.filter((p) => p.id !== id));
        setSelected(null);
      }},
    ]);
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

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={takePhoto}>
          <Text style={styles.actionBtnText}>📸 Caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { flex: 1, borderColor: "#7B9EE044" }]} onPress={pickImage}>
          <Text style={[styles.actionBtnText, { color: "#7B9EE0" }]}>🖼️ Galerie</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>📸</Text>
          <Text style={styles.emptyText}>
            Ajoute ta première photo{"\n"}pour tracker ton glow up !
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>AVANT / APRÈS ({photos.length} photos)</Text>
          <View style={styles.photoGrid}>
            {photos.map((ph) => (
              <TouchableOpacity key={ph.id} style={[styles.photoItem, { width: imgSize, height: imgSize * 1.3 }]}
                onPress={() => setSelected(ph)}>
                <Image source={{ uri: ph.uri }} style={styles.photoThumb} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoDate}>{ph.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Lightbox */}
      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setSelected(null)}>
            <Text style={{ color: "#888", fontSize: 16 }}>✕ Fermer</Text>
          </TouchableOpacity>
          {selected && (
            <>
              <Image source={{ uri: selected.uri }} style={styles.lightboxImg} resizeMode="contain" />
              <Text style={styles.lightboxDate}>{selected.date}</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(selected.id)}>
                <Text style={styles.deleteBtnText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808", paddingHorizontal: 16 },
  header: { paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#161616", marginBottom: 16, flexDirection: "row", alignItems: "flex-end" },
  headerSub: { fontSize: 10, letterSpacing: 4, color: "#C9A96E", fontWeight: "700", marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#F0EAE0" },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionBtn: { backgroundColor: "#C9A96E11", borderWidth: 1, borderColor: "#C9A96E44", borderRadius: 12, padding: 14, alignItems: "center" },
  actionBtnText: { color: "#C9A96E", fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingBottom: 40 },
  emptyText: { color: "#444", fontSize: 14, textAlign: "center", lineHeight: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: 3, color: "#444", fontWeight: "700", marginBottom: 12 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoItem: { borderRadius: 14, overflow: "hidden", backgroundColor: "#111" },
  photoThumb: { width: "100%", height: "100%" },
  photoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, paddingTop: 24, backgroundColor: "rgba(0,0,0,0.5)" },
  photoDate: { color: "#CCC", fontSize: 11, fontWeight: "700" },
  lightbox: { flex: 1, backgroundColor: "#000e", alignItems: "center", justifyContent: "center", padding: 20 },
  lightboxClose: { position: "absolute", top: 60, right: 20 },
  lightboxImg: { width: "100%", height: 400, borderRadius: 16 },
  lightboxDate: { color: "#555", fontSize: 12, letterSpacing: 1, marginTop: 12, fontWeight: "700" },
  deleteBtn: { marginTop: 20, backgroundColor: "#E07B5A22", borderWidth: 1, borderColor: "#E07B5A44", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  deleteBtnText: { color: "#E07B5A", fontSize: 14, fontWeight: "700" },
});