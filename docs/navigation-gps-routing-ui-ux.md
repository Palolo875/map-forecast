# Navigation GPS & intelligence de routing — Spécification + UX/UI (NavéoMap)

## 1) Contexte & objectifs

### 1.1 Utilisateurs & contextes d’usage (hypothèses à valider)
- **Conduite** (voiture / moto)
  - Objectif: guidage fiable, lisible, sans distraction.
  - Contraintes: attention partagée, bruit ambiant, usage mains libres.
- **Outdoor** (vélo route, VTT, randonnée, piéton)
  - Objectif: instructions lisibles en mouvement + compréhension du terrain (dénivelé, nature des chemins) + météo.
  - Contraintes: luminosité forte, vibrations, gants, écran petit.
- **Mobilité réduite** (fauteuil roulant)
  - Objectif: itinéraire accessible et explicable (pentes, obstacles, revêtements).
  - Contraintes: tolérance zéro aux “mauvais choix” (escaliers, trottoirs non abaissés).

### 1.2 Objectifs produit
- Rendre un routing “intelligent météo” compréhensible et rassurant.
- Maintenir l’esthétique **GentleCalm** tout en garantissant la **lisibilité en mouvement**.
- Minimiser la charge cognitive: progressive disclosure, actions au bon moment.

### 1.3 Ce qui existe déjà dans le code (état actuel)
- **Routing multi-étapes + profils (V1)**: `src/hooks/use-route-state.ts`
  - Stops dynamiques (départ/étape/arrivée), request route, recalcul à chaque changement.
  - Profils exposés dans l’UI: `auto`, `bicycle`, `pedestrian` (`RouteTab.tsx`).
- **Mode simulation (V1)**: `RouteInspector.tsx`
  - Slider “Simuler un départ” (décalage temporel) + analyse météo/risque.
- **Turn-by-turn (simulation)**: `src/components/route/TurnByTurn.tsx`
  - Carte “Navigation (simulation)” + instruction courante + prochaine + slider de progression.
  - Guidage vocal via **Web Speech API** (`speechSynthesis`) activable.

## 2) Feature — Navigation GPS (spécification)

### 2.1 Navigation turn-by-turn + instructions vocales
- **Affichage**
  - Instruction en cours (prioritaire)
  - Prochaine instruction (secondaire)
  - Distance à la manœuvre + durée
- **Voix**
  - TTS via Web Speech API (web)
  - Cible: offline via TTS natif (mobile) — à définir selon plateforme.

### 2.2 Multi-profils de routing
Profils cibles:
- Voiture
- Vélo route
- VTT
- Piéton
- Randonnée
- Moto
- Fauteuil roulant

### 2.3 Itinéraires multi-étapes
- Ajout/suppression dynamique d’étapes
- Ré-ordonnancement des étapes

### 2.4 Recalcul automatique en cas de déviation
- Détection de déviation
- Reroute automatique avec feedback calme

### 2.5 Mode simulation d’itinéraire (preview)
- Preview avant départ
- Lecture automatique (play) + scrub

### 2.6 Import / Export
- **Import**: GPX / KML / FIT
- **Export**: Strava, Komoot, Garmin Connect, Apple Health

### 2.7 Exclusions configurables
- Tunnels
- Péages
- Routes non-goudronnées
- Autoroutes

### 2.8 Navigation “économique” (itinéraires abrités du vent)
- Routing qui optimise l’exposition au vent (et potentiellement pluie)
- Visualisation claire du gain

---

# Audit UX/UI : Navigation GPS & Intelligence de Routing — NavéoMap

## 1. Introduction
Ce rapport analyse les fonctionnalités de **Navigation GPS** de NavéoMap sous l'angle de l'ergonomie, du Design System **"GentleCalm"** et de l'efficacité navigationnelle. L'objectif est de transformer des outils techniques complexes en une expérience utilisateur fluide et sécurisante.

---

## 2. Ergonomie de la Navigation "Turn-by-Turn"

### 2.1 Lisibilité en Mouvement
- **Analyse actuelle**: le composant `TurnByTurn.tsx` affiche les instructions dans une carte flottante.
- **Problème**: en conditions réelles (vélo, marche), la taille des polices (18px pour l'instruction principale) peut être insuffisante.

**Recommandations GentleCalm**
- **Mode "Plein Écran" automatique**: lors du départ réel, basculer vers une interface simplifiée avec contrastes renforcés.
- **Iconographie directionnelle**: flèches de direction larges et très lisibles (pastels mais suffisamment saturés pour le contraste).
- **Feedback vocal**: Web Speech API est un bon socle.
  - Pattern observé (Google Maps / Komoot): réglages “Voice / Notification / Mute” + réglage volume via boutons physiques.
  - Recommandation: bouton "Répéter" large + accès rapide au mute.

### 2.2 Mode Simulation (Preview)
- **Pattern**: la simulation actuelle via slider est intuitive (desktop).
- **Amélioration**: ajouter un bouton "Play" pour lecture automatique (et un bouton pause).

---

## 3. Intelligence de Routing & Multi-Profils

### 3.1 Profils spécifiques (Fauteuil Roulant, VTT, etc.)
- **Ergonomie**: chaque profil doit avoir son icône + couleur d’accent (prévention d’erreurs de mode).
- **Accessibilité (fauteuil roulant)**: ne pas seulement calculer, mais **visualiser les obstacles** (pentes fortes, marches, surfaces) avec des indicateurs dédiés.
- **Exclusions configurables**: regrouper dans un panneau "Préférences de route" accessible depuis le Hub.

### 3.2 Routing "Économique" (abrité du vent)
- **Concept différenciant**.
- **Visualisation**: tracé “abrité” distinct (pointillés, double stroke, ou aura légère) sans nuire à la lecture.
- **Indicateur de gain**: ex. "15% de vent en moins".

---

## 4. Gestion des flux de données (Import/Export)

### 4.1 Import GPX / KML / FIT
- **User flow**: import par **glisser-déposer** sur la carte + bouton d’import dans le Hub.
- **Validation**: prévisualisation (bounding box) + stats (distance, dénivelé) avant confirmation.

### 4.2 Export vers écosystèmes (Strava, Garmin, Apple)
- **Navigation**: utiliser marques/ico (si permis) pour reconnaissance.
- **Feedback**: confirmation + lien direct vers la destination.

---

## 5. Recalcul & déviation
- **Psychologie UX**: le recalcul peut être stressant s’il est trop fréquent.
- **Solution**: notification sonore douce + message discret contextualisé (ex. "Nouvel itinéraire calculé pour éviter la pluie").

---

## 6. Synthèse des recommandations

| Fonctionnalité | Problème UX | Solution Design System |
| :--- | :--- | :--- |
| **Turn-by-turn** | Texte trop petit en mouvement. | Mode "Large Text" & flèches iconiques. |
| **Multi-profils** | Confusion possible entre modes. | Couleur + icône par profil. |
| **Mode Éco** | Bénéfice peu visible. | Trait distinct + stats de gain vent/pluie. |
| **Import GPX** | Friction technique. | Drag & Drop direct sur la carte. |

---

## 7) Recommandations complémentaires (à partir de l’existant + best practices)

### 7.1 Architecture UI en navigation réelle (anti-distraction)
- **Vue navigation** dédiée (plein écran) avec 3 blocs:
  - Bandeau instruction principale (grand)
  - Bloc secondaire (prochaine manœuvre + distance)
  - Actions rapides (Mute/Unmute, Répéter, Quitter)
- **Progressive disclosure**: masquer tout ce qui n’est pas nécessaire pendant le guidage.

### 7.2 Contrastes & tailles (outdoor)
- Prévoir un mode "Grande lisibilité" (typographie + targets + contraste) activable automatiquement en navigation.

### 7.3 Modèle mental: profils + préférences
- Séparer:
  - **Profil** (voiture/vélo/rando…)
  - **Préférences** (éviter péages, éviter tunnels, éviter non-goudronné…)
  - **Stratégie** (rapide vs sûr vs abrité du vent)

## 8) Backlog produit (priorisé)

### P0
- Mode navigation plein écran + actions rapides (mute/répéter)
- Bouton Play/Pause pour simulation (en plus du slider)
- Couleurs/icônes par profil (prévention d’erreurs)

### P1
- Préférences de route (exclusions) dans un panneau dédié
- Reroute avec feedback “calme” (son + message)
- Import GPX drag & drop + prévisualisation

### P2
- Profils avancés (VTT, rando, moto, fauteuil roulant)
- Export écosystèmes (Strava/Komoot/Garmin/Apple)
- Routing “abrité du vent” + calcul de gain + rendu distinct

## 9) Questions à trancher
- **Plateformes cibles**: web uniquement, ou web + wrapper mobile (pour TTS offline) ?
- **Guidage réel**: on vise une navigation “live GPS” dans l’app, ou une simulation/preview d’abord ?
- **Données accessibilité**: quelle source pour fauteuil roulant (pentes, obstacles) ?


## 10) Synthèse complète — Navigation GPS & Intelligence de Routing / NavéoMap

### 10.1 Décision technique: moteur de routing
Le design et l’ergonomie de la navigation dépendent d’un point: la capacité à recalculer et à ajuster les coûts **en temps réel**, par requête, en fonction:
- du profil (auto/vélo/piéton…)
- des exclusions (péages, tunnels, routes non revêtues…)
- des facteurs météo (vent, pluie, visibilité)

#### Pourquoi Valhalla est un bon fit
**Valhalla** supporte le **dynamic runtime costing**: on peut augmenter ou diminuer le “coût” de segments à la volée, sans reconstruire un graphe complet.

Cas concrets rendus possibles:
- “Routing abrité du vent”: pénaliser les segments exposés (vent de face, rafales)
- “Routing sécurité”: pénaliser les segments identifiés comme risqués (météo, visibilité)
- préférences avancées par profil

Alternative possible si l’auto-hébergement est trop lourd:
- **GraphHopper** (trade-off: flexibilité moindre sur le costing dynamique)

### 10.2 Turn-by-turn: ergonomie, sécurité, charge cognitive
En mouvement, le guidage doit minimiser la **lecture** et maximiser la **reconnaissance**.

#### Hiérarchie d’information recommandée (ordre strict)
- **Distance à la prochaine manœuvre** (élément #1)
- **Pictogramme directionnel** (gauche/droite/rond-point…)
- **Instruction courte** (verbe + repère)
- Nom de rue / numéro de sortie (si disponible)

#### Interactions critiques à rendre immédiates
- **Mute / Unmute** (1 tap)
- **Répéter** (1 tap)
- **Reroute** (auto + feedback “calme”) + action “Annuler” si possible

#### Voix (MVP web)
Le guidage vocal via Web Speech API est acceptable en MVP.
Points à cadrer:
- gestion des interruptions audio (musique/podcast) selon faisabilité
- latence et disponibilité offline (souvent insuffisants en web-only)

### 10.3 Multi-profils = sujet de design system (prévention d’erreurs)
Le risque principal est la confusion de profil (ex: calcul vélo alors que l’utilisateur est en voiture).

#### Règles UI/DS proposées (GentleCalm)
- identité stable par profil:
  - **icône**
  - **couleur d’accent** (teinte discrète mais constante: chips, trace route, headers)
  - **nom + micro-descriptif** (1 ligne)
- présence permanente du profil actif dans la navigation (pas uniquement dans un panneau caché)

#### Profils avancés
- VTT / gravel / rando: contraintes de surface et pente
- Moto: préférences “routes sinueuses” vs “rapide”
- Fauteuil roulant: nécessite une source fiable (pentes, obstacles). Sinon, le présenter comme “beta” avec limites explicites.

### 10.4 Routing économique / “abrité du vent” (différenciation)
Ce mode doit être compris, comparé, et justifié.

#### Pattern recommandé: comparaison à 2 routes
Afficher:
- route “Standard”
- route “Abritée”

Avec un comparatif clair:
- durée
- distance
- indicateur d’exposition au vent (simple, interprétable)

#### Représentation sur carte
- styles de tracés distincts
- explication légère (progressive disclosure): “Pourquoi cette route ?”

### 10.5 Recalcul, reroute et feedback
Objectif: reroute “calme”, non anxiogène, mais explicite.

Recommandations:
- déclenchement automatique en cas d’écart significatif (seuil à définir)
- micro-feedback:
  - message court (“Itinéraire ajusté”)
  - son doux (optionnel)
- conserver le contrôle utilisateur:
  - action “Revenir à l’itinéraire initial” (si techniquement possible)

### 10.6 Simulation & preview (apprentissage et confiance)
La simulation sert à:
- comprendre le turn-by-turn
- vérifier la cohérence d’un itinéraire
- évaluer les risques météo dans le temps (départ + fenêtre optimale)

Recommandations:
- un vrai **Play/Pause** (en plus d’un slider)
- vitesse de simulation (x1, x2, x4)
- état “prévisualisation” clairement distingué de la navigation live

### 10.7 Import / Export (GPX / KML / FIT)
Objectif UX: import en 3 étapes max:
- choisir un fichier
- prévisualiser
- convertir en route éditable (stops)

Packages utiles (web):
```bash
bun add gpxjs
bun add @mapbox/togeojson
bun add fit-parser
bun add simplify-js
```

### 10.8 Export vers Strava / Garmin / Apple Health: contraintes réelles
À cadrer pour éviter un gap “promesse vs réalité”.

- **Strava**:
  - intégration API dépend de politiques d’accès et scopes (à valider)
  - MVP réaliste: export GPX + deep link si disponible
- **Garmin**:
  - écosystème plus fermé; souvent besoin de process de validation
  - MVP: export FIT/GPX
- **Apple Health**:
  - nécessite du natif iOS (HealthKit)
  - web-only: intégration limitée ou impossible

### 10.9 Ergonomie globale: cohérence navigation dans l’app
Pour réduire la charge mentale:
- une seule “porte d’entrée” vers la navigation (CTA stable)
- états clairs:
  - planification
  - preview/simulation
  - navigation active
- éviter que les mêmes actions soient à 2 endroits différents (cohérence et standards)

