import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { BADGES, DEFAULT_GOALS, DEFAULT_HABITS, TIPS, getRank, todayKey } from "../../constants/data";
import { storage } from "../../hooks/useStorage";

// ─── Chart constants ──────────────────────────────────────────
const CHART_W = 280;
const CHART_H = 80;
const CHART_PT = 8;
const CHART_PB = 4;

type Range = "week" | "month" | "year" | "all";
const RANGES: { key: Range; label: string }[] = [
  { key: "week", label: "7J" },
  { key: "month", label: "1M" },
  { key: "year", label: "1A" },
  { key: "all", label: "Tout" },
];

// ─── Momentum : EMA avec décroissance asymétrique ────────────
// Plus le momentum est haut, moins un jour raté lui coûte.
// Ex : après 30 jours à 100%, rater 1 jour = ~0.3 pts de perte seulement.
function computeMomentum(history: Record<string, number>): Record<string, number> {
  const allKeys = Object.keys(history).sort();
  if (allKeys.length === 0) return {};

  let m = 0;
  const result: Record<string, number> = {};
  const cur = new Date(allKeys[0]);
  const end = new Date();

  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    const score = history[key] ?? 0;
    if (score > 0) {
      // Monte vers le score du jour (croissance régulière)
      m = m + 0.08 * (score - m);
    } else {
      // Décroissance exponentiellement réduite quand momentum est élevé
      m = m * (1 - 0.05 * Math.exp(-m / 35));
    }
    result[key] = Math.round(m * 10) / 10;
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// ─── Données chart selon la plage ────────────────────────────
interface ChartPoint { score: number; label: string }

const MN = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DN = ["D","L","M","M","J","V","S"];

function getChartData(mHist: Record<string, number>, range: Range): ChartPoint[] {
  const today = new Date();

  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { score: mHist[d.toISOString().slice(0, 10)] || 0, label: i === 6 ? "Auj" : DN[d.getDay()] };
    });
  }

  if (range === "month") {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      return { score: mHist[d.toISOString().slice(0, 10)] || 0, label: i % 7 === 0 ? `${d.getDate()}` : "" };
    });
  }

  if (range === "year") {
    return Array.from({ length: 52 }, (_, w) => {
      const we = new Date(today);
      we.setDate(today.getDate() - (51 - w) * 7);
      let sum = 0, cnt = 0;
      for (let d = 6; d >= 0; d--) {
        const dd = new Date(we);
        dd.setDate(we.getDate() - d);
        const v = mHist[dd.toISOString().slice(0, 10)];
        if (v != null) { sum += v; cnt++; }
      }
      return { score: cnt > 0 ? Math.round(sum / cnt) : 0, label: w % 8 === 0 ? MN[we.getMonth()] : "" };
    });
  }

  // All time — moyennes mensuelles
  const allKeys = Object.keys(mHist).sort();
  if (allKeys.length === 0) return [{ score: 0, label: "" }];

  const months: ChartPoint[] = [];
  const first = new Date(allKeys[0]);
  const cur = new Date(first.getFullYear(), first.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  while (cur <= endDate) {
    const y = cur.getFullYear(), mo = cur.getMonth();
    let sum = 0, cnt = 0;
    allKeys.forEach(k => {
      const d = new Date(k);
      if (d.getFullYear() === y && d.getMonth() === mo) { sum += mHist[k]; cnt++; }
    });
    months.push({ score: cnt > 0 ? Math.round(sum / cnt) : 0, label: MN[mo] });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.length > 0 ? months : [{ score: 0, label: "" }];
}

// ─── SVG path helpers ─────────────────────────────────────────
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cx = (p.x + c.x) / 2;
    d += ` C ${cx} ${p.y}, ${cx} ${c.y}, ${c.x} ${c.y}`;
  }
  return d;
}

function buildChart(data: ChartPoint[]) {
  const n = data.length;
  const yRange = CHART_H - CHART_PT - CHART_PB;
  const pts = data.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * CHART_W : CHART_W / 2,
    y: CHART_H - CHART_PB - (d.score / 100) * yRange,
  }));
  const line = smoothPath(pts);
  const fill = line ? `${line} L ${pts[pts.length - 1].x} ${CHART_H} L ${pts[0].x} ${CHART_H} Z` : "";
  return { pts, line, fill };
}

// ─── Dashboard ────────────────────────────────────────────────
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
  const [range, setRange] = useState<Range>("week");
  const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    const load = async () => {
      try {
        const habitsData = await storage.get("lm_habits", DEFAULT_HABITS);
        const checked   = await storage.get(`lm_checked_${todayKey()}`, {});
        const g         = await storage.get("lm_goals", DEFAULT_GOALS);
        const h         = await storage.get("lm_history", {});
        const s         = await storage.get("lm_stats", DEFAULT_STATS);

        const habitsArr  = Array.isArray(habitsData) ? habitsData : DEFAULT_HABITS;
        const checkedObj = checked && typeof checked === "object" ? checked : {};
        const goalsArr   = Array.isArray(g) ? g : DEFAULT_GOALS;
        const historyObj = h && typeof h === "object" ? h : {};
        const statsObj   = s && typeof s === "object" ? { ...DEFAULT_STATS, ...s } : DEFAULT_STATS;

        const completed = Object.values(checkedObj).filter(Boolean).length;
        const sc = habitsArr.length > 0 ? Math.round((completed / habitsArr.length) * 100) : 0;

        // Points faibles : lire les 7 derniers jours par habitude
        const counts: Record<string, number> = {};
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dc = await storage.get(`lm_checked_${d.toISOString().slice(0, 10)}`, {});
          if (dc && typeof dc === "object") {
            Object.entries(dc as Record<string, boolean>).forEach(([id, v]) => {
              if (v) counts[id] = (counts[id] || 0) + 1;
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
  const unlockedBadges = BADGES.filter(b => b.condition(stats));

  // Points faibles : habitudes < 100% sur 7 jours
  const weakHabits = habits
    .map(h => ({ ...h, rate: Math.round(((habitCounts[h.id] || 0) / 7) * 100) }))
    .filter(h => h.rate < 100)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);

  // Courbe momentum
  const momentumHist = computeMomentum(history);
  const chartData    = getChartData(momentumHist, range);
  const { pts, line, fill } = buildChart(chartData);
  const n = chartData.length;

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
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>PROGRESSION</Text>
          <View style={styles.rangeRow}>
            {RANGES.map(r => (
              <TouchableOpacity
                key={r.key}
                onPress={() => setRange(r.key)}
                style={[styles.rangeBtn, range === r.key && styles.rangeBtnActive]}
              >
                <Text style={[styles.rangeTxt, range === r.key && styles.rangeTxtActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          <Defs>
            <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={rank.color} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={rank.color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {/* Lignes de référence */}
          {[25, 50, 75].map(v => {
            const gy = CHART_H - CHART_PB - (v / 100) * (CHART_H - CHART_PT - CHART_PB);
            return <Line key={v} x1={0} y1={gy} x2={CHART_W} y2={gy} stroke="#1a1a1a" strokeWidth={1} />;
          })}
          {/* Courbe */}
          {pts.length === 1 ? (
            <Circle cx={pts[0].x} cy={pts[0].y} r={4} fill={rank.color} />
          ) : (
            <>
              <Path d={fill} fill="url(#chartFill)" />
              <Path d={line} fill="none" stroke={rank.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          {/* Point actuel */}
          {pts.length > 0 && (
            <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3.5} fill={rank.color} />
          )}
        </Svg>

        {/* Labels axe X */}
        <View style={{ height: 18, marginTop: 4, position: "relative" }}>
          {chartData.map((pt, i) => {
            if (!pt.label) return null;
            const pct = n > 1 ? (i / (n - 1)) * 100 : 50;
            return (
              <View key={i} style={{ position: "absolute", left: `${pct}%` as any, width: 26, marginLeft: -13 }}>
                <Text style={{ fontSize: 8, color: "#555", fontWeight: "700", textAlign: "center" }}>
                  {pt.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Points faibles (masqué si tout à 100%) */}
      {weakHabits.length > 0 && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={[styles.cardTitle, { marginBottom: 14 }]}>POINTS FAIBLES — 7 JOURS</Text>
          {weakHabits.map(h => {
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
        <Text style={[styles.cardTitle, { marginBottom: 16 }]}>BADGES ({unlockedBadges.length}/{BADGES.length})</Text>
        <View style={styles.badgeGrid}>
          {BADGES.map(b => {
            const unlocked = unlockedBadges.find(u => u.id === b.id);
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
          <Text style={[styles.cardTitle, { marginBottom: 16 }]}>OBJECTIFS EN COURS</Text>
          {goals.slice(0, 3).map(g => {
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
  cardTitle: { fontSize: 10, letterSpacing: 3, color: "#444", fontWeight: "700" },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  rangeRow: { flexDirection: "row", gap: 5 },
  rangeBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#222" },
  rangeBtnActive: { borderColor: "#C9A96E55", backgroundColor: "#C9A96E11" },
  rangeTxt: { fontSize: 9, fontWeight: "700", color: "#333", letterSpacing: 0.5 },
  rangeTxtActive: { color: "#C9A96E" },
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
