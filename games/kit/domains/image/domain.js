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
    kit: image.kit,
    // The board each packing level's part runs, by its last task's key: the screens keep it as that task's passed board.
    syncOwn: (built) => image.syncOwn({ solved: image.LEVELS.filter((l) => built[l.tasks.at(-1).key]).map((l) => l.id), data: built }),
    // The built parts that run no circuit (games/DIRECTION.md §2, 4): a part a level unlocks is the engine's own
    // implementation; only a level that packs its circuit (own-<level>) runs the player's board.
    builtIn: [...new Set(image.course.levels.flatMap((l) => image.course.builds(l)))].filter((p) => !image.kit.types[p]?.kit),
    texts: { chapters: image.CHAPTERS, intros: image.intros, glossary: content.glossary.entries },
    quotes: content.quotes ?? [],
  }
}

export default { vocabulary, spec, validate, play }
