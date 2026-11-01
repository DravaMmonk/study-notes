// The table domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads and the table's own audit) and the domain's checks. Nothing here
// draws: the page's side is game.jsx.

import { vocabulary } from './vocabulary.js';
import { tableCourse } from './course.js';
import { validate } from './validate.js';
import { savesOf } from './items/migrations.js';

/** A table game's spec, as the checks read one (../../engine/checks.js). */
function spec(content) {
  const table = tableCourse(content);
  return {
    id: content.id,
    domain: 'table',
    title: content.title,
    course: table.course,
    levels: table.LEVELS,
    table,
    texts: { chapters: table.CHAPTERS, parts: table.PARTS, glossary: content.glossary.entries },
    audit: table.problems,
  };
}

export default { vocabulary, spec, validate, saves: savesOf };
