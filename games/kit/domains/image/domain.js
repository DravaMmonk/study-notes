// The image domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads), the domain's checks, and its play hook for blind sessions
// (play.js). Nothing here draws: the page's side is game.js.
import { vocabulary } from './vocabulary.js'
import { imageCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'
import { partNames } from '../../engine/trays.js'
import { builtPieces } from '../../engine/pieces.js'

/** An image game's part names, for its trays: its built pieces. */
const names = (content) => partNames(Object.keys(builtPieces(content.partDefs)))

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
    kit: image.kit,
    publishedBy: image.publishedBy,
    // The board each built piece runs, by its task's key: the screens keep it as that task's passed board.
    syncOwn: (built) => image.syncOwn({ solved: image.LEVELS.filter((l) => l.tasks.some((t) => built[t.key])).map((l) => l.id), data: built }),
    // The built parts that run no circuit (games/DIRECTION.md §2, 4): a part a level unlocks is the engine's own
    // implementation; only a built piece of parts.json (inside) runs the player's board.
    builtIn: [...new Set(image.course.levels.flatMap((l) => image.course.builds(l)))].filter((p) => !image.kit.types[p]?.kit),
    texts: { chapters: image.CHAPTERS, intros: image.intros, glossary: content.glossary.entries },
    quotes: content.quotes ?? [],
  }
}

export default { vocabulary, names, spec, validate, play }
