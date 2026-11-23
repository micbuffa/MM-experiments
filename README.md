# Marble Madness Web — Prototype 03

Le jeu arcade original fonctionne dans une **reproduction 3D de la borne Atari
System I**, installée dans un bar explorable en BabylonJS. Le modèle de Gozer
a été converti depuis SketchUp. Le panneau comporte une trackball bleue à gauche
pour J1 et une rouge à droite pour J2. J1 joue au trackpad ou à la souris et
J2 au clavier.
Les deux boutons Start et les deux retours du monnayeur sont cliquables hors
capture. La session **EmulatorJS 4.2.3 +
MAME 2003-Plus** alimente l’image, les commandes et le son dans toutes les vues.

## Étude du terrain 3D

En caméra **Derrière la bille** (touche **C**), les portions de mur qui masquent
la bille s'effacent rapidement et réapparaissent hors de l'axe caméra–bille.
Les billes J1/J2 conservent la même peinture dans leurs animations. Les avis
natifs de score et de temps, ainsi que la baguette, sont affichés en 3D.
Le GOAL prend la couleur du premier arrivé.

Un clic sur l'image 2D ou 3D reprend la partie et capture le trackpad ;
**Échap** libère le pointeur et met en pause. Les écrans de résultats et de
fin de partie repassent automatiquement sur la vidéo arcade originale.

Un balayage présente chaque nouveau terrain 3D disponible (actuellement les
niveaux 1 et 2), puis rejoint progressivement la caméra de jeu sélectionnée.
**C** permet de le passer. **F2** relance également le balayage du niveau 2 ;
ce raccourci restaure un état jouable, dont le chrono continue pendant la vue.

Ouvrir [la scène de terrain](terrain.html) pour examiner la rampe et les
plateformes de test. Pour voir le premier tronçon de Practice Race, charger
`local-roms/practice-terrain.json` dans cette page. Glisser pour tourner et utiliser la molette pour zoomer.
Charger aussi `local-roms/practice-reference.png` pour superposer la capture
arcade au cadrage fixe. Voir [le prototype 04](docs/PROTOTYPE_04.md) pour l'analyse de Practice Race.

Sur le serveur de développement local, cette page ouvre automatiquement
`local-roms/intermediate-terrain-pipes.json` lorsqu’il est présent et précharge
les archives `roms/marble.zip` et `roms/atarisy1.zip`. Le curseur
**Défilement arcade** couvre les 306 pixels
parcourus lors du rejeu. Pour comparer, choisir 0, 218 ou 306 px et charger
le fichier `intermediate-reference-0.png`, `intermediate-reference-218.png`
ou `intermediate-reference-306.png` correspondant dans `local-roms/`.
Le menu **Vue libre** permet d’inspecter le reste du relief exporté.
Le cadrage **Pont articulé** montre la tranche du tablier et son mécanisme.
Le cadrage **Tuyaux et rampes** montre les deux tuyaux à la fin du parcours.
Le cadrage **Glace et arrivée** montre la cuvette gelée, ses reflets,
le marquage GOAL et les drapeaux.
Pour auditer la fermeture du tuyau en Y après ajustement, garder Vite lancé
et exécuter `node scripts/audit-intermediate-pipe.mjs`. Ce contrôle lit le
relevé local et rapporte les arêtes ouvertes, triangles dégénérés et croisements.
La [procédure de préparation locale](docs/PROTOTYPE_04.md#tuyaux-dintermediate-race)
décrit la provenance de cette copie et son découpage.

### Jouer en 3D

Dans [la page d’étude](terrain.html), appuyer sur **F2** ou **Jouer au niveau 2**.
Cliquer une fois sur **Démarrer l’émulation**, puis sur **Capturer le trackpad**
pour lancer le chrono. Intermediate Race s’ouvre directement en 3D. Pendant la partie, **F2** ramène la bille au départ.
Le départ direct utilise un point de reprise solo du cœur Web dans
`local-roms/intermediate-web.state`. Avec le serveur local démarré, la commande
`node scripts/record-intermediate-checkpoint.mjs` le régénère avec Chrome et les
archives du dossier `roms/`.

Dans la [page principale](index.html), préparer les ROM et démarrer l’émulation.
Les relevés complets des niveaux 1 et 2 sont préchargés depuis `local-roms/`
et la 3D est présélectionnée. Ajouter un crédit, démarrer J1 et capturer
le trackpad. Le sélecteur **Relevé local pour la vue 3D moderne** permet
aussi de charger un fichier manuellement. Le début de la course s’affiche
en 3D dès que la bille apparaît. Le relevé couvre le parcours jusqu’à l’arrivée.
Le score et le chrono apparaissent au-dessus du terrain, en vue moderne seule
comme dans le comparatif. Pour jouer à deux, insérer deux crédits et utiliser
**Start J2**. La bille bleue de J1 et la bille rouge de J2 ont chacune leur
score et leur chrono.
Le bilan s’affiche en arcade. Chaque relevé 3D s’affiche sur le niveau correspondant.

En capture, **V** fait défiler **3D → comparaison → arcade → 3D**.
**Maj+V** affiche les deux rendus côte à côte ou revient au jeu original.
Le menu **Affichage**, aussi disponible en plein écran, permet de choisir
la comparaison pendant la pause. Elle utilise le même relevé local.
La vue originale continue quand la 3D est indisponible.

Dans la vue 3D moderne ou le comparatif, **C** fait défiler **Cadrage
arcade → Suivi de la bille → Vue du dessus → Derrière la bille** pendant la capture.
Le dernier cadrage suit la position de la bille depuis un point bas avec un
axe horizontal fixe vers l’aval. Les commandes du trackpad suivent le
repère de la caméra courante. Un geste vers l’avant et à droite dirige
la bille vers l’avant et à droite de la vue.
**+** élargit le champ de vision et **−** le resserre. En cadrage arcade,
le réglage agit sur le zoom. Le menu **Caméra du parcours** et son
curseur fonctionnent aussi en pause.

Si la vue moderne est sélectionnée avant **Start J1**, un survol se joue
pendant le compte à rebours du départ. Il rejoint la caméra choisie dès
que la bille est jouable. Pour écourter le survol, appuyer sur **C** en
capture ou choisir une caméra dans le menu.

**H** ouvre et referme l’aide translucide au-dessus du jeu. Elle indique
également les touches actuellement attribuées à J2. Le bouton **Raccourcis (H)**
est disponible sur la page.

La vue moderne affiche les éclats pendant la réapparition de chaque bille
après une chute. **Ombre des billes** permet d’ajouter les ombres portées
des deux billes depuis les réglages du parcours. Cette option est
désactivée au début de la session.

Les modèles animés des vers, de la bille étourdie, de la casse et du balai
proviennent de l’installateur local de Rolling Madness 3D. Les positions
et les états sont lus dans la session arcade. Pour reconstruire la bibliothèque
après extraction de l’installateur, exécuter
`node scripts/extract-rolling-actors.mjs "/chemin/extrait/data/{app}"`.
Le fichier `local-roms/rolling-actors.json` se charge automatiquement.
La commande utilise aussi l'image complète du niveau 5 présente dans le projet
pour replacer ses motifs de murs. En développement, le bouton **Niveau 5 · F5**
restaure le départ de Silly Race si le relevé et le checkpoint locaux sont
présents. Le niveau se parcourt dans le sens inverse des précédents ; il est
aussi accessible dans la page d'étude du terrain. Pour régénérer son relevé et
son checkpoint depuis le niveau 4 local, avec Vite lancé :
`node scripts/survey-level5.mjs`.

Les timings des modèles sont ajustés au cycle natif et restent à comparer
sur les différentes interactions.

## Découvrir la borne et le bar

Après vérification des archives et démarrage du cœur, cliquer sur **Jouer en
plein écran3D**, puis choisir **Caméra → Bar** pour voir la pièce ou **Borne**
pour les commandes. Cliquer sur le bouton Crédit ou le monnayeur, puis Start.
Cliquer sur l'écran ou le trackball : transition vers l'écran et capture pour
jouer. Échap libère le pointeur et met en pause ; les clics3D sont ignorés
pendant la capture. Le HUD et les raccourcis clavier restent disponibles.
La vue Frontale garde l'image entière, sans le trackball par-dessus.

1. Cliquer sur **Explorer le bar**. Marcher avec **ZQSD**, **WASD** ou les
   **flèches**, et orienter le regard au trackpad.
2. Appuyer sur **E** devant la borne pour capturer le trackpad et jouer.
   Pour voir la boule tourner pendant la partie, choisir **Caméra → Borne**
   et cliquer sur **Capturer** dans le HUD.
3. Appuyer sur **Échap** pour mettre en pause et libérer le pointeur. Depuis
   le jeu, **Quitter la borne** revient à la vue d’ensemble.

Le réglage **Son positionnel** contrôle l’atténuation avec la distance et la
balance stéréo pendant la visite. **Qualité** ajuste la résolution du canvas 3D.
Éco plafonne à 1× et coupe les ombres. Équilibrée plafonne à 1,5×, Retina à 2×.
Ces profils conservent la résolution native de la vidéo et le gain du trackpad.

Dans **Borne et bar 3D**, cocher **Effet CRT** sous **Écran cathodique**.
Les trois curseurs règlent la courbure du tube, les lignes de balayage et
les parasites horizontaux de 0 à 100 %. Le tube est au format 4:3 et la
courbure agit sur les lignes horizontales et verticales. L’effet et les parasites sont
initialement désactivés. Le HUD permet de basculer l’effet depuis le plein
écran après avoir libéré le pointeur. Le navigateur mémorise ces réglages.

Les transitions fonctionnent aussi pendant la pause, sans avancer le jeu.
Elles s'arrêtent sur interruption ou changement de vue ; le choix de caméra
seul ne reprend jamais l'émulation. Voir la
[provenance de la borne et des textures](public/assets/README.md).

Michel a joué au trackpad et confirmé la correction du clignotement dans la vue
BabylonJS. Le contrôle normal est revenu à **1,70×** après rejet humain du candidat 0,50× ; le freinage en fin du niveau 3
reste un point ouvert. Les impulsions de boost et le saut vers les plateformes
latérales du niveau 1 ne sont pas validés. La recette automatique de dix minutes du prototype01 est terminée ;
l'écoute audio complète et le confort humain restent à confirmer. Le [bilan de livraison](docs/RELEASE.md) sépare validations
acquises et limites ; les preuves détaillées restent dans
[docs/VALIDATION.md](docs/VALIDATION.md).

## Jouer en plein écran 3D

Après démarrage du cœur, cliquer sur **Jouer en plein écran 3D**. Le HUD garde
Crédit, Start, Capturer, Pause et Reprendre / son accessibles au-dessus du jeu.
L'entrée met la session en pause : Crédit → Start → Capturer pour jouer, ou
Capturer pour continuer une partie existante. Espace maintenue : boost.
Échap libère le trackpad et met en pause ; le navigateur peut aussi quitter le
plein écran. **Retour à la page** quitte explicitement et conserve la pause.
Si le plein écran est refusé ou si Safari est antérieur à 18.2, la même
présentation occupe la fenêtre avec son HUD.
Aucune nouvelle session, sauvegarde ou chaîne audio n'est créée.

Dans **Borne et bar 3D**, appuyer sur **C** pendant la partie pour parcourir
les vues **Frontale → Moniteur incliné → Écran et commandes → Borne → Bar**,
puis revenir à Frontale. Le trackpad reste capturé pendant les transitions.
**Moniteur incliné** cadre le jeu en grand avec le pourtour du moniteur.
**Écran et commandes** montre aussi les deux trackballs et les boutons.
Chaque boule tourne avec les commandes de son joueur. Hors capture, maintenir
le clic sur la boule rouge et glisser pour voir son animation dans la scène.

Le choix est synchronisé avec les sélecteurs **Caméra** du HUD et de la page.
La perspective de la borne reste le choix initial. Utiliser **Échap** pour
libérer le pointeur avant de choisir une vue à la souris.

## Raccourcis pendant la capture

- **5** ou **(** : insérer un crédit.
- **1** ou **&** : Start joueur 1.
- **2** ou **é** : Start joueur 2.
- **C** : cadrage suivant dans la vue Borne et bar 3D.

Actifs seulement pendant la capture, émulation en cours. Une pression donne
une impulsion brève ; maintenir la touche ne répète pas la commande. Aucun
effet dans un champ de saisie ou avec Ctrl/Alt/Cmd, ni en pause/hors capture.

Pour jouer à deux, insérer deux crédits, cliquer sur **Start joueur 2** puis
sur **Capturer**. Le panneau **Périphériques de jeu** propose **ZQSD** par
défaut pour J2, **WASD**, les flèches ou la désactivation du clavier J2.
Cliquer sur un bouton de direction, puis appuyer sur une lettre ou une
flèche libre pour la remapper. Le navigateur mémorise le réglage.

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
   Gain commun 0,25–4×, défaut 1,70× : réglage de confort, pas une valeur de fidélité.
   Le bouton Contrôle normal remet 1,70×. Volume réglable, 0 % pour couper le son.
   Seuls gain et volume sont mémorisés localement.
   Le candidat 0,50× a été rejeté en jeu et son bouton retiré ; si ce réglage
   était encore enregistré, il est restauré à 1,70× au chargement.
   Pendant la capture, **maintenir Espace et guider au trackpad** produit un boost
   continu dans la direction indiquée. Relâcher Espace rend le contrôle normal.
   Un premier mouvement est nécessaire si la direction précédente est trop ancienne.

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
repositionnement du doigt. Le contrôle normal reste linéaire. Le boost Espace est une assistance de commande
explicite ajoutée à la demande de Michel ; aucune inertie ou rotation de 45° n’est ajoutée. La physique reste celle du programme arcade. La
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
amélioration du saut. Les commandes normales restent linéaires au gain choisi. Le boost Espace utilise
un train de commandes modérées, sans nouveau limiteur du contrôle normal ni inertie ajoutée. Les impulsions/sauts ne sont pas
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
- **Borne et bar3D** donne accès à la borne interactive et à l’exploration du
  bar. Les caméras fixes Bar, Borne et Frontale restent disponibles.

Les cadrages fixes n’interceptent aucune entrée. En exploration, le canvas
BabylonJS possède la capture et le cœur ne reçoit aucune commande de jeu.
La scène en perspective présente l’écran de l’émulateur. La copie ne remplace l'image
que lorsqu'un dessin effectif du cœur a eu lieu ; les itérations sans image
conservent la dernière texture. Un filtrage bilinéaire limite le scintillement
des arêtes pendant le scroll quand la vidéo est affichée à une taille fractionnaire. Crédit, Start, capture, gain,
volume et Échap fonctionnent dans les quatre modes. Aucun nouveau chargement de
ROM ni seconde chaîne audio lors d'un changement de vue. Le changement de vue
ne reprend pas une partie en pause. En cas d'échec GPU, la vue directe reste
accessible. Après Échap, changer de vue puis recapturer pour reprendre.

`videoGeometry` indique dimensions natives et aspect annoncés par le cœur ;
`videoView` indique les dimensions du canvas copié, le nombre de copies et le
coût CPU du callback vidéo. `videoView.rendering` indique aussi les dimensions
de rendu 3D, les appels de dessin, le temps CPU de soumission et le temps GPU
lorsque le navigateur expose les horodatages. Le canvas source peut inclure
les bandes noires du frontend.

La [scène technique indépendante](http://127.0.0.1:5173/scene.html) reste une
ancienne démo statique. Le sélecteur de la page principale donne accès à la
vidéo réelle. Le confort du boost, les sauts, le freinage et la fluidité à
120 Hz restent à vérifier sur le matériel de Michel.

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

## Recette d'endurance locale

Avec le serveur de développement et les archives dans roms/ :

```sh
PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance
```

Le banc dure dix minutes actives, plus les interruptions. Pour une version
figée sans HMR, utiliser le mode production et --local-files décrit dans le
protocole. Le banc entre dans la borne depuis le bar, puis alterne caméras,
plein écran, pauses et reprises, mouvements et boost. Il contrôle les raccourcis
et relève les frames, les copies vidéo, les temps de rendu et les compteurs
Chrome. Le rapport local se trouve dans `test-results/endurance.json`.
Voir le [protocole d’endurance](docs/ENDURANCE.md).

## Agents et documentation

- [AGENTS.md](AGENTS.md) : consignes communes, tests obligatoires pour toute feature importante.
- [BABYLONJS_BEST_PRACTICES.md](BABYLONJS_BEST_PRACTICES.md) : lecture obligatoire à chaque intervention.
- [ARCHITECTURE.md](ARCHITECTURE.md) : modules et dépendances.
- [HANDOFF.md](HANDOFF.md) : état réel et prochaine action.
- [Spécification 01](Marble_Madness_Prototype_01_SPEC.md) pour l’émulation originale.
- [Spécification 02](Marble_Madness_Prototype_02_SPEC.md) pour la borne et le bar.
- [Spécification 03](Marble_Madness_Prototype_03_SPEC.md) pour la visite et le rendu.
- [Livraison](docs/RELEASE.md) : bilan et dernière recette manuelle.
- [Décisions](docs/DECISIONS.md) : versions, API vérifiées, preuves et choix du cœur.
- [Composants tiers](third_party/README.md) : provenance, empreintes et licences distinctes.

`CLAUDE.md`, `GEMINI.md` et `.github/copilot-instructions.md` renvoient aux consignes
communes. Si un outil ne les charge pas automatiquement, lui demander explicitement
de lire `AGENTS.md`. Aucun skill supplémentaire n'est nécessaire.

Le dossier n'est pas encore initialisé en dépôt Git. Aucun déploiement public.
Ne pas versionner ROMs/BIOS, secrets, `node_modules`, `dist`, `coverage`,
`public/vendor` ou rapports de tests. Les variables `VITE_*` sont publiques.
