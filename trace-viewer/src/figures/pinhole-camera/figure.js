import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, floorPoint, follow, t, viewBoxPoint } from '../common.js'
import { ARROW, DEPTH, FOCALS, HOLES, POST, mm, view } from './model.js'

// Fig · The pinhole camera on an optical bench.
// One rail carries everything. At its zero sits the front standard: a board with a stop slide that
// holds three pinholes. Behind it a bellows runs back to the rear standard, whose ground glass faces
// the reader; sliding that standard sets f. Up the rail an upright arrow rides a carriage at depth Z.
// Threads from the arrow's tip and foot run to the pinhole; on the glass the arrow stands upside
// down, x = −f·X/Z tall. Drawn at 1 unit = 4 mm in every direction, so the rays stay straight and
// one rule reads Z (in front of the pinhole) and f (behind it).

const W = 640
const H = 390
const U = 0.25 // units per mm
const AXIS = 36
const RAIL_TOP = 5
const CAR_TOP = 9
const BOARD = { x: 0.4, w: 1.6, half: 18, z: [18, 54] }
const BELLOWS = { half: 14.5, z: [21.5, 50.5], pleats: 11 }
const FRAME = { w: 2.4, half: 19, z: [16.5, 55.5] }
const GLASS = 16
const STOP = { half: 4, h: 40, holes: [24, 16, 8] } // hole heights up the slide, for HOLES in order
const POSTS = { half: 21.5, d: 3.5 }
const BENCH = { x: -168, y: -22, w: 228, d: 44, r: 7 }
const RAIL = { x: -158, y: -4, w: 206, d: 8, r: 1.2 }
const RULER = { x: -154, y: 9.5, w: 198, d: 7, r: 1 }

const P = k.fitProjection(
  [...k.boxCorners(BENCH, -17, 0), [-DEPTH[1] * U, 0, AXIS + ARROW * U], [0, -STOP.half, AXIS - STOP.holes[2] + STOP.h + 3], [40, -FRAME.half, FRAME.z[1] + 2], [40, FRAME.half, FRAME.z[1] + 2]],
  W,
  H,
  { pad: 26, azimuth: 38 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const path = (points, closed = false) => `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}${closed ? 'Z' : ''}`
// The ground glass's own plane, on the rear frame's back face: local (u, v) = (−y, −(z − AXIS)).
const FACE = k.sideMatrix([FRAME.w, 0], AXIS, P, 'right')

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -17, 12, P)}"/>`]
  const feet = [...k.corners(BENCH, 16), [BENCH.x + BENCH.w / 2, BENCH.y + 16], [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d - 16]]
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(BENCH, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(BENCH, 4.5), 0, P), { tone: 'lo' }))
  const screws = k.corners(BENCH, 9.5)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // One rule, zero at the pinhole: Z in front of it, f behind it. A tick every 25 mm, a long one every 100 mm.
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(RULER.x + 2, RULER.x + RULER.w - 2, 25 * U, 4, RULER.y + 0.2, 0.6, [2.2, RULER.d - 0.2], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(L(k.lineOnTop([0, RULER.y + 0.6], [0, RULER.y + RULER.d], 0.6, P), { tone: 'hi' }))

  // Label plate at the far end of the bench.
  const label = { x: -160, y: -16, w: 9, d: 22, r: 1.2 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 4), { tone: 'faint' }))
  ;[[2.6, 13], [4.4, 9], [6.2, 11]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + dx, label.y + 3], [label.x + dx, label.y + 3 + length], 0.8, P), { tone: 'lo', free: true })))
  out.push(D([at([label.x + 4.5, label.y + 19.4, 0.8])], { size: 0.42 }))

  // The rail and its end stops.
  out.push(S(k.slabOf(RAIL, 0, RAIL_TOP, P, 3, 0.5), { tone: 'mid' }))
  out.push(L(k.lineOnTop([RAIL.x, 0], [RAIL.x + RAIL.w, 0], RAIL_TOP, P), { tone: 'faint' }))
  for (const x of [RAIL.x - 6, RAIL.x + RAIL.w]) {
    out.push(S(k.slabOf({ x, y: -9, w: 6, d: 18, r: 1.2 }, 0, 9, P, 3, 0.5), { tone: 'mid' }))
    out.push(D([at([x + 3, -5, 9]), at([x + 3, 5, 9])], { size: 0.45 }))
  }
  return out.join('')
}

// A carriage on the rail with a pointer on the rule and a clamp knob, built at x = 0.
function carriage(half = 7, depth = 14) {
  const out = []
  const plan = { x: -half, y: -depth / 2 - 2, w: half * 2, d: depth + 4, r: 1.6 }
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 2), RAIL_TOP, 0.1, P)}" style="filter:blur(4px)"/>`)
  const tab = plan.y + plan.d
  out.push(S(k.slabOf({ x: -1, y: tab, w: 2, d: 1, r: 0.2 }, 1, RAIL_TOP + 1, P, 2), { tone: 'mid', crease: 'none' }))
  out.push(S(k.slabOf({ x: -1, y: tab, w: 2, d: RULER.y + 4.6 - tab, r: 0.4 }, 1, 0.6, P, 2), { tone: 'mid' }))
  out.push(L(k.lineOnTop([0, tab + 1], [0, RULER.y + 4.6], 1.6, P), { tone: 'hi' }))
  out.push(S(k.slabOf(plan, RAIL_TOP, CAR_TOP - RAIL_TOP, P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(plan, RAIL_TOP + 1.4, P, 3), { tone: 'faint' }) }))
  out.push(D(k.corners(plan, 2.4).map(([x, y]) => at([x, y, CAR_TOP])), { size: 0.42 }))
  const knob = [half - 3, tab + 4.4]
  out.push(S(k.slabOf({ x: knob[0] - 1.4, y: tab, w: 2.8, d: 2.2, r: 0.6 }, 5.8, 2.4, P, 2), { tone: 'mid', crease: 'none' }))
  out.push(S(k.cylinder(knob[0], knob[1], 2.3, 4.6, 4.8, P, 18), { tone: 'mid' }))
  out.push(L(k.knurl(knob[0], knob[1], 2.3, 4.6, 9.4, 16, P), { tone: 'lo' }))
  return out.join('')
}

// The arrow on its post, on a carriage, built at x = 0.
function object() {
  const out = [carriage()]
  out.push(S(k.cylinder(0, 0, 3, CAR_TOP, 2.5, P, 24), { tone: 'mid', inner: L(k.sideArc(0, 0, 3, CAR_TOP + 1, P, 16), { tone: 'faint' }) }))
  out.push(S(k.cylinder(0, 0, 1.3, CAR_TOP + 2.5, AXIS - CAR_TOP - 3.3, P, 14), { tone: 'mid', crease: 'none', inner: L(k.sideArc(0, 0, 1.3, 22, P, 10), { tone: 'faint' }) }))
  const F = G.frameAlong([0, 0, AXIS], [0, 0, 1])
  out.push(S(G.disc(-0.8, 0, 2.6, F, P), { tone: 'mid' }))
  const tip = ARROW * U
  out.push(S(G.solidOf([[0, 1.1], [tip - 6, 1.1], [tip - 6, 3], [tip, 0]], F, P), { tone: 'hi', crease: 'lo' }))
  return out.join('')
}

// An upright of a standard, with a lock knob on the reader's side.
function post(x0, y, knob) {
  const plan = { x: x0, y, w: 4.4, d: POSTS.d, r: 0.6 }
  const out = [S(k.slabOf(plan, CAR_TOP, FRAME.z[1] - CAR_TOP + 1, P, 2, 0.4), { tone: 'mid', inner: L(k.sideSeam(plan, CAR_TOP + 4, P, 2), { tone: 'faint' }) })]
  out.push(D([at([x0 + 2.2, y + POSTS.d / 2, FRAME.z[1] + 1])], { size: 0.42 }))
  if (knob) {
    const [cx, cy] = [x0 + 2.2, y + POSTS.d + 2.6]
    out.push(S(k.slabOf({ x: cx - 1, y: y + POSTS.d, w: 2, d: 1.2, r: 0.3 }, AXIS - 1, 2, P, 2), { tone: 'mid', crease: 'none' }))
    out.push(S(k.cylinder(cx, cy, 1.8, AXIS - 2.2, 4.4, P, 16), { tone: 'mid' }))
    out.push(L(k.knurl(cx, cy, 1.8, AXIS - 2.2, AXIS + 2.2, 14, P), { tone: 'lo' }))
  }
  return out.join('')
}

// The stop slide: a strip with three pinholes on the board's front, built with its bottom at z = 0.
function slide() {
  const out = []
  const strip = { x: -0.4, y: -STOP.half, w: 0.8, d: STOP.half * 2, r: 0.3 }
  out.push(S(k.slabOf(strip, 0, STOP.h, P, 2, 0.3), { tone: 'mid' }))
  out.push(S(k.slabOf({ x: -1.4, y: -2.6, w: 2.8, d: 5.2, r: 0.8 }, STOP.h, 2.2, P, 3, 0.4), { tone: 'mid' }))
  out.push(D([at([0, -1.4, STOP.h + 2.2]), at([0, 1.4, STOP.h + 2.2])], { size: 0.38 }))
  return out.join('')
}

function frontStandard() {
  const out = []
  out.push(`<g data-part="slide">${slide()}</g>`)
  const board = { x: BOARD.x, y: -BOARD.half, w: BOARD.w, d: BOARD.half * 2, r: 0.4 }
  out.push(S(k.slabOf(board, BOARD.z[0], BOARD.z[1] - BOARD.z[0], P, 2, 0.4), { tone: 'mid' }))
  out.push(D([[-16.4, 19.6], [16.4, 19.6], [-16.4, 52.4], [16.4, 52.4]].map(([y, z]) => at([BOARD.x + BOARD.w, y, z])), { size: 0.4 }))
  return out.join('')
}

// The bellows from the board's back to the frame's front, pleats spaced evenly over its length.
function bellowsSvg(length) {
  const plan = { x: BOARD.x + BOARD.w, y: -BELLOWS.half, w: length, d: BELLOWS.half * 2, r: 0.6 }
  const [z0, z1] = BELLOWS.z
  const folds = []
  for (let index = 1; index < BELLOWS.pleats; index++) {
    const x = plan.x + (index / BELLOWS.pleats) * length
    folds.push(path([at([x, BELLOWS.half, z0]), at([x, BELLOWS.half, z1]), at([x, -BELLOWS.half, z1])]))
  }
  return S(k.slabOf(plan, z0, z1 - z0, P, 2), { tone: 'mid', inner: L(folds.join(''), { tone: 'lo' }) })
}

// The rear frame with its ground glass, built at x = 0 (its front face, where the bellows end).
function frame() {
  const out = []
  const plan = { x: 0, y: -FRAME.half, w: FRAME.w, d: FRAME.half * 2, r: 0.6 }
  out.push(S(k.slabOf(plan, FRAME.z[0], FRAME.z[1] - FRAME.z[0], P, 2, 0.5), { tone: 'mid' }))
  const g = GLASS
  const glass = [[-g, -g], [g, -g], [g, g], [-g, g]]
  const minor = []
  const major = []
  for (let at10 = -60; at10 <= 60; at10 += 10) {
    const big = at10 % 50 === 0
    ;(big ? major : minor).push(path([[0, at10 * U], [big ? 1.8 : 1, at10 * U]]))
  }
  out.push(`<g transform="${FACE}">
    <path class="pc-glass" d="${path(glass, true)}"/>
    ${L(path([[0, -g], [0, g]]), { tone: 'faint' })}${L(path([[-g, 0], [g, 0]]), { tone: 'faint' })}
    ${L(minor.join(''), { tone: 'faint' })}${L(major.join(''), { tone: 'lo' })}
    <filter id="pc-blur" filterUnits="userSpaceOnUse" x="-24" y="-24" width="48" height="48"><feGaussianBlur data-part="spread" stdDeviation="0"/></filter>
    <g data-part="image"></g>
    ${L(path(glass, true), { tone: 'lo' })}
    ${L(path([[-g - 1.2, -g - 1.2], [g + 1.2, -g - 1.2], [g + 1.2, g + 1.2], [-g - 1.2, g + 1.2]], true), { tone: 'faint' })}
  </g>`)
  out.push(D([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([su, sv]) => at([FRAME.w, -su * (g + 2.4), AXIS - sv * (g + 2.4)])), { size: 0.42 }))
  // A spirit level on the top rail of the frame.
  const level = { x: 0.2, y: -6, w: 2, d: 12, r: 1 }
  out.push(S(k.slabOf(level, FRAME.z[1], 1.6, P, 3), { tone: 'mid' }))
  out.push(L(k.planOutline({ x: 0.7, y: -3.4, w: 1, d: 6.8, r: 0.5 }, FRAME.z[1] + 1.6, P, 3), { tone: 'lo' }))
  out.push(D([at([1.2, 0.6, FRAME.z[1] + 1.6])], { size: 0.5, tone: 'mid' }))
  return out.join('')
}

export const meta = { id: 'pinhole-camera', fig: 'Fig 2.1', title: '针孔相机', titleEn: 'Pinhole camera' }

export function render({ lang = 'zh' } = {}) {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      '光具座上的针孔相机。导轨零点处是前立板，板前的光阑滑片带三个大小不同的针孔；皮腔连到后立板，后立板的毛玻璃朝向读者，前后滑动后立板就改变焦距 f。导轨远端的小车载着一支直立箭头；两根细线从箭头尖和底部连到针孔。毛玻璃上的箭头倒立，高度为 f 乘 X 除以 Z。',
      'A pinhole camera on an optical bench. At the rail’s zero stands the front standard, with a stop slide in front of it holding three pinholes of different sizes; a bellows runs back to the rear standard, whose ground-glass image plane faces the reader, and sliding the rear standard back and forth changes the focal length f. A carriage at the far end of the rail carries an upright arrow; two strings run from the arrow’s tip and foot to the pinhole. The arrow on the ground glass is inverted, and its height is f times X divided by Z.',
    ),
    body: [
      base(),
      `<g data-part="object">${object()}</g>`,
      '<g data-part="rays"></g>',
      `<g>${carriage(8, 18)}${post(-2.2, -POSTS.half, false)}</g>`,
      frontStandard(),
      `<g data-part="rear-back">${carriage(8, 18)}${post(-1, -POSTS.half, false)}</g>`,
      '<g data-part="bellows"></g>',
      post(-2.2, POSTS.half - POSTS.d, true),
      `<g data-part="rear-front">${frame()}${post(-1, POSTS.half - POSTS.d, true)}</g>`,
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, '针孔相机设置', 'Camera settings')}">
    <div class="fx-control"><span>${t(lang, '焦距', 'Focal length')}</span>${[50, 100, 150].map((f) => `<button type="button" data-set="f" data-value="${f}">${f} mm</button>`).join('')}</div>
    <div class="fx-control"><span>${t(lang, '孔径', 'Aperture')}</span>${HOLES.map((d) => `<button type="button" data-set="d" data-value="${d}">${d} mm</button>`).join('')}</div>
  </div>
  <div class="fx-calc"><span>x = −f·X / Z =</span><b data-calc="x"></b><i>·</i><span>${t(lang, '光斑', 'blur')} D(Z+f)/Z =</span><b data-calc="blur"></b><i>·</i><span>f/D =</span><b data-calc="stop"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '悬停导轨 · 方向键', 'Hover the rail · arrow keys'),
      readout: '',
      keys: [
        { mark: 'lit', label: t(lang, '毛玻璃上的倒像', 'inverted image on the ground glass') },
        { mark: 'raised', label: t(lang, '物体：100 mm 高的箭头', 'object: an arrow 100 mm tall') },
        { mark: 'edge', label: t(lang, '细线：射向针孔的光线', 'strings: rays heading for the pinhole') },
      ],
      caption: t(
        lang,
        '沿导轨推远箭头（Z 变大）或滑动后立板（f 变化），毛玻璃上的像总是倒立，高 x = −f·X/Z：Z 加倍，像缩成一半；f 加倍，像放大一倍。换上大孔，进光按 (D/f)² 增多，但每个点在玻璃上铺成直径约 D(Z+f)/Z 的光斑，像就糊了。各方向都按 1 单位 = 4 mm 绘制，同一把尺在针孔前读 Z、在针孔后读 f。',
        'Push the arrow down the rail (Z grows) or slide the rear standard (f changes): the image on the ground glass is always inverted, with height x = −f·X/Z. Double Z and the image shrinks to half; double f and it doubles in size. Fit a larger hole and the light let in grows as (D/f)², but every point spreads into a blur disc about D(Z+f)/Z across on the glass, and the image goes soft. Everything is drawn at 1 unit = 4 mm in every direction, so the same scale reads Z in front of the pinhole and f behind it.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, '针孔相机。左右方向键移动箭头，上下方向键移动后立板，1 到 3 换孔径。', 'Pinhole camera. Left and right arrow keys move the arrow, up and down move the rear standard, and 1 to 3 change the aperture.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export const css = `
.pc-glass{fill:var(--anatomy-shade-1);stroke:none}
.pc-image{fill:var(--anatomy-lit);stroke:var(--anatomy-lit);stroke-width:.4px;stroke-linejoin:round}
`

// The sharp picture on the glass, in face coordinates (v points down, so the arrow hangs from the axis).
function imageSvg(m) {
  const tip = ARROW * U * m
  const head = (ARROW * U - 6) * m
  const arrow = path([[-1.1 * m, 0], [1.1 * m, 0], [1.1 * m, head], [3 * m, head], [0, tip], [-3 * m, head], [-1.1 * m, head]], true)
  const stem = path([[-1.3 * m, 0], [1.3 * m, 0], [1.3 * m, -POST * U * m], [-1.3 * m, -POST * U * m]], true)
  return `<path class="pc-image" d="${arrow}"/><path class="pc-image" d="${stem}" opacity=".45"/>`
}

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { object: part('object'), rays: part('rays'), slide: part('slide'), back: part('rear-back'), bellows: part('bellows'), front: part('rear-front'), image: part('image'), spread: part('spread') }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  // Tour: [Z, f, hole index, seconds to hold once arrived].
  const TOUR = [
    [300, 100, 0, 2.2],
    [600, 100, 0, 2.6],
    [300, 100, 0, 1.4],
    [300, 150, 0, 2],
    [300, 50, 0, 2],
    [300, 100, 0, 1],
    [300, 100, 2, 2.8],
    [300, 100, 1, 1.8],
  ]
  const state = { Z: 300, f: 100, hole: 0, z: 300, fx: 100, h: 0, touring: true, step: 0, dwell: 0 }
  let drawn = ''

  // The slide moves continuously between holes; D is the hole nearest the axis.
  const holeAt = (h) => HOLES[clamp(Math.round(h), 0, HOLES.length - 1)]
  const slideHeight = (h) => {
    const low = Math.min(Math.floor(h), HOLES.length - 2)
    return STOP.holes[low] + (STOP.holes[low + 1] - STOP.holes[low]) * (h - low)
  }

  function draw() {
    const v = view(state.fx, state.z, holeAt(state.h))
    const fu = state.fx * U
    const zu = -state.z * U
    const shift = k.translateAlong(P, [fu, 0, 0])
    nodes.back.setAttribute('transform', shift)
    nodes.front.setAttribute('transform', shift)
    nodes.bellows.innerHTML = bellowsSvg(fu - BOARD.x - BOARD.w)
    nodes.slide.setAttribute('transform', k.translateAlong(P, [0, 0, AXIS - slideHeight(state.h)]))
    nodes.object.setAttribute('transform', k.translateAlong(P, [zu, 0, 0]))
    // Ink for the light reaching the glass: (D/f)² spans about 1300×, so it is shown on a log scale.
    const light = clamp(0.5 + 0.5 * (1 + Math.log10(v.light) / 3.2), 0.4, 1)
    const key = v.magnification.toFixed(4)
    if (key !== drawn) {
      drawn = key
      nodes.image.innerHTML = imageSvg(v.magnification)
    }
    // A point spreads into a disc D(Z + f)/Z wide; a Gaussian of a third of that width stands in for it.
    const sigma = (v.blur * U) / 3
    nodes.spread.setAttribute('stdDeviation', sigma.toFixed(3))
    if (sigma > 0.05) nodes.image.setAttribute('filter', 'url(#pc-blur)')
    else nodes.image.removeAttribute('filter')
    nodes.image.setAttribute('opacity', light.toFixed(3))
    const pin = [0, 0, AXIS]
    const foot = [zu, 0, CAR_TOP + 2.5]
    nodes.rays.innerHTML = L(k.segment([zu, 0, AXIS + ARROW * U], pin, P) + k.segment(foot, pin, P), { tone: 'mid' }) + D([at(foot)], { size: 0.6, tone: 'hi' })
    const text = `f ${state.fx.toFixed(0)} mm · Z ${state.z.toFixed(0)} mm · ${t(lang, '像高', 'x')} ${mm(v.image)}`
    if (readout.textContent !== text) readout.textContent = text
    calc.x.textContent = `−${state.fx.toFixed(0)} × ${ARROW} / ${state.z.toFixed(0)} = ${mm(v.image)}`
    calc.blur.textContent = mm(v.blur)
    calc.stop.textContent = v.stop.toFixed(0)
  }

  function describe() {
    const v = view(state.f, state.Z, HOLES[state.hole])
    stage.setAttribute('aria-valuetext', t(lang, `物距 ${state.Z} 毫米，焦距 ${state.f} 毫米，孔径 ${HOLES[state.hole]} 毫米，像高 ${Math.abs(v.image).toFixed(1)} 毫米，倒立`, `Object distance ${state.Z} mm, focal length ${state.f} mm, aperture ${HOLES[state.hole]} mm, image height ${Math.abs(v.image).toFixed(1)} mm, inverted`))
    buttons.forEach((button) => {
      const value = Number(button.dataset.value)
      button.setAttribute('aria-pressed', String(button.dataset.set === 'f' ? value === state.f : value === HOLES[state.hole]))
    })
  }

  function tick(dt, calm) {
    if (state.touring && !calm) {
      const [Z, f, hole, hold] = TOUR[state.step]
      if (state.Z !== Z || state.f !== f || state.hole !== hole) {
        Object.assign(state, { Z, f, hole })
        describe()
      }
      if (state.z === Z && state.fx === f && state.h === hole) state.dwell += dt
      if (state.dwell > hold) {
        state.dwell = 0
        state.step = (state.step + 1) % TOUR.length
      }
    }
    state.z = follow(state.z, state.Z, dt, 0.5, calm)
    state.fx = follow(state.fx, state.f, dt, 0.4, calm)
    state.h = follow(state.h, state.hole, dt, 0.3, calm)
    if (Math.abs(state.z - state.Z) < 0.5) state.z = state.Z
    if (Math.abs(state.fx - state.f) < 0.2) state.fx = state.f
    if (Math.abs(state.h - state.hole) < 0.005) state.h = state.hole
    draw()
    return state.touring || state.z !== state.Z || state.fx !== state.f || state.h !== state.hole
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
    state.Z = clamp(state.Z, DEPTH[0], DEPTH[1])
    state.f = clamp(state.f, FOCALS[0], FOCALS[FOCALS.length - 1])
    state.hole = clamp(state.hole, 0, HOLES.length - 1)
    describe()
    idle.touch()
    loop.run()
  }
  const onPointer = (event) => {
    // Over the camera, read the pointer at the axis height: it sets f. Over the rail, it sets Z.
    const point = viewBoxPoint(svg, event)
    const [cx, cy] = floorPoint(point, AXIS, P)
    if (cx > 6 && cx < 48 && Math.abs(cy) < FRAME.half + 4) {
      steer({ f: Math.round(cx / U / 5) * 5 })
      return
    }
    const [x, y] = floorPoint(point, RAIL_TOP, P)
    if (Math.abs(y) > 34 || x < RAIL.x - 8 || x > -16) return
    steer({ Z: Math.round(-x / U / 10) * 10 })
  }
  const onKey = (event) => {
    const step = event.shiftKey ? 150 : 50
    if (event.key === 'ArrowLeft') steer({ Z: state.Z + step })
    else if (event.key === 'ArrowRight') steer({ Z: state.Z - step })
    else if (event.key === 'ArrowUp') steer({ f: state.f + 25 })
    else if (event.key === 'ArrowDown') steer({ f: state.f - 25 })
    else if (event.key === 'Home') steer({ Z: DEPTH[0] })
    else if (event.key === 'End') steer({ Z: DEPTH[1] })
    else if (['1', '2', '3'].includes(event.key)) steer({ hole: Number(event.key) - 1 })
    else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const value = Number(button.dataset.value)
    steer(button.dataset.set === 'f' ? { f: value } : { hole: HOLES.indexOf(value) })
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
