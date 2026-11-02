// The __name__ domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads, its boards as blueprint text and the boards its built parts run),
// the domain's checks, and its play hook for blind sessions (play.js). Nothing here draws: the page's side is game.jsx.

import { vocabulary } from './vocabulary.js'
import { __name__Course } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'

/** A __name__ game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const __name__ = __name__Course(content)
  return {
    id: content.id,
    domain: '__name__',
    title: content.title,
    course: __name__.course,
    levels: __name__.LEVELS,
    __name__,
    blueprints: __name__.blueprints,
    syncOwn: __name__.syncOwn,
    texts: { chapters: __name__.CHAPTERS, glossary: content.glossary.entries },
  }
}

// The tools' other hooks on a domain (kit/engine/contract.js EXTENSIONS: changes, play, scene) go here too.
export default { vocabulary, spec, validate, play }
