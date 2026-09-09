import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card, Pill, ProgressBar, Rings, SectionTitle } from "../../components/ui";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { initiales } from "../../lib/profile";
import { ProfilPublic, StatsPartagees, chargerProfilAmi } from "../../lib/social";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:       { flex: 1, backgroundColor: c.bg },
    content:    { paddingHorizontal: 16, paddingBottom: 40 },
    header:     { paddingTop: 56, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
    retour:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.card },

    entete:     { alignItems: "center", paddingVertical: 22 },
    avatar:     { width: 92, height: 92, borderRadius: 46, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 2, borderColor: c.amber },
    avatarImg:  { width: "100%", height: "100%" },
    initiales:  { fontSize: 30, fontWeight: "800", color: c.amber },
    pseudo:     { fontSize: 22, fontWeight: "800", color: c.text, marginTop: 14 },
    bio:        { fontSize: 13, color: c.textMuted, textAlign: "center", marginTop: 8, lineHeight: 19, paddingHorizontal: 10 },

    ringWrap:   { alignItems: "center", paddingVertical: 18 },
    psl:        { fontSize: 36, fontWeight: "800", color: c.text, lineHeight: 40 },
    pslLabel:   { fontSize: 8.5, fontWeight: "700", color: c.textMuted, letterSpacing: 2.2, marginTop: 2 },
    legende:    { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border },
    legItem:    { alignItems: "center", gap: 4 },
    legHaut:    { flexDirection: "row", alignItems: "center", gap: 5 },
    legPoint:   { width: 7, height: 7, borderRadius: 4 },
    legNom:     { fontSize: 9, fontWeight: "700", color: c.textMuted, letterSpacing: 0.7 },
    legVal:     { fontSize: 16, fontWeight: "800", color: c.text },

    chiffres:   { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
    chiffre:    { alignItems: "center" },
    chiffreVal: { fontSize: 21, fontWeight: "800" },
    chiffreNom: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, color: c.textMuted, marginTop: 4 },
    sep:        { width: 1, height: 30, backgroundColor: c.border },

    item:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, borderRadius: 16, padding: 13, marginBottom: 9 },
    itemIcone:  { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    itemNom:    { fontSize: 14, fontWeight: "700", color: c.text },
    itemSous:   { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, marginTop: 3 },

    duo:        { flexDirection: "row", gap: 10 },
    duoCol:     { flex: 1 },
    duoImg:     { width: "100%", aspectRatio: 0.8, borderRadius: 14, backgroundColor: c.surface },
    duoLabel:   { fontSize: 9, letterSpacing: 1.6, fontWeight: "700", marginTop: 7, textAlign: "center" },
    duoDate:    { fontSize: 11, color: c.textMuted, textAlign: "center", marginTop: 2 },

    prive:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.card, borderRadius: 16, padding: 15, marginBottom: 22 },
    priveTxt:   { fontSize: 12.5, color: c.textMuted, flex: 1, lineHeight: 18 },

    vide:       { alignItems: "center", paddingTop: 80 },
    videTxt:    { color: c.textMuted, fontSize: 13.5, textAlign: "center", lineHeight: 21, marginTop: 14 },
  });
}

/** Bloc affiché quand l'ami n'a pas activé le partage d'une rubrique. */
function NonPartage({ texte }: { texte: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.prive}>
      <MaterialIcons name="lock-outline" size={19} color={colors.textFaint} />
      <Text style={styles.priveTxt}>{texte}</Text>
    </View>
  );
}

export default function ProfilAmi() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profil, setProfil] = useState<ProfilPublic | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!id) return;
    chargerProfilAmi(id).then(p => {
      setProfil(p);
      setChargement(false);
    });
  }, [id]);

  const entete = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.retour} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={19} color={colors.textSub} />
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>Profil</Text>
    </View>
  );

  if (chargement) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.amber, fontSize: 30 }}>◈</Text>
      </View>
    );
  }

  if (!profil) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {entete}
        <View style={styles.vide}>
          <MaterialIcons name="person-off" size={40} color={colors.textFaint} />
          <Text style={styles.videTxt}>
            Profil inaccessible.{"\n"}Il faut être amis pour le consulter.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const stats = profil.stats as StatsPartagees;
  const aDesStats = stats && typeof stats.psl === "number";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {entete}

      {/* Identité */}
      <View style={styles.entete}>
        <View style={styles.avatar}>
          {profil.avatar
            ? <Image source={{ uri: profil.avatar }} style={styles.avatarImg} />
            : <Text style={styles.initiales}>{initiales(profil.pseudo, null)}</Text>}
        </View>
        <Text style={styles.pseudo}>{profil.pseudo || "Sans pseudo"}</Text>
        {aDesStats && (
          <Pill color={stats.couleurRang} teinte={`${stats.couleurRang}22`} dot style={{ marginTop: 10 }}>
            {stats.rang.toUpperCase()}
          </Pill>
        )}
        {!!profil.bio && <Text style={styles.bio}>{profil.bio}</Text>}
      </View>

      {/* Régularité */}
      {aDesStats ? (
        <>
          <Card style={styles.ringWrap}>
            <Rings
              taille={190}
              valeurs={(stats.categories ?? []).map(c => ({ valeur: c.taux, couleur: c.couleur }))}
              enfant={
                <>
                  <Text style={styles.psl}>{stats.psl.toFixed(1)}</Text>
                  <Text style={styles.pslLabel}>PSL INDEX</Text>
                </>
              }
            />
            {(stats.categories ?? []).length > 0 && (
              <View style={styles.legende}>
                {stats.categories.map(c => (
                  <View key={c.libelle} style={styles.legItem}>
                    <View style={styles.legHaut}>
                      <View style={[styles.legPoint, { backgroundColor: c.couleur }]} />
                      <Text style={styles.legNom}>{c.libelle}</Text>
                    </View>
                    <Text style={styles.legVal}>{c.taux}%</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View style={{ height: 12 }} />
          <Card style={{ marginBottom: 22 }}>
            <View style={styles.chiffres}>
              <View style={styles.chiffre}>
                <Text style={[styles.chiffreVal, { color: colors.amber }]}>{stats.score}</Text>
                <Text style={styles.chiffreNom}>SCORE</Text>
              </View>
              <View style={styles.sep} />
              <View style={styles.chiffre}>
                <Text style={[styles.chiffreVal, { color: colors.coral }]}>{stats.streak} j</Text>
                <Text style={styles.chiffreNom}>STREAK</Text>
              </View>
              <View style={styles.sep} />
              <View style={styles.chiffre}>
                <Text style={[styles.chiffreVal, { color: colors.green }]}>{stats.joursActifs}</Text>
                <Text style={styles.chiffreNom}>JOURS ACTIFS</Text>
              </View>
            </View>
          </Card>
        </>
      ) : (
        <NonPartage texte="Cette personne ne partage pas son score ni sa régularité." />
      )}

      {/* Routines */}
      <SectionTitle>SES ROUTINES</SectionTitle>
      {profil.habits ? (
        profil.habits.length === 0 ? (
          <NonPartage texte="Aucune routine pour l'instant." />
        ) : (
          <View style={{ marginBottom: 22 }}>
            {profil.habits.map((h, i) => (
              <View key={`${h.label}-${i}`} style={styles.item}>
                <View style={[styles.itemIcone, { backgroundColor: `${h.color}1F` }]}>
                  <Text style={{ fontSize: 18 }}>{h.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemSous, { color: h.color }]}>
                    {(h.category ?? "").toUpperCase()}
                  </Text>
                  <Text style={styles.itemNom}>{h.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )
      ) : (
        <NonPartage texte="Cette personne ne partage pas ses routines." />
      )}

      {/* Objectifs */}
      <SectionTitle>SES OBJECTIFS</SectionTitle>
      {profil.goals ? (
        profil.goals.length === 0 ? (
          <NonPartage texte="Aucun objectif pour l'instant." />
        ) : (
          <View style={{ marginBottom: 22 }}>
            {profil.goals.map((g, i) => {
              const pct = g.target > 0 ? Math.min(Math.round((g.progress / g.target) * 100), 100) : 0;
              return (
                <View key={`${g.label}-${i}`} style={[styles.item, { flexDirection: "column", alignItems: "stretch", gap: 10 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={[styles.itemIcone, { backgroundColor: `${g.color}1F` }]}>
                      <Text style={{ fontSize: 18 }}>{g.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemNom}>{g.label}</Text>
                      <Text style={[styles.itemSous, { color: colors.textMuted }]}>
                        {g.progress} / {g.target} {g.unit}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: g.color }}>{pct}%</Text>
                  </View>
                  <ProgressBar value={pct} color={g.color} />
                </View>
              );
            })}
          </View>
        )
      ) : (
        <NonPartage texte="Cette personne ne partage pas ses objectifs." />
      )}

      {/* Avant / après */}
      <SectionTitle>AVANT / APRÈS</SectionTitle>
      {!profil.photos ? (
        <NonPartage texte="Cette personne ne partage pas ses photos de progression." />
      ) : !("avant" in profil.photos) ? (
        <NonPartage texte="Pas encore assez de photos pour un avant / après." />
      ) : (
        <View style={styles.duo}>
          <View style={styles.duoCol}>
            <Image source={{ uri: profil.photos.avant.uri }} style={styles.duoImg} resizeMode="cover" />
            <Text style={[styles.duoLabel, { color: colors.textMuted }]}>AVANT</Text>
            <Text style={styles.duoDate}>{profil.photos.avant.date}</Text>
          </View>
          <View style={styles.duoCol}>
            <Image source={{ uri: profil.photos.apres.uri }} style={styles.duoImg} resizeMode="cover" />
            <Text style={[styles.duoLabel, { color: colors.amber }]}>APRÈS</Text>
            <Text style={styles.duoDate}>{profil.photos.apres.date}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
