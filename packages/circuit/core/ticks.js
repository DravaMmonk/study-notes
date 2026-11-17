// A world run tick by tick. At every tick each node says what it puts on the line, the domain's rule combines
// those values, and each node hears the result. A node keeps values from one tick to the next in its registers.
//
// A node is { id, say(tick) → value | undefined (says nothing), hear(tick, line) → what it shows of the tick }.
// The world's own nodes are scripts written that way; a player's board becomes one with boardNode. A board runs twice a
// tick, in two halves, as a real controller does within one bit:
//
//   say   only the cards that reach a sink that drives the line (`drive`) run, reading registers but not the line: a
//         board that says something from what the line is this very tick has a loop, and the run stops there
//   hear  every card runs, the line given; the sinks that keep a register (`store`) set what it holds from the next
//         tick on, and so does every card inside a packed part that holds registers (boards.js STATE)
//
// A register is read by a part computing held(register, start) and written by a part that keeps an input (`keeps`,
// parts/define.js: a sink naming its register, register(node)); one never written holds `start`. Registers inside a
// packed part are its own (scoped by its path), so two counters on one board count apart.
import { Halt } from './circuit.js'
import { runBoard } from './boards.js'

/** A sink whose value the node says on the line this tick. */
export const drive = (extra = {}) => ({ inputs: ['in'], sink: true, drive: true, eval: () => undefined, ...extra })

/** A card giving the line this tick: in the say half, reading it is a loop. */
export const hearing = (extra = {}) => ({
  inputs: [],
  ...extra,
  eval: (_, node, ctx) => {
    if (ctx.half === 'say') throw new Halt({ loop: node.id })
    return ctx.line
  },
})

const partFn = (parts) => (typeof parts === 'function' ? parts : (type) => parts[type])

/**
 * A player's board as a node. `bind(tick)` gives what its sources read that tick; `ctx` reaches every card. hear()
 * returns { values, errors, outputs } (outputs: its plain sinks by name, not those that drive or keep a register), and
 * with `traced` the tick's trace (circuit.js ctx.trace: the cards inside its packed parts with their paths).
 */
export function boardNode({ id, circuit, parts, bind = () => ({}), ctx = {}, traced = false }) {
  const partOf = partFn(parts)
  const state = new Map()
  const dependencyCache = new Map()
  const drives = circuit.nodes.filter((n) => partOf(n.type)?.drive)
  const held = (key) => state.get(key)
  return {
    id,
    board: true,
    say(tick) {
      if (!drives.length) return undefined
      const { values } = runBoard(circuit, { parts, bind: bind(tick), targets: drives.map((n) => n.id), ctx: { ...ctx, dependencyCache, half: 'say', tick, held } })
      return values.get(drives[0].id)
    },
    hear(tick, line) {
      const stores = new Map()
      const trace = traced ? [] : undefined
      const { values, errors } = runBoard(circuit, { parts, bind: bind(tick), ctx: { ...ctx, dependencyCache, half: 'hear', tick, line, held, stores, trace } })
      for (const n of circuit.nodes) if (partOf(n.type)?.store && values.has(n.id)) stores.set(partOf(n.type).register(n), values.get(n.id))
      for (const [key, value] of stores) state.set(key, value)
      const outputs = Object.fromEntries(circuit.nodes.filter((n) => partOf(n.type)?.sink && !partOf(n.type).store && !partOf(n.type).drive).map((n) => [n.params?.name, values.get(n.id)]))
      return { values, errors, outputs, ...(trace ? { trace } : {}) }
    },
  }
}

/**
 * Run `nodes` for at most `ticks` ticks. `line(said, tick)` is the line made of what the nodes said ([value |
 * undefined], in node order); `stop(steps)` may end the run early. Returns { steps, error? }: each step { tick, said
 * (by node id), line, heard (what each node's hear gave) }; a board whose say half reads the line stops the run with
 * error { tick, node, card }.
 */
export function runTicks({ nodes, ticks, line, stop = () => false }) {
  const steps = []
  for (let tick = 0; tick < ticks; tick++) {
    const said = {}
    for (const node of nodes) {
      try {
        said[node.id] = node.say(tick)
      } catch (error) {
        if (!(error instanceof Halt) || !error.payload?.loop) throw error
        return { steps, error: { tick, node: node.id, card: error.payload.loop } }
      }
    }
    const value = line(nodes.map((n) => said[n.id]), tick)
    const heard = Object.fromEntries(nodes.map((node) => [node.id, node.hear(tick, value)]))
    steps.push({ tick, said, line: value, heard })
    if (stop(steps)) break
  }
  return { steps }
}
