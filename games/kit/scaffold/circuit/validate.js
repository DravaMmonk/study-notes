// The __name__ domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each test run once (run.js).
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { runLevel } from './run.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ __name__ }) {
  return checkCircuitTasks(__name__, {
    run: runLevel,
    failure: (r) => (r.fail ? `(${r.fail.name}: want ${r.fail.want}, got ${r.fail.got})` : ''),
  })
}
