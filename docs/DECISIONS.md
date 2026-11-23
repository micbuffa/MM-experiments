# Décisions et preuves

## Niveau 5 : mort par oiseau et écrasements — 22 novembre 2026

Le driver officiel [Atari System I de MAME](https://github.com/mamedev/mame/blob/master/src/mame/atari/atarisy1.cpp)
configure le matériel ; la fonction `marble` configure notamment le Slapstic 103.
Les séquences de jeu sont étudiées dans le programme 68010 local :
contact `0x19e14`, état joueur 11, compteur 102 ; dispatcher `0x254ba`,
handler `0x25876`, fragments `0x13ade`. Les positions des glyphes sont lues
dans les groupes MO du joueur, sans simuler une nouvelle explosion.
Leur clipping reste celui du cœur. La rotation des fragments 3D est fixe par
identifiant ; aucune minuterie Babylon n'est ajoutée.

La sonde native confirme aussi les listes d'écrasement : noire 0x21f7a/7e/82
puis 0x21f8a, ver 0x21a62, amibe 0x21efe. La présentation utilise deux paliers
de compression pour la noire puis le mesh final ; les deux autres modèles
écrasés restent fixes comme leurs images natives. La palette, les positions,
les collisions, les délais et la reconstruction restent dans le cœur.

## Niveau 5 : pools natifs et motifs de référence — 22 novembre 2026

Les routines 68010 `0x19024..0x19244` initialisent/actualisent neuf miniatures
à `0x401890`, pas `0x28`, types 7/8/9. `0x19a40..0x19d8e` gère dix oiseaux
à `0x4019f8`, pas `0x38`. Une sonde Chrome sur le cœur épinglé confirme ces
bases, les déplacements et les états. Les listes `0x224ca`, `0x224d6`,
`0x224e2` et `0x22546` gouvernent leurs phases ; l'affichage ne les rejoue
pas avec une horloge indépendante. Le driver MAME n'est pas présenté comme
le code des règles de jeu.

Michel demande explicitement la position originale des cercles/ellipses.
Le motif répétitif de Rolling Madness ne convient donc pas comme source
principale. Un masque des pigments du PNG original est projeté dans les
coordonnées isométriques vérifiées sur le départ et GOAL ; les teintes sont
reprises dans la palette du cœur. La référence ne renseigne pas les faces
cachées. Les tours conservent deux facettes par quart de pyramide, y compris
aux coins NE/SW qui demandent l'autre diagonale.

## Préserver la topologie du Y — 22 novembre 2026

Le Y local original est fermé (352 triangles, chaque arête partagée par deux
faces) ; la découpe puis le remplacement des coiffes créait des bords libres.
Le rendu utilise désormais une subdivision avec lèvres protégées, puis une
déformation continue de l'ensemble. Les deux peaux ne sont plus aplaties
séparément. Les normales sont moyennées sur les sommets coïncidents, sans
changer le cœur arcade ni le fichier extrait. Les contrôles de géométrie et
les vues internes complètent les tests de rendu ; voir le nouvel audit local
`scripts/audit-intermediate-pipe.mjs` et `docs/VALIDATION.md`.

## Tremblement procédural des aspirateurs — 21 novembre 2026

Michel a explicitement préféré une reconstruction procédurale aux meshes
`hoover_on` / `hoover_down` de Rolling Madness. Leurs fichiers restent des
références locales et ne sont pas ajoutés à la bibliothèque de rendu.

La table active du type 0x0b utilise deux entrées à `0x22016` / `0x2201a`
(pointant sur deux sprites distincts), puis la sentinelle ; celle du type
0x0d est à `0x220a6` / `0x220aa`. `readLevel4VacuumMouthFrames` reconnaît
ces entrées dans le champ d'image émise object+0x42, plutôt que dans le champ
suivant object+0x3e. Les ouvertures et retraits ne sélectionnent pas cette
petite déformation de tête. La fréquence, la pause et les transitions restent
celles du cœur. Les amplitudes en 3D sont une adaptation de présentation,
sans affirmation d'identité entre chaque sommet et chaque pixel d'un sprite.

## Marteaux : image affichée et table exacte — 21 novembre 2026, 18h35

La table `0x22346..0x2237e` contient 15 pointeurs pour 9 sprites distincts.
Leur ordre relatif est `0,1,2,3,3,4,5,6,7,7,7,7,8,1,0` ; la répétition de
la frappe est intentionnelle. Cette séquence est partagée par le mesh importé
et le secours procédural dans `level4HammerSpriteSequence`.

Les scripts `0x1d40c`, `0x1d43e`, etc. lancent cette table une fois avec une
cadence de deux mises à jour natives par entrée. `0x12a86..0x12ab2` initialise
le compteur et le pas ; `0x13224..0x132a2` attend le compteur, émet l'image
par `0x13334` puis avance le pointeur par `0x132e0`.
**`0x13440` conserve le pointeur effectivement émis à object+0x42** : lire
object+0x3e après cette mise à jour sélectionne déjà la prochaine entrée.
Le lecteur des marteaux est corrigé et son test différencie explicitement
ces deux champs.

Les attentes escamotées dépendent du groupe choisi : 30/60 mises à jour pour
le premier groupe, 25 pour le second, 90 avec décalages initiaux pour les
suivants. Ni cette cadence ni le déclenchement par zone ne sont recréés dans
BabylonJS. La création par défilement et le réveil des objets en zone 10,
via `0x13966..0x13a7e`, restent ceux du programme original. L'audit est fait
sur le désassemblage 68010 local ; il ne suppose pas que le driver MAME
implémente ces règles de jeu. Les sondes nouvelles n'ajoutent pas de preuve
de traversée jouée complète à la preuve de création déjà consignée ci-dessous.

## Marteaux du niveau 4 : sources natives — 21 novembre 2026

Le rendu suit les objets du cœur ; aucune horloge BabylonJS ne déclenche une
frappe en mode jeu, y compris avec les meshes procéduraux de secours.

Preuves dans le programme 68010 local :

- `0x144e4..0x14572` convertit l'ancien et le nouveau défilement en tranches
  de 16 pixels et appelle `0x12dfa`. La table du niveau 4 à `0x1dfd4`
  contient une entrée `40..64` sans script unique. `0x12e4a..0x12ea6`
  sélectionne alors un des quatre groupes de quatre scripts, via le générateur
  natif `0x13a98` et la table `0x1ded8`. La création suit donc le défilement,
  et non directement la distance euclidienne de la bille.
- Les scripts initialisent X=105 et Z=102/104/106/108. L'opcode `0x11`,
  interprété à `0x12c84`, place l'objet en attente (état 4) avec la zone 10.
  Sur un changement de zone du joueur, `0x13966`, puis
  `0x13a24..0x13a7e`, reprend les objets en attente dont la zone correspond.
- Ensuite les boucles natives alternent la table de frappe `0x22346..0x2237e`
  et l'image escamotée `0x20c14`, avec les attentes propres au groupe choisi.
  Les objets ne sont pas remis à l'attente simplement parce que le rendu
  s'éloigne : leur durée de vie reste celle du cœur arcade.
- `0x12904..0x12920` décale les coordonnées des scripts de 19 bits : les
  positions entières en RAM valent huit fois le numéro de case. Le lecteur
  précédent cherchait 102/104/106/108 directement et ignorait les vrais slots.

Sonde locale MAME 0.271, BIOS TTL, le 21 novembre : après déplacement contrôlé
du défilement, quatre objets de type `0x0c`, zone `0x0a`, image `0x20c14`
ont été observés. X entier=840 pour les quatre ; Z=864,848,832,816, soit
les cases 108,106,104,102. Cette sonde confirme la création et les unités.
L'activation par zone et les boucles ont été vérifiées dans le désassemblage ;
la sonde qui écrivait directement la zone du joueur contournait la routine de
transition et ne constituait pas un essai de traversée native.

Le rapprochement des 15 images arcade avec les poses du modèle Rolling Madness
reste une adaptation visuelle ; le calendrier et l'activation sont lus en RAM.
Une partie complète jouée par Michel reste nécessaire pour apprécier la frappe
et les collisions ensemble.

## 19 novembre 2026 — Balai, pont synchronisé, ombres tuyaux et retours visuels

- **Pont articulé d'Intermediate Race** : les dumps RAM MAME (`/tmp/mm-worm-reference/ram-*.bin`,
  frames 2450–3296) montrent que `word(0x772)` vaut `0x6fc8 + 2 * step` et `word(0x774)`
  vaut `0xf048 + 2 * step` pour `step = 0..6` (7 paliers natifs de 0 à 16 unités arcade,
  `0xf040` avant activation à la frame 3054). Le mode live pilote `createIntermediateBridge`
  via `setIntermediateBridgeStep` sans boucle autonome.
- **Balai (`player_broken`)** : les dumps `/tmp/mm-animation-review/broken/ram-*.bin`
  confirment `long(base + 0x72)` (`0x20fde + 4 * primaryIdx`, 0..31), `byte(base + 0x7f) === 1`
  à partir de `primaryIdx === 9`, et `long(base + 0x7a)` (`0x215f6 + 4 * broomIdx`, 0..43).
  Le groupe `broom.jpg` est recalé à `y = -5,67` (sol du modèle) et mis à l'échelle `0,84`.
- **Ombres des tuyaux sur les parois bleues** : le soleil principal (`intermediateSunDirection`)
  a `toSun.z = -0,372 < 0` (derrière les parois `+Z` situées derrière les deux tuyaux).
  Une lumière directionnelle statique (`intermediate-pipe-wall-light`, `includedOnlyMeshes = [cliffs]`,
  `REFRESHRATE_RENDER_ONCE`) projette les ombres de `intermediate-pipes-shell` vers la droite
  sur les parois bleues sans modifier les ombres mesurées des pyramides ni auto-ombrer les falaises.
- **Out of Time / Game Over en 3D** : `mode === 4` est maintenu dans `readModernPhase` /
  `readPracticePose` et les bandeaux `OUT OF TIME` / `GAME OVER` sont lus dans l'alpha-RAM
  `$A03000` (lignes 4..27) pour affichage superposé sur le HUD 3D.

## 19 novembre 2026 — Peinture et visibilité de la bille

La peinture commune des états normal/dizzy/cassé est générée dans le code.
Les UV du modèle privé vont jusqu'à V=2 ; WRAP est obligatoire sur l'albedo
et les marques émissives. Le modèle normal est converti par le même script
local que les morphs. Aucun matériau n'est créé à chaque frame.

Les murs restent regroupés pour le rendu. Un couloir fragmentaire tramé évite
de découper la falaise en milliers de meshes ou de rendre transparente toute
la course. Il ne modifie ni géométrie ni collisions. API vérifiée dans les
sources locales BabylonJS 9.33.2 : `MaterialPluginBase`,
`getUniforms().externalUniforms`, `registerForExtraEvents`,
`hardBindForSubMesh`, `getCustomCode`. L'activation doit suivre l'inscription
des événements supplémentaires. Le test Chrome vérifie des pixels rendus,
y compris la restauration hors du couloir. Le shader court-circuite le calcul
lorsque son poids est nul.

Les messages de score/temps sont décodés dans l'avis auxiliaire natif :
0x223aa = 1000 points, 0x2243a = −5 SEC, 0x22446 = +10 SEC.
Ils ne sont jamais déduits d'une variation de compteur. La baguette est
reconstruite en géométrie fine, pilotée par le script natif ; son déclenchement
et l'ajout effectif du temps appartiennent au cœur original.

## Finitions de la glace et modèles de Rolling Madness 3D

Le relevé de la cuvette et la projection arcade permettent de raccorder
les reflets clairs et foncés à leur silhouette sur la capture. Les
joints restent au-dessus de ces motifs. La zone plate ajoute une
trame diagonale. Le reflet physique est atténué pour éviter les
aplats clairs qui suivaient les triangles à la verticale. Sur les
falaises, les bords des coulures et du mur bleu se partagent les mêmes
sommets et les joints verticaux sont texturés.

Dans l’installateur Rolling Madness 3D, `actor/bridge.txt` appelle
`lev2_bridge.ase.mesh` en boucle. Ses 6 032 sommets sont répartis en
16 poses pour un jeu d’UV de 377 sommets et 264 triangles. Il
référence notamment `bridge_side.png` et `bridge_down.png`.
Le maillage `lev2.ase.mesh` comporte 88 triangles avec le matériau
`lev2_tile_glass.png`. L’installateur contient aussi
`lev2_glass_env.png`, une texture de réflexion. Le rendu de l’étude
utilise les relevés arcade et des motifs recréés à partir des captures.

Le cadrage derrière la bille suit en perspective la direction des
déplacements récents. Il garde son cap à l’arrêt et remonte si le
relief relevé passe trop près de l’objectif.

## Glace et arrivée d’Intermediate Race

Les limites de la glace sont X 90–105 et Z 95–106. Le marquage GOAL
occupe les dalles X 110–113 et Z 109–118. Ces limites proviennent du
recalage des groupes de surfaces de Rolling Madness 3D, contrôlé visuellement
contre la capture arcade. Le matériau de glace combine une texture turquoise
tracée, un reflet stylisé et l’éclairage spéculaire. Le marquage et les
damier bleu et noir des drapeaux adaptent les fonctions de Practice Race.

Le fond des tuyaux reprend désormais la géométrie du dallage à ses jointures.
Seule la coque projette une ombre dans le tuyau. Le piston est recentré sur
la dalle violette et la tranche turquoise est entièrement sous le tablier.

## Direction des ombres et sorties des tuyaux d’Intermediate Race

Dans la capture native à 306 px de défilement, le sommet de la pyramide
centrale se projette vers (159,65) et la pointe de son ombre vers
(238,84). Le sol sous l’ombre est à 34 unités arcade sous le sommet,
dont 8 pour le socle. L’inversion de la projection isométrique donne
un déplacement horizontal d’environ −54,5 unités en X et +24,5 en Z.
La lumière directionnelle du niveau 2 reprend ce vecteur. Les falaises
reçoivent les ombres et la carte reste sans flou. Le biais est ajusté
après comparaison de quatre réglages dans Chrome.

Le dallage du relief passait au-dessus du fond gris importé dans les
deux bouches. Un revêtement mat suit maintenant les pentes du sol
sous les bouches et s’arrête à leur seuil. Le chapeau des pyramides
conserve ses joints et arrondit son profil près du sommet.

## Finitions du pont et des tuyaux, raccord de la cuvette finale

Les normales du maillage de Rolling Madness 3D sont continues le long
des cylindres. La préparation locale les transforme par l’inverse
transposée du recalage et les normalise. Les soudures sont des bandes
étroites découpées sur la coque. Le plancher des deux sorties est gris.
La texture turquoise du pont est générée avec une bordure claire et
des rivets. Le piston, les colliers, la roue et les biellettes utilisent
la même pose que le tablier.

Au palier près du premier tuyau, le coin isolé de trois dalles prenait
la hauteur du niveau voisin. Les quatre coins suivent maintenant le
palier. Sur la descente finale et autour de sa cuvette, le sommet
commun sert à raccorder les tuiles tout en préservant leurs ouvertures.

## Accès direct aux courses par l’état Web

Le cœur MAME 2003-Plus épinglé annonce la prise en charge des états.
Dans Chrome, `gameManager.getState()` a produit 1 106 168 octets au
départ de Practice Race. Après un écart de position injecté dans un
essai isolé, `loadState()` a restauré la position et le descripteur
au passage suivant du cœur. Une vérification synchrone immédiatement
après l’appel avait échoué. Le sélecteur de courses a besoin d’états
produits par ce même cœur au départ de chaque course et d’un contrôle
du descripteur après restauration.

## Raccords des ondulations et volume du pont

Sur les vagues, les coins nord donnent le profil longitudinal mesuré.
Les coins sud de certaines dalles conservaient une autre hauteur,
produisant des triangles de falaise entre les voies. La présentation
prolonge le profil mesuré sur toute la largeur de ces voies et raccorde
leur sortie basse en conservant les vides. Le tablier a désormais une
épaisseur et sa base violette, sa roue et son piston sont en volume.
Le piston reste lisible dans un cadrage bas dédié.

## Pont articulé et ombres d’Intermediate Race

Le relevé image par image sous MAME 0.271 repère un tablier de quatre
dalles sur quatre, de X 61 à 64 et de Z 56 à 59. La charnière en Z 60
reste à 16264. Le bord libre gagne 16 unités, marque une pause puis
redescend. La pose se répète après 144 images. Les cellules adjacentes
confirment le vide en X 60 et la plateforme basse à 16220 en X 65.
La version BabylonJS reconstruit le mécanisme violet visible sur la
capture avec un piston, une roue et une embase texturée.

Le générateur d’ombres directionnelles inclut les falaises en plus
des tours. Le dallage reçoit les ombres des fosses et des talus.

## Jonctions continues sur les falaises d’Intermediate Race

La limite latérale du relevé conserve des cellules selon leur origine
jusqu’à un écart de 21 entre X et Z. Les cellules pleines à la limite
formaient un escalier. `intermediateRims` coupe leur coin extérieur
sur la diagonale commune. La paroi issue de ce bord suit le même tracé
au pied de la falaise. Les séries de dalles à trois coins le long des
rebords rectilignes reprennent le quatrième coin dans leur plan.

## Pyramides d’Intermediate Race

Les trois empreintes du relevé suivent quatre rangées de 3, 4, 4 et
3 dalles. La dernière commence une dalle plus loin que la première.
Le dessus des socles est à 16272. Le modèle de pierre utilise deux
coins biseautés pour épouser l’empreinte et des pans bas plus hauts.
Le joint du chapeau est placé à 17 unités au-dessus du socle et la
pointe à 26, d’après les proportions de la capture arcade.

## Blocs 2 × 2 d’Intermediate Race

Les quatre groupes de blocs isolés autour des rampes suivent des
empreintes de 2 × 2 dalles. Dans le relevé, la rangée avant manque un
coin par dalle. Au bloc (63,42), la limite latérale du relevé coupe
aussi une colonne. L’étude recrée chaque dessus à la hauteur de sa
première dalle, puis le générateur de falaises en ferme le périmètre.

## Rebords des fosses et des falaises d’Intermediate Race

Le relevé traverse en diagonale certains rebords. Les hauteurs mixtes
d’une dalle coupaient les dessus des cinq fosses et les bords de la
plateforme en triangles. Les dimensions relevées donnent cinq rebords
rectangulaires de 6 × 4 dalles en périphérie. Leur intérieur reprend
le profil incliné du sol. Les sections rectilignes des falaises et les
plateformes isolées retrouvent leurs coins avant l’extrusion verticale.
Le raccord au premier rang de la grande rampe utilise son profil mesuré.

## Premier relevé d’Intermediate Race

MAME 0.271 passe au descripteur `0x2c54c`. Son champ relatif `0x18`
donne 216 diagonales. Le décodeur des hauteurs de Practice Race fournit
une grille de 130 × 130 cellules pour le niveau 2. Le mot de défilement
va de −16152 à −15846 pendant le rejeu. Le même repère que Practice Race
projette la bille bleue au départ et pendant la descente. Les données
verticales atteignent 16097, soit 287 unités sous le plan de référence.

La présentation recrée les trois bandes de la rampe en travers avec le
profil lu sur leurs bords et pose des pyramides sur les socles relevés
autour de (45,45), (54,43) et (43,54). Les données brutes restent dans
`local-roms/` et les modifications de relief sont limitées au rendu.

Dans le bloc d’état de J1, l’octet `0x400032` vaut 5 aux images 3077–3177
pendant l’interaction avec une créature verte. Il vaut 7 aux images
3205–3264 pendant la disparition de la bille, puis 4 pendant sa
reconstruction. L’image 3060 affiche « 1000 » points. Le rejeu prolongé
jusqu’à la fin du chrono n’a pas reproduit la baguette ni permis
d’isoler le balai. Le déclenchement du bonus de temps reste à relever.

## Message de rattrapage en duo

Dans MAME 0.271, J1 fait défiler le parcours et J2 reste en arrière.
À l’image 1468, le cœur retire cinq secondes à J2 et prépare sa
réapparition. Dans le bloc de J2, le mot relatif `0x88` reste à
`0x00ff` pendant la reconstruction, puis son octet haut augmente
jusqu’à 40 après le retour à l’image 1516. Il repasse à `0xffff` à
l’image 1684. Une chute dans le vide conserve `0xffff`. L’octet signé
relatif `0x80` fournit le mouvement horizontal du texte « −5 SEC ».
La vue moderne affiche le bitmap de la couleur du joueur pendant
cette fenêtre, une fois la bille visible. L’état du cœur fixe la durée,
environ 2,8 secondes dans ce rejeu.

Le chrono réserve une colonne à la fin de chaque cellule de 16 pixels
pour séparer les bordures noires de chiffres adjacents.

## Arrivée à deux joueurs et dallage rétro

Sous MAME 0.271, le rejeu J1 puis J2 franchit l’arrivée aux images
1863 et 1919. Avec l’ordre inverse, J2 puis J1 y arrivent aux images
1891 et 1941. Les captures montrent GOAL bleu dans le premier cas et
rouge dans le second, y compris après le second passage. Dans les deux
rejeux, l’octet 68010 `0x4003a4` vaut `0xff` avant l’arrivée, puis
conserve l’index du premier joueur `0` ou `1`. La vue moderne lit cet
index pour retrouver la palette même après la disparition de la
première bille ou lors d’une entrée en vue 3D à mi-course.

Dans le cadrage de la dernière descente, le bas des parois orange
reste sous l’image arcade. Le maillage prolonge les falaises exposées
dans cette zone, en gardant leur bord supérieur et les marches du
relevé. Le grain rétro est inscrit dans une texture de dalle 16 × 16,+avec filtrage au plus proche à l’agrandissement et interpolation des
niveaux de mipmap à distance.

## Précision de la pose 3D à faible vitesse

Une impulsion suivie d’un relâchement dans MAME 0.271 donne les valeurs Z
174,211 → 173,649 → 174,093 pendant que la bille se stabilise. La lecture
du seul mot entier en faisait un aller-retour 174 → 173 → 174. L’adaptateur
conserve désormais le mot fractionnaire sur les trois axes des deux
billes. La reconstruction reçoit la même précision pour son ancrage.
Les coordonnées complètes alimentent la bille et la caméra de suivi
sans délai de filtrage. Le défilement garde son mot indépendant.

## Reconstruction des billes et ombres de Practice Race

Dans le rejeu MAME 0.271, l’état d’animation `4` prépare la bille au
point de reprise. Quand le drapeau de dessin passe à 1, le mot relatif
`0x6e` descend de 47 à 1, puis vaut 0 au retour à l’état roulant.
Chez J2, cette phase dure de l’image 1457 à 1550. La scène conserve
le point de reprise du cœur. Le rejeu solo image par image montre huit
éclats en orbite antihoraire. Au compteur 16, leur ellipse mesure environ
100 × 50 pixels natifs, et son centre est à environ 16 pixels au-dessus
du point de reprise. La vue 3D approxime les positions mesurées dans le
plan de la caméra. Les deux rayons et le décalage vertical diminuent
avec le compteur. Les éclats sont affichés à partir du compteur 45,
quand ils commencent à être visibles dans le rejeu solo.
Le rejeu solo confirme le même compteur relatif chez J1, avec 47 à
l’image 1452 et retour à l’état roulant à l’image 1546.

Les deux pyramides emploient le même constructeur. Dans le relevé,
les dalles `(25,30)` et `(26,30)` du palier droit ont un coin absent.
La reconstruction du dallage complète les coins manquants des dalles
échantillonnées sur l’emprise commune des deux paliers.

Le soleil conserve l’azimut précédent et passe d’environ 17° à 24°.
Sur une surface horizontale, la portée du rayon est environ 32 % plus
courte. Le générateur utilise `FILTER_NONE` pour les contours nets.
Les billes sont ajoutées à sa liste uniquement quand l’option est
activée dans la vue moderne.

## Deux joueurs et continuité du rendu après un saut

Dans MAME 0.271, le nombre de joueurs à `0x400396` vaut 2 en duo.
Le second enregistrement commence `0xe2` octets après le premier.
X, Z et hauteur de J2 sont aux mots `0x400106`, `0x40010a` et
`0x40010e`. L’identifiant J2 vaut 1 à `0x400113`. Les octets de
visibilité et d’animation restent relatifs à cet enregistrement.
Une chute de J2 suivie d’une reconstruction (`4`) a été observée
avec le premier emplacement encore actif.

Sur la couche alpha en duo, les scores commencent aux colonnes 3 et 32
et les chronos aux colonnes 13 et 25. Les tuiles de J2 portent un décalage
de palette de `0x0400`. Les tests utilisent des valeurs différentes pour
les deux joueurs.

Dans la vidéo de Michel, vers 22,5 s, l’arcade continue pendant que le
panneau 3D affiche le message de repli. La vidéo ne contient pas les
mots de RAM qui permettraient d’isoler le rejet précis. Le relevé complet
borne désormais le cadrage à la plage mesurée et admet une marge de six
dalles pour les billes en vol. Les drapeaux de visibilité et les
coordonnées d’une bille pilotent son propre maillage. Le descripteur et
le mode global déterminent la disponibilité du parcours.

## Survol au départ de Practice Race

Dans le rejeu MAME 0.271, le mode global `5` commence à l’image 712.
Le cadrage du départ et le premier emplacement actif de J1 se rejoignent
à l’image 778, puis le mode global passe à `0` à l’image 1030. Entre ces
deux états, l’octet 68010 `0x400014` avance de `0x42` à `0x3d` avec
un passage par zéro. `practicePose` expose une progression de 0 à 1
pendant ce compte à rebours solo.

La trajectoire perspective part d’un cadrage d’ensemble, balaye le
relief et rejoint la bille. Le suivi et la vue du dessus conservent la
même direction horizontale que le cadrage arcade pendant le jeu.
Le réglage de 35° à 85° modifie le champ vertical des vues perspective
et l’échelle de la projection orthographique. La valeur centrale de 55°
conserve le cadrage arcade de référence.

## Soulèvement au départ de Practice Race

Dans le rejeu MAME 0.271 sans commande après Start, les entrées de relief
68010 `0x40076e` et `0x400774` sont à `0xf040` sur terrain plat. Les cinq
codes du premier mot sont `0x20c2`, `0x2245`, `0x244a`, `0x254e` et
`0x25d0`. Le second mot reprend le même code avec le bit `0x4000` actif.
La montée est observée aux images 1339, 1343, 1347, 1351 et 1355, puis
la dalle revient à plat à l’image 1565. La vue lit cette paire en mémoire
à chaque instantané de Practice Race.

Les profils mesurés le long de X sur les dalles 16 à 18 valent
`[2,0,0,0]`, `[5,0,0,0]`, `[10,0,0,0]`, `[14,4,0,0]` et
`[16,6,2,0]` en unités de hauteur arcade. Le maillage de présentation
prolonge ce profil sur trois dalles le long de Z pour obtenir une pente
continue et ferme les arêtes exposées. MAME fait évoluer la bille et
choisit la durée de chaque phase.

## Score et chrono de Practice Race

La carte mémoire MAME 0.271 expose la couche de tuiles `alpha` aux adresses
68010 `0xa03000–0xa03fff`. Le même bloc commence à `0x1fc3650` dans le
`HEAPU8` du cœur Web validé par `CORE_WASM_SHA256`. La comparaison de la
séquence de mots du libellé SCORE, du score et du chrono a confirmé ce
raccord. La grille comporte 64 mots par ligne et les mots sont little-endian
dans le WASM.

Dans l’interface solo, les caractères du score sont sous le libellé SCORE,
à partir de la colonne 3 de la ligne 2 (indices à partir de zéro). Les deux
chiffres du chrono occupent chacun 2 × 2 tuiles à partir des colonnes 19 et 21,
sur les lignes 1 et 2. Les quatre codes d’un chiffre vont de
`0x2900 + 4 × chiffre` à ce même code augmenté de 3. Le changement de
valeur tous les 60 frames, l’arrivée et l’expiration à 00 ont été observés
dans les rejeux natifs. Dans la vue moderne, la valeur déjà produite par
l’arcade est affichée en lecture seule. Une suite de tuiles inconnue est
masquée. Le score conserve le séparateur de milliers du jeu.

## Pose J1 dans le cœur Web

Dans le binaire validé par `CORE_WASM_SHA256`, les mots de la RAM 68010
commencent à `0x1d99478` dans `HEAPU8`. Les mots sont little-endian. Les
longs 68010 gardent le mot fort en premier. Le descripteur à `0x474` vaut
`0x2bee2` pour Practice Race. Les mots forts des champs de l’objet J1
à `0x24`, `0x28` et `0x2c` donnent X, Z et la hauteur. La sonde n’expose
la pose que dans le mode de jeu observé en solo, avec le compteur d’objets
attendu et le premier emplacement actif. La lecture se fait après une
itération du cœur depuis le chemin vidéo existant.

Le mot signé à `0x97e` vaut `-16144` (`0xc0f0`) au départ. Le rejeu
du premier défilement sous MAME 0.271 observe une remontée de l’image
d’un pixel natif par unité, avec un écart apparent de 2 à 3 pixels
entre la RAM et le rendu vidéo sur les images comparées. La vue 3D
cadre chaque pose à partir du mot de la même itération. La plage
utilisée va de `-16144` à `-16069`, bornes observées dans les rejeux.

Les ombres des poteaux et des pyramides sur la capture arcade de départ
s’allongent vers la droite et légèrement vers le bas. La lumière
directionnelle de la vue moderne adopte cette direction, avec un filtrage
doux et une intensité modérée pour la bille.

## Chute et réapparition de J1

Les adresses octet 68010 `0x400032` et `0x400034` correspondent aux
indices `0x33` et `0x35` depuis la base WASM. Pendant le jeu normal,
le couple vaut `(0, 1)`. Le passage à `(0, 0)` coïncide avec la
disparition observée dans l’arcade. La reconstruction se déroule en
`(4, 0)` puis `(4, 1)`, aux coordonnées du point de reprise. La
sphère entière et son ombre réapparaissent au retour en `(0, 1)`.
La vue 3D représente cette animation par un intervalle sans bille.
Elle continue de lire le défilement dans les quatre états observés.
Une pose active hors du relevé ou un état inconnu rétablissent
l’affichage arcade.

## Arrivée de Practice Race

Sous MAME 0.271, le mot de défilement atteint `-15784`, soit 360 pixels
depuis le départ. Dans Chrome avec le cœur Web épinglé, la trajectoire
validée atteint `-15785`. L’octet à `0x400032` vaut 6 dès l’entrée
dans la zone d’arrivée. La pose de la bille reste disponible en mode global 0 durant ce passage.
Le mode global 3 ouvre le bilan. La vue rend alors la main à l’arcade,
qui continue quand `0x2c54c` (Intermediate Race) devient actif.

Le relevé complet utilise `practice-terrain-v2` avec origine (0, 0),
91 × 91 cellules et plage de cadrage jusqu’à `-15784`. Le format v1
garde l’origine (10, 11) et sa plage jusqu’à `-16069`. Les deux
formats utilisent les mêmes unités et règles de conversion du relief.

## Commandes J2

Dans le build épinglé, le pilote Web RetroArch répond à la requête souris
avec le même état pour chaque port. Le cœur MAME accepte en revanche le D-pad
de chaque port pour ses entrées trackball numériques. L’essai local a mesuré
un pas de neuf unités de compteur par frame pour une direction tenue
(pas numérique de 30 avec sensibilité à 30 %).

Le glue installe un filtre dans la table WASM au slot 490, identifié comme
`rwebinput_input_state` de RetroArch 6dd4353 dans le binaire vérifié par SHA-256.
Le filtre limite les requêtes `RETRO_DEVICE_MOUSE` au port 0 et relaie les
autres appels au pilote. Le clavier J2 envoie les directions D-pad au port 1.
L’animation utilise le pas numérique configuré par le pilote Atari pour J2
et les deltas échantillonnés par le pilote Web pour J1.

## Borne Atari System I — 13 novembre 2026

Le modèle SketchUp fourni par Michel identifie Gozer comme auteur et correspond
à la [borne Marble Madness de 3D Warehouse](https://embed-3dwarehouse-classic.sketchup.com/model/0a8f07a9-4747-47e3-84c9-9c2b81f99cd5/Marble-Madness-arcade-game).
OpenSKP 1.3.0 a lu la géométrie et les UV du fichier SketchUp 2021 et produit
un GLB intermédiaire. Les pièces finales utilisent VertexData, avec quatre
textures WebP locales et les actions de la borne attachées aux zones cliquables.
Le matériau de l’enseigne est émissif. Les décors incluent le liseré bleu, les
deux boules bleu et rouge et les grilles circulaires des photos de référence.
La texture live du cœur occupe l’ouverture du moniteur inclinée de 11,2°.
Le détail des sources figure dans [le registre des assets](../public/assets/README.md).

## Sens de rotation de la boule 3D — 10 novembre 2026

La rotation Euler cumulait deux angles du mesh. Une rotation antérieure
pouvait donc incliner l’axe apparent du geste suivant. Le signe vertical
faisait aussi rouler le sommet vers l’écran quand le doigt allait vers le
bas du trackpad. Le quaternion compose chaque incrément dans les axes de
la borne. Le sommet suit le geste latéral, et roule vers le joueur quand
le doigt descend. Le plafond visuel de 45° par échantillon évite qu’un grand
delta fasse presque un tour entre deux orientations affichées.

Le pilote arcade convertit déjà les coordonnées du pointeur vers les deux
compteurs trackball du programme avec une somme et une différence. Voir
les [lectures des ports](TRACKBALL_PORTS.md). Le correctif agit sur le mesh,
après l’échantillonnage natif. Les deltas envoyés au cœur gardent leur
repère et leur amplitude.

## Prototype 03 — audio positionnel et cadence

L’archive locale épinglée `mame2003_plus-wasm.data` contient le wrapper
`mame2003_plus_libretro.js`. L’inspection du wrapper montre que la création
du contexte OpenAL appelle `ac.createGain()` puis
`gain.connect(ac.destination)`, et stocke ce nœud dans `AL.currentCtx.gain`.
Les sources OpenAL convergent vers ce master. La branche positionnelle remplace
ce lien pendant l’exploration, dans le contexte d’origine. Le test Chrome
OfflineAudioContext compare les deux canaux avant, pendant et après le
routage. Le vrai cœur a produit un signal mesurable sur cette branche.

Le DPR plafonné réduit la surface du canvas 3D. La texture vidéo, le gain
du trackpad et la cadence du cœur restent indépendants de ce choix. Les ombres
des principaux meubles utilisent une carte calculée à la demande. Le
chronométrage du rendu utilise les APIs d’instrumentation BabylonJS 9.33.2
et indique la disponibilité des horodatages GPU.

## Socle — 4 novembre 2026

TypeScript strict, Vite, npm, versions exactes et lockfile. BabylonJS ES modules.
Vitest pour les règles applicatives ; NullEngine pour la scène ; Playwright pour
les vérifications réelles du navigateur. `fflate` lit les archives ZIP locales.

## Incrément A — choix du candidat

### FBNeo stable écarté pour ce premier essai

La release stable officielle consultée est [EmulatorJS 4.2.3](https://github.com/EmulatorJS/EmulatorJS/releases/tag/v4.2.3),
commit `e150dc0491ae747028919fb82d6598954976ede6`. La documentation arcade accepte
explicitement `fbneo`, mais cela ne garantit pas la présence de tous les pilotes
FBNeo actuels dans le binaire distribué.

Le rapport du paquet `4.2.3/data/cores/reports/fbneo.json` indique un build le
14 juin 2025 à 18:50 UTC. Le pilote Atari System 1 de FBNeo a été ajouté le
[26 avril 2026](https://github.com/finalburnneo/FBNeo/commit/abffa67a8c48)
(après ce build). L'inspection du WASM distribué ne trouve ni `136033.623`, ni
`136032.205`, ni `atarisy1`, ni `Marble Madness (set 1)`. Certaines autres chaînes
Marble Madness désignent des versions console ou Marble Madness II : elles ne
prouvent pas la prise en charge de l'arcade originale.

Décision : utiliser le repli prévu par la spécification, **`mame2003_plus`**. Ne pas
compiler MAME ou poursuivre une intégration sur le seul pilote FBNeo actuel.
Cette décision concerne la distribution stable inspectée, pas toutes les versions
possibles de FBNeo.

### MAME 2003-Plus retenu comme candidat, pas encore validé en jeu

- Frontend : EmulatorJS 4.2.3.
- Core : nom explicite `mame2003_plus`, variante WebGL2 sans threads.
- Rapport : build du 14 juin 2025, 19:09:40–19:14:42 UTC.
- `build.json` : wrapper 2.0.2, frontend minimal 4.2.2. **Ce numéro n'est pas la version de MAME.**
- WASM : 27 858 472 octets, compilé avec succès par WebAssembly dans Node pendant l'investigation.
- L'archive et le WASM ont leurs SHA-256 dans `third_party/core-evidence.json`.
- Les quatre identifiants cherchés sont présents dans ce WASM. Il reste à observer le vrai jeu.
- Le lancement réel du runtime dans Chrome annonce **RetroArch 1.21.0 (Git 6dd4353)**
  et **MAME Git Version 3a72dae**. Il reconnaît le driver `marble`, signale un
  trackball et demande exactement les 30 noms de ROMs du manifeste, puis échoue
  comme attendu sans ROM. Voir `third_party/runtime-evidence.json`.
- Le commit source annoncé par le cœur a été résolu et son pilote relu :
  `3a72dae33dfae65871158f03dbc1e849d74b4060`. Les 30 noms, tailles et empreintes
  correspondent à la liste préparée. Le rapport de build seul ne fournissait
  pas cette révision ; elle est désormais relevée à l'exécution.

## Archives attendues

Depuis le 5 novembre 2026, le banc accepte le set parent **`marble` (set 1)**
complet dans un ZIP, ou réparti entre **jeu + BIOS facultatif**. Les noms, tailles,
CRC et SHA-1 de référence sont dans `src/emulation/marble-roms.json`, tirés du
[pilote de la révision annoncée par le cœur](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/drivers/atarisy1.c).

Les archives fournies par Michel contiennent les 27 dumps de jeu attendus et les
3 dumps système dans `atarisy1.zip`, avec les suffixes de sockets Atari. Le
premier chargeur ne lisait qu'un ZIP complet et les refusait à tort comme
incomplets. Correspondances vérifiées sur les vrais octets :

| Nom MAME     | Noms BIOS acceptés (taille et SHA-1 obligatoires) |
| ------------ | ------------------------------------------------- |
| `136032.205` | `136032.205.l13`                                  |
| `136032.206` | `136032.206.l12`                                  |
| `136032.107` | `136032.107.b2` ou `136032.104.f5`                |

Décision : extraire seulement les entrées nécessaires, vérifier chaque candidat,
puis produire un ZIP canonique **uniquement en mémoire**, avec les 30 noms MAME.
Ceci répond à la structure réellement attendue par le cœur : les octets du jeu ne
sont pas modifiés, les ZIP originaux ne sont pas réécrits et aucun dump n'est
persisté. Les entrées supplémentaires (dont les clones en sous-dossiers) sont
ignorées sans décompression. Les clones ne deviennent pas pour autant supportés.
Une copie redondante correcte est acceptée ; une copie conflictuelle est rejetée.
Limite : 16 Mio par ZIP, taille déclarée contrôlée avant décompression, SHA-1 réel
après décompression. Les erreurs de BIOS permettent de corriger la sélection en
conservant le jeu choisi.

## API du frontend vérifiées dans le tag v4.2.3

Références : [loader.js](https://github.com/EmulatorJS/EmulatorJS/blob/v4.2.3/data/loader.js),
[emulator.js](https://github.com/EmulatorJS/EmulatorJS/blob/v4.2.3/data/src/emulator.js),
[GameManager.js](https://github.com/EmulatorJS/EmulatorJS/blob/v4.2.3/data/src/GameManager.js).
Toutes les API internes utilisées sont confinées à `src/emulation/emulatorjs.ts`.

| Besoin                   | API/fichier réellement observé                          | Utilisation et limite                                                                                    |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Création                 | `new EmulatorJS(selector, config)` comme dans loader.js | Utilisée après chargement du bundle local ; adaptation interne versionnée                                |
| Fichier local            | `config.gameUrl` accepte Blob/File via `toData`         | ZIP de travail vérifié, assemblé en mémoire ; `gameName: 'marble.zip'` préserve le nom de set dans le FS |
| Démarrage explicite      | `startOnLoad: false`, `startBtnName`, événement `start` | Bouton natif ; `start` ne suffit pas à garantir que le programme arcade fonctionne                       |
| Pause                    | `instance.pause()` → `gameManager.toggleMainLoop(0)`    | Utilisée par le banc ; la reprise complète sera traitée en C                                             |
| Volume                   | `instance.setVolume(0)`                                 | Coupe les sources OpenAL connues ; vérifier le silence réel avec le jeu                                  |
| Reset                    | `gameManager.restart()`                                 | Observée, pas exposée comme fonction validée dans ce banc                                                |
| Vidéo                    | `instance.canvas` et `Module.canvas`                    | Référence disponible ; dimensions observables après lancement, copie GPU non validée                     |
| Archives supplémentaires | `config.externalFiles`, `loadExternalFiles()`           | Chemin de fichier explicite préserve les octets ; pas encore utilisé                                     |
| Fin de session           | événement `exit`, nettoyage partiel dans GameManager    | Pas de `destroy()` public inventé ; nouvelle session par rechargement complet du document                |

Adaptations locales conservées dans le module :

1. Désactiver `checkForUpdates` pour éviter la requête non versionnée `stable`.
2. `disableDatabases` et `disableLocalStorage`, remplacer `window.EJS_STORAGE`
   par `EJS_DUMMYSTORAGE` pour les états, monter les sauvegardes sur MEMFS au lieu
   d'IDBFS. Le `beforeunload` du frontend peut toujours démonter ce FS mémoire.
3. `noAutoFocus: true` et focus explicite avec `preventScroll` au démarrage : le
   focus natif sur mousedown déplaçait le bouton pendant le clic dans Chrome.
4. Traduction française du tag (nom amont `af-FR.json`) et libellés du banc.

Les fichiers téléchargés restent intacts. Les fichiers locaux sont installés par
`scripts/setup-emulator.mjs`, avec empreintes dans `third_party/emulatorjs-assets.json`.
La politique réseau de la page refuse les services externes au runtime. Les accès
réseau de développement Vite restent autorisés en local.

## Entrées relatives : constat initial avant l’incrément B

Le runtime annonce le driver d’entrée **`emulatorjs`**, et non `rwebinput`.
Le code du [driver `emulatorjs`, dérivé de rwebinput](https://github.com/EmulatorJS/RetroArch/blob/6dd4353/input/drivers/emulatorjs_input.c)
reçoit `movementX/Y`, accumule les deltas en attente, puis les consomme et les remet
à zéro lors du poll. Côté MAME, le
[module libretro](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/mame2003/mame2003.c)
expose une entrée souris ; l'option `mame2003-plus_xy_device` propose `mouse`.
Ces sources ne sont pas une preuve que le binaire distribué délivre effectivement
les bons deltas au jeu. Les identifiants de révision sont maintenant relevés à l’exécution ; le chemin effectif jusqu’à la bille reste à tester avec le jeu.

`core.json.options` du paquet est vide : le frontend n'active pas automatiquement
sa capture souris via `supportsMouse`. L'incrément B devra donc vérifier Pointer
Lock explicite, options du cœur, accumulation et nettoyage sans dupliquer le
mécanisme natif. Aucune injection d'événement synthétique n'est retenue comme
solution de commande ; les données synthétiques actuelles servent uniquement aux tests.

## État au 5 novembre 2026

Les archives utilisateur sont désormais disponibles hors du projet. La sélection
des deux ZIP, leur validation, l'assemblage mémoire et le lancement ont été essayés
dans Chrome 157.0.8103.38 headless : le mode attract affiche la bille et le niveau.
Aucune erreur JavaScript observée. Audio et entrées ne sont pas certifiés ;
les incréments B, C et D restent à poursuivre. Les tests pérennes n'utilisent que
des données synthétiques. Voir `VALIDATION.md`.

## Incrément B — 5 novembre 2026

### Commandes et chemin réel

- Crédit : `gameManager.simulateInput(0, 2, 1)` puis relâchement `0` ; Start : index
  `3`. Ces identifiants sont ceux de SELECT/START dans le driver `emulatorjs` et
  du mapping arcade EmulatorJS, pas des keycodes clavier supposés. Impulsions
  de 120 ms, pas de répétition pendant la même pression, annulation sur pause.
- MAME configuré explicitement avec `mame2003-plus_xy_device=mouse` et
  `mame2003-plus_input_interface=retropad`. Les commandes clavier natives sont
  neutralisées ; seul le contrôle relatif est offert pour la bille.
- Capture Pointer Lock standard, demandée directement sur le canvas par un clic
  utilisateur. Le retour du focus ne reprend pas le jeu. Échap, blur, onglet
  masqué et perte de capture suspendent et purgent. Une interruption annule aussi
  une demande de capture non encore résolue.

Le driver natif accumule déjà les deltas et les remet à zéro lors de son poll :
aucun accumulateur piloté par requestAnimationFrame n'est ajouté.

### Raccord maintenu et contrôlé dans le glue Emscripten

Le driver ne fournit pas d'API exportée pour purger l'état souris. Pour permettre
la purge réelle et le gain, un raccord limité au callback Emscripten est installé
par `coreInputPatch.ts` lors de `initGameCore`. Les deux SHA-256 (glue JS et WASM)
sont vérifiés avant transformation, puis un marqueur unique doit correspondre.
Aucun fichier téléchargé n'est réécrit, aucun WASM recompilé. Le glue exécuté en
mémoire est adapté ; sa version et son ABI sont volontairement strictes.

Source de l'ABI :
[emulatorjs_input.c, révision 6dd4353](https://github.com/EmulatorJS/RetroArch/blob/6dd4353/input/drivers/emulatorjs_input.c).
La souris est le premier membre du userdata. Sa structure occupe 64 octets :
quatre doubles de scroll, puis x/y à 32/36, pending à 40/44, poll à 48/52, boutons
à 56. Le raccord borne et aligne le pointeur. La purge n'écrit que ces 64 octets.
Les tests vérifient qu'un octet voisin reste intact. Toute évolution de version
exige une nouvelle vérification de l'ABI, jamais une simple modification du hash.

Les événements originaux sont reçus par le callback déjà enregistré. Le raccord
modifie seulement les champs movement X/Y emballés par Emscripten avant l'appel
natif ; il ne dispatch aucun MouseEvent synthétique. Le filtre refuse les événements
non authentiques, hors capture ou pendant la pause. Clics souris, molette et
tactile ne commandent pas la bille. Le gain commun conserve les fractions et
respecte les limites int16 du total pending natif ; un excédent saturé est signalé
et abandonné, sans inversion ni impulsion reportée.

Gain provisoire 1×, bornes UI 0,25–4×, réinitialisable ; ce ne sont pas des valeurs
calibrées de fidélité. Le pilote MAME conserve ses sensibilités trackball de 30
sur X et Y et son inversion X originale (`PORT_ANALOG` du pilote `atarisy1.c`).
Aucune rotation d'isométrie, inertie, zone morte ou accélération n'est ajoutée.
L'accélération macOS et les unités exposées par le navigateur restent possibles.

### Audio et validation

Le contexte OpenAL existant (`Module.AL.currentCtx.audioCtx`) est repris depuis
les gestes Crédit/Start, capture ou Reprendre. Le volume est appliqué aux gains
existants. Pause : volume nul et contexte suspendu ; un listener de statechange
resuspend une réactivation automatique d'Emscripten tant que le jeu est en pause.
La reprise restaure le volume choisi. Aucun second AudioContext ou double routage
vers les haut-parleurs. Un analyseur sans sortie fournit un RMS de diagnostic,
qui peut être nul pendant un silence et ne certifie pas l'écoute.

Essais locaux Chrome avec les archives utilisateur : la course démarre après
Crédit/Start ; déplacement de la bille observé après le compte à rebours ;
valeurs X/Y vues dans le poll natif après des mouvements pointeur Chrome ; signal
audio non nul (RMS observé 0,06412). Après Échap : frame stable, pending/poll/boutons
à zéro, AudioContext suspendu ; reprise explicite fonctionnelle. Cela ne remplace
pas les essais de précision sur le trackpad Apple par Michel.

Seuls `marble.gain` et `marble.volume` sont mémorisés. Le frontend natif garde ses
caches désactivés ; ROMs/BIOS et sauvegardes restent en mémoire. Les menus natifs
qui pourraient contourner nos commandes de session sont masqués.

## 6 novembre 2026 — préchargement pour le banc local

Michel a placé ses archives dans `roms/` et demandé leur préchargement. Cette
autorisation remplace la sélection manuelle obligatoire pour le serveur de test
local uniquement. Utiliser un plugin `configureServer` Vite (API vérifiée dans
les types installés) et deux noms fixes ; ni import d'archive dans le bundle,
ni copie vers `public/`, ni service en production/preview. Le navigateur conserve
la validation SHA-1 et les gestes explicites audio/Pointer Lock. Les ZIP sont
fournis par Michel, sans téléchargement externe ni inclusion dans les tests.

## 8 novembre 2026 — diagnostic du freinage et des inversions

Mesures humaines reçues : Chrome 155 sur Mac, gain 1,70×, 6582 événements,
`peakRaw=199`, `peakSent=338`, `peakPending=765`, `saturated=0`. Pas d'écrêtage
dans le raccord ; aucune preuve sur la réponse physique du jeu. Michel signale
un freinage difficile en fin de niveau 3, dans la pente en sortie des vagues.

Le glue extrait localement de l'archive versionnée a le SHA-256 attendu.
`MainLoop.runIter(func)` appelle `callUserCallback(func)` puis ses post-hooks.
Ajouter une observation entre ces deux opérations, via un marqueur unique, sans
modifier le WASM ni sa cadence. Le driver figé (`rwebinput_input_poll`, source
locale vérifiée de RetroArch 6dd4353) copie pending vers delta puis vide pending.
L'observation lit les champs poll 48/52 après l'itération ; aucun accès ou hook
au poll C lui-même. Les métriques s'appellent donc `nativeSampling`, sans total
ni nombre de polls prétendument exhaustifs. Les extrema et inversions restent
après Échap. Aucune modification du gain, des règles ou de la physique.

## 8 novembre 2026 — copie vidéo sur un plan BabylonJS

D est demandé par Michel, tandis que le confort du freinage de C reste ouvert.
Pas de borne/bar. Une seule instance et une seule chaîne audio sont conservées.

API vérifiées dans les sources installées de BabylonJS 9.33.2 :
`HtmlElementTexture` accepte un HTMLCanvasElement et appelle
`engine.updateDynamicTexture`/`texImage2D` directement, sans contexte 2D. Ses
constructeurs enregistrent les extensions engine dynamic/video texture.
`StandardMaterial` additionne `emissiveColor` au texel émissif : choisir noir,
sinon l'image est blanche (détecté par le test navigateur, corrigé).

Le WebGL2 source réel utilise `preserveDrawingBuffer:false`. Copier dans le hook
synchrone après `callUserCallback(func)` déjà figé permet de garder ce réglage,
sans capture d'écran périodique ni lecture CPU. Les tests synthétiques et le
runtime réel vérifient la copie. Aucune boucle d'émulation supplémentaire.

Le frontend possède `GameManager.getVideoDimensions(key)` qui appelle par cwrap
`get_video_dimensions`. Essai réel : largeur native 336, hauteur 240, aspect
annoncé 1,333333373 ; la résolution du canvas de présentation dépend du cadre.
Ne pas déduire l'aspect affiché du seul rapport 336/240. Les cadres adoptent
l'aspect annoncé ; la texture conserve le canvas entier, bandes incluses.

Le coût affiché est le temps CPU de soumission copie+rendu, pas un temps GPU ni
un indicateur de vitesse d'émulation. Le cœur avance indépendamment du rendu ;
le mode direct désactive les copies. La source est masquée par visibilité en mode
BabylonJS seul, sans être détachée. Aucune nouvelle dépendance.

## 8 novembre 2026 — correction du clignotement vidéo

Michel signale un clignotement rapide en comparaison et un léger scintillement
pendant les scrolls en vue seule. La copie était déclenchée après toute itération,
y compris sans dessin, alors que le canvas source visible n'est pas préservé.
Sonde ponctuelle du vrai runtime dans Chrome 157 headless : avant correction,
3 copies sans dessin sur 331, et ces 3 buffers étaient transparents ; après,
0 copie sans dessin / 0 transparente sur 338 en comparaison, puis 579 cumulées
après le mode source masquée. Ces mesures identifient un défaut réel, sans
prétendre reproduire la fréquence complète ressentie sur le Mac de Michel.

`coreVideoPatch.ts` instrumente deux appels uniques vérifiés dans le glue au
SHA-256 existant : `GLctx.drawArrays(mode,first,count)` et
`GLctx.drawElements(mode,count,type,indices)`. Un indicateur est levé seulement
pour le canvas Module et le framebuffer par défaut ; remis à zéro avant chaque
itération. Après les diagnostics d'entrée, au plus une notification vidéo est
émise si un dessin a eu lieu. Pas de lecture CPU des pixels en production ni
d'échantillon noir supprimé par heuristique. Les FBO intermédiaires sont ignorés.
Les appels instanciés/blits d'autres renderers ne sont pas couverts par ce
raccord ciblé : vérifier de nouveau si le binaire ou le renderer change.
Le WASM et les fichiers tiers sur disque restent inchangés.

La texture BabylonJS passe de nearest à bilinéaire : le canvas source est déjà
mis à l'échelle par le frontend, et un second nearest à une échelle fractionnaire
fait varier brutalement les arêtes lors du scroll. Test GPU sur arête rouge/verte
à largeur impaire : interpolation vérifiée, couleurs intérieures conservées.
Ce choix adoucit légèrement les pixels ; le confort du défilement reste à
comparer par Michel, sans changement de gain ou de cadence du cœur.

## 8 novembre 2026 — bilan E et contrôle du build

Michel confirme la correction visuelle puis demande la tâche suivante :
préparer E sans déduire une validation humaine globale. Ajouter une suite
Playwright preview distincte du serveur dev : 4173, `tests/preview`, compilation
préalable et arrêt automatique du serveur. La CI prévoit désormais ces tests.
Les tests chargent le build, contrôlent sélection/erreurs, SHA-256 et notices
runtime, absence des archives et du préchargement dev. Aucune dépendance ajoutée
et aucune ROM dans les tests permanents.

Preuve de reconstruction : copie de sources sans ROM ni node_modules initial,
npm ci offline depuis cache, runtime préexistant vérifié par manifeste, puis
check et comparaison des 49 sorties SHA-256 identiques, même environnement.
Le bilan actuel est `docs/RELEASE.md` ; HANDOFF est condensé autour de l'état
réel, les preuves chronologiques restent dans VALIDATION/DECISIONS.

## 8 novembre 2026 — grandes impulsions et saut du niveau 1

Michel précise qu'il ne peut pas reproduire les impulsions de trackball permettant
de quitter le chemin classique vers les plateformes latérales au niveau 1. Le
freinage et ce saut restent des critères fonctionnels non validés. L'absence
d'écrêtage du pont int16 n'était pas une preuve de fidélité des entrées au jeu.

Sources figées relues : `src/mame2003/mame2003.c::osd_xy_device_read` transmet
les entrées souris ; `src/inptport.c::scale_analog_port` applique la sensibilité
et le masque ; `src/drivers/atarisy1.c::trakball_r` transforme posx/posy vers
cur[0]=posx+posy et cur[1]=posx-posy sur UINT8. Ports marble : masque ff et
sensibilité 30. Référence exacte :
https://github.com/EmulatorJS/mame2003-plus-libretro/tree/3a72dae33dfae65871158f03dbc1e849d74b4060/src
Les sources consultées sont conservées dans /tmp/marble-feasibility, sans ROM.

Une grande différence de compteurs sur 8 bits peut replier le mouvement modulo
256 : 927×0,30 ≈278, donc une différence entre extrémités d'environ 22 au lieu de 278.
C'est une hypothèse sur le symptôme, pas une observation des lectures effectives
du programme : MAME interpole ses ports et le jeu peut les lire plusieurs fois
par frame. Ne pas conclure au débordement effectif à partir des seuls pics.

Ajouter un essai désactivé par défaut plutôt qu'une modification silencieuse
du contrôle : borne conjointe L1=416 avant poll (floor((127-2)×100/30)), direction
préservée, marge pour arrondis, excédent abandonné sans étalement temporel. Les
petits mouvements et le gain sont inchangés ; aucune physique ou règle du jeu
modifiée. Les statistiques avant/après sont distinguées. Le mode n'est pas
mémorisé, pour ne pas transformer cet essai en valeur de fidélité acquise.
La bonne limite et l'utilité de ce mode restent à confirmer sur le saut.

## 9 novembre 2026 — rejeter le limiteur, mesurer la réponse

Retour explicite de Michel : aucune amélioration malgré 20 limitations confirmées
par son diagnostic. Retirer ce réglage et ses modules/tests dédiés, garder le
contrôle linéaire et un test de grande impulsion. Ce retrait n'est pas une
réduction des exigences de couverture ; le nouveau suivi optique est couvert
et les seuils sont conservés. La séquence native pré/post et l'écriture privée
des seuls pending servent au banc, sans exposition de commandes synthétiques
dans l'interface du jeu.

La sauvegarde temporaire `GameManager.getState/loadState` a été vérifiée dans le
frontend installé puis essayée ; les départs n'étaient pas comparables. Série
rejetée sans cause attribuée, sans fichier persistant. Le banc retenu recharge
tout le runtime à chaque essai et fixe Crédit/Start/impulsion par frame. Il
utilise les API internes réellement existantes, un profil isolé et seulement
un serveur loopback ; pas de ROM ni instantané ou image dans le rapport.

Résultats consignés dans INPUT_RESPONSE et la preuve JSON : départs identiques,
consignes natives reçues exactement, réponse visible non monotone aux grands
pics et effet de la durée. Le décor inchangé sur 360000 pixels écarte un déplacement
de caméra sur les contrôles réalisés. Ne pas confondre centroïde écran et
coordonnées internes ; ni la cause ni le saut réussi ne sont démontrés.
Le script final et le suivi pur testé sont conservés pour éviter de revenir
à des réglages empiriques successifs sans mesure du jeu.

## 9 novembre 2026 — lire les ports effectifs sans modifier le programme

Le binaire figé n'exporte pas les noms readinputport/trakball_r et ne contient pas
de section name. L'inspection de l'archive sans ROM révèle une seule association
F20000/F20007 dans les données, à l'adresse 9849616, handler de table 17927.
Les structures Memory_ReadAddress16 et les cinq lignes voisines correspondent
aux sources publiques figées atarisy1.c et memory.h. Exports réels Eh/Ch et
signature (i32,i32)→i32 vérifiés. Le script capture les octets à l'instanciation
pour leur SHA-256, puis le module refuse toute incohérence.

Ne pas ajouter de fausse API de lecture au frontend : le diagnostic volontaire
interpose un trampoline WASM dans la table réelle, appelle l'original une fois,
observe et préserve ses valeurs/arguments/exceptions, puis restaure. Aucun octet
WASM ou code/RAM de ROM modifié. Journaux bornés et erreurs d'observation isolées.
Le banc en mode normal reste identique, le traceur est importé seulement avec
--ports et absent du bundle applicatif.

Résultat à 416 : ports cohérents avec −125 modulo 256 malgré le mouvement écran
inversé ; résultat à 768 : repli modulo ambigu. Cela distingue les deux cas et
invalide l'explication unique par le masque des ports. L'interprétation par le
programme reste inconnue ; aucune correction de physique ou gain fondée sur ces
seules lectures. La phase du compteur interne diffère de +1 de celle du banc :
conserver les deux étiquettes et ne pas inventer des mesures en cycles CPU.
Preuves et limites : TRACKBALL_PORTS.md et trackball-port-evidence.json.

## 9 novembre 2026 — référence native et contrôle de phase

Utiliser MAME 0.271 ARM64 déjà présent sur le Mac comme référence plus récente
que 2003, sans le présenter comme la dernière version. Version retournée et
empreinte binaire consignées dans `third_party/mame-reference-evidence.json`.
`-verifyroms marble -bios ttl` accepte les archives originales sans modification.
Les 30 SHA-1 utilisés par le frontend sont présents dans la déclaration native
sélectionnée, qui contient aussi trois PROMs de carte ; aucun dump téléchargé.

API vérifiées dans les sources/docs 0.271 et en exécution :
`space:install_read_tap` peut substituer le retour entier ; un second tap
indépendant observe les octets réellement modifiés. Masque actif 255 en natif,
contre convention inactive 65280 dans l'ancien handler. `screen:pixels()` renvoie
ici des couleurs RGB 32 bits, malgré une palette disponible ; ne pas convertir
ces valeurs avec pen_color. `screen:frame_number()` est une méthode dans ce
binaire. `field:set_value`/`clear_value` pilotent crédit/Start ; aucun mouvement
analogique synthétique SDL. Un processus neuf remplace toute restauration d'état.

La phase naïve montrait une forte différence ; les contrôles temporels la
remettent en cause. Un même décalage −1 pour toutes les amplitudes reproduit
les déplacements Web à moins d'un pixel natif. L'inversion à 416 est aussi
présente dans cette référence. Pas de preuve d'un bug spécifique à 2003-Plus,
ni motif de remplacer le cœur ou d'ajouter turbo/inertie/limiteur sur ce résultat.
Ce n'est pas une preuve d'identité des états internes ou de fidélité du saut.
Protocole, chiffres et limites : `REFERENCE_COMPARISON.md`.

## 9 novembre 2026 — durée du geste observée avant tout réglage

Les seuls extrema ne permettent pas de reconstituer un geste. Ajouter un
observateur volontaire armé par le bouton de mesure existant, borné à 128 lignes
et deux secondes vérifiées aux callbacks, arrêté après 0,18 seconde de silence
et dernier poll nul. Il agrège les événements acceptés entre callbacks existants,
conserve leurs bornes de temps et les deltas après gain, puis observe le dernier
poll natif. Aucun nouvel event listener, timer, persistance ou transformation des
commandes. Garder explicitement les événements interrompus avant sampling.
Le compteur interne après itération conserve sa convention ; ne pas le confondre
avec le numéro avant itération des bancs. performance.now mesure la réception
dans le navigateur, pas le temps matériel du trackpad. Ce dernier poll reste
une observation partielle, pas tous les polls du programme.

Profils contrôlés de même total : 1536 en 1/2/4/6/12 itérations et 416 en 1/2/4/8,
plus neutres. Tous les polls correspondent aux consignes, les réponses changent
fortement et peuvent changer de sens. Contrôle de décor étendu jusqu'à 1236 sur
les cas répétés, pour ne pas confondre déplacement et scroll. Ni lissage ajouté,
ni turbo, ni nouveau limiteur ou modification du gain. Le choix d'un correctif
attend les gestes réels de Michel ; un profil optimal universel n'est pas démontré.
Résultats et limites : `MOTION_PROFILES.md`.

## 9 novembre 2026 — rendre le démarrage jouable sans capture préalable

Défaut reproduit dans Chrome : écran « Copyright Warning » encore affiché après
Crédit/Start. Capture/mouvement puis Échap mettaient en pause et grisaient les
boutons, laissant une procédure peu claire. Reprendre les réactivait, mais ce
détour n'est pas nécessaire au démarrage.

Option réellement disponible dans le WASM installé et vérifiée dans
[core_options.c du commit annoncé](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/mame2003/core_options.c#L117) :
`mame2003-plus_skip_disclaimer`, valeurs disabled/enabled, défaut disabled.
Configurer enabled via defaultOptions. Ne pas activer skip_warnings, option
séparée qui masque les problèmes de compatibilité. La vérification réelle
confirme le mode attract puis une partie lancée par Crédit/Start sans aucun
mouvement préalable. Pas de clic/touche simulé pour acquitter l'écran, pas de
changement de binaire ou d'archive. Les notices et règles de fichiers restent
inchangées.

Politique explicite : Crédit et Start sont accessibles en pause et leur clic
reprend avant la pression. Le helper pur arcadeCommand est testé pour cet ordre
et pour l'absence de reprise/purge quand le cœur tourne déjà. Échap, perte de
focus/visibilité gardent pause/silence/purge ; aucun retour de focus ne reprend.
Une capture n'est plus nécessaire pour débloquer le démarrage. Attendre toutefois
l'écran du jeu : le signal start du frontend arrive pendant l'amorçage.

## 9 novembre 2026 — rendre la mesure compréhensible

Retour de Michel : il a fait une accélération, Échap puis Copier, et ne peut pas
qualifier le relevé de moyen/rapide. La première version mesurait uniquement le
premier segment : 35 événements / 300 ms / pic L1 319, tandis que le pic X 916
cumulé était hors segment. Ne pas attribuer ce décalage à une mauvaise procédure
humaine ou certifier l'absence de perte sur le geste fort non capturé.

Remplacer l'arrêt au premier silence par la sélection du plus grand pic de
commande jusqu'à l'interruption. Segments bornés, meilleur et candidat seulement,
classement par max des pics L1 transmis intermédiaires et dernier poll ; premier
segment gardé en cas d'égalité. Conserver les événements interrompus sans poll
et documenter le critère. Pas de modification des commandes ou de leur gain.
Une seule procédure dans l'interface : Nouvel essai → Capturer → accélération →
Échap → Copier. Afficher l'état de mesure en français. Pas de demande de deux
gestes à reconnaître, pas d'attente imposée. Tests : petit premier mouvement,
accélération suivante, retour faible, Échap immédiat, bornes/réarmement.

## 9 novembre 2026 — aucun armement manuel nécessaire

Le relevé suivant de Michel a de nouveau des commandes (pic natif X 1189, aucun
écrêtage), mais motionTimeline idle/gain 1 alors que le gain joueur est 1,70×.
L'observateur n'avait jamais été armé ; ces deux champs ne décrivent pas une
commande réellement envoyée à gain 1. Ne pas reprocher un clic manquant :
l'armement manuel reste une source d'erreur dans la procédure.

Désormais, toute capture réussie depuis l'état non capturé appelle la même
remise à zéro que le bouton : compteurs globaux/natifs puis timeline au gain
courant. Capture du pointeur refusée : rien n'est effacé, puisque setCaptured(true)
n'est pas appelé. Pause/reprise sans capture préserve les mesures, Échap fige
le meilleur segment, recapture démarre un autre essai. La chaîne de commandes,
le gain mémorisé et les fractions/purges existantes restent inchangés.
Procédure unique : Capturer → accélération → Échap → Copier. Nouvel essai
reste un raccourci facultatif, aucune qualification moyen/rapide requise.

## 9 novembre 2026 — calibration et contrôle de phase avant recommandation

Comparer le profil complet puis une fenêtre de huit itérations fixée autour du
pic humain, à plusieurs gains équivalents. Réutiliser le banc, conserver les
commandes X/Y et leur timing ; refus des dépassements int16, quantification des
préfixes à erreur <1 count. Ne pas choisir un gain sur la distance finale d'un
long trajet exposé aux collisions. Pas de gain réappliqué à la capture source.

0,85× semblait améliorer le coup isolé, mais une seule itération de décalage
rend ce résultat presque nul : candidat rejeté comme recommandation sur cette
seule mesure. Contrôles affinés 0,40/0,45/0,50× aux deux phases ; 0,50× garde la
direction et une réponse plus importante aux deux timings parmi ces valeurs.
Ces gains respectent le pas 0,05 du curseur, contrairement aux valeurs fines du
balayage exploratoire. Les 25 essais et leurs limites sont dans CALIBRATION.md.

Ajouter un bouton d'essai explicite 0,50×, sans changer DEFAULT_GAIN ni les
préférences existantes au chargement. Même gain linéaire/persistance que le
curseur, aucune saturation supplémentaire, inertie, turbo ou reprise implicite.
Retour à 1,70× par le curseur ; reset reste à 1×. Candidat humain, pas correction
de saut certifiée. La vérification physique du confort et de la partie demeure
la prochaine étape ; le profil capturé est conservé pour éviter de le redemander.

## 9 novembre 2026 — priorité au contrôle confort et à la 3D

Retour humain prioritaire : 0,50× rend le contrôle normal insuffisant et ne
résout pas les accélérations. Invalider la recommandation de jouabilité issue
du coup isolé ; conserver les mesures comme historique, pas comme recette.
Michel autorise explicitement un boost Espace et demande d'avancer en 3D.
Section 15 de la spec et AGENTS documentent cette évolution du périmètre initial.

Choix de confort : contrôle normal linéaire 1,70×, candidat 0,50× retiré et
restauré à 1,70× s'il est resté enregistré ; autres gains valides conservés.
Espace maintenue fournit des deltas natifs continus de norme L1 128 par itération,
dirigés au trackpad. Cela évite le seul multiplicateur instantané qui augmenterait
les gros paquets déjà peu efficaces. Pas de saut natif supposé ou de modification
de physique/ROM. Le générateur n'émet rien sans direction récente/nouvelle et se
purge avec toute interruption. Le gain normal est ignoré pour ces commandes
assistées, qui ont leurs propres compteurs ; relâcher revient au contrôle normal.
Les commandes générées sont distinguées des événements souris dans la timeline.

Pré-hook natif déjà vérifié réutilisé, même ABI et empreintes. Émission seulement
si le pont natif existe et session capturée/active, une fois avant son itération.
Le rendu BabylonJS ne fait pas avancer le cœur ni le boost. Tester maintien,
relâchement, commande invalide, fraîcheur de direction, focus et destruction.
Confort humain et réussite du saut restent ouverts ; ne pas bloquer le rendu 3D
sur une nouvelle campagne de calibration.

Présentation ajoutée : écran/support/socle procéduraux, caméra perspective fixe,
éclairage et sol. Même texture et même scène de vidéo, décor créé paresseusement,
réutilisé/désactivé au retour au plan, nettoyé avec la scène. Aucun asset externe,
bar, borne détaillée, reconstruction de niveau ou autre moteur. Les modes de
référence restent disponibles, avec tests de couleur GPU et d'abonnement unique.
La capture du vrai rendu a été examinée dans /tmp, sans l'ajouter aux assets.
Détails et suite visuelle : COMFORT_AND_3D.md.

## 9 novembre 2026 — Plein écran de la même session

La tâche suivante autorisée est la présentation 3D plein écran avec HUD compact.
Utiliser Fullscreen API de l'élément englobant, vérifiée dans les types DOM locaux
et Chrome 157, avec repli CSS immersif si l'appel est absent ou refusé. Le HUD
délègue aux contrôles existants pour conserver un seul propriétaire des entrées.
L'entrée et la sortie mettent en pause ; aucune reprise automatique ni capture
implicite après une transition fullscreen. La reprise reste un geste de jeu.
Le focus revient après fullscreenchange, car le bouton extérieur ne peut pas
recevoir le focus avant la fin effective du plein écran (régression reproduite
et corrigée dans le test Chrome). Le même canvas/texture reste utilisé.

## 10 novembre 2026 — Deux cadrages fixes de la même scène

Michel confirme le fonctionnement du plein écran puis autorise les caméras
frontale et perspective proposées. Garder la perspective initiale et ajouter
une frontale orthographique centrée sur l'écran pour sa lisibilité. Un seul
objet caméra, aucune navigation attachée au trackpad ni animation susceptible
de détourner les entrées du jeu. Réutiliser le frustum testé pour les aspects
source/viewport et une marge de cadre. Les sélecteurs page et HUD ont le même
propriétaire videoComparison, sans préférence persistante supplémentaire.
BabylonJS 9.33.2 installé : TargetCamera.setTarget/rotation et Camera.mode/ortho*
vérifiés dans les types et testés dans le vrai Chrome WebGL2.

## 10 novembre 2026 — Raccourcis capturés et Start du deuxième port

Demande explicite : 5/(, 1/&, 2/é. Résolution par event.key pour les alias demandés,
Shift autorisé ; raccourcis système/composition ignorés. Exiger capture active et
session non suspendue pour ne pas reprendre une pause par une touche résiduelle.
Une impulsion de120ms, même générateur que les boutons ; pas d'entrée clavier
native supplémentaire.

Le frontend local4.2.3 envoie les arguments player/button/value à
functions.simulateInput ; ses contrôles parcourent les joueurs par index.
StartJ2 utilise simulateInput(1,3,value), vérifié dans le vrai runtime par
observation de l'appel original et de son relâchement. Les six alias produisent
exactement douze appels (six pressions/relâchements) sur les ports attendus.
Playwright.keyboard.press ne connaît pas é : le test utilise l'API native
Chrome Input.dispatchKeyEvent pour é/Digit2, événement reconnu comme trusted,
plutôt qu'un événement DOM synthétique supposé accepté par le cœur.
Le second port a ses propres timers, purgés avec ceux du premier. Les commandes
relatives restent celles du joueur1 ; aucun nouveau mode multijoueur implémenté.

## 10 novembre2026 — Prototype02 autorisé, étapes1 à5

Michel a explicitement autorisé borne complète, vue d'ensemble/transition,
commandes3D, matériaux/éclairage et première pièce de bar. Nouvelle spec02,
référence ajoutée dans AGENTS, anciennes exclusions historiques levées pour
ce périmètre. La physique et l'émulation restent celles du prototype01.

Modélisation procédurale originale, sans dépendance ni asset externe : boite à
outils locale pour volumes et enseignes, modules distincts cabinet/bar. Les
labels utilisent un vrai canvas DOM typé avant construction DynamicTexture ;
ICanvasRenderingContext BabylonJS est une interface partielle qui ne déclare
pas textAlign/textBaseline. L'orientation d'upload DynamicTexture.update(true)
a été vérifiée visuellement après correction d'une inversion verticale.

BabylonJS9.33.2 : module classique Culling/ray appelle RegisterRay et installe
Scene.pick/createPickingRay, vérifié dans les sources locales. Les actions sont
résolues uniquement depuis nos métadonnées et renvoyées à l'UI existante. Pas
d'ActionManager ou input caméra interférant avec le trackpad. Le click conserve
son geste utilisateur jusqu'à PointerLock ; preuve dans le vrai runtime.
Le survol emploie explicitement le bouton logique0, car PointerEvent.button
vaut−1 pour un mouvement sans pression. Les clics droite restent ignorés.

Transitions0,65s avec horloge rAF en secondes, vecteurs réutilisés, caméra unique.
Une projection perspective équivalente raccorde la frontale orthographique.
Le redimensionnement du HUD recalcule la cible sans interrompre le trajet.
Pas de demande de capture différée à la fin, qui perdrait l'activation utilisateur.
Les callbacks rAF ne font jamais avancer le cœur ; le dernier frame vidéo peut
être redessiné pendant une pause. Toute interruption/destruction annule la tâche.

## Filtre CRT du moniteur 3D

Le tube emploie un `ShaderMaterial` BabylonJS 9.33.2 avec sources GLSL
locales et partage la `HtmlElementTexture` du matériau standard. Le tube
est au format 4:3 et le matériau centre l'image sans modifier ses proportions
lorsque le canvas source a un autre rapport. Les sommets du moniteur avancent
jusqu'à 58 mm au centre et 29 mm au milieu de chaque bord. Le shader courbe
les lignes du raster sur les deux axes, arrondit les coins
et module l'image à partir du nombre de lignes vidéo annoncé par le cœur.
Le filtrage utilise les dérivées de fragment si le contexte WebGL les
expose. Les parasites sont un déplacement horizontal local à faible amplitude,
indexé par les images reçues. La vue directe et le plan de comparaison
servent de références. Le choix de l'effet se fait dans les options et le HUD.

## Démarrage local et perte de contexte graphique

Les lectures du jeu et du BIOS, les empreintes de chaque ZIP et les deux
requêtes du frontend peuvent se chevaucher. Chaque entrée reste contrôlée.
Les diagnostics chronomètrent séparément les ZIP, la préparation du frontend
et le délai entre le clic de démarrage et l'événement start d'EmulatorJS.
Le cœur reste chargé par EmulatorJS 4.2.3 avec son archive locale vérifiée.

Le rendu 3D écoute les observables de contexte de BabylonJS 9.33.2. À la perte,
il détache la texture vidéo et remet la vue directe. Après restauration par
BabylonJS, la sélection 3D recrée la texture au prochain dessin du cœur.
Le canvas du cœur signale sa propre perte, avec la pause habituelle.

## Capture Safari et essai de tampon audio

`requestPointerCapture` enregistre les événements sur le document avant
d'appeler Pointer Lock. Une réponse sans promesse attend la confirmation
par événement. Le jeu et la visite partagent ce raccord. Les contrôles
conservent leurs vérifications de focus et leur annulation sur interruption.

EmulatorJS 4.2.3 écrit la configuration RetroArch via
`EJS_GameManager.prototype.getRetroArchCfg`. Pour Safari, le raccord
remplace les entrées `audio_latency` par 128 ms, contre 64 ms par défaut.
Le diagnostic indique la valeur demandée et la fréquence de l'AudioContext.
L'écoute sous Safari doit confirmer l'effet sur le grésillement.

### Plein écran et Pointer Lock

Safari antérieur à 18.2 ouvre directement la présentation immersive CSS.
Cela évite la combinaison Fullscreen API et Pointer Lock concernée par
[WebKit 272136](https://bugs.webkit.org/show_bug.cgi?id=272136).
[Safari 18.2](https://webkit.org/blog/16301/webkit-features-in-safari-18-2/)
inclut le correctif. La politique utilise la version du produit Safari,
aussi lue pour le réglage audio. Le HUD reste celui des autres navigateurs.

## Prototype 04 — origine des données de terrain

Marble Love à la révision `113cf5d` distingue le fond en tuiles des données
de terrain résolues par le jeu. La seconde présentation part de données de
relief à comparer à MAME et emploie des textures générées localement.
La sonde de départ lit le descripteur et le bloc de hauteurs du niveau 1.
Le maillage de test utilise des hauteurs synthétiques en attendant la
correspondance vérifiée entre les échantillons arcade et le repère 3D.

## Premier maillage issu de Practice Race

Le décodeur Lua reprend les informations des routines documentées par
Marble Love à `113cf5d`. Le banc exige l'égalité avec les 16 mots du cœur
sur chaque point de contrôle et l'égalité du relevé initial entre rejeux.
Le JSON local contient les quatre mots bruts par cellule et aucune image
ni ROM. BabylonJS reçoit la grille validée après choix du fichier.
Les petites disparités entre cellules sont lissées à l'affichage.

## Départ direct dans Intermediate Race

Le point de reprise du navigateur est produit par le même cœur Web que celui
du jeu. Le script envoie des crédits, un démarrage J1 et des mouvements de
trackball pour terminer Practice Race. Il sérialise la première frame jouable
d’Intermediate Race (descripteur `0x2c54c`, mode 0, position 220 × 108,
défilement −16152). Le retour de la lecture de cette pose confirme la
restauration. Les deux vues utilisent toujours les collisions, le chrono, le
score et la physique de la session arcade. Le cadre de la page d’étude prépare
les archives locales en mémoire avant le geste de démarrage du navigateur.
Le point de reprise et les relevés sont servis uniquement en développement sur
la boucle locale.

## Reprise complète du matériel Atari et commandes relatives à la caméra

Le défaut F2 a été reproduit sans mouvement de souris. Le contrôleur natif
annonçait zéro delta pendant que la bille partait de (220,108) et mourait.
Les tableaux analogiques du WASM épinglé sont en 0x1018a40 et 0x1018ac0.
Les restaurer élimine l’essentiel du déplacement, mais la hauteur de repos
reste fausse. L’inspection du WASM avec WABT et du code C épinglé identifie
ensuite les champs Slapstic. Restaurer l’état du chip (9 octets en 24554108),
la banque en 24509408 et son contenu par les pointeurs 24509228/24509232
rétablit les collisions et le départ exactement immobile.

Le format local MM2 version 2 joint ces données à l’état natif.
La reconstitution utilise les mêmes banques de ROM déjà chargées que
`update_bank` dans le cœur. Le hash vérifié avant le raccord garantit que
ces adresses correspondent au binaire employé.
Voir [atarigen.c du cœur épinglé](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/machine/atarigen.c)
et [slapstic.c](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/machine/slapstic.c).

Le cadrage suiveur transmet son axe horizontal à `cameraRelativeMotion`.
Les axes avant/droite de la caméra sont transformés en axes trackball.
Le boost observe les deltas dans ce repère. Le changement de caméra
n’injecte aucun déplacement par lui-même.

## Bibliothèque locale des acteurs de Rolling Madness 3D

L’installateur fourni contient `stick_idle` (12 poses), `stick_bend` (10),
`stick_jump_start` (23), `stick_jump` (41), `player_dizzy` (8),
`player_broken` (17), `player_melt` (12) et `blacky`.
`player_broken` comprend les morceaux et le groupe texturé `broom.jpg`.
Les triangles sont convertis avec les UV et les normales. Les assets
restent dans `local-roms/rolling-actors.json`.

Le relevé MAME 0.271 et les consommateurs documentés par Marble Love
(révision 113cf5de969ff62cb1d7b901340206f30122f658) identifient le noir
dans l’enregistrement 0x400a20 et les quatre slots de créatures en
0x401302, espacés de 0x60. Les positions sont aux relatifs 0xc/0x10/0x14,
l’activation en 0x18, l’état en 0x1a et les scripts en 0x58/0x5c.
Le rendu consomme ces observations dans la session Web. Les modèles et
leurs durées proviennent du remake. Les timings fins sont à confronter aux
différentes interactions du jeu d’origine. Les étoiles et la langue
sont des compléments géométriques du projet.

## 21 novembre 2026 — palette graphique de Level 4

Le PNG complet et le cœur Web n'ont pas les mêmes valeurs de palette.
Le comparatif vivant de Michel est retenu comme vérité de couleur.
La [carte Atari System I de MAME2003-Plus](https://github.com/libretro/mame2003-plus-libretro/blob/master/src/drivers/atarisy1.c)
décrit B00000..B007ff et les entrées de playfield B00400..B005ff.
Le binaire local épinglé confirme les lignes read à 9849592 (handler 25)
et write à 9849960 (handler 17939, variable de base 16958436). Au checkpoint
Level 4, le pointeur vaut 31044848. Seul ce pointeur dynamique est lu par
le code ; aucune recherche globale du heap ou lecture de ROM n'est ajoutée.
Les mots terrain 13..15 F721/FB32/FF43 donnent 119/34/17, 187/51/34,
255/68/51 et correspondent aux pixels de la vidéo locale ; 29..31 donnent
153/102/0, 221/136/0, 255/187/0. Les adresses sont propres au WASM déjà
vérifié par l'adaptateur ; une table différente donne un repli sans lecture.

Le complément d'ombre sur la façade de fin X=90 est une restitution locale
mesurée dans l'image source. Il ne prétend pas prouver un obstacle dans
la géométrie reconstruite et ne modifie pas l'angle solaire déjà validé.

## 22 novembre 2026 — même source de couleurs pour les niveaux 1 à 3

Le lecteur vérifié du niveau 4 devient `terrainPalette`, sans changer ses
adresses ni élargir sa lecture. Les trois autres départs confirment la même
organisation : gris/sable aux indices 0..12, murs aux indices 13..15 ; la
banque 16..31 décrit notamment la glace du niveau 2 et le vert du niveau 3.
Les valeurs de secours de l'étude sont mesurées dans le cœur vivant.
Les PNG complets restent utiles pour l'architecture et les silhouettes ;
ils ne sont pas retenus comme vérité colorimétrique.

Le shader fixe les teintes natives d'orientation et utilise la carte d'ombre
existante pour leur mélange. Les sols conservent leur texture de grain mais
annulent le second facteur de couleurs de sommets avant ce calage. Les
reflets blancs sur la pierre et la glace sont supprimés. PCF conserve les
cartes et directions existantes avec biais normal 0,02 ; le repli Poisson
sans shadow sampler est vérifié dans les sources BabylonJS 9.33.2 et le
contrôle NullEngine l'attend explicitement. Les essais GPU mesurent les
couleurs visibles : le seul contrôle NullEngine ne suffit pas.
