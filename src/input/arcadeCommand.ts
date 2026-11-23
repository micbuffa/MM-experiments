import type { ArcadeButton } from './buttonPulses';

interface CommandSession {
  readonly paused: boolean;
  resume(): void;
  pulse(button: ArcadeButton): void;
}

/** Crédit/Start sont des gestes explicites ; reprendre avant la pression. */
export function sendArcadeCommand(
  session: CommandSession,
  button: ArcadeButton,
): void {
  if (session.paused) session.resume();
  session.pulse(button);
}
