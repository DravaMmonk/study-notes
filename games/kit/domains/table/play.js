// The table domain's play hook for a blind session (../../engine/play/): a circuit task of 《状态之图》 as its screen
// (ui/modes/Circuit.jsx) shows it, in words — what the robot can read on the task's two input cards, the parts the
// task holds, each test's table — and an attempt judged as a run judges it (model/verdict.js): test by test, stopping
// at the first that fails, with the fail dialog's words and its hint (the level's diagnosis of the board, else the
// task's hints by how many runs have failed). A task whose failure is its lesson (`onFail`) passes when it fails, and
// the level goes on to its next task, as the screen does.
//
// The test board is a picture; here a test is its world's data as the level writes it (the grid's size, the given
// cells, rocks, costs…), with the scan order and the cell the answer is read from. The hand plays (trace, fill, seam,
// link, pack, policy, breach) are not covered: each is a screen of its own the player works by tapping cells.
//
// Text here is in the shell's language (lang.js tr), which a blind session chooses before the game loads.
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { portsProblem } from './model/board.js'
import { WORLDS } from './model/worlds.js'
import { judge, testLabel, whyFailed } from './model/verdict.js'
import { fromGraph, wiring } from './model/wiring.js'
import { diagnosisOf, guideAt } from './items/conditions.js'
import { tr } from './lang.js'

const CONSTS = [0, 1, 2, 3, 4, 5]
const str = (v) => (v === null || v === undefined ? '' : String(v))

/** The board the task opens on (course.js opening): carried from an earlier level or from the task before, else empty. */
const opening = (ctx) => ctx.game.table.opening(ctx.level.source, ctx.progress)

export const play = {
  open(ctx) {
    const s = ctx.level.source
    if (s.mode !== 'circuit') return { covered: false, why: { zh: '手动玩法（在表上点格子），harness 只支持电路关', en: 'a hand play (tapping cells on the table); the harness covers circuit levels' } }
    const tip = guideAt(s.guide, opening(ctx)) ?? [s.ask, s.tip].filter(Boolean).map(str).join(' ')
    return { ...circuit.open(ctx), brief: { text: [s.mission.goal, s.mission.how].map(str).join('\n'), tip: tip || null, hint: s.hints ?? null } }
  },
  attempt: (ctx, text) => circuit.attempt(ctx, text),
}

const circuit = circuitPlay({
  board: (ctx) => {
    ctx.game.table.syncOwn(ctx.progress.built)
    const s = ctx.level.source
    const V = WORLDS[s.world]
    const allowed = ctx.game.table.usableIn(s, ctx.flags)
    return { start: opening(ctx), parts: wiring(ctx.game.table.model, { sensors: V.sensors, outs: V.outs }), types: s.palette.filter((k) => allowed.has(k)) }
  },
  part: (ctx, type) => {
    const d = ctx.game.table.model.def(type)
    return { name: d.tag && type !== 'const' && !d.built ? `${str(d.name)} · ${str(d.tag)}` : str(d.name), desc: str(d.desc) }
  },
  portLabel: (ctx, type, port) => str(ctx.game.table.model.def(type).labels?.[+port]) || null,
  settings: (ctx, type) => (ctx.game.table.model.def(type).params?.includes('value') ? [{ key: 'value', values: (ctx.level.source.consts ?? CONSTS).map(String) }] : []),
  given: (ctx) => {
    const s = ctx.level.source
    const V = WORLDS[s.world]
    const sensor = (id) => `${id} (${str(V.sensors[id]?.label)}, ${V.sensors[id]?.type})`
    const card = (id, name) => (s.given.offers[id].length ? [`${id}: ${name} — ${tr('可以读', 'can read')}: ${s.given.offers[id].map(sensor).join(', ')}. ${tr(`在文本里写 ${id}[picks=[…]]() 选它读哪些，读到的每一个是 ${id}.名字 这个输出。`, `Write ${id}[picks=[…]]() to pick what it reads; each one picked is an output ${id}.NAME.`)}`] : [])
    const ports = s.ports.filter((p) => p.input).map((p) => `${p.input}: ${tr('元件的输入口', 'an input port of the part')} “${str(p.label)}”`)
    return [
      ...card('view', tr('视野（机器人四周的格子）', 'View (the cells around the robot)')),
      ...card('facts', tr('本格信息', 'This cell')),
      ...ports,
      ...V.outs.map(([id, label]) => `${id}: ${tr('输出', 'output')} “${str(label)}” — ${tr('机器人写进这一格的数', 'what the robot writes into the cell')}`),
      `${tr('机器人的顺序', 'The robot’s order')}: ${str(V.orderText(s))}`,
      ...(s.rounds ? [tr('机器人一轮一轮地扫整张表，直到一整轮没有格子变化。', 'The robot scans the whole table round after round until a whole round changes nothing.')] : []),
      ...(s.ports.length ? [tr('这一关搭出一个元件：板只能读元件的这些口。', 'This level builds a part: the board may read only its ports.')] : []),
    ].join('\n')
  },
  tests: (ctx) => {
    const s = ctx.level.source
    const V = WORLDS[s.world]
    return s.tests.map((t, k) => {
      const key = V.answerKey?.(t, s) ?? null
      return { label: `${tr('测试', 'Test')} ${k + 1} · ${str(testLabel(s, V, t))}`, text: `${JSON.stringify(t)}${key !== null ? `\n${tr('答案读自', 'The answer is read at')} ${str(V.name(key))}` : ''}` }
    })
  },
  run: (ctx, graph) => {
    const s = ctx.level.source
    const V = WORLDS[s.world]
    const b = fromGraph(graph)
    const label = (t) => testLabel(s, V, t)
    const miss = V.outs.find(([id]) => !b.wires.some((w) => w.to === id))
    if (miss) return { tests: [], says: [tr(`输出口「${str(miss[1])}」还没接线`, `The output “${str(miss[1])}” is not wired yet`)], pass: false }
    const results = []
    let failed = null
    for (let k = 0; k < s.tests.length && !failed; k++) {
      const j = judge(ctx.game.table.model, s, b, k, s)
      results.push({ label: `${tr('测试', 'Test')} ${k + 1} · ${str(label(j.t))}`, pass: j.ok })
      if (!j.ok) failed = { k, ...j }
    }
    const tests = untilFail([...results, ...s.tests.slice(results.length).map((t, k) => ({ label: `${tr('测试', 'Test')} ${results.length + k + 1} · ${str(label(t))}`, pass: null }))])
    if (failed && s.onFail) {
      // A task whose failure is its lesson: what went wrong, why no board could do better, and on to the next task.
      const at = { test: failed.k + 1, want: str(s.expected[failed.k]), got: str(failed.res.value) }
      return { tests, says: [`${str(s.onFail.head)}: ${String(s.onFail.body).replace(/\{(test|want|got)\}/g, (_, f) => at[f])}`], pass: true }
    }
    if (failed) {
      const why = whyFailed({ L: s, V, opt: s, label, expected: s.expected }, failed.k, failed.t, failed.res, failed.mm)
      const hint = diagnosisOf(s.diagnose, b) || (s.hints ? s.hints[Math.min(Math.max(ctx.fails, 0), s.hints.length - 1)] : null)
      tests[failed.k] = { ...tests[failed.k], says: `${str(why.head)}: ${str(why.body)}` }
      return { tests, says: hint ? [`${tr('提示', 'Hint')}: ${str(hint)}`] : [], pass: false }
    }
    // A board that becomes a part must read exactly the part's ports, or the part would not do what the board did.
    const notPart = s.ports.length ? portsProblem(b, s.ports) : null
    if (notPart) return { tests, says: [`${tr('还不能做成元件', 'Not a part yet')}: ${str(notPart)}`], pass: false }
    return { tests, pass: true }
  },
  keep: (ctx, graph) => fromGraph(graph),
})
