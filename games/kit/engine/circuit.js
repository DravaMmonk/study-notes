// Evaluating a circuit, the same in every game. A circuit is the editor's shape (../circuit/model.js):
//
//   { nodes: [{ id, type, … }], wires: [{ from, to, port }] }      from: '<node>' or '<node>#<key>'
//
// What a node does comes from its domain's part registry (../domains/*/parts.js), keyed by type:
//
//   inputs        [port] or (node) → [port]
//   outputs?      (node) → [key] | null: a node with several outputs, each a value of its own ('<node>#<key>'; the
//                 key null is the node's plain output '<node>')
//   reads?        (node, key) → [port] | undefined: the ports one of its outputs reads, when not all of them (a proof's
//                 box gives its assumption from its card alone, and its conclusion from what is proved inside it)
//   symmetric?    [port] or (node) → [port]: inputs whose order does not matter to what the part gives (a + b); a
//                 fact about the part, read by what compares boards (mutate.js makes no swap between them)
//   optional?     [port] that may stay unconnected (one of them must be wired, unless the part runs `bare`)
//   bare?         true for a part that also runs with none of its optional ports wired
//   idle?         (port, node) → what an unconnected port reads; without it an unconnected port is missing
//   sink?         true for a circuit's output: its value is what reaches its 'in' port, and a missing one is no error
//   eval(ins, node, ctx, key) → value     ins: { port: value } of the connected ports (and idle ones)
//
// With `ctx.trace` (an array) every node computed is pushed onto it in the order it ran, { id, key, value } or
// { id, key, error }, so a board can replay the run one step at a time; a part that runs a circuit inside it (a frame
// going round) passes the same ctx, and its cards' steps land in the same trace. Ids starting with '__' are the
// engine's own and are not traced.
//
// Values are pulled from the targets back (by default every node), each computed once. A part that throws a PartError
// marks its node with that message, and the nodes downstream read it as missing; a Halt stops the whole evaluation
// (a robot reading a cell not computed yet). Anything else a part throws marks its node as unable to compute.

/** A node that cannot compute, with a message for the player ({ zh, en } or a string). */
export class PartError extends Error {
  constructor(message) {
    super(typeof message === 'string' ? message : message?.en ?? message?.zh ?? 'part error')
    this.label = message
  }
}

/** Stops a whole evaluation; its `payload` is for whoever runs the circuit, `values` what was computed by then. */
export class Halt extends Error {
  constructor(payload) {
    super('halt')
    this.payload = payload
  }
}

export const MISSING = { zh: '缺少输入', en: 'Missing input' }
export const BROKEN = { zh: '无法计算', en: 'Cannot compute' }

/** A wire's source as [node id, output key | null]. */
export const splitSource = (src) => {
  const s = String(src)
  const k = s.indexOf('#')
  return k < 0 ? [s, null] : [s.slice(0, k), s.slice(k + 1)]
}
export const sourceOf = (id, key) => (key === null || key === undefined ? id : `${id}#${key}`)

/** A part's input ports for a node. */
export const portsOf = (part, node) => (typeof part.inputs === 'function' ? part.inputs(node) : part.inputs ?? [])

// A circuit's nodes by id and, for each node, the source wired into each of its ports: read once for as long as the
// circuit holds the same nodes and wires (a board run tick after tick is evaluated thousands of times).
const wirings = new WeakMap()
function wiringOf(circuit) {
  const { nodes, wires } = circuit
  const kept = wirings.get(circuit)
  if (kept && kept.nodes === nodes && kept.wires === wires && kept.sizes[0] === nodes.length && kept.sizes[1] === wires.length) return kept
  const into = new Map()
  for (const wire of wires) {
    if (!into.has(wire.to)) into.set(wire.to, new Map())
    into.get(wire.to).set(wire.port, wire.from)
  }
  const wiring = { nodes, wires, sizes: [nodes.length, wires.length], byId: new Map(nodes.map((node) => [node.id, node])), into }
  wirings.set(circuit, wiring)
  return wiring
}

/**
 * Evaluate a circuit. `parts` is the registry (an object, or a function of a type). `ctx` reaches every part's eval
 * (the test's inputs, a robot's sensors…). `targets` lists node ids to compute (default: all). `prepare(ins, node,
 * part)` may check or adjust a node's inputs before it runs (throw a PartError to refuse them).
 * Returns { values: Map(source → value), errors: Map(node id → message) }.
 */
export const evaluate = (circuit, { targets = null, ...options } = {}) => evaluation(circuit, options).run(targets)

/**
 * An evaluation that can be asked for more: run(targets) computes what those nodes still lack and returns the same
 * { values, errors } every time, so whoever asks for a circuit's outputs one at a time (a packed part, boards.js)
 * computes each card once.
 */
export function evaluation(circuit, { parts, ctx = {}, prepare = null } = {}) {
  const partOf = typeof parts === 'function' ? parts : (type) => parts[type]
  if (!ctx.engine) ctx = { ...ctx, engine: { parts, prepare } }
  const { byId, into } = wiringOf(circuit)
  const values = new Map()
  const errors = new Map()
  const done = new Set()
  // A run that trains numbers every value on its tape (tape.js): each source's number, here by where it came from.
  const tape = ctx.tape
  const ids = tape ? new Map() : null
  // A node's first error is the one it shows.
  const fault = (id, message, key = null) => {
    if (!errors.has(id)) errors.set(id, message)
    note({ id, key, error: message })
  }
  const note = (step) => { if (ctx.trace && !step.id.startsWith('__')) ctx.trace.push(step) }

  // The value of a source, or undefined when its node cannot give one.
  const pull = (src) => {
    if (values.has(src)) return values.get(src)
    const [id, key] = splitSource(src)
    run(id, key)
    return values.get(src)
  }

  function run(id, key) {
    const doneKey = sourceOf(id, key)
    if (done.has(doneKey)) return
    done.add(doneKey)
    const node = byId.get(id)
    const part = node && partOf(node.type)
    if (!part) {
      errors.set(id, BROKEN)
      return
    }
    // A node that failed gives nothing more, unless its outputs read ports of their own.
    if (errors.has(id) && !part.reads) return
    const ports = part.reads?.(node, key, ctx) ?? portsOf(part, node)
    const ins = {}
    const inIds = {}
    let missing = false
    let connected = 0
    for (const port of ports) {
      const from = into.get(id)?.get(port)
      const value = from === undefined ? undefined : pull(from)
      if (ids && from !== undefined) inIds[port] = ids.get(from) ?? null
      if (from !== undefined && value !== undefined) connected++
      if (value !== undefined) ins[port] = value
      else if (from === undefined && part.idle) ins[port] = part.idle(port, node)
      else if (!part.optional?.includes(port)) missing = true
    }
    // A part whose inputs are all optional still needs one of them.
    if (!missing && !part.bare && ports.length && part.optional && ports.every((p) => part.optional.includes(p)) && !connected) missing = true
    if (part.sink) {
      try {
        const value = part.collect ? part.collect(ins, node) : ins.in
        if (value !== undefined) values.set(id, value)
        if (ids) ids.set(id, inIds.in ?? null)
      } catch (error) {
        fault(id, error instanceof PartError ? error.label : BROKEN, key)
      }
      return
    }
    if (missing) {
      fault(id, MISSING)
      return
    }
    try {
      const ready = prepare ? prepare(ins, node, part) : ins
      if (tape) Object.assign(tape, { ins: inIds, last: null, node: `${ctx.scope ?? ''}${id}` })
      const value = part.eval(ready, node, ctx, key ?? undefined)
      if (ids) ids.set(doneKey, part.source ? ctx.bindIds?.[node.params?.name] ?? null : tape.last)
      values.set(doneKey, value)
      note({ id, key, value })
    } catch (error) {
      if (error instanceof Halt) {
        // What was computed before the halt, for whoever shows the stopped step.
        error.values ??= values
        throw error
      }
      fault(id, error instanceof PartError ? error.label : BROKEN, key)
    }
  }

  const result = { values, errors, ...(ids ? { ids } : {}) }
  return {
    ...result,
    run(targets = null) {
      for (const id of targets ?? circuit.nodes.map((node) => node.id)) {
        const node = byId.get(id)
        const part = node && partOf(node.type)
        const keys = part?.outputs?.(node)
        if (keys) for (const key of keys) run(id, key)
        else run(id, null)
      }
      return result
    },
  }
}
