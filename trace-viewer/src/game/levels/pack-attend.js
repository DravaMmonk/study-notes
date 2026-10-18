// Attend pack: chapter 5 · 全局视野 (lectures 9–10, ViT and representation learning).
//   5-1 补全对角  — self-attention over 4×4 patch tokens reaches across the image in one step.
//   5-2 顺序盲    — attention without position sees a bag of patches; a position code fixes order.
//   5-3 拉近与推开 — contrastive learning on a 2-D embedding circle; pulling positives alone collapses.
// The attention maths lives in engine/attention.js; the contrastive model is pure JS below and is
// attached to its level as `model`, so the board only draws and the validator can prove the lesson.
import { attention, positionCode } from '../engine/attention.js'
import { GLYPHS, correlate, downsample, fromFn, gaussianKernel, map, patterns as P, random, shift } from '../engine/image.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { build, test } from './util.js'

// ---------------- new parts ----------------

export const nodes = {
  attention: {
    label: { zh: '注意力', en: 'Attention' },
    description: {
      zh: '切成 4×4 图块；每块按 softmax(q·k/√d) 对所有块的 v 加权平均。只接 Q 时，K、V 也用它',
      en: "Cuts the image into 4×4 patches; each patch takes the average of every patch's v, weighted by softmax(q·k/√d). With only Q wired, K and V use it too",
    },
    inputs: ['Q', 'K', 'V'],
    optional: ['K', 'V'],
    params: [{ key: 's', label: { zh: 'q 放大', en: 'q scale' }, kind: 'number', min: 0, max: 100, step: 1, default: 1 }],
    eval: ({ Q, K, V }, p) => attention(Q, K ?? Q, V ?? K ?? Q, p.s ?? 1),
    cost: 32,
    unlock: 'attention',
  },
  posenc: {
    label: { zh: '位置编码', en: 'Positional encoding' },
    description: { zh: '按阅读顺序第 i 个图块，每格加上 g·i', en: 'Adds g·i to every pixel of the i-th patch in reading order' },
    inputs: ['in'],
    params: [{ key: 'g', label: 'g', kind: 'number', min: 0, max: 0.2, step: 0.01, default: 0.05 }],
    eval: ({ in: a }, p) => positionCode(a, p.g ?? 0.05),
    cost: 1,
    unlock: 'posenc',
  },
}
// Registered here as well as by index.js, so the reference graphs below can be built at load time.
Object.assign(NODE_TYPES, nodes)

// ---------------- 5-1 · 补全对角 ----------------
// Binary 4×4 patterns placed on the 4×4 grid of patches. One pattern sits in two opposite corners and
// one copy has a few pixels erased. The erased copy is as similar to its far twin as to itself, so
// attention hands it half of the twin; nothing local can reach 12 pixels away within the node budget.

const TILES = {
  X: ['#..#', '.##.', '.##.', '#..#'],
  C: ['####', '#...', '#...', '#...'],
  P: ['.#..', '####', '.#..', '.#..'],
  K: ['##..', '##..', '..##', '..##'],
  R: ['.##.', '#..#', '#..#', '.##.'],
  S: ['#...', '##..', '###.', '####'],
}

// items: [tile, row, col, erased [u, v] pixels]
const tiled = (items) =>
  fromFn(16, 16, (x, y) => {
    for (const [name, row, col, erased = []] of items) {
      if (Math.floor(x / 4) !== col || Math.floor(y / 4) !== row) continue
      const u = x % 4
      const v = y % 4
      if (erased.some(([eu, ev]) => eu === u && ev === v)) return 0
      return TILES[name][v][u] === '#' ? 1 : 0
    }
    return 0
  })

const repaired = (items) => tiled(items.map(([name, row, col]) => [name, row, col]))

const CORNERS = [
  [{ zh: '左上缺', en: 'Top left erased' }, [['X', 0, 0, [[0, 0], [1, 1], [3, 3]]], ['X', 3, 3], ['C', 0, 3], ['P', 2, 1]]],
  [{ zh: '右下缺', en: 'Bottom right erased' }, [['R', 0, 0], ['R', 3, 3, [[1, 0], [0, 1], [3, 2]]], ['K', 1, 2], ['S', 3, 0]]],
  [{ zh: '右上缺', en: 'Top right erased' }, [['S', 0, 3, [[0, 3], [1, 3], [2, 2]]], ['S', 3, 0], ['X', 1, 1], ['R', 2, 3]]],
  [{ zh: '两对都缺', en: 'Both pairs erased' }, [['C', 0, 0, [[0, 0], [3, 0]]], ['C', 3, 3], ['K', 0, 3], ['K', 3, 0, [[0, 1], [3, 3], [2, 2]]]]],
  [{ zh: '没缺', en: 'Nothing erased' }, [['P', 0, 0], ['P', 3, 3], ['R', 1, 2], ['C', 2, 0]]],
]

// Held back: the anti-diagonal pair erased at the bottom left, and a scene with all four corners
// filled so the erased tile has neighbours to mistake for its twin.
const CORNERS_HIDDEN = [
  [{ zh: '左下缺', en: 'Bottom left erased' }, [['K', 3, 0, [[0, 0], [1, 1], [2, 2]]], ['K', 0, 3], ['R', 1, 1], ['C', 2, 2]]],
  [{ zh: '四角都有', en: 'All four corners filled' }, [['P', 0, 3, [[1, 1], [1, 3]]], ['P', 3, 0], ['X', 0, 0], ['S', 3, 3], ['C', 1, 2]]],
]

const level51 = {
  id: '5-1',
  chapter: 5,
  title: { zh: '补全对角', en: 'Mend across the diagonal' },
  brief: {
    zh: '一对对角上本是同一个图案，其中一个被擦掉了几格。把它补回来，其余不变；最多 3 个节点。',
    en: 'Two opposite corners hold the same pattern, but a few pixels of one copy have been erased. Restore them and leave everything else unchanged; at most 3 nodes.',
  },
  hint: {
    zh: '3×3 的元件一次只看一格远。「注意力」把图切成 4×4 的图块，每块按相似度对所有图块加权平均；q 放大越大，越只看最像的几块。',
    en: 'A 3×3 part only sees one pixel away at a time. "Attention" cuts the image into 4×4 patches and gives each patch an average of all the patches, weighted by similarity; the larger the q scale, the more it looks only at the few most similar ones.',
  },
  after: {
    zh: '被擦的那块和远处的孪生块最像，于是一步就从对角取回了缺的格子。这就是自注意力：每个图块（token）用 q·k/√d 和所有图块打分，softmax 把分数变成和为 1 的权重，再对 v 加权平均。3×3 卷积叠 L 层也只看到 (2L+1)×(2L+1)。',
    en: 'The erased patch looks most like its far-off twin, so in one step it fetched the missing pixels from the opposite corner. That is self-attention: each patch (token) scores every patch with q·k/√d, softmax turns the scores into weights that sum to 1, and the v are averaged with those weights. Stack L layers of 3×3 convolution and you still only see (2L+1)×(2L+1).',
  },
  requires: ['4-6'],
  unlocks: ['attention'],
  palette: ['attention', 'shift', 'box3', 'add', 'scale', 'threshold'],
  constraint: (score) => (score.nodes > 3 ? { zh: `用了 ${score.nodes} 个节点，最多 3 个`, en: `${score.nodes} nodes used; at most 3` } : ''),
  tests: CORNERS.map(([label, items]) => test(label, { in: tiled(items) }, { out: repaired(items) })),
  hidden: CORNERS_HIDDEN.map(([label, items]) => test(label, { in: tiled(items) }, { out: repaired(items) })),
  solution: build({ a: ['attention', { s: 8 }], t: ['threshold', { t: 0.3 }] }, ['in>a.Q', 'a>t', 't>out']),
  naive: build({ b: 'box3', c: 'box3', t: ['threshold', { t: 0.2 }] }, ['in>b', 'b>c', 'c>t', 't>out']),
  alsoFails: [
    // q·k too flat: every patch averages the whole image.
    build({ a: ['attention', { s: 1 }], t: ['threshold', { t: 0.3 }] }, ['in>a.Q', 'a>t', 't>out']),
    // The erased pixels come back at exactly one half; a 0.5 threshold throws them away again.
    build({ a: ['attention', { s: 8 }], t: ['threshold', { t: 0.5 }] }, ['in>a.Q', 'a>t', 't>out']),
    build({ t: ['threshold', { t: 0.5 }] }, ['in>t', 't>out']),
  ],
}

// ---------------- 5-2 · 顺序盲 ----------------
// Grey patches, one bright and one dark. Every test comes with its twin: the same two patches swapped.
// Pixel-wise parts and attention are both blind to which token is where, so without a position code
// the twin's output is just the same patches in swapped places — but the answers are opposite.

const GREY = 0.5
const orderScene = (bright, dark) => fromFn(16, 16, (x, y) => {
  const i = Math.floor(y / 4) * 4 + Math.floor(x / 4)
  return i === bright ? 0.9 : i === dark ? 0.1 : GREY
})
const ORDER_PAIRS = [[1, 2], [5, 9], [3, 12]]
const orderTest = ([bright, dark]) =>
  test({ zh: `亮 ${bright + 1} · 暗 ${dark + 1}`, en: `Bright ${bright + 1} · dark ${dark + 1}` }, { in: orderScene(bright, dark) }, { out: fromFn(16, 16, () => (bright < dark ? 1 : 0)) })
const ORDER_TESTS = ORDER_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]]).map(orderTest)
// Held back: neighbours across a row break (later column, earlier row), one directly above the
// other, and the two far corners, so reading columns only, or rows only, is caught.
const ORDER_HIDDEN = [[7, 8], [10, 6], [15, 0]].map(orderTest)

// Two heads: one whose Q·K finds the brightest patch, one (on the negative) the darkest. Both carry V
// with the position code, so their difference is −0.8 + g·(dark − bright).
const orderGraph = ({ position = 'v', s = 60 } = {}) => {
  const n = {
    inv: 'invert',
    hb: ['attention', { s }],
    hd: ['attention', { s }],
    d: 'sub',
    t: ['threshold', { t: -0.775 }],
  }
  const w = ['in>inv', 'hd>d.a', 'hb>d.b', 'd>t', 't>out']
  if (position === 'none') w.push('in>hb.Q', 'inv>hd.Q', 'in>hd.V')
  if (position === 'v') {
    n.p = ['posenc', { g: 0.05 }]
    w.push('in>p', 'in>hb.Q', 'p>hb.V', 'inv>hd.Q', 'p>hd.V')
  }
  if (position === 'qk') {
    n.p = ['posenc', { g: 0.05 }]
    n.ip = 'invert'
    w.push('in>p', 'p>ip', 'p>hb.Q', 'in>hb.V', 'ip>hd.Q', 'in>hd.V')
  }
  return build(n, w)
}

const level52 = {
  id: '5-2',
  chapter: 5,
  title: { zh: '顺序盲', en: 'Blind to order' },
  brief: {
    zh: '按阅读顺序（先左后右，再从上到下），亮块排在暗块前面就整张图输出 1，否则输出 0。',
    en: 'In reading order (left to right, then top to bottom), if the bright patch comes before the dark one, output 1 over the whole image; otherwise output 0.',
  },
  hint: {
    zh: 'Q、K 决定看谁，V 决定带回什么。要让结果知道亮块和暗块各在哪儿，位置该从哪一路进来？',
    en: 'Q and K decide whom to look at; V decides what comes back. For the result to know where the bright and dark patches sit, which input should carry the position?',
  },
  after: {
    zh: '没有位置时，把两个图块对调，注意力的输出也只是跟着对调：它看到的是一袋图块，不是一串。加上位置编码 z̃ᵢ = zᵢ + pᵢ，每个图块带着自己的地址，顺序才进得了计算。ViT 在进入第一层之前就把位置加到每个图块上。',
    en: "Without position, swap two patches and attention's output just swaps with them: it sees a bag of patches, not a sequence. Add a positional encoding z̃ᵢ = zᵢ + pᵢ and every patch carries its own address, so order can enter the computation. ViT adds the position to every patch before the first layer.",
  },
  requires: ['5-1'],
  unlocks: ['posenc'],
  palette: ['attention', 'posenc', 'invert', 'sub', 'add', 'scale', 'offset', 'threshold'],
  tests: ORDER_TESTS,
  hidden: ORDER_HIDDEN,
  solution: orderGraph({ position: 'v' }),
  naive: orderGraph({ position: 'none' }),
  // The position only steers who is looked at; what comes back carries no address.
  alsoFails: [orderGraph({ position: 'qk' })],
}

// ---------------- 5-3 · 拉近与推开 ----------------
// A linear encoder maps each image to a 2-D vector z = W·f + b, shown on the unit circle as z/‖z‖.
// f is the image blurred, halved to 8×8 and centred (64 numbers). Each training step draws a fresh
// mini-batch: every base image gets two random views (shift ±1, brightness, contrast, noise). The loss
// per anchor a, with sim the cosine and τ the temperature, is
//   ℓ_a = −sim(a, a⁺)/τ  +  log Σ_{k≠a} exp(sim(a, k)/τ)
// The first term pulls the positive pair together; the second (InfoNCE's denominator) pushes every
// other view away. Dropping it leaves a loss that every collapsed encoder minimises.

const contrast = (() => {
  const NAMES = ['T', 'L', 'X', 'O', 'F']
  const BASE = NAMES.map((name) => P.glyph(GLYPHS[name], 0.1, 0.9))
  const TAU = 0.2
  const RATE = 0.5
  const DIM = 64
  const GOAL = 0.5 // every test view must pick its partner with at least this softmax probability
  const COLLAPSE = 0.9 // mean cosine between different images above this = collapsed
  const TEST_SEEDS = [901, 902, 903]
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

  const verify = () => {
    if (evaluate(init()).pass) return 'the untrained encoder already passes'
    // InfoNCE reaches the goal within 200 steps (ten presses of 训练 20 步).
    let model = init()
    let reached = -1
    for (let t = 0; t < 200 && reached < 0; t += 20) {
      model = train(model, t, 20, true).model
      if (evaluate(model).pass) reached = t + 20
    }
    if (reached < 0) return 'InfoNCE does not reach the goal in 200 steps'
    // Pulling positives alone never passes and ends collapsed, even after twice as long.
    model = init()
    for (let t = 0; t < 400; t += 20) {
      model = train(model, t, 20, false).model
      if (evaluate(model).pass) return `pull-only passes at step ${t + 20}`
    }
    const end = evaluate(model)
    if (!end.collapsed) return `pull-only did not collapse (mean negative cosine ${end.negative.toFixed(2)})`
    return ''
  }

  return { NAMES, BASE, TAU, GOAL, COLLAPSE, batch, init, encode, choice, step, train, evaluate, verify }
})()

const level53 = {
  id: '5-3',
  kind: 'board',
  board: 'AttendContrast',
  chapter: 5,
  title: { zh: '拉近与推开', en: 'Pull close, push apart' },
  brief: {
    zh: '没有标签，只有每张图的两个变形版本。训练编码器，让测验里的每个视图都以 ≥ 50% 的概率认出自己的搭档。',
    en: 'No labels, only two altered versions of each image. Train the encoder so that every view in the quiz picks out its partner with probability ≥ 50%.',
  },
  hint: { zh: '只拉近搭档，最省事的办法是什么？看看所有点最后去了哪里。', en: 'If you only pull partners together, what is the laziest way to do it? Watch where all the dots end up.' },
  after: {
    zh: '只拉近正对时，把所有图都放到同一点就能让损失最小，却什么也分不出：这叫坍缩。InfoNCE 的分母把同一批里的其他视图当作负对推开，点才在圆上散开。变形本身提供了答案，不需要人工标签：这就是自监督的对比学习（SimCLR）。',
    en: "When only positive pairs are pulled together, putting every image at the same point minimises the loss but tells nothing apart: this is called collapse. InfoNCE's denominator treats the other views in the batch as negative pairs and pushes them away, so the dots spread out round the circle. The alterations themselves supply the answer, with no human labels: this is self-supervised contrastive learning (SimCLR).",
  },
  requires: ['5-2'],
  unlocks: [],
  model: contrast,
  verify: contrast.verify,
}

export const levels = [level51, level52, level53]
