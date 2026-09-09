import { useEffect, useState } from "react";
import type { Photo } from "../lib/photos";
import { urlsPhotos } from "../lib/stockagePhotos";

/**
 * URLs affichables d'un lot de photos, indexées par identifiant.
 *
 * Les images du bucket exigent une URL signée, obtenue par le réseau : elles
 * ne peuvent donc pas se résoudre pendant le rendu. Ce hook s'en charge et
 * ne renvoie que ce qui est prêt — un identifiant absent signifie « pas
 * encore », pas « introuvable ».
 */
export function useUrlsPhotos(photos: Photo[]): Record<number, string> {
  const [urls, setUrls] = useState<Record<number, string>>({});

  // La signature dépend de ce qui est affiché : on ne resigne que si la
  // composition du lot change, pas à chaque rendu.
  const empreinte = photos.map(p => `${p.id}:${p.chemin ?? p.uri?.length ?? 0}`).join("|");

  useEffect(() => {
    let vivant = true;
    urlsPhotos(photos).then(r => { if (vivant) setUrls(r); });
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empreinte]);

  return urls;
}
