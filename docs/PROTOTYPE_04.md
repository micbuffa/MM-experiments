# Prototype 04 — rendu moderne de Marble Madness

Le jeu arcade existant sert de référence. La seconde présentation affichera
le parcours lui-même en BabylonJS avec surfaces texturées et éclairées.
Le premier objectif est le début de Practice Race, avec une zone plane,
une pente et les ruptures de terrain mesurées dans le jeu original.

## Sources et méthode

- [Marble Love](https://github.com/magno73/marble-love/tree/113cf5de969ff62cb1d7b901340206f30122f658)
  documente le format des descripteurs et les consommateurs du terrain.
  Le projet TypeScript est sous MIT. Son rendu classique associe tuiles,
  sprites et HUD. Les données utiles au relief passent par d'autres
  routines, notamment `FUN_1CABA`. Aucun code ni asset de ce dépôt n'est
  incorporé à cette étape.
- [REA](https://github.com/morluto/rea) et Ghidra constituent la piste
  d'analyse statique. « Gandry » est interprété comme Ghidra. REA et
  Ghidra n'ont pas été trouvés dans les outils locaux vérifiés.
- MAME 0.271 permet déjà de confronter ces hypothèses à l'arcade. La
  sonde `scripts/reference/terrain-probe.lua` lit le descripteur actif et
  les seize échantillons autour du point de départ après un Crédit/Start.
  Au frame 1199, le descripteur est `0x2bee2`, la cellule observée est
  `(17, 17)` et les seize mots valent `0x4000`. Ce résultat confirme
  l'accès au bloc du terrain. Les axes, l'échelle et les cas de pente ou de
  vide doivent encore être corrélés à des positions différentes.
  Utiliser les ZIP locaux existants et comparer les résultats en local.

## Premier livrable

`/terrain.html` montre une rampe et deux plateformes de test indépendantes,
avec texture procédurale, normales, éclairage et caméra orbitale.
`terrainMesh` transforme une grille de quatre hauteurs par cellule en
triangles. Les cellules vides n'émettent aucune face.

## Incréments suivants

1. Observer le terrain arcade sur des positions plates, sur la rampe et
   près d'un bord. Vérifier ordre des échantillons, sens des axes, échelle
   verticale et représentation du vide contre la vidéo arcade.
2. Produire un premier maillage de Practice Race issu de ces mesures.
   Comparer le cadrage, les pentes et les arêtes sous une caméra de référence.
3. Relier le rendu à la position de la bille et au défilement de la session
   arcade. Ajouter les objets et le HUD à mesure que leur état est documenté.

## Rejeu plat, pente et bord

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs
```

Le banc lance quatre sessions MAME 0.271 isolées avec le set `marble` et le
BIOS `ttl`. Crédit aux images 700–707, Start aux images 710–717. Après la
mesure au départ à 1199, le compteur du port 0 ou 1 avance de 12 par
itération, modulo 256. Le script Lua agit sur les lectures des ports
trackball. Les observations du terrain sont en lecture seule. Le chemin
temporaire imprimé contient les traces et les images PPM.

| Rejeu    | Image | Cellule  | Position brute sur le plan | Hauteurs observées       | Repère                      |
| -------- | ----: | -------- | -------------------------- | ------------------------ | --------------------------- |
| Les deux |  1199 | (17, 17) | (140, 140)                 | `4000` partout           | Départ plat                 |
| Port 0   |  1260 | (20, 17) | (164, 140)                 | `3ffe`, `3ffc`           | Descente vers le bas gauche |
| Port 1   |  1280 | (17, 13) | (140, 110)                 | `4004`, `4006` et `0000` | Bord supérieur gauche       |
| Port 1   |  1320 | (17, 11) | (140, 94)                  | `0000` partout           | Bille au-delà du bord       |

Sur les deux axes, la cellule observée correspond aux coordonnées brutes
divisées par huit et arrondies vers le bas aux points mesurés. L'axe X croissant
se projette vers le bas gauche. L'axe Y croissant se projette vers le bas
droite. Les mots non nuls varient par pas de deux sur les segments étudiés.
Le zéro coïncide avec l'absence de surface sur cette sortie de piste.

La [routine de projection de Marble Love](https://github.com/magno73/marble-love/blob/113cf5de969ff62cb1d7b901340206f30122f658/packages/engine/src/sprite-project-1cc62.ts)
identifie quatre indices parmi les seize mots. Avec X et Y dans le plan de
l'arcade et l'origine au coin de la cellule, l'interpolation emploie l'indice
13 pour l'origine, 8 pour le voisin X, 4 pour le voisin Y et 7 pour le coin
opposé. Les indices sont comptés à partir de zéro. La diagonale utilisée
relie l'origine au coin opposé. Cette lecture donne une hypothèse précise
pour générer le maillage. La continuité cellule à cellule, les transitions
entre coins nuls et non nuls et l'échelle verticale restent à vérifier.

REA et Ghidra sont absents des outils locaux vérifiés. Java 8 a été trouvé.
Les résultats de ce rejeu proviennent de MAME et de la lecture du code public
de Marble Love.

## Tronçon de Practice Race dans BabylonJS

Le banc exporte maintenant `practice-terrain.json` pour la zone arcade
X 10–29, Y 11–24 à l’itération 1199. Le décodeur en lecture seule suit les
tables utilisées par `FUN_1CABA`. À chaque contrôle du rejeu, ses seize
mots sont comparés à ceux produits par le jeu à la position observée.
Les quatre exécutions génèrent le même relevé de départ.

Dans `terrain.html`, sélectionner `local-roms/practice-terrain.json`.
Ce fichier est ignoré et exclu des routes Vite. Pour le régénérer, utiliser
la commande de rejeu ci-dessus et sélectionner le JSON du dossier imprimé.
La scène de test reste visible tant que le relevé est absent.

Le maillage conserve les trous et place des faces verticales sous les
arêtes exposées à l’intérieur du relevé. Les écarts de deux unités entre
sommets partagés sont moyennés pour fermer les petits raccords. Les ruptures
plus grandes et les échantillons nuls sont conservés. L’échelle verticale est dérivée de la projection ci-dessous. La profondeur
des faces de falaise est un choix visuel. Les ouvertures avec
moins de trois sommets renseignés laissent la cellule vide. Le tronçon
représente le relief. Les garde-corps, la bille et les autres objets de la
vidéo arcade attendent leur propre raccord.

## Comparaison dans le cadrage arcade

Après chargement de `local-roms/practice-terrain.json`, choisir
**Cadrage arcade** pour retrouver la projection du départ. Pour comparer,
charger `local-roms/practice-reference.png` dans le deuxième sélecteur et
régler **Opacité de la capture**. **Vue libre** rétablit la caméra orbitale.
La capture locale peut être régénérée en convertissant `x-1/1199.ppm`
du dossier indiqué par le banc en PNG, en conservant ses 336 × 240 pixels.

La vue fixe utilise un azimut de 45° et une élévation de 30°.
La projection en pixels natifs est `u = 159 + z − x` et
`v = (x + z)/2 − (h − 0x4000) − 92`. L'origine écran est ajustée sur la
bille au départ. Le rapport d'affichage est 4:3. Le coefficient vertical
du maillage est `sqrt(2/3)` par rapport aux deux axes au sol.
Cette projection reproduit la direction des axes et la contribution de
la hauteur mesurées. Le banc contrôle les positions aux images
1199, 1250 et 1260 sur les deux trajectoires et obtient un écart maximal
de 2,14 pixels natifs par rapport au centre optique de la bille.

La superposition montre la grille et le vide dans le même repère. Les
limites irrégulières et la profondeur des falaises restent approchées.
La capture contient aussi les garde-corps et les autres éléments du jeu
qui attendent leur propre raccord. L’état de la bille a été lu dans
MAME de bureau pendant les mesures.

## Bille en direct dans la page de jeu

La page principale accepte le même relevé local. Le mode **3D moderne ·
Practice Race** utilise les coordonnées X, Z et la hauteur de J1 lues après
une itération de MAME Web. Le joueur contrôle la session habituelle. La caméra reprend au départ le cadrage validé ci-dessus. Le motif de la
bille tourne en fonction du déplacement et son ombre se projette vers la
droite, légèrement vers le bas.

## Premier défilement

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --scroll
```

Ce rejeu applique +12 et −8 unités par itération aux deux compteurs après
le départ. Il mesure le déplacement du fond entre l’image de référence
et cinq images où la caméra descend. La comparaison retrouve la hausse
du mot `0x40097e` à 2–3 pixels près. L’export du relief est identique à
cinq points du rejeu. Le fichier `practice-scroll-terrain.json` contient
38 × 37 cellules, X 10–47 et Z 11–47, avec la même origine que le
relevé initial. Sélectionner ce fichier dans la page de jeu.

La caméra orthographique descend sur le parcours. Le terrain remonte à
l’écran comme dans l’arcade. Le canvas natif reprend l’affichage quand le cadrage ou la position
sort de la zone couverte. Voir [les essais](VALIDATION.md).

## Du départ à l’arrivée de Practice Race

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --finish
```

Ce rejeu lit position et vitesse pour diriger J1 au moyen des deux compteurs
trackball. Il vérifie le chargement d’Intermediate Race et compare cinq
échantillons du même relief jusqu’au passage de l’arrivée. Le chemin affiché
contient `practice-complete-terrain.json`. Copier ce fichier dans
`local-roms/`, puis le sélectionner dans la page de jeu.

Le relevé de 91 × 91 cellules a son origine à (0, 0). Les cellules à plus de
21 colonnes de la diagonale correspondent à des répétitions hors du champ
viable à l’écran et sont laissées vides. La bande d’arrivée porte une
bannière GOAL grise qui prend la couleur du premier joueur à franchir
l’arrivée. Deux drapeaux à damier flottent au bord de la rampe. La vue
reste en 3D jusqu’à la fin du passage. L’image arcade reprend pour le
bilan et pour Intermediate Race.

## Étude du terrain d’Intermediate Race

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --intermediate
```

Le rejeu à deux joueurs termine Practice Race, exporte la grille au début
d’Intermediate Race et poursuit la course jusqu’au premier plateau après
la descente. Le dossier indiqué contient le JSON, les captures PPM et les
poses en CSV. Charger `intermediate-terrain.json` dans `terrain.html`.
Le cadrage arcade couvre les 306 pixels observés dans le rejeu. La vue
libre permet d’examiner le terrain plus loin.

### Tuyaux d’Intermediate Race

L’installateur de Rolling Madness 3D trouvé dans le dossier fourni
contient `model/lev2.ase.mesh`. Les tuyaux occupent 540 triangles associés
à `lev2_tube_out.png` et 12 à `lev2_tube_in.png`. Le découpage local
n’utilise que ces faces. Le décodeur suit le
[schéma public du format ASE Mesh](https://api.github.com/repos/MeltyPlayer/MeltyTool/git/blobs/ae5d07da82cb71ab9635355816f6dba1782f1ada).
Les raccords du remake aux plateformes de l’arcade correspondent à
`x = zRemake / 10 + 60` et `z = xRemake / 10 + 65` en dalles.
Les plans à 305, 195, 135 et 120 dans le remake correspondent aux
hauteurs arcade 16264, 16176, 16128 et 16116.

Après avoir extrait `lev2.ase.mesh` depuis l’installateur local
avec un extracteur Inno Setup (`xtinno` 0.11.3 a été utilisé) :

```sh
node scripts/add-intermediate-pipes.mjs "/chemin/lev2.ase.mesh" \
  local-roms/intermediate-terrain.json local-roms/intermediate-terrain-pipes.json
```

Charger la copie dans `terrain.html` puis choisir **Tuyaux et rampes**.
La licence de Luca Elia figure dans l’installateur. Les triangles extraits
restent dans le relevé local ignoré du projet. Le convertisseur transpose
aussi les normales du modèle. Les matériaux BabylonJS donnent aux coques
des reflets blancs, dessinent les soudures et habillent les sorties en gris.
Le flanc turquoise du pont et le mécanisme violet sont recréés à partir
des captures arcade, avec un piston télescopique et une roue à rayons.

### Animations observées dans Intermediate Race

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --intermediate
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --intermediate-impact
```

Le premier rejeu montre les étoiles de l’étourdissement de J1
(état 5, images 3077 à 3177). Le ver se gonfle au-dessus de la bille,
qui disparaît sous lui (état 7, images 3205 à 3264). L’état 4 démarre
la reconstruction à 3265. Le second rejeu laisse J2 tomber de la rampe
sur le plateau, avec un écart de 40 unités. L’état 2 commence à 3085.
Des éclats rouges s’étalent au sol, une étincelle précède le balai
jaune visible vers 3145–3185. La reconstruction démarre à 3213.

## Décor du premier tronçon

Neuf captures natives entre le départ et l’arrivée (images 1199 à 1923
du rejeu `--finish`) ont des pixels visibles dans les colonnes 24 à 311.
La caméra orthographique réduit sa fenêtre et son frustum horizontal
ensemble. Les bandes de 24 pixels restent noires et la projection des
coordonnées du parcours conserve sa position dans la surface 4:3.

Les positions en coordonnées arcade des garde-corps et des deux pointes
proviennent de l’image 1199 et du relevé autour du départ. Les pointes
ont des faces planes, et le creux entre les marches reçoit des faces
verticales. Les dalles, les joints et les parois striées utilisent des
textures générées au chargement de la scène. Les ouvertures proviennent
des cellules relevées. Les derniers virages et leurs accessoires restent
à affiner.

La comparaison rapprochée du trou central a conduit à reprendre les
gris des dalles, les joints foncés, les faces jaune et orange et les
pointes claires. Les bandes de couleur suivent les cellules du relevé le long de chaque
paroi. Les deux flèches rouges suivent les triangles des rampes.
Les textures sont générées par le rendu à partir d’une palette relevée
sur les captures arcade.

Les gris du dallage utilisent un matériau commun éclairé par un soleil
directionnel. En coordonnées natives de l’image 1199, les angles du
garde-corps gauche projettent une ombre d’environ 22 pixels à droite
et 3 vers le bas. La chute depuis le haut du poteau vaut environ 6 pixels
en projection. En retirant cette composante verticale et en inversant
la projection du sol, on obtient une élévation voisine de 17°. Ce calcul
suppose une hauteur de sol comparable au pied du poteau et à la pointe
de l’ombre. Chaque fosse latérale utilise son propre profil de couleur
et une découpe calée sur l’image arcade. La lèvre visible prolonge les
dalles jusqu’à cette découpe.

La fosse centrale utilise des marches planes tirées des hauteurs relevées.
Son fond est assombri et les poteaux épaissis descendent dans le sol. En
bas à droite, les coins manquants le long de l’arête extérieure étaient à
l’origine du raccord en dents de scie. Le maillage prolonge le plan de
chaque dalle et utilise une bande orange continue sur cette paroi.
Les trois parois sous les garde-corps centraux reçoivent des bandes choisies
par zone. Les trois dalles derrière la branche gauche de la rambarde centrale
sont complétées pour former un raccord continu avec la paroi. Les deux tours
comportent un socle évasé et une pointe resserrée. Les rampes portent une
flèche rouge et deux pointes séparées de tailles décroissantes.

Les trois dalles sous la rambarde avant gauche sont aussi complétées pour
former un rebord continu. Le poteau haut suit ce rebord. La paroi reprend
l’orange sombre relevé dans la capture, avec un retour orange et jaune
vers les marches. Les deux tours reposent sur leur palier et le matériau
du socle dessine le joint de l’épaule ainsi que la séparation des pierres.
