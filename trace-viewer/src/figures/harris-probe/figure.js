import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, floorPoint, follow, viewBoxPoint } from '../common.js'
import { CORNER_AT, HALF, K, KIND_LABEL, STATIONS, STEP, cost, measure } from './model.js'

// Fig · The Harris probe.
// A stepped test plate is the image: the raised block is bright, the low floor dark, so the plate
// carries a flat region, a straight edge and a corner. A gantry carries a square window (17 × 17 pixels)
// over it; at each stop the stage jogs the window round a small circle of shifts (u, v). A polar chart
// draws E(u, v) for every direction, two dial gauges read λ1 and λ2 of M, and a column reads
// R = det M − k (tr M)²; its slider trips the lamp above the corner threshold.

const W = 640
const H = 380
const BASE = { x: -76, y: -82, w: 152, d: 164, r: 8 }
const PLATE = { x: -52, y: -52, w: 96, d: 104, r: 2 }
const PLATE_TOP = 8
const BLOCK_TOP = PLATE_TOP + 5
const BLOCK = { x: PLATE.x + 2, y: PLATE.y + 2, w: STEP.x - PLATE.x - 2, d: STEP.y - PLATE.y - 2, r: 0.8 }
const OUTER = HALF + 3
const FRAME = [BLOCK_TOP + 1.5, BLOCK_TOP + 3.5]
const BACK = -HALF - 1.5 // beam and stem sit over the window's far bar
const SADDLE = 23
const BEAM = [28, 33]
const RAIL_Y = 64
const RAIL = { x: -64, w: 104 }
const RANGE = { x: [PLATE.x + OUTER + 1, PLATE.x + PLATE.w - OUTER - 1], y: [PLATE.y + OUTER + 1, PLATE.y + PLATE.d - OUTER - 1] }
const CHART = [59, 40]
const CHART_R = 13
const CHART_TOP = 6
const DIALS = [[59, 12], [59, -13]]
const DIAL_R = 10
const DIAL_Z = 9
const DIAL_TOP = 13
const DIAL_FULL = 1.2
const COLUMN = { x: 55, y: -44, w: 6, d: 6, r: 1 }
const COLUMN_TOP = 36
const R_ZERO = 15
const R_SCALE = 60
const SHIFT = 1.8 // drawn jog radius, plate units
const ORBIT = 1.8 // s per turn of the jog

const P = k.fitProjection(
  [...k.boxCorners(BASE, -17, 0), [COLUMN.x, COLUMN.y, COLUMN_TOP + 7], [-60, -68, BEAM[1]], [-60, 68, BEAM[1]]],
  W,
  H,
  { pad: 24, azimuth: 32 },
)
const A = (32 * Math.PI) / 180
const DIAL_MID = A - Math.PI / 2 // dial angle that points away from the viewer
const DIAL_SPAN = Math.PI * 1.5

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const rz = (R) => R_ZERO + clamp(R, -0.1, 0.3) * R_SCALE

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(BASE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(BASE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(BASE, 10)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // Ruler strip beside the near rail: one tick per 4 pixels, a long one every 20.
  const strip = { x: RAIL.x + 6, y: RAIL_Y + 6.5, w: RAIL.w - 12, d: 6, r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 4, 5, strip.y, 0.6, [1.6, 2.8], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))

  // Label plate at the near right corner.
  const label = { x: 50, y: -72, w: 16, d: 16, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 11], [7, 7], [11, 9]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 2 + dx, label.y + 4], [label.x + 2 + dx, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

function rail(y) {
  const plan = { x: RAIL.x, y: y - 3, w: RAIL.w, d: 6, r: 1 }
  const out = [S(k.slabOf(plan, 0, 4, P, 3, 0.4), { tone: 'mid' })]
  out.push(L(k.lineOnTop([plan.x, y], [plan.x + plan.w, y], 4, P), { tone: 'faint' }))
  out.push(D([plan.x + 8, plan.x + plan.w / 2, plan.x + plan.w - 8].map((x) => at([x, y, 4])), { size: 0.42 }))
  for (const x of [RAIL.x - 6, RAIL.x + RAIL.w]) {
    out.push(S(k.slabOf({ x, y: y - 7, w: 6, d: 14, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: 'mid' }))
    out.push(D([at([x + 3, y - 3.5, 8]), at([x + 3, y + 3.5, 8])], { size: 0.45 }))
  }
  return out.join('')
}

// The x handwheel on the front stop of the near rail.
function xKnob() {
  const F = G.frameAlong([RAIL.x + RAIL.w + 6, RAIL_Y, 4.4], [1, 0, 0])
  const knob = G.solidOf([[0, 1.3], [2, 1.3], [2, 3.4], [6, 3.4]], F, P)
  return S(knob, { tone: 'mid' }) + k.fadedSvg(G.ribsOf(F, 2, 6, 3.4, 24, P, { fade: [0.1, 0.55], seams: true }), { tone: 'lo' })
}

// The test plate: a stepped block (bright) on a low floor (dark), with a grid scribed every 8 pixels.
function plate() {
  const out = [S(k.slabOf(PLATE, 0, PLATE_TOP, P, 3, 0.6), { tone: 'mid', className: 'hp-floor', inner: L(k.sideSeam(PLATE, 3, P, 3), { tone: 'faint' }) })]
  const x1 = PLATE.x + PLATE.w
  const y1 = PLATE.y + PLATE.d
  const low = []
  for (let v = -40; v <= 40; v += 8) {
    // Lines across x (constant x): over the block they stop on its far face.
    low.push(k.lineOnTop([v, v < STEP.x ? STEP.y : PLATE.y], [v, y1], PLATE_TOP, P))
  }
  for (let v = -48; v <= 48; v += 8) low.push(k.lineOnTop([v < STEP.y ? STEP.x : PLATE.x, v], [x1, v], PLATE_TOP, P))
  out.push(L(low.join(''), { tone: 'faint' }))
  const top = []
  for (let v = -40; v < STEP.x; v += 8) top.push(k.lineOnTop([v, BLOCK.y], [v, STEP.y], BLOCK_TOP, P))
  for (let v = -40; v < STEP.y; v += 8) top.push(k.lineOnTop([BLOCK.x, v], [STEP.x, v], BLOCK_TOP, P))
  out.push(S(k.slabOf(BLOCK, PLATE_TOP, BLOCK_TOP - PLATE_TOP, P, 3, 0.5), { tone: 'hi', crease: 'lo', inner: L(k.sideSeam(BLOCK, PLATE_TOP + 2, P, 3), { tone: 'faint' }) }))
  out.push(L(top.join(''), { tone: 'faint' }))
  out.push(D([[x1 - 3, PLATE.y + 3], [x1 - 3, y1 - 3], [PLATE.x + 3, y1 - 3]].map(([x, y]) => at([x, y, PLATE_TOP])), { size: 0.45 }))
  out.push(D([at([BLOCK.x + 2.5, BLOCK.y + 2.5, BLOCK_TOP])], { size: 0.45 }))
  return out.join('')
}

// A rail block and its upright, built at x = 0 and moved with the beam.
function upright(y) {
  const out = []
  const shoe = { x: BACK - 6, y: y - 5, w: 12, d: 10, r: 1.2 }
  out.push(S(k.slabOf(shoe, 4, 3.5, P, 3, 0.5), { tone: 'mid' }))
  out.push(D(k.corners(shoe, 2).map(([x, yy]) => at([x, yy, 7.5])), { size: 0.42 }))
  const post = { x: BACK - 3, y: y - 3, w: 6, d: 6, r: 1 }
  out.push(S(k.slabOf(post, 7.5, BEAM[0] - 7.5, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(post, 11, P, 3), { tone: 'faint' }) }))
  return out.join('')
}

function beam() {
  const plan = { x: BACK - 4, y: -RAIL_Y - 4, w: 8, d: RAIL_Y * 2 + 8, r: 1.2 }
  const out = [S(k.slabOf(plan, BEAM[0], BEAM[1] - BEAM[0], P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(plan, BEAM[0] + 1.6, P, 3), { tone: 'faint' }) })]
  const ticks = k.topTicks(-56, 56, 4, 5, plan.x, BEAM[1], [1.6, 3], P, 'y')
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(D([-RAIL_Y, RAIL_Y].map((y) => at([BACK, y, BEAM[1]])), { size: 0.45 }))
  // y handwheel on the near end of the beam.
  const F = G.frameAlong([BACK, plan.y + plan.d, (BEAM[0] + BEAM[1]) / 2], [0, 1, 0])
  out.push(S(G.solidOf([[0, 1.1], [1.6, 1.1], [1.6, 3], [5, 3]], F, P), { tone: 'mid' }))
  out.push(k.fadedSvg(G.ribsOf(F, 1.6, 5, 3, 22, P, { fade: [0.1, 0.55], seams: true }), { tone: 'lo' }))
  return out.join('')
}

// The probe: window frame, stem and the lower half of the saddle (under the beam), at (0, 0).
function probe() {
  const out = []
  const z = FRAME[0]
  const h = FRAME[1] - FRAME[0]
  const bars = [
    { x: -OUTER, y: -OUTER, w: 3, d: OUTER * 2, r: 0.6 },
    { x: -HALF, y: -OUTER, w: HALF * 2, d: 3, r: 0.4 },
    { x: -HALF, y: HALF, w: HALF * 2, d: 3, r: 0.4 },
    { x: HALF, y: -OUTER, w: 3, d: OUTER * 2, r: 0.6 },
  ]
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan({ x: -OUTER, y: -OUTER, w: OUTER * 2, d: OUTER * 2, r: 1 }, 2), FRAME[0], 0.1, P)}" style="filter:blur(5px);opacity:calc(var(--anatomy-halo-opacity) * .45)"/>`)
  for (const bar of bars) out.push(S(k.slabOf(bar, z, h, P, 2, 0.35), { tone: 'hi', lit: true }))
  // Reticle wires across the window, ending on the inner faces of the bars.
  out.push(L(k.lineOnTop([-HALF, 0], [HALF, 0], FRAME[1] - 0.4, P) + k.lineOnTop([0, -HALF], [0, HALF], FRAME[1] - 0.4, P), { tone: 'mid' }))
  out.push(D([[-OUTER + 1.5, -OUTER + 1.5], [HALF + 1.5, -OUTER + 1.5], [-OUTER + 1.5, OUTER - 1.5], [HALF + 1.5, OUTER - 1.5]].map(([x, y]) => at([x, y, FRAME[1]])), { size: 0.42, tone: 'hi' }))
  out.push(S(k.cylinder(BACK, 0, 2, FRAME[1], 0.8, P, 18), { tone: 'mid' }))
  out.push(S(k.cylinder(BACK, 0, 1.1, FRAME[1] + 0.8, SADDLE - FRAME[1] - 0.8, P, 14), { tone: 'mid', crease: 'none', inner: L(k.sideArc(BACK, 0, 1.1, 19, P, 10), { tone: 'faint' }) }))
  out.push(S(k.slabOf({ x: BACK - 5.2, y: -5, w: 1.2, d: 10, r: 0.3 }, SADDLE, BEAM[1] + 1.2 - SADDLE, P, 2), { tone: 'mid', crease: 'none' }))
  out.push(S(k.slabOf({ x: BACK - 3.5, y: -5, w: 8.7, d: 10, r: 0.8 }, SADDLE, BEAM[0] - SADDLE, P, 3, 0.4), { tone: 'mid' }))
  return out.join('')
}

// The saddle's front cheek and top plate, drawn over the beam.
function saddleTop() {
  const out = [S(k.slabOf({ x: BACK + 4, y: -5, w: 1.2, d: 10, r: 0.3 }, BEAM[0], BEAM[1] - BEAM[0], P, 2), { tone: 'mid', crease: 'none' })]
  const plate = { x: BACK - 5.2, y: -5, w: 10.4, d: 10, r: 0.8 }
  out.push(S(k.slabOf(plate, BEAM[1], 1.2, P, 3, 0.4), { tone: 'mid' }))
  out.push(D(k.corners(plate, 1.8).map(([x, y]) => at([x, y, BEAM[1] + 1.2])), { size: 0.42 }))
  return out.join('')
}

function chart() {
  const [x, y] = CHART
  const out = []
  out.push(S(k.cylinder(x, y, CHART_R + 2.2, 0, 2.4, P, 60), { tone: 'lo' }))
  out.push(S(k.cylinder(x, y, CHART_R, 2.4, CHART_TOP - 2.4, P, 60, 0.7), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.knurl(x, y, CHART_R, CHART_TOP - 2, CHART_TOP, 60, P, 0.3), { tone: 'lo' }))
  const face = CHART_R - 1.6
  out.push(L(k.ring(x, y, face, CHART_TOP, P, 64), { tone: 'lo' }))
  out.push(L(k.ring(x, y, face * 0.5, CHART_TOP, P, 48), { tone: 'faint' }))
  // u and v axes across the chart, ending on the bezel ring.
  out.push(L(k.lineOnTop([x - face, y], [x + face, y], CHART_TOP, P) + k.lineOnTop([x, y - face], [x, y + face], CHART_TOP, P), { tone: 'faint' }))
  const ticks = k.radialTicks(x, y, face, 24, 6, CHART_TOP, [0.9, 1.8], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  return out.join('')
}

function dial([x, y]) {
  const out = []
  out.push(S(k.slabOf({ x: x - 6, y: y - 6, w: 12, d: 12, r: 1.5 }, 0, 3, P, 3, 0.5), { tone: 'mid' }))
  out.push(D(k.corners({ x: x - 6, y: y - 6, w: 12, d: 12 }, 1.6).map(([px, py]) => at([px, py, 3])), { size: 0.4 }))
  out.push(S(k.cylinder(x, y, 2.4, 3, DIAL_Z - 3, P, 18), { tone: 'mid', crease: 'none' }))
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_TOP - DIAL_Z, P, 56, 0.8), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 2.2, DIAL_TOP, 60, P, 0.3), { tone: 'lo' }))
  out.push(L(k.ring(x, y, DIAL_R - 1.8, DIAL_TOP, P, 56), { tone: 'lo' }))
  const ticks = k.radialTicks(x, y, DIAL_R - 2.2, 12, 5, DIAL_TOP, [1, 2.2], P, DIAL_MID - DIAL_SPAN / 2, DIAL_SPAN)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  // Crown on the side away from the chart.
  out.push(S(k.slabOf({ x: x - 1.6, y: y - DIAL_R - 3, w: 3.2, d: 3.4, r: 0.8 }, DIAL_Z + 1, 2.4, P, 2), { tone: 'mid' }))
  return out.join('')
}

const needle = ([x, y], value) => {
  const angle = DIAL_MID - DIAL_SPAN / 2 + (clamp(value, 0, DIAL_FULL) / DIAL_FULL) * DIAL_SPAN
  return k.lineOnTop([x - Math.sin(angle) * 2, y + Math.cos(angle) * 2], [x + Math.sin(angle) * (DIAL_R - 3), y - Math.cos(angle) * (DIAL_R - 3)], DIAL_TOP + 0.2, P)
}

// The R column: a scale from −0.1 to 0.3 on its near face, a trip stop at the corner threshold, a lamp on top.
function column() {
  const out = []
  const foot = k.insetPlan(COLUMN, -3)
  out.push(S(k.slabOf(foot, 0, 3, P, 3, 0.5), { tone: 'mid' }))
  out.push(D(k.corners(foot, 1.4).map(([x, y]) => at([x, y, 3])), { size: 0.42 }))
  out.push(S(k.slabOf(COLUMN, 3, COLUMN_TOP - 3, P, 2, 0.5), { tone: 'mid' }))
  const face = COLUMN.x + COLUMN.w
  const minor = []
  const major = []
  for (let step = -4; step <= 12; step++) {
    const z = rz(step * 0.025)
    ;(step % 4 === 0 ? major : minor).push(k.segment([face, COLUMN.y, z], [face, COLUMN.y + (step % 4 === 0 ? 2.8 : 1.8), z], P))
  }
  out.push(L(minor.join(''), { tone: 'lo' }), L(major.join(''), { tone: 'mid' }))
  out.push(L(k.segment([face, COLUMN.y, R_ZERO], [face, COLUMN.y + COLUMN.d, R_ZERO], P), { tone: 'hi' }))
  // Trip stop on the near-left face at R = CORNER_AT.
  const trip = rz(CORNER_AT)
  out.push(S(k.slabOf({ x: COLUMN.x + 1.2, y: COLUMN.y + COLUMN.d, w: 3.6, d: 1.6, r: 0.4 }, trip - 0.7, 1.4, P, 2), { tone: 'mid' }))
  out.push(S(k.slabOf(k.insetPlan(COLUMN, -1), COLUMN_TOP, 2, P, 2, 0.4), { tone: 'mid' }))
  return out.join('')
}

const LAMP = [COLUMN.x + COLUMN.w / 2, COLUMN.y + COLUMN.d / 2]
function lamp() {
  const [x, y] = LAMP
  return S(k.cylinder(x, y, 2.6, COLUMN_TOP + 2, 2.2, P, 24), { tone: 'mid', inner: L(k.sideArc(x, y, 2.6, COLUMN_TOP + 3.1, P, 16), { tone: 'faint' }) })
    + `<g class="hp-lens">${S(G.sphereOf([x, y, COLUMN_TOP + 4.2], 2.3, P), { tone: 'hi' })}${D([at([x - 0.7, y - 0.4, COLUMN_TOP + 5.8])], { size: 0.5, tone: 'faint' })}</g>`
}

const slider = (z) => {
  const plan = { x: COLUMN.x + COLUMN.w, y: COLUMN.y + 3.8, w: 2.4, d: 2.8, r: 0.5 }
  return S(k.slabOf(plan, z - 1, 2, P, 2), { tone: 'hi', crease: 'lo' })
}

// ---------- the live figure ----------

export const meta = { id: 'harris-probe', fig: 'Fig 11.1', title: 'Harris 探测台' }

export const css = `
.hp-floor>.iso-top{fill:var(--anatomy-shade-1)}
.hp-lamp[data-on] .hp-lens .iso-shade,.hp-lamp[data-on] .hp-lens .iso-fill{fill:var(--anatomy-hi);stroke:var(--anatomy-hi)}
.hp-lamp[data-on] .hp-lens .iso-dots circle{fill:var(--anatomy-paper);opacity:.9}
.hp-lens .iso-shade,.hp-lens .iso-fill{transition:fill 260ms ease,stroke 260ms ease}
`

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      '检测 Harris 角点的探测台。台上的试板带一个凸起的台阶块，块面亮、地面暗，因此试板上有平坦区、一条直边和一个角。龙门架带着一个方形探测窗在试板上移动；每到一处，窗口绕小圆晃动一圈，极坐标盘画出各个方向的位移代价 E，两块表读出矩阵 M 的两个特征值，立柱上的滑块读出响应 R，越过角点阈值时顶上的指示灯亮起。',
    body: [
      base(),
      rail(-RAIL_Y),
      `<g data-part="upright-far">${upright(-RAIL_Y)}</g>`,
      plate(),
      rail(RAIL_Y),
      xKnob(),
      `<g data-part="probe">${probe()}</g>`,
      `<g data-part="upright-near">${upright(RAIL_Y)}</g>`,
      `<g data-part="beam">${beam()}</g>`,
      `<g data-part="saddle">${saddleTop()}</g>`,
      column(),
      '<g data-part="slider"></g>',
      `<g class="hp-lamp" data-part="lamp">${lamp()}</g>`,
      ...DIALS.slice().reverse().map((point, index) => `${dial(point)}<path data-part="needle-${1 - index}" class="iso-line" data-tone="hi" data-free="start" style="stroke-width:1.1" d=""/>${D([at([point[0], point[1], DIAL_TOP + 0.2])], { size: 0.7, tone: 'hi' })}`),
      chart(),
      '<path data-part="trace" class="iso-line" data-tone="hi" style="stroke-width:.9" d=""/>',
      '<g data-part="pen"></g>',
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="探测位置">
    <div class="fx-control"><span>位置</span>${STATIONS.map((s, index) => `<button type="button" data-set="station" data-value="${index}">${s.label}</button>`).join('')}</div>
  </div>
  <div class="fx-calc"><span>M =</span><b data-calc="m"></b><i>·</i><span>R = AC − B² − k(A + C)² =</span><b data-calc="r"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '悬停试板 · 方向键',
      readout: '',
      keys: [
        { mark: 'lit', label: '探测窗：17 × 17 像素的图块' },
        { mark: 'raised', label: '两块表：λ1（左）与 λ2（右）' },
        { mark: 'flat', label: '圆盘：各方向的 E(u, v)' },
      ],
      caption: `试板的高度就是亮度：凸块亮、地面暗。窗口每到一处就绕小圆晃一圈，圆盘画出沿各方向移动的代价 E(u, v) ≈ [u v] M [u v]ᵀ：平坦处缩成一点，直边处是“8”字，只沿跨边方向变大；角点处接近一个圆，最弱方向也不小。两块表读出这条曲线的最长和最短半径 λ1、λ2；立柱读出 R = λ1λ2 − k(λ1 + λ2)²（k = ${K}），越过阈值时灯亮。数值按“直边 λ1 = 1”归一化。`,
      body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Harris 探测台。方向键移动探测窗，数字键 1、2、3 跳到平坦、边缘、角点，空格重新晃动测量。">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = {
    probe: part('probe'),
    saddle: part('saddle'),
    beam: part('beam'),
    far: part('upright-far'),
    near: part('upright-near'),
    slider: part('slider'),
    lamp: part('lamp'),
    trace: part('trace'),
    pen: part('pen'),
    needles: [part('needle-0'), part('needle-1')],
  }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const start = STATIONS[0]
  const state = {
    x: start.x,
    y: start.y,
    tx: start.x,
    ty: start.y,
    jog: 0, // seconds into the current jog, or −1 when done
    phi: 0,
    amp: 0,
    dials: [0, 0],
    r: 0,
    station: 0,
    touring: true,
    hold: 0,
  }

  function draw() {
    const m = measure(state.x, state.y)
    const u = Math.cos(state.phi) * state.amp
    const v = Math.sin(state.phi) * state.amp
    nodes.beam.setAttribute('transform', k.translateAlong(P, [state.x + u, 0, 0]))
    nodes.far.setAttribute('transform', k.translateAlong(P, [state.x + u, 0, 0]))
    nodes.near.setAttribute('transform', k.translateAlong(P, [state.x + u, 0, 0]))
    const both = k.translateAlong(P, [state.x + u, state.y + v, 0])
    nodes.probe.setAttribute('transform', both)
    nodes.saddle.setAttribute('transform', both)
    nodes.needles.forEach((node, index) => node.setAttribute('d', needle(DIALS[index], state.dials[index])))
    nodes.slider.innerHTML = slider(rz(state.r))
    if (state.r > CORNER_AT) nodes.lamp.setAttribute('data-on', '')
    else nodes.lamp.removeAttribute('data-on')

    // Polar chart: radius ∝ E for a unit shift in each direction; the pen sits at the jog's direction.
    const face = CHART_R - 1.6
    const radius = (phi) => Math.min(face - 0.4, (face - 0.6) * cost(m, phi))
    const points = Array.from({ length: 73 }, (_, index) => {
      const phi = (index / 72) * Math.PI * 2
      const r = radius(phi)
      return [CHART[0] + Math.cos(phi) * r, CHART[1] + Math.sin(phi) * r]
    })
    nodes.trace.setAttribute('d', m.l1 > 0.004 ? k.onTop(points, CHART_TOP + 0.1, P, true) : '')
    const r = radius(state.phi)
    const tip = [CHART[0] + Math.cos(state.phi) * r, CHART[1] + Math.sin(state.phi) * r]
    nodes.pen.innerHTML = (r > 0.3 ? L(k.lineOnTop(CHART, tip, CHART_TOP + 0.15, P), { tone: 'mid' }) : '') + D([at([CHART[0], CHART[1], CHART_TOP + 0.15])], { size: 0.6, tone: 'mid' }) + D([at([tip[0], tip[1], CHART_TOP + 0.2])], { size: 0.9, tone: 'hi' })

    const text = `λ1 ${m.l1.toFixed(2)} · λ2 ${m.l2.toFixed(2)} · R ${m.R.toFixed(2)} · ${KIND_LABEL[m.kind]}`
    if (readout.textContent !== text) readout.textContent = text
    const f = (value) => value.toFixed(2)
    calc.m.textContent = `[${f(m.A)} ${f(m.B)}; ${f(m.B)} ${f(m.C)}]`
    calc.r.textContent = `${m.det.toFixed(3)} − ${K} × ${f(m.trace)}² = ${m.R.toFixed(3)}`
  }

  function describe() {
    const m = measure(state.tx, state.ty)
    stage.setAttribute('aria-valuetext', `窗口在 (${Math.round(state.tx)}, ${Math.round(state.ty)})，λ1 ${m.l1.toFixed(2)}，λ2 ${m.l2.toFixed(2)}，R ${m.R.toFixed(2)}，${KIND_LABEL[m.kind]}`)
    buttons.forEach((button, index) => {
      const s = STATIONS[index]
      button.setAttribute('aria-pressed', String(Math.hypot(s.x - state.tx, s.y - state.ty) < 0.5))
    })
  }

  function tick(dt, calm) {
    state.x = follow(state.x, state.tx, dt, 0.45, calm)
    state.y = follow(state.y, state.ty, dt, 0.45, calm)
    const arrived = Math.hypot(state.x - state.tx, state.y - state.ty) < 0.4
    // Jog: two turns of a small circle once the window has arrived, eased in and out.
    if (calm) {
      state.jog = -1
      state.amp = 0
      state.phi = 0
    } else if (state.jog >= 0 && arrived) {
      state.jog += dt
      const total = ORBIT * 2
      const ease = (t) => t * t * (3 - 2 * t)
      state.amp = SHIFT * ease(clamp(state.jog / 0.4, 0, 1)) * ease(clamp((total - state.jog) / 0.4, 0, 1))
      state.phi = ((state.jog / ORBIT) % 1) * Math.PI * 2
      if (state.jog >= total) {
        state.jog = -1
        state.amp = 0
        state.phi = 0
      }
    }
    const m = measure(state.x, state.y)
    let moving = !arrived || state.jog >= 0 || state.x !== state.tx || state.y !== state.ty
    ;[m.l1, m.l2].forEach((value, index) => {
      state.dials[index] = follow(state.dials[index], value, dt, 0.22, calm)
      if (Math.abs(state.dials[index] - value) < 1e-3) state.dials[index] = value
      moving = moving || state.dials[index] !== value
    })
    state.r = follow(state.r, m.R, dt, 0.22, calm)
    if (Math.abs(state.r - m.R) < 1e-4) state.r = m.R
    moving = moving || state.r !== m.R

    if (state.touring && !calm) {
      if (state.jog < 0 && arrived) state.hold += dt
      if (state.hold > 1.4) {
        state.hold = 0
        go(STATIONS[(state.station + 1) % STATIONS.length], (state.station + 1) % STATIONS.length)
      }
      moving = true
    }
    draw()
    return moving
  }

  function go(point, station = -1) {
    const x = clamp(point.x, RANGE.x[0], RANGE.x[1])
    const y = clamp(point.y, RANGE.y[0], RANGE.y[1])
    if (Math.hypot(x - state.tx, y - state.ty) > 0.25) state.jog = 0
    state.tx = x
    state.ty = y
    if (station >= 0) state.station = station
    describe()
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.hold = 0
    loop.run()
  }, 5000)
  const steer = (point, station) => {
    state.touring = false
    go(point, station)
    idle.touch()
    loop.run()
  }
  const onPointer = (event) => {
    const [x, y] = floorPoint(viewBoxPoint(svg, event), PLATE_TOP, P)
    if (x < PLATE.x - 6 || x > PLATE.x + PLATE.w + 6 || y < PLATE.y - 6 || y > PLATE.y + PLATE.d + 6) return
    steer({ x, y })
  }
  const onKey = (event) => {
    const step = event.shiftKey ? 12 : 4
    const moves = { ArrowLeft: [0, step], ArrowRight: [0, -step], ArrowUp: [-step, 0], ArrowDown: [step, 0] }
    if (moves[event.key]) steer({ x: state.tx + moves[event.key][0], y: state.ty + moves[event.key][1] })
    else if (['1', '2', '3'].includes(event.key)) steer(STATIONS[Number(event.key) - 1], Number(event.key) - 1)
    else if (event.key === ' ' || event.key === 'Enter') {
      state.jog = 0
      steer({ x: state.tx, y: state.ty })
    } else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set="station"]')
    if (!button) return
    const index = Number(button.dataset.value)
    state.jog = 0
    steer(STATIONS[index], index)
  }

  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerdown', onPointer)
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)
  if (loop.still.matches) {
    state.touring = false
    const corner = STATIONS[2]
    Object.assign(state, { x: corner.x, y: corner.y, tx: corner.x, ty: corner.y, station: 2, jog: -1 })
  }
  describe()
  tick(1 / 60, true)
  if (!loop.still.matches) state.jog = 0
  loop.run()

  return () => {
    loop.stop()
    idle.clear()
    stage.removeEventListener('pointermove', onPointer)
    stage.removeEventListener('pointerdown', onPointer)
    stage.removeEventListener('keydown', onKey)
    root.removeEventListener('click', onButton)
  }
}
