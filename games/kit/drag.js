// Circuit kit: pointer dragging for a component board, shared by every game's circuit editor (games/kit/circuit).
// Framework-free; each app marks its DOM with data attributes and supplies handlers.
//
// Markup contract
//   [data-piece="id"]  an element that can be moved; [data-drag] on it (or inside it) is the handle to grab it by
//   [data-p="id"]      a port: dragging it pulls a wire, and it is a target for wires
//   [data-tray="kind"] a palette item: dragging it brings a new piece onto the board
//   [data-canvas]      where a new piece can be dropped      [data-trash]  where a dragged piece is removed
//   [data-slot="n"]    a cell of a slot board: a piece or a palette item dropped there lands in that cell
//
// While a piece moves it is translated (in its own, unscaled pixels) and never animated, so it stays under the
// pointer; the app commits the new position on drop. Touch drags start after a short hold, so a quick swipe still
// scrolls. A finished drag swallows the click that would follow it.

const HOLD = 170, SLOP = 6, EDGE = 56, DWELL = 18; // DWELL: frames in an edge strip before it scrolls
const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* no haptics */ } };

let swallowUntil = 0;
document.addEventListener('click', e => { if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); } }, true);

/** The nearest ancestor that scrolls vertically (a page or a pane), for auto-scroll while dragging. */
function scrollParent(el) {
  for (let e = el.parentElement; e; e = e.parentElement) {
    const y = getComputedStyle(e).overflowY;
    if ((y === 'auto' || y === 'scroll') && e.scrollHeight > e.clientHeight) return e;
  }
  return document.scrollingElement;
}

/** How much an element is scaled on screen (a zoomed or fitted board), so client pixels convert to its own. */
export const scaleOf = el => el.getBoundingClientRect().width / el.offsetWidth || 1;

/**
 * Enable dragging inside `root`. handlers() → { start?(g), move?(g), drop(g), end?(), scroller? } | null, read at each
 * pointerdown; `scroller` names the pane to auto-scroll when it is not an ancestor of what is dragged (a board above a
 * docked palette).
 * g = { kind: 'piece' | 'port' | 'tray', id, el, x, y, dx, dy, over }: x, y are client coordinates; dx, dy how far a
 * piece moved in its own pixels; `over` the element under the pointer that can take the drop — a cell [data-slot]
 * or [data-trash] for a piece, a cell or [data-canvas] for a tray item, a port [data-p] or a piece [data-piece] for
 * a wire. Returns a function that disables dragging again.
 */
export function enableDrag(root, handlers) {
  let g = null;

  const target = el => {
    const port = el.closest('[data-p]'), handle = el.closest('[data-drag]'), tray = el.closest('[data-tray]');
    if (port) return { kind: 'port', id: port.dataset.p, el: port };
    if (handle) { const piece = handle.closest('[data-piece]'); if (piece) return { kind: 'piece', id: piece.dataset.piece, el: piece }; }
    if (tray) return { kind: 'tray', id: tray.dataset.tray, el: tray };
    return null;
  };
  const overAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (g.kind === 'port') return el.closest('[data-p]') || el.closest('[data-piece]');
    return el.closest('[data-slot]') || el.closest(g.kind === 'piece' ? '[data-trash]' : '[data-canvas]');
  };

  function start() {
    g.on = true;
    root.classList.add('dragging', `drag-${g.kind}`);
    if (g.kind === 'piece') { g.el.classList.add('lift'); g.el.style.transition = 'none'; }
    if (g.kind === 'tray') {
      g.ghost = g.el.cloneNode(true);
      g.ghost.classList.add('ghost');
      document.body.append(g.ghost);
    }
    buzz(8);
    if (g.h.start) g.h.start(g);
    tick();
  }

  function update() {
    const over = overAt(g.x, g.y);
    if (over !== g.over) { if (g.over) g.over.classList.remove('over'); if (over) over.classList.add('over'); g.over = over; }
    g.dx = (g.x - g.x0) / g.sc;
    g.dy = (g.y - g.y0 + g.scroller.scrollTop - g.st0) / g.sc;
    if (g.kind === 'piece') g.el.style.transform = `translate(${g.dx}px, ${g.dy}px)`;
    if (g.ghost) g.ghost.style.transform = `translate(${g.x - 40}px, ${g.y - 26}px)`;
    if (g.h.move) g.h.move(g);
  }

  /**
   * Scroll while the pointer rests in the strip just inside the top or bottom edge of the scrolling pane. It has to
   * rest there a moment first: a drag from a palette docked under the pane crosses the bottom strip on its way up,
   * and must not scroll the cell it is heading for away. Outside the pane nothing scrolls.
   */
  function tick() {
    if (!g || !g.on) return;
    const r = g.scroller.getBoundingClientRect(), top = Math.max(r.top, 0), bottom = Math.min(r.bottom, innerHeight);
    const dy = g.y > top && g.y < top + EDGE ? -9 : g.y < bottom && g.y > bottom - EDGE ? 9 : 0;
    g.dwell = dy ? (g.dwell || 0) + 1 : 0;
    if (dy && g.dwell > DWELL) { g.scroller.scrollTop += dy; update(); }
    requestAnimationFrame(tick);
  }

  function finish(drop) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    clearTimeout(g.timer);
    const done = g;
    g = null;
    root.classList.remove('dragging', 'armed', `drag-${done.kind}`);
    done.el.classList.remove('lift', 'armed');
    done.el.style.transform = '';
    done.el.style.transition = '';
    if (done.ghost) done.ghost.remove();
    if (done.over) done.over.classList.remove('over');
    if (done.on) {
      swallowUntil = performance.now() + 40;
      if (drop) done.h.drop(done);
      else if (done.h.end) done.h.end();
    }
  }

  function onMove(e) {
    if (!g || e.pointerId !== g.pid) return;
    g.x = e.clientX;
    g.y = e.clientY;
    const far = Math.hypot(g.x - g.x0, g.y - g.y0) > SLOP;
    if (!g.on) {
      if (!g.armed) { if (far) finish(false); return; }
      if (!far) return;
      start();
    }
    update();
  }
  const onUp = e => { if (g && e.pointerId === g.pid) finish(true); };
  const onCancel = e => { if (g && e.pointerId === g.pid) finish(false); };

  const onDown = e => {
    const h = handlers();
    if (g || e.button > 0 || !h) return;
    const t = target(e.target);
    if (!t || !root.contains(t.el)) return;
    const touch = e.pointerType !== 'mouse', scroller = h.scroller || scrollParent(t.el);
    g = { ...t, h, scroller, sc: scaleOf(t.el), dx: 0, dy: 0, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, st0: scroller.scrollTop, armed: !touch, on: false, over: null };
    if (!touch && t.kind !== 'tray') e.preventDefault();
    if (touch) g.timer = setTimeout(() => { if (g && !g.on) { g.armed = true; root.classList.add('armed'); g.el.classList.add('armed'); buzz(6); } }, HOLD);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };
  // Once a touch drag is armed, the finger moves the part instead of the page.
  const onTouch = e => { if (g && g.armed) e.preventDefault(); };
  const onMenu = e => { if (g) e.preventDefault(); };
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('touchmove', onTouch, { passive: false });
  root.addEventListener('contextmenu', onMenu);
  return () => {
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('touchmove', onTouch);
    root.removeEventListener('contextmenu', onMenu);
  };
}
