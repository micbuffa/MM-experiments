# Bilan de livraison

Le prototype 03 ajoute l’exploration du bar, les finitions de la borne, la
rotation de la trackball, le son positionnel et trois profils de rendu.
L’usage courant est dans le [README](../README.md) et la recette dans
[VALIDATION.md](VALIDATION.md).

## Historique du prototype 01

État au 9 novembre 2026. L'essai de protection à 416 est retiré après retour
négatif ; un banc de mesure contrôlée documente la réponse des impulsions.
Le prototype est exécutable, mais le saut du niveau 1 et la fidélité des fortes
impulsions restent non validés. Les autres contrôles techniques passent.

## État des incréments

| Incrément       | État réel                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Faisabilité | Jeu original démarré ; MAME 2003-Plus figé et dumps identifiés/validés.                                                                            |
| B — Entrées     | Crédit, Start, Pointer Lock, gain linéaire, fractions, purge et diagnostics disponibles ; essais humains réalisés.                                 |
| C — Session     | Pause/reprise, volume, erreurs et nouvelle session testés. Impulsions/saut du niveau 1, freinage du niveau 3, écoute et endurance restent ouverts. |
| D — BabylonJS   | Même session sur un plan fixe, comparaison et source masquée testées. Michel confirme que la correction du clignotement est bonne.                 |
| E — Livraison   | Build reproductible vérifié, tests du build et workflow CI préparés, bilan et passation à jour. Recette humaine finale à terminer.                 |

## Reproduire le projet

Node 24 ou supérieur, npm et Chrome avec WebGL2. La référence locale testée est
Node **24.20.0**, npm **11.19.0**, Chrome automatisé **157.0.8103.38** ; Michel a
fourni ses diagnostics sous Chrome **155**. `.nvmrc` indique la branche Node 24.
Utiliser le gestionnaire Node habituel si le Node système est indisponible.

```sh
npm ci
npm run setup:emulator
npm run check
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
PLAYWRIGHT_CHANNEL=chrome npm run test:preview
npm run dev
```

Pour Chromium Playwright à la place de Chrome installé, installer une fois
`npx playwright install chromium`, puis omettre `PLAYWRIGHT_CHANNEL=chrome`.
L'installation initiale télécharge les dépendances et le runtime versionné,
jamais le jeu. Les commandes de contrôle utilisent des données synthétiques.

En développement : `http://127.0.0.1:5173/`, avec les deux ZIP fournis par Michel
dans `roms/` pour le préchargement facultatif. Pour le build :

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Ouvrir `http://127.0.0.1:4173/` et sélectionner les ZIP manuellement. Les archives
restent en mémoire, sans upload ni sauvegarde navigateur. Le build ne contient
ni ROM ni route de préchargement dev. Aucun déploiement réalisé.

## Contrôles réalisés

- `npm run check` : **134 tests sur 16 fichiers**, format, lint, types, couverture
  et build réussis. Couverture : 99,01 % instructions, 98,96 % branches,
  100 % fonctions, 98,95 % lignes sur le périmètre couvert.
- Développement : **16 tests Chrome sans ROM** réussis, dont vrai runtime sans
  jeu, commandes, interruptions, vidéo, couleurs et filtrage fractionnaire.
- Build : **3 tests Chrome sans ROM** réussis via `test:preview`, avec sélection
  manuelle, erreurs récupérables, requêtes locales, SHA-256 des ressources et
  notices conservés, absence d'archives et de préchargement dev dans le résultat.
- Reconstruction isolée du bilan E, avant le nouvel essai de plage trackball, dans un dossier temporaire sans ROM ni node_modules :
  `npm ci --offline` réussit depuis le cache, puis vérification des ressources
  d'émulation déjà présentes et `npm run check`. Les **49 fichiers** de `dist/`
  sont identiques octet pour octet aux fichiers du build de référence. Cette
  preuve porte sur la même plateforme, les versions et les sources présentes ;
  elle ne prétend pas garantir une identité entre tous les OS ou versions Node.
- Essai ponctuel du build avec les ZIP locaux : course, comparaison, plan seul,
  vraie capture et pause stable, sans erreur JS ni requête distante/préchargement
  dev. Les ZIP ne sont pas ajoutés aux tests permanents ou aux artefacts.
- Workflow GitHub configuré pour les deux suites navigateur. Pas d'exécution
  GitHub attestée : le dossier n'est pas encore un dépôt Git.

Les preuves et mesures détaillées sont dans [VALIDATION.md](VALIDATION.md).
Versions, API et raccords vérifiés : [DECISIONS.md](DECISIONS.md).
Licences distinctes : [third_party/README.md](../third_party/README.md).

## Priorité : impulsions et saut

L'essai à 416 n'a pas aidé et n'est plus proposé. Les mesures reproductibles de
[INPUT_RESPONSE.md](INPUT_RESPONSE.md) montrent une réponse non monotone aux
pics natifs et un effet de la durée de commande. Ne pas demander un nouvel essai
du limiteur ou augmenter arbitrairement le gain. Les [lectures des ports](TRACKBALL_PORTS.md) sont désormais observées ; à 416
les octets atteignent la valeur attendue malgré la réponse visible inversée.
La prochaine investigation concerne leur interprétation/comparaison de référence ; aucune correction du saut n'est
encore validée. Le diagnostic ne certifie pas le confort du trackpad physique.

## Dernière recette par Michel

1. Jouer au moins **10 minutes**, au gain préféré (dernier essai : 1,70×),
   principalement en mode **Plan BabylonJS seul**. Vérifier précision, diagonales,
   gestes opposés pour freiner et repositionnement du doigt.
2. Pendant la session, faire Échap, passer brièvement à une autre application,
   puis revenir : pause et silence attendus, aucune reprise automatique.
   Reprendre/capturer par clic et vérifier l'absence de mouvement résiduel.
3. Comparer les vues, redimensionner la fenêtre, puis reprendre. Vérifier image,
   proportions, défilement et absence de clignotement, sans changement du gain.
4. Écouter musique et effets, essayer volume/mute et reprise ; vérifier l'absence
   de doublage, de coupure persistante ou de décalage perceptible.
5. Après la session, **Nouvelle session**, sélectionner ou précharger les archives,
   puis relancer Crédit/Start. Vérifier que commandes et audio restent uniques.

Noter le navigateur, la durée, le gain, la fluidité, l'audio et le freinage dans
la pente de fin du niveau 3. En cas de problème, Échap puis Copier les diagnostics.
Un retour positif sur l'image ne vaut pas validation automatique de ces autres points.

## Limites connues

Safari, écran 120 Hz et changements de DPR non validés. Pas de compteur fiable de
vitesse d'émulation ; les coûts affichés mesurent la soumission CPU, pas la fin GPU.
Raccords privés liés aux SHA-256 JS/WASM, ABI souris et renderer figés : revérifier
avant une mise à jour. Les avertissements de taille des chunks BabylonJS restent
visibles. Le Node Homebrew local est défectueux ; la reconstruction a utilisé le
Node 24 fonctionnel de nvm. npm a signalé un script optionnel fsevents non approuvé,
sans empêcher les contrôles ; aucune approbation globale ajoutée.

Le freinage difficile n'est pas attribué à une cause certaine. Aucune physique,
accélération ou inertie ajoutée. Borne, bar, remaster et déploiement restent hors
périmètre de ce prototype.

Comparaison native du 9 novembre : MAME 0.271 reproduit les réponses Web après
alignement d'une phase fixe sur cinq amplitudes. Aucun défaut spécifique au cœur
Web démontré, aucun saut corrigé ; voir `REFERENCE_COMPARISON.md`. La référence
est un outil de diagnostic local, pas une nouvelle dépendance du jeu livré.

Le relevé `motionTimeline` est armé automatiquement par chaque capture et conserve
le mouvement le plus fort jusqu’à Échap, même après un petit mouvement initial. Le banc à total constant montre
un effet fort de la répartition temporelle, sans correction du saut ou changement
du contrôle ; détails et essai humain demandé dans `MOTION_PROFILES.md`.

Calibration du 9 novembre : 25 rejeux du profil enregistré et de son coup le plus
fort, contrôle de phase et affinement. Bouton d'essai 0,50× ajouté sur clic
uniquement ; défaut et préférences préservés avant action. Ce candidat conserve
la direction sur les deux timings testés, contrairement aux résultats à gains
plus élevés. Confort et saut restent à valider en partie ; voir CALIBRATION.md.

Le retour humain suivant rejette 0,50× : contrôle normal insuffisant, accélérations
non retrouvées. Le bouton de calibration a donc été retiré, le gain restauré à
1,70× et un boost Espace explicite ajouté à la demande de Michel. La vue Écran
en scène 3D propose maintenant une présentation en perspective sur support/socle,
même session et vidéo, décor procédural sans asset externe. Tests et vrai runtime
réussis ; confort physique/sauts encore à vérifier. Voir COMFORT_AND_3D.md.

## Présentation plein écran et HUD — 9 novembre 2026

Livré : Jouer en plein écran 3D, commandes compactes Crédit/Start/capture/pause/
reprise et Retour à la page. Entrée/sortie en pause, repli immersif si fullscreen
refusé, même session et texture. `npm run check` réussi (214 tests/24 fichiers),
Chrome 24 tests, preview 3 tests réussis. Vrai runtime : HUD opérationnel,
purge du boost maintenu sur Échap, frame stable et retour de focus ; rendu
examiné. Confort physique, audio complet et endurance restent à valider.
Prochaine tâche proposée : caméras fixes frontale/perspective pour la lisibilité.

## Caméras fixes — 10 novembre 2026

Frontale (écran droit agrandi) et perspective (décor) sélectionnables dans le HUD
et sur la page, même session/texture. Lecture/pause conservées, aucun contrôle
caméra attaché au trackpad. Michel a confirmé le plein écran précédent ; rendu
des deux nouveaux cadrages examiné avec le vrai jeu Chrome et tests automatisés.
Confort humain des nouvelles vues et recette d'endurance restent ouverts.

## Raccourcis et endurance — 10 novembre 2026

Raccourcis en capture active : 5/( crédit,1/& StartJ1,2/é StartJ2. Impulsions120ms,
pas de répétition ou effet hors capture/en pause/dans les champs ; portJ2
indépendant et purgé. Pas de commande relative J2 ajoutée. Check231 tests/25
fichiers, Chrome27 tests et preview3 réussis. Nouvelle commande permanente
npm run measure:endurance, protocole dans ENDURANCE.md.

Vrai runtime : douze appels des six alias conformes, **600,40s actives** terminées,
36090 copies vidéo, dix pauses/boosts purgés, aucune erreurJS/requête distante,
listeners718 et source audio1 constants. Coût CPU cumulé moyen0,144–0,177ms ;
pas du temps GPU. Aucun parcours humain ou écoute complète certifié ; mémoire
heap variable (19,73–21,58Mio), pas de preuve d'absence de fuite GPU/WASM.
La recette technique permet de faire le bilan prototype01 et de définir la
suite ; borne détaillée/bar toujours soumis au prochain périmètre explicite.

## Prototype02 — étapes1 à5,10novembre2026

Borne originale complète et bar meublé, enseignes locales, matériaux et éclairage,
commandes3D et transition entre Bar/Borne/Frontale. Même session/texture, commandes
existantes et capture réelle depuis l'écran ou la boule. Tests250/27, Chrome29,
preview3 réussis ; captures du vrai jeu examinées, détails dans PROTOTYPE_02.md.
Une nouvelle endurance du build production est terminée :600,02s actives,
36063 copies, zéro erreurJS/commande bloquée. Picking/capture aussi vérifiés
sur le build compilé sans helper dev. Les deux recettes01/02 restent distinctes. Audio/confort/Safari/120Hz restent à valider sur matériel physique.
