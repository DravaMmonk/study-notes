// The can domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each run tick by tick on its bus (run.js); a reference board
// that says in a tick what it hears in that tick has a loop, and fails.
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { checkLevel, entries } from './run.js'
import { auditCleanFrameWorld, auditControllerProjection } from './frame-audit.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit }) {
  return checkCircuitTasks(circuit, {
    run: checkLevel,
    entries,
    failure: (r) => (r.error ? '(a loop)' : r.fail ? `at tick ${r.fail.tick} (${r.fail.name}: want ${r.fail.want}, got ${r.fail.got})` : ''),
    more: (task) => [...auditCleanFrameWorld(task, circuit.forTask(task).partOf), ...auditControllerProjection(task, circuit.forTask(task).partOf)],
  })
}
