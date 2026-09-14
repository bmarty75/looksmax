import { readFileSync, writeFileSync } from "node:fs";

/**
 * Habille le index.html produit par « expo export -p web ».
 *
 * Pourquoi un script et pas app/+html.tsx : ce fichier n'est lu qu'en rendu
 * statique. Avec web.output = "single" — ce dont l'app a besoin pour son
 * routage côté client — Expo impose son propre gabarit et l'ignore. Le
 * gabarit en question sert un <div id="root"> vide, sans fond ni titre : le
 * temps que le bundle arrive, l'écran est blanc. Sur une app sombre, ça se
 * voit.
 *
 * On réinjecte donc après coup ce qu'Expo ne permet pas de déclarer : le fond,
 * le titre, et un écran d'attente aux couleurs de la marque.
 */

const CIBLE = "dist/index.html";

const SOMBRE = { fond: "#0B0B0D", texte: "#FFFFFF", piste: "#202025", ambre: "#F2B01E" };
const CLAIR  = { fond: "#F4F2EE", texte: "#141416", piste: "#EDEAE4", ambre: "#B4820A" };

/**
 * Le thème choisi est déjà dans localStorage sous « lm_theme » (préférence
 * d'appareil, jamais rattachée à un compte). On le lit avant le premier
 * rendu : sinon quelqu'un en thème clair verrait un éclair noir, et
 * réciproquement.
 */
const PEINDRE_TOT = `<script>
(function(){try{
  var t=JSON.parse(localStorage.getItem('lm_theme')||'"dark"');
  var c=t==='light'?${JSON.stringify(CLAIR)}:${JSON.stringify(SOMBRE)};
  var r=document.documentElement.style;
  r.setProperty('--lm-fond',c.fond);r.setProperty('--lm-texte',c.texte);
  r.setProperty('--lm-piste',c.piste);r.setProperty('--lm-ambre',c.ambre);
}catch(e){}})();
</script>`;

const STYLE = `<style id="lm-preamorce">
  body { background-color: var(--lm-fond, ${SOMBRE.fond}); }
  /* Superposition, et non contenu de #root : React monte dans #root et ne
     doit rien avoir à réconcilier. Le layout racine la retire au montage. */
  #preamorce {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
    background-color: var(--lm-fond, ${SOMBRE.fond});
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    transition: opacity .25s ease;
  }
  #preamorce.parti { opacity: 0; pointer-events: none; }
  #preamorce > svg { animation: lm-respire 2.2s ease-in-out infinite; }
  #preamorce-marque { display: flex; align-items: baseline; gap: 7px; }
  #preamorce-marque span { font-size: 23px; font-weight: 800; letter-spacing: 2.5px; color: var(--lm-texte, ${SOMBRE.texte}); }
  #preamorce-marque em { font-style: normal; font-size: 12px; font-weight: 800; letter-spacing: 3px; color: var(--lm-ambre, ${SOMBRE.ambre}); }
  #preamorce-piste { width: 140px; height: 3px; border-radius: 2px; overflow: hidden; margin-top: 6px; background-color: var(--lm-piste, ${SOMBRE.piste}); }
  #preamorce-curseur { width: 70px; height: 3px; border-radius: 2px; background-color: var(--lm-ambre, ${SOMBRE.ambre}); animation: lm-balaye 1.4s ease-in-out infinite; }
  @keyframes lm-respire { 0%,100% { transform: scale(1); opacity: .55 } 50% { transform: scale(1.06); opacity: 1 } }
  @keyframes lm-balaye  { 0% { transform: translateX(-70px) } 100% { transform: translateX(140px) } }
  /* Quelqu'un qui a demandé moins d'animation ne doit pas en subir ici. */
  @media (prefers-reduced-motion: reduce) {
    #preamorce > svg, #preamorce-curseur { animation: none; }
    #preamorce > svg { opacity: 1; }
  }
</style>`;

/** Le même logo que dans l'app : arc dégradé, triangle de lecture au centre. */
const VOILE = `<div id="preamorce" aria-hidden="true">
      <svg width="64" height="64" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="lmArcHtml" x1="18%" y1="0%" x2="92%" y2="98%">
            <stop offset="0%" stop-color="#FF9F0A" /><stop offset="45%" stop-color="#F0800F" />
            <stop offset="78%" stop-color="#8FA843" /><stop offset="100%" stop-color="#3FAF63" />
          </linearGradient>
        </defs>
        <path d="M 71.80 18.87 A 38 38 0 1 0 81.13 71.80" stroke="url(#lmArcHtml)" stroke-width="8" stroke-linecap="round" fill="none" />
        <path d="M 41 33 L 67 50 L 41 67 Z" fill="var(--lm-texte, ${SOMBRE.texte})" />
      </svg>
      <div id="preamorce-marque"><span>LOOKSMAX</span><em>OS</em></div>
      <div id="preamorce-piste"><div id="preamorce-curseur"></div></div>
    </div>
    <div id="root">`;

const REMPLACEMENTS = [
  ['<html lang="en">', '<html lang="fr">'],
  ["<title>looksmax</title>", `<title>LOOKSMAX OS</title>\n    <meta name="theme-color" content="${SOMBRE.fond}" />`],
  ["</head>", `${PEINDRE_TOT}\n${STYLE}\n</head>`],
  ['<div id="root">', VOILE],
];

let html = readFileSync(CIBLE, "utf8");

if (html.includes('id="preamorce"')) {
  console.log("habiller-html : déjà habillé, rien à faire.");
  process.exit(0);
}

for (const [avant, apres] of REMPLACEMENTS) {
  if (!html.includes(avant)) {
    // Expo a changé son gabarit : mieux vaut casser le build que déployer
    // une page à moitié habillée, dont personne ne remarquerait le défaut.
    console.error(`habiller-html : motif introuvable dans ${CIBLE} → ${avant}`);
    console.error("Le gabarit d'Expo a probablement changé. Adapter ce script.");
    process.exit(1);
  }
  html = html.replace(avant, apres);
}

writeFileSync(CIBLE, html);
console.log("habiller-html : fond, titre et écran d'attente injectés.");
