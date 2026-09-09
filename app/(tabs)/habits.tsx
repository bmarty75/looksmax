import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList, Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ScreenHeader } from "../../components/ScreenHeader";
import { BigButton, Card, Pill, SegmentBar } from "../../components/ui";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { CATEGORIES, COLORS, DEFAULT_HABITS, ICONS, todayKey } from "../../constants/data";
import { storage } from "../../hooks/useStorage";
import { computeCurrentStreak, rangCourant } from "../../lib/metrics";
import { loadProfile } from "../../lib/profile";

const MOIS_COURTS = ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"];

function decalerJour(cle: string, delta: number): string {
  const d = new Date(cle);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function libelleJour(cle: string): string {
  if (cle === todayKey()) return "Aujourd'hui";
  if (cle === decalerJour(todayKey(), -1)) return "Hier";
  const d = new Date(cle);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MOIS_COURTS[d.getUTCMonth()]}`;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:         { flex: 1, backgroundColor: c.bg },
    content:      { paddingHorizontal: 16, paddingBottom: 30 },

    statutHaut:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    compteur:     { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 14 },
    compteurGros: { fontSize: 34, fontWeight: "800", color: c.text, lineHeight: 36 },
    compteurBas:  { fontSize: 14, color: c.textSub, fontWeight: "600", marginBottom: 4 },
    statutBas:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
    statutNote:   { fontSize: 11, color: c.textMuted },
    statutGain:   { fontSize: 11, fontWeight: "800", color: c.amber },

    dateNav:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 16 },
    navBtn:       { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    dateLabel:    { fontSize: 14, fontWeight: "800", color: c.text },
    dateSous:     { fontSize: 8.5, fontWeight: "700", letterSpacing: 1.4, color: c.textFaint, marginTop: 2, textAlign: "center" },

    filtreRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
    filtres:      { flexDirection: "row", gap: 8, paddingBottom: 4 },
    ajoutRapide:  { width: 40, height: 40, borderRadius: 20, backgroundColor: c.cream, alignItems: "center", justifyContent: "center" },
    filtre:       { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: c.card },
    filtreTxt:    { fontSize: 12, fontWeight: "700", color: c.textSub },

    carte:        { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: c.card, borderRadius: 18, padding: 14, marginBottom: 10 },
    icone:        { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    categorie:    { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
    duree:        { fontSize: 9, fontWeight: "700", color: c.textMuted },
    titre:        { fontSize: 15, fontWeight: "700", color: c.text, marginTop: 3 },
    sous:         { fontSize: 11.5, color: c.textMuted, marginTop: 2 },
    coche:        { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
    supprimer:    { paddingLeft: 4, paddingVertical: 8 },

    formCard:     { backgroundColor: c.card, borderRadius: 20, padding: 18, marginBottom: 16, gap: 13 },
    formTitre:    { fontSize: 14, fontWeight: "800", color: c.text },
    formLabel:    { fontSize: 9.5, fontWeight: "700", letterSpacing: 1.2, color: c.textFaint, minWidth: 66 },
    formRow:      { flexDirection: "row", gap: 10, alignItems: "center" },
    input:        { backgroundColor: c.input, borderRadius: 12, color: c.text, padding: 13, fontSize: 14 },
    iconePick:    { width: 50, height: 50, borderRadius: 14, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
    chip:         { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: c.surface, marginRight: 8 },
    chipTxt:      { fontSize: 11, fontWeight: "700", color: c.textMuted },
    pastille:     { width: 24, height: 24, borderRadius: 12 },
    valider:      { backgroundColor: c.cream, borderRadius: 14, padding: 15, alignItems: "center" },
    validerTxt:   { color: "#101014", fontSize: 13, fontWeight: "800" },

    modalFond:    { flex: 1, backgroundColor: "#000c", justifyContent: "flex-end" },
    modalCarte:   { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: 420 },
    modalTitre:   { fontSize: 11, letterSpacing: 2, fontWeight: "700", color: c.textSub, textAlign: "center", marginBottom: 16 },
    cellule:      { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  });
}

export default function Routines() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [habits, setHabits]         = useState<any[]>([]);
  const [checked, setChecked]       = useState<Record<string, boolean>>({});
  const [history, setHistory]       = useState<Record<string, number>>({});
  const [avatar, setAvatar]         = useState<string | null>(null);
  const [jour, setJour]             = useState(todayKey());
  const [filtre, setFiltre]         = useState<string>("tous");
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ label: "", icon: "🎯", category: "custom", color: COLORS[0] });
  const [editId, setEditId]         = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [aSupprimer, setASupprimer] = useState<{ id: string; label: string } | null>(null);
  const [tactile, setTactile]       = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      setTactile(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      storage.get("lm_habits", DEFAULT_HABITS).then(h => setHabits(Array.isArray(h) ? h : DEFAULT_HABITS));
      storage.get("lm_history", {}).then(h => setHistory(h && typeof h === "object" ? h : {}));
      loadProfile().then(p => setAvatar(p.avatar));
    }, []),
  );

  useEffect(() => {
    storage.get(`lm_checked_${jour}`, {}).then(c => setChecked(c && typeof c === "object" ? c : {}));
  }, [jour]);

  const enregistrer = async (liste: any[]) => {
    setHabits(liste);
    await storage.set("lm_habits", liste);
  };

  const basculer = async (id: string) => {
    const suivant = { ...checked, [id]: !checked[id] };
    setChecked(suivant);
    await storage.set(`lm_checked_${jour}`, suivant);

    const faits = Object.values(suivant).filter(Boolean).length;
    const pct = habits.length > 0 ? Math.round((faits / habits.length) * 100) : 0;
    const hist = await storage.get("lm_history", {});
    const maj = { ...hist, [jour]: pct };
    await storage.set("lm_history", maj);
    setHistory(maj);

    if (id === "water") {
      const s = await storage.get("lm_stats", { waterCount: 0 });
      const delta = suivant[id] ? 1 : -1;
      await storage.set("lm_stats", { ...s, waterCount: Math.max(0, (s.waterCount || 0) + delta) });
    }
  };

  const reinitForm = () => {
    setForm({ label: "", icon: "🎯", category: "custom", color: COLORS[0] });
    setEditId(null);
    setShowForm(false);
  };

  const ouvrirCreation = () => {
    if (showForm) { reinitForm(); return; }
    setForm({ label: "", icon: "🎯", category: "custom", color: COLORS[0] });
    setEditId(null);
    setShowForm(true);
  };

  const ouvrirEdition = (h: any) => {
    setForm({ label: h.label, icon: h.icon, category: h.category, color: h.color });
    setEditId(h.id);
    setShowForm(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const valider = async () => {
    if (!form.label.trim()) return;
    if (editId) await enregistrer(habits.map(h => (h.id === editId ? { ...h, ...form } : h)));
    else await enregistrer([...habits, { id: `h_${Date.now()}`, ...form }]);
    reinitForm();
  };

  const supprimer = async (id: string) => {
    await enregistrer(habits.filter(h => h.id !== id));
    setASupprimer(null);
  };

  const faits      = Object.values(checked).filter(Boolean).length;
  const pct        = habits.length > 0 ? Math.round((faits / habits.length) * 100) : 0;
  const streak     = computeCurrentStreak(history);
  const categories = [...new Set(habits.map(h => h.category))];
  const visibles   = filtre === "tous" ? habits : habits.filter(h => h.category === filtre);
  const cejour     = jour === todayKey();

  return (
    <ScrollView ref={scrollRef} style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader section="Routines" avatar={avatar} rang={rangCourant(history)} />

      {/* Statut du jour */}
      <Card>
        <View style={styles.statutHaut}>
          <Pill color={pct > 0 ? colors.green : colors.textMuted} teinte={colors.surface} dot>
            {pct > 0 ? "STATUT ACTIF" : "EN ATTENTE"}
          </Pill>
          <Pill color={colors.amber} teinte={colors.surface}>{streak}J STREAK 🔥</Pill>
        </View>

        <View style={styles.compteur}>
          <Text style={styles.compteurGros}>{faits}</Text>
          <Text style={styles.compteurBas}>/ {habits.length} complétées</Text>
          <View style={{ flex: 1 }} />
          <Pill color={colors.green} teinte={`${colors.green}1F`}>{pct}% COMPLÉTÉ</Pill>
        </View>

        <SegmentBar total={habits.length} done={faits} color={colors.green} />

        <View style={styles.statutBas}>
          <Text style={styles.statutNote}>
            {cejour ? "Journée en cours" : `Journée du ${libelleJour(jour)}`}
          </Text>
          <Text style={styles.statutGain}>{habits.length - faits} restantes</Text>
        </View>
      </Card>

      {/* Navigation par jour */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setJour(j => decalerJour(j, -1))}>
          <MaterialIcons name="chevron-left" size={22} color={colors.textSub} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.dateLabel, !cejour && { color: colors.amber }]}>{libelleJour(jour)}</Text>
          {!cejour && <Text style={styles.dateSous}>MODIFIER CE JOUR</Text>}
        </View>
        <TouchableOpacity
          style={[styles.navBtn, cejour && { opacity: 0.3 }]}
          disabled={cejour}
          onPress={() => setJour(j => (j === todayKey() ? j : decalerJour(j, 1)))}
        >
          <MaterialIcons name="chevron-right" size={22} color={colors.textSub} />
        </TouchableOpacity>
      </View>

      {/* Filtres par catégorie, avec l'ajout rapide toujours visible à droite */}
      <View style={styles.filtreRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.filtres}>
          <TouchableOpacity
            style={[styles.filtre, filtre === "tous" && { backgroundColor: colors.surface }]}
            onPress={() => setFiltre("tous")}
          >
            {filtre === "tous" && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green }} />}
            <Text style={[styles.filtreTxt, filtre === "tous" && { color: colors.text }]}>
              Tous ({habits.length})
            </Text>
          </TouchableOpacity>
          {categories.map(cat => {
            const n = habits.filter(h => h.category === cat).length;
            const actif = filtre === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filtre, actif && { backgroundColor: colors.surface }]}
                onPress={() => setFiltre(cat)}
              >
                {actif && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green }} />}
                <Text style={[styles.filtreTxt, actif && { color: colors.text }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)} ({n})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
        <TouchableOpacity
          style={styles.ajoutRapide}
          onPress={ouvrirCreation}
          accessibilityLabel={showForm ? "Fermer le formulaire" : "Ajouter une routine"}
        >
          <MaterialIcons name={showForm ? "close" : "add"} size={22} color="#101014" />
        </TouchableOpacity>
      </View>

      {/* Formulaire */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitre}>{editId ? "Modifier la routine" : "Nouvelle routine"}</Text>
          <View style={styles.formRow}>
            <TouchableOpacity style={styles.iconePick} onPress={() => setPickerOpen(true)}>
              <Text style={{ fontSize: 23 }}>{form.icon}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Nom de la routine…"
              placeholderTextColor={colors.textFaint}
              value={form.label}
              onChangeText={t => setForm(f => ({ ...f, label: t }))}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>CATÉGORIE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setForm(f => ({ ...f, category: cat }))}
                  style={[styles.chip, form.category === cat && { backgroundColor: `${colors.amber}26` }]}
                >
                  <Text style={[styles.chipTxt, form.category === cat && { color: colors.amber }]}>{cat}</Text>
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

          <TouchableOpacity style={styles.valider} onPress={valider}>
            <Text style={styles.validerTxt}>{editId ? "Enregistrer" : "Créer la routine"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste */}
      {visibles.map(h => {
        const coche = !!checked[h.id];
        return (
          <View
            key={h.id}
            style={styles.carte}
            {...(Platform.OS === "web" && !tactile
              ? { onContextMenu: (e: any) => { e.preventDefault(); ouvrirEdition(h); } }
              : {})}
          >
            <View style={[styles.icone, { backgroundColor: `${h.color}1F` }]}>
              <Text style={{ fontSize: 20 }}>{h.icon}</Text>
            </View>

            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => basculer(h.id)}
              onLongPress={Platform.OS === "web" && !tactile ? undefined : () => ouvrirEdition(h)}
              delayLongPress={400}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.categorie, { color: h.color }]}>
                  {(h.category ?? "").toUpperCase()}
                </Text>
                <Text style={styles.duree}>•</Text>
                <Text style={styles.duree}>{coche ? "Complétée" : "À faire"}</Text>
              </View>
              <Text style={styles.titre} numberOfLines={1}>{h.label}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => basculer(h.id)}>
              <View style={[
                styles.coche,
                coche
                  ? { backgroundColor: colors.green, borderColor: colors.green }
                  : { borderColor: colors.border2 },
              ]}>
                {coche && <MaterialIcons name="check" size={22} color="#101014" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supprimer} onPress={() => setASupprimer({ id: h.id, label: h.label })}>
              <MaterialIcons name="delete-outline" size={19} color={colors.textFaint} />
            </TouchableOpacity>
          </View>
        );
      })}

      {visibles.length === 0 && (
        <Card style={{ alignItems: "center", paddingVertical: 34 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
            Aucune routine dans cette catégorie.
          </Text>
        </Card>
      )}

      <View style={{ height: 10 }} />
      <BigButton
        label={showForm ? "ANNULER" : "AJOUTER UNE ROUTINE"}
        onPress={ouvrirCreation}
        icone={<MaterialIcons name={showForm ? "close" : "add"} size={19} color="#101014" />}
      />

      {/* Sélecteur d'icône */}
      <Modal visible={pickerOpen} transparent animationType="slide">
        <TouchableOpacity style={styles.modalFond} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalCarte}>
            <Text style={styles.modalTitre}>CHOISIS UNE ICÔNE</Text>
            <FlatList
              data={ICONS}
              numColumns={5}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cellule}
                  onPress={() => { setForm(f => ({ ...f, icon: item })); setPickerOpen(false); }}
                >
                  <Text style={{ fontSize: 27 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={!!aSupprimer}
        title="Supprimer cette routine ?"
        message={aSupprimer ? `« ${aSupprimer.label} » et son historique de suivi seront définitivement supprimés.` : ""}
        onCancel={() => setASupprimer(null)}
        onConfirm={() => aSupprimer && supprimer(aSupprimer.id)}
      />
    </ScrollView>
  );
}
