// Pointer dragging for the circuit editor: move a component to another cell, drag a new one in from the tray,
// pull a wire from one port to another. Touch drags start after a short hold, so a quick swipe still scrolls.

import { buzz } from '../util.js';

const HOLD = 170, SLOP = 6, EDGE = 56;
let swallowUntil = 0;
// A finished drag must not also count as a tap on whatever sits under the finger.
document.addEventListener('click', e => { if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); } }, true);

/**
 * h = { move(g), drop(g), end() }, where g = { kind: 'node' | 'tray' | 'port', id, x, y, over }
 * `over` is the element under the pointer: a cell [data-at], a port [data-p] or the tray [data-trash].
 */
export function enableDrag(root, scroller, h) {
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
    if (g.kind === 'port') return el.closest('[data-p]');
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
    tick();
  }

  function update() {
    const over = overAt(g.x, g.y);
    if (over !== g.over) { if (g.over) g.over.classList.remove('over'); if (over) over.classList.add('over'); g.over = over; }
    if (g.kind === 'node') g.el.style.transform = `translate(${g.x - g.x0}px, ${g.y - g.y0 + scroller.scrollTop - g.st0}px)`;
    if (g.ghost) g.ghost.style.transform = `translate(${g.x - 40}px, ${g.y - 26}px)`;
    h.move(g);
  }

  /** Scroll the level while the pointer rests near its top or bottom edge. */
  function tick() {
    if (!g || !g.on) return;
    const r = scroller.getBoundingClientRect(), dy = g.y < r.top + EDGE ? -9 : g.y > r.bottom - EDGE ? 9 : 0;
    if (dy) { scroller.scrollTop += dy; update(); }
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
      if (drop) h.drop(done);
      else h.end();
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
    if (g || e.button > 0) return;
    const t = target(e.target);
    if (!t) return;
    const touch = e.pointerType !== 'mouse';
    g = { ...t, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, st0: scroller.scrollTop, armed: !touch, on: false, over: null };
    if (touch) g.timer = setTimeout(() => { if (g && !g.on) { g.armed = true; root.classList.add('armed'); g.el.classList.add('armed'); buzz(6); } }, HOLD);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  });
  // Once a touch drag is armed, the finger moves the part instead of the page.
  root.addEventListener('touchmove', e => { if (g && g.armed) e.preventDefault(); }, { passive: false });
  root.addEventListener('contextmenu', e => { if (g) e.preventDefault(); });
}
