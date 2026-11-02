// The vision domain's play hook for a blind session (../../engine/play/): a task as its screen shows it, in words, and
// an attempt judged as the screen judges it.
//
//   circuit  the kit's circuit play (../../engine/play/circuit.js): images written as their rows of numbers
//   grid     the image as a table of numbers with its axes (a picture only: each cell's brightness as seen); the answer is rows of numbers
//            (one row a line, values by spaces, a colour pixel r,g,b) or `x y`
//   choice   every round at once: what it shows (an image as its table, a scene as the picture described: its regions
//            of colour, nothing the picture does not show), each item with its options by id and label only (the data a
//            judge reads stays hidden); the answer is one line a round, the items' picks separated by `;` and several
//            options of one item by `,`; a claim answered wrong that two candidate scenes split shows the two described
//            from a view that tells them apart, as the screen does
//   bench    what the bench's pictures draw (their descriptions, never the model's own, which may state the relation the
//            bench is for), the knobs, each step's goal and the readings at the start; an attempt is settings tried in
//            turn, each answered with what the screen reads out: the knobs and the goal's quantities. A bench with
//            cases, buttons or picks on a picture is not covered: skipped, said so
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { display, fmt, fromRows, pixel, show } from './image.js'
import { startBoard } from './board.js'
import { runLevel } from './run.js'
import { askOf, gridCheck } from './grid.js'
import { isNaive, judgeOf } from './judges.js'
import { COLOURS, describe } from './scene.js'
import { DISPLAYS } from './benches/index.js'
import { callOf } from '../../engine/schema.js'
import { goalOf, judge, knobKind, knobStart, knobValues, needText, openKnobs, rowValue, startValues } from '../../engine/bench.js'

const T = (zh, en) => ({ zh, en })
const pick = (text, lang) => (typeof text === 'string' ? text : text?.[lang] ?? '')
const both = (f) => T(f('zh'), f('en'))

/** The tests the strip lists: a solved task's hidden tests join them. */
const testsOf = (task, solved) => (solved ? [...task.tests, ...task.hidden] : task.tests)

const circuit = circuitPlay({
  board: ({ game, level, flags, progress }) => {
    const vision = game.vision
    vision.syncOwn(progress.built)
    const T0 = level.source
    const { shown, folded } = vision.offerIn(T0, flags)
    return {
      start: startBoard(T0),
      parts: { inputs: (n) => (n.type === 'out' ? ['in'] : n.type === 'in' ? [] : vision.partOf(n.type)?.inputs ?? []), role: (n) => (n.type === 'out' ? 'sink' : n.type === 'in' ? 'source' : 'part'), outputs: (n) => (vision.partOf(n.type)?.outputs?.(n) ?? null)?.map((key) => ({ key })) ?? null },
      types: [...shown, ...folded],
    }
  },
  key: ({ game }, type) => (game.vision.BUILT[type] ? type : `part:${type}`),
  settings: (_ctx, type) => (type === 'const' ? [{ key: 'value', values: ['…'] }] : type === 'lookup' ? [{ key: 'outside', values: ['error', 'zero', 'clamp'] }] : type === 'channel' ? [{ key: 'c', values: ['R', 'G', 'B'] }] : []),
  given: ({ level: { source: L } }) => both((lang) => [...L.inputs.map((i) => `${i.name}: ${lang === 'en' ? 'input' : '输入'} “${pick(i.label, lang)}”`), ...L.outputs.map((o) => `${o.name}: ${lang === 'en' ? 'output' : '输出'} “${pick(o.label, lang)}”`)].join('\n')),
  tests: ({ level: { source: L }, solved }) => testsOf(L, solved).map((test, k) => ({
    label: T(`测试 ${k + 1}`, `Test ${k + 1}`),
    text: both((lang) => [...Object.entries(test.inputs).map(([n, v]) => `${n} = ${show(v)}`), ...Object.entries(test.expect).map(([n, v]) => `${n} ${lang === 'en' ? 'should be' : '应当是'} ${show(v)}`)].join('\n')),
  })),
  notes: ({ level: { source: L }, solved }) => (!solved && L.hidden.length ? [T(`另有 ${L.hidden.length} 个隐藏测试，每次运行一并检查。`, `${L.hidden.length} more hidden test(s) are checked with every run.`)] : []),
  run: ({ game, level: { source: L }, solved }, board) => {
    const runs = runLevel({ ...L, tests: testsOf(L, solved) }, board, game.vision.partOf).runs
    const tests = untilFail(runs.map((r, k) => ({ label: T(`测试 ${k + 1}`, `Test ${k + 1}`), pass: !r.fail, says: r.fail?.why ?? null })))
    const hidden = solved || !L.hidden.length ? null : runLevel({ ...L, tests: L.hidden }, board, game.vision.partOf).runs.filter((r) => r.fail).length
    return { tests, hidden: hidden === null ? null : { count: L.hidden.length, failed: hidden, says: T(`可见的测试都通过了，但 ${hidden} 个隐藏测试没有通过。`, `Every test shown passes, but ${hidden} hidden test(s) fail.`) }, pass: runs.every((r) => !r.fail) && !hidden }
  },
})

/** An image as a table with its axes: x across the top, y down the side. */
function table(rows) {
  const img = fromRows(rows)
  const cells = Array.from({ length: img.h }, (_, y) => Array.from({ length: img.w }, (_, x) => { const p = pixel(img, x, y); return Array.isArray(p) ? `(${p.map(fmt).join(',')})` : fmt(p) }))
  const width = Math.max(3, ...cells.flat().map((c) => c.length))
  return [`y\\x ${Array.from({ length: img.w }, (_, x) => String(x).padStart(width)).join(' ')}`, ...cells.map((r, y) => `${String(y).padStart(3)} ${r.map((c) => c.padStart(width)).join(' ')}`)].join('\n')
}

/** An image shown only as a picture, as the eye reads it: each cell's brightness 0 (darkest) to 9 (lightest), a colour
 *  cell the nearest named colour. */
function pictureOf(rows) {
  const img = fromRows(rows)
  const near = (p) => Object.entries(COLOURS).reduce((best, [k, c]) => { const d = c.rgb.reduce((s, v, j) => s + (v - display(p[j])) ** 2, 0); return d < best.d ? { k, d } : best }, { k: null, d: Infinity }).k
  const cells = Array.from({ length: img.h }, (_, y) => Array.from({ length: img.w }, (_, x) => { const p = pixel(img, x, y); return Array.isArray(p) ? near(p) : String(Math.round(display(p) * 9)) }))
  const width = Math.max(...cells.flat().map((c) => c.length))
  return T(
    [`只给画面，不给数：每格写它看上去的亮度，0 最暗、9 最亮${img.c === 3 ? '（彩色格写最接近的颜色）' : ''}`, ...cells.map((r) => r.map((c) => c.padStart(width)).join(' '))].join('\n'),
    [`Shown as a picture, no numbers: each cell its brightness as seen, 0 darkest to 9 lightest${img.c === 3 ? ' (a colour cell the nearest named colour)' : ''}`, ...cells.map((r) => r.map((c) => c.padStart(width)).join(' '))].join('\n'),
  )
}

/** An answer typed as rows: a line a row, values by spaces, a colour pixel r,g,b. */
const rowsOf = (text) => text.trim().split('\n').map((line) => line.trim().split(/\s+/).map((v) => (v.includes(',') ? v.split(',').map(Number) : Number(v))))

const grid = {
  open(ctx) {
    const L = ctx.level.source
    const { name, params } = askOf(L)
    const showNumbers = L.show !== 'picture'
    const ask = {
      copy: T('把这张图的每个值写成一行行的数。', 'Write every value of this image as rows of numbers.'),
      fill: T(`写出一张 ${params.rows?.[0]?.length ?? 0} × ${params.rows?.length ?? 0} 的格子，一行一行。`, `Write a ${params.rows?.[0]?.length ?? 0} × ${params.rows?.length ?? 0} grid, row by row.`),
      pick: T(`写出你点的格子的坐标：x y（要点的是 (${params.x}, ${params.y})）。`, `Write the coordinates of the cell you click: x y (the cell to click is (${params.x}, ${params.y})).`),
      locate: T(`高亮的格子在图里（${showNumbers ? '看表' : '看画面'}）：写出它的坐标 x y。`, 'A cell is highlighted: write its coordinates x y.'),
      set: T(`把像素改成要的值，写出改完的整张图。`, 'Change the pixel as asked and write the whole image after the change.'),
    }[name]
    const highlight = name === 'locate' ? both((lang) => (lang === 'en' ? `Highlighted: the cell holding ${show(pixel(fromRows(L.image), params.x, params.y))} at row ${params.y + 1} from the top, column ${params.x + 1} from the left.` : `高亮的是从上数第 ${params.y + 1} 行、从左数第 ${params.x + 1} 列、值为 ${show(pixel(fromRows(L.image), params.x, params.y))} 的格子。`)) : null
    return {
      sections: [
        { title: T('图', 'The image'), text: showNumbers ? table(L.image) : pictureOf(L.image) },
        ...(highlight ? [{ title: T('高亮', 'Highlighted'), text: highlight }] : []),
      ],
      write: ask,
    }
  },
  attempt(ctx, text) {
    const L = ctx.level.source
    const { name } = askOf(L)
    const answer = ['pick', 'locate'].includes(name) ? (([x, y]) => ({ x: Number(x), y: Number(y) }))(text.trim().split(/[\s,]+/)) : rowsOf(text)
    const why = gridCheck(L, answer)
    const naive = why && L.naive && JSON.stringify(answer) === JSON.stringify(L.naive.answer)
    return { tests: [{ label: T('答案', 'The answer'), pass: !why, says: why }], ...(naive ? { says: [L.naive.why] } : {}), pass: !why, keep: answer }
  },
}

/** What a round shows besides its items, in words: an image as its table, a scene as its picture described. */
const shownOf = (round, lang) => [
  ...(round.image ? [table(round.image)] : []),
  ...(round.scenes ? [`${lang === 'en' ? 'The picture' : '这一轮的图'}: ${pick(describe(round.scenes[0]), lang)}`] : []),
  ...(round.reference ? [`${lang === 'en' ? 'Reference' : '参照'}: ${pick(describe(round.reference), lang)}`] : []),
  ...(round.explore ? [`${lang === 'en' ? 'A scene to turn and relight (here from where it starts; turning it is not covered)' : '可以转视角、调光的场景（这里只给起始的样子，转动不在盲玩里）'}: ${pick(describe(round.explore.scene), lang)}`] : []),
]

/** An option as its button shows it: its label, its image as a table, its scene as its picture described. */
const optionOf = (o, lang) => [`${o.id} = ${pick(o.label, lang)}`, ...(o.image ? [table(o.image)] : []), ...(o.scene ? [pick(describe(o.scene), lang)] : [])].join('\n')

const choice = {
  open(ctx) {
    const L = ctx.level.source
    const { judge } = judgeOf(L.judge)
    const sections = L.rounds.map((round, r) => ({
      title: T(`第 ${r + 1} 轮`, `Round ${r + 1}`),
      text: both((lang) => [
        ...shownOf(round, lang),
        ...round.items.map((it, k) => `${lang === 'en' ? 'Item' : '题'} ${k + 1}: ${pick(it.prompt, lang)}`),
        `${lang === 'en' ? 'Options' : '选项'}:`,
        ...round.options.map((o) => optionOf(o, lang)),
      ].join('\n')),
    }))
    return { sections, write: T(`每轮一行；一行里每题的选项编号用 ; 隔开${judge.multi ? '，一题选几个时用 , 隔开' : ''}。`, `One line a round; in a line, each item's option ids separated by ;${judge.multi ? ', several for one item by ,' : ''}.`) }
  },
  attempt(ctx, text) {
    const L = ctx.level.source
    const { judge, params } = judgeOf(L.judge)
    const lines = text.trim().split('\n')
    const says = []
    const tests = L.rounds.map((round, r) => {
      const picks = (lines[r] ?? '').split(';').map((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
      const wrong = judge.check(round, picks, params)
      if (wrong.length && isNaive(L, r, picks)) says.push(L.naive.why)
      // What the screen shows under a claim answered wrong that two candidate scenes split: the two from another view.
      for (const w of wrong) {
        const reveal = round.reveals?.[w.item]
        if (reveal) says.push(both((lang) => reveal.scenes.map((k, j) => `${lang === 'en' ? `Scene ${k + 1} from another view (${j ? 'fails' : 'holds'})` : `换个角度看场景 ${k + 1}（${j ? '不成立' : '成立'}）`}: ${pick(describe({ ...round.scenes[k], camera: reveal.camera }), lang)}`).join('\n')))
      }
      return { label: T(`第 ${r + 1} 轮`, `Round ${r + 1}`), pass: !wrong.length, says: wrong.length ? both((lang) => wrong.map((w) => pick(w.why, lang)).join('\n')) : null }
    })
    return { tests, says, pass: tests.every((x) => x.pass) }
  },
}

/** What a knob takes, in words. */
const knobText = (name, knob, lang) => {
  const kind = knobKind(knob)
  const label = knob.label ? ` (${pick(knob.label, lang)})` : ''
  const range = kind === 'range' ? `${knob.min}–${knob.max}, ${lang === 'en' ? 'step' : '步长'} ${knob.step}`
    : kind === 'toggle' ? 'true / false'
      : kind === 'choice' ? knob.choices.map((c) => `${JSON.stringify(c.value)}${c.label ? ` (${pick(c.label, lang)})` : ''}`).join(', ')
        : knob.values.map((v, i) => `${i} = ${JSON.stringify(v)}`).join(', ')
  return `${name}${label}: ${range}${knob.unit ?? ''}; ${lang === 'en' ? 'starts at' : '起始'} ${JSON.stringify(knobStart(knob))}${knob.fixed ? (lang === 'en' ? ' (fixed)' : '（不能动）') : ''}`
}

/** What the screen reads out at a setting: the knobs' values and the goal's quantities, as its goal rows show them. */
const readings = (bench, stage, q) => [...new Set([...Object.keys(bench.knobs ?? {}), ...goalOf(bench, stage).map((l) => l.of)])]
  .map((k) => `${k} = ${typeof q[k] === 'number' ? fmt(q[k]) : JSON.stringify(q[k] ?? null)}`).join(', ')

/** The domain's pictures a bench's layout puts on screen, by what each draws. */
function picturesIn(layout) {
  const names = []
  const walk = (b) => {
    if (Array.isArray(b)) return b.forEach(walk)
    if (b && typeof b === 'object' && ['panel', 'stack', 'row'].some((k) => k in b)) return walk(b.panel ?? b.stack ?? b.row)
    const [name, params] = callOf(b)
    if (DISPLAYS[name] && !names.includes(name)) names.push(name)
    if (params?.with) walk(params.with)
  }
  for (const part of ['head', 'main', 'side', 'foot']) walk(layout[part] ?? [])
  return names.map((n) => DISPLAYS[n].about)
}

/** A setting typed as `name = value, …`, over the stage's start; what is wrong with it, or the values. */
function settingOf(bench, stage, line) {
  const values = startValues(bench, stage)
  const open = openKnobs(bench, stage)
  for (const part of line.split(',').map((x) => x.trim()).filter(Boolean)) {
    const [name, raw] = part.split('=').map((x) => x.trim())
    if (!open.includes(name)) return { wrong: T(`「${name}」不是这一步能动的旋钮`, `“${name}” is no knob this step turns`) }
    let v
    try { v = JSON.parse(raw) } catch { v = raw }
    if (!knobValues(bench.knobs[name]).some((x) => Math.abs(x - v) < 1e-9 || x === v)) return { wrong: T(`${name} 取不到 ${raw}`, `${name} cannot be set to ${raw}`) }
    values[name] = v
  }
  return { values }
}

const bench = {
  open(ctx) {
    const L = ctx.level.source
    const b = L.bench
    if (b.cases || b.actions || Object.values(b.knobs ?? {}).some((k) => knobKind(k) === 'list')) return { covered: false, why: T('带情形、按钮或要在图上点出来的参数台', 'a bench with cases, buttons or picks on a picture') }
    const model = L.made.model
    const stages = b.stages ?? [null]
    return {
      sections: [
        { title: T('台上画的', 'What the bench draws'), text: both((lang) => picturesIn(b.layout).map((a) => `- ${pick(a, lang)}`).join('\n')) },
        { title: T('旋钮', 'Knobs'), text: both((lang) => Object.entries(b.knobs ?? {}).map(([n, k]) => knobText(n, k, lang)).join('\n')) },
        ...stages.map((stage, k) => ({
          title: stage ? T(`第 ${k + 1} 步：${pick(stage.title, 'zh')}`, `Step ${k + 1}: ${pick(stage.title, 'en')}`) : T('目标', 'The goal'),
          text: both((lang) => [
            ...(stage ? [pick(stage.note, lang), `${lang === 'en' ? 'Knobs open' : '能动的旋钮'}: ${openKnobs(b, stage).join(', ')}`] : []),
            ...goalOf(b, stage).map((l) => `${pick(l.label, lang) || l.of} (${l.of}) ${needText(l) || [l.is !== undefined && `= ${JSON.stringify(l.is)}`, l.not !== undefined && `≠ ${JSON.stringify(l.not)}`].filter(Boolean).join(' ')}`),
            `${lang === 'en' ? 'Now' : '此刻'}: ${readings(b, stage, { ...startValues(b, stage), ...model.view(startValues(b, stage)) })}`,
          ].join('\n')),
        })),
      ],
      write: T('一行一个设置：名字 = 值, 名字 = 值（没写的旋钮留在这一步的起始值）。几行就是依次试几次；一个设置达到这一步的目标，下一行就到下一步。',
        'One setting a line: name = value, name = value (knobs left out stay at the step’s start). Several lines are tries in turn; once a setting meets a step’s goal, the next line is on the next step.'),
    }
  },
  attempt(ctx, text) {
    const b = ctx.level.source.bench
    const model = ctx.level.source.made.model
    const stages = b.stages ?? [null]
    const tests = stages.map((stage, k) => ({ label: stage ? T(`第 ${k + 1} 步`, `Step ${k + 1}`) : T('目标', 'The goal'), pass: null }))
    const says = []
    let at = 0
    for (const line of text.trim().split('\n').filter((x) => x.trim())) {
      if (at >= stages.length) break
      const { values, wrong } = settingOf(b, stages[at], line)
      if (wrong) {
        says.push(both((lang) => `${line.trim()}: ${pick(wrong, lang)}`))
        continue
      }
      const q = { ...values, ...model.view(values) }
      const verdict = judge(goalOf(b, stages[at]), q)
      says.push(both((lang) => `${line.trim()} → ${readings(b, stages[at], q)}; ${verdict.pass ? (lang === 'en' ? 'goal met' : '达到目标') : `${lang === 'en' ? 'not yet' : '还没达到'}: ${verdict.rows.filter((r) => !r.pass).map((r) => `${r.limit.of} = ${rowValue(r.limit, r.value)}`).join(', ')}`}`))
      tests[at].pass = verdict.pass
      if (verdict.pass) at += 1
    }
    return { tests, says, pass: at >= stages.length }
  },
}

const KINDS = { circuit, grid, choice, bench }

export const play = {
  open: (ctx) => KINDS[ctx.level.source.kind].open(ctx),
  attempt: (ctx, text) => KINDS[ctx.level.source.kind].attempt(ctx, text),
}

