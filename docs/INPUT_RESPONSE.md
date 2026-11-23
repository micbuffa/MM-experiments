# Réponse du jeu à des impulsions contrôlées

Mesures du 9 novembre 2026. Question : pourquoi les fortes impulsions du trackpad
ne permettent-elles pas le saut latéral du niveau 1 décrit par Michel ?
L'essai de limitation à 416 est rejeté par le retour humain et retiré du frontend.

## Protocole et preuve de comparabilité

Chrome 157.0.8103.38 headless, EmulatorJS 4.2.3, même glue/WASM MAME figé.
Chaque essai démarre un **nouveau document et un nouveau runtime** avec les ZIP
locaux. Aucun état du programme n'est lu ou modifié directement. Crédit est
maintenu aux frames 700..707, Start 710..717. Une entrée native X est envoyée avant
le poll à 1200, pendant 1 ou 6 frames ; Y=0. Observation aux frames 1199,1206,1212.
Ces deltas sont **après le gain** dans la chaîne : le gain et le trackpad sont
contournés volontairement pour isoler le cœur, sans événement DOM synthétique.

Le centroïde du marqueur bleu est mesuré dans le canvas 1110 × 832. Départ identique
pour les 11 essais : (525,493847 ; 168,015587). Deux essais neutres, avant/après la
série, restent immobiles. Les polls natifs non nuls correspondent exactement aux
consignes : ni inversion ni perte détectée à ce niveau. Aucune erreur JavaScript.

Le marqueur a été vérifié visuellement sur les captures temporaires. Une région
fixe du décor (100,300)→(1000,700), soit 360000 pixels, est identique octet pour
octet entre neutre,64× 1,416× 1 et 64× 6 : pas de translation de caméra sur ces
observations. Les coordonnées restent des mesures **à l'écran**, pas des positions
ou vitesses internes du programme. Le motif animé peut déplacer légèrement le
centroïde, donc ne pas interpréter des centièmes de pixel comme précision physique.

La première tentative par restauration d'instantané en mémoire a été **rejetée** :
les positions de départ différaient. Elle ne figure pas dans les conclusions.
La cause de cette non-comparabilité n'est pas établie. Aucun instantané persisté.

## Résultats à la frame 1212

Déplacements en pixels par rapport à 1199 ; répétitions indiquées séparément.

| Delta X natif | Frames de commande | ΔX écran | ΔY écran | Distance écran |
| ------------- | ------------------ | -------- | -------- | -------------- |
| 0             | 1                  | +0.000   | +0.000   | 0.000          |
| 16            | 1                  | +2.931   | -4.056   | 5.004          |
| 64            | 1                  | +2.931   | -4.056   | 5.004          |
| 128           | 1                  | +2.931   | -4.056   | 5.004          |
| 256           | 1                  | +9.728   | -3.887   | 10.476         |
| 416           | 1                  | -23.213  | -3.718   | 23.509         |
| 768           | 1                  | -10.139  | -3.925   | 10.872         |
| 1536          | 1                  | -16.722  | -3.821   | 17.153         |
| 0             | 1                  | +0.000   | +0.000   | 0.000          |
| 64            | 6                  | +9.728   | -3.887   | 10.476         |
| 256           | 6                  | +29.665  | -3.810   | 29.908         |

La série détaillée vérifie aussi les premières frames : pour 64× 1, la première
variation du marqueur apparaît à 1203, puis reste presque fixe jusqu'à 1212.
À 416× 1, le déplacement horizontal observé est opposé à celui de 64× 1. Cela confirme
une non-monotonie de la réponse visible après le driver natif, pas sa cause exacte.
Le programme peut appliquer ses propres transformations, quantifications,
contraintes et collisions ; ne pas attribuer ces résultats automatiquement au
seul masque 8 bits ni conclure à un bug du cœur par opposition au jeu d'origine.

La durée compte :256× 6 produit environ 29,91 pixels de déplacement, contre 10,48
pour 256× 1 ;64× 6 produit 10,48 contre 5,00 pour 64× 1. Cela ne démontre pas qu'ajouter
une inertie serait fidèle à une trackball physique : sa rotation libre n'a pas
été mesurée et le saut n'a pas été réussi par ce protocole. Aucun étalement de
commande ou nouveau gain n'est livré sur la base de ces chiffres.

## Reproduire volontairement

Serveur dev déjà actif sur 127.0.0.1:5173 et archives autorisées dans roms/ :

```sh
npm run measure:impulses -- --quick
npm run measure:impulses
```

La série courte prend environ une minute, la complète environ quatre. Un profil
Chrome isolé est utilisé, sans toucher aux réglages de Michel. Pour le Chromium
Playwright installé : `PLAYWRIGHT_CHANNEL=chromium npm run measure:impulses`.
`MARBLE_TEST_URL` peut viser un autre serveur HTTP loopback de développement.
Le banc refuse une adresse distante. Il n'est pas destiné au serveur preview.

Rapport numérique : `test-results/impulse-response.json`, ignoré par Git.
Aucune ROM, image ou état de jeu n'y est écrit. Le script refuse des départs
écartés de plus d'un pixel, des images manquantes, des consignes natives différentes
ou une erreur JS. Ne pas interpréter une série refusée ou un suivi ambigu.

Preuve de référence sans données de ROM :
[impulse-response-evidence.json](../third_party/impulse-response-evidence.json).
Les images de contrôle restent dans /tmp uniquement et ne sont pas distribuées.

## Suite : lectures désormais observées

Le [traceur des ports trackball](TRACKBALL_PORTS.md) observe maintenant les vrais
retours du handler du cœur. Il distingue les deux étiquettes de frames et montre
qu'à 416 les ports atteignent −125 modulo 256, alors que la réponse visible change
de signe. À 768 les grands pas deviennent ambigus modulo 256. Ces observations
ne prouvent pas l'algorithme interne du programme ou un saut corrigé. Les
séquences sont conservées pour comparaison avec une référence, sans nouveau
réglage de gain, boost ou inertie.
