// Syntax Graph's illustration (the games hub's card and the level map's hero): a printer's composing stick, drawn with
// the anatomy skill's kit. A sentence is set the way the game sets it: word by word, in reading order, into places that
// each take one kind of word. The sorts wait in a type case at the back; each place on the stick is marked with its
// word class's colour (subject, tense, verb, object, as in the game). One loop sets "The committee has accepted the
// paper": a "have" is tried in the tense place first and refused (it doesn't agree with the subject), the knee closes
// the full line and the brackets under it (subject, predicate, clause) light; then the sorts go back to the case.
//
//   node games/stick/build.mjs                 writes stick.js (the hub's module) next to this file
//   node games/stick/build.mjs --page=x.html   also writes a standalone page for the kit's capture and line checks
//   node games/stick/build.mjs --audit         runs the kit audit
//
// The kit is read from the anatomy skill (ANATOMY_KIT, default ~/.agents/skills/anatomy/kit); only stick.js ships.

import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = process.env.ANATOMY_KIT ?? join(homedir(), '.agents/skills/anatomy/kit');
const load = (file) => import(pathToFileURL(join(KIT, file)).href);
const k = await load('iso-kit.mjs');
const A = await load('audit.mjs');
const argv = process.argv.slice(2);

const WIDTH = 600;
const HEIGHT = 300;

// The bench runs along +x; the case is at the back (-y), the stick in front of it, the brackets on the front edge.
const BASE_Z = -9;
const FOOT_Z = -14;

const CASE = { x: -124, y: -50, d: 38, r: 3 }; // its width is set by the compartments, below
const CASE_FLOOR = 2;
const CASE_WALL = 10;
const DIVIDER = 1.6;

const STICK = { x: -116, y: 6, w: 0, d: 36, r: 2 }; // its length is set by the line, below
const STICK_FLOOR = 3;
const BACK_TOP = 16;
const LIP = { y: 38, d: 4, top: 6.5 };
const SORT = { d: 24, h: 10, y: 13 }; // in the stick a sort spans y 13..37
const MARK_Y = 31; // where a place's colour shows on the floor until its sort covers it
const LIFT = 21; // a moving sort's bottom clears every wall at this height
const CHAR = 4.3;
const FONT = 7;

// The words in reading order, each with its place's colour (the game's wire hues), and the one the grammar refuses.
const WORDS = [
  { id: 'subject', text: 'The committee', hue: 'w0' },
  { id: 'tense', text: 'has', hue: 'w2' },
  { id: 'verb', text: 'accepted', hue: 'w4' },
  { id: 'object', text: 'the paper', hue: 'w5' },
];
const WRONG = { id: 'wrong', text: 'have', hue: 'w2', place: 'tense' };
const widthOf = (text) => Math.round(text.length * CHAR + 8);

// Places on the stick, left to right from the fixed head.
const HEAD_X = STICK.x + 6;
const GAP = 1.2;
let x = HEAD_X + GAP;
const PLACES = WORDS.map((w) => { const place = { ...w, x, w: widthOf(w.text) }; x += place.w + GAP; return place; });
const LINE_END = x - GAP;
STICK.w = LINE_END + 34 - STICK.x;
const KNEE = { w: 8, park: LINE_END + 18 }; // the knee's left face: parked open, then closed on the line
const placeOf = (id) => PLACES.find((p) => p.id === id);

// Compartments in the case, in a jumbled order, each a sort's width plus a little play.
const CASE_ORDER = ['verb', 'wrong', 'object', 'subject', 'tense'];
const CASE_Y = CASE.y + 4 + 2; // a sort in the case spans y CASE_Y .. CASE_Y + 24
const sortsAll = [...WORDS, WRONG];
let cx = CASE.x + DIVIDER;
const BINS = CASE_ORDER.map((id) => {
  const word = sortsAll.find((w) => w.id === id);
  const w = widthOf(word.text);
  const bin = { ...word, x: cx + 1.5, w, x0: cx, x1: cx + w + 3 };
  cx += w + 3 + DIVIDER;
  return bin;
});
const CASE_SPAN = cx - CASE.x;
const BASE = { x: Math.min(CASE.x, STICK.x) - 16, y: -58, w: Math.max(CASE.x + CASE_SPAN, STICK.x + STICK.w) + 16 - Math.min(CASE.x, STICK.x) + 16, d: 116, r: 8 };

export const P = k.fitProjection(
  [...k.boxCorners(BASE, FOOT_Z, 0), [CASE.x + CASE_SPAN / 2, CASE.y, LIFT + SORT.h], [STICK.x, STICK.y, LIFT + SORT.h]],
  WIDTH, HEIGHT, { pad: 10, azimuth: 55, elevation: 34 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screws = (points, z, ring = 1.6) => L(points.map(([px, py]) => k.ring(px, py, ring, z, P, 16)).join(''), { tone: 'lo' }) + D(points.map(([px, py]) => at([px, py, z])), { size: 0.5 });

// Items are painted band by band (back to front), and by the settled key inside a band. The sorts are live: each
// one is moved between its compartment's slot, the stick's layer and the air layer above everything as it travels.
export const R = A.recorder(P);
const put = (band, item) => R.put({ band, ...item, shapes: item.shapes.map((shape, i) => R.solid(Object.assign(shape, { name: shape.name ?? (i ? `${item.name}#${i + 1}` : item.name) }))) });

function bench() {
  for (const [fx, fy] of byDepth(k.corners(BASE, 18))) {
    const svg = S(k.cylinder(fx, fy, 6.5, FOOT_Z, 1.4, P, 24), { tone: 'lo' }) + S(k.cylinder(fx, fy, 5, FOOT_Z + 1.4, BASE_Z - FOOT_Z - 1.4, P, 24), { tone: 'mid' });
    put('base', { name: `stand.foot.${fx}.${fy}`, at: [fx, fy, FOOT_Z], svg, shapes: [A.cylinder(fx, fy, 6.5, FOOT_Z, 1.4, { ground: true }), A.cylinder(fx, fy, 5, FOOT_Z + 1.4, BASE_Z - FOOT_Z - 1.4)] });
  }
  const svg = S(k.slabOf(BASE, BASE_Z, -BASE_Z, P, 8, 1.2), { tone: 'lo', inner: L(k.sideSeam(BASE, BASE_Z + 3, P, 8), { tone: 'faint' }) })
    + L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P, 8), { tone: 'faint' }) + screws(k.corners(BASE, 9), 0) + brackets();
  put('base', { name: 'stand.base', at: [0, 0, BASE_Z], bias: 4, svg, shapes: [A.slab(BASE, BASE_Z, -BASE_Z, { ground: true })] });
  const face = BASE.y + BASE.d;
  const strip = { x: BASE.x + 16, y: face, w: BASE.w - 32, d: 0.6, r: 0.2 };
  const t = k.sideTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, face + 0.6, -1.6, [1.4, 2.8], P, 'x');
  put('front', { name: 'stand.ruler', at: [strip.x + strip.w / 2, face, -4], svg: S(k.slabOf(strip, -6.8, 5.4, P, 2), { tone: 'mid', crease: 'none' }) + L(t.minor, { tone: 'lo' }) + L(t.major, { tone: 'mid' }), shapes: [A.slab(strip, -6.8, 5.4)] });
}

// The type case: a floor, a back wall, dividers between the compartments (each painted between the sorts beside it)
// and a front wall with a card holder and a pull.
function typeCase() {
  const plan = { ...CASE, w: CASE_SPAN };
  put('base', { name: 'case.floor', at: [0, CASE.y + CASE.d / 2, 0], svg: S(k.slabOf(plan, 0, CASE_FLOOR, P, 4, 0.5), { tone: 'mid' }), shapes: [A.slab(plan, 0, CASE_FLOOR)] });
  const back = { x: plan.x, y: plan.y, w: plan.w, d: 3, r: 1 };
  put('base', { name: 'case.back', at: [0, plan.y + 1.5, CASE_FLOOR], svg: S(k.slabOf(back, CASE_FLOOR, CASE_WALL - CASE_FLOOR, P, 2, 0.4), { tone: 'mid' }), shapes: [A.slab(back, CASE_FLOOR, CASE_WALL - CASE_FLOOR)] });
  const inner = { y: plan.y + 3, d: plan.d - 6 };
  const walls = [plan.x, ...BINS.map((b) => b.x1)];
  walls.forEach((wx, i) => {
    const wall = { x: wx, y: inner.y, w: DIVIDER, d: inner.d, r: 0.5 };
    const end = i === 0 || i === walls.length - 1;
    const top = end ? CASE_WALL : CASE_WALL - 2;
    put(`bin.${i}`, { name: `case.wall.${i}`, at: [wx, plan.y + plan.d / 2, CASE_FLOOR], svg: S(k.slabOf(wall, CASE_FLOOR, top - CASE_FLOOR, P, 2, 0.3), { tone: 'mid' }), shapes: [A.slab(wall, CASE_FLOOR, top - CASE_FLOOR)] });
  });
  const frontY = plan.y + plan.d - 3;
  const front = { x: plan.x, y: frontY, w: plan.w, d: 3, r: 1 };
  const holder = { x: -16, y: frontY + 3, w: 32, d: 0.6, r: 0.3 };
  const pull = [plan.x + plan.w - 22, frontY + 3];
  const svg = S(k.slabOf(front, CASE_FLOOR, CASE_WALL - CASE_FLOOR, P, 2, 0.4), { tone: 'mid', inner: L(k.sideSeam(front, CASE_FLOOR + 2.4, P, 2), { tone: 'faint' }) });
  put('caseFront', { name: 'case.front', at: [0, frontY + 1.5, CASE_FLOOR], svg, shapes: [A.slab(front, CASE_FLOOR, CASE_WALL - CASE_FLOOR)] });
  // A brass card holder with three rule lines standing for its label, and a cup pull.
  const rules = [6.2, 5.2, 4.2].map((z, i) => k.segment([holder.x + 4, holder.y + 0.6, z], [holder.x + holder.w - (i === 2 ? 12 : 4), holder.y + 0.6, z], P)).join('');
  const holderSvg = S(k.slabOf(holder, 3.4, 4, P, 2), { tone: 'hi', crease: 'none' }) + L(rules, { tone: 'lo', free: true }) + D([at([holder.x + 1.4, holder.y + 0.6, 5.4]), at([holder.x + holder.w - 1.4, holder.y + 0.6, 5.4])], { size: 0.4 });
  put('caseFront', { name: 'case.holder', at: [0, holder.y, 3.4], svg: holderSvg, shapes: [A.slab(holder, 3.4, 4)] });
  const cup = { x: pull[0] - 6, y: pull[1], w: 12, d: 2.4, r: 1.2 };
  put('caseFront', { name: 'case.pull', at: [pull[0], pull[1] + 1, 3.6], svg: S(k.slabOf(cup, 3.6, 3.4, P, 4, 0.4), { tone: 'mid' }), shapes: [A.slab(cup, 3.6, 3.4)] });
}

// The stick: floor plate, back wall with a measure on top, fixed head, coloured place marks, front lip, and the knee.
function stick() {
  // Each place's mark: a painted coloured strip on the floor where its sort stands, hidden once the sort is set.
  const marks = PLACES.map((p) => `<path class="sx-mark" data-mark="${p.id}" style="--hue:var(--${p.hue})" d="${k.onTop([[p.x + 2, MARK_Y - 1], [p.x + p.w - 2, MARK_Y - 1], [p.x + p.w - 2, MARK_Y + 1], [p.x + 2, MARK_Y + 1]], STICK_FLOOR, P, true)}"/>`).join('');
  put('stickBack', { name: 'stick.floor', at: [0, STICK.y + STICK.d / 2, 0], svg: S(k.slabOf(STICK, 0, STICK_FLOOR, P, 3, 0.5), { tone: 'mid' }) + marks + screws(byDepth([[STICK.x + 3, LIP.y - 2], [STICK.x + STICK.w - 3, LIP.y - 2]]), STICK_FLOOR, 1.1), shapes: [A.slab(STICK, 0, STICK_FLOOR)] });
  const back = { x: STICK.x, y: STICK.y, w: STICK.w, d: 5, r: 1 };
  const ticks = k.topTicks(HEAD_X, STICK.x + STICK.w - 6, 4, 5, back.y + 0.8, BACK_TOP, [1.6, 3], P, 'x');
  const backSvg = S(k.slabOf(back, STICK_FLOOR, BACK_TOP - STICK_FLOOR, P, 2, 0.4), { tone: 'mid', inner: L(k.sideSeam(back, STICK_FLOOR + 3, P, 2), { tone: 'faint' }) })
    + L(ticks.minor, { tone: 'lo' }) + L(ticks.major, { tone: 'mid' });
  put('stickBack', { name: 'stick.back', at: [0, back.y + 2.5, STICK_FLOOR], svg: backSvg, shapes: [A.slab(back, STICK_FLOOR, BACK_TOP - STICK_FLOOR)] });
  const head = { x: STICK.x, y: back.y + back.d, w: HEAD_X - STICK.x, d: LIP.y - back.y - back.d, r: 1 };
  put('stickBack', { name: 'stick.head', at: [HEAD_X - 3, 22, STICK_FLOOR], svg: S(k.slabOf(head, STICK_FLOOR, BACK_TOP - STICK_FLOOR, P, 2, 0.4), { tone: 'mid' }) + D([at([STICK.x + 3, 16, BACK_TOP]), at([STICK.x + 3, 32, BACK_TOP])], { size: 0.45 }), shapes: [A.slab(head, STICK_FLOOR, BACK_TOP - STICK_FLOOR)] });

  const lip = { x: STICK.x, y: LIP.y, w: STICK.w, d: LIP.d, r: 1 };
  put('stickFront', { name: 'stick.lip', at: [0, LIP.y + 2, STICK_FLOOR], svg: S(k.slabOf(lip, STICK_FLOOR, LIP.top - STICK_FLOOR, P, 2, 0.4), { tone: 'mid' }), shapes: [A.slab(lip, STICK_FLOOR, LIP.top - STICK_FLOOR)] });

  // The knee: a block that slides along the floor, with a tab over the back wall and a knurled thumb screw on it.
  const block = { x: KNEE.park, y: back.y + back.d, w: KNEE.w, d: LIP.y - back.y - back.d, r: 1 };
  const tab = { x: KNEE.park, y: back.y - 1, w: KNEE.w, d: back.d + 3, r: 1 };
  const [sx, sy] = [KNEE.park + KNEE.w / 2, back.y + 2];
  const knee = S(k.slabOf(block, STICK_FLOOR, BACK_TOP - STICK_FLOOR - 1, P, 2, 0.4), { tone: 'mid' })
    + S(k.slabOf(tab, BACK_TOP, 2, P, 2, 0.3), { tone: 'mid' })
    + S(k.cylinder(sx, sy, 2.6, BACK_TOP + 2, 3, P, 20), { tone: 'mid' }) + L(k.knurl(sx, sy, 2.6, BACK_TOP + 2, BACK_TOP + 5, 16, P, 0.3), { tone: 'lo' })
    + D([at([sx, sy, BACK_TOP + 5])], { size: 0.45 });
  put('knee', { name: 'stick.knee', at: [sx, 22, STICK_FLOOR], svg: `<g data-part="knee">${knee}</g>`, shapes: [A.slab(block, STICK_FLOOR, BACK_TOP - STICK_FLOOR - 1), A.slab(tab, BACK_TOP, 2), A.cylinder(sx, sy, 2.6, BACK_TOP + 2, 3)] });
}

// Brackets engraved on the bench's front edge under the line: subject and predicate, and the clause under both. Each
// tick ends on a drilled dot.
function brackets() {
  const y1 = LIP.y + LIP.d + 4;
  const y2 = y1 + 6;
  const subject = placeOf('subject');
  const bracket = (x1, x2, y) => {
    const ends = [[x1 + 1, y - 2.6], [x2 - 1, y - 2.6]];
    return `<path class="iso-line sx-bracket" d="${k.onTop([ends[0], [x1 + 1, y], [x2 - 1, y], ends[1]], 0, P)}"/>` + D(ends.map(([px, py]) => at([px, py, 0])), { size: 0.6, tone: 'lo' });
  };
  return bracket(subject.x, subject.x + subject.w, y1) + bracket(placeOf('tense').x, LINE_END, y1) + bracket(subject.x, LINE_END, y2);
}

// A sort: a type body with its word on top and a band of its place's colour round the foot. Drawn at rest in its
// compartment; the live code moves it.
function sort(bin) {
  const plan = { x: bin.x, y: CASE_Y, w: bin.w, d: SORT.d, r: 1.4 };
  const z = CASE_FLOOR;
  const band = `<path class="iso-line sx-band" style="--hue:var(--${bin.hue})" d="${k.sideSeam(plan, z + 2, P, 3)}"/>`;
  const nick = L(k.sideSeam(plan, z + SORT.h - 2.4, P, 3), { tone: 'faint' });
  const word = k.faceTextSvg(k.topMatrix([bin.x + bin.w / 2, CASE_Y + SORT.d / 2 + 2.4], z + SORT.h, P, 'x'), bin.text, { size: FONT, tone: 'hi', anchor: 'middle' });
  const svg = `<g class="an-body sx-sort" data-sort="${bin.id}">${S(k.slabOf(plan, z, SORT.h, P, 3, 0.5), { tone: 'hi', crease: 'lo', inner: band + nick + word })}</g>`;
  const i = BINS.indexOf(bin);
  R.solid(A.slab(plan, z, SORT.h, { name: `sort.${bin.id}` }));
  return { i, svg };
}

bench();
typeCase();
stick();
const sorts = BINS.map(sort);
A.settle(R, P);
if (argv.includes('--audit')) A.auditOrExit(R, P);

const band = (name) => R.items.filter((item) => item.band === name).sort((a, b) => a.key - b.key).map((item) => item.svg).join('');
const binSlots = BINS.map((b, i) => band(`bin.${i}`) + `<g data-slot="case-${b.id}">${sorts[i].svg}</g>`).join('') + band(`bin.${BINS.length}`);
const BODY = [
  `<path class="iso-halo" d="${k.haloOf(BASE, FOOT_Z, -FOOT_Z, P)}"/>`,
  band('base'), binSlots, band('caseFront'), band('stickBack'),
  '<g data-slot="stick"></g>', band('knee'), band('stickFront'), band('front'),
  '<g data-slot="air"></g>',
];

// Each sort's moves as keyframes [t, dx, dy, dz] from its compartment, in seconds of one loop.
const PERIOD = 15;
const setAt = (bin, place, t0) => {
  const [dx, dy, dz] = [place.x - bin.x, SORT.y - CASE_Y, STICK_FLOOR - CASE_FLOOR];
  return [[t0, 0, 0, 0], [t0 + 0.35, 0, 0, LIFT - CASE_FLOOR], [t0 + 0.95, dx, dy, LIFT - CASE_FLOOR], [t0 + 1.3, dx, dy, dz]];
};
const back = (frames, t0) => {
  const [, dx, dy, dz] = frames[frames.length - 1];
  return [[t0, dx, dy, dz], [t0 + 0.35, dx, dy, LIFT - CASE_FLOOR], [t0 + 0.95, 0, 0, LIFT - CASE_FLOOR], [t0 + 1.3, 0, 0, 0]];
};
const bin = (id) => BINS.find((b) => b.id === id);
const START = { subject: 0.5, tense: 5.1, verb: 6.6, object: 8.1 };
const MOVES = {};
for (const w of WORDS) MOVES[w.id] = setAt(bin(w.id), placeOf(w.id), START[w.id]);
for (const w of WORDS) MOVES[w.id].push(...back(MOVES[w.id], 12.6).slice(1));
// The refused sort: it comes down onto the tense place, stops short, shakes, and goes home.
{
  const b = bin('wrong');
  const place = placeOf(WRONG.place);
  const dx = place.x + (place.w - b.w) / 2 - b.x;
  const dy = SORT.y - CASE_Y;
  const up = LIFT - CASE_FLOOR;
  const hover = STICK_FLOOR + 7 - CASE_FLOOR;
  const t = 2;
  MOVES.wrong = [[t, 0, 0, 0], [t + 0.35, 0, 0, up], [t + 0.95, dx, dy, up], [t + 1.25, dx, dy, hover],
    [t + 1.37, dx - 1.6, dy, hover], [t + 1.49, dx + 1.6, dy, hover], [t + 1.61, dx - 1.2, dy, hover], [t + 1.73, dx, dy, hover],
    [t + 2.05, dx, dy, up], [t + 2.65, 0, 0, up], [t + 3, 0, 0, 0]];
}
const TIMES = { refuse: [3.25, 3.75], close: [9.5, 9.95], open: [12.1, 12.5] };
const CLOSE = LINE_END - KNEE.park; // how far the knee travels to close on the line

const AXES = { x: k.axisVector(P, [1, 0, 0]), y: k.axisVector(P, [0, 1, 0]), z: k.axisVector(P, [0, 0, 1]) };
const DEPTH = { x: k.depthOf([1, 0, 0], P) - k.depthOf([0, 0, 0], P), y: k.depthOf([0, 1, 0], P) - k.depthOf([0, 0, 0], P) };
const REST = Object.fromEntries(BINS.map((b) => [b.id, [b.x + b.w / 2, CASE_Y + SORT.d / 2]]));
const CASE_TOP = CASE_WALL - CASE_FLOOR;
const ABOVE_STICK = BACK_TOP - STICK_FLOOR;

const LABEL = 'A composing stick in front of a type case. Word sorts are set into the stick in reading order: The committee, has, accepted, the paper. A sort reading have is tried in the tense place first and does not fit. The knee closes the line and the brackets under it light.';
const stage = `<div class="iso an sx" data-theme="dark"><div class="iso-stage sx-stage">${k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BODY })}</div></div>`;
const CSS = k.ISO_CSS + readFileSync(join(HERE, '../kit/anatomy.css'), 'utf8') + readFileSync(join(HERE, 'stick.css'), 'utf8');
const module = `// Generated by build.mjs from the anatomy kit. Do not edit; change build.mjs, stick.css or live.js and rebuild.
const MARKUP = ${JSON.stringify(stage)};
const CSS = ${JSON.stringify(CSS)};
const AXES = ${JSON.stringify(AXES)};
const DEPTH = ${JSON.stringify(DEPTH)};
const REST = ${JSON.stringify(REST)};
const MOVES = ${JSON.stringify(MOVES)};
const TIMES = ${JSON.stringify(TIMES)};
const PERIOD = ${PERIOD};
const CLOSE = ${CLOSE};
const CASE_TOP = ${CASE_TOP};
const ABOVE_STICK = ${ABOVE_STICK};
${readFileSync(join(HERE, 'live.js'), 'utf8')}`;
writeFileSync(join(HERE, 'stick.js'), module);
console.log(`wrote stick.js · ${(module.length / 1024).toFixed(0)} KB · ${R.items.length} items · line ends at ${LINE_END.toFixed(1)}, knee parked at ${KNEE.park.toFixed(1)}`);

const page = argv.find((a) => a.startsWith('--page='))?.slice(7);
if (page) {
  const light = argv.includes('--light');
  writeFileSync(page, readFileSync(join(HERE, '../kit/anatomy-page.html'), 'utf8').replace('%TOKENS%', readFileSync(join(HERE, '../kit/tokens.css'), 'utf8')).replace('%THEME%', light ? 'paper' : 'night').replace('%MODULE%', './stick.js').replaceAll('%MOUNT%', 'mountStick'));
  writeFileSync(join(dirname(page), 'stick.js'), module);
  console.log(`wrote ${page}`);
}
