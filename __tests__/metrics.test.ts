import { RANKS, getRank } from "../constants/data";
import { cleJour, decalerCle } from "../lib/dates";
import {
  AVG_WINDOW_DAYS, STREAK_MAX_DAYS,
  compute30DayAvg, computeCompositeScore, computeCurrentStreak,
  indexPsl, partsParCategorie, projectionRangSuivant, rangCourant,
  serieCompletion, serieScore,
} from "../lib/metrics";

/** Historique où le jour 0 est aujourd'hui, le jour 1 hier, etc. */
function historique(valeurs: number[]): Record<string, number> {
  const h: Record<string, number> = {};
  let cle = cleJour();
  for (const v of valeurs) {
    h[cle] = v;
    cle = decalerCle(cle, -1);
  }
  return h;
}

/** n jours consécutifs à la même valeur, en partant d'aujourd'hui. */
const constant = (n: number, v: number) => historique(Array(n).fill(v));

describe("computeCompositeScore", () => {
  it("applique la pondération annoncée : 20 % jour, 40 % streak, 40 % moyenne", () => {
    // Streak plein (60 j) et moyenne pleine, mais journée nulle : 80 points.
    expect(computeCompositeScore(0, STREAK_MAX_DAYS, 100)).toBe(80);
    // Journée pleine seule : 20 points.
    expect(computeCompositeScore(100, 0, 0)).toBe(20);
    // Moyenne pleine seule : 40 points.
    expect(computeCompositeScore(0, 0, 100)).toBe(40);
  });

  it("ne récompense pas un jour parfait isolé", () => {
    // L'exigence de départ : un seul bon jour ne doit presque rien donner.
    const score = computeCompositeScore(100, 1, 100 / AVG_WINDOW_DAYS);
    expect(score).toBeLessThanOrEqual(25);
  });

  it("plafonne la part du streak à 60 jours", () => {
    expect(computeCompositeScore(0, STREAK_MAX_DAYS, 0))
      .toBe(computeCompositeScore(0, STREAK_MAX_DAYS * 10, 0));
  });

  it("monte lentement : la moitié du streak vaut la moitié de sa part", () => {
    expect(computeCompositeScore(0, STREAK_MAX_DAYS / 2, 0)).toBe(20);
  });

  it("reste borné entre 0 et 100", () => {
    expect(computeCompositeScore(999, 999, 999)).toBe(100);
    expect(computeCompositeScore(-50, -50, -50)).toBe(0);
    expect(computeCompositeScore(100, STREAK_MAX_DAYS, 100)).toBe(100);
  });
});

describe("computeCurrentStreak", () => {
  it("compte les jours consécutifs actifs", () => {
    expect(computeCurrentStreak(constant(5, 60))).toBe(5);
  });

  it("ne casse pas le streak parce que la journée en cours est vide", () => {
    // Sans ce sursis, ouvrir l'app le matin afficherait un streak à zéro.
    expect(computeCurrentStreak(historique([0, 80, 80, 80]))).toBe(3);
  });

  it("s'arrête au premier jour manqué", () => {
    expect(computeCurrentStreak(historique([50, 50, 0, 50, 50]))).toBe(2);
  });

  it("traite un jour à zéro comme un jour manqué", () => {
    expect(computeCurrentStreak(historique([0, 0, 90]))).toBe(0);
  });

  it("rend zéro sur un historique vide", () => {
    expect(computeCurrentStreak({})).toBe(0);
  });

  it("ignore les journées futures", () => {
    const h = constant(3, 70);
    h[decalerCle(cleJour(), 5)] = 100;
    expect(computeCurrentStreak(h)).toBe(3);
  });
});

describe("compute30DayAvg", () => {
  it("divise par la fenêtre entière, pas par les jours renseignés", () => {
    // Dix jours parfaits sur trente ne font pas une moyenne de 100 :
    // sinon une semaine d'effort suffirait à afficher un sans-faute.
    expect(compute30DayAvg(constant(10, 100))).toBe(1000 / AVG_WINDOW_DAYS);
  });

  it("vaut 100 sur une fenêtre pleine", () => {
    expect(compute30DayAvg(constant(AVG_WINDOW_DAYS, 100))).toBe(100);
  });

  it("laisse tomber ce qui dépasse la fenêtre", () => {
    expect(compute30DayAvg(constant(60, 100))).toBe(100);
  });

  it("rend zéro sur un historique vide", () => {
    expect(compute30DayAvg({})).toBe(0);
  });
});

describe("getRank", () => {
  it("place le score dans sa tranche", () => {
    expect(getRank(0, 0).label).toBe("Sub-3");
    expect(getRank(20, 0).label).toBe("Sub-5");
    expect(getRank(50, 0).label).toBe("MTN");
    expect(getRank(65, 0).label).toBe("HTN");
  });

  it("refuse les hauts rangs sans le streak exigé", () => {
    // C'est ce qui rend la montée difficile : le score ne suffit pas.
    const chadlite = RANKS.find(r => r.label === "Chadlite")!;
    expect(getRank(chadlite.min + 1, 0).label).toBe("HTN");
    expect(getRank(chadlite.min + 1, chadlite.streakReq).label).toBe("Chadlite");
  });

  it("redescend jusqu'au premier rang dont le streak est tenu", () => {
    const gigachad = RANKS.find(r => r.label === "Gigachad")!;
    // Score au sommet mais aucune régularité : on retombe sous les paliers
    // gardés, pas d'un seul cran.
    const obtenu = getRank(gigachad.min + 1, 0);
    expect(obtenu.streakReq).toBe(0);
    expect(obtenu.label).toBe("HTN");
  });

  it("exige une année entière pour True Adam", () => {
    const adam = RANKS.find(r => r.label === "True Adam")!;
    expect(adam.streakReq).toBe(365);
    expect(getRank(100, 364).label).not.toBe("True Adam");
    expect(getRank(100, 365).label).toBe("True Adam");
  });

  it("ne laisse aucun trou ni recouvrement entre les tranches", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].min).toBe(RANKS[i - 1].max);
    }
    for (let score = 0; score <= 100; score++) {
      expect(getRank(score, 400)).toBeDefined();
    }
  });

  it("durcit les exigences de streak à mesure qu'on monte", () => {
    const seuils = RANKS.map(r => r.streakReq);
    for (let i = 1; i < seuils.length; i++) {
      expect(seuils[i]).toBeGreaterThanOrEqual(seuils[i - 1]);
    }
  });
});

describe("indexPsl", () => {
  it("reste dans les bornes annoncées par le rang", () => {
    for (let score = 0; score <= 100; score += 5) {
      const note = indexPsl(score, 400);
      expect(note).toBeGreaterThanOrEqual(1);
      expect(note).toBeLessThanOrEqual(10);
    }
  });

  it("progresse avec le score, à streak égal", () => {
    let precedent = -1;
    for (let score = 0; score <= 100; score += 10) {
      const note = indexPsl(score, 400);
      expect(note).toBeGreaterThanOrEqual(precedent);
      precedent = note;
    }
  });

  it("n'affiche pas une note haute sans le streak", () => {
    expect(indexPsl(95, 0)).toBeLessThan(indexPsl(95, 400));
  });
});

describe("rangCourant", () => {
  it("part d'un historique vide au rang le plus bas", () => {
    expect(rangCourant({}).label).toBe("Sub-3");
  });

  it("reflète une longue régularité", () => {
    const r = rangCourant(constant(90, 100));
    expect(r.label).not.toBe("Sub-3");
    expect(RANKS.findIndex(x => x.label === r.label)).toBeGreaterThan(3);
  });
});

describe("partsParCategorie", () => {
  const habits = [
    { id: "a", category: "skin" }, { id: "b", category: "skin" },
    { id: "c", category: "body" }, { id: "d", category: "nutrition" },
    { id: "e", category: "mental" },
  ];
  const couleurs = ["#1", "#2", "#3"];

  it("ne rend que les trois catégories les mieux fournies", () => {
    const parts = partsParCategorie(habits, {}, couleurs);
    expect(parts).toHaveLength(3);
    expect(parts[0].categorie).toBe("skin");
  });

  it("calcule le taux sur sept jours par habitude", () => {
    // « skin » a deux habitudes : 14 occasions, 7 faites → 50 %.
    const parts = partsParCategorie(habits, { a: 7, b: 0 }, couleurs);
    expect(parts.find(p => p.categorie === "skin")!.taux).toBe(50);
  });

  it("plafonne à 100 % et ne divise jamais par zéro", () => {
    expect(partsParCategorie(habits, { a: 7, b: 7 }, couleurs)
      .find(p => p.categorie === "skin")!.taux).toBe(100);
    expect(partsParCategorie([], {}, couleurs)).toEqual([]);
  });

  it("traduit les catégories connues et majuscule les autres", () => {
    expect(partsParCategorie([{ id: "x", category: "skin" }], {}, couleurs)[0].libelle).toBe("SOINS");
    expect(partsParCategorie([{ id: "x", category: "bizarre" }], {}, couleurs)[0].libelle).toBe("BIZARRE");
  });
});

describe("séries", () => {
  it("rendent exactement le nombre de jours demandé, du plus ancien au plus récent", () => {
    expect(serieScore(constant(40, 80), 30)).toHaveLength(30);
    const c = serieCompletion(historique([90, 80, 70]), 3);
    expect(c).toEqual([70, 80, 90]);
  });

  it("comblent les jours absents par zéro", () => {
    expect(serieCompletion({}, 5)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("projectionRangSuivant", () => {
  it("ne promet rien quand rien n'est fait", () => {
    const p = projectionRangSuivant({});
    expect(p.jours).toBeNull();
  });

  it("annonce un délai atteignable pour qui tient le rythme", () => {
    const p = projectionRangSuivant(constant(20, 100));
    expect(p.rang).not.toBeNull();
    expect(p.jours).toBeGreaterThan(0);
  });

  it("vise bien le rang immédiatement supérieur", () => {
    const h = constant(20, 100);
    const actuel = rangCourant(h);
    const p = projectionRangSuivant(h);
    const i = RANKS.findIndex(r => r.label === actuel.label);
    expect(p.rang?.label).toBe(RANKS[i + 1].label);
  });

  it("demande plus de jours à qui en fait moins", () => {
    const assidu = projectionRangSuivant(constant(20, 100));
    const tiede = projectionRangSuivant(constant(20, 40));
    expect(tiede.jours ?? Infinity).toBeGreaterThan(assidu.jours!);
  });

  it("ne propose plus rien au sommet", () => {
    expect(projectionRangSuivant(constant(400, 100)).rang?.label).not.toBe("Sub-3");
  });
});
