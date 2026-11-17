// Board scenes as data: { cells, edges, texts?, paths?, robot? } in board units (ui/svg.js draws them). The worlds draw
// their tables with these, and the intro figures (../items/figures.js) are built from them.


export const N = (id, x, y, o = {}) => ({ id, x, y, w: o.w || 84, h: o.h || 64, label: o.label, value: o.value ?? '', corner: o.corner, sub: o.sub, cls: o.cls || '' });
export const E = (a, b, cls = 'idle', bend = 0, off = 0) => ({ a, b, cls, bend, off });

/* ---------- shapes the intro figures use ---------- */

export function gridScene(R, C, opt = {}) {
  const sp = opt.sp || 66, sz = opt.sz || 56, cells = [], edges = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const id = `${r},${c}`, o = (opt.cell && opt.cell(r, c)) || {};
    cells.push({ id, x: c * sp, y: r * sp, w: sz, h: sz, value: o.value ?? '', corner: o.corner, label: o.label, cls: o.cls || '' });
    if (opt.arrows !== false) {
      if (c + 1 < C) edges.push(E(id, `${r},${c + 1}`, (opt.edge && opt.edge(id, `${r},${c + 1}`)) || 'dim'));
      if (r + 1 < R) edges.push(E(id, `${r + 1},${c}`, (opt.edge && opt.edge(id, `${r + 1},${c}`)) || 'dim'));
    }
  }
  return { cells, edges };
}


/**
 * A small circuit diagram for intro pages: probes on top, components in rows, outputs at the bottom.
 * spec = { taps: [[id, label, kind?, glyph?]], parts: [[id, name, tag?, row?]], outs: [[id, label, glyph?]], wires: [[from, to, kind?]] }
 */
export function circuitFig(spec) {
  const colW = 118, rowH = 104, cells = [], partRows = Math.max(1, ...spec.parts.map(p => (p[3] || 0) + 1));
  const place = (list, y, mk) => list.forEach((it, k) => cells.push(mk(it, (k - (list.length - 1) / 2) * colW, y)));
  place(spec.taps, 0, ([id, l, kind, icon], x, y) => ({ id, x, y, w: 100, h: icon ? 72 : 40, value: l, icon, cls: `ctap${kind === 'bool' ? ' bool' : ''}` }));
  for (let r = 0; r < partRows; r++) {
    place(spec.parts.filter(p => (p[3] || 0) === r), rowH * (r + 1), ([id, name, tag], x, y) => ({ id, x, y, w: 104, h: tag ? 58 : 48, label: name, sub: tag, cls: 'cpartf' }));
  }
  place(spec.outs, rowH * (partRows + 1), ([id, l, icon], x, y) => ({ id, x, y, w: 100, h: icon ? 72 : 40, value: l, icon, cls: 'coutf' }));
  return { cells, edges: spec.wires.map(([a, b, kind]) => E(a, b, kind === 'bool' ? 'sel' : kind === 'off' ? 'dim' : 'hot')) };
}



const AROUND = [['ul', 'up', 'ur'], ['left', 'self', 'right'], ['dl', 'down', 'dr']];

/** The robot's 3×3 window: `vals` by position name, `on` lists the lit (input) cells; the center is the robot's cell. */
export function windowFig(vals = {}, on = []) {
  const cells = [];
  AROUND.forEach((row, r) => row.forEach((k, c) => cells.push({ id: k, x: c * 62, y: r * 62, w: 54, h: 54, value: vals[k] ?? '', cls: k === 'self' ? 'self' : on.includes(k) ? 'on' : 'dimc' })));
  return { cells, edges: [], robot: 'self' };
}
