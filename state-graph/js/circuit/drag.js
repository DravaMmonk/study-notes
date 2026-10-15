// Pointer dragging for the circuit editor: move a component to another cell, drag a new one in from the parts list,
// pull a wire from one port to another. Touch drags start after a short hold, so a quick swipe still scrolls.
// The shell enables it once on the level screen; the open level supplies the handlers (or none).

import { buzz } from '../util.js';

const HOLD = 170, SLOP = 6, EDGE = 56;
let swallowUntil = 0;
// A finished drag must not also count as a tap on whatever sits under the finger.
document.addEventListener('click', e => { if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); } }, true);

/** The nearest ancestor that scrolls vertically: the phone page or a workbench column. */
function scrollParent(el) {
  for (let e = el.parentElement; e; e = e.parentElement) {
    const y = getComputedStyle(e).overflowY;
    if ((y === 'auto' || y === 'scroll') && e.scrollHeight > e.clientHeight) return e;
  }
  return document.scrollingElement;
}

/**
 * handlers() → { start(g), move(g), drop(g), end() } | null, where g = { kind: 'node' | 'tray' | 'port', id, x, y, over }.
 * `over` is the element under the pointer: a cell [data-at], the parts list [data-trash], or for a wire a port [data-p]
 * or a component card [data-drag] (the level picks the card's free input).
 */
export function enableDrag(root, handlers) {
  let g = null;

  const target = el => {
    const port = el.closest('[data-p]'), node = el.closest('[data-drag]'), tray = el.closest('[data-tray]');
    if (port) return { kind: 'port', id: port.dataset.p, el: port };
    if (node) return { kind: 'node', id: node.dataset.drag, el: node };
    if (tray) return { kind: 'tray', id: tray.dataset.tray, el: tray };
    return null;
  };
  const overAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (g.kind === 'port') return el.closest('[data-p]') || el.closest('[data-drag]');
    return el.closest('[data-at]') || (g.kind === 'node' ? el.closest('[data-trash]') : null);
  };

  function start() {
    g.on = true;
    root.classList.add('dragging', `drag-${g.kind}`);
    if (g.kind === 'node') g.el.classList.add('lift');
    if (g.kind === 'tray') {
      g.ghost = g.el.cloneNode(true);
      g.ghost.classList.add('ghost');
      document.body.append(g.ghost);
    }
    buzz(8);
    g.h.start(g);
    tick();
  }

  function update() {
    const over = overAt(g.x, g.y);
    if (over !== g.over) { if (g.over) g.over.classList.remove('over'); if (over) over.classList.add('over'); g.over = over; }
    if (g.kind === 'node') g.el.style.transform = `translate(${g.x - g.x0}px, ${g.y - g.y0 + g.scroller.scrollTop - g.st0}px)`;
    if (g.ghost) g.ghost.style.transform = `translate(${g.x - 40}px, ${g.y - 26}px)`;
    g.h.move(g);
  }

  /** Scroll while the pointer rests near the top or bottom edge of the scrolling pane. */
  function tick() {
    if (!g || !g.on) return;
    const r = g.scroller.getBoundingClientRect(), top = Math.max(r.top, 0), bottom = Math.min(r.bottom, innerHeight);
    const dy = g.y < top + EDGE ? -9 : g.y > bottom - EDGE ? 9 : 0;
    if (dy) { g.scroller.scrollTop += dy; update(); }
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
    if (done.ghost) done.ghost.remove();
    if (done.over) done.over.classList.remove('over');
    if (done.on) {
      swallowUntil = performance.now() + 40;
      if (drop) done.h.drop(done);
      else done.h.end();
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

  root.addEventListener('pointerdown', e => {
    const h = handlers();
    if (g || e.button > 0 || !h) return;
    const t = target(e.target);
    if (!t) return;
    const touch = e.pointerType !== 'mouse', scroller = scrollParent(t.el);
    g = { ...t, h, scroller, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, st0: scroller.scrollTop, armed: !touch, on: false, over: null };
    if (touch) g.timer = setTimeout(() => { if (g && !g.on) { g.armed = true; root.classList.add('armed'); g.el.classList.add('armed'); buzz(6); } }, HOLD);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  });
  // Once a touch drag is armed, the finger moves the part instead of the page.
  root.addEventListener('touchmove', e => { if (g && g.armed) e.preventDefault(); }, { passive: false });
  root.addEventListener('contextmenu', e => { if (g) e.preventDefault(); });
}
