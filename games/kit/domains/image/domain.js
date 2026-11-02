// The image domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads), the domain's checks, and its play hook for blind sessions
// (play.js). Nothing here draws: the page's side is game.jsx.
import { vocabulary } from './vocabulary.js'
import { imageCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'

/** An image game's spec, as the checks read one (../../engine/checks.js). */
function spec(content) {
  const image = imageCourse(content)
  return {
    id: content.id,
    domain: 'image',
    title: content.title,
    course: image.course,
    levels: image.LEVELS,
    intros: image.intros,
    blueprints: image.blueprints,
    // The board each packing level's part runs, by level id: the screens keep it as the level's passed board.
    syncOwn: (built) => image.syncOwn({ solved: Object.keys(built), data: built }),
    texts: { chapters: image.CHAPTERS, intros: image.intros, glossary: content.glossary.entries },
    quotes: content.quotes ?? [],
  }
}

export default { vocabulary, spec, validate, play }
