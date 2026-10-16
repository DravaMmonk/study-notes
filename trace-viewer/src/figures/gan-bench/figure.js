import * as k from '../kit/iso-kit.js'
import * as G from '../kit/lathe.js'
import { applyOrder, createIdle, createLoop, svgNode, t } from '../common.js'
import { BINS, REAL, SEEDS, STEPS, accuracy, binCentre, binOf, D, fakes, meanD, trajectory, value } from './model.js'

// Fig · The forgery inspection bench.
// One rack of ball columns along the x axis. Each bin holds two columns: dark balls are a batch of real
// samples (two modes), white balls are the batch the generator's two spouts just dropped. Behind the
// balls stands a comb of slats, a profile gauge whose heights trace D(x); a wire behind it marks D = ½.
// Each training step first resets the slats (D climbs V with G fixed), then slides both spouts toward
// taller slats (G climbs E[log D(G(z))] with D fixed) and drops a fresh batch. Started apart, the spouts
// split onto both modes and the comb sinks to the wire; started together, they get the same push every
// step, the white balls pile on one mode, and the comb keeps a ridge over the mode they never reach.

const W = 640
const H = 390
const UX = 24 // world units per unit of x
const BALL = 2
const COL = 2.7 // real column at −COL, fake column at +COL from a bin's centre
const FLOOR = 6
const ROD_TOP = 64
const RACK = { x: -82, w: 164 }
const SLAT_H = 60
const SLATS = Array.from({ length: 40 }, (_, i) => -78 + 4 * i)
const SLAT_Y = [-4.6, -2.4]
const WIRE_Y = -6.2
const ARM_Z = 72
const SPOUT = 6
const NOZZLES = [{ rail: -24, y: -1.3 }, { rail: 24, y: 1.3 }]
const PLATE = { x: -102, y: -40, w: 204, d: 90, r: 8 }
const RULER = { x: -80, y: 31, w: 160, d: 6, r: 1 }

const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [-86, -8, ROD_TOP + 4], [86, -8, ROD_TOP + 4], [0, -24, ARM_Z + 3]], W, H, { pad: 26, azimuth: 60 })

const at = (point) => k.iso(point, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const Dots = (points, style) => k.dotsSvg(points, style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const ball = (x, y, z, real = false) => S(G.sphereOf([x, y, z], BALL, P, { steps: 32 }), real ? { tone: 'hi', className: 'gb-real' } : { tone: 'hi' })
const edgeX = (edge) => (edge - BINS / 2) * UX * 0.5
const slatTop = (d) => FLOOR + 2 + d * SLAT_H
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

// Slot n of a bin's real or fake column, filling bottom up.
const slotOf = (bin, n, real) => [binCentre(bin) * UX + (real ? -COL : COL), 0, FLOOR + BALL + n * BALL * 2]
function slotsFor(samples, real) {
  const filled = Array(BINS).fill(0)
  return samples.map((x) => {
    const bin = binOf(x)
    return { bin, at: slotOf(bin, filled[bin]++, real) }
  })
}

// ---------- static art ----------

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 11)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))

  // The x ruler: a long tick on every bin centre, the zero mark in ink.
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(-78, 78, 3, 4, RULER.y + 0.6, 0.6, [1.8, 3.6], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(L(k.lineOnTop([0, RULER.y + 0.6], [0, RULER.y + 5], 0.6, P), { tone: 'hi' }))

  const label = { x: 62, y: 38.5, w: 22, d: 8.5, r: 1.5 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: 'faint' }))
  ;[[2.6, 14], [4.3, 10], [6, 12]].forEach(([dy, length]) => out.push(L(k.lineOnTop([label.x + 4, label.y + dy], [label.x + 4 + length, label.y + dy], 0.8, P), { tone: 'lo', free: true })))
  return out.join('')
}

// A rail for one carriage, with end stops.
function rail(y) {
  const out = [S(k.slabOf({ x: -90, y: y - 2, w: 180, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: 'mid' })]
  out.push(L(k.lineOnTop([-90, y], [90, y], 3, P), { tone: 'faint' }))
  for (const x of [-94, 90]) {
    out.push(S(k.slabOf({ x, y: y - 3.5, w: 4, d: 7, r: 1 }, 0, 6, P, 3, 0.4), { tone: 'mid' }))
    out.push(Dots([at([x + 2, y, 6])], { size: 0.42 }))
  }
  return out.join('')
}

// The rack: a floor, a cheek at each end (the left one carries the D scale), a front lip.
const rackFloor = () => S(k.slabOf({ x: RACK.x, y: -8, w: RACK.w, d: 13, r: 1.2 }, 0, FLOOR, P, 3, 0.5), { tone: 'mid', inner: L(k.sideSeam({ x: RACK.x, y: -8, w: RACK.w, d: 13, r: 1.2 }, 2.4, P, 3), { tone: 'faint' }) })
function cheek(x0) {
  const plan = { x: x0, y: -8, w: 4, d: 13, r: 0.8 }
  const out = [S(k.slabOf(plan, 0, ROD_TOP + 4, P, 2, 0.4), { tone: 'mid' })]
  out.push(Dots([at([x0 + 2, -5, ROD_TOP + 4]), at([x0 + 2, 2, ROD_TOP + 4])], { size: 0.42 }))
  if (x0 < 0) {
    // D scale on the front face, rooted on its outer edge: tenths, long at 0, ½ and 1.
    const minor = []
    const major = []
    for (let tenth = 0; tenth <= 10; tenth++) {
      const z = slatTop(tenth / 10)
      const long = tenth % 5 === 0
      ;(long ? major : minor).push(k.segment([x0, 5, z], [x0 + (long ? 2.6 : 1.4), 5, z], P))
    }
    out.push(L(minor.join(''), { tone: 'lo' }), L(major.join(''), { tone: 'mid' }))
  }
  return out.join('')
}
const rackFront = () => S(k.slabOf({ x: RACK.x, y: 2.6, w: RACK.w, d: 1, r: 0.3 }, FLOOR, 1.4, P, 2), { tone: 'mid', crease: 'none' })
  + Dots([-60, -20, 20, 60].map((x) => at([x, 3.1, FLOOR + 1.4])), { size: 0.4 })

const wireSvg = () => S(G.disc(RACK.x, RACK.x + RACK.w, 0.45, G.frameAlong([0, WIRE_Y, slatTop(0.5)], [1, 0, 0]), P, { steps: 12 }), { tone: 'mid', crease: 'none' })
const slatSvg = (x, d) => S(k.slabOf({ x: x - 1.5, y: SLAT_Y[0], w: 3, d: SLAT_Y[1] - SLAT_Y[0], r: 0.4 }, FLOOR, slatTop(d) - FLOOR, P, 2, 0.3), { tone: 'hi', crease: 'lo' })
const rodSvg = (edge) => S(k.cylinder(edgeX(edge), 0, 0.5, FLOOR, ROD_TOP - FLOOR, P, 12), { tone: 'mid', crease: 'none' })
  + S(k.cylinder(edgeX(edge), 0, 0.85, ROD_TOP, 0.8, P, 12), { tone: 'mid' })

// A carriage on its rail with a knurled knob and a post. Built at x = 0.
function carriage(index) {
  const { rail: y } = NOZZLES[index]
  const out = []
  const block = { x: -6, y: y - 4, w: 12, d: 8, r: 1.2 }
  out.push(S(k.slabOf(block, 3, 5, P, 3, 0.5), { tone: 'mid' }))
  out.push(Dots(k.corners(block, 1.8).map(([x, yy]) => at([x, yy, 8])), { size: 0.42 }))
  const side = y > 0 ? 1 : -1
  if (side > 0) {
    // The front carriage carries a knob and an index over the ruler.
    out.push(S(k.slabOf({ x: -1, y: y + 4, w: 2, d: 3.4, r: 0.4 }, 3.4, 1, P, 2), { tone: 'mid', crease: 'none' }))
    out.push(L(k.lineOnTop([0, y + 4.4], [0, y + 7], 4.4, P), { tone: 'hi' }))
  }
  out.push(S(k.cylinder(4.2, y, 2.2, 8, 3.6, P, 20), { tone: 'mid' }))
  out.push(L(k.knurl(4.2, y, 2.2, 8, 11.6, 16, P), { tone: 'lo' }))
  out.push(S(k.cylinder(-1.6, y, 2.4, 8, 1.4, P, 20), { tone: 'mid' }))
  out.push(S(k.cylinder(-1.6, y, 1.4, 9.4, ARM_Z - 9.4, P, 16), { tone: 'mid', crease: 'none', inner: L(k.sideArc(-1.6, y, 1.4, 30, P, 12), { tone: 'faint' }) }))
  return out.join('')
}
// The arm from the post over the rack, and the spout: a short turned nozzle, lit as G's output.
function arm(index) {
  const { rail: y0, y } = NOZZLES[index]
  const [a, b] = y0 < y ? [y0 - 1.4, y + 1.4] : [y - 1.4, y0 + 1.4]
  const out = [S(k.slabOf({ x: -3, y: a, w: 3, d: b - a, r: 0.8 }, ARM_Z, 2.4, P, 2, 0.4), { tone: 'mid' })]
  out.push(Dots([at([-1.6, y0, ARM_Z + 2.4])], { size: 0.45 }))
  const F = G.frameAlong([0, y, ARM_Z + 0.6], [0, 0, -1])
  out.push(S(G.solidOf([[0, 1.15], [2.2, 1.15], [2.2, 0.95, 1], [SPOUT - 1, 0.75, 1], [SPOUT, 0.7]], F, P), { tone: 'hi', lit: true }))
  out.push(S(k.slabOf({ x: -1.5, y: y - 1.6, w: 3, d: 3.2, r: 0.6 }, ARM_Z, 0.6, P, 2), { tone: 'mid', crease: 'none' }))
  return out.join('')
}

// Real balls are dark: every tone region and its seam stroke take the mid ink.
export const css = '.iso-solid.gb-real[data-seamless]>.iso-shade[data-shade]{fill:var(--anatomy-mid);stroke:var(--anatomy-mid)}'

// ---------- the live figure ----------

export const meta = { id: 'gan-bench', fig: 'Fig 16.1', title: '真伪检验台', titleEn: 'Real-or-fake bench' }

export function render({ lang = 'zh' } = {}) {
  const svg = k.figureSvg({
    width: W,
    height: H,
    label: t(
      lang,
      '真伪检验台。后排架子装着一批真实样本，分成两个峰；前排架子接住生成器两个喷嘴落下的一批假样本。两排后面立着一把轮廓规，四十根板条的高度描出判别器 D(x)，中间横着一根 D = 1/2 的细线。每一步先调整板条，再让喷嘴向板条高的地方滑动并重新落下一批小球。',
      'A real-or-fake inspection bench. The back rack holds a batch of real samples in two modes; the front rack catches a batch of fake samples dropped by the generator’s two nozzles. Behind both racks stands a profile gauge whose forty slats trace the discriminator D(x), with a thin line across it at D = 1/2. Each step first adjusts the slats, then slides the nozzles toward where the slats are high and drops a fresh batch of balls.',
    ),
    body: [
      `<defs><clipPath id="gan-drain"><path d="${k.pathOf([at([-400, 0, FLOOR]), at([400, 0, FLOOR]), at([400, 0, 400]), at([-400, 0, 400])], true)}"/></clipPath></defs>`,
      base(),
      rail(NOZZLES[0].rail),
      `<g data-part="carriage-0">${carriage(0)}</g>`,
      rackFloor(),
      cheek(RACK.x - 4),
      wireSvg(),
      '<g data-part="slats"></g>',
      `<g data-part="arm-0">${arm(0)}</g>`,
      '<g data-part="balls"></g>',
      rackFront(),
      cheek(RACK.x + RACK.w),
      rail(NOZZLES[1].rail),
      `<g data-part="carriage-1">${carriage(1)}${arm(1)}</g>`,
    ],
  })
  const controls = `<div class="fx-controls" role="group" aria-label="${t(lang, 'GAN 训练', 'GAN training')}">
    <div class="fx-control"><span>${t(lang, '起步', 'Start')}</span>${Object.entries(SEEDS).map(([id, seed]) => `<button type="button" data-set="seed" data-value="${id}">${t(lang, seed.name, seed.nameEn)}</button>`).join('')}</div>
    <div class="fx-control"><span>${t(lang, '训练', 'Train')}</span><button type="button" data-set="step" data-value="1">${t(lang, '一步 ›', 'Step ›')}</button><button type="button" data-set="run" data-value="1">${t(lang, '连续', 'Run')}</button><button type="button" data-set="reset" data-value="1">${t(lang, '重置', 'Reset')}</button></div>
  </div>
  <div class="fx-calc"><span>V(D, G) = E[log D(x)] + E[log(1 − D(G(z)))] =</span><b data-calc="v"></b><i>·</i><span>${t(lang, '平衡点', 'equilibrium')} log ¼ ≈ −1.39</span><i>·</i><span>${t(lang, 'D(真) 均值', 'mean D(real)')}</span><b data-calc="real"></b><span>${t(lang, 'D(假) 均值', 'mean D(fake)')}</span><b data-calc="fake"></b></div>`
  return k
    .plateHtml({
      fig: meta.fig,
      title: t(lang, meta.title, meta.titleEn),
      hint: t(lang, '空格一步 · 回车连续', 'Space steps · Enter runs'),
      readout: '',
      keys: [
        { mark: 'lit', label: t(lang, '生成器的两个喷嘴', 'the generator’s two nozzles') },
        { mark: 'dim', label: t(lang, '深色球：真实样本 · 白球：生成样本', 'dark balls: real samples · white balls: generated') },
        { mark: 'raised', label: t(lang, '板条高度 = D(x)', 'slat height = D(x)') },
      ],
      caption: t(
        lang,
        '每一步先训练判别器：后排真样本多的地方板条升高、前排假样本多的地方板条降低。再训练生成器：喷嘴沿板条变高的方向滑动，换一批小球落下。分开起步时两个喷嘴各占一个峰，板条全部落到 ½ 的细线上，D 准确率回到 0.5；同点起步时两个喷嘴梯度完全相同、永远分不开，假样本全堆在一个峰上，判别器在另一个峰上留着高高的脊，这就是 mode collapse。注意第 0 步 D 也是 0.5：分不清真假不等于生成器学好了。',
        'Each step trains the discriminator first: slats rise where the back rack has many real samples and drop where the front rack has many fakes. Then it trains the generator: the nozzles slide toward where the slats are rising and drop a new batch of balls. Started apart, the two nozzles each take one mode, every slat settles onto the ½ line, and D’s accuracy returns to 0.5. Started on the same spot, the two nozzles get exactly the same gradient and can never separate; all the fakes pile onto one mode while the discriminator keeps a tall ridge over the other one: this is mode collapse. Note that D is also at 0.5 at step 0: being unable to tell real from fake does not mean the generator has learned.',
      ),
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="${t(lang, '真伪检验台。空格或右方向键训练一步，回车连续训练，R 重置，C 切换起步方式。', 'Real-or-fake bench. Space or the right arrow trains one step, Enter trains continuously, R resets, C switches the start.')}">${svg}</div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${controls}`)
}

export function mount(root, { lang = 'zh' } = {}) {
  const stage = root.querySelector('.iso-stage')
  const svg = stage.querySelector('svg')
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const nodes = { slats: part('slats'), balls: part('balls'), carriages: [part('carriage-0'), part('carriage-1')], arm: part('arm-0') }
  const readout = root.querySelector('[data-readout]')
  const calc = Object.fromEntries([...root.querySelectorAll('[data-calc]')].map((node) => [node.dataset.calc, node]))
  const buttons = [...root.querySelectorAll('[data-set]')]

  const runs = { balanced: trajectory('balanced'), collapse: trajectory('collapse') }
  const slatsOf = (state) => SLATS.map((x) => D(state.d, x / UX))
  const rods = Array.from({ length: BINS + 1 }, (_, edge) => svgNode(rodSvg(edge)))
  // Real balls never move: one node each, slotted into the lanes with the fakes.
  const reals = slotsFor(REAL, true).map((slot) => ({ ...slot, node: svgNode(ball(...slot.at, true)) }))

  const state = {
    seed: 'balanced',
    shown: runs.balanced[0], // the state the bench rests in
    move: null, // { from, to, clock, falls, drains }
    queued: 0,
    running: false,
    touring: true,
    tour: 0,
    hold: 0,
    slats: slatsOf(runs.balanced[0]),
    m: [...runs.balanced[0].g.m],
    balls: [],
  }

  // A batch of fake balls: each has its nozzle, its slot and its own drop time.
  function batchOf(g, delay) {
    const samples = fakes(g)
    const slots = slotsFor(samples, false)
    const order = samples.map((_, index) => index).sort((a, b) => (a % 12) - (b % 12) || a - b)
    return slots.map((slot, index) => ({ ...slot, nozzle: index < 12 ? 0 : 1, at0: delay + order.indexOf(index) * 0.026, node: svgNode(''), drawn: '' }))
  }

  function begin(to) {
    const from = state.shown
    const drains = state.balls
    drains.forEach((item) => {
      item.draining = true
    })
    state.move = { from, to, clock: 0, slatsFrom: [...state.slats], slatsTo: slatsOf(to), mFrom: [...state.m], drains }
    state.balls = batchOf(to.g, 1.0)
  }

  const runOf = () => runs[state.seed]
  function step() {
    if (state.move) {
      state.queued = Math.min(1, state.queued + 1)
      return
    }
    const next = runOf()[state.shown.step + 1]
    if (next) begin(next)
    else state.running = false
  }
  function reset(seed = state.seed) {
    state.seed = seed
    state.queued = 0
    state.move = null
    begin(runs[seed][0])
    describe()
  }

  const T_D = 0.7
  const T_G = [0.7, 1.3]
  const T_END = 1.95
  const FALL = 0.36

  function ballAt(item, clock) {
    // Old balls sink through the floor; new ones fall from their nozzle's spout to their slot.
    if (item.draining) {
      const t = Math.max(0, clock - T_D)
      return [item.at[0], item.at[1], item.at[2] - 70 * t * t]
    }
    const t = (clock - item.at0) / FALL
    if (t < 0) return null
    const spout = [state.m[item.nozzle] * UX, NOZZLES[item.nozzle].y, ARM_Z + 0.6 - SPOUT - BALL]
    if (t >= 1) return item.at
    return [spout[0] + (item.at[0] - spout[0]) * t, spout[1] + (item.at[1] - spout[1]) * t, spout[2] + (item.at[2] - spout[2]) * t * t]
  }

  function drawBalls(clock) {
    const lanes = Array.from({ length: BINS }, () => [])
    reals.forEach((item) => lanes[item.bin].push({ node: item.node, key: k.depthOf(item.at, P) }))
    const all = [...(state.move?.drains ?? []), ...state.balls]
    for (const item of all) {
      const point = ballAt(item, clock)
      const key = point && point[2] > -6 ? point.map((v) => v.toFixed(2)).join('|') : ''
      if (key !== item.drawn) {
        item.drawn = key
        item.node.innerHTML = key ? ball(...point) : ''
        item.node.setAttribute('clip-path', 'url(#gan-drain)')
      }
      if (key) lanes[item.bin].push({ node: item.node, key: k.depthOf(point, P) })
    }
    const order = [rods[0]]
    lanes.forEach((lane, bin) => {
      lane.sort((a, b) => a.key - b.key).forEach((entry) => order.push(entry.node))
      order.push(rods[bin + 1])
    })
    applyOrder(nodes.balls, order)
  }

  function drawSlats() {
    nodes.slats.innerHTML = SLATS.map((x, i) => slatSvg(x, state.slats[i])).join('')
  }

  function drawCarriages() {
    nodes.carriages.forEach((node, index) => node.setAttribute('transform', k.translateAlong(P, [state.m[index] * UX, 0, 0])))
    nodes.arm.setAttribute('transform', k.translateAlong(P, [state.m[0] * UX, 0, 0]))
  }

  function say() {
    const s = state.shown
    const text = t(lang, `第 ${s.step} 步 · D 准确率 ${accuracy(s).toFixed(2)}`, `Step ${s.step} · D accuracy ${accuracy(s).toFixed(2)}`)
    if (readout.textContent !== text) readout.textContent = text
    calc.v.textContent = value(s).toFixed(2).replace('-', '−')
    calc.real.textContent = meanD(s, REAL).toFixed(2)
    calc.fake.textContent = meanD(s, fakes(s.g)).toFixed(2)
  }

  function describe() {
    const s = state.shown
    stage.setAttribute('aria-valuetext', t(lang, `${SEEDS[state.seed].name}，第 ${s.step} 步，D 准确率 ${accuracy(s).toFixed(2)}，喷嘴位于 ${s.g.m.map((m) => m.toFixed(1)).join(' 和 ')}`, `${SEEDS[state.seed].nameEn}, step ${s.step}, D accuracy ${accuracy(s).toFixed(2)}, nozzles at ${s.g.m.map((m) => m.toFixed(1)).join(' and ')}`))
    buttons.forEach((button) => {
      const { set, value: v } = button.dataset
      if (set === 'seed') button.setAttribute('aria-pressed', String(v === state.seed))
      if (set === 'run') button.setAttribute('aria-pressed', String(state.running))
    })
  }

  // Tour: train apart to balance, hold, then train from one spot into collapse, hold.
  const TOUR = [
    { seed: 'balanced', steps: 9 },
    { seed: 'collapse', steps: 12 },
  ]

  function tick(dt, calm) {
    let moving = false
    const move = state.move
    if (move) {
      move.clock = calm ? T_END : move.clock + dt
      const c = move.clock
      const dPhase = ease(c / T_D)
      state.slats = move.slatsTo.map((to, i) => move.slatsFrom[i] + (to - move.slatsFrom[i]) * dPhase)
      const gPhase = ease((c - T_G[0]) / (T_G[1] - T_G[0]))
      state.m = move.to.g.m.map((to, i) => move.mFrom[i] + (to - move.mFrom[i]) * gPhase)
      drawSlats()
      drawCarriages()
      drawBalls(c)
      if (c >= T_END) {
        state.shown = move.to
        state.move = null
        describe()
        if (state.queued > 0) {
          state.queued -= 1
          step()
        }
      }
      moving = true
    } else if ((state.running || state.touring) && !calm) {
      state.hold += dt
      const goal = state.touring ? TOUR[state.tour].steps : STEPS
      if (state.shown.step >= goal) {
        if (state.touring && state.hold > 2.8) {
          state.tour = (state.tour + 1) % TOUR.length
          state.hold = 0
          reset(TOUR[state.tour].seed)
        } else if (!state.touring) {
          state.running = false
          describe()
        }
      } else if (state.hold > (state.touring ? 0.35 : 0.1)) {
        state.hold = 0
        step()
      }
      moving = state.running || state.touring
    }
    say()
    return moving
  }

  const loop = createLoop(stage, tick)
  // The tour resumes from wherever the reader left the bench, but never cuts into a run they started.
  const idle = createIdle(() => {
    if (loop.still.matches) return
    if (state.running) {
      idle.touch()
      return
    }
    state.touring = true
    state.hold = 0
    state.tour = Math.max(0, TOUR.findIndex((leg) => leg.seed === state.seed))
    loop.run()
  }, 7000)
  const byHand = () => {
    state.touring = false
    idle.touch()
    describe()
    loop.run()
  }
  const toggleRun = () => {
    state.running = !state.running
    if (state.running && state.shown.step >= STEPS) reset()
  }
  const onKey = (event) => {
    if (event.key === ' ' || event.key === 'ArrowRight') {
      state.running = false
      step()
    } else if (event.key === 'Enter') toggleRun()
    else if (event.key === 'r' || event.key === 'R') reset()
    else if (event.key === 'c' || event.key === 'C') reset(state.seed === 'collapse' ? 'balanced' : 'collapse')
    else return
    event.preventDefault()
    byHand()
  }
  const onButton = (event) => {
    const button = event.target.closest('[data-set]')
    if (!button) return
    const { set, value: v } = button.dataset
    if (set === 'seed') {
      state.running = false
      reset(v)
    } else if (set === 'step') {
      state.running = false
      step()
    } else if (set === 'run') toggleRun()
    else if (set === 'reset') reset()
    byHand()
  }
  stage.addEventListener('keydown', onKey)
  root.addEventListener('click', onButton)

  if (loop.still.matches) {
    // Reduced motion: rest on a collapsed run, where the gauge's lone ridge tells the story.
    state.touring = false
    state.seed = 'collapse'
    state.shown = runs.collapse[12]
    state.slats = slatsOf(state.shown)
    state.m = [...state.shown.g.m]
    state.balls = batchOf(state.shown.g, 0)
    drawSlats()
    drawCarriages()
    drawBalls(99)
  } else {
    reset('balanced')
  }
  describe()
  tick(1 / 60, loop.still.matches)
  loop.run()

  return () => {
    loop.stop()
    idle.clear()
    stage.removeEventListener('keydown', onKey)
    root.removeEventListener('click', onButton)
  }
}
