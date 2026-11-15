/** Follow one pointer outside its starting element. Finish once, including when the gesture is cancelled. */
export function trackPointer(pointerId, { move, finish, escape = false }) {
  const target = window
  let active = true
  const end = (commit, event) => {
    if (!active) return
    active = false
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onCancel)
    target.removeEventListener('blur', cancel)
    if (escape) target.removeEventListener('keydown', onKey)
    finish(commit, event)
  }
  const cancel = () => end(false)
  const onMove = (event) => { if (event.pointerId === pointerId) move(event) }
  const onUp = (event) => { if (event.pointerId === pointerId) end(true, event) }
  const onCancel = (event) => { if (event.pointerId === pointerId) cancel() }
  const onKey = (event) => { if (event.key === 'Escape') cancel() }

  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onCancel)
  target.addEventListener('blur', cancel)
  if (escape) target.addEventListener('keydown', onKey)
  return cancel
}
