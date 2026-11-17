// Viewport and board coordinates for pointer interaction.
export function centerIn(layer, el) {
  const box = layer.getBoundingClientRect(), r = el.getBoundingClientRect(), s = box.width / layer.offsetWidth || 1;
  return [(r.left + r.width / 2 - box.left) / s, (r.top + r.height / 2 - box.top) / s];
}

/** A client point in the own pixels of `layer`. */
export function pointIn(layer, x, y) {
  const box = layer.getBoundingClientRect(), s = box.width / layer.offsetWidth || 1;
  return [(x - box.left) / s, (y - box.top) / s];
}
