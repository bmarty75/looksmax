import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "../hooks/useStorage";

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  bg: string;
  card: string;
  surface: string;
  input: string;
  border: string;
  border2: string;
  text: string;
  textSub: string;
  textMuted: string;
  textFaint: string;
}

export const DARK: ThemeColors = {
  bg:        "#080808",
  card:      "#0F0F0F",
  surface:   "#141414",
  input:     "#080808",
  border:    "#1A1A1A",
  border2:   "#222222",
  text:      "#F0EAE0",
  textSub:   "#888888",
  textMuted: "#555555",
  textFaint: "#444444",
};

export const LIGHT: ThemeColors = {
  bg:        "#F5F0EA",
  card:      "#FFFFFF",
  surface:   "#EDE8E0",
  input:     "#F5F0EA",
  border:    "#E5DFD6",
  border2:   "#D8D0C5",
  text:      "#1A1209",
  textSub:   "#665D54",
  textMuted: "#8C8278",
  textFaint: "#ABA39A",
};

interface ThemeCtx {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ mode: "dark", colors: DARK, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    storage.get("lm_theme", "dark").then((v: any) => {
      if (v === "light" || v === "dark") setMode(v as ThemeMode);
    });
  }, []);

  const toggle = async () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    await storage.set("lm_theme", next);
  };

  return (
    <ThemeContext.Provider value={{ mode, colors: mode === "dark" ? DARK : LIGHT, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
