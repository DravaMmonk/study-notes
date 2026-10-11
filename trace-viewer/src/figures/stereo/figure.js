import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, floorPoint, follow, viewBoxPoint } from '../common.js'
import { BASELINES, DEPTH, FOCAL, measure } from './model.js'

// Fig · The stereo rangefinder.
// Two cameras on a cross-slide look down a bench. Each has a waist-level finder whose glass shows the
// target's image as a lit dot; the dots move toward each other as the target recedes. Strings from the
// lenses meet at the target ball, a dial between the cameras reads the disparity, and two stops on the
// rail bracket every depth a one-pixel error could give. Depth is drawn 40 units per metre, the baseline
// 300 units per metre so the cameras can be told apart.

const W = 640
const H = 400
const PER_M = 40
const LATERAL = 300
const AXIS_Z = 33
const BODY = { x: 9, d: 12, w: 16, z: 26, h: 14 }
const GLASS_HALF = 4.6
const SENSOR_HALF = 100 // px shown across half the glass
const RAIL = { x: -258, y: -4, w: 240, d: 8, r: 1.2 }
const RAIL_TOP = 5
const PLATE = { x: -30, y: -54, w: 102, d: 108, r: 8 }
const BENCH = { x: -272, y: -24, w: 246, d: 48, r: 6 }
const CROSS = { x: 9, y: -42, w: 16, d: 84, r: 1.6 }
const CROSS_Z = [14, 20]
const DIAL = [46, 0]
const DIAL_R = 10
const DIAL_Z = 26
const DIAL_TOP = DIAL_Z + 5
const DIAL_SPAN = Math.PI * 1.5
const DIAL_FULL = 160 // px at the end of the scale

const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), ...k.boxCorners(BENCH, -17, 0), [PLATE.x + PLATE.w, 0, 44]], W, H, { pad: 24, azimuth: 24, elevation: 34 })

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))

function base() {
  // A narrow rail bench butts onto a wider camera stand; both sit on their own feet.
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -17, 12, P)}"/>`, `<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`]
  const feet = [...k.corners(BENCH, 14), [BENCH.x + BENCH.w / 2, BENCH.y + 14], [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d - 14], ...k.corners(PLATE, 20)]
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  for (const slab of [BENCH, PLATE]) {
    out.push(S(k.slabOf(slab, -12, 12, P, 8, 1.6), { tone: 'mid' }))
    out.push(L(k.planOutline(k.insetPlan(slab, 4.5), 0, P), { tone: 'lo' }))
  }
  const screws = [...k.corners(BENCH, 9), ...k.corners(PLATE, 10)]
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // Metre rule beside the rail: minor ticks every 10 cm, a major tick on each metre from the lenses.
  const strip = { x: RAIL.x + 4, y: 9, w: RAIL.w - 18, d: 7, r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, PER_M / 10, 10, strip.y + 0.6, 0.6, [2, 4.2], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))

  // Label plate at the near corner.
  const label = { x: 44, y: 24, w: 20, d: 20, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[4, 13], [8, 9], [12, 11]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 3 + dx, label.y + 4], [label.x + 3 + dx, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))

  // The rail and its stops.
  out.push(S(k.slabOf(RAIL, 0, RAIL_TOP, P, 3, 0.5), { tone: 'mid' }))
  out.push(L(k.lineOnTop([RAIL.x, 0], [RAIL.x + RAIL.w, 0], RAIL_TOP, P), { tone: 'faint' }))
  for (const x of [RAIL.x - 6, RAIL.x + RAIL.w]) {
    out.push(S(k.slabOf({ x, y: -9, w: 6, d: 18, r: 1.2 }, 0, 9, P, 3, 0.5), { tone: 'mid' }))
    out.push(D([at([x + 3, -5, 9]), at([x + 3, 5, 9])], { size: 0.45 }))
  }
  return out.join('')
}

function crossSlide() {
  const out = []
  for (const y of [-34, 34]) {
    out.push(S(k.cylinder(17, y, 5, 0, 3, P, 24), { tone: 'mid' }))
    out.push(S(k.cylinder(17, y, 3.2, 3, CROSS_Z[0] - 3, P, 20), { tone: 'mid', crease: 'none' }))
  }
  const slot = { x: 15.4, y: -36, w: 3.2, d: 72, r: 1.6 }
  out.push(S(k.slabOf(CROSS, CROSS_Z[0], CROSS_Z[1] - CROSS_Z[0], P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(CROSS, CROSS_Z[0] + 2, P, 3), { tone: 'faint' }) }))
  out.push(L(k.planOutline(slot, CROSS_Z[1], P, 4), { tone: 'lo' }))
  out.push(D([[11.5, -39], [11.5, 39], [22.5, -39], [22.5, 39]].map(([x, y]) => at([x, y, CROSS_Z[1]])), { size: 0.45 }))
  return out.join('')
}

function knob() {
  // Baseline knob at the far end of the cross-slide.
  const [x, y] = [17, -46]
  const out = [S(k.slabOf({ x: x - 3, y: CROSS.y - 4, w: 6, d: 4, r: 1 }, CROSS_Z[0] + 1, 4, P, 2), { tone: 'mid', crease: 'none' })]
  out.push(S(k.cylinder(x, y, 4.4, CROSS_Z[0], 6, P, 28), { tone: 'mid' }))
  out.push(L(k.knurl(x, y, 4.4, CROSS_Z[0], CROSS_Z[0] + 6, 26, P), { tone: 'lo' }))
  out.push(L(k.lineOnTop([x, y], [x + 4, y], CROSS_Z[0] + 6, P), { tone: 'hi', free: 'end' }))
  out.push(D([at([x, y, CROSS_Z[0] + 6])], { size: 0.5, tone: 'hi' }))
  return out.join('')
}

// One camera, built at y = 0 and slid sideways with the baseline.
function camera() {
  const out = []
  const sled = { x: BODY.x - 1, y: -9, w: BODY.w + 2, d: 18, r: 1.6 }
  out.push(S(k.slabOf(sled, CROSS_Z[1], BODY.z - CROSS_Z[1], P, 3, 0.5), { tone: 'mid' }))
  out.push(D([[sled.x + 3, -6], [sled.x + 3, 6], [sled.x + sled.w - 3, -6], [sled.x + sled.w - 3, 6]].map(([x, y]) => at([x, y, BODY.z])), { size: 0.42 }))
  const F = G.frameAlong([BODY.x, 0, AXIS_Z], [-1, 0, 0])
  const lens = G.solidOf([[0, 4.8], [2, 4.8], [2, 5.6], [6, 5.6], [6, 4.4], [9, 4.4]], F, P)
  const ribs = G.ribsOf(F, 2, 6, 5.6, 28, P, { fade: [0.1, 0.55], seams: true })
  out.push(S(lens, { tone: 'mid' }) + k.fadedSvg(ribs, { tone: 'lo' }))
  const body = { x: BODY.x, y: -BODY.d / 2, w: BODY.w, d: BODY.d, r: 1.4 }
  out.push(S(k.slabOf(body, BODY.z, BODY.h, P, 3, 0.8), { tone: 'hi', crease: 'lo', inner: L(k.sideSeam(body, BODY.z + 4, P, 3), { tone: 'faint' }) }))
  const top = BODY.z + BODY.h
  // Waist-level finder: two hood flaps at the far edges, the glass between them.
  out.push(S(k.slabOf({ x: BODY.x + 0.6, y: -BODY.d / 2 + 0.6, w: 1, d: BODY.d - 1.2, r: 0.3 }, top, 4.5, P, 2), { tone: 'mid', crease: 'none' }))
  out.push(S(k.slabOf({ x: BODY.x + 1.6, y: -BODY.d / 2 + 0.6, w: BODY.w - 2.2, d: 1, r: 0.3 }, top, 4.5, P, 2), { tone: 'mid', crease: 'none' }))
  const glass = { x: BODY.x + 2.4, y: -GLASS_HALF - 0.4, w: BODY.w - 4.4, d: GLASS_HALF * 2 + 0.8, r: 0.6 }
  out.push(L(k.planOutline(glass, top, P, 2), { tone: 'lo' }))
  const ticks = k.topTicks(-GLASS_HALF, GLASS_HALF, GLASS_HALF / 4, 4, glass.x + glass.w, top, [0.9, 1.8], P, 'y')
  out.push(L(ticks.minor, { tone: 'faint' }), L(ticks.major, { tone: 'lo' }))
  out.push(L(k.lineOnTop([glass.x, 0], [glass.x + glass.w, 0], top, P), { tone: 'faint' }))
  return out.join('')
}

function dialArt() {
  const [x, y] = DIAL
  const out = []
  out.push(S(k.slabOf({ x: x - 6, y: -6, w: 12, d: 12, r: 1.5 }, 0, 3, P, 3, 0.5), { tone: 'mid' }))
  out.push(S(k.cylinder(x, y, 2.6, 3, DIAL_Z - 3, P, 18), { tone: 'mid', crease: 'none', inner: L(k.sideArc(x, y, 2.6, 12, P, 12), { tone: 'faint' }) }))
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_TOP - DIAL_Z, P, 56, 0.8), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 2.4, DIAL_TOP, 64, P, 0.3), { tone: 'lo' }))
  out.push(L(k.ring(x, y, DIAL_R - 1.8, DIAL_TOP, P, 56), { tone: 'lo' }))
  const ticks = k.radialTicks(x, y, DIAL_R - 2.4, 32, 4, DIAL_TOP, [1, 2.2], P, -DIAL_SPAN / 2, DIAL_SPAN)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(S(k.slabOf({ x: x + DIAL_R - 1, y: -1.8, w: 4, d: 3.6, r: 1 }, DIAL_Z + 1, 3, P, 2), { tone: 'mid' }))
  return out.join('')
}

const needle = (disparity) => {
  const angle = -DIAL_SPAN / 2 + (clamp(disparity, 0, DIAL_FULL) / DIAL_FULL) * DIAL_SPAN
  const [x, y] = DIAL
  return k.lineOnTop([x - Math.sin(angle) * 2.2, y + Math.cos(angle) * 2.2], [x + Math.sin(angle) * (DIAL_R - 3), y - Math.cos(angle) * (DIAL_R - 3)], DIAL_TOP + 0.2, P)
}

function carriage() {
  const out = []
  const plan = { x: -9, y: -8, w: 18, d: 16, r: 1.6 }
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 2), RAIL_TOP, 0.1, P)}" style="filter:blur(4px)"/>`)
  out.push(S(k.slabOf(plan, RAIL_TOP, 4, P, 3, 0.6), { tone: 'mid' }))
  out.push(D(k.corners(plan, 2.6).map(([x, y]) => at([x, y, RAIL_TOP + 4])), { size: 0.42 }))
  out.push(S(k.slabOf({ x: -1.4, y: plan.y + plan.d, w: 2.8, d: 2.4, r: 0.6 }, RAIL_TOP + 1, 2.4, P, 2), { tone: 'mid', crease: 'none' }))
  out.push(S(k.cylinder(0, plan.y + plan.d + 3.6, 2.3, RAIL_TOP, 5, P, 18), { tone: 'mid' }))
  out.push(L(k.knurl(0, plan.y + plan.d + 3.6, 2.3, RAIL_TOP, RAIL_TOP + 5, 16, P), { tone: 'lo' }))
  out.push(S(k.cylinder(0, 0, 3.6, RAIL_TOP + 4, 3, P, 22), { tone: 'mid' }))
  out.push(S(k.cylinder(0, 0, 1.5, RAIL_TOP + 7, AXIS_Z - RAIL_TOP - 7 - 2.6, P, 14), { tone: 'mid', crease: 'none', inner: L(k.sideArc(0, 0, 1.5, 20, P, 10), { tone: 'faint' }) }))
  return out.join('')
}

const stopArt = () => {
  const plan = { x: -2, y: -7, w: 4, d: 14, r: 0.8 }
  return S(k.slabOf(plan, RAIL_TOP, 3, P, 2, 0.4), { tone: 'mid' }) + D([at([0, -4.5, RAIL_TOP + 3]), at([0, 4.5, RAIL_TOP + 3])], { size: 0.4 })
}

export const meta = { id: 'stereo-rangefinder', fig: 'Fig 13.1', title: '双目测距仪' }

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      '光具座上的双目测距仪。两台相机装在横向滑台上，沿导轨望向小车上的目标球，两根细绳从镜头拉到球上。每台相机顶上的取景屏用亮点显示目标的成像位置；两台相机之间的表盘读出视差，导轨上的两个限位块标出视差差一个像素时对应的深度。',
    body: [
      base(),
      '<path class="fx-band" data-part="band" d=""/>',
      `<g data-part="stop-far">${stopArt()}</g>`,
      `<g data-part="carriage">${carriage()}</g>`,
      `<g data-part="stop-near">${stopArt()}</g>`,
      '<g data-part="strings"></g>',
      '<g data-part="ball"></g>',
      crossSlide(),
      knob(),
      `<g data-part="cam-left">${camera()}<g data-part="dot"></g></g>`,
      `<g data-part="cam-right">${camera()}<g data-part="dot"></g></g>`,
      dialArt(),
      `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.1" d=""/>`,
      `<g data-part="hub">${D([at([DIAL[0], DIAL[1], DIAL_TOP + 0.2])], { size: 0.7, tone: 'hi' })}</g>`,
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="基线">
    <div class="fx-control"><span>基线</span>${BASELINES.map((b) => `<button type="button" data-set="baseline" data-value="${b}">${Math.round(b * 100)} cm</button>`).join('')}</div>
  </div>
  <div class="fx-calc"><span>z = f·b / d =</span><b data-calc="z"></b><i>·</i><span>|Δz| ≈ z² / (f·b) · 1 px =</span><b data-calc="dz"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '悬停导轨 · 方向键',
      readout: '',
      keys: [
        { mark: 'lit', label: '目标球与视差指针' },
        { mark: 'raised', label: '取景屏：目标在两台相机中的成像' },
        { mark: 'flat', label: '阴影段：视差差 ±1 px 对应的深度' },
      ],
      caption: `把目标往后推，两块取景屏上的亮点都向中间靠拢：视差 d = x − x′ 按 1/z 缩小。导轨上的两个限位块标出视差差 1 像素时会报出的深度，它们的间距按 z² 增长，所以距离加倍，同样的误差变成四倍。f = ${FOCAL} px。深度按每米 40 单位绘制，基线按每米 300 单位绘制，横向放大以便分辨两台相机。`,
      body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="双目测距仪。左右方向键移动目标，上下方向键改变基线。" aria-valuemin="${DEPTH[0]}" aria-valuemax="${DEPTH[1]}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]
  const nodes = {
    band: part('band'),
    far: part('stop-far'),
    near: part('stop-near'),
    carriage: part('carriage'),
    strings: part('strings'),
    ball: part('ball'),
    left: part('cam-left'),
    right: part('cam-right'),
    needle: part('needle'),
  }
  const dots = { left: nodes.left.querySelector('[data-part="dot"]'), right: nodes.right.querySelector('[data-part="dot"]') }

  const state = { depth: 2, target: 2, baseline: 0.1, lateral: 0.1, touring: true, clock: 0 }
  const top = BODY.z + BODY.h

  function draw() {
    const m = measure(state.depth, state.lateral)
    const tx = -state.depth * PER_M
    const half = (state.lateral * LATERAL) / 2
    nodes.carriage.setAttribute('transform', k.translateAlong(P, [tx, 0, 0]))
    const near = -m.near * PER_M
    const far = Math.max(-m.far * PER_M, RAIL.x + 5)
    nodes.near.setAttribute('transform', k.translateAlong(P, [near + 2.5, 0, 0]))
    nodes.far.setAttribute('transform', k.translateAlong(P, [far - 2.5, 0, 0]))
    nodes.band.setAttribute('d', k.slabOf({ x: far, y: -3.2, w: Math.max(0.2, near - far), d: 6.4, r: 0.6 }, RAIL_TOP, 0, P, 2).top)
    nodes.ball.innerHTML = S(G.sphereOf([tx, 0, AXIS_Z], 3.2, P), { tone: 'hi', lit: true })
    const string = (y) => k.wireSvg(at([0, y, AXIS_Z]), at([tx, 0, AXIS_Z]), { tone: 'mid', ends: 'none' })
    nodes.strings.innerHTML = string(-half) + string(half)
    nodes.left.setAttribute('transform', k.translateAlong(P, [0, -half, 0]))
    nodes.right.setAttribute('transform', k.translateAlong(P, [0, half, 0]))
    const dot = (x) => D([at([BODY.x + BODY.w / 2 - 0.2, clamp((x / SENSOR_HALF) * GLASS_HALF, -GLASS_HALF, GLASS_HALF), top])], { size: 1.3, tone: 'hi' })
    dots.left.innerHTML = dot(m.left)
    dots.right.innerHTML = dot(m.right)
    nodes.needle.setAttribute('d', needle(m.disparity))
    const cm = (value) => `${(value * 100).toFixed(1)} cm`
    const text = `z ${state.depth.toFixed(2)} m · d ${m.disparity.toFixed(1)} px · ±1 px: −${Math.round((state.depth - m.near) * 100)}/+${Math.round((m.far - state.depth) * 100)} cm`
    if (readout.textContent !== text) readout.textContent = text
    calc.z.textContent = `${FOCAL} × ${state.lateral.toFixed(2)} / ${m.disparity.toFixed(1)} = ${state.depth.toFixed(2)} m`
    calc.dz.textContent = cm(m.spread)
  }

  function describe() {
    const m = measure(state.target, state.baseline)
    stage.setAttribute('aria-valuenow', state.target.toFixed(2))
    stage.setAttribute('aria-valuetext', `目标距离 ${state.target.toFixed(1)} 米，视差 ${m.disparity.toFixed(0)} 像素，基线 ${Math.round(state.baseline * 100)} 厘米`)
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.value) === state.baseline)))
  }

  function tick(dt, calm) {
    if (state.touring && !calm) {
      state.clock += dt
      const phase = (1 - Math.cos((state.clock / 11) * Math.PI * 2)) / 2
      state.target = 1 + phase * 4.6
    }
    state.depth = follow(state.depth, state.target, dt, 0.32, calm)
    state.lateral = follow(state.lateral, state.baseline, dt, 0.25, calm)
    if (Math.abs(state.lateral - state.baseline) < 1e-4) state.lateral = state.baseline
    if (Math.abs(state.depth - state.target) < 1e-4) state.depth = state.target
    draw()
    return state.touring || state.depth !== state.target || state.lateral !== state.baseline
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.clock = Math.acos(clamp(1 - ((state.depth - 1) / 4.6) * 2, -1, 1)) / (Math.PI * 2) * 11
    loop.run()
  })
  const steer = (depth) => {
    state.touring = false
    state.target = clamp(depth, DEPTH[0], DEPTH[1])
    describe()
    idle.touch()
    loop.run()
  }
  const onPointer = (event) => {
    const [x] = floorPoint(viewBoxPoint(svg, event), RAIL_TOP, P)
    if (x > -6 || x < RAIL.x - 10) return
    steer(-x / PER_M)
  }
  const onKey = (event) => {
    const step = event.shiftKey ? 0.5 : 0.1
    if (event.key === 'ArrowLeft') steer(state.target + step)
    else if (event.key === 'ArrowRight') steer(state.target - step)
    else if (event.key === 'Home') steer(DEPTH[0])
    else if (event.key === 'End') steer(DEPTH[1])
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const index = BASELINES.indexOf(state.baseline) + (event.key === 'ArrowUp' ? 1 : -1)
      state.baseline = BASELINES[clamp(index, 0, BASELINES.length - 1)]
      steer(state.target)
    } else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set="baseline"]')
    if (!button) return
    state.baseline = Number(button.dataset.value)
    steer(state.target)
  }

  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerdown', onPointer)
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)
  if (loop.still.matches) state.touring = false
  describe()
  draw()
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
