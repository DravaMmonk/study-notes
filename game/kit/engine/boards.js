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

/** The output key under which a packed part that holds registers runs the cards inside that keep them (circuit.js keys
 *  starting with '__' are the engine's own). */
export const STATE = '__state'

// The inputs (of `inputs`) that reach the nodes `ends` of a circuit, by its wires.
function inputsReaching(circuit, inputs, ends) {
  const into = new Map()
  for (const w of circuit.wires) into.set(w.to, [...(into.get(w.to) ?? []), w.from.split('#')[0]])
  const seen = new Set()
  const stack = [...ends]
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(into.get(id) ?? []))
  }
  const reached = new Set(circuit.nodes.filter((n) => seen.has(n.id) && !into.has(n.id)).map(nameOf))
  return inputs.filter((name) => reached.has(name))
}

/**
 * A solved circuit as one part: its sources are the part's inputs, `outputs` the sinks it gives (one: the part's plain
 * output; several: one output each, keyed by name). `circuit` is the circuit or a function returning it (the player's
 * latest passing one). Anything else on `extra` is the part's own.
 *
 * Inside, the parts run with ctx.graph the circuit inside (and whatever `inside(ctx)` adds); a setting on the part
 * goes to every card inside that has the same setting; only the cards that reach the output asked for run, and each
 * output reads only the inputs that reach it, so a part can give one output from some inputs and another from the
 * output it fed (as a CAN controller says its next bit before it hears the bus); a traced run (circuit.js) sees each
 * card inside as a step of its own, its `path` the ids of the packed parts it is in, outermost first.
 *
 * A part that `holds` registers (a board run tick after tick, ticks.js) keeps them per instance: the cards inside run
 * with ctx.scope its path, so a register inside it is its own, and the output STATE runs the cards inside that keep a
 * register (a part with `store`, naming its register by `params.reg`, or a packed part that holds), putting what they
 * keep into ctx.stores.
 */
export function packed({ circuit, inputs, outputs, holds = false, inside: around = (ctx) => ctx, ...extra }) {
  const circuitOf = () => (typeof circuit === 'function' ? circuit() : circuit)
  const keys = [...(outputs.length === 1 ? [null] : outputs), ...(holds ? [STATE] : [])]
  const many = keys.length > 1
  const keepers = (inner, partOf) => inner.nodes.filter((n) => partOf(n.type)?.store || partOf(n.type)?.holds).map((n) => n.id)
  return {
    inputs,
    ...extra,
    ...(holds ? { holds: true } : {}),
    ...(many ? {
      outputs: () => keys,
      // An output reads the inputs that reach it; the cards keeping registers may read any.
      reads: (_node, key) => (key === STATE ? inputs : inputsReaching(circuitOf(), inputs, circuitOf().nodes.filter((n) => nameOf(n) === (key ?? outputs[0])).map((n) => n.id))),
    } : {}),
    eval: (ins, node, ctx, key) => {
      const partOf = partFn(ctx.engine.parts)
      const inner = withSettings(circuitOf(), node.params, ctx.engine.parts)
      const trace = ctx.trace && { push: (step) => ctx.trace.push({ ...step, path: [node.id, ...(step.path ?? [])] }) }
      const scope = `${ctx.scope ?? ''}${node.id}/`
      const run = (targets) => runBoard(inner, { parts: ctx.engine.parts, prepare: ctx.engine.prepare, ctx: { ...around(ctx), graph: inner, trace, scope }, bind: ins, targets })
      if (key === STATE) {
        const { values } = run(keepers(inner, partOf))
        for (const n of inner.nodes) if (partOf(n.type)?.store && values.has(n.id)) ctx.stores?.set(`${scope}${n.params.reg}`, values.get(n.id))
        return null
      }
      const name = key ?? outputs[0]
      // Only what reaches the output asked for runs, as on a board of its own (a frame that runs its regions itself runs them).
      const out = inner.nodes.find((n) => nameOf(n) === name && partOf(n.type)?.sink)
      const { values, errors } = run(out ? [out.id] : [])
      const value = out ? values.get(out.id) : undefined
      if (value === undefined) throw new PartError(errors.size ? [...errors.values()][0] : BROKEN)
      return value
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
