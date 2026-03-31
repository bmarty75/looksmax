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
    { min: 0,  max: 20,  label: "D",  color: "#666",    title: "Débutant" },
    { min: 20, max: 40,  label: "C",  color: "#7B9EE0", title: "En progression" },
    { min: 40, max: 60,  label: "B",  color: "#7ECC8A", title: "Sérieux" },
    { min: 60, max: 75,  label: "A",  color: "#C9A96E", title: "Elite" },
    { min: 75, max: 90,  label: "S",  color: "#E07B5A", title: "Top 10%" },
    { min: 90, max: 101, label: "SS", color: "#F0D090", title: "GODMODE" },
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
    "Double cleanse le soir pour maximiser l'absorption",
    "La vitamine C le matin, le rétinol le soir",
    "8h de sommeil = meilleure skin que n'importe quelle crème",
    "Boire de l'eau en priorité au réveil",
    "La posture change ton visage en 6 semaines",
    "Mâche lentement pour muscler les masséters",
    "La crème solaire est le meilleur anti-âge",
    "Un déficit calorique modéré = face gains garantis",
  ];
  
  export const ICONS = ["✨","💪","🌙","💧","🥩","🧍","✂️","☀️","🏃","🧘","🫀","🦷","💊","🧴","🧠","🎯","🏋️","🚴","🥗","🍎"];
  export const COLORS = ["#C9A96E","#E07B5A","#7B9EE0","#5AC4D4","#7ECC8A","#B07ECC","#CC9B7E","#E0C55A","#E07BB0","#7BE0C4"];
  export const CATEGORIES = ["skin","body","nutrition","recovery","mental","custom"];
  
  export const getRank = (score: number) =>
    RANKS.find((r) => score >= r.min && score < r.max) || RANKS[0];
  
  export const todayKey = () => new Date().toISOString().slice(0, 10);