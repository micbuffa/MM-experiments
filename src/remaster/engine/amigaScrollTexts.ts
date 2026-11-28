/**
 * Textes éditables des deux bandeaux défilants du mode Amiga (Attract Mode).
 *
 * Modifiez librement `AMIGA_TOP_SCROLL_TEXT` ou `AMIGA_BOTTOM_SCROLL_TEXT` :
 * la durée du mode Amiga s'adapte automatiquement pour que les deux textes
 * défilent intégralement jusqu'au dernier caractère avant de changer d'écran.
 */

export interface AmigaScrollStripMetrics {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly pixelSize: number;
  readonly letterSpacing: number;
  readonly speedPxPerSec: number;
  readonly startOffsetRatio: number;
}

/** Bandeau supérieur (légèrement rebondissant, juste sous le logo MARBYLON MADNESS 3D). */
export const AMIGA_TOP_SCROLL_TEXT =
  '*** THE 1986 AMIGA VERSION WAS BY FAR THE BEST ARCADE PORT EVER MADE! ' +
  'THE AUTHORS OF THE VERSION BEFORE YOUR EYES SPENT COUNTLESS HOURS ON IT — ' +
  'HUGE THANKS TO LARRY REED, WILL HARVEY & ELECTRONIC ARTS FOR THEIR INCREDIBLE WORK BACK THEN — ' +
  'THE AMIGA WAS SIMPLY THE BEST FOR ARCADE PORTS! ***     ';

/** Bandeau inférieur (sinusoïdal, crédits et commandes). */
export const AMIGA_BOTTOM_SCROLL_TEXT =
  '*** MARBYLON MADNESS 3D ***   ' +
  'HOMAGE TO MARK CERNY, BOB FLANAGAN, BRAD FULLER, HAL CANON, SAM COMSTOCK & ATARI GAMES (1984)   *   ' +
  '3D REMASTER: MICHEL BUFFA   *   ' +
  'WEBASSEMBLY MUSIC: PETER SALOMONSEN   *   ' +
  '3D PROTOTYPE ACTORS: LUCA ELIA   *   ' +
  'PRESS SPACE TO PLAY  ·  S TOGGLE SCANLINES  ·  LEFT/RIGHT SWITCH MODE     ';

export const AMIGA_TOP_SCROLL_METRICS: AmigaScrollStripMetrics = {
  canvasWidth: 2048,
  canvasHeight: 96,
  pixelSize: 4.1,
  letterSpacing: 0.8,
  speedPxPerSec: 320,
  startOffsetRatio: 0.25,
};

export const AMIGA_BOTTOM_SCROLL_METRICS: AmigaScrollStripMetrics = {
  canvasWidth: 1536,
  canvasHeight: 112,
  pixelSize: 6.0,
  letterSpacing: 0.8,
  speedPxPerSec: 540,
  startOffsetRatio: 0.25,
};

/**
 * Calcule le temps (en secondes) nécessaire pour que le texte défile
 * intégralement jusqu'à la sortie de son dernier caractère.
 */
export function computeScrollPassDurationSeconds(
  text: string,
  metrics: AmigaScrollStripMetrics,
): number {
  const stepPx = (8 + metrics.letterSpacing) * metrics.pixelSize;
  const totalWidthPx = text.length * stepPx;
  const travelPx =
    metrics.canvasWidth * metrics.startOffsetRatio + totalWidthPx;
  return travelPx / Math.max(1, metrics.speedPxPerSec);
}

/**
 * Durée minimale du mode Amiga : garantit que le texte du bas et celui du haut
 * passent entièrement (+ 2 s de marge confortable).
 */
export function computeAmigaDemoDurationSeconds(
  topText: string = AMIGA_TOP_SCROLL_TEXT,
  bottomText: string = AMIGA_BOTTOM_SCROLL_TEXT,
): number {
  const topSec = computeScrollPassDurationSeconds(
    topText,
    AMIGA_TOP_SCROLL_METRICS,
  );
  const bottomSec = computeScrollPassDurationSeconds(
    bottomText,
    AMIGA_BOTTOM_SCROLL_METRICS,
  );
  return Math.ceil(Math.max(20, topSec, bottomSec) + 2);
}
