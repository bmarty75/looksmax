import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{symbol}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0D0D0D",
          borderTopColor: "#1A1A1A",
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#C9A96E",
        tabBarInactiveTintColor: "#444",
        tabBarLabelStyle: {
          fontFamily: "SpaceMono",
          fontSize: 9,
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon symbol="◈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Habitudes",
          tabBarIcon: ({ focused }) => <TabIcon symbol="◉" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Objectifs",
          tabBarIcon: ({ focused }) => <TabIcon symbol="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: "Photos",
          tabBarIcon: ({ focused }) => <TabIcon symbol="◐" focused={focused} />,
        }}
      />
    </Tabs>
  );
}