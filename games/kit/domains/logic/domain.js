// The logic domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads and the names copy may quote) and the domain's checks. Nothing
// here draws: the page's side is game.jsx.

import { vocabulary } from './vocabulary.js'
import { logicCourse } from './course.js'
import { validate } from './validate.js'

/** A logic game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const logic = logicCourse(content)
  return {
    id: content.id,
    domain: 'logic',
    title: content.title,
    course: logic.course,
    levels: logic.LEVELS,
    logic,
    quotes: content.quotes ?? [],
    texts: { chapters: logic.CHAPTERS, lemmas: content.lemmas, facts: content.facts ?? {}, gates: content.gates ?? {}, revisions: content.revisions ?? {}, glossary: content.glossary.entries },
  }
}

export default { vocabulary, spec, validate }
