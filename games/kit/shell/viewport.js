/** At native zoom, CSS sizes the play surface and the browser pans it. */
export function playFrame(viewport, layoutHeight, editing) {
  if (viewport.scale !== 1) return null
  const height = Math.min(layoutHeight, Math.max(1, viewport.height))
  // Let keyboard panning move the surface within the layout viewport.
  const top = editing ? Math.max(0, Math.min(viewport.offsetTop, layoutHeight - height)) : 0
  return { height, top }
}
