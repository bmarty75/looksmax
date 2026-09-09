import {
  Photo, ecartEnJours, grouperParMois, moyenneScore, photoDateKey,
} from "../lib/photos";
import { base64DepuisDataUri, versOctets } from "../lib/stockagePhotos";

const photo = (p: Partial<Photo>): Photo => ({ id: 1, date: "", ...p });

describe("photoDateKey", () => {
  it("préfère la clé ISO quand elle est là", () => {
    expect(photoDateKey(photo({ dateKey: "2026-09-10", date: "01/01/2000" }))).toBe("2026-09-10");
  });

  it("reconstitue la clé depuis l'ancien format JJ/MM/AAAA", () => {
    // Les photos d'avant l'ajout de dateKey n'ont que ce libellé français.
    expect(photoDateKey(photo({ date: "05/09/2026" }))).toBe("2026-09-05");
  });

  it("rend null plutôt que d'inventer une date", () => {
    expect(photoDateKey(photo({ date: "" }))).toBeNull();
    expect(photoDateKey(photo({ date: "hier" }))).toBeNull();
  });
});

describe("ecartEnJours", () => {
  it("compte les jours entre deux photos", () => {
    expect(ecartEnJours(photo({ dateKey: "2026-09-01" }), photo({ dateKey: "2026-09-10" }))).toBe(9);
  });

  it("donne le même résultat dans les deux sens", () => {
    const a = photo({ dateKey: "2026-01-01" }), b = photo({ dateKey: "2026-12-31" });
    expect(ecartEnJours(a, b)).toBe(ecartEnJours(b, a));
  });

  it("franchit une année bissextile", () => {
    expect(ecartEnJours(photo({ dateKey: "2024-02-28" }), photo({ dateKey: "2024-03-01" }))).toBe(2);
  });

  it("mélange les deux formats de date", () => {
    expect(ecartEnJours(photo({ date: "01/09/2026" }), photo({ dateKey: "2026-09-10" }))).toBe(9);
  });

  it("rend null si une date manque", () => {
    expect(ecartEnJours(photo({ date: "" }), photo({ dateKey: "2026-09-10" }))).toBeNull();
  });
});

describe("grouperParMois", () => {
  it("regroupe et ordonne du plus récent au plus ancien", () => {
    const g = grouperParMois([
      photo({ id: 1, dateKey: "2026-09-10" }),
      photo({ id: 2, dateKey: "2026-08-02" }),
      photo({ id: 3, dateKey: "2026-09-01" }),
    ]);
    expect(g.map(x => x.titre)).toEqual(["SEPTEMBRE 2026", "AOÛT 2026"]);
    expect(g[0].photos.map(p => p.id)).toEqual([1, 3]);
  });

  it("range les photos sans date à part", () => {
    const g = grouperParMois([photo({ id: 1, date: "" }), photo({ id: 2, dateKey: "2026-09-10" })]);
    expect(g.map(x => x.titre)).toContain("SANS DATE");
    // Le groupe sans date passe en dernier, pour ne pas ouvrir la galerie dessus.
    expect(g[g.length - 1].titre).toBe("SANS DATE");
  });

  it("n'égare aucune photo", () => {
    const liste = Array.from({ length: 25 }, (_, i) =>
      photo({ id: i, dateKey: `2026-${String((i % 12) + 1).padStart(2, "0")}-15` }));
    const total = grouperParMois(liste).reduce((s, g) => s + g.photos.length, 0);
    expect(total).toBe(25);
  });

  it("rend une liste vide pour aucune photo", () => {
    expect(grouperParMois([])).toEqual([]);
  });
});

describe("moyenneScore", () => {
  const h = { "2026-09-01": 40, "2026-09-05": 60, "2026-09-10": 80, "2026-10-01": 100 };

  it("ne moyenne que la période demandée, bornes incluses", () => {
    expect(moyenneScore(h, "2026-09-01", "2026-09-10")).toBe(60);
  });

  it("rend null quand la période est vide", () => {
    expect(moyenneScore(h, "2025-01-01", "2025-12-31")).toBeNull();
  });
});

describe("versOctets", () => {
  const encode = (o: number[]) =>
    Buffer.from(Uint8Array.from(o)).toString("base64");

  it("décode les quatre longueurs de bourrage", () => {
    expect([...versOctets(encode([]))]).toEqual([]);
    expect([...versOctets(encode([1]))]).toEqual([1]);
    expect([...versOctets(encode([1, 2]))]).toEqual([1, 2]);
    expect([...versOctets(encode([1, 2, 3]))]).toEqual([1, 2, 3]);
  });

  it("rend les octets exacts, y compris les extrêmes", () => {
    const tous = Array.from({ length: 256 }, (_, i) => i);
    expect([...versOctets(encode(tous))]).toEqual(tous);
  });

  it("concorde avec Buffer sur des données binaires quelconques", () => {
    // Une image mal décodée serait illisible sans que rien ne le signale :
    // on confronte à l'implémentation de référence de Node.
    for (let i = 0; i < 200; i++) {
      const n = Math.floor(Math.random() * 3000);
      const brut = Buffer.from(Array.from({ length: n }, () => Math.floor(Math.random() * 256)));
      expect(Buffer.from(versOctets(brut.toString("base64")))).toEqual(brut);
    }
  });

  it("préserve les marqueurs d'un JPEG", () => {
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 7), Buffer.from([0xff, 0xd9]),
    ]);
    const rendu = Buffer.from(versOctets(jpeg.toString("base64")));
    expect(rendu.length).toBe(jpeg.length);
    expect(rendu.subarray(0, 4).toString("hex")).toBe("ffd8ffe0");
    expect(rendu.subarray(-2).toString("hex")).toBe("ffd9");
  });

  it("tolère les sauts de ligne", () => {
    const b64 = Buffer.from("donnée de test").toString("base64").replace(/(.{4})/g, "$1\n");
    expect(Buffer.from(versOctets(b64)).toString()).toBe("donnée de test");
  });
});

describe("base64DepuisDataUri", () => {
  it("extrait la charge utile", () => {
    expect(base64DepuisDataUri("data:image/jpeg;base64,QUJD")).toBe("QUJD");
  });

  it("refuse ce qui n'est pas un data URI", () => {
    expect(base64DepuisDataUri(undefined)).toBeNull();
    expect(base64DepuisDataUri("")).toBeNull();
    expect(base64DepuisDataUri("https://exemple.fr/a.jpg")).toBeNull();
    // Un chemin de bucket ne doit jamais être pris pour une image en clair.
    expect(base64DepuisDataUri("abc-uuid/123.jpg")).toBeNull();
  });
});
