// The kernel sprint (KernelRacer.jsx): each round shows an input and what one 3×3 kernel made of it, with four kernel
// cards to choose from. Rounds come from a seed, so a retry is a new set and a check can replay any of them.
import { correlate, random } from '../engine/image.js'

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
