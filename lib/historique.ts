import { DEFAULT_HABITS } from "../constants/data";
import { storage } from "../hooks/useStorage";

/**
 * Historique de complétion, une ligne par jour.
 *
 * Il vivait dans un seul objet « lm_history », réécrit en bloc à chaque
 * coche depuis la copie locale. Un appareil en retard — un onglet resté
 * ouvert depuis la veille, un téléphone pas encore resynchronisé — renvoyait
 * sa copie entière et effaçait les journées faites ailleurs. Le streak
 * retombait alors que chaque jour avait été fait.
 *
 * Rangé une ligne par jour, un appareil ne peut écrire que la journée qu'il
 * coche : il n'a plus aucun moyen d'atteindre les autres.
 */

export const PREFIXE_JOUR = "lm_jour_";
const PREFIXE_COCHES = "lm_checked_";
const ANCIEN = "lm_history";

type Coches = Record<string, boolean>;

/**
 * Reconstitue l'historique complet à partir de trois sources, de la plus
 * fiable à la moins fiable :
 *
 * 1. `parJour` — le pourcentage enregistré au moment de la coche ;
 * 2. `ancien`  — l'objet historique d'avant la correction ;
 * 3. `coches`  — les lignes de coches, une par jour.
 *
 * Les coches sont la vérité sur ce qui a été fait : elles ont toujours été
 * rangées une ligne par jour et n'ont donc jamais pu être écrasées d'un
 * appareil à l'autre. Quand une journée a disparu de l'historique mais que
 * ses coches sont là, on la reconstitue — c'est ce qui répare les streaks
 * déjà perdues.
 *
 * Une reconstitution utilise le nombre de routines actuel : elle ne retrouve
 * pas forcément le pourcentage exact du jour, mais elle retrouve toujours
 * qu'il a été fait, et c'est tout ce dont le streak a besoin.
 */
export function assemblerHistorique(
  parJour: Record<string, number>,
  ancien: Record<string, number>,
  coches: Record<string, Coches>,
  nbRoutines: number,
): Record<string, number> {
  const jours = new Set([...Object.keys(parJour), ...Object.keys(ancien), ...Object.keys(coches)]);
  const sortie: Record<string, number> = {};

  for (const jour of jours) {
    const enregistre = typeof parJour[jour] === "number" ? parJour[jour]
      : typeof ancien[jour] === "number" ? ancien[jour]
      : undefined;
    const ligne = coches[jour];

    if (ligne && typeof ligne === "object") {
      const faits = Object.values(ligne).filter(Boolean).length;
      if (faits === 0) {
        sortie[jour] = 0;
      } else if (enregistre !== undefined && enregistre > 0) {
        sortie[jour] = enregistre;
      } else {
        // Journée effacée ou remise à zéro à tort : les coches font foi.
        // Le plafond évite 166 % quand des routines ont été supprimées depuis.
        const denominateur = Math.max(nbRoutines, faits);
        sortie[jour] = Math.min(100, Math.round((faits / denominateur) * 100));
      }
    } else if (enregistre !== undefined) {
      // Pas de ligne de coches : données d'avant leur apparition, on garde.
      sortie[jour] = enregistre;
    }
  }

  return sortie;
}

/** Historique complet du compte actif, réparé si besoin. */
export async function chargerHistorique(): Promise<Record<string, number>> {
  const [parJour, ancien, coches, routines] = await Promise.all([
    storage.parPrefixe(PREFIXE_JOUR),
    storage.get(ANCIEN, {}),
    storage.parPrefixe(PREFIXE_COCHES),
    storage.get("lm_habits", DEFAULT_HABITS),
  ]);
  return assemblerHistorique(
    parJour,
    ancien && typeof ancien === "object" ? ancien : {},
    coches,
    Array.isArray(routines) ? routines.length : DEFAULT_HABITS.length,
  );
}

/** Enregistre le pourcentage d'une seule journée — et rien d'autre. */
export async function enregistrerJour(jour: string, pct: number): Promise<void> {
  await storage.set(`${PREFIXE_JOUR}${jour}`, pct);
}
