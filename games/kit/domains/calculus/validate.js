// The calculus domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each run tick by tick (run.js).
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { entries, runLevel } from './run.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit, memo }) {
  return checkCircuitTasks(circuit, {
    memo,
    run: runLevel,
    entries,
    failure: (r) => (r.fail ? `at tick ${r.fail.at?.tick} (${(r.fail.at?.id ?? r.fail.at)}: want ${r.fail.want}, got ${r.fail.got})` : ''),
  })
}
