// Running a __name__ board on a test: the world says its bits, the player's board is one more node on the line
// (../../engine/ticks.js), and every tick its outputs (and what it says, when it talks) are checked against what the
// level wants.
//
// test   { line: [bit | undefined per tick], inputs?: { name: [value per tick] } }   (course.js reads it from content)
// level  { outputs: [{ name, label }], talks?, want(test) → { name: [value per tick] } }  undefined in `want`: any value
//
// runTest(level, circuit, test, parts) → { ticks: [{ tick, line, said, values, errors, outputs, trace, failed? }], want,
//   error?, fail? }: a tick's `failed` is why its outputs are wrong, its `trace` what every card computed (inside packed
//   parts too); `error` a board that says what it hears in the same tick
import { boardNode, runTicks } from '../../engine/ticks.js'
import { lineOf, sayer } from './line.js'

const T = (zh, en) => ({ zh, en })
const show = (v) => (v === null || v === undefined ? '—' : v === true ? T('是', 'yes') : v === false ? T('否', 'no') : String(v))
const L2 = (v, lang) => (typeof v === 'object' ? v[lang] : v)
const SAY = { name: 'say', label: T('说', 'Say') }

/** Why `got` is not `want` at tick `tick` for output `label`. */
const wrong = (tick, label, want, got) => T(
  `第 ${tick} 拍，「${label.zh ?? label}」应当是 ${L2(show(want), 'zh')}，这块板给出 ${L2(show(got), 'zh')}。`,
  `At tick ${tick}, “${label.en ?? label}” should be ${L2(show(want), 'en')}; the board gives ${L2(show(got), 'en')}.`,
)

/** What a level checks every tick: what it says (when it talks), then its outputs. */
export const checked = (level) => [...(level.talks ? [SAY] : []), ...(level.outputs ?? [])]

export function runTest(level, circuit, test, parts) {
  const bind = (tick) => Object.fromEntries(Object.entries(test.inputs ?? {}).map(([name, values]) => [name, values[tick] ?? null]))
  const you = boardNode({ id: 'you', circuit, parts, bind, traced: true })
  const run = runTicks({ nodes: [sayer('world', test.line), you], ticks: test.line.length, line: lineOf })
  const want = level.want(test)
  const out = []
  let fail = null
  for (const step of run.steps) {
    const { values, errors, outputs, trace } = step.heard.you
    const said = step.said.you ?? null
    const tick = { tick: step.tick, line: step.line, said, values, errors, outputs, trace }
    if (!fail) {
      for (const o of checked(level)) {
        const w = want[o.name]?.[step.tick]
        const got = o === SAY ? said : outputs[o.name] ?? null
        if (w !== undefined && w !== got) {
          fail = { tick: step.tick, name: o.name, want: w, got }
          tick.failed = wrong(step.tick, o.label, w, got)
          break
        }
      }
    }
    out.push(tick)
  }
  const error = run.error && T('这块板这一拍要说的话取决于这一拍的线：说之前还听不到。', 'What this board says this tick depends on the line this tick: it cannot hear before it speaks.')
  return { ticks: out, want, ...(error ? { error } : {}), ...(fail ? { fail } : {}) }
}

/** Every test of a level on a board: { runs, pass }. */
export function runLevel(level, circuit, parts) {
  const runs = level.tests.map((test) => runTest(level, circuit, test, parts))
  return { runs, pass: runs.every((r) => !r.fail && !r.error) }
}

export { show }
