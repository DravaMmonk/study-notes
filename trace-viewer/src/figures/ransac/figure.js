import * as k from '../kit/iso-kit.js'
import { createIdle, createLoop, follow, spring } from '../common.js'
import { COUNT, CONFIDENCE, HALF, run } from './model.js'

// Fig · The RANSAC peg board.
// Twenty pegs stand on a gridded board. Each round two pegs rise and a straightedge frame settles on
// them; its two side rails sit δ either side of the line. Pegs between the rails lift their caps as
// votes, a slider on the tally column reads the count and a stop above it keeps the best so far. A
// dial cut with k = ⌈log(1 − P) / log(1 − p²)⌉ divisions steps once per round. After k rounds every
// inlier of the best round rises and the frame rests on all of them: the refit, scribed on the board.

const W = 640
const H = 400
const BOARD_Z = 6
const FRAME_Z = 17
const LENGTH = 132
const REST = 3
const VOTE = 5.6
const LIFT = FRAME_Z - BOARD_Z - 1
const PLATE = { x: -72, y: -116, w: 146, d: 188, r: 8 }
const BOARD = { x: -HALF - 6, y: -HALF - 6, w: HALF * 2 + 12, d: HALF * 2 + 12, r: 3 }
const INNER = HALF + 2
const COLUMN = { x: -32, y: -94, w: 7, d: 7, r: 1 }
const COLUMN_TOP = 52
const TALLY = (votes) => 4 + votes * 2.3
const DIAL = [36, -92]
const DIAL_R = 13
const DIAL_TOP = 9
const SEEDS = { 6: [11, 39, 26], 10: [4, 15, 12] }

const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [COLUMN.x, COLUMN.y, COLUMN_TOP + 3], [0, 60, FRAME_Z + 3], [0, -60, FRAME_Z + 3]], W, H, { pad: 24, azimuth: 48 })

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const [VX, VY] = k.towardViewer(P)

// A rotated bar footprint along a line: centre (cx, cy), direction angle, length, width.
function barRing(cx, cy, angle, length, width, offset = 0) {
  const [ux, uy] = [Math.cos(angle), Math.sin(angle)]
  const [nx, ny] = [-uy, ux]
  const ox = cx + nx * offset
  const oy = cy + ny * offset
  return [
    [ox - ux * length / 2 - nx * width / 2, oy - uy * length / 2 - ny * width / 2],
    [ox + ux * length / 2 - nx * width / 2, oy + uy * length / 2 - ny * width / 2],
    [ox + ux * length / 2 + nx * width / 2, oy + uy * length / 2 + ny * width / 2],
    [ox - ux * length / 2 + nx * width / 2, oy - uy * length / 2 + ny * width / 2],
  ]
}

// Clip the infinite line to the board's inner groove, so a scribe ends on the groove.
function clipLine(line) {
  const [ux, uy] = [Math.cos(line.angle), Math.sin(line.angle)]
  let lo = -1e4
  let hi = 1e4
  for (const [p, d] of [[line.cx, ux], [line.cy, uy]]) {
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(p) > INNER) return null
      continue
    }
    const a = (-INNER - p) / d
    const b = (INNER - p) / d
    lo = Math.max(lo, Math.min(a, b))
    hi = Math.min(hi, Math.max(a, b))
  }
  if (lo >= hi) return null
  return [[line.cx + ux * lo, line.cy + uy * lo], [line.cx + ux * hi, line.cy + uy * hi]]
}

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

  // The board: a gridded top inside a groove, held by four screws.
  out.push(S(k.slabOf(BOARD, 0, BOARD_Z, P, 4, 0.8), { tone: 'mid', inner: L(k.sideSeam(BOARD, 2.5, P, 4), { tone: 'faint' }) }))
  const groove = { x: -INNER, y: -INNER, w: INNER * 2, d: INNER * 2, r: 1.5 }
  out.push(L(k.planOutline(groove, BOARD_Z, P, 3), { tone: 'lo' }))
  const grid = []
  for (let v = -40; v <= 40; v += 10) {
    grid.push(k.lineOnTop([v, -INNER], [v, INNER], BOARD_Z, P), k.lineOnTop([-INNER, v], [INNER, v], BOARD_Z, P))
  }
  out.push(L(grid.join(''), { tone: 'faint' }))
  const boardScrews = k.corners(BOARD, 3)
  out.push(D(boardScrews.map(([x, y]) => at([x, y, BOARD_Z])), { size: 0.45 }))

  // Label plate at the near corner of the plate.
  const label = { x: 48, y: 44, w: 18, d: 20, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[3, 13], [7, 9], [11, 11]].forEach(([dx, length]) => out.push(L(k.lineOnTop([label.x + 2 + dx, label.y + 4], [label.x + 2 + dx, label.y + 4 + length], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

function column() {
  const out = []
  out.push(S(k.slabOf(k.insetPlan(COLUMN, -3), 0, 3, P, 3, 0.5), { tone: 'mid' }))
  out.push(D(k.corners(k.insetPlan(COLUMN, -3), 1.4).map(([x, y]) => at([x, y, 3])), { size: 0.42 }))
  out.push(S(k.slabOf(COLUMN, 3, COLUMN_TOP - 3, P, 2, 0.5), { tone: 'mid' }))
  // Tally ticks on the near face, rooted on its right edge: one per vote, a long one every five.
  const face = COLUMN.x + COLUMN.w
  const minor = []
  const major = []
  for (let votes = 0; votes <= COUNT; votes++) {
    const z = TALLY(votes)
    ;(votes % 5 === 0 ? major : minor).push(k.segment([face, COLUMN.y, z], [face, COLUMN.y + (votes % 5 === 0 ? 3.6 : 2), z], P))
  }
  out.push(L(minor.join(''), { tone: 'lo' }), L(major.join(''), { tone: 'mid' }))
  out.push(S(k.slabOf(k.insetPlan(COLUMN, -1), COLUMN_TOP, 2, P, 2, 0.4), { tone: 'mid' }))
  return out.join('')
}

const slider = (z) => {
  const plan = { x: COLUMN.x + COLUMN.w, y: COLUMN.y + 3.8, w: 2.6, d: 3.2, r: 0.5 }
  return S(k.slabOf(plan, z - 1.1, 2.2, P, 2), { tone: 'hi', crease: 'lo' })
}
const bestStop = (z) => {
  const plan = { x: COLUMN.x + 1.2, y: COLUMN.y + COLUMN.d, w: 4.6, d: 2.2, r: 0.5 }
  return S(k.slabOf(plan, z - 0.8, 1.6, P, 2), { tone: 'mid' }) + D([at([plan.x + 2.3, plan.y + 1.1, z + 0.8])], { size: 0.4 })
}

function dialArt(rounds) {
  const [x, y] = DIAL
  const out = []
  out.push(S(k.cylinder(x, y, DIAL_R + 2.4, 0, 3, P, 56), { tone: 'lo' }))
  out.push(S(k.cylinder(x, y, DIAL_R, 3, DIAL_TOP - 3, P, 56, 0.8), { tone: 'hi', crease: 'lo' }))
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 2.4, DIAL_TOP, 60, P, 0.3), { tone: 'lo' }))
  out.push(L(k.ring(x, y, DIAL_R - 1.8, DIAL_TOP, P, 56), { tone: 'lo' }))
  const ticks = k.radialTicks(x, y, DIAL_R - 2.2, rounds, rounds, DIAL_TOP, [1.4, 2.8], P)
  out.push(L(ticks.minor, { tone: 'mid' }), L(ticks.major, { tone: 'hi' }))
  return out.join('')
}

const needle = (turn) => {
  const angle = turn * Math.PI * 2
  const [x, y] = DIAL
  return k.lineOnTop([x - Math.sin(angle) * 2.4, y + Math.cos(angle) * 2.4], [x + Math.sin(angle) * (DIAL_R - 3.2), y - Math.cos(angle) * (DIAL_R - 3.2)], DIAL_TOP + 0.2, P)
}

function pegSvg(point, height, mode) {
  const top = BOARD_Z + height
  const tone = mode === 'idle' ? 'mid' : 'hi'
  const lit = mode === 'sample'
  return S(k.cylinder(point.x, point.y, 2.6, BOARD_Z, 0.6, P, 18), { tone: 'lo' })
    + S(k.cylinder(point.x, point.y, 1.2, BOARD_Z + 0.6, height - 0.6, P, 14), { tone, crease: 'none', lit })
    + S(k.cylinder(point.x, point.y, 2.1, top, 1, P, 18), { tone, crease: tone === 'hi' ? 'lo' : 'faint', lit })
}

function frameSvg(line, threshold) {
  const out = []
  const tie = (end) => {
    const [ux, uy] = [Math.cos(line.angle), Math.sin(line.angle)]
    const cx = line.cx + ux * end * (LENGTH / 2 - 2)
    const cy = line.cy + uy * end * (LENGTH / 2 - 2)
    return k.extrude(barRing(cx, cy, line.angle, 4, threshold * 2 + 4), FRAME_Z, 2.6, P)
  }
  const rails = [-1, 1].map((side) => ({ side, paths: k.extrude(barRing(line.cx, line.cy, line.angle, LENGTH - 6, 1.1, side * threshold), FRAME_Z, 1.5, P) }))
  // Paint the far rail, the bar, the near rail, then the end ties over them.
  const nearSide = -Math.sin(line.angle) * VX + Math.cos(line.angle) * VY > 0 ? 1 : -1
  const far = rails.find((rail) => rail.side !== nearSide)
  const near = rails.find((rail) => rail.side === nearSide)
  out.push(S(far.paths, { tone: 'mid' }))
  out.push(S(k.extrude(barRing(line.cx, line.cy, line.angle, LENGTH - 6, 1.3, 0), FRAME_Z, 1.8, P), { tone: 'hi', crease: 'lo' }))
  out.push(S(near.paths, { tone: 'mid' }))
  const [ux, uy] = [Math.cos(line.angle), Math.sin(line.angle)]
  const ends = [-1, 1].sort((a, b) => (a * ux * VX + a * uy * VY) - (b * ux * VX + b * uy * VY))
  for (const end of ends) {
    out.push(S(tie(end), { tone: 'mid' }))
    const cx = line.cx + ux * end * (LENGTH / 2 - 2)
    const cy = line.cy + uy * end * (LENGTH / 2 - 2)
    out.push(D([at([cx, cy, FRAME_Z + 2.6])], { size: 0.45 }))
  }
  return { svg: out.join(''), nearSide }
}

export const meta = { id: 'ransac-pegboard', fig: 'Fig 12.1', title: 'RANSAC 钉板' }

export function render() {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label:
      '用于 RANSAC 直线拟合的钉板。板上有二十根钉；带两条侧导轨的直尺框架架在两根升起的钉上，落在导轨之间的钉升起表示投票。板旁的计票柱读出票数并记住最佳票数，表盘每轮走一格。',
    body: [
      base(),
      '<g data-part="scribe"></g>',
      '<g data-part="dial"></g>',
      `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" style="stroke-width:1.1" d=""/>`,
      `<g>${D([at([DIAL[0], DIAL[1], DIAL_TOP + 0.2])], { size: 0.7, tone: 'hi' })}</g>`,
      '<g data-part="bed"></g>',
      column(),
      '<g data-part="slider"></g>',
      '<g data-part="best"></g>',
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="RANSAC 设置">
    <div class="fx-control"><span>外点比例</span><button type="button" data-set="outliers" data-value="6">30%</button><button type="button" data-set="outliers" data-value="10">50%</button></div>
    <div class="fx-control"><span>阈值 δ</span><button type="button" data-set="threshold" data-value="3">3</button><button type="button" data-set="threshold" data-value="6">6</button></div>
    <div class="fx-control"><span>轮次</span><button type="button" data-set="step" data-value="1">下一轮 ›</button><button type="button" data-set="restart" data-value="1">重来</button></div>
  </div>
  <div class="fx-calc"><span>k ≥ log(1 − P) / log(1 − pⁿ) =</span><b data-calc="k"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: meta.title,
      hint: '空格：下一轮 · R：重来',
      readout: '',
      keys: [
        { mark: 'lit', label: '本轮抽中的两根钉' },
        { mark: 'raised', label: '导轨之间的钉：投票' },
        { mark: 'flat', label: '板上刻线：目前最佳模型' },
      ],
      caption:
        '每轮随机抽两根钉（确定一条直线的最少点数），再让所有钉投票。两根都是内点时，真实直线上的钉几乎都落进导轨之间；抽到外点时只收得到寥寥几根。计票柱上的止挡只升不降，记住最佳一轮；表盘走完 k 格后，最佳一轮的全部内点一起升起，直尺落在它们上面，这就是重拟合（refit），最终的线刻在板上。',
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="RANSAC 钉板。空格进入下一轮，R 重新开始。">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { bed: part('bed'), scribe: part('scribe'), dial: part('dial'), needle: part('needle'), slider: part('slider'), best: part('best') }
  const readout = root.querySelector('[data-readout]')
  const calc = root.querySelector('[data-calc="k"]')
  const buttons = [...root.querySelectorAll('[data-set]')]

  const config = { outliers: 6, threshold: 3, seedIndex: 0 }
  const state = {
    run: null,
    round: -1,
    refit: false,
    line: { cx: 0, cy: 0, angle: 0.4 },
    pegs: [],
    tally: { at: TALLY(0), rate: 0 },
    best: { at: TALLY(0), rate: 0 },
    turn: 0,
    clock: 0,
    touring: true,
  }

  function reset() {
    const seeds = SEEDS[config.outliers]
    state.run = run(config.outliers, config.threshold, seeds[config.seedIndex % seeds.length])
    state.round = 0
    state.refit = false
    state.clock = 0
    state.pegs = state.run.points.map((point) => ({ point, height: { at: REST, rate: 0 } }))
    nodes.dial.innerHTML = dialArt(state.run.k)
    const p = (COUNT - config.outliers) / COUNT
    calc.textContent = `log(0.01) / log(1 − ${p.toFixed(1)}²) = ${(Math.log(1 - CONFIDENCE) / Math.log(1 - p * p)).toFixed(1)} → ${state.run.k} 轮`
    buttons.forEach((button) => {
      const { set, value } = button.dataset
      if (set === 'outliers' || set === 'threshold') button.setAttribute('aria-pressed', String(Number(value) === config[set]))
    })
  }

  const current = () => (state.refit ? null : state.run.rounds[state.round] ?? null)
  const target = () => {
    if (state.refit) return state.run.final
    return current()?.line ?? state.line
  }

  function advance() {
    if (state.refit) {
      config.seedIndex += 1
      reset()
      return
    }
    if (state.round + 1 >= state.run.k) state.refit = true
    else state.round += 1
    state.clock = 0
  }

  function heights() {
    const round = current()
    return state.pegs.map((_, index) => {
      if (state.refit) return state.run.finalVotes.includes(index) ? LIFT : REST
      if (!round) return REST
      if (round.pair.includes(index)) return LIFT
      return round.votes.includes(index) ? VOTE : REST
    })
  }

  function say() {
    const round = current()
    const best = state.refit ? state.run.rounds.at(-1).best : round?.best
    const text = state.refit
      ? `重拟合 · ${COUNT} 点中 ${state.run.finalVotes.length} 个内点`
      : round
        ? `第 ${state.round + 1} / ${state.run.k} 轮 · 票数 ${round.votes.length} · 最佳 ${best.votes.length}`
        : `共 ${state.run.k} 轮`
    if (readout.textContent !== text) readout.textContent = text
  }

  function tick(dt, calm) {
    let moving = false
    const goal = target()
    // Lines are undirected: turn the short way.
    let angle = goal.angle
    while (angle - state.line.angle > Math.PI / 2) angle -= Math.PI
    while (angle - state.line.angle < -Math.PI / 2) angle += Math.PI
    const before = { ...state.line }
    state.line = {
      cx: follow(state.line.cx, goal.cx, dt, 0.22, calm),
      cy: follow(state.line.cy, goal.cy, dt, 0.22, calm),
      angle: follow(state.line.angle, angle, dt, 0.22, calm),
    }
    if (Math.abs(state.line.angle - angle) < 1e-3) state.line.angle = angle
    const settledLine = state.line.cx === goal.cx && state.line.cy === goal.cy && state.line.angle === angle
    moving = !settledLine || before.cx !== state.line.cx

    const wanted = heights()
    state.pegs.forEach((peg, index) => {
      moving = spring(peg.height, wanted[index], dt, 160, 20, calm) || moving
    })
    const round = current()
    const best = state.refit ? state.run.rounds.at(-1).best : round?.best
    moving = spring(state.tally, TALLY(state.refit ? state.run.finalVotes.length : round?.votes.length ?? 0), dt, 120, 18, calm) || moving
    moving = spring(state.best, TALLY(best?.votes.length ?? 0), dt, 120, 22, calm) || moving
    const turnGoal = state.refit ? 1 : (state.round + 1) / state.run.k
    state.turn = follow(state.turn, turnGoal, dt, 0.25, calm)
    moving = moving || state.turn !== turnGoal

    if (state.touring && !calm) {
      if (settledLine) state.clock += dt
      if (state.clock > (state.refit ? 3.2 : 1.2)) advance()
      moving = true
    }
    draw()
    say()
    return moving
  }

  function draw() {
    const { svg: frame, nearSide } = frameSvg(state.line, config.threshold)
    const [nx, ny] = [-Math.sin(state.line.angle), Math.cos(state.line.angle)]
    const behind = []
    const ahead = []
    const round = current()
    state.pegs.forEach((peg, index) => {
      const side = ((peg.point.x - state.line.cx) * nx + (peg.point.y - state.line.cy) * ny) * nearSide
      const mode = peg.height.at > VOTE + 1 ? 'sample' : (round?.votes.includes(index) || (state.refit && state.run.finalVotes.includes(index))) ? 'vote' : 'idle'
      const item = { key: k.depthOf([peg.point.x, peg.point.y, 0], P), svg: pegSvg(peg.point, peg.height.at, state.refit && mode === 'sample' ? 'vote' : mode) }
      ;(side > config.threshold + 1.5 ? ahead : behind).push(item)
    })
    const sorted = (list) => list.sort((a, b) => a.key - b.key).map((item) => item.svg).join('')
    nodes.bed.innerHTML = sorted(behind) + frame + sorted(ahead)
    const best = state.refit ? state.run.final : round?.best.line
    const clipped = best && clipLine(best)
    nodes.scribe.innerHTML = clipped ? L(k.lineOnTop(clipped[0], clipped[1], BOARD_Z, P), { tone: state.refit ? 'hi' : 'mid' }) : ''
    nodes.needle.setAttribute('d', needle(state.turn))
    nodes.slider.innerHTML = slider(state.tally.at)
    nodes.best.innerHTML = bestStop(state.best.at)
  }

  const loop = createLoop(stage, tick)
  const idle = createIdle(() => {
    if (loop.still.matches) return
    state.touring = true
    loop.run()
  }, 6000)
  const byHand = () => {
    state.touring = false
    idle.touch()
    loop.run()
  }
  const onKey = (event) => {
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') advance()
    else if (event.key === 'r' || event.key === 'R') reset()
    else return
    event.preventDefault()
    byHand()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const { set, value } = button.dataset
    if (set === 'step') advance()
    else if (set === 'restart') reset()
    else {
      config[set] = Number(value)
      config.seedIndex = 0
      reset()
    }
    byHand()
  }
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  reset()
  if (loop.still.matches) {
    state.touring = false
    state.refit = true
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
