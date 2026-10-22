// Q.E.D.'s illustration (the games hub's card and the level map's hero): its first rule, Detach (modus ponens), as a
// small bench press drawn with the anatomy skill's kit. Two premise cards, "A → B" and "A", sit in holders at the back
// of the bench; each is wired to the press by a trace. A proof runs as one loop: a pulse leaves each premise along its
// trace, the ram comes down and stamps B on the blank card under the die, the card rides the runway into the goal and
// the goal's lamp lights (∎). The premises stay where they are: a rule reads its premises, it does not use them up.
// Each loop proves another instance of the rule (live.js EXAMPLES): the cards' texts change while the press is idle.
//
//   node games/detach/build.mjs                 writes detach.js (the hub's module) next to this file
//   node games/detach/build.mjs --page=x.html   also writes a standalone page for the kit's capture and line checks
//   node games/detach/build.mjs --audit         runs the kit audit
//
// The kit is read from the anatomy skill (ANATOMY_KIT, default ~/.agents/skills/anatomy/kit); only detach.js ships.

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
const argv = process.argv.slice(2);

const WIDTH = 600;
const HEIGHT = 300;

// The bench runs along +x (premises at the back left, goal at the front right); +y is the side facing the viewer.
const BASE = { x: -158, y: -50, w: 316, d: 100, r: 8 };
const BASE_Z = -9;
const FOOT_Z = -14;

const CARD = { w: 34, d: 24, h: 4.4 };
const HOLDER_Z = 3;
const PREMISES = [
  { id: 'imp', text: 'A → B', at: [-118, -22] },
  { id: 'ant', text: 'A', at: [-118, 24] },
];

const BED = { x: -38, y: -38, w: 76, d: 76, r: 5 };
const BED_Z = 10;
const PLATE = k.insetPlan(BED, 6);
const PLATE_Z = BED_Z + 1.2;
const COLUMN = [0, -27];
const HEAD = [0, 0];
const HEAD_R = 12;
const HEAD_Z = [66, 86];
const RAM_R = 4.2;
const DIE = { x: -15, y: -11, w: 30, d: 22, r: 2 };
const DIE_H = 5;
const BLANK_Z = PLATE_Z;
const STROKE = 17; // how far the ram comes down: the die meets the card's top face
const DIE_DOWN = BLANK_Z + CARD.h;
const DIE_UP = DIE_DOWN + STROKE;

const RUNWAY = { x: 38, y: -17, w: 64, d: 34, r: 1.5 };
const GOAL = { x: 102, y: -24, w: 48, d: 48, r: 4 };
const GOAL_AT = 126; // the card's centre when it is home in the goal
const LAMP = [146, -20];
const LAMP_R = 3.6;
const LAMP_Z = PLATE_Z + 15 + LAMP_R;

export const P = k.fitProjection(
  [...k.boxCorners(BASE, FOOT_Z, 0), ...k.boxCorners({ x: -HEAD_R, y: -HEAD_R, w: 2 * HEAD_R, d: 2 * HEAD_R, r: 0 }, 0, HEAD_Z[1] + 6)],
  WIDTH, HEIGHT, { pad: 10, azimuth: 55, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screws = (points, z, ring = 1.7) => L(points.map(([x, y]) => k.ring(x, y, ring, z, P, 16)).join(''), { tone: 'lo' }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.5 });
const VERT = (x, y, z = 0) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const planAt = ([x, y], w, d, r) => ({ x: x - w / 2, y: y - d / 2, w, d, r });

export const R = A.recorder(P);
const put = (item) => R.put({ ...item, shapes: item.shapes.map((shape, i) => R.solid(Object.assign(shape, { name: shape.name ?? (i ? `${item.name}#${i + 1}` : item.name) }))) });

function bench() {
  for (const [x, y] of byDepth(k.corners(BASE, 18))) {
    const svg = S(k.cylinder(x, y, 6.5, FOOT_Z, 1.4, P, 24), { tone: 'lo' }) + S(k.cylinder(x, y, 5, FOOT_Z + 1.4, BASE_Z - FOOT_Z - 1.4, P, 24), { tone: 'mid' });
    put({ name: `stand.foot.${x}.${y}`, at: [x, y, FOOT_Z], svg, shapes: [A.cylinder(x, y, 6.5, FOOT_Z, 1.4, { ground: true }), A.cylinder(x, y, 5, FOOT_Z + 1.4, BASE_Z - FOOT_Z - 1.4)] });
  }
  const seam = L(k.sideSeam(BASE, BASE_Z + 3, P, 8), { tone: 'faint' });
  const svg = S(k.slabOf(BASE, BASE_Z, -BASE_Z, P, 8, 1.2), { tone: 'lo', inner: seam })
    + L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P, 8), { tone: 'faint' })
    + screws(k.corners(BASE, 9), 0);
  put({ name: 'stand.base', at: [0, 0, BASE_Z], bias: 4, svg, shapes: [A.slab(BASE, BASE_Z, -BASE_Z, { ground: true })] });

  // A ruler strip on the front face, a major tick every 20.
  const face = BASE.y + BASE.d;
  const strip = { x: -140, y: face, w: 280, d: 0.6, r: 0.2 };
  const t = k.sideTicks(-136, 136, 4, 5, face + 0.6, -1.6, [1.4, 2.8], P, 'x');
  put({ name: 'stand.ruler', at: [0, face, -4], svg: S(k.slabOf(strip, -6.8, 5.4, P, 2), { tone: 'mid', crease: 'none' }) + L(t.minor, { tone: 'lo' }) + L(t.major, { tone: 'mid' }), shapes: [A.slab(strip, -6.8, 5.4)] });
}

// A premise: a holder with a lip on two sides, the card in it, and a thumb screw that clamps it.
function premise({ id, text, at: [cx, cy] }) {
  const holder = planAt([cx, cy], CARD.w + 8, CARD.d + 8, 3);
  const pocket = k.insetPlan(holder, 3);
  const svg = S(k.slabOf(holder, 0, HOLDER_Z, P, 4, 0.5), { tone: 'mid', inner: L(k.planOutline(pocket, HOLDER_Z, P, 4), { tone: 'lo' }) })
    + D([at([holder.x + 1.6, holder.y + 1.6, HOLDER_Z]), at([holder.x + holder.w - 1.6, holder.y + holder.d - 1.6, HOLDER_Z])], { size: 0.45 });
  put({ name: `premise.${id}.holder`, at: [cx, cy, 0], svg, shapes: [A.slab(holder, 0, HOLDER_Z)] });

  const card = planAt([cx, cy], CARD.w, CARD.d, 2);
  const label = `<g data-text="${id}">${k.faceTextSvg(k.topMatrix([cx, cy + 3.2], HOLDER_Z + CARD.h, P, 'x'), text, { size: 9, tone: 'hi', anchor: 'middle' })}</g>`;
  const inlay = `<path class="iso-line dt-premise" data-premise="${id}" d="${k.planOutline(k.insetPlan(card, 2.2), HOLDER_Z + CARD.h, P, 3)}"/>`;
  put({ name: `premise.${id}.card`, at: [cx, cy, HOLDER_Z], svg: '<g class="an-body">' + S(k.slabOf(card, HOLDER_Z, CARD.h, P, 3, 0.5), { tone: 'hi', crease: 'lo', inner: inlay + label }) + '</g>', shapes: [A.slab(card, HOLDER_Z, CARD.h)] });

  // The clamp screw stands on the holder's back lip.
  const [sx, sy] = [holder.x + holder.w - 6, holder.y + 1.6];
  const screw = S(k.cylinder(sx, sy, 2.2, HOLDER_Z, 1.2, P, 18), { tone: 'mid' }) + S(k.cylinder(sx, sy, 1.6, HOLDER_Z + 1.2, 2.4, P, 16), { tone: 'mid' })
    + L(k.knurl(sx, sy, 1.6, HOLDER_Z + 1.2, HOLDER_Z + 3.6, 10, P, 0.3), { tone: 'lo' }) + D([at([sx, sy, HOLDER_Z + 3.6])], { size: 0.45 });
  put({ name: `premise.${id}.screw`, at: [sx, sy, HOLDER_Z], svg: screw, shapes: [A.cylinder(sx, sy, 2.2, HOLDER_Z, 1.2), A.cylinder(sx, sy, 1.6, HOLDER_Z + 1.2, 2.4)] });
}

// A trace: a flat copper-like strip from a premise's holder to the press bed, bent at 45°, with a pad at each end.
const TRACE_W = 3.2;
const TRACES = {
  imp: [[-97, -22], [-70, -22], [-58, -10], [-38, -10]],
  ant: [[-97, 24], [-70, 24], [-56, 10], [-38, 10]],
};
// Where the pulse runs on, across the bed plate, to the die.
const ON_BED = { imp: [[-32, -10], [-18, -6]], ant: [[-32, 10], [-18, 6]] };

function strip(points, w) {
  // The outline of a polyline widened to w (mitred joins), as a floor ring.
  const left = [];
  const right = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const p = points[i];
    const dir = (u, v) => { const l = Math.hypot(v[0] - u[0], v[1] - u[1]); return [(v[0] - u[0]) / l, (v[1] - u[1]) / l]; };
    const t0 = i ? dir(a, p) : dir(p, b);
    const t1 = i < points.length - 1 ? dir(p, b) : t0;
    const n = [-(t0[1] + t1[1]), t0[0] + t1[0]];
    const nl = Math.hypot(n[0], n[1]);
    const miter = (w / 2) / ((n[0] / nl) * -t0[1] + (n[1] / nl) * t0[0]);
    left.push([p[0] + (n[0] / nl) * miter, p[1] + (n[1] / nl) * miter]);
    right.push([p[0] - (n[0] / nl) * miter, p[1] - (n[1] / nl) * miter]);
  }
  return [...left, ...right.reverse()];
}

function traces() {
  for (const [id, points] of Object.entries(TRACES)) {
    const ring = strip(points, TRACE_W);
    const centre = k.onTop(points, 0.5, P);
    const svg = S(k.extrude(ring, 0, 0.5, P, { convex: false }), { tone: 'lo', crease: 'none', inner: `<path class="iso-line dt-trace" data-trace="${id}" d="${centre}"/>` })
      + D([at([...points[0], 0.5])], { size: 0.9, tone: 'mid' });
    put({ name: `trace.${id}`, at: [-68, points[0][1], 0], bias: -2, svg, shapes: [A.extruded(ring, 0, 0.5)] });
  }
}

function press() {
  // The bed, its plate with the die's seat ringed on it, and a name plate on the front face.
  const face = BED.y + BED.d;
  const bed = S(k.slabOf(BED, 0, BED_Z, P, 6, 0.8), { tone: 'mid', inner: L(k.sideSeam(BED, 3, P, 6), { tone: 'faint' }) });
  put({ name: 'press.bed', at: [0, 0, 0], svg: bed, shapes: [A.slab(BED, 0, BED_Z)] });
  const seat = planAt(HEAD, DIE.w + 6, DIE.d + 6, 3);
  const plateSvg = S(k.slabOf(PLATE, BED_Z, PLATE_Z - BED_Z, P, 5), { tone: 'hi', crease: 'lo', inner: L(k.planOutline(seat, PLATE_Z, P, 3), { tone: 'faint' }) })
    + screws(k.corners(PLATE, 3.2), PLATE_Z, 1.3)
    + Object.entries(ON_BED).map(([id, pts]) => `<path class="iso-line dt-trace" data-trace="${id}" d="${k.onTop(pts, PLATE_Z, P)}"/>`).join('')
    + D(Object.values(ON_BED).map((pts) => at([...pts[0], PLATE_Z])), { size: 0.7, tone: 'mid' });
  put({ name: 'press.plate', at: [0, 0, BED_Z], svg: plateSvg, shapes: [A.slab(PLATE, BED_Z, PLATE_Z - BED_Z)] });
  const name = { x: -20, y: face, w: 40, d: 0.6, r: 0.3 };
  const nameSvg = S(k.slabOf(name, 2.2, 5.6, P, 2), { tone: 'hi', crease: 'none' })
    + k.faceTextSvg(k.sideMatrix([0, face + 0.6, 5], 5, P, 'left'), 'MP · DETACH', { size: 3.2, tone: 'lo', anchor: 'middle' })
    + D([at([name.x + 1.6, face + 0.6, 5]), at([name.x + name.w - 1.6, face + 0.6, 5])], { size: 0.4 });
  put({ name: 'press.name', at: [0, face, 2], svg: nameSvg, shapes: [A.slab(name, 2.2, 5.6)] });

  // The column, standing in a boss at the back of the bed.
  const [cx, cy] = COLUMN;
  const boss = S(k.cylinder(cx, cy, 9, PLATE_Z, 3, P, 40, 0.5), { tone: 'mid' }) + screws(byDepth([[cx - 6.4, cy], [cx + 6.4, cy]]), PLATE_Z + 3, 1.1);
  put({ name: 'press.boss', at: [cx, cy, PLATE_Z], svg: boss, shapes: [A.cylinder(cx, cy, 9, PLATE_Z, 3)] });
  const columnZ = [PLATE_Z + 3, HEAD_Z[0] + 2];
  const column = S(k.cylinder(cx, cy, 6, columnZ[0], columnZ[1] - columnZ[0], P, 40), { tone: 'mid', crease: 'none', inner: L([30, 44].map((z) => k.sideArc(cx, cy, 6, z, P, 24)).join(''), { tone: 'faint' }) });
  put({ name: 'press.column', at: [cx, cy, columnZ[0]], svg: column, shapes: [A.cylinder(cx, cy, 6, columnZ[0], columnZ[1] - columnZ[0])] });
}

// The arm from the column to the head, the head, its cap and the capstan handle; drawn over the ram.
function head() {
  const arm = { x: -8, y: COLUMN[1] - 7, w: 16, d: -COLUMN[1] + 7 - HEAD_R + 3, r: 2 };
  const armZ = [HEAD_Z[0] + 2, HEAD_Z[1] - 4];
  put({ name: 'press.arm', at: [0, (arm.y + arm.y + arm.d) / 2, armZ[0]], svg: S(k.slabOf(arm, armZ[0], armZ[1] - armZ[0], P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(arm, armZ[0] + 4, P, 3), { tone: 'faint' }) }), shapes: [A.slab(arm, armZ[0], armZ[1] - armZ[0], { owner: 'press.head' })] });
  const [hx, hy] = HEAD;
  const body = S(k.cylinder(hx, hy, HEAD_R, HEAD_Z[0], HEAD_Z[1] - HEAD_Z[0], P, 56, 0.6), { tone: 'mid', inner: L([HEAD_Z[0] + 3, HEAD_Z[1] - 3].map((z) => k.sideArc(hx, hy, HEAD_R, z, P, 40)).join(''), { tone: 'faint' }) })
    + screws(byDepth([[hx - 8, hy + 3], [hx + 8, hy + 3]]), HEAD_Z[1], 1.1);
  put({ name: 'press.head', at: [hx, hy, HEAD_Z[0]], svg: body, shapes: [A.cylinder(hx, hy, HEAD_R, HEAD_Z[0], HEAD_Z[1] - HEAD_Z[0], { owner: 'press.head' })] });
  const cap = S(k.cylinder(hx, hy, 5.5, HEAD_Z[1], 3, P, 32, 0.4), { tone: 'mid' }) + L(k.knurl(hx, hy, 5.5, HEAD_Z[1] + 0.4, HEAD_Z[1] + 2.6, 24, P, 0.3), { tone: 'lo' });
  put({ name: 'press.cap', at: [hx, hy, HEAD_Z[1]], svg: cap, shapes: [A.cylinder(hx, hy, 5.5, HEAD_Z[1], 3)] });

  // The capstan: a hub on the head's front-right side, a bar through it with a ball at its end.
  const hubZ = (HEAD_Z[0] + HEAD_Z[1]) / 2;
  const dir = [Math.cos(0.35), Math.sin(0.35), 0];
  const F = G.frameAlong([hx + dir[0] * (HEAD_R - 0.6), hy + dir[1] * (HEAD_R - 0.6), hubZ], dir);
  const hub = S(G.disc(0, 4, 4.4, F, P), { tone: 'mid', inner: L(G.arcOf(F, 2, 4.4, P), { tone: 'faint' }) });
  put({ name: 'press.hub', at: G.pointOf(F, 2, 0, 0), svg: hub, shapes: [A.disc(F, 0, 4, 4.4, { owner: 'press.head' })] });
  const bar = S(G.disc(4, 30, 1.4, F, P), { tone: 'hi', crease: 'lo' });
  put({ name: 'press.bar', at: G.pointOf(F, 17, 0, 0), svg: bar, shapes: [A.disc(F, 4, 30, 1.4)] });
  const knob = G.pointOf(F, 33, 0, 0);
  put({ name: 'press.knob', at: knob, svg: S(G.sphereOf(knob, 3.4, P, { steps: 40 }), { tone: 'mid' }), shapes: [A.ball(knob, 3.4)] });
}

// The ram and the die: one moving item, drawn at rest (up) and moved down by the live code. The rod runs up into the
// head far enough that, with the die all the way down, it still reaches into the head; at rest its top stays under
// the head's top.
const ROD = HEAD_Z[0] + STROKE + 2 - DIE_UP - DIE_H;
function ram() {
  const [hx, hy] = HEAD;
  const die = planAt(HEAD, DIE.w, DIE.d, DIE.r);
  const rod = S(k.cylinder(hx, hy, RAM_R, DIE_UP + DIE_H, ROD, P, 28), { tone: 'hi', crease: 'none', inner: L(k.sideArc(hx, hy, RAM_R, DIE_UP + DIE_H + 9, P, 20), { tone: 'faint' }) });
  const collar = S(k.cylinder(hx, hy, 6.4, DIE_UP + DIE_H, 2.2, P, 32), { tone: 'mid' });
  const dieSvg = S(k.slabOf(die, DIE_UP, DIE_H, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(die, DIE_UP + 2, P, 3), { tone: 'faint' }) });
  put({ name: 'press.ram', at: [hx, hy, DIE_UP], svg: `<g data-part="ram">${dieSvg}${collar}${rod}</g>`, shapes: [A.slab(die, DIE_UP, DIE_H), A.cylinder(hx, hy, 6.4, DIE_UP + DIE_H, 2.2), A.cylinder(hx, hy, RAM_R, DIE_UP + DIE_H + 2.2, ROD - 2.2, { owner: 'press.head' })] });
}

function goal() {
  const runway = S(k.slabOf(RUNWAY, 0, PLATE_Z, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(RUNWAY, 4, P, 3), { tone: 'faint' }) });
  put({ name: 'goal.runway', at: [70, 0, 0], svg: runway, shapes: [A.slab(RUNWAY, 0, PLATE_Z)] });
  for (const side of [-1, 1]) {
    const rail = { x: RUNWAY.x, y: side < 0 ? RUNWAY.y : RUNWAY.y + RUNWAY.d - 3, w: GOAL.x + GOAL.w - 8 - RUNWAY.x, d: 3, r: 1 };
    const svg = S(k.slabOf(rail, PLATE_Z, 2.6, P, 2, 0.3), { tone: 'mid' }) + D([RUNWAY.x + 6, GOAL.x - 6, GOAL.x + 30].map((x) => at([x, rail.y + 1.5, PLATE_Z + 2.6])), { size: 0.4 });
    put({ name: `goal.rail.${side}`, at: [rail.x + rail.w / 2, rail.y + 1.5, PLATE_Z], svg, shapes: [A.slab(rail, PLATE_Z, 2.6)] });
  }
  const target = planAt([GOAL_AT, 0], CARD.w + 2, CARD.d + 2, 2.5);
  const plinth = S(k.slabOf(GOAL, 0, PLATE_Z, P, 4, 0.6), { tone: 'mid', inner: L(k.sideSeam(GOAL, 4, P, 4), { tone: 'faint' }) + `<path class="iso-line dt-target" d="${k.planOutline(target, PLATE_Z, P, 3)}"/>` })
    + k.faceTextSvg(k.sideMatrix([GOAL_AT, GOAL.y + GOAL.d, 6.8], 6.8, P, 'left'), '∎', { size: 9, tone: 'mid', anchor: 'middle' });
  put({ name: 'goal.plinth', at: [GOAL_AT, 0, 0], svg: plinth, shapes: [A.slab(GOAL, 0, PLATE_Z)] });
  // The end stop the card comes to rest against, screwed to the plinth.
  const stop = { x: GOAL.x + GOAL.w - 7, y: -15, w: 4, d: 30, r: 1 };
  put({ name: 'goal.stop', at: [stop.x + 2, 0, PLATE_Z], svg: S(k.slabOf(stop, PLATE_Z, 6, P, 2, 0.4), { tone: 'mid' }) + D([-9, 9].map((y) => at([stop.x + 2, y, PLATE_Z + 6])), { size: 0.45 }), shapes: [A.slab(stop, PLATE_Z, 6)] });
  // The lamp: a post on a boss in the plinth's back corner, a ball on top that lights when the goal is proved.
  const [lx, ly] = LAMP;
  const post = S(k.cylinder(lx, ly, 3.4, PLATE_Z, 1.6, P, 24), { tone: 'mid' }) + S(k.cylinder(lx, ly, 1.2, PLATE_Z + 1.6, LAMP_Z - LAMP_R - PLATE_Z - 1.6 + 0.8, P, 16), { tone: 'hi', crease: 'none' });
  put({ name: 'goal.post', at: [lx, ly, PLATE_Z], svg: post, shapes: [A.cylinder(lx, ly, 3.4, PLATE_Z, 1.6), A.cylinder(lx, ly, 1.2, PLATE_Z + 1.6, LAMP_Z - LAMP_R - PLATE_Z - 1.6 + 0.8, { owner: 'goal.lamp' })] });
  const lamp = [lx, ly, LAMP_Z];
  put({ name: 'goal.lamp', at: lamp, svg: `<g class="dt-lamp an-glow">${S(G.sphereOf(lamp, LAMP_R, P, { steps: 48 }), {})}</g>`, shapes: [A.ball(lamp, LAMP_R, { owner: 'goal.lamp' })] });
}

// The card the press stamps: drawn blank under the die; the live code shows its B, slides it home and fades it.
function proof() {
  const card = planAt(HEAD, CARD.w, CARD.d, 2);
  const label = k.faceTextSvg(k.topMatrix([HEAD[0], HEAD[1] + 3.2], BLANK_Z + CARD.h, P, 'x'), 'B', { size: 9, tone: 'hi', anchor: 'middle' });
  const inlay = L(k.planOutline(k.insetPlan(card, 2.2), BLANK_Z + CARD.h, P, 3), { tone: 'faint' });
  const svg = `<g data-part="proof" class="an-body">${S(k.slabOf(card, BLANK_Z, CARD.h, P, 3, 0.5), { tone: 'hi', crease: 'lo', inner: inlay + `<g data-part="stamp">${label}</g>` })}</g>`;
  put({ name: 'proof.card', at: [HEAD[0], HEAD[1], BLANK_Z], svg, shapes: [A.slab(card, BLANK_Z, CARD.h)] });
}

bench();
PREMISES.forEach(premise);
traces();
press();
goal();
proof();
ram();
head();
A.settle(R, P);
const items = [...R.items].sort((a, b) => a.key - b.key);
if (argv.includes('--audit')) A.auditOrExit(R, P);

// The pulses ride on top of everything they cross, so they go in after the plates they run on.
const pulseRoutes = Object.fromEntries(Object.entries(TRACES).map(([id, points]) => {
  const flat = [...points.map(([x, y]) => at([x, y, 0.5])), ...ON_BED[id].map(([x, y]) => at([x, y, PLATE_Z]))];
  return [id, flat.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])];
}));
const pulses = Object.keys(TRACES).map((id) => `<circle class="dt-pulse" data-pulse="${id}" r="2.2" cx="${pulseRoutes[id][0][0]}" cy="${pulseRoutes[id][0][1]}"/>`).join('');
const plateAt = items.findIndex((item) => item.name === 'press.plate');
const BODY = [`<path class="iso-halo" d="${k.haloOf(BASE, FOOT_Z, -FOOT_Z, P)}"/>`, ...items.slice(0, plateAt + 1).map((item) => item.svg), pulses, ...items.slice(plateAt + 1).map((item) => item.svg)];

// Screen offsets of one world unit, so the live code moves the ram along z and the card along x.
const AXES = { x: k.axisVector(P, [1, 0, 0]), z: k.axisVector(P, [0, 0, 1]) };
const SLIDE = GOAL_AT - HEAD[0];

const LABEL = 'A small bench press for the rule Detach. Two premise cards, such as A implies B and A, sit in holders at the back and are wired to the press. The ram stamps the conclusion, such as B, on a card, which rides a runway into the goal, and the goal lamp lights. Each round proves another example.';
const stage = `<div class="iso an dt" data-theme="dark"><div class="iso-stage dt-stage">${k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BODY })}</div></div>`;
const CSS = k.ISO_CSS + readFileSync(join(HERE, '../kit/anatomy.css'), 'utf8') + readFileSync(join(HERE, 'detach.css'), 'utf8');
const module = `// Generated by build.mjs from the anatomy kit. Do not edit; change build.mjs, detach.css or live.js and rebuild.
const MARKUP = ${JSON.stringify(stage)};
const CSS = ${JSON.stringify(CSS)};
const AXES = ${JSON.stringify(AXES)};
const STROKE = ${STROKE};
const SLIDE = ${SLIDE};
const ROUTES = ${JSON.stringify(pulseRoutes)};
${readFileSync(join(HERE, 'live.js'), 'utf8')}`;
writeFileSync(join(HERE, 'detach.js'), module);
console.log(`wrote detach.js · ${(module.length / 1024).toFixed(0)} KB · ${R.items.length} items`);

const page = argv.find((a) => a.startsWith('--page='))?.slice(7);
if (page) {
  const light = argv.includes('--light');
  writeFileSync(page, readFileSync(join(HERE, '../kit/anatomy-page.html'), 'utf8').replace('%TOKENS%', readFileSync(join(HERE, '../kit/tokens.css'), 'utf8')).replace('%THEME%', light ? 'paper' : 'night').replace('%MODULE%', './detach.js').replaceAll('%MOUNT%', 'mountDetach'));
  writeFileSync(join(dirname(page), 'detach.js'), module);
  console.log(`wrote ${page}`);
}
