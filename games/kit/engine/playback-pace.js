// Base intervals for the first and later tests, with duration thresholds for grouping steps into frames.
const PACE = [{ per: 650, most: 12000 }, { per: 110, most: 1700 }]

/** Apply the playback speed to the frame interval while keeping the same number of steps per frame. */
export function paceOf(test, steps, speed) {
  const { per, most } = PACE[test === 0 ? 0 : 1]
  return { per: per / speed, stride: Math.max(1, Math.ceil((Math.max(1, steps) * per) / most)) }
}
