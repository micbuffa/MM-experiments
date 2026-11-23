# Marble Madness — rendu moderne en vraie 3D

## Objectif

Faire tourner une seule partie de Marble Madness dans le cœur MAME 2003-Plus
déjà intégré à EmulatorJS, avec deux présentations sélectionnables.
La présentation **Arcade** affiche la vidéo originale, y compris dans la
borne 3D existante. La présentation **3D moderne** rend le parcours, les billes
et les objets en maillages texturés et éclairés avec BabylonJS.

Le premier jalon jouable est **Practice Race**. La cible suivante couvre les
six parcours, un à un. Le décor du bar et les cadrages de la borne continuent
de servir d’accès à la présentation arcade.

## Invariants de jeu

- Le même cœur exécute la même partie dans les deux présentations. Il reste
  seul responsable de la physique, des collisions, des règles, des objets
  actifs, du défilement, de la progression, du score, du chrono et de l’audio.
- Le parcours d’entrée existant reste commun aux deux présentations, y compris
  le gain, le boost Espace et les commandes J1/J2. Changer d’affichage conserve
  la partie, son état de pause et la capture du pointeur. Les interruptions
  habituelles continuent de mettre en pause et de purger les entrées.
- BabylonJS consomme des observations en lecture seule. Il ne modifie ni
  mémoire de jeu, ni ROM, ni réglage du cœur. La cadence d’émulation reste
  indépendante des images 3D. Toute interpolation sert uniquement à l’affichage.
- Les ROM et BIOS restent locaux. Les données extraites à partir des archives
  de Michel restent locales. Les tests permanents utilisent des données
  synthétiques. Les textures et les matériaux modernes ont une provenance
  consignée dans `public/assets/README.md`.

## Sources et responsabilités

| Source ou module        | Usage                                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REA avec Ghidra         | Analyser localement le programme 68010, identifier les routines et documenter les champs du terrain, des objets, du défilement et du HUD. Vérifier l’installation avant usage et consigner les versions. |
| Marble Love             | Utiliser les notes et les sondes de la révision `113cf5d` comme pistes. Recouper chaque champ intégré avec les observations du cœur.                                                                     |
| MAME 0.271 local        | Rejouer des scènes et collecter des observations reproductibles pour vérifier les interprétations.                                                                                                       |
| Adaptateur du cœur Web  | Valider la compatibilité du build exact et publier un instantané cohérent après l’itération. Les adresses vérifiées sous MAME local ne sont reportées au Web qu’après validation du raccord.             |
| Modules TypeScript purs | Convertir les unités et les axes, valider les données, construire la géométrie et le modèle à afficher.                                                                                                  |
| BabylonJS et interface  | Afficher les maillages, l’éclairage et le HUD. Gérer la caméra, la sélection de vue et le cycle de vie des ressources.                                                                                   |

Le contrat d’instantané inclut progressivement l’identifiant du niveau et de
l’itération, l’état de la partie, le défilement, les poses et états visuels des
entités, puis le score et le chrono. Chaque donnée publiée doit avoir une source,
une unité ou un sens documenté, et un test. La caméra 3D traduit le cadrage et
le défilement observés dans le repère BabylonJS. Les menus, les transitions ou
les niveaux sans prise en charge affichent la vidéo arcade. Une erreur de données
ou de rendu 3D déclenche le même repli dans la session en cours.

## Tâches et critères d’acceptation

### 1. Préparer l’analyse et le rejeu de référence

- [ ] Vérifier REA, Ghidra et Java. Préparer le projet d’analyse local et
      identifier les routines à partir des notes de Marble Love.
- [x] Rejouer une courte séquence reproductible de Practice Race dans MAME.
      Documenter le build, l’état initial, les entrées et les itérations échantillonnées.
- [ ] Établir les correspondances de coordonnées sur une zone plate, une pente
      et un bord. Valider le sens des axes, l’échelle verticale, l’ordre des
      échantillons et le codage du vide.

**Acceptation.** Un second rejeu retrouve les mêmes valeurs, et chaque type de
surface observé est associé à un repère visible dans la vidéo arcade.

### 2. Reconstituer le premier tronçon réel

- [x] Afficher dans `/terrain.html` un premier segment
      issu des données locales de Practice Race. Réutiliser le maillage indexé et le
      compléter selon les besoins mesurés.
- [x] Construire les surfaces, les faces visibles des falaises et les ruptures
      de niveau. Appliquer des textures originales et un éclairage réglé pour rendre
      les pentes et les vides lisibles.
- [x] Comparer des captures arcade et 3D dans un cadrage commun.
- [ ] Valider les bords encore approximatifs et les proportions des falaises.

**Acceptation.** Les zones planes, la rampe et les bords du tronçon correspondent
aux observations. Les ouvertures ne sont pas recouvertes par le maillage.

### 3. Afficher la bille et le défilement de la partie en cours

- [x] Lire dans le cœur Web le descripteur du niveau et la position de J1
      pendant le départ de Practice Race. Placer la bille 3D dans le relevé.
- [x] Mesurer le premier défilement et synchroniser le cadrage avec
      l’instantané. Étendre le relevé jusqu’à la rampe du premier défilement.
- [x] Rendre visible le roulement de la bille et ajouter une ombre portée
      orientée d’après l’arcade.
- [x] Vérifier une chute et la réapparition de J1 sur la première rampe.
      Garder la vue 3D pendant l’absence et restaurer la bille au point de reprise.
- [x] Ajouter le sélecteur **Arcade / 3D moderne**, avec repli dans la même partie
      si le niveau ou l’état courant ne peut pas être affiché en 3D.

**Acceptation.** Le tronçon est jouable en 3D et la bascule affiche la même partie
à la même position, y compris pendant la pause. Le test ne constate ni nouvelle
session, ni nouvelle chaîne audio, ni perte de capture.

### 4. Livrer Practice Race en entier

- [x] Étendre la géométrie du départ à l’arrivée et encadrer le passage
      au bilan puis à Intermediate Race en arcade.
- [x] Afficher le score et le chrono du cœur arcade dans la vue moderne de J1.
- [x] Afficher la deuxième bille, les scores et les chronos du duo.
- [ ] Ajouter les éléments visuels manquants et les poses des autres objets.
- [ ] Vérifier les cas de course à un et deux joueurs, le franchissement des bords,
      les chutes et le passage à l’écran suivant.
- [ ] Rejouer la même séquence d’entrées depuis le même état initial en Arcade,
      en 3D et avec des bascules pendant la partie. Comparer, par itération du cœur,
      les positions et états des billes, les collisions ou transitions observables,
      le score, le chrono et l’arrivée.

**Acceptation.** Les traces de jeu concordent exactement pour les séquences
testées. Le parcours complet reste lisible et jouable en navigateur, y compris
lors d’un changement de présentation en cours de partie.

### 5. Étendre aux autres parcours

- [ ] Ajouter les parcours suivants individuellement, avec leurs variantes de
      terrain et leurs objets animés. Les mouvements du décor dérivent des états
      observés dans le cœur.
- [ ] Vérifier le chargement entre niveaux, le nettoyage des maillages et textures
      et les retours aux écrans arcade.
- [ ] Mesurer le coût du rendu, notamment pendant le défilement et en vue
      immersive. Vérifier la fluidité et l’audio dans Chrome et Safari.

**Acceptation.** Chaque parcours ajouté a une comparaison arcade/3D, un rejeu
de non-régression et une recette visuelle. Les séquences encore non couvertes
restent accessibles en présentation arcade.

## Validation à chaque livraison

- Ajouter des tests Vitest pour chaque fonctionnalité importante. Couvrir
  notamment le décodage, les cas limites, les conversions de coordonnées, les
  trous, les transitions de vue et le nettoyage des abonnements.
- Utiliser NullEngine pour la construction et la destruction de la scène.
  Vérifier le rendu réel, les commandes et la stabilité en navigateur.
- Comparer les exécutions sur des itérations d’émulation numérotées. Signaler
  tout écart au premier instant divergent. Une comparaison d’images seule
  ne valide pas l’identité du gameplay.
- Exécuter `npm run check` et les tests navigateur pertinents. Consigner méthodes,
  résultats et limites dans `docs/VALIDATION.md`, puis mettre à jour `HANDOFF.md`.

## Point de départ

`/terrain.html` affiche une géométrie de test et accepte le relevé local de Practice Race. La sonde locale a confirmé les
six descripteurs et lu seize échantillons au départ de Practice Race.
Le rejeu couvre maintenant le départ, la pente et la sortie du terrain.
Les correspondances à valider sont suivies dans
[les notes du prototype 04](docs/PROTOTYPE_04.md).

- [Notes et preuves du prototype 04](docs/PROTOTYPE_04.md)
- [REA](https://github.com/morluto/rea)
- [Marble Love et son format de niveau](https://github.com/magno73/marble-love/blob/113cf5de969ff62cb1d7b901340206f30122f658/docs/level-header-format.md)
