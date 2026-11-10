// The Difference Engine's illustration (the games hub's card and the level map's hero): a small difference engine after
// Babbage's 1832 demonstration piece, drawn in 3D with the anatomy skill's kit. Three columns of figure wheels stand
// between two plates on a bed: Δ², Δ and aₙ from left to right, units at the bottom. Each turn of the crank on top runs
// two additions, aₙ += Δ and then Δ += Δ²; a sector shaft between two columns swings while its addition runs, and the
// wheels turn digit by digit, carries after. The aₙ column reads 0, 1, 4, 9, … and the Δ² column never moves.
// The arithmetic is model.js, shared with the page.
//
//   node games/engine/build.mjs                       writes engine.js (the hub's module) next to this file
//   node games/engine/build.mjs --page=x.html [--light]  also writes a standalone page for captures and line checks
//   node games/engine/build.mjs --audit [--quick] [--only=a,b]  runs the kit audit and the 3D orbit audit
//
// The kit is read from the anatomy skill (ANATOMY_KIT, default ~/.agents/skills/anatomy/kit); only engine.js ships.

import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COLUMNS, CYCLE, SWING, WHEELS, pose } from './model.js';

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
const AZIMUTH = 60;

// The bed runs along x; the columns stand on y = 0, Δ² at the left and aₙ at the right; the viewer is at +x +y.
const BED = { x: -110, y: -38, w: 220, d: 76, r: 7 };
const BED_Z = -10;
const FOOT_Z = -15;
const PLATE = { x: -90, y: -24, w: 180, d: 48, r: 5 };
const PLATE_H = 4;
// The top plate is narrower than the columns, so the upper wheels show in front of and behind it.
const TOP_PLATE = { x: -90, y: -17, w: 180, d: 34, r: 5 };
const TOP_Z = 50;
const PILLARS = [[-82, -12], [82, -12], [-82, 12], [82, 12]];
const AXIS_X = { d2: -52, d1: 0, a: 52 };
const WHEEL_R = 15;
const BAND_R = 16;
const PITCH = 11;
const BAND_H = 1.6;
const DISC_H = 6.4;
const WHEEL_Z = (i) => PLATE_H + 3 + PITCH * i;
const SPACER_R = 5;
// The sector shafts stand in the gaps between the columns.
const SHAFTS = { a: [26, -6], d1: [-26, -6] };
const SHAFT_R = 1.5;
const COLLAR_R = 3;
const ARM = 7.4;
const CRANK_Z = TOP_Z + PLATE_H + 3;
const GRIP_AT = 21;
const GRIP_TOP = CRANK_Z + 19;

export const P = k.fitProjection([...k.boxCorners(BED, FOOT_Z, 0), ...[[-26, -26], [26, -26], [-26, 26], [26, 26]].map(([x, y]) => [x, y, GRIP_TOP])], WIDTH, HEIGHT, { pad: 10, azimuth: AZIMUTH, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screws = (points, z, ring = 1.8) => L(points.map(([x, y]) => k.ring(x, y, ring, z, P, 16)).join(''), { tone: 'lo' }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.5 });
const front = (x, y) => (k.depthOf([x, y, 0], P) > k.depthOf([0, 0, 0], P) ? 'front' : 'back');

export const R = A.recorder(P);
const put = (item) => R.put({ layer: 'back', ...item, shapes: item.shapes.map((shape, i) => R.solid(Object.assign(shape, { name: shape.name ?? (i ? `${item.name}#${i + 1}` : item.name) }))) });

function bed() {
  for (const [x, y] of byDepth(k.corners(BED, 15))) {
    const svg = S(k.cylinder(x, y, 6.4, FOOT_Z, 1.4, P, 24), { tone: 'lo' }) + S(k.cylinder(x, y, 4.8, FOOT_Z + 1.4, BED_Z - FOOT_Z - 1.4, P, 24), { tone: 'mid' });
    put({ name: `stand.foot.${x}.${y}`, at: [x, y, FOOT_Z], svg, shapes: [A.cylinder(x, y, 6.4, FOOT_Z, 1.4, { ground: true }), A.cylinder(x, y, 4.8, FOOT_Z + 1.4, BED_Z - FOOT_Z - 1.4)] });
  }
  const seam = L(k.sideSeam(BED, BED_Z + 3.4, P, 8), { tone: 'faint' });
  const groove = L(k.planOutline(k.insetPlan(BED, 4), 0, P, 6), { tone: 'faint' });
  put({ name: 'stand.bed', at: [0, 0, BED_Z], bias: 4, svg: S(k.slabOf(BED, BED_Z, -BED_Z, P, 8, 1.2), { tone: 'lo', inner: seam }) + groove + screws(k.corners(BED, 8.5), 0), shapes: [A.slab(BED, BED_Z, -BED_Z, { ground: true })] });

  // A ruler strip along the front of the bed, a major tick under each column.
  const strip = { x: -74, y: 28.5, w: 148, d: 5, r: 1 };
  const t = k.topTicks(-68, 68, 4, 13, strip.y + 0.6, 0.6, [1.6, 3], P);
  put({ name: 'stand.ruler', at: [0, strip.y, 0], svg: S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'mid', crease: 'none' }) + L(t.minor, { tone: 'lo' }) + L(t.major, { tone: 'mid' }), shapes: [A.slab(strip, 0, 0.6)] });

  // A maker's plate at the right of the ruler: three engraved rules and two screws.
  const plate = { x: 80, y: 26, w: 20, d: 10, r: 1.2 };
  const rules = [[83, 29.2, 95], [83, 31.4, 97], [83, 33.6, 91]].map(([x0, y, x1]) => k.lineOnTop([x0, y], [x1, y], 0.8, P)).join('');
  put({ name: 'stand.label', at: [90, 31, 0], svg: S(k.slabOf(plate, 0, 0.8, P, 3, 0.3), { tone: 'mid' }) + L(k.planOutline(k.insetPlan(plate, 1.2), 0.8, P, 3), { tone: 'faint' }) + L(rules, { tone: 'lo', free: true }) + D([[98, 28.6], [98, 33.4]].map(([x, y]) => at([x, y, 0.8])), { size: 0.45 }), shapes: [A.slab(plate, 0, 0.8)] });
}

function plates() {
  const seamLow = L(k.sideSeam(PLATE, 1.4, P, 6), { tone: 'faint' });
  put({ name: 'frame.base', at: [0, 0, 0], bias: 2, svg: S(k.slabOf(PLATE, 0, PLATE_H, P, 6, 0.8), { tone: 'mid', inner: seamLow }) + screws([[-26, 19], [26, 19], [-78, 0], [78, 0]], PLATE_H, 1.4), shapes: [A.slab(PLATE, 0, PLATE_H)] });
  for (const [x, y] of PILLARS) {
    const layer = front(x, y);
    const svg = S(k.cylinder(x, y, 5, PLATE_H, 2.4, P, 28, 0.4), { tone: 'mid' }) + S(k.cylinder(x, y, 3.2, PLATE_H + 2.4, TOP_Z - PLATE_H - 4.8, P, 24), { tone: 'mid', crease: 'none', inner: L([PLATE_H + 9, TOP_Z - 7].map((z) => k.sideArc(x, y, 3.2, z, P, 16)).join(''), { tone: 'faint' }) }) + S(k.cylinder(x, y, 5, TOP_Z - 2.4, 2.4, P, 28, 0.4), { tone: 'mid' });
    put({ name: `frame.pillar.${x}.${y}`, layer, at: [x, y, PLATE_H], svg, shapes: [A.cylinder(x, y, 5, PLATE_H, 2.4), A.cylinder(x, y, 3.2, PLATE_H + 2.4, TOP_Z - PLATE_H - 4.8), A.cylinder(x, y, 5, TOP_Z - 2.4, 2.4)] });
  }
  const seamTop = L(k.sideSeam(TOP_PLATE, TOP_Z + 1.4, P, 6), { tone: 'faint' });
  put({ name: 'frame.top', layer: 'front', at: [0, 0, TOP_Z], svg: S(k.slabOf(TOP_PLATE, TOP_Z, PLATE_H, P, 6, 0.8), { tone: 'mid', inner: seamTop }), shapes: [A.slab(TOP_PLATE, TOP_Z, PLATE_H)] });
  const Z = TOP_Z + PLATE_H;
  for (const [x, y] of byDepth(PILLARS)) put({ name: `frame.nut.${x}.${y}`, layer: 'front', at: [x, y, Z], svg: S(k.cylinder(x, y, 4.2, Z, 1.6, P, 6, 0.3), { tone: 'lo' }) + D([at([x, y, Z + 1.6])], { size: 0.5 }), shapes: [A.cylinder(x, y, 4.2, Z, 1.6)] });
  for (const col of ['d2', 'a']) {
    const x = AXIS_X[col];
    put({ name: `frame.bearing.${col}`, layer: 'front', at: [x, 0, Z], svg: S(k.cylinder(x, 0, 6.5, Z, 1.8, P, 40, 0.4), { tone: 'mid' }) + L(k.ring(x, 0, 4.4, Z + 1.8, P, 32), { tone: 'faint' }) + screws([[x - 2.2, 2.2], [x + 2.2, -2.2]].map(([px, py]) => [px, py]), Z + 1.8, 0.8), shapes: [A.cylinder(x, 0, 6.5, Z, 1.8)] });
  }
  for (const [name, [x, y]] of Object.entries(SHAFTS)) put({ name: `frame.cap.${name}`, layer: 'front', at: [x, y, Z], svg: S(k.cylinder(x, y, 3, Z, 1.2, P, 20, 0.3), { tone: 'lo' }) + D([at([x, y, Z + 1.2])], { size: 0.45 }), shapes: [A.cylinder(x, y, 3, Z, 1.2)] });
  // The crank's pedestal over the Δ column.
  put({ name: 'frame.pedestal', layer: 'front', at: [0, 0, Z], svg: S(k.cylinder(0, 0, 8, Z, CRANK_Z - Z, P, 48, 0.5), { tone: 'mid', inner: L(k.sideArc(0, 0, 8, Z + 1.2, P, 32), { tone: 'faint' }) }) + L(k.ring(0, 0, 6.6, CRANK_Z, P, 40), { tone: 'faint' }), shapes: [A.cylinder(0, 0, 8, Z, CRANK_Z - Z)] });
}

export const T = turning(P, { recorder: R });
const wheels = T.layer('wheels');
const top = T.layer('crank');
T.stack(['back', 'wheels', 'front', 'crank']);

// A figure wheel: a toothed band under a rim engraved 0–9. Digit d sits at the angle that faces the viewer when the
// wheel has turned d steps of 36°, so the digit read at the front is the wheel's value.
const digitSvg = (d, col) => `<text class="iso-face-text eg-digit" data-col="${col}" data-tone="hi" font-size="4.6" text-anchor="middle" y="1.65">${d}</text>`;
function wheel(col, i) {
  const [cx, cy] = [AXIS_X[col], 0];
  const group = T.group(`wheel.${col}.${i}`, { turn: { pivot: [cx, cy] } });
  const z0 = WHEEL_Z(i);
  const z1 = z0 + BAND_H;
  const z2 = z1 + DISC_H;
  const F = VERT(cx, cy);
  T.round({ name: `wheel.${col}.${i}.band`, group, layer: wheels, F, s0: z0, s1: z1, r: BAND_R, tone: 'mid', crease: 'lo', details: { ribs: { s0: z0, s1: z1, count: 60, tone: 'lo' } } });
  const rules = Array.from({ length: 10 }, (_, d) => {
    const a = ((AZIMUTH - 36 * d - 18) * Math.PI) / 180;
    return { points: [[z1 + 0.7, WHEEL_R * Math.cos(a), WHEEL_R * Math.sin(a)], [z2 - 0.7, WHEEL_R * Math.cos(a), WHEEL_R * Math.sin(a)]], tone: 'faint' };
  });
  const disc = T.round({ name: `wheel.${col}.${i}.rim`, group, layer: wheels, F, s0: z1, s1: z2, r: WHEEL_R, tone: 'hi', crease: 'lo', details: { seams: [z1 + 0.7, z2 - 0.7], rules, rings: [{ at: [z2, 0, 0], normal: [0, 0, 1], r: WHEEL_R - 2.6, tone: 'faint' }], bolts: [{ s: z2, r: SPACER_R + 3.4, count: 6, size: 0.45, phase: 0.5 }] } });
  for (let d = 0; d < 10; d++) {
    const a = ((AZIMUTH - 36 * d) * Math.PI) / 180;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    T.plane({ part: disc, o: [cx + WHEEL_R * c, cy + WHEEL_R * s, (z1 + z2) / 2], u: [s, -c, 0], v: [0, 0, -1], normal: [c, s, 0], svg: digitSvg(d, col) });
  }
}

// The column between and around its wheels: a boss on the base plate, spacers between the wheels, a collar under the
// top plate. They stand still, so they are live parts in no group, painted with the wheels they touch.
function column(col) {
  const F = VERT(AXIS_X[col], 0);
  T.round({ name: `col.${col}.boss`, layer: wheels, F, s0: PLATE_H, s1: WHEEL_Z(0), r: 7, tone: 'mid', crease: 'lo', details: { seams: [PLATE_H + 1] } });
  for (let i = 0; i < WHEELS; i++) {
    const s0 = WHEEL_Z(i) + BAND_H + DISC_H;
    const s1 = i < WHEELS - 1 ? WHEEL_Z(i + 1) : TOP_Z;
    T.round({ name: `col.${col}.spacer.${i}`, layer: wheels, F, s0, s1, r: SPACER_R, tone: 'mid', crease: 'lo' });
  }
  for (let i = 0; i < WHEELS; i++) wheel(col, i);
}

// A sector shaft: a spindle in three pieces with a collar and an arm at each wheel's height, turning as one.
function shaft(col) {
  const [px, py] = SHAFTS[col];
  const group = T.group(`lever.${col}`, { turn: { pivot: [px, py] } });
  const F = VERT(px, py);
  // Local [across, out] to world, out pointing between the viewer and the receiving column, so the arm reads side on.
  const [ox, oy] = [Math.cos(((AZIMUTH - 40) * Math.PI) / 180), Math.sin(((AZIMUTH - 40) * Math.PI) / 180)];
  const toward = ([a, b]) => [px + b * ox + a * oy, py + b * oy - a * ox];
  let z = PLATE_H;
  for (let i = 0; i < WHEELS; i++) {
    const zc = WHEEL_Z(i) + BAND_H + DISC_H / 2;
    T.round({ name: `lever.${col}.spindle.${i}`, group, layer: wheels, F, s0: z, s1: zc - 1.4, r: SHAFT_R, tone: 'mid', crease: 'lo' });
    T.round({ name: `lever.${col}.collar.${i}`, group, layer: wheels, F, s0: zc - 1.4, s1: zc + 1.4, r: COLLAR_R, tone: 'mid', crease: 'lo', details: { bolts: [{ s: zc + 1.4, r: 1.9, count: 1, size: 0.4, phase: 0.25 }] } });
    const arm = [];
    for (let j = 0; j <= 8; j++) { const t = (j / 8) * Math.PI; arm.push(toward([1.3 * Math.cos(t), ARM - 1.3 + 1.3 * Math.sin(t)])); }
    arm.push(toward([-1.3, COLLAR_R]), toward([1.3, COLLAR_R]));
    const part = T.prism({ name: `lever.${col}.arm.${i}`, group, layer: wheels, F: { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, polygon: arm, s0: zc - 1, s1: zc + 1, bevel: 0.3, tone: 'hi', crease: 'lo', details: { dots: [{ at: [zc + 1, ...toward([0, ARM - 1.3])], normal: [0, 0, 1], size: 0.45 }] } });
    void part;
    z = zc + 1.4;
  }
  T.round({ name: `lever.${col}.spindle.${WHEELS}`, group, layer: wheels, F, s0: z, s1: TOP_Z, r: SHAFT_R, tone: 'mid', crease: 'lo' });
}

// The crank: a knurled boss, an arm and a grip, turning about the Δ column.
function crank() {
  const group = T.group('crank', { turn: { pivot: [0, 0] } });
  const F = VERT(0, 0);
  T.round({ name: 'crank.boss', group, layer: top, F, s0: CRANK_Z, s1: CRANK_Z + 3.6, r: 6, tone: 'mid', crease: 'lo', details: { ribs: { s0: CRANK_Z + 0.5, s1: CRANK_Z + 3.1, count: 40, seams: true, tone: 'lo' } } });
  const arm = [];
  for (let j = 0; j <= 10; j++) { const t = -Math.PI / 2 + (j / 10) * Math.PI; arm.push([GRIP_AT + 3.4 * Math.cos(t), 3.4 * Math.sin(t)]); }
  for (let j = 0; j <= 10; j++) { const t = Math.PI / 2 + (j / 10) * Math.PI; arm.push([4.2 * Math.cos(t), 4.2 * Math.sin(t)]); }
  T.prism({ name: 'crank.arm', group, layer: top, F: { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, polygon: arm, s0: CRANK_Z + 3.6, s1: CRANK_Z + 6, bevel: 0.4, tone: 'hi', crease: 'lo', details: { dots: [{ at: [CRANK_Z + 6, 0, 0], normal: [0, 0, 1], size: 0.55 }] } });
  T.round({ name: 'crank.stem', group, layer: top, F: VERT(GRIP_AT, 0), s0: CRANK_Z + 6, s1: CRANK_Z + 9, r: 1.5, tone: 'mid', crease: 'lo' });
  T.round({ name: 'crank.grip', group, layer: top, F: VERT(GRIP_AT, 0), s0: CRANK_Z + 9, s1: GRIP_TOP, r: 2.4, ends: ['flat', 'dome'], tone: 'hi', crease: 'lo', lit: true, details: { seams: [CRANK_Z + 10.2] } });
}

bed();
plates();
for (const col of COLUMNS) column(col);
shaft('a');
shaft('d1');
crank();

// The reachable states: the crank through a whole cycle, sampled at 60 frames a turn.
export const poses = () => Array.from({ length: CYCLE * 60 + 1 }, (_, i) => pose(i / 60));
const out = T.build({ statics: R.items, poses });
A.settle(R, P);

if (argv.includes('--audit')) {
  A.auditOrExit(R, P);
  // The sweep turns every group through its whole range at once: the wheels and crank all the way round, the shafts
  // out and back; the clip is the engine's own cycle.
  const sweep = { at: (x) => ({ ...Object.fromEntries(Object.keys(pose(0)).map((name) => [name, x])), 'lever.a': -SWING * Math.sin((x * Math.PI) / 180) ** 2, 'lever.d1': -SWING * Math.sin((x * Math.PI) / 90) ** 2 }), from: 0, to: 360, frame: 0.3 };
  TA.orbitOrExit(T, R, P, { sweep, clips: [{ name: 'cycle', at: (t) => pose(t), from: 0, to: CYCLE, frame: 1 / 120 }], quick: argv.includes('--quick'), only: argv.find((a) => a.startsWith('--only='))?.slice(7).split(',') ?? null });
}

const BACK = [`<path class="iso-halo" d="${k.haloOf(BED, FOOT_Z, -FOOT_Z, P)}"/>`, ...R.items.filter((item) => item.layer === 'back').sort((a, b) => a.key - b.key).map((item) => item.svg)];
const FRONT = R.items.filter((item) => item.layer === 'front').sort((a, b) => a.key - b.key).map((item) => item.svg);
const LABEL = 'A small difference engine: three columns of figure wheels between two plates, with a crank on top. Each turn of the crank adds the middle column into the right one and the left column into the middle one, so the right column counts out the squares 0, 1, 4, 9 while the left column never moves.';
const staticSvg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${body.join('')}</svg>`;
const layerSvg = (name) => out.layerSvg(name, { width: WIDTH, height: HEIGHT });
const stage = `<div class="iso an eg" data-theme="dark"><div class="iso-stage iso-turn eg-stage">${k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK })}${layerSvg('wheels')}${staticSvg(FRONT)}${layerSvg('crank')}</div></div>`;
const CSS = k.ISO_CSS + out.css + readFileSync(join(HERE, '../kit/anatomy.css'), 'utf8') + readFileSync(join(HERE, 'engine.css'), 'utf8');
const strip = (text) => text.replace(/^export /gm, '');
const module = `// Generated by build.mjs from the anatomy kit. Do not edit; change build.mjs, model.js, engine.css or live.js and rebuild.\n${strip(readFileSync(join(KIT, 'turn.mjs'), 'utf8'))}\n${strip(readFileSync(join(HERE, 'model.js'), 'utf8'))}\nconst DATA = ${JSON.stringify(out.data)};\nconst CRANK_Z = ${CRANK_Z};\nconst MARKUP = ${JSON.stringify(stage)};\nconst CSS = ${JSON.stringify(CSS)};\n${readFileSync(join(HERE, 'live.js'), 'utf8')}`;
writeFileSync(join(HERE, 'engine.js'), module);
console.log(`wrote engine.js · ${(module.length / 1024).toFixed(0)} KB · ${out.report.parts} live parts · ${R.items.length} static items · build ${out.report.seconds.toFixed(1)} s`);

const page = argv.find((a) => a.startsWith('--page='))?.slice(7);
if (page) {
  const light = argv.includes('--light');
  writeFileSync(page, readFileSync(join(HERE, '../kit/anatomy-page.html'), 'utf8').replace('%TOKENS%', readFileSync(join(HERE, '../kit/tokens.css'), 'utf8')).replace('%THEME%', light ? 'paper' : 'night').replace('%MODULE%', './engine.js').replaceAll('%MOUNT%', 'mountEngine'));
  writeFileSync(join(dirname(page), 'engine.js'), module);
  console.log(`wrote ${page}`);
}
