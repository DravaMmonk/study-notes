import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, follow, t } from '../common.js'
import { N, PROBE, STEPS, TAU, angleOf, train } from './model.js'

// Fig · The contrastive board.
// Embeddings are normalised, so they live on a circle: a turntable with two concentric tracks. Carriages
// on the outer track are first views (or images), carriages on the inner track second views (or
// captions); the same angle on both tracks is the same direction in the shared space. A coil spring
// joins each true pair. Every turn of the crank is one gradient step on the contrastive loss: pairs
// swing together, different images spread apart, a dial reads the loss, and a 4 × 4 board of pegs shows
// each row's softmax over the candidates, whose diagonal rises toward 1. In CLIP mode a new photo rides
// the outer track and a dotted feeler finds its nearest caption: zero-shot classification.

const W = 640
const H = 390
const PLATE_TOP = 16
const R_PLATE = 64
const R_OUT = 53
const R_IN = 35
const PIN = 6.5
const BASE = { x: -76, y: -126, w: 170, d: 196, r: 8 }
const PEGS = { x: -26, y: -119, pitch: 11 } // board corner; rows along +x, candidates along +y
const PEG_TOP = 6
const PEG_SCALE = 24
const DIAL = [60, -62]
const DIAL_R = 13
const DIAL_Z = 20
const DIAL_TOP = DIAL_Z + 5
const DIAL_SPAN = Math.PI * 1.5
const LOSS_FULL = 2
const CRANK = { x: 82, y: 30, z: 20 }
const STEP_EVERY = 0.55
const HOLD = { simclr: 2.6, clip: 4.2 }

const P = k.fitProjection(
  [...k.boxCorners(BASE, -17, 0), [0, -R_PLATE, PLATE_TOP + PIN + 4], [-R_PLATE, 0, PLATE_TOP + PIN + 4], [PEGS.x, PEGS.y, PEG_TOP + PEG_SCALE + 2], [DIAL[0], DIAL[1], DIAL_TOP + 1]],
  W,
  H,
  { pad: 24, azimuth: 36, elevation: 38 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const floorDepth = (x, y) => k.depthOf([x, y, 0], P)
const onTrack = (radius, angle) => [radius * Math.cos(angle), radius * Math.sin(angle)]
const pegAt = (row, col) => [PEGS.x + 6 + row * PEGS.pitch, PEGS.y + 6 + col * PEGS.pitch]
const lerpAngle = (a, b, t) => {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(BASE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(BASE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(BASE, 10)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
  // Label plate at the near right corner.
  const label = { x: 62, y: -114, w: 20, d: 20, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 13], [7, 9], [11, 11]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 2 + dx, label.y + 4], [label.x + 2 + dx, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

// The mini-batch: four source photos standing in a rack, each marked with its pips.
function batchRack() {
  const rack = { x: 44, y: 46, w: 30, d: 20, r: 2 }
  const out = [S(k.slabOf(rack, 0, 2.4, P, 3, 0.5), { tone: 'mid' })]
  for (let index = 0; index < N; index++) {
    const x = rack.x + 4 + index * 6.4
    out.push(L(k.planOutline({ x: x - 1.1, y: rack.y + 2, w: 2.2, d: rack.d - 4, r: 0.6 }, 2.4, P, 2), { tone: 'lo' }))
    const card = { x: x - 0.4, y: rack.y + 2.6, w: 0.8, d: rack.d - 5.2, r: 0.2 }
    out.push(S(k.slabOf(card, 2.4, 12, P, 1), { tone: 'hi', crease: 'lo' }))
    const face = card.x + card.w
    const frame = [[face, card.y + 1.6, 6], [face, card.y + card.d - 1.6, 6], [face, card.y + card.d - 1.6, 12.8], [face, card.y + 1.6, 12.8]]
    out.push(L(k.pathOf(frame.map(at), true), { tone: 'lo' }))
    const dots = []
    for (let pip = 0; pip <= index; pip++) dots.push(at([face, card.y + card.d / 2 + (pip - index / 2) * 1.6, 4.2]))
    out.push(D(dots, { size: 0.45, tone: 'hi' }))
  }
  return out.join('')
}

// The turntable: pedestal, plate with a degree bezel, two tracks and a hub.
function table() {
  const out = []
  out.push(S(k.cylinder(0, 0, 30, 0, 3, P, 64, 0.6), { tone: 'mid' }))
  out.push(D(k.circleRing(0, 0, 26.5, 8).map(([x, y]) => at([x, y, 3])), { size: 0.45 }))
  out.push(S(k.cylinder(0, 0, 22, 3, PLATE_TOP - 6 - 3, P, 64), { tone: 'mid', inner: L(k.sideArc(0, 0, 22, 6, P, 40), { tone: 'faint' }) }))
  out.push(S(k.cylinder(0, 0, R_PLATE, PLATE_TOP - 6, 6, P, 120, 1), { tone: 'mid', inner: L(k.sideArc(0, 0, R_PLATE, PLATE_TOP - 2.2, P, 80), { tone: 'faint' }) }))
  const ticks = k.radialTicks(0, 0, R_PLATE - 1.4, 72, 6, PLATE_TOP, [1.4, 2.8], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(L(k.ring(0, 0, R_PLATE - 1.4, PLATE_TOP, P, 120), { tone: 'lo' }), L(k.ring(0, 0, R_PLATE - 4.6, PLATE_TOP, P, 120), { tone: 'faint' }))
  for (const r of [R_OUT, R_IN]) {
    out.push(`<path class="cb-groove" d="${k.cylinder(0, 0, r + 2.6, PLATE_TOP, 0, P, 120).top}"/>`)
    out.push(`<path class="iso-top" d="${k.cylinder(0, 0, r - 2.6, PLATE_TOP, 0, P, 120).top}"/>`)
    out.push(L(k.ring(0, 0, r + 2.6, PLATE_TOP, P, 120) + k.ring(0, 0, r - 2.6, PLATE_TOP, P, 120), { tone: 'lo' }))
  }
  // Engraved compass on the centre field: a ring and four spokes from the hub to the inner track.
  const spokes = [0, 1, 2, 3].map((q) => k.lineOnTop(onTrack(8, (q * Math.PI) / 2), onTrack(R_IN - 2.6, (q * Math.PI) / 2), PLATE_TOP, P)).join('')
  out.push(L(spokes + k.ring(0, 0, 20, PLATE_TOP, P, 64), { tone: 'faint' }))
  out.push(L(k.ring(0, 0, (R_OUT + R_IN) / 2, PLATE_TOP, P, 96), { tone: 'faint' }))
  out.push(S(k.cylinder(0, 0, 8, PLATE_TOP, 1.4, P, 40, 0.5), { tone: 'mid' }))
  out.push(S(k.cylinder(0, 0, 3.4, PLATE_TOP + 1.4, 1.2, P, 24), { tone: 'mid' }))
  out.push(D(k.circleRing(0, 0, 5.8, 4).map(([x, y]) => at([x, y, PLATE_TOP + 1.4])), { size: 0.42 }))
  return out.join('')
}

// The candidate board: a 4 × 4 grid of sockets, pips along two edges naming rows and candidates.
function pegBoard() {
  const board = { x: PEGS.x, y: PEGS.y, w: PEGS.pitch * 4 + 1, d: PEGS.pitch * 4 + 1, r: 2 }
  const out = [S(k.slabOf(board, 0, PEG_TOP, P, 4, 0.6), { tone: 'mid', inner: L(k.sideSeam(board, 2.4, P, 4), { tone: 'faint' }) })]
  const sockets = []
  for (let row = 0; row < N; row++) for (let col = 0; col < N; col++) sockets.push(k.ring(...pegAt(row, col), 2.5, PEG_TOP, P, 16))
  out.push(L(sockets.join(''), { tone: 'faint' }))
  out.push(L(k.planOutline(k.insetPlan(board, 1.6), PEG_TOP, P, 3), { tone: 'lo' }))
  return out.join('')
}

const pips = (x, y, z, count, along) => {
  const points = []
  for (let index = 0; index < count; index++) {
    const offset = (index - (count - 1) / 2) * 1.5
    points.push(at([x + along[0] * offset, y + along[1] * offset, z]))
  }
  return D(points, { size: 0.45, tone: 'hi' })
}

function dialArt() {
  const [x, y] = DIAL
  const out = []
  out.push(S(k.slabOf({ x: x - 7, y: y - 7, w: 14, d: 14, r: 1.6 }, 0, 3, P, 3, 0.5), { tone: 'mid' }))
  out.push(S(k.cylinder(x, y, 2.8, 3, DIAL_Z - 3, P, 18), { tone: 'mid', crease: 'none', inner: L(k.sideArc(x, y, 2.8, 10, P, 12), { tone: 'faint' }) }))
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_TOP - DIAL_Z, P, 60, 0.8), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 2.4, DIAL_TOP, 64, P, 0.3), { tone: 'lo' }))
  out.push(L(k.ring(x, y, DIAL_R - 1.8, DIAL_TOP, P, 56), { tone: 'lo' }))
  const ticks = k.radialTicks(x, y, DIAL_R - 1.8, 20, 5, DIAL_TOP, [1, 2.2], P, -DIAL_SPAN / 2, DIAL_SPAN)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  // A red-line tick at log 4: the loss of a blind guess among four candidates.
  const guess = -DIAL_SPAN / 2 + (Math.log(N) / LOSS_FULL) * DIAL_SPAN
  out.push(L(k.lineOnTop([x + Math.sin(guess) * (DIAL_R - 1.8), y - Math.cos(guess) * (DIAL_R - 1.8)], [x + Math.sin(guess) * (DIAL_R - 5), y - Math.cos(guess) * (DIAL_R - 5)], DIAL_TOP, P), { tone: 'hi' }))
  out.push(S(k.slabOf({ x: x + DIAL_R - 1, y: y - 1.8, w: 4, d: 3.6, r: 1 }, DIAL_Z + 1, 3, P, 2), { tone: 'mid' }))
  return out.join('')
}
const needle = (loss) => {
  const angle = -DIAL_SPAN / 2 + (clamp(loss, 0, LOSS_FULL) / LOSS_FULL) * DIAL_SPAN
  const [x, y] = DIAL
  return k.lineOnTop([x - Math.sin(angle) * 2.4, y + Math.cos(angle) * 2.4], [x + Math.sin(angle) * (DIAL_R - 3), y - Math.cos(angle) * (DIAL_R - 3)], DIAL_TOP + 0.2, P)
}

// Crank gearbox on the near side of the base; the crank turns in the box's front plane.
function crankBox() {
  const box = { x: CRANK.x - 12, y: CRANK.y - 9, w: 12, d: 18, r: 1.6 }
  const out = [S(k.slabOf({ x: box.x - 2, y: box.y - 2, w: box.w + 4, d: box.d + 4, r: 2 }, 0, 2, P, 3, 0.5), { tone: 'mid' })]
  out.push(S(k.slabOf(box, 2, CRANK.z + 6 - 2, P, 3, 0.6), { tone: 'mid', inner: L(k.sideSeam(box, 8, P, 3), { tone: 'faint' }) }))
  out.push(L(k.planOutline(k.insetPlan(box, 2), CRANK.z + 6, P, 3), { tone: 'faint' }))
  out.push(D(k.corners(box, 2.4).map(([x, y]) => at([x, y, CRANK.z + 6])), { size: 0.42 }))
  // Shaft from the box face to the crank hub.
  const F = G.frameAlong([CRANK.x, CRANK.y, CRANK.z], [1, 0, 0])
  out.push(S(G.disc(0, 1.2, 4, F, P), { tone: 'mid' }))
  out.push(S(G.disc(1.2, 3.4, 1.6, F, P), { tone: 'mid' }))
  return out.join('')
}
function crankArm(turn) {
  const phi = turn * Math.PI * 2
  const u = [0, Math.cos(phi), Math.sin(phi)]
  const v = [0, -Math.sin(phi), Math.cos(phi)]
  const F = G.frameOf([CRANK.x, CRANK.y, CRANK.z], [1, 0, 0], u, v)
  const out = [S(G.prismOf(F, G.stadium(3, 2, 11, 20), 3.4, 5, P), { tone: 'mid' })]
  const grip = G.frameAlong(G.pointOf(F, 5, 11, 0), [1, 0, 0])
  out.push(S(G.solidOf([[0, 1.1], [1, 1.1], [1, 1.7, 1], [4, 1.9, 1], [7, 1.7, 1], [7.6, 0, 1]], grip, P), { tone: 'hi', crease: 'lo' }))
  out.push(D([at(G.pointOf(F, 5, 0, 0))], { size: 0.6, tone: 'hi' }))
  return out.join('')
}

// ---------- live parts ----------

function carriage(angle, radius, kind, index, picked) {
  const [x, y] = onTrack(radius, angle)
  const out = []
  const tangent = [-Math.sin(angle), Math.cos(angle)]
  if (kind === 'caption') {
    // A caption tag: a small block across the track with two printed rules and its pips.
    const [ux, uy] = tangent
    const [nx, ny] = [Math.cos(angle), Math.sin(angle)]
    const corner = (a, b) => [x + ux * a + nx * b, y + uy * a + ny * b]
    const ring = [corner(-6, -3.6), corner(6, -3.6), corner(6, 3.6), corner(-6, 3.6)]
    out.push(S(k.extrude(ring, PLATE_TOP, 2.6, P, { bevel: 0.3 }), { tone: picked ? 'hi' : 'mid', crease: picked ? 'lo' : 'faint' }))
    const top = PLATE_TOP + 2.6
    out.push(L(k.onTop([corner(-4, 1.6), corner(1.6, 1.6)], top, P) + k.onTop([corner(-4, 0.2), corner(3.4, 0.2)], top, P), { tone: 'lo', free: true }))
    const [px, py] = corner(-1.2, -1.6)
    out.push(pips(px, py, top, index + 1, tangent))
    out.push(S(k.cylinder(...corner(3.6, -1.6), 0.7, top, PIN - 2.6, P, 12), { tone: 'mid', crease: 'none' }))
    return { key: floorDepth(x, y), svg: out.join(''), hook: [...corner(3.6, -1.6), PLATE_TOP + PIN] }
  }
  const hex = kind === 'second'
  const probe = kind === 'probe'
  const body = k.cylinder(x, y, 5.2, PLATE_TOP, 2.8, P, hex ? 6 : 28, 0.4)
  out.push(S(body, { tone: probe ? 'mid' : 'hi', crease: probe ? 'faint' : 'lo' }))
  const top = PLATE_TOP + 2.8
  if (probe) out.push(L(k.ring(x, y, 3.6, top, P, 20), { tone: 'hi' }))
  const [px, py] = [x - Math.cos(angle) * 2.2, y - Math.sin(angle) * 2.2]
  out.push(pips(px, py, top, index + 1, tangent))
  const [hx, hy] = [x + Math.cos(angle) * 2, y + Math.sin(angle) * 2]
  out.push(S(k.cylinder(hx, hy, 0.7, top, PIN - 2.8, P, 12), { tone: 'mid', crease: 'none' }))
  return { key: floorDepth(x, y), svg: out.join(''), hook: [hx, hy, PLATE_TOP + PIN] }
}

// A close-wound tension spring between two hook pins, cut into pieces for the depth sort.
function springPieces(a, b, tone) {
  const axis = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const length = Math.hypot(...axis)
  if (length < 0.5) return []
  const along = axis.map((value) => value / length)
  const u = G.unit3(G.cross3(along, [0, 0, 1]))
  const v = G.cross3(along, u)
  const lead = Math.min(2.4, length * 0.2)
  const turns = 12
  const points = [a]
  for (let step = 0; step <= turns * 10; step++) {
    const t = step / (turns * 10)
    const phi = t * turns * Math.PI * 2
    const r = 1.1 * Math.min(1, t * 6, (1 - t) * 6)
    const s = lead + t * (length - lead * 2)
    points.push([a[0] + along[0] * s + (u[0] * Math.cos(phi) + v[0] * Math.sin(phi)) * r, a[1] + along[1] * s + (u[1] * Math.cos(phi) + v[1] * Math.sin(phi)) * r, a[2] + along[2] * s + (u[2] * Math.cos(phi) + v[2] * Math.sin(phi)) * r])
  }
  points.push(b)
  const pieces = []
  const chunk = 12
  for (let index = 0; index < points.length - 1; index += chunk) {
    const run = points.slice(index, Math.min(points.length, index + chunk + 1))
    const mid = run[Math.floor(run.length / 2)]
    pieces.push({ key: floorDepth(mid[0], mid[1]), svg: L(k.pathOf(run.map(at)), { tone }) })
  }
  return pieces
}

// The zero-shot probe: a new photo held on a swing arm from the hub, the arm set to its embedding's
// direction. A dotted feeler drops from the photo to the caption nearest in angle.
const ARM_Z = PLATE_TOP + 9
const ARM_REACH = (R_OUT + R_IN) / 2
function probeArm(angle, target) {
  const [ux, uy] = [Math.cos(angle), Math.sin(angle)]
  const [nx, ny] = [-uy, ux]
  // Pivot post on the hub cap, collar, and the arm as one bar: it rides above every pin and spring.
  const out = [S(k.cylinder(0, 0, 1.8, PLATE_TOP + 2.6, ARM_Z - 1 - PLATE_TOP - 2.6, P, 18), { tone: 'mid', crease: 'none' })]
  out.push(S(k.cylinder(0, 0, 3.4, ARM_Z - 1, 2.8, P, 28, 0.4), { tone: 'mid' }))
  const [a, b] = [3, ARM_REACH - 3]
  const ring = [[ux * a - nx * 1.3, uy * a - ny * 1.3], [ux * b - nx * 1.3, uy * b - ny * 1.3], [ux * b + nx * 1.3, uy * b + ny * 1.3], [ux * a + nx * 1.3, uy * a + ny * 1.3]]
  const bar = S(k.extrude(ring, ARM_Z, 1.2, P), { tone: 'mid', crease: 'none' })
  // Paint the collar over the bar's root when the bar points away, under it when it points at you.
  const toward = ux * Math.cos((36 * Math.PI) / 180) + uy * Math.sin((36 * Math.PI) / 180) > 0
  if (toward) out.push(bar)
  else out.unshift(bar)
  const [tx, ty] = [ux * ARM_REACH, uy * ARM_REACH]
  const tip = out
  tip.push(S(k.cylinder(tx, ty, 4.8, ARM_Z, 1.6, P, 28, 0.4), { tone: 'hi', crease: 'lo' }))
  tip.push(L(k.ring(tx, ty, 3.4, ARM_Z + 1.6, P, 24), { tone: 'hi' }))
  tip.push(pips(tx, ty, ARM_Z + 1.6, PROBE.cls + 1, [nx, ny]))
  const feeler = L(k.pathOf([at([tx, ty, ARM_Z]), at(target)]), { tone: 'hi', dotted: true })
  return feeler + tip.join('')
}

function pegSvg(row, col, p) {
  const [x, y] = pegAt(row, col)
  const diagonal = row === col
  const height = 0.6 + p * PEG_SCALE
  const tone = diagonal ? 'hi' : 'mid'
  return S(k.cylinder(x, y, 1.5, PEG_TOP, height, P, 16), { tone, crease: 'none' }) + S(k.cylinder(x, y, 2.1, PEG_TOP + height, 1, P, 18), { tone, crease: diagonal ? 'lo' : 'faint' })
}

export const meta = { id: 'contrastive-board', fig: 'Fig 10.1', title: '对比学习转盘', titleEn: 'Contrastive turntable' }

export function render({ lang = 'zh' } = {}) {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      '对比学习转盘。归一化后的嵌入向量只能落在圆周上，所以转盘上有两圈轨道：外圈是第一视图或图片，内圈是第二视图或文字；同一角度表示同一方向。每对正样本之间连着一根弹簧。摇一圈手柄就是一步梯度下降：配对的两块滑块转到一起，不同图片彼此散开，表盘读出对比损失，旁边四乘四的钉板显示每一行的 softmax 选择概率，对角线逐渐升高。CLIP 模式下外圈还有一张新照片，虚线探针指向离它最近的文字，即零样本分类。',
      'A contrastive turntable. Normalised embeddings can only lie on a circle, so the turntable has two tracks: the outer one holds the first views or the images, the inner one the second views or the captions, and the same angle means the same direction. A spring joins each positive pair. One turn of the crank is one step of gradient descent: the two pucks of a pair rotate together while different images spread apart, a dial reads out the contrastive loss, and a four-by-four pegboard beside it shows each row’s softmax probabilities, its diagonal rising step by step. In CLIP mode the outer track also carries a new photo, and a dashed probe points to the caption nearest to it: zero-shot classification.',
    ),
    body: [
      base(),
      batchRack(),
      pegBoard(),
      '<g data-part="pegs"></g>',
      dialArt(),
      `<path data-part="needle" class="iso-line" data-tone="lit" data-free="" style="stroke-width:1.1" d=""/>`,
      D([at([DIAL[0], DIAL[1], DIAL_TOP + 0.2])], { size: 0.7, tone: 'hi' }),
      table(),
      '<g data-part="bed"></g>',
      crankBox(),
      '<g data-part="crank"></g>',
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, '训练设置', 'Training settings')}">
    <div class="fx-control"><span>${t(lang, '配对', 'Pairs')}</span><button type="button" data-set="mode" data-value="simclr">${t(lang, 'SimCLR · 两个视图', 'SimCLR · two views')}</button><button type="button" data-set="mode" data-value="clip">${t(lang, 'CLIP · 图与文', 'CLIP · image–text')}</button></div>
    <div class="fx-control"><span>${t(lang, '训练', 'Train')}</span><button type="button" data-set="step" data-value="1">${t(lang, '摇一步 ›', 'Step ›')}</button><button type="button" data-set="reset" data-value="1">${t(lang, '重来', 'Reset')}</button></div>
  </div>
  <div class="fx-calc"><span>${t(lang, `ℓ_i = −log p_ii，p_ij = softmax(sim(z_i, z′_j) / τ)，τ = ${TAU}`, `ℓ_i = −log p_ii, p_ij = softmax(sim(z_i, z′_j) / τ), τ = ${TAU}`)}</span><i>·</i><span>${t(lang, '对角 p_ii', 'diagonal p_ii')}</span><b data-calc="diag"></b><span data-calc="zero"></span></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '空格摇一步 · R 重来', 'Space steps · R resets'),
      readout: '',
      keys: [
        { mark: 'lit', label: t(lang, '表盘指针：对比损失', 'dial needle: contrastive loss') },
        { mark: 'raised', label: t(lang, '滑块：嵌入方向，弹簧连正对', 'puck: embedding direction, springs join positive pairs') },
        { mark: 'flat', label: t(lang, '钉板：每行 softmax，对角为正对', 'pegboard: softmax per row, diagonal = positive pairs') },
      ],
      caption: t(
        lang,
        '嵌入向量先归一化，只剩方向，所以滑块只能沿圆形轨道走，相似度就是两者夹角的余弦。每摇一圈做一步梯度下降，降低 ℓ = −log( exp(s⁺/τ) / Σ exp(s/τ) )：同一张图的两个视图被拉到同一方向，别的图片作为负对被推开；没有任何类别标签，配对来自“它们出自同一张图”。未训练时编码器只看增强带来的干扰，损失接近乱猜的 log 4 ≈ 1.39。CLIP 把内圈换成文字说明；训练后，新照片离哪段文字最近就归哪一类，这就是零样本分类。',
        'Embeddings are normalised first, leaving only a direction, so the pucks can only travel along circular tracks and similarity is the cosine of the angle between them. Each turn of the crank takes one step of gradient descent on ℓ = −log( exp(s⁺/τ) / Σ exp(s/τ) ): the two views of the same image are pulled into the same direction, and the other images are pushed away as negatives. No class labels are used; the pairing comes from “they came from the same image”. Untrained, the encoder looks only at the nuisance introduced by augmentation, and the loss sits near the chance level of log 4 ≈ 1.39. CLIP swaps the inner track for text captions; after training, a new photo belongs to whichever caption lies nearest: zero-shot classification.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, '对比学习转盘。空格或右方向键训练一步，R 重新开始，M 切换 SimCLR 与 CLIP。', 'Contrastive turntable. Space or the right arrow key trains one step, R starts over, M switches between SimCLR and CLIP.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export const css = `
.cb-groove{fill:var(--anatomy-shade-0);stroke:none}
`

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { bed: part('bed'), pegs: part('pegs'), needle: part('needle'), crank: part('crank') }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]
  const courses = { simclr: train('simclr'), clip: train('clip') }

  const state = { mode: 'simclr', step: 0, shown: 0, touring: true, clock: 0 }

  // The figure between two training steps: angles turn the short way, numbers blend.
  function frameAt(shown) {
    const course = courses[state.mode]
    const i0 = Math.floor(clamp(shown, 0, STEPS))
    const i1 = Math.min(STEPS, i0 + 1)
    const t = clamp(shown - i0, 0, 1)
    const [a, b] = [course[i0], course[i1]]
    const mixAngles = (list0, list1) => list0.map((z, index) => lerpAngle(angleOf(z), angleOf(list1[index]), t))
    return {
      left: mixAngles(a.left, b.left),
      right: mixAngles(a.right, b.right),
      probe: lerpAngle(angleOf(a.probe), angleOf(b.probe), t),
      rows: a.rows.map((row, r) => row.map((p, c) => p + (b.rows[r][c] - p) * t)),
      loss: a.loss + (b.loss - a.loss) * t,
      positive: a.positive + (b.positive - a.positive) * t,
      pick: (t < 0.5 ? a : b).pick,
    }
  }

  function draw() {
    const f = frameAt(state.shown)
    const clip = state.mode === 'clip'
    const items = []
    const outer = f.left.map((angle, index) => carriage(angle, R_OUT, 'first', index, false))
    const inner = f.right.map((angle, index) => carriage(angle, R_IN, clip ? 'caption' : 'second', index, clip && index === f.pick))
    items.push(...outer, ...inner)
    outer.forEach((item, index) => items.push(...springPieces(item.hook, inner[index].hook, 'mid')))
    items.sort((a, b) => a.key - b.key)
    nodes.bed.innerHTML = items.map((item) => item.svg).join('') + (clip ? probeArm(f.probe, inner[f.pick].hook) : '')

    const pegs = []
    for (let row = 0; row < N; row++) for (let col = 0; col < N; col++) pegs.push({ key: floorDepth(...pegAt(row, col)), svg: pegSvg(row, col, f.rows[row][col]) })
    nodes.pegs.innerHTML = pegs.sort((a, b) => a.key - b.key).map((peg) => peg.svg).join('')
    nodes.needle.setAttribute('d', needle(f.loss))
    nodes.crank.innerHTML = crankArm(state.shown)

    const text = t(lang, `第 ${Math.round(state.shown)} 步 · 损失 ${f.loss.toFixed(2)} · s⁺ ${f.positive.toFixed(2)}`, `step ${Math.round(state.shown)} · loss ${f.loss.toFixed(2)} · s⁺ ${f.positive.toFixed(2)}`)
    if (readout.textContent !== text) readout.textContent = text
    calc.diag.textContent = f.rows.map((row, index) => row[index].toFixed(2)).join('  ')
    const correct = f.pick === PROBE.cls
    calc.zero.textContent = clip ? t(lang, `· 零样本：新照片 → 文字 ${f.pick + 1}${correct ? '（对）' : '（错）'}`, `· zero-shot: new photo → caption ${f.pick + 1}${correct ? ' (correct)' : ' (wrong)'}`) : ''
  }

  function describe() {
    const end = courses[state.mode][state.step]
    buttons.forEach((button) => {
      if (button.dataset.set === 'mode') button.setAttribute('aria-pressed', String(button.dataset.value === state.mode))
    })
    stage.setAttribute(
      'aria-valuetext',
      t(
        lang,
        `${state.mode === 'clip' ? 'CLIP 图文配对' : 'SimCLR 两个视图'}，第 ${state.step} 步，损失 ${end.loss.toFixed(2)}，正对平均相似度 ${end.positive.toFixed(2)}`,
        `${state.mode === 'clip' ? 'CLIP image–text pairs' : 'SimCLR two views'}, step ${state.step}, loss ${end.loss.toFixed(2)}, mean positive-pair similarity ${end.positive.toFixed(2)}`,
      ),
    )
  }

  function tick(dt, calm) {
    if (state.touring && !calm) {
      state.clock += dt
      if (state.step < STEPS && state.clock > STEP_EVERY) {
        state.clock = 0
        state.step += 1
        describe()
      } else if (state.step >= STEPS && state.clock > HOLD[state.mode]) {
        state.clock = 0
        setMode(state.mode === 'simclr' ? 'clip' : 'simclr')
      }
    }
    state.shown = follow(state.shown, state.step, dt, 0.2, calm)
    if (Math.abs(state.shown - state.step) < 0.002) state.shown = state.step
    draw()
    return (state.touring && !calm) || state.shown !== state.step
  }

  function setMode(mode) {
    state.mode = mode
    state.step = 0
    state.shown = 0
    describe()
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.clock = 0
    loop.run()
  }, 6000)
  const byHand = (action) => {
    state.touring = false
    idle.touch()
    action()
    describe()
    loop.run()
  }
  const stepOnce = () => {
    state.step = Math.min(STEPS, Math.round(state.shown) + 1)
  }
  const reset = () => {
    state.step = 0
  }

  const onKey = (event) => {
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') byHand(stepOnce)
    else if (event.key === 'ArrowLeft') byHand(() => (state.step = Math.max(0, Math.round(state.shown) - 1)))
    else if (event.key === 'End') byHand(() => (state.step = STEPS))
    else if (event.key === 'r' || event.key === 'R' || event.key === 'Home') byHand(reset)
    else if (event.key === 'm' || event.key === 'M') byHand(() => setMode(state.mode === 'simclr' ? 'clip' : 'simclr'))
    else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const { set, value } = button.dataset
    if (set === 'mode') byHand(() => setMode(value))
    else if (set === 'step') byHand(stepOnce)
    else byHand(reset)
  }
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  if (loop.still.matches) {
    state.touring = false
    state.step = STEPS
    state.shown = STEPS
  }
  describe()
  draw()
  loop.run()

  return () => {
    loop.stop()
    idle.clear()
    stage.removeEventListener('keydown', onKey)
    root.removeEventListener('click', onButton)
  }
}
