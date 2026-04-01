import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { BADGES, DEFAULT_GOALS, DEFAULT_HABITS, TIPS, getRank, todayKey } from "../../constants/data";
import { storage } from "../../hooks/useStorage";

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const CHART_W = 280;
const CHART_H = 68;

function generateWeekData(history: Record<string, number>) {
  const today = new Date();
  return DAYS.map((d, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    const key = date.toISOString().slice(0, 10);
    const score = history && history[key] ? history[key] : 0;
    return { day: d, score, active: score > 0 };
  });
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function buildChart(weekData: { score: number }[]) {
  const pts = weekData.map((d, i) => ({
    x: weekData.length > 1 ? (i / (weekData.length - 1)) * CHART_W : CHART_W / 2,
    y: CHART_H - 4 - (d.score / 100) * (CHART_H - 12),
  }));
  const line = smoothPath(pts);
  const fill =
    line +
    ` L ${pts[pts.length - 1].x} ${CHART_H} L ${pts[0].x} ${CHART_H} Z`;
  return { pts, line, fill };
}

const DEFAULT_STATS = {
  streak: 0, totalChecked: 0, perfectDays: 0,
  waterCount: 0, goalsCreated: 0, avgScore: 0, photos: 0,
};

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [goals, setGoals] = useState<any[]>([]);
  const [history, setHistory] = useState<Record<string, number>>({});
  const [habits, setHabits] = useState<any[]>([]);
  const [habitsLen, setHabitsLen] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [habitCounts, setHabitCounts] = useState<Record<string, number>>({});
  const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    const load = async () => {
      try {
        const habitsData = await storage.get("lm_habits", DEFAULT_HABITS);
        const checked = await storage.get(`lm_checked_${todayKey()}`, {});
        const g = await storage.get("lm_goals", DEFAULT_GOALS);
        const h = await storage.get("lm_history", {});
        const s = await storage.get("lm_stats", DEFAULT_STATS);

        const habitsArr = Array.isArray(habitsData) ? habitsData : DEFAULT_HABITS;
        const checkedObj = checked && typeof checked === "object" ? checked : {};
        const goalsArr = Array.isArray(g) ? g : DEFAULT_GOALS;
        const historyObj = h && typeof h === "object" ? h : {};
        const statsObj = s && typeof s === "object" ? { ...DEFAULT_STATS, ...s } : DEFAULT_STATS;

        const completed = Object.values(checkedObj).filter(Boolean).length;
        const sc = habitsArr.length > 0 ? Math.round((completed / habitsArr.length) * 100) : 0;

        // Calcul des points faibles : lire les 7 derniers jours
        const counts: Record<string, number> = {};
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dayKey = date.toISOString().slice(0, 10);
          const dayChecked = await storage.get(`lm_checked_${dayKey}`, {});
          if (dayChecked && typeof dayChecked === "object") {
            Object.entries(dayChecked as Record<string, boolean>).forEach(([id, val]) => {
              if (val) counts[id] = (counts[id] || 0) + 1;
            });
          }
        }

        setHabits(habitsArr);
        setHabitsLen(habitsArr.length);
        setCompletedToday(completed);
        setScore(sc);
        setGoals(goalsArr);
        setHistory(historyObj);
        setStats(statsObj);
        setHabitCounts(counts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#080808", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#C9A96E", fontSize: 32 }}>◈</Text>
      </View>
    );
  }

  const rank = getRank(score);
  const circ = 2 * Math.PI * 54;
  const offset = circ - (score / 100) * circ;
  const weekData = generateWeekData(history);
  const { pts, line, fill } = buildChart(weekData);
  const unlockedBadges = BADGES.filter((b) => b.condition(stats));

  // Points faibles : habitudes cochées < 100% sur 7 jours, triées par taux croissant
  const weakHabits = habits
    .map((h) => ({ ...h, rate: Math.round(((habitCounts[h.id] || 0) / 7) * 100) }))
    .filter((h) => h.rate < 100)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>LOOKSMAX OS</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={[styles.rankBadge, { borderColor: rank.color }]}>
          <Text style={[styles.rankLabel, { color: rank.color }]}>{rank.label}</Text>
        </View>
      </View>

      {/* Score ring */}
      <View style={styles.card}>
        <View style={styles.ringWrap}>
          <Svg width={140} height={140} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Defs>
              <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={rank.color} />
                <Stop offset="100%" stopColor="#F0D090" />
              </LinearGradient>
            </Defs>
            <Circle cx={70} cy={70} r={54} fill="none" stroke="#1a1a1a" strokeWidth={10} />
            <Circle cx={70} cy={70} r={54} fill="none" stroke="url(#ringGrad)" strokeWidth={10}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringScore, { color: rank.color }]}>{score}</Text>
            <Text style={styles.ringSubLabel}>SCORE</Text>
            <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: "#E07B5A" }]}>{stats.streak ?? 0}🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: "#C9A96E" }]}>{completedToday}/{habitsLen}</Text>
            <Text style={styles.statLabel}>Aujourd'hui</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: rank.color }]}>{rank.label}</Text>
            <Text style={styles.statLabel}>Rang</Text>
          </View>
        </View>
      </View>

      {/* Courbe de progression */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>PROGRESSION — 7 JOURS</Text>
        <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          <Defs>
            <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={rank.color} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={rank.color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {/* Aire sous la courbe */}
          <Path d={fill} fill="url(#chartFill)" />
          {/* Ligne de la courbe */}
          <Path d={line} fill="none" stroke={rank.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {/* Points actifs */}
          {pts.map((pt, i) =>
            weekData[i].active ? (
              <Circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill={rank.color} />
            ) : null
          )}
        </Svg>
        <View style={styles.chartLabels}>
          {weekData.map((d, i) => (
            <Text
              key={i}
              style={[styles.dayLabel, { color: d.active ? rank.color : "#333" }]}
            >
              {d.day}
            </Text>
          ))}
        </View>
      </View>

      {/* Points faibles (masqué si toutes les habitudes sont à 100%) */}
      {weakHabits.length > 0 && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>POINTS FAIBLES — 7 JOURS</Text>
          {weakHabits.map((h) => {
            const barColor = h.rate < 30 ? "#E07B5A" : h.rate < 65 ? "#E0C55A" : "#7ECC8A";
            return (
              <View key={h.id} style={{ marginBottom: 10 }}>
                <View style={styles.weakRow}>
                  <Text style={styles.weakLabel}>{h.icon} {h.label}</Text>
                  <Text style={[styles.weakPct, { color: barColor }]}>{h.rate}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(h.rate, 2)}%` as any, backgroundColor: barColor }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Badges */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>BADGES ({unlockedBadges.length}/{BADGES.length})</Text>
        <View style={styles.badgeGrid}>
          {BADGES.map((b) => {
            const unlocked = unlockedBadges.find((u) => u.id === b.id);
            return (
              <View key={b.id} style={[styles.badgeItem, { opacity: unlocked ? 1 : 0.2 }]}>
                <View style={[styles.badgeIcon, { borderColor: unlocked ? "#C9A96E55" : "#1A1A1A" }]}>
                  <Text style={{ fontSize: 20 }}>{b.icon}</Text>
                </View>
                <Text style={styles.badgeName}>{b.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Objectifs */}
      {goals.length > 0 && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>OBJECTIFS EN COURS</Text>
          {goals.slice(0, 3).map((g) => {
            const pct = g.target > 0 ? Math.min(Math.round((g.progress / g.target) * 100), 100) : 0;
            return (
              <View key={g.id} style={{ marginBottom: 12 }}>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>{g.icon} {g.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: g.color }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Tip */}
      <View style={styles.tipCard}>
        <Text style={{ fontSize: 18 }}>💡</Text>
        <Text style={styles.tipText}>{tip}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808", paddingHorizontal: 16 },
  header: { paddingTop: 60, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: "#161616", marginBottom: 16 },
  headerSub: { fontSize: 10, letterSpacing: 4, color: "#C9A96E", fontWeight: "700", marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#F0EAE0" },
  rankBadge: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "#0F0F0F" },
  rankLabel: { fontSize: 16, fontWeight: "800" },
  card: { backgroundColor: "#0F0F0F", borderWidth: 1, borderColor: "#1A1A1A", borderRadius: 16, padding: 20 },
  cardTitle: { fontSize: 10, letterSpacing: 3, color: "#444", fontWeight: "700", marginBottom: 16 },
  ringWrap: { alignItems: "center", justifyContent: "center", marginBottom: 20, height: 150 },
  ringCenter: { position: "absolute", alignItems: "center" },
  ringScore: { fontSize: 36, fontWeight: "800", lineHeight: 40 },
  ringSubLabel: { fontSize: 9, letterSpacing: 3, color: "#555", fontWeight: "700", marginTop: 2 },
  rankTitle: { fontSize: 9, fontWeight: "700", letterSpacing: 2, marginTop: 4 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  stat: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, color: "#444", marginTop: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: "#1A1A1A" },
  chartLabels: { flexDirection: "row", marginTop: 10 },
  dayLabel: { flex: 1, fontSize: 9, fontWeight: "700", letterSpacing: 1, textAlign: "center" },
  weakRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  weakLabel: { color: "#888", fontSize: 13 },
  weakPct: { fontSize: 12, fontWeight: "700" },
  barTrack: { height: 4, backgroundColor: "#161616", borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeItem: { width: "22%", alignItems: "center", gap: 5 },
  badgeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#161616", alignItems: "center", justifyContent: "center", borderWidth: 1 },
  badgeName: { fontSize: 8, color: "#666", textAlign: "center", fontWeight: "700" },
  tipCard: { marginTop: 12, backgroundColor: "#0A0A0A", borderWidth: 1, borderColor: "#C9A96E22", borderLeftWidth: 3, borderLeftColor: "#C9A96E", borderRadius: 12, padding: 14, flexDirection: "row", gap: 12 },
  tipText: { fontSize: 13, color: "#888", lineHeight: 20, flex: 1 },
});
