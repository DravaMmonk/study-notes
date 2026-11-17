// Circuit kit: wire geometry shared by 状态之图 and Vision Complete.

/**
 * A wire from a to b ([x, y] each) as an S-curve that leaves and arrives along `axis`: 'x' for boards that flow
 * left to right, 'y' for boards that flow top to bottom. The handles reach at least `reach`, or half the distance.
 */
export function curve([x1, y1], [x2, y2], axis = 'y', reach = 24) {
  if (axis === 'x') {
    const k = Math.max(reach, Math.abs(x2 - x1) / 2);
    return `M${x1} ${y1}C${x1 + k} ${y1} ${x2 - k} ${y2} ${x2} ${y2}`;
  }
  const k = Math.max(reach, Math.abs(y2 - y1) / 2);
  return `M${x1} ${y1}C${x1} ${y1 + k} ${x2} ${y2 - k} ${x2} ${y2}`;
}

/** The center of `el` in the own (unscaled) pixels of `layer`, the element the wires are drawn in. */
