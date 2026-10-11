import * as k from '../kit/iso-kit.js'
import { applyOrder, clamp, createIdle, createLoop, follow, svgNode } from '../common.js'
import { BINS, HALF, ballots, grid, makePoints, peakOf, rhoOf } from './model.js'

// Fig · The Hough voting machine.
// Twelve edge pins stand on a board. A turntable arm through the board's centre points along the normal
// at angle θ; a slider on it carries a straightedge, and the slider sits where the straightedge passes
// through the pin being read, so its distance from the centre is ρ = x cos θ + y sin θ. As the arm
// sweeps 0–180°, a token chute on a gantry follows the same θ across an accumulator tray and the same ρ
// along it, dropping one token per θ column into the (θ, ρ) cup: each pin lays a sinusoid of tokens.
// After every pin has voted, the tallest stack is the line; the arm parks on it and the line is scribed.

const W = 640
const H = 380
const BASE = { x: -58, y: -90, w: 100, d: 192, r: 8 }
const TRAY = { cx: 0, cy: -36 }
const TRAY_PLAN = { x: -33, y: TRAY.cy - 40, w: 66, d: 80, r: 2.5 }
const TRAY_TOP = 5
const SPAN = 72 // tray length for 180°
const TOKEN = 1.3 // token thickness
const RAIL_X = 42
const BEAM = [27, 31]
const NOZZLE = 19
const CHUTE_OFF = 5 // chute centre in front of the beam centre
const BS = 1.5 // board units per pixel
const BOARD_C = [0, 60]
const BOARD = { x: -(HALF + 3) * BS, y: BOARD_C[1] - (HALF + 3) * BS, w: (HALF + 3) * BS * 2, d: (HALF + 3) * BS * 2, r: 3 }
const BOARD_Z = 6
const PIN_H = 5
const EDGE_Z = BOARD_Z + PIN_H + 0.2 // straightedge underside
const ARM_Z = EDGE_Z + 1.5
const ARM_LEN = 27 * BS
const RATE = { slow: 45, fast: 260 } // degrees per second of sweep
const G = 420 // token fall, units / s²

const P = k.fitProjection([...k.boxCorners(BASE, -17, 0), [0, TRAY.cy + 20, BEAM[1] + 11], [RAIL_X, TRAY.cy - 40, BEAM[1]], [-RAIL_X, TRAY.cy + 40, BEAM[1]]], W, H, { pad: 24, azimuth: 30, elevation: 38 })

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const [VX, VY] = k.towardViewer(P)
const RAD = Math.PI / 180

// Tray mapping: θ runs along −y (left to right on screen), ρ along x, one unit per pixel.
const cupOf = (bins) => (SPAN * bins.dTheta) / 180
const yOf = (theta, bins) => TRAY.cy + SPAN / 2 - (theta / bins.dTheta + 0.5) * cupOf(bins)
const xOf = (rho) => TRAY.cx + rho
const board = (point) => [BOARD_C[0] + point.x * BS, BOARD_C[1] + point.y * BS]

function barRing(cx, cy, angle, length, width, along = 0) {
  const [ux, uy] = [Math.cos(angle), Math.sin(angle)]
  const [nx, ny] = [-uy, ux]
  const ox = cx + ux * along
  const oy = cy + uy * along
  return [
    [ox - ux * length / 2 - nx * width / 2, oy - uy * length / 2 - ny * width / 2],
    [ox + ux * length / 2 - nx * width / 2, oy + uy * length / 2 - ny * width / 2],
    [ox + ux * length / 2 + nx * width / 2, oy + uy * length / 2 + ny * width / 2],
    [ox - ux * length / 2 + nx * width / 2, oy - uy * length / 2 + ny * width / 2],
  ]
}

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(BASE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(BASE, 10)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
  // Label plate in the gap between the tray and the board.
  const label = { x: 18, y: 9, w: 14, d: 14, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 9], [6.5, 6], [10, 8]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 1 + dx, label.y + 4], [label.x + 1 + dx, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

// Twin rails behind the tray carry the gantry's single post along θ.
function rails() {
  const out = []
  const y = TRAY.cy - 46
  for (const x of [-RAIL_X - 4, -RAIL_X + 4]) {
    const plan = { x: x - 2, y, w: 4, d: 92, r: 0.8 }
    out.push(S(k.slabOf(plan, 0, 4, P, 3, 0.4), { tone: 'mid' }))
    out.push(D([y + 8, y + 46, y + 84].map((py) => at([x, py, 4])), { size: 0.4 }))
  }
  for (const py of [y - 6, y + 92]) {
    out.push(S(k.slabOf({ x: -RAIL_X - 8, y: py, w: 16, d: 6, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: 'mid' }))
    out.push(D([at([-RAIL_X - 4, py + 3, 8]), at([-RAIL_X + 4, py + 3, 8])], { size: 0.45 }))
  }
  return out.join('')
}

// The accumulator tray: a plate with the (θ, ρ) cup grid scribed on it and scales on two margins.
function tray(bins) {
  const g = grid(bins)
  const cup = cupOf(bins)
  const y0 = TRAY.cy - SPAN / 2
  const y1 = TRAY.cy + SPAN / 2
  const out = [S(k.slabOf(TRAY_PLAN, 0, TRAY_TOP, P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(TRAY_PLAN, 2, P, 3), { tone: 'faint' }) })]
  const box = { x: xOf(-g.edge), y: y0, w: g.edge * 2, d: SPAN, r: 0 }
  const lines = []
  for (let j = 1; j < g.columns.length; j++) lines.push(k.lineOnTop([box.x, y0 + j * cup], [box.x + box.w, y0 + j * cup], TRAY_TOP, P))
  for (let i = 1; i < g.rows.length; i++) {
    const x = box.x + i * bins.dRho
    lines.push(k.lineOnTop([x, y0], [x, y1], TRAY_TOP, P))
  }
  out.push(L(lines.join(''), { tone: 'faint' }))
  out.push(L(k.planOutline(box, TRAY_TOP, P, 1), { tone: 'lo' }))
  // θ scale on the near margin (a long tick every 30°), ρ scale on the left margin (a long tick every 12).
  const minor = []
  const major = []
  g.columns.forEach((theta) => (theta % 30 === 0 ? major : minor).push(k.lineOnTop([box.x + box.w, yOf(theta, bins)], [box.x + box.w + (theta % 30 === 0 ? 2.4 : 1.4), yOf(theta, bins)], TRAY_TOP, P)))
  g.rows.forEach((rho) => (rho % 12 === 0 ? major : minor).push(k.lineOnTop([xOf(rho), y1], [xOf(rho), y1 + (rho % 12 === 0 ? 2.4 : 1.4)], TRAY_TOP, P)))
  out.push(L(minor.join(''), { tone: 'lo' }), L(major.join(''), { tone: 'mid' }))
  out.push(D(k.corners(TRAY_PLAN, 1.6).map(([x, y]) => at([x, y, TRAY_TOP])), { size: 0.42 }))
  return out.join('')
}

// The rail shoe, post and cantilever beam, built at y = 0 and moved along θ.
function gantry() {
  const x = -RAIL_X
  const shoe = { x: x - 8, y: -7, w: 16, d: 14, r: 1.4 }
  const post = { x: x - 4, y: -4, w: 8, d: 8, r: 1.2 }
  const collar = { x: x - 5.4, y: -5.4, w: 10.8, d: 10.8, r: 1.4 }
  const plan = { x: x - 4, y: -2.5, w: RAIL_X + 33 + 4, d: 5, r: 1.2 }
  const out = [S(k.slabOf(shoe, 4, 3.5, P, 3, 0.5), { tone: 'mid' })]
  out.push(D(k.corners(shoe, 2).map(([px, py]) => at([px, py, 7.5])), { size: 0.42 }))
  out.push(S(k.slabOf(post, 7.5, BEAM[0] - 9.5, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(post, 11, P, 3), { tone: 'faint' }) }))
  out.push(S(k.slabOf(collar, BEAM[0] - 2, 2, P, 3, 0.4), { tone: 'mid' }))
  out.push(S(k.slabOf(plan, BEAM[0], BEAM[1] - BEAM[0], P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(plan, BEAM[0] + 1.4, P, 3), { tone: 'faint' }) }))
  const ticks = k.topTicks(-27, 27, 3, 4, plan.y, BEAM[1], [1.2, 2.2], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(D([at([x - 2, -1.2, BEAM[1]]), at([x + 2, 1.2, BEAM[1]])], { size: 0.45 }))
  out.push(S(k.slabOf({ x: 33, y: -3.2, w: 2, d: 6.4, r: 0.6 }, BEAM[0] - 0.6, BEAM[1] - BEAM[0] + 1.2, P, 2, 0.3), { tone: 'mid' }))
  return out.join('')
}

// The chute carriage on the beam's front face, built at x = 0, y = 0 (the nozzle's axis).
function chute() {
  const out = []
  const ny = 0
  out.push(S(k.cylinder(0, ny, 1.2, NOZZLE, BEAM[0] - 2 - NOZZLE, P, 16), { tone: 'mid', crease: 'none', inner: L(k.sideArc(0, ny, 1.2, NOZZLE + 2, P, 10), { tone: 'faint' }) }))
  out.push(S(k.cylinder(0, ny, 2.4, BEAM[0] - 2, 1.4, P, 20), { tone: 'mid' }))
  const block = { x: -4, y: -CHUTE_OFF + 2.5, w: 8, d: 5, r: 1 }
  out.push(S(k.slabOf(block, BEAM[0] - 0.6, BEAM[1] - BEAM[0] + 1.6, P, 3, 0.5), { tone: 'mid' }))
  out.push(D([[-2.6, block.y + 1.2], [2.6, block.y + 1.2]].map(([x, y]) => at([x, y, BEAM[1] + 1])), { size: 0.4 }))
  // Token magazine standing on the carriage.
  out.push(S(k.cylinder(0, ny, 2.6, BEAM[1] + 1, 9, P, 24), { tone: 'mid', inner: L([3, 6].map((dz) => k.sideArc(0, ny, 2.6, BEAM[1] + 1 + dz, P, 16)).join(''), { tone: 'faint' }) }))
  out.push(S(k.cylinder(0, ny, 3.1, BEAM[1] + 10, 1.2, P, 24, 0.3), { tone: 'mid' }))
  out.push(D([at([0, ny, BEAM[1] + 11.2])], { size: 0.5, tone: 'mid' }))
  return out.join('')
}

function boardArt() {
  const out = [S(k.slabOf(BOARD, 0, BOARD_Z, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(BOARD, 2.5, P, 4), { tone: 'faint' }) })]
  const inner = (HALF + 1) * BS
  const [cx, cy] = BOARD_C
  out.push(L(k.planOutline({ x: cx - inner, y: cy - inner, w: inner * 2, d: inner * 2, r: 1.2 }, BOARD_Z, P, 3), { tone: 'lo' }))
  const lines = []
  for (let v = -12 * BS; v <= 12 * BS; v += 6 * BS) lines.push(k.lineOnTop([cx + v, cy - inner], [cx + v, cy + inner], BOARD_Z, P), k.lineOnTop([cx - inner, cy + v], [cx + inner, cy + v], BOARD_Z, P))
  out.push(L(lines.join(''), { tone: 'faint' }))
  out.push(D(k.corners(BOARD, 2.2).map(([x, y]) => at([x, y, BOARD_Z])), { size: 0.45 }))
  return out.join('')
}

const hubSvg = () => {
  const [x, y] = BOARD_C
  return S(k.cylinder(x, y, 4.6, BOARD_Z, 0.8, P, 24), { tone: 'lo' }) + S(k.cylinder(x, y, 3.2, BOARD_Z + 0.8, 3.8, P, 20), { tone: 'mid', inner: L(k.sideArc(x, y, 3.2, BOARD_Z + 3, P, 14), { tone: 'faint' }) })
}

function pinSvg(point, mode) {
  const [x, y] = board(point)
  const tone = mode === 'idle' ? 'mid' : 'hi'
  const lit = mode === 'now'
  return S(k.cylinder(x, y, 2.6, BOARD_Z, 0.6, P, 18), { tone: 'lo' })
    + S(k.cylinder(x, y, 1.2, BOARD_Z + 0.6, PIN_H - 1.8, P, 14), { tone, crease: 'none', lit })
    + S(k.cylinder(x, y, 2.1, BOARD_Z + PIN_H - 1.2, 1.2, P, 18), { tone, crease: tone === 'hi' ? 'lo' : 'faint', lit })
}

// Straightedge, arm and slider at angle theta (degrees) with the slider at rho. The straightedge hangs
// under the arm just clear of the pin caps, so it lies on the candidate line through the pin.
function armSvg(theta, rho) {
  const angle = theta * RAD
  const [cx, cy] = BOARD_C
  const [ux, uy] = [Math.cos(angle), Math.sin(angle)]
  const [dx, dy] = [-uy, ux]
  const sx = cx + ux * rho * BS
  const sy = cy + uy * rho * BS
  const out = [S(k.cylinder(cx, cy, 0.9, BOARD_Z + 4.6, ARM_Z - BOARD_Z - 4.6, P, 12), { tone: 'mid', crease: 'none' })]
  out.push(S(k.extrude(barRing(sx, sy, angle + Math.PI / 2, 64, 2.2), EDGE_Z, 0.9, P), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.lineOnTop([sx - dx * 32, sy - dy * 32], [sx + dx * 32, sy + dy * 32], EDGE_Z + 0.9, P), { tone: 'mid' }))
  // The arm's two halves, far one first; the pivot screw sits flush on top.
  const halves = [-1, 1].sort((a, b) => a * (ux * VX + uy * VY) - b * (ux * VX + uy * VY))
  for (const side of halves) out.push(S(k.extrude(barRing(cx, cy, angle, ARM_LEN, 3.2, (side * ARM_LEN) / 2), ARM_Z, 1.2, P), { tone: 'mid' }))
  out.push(L(k.ring(cx, cy, 1.1, ARM_Z + 1.2, P, 14), { tone: 'lo' }) + D([at([cx, cy, ARM_Z + 1.2])], { size: 0.45 }))
  out.push(S(k.extrude(barRing(sx, sy, angle, 5, 4.4), EDGE_Z + 0.9, ARM_Z + 1.8 - EDGE_Z - 0.9, P), { tone: 'mid' }))
  out.push(D([at([sx + dx * 1.3, sy + dy * 1.3, ARM_Z + 1.8]), at([sx - dx * 1.3, sy - dy * 1.3, ARM_Z + 1.8])], { size: 0.42 }))
  return out.join('')
}

function stackSvg(x, y, count, radius, lit) {
  if (count <= 0) return ''
  const height = count * TOKEN
  const seams = Array.from({ length: count - 1 }, (_, n) => k.sideArc(x, y, radius, TRAY_TOP + (n + 1) * TOKEN, P, 12)).join('')
  const stack = S(k.cylinder(x, y, radius, TRAY_TOP, height, P, 20), { tone: 'hi', crease: 'lo', lit, inner: seams ? L(seams, { tone: 'mid' }) : '' })
  if (!lit) return stack
  // The peak gets a marker collar clipped round its top token.
  const z = TRAY_TOP + height - TOKEN / 2
  const ring = (d) => `<path class="iso-line" data-tone="lit" style="stroke-width:1.2" d="${d}"/>`
  return ring(k.ring(x, y, radius + 0.6, z, P, 32)) + stack + ring(k.sideArc(x, y, radius + 0.6, z, P, 20))
}

const tokenSvg = (x, y, z, radius) => S(k.cylinder(x, y, radius, z, TOKEN, P, 20), { tone: 'hi', crease: 'lo' })

// Clip a line (theta, rho) to the board's inner groove.
function scribe(theta, rho) {
  const angle = theta * RAD
  const [nx, ny] = [Math.cos(angle), Math.sin(angle)]
  const [dx, dy] = [-ny, nx]
  const inner = HALF + 1
  let lo = -1e4
  let hi = 1e4
  for (const [p, d] of [[rho * nx, dx], [rho * ny, dy]]) {
    if (Math.abs(d) < 1e-9) continue
    const a = (-inner - p) / d
    const b = (inner - p) / d
    lo = Math.max(lo, Math.min(a, b))
    hi = Math.min(hi, Math.max(a, b))
  }
  if (lo >= hi) return ''
  const [cx, cy] = BOARD_C
  return k.lineOnTop([cx + (rho * nx + dx * lo) * BS, cy + (rho * ny + dy * lo) * BS], [cx + (rho * nx + dx * hi) * BS, cy + (rho * ny + dy * hi) * BS], BOARD_Z, P)
}

// ---------- the live figure ----------

export const meta = { id: 'hough-accumulator', fig: 'Fig 12.2', title: 'Hough 投票机' }

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      'Hough 变换的投票机。左边的板上立着十二根边缘点钉，中心转轴带一根指向法向 θ 的臂，臂上的滑块带着一把直尺，直尺始终穿过正在读取的钉，滑块离中心的距离就是 ρ。右边龙门上的投币槽跟着同一个 θ 和 ρ 在累加盘上方移动，每经过一列就往对应的 (θ, ρ) 格投下一枚筹码。所有钉投完后，最高的一摞就是检测到的直线，直尺停在这条线上并把它刻在板上。',
    body: [
      base(),
      rails(),
      '<g data-part="tray"></g>',
      '<path data-part="trace" class="iso-line" data-tone="mid" d=""/><g data-part="pen"></g>',
      '<g data-part="columns"></g>',
      boardArt(),
      '<g data-part="scribe"></g>',
      '<g data-part="pins"></g>',
      '<g data-part="arm"></g>',
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="Hough 设置">
    <div class="fx-control"><span>分箱</span>${Object.values(BINS).map((b) => `<button type="button" data-set="bins" data-value="${b.name}">${b.label}</button>`).join('')}</div>
    <div class="fx-control"><span>投票</span><button type="button" data-set="step">下一点 ›</button><button type="button" data-set="all">全部</button><button type="button" data-set="restart">重来</button></div>
  </div>
  <div class="fx-calc"><span data-calc="label"></span><b data-calc="value"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '空格 · A 全部 · R',
      readout: '',
      keys: [
        { mark: 'lit', label: '正在投票的点（结束后：峰值那一摞）' },
        { mark: 'raised', label: '筹码摞：每格的票数' },
        { mark: 'flat', label: '直尺：候选直线 (θ, ρ)' },
      ],
      caption:
        '臂指向直线的法向 θ，直尺始终穿过正在读取的钉，所以滑块离中心的距离就是 ρ = x cos θ + y sin θ。臂扫过 0–180°，投币槽在累加盘上沿同一条正弦曲线每列投一枚：一个点在参数空间里是一条曲线。九个近似共线的点的曲线在同一格相交，筹码堆成最高的一摞；三个外点的票散落各处，摞不起来。分箱太细，带噪声的票会被拆进相邻格，峰值变矮。',
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Hough 投票机。空格投下一点，A 全部投完，R 重来，B 切换分箱。">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { tray: part('tray'), trace: part('trace'), pen: part('pen'), columns: part('columns'), scribe: part('scribe'), pins: part('pins'), arm: part('arm') }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]
  const points = makePoints()
  const N = points.length

  const state = {
    bins: BINS.coarse,
    plan: null,
    counts: null,
    columnNodes: [],
    gantry: null,
    dirty: new Set(),
    falling: [],
    index: 0, // point being read
    pending: 0, // points allowed to vote
    sweeping: false,
    dir: 1,
    theta: 0,
    rho: 0,
    rate: RATE.slow,
    wait: 0,
    touring: true,
    tour: { phase: 0, clock: 0 },
    pinsFor: '',
    park: 0,
    final: false,
  }

  const g = () => grid(state.bins)
  const sweepFrom = () => (state.dir > 0 ? -state.bins.dTheta / 2 : 180 - state.bins.dTheta / 2)
  const sweepTo = () => (state.dir > 0 ? 180 - state.bins.dTheta / 2 : -state.bins.dTheta / 2)
  const done = () => state.index >= N && !state.sweeping && state.falling.length === 0
  const radius = () => (state.bins.name === 'coarse' ? 2.2 : 1.15)

  function reset(bins = state.bins) {
    state.bins = bins
    state.plan = ballots(points, bins)
    state.counts = g().columns.map(() => g().rows.map(() => 0))
    state.falling = []
    state.index = 0
    state.pending = 0
    state.sweeping = false
    state.dir = 1
    state.theta = sweepFrom()
    state.rho = rhoOf(points[0], state.theta)
    state.wait = 0
    state.park = 0
    nodes.tray.innerHTML = tray(bins)
    nodes.columns.innerHTML = ''
    state.columnNodes = g().columns.map((_, j) => {
      const node = svgNode('')
      node.dataset.column = j
      return node
    })
    state.gantry = svgNode(`<g data-part="beam">${gantry()}</g><g data-part="chute">${chute()}</g>`)
    state.dirty = new Set(state.columnNodes.map((_, j) => j))
    buttons.forEach((button) => {
      if (button.dataset.set === 'bins') button.setAttribute('aria-pressed', String(button.dataset.value === bins.name))
    })
  }

  // Start the next sweep if one is allowed.
  function begin() {
    if (state.sweeping || state.index >= N || state.index >= state.pending) return
    state.sweeping = true
    state.theta = sweepFrom()
  }

  function land(token) {
    state.counts[token.j][token.i] += 1
    state.dirty.add(token.j)
  }

  // Release every column centre crossed between a and b.
  function release(a, b) {
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    g().columns.forEach((theta, j) => {
      if (theta > lo && theta <= hi) {
        const i = state.plan[state.index][j]
        state.falling.push({ j, i, age: 0, x0: xOf(rhoOf(points[state.index], theta)) })
        state.dirty.add(j)
      }
    })
  }

  function finishSweep() {
    state.sweeping = false
    state.index += 1
    state.dir = -state.dir
    state.wait = 0.15
  }

  // Under reduced motion (or a jump), a whole point votes at once.
  function voteNow() {
    if (state.index >= N) return
    state.plan[state.index].forEach((i, j) => land({ i, j }))
    state.theta = sweepTo()
    finishSweep()
  }

  function columnSvg(j, peak) {
    const bins = state.bins
    const y = yOf(g().columns[j], bins)
    const items = g().rows.map((rho, i) => ({ key: xOf(rho), svg: stackSvg(xOf(rho), y, state.counts[j][i], radius(), peak && peak.j === j && peak.i === i) }))
    state.falling.filter((token) => token.j === j).forEach((token) => {
      const top = TRAY_TOP + state.counts[j][token.i] * TOKEN
      const fall = Math.sqrt((2 * (NOZZLE - TOKEN - top)) / G)
      const share = clamp(token.age / fall, 0, 1)
      const z = NOZZLE - TOKEN - 0.5 * G * token.age * token.age
      const x = token.x0 + (xOf(g().rows[token.i]) - token.x0) * share * share
      items.push({ key: x + 0.01, svg: tokenSvg(x, y, Math.max(top, z), radius()) })
    })
    return items.sort((a, b) => a.key - b.key).map((item) => item.svg).join('')
  }

  function draw() {
    const bins = state.bins
    const final = done() ? peakOf(state.counts, bins) : null
    // Gantry and chute follow the arm: θ along the tray, ρ across it.
    const yc = yOf(state.theta, bins)
    // Once the peak is read the chute parks off the grid so the peak stands clear.
    const xc = xOf(state.rho + (-g().edge - 2 - state.rho) * state.park)
    state.gantry.querySelector('[data-part="beam"]').setAttribute('transform', k.translateAlong(P, [0, yc - CHUTE_OFF, 0]))
    state.gantry.querySelector('[data-part="chute"]').setAttribute('transform', k.translateAlong(P, [xc, yc, 0]))
    if (Boolean(final) !== state.final) {
      state.final = Boolean(final)
      state.columnNodes.forEach((_, j) => state.dirty.add(j))
    }
    state.dirty.forEach((j) => (state.columnNodes[j].innerHTML = columnSvg(j, final)))
    state.dirty = new Set(state.falling.map((token) => token.j))
    // Columns far to near, the gantry after the last column at or behind the chute.
    const order = []
    state.columnNodes.forEach((node, j) => order.push({ key: yOf(g().columns[j], bins), node }))
    order.push({ key: yc + 0.01, node: state.gantry })
    applyOrder(nodes.columns, order.sort((a, b) => a.key - b.key).map((item) => item.node))

    // The current point's sinusoid traced under the chute, from the sweep's start to the arm.
    const point = points[Math.min(state.index, N - 1)]
    if (state.sweeping) {
      const from = sweepFrom()
      const steps = Math.max(2, Math.ceil(Math.abs(state.theta - from) / 2))
      const trace = Array.from({ length: steps + 1 }, (_, n) => {
        const theta = from + ((state.theta - from) * n) / steps
        return [xOf(rhoOf(point, theta)), yOf(theta, bins)]
      })
      nodes.trace.setAttribute('d', k.onTop(trace, TRAY_TOP, P))
      nodes.pen.innerHTML = D([at([...trace[trace.length - 1], TRAY_TOP])], { size: 0.7, tone: 'hi' })
    } else {
      nodes.trace.setAttribute('d', '')
      nodes.pen.innerHTML = ''
    }

    const key = `${state.index}:${final ? 'end' : ''}`
    if (state.pinsFor !== key) {
      state.pinsFor = key
      const items = points.map((p, n) => ({ key: k.depthOf([...board(p), 0], P), svg: pinSvg(p, !final && n === state.index ? 'now' : n < state.index ? 'hi' : 'idle') }))
      items.push({ key: k.depthOf([...BOARD_C, 0], P), svg: hubSvg() })
      nodes.pins.innerHTML = items.sort((a, b) => a.key - b.key).map((item) => item.svg).join('')
      nodes.scribe.innerHTML = final ? L(scribe(final.theta, final.rho), { tone: 'hi' }) : ''
    }
    nodes.arm.innerHTML = armSvg(state.theta, state.rho)

    let text
    if (final) {
      text = `峰值 ${final.votes} 票 · θ ${final.theta}° · ρ ${final.rho}`
      calc.label.textContent = '最高一摞 (θ, ρ) ='
      calc.value.textContent = `(${final.theta}°, ${final.rho}) · ${final.votes} / ${N} 点投中`
    } else {
      const theta = clamp(state.theta, 0, 180)
      text = `第 ${Math.min(state.index + 1, N)}/${N} 点 · θ ${Math.round(theta)}° · ρ ${state.rho.toFixed(1)}`
      calc.label.textContent = 'ρ = x cos θ + y sin θ ='
      calc.value.textContent = `${point.x.toFixed(1)} cos ${Math.round(theta)}° + ${point.y.toFixed(1)} sin ${Math.round(theta)}° = ${rhoOf(point, theta).toFixed(1)}`
    }
    if (readout.textContent !== text) readout.textContent = text
  }

  function tick(dt, calm) {
    if (state.touring && !calm) tour(dt)
    if (calm) {
      while (state.index < state.pending) voteNow()
      state.falling.forEach(land)
      state.falling = []
    }
    // Tokens in flight.
    state.falling.forEach((token) => (token.age += dt))
    const landed = state.falling.filter((token) => {
      const top = TRAY_TOP + state.counts[token.j][token.i] * TOKEN
      return NOZZLE - TOKEN - 0.5 * G * token.age * token.age <= top
    })
    landed.forEach(land)
    state.falling = state.falling.filter((token) => !landed.includes(token))

    let targetRho = state.rho
    if (state.sweeping) {
      const before = state.theta
      const end = sweepTo()
      state.theta += state.dir * state.rate * dt
      if ((state.dir > 0 && state.theta >= end) || (state.dir < 0 && state.theta <= end)) state.theta = end
      release(before, state.theta)
      state.rho = rhoOf(points[state.index], state.theta)
      if (state.theta === end) finishSweep()
    } else if (done()) {
      const peak = peakOf(state.counts, state.bins)
      state.theta = follow(state.theta, peak.theta, dt, 0.35, calm)
      targetRho = peak.rho
      state.rho = follow(state.rho, targetRho, dt, 0.2, calm)
    } else {
      // Between points: the slider re-seats on the next pin, then the next sweep starts.
      targetRho = rhoOf(points[Math.min(state.index, N - 1)], state.theta)
      state.rho = follow(state.rho, targetRho, dt, 0.08, calm)
      if (Math.abs(state.rho - targetRho) < 0.25) state.rho = targetRho
      state.wait -= dt
      if (state.wait <= 0 && state.rho === targetRho) begin()
    }
    state.park = follow(state.park, done() ? 1 : 0, dt, 0.3, calm)
    draw()
    const settled = state.park === (done() ? 1 : 0) && !state.sweeping && state.falling.length === 0 && state.rho === targetRho && (!done() || state.theta === peakOf(state.counts, state.bins).theta) && state.index >= state.pending
    return state.touring || !settled
  }

  // Idle tour: coarse bins, two pins slowly then the rest quickly, hold on the peak; then fine bins.
  function tour(dt) {
    const t = state.tour
    if (t.phase === 0) {
      reset(t.fine ? BINS.fine : BINS.coarse)
      state.rate = t.fine ? RATE.fast * 0.6 : RATE.slow
      state.pending = t.fine ? N : 2
      t.phase = 1
      t.clock = 0
    } else if (t.phase === 1 && state.index >= 2 && !state.sweeping) {
      state.rate = RATE.fast
      state.pending = N
      t.phase = 2
    } else if (t.phase >= 1 && done()) {
      t.clock += dt
      if (t.clock > 4.5) {
        t.fine = !t.fine
        t.phase = 0
      }
    }
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.tour = { phase: done() ? 2 : 1, clock: 0, fine: state.bins.name === 'fine' }
    if (state.pending < N) state.pending = N
    state.rate = RATE.fast
    loop.run()
  }, 6000)
  const byHand = () => {
    state.touring = false
    idle.touch()
    loop.run()
  }
  const step = () => {
    if (done()) return reset()
    state.rate = RATE.slow
    state.pending = Math.min(N, Math.max(state.pending, state.index + (state.sweeping ? 2 : 1)))
  }
  const all = () => {
    if (done()) reset()
    state.rate = RATE.fast
    state.pending = N
  }
  const onKey = (event) => {
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') step()
    else if (event.key === 'a' || event.key === 'A') all()
    else if (event.key === 'r' || event.key === 'R') reset()
    else if (event.key === 'b' || event.key === 'B') reset(state.bins.name === 'coarse' ? BINS.fine : BINS.coarse)
    else return
    event.preventDefault()
    byHand()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const { set, value } = button.dataset
    if (set === 'bins') reset(BINS[value])
    else if (set === 'step') step()
    else if (set === 'all') all()
    else reset()
    byHand()
  }
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  reset(BINS.coarse)
  if (loop.still.matches) {
    state.touring = false
    state.pending = N
  }
  tick(1 / 60, loop.still.matches)
  loop.run()

  return () => {
    loop.stop()
    idle.clear()
    stage.removeEventListener('keydown', onKey)
    root.removeEventListener('click', onButton)
  }
}
