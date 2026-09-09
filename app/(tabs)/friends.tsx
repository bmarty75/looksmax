import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Card, Pill, SectionTitle } from "../../components/ui";
import { ThemeColors, useTheme } from "../../contexts/ThemeContext";
import { storage } from "../../hooks/useStorage";
import { rangCourant } from "../../lib/metrics";
import { initiales, loadProfile } from "../../lib/profile";
import {
  Ami, Reseau, accepterDemande, chargerReseau, chercherProfils,
  envoyerDemande, publierProfil, retirerLien,
} from "../../lib/social";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root:       { flex: 1, backgroundColor: c.bg },
    content:    { paddingHorizontal: 16, paddingBottom: 30 },

    recherche:  { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18 },
    champ:      { flex: 1, color: c.text, fontSize: 14, paddingVertical: 14 },

    ligne:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, borderRadius: 16, padding: 13, marginBottom: 9 },
    avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg:  { width: "100%", height: "100%" },
    initiales:  { fontSize: 15, fontWeight: "800", color: c.amber },
    pseudo:     { fontSize: 15, fontWeight: "700", color: c.text },
    sous:       { fontSize: 11.5, color: c.textMuted, marginTop: 2 },

    action:     { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    actionTxt:  { fontSize: 11.5, fontWeight: "800" },
    icone:      { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.surface },

    vide:       { alignItems: "center", paddingVertical: 34 },
    videTxt:    { color: c.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 12 },
    msg:        { fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 12 },
  });
}

export default function Amis() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [history, setHistory]   = useState<Record<string, number>>({});
  const [avatar, setAvatar]     = useState<string | null>(null);
  const [reseau, setReseau]     = useState<Reseau>({ amis: [], recuesEnAttente: [], envoyeesEnAttente: [] });
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<{ user_id: string; pseudo: string; avatar: string | null }[]>([]);
  const [msg, setMsg]           = useState<{ texte: string; ok: boolean } | null>(null);

  const rafraichir = useCallback(async () => {
    setReseau(await chargerReseau());
  }, []);

  useFocusEffect(
    useCallback(() => {
      storage.get("lm_history", {}).then(h => setHistory(h && typeof h === "object" ? h : {}));
      loadProfile().then(p => setAvatar(p.avatar));
      // On republie à l'ouverture : les amis voient des chiffres à jour.
      publierProfil();
      rafraichir();
    }, [rafraichir]),
  );

  const lancerRecherche = async (texte: string) => {
    setRecherche(texte);
    setMsg(null);
    setResultats(texte.trim().length >= 3 ? await chercherProfils(texte) : []);
  };

  const inviter = async (userId: string) => {
    const r = await envoyerDemande(userId);
    setMsg(r.message ? { texte: r.message, ok: r.ok } : null);
    if (r.ok) { setRecherche(""); setResultats([]); await rafraichir(); }
  };

  const accepter = async (a: Ami) => {
    const r = await accepterDemande(a.lien.id);
    setMsg(r.message ? { texte: r.message, ok: r.ok } : null);
    await rafraichir();
  };

  const retirer = async (a: Ami) => {
    await retirerLien(a.lien.id);
    await rafraichir();
  };

  const vignette = (p: { pseudo: string; avatar: string | null }) => (
    <View style={styles.avatar}>
      {p.avatar
        ? <Image source={{ uri: p.avatar }} style={styles.avatarImg} />
        : <Text style={styles.initiales}>{initiales(p.pseudo, null)}</Text>}
    </View>
  );

  const dejaLie = (id: string) =>
    [...reseau.amis, ...reseau.recuesEnAttente, ...reseau.envoyeesEnAttente]
      .some(a => a.profil.user_id === id);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader section="Amis" avatar={avatar} rang={rangCourant(history)} />

      <View style={styles.recherche}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.champ}
          placeholder="Chercher un pseudo (3 lettres min.)"
          placeholderTextColor={colors.textFaint}
          value={recherche}
          onChangeText={lancerRecherche}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {recherche.length > 0 && (
          <TouchableOpacity onPress={() => { setRecherche(""); setResultats([]); }}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {msg && (
        <Text style={[styles.msg, { color: msg.ok ? colors.green : colors.coral }]}>{msg.texte}</Text>
      )}

      {/* Résultats de recherche */}
      {resultats.length > 0 && (
        <View style={{ marginBottom: 22 }}>
          <SectionTitle>RÉSULTATS</SectionTitle>
          {resultats.map(p => (
            <View key={p.user_id} style={styles.ligne}>
              {vignette(p)}
              <View style={{ flex: 1 }}>
                <Text style={styles.pseudo}>{p.pseudo || "Sans pseudo"}</Text>
              </View>
              {dejaLie(p.user_id) ? (
                <Pill teinte={colors.surface}>DÉJÀ LIÉ</Pill>
              ) : (
                <TouchableOpacity
                  style={[styles.action, { backgroundColor: colors.cream }]}
                  onPress={() => inviter(p.user_id)}
                >
                  <Text style={[styles.actionTxt, { color: "#101014" }]}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Demandes reçues */}
      {reseau.recuesEnAttente.length > 0 && (
        <View style={{ marginBottom: 22 }}>
          <SectionTitle right={<Pill color={colors.amber} teinte={`${colors.amber}22`}>{reseau.recuesEnAttente.length}</Pill>}>
            DEMANDES REÇUES
          </SectionTitle>
          {reseau.recuesEnAttente.map(a => (
            <View key={a.lien.id} style={styles.ligne}>
              {vignette(a.profil)}
              <View style={{ flex: 1 }}>
                <Text style={styles.pseudo}>{a.profil.pseudo || "Sans pseudo"}</Text>
                <Text style={styles.sous}>souhaite devenir ton ami</Text>
              </View>
              <TouchableOpacity
                style={[styles.action, { backgroundColor: colors.green }]}
                onPress={() => accepter(a)}
              >
                <Text style={[styles.actionTxt, { color: "#101014" }]}>Accepter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.icone} onPress={() => retirer(a)}>
                <MaterialIcons name="close" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Amis */}
      <SectionTitle right={<Pill teinte={colors.surface}>{reseau.amis.length}</Pill>}>
        MES AMIS
      </SectionTitle>

      {reseau.amis.length === 0 ? (
        <Card style={styles.vide}>
          <MaterialIcons name="group-add" size={38} color={colors.textFaint} />
          <Text style={styles.videTxt}>
            Aucun ami pour l&apos;instant.{"\n"}
            Cherche un pseudo ci-dessus pour envoyer une demande.
          </Text>
        </Card>
      ) : (
        reseau.amis.map(a => (
          <TouchableOpacity
            key={a.lien.id}
            style={styles.ligne}
            onPress={() => router.push({ pathname: "/friend/[id]", params: { id: a.profil.user_id } })}
          >
            {vignette(a.profil)}
            <View style={{ flex: 1 }}>
              <Text style={styles.pseudo}>{a.profil.pseudo || "Sans pseudo"}</Text>
              <Text style={styles.sous}>Voir son profil</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        ))
      )}

      {/* Demandes envoyées */}
      {reseau.envoyeesEnAttente.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <SectionTitle>DEMANDES ENVOYÉES</SectionTitle>
          {reseau.envoyeesEnAttente.map(a => (
            <View key={a.lien.id} style={styles.ligne}>
              {vignette(a.profil)}
              <View style={{ flex: 1 }}>
                <Text style={styles.pseudo}>{a.profil.pseudo || "Sans pseudo"}</Text>
                <Text style={styles.sous}>en attente de réponse</Text>
              </View>
              <TouchableOpacity style={styles.icone} onPress={() => retirer(a)}>
                <MaterialIcons name="close" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
