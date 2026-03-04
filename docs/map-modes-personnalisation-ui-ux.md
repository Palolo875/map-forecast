# Modes de carte & personnalisation — Spécification + UX/UI (NavéoMap)

## 1) Contexte & objectifs

### 1.1 Utilisateurs & contextes d’usage (hypothèses à valider)
- **Navigation quotidienne** (voiture / urbain)
  - Objectif: se repérer vite, lire l’itinéraire, garder le focus sur les infos utiles.
  - Frictions: surcharge de labels/POI, transitions de styles abruptes, lisibilité au soleil.
- **Outdoor** (rando, vélo, montagne)
  - Objectif: comprendre le relief, l’effort, l’exposition (crêtes/versants) et superposer météo/risques.
  - Frictions: courbes de niveau illisibles sur mobile, manque de relief perceptuel sans hillshade.
- **Reconnaissance terrain** (satellite)
  - Objectif: valider “la réalité” (végétation, pistes, environnement) pour anticiper les conditions.
  - Frictions: labels peu lisibles sur fond complexe.
- **Maritime** (nautique)
  - Objectif: accéder rapidement aux conventions marines (balises, dangers, profondeurs) et unités adaptées.
  - Frictions: densité d’info, conversion mentale (km/h → kt, km → nm), conflits visuels avec météo.

### 1.2 Objectifs produit
- **Différencier** NavéoMap via une carto “météo-sensible” et contextuelle.
- **Réduire la charge cognitive**: le bon mode au bon moment, réglages accessibles mais non intrusifs.
- **Accessibilité & outdoor readiness**: haut contraste + bascule jour/nuit fiable.

### 1.3 Ce qui existe déjà dans le code (état actuel)
- **Sélecteur de mode + thèmes**: `src/components/MapLayerSelector.tsx`
  - Sélecteur visuel par vignettes (2x2) + thèmes (mini previews) + toggles (jour/nuit auto, overlay marin).
- **Bascule auto jour/nuit** (lever/coucher local): `src/hooks/use-map-settings.ts` + `src/map/sun.ts`
  - Intervalle 60s, calcul type NOAA approximation.
- **Rendu carto**: `src/components/MapView.tsx`
  - Routière vectorielle via styles Carto (GL style JSON)
  - Topo raster OpenTopoMap + hillshade (raster-dem terrarium)
  - Satellite raster ESRI World Imagery
  - Overlay OpenSeaMap seamark (raster)
  - Transition douce via `fadeDuration: 300` et `raster-fade-duration: 300`
  - Lisibilité labels sur satellite via halo texte (si couches symbol)
  - Overlay nuit via couche background en opacité
- **Design system (GentleCalm UI)**: tokens CSS dans `src/index.css` + Tailwind tokens `tailwind.config.ts`

> Note: `docs/design-system.md` n’est pas lisible via l’outil (probablement contenu binaire / null bytes). Les tokens “source of truth” utilisés par l’app sont en pratique dans `src/index.css`.

## 2) Feature — Modes de carte (spécification)

### 2.1 Modes proposés
- **Carte routière vectorielle (défaut)**
  - Data: OpenStreetMap (objectif cible) via PMTiles
  - État actuel: styles Carto GL (Positron / Dark Matter)
- **Carte topographique (outdoor)**
  - Data: courbes + relief
  - État actuel: OpenTopoMap raster + hillshade activé
- **Vue satellite / hybride**
  - Data: Mapbox (free tier) ou ESRI tiles
  - État actuel: ESRI World Imagery raster
- **Carte nautique (module marin)**
  - Data: OpenSeaMap
  - État actuel: overlay seamarks raster (tiles openseamap)

### 2.2 Bascule automatique jour/nuit
- **Comportement**
  - Si `Jour / nuit auto` activé: l’app calcule lever/coucher à la position de référence et applique le “night state”.
  - Si désactivé: pas d’overlay nuit “auto”.
- **Position de référence** (ordre de priorité)
  - `weatherLocation` (si défini)
  - sinon premier stop de route
  - sinon `flyTo`
  - sinon fallback Paris (48.85, 2.35)

### 2.3 Thèmes de carte personnalisables
- **Thèmes**: `light`, `cream`, `dark`, `high-contrast`
- **Règle actuelle**
  - `dark`: force style routier sombre.
  - `light/cream`: style routier clair, + overlay nuit si `isNight`.
  - `high-contrast`: overrides UI (classe `high-contrast-mode`).

## 3) Audit UX/UI profond (intégré) — recommandations

Cette section reprend et structure les recommandations UX/UI pour qu’elles soient actionnables.

### 3.1 Routière vectorielle (défaut)
#### Points forts
- Lisibilité & netteté (vector)
- Performance (chargement fluide)
- Cohérence avec “GentleCalm UI”

#### Recommandations
- **Hiérarchie d’information dynamique**
  - Objectif: réduire la charge cognitive et laisser “respirer” les données météo/risques.
  - Règle: à zoom élevé, déprioriser rues secondaires + POI non pertinents.
  - Implication UI: proposer un preset “Navigation météo” (labels minimisés).
- **Feedback visuel des conditions**
  - Indices subtils (teinte/texture) pour pluie/vent/risque.
  - Attention: éviter la sur-illustration et préserver le contraste.

### 3.2 Topo (outdoor)
#### Points forts
- Pertinence altimétrique (rando/vélo)

#### Recommandations
- **Hillshading** (déjà présent)
  - Justification: perception 3D immédiate, améliore la lecture des courbes.
  - Pattern industrie: hillshade + contours comme dans les styles outdoor (Mapbox Outdoors / Strava par ex.).
- **Relief × météo**
  - Visualiser exposition: crêtes plus exposées au vent, zones d’ombre pluviométrique.
  - Suggestion: couches “wind exposure” (hachures légères) activables.

### 3.3 Satellite / hybride
#### Points forts
- Réalisme, reconnaissance terrain

#### Recommandations
- **Transition fluide** (déjà présent via `fadeDuration` + `raster-fade-duration`)
- **Lisibilité des labels sur fond complexe** (déjà partiellement présent)
  - Maintenir halo adaptatif (clair/sombre) selon luminance.
  - Vérifier que le style satellite possède bien des couches symbol; sinon prévoir un mode “Hybrid” avec labels dédiés.

### 3.4 Nautique (OpenSeaMap)
#### Points forts
- Valeur ajoutée pour un segment “marine”

#### Recommandations
- **Mode dédié + unités spécifiques**
  - Quand mode nautique ou overlay marin actif: afficher vitesses en `kt` et distances en `nm`.
  - État actuel: un indicateur `kt · nm` est affiché dans `Index.tsx` quand `isNauticalMode`.
- **Hiérarchie d’info nautique**
  - Prioriser dangers, balises, profondeurs.
  - Prévoir un réglage d’opacité de l’overlay (ex: 60–90%) si conflit avec météo.
- **Symboles standard**
  - S’aligner sur conventions marines: réduire l’ambiguïté pour experts.

## 4) Navigation & UI — Sélecteur de carte

### 4.1 Pattern recommandé
- **Un seul bouton “Carte”** qui ouvre un popover/drawer contenant:
  - Modes (vignettes)
  - Thèmes (thumbnails)
  - Toggles (jour/nuit auto, overlay marin)

### 4.2 État actuel (déjà aligné)
- `MapLayerSelector` implémente:
  - **Vignettes** pour les 4 modes
  - **Aperçus** pour les thèmes
  - **Progressive disclosure** via popover (n’encombre pas la carte)

### 4.3 Améliorations UX proposées
- **Gestuelle “switch rapide”**
  - Appui long sur le bouton “Carte” pour basculer sur le mode précédent ou un favori.
- **Favoris**
  - Permettre d’épingler 1 mode et 1 thème.
- **Texte d’aide contextuel**
  - Si `auto jour/nuit` actif: indiquer “selon lever/coucher du soleil” (déjà présent) + possibilité “prévisualiser nuit”.

## 5) Accessibilité & haut contraste

### 5.1 Objectifs
- Lisibilité en plein soleil
- Compatibilité déficiences visuelles
- Cibles tactiles ≥ 44×44px

### 5.2 État actuel
- Classe `high-contrast-mode` dans `src/index.css`:
  - Bordures noires, suppression ombres, texte renforcé.

### 5.3 Recommandations
- **Couleurs de risque**
  - Définir un set “sémantique” (danger/warn/safe) avec contrastes WCAG.
- **États interactifs**
  - Focus visible déjà défini; vérifier hover/active/disabled.

## 6) Notes techniques (implémentation) — pour garder la feature robuste

### 6.1 Switch de styles & persistance des couches
- Pattern recommandé (industrie): lors d’un `setStyle`, certaines couches custom (route, overlays) doivent être réappliquées après chargement du style.
- État actuel:
  - L’app s’appuie sur `styleTick` (incrémenté sur `styledata` et `idle`) pour relancer des effets `useEffect` (route/overlay/labels).

### 6.2 Performances
- Raster (satellite/topo) coûteux en data; prévoir:
  - cache navigateur
  - option “économiser données”
  - limites de zoom ou warning en 4G

### 6.3 Qualité du day/night
- Calcul lever/coucher: approximation acceptable pour UI.
- Edge cases:
  - hautes latitudes (jours/nuit polaires)
  - timezone vs UTC (attention à la perception utilisateur)

## 7) Backlog produit (priorisé)

### P0 (impact fort, effort modéré)
- Stabiliser la cohérence “mode nautique” vs “overlay marin” (un seul modèle mental).
- Ajouter réglage d’opacité overlay marin.
- Ajouter un mode “Hybrid” (satellite + labels) si besoin.

### P1
- Favoris (mode/thème)
- Switch rapide (appui long)
- Preset “Navigation météo” (labels minimisés)

### P2
- Relief × météo (exposition au vent)
- Prévisualisation “fin de trajet de nuit” (bascule prédictive)

## 8) Questions à trancher (pour verrouiller le scope)
- **PMTiles OSM**: souhaites-tu remplacer Carto GL dès maintenant, ou garder Carto en attendant l’intégration PMTiles ?
- **Satellite**: Mapbox free tier vs ESRI (licensing / quotas) — quel choix produit ?
- **Nautique**: veux-tu un “mode nautique” complet (base map dédiée) ou uniquement l’overlay seamark ?


## 9) Synthèse complète — Modes de Carte & Personnalisation / NavéoMap

### 9.1 Le moteur — tout repose sur MapLibre GL JS
Le choix du moteur n'est pas vraiment discutable pour ce niveau de qualité : c'est **MapLibre GL JS**. C'est le fork open-source de Mapbox GL avant qu'il ferme son code, il tourne en WebGL, il est rapide, il supporte nativement les PMTiles, les tuiles vectorielles et raster, le hillshading, les transitions entre styles, et il a un écosystème de plugins actif en 2025. Tout ce qui suit s'appuie sur lui.

### 9.2 La carte routière vectorielle (mode par défaut)
Pour le style visuel, l'objectif est de se rapprocher d'Apple Maps ou Google Maps — propre, hiérarchisé, agréable.

Deux options gratuites se distinguent vraiment :
- **Stadia Maps** avec le style **Alidade Smooth** : visuellement le plus proche d'Apple Maps (tons doux, beaucoup d'air, hiérarchie claire entre les routes principales et secondaires), conçu pour recevoir des overlays de données.
- **OpenFreeMap** : alternative 100% gratuite et sans clé API, basée sur OpenStreetMap, pertinente si tu veux zéro dépendance externe.

Pour personnaliser ces styles sans tout coder à la main, **Maputnik** est l'éditeur visuel open-source de styles MapLibre — l'équivalent gratuit de Mapbox Studio : tu ajustes couleurs, épaisseurs de routes, seuils d'apparition des labels, puis tu exportes un fichier JSON que MapLibre consomme directement.

Côté UX, ce mode par défaut doit implémenter une **hiérarchie d'information dynamique selon le zoom**. Ça se configure dans le style JSON via les expressions de zoom MapLibre — pas de code JavaScript nécessaire, c'est déclaratif. Pour NavéoMap, les informations météo et les zones de risque doivent rester lisibles quelle que soit la densité d'information de la carte en dessous.

### 9.3 La carte topographique avec hillshading
OpenTopoMap fournit les tuiles raster avec courbes de niveau, mais le vrai gain visuel vient du **hillshading natif de MapLibre**. En ajoutant une source DEM (Digital Elevation Model) — disponible gratuitement via AWS Terrain Tiles ou des serveurs demo — et un layer de type `hillshade`, on obtient un rendu 3D du relief par simulation d'ombres lumineuses (intensité et direction configurables). Le résultat est beaucoup plus lisible que les courbes de niveau seules, surtout sur mobile.

Pour NavéoMap, la couche météo superposée à ce mode gagne énormément en pertinence : exposition au vent, crêtes dans le brouillard, vallées à l'abri. C'est une des combinaisons les plus puissantes du produit et elle mérite d'être mise en avant.

### 9.4 La vue satellite et hybride
Pour des tuiles satellite gratuites, **ArcGIS World Imagery (ESRI)** est une référence (haute résolution, globale), intégrable directement comme source raster.

Pour un mode hybride (satellite + labels), on superpose les tuiles ESRI avec un style vectoriel MapLibre dont on ne garde que les labels et les tracés de routes, le reste étant transparent.

La transition vectoriel → satellite est un moment UX critique. MapLibre gère un cross-fade natif via `setStyle()` avec l'option `diff: true` qui interpole entre deux états (≈ 300ms).

En mode satellite, il faut absolument configurer le **halo** des labels dans le style JSON :
- `text-halo-color` (semi-transparent blanc/noir selon contexte)
- `text-halo-width` ≥ 2px

### 9.5 Le module nautique
OpenSeaMap s'intègre comme overlay raster via leur tile server public.

L'approche recommandée pour NavéoMap n'est pas un simple bouton "overlay marin" mais un **mode nautique** qui, quand activé :
- passe sur une base plus neutre (fond bleu clair marin),
- active l'overlay OpenSeaMap (balises, phares, profondeurs),
- switche automatiquement les unités UI vers **nœuds (kt)** et **milles nautiques (nm)**.

Point important UX : la couverture OpenSeaMap est hétérogène. Il faut prévoir un indicateur de disponibilité (badge/message dans le panneau de carte) plutôt que laisser l'utilisateur sur une carte vide.

### 9.6 La bascule automatique jour/nuit
Deux outils complémentaires :
- **SunCalc** : calcule lever/coucher du soleil à la minute près pour une coordonnée.
- **Crepuscule** : plugin MapLibre qui génère un layer visuel de transition crépusculaire (dégradé) et peut se rafraîchir en temps réel.

Le thème nuit ne doit pas utiliser un noir pur. Dans l'esthétique GentleCalm, préférer un bleu nuit profond ou un anthracite légèrement saturé (moins de glow, plus doux).

### 9.7 Le sélecteur de thèmes et les vignettes
Le pattern Google Maps est le bon modèle :
- **Type de carte** (sélection exclusive) via vignettes
- **Détails** (overlays indépendants) via toggles

Pour les vignettes, le plus performant est d'utiliser des PNG statiques pré-générées (zone fixe représentative). Alternatives : `map.getCanvas().toDataURL()` (génération), `mbgl-renderer` (server-side) ou une tuile fixe en `background-image`.

Pour l'UI mobile, **Vaul** (Radix-based) est un bon choix pour un bottom sheet gesture-based.

Pour le switching, `map-gl-style-switcher` expose un modèle `StyleItem` (id, nom, URL style, URL thumbnail). Et `maplibre-theme` peut aider à thématiser les contrôles natifs (zoom/boussole) via CSS variables.

### 9.8 L'architecture de l'état — le point de design système le plus important
Séparer l'état entre :
- `baseLayer` : sélection exclusive (routier, topo, satellite, nautique)
- `overlays` : booléens indépendants (vent, précipitations, qualité de l'air, trafic maritime)

Cette séparation correspond au modèle mental (pattern Google Maps) et rend le code plus maintenable. Les overlays météo doivent vivre dans la section "Détails" du sélecteur.

### 9.9 Résumé des packages à installer (Bun)
```bash
bun add maplibre-gl          # moteur carte
bun add suncalc              # calcul lever/coucher soleil
bun add crepuscule           # layer jour/nuit live sur la carte
bun add vaul                 # bottom sheet gesture-based
bun add framer-motion        # transitions UI complémentaires
bun add map-gl-style-switcher # switching de styles avec thumbnails
bun add maplibre-theme       # thème CSS des contrôles natifs
```

Stadia Maps (Alidade Smooth), OpenFreeMap, ArcGIS ESRI tiles et OpenSeaMap sont des sources de tuiles HTTP — pas d'installation Bun, juste des URLs à configurer dans MapLibre. Maputnik est un outil web (pas une dépendance du projet).
