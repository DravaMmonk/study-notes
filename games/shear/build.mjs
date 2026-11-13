// The Linear Grid's illustration (the games hub's card and the level map's hero): a shear rack drawn in 3D with the
// anatomy skill's kit. The rows of the grid are bars on ledges, one above another, on a turntable; a fence hinged at
// the bottom row leans and pushes every bar along by its height times k = tan θ, so the bars' marks lean over as ĵ
// does under [[1, k], [0, 1]] while the bottom row, the x-axis, stays put; then the turntable turns the sheared grid
// round as one. The motion is model.js, shared with the page.
//
//   node games/shear/build.mjs                       writes shear.js (the hub's module) next to this file
//   node games/shear/build.mjs --page=x.html [--light]  also writes a standalone page for captures and line checks
//   node games/shear/build.mjs --audit [--quick] [--only=a,b]  runs the kit audit and the 3D orbit audit
//
// The kit is read from the anatomy skill (ANATOMY_KIT, default ~/.agents/skills/anatomy/kit); only shear.js ships.

import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { KMAX, PERIOD, PITCH, ROWS, pose, tourAt } from './model.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = process.env.ANATOMY_KIT ?? join(homedir(), '.agents/skills/anatomy/kit');
const load = (file) => import(pathToFileURL(join(KIT, file)).href);
const k = await load('iso-kit.mjs');
const G = await load('lathe.mjs');
const A = await load('audit.mjs');
const { turning } = await load('turn-build.mjs');
const TA = await load('turn-audit.mjs');
const argv = process.argv.slice(2);

const WIDTH = 600;
const HEIGHT = 300;
const AZIMUTH = 70;

// The rack runs along x and faces +y, toward the viewer at +x +y; rows are counted up from the bottom.
const BASE = { x: -64, y: -64, w: 128, d: 128, r: 12 };
const BASE_Z = -8;
const FOOT_Z = -13;
const RING_R = 40;
const RING_H = 2;
const TABLE_R = 54;
const DECK = RING_H + 4;
const PLINTH = { x: -46, y: -9, w: 96, d: 18, r: 2 };
const PLINTH_H = 3;
const BACK = { x0: -42, x1: 48, y0: -6.4, y1: -3, z1: 0 };
const LEDGE = { h: 1.2, y1: 1.4 };
const BAR = { x0: -30, x1: 30, y0: -2.6, y1: 1.4, h: 7 };
const CELL = 10;
const ROW_Z = (i) => DECK + PLINTH_H + LEDGE.h + i * PITCH;
const PIVOT_Z = ROW_Z(0) + BAR.h / 2;
const FENCE = { x0: BAR.x0 - 1.6 - 3, x1: BAR.x0 - 1.6, z0: PIVOT_Z - 3.4, z1: ROW_Z(ROWS - 1) + BAR.h + 2 };
const HINGE_X = (FENCE.x0 + FENCE.x1) / 2;
// The ledges start right of where the leaning fence can reach, so it never meets them.
const LEDGE_X0 = Math.ceil(HINGE_X + (FENCE.z1 - PIVOT_Z) * KMAX + 3);
const SCALE = { r1: FENCE.z1 - PIVOT_Z + 2.8, span: 20 };
BACK.z1 = PIVOT_Z + SCALE.r1 + 2;
const GRIP_TOP = FENCE.z1 + 7;

const tall = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 2 * Math.PI; return [48 * Math.cos(a), 48 * Math.sin(a), BACK.z1]; });
export const P = k.fitProjection([...k.boxCorners(BASE, FOOT_Z, 0), ...tall], WIDTH, HEIGHT, { pad: 10, azimuth: AZIMUTH, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screws = (points, z, ring = 1.8) => L(points.map(([x, y]) => k.ring(x, y, ring, z, P, 16)).join(''), { tone: 'lo' }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.5 });
const deg = (a) => (a * Math.PI) / 180;
const path = (points) => points.map(([x, y], j) => `${j ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join('');
// A box between two corners as a prism along y (its polygon in x, z), so its front face can carry a plane.
const FRONT = (y) => ({ o: [0, y, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] });
const rect = (x0, x1, z0, z1, r = 0) => {
  if (!r) return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const out = [];
  for (const [cx, cz, a0] of [[x1 - r, z0 + r, -90], [x1 - r, z1 - r, 0], [x0 + r, z1 - r, 90], [x0 + r, z0 + r, 180]])
    for (let j = 0; j <= 3; j++) { const a = deg(a0 + 30 * j); out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); }
  return out;
};

export const R = A.recorder(P);
const put = (item) => R.put({ layer: 'back', ...item, shapes: item.shapes.map((shape, i) => R.solid(Object.assign(shape, { name: shape.name ?? (i ? `${item.name}#${i + 1}` : item.name) }))) });

function base() {
  for (const [x, y] of byDepth(k.corners(BASE, 16))) {
    const svg = S(k.cylinder(x, y, 6.4, FOOT_Z, 1.4, P, 24), { tone: 'lo' }) + S(k.cylinder(x, y, 4.8, FOOT_Z + 1.4, BASE_Z - FOOT_Z - 1.4, P, 24), { tone: 'mid' });
    put({ name: `stand.foot.${x}.${y}`, at: [x, y, FOOT_Z], svg, shapes: [A.cylinder(x, y, 6.4, FOOT_Z, 1.4, { ground: true }), A.cylinder(x, y, 4.8, FOOT_Z + 1.4, BASE_Z - FOOT_Z - 1.4)] });
  }
  const seam = L(k.sideSeam(BASE, BASE_Z + 3, P, 10), { tone: 'faint' });
  put({ name: 'stand.base', at: [0, 0, BASE_Z], bias: 4, svg: S(k.slabOf(BASE, BASE_Z, -BASE_Z, P, 10, 1.2), { tone: 'lo', inner: seam }) + L(k.planOutline(k.insetPlan(BASE, 4), 0, P, 8), { tone: 'faint' }) + screws(k.corners(BASE, 9), 0), shapes: [A.slab(BASE, BASE_Z, -BASE_Z, { ground: true })] });

  // The bearing ring the turntable rides on.
  put({ name: 'stand.ring', at: [0, 0, 0], bias: 2, svg: S(k.cylinder(0, 0, RING_R, 0, RING_H, P, 96, 0.4), { tone: 'mid', inner: L(k.sideArc(0, 0, RING_R, 0.8, P, 64), { tone: 'faint' }) }), shapes: [A.cylinder(0, 0, RING_R, 0, RING_H)] });

  // The index the turntable's degree ticks are read against, at the front, pointing in at the rim.
  const [c, s] = [Math.cos(deg(AZIMUTH)), Math.sin(deg(AZIMUTH))];
  const ring = [[TABLE_R + 0.6, 0], [TABLE_R + 4.4, -2.2], [TABLE_R + 7.6, -2.2], [TABLE_R + 7.6, 2.2], [TABLE_R + 4.4, 2.2]].map(([r, w]) => [r * c - w * s, r * s + w * c]);
  put({ name: 'stand.index', at: [(TABLE_R + 4) * c, (TABLE_R + 4) * s, 0], svg: S(k.extrude(ring, 0, 1, P, { bevel: 0.25 }), { tone: 'hi', crease: 'lo', lit: true }) + D([at([(TABLE_R + 6) * c, (TABLE_R + 6) * s, 1])], { size: 0.45 }), shapes: [A.extruded(ring, 0, 1)] });

  // A ruler strip along the right front edge and a maker's plate along the left one.
  const strip = { x: 56.5, y: -36, w: 4, d: 72, r: 1 };
  const t = k.topTicks(-32, 32, 4, 5, strip.x + 0.6, 0.6, [1.4, 2.6], P, 'y');
  put({ name: 'stand.ruler', at: [58.5, 0, 0], svg: S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'mid', crease: 'none' }) + L(t.minor, { tone: 'lo' }) + L(t.major, { tone: 'mid' }), shapes: [A.slab(strip, 0, 0.6)] });
  const plate = { x: -46, y: 52, w: 22, d: 8, r: 1.2 };
  const rules = [[-43, 54.2, -29], [-43, 56, -27], [-43, 57.8, -33]].map(([x0, y, x1]) => k.lineOnTop([x0, y], [x1, y], 0.8, P)).join('');
  put({ name: 'stand.label', at: [-35, 56, 0], svg: S(k.slabOf(plate, 0, 0.8, P, 3, 0.3), { tone: 'mid' }) + L(k.planOutline(k.insetPlan(plate, 1.2), 0.8, P, 3), { tone: 'faint' }) + L(rules, { tone: 'lo', free: true }) + D([[-26.4, 54], [-26.4, 58]].map(([x, y]) => at([x, y, 0.8])), { size: 0.45 }), shapes: [A.slab(plate, 0, 0.8)] });
}

export const T = turning(P, { recorder: R });
const live = T.layer('table');
T.stack(['back', 'table']);
const table = T.group('table', { turn: { pivot: [0, 0] } });

// The turntable: a knurled disc with degree ticks round its top.
function turntable() {
  const disc = T.round({ name: 'table.disc', group: table, layer: live, F: VERT(0, 0), s0: RING_H, s1: DECK, r: TABLE_R, tone: 'mid', crease: 'lo', details: { ribs: { s0: RING_H + 0.6, s1: DECK - 0.6, count: 220, fade: [0.08, 0.5], seams: true, tone: 'lo' } } });
  const rim = TABLE_R - 1.4;
  const minor = [];
  const major = [];
  for (let i = 0; i < 72; i++) {
    const a = deg(i * 5);
    const r = rim - (i % 6 ? 1.6 : 3.2);
    (i % 6 ? minor : major).push(path([[rim * Math.cos(a), rim * Math.sin(a)], [r * Math.cos(a), r * Math.sin(a)]]));
  }
  const ring = (r) => path(Array.from({ length: 181 }, (_, j) => [r * Math.cos(deg(2 * j)), r * Math.sin(deg(2 * j))]));
  T.plane({ part: disc, o: [0, 0, DECK], u: [1, 0, 0], v: [0, 1, 0], svg: `<path class="iso-line" data-tone="lo" d="${ring(rim)}"/><path class="iso-line" data-tone="lo" d="${minor.join('')}"/><path class="iso-line" data-tone="mid" d="${major.join('')}"/><path class="iso-line" data-tone="faint" d="${ring(rim - 6)}"/>` });
}

// The rack: a plinth, a back plate with two stiffeners behind it and a ledge for each row; the fence's scale is
// engraved on the back plate above the rows, an arc about the hinge from upright leaning toward +x.
function rack() {
  T.prism({ name: 'rack.plinth', group: table, layer: live, plan: PLINTH, z: DECK, h: PLINTH_H, steps: 3, bevel: 0.5, tone: 'mid', crease: 'lo', details: { seams: [DECK + 1.2], dots: [[-43, -6], [47, -6], [-43, 6], [47, 6]].map(([x, y]) => ({ at: [DECK + PLINTH_H, x, y], normal: [0, 0, 1], size: 0.45 })) } });
  const z0 = DECK + PLINTH_H;
  const screwsAt = [BACK.x0 + 2.2, (BACK.x0 + BACK.x1) / 2, BACK.x1 - 2.2].flatMap((x) => [[x, z0 + 2.2], [x, BACK.z1 - 2.2]]);
  const back = T.prism({ name: 'rack.back', group: table, layer: live, plan: { x: BACK.x0, y: BACK.y0, w: BACK.x1 - BACK.x0, d: BACK.y1 - BACK.y0, r: 0.8 }, z: z0, h: BACK.z1 - z0, steps: 3, bevel: 0.4, tone: 'mid', crease: 'lo',
    details: { dots: screwsAt.flatMap(([x, z]) => [{ at: [z, x, BACK.y1], normal: [0, 1, 0], size: 0.45 }, { at: [z, x, BACK.y0], normal: [0, -1, 0], size: 0.45 }]) } });
  for (const x of [-14, 22]) T.prism({ name: `rack.rib.${x}`, group: table, layer: live, plan: { x: x - 1.6, y: BACK.y0 - 2.4, w: 3.2, d: 2.4, r: 0.6 }, z: z0, h: BACK.z1 - 4 - z0, steps: 2, bevel: 0.3, tone: 'mid', crease: 'lo' });
  const arc = [];
  const minor = [];
  const major = [];
  const p = (r, d) => [HINGE_X + r * Math.sin(deg(d)), PIVOT_Z + r * Math.cos(deg(d))];
  for (let j = 0; j <= 40; j++) arc.push(p(SCALE.r1, (SCALE.span * j) / 40));
  for (let d = 0; d <= SCALE.span; d += 2) (d % 10 ? minor : major).push(path([p(SCALE.r1, d), p(SCALE.r1 - (d % 10 ? 1.1 : 2.2), d)]));
  const groove = rect(BACK.x0 + 4, BACK.x1 - 4, z0 + 4, BACK.z1 - 4, 1);
  T.plane({ part: back, o: [0, BACK.y1, 0], u: [1, 0, 0], v: [0, 0, 1], normal: [0, 1, 0], svg: `<path class="iso-line" data-tone="faint" d="${path(groove)}Z"/><path class="iso-line" data-tone="lo" d="${path(arc)}"/><path class="iso-line" data-tone="lo" d="${minor.join('')}"/><path class="iso-line" data-tone="mid" d="${major.join('')}"/>` });
  for (let i = 0; i < ROWS; i++) {
    const z = ROW_Z(i);
    T.prism({ name: `rack.ledge.${i}`, group: table, layer: live, plan: { x: LEDGE_X0, y: BACK.y1, w: BACK.x1 - LEDGE_X0, d: LEDGE.y1 - BACK.y1, r: 0.4 }, z: z - LEDGE.h, h: LEDGE.h, steps: 2, tone: 'lo', crease: 'faint' });
  }
}

// A bar: one row of the grid, its front engraved with the cells; the mark at x = 0 is where ĵ's line crosses the row,
// and the bottom row carries the x-axis.
function bar(i) {
  const group = i ? T.group(`row.${i}`, { parent: table, slide: { direction: [1, 0, 0], travel: i * PITCH * KMAX } }) : table;
  const z = ROW_Z(i);
  const part = T.prism({ name: `bar.${i}`, group, layer: live, plan: { x: BAR.x0, y: BAR.y0, w: BAR.x1 - BAR.x0, d: BAR.y1 - BAR.y0, r: 0.8 }, z, h: BAR.h, steps: 3, bevel: 0.4, tone: 'hi', crease: 'lo' });
  const cuts = [];
  for (let x = BAR.x0 + CELL; x < BAR.x1; x += CELL) if (x) cuts.push(path([[x, z + 0.5], [x, z + BAR.h - 0.5]]));
  const axis = i ? '' : `<path class="iso-line sh-i" d="${path([[BAR.x0 + 0.8, z + BAR.h / 2], [BAR.x1 - 0.8, z + BAR.h / 2]])}"/>`;
  T.plane({ part, o: [0, BAR.y1, 0], u: [1, 0, 0], v: [0, 0, 1], normal: [0, 1, 0], svg: `<path class="iso-line" data-tone="lo" d="${path([[BAR.x0 + 0.5, z + 0.5], [BAR.x1 - 0.5, z + 0.5]])}${cuts.join('')}${path([[BAR.x0 + 0.5, z + BAR.h - 0.5], [BAR.x1 - 0.5, z + BAR.h - 0.5]])}"/>${axis}<path class="iso-line sh-j" d="${path([[0, z + 0.5], [0, z + BAR.h - 0.5]])}"/>` });
  const F = G.frameOf([BAR.x1, (BAR.y0 + BAR.y1) / 2, z + BAR.h / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  T.round({ name: `bar.${i}.pull`, group, layer: live, F, s0: 0, s1: 2.4, r: 1.2, ends: ['flat', 'dome'], tone: 'mid', crease: 'lo' });
}

// The fence: a post at the bars' left ends, hinged to the back plate at the bottom row's height, with a grip on top.
function fence() {
  const group = T.group('fence', { parent: table, hinge: { point: [HINGE_X, 0, PIVOT_Z], axis: [0, 1, 0], range: [0, (Math.atan(KMAX) * 180) / Math.PI] } });
  T.round({ name: 'fence.knuckle', group, layer: live, F: G.frameOf([HINGE_X, BACK.y1, PIVOT_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), s0: 0, s1: BAR.y0 - BACK.y1, r: 1.5, tone: 'mid', crease: 'lo' });
  T.prism({ name: 'fence.post', group, layer: live, F: FRONT(BAR.y0), polygon: rect(FENCE.x0, FENCE.x1, FENCE.z0, FENCE.z1, 0.8), s0: 0, s1: BAR.y1 - BAR.y0, bevel: 0.4, tone: 'hi', crease: 'lo',
    details: { dots: [FENCE.z1 - 2].map((z) => ({ at: [BAR.y1 - BAR.y0, HINGE_X, z], normal: [0, 1, 0], size: 0.45 })) } });
  T.round({ name: 'fence.pin', group, layer: live, F: G.frameOf([HINGE_X, BAR.y1, PIVOT_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), s0: 0, s1: 1, r: 1.6, tone: 'mid', crease: 'lo', details: { bolts: [{ s: 1, r: 0, count: 1, size: 0.5 }] } });
  T.round({ name: 'fence.stem', group, layer: live, F: VERT(HINGE_X, (BAR.y0 + BAR.y1) / 2), s0: FENCE.z1, s1: FENCE.z1 + 2.4, r: 0.8, tone: 'mid', crease: 'lo' });
  T.round({ name: 'fence.grip', group, layer: live, F: VERT(HINGE_X, (BAR.y0 + BAR.y1) / 2), s0: FENCE.z1 + 2.4, s1: GRIP_TOP, r: 1.6, ends: ['flat', 'dome'], tone: 'hi', crease: 'lo', lit: true });
}

base();
turntable();
rack();
for (let i = 0; i < ROWS; i++) bar(i);
fence();

// The reachable states: the tour, sampled at 30 frames a second.
export const poses = () => Array.from({ length: PERIOD * 30 + 1 }, (_, i) => { const { turn, k: shear } = tourAt(i / 30); return pose(turn, shear); });
const out = T.build({ statics: R.items, poses });
A.settle(R, P);

if (argv.includes('--audit')) {
  A.auditOrExit(R, P);
  // The sweep turns the table all the way round with the grid sheared; the clip is the tour, where the fence leans.
  const sweep = { at: (x) => pose(x, KMAX), from: 0, to: 360, frame: 0.3 };
  TA.orbitOrExit(T, R, P, { sweep, clips: [{ name: 'tour', at: (t) => { const { turn, k: shear } = tourAt(t); return pose(turn, shear); }, from: 0, to: PERIOD, frame: 1 / 60 }], quick: argv.includes('--quick'), only: argv.find((a) => a.startsWith('--only='))?.slice(7).split(',') ?? null });
}

const STATIC = [`<path class="iso-halo" d="${k.haloOf(BASE, FOOT_Z, -FOOT_Z, P)}"/>`, ...R.items.filter((item) => item.layer === 'back').sort((a, b) => a.key - b.key).map((item) => item.svg)];
const LABEL = 'A shear rack on a turntable: the rows of a grid are bars on ledges, one above another. A fence at their left ends leans and pushes each bar along by its height, so the marks across the rows lean over while the bottom row stays put; then the turntable turns the sheared grid round.';
const stage = `<div class="iso an sh" data-theme="dark"><div class="iso-stage iso-turn sh-stage">${k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: STATIC })}${out.layerSvg('table', { width: WIDTH, height: HEIGHT })}</div></div>`;
const CSS = k.ISO_CSS + out.css + readFileSync(join(HERE, '../kit/anatomy.css'), 'utf8') + readFileSync(join(HERE, 'shear.css'), 'utf8');
const strip = (text) => text.replace(/^export /gm, '');
const module = `// Generated by build.mjs from the anatomy kit. Do not edit; change build.mjs, model.js, shear.css or live.js and rebuild.\n${strip(readFileSync(join(KIT, 'turn.mjs'), 'utf8'))}\n${strip(readFileSync(join(HERE, 'model.js'), 'utf8'))}\nconst DATA = ${JSON.stringify(out.data)};\nconst DECK = ${DECK};\nconst MARKUP = ${JSON.stringify(stage)};\nconst CSS = ${JSON.stringify(CSS)};\n${readFileSync(join(HERE, 'live.js'), 'utf8')}`;
writeFileSync(join(HERE, 'shear.js'), module);
console.log(`wrote shear.js · ${(module.length / 1024).toFixed(0)} KB · ${out.report.parts} live parts · ${R.items.length} static items · build ${out.report.seconds.toFixed(1)} s`);

const page = argv.find((a) => a.startsWith('--page='))?.slice(7);
if (page) {
  const light = argv.includes('--light');
  writeFileSync(page, readFileSync(join(HERE, '../kit/anatomy-page.html'), 'utf8').replace('%TOKENS%', readFileSync(join(HERE, '../kit/tokens.css'), 'utf8')).replace('%THEME%', light ? 'paper' : 'night').replace('%MODULE%', './shear.js').replaceAll('%MOUNT%', 'mountShear'));
  writeFileSync(join(dirname(page), 'shear.js'), module);
  console.log(`wrote ${page}`);
}
