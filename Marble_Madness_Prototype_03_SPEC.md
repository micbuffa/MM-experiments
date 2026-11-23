# Marble Madness — prototype 03

Michel a autorisé cinq évolutions du prototype 02. Les restrictions historiques
sur la navigation et l’audio spatial sont levées pour ce lot.

1. **Bar explorable.** Déplacement ZQSD, WASD ou flèches, regard au trackpad.
   Collisions simples avec la pièce, la borne et le mobilier. E devant la borne
   transfère la capture au jeu. Échap met en pause. Quitter la borne ramène à la
   vue d’ensemble. Le déplacement reprend à la dernière position d’exploration.
2. **Borne affinée.** Proportions à échelle humaine, panneau latéral, métal et
   bois texturés, ombres statiques. Le cadrage frontal affiche toute la vidéo.
3. **Trackball visible.** La boule tourne selon les deltas lus par le cœur.
   Le cadrage Borne avec le bouton Capturer du HUD permet de la voir en jeu.
4. **Son positionnel.** L’exploration atténue et panoramise le son arcade
   existant selon la position et l’orientation. Le HUD permet de le désactiver.
   En jeu et en observation, le mixage arcade d’origine est utilisé.
5. **Rendu ajustable.** Les profils Éco, Équilibrée et Retina plafonnent la
   résolution à 1×, 1,5× et 2× du canvas CSS. Le diagnostic mesure les images
   rendues, les appels de dessin et le temps CPU, ainsi que le temps GPU si la
   plateforme l’expose. Tester les profils sur un vrai navigateur. Consigner
   séparément la recette Safari et l’essai sur un écran physique 120 Hz.

Une session arcade, une texture vidéo et une seule tâche de rendu à la fois.
Les collisions de visite appartiennent au décor. Les règles et la physique de
Marble Madness restent dans MAME. Conserver les vues de référence, les commandes,
la purge après interruption et la sélection locale des ROM et BIOS.
