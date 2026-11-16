/** At native zoom, CSS sizes the play surface and the browser pans it. */
export function playFrame(viewport, layoutHeight, editing) {
  if (viewport.scale !== 1) return null
  const height = Math.min(layoutHeight, Math.max(1, viewport.height))
  // Let keyboard panning move the surface within the layout viewport.
  const top = editing ? Math.max(0, Math.min(viewport.offsetTop, layoutHeight - height)) : 0
  return { height, top }
}

/** Controls which can bring up the native keyboard. */
export const isTextField = (element) => Boolean(element?.matches(
  'input:is(:not([type]), [type="text"], [type="search"], [type="email"], [type="url"], [type="tel"], [type="password"], [type="number"]):not([readonly]), textarea:not([readonly]), [contenteditable]:not([contenteditable="false"])',
))
