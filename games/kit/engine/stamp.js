// What a save is a save of, task by task: a short hash of each task's puzzle (its fields and its level's in the puzzle
// and tests sections, schema.js sectionOf, the words inside them aside) and the game's parts. A save keeps the stamp
// each of its tasks was made on, and what it keeps of a task whose puzzle has changed since is not read: the player
// starts that task afresh and keeps the rest (../shell/progress.js). Wording, answers, ids and the course's order are
// no part of a stamp, so editing them, or moving a task, keeps every save.
import { sectionOf, shapeAt } from './schema.js'

const PUZZLE = ['puzzle', 'tests']

/** The fields of a level or a task (its id and its tasks aside) that make its puzzle, read by the shape `schema` gives it. */
function puzzleOf(schema, value, vocabulary) {
  const shape = shapeAt(schema, value, [], { vocabulary })
  if (shape?.type !== 'obj') return value
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'tasks' && k !== 'id' && shape.fields[k] && PUZZLE.includes(sectionOf(shape.fields[k]))))
}

// A text (schema.js S.text): words, which say a puzzle and are not it.
const isText = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.entries(v).every(([k, x]) => (k === 'zh' || k === 'en') && typeof x === 'string')

/** FNV-1a, 32 bits, as 8 hex digits. */
function hash(text) {
  let h = 0x811c9dc5
  for (let k = 0; k < text.length; k++) h = Math.imul(h ^ text.charCodeAt(k), 0x01000193)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Each task's stamp and the level it is in, by task id: { [task]: { level, stamp } }, read through `vocabulary`. */
export function taskStamps(vocabulary, content) {
  const plain = (value) => JSON.stringify(value, (_k, v) => (isText(v) ? undefined : v))
  const parts = plain(content.partDefs ?? null)
  return Object.fromEntries(content.levels.flatMap((level) => {
    const own = plain(puzzleOf(vocabulary.level, level, vocabulary))
    return level.tasks.map((task, k) => [task.id, { level: level.id, stamp: hash(`${own}${plain(puzzleOf(shapeAt(vocabulary.level, level, ['tasks', k], { vocabulary }), task, vocabulary))}${parts}`) }])
  }))
}
