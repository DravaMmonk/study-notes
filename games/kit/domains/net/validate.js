// The net domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each run tick by tick on its wires (run.js).
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { entries, runLevel } from './run.js'

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit, memo }) {
  return checkCircuitTasks(circuit, {
    memo,
    run: runLevel,
    entries,
    failure: (r) => (r.fail ? `${r.fail.at?.tick !== undefined ? `at tick ${r.fail.at?.tick} ` : ''}(${(r.fail.at?.id ?? r.fail.at)}: want ${JSON.stringify(r.fail.want)}, got ${JSON.stringify(r.fail.got)})` : ''),
  })
}
