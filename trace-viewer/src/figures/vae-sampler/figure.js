import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { applyOrder, clamp, createIdle, createLoop, follow, svgNode, t } from '../common.js'
import { BINS, INPUTS, MU, PRIOR, ROWS, RUN, SIGMA, balls as runOf, edgeEps, epsOf, format, kl, reconstruction, sampleOf, shapeRing } from './model.js'

// Fig · The VAE sampler.
// A Galton board makes the noise: balls fall through seven rows of fixed pins into eight bins, so a
// ball's bin is ε ~ N(0, 1). Below the bins a fan of guide vanes carries each bin down to a sliding
// collector. The encoder sets where the collector sits (μ) and how far a lazy-tongs comb opens its
// vanes (σ), so a ball from bin ε lands at z = μ + σ·ε: the randomness stays in the pins and only the
// deterministic fan moves. The KL dial on the encoder reads how far N(μ, σ²) is from N(0, 1); in
// generate mode the fan stands straight and z = ε comes from the prior. A read head under the latest
// ball feeds z to the decoder, whose plate takes the shape decode(z).

const W = 640
const H = 390
const U = 19 // world units per unit of z
const PITCH = U * epsOf(1) - U * epsOf(0)
const BALL = 2.1
const FACE = -6 // front face of the board and the collector panel
const FRONT = FACE + 4.4 // front edge of the vanes, walls and pins
const BY = FACE + BALL + 0.25 // ball centres ride just off the face
const PIN_R = 0.7
const Z_TRAY = 9
const Z_KNEE = 40
const Z_FAN = 92
const ROW_GAP = 7
const Z_ROW = (row) => Z_FAN + 6 + (ROWS - 1 - row) * ROW_GAP
const Z_OUT = Z_ROW(0) + 8 // hopper outlet
const Z_BOARD = [45, 166]
const TONG = 18
const SLED = { x: -73, y: -13, w: 146, d: 22, r: 2 }
const PLATE = { x: -156, y: -24, w: 306, d: 70, r: 8 }
const RULER = { x: -102, y: 12, w: 204, d: 7, r: 1 }
const ENCODER = { x: -150, y: -2, w: 32, d: 42, r: 2.5 }
const DECODER = { x: 108, y: -2, w: 34, d: 34, r: 2.5 }
const BOX_TOP = 12
const KL_DIAL = [-134, 30]
const KL_R = 7.6
const KL_SPAN = Math.PI * 1.5
const KL_FULL = 2
const IN_PLATE = [-134, 10]
const OUT_PLATE = [125, 15]
const SHAPE = 9
const ROD_Y = 10.2
const HEAD_Y = 22
const SEEDS = [24, 5, 2, 7, 13, 34, 39, 3]

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [-66, -13, Z_BOARD[1] + 3], [66, -13, Z_BOARD[1] + 3]],
  W,
  H,
  { pad: 24, azimuth: 62 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))

// Parts standing on the board face are prisms along y with an outline in the (x, z) plane.
const FY = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1])
const onFace = (polygon, y0, y1) => G.prismOf(FY, polygon, y0, y1, P)
const facePath = (points, y = FACE, closed = true) => k.pathOf(points.map(([x, z]) => at([x, y, z])), closed)
const faceRect = (x0, z0, x1, z1, r, steps = 3) => k.ringOf({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps)
// A bar of width w from a to b in the face plane, running `over` past each end.
function bar([ax, az], [bx, bz], w, over = 0) {
  const length = Math.hypot(bx - ax, bz - az) || 1
  const [ux, uz] = [(bx - ax) / length, (bz - az) / length]
  const [nx, nz] = [-uz * w / 2, ux * w / 2]
  const [sx, sz] = [ax - ux * over, az - uz * over]
  const [ex, ez] = [bx + ux * over, bz + uz * over]
  return [[sx + nx, sz + nz], [ex + nx, ez + nz], [ex - nx, ez - nz], [sx - nx, sz - nz]]
}
const ball = (x, z, lit) => S(G.sphereOf([x, BY, z], BALL, P, { steps: 32 }), { tone: 'hi', lit })
const joint = (x, z, y, r = 1.15) => L(k.sideRing([x, y, z], r, 'y', P, 14), { tone: 'mid' }) + D([at([x, y, z])], { size: 0.42 })

// ---------- geometry of the fan ----------

const topX = (edge) => U * edgeEps(edge)
const kneeX = (edge, mu, sigma) => U * (mu + sigma * edgeEps(edge))
const tongRise = (sigma) => Math.sqrt(TONG * TONG - (sigma * PITCH) ** 2)
const pinX = (row, index) => (index - row / 2) * PITCH

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

  // Two rails for the collector sled, with end stops on the front one.
  for (const y of [-11, 3]) {
    out.push(S(k.slabOf({ x: -102, y: y - 2, w: 204, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: 'mid' }))
    out.push(L(k.lineOnTop([-102, y], [102, y], 3, P), { tone: 'faint' }))
  }
  for (const x of [-106, 102]) {
    out.push(S(k.slabOf({ x, y: -0.5, w: 4, d: 7, r: 1 }, 0, 6, P, 3, 0.4), { tone: 'mid' }))
    out.push(D([at([x + 2, 3, 6])], { size: 0.42 }))
  }

  // The latent rail: a ruler in z, a tick every 0.25 and a long one on each whole number.
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(-5 * U, 5 * U, U / 4, 4, RULER.y + 0.6, 0.6, [2, 3.8], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(L(k.lineOnTop([0, RULER.y + 0.6], [0, RULER.y + 5.6], 0.6, P), { tone: 'hi' }))

  // Label plate on the near edge.
  const label = { x: 58, y: 29, w: 24, d: 12, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 15], [6, 11], [9, 13]].forEach(([dy, length]) => out.push(L(k.lineOnTop([label.x + 4, label.y + dy], [label.x + 4 + length, label.y + dy], 0.8, P), { tone: 'lo', free: true })))
  out.push(D([at([label.x + label.w - 2.6, label.y + 2.6, 0.8]), at([label.x + label.w - 2.6, label.y + label.d - 2.6, 0.8])], { size: 0.42 }))
  return out.join('')
}

// The board stands on two legs bolted to its back, clear of the collector's travel.
function leg(x0) {
  const foot = { x: x0 - 3, y: -23, w: 14, d: 12, r: 1.6 }
  const post = { x: x0, y: -20, w: 8, d: 6, r: 1 }
  return S(k.slabOf(foot, 0, 4, P, 3, 0.5), { tone: 'mid' })
    + D(k.corners(foot, 2.4).map(([x, y]) => at([x, y, 4])), { size: 0.42 })
    + S(k.slabOf(post, 4, Z_BOARD[0] + 10, P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(post, Z_BOARD[0] - 6, P, 3), { tone: 'faint' }) })
    + S(k.slabOf({ x: x0, y: -14, w: 8, d: 2, r: 0.4 }, Z_BOARD[0] + 2, 12, P, 2), { tone: 'mid' })
}

// The board flares toward the bottom, where the fan needs room.
const BOARD = [[-106, Z_BOARD[0]], [106, Z_BOARD[0]], [64, Z_BOARD[1]], [-64, Z_BOARD[1]]]
function board() {
  const out = [S(onFace(BOARD, -12, FACE), { tone: 'mid' })]
  // A groove inset round the face and four screws at its corners.
  const inset = [[-100, Z_BOARD[0] + 4], [100, Z_BOARD[0] + 4], [60.5, Z_BOARD[1] - 4], [-60.5, Z_BOARD[1] - 4]]
  out.push(L(facePath(inset), { tone: 'faint' }))
  out.push(D([[-94, Z_BOARD[0] + 8], [94, Z_BOARD[0] + 8], [-56, Z_BOARD[1] - 8], [56, Z_BOARD[1] - 8]].map(([x, z]) => at([x, FACE, z])), { size: 0.45 }))
  return out.join('')
}

// A pin is a nail: a thin shank out of the face and a head at its tip.
const pinSvg = (x, z) => {
  const F = G.frameAlong([x, 0, z], [0, 1, 0])
  return S(G.disc(FACE, FRONT - 0.7, PIN_R, F, P, { steps: 14 }), { tone: 'mid', crease: 'none' }) + S(G.disc(FRONT - 0.7, FRONT, 1.25, F, P, { steps: 18 }), { tone: 'mid' })
}

function hopper() {
  const out = []
  const wall = (side) => onFace(bar([side * 3.4, Z_OUT], [side * 15, Z_OUT + 13], 1.6, 0.6), FACE, FRONT)
  out.push(S(wall(-1), { tone: 'mid' }))
  out.push(ball(-5.2, Z_OUT + 8.6), ball(0, Z_OUT + 3.4), ball(5.2, Z_OUT + 8.6))
  out.push(S(wall(1), { tone: 'mid' }))
  return out.join('')
}

function cap() {
  const plan = { x: -67, y: -13.5, w: 134, d: 9, r: 1.2 }
  return S(k.slabOf(plan, Z_BOARD[1], 3, P, 3, 0.6), { tone: 'mid' })
    + D([-60, 0, 60].map((x) => at([x, -9, Z_BOARD[1] + 3])), { size: 0.45 })
}

// The collector: sled on the rails, a panel the columns stand against, and a tray ledge. Built at
// μ = 0 and slid along x.
function collector() {
  const out = [S(k.slabOf(SLED, 3, 4, P, 3, 0.6), { tone: 'mid' })]
  out.push(D([[-67, -10], [67, -10], [-67, 5], [67, 5]].map(([x, y]) => at([x, y, 7])), { size: 0.45 }))
  const panel = { x: -70, y: -12, w: 140, d: 6, r: 0.8 }
  out.push(S(k.slabOf(panel, 7, Z_KNEE + 3 - 7, P, 2, 0.5), { tone: 'mid' }))
  // The slot the knees run in, and the fixed centre pivot.
  out.push(L(facePath(faceRect(-67, Z_KNEE - 1.3, 67, Z_KNEE + 1.3, 1.3, 3)), { tone: 'lo' }))
  out.push(S(k.slabOf({ x: -70, y: FACE, w: 140, d: FRONT - FACE, r: 0.6 }, 7, Z_TRAY - 7, P, 2, 0.4), { tone: 'mid' }))
  out.push(L(facePath(faceRect(-66, 13, -57, 32, 1.5, 2)), { tone: 'faint' }), L(facePath(faceRect(57, 13, 66, 32, 1.5, 2)), { tone: 'faint' }))
  return out.join('')
}

// Parts of the collector that sit in front of the stacked balls.
function collectorFront() {
  const out = [S(k.slabOf({ x: -70, y: FRONT - 0.9, w: 140, d: 0.9, r: 0.3 }, Z_TRAY, 1.5, P, 2), { tone: 'mid', crease: 'none' })]
  out.push(D([-66, -33, 33, 66].map((x) => at([x, FRONT - 0.45, Z_TRAY + 1.5])), { size: 0.4 }))
  // μ index over the ruler and the lug the encoder's push rod lands on.
  const tab = { x: -2.5, y: 9, w: 5, d: 5.4, r: 0.8 }
  out.push(S(k.slabOf(tab, 3, 1.2, P, 2), { tone: 'mid' }))
  out.push(L(k.lineOnTop([0, 9.6], [0, 14.4], 4.2, P), { tone: 'hi' }))
  out.push(S(k.slabOf({ x: -73, y: 9, w: 7, d: 3.4, r: 0.6 }, 3, 4.4, P, 2, 0.4), { tone: 'mid' }))
  return out.join('')
}

function encoder() {
  const out = [S(k.slabOf(ENCODER, 0, BOX_TOP, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(ENCODER, 3, P, 4), { tone: 'faint' }) })]
  out.push(D(k.corners(ENCODER, 2.6).map(([x, y]) => at([x, y, BOX_TOP])), { size: 0.45 }))
  // Input bay: a recess the input plate sits in.
  const bay = { x: IN_PLATE[0] - 12, y: IN_PLATE[1] - 12, w: 24, d: 24, r: 2 }
  out.push(L(k.planOutline(bay, BOX_TOP, P, 3), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(bay, 1.4), BOX_TOP, P, 3), { tone: 'faint' }))
  // KL dial: puck, knurled bezel, scale from 0 to 2 nats.
  const [x, y] = KL_DIAL
  const top = BOX_TOP + 4
  out.push(S(k.cylinder(x, y, KL_R + 1.4, BOX_TOP, 1.4, P, 48), { tone: 'lo' }))
  out.push(S(k.cylinder(x, y, KL_R, BOX_TOP + 1.4, top - BOX_TOP - 1.4, P, 48, 0.6), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.knurl(x, y, KL_R, top - 1.8, top, 48, P, 0.3), { tone: 'lo' }))
  out.push(L(k.ring(x, y, KL_R - 1.3, top, P, 48), { tone: 'lo' }))
  const ticks = k.radialTicks(x, y, KL_R - 1.6, 20, 5, top, [0.9, 1.9], P, -KL_SPAN / 2, KL_SPAN)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(L(k.lineOnTop([x - Math.sin(-KL_SPAN / 2) * (KL_R - 1.6), y + Math.cos(-KL_SPAN / 2) * (KL_R - 1.6)], [x - Math.sin(-KL_SPAN / 2) * (KL_R - 4), y + Math.cos(-KL_SPAN / 2) * (KL_R - 4)], top, P), { tone: 'hi' }))
  return out.join('')
}

const KL_TOP = BOX_TOP + 4
const klNeedle = (value) => {
  const angle = -KL_SPAN / 2 + (clamp(value, 0, KL_FULL) / KL_FULL) * KL_SPAN
  const [x, y] = KL_DIAL
  return k.lineOnTop([x - Math.sin(angle) * 1.6, y + Math.cos(angle) * 1.6], [x + Math.sin(angle) * (KL_R - 2.2), y - Math.cos(angle) * (KL_R - 2.2)], KL_TOP + 0.2, P)
}

function decoder() {
  const out = [S(k.slabOf(DECODER, 0, BOX_TOP, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(DECODER, 3, P, 4), { tone: 'faint' }) })]
  out.push(D(k.corners(DECODER, 2.6).map(([x, y]) => at([x, y, BOX_TOP])), { size: 0.45 }))
  const stage = { x: OUT_PLATE[0] - 13, y: OUT_PLATE[1] - 13, w: 26, d: 26, r: 2 }
  out.push(L(k.planOutline(stage, BOX_TOP, P, 3), { tone: 'lo' }))
  // Vent slots on the front face.
  out.push(L([0, 1, 2].map((index) => facePath(faceRect(DECODER.x + 8 + index * 7, 3.4, DECODER.x + 12 + index * 7, 8.6, 1.2, 2), DECODER.y + DECODER.d)).join(''), { tone: 'lo' }))
  return out.join('')
}

const shapePlate = (z, [cx, cy], tone, lit = false) =>
  S(k.extrude(shapeRing(z, cx, cy, SHAPE), BOX_TOP, 1.6, P, { convex: false }), { tone, lit, crease: tone === 'hi' ? 'lo' : 'faint' })

// ---------- the live figure ----------

export const meta = { id: 'vae-sampler', fig: 'Fig 15.1', title: 'VAE 采样机', titleEn: 'VAE sampler' }

export function render({ lang = 'zh' } = {}) {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      'VAE 采样机。小球从顶部漏斗落下，穿过七排固定的钉子落进八个格子，格子位置就是标准正态噪声 ε。格子下方的一排导流片把每个格子引向下方滑动的收集槽：收集槽的位置是 μ，剪式伸缩架张开的程度是 σ，所以小球落在 z = μ + σ·ε。编码器上的表盘读出 KL 散度，前方读头跟随最新的小球，把 z 送进解码器，解码器顶上的板变成对应形状。',
      'A VAE sampler. Balls drop from a hopper at the top, bounce through seven rows of fixed pins and land in eight bins; the bin a ball lands in is a draw of standard normal noise ε. A row of guide vanes below the bins steers each bin into a sliding collector underneath: the collector’s position is μ and the spread of the scissor linkage is σ, so each ball lands at z = μ + σ·ε. A dial on the encoder reads the KL divergence, and a read head in front follows the newest ball and feeds its z to the decoder, whose top plate takes on the matching shape.',
    ),
    body: [
      `<defs><clipPath id="vae-drain"><path d="${k.pathOf([at([-400, BY, Z_TRAY]), at([400, BY, Z_TRAY]), at([400, BY, 400]), at([-400, BY, 400])], true)}"/></clipPath></defs>`,
      base(),
      leg(-92),
      leg(84),
      board(),
      '<g data-part="pins"></g>',
      hopper(),
      `<g data-part="collector">${collector()}</g>`,
      '<g data-part="channels"></g>',
      encoder(),
      '<g data-part="rod"></g>',
      `<g data-part="collector-front">${collectorFront()}</g>`,
      '<g data-part="tongs"></g>',
      cap(),
      '<g data-part="input"></g>',
      `<path data-part="kl-needle" class="iso-line" data-tone="hi" data-free="start" style="stroke-width:1" d=""/>`,
      D([at([KL_DIAL[0], KL_DIAL[1], KL_TOP + 0.2])], { size: 0.6, tone: 'hi' }),
      '<g data-part="head"></g>',
      decoder(),
      '<g data-part="output"></g>',
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, 'VAE 采样设置', 'VAE sampler settings')}">
    <div class="fx-control"><span>${t(lang, '输入 x', 'Input x')}</span>${Object.entries(INPUTS).map(([id, input]) => `<button type="button" data-set="input" data-value="${id}">${t(lang, input.name, input.nameEn)}</button>`).join('')}</div>
    <div class="fx-control"><span>${t(lang, '模式', 'Mode')}</span><button type="button" data-set="mode" data-value="encode">${t(lang, '编码', 'Encode')}</button><button type="button" data-set="mode" data-value="generate">${t(lang, '从先验生成', 'From prior')}</button></div>
    <div class="fx-control"><span>${t(lang, '小球', 'Balls')}</span><button type="button" data-set="drop" data-value="1">${t(lang, '放一颗 ›', 'Drop one ›')}</button><button type="button" data-set="empty" data-value="1">${t(lang, '清空', 'Clear')}</button></div>
  </div>
  <div class="fx-calc"><span>z = μ + σ·ε =</span><b data-calc="z"></b><i>·</i><span>KL = ½(μ² + σ² − 1 − ln σ²) =</span><b data-calc="kl"></b><i>·</i><span>${t(lang, '重建', 'Recon.')} E‖x̂ − x‖² =</span><b data-calc="rec"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '方向键 · G 生成', 'Arrow keys · G: generate'),
      readout: '',
      keys: [
        { mark: 'lit', label: t(lang, '最新的小球与它的解码结果', 'newest ball and its decoded output') },
        { mark: 'raised', label: t(lang, '钉板：噪声 ε ~ N(0, 1)', 'pin board: noise ε ~ N(0, 1)') },
        { mark: 'flat', label: t(lang, '导流片：z = μ + σ·ε', 'guide vanes: z = μ + σ·ε') },
      ],
      caption: t(
        lang,
        '钉子固定不动，随机性全在 ε：小球落进哪一格就是一次 ε ~ N(0, 1)。编码器只决定收集槽停在 μ、剪式架张开到 σ，于是同一批 ε 被确定地搬到 z = μ + σ·ε；拨动 μ 或 σ，已落下的小球跟着平移和伸缩，这正是重参数化让梯度能穿过采样的原因。σ 越小重建越准但 KL 越大；切到“从先验生成”时导流片竖直，z 直接取自 N(0, 1)，不需要输入图像。',
        'The pins never move; all the randomness lives in ε: the bin a ball falls into is one draw of ε ~ N(0, 1). The encoder only decides where the collector stops (μ) and how far the scissor linkage opens (σ), so the same batch of ε is carried deterministically to z = μ + σ·ε. Nudge μ or σ and the balls already landed shift and stretch with it — exactly why the reparameterisation trick lets gradients pass through the sampling step. A smaller σ gives a sharper reconstruction but a larger KL. Switch to “From prior” and the vanes stand straight: z comes directly from N(0, 1), with no input image needed.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, 'VAE 采样机。左右方向键改变 μ，上下方向键改变 σ，空格放一颗球，G 切换从先验生成，1 到 3 选择输入。', 'VAE sampler. Left and right arrows change μ, up and down arrows change σ, Space drops a ball, G toggles generating from the prior, and 1 to 3 pick the input.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = {
    pins: part('pins'),
    channels: part('channels'),
    collector: part('collector'),
    front: part('collector-front'),
    tongs: part('tongs'),
    rod: part('rod'),
    input: part('input'),
    needle: part('kl-needle'),
    head: part('head'),
    output: part('output'),
  }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const state = {
    input: 'diamond',
    mode: 'encode',
    mu: INPUTS.diamond.mu,
    sigma: INPUTS.diamond.sigma,
    target: { mu: INPUTS.diamond.mu, sigma: INPUTS.diamond.sigma },
    klShown: kl(INPUTS.diamond.mu, INPUTS.diamond.sigma),
    run: 0,
    script: [],
    released: 0,
    balls: [],
    clock: 0,
    nextDrop: 0.4,
    drain: -1,
    latest: null,
    touring: true,
    tourClock: 0,
    tourStep: 0,
    drawn: '',
  }

  // Pins are fixed nodes; balls in the pin field are sorted in among them by depth.
  const pins = []
  for (let row = 0; row < ROWS; row++) {
    for (let index = 0; index <= row; index++) {
      const x = pinX(row, index)
      const z = Z_ROW(row)
      pins.push({ node: svgNode(pinSvg(x, z)), key: k.depthOf([x, -3, z], P) })
    }
  }
  const edges = Array.from({ length: BINS + 1 }, () => svgNode(''))

  function newRun() {
    state.script = runOf(SEEDS[state.run % SEEDS.length])
    state.released = 0
    state.balls = []
    state.drain = -1
    state.latest = null
  }

  function release() {
    if (state.released >= RUN || state.drain >= 0) return
    const { turns, bin } = state.script[state.released]
    const slot = state.balls.filter((other) => other.bin === bin).length
    const item = { turns, bin, slot, age: 0, node: svgNode(''), drawn: '', id: state.released }
    item.node.setAttribute('clip-path', 'url(#vae-drain)')
    state.balls.push(item)
    state.latest = item
    state.released += 1
  }

  // Where a ball is: in the pins (x, z), or in a channel (fan or column) for the current μ, σ.
  const T_IN = 0.22
  const T_ROW = 0.17
  const T_FAN = 0.5
  const T_FALL = 0.32
  function placeOf(item) {
    const { mu, sigma } = state
    let age = item.age
    if (age < T_IN) return { where: 'pins', x: 0, z: Z_OUT - 1 - (Z_OUT - 1 - (Z_ROW(0) + PIN_R + BALL)) * (age / T_IN) ** 2 }
    age -= T_IN
    let index = 0
    for (let row = 0; row < ROWS; row++) {
      if (age < T_ROW) {
        const t = age / T_ROW
        const from = [pinX(row, index), Z_ROW(row) + PIN_R + BALL]
        const next = index + item.turns[row]
        const to = row + 1 < ROWS ? [pinX(row + 1, next), Z_ROW(row + 1) + PIN_R + BALL] : [U * epsOf(next), Z_FAN]
        const hop = 2.6 * Math.sin(Math.PI * t)
        return { where: 'pins', x: from[0] + (to[0] - from[0]) * t, z: from[1] + (to[1] - from[1]) * t * t + hop * (1 - t) }
      }
      age -= T_ROW
      index += item.turns[row]
    }
    const top = U * epsOf(item.bin)
    const knee = U * sampleOf(mu, sigma, item.bin)
    if (age < T_FAN) {
      const t = (age / T_FAN) ** 1.3
      return { where: 'fan', x: top + (knee - top) * t, z: Z_FAN + (Z_KNEE - Z_FAN) * t }
    }
    age -= T_FAN
    const rest = Z_TRAY + BALL + item.slot * BALL * 2
    const t = Math.min(1, age / T_FALL)
    let z = Z_KNEE + (rest - Z_KNEE) * t * t
    if (state.drain >= 0) z -= 60 * state.drain * state.drain
    return { where: 'column', x: knee, z, landed: t >= 1 }
  }

  function drawFan() {
    const { mu, sigma } = state
    const rise = tongRise(sigma)
    // Vanes and column walls, one node per edge so balls can sit between them.
    for (let edge = 0; edge <= BINS; edge++) {
      const top = topX(edge)
      const knee = kneeX(edge, mu, sigma)
      // Below the knee the columns are split by thin rods, so the stacks stay in view.
      edges[edge].innerHTML = S(k.cylinder(knee, BY, 0.55, Z_TRAY, Z_KNEE - Z_TRAY, P, 12), { tone: 'mid', crease: 'none' })
        + S(onFace(bar([top, Z_FAN], [knee, Z_KNEE], 1, 0.4), FACE, FRONT), { tone: 'mid', crease: 'none' })
        + joint(top, Z_FAN, FRONT, 0.75)
    }
    // Lazy tongs: back bars, front bars, then joints. The far-right bar runs on as the σ lever.
    const knees = Array.from({ length: BINS + 1 }, (_, edge) => kneeX(edge, mu, sigma))
    const back = []
    const front = []
    for (let cell = 0; cell < BINS; cell++) {
      back.push(S(onFace(bar([knees[cell], Z_KNEE + rise], [knees[cell + 1], Z_KNEE], 1.4, 1), FRONT + 0.3, FRONT + 1.1), { tone: 'mid', crease: 'none' }))
      const lever = cell === BINS - 1
      const end = lever ? [knees[cell + 1] + (sigma * PITCH) * 0.9, Z_KNEE + rise * 1.9] : [knees[cell + 1], Z_KNEE + rise]
      front.push(S(onFace(bar([knees[cell], Z_KNEE], end, 1.4, 1), FRONT + 1.1, FRONT + 1.9), { tone: 'mid', crease: 'none' }))
    }
    const joints = []
    knees.forEach((x, edge) => {
      joints.push(joint(x, Z_KNEE, FRONT + 1.9), joint(x, Z_KNEE + rise, FRONT + 1.9))
      if (edge < BINS) joints.push(joint((x + knees[edge + 1]) / 2, Z_KNEE + rise / 2, FRONT + 1.9, 0.9))
    })
    const grip = [knees[BINS] + sigma * PITCH * 0.9, Z_KNEE + rise * 1.9]
    const boss = S(onFace(faceRect(U * mu - 3, Z_KNEE - 3, U * mu + 3, Z_KNEE + 3, 1.2, 2), FACE, FRONT + 0.3), { tone: 'mid' })
    nodes.tongs.innerHTML = boss + back.join('') + front.join('') + joints.join('')
      + S(G.sphereOf([grip[0], FRONT + 1.5, grip[1]], 1.9, P, { steps: 24 }), { tone: 'mid' })
    nodes.collector.setAttribute('transform', k.translateAlong(P, [U * mu, 0, 0]))
    nodes.front.setAttribute('transform', k.translateAlong(P, [U * mu, 0, 0]))
    // Push rod from the encoder face to the sled's lug.
    const rodEnd = U * mu + SLED.x
    nodes.rod.innerHTML = S(G.disc(ENCODER.x + ENCODER.w, rodEnd, 0.9, G.frameAlong([0, ROD_Y, 5.2], [1, 0, 0]), P, { steps: 14 }), { tone: 'mid' })
  }

  function drawBalls() {
    const inPins = []
    const lanes = Array.from({ length: BINS }, () => [])
    for (const item of state.balls) {
      const place = placeOf(item)
      item.place = place
      const lit = item === state.latest
      const key = `${place.x.toFixed(2)}|${place.z.toFixed(2)}|${lit}`
      if (key !== item.drawn) {
        item.drawn = key
        item.node.innerHTML = place.z < -4 ? '' : ball(place.x, place.z, lit)
      }
      if (place.where === 'pins') inPins.push({ node: item.node, key: k.depthOf([place.x, BY, place.z], P) })
      else lanes[item.bin].push(item)
    }
    const pinOrder = [...pins, ...inPins].sort((a, b) => a.key - b.key).map((entry) => entry.node)
    applyOrder(nodes.pins, pinOrder)
    const order = [edges[0]]
    lanes.forEach((lane, bin) => {
      lane.sort((a, b) => a.place.z - b.place.z).forEach((item) => order.push(item.node))
      order.push(edges[bin + 1])
    })
    applyOrder(nodes.channels, order)
  }

  function drawFront() {
    const { mu, sigma } = state
    const encode = state.mode === 'encode'
    nodes.input.innerHTML = encode ? shapePlate(INPUTS[state.input].mu, IN_PLATE, 'mid') : ''
    nodes.needle.setAttribute('d', klNeedle(state.klShown))
    // The read head sits under the latest ball's z; its rod runs into the decoder.
    const latest = state.latest
    const z = latest ? sampleOf(mu, sigma, latest.bin) : mu
    const x = clamp(U * z, RULER.x + 3, RULER.x + RULER.w - 3)
    const head = { x: x - 3.2, y: RULER.y + RULER.d + 0.4, w: 6.4, d: 6, r: 1 }
    nodes.head.innerHTML = S(k.slabOf(head, 0, 3.4, P, 2, 0.4), { tone: 'hi', crease: 'lo' })
      + L(k.lineOnTop([x, head.y], [x, head.y + 3], 3.4, P), { tone: 'hi' })
      + S(G.disc(x + 3.2, DECODER.x, 0.8, G.frameAlong([0, HEAD_Y, 2], [1, 0, 0]), P, { steps: 14 }), { tone: 'mid' })
    const out = latest ? z : null
    const target = encode ? L(k.onTop(shapeRing(INPUTS[state.input].mu, OUT_PLATE[0], OUT_PLATE[1], SHAPE), BOX_TOP, P, true), { tone: 'lo' }) : ''
    nodes.output.innerHTML = target + (out === null ? '' : shapePlate(out, OUT_PLATE, 'hi', true))
  }

  function say() {
    const { mu, sigma } = state
    const value = kl(mu, sigma)
    const text = state.mode === 'generate' && Math.abs(mu) < 0.01 && Math.abs(sigma - 1) < 0.01
      ? `${t(lang, '从先验生成', 'From prior')} · z = ε · KL ${format(value)}`
      : `μ ${format(mu)} · σ ${format(sigma)} · KL ${format(value)}`
    if (readout.textContent !== text) readout.textContent = text
    const latest = state.latest
    calc.z.textContent = latest
      ? `${format(mu)} + ${format(sigma)} × ${format(epsOf(latest.bin))} = ${format(sampleOf(mu, sigma, latest.bin))}`
      : '…'
    calc.kl.textContent = format(value)
    calc.rec.textContent = state.mode === 'encode' ? format(reconstruction(mu, sigma, INPUTS[state.input].mu) * SHAPE * SHAPE) : t(lang, '无输入', 'no input')
  }

  function describe() {
    const goal = state.target
    stage.setAttribute('aria-valuetext', state.mode === 'generate'
      ? t(lang, '从先验生成：μ = 0，σ = 1，KL = 0', 'Generating from the prior: μ = 0, σ = 1, KL = 0')
      : t(
        lang,
        `输入${INPUTS[state.input].name}：μ ${format(goal.mu)}，σ ${format(goal.sigma)}，KL ${format(kl(goal.mu, goal.sigma))}`,
        `Input ${INPUTS[state.input].nameEn.toLowerCase()}: μ ${format(goal.mu)}, σ ${format(goal.sigma)}, KL ${format(kl(goal.mu, goal.sigma))}`,
      ))
    buttons.forEach((button) => {
      const { set, value } = button.dataset
      if (set === 'input') button.setAttribute('aria-pressed', String(state.mode === 'encode' && value === state.input))
      if (set === 'mode') button.setAttribute('aria-pressed', String(value === state.mode))
    })
  }

  function setInput(id) {
    state.input = id
    state.mode = 'encode'
    state.target = { mu: INPUTS[id].mu, sigma: INPUTS[id].sigma }
    describe()
  }
  function setMode(mode) {
    state.mode = mode
    state.target = mode === 'generate' ? { ...PRIOR } : { mu: INPUTS[state.input].mu, sigma: INPUTS[state.input].sigma }
    describe()
  }
  function nudge(dmu, dsigma) {
    // During the tour, step from what the reader sees rather than from the tour's target.
    const from = state.touring ? { mu: state.mu, sigma: state.sigma } : state.target
    state.mode = 'encode'
    state.target = {
      mu: clamp(Math.round((from.mu + dmu) * 100) / 100, MU[0], MU[1]),
      sigma: clamp(Math.round((from.sigma + dsigma) * 100) / 100, SIGMA[0], SIGMA[1]),
    }
    describe()
  }
  function empty() {
    if (state.balls.length && state.drain < 0) state.drain = 0
  }

  // Tour: diamond, square, generate, circle; balls keep falling throughout.
  const TOUR = [
    [8, () => setInput('diamond')],
    [7, () => setInput('square')],
    [8, () => setMode('generate')],
    [7, () => setInput('circle')],
  ]

  function tick(dt, calm) {
    let moving = false
    if (state.touring && !calm) {
      state.tourClock += dt
      if (state.tourClock > TOUR[state.tourStep][0]) {
        state.tourClock = 0
        state.tourStep = (state.tourStep + 1) % TOUR.length
        TOUR[state.tourStep][1]()
      }
      state.nextDrop -= dt
      if (state.nextDrop <= 0) {
        state.nextDrop = 0.55
        if (state.released < RUN) release()
      }
      moving = true
    }
    const before = `${state.mu}|${state.sigma}`
    state.mu = follow(state.mu, state.target.mu, dt, 0.35, calm)
    state.sigma = follow(state.sigma, state.target.sigma, dt, 0.35, calm)
    if (Math.abs(state.mu - state.target.mu) < 2e-3) state.mu = state.target.mu
    if (Math.abs(state.sigma - state.target.sigma) < 2e-3) state.sigma = state.target.sigma
    state.klShown = follow(state.klShown, kl(state.mu, state.sigma), dt, 0.18, calm)
    if (Math.abs(state.klShown - kl(state.mu, state.sigma)) < 2e-3) state.klShown = kl(state.mu, state.sigma)
    moving = moving || `${state.mu}|${state.sigma}` !== before || state.klShown !== kl(state.mu, state.sigma)

    for (const item of state.balls) {
      const done = item.place?.landed
      if (!done || calm) item.age += calm ? 99 : dt
      if (!done) moving = true
    }
    if (state.drain >= 0) {
      state.drain += calm ? 9 : dt
      moving = true
      if (state.drain > 1.1) {
        state.run += 1
        newRun()
        state.nextDrop = 0.6
      }
    } else if (state.released >= RUN && state.balls.every((item) => item.place?.landed)) {
      // A full run rests a while, then the tray drains and the next run starts.
      state.clock += dt
      if (state.touring && !calm && state.clock > 2.6) {
        state.clock = 0
        empty()
      }
    }

    const fan = `${state.mu.toFixed(4)}|${state.sigma.toFixed(4)}`
    if (fan !== state.drawn) {
      state.drawn = fan
      drawFan()
    }
    drawBalls()
    drawFront()
    say()
    return moving
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.tourClock = 0
    loop.run()
  }, 6000)
  const byHand = () => {
    state.touring = false
    idle.touch()
    loop.run()
  }
  const onKey = (event) => {
    const fine = event.shiftKey ? 2 : 1
    if (event.key === 'ArrowLeft') nudge(-0.1 * fine, 0)
    else if (event.key === 'ArrowRight') nudge(0.1 * fine, 0)
    else if (event.key === 'ArrowUp') nudge(0, 0.05 * fine)
    else if (event.key === 'ArrowDown') nudge(0, -0.05 * fine)
    else if (event.key === ' ' || event.key === 'Enter') dropByHand()
    else if (event.key === 'g' || event.key === 'G') setMode(state.mode === 'generate' ? 'encode' : 'generate')
    else if (['1', '2', '3'].includes(event.key)) setInput(Object.keys(INPUTS)[Number(event.key) - 1])
    else if (event.key === 'r' || event.key === 'R') empty()
    else return
    event.preventDefault()
    byHand()
  }
  function dropByHand() {
    if (state.drain >= 0) return
    if (state.released >= RUN) {
      empty()
      return
    }
    release()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const { set, value } = button.dataset
    if (set === 'input') setInput(value)
    else if (set === 'mode') setMode(value)
    else if (set === 'drop') dropByHand()
    else if (set === 'empty') empty()
    byHand()
  }
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  newRun()
  describe()
  if (loop.still.matches) {
    // Reduced motion: a full run already landed for the diamond input.
    state.touring = false
    while (state.released < RUN) release()
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
