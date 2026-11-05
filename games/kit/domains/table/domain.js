// The table domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the course,
// its levels in play order, the texts a player reads and the table's own audit), the domain's checks, and its play
// hook for blind sessions (play.js). Nothing here draws: the page's side is game.jsx.

import { vocabulary } from './vocabulary.js';
import { syncOwn, tableCourse } from './course.js';
import { validate } from './validate.js';
import { play } from './play.js';

/** A table game's spec, as the checks read one (../../engine/checks.js). */
// What a level may unlock or fold (vocabulary.js): the parts and ideas game.json names.
const names = content => ({ part: new Set(Object.keys(content.parts ?? {})) });

function spec(content) {
  const table = tableCourse(content);
  return {
    id: content.id,
    domain: 'table',
    title: content.title,
    course: table.course,
    levels: table.LEVELS,
    table,
    blueprints: table.blueprints,
    syncOwn,
    texts: { chapters: table.CHAPTERS, parts: table.PARTS, glossary: content.glossary.entries },
    audit: table.problems,
  };
}

export default { vocabulary, names, spec, validate, play };
