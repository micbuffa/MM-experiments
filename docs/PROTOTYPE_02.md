# Borne interactive et premier bar3D

Ce document décrit l’étape 02. Pour le bar explorable et le son positionnel,
voir la [spécification 03](../Marble_Madness_Prototype_03_SPEC.md).

Les cinq étapes ont été autorisées par Michel puis implémentées : borne originale,
cadrages avec transition, commandes cliquables, matériaux/éclairage, première pièce.
La spécification02 détaille le périmètre ; le jeu original reste dans MAME.

## Utiliser

1. npm run dev ; archives locales dans roms/ ou sélection manuelle.
2. Vérifier et préparer, démarrer le cœur puis attendre son écran.
3. Jouer en plein écran3D. Caméra **Bar** pour la pièce, **Borne** pour le meuble,
   **Frontale** pour une image droite et agrandie. Les sélecteurs page/HUD suivent
   le même choix et les transitions fonctionnent aussi en pause.
4. Hors capture, cliquer sur Crédit ou sur le monnayeur de la borne, puis Start1
   ou2. Les boutons du HUD restent une alternative accessible. Le programme
   arcade décide des crédits requis et de l'état de la partie.
5. Cliquer sur l'écran ou le trackball : rapprochement vers l'écran et capture
   dans le même geste. Un doigt sans clic maintenu pour jouer, Espace pour boost.
6. Échap libère et met en pause ; reprendre/capturer explicitement. Pendant la
   capture, les clics3D ne déclenchent pas de crédits ou de Start. Raccourcis5/(,
   1/&,2/é toujours disponibles. Le port2 a Start, pas un second trackpad.

L'écran de borne attend le premier dessin effectif du cœur s'il n'a pas encore
été copié ; le décor, lui, peut être affiché en pause avant la première vidéo.
La caméra n'a pas de navigation attachée au trackpad. La première pièce est
une scène d'observation fixe, pas un bar explorable en déplacementFPS.

## Contenu et propriété

- Meuble, plinthe, panneaux latéraux, enseigne et haut-parleurs.
- Écran original vivant, panneau de commandes, boule, boutons et monnayeur.
- Métal peint sombre, inserts clairs, accents cyan/orange.
- Sol à lames, murs, comptoir à lattes, étagères/bouteilles, sièges, table et
  suspensions ; éclairage ambiant/directionnel et points chaud/froid.
- Une session, un moteur, une texture vidéo. Géométrie originale et enseignes
  système générées localement ; aucune image ou modèle externe.
- Mode direct et plan de comparaison conservés, avec couleurs vidéo non éclairées.

## Vérifications

Actions et temps : unitaires purs. NullEngine : géométrie/aspect, caméra unique,
réutilisation, transition et redimensionnement, trackball sous le champ vidéo,
destruction de scène. Chrome : pixels vidéo, pause, trois vues, vrais clics
projetés sur les meshes, survol, capture réelle depuis la boule, commandes
ignorées pendant capture et nettoyage des textures générées/meshes/caméras.
Le helper cabinetHarness est dans tests seulement et absent du build.

Le vrai runtime a été essayé avec les ROMs locales. Des captures des trois vues
ont été examinées dans /tmp : enseignes droites et jeu non masqué par la boule.
Les preuves numériques et la nouvelle recette d'endurance sont consignées
séparément dans VALIDATION.md. La recette du prototype01 ne certifie pas à elle
seule ce nouveau décor. L'écoute complète, le confort physique, Safari/120Hz et
le coût GPU complet restent distincts des vérifications automatiques.

## Bilan de livraison

Check250 tests/27 fichiers, Chrome29 et preview3 réussis. Le vrai jeu a servi
à vérifier Crédit/Start et capture via les meshes, puis les trois cadrages.
Un essai spécifique du picking et de la capture a également réussi dans le
build de production, sans helper dev. La nouvelle endurance du build final a
terminé600,02s actives et36063 copies, sans erreurJS ou commandes bloquées.
Preuves et limites détaillées dans VALIDATION.md. Les cinq étapes sont livrées.
