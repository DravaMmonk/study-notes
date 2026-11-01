// The agent domain's play hook for a blind session (../../engine/play/): a level of 《软件工厂》 as its screen shows it,
// in words.
//
//   board level (ui/BoardScreen.jsx)  the machine's fixed cards and the parts it holds; every test an issue on a
//       repository; a run turn by turn, stopping at the first test that fails, which shows its turn log (each turn's
//       action, what was kept for the next turn, what the model saw), the test report and the verdict
//   hand level (ui/HandScreen.jsx)    the player is the loop: an attempt is a list of moves, one a line, played from a
//       fresh start (the screen's Start over, then each button in turn) —
//         add FILE     put a file of the repository into the context        list   put the file list in (a loop only)
//         drop K       take entry K out of the context (0 is the issue)     call   call the model
//         test         run the tests: the level passes once a run comes back green
//       the feedback is the screen's log, the context and the repository after the last move
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { startBoard, wiring } from './board.js'
import { stepHand, startHand } from './hand.js'
import { runLevel } from './run.js'
import { segOf } from './world.js'
import { PORT_LABELS, WORDS, actionText, entryText, whyText } from './words.js'

const T = (zh, en) => ({ zh, en })
/** A text built in both languages from one function of the language's L. */
const both = (f) => {
  const pick = (lang) => (v) => (v && typeof v === 'object' && typeof v.zh === 'string' ? v[lang] : v)
  return T(f(pick('zh'), 'zh'), f(pick('en'), 'en'))
}
const HOW = { right: T('改对了', 'right'), wrong: T('改错了', 'wrong'), madeup: T('编造', 'made up') }

/** A repository: each file with its tokens and functions, a function marked with what has been written to it. */
const repoText = (repo, state, t) => Object.entries(repo.files).map(([file, f]) => `- ${file} (${f.tokens} tok): ${f.segs.map((s) => (state[`${file}#${s}`] ? `${s} [${t(HOW[state[`${file}#${s}`]])}]` : s)).join(', ')}`).join('\n')
const reportText = (report, t, lang) => (report.green ? (lang === 'en' ? 'All tests pass.' : '测试全部通过。') : report.fails.map((f) => `${f.at.slice(0, f.at.indexOf('#'))} · ${segOf(f.at)}: ${t(whyText(f.why))}`).join('; '))
const issueText = (test, t, lang) => `${lang === 'en' ? 'Issue' : 'Issue'} “${t(test.issue.title)}”: ${t(test.issue.text)}`

const board = circuitPlay({
  board: ({ game, level, flags }) => {
    const { shown, folded } = game.agent.offerIn(level.source, flags)
    return { start: startBoard(level.source), parts: wiring(level.source.machine.mode), types: [...shown, ...folded] }
  },
  key: (_, type) => `part:${type}`,
  portLabel: (_, type, port) => PORT_LABELS[type]?.[port] ?? null,
  settings: ({ game, level }, type) => (type === 'read' ? [{ key: 'file', values: game.agent.filesIn(level.source).map((f) => JSON.stringify(f)), about: level.source.machine.mode === 'once' ? null : T('请求口未接线时读它', 'read while the request input is unconnected') }] : []),
  given: ({ game, level: { source: lv } }) => both((t, lang) => {
    const m = lv.machine
    const machine = m.mode === 'once'
      ? (lang === 'en' ? `The machine calls the board once. Window: ${m.window} tokens.` : `机器跑这块板一次。窗口：${m.window} token。`)
      : (lang === 'en' ? `The machine runs the board once a turn, at most ${lv.budget?.turns ?? m.turns} turns. Window: ${m.window} tokens.` : `机器每轮跑一遍板，最多 ${lv.budget?.turns ?? m.turns} 轮。窗口：${m.window} token。`)
    const budget = lv.budget?.tokens ? (lang === 'en' ? ` Token budget: ${lv.budget.tokens}.` : ` token 上限：${lv.budget.tokens}。`) : ''
    return [machine + budget, ...lv.fixed.map((type) => `${type}: “${t(game.textAt(WORDS[type], lv.id).name)}” — ${t(game.textAt(WORDS[type], lv.id).desc)}`)].join('\n')
  }),
  tests: ({ level: { source: lv } }) => lv.tests.map((test) => ({
    label: test.issue.title,
    text: both((t, lang) => [issueText(test, t, lang), ...(test.code ? [`${lang === 'en' ? 'The code card holds' : '代码元件给出'} ${test.code}`] : []), `${lang === 'en' ? 'Repository' : '仓库'}:`, repoText(test.repo, {}, t)].join('\n')),
  })),
  run: ({ level: { source: lv } }, graph) => {
    const checked = runLevel(lv, graph)
    const tests = untilFail(checked.runs.map((r, k) => ({
      label: lv.tests[k].issue.title,
      pass: !r.fail,
      says: r.fail ? both((t, lang) => {
        const turns = r.turns.map((turn, n) => `${lang === 'en' ? 'turn' : '第'} ${n + 1}${lang === 'en' ? '' : ' 轮'}: ${turn.calls.map((c) => `${t(actionText(c.action))} (${lang === 'en' ? 'saw' : '看到'} ${c.tokens} tok${c.dropped.length ? `, ${c.dropped.length} ${lang === 'en' ? 'dropped' : '条被丢弃'}` : ''})`).join('; ') || (lang === 'en' ? 'no model call' : '没有调用模型')}${turn.kept.length ? `; ${lang === 'en' ? 'kept' : '留到下一轮'}: ${turn.kept.map((e) => t(entryText(e))).join(', ')}` : ''}${turn.stop ? (lang === 'en' ? '; stops' : '；停下') : ''}`)
        return `${t(r.fail)}.\n    ${turns.join('\n    ')}\n    ${lang === 'en' ? 'Report' : '报告'}: ${reportText(r.report, t, lang)}\n    ${lang === 'en' ? 'Repository' : '仓库'}:\n${repoText(lv.tests[k].repo, r.state, t).replace(/^/gm, '    ')}`
      }) : null,
    })))
    const tokens = checked.runs.reduce((n, r) => n + r.tokens, 0)
    return { tests, pass: checked.pass, score: { tokens }, says: checked.pass ? [T(`全部测试共 ${tokens} token`, `${tokens} tokens across all tests`)] : [] }
  },
})

const MOVES = T(
  '每行一步，从头开始依次执行（相当于先点「重新开始」）：\n  add 文件     把仓库里的文件加入上下文\n  list         把目录加入上下文（仅循环）\n  drop k       把上下文的第 k 条移出（第 0 条是 issue，不能移出）\n  call         调用模型\n  test         运行测试：测试全部通过时过关',
  'One move a line, played in order from a fresh start (as after Start over):\n  add FILE     put a file of the repository into the context\n  list         put the file list into the context (a loop only)\n  drop K       take entry K out of the context (entry 0, the issue, stays)\n  call         call the model\n  test         run the tests: the level passes when they all pass',
)

/** A hand level's moves as text, or why a line cannot be read. */
function movesOf(text, level) {
  const ops = []
  const lines = text.split('\n').map((l) => l.replace(/#.*/, '').trim())
  for (const [k, line] of lines.entries()) {
    if (!line) continue
    const [op, ...rest] = line.split(/\s+/)
    const arg = rest.join(' ')
    const bad = (zh, en) => ({ error: T(`第 ${k + 1} 行：${zh}`, `Line ${k + 1}: ${en}`) })
    if (op === 'add') {
      if (!level.test.repo.files[arg]) return bad(`仓库里没有「${arg}」。`, `the repository has no “${arg}”.`)
      ops.push(['add', arg])
    } else if (op === 'drop') {
      if (!/^\d+$/.test(arg) || Number(arg) === 0) return bad('drop 后面写要移出的条目号（1 起）。', 'drop takes the number of the entry to take out (from 1).')
      ops.push(['drop', Number(arg)])
    } else if (op === 'list' && level.machine.mode !== 'loop') return bad('这一关没有「目录」按钮。', 'this level has no File list button.')
    else if (['list', 'call', 'test'].includes(op) && !arg) ops.push([op])
    else return bad(`「${line}」不是一步操作。`, `“${line}” is no move.`)
  }
  return { ops }
}

const hand = {
  open: ({ level: { source: lv } }) => ({
    kind: 'hand',
    given: both((t, lang) => `${lang === 'en' ? `The model reads a window of ${lv.machine.window} tokens${lv.machine.mode === 'loop' ? '; its own actions stay in its context' : ''}.` : `模型读 ${lv.machine.window} token 的窗口${lv.machine.mode === 'loop' ? '；它的动作留在上下文里' : ''}。`}\n${issueText(lv.test, t, lang)}\n${lang === 'en' ? 'Repository' : '仓库'}:\n${repoText(lv.test.repo, {}, t)}\n${lang === 'en' ? 'The context starts with the issue (entry 0).' : '上下文一开始只有 issue（第 0 条）。'}`),
    write: MOVES,
  }),
  attempt: ({ level: { source: lv } }, text) => {
    const read = movesOf(text, lv)
    if (read.error) return { pass: false, refused: [read.error], parts: [] }
    // The moves one by one, as the buttons play them: the level passes on the first test run that comes back green.
    let s = startHand(lv)
    let green = null
    for (const op of read.ops) {
      s = stepHand(lv, s, op)
      if (op[0] === 'test' && s.green && !green) green = { tokens: s.tokens }
    }
    const log = both((t, lang) => s.log.map((item) => {
      if (item.op === 'call') return `- ${lang === 'en' ? 'Model' : '模型'}: ${t(actionText(item.action))} (${lang === 'en' ? 'saw' : '看到'} ${item.tokens} tok${item.dropped.length ? `, ${item.dropped.length} ${lang === 'en' ? 'dropped' : '条被丢弃'}` : ''})`
      if (item.op === 'add') return `- ${lang === 'en' ? `You: added ${item.file}` : `你：加入 ${item.file}`}`
      if (item.op === 'list') return `- ${lang === 'en' ? 'You: added the file list' : '你：加入目录'}`
      if (item.op === 'drop') return `- ${lang === 'en' ? 'You: removed' : '你：移出'} ${t(entryText(item.entry))}`
      return `- ${lang === 'en' ? 'Tests' : '测试'}: ${reportText(item.report, t, lang)}`
    }).join('\n') + `\n${lang === 'en' ? 'Context now' : '此刻的上下文'}: ${s.context.map((e, k) => `[${k}] ${t(entryText(e))}`).join(', ')}\n${lang === 'en' ? 'Repository' : '仓库'}:\n${repoText(lv.test.repo, s.state, t)}\n${lang === 'en' ? `Tokens: ${s.tokens}` : `token：${s.tokens}`}`)
    return { pass: Boolean(green), says: [log], board: read.ops, score: green, parts: [] }
  },
}

export const play = {
  open: (ctx) => (ctx.level.source.kind === 'hand' ? hand.open(ctx) : board.open(ctx)),
  attempt: (ctx, text) => (ctx.level.source.kind === 'hand' ? hand.attempt(ctx, text) : board.attempt(ctx, text)),
}

