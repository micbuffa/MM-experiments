# Marble Madness — prototype 02 : borne et premier bar

La [spécification 03](Marble_Madness_Prototype_03_SPEC.md) autorise ensuite
l’exploration, le son positionnel et les finitions du rendu.

Périmètre explicitement autorisé par Michel le10novembre2026 : réaliser les
étapes1,2,3,4 et5 proposées après la livraison technique du prototype01.
Cette demande remplace les exclusions borne détaillée/bar du prototype01 et
d'AGENTS.md pour cette évolution. Les invariants arcade du prototype01 restent.

## Livrables

1. Borne3D procédurale : meuble complet, écran, enseigne, panneaux, monnayeur,
   haut-parleurs, panneau de commandes et trackball. Création originale du projet,
   sans prétendre reproduire exactement le meuble Atari ni utiliser ses artworks.
2. Vue du bar, vue de la borne et vue de jeu frontale, transition douce en secondes.
   Caméra sans attachControl pour réserver le trackpad au jeu.
3. Commandes3D cliquables hors capture : crédit, StartJ1/J2, monnayeur et entrée
   en jeu par écran/trackball. Délégation aux commandes existantes. Entrée en jeu
   recadre vers l'écran et demande PointerLock dans le même geste utilisateur.
   Pas de reprise automatique à la fin d'une transition ou d'une perte de focus.
4. Matériaux et éclairage cohérents : métal peint, inserts clairs, accents cyan/
   orange, bois et éclairage chaud/froid. Vidéo non éclairée et couleurs préservées.
5. Première pièce de bar : sol, murs, comptoir, étagères, bouteilles décoratives,
   tabourets, table et enseigne. Pièce fixe ouverte pour l'observation ; pas de
   déplacement FPS, physique de mobilier, clients, réseau ou audio spatial.

## Architecture et ressources

Une session, un moteur BabylonJS et une texture vidéo. La vidéo n'est copiée
qu'après dessin effectif du cœur. La caméra peut bouger pendant la pause sans
avancer l'émulation. Une animation rAF temporaire possède le rendu pendant
la transition ; pas de boucle permanente concurrente. Arrêt à la fin, interruption,
changement de vue, visibilité et destruction. Temps en secondes, interpolations
pures testables, ressources de décor appartenant à la scène et réutilisées.

Pas de dépendance, asset ou police externe ajouté. Les enseignes utilisent un
canvas généré une fois et une police système, jamais une image extraite de ROM.
Les modèles peuvent être améliorés ensuite sans modifier la physique arcade.

## Recette

Unitaires sur actions reconnues/filtrage, progression de transition, cadrage et
nettoyage. NullEngine pour géométrie, ressources uniques et destruction ; navigateur
réel pour picking, shaders, enseignes, transitions en pause, vidéo animée, couleurs,
resize, capture et commandes. Vérifier le vrai runtime avec les ROMs locales,
consigner captures examinées et limites dans VALIDATION et HANDOFF. La recette
10minutes du prototype01 ne vaut pas automatiquement validation du nouveau décor.
