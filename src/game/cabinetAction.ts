export type CabinetAction =
  'credit' | 'start1' | 'start2' | 'play' | 'preview2';

/** Resolve only our own mesh metadata, never arbitrary commands from assets. */
export function cabinetAction(
  metadata: unknown,
  captured: boolean,
  button = 0,
): CabinetAction | null {
  if (
    captured ||
    button !== 0 ||
    !metadata ||
    typeof metadata !== 'object' ||
    !('cabinetAction' in metadata)
  )
    return null;
  const value = metadata.cabinetAction;
  return value === 'credit' ||
    value === 'start1' ||
    value === 'start2' ||
    value === 'play' ||
    value === 'preview2'
    ? value
    : null;
}
