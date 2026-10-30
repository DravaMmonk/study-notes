// Running a board of 《车在说话》 on a test: the world's nodes say their bits, the player's board is one more node on the
// bus (../../engine/ticks.js), and every tick its outputs are checked against what the level wants.
//
// test   { bus: { bits, frames }, inputs?: { name: [value per tick] } }   (course.js builds the bus from the spec)
// level  { outputs: [{ name }], want(test) → { name: [value per tick] } }  undefined in `want`: any value will do
//
// runTest(level, circuit, test, parts) → { ticks: [{ tick, line, values, errors, outputs, failed? }], error?, fail? }
//   a tick's `failed` is why its outputs are wrong; `error` a board that says what it hears in the same tick
import { boardNode, runTicks } from '../../engine/ticks.js'
import { sayer, wiredAnd } from './bus.js'

const T = (zh, en) => ({ zh, en })
const show = (v) => (v === null || v === undefined ? '—' : v === true ? T('是', 'yes') : v === false ? T('否', 'no') : String(v))
const L2 = (v, lang) => (typeof v === 'object' ? v[lang] : v)

/** Why `got` is not `want` at tick `tick` for output `name`. */
const wrong = (tick, label, want, got) => T(
  `第 ${tick} 拍，「${label.zh}」应当是 ${L2(show(want), 'zh')}，这块板给出 ${L2(show(got), 'zh')}。`,
  `At tick ${tick}, “${label.en}” should be ${L2(show(want), 'en')}; the board gives ${L2(show(got), 'en')}.`,
)

export function runTest(level, circuit, test, parts) {
  const ticks = test.bus.bits.length
  const bind = (tick) => Object.fromEntries(Object.entries(test.inputs ?? {}).map(([name, values]) => [name, values[tick] ?? null]))
  const you = boardNode({ id: 'you', circuit, parts, bind })
  const run = runTicks({ nodes: [sayer('world', test.bus.bits), you], ticks, line: wiredAnd })
  const want = level.want(test)
  const out = []
  let fail = null
  for (const step of run.steps) {
    const { values, errors, outputs } = step.heard.you
    const tick = { tick: step.tick, line: step.line, values, errors, outputs }
    if (!fail) {
      for (const o of level.outputs) {
        const w = want[o.name]?.[step.tick]
        const got = outputs[o.name] ?? null
        if (w !== undefined && w !== got) {
          fail = { tick: step.tick, name: o.name, want: w, got }
          tick.failed = wrong(step.tick, o.label, w, got)
          break
        }
      }
    }
    out.push(tick)
  }
  const error = run.error && T('这块板这一拍要说的话取决于这一拍的总线：说之前还听不到。', 'What this board says this tick depends on the bus this tick: it cannot hear before it speaks.')
  return { ticks: out, want, ...(error ? { error } : {}), ...(fail ? { fail } : {}) }
}

/** Every test of a level on a board: { runs, pass }. */
export function runLevel(level, circuit, parts) {
  const runs = level.tests.map((test) => runTest(level, circuit, test, parts))
  return { runs, pass: runs.every((r) => !r.fail && !r.error) }
}

export { show }
