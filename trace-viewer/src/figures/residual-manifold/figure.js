import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, follow } from '../common.js'
import { BRANCH, DEPTHS, PLAIN, atInput, factorOf, format, gradientAt } from './model.js'

// Fig · The residual manifold.
// A pipe line runs from an input header (left) to a loss tank (right) through L valve blocks, the
// weight layers F. Each block can be bypassed by a loop with a gate valve: the identity shortcut.
// The backward "gradient pressure" starts at 1 in the tank and runs back along the line; every
// block multiplies it by its slope, read on the small gauge at its inlet tee. With the bypass
// valves shut the stack is plain: 0.6 per block, 0.6^L at the input. With them open each block
// gives 1 + g′ and the gauge at the input stays near 1. The lever on each block shows how much
// that block has to carry: wide open when plain, nearly shut when it only learns the residual.

const W = 640
const H = 330
const Z0 = 18 // main line axis
const R_MAIN = 2.6
const R_BY = 1.8
const BALL = 3.4
const ELBOW = 2.6
const Z_TOP = Z0 + 24 // bypass run
const BODY = 9 // half-length of a valve block
const TEE = 13 // tee offset from the block centre
const GX = 13 // gauge column, in front of the line
const Y_IN = 166
const SPAN = [148, -146]
const TANK = [0, -174]
const TANK_R = 12
const BIG = { r: 10, z: Z0 + 16 } // input gauge
const DIAL_SPAN = Math.PI * 1.5
const DIAL_MAX = 1.2

const PLATE = { x: -26, y: -198, w: 58, d: 384, r: 8 }

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [0, SPAN[0], Z_TOP + 10], [0, SPAN[1], Z_TOP + 10], [0, Y_IN, BIG.z + 6], [TANK[0], TANK[1], 48]],
  W,
  H,
  { pad: 16, azimuth: 38 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const plan = (cx, cy, w, d, r = 0.8) => ({ x: cx - w / 2, y: cy - d / 2, w, d, r })
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const [VX, VY] = k.towardViewer(P)
const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n) => String(n).split('').map((d) => SUPER[d]).join('')

// A straight pipe between two points on one axis.
function pipe(a, b, r, style) {
  const axis = G.sub3(b, a)
  return S(G.disc(0, G.len3(axis), r, G.frameAlong(a, axis), P), style)
}
const ball = (c, r, style) => S(G.sphereOf(c, r, P), style)
const boxOf = (a, b, r) => [Math.min(a[0], b[0]) - r, Math.max(a[0], b[0]) + r, Math.min(a[1], b[1]) - r, Math.max(a[1], b[1]) + r, Math.min(a[2], b[2]) - r, Math.max(a[2], b[2]) + r]

// ---------- painter's order, solved once per layout ----------
function screenRect(box) {
  const xs = []
  const ys = []
  for (const x of [box[0], box[1]]) for (const y of [box[2], box[3]]) for (const z of [box[4], box[5]]) {
    const [sx, sy] = at([x, y, z])
    xs.push(sx)
    ys.push(sy)
  }
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
}
function versus(A, B, a, b) {
  const e = 0.01
  if (A[4] >= B[5] - e) return 1
  if (B[4] >= A[5] - e) return -1
  if (VX > 0 && A[0] >= B[1] - e) return 1
  if (VX > 0 && B[0] >= A[1] - e) return -1
  if (VY > 0 && A[2] >= B[3] - e) return 1
  if (VY > 0 && B[2] >= A[3] - e) return -1
  return Math.sign(a - b)
}
function paintOrder(items) {
  items.forEach((item) => {
    item.rect = screenRect(item.box)
    item.key = k.depthOf([(item.box[0] + item.box[1]) / 2, (item.box[2] + item.box[3]) / 2, (item.box[4] + item.box[5]) / 2], P) + (item.bias ?? 0)
  })
  const n = items.length
  const after = Array.from({ length: n }, () => [])
  const waiting = new Array(n).fill(0)
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const [ra, rb] = [items[a].rect, items[b].rect]
      if (ra[0] >= rb[1] || rb[0] >= ra[1] || ra[2] >= rb[3] || rb[2] >= ra[3]) continue
      const [back, front] = versus(items[a].box, items[b].box, items[a].key, items[b].key) > 0 ? [b, a] : [a, b]
      after[back].push(front)
      waiting[front]++
    }
  }
  const done = new Array(n).fill(false)
  const out = []
  for (let step = 0; step < n; step++) {
    let pick = -1
    for (let index = 0; index < n; index++) if (!done[index] && !waiting[index] && (pick < 0 || items[index].key < items[pick].key)) pick = index
    if (pick < 0) pick = done.indexOf(false)
    done[pick] = true
    out.push(items[pick])
    after[pick].forEach((next) => waiting[next]--)
  }
  return out
}

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`]
  const feet = [...k.corners(PLATE, 16), [PLATE.x + 16, 0], [PLATE.x + PLATE.w - 16, 0]]
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4.5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 9)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
  // Depth rule along the front edge: a major tick per block slot of the deepest stack.
  const strip = { x: PLATE.x + PLATE.w - 12, y: SPAN[1], w: 6, d: SPAN[0] - SPAN[1], r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(SPAN[1] + 0.5, SPAN[0] - 0.5, (SPAN[0] - SPAN[1] - 1) / 32, 4, strip.x + 0.6, 0.6, [1.8, 3.4], P, 'y')
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  // Label plate by the input header.
  const label = { x: 8, y: 172, w: 18, d: 10, r: 1.2 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 12], [6, 8], [9, 10]].forEach(([dy, length]) => out.push(L(k.lineOnTop([label.x + 3, label.y + dy - 1], [label.x + 3 + length, label.y + dy - 1], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

function dialFace(cx, cy, r, z, majors) {
  const out = [L(k.ring(cx, cy, r - 1.2, z, P, 48), { tone: 'lo' })]
  const ticks = k.radialTicks(cx, cy, r - 1.2, 12, majors, z, [r * 0.12, r * 0.24], P, -DIAL_SPAN / 2, DIAL_SPAN)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  return out.join('')
}
function needleD(cx, cy, r, z, value) {
  const angle = -DIAL_SPAN / 2 + (clamp(value, 0, DIAL_MAX) / DIAL_MAX) * DIAL_SPAN
  return k.lineOnTop([cx - Math.sin(angle) * r * 0.2, cy + Math.cos(angle) * r * 0.2], [cx + Math.sin(angle) * (r - 2), cy - Math.cos(angle) * (r - 2)], z + 0.1, P)
}

// ---------- the live figure ----------

export const meta = { id: 'residual-manifold', fig: 'Fig 8.1', title: '残差管路' }

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      '底板上的一条管路：左端是输入集管和输入端梯度表，右端是损失罐。中间串着若干个阀块，代表权重层 F。每个阀块都可以被一段带闸阀的旁路管绕过，这就是恒等跳连。梯度压力从损失罐出发沿管路往回传，每经过一块就乘上这一块的斜率，阀块入口的小表读出这一处的梯度。',
    body: [base(), '<g data-part="work"></g>'],
  })
  const button = (set, value, text) => `<button type="button" data-set="${set}" data-value="${value}">${text}</button>`
  const controls = `<div class="fx-controls" role="group" aria-label="管路设置">
    <div class="fx-control"><span>跳连</span>${button('skip', 0, '关')}${button('skip', 1, '开')}</div>
    <div class="fx-control"><span>深度</span>${DEPTHS.map((d) => button('depth', d, `${d} 块`)).join('')}</div>
  </div>
  <div class="fx-calc"><span>∂L/∂x =</span><span data-calc="terms"></span><i>=</i><b data-calc="value"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '空格开关 · ←→深度',
      readout: '',
      keys: [
        { mark: 'lit', label: '输入端梯度表' },
        { mark: 'raised', label: '阀块：权重层 F(x)' },
        { mark: 'flat', label: '旁路管：恒等跳连 x' },
      ],
      caption: `梯度从右端的损失罐出发，以 1 为起点沿管路往回传，每经过一个阀块就乘上它的斜率，入口小表读出这一处的梯度。关上旁路阀就是普通网络：设每块斜率 ${PLAIN}，8 块后只剩 ${PLAIN}⁸ ≈ ${format(PLAIN ** 8)}，靠近输入的层几乎得不到梯度。打开旁路阀，每块输出 F(x) + x，斜率变成 1 + g′：旁路那一份 1 原样通过，分支 F 只需学残差 H(x) − x，g′ 很小（这里在 ±0.08 以内），所以输入端仍读到约 1。`,
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="残差管路。空格开关旁路阀，左右方向键改变深度。">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const work = svg.querySelector('[data-part="work"]')
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const state = {
    depth: 8,
    skip: false,
    open: 0, // bypass valves, 0 shut … 1 open, eased
    front: 0, // the backward wave, in blocks from the loss tank
    phase: 'wave',
    clock: 0,
    touring: true,
  }
  let build = null

  // ----- one layout per depth -----
  function layout() {
    const depth = state.depth
    const pitch = (SPAN[0] - SPAN[1]) / depth
    const centres = Array.from({ length: depth }, (_, n) => SPAN[0] - pitch * (n + 0.5))
    const items = []
    const add = (box, svgText, extra = {}) => {
      const item = { box, svgText, ...extra }
      items.push(item)
      return item
    }
    const rim = (r, sphere) => Math.sqrt(sphere * sphere - r * r)
    const run = (y0, y1) => add(boxOf([0, y0, Z0], [0, y1, Z0], R_MAIN), pipe([0, y0, Z0], [0, y1, Z0], R_MAIN, { tone: 'mid' }))
    const flangePair = (y) => {
      for (const [a, b] of [[y + 1.2, y], [y, y - 1.2]]) add(boxOf([0, a, Z0], [0, b, Z0], 4.2), pipe([0, a, Z0], [0, b, Z0], 4.2, { tone: 'mid' }) + (a > y ? D(G.dotsOf(G.frameAlong([0, a, Z0], [0, 1, 0]), 0, 3.3, 6, P, { all: true }), { size: 0.4 }) : ''))
    }
    // A pipe stand: pad, post and a saddle block whose top touches the underside of the line.
    const support = (y, under = Z0 - R_MAIN) => {
      add([-4, 4, y - 4, y + 4, 0, 1.2], S(k.slabOf(plan(0, y, 8, 8, 1), 0, 1.2, P, 3, 0.4), { tone: 'mid' }) + D(k.corners(plan(0, y, 8, 8), 1.6).map(([x, yy]) => at([x, yy, 1.2])), { size: 0.4 }))
      add([-1.4, 1.4, y - 1.4, y + 1.4, 1.2, under - 1.4], S(k.cylinder(0, y, 1.4, 1.2, under - 2.6, P, 16), { tone: 'mid', crease: 'none' }))
      add([-2.6, 2.6, y - 2, y + 2, under - 1.4, under], S(k.slabOf(plan(0, y, 5.2, 4, 0.6), under - 1.4, 1.4, P, 2), { tone: 'mid' }), { bias: -0.5 })
    }

    // Input header: an end tee with a blind flange, a riser and the big gauge.
    add(boxOf([0, Y_IN, Z0], [0, Y_IN, Z0], BALL), ball([0, Y_IN, Z0], BALL, { tone: 'mid' }))
    add(boxOf([0, Y_IN + rim(R_MAIN, BALL), Z0], [0, Y_IN + 5, Z0], 4.2), pipe([0, Y_IN + rim(R_MAIN, BALL), Z0], [0, Y_IN + 4, Z0], R_MAIN, { tone: 'mid' }) + pipe([0, Y_IN + 4, Z0], [0, Y_IN + 5.4, Z0], 4.2, { tone: 'mid' }) + D(G.dotsOf(G.frameAlong([0, Y_IN + 5.4, Z0], [0, 1, 0]), 0, 3.3, 6, P, { all: true }), { size: 0.4 }))
    add(boxOf([0, Y_IN, Z0 + rim(2, BALL)], [0, Y_IN, BIG.z], 2), pipe([0, Y_IN, Z0 + rim(2, BALL)], [0, Y_IN, BIG.z - 1.2], 2, { tone: 'mid', crease: 'none' }) + S(k.cylinder(0, Y_IN, 3.2, BIG.z - 1.2, 1.2, P, 20), { tone: 'mid' }))
    const bigGauge = add([-BIG.r, BIG.r, Y_IN - BIG.r, Y_IN + BIG.r, BIG.z, BIG.z + 4],
      S(k.cylinder(0, Y_IN, BIG.r, BIG.z, 4, P, 64, 0.6), { tone: 'hi', crease: 'lo' }) + dialFace(0, Y_IN, BIG.r, BIG.z + 4, 5)
      + `<path class="iso-line" data-tone="lit" data-free="" style="stroke-width:1.1" d=""/>` + D([at([0, Y_IN, BIG.z + 4.1])], { size: 0.7, tone: 'hi' }), { gauge: { cx: 0, cy: Y_IN, r: BIG.r, z: BIG.z + 4 } })
    support(Y_IN - 12)

    // Loss tank: plinth, shell, domed head, a gauge that always reads 1, and the inlet flange.
    const [tx, ty] = TANK
    add([tx - TANK_R - 2, tx + TANK_R + 2, ty - TANK_R - 2, ty + TANK_R + 2, 0, 2], S(k.cylinder(tx, ty, TANK_R + 2, 0, 2, P, 64, 0.6), { tone: 'mid' }))
    const shell = G.frameOf([tx, ty, 2], [0, 0, 1], [1, 0, 0], [0, 1, 0])
    const dome = Array.from({ length: 8 }, (_, index) => {
      const t = index / 8
      return [32 + 8 * Math.sin((t * Math.PI) / 2), TANK_R * Math.cos((t * Math.PI) / 2), 1]
    })
    add([tx - TANK_R, tx + TANK_R, ty - TANK_R, ty + TANK_R, 2, 42], S(G.solidOf([[0, TANK_R], [32, TANK_R, 1], ...dome.slice(1)], shell, P), { tone: 'hi', crease: 'lo', inner: L(G.arcOf(shell, 10, TANK_R, P), { tone: 'faint' }) + L(G.arcOf(shell, 22, TANK_R, P), { tone: 'faint' }) }))
    add([tx - 4, tx + 4, ty - 4, ty + 4, 41.5, 47], S(k.cylinder(tx, ty, 1.4, 41.5, 1.5, P, 14), { tone: 'mid', crease: 'none' }) + S(k.cylinder(tx, ty, 4.4, 43, 2.6, P, 36), { tone: 'hi', crease: 'lo' }) + dialFace(tx, ty, 4.4, 45.6, 5)
      + L(needleD(tx, ty, 4.4, 45.6, 1), { tone: 'hi', free: true }) + D([at([tx, ty, 45.7])], { size: 0.45, tone: 'hi' }), { bias: 1 })
    const wall = ty + TANK_R
    add(boxOf([0, wall - 0.4, Z0], [0, wall + 1.6, Z0], 4.2), pipe([0, wall - 0.4, Z0], [0, wall + 1.6, Z0], 4.2, { tone: 'mid' }) + D(G.dotsOf(G.frameAlong([0, wall + 1.6, Z0], [0, 1, 0]), 0, 3.3, 6, P, { all: true }), { size: 0.4 }))

    // Blocks.
    const blocks = centres.map((yc, n) => {
      const up = yc + TEE
      const down = yc - TEE
      add(boxOf([0, up, Z0], [0, up, Z0], BALL), ball([0, up, Z0], BALL, { tone: 'mid' }))
      add(boxOf([0, down, Z0], [0, down, Z0], BALL), ball([0, down, Z0], BALL, { tone: 'mid' }))
      run(up - rim(R_MAIN, BALL), yc + BODY)
      run(yc - BODY, down + rim(R_MAIN, BALL))
      // The valve block: flanged, a bulged body, turned along the line.
      const F = G.frameAlong([0, yc + BODY, Z0], [0, -1, 0])
      const body = [[0, 4.4], [1.2, 4.4], [1.2, 3.2], [3, 3.2], [4, 4.6, 1], [6, 5.9, 1], [9, 6.3, 1], [12, 5.9, 1], [14, 4.6, 1], [15, 3.2], [16.8, 3.2], [16.8, 4.4], [18, 4.4]]
      add([-6.3, 6.3, yc - BODY, yc + BODY, Z0 - 6.3, Z0 + 6.3], S(G.solidOf(body, F, P), { tone: 'hi', crease: 'lo' }) + D([...G.dotsOf(F, 0, 3.6, 6, P, { fade: [0.04, 0.42] }), ...G.dotsOf(F, 18, 3.6, 6, P, { fade: [0.04, 0.42] })], { size: 0.4 }))
      support(yc, Z0 - 6.3)
      // Actuator with the lever that shows how much this block has to carry.
      const top = Z0 + 15
      add([-5, 5, yc - 5, yc + 5, Z0 + 5.5, top],
        S(k.cylinder(0, yc, 2, Z0 + 5.5, 3.5, P, 18), { tone: 'mid', crease: 'none' })
        + S(k.slabOf(plan(0, yc, 10, 10, 1.2), Z0 + 9, top - Z0 - 9, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(plan(0, yc, 10, 10, 1.2), Z0 + 11, P, 3), { tone: 'faint' }) })
        + D(k.corners(plan(0, yc, 10, 10), 1.8).map(([x, y]) => at([x, y, top])), { size: 0.4 }))
      const lever = add([-8.5, 8.5, yc - 8.5, yc + 8.5, top, top + 2], '', { bias: 0.5 })
      // The bypass: legs from both tees, elbows, a run with a gate valve in the middle.
      const legBottom = Z0 + rim(R_BY, BALL)
      const legTop = Z_TOP - rim(R_BY, ELBOW)
      const bypass = []
      for (const y of [up, down]) {
        bypass.push(add(boxOf([0, y, legBottom], [0, y, legTop], R_BY), '', { pipe: [[0, y, legBottom], [0, y, legTop]] }))
        bypass.push(add(boxOf([0, y, Z_TOP], [0, y, Z_TOP], ELBOW), '', { ball: [0, y, Z_TOP] }))
      }
      const valveHalf = 4.5
      bypass.push(add(boxOf([0, up - rim(R_BY, ELBOW), Z_TOP], [0, yc + valveHalf, Z_TOP], R_BY), '', { pipe: [[0, up - rim(R_BY, ELBOW), Z_TOP], [0, yc + valveHalf, Z_TOP]] }))
      bypass.push(add(boxOf([0, yc - valveHalf, Z_TOP], [0, down + rim(R_BY, ELBOW), Z_TOP], R_BY), '', { pipe: [[0, yc - valveHalf, Z_TOP], [0, down + rim(R_BY, ELBOW), Z_TOP]] }))
      const gate = add([-3.6, 3.6, yc - valveHalf, yc + valveHalf, Z_TOP - 3.4, Z_TOP + 12], '', { bias: 0.4 })
      // Inlet gauge on a post in front of the upstream tee, with its sense nipple.
      const gz = Z0 + 0.6
      add(boxOf([3.0, up, Z0 - 1.2], [GX - 4.6, up, Z0 - 1.2], 0.7), pipe([3.0, up, Z0 - 1.2], [GX - 4.6, up, Z0 - 1.2], 0.7, { tone: 'mid', crease: 'none' }))
      add([GX - 1.4, GX + 1.4, up - 1.4, up + 1.4, 0, Z0 - 3], S(k.cylinder(GX, up, 2.6, 0, 1, P, 20), { tone: 'mid' }) + S(k.cylinder(GX, up, 1.2, 1, Z0 - 4, P, 14), { tone: 'mid', crease: 'none' }))
      const gauge = add([GX - 4.6, GX + 4.6, up - 4.6, up + 4.6, Z0 - 3, gz],
        S(k.cylinder(GX, up, 4.6, Z0 - 3, gz - Z0 + 3, P, 40, 0.4), { tone: 'hi', crease: 'lo' }) + dialFace(GX, up, 4.6, gz, 5)
        + `<path class="iso-line" data-tone="hi" data-free="" d=""/>` + D([at([GX, up, gz + 0.1])], { size: 0.45, tone: 'hi' }), { gauge: { cx: GX, cy: up, r: 4.6, z: gz } })
      return { n, yc, up, down, lever, bypass, gate, gauge, top, needle: { at: 0 } }
    })

    // Runs between blocks and to both ends, each with a flange joint and a support.
    const joins = [[Y_IN - rim(R_MAIN, BALL), blocks[0].up + rim(R_MAIN, BALL)]]
    for (let n = 0; n + 1 < blocks.length; n++) joins.push([blocks[n].down - rim(R_MAIN, BALL), blocks[n + 1].up + rim(R_MAIN, BALL)])
    joins.push([blocks.at(-1).down - rim(R_MAIN, BALL), wall + 1.6])
    joins.forEach(([a, b]) => {
      const mid = (a + b) / 2
      run(a, mid + 1.2)
      flangePair(mid)
      run(mid - 1.2, b)
      if (a - b > 34) support(mid + 9)
    })

    const ordered = paintOrder(items)
    work.replaceChildren()
    for (const item of ordered) {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      node.innerHTML = item.svgText
      item.node = node
      work.append(node)
    }
    build = { blocks, bigGauge, drawnOpen: -1 }
    describe()
  }

  // ----- moving parts -----
  function drawValves() {
    const open = state.open
    const key = open.toFixed(3)
    if (build.drawnOpen === key) return
    build.drawnOpen = key
    const tone = open > 0.5 ? 'hi' : 'lo'
    for (const block of build.blocks) {
      for (const item of block.bypass) {
        item.node.innerHTML = item.pipe ? pipe(item.pipe[0], item.pipe[1], R_BY, { tone, crease: 'none' }) : ball(item.ball, ELBOW, { tone: 'mid' })
      }
      // Gate valve: body on the run, bonnet, a rising stem and a handwheel that turns as it opens.
      const F = G.frameAlong([0, block.yc + 4.5, Z_TOP], [0, -1, 0])
      const profile = [[0, 2.8], [1, 2.8], [1, 2.2], [2, 3, 1], [4.5, 3.4, 1], [7, 3, 1], [8, 2.2], [8, 2.8], [9, 2.8]]
      const bonnet = Z_TOP + 2.8
      const stemTop = bonnet + 3 + 1 + open * 4
      const angle = open * Math.PI * 2
      const spokes = [0, 1, 2].map((index) => {
        const a = angle + (index * Math.PI * 2) / 3
        return k.lineOnTop([Math.cos(a) * 0.9, block.yc + Math.sin(a) * 0.9], [Math.cos(a) * 2.6, block.yc + Math.sin(a) * 2.6], stemTop + 0.8, P)
      })
      block.gate.node.innerHTML = S(G.solidOf(profile, F, P), { tone: 'mid' })
        + S(k.cylinder(0, block.yc, 1.7, bonnet, 3, P, 18), { tone: 'mid' })
        + S(k.cylinder(0, block.yc, 0.55, bonnet + 3, stemTop - bonnet - 3, P, 10), { tone: 'mid', crease: 'none' })
        + S(k.cylinder(0, block.yc, 3.2, stemTop, 0.8, P, 32), { tone: 'mid' })
        + L(k.ring(0, block.yc, 2.6, stemTop + 0.8, P, 28) + k.ring(0, block.yc, 0.9, stemTop + 0.8, P, 12) + spokes.join(''), { tone: 'lo' })
      // Block lever: along the line = wide open (carries everything), across = nearly shut.
      const slope = Math.abs(open * (factorOf(block.n, true) - 1) + (1 - open) * factorOf(block.n, false))
      const turn = (1 - clamp(slope, 0, 1)) * (Math.PI / 2)
      const [ux, uy] = [Math.sin(turn), -Math.cos(turn)]
      const bar = [[-0.9 * uy - 1 * ux, 0.9 * ux - 1 * uy], [-0.9 * uy + 8 * ux, 0.9 * ux + 8 * uy], [0.9 * uy + 8 * ux, -0.9 * ux + 8 * uy], [0.9 * uy - 1 * ux, -0.9 * ux - 1 * uy]].map(([x, y]) => [x, block.yc + y])
      block.lever.node.innerHTML = S(k.cylinder(0, block.yc, 1.5, block.top, 1, P, 16), { tone: 'mid' }) + S(k.extrude(bar, block.top + 1, 0.9, P), { tone: 'hi', crease: 'lo' }) + D([at([0, block.yc, block.top + 1.9])], { size: 0.4 })
    }
  }

  function setNeedle(item, value) {
    const { cx, cy, r, z } = item.gauge
    item.node.querySelector('path[data-free]').setAttribute('d', needleD(cx, cy, r, z, value))
  }

  function describe() {
    const depth = state.depth
    const value = atInput(depth, state.skip)
    let terms
    if (state.skip) {
      const list = BRANCH.slice(0, depth).map((g) => `(1${g < 0 ? '−' : '+'}${Math.abs(g).toFixed(2)})`)
      terms = depth > 4 ? `${list.slice(0, 3).join('')}…${list.at(-1)}` : list.join('')
    } else {
      terms = `${Array.from({ length: Math.min(depth, 3) }, () => PLAIN).join(' × ')}${depth > 3 ? ' × …' : ''} = ${PLAIN}${sup(depth)}`
    }
    calc.terms.textContent = terms
    calc.value.textContent = format(value)
    buttons.forEach((node) => node.setAttribute('aria-pressed', String(Number(node.dataset.value) === (node.dataset.set === 'skip' ? Number(state.skip) : state.depth))))
    stage.setAttribute('aria-valuetext', `${state.skip ? '有' : '无'}跳连，${depth} 块：输入端梯度 ${format(value)}`)
  }

  function say() {
    const depth = state.depth
    const passed = clamp(Math.floor(state.front), 0, depth)
    let text
    if (state.phase === 'valves') text = state.skip ? '打开旁路阀 · 恒等跳连' : '关闭旁路阀 · 普通网络'
    else if (state.phase === 'wave' && passed < depth) text = `反传 · 过了 ${passed}/${depth} 块 · ${format(gradientAt(depth, state.skip, depth - passed))}`
    else text = `${state.skip ? '有' : '无'}跳连 · ${depth} 块 · 梯度 ${format(atInput(depth, state.skip))}`
    if (readout.textContent !== text) readout.textContent = text
  }

  function tick(dt, calm) {
    let moving = false
    if (state.touring && !calm) {
      state.clock += dt
      if (state.phase === 'hold' && state.clock > 3.2) {
        state.skip = !state.skip
        state.phase = 'valves'
        state.clock = 0
        state.front = 0
        describe()
      }
      moving = true
    }
    const goal = state.skip ? 1 : 0
    state.open = follow(state.open, goal, dt, 0.3, calm)
    if (Math.abs(state.open - goal) < 0.002) state.open = goal
    if (state.phase === 'valves' && state.open === goal) {
      state.phase = 'wave'
      state.clock = 0
    }
    if (state.phase === 'wave') {
      state.front = calm ? state.depth + 1 : state.front + dt * 2.4
      if (state.front >= state.depth + 0.6) {
        state.phase = 'hold'
        state.clock = 0
      }
    }
    moving = moving || state.phase !== 'hold' || state.open !== goal
    drawValves()
    const depth = state.depth
    for (const block of build.blocks) {
      const reached = state.phase !== 'valves' && state.front >= depth - block.n
      const target = reached ? gradientAt(depth, state.skip, block.n) : 0
      block.needle.at = follow(block.needle.at, target, dt, 0.18, calm)
      moving = moving || block.needle.at !== target
      setNeedle(block.gauge, block.needle.at)
    }
    const arrived = state.phase !== 'valves' && state.front >= depth + 0.3
    const bigTarget = arrived ? atInput(depth, state.skip) : 0
    build.big = follow(build.big ?? 0, bigTarget, dt, 0.25, calm)
    moving = moving || build.big !== bigTarget
    setNeedle(build.bigGauge, build.big)
    say()
    return moving
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.clock = 0
    loop.run()
  })
  const restartWave = () => {
    state.phase = 'valves'
    state.front = 0
    state.clock = 0
    describe()
  }
  const byHand = () => {
    state.touring = false
    idle.touch()
    loop.run()
  }
  const setDepth = (depth) => {
    if (depth === state.depth) return
    state.depth = depth
    layout()
    build.drawnOpen = -1
    restartWave()
  }
  const onKey = (event) => {
    const index = DEPTHS.indexOf(state.depth)
    if (event.key === ' ' || event.key === 'Enter') {
      state.skip = !state.skip
      restartWave()
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') setDepth(DEPTHS[clamp(index + 1, 0, DEPTHS.length - 1)])
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') setDepth(DEPTHS[clamp(index - 1, 0, DEPTHS.length - 1)])
    else return
    event.preventDefault()
    byHand()
  }
  const onButton = (event) => {
    const node = event.target.closest('[data-set]')
    if (!node) return
    if (node.dataset.set === 'skip') {
      state.skip = node.dataset.value === '1'
      restartWave()
    } else setDepth(Number(node.dataset.value))
    byHand()
  }
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  layout()
  if (loop.still.matches) {
    state.touring = false
    state.phase = 'hold'
    state.front = state.depth + 1
  }
  tick(1 / 60, true)
  loop.run()

  return () => {
    loop.stop()
    idle.clear()
    stage.removeEventListener('keydown', onKey)
    root.removeEventListener('click', onButton)
  }
}
