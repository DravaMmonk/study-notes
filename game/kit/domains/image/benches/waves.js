// The wave benches of 视觉完备 chapter 2, on rows of N points: one wave tuned by its four numbers (WaveBench.jsx),
// sine waves stacked up (SumBench.jsx), and a probe that multiplies the row by a wave and averages (ProbeBench.jsx).
import { aliasOf, cosine, maxDiff, sampleAt, throughSamples } from '../engine/waves.js'

const TAU = 2 * Math.PI

/** c + A·cos(2π·k·x/N + φ·π/4), the wave a stage tunes. knobs: { [key]: { min, max, step, label } }. */
export function waveBench({ N, knobs, stages }) {
  const at = (p, x) => p.c + p.A * Math.cos((TAU * p.k * x) / N + (p.phi * Math.PI) / 4)
  const row = (p) => Array.from({ length: N }, (_, x) => at(p, x))
  const same = (a, b) => row(a).every((v, x) => Math.abs(v - at(b, x)) < 1e-6)
  return { N, knobs, stages, at, row, same }
}

/** 0.5 + Σ aᵢ·sin(2π·kᵢ·x/N): one amplitude knob per frequency in `ks`, judged by the largest gap to the target. */
export function sumBench({ N, ks, step, max, tolerance, stages }) {
  const at = (amps, x) => 0.5 + amps.reduce((s, a, i) => s + a * Math.sin((TAU * ks[i] * x) / N), 0)
  const row = (amps) => Array.from({ length: N }, (_, x) => at(amps, x))
  const gap = (amps, target) => Math.max(...row(amps).map((v, x) => Math.abs(v - at(target, x))))
  return { N, ks, step, max, tolerance, stages, at, row, gap }
}

/** A cos wave of frequency k and amplitude A, `shift` degrees late, as a function of u ∈ [0, 1). */
export const cosAt = (k, A = 1, shift = 0) => (u) => A * Math.cos(TAU * k * u - (shift * Math.PI) / 180)
export const sinAt = (k) => (u) => Math.sin(TAU * k * u)

/**
 * A probe is a wave multiplied with the row point by point and averaged; read on N points, as the circuits do. Its
 * stages are of four kinds: 'find' (turn the probe's frequency j until it reads something), 'read' (j and a factor m
 * so the reading is the stage's amplitude at frequency k), 'blind' (shift the input until the cos probe reads 0) and
 * 'combine' (pick how two readings a, b combine). The shifted input is `wave`: { k, A } on a middle line of 0.5.
 */
export function probeBench({ N, knobs, stages, wave, combine }) {
  const rowAverage = (f) => Array.from({ length: N }, (_, x) => f(x / N)).reduce((s, v) => s + v, 0) / N
  const reading = (input, probe) => rowAverage((u) => input(u) * probe(u))
  const shifted = (shift) => (u) => 0.5 + cosAt(wave.k, wave.A, shift)(u)
  const cosProbe = (k) => ({ name: { zh: `cos 探针 · 频率 ${k}`, en: `cos probe · frequency ${k}` }, f: cosAt(k) })
  const sinProbe = { name: { zh: `sin 探针 · 频率 ${wave.k}`, en: `sin probe · frequency ${wave.k}` }, f: sinAt(wave.k) }
  const solved = (s, v) => {
    if (s.kind === 'find') return Math.abs(reading(s.input, cosAt(v.j))) > 0.05
    if (s.kind === 'read') return v.j === s.k && Math.abs(reading(s.input, cosAt(v.j)) * v.m - s.amplitude) < 0.005
    if (s.kind === 'blind') return Math.abs(2 * reading(shifted(v.shift), cosAt(wave.k))) < 0.005
    return v.pick === 'mag'
  }
  // The answers a stage accepts, over every setting its knobs can reach.
  const answers = (s) => {
    const grid = (key) => { const { min, max, step } = knobs[key]; return Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step) }
    if (s.kind === 'find') return grid('j').filter((j) => solved(s, { j }))
    if (s.kind === 'read') return grid('j').flatMap((j) => grid('m').filter((m) => solved(s, { j, m })).map((m) => `${j}×${m}`))
    if (s.kind === 'blind') return grid('shift').filter((shift) => solved(s, { shift }))
    return Object.keys(combine).filter((pick) => solved(s, { pick }))
  }
  return {
    knobs,
    stages,
    combine,
    reading,
    input: (s, v) => (s.input ?? shifted(v.shift)),
    probes: (s, v) => (s.kind === 'combine' ? [cosProbe(wave.k), sinProbe] : [cosProbe(v.j ?? wave.k)]),
    readingsAt: (s, shift) => [2 * reading(shifted(shift), cosAt(wave.k)), 2 * reading(shifted(shift), sinAt(wave.k))],
    solved,
    answers,
  }
}

/**
 * The sampling bench (AliasProbe.jsx): each stage turns one control. 'k': find a wave that gives the same M samples as
 * the reference; 'M': the fewest samples that still bring the wave back; 'K': the highest frequency to keep before
 * sampling so the samples are what a faithful low-pass gives. `fine` is how finely curves are compared.
 */
export function aliasBench({ fine, stages, ranges }) {
  const signalOf = (parts, keep = Infinity) => (u) => parts.filter((p) => p.k <= keep).reduce((s, p) => s + cosine({ ...p, c: 0 })(u), 0.5)
  // Can the wave be read back from M samples? The smoothest curve through them must be the wave.
  const faithful = (w, M) => {
    const back = throughSamples(sampleAt(cosine(w), M))
    return maxDiff(sampleAt(back, fine), sampleAt(cosine(w), fine)) < 1e-6
  }
  // What each stage counts as solved, given its one control's value.
  const solved = (stage, v) => {
    if (stage.control === 'k') return v !== stage.reference.k && maxDiff(sampleAt(cosine({ ...stage.reference, k: v }), stage.samples), sampleAt(cosine(stage.reference), stage.samples)) < 1e-6
    if (stage.control === 'M') return faithful(stage.wave, v) && !faithful(stage.wave, v - 1)
    const truth = sampleAt(signalOf(stage.parts, stage.samples / 2), stage.samples)
    const got = sampleAt(signalOf(stage.parts, v), stage.samples)
    return maxDiff(got, truth) < 1e-6 && v >= Math.max(...stage.parts.filter((p) => 2 * p.k <= stage.samples).map((p) => p.k))
  }
  return { stages, ranges, fine, signalOf, solved, aliasOf, faithful }
}
