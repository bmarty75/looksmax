import {
  BIO_MAX, EMPTY_PROFILE, PSEUDO_MAX, PSEUDO_MIN,
  estPseudoDejaPris, initiales, verifierPseudo,
} from "../lib/profile";
import { PARTAGE_DEFAUT } from "../lib/social";

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
    expect(EMPTY_PROFILE).toEqual({ pseudo: "", bio: "", avatar: null });
  });

  it("garde des limites cohérentes avec les champs de saisie", () => {
    expect(PSEUDO_MIN).toBeLessThan(PSEUDO_MAX);
    expect(BIO_MAX).toBeGreaterThan(PSEUDO_MAX);
  });
});
