import { expect, it } from 'vitest';
import { sendArcadeCommand } from './arcadeCommand';

it.each([2, 3] as const)(
  'reprend explicitement avant la commande %s en pause',
  (button) => {
    const calls: string[] = [];
    let paused = true;
    sendArcadeCommand(
      {
        get paused() {
          return paused;
        },
        resume() {
          calls.push('resume');
          paused = false;
        },
        pulse(value) {
          expect(paused).toBe(false);
          calls.push(`pulse:${value}`);
        },
      },
      button,
    );
    expect(calls).toEqual(['resume', `pulse:${button}`]);
  },
);

it('ne redémarre pas une session active et ne purge donc pas une pression en cours', () => {
  const calls: string[] = [];
  const session = {
    paused: false,
    resume() {
      calls.push('resume');
    },
    pulse(button: number) {
      calls.push(`pulse:${button}`);
    },
  };
  sendArcadeCommand(session, 2);
  sendArcadeCommand(session, 3);
  expect(calls).toEqual(['pulse:2', 'pulse:3']);
});

it('ne transmet pas une pression si la reprise échoue', () => {
  let sent = false;
  expect(() =>
    sendArcadeCommand(
      {
        paused: true,
        resume() {
          throw new Error('resume failed');
        },
        pulse() {
          sent = true;
        },
      },
      2,
    ),
  ).toThrow('resume failed');
  expect(sent).toBe(false);
});
