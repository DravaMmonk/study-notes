// The image domain's play hook for a blind session (../../engine/play/): a circuit level of 《视觉完备》 as its screen
// (ui/LevelScreen.jsx) shows it, in words — the level's inputs and outputs, the parts it holds with their settings,
// and every test's pictures (each input and the output it should become) — and an attempt run as the Run button runs
// it: every test, then the level's budget (its constraint), the hidden tests with it.
//
// A picture is drawn as numbers, a row a line (16×16 values from 0 to 1 for most; a waveform is one row, a reading
// one number): what the test strip draws as pixels. The probe levels (reading pixels with the pointer) and the
// parameter benches are not covered: neither takes a board.
import { circuitPlay } from '../../engine/play/circuit.js'
import { withHidden } from '../../engine/tests.js'
import { BOARD_PARTS, startBoard } from './engine/board.js'
import { runLevel } from './engine/graph.js'
import { NODE_TYPES, settingsOf } from './engine/nodes.js'
import { INPUT_LABELS, descriptionOf } from './words.js'

const T = (zh, en) => ({ zh, en })
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] ?? v.zh : v)

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

/** The board a level opens on: the player's circuit from the level before it in a series, else its inputs and outputs. */
function opening({ level, progress }) {
  const L = level
  const names = (board, type) => board.nodes.filter((n) => n.type === type).map((n) => n.params.name).sort().join()
  const fits = (board) => board?.nodes && names(board, 'input') === [...L.inputs].sort().join() && names(board, 'output') === [...L.outputs].sort().join() && board.nodes.every((n) => NODE_TYPES[n.type])
  const carried = L.carry && progress.solved.includes(L.carry) && progress.data[L.carry]
  const offers = (board) => board.nodes.every((n) => n.type === 'input' || n.type === 'output' || L.palette.includes(n.type))
  return fits(carried) && offers(carried) ? carried : startBoard(L)
}

const testsShown = ({ level, solved }) => (solved ? withHidden(level) : level).tests

const circuit = circuitPlay({
  board: (ctx) => {
    ctx.game.image.syncOwn(ctx.progress)
    const { shown, folded } = ctx.game.image.offerIn(ctx.level, ctx.flags)
    return { start: opening(ctx), parts: BOARD_PARTS, types: [...shown, ...folded] }
  },
  // The score under the board reads a circuit's cost live as parts go on it, so a part's own cost is something the
  // player sees: it is written beside what the part does.
  part: (_, type) => {
    const cost = NODE_TYPES[type].cost
    const desc = descriptionOf(type) ?? ''
    return { name: NODE_TYPES[type].label, desc: typeof cost === 'number' ? T(`${pick(desc, 'zh')}（计算量 ${cost}）`, `${pick(desc, 'en')} (cost ${cost})`) : desc }
  },
  settings: ({ flags }, type) => settingsOf(type, flags).filter((p) => !p.hidden).map((p) => ({
    key: p.key,
    values: p.options ? p.options.map((o) => String(o[0])) : p.kind === 'number' ? [`${p.min}…${p.max}${p.step ? ` (${p.step})` : ''}`] : p.kind === 'kernel' ? ['[9 numbers]'] : null,
    about: p.label,
  })),
  given: ({ level: L }) => {
    const many = L.inputs.length > 1
    const labels = L.inputLabels ?? (many ? INPUT_LABELS : {})
    const side = (lang) => [
      ...L.inputs.map((name) => `${name}: ${lang === 'en' ? 'input' : '输入'}${labels[name] ? ` “${pick(labels[name], lang)}”` : ''}`),
      ...L.outputs.map((name) => `${name}: ${lang === 'en' ? 'output' : '输出'}${L.outputLabels?.[name] ? ` “${pick(L.outputLabels[name], lang)}”` : ''}`),
      ...(L.check?.tolerance !== undefined ? [lang === 'en' ? `A value passes within ${L.check.tolerance} of the target.` : `与目标相差 ${L.check.tolerance} 以内算对。`] : []),
    ].join('\n')
    return T(side('zh'), side('en'))
  },
  tests: (ctx) => testsShown(ctx).map((t) => ({
    label: t.label,
    text: [...Object.entries(t.inputs).map(([name, img]) => `${name}:\n${picture(img)}`), ...Object.entries(t.expected).map(([name, img]) => `${name} (target):\n${picture(img)}`)].join('\n'),
  })),
  notes: ({ level: L, solved }) => (!solved && L.hidden?.length ? [T(`另有 ${L.hidden.length} 组隐藏测试，运行测试时一并检查，通关后公开。`, `${L.hidden.length} more hidden tests are checked with every run and shown once you pass.`)] : []),
  run: (ctx, graph) => {
    const L = ctx.level
    const { shown, folded } = ctx.game.image.offerIn(L, ctx.flags)
    const play = { ...(ctx.solved ? withHidden(L) : L), palette: [...shown, ...folded], folded }
    const run = runLevel(play, graph)
    // A failed test says, output by output, how far its picture is from the target.
    const why = (r, lang) => r.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${pick(c.reason, lang)}`).join(lang === 'en' ? '; ' : '；')
    const tests = run.results.map((r, k) => ({ label: play.tests[k].label, pass: r.pass, says: r.pass ? null : T(why(r, 'zh'), why(r, 'en')) }))
    const hiddenCount = ctx.solved ? 0 : L.hidden?.length ?? 0
    const hiddenFailed = hiddenCount ? runLevel({ ...L, tests: L.hidden }, graph).results.filter((r) => !r.pass).length : 0
    return {
      tests,
      says: [...(run.constraint ? [run.constraint] : []), T(`元件 ${run.score.nodes} · 计算量 ${run.score.cost}`, `Parts ${run.score.nodes} · cost ${run.score.cost}`)],
      hidden: hiddenCount ? { count: hiddenCount, failed: hiddenFailed, says: T(`以下测试全部通过，但 ${hiddenCount} 组隐藏测试中有 ${hiddenFailed} 组未通过：电路可能只是恰好适用于这几张图。`, `Every test passes, but ${hiddenFailed} of ${hiddenCount} hidden tests fail: the circuit may only happen to work on these pictures.`) } : null,
      pass: run.pass && !hiddenFailed,
      score: run.score,
    }
  },
  // A level that packs its circuit keeps the one that passed, so editing it later cannot break the part.
  keep: ({ level }, graph) => (level.packs ? { ...graph, passed: { nodes: graph.nodes, wires: graph.wires } } : graph),
})

export const play = {
  open: (ctx) => (ctx.level.kind === 'graph' ? circuit.open(ctx) : { covered: false, why: ctx.level.kind === 'probe' ? T('探针关（用指针读像素），不接电路', 'a probe level (reading pixels with the pointer); no board to wire') : T('参数台（转旋钮），不接电路', 'a parameter bench (turning knobs); no board to wire') }),
  attempt: (ctx, text) => circuit.attempt(ctx, text),
}
