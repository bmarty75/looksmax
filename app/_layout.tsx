import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";

function Splash({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", gap: 14 }}>
      <Text style={{ color: "#C9A96E", fontSize: 32 }}>◈</Text>
      {message && <Text style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 2 }}>{message}</Text>}
    </View>
  );
}

function RootNavigator() {
  const { session, loading, syncing, recuperation } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const surConnexion = segments[0] === "login";
    const surReinitialisation = segments[0] === "reset-password";

    // Arrivée depuis l'e-mail de récupération : la session est ouverte, mais
    // tant qu'un mot de passe n'est pas choisi on ne laisse pas filer vers le
    // reste de l'app — sinon le lien de l'e-mail resterait le seul accès.
    if (recuperation) {
      if (!surReinitialisation) router.replace("/reset-password");
      return;
    }
    if (surReinitialisation) return;   // l'écran gère lui-même sa sortie

    if (!session && !surConnexion) router.replace("/login");
    else if (session && surConnexion) router.replace("/");
  }, [session, loading, segments, router, recuperation]);

  if (loading) return <Splash />;
  if (syncing) return <Splash message="SYNCHRONISATION" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="compare" />
      <Stack.Screen name="friend/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
