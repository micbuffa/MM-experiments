# Marble Madness Web (3D + Émulation Arcade)

Wrapper web 3D pour **Marble Madness (Atari System I, 1984)** : le cœur arcade original (**EmulatorJS 4.2.3 + MAME 2003-Plus**) reste l’unique autorité pour la physique, les règles, le score, le chrono et le son, tandis que **BabylonJS 9.33.2** offre un rendu 3D temps réel fidèle au pixel près en vue arcade, ainsi que des caméras 3D dynamiques, une borne arcade 3D dans un bar explorable et une distribution statique dédiée aux bêta-testeurs.

---

## Résumé du travail accompli

### 1. Cœur arcade, commandes et confort (Prototype 01)

- Emulation **Atari System I** locale via **EmulatorJS 4.2.3 + MAME 2003-Plus** (WebAssembly, empreintes SHA-256 vérifiées au chargement, ROM `marble.zip` et BIOS `atarisy1.zip` assemblés en mémoire).
- Commandes trackball relatives au **trackpad / souris** via Pointer Lock, avec boost **Espace** et jeu 2 joueurs (**J1** trackpad/souris, **J2** clavier).
- Pause propre sur **Échap**, gestion des pertes de focus et purge des entrées.

### 2. Borne 3D Atari System I, bar explorable et son positionnel (Prototypes 02 & 03)

- Reproduction 3D de la borne Atari System I dans un bar explorable en vue première personne (`ZQSD/WASD` + souris), avec commandes cliquables (monnayeur, Start J1/J2, trackballs animées) et transitions de caméra fluides.
- Écran CRT simulé (scanlines, courbure, vignettage) et **mixage audio spatial WebAudio** selon la position du joueur dans le bar.

### 3. Présentation 3D temps réel des 5 niveaux (Prototype 04)

- **Niveau 1 (_Practice Race_)** : relevé complet, rambardes rouges alignées sur les joints avec coudes sphériques, tours d’entrée, fosses, flèches, drapeaux et marquage `GOAL`.
- **Niveau 2 (_Beginner / Intermediate Race_)** : pont articulé, tuyaux et tuyau en Y, vagues, cuvette gelée, tours blanches à dôme ogival et joints épais, vers verts et amibes.
- **Niveau 3 (_Intermediate / Aerial Race_)** : dallage sable, bordures turquoise, vagues animées, arches gothiques d’ouverture, zone `GOAL` et drapeaux alignés.
- **Niveau 4 (_Aerial Race_)** : ponts à arches, catapulte, marteaux, pistons synchronisés sur la mémoire MAME et aspirateurs avec aspiration animée de la bille.
- **Niveau 5 (_Silly Race_)** :
  - Parcours inversé (montant) avec tours, châteaux à 4 quarts de pyramides, mini-billes/vers/amibes écrasables (**`+3 SEC`**), oiseaux volants avec **ombres portées temps réel** et étincelles jaunes de collision murale.
  - **Fin Escher « à la Monument Valley »** : arche voûtée continue découpée sur la couture isométrique, vue arcade fidèle à l’illusion d’optique originale et marqueur `?` au sol visible dans les autres vues 3D.
  - **Survol d’introduction 3D** recalé sur la vraie profondeur du départ avec arche d’altitude et dégagement automatique des reliefs, fondu sans coupure dans la vue de jeu.
- **Caméras 3D & HUD** : 4 caméras (`Arcade`, `Suivi`, `Dessus`, `Poursuite` avec occlusion transparente des murs), zoom `+/-`, HUD natif Score/Chrono/Avis et bascule rapide **Original / Parallèle / 3D** (`V`).

### 4. Distribution statique Bêta (`dist-beta/`)

- Point d’entrée autonome (`beta.html` → `dist-beta/index.html`) en anglais pour les bêta-testeurs :
  - Écran d’initialisation avec barre de progression, cache HTTP activé et chargement paresseux des checkpoints/entités pour accélérer le démarrage.
  - Démarrage automatique en **Attract Mode plein écran CRT (scanlines)** avec surimpression semi-transparente des touches (`5` Insert Coin, `1` Start P1, `2` Start P2) et choix du niveau de départ (`1` à `5`).
  - Passage automatique en **vue parallèle plein écran** (Original CRT à gauche + 3D CRT alignée au pixel près à droite, avec survol d’introduction) et bandeau supérieur (`V` View, `C` Camera, `Space` Boost, `Esc` Pause).

---

## Prérequis et installation

- **Node.js** `>= 24.0.0` (voir `.nvmrc`) et **npm** (`package-lock.json` fait référence).

```bash
npm ci
npm run setup:emulator   # Installe EmulatorJS 4.2.3 + MAME 2003-Plus dans public/vendor/
```

---

## Commandes principales

| Commande                | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`           | Lance le serveur de développement Vite sur `http://127.0.0.1:5173/`                    |
| `npm run build`         | Vérifie TypeScript (`tsc --noEmit`) et génère le build standard dans `dist/`           |
| `npm run build:beta`    | Génère la **distribution statique bêta autonome** dans `dist-beta/`                    |
| `npm run preview`       | Prévisualise le build standard (`dist/`)                                               |
| `npm run preview:beta`  | Prévisualise la distribution statique bêta (`dist-beta/`) sur `http://127.0.0.1:4174/` |
| `npm test`              | Exécute les tests unitaires Vitest                                                     |
| `npm run test:watch`    | Exécute Vitest en mode watch                                                           |
| `npm run test:coverage` | Tests unitaires avec couverture V8 (seuil ≥ 90 % sur les modules métier)               |
| `npm run lint`          | Analyse ESLint (`--max-warnings 0`)                                                    |
| `npm run typecheck`     | Vérification TypeScript stricte sans émission                                          |
| `npm run format`        | Formate le dépôt avec Prettier                                                         |
| `npm run format:check`  | Vérifie le formatage Prettier                                                          |
| `npm run check`         | Chaîne complète : `format:check`, `lint`, `typecheck`, `test:coverage`, `build`        |
| `npm run test:browser`  | Tests navigateur Playwright contre le serveur dev                                      |
| `npm run test:preview`  | Build + tests Playwright contre `vite preview`                                         |

---

## Pages et points d’entrée

- **`index.html`** : application complète (banc d’essai, borne 3D / bar, vue 3D moderne, comparatif et diagnostics).
- **`beta.html`** (ou `dist-beta/index.html`) : version bêta plein écran (attract mode CRT → vue parallèle CRT, sélection niveau 1–5).
- **`terrain.html`** : studio d’inspection des terrains 3D (niveaux 1 à 5, défilement arcade, superposition de captures de référence).
- **`scene.html`** : scène BabylonJS isolée.

### Raccourcis clavier en jeu

- **`5`** : Insert Coin / Crédit
- **`1`** / **`2`** : Start Player 1 / Start Player 2
- **`V`** (ou `Shift+V`) : basculer la vue (Parallèle / 3D seule / Originale seule)
- **`C`** : changer la caméra 3D (`Arcade` → `Follow` → `Overhead` → `Chase`)
- **`+` / `-`** : zoom / FOV
- **`Space`** : boost trackball · **`Esc`** : pause / libérer le pointeur
- **`F2` à `F5`** (en mode dev sur `index.html`) : saut direct au départ des niveaux 2 à 5

---

## Guide pour contributeurs et assistants IA (Claude, Codex, Gemini)

Le dépôt est organisé pour permettre une reprise immédiate par un humain ou un agent IA :

- [AGENTS.md](AGENTS.md) : consignes communes (référencées par [CLAUDE.md](CLAUDE.md), [GEMINI.md](GEMINI.md) et [.github/copilot-instructions.md](.github/copilot-instructions.md)).
- [ARCHITECTURE.md](ARCHITECTURE.md) : responsabilités, modules et règles de dépendance.
- [BABYLONJS_BEST_PRACTICES.md](BABYLONJS_BEST_PRACTICES.md) : conventions BabylonJS (imports ciblés, gestion des ressources, boucles par frame).
- [HANDOFF.md](HANDOFF.md) : journal détaillé de passation, décisions récentes et état exact du projet.
- [docs/PROTOTYPE_04.md](docs/PROTOTYPE_04.md), [docs/DECISIONS.md](docs/DECISIONS.md), [docs/VALIDATION.md](docs/VALIDATION.md) : preuves techniques, mémoire MAME et validations.

> **Note sur les assets** : `roms/marble.zip`, `roms/atarisy1.zip` ainsi que les relevés de terrains et checkpoints (`local-roms/*.json`, `local-roms/*.state`) sont inclus dans ce dépôt expérimental pour faciliter la contribution. Les archives de référence tierces (ex. _Rolling Madness_) et les binaires générés (`public/vendor/`, `dist/`, `dist-beta/`) restent exclus via `.gitignore`.
