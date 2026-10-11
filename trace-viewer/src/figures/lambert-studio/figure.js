import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, follow, viewBoxPoint } from '../common.js'
import { cameraOf } from '../kit/iso-kit.js'
import { ALBEDOS, ALBEDO_B, NORMAL_A, NORMAL_B, POWERS, SWING, TILT, scene } from './model.js'

// Fig · The Lambertian studio.
// A turntable carries two matte test cards: a dark card (R_A) lying flat and a bright card (R = 0.8)
// leaned back 60° on a hinged easel. A spotlight rides an arc rail over them, always aimed at the
// centre, and a string from its lens to the centre pin is the light direction L; a short gnomon on
// each card is its normal N. Each card's face takes the shade I = I_L·R·cos θ, and two riders on a
// grey-scale strip read both values. Overhead, the dark card facing the lamp and the bright card turned
// half away read the same: a single brightness cannot tell reflectance from orientation.

const W = 640
const H = 380
const CENTRE = 7 // the arc's centre and the pin top
const ARC = { r: [50, 54], half: 1.6 }
const PLATE = { x: -74, y: -36, w: 148, d: 88, r: 8 }
const TABLE = { r: 30, z: [0, 4] }
const CARD = 10 // half-size
const A = { y: -15.5, z: 8.8 } // card A centre (top face)
const B = { y: 15.5, hinge: [5, 7], at: null }
const STRIP = { x: -50, y: 38, w: 100, d: 6, r: 0.6 }
const DIMMER = { x: 60, y: 40 }
const rad = (deg) => (deg * Math.PI) / 180
// Card B: centre on the plane through the hinge line, leaning back so its normal is NORMAL_B.
const E1 = [Math.cos(rad(TILT)), 0, -Math.sin(rad(TILT))] // down the card's face, toward the hinge
B.at = [B.hinge[0] - CARD * E1[0], B.y, B.hinge[1] - CARD * E1[2] + 0.4 * NORMAL_B[2]]

const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, -ARC.half, CENTRE + ARC.r[1] + 2], [-ARC.r[1], 0, CENTRE], [ARC.r[1], 0, CENTRE]], W, H, { pad: 26, azimuth: 44 })

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const path = (points, closed = false) => `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}${closed ? 'Z' : ''}`
const AXIS_Y = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]) // u = x, v = z
// Shown brightness: a gentle gamma so mid readings look mid-grey.
const shown = (value) => Math.pow(clamp(value, 0, 1), 1 / 1.8)
const toneFace = (d, part) => `<g class="ls-tone"><path class="ls-dark" d="${d}"/><path class="ls-light" data-part="${part}" d="${d}" fill-opacity="0"/></g>`

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4.5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 10)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // Grey-scale strip: ten steps of 0.1 in reading, the same shading the cards take.
  const holder = k.insetPlan(STRIP, -1.6)
  out.push(S(k.slabOf(holder, 0, 0.8, P, 3, 0.3), { tone: 'mid' }))
  for (let step = 0; step < 10; step++) {
    const patch = [[STRIP.x + step * 10, STRIP.y], [STRIP.x + step * 10 + 10, STRIP.y], [STRIP.x + step * 10 + 10, STRIP.y + STRIP.d], [STRIP.x + step * 10, STRIP.y + STRIP.d]]
    const d = path(patch.map(([x, y]) => at([x, y, 0.8])), true)
    out.push(`<g class="ls-tone"><path class="ls-dark" d="${d}"/><path class="ls-light" d="${d}" fill-opacity="${shown(step / 10 + 0.05).toFixed(3)}"/></g>`)
  }
  out.push(L(path([STRIP.x, STRIP.x + STRIP.w].map((x) => at([x, STRIP.y, 0.8])).concat([at([STRIP.x + STRIP.w, STRIP.y + STRIP.d, 0.8]), at([STRIP.x, STRIP.y + STRIP.d, 0.8])]), true), { tone: 'lo' }))
  const minor = []
  for (let step = 1; step < 10; step++) minor.push(k.lineOnTop([STRIP.x + step * 10, STRIP.y], [STRIP.x + step * 10, STRIP.y + STRIP.d], 0.8, P))
  out.push(L(minor.join(''), { tone: 'faint' }))
  out.push(D([[STRIP.x - 0.6, STRIP.y + 3], [STRIP.x + STRIP.w + 0.6, STRIP.y + 3]].map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }))

  // Label plate in the near-left corner.
  const label = { x: -68, y: 37, w: 13, d: 10, r: 1.2 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 8], [5, 6], [7, 7]].forEach(([dy, length]) => out.push(L(k.lineOnTop([label.x + 3, label.y + dy], [label.x + 3 + length, label.y + dy], 0.8, P), { tone: 'lo', free: true })))

  // Dimmer box beside the right foot of the arc, its knob turned by the lamp power.
  const box = { x: DIMMER.x - 6, y: DIMMER.y - 6, w: 12, d: 12, r: 1.4 }
  out.push(S(k.slabOf(box, 0, 8, P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(box, 2, P, 3), { tone: 'faint' }) }))
  out.push(L(k.planOutline(k.insetPlan(box, 1.8), 8, P, 3), { tone: 'faint' }))
  const ticks = k.radialTicks(DIMMER.x, DIMMER.y, 5.2, 8, 4, 8, [0.8, 1.6], P, -Math.PI * 0.75, Math.PI * 1.5)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(S(k.cylinder(DIMMER.x, DIMMER.y, 3, 8, 3, P, 24), { tone: 'mid' }))
  out.push(L(k.knurl(DIMMER.x, DIMMER.y, 3, 8, 11, 20, P), { tone: 'lo' }))
  return out.join('')
}

function turntable() {
  const out = [S(k.cylinder(0, 0, TABLE.r + 2, 0, 1.4, P, 72), { tone: 'lo' })]
  out.push(S(k.cylinder(0, 0, TABLE.r, 1.4, TABLE.z[1] - 1.4, P, 72, 0.8), { tone: 'mid', inner: L(k.sideArc(0, 0, TABLE.r, 2.6, P, 48), { tone: 'faint' }) }))
  const ticks = k.radialTicks(0, 0, TABLE.r - 0.15, 72, 6, TABLE.z[1], [1.2, 3.65], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(L(k.ring(0, 0, TABLE.r - 3.8, TABLE.z[1], P, 64), { tone: 'faint' }))
  // The centre pin: the far end of the light string.
  out.push(S(k.cylinder(0, 0, 1.8, TABLE.z[1], 0.8, P, 18), { tone: 'mid' }))
  out.push(S(k.cylinder(0, 0, 0.7, TABLE.z[1] + 0.8, CENTRE - TABLE.z[1] - 0.8, P, 12), { tone: 'mid', crease: 'none' }))
  out.push(D([at([0, 0, CENTRE])], { size: 0.7, tone: 'hi' }))
  return out.join('')
}

// A normal gnomon: a short rod out of a card's face with a ball on the end.
function gnomon(origin, normal) {
  const F = G.frameAlong(origin, normal)
  return S(G.disc(0, 0.4, 1.4, F, P), { tone: 'mid' }) + S(G.disc(0.4, 7, 0.4, F, P), { tone: 'hi', crease: 'none' }) + S(G.sphereOf(G.pointOf(F, 7.6, 0, 0), 0.9, P), { tone: 'hi' })
}

function cardA() {
  const out = []
  const pedestal = { x: -CARD - 1, y: A.y - CARD - 1, w: 2 * CARD + 2, d: 2 * CARD + 2, r: 1.2 }
  out.push(S(k.slabOf(pedestal, TABLE.z[1], A.z - 0.8 - TABLE.z[1], P, 3, 0.5), { tone: 'mid' }))
  const card = { x: -CARD, y: A.y - CARD, w: 2 * CARD, d: 2 * CARD, r: 0.4 }
  out.push(S(k.slabOf(card, A.z - 0.8, 0.8, P, 2), { tone: 'hi', crease: 'lo' }))
  out.push(toneFace(path(k.ringOf(card, 2).map(([x, y]) => at([x, y, A.z])), true), 'face-a'))
  out.push(L(k.planOutline(card, A.z, P, 2), { tone: 'hi' }))
  out.push(D(k.corners(pedestal, 0.9).map(([x, y]) => at([x, y, A.z - 0.8])), { size: 0.38 }))
  out.push(gnomon([0, A.y, A.z], NORMAL_A))
  return out.join('')
}

function cardB() {
  const out = []
  const block = { x: -9, y: B.y - CARD - 1, w: 15, d: 2 * CARD + 2, r: 1.2 }
  out.push(S(k.slabOf(block, TABLE.z[1], B.hinge[1] - TABLE.z[1], P, 3, 0.5), { tone: 'mid' }))
  out.push(D([[-7.4, B.y - 9.6], [-7.4, B.y + 9.6]].map(([x, y]) => at([x, y, B.hinge[1]])), { size: 0.38 }))
  // Prop strut from the block's back edge to the card's back.
  const back = G.add3(B.at, G.mul3(NORMAL_B, -0.8))
  const foot = [-6.5, B.y, B.hinge[1]]
  const strut = G.frameAlong(foot, G.sub3(back, foot))
  out.push(S(G.disc(0, G.len3(G.sub3(back, foot)), 0.6, strut, P), { tone: 'mid', crease: 'none' }))
  // The card, then its hinge knuckles along the bottom edge.
  const F = G.frameOf(B.at, NORMAL_B, E1, [0, 1, 0])
  const square = [[-CARD, -CARD], [CARD, -CARD], [CARD, CARD], [-CARD, CARD]]
  out.push(S(G.prismOf(F, square, -0.8, 0, P), { tone: 'hi', crease: 'lo' }))
  const face = square.map(([u, v]) => at(G.add3(B.at, G.add3(G.mul3(E1, u), [0, v, 0]))))
  out.push(toneFace(path(face, true), 'face-b'))
  out.push(L(path(face, true), { tone: 'hi' }))
  const hinge = AXIS_Y([B.hinge[0], 0, B.hinge[1]])
  for (const [s0, s1] of [[B.y - CARD, B.y - CARD + 4], [B.y - 2, B.y + 2], [B.y + CARD - 4, B.y + CARD]]) out.push(S(G.disc(s0, s1, 1, hinge, P), { tone: 'mid' }))
  out.push(gnomon(B.at, NORMAL_B))
  return out.join('')
}

// The arc rail: a curved bar standing in the plane y = 0, its feet in two pillow blocks. Built from
// its front face and the strips of its outer and inner rims, each strip shaded by the way it faces.
function arc() {
  const [ri, ro] = ARC.r
  const h = ARC.half
  const V = G.viewOf(P)
  const angles = Array.from({ length: 61 }, (_, i) => -90 + i * 3)
  const point = (r, deg, y) => at([r * Math.sin(rad(deg)), y, CENTRE + r * Math.cos(rad(deg))])
  const out = []
  const edges = []
  for (const [r, sign] of [[ro, 1], [ri, -1]]) {
    // Runs of facets that face the reader with the same tone become one polygon.
    let run = null
    const flush = () => {
      if (!run) return
      const strip = [...run.from.map((deg) => point(r, deg, h)), ...run.from.slice().reverse().map((deg) => point(r, deg, -h))]
      out.push(run.tone === 4 ? `<path class="iso-top" d="${path(strip, true)}"/>` : `<path class="iso-shade" data-shade="${run.tone}" d="${path(strip, true)}"/>`)
      edges.push(path(run.from.map((deg) => point(r, deg, -h))))
      run = null
    }
    for (let i = 0; i < angles.length - 1; i++) {
      const mid = rad((angles[i] + angles[i + 1]) / 2)
      const normal = [sign * Math.sin(mid), 0, sign * Math.cos(mid)]
      if (G.dot3(normal, V) <= 0) {
        flush()
        continue
      }
      const tone = G.toneOf(normal, P)
      if (run && run.tone !== tone) {
        const last = run.from[run.from.length - 1]
        flush()
        run = { tone, from: [last] }
      }
      if (!run) run = { tone, from: [angles[i]] }
      run.from.push(angles[i + 1])
    }
    flush()
  }
  const front = [...angles.map((deg) => point(ro, deg, h)), ...angles.slice().reverse().map((deg) => point(ri, deg, h))]
  out.push(`<path class="iso-shade" data-shade="${G.toneOf([0, 1, 0], P)}" d="${path(front, true)}"/>`)
  const ticks = { minor: [], major: [] }
  for (let deg = -75; deg <= 75; deg += 5) {
    const big = deg % 15 === 0
    ;(big ? ticks.major : ticks.minor).push(path([point(ro - (big ? 1.8 : 1), deg, h), point(ro, deg, h)]))
  }
  out.push(L(ticks.minor.join(''), { tone: 'lo' }), L(ticks.major.join(''), { tone: 'mid' }), L(path([point(ro - 2.6, 0, h), point(ro, 0, h)]), { tone: 'hi' }))
  out.push(L(edges.join('') + path(front, true), { tone: 'mid', className: 'iso-edge' }))
  return `<g class="iso-solid">${out.join('')}</g>`
}

function pillows() {
  return [-1, 1].map((side) => {
    const x = side * (ARC.r[0] + ARC.r[1]) / 2
    const plan = { x: x - 4, y: -4.5, w: 8, d: 9, r: 1 }
    return S(k.slabOf(plan, 0, CENTRE + 2, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(plan, 2.4, P, 3), { tone: 'faint' }) }) + D([at([x - 2.4, -2.6, CENTRE + 2]), at([x + 2.4, 2.6, CENTRE + 2])], { size: 0.4 })
  }).join('')
}

// The lamp on its carriage at angle `deg`, aimed at the centre.
function lampSvg(deg) {
  const a = rad(deg)
  const radial = [Math.sin(a), 0, Math.cos(a)]
  const tangent = [Math.cos(a), 0, -Math.sin(a)]
  const mid = (ARC.r[0] + ARC.r[1]) / 2
  const centre = [0, 0, CENTRE]
  const on = (r, t = 0) => G.add3(centre, G.add3(G.mul3(radial, r), G.mul3(tangent, t)))
  const out = []
  // Carriage: a block straddling the rail, with a clamp knob on the outside.
  const F = AXIS_Y([0, 0, 0])
  const corners = [[-4.5, ARC.r[0] - 1.4], [4.5, ARC.r[0] - 1.4], [4.5, ARC.r[1] + 1.4], [-4.5, ARC.r[1] + 1.4]].map(([t, r]) => {
    const p = on(r, t)
    return [p[0], p[2]]
  })
  out.push(S(G.prismOf(F, corners, -ARC.half - 1.2, ARC.half + 1.2, P), { tone: 'mid' }))
  const knob = G.frameAlong(on(ARC.r[1] + 1.4), radial)
  out.push(S(G.disc(0, 1.2, 1.1, knob, P), { tone: 'mid', crease: 'none' }) + S(G.disc(1.2, 3.4, 2, knob, P), { tone: 'mid' }))
  // Lamp head: a finned can on the inside of the rail, lens toward the centre.
  const head = G.frameAlong(on(ARC.r[0] - 1.4), G.mul3(radial, -1))
  out.push(S(G.disc(0, 2, 1.6, head, P), { tone: 'mid' }))
  // The can and its front bezel are separate solids, painted far one first.
  const can = S(G.solidOf([[2, 3.4], [4, 4.4], [12, 4.4]], head, P), { tone: 'hi', lit: true, inner: L([5.6, 7.2, 8.8, 10.4].map((s) => G.arcOf(head, s, 4.4, P, { trim: 0 })).join(''), { tone: 'lo' }) })
  const bezel = S(G.disc(12, 14, 5.2, head, P), { tone: 'hi', lit: true })
  out.push(G.dot3(head.a, G.viewOf(P)) > 0 ? can + bezel : bezel + can)
  return { svg: out.join(''), lens: G.circleOf(head, 14, 4.2, P), lensCentre: G.pointOf(head, 14, 0, 0), mid }
}

export const meta = { id: 'lambert-studio', fig: 'Fig 5.1', title: '朗伯摄影台' }

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      '朗伯反射的小摄影台。转台上放两张哑光测试卡：一张深色卡平放，一张反射率 0.8 的浅色卡在铰链支架上后仰 60 度；每张卡中心立着一根法线小杆。聚光灯沿弧形导轨移动，始终对准中心，灯到中心销的细线就是光线方向。卡面的明暗等于灯功率乘反射率乘夹角余弦；前方灰阶条上的两个游标读出两张卡的亮度。灯在正上方时两张卡读数相同。',
    body: [
      base(),
      turntable(),
      cardA(),
      pillows(),
      arc(),
      '<path data-part="cable" class="iso-line" data-tone="lo" d=""/>',
      '<g data-part="lamp"></g>',
      '<g data-part="string"></g>',
      cardB(),
      '<g data-part="riders"></g>',
      '<path data-part="dial" class="iso-line" data-tone="hi" data-free="end" style="stroke-width:1" d=""/>',
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="摄影台设置">
    <div class="fx-control"><span>灯功率</span>${POWERS.map((p) => `<button type="button" data-set="power" data-value="${p}">${p.toFixed(1)}</button>`).join('')}</div>
    <div class="fx-control"><span>深色卡反射率</span>${ALBEDOS.map((r) => `<button type="button" data-set="albedo" data-value="${r}">${r.toFixed(1)}</button>`).join('')}</div>
  </div>
  <div class="fx-calc"><span>I = I_L·R·cosθ</span><i>·</i><span>A:</span><b data-calc="a"></b><i>·</i><span>B:</span><b data-calc="b"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '悬停弧轨 · 方向键',
      readout: '',
      keys: [
        { mark: 'raised', label: '测试卡与法线杆 N' },
        { mark: 'lit', label: '聚光灯，细线为光线方向 L' },
        { mark: 'flat', label: '灰阶条：两个游标读亮度' },
      ],
      caption:
        `沿弧轨推动聚光灯，每张卡的明暗按 I = I_L·R·cosθ 变化，θ 是法线杆与灯线的夹角。灯在正上方时，平放的深色卡（R = 0.4，cos 0° = 1）和后仰 60° 的浅色卡（R = ${ALBEDO_B}，cos 60° = 0.5）同为 0.40：只看亮度，分不出“材质暗”还是“朝向偏”。把灯摆向一侧，两张卡立刻分开；改灯功率只会让两者同比变化。`,
      body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="朗伯摄影台。左右方向键摆动聚光灯，上下方向键改灯功率，1 到 3 换深色卡的反射率。" aria-valuemin="${SWING[0]}" aria-valuemax="${SWING[1]}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export const css = `
.ls-tone{--ls-dark:var(--anatomy-hi);--ls-light:var(--anatomy-top)}
.iso[data-theme="dark"] .ls-tone,.iso[data-theme="blueprint"] .ls-tone{--ls-dark:var(--anatomy-shade-0);--ls-light:var(--anatomy-hi)}
.ls-dark{fill:var(--ls-dark);stroke:none}
.ls-light{fill:var(--ls-light);stroke:none}
`

// Screen → world point on the vertical plane y = 0.
function onArcPlane([sx, sy]) {
  const { sinA, cosA, sinE, cosE, k: scale } = cameraOf(P)
  const x = (sx - P.origin[0]) / scale / sinA
  const z = (x * cosA * sinE - (sy - P.origin[1]) / scale) / cosE
  return [x, z]
}

function rider(x, y, tone) {
  const plan = { x: x - 2.2, y, w: 4.4, d: 3, r: 0.8 }
  return S(k.slabOf(plan, 0, 1.6, P, 3, 0.4), { tone, crease: tone === 'hi' ? 'lo' : 'faint' }) + D([at([x, y + 1.5, 1.6])], { size: 0.45, tone })
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { lamp: part('lamp'), string: part('string'), cable: part('cable'), riders: part('riders'), dial: part('dial'), a: part('face-a'), b: part('face-b') }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  // Tour: [lamp angle, power, seconds to hold once there].
  const TOUR = [
    [0, 1, 2.6],
    [-55, 1, 1.6],
    [60, 1, 2],
    [0, 1, 2.2],
    [0, 0.5, 2.2],
    [35, 0.5, 1.4],
    [0, 1, 0.6],
  ]
  const state = { angle: 0, target: 0, power: 1, powerShown: 1, albedo: 0.4, touring: true, step: 0, dwell: 0 }
  let drawnAngle = null

  function draw() {
    const s = scene({ angle: state.angle, power: state.powerShown, albedo: state.albedo })
    if (drawnAngle !== state.angle) {
      drawnAngle = state.angle
      const lamp = lampSvg(state.angle)
      const lens = `<g class="ls-tone"><path class="ls-dark" d="${lamp.lens}"/><path class="ls-light" data-part="lens" d="${lamp.lens}"/></g>${L(lamp.lens, { tone: 'lo' })}`
      nodes.lamp.innerHTML = lamp.svg + lens
      nodes.string.innerHTML = L(k.segment(lamp.lensCentre, [0, 0, CENTRE], P), { tone: 'mid' }) + D([at(lamp.lensCentre)], { size: 0.6, tone: 'hi' })
      // The lamp cable runs down the rail's face to the right foot.
      const r = ARC.r[1] - 0.5
      const points = []
      for (let deg = state.angle + 3; deg <= 90; deg += 3) points.push(at([r * Math.sin(rad(deg)), ARC.half, CENTRE + r * Math.cos(rad(deg))]))
      nodes.cable.setAttribute('d', points.length > 1 ? path(points) : '')
    }
    nodes.lamp.querySelector('[data-part="lens"]')?.setAttribute('fill-opacity', shown(state.powerShown).toFixed(3))
    nodes.a.setAttribute('fill-opacity', shown(s.a.value).toFixed(3))
    nodes.b.setAttribute('fill-opacity', shown(s.b.value).toFixed(3))
    const x = (value) => STRIP.x + clamp(value, 0, 1) * STRIP.w
    nodes.riders.innerHTML = rider(x(s.a.value), STRIP.y - 3 - 1.6, 'mid') + rider(x(s.b.value), STRIP.y + STRIP.d + 1.6, 'hi')
      + L(k.lineOnTop([x(s.a.value), STRIP.y - 1.6], [x(s.a.value), STRIP.y + 1.4], 0.8, P) + k.lineOnTop([x(s.b.value), STRIP.y + STRIP.d + 1.6], [x(s.b.value), STRIP.y + STRIP.d - 1.4], 0.8, P), { tone: 'hi', free: 'end' })
    const turn = -Math.PI * 0.75 + ((state.powerShown - 0.25) / 0.75) * Math.PI * 1.5
    nodes.dial.setAttribute('d', k.lineOnTop([DIMMER.x, DIMMER.y], [DIMMER.x + Math.sin(turn) * 2.6, DIMMER.y - Math.cos(turn) * 2.6], 11, P))

    const same = Math.abs(s.a.value - s.b.value) < 0.005
    const deg = Math.round(state.angle)
    const text = `θ ${String(deg).replace('-', '−')}° · I_A ${s.a.value.toFixed(2)} ${same ? '=' : '·'} I_B ${s.b.value.toFixed(2)}`
    if (readout.textContent !== text) readout.textContent = text
    const term = (r, t) => `${state.powerShown.toFixed(1)} × ${r.toFixed(1)} × cos ${Math.round(t.theta)}° = ${t.value.toFixed(2)}`
    calc.a.textContent = term(state.albedo, s.a)
    calc.b.textContent = term(ALBEDO_B, s.b)
  }

  function describe() {
    const s = scene({ angle: state.target, power: state.power, albedo: state.albedo })
    stage.setAttribute('aria-valuenow', String(Math.round(state.target)))
    stage.setAttribute('aria-valuetext', `灯偏离正上方 ${Math.round(state.target)} 度，功率 ${state.power}，深色卡读数 ${s.a.value.toFixed(2)}，浅色卡读数 ${s.b.value.toFixed(2)}`)
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.value) === state[button.dataset.set])))
  }

  function tick(dt, calm) {
    if (state.touring && !calm) {
      const [angle, power, hold] = TOUR[state.step]
      if (state.target !== angle || state.power !== power) {
        Object.assign(state, { target: angle, power })
        describe()
      }
      if (state.angle === angle && state.powerShown === power) state.dwell += dt
      if (state.dwell > hold) {
        state.dwell = 0
        state.step = (state.step + 1) % TOUR.length
      }
    }
    state.angle = follow(state.angle, state.target, dt, 0.45, calm)
    if (Math.abs(state.angle - state.target) < 0.05) state.angle = state.target
    state.powerShown = follow(state.powerShown, state.power, dt, 0.25, calm)
    draw()
    return state.touring || state.angle !== state.target || state.powerShown !== state.power
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.dwell = 0
    loop.run()
  })
  const steer = (changes) => {
    state.touring = false
    Object.assign(state, changes)
    state.target = clamp(state.target, SWING[0], SWING[1])
    describe()
    idle.touch()
    loop.run()
  }
  const onPointer = (event) => {
    const [x, z] = onArcPlane(viewBoxPoint(svg, event))
    const r = Math.hypot(x, z - CENTRE)
    if (z < CENTRE + 4 || r < 20 || r > ARC.r[1] + 18) return
    steer({ target: Math.round((Math.atan2(x, z - CENTRE) * 180) / Math.PI) })
  }
  const onKey = (event) => {
    const step = event.shiftKey ? 15 : 5
    if (event.key === 'ArrowLeft') steer({ target: state.target - step })
    else if (event.key === 'ArrowRight') steer({ target: state.target + step })
    else if (event.key === 'ArrowUp') steer({ power: POWERS[1] })
    else if (event.key === 'ArrowDown') steer({ power: POWERS[0] })
    else if (event.key === 'Home') steer({ target: 0 })
    else if (['1', '2', '3'].includes(event.key)) steer({ albedo: ALBEDOS[Number(event.key) - 1] })
    else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    steer({ [button.dataset.set]: Number(button.dataset.value) })
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
