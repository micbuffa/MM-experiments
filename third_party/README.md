# Composants tiers

Aucune ROM, aucun BIOS et aucune ressource extraite du jeu ne sont fournis.

| Composant                                            | Version ou identification                                                                                                   | Notice                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| EmulatorJS                                           | 4.2.3, tag `v4.2.3`, commit `e150dc0491ae747028919fb82d6598954976ede6`                                                      | `LICENSE.EmulatorJS.txt` ; sources : https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3                                 |
| Runtime/cœur MAME 2003-Plus distribué par EmulatorJS | archive SHA-256 `cb6d9c80a88b65d1579d16d02128a678f8d1cd3f51de1479e647cea27b13247b`, rapport du 14 juin 2025 ; wrapper 2.0.2 | `LICENSE.MAME2003-Plus.txt`, extraite de l'archive ; dépôt déclaré : https://github.com/EmulatorJS/mame2003-plus-libretro |
| Décompression 7z et dépendances embarquées           | fichier `compression/extract7z.js` de la distribution 4.2.3                                                                 | Conserver les notices présentes dans les fichiers distribués et consulter leurs sources dans le dépôt EmulatorJS          |
| BabylonJS, fflate et outils npm                      | Versions exactes dans `package.json` et `package-lock.json`                                                                 | Notices dans les packages npm respectifs                                                                                  |

`emulatorjs-assets.json` fixe URL, taille et SHA-256 de chaque téléchargement.
`npm run setup:emulator` installe les fichiers dans `public/vendor/` (ignoré par Git)
et copie les notices dans les assets livrés par Vite. Aucun CDN n'est utilisé au
moment de jouer. L'installation nécessite un accès réseau aux sources indiquées.

Les adaptations du frontend sont isolées et commentées dans
`src/emulation/emulatorjs.ts` ; aucun binaire téléchargé n'est modifié. Le rapport du cœur ne fournit pas de SHA source. Le test Chrome a ensuite relevé
MAME Git Version `3a72dae` et RetroArch `1.21.0 (6dd4353)` ; détails dans
`runtime-evidence.json`. Ne pas confondre 2.0.2 (wrapper EmulatorJS) et la version du cœur.

`core-evidence.json` consigne l'inspection des deux binaires candidats, sans données
de jeu. Les positions de chaînes constituent des preuves statiques, pas une preuve
de lancement réussi. Voir `docs/DECISIONS.md`.

Aucune licence unique n'est attribuée à l'ensemble du projet ou des dépendances.

Depuis l'incrément B, `src/emulation/coreInputPatch.ts` adapte en mémoire un unique
raccord dans le glue JS du cœur, après vérification des SHA-256 JS et WASM. Le
WASM et les fichiers distribués sur disque sont intacts. Ce raccord de gain/purge
est documenté dans `docs/DECISIONS.md` ; il dépend de l'ABI du driver `emulatorjs`
de RetroArch 6dd4353 et doit être revérifié lors d'un changement de version.

Les raccords vidéo de `coreInputPatch.ts` et `coreVideoPatch.ts` observent aussi
les itérations et les dessins du framebuffer source, toujours après vérification
des deux empreintes. Aucun patch n'est appliqué au fichier distribué sur disque.
Les marqueurs et la portée du renderer figé sont documentés dans DECISIONS.md.
`npm run test:preview` compare les ressources servies par le build aux empreintes
du manifeste et vérifie que les deux notices sont conservées octet pour octet.

`impulse-response-evidence.json` consigne le banc du 9 novembre 2026 : commandes
natives contrôlées, centroïdes écran et contrôles de comparabilité. Il ne contient
ni ROM, image, sauvegarde ou données mémoire du jeu. Protocole et limites dans
`docs/INPUT_RESPONSE.md`, script volontaire `npm run measure:impulses`.

`trackball-port-evidence.json` complète le banc par les retours réels du handler
trackball du cœur. Le module de diagnostic vérifie le WASM et sa table statique,
préserve arguments/retours et restaure son trampoline. Aucune donnée de ROM, RAM
ou image de jeu dans ces journaux numériques. Référence : `docs/TRACKBALL_PORTS.md`.

`mame-reference-evidence.json` : mesures numériques du rejeu des ports dans
MAME 0.271 ARM64 déjà installé par l'utilisateur ; empreinte/version, quatre
phases et limites. Aucun exécutable, ROM, capture ou état fourni. Protocole :
`docs/REFERENCE_COMPARISON.md` ; sources publiques figées 0.271 citées dans le rapport.

`impulse-profile-evidence.json` : mesures numériques de profils à déplacement
total constant, répétitions avec région de décor témoin et contrôle du raccord
du relevé temporel. Aucune image, ROM ou sauvegarde. Le contrôle Chrome automatisé
n'est pas un geste physique de trackpad ; protocole dans `docs/MOTION_PROFILES.md`.

`startup-controls-evidence.json` : reproduction du disclaimer au démarrage et
contrôle réel après configuration de skip_disclaimer, Crédit/Start depuis pause
et après Échap. Mesures numériques seulement ; aucune ROM, image ou sauvegarde.

`strongest-gesture-evidence.json` : contrôle dans le vrai runtime de la sélection
automatique d'un second mouvement plus fort, puis Échap immédiat. Événements
souris Chrome automatisés, sans essai physique de trackpad ; aucune ROM/image/état.

`auto-measure-evidence.json` : contrôle réel de la capture armant automatiquement
la mesure au gain courant, sans bouton de remise à zéro. Chrome automatisé,
pas un geste physique au trackpad ; aucune ROM/image/état.

`captured-motion-evidence.json` : premier profil humain complet (95 lignes),
rejeu X/Y avec trace des ports du cœur Web et comparaison MAME 0.271 à phase fixe.
Les compteurs sont des données, pas du code ou de la RAM du jeu ; aucune ROM,
image ou sauvegarde. Détails et limites : docs/CAPTURED_MOTION.md.

`capture-calibration-evidence.json` : 25 rejeux calibrés du profil humain et de
sa fenêtre de pic, deux timings, neutres, contrôles optiques et ports joueur 1.
Inclut le contrôle du bouton candidat dans le vrai runtime, sans validation
physique de trackpad. Aucune ROM, image ou sauvegarde ; voir docs/CALIBRATION.md.

`comfort-stage-evidence.json` : vérification du boost directionnel Espace et de
la vidéo en perspective dans le vrai runtime avec archives locales. Entrées
Chrome automatisées, maintien/relâchement/Échap contrôlés, pas d'essai de confort
physique. La capture de contrôle est restée dans /tmp ; aucune ROM/image/état fourni.

`fullscreen-hud-evidence.json` : essai Chrome du vrai runtime local, commandes du
HUD, plein écran, purge sur Échap, frame stable et retour de focus. Aucune ROM,
image ou sauvegarde ; pas de certification du confort physique.

`camera-presets-evidence.json` : essai Chrome des deux cadrages sur le vrai jeu
local, conservation lecture/pause et choix, aucun dump/image/état distribué.

`endurance-evidence.json` : dix minutes actives Chrome du vrai runtime avec
archives locales, six alias de commandes, interruptions et métriques. Données
numériques uniquement ; aucun dump, état ou image. Limites dans docs/ENDURANCE.md.

`prototype02-evidence.json` : vrai runtime dans la borne et le bar, interactions
3D, capture, transition en pause et nettoyage. Données numériques sans ROM,
image ou état. Captures examinées dans /tmp seulement ; nouveau périmètre spec02.

`prototype02-production-evidence.json` : vrai build preview, Crédit/Start par
meshes et capture par la boule, sans helper dev. `prototype02-endurance-evidence.json` :
dix minutes actives de ce build avec archives sélectionnées par les champs
locaux, trois cadrages/interruptions et métriques. Aucun dump, image ou état ;
les essais interrompus ne sont pas fusionnés à ce résultat complet.

`prototype03-evidence.json` contient les mesures du vrai cœur dans le bar
explorable et dans la borne. Elles couvrent le routage audio, la résolution à
DPR 2, les échantillons natifs, la rotation de la boule et la pause.
`prototype03-endurance-evidence.json` conserve les dix relevés du build de
production, du transfert initial de capture jusqu’à la dernière pause.
