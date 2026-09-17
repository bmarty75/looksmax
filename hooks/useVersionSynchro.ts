import { useEffect, useState } from "react";
import { abonnerSynchro } from "./useStorage";

/**
 * Nombre qui augmente à chaque synchro terminée.
 *
 * Un écran le met dans les dépendances de son chargement : il relit alors
 * ses données dès que la synchro en arrière-plan est revenue, au lieu de
 * rester sur ce que le cache contenait au moment de son affichage.
 */
export function useVersionSynchro(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => abonnerSynchro(() => setVersion(v => v + 1)), []);
  return version;
}
