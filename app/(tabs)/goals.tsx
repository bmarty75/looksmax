import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ScreenHeader } from "../../components/ScreenHeader";
import { AreaChart, BigButton, Card, MiniRing, Pill, ProgressBar, SectionTitle } from "../../components/ui";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { COLORS, ICONS } from "../../constants/data";
import { storage } from "../../hooks/useStorage";
import { rangCourant, serieScore } from "../../lib/metrics";
import { loadProfile } from "../../lib/profile";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: c.bg },
    content:     { paddingHorizontal: 16, paddingBottom: 30 },

    intro:       { fontSize: 9, fontWeight: "700", letterSpacing: 1.6, color: c.textFaint },
    titre:       { fontSize: 26, fontWeight: "800", color: c.text, lineHeight: 31, flex: 1, paddingRight: 12 },
    introRow:    { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 20 },

    cycleHaut:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    cycleGauche: { flexDirection: "row", alignItems: "center", gap: 7 },
    cycleNom:    { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: c.amber },
    cycleVal:    { fontSize: 11, fontWeight: "700", color: c.textSub },
    cycleBas:    { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    cycleTxt:    { fontSize: 11.5, color: c.textSub },
    cycleAcc:    { fontSize: 11.5, fontWeight: "800", color: c.green },

    carte:       { backgroundColor: c.card, borderRadius: 20, padding: 17, marginBottom: 12 },
    carteHaut:   { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    icone:       { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    nom:         { fontSize: 16, fontWeight: "800", color: c.text, lineHeight: 20 },
    sous:        { fontSize: 11, color: c.textMuted, marginTop: 3 },

    chiffres:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 10 },
    bloc:        { alignItems: "flex-start" },
    blocLabel:   { fontSize: 8.5, fontWeight: "700", letterSpacing: 1, color: c.textFaint },
    blocVal:     { fontSize: 22, fontWeight: "800", color: c.text, marginTop: 2 },
    reste:       { fontSize: 11, fontWeight: "700", color: c.green, textAlign: "center" },

    ajust:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, backgroundColor: c.surface, borderRadius: 13, padding: 9, paddingHorizontal: 13 },
    ajustTxt:    { fontSize: 11.5, color: c.textMuted },
    ajustBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    ajustVal:    { fontSize: 13, fontWeight: "800", color: c.text, minWidth: 62, textAlign: "center" },

    projTitre:   { fontSize: 13, fontWeight: "800", color: c.text },
    projSous:    { fontSize: 11, color: c.textMuted, marginTop: 3, lineHeight: 16 },
    encart:      { backgroundColor: c.surface, borderRadius: 14, padding: 14, flexDirection: "row", gap: 11, alignItems: "flex-start", marginTop: 14 },

    formCard:    { backgroundColor: c.card, borderRadius: 20, padding: 18, marginBottom: 16, gap: 13 },
    formTitre:   { fontSize: 14, fontWeight: "800", color: c.text },
    formLabel:   { fontSize: 9.5, fontWeight: "700", letterSpacing: 1.2, color: c.textFaint, minWidth: 56 },
    formRow:     { flexDirection: "row", gap: 10, alignItems: "center" },
    input:       { backgroundColor: c.input, borderRadius: 12, color: c.text, padding: 13, fontSize: 14 },
    chip:        { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: c.surface, marginRight: 8 },
    chipTxt:     { fontSize: 11, fontWeight: "700", color: c.textMuted },
    iconeChip:   { width: 44, height: 44, borderRadius: 13, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", marginRight: 8 },
    pastille:    { width: 24, height: 24, borderRadius: 12 },
    valider:     { backgroundColor: c.cream, borderRadius: 14, padding: 15, alignItems: "center" },
    validerTxt:  { color: "#101014", fontSize: 13, fontWeight: "800" },
  });
}

const UNITES = ["j", "kg", "%", "km", "rep", "h", "L"];

export default function Objectifs() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [goals, setGoals]           = useState<any[]>([]);
  const [history, setHistory]       = useState<Record<string, number>>({});
  const [avatar, setAvatar]         = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ label: "", target: "30", unit: "j", icon: "🎯", color: COLORS[5] });
  const [aSupprimer, setASupprimer] = useState<{ id: string; label: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Aucun objectif d'exemple : chacun crée les siens.
      storage.get("lm_goals", []).then(g => setGoals(Array.isArray(g) ? g : []));
      storage.get("lm_history", {}).then(h => setHistory(h && typeof h === "object" ? h : {}));
      loadProfile().then(p => setAvatar(p.avatar));
    }, []),
  );

  const enregistrer = async (liste: any[]) => {
    setGoals(liste);
    await storage.set("lm_goals", liste);
  };

  const creer = async () => {
    if (!form.label.trim()) return;
    const nouveau = { id: `g_${Date.now()}`, ...form, target: parseInt(form.target) || 30, progress: 0 };
    const s = await storage.get("lm_stats", { goalsCreated: 0 });
    await storage.set("lm_stats", { ...s, goalsCreated: (s.goalsCreated || 0) + 1 });
    await enregistrer([...goals, nouveau]);
    setForm({ label: "", target: "30", unit: "j", icon: "🎯", color: COLORS[5] });
    setShowForm(false);
  };

  const avancer = async (id: string, delta: number) => {
    await enregistrer(goals.map(g =>
      g.id === id ? { ...g, progress: Math.max(0, Math.min(g.target, g.progress + delta)) } : g,
    ));
  };

  const supprimer = async (id: string) => {
    await enregistrer(goals.filter(g => g.id !== id));
    setASupprimer(null);
  };

  const serie   = serieScore(history, 30);
  const actifs  = goals.filter(g => g.progress < g.target).length;
  const termine = goals.filter(g => g.progress >= g.target).length;

  // Discipline = moyenne de complétion sur les 30 derniers jours.
  const jours30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return history[d.toISOString().slice(0, 10)] || 0;
  });
  const discipline = Math.round(jours30.reduce((a, b) => a + b, 0) / 30);

  // Avancement global de tous les objectifs.
  const avancementGlobal = goals.length
    ? Math.round(goals.reduce((s, g) => s + Math.min(1, g.progress / (g.target || 1)), 0) / goals.length * 100)
    : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader section="Objectifs" avatar={avatar} rang={rangCourant(history)} />

      <Text style={styles.intro}>PERFORMANCE ENGINE</Text>
      <View style={styles.introRow}>
        <Text style={styles.titre}>Trajectoire &amp; Cibles</Text>
        <Pill color={colors.green} teinte={`${colors.green}1F`} dot>{discipline}% DISCIPLINE</Pill>
      </View>

      {/* Avancement global */}
      <Card style={{ marginBottom: 20 }}>
        <View style={styles.cycleHaut}>
          <View style={styles.cycleGauche}>
            <MaterialIcons name="donut-large" size={15} color={colors.amber} />
            <Text style={styles.cycleNom}>AVANCEMENT GLOBAL</Text>
          </View>
          <Text style={styles.cycleVal}>{termine} terminé{termine > 1 ? "s" : ""} / {goals.length}</Text>
        </View>
        <ProgressBar value={avancementGlobal} color={colors.amber} height={8} />
        <View style={styles.cycleBas}>
          <Text style={styles.cycleTxt}>{actifs} objectif{actifs > 1 ? "s" : ""} en cours</Text>
          <Text style={styles.cycleAcc}>{avancementGlobal}% accompli</Text>
        </View>
      </Card>

      <SectionTitle right={<Text style={{ color: colors.amber, fontSize: 10, fontWeight: "800" }}>⚡ {actifs} ACTIFS</Text>}>
        PROTOCOLES PRIORITAIRES
      </SectionTitle>

      {/* Formulaire */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitre}>Nouvel objectif</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ICONS.slice(0, 12).map(ic => (
              <TouchableOpacity
                key={ic}
                onPress={() => setForm(f => ({ ...f, icon: ic }))}
                style={[styles.iconeChip, form.icon === ic && { backgroundColor: `${colors.amber}26` }]}
              >
                <Text style={{ fontSize: 21 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder="Nom de l'objectif…"
            placeholderTextColor={colors.textFaint}
            value={form.label}
            onChangeText={t => setForm(f => ({ ...f, label: t }))}
          />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>CIBLE</Text>
            <TextInput
              style={[styles.input, { width: 84 }]}
              keyboardType="numeric"
              value={form.target}
              onChangeText={t => setForm(f => ({ ...f, target: t }))}
              placeholderTextColor={colors.textFaint}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {UNITES.map(u => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setForm(f => ({ ...f, unit: u }))}
                  style={[styles.chip, form.unit === u && { backgroundColor: `${colors.amber}26` }]}
                >
                  <Text style={[styles.chipTxt, form.unit === u && { color: colors.amber }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>COULEUR</Text>
            <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap", flex: 1 }}>
              {COLORS.map(col => (
                <TouchableOpacity
                  key={col}
                  onPress={() => setForm(f => ({ ...f, color: col }))}
                  style={[
                    styles.pastille,
                    { backgroundColor: col },
                    form.color === col && { borderWidth: 2.5, borderColor: colors.text },
                  ]}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.valider} onPress={creer}>
            <Text style={styles.validerTxt}>Créer l&apos;objectif</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Objectifs */}
      {goals.map(g => {
        const pct     = g.target > 0 ? Math.min(Math.round((g.progress / g.target) * 100), 100) : 0;
        const fini    = pct >= 100;
        const restant = Math.max(0, g.target - g.progress);
        return (
          <View key={g.id} style={styles.carte}>
            <View style={styles.carteHaut}>
              <View style={[styles.icone, { backgroundColor: `${g.color}1F` }]}>
                <Text style={{ fontSize: 20 }}>{g.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{g.label}</Text>
                <Text style={styles.sous}>{fini ? "Objectif atteint" : `${restant} ${g.unit} restants`}</Text>
              </View>
              {fini
                ? <Pill color={colors.green} teinte={`${colors.green}1F`}>TERMINÉ</Pill>
                : <MiniRing valeur={pct} couleur={g.color} taille={46} />}
              <TouchableOpacity
                style={{ paddingLeft: 6, paddingTop: 4 }}
                onPress={() => setASupprimer({ id: g.id, label: g.label })}
              >
                <MaterialIcons name="delete-outline" size={18} color={colors.textFaint} />
              </TouchableOpacity>
            </View>

            <View style={styles.chiffres}>
              <View style={styles.bloc}>
                <Text style={styles.blocLabel}>ACTUEL</Text>
                <Text style={styles.blocVal}>{g.progress}{g.unit}</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <MaterialIcons name="arrow-forward" size={15} color={colors.green} />
                <Text style={styles.reste}>{restant} {g.unit}</Text>
              </View>
              <View style={[styles.bloc, { alignItems: "flex-end" }]}>
                <Text style={styles.blocLabel}>CIBLE</Text>
                <Text style={[styles.blocVal, { color: colors.amber }]}>{g.target}{g.unit}</Text>
              </View>
            </View>

            <ProgressBar value={pct} color={fini ? colors.green : g.color} height={8} />

            <View style={styles.ajust}>
              <Text style={styles.ajustTxt}>Ajustement</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity style={styles.ajustBtn} onPress={() => avancer(g.id, -1)}>
                  <MaterialIcons name="remove" size={17} color={colors.textSub} />
                </TouchableOpacity>
                <Text style={styles.ajustVal}>{g.progress} {g.unit}</Text>
                <TouchableOpacity
                  style={[styles.ajustBtn, { backgroundColor: `${g.color}2E` }]}
                  onPress={() => avancer(g.id, 1)}
                >
                  <MaterialIcons name="add" size={17} color={g.color} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      {goals.length === 0 && !showForm && (
        <Card style={{ alignItems: "center", paddingVertical: 34, marginBottom: 12 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
            Aucun objectif.{"\n"}Crée ton premier protocole.
          </Text>
        </Card>
      )}

      {/* Trajectoire réelle, sur 30 jours */}
      <View style={{ height: 10 }} />
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <MaterialIcons name="auto-graph" size={15} color={colors.amber} />
            <Text style={styles.cycleNom}>TRAJECTOIRE 30 JOURS</Text>
          </View>
          <Pill color={colors.green} teinte={colors.surface}>RÉEL</Pill>
        </View>

        <AreaChart valeurs={serie} couleur={colors.amber} id="obj" hauteur={100} />

        <View style={styles.encart}>
          <MaterialIcons name="verified" size={19} color={colors.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.projTitre}>Discipline sur 30 jours : {discipline}%</Text>
            <Text style={styles.projSous}>
              Calculé sur tes routines réellement cochées, sans estimation.
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ height: 16 }} />
      <BigButton
        label={showForm ? "ANNULER" : "NOUVEL OBJECTIF"}
        onPress={() => setShowForm(v => !v)}
        icone={<MaterialIcons name={showForm ? "close" : "add"} size={19} color="#101014" />}
      />

      <ConfirmDialog
        visible={!!aSupprimer}
        title="Supprimer cet objectif ?"
        message={aSupprimer ? `« ${aSupprimer.label} » et sa progression seront définitivement supprimés.` : ""}
        onCancel={() => setASupprimer(null)}
        onConfirm={() => aSupprimer && supprimer(aSupprimer.id)}
      />
    </ScrollView>
  );
}
