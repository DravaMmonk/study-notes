import * as k from '../kit/iso-kit.js'
import { applyOrder, clamp, createIdle, createLoop, follow, spring, svgNode, t } from '../common.js'
import { CHANNELS, CHANNELS_EN, CHOICES, DEFAULTS, DRAWN, NOTE_N, convParams, fcParams, group, mega, outSize, perFilter, wan, windows } from './model.js'

// Fig · The channel punch.
// An 8 × 8 bed of pixel columns: each column is a stack of C_in chips, one per input channel.
// A die on a gantry ram is K × K wide and C_in layers deep, so one press covers a whole
// K × K × C_in block and gives one number; a setter on the same carriage drops that number as a
// chip on the output bed. Sweeping every window fills one layer of the output columns: one
// activation map. A carousel holds C_out dies; the ram swaps them, so the output columns grow
// C_out layers deep. Parameters = (K·K·C_in + 1)·C_out, whatever the bed size.

const W = 640
const H = 390
const Q = 6 // column pitch
const CHIP = 4.8
const LAYER = 1.8 // one channel's chip
const FLOOR = 2
const WALL_H = 2.6
const HALF = (DRAWN * Q) / 2 + 1.5 // tray inner half-width
const OUT_Y = -86 // output bed centre, and the setter's offset from the die
const CAR_Y = 100 // carousel centre
const DISC = [3.2, 6.4] // carousel disc z
const Z_TRAVEL = 26
const SLEEVE = [50, 58]
const BEAM = [66, 73]
const RAIL_Y = [-130, 182]
const RAIL_X = [-44, 44]

const PLATE = { x: -76, y: -142, w: 152, d: 338, r: 8 }

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [-6, RAIL_Y[0] - 8, BEAM[1]], [6, RAIL_Y[1] + 8, BEAM[1]], [30, RAIL_Y[0], BEAM[1]], [-30, RAIL_Y[1], BEAM[1]]],
  W,
  H,
  { pad: 24, azimuth: 35 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const plan = (cx, cy, w, d, r = 0.6) => ({ x: cx - w / 2, y: cy - d / 2, w, d, r })
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const ease = (t) => t * t * (3 - 2 * t)
const mix = (a, b, t) => a + (b - a) * t
const [VX, VY] = k.towardViewer(P)

// Channel tones: true colour only because the channels are the subject.
const TONES = { 1: ['mid'], 3: ['red', 'green', 'blue'], 4: ['red', 'green', 'blue', 'hi'] }

// ---------- painter's order for boxes that move ----------
// Items carry an axis-aligned box [x0, x1, y0, y1, z0, z1]. Where two overlap on screen, a plane of
// either box that separates them decides; otherwise the nearer centre wins.
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
function versus(a, b) {
  const A = a.box
  const B = b.box
  const e = 0.01
  if (A[4] >= B[5] - e) return 1
  if (B[4] >= A[5] - e) return -1
  if (VX > 0 && A[0] >= B[1] - e) return 1
  if (VX > 0 && B[0] >= A[1] - e) return -1
  if (VY > 0 && A[2] >= B[3] - e) return 1
  if (VY > 0 && B[2] >= A[3] - e) return -1
  return Math.sign(a.key - b.key)
}
function paintOrder(items) {
  for (const item of items) {
    if (!item.rect || item.moved) {
      item.rect = screenRect(item.box)
      const [x0, x1, y0, y1, z0, z1] = item.box
      item.key = k.depthOf([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], P)
      item.moved = false
    }
  }
  const n = items.length
  const after = Array.from({ length: n }, () => [])
  const waiting = new Array(n).fill(0)
  for (let a = 0; a < n; a++) {
    const ra = items[a].rect
    for (let b = a + 1; b < n; b++) {
      const rb = items[b].rect
      if (ra[0] >= rb[1] - 0.2 || rb[0] >= ra[1] - 0.2 || ra[2] >= rb[3] - 0.2 || rb[2] >= ra[3] - 0.2) continue
      const side = versus(items[a], items[b])
      if (side > 0) {
        after[b].push(a)
        waiting[a]++
      } else {
        after[a].push(b)
        waiting[b]++
      }
    }
  }
  const done = new Array(n).fill(false)
  const out = []
  for (let step = 0; step < n; step++) {
    let pick = -1
    for (let index = 0; index < n; index++) {
      if (done[index] || waiting[index]) continue
      if (pick < 0 || items[index].key < items[pick].key) pick = index
    }
    if (pick < 0) pick = items.findIndex((item, index) => !done[index]) // a cycle: break it at the first free item
    done[pick] = true
    out.push(items[pick].node)
    for (const next of after[pick]) waiting[next]--
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

  for (const y of RAIL_Y) {
    const rail = { x: RAIL_X[0], y: y - 3, w: RAIL_X[1] - RAIL_X[0], d: 6, r: 1 }
    out.push(S(k.slabOf(rail, 0, 4, P, 3, 0.4), { tone: 'mid' }))
    out.push(L(k.lineOnTop([rail.x, y], [rail.x + rail.w, y], 4, P), { tone: 'faint' }))
    out.push(D([RAIL_X[0] + 8, 0, RAIL_X[1] - 8].map((x) => at([x, y, 4])), { size: 0.42 }))
    for (const x of [RAIL_X[0] - 6, RAIL_X[1]]) {
      out.push(S(k.slabOf({ x, y: y - 7, w: 6, d: 14, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: 'mid' }))
      out.push(D([at([x + 3, y - 3.5, 8]), at([x + 3, y + 3.5, 8])], { size: 0.45 }))
    }
  }

  // Ruler strips along the near side of both beds, a major tick on every column.
  for (const cy of [0, OUT_Y]) {
    const strip = { x: HALF + 6, y: cy - HALF, w: 7, d: HALF * 2, r: 1 }
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
    const ticks = k.topTicks(cy - (DRAWN / 2) * Q, cy + (DRAWN / 2) * Q, Q / 2, 2, strip.x + 0.6, 0.6, [2, 3.8], P, 'y')
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  }
  // Label plate between the beds.
  const label = { x: HALF + 6, y: -50, w: 20, d: 18, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 11], [7, 7], [11, 9]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 2 + dx, label.y + 4], [label.x + 2 + dx, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))
  out.push(D([at([label.x + 17, label.y + 3, 0.8]), at([label.x + 17, label.y + label.d - 3, 0.8])], { size: 0.45 }))
  return out.join('')
}

function upright(y) {
  const out = []
  out.push(S(k.slabOf(plan(0, y, 22, 16, 2), 4, 5, P, 3, 0.5), { tone: 'mid' }))
  out.push(D([[-7, -4.5], [7, -4.5], [-7, 4.5], [7, 4.5]].map(([dx, dy]) => at([dx, y + dy, 9])), { size: 0.45 }))
  out.push(S(k.slabOf(plan(0, y, 10, 8, 1.2), 9, BEAM[0] - 9, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(plan(0, y, 10, 8, 1.2), 34, P, 3), { tone: 'faint' }) }))
  return out.join('')
}

function beam() {
  const body = { x: -5, y: RAIL_Y[0] - 6, w: 10, d: RAIL_Y[1] - RAIL_Y[0] + 12, r: 1.5 }
  const out = [S(k.slabOf(body, BEAM[0], BEAM[1] - BEAM[0], P, 3, 0.8), { tone: 'mid' })]
  const ticks = k.topTicks(RAIL_Y[0] + 10, RAIL_Y[1] - 10, 4, 5, body.x + 0.8, BEAM[1], [1.8, 3.4], P, 'y')
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(D(RAIL_Y.flatMap((y) => [at([-2.4, y - 2.5, BEAM[1]]), at([2.4, y + 2.5, BEAM[1]])]), { size: 0.45 }))
  return out.join('')
}

function crank() {
  const box = { x: RAIL_X[1] + 10, y: RAIL_Y[1] - 9, w: 12, d: 18, r: 1.5 }
  const out = [S(k.slabOf(box, 0, 10, P, 3, 0.6), { tone: 'mid' })]
  out.push(L(k.planOutline(k.insetPlan(box, 2), 10, P, 3), { tone: 'faint' }))
  const [x, y] = [box.x + 6, box.y + 9]
  out.push(S(k.cylinder(x, y, 4.6, 10, 4, P, 28), { tone: 'mid' }))
  out.push(L(k.knurl(x, y, 4.6, 10, 14, 28, P), { tone: 'lo' }))
  out.push(L(k.lineOnTop([x, y], [x + 4, y], 14, P), { tone: 'hi', free: 'end' }))
  out.push(D([at([x, y, 14])], { size: 0.5, tone: 'hi' }))
  return out.join('')
}

// A tray is a floor and four walls; each wall is its own item so columns sort against it.
function trayItems(cy, sockets = '') {
  const inner = { x: -HALF, y: cy - HALF, w: HALF * 2, d: HALF * 2 }
  const outer = { x: inner.x - 3, y: inner.y - 3, w: inner.w + 6, d: inner.d + 6, r: 1.6 }
  const items = [{ box: [outer.x, outer.x + outer.w, outer.y, outer.y + outer.d, 0, FLOOR], svg: S(k.slabOf(outer, 0, FLOOR, P, 4, 0.6), { tone: 'lo' }) + sockets }]
  const walls = [
    { x: outer.x, y: outer.y, w: 3, d: outer.d },
    { x: outer.x + outer.w - 3, y: outer.y, w: 3, d: outer.d },
    { x: inner.x, y: outer.y, w: inner.w, d: 3 },
    { x: inner.x, y: inner.y + inner.d, w: inner.w, d: 3 },
  ]
  for (const wall of walls) {
    items.push({
      box: [wall.x, wall.x + wall.w, wall.y, wall.y + wall.d, FLOOR, FLOOR + WALL_H],
      svg: S(k.slabOf({ ...wall, r: 0.8 }, FLOOR, WALL_H, P, 3, 0.4), { tone: 'mid' }) + D([at([wall.x + wall.w / 2, wall.y + wall.d / 2, FLOOR + WALL_H])], { size: 0.4 }),
    })
  }
  return items
}

function chipStack(x, y, tones, heights) {
  const out = []
  let z = FLOOR
  heights.forEach((h, c) => {
    if (h < 0.05) return
    out.push(S(k.slabOf(plan(x, y, CHIP, CHIP, 0.6), z, h, P, 2), { tone: tones[c], crease: 'faint' }))
    z += h
  })
  return out.join('')
}

// A die: C_in layers K × K wide, a shoe with the K × K weight grid, and one bias knob.
function rotatedRing(cx, cy, half, angle) {
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [cx + (u * c - v * s) * half, cy + (u * s + v * c) * half])
}
function dieSvg(config, cx, cy, zb, angle, lit) {
  const out = []
  const half = (config.k * Q) / 2 - 0.4
  const tones = TONES[config.cin]
  for (let c = 0; c < config.cin; c++) {
    out.push(S(k.extrude(rotatedRing(cx, cy, half, angle), zb + c * LAYER, LAYER, P), { tone: tones[c], crease: 'faint' }))
  }
  const shoeZ = zb + config.cin * LAYER
  const shoe = rotatedRing(cx, cy, half + 0.8, angle)
  out.push(S(k.extrude(shoe, shoeZ, 2.2, P, { bevel: 0.5 }), { tone: 'hi', crease: 'lo', lit }))
  const top = shoeZ + 2.2
  const grid = []
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  const local = (u, v) => [cx + u * c - v * s, cy + u * s + v * c]
  for (let index = 1; index < config.k; index++) {
    const t = -half + index * Q
    grid.push(k.lineOnTop(local(t, -half), local(t, half), top, P), k.lineOnTop(local(-half, t), local(half, t), top, P))
  }
  out.push(L(k.onTop(rotatedRing(cx, cy, half, angle), top, P, true), { tone: 'faint' }))
  if (grid.length) out.push(L(grid.join(''), { tone: 'faint' }))
  const [bx, by] = local(half - 0.6, -half + 0.6)
  out.push(S(k.cylinder(bx, by, 1.1, top, 1.6, P, 14), { tone: 'hi', crease: 'lo' }))
  out.push(D([at([bx, by, top + 1.6])], { size: 0.4, tone: 'hi' }))
  return { svg: out.join(''), top, half }
}

function trolley(cx, cy) {
  const out = []
  out.push(S(k.cylinder(cx, cy, 3.4, SLEEVE[0], SLEEVE[1] - SLEEVE[0], P, 22), { tone: 'mid', inner: L(k.sideArc(cx, cy, 3.4, SLEEVE[0] + 2.4, P, 14), { tone: 'faint' }) }))
  out.push(S(k.slabOf(plan(cx, cy, 14, 16, 1.5), SLEEVE[1], BEAM[0] - SLEEVE[1], P, 3, 0.5), { tone: 'mid' }))
  out.push(D([at([cx + 7, cy - 4.5, SLEEVE[1] + 2.5]), at([cx + 7, cy + 4.5, SLEEVE[1] + 2.5])], { size: 0.42 }))
  return out.join('')
}

// ---------- the live figure ----------

export const meta = { id: 'channel-stack', fig: 'Fig 6.1', title: '多通道冲床', titleEn: 'Multi-channel punch' }

export function render({ lang = 'zh' } = {}) {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      '底板上的多通道冲床。输入针床是八乘八根像素柱，每根柱由若干片叠成，一片对应一个输入通道。龙门上的冲模有 K 乘 K 那么宽、和通道数一样多层，压一次盖住一整块，只得到一个数；同一滑架上的放置器把这个数作为一片放到输出针床上。扫完所有窗口，输出柱多出一层，即一张激活图。转盘上放着 C_out 个冲模，逐个换上，输出柱就长到 C_out 层。',
      'A multi-channel punch on a base plate. The input bed is eight by eight pixel columns, each a stack of chips, one chip per input channel. The die on the gantry is K by K wide and has as many layers as there are channels; one stroke covers a whole block and yields a single number, which a placer on the same carriage drops as a chip onto the output bed. Once every window has been swept, each output column has grown by one layer: one activation map. A turntable holds C_out dies; swapped in one at a time, they grow the output columns to C_out layers.',
    ),
    body: [
      base(),
      `<g data-part="upright-far">${upright(RAIL_Y[0])}</g>`,
      '<g data-part="work"></g>',
      `<g data-part="upright-near">${upright(RAIL_Y[1])}</g>`,
      crank(),
      `<g data-part="beam">${beam()}</g>`,
    ],
  })
  const button = (set, value, text) => `<button type="button" data-set="${set}" data-value="${value}">${text}</button>`
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, '卷积层设置', 'Conv layer settings')}">
    <div class="fx-control"><span>${t(lang, '输入通道 C_in', 'Channels C_in')}</span>${CHOICES.cin.map((v) => button('cin', v, v)).join('')}</div>
    <div class="fx-control"><span>${t(lang, '核 K', 'Kernel K')}</span>${CHOICES.k.map((v) => button('k', v, `${v}×${v}`)).join('')}</div>
    <div class="fx-control"><span>${t(lang, '滤波器 C_out', 'Filters C_out')}</span>${CHOICES.cout.map((v) => button('cout', v, v)).join('')}</div>
  </div>
  <div class="fx-calc"><span>(K·K·C_in + 1)·C_out =</span><b data-calc="conv"></b><i>·</i><span data-calc="fc-label"></span><b data-calc="fc"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '←→ 换滤波器 · 空格', '←→ switch filter · space'),
      readout: '',
      keys: [
        { mark: 'lit', label: t(lang, '正在工作的冲模：K × K × C_in', 'working die: K × K × C_in') },
        { mark: 'raised', label: t(lang, '像素柱：一片一个输入通道', 'pixel column: one chip per input channel') },
        { mark: 'flat', label: t(lang, '输出柱：一层一张激活图', 'output column: one layer per activation map') },
      ],
      caption: t(
        lang,
        '冲模的每一层对准一个输入通道，所以一个 5 × 5 × 3 的滤波器压一次就盖住整块 5 × 5 × 3 的像素，只得到一个数；扫完所有窗口，输出柱多出一层，就是一张激活图。转盘上有几个冲模，输出柱就长几层，成为下一层的输入通道。参数 = (K·K·C_in + 1)·C_out，+1 是每个冲模顶上的偏置旋钮；窗口再多也共用同一组冲模，所以参数与图像大小无关。针床只画了 8 × 8，计数按笔记的 32 × 32 输入。',
        'Each layer of the die lines up with one input channel, so a 5 × 5 × 3 filter covers a whole 5 × 5 × 3 block of pixels in one stroke and yields a single number; once every window has been swept, each output column has one more layer: an activation map. The output columns grow one layer per die on the turntable, and those layers become the input channels of the next layer. Parameters = (K·K·C_in + 1)·C_out, where the +1 is the bias knob on top of each die; however many windows there are, they all share the same dies, so the parameter count does not depend on the image size. The bed is drawn only 8 × 8; the counts use the note’s 32 × 32 input.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, '多通道冲床。左右方向键切换滤波器，空格暂停或继续，Home 重新开始。', 'Multi-channel punch. Left and right arrow keys switch filters, space pauses or resumes, Home starts over.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const work = part('work')
  const movers = [part('upright-far'), part('upright-near'), part('beam')]
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const config = { ...DEFAULTS }
  let build = null // everything that depends on the configuration
  const shown = { x: 0, y: 0, z: Z_TRAVEL, index: 0 }
  const state = { clock: 0, playing: true, lastKey: '' }

  // ----- the run: a timeline of segments, a pure function of time -----
  function layout() {
    const m = outSize(DRAWN, config.k)
    const list = windows(config.k)
    const half = (config.k * Q) / 2 + 0.4
    const rs = config.cout === 1 ? half + 12 : Math.max(half + 11, half + (half + 1.5) / Math.tan(Math.PI / config.cout))
    const radius = Math.hypot(rs + half, half) + 3
    const station = [0, CAR_Y - rs]
    const centre = (i, j) => [(i - (m - 1) / 2) * Q, (j - (m - 1) / 2) * Q]
    const step = clamp(3.4 / list.length, 0.075, 0.36)
    const hover = FLOOR + config.cin * LAYER + 1.4
    const segments = []
    const push = (segment) => {
      segment.start = segments.length ? segments.at(-1).start + segments.at(-1).dur : 0
      segments.push(segment)
    }
    const first = centre(...list[0])
    const last = centre(...list.at(-1))
    push({ kind: 'grab', dur: 0.8, o: 0 })
    for (let o = 0; o < config.cout; o++) {
      if (o > 0) {
        push({ kind: 'travel', dur: 0.8, from: last, to: station, o: o - 1 })
        push({ kind: 'release', dur: 0.8, o: o - 1 })
        push({ kind: 'index', dur: 0.9, from: o - 1, to: o, o: o - 1 })
        push({ kind: 'grab', dur: 0.8, o })
      }
      push({ kind: 'travel', dur: 0.8, from: station, to: first, o })
      push({ kind: 'sweep', dur: 1.3 + (list.length - 1) * step, o, step })
    }
    push({ kind: 'travel', dur: 0.8, from: last, to: station, o: config.cout - 1 })
    push({ kind: 'release', dur: 0.8, o: config.cout - 1 })
    push({ kind: 'hold', dur: 2.6, o: config.cout - 1 })
    push({ kind: 'index', dur: 0.9, from: config.cout - 1, to: config.cout, o: config.cout - 1 })
    push({ kind: 'clear', dur: 1.2, o: config.cout - 1 })
    return { m, list, rs, radius, station, centre, step, hover, segments, total: segments.at(-1).start + segments.at(-1).dur }
  }

  // Where everything is at time t.
  function poseAt(t) {
    const { segments, list, station, centre, hover } = build.plan
    const time = ((t % build.plan.total) + build.plan.total) % build.plan.total
    const segment = segments.find((s) => time < s.start + s.dur) ?? segments.at(-1)
    const u = clamp((time - segment.start) / segment.dur, 0, 1)
    const o = segment.o
    const pose = { x: station[0], y: station[1], z: Z_TRAVEL, carrying: o, index: o, o, filled: o, partial: 0, clear: 0, window: -1, kind: segment.kind }
    // filled: maps fully done before this one; partial: windows stamped in map o.
    const dip = (low, grabbing) => {
      const v = u < 0.5 ? ease(u * 2) : ease((1 - u) * 2)
      pose.z = mix(Z_TRAVEL, low, v)
      if (grabbing !== undefined) pose.carrying = (u >= 0.5) === grabbing ? o : null
    }
    switch (segment.kind) {
      case 'grab':
        dip(DISC[1], true)
        pose.filled = o
        break
      case 'release':
        dip(DISC[1], false)
        pose.filled = o + 1
        break
      case 'travel': {
        const v = ease(u)
        pose.x = mix(segment.from[0], segment.to[0], v)
        pose.y = mix(segment.from[1], segment.to[1], v)
        pose.filled = segment.to === station ? o + 1 : o
        pose.kind = segment.to === station ? 'unload' : 'load'
        break
      }
      case 'index':
        pose.carrying = null
        pose.index = mix(segment.from, segment.to, ease(u))
        pose.filled = o + 1
        break
      case 'hold':
        pose.carrying = null
        pose.filled = config.cout
        break
      case 'clear':
        pose.carrying = null
        pose.index = config.cout
        pose.filled = config.cout
        pose.clear = ease(u)
        break
      case 'sweep': {
        const local = time - segment.start
        const n = local < 1.3 ? 0 : Math.min(list.length - 1, 1 + Math.floor((local - 1.3) / segment.step))
        const v = n === 0 ? local / 1.3 : (local - 1.3 - (n - 1) * segment.step) / segment.step
        const here = centre(...list[n])
        const end = n === list.length - 1 ? Z_TRAVEL : hover
        if (n === 0) {
          ;[pose.x, pose.y] = here
          pose.z = v < 0.4 ? mix(Z_TRAVEL, FLOOR, ease(v / 0.4)) : v < 0.7 ? FLOOR : mix(FLOOR, end, ease((v - 0.7) / 0.3))
          pose.partial = v >= 0.4 ? 1 : 0
        } else {
          const from = centre(...list[n - 1])
          const move = ease(clamp(v / 0.35, 0, 1))
          pose.x = mix(from[0], here[0], move)
          pose.y = mix(from[1], here[1], move)
          const w = clamp((v - 0.35) / 0.65, 0, 1)
          pose.z = w < 0.5 ? mix(hover, FLOOR, ease(w * 2)) : mix(FLOOR, end, ease((w - 0.5) * 2))
          pose.partial = n + (w >= 0.5 ? 1 : 0)
        }
        pose.window = n
        break
      }
    }
    return pose
  }

  // Clock times that the keys jump to: the start of each filter's work, and a still frame per filter.
  const startOf = (o) => build.plan.segments.find((s) => s.o === o && s.kind === 'grab')?.start ?? 0
  const stillOf = (o) => {
    const sweep = build.plan.segments.find((s) => s.kind === 'sweep' && s.o === o)
    return sweep.start + 1.3 + (build.plan.list.length - 2) * sweep.step + sweep.step * 0.7
  }

  // ----- building the work layer for a configuration -----
  function rebuild() {
    build = { plan: layout() }
    const { m, radius, rs } = build.plan
    const items = []
    const add = (box, svg, extra = {}) => {
      const node = svgNode(svg)
      const item = { box, node, ...extra }
      items.push(item)
      return item
    }
    // Input bed: every column holds C_in chips.
    trayItems(0).forEach((item) => add(item.box, item.svg))
    const tones = TONES[config.cin]
    for (let i = 0; i < DRAWN; i++) {
      for (let j = 0; j < DRAWN; j++) {
        const [x, y] = [(i - (DRAWN - 1) / 2) * Q, (j - (DRAWN - 1) / 2) * Q]
        add([x - CHIP / 2, x + CHIP / 2, y - CHIP / 2, y + CHIP / 2, FLOOR, FLOOR + config.cin * LAYER], chipStack(x, y, tones, tones.map(() => LAYER)))
      }
    }
    // Output bed: sockets for the M × M map, and a column per output position.
    const sockets = []
    build.columns = []
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        const [x, y] = [(i - (m - 1) / 2) * Q, OUT_Y + (j - (m - 1) / 2) * Q]
        sockets.push(k.planOutline(plan(x, y, CHIP + 0.8, CHIP + 0.8, 0.8), FLOOR, P, 2))
        const item = add([x - CHIP / 2, x + CHIP / 2, y - CHIP / 2, y + CHIP / 2, FLOOR, FLOOR + 0.1], '')
        build.columns.push({ item, x, y, i, j, heights: Array.from({ length: config.cout }, () => ({ at: 0, rate: 0 })), drawn: '' })
      }
    }
    trayItems(OUT_Y, L(sockets.join(''), { tone: 'faint' })).forEach((item) => add(item.box, item.svg))

    // Carousel: pedestal, disc and seats in one item; hub, detent roller and dies apart.
    build.disc = add([-radius, radius, CAR_Y - radius, CAR_Y + radius, 0, DISC[1]], '')
    build.hub = add([-7, 7, CAR_Y - 7, CAR_Y + 7, DISC[1], DISC[1] + 3.2], S(k.cylinder(0, CAR_Y, 7, DISC[1], 2, P, 32, 0.5), { tone: 'mid' }) + S(k.cylinder(0, CAR_Y, 3.6, DISC[1] + 2, 1.2, P, 24), { tone: 'mid' }) + D([at([0, CAR_Y, DISC[1] + 3.2])], { size: 0.5, tone: 'hi' }))
    const roller = [radius + 2.4, CAR_Y]
    add([roller[0] - 3, roller[0] + 3, CAR_Y - 3, CAR_Y + 3, 0, DISC[1] + 1.2],
      S(k.slabOf(plan(roller[0] + 1.2, CAR_Y, 8, 8, 1.2), 0, 2, P, 3, 0.4), { tone: 'mid' })
      + S(k.cylinder(roller[0], CAR_Y, 2.4, 2, DISC[1] - 2 + 1.2, P, 20), { tone: 'mid', inner: L(k.sideArc(roller[0], CAR_Y, 2.4, DISC[0] + 1.6, P, 14), { tone: 'faint' }) })
      + D([at([roller[0], CAR_Y, DISC[1] + 1.2])], { size: 0.45 }))
    build.dies = Array.from({ length: config.cout }, (_, o) => ({ o, item: add([0, 0, 0, 0, 0, 0], ''), drawn: '' }))

    // The heads: die on its ram, setter, and the carriage with both trolleys under the beam.
    build.head = add([0, 0, 0, 0, 0, 0], '')
    build.setter = add([0, 0, 0, 0, 0, 0], '')
    build.carriage = add([0, 0, 0, 0, 0, 0], '')
    build.items = items
    build.rs = rs
    build.radius = radius
    work.replaceChildren()
    state.lastKey = ''
    describe()
  }

  function discSvg(index) {
    const { radius, rs } = build
    const out = []
    out.push(S(k.cylinder(0, CAR_Y, radius * 0.5, 0, DISC[0], P, 48, 0.6), { tone: 'lo' }))
    out.push(S(k.cylinder(0, CAR_Y, radius, DISC[0], DISC[1] - DISC[0], P, 96, 0.8), { tone: 'mid' }))
    const turn = (index / config.cout) * Math.PI * 2
    const ticks = k.radialTicks(0, CAR_Y, radius, config.cout * 6, 6, DISC[1], [1.4, 3], P, -turn)
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
    const half = (config.k * Q) / 2 + 0.4
    for (let o = 0; o < config.cout; o++) {
      const angle = ((o - index) / config.cout) * Math.PI * 2
      const [cx, cy] = [Math.sin(angle) * rs, CAR_Y - Math.cos(angle) * rs]
      const ring = rotatedRing(cx, cy, half + 0.6, angle)
      out.push(L(k.onTop(ring, DISC[1], P, true), { tone: 'faint' }))
      out.push(D(rotatedRing(cx, cy, half - 0.8, angle).map(([x, y]) => at([x, y, DISC[1]])), { size: 0.4 }))
    }
    return out.join('')
  }

  // ----- drawing a frame -----
  function draw(pose) {
    const [x, y, zb] = [shown.x, shown.y, shown.z]
    const sy = y + OUT_Y
    const mover = k.translateAlong(P, [x, 0, 0])
    movers.forEach((node) => node.setAttribute('transform', mover))

    // Die on the ram, or the bare chuck.
    const carrying = pose.carrying
    let top
    let svgHead = ''
    if (carrying !== null) {
      const die = dieSvg(config, x, y, zb, 0, true)
      svgHead += die.svg
      top = die.top
    } else {
      top = zb + config.cin * LAYER + 2.2
    }
    svgHead += S(k.cylinder(x, y, 2.4, top, 1.6, P, 18), { tone: 'mid' })
    svgHead += S(k.cylinder(x, y, 1.1, top + 1.6, SLEEVE[0] - top - 1.6, P, 14), { tone: 'mid', crease: 'none' })
    const half = (config.k * Q) / 2 + 0.4
    const reach = carrying !== null ? half : 2.4
    build.head.box = [x - reach, x + reach, y - reach, y + reach, zb, SLEEVE[0]]
    build.head.moved = true
    build.head.node.innerHTML = svgHead

    // Setter: its foot rides as far above the output column as the die rides above the bed.
    const level = Math.min(pose.o, config.cout - 1)
    const footZ = FLOOR + (level + 1) * LAYER + (zb - FLOOR)
    build.setter.node.innerHTML = S(k.cylinder(x, sy, 2.1, footZ, 1.1, P, 16), { tone: 'hi', crease: 'lo' }) + S(k.cylinder(x, sy, 0.75, footZ + 1.1, SLEEVE[0] - footZ - 1.1, P, 12), { tone: 'hi', crease: 'none' })
    build.setter.box = [x - 2.1, x + 2.1, sy - 2.1, sy + 2.1, footZ, SLEEVE[0]]
    build.setter.moved = true

    // Carriage: two trolleys tied by a link bar under the beam.
    const tie = { x: x - 1.6, y: sy, w: 3.2, d: y - sy, r: 0.8 }
    build.carriage.node.innerHTML = S(k.slabOf(tie, SLEEVE[1] + 1.5, 3, P, 2, 0.4), { tone: 'mid' }) + trolley(x, sy) + trolley(x, y)
    build.carriage.box = [x - 8, x + 8, sy - 8, y + 8, SLEEVE[0], BEAM[0]]
    build.carriage.moved = true

    // Carousel: disc and the dies that sit on it.
    const index = shown.index
    const discKey = index.toFixed(3)
    if (build.disc.drawn !== discKey) {
      build.disc.drawn = discKey
      build.disc.node.innerHTML = discSvg(index)
    }
    for (const die of build.dies) {
      const onRam = carrying === die.o
      const angle = ((die.o - index) / config.cout) * Math.PI * 2
      const [cx, cy] = [Math.sin(angle) * build.rs, CAR_Y - Math.cos(angle) * build.rs]
      const key = onRam ? 'ram' : `${cx.toFixed(2)},${cy.toFixed(2)}`
      if (die.drawn === key) continue
      die.drawn = key
      if (onRam) {
        die.item.node.innerHTML = ''
        die.item.box = [0, 0, 0, 0, -20, -19]
      } else {
        die.item.node.innerHTML = dieSvg(config, cx, cy, DISC[1], angle, false).svg
        const ring = rotatedRing(cx, cy, half + 0.4, angle)
        const xs = ring.map(([px]) => px)
        const ys = ring.map(([, py]) => py)
        die.item.box = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), DISC[1], DISC[1] + config.cin * LAYER + 3.8]
      }
      die.item.moved = true
    }

    // Output columns.
    const tones = (c) => (c === level && pose.kind !== 'hold' && pose.kind !== 'clear' ? 'hi' : 'mid')
    for (const column of build.columns) {
      const heights = column.heights.map((h) => h.at)
      const key = heights.map((h) => h.toFixed(2)).join(',') + level
      if (key === column.drawn) continue
      column.drawn = key
      column.item.node.innerHTML = chipStack(column.x, column.y, heights.map((_, c) => tones(c)), heights)
      column.item.box[5] = FLOOR + Math.max(0.1, heights.reduce((sum, h) => sum + h, 0))
      column.item.moved = true
    }
    applyOrder(work, paintOrder(build.items))
  }

  // Which output chips should be standing in this pose.
  function chipGoal(column, c, pose) {
    if (pose.clear > 0) return LAYER * (1 - pose.clear)
    if (c < pose.filled) return LAYER
    if (c > pose.o || c >= pose.filled + 1) return 0
    const order = build.plan.list.findIndex(([i, j]) => i === column.i && j === column.j)
    return order < pose.partial ? LAYER : 0
  }

  function say(pose) {
    const total = t(lang, `${group(convParams(config))} 参数`, `${group(convParams(config))} params`)
    const of = `${pose.o + 1}/${config.cout}`
    const kind = pose.kind
    let text
    if (kind === 'sweep') text = t(lang, `滤波器 ${of} · 窗口 ${pose.window + 1}/${build.plan.list.length} · ${total}`, `filter ${of} · window ${pose.window + 1}/${build.plan.list.length} · ${total}`)
    else if (kind === 'hold') text = t(lang, `输出 ${build.plan.m}×${build.plan.m}×${config.cout} · ${total}`, `out ${build.plan.m}×${build.plan.m}×${config.cout} · ${total}`)
    else if (kind === 'clear') text = t(lang, `清空输出 · ${total}`, `clearing output · ${total}`)
    else if (kind === 'grab' || kind === 'load') text = t(lang, `装冲模 ${of} · ${total}`, `loading die ${of} · ${total}`)
    else text = t(lang, `卸冲模 ${of} · ${total}`, `unloading die ${of} · ${total}`)
    if (!state.playing) text = t(lang, `已暂停 · 滤波器 ${of} · ${total}`, `paused · filter ${of} · ${total}`)
    if (readout.textContent !== text) readout.textContent = text
  }

  function describe() {
    const each = perFilter(config)
    const total = convParams(config)
    const fc = fcParams(config)
    const n = NOTE_N
    const o = outSize(n, config.k)
    calc.conv.textContent = `(${config.k}·${config.k}·${config.cin} + 1)·${config.cout} = ${each} × ${config.cout} = ${group(total)}`
    calc['fc-label'].textContent = t(lang, `全连接（${n}×${n}×${config.cin} → ${o}×${o}×${config.cout}）=`, `fully connected (${n}×${n}×${config.cin} → ${o}×${o}×${config.cout}) =`)
    calc.fc.textContent = t(lang, `${group(fc)}（${wan(fc)}）`, `${group(fc)} (${mega(fc)})`)
    buttons.forEach((node) => node.setAttribute('aria-pressed', String(Number(node.dataset.value) === config[node.dataset.set])))
    stage.setAttribute(
      'aria-valuetext',
      t(
        lang,
        `${config.cout} 个 ${config.k}×${config.k}×${config.cin} 的滤波器（${CHANNELS[config.cin].join('、')}），共 ${total} 个参数；同样输入输出的全连接层要 ${fc} 个。`,
        `${config.cout} ${config.k}×${config.k}×${config.cin} ${config.cout === 1 ? 'filter' : 'filters'} (${CHANNELS_EN[config.cin].join(', ')}), ${group(total)} parameters in all; a fully connected layer with the same input and output needs ${group(fc)}.`,
      ),
    )
  }

  function tick(dt, calm) {
    if (state.playing && !calm) state.clock += dt
    const pose = poseAt(state.clock)
    // The shown head follows the timeline; a jump lifts it over the bed before it travels.
    const far = Math.hypot(shown.x - pose.x, shown.y - pose.y) > 0.6
    shown.x = follow(shown.x, pose.x, dt, far ? 0.16 : 0.03, calm)
    shown.y = follow(shown.y, pose.y, dt, far ? 0.16 : 0.03, calm)
    shown.z = far ? follow(shown.z, Math.max(pose.z, Z_TRAVEL), dt, 0.1, calm) : follow(shown.z, pose.z, dt, 0.03, calm)
    // The carousel wraps: index cout and 0 are the same seat, so never spin back the long way.
    shown.index += config.cout * Math.round((pose.index - shown.index) / config.cout)
    shown.index = follow(shown.index, pose.index, dt, 0.06, calm)
    let moving = state.playing && !calm
    moving = moving || shown.x !== pose.x || shown.y !== pose.y || shown.z !== pose.z || shown.index !== pose.index
    for (const column of build.columns) {
      column.heights.forEach((h, c) => {
        moving = spring(h, chipGoal(column, c, pose), dt, 220, 24, calm) || moving
      })
    }
    draw(pose)
    say(pose)
    return moving
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.playing = true
    loop.run()
  }, 9000)

  function restart() {
    rebuild()
    state.clock = loop.still.matches ? stillOf(config.cout - 1) : 0
    const pose = poseAt(state.clock)
    Object.assign(shown, { x: pose.x, y: pose.y, z: pose.z, index: pose.index })
    tick(1 / 60, true)
    loop.run()
  }

  function jump(o) {
    const target = clamp(o, 0, config.cout - 1)
    state.clock = loop.still.matches ? stillOf(target) : startOf(target)
    loop.run()
  }
  const currentFilter = () => poseAt(state.clock).o

  const onKey = (event) => {
    if (event.key === 'ArrowRight') jump(currentFilter() + 1)
    else if (event.key === 'ArrowLeft') jump(currentFilter() - 1)
    else if (event.key === 'Home') jump(0)
    else if (event.key === ' ' || event.key === 'Enter') {
      state.playing = !state.playing
      if (!state.playing) idle.touch()
    } else return
    event.preventDefault()
    loop.run()
  }
  const onButton = (event) => {
    const node = event.target.closest('[data-set]')
    if (!node) return
    config[node.dataset.set] = Number(node.dataset.value)
    state.playing = true
    restart()
  }
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  restart()

  return () => {
    loop.stop()
    idle.clear()
    stage.removeEventListener('keydown', onKey)
    root.removeEventListener('click', onButton)
  }
}
