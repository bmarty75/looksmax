import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "../../contexts/ThemeContext";

/* ─── Carte ───────────────────────────────────────────────── */

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: 20, padding: 18 }, style]}>
      {children}
    </View>
  );
}

/* ─── Titre de section ────────────────────────────────────── */

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={ui.sectionRow}>
      <Text style={[ui.sectionTitle, { color: colors.textSub }]}>{children}</Text>
      {right}
    </View>
  );
}

/* ─── Pastille ────────────────────────────────────────────── */

export function Pill({
  children, color, teinte, dot, style,
}: {
  children: ReactNode;
  /** Couleur du texte (et du point). */
  color?: string;
  /** Fond ; par défaut la surface du thème. */
  teinte?: string;
  dot?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.textSub;
  return (
    <View style={[ui.pill, { backgroundColor: teinte ?? colors.surface }, style]}>
      {dot && <View style={[ui.pillDot, { backgroundColor: c }]} />}
      <Text style={[ui.pillText, { color: c }]}>{children}</Text>
    </View>
  );
}

/* ─── Barre de progression ────────────────────────────────── */

export function ProgressBar({
  value, color, height = 6, track,
}: { value: number; color: string; height?: number; track?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? colors.surface, overflow: "hidden" }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Barre découpée en segments : un par élément à accomplir. */
export function SegmentBar({
  total, done, color, pending, height = 7,
}: { total: number; done: number; color: string; pending?: string; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: Math.max(total, 1) }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: height / 2,
            backgroundColor: i < done ? color : (pending ?? colors.surface),
          }}
        />
      ))}
    </View>
  );
}

/* ─── Anneaux concentriques ───────────────────────────────── */

export interface Anneau { valeur: number; couleur: string }

/**
 * Anneaux de progression imbriqués, façon compteur d'activité.
 * `valeurs[0]` est l'anneau extérieur.
 */
export function Rings({
  valeurs, taille = 234, epaisseur = 11, ecart = 5, enfant,
}: {
  valeurs: Anneau[];
  taille?: number;
  epaisseur?: number;
  ecart?: number;
  enfant?: ReactNode;
}) {
  const { colors } = useTheme();
  const centre = taille / 2;

  // Espace libre au centre, une fois les anneaux déduits : le contenu doit y
  // tenir sans venir mordre sur le tracé le plus intérieur.
  const rayonLibre = centre - epaisseur - (valeurs.length - 1) * (epaisseur + ecart);
  const largeurContenu = Math.max(0, rayonLibre * 2 * 0.92);

  return (
    <View style={{ width: taille, height: taille, alignItems: "center", justifyContent: "center" }}>
      <Svg width={taille} height={taille} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        {/* Pistes de fond : un cercle complet, sans découpe. */}
        {valeurs.map((_, i) => {
          const r = centre - epaisseur / 2 - i * (epaisseur + ecart);
          return (
            <Circle
              key={`piste-${i}`}
              cx={centre} cy={centre} r={r}
              stroke={colors.surface}
              strokeWidth={epaisseur}
              fill="none"
            />
          );
        })}
        {valeurs.map((a, i) => {
          const r = centre - epaisseur / 2 - i * (epaisseur + ecart);
          const circonference = 2 * Math.PI * r;
          const reste = circonference - (Math.max(0, Math.min(100, a.valeur)) / 100) * circonference;
          return (
            <Circle
              key={`arc-${i}`}
              cx={centre} cy={centre} r={r}
              stroke={a.couleur}
              strokeWidth={epaisseur}
              strokeDasharray={circonference}
              strokeDashoffset={reste}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </Svg>
      <View style={{ alignItems: "center", width: largeurContenu }}>{enfant}</View>
    </View>
  );
}

/** Petit anneau unique avec le pourcentage au centre. */
export function MiniRing({
  valeur, couleur, taille = 54, epaisseur = 5,
}: { valeur: number; couleur: string; taille?: number; epaisseur?: number }) {
  const { colors } = useTheme();
  const centre = taille / 2;
  const r = centre - epaisseur / 2;
  const circonference = 2 * Math.PI * r;
  const reste = circonference - (Math.max(0, Math.min(100, valeur)) / 100) * circonference;
  return (
    <View style={{ width: taille, height: taille, alignItems: "center", justifyContent: "center" }}>
      <Svg width={taille} height={taille} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={centre} cy={centre} r={r} stroke={colors.surface} strokeWidth={epaisseur} fill="none" />
        <Circle
          cx={centre} cy={centre} r={r}
          stroke={couleur} strokeWidth={epaisseur}
          strokeDasharray={circonference} strokeDashoffset={reste}
          strokeLinecap="round" fill="none"
        />
      </Svg>
      <Text style={{ fontSize: taille * 0.28, fontWeight: "800", color: couleur }}>
        {Math.round(valeur)}%
      </Text>
    </View>
  );
}

/* ─── Courbes ─────────────────────────────────────────────── */

function cheminLisse(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cx = (p.x + c.x) / 2;
    d += ` C ${cx} ${p.y}, ${cx} ${c.y}, ${c.x} ${c.y}`;
  }
  return d;
}

/** Micro-courbe sans axes, pour les cartes de mesure. */
export function Sparkline({
  valeurs, couleur, largeur = 96, hauteur = 30,
}: { valeurs: number[]; couleur: string; largeur?: number; hauteur?: number }) {
  if (valeurs.length < 2) return <View style={{ height: hauteur }} />;
  const min = Math.min(...valeurs), max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const pts = valeurs.map((v, i) => ({
    x: (i / (valeurs.length - 1)) * largeur,
    y: hauteur - 3 - ((v - min) / amplitude) * (hauteur - 6),
  }));
  return (
    <Svg width="100%" height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`}>
      <Path d={cheminLisse(pts)} stroke={couleur} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Courbe pleine avec dégradé sous la ligne. */
export function AreaChart({
  valeurs, couleur, hauteur = 110, id = "aire", cible,
}: { valeurs: number[]; couleur: string; hauteur?: number; id?: string; cible?: number }) {
  const L = 300;
  if (valeurs.length < 2) return <View style={{ height: hauteur }} />;
  const min = Math.min(...valeurs, cible ?? Infinity);
  const max = Math.max(...valeurs, cible ?? -Infinity);
  const amplitude = max - min || 1;
  const y = (v: number) => hauteur - 8 - ((v - min) / amplitude) * (hauteur - 20);
  const pts = valeurs.map((v, i) => ({ x: (i / (valeurs.length - 1)) * L, y: y(v) }));
  const ligne = cheminLisse(pts);

  return (
    <Svg width="100%" height={hauteur} viewBox={`0 0 ${L} ${hauteur}`}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={couleur} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={couleur} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {cible != null && (
        <Path
          d={`M 0 ${y(cible)} L ${L} ${y(cible)}`}
          stroke={couleur}
          strokeWidth={1}
          strokeDasharray="5 5"
          opacity={0.5}
          fill="none"
        />
      )}
      <Path d={`${ligne} L ${L} ${hauteur} L 0 ${hauteur} Z`} fill={`url(#${id})`} />
      <Path d={ligne} stroke={couleur} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={couleur} />
    </Svg>
  );
}

/* ─── Boutons ─────────────────────────────────────────────── */

export function BigButton({
  label, onPress, icone,
}: { label: string; onPress: () => void; icone?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[ui.bigBtn, { backgroundColor: colors.cream }]} onPress={onPress}>
      {icone}
      <Text style={ui.bigBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const ui = StyleSheet.create({
  sectionRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },
  pill:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillDot:      { width: 6, height: 6, borderRadius: 3 },
  pillText:     { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  bigBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, paddingVertical: 17 },
  bigBtnText:   { color: "#101014", fontSize: 14, fontWeight: "800", letterSpacing: 0.8 },
});
