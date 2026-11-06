// What a save is a save of: a short hash of the content's puzzles (every level's and task's fields in the puzzle and
// tests sections, schema.js sectionOf, with their ids, the words inside them aside) and its parts. A save keeps the
// stamp it was made on, and one made on other puzzles is not read: the player starts afresh (../shell/progress.js).
// Wording, answers and the course's order are no part of it, so editing them keeps every save.
import { sectionOf, shapeAt } from './schema.js'

const PUZZLE = ['puzzle', 'tests']

/** The fields of a level or a task (its tasks aside) that make its puzzle, read by the shape `schema` gives it. */
function puzzleOf(schema, value, vocabulary) {
  const shape = shapeAt(schema, value, [], { vocabulary })
  if (shape?.type !== 'obj') return value
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'tasks' && shape.fields[k] && PUZZLE.includes(sectionOf(shape.fields[k]))))
}

// A text (schema.js S.text): words, which say a puzzle and are not it.
const isText = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.entries(v).every(([k, x]) => (k === 'zh' || k === 'en') && typeof x === 'string')

/** FNV-1a, 32 bits, as 8 hex digits. */
function hash(text) {
  let h = 0x811c9dc5
  for (let k = 0; k < text.length; k++) h = Math.imul(h ^ text.charCodeAt(k), 0x01000193)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** The stamp of `content` read through its domain's `vocabulary`. */
export function contentStamp(vocabulary, content) {
  const levels = content.levels.map((level) => [
    level.id,
    puzzleOf(vocabulary.level, level, vocabulary),
    level.tasks.map((task, k) => [task.id, puzzleOf(shapeAt(vocabulary.level, level, ['tasks', k], { vocabulary }), task, vocabulary)]),
  ])
  return hash(JSON.stringify([levels, content.partDefs ?? null], (_k, v) => (isText(v) ? undefined : v)))
}
