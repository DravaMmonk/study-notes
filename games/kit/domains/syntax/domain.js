// The syntax domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order and the texts a player reads) and the domain's checks. Nothing here draws: the page's side
// is game.jsx.

import { vocabulary } from './vocabulary.js'
import { syntaxCourse } from './course.js'
import { validate } from './validate.js'

/** A syntax game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const syntax = syntaxCourse(content)
  return {
    id: content.id,
    domain: 'syntax',
    title: content.title,
    course: syntax.course,
    levels: syntax.LEVELS,
    syntax,
    texts: { chapters: syntax.CHAPTERS, glossary: content.glossary.entries },
  }
}

export default { vocabulary, spec, validate }
