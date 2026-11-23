# Assets

## Géométrie corrigée des tours et de l’arrivée — captures 16h06–17h47

La tour pyramidale procédurale commune aux niveaux 1 et 5 est centrée sur son
socle. Les trois forts du niveau 5 ont un toit et des parois symétriques dédiés ;
leurs coins reprennent les **12 unités du relevé arcade**, en remplacement des
8 unités relevées dans le modèle de Rolling Madness. Le fichier extrait de
Rolling Madness a servi de référence spatiale locale ; aucun nouveau modèle
ou texture n’est livré. L’arche réutilise le constructeur procédural du niveau 4.

## Retouches complémentaires (captures 15h26–15h31)

Les coins des trois tours proches de GOAL sont des volumes procéduraux fermés
avec toutes leurs faces en pierre grise. Le bec et les plumes des oiseaux
Rolling Madness sont ajustés sur des copies des poses ; les fichiers extraits
restent intacts. Les aplats écrasés sont ancrés au sol et élargis pour retrouver
leur visibilité. Aucune texture externe ni nouvelle dépendance.

## Retouches procédurales du niveau 5 — 22 novembre 2026

Les cinq pyramides des oiseaux réutilisent la géométrie procédurale du niveau 1.
Le bec conserve ses quatre faces du mesh Rolling Madness, avec une peinture
jaune mate séparée. L'éclatement par oiseau utilise huit fragments procéduraux
positionnés depuis les enregistrements du cœur ; `player_expl` n'est pas ajouté
à la bibliothèque. Les trois types de miniatures utilisent leurs meshes finaux
écrasés déjà extraits ; les deux premières poses de la bille noire sont adaptées
par compression du mesh normal. Ni son ni physique de Rolling Madness ajoutés.

## Ajouts locaux du niveau 5 — 22 novembre 2026

Oiseaux : `bird`, `bird_fast`, `bird_expl`. Miniatures : `blacky_mini`,
`blacky_squashed_mini`, `stick_idle_mini`, `stick_squashed_mini`,
`amoeba_stretch_mini`, `amoeba_squashed_mini`. L'horloge décorative est le
sous-ensemble `catapult.png` du modèle statique `lev5.ase.mesh`, enregistré
localement sous `level5_clock`. Même provenance et accord de Luca Elia que
les autres meshes extraits ; fichiers conservés dans `local-roms/`.

Le motif de secours `lev5_side.PNG` vient de cet installateur. Le rendu normal
utilise désormais un masque dérivé de l'image complète originale du niveau 5
fournie dans le projet, pour conserver la position de ses ellipses. Ce masque
est lui aussi local et absent du build. Les couleurs en jeu viennent de la
palette du cœur. Ni la physique ni le son de Rolling Madness ne sont utilisés.

## Inventaire effectivement utilisé — 21 novembre 2026

Avec la bibliothèque locale chargée, les modèles Rolling Madness suivants sont
sélectionnés par le rendu. Le chargement d'un fichier dans la bibliothèque ne
signifie pas que toutes ses animations sont utilisées.

| Élément                   | Géométrie/poses Rolling Madness utilisées                             | Peinture actuelle                                         |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| Bille normale             | `player`, pose de base                                                | Peinture procédurale bleue/rouge à marques jaunes         |
| Étourdissement            | `player_dizzy`                                                        | Peinture du projet ; étoiles procédurales                 |
| Bille cassée et balai     | `player_broken`, groupes bille et balai                               | Bille repeinte ; `broom.jpg` réutilisé                    |
| Fonte                     | `player_melt`                                                         | Peinture du projet                                        |
| Ennemi noir               | `blacky`                                                              | Texture locale du modèle                                  |
| Amibes                    | `amoeba_stretch`                                                      | Matériau translucide du projet                            |
| Catapulte                 | `catapult`, `catapult_throw`                                          | `catapult.png` ; axe ajusté dans une copie                |
| Marteaux                  | `hammer`                                                              | `hammer.png` ; poses synchronisées aux sprites natifs     |
| Tuyaux des niveaux 2 et 3 | Sous-ensembles des décors importés, conservés dans les relevés locaux | Matériaux du projet ; conduit vertical du niveau 3 élargi |

Les aspirateurs du niveau 4 sont **entièrement procéduraux**, conformément au
choix de Michel du 21 novembre. Ni `hoover_on`, ni `hoover_down`, ni leur texture
ou son ne sont utilisés. Le tremblement du bec suit les images actives du
programme arcade. Les cylindres, vers, arches, dallages, murs, drapeaux,
baguette et fragments d'aspiration sont aussi créés par le projet.

`stick_idle`, `stick_bend`, `stick_jump_start`, `stick_jump` et `player_hoover`
figurent dans la bibliothèque mais ne sont pas sélectionnés actuellement.
Les sons et musiques Rolling Madness ne sont pas utilisés : le son du jeu vient
du cœur arcade. Les ressources extraites restent locales, hors du build.

## Catapulte de Rolling Madness 3D

Michel a confirmé le 20 novembre 2026 avoir obtenu l’accord de l’auteur
Luca Elia pour réutiliser les modèles de Rolling Madness 3D. Les modèles
`catapult` et `catapult_throw`, ainsi que `catapult.PNG`, proviennent de
l’installateur local. Ils sont ajoutés à `local-roms/rolling-actors.json`
pour la scène d’étude et le jeu. La licence d’origine reste dans
`3D_assets_for_animated_entities/embedded/license.rtf`.

## Peintures et effets du remaster

Les peintures bleue/rouge à marques jaunes de `createMarbleMaterial.ts`, la
baguette ivoire/or et les notices bitmap de score/temps sont générées par le
code du projet, sans image extraite des ROMs. Les géométries privées de bille
normale/dizzy/cassée restent issues de l'installateur local Rolling Madness,
selon la provenance et les limites indiquées ci-dessous. Elles ne sont pas
incluses dans les assets publics. Les shaders de visibilité et le ver articulé
sont également procéduraux, possédés par leur scène.

## Borne Atari System I

Géométrie de [Marble Madness arcade game par Gozer](https://embed-3dwarehouse-classic.sketchup.com/model/0a8f07a9-4747-47e3-84c9-9c2b81f99cd5/Marble-Madness-arcade-game),
issue du fichier `marble.skp` fourni par Michel. Le champ auteur du SKP indique
Gozer. Son SHA-256 est `4814722d9bd1c81ec48d4a7f77742bb0eec77184a14e39a408b4ac1e379e5620`.
Le modèle est intégré à la scène de jeu selon les [conditions 3D Warehouse](https://3dwarehouse.sketchup.com/tou)
pour les œuvres combinées. Les graphismes et marques appartiennent à leurs
titulaires.

- `src/rendering/assets/atariSystem1.json` contient les pièces converties depuis
  SketchUp 2021 via OpenSKP 1.3.0 et glTF. Les transformations sont appliquées,
  les coordonnées sont centrées en mètres et les pièces sont regroupées par
  matériau ou élément interactif.
- `cabinet/marquee.webp`, `cabinet/control-panel.webp`, `cabinet/side-art.webp`
  et `cabinet/rear-vent.webp` viennent des textures du modèle Gozer. Elles sont
  converties en WebP. Les UV de l’enseigne et du panneau sont recalés.
- Les deux sphères, les haut-parleurs et les zones interactives sont construits
  dans BabylonJS. Le liseré bleu et la boule droite rouge reprennent la variante
  photographiée par Michel. Le moniteur affiche le canvas du cœur.

Le [plan Classic Arcade Cabinets](https://www.classicarcadecabinets.com/marble-madness.html)
et le [manuel Atari](https://r.mprd.se/MAME/manuals/arcade/marble.pdf) donnent
des références sur le meuble et l’implantation. Les cotes du rendu proviennent
du SKP. Les photos fournies servent de références de finition.

## Historique des assets du prototype

Pour chaque ajout, renseigner : fichier, auteur, URL d'origine, licence,
attribution requise et modifications. Vérifier que la licence autorise l'usage prévu.
Optimiser taille, résolution et formats pour le Web ; ne pas intégrer de gros
fichiers sources de création dans le bundle sans nécessité.

La présentation d'écran 3D (support, cadre, socle, boutons décoratifs, grille)
est une géométrie originale du projet créée dans `src/rendering/createScreenStage.ts`.
Couleurs et matériaux sont définis dans le code ; pas de texture, modèle, police
ou image externe ajouté. La texture animée provient du canvas d'émulation de la
session locale, pas d'un asset de ROM exporté ou livré.

## Prototype02

Borne, bar, mobilier et graphismes géométriques : création originale du projet,
définie dans src/rendering/createCabinet.ts et createBarRoom.ts ; outils communs
dans decorTools.ts. Aucune provenance externe, modèleGLB, texture d'artwork Atari,
police téléchargée ou image extraite de ROM. Les enseignes sont des canvas
locaux générés une fois avec une police système monospace ; textures possédées
et détruites par la scène. Le titre du jeu est du texte, pas un artwork reproduit.
Style de borne original, sans prétendre être une réplique exacte du meuble Atari.
Pas de nouvelle licence globale imposée aux dépendances ; notices existantes conservées.

## Prototype 03

Les graphismes des flancs, les anneaux de la boule et les grains de bois,
de métal brossé et de peinture sont des créations du projet. Les modules
`createCabinet.ts` et `decorTools.ts` les produisent à l’initialisation de
la scène. Aucun fichier image ou modèle externe n’est utilisé.

La texture de carrelage de `terrain.html` est générée en mémoire par
`src/rendering/createTerrainStudy.ts` pour le prototype 04. Elle est
originale au projet et ne provient pas des graphismes Atari.

## Tuyaux d’Intermediate Race

L’étude accepte une copie locale du relevé avec les faces de tuyau de
`lev2.ase.mesh`, issues de [Rolling Madness 3D](https://www.lucaelia.com/games.php)
par Luca Elia (2005). L’installateur comporte sa propre licence. Les
triangles importés sont recalés en dalles arcade et leurs deux matériaux
sont créés en BabylonJS. Le relevé reste dans `local-roms/`.

Le Y conserve désormais toute la surface fermée du modèle local : les
coiffes, lèvres, peaux intérieure/extérieure et raccords ne sont plus découpés.
Une subdivision locale adoucit les branches en protégeant les lèvres fines ;
la jonction est abaissée et les coiffes compactées en mémoire, sans changer
le fichier extrait. Les normales sont recalculées sur les sommets coïncidents.
Aucune nouvelle texture externe ; peinture issue de la palette du cœur vivant.

## Acteurs animés de Rolling Madness 3D

L’extraction complète de l’installateur fourni par Michel est conservée
localement dans `3D_assets_for_animated_entities/`, à la racine du projet.
La licence de Luca Elia se trouve dans `embedded/license.rtf` dans ce dossier.
Elle exige une permission pour modifier ou redistribuer le logiciel.

`local-roms/rolling-actors.json` est produit par
`scripts/extract-rolling-actors.mjs` depuis l’installateur local fourni
par Michel. Les modèles et textures sont de Luca Elia, Rolling Madness 3D
(2005), avec la licence incluse dans l’installateur. Ils restent dans
le dossier local exclu du dépôt et du build.

La bibliothèque contient les poses de `stick_idle`, `stick_bend`,
`stick_jump_start`, `stick_jump`, `blacky`, `player_dizzy`,
`player_broken` et `player_melt`. Le balai et les morceaux sont deux
groupes du même modèle `player_broken`. Les étoiles et la langue
complémentaires sont des géométries créées dans le projet.
