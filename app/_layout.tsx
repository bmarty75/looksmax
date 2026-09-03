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
  const { session, loading, syncing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLoginScreen = segments[0] === "login";
    if (!session && !onLoginScreen) router.replace("/login");
    else if (session && onLoginScreen) router.replace("/");
  }, [session, loading, segments, router]);

  if (loading) return <Splash />;
  if (syncing) return <Splash message="SYNCHRONISATION" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
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
