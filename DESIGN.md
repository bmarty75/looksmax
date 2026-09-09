# LOOKSMAX OS — dossier de conception

Document de référence à donner à un outil de maquettage IA. Il décrit l'app
telle qu'elle existe réellement dans le code, après la refonte visuelle.

---

## 1. En une phrase

Application mobile de suivi d'habitudes orientée « looksmaxing » : l'utilisateur
coche ses routines chaque jour, gagne un rang sur l'échelle PSL en fonction de sa
**régularité**, et suit sa progression par des anneaux, une courbe et des photos
avant/après. Comptes en ligne, données synchronisées entre appareils.

**Ton visuel :** sombre, dense, façon tableau de bord biométrique. Cartes très
arrondies sur fond quasi noir, sans bordure ni ombre — c'est le contraste de
fond qui sépare les blocs. Trois couleurs de mesure (ambre, vert, corail) et un
beige crème réservé aux actions principales.

---

## 2. Système de couleurs

### Thème sombre (par défaut)

| Rôle | Hex |
|---|---|
| Fond de page | `#0B0B0D` |
| Carte | `#17171B` |
| Creux (pistes, vignettes, champs) | `#202025` |
| Champ de saisie | `#131316` |
| Bordure | `#232328` |
| Bordure secondaire | `#2C2C32` |
| Texte principal | `#FFFFFF` |
| Texte secondaire | `#9A9AA2` |
| Texte atténué | `#6E6E77` |
| Texte très atténué | `#4C4C54` |

### Thème clair

| Rôle | Hex |
|---|---|
| Fond de page | `#F4F2EE` |
| Carte | `#FFFFFF` |
| Creux | `#EDEAE4` |
| Champ de saisie | `#F4F2EE` |
| Bordure | `#E2DED7` |
| Bordure secondaire | `#D2CDC4` |
| Texte principal | `#141416` |
| Texte secondaire | `#5E5E68` |
| Texte atténué | `#84848E` |
| Texte très atténué | `#A6A6AE` |

### Accents (déclinés par thème)

| Rôle | Sombre | Clair | Usage |
|---|---|---|---|
| Ambre | `#F2B01E` | `#B4820A` | accent principal, 1ᵉʳ anneau, onglet actif, jour courant |
| Vert | `#4BD68C` | `#1F9D5F` | réussite, validation, 2ᵉ anneau |
| Corail | `#EFA08D` | `#C96A50` | 3ᵉ anneau, suppression, alertes |
| Crème | `#F6E3B6` | `#E7C97E` | boutons pleins d'action principale (texte noir dessus) |

Palette de personnalisation des routines et objectifs (inchangée) :
`#C9A96E` `#E07B5A` `#7B9EE0` `#5AC4D4` `#7ECC8A` `#B07ECC` `#CC9B7E` `#E0C55A`
`#E07BB0` `#7BE0C4`.

**Convention d'opacité :** un accent posé en fond se suffixe d'un alpha
hexadécimal — `${couleur}1F` pour une vignette d'icône, `${couleur}22` pour une
pastille, `${couleur}55` pour une bordure.

---

## 3. Typographie et espacements

Police système, aucune police personnalisée.

| Usage | Taille | Graisse | Interlettrage |
|---|---|---|---|
| Marque « LOOKSMAX » | 15 | 800 | 0.6 |
| Nom de section sous la marque | 9 | 700 | 2 |
| Grand titre d'écran | 26 | 800 | 0 |
| Titre de section | 11 | 700 | 1.6 |
| Titre de carte | 16–17 | 800 | 0 |
| Étiquette de mesure | 8.5–9 | 700 | 0.8–1.2 |
| Valeur de mesure | 19–22 | 800 | 0 |
| Index PSL (centre des anneaux) | 42 | 800 | 0 |
| Corps | 11–14 | 400–700 | 0 |
| Texte de pastille | 10 | 800 | 0.4 |

- Marge horizontale de page : **16 px**
- Padding de carte : **18 px** (13–14 px pour les cartes de mesure)
- Rayon : cartes **20 px**, cartes de mesure **16 px**, vignettes d'icône
  **12–14 px**, pastilles et gros boutons **999 px** (pilule)
- Écart vertical entre blocs : **10–12 px**, **22 px** entre sections
- **Pas de bordure sur les cartes** : la séparation vient du fond

---

## 4. Navigation

**Barre d'onglets basse** — hauteur 76 px, fond `#08080A` en sombre, filet
supérieur. Icônes Material en trait, 22 px, libellé 10 px.

| Onglet | Icône Material | Ancien nom |
|---|---|---|
| Biométrie | `monitor-heart` | Dashboard |
| Routines | `checklist` | Habitudes |
| Objectifs | `track-changes` | Objectifs |
| Progression | `insights` | Photos |

**En-tête commun aux 4 onglets** : logo 30 px + « LOOKSMAX » / nom de section à
gauche ; à droite une **pastille du rang PSL** à sa couleur (cliquable, elle
ouvre l'échelle complète) et un rond crème de 34 px qui ouvre le profil (photo de
profil si elle existe, sinon une silhouette). Sous 385 px de large, le mot
« LOOKSMAX » disparaît au profit du seul nom de section, pour ne pas le tronquer.

**Écrans hors onglets** (pile, flèche retour) : Connexion, Mon profil, Comparer.

---

## 5. Écrans

### 5.1 Connexion / Inscription
Centré, sans onglets. Sur-titre ambre « LOOKSMAX OS », titre, sous-titre gris,
champs E-MAIL / MOT DE PASSE en majuscules, bouton plein ambre à texte noir,
lien de bascule. Messages : vert en succès, corail en erreur.

### 5.2 Biométrie
1. En-tête commun.
2. **Ligne de date** : icône calendrier ambre + « AUJOURD'HUI, 9 SEPTEMBRE », et
   à droite une pastille « SEMAINE 37 ».
3. **Bandeau de semaine** : 7 cases lundi→dimanche, nom du jour + numéro. Le jour
   courant passe en **fond ambre plein, texte noir**. Un point vert sous les
   jours où au moins une routine a été faite.
4. **Carte des anneaux** : trois anneaux concentriques (ambre, vert, corail), un
   par catégorie de routine, taux de complétion sur 7 jours. Au centre l'index
   PSL en 42 px, « PSL INDEX », et une pastille du rang. Sous un filet, la
   légende : point de couleur + nom de catégorie + pourcentage.
5. **Trois cartes de mesure** côte à côte (streak, moyenne 30 j, jours actifs) :
   étiquette, valeur, note colorée, et une micro-courbe sur 14 jours.
6. **Carte « Protocole du jour »** : titre, sous-titre, pastille « n RESTANTES ».
   Liste des routines non cochées (vignette d'icône teintée, nom, catégorie,
   cercle vide à droite), puis une barre de progression du jour.
7. **Carte « Trajectoire 7 jours »** : pastille de variation, score sur 100,
   courbe pleine à dégradé, étiquettes S-6…Auj., et un encart creux annonçant le
   prochain rang et le nombre de jours estimé au rythme actuel.

### 5.3 Routines
1. **Carte de statut** : pastille « ● STATUT ACTIF » et « nJ STREAK 🔥 », gros
   compteur « 5 / 8 complétées », pastille verte de pourcentage, **barre
   segmentée** (un segment par routine), et une ligne de bas de carte.
2. **Navigateur de jour** : `‹` — « Aujourd'hui » — `›`. Sur un jour passé le
   libellé passe en ambre avec « MODIFIER CE JOUR » ; la flèche droite est
   désactivée sur aujourd'hui.
3. **Filtres** en pilules horizontales : « Tous (8) », puis une par catégorie ;
   la pilule active porte un point vert.
4. **Cartes de routine** : vignette d'icône teintée, catégorie en majuscules
   colorées + état, nom, puis un **rond de validation** (vert plein avec coche si
   fait, contour vide sinon) et une corbeille.
   *Appui long (mobile) ou clic droit (ordinateur) ouvre l'édition.*
5. Gros bouton crème « AJOUTER UNE ROUTINE » et formulaire dépliable.

### 5.4 Objectifs
1. Sur-titre « PERFORMANCE ENGINE », grand titre « Trajectoire & Cibles »,
   pastille verte « n% DISCIPLINE ».
2. **Carte d'avancement global** : titre ambre, compteur de terminés, barre, et
   pourcentage accompli en vert.
3. Titre de section « PROTOCOLES PRIORITAIRES » + « ⚡ n ACTIFS ».
4. **Cartes d'objectif** : vignette d'icône, nom, restant, et à droite un
   **mini-anneau** de pourcentage (ou pastille « TERMINÉ »). Dessous une ligne
   ACTUEL → restant → CIBLE, une barre de progression, et un bloc creux
   d'ajustement `−` valeur `+`.
5. **Carte de trajectoire 30 jours** : courbe pleine et encart « Discipline sur
   30 jours », explicitement calculée sur les routines réellement cochées.
6. Gros bouton crème « NOUVEL OBJECTIF ».

### 5.5 Progression
Carte de résumé (photos / jours de suivi / jours actifs), deux boutons Caméra et
Galerie, gros bouton crème « COMPARER AVANT / APRÈS », puis les photos groupées
par mois en grille de 2 colonnes avec la date sur un voile noir. Visionneuse
plein écran au clic.

### 5.6 Comparer
Deux modes en pilules (« Côte à côte » / « Curseur »), carte de statistiques
(jours d'écart, jours actifs, écart de score) et deux bandeaux de vignettes pour
choisir chaque photo.

### 5.7 Mon profil
Flèche retour, avatar rond de 104 px bordé d'ambre avec pastille appareil photo,
champs PSEUDO (20) et BIO (160) avec compteurs, e-mail en lecture seule, bouton
d'enregistrement, section de changement de mot de passe, et déconnexion en corail.

---

## 6. Composants partagés

Tous dans `components/ui/index.tsx` :

- **`Card`** — fond carte, rayon 20, padding 18, sans bordure.
- **`SectionTitle`** — 11 px, majuscules, interlettrage 1.6, texte secondaire ;
  accepte un élément à droite.
- **`Pill`** — pilule à fond creux, texte 10 px gras, point de couleur optionnel.
- **`ProgressBar`** — piste creuse, remplissage arrondi coloré.
- **`SegmentBar`** — une barre par élément à accomplir.
- **`Rings`** — anneaux concentriques, `valeurs[0]` étant l'extérieur, contenu
  libre au centre.
- **`MiniRing`** — anneau unique avec le pourcentage au centre.
- **`Sparkline`** — micro-courbe sans axes.
- **`AreaChart`** — courbe lissée à dégradé, ligne de cible optionnelle.
- **`BigButton`** — pilule crème pleine, texte noir, icône optionnelle.
- **`ScreenHeader`** — en-tête commun aux onglets.
- **`ConfirmDialog`** — superposition noire, carte centrée, Annuler / action corail.

---

## 7. Système de rangs (échelle PSL)

| Rang | PSL | Rareté | Score | Streak requis | Couleur |
|---|---|---|---|---|---|
| Sub-3 | < 3 | ~5 % | 0–14 | — | `#5A5A5A` |
| Sub-5 | 3–4.5 | ~20 % | 15–29 | — | `#8A8A8A` |
| LTN | 4.5–5 | ~25 % | 30–44 | — | `#7B9EE0` |
| MTN | 5–5.5 | ~30 % | 45–59 | — | `#5AC4D4` |
| HTN | 6–6.5 | ~15 % | 60–71 | — | `#7ECC8A` |
| Chadlite | 7–7.5 | top 5 % | 72–83 | 21 j | `#C9A96E` |
| Chad | 8–9 | top 1 % | 84–91 | 45 j | `#E07B5A` |
| Gigachad | 9–9.5 | top 0.1 % | 92–99 | 60 j | `#F0D090` |
| True Adam | 10 | 1/10 milliards | 100 | 365 j | `#B07ECC` |

Le score (0–100) combine **20 % la journée en cours, 40 % le streak** (plafonné à
60 jours) **et 40 % la moyenne sur 30 jours**. L'index PSL affiché est ce score
interpolé dans la tranche du rang atteint. Le **niveau** monte d'un cran tous les
7 jours réellement actifs.

---

## 8. Logo et icône

Carré à coins très arrondis, fond `#0F0F12`. Arc ouvert de 270° parcouru dans le
sens antihoraire, pointe **orange** en haut (1 h) et pointe **verte** en bas à
droite (4 h), ouverture à droite. Dégradé `#FF9F0A → #F0800F → #8FA843 →
#3FAF63`. Triangle de lecture blanc au centre.

Le composant `components/brand/Logo.tsx` le reproduit en SVG ; les fichiers
`assets/images/icon.png`, `favicon.png` et `splash-icon.png` en sont dérivés.

---

## 9. Contenu par défaut

**Routines :** ✨ Skincare, 💪 Workout, 🌙 Sommeil 8h, 💧 2L d'eau,
🥩 Nutrition, 🧍 Posture, ✂️ Grooming, ☀️ SPF.
**Catégories :** skin, body, nutrition, recovery, mental, custom.
**Badges :** 🌱 1ère routine, ⚔️ Week Warrior, 💎 Perfect Day, 👑 Month King,
💧 Hydraté, 🌟 Glow Up, 🎯 Goal Getter, 🔱 GODMODE.
**Objectifs :** ⚖️ Perdre 5kg, 🔥 Streak 30 jours, ✨ Skincare routine.

L'app est **entièrement en français**, au tutoiement.

---

## 10. Consigne courte pour un générateur de maquettes

> Application mobile de suivi d'habitudes, thème très sombre (fond `#0B0B0D`,
> cartes `#17171B` sans bordure ni ombre, coins arrondis à 20 px). Trois couleurs
> de mesure : ambre `#F2B01E`, vert `#4BD68C`, corail `#EFA08D` ; boutons
> principaux en pilule beige crème `#F6E3B6` à texte noir. Écran principal :
> bandeau de semaine avec le jour courant en pastille ambre, grande carte à trois
> anneaux concentriques avec un index chiffré au centre, rangée de trois petites
> cartes de mesure à micro-courbes, carte de tâches du jour, carte de trajectoire
> à courbe dégradée. Barre d'onglets basse à 4 entrées en icônes de trait.
> Titres de section en petites majuscules espacées et grisées. Interface en
> français.
