// Boxy (小方), State Graph's first robot, as a 3D figure for the games hub, drawn with the anatomy skill's kit.
// It stands on the middle cell of its 3×3 view of the table. Its head turns to read the two cells the middle one
// depends on (above, then left), then turns back: 1 + 2 = 3.
//
//   node games/boxy/build.mjs                 writes boxy.js (the hub's module) next to this file
//   node games/boxy/build.mjs --page=x.html   also writes a standalone page for the kit's capture and line checks
//   node games/boxy/build.mjs --audit [--quick]  runs the kit audit and the 3D orbit audit
//
// The kit is read from the anatomy skill (ANATOMY_KIT, default ~/.agents/skills/anatomy/kit); only boxy.js ships.

import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const PITCH = 40;
const TILE_H = 3;
const BOARD = { x: -66, y: -66, w: 132, d: 132, r: 7 };
const BOARD_Z = -9;
const FOOT_Z = -14;

// Rows run along +x and columns along +y, so the cell above is at -x and the cell to the left at -y.
const cellAt = (row, col) => [(row - 1) * PITCH, (col - 1) * PITCH];
const tilePlan = (row, col) => { const [x, y] = cellAt(row, col); return { x: x - 18, y: y - 18, w: 36, d: 36, r: 4 }; };
const VALUES = [['1', '1', '1'], ['2', '', ''], ['', '', '']];
const ROLE = { '0,1': 'above', '1,0': 'left', '1,1': 'self' };

// Boxy is drawn at 1.45× its tile so it reads as the subject; every robot size below is in tile units times SC.
const SC = 1.45;
const sc = (plan) => ({ x: plan.x * SC, y: plan.y * SC, w: plan.w * SC, d: plan.d * SC, r: plan.r * SC });
const TREAD_Z = [TILE_H, TILE_H + 8 * SC];
const CHASSIS = sc({ x: -9, y: -12, w: 18, d: 24, r: 3 });
const CHASSIS_Z = [TILE_H + 2 * SC, TILE_H + 10 * SC];
const DECK = sc({ x: -14, y: -13, w: 28, d: 26, r: 4 });
const DECK_Z = [CHASSIS_Z[1], CHASSIS_Z[1] + 1.6 * SC];
const COLLAR_Z = [DECK_Z[1], DECK_Z[1] + 1.8 * SC];
const NECK_Z = [COLLAR_Z[1], COLLAR_Z[1] + 1.6 * SC];
const HEAD = sc({ x: -15, y: -12, w: 30, d: 24, r: 4.5 });
const HEAD_Z = [NECK_Z[1], NECK_Z[1] + 22 * SC];
const LID_Z = HEAD_Z[1] + 0.8;
const MAST = [0, -3 * SC];
const LAMP_R = 2.4 * SC;
const LAMP_Z = LID_Z + (1.4 + 3.8 + 0.9 + 3) * SC + LAMP_R;

export const P = k.fitProjection([...k.boxCorners(BOARD, FOOT_Z, 0), ...k.boxCorners(HEAD, HEAD_Z[0], HEAD_Z[1]), [MAST[0], MAST[1], LAMP_Z + LAMP_R]], WIDTH, HEIGHT, { pad: 12, azimuth: 225, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const frame = (o, a, u) => G.frameOf(o, a, u, G.cross3(a, u));
const screws = (points, z, ring = 1.7) => L(points.map(([x, y]) => k.ring(x, y, ring, z, P, 16)).join(''), { tone: 'lo' }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.5 });

export const R = A.recorder(P);
const put = (item) => R.put({ layer: 'back', ...item, shapes: item.shapes.map((shape, i) => R.solid(Object.assign(shape, { name: shape.name ?? (i ? `${item.name}#${i + 1}` : item.name) }))) });

function board() {
  for (const [x, y] of byDepth(k.corners(BOARD, 16))) {
    const svg = S(k.cylinder(x, y, 6, FOOT_Z, 1.4, P, 24), { tone: 'lo' }) + S(k.cylinder(x, y, 4.6, FOOT_Z + 1.4, BOARD_Z - FOOT_Z - 1.4, P, 24), { tone: 'mid' });
    put({ name: `stand.foot.${x}.${y}`, at: [x, y, FOOT_Z], svg, shapes: [A.cylinder(x, y, 6, FOOT_Z, 1.4, { ground: true }), A.cylinder(x, y, 4.6, FOOT_Z + 1.4, BOARD_Z - FOOT_Z - 1.4)] });
  }
  const seam = L(k.sideSeam(BOARD, BOARD_Z + 3, P, 8), { tone: 'faint' });
  const svg = S(k.slabOf(BOARD, BOARD_Z, -BOARD_Z, P, 8, 1.2), { tone: 'lo', inner: seam }) + screws(k.corners(BOARD, 4.5), 0);
  put({ name: 'stand.board', at: [0, 0, BOARD_Z], bias: 4, svg, shapes: [A.slab(BOARD, BOARD_Z, -BOARD_Z, { ground: true })] });

  // Ruler strips on the two faces the viewer sees, a major tick at every cell centre and edge.
  for (const axis of ['x', 'y']) {
    const face = BOARD.x - 0.6;
    const plan = axis === 'x' ? { x: -46, y: face, w: 92, d: 0.6, r: 0.2 } : { x: face, y: -46, w: 0.6, d: 92, r: 0.2 };
    const t = k.sideTicks(-40, 40, 4, 5, face, -1.4, [1.4, 2.8], P, axis);
    const svg = S(k.slabOf(plan, -6.6, 5.2, P, 2), { tone: 'mid', crease: 'none' }) + L(t.minor, { tone: 'lo' }) + L(t.major, { tone: 'mid' });
    put({ name: `stand.ruler.${axis}`, at: axis === 'x' ? [0, face, -4] : [face, 0, -4], svg, shapes: [A.slab(plan, -6.6, 5.2)] });
  }
}

function tiles() {
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const plan = tilePlan(row, col);
    const [x, y] = cellAt(row, col);
    const role = ROLE[`${row},${col}`];
    const value = VALUES[row][col];
    const inlay = k.planOutline(k.insetPlan(plan, 3), TILE_H, P, 4);
    const mark = role ? `<path class="iso-line bx-${role === 'self' ? 'self' : 'read'}"${role === 'self' ? '' : ` data-cell="${role}"`} d="${inlay}"/>` : L(inlay, { tone: 'faint' });
    const text = value ? k.faceTextSvg(`${k.topMatrix([x - 5.2, y], TILE_H, P, 'y')} rotate(180)`, value, { size: 15, tone: role ? 'hi' : 'mid', anchor: 'middle' }) : '';
    const svg = S(k.slabOf(plan, 0, TILE_H, P, 4, 0.5), { tone: 'mid', inner: mark + text }) + (value || role ? '' : D(k.corners(plan, 1.6).map(([cx, cy]) => at([cx, cy, TILE_H])), { size: 0.45 }));
    put({ name: `tile.${row}.${col}`, at: [x, y, 0], svg, shapes: [A.slab(plan, 0, TILE_H)] });
  }
}

const u = (v) => v * SC;

function chassis() {
  const hubAt = (y) => frame([u(-15), u(y), TREAD_Z[0] + u(4)], [-1, 0, 0], [0, 0, 1]);
  for (const side of [-1, 1]) {
    const plan = sc({ x: side > 0 ? 9 : -15, y: -13, w: 6, d: 26, r: 3 });
    const ribs = [];
    for (let y = -10; y <= 10 + 1e-9; y += 2.5) ribs.push(k.lineOnTop([plan.x, u(y)], [plan.x + plan.w, u(y)], TREAD_Z[1], P));
    const hubs = side < 0 ? [-7, 0, 7].map((y) => S(G.disc(0, u(0.7), u(2.6), hubAt(y), P), { tone: 'mid', inner: L(G.circleOf(hubAt(y), u(0.7), u(1.6), P, 24), { tone: 'faint' }) }) + D([at(G.pointOf(hubAt(y), u(0.7), 0, 0))], { size: 0.55 })).join('') : '';
    const svg = S(k.slabOf(plan, TREAD_Z[0], TREAD_Z[1] - TREAD_Z[0], P, 4, 0.5), { tone: 'mid', inner: L(ribs.join(''), { tone: 'lo' }) + L(k.sideSeam(plan, TREAD_Z[0] + u(2), P, 4), { tone: 'faint' }) }) + hubs;
    const shapes = [A.slab(plan, TREAD_Z[0], TREAD_Z[1] - TREAD_Z[0])];
    if (side < 0) for (const y of [-7, 0, 7]) shapes.push(A.disc(hubAt(y), 0, u(0.7), u(2.6), { name: `bot.hub.${y}` }));
    put({ name: `bot.tread.${side}`, at: [side * u(12), 0, TREAD_Z[0]], svg, shapes });
  }
  const body = S(k.slabOf(CHASSIS, CHASSIS_Z[0], CHASSIS_Z[1] - CHASSIS_Z[0], P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(CHASSIS, CHASSIS_Z[0] + u(4), P, 3), { tone: 'faint' }) });
  put({ name: 'bot.chassis', at: [0, 0, CHASSIS_Z[0]], svg: body, shapes: [A.slab(CHASSIS, CHASSIS_Z[0], CHASSIS_Z[1] - CHASSIS_Z[0])] });
  const BUMPER = { x: u(-7), y: CHASSIS.y - u(2.2), w: u(14), d: u(2.2), r: u(1) };
  const BZ = [CHASSIS_Z[0] + u(1.5), u(4)];
  const bumper = S(k.slabOf(BUMPER, BZ[0], BZ[1], P, 2, 0.3), { tone: 'lo' }) + D([-4.5, 4.5].map((x) => at([u(x), BUMPER.y, BZ[0] + BZ[1] / 2])), { size: 0.5 });
  put({ name: 'bot.bumper', at: [0, BUMPER.y, BZ[0]], svg: bumper, shapes: [A.slab(BUMPER, BZ[0], BZ[1])] });
  const deck = S(k.slabOf(DECK, DECK_Z[0], DECK_Z[1] - DECK_Z[0], P, 4, 0.6), { tone: 'lo' }) + screws(k.corners(DECK, u(2.6)), DECK_Z[1], u(1.1));
  put({ name: 'bot.deck', at: [0, 0, DECK_Z[0]], svg: deck, shapes: [A.slab(DECK, DECK_Z[0], DECK_Z[1] - DECK_Z[0])] });
  const collar = S(k.cylinder(0, 0, u(7), COLLAR_Z[0], COLLAR_Z[1] - COLLAR_Z[0], P, 48, 0.5), { tone: 'mid' }) + L(k.ring(0, 0, u(5.4), COLLAR_Z[1], P, 40), { tone: 'faint' });
  put({ name: 'bot.collar', at: [0, 0, COLLAR_Z[0]], svg: collar, shapes: [A.cylinder(0, 0, u(7), COLLAR_Z[0], COLLAR_Z[1] - COLLAR_Z[0])] });
}

export const T = turning(P, { recorder: R });
const head = T.group('head', { turn: { pivot: [0, 0] } });
const live = T.layer('head');
T.stack(['back', 'head']);
const H = { group: head, layer: live };
const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);

// Head angles: 0 faces +y, the way Boxy scans; 90 faces the cell above (-x), 180 the cell to the left (-y), 135 the
// viewer. The tour, in seconds: look at the viewer, read above, read left, then spin round once with the sum.
export const ANGLES = { above: 90, left: 180, viewer: 135 };
export const TOUR = [[0, 135], [1.2, 135], [2, 90], [3.2, 90], [4.2, 180], [5.4, 180], [7.4, 495], [9.4, 495]];
export const poses = () => Array.from({ length: 720 }, (_, i) => ({ head: i * 0.5 }));

// A rounded rectangle as a convex polygon in a frame's u, v plane, and a closed slot for vents and grilles.
const rounded = (x0, x1, y0, y1, r, steps = 4) => {
  const out = [];
  for (const [cx, cy, a0] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let j = 0; j <= steps; j++) { const a = ((a0 + (90 * j) / steps) * Math.PI) / 180; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
};
const slot = (x0, x1, y, h) => `M${x0 + h / 2} ${y - h / 2}H${x1 - h / 2}A${h / 2} ${h / 2} 0 0 1 ${x1 - h / 2} ${y + h / 2}H${x0 + h / 2}A${h / 2} ${h / 2} 0 0 1 ${x0 + h / 2} ${y - h / 2}Z`;

T.round({ name: 'head.neck', ...H, F: VERT(0, 0), s0: NECK_Z[0], s1: NECK_Z[1], r: u(4.2), tone: 'mid' });
const FRONT_Y = HEAD.y + HEAD.d;
const BACK_Y = HEAD.y;
const SIDE_X = HEAD.x + HEAD.w;
const Z0 = HEAD_Z[0];
const Z1 = HEAD_Z[1];
T.prism({ name: 'head.shell', ...H, plan: HEAD, z: Z0, h: Z1 - Z0, steps: 4, bevel: 1.4, tone: 'hi', crease: 'lo', details: { seams: [Z0 + u(3.2)] } });

const FACE_T = u(0.7);
const face = T.prism({ name: 'head.face', ...H, F: { o: [0, FRONT_Y, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, polygon: rounded(u(-9.6), u(9.6), Z0 + u(4.6), Z1 - u(3.2), u(2.6)), s0: 0, s1: FACE_T, bevel: 0.4, tone: 'hi', crease: 'lo',
  details: { dots: [-7.6, 7.6].flatMap((x) => [Z1 - u(5.2), Z0 + u(6.6)].map((zz) => ({ at: [FACE_T, u(x), zz], normal: [0, 1, 0], size: 0.5, tone: 'mid' }))) } });
T.plane({ part: face, o: [0, FRONT_Y + FACE_T, Z0 + u(7.4)], u: [1, 0, 0], v: [0, 0, -1], svg: `<path class="iso-line" data-tone="lo" d="${[-1.6, 0, 1.6].map((y) => slot(u(-4.2), u(4.2), u(y), u(0.9))).join('')}"/>` });

const EYE_Z = Z0 + u(13.4);
for (const x of [-4.9, 4.9]) {
  const F = frame([u(x), FRONT_Y + FACE_T, EYE_Z], [0, 1, 0], [1, 0, 0]);
  T.round({ name: `head.bezel.${x}`, ...H, F, s0: 0, s1: u(0.7), r: u(3.7), tone: 'mid', crease: 'lo', details: { bolts: [{ s: u(0.7), r: u(3.2), count: 12, size: 0.32, tone: 'lo' }] } });
  T.round({ name: `head.lens.${x}`, ...H, F, s0: u(0.7), s1: u(1.3), r: u(2.7), tone: 'hi', material: 'rubber',
    details: { dots: [{ at: [u(1.3), u(-0.9), u(0.95)], normal: [0, 1, 0], size: 0.9, tone: 'hi' }], rings: [{ at: [u(1.3), 0, 0], normal: [0, 1, 0], r: u(1.5), tone: 'mid' }] } });
}

const EAR_Z = Z0 + u(12);
for (const side of [-1, 1]) {
  const F = frame([side * SIDE_X, 0, EAR_Z], [side, 0, 0], [0, 0, 1]);
  T.round({ name: `head.ear.${side}`, ...H, F, s0: 0, s1: u(1.4), r: u(4.2), tone: 'mid', crease: 'lo', details: { bolts: [{ s: u(1.4), r: u(3.0), count: 6, size: 0.45, phase: 0.5 }] } });
  T.round({ name: `head.ear.cap.${side}`, ...H, F, s0: u(1.4), s1: u(2.6), r: u(1.9), tone: 'hi', crease: 'lo', details: { dots: [{ at: [u(2.6), 0, 0], normal: [side, 0, 0], size: 0.55 }] } });
}

const hatch = T.prism({ name: 'head.hatch', ...H, F: { o: [0, BACK_Y, 0], a: [0, -1, 0], u: [-1, 0, 0], v: [0, 0, 1] }, polygon: rounded(u(-7.5), u(7.5), Z0 + u(6), Z1 - u(5), u(1.6)), s0: 0, s1: u(0.6), bevel: 0.3, tone: 'mid', crease: 'lo',
  details: { dots: [[-6, Z0 + u(7.5)], [6, Z0 + u(7.5)], [-6, Z1 - u(6.5)], [6, Z1 - u(6.5)]].map(([x, zz]) => ({ at: [u(0.6), u(x), zz], normal: [0, -1, 0], size: 0.45, tone: 'mid' })) } });
T.plane({ part: hatch, o: [0, BACK_Y - u(0.6), (Z0 + Z1) / 2 + u(0.5)], u: [-1, 0, 0], v: [0, 0, -1], svg: `<path class="iso-line" data-tone="lo" d="${[-3.6, -1.2, 1.2, 3.6].map((y) => slot(u(-4), u(4), u(y), u(1))).join('')}"/>` });

const LID = sc({ x: -11, y: -8.5, w: 22, d: 17, r: 2.5 });
T.prism({ name: 'head.lid', ...H, plan: LID, z: Z1, h: LID_Z - Z1, steps: 3, bevel: 0.35, tone: 'mid', crease: 'lo',
  details: { dots: k.corners(LID, u(1.8)).map(([x, y]) => ({ at: [LID_Z, x, y], normal: [0, 0, 1], size: 0.5 })) } });
let z = LID_Z;
const mast = (name, h, r, tone = 'mid') => { T.round({ name: `head.mast.${name}`, ...H, F: VERT(MAST[0], MAST[1]), s0: z, s1: z + u(h), r: u(r), tone, crease: 'lo' }); z += u(h); };
mast('boss', 1.4, 2.6);
mast('stem', 3.8, 0.7, 'hi');
mast('collar', 0.9, 1.3);
mast('tip', 3, 0.7, 'hi');
const LAMP = [MAST[0], MAST[1], z + LAMP_R];
T.fixed({ name: 'head.lamp', ...H, svg: S(G.sphereOf(LAMP, LAMP_R, P, { steps: 48 }), { className: 'bx-lamp' }), anchor: LAMP, shapes: [A.ball(LAMP, LAMP_R, { name: 'head.lamp' })] });

board();
tiles();
chassis();
const out = T.build({ statics: R.items, poses });
A.settle(R, P);
const BACK = [`<path class="iso-halo" d="${k.haloOf(BOARD, FOOT_Z, -FOOT_Z, P)}"/>`, ...R.items.filter((item) => item.layer === 'back').sort((a, b) => a.key - b.key).map((item) => item.svg)];

if (argv.includes('--audit')) {
  A.auditOrExit(R, P);
  TA.orbitOrExit(T, R, P, { sweep: { at: (x) => ({ head: x }), from: 0, to: 360, frame: 0.3 }, quick: argv.includes('--quick'), only: argv.find((a) => a.startsWith('--only='))?.slice(7).split(',') ?? null });
}

const LABEL = 'Boxy, a small robot on treads, stands on the middle cell of a 3 by 3 patch of the table. It turns its head to read the cell above and the cell to its left.';
const stage = `<div class="iso bx" data-theme="dark"><div class="iso-stage iso-turn bx-stage">${k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK })}${out.layerSvg('head', { width: WIDTH, height: HEIGHT })}</div></div>`;
const CSS = k.ISO_CSS + out.css + readFileSync(join(HERE, 'boxy.css'), 'utf8');
const strip = (file) => readFileSync(join(KIT, file), 'utf8').replace(/^export /gm, '');
const module = `// Generated by build.mjs from the anatomy kit. Do not edit; change build.mjs or live.js and rebuild.\n${strip('turn.mjs')}\nconst DATA = ${JSON.stringify(out.data)};\nconst TOUR = ${JSON.stringify(TOUR)};\nconst ANGLES = ${JSON.stringify(ANGLES)};\nconst MARKUP = ${JSON.stringify(stage)};\nconst CSS = ${JSON.stringify(CSS)};\n${readFileSync(join(HERE, 'live.js'), 'utf8')}`;
writeFileSync(join(HERE, 'boxy.js'), module);
console.log(`wrote boxy.js · ${(module.length / 1024).toFixed(0)} KB · ${out.report.parts} live parts · ${R.items.length} static items · build ${out.report.seconds.toFixed(1)} s`);

const page = argv.find((a) => a.startsWith('--page='))?.slice(7);
if (page) {
  const light = argv.includes('--light');
  const html = `<!doctype html><html lang="en" data-theme="${light ? 'paper' : 'night'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Boxy</title>
<style>:root{--ink:#282824;--paper:#fbfaf6;--canvas:#f3f1eb;--accent:#c98f22;--fail:#b8573f}:root[data-theme=night]{--ink:#e6e4dc;--paper:#191917;--canvas:#141413;--accent:#e0b45a;--fail:#e0806a}
body{margin:0;background:var(--canvas)}.art{width:min(900px,100%);margin:40px auto;aspect-ratio:2/1;display:grid;place-items:center}.art>*{width:92%}</style></head>
<body><div class="art" id="art"></div><script type="module">import { mountBoxy } from './boxy.js'; mountBoxy(document.getElementById('art'));</script></body></html>`;
  writeFileSync(page, html);
  writeFileSync(join(dirname(page), 'boxy.js'), module);
  console.log(`wrote ${page}`);
}
