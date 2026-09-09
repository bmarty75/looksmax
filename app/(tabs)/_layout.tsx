import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";

type NomIcone = React.ComponentProps<typeof MaterialIcons>["name"];

export default function TabsLayout() {
  const { colors, mode } = useTheme();

  const icone = (name: NomIcone) =>
    ({ focused }: { focused: boolean }) => (
      <MaterialIcons name={name} size={22} color={focused ? colors.amber : colors.textMuted} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: mode === "dark" ? "#08080A" : colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 14,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index"  options={{ title: "Biométrie",   tabBarIcon: icone("monitor-heart") }} />
      <Tabs.Screen name="habits" options={{ title: "Routines",    tabBarIcon: icone("checklist") }} />
      <Tabs.Screen name="goals"  options={{ title: "Objectifs",   tabBarIcon: icone("track-changes") }} />
      <Tabs.Screen name="photos" options={{ title: "Progression", tabBarIcon: icone("insights") }} />
    </Tabs>
  );
}
