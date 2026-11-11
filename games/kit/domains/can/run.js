// Running a board of 《车在说话》 on a test: the world's nodes say their bits, the player's board is one more node on the
// bus (../../engine/ticks.js), and every tick its outputs are checked against what the task wants
// (../../engine/circuit-domain.js judgeTicks).
//
// test   { bus: { bits, frames }, inputs?: { name: [value per tick] } }   (course.js builds the bus from content)
// task   { outputs: [{ name, label }], want(test) → { name: [value per tick] } }  undefined in `want`: any value will do
//
// runTest(task, circuit, test, parts) → { ticks: [{ tick, line, values, errors, outputs, trace, failed? }], want,
//   error?, fail? }: a tick's `failed` is why its outputs are wrong, its `trace` what every card computed (inside
//   packed parts too); `error` a board that says what it hears in the same tick
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): the bus and the
//   inputs, each output against what is wanted, tick by tick
import { boardNode, reacting, runTicks } from '../../engine/ticks.js'
import { judgeTicks, runTests } from '../../engine/circuit-domain.js'
import { BUS, contender, sayer, wiredAnd } from './bus.js'
import { T } from '../../shell/i18n.js'

export function runTest(task, circuit, test, parts) {
  let consumed = 0
  const queue = task.pulls && reacting({
    id: 'queue', board: 'you', start: 0,
    reads: (head) => ({ [task.pulls.input]: test.queue[head] ?? null, [task.pulls.available]: Number(head < test.queue.length), ...(task.pulls.last ? { [task.pulls.last]: head < test.queue.length ? Number(head === test.queue.length - 1) : null } : {}) }),
    step: (head, outputs) => {
      const next = outputs[task.pulls.next]
      const rewind = task.pulls.rewind && outputs[task.pulls.rewind]
      consumed = rewind === 1 || rewind === true ? 0 : head + ((next === 1 || next === true) && head < test.queue.length ? 1 : 0)
      return { state: consumed, shown: null }
    },
  })
  const bindings = []
  const bind = (tick) => {
    const values = { ...Object.fromEntries(Object.entries(test.inputs ?? {}).map(([name, input]) => [name, input[tick] ?? null])), ...(queue ? queue.bind(tick) : {}) }
    bindings[tick] = values
    return values
  }
  const rivals = (test.contenders ?? []).map((frame, k) => contender(`rival${k}`, frame, frame.at ?? 0))
  const nodes = [sayer('world', test.bus.bits), boardNode({ id: 'you', circuit, parts, bind, traced: true }), ...rivals, ...(queue ? [queue.node] : [])]
  const run = runTicks({ nodes, ticks: test.bus.bits.length, line: (said, tick) => {
    const line = wiredAnd(said)
    return test.flipTicks?.includes(tick) ? 1 - line : line
  } })
  const want = task.want(test)
  const checked = [...(task.drives ? [{ name: 'send' }] : []), ...task.outputs]
  const judged = judgeTicks(run.steps.map((step) => ({ tick: step.tick, line: step.line, sent: step.said.you, said: step.said, bind: bindings[step.tick], ...step.heard.you })), {
    checked, want: (name) => want[name], got: (tick, name) => name === 'send' && task.drives ? tick.sent ?? null : tick.outputs[name] ?? null,
  })
  if (queue && consumed !== test.queue.length && !judged.fail && !run.error) {
    judged.fail = { name: task.pulls.input, remaining: test.queue.length - consumed }
    judged.final = T('测试结束时队列里还有未取走的字节。', 'Bytes remain in the queue when the test ends.')
  }
  const error = run.error && T('这块板这一拍要说的话取决于这一拍的总线：说之前还听不到。')
  return { ...judged, want, ...(error ? { error } : {}) }
}

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests(runTest)

export const entries = ({ task, test, run }) => [
  ...(task.listens ? [{ of: 'line', label: BUS, shape: 'bits', given: run.ticks.map((tick) => tick.line) }] : []),
  ...(test.contenders ?? []).map((_, k) => ({ of: `rival${k}`, label: T(`竞争者 ${k + 1}`, `Contender ${k + 1}`), shape: 'bits', given: run.ticks.map((tick) => tick.said[`rival${k}`] ?? 1) })),
  ...(task.inputs ?? []).map((i) => [task.pulls?.input, task.pulls?.available, task.pulls?.last].includes(i.name)
    ? { of: i.name, label: i.label, shape: 'ticks', got: run.ticks.map((tick) => tick.bind?.[i.name] ?? null) }
    : { of: i.name, label: i.label, shape: 'bits', given: test.inputs[i.name] }),
  ...(task.drives ? [{ of: 'send', label: T('说', 'Send'), shape: 'ticks', got: run.ticks.map((tick) => tick.sent ?? null), want: run.want.send }] : []),
  ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'ticks', got: run.ticks.map((t) => t.outputs[o.name] ?? null), want: run.want[o.name] })),
]
