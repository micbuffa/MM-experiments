# Passation

## Optimisations GPU/CPU (Intel UHD 630 & batterie) et outils d'étude — 23 novembre 2026

- **Cache Shadow Map statique + 2048×2048** ([createPracticeSun.ts](src/rendering/createPracticeSun.ts), [createTerrainStudy.ts](src/rendering/createTerrainStudy.ts), [createLivePracticeView.ts](src/rendering/createLivePracticeView.ts), [createLevel6Terrain.ts](src/rendering/createLevel6Terrain.ts)) :
  - Shadow map plafonnée à `2048 × 2048` (4× moins de fillrate que `4096 × 4096`).
  - `REFRESHRATE_RENDER_ONCE` activé sur les niveaux statiques (1, 2, 3, 6) avec invalidation ciblée (`invalidatePracticeShadows`) uniquement quand `startLift`, `bridgeStep` ou `level6MazePhase` change ; mode `half-rate` (1 frame sur 2) en qualité `Eco` pour les niveaux à ombres mobiles (4, 5 ou ombres de bille).
  - Désactivation du PCF coûteux en mode `Eco` (`applyPracticeShadowQuality`).
  - Gel des matrices monde (`freezeWorldMatrix`) et `isPickable = false` sur les maillages statiques du terrain.
- **Découplage du rendu 3D et _frame-skip_ adaptatif** ([createVideoView.ts](src/app/createVideoView.ts)) :
  - `refreshModern()` ne rend plus BabylonJS synchronement dans `marbleOnVideoFrame` : il planifie un `requestAnimationFrame` dédié (`runModernFrame`) et adapte automatiquement un _frame-skip_ 3D (`0..2`) si une frame dépasse `14 ms`, pour garder MAME, WebAudio et la lecture trackball verrouillés à 60 Hz sans glitches audio ni latence trackpad.
- **Sélecteur de qualité `Eco / Balanced / High` + détection auto Intel UHD** ([betaState.ts](src/beta/betaState.ts), [beta.html](beta.html), [beta.ts](src/beta.ts)) :
  - Détection WebGL `UNMASKED_RENDERER_WEBGL` basculant automatiquement en `Eco` sur Intel HD/UHD Graphics ou rendu logiciel, basculable à tout moment via le menu Attract Mode ou la touche **`G`** en jeu.

## Niveau 6 : Ultimate Race et labyrinthe dynamique à 4 phases — 23 novembre 2026

- **Analyse ROM 68010 et relevé MAME natif** ([scripts/survey-level6.mjs](scripts/survey-level6.mjs), `local-roms/level6-terrain.json`, `local-roms/level6-web.state`) :
  - Descripteur ROM `0x2e790` (`recordBase = 0x8136a`, `maxDiag = 0xc8`, grille `122 × 122`, départ `scroll = -16168`, `x = 92, z = 132, h = 16384`).
  - Les **112 slots dynamiques** (`0x40076e..0x40084c`, 317 cellules mutables dans `x = 76..117, z = 78..117`) sont tous pilotés par la table cyclique à **4 phases** en ROM `0x24e2a..0x24e42` :
    - `0x24e2a` → phase `0` (`0x24e4e`, 112 mots)
    - `0x24e32` → phase `1` (`0x24f32`, 112 mots)
    - `0x24e3a` → phase `2` (`0x25016`, 112 mots)
    - `0x24e42` → phase `3` (`0x250fa`, 112 mots)
    - Cadence mesurée en jeu réel : **41–42 frames par phase** à 60 Hz (`~0,683 s`, cycle complet `~2,75 s`), bouclée par la sentinelle `0xffffffff` en `0x24e4a` et exposée dans la Work RAM `0x400978`.
  - Les 9 acteurs du niveau 6 (1 bille noire sur le losange de glace, 4 vers sur les pentes striées, 4 amibes sur les plateaux pêche) sont déjà lus directement par `readIntermediateActors`.
- **Lecture temps réel et présentation 3D BabylonJS** ([practicePose.ts](src/emulation/practicePose.ts), [practiceTerrain.ts](src/game/modern/practiceTerrain.ts), [level6DisplayTerrain.ts](src/rendering/level6DisplayTerrain.ts), [createLevel6Terrain.ts](src/rendering/createLevel6Terrain.ts), [arcadeTerrainPaint.ts](src/rendering/arcadeTerrainPaint.ts), [createPracticeGoal.ts](src/rendering/createPracticeGoal.ts)) :
  - `readPracticePose` reconnaît `0x2e790` (`level: 'level6'`) et expose `level6MazePhase` (`0 | 1 | 2 | 3`) lu en direct depuis `0x400978` (synchronisation 100 % verrouillée sur le cœur 68010, aucune dérive).
  - `createLevel6Terrain` construit les falaises rouge carmin, le plateau de départ ambre moucheté et la rampe blanche lissée, l'îlot carré creux à fond ambre, les 2 tunnels triangulaires orange, les bandes de glace turquoise, les 2 plateaux pêche à losanges, les 2 pentes grises striées, le losange de glace à 4 pyramides grises (`createPracticeTower`), le marquage `GOAL` et ses 2 drapeaux damier orange/noir.
  - Les 4 phases du labyrinthe (blocs gris foncé, bloc ambre, bloc glace turquoise et leurs falaises rouges + ombres) sont **pré-construites une seule fois** dans `level6-maze-phase-0..3` et basculées en O(1) via `setLevel6MazePhase` sans aucune allocation par frame. En vue d'étude `terrain.html`, un minuteur dédié cycle automatiquement les 4 phases à la cadence arcade exacte (`41 / 60 s`).
- **Intégration `terrain.html`, `index.html` (`F6`) et `beta.html` (`6 · Ultimate`)** ([terrain.html](terrain.html), [src/terrain.ts](src/terrain.ts), [index.html](index.html), [src/ui/feasibility.ts](src/ui/feasibility.ts), [beta.html](beta.html), [src/beta/betaState.ts](src/beta/betaState.ts), [src/beta.ts](src/beta.ts), [scripts/build-beta.mjs](scripts/build-beta.mjs)).
- **Validation** :
  - `npm run check` réussi (format, lint, typecheck, couverture V8, build Vite) + `npm run build:beta` réussi.
  - Vérification visuelle Chrome WebGL2 sur `terrain.html` : départ/tunnels orange, losange de glace + 4 pyramides, et 2 captures du labyrinthe à 0,75 s d'écart confirmant la bascule fluide des blocs apparaissants/disparaissants et de leurs ombres.
  - Fix CI inclus : timeout `expect.poll` relevé à `15 000 ms` dans [tests/browser/terrain.spec.ts](tests/browser/terrain.spec.ts).
  - Prochaine action : test joué complet du niveau 6 en vue parallèle (original vs 3D) dans `beta.html` ou `index.html`, puis commit/push et redéploiement GitHub Pages sur demande.

## Niveau 5 : fin Escher « à la Monument Valley » (Option 1) — 23 novembre 2026

- **Suppression du viaduc artificiel et du mur jaune sous la bille** ([level5DisplayTerrain.ts](src/rendering/level5DisplayTerrain.ts)) :
  - Le tablier surélevé à `H = 16416` du pont d'approche ne couvre plus que les 6 cases natives de la passerelle (`X = 29..34, Z = 21..23`) au lieu de `X = 29..43`. Au-delà de `X = 35`, le sol reste à sa vraie hauteur basse `H = 16368`, parfaitement de niveau avec le reste du plateau autour des tours : plus aucun mur jaune sous la bille bleue.
  - `level5FinishDepth` décale la bille de `(+6, +6, +48)` le long du rayon de visée isométrique sur une zone élargie en `Cadrage arcade` (`X < 33 * 8, Z < 21 * 8`, projection identique au pixel près sans aucun découpage de la bille par le bord du tablier haut), et de manière serrée (`X < 29 * 8 + 6, Z < 18 * 8 + 4`) dans les autres vues autour du marqueur `?` au sol (`level5-escher-hint`, masqué automatiquement en `Cadrage arcade` via `scene.onActiveCameraChanged`).
- **Bonus `+3 SEC` à l'écrasement des miniatures et étincelle jaune des oiseaux contre les murs** ([practicePose.ts](src/emulation/practicePose.ts), [createPracticeCatchUpLabel.ts](src/rendering/createPracticeCatchUpLabel.ts), [createLivePracticeView.ts](src/rendering/createLivePracticeView.ts), [level5Actors.ts](src/emulation/level5Actors.ts), [createLevel5Actors.ts](src/rendering/createLevel5Actors.ts)) :
  - Vérifié dans la ROM 68010 (`0x19348 : ADDQ.W #3, $6a(A2)` puis `JSR 0x285b0` avec l'index `14` → pointeur `0x2242e` dans `player+0xec`). `practicePose` lit désormais `0x2242e` (`timeBonusSeconds: 3`) en plus de `0x22446` (`10`), et `createLivePracticeView` affiche le panneau 3D **`+3 SEC`** au-dessus de la bille.
  - Vérifié dans la ROM 68010 (`0x19d2c → 0x224e2..0x22542` pour collision murale et `0x19e04 → 0x22546..0x22556` pour collision joueur) : `level5Actors` expose `birdSpark` (`'flash'` pendant `0x224f2..0x22526`, puis explosion jaune en 3 étapes `1/3..1` sur `0x2252a..0x2253e` / `0x2254a..0x22552`), rendu dans `createLevel5Actors` par un maillage d'étoile jaune vif calibré au gabarit natif `16×16` (`outer = 0,42`, rayon max `~0,50` case, pré-alloué et possédé par la scène).
- **Alignement strict, hauteur et coudes sphériques des rambardes rouges du niveau 1** ([createPracticeLandmarks.ts](src/rendering/createPracticeLandmarks.ts), [createPracticeGuardrail.ts](src/rendering/createPracticeGuardrail.ts), [createPracticeLandmarks.test.ts](src/rendering/createPracticeLandmarks.test.ts)) :
  - Recalage des 5 premières rambardes rouges (`rails[0..4]`) exactement sur les lignes de joints du dallage (`X = 17/25`, `Z = 17/25`) au lieu des valeurs biaisées `16,7`, `25,4`, `24,98`, `25,15` : en vue du dessus, chaque segment est strictement parallèle aux joints du sol.
  - Relèvement de la hauteur des montants (`railHeight = 0,78`, `leftUpperPost = 0,62`) pour retrouver la hauteur et la longueur d'ombre portées de l'arcade originale en vue `Cadrage arcade`.
  - Ajout d'une rotule sphérique (`practice-rail-*-joint-*`, diamètre `0,38`) au sommet de chaque montant dans `createPracticeGuardrail` afin que chaque angle entre tube horizontal et tube vertical soit parfaitement jointif sans encoche.
  - Complétion du coin `SW` manquant sur les bords des deux fosses supérieures (`Z = 12, X = 25..27` et `Z = 24, X = 13..15`) pour supprimer les triangles dentelés près des rambardes, ainsi que sur la marche `(X = 27, Z = 31)` sous le pied de la tour de droite afin qu'elle soit complète et symétrique à `(X = 31, Z = 27)`.
- **Distribution statique beta (`dist-beta/`) et dépôt GitHub `micbuffa/MM-experiments`** ([beta.html](beta.html), [src/beta.ts](src/beta.ts), [src/beta.css](src/beta.css), [src/beta/betaState.ts](src/beta/betaState.ts), [vite.beta.config.ts](vite.beta.config.ts), [scripts/build-beta.mjs](scripts/build-beta.mjs)) :
  - `npm run build:beta` produit une distribution 100 % statique en anglais dans `dist-beta/` (`base: './'`, `index.html` + `beta-data/` + `vendor/emulatorjs/`), testable localement via `npm run preview:beta`.
  - Écran d'initialisation avec barre de progression et 3 optimisations de démarrage : (1) savestate d'Attract Mode `local-roms/attract-web.state` (`4,6 Ko` compressé) restauré dès le démarrage via `session.restoreRawState` pour sauter le POST Atari System 1 ; (2) Service Worker Cache-First (`scripts/beta-sw.js` → `dist-beta/sw.js`) + cache IndexedDB (`src/beta/betaCache.ts`) pour `marble.zip` assemblé ; (3) encodage binaire compressé `rolling-actors.bin` (`src/emulation/rollingActorsBinary.ts`) remplaçant le JSON de 6,7 Mo.
  - Passage automatique en **vue parallèle plein écran** avec cadres `4:3` alignés au pixel près et effet CRT à scanlines identique sur les deux vues (original à gauche, 3D à droite), sans double réinitialisation du survol sur le niveau 1, et bandeau supérieur semi-transparent (`V` View, `C` Camera, `Space` Boost, `Esc` Pause).
  - Dépôt Git initialisé et associé à `https://github.com/micbuffa/MM-experiments.git` avec `.gitignore` excluant Rolling Madness (`Rolling Madness 3D 2005/`, `3D_assets_for_animated_entities/`, `local-roms/rolling-actors.json`) et les artefacts générés, tout en versionnant `roms/` (ROM/BIOS), les relevés terrain/checkpoints et la documentation développeur/IA.
- **Ombre portée des oiseaux dans la vue 3D** ([createRollingActor.ts](src/rendering/createRollingActor.ts), [createLevel5Actors.test.ts](src/rendering/createLevel5Actors.test.ts)) :
  - Inscription automatique des maillages d'oiseaux (`bird`, `bird_fast`, `bird_expl`) comme émetteurs d'ombres sur le `ShadowGenerator` de la lumière `key` (`addShadowCaster(mesh, false)`), avec `receiveShadows = false` pour éviter l'auto-ombrage sur leurs ailes animées.
- **Survol d'introduction du niveau 5 sans traversée du modèle 3D** ([createLivePracticeCamera.ts](src/rendering/createLivePracticeCamera.ts), [createLivePracticeView.test.ts](src/rendering/createLivePracticeView.test.ts)) :
  - Recalage de `startCenter` sur la vraie profondeur du départ (`startDepth = Vector3.Dot(startAim, arcadeDir)`) au lieu du plan `dot = 0` passant par l'origine : sur le niveau 5 (qui monte depuis le bas-droite), l'œil final `startEye` se trouve désormais bien au-dessus et devant la plateforme de départ au lieu d'être enfoui sous la falaise.
  - Ajout d'une arche de survol en altitude (`flyoverArc = 18` sur le niveau 5, `finishEye` reculé à `34` unités) qui zoome progressivement jusqu'au cadrage arcade de départ, doublée d'un plancher de dégagement dynamique `keepClearOfTerrain` le long de l'axe de visée `arcadeDir` pour empêcher toute traversée des reliefs ou tours.
- **Alignement du décal `GOAL` en fin de niveau 3** ([createLevel3Materials.ts](src/rendering/createLevel3Materials.ts), [createPracticeGoal.ts](src/rendering/createPracticeGoal.ts), [createLevel3Materials.test.ts](src/rendering/createLevel3Materials.test.ts)) :
  - Décalage de `level3Goal` de `z = 100` à `z = 101` (`{ x: 92, z: 101, width: 4, length: 10 }`) pour couvrir la rangée finale `z = 110` sans sol beige apparent à droite, et libérer les deux cases terminales des bordures turquoise (`z = 100`).
  - Maintien des deux drapeaux à damier sur les extrémités des bordures turquoise (`flagZ = goalRegion.z - 1` soit `z = 100`) dans `createPracticeGoalFlags`.
- **Dômes ogivaux et joints épais des 3 tours du niveau 2** ([createIntermediateTower.ts](src/rendering/createIntermediateTower.ts), [intermediateLandmarks.ts](src/rendering/intermediateLandmarks.ts), [createIntermediateTower.test.ts](src/rendering/createIntermediateTower.test.ts), [intermediateLandmarks.test.ts](src/rendering/intermediateLandmarks.test.ts)) :
  - Base hexagonale `outline(2, 2)` découvrant les deux cases grises latérales du socle bleu, profil courbe ogival continu en 9 anneaux (`0 → 5,5 → 11 → 16 → 19,5 → 22,5 → 24,5 → 25,5 → 26`) avec couronne légèrement arrondie et ombre portée fidèle au galbe original.
  - Matériau procédural dédié `createIntermediateTowerMaterial` (`intermediateTowerStone`) avec joints sombres épais, ceinture horizontale marquée à `h = 16` et panneaux alignés de bas en haut sur les deux étages.
- **Châteaux à 4 quarts de pyramides sans pointe centrale** ([createLevel5Terrain.ts](src/rendering/createLevel5Terrain.ts), [createLevel5Terrain.test.ts](src/rendering/createLevel5Terrain.test.ts)) :
  - Suppression de la 5e pyramide centrale erronée sur les 3 blocs châteaux (`[36, 27]`, `[11, 28]`, `[48, 36]`) : le sommet gris visible en arrière-plan dans l'arcade originale est le 4e coin arrière du couronnement, pas une pointe centrale.
- **Arche voûtée en porte-à-faux découpée sur la couture Escher** ([level5Bridge.ts](src/rendering/level5Bridge.ts), [level5Bridge.test.ts](src/rendering/level5Bridge.test.ts)) :
  - `openLevel5Bridge` retire aussi la paroi verticale d'extrémité en `X = 35, Z = 21..24` afin de ne pas fermer la couture Escher.
  - `level5BridgeGeometry` construit une vraie voûte en berceau continue sur `Z = 21..24` (`alongStart = 30`, `alongSpan = 3.5`, `crownArcade = 16408`, `springArcade = 16376`) découpée le long de la droite isométrique `H = 16368 + 8 * (X - 29)` pour qu'aucune portion de l'arche ne dépasse sous le sol gris en vue arcade.
- **Validation** :
  - Vérification visuelle Chrome WebGL2 sur `terrain.html` (Niveau 5 au défilement `940 px`, capture `/tmp/l5_escher_arcade_v3.png`).
  - `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build` et `630/631` tests Vitest passants (dont tous les tests Niveau 5 : `level5Bridge.test.ts` et `level5DisplayTerrain.test.ts`). Un test préexistant sans rapport dans `src/rendering/createPracticeLandmarks.test.ts:77` échoue (`expected 1.80 to be less than 1`).
  - Le point historique des ronds cachés sous le tube/horloge reste ouvert.

## Niveau 5 / niveau 1 : arrivée, symétrie et murs — captures 16h06–17h47 du 22 novembre 2026

Cette entrée remplace les descriptions des coins à 8 unités et les anciennes
coordonnées visuelles de GOAL dans les entrées précédentes.

### Symétrie et hauteur

- `createPracticeTower` utilisait un socle centré en **(0,5 ; 0,5)**, puis
  ramenait l'épaulement et la pointe vers (0 ; 0). Tous les anneaux et la pointe
  partagent désormais le centre du socle, aux niveaux 1 et 5. Le test de
  calibration du joint frontal du niveau 1 est mis à jour pour le déplacement
  projeté de quatre pixels résultant de ce centrage ; sa hauteur reste inchangée.
- Les trois tours à quatre coins ont un **toit et quatre parois dédiés**,
  `level5FortGeometry`, avec la même construction sur chaque côté. Le sol du
  relevé reste à leur pied ; les coins ne sont plus dépendants de sa
  triangulation. Les faces verticales restent jaunes avec les joints communs.
- Les quatre pointes de coin montent de **12 unités arcade**, visibles dans
  le relevé natif (par exemple 16380 → 16392), et non des 8 unités du modèle
  de Rolling Madness utilisé lors de la correction précédente. La pointe
  centrale garde son centre à (cx+0,5 ; cz+0,5).
- Tests de symétrie par rotations de 90° et 180° sur les positions du toit,
  des murs et de la tour classique ; test de centrage de l'apex.

### Dents de scie

Le domaine de collision du niveau 5 est borné par **X−Z=±21**. Une cellule
entière au bord dépassait ce domaine d'un triangle ; les coupes ne sont plus
limitées aux premiers écrans. Le coin NE étranger est retiré de la limite +21,
le coin SW de la limite −21, sur toute la course. Les hauteurs des trois coins
valides sont conservées, sans utiliser le coin étranger pour extrapoler SW.

La conservation générale des SW absents, introduite pendant cette intervention,
découpait aussi les **murs intérieurs** en dents de scie (rangée Z=28,
X=42..48 notamment). Elle est retirée : les trois échantillons cohérents
complètent les dalles de ces rangées ; seule la limite extérieure est coupée.
Tests sur les deux diagonales et sur une rangée intérieure complète. Inspection
Chrome confirmant le mur intérieur droit derrière la tour et les bords extérieurs.

### GOAL, petite pente et arche

La forme de GOAL reste 4 × 10 cellules. Sa profondeur de présentation est
recalée sur **X=25..28, Z=24..33, H=16416** au lieu de la bande de collision
X=19..22, Z=18..27, H=16368. Le décalage +48 sur X, Z et H **conserve exactement
la projection arcade**, mais permet à la façade Z=34 d'arriver directement
sur la pente de Z=34..35. Les anciens volumes isolés sont intégrés aux deux
plateformes continues. Les drapeaux utilisent la hauteur du terrain présenté.
Le marquage n'a pas changé de dimensions.

`level5FinishDepth` applique le même recalage de présentation aux deux billes
sur la bande de fin et le pont d'approche ; aucune coordonnée du cœur n'est
écrite. Le test d'intégration conserve les poses natives et contrôle la position
3D ; le test pur vérifie l'identité de projection.

`archBridgeGeometry` extrait la géométrie auparavant intégrée au niveau 4,
sans changer les deux arches de ce niveau. `level5Bridge` réutilise le profil
(couronne à −9, naissance à −15 unités sous le tablier), orienté suivant X,
X=29..35, Z=21..24 : six panneaux au total. L’ouverture centrale mesure
**trois cellules**, X=30,5..33,5, avec deux appuis pleins de 1,5 cellule. Le
profil de l’intrados n’est pas étiré sur toute la traversée. Les faces pleines
du passage sont retirées, un sol inférieur reçoit les ombres.
Les extrémités et les murs voisins sont conservés. Tous ces meshes et matériaux
appartiennent à la scène ; pas de nouvelle boucle ou de nouvelle carte d'ombre.

### Validation et suite

**`npm run check` réussi : 628 tests / 100 fichiers**, format, lint, typage,
couverture et build. Couverture métier inchangée : 99,45 % instructions,
98,60 % branches, 99,01 % fonctions, 99,41 % lignes. Avertissement habituel de
taille des chunks. **Chrome : 10/10 tests terrain réussis**.

Captures réellement examinées : `/tmp/mm-1747-fort-top.png`,
`/tmp/mm-1747-fort-front.png`, `/tmp/mm-1747-fort-back.png`,
`/tmp/mm-1747-pyramid-top.png`, `/tmp/mm-1747-level1-top.png`,
`/tmp/mm-1633-final-arcade.png`. Les vues finales montrent le mur intérieur
rectiligne après restauration des dalles. Les différences d'éclairage entre
faces sont attendues ; la symétrie revendiquée porte sur les positions.
Le banc de session locale charge F5 et montre aussi la fin de niveau ; ce n'est
pas une partie jouée complète. Pas de recette Safari/audio/confort ajoutée.

Aucun Git initialisé ; pas de changement du cœur, des collisions, des ROMs,
des dépendances ni du gain d'entrée. La fidélité visuelle reste soumise à la
comparaison de Michel. Le point historique des ronds cachés sous le tube reste
ouvert, comme indiqué dans l'entrée précédente ; ne pas le déclarer résolu.

## Niveau 5 : retouches des captures 15h26–15h31 — 22 novembre 2026

- Les trois tours près de GOAL ont maintenant **quatre volumes fermés de pierre
  grise**, générés par `level5FortCorners`. Chaque quart possède deux pentes
  vers l'intérieur, deux coupes verticales grises et une base. Les anciennes
  hauteurs de coins du terrain sont retirées : elles produisaient des coupes
  jaunes via le générateur de parois. Test de fermeture des arêtes, sommets
  séparés pour les normales. Le terrain sous ces éléments est plat.
- Les trois pointes centrales sont centrées sur le socle 3 × 3, affinées
  (demi-largeur 0,54 cellule), avec hauteur projetée conservée. Pierre mate,
  éclairage et ombres du soleil partagé. Les cinq pyramides des oiseaux
  conservent leur construction commune avec le niveau 1.
- Petite rampe de l'arène : deux bandes Z=95..96, X=90..92 ; profil natif
  16244 → 16242 → 16240 → 16238. Les deux bandes partagent exactement les
  mêmes bords, arrondis à 1e−9. Le test impose planéité et raccords.
- Miniatures écrasées : ancrage calculé depuis le bas du modèle pour que la
  surface ne soit plus enfouie dans le sol ; marge 0,025, largeur 1,35×.
  Les amibes écrasées sont opaques ; leurs couleurs et celles des autres
  aplats sont renforcées sans spécularité. Les poses normales rétablissent
  leurs dimensions et leur position. Les délais restent ceux du cœur.
- Oiseaux : section du bec jaune 1,8×, extrémités des plumes raccourcies et
  rapprochées ; chaque pose conserve son mouvement natif. Normales recalculées
  une fois sur les copies ajustées, sans modifier la bibliothèque locale.

Validation : `npm run check` **617 tests / 98 fichiers réussis**, couverture
métier inchangée (99,45 / 98,60 / 99,01 / 99,41 %), build et typage réussis.
**Chrome : 10/10 tests terrain réussis.** Captures réelles inspectées :
`/tmp/mm-level5-fort.png`, `/tmp/mm-level5-compare-arena.png`,
`/tmp/mm-level5-compare-birds.png`, `/tmp/mm-1531-squashed.png`.
Le banc d'écrasement initialise les contacts puis laisse les transitions au
cœur ; ce n'est pas une traversée jouée. Pas de Git initialisé.

**Point restant : ronds sous l'entrée du tube/horloge.** Le masque actuel a
été confronté au framebuffer natif : 2 292 des 2 296 pixels de pigments relevés
sur le cadrage `/tmp/mm-1531-clock-ejs-full.png` correspondent exactement à
la carte complète, avec offset vertical 1292 et scroll −15462. Cette capture
ne révèle cependant pas les parties derrière le tube. Aucun rond supposé
ni supplément de pixels non probant n'a été ajouté. Prochaine action : isoler
la façade désignée dans un cadrage natif où elle est découverte et compléter
uniquement son contour prouvé. La validation humaine des silhouettes reste
ouverte. Ne pas présenter ce point comme corrigé.

## Niveau 5 : arène, pyramides et mort par oiseau — 22 novembre 2026, captures 14h49–14h53

Cette entrée corrige et complète l'implantation initiale ci-dessous.

- Les zones grises venaient d'UVs doublés sommet par sommet à une hauteur
  erronée (16232, alors que le sol de l'arène est à 16238). Une même dalle
  pouvait traverser une grande partie de l'atlas et devenir grise par mipmap.
  `level5Surface` attribue maintenant une densité uniforme par cellule :
  **2× en X=90..103, Z=91..104**, sol ET dessus des blocs, 1× sur les rampes
  et chemins voisins. Les UVs sont recalculés depuis les positions, sans
  multiplication répétée d'un sommet partagé.
- Les deux grandes pentes possèdent une arête diagonale : X−Z=9 pour
  X=106..111 et X−Z=−11 pour X=96..101. Leurs cellules de crête restent
  pliées suivant NW–SE avec SW=NE. L'extension plane précédente relevait
  artificiellement SW et produisait les dents. Les tests vérifient la hauteur
  maximale de crête et l'égalité des bords avec les cellules voisines.
- Le masque de murs reconnecte maintenant le pigment uniquement dans les
  petites interruptions de **mortier gris** de la référence. Les séparations
  jaunes entre motifs distincts restent intactes ; les joints gris 3D sont
  appliqués ensuite. Le trait jaune au milieu des ellipses est ainsi supprimé.
  Bibliothèque locale régénérée avec `extract-rolling-actors.mjs`.
- Les **cinq pyramides de la zone des oiseaux** réutilisent désormais
  `createPracticeTower` du niveau 1 : jupe de trois pierres, épaulement,
  joints et pointe. Empreinte 3 × 3 et hauteur adaptée au niveau 5. Leur
  terrain sous-jacent est plat. Les trois petites tours près de GOAL gardent
  leurs coins en quarts de pyramide à deux facettes.
- Bec des oiseaux : les quatre faces partagent le sommet UV U≈0,0004,
  V=1,49. `birdParts` les isole dans un matériau jaune mat et légèrement
  émissif ; la texture violette ne les dilue plus dans les mipmaps. Le modèle
  pointe vers −Z : correction de rotation de π pour suivre la direction
  native. Chrome sur l'asset réel : 110 triangles de corps + 4 de bec.

### Animations vérifiées dans le 68010 et dans le cœur Web

- Contact mortel : `0x19e14` place le joueur en **état 0x0b** avec le compteur
  `player+0x57=0x66`. Le dispatcher `0x254ba` conduit à `0x25876`, puis
  `0x13ade` : sentinelle 102 → 36 → 0, huit fragments en expansion.
  `birdDeath` lit leurs coordonnées projetées déjà calculées dans les deux
  groupes du joueur à +0x38 et +0xa4 (glyphes 0x10b..0x112), relativement
  au centre +0x1e/+0x20. Les fragments hors écran ou les anciens enregistrements
  à la sentinelle ne sont pas affichés. `createBirdDeath` affiche ces positions
  sans horloge indépendante, puis masque ses meshes dès la sortie de cet état.
- Miniatures : la routine `0x192e2` écrase l'acteur, arrête sa vitesse et
  conserve l'état 2. **Bille noire** : listes 0x21f7a → 0x21f7e → 0x21f82,
  puis image tenue via 0x21f8a. Le rendu conserve les deux premiers paliers
  par compression verticale du mesh, puis utilise `blacky_squashed_mini`.
  **Ver** : image fixe via 0x21a62 (`stick_squashed_mini`). **Amibe** : image
  fixe via 0x21efe (`amoeba_squashed_mini`). Pas de cycle écrasé inventé.
- Sonde Chrome : initialisation contrôlée des contacts, puis code natif seul.
  Les trois écrasements sont observés ; le compteur de mort passe de 102 à
  35,34,33… avec huit enregistrements de fragments (six encore visibles en
  fin d'expansion, les autres étant coupés). Le cœur retourne ensuite à
  l'état joueur 0 et `birdDeath` disparaît. La bille est hors champ après le
  retour au point sûr dans ce banc téléporté ; aucune traversée complète ou
  recette du confort au trackpad n'est revendiquée.
- Le driver MAME officiel consulté configure la machine/Slapstic ; les
  séquences ci-dessus proviennent du programme 68010 local et sont confirmées
  dans le cœur épinglé. Voir `docs/DECISIONS.md` pour la référence du driver.

Validation : **`npm run check` réussi, 614 tests / 97 fichiers** ; couverture
métier inchangée : 99,45 % instructions, 98,60 % branches, 99,01 % fonctions,
99,41 % lignes. **Chrome : 10/10 tests terrain réussis**. Aucun changement de
ROM, de physique, de dépendance ou de boucle. Chaque nouveau mesh/matériau
appartient à la scène ; remise à zéro sur pose absente et destruction de scène.

Fichiers utiles : `level5DisplayTerrain`, `createLevel5Terrain`, `birdParts`,
`level5Actors`, `createLevel5Actors`, `birdDeath`, `createBirdDeath` et leurs
branchements dans `practicePose`/`createLivePracticeView`. Tests sur UVs,
crêtes, masque pigment/mortier, écrasements, J1/J2, fragments et nettoyage.

Captures inspectées : `/tmp/mm-1449-arena.png`, `/tmp/mm-1453-birds.png`,
`/tmp/mm-1453-bird-death.png`, `/tmp/mm-1453-bird-death-late.png`,
`/tmp/mm-1453-bird-rebuild.png`, `/tmp/mm-bird-beak-close.png`.
Journal natif `/tmp/mm-1453-native-cycle.log`. Les dernières captures du banc
rejouent les contacts réels, sans imposer directement les états d'écrasement
ou de mort. Pas de Git initialisé. Pas de recette Safari/audio/J2 jouée.

Prochaine action : recharger l'application pour reprendre le masque local,
puis F5 et essai joué du niveau 5. Conserver la lecture des fragments natifs,
la densité de dallage par cellule et les crêtes pliées ; ne pas réintroduire
la condition d'UV par hauteur. Niveau 6 ensuite, sur demande.

## Niveau 5 — Silly Race, motifs originaux et tours — 22 novembre 2026

Michel a validé le Y fermé du niveau 2 et les vagues du niveau 3 avant de
passer au niveau 5. Le niveau 6 ne fait pas partie de cette intervention.

- Relevé local `level5-terrain-v1`, 141 × 141, 3 825 cellules actives,
  hauteurs natives 16168..16416. Descripteur 68010 `0x2de1e`, départ
  `(1004,996,16168)`, scroll −15212. Défilement inversé : F5 et bouton
  Niveau 5 restaurent le point de reprise local ; `/terrain.html` propose
  aussi le niveau 5, le curseur inversé et la vue libre. La limite d'étude
  −16152 cadre l'arrivée ; ce n'est pas une mesure de la limite native.
- `scripts/survey-level5.mjs` vérifie le sampler sur le relevé du niveau 4,
  puis laisse le cœur initialiser la course suivante dans une session de
  diagnostic. Il écrit seulement un relevé dérivé et un checkpoint normal
  dans `local-roms/`. Les écritures RAM de transition du banc ne sont pas
  intégrées au jeu. Aucun changement du cœur ou des collisions.
- `createLevel5Terrain` possède les sols, murs, ombres, GOAL et horloge
  décorative. `level5DisplayTerrain` répare les quatrièmes échantillons qui
  produisaient des dents sur les rampes. Huit socles de 3 × 3 cellules portent
  leurs pyramides centrales. Les quatre coins sont des **quarts de pyramide
  à deux facettes** : diagonale adaptée au coin relevé, sommets séparés pour
  les normales. Le test comporte une cellule triangulaire avant les tours
  pour vérifier que leur repérage ne dépend pas d'un indice multiple de six.
- Le motif répétitif de Rolling Madness est remplacé par un **masque de
  pigments extrait de `MarbleMadness_Level5.png`**. Seuls les pixels des
  ellipses sont retenus ; ni ombres, ni joints, ni sols ne sont recopiés.
  Projection calibrée sur la carte 576 × 2286 :
  `uPixels=270+2*(nativeZ-nativeX)` ;
  `vPixels=nativeX+nativeZ-2*(nativeHeight-16384)-256`.
  Les UVs des murs utilisent cette transformation, en respectant
  l'orientation des données PNG. Les cercles de la façade GOAL se retrouvent
  aux mêmes positions que dans la vue native. Les couleurs sont pilotées
  par les banques PF du cœur : orange 31/29, rose 27/28, jaune 15/14/13,
  joints 4. Le masque décrit les surfaces visibles sur cette référence ;
  les faces cachées n'ont pas de preuve visuelle indépendante.
- `level5Actors` lit **9 miniatures**, base RAM `0x1890`, pas `0x28`, types
  7/8/9 à +0x25, et **10 oiseaux**, base `0x19f8`, pas `0x38`. Positions fixes
  16.16 à +0xc/+0x10/+0x14 ; activité +0x18, état +0x1a, liste sprite +0x1c,
  compteur/période +0x24/+0x25. Les cycles sont lus depuis les listes natives,
  sans minuterie Babylon ni déplacement recréé. Les modèles miniatures et
  oiseaux de Rolling Madness sont ajoutés à la bibliothèque locale ; les
  états écrasés utilisent les poses correspondantes. L'adaptation de poses
  3D aux sprites reste une correspondance visuelle, pas une identité de mesh.
- `readPracticePose`, chargement local, comparaison et caméra acceptent le
  niveau 5. Un test empêche la régression où la caméra restait bloquée sur
  GOAL à cause du clamp de scroll croissant. Les aspirateurs du niveau 4
  restent procéduraux. Pas de nouvelle dépendance, moteur ou boucle de rendu.

Reconstruction des assets locaux :
`node scripts/extract-rolling-actors.mjs "3D_assets_for_animated_entities/data/{app}"`.
Cette commande extrait aussi le masque original via `scripts/level5-wall-pattern.mjs`.
Bibliothèque : 6 725 084 octets avant les dernières retouches de code, sous
la limite de 8 Mo ; aucun de ces fichiers n'est livré dans le build.

Validation finale : **`npm run check` réussi, 605 tests / 93 fichiers** ;
**Chrome : 10/10 tests terrain réussis**, dont Silly Race. Couverture métier
99,45 % instructions, 98,60 % branches, 99,01 % fonctions, 99,41 % lignes.
Voir `docs/VALIDATION.md` pour les commandes et leurs résultats. Captures Chrome de comparaison dans `/tmp/mm-level5-compare-*.png`,
vue des tours `/tmp/mm-level5-fort.png`. Ces vues sont issues de positions
initialisées dans un banc temporaire, pas d'une course entière au trackpad.
Les couleurs du PNG complet diffèrent de celles de certaines palettes natives :
le PNG fixe les motifs, la RAM fixe les teintes en jeu. L'horloge importée reste
un décor statique. Pas de Git initialisé.

Prochaine action : vérifier la traversée jouée et les interactions avec les
miniatures/oiseaux ; conserver le masque original et les facettes des coins.
Le prochain niveau à reconstruire sera le niveau 6.

## Y fermé et lissé, intérieur/extérieur — 22 novembre 2026, capture de 11h40

Cette entrée remplace la reconstruction par découpe des coiffes et
l'aplatissement ponctuel de la sortie décrits précédemment. L'audit montre
que le Y extrait de Rolling Madness est une surface fermée ; les ouvertures
parasites venaient des faces supprimées puis remplacées sans raccord complet.

- `refineIntermediatePipe` conserve toute la surface source et subdivise
  chaque triangle du Y en quatre, avec relaxation locale des branches.
  Les lèvres fines des trois bouches sont protégées : leur relaxation
  indépendante faisait se croiser les peaux intérieure/extérieure. Les
  limites entre matériaux et les arêtes franches sont également conservées.
  Une surface partielle/non fermée n'est pas subdivisée. Le J séparé n'est
  ni déplacé ni subdivisé.
- `fitIntermediatePipeHoods` compacte les coiffes à 85 % au-dessus de leur
  base et conserve l'abaissement de la jonction (1,45 unité au maximum),
  via une déformation continue appliquée identiquement aux sommets
  coïncidents. Plus aucune face de coiffe, dessous, lèvre ou raccord n'est
  supprimée. L'aplatissement par classification des peaux est retiré : il
  créait aussi des triangles dégénérés après subdivision.
- Normales recalculées sur les sommets coïncidents des différentes faces
  et matériaux ; normales sources du J conservées. `createIntermediatePipes`
  utilise aussi les indices intérieurs ajustés. Suppression du calcul de
  normale plate spécial sur la sortie et du seuil `normalW.z < -0.9` qui
  produisait une tache lumineuse nette à l'intérieur malgré le matériau mat.
- Aucun changement des données extraites locales, du cœur, des collisions
  ou des timings. Pas de nouvelle dépendance, scène, lumière ou boucle.
  Les copies et buffers sont possédés/libérés par les meshes existants.

Audit reproductible, Vite lancé :
`node scripts/audit-intermediate-pipe.mjs`.
Il lit uniquement le relevé local des tuyaux et affiche des nombres, sans
export de géométrie, ROM ou heap. Sur le **Y** réel : 352 triangles source,
1 408 après subdivision ; **0 arête ouverte, 0 arête non-manifold, 0 triangle
dégénéré, 0 croisement non coplanaire détecté entre faces non voisines**,
avec une tolérance d'arête de 0,000001 unité. Plus petite aire double après
ajustement : 0,0197808653. Le J séparé est hors de cet audit ciblé ; son
modèle comporte des croisements préexistants et reste inchangé.

Validation : **`npm run check` réussi, 596 tests / 89 fichiers** ; couverture
99,45 % instructions, 98,59 % branches, 99,01 % fonctions, 99,40 % lignes.
Le premier passage avait relevé l'usage de `console` sans import dans le
nouveau script ; remplacé par `stdout` importé de Node avant réussite.
Tests de non-régression : tube creux avec lèvres, conservation de la fermeture
et de l'orientation, ouverture des bouches, absence de triangles dégénérés,
normales unitaires/continues, sommets dupliqués et immutabilité des sources.
**Chrome : 9/9 tests terrain réussis**. Avertissement habituel de gros chunks.
Pas de Git initialisé.

Inspection WebGL2/SwiftShader sans erreur JS ni shader : trois cadrages
arcade du niveau 2, quatre gros plans autour des entrées, trois autour de
la sortie et vues réellement dans le tube vers les entrées/sortie.
Pour ces dernières seulement, la limite de distance de la caméra d'étude
est abaissée dans le banc, sans changer le code de navigation du jeu.
Captures : `/tmp/mm-l2-pipe-wall-closed3-*.png`,
`/tmp/mm-y-sealed-intake-*.png`, `/tmp/mm-y-sealed-inside-*.png`.
Les premiers cadrages arcade précèdent la suppression du seuil lumineux ;
les gros plans des entrées et les vues intérieures sont repris après celle-ci. Pas de nouvelle
partie complète, recette Safari, audio ou trackpad.

Prochaine action : recharger puis inspecter l'entrée depuis la vue derrière
la bille et la sortie en vue libre. Conserver la topologie source fermée ;
ne pas réintroduire les découpes de coiffes ou les aplatissements de peaux.

## Sol débordant, toit du Y et fausses pointes — 22 novembre 2026, captures de 11h24–11h27

Cette entrée remplace le prolongement de tablette ajouté dans l'intervention
précédente : les deux sols d'alcôve sont entièrement en retrait de la façade,
chacun de sept cases sur trois. La tablette basse ne déborde plus de trois
cases devant le mur ni sur la glace ; sa hauteur est conservée. Le test de
construction vérifie maintenant explicitement sa limite au plan x = 88.

Les stries du toit de la bouche du Y étaient un z-fighting géométrique :
les peaux intérieure et extérieure font toutes deux partie de `shell`,
et non de deux matériaux distincts. L'ancien critère `interior` reconnaissait
seulement le sol intérieur, laissant les deux peaux du toit sur le même plan.
`fitIntermediatePipeHoods` utilise désormais les normales sources pour
préserver leur orientation et leur séparation de 0,11 unité. Un test couvre
les deux peaux dans le même matériau, sans liste d'intérieur. Les fichiers
sources importés restent inchangés.

Les trois petites pointes jaunes/blanches autour de la tour centrale du
niveau 1 venaient des coins SW de trois dalles (x = 28..30, z = 24) qui
reprenaient le profil de collision de la tour. `practiceDisplayTerrain`
prolonge le plan défini par NW/NE/SE lorsque SW est anormalement relevé.
Cela supprime les facettes et parois triangulaires au-dessus du dallage.
Les pointes grises légitimes et les règles/collisions arcade sont conservées.
Test synthétique de continuité, absence de paroi relevée et immutabilité.

Validation : `npm run check` réussi, **591 tests / 88 fichiers**, couverture
99,45 % instructions, 98,59 % branches, 99,01 % fonctions, 99,40 % lignes.
`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts` :
**9/9**. Aucun changement de dépendance ; avertissement de gros chunks habituel.
Pas de dépôt Git initialisé.

Chrome WebGL2/SwiftShader, sans exception JS ou erreur shader : trois cadrages
arcade de la fin du niveau 2, trois gros plans de la sortie du Y (face, dessus,
arrière), puis trois vues de la tour du niveau 1 (arrière, dessus, côté).
Captures inspectées : `/tmp/mm-l2-pipe-wall-inset-roof-fix-760.png`,
`/tmp/mm-spout-skins-fixed-{front,top,rear}.png`,
`/tmp/mm-opening-pits-after-{behind,top,side}.png` ; vues avant disponibles
sous `/tmp/mm-opening-pits-before-*.png`. Pas de nouvelle partie complète,
recette Safari, audio ou trackpad.

Prochaine action : recharger l'application et vérifier les trois cadrages
signalés par Michel. Ne pas réintroduire une plateforme devant l'alcôve basse.

## Trous du départ, alcôves/Y et dos des aspirateurs — 22 novembre 2026, captures de 10h24–10h28

- **Niveau 1** : le liseré noir autour des trous venait de pixels transparents
  de l'atlas des parois interprétés comme opaques. Le shader BabylonJS 9.33.2
  active `ALPHATEST_AFTERALLALPHACOMPUTATIONS` avec les couleurs de sommets :
  `useAlphaFromDiffuseTexture = true` est nécessaire pour inclure l'alpha de
  l'atlas dans ce test final. La correction conserve les joints et la géométrie
  existants. Le diagnostic initial de jour dans le dallage est infirmé par le
  relevé GPU : les pixels noirs avaient exactement la teinte de joint (24).
  Après correction, les dalles derrière la découpe réapparaissent.
- **Niveau 2** : les deux alcôves gardent une largeur identique de sept cases,
  vérifiée sur leurs coordonnées monde. Le creux reste profond de trois cases.
  La tablette basse est relevée de 1,2 unité et prolongée de trois cases vers
  l'avant pour former la plateforme horizontale visible, au lieu de disparaître
  derrière la glace. La distance verticale entre tablettes est maintenant 9.
- Le raccord du **Y** est abaissé localement (maximum 1,45 unité monde) sans
  déplacer ses deux coiffes, son autre tuyau ni le débouché sur le terrain.
  Les normales suivent la déformation. La sortie évasée a un toit et des
  joues plans, une lecture de facette distincte du fût arrondi, et conserve
  0,11 unité entre faces intérieure/extérieure pour éviter leur superposition.
  La géométrie source importée reste intacte ; l'ajustement se fait en copie.
- **Aspirateurs du niveau 4** : ajout d'un coude procédural à 90° entre la
  tige verticale et l'entrée arrière de la tête, et fermeture du dos de la
  tête autour de ce raccord. Le coude est parenté au support et dépasse
  légèrement dans la tête pour conserver une jonction pendant le tremblement.
  La bouche passe de 1,70 × 0,62 à 1,70 × 0,84 unité ; la coque est également
  plus haute (1,28 au maximum). Les positions et déclenchements natifs restent
  inchangés. Aucun asset Rolling Madness ajouté pour les aspirateurs.

Validation : **`npm run check` réussi, 589 tests / 88 fichiers**, couverture
99,45 % instructions, 98,59 % branches, 99,01 % fonctions, 99,40 % lignes.
Le premier contrôle complet a signalé une annotation de type interdite dans
le test navigateur puis une indexation à rendre explicite ; les deux ont été
corrigées avant la réussite complète. Avertissement habituel de gros chunks
BabylonJS conservé. Aucun ajout de dépendance ; dépôt Git non initialisé.

**Chrome : 9/9 tests terrain réussis**, dont une régression GPU qui projette
un texel transparent de l'atlas sur une surface isolée : le fond presque noir
réapparaît (canaux < 5), au lieu de la teinte de joint 24. Les tests unitaires
vérifient aussi le coude, la bouche moins aplatie, la largeur monde de sept
cases des deux tablettes, la plateforme basse, l'abaissement de la jonction,
l'épaisseur de la sortie et l'immutabilité de sa source.

Inspection WebGL2/SwiftShader : cadrages arcade des niveaux 1–3 et tuyau/glace,
trois vues rapprochées des alcôves, aspirateurs en gros plan de face et de dos.
Aucune exception JS ou erreur shader dans ces inspections. Captures locales :
`/tmp/mm-l1-followup3-0.png`, `/tmp/mm-l2-pipe-wall-followup6-{730,760,790}.png`,
`/tmp/mm-vacuum-followup-{front,rear}.png`. Les captures de Michel et le PNG
complet du niveau 2 ont servi de références. Pas de nouvelle recette audio,
Safari ou trackpad, ni de partie complète ; les ajustements géométriques
restent des interprétations 3D des vues arcade, pas une égalité pixel à pixel.

Prochaine action : recharger et comparer les deux alcôves/la sortie du Y
avec la capture de 10h24, puis regarder les aspirateurs de dos en vue libre.

## Creux du niveau 2 et détails verts du niveau 3 — 22 novembre 2026

Corrections suivant les captures de 05h04, 05h08 et 05h09 et les précisions
sur les deux niches :

- Niveau 2 : deux ouvertures superposées, avec deux tablettes distinctes de
  sept cases de long sur trois de profondeur, fond et retours latéraux.
  Une bande pleine sépare les ouvertures ; la paroi reprend sous la seconde.
  Le Y conserve ses branches et sa sortie importées, mais ses deux coiffes
  sont remplacées par des quarts de cylindre extrudés. Les triangles anciens
  traversant le raccord sont découpés au plan de base. La source reste intacte.
  Les violets proviennent du playfield 52/54/57, sans reflet blanc.
- Niveau 3 : suppression de l'amplification de hauteur des vagues (1,32×),
  normales supérieures corrigées, absence d'ombres reçues sur l'eau et ses
  jupes, suppression du sol pavé superposé sous son emprise. Le profil vivant
  reste piloté par les échantillons arcade, sans nouvelle simulation ; des
  échantillons identiques ne réécrivent plus les buffers. Le vert plat est
  63/126/99, les reliefs utilisent les couleurs des sprites des vagues.
- Les bordures vertes ne reçoivent plus les ombres projetées parasites et
  restent mates ; teinte claire 150/195/165. Le petit capuchon pyramidal du V
  passe de 0,85 unité à 16 unités arcade (1,633 unité monde). Son emprise est
  inchangée. Les drapeaux des niveaux 1/3 deviennent jaune pâle et noir,
  comme ceux du niveau 4 ; ceux du niveau 2 restent cyan.
- Les faces sombres des murs du niveau 3 tiennent désormais compte des
  ombres : auparavant leur couleur ignorait entièrement le terme d'ombre.
  Un rayon de diagnostic confirme un mur occultant sur la paroi voisine
  des vagues. Le contraste des ombres reste une approximation de présentation.
- Joints verticaux des niveaux 1–3 : quatre pixels centrés sur seize, au
  lieu de deux. Mesure dans les PNG complets : répétitions de 12 pixels de
  mur puis 4 de joint, notamment niveau 2 ligne 1750 et niveau 3 ligne 2000.

Lecture graphique bornée : 64 mots de playfield à B00400, puis 16 mots de
motion objects à B002a0. Les indices 64–79 du tableau correspondent aux
couleurs MO 80–95. Aucun dump de heap, ROM ou état, aucune physique modifiée.
Les ressources et plugins restent possédés/libérés par la scène existante.

Validation : `npm run check` réussi, **587 tests / 88 fichiers**, couverture
99,45 % instructions, 98,59 % branches, 99,01 % fonctions, 99,40 % lignes.
Tests ajoutés pour amplitude/normales/stabilité du profil, hauteur du cône,
remplacement local et immutabilité du tuyau, épaisseur des joints ; tests
étendus pour les deux tablettes, les drapeaux et les banques de palette.
`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts` :
**9/9** réussis. Le premier lancement sans canal a échoué faute de Chromium
installé ; Chrome installé a servi à toute la recette. L'attente GPU du mur
sombre du niveau 3 est actualisée pour sa nouvelle ombre (15 au lieu de 24).

Chrome WebGL2/SwiftShader : dix cadrages des niveaux 1–3, vues tuyau/glace,
trois vues rapprochées des niches, puis deux comparatifs avec le cœur vivant
aux départs des niveaux 2 et 3 ; aucune exception JS ou erreur shader relevée.
Captures locales : `/tmp/mm-l2-pipe-wall-revision6-{730,760,790}.png`,
`/tmp/mm-l{1,2,3}-corrected-*.png`,
`/tmp/mm-native-level{2,3}-details.png`. Les vagues animées sont inspectées
sur la page d'étude ; une partie humaine complète jusqu'aux vagues reste à
faire. Les profondeurs sont exactes selon la demande, mais la hauteur du
second creux et les coiffes sont des ajustements visuels, pas une extraction
complète de la géométrie arcade. Pas d'égalité pixel à pixel revendiquée.
Safari et le ressenti trackpad ne sont pas retestés. Aucun dépôt Git initialisé.

Prochaine action concrète : recharger l'application et comparer les deux
niches depuis la vue libre, puis les vagues en jeu vivant sur les cadrages
fournis par Michel. Conserver les aspirateurs procéduraux du niveau 4.

## Palettes natives des niveaux 1, 2 et 3 — 22 novembre 2026

La vérification demandée après le niveau 4 est appliquée aux trois courses
précédentes. Les couleurs proviennent de la palette du cœur vivant, pas de
la palette des PNG complets. Captures comparatives dans une même session,
original à gauche / 3D à droite, pour chaque départ. Le premier niveau est
atteint avec Crédit/Start ; les deux suivants avec leurs checkpoints locaux.
Aucun export de heap, modification de ROM ou changement de physique.

- Niveau 1 : sol gris 180/180/180 ; murs jaune 255/238/0, orange
  238/119/0, face sombre 170/51/0. Les motifs/UV des fosses et bandes
  existantes sont conservés, les faces d'orientation sombre retrouvent
  leur brun au lieu de devenir jaunes après la correction de palette.
- Niveau 2 : même sol gris ; murs cyan 0/187/255, ombre 0/100/150 et
  face sombre 0/54/90. Les dalles auparavant trop sombres sont recalées.
  La glace conserve son atlas de cuvette mais utilise les teintes de la
  seconde banque : cyan 0/135/135, lumière 0/255/255, ombre 0/45/45.
  Ses reflets blancs sont supprimés ; les reflets des tuyaux bleus sont réduits.
- Niveau 3 : sol sable 210/182/140 ; murs gris foncé 45/45/45,
  36/36/36, 24/24/24, joints sable sombre. Tours et arches conservent
  leurs motifs, recalés sur cette palette. Vagues et bordures vertes
  utilisent la seconde banque (99/143/121 à plat, 187/221/187 en lumière).
  Le tuyau cuivre garde son modèle/position/diamètre, avec un reflet moins fort.

`emulation/level4Palette.ts` devient `terrainPalette.ts` : même lecture
bornée et vérifiée de 32 mots, même réutilisation du tableau inchangé,
mais disponible sur toutes les courses. `practicePose` publie la palette
pour chaque niveau et `createLivePracticeView` transmet uniquement ses
changements. `TerrainPalettePaint` partage les uniforms et leur mise à
jour ; `ArcadeTerrainPaint` distingue sol, mur, pierre de tour, vert et glace.
Le niveau 4 garde ses propres couleurs et son masque d'ombre local.
Le grain reste procédural ; les couleurs de sommets héritées ne doublent
plus l'éclairage des sols. Les pierres sont mates. Le filtrage PCF et un
biais normal de 0,02 réduisent les parasites des ombres sans nouveau soleil
ni carte ; NullEngine utilise le repli Poisson prévu par BabylonJS.

Validation : `npm run check` réussi, 584 tests / 86 fichiers, format, lint,
TypeScript, couverture et build. Six nouveaux cas unitaires vérifient le
transport de palette des trois courses, sa réutilisation/immutabilité et
l'actualisation des uniforms des deux banques sans nouvelle ressource.
La suite navigateur terrain passe 9/9 : trois nouveaux cas mesurent les
pixels des sols et faces sombres (180/180/180 et 170/51/0 ; 180/180/180
et 0/54/90 ; 210/182/140 et 24/24/24), sur terrains synthétiques sans ROM.
La régression d'ombre/palette du niveau 4 reste incluse et réussie.
Un premier `check` a rencontré la recréation simultanée de `test-results`
par Playwright ; le contrôle complet a ensuite été exécuté séparément.

GPU : Chrome WebGL2/SwiftShader ; comparatifs vivants aux trois départs,
puis dix cadrages arcade d'étude et les deux vues dédiées tuyaux/glace du
niveau 2, sans exception JS ni erreur de shader. Captures
`/tmp/mm-native-level{1,2,3}-after.png`,
`/tmp/mm-l{1,2,3}-final-*.png`. Les silhouettes d'ombres et le grain des
matériaux restent des approximations 3D ; leur égalité complète avec les
tuiles originales n'est pas certifiée. Aucun nouveau masque d'ombre
local n'a été ajouté sur ces niveaux. Le confort trackpad et Safari
n'ont pas fait l'objet d'une nouvelle recette.

Prochaine action : comparaison humaine après rechargement, notamment les
murs anthracite du niveau 3, les faces brunes du niveau 1 et la glace cyan.

## Palette du cœur vivant et ombre gauche de fin — 21 novembre 2026, captures de 22h14/22h16

Cette correction remplace le calage de couleurs de l'entrée précédente :
le PNG complet reste une référence géométrique et de silhouette d'ombre,
mais sa palette n'est pas celle du cœur Web en cours de jeu. Les deux vues
de Michel sont bien original à gauche / 3D à droite. Une capture locale du
cœur confirme les murs corail 255/68/51, leur ombre 187/51/34, leur face
sombre 119/34/17 ; les murs de fin sont ambrés 255/187/0, avec ombre
221/136/0 et face sombre 153/102/0. Le sol clair vaut 180 et les joints
verticaux 70. La piste initiale passe de brun 75/70/60 à beige 165/143/110
et rose clair 255/204/204 selon son orientation, contrairement au bronze
uniforme employé précédemment.

`level4Palette.ts` lit seulement les 32 entrées utiles de RAM graphique
B00400, via le pointeur vérifié du binaire figé. Il contrôle les deux tables
B00000..B007ff, leurs handlers, le pointeur et ses limites. Le décodage
IIIIRRRRGGGGBBBB reproduit l'intensité native. Une palette inchangée réutilise
son tableau précédent. `practicePose` la transmet à `createLivePracticeView`,
puis aux uniforms de `Level4CliffPaint` et `Level4GoldPaint`, seulement lors
d'un changement. La scène d'étude utilise les mêmes teintes mesurées comme
repli. Les gris sont éclaircis vers le sol natif 180. Pierre et pistes
restent mates. Aucun octet de ROM, entrée ou règle arcade n'est modifié.

Le grand mur extérieur gauche X=90, Z=72..90 ne rencontre aucun obstacle
vers le soleil dans la géométrie reconstruite (rayons vérifiés). L'ombre
visible dans les tuiles originales est donc complétée par un masque local
fixé aux coordonnées de cette paroi. Sa limite est mesurée dans le PNG
complet : H=16213/16203/16193 à Z=72,5/73,5/74,5 ; palier H≈16187 à
Z=75,5..78,5 ; reprise de la diagonale à Z=79,5. Le masque se combine par
minimum avec la visibilité du soleil ; il ne supprime aucune ombre 3D et
n'ajoute ni mur invisible, texture, carte d'ombre, observer ou passe GPU.
Il s'arrête avant les montants du second passage.

Validation : `npm run check` réussi, 578 tests / 85 fichiers, couverture,
lint, TypeScript et build. Trois nouveaux tests unitaires couvrent décodage,
mémoire invalide, changement/reprise d'une palette, immutabilité et passage
aux uniforms des deux matériaux sans création de ressources. Le test GPU
« grand mur jaune » passe sur une grille synthétique sans ROM et vérifie
les pixels 221/136/0 dans l'ombre et 255/187/0 dans la zone éclairée.
La suite navigateur du terrain réussit ses 6 tests, sans ROM personnelle.

Chrome WebGL2/SwiftShader : six cadrages d'étude sans exception JS et
comparatif vivant au départ (même session arcade, caméras arcade, capture
active). Capture `/tmp/mm-live-native-comparison.png` ; étude
`/tmp/mm-l4-shadowpalette-{0,160,320,480,640,784}.png`. La lecture réelle
confirme les mots de palette F721/FB32/FF43 du départ. Aucun export du heap
n'a été effectué. Le masque est une restitution locale de l'ombre arcade,
pas la preuve d'une occlusion géométrique absente. Les autres silhouettes
et le grain des dalles restent des approximations procédurales.

Prochaine validation humaine : recharger la vue et comparer le départ puis
le grand mur gauche de fin. La référence de couleur est désormais le cœur
vivant, et non le PNG complet à palette différente.

## Palette et matériaux du niveau 4 — 21 novembre 2026

Comparaison avec `MM_original_levels_full_views/MarbleMadness_Level4.png`
sur six cadrages arcade couvrant le niveau (scrolls 0, 160, 320, 480, 640,
784). Relevé des couleurs PNG, puis comparaison des familles de pixels
après alignement des joints et correction de l'aspect arcade (5/3 en X,
1,75 en Y). Ce diagnostic n'est pas une égalité pixel à pixel : les ombres,
le filtrage, les joints procéduraux et quelques silhouettes diffèrent.

`Level4CliffPaint` utilise maintenant les couleurs natives : orange
204/68/0, orange ombré 153/34/0, rouge sombre 102/0/0, jaune 255/255/0,
ocre 187/153/0 et jaune de face sombre 136/102/0. Les joints verticaux
restent gris 102. Les frises, murs bas jaunes et corrections géométriques
existantes sont conservés. Le mélange clair/ombre utilise la carte `key`,
en retirant la contribution sans ombre de l'hémisphère. La palette limite
les dérives brunes et les noirs sur les faces sombres ; c'est un traitement
arcade de présentation, pas une modification du cœur ou un nouveau soleil.

Les dalles deviennent neutres, légèrement plus claires et mates. Le remplissage
hémisphérique du seul niveau 4 passe à 0,30 avec un sol neutre. Les rampes
dorées gardent des normales éclairées mais perdent le renforcement des
couleurs par sommet hérité du niveau 2, qui blanchissait la pente de droite.
Leur composante diffuse/émissive limite le contraste et garde le bronze.
Pierre sans spéculaire ; catapulte importée corrigée en rouge pur malgré
sa texture source rose 255/68/68, avec un reflet rouge très faible.
Les marteaux importés n'ont plus de reflet blanc. Aspirateurs procéduraux
conservés ; aucune substitution d'asset, nouvelle texture ou nouvelle boucle.

Validation automatique : 16 tests ciblés réussis, puis `npm run check`
(575 tests / 83 fichiers, format, lint, TypeScript, couverture et build).
Les tests contrôlent notamment l'absence de spéculaire des pierres,
la neutralité des gris, l'absence de suréclairage par sommet des rampes
dorées et le matériau rouge sur les poses importées de la catapulte.

Validation GPU : Chrome WebGL2/SwiftShader, six cadrages, aucune exception JS.
Médianes relevées dans les familles comparables : orange 190/80/32 →
204/68/0 ; rouge 93/14/7 → 102/0/0 ; jaune 241/218/36 → 255/255/0 ; face
jaune sombre 68/65/7 → 136/102/0 ; dalle claire 144/144/146 → 168/168/168
(cible 170/170/170). Ces nombres ne prouvent pas la concordance de chaque
ombre. En particulier, certains grands murs jaunes restent trop éclairés
par rapport à l'ocre de la référence : la répartition des ombres doit encore
être affinée. Les essais d'angle solaire et d'ajout des dalles principales
aux projecteurs n'améliorant pas suffisamment ce point, ils ne sont pas retenus.

Captures locales `/tmp/mm-l4-calibrated-{0,160,320,480,640,784}.png` ;
baseline `/tmp/mm-l4-before-*.png`, diagnostic `/tmp/mm-color-audit.py`.
Prochaine validation humaine : comparaison côte à côte des murs jaunes
profonds et des mécanismes en jeu. Le calage de palette est terminé ;
la fidélité complète des silhouettes d'ombre n'est pas annoncée acquise.

## Sols et parois des couloirs initiaux du niveau 3 — 21 novembre 2026, captures de 21h34/21h35

Le défaut est reproduit depuis l'arrière du labyrinthe, comme sur les
captures de Michel. Le relevé contient 43 cellules dont SW échantillonne
le plateau à 16384 tandis que NW/NE/SE appartiennent au couloir inférieur.
`terrainMesh` fabriquait alors un triangle de dalle incliné jusqu'en haut
du mur, très clair sous l'éclairage : ces fausses rampes semblaient découper
les parois verticales et les sols.

`level3DisplayTerrain` reconstruit maintenant SW par le plan des trois autres
coins cohérents, uniquement dans le labyrinthe X=16..42, Z=18..44, quand ce
coin correspond au plateau et que les trois autres restent nettement dessous.
Les trois autres hauteurs ne sont pas modifiées : les petites pentes natives
sont conservées. La grande rampe de sortie et les reliefs ultérieurs gardent
leurs traitements. Les murs issus des nouveaux bords sont verticaux, les
sols voisins se raccordent sans falaise intérieure ni triangle relevé.
Aucun changement du cœur, du relevé original, des matériaux ou des ombres.

Validation : `npm run check` réussi, 575 tests / 83 fichiers, couverture,
lint, TypeScript et build. Les nouveaux tests reproduisent deux dalles
voisines avec coin parasite, vérifient les normales des sols et murs,
l'absence de paroi interne, la pente douce conservée, la rampe de sortie
et l'absence d'effet sur une cellule hors du secteur. Le relevé source
n'est pas modifié.
Chrome WebGL2/SwiftShader : vue libre d'ensemble, vue rapprochée inversée
et vue opposée, sans erreur JS. Le diagnostic sur le relevé réel compte
43 corrections ; il ne trouve pas le même motif hors du secteur réparé.
Captures `/tmp/mm-2135-after-wide.png`, `...-detail.png`, `...-reverse.png`,
avec captures `before` correspondantes pour l'ensemble et la vue inversée.
Le filtrage et le biais des ombres finaux restent les réglages existants :
la correction traite les triangles de géométrie, pas les ombres en les masquant.

Prochaine action : comparer la vue libre rechargée à celle de Michel et
parcourir les couloirs en jeu pour confirmer le confort de visibilité.

## Tuyau et bloc décalés d’une case — 21 novembre 2026, capture de 21h24

La photo de Michel montre sept cases avant le bloc latéral, contre six
précédemment. Le tuyau et le bloc sont déplacés ensemble d'une case vers
+Z (droite à l'écran). La précédente correction de largeur du conduit et les
aspirateurs procéduraux sont conservés.

- Le bloc de trois rangées occupe maintenant Z=76/77/78, X=76..78, à 16320.
  L'ancienne rangée Z=75 retrouve le niveau inférieur à 16196. Cela ajoute
  une case sur le bord de la grande plateforme avant le bloc (Z=69..75).
- L'ouverture mesure toujours 3×4 cases, mais occupe Z=79..82. Son extrémité
  Z=83 touche directement la plateforme haute existante : aucune bande vide
  d'une case à droite. Les coins parasites de l'ancien relevé sont aplanis
  au niveau inférieur sous l'entonnoir, sans supprimer son sol bas.
- Coque et doublure du tuyau reçoivent le même décalage `position.z = 1`.
  Les données importées restent intactes ; diamètre élargi et hauteur restent
  ceux de la correction précédente. Aucune modification du cœur arcade.

Validation : `npm run check` réussi, 573 tests / 82 fichiers, couverture,
lint, TypeScript et build. Tests des sept cases d'approche, des trois rangées
hautes déplacées, de la fermeture à Z=83, de l'absence de modification du relevé
source et des bornes des deux meshes translatés. Chrome WebGL2/SwiftShader à
540 px, sans erreur JS. Capture `/tmp/mm-2124-level3-pipe.png` : bloc de trois
dalles déplacé avec l'entonnoir, lèvre droite jointe à la plateforme.

À faire avec Michel : comparer la vue rechargée à sa capture de 21h24 et
vérifier le passage de la bille en partie réelle après ce recalage visuel.

## Inventaire, tuyau niveau 3 et aspirateurs procéduraux — 21 novembre 2026, captures de 19h23/19h33

Michel a explicitement demandé de conserver des aspirateurs procéduraux.
Aucun modèle, texture ni son `hoover` de Rolling Madness n'est branché.
L'inventaire réellement utilisé est maintenant en tête de `public/assets/README.md`,
avec les modèles chargés mais inutilisés distingués des modèles sélectionnés.

- `widenLevel3Pipe` augmente de 22 % le diamètre du conduit vertical, avec
  raccord progressif à la lèvre et au coude/sortie conservés. Les positions et
  normales sont copiées ; la géométrie importée d'origine reste intacte.
  Le conduit octogonal devait aussi dégager la bille entre les coins, pas
  seulement avoir un rayon maximal suffisant.
- La photo de 19h33 montre trois dalles entre le bord gauche et l'entonnoir,
  contre deux dans la scène. `level3DisplayTerrain` rétablit Z=75 à 16320
  pour X=76..78 : les rangées hautes sont Z=75/76/77. La bouche commence
  toujours à Z=78 ; le tuyau n'est pas déplacé et son ouverture reste dégagée.
- `createLevel4Vacuums` possède désormais les six aspirateurs procéduraux,
  leurs matériaux partagés et leurs meshes (libérés avec la scène). Tête
  rectangulaire à petite courbure aux coins, lèvre étagée, fond peu profond
  doré avec quatre points, conduit à faces planes et trois nervures.
  Le sommet de la tête reste à une hauteur proche de l'ancienne version.
- `readLevel4VacuumMouthFrames` lit les deux images actives émises à +0x42 :
  tables `0x22016/0x2201a` ou `0x220a6/0x220aa` selon le type. Le signal passe
  par `PracticePose.vacuumMouthFrames` et le setter existant. Seule la tête
  oscille légèrement (position/rotation/écrasement) quand l'aspirateur est
  entièrement levé et dans sa boucle active. Retrait et reset annulent l'effet.
  Pas d'horloge ni d'observer live ajouté ; le tuyau vertical reste fixe.
  Les fragments d'aspiration suivent la cible du bec qui bouge.

Validation : `npm run check` réussi, 572 tests / 82 fichiers, couverture,
lint, TypeScript et build. Tests de dégagement de la bille face aux plats
du conduit, préservation de la lèvre/sortie/source, trois rangées exactes,
lecture de l'image émise distincte de la suivante, tête seule mobile, reset
et branchement dans la vue live avec fragments.
Chrome WebGL2/SwiftShader : niveau 4 à 180/250 px, niveau 3 à 540 px,
sans erreur JS. Les deux phases natives injectées donnent des positions
visuelles distinctes ; ces essais ne sont pas un rejeu complet d'aspiration.
Une sphère de diamètre 1,35 placée dans le conduit à (18,5274,-9,5,20,9958)
est masquée : zéro pixel bleu détecté ; retirer les meshes du tuyau révèle
2099 pixels bleus, confirmant que la sphère du contrôle est bien rendue.
Captures `/tmp/mm-1923-vacuum-180.png`, `...-250.png`,
`/tmp/mm-1923-level3-pipe.png` (avec les trois rangées), et
`/tmp/mm-1923-tremor-0.png` / `...-1.png`.

À valider par Michel : ressemblance des nouveaux aspirateurs face à sa photo,
et passage réel de la bille dans le tuyau pendant une partie. Les règles et
collisions restent celles du cœur arcade ; seule la présentation est ajustée.

## Profils des deux paires d’arches — 21 novembre 2026, capture de 19h12

Les profils sont recalés sur la référence arcade complète, avec les dalles
adjacentes comme repères. Les portées de trois cases, l'écartement des deux
montants, leur épaisseur de 0,1 case et les raccords aux plateformes sont gardés.

- Première paire : intrados abaissé, sommet à 16255 et extrémités à 16249,
  pour un dessus à 16264. Le bandeau était beaucoup trop mince.
- Seconde paire : intrados remonté, sommet à 16262 et extrémités à 16256,
  pour un dessus à 16272. Le bandeau était trop épais.
- La courbe passe de `sin(pi*t)^0.55` à `sin(pi*t)` : épaules moins gonflées,
  raccord au sommet plus proche du profil dessiné. Les dessus fins sont gris.
- Les parois terminales rétablies précédemment et les ombres restent en place.
  Aucun changement de physique, de caméra ou de ressource d'ombre.

Comparaison Chrome à 570 px, même échelle horizontale et verticale que le
cadrage de la page (le raster plein niveau doit être étiré verticalement de
5 % par rapport à une mise à l'échelle uniforme). Captures de superposition
`/tmp/mm-arch-overlay-calibrated.png`, rendu `/tmp/mm-arch-model-after.png`,
référence `/tmp/mm-arch-original-calibrated.png`. Ne pas conclure sur une
superposition uniforme : elle ajoute un écart de pente aux joints. À 570 px :
image à gauche 76 px, en haut -2021,35 px, taille 960×3580,5 px ; découpe de
contrôle (450,250), 450×570 px dans la fenêtre 1120×840.
Trois contrôles du contour avant de la première paire donnent un écart de
0/0/1 pixel de capture, contre 20/18/21 avant correction. Deux points de la
seconde paire donnent 1/0 pixel, contre 27/25 avant correction. Les bords de pixels,
l'éclairage et la teinte ne sont pas certifiés identiques à l'original.

Validation : `npm run check` réussi, 568 tests / 79 fichiers. Le nouveau test
mesure sept points du profil de chacune des deux paires à partir des vertices,
avec tolérance d'une unité de hauteur arcade pour l'escalier du raster natif.
Chrome WebGL2/SwiftShader sans erreur JS ; les deux paires et l'ombre courbe
sont visibles dans la capture. Prochaine action : confronter la vue rechargée
à la capture de Michel de 19h12 et à la superposition locale.

## Ombre courbe, axe et GOAL niveau 3 — 21 novembre 2026, captures de 19h

Les trois demandes sont corrigées et vérifiées dans Chrome :

- La découpe `openLevel4Bridge` supprimait aussi les parois d'extrémité des
  berges X=87/90, Z=91..95. Elles sont conservées ; seules les grandes faces
  le long des arches sont ouvertes. `level4-landing-cliffs` reçoit de nouveau
  les ombres du soleil existant. Le mur droit porte maintenant la silhouette
  courbe du montant. Aucune nouvelle lumière ni carte d'ombre ajoutée.
  `splitLevel4LandingWalls` garde aussi les quads complets, car les couleurs
  des murs dépendent du bord supérieur de chaque face. L'ancienne copie par
  triangles était incompatible avec cette classification.
- `fitCatapultAxle` raccourcit les extrémités transversales de l'axe importé.
  Le masque est déterminé dans la pose de repos puis conservé pour toutes les
  poses : la coupelle et le bras restent intacts, même lors du lancer.
  La bibliothèque locale d'origine n'est pas modifiée.
- Le dernier défilement d'étude du niveau 3 passe de -15440 à -15336, soit
  un curseur de 736 à 840 px. La plaque GOAL complète tient maintenant dans
  le cadrage arcade, avec une marge de 32 pixels natifs sous son coin inférieur.
  Le défilement live reste fourni par le cœur ; il n'était pas plafonné ici.

Validation : `npm run check` réussi, 567 tests / 79 fichiers, couverture,
lint, TypeScript et build. Tests de conservation des deux parois, réception
et projection sur la même carte, quads/couleurs, raccourcissement d'axe pour
plusieurs poses sans altération de source/coupelle, GOAL dans le cadre final.
Chrome WebGL2/SwiftShader aux défilements 510/620 du niveau 4 et 840 du niveau 3,
sans erreur JS. Retirer uniquement les arches basses des projecteurs modifie
4380 pixels dans la fenêtre du mur droit (RGB > 6), confirmant leur contribution.
Captures locales `/tmp/mm-1900-level4-510.png`, `...-620.png` et
`/tmp/mm-1900-level3-goal.png`. La projection reste calculée en 3D ; sa silhouette
n'est pas certifiée pixel par pixel identique au dessin arcade.

Prochaine action : comparer l'application rechargée aux captures de 19h00/19h01.
Le serveur Vite existant reste disponible sur `http://127.0.0.1:5173/terrain.html`.

## Marteaux, U, arches et arrivée — 21 novembre 2026, captures de 18h35 à 18h38

Les six points de Michel sont traités :

- Audit 68010 des marteaux : la table de 15 entrées répète les sprites aux pas
  3/4 et 8/9/10/11 et revient aux sprites initiaux aux pas 13/14. Les modèles
  importés et le secours procédural respectent désormais ces répétitions.
  Le lecteur RAM utilise surtout **+0x42/+0x44**, image effectivement émise
  par `0x13334..0x13440`, et non +0x3e, que `0x132e0` avance déjà vers la
  prochaine image. L'activation par changement de zone et les attentes restent
  dans le cœur ; aucune horloge live ajoutée. Preuves détaillées dans DECISIONS.
- Le dessus des six blocs du support en U partage un matériau gris uni,
  sans texture ni joints (`level4-catapult-rim-top`), possédé par la scène.
  Les joints des faces verticales restent en place.
- Les deux paires d'arches reçoivent les ombres du soleil et restent dans sa
  liste de projecteurs. Le masque de palette des faces internes conserve leur
  réaction à la lumière, au lieu de leur imposer le rouge sombre extérieur.
  La géométrie et les dimensions approuvées sont conservées.
- Les faces basses de fin de niveau (sommet <= 16228 et secteur X+Z >= 146)
  sont jaunes sur toute la hauteur. La classification est constante par face ;
  les murs élevés conservent la frontière et les pointillés rouge/jaune.
- Drapeaux de l'arrivée du niveau 4 : damier jaune pâle/noir et mâts jaunes.

Validation : `npm run check` réussi, 565 tests / 78 fichiers, couverture,
lint, TypeScript et build. Tests ciblés du lecteur RAM (image émise différente
de l'image suivante), répétitions des poses, fin escamotée, secours procédural,
matériau gris partagé sans texture, deux arches réceptrices, murs bas jaunes
et damiers. Chrome WebGL2/SwiftShader aux défilements 510/620/784, aucune
erreur JavaScript. Contrôles A/B du soleil, de la réception et de la projection
des ombres ; voir VALIDATION pour les mesures et limites.

Limite : les poses du mesh Rolling Madness restent une adaptation des sprites,
les timings et déclenchements sont ceux du cœur. La sonde MAME confirme encore
la création des quatre objets ; les essais de téléportation n'ont pas produit
un rejeu natif complet de traversée/frappe. L'analyse du déclenchement et des
attentes repose donc sur le désassemblage, pas sur un tel rejeu. À faire avec
Michel : une traversée jouée de la zone pour apprécier visuellement les coups
et les collisions ensemble. L'application est disponible sur le serveur Vite
existant, `http://127.0.0.1:5173/terrain.html`.

## Départ : frise parasite, trait de contact et ombre du grand mur — 21 novembre 2026, captures de 18h00/18h02

Trois corrections de présentation d'après les nouvelles captures de Michel :

- La frise jaune/pointillée n'est plus appliquée aux falaises du premier secteur.
  Le masque exige maintenant X+Z >= 120. Le mur tout à gauche reste orange
  jusqu'en bas ; les zones ultérieures conservent leur jaune et leur frise.
- Le trait sous le bras gauche était une fausse auto-ombre de contact sur la
  façade X=22, Z=18..23. Cette façade reprend la teinte orange uniforme de la
  référence, avec les joints conservés. Les autres faces restent éclairées.
  Les faces Z du départ gardent leur rouge sombre sans nouvelle diagonale
  sombre artificielle ; le pilotage des ombres des secteurs suivants est gardé.
- Les parois profondes du croisement reçoivent à nouveau la carte d'ombre
  complète du soleil (`key`). Elle contient les grandes falaises, les tremplins
  et leurs parois. La petite carte locale excluait des contributions nécessaires
  au grand mur droit : `createLevel4JumpShadows.ts` est supprimé, ainsi que son
  exclusion des récepteurs de l'éclairage principal. Cela supprime aussi une
  lumière et une texture d'ombre supplémentaires. Les grandes parois restent
  des projecteurs et des récepteurs dans la même carte.

Le test de non-régression vérifie le raccord des parois à la carte complète,
la présence des falaises et des tremplins parmi les projecteurs, l'absence
d'exclusion des récepteurs et le nettoyage de scène. Les règles
arcade, les positions et les dimensions de la géométrie ne changent pas.

Validation : `npm run check` réussi, 563 tests / 77 fichiers, couverture,
lint, TypeScript et build. Chrome WebGL2/SwiftShader : défilements 0, 160 et
620, sans erreur JS. Le contrôle d'image ne trouve aucun pixel jaune dans
la zone du mur gauche examinée et confirme du jaune dans le secteur aval.
La façade sous le bras gauche est orange aux deux points de contrôle qui
étaient sombres. La comparaison des ombres du soleil activées/désactivées
modifie 6211 pixels dans la zone réceptrice examinée à droite.

Les captures attendent la scène puis plusieurs frames de la boucle normale ;
ne pas ajouter de `scene.render()` manuel concurrent pendant cette vérification.
Le tracé des ombres reste une projection 3D, sans identité pixel par pixel
avec le dessin arcade. Prochaine action : confronter l'application rechargée
aux captures de 18h00/18h02, particulièrement la diagonale du grand mur droit.

## Raccord de pente, éclairage et comparaison du départ — 21 novembre 2026, captures de 10h13 à 10h25

Le raccord X=82 de la seconde zone ne contient plus de marche rouge : le
palier X=80..82 est à 16264 et les quatre lignes de la pente commencent
exactement à cette hauteur. Les bords atteignent 16272 à X=87, le centre 16276. `level4LandingNormals` conserve une normale d'éclairage commune aux
deux triangles de chaque dalle du petit palier/pente. Les variations
résiduelles du relevé ne forment plus de diagonales de teinte. Cela reste
une correction de présentation, sans modification des règles arcade.

L'analyse du mesh local `lev4.ase.mesh` a montré que les grandes parois
entrantes devaient continuer jusqu'au coin (22,23). Les supprimer avait
créé la cavité noire signalée par Michel. Elles sont rétablies, ainsi que
les deux faces des chemins gris inférieurs. Seuls les bras sortants restent
en porte-à-faux. La référence distingue bien ces bras des rampes entrantes.

L'éclairage des faces arrière visibles était incorrect : le matériau de
falaise a maintenant `twoSidedLighting=true`. Les faces X visibles sont
orange, les faces Z rouge sombre, sans les plages rouge vif introduites
par la correction intermédiaire. La peinture ambiante reste modulée par
les ombres. Repères RGB dans les captures fournies : rouge sombre de
l'original 93/14/7, rendu 95/14/7 ; orange original 189/78/32, rendu
190/80/32. Ce sont des prélèvements des images PNG, pas une calibration
colorimétrique d'écran.

Les parois profondes du départ sont maintenant séparées du bandeau dans
`level4-jump-ramp-walls`. Elles reçoivent les ombres des tremplins via
`createLevel4JumpShadows`, lumière directionnelle et carte locale 2048
possédées par la scène. La direction solaire reste celle du niveau. La
paroi est exclue de l'éclairage directionnel global pour éviter le double
éclairage ; elle reste un projecteur dans sa carte globale. La carte locale
contient les sols dorés et leurs bandeaux, sans auto-ombrage des grandes
parois. La comparaison Chrome avec/sans ombre locale donne 1420 pixels
modifiés dans la zone réceptrice examinée. Les ombres sont recalculées en 3D ;
leur contour ne reproduit pas exactement le dessin de l'arcade.

Comparaison avec `MarbleMadness_Level4.png` : superposition à l'échelle 5/3,
translation (76,-1) sur une capture de 1120×840. Les bras dorés sortants
mesurent 5 cases côté gauche à l'écran et 3 côté droit ; les chemins gris
sous-jacents s'étendent sur 9 et 7 cases, soit 4 cases de plus chacun.
Les UV des bras répètent une fois par case. Le gris des joints verticaux
est porté à 102/255 et leur bande à 4 texels sur 16, correspondant aux
barres de 4 pixels sur un pas de 16 observées dans la vue complète native.
Les joints des faces terminales ont une largeur de 0,085 et le même gris.
Les joints du sol doré sont ocre (ton minimal 122), et non presque noirs.

Validation : `npm run check` réussi, 563 tests dans 77 fichiers, lint,
typage, couverture et build. Tests des arêtes communes, absence de paroi
au raccord de la pente, normales identiques par dalle, conservation des
normales ailleurs, parois restaurées, nombres de cases via UV, réception
et projection des ombres locales, destruction des ressources. Chrome
WebGL2/SwiftShader : vues 0/160/620 px, puis comparaison superposée du départ,
sans erreur JS. Les vues 510/784 avaient aussi été vérifiées au cours du lot.
Une traversée arcade n'est pas une validation nouvelle de cette intervention.

Prochaine action : comparer le rendu rechargé à la capture de 10h25 en gardant
le cadrage arcade. La superposition de contrôle est dans le fichier temporaire
`/tmp/mm-start-original-overlay.png` ; elle sert à vérifier les repères,
pas à certifier une identité pixel par pixel.

## Raccords de la seconde arche et joints des tremplins — 21 novembre 2026, après captures de 09h55/10h00

Les corrections précédentes avaient aplati les bandes du mauvais côté du
passage et ajouté une pente au-dessus des arcs. Les captures originales et
les hauteurs du relevé montrent deux cases plates à 16260 en Z=92..94,
encadrées par une pente d'une case sur chaque côté (Z=91..92 et 94..95),
avec les arêtes extérieures à 16272. Ce profil est restauré sur X=90..94.
Les deux arcs du passage X=87..90 ont maintenant un dessus horizontal à
16272, exactement jointif à ces arêtes. La pente longitudinale ajoutée
sur leur première case est retirée.

Les deux rangées du grand plan incliné X=94..98 partagent désormais les
mêmes sommets, de 16260 à 16228. Les coins SW erronés ne produisent plus
le pli triangulaire au raccord du palier ni au pied. Le raccord de l'autre
palier X=82..87 rejoint son bord extérieur à 16272 et reprend le bord
amont à 16264, avec les deux biseaux conservés.

La peinture locale du passage est rouge sur les parois longitudinales,
avec la frise rouge/jaune au niveau 16228 ; l'abaissement diagonal global
de la frise ne s'applique plus à cette zone. Le relief reste éclairé.
`splitLevel4LandingWalls` isole les parois du petit palier de la réception
de la carte d'ombre globale : les stries d'auto-ombrage constatées dans
Chrome disparaissent, les parois restent des projecteurs d'ombres sur le
couloir inférieur. Leurs triangles sont retirés du mesh de falaise principal.

`createLevel4RampEndJoints` ajoute un contour de mortier gris sur les faces
verticales exposées des deux cubes terminaux suspendus (Z=27 et X=28).
Les bandes ont une largeur de 0,055 unité et un décalage extérieur de 0,003
pour éviter la superposition des faces. Le matériau sans éclairage conserve
la lisibilité du joint sur le fond rouge. Mesh et matériau appartiennent
à la scène, sans observer supplémentaire.

Validation : `npm run check` réussi, 560 tests dans 76 fichiers, couverture
V8 au-dessus des seuils, lint, TypeScript et build. Tests de non-régression
pour la hauteur constante des arcs, les deux cases plates et les pentes,
les raccords haut/bas du grand plan incliné, les joints et leur nettoyage,
et la séparation sans duplication des parois du palier. Chrome WebGL2 a
rendu les défilements 0/510/620/784 px sans erreur JS ; captures examinées.
Les tests de rendu et de géométrie ne constituent pas une nouvelle traversée
arcade. Prochaine action : comparer dans l'application rechargée les zones
du départ et du second passage aux deux dernières captures originales.

## Rampes, deux passages et marteaux — 21 novembre 2026

Les demandes des captures de 09h13 à 09h24 sont traitées dans la présentation
uniquement. Aucun changement des ROMs, des collisions ni de la simulation arcade.

- Départ : suppression des deux soutènements pleins sous les rampes dorées.
  Les bandeaux et sous-faces restent, avec une seule sous-face au croisement.
  Les supports du chemin gris inférieur sont conservés. Le filtrage PCF de
  l'ombre globale et le retrait de l'auto-ombrage des bandeaux réduisent l'acné.
- Premier passage : le haut des deux bandes passe de 16268 à 16264, pour
  rejoindre le niveau de la plateforme. La crête intérieure est conservée.
- Second passage : les indices sont retournés pour l'axe X. Les normales
  étaient inversées par rapport au passage sur Z ; l'arche avant était éclairée
  comme le fond et perdait son contour. Les deux biseaux du palier X=82..87,
  Z=91..95 sont reconstruits, avec raccords cohérents aux rangées centrales.
  Le biseau d'entrée des bandes rejoint la rive à 16272 puis descend à 16260.
- Marteaux : le rang passe de X=104 à X=105, avec ancrage importé à 105,45 et
  Z=102,5/104,5/106,5/108,5 (cases 10/8/6/4 depuis le bas), orientation
  retournée de π à 0. Le modèle utilisé reste `hammer.ase.mesh` de Rolling
  Madness. Le lecteur RAM convertit les coordonnées entières par division par
  huit. La boucle locale live a été supprimée ; sans image native active ou
  après réinitialisation les marteaux sont masqués. Le secours procédural
  reçoit aussi les images natives et ne boucle plus en mode jeu.

**Correction des anciennes notes de passation :** la création des marteaux
suit les tranches de défilement (table `0x1dfd4`, entrée 40..64). L'entrée
native en zone 10 réveille ensuite leurs scripts. L'ancienne animation locale
« visible dès F4 » et l'ancien lecteur qui comparait 102 directement à la
coordonnée RAM 816 empêchaient une synchronisation correcte. Les preuves et
les limites de la sonde MAME sont dans `docs/DECISIONS.md`.

Validation : `npm run check` réussi, 557 tests dans 76 fichiers, couverture
métier au-dessus des seuils, lint, typage et build réussis. Tests ajoutés pour
les normales de l'arche avant, la hauteur du premier passage, les deux biseaux,
l'absence de sous-faces superposées et le pilotage des marteaux sans horloge.
Chrome WebGL2/SwiftShader : captures aux défilements 0, 510, 620 et 784 px,
sans erreur JS. Un second contrôle navigateur injecte des enregistrements RAM
au format réel : les quatre poses 2/6/9/12 sont visibles aux nouveaux ancrages
et restent inchangées pendant 20 notifications de rendu. Il s'agit d'un test
du rendu, pas d'une partie native complète.

Prochaine action concrète : Michel peut rejouer F4 et confronter le passage en
zone 10 aux frappes et collisions natives. Le choix des poses Rolling Madness
reste une correspondance visuelle des images arcade ; la fidélité du mouvement
en situation doit encore être appréciée sur une traversée jouée.

## Deux passages à arches fines — correction du 20 novembre 2026 au soir

`npm run check` réussi avec 553 tests.

Lecture des captures de Michel et du maillage local
`lev4.ase.mesh` de Rolling Madness 3D. Les bandes de bord mesurent
0,1 case dans le modèle de référence, aux deux côtés des passages.
Leur intrados comporte des jambages hauts et une courbe peu bombée.
La demi-ellipse précédente partait du sol et produisait une voûte
trop volumineuse.

Les bordures du premier passage restent en X=76 et X=79 sur Z=78..81.
Le retrait des falaises est corrigé pour ces faces, qui n’étaient pas
celles retirées par l’ancien filtre. Le profil est abaissé au centre
avec des extrémités hautes et les faces supérieures des bandes sont
fermées. Pour le second passage, le dallage supérieur ajouté en
X=87..89/Z=91..94 est retiré. Le couloir bas reste à 16228 et les
deux bandes fines bordent son croisement. Les parois du couloir inférieur
ont un propriétaire unique pour supprimer les surfaces superposées.

Les bandes reçoivent l’éclairage directionnel et projettent leurs ombres.
Leur auto-ombrage via la carte du niveau est désactivé : cette carte
produisait des artefacts sur ces faces de 0,1 unité. Les proportions
en hauteur sont une adaptation du profil du modèle de référence au
relevé arcade. Vérification Chrome aux défilements 510 et 620 px.
La traversée et la vue libre restent à valider par Michel.

## Parois latérales sous la seconde arche, raccord du biseau du tablier et rampes de saut — 20 novembre 2026

- **Parois sous le couloir inférieur de la seconde arche (`X = 87..90, Z = 88..97`)** (`src/rendering/createTerrainStudy.ts`, `src/rendering/createLevel4ArchBridge.ts`, `src/rendering/createLevel4Materials.ts`) :
  - `createTerrainStudy.ts` génère désormais `level4-underpass-cliffs` pour les deux parois extérieures du couloir inférieur (`X = 87` et `X = 90` sur `Z = 91..95` à la hauteur `16228`) afin que le dallage inférieur sous l'arche repose sur de vraies falaises texturées et non dans le vide.
  - Dans `createLevel4ArchBridge.ts`, `openLevel4Bridge` retire la marche interne résiduelle en `X = 87` sur toute la largeur `Z = 91..95` du pont supérieur, et la crête des deux arches `level4-lower-bridge-arches` épouse le biseau gauche `X = 87..88` (`16276 -> 16260`) jusqu'au tablier plat `X = 88..90` (`16260`).
  - Dans `createLevel4Materials.ts`, les bordures `Z = 91` et `Z = 94` sur `X = 90..93` sont maintenues planes à `16260` dans l'alignement exact du tablier supérieur (`Z = 91..95`).
- **Rampes de saut dorées détachées du sol (`X = 22, Z = 19..26` et `Z = 23, X = 19..27`)** (`src/rendering/createLevel4ArchBridge.ts`, `src/rendering/createTerrainStudy.ts`, `src/rendering/createLevel4Materials.ts`) :
  - Dans le relevé 2D (`local-roms/level4-terrain.json`), une seule hauteur par case (`16344`) écrasait les deux chemins gris inférieurs (`16320`) et générait des falaises pleines sous les deux tremplins dorés qui se croisent en `(X = 22, Z = 23)`.
  - `level4DisplayTerrain` maintient la dernière dalle `(X = 22, Z = 26)` horizontale à `16344` en l'air ; `createTerrainStudy.ts` prolonge les deux chemins gris (`level4-floor` à `16320`) sous les tremplins jusqu'à leur jonction angle-à-angle en `(X = 23, Z = 24)` et ajoute `level4-top-surface` aux projecteurs d'ombres (`shadows.addShadowCaster(topFloor, false)`).
  - `openLevel4Bridge` retire les parois pleines sous les deux tremplins en porte-à-faux et `createLevel4ArchBridge` construit `level4-jump-ramp-fascia` : bandeaux latéraux et d'extrémité fins (`0,85` unité sous `toY(16344)`), sous-faces horizontales pour une ombre portée nette sur les chemins gris et les falaises, et parois de falaise en retrait (`X = 22, Z = 19..24` et `Z = 23, X = 19..23` sous le croisement haut ; `X = 23, Z = 24..31` et `Z = 24, X = 23..32` sous les chemins gris).
- **Validation** :
  - Vérification visuelle dans Chrome WebGL2 sur `terrain.html` (Niveau 4 au défilement `0 px`).
  - `npm run check` (`prettier --check`, `eslint --max-warnings 0`, `tsc --noEmit`, `vitest run --coverage` avec `553` tests passants sur `45` fichiers, `vite build`) entièrement vert.

## Marteaux 3D visibles dès F4, croisement à double arche, fond de catapulte et recul des aspirateurs — 20 novembre 2026

- **Marteaux 3D visibles dès `F4` et synchronisés en zone `10`** (`src/rendering/createRollingHammers.ts`, `src/rendering/createRollingHammers.test.ts`, `src/emulation/level4Hammers.ts`) :
  - Tant que la bille n'a pas encore atteint la zone `10` (`0x23b28 : X ≈ 102, Z ≈ 99`) en mode jeu (`F4`), le cœur 68010 n'a pas encore instancié les 4 slots RAM de marteaux (`kind = 0x0c`, `id = 0x0a`). `createRollingHammers` anime désormais un cycle local déphasé sur les 4 marteaux tant qu'aucun slot RAM n'est actif (`hasActiveRamHammers === false`), puis bascule automatiquement sur les pointeurs RAM natifs (`0x20c14` escamoté sous la piste et `0x22346..0x2237e` en frappe) dès que la bille entre dans la zone `10`.
  - En mode étude (`terrain.html`), les emplacements `0` et `2` (espacés de `4` cases) restent affichés en pose armée (`pose 6`) à l'échelle `0,088` conformément à `MM_original_levels_full_views/MarbleMadness_Level4.png`.
- **Croisement supérieur/inférieur de la seconde arche (`X = 87..90, Z = 91..95`)** (`src/rendering/createLevel4ArchBridge.ts`, `src/rendering/createLevel4ArchBridge.test.ts`, `src/rendering/createLevel4Materials.ts`, `src/rendering/createTerrainStudy.ts`) :
  - Le relevé 2D de la grille de hauteurs ne conservait qu'une seule hauteur par case (`16228`, celle du couloir inférieur) au croisement `X = 87..89, Z = 91..94`, ce qui coupait le tablier supérieur (à `16260`) et laissait l'arche plaquée contre un mur rouge.
  - `level4DisplayTerrain` restitue le tablier supérieur continu à `16260` sur `X = 87..89, Z = 91..94` (avec la marche sombre d'une case en `X = 87` descendant de `16276` à `16260`), `createTerrainStudy.ts` ajoute le dallage du couloir inférieur (`level4-underpass-surface` à `16228`), et `createLevel4ArchBridge.ts` oriente les deux arches `level4-lower-bridge-arches` selon l'axe `X` en `Z = 91` et `Z = 95` (`openLevel4Bridge` retirant les parois pleines sous le pont).
- **Fond de la coupelle de la catapulte au repos** (`src/rendering/createRollingCatapult.ts`) :
  - `baseHeight` relevé à `2,1 * scale` pour que la coupelle repose au-dessus du dallage sans qu'aucune dalle grise ne traverse le fond rouge au repos, tout en conservant la table `nativeThrowToPose` (`1..20`) pour la levée rapide en `3` frames au lancer.
- **Recul et course verticale des aspirateurs** (`src/rendering/createLevel4Materials.ts`, `src/rendering/createTerrainStudy.test.ts`) :
  - Recul des 6 supports d'aspirateurs à `1,16` unité du centre de la dalle de bordure (`0,66` unité hors de la falaise), réduction de la course verticale de retrait à `1,1` unité et masquage sous le seuil `extension < 0,35` pour que le pavillon ne donne jamais l'impression de traverser le dallage en descendant.
- **Validation** :
  - Vérification visuelle dans Chrome WebGL2 sur `terrain.html` (Niveau 4 aux défilements `280 px`, `500 px`, `620 px` et `784 px`).
  - `npm run check` (`prettier --check`, `eslint --max-warnings 0`, `tsc --noEmit`, `vitest run --coverage` avec `553` tests passants sur `45` fichiers, `vite build`) entièrement vert.

## Arches réduites en aval et têtes de cylindres encastrées — 20 novembre 2026

Le premier placement des arches sous la plateforme des cylindres était
erroné. Le span est désormais placé sous le tronçon transversal X=73..75,
Z=78..80, à la hauteur arcade 16228. Il mesure trois cases et descend
de 2,3 unités de présentation. Les deux côtés sont orientés sur Z
constant et la plateforme haute retrouve ses faces pleines.

Les motifs rouges partent de la limite entre jaune et orange. Leur
bord inférieur est sur cette limite et le jaune forme une petite
surélévation autour. Les têtes rétractées sont maintenant des disques
plats plus larges, avec un joint circulaire gris foncé et sans spéculaire.
Le minimum de gris des joints du dallage du niveau 4 est relevé.

Tests de géométrie adaptés à l’emplacement et à la hauteur réduite.
La traversée du pont et le rendu de tous les angles restent à valider
en jeu. La géométrie du relief reste un réglage visuel depuis les captures.

## Arches, peinture des falaises, cylindres affleurants et ombres — 20 novembre 2026

`npm run check` réussi avec 551 tests.

La scène affiche deux arches sous le tablier des cases X=76..78,
Z=72..77. Les faces pleines des deux côtés ont été retirées dans cette
portion. Les 36 cylindres possèdent une tête circulaire gris métal au
ras du dallage, y compris pendant leur attente. Les fûts restent
pilotés par les slots natifs.

`level4CliffPaint` colore les murs orange en haut et jaune en bas,
avec une bordure de tirets. La hauteur de séparation et sa progression
vers l’aval sont des réglages de présentation estimés depuis la vue
complète. Leur calage exact reste à comparer. Le plugin s’applique
également aux arches et au support de la catapulte.

Le support de catapulte n’ajoute plus de face coplanaire sous le haut
de la falaise extérieure à X=62. Les textures de joints sont répétées
explicitement en coordonnées monde pour supprimer les grandes surfaces
grises. Une lumière directionnelle de même direction et intensité que
le soleil éclaire uniquement les deux meshes importés de la catapulte,
avec une carte d’ombre locale de 2048 et filtrage PCF. Le soleil général
exclut ces deux meshes pour éviter un double éclairage.

Chrome a affiché les caps et les arches aux défilements 440 et 510,
sans erreur JS. Les tests de scène vérifient le découpage des murs,
la construction de l’arche et les caps au repos. Une partie complète
F4 et le réglage humain de la séparation des couleurs restent ouverts.

## Support maçonné et conduit prolongé — 20 novembre 2026

Le support de la catapulte est maintenant un relief en U dans le plan,
avec trois couronnements gris et des parois descendant jusqu’à la base
des falaises. Les faces réutilisent le matériau des falaises et alignent
leurs UV de joints sur la grille du monde. Les anciens montants et la
petite semelle ont été retirés. La catapulte importée garde ses poses.

Vérification visuelle dans Chrome effectuée, sans erreur JavaScript.
`npm run check` réussi avec 550 tests.

La comparaison avec `hoover_down` montre un long conduit dont le bas
reste fixe dans les poses. Le conduit procédural a été prolongé vers le
bas pour que son extrémité reste sous la piste. Le pavillon avance de
0,3 unité supplémentaire. Le fond de gorge a été avancé aussi pour
dégager la bouche du tube. Les six orientations suivent le même montage.

Les tests vérifient le prolongement des murs, les matériaux du support,
le bas du tuyau et l’avancée du pavillon. Prochaine vérification en
partie : observer les sorties et retraits des six aspirateurs depuis F4.

## Catapulte importée avec accord de l’auteur — 20 novembre 2026

Michel confirme avoir contacté l’auteur de Rolling Madness 3D et obtenu
son accord pour réutiliser ses modèles. La catapulte utilise maintenant
`catapult.ase.mesh`, `catapult_throw.ase.mesh` et `catapult.PNG` depuis
l’extraction locale. Les autres entrées de la bibliothèque locale ont
été préservées. Le script d’extraction inclut les deux modèles et
résout la casse des noms de textures.

`createRollingCatapult` installe les maillages possédés par la scène et
raccorde leurs poses au numéro d’image natif. Le berceau procédural
reste visible. Le bras et la coupelle procéduraux restent disponibles
en secours lorsque la bibliothèque manque. L’ancienne version est aussi
conservée sous `docs/backups/level4-catapult-procedural.ts.txt`.

L’intégration est disponible en jeu et dans la scène d’étude. Le test
NullEngine vérifie repos, tir, retour au repos et conservation du secours.
Chrome vérifie aussi les poses réelles au repos, pendant le tir et au
retour, avec leur texture locale. `npm run check` réussi avec 550 tests.
La scène d’étude a été examinée sans erreur JS. La géométrie
du support et le calage pendant une vraie partie restent à confronter
aux captures de Michel.

## Gabarit des mécanismes et comparaison arcade — 20 novembre 2026

Les conduits sont plus épais, raccourcis et montés entièrement à
l’extérieur du dallage. Les têtes sont plus larges et moins hautes.
La catapulte procédurale a un bras allongé, une coupelle épaissie et
deux murets avec retours à angle droit autour de l’axe. Le centre de
lancement reste le même. Les joints de falaise ont leur propre teinte
grise, indépendante de la couleur orangée ou jaune du mur.

L’ancienne catapulte procédurale est conservée sous
`docs/backups/level4-catapult-procedural.ts.txt`. Le maillage extrait de
Rolling Madness 3D reste une référence locale. Les superpositions
Chrome à 50 % utilisent les captures MAME 1177 et 1297, avec les
défilements natifs de 128 et 314 px. Le cadrage général présente
encore un décalage des contours du décor. La comparaison a servi
à élargir le bec, avec un modèle et un support propres au projet.
La vérification en partie reste ouverte.

## Becs rectangulaires, support carrelé et cylindres natifs — 20 novembre 2026

Le bec des aspirateurs a une ouverture rectangulaire à coins arrondis.
Le bras de la catapulte est raccourci et rejoint le dessous de la coupelle.
La semelle de la catapulte reçoit quatre carreaux séparés par des joints.
Les faces des montants réutilisent le matériau de la piste.

La ROM définit 36 cylindres et non les deux rangées du prototype.
Les tables à `0x24406`, `0x2442a` et `0x2444e` donnent trois groupes
de 3 × 4, en cases X/Z 69..71/55..58, 69..71/63..66 et 76..78/74..77.
`0x186ac` initialise la table `0x401650` quand une bille active entre
en zone 4 ou 5. La routine remet la table à zéro lorsque plus aucune
bille active n’y est présente. Le cœur échelonne les montées par compteurs
et fait défiler treize pointeurs d’image (montée, maintien, descente).
Dans MAME, la zone 4 s’active à 1204 et les premiers slots montent à 1205.
Les autres groupes commencent ensuite suivant leurs propres compteurs.

Le rendu live lit la table native. Il affiche les seuls cylindres en
mouvement, avec quatre niveaux de hauteur de présentation. La scène
d’étude seule montre les becs et la catapulte. Chrome a permis de contrôler
les deux nouveaux maillages à 270 et 440 px. Une RAM de test dans Chrome
a vérifié quatre slots observés dans MAME à des hauteurs distinctes.
`npm run check` réussi avec 549 tests. Une traversée manuelle F4
du secteur des cylindres reste à vérifier.

## Maillages procéduraux des mécanismes — 20 novembre 2026

Les aspirateurs disposent maintenant d’un pavillon ovale creux à lèvre
arrondie, avec un conduit effilé. Le repère des fragments a été replacé
dans la gorge. La catapulte comprend une coupelle creuse, un bras incliné
et un berceau fixe avec semelle et deux montants. La semelle repose sur
le niveau du dallage au droit du mécanisme. La coupelle garde le même
centre horizontal au repos, au point de départ de la bille.

Les maillages sont générés localement dans `createLevel4Materials.ts`.
Les fichiers extraits de Rolling Madness 3D restent des références
d’analyse. Les tests NullEngine vérifient l’assise du support, son
immobilité pendant le tir et le centrage de la coupelle. Captures Chrome
examinées à 280 et 440 px. `npm run check` réussi avec 547 tests.
Prochaine vérification en jeu : inspecter les mécanismes en parcourant F4.

## Fragments d’aspiration et catapulte du niveau 4 — 20 novembre 2026

La vue live lit l’état de bille `0x0a`, le compteur natif et l’index
de l’aspirateur. Huit fragments procéduraux par joueur remplacent la bille
le temps de l’aspiration et convergent vers le bec. La phase de
reconstruction réutilise le rendu existant.

La catapulte native est un objet de type `0x0a`. La routine `0x29e22`
exige une distance strictement inférieure à huit unités arcade sur
chaque axe, une vitesse verticale nulle et un mécanisme prêt. Elle
repositionne la bille en X et Z sur l’acteur avant l’impulsion. La sonde
MAME 0.271 a observé le point (504, 560), le pointeur de repos `0x2111e`,
puis `0x210ca` à l’impulsion (image 1298, vitesse verticale +10).
Les maillages de Rolling Madness 3D décrivent le modèle de repos et
22 poses de tir sur 2,03 s, avec le matériau `catapult.png`.

La coupelle procédurale a son centre au point natif de départ et le
mouvement repose sur les pointeurs d’image du cœur. La scène d’étude
présente la catapulte au repos. `npm run check` réussi avec 547 tests.
Chrome WebGL2 a vérifié le cadrage de la bille dans la coupelle et les
fragments à partir de poses de contrôle. Prochaine vérification en jeu : passer
successivement par un aspirateur et par la coupelle depuis F4.

## Aspiration de la bille — comparaison des deux jeux — 20 novembre 2026

Les fichiers locaux de Rolling Madness 3D définissent deux animations pour
le mécanisme et une pour la bille.

| Maillage                 | Poses | Durée déclarée | Triangles | Matériau     |
| ------------------------ | ----: | -------------: | --------: | ------------ |
| `hoover_down.ase.mesh`   |    12 |        0,333 s |       254 | `hoover.png` |
| `hoover_on.ase.mesh`     |    12 |            2 s |       254 | `hoover.png` |
| `player_hoover.ase.mesh` |    17 |            2 s |       224 | `player.png` |

`actor/hoover.txt` rejoue le retrait à l’envers pour la sortie. L’état
actif boucle sur `hoover_on` avec `hoover_72.ogg`. Les bornes du bec
descendent dans `hoover_down` et fluctuent légèrement dans `hoover_on`.
La texture `hoover.png` est un aplat RGBA (242, 198, 0, 255) de 16 × 16.
Le volume du bec vient du maillage et de son éclairage. Dans
`player_hoover`, la bille s’allonge vers le bec et les sommets convergent
vers un seul point à la dernière pose. Cette animation figure déjà dans la
bibliothèque locale. Le rendu actuel ne la sélectionne jamais.

Arcade, MAME 0.271 et BIOS TTL. Après initialisation contrôlée de la
position et de la vitesse en amont, le cœur joue la capture sans intervention
supplémentaire. À l’image 1178, la bille entre dans l’état `0x0a` à
`player + 0x1a`, avec `0x20` au compteur `player + 0x57` et l’index de
l’acteur à `player + 0x58` (base J1 à `0x400018`). La routine `0x13d38`
émet des sprites successifs vers le bec. Les coordonnées monde de la bille
restent fixes pendant cette phase. L’image 1177 montre la sphère intacte,
1184 et 1200 des fragments bleus, et 1232 la disparition près du bec.
À 1242, l’acteur entame son retrait et la bille passe à l’état `4` de
reconstruction. Les images restent temporaires.

Le lecteur `practicePose` ne transmet pas l’état `0x0a` et le
rendu n’a donc pas de signal d’aspiration distinct. Pour un futur effet
procédural, lire cet état, son compteur et l’index de l’acteur. Animer
uniquement la présentation depuis la position figée vers le bec, puis
laisser le chemin de reconstruction existant reprendre. Aucune modification
des maillages en scène ou de la simulation pendant cette comparaison.

## Aspirateurs procéduraux synchronisés — 20 novembre 2026

La vue 3D emploie six supports procéduraux en bord de piste. Hors partie,
la scène d’étude les montre déployés. En partie, les pointeurs d’image
lus dans les slots d’objets du cœur épinglé pilotent la hauteur du bec.
L’image d’attente ou un slot inactif masque l’aspirateur. Le rendu revient
à l’état masqué après une pose absente. Le déplacement vertical et ses
dimensions sont propres aux modèles procéduraux. Les règles arcade restent
dans le cœur. La confirmation d’une restauration utilise le niveau demandé
par F2, F3 ou F4. F2 conserve sa vérification de coordonnées.

Tests ciblés sur les deux types, les pointeurs d’ouverture et de retrait,
l’identifiant indépendant du slot et le masquage. Chrome WebGL2 sur le
relevé local, avec réinjection des pointeurs observés dans MAME dans une
RAM de test : six meshes créés, zéro visible au repos, puis alternance
attendue entre les aspirateurs 0 et 2. Capture examinée, aucune erreur JS.
La reprise F4 a été confirmée dans Chrome avec le cœur réel. Un déplacement
artificiel vers la zone 31 a changé la zone du joueur sans initialiser les
slots d’aspirateurs dans ce rejeu Web. Une partie qui suit le parcours reste
à vérifier. `npm run check` réussi avec 545 tests.

## Aspirateurs du niveau 4 — déclenchement arcade — 20 novembre 2026

Le désassemblage du programme 68010 et une sonde MAME 0.271 avec le BIOS
TTL confirment six aspirateurs, identifiants de zone `0x1e..0x23`, types
d’acteur `0x0b` et `0x0d`. Le tableau de scripts du niveau commence à
`0x1dfd4`. Les acteurs en attente ont l’état `4` et un pointeur d’image
`0x20c14`, observé en RAM à l’initialisation des six.

- `0x1365c` lit la table des frontières du niveau (`0x23ac0`) et compare
  la case avant/après un pas de simulation. La direction de sortie d’un
  segment détermine le nouvel identifiant de zone de la bille.
  `0x13966` sélectionne le script d’ouverture de l’acteur associé.
- Le script d’objet vérifie à `0x12ca8` si une bille active occupe encore
  l’une des deux zones qu’il surveille. Le retour à l’attente et le script
  de retrait consécutif à une capture sont deux chemins distincts.
  L’aspiration passe par `0x13d38` et le retrait après capture par
  `0x25674` pour le type `0x0b`.
- Les six positions sont renseignées dans les scripts d’initialisation
  `0x1d7d0`, `0x1d7e6`, `0x1d7fc`, `0x1d812`, `0x1d828`, `0x1d83e`.
  Dans le repère de la grille (X, Z), les ancrages lus sont (39, 36),
  (48, 36), (50, 46), (34, 42), (42, 42) et (44, 52), tous à la hauteur
  16300 en unités arcade. Les captures de Michel montrent des becs au bord
  de la piste.
  Les deux socles au centre de dalles et le mouvement continu actuellement
  codés dans `createLevel4Landmarks` expliquent l’écart de présentation.

Sonde contrôlée avec position et vitesse initialisées près de deux frontières,
puis simulation native. Entrée en zone 30 à l’image 1122, ouverture de
l’aspirateur correspondant. Entrée en zone 32 à 1140, ouverture du second
type et retrait du premier, qui retrouve le pointeur vide à 1186.
Dans un essai sans franchissement précoce de la seconde frontière, le
premier a alterné deux images actives puis le chemin de capture a lancé
son retrait à 1242. L’étude concerne les aspirateurs seulement. Aucune
modification du rendu ni de l’émulation.

## Mécanismes procéduraux du niveau 4 — 20 novembre 2026

Les deux aspirateurs, les six pistons, la catapulte et les deux marteaux
prennent leur hauteur au centre de dalles présentes dans le maillage affiché.
Les becs basculent, les pistons se rétractent à hauteur de piste et les bras
pivotent sur des axes distincts de leurs socles. Les dimensions et cycles
sont des choix de présentation à vérifier en partie. La capture arcade et
les définitions d’acteurs ont servi de référence pour identifier les mécanismes.

Validation dans `createTerrainStudy.test.ts` avec une grille synthétique.
Contrôle visuel dans Chrome sur la vue d’étude à 315, 494 et 750 px.
`npm run check` réussi avec 542 tests. Prochaine vérification utile :
observer les interactions en partie depuis le raccourci F4.

## Extraction locale de Rolling Madness 3D — 20 novembre 2026

- Les 329 fichiers de la charge Inno Setup sont dans
  `3D_assets_for_animated_entities/data/{app}/`. Le dossier local contient aussi
  4 ressources intégrées à l’installateur, dont sa licence, et 6 fichiers de
  métadonnées exportés par l’extracteur.
- Les 47 maillages `.ase.mesh`, les textures, les sons, les définitions
  d’acteurs et de niveaux ont été conservés dans leur arborescence d’origine.
  Pour les niveaux 4 à 6, consulter `level/level4.txt` à `level/level6.txt`
  et les définitions `actor/world4.txt` à `actor/world6.txt`.
- Les 329 fichiers correspondent à la table de l’archive en chemin, taille
  et somme Inno. Les 339 sorties passent la vérification `SHA256SUMS`.
  Le convertisseur existant a produit un JSON temporaire avec ses 11 modèles.
  La texture `amoeba.png` diffère de celle de la bibliothèque locale actuelle.
- Prochaine action pour le niveau 4 : partir de `level/level4.txt` et des
  définitions dans `actor/`, puis déterminer les placements et les confronter
  à la RAM arcade avant de raccorder les maillages au rendu BabylonJS.

## Raccourcis rapides F3 (Niveau 3) / F4 (Niveau 4) et Niveau 4 (_Aerial Race_) — 20 novembre 2026

- **Raccourci `F3` (Niveau 3) & `F4` (Niveau 4)** (`scripts/record-level3-checkpoint.mjs`, `scripts/survey-level4.mjs`, `src/dev/localRoms.ts`, `src/emulation/localStudy.ts`, `src/ui/feasibility.ts`, `index.html`) :
  - Enregistrement local des points de reprise natifs `local-roms/level3-web.state` (départ Niveau 3 `0x2cd9e`) et `local-roms/level4-web.state` (départ Niveau 4 `0x2d648`).
  - Boutons **« Niveau 3 · F3 »** et **« Niveau 4 · F4 »** + raccourcis clavier `F3` / `F4` et paramètres `?study=level3` / `?study=level4` dans `feasibility.ts`.
- **Niveau 4 (_Aerial Race_, descripteur `0x2d648`, clé `'level4'`)** (`src/rendering/createLevel4Materials.ts`, `src/game/modern/practiceTerrain.ts`, `src/emulation/practicePose.ts`, `src/rendering/createTerrainStudy.ts`, `src/rendering/createLivePracticeView.ts`, `src/rendering/createPracticeGoal.ts`, `src/terrain.ts`, `terrain.html`) :
  - Relevé arcade complet `130 × 130` (`1 492` cellules actives, scroll `-16152 → -15368`, soit `784 px`) dans `local-roms/level4-terrain.json`.
  - Rendu BabylonJS fidèle à `MM_original_levels_full_views/MarbleMadness_Level4.png` : rampes croisées dorées/ocre au sommet (`level4-top-floor`), pistes gris pierre (`level4-floor`), falaises striées vermillon-orange en haut passant au jaune-or en bas (`level4-cliffs` + `level4CliffColors`), nettoyage des dents de scie sur les bords de fosse (`level4DisplayTerrain`), zone `GOAL` (`x = 113..116, z = 104..113`) + drapeaux animés, et bouton **« Voir le niveau 4 (étude) »** sur `terrain.html`.
  - Branchement live complet (`0x2d648` dans `readPracticePose` et `readModernPhase`, préchargement dans `feasibility.ts`).
- **Validation** :
  - `npm run check` vert (**541 tests Vitest**, couverture V8 ≥ 90 %, Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, build Vite).
  - Captures Chrome WebGL2 vérifiées sur `http://127.0.0.1:5173/terrain.html` (Niveau 4 à `0 px`, `380 px` et `784 px`).
  - **Mécanismes 3D animés & `player_hoover`** (`createLevel4Materials.ts`, `scripts/extract-rolling-actors.mjs`) : extraction de `player_hoover.ase.mesh` (`17` poses) dans `local-roms/rolling-actors.json` ; correction complète des triangles blancs sur la fente centrale (`z = 62, x = 59..63` et `z = 66, x = 57..63`) ; premiers modèles procéduraux temporaires (`createLevel4Landmarks`).
  - **Découverte importante dans `Rolling Madness 3D 2005/RollingMadness3D-Installer.exe`** :
    - Le nettoyage automatique de `/tmp` par macOS avait purgé les fichiers de `/tmp/mm-rolling-research/extracted/` datant de plus de 3 jours (ainsi que `libboost_iostreams-mt.dylib` utilisé par `innoextract`).
    - La décompression de l’en-tête Inno Setup 5.0.4 (`0x10757e6` dans `RollingMadness3D-Installer.exe`) confirme que **tous les vrais modèles 3D, animations, textures et définitions des Niveaux 4 à 6 sont bien présents dans l’installeur** :
      - Modèles & animations : `hoover_down.ase.mesh`, `hoover_on.ase.mesh`, `catapult.ase.mesh`, `catapult_throw.ase.mesh`, `hammer.ase.mesh`, `rod.ase.mesh` (pistons), `bird.ase.mesh`, `bird_fast.ase.mesh`, `bird_expl.ase.mesh`, `lev4.ase.mesh`, `lev5.ase.mesh`, `lev6.ase.mesh`, `lev6_bridge1..4.ase.mesh`, `amoeba_stretch_mini.ase.mesh`, `amoeba_squashed_mini.ase.mesh`, `blacky_mini.ase.mesh`, `stick_idle_mini.ase.mesh`, `stick_bend_mini.ase.mesh`.
      - Textures : `hoover.png`, `catapult.PNG`, `hammer.PNG`, `rod.PNG`, `amoeba.png`, `bird.PNG`, `lev4_catapult.png`, `lev4_side.png`, `lev4_tile_glass.png`.
      - Définitions du monde et des acteurs : `actor/world4.txt`, `actor/world5.txt`, `actor/world6.txt`, `actor/catapult.txt`, `actor/hammer.txt`, `actor/hoover.txt`, `actor/bird.txt`.
  - **Suite du niveau 4** : utiliser l’extraction locale décrite ci-dessus pour préparer le remplacement des modèles procéduraux de `createLevel4Landmarks` par les maillages animés.

## Niveau 3 : décodage exact ROM des vagues, pyramide du V et dalles des pentes finales — 20 novembre 2026

Corrections des 3 points signalés par Michel en test live du Niveau 3 :

- **Vague turquoise 100 % synchro sur le décodeur ROM `0x0d0a0` (`practicePose.ts`, `practicePose.test.ts`, `createLivePracticeView.ts`, `createLevel3Materials.ts`)** :
  - Désassemblage de la routine 68010 `0x0d0a0` et de ses tables `0x24c7a..0x24df4` : pour chaque dalle `i = 0..20`, `word(0x76e + i * 6)` encode directement la hauteur exacte `0x9ab4..0x9ad2` (`0..30` unités arcade, soit `0` au repos tant que la bille n’arrive pas par la passerelle du milieu) ; pour la dalle de bout `i = 21`, `word(0x7f0)` encode `0x8f84..0x8fa2` (`0..30`).
  - Suppression de l’heuristique `nearWave` dans `createLivePracticeView.ts` (la RAM arcade reste naturellement à `0` quand la bille est à gauche).
  - Recalage de `waveRegion.z` de `75` à `76` (`z = 76..97`, aligné sur les deux ponts `z = 81..82` et `z = 93..94`), hauteur physique exacte `waveMaxHeight = level3Height(16148 + 30) - waveBaseY` et suivi direct sans retard de lissage.
- **Éclairage, ombres, contraste des parois et reflets menthe du Niveau 3 (`createTerrainStudy.ts`, `createLevel3Materials.ts`, `createTerrainStudy.test.ts`)** :
  - Abaissement de `fill.intensity` (`0.34 → 0.18`), `fill.groundColor` (`0.14, 0.12, 0.10`), `level3-cliffs` `emissiveColor` (`0.025, 0.021, 0.016`) et `shadows.darkness` (`0.28 → 0.10`) pour retrouver les parois ombrées brun-charbon et les ombres portées denses du jeu original.
  - Restauration d’un spéculaire menthe maîtrisé (`specularColor = (0.55, 0.88, 0.76)`, `specularPower = 22`) et d’un contraste directionnel `[0.42..1.48]` sur les murets turquoise (`level3CurbColors`).
  - Vague turquoise rehaussée (`× 1.32`), plateau supérieur plus lumineux (`diffuse 0.32, 0.90, 0.72`, `emissive 0.09, 0.26, 0.21`) et versant ombré plus profond (`dark * 0.82`).
- **Pyramide turquoise du V (`createLevel3Materials.ts`)** : inversion du winding des 4 triangles de `level3-turquoise-spike` en sens sortant main gauche (`c1, tip, c0`, `c2, tip, c1`, `c3, tip, c2`, `c0, tip, c3`) — les 2 faces avant ne sont plus masquées par le backface culling.
- **Dalles pliées des 3 pentes finales (`createLevel3Materials.ts`)** : lissage planaire `[nw, ne, ne, nw]` des rangées `z = 86, x = 96..99` et `z = 93, x = 89..92 / 95..98` (dont `(99, 86)`, `(92, 93)` et `(98, 93)` avaient `fold = 9` juste sous le seuil `0.5`).

## Niveau 3 : pyramide du V, dalle d’entrée des pentes, ouvertures d’arche, amibes déformantes et vague plate avant approche — 19 novembre 2026

Corrections des 5 points signalés par Michel en dernier retour sur le Niveau 3 :

- **Éclairage, ombres, contraste des parois et reflets menthe du Niveau 3 (`createTerrainStudy.ts`, `createLevel3Materials.ts`, `createTerrainStudy.test.ts`)** :
  - Abaissement de `fill.intensity` (`0.34 → 0.18`), `fill.groundColor` (`0.14, 0.12, 0.10`), `level3-cliffs` `emissiveColor` (`0.025, 0.021, 0.016`) et `shadows.darkness` (`0.28 → 0.10`) pour retrouver les parois ombrées brun-charbon et les ombres portées denses du jeu original.
  - Restauration d’un spéculaire menthe maîtrisé (`specularColor = (0.55, 0.88, 0.76)`, `specularPower = 22`) et d’un contraste directionnel `[0.42..1.48]` sur les murets turquoise (`level3CurbColors`).
  - Vague turquoise rehaussée (`× 1.32`), plateau supérieur plus lumineux (`diffuse 0.32, 0.90, 0.72`, `emissive 0.09, 0.26, 0.21`) et versant ombré plus profond (`dark * 0.82`).
- **Pyramide turquoise du V (`createLevel3Materials.ts`)** : aplanissement de la cellule de base `(99, 92)` à `16124` sous la pyramide + ajout de couleurs par sommet (`level3CurbColors`) et teinte mate `(0.18, 0.58, 0.48)` sur `level3-turquoise-spike` — plus aucun triangle cyan fluo surexposé ni coin dépassant.
- **Dalles d’entrée des pentes finales (`createLevel3Materials.ts`)** : lissage planaire `[nw, ne, ne, nw]` des cellules `(92, 94)` et `(99, 87)` dont le coin `sw` échantillonnait le muret turquoise adjacent (`16148`) — suppression du pli sombre sur la dalle marron.
- **Ouvertures d’arche au pied des ponts de départ (`createLevel3Materials.ts`)** : ajout de petites arches sombres ogivales au pied des deux arcs-boutants (`footYApex = 16384 - 8.5`, sous `archProfile[5] = -6`), alignées sur `68141cba.png`.
- **Amibes déformantes (`scripts/extract-rolling-actors.mjs`, `createRollingActor.ts`, `createIntermediateActors.ts`, `createRollingActor.test.ts`)** : extraction du vrai maillage animé **`amoeba_stretch.ase.mesh`** de _Rolling Madness 3D_ (12 poses, 34 triangles) dans `local-roms/rolling-actors.json`, recentrage en Z par pose (`centerAmoebaPoses`) pour que la déformation d’étirement se fasse sur place sans double translation, matériau semi-transparent vert-acide (`alpha = 0.62`, `disableDepthWrite = true`, laissant voir les joints du sol et fusionnant les chevauchements), et pilotage continu du morph sur la distance parcourue (avec repli procédural si le modèle est absent en test).
- **Vague plate jusqu’à l’approche de la bille (`createLivePracticeView.ts`)** : maintien d’un profil plat tant que la bille n’est pas dans la zone de la vague (`pose.scroll <= -15620 || pose.z >= 70 * 8`), puis pilotage par les 22 triplets RAM `0x772 + i * 6`.
- **Validation** :
  - `npm run check` vert (537 tests Vitest, couverture V8 ≥ 90 %, Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, build Vite).
  - Captures Chrome WebGL2 vérifiées sur `http://127.0.0.1:5173/terrain.html` à `0 px` et `736 px` (pyramide du V mate et nette, dalle d’entrée des pentes parfaitement plane, ouvertures d’arche sous les ponts).
  - **Reste à confirmer par Michel en jeu live** : comportement de la vague à l’approche, déformation des amibes en mouvement et fonte dans l’acide (`player_melt`). Si besoin, on peut importer directement `amoeba_stretch.ase.mesh` de Rolling Madness 3D ou passer au **Niveau 4** (_Aerial Race_).

## Niveau 3 : amibes fluides, vague synchro RAM + joints, tuyau jointif et fonte dans l’acide — 19 novembre 2026

Corrections des 4 points signalés par Michel en test live du Niveau 3 :

- **Finitions live & rendu Niveau 3 (`createIntermediateActors.ts`, `createMarbleAnimation.ts`, `createMagicWand.ts`, `createLevel3Materials.ts`, `createTerrainStudy.ts`, `practicePose.ts`)** :
  - **Amibes fluides et semi-transparentes** : vitesse linéaire constante (`maxStep = 0.095` dalle/frame) et matériau vert-acide plus profond, semi-transparent (`alpha = 0.62` / `0.52`, `disableDepthWrite = true`) laissant voir les joints du sol et fusionnant visuellement les amibes qui se chevauchent.
  - **Bille qui fond (`player_melt`)** : application de l’échelle exacte `0.675` (alignée sur `player_broken` et la bille) avec progression linéaire 60 fps sur les 54 frames natives de `state === 9`.
  - **Baguette magique (`createMagicWand.ts`)** : baguette classique noire à embout blanc et poignée or, plus épaisse (`diameter = 0.13`), inclinée en diagonale (`tilt ≈ -0.95 rad`) sur le côté de la bille avec balancement et étincelles.
  - **Tuyau cuivre (`createLevel3Pipe`)** : `copper.backFaceCulling = true` sur `level3-pipe-shell`, supprimant le triangle parasite qui perçait la paroi verticale du tube.
  - **Tours de départ & pyramide turquoise (`createLevel3Materials.ts`)** : meurtrières gothiques en lancette (resserrées en pointe vers le haut), arches en arc-boutant descendant jusqu’à `base` sur leur moitié inférieure (`archDrop`), et pyramide turquoise unique dans le V (`x = 99, z = 92`) à 4 triangles indépendants + winding sortant + matériau uni `level3-spike-turquoise`.
  - **Vague turquoise** : suppression du fallback `0.7` (seuls `0xf004` = `1.0` et `0xbf84/0xdf84/0xcf84` = `0.42` lèvent la vague, `0` par défaut) et suivi rapide (`lerp 0.55` sans lissage écrasant) dans `practicePose.ts` et `createLevel3Materials.ts`.
  - **2 bosses asymétriques & arêtes nettes (`createLevel3Materials.ts`, `terrainMesh.ts`)** : coupe diagonale de 2 dalles (`gx - gz <= 4` et `gz - gx <= 8`), séparation des cellules non-coplanaires en 2 triangles indépendants dans `terrainMesh.ts` (éliminant les dents de scie d’éclairage sur le bord coupé, désormais parfaitement droit) ; restriction de `isLevel3TurquoiseCurb` à `z >= 88` et `z >= 95`.
- **Vague turquoise synchronisée sur la RAM arcade + fort relief + joints verticaux (`src/emulation/practicePose.ts`, `src/rendering/createLevel3Materials.ts`, `src/rendering/createTerrainStudy.ts`, `src/rendering/createLivePracticeView.ts`)** :
  - Lecture native des **22 triplets de la vague en RAM (`0x76e..0x7f2`, mot `+4` à `0x772 + i * 6`)** découverts dans la ROM (`0x1d370..0x1d3f2` : `0x9f84` plat, `0xbf84/0xdf84/0xcf84/0x8f84` pentes, `0xf004` sommet) dans `readPracticePose` (`waveProfile`, 22 valeurs `0..1`).
  - Pilotage temps réel via `setLevel3WaveProfile(scene, pose.waveProfile)` en mode `live = true` (crête haute `2.25` + couleurs par sommet contrastées turquoise clair / vert-sapin profond selon la normale) ; l’animation autonome reste active sur `terrain.html` (`live = false`).
  - Séparation des flancs verticaux `level3-wave-sides` avec texture procédurale striée turquoise/joints sombres (1 joint par dalle le long de Z, fidèle à `MarbleMadness_Level3.png`).
- **Teinte sable/marron chaude, 2 bosses symétriques des amibes et niches murales jusqu’au bord (`src/rendering/createLevel3Materials.ts`)** :
  - Harmonisation de `level3-floor`, `level3-cliffs` et `level3-tower-stone` sur la vraie palette sable-doré / brun-ardoise chaude du CRT arcade.
  - Reconstruction symétrique des 2 pyramides tronquées sur la terrasse des amibes (`x=63..68, z=61..66` et `x=66..71, z=72..77`) dans `level3DisplayTerrain` (finies les lames blanches et marches en escalier).
  - Relèvement des niches murales jusqu’au ras du dallage (`lintelY = topY - 0.14`) et ajustement des parités/plages des 6 façades jusqu’au bord.
  - Pyramide turquoise (`level3-turquoise-spike`) rendue plus compacte (`+0.72`).
- **Tuyau cuivre jointif en haut et complet en bas (`src/rendering/createLevel3Materials.ts`)** : masquage des 3 cellules de collision `z = 78, x = 76..78` dans `level3DisplayTerrain` qui mordaient dans l’entonnoir supérieur (`x = 76..79, z = 78..82`) et dont la falaise à `z = 79` tranchait le fût et le coude bas.
- **Animation de la bille qui fond dans l’acide (`src/emulation/practicePose.ts`, `src/rendering/createMarbleAnimation.ts`)** :
  - Détection native de `state === 9` (mesuré sur 56 frames dans MAME 0.271, progression `word(base + 0x74)` de `0x1062` à `0x107a` en 7 étapes → `melt` dans `0..1`).
  - Routage de `animation === 9` vers le maillage animé `player_melt` (12 poses déjà présentes dans `local-roms/rolling-actors.json`), synchronisé sur `pose.melt` + lissage continu.
- **Validation** :
  - `npm run check` vert (536 tests Vitest, couverture V8 ≥ 90 %, Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, build Vite), avec nouveaux tests dans `practicePose.test.ts` et `createTerrainStudy.test.ts`.
  - Vérification visuelle Chrome WebGL2 sur `http://127.0.0.1:5173/terrain.html` à `500 px` (entonnoir jointif au millimètre + fût et coude complets) et `736 px` (joints verticaux nets sur les flancs de la vague).
  - **Reste à confirmer par Michel en jeu live** : fluidité des amibes, fonte de la bille dans l’acide (`player_melt`) et synchronisation en temps réel de la vague turquoise avec le CRT original.

## Niveau 3 : scroll complet jusqu’à GOAL, amibes natives, tours texturées, niches et ombres — 19 novembre 2026

Corrections des 5 points signalés par Michel sur le Niveau 3 :

- **Scroll débloqué jusqu’aux amibes et à `GOAL` (`src/game/modern/practiceTerrain.ts`)** : `level3LastSurveyedScroll` porté de `-15870` (`306 px`) à **`-15440`** (`736 px`), couvrant tout le niveau jusqu’à la vague turquoise et `GOAL`.
- **Amibes acides natives en jeu live (`src/emulation/intermediateActors.ts`, `src/rendering/createIntermediateActors.ts`)** :
  - Découverte via MAME 0.271 des 8 slots natifs d’amibes/flaques acides à partir de `0x1482` par pas de `0x42` (`byte(base + 0x18) === 1`, `id = 10..17`, `kind = 'acid'`).
  - Rendu de 8 flaques vert néon animées (`arcade-acid-0..7`, disques concentriques pulsants pilotés par `pose.frame` sans allocation par frame).
- **Textures des deux tours de départ (`src/rendering/createLevel3Materials.ts`)** :
  - Matériau procédural `level3-tower-stone` (`64 × 128`) avec chapiteau cannelé, bandeau de collerette, pilastres kaki-olive d’angle/centraux et fût ardoise, avec coordonnées UV découpées proprement entre le chapiteau (`v = 0..0.234`) et le fût (`v = 0.234..1`).
- **Reliefs du grand mur vertical, entonnoir cuivre, vague pleine & murets turquoise (`src/rendering/createLevel3Materials.ts`, `src/rendering/createTerrainStudy.ts`)** :
  - Généralisation de `carveLevel3WallNiches` aux **6 façades** visibles dans `MM_original_levels_full_views/MarbleMadness_Level3.png` (zigzag gauche `x=50`, zigzag droit `z=60`, terrasse amibes gauche `x=73` et droite `z=82`, approche tuyau `x=76`, pilier droit du tuyau `z=86`), toutes avec appui inférieur horizontal.
  - Rehaussement du tuyau cuivre (`level3-pipe-shell` / `level3-pipe-interior`) de `+4` unités arcade pour affleurer le dallage `16320`, et teinte terre-cuite/cuivre satinée moins fluorescente.
  - Ajout des flancs verticaux avant/arrière sur `createLevel3Wave` (vague turquoise pleine et plus lumineuse à 2 crêtes).
  - Extraction et lissage transversal (`[nw, ne, ne, nw]`) des **murets ondulés turquoise** des montagnes russes finales (`level3-turquoise-curbs`, matériau `level3-curb-turquoise`) + ajout de la **pyramide turquoise** au coin central (`level3-turquoise-spike`, shadow caster).
  - Relèvement du seuil `bentX` à `> 0.5` dans `level3DisplayTerrain` pour préserver les deux bosses de la terrasse des amibes.
- **Ombres plus claires sur le Niveau 3 (`src/rendering/createTerrainStudy.ts`)** :
  - `fill.intensity = 0.34` et `shadows.darkness = 0.28`.
- **Validation** :
  - `npm run check` vert (Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, Vitest + couverture V8 ≥ 90 %, build Vite) avec tests ajoutés dans `intermediateActors.test.ts` et `createTerrainStudy.test.ts`.
  - Vérification visuelle Chrome WebGL2 sur `http://127.0.0.1:5173/terrain.html` à `0 px`, `250 px`, `500 px` et `736 px` (curseur jusqu’à `736 px`, tours texturées, niches en creux, tuyau affleurant, vague et drapeaux `GOAL`).
  - **Reste à confirmer par Michel** : essai en jeu live sur le Niveau 3 (défilement fluide au-delà des amibes + visibilité et animation des amibes acides).

## Niveau 3 (étapes 1, 2 et 3 : terrain, tuyau cuivre, vague turquoise, GOAL et branchement live) — 19 novembre 2026

Avancement complet des 3 premières étapes du **Niveau 3** (descripteur arcade `0x2cd9e`, 192 diagonales, clé interne `'level3'`) :

- **Relevé MAME 0.271 + tuyau cuivre (`local-roms/level3-terrain.json`, `scripts/add-level3-pipes.mjs`)** : grille complète `118 × 118` (`2 260` cellules actives, scroll d’ouverture `-16176`, départ J1 `(180, 76, 16408)`) enrichie des 333 triangles de coque + 9 triangles intérieurs du tuyau vertical en cuivre extraits de `lev3.ase.mesh`.
- **Nettoyage des bordures & décors (`createLevel3Materials.ts`, `createPracticeGoal.ts`, `createTerrainStudy.ts`)** :
  - Lissage des deux tours de départ (`4 × 4` sans dents de scie) et des deux rampes courbes (`[a, b, b, a]` et `[a, a, b, b]` lisses), suppression des falaises pleines sous ces deux tours/rampes (`stripLevel3OpeningCliffs`), et construction des deux **tours médiévales évasées** (`4×4 → 2.6×2.6`) avec **meurtrières sombres** et **arches ajourées** (`createLevel3OpeningTowers`).
  - Restauration des 124 coins `sw` manquants sur les bordures `+Z` (suppression de toutes les dents de scie sur les parois verticales), redressement des 48 dalles de rampes tordues en X et aplanissement de la rampe droite des mini-vers (`x = 30..35, z = 43..44`).
  - Lissage automatique des coins isolés échantillonnés dans un fossé profond (`level3DisplayTerrain`) + découpe des diagonales limites `±21`.
  - Matériaux pierre kaki/sable (`level3-floor`), falaises gris-olive (`level3-cliffs`), tuyau vertical cuivre (`level3-pipe-shell` / `level3-pipe-interior`, shadow casters), **vague turquoise animée** à double crête (`level3-wave`, sans allocation par frame), et zone d’arrivée `level3-finish` (`GOAL` en `x=92..95, z=100..109`) avec drapeaux jaune/noir.
- **Branchement live (`practicePose.ts`, `createLivePracticeView.ts`, `feasibility.ts`)** :
  - Reconnaissance du descripteur `0x2cd9e` dans `readPracticePose` et `readModernPhase`, lecture des acteurs natifs (`readIntermediateActors`), préchargement automatique en dev de `level3-terrain.json`, et bascule transparente en 3D au passage Niveau 2 → Niveau 3.
- **Page d’étude (`terrain.html`, `src/terrain.ts`, `src/dev/localRoms.ts`, `src/emulation/localStudy.ts`)** :
  - Service dev local `/__local-roms/level3-terrain.json` et bouton **« Voir le niveau 3 (étude) »**.
- **Vérification visuelle Chrome WebGL2** : captures vérifiées sur `Cadrage arcade` (`0 px` et `250 px`) et `Vue libre` — fossés de départ nettoyés, tuyau cuivre en place, vague turquoise et `GOAL` + drapeaux visibles sans erreur runtime.
- **Prochaine étape** : finitions visuelles du Niveau 3 d’après les retours de Michel (arêtes de zigzag `sw === null`, revêtement turquoise des montagnes russes, pointes et acteurs spécifiques mini-vers / amibes, checkpoint rapide `F3`).

## Finitions ombres 4096, fosses, rembardes, piston auxiliaire, pointe L1 et alcôve L2 — 19 novembre 2026

Corrections suite aux 8 captures de Michel :

- **Ombres Practice Race & Intermediate Race (`createPracticeSun.ts`)** : shadow map portée à `4096 × 4096` sur les deux niveaux et calibration fine `bias` (`0.00045` / `0.0005`) + `normalBias` (`0.01` / `0.011`) pour éliminer à la fois les jours blancs aux jonctions mur/sol et l’auto-ombrage sur les parois des 5 puits.
- **Bassin glacé hexagonal (`intermediateIceMaterial.ts`)** : remplacement des polygones 2D `screenX/screenY` (qui débordaient hors du bassin sur la glace plate) par un ombrage en coordonnées hexagonales du bassin (`dx = x - 9, dz = z - 6, radius = max(|dx|, |dz|, |dx - dz|) < 5`) laissant une ligne de marge plate tout autour, fidèle à l’original et à Rolling Madness 3D.
- **Appuis du tuyau bleu en Y (`intermediateLandmarks.ts`, `createTerrainStudy.ts`)** : masquage des cellules internes de collision (`z = 85..86` aux deux embouchures hautes et `z = 91..94, x = 82..84` sous le fût bas), recalage de l’alcôve (`z = 76..83`) et plancher intérieur trapézoïdal strictement inscrit dans la sortie évasée (`x = 82.75..84.25` à `z = 92.9` → `82.05..84.95` à `z = 95`). Vérifié visuellement en direct dans Chrome WebGL2.
- **Fosses de départ niveau 1 (`createTerrainStudy.ts`)** : redressement à `(0, 1, 0)` des normales des extensions de rebord ajoutées par `extendPracticePitRims`, qui penchaient à l’opposé du soleil (`(-0.24, 0.94, 0.24)`) et créaient un triangle gris sombre façon ombre fantôme à droite de chaque fosse.
- **Rembardes rouges (`createPracticeGuardrail.ts`)** : diamètre augmenté de `0.27/0.29` à `0.36/0.38` pour coller à l’épaisseur arcade.
- **Mécanisme sous le pont niveau 2 (`createIntermediateBridgeMechanism.ts`)** : ajout d’un plongeur (`auxiliary-plunger`) et animation du petit piston droit (`auxiliary-cap` + `auxiliary-plunger`) en va-et-vient rapide à `4,5 Hz` (plusieurs coups par seconde).
- **Pointe en fin de niveau 1 (`practiceChannelTerrain.ts`)** : ajout de `[82, 62, 63]` dans `channelRims` pour fermer l’angle en creux sur la cellule `(62, 82)` sous la flèche `3 4 5 6`.
- **Alcôve derrière la glace niveau 2 (`intermediateLandmarks.ts`)** : élargissement de `5` à `7` dalles (`z = 77..84`, pilier droit de 2 dalles aligné sur l’embouchure gauche du tuyau), abaissement de la tablette grise (`alcoveTopY - 10.2`) et épaississement de la traverse médiane (`2.8`) pour correspondre au cadrage original.
- **Appuis du tuyau bleu en Y (`intermediateLandmarks.ts`, `createTerrainStudy.ts`)** : masquage des cellules internes de collision (`z = 86` aux deux embouchures hautes et `z = 91..94, x = 82..84` sous le fût bas) et ajout du plancher intérieur affleurant uniquement dans la sortie évasée (`z = 92.8..95`) afin que le tuyau soit parfaitement jointif sans dalles ni pilier bleu débordant dessous. Vérifié visuellement en direct dans Chrome WebGL2 via DevTools.

## Acné d’ombres, bille spéculaire, tuyau, vagues, glace et alcôve — 19 novembre 2026

Corrections suite aux 15 captures comparatives de Michel :

- **Suppression de l’acné d’ombres et correction des fosses du niveau 1 (`createTerrainStudy.ts`, `createPracticeSun.ts`, `createPracticeSurfaceMaterial.ts`)** :
  - Retrait de `floor` (`terrain-surface`) de la liste des shadow casters sur Practice Race et Intermediate Race (cause directe des rayures noires diagonales sur le dallage).
  - Relèvement de `shadows.bias` (`0.001` / `0.0012`) et `shadows.normalBias` (`0.04` / `0.045`) pour supprimer le mouchetage d’auto-ombrage sur les parois verticales `backFaceCulling = false`, tout en gardant les ombres mur-sur-mur.
  - Séparation des parois des deux fosses latérales de départ (`splitPracticePitWalls` → `terrain-pit-walls`, `receiveShadows = false`) afin de préserver leur dégradé arcade brun/orange/jaune sans corruption d’ombre.
- **Rendu de la bille inspiré de Rolling Madness 3D (`createMarbleMaterial.ts`)** :
  - Remplacement des points jaunes « boule de bowling » par un damier bicolore bleu/rouge doux (façon `player.png` de Rolling Madness 3D) combiné à une carte d’environnement sphérique (`Texture.SPHERICAL_MODE`, façon `env "player_env.jpg"`) et un fort reflet spéculaire pour des reflets stables en vue pendant que la bille roule.
- **Ombre intérieure du tuyau niveau 2 (`createIntermediatePipes.ts`, `createTerrainStudy.ts`)** :
  - Assombrissement du revêtement intérieur (`diffuseColor(0.26, 0.26, 0.28)`, `emissiveColor(0.05, 0.05, 0.06)`) et ajout de `interior` comme shadow caster pour retrouver l’ombre franche à l’intérieur de l’embouchure.
- **Contraste des pentes et géométrie de fin de vagues niveau 2 (`intermediateRims.ts`, `intermediateLandmarks.ts`, `createTerrainStudy.ts`)** :
  - Suppression de la déformation de la rangée plate `z = 81` dans `intermediateWaveCell` (la vague s’arrête proprement à `z = 80` et les dalles d’arrivée restent plates).
  - Ajout de couleurs par sommet (`intermediateSlopeColors`) sur le dallage d’Intermediate Race pour retrouver le fort contraste arcade blanc/gris moyen/gris foncé entre pentes face au soleil et pentes opposées.
- **Glace et alcôve arrière niveau 2 (`intermediateIceMaterial.ts`, `intermediateLandmarks.ts`, `createTerrainStudy.ts`)** :
  - Ajout des bandes verticales bleu-vert sombres (`joint(z - x) < 0.11`) alignées sur les joints des murs bleus vus par transparence à travers la glace plate.
  - Découpe de l’alcôve rectangulaire en creux dans le grand mur bleu (`x = 88`, `z = 80..85`, `carveIntermediateAlcove`) et ajout de la tablette dallée grise (`intermediate-alcove-shelf`, `receiveShadows = true`) avec poutre intermédiaire et second renfoncement inférieur.
- **Page d’étude `terrain.html` (`src/terrain.ts`)** :
  - Vérification du transform Vite et du chargement `createTerrainStudy` sur le relevé réel `local-roms/intermediate-terrain-pipes.json` en `NullEngine` (OK) ; ajout d’une remontée d’erreur explicite (`console.error` + `#terrain-status`) au lieu du `.catch(() => {})` silencieux.

## Ombres mur-sur-mur, falaises jaunes, glace et mécanisme du pont — 19 novembre 2026

Corrections suite aux 12 captures comparatives de Michel :

- **Ombres portées des murs et plateformes (niveaux 1 & 2, `createTerrainStudy.ts`, `createPracticeSurfaceMaterial.ts`)** :
  - Sur **Practice Race**, les parois verticales n’utilisent plus de bandes alternées jaune/orange/marron : elles portent un **jaune vif uniforme** avec joints sombres, une teinte d’ombre orange-brun (`emissiveColor(0.36, 0.1, 0)`), `backFaceCulling = false`, **`cliffs.receiveShadows = true`**, et `cliffs` + `floor` sont ajoutés comme shadow casters sur `key` (ombres portées mur-sur-mur et plateforme-sur-mur/sol).
  - Sur **Intermediate Race**, suppression de la lumière additionnelle `intermediate-pipe-wall-light` qui lavait les parois bleu marine `+Z` (pont et renfoncement derrière la glace), et ajout de `floor` comme shadow caster sur `key` pour des ombres de plateformes et parois franches.
  - Profondeur des falaises prolongée (`base = lowest - 18` sur Intermediate, `lowest - 10` sur Practice) pour éliminer la coupure flottante du grand mur bleu derrière la glace et les fonds noirs dans les fosses.
- **Mécanisme sous le pont (`createIntermediateBridgeMechanism.ts`)** :
  roue à 4 rayons + moyeu orientée **parallèle à la pente / bordure turquoise** (`rotation.set(0, 0, Math.PI / 2)` au lieu de vue par la tranche), positionnée à gauche du piston (`dx = +0,88, dz = -0,78`), palette violet/acier foncé plus fidèle à l’arcade.
- **Glace d’Intermediate Race (`intermediateIceMaterial.ts`)** :
  joints de grille plus nets, reflets diagonaux blancs plus marqués dans la cuvette, ombre intérieure plus profonde et tramage cristallin sur la rampe haute.
- **Billes (`createMarbleMaterial.ts`)** :
  passage de 48 points serrés à **12 points jaunes icosaédriques espacés** (3–5 points visibles à la fois comme sur l’original) pour que le roulement 3D soit immédiatement lisible.

Validation : `npm run format && npm run check` réussi (530 tests Vitest, couverture V8, lint, typecheck, build). Recette visuelle à confirmer par Michel dans Chrome.

## Finitions niveaux 1 & 2, balai, pont synchronisé et caméras — 19 novembre 2026

Livré sur les demandes de retour de Michel (niveaux 1 et 2) :

- **Balai synchronisé et recalé (`practicePose.ts`, `createRollingActor.ts`, `createMarbleAnimation.ts`)** :
  lecture des pointeurs natifs de casse (`base + 0x72`, table `0x20fde`, indices 0..31)
  et du script secondaire du balai (`base + 0x7a`, table `0x215f6`, indices 0..43,
  drapeau actif `base + 0x7f`), vérifiés sur les dumps RAM MAME `/tmp/mm-animation-review/broken/`.
  Le groupe `broom.jpg` de `player_broken` est séparé des débris `player.png` :
  masqué avant l’activation native du balai, réduit à l’échelle `0,84` autour de son
  centre XZ et recalé au sol (`y = -5,67` en repère modèle), sans toucher aux débris.
- **Pont articulé synchronisé et roue visible à gauche (`practicePose.ts`, `createIntermediateBridge.ts`, `createIntermediateBridgeMechanism.ts`, `createLivePracticeView.ts`)** :
  les mots RAM `0x772` (`0x6fc8..0x6fd4` par pas de 2) et `0x774` (`0xf048..0xf054`)
  fournissent les 7 paliers natifs du pont (0..6, vérifiés sur `/tmp/mm-worm-reference/ram-*.bin`).
  En jeu (`live = true`), `createLivePracticeView` pilote la hauteur du tablier et du
  mécanisme depuis `pose.bridgeStep` (le cycle d’étude 144 images reste actif dans `terrain.html`).
  La petite roue à rayons (`intermediate-bridge-wheel-hub`) est déplacée à gauche du piston
  en vue arcade (`dx = +1,05, dz = -0,85`), orientée face à la caméra.
- **Ombres portées des tuyaux sur les parois bleues (`createTerrainStudy.ts`)** :
  une lumière directionnelle statique dédiée (`intermediate-pipe-wall-light`,
  `includedOnlyMeshes = [cliffs]`, shadow map 1024 rendue une seule fois via
  `REFRESHRATE_RENDER_ONCE`) projette les ombres de `intermediate-pipes-shell`
  sur les parois bleues orientées `+Z` et `+X` derrière les deux tuyaux, sans modifier
  le soleil principal (`key`) ni introduire d’auto-ombrage des falaises.
- **Caméra « Derrière la bille » (`createCameraOcclusion.ts`, `practiceCameraSettings.ts`, `createLivePracticeCamera.ts`, `practiceCameraControls.ts`)** :
  (1) le couloir d’occlusion préserve le sol aux pieds de la bille (`mmAboveFoot` + `mmClearFoot`)
  tout en continuant à effacer les murs et rebords surélevés entre la caméra et la bille ;
  (2) le cadrage `chase` est réservé au mode 1 joueur (option désactivée, sautée par **C**
  et repli automatique sur `arcade` dès qu’un second joueur est actif).
- **Texture des billes (`createMarbleMaterial.ts`)** :
  remplacement des chiffres `'1'`/`'2'` équatoriaux par six anneaux symétriques de 8 points
  jaunes projetés sans distorsion sphérique sur toute la bille (équateur et pôles),
  avec un reflet spéculaire adouci pour rendre le roulement 3D immédiatement lisible.
- **Niveau 1 — Bords diagonaux & cadre GOAL 4 lignes (`practiceChannelTerrain.ts`, `createPracticeGoal.ts`)** :
  découpe des coins extérieurs le long des deux diagonales limites `wx - wz = ±21`
  du relevé complet (suppression des dents de scie) ; extension du cadre du panneau GOAL
  de Practice Race sur les 4 lignes de la rigole (`y = 0..63`, lettres sur les 2 lignes
  supérieures, fond et bordure inférieure englobant les 2 lignes du bas), en gardant
  le format compact pour Intermediate Race.
- **Out of time / Game over en 3D (`practicePose.ts`, `practiceHud.ts`, `ui/practiceHud.ts`)** :
  `mode === 4` reste en rendu 3D (`readModernPhase` retourne `'level'`, `readPracticePose`
  conserve la pose) ; `readPracticeHud` lit les bandeaux natifs `OUT OF TIME` et `GAME OVER`
  dans l’alpha-RAM (`$A03000`, lignes 4..27) et les affiche sur le canvas HUD 3D ;
  le retour à la vidéo arcade s’effectue ensuite pour les résultats (`mode === 2`) et l’attract (`mode === 1`).
- **Balayage d’introduction linéaire fin → début (`createLivePracticeCamera.ts`)** :
  la caméra part au-dessus de l’arrivée (fin du niveau) et glisse linéairement vers
  la pose exacte de la caméra de jeu au départ (y compris raccord VP direct sur le cadrage
  orthographique arcade), sans retour en arrière.

Validation : `npm run check` réussi (530 tests Vitest, couverture V8, lint, typecheck, build).
Limite de cet environnement : les tests Playwright Chrome sont bloqués dans la sandbox réseau
(`net::ERR_ACCESS_DENIED` sur `127.0.0.1:5173`) et le Chrome utilisateur n’avait pas le
débogage distant activé. À vérifier visuellement par Michel sur `http://127.0.0.1:5173/`
(et `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`).

Prochaine action : après retour visuel de Michel sur ces ajustements niveaux 1 & 2,
démarrer le **Niveau 3 (Silly Race)** avec `MM_original_levels_full_views/MarbleMadness_Level3.png`,
le relevé terrain MAME et les modèles locaux (`lev3.ase.mesh`, `lev3_wave.ase.mesh`, amibes, mini-vers).

## Matériaux, récompenses et visibilité — 19 novembre 2026

Livré : matériau commun aux billes normales, étourdies et cassées des deux
joueurs (`createMarbleMaterial.ts`). Peinture procédurale bleue/rouge à marques
jaunes et numéros, éclairage et spéculaire partagés. Les UV des modèles privés
vont de V=1 à V=2 : les deux textures doivent répéter, sinon les marques
sont remplacées par une couleur uniforme. Test de non-régression ajouté.
Le modèle normal `player` est ajouté au convertisseur et au JSON local ;
la sphère procédurale reste le repli si cette géométrie manque.

`practicePose` lit l'état magique 8 : compteurs natifs, pointeur d'animation,
étirement 0,75/1,5. `createMagicWand.ts` affiche une baguette fine ivoire/or et
ses étoiles, sans changer le temps. Elle se retire à l'indice natif 42.
Le message +10 SEC vient de l'avis natif 0x22446, actif en 0xf0.
Les récompenses de score viennent de la table 0x22386..0x22422 ;
la disparition de la boule noire a produit **1000 points** (0x223aa) dans le
rejeu original, pour les deux joueurs. `createScoreAward.ts` affiche ces avis
sans déduire les points d'un delta de score. Le −5 SEC exige maintenant son
pointeur 0x2243a et son drapeau actif : il ne se superpose plus aux bonus.

Le GOAL Intermediate ne possédait pas les matériaux de victoire. Ils sont
créés, colorés et émissifs, avec priorité au premier arrivé lu dans le cœur.
La couleur est réinitialisée au nouveau départ. Le diamètre du corps des vers
passe de 0,47 à 0,60, celui des extrémités de 0,58 à 0,72 ; cadence/appuis natifs
inchangés. Le mécanisme du pont est avancé de +2,4 X et +0,7 Z vers la pente :
le piston et la base sont dégagés depuis l'angle arcade. Son cycle reste celui
de l'étude, à synchroniser avec le cœur ultérieurement.

En caméra Derrière, `createCameraOcclusion.ts` crée un couloir de visibilité
entre l'œil et la bille suivie, limité aux matériaux des murs/tours. Masque
fragmentaire à bords progressifs et transparence tramée ; le grand mesh de
falaise ne disparaît pas entièrement. Ouverture rapide (environ 0,2 s),
restauration en sortant du couloir, retrait immédiat du masque hors caméra
Derrière. Plugin scene-owned, buffers/vecteurs réutilisés, pas de tri alpha.
`registerForExtraEvents` doit être défini AVANT `_enable(true)` pour que les
uniforms soient transmis au GPU. Aucun effet sur collisions ou gameplay.

Validation : `npm run check` réussi, 515 tests Vitest ; 32 tests Chrome des vues,
commandes et occlusion réussis. Test GPU : bille cachée puis visible, couloir
déplacé et paroi restaurée. Rejeu réel F2 : départ stable huit secondes, V,
F2 sous capture, C et commandes derrière ; aucune erreur JS. Captures WebGL
inspectées des matériaux J1/J2, du pont à l'angle arcade, de la baguette et des
avis issus des RAM natives 2526/2580/2690/2710/2936.

Recharger `terrain.html`, F2 pour jouer et C pour changer de caméra.
Le JSON local a été régénéré avec :
`node scripts/extract-rolling-actors.mjs '/tmp/mm-rolling-research/extracted/data/{app}'`.
Les modèles restent locaux. Les couleurs, le diamètre des vers et la visibilité
en parcours complet restent à apprécier par Michel ; Safari réel non retesté.
La baguette a été isolée dans le banc MAME par activation du drapeau pending,
puis déroulée par le programme original : ne pas parler d'apparition spontanée
vérifiée. La présentation ne l'active jamais elle-même.
Prochaine action : comparer le timing du balai au script natif secondaire,
puis synchroniser le pont ; conserver l'unique cœur comme arbitre.

## Vers, fin de partie et clic de capture — 19 novembre 2026

Les vers utilisent désormais `rendering/createWorm.ts`, un maillage articulé
procédural, et `game/modern/wormPose.ts`, qui interprète script/indice/fraction
natifs. La marche de huit poses conserve le premier appui, pose l'autre extrémité,
puis relève le plus ancien appui. Le script donne la direction même quand la
vitesse native est nulle. Les buffers géométriques sont réutilisés ; la scène
possède les meshes, nœuds et matériaux. La boule noire garde son modèle local.

Un nouveau rejeu MAME de l'attaque a montré la succession : flexion, redressement,
bouche aplatie, cloche de déglutition, retour droit, bouche/langue tardive.
Ces phases sont représentées et synchronisées avec les indices natifs, plutôt
qu'avec une animation temporelle du remake. L'état joueur 7 cache la bille :
le morph de fonte qui créait un grand disque bleu a été supprimé de ce cas.
Les formes 3D restent une interprétation géométrique, à apprécier en jeu par Michel.

Le « gel » de fin de chrono était un maintien indéfini du terrain 3D pendant
les écrans natifs. `readModernPhase` distingue les phases de niveau des menus,
résultats et game over. Ces derniers rendent la vidéo originale visible.
Le maintien 3D pendant les introductions est conservé. Un essai réel de 82 s
après F2 confirme le passage 0 → 4 → 1, la vidéo native puis l'attract, cœur
non pausé et aucune erreur JS. Aucun changement de physique, score ou timer.

Cliquer sur une image 2D ou 3D reprend et capture via le même chemin que le
bouton Capturer. Les clics sur les commandes UI et la borne interactive gardent
leur fonction. Le listener est nettoyé avec les contrôles ; aucun deuxième moteur.
Le traitement en capture évite le toggle pause propre au canvas EmulatorJS.

Validation : `npm run check` passe, 505 tests Vitest ; 31 tests Chrome passent.
Trois cycles de clic/capture/Échap ont aussi été vérifiés avec le cœur réel. La validation navigateur
et les limites sont détaillées en tête de `docs/VALIDATION.md`.
Les anciens points ouverts baguette/+10s, balai et matériau normal/cassé restent
à terminer ; voir `docs/ANIMATION_AUDIT.md`. Ne pas annoncer ces sujets corrigés.
Références temporaires : `/tmp/mm-worm-reference/` (rejeu natif et RAM),
`/tmp/mm-native-worm-strip.png`, `/tmp/mm-worm-*.png`, `/tmp/mm-timeout.json`.

## Balayages et raccord caméra — 18 novembre 2026

Le balayage rejoint progressivement la caméra choisie (arcade, suivi, dessus,
derrière) : interpolation de position, cible et projection dans les derniers
40 % de la séquence. La projection perspective devient orthographique pour
le cadrage arcade, sans coupure finale. C interrompt la séquence.

`createVideoView` prépare le terrain préféré dès sa disponibilité, garde la
présentation 3D entre les états natifs dessinables et sélectionne le terrain
suivant automatiquement. `practicePose` expose également le niveau 2 pendant
son introduction native (mode 3, objet joueur initialisé), avant le gameplay.
Chaque nouvelle scène compatible reçoit un balayage de 180 frames natives ;
le compte à rebours natif de Practice conserve sa progression propre.
F2 réarme le balayage même sur le même terrain. En pause, son temps reste figé.
**F2 restaure toujours un état déjà jouable** : son balayage de trois secondes
accompagne donc les premières secondes du cœur, sans suspendre son chrono ;
C permet de prendre immédiatement le cadrage de jeu. Aucun patch ROM/physique.

V conserve le choix explicite des vues arcade/comparée. Une pose temporairement
indisponible conserve le dernier terrain 3D, avec les acteurs cachés, plutôt
que d'afficher brièvement l'arcade. Un terrain partiel hors relevé conserve son
repli précédent. Une future course sans relevé reste à gérer explicitement :
le lecteur expose aujourd'hui uniquement Practice et Intermediate.

Les vérifications et limites de cette livraison figurent en tête de
`docs/VALIDATION.md`. Les demandes de conformité des vers, de la baguette,
du balai et des matériaux bille normale/cassée restent en cours d'analyse :
aucune correction de ces animations n'est incluse dans ce lot caméra.
Les relevés natifs et l'extraction de la baguette sont conservés temporairement
sous `/tmp/mm-animation-review/` ; ne pas les présenter comme des assets livrés.
Les résultats détaillés sont conservés dans `docs/ANIMATION_AUDIT.md`.
Prochaine action : synchroniser la baguette sur l'état natif 8 et le balai sur
son animation secondaire, puis comparer les poses du ver à pieds alternés.

## Départ F2 corrigé, relevés et acteurs automatiques

Recharger `terrain.html`. F2 ouvre Intermediate Race directement en 3D.
Les ROM, le BIOS, les relevés complets Practice et Intermediate et les modèles
locaux se chargent automatiquement. **V** fait défiler 3D → comparaison →
arcade, **C** les caméras, **H** l’aide. Le trackpad et le boost utilisent le
repère de la caméra active. La vue derrière garde son cap vers l’aval.

Le point de reprise précédent était incomplet. Le cœur conservait la RAM
de partie sans restaurer deux accumulateurs analogiques et la banque Atari
Slapstic. La reprise ne retrouvait donc pas le même terrain de collisions.
`emulation/intermediateCheckpoint.ts` ajoute ces états au format MM2 version 2.
Les adresses sont propres au hash WASM vérifié par le chargeur.
`local-roms/intermediate-web.state` a été régénéré. Le départ reste à
(220, 108), hauteur 16378, pendant huit secondes sans commande dans Chrome.
F2 en cours de capture et V sont également vérifiés sur la session réelle.

`scripts/extract-rolling-actors.mjs` convertit les meshes de l’installateur
local extrait. `local-roms/rolling-actors.json` contient les textures et poses
des vers (repos, flexion, départ du saut et saut), de la boule noire, de la
bille étourdie, de la casse avec balai et de la disparition. Les étoiles et
la langue sont complémentaires et procédurales. `intermediateActors.ts`
lit le noir en 0xa20 et les quatre slots de créatures en 0x1302, pas 0x60.
La présentation sélectionne les modèles d’après les états natifs et utilise
le compteur de frames du cœur. Les deux relevés restent disponibles quand
le niveau change. Les fichiers locaux sont exclus du build.

`npm run check` passe avec 490 tests Vitest. Les 51 tests Chrome passent.
Un parcours automatique en session Web atteint les vers et affiche les deux
rendus, positions natives et étoiles synchronisées. Les modèles du ver,
de la bille étourdie et du balai ont été observés dans un vrai contexte WebGL.
La course complète reste à jouer. Les timings fins des sauts des vers,
du nettoyage et de la langue sont à comparer en partie aux animations arcade.
Le pont conserve son cycle d’étude et reste à synchroniser.

## Intermediate Race jouable

Ouvrir `terrain.html` sur le serveur de développement. Les ROM et le BIOS
sont vérifiés au chargement. **F2** ouvre le jeu dans la page d’étude.
Après **Démarrer l’émulation**, **Capturer le trackpad** reprend le chrono.
**F2** en cours de partie rétablit le départ solo avec 60 secondes.
Le relevé et le point de reprise restent dans `local-roms/`.
`node scripts/record-intermediate-checkpoint.mjs` régénère le point avec Chrome,
les ROM locales et le parcours normal de Practice Race.

Le cœur pilote les deux vues. La caméra **Derrière la bille** suit la
position de la bille avec un axe horizontal fixe vers l’aval.
Le pont utilise un vérin épaissi, un cylindre auxiliaire, une conduite et une
tranche turquoise à trois rivets affinées d’après la nouvelle capture.
Prochaine action concrète. Relever la phase du pont dans le cœur pour
synchroniser son rendu, puis identifier les états des vers et de la casse.
Ces événements restent visibles sur la vue arcade du comparatif.

`npm run check` passe avec 478 tests Vitest. La suite Chrome passe avec
50 tests. Dans Chrome avec les archives locales, la restauration, la capture,
le mouvement de la bille et le retour au départ par F2 ont été vérifiés.
La course complète en 3D reste à jouer.

## Finitions de la glace et caméra derrière la bille

Le rendu de la cuvette utilise des joints visibles dans les reflets,
une trame diagonale hors de la cuvette, et des coulures raccordées
aux falaises près du trou et sur le bord droit. Regarder le cadrage
**Glace et arrivée** dans `terrain.html` avec le relevé local.
L’installateur de Rolling Madness 3D contient le pont en 16 poses,
ses textures et le matériau de glace. L’inventaire est dans les
décisions. Dans le niveau 1 jouable, **C** permet maintenant d’atteindre
**Derrière la bille**. `npm run check` passe avec 474 tests Vitest
et les 49 tests Chrome passent. La prochaine étape est de synchroniser la
vue jouable d’Intermediate Race avec le cœur arcade.

## Glace et arrivée d’Intermediate Race

Dans `terrain.html`, charger `local-roms/intermediate-terrain-pipes.json`
puis choisir **Glace et arrivée**. La cuvette a sa texture turquoise,
ses reflets stylisés et sa lèvre verticale. Le marquage GOAL gris et les
drapeaux bleu et noir réutilisent les fonctions de Practice Race.
Les tuyaux reçoivent l’ombre de leur coque sur un fond jointif au dallage.
Le mécanisme du pont est recentré sur l’embase violette et sa tranche
turquoise ne déborde plus du tablier.
`npm run check` passe avec 470 tests Vitest. Les 49 tests Chrome passent.

La synchronisation du rendu 3D d’Intermediate Race avec le cœur reste
la prochaine étape. Le GOAL de l’étude est gris.

## Ombres et sorties des tuyaux d’Intermediate Race

La lumière est recalée sur l’ombre de la pyramide centrale dans
`intermediate-reference-306.png`. Les falaises bleues reçoivent les
ombres, avec une carte sans flou et un biais vérifié en vue arcade.
Le chapeau des trois pyramides s’arrondit près du sommet. Une surface
grise sans texture couvre le dallage sous les deux bouches de tuyau.
Elle conserve le dallage extérieur. Charger
`local-roms/intermediate-terrain-pipes.json` dans `terrain.html`.
Le choix **Tuyaux et rampes** montre les sorties en vue libre.
`npm run check` passe avec 469 tests Vitest. Les 49 tests Chrome passent.

Prochaine action : connecter les états de l’arcade à la vue jouable
d’Intermediate Race, notamment les vers et la casse de la bille.

## Finitions d’Intermediate Race

Le relevé local `local-roms/intermediate-terrain-pipes.json` a été
régénéré avec les normales de Rolling Madness 3D. Les reflets des deux
tuyaux suivent leur surface lissée, les soudures sont visibles et
les sorties ont un fond gris. Le pont montre un flanc turquoise
riveté, des guides, une roue à rayons et un piston télescopique
animé avec le tablier. Les jonctions au palier près du premier
tuyau et à la cuvette finale ont été retouchées dans
`intermediateRims`. La page `terrain.html` permet de vérifier
les deux cadrages. `npm run check` passe avec 466 tests Vitest et
les 49 tests Chrome passent.

L’étape suivante reste la lecture des poses et événements d’Intermediate
Race pour animer la vue 3D jouable.

## Prototype 04 — terrain 3D

La [spécification du rendu moderne](MM_NEW_3D_GRAPHICS.md) fixe les tâches
et critères de validation. Le cœur MAME reste la référence pour la même
partie dans les deux présentations.

Le banc `scripts/measure-terrain.mjs` vérifie les hauteurs contre le jeu
et a produit `local-roms/practice-terrain.json` (20 × 14 cellules).
Dans `/terrain.html`, charger ce relevé puis `local-roms/practice-reference.png`
pour superposer la capture arcade au cadrage fixe. Le rejeu confirme la
projection au départ à 2,14 pixels natifs près sur les points contrôlés.
La silhouette du tronçon et la profondeur des falaises restent approchées.
Voir [PROTOTYPE_04.md](docs/PROTOTYPE_04.md).

Dans **Affichage** sur la page de jeu, charger le relevé
`local-roms/practice-complete-terrain.json` (91 × 91 cellules), sélectionner
**3D moderne · Practice Race**, puis démarrer J1. Le relief va du départ à
la bande d’arrivée, repérée par le texte GOAL. Les relevés précédents restent
utilisables. Le rendu moderne s’affiche pendant la course, puis MAME
affiche le bilan et Intermediate Race sur le canvas arcade.

Le banc MAME 0.271 en mode `--finish` vérifie le relevé à cinq moments de
la course et mesure un défilement maximal de 360 pixels. Le navigateur
atteint un défilement de 359 pixels sur le rejeu vérifié. Les vues arcade et moderne concordent
sur les données MAME relevées pendant 948 itérations de J1.
`npm run check` passe avec 349 tests Vitest et les 46 tests Chrome passent.
La chute de J1
sur la première rampe avait aussi été validée avec les ROM locales.
La reconstruction arcade se traduit par l’absence temporaire de la bille.

Après chargement d’un relevé, en capture, **V** bascule entre jeu original
et 3D moderne. **Maj+V** active la comparaison côte à côte ou revient au jeu
original. Le menu **Affichage** est également disponible dans le HUD de la vue
immersive. En dehors du relevé, la comparaison garde l’arcade visible et
affiche un message à la place du rendu moderne. Essai réussi dans Chrome
avec le vrai cœur, `npm run check` passe avec 356 tests Vitest et les
47 tests Chrome passent.

Le départ de Practice Race reprend les marges noires de 24 pixels
mesurées de chaque côté du rendu MAME. La caméra fixe conserve la
projection des coordonnées arcade. Le terrain moderne utilise une
texture de pierre et des parois striées. Les cinq sections de
garde-corps rouges et les deux pointes du départ sont positionnées
d’après la capture locale. Les marches sont fermées par leurs faces
verticales et les ouvertures conservent leur contour relevé.
Les proportions du décor et la profondeur des trous sont approchées.
La comparaison a été vérifiée dans Chrome avec le vrai cœur.
`npm run check` passe avec 362 tests Vitest et les 47 tests Chrome passent.

Retouche des matériaux du trou central à partir des captures de Michel
et des pixels du rendu MAME. Les dalles et les pointes utilisent des
gris neutres, les faces des parois alternent jaune et orange, et les
joints sont sombres. Les flèches rouges sont appliquées au maillage des
deux rampes. Les rails ont un reflet plus large et la lumière étire
davantage les ombres vers la droite. Les bandes sont alignées sur la
grille du parcours. Le relief des marches reste approché.
`npm run check` passe avec 364 tests Vitest et les 47 tests Chrome passent.

Les deux fosses latérales utilisent maintenant un motif calé sur les
colonnes visibles de la capture arcade. Le motif place l’orange foncé
du côté gauche de chaque fosse, puis l’orange vif et le jaune.
La transition oblique est approchée par une texture procédurale.
Le reste des parois utilise toujours les bandes alignées sur la grille.

Le gris de chaque panneau de 3 × 3 suit la pente mesurée. Les deux fosses
latérales conservent leur découpe colorée et leur lèvre en dallage. La fosse
centrale a des marches planes et un fond assombri. Les garde-corps sont
plus épais et leurs pieds s’enfoncent dans le sol. Les dalles complétées au
bord inférieur droit donnent à la paroi orange une arête continue. La
palette et la géométrie exacte du trou central restent approchées.
La comparaison arcade et 3D a été vérifiée en jeu sous Chrome avec le cœur
et le relevé locaux. `npm run check` passe avec 370 tests Vitest et les
47 tests Chrome passent à la relance en série.

Une lumière directionnelle à environ 17° du sol remplace la carte de gris.
La direction est estimée d’après les garde-corps et leurs ombres dans
l’image arcade 1199. Elle s’applique à la vue d’étude et à la vue de jeu
avec le même matériau gris pour les dalles. Le raccord gauche entre les
tours a été fermé, les sommets resserrés et les deux pointes détachées
des flèches agrandies. La comparaison a été vérifiée en jeu sous Chrome.
L’orientation est une estimation et les silhouettes d’ombre dépendent
encore de la géométrie reconstruite.
`npm run check` passe avec 373 tests Vitest et les 47 tests Chrome passent.

Sous la rambarde gauche de la fosse centrale, trois dalles complétées
rejoignent la paroi sur une seule arête. Le poteau haut a été recalé sur
ce rebord et sa hauteur est distincte de celle de la marche voisine.
L’orange sombre longe le rebord, avec une transition vers le jaune sur
le retour. Les tours reposent sur leur palier et leurs socles portent
des joints de pierre. L’éclairage directionnel des dalles est conservé.
Comparaison vérifiée sous Chrome avec le cœur arcade. `npm run check`
passe avec 375 tests Vitest et les 47 tests Chrome passent.

Les pieds des garde-corps suivent désormais la hauteur des triangles
du dallage, avec un léger recouvrement pour le contact. Les socles des
pyramides ont deux pierres en relief par pan, séparées par un joint en
retrait. Le retour adjacent à la rambarde porte une bande jaune oblique
sur fond orange. Le reste du pan suit la palette des marches.
Comparaison vérifiée en jeu sous Chrome avec le relevé complet. Le profil
des pierres reste approché. `npm run check` passe avec 376 tests Vitest
et la suite Playwright passe avec 47 tests Chrome.

Le socle de chaque pyramide couvre son palier de 3 × 3 jusqu’au bord.
Les neuf dalles du palier utilisent la même altitude de présentation,
partagée avec le socle. La marche parasite du relevé de collision sous
la pyramide est ainsi supprimée du rendu. Les marches en contrebas et
les hauteurs utilisées par le cœur restent distinctes du palier.
Le raccord a été contrôlé en jeu sous Chrome. `npm run check` passe
avec 376 tests Vitest et les 47 tests Chrome passent.

Le socle des pyramides compte trois pierres par face sur une emprise de
3 × 3. Le bas du socle et le palier sont descendus à 16366 dans le relevé
arcade. L’épaule abaissée et resserrée accentue la différence de pente
entre le chapeau et le socle. Trois dalles sous chaque pyramide sont
abaissées dans le maillage de présentation pour dégager le flanc du palier.
Le matériau dessine le contour et la séparation diagonale du chapeau.
La construction des garde-corps est isolée de leurs ancrages
dans le parcours. Les constructeurs de pyramides et de garde-corps
reçoivent un matériau et sont réutilisables avec d’autres couleurs.
L’[inventaire du décor](docs/SCENE_ELEMENTS.md) indique les noms dans la
scène, les points d’ancrage, les dimensions et les modules à réutiliser.
Le nouveau profil a été contrôlé en jeu sous Chrome. `npm run check`
passe avec 379 tests Vitest et les 47 tests Chrome passent.

Le tronçon après les deux grandes pyramides inclut la flèche rouge
centrale, les deux petites pyramides sur leurs rebords et les garde-corps
de la rigole. `practiceChannelTerrain` raccorde les hauteurs des dalles de
la rigole et complète les coins manquants des rebords rectilignes. Le cadre
de référence pour cette portion est l’image 1500, à un défilement de −16020.
Comparaison vérifiée sous Chrome à la pose du rejeu MAME, qui atteint
Intermediate Race. `npm run check` passe avec 384 tests Vitest et les
47 tests Chrome passent.

À la demande de Michel, les ombres portées de Practice Race sont limitées
au dallage, à la rigole et aux marquages. Les bandes verticales gardent
l’éclairage directionnel. Cela corrige les silhouettes projetées sous
le bord des plateformes.
Le comparatif avant/après sous Chrome confirme la disparition de ces
silhouettes. `npm run check` passe avec 385 tests Vitest et les 47 tests
Chrome passent.

Dans la descente après la rigole, les raccords de sommets sont prolongés
jusqu’à l’arrivée. Les bords rectilignes retrouvent leurs coins de dalles
et les décrochements du parcours restent visibles. Le damier prend ses
hauteurs dans le même maillage que la rampe. Les images 1740, 1860 et
1920 du rejeu MAME 0.271 servent au contrôle de cette zone.
Les trois poses ont été comparées sous Chrome. `npm run check` passe
avec 390 tests Vitest et les 47 tests Chrome passent.

Les trois marquages 3–4–5–6 sont posés sur les plateformes et les
deux drapeaux à damier flottent au bord de l’arrivée. La bannière GOAL est grise
avant le passage, puis bleue quand le cœur envoie l’animation 6. Les
textures sont dessinées par le rendu à partir du rejeu local. Les drapeaux
s’animent pendant le rendu BabylonJS.
Les deux palettes et le mouvement de la toile ont été vérifiés sous
Chrome. `npm run check` passe avec 394 tests Vitest et les 47 tests
Chrome passent.

Les joints du dallage restent légèrement visibles sous les marquages
GOAL et 3–4–5–6 grâce à une transparence localisée aux bords des dalles.
Les deux palettes GOAL et les marquages ont été inspectés sous Chrome.
`npm run check` passe avec 394 tests Vitest.

La vue 3D de Practice Race affiche le score et le chrono de J1, en solo
et en comparatif. `emulation/practiceHud` lit directement les tuiles
affichées par le cœur Web épinglé. `ui/videoComparison` livre le HUD HTML
et le masque lorsque la pose sort du relevé ou que le bilan prend la main.
Le rejeu natif va de 0 point et 58 secondes au départ à 1 270 points et
47 secondes à l’arrivée. Voir les adresses et le décodage dans
`docs/DECISIONS.md`. La partie Web vérifie le départ, le décompte et
les changements de vue en pause. L’arrivée dans Chrome reste à rejouer
avec le vrai cœur. `npm run check` passe avec 398 tests Vitest et
les 47 tests Chrome passent.

Le HUD solo reprend l’emplacement et la palette arcade avec une police
bitmap redessinée à la résolution native. Le chrono a des chiffres
plus grands avec un contour noir. Le marquage numéroté orienté vers la
gauche utilise la version miroir des chiffres dans leurs dalles. La flèche,
les cases et les joints gardent leur calage. Les autres marquages
partagent la seconde variante de matériau. Le HUD a été vérifié avec le
vrai cœur et les trois décals sur la pose d’arrivée dans Chrome.
`npm run check` passe avec 399 tests Vitest et les 47 tests Chrome passent.

GOAL utilise un lettrage à empattements et une bordure limitée au premier
pan de la rigole. Les deux drapeaux ont un damier 3 × 2. Les deux palettes
de la bannière ont été contrôlées dans Chrome.
Le soulèvement au départ sélectionne cinq maillages locaux et leurs
parois d’après les codes de relief lus par `emulation/practicePose`.
`rendering/createPracticeStartLift` prolonge le profil mesuré sur trois
dalles. Le comparatif avec le vrai cœur Web montre la pente au maximum,
et la trace confirme son retour à plat. Voir `docs/DECISIONS.md`.
`npm run check` passe avec 402 tests Vitest et les 47 tests Chrome passent.

Pendant le compte à rebours solo, la vue moderne propose un survol du
relevé jusqu’à la bille. Le champ `PracticePose.opening` suit le compteur
arcade et rend la main au cadrage choisi quand la course démarre.
En capture, C passe par le cadrage arcade, le suivi et la vue du dessus.
Les touches + et − règlent le champ ou le zoom. Les mêmes réglages sont
accessibles en pause. Le vrai cœur dans Chrome a confirmé le survol,
le chrono à 60 au départ et la pose inchangée pendant les réglages.
`npm run check` passe avec 408 tests Vitest et les 47 tests Chrome passent.

Le duo affiche les deux billes, scores et chronos dans Practice Race.
Le module `createPracticeMarble` partage la construction et conserve
un roulement indépendant pour chaque bille. La chute et la réapparition
de J2 ont été contrôlées dans Chrome avec le vrai cœur. Le panneau H
affiche les commandes et reprend les touches configurées pour J2.
La vue moderne garde le terrain pendant une excursion hors du relevé
complet. La régression est couverte par une pose synthétique dans Chrome.
Le geste exact de la vidéo reste à refaire avec le boost.
`npm run check` passe avec 412 tests Vitest et les 48 tests Chrome passent.

Après une chute, quatre éclats rejoignent le point de reprise d’après
le compteur du cœur. La trajectoire 3D est redessinée et la cadence est
mesurée dans l’arcade. La chute de J2, les éclats en pause et la reprise
ont été vérifiés sous Chrome avec le vrai cœur. Les ombres du décor
sont nettes avec un soleil à 24°. **Ombre des billes** les ajoute
sur demande et reste désactivée par défaut.
`npm run check` passe avec 413 tests Vitest et les 48 tests Chrome passent.

Les éclats de réapparition suivent le même cercle antihoraire, centré
sur la bille et visible dans le plan de la caméra. Le rayon décroît
avec le compteur arcade et chaque éclat porte la couleur de son joueur.
La pyramide droite réemploie toujours le constructeur de gauche, et
ses deux dalles de support à coins manquants sont complétées avant
le maillage du palier. Les deux retouches ont été contrôlées dans
le comparatif Chrome avec le vrai cœur.
`npm run check` passe avec 414 tests Vitest et les 48 tests Chrome passent.

L’animation de réapparition utilise maintenant huit éclats par joueur.
Le rejeu solo MAME 0.271 a servi à ajuster leur orbite dans
`src/rendering/createPracticeRespawn.ts`. Elle est plus large que haute,
et son centre part au-dessus du point de reprise avant de redescendre
sur la bille. Le test de scène vérifie le nombre, l’emplacement et
l’envergure de l’orbite au compteur 16, ainsi que sa convergence.
Le comparatif Chrome a été vérifié lors d’une chute de J2 avec le vrai
cœur. `npm run check` passe avec 414 tests Vitest et les 48 tests Chrome
passent.

La lecture de pose dans `src/emulation/practicePose.ts` conserve les
fractions X, Z et hauteur pour J1 et J2. Un cas de stabilisation a été
reproduit dans MAME 0.271. Les écarts de 0,56 et 0,44 unité en Z
devenaient deux déplacements d’une unité entière. Le test de régression
reprend ces trois valeurs du cœur.
`npm run check` passe avec 415 tests Vitest et les 48 tests Chrome passent.
La chute et la réapparition de J2 ont été rejouées dans Chrome avec le
vrai cœur. Le cas intermittent de Michel reste à confirmer en jeu.

Deux rejeux MAME 0.271 valident l’arrivée en duo dans les deux ordres,
le bilan et le passage à Intermediate Race. GOAL garde la couleur
du premier joueur, lue dans `src/emulation/practicePose.ts`. Dans
la vue moderne, le dallage utilise une texture 16 × 16 avec des joints
en escalier et un tramage léger. Les falaises de la dernière descente
se prolongent sous le cadrage, selon les captures arcade. La comparaison
Chrome confirme les deux retouches visuelles. Les instantanés natifs
rejoués dans Chrome confirment GOAL dans les deux ordres d’arrivée et la
sortie de la vue moderne au bilan. Un parcours en duo au clavier avec
le cœur Web reste à refaire en jeu. `npm run check` et les 48 tests Chrome
passent, avec 418 tests Vitest.

À Practice Race en duo, `practicePose` lit le déclenchement et le décalage
du message de rattrapage. `createPracticeCatchUpLabel` affiche « −5 SEC »
au-dessus du joueur concerné, à partir du retour de la bille. Le chrono
garde une colonne de séparation entre les contours des chiffres.
Le rattrapage a été reproduit dans MAME natif et les poses ont été
rejouées dans Chrome. Le test en jeu complet avec le cœur Web reste à
faire. Le bonus « +10 SEC » sera à relever dans Intermediate Race.
`npm run check` passe avec 420 tests Vitest. Les 48 tests Chrome passent.

La page `terrain.html` charge le relevé d’Intermediate Race dans
`local-roms/intermediate-terrain.json`. Le benchmark
`node scripts/measure-terrain.mjs --intermediate` reproduit le relevé avec
MAME 0.271. Le cadrage couvre 0 à 306 pixels de défilement et la vue libre
montre la grille complète. Les parois bleues, la rampe et les trois
pyramides donnent la première scène d’étude.
`npm run check` passe avec 422 tests Vitest. Les 49 tests Chrome passent.

`intermediateRims` rétablit les rebords rectangulaires des cinq fosses du
départ et les coins des dalles aux jonctions droites avec les falaises.
Le raccord de la grande rampe est prolongé jusqu’au plateau haut.
Les cadrages 0, 218 et 306 px ont été revus dans Chrome avec le relevé
existant. `npm run check` passe avec 428 tests Vitest.

`intermediateRims` complète les 16 blocs isolés de 2 × 2 dalles autour
des rampes, y compris celui coupé par la limite du relevé. La hauteur
du dessus vient de la première dalle échantillonnée de chaque bloc.
Les quatre groupes ont été inspectés dans Chrome. `npm run check` passe
avec 432 tests Vitest et les 49 tests Chrome passent.

Les pyramides d’Intermediate Race ont leur propre maillage dans
`createIntermediateTower` et un socle de 14 dalles dans
`intermediateLandmarks`. Les rangées suivent le motif 3–4–4–3 avec
une dernière rangée décalée d’une dalle. Le test contrôle l’empreinte
et les proportions sur les trois pyramides.
Le cadrage arcade à 218 px a été revu dans Chrome. `npm run check`
passe avec 433 tests Vitest. Les 49 tests Chrome passent.

`intermediateRims` coupe les dalles de la limite latérale sur une
diagonale continue et prolonge les dalles incomplètes le long des
rebords rectilignes relevés. Le même contour sert à générer les parois
verticales. Les tests couvrent les deux diagonales et les raccords
dans la deuxième moitié du relevé.

Le rejeu MAME confirme le mouvement du premier pont autour de (63,58).
Le tablier de quatre dalles sur quatre pivote visuellement autour de
Z 60. Son bord libre monte de 16 unités sur un cycle de 144 images.
`createIntermediateBridge` anime le tablier, ses bordures turquoise
et le mécanisme violet dans la scène d’étude. L’animation tourne en
boucle dans l’étude. La phase du cœur reste à raccorder dans la vue
jouable. Le traitement du terrain enlève la pointe parasite voisine
et remet les dalles d’angle isolées au niveau de leur plateforme.
Les falaises et le pont projettent des ombres sur le dallage.
`npm run check` passe avec 439 tests Vitest. Les 49 tests Chrome
passent. Le pont a été vérifié à 306 px et en vue libre, à plat
puis levé. Les captures Chrome montrent les ombres à l’intérieur
des fosses et sur les rampes.

Le pont a maintenant un tablier épais et un cadrage bas pour son
mécanisme. Les voies de la zone d’ondulations partagent le même profil.
Le fichier local `local-roms/intermediate-terrain-pipes.json` ajoute les
triangles des deux tuyaux de Rolling Madness 3D, recalés dans la grille
arcade et habillés avec des matériaux BabylonJS. Charger cette copie
dans `terrain.html`, puis choisir **Pont articulé** ou **Tuyaux et rampes**.
`npm run check` passe avec 458 tests Vitest. Les 49 tests Chrome passent,
et les deux cadrages ont été inspectés avec le maillage local des tuyaux.

Les rejeux MAME `--intermediate` et `--intermediate-impact` isolent
respectivement l’étourdissement et l’engloutissement de J1, et la casse
de J2 suivie du passage du balai jaune. Repères dans
`docs/PROTOTYPE_04.md`. Le cœur Web restaure bien un état de Practice
Race après une itération, essai privé dans Chrome. Les points de
départ des six courses et le sélecteur restent à créer.

Prochaine action concrète : brancher d’abord la pose de la bille et
les états d’animation d’Intermediate Race sur la vue jouable, puis
relever les poses des vers pour synchroniser leur rendu 3D. Le relevé
de la baguette reste à faire.

### Référence externe Rolling Madness 3D

L’installateur de Luca Elia a été lu sur macOS sans lancer le programme,
avec `xtinno` de Binary Refinery 0.11.3. Il contient 47 fichiers
`.ase.mesh`, dont les six terrains et des modèles séparés pour les billes,
ennemis, ponts et obstacles. `level/level1.txt` et `actor/world1.txt`
associent Practice au maillage `model/lev1.ase.mesh`. Ce fichier binaire
référence 9 textures et 6 textures d’éclairage. Aucun code source du jeu
n’a été trouvé dans l’installateur ni sur la page publique de l’auteur.
La licence incluse exige une permission pour modifier ou redistribuer
le logiciel. L’extraction complète est désormais dans
`3D_assets_for_animated_entities/`.

[MeltyTool](https://github.com/MeltyPlayer/MeltyTool#supported-formatsgames)
dispose d’un importeur `.ase.mesh` et d’un export GLB de référence pour
le niveau 1. Les six maillages de l’installateur correspondent aux fichiers
du dépôt par SHA de blob Git. L’amélioration des animations et des
textures d’éclairage est proposée dans la
[PR 116](https://github.com/MeltyPlayer/MeltyTool/pull/116), ouverte lors
de la vérification. La conversion des fichiers locaux et le recalage sur
les coordonnées arcade restent à tester si cette piste est reprise.

## Vue immersive Safari

Michel confirme que la capture fonctionne en fenêtre. Le plein écran natif
interrompt la capture et le son. Le bouton de jeu ouvre la vue immersive
avec HUD dans Safari antérieur à 18.2 pour contourner le bug WebKit 272136.
Recharger, choisir Jouer en plein écran 3D puis Capturer. Confirmer que la
partie avance et que le son reste stable en vue immersive dans Safari.

## Capture et grésillement Safari

Michel signale que Capturer mettait le jeu en pause et que le son grésillait.
Le raccord Pointer Lock attend désormais l'événement de confirmation si
le navigateur renvoie une valeur sans promesse. Pour Safari, le tampon
RetroArch demandé passe de 64 à 128 ms. Recharger dans Safari, démarrer,
cliquer sur Capturer et vérifier le mouvement de la bille et le son.

## Recette sur le Mac de Michel

Michel valide le jeu à deux, le son et la lisibilité du CRT. Safari présente
parfois des écrans noirs et un démarrage plus lent que Chrome. La cause exacte
reste à isoler dans Safari. Le diagnostic chronomètre les ZIP, le frontend et
le lancement du cœur. Une perte du contexte graphique BabylonJS ramène en
vue directe dans la même session. Une perte du contexte du cœur est signalée
séparément. Au prochain écran noir, relever la vue concernée et copier les
diagnostics depuis la page.

## Saut du niveau 1

Michel n'a pas réussi le saut vers les plateformes latérales avec Espace
et le trackpad. Le boost maintenu passe de 128 à 256 unités de trackball par
itération. À départ et durée égaux, le vrai cœur montre une accélération
horizontale plus forte. Le saut lui-même reste à reproduire.
Recharger la page, lancer une partie et vérifier le franchissement à partir
de la rampe. Les conditions de l'essai comparatif sont dans
[VALIDATION.md](docs/VALIDATION.md).

## Écran cathodique

Dans Borne et bar 3D, cocher Effet CRT sous Écran cathodique. Les curseurs
règlent la courbure, les lignes de balayage et les parasites horizontaux.
Le HUD reprend l'interrupteur en plein écran. Les préférences sont locales.
L'effet et les parasites sont initialement désactivés.
`src/rendering/createCrtMaterial.ts` contient le maillage et le shader du
tube. `src/ui/crtControls.ts` synchronise les réglages.
Le tube reste au format 4:3 quel que soit le rapport du canvas vidéo.
La courbure du verre et du raster a été renforcée sur les deux axes.
`npm run check` passe avec 297 tests et Chrome avec 38 tests. La partie réelle
a été observée de face et en vue inclinée avec le filtre actif. Recharger
Vite sur le port 5173, activer le CRT et comparer les deux cadrages.

## Deux joueurs

J1 utilise le trackpad ou la souris. J2 utilise ZQSD par défaut, avec WASD,
flèches, remappage et désactivation dans Périphériques de jeu.
Le filtre dans le glue réserve la souris à J1. Le clavier atteint J2 par
les directions D-pad du cœur. Chaque trackball suit son entrée.
Essai du vrai cœur dans Chrome avec deux crédits et Start joueur 2.
Vérifier le confort de jeu à deux sur le Mac de Michel.

Dernière mise à jour le 14 novembre 2026.

## Moniteur incliné et trackballs

C parcourt Frontale, Moniteur incliné, Écran et commandes, Borne et Bar.
Le moniteur remplit l’essentiel de la vue rapprochée, avec son pourtour en
perspective. Les marbrures rendent la rotation des boules visible. En jeu,
la bleue suit les deltas de J1. Hors capture, cliquer et glisser sur la rouge
pour vérifier son animation dans la scène.

## Reproduction Atari System I

Le `marble.skp` de Gozer est intégré dans le bar après conversion locale.
La géométrie utilise les cotes du modèle en mètres. Les textures WebP
reprennent les flancs, le panneau et l’enseigne. La vitre et l’image fixe du
moniteur cèdent la place au plan incliné qui reçoit la vidéo MAME.
`src/rendering/createCabinet.ts` construit les zones cliquables et les
deux trackballs. La bleue suit J1. La rouge représente J2. Les deux boutons
Start et les deux retours de monnaie sont actifs hors capture.
`npm run check` et la suite Chrome passent. Le vrai jeu a été observé dans
les quatre cadrages.

Ouvrir la scène Borne et bar 3D, choisir Borne pour voir le meuble entier,
puis Écran et commandes pour inspecter les deux boules. Vérifications dans
[VALIDATION.md](docs/VALIDATION.md) et sources dans
[le registre des assets](public/assets/README.md).

## Raccourci caméra pendant la partie

Dans Borne et bar 3D, C parcourt Frontale, Écran et commandes, Borne puis Bar.
Le cadrage rapproché montre l’écran, la boule et les boutons. Le cycle
est défini dans `src/game/cameraPreset.ts` et passe par le même changement
de caméra que les sélecteurs du HUD et de la page. Le test navigateur
vérifie la capture et le boost pendant les transitions. La vue rapprochée
a été examinée dans Chrome avec le vrai cœur. `npm run check` passe avec
289 tests et la suite Chrome avec 34 tests. Pour essayer, capturer le
trackpad en vue 3D puis appuyer sur C à chaque changement de cadrage.

## Correctif de la boule 3D

`src/rendering/createCabinet.ts` compose les rotations dans les axes du meuble.
Le sommet roule dans le sens du geste, y compris après une diagonale.
L’amplitude visuelle maximale est de 45° par échantillon. Le raccord au cœur
garde les mêmes deltas. `npm run check` passe avec 288 tests, et Chrome avec
33 tests. Des gestes sous Pointer Lock ont confirmé les axes dans la scène
avec le vrai cœur. Les essais optiques séparés au début du niveau 1 confirment
la direction principale dans les quatre sens. Voir
[les mesures](docs/VALIDATION.md#sens-de-rotation-de-la-boule-3d--10-novembre-2026).

Pour la recette de Michel, recharger le serveur Vite local 5173, choisir
Caméra → Borne, cliquer sur Capturer, puis comparer des gestes courts
verticaux et horizontaux après un geste diagonal.

## Prototype 03 — état actuel

Michel a autorisé les cinq évolutions de
[la spécification 03](Marble_Madness_Prototype_03_SPEC.md). Elles sont
implémentées. La scène conserve une seule session MAME et ses vues de référence.

- Explorer le bar avec ZQSD, WASD ou les flèches. Le trackpad oriente le regard.
  E à proximité transfère Pointer Lock du canvas BabylonJS au canvas arcade.
  Échap met en pause et purge les entrées. Quitter la borne revient au bar.
- Borne à l’échelle, graphismes latéraux, grains de matière et ombres statiques.
  La boule tourne selon les deltas natifs observés. Choisir Borne puis Capturer
  dans le HUD pour la voir pendant le jeu.
- Son positionnel débrayable pendant la visite. L’adaptateur réutilise le master
  OpenAL. En jeu le routage stéréo d’origine est rétabli.
- Qualité Éco, Équilibrée ou Retina, avec plafonds de DPR 1, 1,5 et 2.
  Le diagnostic expose les appels de dessin et les temps CPU/GPU disponibles.

Points d’entrée pour la reprise du code dans `src/ui/videoComparison.ts`,
`src/input/barExplorer.ts`, `src/app/createVideoView.ts`,
`src/rendering/createScreenStage.ts`, `src/audio/spatialOutput.ts` et
`src/emulation/emulatorjs.ts`. Tests navigateur dans `navigation.spec.ts` et
`spatialAudio.spec.ts`, tests unitaires à côté des règles.

Chrome a validé les 33 scénarios. Un parcours avec le vrai cœur a mesuré le
signal positionnel, le transfert de capture, les deltas natifs et la rotation
du mesh, puis la pause stable. Les quatre cadrages ont été examinés. Le
réglage de résolution a été vérifié à DPR 2. Voir [VALIDATION.md](docs/VALIDATION.md).

Recette de production terminée avec dix minutes actives, dix pauses stables,
36 094 copies vidéo, une source audio, zéro erreur JS et zéro requête distante.
`npm run check` et les trois tests preview réussis. Les deux preuves numériques
sont dans `third_party/prototype03-evidence.json` et
`third_party/prototype03-endurance-evidence.json`. Le banc se relance avec
`npm run measure:endurance -- --local-files` sur un preview via
`MARBLE_TEST_URL`. Voir le [protocole](docs/ENDURANCE.md).

Prochaine action manuelle dans Safari et sur un écran 120 Hz. Ouvrir le
serveur Vite local 5173, lancer le cœur, Explorer → E → Échap, puis essayer
les trois profils et écouter le son à différentes distances. Safari WebDriver
a refusé la session car l’automatisation à distance est désactivée. Le WebKit
de secours n’a pas ouvert d’onglet dans le délai imparti.

## Historique prototype 02

Michel a explicitement autorisé les cinq étapes : borne, cadrages/transition,
interactions, matériaux/éclairage, premier bar. **Toutes sont implémentées**.
Lire Marble_Madness_Prototype_02_SPEC.md ; AGENTS et spec01 renvoient à cette
extension. Les anciennes exclusions borne/bar dans l'historique ne bloquent plus.

Nouvelle option **Borne et bar3D**, HUD Caméra **Bar / Borne / Frontale**.
Meuble complet et enseignes, trackball et boutons, monnayeur, haut-parleurs ;
première pièce avec sol/murs, comptoir, bouteilles/étagères, table/tabourets et
suspensions. Matériaux originaux procéduraux, éclairage chaud/froid, aucune
dépendance ou asset externe ajouté. Pas de navigationFPS ou audio spatial.

Hors capture : boutons/monnayeur Crédit, Start1/2 ; écran ou trackball → transition
frontale et capture synchronique. Même session et mêmes méthodes d'impulsion.
Pendant capture les clics3D sont ignorés ; HUD et raccourcis conservés. Caméra
unique sans contrôles attachés. Transitions0,65s même en pause, rAF temporaire
propriétaire du rendu, copie vidéo toujours après dessin natif. Resize du HUD
retargete sans casser l'animation ; blur/Échap/visibilité/dispose annulent.

Fichiers : rendering/createCabinet.ts, createBarRoom.ts, decorTools.ts,
createScreenStage.ts, createVideoScene.ts ; app/createVideoView.ts ;
game/cabinetAction.ts, cameraTransition.ts ; ui/videoComparison.ts et playControls.ts.
Protocole/usage : docs/PROTOTYPE_02.md. Texte des enseignes corrigé verticalement
et panneau abaissé pour que la boule reste sous l'image ; test de non-recouvrement.

Validation : npm run check réussi, **250 tests/27 fichiers**, couverture99,48 %
instructions,99,34 % branches,100 % fonctions,99,45 % lignes. **29 tests Chrome**,
**3 preview** réussis. Picking réel des boutons, monnayeur et boule, survol,
capture et blocage des clics, pixels vidéo et destruction textures/meshes/
matériaux/lumières/caméras à zéro vérifiés. Premier passage avec nouvelles
dépendances : navigations de test et helper sans scène ; stabilisation puis
correction du scroll du banc pour mettre les points cliqués dans le viewport.
Aucun test ignoré/seuil réduit. Helper d'inspection dans tests seulement.

Vrai runtime Chrome157.0.8103.40 : Crédit/Start par meshes, capture depuis la boule,
transition bar en pause, puis frame1115 stable,402 copies, frontale, boost et
pending purgés, boutonsJ1/J2 vides, source audio1, zéro erreurJS. Trois captures
finales /tmp/marble-prototype2-{bar,cabinet,game}.png examinées. Preuve numérique
à conserver dans third_party/prototype02-evidence.json. Écoute et confort physique
non certifiés. Les métriques du callback vidéo excluent le rendu rAF des transitions.

**Endurance02 terminée sur build production isolé** : dix nouveaux intervalles,
**600,02s actives**, frame36772,36063 copies, zéro erreurJS ou requête distante.
Dix pauses stables, pending(0,0), boost et boutons des deux ports purgés, source
audio1. Listeners721 au premier relevé puis720 constants ; heapJS16,73–28,87Mio
avec retours après GC, nodes4646–4693. Aucun incident bloquant observé, pas de
preuve générale d'absence de fuite GPU/WASM. Callback vidéo moyen0,459–0,550ms,
max9ms ; hors rAF de transition et fin GPU, pas benchmark comparatif fin.

Recette : npm run build puis preview local4175, MARBLE_TEST_URL=http://127.0.0.1:4175/
PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance -- --local-files. Le banc
sélectionne les ZIP fixes du dossier roms via les champs locaux ; aucune copie
dans dist/upload. Rapport temporaire test-results/endurance.json, preuve complète
third_party/prototype02-endurance-evidence.json, localFileSelection=true,
scene=prototype-02-cabinet-bar, complete=true. Preview4175 arrêté après recette ;
serveur dev5173 conservé. Une série2min avait été arrêtée pour le survol et une
série6min interrompue par HMR ; aucune de leurs minutes n'a été réutilisée.

**Picking aussi vérifié en production** sans helper dev : clics projetés à partir
du cadrage déclaré sur Crédit/Start produisent les quatre appels natifs attendus,
puis la boule capture et choisit Frontale. Échap met en pause, pending nul,
64 copies sur ce court essai, zéro erreurJS. Preuve :
third_party/prototype02-production-evidence.json. Captures finales du vrai jeu
examinées comme indiqué plus haut. La preuve01 reste historique, non écrasée.

Prochaine action concrète : Michel recharge dev5173, ouvre Jouer en plein écran3D,
choisit Caméra→Bar/Borne/Frontale et essaie les boutons/monnayeur/boule/écran.
Recette humaine du rendu et du confort, puis priorisation des finitions ;
écoute complète, Safari/120Hz et coût GPU restent ouverts. Les cinq étapes
autorisées sont réalisées, pas de navigationFPS ni de spatialisation ajoutées.
Pas de nouvelle dépendance, Git initialisé ou déploiement.

## Historique prototype01 — état avant l’extension02

Marble Madness original fonctionne avec EmulatorJS 4.2.3 + MAME 2003-Plus.
Crédit, Start, trackpad relatif, pause/reprise, volume, diagnostics et nouvelle
session sont disponibles. La page principale affiche la même session en direct,
en comparaison côte à côte, sur un plan BabylonJS seul ou sur un écran en scène 3D. La scène `scene.html`
reste une ancienne démo indépendante.

Michel a joué jusqu'au niveau 3. Il confirme le 8 novembre : **« ok, c'est bon »**
après correction du clignotement et du filtrage vidéo. Ce retour valide ce
problème visuel ; ne pas l'étendre à l'endurance ou à l'écoute audio complète.
Le confort de freinage dans la pente en sortie des vagues, fin du niveau 3,
reste un point ouvert. C est implémenté, sa recette humaine complète reste ouverte.
D est implémenté et l'image corrigée est confirmée par Michel. E est préparé et
vérifié techniquement ; détails et procédure finale dans `docs/RELEASE.md`.

Michel a rejeté **0,50× comme injouable** et demandé un boost sur Espace,
puis la poursuite du rendu 3D. Ce retour remplace la recommandation historique
de calibration ci-dessous. La section 15 de la spécification et AGENTS.md
consignent cette évolution autorisée. Ne pas redemander de capture identique.

Le gain normal par défaut/reset est **1,70×**. Une préférence enregistrée à
0,50× est migrée vers 1,70× ; les autres gains valides sont conservés.
Maintenir **Espace**, puis guider au trackpad : commande native continue de
norme L1 128 counts par itération, remplaçant les deltas pendant le maintien.
Relâcher revient au contrôle normal. Échap, blur, onglet masqué et destruction
purgent le boost ; Espace ne reprend pas la pause. La physique reste dans MAME.
Confort, freinage et saut ne sont pas encore validés humainement.

Choisir **Écran en scène 3D** : même vidéo animée sur un écran avec cadre,
support, socle, éclairage et sol quadrillé. Même session, texture et boucle,
caméra fixe ; aucun niveau reconstruit en meshes ni asset externe ajouté.
Détails : docs/COMFORT_AND_3D.md. **Plein écran et HUD maintenant livrés** :
Jouer en plein écran 3D → Crédit/Start/Capturer ; Pause et Reprendre/son présents.
Retour à la page quitte en pause. Échap libère/purge et peut quitter le fullscreen
selon le navigateur. Refus API : repli immersif dans la fenêtre. Entrée en pause,
aucune reprise implicite. Même session/texture ; boutons délégués aux contrôles
communs, states/messages synchronisés, observers/listeners nettoyés.
Michel confirme le 10 novembre que le plein écran fonctionne bien, puis autorise
les deux caméras fixes. **Caméra Frontale/Perspective livrée** dans le HUD et sur
la page, sélecteurs synchronisés, actifs en scène 3D. Perspective initiale ; choix
conservé pendant la session, sans stockage. Frontale orthographique droite et
agrandie, plan complet visible ; socle en partie hors champ pour privilégier le jeu.
Même caméra/texture/session ; aucun appel aux commandes ou changement lecture/
pause. Échap libère le trackpad pour utiliser le sélecteur, Capturer reprend.
Michel confirme les vues puis demande les raccourcis de capture et la recette
suivante. **Raccourcis implémentés** : 5/(=Crédit, 1/&=StartJ1, 2/é=StartJ2,
uniquement en capture active/non suspendue, hors champs et Ctrl/Alt/Meta.
Une impulsion120ms, répétitions absorbées. StartJ2 utilise le port1 (pas de
nouvelle commande relative J2) ; deux jeux de timers, tous purgés à l'interruption.
Aide dans le HUD et le statut de capture. Section16 de la spec : demande autorisée.

**Endurance automatique terminée**, complete=true : dix intervalles, **600,40s
actives**, frame finale36794,36090 copies vidéo, zéro erreurJS et requête distante.
Les dix pauses sont stables, boost/pending/boutons des deux ports purgés. Les
six alias ont produit exactement les douze appels natifs attendus. Moyenne CPU
cumulée de soumission copie+rendu0,144–0,177ms, max10,2ms ; pas du temps GPU.
Listeners718 constants, une source audio et contexte suspendu en pause. HeapJS
19,73–21,58Mio : variation avec hausse sur les derniers relevés, pas une preuve
d'absence de fuite ; mémoire GPU/WASM hors mesure. Une partie puis états arcade/
attract automatiques, pas dix minutes de parcours humain ni écoute certifiée.

Commande reproductible : PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance,
serveur dev et ROMs locales requis. Rapport test-results/endurance.json ; preuve
numérique sauvegardée dans third_party/endurance-evidence.json. Protocole et
résultat : docs/ENDURANCE.md. Les premiers intervalles ont coexisté avec les
vérifications build/navigateur ; ne pas utiliser cette série comme benchmark
comparatif fin. Pas de modification ROM ou préférence utilisateur réelle.
Prochaine action concrète : bilan prototype01 avec Michel, en distinguant recette
technique acquise et écoute/confort/120Hz/Safari encore ouverts, puis définir
le périmètre du prototype02 avant de modéliser une borne détaillée ou un bar.

Validation actuelle : **npm run check réussi, 231 tests / 25 fichiers**.
Couverture : 99,48 % instructions, 99,31 % branches, 100 % fonctions,
99,44 % lignes. Chrome dev **27 tests réussis**, preview **3 tests réussis**.
Tests purs des six alias/modificateurs et deux ports indépendants ; Chrome teste
capture, répétition, saisie, pause/hors capture et démontage. Premier passage
bloqué par Playwright.press(é) : CDP clavier natif utilisé pour cette touche,
les autres touches restent des frappes Playwright ; vrai runtime vérifie les
douze appels attendus. Les dix intervalles d’endurance sont maintenant terminés.
Avertissement de chunk BabylonJS >500 ko conservé ; aucune dépendance ajoutée,
aucun déploiement ni dépôt Git initialisé. Les sections suivantes conservent
l'historique ; l'état actuel ci-dessus remplace leurs prochaines actions.

## Lancer et vérifier

```sh
npm ci
npm run setup:emulator
npm run dev
```

Ouvrir `http://127.0.0.1:5173/`. Michel a placé `marble.zip` et `atarisy1.zip`
dans `roms/`, ignoré par Git. Le serveur local les précharge via deux routes fixes,
loopback seulement ; pas de copie dans public/dist, pas d'upload ou stockage
navigateur. Les tailles/SHA-1 des 30 dumps sont vérifiés et le ZIP canonique est
assemblé en mémoire. Les sélecteurs restent disponibles et prioritaires.

Vérifier et préparer → Démarrer l'émulation → attendre MAME → Crédit → Start →
Capturer. Pas de clic maintenu. Échap/perte de focus/onglet masqué : pause,
silence et purge. Reprise/capture explicites ; aucune reprise automatique.
Après modification du glue, **recharger complètement la page**.

Pour le build, `npm run build`, puis `npm run preview -- --host 127.0.0.1 --port
4173 --strictPort` ; sélection manuelle des ZIP, pas de préchargement dev.
Les serveurs de tests preview sont temporaires ; le serveur dev peut rester
actif sur 5173. Aucun déploiement ou dépôt Git initialisé.

## Commandes et mesures à préserver

- Gain commun X/Y 0,25–4×, défaut/reset 1,70× ; seuls gain/volume sont mémorisés
  (`marble.gain`, `marble.volume`). Le mode normal reste linéaire. Le boost
  explicite est séparé et ne persiste pas. Migration du seul candidat rejeté 0,50×.
- Relevé humain : `saturated=0`, pic brut 289, transmis 492, pending 927 ; natif
  X -927..748, Y -345..917, inversions 102/97. Les signes et grands mouvements
  passent, mais ces compteurs ne mesurent ni vitesse de bille ni efficacité de freinage.
- `nativeSampling` observe le dernier poll après chaque itération, pas tous les
  polls C/MAME ; aucune somme native exhaustive. Pause conserve les statistiques
  et rompt les séquences de signes. Nouvel essai remet seulement les mesures
  à zéro. Copier les diagnostics reste local, avec repli manuel.

## Modules et contrats critiques

- `input/relativeMotion.ts` : gain linéaire, fractions, bornage int16 du pending,
  excédent abandonné, purge. Aucune seconde accumulation par frame ni rotation 45°.
- `input/buttonPulses.ts` : simulateInput(0, 2|3, 1|0), impulsion de 120 ms puis
  relâchement ; timers et boutons libérés sur interruption.
- `ui/playControls.ts` : gestes utilisateur, Pointer Lock source, réglages,
  interruptions et annulation d'une capture encore en attente.
- `emulation/emulatorjs.ts` : API internes figées, MEMFS sans persistance,
  pause/audio existant, une instance par document. Nouvelle session = rechargement,
  pas de faux destroy. MAME xy_device=mouse, input_interface=retropad, sensibilités
  et inversion originales du pilote conservées. Pas de mode raw/non accéléré.
- `emulation/coreInputPatch.ts` : vérifie les deux SHA-256 JS/WASM et les marqueurs
  avant raccord. ABI RetroArch 6dd4353, rwebinput_mouse_state_t en tête du userdata :
  taille 64, pending 40/44, poll 48/52, boutons 56. Aucun événement souris synthétique.
  **Ne pas changer les hashes sans revérifier l'ABI et les tests.**
- `emulation/coreVideoPatch.ts` : indicateur remis à zéro avant l'itération,
  levé par drawArrays/drawElements du canvas source et framebuffer par défaut.
  Une notification après dessin ; les itérations sans dessin gardent la texture.
  FBO intermédiaires/autres canvas ignorés. Raccord ciblé sur le renderer figé,
  pas une prise en charge générique des blits/draws instanciés. Fichiers tiers
  sur disque/WASM inchangés. Diagnostics d'entrée indépendants du signal vidéo.
- `emulation/videoSource.ts` → `ui/videoComparison.ts` → import différé
  `app/createVideoView.ts` → `rendering/createVideoScene.ts` / `videoLayout.ts`.
  Caméra fixe, matériau émissif noir + texture, traitement d'image désactivé.
  HtmlElementTexture copie le WebGL sans contexte 2D ni lecture CPU des pixels,
  puis rend dans le même appel. PreserveDrawingBuffer reste false. Filtrage
  bilinéaire pour éviter un second nearest à échelle fractionnaire pendant le scroll.
  Les cadres suivent l'aspect annoncé par le cœur (336×240, aspect 1,333333373),
  distinct de la résolution de présentation, bandes éventuelles incluses.
- Le propriétaire vidéo retire abonnement/ResizeObserver puis détruit texture,
  scène et moteur. Pas de boucle autonome, second émulateur ou chaîne audio.
  Copies arrêtées en direct/arrière-plan ; source masquée par visibilité en vue
  seule. Erreur GPU : repli direct. Aucun changement de vue ne reprend la partie.

Versions et preuves : `docs/DECISIONS.md`, `third_party/README.md` et manifeste.
Lire `AGENTS.md`, le guide BabylonJS, README, architecture et spec à chaque reprise.

## Dernière validation technique

- `npm run check` : **200 tests sur 22 fichiers**, format/lint/types/couverture/build.
  Couverture : 99,39 % instructions, 99,46 % branches, 100 % fonctions, 99,35 % lignes.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser` : **19 tests sans ROM** réussis.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:preview` : **3 tests sans ROM** réussis.
  Le code compilé, la sélection manuelle, les empreintes/notices runtime et
  l'exclusion des ROMs/routes dev sont vérifiés. Workflow CI complété ; pas
  d'exécution GitHub attestée en l'absence de dépôt initialisé.
- Reconstruction isolée du bilan E (avant ajout de l’essai trackball) : Node 24.20.0 / npm 11.19.0, npm ci offline depuis cache,
  ressources d'émulation existantes vérifiées, check réussi. **49 fichiers dist
  identiques octet pour octet**, même plateforme et versions. Copie temporaire
  sans ROM ni node_modules initial. Node Homebrew cassé contourné par Node nvm ;
  aucune modification système ou des versions des dépendances.
- Essai ponctuel du build avec ZIP locaux, Chrome 157 headless : course et
  comparaison, capture réelle source masquée, 20 événements natifs ; frame
  1097 → 1187, copies 1089 → 1179. Pause stable frame 1210/copie 1202. Aucune
  erreur JS ou requête distante/préchargement dev. Aucun ZIP ajouté au build/tests.
- Correction clignotement : avant, 3 copies sans dessin/transparentes sur 331 ;
  après, zéro sur 338 en comparaison puis 579 cumulées source masquée. Tests
  d'itérations sans dessin, FBO, plusieurs dessins, marqueurs ; test GPU du
  filtrage des arêtes. Confirmation humaine reçue ensuite.

## Prochaine action

Priorité au saut du niveau 1 (voir ci-dessous), puis faire la recette de 10 minutes de `docs/RELEASE.md` sur le Mac de Michel : jeu,
freinage, écoute, perte de focus, reprise, comparaison, resize et nouvelle session.
Consigner ses retours sans réimplémenter la physique. Safari, 120 Hz et DPR restent
non validés. Le coût CPU affiché n'est ni un temps GPU complet ni une mesure de
vitesse d'émulation. Avertissements de taille BabylonJS et limites d'outillage
restent documentés. Pas de borne, bar, remaster, déploiement ou nouvelle dépendance.

## Résultat prioritaire du 9 novembre : réponse effective

La protection à 416 a bien limité 20 impulsions à gain 1,70× mais Michel ne constate
**aucune amélioration**. Essai rejeté, case/API/module/tests associés retirés ;
aucun autre limiteur ou boost ajouté. Ne plus demander de le cocher. Le test de
transmission linéaire d'une grande impulsion est conservé. L'écriture privée
setPending et le pré-hook restent pour les diagnostics, pas utilisés par le joueur.

Banc `npm run measure:impulses` (environ 4 min), ou `-- --quick` (environ 1 min),
serveur dev loopback déjà lancé et ZIP locaux disponibles. Navigateur isolé ;
un document/runtime neuf pour chaque essai, Crédit 700..707, Start 710..717,
impulsion native 1200, suivi optique 1199/1206/1212. Bypass volontaire du gain et
du filtre d'événements pour observer seulement la réponse en aval du driver.
La tentative par restauration de snapshot n'avait pas des départs identiques :
rejetée, aucun instantané conservé. Le banc vérifie départs, consignes et images.
Rapport numérique dans test-results, ignoré. Le script n'est pas lancé en CI.

11 essais complets + 4 contrôles détaillés de premières frames, puis 3 essais
courts reproduits avec le script conservé : zéro erreur JS. Départ du marqueur
identique (525,494 ; 168,016), canvas 1110 × 832, essais neutres immobiles. Décor
identique sur 360000 pixels dans les captures contrôlées, donc pas de translation
caméra pour ces mesures. Les centièmes de pixel ne sont pas une précision physique.

À la frame 1212, 64×1 déplace le marqueur de (+2,93 ; -4,06) pixels, 256×1 de
(+9,73 ; -3,89), 416×1 de (-23,21 ; -3,72). La réponse visible n'est pas monotone
avec le pic. 256×6 atteint environ 29,91 pixels de déplacement contre 10,48 pour
256×1. Cela n'isole pas les compteurs internes ni ne prouve le saut ou la
fidélité d'une inertie artificielle. Aucune lecture/écriture de RAM ou code de ROM.

Mesure pure testée : `src/diagnostics/blueMarker.ts`, RGBA WebGL bottom-up avec
exclusion du HUD et des bords, limitée au départ du niveau 1. Importée par le banc
uniquement, pas par l'app. Huit tests, couverture incluse. Résultats de référence
sans image ni état : `third_party/impulse-response-evidence.json` ; protocole et
interprétation : `docs/INPUT_RESPONSE.md`. Les images de contrôle restent dans /tmp.

**Lectures analogiques désormais observées (voir ci-dessous).** Prochaine
investigation : interprétation des mêmes séquences ou comparaison de référence,
avant tout nouveau réglage. Ne pas conclure au bug précis à partir du suivi
écran ; aucune correction du saut encore validée. La recette humaine globale
reste ouverte ; ne pas ajouter une borne, un bar ou une nouvelle physique.

## Trace des ports terminée le 9 novembre

`npm run measure:ports -- --quick` ajoute au banc l'observation du handler réel
`trakball_r`, pas une reconstruction depuis la souris. Le script capture les
exports WebAssembly réels Eh/Ch et vérifie les octets WASM par SHA-256. Le module
`diagnostics/trackballPorts.ts` vérifie cinq lignes statiques de Memory_ReadAddress16
à l'adresse 9849616, handler de table 17927, arité 2. Provenance : sources figées
atarisy1.c/memory.h et segment data 43696 de l'archive du cœur, sans ROM.

Un trampoline WASM appelle une fois l'original avec les mêmes arguments, journalise
les retours et les renvoie tels quels. Fenêtre bornée, erreurs de mesure isolées,
restauration au démontage, contrôle de propriétaire. Aucun changement de code ou
RAM du programme arcade, aucune trace dans le frontend normal ou le build.

Cinq essais prototype X natif 0/64/256/416/768, puis trois essais courts du traceur
conservé 0/256/0 : départs et sorties image identiques au banc précédent, aucune
erreur JS, 64 lectures par essai (4 par étiquette de frame), masque 65280, aucune
perte ni erreur d'observation sur le traceur conservé. Les deux ports joueur 1
retournent les mêmes octets pour ces impulsions X ; les deux autres ports
évoluent aussi, journaux conservés sans assimilation à un second joueur actif.

Après départ 0, les lectures joueur 1 donnent : 64→239 puis 237 (pas −17 puis −2),
256→188 puis 179 (−68 puis −9), 416→146 puis 131 (−110 puis −15), 768→53 puis 26
(+53 puis −27). Les octets finaux sont cohérents avec la sensibilité 30 % et
l'inversion X. À 416, la réponse visible inverse son sens alors que les ports
atteignent normalement −125 modulo 256 ; leur seul repli n'explique pas ce cas.
À 768, les pas sont ambigus modulo 256. Ce décodage signé est une convention de
diagnostic, pas une preuve de l'algorithme du programme. Ne pas modifier le gain.

Temporalité du cas 256 : consigne avant itération 1200 ; lectures sous le compteur
interne 1201 encore 0, sous 1202 valeur 188, sous 1203 valeur 179. Le compteur relevé
dans le handler est décalé de +1 par rapport à `iterationFrame`, conservé aussi.
Ne pas appeler ces étiquettes des cycles CPU ou une latence physique de trackpad.

26 nouveaux tests sans ROM sur le traceur/décodage, refus des versions/cartes/
signatures invalides, bornes, exceptions, erreurs d'observation et restauration.
Check 134 tests ; 16 tests Chrome dev et 3 tests du build. Preuves sans ROM/image :
`third_party/trackball-port-evidence.json`. Rapport `test-results/trackball-ports.json`
ignoré. Protocole et interprétation : `docs/TRACKBALL_PORTS.md`.

Cette comparaison a été réalisée ci-dessous. Le saut du niveau 1 demeure non corrigé.

## Comparaison de référence terminée le 9 novembre

MAME 0.271 ARM64 était déjà installé dans `/Applications/mame0271-arm64/mame` ;
ce n'est pas la dernière version. Archives originales validées, BIOS ttl forcé,
aucun téléchargement ou changement des ROMs. Lanceur conservé :

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame npm run measure:reference
```

Pas de serveur HTTP requis. 20 essais réels : amplitudes 0/64/256/416/768,
phases −1/0/1/2, processus neuf pour chaque cas, entrées crédit/Start contrôlées.
Rejeu des octets réels des quatre ports, second tap vérifiant les valeurs reçues,
64 lectures par tap et essai. Pas de changement de RAM/code du programme.
Rapports/configurations isolés dans test-results/reference ignoré ; NVRAM,
autosave et écriture de configuration désactivés.

Résultat décisif : avec le même décalage −1 sur les cinq cas, les déplacements
Web et natifs concordent à 0,063 pixel natif maximum par axe. L'inversion à 416
existe aussi dans la référence. Une comparaison naïve sans alignement présentait
une différence forte ; quatre phases conservées pour éviter cette fausse
conclusion. Aucun défaut propre à 2003-Plus démontré, aucun remplacement de cœur
ou correctif de commandes justifié par ce seul essai. Aucun saut réussi validé.

Fichiers : scripts/compare-reference.mjs, scripts/reference/replay.lua,
src/diagnostics/referenceReplay.ts et ses 19 tests. Preuves numériques sans
ROM/image/état : third_party/mame-reference-evidence.json. Protocole et limites :
docs/REFERENCE_COMPARISON.md. Le replay Web ponctuel 64/256/416 retrouve aussi
les mêmes centroïdes avec pending nul ; il reste un contrôle exploratoire.
Différences d'horloge vidéo et de minuteur : pas d'identité des états internes.

Prochaine action concrète : mesurer la forme temporelle d'un geste rapide réel,
puis comparer des profils de même déplacement total répartis sur plusieurs
itérations. Ne pas proposer de nouveau limiteur ou augmenter arbitrairement
le gain de Michel. Le saut niveau 1 et le freinage niveau 3 restent ouverts.

Validation de cette intervention : `npm run check` réussi, 153 tests/17 fichiers,
couverture 99,09 % instructions, 99,13 % branches, 100 % fonctions, 99,04 % lignes.
Chrome : 16 tests dev et 3 tests preview réussis. Les premières tentatives de
check ont seulement demandé le formatage des docs ; le premier lancement des
tests navigateur était bloqué par le sandbox HTTP, puis a réussi avec
l'autorisation d'exécution adaptée. Le prototype du lanceur a d'abord refusé
la fenêtre de lectures tronquée aux phases retardées ; arrêt repoussé à 1214,
puis les 20 essais complets ont réussi. Avertissement existant de taille de
chunk BabylonJS conservé. Aucun test de confort humain du saut réalisé.

## Geste temporel : livraison du 9 novembre

Le diagnostic suivant est implémenté et vérifié ; attendre maintenant les
**gestes physiques de Michel**, sans annoncer le saut corrigé.

1. Recharger la page complètement et lancer le jeu au gain habituel 1,70×.
2. Échap → Nouvel essai de mesure → Capturer. Faire un seul geste rapide,
   attendre environ une demi-seconde sans bouger, Échap → Copier les diagnostics.
3. Même procédure pour un geste moyen dans la même direction, essai neuf.

Le bloc motionTimeline est volontaire : premier geste accepté après armement,
128 lignes maximum, arrêt après silence 0,18 s et poll nul, ou premier callback
après deux secondes. Pause conserve le relevé, reprise/capture préserve un
armement sans mouvement. Gain modifié annule aussi l'armement : réarmer ensuite.
Les événements avant sampling interrompu restent dans unsampledEvents.
Chaque ligne : sommes d'événements avant/après gain et leurs bornes de temps,
frame interne et dernier poll natif. Ne pas sommer les derniers polls comme un
compteur exhaustif, ni appeler les timestamps des temps matériels du trackpad.
Aucun nouveau gain/filtre/limiteur/inertie, aucun stockage ou upload.

Banc conservé : npm run measure:profiles ; sous-ensemble -- --quick. 11 essais
complets (totaux 1536 et 416, durées variables), 6 contrôles avec région RGBA
fixe de 360000 pixels. Même départ, polls exacts, neutres immobiles, zéro erreur
JS. À 1536 total : ΔX final −53,12 en une fois, +105,71 avec 6×256, +95,79 avec
12×128 ; 4×384 reste négatif. Tous les contrôles répétés retrouvent les mêmes
images numériques ; 24 comparaisons du décor inchangées. L'étalement peut
changer le sens, mais aucune durée optimale universelle ou correction du joueur
n'est démontrée. Saut et freinage non validés. Images 1199/1206/1212/1224/1236.

Modules : input/motionTimeline.ts, diagnostics/impulseProfiles.ts,
diagnostics/staticRegion.ts, raccord emulation/emulatorjs.ts, aide UI et script
measure-impulses.mjs. 17 nouveaux tests purs sur trois fichiers, un nouveau
test navigateur du raccord sans ROM. Protocole : docs/MOTION_PROFILES.md.
Preuves numériques sans ROM/image/état : third_party/impulse-profile-evidence.json.
Les rapports test-results sont temporaires et Playwright peut les nettoyer.

Contrôle du vrai runtime après correction : trois événements souris automatisés,
3 samples non nuls sur 3 itérations, arrêt quiet, 14 lignes, aucune erreur JS.
Ce n'est pas un geste physique. La sonde temporaire initiale dans test-results a
été supprimée par Playwright et gênait lint ; exécution finale depuis /tmp,
réussie. Non-régression de durée ancienne lors d'un armement annulé reproduite,
fixée et testée. Serveur dev 5173 déjà actif réutilisé, tentative supplémentaire
refusée car port occupé, sans arrêter le serveur existant.

Validation finale : npm run check réussi, **170 tests / 20 fichiers** ; couverture
99,26 % instructions, 99,34 % branches, 100 % fonctions, 99,22 % lignes. Chrome :
17 tests dev, 3 preview réussis. Avertissement de chunk BabylonJS existant conservé.
Pas de Git initialisé, pas de nouvelle dépendance, de déploiement ou de ROM copiée.

Prochaine action concrète : analyser les deux motionTimeline réels de Michel,
comparer durée des événements, paquets et grands polls par itération, puis
choisir un correctif seulement si ces données le justifient.

## Blocage de démarrage corrigé le 9 novembre

Michel ne pouvait plus commencer une partie : disclaimer MAME absorbant les
commandes, puis boutons grisés après capture/Échap. Reproduction réelle faite.
Le cœur installé propose skip_disclaimer ; option définie dans le source figé
core_options.c et présente dans son WASM. defaultOptions active maintenant
mame2003-plus_skip_disclaimer=enabled ; skip_warnings non activé. Aucun binaire,
ROM, BIOS, gain ou contrôle physique modifié.

Crédit et Start restent accessibles après Échap. Un clic reprend explicitement
si nécessaire avant la pression ; si le cœur est actif, pas de nouvelle reprise
qui purgerait une pression en cours. Politique dans input/arcadeCommand.ts,
4 tests unitaires ; UI branchée et message de pause clarifié. Échap/perte de
focus/onglet masqué conservent pause/silence/purge, retour de focus toujours passif.
Un cinquième test nouveau vérifie l'option de config sans masquer les warnings.
Régression Chrome : capture → Échap → Crédit/Start, reprise avant pression,
Start directement depuis pause. Capturer n'est pas nécessaire pour démarrer.

Vrai jeu Chrome 157 headless, archives locales : mode attract sans mouvement
préalable, Crédit depuis pause puis Start lancent une partie observée (score 0,
temps 60), puis capture/Échap laisse les boutons accessibles. Crédit reprend
ensuite de frame 1112 à 1139, aucune erreur JS. Captures examinées dans /tmp,
preuve numérique third_party/startup-controls-evidence.json. Pas de preuve
nouvelle sur le confort humain, le son ou les sauts.

Recharger complètement la page. Attendre l'écran du jeu, Crédit → Start joueur 1
→ Capturer. Les gestes de diagnostic restent à faire séparément, avec Nouvel
essai après Échap. Le signal start du frontend n'est pas une détection du mode
attract ; ne pas prétendre qu'une commande pendant l'amorçage est acceptée.

Check : 175 tests / 21 fichiers, couverture 99,27 % instructions, 99,35 % branches,
100 % fonctions, 99,22 % lignes ; format/lint/types/build réussis. Chrome dev :
18 tests dev et 3 preview réussis. Avertissement habituel de chunk BabylonJS conservé.

## IMPORTANT : protocole de mesure simplifié après retour de Michel

Michel avait bien fait une accélération puis Échap et Copier. Ne pas lui demander
s'il a envoyé un geste moyen ou rapide : le défaut venait du relevé arrêté après
le premier petit mouvement. Son texte contenait 300 ms / 35 événements / pic L1
319 dans le segment, contre pic global X 916 hors segment. Ces lignes ne mesuraient
pas forcément l'accélération recherchée. Le relevé est corrigé maintenant.

Consigne unique après rechargement complet :
**Nouvel essai → Capturer → faire une accélération → Échap → Copier les diagnostics.**
Aucune pause à chronométrer, aucun geste moyen supplémentaire à classifier.
L'interface affiche état prêt/en cours/terminée. Les petits mouvements précédents
ne disqualifient plus la mesure.

motionTimeline observe jusqu'à Échap (ou interruption/gain modifié). Silence ou
limite ferme un segment puis continue. Conserver le meilleur segment et le
candidat, chacun limité à 128 lignes/deux secondes vérifiées aux callbacks.
Sélection par plus grand pic L1 des lots transmis intermédiaires ou dernier poll,
égalité au premier. selection expose critère, identifiant, pic et cause de fin.
Les autres segments ne sont pas exportés. Une annulation de deltas peut garder
un pic intermédiaire peakSentL1 ; les événements non encore pollés du segment
choisi restent séparés. Pas de modification des commandes ou gain, timer,
listener, stockage ou réseau ajouté. Ne pas appeler le critère une mesure
physique de l'accélération de bille ; un segment limité peut être tronqué.

Tests purs : petit geste puis plus fort puis faible, Échap avant poll, nombreux
segments et limites, annulation par événement opposé ; 4 nouveaux tests,
11 tests du module. Chrome sans ROM : capture et mêmes segments via raccord.
Vrai cœur avec archives locales et mouvements Chrome automatisés : pic initial
813, suivant 9900, second segment choisi, une ligne, statut terminé après Échap
immédiat, aucune erreur JS. Pas un trackpad physique. Preuve numérique sans ROM :
third_party/strongest-gesture-evidence.json. Détails : docs/MOTION_PROFILES.md.

Validation : npm run check réussi, **179 tests / 21 fichiers** ; couverture
99,29 % instructions, 99,39 % branches, 100 % fonctions, 99,24 % lignes.
Chrome dev 18 tests, preview 3 tests réussis. Avertissement de chunk existant.
Toujours pas de Git initialisé ni nouvelle dépendance ; ROMs inchangées.

Prochaine action : lire le prochain relevé automatique de l'accélération de
Michel, sans lui demander de qualifier lui-même le segment. Saut et freinage
restent ouverts, aucune correction du contrôle déduite de ce seul changement UX.

## Armement automatique à chaque capture — dernière correction

Le dernier relevé utilisateur contient pic X natif 1189 et saturated=0, mais
motionTimeline idle/gain 1/aucune ligne avec gain joueur 1,70×. Cela prouve que
l'observateur n'était pas armé, pas que la commande était appliquée à gain 1.
Ne pas reprocher un clic manquant ; le parcours ne doit plus dépendre du bouton.

Toute transition non capturé→capturé réussie appelle resetMetrics : statistiques
globales et natives remises à zéro, timeline armée au gain courant. Même helper
que Nouvel essai, qui reste facultatif. Une capture refusée ne déclenche pas
setCaptured(true), donc ne remet pas les mesures à zéro. Pause conserve le
relevé, reprise seule le garde, prochaine capture démarre un nouveau relevé.
Commandes/gain/physique non modifiés, purges existantes conservées.

Consigne utilisateur après rechargement complet :
**Capturer → faire une accélération → Échap → Copier les diagnostics.**
Aucun Nouvel essai requis ; sélection du mouvement le plus fort toujours active.
UI de capture et état prêt/en cours/terminée mis à jour, README/MOTION_PROFILES/
ARCHITECTURE décrivent ce comportement. Le test navigateur du raccord n'appelle
plus resetMetrics avant la capture, vérifie gain 1,70× puis une recapture à 2×
avec compteurs nuls et segment neuf. L'assertion d'ordre Crédit/Start filtre les
notifications pause redondantes de Pointer Lock ; aucune reprise automatique
ajoutée. Premier passage 17/18 dû à ces notifications, reprise 18/18 réussie.

Vrai runtime et archives locales, mouvements Chrome automatisés sans Nouvel
essai : premier pic 1958, suivant 16828, second segment choisi, une ligne et
statut complete/gain 1,7 après Échap, zéro erreur JS. Ce n'est pas un essai
physique de trackpad. Preuve numérique sans ROM/image/état :
third_party/auto-measure-evidence.json.

Validation : npm run check réussi, 179 tests/21 fichiers ; couverture 99,29 %
instructions, 99,39 % branches, 100 % fonctions, 99,24 % lignes ; format/lint/
types/build passent. Chrome dev 18 tests, preview 3 tests réussis. Le lancement
preview avait été empêché par un échec du contrôle automatique d'autorisation
(limite d'usage, pas refus de sécurité) ; relancé après la reprise utilisateur,
réussi. Avertissement habituel de chunk BabylonJS conservé. Aucun Git initialisé,
aucune dépendance nouvelle, aucune ROM ou préférence utilisateur modifiée.

Prochaine action : analyser le relevé suivant obtenu par la seule capture,
sans imposer une autre manipulation préalable. Saut et freinage encore ouverts.

## Profil réel désormais disponible — ne plus demander le même essai

Michel a fourni le nouveau relevé complet : gain 1,70×, status complete,
reason interrupted, 95 lignes, 96 événements non nuls / 1,391 seconde, 52 samples
natifs non nuls sur une étendue de 85 itérations. Les 95 lignes ont sentX/Y
strictement égaux à polledX/Y ; sommes −5737/+6257, saturated=0, aucun événement
non échantillonné. Pic natif L1 1182 à (−608,+574), autres pics 1151 et 1054.
Cela valide l'observation du raccord pour cet essai, pas tous les polls ou la
vitesse/physique interne de la bille. Le profil est utilisable : aucune nouvelle
manipulation préalable à réclamer à Michel.

Investigation réelle effectuée depuis /tmp, sondes dérivées des bancs existants,
aucun changement de code applicatif :

- Web Chrome 157, natif X/Y du relevé rejoué avant 1200..1294, gain non réappliqué,
  runtimes neufs, Crédit/Start fixes, neutre/profil/neutre. Polls reçus exactement,
  départs identiques, neutres immobiles, zéro erreur JS.
- Trace réelle du handler avec SHA/carte/signature préservés, fenêtre1198..1319 :
  488 lectures par essai, aucune perte/erreur. Autour du grand pic, le port 0 passe
  212→27→190. L'écart modulo 256 est ambigu, pas une preuve du code interne.
- MAME 0.271 existant, BIOS ttl, deux cas neutre/profil, deux taps indépendants
  contrôlant chacun 488 lectures ; même phase fixe −1 calibrée avant ce relevé.
  Après la fenêtre, maintenir la dernière valeur de compteur, pas un retour
  artificiel à zéro. Sept mesures optiques concordent avec le Web à moins de
  0,158 pixel natif par axe. Pas de différence spécifique au cœur Web démontrée.

Le rejeu est par itération, pas reproduction des timestamps macOS ni de toute
la partie humaine. Le suivi est écran, pas coordonnées physiques. Le marqueur
entre dans la région témoin du décor pendant ce déplacement : ne pas prétendre
qu'elle est restée statique ou que la caméra a bougé à partir de ces seuls pixels.
Aucun saut réussi vérifié et aucun correctif de commande justifié pour l'instant.

Preuve numérique et profil complet sans ROM/image/état :
third_party/captured-motion-evidence.json. Méthode : docs/CAPTURED_MOTION.md.
Les prototypes de rejeu étaient hors dépôt dans /tmp ; les scripts permanents
n'ont pas été modifiés. La forme numérique suffit pour de prochains essais
contrôlés à partir de scripts/measure-impulses.mjs et du traceur existant.

Check de cette intervention : npm run check réussi, 179 tests/21 fichiers,
99,29 % instructions, 99,39 % branches, 100 % fonctions, 99,24 % lignes ; format,
lint, types et build passent. Tests navigateur permanents dev/preview non
relancés, aucun code UI modifié ; les cinq essais réels décrits ci-dessus ont
été exécutés. Avertissement habituel BabylonJS conservé. Aucun gain modifié,
ROM téléchargée/copiée, nouvelle dépendance ou dépôt Git initialisé.

Prochaine action concrète : comparer les amplitudes/calibrations de ce même
profil conservé dans une scène de départ contrôlée, sans recontacter Michel
pour refaire la capture. Ne pas réintroduire le limiteur 416 rejeté, une inertie
ou un turbo ; documenter un effet réel avant de proposer une correction.

## Historique — calibration 0,50× rejetée depuis par Michel

Cette section décrit la livraison précédente ; appliquer l’état actuel en tête
de fichier. Le bouton et la recommandation 0,50× ne sont plus disponibles.

Commande permanente npm run measure:calibration ajoutée au banc existant,
avec --phase-check et --refine ; serveur dev/ZIP locaux requis. Module pur
src/diagnostics/captureCalibration.ts : validation numérique, profil X/Y, mise
à l'échelle des préfixes avec erreur <1 count/axe, refus des dépassements int16,
fenêtre de huit itérations autour du pic (indices 62..69) et plans de contrôle.
20 tests unitaires nouveaux, sans ROM. Pas d'import de ce module dans l'app.

25 essais réels Chrome 157 : 12 complets/coups aux gains équivalents
0,425/0,85/1,275/1,70/2,125 ; 5 de phase (entrée/observations décalées de +1) ;
8 affinés sur 0,40/0,45/0,50 aux deux phases. Polls conformes, départs comparables,
neutres immobiles, aucun pixel témoin modifié sur40000 pixels par image, aucune
erreur JS/trace perdue/erreur d'observation. 1,70× complet identique au rejeu
précédent. Contrôle du mode historique ports quick : neutre/256/neutre, 64
lectures par cas, succès. Aucun profil redistribué dans le temps.

0,85× paraissait bon dans la première phase mais devient presque nul avec +1
itération : ne pas le recommander sur son seul résultat favorable. Les gains
affinés restent dans la direction attendue aux deux timings, 0,50× a la réponse
la plus importante dans ce groupe. À36 itérations : 0,50× donne (−9,141,+2,788)
puis (−12,115,+4,804) pixels natifs ; 1,70× donne (+2,985,−3,136) puis
(−5,061,+0,889). Ce sont des positions optiques, pas une preuve de vitesse,
physique interne ou saut réussi. Les centièmes ne sont pas une précision physique.
0,50× complet n'a pas été rejoué dans cette matrice ; choix sur coup isolé et
régularité de direction, pas un optimum universel ni un confort certifié.

Bouton « Essayer 0,50× pour les accélérations » ajouté dans les commandes.
Même setter que le curseur/reset : seule une action explicite change/mémorise
le gain. Aucun changement avant clic, défaut toujours 1×, reset toujours 1×,
aucune reprise depuis pause. Retour à 1,70× au curseur. Gain purement linéaire,
pas de limiteur 416, inertie ou turbo. Une constante candidate dans relativeMotion,
un test supplémentaire vérifie de grands deltas linéaires. Capture automatique
de la mesure conservée, nouveau candidat enregistré après clic puis capture.

Chrome : nouveau test du bouton sans reprise, persistance et retour à 1,70×.
Vrai runtime : 1,70× confirmé avant clic, 0,50× confirmé après, capture/Échap
conserve le bon gain, zéro erreur JS. Mouvements automatisés, pas trackpad physique.

Documentation : docs/CALIBRATION.md, README, ARCHITECTURE, DECISIONS, VALIDATION.
Preuves numériques/profils/ports sans ROM, image ou état :
third_party/capture-calibration-evidence.json. Rapports test-results temporaires,
nettoyés par Playwright ; preuves sauvegardées avant les tests navigateur.

Validation finale : npm run check réussi, **200 tests / 22 fichiers**, couverture
99,39 % instructions, 99,46 % branches, 100 % fonctions, 99,35 % lignes.
Chrome dev 19 tests, preview 3 tests réussis. Avertissement habituel de chunk
BabylonJS conservé. Pas de nouvelle dépendance ou déploiement ; pas de Git
initialisé. ROMs et préférences utilisateur réelles inchangées par les bancs.

Prochaine action : Michel peut recharger, lancer une partie, Échap, cliquer sur
le bouton d'essai puis Capturer et jouer normalement. Demander seulement le
ressenti sur les accélérations/saut et les petits gestes, pas de nouvelle
capture identique à qualifier. Gain candidat à confirmer humainement ; freinage
niveau 3 et recette de session/endurance restent ouverts.
