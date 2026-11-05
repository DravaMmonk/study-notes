// The logic domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads and the names copy may quote), the domain's checks, and its play
// hook for blind sessions (play.js). Nothing here draws: the page's side is game.jsx.

import { vocabulary } from './vocabulary.js'
import { logicCourse } from './course.js'
import { validate } from './validate.js'
import { syncOwn } from './built.js'
import { play } from './play.js'
import { parse } from './formula.js'
import { parseS, parseSide } from './schematic.js'
import { parseTerm } from './pterm.js'

// The readers of the vocabulary's languages: why a text cannot be read, or null.
const reads = (parser) => (text) => {
  try {
    parser(text)
    return null
  } catch (error) {
    return error.message
  }
}
const languages = { formula: reads(parse), side: reads(parseSide), condition: reads(parseS), term: reads(parseTerm) }

// What players keep on a level answers its puzzle (../../engine/ops/migrate.js): a proof proves its goal from its
// givens, a table fills its formulas, a world satisfies its sentences. A level whose puzzle changed keeps state that
// answers the old one, so its boards start afresh. A machine is the exception: its board is a program run on the tests, and
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
    // The built parts that do not run a board syncOwn hands them unchecked: a gate runs the board kept for it only when
    // that board passes its level (gates.js builtGates), and a lemma with a card runs as the kit's card (proof.js).
    builtIn: [...new Set(logic.course.levels.flatMap((l) => logic.course.builds(l)))].filter((p) => content.gates?.[p] || content.lemmas?.[p]?.card),
    quotes: content.quotes ?? [],
    texts: { chapters: logic.CHAPTERS, lemmas: content.lemmas, facts: content.facts ?? {}, gates: content.gates ?? {}, revisions: content.revisions ?? {}, glossary: content.glossary.entries },
  }
}

export default { vocabulary, languages, spec, validate, play, changes }
