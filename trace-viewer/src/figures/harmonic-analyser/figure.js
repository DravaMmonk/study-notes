import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { cameraOf } from '../kit/iso-kit.js'
import { clamp, createIdle, createLoop, follow, t, viewBoxPoint } from '../common.js'
import { ORDERS, WHEELS, coefficient, gains, overshoot, sigmaOf, sum } from './model.js'

// Fig · The harmonic synthesiser.
// Eight geared wheels turn at 1, 3, 5 … 15 times the hand crank. Each carries a crank pin in a radial
// slot, set 4/(πk) from the hub; a slotted yoke turns the pin's circle into a pure up-and-down
// r·sin kt and lifts a pulley. One cord runs over every lifted pulley and under the fixed ones between,
// so its free end, and the pen it carries, rises by twice the sum. A strip chart scrolls past the pen.
// Filtering is moving pins toward their hubs: a hard low-pass parks every pin past the n-th wheel.

const W = 640
const H = 380
const PITCH = 22
const WHEEL = { r: 10, z: 20, face: -2, back: -5 }
const SCALE = 7 // pin radius per unit of coefficient
const PLANE = -0.3 // the pulleys' and cord's mid-plane
const PULLEY = 5.5
const RIDE = 64 // moving pulley centre at rest
const FIXED = 50 // fixed pulley centre
const BEAM = { z: [40, 44], y: [-8, 1] }
const YOKE = { y: [-1.6, 1], h: 3 }
const GUIDE = [ORDERS.length * PITCH, 84] // guide pulley (x, z), to the right of the last fixed pulley
const PEN_X = GUIDE[0] + PULLEY
const PEN0 = 42
const PAPER = { x: [PEN_X + 1.5, 254], z: [20, 64], y: -3.4 }
const PERIOD = 5 // seconds per turn of the hand crank
const SPAN = (PAPER.x[1] - PAPER.x[0] - 6) / (4 * Math.PI) // paper per radian: two periods across
const BASE = { x: -30, y: -20, w: 296, d: 36, r: 8 }
const X = (index) => index * PITCH

const P = k.fitProjection([...k.boxCorners(BASE, -17, 0), [GUIDE[0], 0, GUIDE[1] + PULLEY + 2], [-20, -8, 48], [PAPER.x[1] + 4, -10, 72]], W, H, { pad: 24, azimuth: 64 })

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const path = (points, closed = false) => `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}${closed ? 'Z' : ''}`
const alongY = (x, y, z) => G.frameAlong([x, y, z], [0, 1, 0])
// A vertical face at y: local (u, v) = (x, −z).
const faceAt = (y) => k.sideMatrix([0, y], 0, P, 'left')
const circle = (cx, cy, r, steps = 28) => path(Array.from({ length: steps }, (_, i) => [cx + r * Math.cos((i / steps) * Math.PI * 2), cy + r * Math.sin((i / steps) * Math.PI * 2)]), true)
const stadium = (x0, x1, half, steps = 10) => {
  const points = []
  for (let i = 0; i <= steps; i++) points.push([x1 + half * Math.sin((i / steps) * Math.PI), -half * Math.cos((i / steps) * Math.PI)])
  for (let i = 0; i <= steps; i++) points.push([x0 - half * Math.sin((i / steps) * Math.PI), half * Math.cos((i / steps) * Math.PI)])
  return path(points, true)
}

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -17, 12, P)}"/>`]
  const feet = [...k.corners(BASE, 16), [BASE.x + BASE.w / 2, BASE.y + 12], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 12]]
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(BASE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P), { tone: 'lo' }))
  const screws = k.corners(BASE, 9.5)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
  // Label plate on the near edge, under the first wheels.
  const label = { x: -6, y: 6, w: 26, d: 7, r: 1.2 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 4), { tone: 'faint' }))
  ;[[2.4, 16], [3.6, 11], [4.8, 13]].forEach(([dy, length]) => out.push(L(k.lineOnTop([label.x + 3, label.y + dy], [label.x + 3 + length, label.y + dy], 0.8, P), { tone: 'lo', free: true })))
  out.push(D([at([label.x + 23, label.y + 2, 0.8]), at([label.x + 23, label.y + 5, 0.8])], { size: 0.42 }))
  return out.join('')
}

// The chart recorder at the right: deck, rollers, the paper and a bridge behind.
function chartBack() {
  const out = []
  const deck = { x: PAPER.x[0] - 3.5, y: -13, w: PAPER.x[1] - PAPER.x[0] + 13.5, d: 17, r: 2 }
  out.push(S(k.slabOf(deck, 0, 14, P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(deck, 4, P, 3), { tone: 'faint' }) }))
  out.push(D(k.corners(deck, 2.4).map(([x, y]) => at([x, y, 14])), { size: 0.42 }))
  for (const x of [deck.x + 2, deck.x + deck.w - 6]) {
    out.push(S(k.slabOf({ x, y: -12, w: 4, d: 3, r: 0.6 }, 14, 58, P, 2, 0.4), { tone: 'mid' }))
  }
  out.push(S(k.slabOf({ x: deck.x + 2, y: -12, w: deck.w - 4, d: 3, r: 0.6 }, 72, 3, P, 2, 0.4), { tone: 'mid' }))
  for (const x of PAPER.x) {
    const y = PAPER.y - 2.5
    out.push(S(k.cylinder(x, y, 3.4, 14, 2, P, 24), { tone: 'mid' }))
    out.push(S(k.cylinder(x, y, 2.5, 16, 50, P, 24), { tone: 'mid', crease: 'none', inner: L(k.sideArc(x, y, 2.5, 19, P, 16) + k.sideArc(x, y, 2.5, 63, P, 16), { tone: 'faint' }) }))
    out.push(S(k.cylinder(x, y, 3.4, 66, 2, P, 24), { tone: 'mid' }))
    out.push(S(k.slabOf({ x: x - 1, y: -12, w: 2, d: y + 12, r: 0.4 }, 70, 2, P, 2), { tone: 'mid', crease: 'none' }))
    out.push(S(k.cylinder(x, y, 0.8, 68, 4, P, 12), { tone: 'mid', crease: 'none' }))
  }
  // Chart drive box with its speed knob, at the far end.
  const box = { x: PAPER.x[1] + 4, y: -6, w: 8, d: 10, r: 1 }
  out.push(S(k.slabOf(box, 14, 9, P, 3, 0.5), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(box, 1.6), 23, P, 3), { tone: 'faint' }))
  out.push(S(k.cylinder(box.x + 4, box.y + 5, 2.4, 23, 2.6, P, 20), { tone: 'mid' }))
  out.push(L(k.knurl(box.x + 4, box.y + 5, 2.4, 23, 25.6, 16, P), { tone: 'lo' }))
  return out.join('')
}

function paper() {
  const [x0, x1] = PAPER.x
  const [z0, z1] = PAPER.z
  const sheet = [[x0, -z1], [x1, -z1], [x1, -z0], [x0, -z0]]
  const rows = []
  for (let level = -1.25; level <= 1.25 + 1e-9; level += 0.25) rows.push(path([[x0, -(PEN0 + level * 2 * SCALE)], [x1, -(PEN0 + level * 2 * SCALE)]]))
  const strong = [-1, 0, 1].map((level) => path([[x0, -(PEN0 + level * 2 * SCALE)], [x1, -(PEN0 + level * 2 * SCALE)]]))
  return `<g transform="${faceAt(PAPER.y)}">
    <path class="hs-paper" d="${path(sheet, true)}"/>
    ${L(rows.join(''), { tone: 'faint' })}${L(strong.join(''), { tone: 'lo' })}
    <g data-part="columns"></g>
    <path data-part="trace" class="iso-line" data-tone="lit" style="stroke-width:1.1" d=""/>
    ${L(path(sheet, true), { tone: 'lo' })}
  </g>`
}

// Frame: the left standard with the hand crank, the wheel plate and the right post up to the guide pulley.
function frame() {
  const out = []
  const left = { x: -22, y: -8, w: 7, d: 9, r: 1 }
  out.push(S(k.slabOf(left, 0, BEAM.z[0], P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(left, 6, P, 3), { tone: 'faint' }) }))
  const right = { x: GUIDE[0] - 3, y: -8, w: 6, d: 5, r: 1 }
  out.push(S(k.slabOf(right, 0, GUIDE[1] + 2, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam(right, 6, P, 3), { tone: 'faint' }) }))
  out.push(D([at([GUIDE[0], -5.5, GUIDE[1] + 2])], { size: 0.42 }))
  // The pen's guide rod, from the base up to a bracket off the post.
  out.push(S(k.cylinder(PEN_X - 4.4, -0.8, 1.6, 0, 1.2, P, 16), { tone: 'mid' }))
  out.push(S(k.cylinder(PEN_X - 4.4, -0.8, 0.6, 1.2, 68.8, P, 12), { tone: 'mid', crease: 'none' }))
  out.push(S(k.slabOf({ x: PEN_X - 6, y: -8, w: 3.2, d: 8.8, r: 0.5 }, 70, 2, P, 2, 0.3), { tone: 'mid' }))
  const plate = { x: -15, y: -8, w: X(WHEELS - 1) + 26, d: 3, r: 0.6 }
  out.push(S(k.slabOf(plate, 0, 36, P, 2, 0.5), { tone: 'mid' }))
  out.push(D([[-12, 4], [-12, 33], [X(WHEELS - 1) + 8, 4], [X(WHEELS - 1) + 8, 33]].map(([x, z]) => at([x, -5, z])), { size: 0.42 }))
  return out.join('')
}

// A wheel's fixed body (disc, rim ribs, hub); its face features turn in a separate group.
function wheelBody(index) {
  const x = X(index)
  const F = alongY(x, 0, WHEEL.z)
  const out = [S(G.disc(WHEEL.back, WHEEL.face, WHEEL.r, F, P), { tone: 'mid', inner: k.fadedSvg(G.ribsOf(F, WHEEL.back, WHEEL.face, WHEEL.r, 60, P, { fade: [0.1, 0.55] }), { tone: 'lo' }) })]
  return out.join('')
}

function wheelFace(index) {
  const k1 = ORDERS[index]
  const home = SCALE * coefficient(k1)
  const holes = [Math.PI / 3, Math.PI, (5 * Math.PI) / 3].map((a) => circle(6.2 * Math.cos(a), 6.2 * Math.sin(a), 1.5, 20)).join('')
  return `<path class="hs-void" d="${stadium(1.8, 9.2, 1.1)}"/>${L(stadium(1.8, 9.2, 1.1), { tone: 'lo' })}
    <path class="hs-void" d="${holes}"/>${L(holes, { tone: 'lo' })}
    ${L(path([[home, -1.1], [home, 1.1]]), { tone: 'mid' })}`
}

function hub(index) {
  const F = alongY(X(index), 0, WHEEL.z)
  return S(G.disc(WHEEL.face, WHEEL.face + 0.8, 1.6, F, P), { tone: 'mid' }) + D([at([X(index), WHEEL.face + 0.8, WHEEL.z])], { size: 0.45, tone: 'mid' })
}

// The yoke for wheel `index`, built at rest (its slot centred on the hub).
function yoke(index) {
  const half = SCALE * coefficient(ORDERS[index]) + 2.6
  const x = X(index)
  const bar = { x: x - half, y: YOKE.y[0], w: half * 2, d: YOKE.y[1] - YOKE.y[0], r: 0.6 }
  const out = [S(k.slabOf(bar, WHEEL.z - YOKE.h / 2, YOKE.h, P, 2, 0.4), { tone: 'mid' })]
  const slot = stadium(x - half + 1.4, x + half - 1.4, 0.8, 8)
  out.push(`<g transform="${faceAt(YOKE.y[1])} translate(0 ${-WHEEL.z})"><path class="hs-void" d="${slot}"/>${L(slot, { tone: 'lo' })}</g>`)
  return out.join('')
}

// A crank pin with its cap, built at the hub.
function pin(index) {
  const F = alongY(X(index), 0, WHEEL.z)
  return S(G.disc(WHEEL.face, YOKE.y[1], 0.7, F, P), { tone: 'hi', crease: 'none' }) + S(G.disc(YOKE.y[1], YOKE.y[1] + 1, 1.25, F, P), { tone: 'hi', crease: 'lo' })
}

function pulley(x, z) {
  const F = alongY(x, 0, z)
  const face = PLANE + 1.2
  return S(G.disc(PLANE - 1.2, face, PULLEY, F, P), { tone: 'mid', inner: L(G.arcOf(F, PLANE, PULLEY - 0.2, P, { least: -1 }), { tone: 'faint' }) })
    + L(G.circleOf(F, face, PULLEY - 1.3, P), { tone: 'lo' })
    + S(G.disc(face, face + 0.6, 1.2, F, P), { tone: 'mid' })
}

function beam() {
  const plan = { x: -22, y: BEAM.y[0], w: GUIDE[0] + 2 + 22, d: BEAM.y[1] - BEAM.y[0], r: 0.8 }
  const out = [S(k.slabOf(plan, BEAM.z[0], BEAM.z[1] - BEAM.z[0], P, 2, 0.6), { tone: 'mid', inner: L(k.sideSeam(plan, BEAM.z[0] + 1.4, P, 2), { tone: 'faint' }) })]
  // Bushings for the rods, brackets for the fixed pulleys, the anchor peg for the cord.
  for (let index = 0; index < WHEELS; index++) out.push(S(k.cylinder(X(index), PLANE, 1.8, BEAM.z[1], 2, P, 18), { tone: 'mid' }))
  for (let index = 0; index < WHEELS; index++) {
    const x = X(index) + PITCH / 2
    out.push(S(k.slabOf({ x: x - 1.2, y: -3.6, w: 2.4, d: 2, r: 0.4 }, BEAM.z[1], FIXED - BEAM.z[1], P, 2), { tone: 'mid', crease: 'none' }))
  }
  out.push(S(k.cylinder(X(0) - PULLEY, PLANE, 0.9, BEAM.z[1], 2.4, P, 14), { tone: 'mid' }))
  return out.join('')
}

function crank() {
  const F = alongY(-18.5, 1, 22)
  return S(G.disc(0, 1.6, 6.5, F, P), { tone: 'mid', inner: k.fadedSvg(G.ribsOf(F, 0, 1.6, 6.5, 40, P, { fade: [0.1, 0.55] }), { tone: 'lo' }) }) + S(G.disc(1.6, 2.4, 1.6, F, P), { tone: 'mid' })
}

function handle() {
  const F = alongY(-18.5 + 4.6, 2.6, 22)
  return S(G.disc(0, 4.4, 1, F, P), { tone: 'mid', crease: 'none' }) + S(G.disc(4.4, 5.2, 1.4, F, P), { tone: 'mid' })
}

function penSvg() {
  const out = []
  const block = { x: PEN_X - 3.5, y: -2.6, w: 7, d: 3.6, r: 0.8 }
  out.push(S(k.slabOf({ x: PEN_X - 5.6, y: -1.8, w: 2.6, d: 2, r: 0.5 }, PEN0 - 1.6, 3.2, P, 2), { tone: 'mid' }))
  out.push(S(k.slabOf(block, PEN0 - 2.2, 4.4, P, 3, 0.5), { tone: 'mid' }))
  out.push(D([at([PEN_X, PLANE, PEN0 + 2.2])], { size: 0.5, tone: 'hi' }))
  // The stylus leans down and back from an arm onto the paper.
  out.push(S(k.slabOf({ x: PEN_X + 3.5, y: -2, w: 3, d: 1.6, r: 0.4 }, PEN0 - 0.6, 1.2, P, 2), { tone: 'mid', crease: 'none' }))
  const tip = [PEN_X + 6, PAPER.y, PEN0]
  const F = G.frameAlong([PEN_X + 6, -1.2, PEN0 + 2.6], G.unit3([0, PAPER.y + 1.2, -2.6]))
  const reach = G.len3(G.sub3(tip, F.o))
  out.push(S(G.solidOf([[0, 0.7], [reach - 1.2, 0.7], [reach, 0]], F, P), { tone: 'hi', lit: true }))
  return out.join('')
}

export const meta = { id: 'harmonic-analyser', fig: 'Fig 4.1', title: '谐波合成机', titleEn: 'Harmonic synthesiser' }

export function render({ lang = 'zh' } = {}) {
  const wheels = Array.from({ length: WHEELS }, (_, index) => index)
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      '谐波合成机。八个齿轮分别以手摇曲柄的 1、3、5 直到 15 倍转速旋转，每个轮上的曲柄销离轮心 4/(πk)，带动开槽的轭上下做正弦运动并顶起一个滑轮；一根绳交替绕过这些动滑轮和其间的定滑轮，末端吊着记录笔，笔的高度是各项之和的两倍，在移动的记录纸上画出方波。滤波就是把高次轮上的销子推回轮心。',
      'A harmonic synthesiser. Eight gears turn at 1, 3, 5 and on up to 15 times the speed of the hand crank. The crank pin on each wheel sits 4/(πk) from its centre and drives a slotted yoke up and down in a sine, lifting a pulley; one cord winds alternately over these moving pulleys and the fixed pulleys between them, and a pen hangs from its end. The pen’s height is twice the sum of the terms, so it draws a square wave on the moving chart paper. Filtering means pushing the pins on the higher-order wheels back toward the centre.',
    ),
    body: [
      base(),
      chartBack(),
      paper(),
      frame(),
      `<g data-part="crank">${crank()}</g>`,
      `<g data-part="handle">${handle()}</g>`,
      wheels.map((index) => wheelBody(index)).join(''),
      wheels.map((index) => `<g transform="${faceAt(WHEEL.face)} translate(${X(index)} ${-WHEEL.z})"><g data-part="face-${index}">${wheelFace(index)}</g></g>${hub(index)}`).join(''),
      wheels.map((index) => `<g data-part="yoke-${index}">${yoke(index)}</g>`).join(''),
      wheels.map((index) => `<g data-part="pin-${index}">${pin(index)}</g>`).join(''),
      '<g data-part="lower"></g>',
      beam(),
      '<g data-part="upper"></g>',
      wheels.map((index) => pulley(X(index) + PITCH / 2, FIXED)).join(''),
      wheels.map((index) => `<g data-part="pulley-${index}">${pulley(X(index), RIDE)}</g>`).join(''),
      pulley(GUIDE[0], GUIDE[1]),
      '<path data-part="cord" class="iso-line" data-tone="hi" d=""/>',
      `<g data-part="pen">${penSvg()}</g>`,
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, '滤波设置', 'Filter settings')}">
    <div class="fx-control"><span>${t(lang, '截止', 'Cutoff')}</span>${[1, 2, 3, 5, 8].map((n) => `<button type="button" data-set="n" data-value="${n}">${n}</button>`).join('')}</div>
    <div class="fx-control"><span>${t(lang, '掩膜', 'Mask')}</span><button type="button" data-set="shape" data-value="hard">${t(lang, '硬切', 'Hard')}</button><button type="button" data-set="shape" data-value="gauss">${t(lang, '高斯', 'Gaussian')}</button></div>
    <div class="fx-control"><span>${t(lang, '通带', 'Pass')}</span><button type="button" data-set="pass" data-value="low">${t(lang, '低通', 'Low-pass')}</button><button type="button" data-set="pass" data-value="high">${t(lang, '高通', 'High-pass')}</button></div>
  </div>
  <div class="fx-calc"><span>S(t) = Σ H(k)·4/(πk)·sin kt，H =</span><span class="hs-gains" data-calc="gains"></span></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '悬停轮子 · 方向键', 'Hover a wheel · arrow keys'),
      readout: '',
      keys: [
        { mark: 'lit', label: t(lang, '记录笔与纸上的曲线', 'pen and the curve on the paper') },
        { mark: 'raised', label: t(lang, '曲柄销：离轮心 = 该频率的振幅', 'crank pin: distance from centre = that frequency’s amplitude') },
        { mark: 'edge', label: t(lang, '求和绳', 'summing cord') },
      ],
      caption: t(
        lang,
        '手摇一圈，第 k 个轮转 k 圈，轭把销子的圆周运动变成 (4/πk)·sin kt，绳子把八项加起来交给记录笔：方波就是这些正弦波之和。低通就是把高次轮的销子推回轮心：只剩几个谐波时，跳变变缓、两侧出现波纹，硬切时过冲约为跳变的 9%，加再多谐波也不消失（振铃）。高斯掩膜逐渐减小各项，振铃几乎消失但边缘更钝；高通 H = 1 − H_LP 去掉低频，平台被抹平，剩下的起伏挤在跳变附近。',
        'One turn of the handle turns the k-th wheel k times; the yoke turns the pin’s circular motion into (4/πk)·sin kt, and the cord adds the eight terms and hands the total to the pen: a square wave is the sum of these sine waves. A low-pass filter pushes the pins on the higher-order wheels back to the centre. With only a few harmonics left, the jumps soften and ripples appear on either side; with a hard cut the overshoot is about 9% of the jump and does not go away however many harmonics you add (ringing). A Gaussian mask shrinks the terms gradually, so the ringing almost disappears but the edges get blunter. A high-pass filter, H = 1 − H_LP, removes the low frequencies: the flat tops are wiped out and what wiggles remain crowd around the jumps.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, '谐波合成机。左右方向键改变保留的谐波数，空格切换硬切与高斯，H 切换低通与高通。', 'Harmonic synthesiser. Left and right arrows change how many harmonics are kept, Space toggles hard and Gaussian masks, H toggles low-pass and high-pass.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export const css = `
.hs-paper{fill:var(--anatomy-top);stroke:none}
.hs-void{fill:var(--anatomy-shade-0);stroke:none}
.hs-gains{display:inline-grid;grid-template-columns:repeat(8,2.6em);gap:1px;padding:1px;background:var(--anatomy-faint)}
.hs-gains b{padding:1px 0;text-align:center;font-weight:400;background:var(--anatomy-card)}
.hs-gains b[data-off]{color:var(--anatomy-lo)}
`

// Screen → world point on the vertical plane y = y0.
function onPlaneY([sx, sy], y0) {
  const { sinA, cosA, sinE, cosE, k: scale } = cameraOf(P)
  const x = ((sx - P.origin[0]) / scale + y0 * cosA) / sinA
  const z = ((x * cosA + y0 * sinA) * sinE - (sy - P.origin[1]) / scale) / cosE
  return [x, z]
}

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const list = (name) => Array.from({ length: WHEELS }, (_, index) => part(`${name}-${index}`))
  const nodes = { faces: list('face'), yokes: list('yoke'), pins: list('pin'), pulleys: list('pulley'), lower: part('lower'), upper: part('upper'), cord: part('cord'), pen: part('pen'), trace: part('trace'), columns: part('columns'), handle: part('handle') }
  const readout = root.querySelector('[data-readout]')
  const calc = root.querySelector('[data-calc="gains"]')
  const buttons = [...root.querySelectorAll('[data-set]')]

  const config = { n: 3, shape: 'hard', pass: 'low' }
  const state = { phase: 0, weights: gains(config), history: [], touring: true, clock: 0, step: 0 }
  // Tour: [n, shape, pass, crank turns to hold].
  const TOUR = [
    [1, 'hard', 'low', 1.2],
    [2, 'hard', 'low', 1.2],
    [3, 'hard', 'low', 1.2],
    [5, 'hard', 'low', 1.4],
    [8, 'hard', 'low', 1.6],
    [5, 'gauss', 'low', 1.8],
    [3, 'hard', 'high', 1.8],
  ]
  const SAMPLE = (Math.PI * 2) / 360
  const WINDOW = 4 * Math.PI

  const lift = (index, phase, weights) => SCALE * weights[index] * coefficient(ORDERS[index]) * Math.sin(ORDERS[index] * phase)
  const penAt = (phase, weights) => PEN0 + 2 * SCALE * sum(phase, weights)

  function draw() {
    const { phase, weights } = state
    const lifts = weights.map((_, index) => lift(index, phase, weights))
    const lower = []
    const upper = []
    lifts.forEach((y, index) => {
      const x = X(index)
      const angle = ORDERS[index] * phase
      const r = SCALE * weights[index] * coefficient(ORDERS[index])
      nodes.faces[index].setAttribute('transform', `rotate(${((-angle * 180) / Math.PI).toFixed(2)})`)
      nodes.pins[index].setAttribute('transform', k.translateAlong(P, [r * Math.cos(angle), 0, r * Math.sin(angle)]))
      nodes.yokes[index].setAttribute('transform', k.translateAlong(P, [0, 0, y]))
      nodes.pulleys[index].setAttribute('transform', k.translateAlong(P, [0, 0, y]))
      const top = WHEEL.z + YOKE.h / 2 + y
      lower.push(S(k.cylinder(x, PLANE, 0.9, top, BEAM.z[0] - top, P, 14), { tone: 'mid', crease: 'none' }))
      upper.push(S(k.cylinder(x, PLANE, 0.9, BEAM.z[1] + 2, RIDE + y - BEAM.z[1] - 2, P, 14), { tone: 'mid', crease: 'none' }))
    })
    nodes.lower.innerHTML = lower.join('')
    nodes.upper.innerHTML = upper.join('')
    nodes.handle.setAttribute('transform', k.translateAlong(P, [4.6 * (Math.cos(phase) - 1), 0, 4.6 * Math.sin(phase)]))

    // The cord: up from the anchor, over each lifted pulley, under each fixed one, over the guide, down to the pen.
    const pen = penAt(phase, weights)
    const arc = (cx, cz, from, to, steps = 10) => Array.from({ length: steps + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / steps
      return at([cx + PULLEY * Math.cos(a), PLANE, cz + PULLEY * Math.sin(a)])
    })
    const points = [at([X(0) - PULLEY, PLANE, BEAM.z[1] + 2.4])]
    lifts.forEach((y, index) => {
      points.push(...arc(X(index), RIDE + y, Math.PI, 0))
      points.push(...arc(X(index) + PITCH / 2, FIXED, Math.PI, 2 * Math.PI))
    })
    points.push(...arc(GUIDE[0], GUIDE[1], Math.PI, 0))
    points.push(at([PEN_X, PLANE, pen + 2.2]))
    nodes.cord.setAttribute('d', path(points))
    nodes.pen.setAttribute('transform', k.translateAlong(P, [0, 0, pen - PEN0]))

    // The chart: samples scroll right from the pen tip; grid columns scroll with the paper.
    const x0 = PEN_X + 6
    const trace = []
    for (let i = state.history.length - 1; i >= 0; i--) {
      const [t, z] = state.history[i]
      const u = x0 + (phase - t) * SPAN
      if (u > PAPER.x[1]) break
      trace.push([u, -z])
    }
    trace.unshift([x0, -pen])
    nodes.trace.setAttribute('d', trace.length > 1 ? path(trace) : '')
    const columns = []
    const step = (Math.PI / 2) * SPAN
    for (let u = x0 + ((phase * SPAN) % step) - step; u < PAPER.x[1]; u += step) if (u > PAPER.x[0]) columns.push(path([[u, -PAPER.z[1]], [u, -PAPER.z[0]]]))
    nodes.columns.innerHTML = L(columns.join(''), { tone: 'faint' })

    const text = config.pass === 'high'
      ? t(lang, `高通 · 去掉前 ${config.n} 个谐波`, `High-pass · drop ${config.n}`)
      : `${config.shape === 'gauss' ? `${t(lang, '高斯低通', 'Gaussian')} σ≈${sigmaOf(config.n).toFixed(1)}` : t(lang, `保留 ${config.n} 个谐波`, `Keep ${config.n}`)} · ${t(lang, '过冲', 'overshoot')} ${Math.max(0, Math.round(overshoot(state.weights) * 100))}%`
    if (readout.textContent !== text) readout.textContent = text
  }

  function describe() {
    const target = gains(config)
    calc.innerHTML = target.map((g, index) => `<b title="k = ${ORDERS[index]}"${g < 0.005 ? ' data-off' : ''}>${g.toFixed(2)}</b>`).join('')
    stage.setAttribute('aria-valuetext', t(
      lang,
      config.pass === 'high' ? `高通，去掉前 ${config.n} 个谐波` : `${config.shape === 'gauss' ? '高斯' : '硬切'}低通，保留约 ${config.n} 个谐波`,
      config.pass === 'high' ? `High-pass, first ${config.n} harmonics removed` : `${config.shape === 'gauss' ? 'Gaussian' : 'Hard'} low-pass, about ${config.n} harmonics kept`,
    ))
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(String(config[button.dataset.set]) === button.dataset.value)))
  }

  function fill() {
    // A full window of history from the current gains, as if the machine had been running.
    state.history = []
    for (let t = state.phase - WINDOW; t <= state.phase; t += SAMPLE) state.history.push([t, penAt(t, state.weights)])
  }

  function tick(dt, calm) {
    const target = gains(config)
    state.weights = state.weights.map((w, index) => {
      const next = follow(w, target[index], dt, 0.35, calm)
      return Math.abs(next - target[index]) < 1e-3 ? target[index] : next
    })
    if (calm) {
      fill()
      draw()
      return false
    }
    const before = state.phase
    state.phase += (dt / PERIOD) * Math.PI * 2
    let t = state.history.length ? state.history[state.history.length - 1][0] : before
    while (t + SAMPLE <= state.phase) {
      t += SAMPLE
      state.history.push([t, penAt(t, state.weights)])
    }
    while (state.history.length && state.phase - state.history[0][0] > WINDOW + 0.2) state.history.shift()
    if (state.touring) {
      state.clock += dt / PERIOD
      if (state.clock > TOUR[state.step][3]) {
        state.clock = 0
        state.step = (state.step + 1) % TOUR.length
        const [n, shape, pass] = TOUR[state.step]
        Object.assign(config, { n, shape, pass })
        describe()
      }
    }
    draw()
    return true
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.clock = 0
    loop.run()
  })
  const steer = (changes) => {
    state.touring = false
    Object.assign(config, changes)
    config.n = clamp(config.n, 1, WHEELS)
    describe()
    idle.touch()
    loop.run()
  }
  const onPointer = (event) => {
    const [x, z] = onPlaneY(viewBoxPoint(svg, event), WHEEL.face)
    if (z < 4 || z > 80 || x < -PITCH / 2 || x > X(WHEELS - 1) + PITCH / 2) return
    const index = clamp(Math.round(x / PITCH), 0, WHEELS - 1)
    steer({ n: config.pass === 'high' ? Math.max(1, index) : index + 1 })
  }
  const onKey = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') steer({ n: config.n - 1 })
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') steer({ n: config.n + 1 })
    else if (event.key === 'Home') steer({ n: 1 })
    else if (event.key === 'End') steer({ n: WHEELS })
    else if (event.key === ' ') steer({ shape: config.shape === 'hard' ? 'gauss' : 'hard' })
    else if (event.key === 'h' || event.key === 'H') steer({ pass: config.pass === 'low' ? 'high' : 'low' })
    else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const { set, value } = button.dataset
    steer({ [set]: set === 'n' ? Number(value) : value })
  }

  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerdown', onPointer)
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)
  if (!loop.still.matches) Object.assign(config, { n: TOUR[0][0], shape: TOUR[0][1], pass: TOUR[0][2] })
  else {
    state.touring = false
    Object.assign(config, { n: 5, shape: 'hard', pass: 'low' })
    state.phase = Math.PI * 0.62
  }
  state.weights = gains(config)
  fill()
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
