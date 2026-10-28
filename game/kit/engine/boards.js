// A circuit's own inputs and outputs are nodes named by `params.name`: a source gives what is bound to its name, a
// sink is what the circuit gives under its name. The same circuit then serves as a level's board (bound to a test's
// inputs) and as a packed part (a solved circuit used again as one part).
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
 * Every part's ctx carries `engine` ({ parts, prepare }) so a packed part can run its circuit.
 */
export function runBoard(circuit, { parts, ctx = {}, bind = {}, prepare = null, targets = null }) {
  const engine = { parts, prepare }
  const { values, errors } = evaluate(circuit, { parts, prepare, targets, ctx: { ...ctx, bind, engine } })
  return { values, errors, outputs: outputsOf(circuit, parts, values) }
}

/**
 * A solved circuit as one part: its sources are the part's inputs, `output` the sink it gives. `circuit` is the
 * circuit or a function returning it (the player's latest passing one). Anything else on `extra` is the part's own.
 * Inside, the parts run with ctx.graph the circuit inside (and whatever `inside(ctx)` adds); a setting on the part
 * goes to every card inside that has the same setting; and a traced run (circuit.js) sees each card inside as a step of its own, its `path` the ids of
 * the packed parts it is in, outermost first.
 */
export function packed({ circuit, inputs, output, inside: around = (ctx) => ctx, ...extra }) {
  return {
    inputs,
    ...extra,
    eval: (ins, node, ctx) => {
      const inside = withSettings(typeof circuit === 'function' ? circuit() : circuit, node.params, ctx.engine.parts)
      const trace = ctx.trace && { push: (step) => ctx.trace.push({ ...step, path: [node.id, ...(step.path ?? [])] }) }
      const { outputs, errors } = runBoard(inside, { parts: ctx.engine.parts, prepare: ctx.engine.prepare, ctx: { ...around(ctx), graph: inside, trace }, bind: ins })
      if (outputs[output] === undefined) throw new PartError(errors.size ? [...errors.values()][0] : BROKEN)
      return outputs[output]
    },
  }
}

// A circuit with a packed part's settings put on every card inside that takes them.
function withSettings(circuit, params = {}, parts) {
  const keys = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== '')
  if (!keys.length) return circuit
  const partOf = partFn(parts)
  return { ...circuit, nodes: circuit.nodes.map((n) => {
    const own = keys.filter((k) => partOf(n.type)?.params?.includes(k))
    return own.length ? { ...n, params: { ...n.params, ...Object.fromEntries(own.map((k) => [k, params[k]])) } } : n
  }) }
}
