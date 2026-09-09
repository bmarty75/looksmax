import { RANKS, getRank } from "../constants/data";

/* ─── Score de régularité (20 % jour, 40 % streak, 40 % moyenne 30 j) ─── */

export const STREAK_MAX_DAYS = 60;
export const AVG_WINDOW_DAYS = 30;

const cle = (d: Date) => d.toISOString().slice(0, 10);

export function computeCurrentStreak(history: Record<string, number>): number {
  const d = new Date();
  if ((history[cle(d)] || 0) <= 0) d.setDate(d.getDate() - 1); // le jour en cours n'est pas fini
  let streak = 0;
  while ((history[cle(d)] || 0) > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function compute30DayAvg(history: Record<string, number>): number {
  const d = new Date();
  let somme = 0;
  for (let i = 0; i < AVG_WINDOW_DAYS; i++) {
    somme += history[cle(d)] || 0;
    d.setDate(d.getDate() - 1);
  }
  return somme / AVG_WINDOW_DAYS;
}

export function computeCompositeScore(todayPct: number, streak: number, avg30: number): number {
  const partStreak = Math.min(streak / STREAK_MAX_DAYS, 1) * 100;
  return Math.max(0, Math.min(100, Math.round(0.2 * todayPct + 0.4 * partStreak + 0.4 * avg30)));
}

/* ─── Index PSL ───────────────────────────────────────────── */

/** Bornes numériques d'une note PSL écrite « 4.5–5 », « < 3 » ou « 10 ». */
function bornesPsl(psl: string): [number, number] {
  if (psl.includes("<")) return [1, parseFloat(psl.replace("<", "").trim())];
  const parts = psl.split("–").map(p => parseFloat(p.trim()));
  if (parts.length === 2 && parts.every(n => !Number.isNaN(n))) return [parts[0], parts[1]];
  const seul = parseFloat(psl);
  return Number.isNaN(seul) ? [1, 1] : [seul, seul];
}

/**
 * Convertit le score de régularité (0–100) en note PSL affichable,
 * en interpolant à l'intérieur de la tranche du rang atteint.
 */
export function indexPsl(score: number, streak: number): number {
  const rang = getRank(score, streak);
  const [bas, haut] = bornesPsl(rang.psl);
  const etendue = rang.max - rang.min || 1;
  const position = Math.max(0, Math.min(1, (score - rang.min) / etendue));
  return Math.round((bas + position * (haut - bas)) * 10) / 10;
}

/**
 * Rang actuel déduit du seul historique : l'entrée du jour y est déjà écrite
 * par les écrans, ce qui évite de recharger les cases cochées partout.
 */
export function rangCourant(history: Record<string, number>) {
  const streak = computeCurrentStreak(history);
  const score = computeCompositeScore(
    history[cle(new Date())] || 0,
    streak,
    compute30DayAvg(history),
  );
  return getRank(score, streak);
}

/* ─── Répartition par catégorie ───────────────────────────── */

const LIBELLES: Record<string, string> = {
  skin: "SOINS",
  body: "PHYSIQUE",
  nutrition: "NUTRITION",
  recovery: "RÉCUP",
  mental: "MENTAL",
  custom: "PERSO",
};

export interface PartCategorie {
  categorie: string;
  libelle: string;
  taux: number;
  couleur: string;
}

/**
 * Taux de complétion sur 7 jours par catégorie d'habitude.
 * Renvoie les trois catégories les mieux fournies, pour les anneaux.
 */
export function partsParCategorie(
  habits: { id: string; category: string }[],
  counts7j: Record<string, number>,
  couleurs: string[],
): PartCategorie[] {
  const groupes = new Map<string, string[]>();
  for (const h of habits) {
    if (!groupes.has(h.category)) groupes.set(h.category, []);
    groupes.get(h.category)!.push(h.id);
  }

  return Array.from(groupes.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([categorie, ids], i) => {
      const total = ids.length * 7;
      const faits = ids.reduce((s, id) => s + (counts7j[id] || 0), 0);
      return {
        categorie,
        libelle: LIBELLES[categorie] ?? categorie.toUpperCase(),
        taux: total > 0 ? Math.round((faits / total) * 100) : 0,
        couleur: couleurs[i % couleurs.length],
      };
    });
}

/* ─── Séries pour les courbes ─────────────────────────────── */

/** Scores composites reconstitués jour par jour sur les n derniers jours. */
export function serieScore(history: Record<string, number>, jours: number): number[] {
  const serie: number[] = [];
  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    // Streak et moyenne tels qu'ils étaient ce jour-là.
    let streak = 0;
    const curseur = new Date(d);
    while ((history[cle(curseur)] || 0) > 0) {
      streak++;
      curseur.setDate(curseur.getDate() - 1);
    }
    let somme = 0;
    const fenetre = new Date(d);
    for (let j = 0; j < AVG_WINDOW_DAYS; j++) {
      somme += history[cle(fenetre)] || 0;
      fenetre.setDate(fenetre.getDate() - 1);
    }
    serie.push(computeCompositeScore(history[cle(d)] || 0, streak, somme / AVG_WINDOW_DAYS));
  }
  return serie;
}

/** Valeurs brutes de complétion sur les n derniers jours. */
export function serieCompletion(history: Record<string, number>, jours: number): number[] {
  const serie: number[] = [];
  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    serie.push(history[cle(d)] || 0);
  }
  return serie;
}

/* ─── Projection vers le rang suivant ─────────────────────── */

export interface Projection {
  /** Rang visé, ou null si déjà au sommet. */
  rang: (typeof RANKS)[number] | null;
  /** Jours estimés au rythme actuel, ou null si hors d'atteinte. */
  jours: number | null;
  /** Score minimum requis pour ce rang. */
  scoreRequis: number;
}

/**
 * Simule les jours à venir en supposant que l'utilisateur garde son taux de
 * complétion moyen des 7 derniers jours. Aucune prédiction magique : c'est la
 * formule du score appliquée en avant.
 */
export function projectionRangSuivant(history: Record<string, number>): Projection {
  const streakActuel = computeCurrentStreak(history);
  const scoreActuel = computeCompositeScore(
    history[cle(new Date())] || 0,
    streakActuel,
    compute30DayAvg(history),
  );
  const rangActuel = getRank(scoreActuel, streakActuel);
  const index = RANKS.findIndex(r => r.label === rangActuel.label);
  const suivant = index >= 0 && index < RANKS.length - 1 ? RANKS[index + 1] : null;
  if (!suivant) return { rang: null, jours: null, scoreRequis: 100 };

  // Rythme retenu : moyenne des 7 derniers jours.
  const recents = serieCompletion(history, 7);
  const rythme = recents.reduce((a, b) => a + b, 0) / recents.length;
  if (rythme <= 0) return { rang: suivant, jours: null, scoreRequis: suivant.min };

  const simule = { ...history };
  let streak = streakActuel;
  for (let j = 1; j <= 400; j++) {
    const d = new Date();
    d.setDate(d.getDate() + j);
    simule[cle(d)] = rythme;
    streak++;

    let somme = 0;
    const fenetre = new Date(d);
    for (let k = 0; k < AVG_WINDOW_DAYS; k++) {
      somme += simule[cle(fenetre)] || 0;
      fenetre.setDate(fenetre.getDate() - 1);
    }
    const score = computeCompositeScore(rythme, streak, somme / AVG_WINDOW_DAYS);
    if (score >= suivant.min && streak >= suivant.streakReq) {
      return { rang: suivant, jours: j, scoreRequis: suivant.min };
    }
  }
  return { rang: suivant, jours: null, scoreRequis: suivant.min };
}
