# Contrôle confort et première présentation 3D

La demande de Michel remplace la calibration 0,50×, rejetée comme injouable,
par un boost explicite et la poursuite des tâches visuelles. Cette évolution
est inscrite dans la section 15 de la spécification.

## Jouer

Recharger la page, lancer la partie puis Capturer. Le contrôle normal revient
à 1,70× si l'ancien candidat 0,50× était encore enregistré ; les autres gains
valides sont gardés. Le bouton Contrôle normal rétablit 1,70×.

Maintenir **Espace** et guider au trackpad pour une commande continue dans la
direction choisie. Relâcher Espace rend le contrôle normal. Si le dernier geste
est ancien, donner une direction au trackpad après avoir maintenu Espace.
Échap, perte de focus ou onglet masqué : pause, silence et boost purgé. Espace
ne reprend pas une partie en pause et ne s'active pas dans un champ de saisie.

Le boost n'est pas une touche native de saut. Il remplace pendant le maintien
les grands deltas par des commandes modérées et soutenues ; le programme arcade
décide encore de l'accélération, des collisions et des sauts. La norme L1 de
256 counts par itération est retenue après le retour de Michel sur le saut
du niveau 1 et la comparaison avec le réglage initial de 128. Jouabilité,
saut et freinage restent à vérifier en partie.

## Afficher la 3D

Choisir **Écran en scène 3D** dans Affichage de la même session. La vidéo réelle
est placée dans un cadre sur un support/socle, avec perspective, éclairage et
sol quadrillé. Les boutons 3D sont décoratifs ; Crédit/Start restent dans l'UI.
Le plateau et la bille du jeu ne sont pas reconstruits en meshes BabylonJS.

La même texture, le même émulateur et les mêmes entrées restent utilisés.
Caméra fixe, pas de contrôle caméra qui consomme le trackpad. Vues directe,
comparée et plan seul toujours disponibles. Aucun asset externe ni seconde
chaîne audio. La vidéo continue d'être copiée après son dessin effectif ; pas
de boucle BabylonJS qui avance le cœur. Un changement de vue ne reprend pas la partie.

## Validation et suite

Les tests purs couvrent la direction, le maintien, la quantification conjointe,
le relâchement et les purges. NullEngine vérifie le changement de présentation,
la réutilisation du décor et la destruction. Les tests Chrome vérifient la vraie
capture/Espace, son nettoyage, les couleurs de la vidéo animée en perspective,
le redimensionnement et le retour au plan sans abonnement supplémentaire.

Essai initial du vrai runtime : gain 1,70× restauré, 24 itérations de boost horizontal
observées à (128,0), puis zéros au relâchement. Un second boost est purgé par
Échap, frame stable et aucun redémarrage par Espace en pause. Scène 3D animée,
90 copies cumulées observées, aucune erreur JS. Ce sont des entrées Chrome
automatisées, pas un essai de confort au trackpad physique. Capture du rendu
examinée dans /tmp, non livrée comme asset. Preuves numériques dans third_party.

## Plein écran et HUD livrés

Après démarrage, **Jouer en plein écran 3D** sélectionne la scène 3D et affiche
les commandes compactes. Crédit → Start → Capturer, ou seulement Capturer pour
reprendre une partie déjà commencée. L'entrée elle-même met en pause. Échap
pause/libère le trackpad, avec sortie fullscreen selon le navigateur ; Retour
à la page quitte et conserve la pause. Si Fullscreen API est refusée ou absente,
la vue reste immersive dans la fenêtre, avec le même bouton Retour.

Les commandes et états reflètent les contrôles existants ; pas de second moteur,
audio, boucle ou session. Les tests couvrent aussi les requêtes tardives après
sortie/démontage et le focus après fermeture native. Le rendu plein écran a été
examiné sur une capture du vrai jeu dans Chrome ; vidéo animée et HUD lisible.

## Caméras fixes livrées — 10 novembre 2026

Le sélecteur Caméra est disponible dans le HUD et sur la page (uniquement actif
en scène 3D). Frontale cadre l'écran droit et agrandi avec son cadre ; le socle
est partiellement hors champ pour donner priorité à la vidéo. Perspective
conserve la vue du décor, choix initial. Les deux sélecteurs sont synchronisés,
le choix est conservé pendant la session et après changement de présentation,
sans nouvelle préférence persistante.

Changer la caméra n'envoie aucune commande et conserve lecture/pause.
La dernière texture est redessinée même en pause. Si le trackpad est capturé,
Échap pour le libérer avant le choix, puis Capturer pour reprendre. La caméra
n'utilise jamais les mouvements du trackpad. Le plan de comparaison reste
indépendant du choix 3D. Le confort physique du boost reste à confirmer.

## Prototype02 maintenant autorisé

Michel a explicitement demandé borne, transition, interactions, matériaux et
premier bar. Ces cinq étapes sont réalisées dans la nouvelle scène ; voir
PROTOTYPE_02.md et la spec02. Les restrictions historiques borne/bar ci-dessus
ne bloquent plus ce périmètre. Les limites de confort physique restent distinctes.
