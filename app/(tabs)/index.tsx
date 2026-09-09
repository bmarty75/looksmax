import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RankSheet } from "../../components/RankSheet";
import { ScreenHeader } from "../../components/ScreenHeader";
import { AreaChart, Card, Pill, ProgressBar, Rings, SectionTitle, Sparkline } from "../../components/ui";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { DEFAULT_HABITS, getRank, todayKey } from "../../constants/data";
import { storage } from "../../hooks/useStorage";
import {
  compute30DayAvg, computeCompositeScore, computeCurrentStreak, indexPsl,
  partsParCategorie, projectionRangSuivant, serieCompletion, serieScore,
} from "../../lib/metrics";
import { loadProfile } from "../../lib/profile";

const JOURS = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

/** Numéro de semaine ISO. */
function numeroSemaine(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const debut = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - debut.getTime()) / 86400000 + 1) / 7);
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: c.bg },
    content:     { paddingHorizontal: 16, paddingBottom: 30 },

    dateRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    dateGauche:  { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, paddingRight: 10 },
    dateTxt:     { fontSize: 15, fontWeight: "800", color: c.text, letterSpacing: 0.3 },

    semaine:     { flexDirection: "row", gap: 6, marginBottom: 18 },
    jour:        { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 13, backgroundColor: c.card },
    jourNom:     { fontSize: 9, fontWeight: "700", color: c.textMuted, letterSpacing: 0.5 },
    jourNum:     { fontSize: 15, fontWeight: "800", color: c.text, marginTop: 3 },
    jourPoint:   { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

    ringCard:    { alignItems: "center", paddingVertical: 24 },
    pslValeur:   { fontSize: 42, fontWeight: "800", color: c.text, lineHeight: 46 },
    pslLabel:    { fontSize: 9, fontWeight: "700", color: c.textMuted, letterSpacing: 2.5, marginTop: 2 },
    legende:     { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: c.border },
    legItem:     { alignItems: "center", gap: 5 },
    legHaut:     { flexDirection: "row", alignItems: "center", gap: 5 },
    legPoint:    { width: 7, height: 7, borderRadius: 4 },
    legNom:      { fontSize: 9, fontWeight: "700", color: c.textMuted, letterSpacing: 0.8 },
    legVal:      { fontSize: 17, fontWeight: "800", color: c.text },

    mesures:     { flexDirection: "row", gap: 10, marginBottom: 22 },
    mesure:      { flex: 1, backgroundColor: c.card, borderRadius: 16, padding: 13 },
    mesureNom:   { fontSize: 8.5, fontWeight: "700", color: c.textMuted, letterSpacing: 0.8 },
    mesureVal:   { fontSize: 19, fontWeight: "800", color: c.text, marginTop: 6 },
    mesureNote:  { fontSize: 9.5, fontWeight: "700", marginTop: 2, marginBottom: 6 },

    protoTitre:  { fontSize: 17, fontWeight: "800", color: c.text, lineHeight: 22 },
    protoSous:   { fontSize: 9, fontWeight: "700", color: c.textMuted, letterSpacing: 1.4, marginTop: 3 },
    ligne:       { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
    ligneIcone:  { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    ligneNom:    { fontSize: 13.5, fontWeight: "700", color: c.text },
    ligneSous:   { fontSize: 11, color: c.textMuted, marginTop: 2 },
    coche:       { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },

    trajTitre:   { fontSize: 20, fontWeight: "800", color: c.text },
    trajLabels:  { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    trajLabel:   { fontSize: 9, color: c.textFaint, fontWeight: "700" },
    encart:      { backgroundColor: c.surface, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
    encartNom:   { fontSize: 13, fontWeight: "800", color: c.text },
    encartSous:  { fontSize: 11, color: c.textMuted, marginTop: 2 },
  });
}

export default function Biometrie() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [pret, setPret]         = useState(false);
  const [habits, setHabits]     = useState<any[]>([]);
  const [checked, setChecked]   = useState<Record<string, boolean>>({});
  const [history, setHistory]   = useState<Record<string, number>>({});
  const [counts7j, setCounts7j] = useState<Record<string, number>>({});
  const [avatar, setAvatar]     = useState<string | null>(null);
  const [echelleOuverte, setEchelleOuverte] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const h  = await storage.get("lm_habits", DEFAULT_HABITS);
          const ch = await storage.get(`lm_checked_${todayKey()}`, {});
          const hi = await storage.get("lm_history", {});

          const habitsArr  = Array.isArray(h) ? h : DEFAULT_HABITS;
          const checkedObj = ch && typeof ch === "object" ? ch : {};
          const historyObj = hi && typeof hi === "object" ? hi : {};

          const faits = Object.values(checkedObj).filter(Boolean).length;
          const pct = habitsArr.length > 0 ? Math.round((faits / habitsArr.length) * 100) : 0;
          if (historyObj[todayKey()] !== pct) {
            historyObj[todayKey()] = pct;
            await storage.set("lm_history", historyObj);
          }

          const counts: Record<string, number> = {};
          for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dc = await storage.get(`lm_checked_${d.toISOString().slice(0, 10)}`, {});
            if (dc && typeof dc === "object") {
              Object.entries(dc as Record<string, boolean>).forEach(([id, v]) => {
                if (v) counts[id] = (counts[id] || 0) + 1;
              });
            }
          }

          setHabits(habitsArr);
          setChecked(checkedObj);
          setHistory(historyObj);
          setCounts7j(counts);
          setAvatar((await loadProfile()).avatar);
        } finally {
          setPret(true);
        }
      })();
    }, []),
  );

  if (!pret) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.amber, fontSize: 30 }}>◈</Text>
      </View>
    );
  }

  const aujourdhui  = new Date();
  const faits       = Object.values(checked).filter(Boolean).length;
  const pctJour     = habits.length > 0 ? Math.round((faits / habits.length) * 100) : 0;
  const streak      = computeCurrentStreak(history);
  const moyenne30   = compute30DayAvg(history);
  const score       = computeCompositeScore(pctJour, streak, moyenne30);
  const rang        = getRank(score, streak);
  const psl         = indexPsl(score, streak);
  const parts       = partsParCategorie(habits, counts7j, [colors.amber, colors.green, colors.coral]);
  const projection  = projectionRangSuivant(history);
  const restantes   = habits.filter(h => !checked[h.id]);
  const serie7      = serieScore(history, 7);
  const progression = serie7.length >= 2 ? serie7[serie7.length - 1] - serie7[0] : 0;
  const joursActifs = Object.values(history).filter(v => v > 0).length;

  // Bandeau de la semaine, du lundi au dimanche.
  const lundi = new Date(aujourdhui);
  lundi.setDate(aujourdhui.getDate() - ((aujourdhui.getDay() + 6) % 7));
  const semaine = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    const k = d.toISOString().slice(0, 10);
    return { date: d, cle: k, actif: (history[k] || 0) > 0, cejour: k === todayKey() };
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader section="Biométrie" avatar={avatar} rang={rang} />

      <View style={styles.dateRow}>
        <View style={styles.dateGauche}>
          <MaterialIcons name="calendar-today" size={15} color={colors.amber} />
          <Text style={styles.dateTxt}>
            AUJOURD&apos;HUI, {aujourdhui.getDate()} {MOIS[aujourdhui.getMonth()].toUpperCase()}
          </Text>
        </View>
        <Pill>SEMAINE {numeroSemaine(aujourdhui)}</Pill>
      </View>

      <View style={styles.semaine}>
        {semaine.map(j => (
          <View key={j.cle} style={[styles.jour, j.cejour && { backgroundColor: colors.amber }]}>
            <Text style={[styles.jourNom, j.cejour && { color: colors.onAmber }]}>{JOURS[j.date.getDay()]}</Text>
            <Text style={[styles.jourNum, j.cejour && { color: colors.onAmber }]}>{j.date.getDate()}</Text>
            <View style={[
              styles.jourPoint,
              { backgroundColor: j.actif ? (j.cejour ? colors.onAmber : colors.green) : "transparent" },
            ]} />
          </View>
        ))}
      </View>

      {/* Anneaux : un par catégorie d'habitude, sur 7 jours */}
      <Card style={styles.ringCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setEchelleOuverte(true)}
          accessibilityLabel="Voir l'échelle des rangs"
        >
          <Rings
            valeurs={parts.map(p => ({ valeur: p.taux, couleur: p.couleur }))}
            enfant={
              <>
                <Text style={styles.pslValeur}>{psl.toFixed(1)}</Text>
                <Text style={styles.pslLabel}>PSL INDEX</Text>
                <Pill color={rang.color} teinte={`${rang.color}22`} dot style={{ marginTop: 8 }}>
                  {rang.label.toUpperCase()}
                </Pill>
              </>
            }
          />
        </TouchableOpacity>
        <View style={styles.legende}>
          {parts.map(p => (
            <View key={p.categorie} style={styles.legItem}>
              <View style={styles.legHaut}>
                <View style={[styles.legPoint, { backgroundColor: p.couleur }]} />
                <Text style={styles.legNom}>{p.libelle}</Text>
              </View>
              <Text style={styles.legVal}>{p.taux}%</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ height: 22 }} />

      <SectionTitle right={<Text style={{ color: colors.green, fontSize: 10, fontWeight: "700" }}>7 DERNIERS JOURS</Text>}>
        ÉTAT DE LA RÉGULARITÉ
      </SectionTitle>

      <View style={styles.mesures}>
        <View style={styles.mesure}>
          <Text style={styles.mesureNom}>STREAK</Text>
          <Text style={styles.mesureVal}>{streak} j</Text>
          <Text style={[styles.mesureNote, { color: streak > 0 ? colors.green : colors.textMuted }]}>
            {streak > 0 ? "en cours" : "à relancer"}
          </Text>
          <Sparkline valeurs={serieCompletion(history, 14)} couleur={colors.green} />
        </View>
        <View style={styles.mesure}>
          <Text style={styles.mesureNom}>MOYENNE 30 J</Text>
          <Text style={styles.mesureVal}>{Math.round(moyenne30)}%</Text>
          <Text style={[styles.mesureNote, { color: colors.amber }]}>Obj. 100%</Text>
          <Sparkline valeurs={serieScore(history, 14)} couleur={colors.amber} />
        </View>
        <View style={styles.mesure}>
          <Text style={styles.mesureNom}>JOURS ACTIFS</Text>
          <Text style={styles.mesureVal}>{joursActifs}</Text>
          <Text style={[styles.mesureNote, { color: colors.coral }]}>depuis le début</Text>
          <Sparkline valeurs={serieCompletion(history, 14)} couleur={colors.coral} />
        </View>
      </View>

      {/* Ce qu'il reste à faire aujourd'hui */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.protoTitre}>Protocole du jour</Text>
            <Text style={styles.protoSous}>ROUTINES NON COMPLÉTÉES</Text>
          </View>
          <Pill color={restantes.length === 0 ? colors.green : colors.amber} teinte={colors.surface}>
            {restantes.length === 0 ? "TERMINÉ" : `${restantes.length} RESTANTES`}
          </Pill>
        </View>

        <View style={{ marginTop: 10 }}>
          {restantes.slice(0, 3).map(h => (
            <View key={h.id} style={styles.ligne}>
              <View style={[styles.ligneIcone, { backgroundColor: `${h.color}1F` }]}>
                <Text style={{ fontSize: 17 }}>{h.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ligneNom}>{h.label}</Text>
                <Text style={styles.ligneSous}>{(h.category ?? "").toUpperCase()}</Text>
              </View>
              <View style={[styles.coche, { borderColor: colors.border2 }]} />
            </View>
          ))}
          {restantes.length === 0 && (
            <View style={styles.ligne}>
              <View style={[styles.ligneIcone, { backgroundColor: `${colors.green}1F` }]}>
                <MaterialIcons name="check" size={19} color={colors.green} />
              </View>
              <Text style={[styles.ligneNom, { flex: 1 }]}>Journée complète</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }}>
            <Text style={[styles.mesureNom, { color: colors.textSub }]}>PROGRESSION DU JOUR</Text>
            <Text style={[styles.mesureNom, { color: colors.text }]}>{faits}/{habits.length}</Text>
          </View>
          <ProgressBar value={pctJour} color={colors.amber} />
        </View>
      </Card>

      <View style={{ height: 22 }} />

      {/* Trajectoire */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={[styles.mesureNom, { color: colors.textSub }]}>TRAJECTOIRE 7 JOURS</Text>
          <Pill color={progression >= 0 ? colors.green : colors.coral} teinte={colors.surface}>
            {progression >= 0 ? "+" : ""}{progression} PTS
          </Pill>
        </View>
        <Text style={styles.trajTitre}>Score {score}/100</Text>

        <View style={{ marginTop: 12 }}>
          <AreaChart valeurs={serie7} couleur={colors.amber} id="traj" />
          <View style={styles.trajLabels}>
            {["S-6", "S-5", "S-4", "S-3", "S-2", "Hier", "Auj."].map(l => (
              <Text key={l} style={styles.trajLabel}>{l}</Text>
            ))}
          </View>
        </View>

        <View style={styles.encart}>
          <MaterialIcons name="military-tech" size={22} color={colors.amber} />
          <View style={{ flex: 1 }}>
            <Text style={styles.encartNom}>
              {projection.rang ? `Prochain rang : ${projection.rang.label}` : "Rang maximal atteint"}
            </Text>
            <Text style={styles.encartSous}>
              {projection.rang == null
                ? "Tu es au sommet de l'échelle."
                : projection.jours != null
                  ? `Dans ${projection.jours} jours à ton rythme actuel`
                  : "Augmente ta régularité pour l'atteindre"}
            </Text>
          </View>
          {projection.rang && (
            <Pill teinte={colors.card} color={colors.textSub}>{projection.scoreRequis} REQUIS</Pill>
          )}
        </View>
      </Card>

      <RankSheet
        visible={echelleOuverte}
        onClose={() => setEchelleOuverte(false)}
        rangActuel={rang.label}
      />
    </ScrollView>
  );
}
