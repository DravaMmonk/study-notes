// A machine runs the same board at every step of a walk and writes what it gives into a table: a robot filling a DP
// table cell by cell, a teletype running its board once per line, an event loop once per event. The world decides the
// steps, which table keys a step writes, and what the answer is; the board reads earlier keys through `get`.
import { Halt } from './circuit.js'

/** How many times a walk in rounds may repeat before it counts as never settling. */
export const MAX_ROUNDS = 50

/**
 * Walk once (or, with `rounds`, again and again until a whole round changes nothing).
 *
 *   order        the steps, in order
 *   keys(step)   { output id: table key } the step writes
 *   base         [[key, value]] the table starts with
 *   step(step, get) → { out: { output id: value }, probe? }   runs the board; `get(key)` reads the table
 *   answer(table, steps)                                          the walk's result
 *
 * Reading a key not written yet stops the walk there ({ error: { cell, key } }); in rounds it reads as null instead.
 * Returns { value, steps, base, table, rounds? } or, stopped, { error, steps, base, table }. Each step records
 * { cell, at, reads, probe, writes, round, changed, out } (or `empty`, the key it could not read).
 */
export function walk({ order, keys, base = [], rounds = false, step, answer }) {
  const table = new Map(base)
  const steps = []
  for (let round = 1; round <= (rounds ? MAX_ROUNDS : 1); round++) {
    let moved = false
    for (const cell of order) {
      const writesTo = keys(cell)
      const at = Object.values(writesTo)
      const reads = []
      const get = (key) => {
        reads.push(key)
        if (table.has(key)) return table.get(key)
        if (rounds) return null
        throw new Halt({ empty: key })
      }
      try {
        const { out, probe = {} } = step(cell, get)
        const writes = Object.entries(writesTo).map(([id, key]) => [key, out[id]])
        const changed = writes.some(([key, v]) => !table.has(key) || table.get(key) !== v)
        writes.forEach(([key, v]) => table.set(key, v))
        moved = moved || changed
        steps.push({ cell, at, reads, probe, writes, round, changed, out })
      } catch (error) {
        if (!(error instanceof Halt) || error.payload?.empty === undefined) throw error
        steps.push({ cell, at, reads, probe: error.probe ?? {}, empty: error.payload.empty, round })
        return { error: { cell, key: error.payload.empty }, steps, base, table }
      }
    }
    if (rounds && !moved) return { value: answer(table, steps), steps, base, table, rounds: round }
  }
  if (rounds) return { error: { diverge: true }, value: answer(table, steps), steps, base, table, rounds: MAX_ROUNDS }
  return { value: answer(table, steps), steps, base, table }
}
