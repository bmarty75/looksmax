import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image, LayoutChangeEvent, PanResponder, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { ThemeColors, useTheme } from "../contexts/ThemeContext";
import { storage } from "../hooks/useStorage";
import { Photo, ecartEnJours, moyenneScore, photoDateKey } from "../lib/photos";

type Mode = "cote" | "curseur";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: c.bg },
    content:     { paddingHorizontal: 16, paddingBottom: 40 },
    header:      { paddingTop: 60, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 18 },
    backBtn:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.border2, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    headerSub:   { fontSize: 10, letterSpacing: 4, color: "#C9A96E", fontWeight: "700", marginBottom: 4 },
    headerTitle: { fontSize: 24, fontWeight: "800", color: c.text },

    modeRow:     { flexDirection: "row", gap: 8, marginBottom: 16 },
    modeBtn:     { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: c.border2, alignItems: "center" },
    modeBtnOn:   { borderColor: "#C9A96E55", backgroundColor: "#C9A96E11" },
    modeTxt:     { fontSize: 11, fontWeight: "700", color: c.textFaint, letterSpacing: 0.5 },
    modeTxtOn:   { color: "#C9A96E" },

    duo:         { flexDirection: "row", gap: 8, marginBottom: 14 },
    duoCol:      { flex: 1 },
    duoImg:      { width: "100%", aspectRatio: 0.8, borderRadius: 12, backgroundColor: c.surface },
    duoLabel:    { fontSize: 9, letterSpacing: 2, fontWeight: "700", marginTop: 6, textAlign: "center" },
    duoDate:     { fontSize: 11, color: c.textMuted, textAlign: "center", marginTop: 2 },

    wipeWrap:    { width: "100%", aspectRatio: 0.8, borderRadius: 12, overflow: "hidden", backgroundColor: c.surface, marginBottom: 14 },
    wipeImg:     { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    wipeClip:    { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
    wipeLine:    { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "#C9A96E" },
    wipeGrip:    { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: "#C9A96E", alignItems: "center", justifyContent: "center" },
    wipeTag:     { position: "absolute", top: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "#000a" },
    wipeTagTxt:  { fontSize: 9, letterSpacing: 1.5, fontWeight: "800", color: "#fff" },

    statsCard:   { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginBottom: 22 },
    stat:        { alignItems: "center" },
    statNum:     { fontSize: 20, fontWeight: "800" },
    statLabel:   { fontSize: 10, color: c.textFaint, marginTop: 4 },
    statDiv:     { width: 1, height: 32, backgroundColor: c.border },

    pickTitle:   { fontSize: 10, letterSpacing: 3, color: c.textFaint, fontWeight: "700", marginBottom: 10 },
    strip:       { flexDirection: "row", gap: 8, paddingBottom: 6 },
    thumb:       { width: 58, height: 74, borderRadius: 9, borderWidth: 2, borderColor: "transparent", overflow: "hidden", backgroundColor: c.surface },
    thumbImg:    { width: "100%", height: "100%" },
    thumbDate:   { fontSize: 8, color: c.textFaint, textAlign: "center", marginTop: 3 },

    empty:       { alignItems: "center", paddingTop: 70 },
    emptyTxt:    { color: c.textFaint, fontSize: 14, textAlign: "center", lineHeight: 22, marginTop: 14 },
  });
}

export default function CompareScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [history, setHistory] = useState<Record<string, number>>({});
  const [avantId, setAvantId] = useState<number | null>(null);
  const [apresId, setApresId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("cote");

  const [ratio, setRatio] = useState(0.5);
  const zone = useRef<View>(null);
  const largeur = useRef(0);
  const gauche = useRef(0);

  useEffect(() => {
    (async () => {
      const p: Photo[] = await storage.get("lm_photos", []);
      const h = await storage.get("lm_history", {});
      const liste = Array.isArray(p) ? p : [];
      setPhotos(liste);
      setHistory(h && typeof h === "object" ? h : {});
      // Par défaut : la plus ancienne face à la plus récente.
      if (liste.length >= 2) {
        setAvantId(liste[liste.length - 1].id);
        setApresId(liste[0].id);
      } else if (liste.length === 1) {
        setAvantId(liste[0].id);
        setApresId(liste[0].id);
      }
    })();
  }, []);

  /** x est une coordonnée absolue à l'écran ; on la ramène dans la zone. */
  const majRatio = (x: number) => {
    if (largeur.current <= 0 || !Number.isFinite(x)) return;
    setRatio(Math.max(0, Math.min(1, (x - gauche.current) / largeur.current)));
  };

  // On mesure la position à l'écran : locationX n'est pas fiable pour la
  // souris sur le web, alors que x0/moveX du geste sont absolus partout.
  // onLayout ne se déclenchant pas ici, la mesure est faite explicitement.
  const mesurer = () => {
    zone.current?.measureInWindow((x, _y, w) => {
      gauche.current = x;
      if (w > 0) largeur.current = w;
    });
  };

  // À l'affichage du curseur, puis à chaque prise en main (la page défile).
  useEffect(() => {
    if (mode !== "curseur") return;
    const t = setTimeout(mesurer, 60);
    return () => clearTimeout(t);
  }, [mode]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_e, g) => { mesurer(); majRatio(g.x0); },
      onPanResponderMove: (_e, g) => majRatio(g.moveX),
    }),
  ).current;

  const avant = photos.find(p => p.id === avantId) ?? null;
  const apres = photos.find(p => p.id === apresId) ?? null;

  const jours = avant && apres ? ecartEnJours(avant, apres) : null;
  const kAvant = avant ? photoDateKey(avant) : null;
  const kApres = apres ? photoDateKey(apres) : null;
  const scoreAvant = kAvant ? moyenneScore(history, kAvant, kAvant) : null;
  const scoreApres = kApres ? moyenneScore(history, kApres, kApres) : null;
  const joursActifs =
    kAvant && kApres
      ? Object.entries(history).filter(([k, v]) => k >= (kAvant < kApres ? kAvant : kApres) && k <= (kAvant < kApres ? kApres : kAvant) && v > 0).length
      : null;

  const onLayout = (e: LayoutChangeEvent) => {
    largeur.current = e.nativeEvent.layout.width;
    mesurer();
  };

  if (photos.length < 2) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={19} color={colors.textSub} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerSub}>LOOKSMAX OS</Text>
              <Text style={styles.headerTitle}>Comparer</Text>
            </View>
          </View>
          <View style={styles.empty}>
            <Text style={{ fontSize: 46 }}>📸</Text>
            <Text style={styles.emptyTxt}>
              Il faut au moins deux photos pour comparer.{"\n"}
              Ajoute-en depuis l'onglet Photos.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const bandeau = (titre: string, choisi: number | null, choisir: (id: number) => void, teinte: string) => (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.pickTitle}>{titre}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.strip}>
          {photos.map(p => (
            <TouchableOpacity key={p.id} onPress={() => choisir(p.id)}>
              <View style={[styles.thumb, choisi === p.id && { borderColor: teinte }]}>
                <Image source={{ uri: p.uri }} style={styles.thumbImg} />
              </View>
              <Text style={styles.thumbDate}>{p.date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={19} color={colors.textSub} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSub}>LOOKSMAX OS</Text>
            <Text style={styles.headerTitle}>Comparer</Text>
          </View>
        </View>

        <View style={styles.modeRow}>
          {([["cote", "Côte à côte"], ["curseur", "Curseur"]] as [Mode, string][]).map(([m, label]) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnOn]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeTxt, mode === m && styles.modeTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === "cote" ? (
          <View style={styles.duo}>
            <View style={styles.duoCol}>
              {avant && <Image source={{ uri: avant.uri }} style={styles.duoImg} resizeMode="cover" />}
              <Text style={[styles.duoLabel, { color: colors.textMuted }]}>AVANT</Text>
              <Text style={styles.duoDate}>{avant?.date ?? "—"}</Text>
            </View>
            <View style={styles.duoCol}>
              {apres && <Image source={{ uri: apres.uri }} style={styles.duoImg} resizeMode="cover" />}
              <Text style={[styles.duoLabel, { color: "#C9A96E" }]}>APRÈS</Text>
              <Text style={styles.duoDate}>{apres?.date ?? "—"}</Text>
            </View>
          </View>
        ) : (
          <View ref={zone} style={styles.wipeWrap} onLayout={onLayout} {...pan.panHandlers}>
            {avant && <Image source={{ uri: avant.uri }} style={styles.wipeImg} resizeMode="cover" />}
            <View style={[styles.wipeClip, { width: `${ratio * 100}%` }]}>
              {apres && (
                <Image
                  source={{ uri: apres.uri }}
                  style={[styles.wipeImg, { width: largeur.current || undefined }]}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={[styles.wipeLine, { left: `${ratio * 100}%` }]} pointerEvents="none" />
            <View
              style={[styles.wipeGrip, { left: `${ratio * 100}%`, marginLeft: -18, top: "50%", marginTop: -18 }]}
              pointerEvents="none"
            >
              <MaterialIcons name="code" size={18} color="#000" />
            </View>
            <View style={[styles.wipeTag, { left: 10 }]} pointerEvents="none">
              <Text style={styles.wipeTagTxt}>APRÈS</Text>
            </View>
            <View style={[styles.wipeTag, { right: 10 }]} pointerEvents="none">
              <Text style={styles.wipeTagTxt}>AVANT</Text>
            </View>
          </View>
        )}

        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: "#C9A96E" }]}>{jours ?? "—"}</Text>
            <Text style={styles.statLabel}>jours d'écart</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: "#7ECC8A" }]}>{joursActifs ?? "—"}</Text>
            <Text style={styles.statLabel}>jours actifs</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: "#7B9EE0" }]}>
              {scoreAvant != null && scoreApres != null
                ? `${scoreApres - scoreAvant >= 0 ? "+" : ""}${scoreApres - scoreAvant}`
                : "—"}
            </Text>
            <Text style={styles.statLabel}>score</Text>
          </View>
        </View>

        {bandeau("PHOTO AVANT", avantId, setAvantId, colors.textMuted)}
        {bandeau("PHOTO APRÈS", apresId, setApresId, "#C9A96E")}
      </ScrollView>
    </View>
  );
}
