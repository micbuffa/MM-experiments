# Relevé réel et rejeu du geste de Michel

Le relevé reçu le 9 novembre 2026 est désormais complet et utilisable. Aucun
nouveau geste n'est nécessaire pour refaire cette investigation : le profil
numérique est conservé dans `third_party/captured-motion-evidence.json`.
Le saut reste non corrigé ; le contrôle et le gain du joueur ne sont pas modifiés.

## Ce que montre le relevé

Gain 1,70×, capture terminée par Échap, un segment de 95 lignes, 96 événements
non nuls sur 1,391 seconde. 52 samples natifs non nuls répartis sur 85 itérations.
Les sommes transmises sont −5737 en X et +6257 en Y. Pour **chacune des 95 lignes**,
les deltas transmis sont égaux au dernier poll natif observé. Aucun écrêtage
signalé et aucun événement en attente non échantillonné à la fin du segment.
Il s'agit d'une observation au raccord, pas de tous les polls ni de la vitesse
de bille. Le compteur global inclut aussi un événement sans contribution aux
sommes, compatible avec le rejet des mouvements nuls par la timeline.

Principaux pics diagonaux, temps relatifs au segment :

|   Temps | X natif | Y natif | Somme des valeurs absolues |
| ------: | ------: | ------: | -------------------------: |
| 0,832 s |    −624 |    +527 |                       1151 |
| 1,085 s |    −608 |    +574 |                       1182 |
| 1,335 s |    −515 |    +539 |                       1054 |

Le pic maximal retenu correspond donc bien à une forte commande du relevé.
La limite int16 du pont n'est pas atteinte. Cela ne certifie pas le traitement
en aval ni la réussite du saut.

## Rejeu contrôlé dans le vrai cœur Web

Sonde ponctuelle dérivée de `scripts/measure-impulses.mjs`, hors dépôt : profil
numérique X/Y injecté avant les itérations 1200..1294, sans gain supplémentaire.
Chaque ligne est rejouée sur une itération ; le jitter temporel des callbacks
macOS n'est pas rejoué. Runtime neuf par cas, Crédit 700..707, Start 710..717.
Série neutre / profil capturé / neutre. Tous les polls observés sont conformes,
les départs identiques et les neutres immobiles. Zéro erreur JavaScript.
Ce ne sont pas le même état de partie ni la position de Michel dans sa course.

Handler trakball_r instrumenté par le module existant, hash/carte/signature
vérifiés ; appels et retours natifs préservés. 488 lectures par essai sur la
fenêtre de compteurs 1198..1319, aucune perte ou erreur d'observation. Pour le
pic (−608,+574), injecté avant 1265, le port 0 passe autour de cet instant de
212 à 27 puis 190. Des octets seuls ne lèvent pas l'ambiguïté du nombre de tours :
212→27 peut notamment représenter +71 ou +327 modulo 256. Ne pas présenter
un décodage signé arbitraire comme l'algorithme du programme arcade.

Le pilote public figé combine les positions par posx+posy et posx−posy, X inversé,
sensibilité 30 %, compteurs 8 bits (sources et ABI : TRACKBALL_PORTS.md).
Les grandes commandes diagonales doivent donc être étudiées en aval du pont,
mais ces octets seuls ne démontrent pas la cause exacte des sauts manqués.

## Contrôle dans MAME 0.271 natif

Rejeu des mêmes octets observés, avec le **décalage fixe −1 déjà calibré avant
ce relevé**, sans ajustement par point. Un cas neutre et un cas capturé, processus
neufs, BIOS ttl, configuration/états/NVRAM isolés et non sauvegardés. Deux taps
indépendants vérifient chacun 488 lectures. Après la fenêtre, le dernier octet
est maintenu : ne pas remettre les compteurs à zéro et inventer une impulsion.

À chacun des sept instants 1199/1212/1248/1264/1294/1306/1318, les déplacements
optiques Web normalisés vers 336×240 et natifs concordent à **0,158 pixel maximum
par axe**. Au dernier point : Web (−75,987 ; +73,868), référence (−75,980 ; +73,896).
Ce sont des déplacements écran, pas des coordonnées physiques. La région
témoin n'est plus statique quand la bille entre dans sa zone ; aucune preuve
de déplacement dans le monde n'est déduite de ce contrôle.

Ce résultat étend à un profil humain les observations antérieures sur impulsions
isolées. Il ne montre pas un défaut spécifique à 2003-Plus, ne prouve pas l'égalité
des états internes, ni la fidélité à une borne physique. Les octets seuls et ce
rejeu ne permettent pas d'affirmer un correctif de saut.

La suite peut s'appuyer sur ce profil conservé pour comparer des amplitudes et
leurs effets en aval, en gardant le timing par itération. Aucun nouveau limiteur,
boost ou gain imposé sur la base de ce seul essai. Ne pas redemander la même
manipulation à Michel : les données existent maintenant.
