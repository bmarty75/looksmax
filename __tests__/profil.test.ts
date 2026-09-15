import {
  BIO_MAX, EMPTY_PROFILE, PSEUDO_MAX, PSEUDO_MIN,
  cadreCarre, estPseudoDejaPris, initiales, verifierPseudo,
} from "../lib/profile";
import { PARTAGE_DEFAUT } from "../lib/social";
import { RANKS, SEXE_DEFAUT, descriptionRang, libelleRang } from "../constants/data";

describe("échelle selon le sexe", () => {
  const parLabel = (l: string) => RANKS.find(r => r.label === l)!;

  it("garde les noms masculins par défaut", () => {
    expect(SEXE_DEFAUT).toBe("homme");
    expect(libelleRang(parLabel("Chad"))).toBe("Chad");
    expect(libelleRang(parLabel("True Adam"), "homme")).toBe("True Adam");
  });

  it("rend les huit équivalents féminins", () => {
    const attendu: Record<string, string> = {
      "LTN": "LTB", "MTN": "MTB", "HTN": "HTB", "Chadlite": "Stacylite",
      "Chad": "Stacy", "Gigachad": "Gigastacy", "True Adam": "True Eve",
    };
    for (const [masculin, feminin] of Object.entries(attendu)) {
      expect(libelleRang(parLabel(masculin), "femme")).toBe(feminin);
    }
    // Sub-5 est une note PSL, pas un nom genré : il ne change pas.
    expect(libelleRang(parLabel("Sub-5"), "femme")).toBe("Sub-5");
    expect(libelleRang(parLabel("Sub-3"), "femme")).toBe("Sub-3");
  });

  it("donne un nom à chaque palier, quel que soit le sexe", () => {
    for (const sexe of ["homme", "femme"] as const) {
      for (const r of RANKS) {
        expect(libelleRang(r, sexe)).toBeTruthy();
        expect(descriptionRang(r, sexe)).toBeTruthy();
      }
    }
  });

  it("ne double aucun nom à l'intérieur d'une échelle", () => {
    for (const sexe of ["homme", "femme"] as const) {
      const noms = RANKS.map(r => libelleRang(r, sexe));
      expect(new Set(noms).size).toBe(RANKS.length);
    }
  });

  it("ne touche ni aux seuils ni aux couleurs", () => {
    // Le score mesure la régularité : le sexe ne doit rien y changer.
    for (const r of RANKS) {
      expect(r).toHaveProperty("min");
      expect(r).toHaveProperty("streakReq");
    }
    expect(RANKS.map(r => r.min)).toEqual([0, 15, 30, 45, 60, 72, 84, 92, 100]);
    expect(RANKS.map(r => r.streakReq)).toEqual([0, 0, 0, 0, 0, 21, 45, 60, 365]);
  });

  it("adapte aussi la description quand elle nomme le palier", () => {
    expect(descriptionRang(parLabel("LTN"), "femme")).toContain("Becky");
    expect(descriptionRang(parLabel("LTN"), "homme")).toContain("Normie");
  });
});

describe("cadreCarre", () => {
  it("prend un carré centré dans une photo paysage", () => {
    // 400×200 : on garde les 200 px du milieu, 100 px rognés de chaque côté.
    expect(cadreCarre(400, 200)).toEqual({ originX: 100, originY: 0, width: 200, height: 200 });
  });

  it("prend un carré centré dans une photo portrait", () => {
    expect(cadreCarre(200, 400)).toEqual({ originX: 0, originY: 100, width: 200, height: 200 });
  });

  it("ne touche pas à une image déjà carrée", () => {
    expect(cadreCarre(512, 512)).toBeNull();
  });

  it("renonce quand les dimensions manquent", () => {
    // Mieux vaut ne pas recadrer que recadrer de travers : sans recadrage,
    // l'affichage rogne lui-même ; avec de mauvaises valeurs, l'image est
    // enregistrée abîmée.
    for (const [l, h] of [[undefined, 200], [400, undefined], [0, 200], [400, -1]] as [number?, number?][]) {
      expect(cadreCarre(l, h)).toBeNull();
    }
  });

  it("ne sort jamais de l'image", () => {
    for (let i = 0; i < 500; i++) {
      const l = 1 + Math.floor(Math.random() * 4000);
      const h = 1 + Math.floor(Math.random() * 4000);
      const c = cadreCarre(l, h);
      if (!c) { expect(l).toBe(h); continue; }
      expect(c.width).toBe(c.height);
      expect(c.originX).toBeGreaterThanOrEqual(0);
      expect(c.originY).toBeGreaterThanOrEqual(0);
      expect(c.originX + c.width).toBeLessThanOrEqual(l);
      expect(c.originY + c.height).toBeLessThanOrEqual(h);
      // Le carré fait bien la taille du plus petit côté.
      expect(c.width).toBe(Math.min(l, h));
    }
  });

  it("reste centré à un pixel près sur les tailles impaires", () => {
    const c = cadreCarre(401, 200)!;
    expect(Math.abs((401 - c.width) / 2 - c.originX)).toBeLessThanOrEqual(0.5);
  });
});

describe("verifierPseudo", () => {
  it("accepte ce que la contrainte SQL accepte", () => {
    for (const bon of ["abc", "BenMax", "user_1", "a.b-c", "A".repeat(PSEUDO_MAX)]) {
      expect(verifierPseudo(bon)).toBeNull();
    }
  });

  it("refuse le vide et les pseudos trop courts", () => {
    expect(verifierPseudo("")).toContain("Choisis");
    expect(verifierPseudo("   ")).toContain("Choisis");
    expect(verifierPseudo("ab")).toContain(String(PSEUDO_MIN));
  });

  it("refuse au-delà de la longueur maximale", () => {
    expect(verifierPseudo("A".repeat(PSEUDO_MAX + 1))).toContain(String(PSEUDO_MAX));
  });

  it("refuse espaces, accents et symboles", () => {
    // La recherche par pseudo repose sur un préfixe : accepter des accents
    // ou des espaces rendrait « qui cherche qui » imprévisible.
    for (const mauvais of ["a b", "héros", "a@b", "a/b", "émile", "a\tb"]) {
      expect(verifierPseudo(mauvais)).not.toBeNull();
    }
  });

  it("ignore les espaces autour", () => {
    expect(verifierPseudo("  BenMax  ")).toBeNull();
  });

  it("reste aligné sur la contrainte pseudo_format de social.sql", () => {
    // Si l'un des deux bouge sans l'autre, l'app laisse passer un pseudo que
    // la base refusera au dernier moment, ou l'inverse.
    const sql = /^[A-Za-z0-9_.-]{3,20}$/;
    for (const essai of ["abc", "ab", "a_b.c-d", "héros", "a b", "A".repeat(21), "A".repeat(20)]) {
      expect(verifierPseudo(essai) === null).toBe(sql.test(essai.trim()));
    }
  });
});

describe("estPseudoDejaPris", () => {
  it("reconnaît la violation d'unicité de Postgres", () => {
    expect(estPseudoDejaPris({ code: "23505" })).toBe(true);
    expect(estPseudoDejaPris({ message: "duplicate key value violates unique constraint \"profiles_pseudo_unique\"" })).toBe(true);
  });

  it("ne confond pas avec une autre erreur", () => {
    expect(estPseudoDejaPris(null)).toBe(false);
    expect(estPseudoDejaPris({ code: "23503", message: "Key is not present in table" })).toBe(false);
    expect(estPseudoDejaPris({ message: "Connexion impossible" })).toBe(false);
  });
});

describe("initiales", () => {
  it("prend les deux premières lettres d'un pseudo d'un seul mot", () => {
    expect(initiales("BenMax", null)).toBe("BE");
  });

  it("prend l'initiale de chaque mot quand il y en a plusieurs", () => {
    expect(initiales("Jean Dupont", null)).toBe("JD");
    expect(initiales("jean.dupont", null)).toBe("JD");
    expect(initiales("jean_dupont", null)).toBe("JD");
  });

  it("se rabat sur l'adresse e-mail sans pseudo", () => {
    expect(initiales("", "benjamin@exemple.fr")).toBe("BE");
  });

  it("ne rend jamais de chaîne vide", () => {
    expect(initiales("", null)).toBe("?");
    expect(initiales("   ", null)).toBe("?");
  });
});

describe("réglages de partage", () => {
  it("laisse les photos désactivées par défaut", () => {
    // Ce sont des photos de visage : elles ne doivent partir que sur un
    // geste explicite, jamais par omission.
    expect(PARTAGE_DEFAUT.photos).toBe(false);
  });

  it("partage le reste par défaut : sans ça le social n'a rien à montrer", () => {
    expect(PARTAGE_DEFAUT.stats).toBe(true);
    expect(PARTAGE_DEFAUT.habits).toBe(true);
    expect(PARTAGE_DEFAUT.goals).toBe(true);
  });
});

describe("profil vide", () => {
  it("ne contient rien qui puisse être publié par erreur", () => {
    expect(EMPTY_PROFILE).toEqual({ pseudo: "", bio: "", avatar: null, sexe: SEXE_DEFAUT });
  });

  it("garde des limites cohérentes avec les champs de saisie", () => {
    expect(PSEUDO_MIN).toBeLessThan(PSEUDO_MAX);
    expect(BIO_MAX).toBeGreaterThan(PSEUDO_MAX);
  });
});
