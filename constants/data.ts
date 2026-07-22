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
  
  export const DEFAULT_GOALS = [
    { id: "g1", label: "Perdre 5kg", target: 100, unit: "%", icon: "⚖️", color: "#E07B5A", progress: 68 },
    { id: "g2", label: "Streak 30 jours", target: 30, unit: "j", icon: "🔥", color: "#C9A96E", progress: 12 },
    { id: "g3", label: "Skincare routine", target: 21, unit: "j", icon: "✨", color: "#5AC4D4", progress: 14 },
  ];
  
  export const RANKS = [
    { min: 0,  max: 20,  label: "Incel",    color: "#666",    title: "Débutant",       streakReq: 0  },
    { min: 20, max: 40,  label: "Normie",   color: "#7B9EE0", title: "En progression", streakReq: 0  },
    { min: 40, max: 60,  label: "HTN",      color: "#7ECC8A", title: "Sérieux",        streakReq: 0  },
    { min: 60, max: 75,  label: "Chadlite", color: "#C9A96E", title: "Elite",          streakReq: 0  },
    { min: 75, max: 90,  label: "Chad",     color: "#E07B5A", title: "Top 10%",        streakReq: 14 },
    { min: 90, max: 101, label: "Gigachad", color: "#F0D090", title: "GODMODE",        streakReq: 30 },
  ];
  
  export const BADGES = [
    { id: "first_day",    icon: "🌱", label: "1ère routine",  desc: "Complète 1 habitude",      condition: (s: any) => s.totalChecked >= 1 },
    { id: "week_warrior", icon: "⚔️", label: "Week Warrior",  desc: "7 jours de streak",         condition: (s: any) => s.streak >= 7 },
    { id: "perfect_day",  icon: "💎", label: "Perfect Day",   desc: "100% en un jour",           condition: (s: any) => s.perfectDays >= 1 },
    { id: "month_king",   icon: "👑", label: "Month King",    desc: "30 jours de streak",        condition: (s: any) => s.streak >= 30 },
    { id: "hydrated",     icon: "💧", label: "Hydraté",       desc: "Eau cochée 10 fois",        condition: (s: any) => s.waterCount >= 10 },
    { id: "glowup",       icon: "🌟", label: "Glow Up",       desc: "Ajoute une photo",          condition: (s: any) => (s.photos || 0) >= 1 },
    { id: "goal_getter",  icon: "🎯", label: "Goal Getter",   desc: "Crée 3 objectifs",          condition: (s: any) => s.goalsCreated >= 3 },
    { id: "godmode",      icon: "🔱", label: "GODMODE",       desc: "Rang SS atteint",           condition: (s: any) => s.avgScore >= 90 },
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
  
  export const todayKey = () => new Date().toISOString().slice(0, 10);