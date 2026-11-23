export const practiceFrame = { width: 336, height: 240, displayAspect: 4 / 3 };
export const practiceSideBorder = 24;
export const practiceOrigin = { x: 10, z: 11 };
export const practiceCompleteOrigin = { x: 0, z: 0 };
export const practiceOpeningScroll = -16144;
export const practiceLastSurveyedScroll = -16069;
export const practiceFinishScroll = -15784;
export const arcadeCellUnits = 8;
export const arcadeGroundHeight = 0x4000;

// With a 45° azimuth and 30° elevation, the ground axes move one
// horizontal pixel and half a vertical pixel per arcade unit.
export const arcadeHeightScale = Math.sqrt(2 / 3);
const xAtOrigin = 159;
const yOffset = -92;

export function projectPracticePoint(x: number, z: number, height: number) {
  return {
    x: xAtOrigin + z - x,
    y: yOffset + (x + z) / 2 - (height - arcadeGroundHeight),
  };
}

export function practiceFrustum(
  columns: number,
  rows: number,
  scroll = practiceOpeningScroll,
  origin = practiceOrigin,
) {
  const center = projectPracticePoint(
    (origin.x + columns / 2) * arcadeCellUnits,
    (origin.z + rows / 2) * arcadeCellUnits,
    arcadeGroundHeight,
  );
  const pixelsPerUnit = arcadeCellUnits * Math.SQRT2;
  const screenY = center.y - (scroll - practiceOpeningScroll);
  return {
    left: (practiceSideBorder - center.x) / pixelsPerUnit,
    right:
      (practiceFrame.width - practiceSideBorder - center.x) / pixelsPerUnit,
    top: screenY / pixelsPerUnit,
    bottom: (screenY - practiceFrame.height) / pixelsPerUnit,
  };
}

/** The complete survey can also display airborne marbles beyond its edges. */
export function practiceWorldPoint(
  x: number,
  z: number,
  height: number,
  columns: number,
  rows: number,
  origin = practiceOrigin,
  margin = 0,
  heightRange = 0x100,
) {
  const cellX = x / arcadeCellUnits - origin.x;
  const cellZ = z / arcadeCellUnits - origin.z;
  if (
    cellX < -margin ||
    cellX >= columns + margin ||
    cellZ < -margin ||
    cellZ >= rows + margin ||
    Math.abs(height - arcadeGroundHeight) > heightRange
  )
    return null;
  return {
    x: cellX - columns / 2,
    y: ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits,
    z: cellZ - rows / 2,
  };
}
