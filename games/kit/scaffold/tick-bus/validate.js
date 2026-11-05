// The __name__ domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each run tick by tick on its line (run.js); a reference board
// that says in a tick what it hears in that tick has a loop, and fails.
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { runLevel } from './run.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ __name__ }) {
  return checkCircuitTasks(__name__, {
    run: runLevel,
    failure: (r) => (r.error ? '(a loop)' : r.fail ? `at tick ${r.fail.tick} (${r.fail.name}: want ${r.fail.want}, got ${r.fail.got})` : ''),
    note: (ref) => `, ${ref.runs.reduce((n, r) => n + r.ticks.length, 0)} ticks`,
  })
}
