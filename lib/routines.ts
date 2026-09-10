import { storage } from "../hooks/useStorage";

export interface Bascule {
  checked: Record<string, boolean>;
  history: Record<string, number>;
}

/**
 * Coche ou décoche une routine pour une journée, et réaligne l'historique
 * dans la foulée — c'est lui qui alimente le score, le streak et le rang.
 *
 * Partagé entre l'écran Routines et le tableau de bord : le même geste doit
 * produire le même effet des deux côtés, et dupliquer ce calcul le ferait
 * diverger au premier changement.
 */
export async function basculerRoutine(
  jour: string,
  habits: { id: string }[],
  checked: Record<string, boolean>,
  id: string,
): Promise<Bascule> {
  const suivant = { ...checked, [id]: !checked[id] };
  await storage.set(`lm_checked_${jour}`, suivant);

  const faits = Object.values(suivant).filter(Boolean).length;
  const pct = habits.length > 0 ? Math.round((faits / habits.length) * 100) : 0;
  const hist = await storage.get("lm_history", {});
  const maj = { ...hist, [jour]: pct };
  await storage.set("lm_history", maj);

  // Compteur d'eau : c'est la condition du badge d'hydratation, qui compte
  // les verres et pas les journées.
  if (id === "water") {
    const s = await storage.get("lm_stats", { waterCount: 0 });
    const delta = suivant[id] ? 1 : -1;
    await storage.set("lm_stats", { ...s, waterCount: Math.max(0, (s.waterCount || 0) + delta) });
  }

  return { checked: suivant, history: maj };
}
