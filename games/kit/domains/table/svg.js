// SVG board drawing: scenes are { cells, edges, texts?, paths?, robot? } in board units, scaled to fit.
// `robot` is the id (or ids) of the cell the robot stands on, drawn perched on its top edge; `look` picks the robot's picture.

import { fmt } from './util.js';
import { buildTree } from './algo.js';
import { ROBOTS } from './circuit/robots.js';
import { T, tr } from './i18n.js';

/** Words drawn on boards by several figures and worlds. */
export const W = {
  key: T('钥匙', 'key'), door: T('门', 'door'), start: T('起', 'S'), end: T('终', 'E'), empty: T('空', '∅'),
  upper: T('上层 · 没钥匙', 'Upper · no key'), lower: T('下层 · 有钥匙', 'Lower · has key'), capacity: T('容量', 'capacity'),
};

let svgSeq = 0;
const f1 = v => Math.round(v * 10) / 10;
const MARKED = new Set(['idle', 'dim', 'hot', 'sel', 'bad', 'good', 'ra', 'rb']);
const textW = s => [...String(s)].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 13 : 7.5), 0);

export const N = (id, x, y, o = {}) => ({ id, x, y, w: o.w || 84, h: o.h || 64, label: o.label, value: o.value ?? '', corner: o.corner, sub: o.sub, cls: o.cls || '' });
export const E = (a, b, cls = 'idle', bend = 0, off = 0) => ({ a, b, cls, bend, off });

function clipPt(c, tx, ty, gap) {
  const dx = tx - c.x, dy = ty - c.y;
  const s = Math.min(dx ? (c.w / 2 + gap) / Math.abs(dx) : Infinity, dy ? (c.h / 2 + gap) / Math.abs(dy) : Infinity);
  return [c.x + dx * s, c.y + dy * s];
}

function edgeSVG(A, B, e, twin, uid) {
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, off = twin ? 7 : e.off || 0;
  const a = { ...A, x: A.x + nx * off, y: A.y + ny * off }, b = { ...B, x: B.x + nx * off, y: B.y + ny * off };
  let d;
  if (e.bend) {
    const mx = (a.x + b.x) / 2 + nx * e.bend, my = (a.y + b.y) / 2 + ny * e.bend;
    const [sx, sy] = clipPt(a, mx, my, 2), [tx, ty] = clipPt(b, mx, my, 5);
    d = `M${f1(sx)} ${f1(sy)}Q${f1(mx)} ${f1(my)} ${f1(tx)} ${f1(ty)}`;
  } else {
    const [sx, sy] = clipPt(a, b.x, b.y, 2), [tx, ty] = clipPt(b, a.x, a.y, 5);
    d = `M${f1(sx)} ${f1(sy)}L${f1(tx)} ${f1(ty)}`;
  }
  return `<path class="edge ${e.cls}" d="${d}"${MARKED.has(e.cls) ? ` marker-end="url(#${uid}-${e.cls})"` : ''}/>`;
}

/**
 * The marks a board cell can carry, each an icon drawn small in its top-left corner, so a cell's value stays centred
 * and lines up with its neighbours'. Drawn on a 12 × 12 grid in the cell's colour (a key or door takes its key's).
 */
const MARKS = {
  start: '<path d="M3 11.5V1.5"/><path d="M3 2h6.5L8 4.5 9.5 7H3"/>',
  end: '<circle cx="6" cy="6" r="4.6"/><circle cx="6" cy="6" r="1.6" class="mk-fill"/>',
  key: '<circle cx="3.6" cy="6" r="2.4"/><path d="M6 6h5.2M9.4 6v2.2M11.2 6v1.6"/>',
  door: '<path d="M2.5 11.2V1.2h7v10"/><path d="M1 11.2h10"/><circle cx="7.6" cy="6.6" r=".7" class="mk-fill"/>',
  gold: '<path d="M1.5 4.6 3.6 1.8h4.8l2.1 2.8L6 10.6z"/><path d="M1.5 4.6h9"/>',
  trap: '<path d="M.8 10.5 2.6 4l1.8 6.5L6.2 4 8 10.5 9.8 4l1.8 6.5"/>',
  cliff: '<path d="M1 3.2h5.2v8.3"/><path d="M6.2 11.5H11"/><path d="M8.6 3v4.2M7.4 6l1.2 1.4L9.8 6"/>',
};
/** Older figures still say 起 / 终 in a cell's corner: those become the start and end marks. */
const markOf = c => c.mark || (c.corner !== undefined && c.corner !== null && c.corner !== '' ? (String(c.corner) === String(W.start) ? 'start' : String(c.corner) === String(W.end) ? 'end' : null) : null);
/** A mark as a small inline icon for HTML (the robot's view): `<svg class="mk-ico">` on the same 12 × 12 grid. */
export const markIcon = kind => (MARKS[kind] ? `<svg class="mk mk-${kind} mk-ico" viewBox="0 0 12 12" aria-hidden="true">${MARKS[kind]}</svg>` : '');
export { markOf };
export const markSVG = (kind, x, y, size = 11) => (MARKS[kind] ? `<g class="mk mk-${kind}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(size / 12)})" aria-hidden="true">${MARKS[kind]}</g>` : '');

function cellSVG(c, uid) {
  const hw = c.w / 2, hh = c.h / 2, cls = c.cls || '', rock = cls.includes('rock');
  const tap = c.tap ? ` data-cell="${c.id}" role="button" tabindex="0" aria-label="${c.aria || c.label || c.id}"` : '';
  const mark = markOf(c), corner = mark && !c.mark ? '' : c.corner;
  const valY = c.icon ? hh - 13 : c.label ? (c.sub ? 3 : 8) : 0, txt = fmt(c.value), len = [...txt].length;
  // Long numbers (7.29, 1,024) shrink to fit their cell instead of spilling over its edge.
  const fit = len > 3 && /^[-−\d.,%]+$/.test(txt) ? ` style="font-size:${f1(Math.min(21, (c.w - 8) / (len * 0.62)))}px"` : '';
  return `<g class="cell ${cls}${c.tap ? ' tap' : ''}"${tap} transform="translate(${c.x} ${c.y})">
    <rect x="${-hw}" y="${-hh}" width="${c.w}" height="${c.h}" rx="${c.rx ?? 12}"${rock ? ` style="fill:url(#${uid}-hatch)"` : c.fill ? ` style="fill:${c.fill}"` : ''}/>
    ${c.icon ? `<svg class="glyph" x="-25" y="${-hh + 5}" width="50" height="33" viewBox="0 0 48 32">${c.icon}</svg>` : ''}
    ${c.label ? `<text class="lb" y="${-hh + 17}">${c.label}</text>` : ''}
    ${corner !== undefined && corner !== null && corner !== '' ? `<text class="cn" x="${-hw + (mark ? 18 : 6)}" y="${-hh + 14}">${corner}</text>` : ''}
    ${mark ? markSVG(mark, -hw + 4, -hh + 4, Math.min(14, c.w * 0.3)) : ''}
    <text class="val" y="${valY}"${fit}>${txt}</text>
    ${c.bar !== undefined ? `<rect class="bar" x="${-hw + 5}" y="${hh - 8}" width="${f1(Math.max(0, Math.min(1, c.bar)) * (c.w - 10))}" height="3.5" rx="1.75"/>` : ''}
    ${c.sub ? `<text class="sb" y="${hh - 10}">${c.sub}</text>` : ''}
  </g>`;
}

export function sceneSVG(scene, opt = {}) {
  const uid = `b${++svgSeq}`, pad = opt.pad ?? 14, cells = scene.cells, edges = scene.edges || [];
  const by = Object.fromEntries(cells.map(c => [c.id, c]));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cells) { x0 = Math.min(x0, c.x - c.w / 2); x1 = Math.max(x1, c.x + c.w / 2); y0 = Math.min(y0, c.y - c.h / 2); y1 = Math.max(y1, c.y + c.h / 2); }
  for (const e of edges) if (e.bend) { const my = (by[e.a].y + by[e.b].y) / 2 + e.bend * 0.55; y0 = Math.min(y0, my - 4); y1 = Math.max(y1, my + 4); }
  for (const t of scene.texts || []) {
    const w = t.tick ? 13 : textW(t.t), a = t.tick ? 'start' : t.anchor || 'middle', lx = a === 'end' ? t.x - w : a === 'start' ? t.x : t.x - w / 2;
    x0 = Math.min(x0, lx); x1 = Math.max(x1, lx + w); y0 = Math.min(y0, t.y - 14); y1 = Math.max(y1, t.y + 5);
  }
  for (const p of scene.paths || []) if (p.box) { x0 = Math.min(x0, p.box[0]); y0 = Math.min(y0, p.box[1]); x1 = Math.max(x1, p.box[2]); y1 = Math.max(y1, p.box[3]); }
  const bots = [].concat(scene.robot || []).filter(id => by[id]).map(id => ({ x: by[id].x + by[id].w / 2 - 22, y: by[id].y - by[id].h / 2 - 20 }));
  bots.forEach(b => { y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + 30); });
  // A scene that can show the robot keeps room for it over every cell it could stand on (not the table's axis
  // labels), so the board does not rescale, and seem to flash, when the robot reaches the top row or right column.
  if ('robot' in scene) for (const c of cells) if (!/\baxis\b/.test(c.cls || '')) { y0 = Math.min(y0, c.y - c.h / 2 - 20); x1 = Math.max(x1, c.x + c.w / 2 + 8); }
  const pathSVG = (scene.paths || []).map(p => `<path class="edge ${p.cls}" d="${p.d}"${MARKED.has(p.cls) ? ` marker-end="url(#${uid}-${p.cls})"` : ''}/>`).join('');
  // A tick box the player sets (t.tick, t.act / t.v, ticked when t.on), drawn on a heading's line: which layers count.
  const textSVG = (scene.texts || []).map(t => (t.tick
    ? `<g class="tx-tick${t.on ? ' on' : ''}" data-act="${t.act}" data-v="${t.v}" role="checkbox" aria-checked="${!!t.on}" tabindex="0" aria-label="${t.aria || ''}"><rect class="tick-hit" x="${f1(t.x - 6)}" y="${f1(t.y - 17)}" width="25" height="25" rx="6"/><rect class="tick-box" x="${t.x}" y="${f1(t.y - 11)}" width="13" height="13" rx="3.5"/>${t.on ? `<path class="tick-mark" d="M${f1(t.x + 3)} ${f1(t.y - 4.5)}l2.6 2.6 4.6-5.4"/>` : ''}</g>`
    : `<text class="tx ${t.cls || ''}" x="${t.x}" y="${t.y}" text-anchor="${t.anchor || 'middle'}">${t.t}</text>`)).join('');
  const pairs = new Set(edges.map(e => `${e.a}>${e.b}`));
  const vw = x1 - x0 + 2 * pad, vh = y1 - y0 + 2 * pad;
  const mk = (n, col) => `<marker id="${uid}-${n}" viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0.5L10 5L0 9.5z" style="fill:${col}"/></marker>`;
  const defs = `<defs>${mk('idle', 'var(--wire)')}${mk('dim', 'var(--wire-dim)')}${mk('hot', 'var(--signal)')}${mk('sel', 'var(--cyan)')}${mk('bad', 'var(--bad)')}${mk('good', 'var(--good)')}${mk('ra', 'var(--cyan)')}${mk('rb', 'var(--signal)')}
    <pattern id="${uid}-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--chip)"/><rect width="3" height="8" style="fill:var(--wire)"/></pattern></defs>`;
  const minW = opt.minScale ? `min-width:${Math.round(vw * opt.minScale)}px;` : '';
  const maxW = opt.maxScale ? `max-width:${Math.round(vw * opt.maxScale)}px;margin:0 auto;` : '';
  return `<svg class="board-svg" viewBox="${f1(x0 - pad)} ${f1(y0 - pad)} ${f1(vw)} ${f1(vh)}" width="100%" style="${minW}${maxW}" role="img" aria-label="${opt.label || tr('示意图', 'Diagram')}">${defs}<g>${edges.map(e => edgeSVG(by[e.a], by[e.b], e, pairs.has(`${e.b}>${e.a}`), uid)).join('')}</g><g>${cells.map(c => cellSVG(c, uid)).join('')}</g>${pathSVG}${textSVG}${bots.map(b => `<svg class="robot" x="${f1(b.x)}" y="${f1(b.y)}" width="30" height="30" viewBox="0 0 32 32">${scene.look || ROBOTS.scout.look}</svg>`).join('')}</svg>`;
}

/* ---------- reusable scene shapes ---------- */

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

export function treeScene(n) {
  const t = buildTree(n), sp = 34, cells = t.nodes.map((nd, k) => ({ id: `t${k}`, x: nd.x * sp, y: nd.d * 50, w: 28, h: 28, value: nd.i, cls: `s${nd.i % 6}`, rx: 14 }));
  const edges = t.nodes.map((nd, k) => (nd.parent ? E(`t${t.nodes.indexOf(nd.parent)}`, `t${k}`, 'dim') : null)).filter(Boolean);
  return { cells, edges };
}

export const houseRow = (a, cls) => a.map((x, j) => N(`h${j}`, j * 62, 0, { w: 52, h: 60, label: T(`${j + 1}号`, `#${j + 1}`), value: x, cls: `house ${cls ? cls(j) : ''}` }));

export function layerFig(o = {}) {
  const sp = 62, sz = 54, gapY = 176, cells = [], texts = [], paths = [];
  [0, 1].forEach(L => {
    texts.push({ x: -sz / 2, y: L * gapY - sz / 2 - 14, t: L ? W.lower : W.upper, anchor: 'start', cls: 'hd' });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const key = r === 1 && c === 0, door = r === 1 && c === 2;
      cells.push({ id: `${L}:${r},${c}`, x: c * sp, y: L * gapY + r * sp, w: sz, h: sz, value: o.vals ? o.vals[L][r][c] : '', label: key ? W.key : door ? W.door : '', corner: r === 0 && c === 0 ? W.start : '', cls: [key ? 'key' : '', door ? 'door' : '', o.vals ? 'lit' : ''].filter(Boolean).join(' ') });
    }
  });
  if (o.xfer) { const xl = -sz / 2 - 24; paths.push({ d: `M${-sz / 2 - 2} ${sp} H${xl} V${gapY + sp} H${-sz / 2 - 7}`, cls: 'hot', box: [xl - 4, sp, 0, gapY + sp] }); }
  return { cells, edges: [], texts, paths };
}

export function linkFig(a, b, links, bad = []) {
  const sp = 50, sz = 42, n = Math.max(a.length, b.length), oa = (n - a.length) * sp / 2, ob = (n - b.length) * sp / 2;
  const isBad = (i, j) => bad.some(l => l[0] === i && l[1] === j);
  const la = new Map(links.map(l => [l[0], l])), lb = new Map(links.map(l => [l[1], l]));
  const cells = [
    ...[...a].map((ch, i) => ({ id: `a${i}`, x: oa + i * sp, y: 0, w: sz, h: sz, value: ch, cls: `tile${la.has(i) ? (isBad(...la.get(i)) ? ' bad' : ' ok') : ''}` })),
    ...[...b].map((ch, j) => ({ id: `b${j}`, x: ob + j * sp, y: 120, w: sz, h: sz, value: ch, cls: `tile${lb.has(j) ? (isBad(...lb.get(j)) ? ' bad' : ' ok') : ''}` })),
  ];
  return { cells, edges: links.map(([i, j]) => E(`a${i}`, `b${j}`, isBad(i, j) ? 'linkbad' : 'link')) };
}

export function tableFig(top, left, vals, o = {}) {
  const sp = 52, sz = 44, cells = [];
  for (let j = 0; j <= top.length; j++) cells.push({ id: `t${j}`, x: j * sp, y: -sp + 10, w: sz, h: 32, value: j ? top[j - 1] : W.empty, cls: j ? 'axis' : 'axis axis0' });
  for (let i = 0; i <= left.length; i++) cells.push({ id: `l${i}`, x: -sp + 8, y: i * sp, w: 32, h: sz, value: i ? left[i - 1] : W.empty, cls: i ? 'axis' : 'axis axis0' });
  for (let i = 0; i <= left.length; i++) for (let j = 0; j <= top.length; j++) {
    cells.push({ id: `${i},${j}`, x: j * sp, y: i * sp, w: sz, h: sz, value: typeof vals === 'function' ? vals(i, j) : vals[i][j], cls: o.cls ? o.cls(i, j) : 'lit' });
  }
  return { cells, edges: (o.edges || []).map(([a, b, c]) => E(a, b, c)) };
}

export function knapFig(o = {}) {
  const f = [[0, 0, 0, 0], [0, 0, 3, 3], [0, 2, 3, 5]], sp = 52, sz = 44, cells = [], texts = [];
  for (let w = 0; w <= 3; w++) cells.push({ id: `ax${w}`, x: w * sp, y: -sp + 14, w: sz, h: 26, value: w, cls: 'axis' });
  texts.push({ x: -sz / 2 - 10, y: -sp + 19, t: W.capacity, anchor: 'end' });
  [T('不放东西', 'nothing'), T('相机 2kg · 3', 'camera 2kg · 3'), T('水壶 1kg · 2', 'bottle 1kg · 2')].forEach((t, i) => texts.push({ x: -sz / 2 - 10, y: i * sp + 5, t, anchor: 'end' }));
  for (let i = 0; i < 3; i++) for (let w = 0; w <= 3; w++) {
    const show = !o.show || o.show(i, w);
    cells.push({ id: `${i},${w}`, x: w * sp, y: i * sp, w: sz, h: sz, value: show ? f[i][w] : '', cls: o.cls ? o.cls(i, w) : 'lit' });
  }
  return { cells, edges: (o.edges || []).map(([a, b, c]) => E(a, b, c)), texts };
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
