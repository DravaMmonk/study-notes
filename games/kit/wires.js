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
export function centerIn(layer, el) {
  const box = layer.getBoundingClientRect(), r = el.getBoundingClientRect(), s = box.width / layer.offsetWidth || 1;
  return [(r.left + r.width / 2 - box.left) / s, (r.top + r.height / 2 - box.top) / s];
}

/** A client point in the own pixels of `layer`. */
export function pointIn(layer, x, y) {
  const box = layer.getBoundingClientRect(), s = box.width / layer.offsetWidth || 1;
  return [(x - box.left) / s, (y - box.top) / s];
}
