// The image domain's play hook for a blind session (../../engine/play/): a circuit level of 《视觉完备》 as its screen
// (ui/circuit.js) shows it, in words — the level's inputs and outputs, the parts it holds with their settings,
// and every test's pictures (each input and the output it should become) — and an attempt run as the Run button runs
// it: every test, then the level's budget (its constraint), the hidden tests with it.
//
// A picture is drawn as numbers, a row a line (16×16 values from 0 to 1 for most; a waveform is one row, a reading
// one number): what the test strip draws as pixels. The probe levels (reading pixels with the pointer) and the
// parameter benches are not covered: neither takes a board.
import { circuitPlay } from '../../engine/play/circuit.js'
import { runTestGroups, splitTests, TEST_WORDS } from '../../engine/tests.js'
import { plays } from './plays.js'
import { INPUT_LABELS, descriptionOf } from './words.js'
import { T } from '../../shell/i18n.js'

const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] ?? v.en ?? v.zh : v)

/** A number as short as it reads: 0, 1, .5, -.25. */
const short = (v) => {
  if (!Number.isFinite(v)) return String(v)
  const s = String(Math.round(v * 100) / 100)
  return s.replace(/^(-?)0\./, '$1.')
}
/** A picture as rows of numbers. */
const picture = (img) => {
  if (!img?.data) return '—'
  if (img.w * img.h === 1) return short(img.data[0])
  const rows = []
  for (let y = 0; y < img.h; y++) rows.push(Array.from({ length: img.w }, (_, x) => short(img.data[y * img.w + x])).join(' '))
  return `${img.w}×${img.h}\n${rows.join('\n')}`
}

const revealed = ({ solved }) => solved && plays.graph.checks === 'afterPass'
const testsOf = (ctx) => splitTests(ctx.level.source, revealed(ctx))

const circuit = circuitPlay({
  board: ({ game, level: { source: task }, progress, flags }) => {
    const view = game.circuit.forTask(task)
    view.syncOwn(progress.built, progress)
    const { shown, folded } = view.offerIn(task, flags)
    return { start: view.opening(task, progress.built, undefined, progress), parts: view.board.wiring(task, view), types: [...shown, ...folded] }
  },
  // The score under the board reads a circuit's cost live as parts go on it, so a part's own cost is something the
  // player sees: it is written beside what the part does.
  part: ({ game }, type) => {
    const { types } = game.image.kit
    const cost = types[type].cost
    const desc = descriptionOf(types, type) ?? ''
    return { name: types[type].label, desc: typeof cost === 'number' ? T(`${pick(desc, 'zh')}（计算量 ${cost}）`, `${pick(desc, 'en')} (cost ${cost})`) : desc }
  },
  settings: ({ game, level, flags }, type) => game.image.kit.settingsOf(type, game.circuit.forTask(level.source).holdsIn(level.source, flags)).filter((p) => !p.hidden).map((p) => ({
    key: p.key,
    values: p.options ? p.options.map((o) => String(o[0])) : p.kind === 'number' ? [`${p.min}…${p.max}${p.step ? ` (${p.step})` : ''}`] : p.kind === 'kernel' ? ['[9 numbers]'] : null,
    about: p.label,
  })),
  given: ({ level: { source: L } }) => {
    const many = L.inputs.length > 1
    const labels = L.inputLabels ?? (many ? INPUT_LABELS : {})
    const side = (lang) => [
      ...L.inputs.map((name) => `${name}: ${lang === 'en' ? 'input' : '输入'}${labels[name] ? ` “${pick(labels[name], lang)}”` : ''}`),
      ...L.outputs.map((name) => `${name}: ${lang === 'en' ? 'output' : '输出'}${L.outputLabels?.[name] ? ` “${pick(L.outputLabels[name], lang)}”` : ''}`),
      ...(L.check?.tolerance !== undefined ? [lang === 'en' ? `A value passes within ${L.check.tolerance} of the target.` : `与目标相差 ${L.check.tolerance} 以内算对。`] : []),
    ].join('\n')
    return T(side('zh'), side('en'))
  },
  tests: (ctx) => testsOf(ctx).shown.map((t) => ({
    label: t.label,
    text: [...Object.entries(t.inputs).map(([name, img]) => `${name}:\n${picture(img)}`), ...Object.entries(t.expected).map(([name, img]) => `${name} (target):\n${picture(img)}`)].join('\n'),
  })),
  notes: (ctx) => {
    const { hiddenCount } = testsOf(ctx)
    return hiddenCount ? [TEST_WORDS.note(hiddenCount)] : []
  },
  run: (ctx, graph) => {
    const { runLevel } = ctx.game.image.kit
    const { shown: visible, checked, hidden, pass } = runTestGroups(ctx.level.source, revealed(ctx), (task) => runLevel(task, graph))
    // A failed test says, output by output, how far its picture is from the target.
    const why = (r, lang) => r.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${pick(c.reason, lang)}`).join(lang === 'en' ? '; ' : '；')
    const tests = checked.runs.map((r, k) => ({ label: visible[k].label, pass: r.pass, says: r.pass ? null : T(why(r, 'zh'), why(r, 'en')) }))
    return {
      tests,
      says: [...(checked.constraint ? [checked.constraint] : []), T(`元件 ${checked.score.nodes} · 计算量 ${checked.score.cost}`, `Parts ${checked.score.nodes} · cost ${checked.score.cost}`)],
      hidden: hidden && { ...hidden, says: TEST_WORDS.failed(hidden.failed, hidden.count) },
      constraint: checked.constraint,
      pass,
      score: checked.score,
    }
  },
  // A task a built piece runs keeps the circuit that passed, so editing it later cannot break the piece.
  keep: ({ game, level }, graph) => (game.image.publishedBy(level.key).length ? { ...graph, passed: { nodes: graph.nodes, wires: graph.wires } } : graph),
})

export const play = {
  open: (ctx) => (ctx.level.kind === 'graph' ? circuit.open(ctx) : { covered: false, why: ctx.level.kind === 'probe' ? T('探针关（用指针读像素），不接电路') : T('参数台（转旋钮），不接电路') }),
  attempt: (ctx, text) => circuit.attempt(ctx, text),
}
