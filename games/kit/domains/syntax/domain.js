// The syntax domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order and the texts a player reads) and the domain's checks. Nothing here draws: the page's side
// is game.jsx.

import { vocabulary } from './vocabulary.js'
import { syntaxCourse } from './course.js'
import { validate } from './validate.js'

// What players keep on a level is their reading of its sentences: a sentence rewritten (or its fixed folds changed)
// is another sentence, and the reading starts afresh (../../engine/ops/migrate.js).
const words = (level) => level.tasks.map((s) => [s.sentence, s.given ?? []])
const changes = {
  stale: (before, after) => JSON.stringify(words(before)) !== JSON.stringify(words(after)),
}

/** A syntax game's spec, as the checks read one (../../engine/checks.js). */
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

export default { vocabulary, spec, validate, changes }
