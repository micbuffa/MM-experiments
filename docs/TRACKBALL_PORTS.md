# Lectures effectives des ports trackball

Mesures du 9 novembre 2026, dans le cœur distribué et figé du projet. Ce diagnostic
observe le handler que le CPU émulé appelle ; il ne reconstitue pas ses retours
à partir des seuls deltas de souris. Aucun changement de gain ou de physique.

## Raccord vérifié

Sources publiques de la révision `3a72dae33dfae65871158f03dbc1e849d74b4060` :

- [atarisy1.c](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/drivers/atarisy1.c) : `main_readmem` associe `0xF20000–0xF20007` à `trakball_r`. Celui-ci retourne `cur[player][which]`, octet issu de `posx+posy` ou `posx-posy`.
- [memory.h](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/memory.h) : `Memory_ReadAddress16` contient start, end, handler ; signature `READ16_HANDLER` à deux arguments, retour entier.

Inspection de l'archive du cœur **sans ROM** : un seul motif de données contient
la plage F20000/F20007. Segment data 43696 du WASM, adresse linéaire 9849616,
index de fonction 17927. Cinq entrées voisines de 12 octets sont vérifiées :

| Décalage | Début  | Fin    | Index |
| -------- | ------ | ------ | ----- |
| -12      | F00000 | F00FFF | 17926 |
| 0        | F20000 | F20007 | 17927 |
| +12      | F40000 | F4001F | 17928 |
| +24      | F60000 | F60003 | 17929 |
| +36      | FC0000 | FC0001 | 17930 |

Le script capture les exports réels `Eh` (table) et `Ch` (mémoire), vérifie le
SHA-256 des octets WASM, puis refuse toute incohérence de carte ou de signature.
Un petit trampoline WASM `(i32,i32)→i32` remplace temporairement l'entrée 17927.
Il appelle **une fois** le handler original avec les mêmes arguments, enregistre
son retour et renvoie cette même valeur. Aucun appel synthétique à ce handler.
Pas d'accès à la RAM ou aux instructions du programme arcade ; seules les
métadonnées du cœur et les valeurs retournées par ses appels réels sont observées.

Les journaux sont bornés, les erreurs de mesure isolées, les retours/exceptions
natifs préservés. Le démontage restaure l'entrée seulement si elle appartient
encore au traceur. Les fichiers tiers et les octets du WASM ne sont pas modifiés.
Ce raccord est **uniquement un outil de diagnostic volontaire**, absent de l'app
compilée et des commandes de jeu. Il n'est pas une API publique du cœur.

## Essais réels et valeurs

Même protocole que [INPUT_RESPONSE.md](INPUT_RESPONSE.md) : nouveau runtime par
essai, Crédit/Start fixés, impulsion native X avant l'itération 1200, Y=0.
Cinq essais de prototype : neutre, 64, 256, 416, 768 sur une seule itération.
Contrôle du traceur conservé : neutre, 256, neutre, départs et positions identiques
aux résultats précédents, hash et carte vérifiés, aucun journal perdu/erreur JS.

Les compteurs du joueur 1 commencent à zéro. Pour cette entrée X seule, les deux
ports de ce joueur retournent les mêmes octets :

| Delta X natif | Premiers octets modifiés | Pas signés 8 bits correspondants | Octet final                    | ΔX bille observé à 1212 |
| ------------- | ------------------------ | -------------------------------- | ------------------------------ | ----------------------- |
| 0             | 0 puis 0                 | 0 puis 0                         | 0                              | 0,000 px                |
| 64            | 239 puis 237             | -17 puis -2                      | 237 (−19 modulo 256)           | +2,931 px               |
| 256           | 188 puis 179             | -68 puis -9                      | 179 (−77 modulo 256)           | +9,728 px               |
| 416           | 146 puis 131             | -110 puis -15                    | 131 (−125 modulo 256)          | −23,213 px              |
| 768           | 53 puis 26               | +53 puis -27                     | 26 (également −230 modulo 256) | −10,139 px              |

Le signe X est inversé par le pilote, sa sensibilité est de 30 %. Les valeurs
finales sont cohérentes avec ces réglages. Les écarts signés du tableau sont une
**convention de diagnostic**, pas une preuve de l'algorithme du programme. Dès
que le pas réel dépasse la demi-plage, le compteur seul ne permet plus de
reconstruire avec certitude le déplacement demandé.

Dans la fenêtre observée : 64 appels par essai, 4 par étiquette de frame, offsets
0, 1, 2, 3 et masque reçu 65280. Les ports de l'autre joueur évoluent aussi dans
ces essais ; ils sont consignés sans les assimiler à une seconde partie active.

## Temporalité

Le script conserve deux étiquettes différentes :

- `iterationFrame` : compteur relevé avant l'itération par le banc ;
- `frame` : export `getFrameNum()` consulté au retour du handler.

Pour l'impulsion 256 :

| Avant itération  | Compteur lors de la lecture | Valeurs des ports 0/1 |
| ---------------- | --------------------------- | --------------------- |
| 1199             | 1200                        | 0 / 0                 |
| 1200 — impulsion | 1201                        | 0 / 0                 |
| 1201             | 1202                        | 188 / 188             |
| 1202             | 1203                        | 179 / 179             |
| 1203             | 1204                        | 179 / 179             |

Une commande native d'une itération apparaît donc dans deux lectures successives
de ces compteurs. Cette évolution est compatible avec l'interpolation analogique
du cœur. Ce ne sont pas des horodatages en cycles CPU, ni une mesure de latence
physique du trackpad ; confondre les deux compteurs créerait un décalage artificiel.

## Ce que cela établit et ce qui reste ouvert

- À 416, les ports atteignent la valeur attendue −125 modulo 256, avec des pas
  observés dans la demi-plage signée. Pourtant la réponse horizontale visible est
  opposée à celle des petits pics. La perte avant ces ports ou leur seul repli
  n'explique donc pas cet essai. **L'algorithme interne responsable reste inconnu.**
- À 768, les pas deviennent ambigus modulo 256. Cela documente un risque réel des
  grands pics, sans faire du limiteur 416 rejeté une correction.
- Le saut latéral du niveau 1, la fidélité de fortes accélérations et le confort
  humain restent non validés. Aucun boost, inertie ou nouveau réglage livré.

La suite pertinente est une comparaison de référence des mêmes séquences de
ports ou un examen de leur interprétation et de leur rythme côté émulation,
à partir de sources publiques. Le présent suivi ne désassemble pas la ROM et
ne démontre pas à lui seul un bug du cœur plutôt qu'une propriété du jeu.

## Reproduire

Serveur dev local déjà lancé, archives autorisées dans `roms/` :

```sh
npm run measure:ports -- --quick
# Série complète du banc, plus longue :
npm run measure:ports
```

Profil de navigateur isolé ; contrôles normaux du joueur inchangés. Rapport
numérique dans `test-results/trackball-ports.json`, ignoré par Git. Pas de ROM,
image ou sauvegarde dans ce fichier. Le script refuse les lectures manquantes,
la perte de journaux, une carte/version différente ou des départs non comparables.
Pas de lancement automatique en CI.

Preuve numérique sans données de jeu :
[trackball-port-evidence.json](../third_party/trackball-port-evidence.json).
