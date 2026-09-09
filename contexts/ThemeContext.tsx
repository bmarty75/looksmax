import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "../hooks/useStorage";

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  bg: string;
  /** Fond des cartes. */
  card: string;
  /** Creux : pistes de barres, vignettes d'icônes, champs. */
  surface: string;
  input: string;
  border: string;
  border2: string;
  text: string;
  textSub: string;
  textMuted: string;
  textFaint: string;
  /** Accent principal, doré. */
  amber: string;
  /** Réussite, valeurs en hausse. */
  green: string;
  /** Troisième mesure, alertes douces. */
  coral: string;
  /** Boutons pleins d'action principale. */
  cream: string;
  /**
   * Couleur du texte et des icônes POSÉS SUR un aplat ambre. L'ambre est clair
   * en thème sombre et foncé en thème clair : le contraste doit s'inverser.
   */
  onAmber: string;
}

export const DARK: ThemeColors = {
  bg:        "#0B0B0D",
  card:      "#17171B",
  surface:   "#202025",
  input:     "#131316",
  border:    "#232328",
  border2:   "#2C2C32",
  text:      "#FFFFFF",
  textSub:   "#9A9AA2",
  textMuted: "#6E6E77",
  textFaint: "#4C4C54",
  amber:     "#F2B01E",
  green:     "#4BD68C",
  coral:     "#EFA08D",
  cream:     "#F6E3B6",
  onAmber:   "#101014",
};

export const LIGHT: ThemeColors = {
  bg:        "#F4F2EE",
  card:      "#FFFFFF",
  surface:   "#EDEAE4",
  input:     "#F4F2EE",
  border:    "#E2DED7",
  border2:   "#D2CDC4",
  text:      "#141416",
  textSub:   "#5E5E68",
  textMuted: "#84848E",
  textFaint: "#A6A6AE",
  amber:     "#B4820A",
  green:     "#1F9D5F",
  coral:     "#C96A50",
  cream:     "#E7C97E",
  onAmber:   "#FFFFFF",
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
