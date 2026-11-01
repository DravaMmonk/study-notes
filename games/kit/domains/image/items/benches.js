// The benches a level may be played on (vocabulary.js bench): the mechanisms no circuit can wire (a camera obscura,
// waves on a slider, a sampling probe, a training run, voting, random trials, a duel), each an interactive board
// (ui/boards/, by `board`) over its model (../benches/). A level names its bench and gives its scene (`setup`); the
// item makes the fields its board reads, and proves the lesson holds on that scene (verify: '' when the bench is
// winnable and its naive moves fail, else what is wrong), which `npm run check` runs.
import { S } from '../../../engine/schema.js'
import { keyOf } from '../../../shell/i18n.js'
import { correlate } from '../engine/image.js'
import { affineFit, homographyDLT, project } from '../engine/match.js'
import { obscuraBench } from '../benches/obscura.js'
import { maxAbsDiff, racerRounds } from '../benches/racer.js'
import { aliasBench, cosAt, probeBench, sumBench, waveBench } from '../benches/waves.js'
import { stopBench } from '../benches/fitting.js'
import { contrastBench } from '../benches/contrast.js'
import { houghBench, houghScene } from '../benches/hough.js'
import { ransacBench, ransacRounds } from '../benches/ransac.js'
import { coverBench } from '../benches/cover.js'
import { ganBench } from '../benches/gan.js'
import { picture } from './pictures.js'

const t = (zh, en) => ({ zh, en })
const num = S.num()
const nums = S.list(S.num())
const pt = S.list(S.num(), { min: 2 })
const quad = S.list(pt, { min: 4 })
const text = S.text()
const STAGE_TEXT = { title: text, note: text }
const KNOB = S.obj({ min: num, max: num, step: num, label: text, unit: S.opt(S.str()) })
// A wave on a middle line of c: the sum of cos waves of frequency k, amplitude A, `shift` degrees late (u ∈ [0, 1)).
const WAVES = S.obj({ c: num, waves: S.list(S.obj({ k: S.int(), A: num, shift: S.opt(num) })) })
const wavesAt = ({ c, waves }) => (u) => waves.reduce((s, w) => s + cosAt(w.k, w.A, w.shift)(u), c)

// The probe bench's ways of putting the cos reading a and the sin reading b together.
const COMBINE = {
  cos: { name: t('只看 a', 'Only a'), f: (a) => a },
  sin: { name: t('只看 b', 'Only b'), f: (a, b) => b },
  sum: { name: 'a + b', f: (a, b) => a + b },
  mag: { name: '√(a² + b²)', f: (a, b) => Math.hypot(a, b) },
}

export const BENCHES = {
  obscura: {
    about: t('暗箱：拖孔板和屏幕、换孔，让像够高、够清楚、够亮', 'the camera obscura: drag the pinhole plate and the screen, change the hole, for an image tall, sharp and bright enough'),
    board: 'OpticsObscura',
    params: S.obj({
      arrow: num, shaft: num, table: num, plate: pt, gap: num, holes: nums,
      goal: S.obj({ height: num, slack: num, blur: num, light: num }), start: S.obj({ Z: num, s: num, D: num }),
    }),
    setup: (p) => ({ model: obscuraBench(p) }),
    verify: ({ model }) => {
      const { START, HOLES, solved, settings } = model
      if (solved(START)) return 'the starting setting already passes'
      const good = [...settings()].filter(solved)
      if (!good.length) return 'no setting meets all three goals'
      // The naive moves: pinhole as small as possible, or as big as possible; neither may pass anywhere.
      const holes = new Set(good.map((g) => g.D))
      if (holes.has(HOLES[0])) return 'the smallest hole passes, so brightness teaches nothing'
      if (holes.has(HOLES.at(-1))) return 'the biggest hole passes, so blur teaches nothing'
      // Height must come from the ratio f/Z: a passing f at one Z fails at another.
      const sample = good[0]
      if (solved({ ...sample, Z: sample.Z + 40, s: sample.s + 40 })) return 'height does not depend on f/Z'
      return ''
    },
  },
  racer: {
    about: t('核速判：看输入和输出，限时选出是哪个 3×3 核', 'the kernel sprint: from an input and its output, pick the 3×3 kernel against the clock'),
    board: 'KernelRacer',
    params: S.obj({
      kernels: S.list(S.obj({ id: S.str(), cells: S.list(num, { min: 9 }), div: num }), { about: t('核按 3×3 核元件的读法：权重是 cells ÷ div', 'kernels as the 3×3 kernel part reads them: the weights are cells ÷ div') }),
      inputs: S.list(S.call('picture')),
      rounds: S.int({ min: 1 }), pass: S.int({ min: 1 }), minGap: num,
      time: S.obj({ start: num, step: num, min: num }, { about: t('第 n 轮（从 0 数）的秒数：max(min, start − step·n)', 'the seconds for round n (from 0): max(min, start − step·n)') }),
    }),
    setup: ({ kernels, inputs, rounds, pass, minGap, time }) => {
      const racer = { rounds, pass, minGap }
      const kernelsWithWeights = kernels.map((k) => ({ ...k, w: k.cells.map((c) => c / k.div) }))
      const pictures = inputs.map(picture)
      return {
        kernels: kernelsWithWeights,
        racer,
        rounds: (seed) => racerRounds({ kernels: kernelsWithWeights, inputs: pictures, racer }, seed),
        timeFor: (round) => Math.max(time.min, time.start - time.step * round),
      }
    },
    verify: ({ kernels, racer, rounds }) => {
      for (let seed = 1; seed <= 40; seed++) {
        const a = rounds(seed)
        const b = rounds(seed)
        if (JSON.stringify(a.map((r) => [r.inputIndex, r.choices, r.answer])) !== JSON.stringify(b.map((r) => [r.inputIndex, r.choices, r.answer]))) return `种子 ${seed} 不确定`
        for (const [index, round] of a.entries()) {
          const outputs = round.choices.map((c) => correlate(round.input, kernels[c].w))
          const matching = outputs.filter((o) => maxAbsDiff(o, round.output) < 1e-9).length
          if (matching !== 1 || maxAbsDiff(outputs[round.answer], round.output) > 1e-9) return `种子 ${seed} 第 ${index + 1} 轮答案不唯一`
          if (new Set(round.choices).size !== 4) return `种子 ${seed} 第 ${index + 1} 轮选项重复`
        }
        // Always pressing the same key must not pass.
        for (let key = 0; key < 4; key++) {
          const hits = a.filter((r) => r.answer === key).length
          if (hits >= racer.pass) return `种子 ${seed} 一直按 ${key + 1} 能对 ${hits} 轮`
        }
      }
      return ''
    },
  },
  wave: {
    about: t('一道波：c + A·cos(2π·k·x/N + φ·π/4)，每一步开放几个旋钮，调到和目标重合', 'one wave, c + A·cos(2π·k·x/N + φ·π/4): each step opens some knobs to lay it on the target'),
    board: 'WaveBench',
    params: S.obj({
      N: S.int({ min: 2 }),
      knobs: S.map(KNOB),
      stages: S.list(S.obj({ ...STAGE_TEXT, knobs: S.list(S.str()), start: S.map(num), target: S.map(num), win: text })),
    }),
    setup: (p) => ({ wave: waveBench(p) }),
    verify: ({ wave }) => {
      for (const [i, s] of wave.stages.entries()) {
        if (wave.same(s.start, s.target)) return `第 ${i + 1} 步一开始就算完成`
        for (const [knob, { min, max, step }] of Object.entries(wave.knobs)) {
          for (const v of [s.start[knob], s.target[knob]]) {
            if (v < min || v > max || Math.abs(min + Math.round((v - min) / step) * step - v) > 1e-9) return `第 ${i + 1} 步的 ${knob} = ${v} 不在刻度上`
          }
          if (!s.knobs.includes(knob) && s.start[knob] !== s.target[knob]) return `第 ${i + 1} 步的 ${knob} 不能转，却和目标不同`
        }
      }
      return ''
    },
  },
  sum: {
    about: t('叠加：频率 ks 各一道正弦波、各一个振幅旋钮，叠到目标上', 'stacking waves: a sine wave and an amplitude knob for each frequency in ks, stacked onto the target'),
    board: 'SumBench',
    params: S.obj({
      N: S.int({ min: 2 }), ks: S.list(S.int()), step: num, max: num, tolerance: num,
      stages: S.list(S.obj({ ...STAGE_TEXT, target: nums, win: text }), { about: t('最后一步的目标是一道陡边（接近方波）', 'the last step’s target is a steep edge (near a square wave)') }),
    }),
    setup: (p) => ({ sum: sumBench(p) }),
    verify: ({ sum }) => {
      for (const [i, s] of sum.stages.entries()) {
        if (sum.gap(sum.ks.map(() => 0), s.target) <= sum.tolerance) return `第 ${i + 1} 步一开始就算完成`
        const nearest = s.target.map((a) => Math.round(a / sum.step) * sum.step)
        if (sum.gap(nearest, s.target) > sum.tolerance) return `第 ${i + 1} 步在刻度上调不到`
        if (s.target.some((a) => a > sum.max)) return `第 ${i + 1} 步的振幅超出旋钮范围`
      }
      // Leaving out the high odd waves must not pass: the steep edge is the point.
      const edge = sum.stages.at(-1).target
      if (sum.gap(edge.map((a, i) => (i < 3 ? a : 0)), edge) <= sum.tolerance) return '只用频率 1 和 3 就叠出了方波'
      return ''
    },
  },
  probe: {
    about: t('探针：曲线乘一道波再平均，读出一个频率', 'the probe: a curve times a wave, averaged, reads one frequency'),
    board: 'ProbeBench',
    params: S.obj({
      N: S.int({ min: 2 }),
      knobs: S.map(KNOB),
      wave: S.obj({ k: S.int(), A: num }, { about: t('可以错开的那道输入波（中线 0.5）', 'the input wave that can be shifted (on a middle line of 0.5)') }),
      stages: S.list(S.obj({
        ...STAGE_TEXT, status: text, win: text,
        kind: S.oneOf(['find', 'read', 'blind', 'combine']), knobs: S.list(S.str()), start: S.map(num),
        input: S.opt(WAVES), k: S.opt(S.int()), amplitude: S.opt(num), checks: S.opt(nums),
        answers: S.str({ about: t('这一步接受的全部答案，用逗号连起', 'every answer the step accepts, joined by commas') }),
      })),
    }),
    setup: ({ N, knobs, wave, stages }) => ({ probe: probeBench({ N, knobs, wave, combine: COMBINE, stages: stages.map((s) => (s.input ? { ...s, input: wavesAt(s.input) } : s)) }) }),
    // Every step must start unsolved and be solved by exactly the answers it means.
    verify: ({ probe }) => {
      for (const [i, s] of probe.stages.entries()) {
        if (probe.solved(s, s.start)) return `第 ${i + 1} 步一开始就算完成`
        const answers = probe.answers(s)
        if (answers.join() !== s.answers) return `第 ${i + 1} 步的答案是 ${answers.join('、')}，不是 ${s.answers}`
      }
      return ''
    },
  },
  alias: {
    about: t('采样台：连续的波变成一排点，看采样弄丢什么、造出什么', 'the sampling bench: a continuous wave turned into points, what sampling loses and what it makes up'),
    board: 'AliasProbe',
    params: S.obj({
      fine: S.int({ min: 2 }),
      ranges: S.map(S.list(S.int(), { min: 2 })),
      stages: S.list(S.obj({
        ...STAGE_TEXT, control: S.oneOf(['k', 'M', 'K']), start: S.int(), samples: S.opt(S.int()),
        reference: S.opt(S.obj({ c: num, A: num, k: S.int(), phase: num })), wave: S.opt(S.obj({ c: num, A: num, k: S.int(), phase: num })),
        parts: S.opt(S.list(S.obj({ k: S.int(), A: num, phase: num }))),
      })),
      answers: S.list(S.list(S.int()), { about: t('每一步能过的全部值', 'every value each step passes with') }),
      folds: S.list(S.list(S.int(), { min: 3 }), { about: t('不滤就采时，频率 k 采 M 个点后折回到哪里：[k, M, 折回的频率]', 'where a frequency k folds to when M points are sampled unfiltered: [k, M, the frequency it poses as]') }),
    }),
    setup: ({ answers, folds, ...p }) => ({ alias: aliasBench(p) }),
    verify: ({ alias }, { answers, folds }) => {
      const found = alias.stages.map((stage) => {
        const [lo, hi] = alias.ranges[stage.control]
        if (alias.solved(stage, stage.start)) return null
        return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => alias.solved(stage, v))
      })
      if (found.some((a) => a === null)) return '有一步一开始就算完成'
      for (const [i, a] of found.entries()) if (a.join() !== answers[i].join()) return `第 ${i + 1} 步的答案是 ${a.join('、')}`
      for (const [k, M, as] of folds) if (alias.aliasOf(k, M) !== as) return '折回的频率不对'
      return ''
    },
  },
  stop: {
    about: t('什么时候停：多项式拟合几个带噪声的样本，看训练误差和新样本误差怎么走', 'when to stop: a polynomial fitted to a few noisy samples, the training error against the error on new samples'),
    board: 'EarlyStop',
    params: S.obj({
      degree: S.int({ min: 1 }), seed: S.int(), wave: S.num({ about: t('真实的曲线是 sin(wave·x)', 'the true curve is sin(wave·x)') }),
      train: S.int({ min: 1 }), noise: num, valid: S.int({ min: 2 }), checkpoints: nums, rate: num, lambdas: nums, slack: num,
      stages: S.list(S.obj({ ...STAGE_TEXT, control: S.oneOf(['step', 'lambda']) })),
    }),
    setup: ({ wave, ...p }) => ({ stop: stopBench({ ...p, truth: (x) => Math.sin(wave * x) }) }),
    verify: ({ stop }, { lambdas, stages }) => {
      const run = stop.training()
      const valid = run.map((r) => r.valid)
      const bottom = valid.indexOf(Math.min(...valid))
      if (bottom === 0 || bottom === run.length - 1) return '验证误差没有先降后升'
      if (run.at(-1).train >= run[bottom].train) return '训练误差没有一直下降'
      if (stop.passes(stages[0], { step: 0 }) || stop.passes(stages[0], { step: run.length - 1 })) return '一开始或训练到底也能过'
      const good = lambdas.map((_, i) => i).filter((i) => stop.passes(stages[1], { lambda: i }))
      if (!good.length || good.includes(0) || good.includes(lambdas.length - 1)) return 'λ 的两端也能过，或者都不能过'
      return ''
    },
  },
  contrast: {
    about: t('拉近与推开：没有标签，训练编码器让每张图的两个变形版本互相认出', 'pull close, push apart: with no labels, train an encoder so two altered views of each picture find each other'),
    board: 'AttendContrast',
    params: S.obj({ names: S.list(S.str()), base: S.list(S.call('picture')), tau: num, rate: num, goal: num, collapse: num, testSeeds: S.list(S.int()) }),
    setup: ({ base, ...p }) => ({ model: contrastBench({ ...p, base: base.map(picture) }) }),
    verify: ({ model: contrast }) => {
      if (contrast.evaluate(contrast.init()).pass) return 'the untrained encoder already passes'
      // InfoNCE reaches the goal within 200 steps (ten presses of 训练 20 步).
      let model = contrast.init()
      let reached = -1
      for (let step = 0; step < 200 && reached < 0; step += 20) {
        model = contrast.train(model, step, 20, true).model
        if (contrast.evaluate(model).pass) reached = step + 20
      }
      if (reached < 0) return 'InfoNCE does not reach the goal in 200 steps'
      // Pulling positives alone never passes and ends collapsed, even after twice as long.
      model = contrast.init()
      for (let step = 0; step < 400; step += 20) {
        model = contrast.train(model, step, 20, false).model
        if (contrast.evaluate(model).pass) return `pull-only passes at step ${step + 20}`
      }
      const end = contrast.evaluate(model)
      if (!end.collapsed) return `pull-only did not collapse (mean negative cosine ${end.negative.toFixed(2)})`
      return ''
    },
  },
  hough: {
    about: t('投票：边缘点给经过它的每条直线投票，调分箱大小让两个峰正好是两条线', 'voting: edge points vote for every line through them; set the bin size so the two peaks are the two lines'),
    board: 'HoughVote',
    params: S.obj({
      scenes: S.list(S.obj({ label: text, seed: S.int(), lines: S.list(S.obj({ theta: num, rho: num, n: S.int(), from: S.opt(num), to: S.opt(num) })), outliers: S.int() })),
      steps: S.list(pt, { about: t('分箱旋钮的每一格：[Δθ°, Δρ]', 'each step of the bin-size dial: [Δθ°, Δρ]') }),
      rhoMax: num, tol: S.obj({ theta: num, rho: num }),
    }),
    setup: ({ scenes, ...p }) => ({ model: houghBench({ ...p, scenes: scenes.map(({ label, seed, lines, outliers }) => ({ label, lines, points: houghScene(seed, lines, outliers) })) }) }),
    verify: ({ model }) => {
      const { steps, rhoMax } = model
      const pattern = steps.map((_, step) => model.passesAll(step))
      if (!pattern.some(Boolean)) return 'no bin size passes every scene'
      if (pattern[0] || pattern[1]) return 'the finest bins pass'
      if (pattern.at(-1) || pattern.at(-2)) return 'the coarsest bins pass'
      // Coarse bins must fail because the two rails fall into one cell or neighbouring cells: one peak.
      const [dTheta, dRho] = steps.at(-1)
      const [a, b] = model.scenes[0].lines
      const cell = (line) => [Math.floor(line.theta / dTheta), Math.floor((line.rho + rhoMax) / dRho)]
      const [ca, cb] = [cell(a), cell(b)]
      if (Math.abs(ca[0] - cb[0]) > 1 || Math.abs(ca[1] - cb[1]) > 1) return 'coarse bins still separate the two rails'
      if (model.run(model.scenes[0], steps.length - 1).found.filter((i) => i >= 0).length > 1) return 'coarse bins find both rails'
      return ''
    },
  },
  ransac: {
    about: t('共识：每轮随机抽两点连线、数支持它的点，设定轮数和门槛，看几百次试验的成功率', 'consensus: each round joins two random points and counts the support; set the rounds and the threshold, and see the success rate over hundreds of trials'),
    board: 'RansacTrials',
    params: S.obj({
      stages: S.list(S.obj({ label: text, outliers: num, budget: S.int() })),
      n: S.int(), sigma: num, trials: S.int(), tol: S.obj({ theta: num, rho: num }),
      solution: S.obj({ delta: num, k: S.list(S.int()) }, { about: t('一组能过的设定：门槛 δ 和每一种外点比例的轮数', 'settings that pass: the threshold δ and the rounds for each outlier ratio') }),
    }),
    setup: ({ solution, ...p }) => ({ model: ransacBench(p) }),
    verify: ({ model }, { stages, solution }) => {
      const passAll = (delta, ks) => stages.every((stage, i) => model.rate(stage, ks[i], delta).pass)
      if (!passAll(solution.delta, solution.k)) return `reference δ=${solution.delta}, k=${solution.k} fails`
      for (const [i, stage] of stages.entries()) {
        const theory = ransacRounds(1 - stage.outliers)
        if (theory > stage.budget) return `${keyOf(stage.label)}: formula needs ${theory} rounds, budget ${stage.budget}`
        // Far fewer rounds than the formula asks for must fail.
        if (model.rate(stage, Math.ceil(theory / 3), solution.delta).pass) return `${keyOf(stage.label)}: k = ${Math.ceil(theory / 3)} already passes`
        if (i && model.rate(stage, stages[0].budget, solution.delta).pass) return `${keyOf(stage.label)}: the first stage's k passes, k needs no thought`
      }
      // δ too large lets outliers in; δ too small loses inliers; neither is rescued by the budget.
      if (passAll(6, stages.map((s) => s.budget))) return 'δ = 6 passes'
      if (passAll(0.25, stages.map((s) => s.budget))) return 'δ = 0.25 passes'
      if (passAll(2.5, stages.map((s) => s.budget))) return 'δ = 2.5 passes'
      return ''
    },
  },
  cover: {
    about: t('四个角：在封面和照片上连出对应点，解出单应，把封面贴回照片', 'four corners: pair points on the cover and in the photo, solve the homography, paste the cover back'),
    board: 'BookCover',
    params: S.obj({
      cover: S.obj({ w: num, h: num }), photo: S.obj({ w: num, h: num }),
      title: S.list(num, { min: 4 }), logo: S.list(num, { min: 4 }), quad,
      clutter: S.obj({ note: quad, paper: quad }), seed: S.int(), tol: num,
    }),
    setup: (p) => ({ model: coverBench(p) }),
    verify: ({ model }) => {
      const { trueH, coverPoints, photoPoints, fit, overlayError, photoIndexOf, tol } = model
      if (!trueH) return 'no true pose'
      // The DLT must recover a known homography exactly from 4 noise-free pairs.
      const exact = homographyDLT(coverPoints.slice(0, 4).map((from) => ({ from, to: project(trueH, ...from) })))
      if (!(overlayError(exact) < 1e-6)) return 'DLT does not recover the true H'
      const goal = fit([0, 1, 2, 3].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
      if (!(goal.error < tol)) return `4 corner pairs give error ${goal.error.toFixed(2)}`
      const other = fit([4, 5, 10, 11].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
      if (!(other.error < tol)) return `title + logo pairs give error ${other.error.toFixed(2)}`
      // No three correct pairs, and not even the best affine fit to all twelve, can reach the goal.
      let bestAffine = Infinity
      for (let i = 0; i < 12; i++) {
        for (let j = i + 1; j < 12; j++) {
          for (let k = j + 1; k < 12; k++) {
            const three = fit([i, j, k].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
            if (three.model) bestAffine = Math.min(bestAffine, three.error)
          }
        }
      }
      if (bestAffine < 3 * tol) return `three pairs reach error ${bestAffine.toFixed(2)}`
      const lsq = affineFit(coverPoints.map((from, c) => ({ from, to: photoPoints[photoIndexOf(c)].at })))
      if (overlayError(lsq) < 3 * tol) return 'least-squares affine fits'
      // One wrong pair (title corner matched to the cover corner) must fail.
      const wrong = fit([0, 1, 2, 7].map((c, i) => ({ cover: i === 3 ? 3 : c, photo: photoIndexOf(c) })))
      if (wrong.error < tol) return 'a wrong pair passes'
      return ''
    },
  },
  gan: {
    about: t('骗过鉴定员：两支笔的生成器对一个鉴定员，按你定的节奏轮流训练', 'fooling the judge: a two-pen generator against a discriminator, trained in turns at the rhythm you set'),
    board: 'GanDuel',
    params: S.obj({
      n: S.int({ min: 1 }), mode: num, width: num, rateD: num, start: S.list(num, { min: 2 }), win: S.int({ min: 1 }),
      options: S.obj({ dSteps: S.list(S.int()), gSteps: S.list(S.int()), gRate: nums }),
      fallback: S.obj({ dSteps: S.int(), gSteps: S.int(), gRate: num }), good: S.obj({ dSteps: S.int(), gSteps: S.int(), gRate: num }),
    }),
    setup: (p) => ({ model: ganBench(p) }),
    verify: ({ model: m }) => {
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
    },
  },
}

/** A bench level's fields for its board (`board` and what the bench makes of its setup) and its verify(). */
export function benchOf(name, setup) {
  const bench = BENCHES[name]
  const fields = bench.setup(setup)
  return { board: bench.board, ...fields, verify: () => bench.verify(fields, setup) }
}
