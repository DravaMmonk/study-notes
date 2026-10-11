import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { applyOrder, clamp, createIdle, createLoop, floorPoint, follow, spring, svgNode, viewBoxPoint } from '../common.js'
import { N, OUT, POOLS, STRIDE, format, mapOf, pooled, windowOf, winnerOf } from './model.js'

// Fig · The pooling press.
// The 4 × 4 activation map stands as pins on a cross-slide table. A fixed press head carries two
// quills: a flat platen over the input and a setter over a 2 × 2 output tray on the same table.
// The table steps two pins at a time (stride 2) under the head. Lowered onto a 2 × 2 window, the
// level platen can only stop on the tallest pin, and the setter, coupled to it, raises that
// window's output pin to the same height: max pooling. For average pooling the platen is swapped
// for a two-level whiffletree: all four feet land and its centre pivot sits at the mean height.

const W = 640
const H = 380
const PITCH = 12
const PIN = 8
const PIN_BASE = 1.2
const SCALE = 1.8
const FLOOR = 15 // tray floor top
const TABLE = [8, 13]
const SADDLE = [3, 7]
const OUT_PITCH = PITCH * STRIDE
const OUT_PIN = 16
const OUT_SHIFT = -60 // output tray, and the setter, sit 60 units along −y from the input
const HEAD = [18, 18] // the press quill, fixed in the world
const Z_UP = FLOOR + PIN_BASE + 8 * SCALE + 6
const BUSH = 47
const CAST = { x: 6, y: -54, w: 24, d: 84, r: 3 }
const CAST_Z = [51, 62]
const COLUMN = { x: -60, y: -24, w: 18, d: 24, r: 2.5 }
const COLUMN_TOP = 70
const WAYS_X = [-24, 60]
const YWHEEL = [18, 81, 9]

const PLATE = { x: -76, y: -102, w: 166, d: 198, r: 8 }

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [COLUMN.x, COLUMN.y, COLUMN_TOP], [COLUMN.x + COLUMN.w, COLUMN.y + COLUMN.d, COLUMN_TOP], ...k.boxCorners(CAST, CAST_Z[0], CAST_Z[1] + 8), [18, 44, 68]],
  W,
  H,
  { pad: 22, azimuth: 33 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const plan = (cx, cy, w, d, r = 0.8) => ({ x: cx - w / 2, y: cy - d / 2, w, d, r })
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], a[2] ?? 0], P) - k.depthOf([b[0], b[1], b[2] ?? 0], P))
const [VX, VY] = k.towardViewer(P)
const heightOf = (value) => PIN_BASE + value * SCALE
const pinXY = (row, col) => [row * PITCH, col * PITCH] // table coordinates
const windowXY = (i, j) => [(i * STRIDE + 0.5) * PITCH, (j * STRIDE + 0.5) * PITCH]
const outXY = (i, j) => [windowXY(i, j)[0], windowXY(i, j)[1] + OUT_SHIFT]
const offsetOf = (i, j) => [HEAD[0] - windowXY(i, j)[0], HEAD[1] - windowXY(i, j)[1]]

// A rod between two world points and a ball, from the lathe kit.
function rod(a, b, r, style) {
  const axis = G.sub3(b, a)
  return S(G.disc(0, G.len3(axis), r, G.frameAlong(a, axis), P), style)
}
const ball = (c, r, style) => S(G.sphereOf(c, r, P), style)

// ---------- painter's order (boxes in table coordinates) ----------
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
    item.key = k.depthOf([(item.box[0] + item.box[1]) / 2, (item.box[2] + item.box[3]) / 2, (item.box[4] + item.box[5]) / 2], P)
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
    out.push(items[pick].node)
    after[pick].forEach((next) => waiting[next]--)
  }
  return out
}

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 11)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // Ways for the saddle, with end stops.
  for (const x of WAYS_X) {
    const way = { x: x - 3, y: -88, w: 6, d: 158, r: 1 }
    out.push(S(k.slabOf(way, 0, SADDLE[0], P, 3, 0.4), { tone: 'mid' }))
    out.push(L(k.lineOnTop([x, way.y], [x, way.y + way.d], SADDLE[0], P), { tone: 'faint' }))
    for (const y of [way.y - 5, way.y + way.d]) {
      out.push(S(k.slabOf({ x: x - 5, y, w: 10, d: 5, r: 1 }, 0, 6, P, 3, 0.4), { tone: 'mid' }))
      out.push(D([at([x, y + 2.5, 6])], { size: 0.45 }))
    }
  }
  // Ruler beside the near way: a major tick per pin pitch, so a stride of 2 reads as two majors.
  const strip = { x: WAYS_X[1] + 6, y: -80, w: 7, d: 144, r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(strip.y + 2, strip.y + strip.d - 2, 3, 4, strip.x + 0.6, 0.6, [2, 3.8], P, 'y')
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))

  const label = { x: -62, y: 30, w: 16, d: 22, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 13], [7, 9], [11, 11]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 1 + dx * 0.9, label.y + 4], [label.x + 1 + dx * 0.9, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

function column() {
  const out = []
  const flange = k.insetPlan(COLUMN, -5)
  out.push(S(k.slabOf(flange, 0, 4, P, 4, 0.6), { tone: 'mid' }))
  out.push(D(k.corners(flange, 2.4).map(([x, y]) => at([x, y, 4])), { size: 0.45 }))
  out.push(S(k.slabOf(COLUMN, 4, COLUMN_TOP - 4, P, 4, 0.6), { tone: 'mid', inner: L(k.sideSeam(COLUMN, 30, P, 4), { tone: 'faint' }) }))
  return out.join('')
}

function head() {
  const out = []
  // Arm from the column to the head casting.
  const arm = { x: COLUMN.x + COLUMN.w, y: -18, w: CAST.x - COLUMN.x - COLUMN.w, d: 12, r: 1.5 }
  out.push(S(k.slabOf(arm, CAST_Z[0] + 3, CAST_Z[1] - CAST_Z[0] - 3, P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(arm, CAST_Z[0] + 6, P, 3), { tone: 'faint' }) }))
  out.push(S(k.slabOf(k.insetPlan(COLUMN, -1), COLUMN_TOP, 2.4, P, 4, 0.5), { tone: 'mid' }))
  // Bushings under the casting for both quills.
  for (const [x, y] of [HEAD, [HEAD[0], HEAD[1] + OUT_SHIFT]]) {
    out.push(S(k.cylinder(x, y, 4.6, BUSH, CAST_Z[0] - BUSH, P, 28), { tone: 'mid', inner: L(k.sideArc(x, y, 4.6, BUSH + 1.6, P, 16), { tone: 'faint' }) }))
  }
  out.push(S(k.slabOf(CAST, CAST_Z[0], CAST_Z[1] - CAST_Z[0], P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(CAST, CAST_Z[0] + 4, P, 4), { tone: 'faint' }) }))
  out.push(L(k.planOutline(k.insetPlan(CAST, 3), CAST_Z[1], P, 4), { tone: 'faint' }))
  out.push(D(k.corners(CAST, 6).map(([x, y]) => at([x, y, CAST_Z[1]])), { size: 0.45 }))
  return out.join('')
}

// Dial gauge on the casting: reads the height the press stopped at, in activation units.
const DIAL = [18, -18, CAST_Z[1]]
const DIAL_R = 9
const DIAL_SPAN = Math.PI * 1.5
function dialArt() {
  const [x, y, z] = DIAL
  const out = [S(k.cylinder(x, y, DIAL_R + 1.6, z, 1.4, P, 48), { tone: 'mid' })]
  out.push(S(k.cylinder(x, y, DIAL_R, z + 1.4, 2.6, P, 48, 0.6), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.ring(x, y, DIAL_R - 1.4, z + 4, P, 48), { tone: 'lo' }))
  const ticks = k.radialTicks(x, y, DIAL_R - 1.4, 16, 2, z + 4, [1, 2.2], P, -DIAL_SPAN / 2, DIAL_SPAN)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  return out.join('')
}
const needle = (value) => {
  const angle = -DIAL_SPAN / 2 + (clamp(value, 0, 8) / 8) * DIAL_SPAN
  const [x, y, z] = DIAL
  return k.lineOnTop([x - Math.sin(angle) * 2, y + Math.cos(angle) * 2], [x + Math.sin(angle) * (DIAL_R - 2.2), y - Math.cos(angle) * (DIAL_R - 2.2)], z + 4.1, P)
}

// A handwheel turning about a horizontal axis: rim, knurl, hub and a crank knob.
function handwheel(centre, axis, angle, shaft) {
  const F = G.frameAlong(centre, axis)
  const out = [S(G.disc(-1.2 - shaft, -1.2, 1.3, F, P), { tone: 'mid', crease: 'none' }), S(G.disc(-1.2, 1.2, 6, F, P), { tone: 'mid' })]
  out.push(k.fadedSvg(G.ribsOf(F, -1.2, 1.2, 6, 30, P, { fade: [0.1, 0.55], phase: angle }), { tone: 'lo' }))
  out.push(S(G.disc(1.2, 2.6, 2.2, F, P), { tone: 'mid' }))
  const knob = G.pointOf(F, 1.2, 4.2, angle)
  const tip = G.add3(knob, G.mul3(F.a, 4))
  out.push(rod(knob, tip, 0.8, { tone: 'mid', crease: 'none' }))
  out.push(ball(tip, 1.2, { tone: 'hi' }))
  return out.join('')
}

// The feed capstan on the side of the casting: three spokes with balls.
function capstan(angle) {
  const centre = [HEAD[0], CAST.y + CAST.d, (CAST_Z[0] + CAST_Z[1]) / 2]
  const F = G.frameOf(centre, [0, 1, 0], [1, 0, 0], [0, 0, 1])
  const out = [S(G.disc(0, 3.5, 3.6, F, P), { tone: 'mid' })]
  const hub = G.pointOf(F, 3.5, 0, 0)
  const spokes = [0, 1, 2].map((index) => {
    const tip = G.pointOf(F, 2.2, 12, angle + (index * Math.PI * 2) / 3)
    return { tip, key: k.depthOf(tip, P) }
  })
  spokes.sort((a, b) => a.key - b.key)
  const front = []
  for (const spoke of spokes) {
    const from = G.pointOf(F, 2.2, 0, 0)
    const svg = rod(from, spoke.tip, 0.7, { tone: 'mid', crease: 'none' }) + ball(spoke.tip, 1.7, { tone: 'hi' })
    ;(k.depthOf(spoke.tip, P) < k.depthOf(hub, P) ? out : front).push(svg)
  }
  return out.join('') + S(G.disc(3.5, 4.4, 2.2, F, P), { tone: 'mid' }) + front.join('')
}

function trayItems(inner, wall = 3, h = 3) {
  const outer = { x: inner.x - wall, y: inner.y - wall, w: inner.w + wall * 2, d: inner.d + wall * 2, r: 1.6 }
  const items = [{ box: [outer.x, outer.x + outer.w, outer.y, outer.y + outer.d, TABLE[1], FLOOR], svg: S(k.slabOf(outer, TABLE[1], FLOOR - TABLE[1], P, 4, 0.6), { tone: 'lo' }) }]
  const walls = [
    { x: outer.x, y: outer.y, w: wall, d: outer.d },
    { x: inner.x + inner.w, y: outer.y, w: wall, d: outer.d },
    { x: inner.x, y: outer.y, w: inner.w, d: wall },
    { x: inner.x, y: inner.y + inner.d, w: inner.w, d: wall },
  ]
  for (const piece of walls) {
    items.push({
      box: [piece.x, piece.x + piece.w, piece.y, piece.y + piece.d, FLOOR, FLOOR + h],
      svg: S(k.slabOf({ ...piece, r: 0.8 }, FLOOR, h, P, 3, 0.4), { tone: 'mid' }) + D([at([piece.x + piece.w / 2, piece.y + piece.d / 2, FLOOR + h])], { size: 0.4 }),
    })
  }
  return items
}

function pinSvg(x, y, size, height, { lit = false, tone = 'hi' } = {}) {
  const foot = plan(x, y, size, size, 0.8)
  const top = FLOOR + height
  return S(k.slabOf(foot, FLOOR, height, P, 2, 0.4), { tone, lit, crease: 'lo' }) + L(k.planOutline(k.insetPlan(foot, 1.4), top, P, 2), { tone: 'faint' })
}

// ---------- the live figure ----------

export const meta = { id: 'pool-sorter', fig: 'Fig 7.1', title: '池化压床' }

export const css = '.pool-grid{grid-template-columns:repeat(2,2.2em)}'

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      '底板上的池化压床。四乘四的激活值立成针，针高就是激活值，装在十字滑台上。固定的压头有两根联动的竖杆：一根带平压板，落在二乘二窗口上，只能停在最高的针上；另一根把旁边二乘二输出盘里对应的针升到同样高度。滑台每次走两根针。切换到平均池化时，压板换成两级平衡杆，四只脚都着地，中间支点的高度就是平均值。',
    body: [
      base(),
      column(),
      '<g data-part="saddle"></g>',
      '<g data-part="table"><g data-part="table-slab"></g><g data-part="work"></g></g>',
      '<g data-part="xwheel"></g>',
      '<g data-part="ywheel"></g>',
      head(),
      '<g data-part="capstan"></g>',
      dialArt(),
      `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" style="stroke-width:1.1" d=""/>`,
      D([at([DIAL[0], DIAL[1], DIAL[2] + 4.1])], { size: 0.7, tone: 'hi' }),
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="池化设置">
    <div class="fx-control"><span>池化</span><button type="button" data-set="mode" data-value="max">最大</button><button type="button" data-set="mode" data-value="avg">平均</button></div>
    <div class="fx-control"><span>输入</span><button type="button" data-set="shift" data-value="0">原图</button><button type="button" data-set="shift" data-value="-1">左移 1 格</button></div>
  </div>
  <div class="fx-calc"><span data-calc="op"></span><span class="fx-grid pool-grid" data-calc="window"></span><i>=</i><b data-calc="value"></b><i>·</i><span>输出</span><span class="fx-grid pool-grid" data-calc="out"></span><span data-calc="before-label"></span><span class="fx-grid pool-grid" data-calc="before"></span><i>·</i><span>参数 0</span></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '悬停针床 · 方向键',
      readout: '',
      keys: [
        { mark: 'lit', label: '压板停在其上的最高针' },
        { mark: 'raised', label: '激活针：高度 = 激活值' },
        { mark: 'flat', label: '输出针：一个窗口一根' },
      ],
      caption:
        '滑台每次走两根针（步幅 2），压板落到 2 × 2 窗口上，只能停在最高的那根针上，其余三根留着空隙；联动的放置杆把输出盘里对应的针升到同样高度，4 × 4 就变成 2 × 2。换成平均池化时，压板换成两级平衡杆，四只脚都着地，中间支点的高度就是平均值，峰值被摊平。池化没有要学习的参数；把输入左移一格，最大池化的输出只有一个变了（6 8 3 4 → 7 8 3 4），平均池化变了三个。',
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="池化压床。方向键选择窗口，M 切换最大或平均池化，S 平移输入。">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { saddle: part('saddle'), table: part('table'), slab: part('table-slab'), work: part('work'), xwheel: part('xwheel'), ywheel: part('ywheel'), capstan: part('capstan'), needle: part('needle') }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const config = { mode: 'max', shift: 0 }
  const VISITS = [[0, 0], [0, 1], [1, 0], [1, 1]]
  const PASSES = [{ mode: 'max', shift: 0 }, { mode: 'avg', shift: 0 }, { mode: 'max', shift: -1 }, { mode: 'avg', shift: -1 }]
  const state = {
    target: [0, 0],
    down: false,
    table: offsetOf(0, 0),
    level: Z_UP, // the common drive level of the tool's contact faces
    measured: new Set(),
    touring: true,
    tour: { pass: 0, visit: 0, phase: 'reset', clock: 0 },
  }

  // Static pieces of the table, built once in table coordinates.
  nodes.slab.innerHTML = (() => {
    const table = { x: -16, y: -74, w: 68, d: 124, r: 2.5 }
    return S(k.slabOf(table, TABLE[0], TABLE[1] - TABLE[0], P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(table, TABLE[0] + 2, P, 4), { tone: 'faint' }) })
      + D(k.corners(table, 3).map(([x, y]) => at([x, y, TABLE[1]])), { size: 0.45 })
  })()
  const items = []
  const add = (box, svgText = '') => {
    const item = { box, node: svgNode(svgText) }
    items.push(item)
    return item
  }
  trayItems({ x: -7, y: -7, w: 50, d: 50 }).forEach((item) => add(item.box, item.svg))
  trayItems({ x: -5, y: -65, w: 46, d: 46 }).forEach((item) => add(item.box, item.svg))
  const pins = []
  for (let row = 0; row < N; row++) for (let col = 0; col < N; col++) pins.push({ row, col, xy: pinXY(row, col), h: { at: heightOf(mapOf(0)[row][col]), rate: 0 }, item: add([0, 0, 0, 0, 0, 0]), drawn: '' })
  const outs = []
  for (let i = 0; i < OUT; i++) for (let j = 0; j < OUT; j++) outs.push({ i, j, xy: outXY(i, j), h: { at: PIN_BASE, rate: 0 }, item: add([0, 0, 0, 0, 0, 0]), drawn: '' })
  const tool = add([0, 0, 0, 0, 0, 0])
  const setter = add([0, 0, 0, 0, 0, 0])

  const valuesOf = () => mapOf(config.shift)
  const pinAt = (row, col) => pins[row * N + col]
  const windowPins = (i, j) => [0, 1, 2, 3].map((n) => pinAt(i * STRIDE + (n >> 1), j * STRIDE + (n & 1)))
  const settled = () => Math.hypot(state.table[0] - offsetOf(...state.target)[0], state.table[1] - offsetOf(...state.target)[1]) < 0.05

  // The tool's pose for the current drive level: contact faces never pass through a pin top.
  function toolPose() {
    const [tx, ty] = state.table
    const hx = HEAD[0] - tx
    const hy = HEAD[1] - ty
    const aligned = settled()
    const window = windowPins(...state.target).map((pin) => FLOOR + pin.h.at)
    const feet = window.map((top) => (aligned ? Math.max(top, state.level) : state.level))
    const contact = aligned && state.level <= Math.min(...window) + 0.02
    if (config.mode === 'max') {
      const z = aligned ? Math.max(Math.max(...window), state.level) : state.level
      return { hx, hy, aligned, contact, z, ref: z, feet }
    }
    const mean = feet.reduce((sum, value) => sum + value, 0) / 4
    return { hx, hy, aligned, contact, z: mean, ref: mean, feet }
  }

  function draw() {
    const [tx, ty] = state.table
    nodes.table.setAttribute('transform', k.translateAlong(P, [tx, ty, 0]))
    nodes.saddle.setAttribute('transform', k.translateAlong(P, [0, ty, 0]))
    if (!nodes.saddle.firstChild) {
      const saddle = { x: WAYS_X[0] - 8, y: -50, w: WAYS_X[1] - WAYS_X[0] + 16, d: 78, r: 2 }
      nodes.saddle.innerHTML = S(k.slabOf(saddle, SADDLE[0], SADDLE[1] - SADDLE[0], P, 4, 0.6), { tone: 'mid', inner: L(k.sideSeam(saddle, SADDLE[0] + 1.6, P, 4), { tone: 'faint' }) })
        + S(k.slabOf({ x: saddle.x + saddle.w, y: -16, w: 4, d: 10, r: 1 }, SADDLE[0], 9, P, 3, 0.4), { tone: 'mid' })
        + [-40, 18].map((y) => S(k.slabOf({ x: saddle.x + 2, y: y - 3, w: saddle.w - 4, d: 6, r: 1 }, SADDLE[1], TABLE[0] - SADDLE[1], P, 3, 0.3), { tone: 'mid' })
          + L(k.lineOnTop([saddle.x + 2, y], [saddle.x + saddle.w - 2, y], TABLE[0], P), { tone: 'faint' })).join('')
        + D([[saddle.x + saddle.w - 6, -30], [saddle.x + saddle.w - 6, 8], [saddle.x + 6, -30], [saddle.x + 6, 8]].map(([x, y]) => at([x, y, SADDLE[1]])), { size: 0.45 })
        + S(k.slabOf({ x: WAYS_X[1] + 5, y: -1.5, w: 4, d: 3, r: 0.6 }, SADDLE[1], 1, P, 2), { tone: 'hi', crease: 'lo' })
    }
    nodes.xwheel.innerHTML = handwheel([WAYS_X[1] + 16 + 5.2, -11 + ty, 10], [1, 0, 0], -tx / 4, 4)
    nodes.ywheel.innerHTML = S(k.slabOf(plan(YWHEEL[0], YWHEEL[1] - 9, 10, 6, 1), 0, 13, P, 3, 0.5), { tone: 'mid' }) + D([at([YWHEEL[0] - 3, YWHEEL[1] - 9, 13]), at([YWHEEL[0] + 3, YWHEEL[1] - 9, 13])], { size: 0.42 }) + handwheel([YWHEEL[0], YWHEEL[1] - 1.8, YWHEEL[2]], [0, 1, 0], ty / 4, 3)

    const pose = toolPose()
    const values = valuesOf()
    const [ti, tj] = state.target
    const inWindow = (pin) => Math.floor(pin.row / STRIDE) === ti && Math.floor(pin.col / STRIDE) === tj
    const winner = windowPins(ti, tj)[winnerOf(windowOf(values, ti, tj))]
    const tree = config.mode === 'avg' && pose.aligned
    const STEM = 3.6

    // Input pins; under the whiffletree each window pin also carries its foot and half a beam.
    pins.forEach((pin) => {
      const [x, y] = pin.xy
      const lit = config.mode === 'max' && pose.contact && pin === winner
      let extra = ''
      let box = [x - PIN / 2, x + PIN / 2, y - PIN / 2, y + PIN / 2, FLOOR, FLOOR + pin.h.at]
      if (tree && inWindow(pin)) {
        const n = (pin.row % 2) * 2 + (pin.col % 2)
        const foot = pose.feet[n]
        const partner = pose.feet[n ^ 1]
        const end = [x, y, foot + 1.2 + STEM]
        const pivotZ = (foot + partner) / 2 + 1.2 + STEM
        const side = pin.col % 2 ? -1 : 1
        const pivot = [x, y + side * PITCH * 0.5, pivotZ]
        const toward = G.sub3(pivot, end)
        const stop = G.add3(end, G.mul3(toward, 1 - 1.5 / G.len3(toward)))
        extra = ball([x, y, foot + 1.2], 1.2, { tone: 'mid' }) + rod([x, y, foot + 2.2], end, 0.55, { tone: 'mid', crease: 'none' }) + rod(end, stop, 0.8, { tone: 'hi', crease: 'none' }) + ball(end, 1, { tone: 'mid' })
        box = [x - PIN / 2, x + PIN / 2, Math.min(y - PIN / 2, pivot[1] + 1.5), Math.max(y + PIN / 2, pivot[1] - 1.5), FLOOR, Math.max(end[2], pivotZ) + 1.2]
      }
      const key = `${pin.h.at.toFixed(2)}|${lit}|${extra.length ? pose.feet.map((f) => f.toFixed(2)).join(',') : ''}`
      if (key !== pin.drawn) {
        pin.drawn = key
        pin.item.node.innerHTML = pinSvg(x, y, PIN, pin.h.at, { lit }) + extra
      }
      pin.item.box = box
    })

    // The tool itself: platen, or the whiffletree's pivots, main beam and yoke.
    let toolSvg
    let reach
    let bottom
    if (config.mode === 'max') {
      const platen = plan(pose.hx, pose.hy, 22, 22, 1.5)
      toolSvg = S(k.slabOf(platen, pose.z, 3, P, 3, 0.6), { tone: 'hi', crease: 'lo', lit: !pose.contact })
        + L(k.planOutline(k.insetPlan(platen, 2.4), pose.z + 3, P, 3), { tone: 'faint' })
        + D(k.corners(platen, 2.6).map(([x, y]) => at([x, y, pose.z + 3])), { size: 0.42 })
        + S(k.cylinder(pose.hx, pose.hy, 3.4, pose.z + 3, 1.6, P, 20), { tone: 'mid' })
      reach = [11, 11]
      bottom = pose.z
      toolSvg += S(k.cylinder(pose.hx, pose.hy, 2.4, pose.z + 4.6, BUSH - pose.z - 4.6, P, 18), { tone: 'mid', crease: 'none', inner: L(k.sideArc(pose.hx, pose.hy, 2.4, BUSH - 4, P, 12), { tone: 'faint' }) })
    } else {
      const STEMZ = 1.2 + STEM
      const [x0, y0] = [pose.hx - PITCH / 2, pose.hy]
      const subs = [0, 1].map((r) => [x0 + r * PITCH, y0, (pose.feet[r * 2] + pose.feet[r * 2 + 1]) / 2 + STEMZ])
      const main = [pose.hx, pose.hy, (subs[0][2] + subs[1][2]) / 2]
      const parts = []
      if (!tree) {
        // Hanging level between windows: the whole tree travels with the quill.
        for (let n = 0; n < 4; n++) {
          const fx = x0 + (n >> 1) * PITCH
          const fy = y0 + ((n & 1) ? PITCH / 2 : -PITCH / 2)
          const end = [fx, fy, pose.feet[n] + STEMZ]
          parts.push(ball([fx, fy, pose.feet[n] + 1.2], 1.2, { tone: 'mid' }) + rod([fx, fy, pose.feet[n] + 2.2], end, 0.55, { tone: 'mid', crease: 'none' }) + rod(end, subs[n >> 1], 0.8, { tone: 'hi', crease: 'none' }) + ball(end, 1, { tone: 'mid' }))
        }
      }
      parts.push(rod(subs[0], subs[1], 1, { tone: 'hi', crease: 'none' }))
      subs.forEach((point) => parts.push(ball(point, 1.6, { tone: 'mid' })))
      parts.push(rod(main, [main[0], main[1], main[2] + 6], 1.2, { tone: 'mid', crease: 'none' }))
      parts.push(ball(main, 2.1, { tone: 'hi', lit: true }))
      parts.push(S(k.cylinder(pose.hx, pose.hy, 2.4, main[2] + 6, BUSH - main[2] - 6, P, 18), { tone: 'mid', crease: 'none', inner: L(k.sideArc(pose.hx, pose.hy, 2.4, BUSH - 4, P, 12), { tone: 'faint' }) }))
      toolSvg = parts.join('')
      reach = tree ? [PITCH / 2 + 1.6, 1.6] : [PITCH / 2 + 1.6, PITCH / 2 + 1.6]
      bottom = tree ? Math.min(subs[0][2], subs[1][2]) - 1.6 : Math.min(...pose.feet)
    }
    tool.node.innerHTML = toolSvg
    tool.box = [pose.hx - reach[0], pose.hx + reach[0], pose.hy - reach[1], pose.hy + reach[1], bottom, BUSH]

    // Setter, coupled to the tool: its foot rides at the reference height.
    const [sx, sy] = [pose.hx, pose.hy + OUT_SHIFT]
    const out = outs.find((o) => o.i === ti && o.j === tj)
    const footZ = Math.max(pose.ref, FLOOR + out.h.at)
    setter.node.innerHTML = S(k.cylinder(sx, sy, 5, footZ, 1.4, P, 24), { tone: 'hi', crease: 'lo' }) + S(k.cylinder(sx, sy, 1.6, footZ + 1.4, BUSH - footZ - 1.4, P, 14), { tone: 'mid', crease: 'none' })
    setter.box = [sx - 5, sx + 5, sy - 5, sy + 5, footZ, BUSH]

    outs.forEach((o) => {
      const key = o.h.at.toFixed(2)
      if (key !== o.drawn) {
        o.drawn = key
        o.item.node.innerHTML = pinSvg(o.xy[0], o.xy[1], OUT_PIN, o.h.at, { tone: state.measured.has(`${o.i},${o.j}`) ? 'hi' : 'mid' })
      }
      o.item.box = [o.xy[0] - OUT_PIN / 2, o.xy[0] + OUT_PIN / 2, o.xy[1] - OUT_PIN / 2, o.xy[1] + OUT_PIN / 2, FLOOR, FLOOR + o.h.at]
    })
    applyOrder(nodes.work, paintOrder(items))

    nodes.capstan.innerHTML = capstan((Z_UP - pose.ref) * 0.09)
    nodes.needle.setAttribute('d', needle((pose.ref - FLOOR - PIN_BASE) / SCALE))
    return pose
  }

  function describe() {
    const [i, j] = state.target
    const values = windowOf(valuesOf(), i, j)
    const pool = POOLS[config.mode]
    const result = pool.of(values)
    calc.op.textContent = config.mode
    calc.window.innerHTML = values.map((value) => `<b>${value}</b>`).join('')
    calc.value.textContent = format(result)
    const table = pooled(config.mode, config.shift)
    calc.out.innerHTML = table.flatMap((row, a) => row.map((value, b) => `<b>${state.measured.has(`${a},${b}`) ? format(value) : '·'}</b>`)).join('')
    const before = pooled(config.mode, 0)
    calc['before-label'].textContent = config.shift ? '平移前' : ''
    calc.before.style.display = config.shift ? '' : 'none'
    calc.before.innerHTML = before.flatMap((row) => row.map((value) => `<b>${format(value)}</b>`)).join('')
    buttons.forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.value === String(config[node.dataset.set]))))
    stage.setAttribute('aria-valuetext', `${pool.name}，窗口第 ${i + 1} 行第 ${j + 1} 列：${values.join('、')}，输出 ${format(result)}`)
  }

  function say(pose) {
    const [i, j] = state.target
    const values = windowOf(valuesOf(), i, j)
    const result = POOLS[config.mode].of(values)
    let text
    if (state.touring && state.tour.phase === 'reset') text = `${POOLS[config.mode].name} · 4×4 → 2×2`
    else if (!pose.aligned) text = `步幅 2 · 移到窗口 (${i},${j})`
    else if (state.measured.has(`${i},${j}`)) text = `窗口 (${i},${j}) · ${values.join(' ')} → ${POOLS[config.mode].short} ${format(result)}`
    else text = `窗口 (${i},${j}) · 下压`
    if (readout.textContent !== text) readout.textContent = text
  }

  function apply(next) {
    const changed = next.mode !== config.mode || next.shift !== config.shift
    Object.assign(config, next)
    if (changed) state.measured = new Set()
    describe()
  }

  function runTour(dt) {
    const tour = state.tour
    tour.clock += dt
    if (tour.phase === 'reset') {
      state.down = false
      if (state.level > Z_UP - 0.3 && tour.clock > 1.4) {
        tour.phase = 'go'
        tour.visit = 0
        state.target = VISITS[0]
        describe()
      } else if (tour.clock < dt * 1.5) apply(PASSES[tour.pass])
    } else if (tour.phase === 'go') {
      state.down = false
      if (settled()) {
        tour.phase = 'press'
        tour.clock = 0
      }
    } else if (tour.phase === 'press') {
      state.down = true
      if (state.measured.has(state.target.join(',')) && tour.clock > 1.6) {
        tour.phase = 'lift'
        tour.clock = 0
      }
    } else if (tour.phase === 'lift') {
      state.down = false
      if (state.level > Z_UP - 0.3) {
        tour.visit += 1
        tour.clock = 0
        if (tour.visit >= VISITS.length) {
          tour.pass = (tour.pass + 1) % PASSES.length
          tour.phase = 'reset'
        } else {
          tour.phase = 'go'
          state.target = VISITS[tour.visit]
          describe()
        }
      }
    }
  }

  function tick(dt, calm) {
    if (state.touring && !calm) runTour(dt)
    let moving = state.touring && !calm
    const goal = offsetOf(...state.target)
    const before = [...state.table]
    // The table only travels with the tool up.
    if (state.level > Z_UP - 0.3 || calm) {
      state.table = [follow(state.table[0], goal[0], dt, 0.15, calm), follow(state.table[1], goal[1], dt, 0.15, calm)]
      if (Math.abs(state.table[0] - goal[0]) < 0.02) state.table[0] = goal[0]
      if (Math.abs(state.table[1] - goal[1]) < 0.02) state.table[1] = goal[1]
    }
    moving = moving || before[0] !== state.table[0] || before[1] !== state.table[1]
    const window = windowPins(...state.target).map((pin) => FLOOR + pin.h.at)
    const levelGoal = state.down && settled() ? Math.min(...window) - 0.4 : Z_UP
    const lastLevel = state.level
    state.level = follow(state.level, levelGoal, dt, 0.16, calm)
    if (Math.abs(state.level - levelGoal) < 0.03) state.level = levelGoal
    moving = moving || lastLevel !== state.level
    const values = valuesOf()
    pins.forEach((pin) => {
      moving = spring(pin.h, heightOf(values[pin.row][pin.col]), dt, 120, 16, calm) || moving
    })
    const pose = toolPose()
    if (pose.contact && !state.measured.has(state.target.join(','))) {
      state.measured.add(state.target.join(','))
      describe()
    }
    const table = pooled(config.mode, config.shift)
    outs.forEach((o) => {
      const goalHeight = state.measured.has(`${o.i},${o.j}`) ? heightOf(table[o.i][o.j]) : PIN_BASE
      moving = spring(o.h, goalHeight, dt, 140, 18, calm) || moving
    })
    draw()
    say(pose)
    return moving
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    const pass = PASSES.findIndex((p) => p.mode === config.mode && p.shift === config.shift)
    Object.assign(state.tour, { pass: Math.max(0, pass), visit: Math.max(0, VISITS.findIndex(([i, j]) => i === state.target[0] && j === state.target[1])), phase: 'lift', clock: 0 })
    loop.run()
  })
  const byHand = () => {
    state.touring = false
    idle.touch()
    loop.run()
  }
  const aim = (i, j) => {
    const next = [clamp(i, 0, OUT - 1), clamp(j, 0, OUT - 1)]
    if (next[0] !== state.target[0] || next[1] !== state.target[1] || !state.down) {
      state.target = next
      state.down = true
      describe()
    }
    byHand()
  }

  const onPointer = (event) => {
    const [px, py] = floorPoint(viewBoxPoint(svg, event), FLOOR, P)
    const x = px - state.table[0]
    const y = py - state.table[1]
    if (x < -8 || x > 44 || y < -8 || y > 44) return
    aim(Math.floor(clamp(x + PITCH / 2, 0, 47.9) / OUT_PITCH), Math.floor(clamp(y + PITCH / 2, 0, 47.9) / OUT_PITCH))
  }
  const onKey = (event) => {
    const [i, j] = state.target
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, 1], ArrowRight: [0, -1] }
    if (moves[event.key]) aim(i + moves[event.key][0], j + moves[event.key][1])
    else if (event.key === 'm' || event.key === 'M' || event.key === ' ') {
      apply({ mode: config.mode === 'max' ? 'avg' : 'max', shift: config.shift })
      state.down = false
      byHand()
    } else if (event.key === 's' || event.key === 'S') {
      apply({ mode: config.mode, shift: config.shift ? 0 : -1 })
      state.down = false
      byHand()
    } else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const node = event.target.closest('[data-set]')
    if (!node) return
    const value = node.dataset.set === 'shift' ? Number(node.dataset.value) : node.dataset.value
    apply({ ...config, [node.dataset.set]: value })
    state.down = false
    byHand()
  }
  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerdown', onPointer)
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  if (loop.still.matches) {
    // A still that makes the point: the platen resting on the tallest pin, every output set.
    state.touring = false
    state.target = [0, 1]
    state.down = true
    state.table = offsetOf(0, 1)
    state.level = FLOOR
    VISITS.forEach(([i, j]) => state.measured.add(`${i},${j}`))
  }
  describe()
  tick(1 / 60, true)
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
