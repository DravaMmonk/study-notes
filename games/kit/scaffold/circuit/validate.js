// The __name__ domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each test run once (run.js).
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { entries, runLevel } from './run.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit }) {
  return checkCircuitTasks(circuit, {
    run: runLevel,
    entries,
    failure: (r) => (r.fail ? `(${r.fail.at}: want ${r.fail.want}, got ${r.fail.got})` : ''),
  })
}
