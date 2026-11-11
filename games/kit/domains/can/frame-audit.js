import { scheduleFrames } from './frame-world.js'
import { runTest } from './run.js'

// Compare the clean, single-contender subset with the actual controller board. This deliberately
// makes no equivalence claim for retries after errors, passive suspension, or bus-off recovery.
export function auditCleanFrameWorld(task, parts) {
  if (!task.expectsController || !task.expectsControllerDuplex || !['ready', 'kind', 'rxId', 'rxLength', 'rxByte'].every((name) => task.outputs.some((output) => output.name === name))) return []
  const test = [...task.tests, ...task.hidden].find((t) => t.tx && t.bus.frames.length === 1 && t.contenders.length === 1 && !t.flipTicks?.length && t.peerLow?.length === 1)
  if (!test) return []
  const requests = [
    ...test.bus.frames.map((frame, index) => ({ ...frame, node: `incoming${index}` })),
    ...test.contenders.map((frame, index) => ({ ...frame, node: `contender${index}` })),
    { ...test.tx, at: test.txAt ?? 0, node: 'you' },
  ]
  const events = scheduleFrames(requests)
  const run = runTest(task, task.solution, test, parts, { traced: false })
  const own = events.find((event) => event.node === 'you')
  const received = events.filter((event) => event.node !== 'you').map(({ id, data }) => ({ id, data }))
  const actual = (run.receptions ?? []).map(({ id, data }) => ({ id, data }))
  const attempts = run.ticks.filter((tick) => tick.outputs.attempt).map((tick) => tick.tick)
  const expectedAttempts = events.filter((event) => event.contenders.includes('you')).map((event) => event.start)
  const done = run.ticks.filter((tick) => tick.outputs.done).map((tick) => tick.tick)
  return JSON.stringify(received) === JSON.stringify(actual) && JSON.stringify(attempts) === JSON.stringify(expectedAttempts) && JSON.stringify(done) === JSON.stringify([own.end - 1])
    ? [] : ['clean frame world disagrees with the bit-level controller']
}
