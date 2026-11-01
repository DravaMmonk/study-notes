// SVG board drawing: scenes (../model/scene.js) are { cells, edges, texts?, paths?, robot? } in board units, scaled to
// fit. `robot` is the id (or ids) of the cell the robot stands on, drawn perched on its top edge; `look` picks the
// robot's picture. A cell the player can tap (`tap`) carries its id as data-cell (Scene.jsx hands the tap on).

import { fmt } from '../model/format.js';
import { W } from '../model/scene.js';
import { ROBOTS } from '../model/robots.js';
import { tr } from '../lang.js';

let svgSeq = 0;
const f1 = v => Math.round(v * 10) / 10;
const MARKED = new Set(['idle', 'dim', 'hot', 'sel', 'bad', 'good', 'ra', 'rb']);
const textW = s => [...String(s)].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 13 : 7.5), 0);

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
export const MARKS = {
  start: '<path d="M3 11.5V1.5"/><path d="M3 2h6.5L8 4.5 9.5 7H3"/>',
  end: '<circle cx="6" cy="6" r="4.6"/><circle cx="6" cy="6" r="1.6" class="mk-fill"/>',
  key: '<circle cx="3.6" cy="6" r="2.4"/><path d="M6 6h5.2M9.4 6v2.2M11.2 6v1.6"/>',
  door: '<path d="M2.5 11.2V1.2h7v10"/><path d="M1 11.2h10"/><circle cx="7.6" cy="6.6" r=".7" class="mk-fill"/>',
  gold: '<path d="M1.5 4.6 3.6 1.8h4.8l2.1 2.8L6 10.6z"/><path d="M1.5 4.6h9"/>',
  trap: '<path d="M.8 10.5 2.6 4l1.8 6.5L6.2 4 8 10.5 9.8 4l1.8 6.5"/>',
  cliff: '<path d="M1 3.2h5.2v8.3"/><path d="M6.2 11.5H11"/><path d="M8.6 3v4.2M7.4 6l1.2 1.4L9.8 6"/>',
};
/** Older figures still say 起 / 终 in a cell's corner: those become the start and end marks. */
export const markOf = c => c.mark || (c.corner !== undefined && c.corner !== null && c.corner !== '' ? (String(c.corner) === String(W.start) ? 'start' : String(c.corner) === String(W.end) ? 'end' : null) : null);
const markSVG = (kind, x, y, size = 11) => (MARKS[kind] ? `<g class="mk mk-${kind}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(size / 12)})" aria-hidden="true">${MARKS[kind]}</g>` : '');

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

/** A scene as SVG markup, its own ids new each time. opt: { pad, minScale, maxScale, label }. */
export function sceneSVG(scene, opt = {}) {
  const uid = `b${++svgSeq}`, pad = opt.pad ?? 14, cells = scene.cells, edges = scene.edges || [];
  const by = Object.fromEntries(cells.map(c => [c.id, c]));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cells) { x0 = Math.min(x0, c.x - c.w / 2); x1 = Math.max(x1, c.x + c.w / 2); y0 = Math.min(y0, c.y - c.h / 2); y1 = Math.max(y1, c.y + c.h / 2); }
  for (const e of edges) if (e.bend) { const my = (by[e.a].y + by[e.b].y) / 2 + e.bend * 0.55; y0 = Math.min(y0, my - 4); y1 = Math.max(y1, my + 4); }
  for (const t of scene.texts || []) {
    const w = textW(t.t), a = t.anchor || 'middle', lx = a === 'end' ? t.x - w : a === 'start' ? t.x : t.x - w / 2;
    x0 = Math.min(x0, lx); x1 = Math.max(x1, lx + w); y0 = Math.min(y0, t.y - 14); y1 = Math.max(y1, t.y + 5);
  }
  for (const p of scene.paths || []) if (p.box) { x0 = Math.min(x0, p.box[0]); y0 = Math.min(y0, p.box[1]); x1 = Math.max(x1, p.box[2]); y1 = Math.max(y1, p.box[3]); }
  const bots = [].concat(scene.robot || []).filter(id => by[id]).map(id => ({ x: by[id].x + by[id].w / 2 - 22, y: by[id].y - by[id].h / 2 - 20 }));
  bots.forEach(b => { y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + 30); });
  // A scene that can show the robot keeps room for it over every cell it could stand on (not the table's axis
  // labels), so the board does not rescale, and seem to flash, when the robot reaches the top row or right column.
  if ('robot' in scene) for (const c of cells) if (!/\baxis\b/.test(c.cls || '')) { y0 = Math.min(y0, c.y - c.h / 2 - 20); x1 = Math.max(x1, c.x + c.w / 2 + 8); }
  const pathSVG = (scene.paths || []).map(p => `<path class="edge ${p.cls}" d="${p.d}"${MARKED.has(p.cls) ? ` marker-end="url(#${uid}-${p.cls})"` : ''}/>`).join('');
  const textSVG = (scene.texts || []).map(t => `<text class="tx ${t.cls || ''}" x="${t.x}" y="${t.y}" text-anchor="${t.anchor || 'middle'}">${t.t}</text>`).join('');
  const pairs = new Set(edges.map(e => `${e.a}>${e.b}`));
  const vw = x1 - x0 + 2 * pad, vh = y1 - y0 + 2 * pad;
  const mk = (n, col) => `<marker id="${uid}-${n}" viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0.5L10 5L0 9.5z" style="fill:${col}"/></marker>`;
  const defs = `<defs>${mk('idle', 'var(--wire)')}${mk('dim', 'var(--wire-dim)')}${mk('hot', 'var(--signal)')}${mk('sel', 'var(--cyan)')}${mk('bad', 'var(--bad)')}${mk('good', 'var(--good)')}${mk('ra', 'var(--cyan)')}${mk('rb', 'var(--signal)')}
    <pattern id="${uid}-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--chip)"/><rect width="3" height="8" style="fill:var(--wire)"/></pattern></defs>`;
  const minW = opt.minScale ? `min-width:${Math.round(vw * opt.minScale)}px;` : '';
  const maxW = opt.maxScale ? `max-width:${Math.round(vw * opt.maxScale)}px;margin:0 auto;` : '';
  return `<svg class="board-svg" viewBox="${f1(x0 - pad)} ${f1(y0 - pad)} ${f1(vw)} ${f1(vh)}" width="100%" style="${minW}${maxW}" role="img" aria-label="${opt.label || tr('示意图', 'Diagram')}">${defs}<g>${edges.map(e => edgeSVG(by[e.a], by[e.b], e, pairs.has(`${e.b}>${e.a}`), uid)).join('')}</g><g>${cells.map(c => cellSVG(c, uid)).join('')}</g>${pathSVG}${textSVG}${bots.map(b => `<svg class="robot" x="${f1(b.x)}" y="${f1(b.y)}" width="30" height="30" viewBox="0 0 32 32">${scene.look || ROBOTS.scout.look}</svg>`).join('')}</svg>`;
}
