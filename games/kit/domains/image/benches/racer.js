// The kernel sprint: each round shows an input and what one 3×3 kernel made of it, with four kernel cards to choose
// from. Rounds come from a seed (one per attempt), so a retry is a new set and a check can replay any of them. As a
// bench it is a process: start, answer (or run out of time), a short look at the right card, the next round.
import { S } from '../../../engine/schema.js'
import { limitOf } from '../../../engine/bench.js'
import { correlate, random } from '../engine/image.js'
import { picture } from '../items/pictures.js'
import { T as t } from '../../../shell/i18n.js'

const num = S.num()

export const maxAbsDiff = (a, b) => a.data.reduce((worst, v, i) => Math.max(worst, Math.abs(v - b.data[i])), 0)

/**
 * Rounds from a seed. kernels: [{ id, w }]; inputs: the pictures a round may show; racer: { rounds, minGap } — a
 * round is kept only if every wrong card would have produced an output at least `minGap` away somewhere.
 */
export function racerRounds({ kernels, inputs, racer }, seed) {
  const next = random(seed * 7919 + 13)
  const pick = (n) => Math.floor(next() * n)
  const rounds = []
  let previous = null
  while (rounds.length < racer.rounds) {
    const inputIndex = pick(inputs.length)
    const answer = pick(kernels.length)
    if (answer === previous) continue
    const others = kernels.map((_, i) => i).filter((i) => i !== answer)
    const choices = [answer]
    while (choices.length < 4) choices.push(others.splice(pick(others.length), 1)[0])
    for (let i = choices.length - 1; i > 0; i--) {
      const j = pick(i + 1)
      ;[choices[i], choices[j]] = [choices[j], choices[i]]
    }
    const input = inputs[inputIndex]
    const output = correlate(input, kernels[answer].w)
    const gap = Math.min(...choices.filter((c) => c !== answer).map((c) => maxAbsDiff(correlate(input, kernels[c].w), output)))
    if (gap < racer.minGap) continue
    previous = answer
    rounds.push({ inputIndex, input, output, choices, answer: choices.indexOf(answer) })
  }
  return rounds
}

/** The bench model: knob `untimed`; acts start, answer (arg: the card, or null when time is up), next; quantity right. */
export const racer = {
  about: t('核速判：看输入和输出，限时选出是哪个 3×3 核；旋钮 untimed（不限时）；一局结束后 final 是答对的轮数', 'the kernel sprint: from an input and its output, pick the 3×3 kernel against the clock; knob untimed; once a run ends, final is how many rounds were right'),
  setup: S.obj({
    kernels: S.list(S.obj({ id: S.str(), cells: S.list(num, { min: 9, view: 'grid' }), div: num }), { about: t('核按 3×3 核元件的读法：权重是 cells ÷ div', 'kernels as the 3×3 kernel part reads them: the weights are cells ÷ div') }),
    inputs: S.list(S.call('picture')),
    rounds: S.int({ min: 1 }), minGap: num,
    time: S.obj({ start: num, step: num, min: num }, { about: t('第 n 轮（从 0 数）的秒数：max(min, start − step·n)', 'the seconds for round n (from 0): max(min, start − step·n)') }),
  }),
  make({ kernels, inputs, rounds: total, minGap, time }, bench) {
    const weighted = kernels.map((k) => ({ ...k, w: k.cells.map((c) => c / k.div) }))
    const pictures = inputs.map(picture)
    const pass = limitOf(bench.goal, 'final').atLeast
    const generate = (seed) => racerRounds({ kernels: weighted, inputs: pictures, racer: { rounds: total, minGap } }, seed)
    const cache = new Map()
    const rounds = (seed) => {
      if (!cache.has(seed)) cache.set(seed, generate(seed))
      return cache.get(seed)
    }
    const timeFor = (round) => Math.max(time.min, time.start - time.step * round)
    const right = (p) => p.results.filter(Boolean).length
    return {
      kernels: weighted,
      pass,
      generate,
      start: () => ({ phase: 'ready', attempt: 1, index: 0, results: [], feedback: null }),
      act(p, name, v, arg) {
        const round = rounds(p.attempt)[p.index]
        if (name === 'start') return { ...p, phase: 'play', attempt: p.phase === 'done' ? p.attempt + 1 : p.attempt, index: 0, results: [], feedback: null }
        if (name === 'answer') return p.phase !== 'play' || p.feedback ? p : { ...p, feedback: { chosen: arg }, results: [...p.results, arg === round.answer] }
        // next: after the right card was shown, the next round, or the end of the run.
        if (p.index + 1 < total) return { ...p, index: p.index + 1, feedback: null }
        return { ...p, phase: 'done', feedback: null }
      },
      // The clock runs out as a wrong answer; the right card shows briefly before the next round.
      after(p, v) {
        if (p.feedback) return { ms: p.feedback.chosen === rounds(p.attempt)[p.index].answer ? 450 : 1100, act: 'next' }
        if (p.phase === 'play' && !v.untimed) return { ms: timeFor(p.index) * 1000, act: 'answer', arg: null }
        return null
      },
      view(v, { process: p }) {
        const n = right(p)
        const round = p.phase === 'play' ? rounds(p.attempt)[p.index] : null
        const seconds = timeFor(p.index)
        return {
          final: p.phase === 'done' ? n : null,
          playing: p.phase === 'play',
          done: p.phase === 'done',
          round,
          seconds,
          dots: Array.from({ length: total }, (_, i) => (i < p.results.length ? (p.results[i] ? 'right' : 'wrong') : i === p.index && p.phase === 'play' ? 'now' : '')),
          score: t(`答对 ${n} / ${total} · 过关需 ${pass}`, `Correct ${n} / ${total} · ${pass} to pass`),
          result: p.phase === 'done' ? { text: n >= pass ? t(`答对 ${n} / ${total}，过关。`, `${n} / ${total} correct. Passed.`) : t(`答对 ${n} / ${total}，还差 ${pass - n} 轮。`, `${n} / ${total} correct, ${pass - n} short.`), tone: n >= pass ? 'pass' : '' } : null,
          rules: [t(`${total} 轮`, `${total} rounds`), t(`答对 ${pass} 轮过关`, `${pass} correct to pass`), v.untimed ? t('不限时', 'No time limit') : t(`首轮 ${timeFor(0).toFixed(0)} 秒，逐轮缩短`, `${timeFor(0).toFixed(0)} s for the first round, shorter after`)].map((text) => ({ text })),
          labels: { start: p.phase === 'done' ? t('再玩一局', 'Play again') : t('开始', 'Start') },
          say: !p.feedback
            ? { text: t('点击选择，或按数字键 1–4。', 'Click one, or press 1–4.'), phone: t('点击选择一个核。', 'Tap a kernel.') }
            : p.feedback.chosen === null ? { text: t('时间到。', 'Time is up.'), tone: 'fail' } : p.feedback.chosen === round?.answer ? { text: t('正确。', 'Correct.'), tone: 'pass' } : { text: t('错误，正确答案已标出。', 'Wrong. The correct one is marked.'), tone: 'fail' },
        }
      },
    }
  },
  verify(model) {
    const { kernels, generate, pass } = model
    for (let seed = 1; seed <= 40; seed++) {
      const a = generate(seed)
      const b = generate(seed)
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
        if (hits >= pass) return `种子 ${seed} 一直按 ${key + 1} 能对 ${hits} 轮`
      }
    }
    return ''
  },
}
