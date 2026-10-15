// Pointer dragging for the phone board: a part from the tray into a slot, a placed part to another
// slot (or back onto the tray to remove it), and a wire from one port to another. A part waits for a
// short hold before it lifts, so a quick swipe still scrolls; a port drags at once (it never scrolls).
// A press that never became a drag is left alone, so it still counts as a tap.

const HOLD = 180
const SLOP = 7
const EDGE = 56

let swallowUntil = 0
if (typeof document !== 'undefined') {
  // A finished drag must not also count as a tap on whatever sits under the finger.
  document.addEventListener('click', (event) => {
    if (performance.now() < swallowUntil) {
      event.stopPropagation()
      event.preventDefault()
    }
  }, true)
}

// h = { start(g), move(g), drop(g), end() }; g = { kind: 'tray' | 'node' | 'port', id, x, y, over, el }.
// `over` is the element under the pointer that the drag could land on: a slot, a port or the tray.
export function enableDrag(root, scroller, h) {
  let g = null

  const sourceOf = (el) => {
    const port = el.closest('[data-port]')
    if (port) return { kind: 'port', id: port.dataset.port, el: port }
    const node = el.closest('[data-drag]')
    if (node) return { kind: 'node', id: node.dataset.drag, el: node }
    const tray = el.closest('[data-tray]')
    if (tray) return { kind: 'tray', id: tray.dataset.tray, el: tray }
    return null
  }
  const overAt = (x, y) => {
    const el = document.elementFromPoint(x, y)
    if (!el) return null
    if (g.kind === 'port') return el.closest('[data-port]')
    return el.closest('[data-slot]') || (g.kind === 'node' ? el.closest('[data-trash]') : null)
  }

  const lift = () => {
    g.on = true
    navigator.vibrate?.(6)
    root.classList.add('is-dragging', `drag-${g.kind}`)
    if (g.kind !== 'port') {
      g.ghost = g.el.cloneNode(true)
      g.ghost.classList.add('pb-ghost')
      const box = g.el.getBoundingClientRect()
      g.dx = g.x - box.left
      g.dy = g.y - box.top
      g.ghost.style.width = `${box.width}px`
      document.body.append(g.ghost)
      g.el.classList.add('is-lifted')
    }
    h.start?.(g)
    follow()
  }
  const follow = () => {
    if (g.ghost) g.ghost.style.transform = `translate(${g.x - g.dx}px, ${g.y - g.dy}px) scale(1.04)`
    const over = overAt(g.x, g.y)
    if (over !== g.over) {
      g.over?.classList.remove('is-over')
      g.over = over
      over?.classList.add('is-over')
    }
    h.move?.(g)
  }
  // Scroll the board while the finger rests near its top or bottom edge.
  const edgeScroll = () => {
    if (!g?.on) return
    const box = scroller.getBoundingClientRect()
    // Only inside the board's own edge strips: a finger still over the tray must not scroll it.
    const step = g.y > box.top && g.y < box.top + EDGE ? -10 : g.y < box.bottom && g.y > box.bottom - EDGE ? 10 : 0
    if (step) {
      scroller.scrollTop += step
      follow()
    }
    g.raf = requestAnimationFrame(edgeScroll)
  }

  const onDown = (event) => {
    if (event.button > 0 || g) return
    const source = sourceOf(event.target)
    if (!source) return
    g = { ...source, x: event.clientX, y: event.clientY, x0: event.clientX, y0: event.clientY, on: false, pointer: event.pointerId, touch: event.pointerType !== 'mouse' }
    if (source.kind !== 'port' && g.touch) g.timer = setTimeout(() => g && !g.on && lift(), HOLD)
  }
  const onMove = (event) => {
    if (!g || event.pointerId !== g.pointer) return
    g.x = event.clientX
    g.y = event.clientY
    const moved = Math.hypot(g.x - g.x0, g.y - g.y0) > SLOP
    if (!g.on) {
      if (!moved) return
      // On touch, a part that moves before the hold is a scroll, not a drag.
      if (g.kind !== 'port' && g.touch) return cancel()
      lift()
      g.raf = requestAnimationFrame(edgeScroll)
      return
    }
    event.preventDefault()
    follow()
  }
  const finish = (drop) => {
    if (!g) return
    clearTimeout(g.timer)
    cancelAnimationFrame(g.raf)
    if (g.on) {
      swallowUntil = performance.now() + 350
      if (drop) h.drop(g)
      g.over?.classList.remove('is-over')
      g.ghost?.remove()
      g.el.classList.remove('is-lifted')
      root.classList.remove('is-dragging', `drag-${g.kind}`)
      h.end?.()
    }
    g = null
  }
  const cancel = () => finish(false)
  const onUp = (event) => g && event.pointerId === g.pointer && finish(true)
  const onTouchMove = (event) => g?.on && event.cancelable && event.preventDefault()

  root.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove, { passive: false })
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', cancel)
  // Once a drag has lifted, the page must not scroll under it.
  root.addEventListener('touchmove', onTouchMove, { passive: false })
  const onMenu = (event) => g && event.preventDefault()
  root.addEventListener('contextmenu', onMenu)
  return () => {
    finish(false)
    root.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', cancel)
    root.removeEventListener('touchmove', onTouchMove)
    root.removeEventListener('contextmenu', onMenu)
  }
}
