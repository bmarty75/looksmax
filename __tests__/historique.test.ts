import { cleJour, decalerCle } from "../lib/dates";
import { assemblerHistorique } from "../lib/historique";
import { computeCurrentStreak } from "../lib/metrics";

const J = (n: number) => decalerCle(cleJour(), -n);
const coches = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`r${i}`, true]));

describe("assemblerHistorique", () => {
  it("préfère la valeur enregistrée jour par jour", () => {
    const h = assemblerHistorique({ [J(1)]: 75 }, { [J(1)]: 40 }, { [J(1)]: coches(3) }, 4);
    expect(h[J(1)]).toBe(75);
  });

  it("se rabat sur l'ancien objet quand la journée n'a pas encore sa ligne", () => {
    const h = assemblerHistorique({}, { [J(2)]: 60 }, { [J(2)]: coches(3) }, 5);
    expect(h[J(2)]).toBe(60);
  });

  it("reconstitue une journée effacée à partir de ses coches", () => {
    // Le cas exact du bug : le 16 a disparu de l'historique, écrasé par un
    // appareil en retard, mais ses coches étaient restées.
    const h = assemblerHistorique({}, { [J(3)]: 80, [J(2)]: 80 }, { [J(1)]: coches(2) }, 8);
    expect(h[J(1)]).toBe(25);
  });

  it("répare une journée remise à 0 alors que des routines étaient cochées", () => {
    // Autre variante du bug : le tableau de bord d'un appareil en retard
    // enregistrait 0 % par-dessus une journée réellement faite.
    const h = assemblerHistorique({}, { [J(0)]: 0 }, { [J(0)]: coches(4) }, 8);
    expect(h[J(0)]).toBe(50);
  });

  it("compte 0 une journée dont toutes les coches ont été retirées", () => {
    const h = assemblerHistorique({ [J(1)]: 50 }, {}, { [J(1)]: { a: false, b: false } }, 4);
    expect(h[J(1)]).toBe(0);
  });

  it("garde une journée ancienne qui n'a jamais eu de ligne de coches", () => {
    const h = assemblerHistorique({}, { [J(40)]: 70 }, {}, 8);
    expect(h[J(40)]).toBe(70);
  });

  it("plafonne à 100 % quand des routines ont été supprimées depuis", () => {
    const h = assemblerHistorique({}, {}, { [J(1)]: coches(6) }, 3);
    expect(h[J(1)]).toBe(100);
  });

  it("ne divise jamais par zéro", () => {
    const h = assemblerHistorique({}, {}, { [J(1)]: coches(2) }, 0);
    expect(h[J(1)]).toBe(100);
    expect(Number.isFinite(h[J(1)])).toBe(true);
  });

  it("ne fabrique pas de journée à partir de rien", () => {
    expect(assemblerHistorique({}, {}, {}, 8)).toEqual({});
  });
});

describe("le streak survit à un appareil en retard", () => {
  /**
   * Reproduction du rapport : l'utilisateur fait ses routines quatre jours
   * d'affilée, dont un sur un autre appareil. L'onglet resté ouvert renvoie
   * son historique sans cette journée. Avant la correction, le streak
   * tombait à 1.
   */
  it("retrouve les quatre jours à partir des coches", () => {
    const ancienEcrase = { [J(3)]: 80, [J(2)]: 80, [J(0)]: 13 };  // J(1) effacé
    const lignes = {
      [J(3)]: coches(6), [J(2)]: coches(6),
      [J(1)]: coches(2),                  // fait sur l'autre appareil, intact
      [J(0)]: coches(1),
    };

    expect(computeCurrentStreak(ancienEcrase)).toBe(1);   // le symptôme
    const repare = assemblerHistorique({}, ancienEcrase, lignes, 8);
    expect(computeCurrentStreak(repare)).toBe(4);          // la réparation
  });

  it("ne comble pas un jour réellement manqué", () => {
    // La réparation ne doit pas devenir une triche : sans coches, pas de
    // journée, et le streak casse comme il se doit.
    const lignes = { [J(3)]: coches(6), [J(2)]: coches(6), [J(0)]: coches(1) };
    const h = assemblerHistorique({}, {}, lignes, 8);
    expect(computeCurrentStreak(h)).toBe(1);
  });
});
