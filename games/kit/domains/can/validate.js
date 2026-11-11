// The can domain's checks for `npm run check` (../../engine/checks.js): the checks every circuit level gets
// (../../engine/circuit-domain.js checkCircuitTasks), each run tick by tick on its bus (run.js); a reference board
// that says in a tick what it hears in that tick has a loop, and fails.
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { checkLevel, entries } from './run.js'
import { auditCleanFrameWorld, auditControllerProjection } from './frame-audit.js'
import { REGISTERS } from './parts.js'

// Every reference board must be reproducible with the register selector and numeric fields.
export function inaccessibleSettings(board) {
  const problems = []
  for (const node of board.nodes) {
    if (['reg', 'keep'].includes(node.type) && node.params?.reg && !REGISTERS.includes(node.params.reg)) problems.push(`register ${node.params.reg} is not available in the editor`)
    if (node.type === 'const' && !Number.isFinite(Number(node.params?.value ?? 0))) problems.push('constant is not a finite number')
    if (node.type === 'reg' && node.params?.start !== undefined && node.params.start !== '' && !Number.isFinite(Number(node.params.start))) problems.push('register start is not a finite number')
  }
  return problems
}

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit }) {
  return checkCircuitTasks(circuit, {
    run: checkLevel,
    entries,
    failure: (r) => (r.error ? '(a loop)' : r.fail ? `at tick ${r.fail.tick} (${r.fail.name}: want ${r.fail.want}, got ${r.fail.got})` : ''),
    more: (task) => [...inaccessibleSettings(task.solution), ...auditCleanFrameWorld(task, circuit.forTask(task).partOf), ...auditControllerProjection(task, circuit.forTask(task).partOf)],
  })
}
