// The wave benches of 视觉完备 chapter 2, on rows of N points: one wave tuned by its four numbers (wave), sine waves
// stacked up (sum), a probe that multiplies the row by a wave and averages (probe), and sampling (alias). Each is a
// bench model (image/core/bench.js): what it computes from the knobs, for the bench's displays and its goal.
import { S } from 'kernel'
import { benchRun, limitOf, openKnobs, passingSettings, startValues } from 'image'
import { aliasOf, cosine, maxDiff, sampleAt, sinusoid, throughSamples } from 'image'
import { T as t } from 'kernel'

const num = S.num()

/* ---------- 叠加: 0.5 + Σ aₖ·sin(2π·k·x/N) ---------- */

export const sum = {
  about: t('叠加：频率 ks 各一道正弦波，振幅旋钮名为 k1、k2…，叠到目标上'),
  setup: S.obj({ N: S.int({ min: 2 }), ks: S.list(S.int()) }),
  stage: S.obj({ target: S.list(num, { about: t('每个频率的振幅') }) }),
  make({ N, ks }, bench) {
    const components = ks.map((k) => sinusoid(k, 'sin'))
    const curve = (amps) => (u) => 0.5 + amps.reduce((s, a, i) => s + a * components[i](u), 0)
    const amplitudes = (v) => ks.map((k) => v[`k${k}`])
    const tolerance = limitOf(bench.goal, 'gap').atMost
    return {
      view(v, { stage }) {
        const amps = amplitudes(v)
        const yours = curve(amps)
        const target = curve(stage.target)
        const row = sampleAt(yours, N)
        const targetRow = sampleAt(target, N)
        const gap = maxDiff(row, targetRow)
        const mean = row.reduce((s, x) => s + x, 0) / N
        const used = amps.map((a, i) => [a, ks[i]]).filter(([a]) => a)
        return {
          gap,
          yours, target, row, targetRow,
          formula: ['0.5', ...used.flatMap(([a, k]) => [' + ', { b: a.toFixed(2) }, `·sin(k=${k})`]), { muted: [' · ', t(`这一行的平均 ${mean.toFixed(3)}`, `row average ${mean.toFixed(3)}`), ' · ', t(`最大误差 ${gap.toFixed(3)}，须不超过 ${tolerance}`, `largest error ${gap.toFixed(3)}, at most ${tolerance}`)] }],
        }
      },
    }
  },
  verify(model, bench) {
    const { ks } = bench.setup
    const names = ks.map((k) => `k${k}`)
    const valuesOf = (amps) => Object.fromEntries(names.map((name, i) => [name, amps[i]]))
    const passes = (stageIndex, v) => benchRun(bench, model, v, { stageIndex }).pass
    for (const [i, s] of bench.stages.entries()) {
      const start = startValues(bench, s)
      if (passes(i, start)) return `第 ${i + 1} 步一开始就算完成`
      const open = openKnobs(bench, s)
      const nearest = s.target.map((a, index) => {
        const name = names[index]
        const { min, step } = bench.knobs[name]
        return open.includes(name) ? min + Math.round((a - min) / step) * step : start[name]
      })
      if (!passes(i, { ...start, ...valuesOf(nearest) })) return `第 ${i + 1} 步在刻度上调不到`
      if (s.target.some((a, index) => a > bench.knobs[names[index]].max)) return `第 ${i + 1} 步的振幅超出旋钮范围`
    }
    // Leaving out the high odd waves must not pass: the steep edge is the point.
    const edge = bench.stages.at(-1).target
    if (passes(bench.stages.length - 1, valuesOf(edge.map((a, i) => (i < 3 ? a : 0))))) return '只用频率 1 和 3 就叠出了方波'
    return ''
  },
}

/* ---------- 探针: a curve times a wave, averaged ---------- */

// A wave on a middle line of c: the sum of cos waves of frequency k, amplitude A, `shift` degrees late (u ∈ [0, 1)).
const WAVES = S.obj({ c: num, waves: S.list(S.obj({ k: S.int(), A: num, shift: S.opt(num) })) })
const wavesAt = ({ c, waves }) => {
  const components = waves.map(({ k, A, shift = 0 }) => cosine({ k, A, phase: -shift }))
  return (u) => components.reduce((s, wave) => s + wave(u), c)
}
const multiplyCurves = (a, b) => (u) => a(u) * b(u)
// The ways of putting the cos reading a and the sin reading b together (the `pick` knob's values).
const COMBINE = { cos: (a) => a, sin: (a, b) => b, sum: (a, b) => a + b, mag: (a, b) => Math.hypot(a, b) }
const readingText = (v) => (Math.abs(v) < 0.0005 ? '0.000' : v.toFixed(3))

export const probe = {
  about: t('探针：曲线乘一道波再平均，读出一个频率；旋钮 j（探针频率）、m（读数乘以）、shift（输入错开）、pick（两个读数的合法：cos、sin、sum、mag）'),
  setup: S.obj({ N: S.int({ min: 2 }), wave: S.obj({ k: S.int(), A: num }, { about: t('可以错开的那道输入波（中线 0.5）') }) }),
  stage: S.obj({
    kind: S.oneOf(['find', 'read', 'blind', 'combine'], { about: t('find：转频率找到它；read：读出振幅；blind：错开到读不到；combine：合两个读数') }),
    input: S.opt(WAVES), checks: S.opt(S.list(num, { about: t('合读数时试的几个错开角度') })),
    answers: S.str({ about: t('这一步接受的全部答案，用逗号连起') }),
  }),
  make({ N, wave: w }) {
    const reading = (product) => sampleAt(product, N).reduce((s, v) => s + v, 0) / N
    const shifted = (shift) => cosine({ ...w, c: 0.5, phase: -shift })
    const readingsAt = (shift) => ['cos', 'sin'].map((form) => 2 * reading(multiplyCurves(shifted(shift), sinusoid(w.k, form))))
    return {
      view(v, { stage: s }) {
        const input = s.input ? wavesAt(s.input) : shifted(v.shift)
        const k = s.kind === 'find' || s.kind === 'read' ? v.j : w.k
        const forms = s.kind === 'combine' ? ['cos', 'sin'] : ['cos']
        const probes = forms.map((form) => ({ name: t(`${form} 探针 · 频率 ${k}`, `${form} probe · frequency ${k}`), f: sinusoid(k, form) }))
        const products = probes.map(({ f }) => multiplyCurves(input, f))
        const averages = products.map(reading)
        const times = s.kind === 'read' ? v.m : 2
        const readings = averages.map((a) => a * times)
        const combined = v.pick && COMBINE[v.pick](readings[0], readings[1])
        return {
          average: averages[0],
          reading: readings[0],
          signal: {
            lines: [{ curve: input, kind: 'faint', label: t('输入', 'input') }, ...probes.map((p) => ({ curve: p.f, kind: 'seen', label: p.name }))],
            legend: [{ kind: 'faint', label: t('输入', 'Input') }, { kind: 'seen', label: probes.flatMap((p, i) => (i ? [' · ', p.name] : [p.name])) }],
          },
          product: {
            lines: products.flatMap((product, i) => [{ curve: product, kind: 'yours', label: t('乘积') }, { curve: () => averages[i], kind: 'target', label: t('平均') }]),
            legend: [{ kind: 'yours', label: t('逐点相乘') }, { kind: 'target', label: t('乘积的平均') }],
          },
          formula: [
            ...probes.flatMap((p, i) => [
              i ? ' · ' : '', p.name, '：', t('平均'), ' ', { b: readingText(averages[i]) },
              ...(s.kind === 'read' ? [` × ${v.m} = `, { b: readingText(readings[i]) }] : []),
              ...(s.kind === 'blind' || s.kind === 'combine' ? [' → ', t('读数'), ' ', { b: readingText(readings[i]) }] : []),
            ]),
            ...(s.kind === 'combine' && v.pick ? [' · ', pickName(v.pick), ' = ', { b: readingText(combined) }] : []),
          ],
          // The chosen combination at the stage's other shifts.
          tries: s.kind === 'combine' && v.pick ? [t('错开不同角度时：'), s.checks.map((phase) => `${phase}° → ${readingText(COMBINE[v.pick](...readingsAt(phase)))}`).join(' · ')] : null,
        }
      },
    }
  },
  // Every step must start unsolved and be solved by exactly the answers it means.
  verify(model, bench) {
    for (const [i, s] of bench.stages.entries()) {
      const start = startValues(bench, s)
      if (benchRun(bench, model, start, { stageIndex: i }).pass) return `第 ${i + 1} 步一开始就算完成`
      const answers = passingSettings(bench, model, i, s.kind === 'combine' ? ['pick'] : undefined)
      if (answers.join() !== s.answers) return `第 ${i + 1} 步的答案是 ${answers.join('、')}，不是 ${s.answers}`
    }
    return ''
  },
}
const pickName = (pick) => ({ cos: t('只看 a'), sin: t('只看 b'), sum: 'a + b', mag: '√(a² + b²)' })[pick]

/* ---------- 采样: a continuous wave turned into points ---------- */

const PART = S.obj({ k: S.int(), A: num, phase: num })
const COSINE = S.obj({ c: num, A: num, k: S.int(), phase: num })

export const alias = {
  about: t('采样台：连续的波变成一排点；每一步只开 k（冒名的频率）、M（采样点数）、K（采样前保留的最高频率）中的一个'),
  setup: S.obj({
    fine: S.int({ min: 2 }),
    folds: S.list(S.list(S.int(), { min: 3 }), { about: t('不滤就采时，频率 k 采 M 个点后折回到哪里：[k, M, 折回的频率]') }),
  }),
  stage: S.obj({
    samples: S.opt(S.int()), reference: S.opt(COSINE), wave: S.opt(COSINE), parts: S.opt(S.list(PART)),
    answers: S.str({ about: t('这一步能过的全部值，用逗号连起') }),
  }),
  make({ fine }) {
    const signalOf = (parts, keep = Infinity) => (u) => parts.filter((p) => p.k <= keep).reduce((s, p) => s + cosine({ ...p, c: 0 })(u), 0.5)
    // Can the wave be read back from M samples? The smoothest curve through them must be the wave.
    const faithful = (w, M) => maxDiff(sampleAt(throughSamples(sampleAt(cosine(w), M)), fine), sampleAt(cosine(w), fine)) < 1e-6
    const smooth = (f) => sampleAt(f, fine)
    const dotsOf = (f, n, kind = 'sample') => sampleAt(f, n).map((value, j) => ({ u: j / n, v: value, kind }))
    const TRUE = t('真实信号', 'true signal')
    const SEEN = t('采样后看到的信号', 'signal as sampled')
    const legendOf = (more = []) => [{ kind: 'faint', label: t('真实信号', 'True signal') }, { kind: 'seen', label: t('采样后看到的信号', 'Signal as sampled') }, ...more]
    const views = {
      k(s, v) {
        const real = cosine({ ...s.reference, k: v })
        const seen = aliasOf(v, s.samples)
        return {
          k: v,
          sampleGap: maxDiff(sampleAt(real, s.samples), sampleAt(cosine(s.reference), s.samples)),
          plot: {
            lines: [{ curve: smooth(real), kind: 'faint', label: TRUE }, { curve: smooth(throughSamples(sampleAt(real, s.samples))), kind: 'seen', label: SEEN }],
            dots: [...dotsOf(cosine(s.reference), s.samples, 'ring').map((d) => ({ ...d, label: t('k = 3 的采样点', 'sample of k = 3') })), ...dotsOf(real, s.samples)],
            legend: legendOf([{ kind: 'ring', label: t('k = 3 的采样点', 'Samples of k = 3') }]),
          },
          readout: t(`真实 k = ${v} · 16 个采样点呈现为 k = ${seen}`, `True k = ${v} · 16 points look like k = ${seen}`),
          status: v === s.reference.k ? t('这是 k = 3 本身，请另选一个频率。') : t('采样点尚未与圆圈重合。'),
          win: t(`k = ${v} 的采样结果与 k = 3 完全相同：16 − 3 = 13，16 + 3 = 19。`, `k = ${v} gives exactly the same samples as k = 3: 16 − 3 = 13, 16 + 3 = 19.`),
        }
      },
      M(s, v) {
        const real = cosine(s.wave)
        const ok = faithful(s.wave, v)
        const as = aliasOf(s.wave.k, v)
        return {
          faithful: ok,
          fewer: faithful(s.wave, v - 1),
          plot: { lines: [{ curve: smooth(real), kind: 'faint', label: TRUE }, { curve: smooth(throughSamples(sampleAt(real, v))), kind: 'seen', label: SEEN }], dots: dotsOf(real, v), legend: legendOf() },
          readout: t(
            `M = ${v} · 每个周期 ${(v / s.wave.k).toFixed(1)} 个点 · ${ok ? `呈现为 k = ${s.wave.k}，判断正确` : as === s.wave.k ? '频率看似正确，但振幅和位置都已改变' : `呈现为 k = ${as}，判断错误`}`,
            `M = ${v} · ${(v / s.wave.k).toFixed(1)} points per cycle · ${ok ? `looks like k = ${s.wave.k}: correct` : as === s.wave.k ? 'the frequency looks right, but the amplitude and position have changed' : `looks like k = ${as}: wrong`}`,
          ),
          status: ok ? t('仍能正确识别。尝试进一步减少采样点。') : t('识别错误：采样点太少。'),
          win: t(`${v} 个点是最少的点数：每个周期需要多于 2 个采样点（M > 2k）。`, `${v} is the fewest: each cycle needs more than 2 samples (M > 2k).`),
        }
      },
      K(s, v) {
        const real = signalOf(s.parts, v)
        const truth = signalOf(s.parts, s.samples / 2)
        const samples = sampleAt(real, s.samples)
        return {
          sampleGap: maxDiff(samples, sampleAt(truth, s.samples)),
          keepsLow: v >= Math.max(...s.parts.filter((p) => 2 * p.k <= s.samples).map((p) => p.k)),
          plot: {
            lines: [{ curve: smooth(real), kind: 'faint', label: TRUE }, { curve: smooth(truth), kind: 'target', label: t('期望的信号', 'expected signal') }, { curve: smooth(throughSamples(samples)), kind: 'seen', label: SEEN }],
            dots: dotsOf(real, s.samples),
            legend: legendOf([{ kind: 'target', label: t('期望的信号', 'Expected signal') }]),
          },
          readout: t(`16 个采样点可分辨到 k = 8 · 采样前保留 k ≤ ${v}`, `16 samples tell apart frequencies up to k = 8 · keep k ≤ ${v} before sampling`),
          chips: s.parts.map((part) => {
            const kept = part.k <= v
            const folded = kept && 2 * part.k > s.samples
            return { text: [`k = ${part.k}`, folded ? t(` → 混叠为 ${aliasOf(part.k, s.samples)}`, ` → aliases to ${aliasOf(part.k, s.samples)}`) : kept ? '' : t(' 已滤除')], tone: folded ? 'alias' : kept ? '' : 'cut' }
          }),
          status: s.parts.some((p) => p.k <= v && 2 * p.k > s.samples) ? t('有高频分量混入，采样后会混叠为低频。') : t('滤除过多，连应保留的分量也去掉了。'),
          win: t('只保留 k ≤ 8：采样结果与期望一致。'),
        }
      },
    }
    return {
      aliasOf,
      view: (v, { stage }) => {
        const control = stage.opens[0]
        return views[control](stage, v[control])
      },
    }
  },
  verify(model, bench) {
    for (const [i, s] of bench.stages.entries()) {
      const start = startValues(bench, s)
      if (benchRun(bench, model, start, { stageIndex: i }).pass) return '有一步一开始就算完成'
      const found = passingSettings(bench, model, i)
      if (found.join() !== s.answers) return `第 ${i + 1} 步的答案是 ${found.join('、')}`
    }
    for (const [k, M, as] of bench.setup.folds) if (model.aliasOf(k, M) !== as) return '折回的频率不对'
    return ''
  },
}
