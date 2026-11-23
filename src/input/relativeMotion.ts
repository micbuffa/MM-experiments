/** Gain expérimental, commun aux axes ; aucune correction d'isométrie ni inertie. */
export const DEFAULT_GAIN = 1.7;
export const MIN_GAIN = 0.25;
export const MAX_GAIN = 4;
/** Restaurer le contrôle après le candidat 0,50× rejeté en essai humain. */
export function restorePlayableGain(value: number): number {
  return value === 0.5 ? DEFAULT_GAIN : value;
}

export function createRelativeMotion(initialGain = DEFAULT_GAIN) {
  let gain = DEFAULT_GAIN;
  let fractionX = 0;
  let fractionY = 0;
  const totals = {
    receivedX: 0,
    receivedY: 0,
    sentX: 0,
    sentY: 0,
    saturated: 0,
    events: 0,
    peakRaw: 0,
    peakSent: 0,
    peakPending: 0,
  };
  function setGain(value: number) {
    if (!Number.isFinite(value) || value < MIN_GAIN || value > MAX_GAIN)
      throw new RangeError('Gain hors limites.');
    gain = value;
    fractionX = fractionY = 0;
  }
  setGain(initialGain);
  function axis(
    raw: number,
    fraction: number,
    pending: number,
  ): [number, number] {
    const scaled = raw * gain + fraction;
    const integer = Math.trunc(scaled);
    const bounded = Math.max(
      -32768 - pending,
      Math.min(32767 - pending, integer),
    );
    if (bounded !== integer) totals.saturated++;
    // L'excédent saturé est abandonné, jamais reporté comme une impulsion future.
    return [bounded, scaled - integer];
  }
  return {
    setGain,
    reset() {
      fractionX = fractionY = 0;
    },
    get gain() {
      return gain;
    },
    get totals() {
      return { ...totals };
    },
    resetMetrics() {
      for (const key of Object.keys(totals) as Array<keyof typeof totals>)
        totals[key] = 0;
    },
    transform(
      x: number,
      y: number,
      pendingX = 0,
      pendingY = 0,
    ): [number, number] {
      if (![x, y, pendingX, pendingY].every(Number.isFinite))
        throw new RangeError('Deltas non finis.');
      const [sentX, rx] = axis(x, fractionX, pendingX);
      const [sentY, ry] = axis(y, fractionY, pendingY);
      totals.events++;
      totals.peakRaw = Math.max(totals.peakRaw, Math.abs(x), Math.abs(y));
      totals.peakSent = Math.max(
        totals.peakSent,
        Math.abs(sentX),
        Math.abs(sentY),
      );
      totals.peakPending = Math.max(
        totals.peakPending,
        Math.abs(pendingX + sentX),
        Math.abs(pendingY + sentY),
      );
      fractionX = rx;
      fractionY = ry;
      totals.receivedX += x;
      totals.receivedY += y;
      totals.sentX += sentX;
      totals.sentY += sentY;
      return [sentX, sentY];
    },
  };
}
