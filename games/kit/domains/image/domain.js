// The image domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads) and the domain's checks. Nothing here draws: the page's side is
// game.jsx.
import { vocabulary } from './vocabulary.js'
import { imageCourse } from './course.js'
import { validate } from './validate.js'
import { savesOf } from './items/migrations.js'

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
    texts: { chapters: image.CHAPTERS, intros: image.intros, glossary: content.glossary.entries },
    quotes: content.quotes ?? [],
  }
}

export default { vocabulary, spec, validate, saves: savesOf }
