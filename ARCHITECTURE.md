# Marble Madness Web — Architecture

## Palette native partagée des quatre premières courses

`emulation/terrainPalette` (anciennement `level4Palette`) vérifie la carte
mémoire du cœur épinglé et lit 64 mots de RAM terrain et 16 mots de la banque de sprites des vagues. `practicePose`
les expose sur les quatre niveaux ; l'adaptateur réutilise le tableau
inchangé et le rendu n'actualise les uniforms que lors d'un changement.
`TerrainPalettePaint` possède les couleurs et leur liaison au matériau,
sans observer, texture supplémentaire ou lecture GPU. Les matériaux et
plugins sont détruits avec la scène.

`ArcadeTerrainPaint` choisit les teintes natives pour les niveaux 1 à 3 :
sols éclairés selon leurs normales et le soleil, murs par orientation,
motifs de tours du niveau 3, seconde banque verte et atlas cyan de glace.
Le grain et les motifs existants sont conservés ; le shader évite le
suréclairage ajouté par les anciennes couleurs de sommets. La glace a
un éclairage déjà décrit dans l'atlas et n'ajoute plus de reflet blanc.
Les indices 0–63 du relevé correspondent au playfield ; 64–79 correspondent
aux couleurs de motion objects 80–95. La lecture reste bornée à ces deux
zones de RAM graphique. `IntermediatePipePaint` sélectionne les violets de
la banque 3 ; les vagues utilisent le vert plat du playfield 63 et les
teintes de crête de la banque de sprites. Les normales des vagues pointent
vers le haut, leur amplitude reste celle du profil arcade, et leurs surfaces
ne reçoivent pas d'ombres. Les valeurs inchangées ne réécrivent pas les buffers.
Les deux niches du niveau 2 ont sept cases de largeur et trois de profondeur.
Les deux tablettes restent entièrement derrière le plan de façade.
`refineIntermediatePipe` subdivise la surface fermée du Y en conservant les
lèvres et les limites de matériaux, puis `fitIntermediatePipeHoods` applique
une déformation continue sans découpe ni aplatissement de peaux distinctes.
Le fichier extrait et le J séparé sont conservés. Les normales sont recalculées
sur les sommets coïncidents pour lisser intérieur, extérieur et raccords.
Les copies et buffers restent possédés par les meshes de la scène ; aucune
mise à jour par frame ni lecture GPU supplémentaire. L'audit local
`node scripts/audit-intermediate-pipe.mjs` vérifie les arêtes et triangles du Y
et recherche les croisements non coplanaires entre faces non voisines.
`practiceDisplayTerrain` corrige aussi les trois coins SW du dallage devant
la tour centrale qui reprennent son profil de collision ; le terrain visible
reste plan à cet endroit, sans changer les données de collision du cœur.
Les aspirateurs du niveau 4 sont procéduraux : un ruban coudé à 90 degrés,
parenté au support, raccorde la tige à la tête. Seule cette dernière reçoit
le tremblement natif ; le raccord s'enfonce dans son dos pour éviter un jour.
Le matériau des parois du niveau 1 inclut explicitement l'alpha de la texture
dans le test alpha final de BabylonJS, y compris avec les couleurs de sommets.

`Level4PalettePaint` partage la liaison des uniforms tout en gardant les
swatches et le masque de paroi spécifiques au niveau 4.

## Reconstitution des sols des couloirs du niveau 3

Dans le labyrinthe initial, `level3DisplayTerrain` corrige les échantillons
SW pris sur le plateau à 16384 quand les trois autres coins appartiennent
au couloir inférieur et définissent un plan cohérent. La correction locale
précède la génération de `terrainMesh` et `terrainCliffs` : elle supprime
les fausses rampes et permet des parois verticales raccordées au vrai sol.
Elle ne modifie ni la simulation ni les données sources et conserve les
pentes progressives et les rampes définies séparément.

## Tuyau du niveau 3 et aspirateurs procéduraux

`widenLevel3Pipe` prépare une copie des positions/normales du conduit importé,
avec diamètre augmenté uniquement sur la partie verticale et transitions aux
extrémités. `createLevel3Pipe` partage cette copie entre coque et intérieur.
`level3DisplayTerrain` place les trois rangées de dallage sur Z=76..78 et
l'ouverture sur Z=79..82. `createLevel3Pipe` translate coque et doublure d'une
case sur +Z ; leur rive Z=83 rejoint la plateforme existante. Le bord de la
grande plateforme comprend ainsi sept cases avant ce bloc.

`createLevel4Vacuums` possède les six mécanismes procéduraux et leurs matériaux
partagés, nettoyés avec la scène. `readLevel4VacuumMouthFrames` transmet les
deux images natives actives via `PracticePose.vacuumMouthFrames` et
`setLevel4VacuumExtensions`. Le setter déforme la tête et sa cible de fragments,
sans bouger le conduit et sans observer ou horloge supplémentaire. La descente
et le reset rétablissent la pose neutre. `public/assets/README.md` recense les
modèles Rolling Madness réellement sélectionnés et ceux seulement disponibles.

## Ajustement local de l'axe de catapulte

`fitCatapultAxle` prépare une copie des poses importées pour
`createRollingCatapult`. Les sommets des extrémités de l'axe sont identifiés
sur la pose de repos et ajustés dans toutes les poses. Le modèle source,
la coupelle, le bras et la synchronisation arcade restent inchangés.
Les copies sont possédées par le rendu de la scène, sans nouvelle ressource GPU.

## Finitions des mécanismes et murs du niveau 4

`level4Hammers` lit le pointeur de dernière image émise (+0x42), distinct du
pointeur d'interprétation suivant (+0x3e). Sa table d'ordinaux des sprites
préserve les répétitions natives pour les deux représentations des marteaux.
`level4CliffColors` encode par face les murs bas entièrement jaunes ;
`Level4CliffPaint` conserve la frise des murs élevés et le traitement lumineux
des faces internes des deux paires d'arches. Ces dernières reçoivent et projettent
les ombres du soleil existant. `createCatapultMasonry` possède un matériau
supplémentaire gris sans texture, partagé par les six dessus et libéré avec
la scène. Aucun observer ni nouvelle carte d'ombre n'est ajouté.

## Palette arcade du niveau 4

`emulation/terrainPalette` lit 64 mots de palette terrain et 16 mots de palette des vagues depuis la RAM
B00400 du cœur figé, après vérification des tables et des bornes mémoire.
`practicePose` les publie ; l'adaptateur conserve le dernier tableau et
réutilise son identité s'il ne change pas. `createLivePracticeView` transmet
les changements à `level4PalettePaint`. Les uniforms de murs et pistes sont
mis à jour sans nouvelle ressource ni lecture GPU. Le repli de l'étude est
mesuré dans le même checkpoint. La palette du PNG complet est différente :
ce fichier reste une référence d'architecture, pas la vérité colorimétrique.

`Level4CliffPaint` garde les zones de peinture par hauteur, les joints gris,
et le mélange clair/ombre via `key`. Le grand mur extérieur X=90, Z=72..90
possède en complément une limite d'ombre issue des tuiles originales,
fixée dans les coordonnées du mur, car aucun obstacle géométrique ne masque
le soleil sur cette façade. Ce masque local se combine aux ombres 3D,
sans nouveau projecteur et sans toucher aux montants d'arches.
`Level4GoldPaint` change aussi la teinte des pistes selon leur orientation
(brun, beige, rose), puis applique le grain et l'ombre existante.
Les matériaux restent possédés par la scène. Aucune simulation ne dépend
de la palette ou des shaders.

## Éclairage et raccords locaux du niveau 4

`level4LandingNormals` prépare les normales par dalle du palier, sans changer
la géométrie des autres zones. `level4DisplayTerrain` donne au raccord de
pente une arête commune avec la partie plate.

Le matériau des falaises éclaire les deux faces visibles. Le premier secteur
ne reçoit pas de frise jaune. Une correction de palette localisée garde la
façade de gauche uniforme, sans fausse auto-ombre au raccord du tremplin.
Les parois profondes du croisement reçoivent la carte complète du soleil
`key`, avec les grandes falaises et les tremplins comme projecteurs.
Il n'y a plus de lumière ni de carte d'ombre dédiée au croisement. Les
ressources de scène et le calendrier arcade restent inchangés.

## Raccords et contours du niveau 4

`createLevel4ArchBridge` construit des profils sinusoïdaux de trois cases,
relevés séparément pour les deux paires. Les profondeurs sous la rive sont
9/15 unités arcade (sommet/extrémités) pour la première paire et 10/16 pour
la seconde ; les rives horizontales sont peintes en gris.
Il construit les dessus horizontaux du second passage
à 16272. `level4DisplayTerrain` raccorde les deux cases centrales à 16260,
les deux pentes latérales et le grand plan incliné adjacent. La peinture du
passage utilise une frontière rouge/jaune locale constante.
`openLevel4Bridge` conserve les parois terminales des berges X=87/90, qui
reçoivent l'ombre courbe des montants. `splitLevel4LandingWalls` répartit les
faces entre falaises et palier en conservant les quatre sommets de chaque quad
pour la peinture. Les deux meshes projettent et reçoivent la carte globale.
`createLevel4RampEndJoints` possède le mesh et le matériau de mortier des
cubes terminaux suspendus. Ils sont détruits avec la scène ; aucun nouvel
observer ou chargement n'est ajouté.

## Présentation du niveau 4 — 21 novembre 2026

Les rampes dorées ont des bandeaux et des sous-faces sans support plein.
Les deux sous-faces partagent le croisement sans superposition. Le pont
orienté sur X inverse ses indices pour garder ses normales vers l'extérieur ;
le palier voisin conserve ses deux biseaux. Le niveau 4 utilise le filtrage
PCF de sa carte d'ombre pour atténuer les artefacts des grandes parois.

`level4Hammers` convertit les coordonnées entières RAM en cases (division par
huit). `createRollingHammers` ne possède aucune horloge d'animation live :
les images natives pilotent les poses importées, et une réinitialisation les
masque. Le secours procédural suit le même flux en mode jeu. Les aperçus de
la page d'étude restent distincts de ce fonctionnement natif.

## Présentation des falaises et du pont du niveau 4

`createLevel4ArchBridge` retire les faces du relevé sous les deux
longs côtés du pont et construit les deux arcs. `level4CliffPaint`
fournit la coloration des falaises par fragment selon la hauteur.
Les capuchons de cylindres appartiennent à la scène. La catapulte
importée possède une lumière limitée à ses meshes et une carte
d’ombre locale possédée par la scène.

## Support maçonné de catapulte

`createCatapultMasonry` construit le couronnement en U et ses parois
profondes avec les matériaux de piste et de falaise de la scène.
Les joints sont alignés dans le repère monde. La scène possède les
maillages et le générateur d’ombres les réutilise.

## Catapulte importée

`createRollingCatapult` réutilise `createRollingActor` pour les deux
maillages de catapulte de la bibliothèque locale. Il remplace le pilote
de poses de la scène et masque les pièces mobiles procédurales. La
bibliothèque est transmise à la scène live et chargée localement dans
la page d’étude. La scène possède les géométries, matériaux et textures.

## Cylindres du niveau 4

`emulation/level4Pistons` lit les seuls slots à l’état levé dans la table
native du niveau 4. `practicePose` transmet leur position et leur pas
d’animation. La scène live possède 36 maillages réutilisables et applique
chaque pose aux slots visibles. Le cœur reste responsable des compteurs,
des zones et des rebonds.

## Effets natifs du niveau 4

`practicePose` transmet la progression de l’aspiration par joueur et le
pointeur de tir converti en numéro de pose. La vue live masque la bille
pendant sa fragmentation et pilote la catapulte sans horloge de rendu.
Les fragments sont alloués à la création de la scène. Le cœur conserve
le déclenchement, l’impulsion et la reconstruction.

## Aspirateurs du niveau 4

Le lecteur `emulation/level4Vacuums` lit les pointeurs d’image des objets du
cœur épinglé. `practicePose` transmet les taux de déploiement du niveau 4 et
`createLivePracticeView` les applique aux six mécanismes procéduraux de la
scène. Les maillages appartiennent à la scène. Leur hauteur dépend de la
pose native en jeu. La scène d’étude les présente déployés. La restauration
d’un point de reprise confirme le niveau demandé avant de rendre la main à
l’interface.

`createMarbleMaterial` possède les peintures par joueur (six anneaux de 8 points
jaunes projetés sans distorsion sphérique), partagées entre la bille normale et
ses morphs. `practicePose` lit les pointeurs natifs de casse/balai (`0x72`, `0x7a`,
`0x7f`), les 7 paliers natifs du pont d'Intermediate Race (`0x772`/`0x774`), les
événements natifs de magie/récompenses, et maintient la vue 3D pendant `mode === 4`
(Out of Time / Game Over) avec lecture des bandeaux alpha-RAM dans `practiceHud`.
`createIntermediateBridge` expose un pilotage live (`setIntermediateBridgeStep`)
distinct de la boucle d'étude, et `createTerrainStudy` installe une lumière
directionnelle statique dédiée (`intermediate-pipe-wall-light`, `REFRESHRATE_RENDER_ONCE`)
pour projeter les ombres des tuyaux sur `terrain-cliffs`.

`createCameraOcclusion` installe un plugin de matériau sur les murs/tours/rebords.
Les fragments proches du segment caméra–bille sont rendus traversables visuellement
par tramage à seuil, en excluant le sol au pied de la bille (`mmAboveFoot`/`mmClearFoot`).
Le cadrage `chase` est réservé au mode 1 joueur (`resolvePracticeCamera` /
`practiceCameraControls`). Le balayage d'ouverture (`createLivePracticeCamera`)
parcourt linéairement le niveau de la fin vers le départ sans retour en arrière.
`practiceChannelTerrain` coupe les coins extérieurs sur les diagonales limites
`±21` du relevé complet, et `createPracticeGoal` cadre les 4 lignes de la rigole
de Practice Race tout en conservant le format compact pour Intermediate Race.

Les vers sont des meshes articulés possédés par la scène (`createWorm.ts`).
Le calcul des appuis, de la courbure et des phases de repas est pur et testable
sans GPU (`game/modern/wormPose.ts`), piloté par les scripts natifs lus dans
`intermediateActors.ts`. `readModernPhase` distingue introductions de niveau
et écrans arcade : `createVideoView` garde la 3D uniquement dans les premières,
et restitue la vidéo originale pour résultats/game over. `playControls` possède
la recapture par clic sur les canvas, avec le même chemin de contrôle que le
bouton Capturer et le même nettoyage.

Le raccord des balayages appartient à `rendering/createLivePracticeCamera.ts`.
Il utilise la progression native de Practice, ou 180 frames du compteur du cœur
pour une nouvelle scène/reprise F2, et interpole également la projection vers
la caméra de jeu. `createVideoView` prépare le terrain préféré avant une pose
valide et conserve sa présentation entre les phases natives. Le lecteur
`practicePose` accepte l'introduction native du niveau 2 après initialisation
du joueur. Ces modules ne font pas avancer le cœur. F2 conserve son point de
reprise jouable ; le balayage n'arrête pas le chrono et C l'interrompt.

La section Prototype 03 décrit les ajouts actuels. Les sections précédentes
conservent les choix et les preuves des incréments antérieurs.

Prototype du jeu arcade original dans le navigateur, en TypeScript/Vite,
avec **EmulatorJS 4.2.3 + MAME 2003-Plus** et sa vidéo sur un plan BabylonJS.
Une seule session fournit les vues directe, comparée et 3D. Crédit, Start,
trackpad relatif, pause/reprise, volume et diagnostics sont disponibles.

Michel a joué au trackpad et confirmé la correction du clignotement dans la vue
BabylonJS. Le dernier gain essayé est **1,70×** ; le freinage en fin du niveau 3
reste un point ouvert. Les impulsions de boost et le saut vers les plateformes
latérales du niveau 1 ne sont pas validés. L'endurance de 10 minutes et l'écoute audio complète
restent à confirmer. Le [bilan de livraison](docs/RELEASE.md) sépare validations
acquises et limites ; les preuves détaillées restent dans
[docs/VALIDATION.md](docs/VALIDATION.md).

## Installation et démarrage

Node.js **24 ou supérieur**, npm. Sur le Mac de référence, utiliser Chrome avec WebGL2.

```sh
npm ci
npm run setup:emulator
npm run dev
```

La préparation télécharge uniquement les fichiers d'émulation versionnés, vérifie
leurs SHA-256 et copie leurs notices dans `public/vendor/`. Elle ne télécharge
aucune ROM. Les fichiers déjà présents et corrects sont réutilisés. L'application
utilise ensuite les ressources locales, sans CDN au lancement du jeu.

Vite fournit le serveur HTTP : ouvrir `http://127.0.0.1:5173/` dans Chrome.
Pour les lancements suivants, `npm run dev` suffit depuis le dossier du projet.
Garder ce terminal ouvert ; Ctrl+C arrête le serveur. Ne pas ouvrir `index.html`
directement avec `file://`.

Pour précharger les archives de test, placer `marble.zip` et, si nécessaire,
`atarisy1.zip` dans le dossier `roms/` à la racine du projet, puis recharger la
page. Elle affiche les archives préchargées ; aucun sélecteur n'est nécessaire.
Ce mécanisme est réservé à `npm run dev`, sur cette machine : `roms/` est ignoré
par Git et absent du build. `npm run preview` conserve la sélection manuelle.

## Premier essai sur le Mac de Michel

1. Si les archives ne sont pas déjà préchargées depuis `roms/`, choisir **marble.zip** dans le champ **Jeu**. Si le BIOS est séparé, choisir
   également **atarisy1.zip** dans le champ **BIOS facultatif**. Les 30 dumps du
   set parent `marble` sont recherchés à la racine des deux ZIP ; les fichiers des
   clones présents dans des sous-dossiers sont ignorés.
2. Cliquer sur **Vérifier et préparer** : les tailles et SHA-1 des données
   décompressées sont vérifiés localement. Les noms seuls ne suffisent pas.
3. Cliquer sur **Démarrer l'émulation**, puis attendre l'écran du jeu après les
   messages de démarrage de MAME (quelques secondes). L’écran de disclaimer
   est passé par l’option du cœur ; aucun mouvement de trackpad n’est nécessaire.
4. Cliquer sur **Crédit**, puis **Start joueur 1**. Après le compte à rebours de la
   course, cliquer sur **Capturer le trackpad**. Déplacer un doigt, sans maintenir
   de clic. Le pointeur devient invisible et les gestes contrôlent la bille.
5. **Échap**, perte de focus ou onglet masqué : pause, son suspendu et entrées
   vidées. **Reprendre / activer le son** relance explicitement l'émulation et
   l'audio ; **Capturer le trackpad** reprend aussi et recapture sur votre clic.
   Le retour dans l'onglet ne reprend jamais automatiquement.
6. Si nécessaire, ajuster **Sensibilité X/Y** après Échap, puis recapturer.
   Gain commun 0,25–4×, défaut 1× : réglage expérimental, pas une valeur de fidélité.
   Le bouton de réinitialisation remet 1×. Volume réglable, 0 % pour couper le son.
   Seuls gain et volume sont mémorisés localement.
7. **Nouvelle session** recharge entièrement la page et recharge les archives de `roms/`
   en développement (sinon, les sélectionner à nouveau) ;
   une confirmation apparaît si l'émulation a déjà démarré.

Les dumps système `136032.205`, `136032.206` et `136032.107` peuvent être dans
le jeu ou le BIOS séparé. Les noms Atari `136032.205.l13`, `136032.206.l12`,
`136032.107.b2` et l'équivalent `136032.104.f5` sont reconnus uniquement si leurs
tailles et SHA-1 correspondent. L'application assemble les seuls 30 fichiers
validés sous les noms MAME dans un ZIP mémoire ; les originaux restent inchangés.
La liste exacte des noms, tailles, CRC et SHA-1 est dans
[src/emulation/marble-roms.json](src/emulation/marble-roms.json), et les noms sont
consultables dans l'interface. Limite du banc : 16 Mio par archive.

Aucun upload ni stockage persistant des ROMs, BIOS ou sauvegardes. Les archives sont lues et assemblées uniquement en mémoire. Les préférences natives du frontend sont désactivées ; seuls nos réglages de
gain et de volume sont conservés sous les clés `marble.gain` et `marble.volume`.
Ne pas placer les archives dans `public/` : utiliser `roms/` pour le test local
ou les sélecteurs de fichiers. Le serveur ne reçoit aucun upload.
Une erreur d'archive permet un nouvel essai ; une erreur de runtime nécessite une
nouvelle session. Si les ressources manquent, relancer `npm run setup:emulator`.

Pour le premier essai, vérifier surtout les petits gestes, les diagonales et le
repositionnement du doigt. Aucun lissage, accélération supplémentaire, inertie ou
rotation de 45° n'est ajouté. La physique reste celle du programme arcade. La
molette et les événements tactiles ne commandent pas la bille. Le comportement
standard du navigateur est utilisé ; le mode non accéléré n'est pas activé.

Pour le réglage du trackpad, Michel trouve **1,80× assez confortable**, avec une
difficulté sur les fortes accélérations : il précise que les gestes rapides
semblent plafonner. Ce point reste en investigation.
Les diagnostics affichent les pics de commande `peakRaw` (avant gain), `peakSent`
(après gain) et `peakPending` (avant consommation native), ainsi que `saturated`
(nombre d'écrêtages du raccord). Comparer quelques gestes doux puis rapides au
même gain. Les pics restent disponibles après Échap ; ils ne mesurent pas la
vitesse de la bille et ne prouvent pas à eux seuls une limite du programme arcade.

Pour relever un essai exploitable :

1. Garder le gain habituel (actuellement 1,70×).
2. Cliquer **Capturer**, faire une accélération, puis **Échap**.
3. Cliquer **Copier les diagnostics** et coller le texte dans la discussion.

L'essai de protection à 416 a été **retiré** : Michel n'a constaté aucune
amélioration du saut. Les commandes restent linéaires au gain choisi, sans
limiteur supplémentaire ni inertie ajoutée. Les impulsions/sauts ne sont pas
encore validés comme fidèles au jeu original.

Un [banc de réponse aux impulsions](docs/INPUT_RESPONSE.md) mesure maintenant
la bille à l'image après des démarrages identiques. Il s'exécute volontairement,
avec les archives locales et le serveur de développement déjà lancé :

```sh
npm run measure:impulses -- --quick
# Série complète (environ 4 minutes) :
npm run measure:impulses
```

Pour comparer un même total sur plusieurs durées : `npm run measure:profiles`
(environ 4 minutes), ou `npm run measure:profiles -- --quick` (environ 2 minutes).
Le [protocole des gestes et profils](docs/MOTION_PROFILES.md) décrit les résultats
et le relevé humain suivant. **Capturer → une accélération → Échap → Copier les diagnostics**.
Chaque nouvelle capture démarre automatiquement la mesure et remet ses compteurs
à zéro. « Nouvel essai » reste un raccourci facultatif de remise à zéro. Inutile de chronométrer ou de qualifier le geste :
le relevé conserve automatiquement le mouvement au plus grand pic de commande,
même si un petit mouvement l'a précédé. Le bloc `motionTimeline` est local,
borné, inclus dans la copie et conservé après Échap.

Le [banc de calibration du geste enregistré](docs/CALIBRATION.md) compare les gains
sans modifier les préférences du joueur :

```sh
npm run measure:calibration
npm run measure:calibration -- --phase-check
npm run measure:calibration -- --refine
```

Il rejoue le profil complet puis un coup isolé, vérifie les polls et les vrais
ports, et contrôle un décalage d'une itération avant de retenir un candidat.
Les gains sont des consignes de diagnostic ; aucun réglage n'est changé au lancement.

Pour observer également les [lectures effectives des ports trackball](docs/TRACKBALL_PORTS.md) :

```sh
npm run measure:ports -- --quick
```

La [comparaison avec MAME 0.271 natif](docs/REFERENCE_COMPARISON.md) se lance
séparément, avec un exécutable déjà installé et les mêmes archives locales :

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame npm run measure:reference
```

Elle ne nécessite pas de serveur HTTP et ne change pas le cœur de la page Web.
Les mesures concordent après alignement de phase ; le saut reste non résolu.

Le traceur vérifie le binaire et sa carte de lecture, conserve les vrais arguments
et retours du handler, puis le restaure. Le rapport va dans
`test-results/trackball-ports.json` ; cet outil ne tourne ni dans le jeu normal
ni en CI. Le saut n'est toujours pas déclaré corrigé.

Les rapports numériques vont dans `test-results/impulse-response.json` (ignoré
par Git). Aucun instantané du jeu ou image n'y est conservé. Le banc injecte des
deltas natifs de diagnostic sans utiliser le trackpad ni le gain : ce n'est pas
un contrôle de jeu accessible au joueur. Il ne valide pas un saut réussi.

Le bloc `nativeSampling` conserve le dernier poll natif échantillonné après
chaque itération de l'émulateur : extrema signés `minX/maxX/minY/maxY`, derniers
mouvements non nuls et inversions `reversalsX/Y`. Les zéros ne créent pas
artificiellement d'inversion. Une pause rompt la séquence de signes sans effacer
les statistiques. Ce ne sont ni des compteurs exhaustifs de polls ni des mesures
de freinage de la bille ; plusieurs polls dans une itération peuvent échapper à
l'observation et une valeur peut rester identique entre deux échantillons.

Michel signale une difficulté de freinage dans la forte pente en sortie des
vagues, en fin de niveau 3. Pour l'essai suivant, garder le même gain et comparer
un essai de gestes moyens puis un essai de gestes rapides opposés, en remettant
les mesures à zéro entre les deux et en copiant chaque résultat après Échap.
Noter le ressenti de freinage et le gain ; ne pas changer la physique originale.

La remise à zéro concerne seulement les statistiques, sans changer le contrôle,
les fractions ou la partie. La copie est locale, sans upload ; si elle est
refusée par le navigateur, sélectionner le texte des diagnostics manuellement.

Si le son manque, vérifier le volume puis cliquer sur **Reprendre / activer le son**
après le lancement du cœur. Les diagnostics indiquent `audioState` et `audioRms` :
un niveau nul à un instant peut correspondre à un silence normal. Une mesure de
signal ne remplace pas l'écoute. Le signal `start` du frontend seul ne prouve pas
le lancement du programme arcade.

Après démarrage, le sélecteur **Affichage de la même session** propose :

- **Vue directe** : affichage EmulatorJS, sans copies BabylonJS.
- **Comparer les deux vues** : vidéo directe et plan 3D côte à côte.
- **Plan BabylonJS seul** : source masquée, même émulateur et mêmes commandes.

La caméra est fixe et n'intercepte aucune entrée. La copie ne remplace l'image
que lorsqu'un dessin effectif du cœur a eu lieu ; les itérations sans image
conservent la dernière texture. Un filtrage bilinéaire limite le scintillement
des arêtes pendant le scroll quand la vidéo est affichée à une taille fractionnaire. Crédit, Start, capture, gain,
volume et Échap fonctionnent dans les trois modes. Aucun nouveau chargement de
ROM ni seconde chaîne audio lors d'un changement de vue. Le changement de vue
ne reprend pas une partie en pause. En cas d'échec GPU, la vue directe reste
accessible. Après Échap, changer de vue puis recapturer pour reprendre.

`videoGeometry` indique dimensions natives et aspect annoncés par le cœur ;
`videoView` indique dimensions du canvas copié, nombre de copies et coût CPU
moyen/maximal de soumission copie+rendu. Ce ne sont ni des temps GPU complets,
ni une preuve de vitesse normale d'émulation. Le canvas inclut les éventuelles
bandes noires du frontend ; sa résolution peut différer du framebuffer natif.

La [scène technique indépendante](http://127.0.0.1:5173/scene.html) reste une
ancienne démo statique. Le sélecteur de la page principale donne accès à la
vidéo réelle. Le confort du freinage, l'endurance et les écrans 120 Hz restent
à valider sur le matériel de Michel.

## Vérifications

```sh
npm run check
npm run test:browser
npm run test:preview
```

Pour les tests navigateur, installer Chromium une fois :

```sh
npx playwright install chromium
```

Sur le Mac avec Chrome déjà installé, on peut utiliser :

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

Les tests n'utilisent **que des données synthétiques sans ROM**. Le test de runtime
contourne le validateur uniquement dans le contexte de test, pour vérifier le
chargement du vrai cœur, la reconnaissance de `marble` et l'échec attendu faute
de dumps. Les tests UI de commandes utilisent un adaptateur de test sans ROM ;
les essais avec les archives utilisateur restent ponctuels et documentés. Il ne valide pas une partie jouable. Résultats et limites :
[docs/VALIDATION.md](docs/VALIDATION.md).

| Commande                            | Usage                                           |
| ----------------------------------- | ----------------------------------------------- |
| `npm run setup:emulator`            | Installer/vérifier frontend et cœur locaux      |
| `npm test`                          | Tests unitaires et intégration NullEngine       |
| `npm run test:watch`                | Tests en continu                                |
| `npm run test:coverage`             | Couverture des règles et contrôles d'archive    |
| `npm run test:preview`              | Build puis tests HTTP du résultat de production |
| `npm run test:browser`              | Vérifications navigateur sans ROM               |
| `npm run typecheck`                 | TypeScript strict, y compris tests navigateur   |
| `npm run lint`                      | ESLint sans avertissement                       |
| `npm run format`                    | Formater avec Prettier                          |
| `npm run check`                     | Format, lint, typage, couverture, build         |
| `npm run build` / `npm run preview` | Build de production / prévisualisation          |

La CI installe les assets vérifiés et exécute les contrôles et tests Chromium.
`test:preview` utilise un serveur dédié sur `127.0.0.1:4173`, puis l'arrête.
Il contrôle la page compilée, la validation d'archives synthétiques, les empreintes
et notices du runtime, ainsi que l'absence des ROMs et routes de préchargement dev.
Pour Chrome installé : `PLAYWRIGHT_CHANNEL=chrome npm run test:preview`.

Pour essayer manuellement le build :

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Ouvrir `http://127.0.0.1:4173/`, puis sélectionner les ZIP avec les champs locaux.
Ce test reste local et ne publie rien. En développement, conserver `npm run dev`
pour le préchargement de `roms/`. Après une modification du raccord d'émulation,
recharger entièrement la page pour remplacer le glue déjà chargé en mémoire.

Les fichiers téléchargés de tiers sont ignorés par les outils de format/lint ;
ils sont contrôlés par empreinte, sans réécriture de leurs sources.

## Agents et documentation

- [AGENTS.md](AGENTS.md) : consignes communes, tests obligatoires pour toute feature importante.
- [BABYLONJS_BEST_PRACTICES.md](BABYLONJS_BEST_PRACTICES.md) : lecture obligatoire à chaque intervention.
- [ARCHITECTURE.md](ARCHITECTURE.md) : modules et dépendances.
- [HANDOFF.md](HANDOFF.md) : état réel et prochaine action.
- [Spécification](Marble_Madness_Prototype_01_SPEC.md) : périmètre et incréments A à E.
- [Livraison](docs/RELEASE.md) : bilan et dernière recette manuelle.
- [Décisions](docs/DECISIONS.md) : versions, API vérifiées, preuves et choix du cœur.
- [Composants tiers](third_party/README.md) : provenance, empreintes et licences distinctes.

`CLAUDE.md`, `GEMINI.md` et `.github/copilot-instructions.md` renvoient aux consignes
communes. Si un outil ne les charge pas automatiquement, lui demander explicitement
de lire `AGENTS.md`. Aucun skill supplémentaire n'est nécessaire.

Le dossier n'est pas encore initialisé en dépôt Git. Aucun déploiement public.
Ne pas versionner ROMs/BIOS, secrets, `node_modules`, `dist`, `coverage`,
`public/vendor` ou rapports de tests. Les variables `VITE_*` sont publiques.

Le candidat TRACKPAD_TRIAL_GAIN (0,50×) reste une constante de gain linéaire dans
input/relativeMotion, distincte du défaut inchangé 1×. Le bouton UI appelle le
même applyGain que le curseur et la réinitialisation ; aucune importation des
outils de calibration dans l'application, aucun chargement de preuve numérique
au lancement. Stockage explicite après clic, pas de reprise automatique. Le
réglage préféré existant est conservé avant l'action utilisateur.

## Mode confort Espace et présentation 3D — section 15 de la spec

`input/boostMotion.ts` est un générateur pur, temps injecté en secondes, sans DOM
ou boucle autonome. Le dernier déplacement donne une direction ; une direction
vieille de plus de 0,25 s ne lance pas un boost sans nouveau geste. Pendant le
maintien, chaque itération native reçoit un vecteur de norme L1 256, réutilisé
sans allocation par frame. Les mouvements du trackpad guident alors le boost,
au lieu de s'ajouter sous forme de grands pics. Relâcher revient immédiatement
au contrôle relatif normal. Ni force, vitesse ou position de la bille n'est écrite.

`emulation/emulatorjs.ts` possède le générateur et l'alimente depuis les événements
acceptés. Son pré-hook natif existant écrit la commande une fois avant l'itération,
sans dépendre de BabylonJS. Changement de mode : pending vidé, fractions purgées ;
entrée en boost démarre une mesure propre. Le registre de commandes générées est
séparé des événements souris (`generatedCommands`) dans la timeline. Les compteurs
de gain normaux concernent les commandes normales ; boost expose son émission
séparément, nativeSampling observe le dernier poll des deux modes.

`ui/playControls.ts` consomme Espace seulement en capture, sans répétition,
relâche sur keyup et toute interruption ; le focus quitte le bouton Capturer pour
éviter qu'un nouvel Espace après Échap ne recapture implicitement. Pas de scroll
sur Espace lorsque le canvas/body attend en pause ; les champs UI restent éditables.
Gain 0,50× rejeté migré à 1,70× ; les autres choix utilisateur sont conservés.
DEFAULT_GAIN vaut désormais 1,70× et le bouton normal restaure cette valeur.

`rendering/createScreenStage.ts` construit un support d'écran procédural, sol,
grille et éclairage appartenant à la scène. `createVideoScene` garde le même plan
vidéo et le même matériau non éclairé ; seule sa présentation passe d'orthographique
à perspective et le décor est activé. Décor créé paresseusement, conservé en
mode plan sans multiplier les ressources, détruit avec scène/matériaux/lumières.
Pas de nouveau listener, moteur ou boucle pour cette vue. `createVideoView` garde
l'unique texture et abonnement de copie existant ; source masquée comme en plan seul.
Les modes direct/compare/babylon/stage partagent une seule session et leurs
changements ne reprennent jamais une partie en pause. GPU indisponible : repli direct.

## Présentation plein écran et HUD compact

`game/gamePresentation.ts` possède les transitions de présentation sans DOM :
entrée, sortie native, refus, annulation asynchrone et destruction. Le host
injecté fournit pause, présentation et API fullscreen. Aucun chemin ne reprend
le cœur ; les gestes de jeu existants restent propriétaires de cette décision.
Une génération invalide les résultats anciens sans fermer une entrée plus récente.

`ui/gamePresentation.ts` possède le HUD, ses listeners et son MutationObserver.
Les boutons délèguent aux contrôles communs ; aucune seconde gestion de Crédit,
Start, Pointer Lock, audio ou boost. Les états disabled et les messages sont
synchronisés. `feasibility.ts` monte après les contrôles et la comparaison,
puis démonte la présentation avant eux. L'élément fullscreen englobe vidéo
source, canvas BabylonJS et HUD. ResizeObserver du rendu adapte le moteur ;
le cœur reste indépendant. Refus/absence de Fullscreen API : CSS immersive dans
la fenêtre. Safari antérieur à 18.2 emprunte directement ce chemin pour
préserver Pointer Lock. Sortie : pause/purge, puis focus du bouton d'entrée après l'événement
fullscreenchange, lorsque ce bouton redevient accessible hors fullscreen.

## Caméras fixes frontale et perspective

`createVideoScene` possède un `CameraPreset` front/perspective, initialement
perspective. La vue frontale du décor est orthographique, centrée sur le plan
vidéo (Y=1,85), cadre fourni par videoFrustum avec marge supplémentaire 8 %
pour le cadre 3D. La perspective conserve le cadrage précédent. Le plan plat
reste inchangé et le choix 3D est conservé pendant les autres présentations.
Une seule FreeCamera est reconfigurée, sans attachControl ni nouvelles ressources.
Les API mode/position/setTarget/ortho* ont été vérifiées dans BabylonJS installé
et exercées avec NullEngine puis Chrome GPU.

`createVideoView.setCameraPreset` recadre et redessine la dernière texture même
pendant la pause, sans copie ou progression du cœur. `videoComparison` possède
les deux sélecteurs page/HUD, leurs listeners (AbortController), valeurs
synchronisées et désactivation hors scène 3D/erreur/destruction. Le diagnostic
videoView.cameraPreset expose ce choix. Aucun accès aux commandes, préférences
ou états du cœur ; le changement ne pause ni ne reprend une session.

## Raccourcis de capture et Start J2

`input/requestPointerCapture` traite la confirmation asynchrone sur le document
et la variante à promesse. Le jeu et l'exploration utilisent ce raccord
depuis le geste utilisateur et gèrent séparément leurs interruptions.

`input/arcadeShortcuts.ts` résout les alias de touches demandés, sans DOM ni temps.
Il refuse Ctrl/Alt/Meta et composition ; Shift reste permis pour les chiffres
sur clavier français. `playControls` n'accepte la commande qu'en Pointer Lock
sur le canvas de session, hors pause et hors saisie. Les répétitions reconnues
sont absorbées sans seconde impulsion. Le listener document en capture intercepte
avant les raccourcis natifs EmulatorJS, qui restent neutralisés.

`ProbeSession.pulse(button, player=0)` conserve les appels existants et accepte
le port1 pour StartJ2. Deux instances du générateur buttonPulses possèdent leurs
propres timers ; clearInputs libère les deux avant zero_inputs natif. L'adaptateur
appelle simulateInput(player, button, value), index2=SELECT/crédit, index3=START.
`heldButtons` reste le port0 ; `heldPlayer2Buttons` expose le port1. Pas de nouvelle
physique, configuration du cœur ou entrée relative pour le deuxième joueur.

`scripts/measure-endurance.mjs` est un banc volontaire hors application/CI,
serveur loopback et ROMs locales requis. Il observe la vraie instance de test
via un proxy du constructeur (comme les autres bancs), les appels natifs d'entrée,
les diagnostics existants et Chrome CDP Performance. Rapport numérique borné à
dix échantillons et cent appels d'entrée maximum ; pas d'image, ROM ou état.
Le navigateur et le contexte sont libérés dans finally. Les métriques n'alimentent
pas le jeu et la cadence reste celle du cœur. La durée active est chronométrée
avec performance.now du processus de test, sans modifier les horloges du jeu.

## Prototype02 — borne, bar et interactions autorisés

La spec02 amendée par la demande explicite de Michel remplace les exclusions
historiques borne/bar. `createScreenStage` assemble deux modules : `createCabinet`
(meuble, écran, enseigne, trackball, monnayeur, boutons) et `createBarRoom`
(sol, murs, comptoir, étagères, bouteilles, mobilier et quatre lumières).
`decorTools` fournit géométries/matériaux/enseignes canvas ; ressources nommées
et possédées par la scène. Textures d'enseignes créées une fois, police système,
chemin sans DOM pour NullEngine ; la destruction GPU est vérifiée dans Chrome.
Matériaux répétitifs partagés. Les côtés et le panneau suivent l'aspect vidéo.
Le sommet du trackball reste sous Y0,85, bord inférieur de l'image, pour ne pas
masquer le jeu dans la projection frontale.

`game/cabinetAction` filtre les seules métadonnées reconnues credit/start1/
start2/play ; gauche uniquement, aucune interaction pendant capture. Le ray
picking est enregistré explicitement par l'import classique Culling/ray dans
createVideoScene. `createVideoView` possède listeners canvas, survol/tooltip,
picking et callback d'action typé. `videoComparison` délègue aux boutons existants ;
play sélectionne front puis appelle Capturer synchroniquement, préservant le
geste utilisateur PointerLock/audio. Pas d'attente d'animation avant capture.
Le nouveau bouton StartJ2 partage la même méthode d'impulsion port1 que le clavier.
Les commandes3D ne sont ni une nouvelle façade d'émulation, ni du code dans les assets.

`game/cameraTransition` calcule une interpolation smoothstep à partir de secondes.
createVideoScene réutilise une seule FreeCamera et des vecteurs de travail.
Pour interpoler vers/depuis l'orthographique, la transition utilise une FOV
perspective équivalente au frustum de l'écran, puis restitue la projection cible.
`resizeLayout` recalcule la cible sans annuler la transition (notamment lorsque
le statut du HUD change à la capture). La méthode layout explicite peut annuler.
Trois cadrages : bar, perspective de borne et frontale centrée sur la vidéo.

`createVideoView` possède une seule tâche rAF temporaire pendant les0,65s de
transition. Le callback vidéo continue la copie mais laisse le rendu à cette
tâche ; à la fin le rendu retourne au callback vidéo normal. Pas de boucle
permanente ni d'itération du cœur depuis BabylonJS. Pendant la pause, la caméra
peut donc bouger sur la dernière texture. Arrêt/cancel rAF sur changement de
présentation, désactivation, blur, Échap, visibilité et dispose ; ressources et
listeners libérés. Une callback scene.executeWhenReady dessine le décor après
compilation initiale des shaders, même si aucun nouveau dessin arcade n'arrive.
Le meuble peut être visible avant la première texture vidéo ; son écran attend
alors le premier dessin effectif du cœur, sans copier un framebuffer invalide.
Si BabylonJS perd son contexte WebGL, l'adaptateur détache la texture et
revient à la vue directe. Après restauration, le prochain dessin du cœur
alimente une nouvelle texture si la vue 3D est sélectionnée. La perte du
contexte du cœur suit la pause habituelle et apparaît dans les diagnostics.

Les métriques copyAndRender* restent celles du callback vidéo. Le rendu de
transition rAF est hors de ce chronométrage ; ces valeurs ne décrivent donc pas
le coût total des animations et ne mesurent jamais la complétion GPU.

## Prototype 03 — exploration, son et coût du rendu

La borne Atari System I utilise les maillages convertis du SKP de Gozer.
`createCabinet` construit ces maillages et leurs textures locales, puis place
les deux trackballs et les zones de picking des boutons et du monnayeur.
`venueLayout` contient les cotes en mètres. Les collisions de visite suivent
l’encombrement fixe du meuble. La vidéo conserve son aspect dans l’ouverture
inclinée du moniteur et la caméra frontale s’aligne sur ce plan.

`ui/crtControls` synchronise l'interrupteur de la page et celui du HUD et
conserve les réglages via les préférences locales. `createVideoScene` applique
`rendering/createCrtMaterial` à la surface du moniteur en mode Borne et bar.
Les dimensions du tube sont fixes au format 4:3. `videoFit` centre la vidéo
dans l'ouverture selon le rapport du canvas copié, avec des bandes si nécessaire.
Le maillage subdivisé avance le centre et le milieu des bords du verre.
Le fragment shader déforme le raster sur les deux axes, avec un reflet du verre,
et atténue les lignes de balayage lorsque leur projection devient trop petite.
Les parasites progressent avec les images reçues. Les réglages peuvent
redessiner l'image en pause sans nouvelle copie. La scène libère le maillage
et ses matériaux. L'adaptateur vidéo possède la texture partagée.

`game/cameraPreset` définit l’ordre des cinq cadrages fixes. En jeu,
`ui/videoComparison` intercepte C quand le canvas arcade possède Pointer Lock
et que la scène Borne et bar est active. Le raccourci et les deux sélecteurs
utilisent le même changement de cadrage et la même transition BabylonJS.

`game/barNavigation` calcule la pose et les collisions de visite en mètres et
en secondes. `venueLayout` partage les dimensions de la borne entre le rendu
et les collisions. `input/barExplorer` possède Pointer Lock sur le canvas
BabylonJS et les touches de marche. `ui/videoComparison` coordonne les états
observation, exploration et jeu. E près de la borne termine la marche, rétablit
le son arcade puis demande la capture sur le canvas natif dans le même geste.
Pause, Échap, perte de focus ou de capture et page masquée purgent les touches
et annulent la capture en attente. `playControls` reste propriétaire des
commandes arcade. L’exploration fait jouer le cœur pour entendre le bar, avec
les entrées arcade désactivées.

La session expose `VenueEffects`. Après chaque itération en capture,
l’adaptateur relaie les deltas natifs de J1 et le mouvement de J2 calculé
à partir de ses directions maintenues. Chaque notification indique le joueur.
Le clavier remappable de J2 passe par `ui/player2Controls` et
`gameManager.simulateInput` sur le port 1 de Libretro. Le filtre du pilote Web
réserve la souris au port 0. La pause purge les directions des deux joueurs.
`createTrackball` applique un quaternion incrémental à chaque boule et
attache les marbrures à ses sommets. La bleue suit J1 et la rouge suit J2.
`createVideoView` fait tourner la rouge pendant un glisser commencé sur
cette boule hors Pointer Lock et planifie le rendu avec la boucle existante.
L’axe de l’incrément reste lié au meuble, y compris après une
rotation composée. Le sommet roule vers +X pour un geste à droite et vers −Z
pour un geste vers le bas du trackpad. Un plafond de 45° par échantillon
évite qu’une grande impulsion dessine presque un tour dans une seule mise
à jour. Ce plafond appartient au rendu.

`game/spatialMix` calcule le gain et la balance à partir de la pose. L’adaptateur
connaît le master OpenAL `Module.AL.currentCtx.gain` du build épinglé.
`audio/spatialOutput` remplace sa liaison directe par un gain et un
`StereoPannerNode` du contexte existant pendant la visite. L’arrêt de la visite
rétablit la liaison directe. Les nœuds et les abonnements suivent le cycle de
vie de la session. Le diagnostic distingue le signal de la branche
positionnelle et le nombre de sources du cœur.

`createVideoView` possède la tâche rAF pendant l’exploration et les transitions.
Le callback vidéo continue de mettre à jour la texture, puis reprend le rendu
quand la tâche rAF se termine. La cadence du cœur est indépendante de ces
deux chemins. `game/renderQuality` fixe le plafond de DPR du canvas BabylonJS.
`createScreenStage` utilise une carte d’ombres statique, rafraîchie lors d’un
changement de qualité. Le profil Éco désactive les ombres.
`renderMetrics` encadre le rendu manuel avec beginFrame/endFrame et possède
l’instrumentation de scène et de moteur. Les imports classiques
`abstractEngine.timeQuery` et `engine.query` enregistrent les extensions
requises de BabylonJS. La mesure CPU englobe la soumission du rendu, tandis que
le GPU utilise les horodatages asynchrones du pilote si disponibles.

## Prototype 04 — terrain

En développement sur la boucle locale, `terrain.html` instancie la page de jeu
dans un cadre de même origine pour précharger et vérifier les archives pendant
l’étude. La session unique EmulatorJS démarre au clic. Le départ direct charge
un point de reprise solo créé par un rejeu des commandes avec le même cœur Web,
via `scripts/record-intermediate-checkpoint.mjs`. Le serveur de développement
sert le point et le relevé du niveau 2 par des noms fixes. Le point reste dans
`local-roms/`, hors du build. Le rendu BabylonJS lit les coordonnées, la
hauteur et le défilement du niveau actif après chaque itération émulée.

`emulation/intermediateCheckpoint` complète l’état du cœur avec les
accumulateurs de ports et l’état Slapstic du WASM épinglé. La reprise
reconstitue la banque ROM par le même adressage que le périphérique Atari.
`localStudy` précharge les deux relevés complets. `createVideoView` garde
les relevés en mémoire et remplace la scène quand le niveau lu change.

`intermediateActors` lit les enregistrements de la boule noire et des quatre
slots de créatures. `rollingActors` valide la bibliothèque locale des modèles.
`createRollingActor` possède les meshes de poses, matériaux et textures dans
la scène. `createIntermediateActors` applique les positions et états natifs.
`createMarbleAnimation` sélectionne les animations de la bille. L’horloge est
le compteur de frames du cœur et se fige pendant la pause.
`cameraRelativeMotion` convertit les gestes en axes trackball selon la
direction horizontale de la caméra. Le boost utilise ce même repère.

`game/modern/terrainMesh.ts` prend une grille de hauteurs et émet positions,
indices et UV sans dépendance graphique. `rendering/createTerrainStudy.ts`
crée la scène BabylonJS de test. `terrain.html` réutilise le cycle de vie
de `createApplication` pour la boucle et le nettoyage.
La sonde MAME et l'analyse des données restent dans les outils locaux.

Le diagnostic local `scripts/measure-terrain.mjs` exporte les sommets d'un
tronçon de Practice Race depuis MAME 0.271. `practiceTerrain` valide et
normalise le JSON choisi dans `terrain.html` ou dans la vue de jeu. Le format
associe les cellules à leur origine et à la plage de défilement mesurée. `terrainMesh` construit les
surfaces et `terrainCliffs` les faces exposées et les marches. Les garde-corps
et les pointes du départ appartiennent à `createPracticeLandmarks`. Ce
module pose les poteaux sur les triangles du dallage. Les constructeurs
`createPracticeGuardrail` et `createPracticeTower` reçoivent leurs matériaux
depuis la scène. Les dimensions et les points d’ancrage sont décrits dans
[l’inventaire des éléments du décor](docs/SCENE_ELEMENTS.md). Le chargement se fait depuis
le fichier choisi et la scène d’étude possède seule sa boucle de rendu.
`createPracticeSun` reprend l’azimut mesuré sur l’image 1199 et règle
l’élévation à 24°. La scène d’étude possède le générateur sans filtrage
des garde-corps et des tours. La vue en jeu peut y ajouter les billes
sur demande. Le dallage et les marquages reçoivent les ombres portées. Les
parois verticales sont éclairées par leur matériau et le soleil.
Les normales du relief déterminent les gris sur une texture
de dallage uniforme. `practiceDisplayTerrain` reconstruit
les marches de la fosse centrale et complète les dalles au-dessus de
la paroi extérieure droite pour raccorder son arête au terrain.
Le rendu ajuste aussi la lèvre des fosses latérales à leur découpe dans
la vue arcade. Le relevé des hauteurs est conservé pour la projection.
`createPracticeNumberSigns` dessine les trois marquages 3–4–5–6 sur le
dallage. La variante gauche inverse les chiffres dans leurs dalles et
les deux marquages orientés vers la droite partagent leur matériau.
`createPracticeGoal` fournit les trois palettes du lettrage à empattements,
posé sur la première pente de la rigole. Il anime les drapeaux à damier
3 × 2 dans la boucle de rendu de la scène. La vue en jeu
choisit la palette grise au départ, puis celle de `PracticePose.goalOwner`,
le premier joueur arrivé selon le cœur. Le dallage utilise une texture
de 16 × 16 texels avec des joints en escalier et un tramage léger.
`practiceChannelTerrain` raccorde les sommets partagés de la rigole et
complète les rebords rectilignes dans le maillage de présentation. Il
prolonge les falaises exposées de la dernière descente sous le cadrage.

`practiceProjection` décrit le cadrage arcade en pixels natifs et
`createPracticeCamera` le transpose à la caméra orthographique.
Le banc local compare la projection à la bille observée et la page
de terrain peut superposer une capture chargée depuis un fichier local.
La page d’étude accepte aussi `intermediate-terrain-v1`, un relevé
de 130 × 130 cellules avec un cadrage réglable sur la plage mesurée.
Le maillage et la caméra sont partagés entre les deux niveaux.
Intermediate Race applique son matériau de falaises bleues. Ses trois
tours utilisent le modèle `createIntermediateTower`, avec un socle
décalé de 14 dalles préparé dans `intermediateLandmarks`.
`intermediateRims` raccorde les dalles incomplètes avant de générer
les falaises. Les falaises et le tablier du pont projettent leurs
ombres sur le dallage. `createIntermediateBridge` remplace la zone
relevée du pont par un tablier articulé et son mécanisme. La scène
d’étude anime ces meshes selon la cadence observée dans MAME.
Une copie locale du relevé peut inclure les maillages décoratifs des deux
tuyaux. `parseIntermediatePipeGeometry` valide sommets, indices et normales
optionnelles avant que `createIntermediatePipes` construise les surfaces.
`intermediatePipeSurfaces` découpe les soudures dans les triangles du modèle
et sépare les dalles grises des deux bouches pour leur appliquer un matériau
qui reçoit les ombres. `intermediateFinish` sélectionne les dalles de glace et
d’arrivée. Le panneau et les drapeaux réutilisent `createPracticeGoal` avec
les coordonnées et couleurs d’Intermediate Race.
`intermediateIceMaterial` projette les motifs de reflet dans les UV à partir
du relief. `intermediateIceWalls` partage les faces verticales entre la
glace et la falaise au niveau des coulures.
`createIntermediateBridgeMechanism` construit la mécanique et la texture
du flanc de tablier. Leur provenance et leur recalage sont documentés dans
`docs/PROTOTYPE_04.md`.
Le soleil d’Intermediate Race utilise le déplacement de l’ombre du
sommet de la pyramide centrale. Les falaises bleues reçoivent les
ombres en plus du dallage.

Dans la page de jeu, l’adaptateur `emulation/practicePose` fournit à
`VideoSource` une lecture du niveau et des poses J1 et J2 réservée au binaire
WASM épinglé. Le même instantané inclut les scores et chronos lus dans
les tuiles du HUD arcade par `emulation/practiceHud`. `createVideoView`
transmet ces valeurs à `ui/videoComparison` quand le terrain moderne
est visible. `ui/practiceHud` dessine le HUD en 336 × 240 sur un canvas
2D superposé, cadré sur l’image 4:3, avec un équivalent textuel accessible.
Il se retire lors du retour à l’arcade. Ses mises à jour suivent
les notifications vidéo du cœur et la lecture de la pose au changement de vue.
`createLivePracticeView` réutilise le maillage du relevé
choisi localement et convertit la pose en coordonnées BabylonJS.
La lecture conserve les fractions des trois coordonnées pour afficher
les petits déplacements sans saut d’arrondi.
`createPracticeStartLift` prépare cinq pentes locales avec leurs parois
et sélectionne celle indiquée par `PracticePose.startLift`. Ces maillages
appartiennent à la scène et partagent les matériaux du terrain.
La différence de position successive fait tourner le motif de la bille.
L’adaptateur distingue les billes visibles, masquées et en reconstruction.
`createPracticeMarble` possède le maillage et le roulement de chaque bille.
Chaque chute ou reconstruction masque la sphère et réinitialise son suivi
de roulement. `createPracticeRespawn` anime huit éclats de la couleur
du joueur avec le compteur de l’arcade lu dans la pose. Dans le plan de
la caméra, l’ellipse se resserre et descend sur le point de reprise.
Les éclats restent lisibles au-dessus du décor.
`createPracticeCatchUpLabel` utilise un panneau bitmap face à la caméra
pour afficher « −5 SEC » au-dessus de la bille rattrapée. La présence
et le décalage horizontal du texte viennent de la pose arcade.
Le mot de défilement décale la fenêtre de
projection orthographique pendant la course, la chute et l’arrivée.
`createLivePracticeCamera` pilote cette caméra et une caméra perspective
pour le suivi, la vue du dessus, le cadrage derrière la bille et le survol.
Les deux partagent la même
fenêtre dans l’image 4:3. Les perspectives visent J1, puis J2 si J1 est
masqué, ou gardent le dernier point visé si les deux billes sont masquées.
Le survol prend sa progression dans
`PracticePose.opening` pendant le compte à rebours du cœur et se termine
au passage en jeu. `practiceCameraControls` relie le menu, le curseur de
champ de vision et les raccourcis à la scène. Les commandes de caméra
redessinent la vue en pause à partir du même instantané. Le propriétaire
`createVideoView` rend une seule présentation par notification
du cœur sur le moteur BabylonJS existant. La scène du relevé est libérée
au remplacement du fichier ou à la fin de vie de la vue. Le relevé
complet garde la scène à l’écran pendant les excursions des billes.
Il borne le cadrage au défilement relevé et prévoit une marge de
projection autour du maillage. Le relevé partiel conserve son repli
vidéo hors du tronçon. `gameHelp` commande le panneau H, avec les
touches affichées par le module de configuration J2.

Le mode de comparaison moderne garde le canvas MAME visible à côté de la
scène BabylonJS. Les deux sorties utilisent la même session, et le rendu de
la scène moderne utilise la notification vidéo existante sans copie du
canvas arcade. Les sélecteurs d’affichage et les raccourcis V et Maj+V
changent la présentation. La capture reste attachée au canvas MAME.

## Deux passages du niveau 4

Le dallage au croisement inférieur reste à la hauteur du couloir bas.
Les deux bandes à arches sont des meshes fins distincts. La suppression
des falaises s’aligne sur leurs bords. La surface basse du croisement
appartient uniquement à `level4-underpass-surface`. Les deux bandes
projettent des ombres et gardent un éclairage directionnel sans lecture
de la carte d’ombre globale sur leurs propres faces.

## Présentation du niveau 5 (Silly Race)

Le relevé `level5-terrain-v1` et le checkpoint restent locaux. Le chargement F5
utilise la même session et le même lecteur de poses que les autres niveaux.
Le scroll décroît : la caméra et le curseur d'étude respectent ce sens.
`level5Actors` lit les pools natifs séparés (miniatures et oiseaux) ;
`createLevel5Actors` ne fait qu'afficher leurs positions/états/cycles.
`createLevel5Terrain` possède les ressources statiques ; `level5DisplayTerrain`
corrige les échantillons de présentation, dont la petite rampe plane de l’arène.
`level5FortGeometry` génère séparément un toit symétrique à quatre coins de
12 unités arcade et ses quatre parois jaunes. Le terrain reste au pied du socle ;
les coupes de sa grille ne participent pas aux coins. `createPracticeTower`
conserve le centre du socle pour l’épaulement et l’apex aux niveaux 1 et 5.
Le masque local des ellipses est dérivé de l'image complète originale par
`scripts/level5-wall-pattern.mjs`, inclus dans la bibliothèque locale d'acteurs,
puis projeté sur les faces verticales. Les pigments et ombres restent soumis
à la palette native et aux lumières de la scène. Tout est libéré par la scène.

### Effets de mort du niveau 5

`birdDeath` lit les groupes de fragments natifs de chaque joueur et transmet
leurs offsets projetés dans `PracticeMarblePose.birdDeath`. `createBirdDeath`
possède les huit meshes de présentation par joueur, les met à jour depuis
la pose et les masque dès qu'elle disparaît. `createLivePracticeView` masque
la sphère pendant cet effet. Aucun timer supplémentaire. `birdParts` sépare
les quatre faces du bec pour leur peinture ; `createRollingActor` accepte
une échelle verticale de présentation, utilisée pour les premiers paliers
de l'écrasement des miniatures noires et remise à 1 pour les poses normales.

Les miniatures écrasées du niveau 5 utilisent aussi un ancrage au sol depuis
le minimum Y du mesh et une échelle horizontale de présentation ; les mises à
jour normales rétablissent les valeurs par défaut. `fitBirdPoses` copie et
ajuste bec et plumes une fois au chargement du modèle ; les normales des poses
sont recalculées sur ces copies. Aucun observer ni timer supplémentaire.

## Profondeur de l’arrivée et bords du niveau 5

La bande de collision de fin est distincte du volume visible. `level5DisplayTerrain`
reconstruit les plateformes à 16416 ; `level5FinishDepth` décale X/Z/H de 48
pour la présentation des deux billes dans cette zone. `createLivePracticeView`
utilise ces coordonnées pour les meshes et les caméras, sans écrire dans le cœur.
Le déplacement suit le rayon isométrique : la projection arcade est inchangée.
Les drapeaux sont ancrés dans le terrain présenté. La paroi terminale Z=34
partage son arête basse avec la pente adjacente, sans volume intermédiaire.

`archBridgeGeometry` est le constructeur pur partagé entre les niveaux 4 et 5.
Le niveau 5 tourne ce profil de trois cellules et ajoute les deux appuis pleins
de son pont d’approche de six cellules.
`openLevel5Bridge` enlève seulement les faces sous ce tablier ; la scène possède
les deux rives, le sol inférieur, leurs matériaux partagés et leurs ombres.

Les deux limites diagonales X−Z=±21 sont coupées sur toute la course après les
réparations des sols. Les SW absents des murs intérieurs sont complétés depuis
les trois coins cohérents ; ils ne sont pas traités comme les coins extérieurs.
