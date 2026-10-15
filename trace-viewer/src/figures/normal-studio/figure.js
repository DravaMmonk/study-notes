import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createLoop, floorPoint, viewBoxPoint } from '../common.js'

// Fig · The facing bench (3-3 一个亮度不够).
// A white test card rides a ball joint on a post in the middle of a bench; a rod out of its face is its
// normal N. Two spot lamps on stands are aimed at the card from the left and from the far side. The
// card's face takes the brightness max(0, N·L) of whichever lamp is on, and a grey-scale ruler on the
// near edge for each lamp reads it: a rider shows the card now, a flag the brightness in the photo.
// Drag on the bench and the rod swings toward your finger; tap a lamp to switch to its photo.
//
// The figure is controlled: mount(root, { props, emit }) returns { update(props), destroy() }.
// props = { point: [x, y], lamps: { A: { dir, photo }, B: … }, active: 'A' }. The point is the facing
// as seen from above (x right, y toward the viewer, the same axes as the game's facing disc). Without
// a host it runs on its own defaults, so the notes preview still works.

const W = 560
const H = 400
const BALL = 25 // the ball joint's height
const CARD = 15 // half-size of the card
const FACE = 3.8 // the card's face, along N from the ball centre
const REACH = 40 // lamp distance from the ball
const AIM = 16 // the pointer is read on a plane this far above the ball
const RIM = 0.97
const PLATE = { x: -42, y: -42, w: 84, d: 84, r: 7 }
const RULER = { from: -28, to: 28, edge: 32.5, d: 5 } // along the near edges, 0 → 1 left to right as seen

const lampDir = (azimuth, elevation) => {
  const a = (azimuth * Math.PI) / 180
  const e = (elevation * Math.PI) / 180
  return [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)]
}
const DEFAULTS = {
  point: [0, 0],
  lamps: { A: { dir: lampDir(180, 40), photo: 0.62 }, B: { dir: lampDir(270, 40), photo: 0.33 } },
  active: 'A',
}

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -14, 0), [-REACH * 0.77 - 6, 0, BALL + REACH * 0.65 + 6], [0, -REACH * 0.77 - 6, BALL + REACH * 0.65 + 6], [0, 0, BALL + CARD + 4]],
  W,
  H,
  { pad: 10, azimuth: 45, elevation: 58 },
)
const V = G.viewOf(P)
const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const path = (points, closed = false) => `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}${closed ? 'Z' : ''}`
const CENTRE = [0, 0, BALL]
const normalOf = ([x, y]) => [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))]
const shadeOf = (n, dir) => Math.max(0, G.dot3(n, dir))
const tone = (d, value) => `<g class="ns-tone"><path class="ns-dark" d="${d}"/><path class="ns-light" d="${d}" fill-opacity="${clamp(value, 0, 1).toFixed(3)}"/></g>`

// Each lamp's ruler runs along a near edge: lamp A's along the +y edge (left), lamp B's along +x (right).
const RULERS = {
  A: { at: (t, off = 0) => [RULER.from + t * (RULER.to - RULER.from), RULER.edge + off, 0.8], across: [0, 1, 0] },
  B: { at: (t, off = 0) => [RULER.edge + off, RULER.to - t * (RULER.to - RULER.from), 0.8], across: [1, 0, 0] },
}

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -14, 10, P)}"/>`]
  for (const [x, y] of k.corners(PLATE, 10).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
    out.push(S(k.cylinder(x, y, 4.6, -14, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 3.6, -12.4, 2.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -10, 10, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4.5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 6.5)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
  // The post's foot: a round boss with a ring of ticks every 30° of lean direction.
  out.push(S(k.cylinder(0, 0, 7, 0, 1.6, P, 48, 0.4), { tone: 'mid' }))
  const ticks = k.radialTicks(0, 0, 6.8, 12, 3, 1.6, [0.9, 1.8], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  return out.join('')
}

function ruler(key) {
  const R = RULERS[key]
  const out = []
  const corner = (t, off) => at(R.at(t, off))
  const holder = [corner(-0.03, -0.8), corner(1.03, -0.8), corner(1.03, RULER.d + 0.8), corner(-0.03, RULER.d + 0.8)]
  out.push(`<path class="iso-shade" data-shade="1" d="${path(holder, true)}"/>`)
  for (let step = 0; step < 10; step++) {
    const patch = [corner(step / 10, 0), corner((step + 1) / 10, 0), corner((step + 1) / 10, RULER.d), corner(step / 10, RULER.d)]
    out.push(tone(path(patch, true), step / 10 + 0.05))
  }
  out.push(L(path([corner(0, 0), corner(1, 0), corner(1, RULER.d), corner(0, RULER.d)], true), { tone: 'lo' }))
  const minor = []
  for (let step = 1; step < 10; step++) minor.push(path([corner(step / 10, 0), corner(step / 10, RULER.d)]))
  out.push(L(minor.join(''), { tone: 'faint' }))
  return out.join('')
}

// A rider on the ruler (the card now) and a flag on its far side (the photo).
function marks(key, value, photo, match) {
  const R = RULERS[key]
  const t = clamp(value, 0, 1)
  const box = (u, off, w, d) => [R.at(u - w, off), R.at(u + w, off), R.at(u + w, off + d), R.at(u - w, off + d)]
  const slab = (pts, z0, z1, style) => {
    const plan = pts.map(([x, y]) => [x, y])
    return S(k.extrude(plan, z0, z1 - z0, P), style)
  }
  const flagFoot = R.at(clamp(photo, 0, 1), -2.6)
  const flag = [
    slab(box(clamp(photo, 0, 1), -3.6, 0.018, 2), 0.8, 1.8, { tone: 'lo' }),
    S(k.cylinder(flagFoot[0], flagFoot[1], 0.5, 1.8, 10, P, 10), { tone: 'hi', crease: 'none' }),
  ]
  const top = [...flagFoot.slice(0, 2), 11.8]
  const pennant = [top, G.add3(top, G.mul3(R.across, -5.5)), G.add3(top, [0, 0, -2.6])].map(at)
  flag.push(`<path class="iso-top" d="${path(pennant, true)}"/>`, L(path(pennant, true), { tone: 'hi' }))
  const riderBody = slab(box(t, RULER.d + 0.6, 0.045, 3.4), 0.8, 3.2, { tone: match ? 'hi' : 'mid', lit: match })
  const needle = L(path([at(R.at(t, RULER.d + 0.6)), at([...R.at(t, -0.2).slice(0, 2), 0.8])]), { tone: 'hi', free: 'end' })
  return flag.join('') + riderBody + needle
}

// A lamp on a stand at REACH along its direction, its can aimed at the ball.
function lamp(dir, on) {
  const head = G.add3(CENTRE, G.mul3(dir, REACH))
  const aim = G.mul3(dir, -1)
  const F = G.frameAlong(head, aim)
  const out = []
  out.push(S(k.cylinder(head[0], head[1], 4.4, 0, 1.4, P, 28, 0.3), { tone: 'mid' }))
  out.push(S(k.cylinder(head[0], head[1], 1.1, 1.4, head[2] - 4.6, P, 14), { tone: 'mid', crease: 'none' }))
  out.push(S(G.sphereOf([head[0], head[1], head[2] - 3.4], 1.6, P), { tone: 'mid' }))
  const can = S(G.solidOf([[-5, 2.6], [-3.6, 3.6], [3, 3.6], [4.2, 4.2]], F, P), { tone: 'hi', lit: on, inner: L([-2, -0.4, 1.2].map((s) => G.arcOf(F, s, 3.6, P, { trim: 0 })).join(''), { tone: 'lo' }) })
  const lens = G.circleOf(F, 4.2, 3.6, P)
  const face = G.dot3(aim, V) > 0
  const lensSvg = `<g class="ns-tone"><path class="ns-dark" d="${lens}"/><path class="ns-light" d="${lens}" fill-opacity="${on ? 1 : 0.08}"/></g>${L(lens, { tone: 'lo' })}`
  out.push(face ? can + lensSvg : lensSvg + can)
  return { svg: out.join(''), lens: G.add3(head, G.mul3(aim, 4.2)), head }
}

// The card on its ball joint, the rod, and the light string, in the order the facing needs.
function card(n, value, lit, lensAt) {
  const u = G.unit3([-n[2], 0, n[0]])
  const v = G.cross3(n, u)
  const F = G.frameOf(CENTRE, n, u, v)
  const square = [[-CARD, -CARD], [CARD, -CARD], [CARD, CARD], [-CARD, CARD]]
  const faceAt = G.add3(CENTRE, G.mul3(n, FACE))
  const front = G.dot3(n, V) > 0
  const post = S(k.cylinder(0, 0, 1.3, 1.6, BALL - 1.6, P, 14), { tone: 'mid', crease: 'none' }) + S(G.sphereOf(CENTRE, 2.4, P), { tone: 'mid' }) + S(G.disc(0, FACE - 1.2, 1, F, P), { tone: 'mid', crease: 'none' })
  const board = S(G.prismOf(F, square, FACE - 1.2, FACE, P), { tone: 'hi', crease: 'lo' })
  const corners = square.map(([a, b]) => at(G.add3(faceAt, G.add3(G.mul3(u, a), G.mul3(v, b)))))
  const face = front ? tone(path(corners, true), value) + L(path(corners, true), { tone: 'hi' }) : ''
  const RF = G.frameAlong(faceAt, n)
  const rod = S(G.disc(0, 12, 0.5, RF, P), { tone: 'hi', crease: 'none' }) + S(G.sphereOf(G.pointOf(RF, 12.8, 0, 0), 1.5, P), { tone: 'hi', lit: true })
  const string = lit && lensAt ? L(path([at(lensAt), at(faceAt)]), { tone: 'mid', className: 'ns-ray' }) + D([at(lensAt)], { size: 0.6, tone: 'hi' }) : ''
  return front ? post + board + face + string + rod : rod + string + board + post
}

export const meta = { id: 'normal-studio', fig: 'Fig 3.3', title: '朝向台' }

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: '朝向台：台面中央一根立柱顶着球铰，球铰上装一张白色测试卡，卡面中心伸出一根法线杆。左边和后边各有一盏聚光灯对准卡片。卡面的亮度等于法线和灯线夹角的余弦；近处两条灰阶尺各对应一盏灯，游标是卡片现在的亮度，小旗是照片里的亮度。',
    body: [base(), '<g data-part="rulers"></g>', '<g data-part="lamps"></g>', '<g data-part="card"></g>', '<g data-part="marks"></g>', '<g data-part="hits"></g>'],
  })
  return k.plateHtml({
    fig: meta.fig,
    title: meta.title,
    hint: '在台面上拖动 · 点灯切换',
    keys: [
      { mark: 'raised', label: '测试卡与法线杆 N' },
      { mark: 'lit', label: '亮着的灯，细线是光线 L' },
      { mark: 'flat', label: '灰阶尺：游标是现在，小旗是照片' },
    ],
    caption: '卡面亮度 = max(0, N·L)。只看一盏灯，和照片一样亮的朝向有一整圈；换另一盏灯再比一次，才剩下一个。',
    body: `<div class="iso-stage ns-stage" tabindex="0" role="slider" aria-label="朝向台。拖动改变测试卡的朝向，方向键微调。">${svg}</div>`,
  })
}

export const css = `
.ns-dark{fill:#000;stroke:none}
.ns-light{fill:#fff;stroke:none}
.ns-hit{fill:transparent;cursor:pointer;touch-action:none}
.ns-grab{fill:transparent;cursor:grab;touch-action:none}
.ns-stage.is-grabbing .ns-grab{cursor:grabbing}
`

export function mount(root, { props, emit } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { rulers: part('rulers'), lamps: part('lamps'), card: part('card'), marks: part('marks'), hits: part('hits') }
  let state = { ...DEFAULTS, ...props }
  const shown = { point: [...state.point] }
  let drawnFrame = ''
  let grabbing = false

  const send = (change) => {
    state = { ...state, ...change }
    if (emit) emit(change)
    loop.run()
  }

  function drawFrame() {
    // Lamps, rulers and hit targets change only with the lamp set or the active lamp.
    const key = `${Object.keys(state.lamps).join('')}:${state.active}`
    if (key === drawnFrame) return
    drawnFrame = key
    const lamps = Object.entries(state.lamps).map(([name, lampState]) => [name, lamp(lampState.dir, name === state.active)])
    lamps.sort((a, b) => k.depthOf(a[1].head, P) - k.depthOf(b[1].head, P))
    nodes.lamps.innerHTML = lamps.map(([, l]) => l.svg).join('')
    nodes.rulers.innerHTML = Object.keys(state.lamps).map(ruler).join('')
    const r = 12 * G.scaleOf(P)
    const grab = at(CENTRE)
    nodes.hits.innerHTML = `<circle class="ns-grab" data-grab cx="${grab[0].toFixed(1)}" cy="${(grab[1] - 4).toFixed(1)}" r="${(CARD * 2.6 * G.scaleOf(P)).toFixed(1)}"/>` +
      lamps.map(([name, l]) => {
        const [x, y] = at(l.head)
        return `<circle class="ns-hit" data-lamp="${name}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"><title>${name === state.active ? '这盏灯亮着' : '点亮这盏灯'}</title></circle>`
      }).join('')
  }

  function draw() {
    drawFrame()
    const n = normalOf(shown.point)
    const active = state.lamps[state.active]
    const value = active ? shadeOf(n, active.dir) : 0
    const lensAt = active ? G.add3(CENTRE, G.mul3(active.dir, REACH - 4.2)) : null
    nodes.card.innerHTML = card(n, value, value > 0, lensAt)
    nodes.marks.innerHTML = Object.entries(state.lamps).map(([name, l]) => {
      const now = shadeOf(n, l.dir)
      return marks(name, now, l.photo, Math.abs(now - l.photo) <= (state.tolerance ?? 0.02))
    }).join('')
    const deg = Math.round((Math.asin(Math.min(1, Math.hypot(...shown.point))) * 180) / Math.PI)
    stage.setAttribute('aria-valuetext', `卡片歪了 ${deg} 度，在亮着的灯下亮度 ${value.toFixed(2)}`)
  }

  function tick(dt, calm) {
    const [tx, ty] = state.point
    const ease = calm || grabbing ? 1 : 1 - Math.exp(-dt / 0.09)
    shown.point = [shown.point[0] + (tx - shown.point[0]) * ease, shown.point[1] + (ty - shown.point[1]) * ease]
    const done = Math.hypot(tx - shown.point[0], ty - shown.point[1]) < 0.002
    if (done) shown.point = [tx, ty]
    draw()
    return !done
  }

  const loop = createLoop(stage, tick)

  const pointAt = (event) => {
    const [px, py] = floorPoint(viewBoxPoint(svg, event), BALL + AIM, P)
    let x = px / Math.hypot(px, py, AIM)
    let y = py / Math.hypot(px, py, AIM)
    const r = Math.hypot(x, y)
    if (r > RIM) [x, y] = [(x / r) * RIM, (y / r) * RIM]
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]
  }
  const onDown = (event) => {
    const lampHit = event.target.closest('[data-lamp]')
    if (lampHit) {
      if (lampHit.dataset.lamp !== state.active) send({ active: lampHit.dataset.lamp })
      return
    }
    if (!event.target.closest('[data-grab]')) return
    grabbing = true
    stage.classList.add('is-grabbing')
    try {
      svg.setPointerCapture(event.pointerId)
    } catch {
      // A pointer that is already gone cannot be captured; the gesture still works.
    }
    send({ point: pointAt(event) })
  }
  const onMove = (event) => grabbing && send({ point: pointAt(event) })
  const onUp = () => {
    grabbing = false
    stage.classList.remove('is-grabbing')
  }
  const onKey = (event) => {
    const step = event.shiftKey ? 0.1 : 0.02
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]
    if (!delta) return
    event.preventDefault()
    let [x, y] = [state.point[0] + delta[0], state.point[1] + delta[1]]
    const r = Math.hypot(x, y)
    if (r > RIM) [x, y] = [(x / r) * RIM, (y / r) * RIM]
    send({ point: [Number(x.toFixed(3)), Number(y.toFixed(3))] })
  }

  svg.addEventListener('pointerdown', onDown)
  svg.addEventListener('pointermove', onMove)
  svg.addEventListener('pointerup', onUp)
  svg.addEventListener('pointercancel', onUp)
  stage.addEventListener('keydown', onKey)
  draw()

  return {
    update(next) {
      state = { ...state, ...next }
      loop.run()
    },
    destroy() {
      loop.stop()
      svg.removeEventListener('pointerdown', onDown)
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerup', onUp)
      svg.removeEventListener('pointercancel', onUp)
      stage.removeEventListener('keydown', onKey)
    },
  }
}
