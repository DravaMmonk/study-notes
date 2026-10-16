import * as k from '../kit/iso-kit.js'
import { applyOrder, clamp, createIdle, createLoop, floorPoint, follow, spring, svgNode, t, viewBoxPoint } from '../common.js'
import { IMAGE, K, KERNELS, N, appliedWeights, format, outputSize, respond, responseMap, windowOrigin } from './model.js'

// Fig · The filter press.
// A 3 × 3 head of spring feelers rides a gantry over a 7 × 7 bed of pixel pins. Each feeler carries
// as many washers as its kernel weight (dark washers are negative). Where the head comes down, the
// feelers rest on nine pins; a setter on the same beam raises the matching pin in the output tray
// to Σ f·h. Stride sets how far the gantry steps, padding adds a ring of zero pads around the bed.

const W = 640
const H = 390
const PITCH = 12
const PIN = 8
const FLOOR = 2
const WALL = 4
const WALL_H = 6.5
const PIN_BASE = 1.2
const PIN_SCALE = 1.15
const OUT_MAX = 11.5
const HEAD = 42
const HEAD_H = 8
const WORK = 24
const LIFT = 37
const REACH = 22
const RAM = 20
const RAM_Y = -18.5
const SLEEVE = [52, 70]
const BEAM = [76, 84]
const RAIL_Y = [42, -252]
const RAIL_X = [-40, 112]
const OUT_MID = -172

const PLATE = { x: -50, y: -268, w: 186, d: 330, r: 8 }
const IN_FLOOR = { x: -20, y: -92, w: 112, d: 112, r: 2 }
const OUT_FLOOR = { x: -20, y: -218, w: 112, d: 92, r: 2 }

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [0, -260, BEAM[1]], [0, 50, BEAM[1]], [72, -260, BEAM[1]], [72, 50, BEAM[1]]],
  W,
  H,
  { pad: 26, azimuth: 35 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const plan = (cx, cy, w, d, r = 1) => ({ x: cx - w / 2, y: cy - d / 2, w, d, r })
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))

const cellX = (row) => row * PITCH
const cellY = (col) => -col * PITCH
const pinHeight = (value) => PIN_BASE + value * PIN_SCALE

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 11)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // Rails with end stops, one each side of the beds.
  for (const y of RAIL_Y) {
    const rail = { x: RAIL_X[0], y: y - 3, w: RAIL_X[1] - RAIL_X[0], d: 6, r: 1 }
    out.push(S(k.slabOf(rail, 0, 4, P, 3, 0.4), { tone: 'mid' }))
    out.push(L(k.lineOnTop([rail.x, y], [rail.x + rail.w, y], 4, P), { tone: 'faint' }))
    out.push(D([RAIL_X[0] + 8, 36, RAIL_X[1] - 8].map((x) => at([x, y, 4])), { size: 0.42 }))
    for (const x of [RAIL_X[0] - 6, RAIL_X[1]]) {
      out.push(S(k.slabOf({ x, y: y - 7, w: 6, d: 14, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: 'mid' }))
      out.push(D([at([x + 3, y - 3.5, 8]), at([x + 3, y + 3.5, 8])], { size: 0.45 }))
    }
  }

  // Front ruler strips, major ticks on the pixel centres, and the label plate between the beds.
  const strips = [
    { x: 104, y: -94, w: 7, d: 114, r: 1 },
    { x: 104, y: -220, w: 7, d: 96, r: 1 },
  ]
  for (const strip of strips) {
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
    const ticks = k.topTicks(strip.y + 2, strip.y + strip.d - 2, 4, 3, strip.x + 0.6, 0.6, [2, 3.8], P, 'y')
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  }
  const label = { x: 102, y: -119, w: 22, d: 22, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[4, 15], [8, 11], [12, 13]].forEach(([dx, length]) => {
    out.push(L(k.lineOnTop([label.x + 4 + dx * 0.9, label.y + 4], [label.x + 4 + dx * 0.9, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true }))
  })
  out.push(D([at([label.x + 18.5, label.y + 3.5, 0.8]), at([label.x + 18.5, label.y + label.d - 3.5, 0.8])], { size: 0.45 }))
  return out.join('')
}

// A tray: floor plus four walls. Far walls go behind the pins, near walls in front of them.
function tray(floor) {
  const outer = k.insetPlan(floor, -WALL)
  const back = [S(k.slabOf(outer, 0, FLOOR, P, 4, 0.6), { tone: 'lo' })]
  back.push(S(k.slabOf({ x: outer.x, y: outer.y, w: WALL, d: outer.d, r: 1 }, FLOOR, WALL_H - FLOOR, P, 3, 0.4), { tone: 'mid' }))
  back.push(S(k.slabOf({ x: outer.x + WALL, y: outer.y, w: outer.w - WALL, d: WALL, r: 1 }, FLOOR, WALL_H - FLOOR, P, 3, 0.4), { tone: 'mid' }))
  const front = [
    S(k.slabOf({ x: outer.x + outer.w - WALL, y: outer.y + WALL, w: WALL, d: outer.d - WALL, r: 1 }, FLOOR, WALL_H - FLOOR, P, 3, 0.4), { tone: 'mid' }),
    S(k.slabOf({ x: outer.x + WALL, y: outer.y + outer.d - WALL, w: outer.w - WALL * 2, d: WALL, r: 1 }, FLOOR, WALL_H - FLOOR, P, 3, 0.4), { tone: 'mid' }),
  ]
  const corners = k.corners(outer, 2)
  front.push(D(corners.map(([x, y]) => at([x, y, WALL_H])), { size: 0.42 }))
  return { back: back.join(''), front: front.join('') }
}

function pinSvg(cx, cy, height, { tone = 'hi', lit = false, hollow = false } = {}) {
  const footprint = plan(cx, cy, PIN, PIN, 0.8)
  const top = FLOOR + height
  const inner = hollow
    ? `<path class="iso-shade" data-shade="0" d="${k.slabOf(k.insetPlan(footprint, 1.6), top, 0, P, 2).top}"/>${L(k.planOutline(k.insetPlan(footprint, 1.6), top, P, 2), { tone: 'mid' })}`
    : L(k.planOutline(k.insetPlan(footprint, 1.6), top, P, 2), { tone: 'faint' })
  return S(k.slabOf(footprint, FLOOR, height, P, 2, 0.4), { tone, lit, crease: tone === 'hi' ? 'lo' : 'faint', inner: '' }) + inner
}

function padSvg(cx, cy) {
  return S(k.slabOf(plan(cx, cy, PIN, PIN, 0.8), FLOOR, 0.6, P, 2), { tone: 'lo', crease: 'none' })
}

function socketSvg(cx, cy) {
  return L(k.planOutline(plan(cx, cy, PIN, PIN, 0.8), FLOOR, P, 2), { tone: 'faint' })
}

function upright(y) {
  const out = []
  out.push(S(k.slabOf(plan(0, y, 22, 16, 2), 4, 5, P, 3, 0.5), { tone: 'mid' }))
  out.push(D([[-7, -4.5], [7, -4.5], [-7, 4.5], [7, 4.5]].map(([dx, dy]) => at([dx, y + dy, 9])), { size: 0.45 }))
  out.push(S(k.slabOf(plan(0, y, 10, 8, 1.2), 9, BEAM[0] - 9, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(plan(0, y, 10, 8, 1.2), 36, P, 3), { tone: 'faint' }) }))
  return out.join('')
}

function beam() {
  const body = { x: -5, y: RAIL_Y[1] - 6, w: 10, d: RAIL_Y[0] - RAIL_Y[1] + 12, r: 1.5 }
  const out = [S(k.slabOf(body, BEAM[0], BEAM[1] - BEAM[0], P, 3, 0.8), { tone: 'mid' })]
  const ticks = k.topTicks(-220, 20, 4, 3, body.x + 0.8, BEAM[1], [1.8, 3.4], P, 'y')
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(D([RAIL_Y[0], RAIL_Y[1]].flatMap((y) => [at([-2.4, y - 2.5, BEAM[1]]), at([2.4, y + 2.5, BEAM[1]])]), { size: 0.45 }))
  return out.join('')
}

function front() {
  // Drive box and crank knob at the near end of the left rail.
  const box = { x: 118, y: RAIL_Y[0] - 9, w: 12, d: 18, r: 1.5 }
  const out = [S(k.slabOf(box, 0, 10, P, 3, 0.6), { tone: 'mid' })]
  out.push(L(k.planOutline(k.insetPlan(box, 2), 10, P, 3), { tone: 'faint' }))
  const knob = [box.x + 6, box.y + 9]
  out.push(S(k.cylinder(knob[0], knob[1], 4.6, 10, 4, P, 28), { tone: 'mid' }))
  out.push(L(k.knurl(knob[0], knob[1], 4.6, 10, 14, 28, P), { tone: 'lo' }))
  out.push(L(k.lineOnTop([knob[0], knob[1]], [knob[0] + 4, knob[1]], 14, P), { tone: 'hi', free: 'end' }))
  out.push(D([at([knob[0], knob[1], 14])], { size: 0.5, tone: 'hi' }))
  return out.join('')
}

function trolley(cx, cy) {
  const out = []
  out.push(S(k.cylinder(cx, cy, 4, SLEEVE[0], SLEEVE[1] - SLEEVE[0], P, 24), { tone: 'mid', inner: L(k.sideArc(cx, cy, 4, SLEEVE[0] + 2.5, P, 16), { tone: 'faint' }) }))
  out.push(S(k.slabOf(plan(cx, cy, 16, 18, 1.5), SLEEVE[1], BEAM[0] - SLEEVE[1], P, 3, 0.5), { tone: 'mid' }))
  out.push(D([at([cx + 8, cy - 5, SLEEVE[1] + 3]), at([cx + 8, cy + 5, SLEEVE[1] + 3])], { size: 0.42 }))
  return out.join('')
}

// ---------- the live figure ----------

export const meta = {
  id: 'conv-press',
  fig: 'Fig 3.1',
  title: '滤波压机',
  titleEn: 'Filter press',
}

const keysOf = (lang) => [
  { mark: 'lit', label: t(lang, '正在设定的输出针', 'output pin being set') },
  { mark: 'raised', label: t(lang, '像素针：高度 = 亮度', 'pixel pin: height = intensity') },
  { mark: 'dim', label: t(lang, '深色垫圈：负权重', 'dark washer: negative weight') },
]

export function render({ lang = 'zh' } = {}) {
  const bed = tray(IN_FLOOR)
  const outTray = tray(OUT_FLOOR)
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      '底板上的滤波压机。龙门横梁带着一个三乘三的弹簧探针压头，在七乘七的像素针床上移动，针的高度就是图像亮度；压头顶面每根螺柱上的垫圈数等于该位置的卷积核权重。压头落下后，同一横梁上的设定器把输出盘中对应的针升到加权和。',
      'A filter press on a base plate. A gantry beam carries a three-by-three head of spring feelers over a seven-by-seven bed of pixel pins whose heights are the image intensities; the washers stacked on each stud on top of the head count that position’s kernel weight. When the head comes down, a setter on the same beam raises the matching pin in the output tray to the weighted sum.',
    ),
    body: [
      base(),
      `<g data-part="upright-right">${upright(RAIL_Y[1])}</g>`,
      outTray.back,
      '<g data-part="out-sockets"></g>',
      '<g data-part="out-bed"></g>',
      outTray.front,
      bed.back,
      '<g data-part="in-sockets"></g>',
      '<g data-part="in-bed"></g>',
      bed.front,
      `<g data-part="upright-left">${upright(RAIL_Y[0])}</g>`,
      front(),
      `<g data-part="beam">${beam()}</g>`,
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, '滤波设置', 'Filter settings')}">
    <div class="fx-control"><span>${t(lang, '卷积核', 'Kernel')}</span>${Object.entries(KERNELS).map(([id, kernel]) => `<button type="button" data-set="kernel" data-value="${id}">${t(lang, kernel.name, kernel.nameEn)}</button>`).join('')}</div>
    <div class="fx-control"><span>${t(lang, '模式', 'Mode')}</span><button type="button" data-set="flip" data-value="0">${t(lang, '互相关', 'Correlation')}</button><button type="button" data-set="flip" data-value="1">${t(lang, '卷积', 'Convolution')}</button></div>
    <div class="fx-control"><span>${t(lang, '补边', 'Padding')}</span><button type="button" data-set="padding" data-value="0">0</button><button type="button" data-set="padding" data-value="1">1</button></div>
    <div class="fx-control"><span>${t(lang, '步幅', 'Stride')}</span><button type="button" data-set="stride" data-value="1">1</button><button type="button" data-set="stride" data-value="2">2</button></div>
  </div>
  <div class="fx-calc" aria-live="off"><span class="fx-grid" data-calc="window"></span><i>⊙</i><span class="fx-grid" data-calc="kernel"></span><i data-calc="divisor"></i><i>=</i><b data-calc="sum"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '悬停针床 · 方向键移动', 'Hover the bed · arrow keys move'),
      readout: '',
      keys: keysOf(lang),
      caption: t(
        lang,
        '压头抬起、龙门步进，九根探针落在一个 3 × 3 窗口上；压头顶面每根螺柱上的垫圈数就是该位置的权重，深色垫圈为负。设定器把输出盘里对应的针升到 Σ f·h。输出边长 = ⌊(N − K + 2P) / S⌋ + 1：不补边时 7 → 5，补边 1 时 7 → 7，步幅 2 约减半。选“卷积”时权重先旋转 180° 再压下：对称的核没有变化，Sobel 的左右两列互换符号。',
        'The head lifts, the gantry steps, and nine feelers land on a 3 × 3 window; the washers on each stud on top of the head are that position’s weight, dark ones negative. The setter raises the matching pin in the output tray to Σ f·h. Output side = ⌊(N − K + 2P) / S⌋ + 1: with no padding 7 → 5, with padding 1 7 → 7, and stride 2 roughly halves it. Choosing “Convolution” rotates the weights by 180° before pressing: a symmetric kernel is unchanged, while Sobel’s left and right columns swap sign.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, '滤波压机。方向键移动窗口，Home 与 End 跳到两角。', 'Filter press. Arrow keys move the window; Home and End jump to the corners.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const readout = root.querySelector('[data-readout]')
  const layers = { inBed: part('in-bed'), outBed: part('out-bed'), inSockets: part('in-sockets'), outSockets: part('out-sockets') }
  const movers = { left: part('upright-left'), right: part('upright-right'), beam: part('beam') }
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const config = { kernel: 'gauss', flip: false, padding: 0, stride: 1 }
  const state = {
    size: 0,
    values: [],
    scale: 1,
    target: [0, 0],
    x: 0,
    y: 0,
    ys: 0,
    head: { at: LIFT, rate: 0 },
    visited: new Set(),
    pins: [],
    touring: true,
    clock: 0,
    tourIndex: 0,
    lastCell: '',
  }

  const head = svgNode('')
  head.dataset.part = 'head'
  const setter = svgNode('')
  setter.dataset.part = 'setter'
  let inPins = []
  let outPins = []

  const windowCentre = (i, j) => {
    const [r0, c0] = windowOrigin(i, j, config.padding, config.stride)
    return [cellX(r0 + 1), cellY(c0 + 1)]
  }
  const outCentre = (i, j) => {
    const q = PITCH * config.stride
    return [windowCentre(i, 0)[0], OUT_MID + ((state.size - 1) / 2 - j) * q]
  }
  const pinTop = (row, col) => {
    if (row < 0 || col < 0 || row >= N || col >= N) return FLOOR + (config.padding && row >= -1 && col >= -1 && row <= N && col <= N ? 0.6 : 0)
    return FLOOR + pinHeight(IMAGE[row][col])
  }

  function buildBeds() {
    state.size = outputSize(config.padding, config.stride)
    state.values = responseMap(config.kernel, config.flip, config.padding, config.stride)
    const peak = Math.max(...state.values.flat().map(Math.abs), 1e-6)
    state.scale = OUT_MAX / peak
    state.visited = new Set()

    inPins = []
    const sockets = []
    for (let row = -1; row <= N; row++) {
      for (let col = -1; col <= N; col++) {
        if (row === N || col === N) continue
        const [x, y] = [cellX(row), cellY(col)]
        const inside = row >= 0 && col >= 0
        if (!inside && !config.padding) {
          sockets.push(socketSvg(x, y))
          continue
        }
        const node = svgNode(inside ? pinSvg(x, y, pinHeight(IMAGE[row][col])) : padSvg(x, y))
        inPins.push({ node, row, col, key: k.depthOf([x, y, 0], P) })
      }
    }
    layers.inSockets.innerHTML = sockets.join('')

    outPins = []
    const outSockets = []
    for (let i = 0; i < state.size; i++) {
      for (let j = 0; j < state.size; j++) {
        const [x, y] = outCentre(i, j)
        outSockets.push(L(k.planOutline(plan(x, y, PIN + 3, PIN + 3, 1.4), FLOOR, P, 2), { tone: 'faint' }))
        const pin = { node: svgNode(''), i, j, x, y, key: k.depthOf([x, y, 0], P), height: { at: PIN_BASE, rate: 0 }, drawn: '' }
        outPins.push(pin)
      }
    }
    layers.outSockets.innerHTML = outSockets.join('')
    outPins.forEach(drawOutPin)
    state.lastCell = ''
  }

  function drawOutPin(pin) {
    const value = state.values[pin.i][pin.j]
    const visited = state.visited.has(`${pin.i},${pin.j}`)
    const current = pin.i === state.target[0] && pin.j === state.target[1] && visited
    const key = `${pin.height.at.toFixed(2)}|${visited}|${current}`
    if (key === pin.drawn) return
    pin.drawn = key
    pin.node.innerHTML = pinSvg(pin.x, pin.y, pin.height.at, {
      tone: visited ? 'hi' : 'lo',
      lit: current,
      hollow: visited && value < -0.005,
    })
  }

  function headSvg() {
    const out = []
    const weights = appliedWeights(config.kernel, config.flip)
    const hb = state.head.at
    const feet = []
    for (let u = 0; u < K; u++) {
      for (let v = 0; v < K; v++) {
        const fx = state.x + (u - 1) * PITCH
        const fy = state.y - (v - 1) * PITCH
        const row = Math.round(fx / PITCH)
        const col = Math.round(-fy / PITCH)
        const settled = Math.abs(fx - cellX(row)) < 3 && Math.abs(fy - cellY(col)) < 3
        const floor = settled ? pinTop(row, col) : FLOOR
        const tip = Math.max(floor, hb - REACH)
        feet.push({ fx, fy, tip, weight: weights[u][v], key: k.depthOf([fx, fy, 0], P) })
      }
    }
    feet.sort((a, b) => a.key - b.key)
    for (const foot of feet) {
      out.push(S(k.cylinder(foot.fx, foot.fy, 0.9, foot.tip + 1.2, hb - foot.tip - 1.2, P, 12), { tone: 'mid', crease: 'none' }))
      out.push(S(k.cylinder(foot.fx, foot.fy, 2.3, foot.tip, 1.2, P, 18), { tone: 'mid' }))
    }
    const box = plan(state.x, state.y, HEAD, HEAD, 3)
    out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(box, 4), hb - REACH * 0.2, 0.1, P)}" style="opacity:.25"/>`)
    out.push(S(k.slabOf(box, hb, HEAD_H, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(box, hb + 3, P, 4), { tone: 'faint' }) }))
    const top = hb + HEAD_H
    out.push(L(k.planOutline(k.insetPlan(box, 3.5), top, P, 4), { tone: 'faint' }))
    out.push(D(k.corners(box, 5).map(([x, y]) => at([x, y, top])), { size: 0.45 }))

    // The feelers pass through the head; each carries its weight as washers on a stud on top.
    // The ram rides at the far edge so the middle column stays in view.
    const ramY = state.y + RAM_Y
    const above = feet.map((foot) => ({ ...foot, draw: () => {
      const parts = [L(k.ring(foot.fx, foot.fy, 1.9, top, P, 14), { tone: 'lo' })]
      const count = Math.abs(foot.weight)
      if (!count) return parts.join('')
      parts.push(S(k.cylinder(foot.fx, foot.fy, 1, top, 1.5 + count * 1.3, P, 12), { tone: 'mid', crease: 'none' }))
      for (let index = 0; index < count; index++) {
        const z = top + 1.5 + index * 1.3
        parts.push(S(k.cylinder(foot.fx, foot.fy, 3.1, z, 1.05, P, 20), foot.weight < 0 ? { tone: 'mid', className: 'fx-neg' } : { tone: 'hi', crease: 'lo' }))
      }
      return parts.join('')
    } }))
    above.push({ key: k.depthOf([state.x, ramY, 0], P), draw: () => S(k.cylinder(state.x, ramY, 2.6, top, 1.2, P, 20), { tone: 'mid' })
      + S(k.cylinder(state.x, ramY, 1.7, top + 1.2, Math.min(RAM, SLEEVE[0] - top - 1.2 + 6), P, 16), { tone: 'mid', crease: 'none' }) })
    above.sort((a, b) => a.key - b.key).forEach((item) => out.push(item.draw()))
    out.push(trolley(state.x, ramY))
    return out.join('')
  }

  function setterSvg(pinTopZ) {
    const out = []
    const [x, y] = [state.x, state.ys]
    out.push(S(k.cylinder(x, y, 1.6, pinTopZ, 1.2, P, 14), { tone: 'hi', crease: 'lo' }))
    out.push(S(k.cylinder(x, y, 0.8, pinTopZ + 1.2, SLEEVE[0] - pinTopZ - 1.2, P, 12), { tone: 'hi', crease: 'none' }))
    out.push(trolley(x, y))
    return out.join('')
  }

  function order() {
    const [r0, c0] = windowOrigin(state.target[0], state.target[1], config.padding, config.stride)
    const behind = []
    const ahead = []
    for (const pin of inPins) (pin.row > r0 + 2 || (pin.row >= r0 && pin.col < c0) ? ahead : behind).push(pin)
    behind.sort((a, b) => a.key - b.key)
    ahead.sort((a, b) => a.key - b.key)
    applyOrder(layers.inBed, [...behind.map((pin) => pin.node), head, ...ahead.map((pin) => pin.node)])

    const [i0, j0] = state.target
    const back = []
    const front = []
    for (const pin of outPins) (pin.i > i0 || (pin.i === i0 && pin.j < j0) ? front : back).push(pin)
    back.sort((a, b) => a.key - b.key)
    front.sort((a, b) => a.key - b.key)
    applyOrder(layers.outBed, [...back.map((pin) => pin.node), setter, ...front.map((pin) => pin.node)])
  }

  function describe() {
    const [i, j] = state.target
    const { value, terms } = respond(config.kernel, config.flip, config.padding, config.stride, i, j)
    const kernel = KERNELS[config.kernel]
    calc.window.innerHTML = terms.map(([f]) => `<b>${f}</b>`).join('')
    calc.kernel.innerHTML = terms.map(([, w]) => `<b data-sign="${Math.sign(w)}">${String(w).replace('-', '−')}</b>`).join('')
    calc.divisor.textContent = kernel.divisor === 1 ? '' : `÷ ${kernel.divisor}`
    calc.sum.textContent = format(value)
    stage.setAttribute('aria-valuetext', t(lang, `输出第 ${i + 1} 行第 ${j + 1} 列，共 ${state.size} × ${state.size}：${format(value)}`, `Output row ${i + 1}, column ${j + 1} of ${state.size} × ${state.size}: ${format(value)}`))
    buttons.forEach((button) => {
      const current = String(button.dataset.set === 'flip' ? Number(config.flip) : config[button.dataset.set])
      button.setAttribute('aria-pressed', String(button.dataset.value === current))
    })
  }

  function say() {
    const [i, j] = state.target
    const ready = state.visited.has(`${i},${j}`)
    const text = `g[${i},${j}] = ${ready ? format(state.values[i][j]) : '…'} · ${t(lang, '输出', 'output')} ${state.size}×${state.size}`
    if (readout.textContent !== text) readout.textContent = text
  }

  function tick(dt, calm) {
    let moving = false
    if (state.touring && !calm) {
      const total = state.size * state.size
      const done = state.tourIndex >= total || state.visited.has(state.target.join(','))
      if (done) state.clock += dt
      const hold = state.tourIndex >= total ? 2.6 : 0.55
      if (state.clock > hold) {
        state.clock = 0
        state.tourIndex += 1
        if (state.tourIndex > total) {
          state.tourIndex = 0
          state.visited = new Set()
        }
        if (state.tourIndex < total) aim(Math.floor(state.tourIndex / state.size), state.tourIndex % state.size, false)
      }
      moving = true
    }

    const [tx, ty] = windowCentre(...state.target)
    const ts = outCentre(...state.target)[1]
    const away = Math.abs(state.x - tx) + Math.abs(state.y - ty) + Math.abs(state.ys - ts) > 0.05
    moving = spring(state.head, away ? LIFT : WORK, dt, 260, 32, calm) || moving
    if (calm || state.head.at > LIFT - 0.6) {
      state.x = follow(state.x, tx, dt, 0.14, calm)
      state.y = follow(state.y, ty, dt, 0.14, calm)
      state.ys = follow(state.ys, ts, dt, 0.14, calm)
      moving = moving || away
    }
    if (!away && state.head.at < WORK + 0.4) state.visited.add(state.target.join(','))

    for (const pin of outPins) {
      const visited = state.visited.has(`${pin.i},${pin.j}`)
      const goal = visited ? PIN_BASE + Math.abs(state.values[pin.i][pin.j]) * state.scale : PIN_BASE
      moving = spring(pin.height, goal, dt, 90, 14, calm) || moving
      drawOutPin(pin)
    }

    const cell = state.target.join(',')
    if (cell !== state.lastCell) {
      state.lastCell = cell
      order()
      describe()
    }
    head.innerHTML = headSvg()
    const current = outPins.find((pin) => pin.i === state.target[0] && pin.j === state.target[1])
    setter.innerHTML = setterSvg(current ? FLOOR + current.height.at : FLOOR + PIN_BASE)
    const shift = k.translateAlong(P, [state.x, 0, 0])
    movers.left.setAttribute('transform', shift)
    movers.right.setAttribute('transform', shift)
    movers.beam.setAttribute('transform', shift)
    say()
    return moving
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.clock = 0
    state.tourIndex = state.target[0] * state.size + state.target[1]
    loop.run()
  })

  function aim(i, j, byHand = true) {
    state.target = [clamp(i, 0, state.size - 1), clamp(j, 0, state.size - 1)]
    if (byHand) {
      state.touring = false
      idle.touch()
    }
    loop.run()
  }

  function reconfigure(changes) {
    Object.assign(config, changes)
    buildBeds()
    state.target = [clamp(state.target[0], 0, state.size - 1), clamp(state.target[1], 0, state.size - 1)]
    state.tourIndex = 0
    state.lastCell = ''
    describe()
    loop.run()
  }

  const onPointer = (event) => {
    const [px, py] = floorPoint(viewBoxPoint(svg, event), 8, P)
    if (py > OUT_FLOOR.y + OUT_FLOOR.d + 6) {
      const row = Math.round(px / PITCH)
      const col = Math.round(-py / PITCH)
      if (row < -1 || row > N || col < -1 || col > N) return
      aim(Math.round((row - 1 + config.padding) / config.stride), Math.round((col - 1 + config.padding) / config.stride))
    } else if (py > OUT_FLOOR.y - 6) {
      const q = PITCH * config.stride
      const j = Math.round((state.size - 1) / 2 - (py - OUT_MID) / q)
      const i = Math.round((px / PITCH - 1 + config.padding) / config.stride)
      aim(i, j)
    }
  }
  const onKey = (event) => {
    const [i, j] = state.target
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (moves[event.key]) aim(i + moves[event.key][0], j + moves[event.key][1])
    else if (event.key === 'Home') aim(0, 0)
    else if (event.key === 'End') aim(state.size - 1, state.size - 1)
    else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const { set, value } = button.dataset
    reconfigure({ [set]: set === 'kernel' ? value : set === 'flip' ? value === '1' : Number(value) })
    state.touring = false
    idle.touch()
  }

  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerdown', onPointer)
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  buildBeds()
  const [sx, sy] = windowCentre(0, 0)
  state.x = sx
  state.y = sy
  state.ys = outCentre(0, 0)[1]
  if (loop.still.matches) {
    state.touring = false
    for (let i = 0; i < state.size; i++) for (let j = 0; j < state.size; j++) state.visited.add(`${i},${j}`)
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

