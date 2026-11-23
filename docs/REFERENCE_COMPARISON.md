# Comparaison avec MAME natif

Le 9 novembre 2026, MAME 0.271 ARM64 reproduit la réponse non monotone du cœur
Web lorsque la phase du rejeu est alignée. **Ces mesures ne démontrent pas un
bug propre à MAME 2003-Plus et ne résolvent pas le saut du niveau 1.**

## Reproduire

Node 24+, MAME **0.271** déjà installé, archives utilisateur originales dans
`roms/`. Aucun téléchargement de ROM ou installation de moteur par ce script.
Le chemin ci-dessous correspond au Mac de Michel ; l'adapter ailleurs :

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame npm run measure:reference
```

Aucun serveur HTTP requis. Le lanceur vérifie la version et les archives avec
`-verifyroms`, force le BIOS `ttl`, puis lance 20 processus neufs : cinq
amplitudes 0/64/256/416/768 et quatre phases −1/0/1/2. Environ une minute sur le
Mac de référence. Chaque essai a son répertoire sous `test-results/reference/`,
ignoré ; configurations utilisateur non lues/écrites, autosave et écriture NVRAM
désactivés. ROMs lues depuis les archives originales, aucun dump copié.
Le délai maximum est 45 secondes par processus ; aucune sauvegarde ou image
n'est produite. Résultat : `test-results/reference/comparison.json`.

MAME 0.271 est la référence **disponible sur ce Mac**, pas la dernière version.
Empreinte de l'exécutable testé :
`8a6cf7131934f7d8dcfed60daeeb75276cca62e91ef734e1e713de263f15553d`.
Les déclarations natives sélectionnées contiennent les 30 SHA-1 du set Web,
plus trois PROMs de carte ; `-verifyroms` accepte les archives fournies.

## Protocole

Le rejeu utilise les **octets réellement lus** par les quatre ports F20000–F20007,
conservés dans `third_party/trackball-port-evidence.json`. Il contourne volontairement
l'entrée hôte SDL et le trackpad pour comparer la réponse en aval des ports.
Ce n'est pas une comparaison de confort ni du traitement des événements macOS.

- Processus neuf ; crédit aux callbacks 700..707, Start 710..717.
- Tap de lecture sur l'espace programme du CPU, conservation des bits supérieurs,
  remplacement du seul octet de port ; aucun accès au code ou à la RAM de ROM.
- Second tap indépendant : contrôle des octets reçus après substitution.
- 64 lectures par tap sur les 16 étiquettes source 1198..1213, sans erreur.
- Suivi optique du marqueur bleu à 1199/1206/1212, framebuffer natif 336×240.
- Retrait des taps, libération des commandes, arrêt à 1214. La marge de deux
  callbacks permet de vérifier toute la fenêtre même aux phases retardées.

Le compteur source Web est celui relevé dans le handler. Côté natif, si
`completed` est le nombre de callbacks frame_done déjà terminés, la source est
`completed + 1 − phaseShift`. Cette équation définit les labels du banc ; elle
ne constitue pas une mesure de temps CPU. La phase −1 est appliquée à **tous**
les cas de sa série, sans ajustement par amplitude.

Les deltas Web sont ramenés de 1110×832 à 336×240 séparément sur les deux axes,
uniquement pour comparer l'image. Ce calcul ne change jamais les commandes du
joueur. Tolérance d'interprétation : un pixel natif ; les décimales des centroïdes
ne sont pas une précision physique.

## Résultats

Déplacement final du marqueur, en pixels natifs, phase fixe −1 :

| Impulsion X | Web ΔX | Référence ΔX | Web ΔY | Référence ΔY |
| ----------- | -----: | -----------: | -----: | -----------: |
| 0           |      0 |            0 |      0 |            0 |
| 64          | +0,887 |       +0,950 | −1,170 |       −1,133 |
| 256         | +2,945 |       +2,950 | −1,121 |       −1,133 |
| 416         | −7,027 |       −7,026 | −1,072 |       −1,085 |
| 768         | −3,069 |       −3,055 | −1,132 |       −1,105 |

Écart maximal par axe : 0,063 pixel. Les cinq départs natifs sont identiques,
les quatre essais neutres restent immobiles. À phase 0 ou 2, tous les cas non
nuls n'atteignent que ΔX +0,950 ; à phase 1, le cas 416 donne −5,026.
La comparaison naïve à phase 0 aurait donc attribué à tort la différence au
seul ancien cœur. Le décalage agit sur la forme temporelle reçue par le jeu ;
l'algorithme précis qui produit cette sensibilité n'est pas établi ici.

Contrôle exploratoire dans le vrai cœur Web, Chrome 157.0.8103.38 : aucun pending
natif, substitution des mêmes retours de ports pour 64/256/416. Les trois sorties
retrouvent exactement les centroïdes du banc initial. Cela appuie la pertinence
du rejeu en aval. Cette sonde ponctuelle n'est pas intégrée à la commande native.
Un contrôle natif 416 à vitesse réelle avec throttle reproduit aussi le résultat
phase 0 ; l'écart initial ne vient pas simplement de l'exécution accélérée.

Preuves numériques, sans ROM/image/état :
`third_party/mame-reference-evidence.json`. Le rapport conserve les quatre phases,
pas seulement la série concordante. Captures ponctuelles examinées hors dépôt :
décor inchangé sur la région native (40,90)–(300,210), cas neutre/256/416.

## Limites et suite

La position initiale visible concorde à moins d'un pixel, mais les états internes
ne sont pas prouvés identiques : le minuteur diffère d'environ une seconde et
le pilote natif utilise une horloge vidéo distincte du 60 Hz ancien. Le rejeu
ne valide ni le pont SDL de MAME, ni le timing du trackpad réel, ni un saut.
Il ne suffit pas à certifier une borne d'origine.

Prochaine investigation : mesurer la **forme temporelle d'un geste rapide réel**
au raccord natif, puis comparer des profils de même déplacement total répartis
sur plusieurs itérations. Les essais précédents montrent déjà l'effet de la
durée ; il faut le relier aux gestes reçus avant toute correction. Préserver le
gain de Michel et la physique ; aucun turbo, limiteur ou inertie arbitraire.

API vérifiées dans la documentation livrée avec 0.271 et les sources publiques
figées : [pilote Atari System 1](https://github.com/mamedev/mame/blob/mame0271/src/mame/atari/atarisy1.cpp),
[interface mémoire Lua](https://github.com/mamedev/mame/blob/mame0271/src/frontend/mame/luaengine_mem.cpp).
La présence d'une palette ne signifie pas que screen:pixels renvoie ses indices :
ici les pixels sont des couleurs RGB 32 bits ; screen:frame_number est une méthode.
