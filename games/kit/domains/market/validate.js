// The market domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each run against its streets (run.js).
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { entries, runLevel } from './run.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit }) {
  return checkCircuitTasks(circuit, {
    run: runLevel,
    entries,
    failure: (r) => (r.fail ? `(${r.fail.name} ${r.fail.got}, wants ${r.fail.want})` : ''),
  })
}
