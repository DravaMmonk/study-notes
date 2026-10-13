// Chapter 4 (learning to see, lectures 6–8), the principles, for a player who has never trained a
// model: what "learning" does to a knob (4-1 下山), what one neuron computes and why a hidden layer
// helps (4-3 一个神经元), how a sliding window sets a layer's size and weight count (4-5 滑窗), and
// why training longer can make a model worse (4-10 什么时候停). The circuit levels around them
// (ch2-7.js, pack-learn.js) then train real kernels.

// ---------------- 4-1 下山 ----------------

// Eight samples of a brightness rule. The model is one knob (and later a second): prediction w·x
// (+ b). The loss is the mean squared error; its slope says which way is downhill.
const XS = Array.from({ length: 8 }, (_, i) => 0.2 + 0.1 * i)
const RULES = { one: (x) => 0.6 * x, two: (x) => 0.5 * x + 0.2 }
const lossOf = (rule, w, b = 0) => XS.reduce((sum, x) => sum + (w * x + b - RULES[rule](x)) ** 2, 0) / XS.length
const gradOf = (rule, w, b = 0) => {
  let gw = 0
  let gb = 0
  for (const x of XS) {
    const e = w * x + b - RULES[rule](x)
    gw += (2 * e * x) / XS.length
    gb += (2 * e) / XS.length
  }
  return { gw, gb }
}
const DESCENT_GOAL = 0.001
const DESCENT_STAGES = [
  {
    title: '自己找最低点',
    note: '第一张图里是 8 个样本：横轴是输入亮度，纵轴是要的输出。你的模型是一条线：输出 = w × 输入。拖动 w，让「误差」（每个点离线有多远，平方后取平均）降到 0.001 以下。上面的地形图里，每个旋钮位置都有一个误差高度：小球就是你的模型，白线是你能走的路（现在只有 w 一个旋钮），找最低点。',
    rule: 'one',
    mode: 'drag',
    start: { w: -1, b: 0 },
  },
  {
    title: '沿着坡往下走',
    note: '像蒙着眼睛下山：看不见谷底在哪，只能感觉脚下的坡。按「走一步」，小球朝下坡方向挪「学习率 × 坡度」。虚线弧和半透明的球告诉你这一步会落在哪。最多 5 步要走到底：学习率太小走不到，太大会冲过对面的坡。',
    rule: 'one',
    mode: 'step',
    start: { w: -1, b: 0 },
    budget: 5,
  },
  {
    title: '两个旋钮',
    note: '现在两个旋钮都能动：模型变成 输出 = w × 输入 + b，小球可以在整片地形上走。金色箭头是梯度，指向上坡最陡的方向，和第 3 章一样；每一步都朝它的反方向走。这片山谷又窄又长，试试不同的学习率，看小球怎么走。100 步之内走到误差 0.001 以下。拖动地形可以换个角度看。',
    rule: 'two',
    mode: 'step2',
    start: { w: -0.5, b: 1.2 },
    budget: 100,
  },
]
const descentStep = (stage, state, rate) => {
  const { gw, gb } = gradOf(stage.rule, state.w, state.b)
  return { w: state.w - rate * gw, b: stage.mode === 'step2' ? state.b - rate * gb : state.b }
}
// Can the stage be won with this learning rate within its step budget?
const reachesWithin = (stage, rate) => {
  let s = { ...stage.start }
  for (let i = 1; i <= stage.budget; i++) {
    s = descentStep(stage, s, rate)
    if (lossOf(stage.rule, s.w, s.b) <= DESCENT_GOAL) return i
  }
  return 0
}

const descentLevel = {
  id: '4-1',
  kind: 'board',
  board: 'Descent',
  chapter: 4,
  title: '下山',
  brief: '「训练」听起来神秘，其实是在调旋钮：模型有几个数可以调，误差告诉你调得有多差。先从一个旋钮开始，看看机器怎样自己把旋钮调对。',
  hint: '误差随 w 变化的曲线像一个碗。碗底就是答案。在碗壁上，坡度告诉你该往哪边走、还有多远。',
  after: '训练就是下山：误差（损失）是地形，所有可调的数是你的位置，梯度指向上坡最陡的方向，每一步往反方向走「学习率 × 梯度」。学习率太小要走很多步，太大就会在碗两边来回冲、越冲越远。两个旋钮时山谷又窄又长，梯度总指向谷壁，所以会走出之字形。一个卷积核有 9 个旋钮，一个网络有上百万个，原理完全一样。',
  requires: ['1-6', '3-5'],
  unlocks: [],
  descent: { xs: XS, rules: RULES, loss: lossOf, grad: gradOf, step: descentStep, goal: DESCENT_GOAL, stages: DESCENT_STAGES, rate: { min: 0.1, max: 3.5, step: 0.1 } },
  verify() {
    const [drag, step, two] = DESCENT_STAGES
    if (lossOf('one', drag.start.w) <= DESCENT_GOAL) return '第 1 步一开始就到底了'
    const reachable = Array.from({ length: 61 }, (_, i) => -1 + i * 0.05).filter((w) => lossOf('one', w) <= DESCENT_GOAL)
    if (!reachable.length) return '第 1 步拖不到底'
    const rates = Array.from({ length: 35 }, (_, i) => Math.round((0.1 + i * 0.1) * 10) / 10)
    const good = rates.filter((r) => reachesWithin(step, r))
    if (!good.length) return '第 2 步没有能用的学习率'
    if (reachesWithin(step, 0.1) || reachesWithin(step, 3.5)) return '第 2 步太小或太大的学习率也能过'
    if (!rates.some((r) => reachesWithin(two, r))) return '第 3 步没有能用的学习率'
    if (reachesWithin(two, 0.1)) return '第 3 步学习率 0.1 也能过'
    return ''
  },
}

// ---------------- 4-3 一个神经元 ----------------

// Each letter is summarised by two numbers a feature layer might measure: how much diagonal stroke
// (f1) and how much curved stroke (f2). A neuron takes a weighted sum and squashes it with the
// sigmoid into a score between 0 and 1: above 0.5 means "X".
const sigmoid = (z) => 1 / (1 + Math.exp(-z))
const LETTERS = {
  xo: [
    ['X', 0.8, 0.2], ['X', 0.7, 0.35], ['X', 0.9, 0.4], ['X', 0.6, 0.15], ['X', 0.75, 0.05],
    ['O', 0.2, 0.8], ['O', 0.3, 0.65], ['O', 0.15, 0.5], ['O', 0.4, 0.9], ['O', 0.35, 0.7],
  ],
  // X here means "one kind of stroke, not both": the two features disagree. O: they agree.
  xor: [
    ['X', 0.85, 0.15], ['X', 0.15, 0.85], ['X', 0.8, 0.25], ['X', 0.25, 0.8], ['X', 0.9, 0.3], ['X', 0.3, 0.9],
    ['O', 0.15, 0.15], ['O', 0.85, 0.85], ['O', 0.2, 0.3], ['O', 0.8, 0.75], ['O', 0.5, 0.45], ['O', 0.55, 0.6],
  ],
}
const relu = (v) => Math.max(0, v)
// The fixed hidden layer of the last step: one unit fires when f1 beats f2, the other when f2 wins.
const hidden = (f1, f2) => [relu(f1 - f2), relu(f2 - f1)]
const neuronScore = (stage, s, f1, f2) => {
  if (stage.hidden && s.hidden) {
    const [h1, h2] = hidden(f1, f2)
    return sigmoid(s.v1 * h1 + s.v2 * h2 + s.c)
  }
  return sigmoid(s.w1 * f1 + s.w2 * f2 + s.b)
}
const NEURON_STAGES = [
  {
    title: '分开 X 和 O',
    note: '每个点是一张字母图，用两个数描述：斜笔画多少（横轴）、弯笔画多少（纵轴）。神经元算 w1·斜 + w2·弯 + b，再压成 0 到 1 的分数。让所有 X 的分数大于 0.5，所有 O 小于 0.5。',
    data: 'xo',
    margin: 0.5,
  },
  {
    title: '更有把握',
    note: '同样的点，这次要 X 的分数都高于 0.9、O 都低于 0.1。分界线不用动，只是要更「肯定」。',
    data: 'xo',
    margin: 0.9,
  },
  {
    title: '一条线不够',
    note: '新的字母：X 是「只有一种笔画」，O 是「两种都有或都没有」。先试试一条线能不能分开。不行的话，打开隐藏层：两个 ReLU 神经元先把每个点变成新的两个数，再交给输出神经元。',
    data: 'xor',
    margin: 0.9,
    hidden: true,
  },
]
const NEURON_KNOBS = {
  w1: { label: '斜笔画的权重 w1', min: -20, max: 20, step: 0.5 },
  w2: { label: '弯笔画的权重 w2', min: -20, max: 20, step: 0.5 },
  b: { label: '偏置 b', min: -20, max: 20, step: 0.5 },
  v1: { label: '隐藏 1 的权重 v1', min: -20, max: 20, step: 0.5 },
  v2: { label: '隐藏 2 的权重 v2', min: -20, max: 20, step: 0.5 },
  c: { label: '输出偏置 c', min: -20, max: 20, step: 0.5 },
}
const NEURON_START = { w1: 0, w2: 0, b: 0, v1: 0, v2: 0, c: 0, hidden: false }
const pointOk = (stage, s, [label, f1, f2]) => {
  const p = neuronScore(stage, s, f1, f2)
  return label === 'X' ? p > stage.margin : p < 1 - stage.margin
}
const neuronPasses = (stage, s) => LETTERS[stage.data].every((point) => pointOk(stage, s, point))

const neuronLevel = {
  id: '4-3',
  kind: 'board',
  board: 'Neuron',
  chapter: 4,
  title: '一个神经元',
  brief: '神经网络里最小的零件是神经元：把几个输入各乘一个权重、加起来、再加一个偏置，最后压成一个 0 到 1 之间的分数。亲手调三个数，看看它到底能做什么、做不到什么。',
  hint: '分数正好是 0.5 的地方是一条直线。权重决定这条线的方向，偏置把它平移；权重整体放大，线不动，但两边的分数会更极端。',
  after: '一个神经元就是一条分界线：w1·x1 + w2·x2 + b = 0，Sigmoid 只是把离线的距离变成「有多肯定」。权重越大，判断越果断。可是「异或」这样的问题，一条直线怎么摆都分不开。隐藏层先用 ReLU 把点搬到新的坐标里（「隐藏层眼里」那张图），在那里一条线就够了：多层网络能画出弯曲的分界，靠的正是层与层之间的非线性。没有 ReLU，两层线性叠起来还是一条直线。',
  requires: ['4-2'],
  unlocks: [],
  neuron: { letters: LETTERS, stages: NEURON_STAGES, knobs: NEURON_KNOBS, start: NEURON_START, score: neuronScore, hidden, pointOk, passes: neuronPasses },
  verify() {
    const [one, two, xor] = NEURON_STAGES
    if (neuronPasses(one, NEURON_START)) return '第 1 步一开始就过了'
    const solved = { ...NEURON_START, w1: 10, w2: -10, b: 0 }
    if (!neuronPasses(one, solved) || !neuronPasses(two, solved)) return '前两步的参考答案不对'
    if (neuronPasses(two, { ...NEURON_START, w1: 2, w2: -2, b: 0 })) return '第 2 步不用加大权重也能过'
    // No line separates the XOR points: try a fine sweep of directions and offsets.
    for (let a = 0; a < 180; a += 2) {
      const [w1, w2] = [Math.cos((a * Math.PI) / 180) * 20, Math.sin((a * Math.PI) / 180) * 20]
      for (let b = -30; b <= 30; b += 0.5) {
        for (const sign of [1, -1]) if (neuronPasses(xor, { ...NEURON_START, w1: sign * w1, w2: sign * w2, b: sign * b })) return '异或用一条线也能分开'
      }
    }
    if (!neuronPasses(xor, { ...NEURON_START, hidden: true, v1: 15, v2: 15, c: -4.5 })) return '隐藏层也分不开异或'
    return ''
  },
}

// ---------------- 4-5 滑窗 ----------------

const WINDOW_N = 8
const outputSize = ({ k, s, p }) => Math.floor((WINDOW_N + 2 * p - k) / s) + 1
const WINDOW_OPTIONS = { k: [1, 3, 5], s: [1, 2, 3], p: [0, 1, 2] }
const CONV_PARAMS = 3 * 3 * 3 * 4 + 4
const DENSE_PARAMS = 8 * 8 * 3 * (8 * 8 * 4) + 8 * 8 * 4
const WINDOW_STAGES = [
  {
    title: '一样大',
    note: '一个 3×3 的窗口在 8×8 的图上滑动，每停一处算出一个输出像素。窗口不能伸出图外，所以输出比输入小。图外补几圈（补边 p）、每次挪几格（步幅 s），才能让输出还是 8×8？',
    controls: ['s', 'p'],
    target: 8,
    fixed: { k: 3 },
  },
  {
    title: '缩成 4×4',
    note: '还是 3×3 的窗口，这次要把 8×8 缩成 4×4（下一层就能看得更远、算得更少）。',
    controls: ['s', 'p'],
    target: 4,
    fixed: { k: 3 },
  },
  {
    title: '数一数参数',
    note: '输入是 8×8 的彩色图（3 个通道），这一层用 4 个 3×3 的滤波器，每个滤波器还有 1 个偏置。这一层一共有多少个要学的数？',
    controls: ['answer'],
  },
]

const windowLevel = {
  id: '4-5',
  kind: 'board',
  board: 'SlideWindow',
  chapter: 4,
  title: '滑窗',
  brief: '卷积层就是一个小窗口在图上滑：每停一处，把窗口里的数和权重相乘再加起来，得到一个输出像素。窗口多大、每次挪几格、图外补几圈，决定了输出有多大；而要学的数，只有窗口里的那几个。',
  hint: '数一数窗口能停几处：第一处靠在最左边，最后一处靠在最右边，中间每次挪 s 格。输出边长 = ⌊(N + 2p − k) / s⌋ + 1。',
  after: `输出边长 = ⌊(N + 2p − k) / s⌋ + 1：补边让窗口能停在边上，步幅大于 1 就跳着停，图随之缩小。参数只和窗口有关：每个滤波器 3×3×3 个权重加 1 个偏置，4 个滤波器共 ${CONV_PARAMS} 个，不管图有多大。要是把每个输出像素都连到每个输入像素（全连接），同样的输入输出要 ${DENSE_PARAMS.toLocaleString('en-US')} 个数。卷积靠「同一组权重到处用」省下了这些参数，也让同一个图案在哪里出现都能被认出来。`,
  requires: ['4-4'],
  unlocks: [],
  window: { n: WINDOW_N, options: WINDOW_OPTIONS, size: outputSize, stages: WINDOW_STAGES, conv: CONV_PARAMS, dense: DENSE_PARAMS, start: { k: 3, s: 1, p: 0 } },
  verify() {
    const settings = WINDOW_OPTIONS.s.flatMap((s) => WINDOW_OPTIONS.p.map((p) => ({ k: 3, s, p })))
    if (outputSize({ k: 3, s: 1, p: 0 }) === 8) return '不补边就已经一样大'
    for (const stage of WINDOW_STAGES.slice(0, 2)) if (!settings.some((x) => outputSize(x) === stage.target)) return `${stage.title}做不到`
    if (CONV_PARAMS !== 112) return '参数算错了'
    return ''
  },
}

// ---------------- 4-10 什么时候停 ----------------

// Ten noisy samples of a smooth curve, fitted by a degree-9 polynomial. Trained by gradient descent
// the fit first follows the curve, then starts bending through the noise: the error on the training
// samples keeps falling while the error on new samples (validation) turns and rises.
const STOP_D = 10
const STOP = (() => {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const truth = (x) => Math.sin(2.2 * x)
  const tx = Array.from({ length: 10 }, (_, i) => -1 + (2 * i + next()) / 10)
  const ty = tx.map((x) => truth(x) + (next() - 0.5) * 0.6)
  const vx = Array.from({ length: 40 }, (_, i) => -0.98 + (1.96 * i) / 39)
  const vy = vx.map(truth)
  return { truth, tx, ty, vx, vy }
})()
const features = (x) => Array.from({ length: STOP_D }, (_, k) => x ** k)
const predict = (w, x) => features(x).reduce((sum, f, k) => sum + f * w[k], 0)
const mse = (w, xs, ys) => xs.reduce((sum, x, i) => sum + (predict(w, x) - ys[i]) ** 2, 0) / xs.length
// Checkpoints of gradient-descent training, log-spaced from step 0 to 40 000, computed on first use.
const CHECKPOINTS = [0, ...Array.from({ length: 48 }, (_, i) => Math.round(10 ** (0.5 + (i * 4.1) / 47)))]
let trainingRun = null
const training = () => {
  if (trainingRun) return trainingRun
  let w = Array(STOP_D).fill(0)
  const out = []
  let step = 0
  for (const target of CHECKPOINTS) {
    for (; step < target; step++) {
      const g = Array(STOP_D).fill(0)
      STOP.tx.forEach((x, i) => {
        const e = predict(w, x) - STOP.ty[i]
        features(x).forEach((f, k) => (g[k] += (2 * e * f) / STOP.tx.length))
      })
      w = w.map((v, k) => v - 0.5 * g[k])
    }
    out.push({ step: target, w, train: mse(w, STOP.tx, STOP.ty), valid: mse(w, STOP.vx, STOP.vy) })
  }
  trainingRun = out
  return out
}
// Training run to the end with a penalty λ·Σw² (all but the constant): the ridge solution.
const solve = (A, b) => {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}
const regularised = (lambda) => {
  const n = STOP.tx.length
  const A = Array.from({ length: STOP_D }, (_, i) => Array.from({ length: STOP_D }, (_, j) => STOP.tx.reduce((sum, x) => sum + x ** (i + j), 0) / n + (i === j && i > 0 ? lambda : 0)))
  const b = Array.from({ length: STOP_D }, (_, i) => STOP.tx.reduce((sum, x, k) => sum + x ** i * STOP.ty[k], 0) / n)
  const w = solve(A, b)
  return { w, train: mse(w, STOP.tx, STOP.ty), valid: mse(w, STOP.vx, STOP.vy) }
}
const LAMBDAS = Array.from({ length: 25 }, (_, i) => 10 ** (-6 + i * 0.25))
const STOP_SLACK = 1.2 // within 20 % of the best validation error counts as stopping at the bottom
const STOP_STAGES = [
  {
    title: '停在哪一步',
    note: '实心点是训练用的 10 个样本（带噪声），空心点是没给模型看过的新样本。拖动「训练了多少步」，看曲线怎样变，下面两条误差线怎样走。停在新样本误差最低的那一步。',
    control: 'step',
  },
  {
    title: '给弯曲加点代价',
    note: '这次一直训练到底，但误差里多加一项：权重越大越受罚（λ × 所有权重的平方和）。调 λ，让新样本的误差尽量低。',
    control: 'lambda',
  },
]
const stopPasses = (stage, s) => {
  if (stage.control === 'step') {
    const run = training()
    const best = Math.min(...run.map((r) => r.valid))
    return run[s.step].valid <= best * STOP_SLACK
  }
  const best = Math.min(...LAMBDAS.map((l) => regularised(l).valid))
  return regularised(LAMBDAS[s.lambda]).valid <= best * STOP_SLACK
}

const stopLevel = {
  id: '4-10',
  kind: 'board',
  board: 'EarlyStop',
  chapter: 4,
  title: '什么时候停',
  brief: '训练越久，模型在训练样本上越准。可我们要的是它在没见过的新样本上也准。一个灵活的模型训练太久，会把样本里的噪声也背下来。',
  hint: '盯住两条误差线：训练误差一直往下走，新样本的误差先下降、后上升。上升的时候，模型在学什么？',
  after: '训练误差一直降，新样本（验证集）的误差却先降后升：后半段模型在背噪声，这叫过拟合。办法一是提前停止，在验证误差最低时停下；办法二是正则化，给大权重加代价（L2），让模型不愿意为了几个点把曲线拧得很弯。λ 太小拦不住过拟合，太大又让模型连真规律都学不会（欠拟合）。真正训练网络时，留一部分数据只用来验证，就是为了看到这条先降后升的线；Dropout 和数据增强也是同样的目的。',
  requires: ['4-9'],
  unlocks: [],
  stop: { data: STOP, predict, training, checkpoints: CHECKPOINTS, regularised, lambdas: LAMBDAS, stages: STOP_STAGES, passes: stopPasses, start: { step: 0, lambda: 0 } },
  verify() {
    const run = training()
    const valid = run.map((r) => r.valid)
    const bottom = valid.indexOf(Math.min(...valid))
    if (bottom === 0 || bottom === run.length - 1) return '验证误差没有先降后升'
    if (run.at(-1).train >= run[bottom].train) return '训练误差没有一直下降'
    if (stopPasses(STOP_STAGES[0], { step: 0 }) || stopPasses(STOP_STAGES[0], { step: run.length - 1 })) return '一开始或训练到底也能过'
    const good = LAMBDAS.map((_, i) => i).filter((i) => stopPasses(STOP_STAGES[1], { lambda: i }))
    if (!good.length || good.includes(0) || good.includes(LAMBDAS.length - 1)) return 'λ 的两端也能过，或者都不能过'
    return ''
  },
}

export const nodes = {}
export const levels = [descentLevel, neuronLevel, windowLevel, stopLevel]
