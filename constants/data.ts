import { cleJour } from "../lib/dates";

export const DEFAULT_HABITS = [
    { id: "skincare", icon: "✨", label: "Skincare", category: "skin", color: "#C9A96E" },
    { id: "workout", icon: "💪", label: "Workout", category: "body", color: "#E07B5A" },
    { id: "sleep", icon: "🌙", label: "Sommeil 8h", category: "recovery", color: "#7B9EE0" },
    { id: "water", icon: "💧", label: "2L d'eau", category: "nutrition", color: "#5AC4D4" },
    { id: "diet", icon: "🥩", label: "Nutrition", category: "nutrition", color: "#7ECC8A" },
    { id: "posture", icon: "🧍", label: "Posture", category: "body", color: "#B07ECC" },
    { id: "grooming", icon: "✂️", label: "Grooming", category: "skin", color: "#CC9B7E" },
    { id: "sunscreen", icon: "☀️", label: "SPF", category: "skin", color: "#E0C55A" },
  ];
  
  // Pas d'objectifs par défaut : un nouveau compte démarre avec une liste
  // vide et crée les siens depuis l'écran Objectifs.

  export type Sexe = "homme" | "femme";
  export const SEXE_DEFAUT: Sexe = "homme";

  // Échelle PSL (1–10). `min`/`max` = plage du score de régularité (0–100),
  // `streakReq` = streak minimum exigé en plus du score pour débloquer le palier.
  //
  // `label` est l'identité du palier : c'est lui qui sert aux comparaisons
  // internes et il ne change jamais. `feminin` ne porte que l'affichage.
  // Sub-3 et Sub-5 n'en ont pas : ce sont des notes PSL, pas des noms genrés.
  export const RANKS = [
    { min: 0,   max: 15,  label: "Sub-3",     psl: "< 3",   pop: "~5%",           color: "#5A5A5A", desc: "Traits structurels très défavorables",        streakReq: 0   },
    { min: 15,  max: 30,  label: "Sub-5",     psl: "3–4.5", pop: "~20%",          color: "#8A8A8A", desc: "Nettement sous la moyenne, défauts visibles", streakReq: 0   },
    { min: 30,  max: 45,  label: "LTN",       psl: "4.5–5", pop: "~25%",          color: "#7B9EE0", desc: "Low Tier Normie, un peu sous la moyenne",     streakReq: 0,
      feminin: { label: "LTB",       desc: "Low Tier Becky, un peu sous la moyenne" } },
    { min: 45,  max: 60,  label: "MTN",       psl: "5–5.5", pop: "~30%",          color: "#5AC4D4", desc: "Mid Tier Normie, la vraie moyenne",           streakReq: 0,
      feminin: { label: "MTB",       desc: "Mid Tier Becky, la vraie moyenne" } },
    { min: 60,  max: 72,  label: "HTN",       psl: "6–6.5", pop: "~15%",          color: "#7ECC8A", desc: "Au-dessus de la moyenne, bonne harmonie",     streakReq: 0,
      feminin: { label: "HTB",       desc: "High Tier Becky, au-dessus de la moyenne" } },
    { min: 72,  max: 84,  label: "Chadlite",  psl: "7–7.5", pop: "top 5%",        color: "#C9A96E", desc: "Clairement attirant",                         streakReq: 21,
      feminin: { label: "Stacylite", desc: "Clairement attirante" } },
    { min: 84,  max: 92,  label: "Chad",      psl: "8–9",   pop: "top 1%",        color: "#E07B5A", desc: "Dominance sociale + physique",                streakReq: 45,
      feminin: { label: "Stacy",     desc: "Dominance sociale + physique" } },
    { min: 92,  max: 100, label: "Gigachad",  psl: "9–9.5", pop: "top 0.1%",      color: "#F0D090", desc: "Outlier",                                     streakReq: 60,
      feminin: { label: "Gigastacy", desc: "Outlier" } },
    { min: 100, max: 101, label: "True Adam", psl: "10",    pop: "1/10 milliards", color: "#B07ECC", desc: "Purement théorique",                         streakReq: 365,
      feminin: { label: "True Eve",  desc: "Purement théorique" } },
  ];

  export type Rang = (typeof RANKS)[number];

  /**
   * Nom affiché d'un palier. Les seuils, eux, sont identiques pour tout le
   * monde : le score mesure de la régularité, pas une morphologie.
   */
  export const libelleRang = (r: Rang, sexe: Sexe = SEXE_DEFAUT) =>
    (sexe === "femme" ? r.feminin?.label ?? r.label : r.label);

  export const descriptionRang = (r: Rang, sexe: Sexe = SEXE_DEFAUT) =>
    (sexe === "femme" ? r.feminin?.desc ?? r.desc : r.desc);
  
  export const BADGES = [
    { id: "first_day",    icon: "🌱", label: "1ère routine",  desc: "Complète 1 habitude",      condition: (s: any) => s.totalChecked >= 1 },
    { id: "week_warrior", icon: "⚔️", label: "Week Warrior",  desc: "7 jours de streak",         condition: (s: any) => s.streak >= 7 },
    { id: "perfect_day",  icon: "💎", label: "Perfect Day",   desc: "100% en un jour",           condition: (s: any) => s.perfectDays >= 1 },
    { id: "month_king",   icon: "👑", label: "Month King",    desc: "30 jours de streak",        condition: (s: any) => s.streak >= 30 },
    { id: "hydrated",     icon: "💧", label: "Hydraté",       desc: "Eau cochée 10 fois",        condition: (s: any) => s.waterCount >= 10 },
    { id: "glowup",       icon: "🌟", label: "Glow Up",       desc: "Ajoute une photo",          condition: (s: any) => (s.photos || 0) >= 1 },
    { id: "goal_getter",  icon: "🎯", label: "Goal Getter",   desc: "Crée 3 objectifs",          condition: (s: any) => s.goalsCreated >= 3 },
    { id: "godmode",      icon: "🔱", label: "GODMODE",       desc: "Rang Gigachad atteint",     condition: (s: any) => ["Gigachad", "True Adam"].includes(s.rank) },
  ];
  
  export const TIPS = [
    // Peau (skincare)
    "La crème solaire est le meilleur anti-âge, mets-en tous les jours",
    "Vitamine C le matin, rétinol le soir",
    "Double cleanse le soir pour bien nettoyer la peau",
    "Ne touche pas ton visage dans la journée",
    "Hydrate ta peau matin et soir, même si elle est grasse",
    "Change ta taie d'oreiller 2 fois par semaine",
    "Bois de l'eau, la peau déshydratée vieillit plus vite",
    // Corps (body)
    "Un déficit calorique modéré révèle les traits du visage",
    "Muscle ton cou et tes trapèzes pour une silhouette plus imposante",
    "Travaille tes épaules pour élargir le haut du corps",
    "La posture change ta silhouette instantanément",
    "Redresse-toi : épaules en arrière, menton légèrement rentré",
    // Visage (facial)
    "Mâche lentement pour développer les masséters (mâchoire)",
    "Le mewing (langue au palais) améliore la posture linguale",
    "Réduis le sel pour limiter la rétention d'eau au visage",
    "Dors sur le dos pour éviter l'asymétrie et les marques",
    // Sommeil & récup
    "8h de sommeil = meilleure peau que n'importe quelle crème",
    "Couche-toi avant minuit, la récup est meilleure",
    "Coupe les écrans 30 min avant de dormir",
    "Une chambre fraîche améliore la qualité du sommeil",
    // Grooming
    "Trouve une coupe adaptée à ta forme de visage",
    "Entretiens tes sourcils, ça structure le regard",
    "Garde une barbe nette ou rase de près, pas d'entre-deux",
    "Ongles propres et coupés, ça se remarque",
    "Une bonne odeur laisse une impression forte",
    // Nutrition
    "Protéines à chaque repas pour la peau et les muscles",
    "Réduis le sucre, il accélère le vieillissement (glycation)",
    "Oméga-3 (poissons gras) pour une peau saine",
    "Limite l'alcool, il gonfle le visage et abîme la peau",
    // Mental / lifestyle
    "La confiance se voit plus que n'importe quel trait",
    "Souris, ça rend instantanément plus attirant",
    "Le contact visuel renforce ta présence",
    "Gère ton stress, le cortisol abîme peau et sommeil",
  ];
  
  export const ICONS = ["✨","💪","🌙","💧","🥩","🧍","✂️","☀️","🏃","🧘","🫀","🦷","💊","🧴","🧠","🎯","🏋️","🚴","🥗","🍎"];
  export const COLORS = ["#C9A96E","#E07B5A","#7B9EE0","#5AC4D4","#7ECC8A","#B07ECC","#CC9B7E","#E0C55A","#E07BB0","#7BE0C4"];
  export const CATEGORIES = ["skin","body","nutrition","recovery","mental","custom"];
  
  export const getRank = (score: number, streak: number = 0) => {
    let idx = RANKS.findIndex((r) => score >= r.min && score < r.max);
    if (idx === -1) idx = 0;
    while (idx > 0 && streak < RANKS[idx].streakReq) idx--;
    return RANKS[idx];
  };
  
  export const todayKey = () => cleJour();