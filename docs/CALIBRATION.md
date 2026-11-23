# Calibration à partir du geste enregistré

**Conclusion initiale invalidée par Michel en jeu : 0,50× n’est pas jouable.**
Le bouton d’essai a été retiré ; le contrôle normal revient à 1,70× et le boost
Espace est désormais une assistance explicite (voir COMFORT_AND_3D.md). Les
mesures ci-dessous restent un historique de diagnostic, pas une recommandation
actuelle ou une preuve de confort humain.

Le banc conserve les commandes du joueur et ses préférences. Les gains ci-dessous
sont appliqués uniquement aux séquences de diagnostic rejouées dans des sessions
isolées. Pas de nouvelle physique, d'inertie, de turbo ou de limiteur.

## Reproduire

Serveur de développement loopback déjà lancé, archives utilisateur dans roms/,
frontend/cœur préparés et Chrome installé :

```sh
npm run measure:calibration
npm run measure:calibration -- --phase-check
npm run measure:calibration -- --refine
```

Le sous-ensemble `--quick` compare 0,425/0,85/1,70× en environ trois minutes.
La série principale dure environ cinq minutes (12 cas), le contrôle de phase
environ deux minutes (5 cas), l'affinement environ trois minutes (8 cas).
Rapports ignorés : `test-results/capture-calibration.json`,
`capture-calibration-phase.json`, `capture-calibration-refined.json`.
Ces commandes ne tournent pas en CI. Les rapports peuvent être nettoyés par
Playwright ; les résultats retenus sont conservés dans third_party.

Le profil source est numérique et figé dans `captured-motion-evidence.json` :
95 paires natives X/Y, gain d'origine 1,70×. Le module pur captureCalibration
valide la structure, les types, les bornes int16 et la longueur maximale 128,
sans exécuter le texte de diagnostic. Aucun téléchargement/upload de ROM.

## Méthode

Deux comparaisons, sans confondre leur interprétation :

- Geste complet de 95 itérations, y compris ses petits mouvements préparatoires.
- Fenêtre fixe de huit itérations autour du plus grand pic L1 : indices 62..69,
  soit trois avant le pic, le pic et quatre après. Cette fenêtre est choisie une
  fois depuis le relevé d'origine, identique pour tous les gains. Ce n'est pas
  une nouvelle méthode de traitement des gestes du joueur.

Les facteurs 0,25/0,50/0,75/1/1,25 donnent les gains équivalents diagnostiques
0,425/0,85/1,275/1,70/2,125×. Les sous-comptages quantifiés sont conservés par
quantification des préfixes cumulés : erreur inférieure à un count par axe à
chaque préfixe, pauses et durée préservées. Au facteur 1, le profil est identique.
Ces gains équivalents ne reconstituent pas tous les événements individuels du
trackpad, indisponibles ; aucune prétention à l'identité avec une nouvelle
capture physique à un autre gain. Une saturation ferait refuser le cas, pas
abandonner silencieusement des counts.

Runtime neuf à chaque cas, Crédit 700..707, Start 710..717. Entrée à 1200, puis
contrôle indépendant à 1201 avec les observations décalées du même nombre
d'itérations. Même durée depuis le début du profil pour comparer les phases.
Les bornes de lecture et le SHA du handler natif sont vérifiés ; aucun poll
observé ne doit différer de la consigne. Neutres au début et à la fin. Aucun
usage du trackpad ou du gain mémorisé de Michel dans ce chemin d'injection.

Région témoin éloignée de la trajectoire, (900,250)–(1000,650), 40000 pixels RGBA.
Les comptes de pixels modifiés sont conservés. Il s'agit toujours de positions
écran ; ni vitesse physique ni réussite du saut ne sont mesurées. Les points
tardifs du profil complet peuvent inclure la réponse au terrain : ne pas
sélectionner un gain à partir de son seul déplacement final.

## Résultats initiaux

Coup isolé, déplacement du marqueur 36 itérations après le début de l'entrée,
normalisé vers 336×240, en pixels natifs :

| Gain équivalent |      ΔX |     ΔY |
| --------------: | ------: | -----: |
|           0,425 |  −8,039 | +2,934 |
|            0,85 | −15,981 | +7,802 |
|           1,275 |  +8,959 | −6,167 |
|            1,70 |  +2,985 | −3,136 |
|           2,125 |  −3,051 | −0,141 |

La réponse n'est pas monotone. Le résultat 0,85× semblait favorable mais le
contrôle avec une seule itération de décalage donne seulement (−2,052 ; −0,136),
contre (−10,076 ; +3,775) environ à 0,425× et (−5,061 ; +0,889) à 1,70×.
Il serait donc prématuré de recommander 0,85× sur le seul premier tableau.
Les instants sont alignés relativement au début de chaque stimulation.

Le curseur du jeu utilise un pas de 0,05 : les gains intermédiaires 0,425/1,275/
2,125 sont des valeurs de diagnostic, pas des préréglages utilisateur. L'affinement
compare 0,40/0,45/0,50×, chacun aux deux phases. Ce contrôle vise la régularité,
pas le plus grand résultat favorable obtenu sur un timing choisi.

## Affinement et candidat proposé

Coup isolé, même délai de 36 itérations, gains sélectionnables dans l'interface.
Les deux colonnes correspondent aux deux instants d'arrivée testés :

| Gain | ΔX/ΔY, entrée à 1200 | ΔX/ΔY, entrée à 1201 |
| ---: | -------------------- | -------------------- |
| 0,40 | −7,107 / +1,904      | −10,093 / +3,793     |
| 0,45 | −8,061 / +2,854      | −11,049 / +3,774     |
| 0,50 | −9,141 / +2,788      | −12,115 / +4,804     |

0,50× est retenu comme **candidat à essayer**, parmi ces valeurs affinées :
direction conservée et réponse plus importante aux deux timings que les gains
plus faibles testés. Il ne s'agit pas d'un optimum universel. À 1,70×, le même
coup donne (+2,985 / −3,136) dans la première phase, puis (−5,061 / +0,889) dans
l'autre : la seule hausse du gain ne résout pas les grandes accélérations.
La quantification et l'animation du sprite limitent la précision optique ; les
décimales du tableau ne sont pas une précision physique.

25 essais réalisés (12 principaux, 5 de phase, 8 affinés) : polls conformes,
aucune erreur JS ou trace perdue, départs comparables et neutres immobiles,
région témoin inchangée à tous les points. Le rejeu complet à 1,70× retrouve
exactement les positions de l'investigation précédente. Contrôle des anciens
ports en mode quick : neutre/256/neutre réussis, 64 lectures par cas.
Preuves numériques : `third_party/capture-calibration-evidence.json`.

Le bouton **Essayer 0,50× pour les accélérations** sélectionne le gain linéaire
existant et le mémorise uniquement après clic. Il ne reprend pas une session
en pause. Le gain de démarrage et le réglage de Michel restent inchangés avant
cette action. Aucun filtre, limiteur ou durée de commande n'est ajouté.
Le curseur permet de revenir à 1,70× ; Réinitialiser garde son comportement
historique de retour à 1×. La capture suivante démarre le relevé automatique.

Contrôle du bouton dans le vrai runtime : 1,70× avant clic, 0,50× après, mesure
capturée au bon gain et figée après Échap, zéro erreur JS. Événements souris
Chrome automatisés, pas un essai physique de trackpad. 0,50× n'a pas été rejoué
sur le profil complet de 95 itérations dans cette matrice d'affinement ; sa
sélection repose sur le coup isolé aux deux phases. Le confort des petits
mouvements, le saut du niveau 1 et le freinage du niveau 3 restent à valider
humainement. Il faut maintenant une partie à ce réglage, pas une nouvelle
capture du même geste pour continuer le banc.
