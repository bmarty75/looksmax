import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, DEFAULT_GOALS, ICONS } from "../../constants/data";
import { storage } from "../../hooks/useStorage";

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "",
    target: "30",
    unit: "j",
    icon: "🎯",
    color: "#B07ECC",
  });

  useEffect(() => {
    storage
      .get("lm_goals", DEFAULT_GOALS)
      .then((g) => setGoals(Array.isArray(g) ? g : DEFAULT_GOALS));
  }, []);

  const saveGoals = async (g: any[]) => {
    setGoals(g);
    await storage.set("lm_goals", g);
  };

  const addGoal = async () => {
    if (!form.label.trim()) return;
    const newG = {
      id: `g_${Date.now()}`,
      ...form,
      target: parseInt(form.target) || 30,
      progress: 0,
    };
    const s = await storage.get("lm_stats", { goalsCreated: 0 });
    await storage.set("lm_stats", {
      ...s,
      goalsCreated: (s.goalsCreated || 0) + 1,
    });
    await saveGoals([...goals, newG]);
    setForm({
      label: "",
      target: "30",
      unit: "j",
      icon: "🎯",
      color: "#B07ECC",
    });
    setShowForm(false);
  };

  const updateProgress = async (id: string, delta: number) => {
    const updated = goals.map((g) =>
      g.id === id
        ? {
            ...g,
            progress: Math.max(0, Math.min(g.target, g.progress + delta)),
          }
        : g,
    );
    await saveGoals(updated);
  };

  const deleteGoal = async (id: string) => {
    await saveGoals(goals.filter((g) => g.id !== id));
  };

  const UNITS = ["j", "kg", "%", "km", "rep", "h", "L"];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>LOOKSMAX OS</Text>
          <Text style={styles.headerTitle}>Objectifs</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addBtnText}>{showForm ? "✕" : "+ Ajouter"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ICONS.slice(0, 10).map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setForm((f) => ({ ...f, icon: ic }))}
                style={[
                  styles.iconChip,
                  form.icon === ic && styles.iconChipActive,
                ]}
              >
                <Text style={{ fontSize: 22 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder="Nom de l'objectif..."
            placeholderTextColor="#333"
            value={form.label}
            onChangeText={(t) => setForm((f) => ({ ...f, label: t }))}
          />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Cible</Text>
            <TextInput
              style={[styles.input, { width: 80 }]}
              keyboardType="numeric"
              value={form.target}
              onChangeText={(t) => setForm((f) => ({ ...f, target: t }))}
              placeholderTextColor="#333"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setForm((f) => ({ ...f, unit: u }))}
                  style={[
                    styles.unitChip,
                    form.unit === u && styles.unitChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      form.unit === u && { color: "#C9A96E" },
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Couleur</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setForm((f) => ({ ...f, color: c }))}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    form.color === c && { borderWidth: 2, borderColor: "#fff" },
                  ]}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={addGoal}>
            <Text style={styles.confirmBtnText}>Créer</Text>
          </TouchableOpacity>
        </View>
      )}

      {goals.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Aucun objectif.{"\n"}Crée ton premier ! 🎯
          </Text>
        </View>
      )}

      {goals.map((g) => {
        const pct =
          g.target > 0
            ? Math.min(Math.round((g.progress / g.target) * 100), 100)
            : 0;
        const done = pct >= 100;
        return (
          <View
            key={g.id}
            style={[
              styles.goalCard,
              { borderColor: done ? g.color : "#1A1A1A" },
            ]}
          >
            <View style={styles.goalTop}>
              <View style={styles.goalIconWrap}>
                <Text style={{ fontSize: 22 }}>{g.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalLabel}>
                  {g.label} {done ? "✅" : ""}
                </Text>
                <Text style={styles.goalSub}>
                  {g.progress} / {g.target} {g.unit}
                </Text>
              </View>
              <Text style={[styles.goalPct, { color: g.color }]}>{pct}%</Text>
            </View>

            <View style={styles.goalBarTrack}>
              <View
                style={[
                  styles.goalBarFill,
                  { width: `${pct}%` as any, backgroundColor: g.color },
                ]}
              />
            </View>

            <View style={styles.goalActions}>
              <TouchableOpacity
                style={styles.goalBtn}
                onPress={() => updateProgress(g.id, -1)}
              >
                <Text style={styles.goalBtnText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.goalBtn, { borderColor: g.color, flex: 2 }]}
                onPress={() => updateProgress(g.id, 1)}
              >
                <Text style={[styles.goalBtnText, { color: g.color }]}>
                  +1 {g.unit}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.goalBtn, { borderColor: "#E07B5A44" }]}
                onPress={() => deleteGoal(g.id)}
              >
                <Text style={[styles.goalBtnText, { color: "#E07B5A" }]}>
                  🗑️
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808", paddingHorizontal: 16 },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#161616",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  headerSub: {
    fontSize: 10,
    letterSpacing: 4,
    color: "#C9A96E",
    fontWeight: "700",
    marginBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#F0EAE0" },
  addBtn: {
    backgroundColor: "#C9A96E22",
    borderWidth: 1,
    borderColor: "#C9A96E44",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { color: "#C9A96E", fontSize: 12, fontWeight: "700" },
  formCard: {
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  formRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  formLabel: {
    fontSize: 11,
    color: "#555",
    fontWeight: "700",
    letterSpacing: 1,
    minWidth: 60,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  iconChipActive: { borderColor: "#C9A96E", backgroundColor: "#C9A96E22" },
  input: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    color: "#EEE",
    padding: 10,
    fontSize: 14,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    marginRight: 8,
  },
  unitChipActive: { borderColor: "#C9A96E44", backgroundColor: "#C9A96E11" },
  unitChipText: { fontSize: 11, color: "#555", fontWeight: "700" },
  colorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  colorDot: { width: 22, height: 22, borderRadius: 11 },
  confirmBtn: {
    backgroundColor: "#C9A96E",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  confirmBtnText: { color: "#000", fontSize: 13, fontWeight: "700" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: {
    color: "#444",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 24,
  },
  goalCard: {
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
  },
  goalTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  goalIconWrap: {
    width: 44,
    height: 44,
    backgroundColor: "#161616",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DDD",
    marginBottom: 3,
  },
  goalSub: { fontSize: 12, color: "#555" },
  goalPct: { fontSize: 18, fontWeight: "800" },
  goalBarTrack: {
    height: 4,
    backgroundColor: "#161616",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 14,
  },
  goalBarFill: { height: "100%", borderRadius: 2 },
  goalActions: { flexDirection: "row", gap: 8 },
  goalBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  goalBtnText: { color: "#777", fontSize: 13, fontWeight: "700" },
});
