// The pedagogy lint (games/DESIGN.md 4.1, 8): what a game's content shows of levels that teach nothing new. The
// checks see form, not meaning; they catch the shapes padding takes, and the review step reads for the rest.
//
//   pd-repeat-board   two levels' reference boards are the same board: the same puzzle twice
//   pd-repeat-text    a text the player reads (an intro page, a brief, a hint, a pass text, why a naive answer is
//                     wrong) is word for word in two places: boilerplate standing in for what this level says
//   pd-slide          (report) a bench step with one knob open and the goal's readout on screen, judged live: turning
//                     it until the readout turns green passes, whether or not the player has understood anything
//   pd-quiz           (report) a task that only asks the player to pick an answer (a choice task): nothing is built,
//                     tried or worked out; what it asks belongs in the copy (intro, pass text), or in a task to do
//
// lintPedagogy(content, spec) → [{ rule, at, says, report? }]; spec is the domain's (its `blueprints`: every board the
// content writes, by level and task).

export const PEDAGOGY_RULES = {
  'pd-repeat-board': 'two levels have the same reference board: one of them repeats the other',
  'pd-repeat-text': 'a text the player reads is word for word the same in two places: boilerplate',
  'pd-slide': 'a bench step turns one knob with the goal read out live: it passes by sliding until green (report)',
  'pd-quiz': 'a task only asks to pick an answer: put what it asks in the copy, or make it something to do (report)',
}

/** The keys under which a level holds what the player reads as prose. */
const PROSE = new Set(['t', 'brief', 'hint', 'after', 'note', 'why', 'given'])
const isText = (v) => v && typeof v === 'object' && typeof v.zh === 'string'

/** Every prose text in a level, with where it is: [{ where, zh }]. */
function proseOf(level) {
  const out = []
  const walk = (v, path, key) => {
    if (isText(v) || typeof v === 'string') {
      if (PROSE.has(key)) out.push({ where: path, zh: (isText(v) ? v.zh : v).trim() })
      return
    }
    if (Array.isArray(v)) v.forEach((x, k) => walk(x, `${path}[${k}]`, key))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, k)
  }
  walk(level, '', null)
  return out
}

/**
 * A board's shape, whatever its ids: each card its type and settings, then what feeds each of its inputs, read from
 * the cards nothing reads (the outputs). Two boards that compute the same thing the same way have one shape.
 */
export function boardShape(board) {
  const into = new Map()
  for (const w of board.wires) into.set(w.to, [...(into.get(w.to) ?? []), w])
  const byId = new Map(board.nodes.map((n) => [n.id, n]))
  const memo = new Map()
  const shape = (id, trail = new Set()) => {
    if (memo.has(id)) return memo.get(id)
    if (trail.has(id)) return '↺'
    const node = byId.get(id)
    const params = Object.entries(node?.params ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(',')
    const next = new Set(trail).add(id)
    const ins = [...(into.get(id) ?? [])].sort((a, b) => String(a.port).localeCompare(String(b.port))).map((w) => {
      const [from, key] = w.from.split('#')
      return `${w.port}:${shape(from, next)}${key ? `.${key}` : ''}`
    })
    const out = `${node?.type ?? '?'}[${params}](${ins.join(' ')})`
    memo.set(id, out)
    return out
  }
  const read = new Set(board.wires.map((w) => w.from.split('#')[0]))
  return board.nodes.filter((n) => !read.has(n.id)).map((n) => shape(n.id)).sort().join(' | ')
}

const KERNEL_GOALS = '"goals"'

export function lintPedagogy(content, spec) {
  const out = []
  const say = (rule, at, says, report = false) => out.push({ rule, at, says, ...(report ? { report: true } : {}) })

  // The same reference board in two levels.
  const boards = new Map()
  for (const b of spec.blueprints ?? []) {
    if (b.naive || !b.board.wires.length) continue
    const key = boardShape(b.board)
    const first = boards.get(key)
    if (first && first !== b.level) say('pd-repeat-board', b.level, `its reference board is the one ${first} already asks for`)
    else if (!first) boards.set(key, b.level)
  }

  // The same prose twice.
  const seen = new Map()
  for (const level of content.levels) {
    for (const { where, zh } of proseOf(level)) {
      if (zh.length < 8) continue
      const first = seen.get(zh)
      if (first) say('pd-repeat-text', `${level.id} ${where}`, `“${zh.slice(0, 40)}${zh.length > 40 ? '…' : ''}” is also ${first}`)
      else seen.set(zh, `${level.id} ${where}`)
    }
  }

  // A task that is only a quiz.
  for (const level of content.levels) {
    for (const task of level.tasks ?? [level]) if (task.kind === 'choice') say('pd-quiz', `${level.id}${task.id && task.id !== level.id ? ` task ${task.id}` : ''}`, 'it only asks to pick an answer', true)
  }

  // A bench step of one knob with its goal read out on screen.
  for (const level of content.levels) {
    for (const task of level.tasks ?? [level]) {
      const bench = task.bench
      if (!bench?.knobs || bench.check === 'submit' || !JSON.stringify(bench.layout ?? {}).includes(KERNEL_GOALS)) continue
      for (const [k, stage] of (bench.stages ?? [null]).entries()) {
        const open = stage?.opens ?? Object.keys(bench.knobs).filter((n) => !bench.knobs[n].fixed)
        if (open.length === 1) say('pd-slide', `${level.id}${task.id && task.id !== level.id ? ` task ${task.id}` : ''}${stage ? ` step ${k + 1}` : ''}`, `only ${open[0]} turns, and the goal reads out live`, true)
      }
    }
  }
  return out
}
