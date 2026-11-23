# Validation

## 22 novembre 2026 — Arrivée, symétrie des tours et murs (captures 16h06–17h47)

`npm run check` : **628 tests / 100 fichiers réussis**, format, lint, typage,
couverture et build. Couverture métier : 99,45 / 98,60 / 99,01 / 99,41 %.
**Chrome : 10/10 tests terrain réussis**. Pas de dépendance ou de seuil modifié.

Tests pertinents : rotations de 90°/180° des toits et parois, centrage de
l'apex commun aux niveaux 1/5, découpe des deux bords diagonaux de toute la
course, rangée de mur intérieur sans dents, raccord direct de GOAL à la pente,
projection inchangée après recalage de profondeur, billes J1/J2 et poses natives
préservées, ouverture du pont et profil de trois cellules partagé avec les arches du niveau 4,
avec appuis pleins aux extrémités.
La première exécution complète avait révélé une erreur de typage du test et
une ancienne calibration du joint frontal ; elles sont corrigées et le contrôle
complet ci-dessus a ensuite été exécuté avec succès.

Inspection réelle Chrome : dessus des tours aux niveaux 1 et 5, faces opposées
du fort, limite du terrain et mur intérieur rectiligne, arrivée et pente en
vue libre et arcade. Captures finales dans HANDOFF. Les matériaux restent
éclairés : leurs teintes peuvent différer selon la face. Les tests de symétrie
portent sur les sommets et non sur les couleurs des captures. Aucune identité
pixel à pixel ni traversée complète jouée n'est revendiquée. Le contrôle des
ronds cachés par le tube reste ouvert.

## 22 novembre 2026 — Tours, rampe et silhouettes (15h26–15h31)

`npm run check` : **617 tests / 98 fichiers**, format, lint, typage, couverture
et build réussis. Couverture métier : 99,45 % instructions, 98,60 % branches,
99,01 % fonctions, 99,41 % lignes. Avertissement de taille des chunks inchangé.
`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts` :
**10/10 réussis**.

Tests ajoutés/étendus : fermeture des volumes des quatre coins, planéité et
raccords de la petite rampe, copie des poses et adaptation bec/plumes,
ancrage des écrasements au sol et rétablissement de la pose normale.
Inspection Chrome des trois tours avec ombres, de l'arène, des oiseaux et des
aplats après contacts natifs. Captures et limites dans HANDOFF. Les silhouettes
sont ajustées visuellement ; aucune identité pixel à pixel n'est revendiquée.
Le contour des ronds masqués par l'entrée du tube reste à vérifier : le relevé
natif actuel confirme les pigments déjà visibles et ne justifie pas un ajout.
Aucun changement du cœur, des collisions, des délais ou des dépendances.

## 22 novembre 2026 — Corrections 14h49–14h53 et interactions de Silly Race

`npm run check` : **614 tests / 97 fichiers réussis**, format, lint,
typage, couverture et build. Couverture métier : 99,45 % instructions,
98,60 % branches, 99,01 % fonctions, 99,41 % lignes. Avertissement habituel
de taille des chunks, aucun seuil modifié.

`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts` :
**10/10 réussis**. Chrome WebGL2/SwiftShader sur les assets réels :
comparaison native/3D de l'arène et des oiseaux, puis contact avec chaque type
de miniature et un oiseau. Les positions sont initialisées dans le banc,
mais les transitions d'état et leurs délais sont produits par le cœur.
La bille noire émet les trois images 0x21f7a/7e/82 avant tenue ; ver et amibe
conservent leur image écrasée. La mort par oiseau émet l'état 11, compteur
102 puis 35..0 et les glyphes 0x10b..0x112 ; retour observé à l'état joueur 0,
sans `birdDeath`. Le point sûr est hors champ après cette téléportation :
ceci ne remplace pas une traversée jouée.

Tests ajoutés : densité 2× sur sol ET blocs de l'arène, absence de sauts d'UV,
continuité et hauteur des deux crêtes, remplissage des seuls joints gris du
masque, séparation réelle du bec (UV 0,0004/1,49), trois paliers d'écrasement,
remise à l'échelle normale, orientation des oiseaux, lecture indépendante J1/J2,
sentinelle sans fragments anciens, affichage et masquage des fragments.
Le gros plan réel confirme **110 triangles violets + 4 triangles jaunes**.

Captures et journaux : voir la nouvelle entrée du HANDOFF. Aucune erreur JS
ou shader dans le banc. Pas de nouvelle recette Safari/audio/trackpad ni de
partie complète ; correspondance des formes de fragments et des déformations
3D adaptée visuellement, positions et cadence lues dans le cœur.

## 22 novembre 2026 — Niveau 5, ellipses et tours

- `npm run check` : **605 tests / 93 fichiers réussis**, typage, lint,
  couverture et build réussis. Couverture `src/game/**` : 99,45 % instructions,
  98,60 % branches, 99,01 % fonctions, 99,41 % lignes. Avertissement habituel
  de chunks supérieurs à 500 Ko. Aucun seuil abaissé.
- `PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts` :
  **10/10 réussis**. Le premier lancement sans cette variable n'avait pas pu
  ouvrir le Chromium Playwright absent ; relancé avec Chrome installé.
- Nouveaux tests : parsing du relevé 141 × 141, niveau/descripteur natif,
  pools distincts de miniatures et oiseaux, slots inactifs/tronqués, visibilité
  et absence d'avancement autonome, suivi du scroll décroissant, construction
  et destruction de scène, quarts de pyramide à deux facettes. Le test des
  coins inclut une cellule triangulaire avant les tours pour couvrir le
  décalage des indices. Le test navigateur vérifie le curseur de Silly Race
  et le retour à la vue libre.
- Chrome WebGL2/SwiftShader : captures de la **même session** native et moderne
  au départ, dans l'arène, près des oiseaux et de GOAL. Aucun message d'erreur
  JS ou shader dans le banc final. Les déplacements du banc sont initialisés
  en RAM de diagnostic ; ce n'est pas une traversée jouée complète.
- Inspection des captures `/tmp/mm-level5-compare-{start,arena,birds,goal}.png`
  et `/tmp/mm-level5-fort.png`. Les pigments ne sont plus répartis par une
  texture répétitive : le masque extrait de la carte originale place notamment
  les ellipses rose et orange de la façade GOAL aux positions correspondantes
  de la vue native. Les teintes viennent des banques de palette natives.
  Les quatre coins des tours présentent des facettes indépendantes.
- Limites : correspondance des poses Rolling Madness aux sprites adaptée
  visuellement ; horloge décorative statique ; faces cachées absentes de la
  référence 2D. Pas de nouvelle recette Safari/audio/trackpad. Les interactions
  restent gérées par le cœur ; aucun test ne certifie une partie complète.

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

## Couloirs du niveau 3 sans triangles parasites — 21 novembre 2026, 21h35

Implémentation : 43 coins SW du relevé visuel initial sont recalés sur le
plan des trois autres coins bas. Ils reprenaient la hauteur du plateau et
créaient une moitié de dalle inclinée jusqu'au haut des murs. La correction
est limitée au secteur initial et conserve les hauteurs NW/NE/SE, les vraies
pentes et la rampe de sortie. Les données d'émulation restent inchangées.

Automatique : `npm run check` réussi, 575 tests / 83 fichiers ; format,
lint, TypeScript, couverture métier et build. Les tests contrôlent la
continuité de deux sols, des normales horizontales/verticales correctes,
l'absence de falaise intérieure entre les deux cases et la préservation
d'une pente douce, de la rampe de sortie et des cellules hors secteur.

Manuel/GPU : Chrome WebGL2/SwiftShader, vues libres d'ensemble, rapprochée
et opposée. Les fausses rampes blanches et les entailles triangulaires des
captures sont reproduites avant correction et absentes après. Le diagnostic
du relevé réel confirme 43 cellules réparées. Aucune erreur JS au rendu.
Les réglages d'éclairage et d'ombres finaux restent ceux qui étaient en place.
Le parcours de la bille dans ces couloirs n'a pas été rejoué dans cette
intervention ; la validation porte sur le maillage et son rendu sous plusieurs angles.

## Position du tuyau et sept cases d’approche — 21 novembre 2026, 21h24

Implémentation : ensemble tuyau/bloc déplacé d'une case vers +Z. Bloc haut
sur Z=76..78, ouverture sur Z=79..82, bord droit raccordé à la plateforme Z=83.
Ancienne rangée Z=75 et sol sous l'entonnoir aplanis à la hauteur inférieure.
La coque et la doublure gardent le même décalage et l'élargissement précédent.

Automatique : `npm run check` réussi, 573 tests / 82 fichiers ; couverture,
lint, TypeScript et build réussis. Le test vérifie sept cases avant le bloc,
trois rangées hautes, aucun vide avant la terrasse droite et une emprise du
mesh allant de Z=79 à Z=83, avec même transformation pour coque/intérieur.
Le relevé et la géométrie sources sont conservés.

Manuel/GPU : Chrome WebGL2/SwiftShader au défilement 540 px, aucune erreur JS.
Les sept cases, le bloc et le raccord droit sont examinés dans
`/tmp/mm-2124-level3-pipe.png`. Le parcours réel de la bille dans le cœur
arcade n'a pas été rejoué pendant cette correction de présentation.

## Tuyau, dalles et aspirateurs — 21 novembre 2026, 19h23/19h33

Implémentation : conduit vertical du niveau 3 élargi de 22 % avec transitions,
source importée conservée ; rangée haute Z=75 rétablie devant l'entonnoir,
soit trois dalles sur Z=75..77 ; nouveaux aspirateurs entièrement procéduraux,
avec bouche rectangulaire peu profonde, fond doré et nervures du conduit.
Tremblement de la tête piloté par les images actives émises du 68010, sans
animation locale au temps. Le reste du conduit ne bouge pas.

Automatique : `npm run check` réussi, 572 tests / 82 fichiers ; format,
lint, TypeScript, couverture métier et build réussis. Les tests vérifient
le dégagement de la bille par l'apothème du conduit octogonal, les bords non
élargis, la conservation des données sources, les trois rangées complètes,
les deux images émises pour chaque orientation, l'arrêt du tremblement au
retrait/reset et le passage du signal par la vue live vers la tête.

Manuel/GPU : Chrome WebGL2/SwiftShader, niveau 4 à 180/250 px et niveau 3
à 540 px, sans erreur JS. Les deux phases actives sont injectées dans le
setter de présentation : déplacement de la bouche, conduit fixe, silhouettes
rectangulaires et fonds dorés inspectés. La sphère de test de diamètre 1,35
est cachée dans le conduit élargi (0 pixel bleu) et visible si les meshes
du tuyau sont désactivés (2099 pixels bleus). La troisième rangée et ses
joints sont visibles à gauche de la lèvre. Il ne s'agit pas d'un rejeu complet
de l'entrée native dans le tuyau ni d'une aspiration native jusqu'au respawn ;
ces deux séquences restent à apprécier par Michel pendant une partie.

## Contours des arches — 21 novembre 2026, 19h12

Implémentation : première paire plus épaisse (intrados 16249..16255),
seconde plus fine (16256..16262), sinusoïde simple au lieu d'une puissance 0,55.
Portées de trois cases et raccords aux plateformes conservés. Les rives
horizontales reprennent la pierre grise ; éclairage et ombres maintenus.

Automatique : `npm run check` réussi, 568 tests / 79 fichiers. Sept points
mesurés du profil de chaque paire, avec tolérance d'une unité arcade par
rapport aux profondeurs relevées sur les contours du raster original.
Les tests existants de normales, dimensions, parois conservées et ombres restent.

Manuel/GPU : Chrome WebGL2/SwiftShader à 570 px, sans erreur JavaScript.
Superposition alignée sur les joints : image originale à 960 px de large et
3580,5 px de haut pour le cadrage 1120×840 ; l'étirement vertical de la vue
arcade nécessite deux facteurs distincts. Avec l'alignement local des dalles,
aux trois colonnes de contrôle 75/95/115 de la découpe, le contour avant de
la première paire vaut 126/133/150 px dans la référence et 126/133/151 dans
le rendu, contre 106/115/129 avant correction. Ces trois mesures concernent
le contour, pas la totalité des couleurs ni la reproduction du raster.
Pour la seconde paire, les colonnes 252/272 donnent 457/451 px dans la référence,
456/451 après correction, contre 484/476 auparavant.
Les deux paires et leurs ombres ont aussi été examinées visuellement.

## Ombre du montant, axe et fin du niveau 3 — 21 novembre 2026, 19h

Implémentation : conservation des parois terminales X=87/90 sous les berges,
réception d'ombres rétablie sur le mesh du palier, découpage par quads compatible
avec les couleurs. Extrémités de l'axe importé raccourcies dans toutes les poses
à partir du masque de repos, sans changer la source. Course du curseur du niveau 3
portée à 840 px, GOAL entièrement visible.

Automatique : `npm run check` réussi, 567 tests / 79 fichiers ; lint,
TypeScript, build et couverture métier au-dessus des seuils. Tests géométriques
de surface conservée aux deux extrémités, liste de projecteurs et récepteur,
conservation des quads, rendu d'axe sans modification de coupelle/source,
projection du coin inférieur de GOAL à 208 pixels dans la frame de 240 pixels.

Manuel/GPU : Chrome WebGL2/SwiftShader, niveau 4 à 510 et 620 px, niveau 3 au
maximum 840 px ; aucune erreur JS. Axe rentré dans les murs et plaque GOAL
complète visibles. La comparaison du rendu avec/sans le seul mesh
`level4-lower-bridge-arches` parmi les projecteurs modifie 4380 pixels de la
fenêtre (635..741, 420..592) du mur droit, seuil RGB > 6. La limite courbe est
visible sur la paroi rétablie ; pas de nouvelle carte locale et pas de retour
observé des stries d'auto-ombrage dans ces captures. L'ombre est une projection
3D et reste à apprécier par Michel face au dessin arcade.

## Niveau 4 : animation native et finitions — 21 novembre 2026, 18h35

Implémentation : lecture de l'image émise des marteaux à object+0x42, table
native de répétitions partagée par les deux représentations ; dessus du U gris
sans quadrillage ; éclairage des faces internes et réception des ombres des
deux arches ; murs bas entièrement jaunes ; drapeaux jaunes.

Automatique : `npm run check` réussi, 565 tests / 78 fichiers ; couverture
métier 99,45 % instructions, 98,59 % branches, 99,01 % fonctions, 99,40 % lignes.
Le lecteur est testé avec un pointeur d'image suivante distinct de l'image
émise, ainsi qu'une entrée non alignée et une mémoire tronquée. Les tests des
poses comparent des copies des buffers afin de détecter réellement les écarts.

Manuel/GPU : Chrome WebGL2/SwiftShader, vues 510/620/784, aucune erreur JS.
Comparaison visuelle aux captures originales : U gris sans joints de surface,
faces internes orange éclairées, murs bas jaunes sans frise rouge, drapeaux
jaune pâle. Deux comparaisons A/B dans les fenêtres des arches (différence
RGB > 6) : première zone 524 pixels modifiés lorsque la réception est coupée,
8087 lorsque le soleil est coupé ; seconde zone respectivement 7361 et 11085.
Retirer les deux paires d'arches des projecteurs modifie 7353 pixels dans la
fenêtre du second passage. Dans le premier passage, l'ombre d'autres murs
recouvre la projection : cette même comparaison ne distingue pas de contribution
additionnelle dans la fenêtre examinée. Les deux meshes restent enregistrés
comme projecteurs, et la première paire reçoit bien les ombres.

68010/MAME : la création et les coordonnées des objets ont été confirmées par
une sonde locale MAME 0.271. Les scripts, les transitions de zone, la cadence
et le champ de dernière image sont vérifiés dans le désassemblage local.
Les essais de téléportation n'ont pas obtenu un rejeu complet de frappe :
la synchronisation perçue avec les collisions reste à vérifier par Michel en
jouant la zone. Les correspondances de poses 3D ne sont pas des sprites identiques.

## Départ : mur sans jaune et ombre du grand mur — 21 novembre 2026, 18h

Implémentation : la coloration jaune et sa frise sont réservées aux secteurs
X+Z >= 120. La façade X=22/Z=18..23 garde la teinte orange de la référence,
sans faux trait d'auto-ombrage. Les parois du croisement ne sont plus exclues
de la lumière principale : elles reçoivent la carte complète du niveau, qui
inclut les grandes falaises. La carte locale et sa lumière sont supprimées.

Automatique : `npm run check` réussi, 563 tests dans 77 fichiers. Le test de
projection vérifie que parois, falaises et tremplins sont associés à la même
carte d'ombre et que le récepteur n'est plus exclu du soleil. Couverture
métier, lint, TypeScript et build réussis.

Manuel/GPU : Chrome WebGL2/SwiftShader aux défilements 0/160/620 px, aucune
erreur JS. Contrôle de la région gauche : zéro pixel jaune dans la fenêtre
examinée ; le jaune reste présent dans le secteur aval. Contrôle de deux
points sous le bras gauche : couleur orange, sans la bande sombre précédente.
Comparaison du soleil avec/sans ombres : 6211 pixels différents dans la
fenêtre réceptrice du mur droit. Les captures attendent la disponibilité de
la scène et plusieurs frames de la boucle applicative, sans rendu manuel ajouté.

Le contour est celui d'une ombre calculée en 3D ; une correspondance exacte
avec les pixels arcade n'est pas certifiée. À confronter par Michel à ses
captures de 18h00/18h02 dans la vue rechargée.

## Raccord, éclairage et ombres des tremplins — 21 novembre 2026

- Implémentation : arête commune à X=82, normales d'une dalle unifiées,
  parois entrantes restaurées derrière les tremplins, réception d'ombres
  locale séparée du bandeau. `twoSidedLighting` corrige les faces arrière
  visibles. Palette orange/rouge sombre recalée et rouge vif réduit.
- Tests : `npm run check` réussi, 563 tests / 77 fichiers. Contrôles des
  raccords sans marche, normales, UV de 5 et 3 cases, parois restaurées,
  projecteurs/récepteurs de la carte locale et destruction avec la scène.
  Couverture métier supérieure aux seuils, lint, typage et build réussis.
- Chrome WebGL2 : captures 0/160/620 px et superposition native au départ,
  aucune erreur JS. L'activation/désactivation des ombres locales modifie
  1420 pixels dans la zone réceptrice examinée. Les ombres restent des
  projections 3D, avec un contour différent du dessin arcade.
- Comparaison : bras dorés de 5 et 3 cases, chemins gris de 9 et 7 cases.
  Vue complète native superposée à l'échelle 5/3, translation (76,-1) pour
  le viewport 1120×840. Le pas des joints coïncide ; leur gris est 102 et
  leur largeur correspond aux 4 pixels sur 16 mesurés dans la référence.
  Les joints dorés ont été éclaircis en ocre. Prélèvements PNG de repère :
  rouge sombre natif 93/14/7, rendu 95/14/7 ; orange natif 189/78/32,
  rendu 190/80/32. Ces valeurs ne certifient pas le profil colorimétrique
  d'un écran ni l'identité de toutes les ombres.
- À valider par Michel : appréciation en situation de jeu. Aucune modification
  du programme arcade ou du calendrier d'émulation.

## Raccords de la seconde arche et contours des cubes — 21 novembre 2026

Implémentation : deux dessus d'arches horizontaux à 16272 ; deux cases
centrales à 16260 et une pente de chaque côté sur le palier X=90..94 ;
sommets communs aux deux rangées de la montée X=94..98. Frise locale à
16228 et peinture rouge des murs longitudinaux. Les parois étroites du
palier sont séparées des récepteurs d'ombre globaux, sans triangles en double.
Les deux cubes terminaux des rampes dorées ont un contour gris indépendant
de l'éclairage, décalé vers l'extérieur pour éviter le z-fighting.

Automatique : `npm run check` réussi, 560 tests dans 76 fichiers. Les tests
vérifient les dessus horizontaux, la largeur du plat central, les raccords
des pentes, les contours et leur nettoyage, ainsi que la partition des murs.
Couverture métier au-dessus des seuils, lint, TypeScript et build réussis.

Navigateur : Chrome WebGL2/SwiftShader, captures aux défilements
0/510/620/784 px examinées, aucune erreur JS. Comparaison temporaire avec
réception des ombres activée/désactivée : les stries du palier provenaient
bien de l'auto-ombrage. La séparation locale retire ces stries tout en
préservant les ombres projetées. Contours gris visibles sur les deux cubes,
avec séparation du cube gauche et du mur rouge situé derrière.

À valider par Michel : appréciation visuelle dans sa vue de jeu et traversée.
Les règles arcade et la synchronisation du cœur ne sont pas modifiées ici.

## Rampes, arches et marteaux — 21 novembre 2026

- Implémentation : deux tremplins suspendus sans parois pleines ; premier
  passage abaissé ; normales du second passage corrigées ; deux biseaux
  conservés sur son palier ; marteaux retournés sur X=105. Le mode jeu suit
  uniquement les pointeurs RAM, avec conversion des unités arcade en cases.
- Automatique : `npm run check` réussi, 557 tests dans 76 fichiers, avec
  formatage, lint, TypeScript, couverture V8 et build. Les régressions ciblées
  portent sur les normales, les biseaux et raccords, les sous-faces uniques,
  les coordonnées RAM et l'absence d'animation autonome live.
- Navigateur : Chrome WebGL2/SwiftShader, vues arcade à 0/510/620/784 px,
  captures examinées, aucune erreur JS. Injection de quatre enregistrements
  RAM de test : poses 2/6/9/12, quatre modèles visibles, ancrages X=105,45 et
  Z=102,5/104,5/106,5/108,5. Les géométries ne changent pas après 20
  notifications de rendu sans mise à jour native.
- Original : désassemblage 68010 pour les scripts, création par défilement et
  réveil par transition de zone. MAME 0.271 confirme quatre objets en attente
  avec X RAM=840 et Z=816/832/848/864. Le test qui écrivait directement la
  zone ne déclenchait pas la routine de transition et ne prouve pas la frappe.
- À valider par Michel : traversée jouée F4, appréciation des mouvements et
  collisions ensemble. Le calendrier vient du cœur ; la correspondance entre
  les images arcade et les poses importées demeure une adaptation visuelle.

## Architecture des deux arches — 20 novembre 2026 au soir

`npm run check` réussi avec 553 tests.

Le maillage local de référence a permis de mesurer des bandes de
0,1 case. Le test vérifie que les falaises qui fermaient le premier
passage sont retirées, que les bandes laissent le centre ouvert et
que leur profil reste fin. La plateforme artificielle du second
croisement a été retirée et les surfaces basses ne sont plus dupliquées.
Chrome WebGL2 a rendu les deux passages à 510 et 620 px, sans erreur JS.
L’auto-ombrage des deux bandes est désactivé pour éviter les artefacts
de la carte d’ombre globale. Le calage des hauteurs reste une adaptation
visuelle de la référence.

## Corrections après comparaison des arches et des cylindres — 20 novembre 2026

Les tests vérifient les nouvelles bornes des arches sous le tronçon
transversal et leur hauteur réduite. Les cylindres rétractés utilisent
un disque horizontal et un contour gris foncé. Les joints et la frise
sont modifiés uniquement pour la présentation du niveau 4. Le calage
des arches reste à confronter à une traversée jouée.

## Compléments du niveau 4 — 20 novembre 2026

`npm run check` réussi avec 551 tests.

Tests des ouvertures sous le pont, des deux arcs et du maintien des
têtes de cylindres au repos. Les capuchons gris et les deux arches
ont été examinés dans Chrome WebGL2 aux défilements 440 et 510.
Les murs bicolores et leur frise sont des réglages visuels estimés.
La superposition et les textures de la catapulte ont été corrigées,
avec une carte d’ombre locale plus précise. La validation des six
passages en partie reste à faire.

## Raccord des parois et prolongement du tuyau — 20 novembre 2026

La scène de test vérifie les parois profondes du support en U, leur
matériau partagé avec les falaises et le dessus gris. Elle vérifie aussi
que le tube descend sous le sol et que le pavillon dépasse son axe.
Vérification visuelle dans Chrome effectuée, sans erreur JavaScript.
`npm run check` réussi avec 550 tests.

La comparaison des bornes du modèle `hoover_down` a été faite sur
ses première et dernière poses. Le calage animé en partie reste ouvert.

## Catapulte de Rolling Madness 3D — 20 novembre 2026

Michel indique avoir obtenu l’accord de l’auteur pour la réutilisation.
La catapulte de repos et ses 22 poses ont été extraites avec leurs
normales, UV et texture. Chrome affiche le maillage local sur le niveau 4
sans erreur JavaScript. Le test de scène vérifie la sélection des poses
sur signal natif et le retour au repos. Chrome a aussi vérifié le
changement des sommets entre deux poses de tir et la présence de la
texture locale. `npm run check` réussi avec 550 tests. Le calage animé en partie reste
à vérifier.

## Superposition des mécanismes du niveau 4 — 20 novembre 2026

Les captures MAME 0.271 des images 1177 et 1297 ont été chargées
dans la page d’étude à 50 % d’opacité, aux défilements 128 et 314 px.
La comparaison montre un décalage résiduel des contours du décor.
Les tests de scène vérifient que l’enveloppe des conduits est du côté
extérieur du bord de la piste pour les deux orientations et que
l’axe déplacé ne modifie pas le centre de la coupelle au repos.
Le matériau des joints a été vérifié dans Chrome WebGL, sans erreur JS.
`npm run check` réussi avec 549 tests.

## Cylindres natifs et détails de maillage du niveau 4 — 20 novembre 2026

La sonde MAME 0.271 a relevé le passage en zone 4, la création de la
table et les premières poses des trois groupes. Les tests vérifient
l’adresse et l’indépendance des slots, la conversion de la montée et
du retrait, et le retour au masquage. Les formes du bec et du
support carrelé ont été examinées dans Chrome sur la page d’étude.
Une RAM de test a affiché quatre slots observés dans MAME avec plusieurs
hauteurs dans Chrome WebGL2. `npm run check` réussi avec 549 tests.
La vérification d’une traversée jouée dans le cœur Web reste ouverte.

## Détails visuels des aspirateurs et de la catapulte — 20 novembre 2026

Les tests de scène vérifient que la semelle touche le dallage,
que la structure fixe conserve sa position pendant le tir et que la
coupelle reste centrée au repos. Le raccord d’aspiration et les poses
natives conservent leurs tests existants. Vérification des deux nouveaux
modèles dans Chrome à 280 et 440 px sur la page d’étude.
`npm run check` réussi avec 547 tests.

## Aspiration et catapulte du niveau 4 — 20 novembre 2026

Un sondage MAME 0.271 avec le BIOS TTL a observé le repos de la
catapulte, le début du tir et les pointeurs suivants. La position et
la vitesse de la bille ont été initialisées en amont pour atteindre
la zone. Les tests vérifient la lecture de l’aspiration et du tir,
l’alignement de la coupelle, son repos sans signal natif, la convergence
des fragments et leur retrait pendant la reconstruction. Le relevé complet
du niveau 4 a aussi été rendu dans Chrome WebGL2 avec des poses de contrôle.
La bille apparaît centrée dans la coupelle. Le repos, la levée et le retour
ont été vérifiés en coordonnées monde. La bille disparaît pendant
l’aspiration et les huit fragments sont entièrement masqués en fin d’effet.
Aucune erreur JS. `npm run check` réussi avec 547 tests. Une traversée
complète des deux obstacles dans le cœur Web reste à vérifier.

## Aspiration de la bille — observation MAME — 20 novembre 2026

Un rejeu contrôlé du niveau 4 sous MAME 0.271 a capturé la bille intacte
à 1177, les fragments à 1184 et 1200, puis leur disparition à 1232.
Le compteur de l’état `0x0a` part de 32 et la pose physique reste fixe
pendant cette suite. L’état `4` apparaît à 1242. Les trois maillages du
remake ont été lus depuis l’extraction locale. Les poses, le nombre de
triangles et les références de matériau figurent dans
[la passation](../HANDOFF.md#aspiration-de-la-bille--comparaison-des-deux-jeux--20-novembre-2026).

## Aspirateurs procéduraux du niveau 4 — 20 novembre 2026

Les tests vérifient les poses lues pour les deux types d’aspirateurs,
le masquage au repos et le déploiement indépendant. Chrome WebGL2 a rendu le
relevé local du niveau 4 en utilisant une RAM de test alimentée avec des
pointeurs observés dans MAME. Six mécanismes présents dans la scène,
aucun visible au repos et deux ouvertures successives vérifiées.
`npm run check` réussi avec 545 tests. La reprise F4 est confirmée dans
Chrome. L’initialisation des slots d’aspirateurs n’a pas été observée
pendant le déplacement artificiel en cœur Web. Une partie complète via F4
reste à vérifier.

## Aspirateurs du niveau 4 — sonde MAME — 20 novembre 2026

Capstone a servi à lire le 68010 de l’archive locale. MAME 0.271 avec le BIOS
TTL a confirmé les six acteurs en attente, le changement d’état au
franchissement d’une frontière, le retour à l’image vide en quittant la zone
et le retrait après capture. Les positions/vitesses ont été initialisées
artificiellement avant les passages. La sonde a ensuite observé la simulation
native et ses pointeurs RAM. Le détail des adresses et les images relevées
figurent dans [HANDOFF.md](../HANDOFF.md#aspirateurs-du-niveau-4--déclenchement-arcade--20-novembre-2026).

## Mécanismes procéduraux du niveau 4 — 20 novembre 2026

Le test NullEngine vérifie l’ancrage sur une pente, l’absence de mécanismes
au-dessus d’une dalle manquante, la direction du bras de la catapulte et
l’évolution des pièces mobiles à temps déterministe. `npm run check` a
réussi avec 542 tests. Captures Chrome de la scène d’étude examinées à
315, 494 et 750 px. Les cycles sont des animations de présentation.
Les interactions pendant une partie restent à vérifier.

## Extraction locale de Rolling Madness 3D — 20 novembre 2026

Binary Refinery 0.11.3 a décompressé les 329 fichiers recensés dans la table Inno
Setup 5.0.4. La première tentative a révélé un écart de somme sur le binaire du
jeu. Le décodage local du filtre x86 ancien a rétabli les neuf binaires filtrés.
Les tailles et les sommes Inno des 329 fichiers concordent. Le manifeste
SHA-256 valide les 339 sorties, y compris les ressources de l’assistant et les
métadonnées exportées. Le convertisseur existant a exporté ses 11 modèles
dans un JSON temporaire. Les données de maillage correspondent à la bibliothèque
locale actuelle. La seule texture différente est `amoeba.png`.

`npm run check` a réussi avec 541 tests Vitest. La vérification porte sur
l’extraction et la lecture des fichiers. L’intégration des modèles en scène
et la vérification dans un navigateur restent à faire.

## Niveau 3 — amibes fluides, vague synchro RAM + joints, tuyau jointif et fonte acide — 19 novembre 2026

Implémentation : interpolation monde + étirement directionnel des amibes dans `createIntermediateActors.ts` ;
lecture native `waveProfile` (22 triplets `0x772 + i * 6` issus de la table ROM `0x1d370`) et `melt` (`state === 9`, `word(base + 0x74)` `0x1062..0x107a`)
dans `practicePose.ts` ; routage `animation === 9` vers `player_melt` dans `createMarbleAnimation.ts` ;
synchronisation temps réel `setLevel3WaveProfile` + fort relief contrasté + flancs striés `level3-wave-sides` + ouverture
`z = 78, x = 76..78` du tuyau cuivre + palette sable/marron chaude + 2 bosses symétriques + niches jusqu’au bord dans `createLevel3Materials.ts`, `createTerrainStudy.ts` et
`createLivePracticeView.ts`.

Automatique : `npm run check` (Prettier, ESLint, TypeScript strict, 536 tests Vitest + couverture V8 ≥ 90 %,
build Vite) avec tests ajoutés dans `practicePose.test.ts` et `createTerrainStudy.test.ts`.
Visuel GPU (Chrome DevTools sur `http://127.0.0.1:5173/terrain.html`) : captures vérifiées à `0 px`, `500 px`
(entonnoir du tuyau jointif, paroi verticale sans triangle parasite, 2 bosses asymétriques à coin coupé, niches jusqu’au bord)
et `736 px` (pentes marron finales sans dalle verte parasite, murets turquoise sans reflet blanc, chapeau unique au creux du V central `(99, 92)`, vague cambrée à joints verticaux).
À valider par Michel : vidéo des amibes et de la fonte `player_melt` + vérification live de la vague sans plateau parasite.

## Niveau 3 — scroll complet, amibes natives, tours texturées, niches et ombres — 19 novembre 2026

Implémentation : `level3LastSurveyedScroll = -15440` (`736 px`) dans `practiceTerrain.ts` ;
lecture des 8 slots natifs d’amibes (`0x1482 + i * 0x42`, `kind = 'acid'`) dans
`intermediateActors.ts` et rendu animé `arcade-acid-0..7` dans `createIntermediateActors.ts` ;
texture pierre/pilastres `level3-tower-stone` sur les deux tours de départ, 6 rangées de niches en creux
`carveLevel3WallNiches` fidèles à `MarbleMadness_Level3.png`, rehaussement/teinte du
tuyau cuivre, flancs pleins de la vague turquoise (`createLevel3Wave`), et murets ondulés turquoise lissés + pyramide (`level3-turquoise-curbs` / `level3-turquoise-spike`) dans `createLevel3Materials.ts` ; éclaircissement des ombres (`fill.intensity = 0.34`,
`shadows.darkness = 0.28`) dans `createTerrainStudy.ts`.

Automatique : `npm run check` (Prettier, ESLint, TypeScript strict, Vitest + couverture V8 ≥ 90 %,
build Vite) avec tests ajoutés dans `intermediateActors.test.ts` et `createTerrainStudy.test.ts`.
Visuel GPU (Chrome DevTools sur `http://127.0.0.1:5173/terrain.html`) : captures vérifiées à
`0 px`, `250 px`, `500 px` et `736 px` (max du curseur porté à `736 px`).
À valider par Michel : essai en jeu live du Niveau 3 (défilement jusqu’à GOAL et visibilité des amibes).

## Niveau 3 — étapes 1, 2 et 3 (relevé MAME, décors et branchement live) — 19 novembre 2026

Implémentation : extraction MAME 0.271 du relevé complet `118 × 118` du niveau 3 + tuyau
cuivre de `lev3.ase.mesh` (`scripts/add-level3-pipes.mjs` → `local-roms/level3-terrain.json`) ;
support `'level3-terrain-v1'` dans `practiceTerrain.ts` ; lissage des bordures de fossés,
tuyau vertical cuivre (`createLevel3Pipe`), vague turquoise animée (`createLevel3Wave`),
`GOAL` et drapeaux jaune/noir dans `createLevel3Materials.ts`, `createPracticeGoal.ts` et
`createTerrainStudy.ts` ; branchement live `0x2cd9e` dans `practicePose.ts`,
`createLivePracticeView.ts` et `feasibility.ts`.

Automatique : `npm run check` (Prettier, ESLint, TypeScript strict, Vitest + couverture V8 ≥ 90 %,
build Vite) avec tests ajoutés dans `practiceTerrain.test.ts`, `practicePose.test.ts` et
`createTerrainStudy.test.ts`.
Visuel GPU (Chrome DevTools sur `http://127.0.0.1:5173/terrain.html`) : niveau 3 chargé sans
erreur runtime, vérifié sur `Cadrage arcade` (`0 px` et `250 px`) et `Vue libre` (tuyau
cuivre, vague turquoise et `GOAL` + drapeaux visibles).

## Ombres 4096, fosses, rembardes, piston auxiliaire, pointe L1 et alcôve L2 — 19 novembre 2026

Implémentation : shadow map 4096 sur Practice Race et resserrement `bias`/`normalBias`
dans `createPracticeSun.ts` ; redressement à `(0, 1, 0)` des normales des extensions de
rebord `extendPracticePitRims` dans `createTerrainStudy.ts` ; diamètre des rembardes rouges augmenté (`0.36/0.38`)
dans `createPracticeGuardrail.ts` ; animation en va-et-vient à 4,5 Hz du petit piston droit
(`auxiliary-plunger` + `auxiliary-cap`) dans `createIntermediateBridgeMechanism.ts` ;
fermeture de l'encoche `(62, 82)` en fin de niveau 1 (`practiceChannelTerrain.ts`) ;
élargissement de l'alcôve derrière la glace à 7 dalles (`z = 76..83`) et ajustement de
hauteur de la tablette (`intermediateLandmarks.ts`) ; suppression des dalles internes
de collision aux appuis du tuyau bleu en Y (`z = 85..86` et `z = 91..94`) avec plancher
intérieur trapézoïdal strictement inscrit dans la sortie (`z = 92.9..95`) dans
`createTerrainStudy.ts` ; ombrage strictement hexagonal du bassin glacé dans
`intermediateIceMaterial.ts` ; calibration fine `bias`/`normalBias` (`0.00045`/`0.01`
et `0.0005`/`0.011`) dans `createPracticeSun.ts`.

Automatique : `npm run check` (Prettier, ESLint, TypeScript strict, Vitest + couverture V8,
build Vite).
Visuel GPU (Chrome DevTools sur `http://127.0.0.1:5173/terrain.html`) : vérifié sur les vues
`Cadrage arcade` (0 px — 5 puits propres sans acné ni jours blancs), `Tuyaux et rampes`
(tuyau en Y jointif sans dalles ni plancher débordant) et `Glace et arrivée` (bassin
hexagonal net inscrit dans un cercle + alcôve).

## Acné d’ombres, bille spéculaire, tuyau, vagues, glace et alcôve — 19 novembre 2026

Implémentation : retrait de `floor` des shadow casters et ajustement `bias`/`normalBias`
dans `createPracticeSun.ts` ; séparation des deux fosses de départ (`terrain-pit-walls`,
`receiveShadows = false`) ; texture de bille bicolore + réflexion sphérique
(`Texture.SPHERICAL_MODE`) inspirée de Rolling Madness 3D (`player.png` + `player_env.jpg`) ;
assombrissement de l’intérieur des tuyaux + `interior` shadow caster ; correction de
`intermediateWaveCell` sur `z = 81` et contraste de pente par couleurs sommets
(`intermediateSlopeColors`) ; nervures verticales (`joint(z - x)`) sur la glace plate ;
alcôve en creux + tablette dallée grise (`intermediate-alcove-shelf`) dans le mur bleu
derrière la glace ; remontée d’erreur explicite dans `src/terrain.ts`.

Automatique : `npm run check` (Prettier, ESLint, TypeScript strict, Vitest + couverture V8,
build Vite) et vérification `NullEngine` sur les deux relevés réels `practice-complete-terrain.json`
et `intermediate-terrain-pipes.json`.

Limites : recette visuelle dans Chrome à confirmer par Michel sur `http://127.0.0.1:5173/`
et `http://127.0.0.1:5173/terrain.html` (sandbox Playwright bloquée en loopback).

## Finitions niveaux 1 & 2, balai et pont synchronisé — 19 novembre 2026

Implémentation : synchronisation RAM du balai (`0x72`/`0x7a`/`0x7f`) avec recalage
au sol et échelle `0,84` ; synchronisation RAM du pont d'Intermediate Race
(`0x772`/`0x774`, paliers 0..6) ; roue du mécanisme déplacée à gauche du piston ;
ombres statiques des tuyaux sur les parois bleues (`intermediate-pipe-wall-light`,
`REFRESHRATE_RENDER_ONCE`) ; sol préservé au pied de la bille en caméra `chase` et
restriction de `chase` au mode 1 joueur ; texture bille à 6 anneaux de 8 points
jaunes sans distorsion ; cadre GOAL 4 lignes sur Practice Race ; découpe des
diagonales limites `±21` sur Practice Race ; maintien 3D pendant `mode === 4`
(Out of Time / Game Over) avec lecture alpha-RAM ; balayage d'ouverture linéaire
fin → début.

Automatique : `npm run check` réussi (530 tests Vitest, couverture V8, ESLint,
TypeScript strict, build Vite). Nouveaux tests unitaires et NullEngine pour
chaque point ci-dessus ; assertion GPU ajoutée dans `tests/browser/occlusion.spec.ts`.

Limites : l'exécution Playwright Chrome dans la sandbox réseau échoue sur
`net::ERR_ACCESS_DENIED` (`127.0.0.1:5173`) et le Chrome de l'hôte n'avait pas
le débogage distant actif. Recette visuelle et `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`
restent à confirmer sur la machine de Michel.

## Matériaux, magie, GOAL et occlusion — 19 novembre 2026

Implémentation : peinture et spéculaire uniques par joueur sur les formes
normale/dizzy/cassée ; marques jaunes partiellement émissives et UV répétées,
requises par les coordonnées V=1..2 des modèles locaux. Baguette et étirement
pilotés par l'état natif 8 ; +10 SEC lu dans l'avis natif ; avis de score lus
sans inférence sur les deltas du HUD. La boule noire a produit 1000 points
dans le relevé natif ; cet événement est distinct du +10 SEC de la baguette.
Le pointeur différencie aussi le véritable −5 SEC des autres avis.
GOAL Intermediate bleu/rouge émissif selon le premier arrivé ; vers épaissis ;
piston et base du pont rapprochés de la pente et observés à l'angle arcade.
Occlusion : couloir local traversant les murs en caméra Derrière, ouverture
rapide à bords progressifs et restitution hors couloir/hors caméra.

Automatique : `npm run check` réussi, 515 tests Vitest. Tests ajoutés pour la
peinture commune, les UV répétées, la magie/étirement/arrêt, le bonus de 1000,
la séparation score/+10/−5, le GOAL Intermediate et l'inversion de fade.
Les seuils de couverture sont conservés. Build réussi avec l'avertissement
préexistant sur la taille des chunks BabylonJS.

Chrome : 32 tests des commandes, vues et occlusion réussis. Le nouveau test
GPU mesure les pixels de la bille derrière une paroi opaque, après ouverture,
après déplacement du couloir et après désactivation ; la paroi redevient
opaque sans disparition du niveau. Il ne repose pas seulement sur NullEngine.

Essais locaux : même session MAME, F2 immobile huit secondes, trois vues V,
F2 sous capture, C et commande derrière. Captures WebGL inspectées sur les
formes normales/dizzy/cassées J1/J2, baguette aux RAM natives 2526/2580/2690,
+10 en 2710 et récompense 1000 en 2936, pont depuis l'angle arcade.
Aucune erreur JavaScript ni erreur console sur le banc visuel. Les essais
matériaux/effets relisent des poses dans la présentation ; ils ne sont pas une
partie complète ni une nouvelle injection dans le gameplay Web.

Limites : l'apparition spontanée de la baguette n'a pas été rejouée ; son ancien
banc MAME active le drapeau pending puis laisse l'arcade dérouler l'effet et
son chrono. Le code livré ne force aucun bonus. La finition visuelle des vers,
le GOAL en fin de parcours réel et les coins complexes d'occlusion restent
à rejouer par Michel. Safari réel non retesté. Le balai doit encore être
synchronisé et recalé finement ; le pont garde son cycle d'étude.

## Vers, fin de partie et clic de capture — 19 novembre 2026

Implémentation : ver articulé avec appuis alternés, courbure avec deux extrémités
au sol, phases d'attaque et de repas (bouche plate, cloche, redressement, langue).
Phase déterminée par le script arcade et sa fraction, pas par une horloge privée.
Suppression de la flaque de fonte sur l'état natif de bille avalée.
Retour aux écrans natifs de résultats/game over, sans conserver un terrain
immobile. Clic sur les images 2D/3D pour reprendre et capturer.

Automatique : `npm run check` réussi, 505 tests Vitest. Nouveaux tests : appuis
immobiles pendant l'autre demi-pas, quatre directions natives, déroulé du repas,
langue tardive, réutilisation de géométrie, arrêt/masquage, absence de flaque,
phases natives menus/niveau. Couverture globale : 99,41 % instructions,
98,58 % branches ; seuils inchangés.

Référence : nouveau rejeu MAME des commandes du parcours original, captures
3138–3258 et RAM locales. Poses 3D inspectées dans Chrome aux frames natives
2970, 2986, 2998, 3138, 3170, 3206, 3250. Le double appui et les phases
bouche/cloche/langue sont présents. La géométrie est reconstruite : il ne s'agit
pas d'une reproduction pixel à pixel des sprites. Comparaison en partie à
valider par Michel, notamment aux changements de direction et aux contacts.

Fin de partie réelle : F2, capture, 82 secondes sans commandes. Le chrono arrive
à zéro, le mode natif passe de 0 à 4 puis 1 ; l'affichage passe en source directe,
le mode attract continue, aucune pause ni erreur JavaScript. Ce test n'accélère
ni ne modifie le timer. Journal temporaire `/tmp/mm-timeout.json`.

Navigateur automatisé : 31 tests Chrome (`video.spec.ts`, `controls.spec.ts`)
réussis après correction du cas changement de vue pendant les résultats.
Le nouveau test de clic utilise le vrai Pointer Lock et vérifie les deux canvas,
Échap et le démontage. Essai avec le vrai cœur : trois cycles capture/reprise/
Échap (3D, 2D, 3D), compteur de frames qui avance, une seule session, aucune
erreur JavaScript. Le banc attend le rafraîchissement du diagnostic après Échap.
Safari réel n'a pas été retesté dans ce lot ; son test de compatibilité simulé
reste dans la suite Chrome. Avertissement préexistant de gros chunks au build.

Les sujets baguette, balai et matériau normal/cassé restent ouverts dans
[ANIMATION_AUDIT.md](ANIMATION_AUDIT.md).

## Balayages et raccord caméra — 18 novembre 2026

Implémentation : raccord de position/cible et projection vers chacun des quatre
cadrages ; préparation du terrain préféré sans bref retour à la vidéo arcade ;
balayage automatique à chaque nouvelle scène compatible et après F2. Lecture
du niveau 2 pendant son introduction native. Le temps vient du cœur, donc
reste figé en pause. F2 reprend un état déjà jouable : le chrono continue
pendant son balayage ; C l'interrompt. Une pose nulle conserve le terrain 3D
préparé, acteurs masqués ; une portion hors relevé partiel garde le repli arcade.

Automatique : `npm run check` réussi, 496 tests Vitest. Cinq tests caméra
ajoutés : continuité des matrices/cadrages en fin de séquence pour les quatre
presets, pause, durée, réarmement et passage manuel. Un test supplémentaire
vérifie la lecture du niveau suivant pendant le compte à rebours natif.

Navigateur : les 14 tests Chrome du fichier `video.spec.ts` passent sur la
première vérification. Test réel avec le cœur local : départ F2 immobile à
(220,108) huit secondes, V dans les trois vues, F2 sous capture, C et commande
en caméra arrière, aucune erreur JavaScript. Captures WebGL du niveau 1 aux
progressions 0, 0,65, 0,8, 0,95 et 1 inspectées aux phases de raccord ; aucune
erreur JS sur ce banc. Le confort cinématique reste à apprécier par Michel.
Le build conserve son avertissement préexistant de taille des chunks BabylonJS.

Les corrections des animations demandées précédemment ne sont pas livrées avec
ce raccord. Leurs observations et limites sont conservées dans
[ANIMATION_AUDIT.md](ANIMATION_AUDIT.md).

## Glace et cadrage bas de la bille

Les tests vérifient la projection des réflexions sur les pentes, la
grille diagonale des dalles plates, le raccord des coulures sur la
falaise et dans le trou et le maintien du cap de caméra à l’arrêt.
Le raccourci C sélectionne le cadrage bas dans le jeu 3D.
Les captures Chrome du bassin de dessus et en oblique montrent ses
joints et ses coulures. La vue basse a été essayée sur la descente
finale de Practice Race avec des poses tirées du rejeu. `npm run check`
passe avec 474 tests Vitest. Les 49 tests Chrome passent.

## Glace, arrivée et raccords des tuyaux

Les tests contrôlent les dalles couvertes par le revêtement gris, la réception
des ombres, l’alignement du piston et le retrait de la tranche par rapport
au dessus du tablier. Le dernier tronçon a été inspecté dans le cadrage
**Glace et arrivée** dans Chrome avec la cuvette turquoise, le marquage GOAL
gris et ses deux drapeaux animés. La palette d’arrivée est celle de l’étude.
`npm run check` passe avec 470 tests Vitest. La relance Chrome sur la
version stabilisée passe les 49 tests après une perte de fixture au
premier passage pendant une modification des sources.

## Ombres, pointes et intérieurs des tuyaux d’Intermediate Race

La mesure du sommet et de son ombre vient de la capture locale arcade
à 306 px. Les tests contrôlent la projection (79 px à droite et 19 px
vers le bas), le profil du chapeau, la réception des ombres par les
falaises et la découpe du revêtement dans les bouches. Contrôles
visuels Chrome à 0, 218 et 306 px et en vue libre sur les deux tuyaux.
`npm run check` passe avec 469 tests Vitest. Les 49 tests Chrome passent.

## Finitions du pont et du dernier tronçon d’Intermediate Race

Chrome a été utilisé pour inspecter la tranche du pont levé, ses
pièces mécaniques, les deux tuyaux, la paroi du premier tuyau et
la cuvette finale. Les tests couvrent les normales importées, la
découpe d’une soudure, le matériau gris des sorties et les raccords
de la géométrie. `npm run check` passe avec 466 tests Vitest. Les
49 tests Chrome passent.

## Pont épaissi, ondulations et tuyaux d’Intermediate Race

Les tests couvrent les raccords des dalles, la tranche rigide du pont,
le placement du piston, les cadrages et les indices des faces importées.
Dans Chrome, le relevé local avec tuyaux affiche les deux bouches et
leurs raccords au parcours. Le cadrage bas permet de voir le tablier
et une partie du mécanisme en mouvement.

MAME 0.271 reproduit la disparition sous le ver et la casse suivie du
balai avec les deux commandes de `docs/PROTOTYPE_04.md`. Dans Chrome,
la sauvegarde du cœur Web restaure la position et le descripteur de
Practice Race lors d’une itération suivante. Les départs aux niveaux
2 à 6 n’ont pas été validés par restauration.
`npm run check` passe avec 458 tests Vitest. Les 49 tests Chrome passent.

## Pont articulé et ombres d’Intermediate Race

Le rejeu MAME 0.271 confirme le déplacement du bord libre, la hauteur
fixe de la charnière et un cycle de 144 images. Les tests vérifient
ces poses, les raccords d’angle, le volume de visibilité du tablier
et les surfaces inscrites dans la carte d’ombres.

Dans Chrome, les captures à 0 et 218 px montrent les ombres dans
les fosses et sur les rampes. À 306 px, le cadrage arcade montre le
pont. Les deux positions extrêmes ont aussi été vérifiées en vue
libre. Le mécanisme est une reconstruction visuelle et le cycle
de l’étude tourne indépendamment du cœur.
`npm run check` passe avec 439 tests Vitest. Les 49 tests Chrome passent.

## Pyramides d’Intermediate Race

Les trois socles ont été contrôlés en grille et à l’écran. Le test
vérifie les 14 dalles, le décalage de la dernière rangée et la hauteur
relative du chapeau. Le rendu a été comparé à la capture arcade à
218 pixels de défilement dans Chrome. `npm run check` passe avec
433 tests Vitest. Les 49 tests Chrome passent.

## Blocs isolés d’Intermediate Race

Les tests reconstruisent le dessus de quatre blocs représentatifs, dont
celui tronqué au bord du relevé. Ils vérifient les quatre dalles planes,
les huit faces de bord et les espaces entre les blocs.
Les quatre groupes ont été inspectés dans Chrome en vue arcade et en
vue oblique. `npm run check` passe avec 432 tests Vitest et les 49 tests
Chrome passent.

## Rebords d’Intermediate Race

Les captures Chrome à 0, 218 et 306 pixels de défilement ont été
comparées aux captures arcade. Les cinq rebords et les jonctions
retouchées suivent des arêtes droites. Les tests vérifient les parois
des fosses, leur intérieur en retrait et les coins complétés aux
emplacements relevés. `npm run check` passe avec 428 tests Vitest.

## Premier relevé d’Intermediate Race

Le rejeu `measure-terrain.mjs --intermediate` sous MAME 0.271 reproduit
la grille locale de 130 × 130 cellules. Le départ, la rampe à 218 pixels
et le plateau à 306 pixels de défilement ont été comparés sous Chrome
avec les captures natives. Le test navigateur charge le nouveau format
et déplace le cadrage. Les tests unitaires couvrent le format, les
profondeurs du niveau et le raccord des trois bandes de la grande rampe.
Les bords des fosses du départ et le décor au-delà du plateau restent
à affiner. La scène est disponible dans la page d’étude.
`npm run check` passe avec 422 tests Vitest. Les 49 tests Chrome passent.

## Rattrapage de J2 et espacement du chrono

Le rejeu MAME 0.271 reproduit la perte de cinq secondes après la sortie
de J2 par le haut de l’image. Les captures et les instantanés rejoués
dans Chrome vérifient l’absence du message pendant la reconstruction,
son apparition et son retrait. Le cas complet avec les entrées du cœur
Web reste à reproduire en jeu. Un test navigateur vérifie le pixel gris
entre les deux chiffres de « 55 ». Les tests de pose et de scène
couvrent la durée commandée par le cœur et l’ancrage à la bille.
`npm run check` passe avec 420 tests Vitest. Les 48 tests Chrome passent.

## Arrivée en duo et rendu de la dernière descente

Deux rejeux MAME 0.271 font passer les billes dans les deux ordres. GOAL
prend la couleur du premier arrivé et la conserve au second passage.
Le bilan précède Intermediate Race. Les tests couvrent la lecture du
premier joueur, les deux palettes et leur conservation au second passage.
Dans Chrome, dix instantanés de ces rejeux passent par `readPracticePose`
et la scène réelle. Ils confirment les palettes avant et après l’arrivée,
y compris quand la première bille est masquée, et la désactivation de la
3D au bilan puis à Intermediate Race. Le parcours complet avec le cœur
Web et le pilotage au clavier reste à valider en jeu.
Le cadrage de la fin dans Chrome confirme les joints crénelés, le tramage
discret des dalles et la continuité des parois jusque sous le cadre.
Les tests vérifient que le prolongement des parois laisse les lèvres et
les marches à leur niveau relevé.
`npm run check` passe avec 418 tests Vitest. Les 48 tests Chrome passent.

## Précision des billes à faible vitesse

Le rejeu sans commande atteint une pose stable après la pente de départ.
Un autre rejeu avec impulsions reproduit un va-et-vient à faible vitesse.
Le test de lecture reprend les mots entiers et fractionnaires de ce
rejeu. Il vérifie que le mouvement garde son amplitude d’origine. Les
tests de lecture couvrent les coordonnées signées et les deux joueurs.
Dans Chrome avec le vrai cœur, le comparatif garde les deux billes en
jeu pendant la chute et la réapparition de J2. Le tremblement signalé
sur la machine de Michel reste à confirmer après la mise à jour.
`npm run check` passe avec 415 tests Vitest et les 48 tests Chrome passent.

## Nombre et position des éclats de réapparition

Le rejeu solo MAME 0.271 image par image a servi à compter les huit
éclats et à mesurer l’ellipse par rapport au point de reprise. Le test
de scène vérifie le nombre, l’envergure et le décalage au compteur 16,
la convergence puis la remise en place de la bille. Dans Chrome avec
le vrai cœur, le comparatif de la chute J2 aux compteurs 17, 13, 8 et 2
montre l’ellipse se resserrer vers la bille. La position des éclats
reste une approximation du relevé arcade.
`npm run check` passe avec 414 tests Vitest et les 48 tests Chrome passent.

## Orbite des éclats et pyramide droite

Le jeu Chrome avec le vrai cœur montre les quatre éclats rouges au-dessus
du décor aux compteurs de reconstruction 17, 13, 8 et 2. La bille reprend
sa place à la fin. Le test de scène vérifie le sens antihoraire dans les
trois cadrages, le rayon commun décroissant et les couleurs de J1 et J2.
Le même comparatif montre la face droite de la pyramide dégagée. Le test
du terrain reprend deux dalles de support à un coin manquant, vérifie
le palier plat sur les deux emprises et l’absence de paroi interne.
`npm run check` passe avec 414 tests Vitest et les 48 tests Chrome passent.

## Réapparition et ombres nettes

Le rejeu natif a confirmé le compteur de reconstruction de J1 et J2.
Dans Chrome avec le vrai cœur et le relevé complet, une chute de J2
provoquée par Q et S affiche les éclats rouges et dorés dans le comparatif.
La pose au compteur de reconstruction 10 reste figée pendant la pause.
La bille complète revient après la reprise. Les tests vérifient la
convergence des quatre éclats, leur retrait, et la conservation du même
point lors de deux rendus d’un même instantané.

Les ombres de décor ont été inspectées sous Chrome au départ de la
course. L’option **Ombre des billes** est décochée par défaut.
À la même pose en pause, l’activer affiche l’ombre de J1. Le test de
scène vérifie l’ajout et le retrait des deux billes, et le test
navigateur vérifie la synchronisation de l’option entre les deux menus.
`npm run check` passe avec 413 tests Vitest et les 48 tests Chrome passent.

## Duo, continuité du terrain et aide H

Dans la vidéo de Michel, le panneau droit bascule sur le message de
repli autour de 22,5 secondes alors que le chrono arcade continue.
Le test Chrome avec un relevé complet conserve la vue 3D après une
excursion hors des bornes du défilement et de la grille. Le saut de la
vidéo n’a pas été rejoué avec ses commandes d’origine.

Une partie à deux dans Chrome avec le vrai cœur et les archives locales
confirme les deux positions, les scores séparés et les deux chronos.
En maintenant Q et S pour J2, la reconstruction est observée au compteur
1372 avec J1 toujours visible. La bille rouge réapparaît et la vue 3D
reste active. Les captures montrent notamment J2 à 110 points et J1 à
0 puis 10 points.

Le panneau H a été ouvert puis refermé en capture avec le vrai cœur.
Le test navigateur vérifie également le bouton, le passage aux flèches
et la priorité de la saisie dans les champs.
`npm run check` passe avec 412 tests Vitest et les 48 tests Chrome passent.

## Caméras de Practice Race

Dans Chrome avec le vrai cœur et le relevé complet, le survol suit le
compte à rebours de 0 à 1, avec passage par zéro de l’octet source.
Les captures ont été contrôlées au cadrage d’ensemble, au milieu du
survol et au début de la course. Le chrono affiche 60 au retour au
cadrage arcade. Le suivi, la vue du dessus et le changement de champ
ont été contrôlés en pause. La pose et le compteur d’itérations restent
stables lors des changements de cadrage.

Les tests Vitest couvrent les bornes du champ de vision, la projection
orthographique, le décodage du compte à rebours et le suivi de la bille.
Le scénario navigateur vérifie C, + et − en capture, le menu en pause,
la synchronisation page et vue immersive et l’abonnement vidéo unique.
`npm run check` passe avec 408 tests Vitest et les 47 tests Chrome passent.

## GOAL, drapeaux et soulèvement du départ

Les poses 1860 et 1920 du rejeu local ont été contrôlées dans Chrome.
Le lettrage GOAL à empattements reste sur le premier pan de la rigole,
dans ses palettes grise et bleue. Les drapeaux utilisent trois cases
alternées par rangée et deux rangées par côté. Les tests vérifient
les palettes, la transparence au-delà du lettrage et le damier.

Avec le vrai cœur Web, un départ sans intervention a traversé les cinq
positions au compteur 1340 à 1356, puis les positions inverses jusqu’au
retour à plat au compteur 1566. Le comparatif figé à la hauteur maximale
montre la pente sous la bille des deux côtés. Les tests couvrent le
décodage, les dimensions de la pente, ses parois et le retour au sol plat.
`npm run check` passe avec 402 tests Vitest et les 47 tests Chrome passent.

## Apparence arcade du HUD et orientation des décals

Le comparatif Chrome avec le vrai cœur Web montre le score et le chrono
superposés au terrain, avec les palettes bleue, grise et noire relevées
dans le jeu. La comparaison a été contrôlée au départ puis à 50 secondes.
Le test navigateur vérifie la transparence hors du HUD, les couleurs
des glyphes et le cadrage 4:3. Les caractères sont redessinés en bitmap.

Les trois marquages 3–4–5–6 ont été comparés dans Chrome sur la pose 1920
du rejeu MAME 0.271. Le test de texture vérifie le sens du 6 et la
conservation de la flèche. Le test de scène vérifie que les deux marquages
de droite partagent leur matériau et que celui de gauche utilise sa variante.
`npm run check` passe avec 399 tests Vitest et les 47 tests Chrome passent.

## Score et chrono en 3D

Le rejeu MAME 0.271 associe les tuiles du HUD aux valeurs de la capture
sur trois poses. À l’image 1199, le HUD affiche 0 et 58, à 1500 il affiche
150 et 53, puis à l’arrivée (1920), 1 270 et 47. Une seconde partie,
laissée au départ, confirme le passage à 00. Les tests Vitest vérifient
ces formats, les tuiles incomplètes et les lectures hors limites.
Les 47 tests Chrome passent, y compris l’affichage en 3D et en comparatif,
le zéro initial du chrono `07` et le retrait du HUD hors de Practice Race
sur une pose injectée. Avec le vrai cœur Web, la capture de départ
montre 0 et 58 dans les deux vues. Le passage en vue directe puis le retour
à la 3D et au comparatif pendant la pause conservent ces valeurs.
En course, le HUD correspond aux tuiles du cœur Web sur les images
contrôlées jusqu’à 100 points et 18 secondes. Le rejeu de commandes
s’arrête sur le premier tronçon. L’arrivée a donc été vérifiée par le
rejeu natif et par le test navigateur avec une pose injectée.
`npm run check` passe avec 398 tests Vitest.

## Joints sous les marquages de Practice Race

Les tests de texture vérifient que les joints laissent voir le dallage
dans les deux palettes GOAL et sous les marquages numérotés. Le rendu
a été contrôlé sur les poses 1740, 1860 et 1920 dans Chrome.
`npm run check` passe avec 394 tests Vitest.

## Marquages numérotés, drapeaux et bannière d’arrivée

Le rejeu MAME 0.271 montre la bannière grise à l’image 1860 et bleue
pendant l’animation 6 à l’image 1920. Les tests couvrent le placement des
trois marquages, les deux palettes, la lecture de l’état d’arrivée et le
mouvement du drapeau autour de son attache fixe.
Les poses 1860 et 1920 et le déplacement de la toile ont été contrôlés
sous Chrome. `npm run check` passe avec 394 tests Vitest et la suite
Chrome passe avec 47 tests.

## Raccords dans la descente jusqu’à l’arrivée

Les tests vérifient la suppression des faces verticales à l’intérieur des
virages, la continuité du bord final, la conservation d’une ouverture
adjacente et l’appui du marquage d’arrivée sur le maillage corrigé.
Le rejeu MAME 0.271 termine Practice Race et atteint Intermediate Race.
Les trois captures Chrome aux poses 1740, 1860 et 1920 montrent la descente
et le passage sur le damier. `npm run check` passe avec 390 tests Vitest et
les 47 tests Chrome passent.

## Ombres portées au bord des falaises

Les tests vérifient la réception des ombres sur le relief et la flèche
centrale, et leur désactivation sur les bandes verticales. La vue en jeu
est aussi testée avec la bille et les garde-corps dans la carte d’ombres.
Le comparatif à la pose de référence sous Chrome montre les ombres au sol
et les bandes verticales dégagées. `npm run check` passe avec 385 tests
Vitest et les 47 tests Chrome passent.

## Flèche, petites pyramides et rigole de Practice Race

Le rejeu MAME 0.271 avec `--finish` atteint Intermediate Race et fournit
l’image 1500 pour le pont et la rigole. Les tests vérifient l’orientation
de la flèche, le retrait de la crête sous les pyramides, la continuité
des rebords et l’absence de parois internes entre les dalles de la rigole.
Le comparatif navigateur utilise la pose et le défilement de l’image 1500.
Le profil du virage de la rigole reste une approximation du relevé.
`npm run check` passe avec 384 tests Vitest et les 47 tests Chrome passent.

## Rupture de pente et marches sous les deux pyramides

Les tests vérifient la largeur de l’épaule, la différence d’inclinaison
entre les deux pans, l’écart de niveau au-dessus des trois marches de
chaque pyramide, ainsi que le raccord du socle au palier.
Le gros plan comparatif avec le cœur arcade a été contrôlé dans Chrome.
`npm run check` passe avec 379 tests Vitest et les 47 tests Chrome passent.

## Calage du joint entre le chapeau et le socle

Les joints du dallage au-dessus de la tour donnent localement un décalage
vertical de sept pixels natifs entre les deux vues. La ligne au premier
plan du raccord se situe autour de la ligne 149 dans la capture arcade.
Le test reprojette cette arête, contrôle l’altitude de la pointe et vérifie
la largeur des pierres centrales. Le raccord au palier reste testé.
Le gros plan avec les grilles superposables a été contrôlé dans Chrome.
`npm run check` passe avec 378 tests Vitest et les 47 tests Chrome passent.

## Proportions des pierres du socle

Le test vérifie le niveau commun du socle et du palier abaissé, l’altitude
constante de la pointe et la largeur de la pierre centrale à ses deux bords.
Le gros plan comparatif en jeu a été contrôlé sous Chrome.

## Proportions et joints des pyramides

Les tests couvrent les trois pierres du socle, la hauteur de l’épaule
et du chapeau, le raccord au palier et la convergence du joint du
chapeau vers la pointe.
Le gros plan côte à côte a été vérifié en jeu sous Chrome. `npm run check`
passe avec 378 tests Vitest et les 47 tests Chrome passent.

## Chapeau des pyramides et éléments réutilisables

Les tests vérifient la hauteur du chapeau, le raccord du socle au palier
et la construction de garde-corps droits ou en angle. Deux garde-corps
construits à partir des mêmes points peuvent recevoir des matériaux distincts.
Le profil est comparé à l’arcade en jeu sous Chrome. `npm run check`
passe avec 377 tests Vitest et les 47 tests Chrome passent.

## Jonction des pyramides et de leur palier

Le test aplanit les deux paliers de 3 × 3, vérifie l’absence de paroi
interne entre leurs dalles et contrôle l’égalité de la hauteur d’appui
avec la base des pyramides. La marche suivante reste testée séparément.
Le gros plan en jeu confirme le raccord au bord du palier sous Chrome.
`npm run check` passe avec 376 tests Vitest et les 47 tests Chrome passent.

## Appui des garde-corps et bases des pyramides

Les tests vérifient l’appui d’un poteau sur un triangle en pente et
l’alignement de la traverse à ses extrémités. Les faces en relief des
socles sont vérifiées par leurs sommets, et le test de palette contrôle
la diagonale jaune ainsi que l’orange au pied du panneau.
Le gros plan comparatif a été vérifié dans Chrome avec le cœur arcade.
`npm run check` passe avec 376 tests Vitest et les 47 tests Chrome passent.

## Rebord sous la rambarde gauche

Les tests vérifient la continuité de l’arête sous les dalles complétées,
la position du poteau haut, les bandes du pan orange et de son retour
jaune, ainsi que les joints du socle des tours.
Le comparatif avec le cœur arcade sous Chrome permet de vérifier le rebord
continu et la palette. Le relief du socle reste une approximation.
`npm run check` passe avec 375 tests Vitest et les 47 tests Chrome passent.

## Lumière directionnelle de Practice Race

Le test reprojette la direction mesurée et retrouve le décalage de 22 × 3
pixels pour un poteau de 6 pixels à l’écran. Les tests de géométrie couvrent
le raccord au sol à gauche de la fosse, le profil resserré des tours et les
dimensions relatives des pointes des flèches. Le cœur arcade et le relevé
complet ont servi à la comparaison dans Chrome. Les silhouettes d’ombre
dépendent des reliefs et des objets reconstruits.
`npm run check` passe avec 373 tests Vitest et les 47 tests Chrome passent.

## Palette par zone et décor de Practice Race (itération précédente)

La projection des centres de dalles dans l’image 1199 donne les gris
135, 169, 186 et 220 sur les panneaux de 3 × 3. Les tests contrôlent le
calage et le changement de palette au palier, les couleurs des parois
centrales, les trois hauteurs des tours et les espaces entre les pointes
des flèches. La pente reste utilisée en dehors de la carte d’ouverture.
Contrôle visuel côte à côte sous Chrome avec le cœur arcade et le relevé
complet. Les ombres restent calculées à partir du relief 3D et la forme
des tours reste une approximation. `npm run check` passe avec 373 tests
Vitest et la suite Chrome passe avec 47 tests.

## Pente des panneaux et raccords de Practice Race

Les tests contrôlent la teinte commune des neuf dalles d’un panneau, la
teinte identique de deux panneaux parallèles et la différence entre
panneaux de pentes distinctes. Ils couvrent aussi les marches planes, les
pieds épaissis et l’arête orange continue à la jonction avec le terrain.
La comparaison en jeu avec le cœur local confirme visuellement la nouvelle
répartition des gris et la disparition des dents de scie sur le bord droit.
Le profil exact des marches et les nuances des parois centrales restent
approchés. `npm run check` passe avec 370 tests Vitest. La première passe
Chrome a échoué sur un test de caméra après perte du montage de test. Les
47 tests passent à la relance en série, sans édition du code pendant le test.

## Blocs de dalles et fosses latérales (itération précédente)

Les échantillons gris relevés dans la capture d’ouverture présentent
une période de six cellules dans les deux axes. Les blocs de 3 × 3
sont calés à la cellule 2 modulo 3. Les tests vérifient le même calage
dans les relevés de différentes tailles, l’échantillonnage propre à
chaque fosse et le prolongement du dallage au bord supérieur.
`npm run check` passe avec 367 tests Vitest. Les 47 tests Chrome passent
en série. Deux tests de commandes avaient échoué lors de l’essai en parallèle.

## Couleurs des fosses latérales de Practice Race

La capture arcade locale situe le changement de palette aux colonnes
63 et 255. Le test vérifie que le motif suit ces repères dans les deux
fosses et que les faces voisines utilisent les bandes habituelles.
La transition oblique jaune est approchée.

## Matériaux du trou central de Practice Race

La comparaison Chrome avec le vrai cœur et le relevé complet montre
les dalles gris neutre, les joints noirs, les parois jaune et orange,
les pointes claires, les garde-corps rouges et les deux flèches au sol.
Les tests vérifient le raccord des bandes de couleur entre deux faces
et l’application d’un marquage en pente avec des cellules absentes.
Le relief des marches reste approché. `npm run check` passe avec
364 tests Vitest et les 47 tests Chrome passent.

## Décor et marges de Practice Race

Les neuf captures du rejeu MAME en 336 × 240 ont chacune 24 pixels noirs
à gauche et à droite. Le test de la caméra vérifie les deux marges et
la projection des repères arcade. Les tests des maillages couvrent les
garde-corps, les pointes, les ouvertures et les faces entre deux marches.

Les captures du vrai cœur MAME dans Chrome, au départ puis en mouvement,
montrent les marges alignées, les garde-corps rouges, les deux pointes
et les parois du trou central. Les formes et la profondeur restent
approchées. `npm run check` passe avec 362 tests Vitest et les 47 tests
Chrome passent.

## Bascule et comparaison du rendu moderne

Chrome avec le cœur MAME et les archives locales affiche l’arcade à gauche
et la 3D à droite dans la même partie. Pendant la capture, V bascule de
l’original à la 3D et Maj+V active le côte à côte. Le verrouillage reste
sur le canvas de MAME. Le scénario navigateur vérifie aussi le maintien
du boost, le menu en plein écran, la comparaison en pause et l’absence
d’un deuxième abonnement. Hors du relevé, seul le panneau moderne
est remplacé par un message. `npm run check` et les 47 tests Chrome
passent.

## Practice Race du départ à l’arrivée

Le banc MAME 0.271 en mode `--finish` produit le même relevé aux images
1199, 1500, 1740, 1860 et 1920. Le mot de défilement passe de
`-16144` à `-15784`. La bille franchit l’arrivée à la fin du mode de
course, puis Intermediate Race est chargé à 1965. Le fichier placé dans
`local-roms/` correspond octet pour octet à l’export.

Le cœur Web atteint la bande balisée à l’itération 2044, le bilan
arcade à 2104 et Intermediate Race à 2146. Les captures Chrome montrent
le départ, la descente et l’arrivée en 3D. Sur les 948 itérations
communes (1199–2146), les coordonnées X et Z à précision fixe, le
défilement, le descripteur de niveau et les états de la partie et de
la bille sont identiques en Arcade et en 3D. La comparaison du score
et du chrono reste à faire. Les pentes du dernier toboggan restent
approximatives. Le décor, le HUD et le cas J2 restent à compléter.

`npm run check` passe avec 349 tests Vitest et les 46 tests Chrome passent.
Les rejeux MAME des relevés courts et de l’arrivée passent également.

## Chute et réapparition sur la première rampe

Rejeu Chrome avec le vrai cœur Web et le relevé élargi. Les commandes natives
`(-22, 22)` sont injectées avant les itérations 1200 à 1529. La bille est
visible à l’image 1440 (défilement `-16118`), absente à 1478
(`-16086`), en reconstruction à 1525 (`-16076`) et de retour à 1610
au point (284, 196), hauteur 16360. Les quatre captures montrent le
terrain en 3D. La bille et son ombre sont absentes sur les deux captures
intermédiaires et reviennent ensemble. Le cadrage continue pendant la chute
et reste stable au point de reprise. Le rejeu MAME 0.271 au bord supérieur
fait aussi la différence entre disparition et reconstruction.

Les tests unitaires couvrent la lecture des états connus, les valeurs
inconnues, la poursuite du cadrage pendant la disparition et la reprise
sans rotation artificielle. Le test Chrome compte les pixels bleus sur le
canvas pour vérifier la disparition et le retour, avec une seule source.
`npm run check` passe avec 346 tests Vitest et les 45 tests Chrome passent.
Les chutes sur le parcours complet et J2 sont à vérifier.

## Roulement, ombre et premier défilement

Le test NullEngine vérifie le sens de rotation, l’arrêt de la rotation à
position constante, la reprise après une pose absente, le lien entre la
bille et la carte d’ombre, ainsi qu’un décalage de 20 pixels natifs sans
déplacement horizontal. Le test Chrome automatisé maintient le rendu
moderne pendant le défilement mesuré et vérifie le repli hors de ses
bornes sans nouvel abonnement vidéo.

Le rejeu sous MAME 0.271, repris par `scripts/measure-terrain.mjs --scroll`,
observe les lectures +10, +20, +30, +39 et +48 par rapport au départ.
Les déplacements trouvés dans les images sont respectivement de −7, −17,
−27, −37 et −46 pixels natifs, avec au moins 99,3 % des pixels de fond
échantillonnés identiques après translation. Les exportations du maillage
sont identiques aux images 1199, 1399, 1450, 1500 et 1630.

Dans Chrome avec les ROM locales, le rejeu de J1 montre le motif en
rotation, l’ombre visible à droite et sous la bille et le terrain qui
remonte après le début du défilement. La lecture passe de `-16144`
à `-16134` avant la capture en mouvement. La 3D reste active à la capture.
Le rejeu de contrôle sans `--scroll`, `npm run check` (343 tests Vitest)
et les 45 tests Chrome passent.

## Bille entière en vue 3D

Le test NullEngine vérifie que le bas de la sphère touche le plan à la
hauteur de départ et monte avec la hauteur lue dans MAME. Dans Chrome avec
les archives locales, la capture de départ montre le cercle entier.
Les diagnostics de déplacement passent de (140, 140, 16384) à
(166, 153, 16380), avec la vue 3D toujours active. `npm run check` passe
avec 340 tests Vitest. Le scénario Chrome ciblé sur la bascule arcade passe.

## Practice Race en 3D pendant la partie

Chrome avec le cœur épinglé et les archives locales a chargé le relevé de
20 × 14 cellules, affiché la bille bleue sur le terrain et conservé la vue
moderne pendant le mouvement. Les diagnostics donnent (X, Z, hauteur)
(140, 140, 16384) à la frame 1193, puis (163, 151, 16381) à la frame 1253.
Le retour manuel en vue directe a réussi. Les commandes trackball ont été
injectées pour reproduire cette trajectoire.

`npm run check` passe avec 339 tests Vitest. Les 45 tests Chrome passent.
Le nouveau cas synthétique couvre l’entrée
sur le tronçon, le repli hors limite ou hors cadrage, et la conservation
d’un abonnement vidéo sans copie arcade pendant le rendu moderne.
Les essais de défilement réel, chute, redémarrage de la bille, jeu
au trackpad ainsi que la comparaison complète d’un rejeu restent à faire.

## Entrées indépendantes J1 et J2

Chrome 157.0.8103.51 avec le vrai cœur et deux crédits. Après Start J2 et
capture, D a fait passer les compteurs de J2 de (0, 0) à (85, 85), avec
rotation de la boule rouge. Les compteurs et la boule bleue sont restés fixes.
Un mouvement de pointeur a ensuite changé les compteurs de J1 et la rotation
de sa boule, avec les compteurs de J2 toujours à (85, 85). Échap, pressé pendant
Z, a libéré la capture. Les compteurs, les orientations et la frame sont
restés stables pendant la pause. Le test Chrome sans ROM couvre le remappage,
la mémorisation et le relâchement des touches.

## Moniteur incliné et rotation des trackballs

La vue Moniteur incliné se place entre Frontale et Écran et commandes.
Le cadrage a été examiné dans Chrome avec le niveau 1 affiché. Les tests
couvrent le cycle avec capture et boost, ainsi que la rotation indépendante
des deux boules. Le glisser sur la boule rouge fonctionne en pause.
`npm run check` passe avec 289 tests. Les 35 tests Chrome passent.

## Borne Atari System I — 13 novembre 2026

Les tests NullEngine couvrent le cadrage sur le moniteur incliné, le rapport
de la vidéo, l’encombrement fixe du meuble et la rotation indépendante de la
trackball gauche. La suite Chrome vérifie les boutons Start, les retours
de monnaie, la capture et le cycle des vues.

Sur le vrai cœur local, les quatre cadrages ont été examinés à 1 440 × 1 000
avec le niveau 1 affiché. Les quatre textures ont répondu HTTP 200 et Chrome
n’a signalé aucune exception JavaScript. L’affichage rapproché montre les
deux boules, les boutons et l’image du jeu. La commande de déplacement
disponible sur ce prototype pilote J1.

`npm run check` passe avec 288 tests. La suite Chrome passe avec 34 tests.
Les quatre tests de navigation ont aussi été rejoués après l’ajout de la
vérification du cadrage de la trackball droite.

## Changement de cadrage avec C

Le test unitaire vérifie la boucle des quatre cadrages. Le test Chrome
vérifie les deux sélecteurs, la position à l’image de l’écran et des commandes,
la conservation de Pointer Lock et du boost maintenu, et l’absence d’effet
de Ctrl+C, de la répétition, des frappes hors capture et de la vue directe.
Un essai Chrome 157.0.8103.51 avec le vrai cœur a parcouru les quatre vues
pendant que la partie avançait, avec capture maintenue et zéro erreur JS.
La capture de la vue rapprochée à 1280 × 900 a révélé un recouvrement
du bas de l’écran par le panneau. Après avoir abaissé son bord supérieur,
une nouvelle capture montre toute l’image et les commandes.
`npm run check` passe avec 289 tests. Les 34 tests Chrome passent.

## Sens de rotation de la boule 3D — 10 novembre 2026

Les tests NullEngine suivent un point du sommet après un geste diagonal
préalable. Les quatre directions et la diagonale déplacent ce point dans
les axes attendus de la borne. Un delta horizontal de 870 garde le point
sur l’hémisphère supérieur et du bon côté. `npm run check` passe avec 288
tests, et la suite Chrome avec 33 tests.

Chrome 157.0.8103.40, vrai cœur et caméra Borne. Après une mise en orientation
initiale, deux gestes de souris sous Pointer Lock ont produit une rotation
d’environ 23° chacun. Le geste vers le bas a tourné autour de −X et le
geste vers la droite autour de −Z. Les composantes orthogonales mesurées
étaient nulles à la précision numérique. Les captures avant et après ont
été examinées avec l’écran arcade visible.

Mesure distincte de la bille du jeu dans le build de production. Cinq
sessions fraîches partent de la même position au début du niveau 1. Le
banc envoie six échantillons de 64 unités sur un seul axe à partir de la
frame 1200 et vérifie les deltas effectivement lus. Le déplacement en
pixels du marqueur bleu est mesuré entre les frames 1199 et 1212.

| Commande | ΔX écran | ΔY écran |
| -------- | -------: | -------: |
| Neutre   |     0,00 |     0,00 |
| Droite   |    +9,73 |    −3,89 |
| Gauche   |   −10,14 |    −3,92 |
| Bas      |    −0,18 |    +2,99 |
| Haut     |    −0,11 |    −7,41 |

En comparant les sens opposés, droite et gauche diffèrent de 19,87 px
en X et de 0,04 px en Y. Haut et bas diffèrent de 10,39 px en Y et de
0,06 px en X. Sur ce départ, inverser un geste inverse donc le déplacement
sur son axe principal. Le décalage vertical des deux gestes horizontaux
est quasiment identique. Cette mesure locale ne couvre ni les pentes ni
les grandes impulsions. Le ressenti au trackpad physique reste à vérifier.

## Prototype 03 — bar explorable, 10 novembre 2026

Les tests unitaires couvrent les collisions, la rotation du regard, la vitesse
à 60 et 120 pas par seconde, le transfert de capture et son annulation, la
rotation de la boule, le mixage et les plafonds de résolution.
284 tests dans 32 fichiers. Couverture de 99,58 % des instructions, 99,30 %
des branches, 100 % des fonctions et 99,55 % des lignes.

Chrome 157, 33 tests navigateur réussis. Le scénario de visite vérifie que le
canvas BabylonJS détient la capture, puis E la transfère au jeu. Les touches de
marche, de crédit et de boost sont isolées. Échap et Quitter la borne nettoient
les états. La suite couvre le refus de capture, les ratios à DPR 2, la rotation
du mesh, le picking et la destruction de la scène en cours de transition.
Le test Web Audio hors ligne retrouve le canal droit à 0,3125 sous atténuation
et panoramique, puis les deux canaux à 0,5 après restauration de la voie directe.
Les trois tests preview ont réussi sur le build de production.

Vrai cœur et archives sélectionnées localement dans Chrome 157.0.8103.40.
Le son positionnel a produit un signal mesurable en partie. Un pas latéral a
fait passer la distance de 2,82 à 2,90 m et la balance de 0 à −0,23, avec une
seule source audio. E a restauré le routage arcade. Échap a figé la frame 1227
et purgé boost et deltas en attente. Aucune erreur JS pendant ce parcours.
Les vues Borne, marche, Bar et Frontale ont été inspectées visuellement.
Sur le serveur de développement, cinq échantillons natifs non nuls ont
entraîné une rotation mesurée de la boule de 1,854 rad sur X et −3,396 rad sur Z.
Les mesures sont dans `third_party/prototype03-evidence.json`.

Sur un viewport Chrome à DPR 2, les largeurs du framebuffer étaient 1256,
1884 et 2512 px. Le navigateur a fourni les horodatages GPU. Ces premiers
échantillons ont été relevés en pause, avec compilation et redimensionnement.
Ils vérifient l’instrumentation et les tailles, avec trop peu de données pour
comparer les temps GPU entre profils.

Endurance de production terminée après 600,008 s actives. Le parcours a
transféré la capture du bar au cœur, puis vérifié dix pauses stables, des
entrées purgées, une source audio et le routage direct en jeu. Frame finale
36 796, 36 094 copies, zéro erreur JS ni requête distante. Sur l’ensemble de
ce parcours, CPU moyen de rendu de 0,554 ms, maximum de 36,9 ms, moyenne
GPU de 0,429 ms sur 18 061 échantillons. Ces valeurs agrègent plusieurs
cadrages à DPR 1, avec d’autres vérifications au début de l’essai. Elles ne
permettent pas d’inférer les temps GPU en Retina ni la fluidité à 120 Hz.
Le rapport complet est dans `third_party/prototype03-endurance-evidence.json`.

Safari WebDriver 17.4.1 a refusé la session car « Autoriser l’automatisation
à distance » est désactivé. Le WebKit de Playwright (build 2251) démarre,
puis dépasse le délai à l’ouverture d’un onglet avant d’atteindre le projet.
Dans Safari, démarrer la session avec les archives locales et vérifier
Explorer → E → Échap, puis les trois profils de rendu. À 120 Hz, vérifier
la fluidité du regard et la stabilité de la vidéo dans ce même parcours.
L’écoute et le confort du trackpad restent à apprécier sur le Mac de Michel.

## Prototype02 — borne et premier bar,10novembre2026

Périmètre1–5 explicitement autorisé par Michel. Implémentation complète : meuble
et enseignes, boule/commandes/monnayeur, bar meublé, matériaux et quatre lumières,
cadrages Bar/Borne/Frontale avec transition0,65s. Même émulateur et texture,
aucune nouvelle physique ou chaîne audio. Spécification02 et AGENTS mis à jour.

Unitaires/NullEngine : **250 tests /27 fichiers**, check format/lint/types/build
réussi, couverture99,48 % instructions,99,34 % branches,100 % fonctions,99,45 %
lignes. Nouveaux résolveur d'actions et progression temporelle, construction/
destruction du décor, marge sous l'image pour la boule, caméra unique et retarget
sur resize, transition en pause. Aucun seuil abaissé ou nouveau code exclu.

ChromeGPU : **29 tests réussis** ; **3 tests preview réussis**. Vidéo animée/couleurs
et modes existants conservés. Vrais clics de souris sur les meshes projetés :
Crédit, Start1/2, monnayeur et boule. Capture PointerLock depuis cette dernière,
clics ignorés pendant capture, curseur de survol, transition sans nouvelle vidéo,
annulation/destruction avec textures générées et tous les autres compteurs de
ressources à zéro. Un test supplémentaire vérifie StartJ2 en pause puis actif.
Les imports ray classiques enregistrent le vrai picking, pas de façade fictive.

Premiers passages : contexte perdu/rechargements lors des nouvelles dépendances
Vite et helper temporairement sans scène ; le helper réutilise maintenant
Engine.LastCreatedScene via le même import Engine que la production, sans
nouvel import tardif EngineStore à préoptimiser. Passage stable ensuite. Le point
projeté était hors viewport sur la longue page : scroll ajouté dans le banc,
les vrais clics plein écran fonctionnaient. L'inspection visuelle a révélé les
enseignes inversées et une boule devant l'image ; upload vertical corrigé et
deck abaissé, nouveau test de marge. PointerEvent.button vaut−1 en survol :
correction et assertion de curseur avant les clics. Aucun comportement masqué
par suppression de test. Les derniers passages complets sont réussis.

Vrai runtime Chrome157.0.8103.40, archives locales : Crédit et Start via boutons3D,
entrée en jeu depuis la boule, frontale/capture réelles ; Échap purge boost,
pending(0,0), boutonsJ1/J2 vides. Retour bar en pause n'avance pas le cœur,
frame finale1115 stable,402 copies, source audio1, zéro erreurJS. Captures finales
/tmp/marble-prototype2-bar.png, cabinet.png et game.png examinées : enseignes
droites, pièce et meuble visibles, vidéo entière sans boule par-dessus. Preuve
numérique sans ROM/image/état : third_party/prototype02-evidence.json.

**Endurance02 production réussie** : après une série2min arrêtée pour le survol
et une série6min interrompue par HMR, un nouveau test intégral a utilisé le build
statique4175 et --local-files (ZIP du dossier roms sélectionnés dans les champs,
validateur habituel, aucune copie/upload). Dix nouveaux intervalles, **600,02s
actives**, frame36772,36063 copies, zéro erreurJS ou requête distante. Dix pauses
stables, boost/pending/boutonsJ1/J2 vides. Trois caméras, comparaison/direct et
retour3D, deux tailles de viewport, captures et reprises. Aucune minute reprise
ou assemblée avec les essais interrompus. Preview4175 arrêté après le test.
Rapport final scene=prototype-02-cabinet-bar, localFileSelection=true,
complete=true : third_party/prototype02-endurance-evidence.json.

Moyennes cumulées CPU du callback vidéo0,459–0,550ms, maximum9ms : le rendu rAF
de transition et la complétion GPU ne sont pas inclus. Pas un benchmark fin
entre caméras, les dimensions changent et d'autres contrôles ont coexisté au début.
HeapJS16,73–28,87Mio avec retours après GC ; nodes4646–4693, documents1.
Listeners721 au premier relevé puis720 stables ; source audio1 et contexte
suspendu aux pauses. Pas de dégradation bloquante observée pendant ce test,
pas de preuve universelle d'absence de fuite WASM/GPU, d'écoute ou de confort
physique. Les états arcade peuvent inclure fin de partie/attract. Safari/120Hz
restent ouverts.

**Picking production vérifié séparément**, sans module/helper dev ni accès à
une scène de test : clics natifs projetés depuis les coordonnées/caméra déclarées
de la borne. Crédit puis Start produisent [0,2,1]/[0,2,0] et [0,3,1]/[0,3,0],
la boule capture et choisit la frontale.64 copies dans ce court test, Échap en
pause, pending(0,0), zéro erreurJS. Cela vérifie l'enregistrement du picking et
la capture dans le code compilé. Preuve : third_party/prototype02-production-evidence.json. Les tests permanents sans ROM restent29 Chrome et3 preview.

## Raccourcis de capture — 10 novembre 2026

Demande explicite de Michel, section16 spec : Crédit5/(, StartJ1 1/&, StartJ2 2/é.
Implémentés par un résolveur pur de touches, gate capture/non suspendu/hors saisie
et modificateurs. Répétitions absorbées. StartJ2 port1, impulsions120ms indépendantes
et purge des deux ports à chaque interruption ; aucune entrée relative J2 ajoutée.

Tests : **231 tests /25 fichiers**, npm run check réussi ; couverture99,48 %
instructions,99,31 % branches,100 % fonctions,99,44 % lignes. **27 tests Chrome**
et **3 tests preview** réussis. Six alias + modificateurs/composition/touches
étrangères en unitaires ; indépendance/purge des deux ports et timer annulé.
Chrome : capture réelle, maintien sans répétition, aliases, saisie, Ctrl/Alt/Cmd,
Échap et démontage. Premier essai interrompu car Playwright.press ne connaît pas
é ; remplacement par Chrome CDP Input.dispatchKeyEvent pour cette touche,
sans événement DOM synthétique. Typage de l'événement CDP corrigé par union const.

Vrai runtime : observation des douze appels simulateInput attendus pour les six
alias, ports0/1 et pressions/relâchements conformes. L'endurance de dix minutes
est maintenant terminée ; résultat et limites ci-dessous. La commande npm run measure:endurance est permanente,
hors CI et sans ROM dans les tests unitaires/navigateur. Protocole ENDURANCE.md.

## Endurance automatique du vrai runtime — 10 novembre 2026

Chrome157.0.8103.40, propre contexte et ROMs locales validées par l'app ; aucune
archive téléchargée/copée/modifiée. **Dix intervalles terminés**,600,40s actives
plus interruptions, frame finale36794 et36090 copies. Mouvements et boosts
périodiques, Échap pendant boost, dix pauses stables ; pending(0,0), boutons
J1/J2 vides et boost purgé à chacune. Neuf réentrées/captures, caméras alternées,
comparaison puis direct et retour3D, viewport1440×1100 puis1100×900 et retour.
Zéro erreurJS, zéro requête hors loopback. Preuve numérique complète sans image,
ROM ou état : third_party/endurance-evidence.json ; rapport temporaire local
initialement test-results/endurance.json. Protocole : ENDURANCE.md.

Moyennes cumulées de soumission CPU copie+rendu0,144–0,177ms ; maximum10,2ms.
Les dimensions changent et les vérifications build/navigateur ont coexisté avec
le début du test : pas un benchmark comparatif précis entre caméras ou machines.
Pas de mesure de complétion GPU. Listeners718 et documents1 constants ; source
audio1 à chaque relevé, contexte suspendu aux pauses. Un RMS actif non nul est
observé au premier relevé, zéros possibles pendant attract/silences ; aucune
écoute continue effectuée. HeapJS19,73–21,58Mio, nodes4582–4645 : variations et
hausse sur les derniers relevés, sans GC forcé ; pas de preuve d'absence de
fuite et pas toute la mémoire WASM/GPU. Pas de dégradation technique bloquante
observée pendant cette série ; le programme peut être en fin de partie/attract,
ce n'est pas un parcours humain de dix minutes. Trackpad physique, saut/freinage,
écoute, écran120Hz et Safari restent ouverts.

Un premier lancement a été interrompu avant la mesure car Playwright.press
ne connaît pas é. Le nouveau lancement, avec clavier natif CDP pour é, a effectué
les dix intervalles complets. Aucun intervalle manquant, durée raccourcie ou
seuil abaissé. Le banc libère son navigateur dans finally et marque complete
seulement après les dix intervalles et le contrôle des erreurs.

## Caméras frontale et perspective — 10 novembre 2026

Retour humain avant cette livraison : Michel confirme « ça fonctionne bien »
pour la présentation plein écran précédente. Cela ne certifie pas encore la
recette d'endurance, les sauts ou le confort physique du nouveau boost.

Implémenté : sélecteurs Caméra synchronisés page/HUD, actifs en scène 3D,
frontale orthographique centrée sur l'écran et perspective existante conservée
par défaut. Même caméra/plan/texture/session ; choix conservé pendant la session,
plan plat indépendant, redessin de la texture même en pause. Aucune commande,
pause/reprise ou préférence persistante ajoutée par le changement.

NullEngine : nouveau test de cadrage/aspect pour trois couples source/viewport,
rotation frontale, marge autour de l'écran, retour plan/3D, caméra et meshes
uniques. Chrome GPU : **26 tests réussis**, deux nouveaux vérifient les couleurs
et leur animation, HUD plein écran, synchronisation, resize étroit, rétention,
désactivation et destruction ; l'autre teste lecture/pause sans aucun appel
supplémentaire aux commandes. Premier passage : 25/26, assertion de couleur
avant disponibilité du shader. Le test attend désormais le rendu comme les
autres tests GPU ; passage complet 26/26. Aucun seuil ou test de rendu retiré.

Vrai runtime local Chrome **157.0.8103.40** : Crédit/Start dans le HUD, changement
pendant lecture avec frames qui avancent, puis changement en pause à frame1062
stable. 360 copies cumulées, gain1,70 inchangé, pending(0,0), choix front conservé
après passage au plan puis retour 3D ; zéro erreurJS. Captures des deux vues
examinées dans /tmp/marble-camera-front.png et /tmp/marble-camera-perspective.png :
frontale droite, vidéo entière et plus grande, cadre visible et socle partiellement
hors champ ; perspective avec décor. Aucune écoute audio/endurance ou validation
physique du trackpad effectuée dans cet essai. Preuve numérique :
third_party/camera-presets-evidence.json.

`npm run check` : **215 tests / 24 fichiers**, couverture 99,47 % instructions,
99,29 % branches, 100 % fonctions, 99,43 % lignes. **3 tests preview réussis** sur le build final ; format, lint, types et build
réussis. Avertissement de chunk BabylonJS >500 ko conservé.

## Plein écran 3D et HUD — 9 novembre 2026

Implémenté : bouton Jouer en plein écran 3D, même session/texture, HUD Crédit,
Start, Capturer, Pause, Reprendre/son et Retour. Entrée et sortie en pause ;
repli immersif si Fullscreen API indisponible/refusée. Les contrôles du HUD
délèguent aux contrôles existants et reflètent leurs états/messages.

Six tests purs de transitions ajoutés (refus, annulation, résultats tardifs,
destruction, réentrée). Chrome : **24 tests réussis**, dont trois nouveaux sur
HUD/Pointer Lock/boost, refus et petit viewport, et vidéo GPU animée plein écran,
resize et abonnement unique. Le premier passage a révélé un focus demandé trop
tôt avant la fin native du fullscreen ; corrigé en attendant fullscreenchange,
puis suite complète réussie. Aucun seuil réduit ni test ignoré.

Essai vrai runtime, Chrome 157 et ROMs locales : entrée fullscreen native,
Crédit/Start/Capturer depuis le HUD, boost maintenu puis Échap, pending (0,0),
boost relâché et frame stable **1066**. Nouvelle entrée en pause, **364 copies**
3D cumulées, retour à la page et focus restauré ; zéro erreur JS. Le script
a attendu l'événement/focus effectif après sortie (une première lecture synchrone
était prématurée). Capture /tmp/marble-fullscreen-hud.png examinée : jeu lisible,
HUD au-dessus, sans recouvrement de l'image. Preuves :
third_party/fullscreen-hud-evidence.json. Pas de confort trackpad physique,
écoute audio complète, Safari/120 Hz/endurance certifiés par cet essai.

`npm run check` : **214 tests / 24 fichiers**, couverture 99,47 % instructions,
99,29 % branches, 100 % fonctions, 99,43 % lignes. Format/lint/types/build réussis ; **3 tests preview réussis** sur le build
final. Avertissement existant de chunk BabylonJS >500 ko conservé.

## Boost confort et présentation en perspective — 9 novembre 2026

Retour humain reçu : 0,50× est injouable (contrôle normal insuffisant, pas
d'accélération ressentie). La recommandation de calibration est donc rejetée.
Nouveau périmètre explicite : Espace pour le boost et poursuite du rendu 3D.
Pas de nouvelle séance de gestes ou de calibration demandée à Michel.

Implémenté : normal 1,70× (migration du candidat 0,50×), boost directionnel
continu tant qu'Espace est maintenue en capture. Norme L1 128 par itération,
direction guidée au trackpad ; aucune écriture de physique ou règle du jeu.
Relâchement, Échap, focus/visibilité, gain modifié ou destruction purgent le
maintien et les commandes en attente. Les champs de saisie ne déclenchent pas
le boost. Source clonée et temps injecté pour les tests, pas de timer autonome.
Les commandes générées et les événements souris sont comptés séparément.

Rendu : nouveau mode Écran en scène 3D, écran/support/socle/grille procéduraux,
perspective et éclairage, même session/texture/raccord vidéo. Tests NullEngine :
plan de référence conservé, caméra, aspect, décor réutilisé, éclairage désactivé
au retour au plan, destruction des meshes/matériaux/lumières. Chrome GPU : mêmes
couleurs de vidéo et changement animé, resize, source masquée, retour au plan et
un seul abonnement. La capture réelle /tmp/marble-screen-stage.png a été examinée :
vidéo lisible dans le cadre en perspective, socle/sol/éclairage visibles. Pas
une reconstruction des niveaux en 3D, pas de nouvel asset externe livré.

Vrai runtime Chrome 157, archives locales : gain 1,70× restauré depuis 0,50×,
partie démarrée via Crédit/Start, scène 3D activée, 24 commandes de boost
observées à (128,0), puis zéros au relâchement. Un second boost est purgé par
Échap ; frame 1138 stable, 90 copies 3D cumulées, aucun pending ou maintien,
aucune reprise sur Espace en pause et zéro erreur JavaScript. Timeline du second
boost : 9 commandes générées distinguées des souris. Entrées Chrome automatisées,
pas de confort physique ou de saut réussi certifié. Preuve numérique sans
ROM/image/état : third_party/comfort-stage-evidence.json.

`npm run check` réussi : **208 tests / 23 fichiers**, couverture 99,44 % instructions,
99,26 % branches, 100 % fonctions, 99,40 % lignes ; format/lint/types/build passent.
Six tests boost purs, test des commandes générées, restauration du gain rejeté,
nouveau test 3D NullEngine en conservant celui du plan initial. Chrome dev :
**21 tests réussis**, Chrome preview : **3 tests réussis**. Premier passage après
interruption : 20/21, échec ponctuel du changement vers comparaison, cause non
isolée ; passages suivants 21/21, avec contrôles GPU et vrai runtime réussis.
Aucun seuil réduit ou test ignoré, avertissement habituel de chunk BabylonJS.

À valider en jouant : confort du boost, précision normale, saut et freinage.
Prochaine tâche indépendante : vue 3D plein écran avec HUD de jeu compact pour
réduire le recours à la page de diagnostics. Aucun blocage de ce travail sur la
calibration désormais rejetée. Détails : COMFORT_AND_3D.md.

## Calibration du geste capturé — 9 novembre 2026

Banc permanent ajouté : measure:calibration, phase-check et refine. Données
numériques vérifiées sans ROM dans les unitaires ; 20 nouveaux tests sur
captureCalibration (validation, copie, quantification des deux axes, timings,
fenêtre de pic, neutralité, limites, phases et pas sélectionnables). Un test
unitaire supplémentaire confirme que le candidat 0,50× reste purement linéaire,
sans limiteur. Par défaut le gain joueur et ses préférences ne changent pas.

25 essais avec les archives locales et le vrai cœur Web : 12 gains/profils,
5 contrôles temporels, 8 affinements. Tous les polls observés correspondent aux
consignes, aucun journal perdu/erreur d'observation/erreur JS, départs comparables,
neutres immobiles et région témoin de 40000 pixels inchangée à chaque image.
1,70× complet reproduit exactement les points du rejeu précédent. Ancien banc
ports quick exécuté : neutre/256/neutre conformes, 64 lectures par cas.

Coup isolé : 0,85× favorable sur une phase, presque nul sur l'autre, donc non
retenu. Affinement à 0,40/0,45/0,50× ; le candidat 0,50× conserve la direction
et une réponse plus importante aux deux timings dans ce groupe. À 36 itérations :
0,50× donne (−9,141 ; +2,788) puis (−12,115 ; +4,804) pixels natifs, contre
(+2,985 ; −3,136) puis (−5,061 ; +0,889) à 1,70×. Déplacements optiques, pas une
mesure physique d'accélération ou un saut réussi. La matrice n'inclut pas le
profil complet à 0,50× : choix fondé sur le coup isolé, confort encore à tester.
Détails : [CALIBRATION.md](CALIBRATION.md), preuve capture-calibration-evidence.json.

Bouton d'essai explicite ajouté : gain inchangé avant clic, 0,50× appliqué et
mémorisé après clic, aucune reprise depuis pause. Test navigateur vérifie aussi
le retour à 1,70× au curseur. Vrai runtime : gain 1,70× préservé avant clic,
0,50× après, relevé automatique au bon gain après capture/Échap, zéro erreur JS.
Ce contrôle utilise des événements souris Chrome automatisés, pas un trackpad
physique. Le défaut et les contrôles/physique du jeu restent inchangés.

`npm run check` réussi : **200 tests / 22 fichiers**, couverture 99,39 % instructions,
99,46 % branches, 100 % fonctions, 99,35 % lignes ; format/lint/types/build passent.
Chrome dev : **19 tests réussis**, Chrome preview : **3 tests réussis**.
Avertissement de chunk BabylonJS existant conservé. Pour cette calibration, restent
à valider humainement le confort et l'efficacité du réglage candidat en partie, notamment
saut niveau 1 et freinage niveau 3 ; aucun résultat de saut annoncé comme corrigé.

## Premier profil humain exploitable — 9 novembre 2026

Gain 1,70×, 95 lignes capturées et 96 événements non nuls, 1,391 seconde,
52 samples natifs non nuls sur 85 itérations ; pic L1 1182 (−608,+574).
Pour chaque ligne, sentX/Y = polledX/Y. Sommes −5737/+6257, aucun écrêtage et
aucun événement non échantillonné. Cela vérifie le raccord sur cet essai,
sans en faire un compteur exhaustif de polls ou une preuve de saut.

Rejeu Web réel, runtime neuf par cas neutre/profil/neutre : tous les polls
conformes au profil X/Y avant 1200..1294, départs identiques, neutres immobiles,
zéro erreur JS. Handler original observé sans altérer son retour, 488 lectures
par essai sur1198..1319, aucune perte/erreur de trace. Rejeu des mêmes octets dans
MAME 0.271, neutre/profil, BIOS ttl et phase fixe −1 préalablement calibrée,
488 lectures vérifiées par chacun des deux taps. Maintien de la dernière valeur
après la trace, sans saut artificiel des compteurs à zéro. Sept instants optiques
comparés : écart maximal 0,158 pixel natif par axe. Aucun défaut spécifique au
cœur Web démontré, pas d'égalité des états internes ou de saut réussi certifiée.

Le rejeu par itération n'est pas une reproduction du jitter macOS ou de toute
la partie de Michel. Le marqueur entre dans la région témoin : ce contrôle
n'écarte pas un mouvement de caméra sur l'intégralité du trajet. Aucun gain ou
commande modifié. Aucun nouvel essai humain nécessaire pour continuer cette
investigation. Protocole : [CAPTURED_MOTION.md](CAPTURED_MOTION.md), profil et
preuves sans ROM/image/état : third_party/captured-motion-evidence.json.

`npm run check` réussi : 179 tests/21 fichiers ; couverture 99,29 % instructions,
99,39 % branches, 100 % fonctions, 99,24 % lignes. Format/lint/types/build passent,
avertissement habituel BabylonJS conservé. Pas de nouveau code applicatif ni de
test unitaire artificiel ajouté. Suites navigateur permanentes non relancées ;
les trois essais réels Web et deux essais MAME natif sont réalisés. Prototypes
de rejeu hors dépôt, dérivés des bancs existants ; profil numérique conservé.

## Armement automatique à la capture — 9 novembre 2026

Le dernier texte de Michel comporte un pic X natif 1189 sans saturation, mais
motionTimeline idle et aucune ligne : armement manuel non effectué, observer
resté à son gain initial 1 tandis que le contrôle joueur est bien à 1,70×.
Remplacer le prérequis manuel par la remise à zéro/armement automatique à chaque
capture réussie depuis l'état non capturé. Échap conserve, une recapture démarre
une mesure neuve au gain courant. Pas de modification des commandes/physique.

Test du raccord sans ROM : aucune remise à zéro avant capture, gain observé
1,7, geste fort retenu après Échap ; recapture à gain 2 avec compteurs nuls,
aucun segment précédent. Suite Chrome : premier passage 17/18, notification
Pointer Lock tardive ajoutant des pauses légitimes dans le journal du test
Crédit/Start. Assertion centrée sur l'ordre reprise/pression, puis **18/18**.

Vrai runtime Chrome 157.0.8103.38, archives locales, mouvements automatisés,
sans bouton Nouvel essai : pic initial 1958, suivant 16828, segment 2 choisi,
une ligne conservée après Échap, complete/gain 1,7, zéro erreur JS. Pas un test
physique de trackpad. Preuve : third_party/auto-measure-evidence.json.
`npm run check` réussi : **179 tests / 21 fichiers**, format/lint/types/build,
couverture 99,29 % instructions, 99,39 % branches, 100 % fonctions, 99,24 % lignes.
Chrome preview : **3 tests réussis**, après relance du contrôle d'autorisation
initialement indisponible pour limite d'usage. Avertissement de chunk existant.

Procédure désormais unique : Capturer → accélération → Échap → Copier. La mesure
humaine du geste fort reste à obtenir ; le pic transmis seul ne valide pas le saut.

## Mesure simplifiée, mouvement le plus fort — 9 novembre 2026

Le relevé fourni par Michel correspondait au premier segment (300 ms, 35
événements, pic natif L1 319), alors que l'essai complet contenait un pic X 916
hors segment. Il avait suivi la consigne : accélération, Échap, Copier. La
sélection du premier mouvement rendait le protocole ambigu ; le décalage ne
prouve pas une mauvaise exécution humaine ni l'absence de perte sur le vrai
mouvement fort. Aucun diagnostic de moyen/rapide demandé pour la suite.

Correction implémentée : observation jusqu'à l'interruption explicite,
sélection automatique du segment au plus grand pic de commande L1 transmis ou
observé au dernier poll. Un silence/une limite ferme un segment, pas l'essai.
Meilleur et candidat uniquement, 256 lignes internes maximum, copie limitée au
segment choisi et critère/identifiant exposés. Les pics intermédiaires avant
annulation par un événement opposé restent visibles. Événements interrompus
avant poll conservés séparément. Les commandes/gain restent inchangés.

Interface : Nouvel essai → Capturer → accélération → Échap → Copier. Statut
visible prêt/en cours/terminée, pas d'attente à chronométrer. Chrome sans ROM :
régression sur un petit premier mouvement, silence, accélération plus forte,
Échap ; la seconde mesure remplace bien la première et reste figée. Les autres
contrôles pause/démarrage/vidéo continuent de passer.

Vrai runtime avec les archives locales, Chrome 157.0.8103.38 : événements souris
automatisés, premier segment pic 813, second pic 9900, sélection du second,
une ligne conservée après Échap immédiat, statut de page « Mesure terminée »,
zéro erreur JS. Ce n'est pas un geste physique de trackpad. Preuve numérique :
third_party/strongest-gesture-evidence.json, sans ROM/image/état.

`npm run check` réussi : **179 tests / 21 fichiers**, couverture 99,29 % instructions,
99,39 % branches, 100 % fonctions, 99,24 % lignes ; format/lint/types/build passent.
Quatre nouveaux tests de non-régression (geste ultérieur, interruption avant poll,
nombreux segments/bornes, événements opposés) et tests existants adaptés.
Chrome dev : **18 tests réussis**, Chrome preview : **3 tests réussis**.
Avertissement existant de taille du chunk BabylonJS conservé. Un nouvel essai
physique reste à faire après rechargement ; le saut n'est pas corrigé.

## Démarrage et Crédit/Start après Échap — 9 novembre 2026

Défaut reproduit avec les archives locales et Chrome 157.0.8103.38 : copyright
warning au démarrage, Crédit/Start sans effet sur cet écran, puis boutons
désactivés après Échap. Reprendre les réactivait. Correction : option du cœur
skip_disclaimer enabled, et commandes Crédit/Start explicites disponibles en
pause (reprise avant pression, sans reprise/purge si déjà actif). Les véritables
avertissements de compatibilité ne sont pas masqués.

Essai dans le vrai runtime corrigé, document neuf : mode attract observé après
amorçage, sans aucun mouvement souris ; Crédit depuis pause puis Start, partie
observée avec score 0/temps 60, capture ensuite, Échap, Crédit/Start accessibles.
Nouveau Crédit depuis pause relance : frame 1112 → 1139, zéro erreur JavaScript.
Captures examinées dans /tmp seulement ; aucune ROM/image/état ajouté au dépôt.
Preuves numériques : third_party/startup-controls-evidence.json.

`npm run check` réussi : 175 tests sur 21 fichiers ; couverture 99,27 % instructions,
99,35 % branches, 100 % fonctions, 99,22 % lignes. Un test de configuration et
quatre tests purs de commande ajoutés (ordre reprise/pression, session déjà
active, échec de reprise). Chrome dev : 18 tests réussis, dont la régression
capture → Échap → Crédit → Start et Start directement depuis pause. Chrome preview :
3 tests réussis. Les tests
existants conservent l'absence de reprise automatique au retour du focus.
Ni confort humain ni saut du niveau 1 validé par cet essai. Avertissement existant
de taille du chunk BabylonJS conservé.

## Répartition temporelle et relevé de geste — 9 novembre 2026

Implémenté : observateur volontaire du premier geste après « Nouvel essai de
mesure », borné (128 lignes/deux secondes vérifiées aux callbacks), temps injecté,
agrégation des événements acceptés et dernier poll natif après itération.
Arrêt après silence, interruption, gain modifié ou destruction ; conservation
après pause, remise à zéro explicite. Ni commande transformée, ni timer,
persistance ou nouveau listener. Événements interrompus avant un callback
conservés séparément. Le gain du joueur reste inchangé.

Banc réel Chrome 157.0.8103.38, archives locales : 11 essais à total constant,
puis 6 contrôles (neutres et 1536 sur 1/4/6/12 itérations). Départs identiques,
consignes natives observées exactement, neutres immobiles, zéro erreur JS.
À total 1536, une impulsion donne ΔX −53,12 pixels à 1236, 6 × 256 donne +105,71,
12 × 128 donne +95,79 ; 4 × 384 reste inversé. Les répétitions retrouvent exactement
les positions à chaque image. Contrôle de décor sur ces six répétitions :
24 comparaisons de 360000 pixels RGBA, aucun changement dans la région témoin.
La série initiale n'avait pas ce contrôle intégré ; les autres cas ne bénéficient
pas rétroactivement de cette preuve. Positions écran, pas vitesse ou saut réussi.

Raccord dans le vrai runtime, deux contrôles ponctuels Chrome avec événements
souris automatisés et Pointer Lock : trois événements acceptés, trois samples
natifs non nuls sur trois itérations, arrêt quiet, 14 lignes conservées après
Échap, zéro erreur JS. Cela ne mesure pas un trackpad physique. La sonde finale
est exécutée depuis /tmp : Playwright nettoie son répertoire test-results.

`npm run check` réussi : **170 tests / 20 fichiers**, format/lint/types/build.
Couverture : 99,26 % instructions, 99,34 % branches, 100 % fonctions, 99,22 % lignes.
17 nouveaux tests purs : répartition entière à total constant, bornes, régions
RGBA, armement/arrêt/reset, durée et snapshots. Une non-régression a reproduit
une durée précédente conservée lors de l'annulation d'un nouvel armement ;
réinitialisation des deux bornes corrigée et test réussi. Chrome : **17 tests
dev et 3 preview**, dont un nouveau test du raccord avec faux runtime sans ROM,
vrais événements et capture du pointeur. Avertissement existant de taille du
chunk BabylonJS conservé. Premier check final gêné par la sonde temporaire prise
par ESLint ; déplacée hors workspace puis check relancé avec succès.

Résultats : [MOTION_PROFILES.md](MOTION_PROFILES.md),
`third_party/impulse-profile-evidence.json`, sans ROM/image/état. À faire par Michel :
un geste rapide puis un geste moyen, chacun armé séparément, gain habituel conservé,
Copier les diagnostics après Échap. Saut niveau 1 et freinage niveau 3 ouverts.

## Référence native — 9 novembre 2026

MAME 0.271 ARM64 déjà installé, BIOS ttl, vérification des archives réussie.
Commande conservée `npm run measure:reference` exécutée : 20 essais, cinq
amplitudes et quatre phases. Tous les départs identiques, quatre neutres
immobiles ; 64 lectures rejouées et 64 lectures vérifiées par essai. Au décalage
fixe −1, les cinq réponses concordent avec le Web à moins de 0,063 pixel par axe.
La dépendance de phase est forte ; le cas 416 inverse aussi sa direction dans
la référence. Aucun bug spécifique à 2003-Plus démontré, saut non corrigé.

Contrôles exploratoires : rejeu Web 64/256/416 sans pending natif, sorties
identiques au banc initial ; natif 416 à vitesse réelle identique au cas accéléré
phase 0. Captures ponctuelles : décor natif inchangé sur 31200 pixels contrôlés.
Ces contrôles ne prouvent pas une égalité des états internes ou le confort humain.
Détails, limites et preuves : [REFERENCE_COMPARISON.md](REFERENCE_COMPARISON.md),
`third_party/mame-reference-evidence.json`.

19 tests unitaires ajoutés sur validation/sérialisation des captures, bornes,
doublons, phases, parsing et refus des rapports incomplets/non vérifiés.
`npm run check` réussi : 153 tests sur 17 fichiers, couverture 99,09 % instructions,
99,13 % branches, 100 % fonctions, 99,04 % lignes ; format/lint/types/build passent.
Chrome dev : 16 tests réussis ; Chrome preview : 3 tests réussis. Blocage initial
HTTP du sandbox contourné par exécution autorisée, sans changement applicatif.
Avertissement existant des chunks BabylonJS >500 ko conservé.

## Lectures réelles des ports — 9 novembre 2026

Instrumentation volontaire du handler de ports du cœur figé, sans changer ses
arguments, retours ou la physique. SHA-256 vérifié, carte statique de cinq lignes
et signature vérifiées, trampoline WASM typé et restauration du handler. Pas
d'accès à la RAM ou au code de ROM ; aucune modification des fichiers tiers.
Sources publiques et méthode : [TRACKBALL_PORTS.md](TRACKBALL_PORTS.md).

Essais réels Chrome 157.0.8103.38 headless : cinq impulsions 0/64/256/416/768 au
protocole du banc, puis répétition 0/256/0 avec le module conservé dans le projet.
Départs identiques, commandes natives reçues, résultats écran identiques aux
mesures précédentes ; zéro erreur JS, zéro lecture perdue/erreur d'observation
sur le banc conservé. 64 lectures par essai, 4 offsets par compteur de frame.

Pour les deux ports joueur 1, depuis 0 : 64 donne 239 puis 237 ; 256 donne 188 puis 179 ;
416 donne 146 puis 131 ; 768 donne 53 puis 26. À 416, les pas −110/−15 et la valeur
finale −125 modulo 256 sont cohérents avec le pilote, mais la réponse horizontale
visible reste inversée. La perte avant ces ports ou leur seul repli ne suffit
pas à expliquer cet essai. À 768, les pas modulo sont ambigus. Aucun saut corrigé
ni bug précis du programme ou du cœur déclaré.

Le compteur interne lu dans le handler vaut +1 par rapport au compteur avant
itération. Pour l'entrée 256 à 1200, les valeurs apparaissent sous 1202 puis 1203
(itérations 1201 puis 1202). Les deux labels sont conservés : ni précision en cycles
CPU ni latence matérielle déduite. Journaux bruts et observations :
`third_party/trackball-port-evidence.json`, sans ROM, état ou image.

Vérifications : 26 nouveaux tests du traceur et des écarts modulo, incluant
version/adresses/signature refusées, fenêtre bornée, valeurs/exceptions conservées,
erreurs de mesure isolées, restauration et propriétaire concurrent. Check : 134
tests sur 16 fichiers ; 16 tests Chrome dev et 3 tests preview sans ROM. Couverture
99,01 % instructions, 98,96 % branches, 100 % fonctions, 98,95 % lignes.
`npm run measure:ports -- --quick` réussi avec contrôle de hash, journaux et départs.
Le module reste absent du bundle applicatif ; aucun nouveau réglage joueur.

## Réponse effective du jeu — 9 novembre 2026

L'essai 416, techniquement actif mais sans amélioration selon Michel, est retiré
du frontend, de l'API de session et des modules/tests associés. Le gain utilisateur
est inchangé, aucun nouveau limiteur ou lissage/inertie n'est ajouté. Un test de
régression conserve la transmission linéaire des grands gestes.

Un banc reproductible est livré : `npm run measure:impulses` (11 démarrages neufs),
ou `-- --quick` (3). Serveur dev et archives locales requis, jamais exécuté en CI.
Le script observe le marqueur de bille à l'image, sans lecture/écriture de RAM
ou de code de ROM. Les impulsions de diagnostic sont écrites dans le pending
natif, avant le poll, à des frames fixes ; elles contournent gain et événement
navigateur volontairement. Ce n'est pas une simulation de confort trackpad.

Résultat : tous les départs sont identiques, deux neutres immobiles, les polls
correspondent exactement aux consignes, zéro erreur JS. À la frame 1212 :
64×1 donne (+2,931 ; -4,056) pixels ; 256×1(+9,728 ; -3,887) ; 416×1
(-23,213 ; -3,718). Le sens horizontal change sur les grands pics. Une zone
fixe de 360000 pixels du décor reste identique entre les captures contrôlées.
Six frames à 256 donnent 29,91 pixels de déplacement contre 10,48 pour une seule
frame ; la durée joue aussi. Cela ne révèle pas la cause interne ni ne certifie
la fidélité d'un étalement artificiel des commandes. Le saut reste non validé.

Protocole et limites : [INPUT_RESPONSE.md](INPUT_RESPONSE.md). Preuve numérique
sans image/état : `third_party/impulse-response-evidence.json`. Premier banc par
restauration d'instantané rejeté pour départs non identiques. Le script final
reproduit ses 3 essais courts ; le suivi pur importé via Vite est testé sans GPU
et absent du bundle applicatif. Images de contrôle dans /tmp seulement.

Vérifications : `npm run check` réussi, 108 tests sur 15 fichiers, format/lint/types/
couverture/build. Couverture 99,18 % instructions, 99,30 % branches, 100 % fonctions,
99,13 % lignes ; nouveau module de mesure couvert. 16 tests Chrome de développement
et 3 tests du build réussis sans ROM. La réduction du nombre de tests vient du
retrait de l'expérience rejetée ; les seuils restent 90 % et ne sont pas abaissés.
Les nouveaux tests couvrent centroïde/bornes, RGBA bottom-up, exclusion HUD/bords,
couleurs parasites, dimensions/buffers invalides.

Suite : lecture/temporalité des ports analogiques du cœur à partir des sources
publiques ou comparaison avec un autre cœur réellement compatible. Ne pas
déclarer un bug précis du cœur ou un saut corrigé à partir du seul suivi écran.

## Retour du 9 novembre 2026 — essai 416 non concluant

Michel rapporte **aucune amélioration** avec la protection activée. Son relevé
confirme le fonctionnement technique (20 limitations, pic L1 avant 1205, natif X
maximum 416 à gain 1,70×), mais pas une correction du symptôme. L'essai avec
protection désactivée comptait 27 dépassements, pic L1 1635 et maximum natif X 1522.
Les deux essais ne sont pas une comparaison à gestes identiques. L'hypothèse
d'un repli des compteurs n'est pas retenue comme explication démontrée.

Priorité : observer la réponse du jeu à des impulsions contrôlées. Première
tentative avec snapshot transitoire en mémoire et restauration : départs
visuellement différents entre essais, donc série rejetée. Aucun état écrit
sur disque ni dans le dépôt. Reprise avec un nouveau document/runtime par essai
et commandes calées sur les frames ; résultats consignés séparément ci-dessous.

## Essai grandes impulsions — 8 novembre 2026

Retour humain prioritaire : les impulsions restent insuffisantes pour sauter du
chemin classique vers les plateformes latérales au niveau 1. Ce critère fonctionnel
n'est pas validé. L'absence d'écrêtage du pont int16 ne certifie pas l'interprétation
des grands deltas par les compteurs du jeu.

Implémenté : mode opt-in non persistant, désactivé par défaut, bornant conjointement
les deltas en attente avant le poll. La limite 416 est une hypothèse dérivée des
compteurs 8 bits, de la rotation des axes et de la sensibilité 30 % du pilote, avec
marge pour arrondis ; pas une mesure des lectures intra-frame du jeu. Aucun boost
physique, étalement, nouveau gain ou mouvement différé. Les mesures avant/après
sont distinguées et le mode reste explicite.

- Tests ciblés : 30 réussis. `npm run check` : 113 tests sur 15 fichiers, format,
  lint, types, couverture et build réussis. Couverture : 99,16 % instructions,
  99,26 % branches, 100 % fonctions, 99,11 % lignes.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser` : 17 tests réussis sans ROM,
  avec test d'activation/désactivation sans reprise ou changement de gain.
- Tests unitaires : mode désactivé inchangé, petits mouvements, limite conjointe
  et diagonales, signes, absence d'excédent différé, reset des mesures, entrées
  invalides, pré-hook avant natif et écriture des seuls pending.
- Essai ponctuel Chrome 157.0.8103.38 headless, vrais événements souris via capture,
  gain 1,70× dans profil isolé : 28 impulsions limitées, pic L1 avant 1700 ; natif X
  -416..416. Après libération : pause, état souris nul ; reset des statistiques
  vérifié, aucune erreur JS. Ne prouve pas un saut réussi sur le jeu.

À valider par Michel : comparaison du saut avec/sans protection au même gain,
retour du ressenti et diagnostics. Si la protection n'améliore pas ce cas,
l'hypothèse ne sera pas considérée comme correction démontrée. L'endurance et
les autres limites de C restent ouvertes.

## Bilan actuel — 8 novembre 2026, incrément E

Michel confirme **« ok, c'est bon »** après la correction du clignotement.
La vue corrigée est validée sur son Mac ; cette confirmation ne vaut pas
validation implicite de l'endurance, de l'écoute ou du freinage. Le bilan et
la dernière recette sont dans [RELEASE.md](RELEASE.md). Les sections suivantes
conservent l'historique des essais et leurs résultats à la date indiquée.

- `npm run check` : 98 tests sur 14 fichiers, format/lint/types/couverture/build
  réussis ; couverture 99,08 % instructions, 99,23 % branches, 100 % fonctions,
  99,02 % lignes.
- 16 tests Chrome de développement et 3 tests du build preview réussis sans ROM.
  La suite preview vérifie le code compilé, la sélection locale et ses erreurs,
  les empreintes des ressources, notices, exclusion des archives et routes dev.
- Reconstruction isolée dans `/tmp/marble-delivery-esl6_gr1`, sans ROM ni
  node_modules initial : installation npm ci offline depuis le cache, puis
  vérification des ressources d'émulation existantes et `npm run check` réussis.
  Les 49 fichiers de dist sont identiques octet pour octet au build de référence.
  Node 24.20.0, npm 11.19.0, même plateforme. Ce n'est pas une preuve
  d'identité entre OS/versions, ni un nouveau téléchargement initial du runtime.
- L'essai d'installation a d'abord rencontré le Node Homebrew cassé hors du
  projet (bibliothèque simdjson absente), puis une erreur avec `npm ci --prefix`.
  L'installation depuis le dossier temporaire avec le Node nvm fonctionnel a
  réussi. Aucune modification système ou du lockfile pour contourner ces erreurs.
  npm a averti du script optionnel fsevents non approuvé ; contrôles réussis,
  aucune approbation globale ou script ajouté.
- Essai ponctuel du build compilé sur serveur preview local avec sélection
  manuelle des ZIP : course et deux vues, source masquée, capture réelle et
  20 événements vus par le driver. Frame 1097 → 1187, copies 1089 → 1179 ;
  pause stable frame 1210/copie 1202, aucune erreur JS ou requête distante/dev.
  Coût CPU moyen de soumission copie+rendu 0,122 ms, maximum 6,9 ms, pas un
  temps GPU. Le serveur preview temporaire est arrêté après l'essai.
- Workflow GitHub complété pour inclure `test:preview`, sans exécution distante
  attestée (dossier non initialisé en dépôt Git). Aucun déploiement.

Reste à confirmer par Michel : session d'au moins 10 minutes, écoute audio,
freinage, absence de doublage à la nouvelle session ; Safari, 120 Hz et DPR
non validés. Le code du jeu original et le gain de Michel sont inchangés.

## Diagnostic du plafonnement — 6 novembre 2026

Michel confirme que **les gestes rapides semblent plafonner** à 1,80×. La cause
reste non identifiée ; aucune mesure de son essai n'a encore été reçue.

Le chemin applicatif reste linéaire, avec sa seule sécurité int16 déjà existante.
La source du cœur (`mame2003.c` / `inptport.c` de la révision figée) transfère les
deltas relatifs puis applique la sensibilité analogique ; les compteurs du pilote
sont sur 8 bits. Cette lecture ne démontre pas un plafond de vitesse ni une erreur
du navigateur sur le Mac de Michel. Aucun changement de gain, courbe ou physique.

Ajout : remise à zéro indépendante des seules mesures et copie locale des
diagnostics. Un test confirme que le gain et les fractions survivent à la remise
à zéro ; tests navigateur pour copie réussie, refus et disponibilité des boutons.
`npm run check` : **61 tests réussis** ; **10 tests Chrome réussis** sans ROM.
À recevoir : diagnostic copié après un essai de gestes rapides à gain constant.

## Calibration trackpad — retour humain du 5 novembre 2026

Michel rapporte un réglage **1,80× « pas trop mal »**, avec difficulté à obtenir de
fortes accélérations. Cause non établie : ne pas conclure automatiquement à un
écrêtage, un défaut du trackpad ou un comportement normal de l'arcade.

Un test de non-régression confirme le gain linéaire 1,80× sur petits et grands
deltas, avec pics et compteur de saturation. Les nouveaux champs de diagnostic
ne modifient pas les commandes. Prochain essai sur le matériel réel : comparer les
pics avant/après gain et `saturated`, et préciser si la vitesse semble plafonner
ou si un geste trop long est nécessaire. Aucune nouvelle courbe d'accélération ajoutée. `npm run check` : 60 tests réussis ;
les 8 tests Chrome restent réussis.

## Incrément B — 5 novembre 2026

**Implémenté** : Crédit et Start avec relâchement, Pointer Lock standard, gain
commun avec fractions et saturation, purge native réelle, pause/reprise explicite,
volume et reprise du contexte audio, mémorisation des seuls réglages.

**Automatisé sans ROM** : 59 tests unitaires/intégration sur 8 fichiers et 8 tests
Chrome réussis. Couverture du périmètre métier : 99,07 % lignes, 99,13 % instructions,
98,50 % branches, 100 % fonctions. `npm run check` réussi. Les tests de commandes UI
utilisent un adaptateur de test ; les tests du vrai runtime utilisent un ZIP
synthétique sans ROM et vérifient son chargement puis l'échec attendu.

**Essais locaux avec les archives fournies** (hors des tests pérennes), Chrome
157.0.8103.38 headless :

| Essai                                    | Observation                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Crédit puis Start après les écrans MAME  | Une course débute, compte à rebours puis timer de course                                |
| Mouvement relatif après compte à rebours | Bille déplacée sur le plateau ; exemples de valeurs polled (4, -2) dans le driver natif |
| X positif à gain 1                       | Somme reçue/transmise observée 304/304, aucune saturation ; déplacement visible         |
| Audio en partie                          | Contexte running, une source, gain 0,5 ; RMS non nul observé 0,06412                    |
| Échap                                    | Capture libérée, pending X/Y, valeurs polled et boutons à zéro                          |
| Pause                                    | Frame 1131 stable pendant deux lectures espacées de 350 ms, contexte audio suspended    |
| Reprendre                                | Contexte et boucle relancés explicitement, sans recapture automatique                   |
| Console                                  | Aucune erreur JavaScript pendant ces essais                                             |

**À valider par Michel** : écoute réelle, précision des petits gestes, signes des
axes ressentis, diagonales, gestes rapides, lever/reposer le doigt, sensibilité
préférée et endurance. Les mouvements automatisés sont ceux du pointeur Chrome,
pas ceux d'un trackpad Apple réel. Le RMS prouve un signal mesuré, pas un son
écouté ou une synchronisation certifiée. Safari et écrans 60/120 Hz non testés.

Le raccord dépend volontairement du couple glue JS/WASM et d'une ABI privée,
vérifiés par empreinte et tests de mémoire. Voir DECISIONS.md avant toute mise
à jour de cœur. La vidéo BabylonJS n'est pas encore branchée.

## Correction du chargement jeu + BIOS — 5 novembre 2026

- Les archives fournies par Michel sont lues depuis leur emplacement original,
  sans copie dans le projet. Les 27 dumps de jeu et les trois dumps BIOS correspondent
  aux tailles et SHA-1 attendus. Les suffixes Atari sont normalisés après vérification.
- Essai ponctuel dans **Chrome 157.0.8103.38 headless** : sélection de `marble.zip`
  et `atarisy1.zip`, validation, bouton de démarrage puis observation du mode attract
  (niveau et bille affichés). Aucune erreur JavaScript observée.
- Les originaux sont inchangés. Le ZIP de travail est construit uniquement en mémoire.
- **Son non écouté, trackpad non testé** ; aucun confort de jeu certifié.
- Tests pérennes uniquement synthétiques : assemblage de deux ZIP, alias, contenu
  incorrect, BIOS absent/tronqué, doublons, fichiers inutiles ignorés et nouvel essai.
- `npm run check` réussi : **33 tests** sur 4 fichiers ; couverture : 97,95 % lignes,
  98,14 % instructions, 97,72 % branches, 100 % fonctions ; build réussi.
- Tests Chrome : **3 tests réussis**, dont correction de la sélection BIOS après erreur.

Le constat précédent d'absence de ROM concernait le 4 novembre ; il est levé pour
cet essai local avec les fichiers explicitement fournis par l'utilisateur.

## Incrément A — 4 novembre 2026

Environnement : macOS, Node 24.20.0, npm 11.19.0 ; **Chrome 157.0.8103.38 headless**
via Playwright. Ce navigateur automatisé ne constitue pas un essai humain sur le
trackpad Apple. Versions npm exactes dans le manifeste et le lockfile.

| Vérification                   | Statut et preuve                                                           |
| ------------------------------ | -------------------------------------------------------------------------- |
| Distribution locale versionnée | `npm run setup:emulator` réussit ; SHA-256 des fichiers vérifiés           |
| Types, lint, format, build     | `npm run check` réussi                                                     |
| Tests unitaires et NullEngine  | 27 tests réussis sur 4 fichiers                                            |
| Couverture du périmètre métier | 97,43 % lignes, 97,72 % instructions, 94,87 % branches, 100 % fonctions    |
| UI Chrome sans archive         | Message clair, aucune instance de cœur créée                               |
| Archive synthétique incorrecte | Refus avec liste des dumps manquants, nouvel essai possible                |
| Runtime réel sans ROM          | Frontend, décompresseur 7z et WASM chargés depuis l'origine locale         |
| Identification par exécution   | RetroArch 1.21.0 (`6dd4353`), cœur MAME Git Version `3a72dae`              |
| Driver dans le runtime         | `Matched game driver: marble`, trackball signalé, 30 noms de ROMs demandés |
| Échec sans ROM                 | `Required files are missing` puis `Failed to load content`, attendu        |
| Réseau au runtime              | Requêtes HTTP observées uniquement sur l'origine locale                    |
| Persistance navigateur         | Aucune base IndexedDB après tentative de lancement sans ROM                |

Les deux tests Playwright passent. Ils utilisent une archive synthétique contenant
un fichier de test sans données de jeu. Le test de runtime appelle directement
l'intégration afin de dépasser le refus normal du validateur ; ce contournement
est limité au test et n'est pas une option de l'application.

Le driver d’entrée annoncé est `emulatorjs` (dérivé de rwebinput), avec prise en
charge souris présente dans sa source ; le chemin jusqu’à la bille reste non testé.

Le manifeste des 30 dumps a été recoupé avec le pilote de la révision annoncée par
le cœur. Les preuves synthétiques durables sont dans
`third_party/core-evidence.json` et `third_party/runtime-evidence.json`.
Le rapport JSON des tests et les logs attachés sont générés dans `test-results/`.

## À valider ensuite

- Confort trackpad et écoute par Michel, puis endurance de 10 minutes.
- Repositionnement du doigt et gestes rapides sur le matériel réel.
- Cadence à 60/120 Hz, Safari en validation secondaire.
- Copie vidéo BabylonJS avec aspect, orientation et source masquée.
- Répétition de nouvelles sessions et validation de confort complète de C.

Reprendre la matrice de la section 11 de la spécification pour chaque essai : date,
versions, procédure, observations, statut et limites. Distinguer implémenté, testé
automatiquement, testé manuellement et à valider par Michel.

## Limites connues

Le banc accepte le set parent `marble`, complet ou réparti entre jeu et BIOS.
Les autres sets ne sont pas traités. Les fichiers utiles doivent être à la racine
des ZIP ; les fichiers supplémentaires sont ignorés. La pause, le silence du contexte et la purge ont été observés dans Chrome ;
la validation humaine du confort et les autres navigateurs restent à faire.

La copie vidéo n'est pas implémentée. La scène BabylonJS séparée reste une démo.
Vite signale un chunk BabylonJS supérieur à 500 kB sur cette page secondaire ;
le bundle applicatif du banc est d'environ 14 ko, hors fichiers d'émulation.
Les 11 alertes npm modérées déjà relevées concernent la chaîne d'outillage ESLint/
minimatch ; aucune correction forcée vers des versions incompatibles n'a été appliquée.
L'émulateur peut émettre des avertissements d'options manquantes lors du test sans
ROM ; les options effectives devront être relevées pendant l'incrément B.

## 6 novembre 2026 — préchargement du dossier roms

- Implémenté : préchargement du jeu et du BIOS depuis le serveur Vite de test,
  uniquement en développement. Sélection manuelle conservée et validation SHA-1
  identique ; aucun démarrage automatique de l'émulation ou du Pointer Lock.
- `npm run check` : 75 tests sur 10 fichiers, format/lint/types/build réussis.
  Couverture : 98,86 % instructions, 99,01 % branches, 100 % fonctions,
  98,78 % lignes. Avertissement BabylonJS >500 ko inchangé.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser` : 12 tests réussis. Deux
  nouveaux cas : archives synthétiques préchargées effectivement transmises au
  validateur ; échec HTTP laissant la sélection manuelle disponible. Les routes
  sont interceptées pour exclure toute lecture des ROMs personnelles en test.
- Contrôle HTTP local avec les fichiers fournis : `/__local-roms/marble.zip`
  200, 471410 octets ; BIOS 200, 57375 octets ; `/roms/marble.zip` 403.
- Inspection du build : aucun ZIP et aucune route `/__local-roms/` dans le bundle
  applicatif. `roms/` déjà ignoré par Git (dépôt toujours non initialisé).
- Ces vérifications ne constituent pas un nouvel essai du jeu ni une validation
  du trackpad physique. La mesure du plateau des gestes rapides reste à faire.

## 8 novembre 2026 — observation du dernier poll natif

- Retour humain : Chrome 155, gain 1,70×, 6582 événements ; pics reçus 199,
  transmis 338, pending 765, zéro écrêtage du raccord. Freinage difficile en
  sortie des vagues, pente de fin du niveau 3. Cause non établie.
- Implémenté : extrema signés et inversions du dernier poll natif échantillonné
  après chaque itération de l'émulateur ; conservation après pause et remise à
  zéro explicite. Pas de modification des commandes ou de la physique.
- Tests ciblés : 16 réussis. `npm run check` : 84 tests sur 11 fichiers, format,
  lint, types et build réussis ; couverture 99,02 % instructions, 99,19 % branches,
  100 % fonctions, 98,95 % lignes. Avertissement du chunk BabylonJS inchangé.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser` : 12 tests réussis sans ROM.
- Essai ponctuel Chrome 157.0.8103.38 headless avec archives locales : vrais
  mouvements souris du navigateur et capture, 63 itérations, 30 échantillons
  non nuls, X -20..87, Y -8..8 ; une inversion observée par axe. Après libération,
  état natif à zéro et statistiques conservées. Remise à zéro vérifiée via le
  bouton. Aucune erreur JavaScript. Aucun ZIP inclus dans les tests permanents.
- Limite : pas d'observation de chaque poll C, plusieurs polls peuvent échapper
  à l'échantillonnage ; valeurs répétées possibles. Aucun total de déplacement
  natif ou délai de freinage revendiqué. Ne mesure ni vitesse ni physique du jeu.
- À valider par Michel : comparaison des gestes moyens/rapides opposés au même
  gain, surtout le freinage dans la pente signalée. C reste à valider.

## 8 novembre 2026 — incrément D, vidéo de la même session

Implémenté : comparaison directe/plan BabylonJS et plan seul, caméra fixe, fond
neutre, aspect du cœur conservé, une seule session et chaîne audio. Import
BabylonJS à la demande. Copie `HtmlElementTexture` dans le hook synchrone de
l'itération native ; pas de seconde boucle d'émulation ni de preserveDrawingBuffer.

Tests automatiques : `npm run check` réussi, 92 tests sur 13 fichiers ; couverture
99,04 % instructions, 99,21 % branches, 100 % fonctions, 98,98 % lignes. Le calcul
de cadrage est inclus dans les seuils ; NullEngine vérifie scène et destruction.
`PLAYWRIGHT_CHANNEL=chrome npm run test:browser` : 15 réussis sans ROM. Les trois
nouveaux tests couvrent transfert WebGL avec couleurs primaires et nuancées,
orientation, resize, animation source masquée, arrêt des copies en direct,
nettoyage idempotent et repli vers la vue directe si la création GPU échoue.

Essai ponctuel réel avec archives locales, Chrome 157.0.8103.38 headless :
Crédit/Start et course observée dans les deux vues, captures inspectées. Passage
au plan seul, source masquée, vraie capture et 20 événements souris vus par le
driver natif ; frame 1073 → 1193 et copies 1068 → 1188. Après libération : pause
stable, frame 1201/copie 1196, zéro entrée résiduelle et aucune erreur JavaScript.
Les images sont dans /tmp uniquement, aucune donnée de ROM intégrée aux tests.

Dimensions annoncées par le cœur : 336×240 et aspect 1,333333373. Dimensions
copiées : 547×410 puis 1110×832. Conserver la distinction framebuffer/aspect/
présentation. Temps CPU de soumission copie+rendu moyen observé 0,156 ms, maximum
21,7 ms, incluant création/redimensionnements ; aucune attente GPU. Ces résultats
headless ne prouvent ni le coût GPU réel, ni la vitesse sur un écran 120 Hz.
Le rendu du jeu a été observé avec le buffer WebGL source non préservé.

Limites restantes : validation humaine du confort et du freinage, écoute audio
pendant le nouveau mode, endurance 10 min, écran 120 Hz, Safari et changements
de DPR. Les 15 tests permanents restent sans ROM ; ils ne certifient pas à eux
seuls le jeu. Avertissement des chunks BabylonJS >500 ko conservé. C n'est pas
déclaré entièrement validé ; aucune borne/bar ajouté.

## 8 novembre 2026 — clignotement après première livraison D

Retour humain : clignotement rapide en comparaison ; léger scintillement en
scroll sur plan seul. Correction implémentée : notification vidéo seulement
après un drawArrays/drawElements effectif sur le framebuffer par défaut du
canvas source ; les itérations sans dessin conservent la texture. Filtrage final
bilinéaire pour le rééchantillonnage fractionnaire, sans changement d'émulation.

Sonde ponctuelle dans le vrai runtime Chrome 157.0.8103.38 headless, archives
locales : avant, 331 copies dont 3 sans dessin et transparentes en comparaison.
Après, 338 copies sans aucun cas sans dessin/transparent en comparaison ; 579
cumulées et toujours zéro après mode source masquée. La sonde readPixels ne
fait pas partie du code livré ni des tests permanents. Cela reproduit le défaut
de copie, sans prouver que toutes les causes du scintillement humain sont éliminées.

`npm run check` réussi : 98 tests sur 14 fichiers, format/lint/types/build.
Couverture : 99,08 % instructions, 99,23 % branches, 100 % fonctions, 99,02 %
lignes ; nouveau raccord vidéo inclus. `PLAYWRIGHT_CHANNEL=chrome npm run
test:browser` : 16 tests réussis sans ROM. Le nouveau test vérifie une véritable
interpolation rouge/vert au bord d'un texel avec largeur impaire, en conservant
les couleurs intérieures. Tests unitaires de non-régression sur itérations sans
dessin, FBO, autre canvas, notification unique et validation des marqueurs.

À valider par Michel après rechargement complet : absence de clignotement dans
la comparaison, qualité du scroll et compromis du filtrage légèrement plus doux.
Écran physique/120 Hz et confort non certifiés par ces tests. Avertissements de
build BabylonJS existants inchangés.

Essai du jeu après cette correction, Chrome 157 headless : course affichée,
source masquée et capture active ; frame 1082 → 1202, copies 1076 → 1196,
20 événements natifs observés. Pause stable à frame 1212/copie 1206 ; aucune
erreur JavaScript. Coût CPU moyen de soumission observé 0,127 ms (maximum 6,2 ms),
sans mesure de complétion GPU. Aucun essai humain du nouveau filtrage.

## Écran CRT de la borne

- Le test NullEngine vérifie l'activation sur la borne, le remplacement de
  la texture partagée, la réutilisation du matériau et le nettoyage de la scène.
- Le test Chrome vérifie la synchronisation page/HUD, la persistance après
  rechargement, les différences de pixels avec les réglages de balayage et
  de courbure, la restauration exacte après désactivation et la fidélité de
  la vue BabylonJS sur plan. Un changement de réglage ne demande pas de
  nouvelle copie vidéo.
- Avec les archives locales et le vrai cœur, une partie a été lancée dans
  Chrome. Les captures en pause de la même image, de face avec et sans effet
  et en vue inclinée avec effet, montrent les coins arrondis, la courbure et
  les scanlines. Une reprise avec les parasites à 50 % s'est faite sans
  erreur de console. L'intensité préférée en jouant reste à valider par Michel.
- `npm run check` passe avec 294 tests Vitest. La suite Chrome passe avec
  37 tests. Vite signale toujours des chunks de plus de 500 ko.

### Correction du format et de la courbure

Le vrai cœur annonce 336 × 240 et un rapport de présentation de 4:3.
Chrome a mesuré un canvas source de 1110 × 833 et un viewport WebGL de
1110 × 832. Le test navigateur mesure l'image frontale sur une fenêtre 16:9,
puis vérifie le centrage d'une source synthétique plus large dans le tube
et le rétrécissement des deux axes vers les coins avec le CRT.
Les vues Frontale et Moniteur incliné d'une vraie partie en pause ont été
inspectées avec le rendu renforcé. Aucune erreur JavaScript ou shader relevée.
`npm run check` passe avec 297 tests. Les 38 tests Chrome passent.

## Boost renforcé après l'essai du saut de Michel

Michel indique que le saut vers les plateformes latérales du niveau 1 reste
irréalisable avec le trackpad et Espace. Deux parties du vrai cœur dans Chrome
ont reçu 36 commandes horizontales consécutives, à partir de l'itération 1200.
À la douzième itération, la bille a avancé d'environ 5 pixels avec 128 unités
par itération et de 11 pixels avec 256, sur une image ramenée à 336 pixels de
large. Les 36 lectures natives de chaque série correspondent à la consigne.
Cette comparaison mesure le déplacement à l'écran sur le départ du niveau 1.
Le boost maintenu utilise désormais 256. Le gain normal garde son réglage
indépendant. Le franchissement entre la rampe et la plateforme reste à vérifier.

Les essais supplémentaires ont vérifié la réponse à gauche, vers le bas et
en diagonale à droite. Le test de bout en bout avec Pointer Lock, Espace tenu
et un mouvement horizontal a observé 28 itérations de boost, dont le dernier
poll natif à (256, 0). Après Échap, la capture est libérée, le boost purgé et
les deltas en attente sont nuls. Aucune erreur JS. Les 297 tests de
`npm run check` et les 38 tests Chrome passent.

## Retour utilisateur sur Safari

Michel valide une partie à deux, le son et la lisibilité du CRT. Il rapporte
des écrans noirs intermittents et un démarrage plus lent dans Safari.
La tentative d'ouverture de Safari depuis l'outil de test a expiré.
La cause de l'écran noir et l'écart de temps restent à mesurer dans Safari.

Avec les archives locales sous Chrome, un lancement après la modification
a relevé 57 ms pour les ZIP, 27 ms pour le frontend et 1 405 ms entre le clic de
démarrage et l'événement start, sans erreur JS. Ces temps sont indicatifs
pour cet essai et ne mesurent pas un gain de vitesse dans Safari.

La perte du contexte 3D a été provoquée sous Chrome avec
`WEBGL_lose_context`. Le test vérifie le retour à la vue directe, la
restauration des pixels et la conservation d'un seul abonnement vidéo.
`npm run check` passe avec 297 tests. Les 39 tests Chrome passent.

### Capture et grésillement Safari

Michel rapporte une pause immédiate au clic sur Capturer et un son qui
grésille. Le navigateur peut confirmer Pointer Lock par événement après
le retour de la méthode. Ce cas est reproduit dans le test du bouton
Capturer sous Chrome et dans le test unitaire de l'exploration. La
configuration audio demandée dans Safari passe de 64 à 128 ms. L'écoute
et la capture avec le navigateur Safari lui-même restent à confirmer.

Un démarrage du vrai cœur dans Chrome avec l'identifiant Safari confirme
que la configuration générée contient `audio_latency = 128`, sans erreur
JavaScript. `npm run check` passe avec 300 tests. Les 40 tests Chrome passent.

### Capture en plein écran dans Safari

La capture est confirmée en fenêtre par Michel. Il signale des pauses
répétées et des coupures audio en plein écran natif. Safari antérieur à 18.2
utilise maintenant la présentation immersive dans la fenêtre.
Le test Chrome avec identifiant Safari 17 vérifie le HUD, la capture réelle,
la pause sur Échap et l'absence de demande de plein écran natif. Avec les
ROMs locales, la frame est passée de 17 à 59 avec capture active et contexte
audio en cours d'exécution, sans erreur JS. L'écoute et la fluidité dans
Safari restent à vérifier. Les 41 tests Chrome passent.

## Prototype 04 — première sonde et maillage

La sonde Lua locale s'exécute avec MAME 0.271 et les archives utilisateur.
Après Crédit et Start, les six pointeurs lus correspondent à la table
documentée par Marble Love. À l'image 1199, le descripteur actif vaut
`0x2bee2`, la cellule vaut `(17, 17)` et les seize hauteurs relevées sont
`0x4000`. Les pentes, bords et coordonnées mondiales restent à qualifier.

La scène `terrain.html` utilise une grille synthétique. Tests unitaires sur
les pentes, les trous et les UV. NullEngine vérifie les normales, les
ressources de la scène et leur destruction. La rotation de caméra est
testée dans Chrome. La texture répétée et l'éclairage ont été inspectés
sur une capture Chrome. `npm run check` passe avec 310 tests et le build
inclut `terrain.html`. Les 42 tests Chrome passent.

### Prototype 04 — rejeu de Practice Race

`scripts/measure-terrain.mjs` a exécuté quatre sessions indépendantes avec
MAME 0.271 et les archives locales. Les sept relevés et les sept images
de chaque trajectoire sont identiques entre ses deux exécutions.
Les captures du départ, de la pente et de la sortie de piste ont été
inspectées. Le relevé passe de `0x4000` au départ à des hauteurs variables
sur la pente, puis à des zéros au bord. Les images sont dans le dossier
temporaire imprimé par la commande. L'échelle verticale du maillage reste
à établir.

### Prototype 04 — maillage du relevé local

Sur deux axes et deux répétitions, le décodeur Lua retrouve les seize mots
du cœur aux sept points de contrôle et produit la même grille de départ
de 20 × 14 cellules. Le relevé a été chargé dans Chrome et la scène a
été inspectée après raccord des sommets. Les pentes et ouvertures sont
visibles. La comparaison calibrée de la silhouette et la hauteur des
falaises restent à réaliser. Les tests unitaires couvrent la validation du
JSON, les cellules partielles, les raccords et les faces exposées.
`npm run check` passe avec 324 tests.

### Prototype 04 — cadrage de comparaison

La caméra fixe est testée avec NullEngine sur trois points en coordonnées
arcade. Les deux rejeux de MAME 0.271 vérifient la projection sur six
observations avec un écart maximal de 2,14 pixels natifs. La superposition de
la vraie première image et du maillage a été inspectée sous Chrome.
Un test navigateur vérifie la sélection de la capture, son opacité et le
retour à la vue libre. La comparaison du centre de la bille valide le cadrage
local du départ, avec une silhouette de terrain encore approximative.

## Intermediate Race jouable et démarrage local

- Automatisé. Les tests couvrent le descripteur du niveau 2, le rendu d’une
  pose profonde au-delà de la plage des anciennes captures, la caméra à
  axe fixe, la présence des pièces du pont et la restriction des fichiers à
  la boucle locale. Playwright vérifie le préchargement avant F2 avec des
  archives synthétiques.
- Chrome avec les archives locales. Le rejeu régénère le point de reprise.
  La page d’étude précharge les archives, F2 ouvre le jeu, le cœur affiche
  Intermediate Race avec 60 secondes, et la vue moderne affiche la même
  bille. Le curseur capturé déplace la bille. F2 rétablit le départ
  `(220, 108)` pendant la capture. Le mécanisme du pont a été observé à
  plat et relevé dans le cadrage d’étude.
- À vérifier en jeu. Parcours complet du niveau 2 en vue moderne et confort
  sur le trackpad de Michel. Le pont 3D suit encore le cycle d’étude.

## Correction de la reprise F2 et acteurs 3D

- La trace initiale montre des déplacements et une mort sans aucun delta
  reçu. La reprise des ports et de la banque Slapstic supprime ce défaut.
  Le test Chrome réel vérifie exactement X=220 et Z=108 pendant huit
  secondes, bille visible, puis F2 pendant la capture et les trois vues V.
- Le trackpad en caméra derrière déplace la bille vers l’avant du cadrage.
  Les tests unitaires vérifient aussi le repère pour des orientations
  horizontales différentes et la préservation de l’amplitude.
- Un rejeu dans le cœur Web a parcouru le début d’Intermediate Race
  jusqu’au premier contact avec les vers. La capture comparative montre
  leurs positions et la bille étourdie avec les étoiles. Le balai et
  les poses des modèles extraits sont visibles dans la scène de contrôle
  WebGL. Les tests vérifient le changement de modèle, les morphs,
  l’arrêt en pause et le masquage des étoiles et de la langue.
- Le parcours complet et l’alignement fin des durées de casse, nettoyage,
  saut et langue restent à valider en jeu. Les essais automatiques de
  route n’ont pas reproduit chaque interaction à chaque passage.
- La livraison passe `npm run check` avec 490 tests Vitest et 51 tests Chrome.
  Vite conserve son avertissement sur la taille des chunks BabylonJS.
