// 第 8 章 · 画出没见过的图 (lectures 15–17). An autoencoder squeezes blobs into two numbers; its latent space can be
// walked and sampled, and reparameterisation makes sampling trainable; a GAN is played on a bench. Diffusion comes
// in as formulas the player builds: adding noise in one step, two steps as one, and getting x₀ back, which the
// series turns into restoring a noisy letter with a noise guess the player trains.
import { GLYPHS, fromFn, image, patterns as P, random, zip } from '../../kit/domains/image/engine/image.js'
import { ENCODER_START, blob, blobAt, code, gaussian } from '../../kit/domains/image/engine/parts/generative.js'
import { NODE_TYPES } from '../../kit/domains/image/engine/nodes.js'
import { ganBench } from '../../kit/domains/image/benches/gan.js'
import { build, test } from '../../kit/domains/image/build.js'





// ---------------- 8-6 骗过鉴定员 (bench): a two-pen generator against a discriminator =======================

// Real data: two humps at ±2 (σ = 0.35), 64 samples each. The bench (kit/domains/image/benches/gan.js) starts on a
// rhythm that collapses to one hump; a slower generator and a stronger discriminator win.
export const ganModel = ganBench({
  n: 64,
  mode: 2,
  width: 0.35,
  rateD: 2,
  start: [0.4, 0.9],
  win: 3,
  options: { dSteps: [1, 3, 10], gSteps: [1, 3, 10], gRate: [0.2, 0.5, 1, 2] },
  fallback: { dSteps: 1, gSteps: 10, gRate: 1 },
  good: { dSteps: 3, gSteps: 1, gRate: 0.5 },
})

function verifyGan() {
  const m = ganModel
  const play = (schedule, turns) => {
    let s = m.start()
    let collapsed = false
    for (let i = 0; i < turns; i++) {
      s = m.turn(s, schedule)
      const r = m.measure(s)
      if (r.left > 0.9 || r.right > 0.9) collapsed = true
      if (s.streak >= m.WIN) return { won: i + 1, collapsed, s }
    }
    return { won: 0, collapsed, s }
  }
  const naive = play(m.DEFAULT, 300)
  if (naive.won) return `默认节奏第 ${naive.won} 回合就过关了`
  if (!naive.collapsed) return '默认节奏没有出现模式坍塌'
  const good = play(m.GOOD, 60)
  if (!good.won) return '推荐节奏 60 回合内没有过关'
  const r = m.measure(good.s)
  if (Math.abs(r.accuracy - 0.5) > 0.05) return '过关时鉴定员准确率不在 0.5 附近'
  return ''
}

// 8-1 test images: blobs spread in both directions, so no single line through them fits.
// Sixteen blobs on a slightly staggered 4×4 grid over the middle of the image. Six used to be too few: they
// could not pin down the encoder's weights, so a trained encoder only knew the places it had seen.
const AE_POSITIONS = [[3.5, 3.5], [3.8, 6.33], [3.5, 9.17], [3.8, 12], [6.33, 3.7], [6.63, 6.53], [6.33, 9.37], [6.63, 12.2], [9.17, 3.5], [9.47, 6.33], [9.17, 9.17], [9.47, 12], [12, 3.7], [12.3, 6.53], [12, 9.37], [12.3, 12.2]]
const aeTests = AE_POSITIONS.map(([x, y], i) => {
  const img = blob(x, y)
  return test({ zh: `斑点 ${i + 1}`, en: `Blob ${i + 1}` }, { in: img }, { out: img })
})
// Held back: blobs at places the training never showed. A two-number autoencoder trained from the default start
// draws them right from the step its visible tests first pass, and every step after.
const AE_HIDDEN = [[4.17, 10.45], [7.97, 11.46], [7.92, 5.1]].map(([x, y], i) => {
  const img = blob(x, y)
  return test({ zh: `新位置 ${i + 1}`, en: `New place ${i + 1}` }, { in: img }, { out: img })
})

// Whether the camera can reach the display without passing an encoder.
function bypassesBottleneck(graph) {
  const next = new Map()
  for (const wire of graph.wires) next.set(wire.from, [...(next.get(wire.from) ?? []), wire.to])
  const kind = new Map(graph.nodes.map((n) => [n.id, n.type]))
  const stack = graph.nodes.filter((n) => n.type === 'input').map((n) => n.id)
  const seen = new Set()
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    if (kind.get(id) === 'output') return true
    if (kind.get(id) === 'dg_encode') continue
    stack.push(...(next.get(id) ?? []))
  }
  return false
}

// Weights reached by pressing 训练 from the default start (trainStep at trainRate 30): two numbers pass after
// 18 steps (these are 20 steps later); one number after 400 steps still draws only 4 of the 16 blobs.
const AE_TRAINED_2 = {
  enc: [0.147, -0.326, -0.312, 0.003, -0.008, 0.077, 0.312, 0.226, -0.314, -0.812, -0.779, -0.045, -0.077, 0.498, 0.899, 0.39, -0.377, -0.847, -0.985, -0.191, -0.146, 0.321, 0.652, 0.562, 0.197, 0.189, 0.232, 0.08, -0.148, 0.011, -0.446, 0.004, ...ENCODER_START.slice(32)],
  dec: [0.474, 1.49, 0.015, 1.479, -0.5, -0.08, 0.345, 0.064],
}
const AE_TRAINED_1 = {
  enc: [0.039, -0.696, -0.56, -0.061, 0.012, 0.236, 0.694, 0.431, -0.3, -0.658, -0.54, -0.033, -0.075, 0.336, 0.667, 0.339, ...ENCODER_START.slice(16)],
  dec: [1.113, 0.201, 0.015, 1.111, 0.003, -0.08, 0.143, 0.131],
}
const aeGraph = (k, trained) =>
  build({ e: ['dg_encode', { k, w: trained.enc }], d: ['dg_decode', { w: trained.dec }] }, ['in>e', 'e>d', 'd>out'])

// 8-2: the teacher drew each test's blob at z = m + s·ε with the ε shown.
const TEACHER_MU = [0.4, -0.3]
const TEACHER_SIGMA = [0.5, 0.25]
const EPS = (() => {
  const next = random(2024)
  return Array.from({ length: 5 }, () => [gaussian(next), gaussian(next)])
})()
const reparamTests = EPS.map((e, i) =>
  test({ zh: `噪声 ${i + 1}`, en: `Noise ${i + 1}` }, { eps: code(e) }, { out: blobAt(TEACHER_MU[0] + TEACHER_SIGMA[0] * e[0], TEACHER_MU[1] + TEACHER_SIGMA[1] * e[1]) }),
)
// Held back: fresh noise from another seed, drawn by the same teacher.
const reparamHidden = (() => {
  const next = random(2025)
  return Array.from({ length: 3 }, () => [gaussian(next), gaussian(next)])
})().map((e, i) => test({ zh: `新噪声 ${i + 1}`, en: `New noise ${i + 1}` }, { eps: code(e) }, { out: blobAt(TEACHER_MU[0] + TEACHER_SIGMA[0] * e[0], TEACHER_MU[1] + TEACHER_SIGMA[1] * e[1]) }))
const latentGraph = (nodesSpec, wires) => build(nodesSpec, wires, { inputs: ['eps'] })


// ---------------- 8-2 潜空间走一走 ----------------

const centreOf = (img) => NODE_TYPES.dg_encoder.eval({ in: img }).data
const walk = (cases) =>
  cases.map(([label, [ax, ay], [bx, by], t]) => {
    const a = blob(ax, ay)
    const b = blob(bx, by)
    const [za, zb] = [centreOf(a), centreOf(b)]
    return test(label, { a, b, t: image(1, 1, t) }, { out: blobAt((1 - t) * za[0] + t * zb[0], (1 - t) * za[1] + t * zb[1]) })
  })
const walkGraph = (latent = true) =>
  latent
    ? build(
        { ea: 'dg_encoder', eb: 'dg_encoder', one: ['const', { c: 1 }], om: ['arith', { op: 'sub' }], wa: ['arith', { op: 'mul' }], wb: ['arith', { op: 'mul' }], z: ['arith', { op: 'add' }], d: 'dg_decoder' },
        ['a>ea', 'b>eb', 'one>om.a', 't>om.b', 'ea>wa.a', 'om>wa.b', 'eb>wb.a', 't>wb.b', 'wa>z.a', 'wb>z.b', 'z>d', 'd>out'],
        { inputs: ['a', 'b', 't'] },
      )
    : build({ one: ['const', { c: 1 }], om: ['arith', { op: 'sub' }], wa: ['arith', { op: 'mul' }], wb: ['arith', { op: 'mul' }], s: ['arith', { op: 'add' }] }, ['one>om.a', 't>om.b', 'a>wa.a', 'om>wa.b', 'b>wb.a', 't>wb.b', 'wa>s.a', 'wb>s.b', 's>out'], { inputs: ['a', 'b', 't'] })

const latentWalk = {
  id: '8-2',
  chapter: 8,
  title: { zh: '潜空间走一走', en: 'A walk in latent space' },
  inputs: ['a', 'b', 't'],
  inputLabels: { a: { zh: '斑点 a', en: 'Blob a' }, b: { zh: '斑点 b', en: 'Blob b' }, t: { zh: '走到哪 t', en: 'How far t' } },
  brief: { zh: '画出 a 和 b 「中间」的那个斑点：从 a 往 b 走了 t（0 是 a，1 是 b）。', en: 'Draw the blob "between" a and b: t of the way from a to b (0 is a, 1 is b).' },
  hint: { zh: '两张图逐格按比例混合，得到的是两个淡斑点。上一关的两个数呢？', en: 'Mixing the two pictures cell by cell gives two faint blobs. What about last level\'s two numbers?' },
  after: { zh: '像素空间里的中间是两张图叠在一起；潜空间里的中间才是「一个斑点在中间」。训练好的编码器把图放进一个平滑的空间，在里面走直线，解码出来就是一串自然的过渡：人脸变老、换发型都是这么做的。', en: 'Halfway in pixel space is two pictures laid over each other; halfway in latent space is "one blob in between". A trained encoder puts pictures into a smooth space, and walking a straight line there decodes into a natural transition: making a face older or changing a hairstyle works like this.' },
  unlocks: [],
  check: { tolerance: 0.05, mismatches: 2 },
  tests: walk([
    [{ zh: '一半', en: 'Halfway' }, [4, 4], [12, 10], 0.5],
    [{ zh: '走了四分之一', en: 'A quarter of the way' }, [11, 4], [4, 11], 0.25],
    [{ zh: '快到了', en: 'Nearly there' }, [3, 9], [12, 6], 0.8],
  ]),
  hidden: walk([[{ zh: '又一半', en: 'Halfway again' }, [12, 12], [4, 6], 0.5]]),
  solution: walkGraph(),
  naive: walkGraph(false),
}

// ---------------- 8-3 去噪自编码器 ----------------
// Noisy blobs in, clean blobs out. Through a bottleneck of two numbers the noise has nowhere to go.

const noisy = (img, seed, amp = 0.12) => {
  const next = random(seed)
  return fromFn(16, 16, (x, y) => img.data[y * 16 + x] + amp * (next() + next() + next() - 1.5) * 2)
}
const DENOISE = AE_POSITIONS.filter((_, i) => i % 2 === 0).map(([x, y], i) => test({ zh: `斑点 ${i + 1}`, en: `Blob ${i + 1}` }, { in: noisy(blob(x, y), 300 + i) }, { out: blob(x, y) }))
const DENOISE_HIDDEN = [[5.2, 8.1], [10.4, 5.6]].map(([x, y], i) => test({ zh: `新位置 ${i + 1}`, en: `New place ${i + 1}` }, { in: noisy(blob(x, y), 400 + i) }, { out: blob(x, y) }))
const cleanUp = {
  id: '8-3',
  chapter: 8,
  title: { zh: '去噪自编码器', en: 'Denoising autoencoder' },
  brief: { zh: '输入的斑点带着噪声，期望是干净的斑点。', en: 'The blobs come in noisy, and the expected output is the clean blob.' },
  hint: { zh: '模糊把噪声和斑点一起抹开。瓶颈只放得下两个数，噪声要几个数才记得住？', en: 'A blur smears the noise and the blob alike. The bottleneck holds only two numbers; how many would it take to remember the noise?' },
  after: { zh: '瓶颈里只有两个数，装得下「斑点在哪」，装不下每一格的噪声，所以解码出来是干净的。训练时输入加噪声、目标用原图，就是去噪自编码器；后面的扩散模型把这个想法推到底：从纯噪声一点点去噪，画出新图。', en: 'The bottleneck holds only two numbers: enough for "where the blob is", not for the noise in every cell, so what is decoded comes out clean. Training with noisy inputs and the original as the target gives a denoising autoencoder, and diffusion models push the idea all the way: denoise from pure noise, little by little, to draw new pictures.' },
  unlocks: [],
  check: { tolerance: 0.15, mismatches: 3 },
  tests: DENOISE,
  hidden: DENOISE_HIDDEN,
  solution: build({ e: 'dg_encoder', d: 'dg_decoder' }, ['in>e', 'e>d', 'd>out']),
  alsoFails: [build({ g: ['gauss', { sigma: 1 }] }, ['in>g', 'g>out'])],
  naive: build({}, ['in>out']),
}

// ---------------- 8-5 画一个新斑点 ----------------

const draws = (seed, n) => {
  const next = random(seed)
  return Array.from({ length: n }, () => [gaussian(next), gaussian(next)])
}
const NEW_MU = [-0.5, 0.5]
const NEW_SIGMA = [0.3, 0.2]
const newTests = (eps, label) => eps.map((e, i) => test(label(i), { eps: code(e), mu: code(NEW_MU), sigma: code(NEW_SIGMA) }, { out: blobAt(NEW_MU[0] + NEW_SIGMA[0] * e[0], NEW_MU[1] + NEW_SIGMA[1] * e[1]) }))
const newBlob = {
  id: '8-5',
  chapter: 8,
  title: { zh: '画一个新斑点', en: 'Draw a new blob' },
  inputs: ['eps', 'mu', 'sigma'],
  inputLabels: { eps: { zh: '噪声 ε', en: 'Noise ε' }, mu: { zh: '中心 μ', en: 'Centre μ' }, sigma: { zh: '散开 σ', en: 'Spread σ' } },
  brief: { zh: '从 N(μ, σ²) 里抽一个 z，交给解码器画出来。抽样用输入里的噪声 ε。', en: 'Draw a z from N(μ, σ²) and hand it to the decoder. Use the noise ε from the input to draw it.' },
  hint: { zh: '上一关最后得到的元件，正好是「用 ε 抽样」。', en: 'The part you got at the end of last level is exactly "draw a sample using ε".' },
  after: { zh: '训练好以后，生成就是：抽一个随机的 z，交给解码器。每抽一次就是一张没见过的新图；μ、σ 决定新图大概长在哪一带。', en: 'Once trained, generating is just: draw a random z and hand it to the decoder. Each draw is a new picture never seen before; μ and σ decide roughly where the new pictures fall.' },
  unlocks: [],
  check: { tolerance: 0.05, mismatches: 2 },
  tests: newTests(draws(2030, 3), (i) => ({ zh: `第 ${i + 1} 次抽`, en: `Draw ${i + 1}` })),
  hidden: newTests(draws(2031, 2), (i) => ({ zh: `又抽一次 ${i + 1}`, en: `Another draw ${i + 1}` })),
  solution: build({ r: 'dg_reparam', d: 'dg_decoder' }, ['mu>r.μ', 'sigma>r.σ', 'eps>r.ε', 'r>d', 'd>out'], { inputs: ['eps', 'mu', 'sigma'] }),
  naive: build({ d: 'dg_decoder' }, ['mu>d', 'd>out'], { inputs: ['eps', 'mu', 'sigma'] }),
}

// ---------------- 8-7 一步加到第 t 步 · 8-8 两次等于一次 ----------------
// Diffusion adds Gaussian noise: x_t = √ᾱ·x₀ + √(1 − ᾱ)·ε, where ᾱ says how much of the picture is left.

const letter = (name, dx = 0, dy = 0) => P.glyph(GLYPHS[name], 0.1, 0.9, 3 + dx, 3 + dy)
const noiseImage = (seed) => {
  const next = random(seed)
  return fromFn(16, 16, () => gaussian(next))
}
const addNoiseStep = (x0, eps, ab) => zip(x0, eps, (x, e) => Math.sqrt(ab) * x + Math.sqrt(1 - ab) * e)
const noiseGraph = () =>
  build(
    { s1: 'sqrt', one: ['const', { c: 1 }], om: ['arith', { op: 'sub' }], s2: 'sqrt', a: ['arith', { op: 'mul' }], b: ['arith', { op: 'mul' }], x: ['arith', { op: 'add' }] },
    ['ab>s1', 'one>om.a', 'ab>om.b', 'om>s2', 'x0>a.a', 's1>a.b', 'eps>b.a', 's2>b.b', 'a>x.a', 'b>x.b', 'x>out'],
    { inputs: ['x0', 'eps', 'ab'] },
  )
const NOISE_LABELS = { x0: { zh: '原图 x₀', en: 'Picture x₀' }, eps: { zh: '噪声 ε', en: 'Noise ε' }, ab: { zh: '剩下多少 ᾱ', en: 'How much is left, ᾱ' } }
const noisyTests = (cases) => cases.map(([label, name, seed, ab]) => test(label, { x0: letter(name), eps: noiseImage(seed), ab: image(1, 1, ab) }, { out: addNoiseStep(letter(name), noiseImage(seed), ab) }))
const addNoiseLevel = {
  id: '8-7',
  chapter: 8,
  title: { zh: '一步加到第 t 步', en: 'Straight to step t' },
  inputs: ['x0', 'eps', 'ab'],
  inputLabels: NOISE_LABELS,
  brief: { zh: '扩散模型给图加噪：x_t = √ᾱ · x₀ + √(1 − ᾱ) · ε。按公式输出 x_t。', en: 'A diffusion model adds noise to a picture: x_t = √ᾱ · x₀ + √(1 − ᾱ) · ε. Output x_t by the formula.' },
  hint: { zh: '√ᾱ 和 √(1 − ᾱ) 都是一个数，乘到整张图上。', en: '√ᾱ and √(1 − ᾱ) are each a single number, multiplied onto the whole picture.' },
  after: { zh: 'ᾱ 从 1 慢慢减到 0，图一点点没进噪声里。两个系数的平方加起来是 1，所以不管加到哪一步，图的总「能量」大致不变。这个公式让训练时能直接跳到任意一步，不用一步步加。', en: 'As ᾱ falls slowly from 1 to 0, the picture sinks little by little into the noise. The squares of the two coefficients add up to 1, so whatever the step, the total "energy" of the picture stays about the same. This formula lets training jump straight to any step without adding noise step by step.' },
  packs: { name: { zh: '加噪', en: 'Add noise' }, desc: { zh: '输出 √ᾱ·x₀ + √(1 − ᾱ)·ε：把 x₀ 一步加噪到第 t 步。', en: 'Outputs √ᾱ·x₀ + √(1 − ᾱ)·ε: x₀ noised straight to step t.' } },
  unlocks: [],
  tests: noisyTests([[{ zh: '一点点噪声', en: 'A little noise' }, 'T', 81, 0.9], [{ zh: '一半', en: 'Half and half' }, 'X', 82, 0.5], [{ zh: '几乎全是噪声', en: 'Almost all noise' }, 'O', 83, 0.1]]),
  hidden: noisyTests([[{ zh: '字母 F', en: 'Letter F' }, 'F', 84, 0.7]]),
  solution: noiseGraph(),
  naive: build({ a: ['arith', { op: 'mul' }], om: ['arith', { op: 'sub' }], one: ['const', { c: 1 }], b: ['arith', { op: 'mul' }], x: ['arith', { op: 'add' }] }, ['x0>a.a', 'ab>a.b', 'one>om.a', 'ab>om.b', 'eps>b.a', 'om>b.b', 'a>x.a', 'b>x.b', 'x>out'], { inputs: ['x0', 'eps', 'ab'] }),
}

const twoTests = (cases) =>
  cases.map(([label, name, s1, s2, a1, a2]) => {
    const once = addNoiseStep(letter(name), noiseImage(s1), a1)
    return test(label, { x0: letter(name), e1: noiseImage(s1), e2: noiseImage(s2), a1: image(1, 1, a1), a2: image(1, 1, a2) }, { out: addNoiseStep(once, noiseImage(s2), a2) })
  })
const twoSteps = {
  id: '8-8',
  chapter: 8,
  title: { zh: '两次等于一次', en: 'Twice is once' },
  inputs: ['x0', 'e1', 'e2', 'a1', 'a2'],
  inputLabels: { x0: NOISE_LABELS.x0, e1: { zh: '第一次的噪声', en: 'First noise' }, e2: { zh: '第二次的噪声', en: 'Second noise' }, a1: { zh: '第一次的 ᾱ', en: 'First ᾱ' }, a2: { zh: '第二次的 ᾱ', en: 'Second ᾱ' } },
  brief: { zh: '先按 a1 加一次噪，再对结果按 a2 加一次噪。输出加了两次以后的图。', en: 'Add noise once with a1, then add noise to the result again with a2. Output the picture after both.' },
  hint: { zh: '上一关的「加噪」接两次。', en: 'Last level\'s "Add noise", twice.' },
  after: { zh: '展开以后，x₀ 前面的系数是 √(a1·a2)，两份噪声合起来正好是方差 1 − a1·a2 的一份噪声：两次加噪，和按 ᾱ = a1·a2 一次加噪是同一回事。所以扩散的每一步都能一步跳到。', en: 'Expand it and the coefficient of x₀ is √(a1·a2), while the two noises together are exactly one noise of variance 1 − a1·a2: adding noise twice is the same thing as adding it once with ᾱ = a1·a2. That is why any step of diffusion can be reached in one jump.' },
  unlocks: [],
  tests: twoTests([[{ zh: '两小步', en: 'Two small steps' }, 'T', 91, 92, 0.9, 0.8], [{ zh: '一大一小', en: 'One big, one small' }, 'L', 93, 94, 0.5, 0.95], [{ zh: '两大步', en: 'Two big steps' }, 'X', 95, 96, 0.4, 0.5]]),
  hidden: twoTests([[{ zh: '字母 O', en: 'Letter O' }, 'O', 97, 98, 0.7, 0.7]]),
  solution: build({ n1: 'own-8-7', n2: 'own-8-7' }, ['x0>n1.x0', 'e1>n1.eps', 'a1>n1.ab', 'n1>n2.x0', 'e2>n2.eps', 'a2>n2.ab', 'n2>out'], { inputs: ['x0', 'e1', 'e2', 'a1', 'a2'] }),
  naive: build({ ab: ['arith', { op: 'mul' }], n: 'own-8-7' }, ['a1>ab.a', 'a2>ab.b', 'x0>n.x0', 'e1>n.eps', 'ab>n.ab', 'n>out'], { inputs: ['x0', 'e1', 'e2', 'a1', 'a2'] }),
}

// ---------------- 8-9 指定画哪边 (challenge) ----------------

const SIDE_SIGMA = [0.3, 0.3]
const LEFT_MU = [-1, 0]
const RIGHT_MU = [1, 0]
const sideTests = (cases) =>
  cases.map(([label, e, c]) => {
    const mu = c ? RIGHT_MU : LEFT_MU
    return test(label, { eps: code(e), c: image(1, 1, c), left: code(LEFT_MU), right: code(RIGHT_MU), sigma: code(SIDE_SIGMA) }, { out: blobAt(mu[0] + SIDE_SIGMA[0] * e[0], mu[1] + SIDE_SIGMA[1] * e[1]) })
  })
const SIDES = draws(2040, 4)
const sides = {
  id: '8-9',
  chapter: 8,
  title: { zh: '指定画哪边', en: 'Draw it on the side asked for' },
  inputs: ['eps', 'c', 'left', 'right', 'sigma'],
  inputLabels: { eps: { zh: '噪声 ε', en: 'Noise ε' }, c: { zh: '画哪边 c（0 左，1 右）', en: 'Which side c (0 left, 1 right)' }, left: { zh: '左边的中心', en: 'Centre on the left' }, right: { zh: '右边的中心', en: 'Centre on the right' }, sigma: { zh: '散开 σ', en: 'Spread σ' } },
  brief: { zh: 'c = 0 时，从左边那一带抽一个斑点；c = 1 时，从右边那一带抽。', en: 'When c = 0, draw a blob from the region on the left; when c = 1, from the region on the right.' },
  hint: { zh: '同样的抽样，只是中心换了。中心能不能由 c 算出来？', en: 'The same sampling, only with a different centre. Can the centre be worked out from c?' },
  after: { zh: '多给生成器一个条件输入，它就按要求画：这叫条件生成。「画一只猫」「画成水彩风格」这些文字提示，就是更复杂的条件。', en: 'Give the generator one more input, a condition, and it draws what is asked for: this is called conditional generation. Text prompts like "draw a cat" or "in watercolour" are just more elaborate conditions.' },
  unlocks: [],
  check: { tolerance: 0.05, mismatches: 2 },
  tests: sideTests([[{ zh: '左边', en: 'Left' }, SIDES[0], 0], [{ zh: '右边', en: 'Right' }, SIDES[1], 1], [{ zh: '又是右边', en: 'Right again' }, SIDES[2], 1]]),
  hidden: sideTests([[{ zh: '又是左边', en: 'Left again' }, SIDES[3], 0]]),
  solution: build(
    { one: ['const', { c: 1 }], oc: ['arith', { op: 'sub' }], wl: ['arith', { op: 'mul' }], wr: ['arith', { op: 'mul' }], mu: ['arith', { op: 'add' }], r: 'dg_reparam', d: 'dg_decoder' },
    ['one>oc.a', 'c>oc.b', 'left>wl.a', 'oc>wl.b', 'right>wr.a', 'c>wr.b', 'wl>mu.a', 'wr>mu.b', 'mu>r.μ', 'sigma>r.σ', 'eps>r.ε', 'r>d', 'd>out'],
    { inputs: ['eps', 'c', 'left', 'right', 'sigma'] },
  ),
  naive: build({ r: 'dg_reparam', d: 'dg_decoder' }, ['left>r.μ', 'sigma>r.σ', 'eps>r.ε', 'r>d', 'd>out'], { inputs: ['eps', 'c', 'left', 'right', 'sigma'] }),
}

// ---------------- 8-10 还原 x₀ · 8-11 修一张旧照片 ----------------
// Knowing the noise, x₀ = (x_t − √(1 − ᾱ)·ε) / √ᾱ. Not knowing it, a network guesses ε from x_t.

const restoreTests = (cases) => cases.map(([label, name, seed, ab]) => test(label, { xt: addNoiseStep(letter(name), noiseImage(seed), ab), eps: noiseImage(seed), ab: image(1, 1, ab) }, { out: letter(name) }))
const restoreGraph = () =>
  build(
    { s1: 'sqrt', one: ['const', { c: 1 }], om: ['arith', { op: 'sub' }], s2: 'sqrt', b: ['arith', { op: 'mul' }], d: ['arith', { op: 'sub' }], q: ['arith', { op: 'div' }] },
    ['ab>s1', 'one>om.a', 'ab>om.b', 'om>s2', 'eps>b.a', 's2>b.b', 'xt>d.a', 'b>d.b', 'd>q.a', 's1>q.b', 'q>out'],
    { inputs: ['xt', 'eps', 'ab'] },
  )
const restore = {
  id: '8-10',
  chapter: 8,
  title: { zh: '还原 x₀', en: 'Getting x₀ back' },
  inputs: ['xt', 'eps', 'ab'],
  inputLabels: { xt: { zh: '加了噪的 x_t', en: 'Noisy x_t' }, eps: { zh: '当初加的噪声 ε', en: 'The noise ε that was added' }, ab: NOISE_LABELS.ab },
  brief: { zh: '知道当初加的是哪份噪声 ε，把原图 x₀ 还原出来。', en: 'Knowing which noise ε was added, get the original picture x₀ back.' },
  hint: { zh: '把加噪的公式倒过来解 x₀。', en: 'Solve the noise formula backwards for x₀.' },
  after: { zh: '只要知道噪声，原图一步就能还原。扩散模型要学的正是这件事：看着 x_t 猜出 ε。猜得越准，还原得越好。', en: 'Know the noise and the original comes back in one step. This is exactly what a diffusion model learns: looking at x_t, guess ε. The better the guess, the better the restoration.' },
  packs: { name: { zh: '还原', en: 'Restore' }, desc: { zh: '输出 (x_t − √(1 − ᾱ)·ε) / √ᾱ：由 x_t 和噪声 ε 还原 x₀。', en: 'Outputs (x_t − √(1 − ᾱ)·ε) / √ᾱ: x₀ recovered from x_t and the noise ε.' } },
  unlocks: [],
  tests: restoreTests([[{ zh: '一点点噪声', en: 'A little noise' }, 'T', 101, 0.9], [{ zh: '一半', en: 'Half and half' }, 'X', 102, 0.5], [{ zh: '几乎全是噪声', en: 'Almost all noise' }, 'L', 103, 0.1]]),
  hidden: restoreTests([[{ zh: '字母 F', en: 'Letter F' }, 'F', 104, 0.6]]),
  solution: restoreGraph(),
  naive: build({ s1: 'sqrt', q: ['arith', { op: 'div' }] }, ['ab>s1', 'xt>q.a', 's1>q.b', 'q>out'], { inputs: ['xt', 'eps', 'ab'] }),
}

// An old photo of a letter, noisy at ᾱ = 0.9. A trained 3×3 kernel guesses the noise; "Restore" uses the guess; a
// threshold at 0.5 cleans up. The weights below are the least-squares guess over the visible tests.
const OLD_AB = 0.9
const GUESS = [-0.14, -0.39, -0.12, -0.44, 2.26, -0.41, -0.12, -0.39, -0.13]
const oldPhotos = (cases) =>
  cases.map(([label, name, dx, dy, seed]) => {
    const x0 = letter(name, dx, dy)
    return test(label, { xt: addNoiseStep(x0, noiseImage(seed), OLD_AB), ab: image(1, 1, OLD_AB) }, { x0, ink: fromFn(16, 16, (x, y) => (x0.data[y * 16 + x] > 0.5 ? 1 : 0)) })
  })
const photoGraph = (w) =>
  build(
    { g: ['learn3', { w }], r: 'own-8-10', t: ['threshold', { t: 0.5 }] },
    ['xt>g', 'xt>r.xt', 'g>r.eps', 'ab>r.ab', 'r>x0', 'r>t', 't>ink'],
    { inputs: ['xt', 'ab'], outputs: ['x0', 'ink'] },
  )
const oldPhoto = {
  id: '8-11',
  chapter: 8,
  title: { zh: '修一张旧照片', en: 'Mending an old photo' },
  inputs: ['xt', 'ab'],
  outputs: ['x0', 'ink'],
  inputLabels: { xt: { zh: '旧照片', en: 'Old photo' }, ab: NOISE_LABELS.ab },
  outputLabels: { x0: { zh: '还原的照片', en: 'Restored photo' }, ink: { zh: '字的笔画', en: 'Strokes of the letter' } },
  brief: { zh: `一张印着字母的旧照片，满是噪点（ᾱ = ${OLD_AB}）。这次不知道噪声是什么：训练一个元件从照片里猜出噪声，还原照片，再标出字的笔画。`, en: `An old photo of a letter, full of grain (ᾱ = ${OLD_AB}). This time the noise is unknown: train a part to guess the noise from the photo, restore the photo, then mark the strokes of the letter.` },
  hint: { zh: '噪声每一格都不一样，字的笔画却连成一片。一格和它的邻居差得多，多半是噪声。', en: 'The noise differs from cell to cell, but the strokes of a letter join up. A cell very different from its neighbours is probably noise.' },
  after: { zh: '你训练的 3×3 核学会了「和邻居差得多的是噪声」，还原以后笔画就清楚了。扩散模型的去噪网络大得多，从纯噪声出发一步步猜噪声、去掉一点，最后画出一张没见过的图：每一步做的都是这一关的事。', en: 'The 3×3 kernel you trained learnt that "what differs a lot from its neighbours is noise", and after restoring, the strokes are clear. A diffusion model\'s denoising network is far bigger: starting from pure noise it guesses the noise and removes a little, step after step, until a picture never seen before appears. Every step does what this level does.' },
  unlocks: [],
  // The restored photo is judged loosely (a 3×3 guess leaves some grain); the strokes are judged on the same few cells.
  check: { tolerance: 0.35, mismatches: 25 },
  trainRate: 2,
  tests: oldPhotos([[{ zh: '字母 T', en: 'Letter T' }, 'T', 0, 0, 111], [{ zh: '字母 X', en: 'Letter X' }, 'X', 1, 0, 112], [{ zh: '字母 O', en: 'Letter O' }, 'O', 0, 1, 113], [{ zh: '字母 F', en: 'Letter F' }, 'F', 1, 1, 114]]),
  hidden: oldPhotos([[{ zh: '字母 L', en: 'Letter L' }, 'L', 0, 0, 115]]),
  solution: photoGraph(GUESS),
  naive: build({ t: ['threshold', { t: 0.5 }], s: 'sqrt', q: ['arith', { op: 'div' }] }, ['ab>s', 'xt>q.a', 's>q.b', 'q>x0', 'q>t', 't>ink'], { inputs: ['xt', 'ab'], outputs: ['x0', 'ink'] }),
}

export const levels = [
  {
    id: '8-1',
    chapter: 8,
    title: { zh: '两个数记住一张图', en: 'Two numbers to remember an image' },
    brief: { zh: '先把图压成几个数，再由这几个数画回原图。用最少的数做到。', en: 'Squeeze the image into a few numbers, then draw the original back from those numbers. Do it with as few numbers as you can.' },
    hint: { zh: '一个数只能让斑点沿一条线走。这些斑点在往几个方向变？', en: 'One number can only move the blob along a line. In how many directions do these blobs vary?' },
    after: { zh: '编码器把图压成 z，解码器再从 z 画回来，目标就是输入自己，不需要标签。最窄的那层叫瓶颈：这一族斑点只在左右、上下两个方向变，所以瓶颈至少要两个数；一个数只能让斑点沿一条直线走。', en: 'The encoder squeezes the image into z, and the decoder draws it back from z; the target is the input itself, so no labels are needed. The narrowest layer is called the bottleneck: this family of blobs varies only left–right and up–down, so the bottleneck needs at least two numbers; one number can only move the blob along a straight line.' },
    unlocks: ['dg-decoder'],
    adds: ['dg_encode', 'dg_decode'],
    // Within 0.2 a pixel, which is a blob drawn less than half a pixel off; one number misses by several pixels.
    check: { tolerance: 0.2, mismatches: 3 },
    trainRate: 30,
    constraint: (score, graph) => {
      if (bypassesBottleneck(graph)) return { zh: '图像没有经过编码器', en: 'The image does not pass through the encoder' }
      const widest = Math.max(0, ...graph.nodes.filter((n) => n.type === 'dg_encode').map((n) => Number(n.params.k ?? 1)))
      return widest > 2 ? { zh: `瓶颈有 ${widest} 个数，最多 2 个`, en: `The bottleneck has ${widest} numbers; at most 2 allowed` } : ''
    },
    tests: aeTests,
    hidden: AE_HIDDEN,
    solution: aeGraph(2, AE_TRAINED_2),
    naive: aeGraph(1, AE_TRAINED_1),
    alsoFails: [build({}, ['in>out']), aeGraph(3, AE_TRAINED_2)],
  },
  latentWalk,
  cleanUp,
  {
    id: '8-4',
    chapter: 8,
    title: { zh: '随机也能求导', en: 'Differentiating through randomness' },
    inputs: ['eps'],
    inputLabels: { eps: { zh: '噪声 ε', en: 'Noise ε' } },
    brief: { zh: '老师用每组的噪声 ε 画出了右边的斑点（z 从 N(μ, σ²) 中采样）。学出 μ 和 σ，用同样的 ε 画出同样的图。', en: 'The teacher drew the blob on the right from each set\'s noise ε (z sampled from N(μ, σ²)). Learn μ and σ, and draw the same image from the same ε.' },
    hint: { zh: '采样器每算一次都换一个随机数，训练看到的只是噪声。老师用的那组 ε 就在输入里。', en: 'The sampler draws a new random number every time it runs, so all training sees is noise. The teacher\'s ε is right there in the input.' },
    after: { zh: '采样这一步没法求导：每次重抽，训练分不清结果变好是因为改了 μ、σ 还是运气。把它写成 z = μ + σ·ε，随机全部来自输入 ε，z 对 μ、σ 就只是乘和加，梯度清清楚楚。这叫重参数化，VAE 的编码器就是这样训练的。', en: 'You cannot differentiate through the sampling step: with a fresh draw each time, training cannot tell whether a better result came from changing μ and σ or from luck. Write it as z = μ + σ·ε instead: all the randomness comes from the input ε, z is just a multiply and an add of μ and σ, and the gradient is perfectly clear. This is called reparameterization, and it is how a VAE\'s encoder is trained.' },
    unlocks: ['dg-reparam'],
    adds: ['dg_mu', 'dg_sigma', 'dg_sample'],
    check: { tolerance: 0.05, mismatches: 2 },
    trainRate: 5,
    tests: reparamTests,
    hidden: reparamHidden,
    solution: latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], s: ['dg_sigma', { w: TEACHER_SIGMA }], x: ['arith', { op: 'mul' }], a: ['arith', { op: 'add' }], d: 'dg_decoder' }, ['s>x.a', 'eps>x.b', 'm>a.a', 'x>a.b', 'a>d', 'd>out']),
    // Even with the teacher's own μ and σ, fresh draws cannot reproduce (or be trained towards) the tests.
    naive: latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], s: ['dg_sigma', { w: TEACHER_SIGMA }], z: 'dg_sample', d: 'dg_decoder' }, ['m>z.μ', 's>z.σ', 'z>d', 'd>out']),
    alsoFails: [
      latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], d: 'dg_decoder' }, ['m>d', 'd>out']),
      latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], a: ['arith', { op: 'add' }], d: 'dg_decoder' }, ['m>a.a', 'eps>a.b', 'a>d', 'd>out']),
    ],
  },
  newBlob,
  {
    id: '8-6',
    kind: 'board',
    board: 'GanDuel',
    chapter: 8,
    title: { zh: '骗过鉴定员', en: 'Fool the judge' },
    brief: { zh: '生成器有两支笔，要画出和真实数据一样的两堆点。轮流训练鉴定员和生成器，直到两堆都画到、鉴定员只能瞎猜。', en: 'The generator has two pens and must draw two clusters of points just like the real data. Take turns training the judge and the generator until both clusters are covered and the judge can only guess.' },
    hint: { zh: '生成器一回合走太远，就会一起冲向鉴定员此刻最相信的那一处。', en: 'If the generator moves too far in one round, both pens rush together to the spot the judge trusts most right now.' },
    after: { zh: '鉴定员不动、生成器猛练，生成器就把所有样本都放到鉴定员最相信的那一点：两支笔重合，只画一堆，这就是模式坍塌；鉴定员一反应，它们又一起跳到另一堆。让鉴定员跟上、生成器小步走，两支笔才会各占一堆，最后鉴定员的准确率回到 50%。', en: 'If the judge stands still while the generator trains hard, the generator puts every sample on the one spot the judge trusts most: the two pens merge and draw only one cluster. This is mode collapse; as soon as the judge reacts, they jump together to the other cluster. Let the judge keep up and the generator take small steps, and the pens settle on one cluster each, until the judge\'s accuracy is back to 50%.' },
    unlocks: [],
    model: ganModel,
    verify: verifyGan,
  },
  addNoiseLevel,
  twoSteps,
  sides,
  restore,
  oldPhoto,
]
