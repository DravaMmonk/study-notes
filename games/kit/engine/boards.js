// Boards inside boards. A circuit's own inputs and outputs are nodes named by `params.name`: a source gives what is
// bound to its name, a sink is what the circuit gives under its name. The same circuit then serves as a level's board
// (bound to a test's inputs), as a board inside a part (node.boards[name], bound by the part: a proof's assumption
// box, the two lanes after a fork) and as a packed part (a solved circuit used again as one part).
import { BROKEN, PartError, evaluate } from './circuit.js'

export const nameOf = (node) => node.params?.name

/** A circuit's input: it gives what is bound to its name (nothing when nothing is). */
export const source = (extra = {}) => ({ inputs: [], source: true, eval: (_, node, ctx) => ctx.bind?.[nameOf(node)], ...extra })
/** A circuit's output: it gives what reaches its `in` port. */
export const sink = (extra = {}) => ({ inputs: ['in'], sink: true, eval: () => undefined, ...extra })

const partFn = (parts) => (typeof parts === 'function' ? parts : (type) => parts[type])

/** The circuit's sinks by name, from evaluated values. */
export function outputsOf(circuit, parts, values) {
  const partOf = partFn(parts)
  return Object.fromEntries(circuit.nodes.filter((node) => partOf(node.type)?.sink).map((node) => [nameOf(node), values.get(node.id)]))
}

/**
 * Evaluate a circuit with its sources bound. Returns { values, errors, outputs }, outputs by sink name.
 * Every part's ctx carries `engine` ({ parts, prepare }) so a part can run the boards inside it (runInner).
 */
export function runBoard(circuit, { parts, ctx = {}, bind = {}, prepare = null, targets = null }) {
  const engine = { parts, prepare }
  const { values, errors } = evaluate(circuit, { parts, prepare, targets, ctx: { ...ctx, bind, engine } })
  return { values, errors, outputs: outputsOf(circuit, parts, values) }
}

const EMPTY = { nodes: [], wires: [] }

/** Run the board `name` inside `node` from within its part's eval, its sources bound to `bind`. */
export function runInner(ctx, node, name, bind) {
  const { parts, prepare } = ctx.engine
  return runBoard(node.boards?.[name] ?? EMPTY, { parts, prepare, ctx, bind })
}

/** The boards a node holds: those its part names (part.boards(node) → [{ name, … }]), each as saved or empty. */
export const boardsOf = (part, node) => (part.boards?.(node) ?? []).map((spec) => ({ ...spec, circuit: node.boards?.[spec.name] ?? EMPTY }))

/**
 * A solved circuit as one part: its sources are the part's inputs, `output` the sink it gives. `circuit` is the
 * circuit or a function returning it (the player's latest passing one). Anything else on `extra` is the part's own.
 */
export function packed({ circuit, inputs, output, ...extra }) {
  return {
    inputs,
    ...extra,
    eval: (ins, node, ctx) => {
      const inside = typeof circuit === 'function' ? circuit() : circuit
      const { outputs, errors } = runBoard(inside, { parts: ctx.engine.parts, prepare: ctx.engine.prepare, ctx, bind: ins })
      if (errors.size || outputs[output] === undefined) throw new PartError(BROKEN)
      return outputs[output]
    },
  }
}
