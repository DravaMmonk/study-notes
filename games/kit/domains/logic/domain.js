// The logic domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads and the names copy may quote) and the domain's checks. Nothing
// here draws: the page's side is game.jsx.

import { vocabulary } from './vocabulary.js'
import { logicCourse } from './course.js'
import { validate } from './validate.js'
import { syncOwn } from './built.js'
import { savesOf } from './items/migrations.js'

// What players keep on a level answers its puzzle (../../engine/ops/migrate.js): a proof proves its goal from its
// givens, a table fills its formulas, a world satisfies its sentences. A level whose puzzle changed keeps state that
// answers the old one, so it starts afresh. A machine is the exception: its board is a program run on the tests, and
// stays whatever they become, as long as it is asked for the same thing. Copy, the reference and naive answers, the
// tray, the concrete readings of the letters (cases) and what solving builds are no part of a puzzle.
const NOT_PUZZLE = ['title', 'step', 'brief', 'briefNote', 'hint', 'intro', 'after', 'showcase', 'symbolicWords', 'propertyWords', 'words',
  'solution', 'naive', 'script', 'answer', 'adds', 'fold', 'without', 'parts', 'cases', 'builds', 'fact', 'unlockToast']
const MACHINE_PUZZLE = ['kind', 'want', 'inputs', 'single']
const puzzle = (level) => {
  const keep = level.kind === 'machine' ? ([k]) => MACHINE_PUZZLE.includes(k) : ([k]) => !NOT_PUZZLE.includes(k) && k !== 'tasks'
  return { ...Object.fromEntries(Object.entries(level).filter(keep)), ...(level.tasks && { tasks: level.tasks.map(puzzle) }) }
}
const changes = {
  stale: (before, after) => JSON.stringify(puzzle(before)) !== JSON.stringify(puzzle(after)),
  drop: (ids) => [{ data: { drop: ids } }],
}

/** A logic game's spec, as the checks read one (../../engine/checks.js). */
function spec(content) {
  const logic = logicCourse(content)
  return {
    id: content.id,
    domain: 'logic',
    title: content.title,
    course: logic.course,
    levels: logic.LEVELS,
    logic,
    blueprints: logic.blueprints,
    syncOwn,
    quotes: content.quotes ?? [],
    texts: { chapters: logic.CHAPTERS, lemmas: content.lemmas, facts: content.facts ?? {}, gates: content.gates ?? {}, revisions: content.revisions ?? {}, glossary: content.glossary.entries },
  }
}

// A level of tasks (course.js): what the level says once (its title, its intro, its pass text, what it builds or
// proves, which its last task does), what all its tasks share, and its tasks, each a level of its own kind with a step
// for its title; a task may build or prove something of its own. Merging levels makes each a task (the first one's
// intro the level's, what they all share the level's, the last one's pass text and what it builds the level's);
// splitting gives each task back as a level, with what the level said for all of them (its intro before the first
// task's own).
const LEVEL_ONLY = ['title', 'intro', 'after', 'builds', 'fact']
const SHARED = Object.keys(vocabulary.level.of[1].fields).filter((k) => k !== 'tasks' && !LEVEL_ONLY.includes(k))
const pick = (level, keys) => Object.fromEntries(keys.filter((k) => level[k] !== undefined).map((k) => [k, level[k]]))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const tasks = {
  merge(levels, title) {
    const all = levels.flatMap((l, k) => {
      const { tasks: own, ...rest } = l
      const inner = k < levels.length - 1
      // A level of tasks before the last keeps what it says once on its last task.
      if (own) return own.map((task, j) => ({ ...pick(rest, SHARED), ...(inner && j === own.length - 1 && pick(rest, ['after', 'builds', 'fact'])), ...task }))
      const { title: step, intro, after, builds, fact, ...task } = l
      return [{ ...task, step, ...(k > 0 && intro && { intro }), ...(inner && pick(l, ['after', 'builds', 'fact'])) }]
    })
    const shared = SHARED.filter((k) => all[0][k] !== undefined && all.every((task) => same(task[k], all[0][k])))
    const [first, last] = [levels[0], levels.at(-1)]
    return {
      title, ...pick(first, ['intro']), ...pick(all[0], shared), ...pick(last, ['after', 'builds', 'fact']),
      tasks: all.map((task) => Object.fromEntries(Object.entries(task).filter(([k]) => !shared.includes(k)))),
    }
  },
  split(level) {
    if (!level.tasks) throw new Error('it is no level of tasks')
    const { tasks: list, ...said } = level
    const end = list.at(-1)
    const both = ['after', 'builds', 'fact'].filter((k) => said[k] !== undefined && end[k] !== undefined)
    if (both.length) throw new Error(`the level and its last task both say ${both.join(', ')}: make them one first`)
    return list.map(({ step, ...task }, k) => ({
      title: step, ...pick(said, SHARED), ...task, ...(k === list.length - 1 && pick(said, ['after', 'builds', 'fact'])),
      // The level's intro opens the first level, before the first task's own.
      ...(k === 0 && said.intro && { intro: [...said.intro, ...(task.intro ?? [])] }),
    }))
  },
}

export default { vocabulary, spec, validate, saves: savesOf, changes, tasks }
