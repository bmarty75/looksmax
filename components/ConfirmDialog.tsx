import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ visible, title, message, onCancel, onConfirm }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSub }]}>{message}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { borderColor: colors.border2 }]} onPress={onCancel}>
              <Text style={[styles.btnText, { color: colors.textSub }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.deleteBtn]} onPress={onConfirm}>
              <Text style={[styles.btnText, { color: "#fff" }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: "#000a", alignItems: "center", justifyContent: "center", padding: 24 },
  card:      { width: "100%", maxWidth: 320, borderWidth: 1, borderRadius: 16, padding: 20 },
  title:     { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  message:   { fontSize: 13, lineHeight: 19, marginBottom: 18 },
  row:       { flexDirection: "row", gap: 10 },
  btn:       { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  deleteBtn: { backgroundColor: "#E07B5A", borderColor: "#E07B5A" },
  btnText:   { fontSize: 13, fontWeight: "700" },
});
