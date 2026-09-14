import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Splash } from "../components/Splash";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";

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
  // La superposition HTML a tenu l'écran pendant le chargement du bundle ;
  // à partir d'ici c'est React qui affiche, elle doit partir.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const voile = document.getElementById("preamorce");
    if (!voile) return;
    voile.classList.add("parti");
    const t = setTimeout(() => voile.remove(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
