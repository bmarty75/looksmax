import { cleJour, decalerCle, jourDepuisCle } from "../lib/dates";

/**
 * Ces clés décident de la journée à laquelle une routine est comptée. Une
 * erreur ici ne casse rien de visible : elle décale silencieusement le
 * streak et la moyenne 30 jours, donc le rang.
 */
describe("cleJour", () => {
  it("rend la date du calendrier local, pas celle d'UTC", () => {
    // Le cas qui a motivé lib/dates.ts : à 00 h 30, toISOString() désigne
    // encore la veille dans tout fuseau à l'est de Greenwich.
    expect(cleJour(new Date(2026, 8, 10, 0, 30))).toBe("2026-09-10");
    expect(cleJour(new Date(2026, 8, 10, 23, 59))).toBe("2026-09-10");
    expect(cleJour(new Date(2026, 8, 10, 12, 0))).toBe("2026-09-10");
  });

  it("complète le mois et le jour sur deux chiffres", () => {
    expect(cleJour(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(cleJour(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("concorde toujours avec la date locale d'un formateur indépendant", () => {
    // Oracle externe : la locale suédoise formate en AAAA-MM-JJ, en heure
    // locale. Une divergence signifierait que la clé n'est plus locale.
    for (let i = 0; i < 3000; i++) {
      const d = new Date(2020, 0, 1);
      d.setDate(d.getDate() + Math.floor(Math.random() * 4000));
      d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      expect(cleJour(d)).toBe(d.toLocaleDateString("sv-SE"));
    }
  });
});

describe("jourDepuisCle", () => {
  it("fait l'aller-retour sans perte", () => {
    for (const c of ["2026-02-28", "2024-02-29", "2026-01-01", "2026-12-31"]) {
      expect(cleJour(jourDepuisCle(c))).toBe(c);
    }
  });

  it("se place à midi, pour survivre aux changements d'heure", () => {
    expect(jourDepuisCle("2026-03-29").getHours()).toBe(12);
  });
});

describe("decalerCle", () => {
  it("avance et recule d'un jour", () => {
    expect(decalerCle("2026-09-10", -1)).toBe("2026-09-09");
    expect(decalerCle("2026-09-10", 1)).toBe("2026-09-11");
  });

  it("franchit les bords de mois et d'année", () => {
    expect(decalerCle("2026-09-01", -1)).toBe("2026-08-31");
    expect(decalerCle("2027-01-01", -1)).toBe("2026-12-31");
    expect(decalerCle("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("connaît le 29 février", () => {
    expect(decalerCle("2024-03-01", -1)).toBe("2024-02-29");
    expect(decalerCle("2025-03-01", -1)).toBe("2025-02-28");
  });

  it("traverse les deux changements d'heure sans sauter de jour", () => {
    expect(decalerCle("2026-03-28", 1)).toBe("2026-03-29"); // vers l'heure d'été
    expect(decalerCle("2026-03-29", -1)).toBe("2026-03-28");
    expect(decalerCle("2026-10-24", 1)).toBe("2026-10-25"); // vers l'heure d'hiver
    expect(decalerCle("2026-10-25", -1)).toBe("2026-10-24");
  });

  it("enchaîne 1500 jours sans doublon ni saut", () => {
    let cle = "2024-01-01";
    const vues = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      expect(vues.has(cle)).toBe(false);
      vues.add(cle);
      const suivant = decalerCle(cle, 1);
      expect(suivant > cle).toBe(true);
      cle = suivant;
    }
    expect(vues.size).toBe(1500);
  });

  it("est réversible", () => {
    expect(decalerCle(decalerCle("2026-09-10", -30), 30)).toBe("2026-09-10");
  });
});
