// The can domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order and the texts a player reads) and the domain's checks. Nothing here draws: the page's side
// is game.jsx.

import { vocabulary } from './vocabulary.js'
import { busCourse } from './course.js'
import { validate } from './validate.js'

/** A bus game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const bus = busCourse(content)
  return {
    id: content.id,
    domain: 'can',
    title: content.title,
    course: bus.course,
    levels: bus.LEVELS,
    bus,
    texts: { chapters: bus.CHAPTERS, glossary: content.glossary.entries },
  }
}

export default { vocabulary, spec, validate }
