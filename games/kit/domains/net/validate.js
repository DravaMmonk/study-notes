// The net domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each run tick by tick on its wires (run.js).
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { runLevel } from './run.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit }) {
  return checkCircuitTasks(circuit, {
    run: runLevel,
    failure: (r) => (r.fail ? `${r.fail.tick !== undefined ? `at tick ${r.fail.tick} ` : ''}(${r.fail.name}: want ${JSON.stringify(r.fail.want)}, got ${JSON.stringify(r.fail.got)})` : ''),
    note: (ref) => `, ${ref.runs.reduce((n, r) => n + r.ticks.length, 0)} ticks`,
  })
}
