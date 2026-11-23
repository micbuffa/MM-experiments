import { describe, expect, it } from 'vitest';
import { createRelativeMotion, restorePlayableGain } from './relativeMotion';

it('restaure le gain rejeté sans écraser les autres choix utilisateur', () => {
  expect(restorePlayableGain(0.5)).toBe(1.7);
  for (const gain of [0.25, 0.85, 1.7, 4])
    expect(restorePlayableGain(gain)).toBe(gain);
});

describe('gain avant accumulation native', () => {
  it('préserve signes et axes avec un gain commun', () => {
    const motion = createRelativeMotion(2);
    expect(motion.transform(3, -4)).toEqual([6, -8]);
    expect(motion.totals).toMatchObject({
      receivedX: 3,
      receivedY: -4,
      sentX: 6,
      sentY: -8,
    });
  });
  it('conserve les fractions entre événements sans répéter un mouvement', () => {
    const motion = createRelativeMotion(0.25);
    const events = Array.from({ length: 4 }, () => motion.transform(1, -1));
    expect(events).toEqual([
      [0, -0],
      [0, -0],
      [0, -0],
      [1, -1],
    ]);
    expect(motion.transform(0, 0)).toEqual([0, 0]);
  });
  it('purge les fractions à la pause et au changement de gain', () => {
    const motion = createRelativeMotion(0.5);
    motion.transform(1, 1);
    motion.reset();
    expect(motion.transform(1, 1)).toEqual([0, 0]);
    motion.setGain(1);
    expect(motion.transform(0, 0)).toEqual([0, 0]);
    expect(motion.gain).toBe(1);
  });
  it('borne le total pending int16 sans inversion ni impulsion différée', () => {
    const motion = createRelativeMotion();
    expect(motion.transform(100, -100, 32760, -32760)).toEqual([7, -8]);
    expect(motion.totals.saturated).toBe(2);
    expect(motion.transform(0, 0)).toEqual([0, 0]);
  });
  it('transmet proportionnellement petits et grands gestes à 1,80×', () => {
    const motion = createRelativeMotion(1.8);
    expect(motion.transform(5, -5)).toEqual([9, -9]);
    expect(motion.transform(200, -150, 9, -9)).toEqual([360, -270]);
    expect(motion.totals).toMatchObject({
      events: 2,
      peakRaw: 200,
      peakSent: 360,
      peakPending: 369,
      saturated: 0,
    });
    motion.reset();
    expect(motion.transform(0, 0)).toEqual([0, 0]);
    // Les statistiques gardent les pics de l'essai malgré la purge de pause.
    expect(motion.totals.peakPending).toBe(369);
  });
  it('conserve les grandes impulsions au gain choisi sans le limiteur expérimental rejeté', () => {
    const motion = createRelativeMotion(1.7);
    expect(motion.transform(1000, -1000)).toEqual([1700, -1700]);
    expect(motion.transform(0, 0)).toEqual([0, 0]);
    expect(motion.totals.saturated).toBe(0);
  });
  it('réinitialise seulement les mesures, en conservant gain et fractions', () => {
    const motion = createRelativeMotion(1.8);
    expect(motion.transform(1, -1)).toEqual([1, -1]);
    motion.resetMetrics();
    expect(Object.values(motion.totals).every((value) => value === 0)).toBe(
      true,
    );
    expect(motion.gain).toBe(1.8);
    expect(motion.transform(1, -1)).toEqual([2, -2]);
    expect(motion.totals.events).toBe(1);
  });
  it.each([0, -1, 4.1, NaN, Infinity])('refuse le gain %s', (gain) => {
    expect(() => createRelativeMotion(gain)).toThrow(RangeError);
  });
  it('refuse les deltas non finis', () => {
    expect(() => createRelativeMotion().transform(NaN, 0)).toThrow(RangeError);
  });
});
