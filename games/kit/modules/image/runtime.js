// The image domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads), the domain's checks, and its play hook for blind sessions
// (play.js). Nothing here draws: the page's side is game.js.
import { vocabulary } from './vocabulary.js'
import { imageWorks, prepareImageWorks } from './work.js'
import { validate } from './validate.js'
import { play } from './play.js'
import { partNames } from '../../../../packages/circuit/core/index.js'
import { builtParts } from '../../../../packages/circuit/core/index.js'

/** An image game's part names, for its trays: its built parts. */
const names = (content) => partNames(Object.keys(builtParts(content.partDefs)))

/** An image game's spec, as the checks read one (../../engine/checks.js). */
function spec(content, works = imageWorks(content)) {
  const image = works
  return {
    id: content.id,
    packageTarget: Boolean(content.packageTarget),
    title: content.title,
    course: image.course,
    levels: image.LEVELS,
    intros: image.intros,
    blueprints: image.blueprints,
    kit: image.kit,
    publishedBy: image.publishedBy,
    // The board each built part runs, by its task's key: the screens keep it as that task's passed board.
    syncOwn: image.syncOwn,
    // The built parts that run no circuit (games/DIRECTION.md §2, 4): a part a level unlocks is the engine's own
    // implementation; only a built part of parts.json (inside) runs the player's board.
    builtIn: [...new Set(image.course.levels.flatMap((l) => image.course.builds(l)))].filter((p) => !image.kit.types[p]?.kit),
    texts: { chapters: image.CHAPTERS, intros: image.intros, glossary: content.glossary.entries },
    quotes: Object.values(content.registries?.['circuit/quote'] ?? {}).map(quote => quote.text),
  }
}

export default { prepare: prepareImageWorks, vocabulary, names, spec, validate, play }
