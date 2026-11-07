// Training a vision board (games/DESIGN.md 6.8): the player wires a model whose parameters are learnable cards
// (`learnable`, `learnableLike` in ops.js); training runs the board on each example with a tape (../../engine/tape.js),
// works the loss's gradient back to every parameter (grad.js) and moves each a step against it, epoch after epoch.
// What it learned is written into the cards' `value` settings, so the board shows and keeps it.
//
//   train({ circuit, parts, examples, validation?, output, loss?, rate, epochs, momentum?, optimizer?, patience?, seed?,
//           init?, restarts? }) → { circuit, curve: { train, validation }, epochs, best, blocked, seed }
//   examples, validation: [{ inputs, expect }] with values read (image.js valueOf)
//   loss      'mse' (the mean square gap over the output's cells, the default) or 'crossEntropy' (the output a grey
//             image of class probabilities, the expected one a one-hot image of the same size)
//   patience  stop once the validation loss has not improved for this many epochs, keeping the best parameters
//   blocked   the resources the gradient met and could not pass (no derivative): what kept a part from learning
//   optimizer 'sgd' (with `momentum`) or 'adam' (each parameter's step scaled by its recent gradients)
//   seed      the start of the parameters that have learned nothing yet: numbers within ±init/2 drawn from this seed
//   restarts  train from this many seeds (seed, seed + 1, …) and keep the run that ends lowest: a small network can
//             stall where it starts, and the player should not lose a level to an unlucky start
//
//   lossOf(output, want, loss) → { value, grad }    one example's loss and its gradient on the output
import { Tape, backward } from '../../engine/tape.js'
import { runBoard } from '../../engine/boards.js'
import { PartError } from '../../engine/circuit.js'
import { RULES, gradOps } from './grad.js'
import { fromRows, isImage, make, toRows } from './image.js'
import { zip } from './ops.js'
import { T } from '../../shell/i18n.js'

/** One example's loss and its gradient with respect to the output. */
export function lossOf(got, want, loss = 'mse') {
  if (loss === 'crossEntropy') {
    if (!isImage(got) || !isImage(want) || got.data.length !== want.data.length) throw new PartError(T('概率和答案要一样大的两张图', 'the probabilities and the answer must be images of one size'))
    const eps = 1e-12
    let value = 0
    const grad = { ...got, data: Array.from(got.data, (p, k) => {
      if (!want.data[k]) return 0
      value -= want.data[k] * Math.log(Math.max(p, eps))
      return -want.data[k] / Math.max(p, eps)
    }) }
    return { value, grad }
  }
  if (isImage(got)) {
    const n = got.data.length
    const gap = zip([got, want], (p, q) => p - q)
    return { value: gap.data.reduce((a, d) => a + d * d, 0) / n, grad: { ...gap, data: Array.from(gap.data, (d) => (2 * d) / n) } }
  }
  return { value: (got - want) ** 2, grad: 2 * (got - want) }
}

/** A seeded generator in [0, 1) (mulberry32), so a training run is the same every time. */
function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = Math.imul(a ^ (a >>> 15), 1 | a)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (text) => [...text].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261)

const asSetting = (v) => (isImage(v) ? toRows(v) : v)
const asValue = (v) => (Array.isArray(v) ? fromRows(v) : v)
const isZero = (v) => (isImage(v) ? v.data.every((x) => x === 0) : v === 0)
const step = (v, g, rate) => zip([v, g], (p, q) => p - rate * q)

export function train({ restarts = 1, seed = 1, ...options }) {
  let best = null
  for (let k = 0; k < restarts; k++) {
    const run = trainOnce({ ...options, seed: seed + k })
    const end = (run.curve.validation[run.best - 1] ?? run.curve.train[run.curve.train.length - 1])
    if (!best || end < best.end) best = { run, end }
  }
  return best.run
}

function trainOnce({ circuit, parts, examples, validation = [], output, loss = 'mse', rate, epochs, momentum = 0, optimizer = 'sgd', patience = null, seed = 1, init = 1 }) {
  const sink = circuit.nodes.find((n) => n.type === 'out' && n.params?.name === output)
  if (!sink) throw new PartError(T(`没有输出「${output}」`, `no output “${output}”`))
  let board = circuit
  const setValues = (values) => {
    board = { ...board, nodes: board.nodes.map((n) => (values.has(n.id) ? { ...n, params: { ...n.params, value: asSetting(values.get(n.id)) } } : n)) }
  }
  const lossOn = (data) => (data.length ? data.reduce((sum, { inputs, expect }) => {
    const got = runBoard(board, { parts, bind: inputs }).outputs[output]
    if (got === undefined || got === null) throw new PartError(T(`输出「${output}」没有值`, `output “${output}” has no value`))
    return sum + lossOf(got, expect[output], loss).value
  }, 0) / data.length : null)

  // The parameters: every leaf the board reaches; those that have learned nothing yet start small and different.
  const probe = new Tape()
  runBoard(board, { parts, bind: examples[0].inputs, ctx: { tape: probe } })
  const keys = [...probe.leaves.keys()]
  if (!keys.length) throw new PartError(T('板上没有可学习的参数', 'the board has no learnable parameter'))
  const start = new Map()
  for (const key of keys) {
    const { value } = probe.leaves.get(key)
    const next = random(hash(key) ^ seed)
    start.set(key, isZero(value) ? (isImage(value) ? make(value.w, value.h, 1, () => init * (next() - 0.5)) : init * (next() - 0.5)) : value)
  }
  setValues(start)

  const velocity = new Map()
  const second = new Map()
  const blocked = new Set()
  const curve = { train: [], validation: [] }
  let best = { loss: Infinity, values: start, epoch: 0 }
  let epoch = 0
  for (epoch = 1; epoch <= epochs; epoch++) {
    const total = new Map()
    let sum = 0
    for (const { inputs, expect } of examples) {
      const tape = new Tape()
      const run = runBoard(board, { parts, bind: inputs, ctx: { tape } })
      const got = run.outputs[output]
      if (got === undefined || got === null) throw new PartError(T(`输出「${output}」没有值`, `output “${output}” has no value`))
      const { value, grad } = lossOf(got, expect[output], loss)
      sum += value
      const outId = run.ids.get(sink.id)
      if (outId === null || outId === undefined) continue
      const grads = backward(tape, outId, grad, RULES)
      for (const [id] of grads) {
        const entry = tape.entries[id]
        if (entry.op && !gradOps.has(entry.op)) blocked.add(entry.op)
      }
      for (const key of keys) {
        const g = grads.get(tape.leaves.get(key)?.id)
        if (g !== undefined) total.set(key, total.has(key) ? RULES.add(total.get(key), g) : g)
      }
    }
    curve.train.push(sum / examples.length)
    const values = new Map(keys.map((key) => [key, asValue(board.nodes.find((n) => n.id === key).params.value)]))
    for (const [key, g] of total) {
      const mean = zip([g], (v) => v / examples.length)
      if (optimizer === 'adam') {
        // Adam: each parameter's step scaled by its own recent gradient size, so a wide range of rates trains.
        const [b1, b2] = [0.9, 0.999]
        const m = zip([velocity.get(key) ?? zip([mean], () => 0), mean], (p, q) => b1 * p + (1 - b1) * q)
        const s2 = zip([second.get(key) ?? zip([mean], () => 0), mean], (p, q) => b2 * p + (1 - b2) * q * q)
        velocity.set(key, m)
        second.set(key, s2)
        const scaled = zip([m, s2], (p, q) => p / (1 - b1 ** epoch) / (Math.sqrt(q / (1 - b2 ** epoch)) + 1e-8))
        values.set(key, step(values.get(key), scaled, rate))
        continue
      }
      const v = velocity.has(key) ? zip([velocity.get(key), mean], (p, q) => momentum * p + q) : mean
      velocity.set(key, v)
      values.set(key, step(values.get(key), v, rate))
    }
    setValues(values)
    const held = lossOn(validation)
    curve.validation.push(held)
    const judged = held ?? curve.train[curve.train.length - 1]
    if (judged < best.loss - 1e-12) best = { loss: judged, values, epoch }
    else if (patience && epoch - best.epoch >= patience) break
  }
  if (patience) setValues(best.values)
  return { circuit: board, curve, epochs: Math.min(epoch, epochs), best: best.epoch, blocked: [...blocked], seed }
}
