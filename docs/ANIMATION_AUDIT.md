# Audit des animations — 18 novembre 2026

Mise à jour du 19 novembre : les vers utilisent un maillage articulé piloté par les
phases natives ; la baguette, les messages natifs, le matériau commun (anneaux de
8 points jaunes), la synchronisation/recalage au sol du balai (`0x72`/`0x7a`/`0x7f`)
et la synchronisation RAM du pont d'Intermediate Race (`0x772`/`0x774`) sont
implémentés. Les paragraphes ci-dessous conservent les observations de départ.

## Baguette et +10 secondes

La routine arcade originale 0x256d2 entre dans l'état joueur 8 quand le drapeau
A2+0xcb est actif et que le joueur est au sol sur une surface autorisée.
A2 désigne l'objet natif ; pour J1, A2 commence à 0x400018.
Les offsets de présentation dans `practicePose.ts` commencent 0x18 avant A2.
Le dump de RAM MAME est big endian ; le tas WebAssembly échange les octets
par paires. Les adresses sont propres au programme/core actuellement vérifié.

La routine initialise A2+0x56 à 9 et A2+0x57 à 10, l'animation A2+0xcc à
0x216aa. Elle ajoute réellement une seconde au timer toutes les neuf itérations
objet (deux frames vidéo par itération), dix fois. Durée observée : 180 frames.
La présentation ne doit jamais ajouter de temps elle-même.
Progression possible : `(10 - remaining + (9 - ticks) / 9) / 10`.

Après la fin, A2+0xd1 est désactivé et l'appel à 0x285b0 avec événement 0x10
crée le message +10 SEC. Offsets de présentation : pointeur 0xec = 0x22446,
drapeau 0xf0 = 1 ; déplacement vertical signé en 0x80 et âge en 0x88.
Il faut lire cet événement, pas déduire un bonus d'un changement de chrono.

Le pointeur d'animation en 0xcc avance de quatre octets toutes les deux
itérations objet. Table 0x216aa : 54 entrées, dernière invisible. Aux indices
26/27, la bille est comprimée verticalement à 0,75 ; aux indices 28/29,
elle est étirée à 1,5. Au-delà de 42, le sprite est vide.
Le modèle `actor/rod.ase.mesh` de Rolling Madness contient 32 poses, durée
2,966875 secondes, texture `rod.png`, 24 sommets par pose. Extraction disponible
localement, mais pas encore ajoutée au convertisseur de l'application.

Preuve : capture MAME locale `/tmp/mm-animation-review/magic/`, début état 8
frame 2521, fin frame 2701. Pour isoler la séquence, le banc diagnostique a
activé le drapeau pending en RAM, puis laissé le programme arcade dérouler
l'animation et le timer. **Ce n'est pas une observation d'apparition spontanée**,
ni un patch livré dans le jeu. La règle naturelle est restrictive : timer bas
entre 3 et 6, surfaces éligibles et verrou une fois par niveau.

## Casse et balai

État 2 : animation primaire A2+0x5a, table 0x20fde, 32 entrées puis sentinelle.
Offsets présentation : pointeur primaire 0x72, secondaire 0x7a, actif 0x7f.
À l'indice primaire 9, le jeu active la séquence de balai 0x215f6. Son pointeur
avance ensuite chaque itération objet. L'indice secondaire atteint 43 avant
la fin de la casse. Il doit commander la visibilité et la progression du balai.

Rejeu naturel d'une chute J2 : état 2 frames 3085–3213, 128 frames vidéo.
En frame 3120 : primaire indice 8, pas de balai. Frame 3140 : primaire indice
13, balai indice 7. Frame 3212 : primaire indice 31, balai indice 43.
Traces locales `/tmp/mm-animation-review/broken/` et `broom-reference.png`.

Le morph `player_broken` inclut la bille ET le balai (groupes `player.png` et
`broom.jpg`). Dans l'import actuel, le balai flotte au-dessus du sol ; son groupe
doit être recalé indépendamment des débris, puis légèrement réduit et comparé.
Hypothèse de départ pour le groupe balai : échelle 0,84 autour de son centre XZ,
avec minimum Y recalé sur le sol du modèle, sans réduire les morceaux de bille.

## Bille normale et bille cassée

La bille normale est actuellement procédurale avec une couleur de sommet
marbrée. La bille cassée utilise `player.png` du remake. Elles n'ont donc pas le
même matériau. Le modèle normal `player.ase.mesh` est disponible localement :
rayon environ 5,67 ; échelle de l'import 0,119, rayon final environ 0,675.
Prochaine correction : matériau/texture partagés pour normal, étourdi et cassé,
avec palette rouge conservant les points jaunes de J2 ; comparer le rayon et
l'ancrage des premières poses de casse à la sphère normale.

L'état 7 consommé/cache la bille dans l'arcade. Ne pas afficher automatiquement
un morph « fonte » quand le drapeau natif de visibilité est nul.

## Vers

Les modèles actuels sont translatés entièrement avec leur racine native,
ce qui fait glisser les pieds. L'animation à représenter doit alterner un pied
collé au sol pendant que l'autre avance et se pose, puis l'inverse. La position
native avance par un pas de 8 unités (une dalle) à la fin de la boucle.

Scripts natifs :

- Repos : 0x20c18, 11 poses.
- Marche +X/+Z/−Z/−X : 0x20c48/0x20c6c/0x20c90/0x20cb4, huit poses chacune.
- Flexion/attaque : 0x20cd8, 34 poses.
- Saut : 0x20d64, une pose ; translation fournie par le cœur.
- Redressement : 0x20d6c, 26 poses.
- État 4 : freinage, quatre scripts de quatre poses, 0x20dd8/0x20dec/0x20e00/0x20e14.
  L'assimiler systématiquement au départ d'un saut est incorrect.
- Repas/langue, état 5 : 0x20e28, 30 poses. Les 15 premières sont une reprise,
  15–17 redressées, 18 transition, 19–20 sortie de langue, 21–23 sortie,
  24–27 extension maximale, 28–29 retour. Ne pas afficher la langue tout l'état 5.

Le lecteur `intermediateActors.ts` fournit déjà script, indice et fraction de
pose ; privilégier ces valeurs aux durées arbitraires du morph du remake.
Comparer aussi la pose étourdie de la bille et les étoiles à ces états natifs.
Référence originale locale : `/tmp/mm-animation-review/worm-reference.png`.

### Vérification supplémentaire de l'attaque

Un nouveau rejeu natif a capturé le ver 4 aux frames 3138–3258. L'attaque
0x20cd8 commence recourbée (indice 0), se redresse vers l'indice 8, reste droite
vers 16, ouvre une bouche plate vers 23 puis forme une cloche vers 24–33.
Le repas 0x20e28 reprend cette cloche avant de se redresser (environ 15 poses),
puis ouvre la bouche et tire la langue dans sa dernière partie. Ce profil a
remplacé la première hypothèse de flexion continue, contredite par les captures.
Les profils sont dans `wormPose.ts` ; la géométrie reste une approximation 3D.

## Sources et précautions de passation

Installateur personnel : `Rolling Madness 3D 2005/`. Extraction temporaire :
`/tmp/mm-rolling-research/extracted/data/{app}`. Dumps, captures et outils
d'analyse ne sont pas des assets à versionner. Les fichiers sous `/tmp` peuvent
disparaître ; les adresses et observations ci-dessus préservent les résultats.
Marble Love consulté localement au commit 113cf5de969ff62cb1d7b901340206f30122f658,
en complément du désassemblage local du programme et des captures MAME.
Aucune seconde simulation n'est intégrée à l'application.
