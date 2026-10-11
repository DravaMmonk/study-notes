import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, floorPoint, follow, viewBoxPoint } from '../common.js'
import { CAM1, CAM2, DEPTH, EPIPOLE1, EPIPOLE2, FOCAL, FOCAL_PX, GLASS, HEIGHT, PER_M, POINTS, PX, lineOf, measure, onGlass, pointAt, vec } from './model.js'

// Fig · The epipolar rig.
// Two box cameras with ground-glass backs stand on a bench; camera 2 sits ahead of camera 1 and is turned
// toward the scene, so the pair is not rectified. A taut wire runs from camera 1's lens through the
// chosen image point's ray to a target board: every point on it images to that one point in camera 1.
// A bead slides along the wire (its depth is unknown to camera 1); a string from the bead to camera 2's
// lens marks the ray that camera 2 sees, and the bead's image on camera 2's glass runs along one
// engraved line, the epipolar line l′ = F x. The baseline thread from lens 1 pierces glass 2 at e′,
// and every epipolar line passes through it.

const W = 640
const H = 380
const BENCH = { x: -200, y: -32, w: 232, d: 76, r: 8 }
const BOARD_X = -186
const BOARD = { x: BOARD_X - 4, y: -26, w: 4, d: 44, r: 0.8 }
const BOARD_TOP = 58
const HALF_W = GLASS.u + 2 // box half-width across the axis
const HALF_H = GLASS.v + 2 // box half-height
const LENS = 6

const P = k.fitProjection(
  [...k.boxCorners(BENCH, -17, 0), [BOARD.x, BOARD.y, BOARD_TOP], [BOARD.x, BOARD.y + BOARD.d, BOARD_TOP], [20, -14, HEIGHT + HALF_H + 4], [-40, 40, HEIGHT + HALF_H + 4]],
  W,
  H,
  { pad: 26, azimuth: 52, elevation: 24 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const path = (points, closed = false) => k.pathOf(points.map(at), closed)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))

// A point in a camera's own frame: s along its axis (forward +), t to its right, z height.
const local = (cam, s, t, z = 0) => [cam.c[0] + cam.a[0] * s + cam.r[0] * t, cam.c[1] + cam.a[1] * s + cam.r[1] * t, z]
const quad = (cam, s0, s1, t0, t1) => [local(cam, s0, t0), local(cam, s1, t0), local(cam, s1, t1), local(cam, s0, t1)].map(([x, y]) => [x, y])
const glassAt = (cam, u, v) => onGlass(cam, u * PX, v * PX) // u, v in world units on the glass

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -17, 12, P)}"/>`]
  const feet = [...k.corners(BENCH, 16), [BENCH.x + BENCH.w / 2, BENCH.y + 16], [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d - 16]]
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(BENCH, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(BENCH, 10)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
  // Depth rule under the wire: a tick per 10 cm, a long one per metre from camera 1's lens.
  const strip = { x: -182, y: -24, w: 176, d: 7, r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, PER_M / 10, 10, strip.y + strip.d, 0.6, [-1.8, -3.4], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  // Label plate at the near end.
  const label = { x: 8, y: 26, w: 16, d: 14, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 9], [6.5, 6], [10, 8]].forEach(([dy, length]) => out.push(L(k.lineOnTop([label.x + 3, label.y + 1 + dy], [label.x + 3 + length, label.y + 1 + dy], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

// The target board the wire is tied to, with a scribed grid on its face.
function board() {
  const out = []
  for (const y of [BOARD.y + 6, BOARD.y + BOARD.d - 6]) out.push(S(k.slabOf({ x: BOARD.x - 6, y: y - 3, w: 14, d: 6, r: 1 }, 0, 5, P, 3, 0.4), { tone: 'mid' }))
  out.push(S(k.slabOf(BOARD, 0, BOARD_TOP, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(BOARD, 4, P, 3), { tone: 'faint' }) }))
  out.push(S(k.slabOf(k.insetPlan(BOARD, -1), BOARD_TOP, 2, P, 3, 0.4), { tone: 'mid' }))
  const face = BOARD_X
  const lines = []
  const [y0, y1, z0, z1] = [BOARD.y + 3, BOARD.y + BOARD.d - 3, 6, BOARD_TOP - 3]
  for (let y = y0 + 6; y < y1 - 1; y += 6) lines.push(k.segment([face, y, z0], [face, y, z1], P))
  for (let z = z0 + 8; z < z1 - 1; z += 8) lines.push(k.segment([face, y0, z], [face, y1, z], P))
  out.push(L(lines.join(''), { tone: 'faint' }))
  out.push(L(path([[face, y0, z0], [face, y1, z0], [face, y1, z1], [face, y0, z1]], true), { tone: 'lo' }))
  for (const y of [BOARD.y + 6, BOARD.y + BOARD.d - 6]) out.push(D([at([BOARD.x + 4.5, y, 5])], { size: 0.45 }))
  return out.join('')
}

const clampSvg = ([, y, z]) => {
  const plan = { x: BOARD_X - 0.01, y: y - 2, w: 2.21, d: 4, r: 0.5 }
  return S(k.slabOf(plan, z - 2, 4, P, 2, 0.3), { tone: 'mid' }) + D([at([BOARD_X + 2.2, y, z])], { size: 0.7, tone: 'hi' })
}

// One box camera: stand, lens, box with a ground-glass back.
function camera(cam) {
  const out = []
  const mid = local(cam, -FOCAL / 2, 0)
  out.push(S(k.cylinder(mid[0], mid[1], 6, 0, 1.6, P, 28), { tone: 'lo' }))
  out.push(S(k.cylinder(mid[0], mid[1], 2.6, 1.6, HEIGHT - HALF_H - 4.6, P, 18), { tone: 'mid', crease: 'none', inner: L(k.sideArc(mid[0], mid[1], 2.6, 8, P, 12), { tone: 'faint' }) }))
  out.push(S(k.extrude(quad(cam, -FOCAL + 3, -3, -7, 7), HEIGHT - HALF_H - 3, 3, P), { tone: 'mid' }))
  // Lens barrel on the front face (drawn first: it points away from the viewer).
  const F = G.frameAlong(cam.c, cam.a)
  out.push(S(G.solidOf([[0, 5], [1.4, 5], [1.4, 4], [LENS, 4]], F, P), { tone: 'mid' }) + k.fadedSvg(G.ribsOf(F, 1.4, LENS, 4, 24, P, { fade: [0.1, 0.55], seams: true }), { tone: 'lo' }))
  // The box: front at the lens, ground glass FOCAL behind it.
  const body = k.extrude(quad(cam, -FOCAL, 0, -HALF_W, HALF_W), HEIGHT - HALF_H, HALF_H * 2, P, { bevel: 0.6 })
  out.push(S(body, { tone: 'hi', crease: 'lo', inner: L(k.ringSeam(quad(cam, -FOCAL, 0, -HALF_W, HALF_W), HEIGHT - HALF_H + 3, P), { tone: 'faint' }) }))
  // Focusing knob on the side that faces the viewer.
  const knob = G.frameAlong(local(cam, -FOCAL / 2 + 3, HALF_W, HEIGHT - 3), cam.r)
  out.push(S(G.solidOf([[0, 1.3], [1.6, 1.3], [1.6, 3.2], [4.4, 3.2]], knob, P), { tone: 'mid' }) + k.fadedSvg(G.ribsOf(knob, 1.6, 4.4, 3.2, 22, P, { fade: [0.1, 0.55], seams: true }), { tone: 'lo' }))
  // Carrying handle on top.
  for (const t of [-6, 6]) out.push(S(k.extrude(quad(cam, -FOCAL / 2 - 1, -FOCAL / 2 + 1, t - 1, t + 1), HEIGHT + HALF_H, 2.4, P), { tone: 'mid', crease: 'none' }))
  out.push(S(k.extrude(quad(cam, -FOCAL / 2 - 1, -FOCAL / 2 + 1, -7.4, 7.4), HEIGHT + HALF_H + 2.4, 1.4, P), { tone: 'mid' }))
  // Ground glass on the back face: a frame, the glass and its focusing grid.
  const corner = (u, v) => glassAt(cam, u, v)
  const g = GLASS
  out.push(`<path class="ep-glass" d="${path([corner(-g.u, -g.v), corner(g.u, -g.v), corner(g.u, g.v), corner(-g.u, g.v)], true)}"/>`)
  const grid = []
  for (let u = -g.u + 4; u < g.u; u += 4) grid.push(path([corner(u, -g.v), corner(u, g.v)]))
  for (let v = -g.v + 3; v < g.v; v += 3) grid.push(path([corner(-g.u, v), corner(g.u, v)]))
  out.push(L(grid.join(''), { tone: 'faint' }))
  out.push(L(path([corner(-g.u, -g.v), corner(g.u, -g.v), corner(g.u, g.v), corner(-g.u, g.v)], true), { tone: 'lo' }))
  const back = (t, z) => local(cam, -FOCAL, t, z)
  out.push(D([back(-HALF_W + 1, HEIGHT + HALF_H - 1), back(HALF_W - 1, HEIGHT + HALF_H - 1), back(-HALF_W + 1, HEIGHT - HALF_H + 1), back(HALF_W - 1, HEIGHT - HALF_H + 1)].map(at), { size: 0.42 }))
  return out.join('')
}

// Clip the line l = (a, b, c) in pixels to the glass, as two world points on the glass.
function lineOnGlass(cam, l) {
  const U = GLASS.u * PX
  const V = GLASS.v * PX
  const [a, b, c] = l
  const hits = []
  if (Math.abs(b) > 1e-12) for (const u of [-U, U]) { const v = -(a * u + c) / b; if (Math.abs(v) <= V + 1e-6) hits.push([u, v]) }
  if (Math.abs(a) > 1e-12) for (const v of [-V, V]) { const u = -(b * v + c) / a; if (Math.abs(u) <= U + 1e-6) hits.push([u, v]) }
  if (hits.length < 2) return ''
  hits.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  return path([onGlass(cam, ...hits[0]), onGlass(cam, ...hits[hits.length - 1])])
}

const markSvg = (cam, image, tone, size) => {
  const p = onGlass(cam, image.u, image.v)
  const ring = Array.from({ length: 16 }, (_, n) => {
    const angle = (n / 16) * Math.PI * 2
    return onGlass(cam, image.u + Math.cos(angle) * 1.4 * PX, image.v + Math.sin(angle) * 1.4 * PX)
  })
  return L(path(ring, true), { tone }) + D([at(p)], { size, tone })
}

// ---------- the live figure ----------

export const meta = { id: 'epipolar-rig', fig: 'Fig 14.1', title: '极线装置' }

export const css = `
.iso .ep-glass{fill:var(--anatomy-top);stroke:none}
`

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      '光具座上的两台箱式相机，背面是毛玻璃。相机 2 在相机 1 前方并转了一个角度，两台相机没有校正。一根绷紧的细线从相机 1 的镜头沿所选像点的视线拉到远处的靶板上，一颗珠子在线上滑动；一根细绳从珠子连到相机 2 的镜头。珠子在相机 2 毛玻璃上的像始终落在刻好的一条直线上，即极线；连接两镜头的基线穿过相机 2 毛玻璃的位置是极点，所有极线都经过它。',
    body: [
      base(),
      board(),
      '<path data-part="wire" class="iso-line" data-tone="hi" d=""/>',
      '<g data-part="clamp"></g>',
      '<path data-part="sight" class="iso-line" data-tone="mid" d=""/>',
      '<g data-part="bead"></g>',
      camera(CAM2),
      '<g data-part="glass-2"></g>',
      '<path data-part="baseline" class="iso-line" data-tone="mid" d=""/>',
      camera(CAM1),
      '<g data-part="glass-1"></g>',
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="相机 1 中的像点">
    <div class="fx-control"><span>像点 x</span>${POINTS.map((p, index) => `<button type="button" data-set="point" data-value="${index}">${p.label}</button>`).join('')}</div>
  </div>
  <div class="fx-calc"><span>x =</span><b data-calc="x"></b><i>·</i><span>x′ =</span><b data-calc="x2"></b><i>·</i><span>x′ᵀ F x =</span><b data-calc="r"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '悬停导轨 · 方向键',
      readout: '',
      keys: [
        { mark: 'lit', label: '珠子：深度未知的空间点' },
        { mark: 'raised', label: '相机 2 毛玻璃上的刻线：极线 l′ = F x' },
        { mark: 'flat', label: '基线细绳：穿过毛玻璃处是极点 e′' },
      ],
      caption: `相机 1 只知道点在它的像 x 上，于是点可能在整根细线上任意深度。把珠子沿线推远拉近，它在相机 2 毛玻璃上的像只沿一条刻线移动：一个点在图 1 里只约束图 2 里的一条线，x′ᵀ F x = 0。换一个像点，刻线绕着极点 e′ 转动，因为每条极线都经过基线穿过玻璃的那一点。两台相机没有校正，所以极线是斜的；毛玻璃上的像是倒立的。f = ${FOCAL_PX} px。`,
      body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="极线装置。左右方向键移动珠子的深度，上下方向键换相机 1 中的像点。" aria-valuemin="${DEPTH[0]}" aria-valuemax="${DEPTH[1]}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { clamp: part('clamp'), wire: part('wire'), sight: part('sight'), bead: part('bead'), glass2: part('glass-2'), baseline: part('baseline'), glass1: part('glass-1') }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const state = { depth: 3, target: 3, index: 0, u: POINTS[0].u, v: POINTS[0].v, touring: true, clock: 0 }
  const e2 = onGlass(CAM2, EPIPOLE2.u, EPIPOLE2.v)
  nodes.baseline.setAttribute('d', path([CAM1.c, e2]))

  function draw() {
    const point = { u: state.u, v: state.v }
    const m = measure(point, state.depth)
    // The wire runs from lens 1 along the ray to the board.
    const end = pointAt(point, -(BOARD_X + 2.2) / PER_M)
    nodes.wire.setAttribute('d', path([CAM1.c, end]))
    nodes.clamp.innerHTML = clampSvg(end)
    nodes.sight.setAttribute('d', path([m.X, CAM2.c]))
    nodes.bead.innerHTML = S(G.sphereOf(m.X, 2.4, P), { tone: 'hi', lit: true })
    // Glass 2: the epipolar line, the epipole and the bead's image.
    const line = lineOf(point)
    nodes.glass2.innerHTML = L(lineOnGlass(CAM2, line), { tone: 'hi' }) + markSvg(CAM2, EPIPOLE2, 'mid', 0.6) + D([at(onGlass(CAM2, m.image.u, m.image.v))], { size: 1.5, tone: 'hi' })
    // Glass 1: the chosen point, the epipole of camera 2 and the matching epipolar line.
    const l1 = vec.cross([point.u, point.v, 1], [EPIPOLE1.u, EPIPOLE1.v, 1])
    nodes.glass1.innerHTML = L(lineOnGlass(CAM1, l1), { tone: 'lo' }) + markSvg(CAM1, EPIPOLE1, 'mid', 0.6) + markSvg(CAM1, point, 'hi', 0.9)

    const text = `深度 ${state.depth.toFixed(1)} m · 距极线 ${m.distance.toFixed(1)} px ✓`
    if (readout.textContent !== text) readout.textContent = text
    const px = (p) => `(${Math.round(p.u)}, ${Math.round(p.v)})`
    calc.x.textContent = px(point)
    calc.x2.textContent = px(m.image)
    calc.r.textContent = Math.abs(m.residual) < 5e-4 ? '0.000' : m.residual.toFixed(3)
  }

  function describe() {
    const p = POINTS[state.index]
    stage.setAttribute('aria-valuenow', state.target.toFixed(1))
    stage.setAttribute('aria-valuetext', `像点 ${p.label}，珠子深度 ${state.target.toFixed(1)} 米，它在相机 2 中的像落在极线上`)
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === state.index)))
  }

  const PERIOD = 10
  function tick(dt, calm) {
    if (state.touring && !calm) {
      const before = Math.floor(state.clock / PERIOD)
      state.clock += dt
      if (Math.floor(state.clock / PERIOD) !== before) {
        state.index = (state.index + 1) % POINTS.length
        describe()
      }
      const phase = (1 - Math.cos(((state.clock % PERIOD) / PERIOD) * Math.PI * 2)) / 2
      state.target = DEPTH[0] + phase * (DEPTH[1] - DEPTH[0])
    }
    const goal = POINTS[state.index]
    state.depth = follow(state.depth, state.target, dt, 0.3, calm)
    state.u = follow(state.u, goal.u, dt, 0.35, calm)
    state.v = follow(state.v, goal.v, dt, 0.35, calm)
    if (Math.abs(state.depth - state.target) < 1e-3) state.depth = state.target
    if (Math.abs(state.u - goal.u) < 0.05) state.u = goal.u
    if (Math.abs(state.v - goal.v) < 0.05) state.v = goal.v
    draw()
    return state.touring || state.depth !== state.target || state.u !== goal.u || state.v !== goal.v
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.clock = Math.acos(clamp(1 - ((state.depth - DEPTH[0]) / (DEPTH[1] - DEPTH[0])) * 2, -1, 1)) / (Math.PI * 2) * PERIOD
    loop.run()
  })
  const steer = (depth, index = state.index) => {
    state.touring = false
    state.target = clamp(depth, DEPTH[0], DEPTH[1])
    state.index = index
    describe()
    idle.touch()
    loop.run()
  }
  const onPointer = (event) => {
    const [x] = floorPoint(viewBoxPoint(svg, event), HEIGHT, P)
    if (x > -70 || x < BOARD_X) return
    steer(-x / PER_M)
  }
  const onKey = (event) => {
    const step = event.shiftKey ? 0.5 : 0.1
    if (event.key === 'ArrowLeft') steer(state.target + step)
    else if (event.key === 'ArrowRight') steer(state.target - step)
    else if (event.key === 'Home') steer(DEPTH[0])
    else if (event.key === 'End') steer(DEPTH[1])
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') steer(state.target, (state.index + (event.key === 'ArrowUp' ? 1 : POINTS.length - 1)) % POINTS.length)
    else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set="point"]')
    if (!button) return
    steer(state.target, Number(button.dataset.value))
  }

  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerdown', onPointer)
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)
  if (loop.still.matches) {
    state.touring = false
    Object.assign(state, { index: 1, u: POINTS[1].u, v: POINTS[1].v, depth: 4, target: 4 })
  }
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
