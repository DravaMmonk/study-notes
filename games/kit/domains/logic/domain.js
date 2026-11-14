// The logic domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads and the names copy may quote), the domain's checks, and its play
// hook for blind sessions (play.js). Nothing here draws: the page's side is game.js.

import { vocabulary } from './vocabulary.js'
import { logicCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'
import { parse } from './formula.js'
import { parseS, parseSide } from './schematic.js'
import { parseTerm } from './pterm.js'
import { builtPieces } from '../../engine/pieces.js'

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

// What a part's name may be (vocabulary.js PART): the vocabulary's parts, and the game's built pieces (lemmas, gates,
// machine parts and equations).
const names = (content) => ({ part: new Set([...Object.keys(vocabulary.kinds.part), ...Object.keys(builtPieces(content.partDefs))]) })

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
    syncOwn: logic.syncOwn,
    // The built parts that do not run a board syncOwn hands them unchecked: a gate runs the board kept for it only when
    // that board passes its level (gates.js builtGates), and a lemma with a card runs as the kit's card (proof.js).
    builtIn: [...new Set(logic.course.levels.flatMap((l) => logic.course.builds(l)))].filter((p) => logic.gates[p] || logic.lemmas[p]?.card),
    quotes: content.quotes ?? [],
    texts: { chapters: logic.CHAPTERS, ...logic.texts, glossary: content.glossary.entries },
  }
}

export default { vocabulary, languages, names, spec, validate, play }
