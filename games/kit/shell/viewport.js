/** Keyboard panning can move a visual viewport; elastic scrolling cannot move the play surface. */
export function playFrame(viewport, layoutHeight, editing) {
  const height = Math.min(layoutHeight, Math.max(1, viewport.height))
  const top = editing ? Math.max(0, Math.min(viewport.offsetTop, layoutHeight - height)) : 0
  return { height, top }
}
