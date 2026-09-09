import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "../contexts/ThemeContext";
import { Logo } from "./brand/Logo";
import { RankSheet } from "./RankSheet";

/**
 * En dessous de cette largeur, le mot « LOOKSMAX » est retiré : le logo suffit
 * à identifier l'app, et mieux vaut le masquer que le laisser tronquer quand un
 * rang au nom long occupe la droite.
 */
const LARGEUR_MIN_MARQUE = 385;

/**
 * En-tête présent sur les quatre onglets : logo + nom de section à gauche,
 * rang looksmaxing et accès au profil à droite.
 */
export function ScreenHeader({
  section, avatar, rang,
}: {
  section: string;
  avatar?: string | null;
  /** Rang PSL courant, affiché en pastille à sa couleur. */
  rang?: { label: string; color: string };
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const marqueVisible = width >= LARGEUR_MIN_MARQUE;
  const [echelleOuverte, setEchelleOuverte] = useState(false);

  return (
    <View style={s.wrap}>
      <View style={s.gauche}>
        <Logo size={30} />
        <View style={{ flexShrink: 1 }}>
          {marqueVisible && (
            <Text style={[s.marque, { color: colors.text }]} numberOfLines={1}>LOOKSMAX</Text>
          )}
          <Text
            style={[
              s.section,
              marqueVisible
                ? { color: colors.textMuted }
                : { color: colors.text, fontSize: 12, letterSpacing: 1.4 },
            ]}
            numberOfLines={1}
          >
            {section.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={s.droite}>
        {rang && (
          <TouchableOpacity
            style={[s.pastille, { backgroundColor: `${rang.color}26` }]}
            onPress={() => setEchelleOuverte(true)}
            accessibilityLabel="Voir l'échelle des rangs"
          >
            <View style={[s.point, { backgroundColor: rang.color }]} />
            <Text style={[s.pastilleTxt, { color: rang.color }]} numberOfLines={1}>
              {rang.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.avatar, { backgroundColor: colors.cream }]}
          onPress={() => router.push("/profile")}
        >
          {avatar
            ? <Image source={{ uri: avatar }} style={s.avatarImg} />
            : <MaterialIcons name="person" size={19} color="#101014" />}
        </TouchableOpacity>
      </View>

      <RankSheet
        visible={echelleOuverte}
        onClose={() => setEchelleOuverte(false)}
        rangActuel={rang?.label}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 56, paddingBottom: 18, gap: 10 },
  gauche:      { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  marque:      { fontSize: 15, fontWeight: "800", letterSpacing: 0.6 },
  section:     { fontSize: 9, fontWeight: "700", letterSpacing: 2, marginTop: 1 },
  droite:      { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  pastille:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 },
  point:       { width: 6, height: 6, borderRadius: 3 },
  pastilleTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  avatar:      { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg:   { width: "100%", height: "100%" },
});
