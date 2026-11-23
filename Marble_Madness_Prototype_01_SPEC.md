# Marble Madness — spécification du prototype 01

Version 1.0 — 4 novembre 2026 — document de transmission à Codex

## 1. Contexte et objectif

Michel Buffa organise la 9e édition de Games on Web, concours de création de jeux 3D web avec BabylonJS. Thème : « rétro gaming ». Réalisation des projets de novembre 2026 à fin mai 2027. Il souhaite préparer sous pseudonyme une participation surprise.

Vision à long terme : faire fonctionner le vrai Marble Madness arcade dans une borne 3D BabylonJS, puis placer cette borne dans un bar. Un remaster et une version enrichie pourront être étudiés ultérieurement.

Le présent prototype doit exécuter le programme arcade original dans le navigateur, avec son et contrôle relatif au trackpad Apple. Il doit également démontrer la réutilisation de son image dans une scène BabylonJS minimale.

Ce document est une spécification à implémenter, pas le compte rendu d'un prototype fonctionnel. Aucun cœur, jeu de ROMs ou chemin de contrôle n'a encore été testé dans ce projet.

## 2. Périmètre

Inclus :

- Un seul jeu : Marble Madness, version arcade Atari.
- Un seul joueur ; crédit et démarrage accessibles depuis l'interface.
- Chargement local des archives ROM fournies par l'utilisateur.
- Émulation du jeu original, sans modification de sa physique ou de ses règles.
- Contrôle au trackpad Apple par déplacements relatifs à un doigt.
- Audio original ; pause, reprise, volume, reset.
- Interface de diagnostic et mémorisation des préférences.
- Test d'affichage du jeu sur un plan BabylonJS, sans borne modélisée.
- Exécution locale sur Mac avec une commande de développement documentée.

Exclus : bar, borne détaillée, effets CRT, remaster, rétro-ingénierie avec REA, nouveaux niveaux, multijoueur, classement distant, déploiement public, support mobile et autres périphériques. Ne pas ajouter de backend, d'authentification ou de framework applicatif lourd.

## 3. Environnement et choix proposés

Référence : Mac Apple Silicon avec trackpad Apple, Chrome stable sur macOS. Consigner les versions effectivement testées. Safari est une validation secondaire, après obtention du comportement satisfaisant sous Chrome.

Base proposée : TypeScript, Vite, HTML/CSS, BabylonJS pour le seul test 3D. Une application statique suffit. Utiliser un lockfile et figer les versions des dépendances, du frontend d'émulation et du cœur ; aucun chargement non versionné de « latest ».

Premier candidat : EmulatorJS avec le cœur explicitement nommé `fbneo`. FBNeo contient un pilote Atari System 1 pour Marble Madness, mais la présence et le fonctionnement dans le binaire effectivement distribué doivent être vérifiés.

Replis : EmulatorJS avec MAME 2003-Plus si disponible et adéquat ; sinon build MAME WebAssembly ciblant le pilote Atari System 1. Le repli n'est pas une obligation de développer trois solutions : retenir le premier candidat validé. Ne pas consacrer le prototype à une compilation MAME si le premier candidat convient.

## 4. Phase préalable : faisabilité et preuves

Avant de développer l'interface complète, vérifier sur une petite page jetable ou minimale :

1. La version exacte du cœur et sa prise en charge du jeu choisi.
2. Le jeu de ROMs attendu, ses dépendances et le traitement des archives supplémentaires.
3. Le chemin réel des mouvements : événement navigateur → frontend → entrée souris relative/trackball du cœur → jeu.
4. L'accès au canvas vidéo et les commandes pause/reprise/reset/volume.
5. La possibilité de copier l'image du canvas dans BabylonJS.

Documenter dans `docs/DECISIONS.md` les API et fichiers réellement utilisés. Ne pas inventer d'API à partir de noms plausibles ni utiliser des événements synthétiques comme solution supposée avant preuve de leur prise en charge.

Si une API interne est indispensable, l'isoler dans l'adaptateur et préciser sa version. Une petite adaptation maintenable du frontend est acceptable ; conserver son patch et ses notices. Réexaminer le choix du cœur si le contrôle relatif ou l'extraction vidéo impose une réécriture importante.

## 5. ROMs et ressources

L'utilisateur sélectionne une ou plusieurs archives locales. Ne pas télécharger, fournir, committer ou intégrer les ROMs, BIOS ou ressources extraites au projet. Les noms d'archives ne prouvent pas leur compatibilité.

Afficher des erreurs exploitables : archive manquante, ROM incompatible, dépendance absente, cœur indisponible, démarrage échoué. Préserver les archives dans la structure attendue par le cœur ; ne pas supposer qu'il faut toutes les décompresser.

Documenter le set et les fichiers requis à partir des données du cœur retenu. Le jeu est chargé en mémoire dans le navigateur, sans upload. Pas de stockage persistant des ROMs pour ce prototype ; les préférences seules peuvent être conservées. Ignorer dans Git les éventuels répertoires de test contenant des données du jeu.

## 6. Expérience et états

Interface simple en français : sélection des fichiers, démarrage, crédit, Start joueur 1, pause/reprise, reset, son/volume, capture du trackpad, sensibilité, diagnostics repliables et accès au test BabylonJS.

États explicites : fichiers absents, chargement, prêt, jeu capturé, pause, erreur. Distinguer les états du frontend de ceux du programme arcade : « game over » et le mode attract appartiennent au jeu.

Le premier démarrage est une action utilisateur permettant l'activation audio. La capture du pointeur exige également un geste utilisateur et ne doit pas être supposée automatique après un chargement asynchrone.

Après capture, aucun clic maintenu n'est nécessaire pour jouer. Lever et repositionner le doigt ne génère pas de déplacement artificiel. Les gestes à plusieurs doigts et la molette ne pilotent pas la bille.

`Échap` libère le pointeur et met en pause. La perte de focus ou le passage de l'onglet en arrière-plan mettent en pause et coupent le son. Purger les entrées et boutons en attente. Le retour dans la page ne reprend pas automatiquement la partie : action explicite pour reprendre, puis recapture si nécessaire. Traiter les transitions de façon idempotente.

Les boutons et éventuels raccourcis de crédit/Start doivent transmettre une pression puis un relâchement ; aucune touche ne reste enfoncée après une interruption. Reset demande une confirmation seulement si une session a déjà démarré.

## 7. Contrôle au trackpad

Utiliser Pointer Lock et les deltas de déplacement exposés par le navigateur. Ne pas convertir une position absolue du curseur en position de bille. Un trackpad Apple est généralement exposé comme dispositif de pointage ; ne pas supposer un accès aux coordonnées tactiles ou à une identité matérielle spécifique.

Commencer avec le comportement de pointeur standard. L'option de mouvement non accéléré est expérimentale pour ce prototype : détection, repli et résultat documentés. Aucun objectif de suppression garantie de l'accélération macOS.

Le mouvement doit être accumulé et consommé une seule fois par le chemin d'entrée du cœur. Réutiliser le mécanisme du frontend s'il le fait déjà correctement. Si un pont personnalisé est nécessaire : additionner les deltas depuis la dernière lecture, appliquer le gain, quantifier selon le format attendu en conservant les fractions résiduelles, transmettre puis consommer. Respecter les limites du type d'entrée sans débordement ni inversion. Ne pas répartir arbitrairement les mouvements sur la fréquence de rendu BabylonJS.

Réglages : un gain commun X/Y, enregistré localement ; réinitialisation du gain. Gain, bornes et valeur par défaut seront déterminés par essai, pas présentés comme des constantes de fidélité. Documenter la sensibilité interne du cœur pour éviter deux réglages opaques.

Dans le périmètre initial, pas de lissage, d'accélération supplémentaire, de zone morte ou d'inertie ajoutés au départ ; évolution de confort autorisée ensuite en section 15. La physique demeure celle du programme original. Valider les signes et la correspondance des axes en jeu ; ne pas ajouter de rotation de 45° simplement parce que la vue est isométrique.

La taille CSS du canvas, le zoom, le devicePixelRatio et la résolution de la texture ne doivent pas être utilisés comme multiplicateurs de commande. Vérifier le comportement réel lors des changements d'affichage.

## 8. Vidéo, cadence et BabylonJS

Préserver le rapport d'image approprié au jeu et éviter toute déformation. Relever dimensions du framebuffer et éventuelle correction d'aspect à partir du cœur, sans les supposer identiques. Aucun shader CRT pour ce prototype.

Le cœur doit conserver sa cadence d'émulation indépendamment d'un écran 60 ou 120 Hz. Ne pas faire avancer le jeu une fois par rendu BabylonJS. Exposer séparément, si possible, fréquence de présentation et indicateur de vitesse d'émulation ; des FPS d'interface ne prouvent pas que l'émulation tourne à vitesse normale.

Pour le test 3D : caméra fixe, fond neutre et un plan portant la vidéo du jeu. Même session et mêmes entrées que la vue directe. Permettre de comparer les deux vues, éventuellement côte à côte en diagnostic ; ne pas lancer deux émulateurs.

Préférer la mise à jour d'une texture depuis le canvas ou le framebuffer. Ne pas passer par encodage vidéo, capture d'écran périodique ou URL d'image à chaque frame. Examiner les contraintes du contexte WebGL source : disponibilité du framebuffer, instant de copie, conservation du buffer et couleur. Ne pas activer systématiquement une option coûteuse sans mesure.

Objectif initial : BabylonJS WebGL ; WebGPU est hors périmètre. Utiliser un matériau non éclairé ou émissif afin de préserver l'image. Vérifier orientation, aspect, couleurs et absence d'image noire ou figée. La copie doit rester fonctionnelle quand le canvas source n'est plus visible ; ne pas confondre masquage et arrêt de sa production d'images.

## 9. Audio

Audio géré par le cœur/frontend, avec activation utilisateur, volume et mute. Conserver musique et effets synchronisés au jeu. Pas de spatialisation ni de nouvel AudioWorklet dans ce prototype.

Vérifier les transitions démarrage, pause, perte de focus et reprise, ainsi que l'absence de sons doublés lors d'un reset ou d'une recréation de session. Signaler toute contrainte empêchant ultérieurement le routage spatial, sans la résoudre maintenant.

## 10. Organisation du code

Séparer au minimum les responsabilités suivantes, avec des noms adaptés au projet :

- Adaptateur d'émulation : cycle de vie, ROMs, vidéo, entrées, audio et capacités.
- Contrôle relatif : capture, gain, nettoyage et métriques ; sans duplication du travail du frontend.
- Interface : fichiers, actions, états et erreurs.
- Vue BabylonJS : consomme la vidéo, sans connaître le format des ROMs.

L'adaptateur doit couvrir conceptuellement charger/démarrer, suspendre/reprendre, reset, volume, accès vidéo et destruction. Une méthode de soumission des deltas n'est requise que si le frontend nécessite un pont personnalisé. Ne pas créer une fausse façade dont les méthodes n'ont pas d'implémentation réelle.

Prévoir la libération des écouteurs, ressources GPU et références aux fichiers lors de la destruction. Une nouvelle session ne doit pas ajouter une deuxième boucle ni une deuxième chaîne audio. Pas d'iframe tierce empêchant l'accès à la vidéo ou aux entrées.

## 11. Diagnostic et validation

Panneau repliable : cœur/version, navigateur, capture/focus/pause, dimensions vidéo, deltas reçus/transmis si observables, gain, fréquence de présentation et erreurs pertinentes. Déclarer les mesures indisponibles ; ne pas fabriquer de métriques.

| Test | Critère d'acceptation |
| --- | --- |
| Démarrage à froid | Archives correctes acceptées, mode attract et son présents |
| Partie | Crédit, Start et parcours jouable sans contrôle clavier directionnel |
| Précision | Petits gestes et diagonales contrôlables ; essai humain par Michel |
| Geste rapide | Pas de saturation manifeste, inversion ou mouvement perdu récurrent |
| Repositionnement du doigt | Aucune impulsion artificielle |
| Échap et perte de focus | Pause et silence, aucune entrée résiduelle à la reprise |
| Redimensionnement | Image proportionnée ; aucun gain lié à sa taille |
| Écran 60/120 Hz, si disponible | Vitesse du jeu cohérente ; aucune vitesse doublée |
| Vue BabylonJS | Image animée correcte et contrôle conservé, même session |
| Endurance | Au moins 10 minutes, sans dégradation progressive visible ni audio interrompu |
| Reset et nouvelle session | Retour fonctionnel sans écouteurs/audio/émulation doublés |
| Erreur de fichiers | Message compréhensible et possibilité de recommencer |

Automatiser les vérifications utiles du code personnalisé : conservation des deltas/fractions si implémentée, nettoyage des entrées et transitions critiques. Utiliser des données synthétiques, sans ROM dans les tests. Build et vérification TypeScript obligatoires. Tests navigateur réels pour émulation/audio/GPU ; les simulations ne les remplacent pas.

Consigner dans `docs/VALIDATION.md` les tests réalisés, résultats, versions et limitations. Distinguer « implémenté », « testé automatiquement », « testé manuellement » et « à valider par Michel ». La qualité du trackpad ne peut pas être certifiée depuis un environnement distant.

## 12. Incréments et livrables

| Incrément | Livrable et condition de passage |
| --- | --- |
| A — Faisabilité | Cœur/version choisis, ROMs identifiées, jeu démarré ou blocage précisément documenté |
| B — Entrées | Capture et trackpad fonctionnels ; preuve du chemin relatif, diagnostics minimaux |
| C — Session | Interface, audio, pause/reprise, erreurs ; validation de confort par Michel |
| D — BabylonJS | Même session affichée sur un plan 3D ; coût et contraintes relevés |
| E — Livraison | Build reproductible, documentation, contrôles et bilan de validation |

Le premier objectif de Codex est A puis B. Il doit continuer les travaux indépendants utiles, mais ne pas présenter C comme validé tant que Michel n'a pas essayé les commandes. Ne pas avancer vers une borne ou un bar sur la seule base d'une image animée.

Livrer le projet exécutable, `README.md`, la présente spécification, `docs/DECISIONS.md` et `docs/VALIDATION.md`. Le README précise installation, démarrage, ROMs attendues, commandes, versions, licences des composants et limites connues. Ne pas appliquer une licence unique arbitraire à l'ensemble des dépendances.

## 13. Références de départ

Sources consultées pendant la discussion ; vérifier les versions au démarrage de l'implémentation :

- EmulatorJS, arcade : https://emulatorjs.org/docs/systems/arcade/
- EmulatorJS, options et avertissement sur les API internes : https://emulatorjs.org/docs/options/
- FBNeo, pilote Atari System 1 : https://github.com/finalburnneo/FBNeo/blob/master/src/burn/drv/atari/d_atarisy1.cpp
- MAME, pilote Atari System 1 : https://github.com/mamedev/mame/blob/master/src/mame/atari/atarisy1.cpp
- MAME, compilation Emscripten et sous-ensembles : https://docs.mamedev.org/initialsetup/compilingmame.html
- Libretro, MAME 2003-Plus et entrées relatives : https://docs.libretro.com/library/mame2003_plus/
- Pointer Lock : https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API

## 14. Instruction de lancement à Codex

> Lis cette spécification et les instructions du dépôt. Implémente le prototype de façon incrémentale, en commençant par la validation EmulatorJS + FBNeo et le contrôle relatif au trackpad Apple. Vérifie les API et la compatibilité du cœur réellement utilisé avant de développer l'interface complète. N'ajoute ni bar, ni borne détaillée, ni remaster. Ne fournis et ne télécharge aucune ROM. Si les ROMs sont absentes, prépare le chargement, les diagnostics et les vérifications indépendantes, puis indique exactement les fichiers requis et ce qui reste non testé. Documente chaque décision et donne-moi une procédure courte pour tester les commandes sur mon Mac. Continue jusqu'à obtenir le prototype exécutable dans le périmètre autorisé ; ne déclare pas validées les sensations de jeu sans mon essai.


## 15. Évolution autorisée après essai de Michel — 9 novembre 2026

Retour utilisateur : 0,50× rend le contrôle normal insuffisant et ne permet pas
les accélérations souhaitées. Cette calibration est rejetée comme solution de
jouabilité. Michel demande un boost, par exemple avec Espace, et de progresser
vers le rendu 3D au lieu de prolonger la calibration.

Périmètre amendé :
- Contrôle normal au gain de référence confortable 1,70×, autres gains ajustables.
- Assistance de commande Espace maintenue : émission continue de deltas trackball
  modérés dans la direction guidée au trackpad ; relâcher rend le contrôle normal.
  Pas de touche de saut inventée dans MAME, pas de RAM, règle ou physique modifiée.
  Ce mode confort est distinct du contrôle strict de la borne originale.
- Boost actif seulement après capture et pendant l'émulation ; aucune touche
  maintenue ou commande résiduelle après Échap/perte de focus/visibilité, changement
  de réglage ou destruction. Saisie dans les champs UI préservée.
- Présentation BabylonJS en perspective : écran animé sur un support/socle
  procédural, même session et même vidéo. Les vues de comparaison et le plan
  de référence restent disponibles. Aucun moteur physique, seconde session ou
  boucle qui avance le cœur depuis le rendu. Pas de bar ou borne détaillée dans
  cette étape de présentation.

Tests unitaires de commande et de nettoyage, construction/destruction 3D avec
NullEngine, tests GPU/Pointer Lock dans Chrome et vrai runtime. La jouabilité
physique, les sauts et le freinage restent à vérifier par Michel ; les tâches
3D indépendantes continuent sans imposer de nouvelles captures de calibration.


## 16. Raccourcis autorisés et recette — 10 novembre 2026

Michel confirme les vues puis demande, en capture uniquement : 5 ou ( pour crédit,
1 ou & pour Start J1, 2 ou é pour Start J2. Cette dernière commande est une
extension explicite du périmètre des commandes, pas une implémentation d'un
second périphérique relatif. Le programme arcade conserve ses règles de crédits
et de démarrage. Pas de répétition pendant maintien, de commande hors capture,
en pause ou dans un champ de saisie ; nettoyage des deux ports sur interruption.

Commencer la recette d'endurance proposée : dix minutes du vrai runtime local,
changements de caméras, pause/reprise et plein écran, mesures et limites consignées.
Un banc automatique ne certifie ni une partie humaine, ni l'écoute, ni 120Hz/Safari.


## 17. Passage au prototype02 — autorisation du10novembre2026

Michel demande explicitement les cinq étapes proposées : borne3D complète,
vue d'ensemble et transition vers le jeu, commandes3D, matériaux/éclairage,
première pièce de bar. La spécification02 voisine définit cette extension.
Les exclusions borne/bar ci-dessus restent l'historique du prototype01,
pas un blocage de cette demande. Émulation, règles et chargement ROM inchangés.
