// A blind play of one game (games/DESIGN.md 6.6): what a player sees of the level they are on, and what the game says
// to an attempt, as plain text, with every step recorded in the session (./session.js). The same for the CLI
// (`npm run play`, ./cli.mjs) and the JSON tool an agent drives (./tool.mjs).
//
// The level comes from the game as the shell gets it (defineGame: its levels in play order, their brief, hints and
// introduction, the components box, the encyclopedia); the progress and the flags a level is played with follow the
// shell's own rules (../../shell/progress.js). Everything the level screen adds — the board, the tray, the tests, how
// a run is judged — comes from the domain's play hook (its domain.js `play`: { open(ctx), attempt(ctx, text) }; a
// circuit domain makes it with ./circuit.js). A level whose play the hook does not cover (open returns
// { covered: false, why }) is skipped: it counts as passed so the course goes on, and the record says so.
//
// Nothing a player could not see is shown: no reference or naive answers, no hidden tests (only how many fail), no
// level data beyond what the screen draws.

import { firstTask, flagsIn, passed, saved, taskPassed } from '../../shell/progress.js'
import { close, outcomeOf } from './session.js'
import { plain, refsIn, side } from './words.js'

const OPTIONAL = ['intro', 'step', 'finale', 'challenge']

/**
 * game: defineGame's result; course: the course the audit checks (its plan says which levels are required); hook: the
 * domain's play hook; record: the session (./session.js), changed in place as the player plays.
 */
/** What a pass asks of the player: what they worked out, in the field's words (the pipeline compares it with the
 *  knowledge the level brings, games/DESIGN.md 7.2). */
const EXPLAIN = {
  en: 'In a sentence or two, in the field’s own terms: what did you work out on this level? (./play --explain "…")',
  zh: '用本领域的术语写一两句：这一关你弄明白了什么？（./play --explain "…"）',
}

export function createPlay({ game, course, hook, record, now = () => new Date() }) {
  const lang = record.lang
  const solved = () => new Set(record.progress.solved)
  const required = (id) => !OPTIONAL.includes(course.plan?.place.get(id)?.role)
  const names = (kind, id) => {
    if (kind === 'level') return game.byId[id] ? `${game.levelLabel(game.byId[id])} ${side(game.byId[id].title, lang)}` : null
    if (kind === 'part') return side(game.parts?.all.find((p) => p.key === id)?.name, lang) || null
    return side(game.glossary?.entries.find((e) => e.id === id)?.title, lang) || null
  }
  const say = (v) => plain(v, lang, names)
  // The session's bound counts the levels played: a level skipped (a play not covered) is not one.
  const levelsDone = () => new Set(record.levels.filter((e) => e.outcome !== 'open' && e.outcome !== 'skipped').map((e) => e.level)).size
  const finished = () => record.limits.levels !== undefined && levelsDone() >= record.limits.levels

  /** The level played now: the one asked for (when open), else the first open level not yet passed, in play order. */
  function current(asked = null) {
    const has = solved()
    if (asked) {
      const level = game.byId[asked]
      if (!level) throw new Error(`no level ${asked}`)
      if (!game.isOpen(level, has)) throw new Error(`level ${asked} is not open yet: pass ${game.missing(level, has).map((l) => l.id).join(', ')} first`)
      return { level, task: firstTask(game, record.progress, level.id) }
    }
    const level = game.levels.find((l) => !has.has(l.id) && game.isOpen(l, has))
    return level ? { level, task: firstTask(game, record.progress, level.id) } : null
  }

  /** What the shell hands the level's screen. */
  const ctxOf = ({ level, task }) => ({
    game,
    level: level.tasks ? { ...level, ...level.tasks[task] } : level,
    flags: flagsIn(game, record.progress, level, task),
    progress: record.progress,
    solved: solved().has(level.id) || taskPassed(game, record.progress, level.id, task),
    task,
    fails: record.levels.find((e) => e.level === level.id && e.task === task)?.attempts ?? 0,
  })

  const pass = (at, data, score = null) => {
    const p = data === undefined ? record.progress : saved(record.progress, at.level, at.task, data)
    record.progress = passed(game, p, at.level, at.task, score)
  }

  /** The level played now, skipping the plays the hook does not cover. Returns { at, opened, skipped: [lines] }. */
  function arrive(asked = null) {
    const skipped = []
    for (;;) {
      if (finished()) return { at: null, skipped }
      const at = current(asked)
      if (!at) return { at: null, skipped }
      const ctx = ctxOf(at)
      const opened = hook.open(ctx)
      const entry = outcomeOf(record, at.level.id, at.task, required(at.level.id), now())
      if (opened.covered !== false) return { at, ctx, opened, entry, skipped }
      close(entry, 'skipped', now(), { why: side(opened.why, 'en') })
      skipped.push(`${names('level', at.level.id)}${at.level.tasks?.length > 1 ? ` (${at.task + 1}/${at.level.tasks.length})` : ''}: ${say(opened.why)}`)
      pass(at)
      asked = null
    }
  }

  const heading = (at) => {
    const chapter = game.chapters?.find((c) => c.id === at.level.chapter)
    const steps = at.level.tasks?.length > 1 ? ` · ${lang === 'en' ? 'task' : '任务'} ${at.task + 1}/${at.level.tasks.length}${at.level.tasks[at.task].step ? ` ${say(at.level.tasks[at.task].step)}` : ''}` : ''
    return `${chapter ? `[${say(chapter.title)}] ` : ''}${names('level', at.level.id)}${steps}`
  }
  // The brief and hints a screen shows: the hook's, else the level's (the shell's entry, or the domain's level under it).
  const briefOf = (ctx, opened) => opened.brief ?? { text: ctx.level.brief ?? ctx.level.source?.brief, tip: ctx.level.tip, hint: ctx.level.hint ?? ctx.level.source?.hint }
  const hintsOf = (ctx, opened) => {
    const h = briefOf(ctx, opened).hint
    return (Array.isArray(h) ? h : [h]).filter(Boolean)
  }

  /** The level played now, as the player sees it. */
  function view(asked = null) {
    const { at, ctx, opened, entry, skipped } = arrive(asked)
    const out = []
    if (skipped.length) out.push(lang === 'en' ? `Skipped (play not covered by the harness):\n${skipped.map((s) => `- ${s}`).join('\n')}` : `跳过（harness 不支持这种玩法）：\n${skipped.map((s) => `- ${s}`).join('\n')}`)
    if (!at) {
      out.push(lang === 'en' ? 'The session is over: no level left to play.' : '这一局结束了：没有可玩的关了。')
      return { text: out.join('\n\n'), level: null }
    }
    const brief = briefOf(ctx, opened)
    const intro = [...(at.task === 0 ? game.intro(at.level) ?? [] : []), ...(at.level.tasks?.[at.task]?.intro ?? [])]
    const sections = [`# ${heading(at)}`]
    if (intro.length) sections.push(`## ${lang === 'en' ? 'Introduction' : '引言'}\n${intro.map((page) => say(page.t) + (page.fig ? (lang === 'en' ? '\n[a figure is drawn here]' : '\n[此处有一张图]') : '')).join('\n\n')}`)
    sections.push(`## ${lang === 'en' ? 'Task' : '任务'}\n${[say(brief.text), brief.tip ? say(brief.tip) : ''].filter(Boolean).join('\n')}`)
    const hints = hintsOf(ctx, opened)
    if (entry.hints) sections.push(`## ${lang === 'en' ? 'Hints opened' : '已打开的提示'}\n${hints.slice(0, entry.hints).map(say).join('\n')}`)
    if (hints.length > entry.hints) sections.push(lang === 'en' ? `(${hints.length - entry.hints} more hint(s) behind the Hint button.)` : `（提示按钮后面还有 ${hints.length - entry.hints} 条提示。）`)
    sections.push(...domainView(opened))
    const wiki = encyclopedia([intro, brief, hints.slice(0, entry.hints)], at)
    if (wiki) sections.push(wiki)
    if (out.length) sections.unshift(out.join('\n\n'))
    return { text: sections.join('\n\n'), level: at.level.id, task: at.task }
  }

  /** The encyclopedia entries the shown text links to, open by now (what a click on the link shows). */
  function encyclopedia(texts, at) {
    const has = solved()
    const open = (e) => !e.at || (game.byId[e.at] && (game.isOpen(game.byId[e.at], has) || e.at === at.level.id))
    const entries = refsIn(texts, 'wiki').map((id) => game.glossary?.entries.find((e) => e.id === id)).filter((e) => e && open(e))
    if (!entries.length) return null
    return `## ${lang === 'en' ? 'Encyclopedia (linked above)' : '百科（上文链接的词条）'}\n${entries.map((e) => `- ${say(e.title)}: ${say(e.body)}`).join('\n')}`
  }

  /** What the domain's screen shows: the board's given nodes, the tray, the tests, how to write a board. */
  function domainView(o) {
    const en = lang === 'en'
    const out = []
    if (o.given) out.push(`## ${en ? 'On the screen' : '屏幕上'}\n${say(o.given)}`)
    if (o.nodes?.length) {
      out.push(`## ${en ? 'Nodes the level gives (wire to and from them by name)' : '关卡给的节点（按名字接线）'}\n${o.nodes.map((n) => {
        const ins = n.inputs.length ? `${en ? 'inputs' : '输入口'}: ${n.inputs.join(', ')}` : ''
        const outs = n.outputs.length ? `${en ? 'outputs' : '输出'}: ${n.outputs.map((k) => `${n.id}.${k}`).join(', ')}` : ''
        const sets = n.sets.length ? `${en ? 'settable' : '可设置'}: ${n.sets.join(', ')}` : ''
        return `- ${n.id} (${n.role})${[ins, outs, sets].filter(Boolean).map((s) => `; ${s}`).join('')}`
      }).join('\n')}`)
    }
    if (o.palette) {
      out.push(`## ${en ? 'Parts in the tray' : '托盘里的元件'}\n${o.palette.length ? o.palette.map((p) => {
        const port = (x) => (x.label && say(x.label) !== x.key ? `${x.key} “${say(x.label)}”` : x.key)
        const io = `${p.type}(${p.inputs.map(port).join(', ')})${p.outputs.length ? ` → ${p.outputs.map(port).join(', ')}` : ''}`
        const sets = p.settings.length ? `\n    ${en ? 'settings' : '设置'}: ${p.settings.map((s) => `${s.key}${s.values ? `=${s.values.join('|')}` : ''}${s.about ? ` (${say(s.about)})` : ''}`).join('; ')}` : ''
        return `- ${io}  “${say(p.name)}”: ${say(p.desc)}${sets}`
      }).join('\n') : en ? '(none)' : '（没有）'}`)
    }
    if (o.sections) for (const s of o.sections) out.push(`## ${say(s.title)}\n${say(s.text)}`)
    if (o.tests?.length) out.push(`## ${en ? 'Tests' : '测试'}\n${o.tests.map((t) => `### ${say(t.label)}\n${say(t.text)}`).join('\n\n')}${o.notes?.length ? `\n\n${o.notes.map(say).join('\n')}` : ''}`)
    if (o.start) out.push(`## ${en ? 'The board as it opens (blueprint)' : '打开时的电路（蓝图）'}\n${o.start}`)
    if (o.write) out.push(`## ${en ? 'How to write your answer' : '怎样写答案'}\n${say(o.write)}`)
    return out
  }

  /** The next hint of the level played now. */
  function hint() {
    const { at, ctx, opened, entry } = arrive()
    if (!at) return { text: lang === 'en' ? 'The session is over.' : '这一局结束了。' }
    const hints = hintsOf(ctx, opened)
    if (entry.hints >= hints.length) return { text: lang === 'en' ? 'No more hints on this level.' : '这一关没有更多提示了。' }
    entry.hints += 1
    return { text: `${lang === 'en' ? 'Hint' : '提示'} ${entry.hints}/${hints.length}: ${say(hints[entry.hints - 1])}` }
  }

  /** The feedback of an attempt, as the screen and its dialogs say it. */
  function feedback(r) {
    const en = lang === 'en'
    if (r.refused) return `${en ? 'The text was not imported:' : '文本没有导入：'}\n${r.refused.map((e) => `- ${say(e)}`).join('\n')}`
    const lines = []
    const state = (t) => (t.pass === null ? (en ? 'not run' : '未运行') : t.pass ? (en ? 'pass' : '通过') : `${en ? 'FAIL' : '未通过'}${t.says ? ` — ${say(t.says)}` : ''}`)
    for (const t of r.tests ?? []) lines.push(`- ${say(t.label)}: ${state(t)}`)
    // Hidden tests say how many fail, and only once every test shown passes (../../shell/CircuitLevel.jsx).
    if (r.hidden?.count && (r.tests ?? []).every((t) => t.pass)) lines.push(r.hidden.failed ? say(r.hidden.says) : en ? `- ${r.hidden.count} hidden test(s): pass` : `- ${r.hidden.count} 条隐藏测试：通过`)
    for (const s of r.says ?? []) lines.push(say(s))
    return lines.join('\n')
  }

  /** Try a board (or the domain's own answer) on the level played now. */
  function attempt(text) {
    const { at, ctx, entry } = arrive()
    if (!at) return { text: lang === 'en' ? 'The session is over.' : '这一局结束了。', pass: false }
    const r = hook.attempt(ctx, text)
    entry.attempts += 1
    entry.parts = r.parts ?? []
    const says = feedback(r)
    record.attempts.push({ level: at.level.id, task: at.task, at: now().toISOString(), text, pass: Boolean(r.pass), says })
    const en = lang === 'en'
    // What the screen saves on its way (a stage of the level passed): the level goes on from it.
    if (r.keep !== undefined) record.progress = saved(record.progress, at.level, at.task, r.keep)
    if (r.pass) {
      close(entry, 'solved', now())
      pass(at, r.board, r.score ?? null)
      const after = (at.level.tasks ? at.level.tasks[at.task].after : null) ?? (at.level.tasks && at.task < at.level.tasks.length - 1 ? null : at.level.after)
      return { pass: true, text: `${says}\n\n${at.level.tasks && at.task < at.level.tasks.length - 1 ? (en ? 'Task passed.' : '这一段通过了。') : en ? 'Level passed.' : '通关。'}${after ? `\n${say(after)}` : ''}\n\n${EXPLAIN[lang]}` }
    }
    if (entry.attempts >= record.limits.attempts) {
      close(entry, 'gave-up', now())
      pass(at)
      return { pass: false, text: `${says}\n\n${en ? `That was attempt ${entry.attempts}, the session's limit for a level: the level is given up and the session moves on.` : `这是第 ${entry.attempts} 次尝试，到了这一局每关的上限：放弃这一关，继续往下。`}` }
    }
    return { pass: false, text: `${says}\n\n${en ? `Attempt ${entry.attempts} of ${record.limits.attempts}.` : `第 ${entry.attempts} 次尝试，共 ${record.limits.attempts} 次。`}` }
  }

  /** What the player says they worked out on the level (or task) just passed, kept on its outcome. */
  function explain(text) {
    const entry = [...record.levels].reverse().find((e) => e.outcome === 'solved')
    if (!entry) return { text: lang === 'en' ? 'No level passed yet.' : '还没有通过的关。' }
    entry.learned = String(text).trim()
    return { text: lang === 'en' ? 'Noted.' : '记下了。' }
  }

  /** Give the level played now up and move on. */
  function giveUp() {
    const { at, entry } = arrive()
    if (!at) return { text: lang === 'en' ? 'The session is over.' : '这一局结束了。' }
    close(entry, 'gave-up', now())
    pass(at)
    return { text: lang === 'en' ? `Gave up ${names('level', at.level.id)}.` : `放弃了 ${names('level', at.level.id)}。` }
  }

  /** Where the session stands. */
  function status() {
    const closed = record.levels.filter((e) => e.outcome !== 'open')
    const by = (o) => closed.filter((e) => e.outcome === o).length
    return { text: `${record.game} · ${record.session}: ${by('solved')} solved, ${by('gave-up')} given up, ${by('skipped')} skipped; ${record.attempts.length} attempts` }
  }

  return { view, hint, attempt, explain, giveUp, status }
}

