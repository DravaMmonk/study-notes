import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { clamp, createIdle, createLoop, floorPoint, follow, spring, t, viewBoxPoint } from '../common.js'
import { CLASSES, D_K, IMAGE, SIZE, attend, classOf, headName, headNameEn, indexOf } from './model.js'

// Fig · The attention switchboard.
// A 4 × 4 picture is cut into sixteen patch tiles on an exchange board; each tile's face carries what
// the patch shows. The operator raises the query plug out of one tile's jack, and a patch cord runs from
// its head to a gauge rod on every tile, the query's own included. Each rod stands as tall as that
// token's softmax weight, and a glass column beside the board is filled by the same weights in the tile
// tones: the output y = Σ a_j v_j, always exactly full because the weights sum to 1. A rotary switch
// picks the head; a toggle drops the address tabs (the positional encoding) and head 2 goes blind.

const W = 640
const H = 390
const PITCH = 26
const TILE = 22
const TRAY = { x: -57, y: -57, w: 114, d: 114, r: 3 }
const TRAY_TOP = 4
const TOP = 7 // tile tops
const MAST = 60 // query plug height above the tiles
const ROD_BASE = TOP + 2
const ROD_SCALE = 56 // units per unit of weight
const CAP = 1.4
const COLUMN = [-12, -90]
const COLUMN_R = 8
const COLUMN_Z = [6, 58]
const PLATE = { x: -74, y: -114, w: 158, d: 190, r: 8 }
const KNOB = [68, 34]
const LEVER = [68, 6]
const TOUR = [
  { q: [1, 0], head: 0, pos: true },
  { q: [1, 0], head: 1, pos: true },
  { q: [1, 0], head: 1, pos: false },
  { q: [2, 2], head: 1, pos: true },
  { q: [0, 3], head: 0, pos: true },
  { q: [0, 1], head: 0, pos: true },
]
const HOLD = 3.4

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), ...[[0, 0], [0, 3], [3, 0], [3, 3]].map(([r, c]) => [(r - 1.5) * PITCH, -(c - 1.5) * PITCH, TOP + MAST + 3]), [COLUMN[0], COLUMN[1], COLUMN_Z[1] + 3]],
  W,
  H,
  { pad: 24, azimuth: 30, elevation: 34 },
)

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const floorDepth = (x, y) => k.depthOf([x, y, 0], P)

const centre = (row, col) => [(row - 1.5) * PITCH, -(col - 1.5) * PITCH]
const rodAt = (row, col) => {
  const [x, y] = centre(row, col)
  return [x - 6.6, y + 6.6]
}
const tabPlan = (row, col) => {
  const [x, y] = centre(row, col)
  return { x: x + 4.6, y: y - 9.6, w: 5, d: 5, r: 0.6 }
}
const rodTop = (weight) => ROD_BASE + CAP + weight * ROD_SCALE

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 10)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // Patch rule along the near side of the board: a minor tick every 4 px of a 16 px patch.
  const strip = { x: -54, y: 61, w: 108, d: 7, r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(strip.x + 1, strip.x + strip.w - 1, PITCH / 4, 4, strip.y + 0.2, 0.6, [2, 3.4], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))

  // Label plate at the near right corner.
  const label = { x: 54, y: -104, w: 20, d: 20, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[4, 13], [8, 9], [12, 11]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 2 + dx, label.y + 4], [label.x + 2 + dx, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

// The exchange board: a tray holding sixteen patch tiles, each toned and marked by what it shows.
function board() {
  const out = []
  out.push(S(k.slabOf(TRAY, 0, TRAY_TOP, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(TRAY, 1.6, P, 4), { tone: 'faint' }) }))
  out.push(D(k.corners(TRAY, 2.4).map(([x, y]) => at([x, y, TRAY_TOP])), { size: 0.42 }))
  const cells = []
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) cells.push([row, col])
  cells.sort((a, b) => floorDepth(...centre(...a)) - floorDepth(...centre(...b)))
  for (const [row, col] of cells) {
    const [x, y] = centre(row, col)
    const cls = CLASSES[classOf(row, col)].id
    const plan = { x: x - TILE / 2, y: y - TILE / 2, w: TILE, d: TILE, r: 1.4 }
    out.push(S(k.slabOf(plan, TRAY_TOP, TOP - TRAY_TOP, P, 3, 0.5), { tone: 'mid', className: `as-${cls}` }))
    const marks = []
    if (cls === 'sun') marks.push(L(k.ring(x, y, 4.4, TOP, P, 32) + k.ring(x, y, 6.2, TOP, P, 36), { tone: 'mid' }))
    if (cls === 'tree') marks.push(L(k.ring(x - 0.6, y + 0.6, 5.4, TOP, P, 32), { tone: 'hi' }))
    if (cls === 'grass') {
      const blades = []
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (Math.abs(a) + Math.abs(b) > 1 && Math.abs(a) < 2 + (b < 0)) blades.push(at([x + a * 2.6, y + b * 2.6, TOP]))
      marks.push(D(blades, { size: 0.42, tone: 'hi' }))
    }
    // Jack socket in the middle, gauge sleeve at the left corner, a slot for the address tab at the right corner.
    marks.push(`<path class="as-hole" d="${k.cylinder(x, y, 1.6, TOP, 0, P, 18).top}"/>`)
    marks.push(L(k.ring(x, y, 2.5, TOP, P, 20), { tone: 'lo' }))
    marks.push(L(k.planOutline(k.insetPlan(tabPlan(row, col), -0.5), TOP, P, 2), { tone: 'faint' }))
    const [rx, ry] = rodAt(row, col)
    marks.push(S(k.cylinder(rx, ry, 1.9, TOP, 2, P, 18), { tone: 'mid' }))
    out.push(marks.join(''))
  }
  return out.join('')
}

// Output column: a glass tube on a boss, a scale strip from 0 to 1 beside it, fed by a lead from the board.
function columnArt() {
  const [x, y] = COLUMN
  const out = []
  out.push(S(k.cylinder(x, y, COLUMN_R + 5, 0, 3, P, 48, 0.6), { tone: 'mid' }))
  out.push(D(k.circleRing(x, y, COLUMN_R + 3.3, 6).map(([px, py]) => at([px, py, 3])), { size: 0.42 }))
  out.push(S(k.cylinder(x, y, COLUMN_R + 1.6, 3, COLUMN_Z[0] - 3, P, 44), { tone: 'mid', inner: L(k.sideArc(x, y, COLUMN_R + 1.6, 4.5, P, 24), { tone: 'faint' }) }))
  out.push(S(k.cylinder(x, y, COLUMN_R + 0.6, COLUMN_Z[0], COLUMN_Z[1] - COLUMN_Z[0], P, 44), { tone: 'lo', crease: 'none' }))
  // Scale strip on the near side, ticks every 0.1 hanging from its front edge, a long one at 0, 0.5 and 1.
  const strip = { x: x + COLUMN_R + 2.4, y: y - 1.5, w: 2.4, d: 3, r: 0.4 }
  out.push(S(k.slabOf(strip, 3, COLUMN_Z[1] - 3 + 1, P, 2), { tone: 'mid' }))
  const face = strip.x + strip.w
  const minor = []
  const major = []
  for (let step = 0; step <= 10; step++) {
    const z = COLUMN_Z[0] + (step / 10) * (COLUMN_Z[1] - COLUMN_Z[0])
    ;(step % 5 === 0 ? major : minor).push(k.segment([face, strip.y, z], [face, strip.y + (step % 5 === 0 ? 3 : 1.8), z], P))
  }
  out.push(L(minor.join(''), { tone: 'lo' }), L(major.join(''), { tone: 'mid' }))
  // Lead from the side of the tray to the column's boss.
  out.push(k.wireSvg(at([x, TRAY.y, 2]), at([x, y + COLUMN_R + 5, 1.5]), { tone: 'mid', size: 0.9 }))
  return out.join('')
}

function columnTop() {
  const [x, y] = COLUMN
  const out = [S(k.cylinder(x, y, COLUMN_R + 1.6, COLUMN_Z[1], 2.4, P, 44, 0.5), { tone: 'mid' })]
  out.push(L(k.ring(x, y, COLUMN_R - 0.6, COLUMN_Z[1] + 2.4, P, 36), { tone: 'lo' }))
  // Two glints down the glass, from the collar to the cap.
  const glint = (angle) => {
    const [gx, gy] = [x + Math.cos(angle) * (COLUMN_R + 0.6), y + Math.sin(angle) * (COLUMN_R + 0.6)]
    return k.segment([gx, gy, COLUMN_Z[0]], [gx, gy, COLUMN_Z[1]], P)
  }
  out.push(L(glint(0.62) + glint(0.86), { tone: 'faint' }))
  return out.join('')
}

// Head selector: a knurled rotary switch with two detents on a ring.
function knobBase() {
  const [x, y] = KNOB
  const out = [S(k.slabOf({ x: x - 8, y: y - 8, w: 16, d: 16, r: 2 }, 0, 1.4, P, 3, 0.5), { tone: 'mid' })]
  out.push(L(k.ring(x, y, 6.6, 1.4, P, 40), { tone: 'lo' }))
  const t = k.radialTicks(x, y, 6.6, 2, 1, 1.4, [0, 1.6], P, Math.PI / 2 - 0.62, 1.24 * 2)
  out.push(L(t.major, { tone: 'mid' }))
  out.push(S(k.cylinder(x, y, 5, 1.4, 4.6, P, 32), { tone: 'mid' }))
  out.push(L(k.knurl(x, y, 5, 1.4, 6, 30, P), { tone: 'lo' }))
  return out.join('')
}
const knobPointer = (turn) => {
  const [x, y] = KNOB
  const angle = Math.PI / 2 - 0.62 + turn * 1.24
  return k.lineOnTop([x, y], [x + Math.sin(angle) * 4.4, y - Math.cos(angle) * 4.4], 6, P)
}

// Position toggle: a bushing with a bat that tips toward the board (on) or away (off).
function leverBase() {
  const [x, y] = LEVER
  const out = [S(k.slabOf({ x: x - 6, y: y - 8, w: 12, d: 16, r: 1.6 }, 0, 1.6, P, 3, 0.5), { tone: 'mid' })]
  out.push(D([at([x - 3.4, y - 5.6, 1.6]), at([x - 3.4, y + 5.6, 1.6])], { size: 0.42 }))
  out.push(S(k.cylinder(x, y, 3, 1.6, 1.6, P, 6), { tone: 'mid' }))
  out.push(S(k.cylinder(x, y, 1.9, 3.2, 1.4, P, 22), { tone: 'mid' }))
  return out.join('')
}
const leverBat = (on) => {
  const tilt = (on - 0.5) * 0.9
  const F = G.frameAlong([LEVER[0], LEVER[1], 4.6], [0, Math.sin(tilt), Math.cos(tilt)])
  return S(G.solidOf([[0, 0.8], [8, 0.62], [8.2, 1.2, 1], [9.4, 1.1, 1], [10, 0, 1]], F, P), { tone: 'mid' })
}

// ---------- live parts ----------

function rodSvg(row, col, weight, strong) {
  const [x, y] = rodAt(row, col)
  const top = rodTop(weight)
  const tone = strong ? 'hi' : 'mid'
  return S(k.cylinder(x, y, 0.7, ROD_BASE, top - CAP - ROD_BASE, P, 12), { tone, crease: 'none' })
    + S(k.cylinder(x, y, 1.5, top - CAP, CAP, P, 16), { tone, crease: strong ? 'lo' : 'faint' })
}

function tabSvg(row, col, out) {
  if (out < 0.02) return ''
  const plan = tabPlan(row, col)
  const top = TOP + 1.8 * out
  const dot = at([plan.x + 1 + row * 1, plan.y + 4 - col * 1, top])
  return S(k.slabOf(plan, TOP, top - TOP, P, 2, 0.3), { tone: 'mid' }) + D([[dot[0], dot[1], out]], { size: 0.5, tone: 'hi' })
}

// The query plug: shaft, collar, knurled handle and the cord head, cut off below the tile top.
function mastSvg(row, col, lift) {
  if (lift < 0.01) return ''
  const [x, y] = centre(row, col)
  const top = TOP + lift * MAST
  const parts = [
    [1.2, TOP, top - 12, 'none'],
    [2.1, top - 12, top - 10.8],
    [2.8, top - 10.8, top - 2],
    [1.9, top - 2, top],
  ]
  const out = []
  parts.forEach(([r, z0, z1, crease], index) => {
    const from = Math.max(z0, TOP)
    if (z1 - from < 0.05) return
    out.push(S(k.cylinder(x, y, r, from, z1 - from, P, r > 2 ? 28 : 16), { tone: 'hi', lit: true, crease: crease ?? 'lo' }))
    if (index === 2) out.push(L(k.knurl(x, y, r, from, z1, 22, P), { tone: 'mid' }))
  })
  return out.join('')
}

// A patch cord from the plug's head to one gauge cap, sagging a little, cut into pieces for the sort.
function cordPieces(from, to, tone) {
  const span = Math.hypot(to[0] - from[0], to[1] - from[1])
  const sag = 1.2 + span * 0.07
  const count = 8
  const point = (t) => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t - 4 * sag * t * (1 - t)]
  const pieces = []
  for (let index = 0; index < count; index++) {
    const a = point(index / count)
    const b = point((index + 1) / count)
    const end = index === count - 1 ? D([at(b)], { size: 0.55, tone: 'hi' }) : ''
    pieces.push({ key: floorDepth((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), svg: L(k.pathOf([at(a), at(b)]), { tone }) + end })
  }
  return pieces
}

export const meta = { id: 'attention-switchboard', fig: 'Fig 9.1', title: '注意力交换台', titleEn: 'Attention switchboard' }

export function render({ lang = 'zh' } = {}) {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      '注意力交换台。一张四乘四的小图被切成十六块图块，排在交换台上，每块的色调表示它的内容。查询插头从一块图块的插孔里升起，插头顶端引出十六根接线，连到每块图块角上的量杆；量杆的高度就是该图块的 softmax 注意力权重。旁边的玻璃柱按同样的权重分层装满，表示输出是各图块的加权混合。旋钮切换注意力头，拨杆收起或升起每块图块上的位置标签。',
      'An attention switchboard. A small four-by-four image is cut into sixteen patches laid out on the board, each tinted by what it shows. A query plug rises from one patch’s socket, and sixteen cords run from its tip to a gauge rod at the corner of every patch; each rod’s height is that patch’s softmax attention weight. A glass column beside the board fills in layers by the same weights, showing the output as a weighted mix of the patches. A knob switches the attention head, and a lever lowers or raises the position tag on every patch.',
    ),
    body: [base(), board(), '<g data-part="bed"></g>', columnArt(), '<g data-part="column"></g>', columnTop(), knobBase(), '<path data-part="pointer" class="iso-line" data-tone="hi" data-free="end" style="stroke-width:1.1" d=""/>', leverBase(), '<g data-part="bat"></g>'],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, '注意力设置', 'Attention settings')}">
    <div class="fx-control"><span>${t(lang, '注意力头', 'Head')}</span><button type="button" data-set="head" data-value="0">${t(lang, headName(0), headNameEn(0))}</button><button type="button" data-set="head" data-value="1">${t(lang, headName(1), headNameEn(1))}</button></div>
    <div class="fx-control"><span>${t(lang, '位置编码', 'Positional encoding')}</span><button type="button" data-set="pos" data-value="1">${t(lang, '加上', 'On')}</button><button type="button" data-set="pos" data-value="0">${t(lang, '去掉', 'Off')}</button></div>
  </div>
  <div class="fx-calc"><span>a_j = softmax(q·k_j / √${D_K})</span><i>·</i><span>y = Σ a_j v_j =</span><b data-calc="mix"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '悬停图块 · 方向键', 'Hover a patch · arrow keys'),
      readout: '',
      keys: [
        { mark: 'lit', label: t(lang, '查询插头：当前的 query 图块', 'query plug: the current query patch') },
        { mark: 'raised', label: t(lang, '量杆高度：权重 a_j', 'rod height: weight a_j') },
        { mark: 'flat', label: t(lang, '玻璃柱：输出 y，按 a_j 分层', 'glass column: output y, layered by a_j') },
      ],
      caption: t(
        lang,
        '查询插头从一块图块升起，一步就接到全部十六块图块，包括它自己：每根量杆的高度是 a_j = softmax(q·k_j / √d)，所有量杆加起来恰好是 1，所以右边的玻璃柱总是正好装满，各层厚度就是从各图块读到的份量。头 1 比较内容，远处同样是树的图块也会被选中；头 2 比较位置编码，只看附近。把位置标签收起后，头 2 分不出谁在哪里，十六根量杆一样高（1/16）：注意力本身不知道顺序，位置必须加进 token 里。',
        'The query plug rises from one patch and is wired to all sixteen patches in a single step, itself included: each rod’s height is a_j = softmax(q·k_j / √d), and the rods always add up to exactly 1, so the glass column on the right is always exactly full, each layer as thick as the share read from that patch. Head 1 compares content, so a distant patch that is also a tree gets picked too; head 2 compares positional encodings and only looks nearby. Lower the position tags and head 2 can no longer tell where anything is, so all sixteen rods stand at the same height (1/16): attention on its own knows nothing of order, and position has to be added into the tokens.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, '注意力交换台。方向键移动查询图块，H 切换注意力头，P 加上或去掉位置编码。', 'Attention switchboard. Arrow keys move the query patch, H switches the head, P adds or removes positional encoding.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export const css = `
.as-sky>.iso-top{fill:var(--anatomy-shade-1)}
.as-sun>.iso-top{fill:var(--anatomy-top)}
.as-tree>.iso-top,.as-tree>.iso-shade{fill:var(--anatomy-mid)}
.as-grass>.iso-top,.as-grass>.iso-shade{fill:var(--anatomy-lo)}
.as-sky>.iso-shade{fill:var(--anatomy-shade-1)}
.as-hole{fill:var(--anatomy-hi);opacity:.55}
`

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { bed: part('bed'), column: part('column'), pointer: part('pointer'), bat: part('bat') }
  const readout = root.querySelector('[data-readout]')
  const mixText = root.querySelector('[data-calc="mix"]')
  const buttons = [...root.querySelectorAll('[data-set]')]

  const cells = []
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) cells.push({ row, col, lift: { at: 0, rate: 0 } })

  const config = { q: [1, 0], head: 0, pos: true }
  const first = attend(indexOf(...config.q), config.head, config.pos)
  const state = { from: first.weights, to: first.weights, mix: 1, tab: 1, knob: 0, bat: 1, touring: true, clock: 0, step: 0 }

  const weightsNow = () => state.from.map((value, index) => value + (state.to[index] - value) * state.mix)

  function retarget() {
    const result = attend(indexOf(...config.q), config.head, config.pos)
    state.from = weightsNow()
    state.to = result.weights
    state.mix = 0
    buttons.forEach((button) => {
      const value = button.dataset.set === 'head' ? String(config.head) : String(Number(config.pos))
      button.setAttribute('aria-pressed', String(button.dataset.value === value))
    })
    const [r, c] = config.q
    const cls = CLASSES[classOf(r, c)]
    const peak = Math.max(...result.weights).toFixed(2)
    stage.setAttribute(
      'aria-valuetext',
      t(
        lang,
        `查询图块第 ${r + 1} 行第 ${c + 1} 列（${cls.name}），${headName(config.head)}，${config.pos ? '已加' : '未加'}位置编码；最大权重 ${peak}`,
        `Query patch row ${r + 1}, column ${c + 1} (${cls.nameEn}), ${headNameEn(config.head)}, positional encoding ${config.pos ? 'on' : 'off'}; largest weight ${peak}`,
      ),
    )
  }

  function draw() {
    const weights = weightsNow()
    const peak = Math.max(...weights)
    const qi = indexOf(...config.q)
    const query = cells[qi]
    const [qx, qy] = centre(...config.q)
    const hub = [qx, qy, TOP + query.lift.at * MAST]
    const items = []
    cells.forEach((cell, index) => {
      const weight = weights[index]
      const [rx, ry] = rodAt(cell.row, cell.col)
      items.push({ key: floorDepth(rx, ry), svg: rodSvg(cell.row, cell.col, weight, weight > peak * 0.55) })
      const tab = tabPlan(cell.row, cell.col)
      items.push({ key: floorDepth(tab.x + 2.5, tab.y + 2.5), svg: tabSvg(cell.row, cell.col, state.tab) })
      const [cx, cy] = centre(cell.row, cell.col)
      if (cell.lift.at > 0.01) items.push({ key: floorDepth(cx, cy), svg: mastSvg(cell.row, cell.col, cell.lift.at) })
      if (query.lift.at > 0.3) {
        const tone = weight > peak * 0.55 ? 'hi' : weight > 0.04 ? 'mid' : 'lo'
        items.push(...cordPieces(hub, [rx, ry, rodTop(weight)], tone))
      }
    })
    items.sort((a, b) => a.key - b.key)
    nodes.bed.innerHTML = items.map((item) => item.svg).join('')

    // The column: one band per token, grouped by what it shows, ground at the bottom and sky on top.
    const [x, y] = COLUMN
    const span = COLUMN_Z[1] - COLUMN_Z[0]
    const bands = []
    let z = COLUMN_Z[0]
    for (const cls of [3, 2, 1, 0]) {
      const members = cells.map((cell, index) => ({ cell, index })).filter(({ cell }) => classOf(cell.row, cell.col) === cls)
      const share = members.reduce((sum, { index }) => sum + weights[index], 0)
      if (share * span < 0.08) continue
      const seams = []
      let s = z
      members.forEach(({ index }, order) => {
        s += weights[index] * span
        if (order < members.length - 1 && weights[index] * span > 0.6) seams.push(L(k.sideArc(x, y, COLUMN_R, s, P, 28), { tone: 'faint' }))
      })
      bands.push(S(k.cylinder(x, y, COLUMN_R, z, share * span, P, 44), { tone: 'mid', crease: 'faint', className: `as-${CLASSES[cls].id}`, inner: seams.join('') }))
      z += share * span
    }
    nodes.column.innerHTML = bands.join('')
    nodes.pointer.setAttribute('d', knobPointer(state.knob))
    nodes.bat.innerHTML = leverBat(state.bat)

    const [r, c] = config.q
    const text = t(lang, `查询 (${r},${c}) · 最大权重 ${peak.toFixed(2)} · Σ=1`, `query (${r},${c}) · peak ${peak.toFixed(2)} · Σ=1`)
    if (readout.textContent !== text) readout.textContent = text
    const output = CLASSES.map((cls, index) => ({ name: t(lang, cls.name, cls.nameEn), share: cells.reduce((sum, cell, j) => sum + (classOf(cell.row, cell.col) === index ? weights[j] : 0), 0) }))
      .sort((a, b) => b.share - a.share)
      .filter((entry) => entry.share >= 0.005)
      .slice(0, 3)
    mixText.textContent = `${output.map((entry) => `${entry.share.toFixed(2)} ${entry.name}`).join(' + ')}${output.length < 4 ? ' + …' : ''}`
  }

  function setConfig(next) {
    Object.assign(config, next)
    retarget()
    loop.run()
  }

  function tick(dt, calm) {
    if (state.touring && !calm) {
      state.clock += dt
      if (state.clock > HOLD) {
        state.clock = 0
        state.step = (state.step + 1) % TOUR.length
        const scene = TOUR[state.step]
        Object.assign(config, { q: [...scene.q], head: scene.head, pos: scene.pos })
        retarget()
      }
    }
    let moving = state.touring && !calm
    state.mix = follow(state.mix, 1, dt, 0.32, calm)
    state.tab = follow(state.tab, config.pos ? 1 : 0, dt, 0.22, calm)
    state.knob = follow(state.knob, config.head, dt, 0.16, calm)
    state.bat = follow(state.bat, config.pos ? 1 : 0, dt, 0.12, calm)
    moving = moving || state.mix !== 1 || state.tab !== (config.pos ? 1 : 0) || state.knob !== config.head || state.bat !== (config.pos ? 1 : 0)
    const qi = indexOf(...config.q)
    cells.forEach((cell, index) => {
      moving = spring(cell.lift, index === qi ? 1 : 0, dt, 150, 19, calm) || moving
    })
    draw()
    return moving
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    state.clock = 0
    loop.run()
  })
  const byHand = (next) => {
    state.touring = false
    idle.touch()
    setConfig(next)
  }

  const onPointer = (event) => {
    const [x, y] = floorPoint(viewBoxPoint(svg, event), TOP, P)
    const row = Math.round(x / PITCH + 1.5)
    const col = Math.round(-y / PITCH + 1.5)
    if (row < 0 || col < 0 || row >= SIZE || col >= SIZE) return
    if (row === config.q[0] && col === config.q[1] && !state.touring) return idle.touch()
    byHand({ q: [row, col] })
  }
  const onKey = (event) => {
    const [r, c] = config.q
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (moves[event.key]) byHand({ q: [clamp(r + moves[event.key][0], 0, SIZE - 1), clamp(c + moves[event.key][1], 0, SIZE - 1)] })
    else if (event.key === 'Home') byHand({ q: [0, 0] })
    else if (event.key === 'End') byHand({ q: [SIZE - 1, SIZE - 1] })
    else if (event.key === 'h' || event.key === 'H') byHand({ head: 1 - config.head })
    else if (event.key === 'p' || event.key === 'P') byHand({ pos: !config.pos })
    else return
    event.preventDefault()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    if (button.dataset.set === 'head') byHand({ head: Number(button.dataset.value) })
    else byHand({ pos: button.dataset.value === '1' })
  }

  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerdown', onPointer)
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  if (loop.still.matches) state.touring = false
  retarget()
  cells[indexOf(...config.q)].lift.at = 1
  state.mix = 1
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
