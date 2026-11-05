// The net domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads, its boards as blueprint text and the boards its built parts run),
// the domain's checks, its play hook for blind sessions (play.js) and its headless drawing of a level (scene.js, an
// SVG string). The page's side is game.jsx.

import { vocabulary } from './vocabulary.js'
import { netCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'
import { scene } from './scene.js'

/** A net game's spec, as npm run check reads one (../../engine/check.js). */
function spec(content) {
  const net = netCourse(content)
  return {
    id: content.id,
    domain: 'net',
    title: content.title,
    course: net.course,
    levels: net.LEVELS,
    net,
    blueprints: net.blueprints,
    syncOwn: net.syncOwn,
    texts: { chapters: net.CHAPTERS, glossary: content.glossary.entries },
  }
}

// The tools' other hooks on a domain (kit/engine/contract.js EXTENSIONS: changes, play, scene) go here too.
export default { vocabulary, spec, validate, play, scene }
