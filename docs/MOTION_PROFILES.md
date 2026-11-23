# Durée des gestes et profils d'impulsion

Le 9 novembre 2026, le banc compare un même déplacement natif total sur plusieurs
itérations. **Le résultat varie fortement avec la répartition, y compris son
sens.** Augmenter le pic ne garantit donc pas une meilleure accélération.
Le saut du niveau 1 reste non corrigé ; aucun nouveau réglage de contrôle n'est appliqué.

## Relever une accélération

La première version enregistrait seulement le premier geste après la capture.
Le relevé de Michel montrait ainsi 300 ms et un pic natif L1 de 319, alors que
les statistiques de l'essai contenaient un pic X de 916 absent de ce premier
segment. La consigne était ambiguë : Michel avait bien fait une accélération,
puis Échap et Copier. La sélection est désormais automatique sur tout l'essai.

1. Recharger complètement la page, lancer une partie et garder le gain habituel.
2. Cliquer **Capturer** : la mesure démarre automatiquement, au gain courant.
3. Faire une accélération, puis **Échap**. Pas d'attente ou de durée à respecter.
4. Cliquer **Copier les diagnostics** et coller le texte dans la discussion.

Un message visible indique « Essai prêt », « Mesure en cours » puis « Mesure
terminée ». Pas de second essai moyen à identifier pour utiliser ce relevé.
Les petits déplacements préparatoires peuvent précéder l'accélération.

## Sélection et limites du relevé

Chaque capture remet les mesures à zéro et arme le relevé, sans clic préalable
sur Nouvel essai. Le relevé reste actif jusqu'à Échap, perte de focus/capture ou changement de
gain. Un silence ferme un segment, **pas l'essai** : un mouvement plus fort
survenu ensuite remplace le précédent. La sélection utilise le plus grand pic
L1 (|X|+|Y|) entre la commande accumulée avant lecture et le dernier poll natif
observé. Elle ne mesure pas une accélération physique de bille. En cas d'égalité,
le premier segment est gardé. `selection` expose le critère, le nombre de
segments, l'identifiant choisi, son pic et sa cause de fin. Le statut global
passe à complete lors de l'interruption explicite ; reason indique cette fin.

Chaque segment contient au plus 128 lignes, finit au premier callback après
deux secondes ou après silence 0,18 seconde avec dernier poll nul. Une limite
ferme le segment et permet de poursuivre l'essai. Un segment tronqué est signalé
par selectedReason=limit. Seuls le meilleur segment terminé et celui en cours
sont retenus, soit 256 lignes internes au plus ; la copie contient uniquement
le segment choisi. Nouvel essai reste facultatif pour effacer et réarmer. Une reprise sans
mouvement ne désarme pas l'essai ; changer le gain le termine et nécessite de
réarmer pour une autre mesure. Aucun stockage, upload, listener ou timer ajouté.

Les lignes regroupent les événements non nuls entre callbacks : compte, sommes
avant/après gain, première/dernière heure d'événement relative au segment, pic
transmis intermédiaire `peakSentL1`, frame interne et dernier poll X/Y. Des
événements opposés peuvent s'annuler dans les sommes sans effacer leur pic.
`unsampledEvents` conserve séparément les événements du segment sélectionné
interrompus avant son prochain callback : ne pas les présenter comme des polls.
Une accélération suivie immédiatement d'Échap peut ainsi être conservée même si
le dernier lot n'a pas encore été lu. Les autres segments ne sont pas exportés.

Temps en secondes depuis performance.now à la réception, pas timestamps
matériels. Le dernier poll peut omettre des lectures intermédiaires ; ne pas
sommer ces samples comme un compteur exhaustif. Aucun accès aux coordonnées
tactiles ou identification garantie du périphérique. La chaîne de commande
et la physique ne sont pas modifiées par cette sélection de diagnostic.

## Banc de profils synthétiques

Serveur dev loopback déjà lancé et ZIP locaux disponibles :

```sh
npm run measure:profiles
# Sous-ensemble avec contrôle du décor :
npm run measure:profiles -- --quick
```

Rapports ignorés : `test-results/impulse-profiles.json` pour la série complète,
`test-results/impulse-profiles-quick.json` pour le sous-ensemble. Le banc ne
s'exécute pas en CI. Processus navigateur isolé, document/runtime neuf pour
chaque essai, sans modifier les préférences de Michel. Aucune ROM/image/état dans
les preuves livrées. Environ 4 minutes pour 11 essais, 2 minutes pour 6 contrôles.

Crédit avant itérations 700..707, Start 710..717, entrée à partir de 1200,
mesures vidéo 1199/1206/1212/1224/1236. Deltas X natifs seuls, Y=0, gain et
événements hôtes volontairement contournés. Chaque valeur réellement pollée est
comparée à la consigne ; départs identiques à un pixel près et zéro erreur JS
exigés. `profile` contient les valeurs par itération et `total` leur somme.
En mode profils, le champ historique `amplitude` est le total demandé, **pas**
le pic ; utiliser `profile` pour interpréter les valeurs. Le mode ancien
`measure:impulses` conserve son sens et ses frames.

Les profils sont des consignes de diagnostic. Ils ne lissent, n'étalent ou
n'amplifient jamais les gestes dans le jeu normal.

## Résultats observés

Onze essais complets : départ identique (525,494 ; 168,016), canvas 1110×832,
neutres immobiles au début et à la fin, chaque poll conforme, zéro erreur JS.
Déplacement horizontal du marqueur en pixels de présentation, depuis 1199 :

| Total X | Profil    | ΔX à 1212 | ΔX à 1236 |
| ------: | --------- | --------: | --------: |
|   1 536 | 1 × 1 536 |    −16,72 |    −53,12 |
|   1 536 | 2 × 768   |     −3,22 |     −9,92 |
|   1 536 | 4 × 384   |    −36,35 |   −112,22 |
|   1 536 | 6 × 256   |    +29,66 |   +105,71 |
|   1 536 | 12 × 128  |    +16,31 |    +95,79 |
|     416 | 1 × 416   |    −23,21 |    −63,04 |
|     416 | 2 × 208   |     +9,73 |    +29,66 |
|     416 | 4 × 104   |     +9,73 |    +29,66 |
|     416 | 8 × 52    |     +9,73 |    +26,15 |

Six essais de contrôle répètent les neutres et les profils 1536 sur 1/4/6/12
itérations : mêmes centroïdes à chaque image, zéro erreur JS. Sur la région
(100,300)–(1000,700), les 360000 pixels RGBA restent strictement identiques à
l'image initiale pour les 24 comparaisons postérieures ; pas de scroll détecté
sur ces contrôles. La série initiale de onze essais n'avait pas ce contrôle
intégré ; ne pas l'attribuer rétroactivement aux autres cas.

Cela ne définit pas une durée optimale universelle : 4 × 384 reste inversé,
et les nombres de frames de stimulation diffèrent. Les mesures à 1236 sont
postérieures à toutes les stimulations ; elles ne sont pas des vitesses ou
des coordonnées internes. Aucun essai de saut vers les plateformes.

Contrôle du raccord dans le vrai runtime, Chrome automatisé : trois événements
souris fiables au sens navigateur, trois samples natifs non nuls sur trois
itérations, arrêt silencieux, 14 lignes, zéro erreur JS. Ce test **n'est pas un
mouvement physique de trackpad** et ne valide pas le confort de Michel.
Preuves numériques : `third_party/impulse-profile-evidence.json`.

La comparaison MAME native précédente reproduisait déjà le comportement après
alignement de phase : ne pas conclure à un défaut spécifique à 2003-Plus sur
ces seuls résultats. La suite utile dépend maintenant du relevé automatique d’une accélération
réelle : vérifier sa durée, les paquets et les grands polls avant d’envisager
une correction documentée.

## Premier relevé humain analysé

Le relevé suivant est exploitable et a été rejoué dans les deux cœurs :
[CAPTURED_MOTION.md](CAPTURED_MOTION.md). Les 95 lignes correspondent aux commandes
natives observées ; la trajectoire mesurée concorde avec la référence native.
Le profil est conservé pour les prochains essais, sans demander à Michel de
recommencer la capture. Ce résultat ne déclare pas le saut corrigé.
