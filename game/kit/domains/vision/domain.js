// The vision domain for the checks (games/DESIGN.md 6.3, 6.8): its vocabulary, a game's spec from its content (the
// course, its levels in play order, the texts a player reads, its boards as blueprint text and the boards its built
// parts run), the domain's checks and its play hook for blind sessions. Nothing here draws: the page's side is game.jsx.
import { vocabulary } from './vocabulary.js'
import { visionCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'

/** A vision game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const vision = visionCourse(content)
  return {
    id: content.id,
    domain: 'vision',
    title: content.title,
    course: vision.course,
    levels: vision.LEVELS,
    vision,
    blueprints: vision.blueprints,
    syncOwn: vision.syncOwn,
    texts: { chapters: vision.CHAPTERS, glossary: content.glossary.entries },
  }
}

export default { vocabulary, spec, validate, play }
