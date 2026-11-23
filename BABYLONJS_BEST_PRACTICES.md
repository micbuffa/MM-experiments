# Bonnes pratiques BabylonJS

## Application obligatoire

**Tout agent doit lire ce fichier au début de chaque intervention et appliquer
les règles concernées avant de modifier le projet.** `AGENTS.md`, `CLAUDE.md`,
`GEMINI.md` et les instructions Copilot renvoient à ce guide. En cas de nouvelle
session ou de reprise après passation, le relire avec `ARCHITECTURE.md`.

La spécification utilisateur définit le périmètre ; ce guide définit les pratiques
de réalisation. Ne pas ajouter une fonctionnalité simplement parce qu'elle est
mentionnée ici. Documenter toute dérogation justifiée dans `docs/DECISIONS.md`.

## API, dépendances et imports

- Vérifier les API dans les types et sources de la **version installée** avant
  de coder ; compléter avec la documentation officielle. Un exemple Playground
  peut viser une autre version ou utiliser des enregistrements implicites.
- Utiliser TypeScript strict et des imports ES ciblés depuis `@babylonjs/core`.
  Éviter les imports globaux `Legacy/legacy`, le namespace global `BABYLON` et les CDN.
- Passer explicitement la scène aux constructeurs qui l'acceptent ; ne pas
  dépendre implicitement de la dernière scène créée.
- Pour loaders, picking et autres composants, vérifier les imports à effets de
  bord requis par la version utilisée. Les commenter et tester le build de
  production ; le typage seul ne garantit pas leur enregistrement à l'exécution.
- Ne pas mélanger sans nécessité imports classiques, imports `pure` et API
  Babylon Lite. Toute migration demande une vérification dédiée.
- Garder les packages BabylonJS ajoutés à des versions compatibles et exactes,
  avec lockfile. Charger Inspector et outils de diagnostic seulement en développement.

## Organisation du code

- `app/` possède l'initialisation et le cycle de vie ; `rendering/` possède les
  scènes et leur représentation visuelle. Garder les règles applicatives hors
  des objets BabylonJS et testables sans GPU.
- Extraire par responsabilité : scène, caméra, matériaux, chargement, texture
  vidéo, diagnostics. Éviter une fonction de création de scène qui concentre
  interface, événements, émulation et logique métier.
- Injecter scène, moteur et dépendances nécessaires plutôt que des singletons.
  Utiliser des références typées ; éviter les recherches par nom à chaque frame.
- Nommer les ressources pour le diagnostic. Utiliser un `TransformNode` pour un
  conteneur de transformations sans géométrie à afficher.

## Propriété et destruction des ressources

- Chaque ressource doit avoir un propriétaire et un chemin de nettoyage : moteur,
  scène, caméra, mesh, matériau, texture, observer, événement DOM et tâche asynchrone.
- Une seule boucle BabylonJS est créée par l'application. Ne pas ajouter une
  seconde boucle ou un second moteur lors d'un reset, d'un changement de vue ou
  du hot reload.
- Conserver les handles des observers et les références des listeners pour les
  retirer à la destruction du module ; éviter les abonnements répétés à chaque reprise.
- Lors d'un démontage, arrêter les mises à jour puis libérer les ressources
  possédées. Ne pas supposer que détruire un mesh détruit tous ses matériaux et
  textures ; ne pas détruire une ressource partagée encore utilisée ailleurs.
- Une scène détruite libère ses ressources BabylonJS, mais cela ne remplace pas
  le nettoyage des listeners DOM, timers ou références externes de l'application.
- Prévoir un nettoyage sans effet indésirable lors d'appels répétés. Après un
  chargement asynchrone, vérifier que le propriétaire existe encore ; libérer le
  résultat devenu inutile au lieu de le rattacher à une scène détruite.

## Boucle de rendu, temps et performances

- Utiliser des secondes dans le code applicatif ; convertir explicitement les
  millisecondes des API qui en fournissent. Éviter les déplacements « par frame ».
- **La cadence du cœur émulé reste indépendante de BabylonJS.** Le rendu affiche
  sa vidéo ; il ne fait pas avancer le programme arcade et ne modifie pas sa physique.
- Réutiliser vecteurs, couleurs et buffers dans les chemins fréquents ; préférer
  les variantes `ToRef` et opérations en place lorsqu'elles conviennent. Éviter
  allocations répétées, logs et lecture du DOM dans les callbacks par frame.
- Partager géométries, matériaux et textures lorsque leur usage le permet.
  Envisager instances ou thin instances seulement pour des répétitions réelles,
  après examen des contraintes de picking, de transformation et de matériaux.
- Ne pas activer systématiquement gel de matrices, matériaux ou meshes actifs :
  vérifier que les données concernées sont statiques et prévoir leur mise à jour.
- Mesurer temps CPU/GPU disponibles, draw calls, résolution et mémoire avant
  d'optimiser. Les FPS seuls ne prouvent ni la vitesse du cœur ni la fluidité des entrées.
- Limiter résolution et coût des textures selon le besoin mesuré. Tester le coût
  du DPR et du redimensionnement ; ne pas masquer une régression en réduisant
  arbitrairement la qualité ou en augmentant les seuils d'avertissement du build.

## Caméra, transformations et entrées

- Conserver les conventions de `ARCHITECTURE.md` : main gauche, axe Y vertical.
  Distinguer coordonnées locales, monde, écran et coordonnées du cœur arcade.
- Choisir consciemment Euler ou quaternion ; éviter des écritures concurrentes
  de `rotation` et `rotationQuaternion`. Tester orientation, échelle et parentage.
- Attacher les contrôles caméra seulement dans les vues qui en ont besoin.
  La future vue vidéo arcade utilise une caméra fixe : ses contrôles ne doivent
  pas consommer les événements du trackpad destiné au jeu.
- Laisser capture relative, focus et gestes utilisateur au module d'entrée.
  Aucun multiplicateur de commande fondé sur la taille du canvas ou la texture.
- Redimensionner le moteur lorsque la surface d'affichage change ; préserver
  l'aspect vidéo et vérifier les changements de DPR. Ne pas déformer le plan.

## Vidéo du cœur sur une texture

- Utiliser la même session pour vue directe et vue 3D. Choisir l'API de texture
  après vérification de la source réelle : canvas 2D, canvas WebGL ou framebuffer.
  Ne pas supposer qu'un canvas WebGL peut être lu comme un contexte 2D.
- Réutiliser la texture et transférer les pixels au moment approprié. Éviter
  `toDataURL`, encodage vidéo, screenshots et recréation de texture par frame.
- Valider le moment de copie du buffer source. Ne pas activer systématiquement
  `preserveDrawingBuffer` ; documenter son éventuelle nécessité et son coût.
- Pour l'écran arcade, utiliser un matériau non éclairé ou émissif adapté et
  vérifier orientation verticale, aspect, alpha, filtrage et restitution des couleurs.
  Vérifier que tone mapping et traitement de l'image ne modifient pas involontairement la vidéo.
- Ne transférer la vidéo que lorsque nécessaire et mesurer le coût de copie.
  Vérifier que masquer le canvas source ne fige pas sa production d'images.
- WebGL est la cible du prototype. Appliquer l'effet CRT au matériau du
  moniteur et réutiliser la texture du cœur. Vérifier les lignes de balayage
  à plusieurs distances et résolutions pour éviter le moiré.

## Assets et chargements

- Ajouter seulement les loaders nécessaires, avec imports explicites. Gérer
  chargement, erreur et résultat tardif après destruction ; ne pas laisser une
  promesse rejetée sans traitement.
- Préférer les formats et tailles adaptés au Web ; pour des modèles futurs,
  envisager glTF/GLB et compression après mesure, avec décodeurs versionnés.
- Consigner provenance et licence dans `public/assets/README.md`. Les ROMs/BIOS
  restent des fichiers locaux fournis par l'utilisateur, jamais des assets livrés.

## Validation avant livraison

- Tests unitaires pour toute fonctionnalité importante : calculs, états, adaptation
  des dimensions et logique de cadence, avec entrées déterministes.
- Tests `NullEngine` pour construction de scènes et destruction des ressources
  vérifiables sans GPU. Ils ne valident ni shaders, ni copie vidéo, ni rendu réel.
- Vérification navigateur pour changements de rendu : console, aspect, couleurs,
  resize, interruptions, changement de vue et cycles création/destruction.
- Pour l'intégration arcade, vérifier image animée et son, même session dans les
  deux vues, cadence indépendante et absence de ressources ou entrées dupliquées.
- Exécuter `npm run check`. Consigner mesures, versions et résultats réels dans
  `docs/VALIDATION.md`, décisions dans `docs/DECISIONS.md`, suite dans `HANDOFF.md`.
  Déclarer explicitement ce qui reste non testé ou à valider par Michel.

## Références officielles

À consulter en vérifiant leur adéquation avec la version installée :

- [Optimisation des scènes](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene/)
- [API Scene et cycle de vie](https://doc.babylonjs.com/typedoc/classes/BABYLON.Scene)
- [Imports purs et enregistrements explicites](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/treeShaking/usingPureImports/)
- [Consignes de performance du dépôt BabylonJS](https://github.com/BabylonJS/Babylon.js/blob/master/.github/instructions/performance.instructions.md)
