// The pull-and-push bench. A linear encoder maps each image to a 2-D vector z = W·f + b, shown on
// the unit circle as z/‖z‖. f is the image blurred, halved and centred. Each training step draws a fresh mini-batch:
// every base image gets two random views (shift ±1, brightness, contrast, noise). The loss per anchor a, with sim
// the cosine and τ the temperature, is
//   ℓ_a = −sim(a, a⁺)/τ  +  log Σ_{k≠a} exp(sim(a, k)/τ)
// The first term pulls the positive pair together; the second (InfoNCE's denominator) pushes every other view away.
// Dropping it leaves a loss that every collapsed encoder minimises.
import { S } from '../../../engine/schema.js'
import { limitOf } from '../../../engine/bench.js'
import { correlate, downsample, gaussianKernel, map, random, shift } from '../engine/image.js'
import { picture } from '../items/pictures.js'

const t = (zh, en) => ({ zh, en })

/**
 * The bench's model. names, base: the base images and their names; tau: the temperature; rate: the step size; goal:
 * every test view must pick its partner with at least this softmax probability; collapse: a mean cosine between
 * different images above this counts as collapsed; testSeeds: the batches of the quiz, never trained on.
 */
export function contrastBench({ names, base, tau: TAU, rate: RATE, goal: GOAL, collapse: COLLAPSE, testSeeds: TEST_SEEDS }) {
  const NAMES = names
  const BASE = base
  const DIM = (BASE[0].w / 2) * (BASE[0].h / 2)
  const BLUR = gaussianKernel(1)

  const features = (img) => {
    const d = downsample(correlate(img, BLUR, 'edge'), 2).data
    const mean = d.reduce((a, b) => a + b, 0) / d.length
    return Array.from(d, (v) => (v - mean) * 2)
  }

  const augment = (img, next) => {
    const dx = Math.floor(next() * 3) - 1
    const dy = Math.floor(next() * 3) - 1
    const gain = 0.7 + 0.5 * next()
    const offset = (next() - 0.5) * 0.2
    return map(shift(img, dx, dy, 'edge'), (v) => v * gain + offset + (next() - 0.5) * 0.1)
  }

  // views: 2N entries, image i's two views at 2i and 2i + 1. Batches are cached by seed.
  const cache = new Map()
  const batch = (seed) => {
    if (cache.has(seed)) return cache.get(seed)
    const next = random(seed)
    const views = []
    BASE.forEach((img, i) => {
      for (let k = 0; k < 2; k++) {
        const view = augment(img, next)
        views.push({ image: i, img: view, f: features(view) })
      }
    })
    if (cache.size > 600) cache.clear()
    cache.set(seed, views)
    return views
  }

  const init = (seed = 7) => {
    const next = random(seed)
    return { W: Array.from({ length: 2 }, () => Array.from({ length: DIM }, () => (next() - 0.5) * 0.6)), b: [0.4, -0.2] }
  }

  const encode = (model, f) => {
    const z = model.W.map((row, k) => row.reduce((sum, w, i) => sum + w * f[i], model.b[k]))
    const n = Math.hypot(z[0], z[1]) || 1e-9
    return { z, n, u: [z[0] / n, z[1] / n] }
  }

  const cos = (a, b) => a[0] * b[0] + a[1] * b[1]

  // Row a of the choice: softmax over every other view k of sim(a, k)/τ.
  const choice = (us, a) => {
    const s = us.map((u, k) => (k === a ? -Infinity : cos(us[a], u) / TAU))
    const top = Math.max(...s)
    const e = s.map((x) => Math.exp(x - top))
    const total = e.reduce((x, y) => x + y, 0)
    return e.map((x) => x / total)
  }

  // One gradient step on a batch. push = false drops the denominator: only positives pulled together.
  const step = (model, views, push) => {
    const enc = views.map((v) => encode(model, v.f))
    const us = enc.map((e) => e.u)
    const M = views.length
    const gu = us.map(() => [0, 0])
    let loss = 0
    for (let a = 0; a < M; a++) {
      const pos = a ^ 1
      loss += -cos(us[a], us[pos]) / TAU / M
      gu[a][0] -= us[pos][0] / TAU / M
      gu[a][1] -= us[pos][1] / TAU / M
      gu[pos][0] -= us[a][0] / TAU / M
      gu[pos][1] -= us[a][1] / TAU / M
      if (!push) continue
      const p = choice(us, a)
      const s = us.map((u, k) => (k === a ? -Infinity : cos(us[a], u) / TAU))
      const top = Math.max(...s)
      loss += (top + Math.log(s.reduce((sum, x) => sum + Math.exp(x - top), 0))) / M
      for (let k = 0; k < M; k++) {
        if (k === a) continue
        const c = p[k] / TAU / M
        gu[a][0] += c * us[k][0]
        gu[a][1] += c * us[k][1]
        gu[k][0] += c * us[a][0]
        gu[k][1] += c * us[a][1]
      }
    }
    const gW = model.W.map((row) => row.map(() => 0))
    const gb = [0, 0]
    views.forEach((v, i) => {
      const { u, n } = enc[i]
      const g = gu[i]
      const along = cos(g, u)
      const gz = [(g[0] - along * u[0]) / n, (g[1] - along * u[1]) / n]
      for (let k = 0; k < 2; k++) {
        gb[k] += gz[k]
        for (let j = 0; j < DIM; j++) gW[k][j] += gz[k] * v.f[j]
      }
    })
    return {
      loss,
      model: { W: model.W.map((row, k) => row.map((w, j) => w - RATE * gW[k][j])), b: model.b.map((x, k) => x - RATE * gb[k]) },
    }
  }

  // The quiz: fresh views never trained on. Each view must choose its partner among all other views.
  const evaluate = (model) => {
    let worst = 1
    let correct = 0
    let total = 0
    let negative = 0
    let negatives = 0
    let positive = 0
    for (const seed of TEST_SEEDS) {
      const us = batch(seed).map((v) => encode(model, v.f).u)
      us.forEach((u, a) => {
        const p = choice(us, a)
        worst = Math.min(worst, p[a ^ 1])
        if (p.indexOf(Math.max(...p)) === (a ^ 1)) correct += 1
        total += 1
        us.forEach((w, k) => {
          if (k === a) return
          if (k === (a ^ 1)) positive += cos(u, w) / us.length
          else {
            negative += cos(u, w)
            negatives += 1
          }
        })
      })
    }
    const mean = negative / negatives
    return { worst, correct, total, positive: positive / TEST_SEEDS.length, negative: mean, collapsed: mean > COLLAPSE, pass: worst >= GOAL && mean <= COLLAPSE }
  }

  // Training draws batch 1000 + t at step t, so a run is reproducible from its step count.
  const train = (model, from, steps, push) => {
    let next = model
    const losses = []
    for (let t = from; t < from + steps; t++) {
      const result = step(next, batch(1000 + t), push)
      next = result.model
      losses.push(result.loss)
    }
    return { model: next, losses }
  }

  return { NAMES, BASE, TAU, GOAL, COLLAPSE, batch, init, encode, choice, step, train, evaluate }
}

const QUIZ_SEED = 901

/** The bench model: knob `push` (InfoNCE's denominator on or off); acts train (arg: steps) and reset. */
export const contrast = {
  about: t('拉近与推开：没有标签，训练编码器让每张图的两个变形版本互相认出；旋钮 push；算出 worst（认对搭档的最低概率）、negative（负对平均 sim）', 'pull close, push apart: with no labels, train an encoder so two altered views of each picture find each other; knob push; computes worst (the lowest chance of picking the partner) and negative (the mean sim of negative pairs)'),
  setup: S.obj({ names: S.list(S.str()), base: S.list(S.call('picture')), tau: S.num(), rate: S.num(), testSeeds: S.list(S.int()) }),
  make({ base, ...p }, bench) {
    const m = contrastBench({ ...p, base: base.map(picture), goal: limitOf(bench.goal, 'worst').atLeast, collapse: limitOf(bench.goal, 'negative').atMost })
    const quiz = m.batch(QUIZ_SEED)
    return {
      ...m,
      quiz,
      start: () => ({ model: m.init(), t: 0, losses: [] }),
      act(state, name, v, steps) {
        if (name === 'reset') return { model: m.init(), t: 0, losses: [] }
        const result = m.train(state.model, state.t, steps, v.push)
        return { model: result.model, t: state.t + steps, losses: [...state.losses, ...result.losses].slice(-120) }
      },
      view(v, { process: state }) {
        const us = quiz.map((q) => m.encode(state.model, q.f).u)
        const report = m.evaluate(state.model)
        const tail = [' · ', t('正对平均 sim', 'mean sim of positive pairs'), ' ', { b: report.positive.toFixed(2) }]
        return {
          worst: report.worst,
          negative: report.negative,
          steps: t(`第 ${state.t} 步`, `Step ${state.t}`),
          angles: us.map((u) => Math.atan2(u[1], u[0])),
          rows: us.map((_, a) => m.choice(us, a)),
          losses: state.losses,
          lossNote: state.losses.length < 2 ? [t('训练后在此显示损失曲线', 'The loss curve appears here after training'), ...tail] : [t('损失', 'Loss'), ' ', { b: state.losses.at(-1).toFixed(2) }, ' · ', t(`最近 ${state.losses.length} 步`, `last ${state.losses.length} steps`), ...tail],
          formula: ['ℓ = ', '−sim(a, a⁺)/τ', ' ', { off: !v.push, text: ['+ log Σ', { sub: 'k≠a' }, ' exp(sim(a, k)/τ)'] }],
          matrixTitle: [t(`每行在其余 ${us.length - 1} 个视图里选搭档`, `Each row picks a partner from the other ${us.length - 1} views`), ` · τ = ${m.TAU}`],
          say: report.collapsed
            ? { tone: 'fail', text: t('坍缩：所有视图都挤向同一方向，彼此无法区分。', 'Collapsed: every view is squeezed into the same direction, so none can be told apart.') }
            : report.pass
              ? { tone: 'pass', text: t('通过：每个视图都能认出自己的搭档。', 'Passed: every view recognises its partner.') }
              : { text: state.t ? t('继续训练，观察各点的移动方向。', 'Keep training and watch where the dots move.') : t('尚未训练：编码器的权重是随机的。', 'Not trained yet: the encoder weights are random.') },
        }
      },
    }
  },
  verify(m) {
    if (m.evaluate(m.init()).pass) return 'the untrained encoder already passes'
    // InfoNCE reaches the goal within 200 steps (ten presses of 训练 20 步).
    let model = m.init()
    let reached = -1
    for (let step = 0; step < 200 && reached < 0; step += 20) {
      model = m.train(model, step, 20, true).model
      if (m.evaluate(model).pass) reached = step + 20
    }
    if (reached < 0) return 'InfoNCE does not reach the goal in 200 steps'
    // Pulling positives alone never passes and ends collapsed, even after twice as long.
    model = m.init()
    for (let step = 0; step < 400; step += 20) {
      model = m.train(model, step, 20, false).model
      if (m.evaluate(model).pass) return `pull-only passes at step ${step + 20}`
    }
    const end = m.evaluate(model)
    if (!end.collapsed) return `pull-only did not collapse (mean negative cosine ${end.negative.toFixed(2)})`
    return ''
  },
}
