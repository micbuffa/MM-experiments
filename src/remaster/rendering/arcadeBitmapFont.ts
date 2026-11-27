/**
 * Authentic 1984 Atari System 1 8x8 uppercase arcade bitmap font
 * (bitmasks mapped from `136032.104.f5` alphanumeric ROM layout).
 */
const ARCADE_FONT_8X8: Readonly<Record<string, readonly number[]>> = {
  ' ': [0, 0, 0, 0, 0, 0, 0, 0],
  '!': [48, 48, 48, 16, 16, 0, 48, 0],
  '"': [0, 40, 40, 0, 0, 0, 0, 0],
  '#': [40, 40, 254, 40, 254, 40, 40, 0],
  $: [16, 254, 208, 254, 22, 254, 16, 0],
  '%': [226, 164, 232, 16, 46, 74, 142, 0],
  '&': [112, 80, 32, 112, 154, 204, 122, 0],
  "'": [24, 24, 8, 0, 0, 0, 0, 0],
  '’': [24, 24, 8, 0, 0, 0, 0, 0],
  '(': [8, 16, 32, 32, 32, 16, 8, 0],
  ')': [16, 8, 4, 4, 4, 8, 16, 0],
  '*': [0, 16, 84, 40, 40, 84, 16, 0],
  '+': [0, 16, 16, 124, 16, 16, 0, 0],
  ',': [0, 0, 0, 0, 0, 24, 8, 16],
  '-': [0, 0, 0, 124, 0, 0, 0, 0],
  '—': [0, 0, 0, 254, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 48, 48, 0],
  '·': [0, 0, 0, 24, 24, 0, 0, 0],
  '/': [1, 3, 6, 12, 24, 48, 96, 192],
  '0': [56, 108, 198, 198, 198, 108, 56, 0],
  '1': [24, 56, 120, 24, 24, 24, 126, 0],
  '2': [124, 198, 14, 60, 120, 224, 254, 0],
  '3': [126, 12, 24, 60, 6, 198, 124, 0],
  '4': [28, 60, 108, 204, 254, 12, 12, 0],
  '5': [252, 192, 252, 6, 6, 198, 124, 0],
  '6': [60, 96, 192, 252, 198, 198, 124, 0],
  '7': [254, 198, 12, 24, 48, 48, 48, 0],
  '8': [124, 198, 198, 124, 198, 198, 124, 0],
  '9': [124, 198, 198, 126, 6, 12, 120, 0],
  ':': [0, 0, 24, 24, 0, 24, 24, 0],
  '<': [4, 8, 16, 32, 16, 8, 4, 0],
  '←': [16, 48, 126, 254, 126, 48, 16, 0],
  '=': [0, 0, 124, 0, 124, 0, 0, 0],
  '>': [32, 16, 8, 4, 8, 16, 32, 0],
  '→': [16, 24, 252, 254, 252, 24, 16, 0],
  '?': [60, 102, 102, 12, 24, 24, 0, 24],
  '@': [60, 66, 153, 161, 161, 153, 66, 60],
  '★': [16, 16, 254, 124, 56, 108, 198, 0],
  A: [56, 108, 198, 198, 254, 198, 198, 0],
  B: [252, 198, 198, 252, 198, 198, 252, 0],
  C: [124, 198, 192, 192, 192, 198, 124, 0],
  D: [248, 204, 198, 198, 198, 204, 248, 0],
  E: [254, 192, 192, 248, 192, 192, 254, 0],
  F: [254, 192, 192, 248, 192, 192, 192, 0],
  G: [62, 96, 192, 206, 198, 102, 62, 0],
  H: [198, 198, 198, 254, 198, 198, 198, 0],
  I: [126, 24, 24, 24, 24, 24, 126, 0],
  J: [6, 6, 6, 6, 198, 198, 124, 0],
  K: [198, 204, 216, 240, 248, 204, 198, 0],
  L: [96, 96, 96, 96, 96, 96, 126, 0],
  M: [198, 238, 254, 254, 214, 198, 198, 0],
  N: [198, 230, 246, 254, 222, 206, 198, 0],
  O: [124, 198, 198, 198, 198, 198, 124, 0],
  P: [252, 198, 198, 198, 252, 192, 192, 0],
  Q: [124, 198, 198, 198, 222, 204, 122, 0],
  R: [252, 198, 198, 204, 248, 220, 206, 0],
  S: [120, 204, 192, 124, 6, 198, 124, 0],
  T: [126, 24, 24, 24, 24, 24, 24, 0],
  U: [198, 198, 198, 198, 198, 198, 124, 0],
  V: [198, 198, 198, 238, 124, 56, 16, 0],
  W: [198, 198, 214, 254, 254, 238, 198, 0],
  X: [198, 238, 124, 56, 124, 238, 198, 0],
  Y: [102, 102, 102, 60, 24, 24, 24, 0],
  Z: [254, 14, 28, 56, 112, 224, 254, 0],
  _: [0, 0, 0, 0, 0, 0, 0, 255],
};

export interface ArcadeTextOptions {
  readonly pixelSize: number;
  readonly fillStyle: string | CanvasGradient;
  readonly align?: 'left' | 'center' | 'right';
  readonly shadowColor?: string;
  readonly shadowOffset?: number;
  readonly letterSpacing?: number;
}

export function measureArcadeTextWidth(
  text: string,
  pixelSize: number,
  letterSpacing = 1,
): number {
  if (text.length === 0) return 0;
  const step = (8 + letterSpacing) * pixelSize;
  return text.length * step - letterSpacing * pixelSize;
}

/**
 * Draw pixel-crisp 1984 Atari System 1 8x8 bitmap text onto a Canvas2D context.
 * `y` is the vertical center of the 8-pixel glyph row.
 */
export function drawArcadeText(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  x: number,
  y: number,
  options: ArcadeTextOptions,
): void {
  const text = rawText.toUpperCase();
  const px = options.pixelSize;
  const spacing = options.letterSpacing ?? 0.8;
  const step = (8 + spacing) * px;
  const totalW = measureArcadeTextWidth(text, px, spacing);
  const align = options.align ?? 'center';
  const startX =
    align === 'center' ? x - totalW * 0.5 : align === 'right' ? x - totalW : x;
  const startY = y - 3.5 * px;

  const drawPass = (
    ox: number,
    oy: number,
    fill: string | CanvasGradient,
  ): void => {
    ctx.fillStyle = fill;
    for (let i = 0; i < text.length; i++) {
      const glyph = ARCADE_FONT_8X8[text[i]!] ?? ARCADE_FONT_8X8[' ']!;
      const gx = startX + i * step + ox;
      for (let row = 0; row < 8; row++) {
        const bits = glyph[row]!;
        if (bits === 0) continue;
        const gy = startY + row * px + oy;
        for (let col = 0; col < 8; col++) {
          if ((bits & (1 << (7 - col))) !== 0) {
            ctx.fillRect(
              Math.floor(gx + col * px),
              Math.floor(gy),
              Math.ceil(px),
              Math.ceil(px),
            );
          }
        }
      }
    }
  };

  if (options.shadowColor) {
    const off = options.shadowOffset ?? Math.max(2, Math.round(px * 0.75));
    drawPass(off, off, options.shadowColor);
  }
  drawPass(0, 0, options.fillStyle);
}
