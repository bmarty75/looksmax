import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useEffect, useRef, useState } from "react";
import {
  FlatList, Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { CATEGORIES, COLORS, DEFAULT_HABITS, ICONS, todayKey } from "../../constants/data";
import { storage } from "../../hooks/useStorage";

const MONTHS_SHORT = ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"];

function shiftDateKey(key: string, delta: number): string {
  const d = new Date(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(key: string): string {
  if (key === todayKey()) return "Aujourd'hui";
  if (key === shiftDateKey(todayKey(), -1)) return "Hier";
  const d = new Date(key);
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:           { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
    header:         { paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 16 },
    headerSub:      { fontSize: 10, letterSpacing: 4, color: "#C9A96E", fontWeight: "700", marginBottom: 4 },
    headerTitle:    { fontSize: 24, fontWeight: "800", color: c.text },
    progressText:   { fontSize: 13, color: c.textSub, marginBottom: 8 },
    progressTrack:  { height: 3, backgroundColor: c.surface, borderRadius: 2, overflow: "hidden" },
    progressFill:   { height: "100%", backgroundColor: "#C9A96E", borderRadius: 2 },
    addHabitBtn:    { backgroundColor: "#C9A96E11", borderWidth: 1, borderColor: "#C9A96E44", borderStyle: "dashed", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16 },
    addHabitBtnText:{ color: "#C9A96E", fontSize: 13, fontWeight: "700", letterSpacing: 1 },
    formCard:       { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, marginBottom: 16, gap: 12 },
    formTitle:      { fontSize: 13, fontWeight: "800", color: c.text, marginBottom: 2 },
    formRow:        { flexDirection: "row", gap: 10, alignItems: "center" },
    formLabel:      { fontSize: 11, color: c.textMuted, fontWeight: "700", letterSpacing: 1, minWidth: 70 },
    iconPick:       { width: 48, height: 48, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border2, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    catChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: c.border2, marginRight: 8 },
    catChipActive:  { borderColor: "#C9A96E44", backgroundColor: "#C9A96E11" },
    catChipText:    { fontSize: 11, color: c.textMuted, fontWeight: "700" },
    colorRow:       { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    colorDot:       { width: 22, height: 22, borderRadius: 11 },
    input:          { backgroundColor: c.input, borderWidth: 1, borderColor: c.border2, borderRadius: 8, color: c.text, padding: 10, fontSize: 14 },
    confirmBtn:     { backgroundColor: "#C9A96E", borderRadius: 10, padding: 14, alignItems: "center" },
    confirmBtnText: { color: "#000", fontSize: 13, fontWeight: "700" },
    modalOverlay:   { flex: 1, backgroundColor: "#000c", justifyContent: "flex-end" },
    pickerModal:    { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: 400 },
    pickerTitle:    { color: c.textSub, fontSize: 11, letterSpacing: 3, fontWeight: "700", textAlign: "center", marginBottom: 16 },
    pickerCell:     { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
    catLabel:       { fontSize: 9, letterSpacing: 3, color: c.textFaint, fontWeight: "700", marginBottom: 8, paddingLeft: 4 },
    habitCard:      { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: "hidden" },
    habitLeft:      { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
    habitIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    habitLabel:     { flex: 1, fontSize: 15, color: c.text, fontWeight: "500" },
    checkbox:       { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    deleteBtn:      { paddingHorizontal: 14, paddingVertical: 14, borderLeftWidth: 1, borderLeftColor: c.border2 },
    dateNav:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    dateNavBtn:      { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border2, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    dateNavBtnDisabled: { opacity: 0.25 },
    dateLabelWrap:  { alignItems: "center" },
    dateLabel:      { fontSize: 15, fontWeight: "800", color: c.text },
    dateLabelPast:  { color: "#7B9EE0" },
    dateSubLabel:   { fontSize: 9, letterSpacing: 2, color: c.textFaint, fontWeight: "700", marginTop: 2 },
  });
}

export default function Habits() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [habits, setHabits]   = useState<any[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", icon: "🎯", category: "custom", color: COLORS[0] });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    storage.get("lm_habits", DEFAULT_HABITS).then(h => {
      setHabits(Array.isArray(h) ? h : DEFAULT_HABITS);
    });
  }, []);

  useEffect(() => {
    storage.get(`lm_checked_${selectedDate}`, {}).then(c => {
      setChecked(c && typeof c === "object" ? c : {});
    });
  }, [selectedDate]);

  const saveHabits = async (h: any[]) => {
    setHabits(h);
    await storage.set("lm_habits", h);
  };

  const goToPrevDay = () => setSelectedDate(d => shiftDateKey(d, -1));
  const goToNextDay = () => setSelectedDate(d => (d === todayKey() ? d : shiftDateKey(d, 1)));

  const toggle = async (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    await storage.set(`lm_checked_${selectedDate}`, next);

    const completed = Object.values(next).filter(Boolean).length;
    const score = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
    const hist = await storage.get("lm_history", {});
    await storage.set("lm_history", { ...hist, [selectedDate]: score });

    if (id === "water") {
      const s = await storage.get("lm_stats", { waterCount: 0 });
      const delta = next[id] ? 1 : -1;
      await storage.set("lm_stats", { ...s, waterCount: Math.max(0, (s.waterCount || 0) + delta) });
    }
  };

  const resetForm = () => {
    setForm({ label: "", icon: "🎯", category: "custom", color: COLORS[0] });
    setEditingId(null);
    setShowForm(false);
  };

  const openNewForm = () => {
    if (showForm) { resetForm(); return; }
    setForm({ label: "", icon: "🎯", category: "custom", color: COLORS[0] });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (h: any) => {
    setForm({ label: h.label, icon: h.icon, category: h.category, color: h.color });
    setEditingId(h.id);
    setShowForm(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const saveHabit = async () => {
    if (!form.label.trim()) return;
    if (editingId) {
      await saveHabits(habits.map(h => h.id === editingId ? { ...h, ...form } : h));
    } else {
      await saveHabits([...habits, { id: `h_${Date.now()}`, ...form }]);
    }
    resetForm();
  };

  const deleteHabit = async (id: string) => {
    await saveHabits(habits.filter(h => h.id !== id));
    setDeleteTarget(null);
  };

  const completedCount = Object.values(checked).filter(Boolean).length;
  const categories = [...new Set(habits.map(h => h.category))];
  const isToday = selectedDate === todayKey();

  return (
    <ScrollView ref={scrollRef} style={styles.root} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>LOOKSMAX OS</Text>
        <Text style={styles.headerTitle}>Habitudes</Text>
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateNavBtn} onPress={goToPrevDay}>
          <Text style={{ color: colors.textSub, fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateLabelWrap}>
          <Text style={[styles.dateLabel, !isToday && styles.dateLabelPast]}>{formatDateLabel(selectedDate)}</Text>
          {!isToday && <Text style={styles.dateSubLabel}>MODIFIER CE JOUR</Text>}
        </View>
        <TouchableOpacity
          style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
          onPress={goToNextDay}
          disabled={isToday}
        >
          <Text style={{ color: colors.textSub, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={styles.progressText}>
          <Text style={{ color: "#C9A96E", fontWeight: "700" }}>{completedCount}</Text>
          /{habits.length} complétées
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${habits.length > 0 ? (completedCount / habits.length) * 100 : 0}%` as any }]} />
        </View>
      </View>

      <TouchableOpacity style={styles.addHabitBtn} onPress={openNewForm}>
        <Text style={styles.addHabitBtnText}>{showForm ? "✕ Annuler" : "+ Nouvelle habitude"}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? "Modifier l'habitude" : "Nouvelle habitude"}</Text>
          <View style={styles.formRow}>
            <TouchableOpacity style={styles.iconPick} onPress={() => setPickerOpen(true)}>
              <Text style={{ fontSize: 22 }}>{form.icon}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Nom de l'habitude..."
              placeholderTextColor={colors.textFaint}
              value={form.label}
              onChangeText={t => setForm(f => ({ ...f, label: t }))}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setForm(f => ({ ...f, category: c }))}
                  style={[styles.catChip, form.category === c && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, form.category === c && { color: "#C9A96E" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Couleur</Text>
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setForm(f => ({ ...f, color: c }))}
                  style={[styles.colorDot, { backgroundColor: c }, form.color === c && { borderWidth: 2, borderColor: "#fff" }]}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={saveHabit}>
            <Text style={styles.confirmBtnText}>{editingId ? "Enregistrer" : "Créer l'habitude"}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={pickerOpen} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Choisis une icône</Text>
            <FlatList
              data={ICONS}
              numColumns={5}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerCell}
                  onPress={() => { setForm(f => ({ ...f, icon: item })); setPickerOpen(false); }}
                >
                  <Text style={{ fontSize: 28 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {categories.map(cat => (
        <View key={cat} style={{ marginBottom: 16 }}>
          <Text style={styles.catLabel}>{cat.toUpperCase()}</Text>
          {habits.filter(h => h.category === cat).map(h => (
            <View
              key={h.id}
              style={[styles.habitCard, {
                borderColor: checked[h.id] ? h.color : colors.border2,
                backgroundColor: checked[h.id] ? `${h.color}18` : colors.card,
              }]}
              {...(Platform.OS === "web"
                ? { onContextMenu: (e: any) => { e.preventDefault(); openEditForm(h); } }
                : {})}
            >
              <TouchableOpacity
                style={styles.habitLeft}
                onPress={() => toggle(h.id)}
                onLongPress={Platform.OS === "web" ? undefined : () => openEditForm(h)}
                delayLongPress={400}
              >
                <View style={[styles.habitIcon, { backgroundColor: `${h.color}20` }]}>
                  <Text style={{ fontSize: 18 }}>{h.icon}</Text>
                </View>
                <Text style={styles.habitLabel}>{h.label}</Text>
                <View style={[styles.checkbox, {
                  backgroundColor: checked[h.id] ? h.color : "transparent",
                  borderColor: checked[h.id] ? h.color : colors.border2,
                }]}>
                  {checked[h.id] && <Text style={{ color: "#000", fontSize: 12, fontWeight: "900" }}>✓</Text>}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteTarget({ id: h.id, label: h.label })}>
                <MaterialIcons name="delete-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Supprimer cette habitude ?"
        message={deleteTarget ? `"${deleteTarget.label}" et son historique de suivi seront définitivement supprimés.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteHabit(deleteTarget.id)}
      />
    </ScrollView>
  );
}
