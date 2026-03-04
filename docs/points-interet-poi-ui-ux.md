# Points d’intérêt (POI) & Personnalisation de terrain — NavéoMap

## 1) Contexte & objectifs

### 1.1 Utilisateurs (personas / contextes)
- Aventuriers outdoor (rando, trail, VTT) qui utilisent la carte comme **outil de décision** (sécurité + confort).
- Usagers “météo-first” (kitesurf, voile, parapente) qui cherchent des **spots** et veulent savoir si “les conditions sont bonnes”.
- Utilisateurs réguliers (commuting / sorties) qui veulent une **mémoire des lieux** (journal) et des repères réutilisables.

### 1.2 Objectifs produit
- Transformer la carte en **carnet de bord intelligent**: utile *avant*, *pendant* et *après* la sortie.
- Renforcer la différenciation NavéoMap: POI + météo contextualisée + historique.
- Rester fidèle au design system **GentleCalm**: calme, lisible, priorisation dynamique de l’info.

### 1.3 Principes UX directeurs
- **Progressive disclosure**: ne montrer beaucoup que lorsque c’est pertinent.
- **Priorité sécurité**: les POI de refuge / abri doivent émerger quand la météo devient risquée.
- **Capture ultra-rapide** (terrain): 1 geste, 1 confirmation.
- **Reconnaissance > mémorisation**: la carte doit “se souvenir” pour l’utilisateur.

---

## 2) Spécification fonctionnelle (feature spec)

### 2.1 Types de POI (météo-contextuels)
- **Refuges** (montagne / abri organisé)
- **Abris d’urgence** (abri simple, cabane, bâtiment accessible)
- **Stations météo automatiques** (mesures live)

Comportement attendu:
- Affichage sur carte (icônes distinctes)
- Fiche POI (détails + actions)
- Filtre par catégorie

### 2.2 Favoris: spots + “météo idéale”
Fonction:
- Sauvegarder un spot favori.
- Définir une **météo idéale** par spot (ex: vent < 10 km/h, ciel clair).
- Afficher un **Match Score** (badge ou pourcentage) sur la carte et dans les listes.

### 2.3 Notes personnelles (texte / photo)
Fonction:
- Ajouter une note à un lieu (POI existant ou position libre).
- Ajouter une photo.
- Ajouter du texte (clavier) ou dictée.

Données associées (automatiques):
- Horodatage
- Position
- Conditions météo (snapshot au moment de la capture)

### 2.4 Historique / journal des lieux visités
Fonction:
- Historique des lieux visités.
- Conservation d’un “snapshot météo” par visite.

UX attendu:
- Timeline visuelle (cartes souvenirs)
- Comparaison passé vs prévisions actuelles

---

# Audit UX/UI : Points d'Intérêt (POI) & Personnalisation de Terrain - NavéoMap

## 1. Introduction
Ce rapport analyse les fonctionnalités liées aux **Points d'Intérêt (POI)** et à la personnalisation de l'expérience utilisateur dans NavéoMap. L'enjeu est de transformer la carte en un carnet de bord intelligent et adaptatif, fidèle au Design System **"GentleCalm"**.

---

## 2. Ergonomie des POI Météo-Contextuels

### 2.1. Affichage Adaptatif (Smart Visibility)
*   **Analyse Actuelle** : Les POI (refuges, abris, stations) sont chargés et affichés de manière statique sur la carte.
*   **Problème** : Une surcharge visuelle peut nuire à la lisibilité de l'itinéraire principal par beau temps.
*   **Recommandation "GentleCalm"** :
    *   **Visibilité Dynamique** : N'afficher les "abris d'urgence" de manière proéminente (pulsation douce ou couleur plus vive) que lorsque le risque météo sur le trajet dépasse un certain seuil.
    *   **Groupement Intelligent (Clustering)** : Utiliser un clustering qui privilégie le type de POI le plus pertinent selon la météo actuelle (ex: prioriser les abris fermés s'il pleut).

### 2.2. Stations Météo Automatiques
*   **UX Pattern** : Cliquer sur une station météo doit ouvrir une vue "Live" simplifiée, contrastant avec les prévisions pour éviter toute confusion.
*   **Design** : Utiliser des micro-animations pour indiquer la direction du vent en temps réel directement sur l'icône de la station.

---

## 3. Personnalisation & "Météo Idéale"

### 3.1. Sauvegarde de Spots Favoris
*   **Concept de "Météo Idéale"** : L'utilisateur définit ses conditions parfaites (ex: "Vent < 10km/h et Soleil" pour un spot de pique-nique).
*   **Indicateur de Correspondance (Match Score)** : Sur la carte, les favoris devraient arborer un badge de couleur ou un pourcentage indiquant à quel point la météo actuelle correspond à l'idéal défini. 
    *   *Visuel* : Une aura dorée douce pour un "Perfect Match".

### 3.2. Notes & Photos de Terrain
*   **Ergonomie de Capture** : Sur le terrain, la saisie doit être ultra-rapide.
    *   **Bouton "Quick Note"** : Un bouton flottant persistant permettant de prendre une photo et de dicter une note (Speech-to-Text) sans quitter la vue carte.
    *   **Horodatage Automatique** : Enregistrer automatiquement les conditions météo précises au moment de la prise de note/photo pour enrichir le contexte historique.

---

## 4. Historique & Mémoire du Lieu

### 4.1. Journal de Bord Météo
*   **Analyse** : L'historique ne doit pas être une simple liste, mais une **Timeline Visuelle**.
*   **Visualisation** : Présenter les visites passées sous forme de "Cartes Souvenirs" incluant une vignette de la carte, la photo prise, et un résumé météo (ex: "Il faisait 12°C et brumeux lors de votre passage").

### 4.2. Comparaison Temporelle
*   **Fonctionnalité** : Permettre de comparer les conditions d'une visite passée avec les prévisions actuelles pour aider à la décision : *"La dernière fois, le terrain était glissant avec 5mm de pluie, aujourd'hui 10mm sont prévus."*

---

## 5. Synthèse des Recommandations

| Fonctionnalité | Problème UX | Solution Design System |
| :--- | :--- | :--- |
| **Abris d'urgence** | Noyés dans la masse. | Apparition contextuelle lors d'alertes météo. |
| **Spots Favoris** | Consultation manuelle. | Match Score visuel (Aura/Badge) selon l'idéal. |
| **Prise de Note** | Trop de clics requis. | Bouton "Quick Capture" (Photo + Voix). |
| **Historique** | Données froides. | Timeline narrative avec snapshots météo. |
---
*Expertise rédigée par Manus AI - Focus POI & Personnalisation.*

---

## 6) Recommandations complémentaires (GentleCalm) — patterns concrets

### 6.1 Architecture d’interface (carte + couches POI)
- **Règle de lisibilité**: l’itinéraire / navigation reste le contenu #1.
- **POI en couche secondaire**: affichage adapté au zoom, et contextuel au risque météo.
- **Deux accès**:
  - “Sur la carte” (icônes)
  - “Liste” (bottom sheet) pour filtrer/chercher sans surcharger la carte

### 6.2 Smart Visibility (conditions d’apparition)
- POI “refuges / abris”:
  - présence discrète par défaut
  - mise en avant automatique si:
    - risque météo élevé sur la zone/route
    - l’utilisateur est en navigation active
- Stations météo:
  - affichage selon niveau de zoom
  - mise en avant si l’utilisateur consulte souvent le vent/rafales

### 6.3 Clustering orienté contexte
- Cluster = non seulement spatial, mais aussi **sémantique**:
  - si pluie: prioriser abris fermés
  - si vent violent: prioriser refuges/abris + stations météo

### 6.4 “Match Score” favoris: rendre la promesse compréhensible
- Une seule lecture rapide:
  - badge “Perfect”, “Good”, “Poor” ou %
- En GentleCalm:
  - éviter les couleurs agressives
  - réserver l’aura “dorée douce” au niveau *Perfect Match*

### 6.5 Quick Capture (terrain)
- Un bouton flottant unique:
  - Photo (défaut)
  - Dictée (option)
  - Texte (option)
- Toujours afficher:
  - mini-confirmation (“Note enregistrée”) + action annuler

### 6.6 Historique: timeline narrative
- “Cartes souvenirs”:
  - miniature carte + label lieu
  - météo synthèse (temp, pluie, vent)
  - photo si existante
- Comparaison passé vs aujourd’hui:
  - présenter comme aide à la décision (pas comme jugement)

---

## 7) Accessibilité & ergonomie
- Contraste: respecter AA (badges, overlay POI, texte sur carte)
- Cibles tactiles: 44×44px minimum (icônes POI, quick capture)
- Voice:
  - dictée: gérer erreurs et permissions
  - alternatives clavier

---

## 8) Backlog produit (priorisé)

### P0
- Smart Visibility (POI abris/refuges mis en avant en cas de risque)
- Fiche POI: actions rapides (naviguer vers, ajouter note, ajouter favori)
- Quick Capture (photo + dictée) avec snapshot météo automatique

### P1
- Favoris avec météo idéale + Match Score (carte + liste)
- Timeline “cartes souvenirs” avec filtres (par lieu, par type, par date)
- Clustering contextuel (pluie/vent)

### P2
- Comparaison temporelle (visite passée vs prévisions actuelles)
- Gestion offline (caching POI + notes) selon plateformes
- Export / import des notes (format à définir)

---

## 9) Questions à trancher
- Source POI: OSM tags, dataset propriétaire, contributions utilisateurs ?
- Stockage notes/photos: local-first, cloud, sync multi-device ?
- Privacy: notes et historique sont-ils chiffrés côté client ?
- Offline: quel niveau de support (mobile wrapper vs web-only) ?
- Match Score: règles exactes (pondération vent/pluie/temp) et UI (badge vs %)

---

## 10) Synthèse complète — Points d'Intérêt (POI) & Personnalisation de Terrain / NavéoMap

### 10.1 Le vrai problème à résoudre en premier : la surcharge visuelle
Avant de parler de chaque feature individuellement, il faut nommer le problème central de toute feature POI sur une carte : la surcharge. Réduire la charge cognitive est le principe fondateur d'une bonne UI de carte — supprimer les labels, icônes et routes inutiles qui ne servent pas l'objectif immédiat de l'utilisateur.

Pour NavéoMap, ça signifie que les POI ne sont pas juste des marqueurs à afficher — ce sont des informations contextuelles qui doivent apparaître au bon moment, au bon zoom, avec la bonne priorité selon la météo en cours.

### 10.2 Le clustering — natif MapLibre + Supercluster pour la puissance
MapLibre intègre nativement le clustering via son option `cluster: true` sur une source GeoJSON. Il expose automatiquement la propriété `point_count` sur chaque cluster, ce qui permet de styler dynamiquement les groupes selon leur densité — couleur, taille, étiquette — sans code JavaScript supplémentaire.

Mais le clustering natif de MapLibre a une limite : il ne permet pas de logique de priorisation intelligente à l'intérieur d'un cluster. C'est là que **Supercluster** entre en jeu. Supercluster expose des options `map` et `reduce` qui permettent d'agréger des propriétés personnalisées sur chaque cluster — par exemple calculer le niveau de risque maximal parmi tous les POI d'un groupe, ou compter combien d'abris sont disponibles dans une zone.

Concrètement pour NavéoMap, ça donne un cluster d'abris qui affiche directement le niveau de risque météo agrégé de la zone — l'utilisateur voit en un coup d'œil "3 refuges, zone à risque élevé" sans ouvrir quoi que ce soit.

Les labels et icônes doivent être choisis avec soin : ce qui compte — ici les abris d'urgence et stations météo — doit être visuellement plus fort que les POI secondaires, qui s'estompent ou disparaissent à certains niveaux de zoom. Ça se configure entièrement dans le style JSON de MapLibre via les expressions de zoom.

```bash
bun add supercluster
```

### 10.3 Les POI météo-contextuels — visibilité dynamique selon le risque
C'est la feature la plus importante de cette section. L'idée de "n'afficher les abris que quand le risque dépasse un seuil" est juste, mais l'implémentation doit être précise pour ne pas dérouter l'utilisateur.

Le bon modèle mental à adopter est celui des **couches de priorité** :
- Niveau 1 (permanent) : refuges et abris toujours présents, mais discrets (icône petite, couleur neutre, pas de label)
- Niveau 2 (contextuel) : quand un seuil est dépassé (vent > 50 km/h, précipitations > 5mm/h, orage détecté), les abris de la zone concernée montent visuellement (icône plus grande, couleur d'accentuation, label, pulsation douce)
- Niveau 3 (critique) : en cas d'alerte météo sévère, certains abris passent en mode urgence (badge distance, animation plus prononcée)

Cette graduation évite deux écueils : tout afficher en permanence en mode alarme (fatigue visuelle), ou ne rien afficher jusqu'au dernier moment (panique).

Pour les **stations météo automatiques**, une micro-animation de direction du vent sur l'icône est faisable, mais il faut être prudent sur les performances : si la carte affiche beaucoup de stations avec animation, le rendu peut dégénérer sur mobile. Solution : activer les animations uniquement pour les stations visibles dans le viewport, et les désactiver au-delà d'un certain niveau de dézoom.

La fiche d'une station doit distinguer clairement la donnée "Live" (mesure station) des "Prévisions" (modèle météo) : ce sont deux natures d'information différentes.

### 10.4 Spots favoris avec météo idéale — le Match Score
La définition de la météo idéale doit se faire avec des sliders simples (pas des formulaires techniques). L'interface doit proposer des **presets par activité** (randonnée, vélo, surf, pique-nique, photo) que l'utilisateur peut ajuster.

Le **Match Score** est le résultat de la comparaison entre la météo idéale définie et la météo actuelle (ou prévue). Plutôt qu'un effet fragile, une approche robuste:
- badge sur l'icône du favori
- vert > 80%, orange 50–80%, gris < 50%
- fiche détail qui explique: "✓ Vent parfait", "✗ Pluie prévue" sous forme de tags

Pour le stockage des favoris et paramètres, **idb** (IndexedDB) est recommandé.

```bash
bun add idb
```

### 10.5 Notes de terrain — Quick Capture (ergonomie du terrain réel)
Le bouton Quick Capture doit être un FAB persistant (56×56px min), accessible même en navigation.

Flow recommandé:
- 1 tap: ouvrir directement la caméra
- après la photo: bottom sheet minimale
  - texte libre (dictée possible)
  - tags rapides (terrain glissant, sentier bouché, danger…)
  - bouton "Sauvegarder"

La position GPS et les conditions météo sont enregistrées automatiquement.

Point critique: **photos offline**. En outdoor, l'utilisateur peut ne pas avoir de réseau. Photos et notes doivent être sauvegardées localement dans IndexedDB (Blob) et synchronisées quand la connexion revient (Service Worker).

Speech-to-Text:
- Web Speech API par défaut
- fallback clavier si indisponible
- option avancée offline (v2) si retenue

### 10.6 Historique & timeline — mémoire du lieu
La timeline des visites ne doit pas être une page à part : elle doit être intégrée dans la fiche d'un lieu/favori. Afficher une section "Tes visites" avec cards horizontales:
- miniature photo (ou placeholder)
- date
- résumé météo en 3 tokens (temp, vent, condition)

La **comparaison temporelle** doit être proactive: lors de l'ouverture d'un favori, comparer prévisions actuelles aux snapshots historiques et afficher une alerte si les conditions sont similaires ou pires.

Chaque visite doit stocker un snapshot météo (temp, vent, humidité, condition, précipitations).

### 10.7 Architecture des données POI — modèle unifié
```js
// Un POI utilisateur (favori ou spot noté)
const userPOI = {
  id: 'uuid',
  type: 'favorite' | 'note' | 'visited',
  coordinates: [lng, lat],
  name: 'Spot kitesurf Leucate',
  idealWeather: {
    wind: { min: 20, max: 40, direction: ['W', 'NW'] },
    precipitation: { max: 0 },
    temperature: { min: 15 }
  },
  notes: [{
    id: 'uuid',
    text: 'Accès par le parking nord',
    photoBlob: Blob | null,
    weatherSnapshot: { temp, wind, condition, precipitation },
    timestamp: 'ISO8601',
    synced: false
  }],
  visits: [{ timestamp: 'ISO8601', weatherSnapshot: { temp, wind, condition, precipitation } }],
  createdAt: 'ISO8601',
  updatedAt: 'ISO8601'
}
```

### 10.8 Ergonomie & design système — règles à expliciter
- Z-index: POI système (refuges, stations) en dessous des POI utilisateur (favoris, notes)
- Interaction: tap POI -> bottom sheet (pas popup centré)
- Cibles tactiles: 44×44px minimum

### 10.9 Résumé des packages
```bash
bun add supercluster
bun add idb
bun add vaul
```
