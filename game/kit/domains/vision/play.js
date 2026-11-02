// The vision domain's play hook for a blind session (../../engine/play/): a task as its screen shows it, in words, and
// an attempt judged as the screen judges it.
//
//   circuit  the kit's circuit play (../../engine/play/circuit.js): images written as their rows of numbers
//   grid     the image as a table of numbers with its axes (or a picture's description); the answer is rows of numbers
//            (one row a line, values by spaces, a colour pixel r,g,b) or `x y`
//   choice   every round at once, each item with its options by id; the answer is one line a round, the items' picks
//            separated by `;` and several options of one item by `,`
//   bench    not covered (turning knobs): skipped, said so
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { fmt, fromRows, pixel, show } from './image.js'
import { startBoard } from './board.js'
import { runLevel } from './run.js'
import { askOf, gridCheck } from './grid.js'
import { judgeOf } from './judges.js'
import { render } from './scene.js'

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
  settings: (_ctx, type) => (type === 'const' ? [{ key: 'value', values: ['…'] }] : type === 'lookup' ? [{ key: 'outside', values: ['error', 'zero', 'clamp'] }] : []),
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
        { title: T('图', 'The image'), text: showNumbers ? table(L.image) : T(`一张 ${fromRows(L.image).w} × ${fromRows(L.image).h} 的图（只给画面，不给数）`, `a ${fromRows(L.image).w} × ${fromRows(L.image).h} image (shown as a picture, no numbers)`) },
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
    return { tests: [{ label: T('答案', 'The answer'), pass: !why, says: why }], pass: !why, keep: answer }
  },
}

/** A scene in words: what the picture shows, as its pixels' colours (no facts the picture does not give). */
const picture = (scene) => T(`一张 ${render(scene).image.w} × ${render(scene).image.h} 的渲染图`, `a ${render(scene).image.w} × ${render(scene).image.h} rendering`)

const choice = {
  open(ctx) {
    const L = ctx.level.source
    const { judge, name } = judgeOf(L.judge)
    const sections = L.rounds.map((round, r) => ({
      title: T(`第 ${r + 1} 轮`, `Round ${r + 1}`),
      text: both((lang) => [
        ...(round.image ? [table(round.image)] : []),
        ...(name === 'claims' ? [lang === 'en' ? `${round.scenes.length} candidate scene(s), all compatible with the picture: ${round.scenes.map((s, k) => `scene ${k + 1}: ${s.objects.map((o) => `${o.id} (${o.class}, ${o.colour})`).join(', ')}`).join('; ')}` : `${round.scenes.length} 个候选场景，都和这张图相容：${round.scenes.map((s, k) => `场景 ${k + 1}：${s.objects.map((o) => `${o.id}（${o.class}，${o.colour}）`).join('、')}`).join('；')}`] : []),
        ...round.items.map((it, k) => `${lang === 'en' ? 'Item' : '题'} ${k + 1}: ${pick(it.prompt, lang)}${it.claim ? ` [${JSON.stringify(it.claim)}]` : ''}`),
        `${lang === 'en' ? 'Options' : '选项'}: ${round.options.map((o) => `${o.id} = ${pick(o.label, lang)}${o.gives ? ` (${o.gives.join(', ')})` : ''}${o.varies ? ` (${o.varies.join(', ')})` : ''}${o.predicted ? ` (${lang === 'en' ? 'label' : '标签'} ${o.truth}, ${lang === 'en' ? 'predicted' : '预测'} ${o.predicted})` : ''}${o.scene ? ` [${pick(picture(o.scene), lang)}]` : ''}`).join('; ')}`,
      ].join('\n')),
    }))
    return { sections, write: T(`每轮一行；一行里每题的选项编号用 ; 隔开${judge.multi ? '，一题选几个时用 , 隔开' : ''}。`, `One line a round; in a line, each item's option ids separated by ;${judge.multi ? ', several for one item by ,' : ''}.`) }
  },
  attempt(ctx, text) {
    const L = ctx.level.source
    const { judge, params } = judgeOf(L.judge)
    const lines = text.trim().split('\n')
    const tests = L.rounds.map((round, r) => {
      const picks = (lines[r] ?? '').split(';').map((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
      const wrong = judge.check(round, picks, params)
      return { label: T(`第 ${r + 1} 轮`, `Round ${r + 1}`), pass: !wrong.length, says: wrong[0]?.why ?? null }
    })
    return { tests, pass: tests.every((x) => x.pass) }
  },
}

export const play = {
  open(ctx) {
    const kind = ctx.level.source.kind
    if (kind === 'circuit') return circuit.open(ctx)
    if (kind === 'grid') return grid.open(ctx)
    if (kind === 'choice') return choice.open(ctx)
    return { covered: false, why: T('参数台（转旋钮），不接电路也不填答案', 'a parameter bench (turning knobs); nothing to wire or write') }
  },
  attempt(ctx, text) {
    const kind = ctx.level.source.kind
    return kind === 'circuit' ? circuit.attempt(ctx, text) : kind === 'grid' ? grid.attempt(ctx, text) : choice.attempt(ctx, text)
  },
}

