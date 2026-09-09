import { useRef } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RANKS } from "../constants/data";
import { ThemeColors, useTheme } from "../contexts/ThemeContext";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    fond:      { flex: 1, backgroundColor: "#000B", justifyContent: "flex-end" },
    feuille:   { backgroundColor: c.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26, maxHeight: "82%" },
    poignee:   { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: c.border2, marginBottom: 14 },
    titre:     { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: c.textSub, textAlign: "center", marginBottom: 4 },
    sousTitre: { fontSize: 11, color: c.textMuted, textAlign: "center", marginBottom: 16, lineHeight: 16 },

    ligne:     { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 9, borderWidth: 1.5, borderColor: "transparent" },
    pastille:  { width: 12, height: 12, borderRadius: 6, marginRight: 13 },
    nom:       { fontSize: 15, fontWeight: "800" },
    toi:       { fontSize: 8.5, fontWeight: "800", letterSpacing: 0.8, color: "#101014", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 8, overflow: "hidden" },
    desc:      { fontSize: 11.5, color: c.textMuted, marginTop: 3 },
    exigences: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, color: c.textFaint, marginTop: 5 },
    droite:    { alignItems: "flex-end", marginLeft: 10 },
    psl:       { fontSize: 14, fontWeight: "800" },
    pop:       { fontSize: 9, fontWeight: "700", color: c.textFaint, marginTop: 3 },

    fermer:    { alignItems: "center", paddingVertical: 14, marginTop: 4 },
    fermerTxt: { fontSize: 13, fontWeight: "700", color: c.textSub },
  });
}

/** Tableau complet de l'échelle PSL, ouvert depuis la pastille de rang. */
export function RankSheet({
  visible, onClose, rangActuel,
}: { visible: boolean; onClose: () => void; rangActuel?: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const liste = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.feuille}>
          <View style={styles.poignee} />
          <Text style={styles.titre}>ÉCHELLE PSL</Text>
          <Text style={styles.sousTitre}>
            Le rang se gagne par la régularité : le score, et pour les paliers
            hauts un streak minimum.
          </Text>

          <ScrollView
            ref={liste}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Ouvre directement sur le rang courant.
              const y = rangActuel ? positions.current[rangActuel] : undefined;
              if (y != null) liste.current?.scrollTo({ y: Math.max(0, y - 60), animated: false });
            }}
          >
            {RANKS.map(r => {
              const actuel = r.label === rangActuel;
              const maxAffiche = r.max > 100 ? 100 : r.max - 1;
              return (
                <View
                  key={r.label}
                  onLayout={e => { positions.current[r.label] = e.nativeEvent.layout.y; }}
                  style={[styles.ligne, actuel && { borderColor: r.color, backgroundColor: `${r.color}14` }]}
                >
                  <View style={[styles.pastille, { backgroundColor: r.color }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={[styles.nom, { color: r.color }]}>{r.label}</Text>
                      {actuel && (
                        <Text style={[styles.toi, { backgroundColor: r.color }]}>TOI</Text>
                      )}
                    </View>
                    <Text style={styles.desc}>{r.desc}</Text>
                    <Text style={styles.exigences}>
                      SCORE {r.min === maxAffiche ? r.min : `${r.min}–${maxAffiche}`}
                      {r.streakReq > 0 ? ` · STREAK ${r.streakReq}J` : ""}
                    </Text>
                  </View>
                  <View style={styles.droite}>
                    <Text style={[styles.psl, { color: r.color }]}>{r.psl}</Text>
                    <Text style={styles.pop}>{r.pop}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.fermer} onPress={onClose}>
            <Text style={styles.fermerTxt}>Fermer</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
