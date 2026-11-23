export function readPreference(
  storage: Pick<Storage, 'getItem'>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  try {
    const stored = storage.getItem(`marble.${key}`);
    if (stored === null) return fallback;
    const value = Number(stored);
    return Number.isFinite(value) && value >= min && value <= max
      ? value
      : fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  value: number,
): void {
  try {
    storage.setItem(`marble.${key}`, String(value));
  } catch {
    /* Stockage désactivé : réglage de session seulement. */
  }
}
