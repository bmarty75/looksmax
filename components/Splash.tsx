import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { Logo } from "./brand/Logo";

/**
 * Écran de chargement de l'app.
 *
 * Il remplace le losange « ◈ » hérité d'avant la refonte, qui n'appartenait
 * à aucune charte et s'affichait dans l'ancien doré. C'est le tout premier
 * écran que voit l'utilisateur : il porte la marque comme le reste.
 *
 * La barre est indéterminée à dessein — on ne sait pas combien de temps
 * prendra la lecture de la session ou la synchro, et une fausse progression
 * mentirait.
 */
export function Splash({ message }: { message?: string }) {
  const { colors } = useTheme();
  const respiration = useRef(new Animated.Value(0)).current;
  const balayage = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const boucle = Animated.parallel([
      // Respiration du logo : lente, pour ne pas donner l'impression d'un bug.
      Animated.loop(
        Animated.sequence([
          Animated.timing(respiration, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(respiration, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.timing(balayage, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ),
    ]);
    boucle.start();
    return () => boucle.stop();
  }, [respiration, balayage]);

  const echelle = respiration.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const opacite = respiration.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const glisse  = balayage.interpolate({ inputRange: [0, 1], outputRange: [-70, 140] });

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Animated.View style={{ transform: [{ scale: echelle }] }}>
        <Logo size={64} />
      </Animated.View>

      <Text style={s.marque}>
        <Text style={{ color: colors.text }}>DAILY</Text>
        <Text style={{ color: colors.amber }}>MAXING</Text>
      </Text>

      <View style={[s.piste, { backgroundColor: colors.surface }]}>
        <Animated.View
          style={[s.curseur, { backgroundColor: colors.amber, transform: [{ translateX: glisse }] }]}
        />
      </View>

      <Animated.Text style={[s.message, { color: colors.textMuted, opacity: message ? 1 : opacite }]}>
        {message ?? "CHARGEMENT"}
      </Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  marque:     { fontSize: 22, fontWeight: "800", letterSpacing: 2.2 },
  piste:      { width: 140, height: 3, borderRadius: 2, overflow: "hidden", marginTop: 6 },
  curseur:    { width: 70, height: 3, borderRadius: 2 },
  message:    { fontSize: 9.5, fontWeight: "700", letterSpacing: 2.4 },
});
