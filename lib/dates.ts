/**
 * Toutes les journées de l'app sont des journées *locales*.
 *
 * `toISOString()` renvoie une date UTC. En France, entre minuit et 1 h (ou
 * 2 h l'été), elle désigne encore la veille : une routine cochée à 00 h 30
 * était rangée sur la journée précédente, puis semblait disparaître au
 * réveil. À l'ouest de Greenwich, le décalage joue dans l'autre sens et une
 * soirée bascule sur le lendemain. Dans les deux cas le streak et la moyenne
 * 30 jours sont faussés, donc le rang aussi.
 *
 * Ce module est la seule fabrique de clés de journée. Rien d'autre dans le
 * code ne doit appeler `toISOString()` pour dater quelque chose.
 */

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/** Clé « AAAA-MM-JJ » de la journée locale d'une date (aujourd'hui par défaut). */
export function cleJour(d: Date = new Date()): string {
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
}

/**
 * Date locale correspondant à une clé. Positionnée à midi : les additions de
 * jours traversent alors un changement d'heure sans jamais retomber sur la
 * veille ou le lendemain.
 */
export function jourDepuisCle(cle: string): Date {
  const [a, m, j] = cle.split("-").map(Number);
  return new Date(a, m - 1, j, 12);
}

/** Clé de la journée située `delta` jours avant (négatif) ou après une clé. */
export function decalerCle(cle: string, delta: number): string {
  const d = jourDepuisCle(cle);
  d.setDate(d.getDate() + delta);
  return cleJour(d);
}
