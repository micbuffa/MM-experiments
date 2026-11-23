# Recette d'endurance arcade

## Reproduire

Node24+, Chrome local et runtime installé. Démarrer npm run dev, avec les ZIP
personnels dans roms/ ; aucun transfert, téléchargement ou stockage persistant
n'est effectué par le banc. Dans un second terminal :

```sh
PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance
```

MARBLE_TEST_URL peut indiquer un autre serveur HTTP loopback. Le banc refuse
les hôtes distants. Rapport numérique dans test-results/endurance.json, hors Git.
Durée : dix intervalles de soixante secondes **actives**, plus les interruptions.
La durée ne peut pas être raccourcie par un drapeau de validation.

## Figer la version en production

Pour éviter qu'un rechargement à chaud interrompe la session :

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
```

Dans un second terminal :

```sh
MARBLE_TEST_URL=http://127.0.0.1:4175/ PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance -- --local-files
```

--local-files sélectionne les fichiers fixes roms/marble.zip et, s'il existe,
roms/atarisy1.zip via les champs de fichiers du navigateur. Les archives restent
hors dist et ne sont jamais uploadées. Le validateur normal de l'app est utilisé.
Ne pas modifier le build pendant le test. Le mode dev reste possible si aucun
fichier n'est modifié ; un rechargement invalide la série entière, jamais reprise
ou assemblée à partir d'une nouvelle session. Le banc signale alors l'absence
de diagnostics de session. Le rapport expose localFileSelection et le décor.

## Actions et observations

- Charge le vrai runtime et les archives locales via le validateur de la page.
- Capture le pointeur pour explorer le bar, vérifie la branche audio
  positionnelle, puis transfère la capture au cœur avec E.
- Capture réelle Chrome, six alias Crédit/Start : observation des douze appels
  pressions/relâchements attendus, ports0/1 distincts ; é via CDP clavier natif.
- Dix minutes de boucle active, mouvements automatisés et boost périodique.
- Chaque minute : Échap pendant un boost, pause stable, pending et boutons des
  deux ports vides, sortie plein écran ; puis changement de caméra et recapture.
- Passages comparaison/direct et retour3D, deux tailles de viewport.
- Chaque minute, le banc relève les frames, copies, temps CPU et GPU exposés
  par le navigateur, appels de dessin, état audio, sources, RMS, compteurs
  DOM et heap JavaScript, listeners et erreurs.
- Aucun upload, copie d'archive, screenshot ou sauvegarde du jeu dans le rapport.

Le résultat doit contenir dix échantillons, plus de600s actives, progression
des frames et copies, pauses stables et zéro erreurJS. Examiner les tendances
mémoire/listeners, sans transformer une variation de GC en diagnostic de fuite.
Les compteurs sont observés, pas des seuils ajustés pour faire passer l'essai.

## Portée

Il s'agit d'une session technique automatisée, mêlant partie démarrée puis
états décidés par l'arcade (fin de partie/attract inclus). Aucune performance
humaine, parcours de niveaux ou succès de saut n'est certifié. Le son peut être
observé en signal/contexte, sans prouver sa qualité à l'écoute. Les compteurs
heapJS ne couvrent pas toute la mémoire WASM/GPU ; le temps CPU ne mesure pas
la fin du travail GPU. Ce test Chrome headless n'établit pas le comportement
sur écran physique120Hz, Safari ou trackpad Apple.

Ne pas fermer une partie utilisateur : le banc ouvre son propre navigateur.
Éviter les autres tests lourds pendant une comparaison de performances. Le
rapport n'est marqué complete qu'après les dix intervalles et la vérification
des erreurs. En cas d'échec, failure et les échantillons disponibles sont sauvés.

## Historique prototype 01 — résultat du 10 novembre 2026

Dix échantillons, **600,40s actives**, frame finale36794, **36090 copies**, zéro
erreurJS et requête distante. Les six alias produisent les douze appels natifs
attendus. Dix pauses stables avec entrées et boost purgés, neuf reprises/captures,
caméras alternées et passages comparaison/direct, deux tailles de viewport.
Une source audio et718 listeners constants, contexte suspendu à chaque pause.

Moyenne cumulée CPU copie+rendu0,144–0,177ms, maximum10,2ms. HeapJS19,73–21,58Mio,
nodes4582–4645 ; la hausse des derniers relevés et la variabilité du GC ne
permettent pas d'affirmer l'absence de fuite. Pas de dégradation bloquante
observée pendant ce test. Les premières minutes ont coexisté avec les contrôles
automatiques ; ne pas en déduire de comparaison fine des performances.
Écoute, confort physique,120Hz/Safari et mémoire GPU/WASM restent hors preuve.
Preuve numérique conservée : third_party/endurance-evidence.json.

## Prototype02 — production,10novembre2026

La version finale borne/bar a terminé une nouvelle série sur le preview statique
4175 avec --local-files, après les essais dev interrompus décrits dans VALIDATION.
Dix nouveaux intervalles, **600,02s actives**, frame36772 et36063 copies.
Zéro erreurJS/requête distante, dix pauses/purges correctes, trois caméras,
plein écran/capture et resize. Preuve : third_party/prototype02-endurance-evidence.json.
La série01 ci-dessus est conservée comme historique, pas fusionnée avec celle-ci.

Listeners721 puis720 après initialisation, source audio1 ; heapJS16,73–28,87Mio
avec retours après GC, nodes4646–4693. Moyenne du callback vidéo0,459–0,550ms,
maximum9ms ; hors rendu rAF de transition et complétion GPU. Aucune dégradation
bloquante observée ; les limites mémoire GPU/WASM, écoute et matériel physique
restent inchangées. Preview de recette arrêté après sauvegarde de la preuve.
