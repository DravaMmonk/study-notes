// What a save is a save of, task by task: a short hash of each task's puzzle (its fields and its level's in the puzzle
// and tests sections, schema.js sectionOf, the words inside them aside) and the game's parts. A save keeps the stamp
// each of its tasks was made on, and what it keeps of a task whose puzzle has changed since is not read: the player
// starts that task afresh and keeps the rest (../shell/progress.js). Wording, answers, ids and the course's order are
// no part of a stamp, so editing them, or moving a task, keeps every save.
import { find, sectionOf, shapeAt } from './schema.js'
import { PARTS_FILE } from './parts/schema.js'
import { isText } from './i18n.js'
import { editorOf } from './pieces.js'

const PUZZLE = ['puzzle', 'tests']

/** The fields of a level or a task (its id and its tasks aside) that make its puzzle, read by the shape `schema` gives it. */
function puzzleOf(schema, value, vocabulary, courseField) {
  const shape = shapeAt(schema, value, [], { vocabulary })
  if (shape?.type !== 'obj') return value
  return Object.fromEntries(Object.entries(value).flatMap(([key, field]) => {
    if (key === 'id' || key === 'tasks' || !shape.fields[key]) return []
    if (PUZZLE.includes(sectionOf(shape.fields[key]))) return [[key, field]]
    const retained = courseField?.(key, field)
    return retained ? [retained] : []
  }))
}

/** FNV-1a, 32 bits, as 8 hex digits. */
function hash(text) {
  let h = 0x811c9dc5
  for (let k = 0; k < text.length; k++) h = Math.imul(h ^ text.charCodeAt(k), 0x01000193)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Each task's stamp and its level, keyed by task ID. A domain may include a course field's puzzle semantics. */
export function taskStamps(vocabulary, content, { courseField } = {}) {
  const localizedFields = (schema, value) => new Set(find(schema, value, 'text', { vocabulary }).map((field) => field.value).filter(isText))
  const plain = (value, texts) => JSON.stringify(value, (_k, v) => (texts.has(v) ? undefined : v))
  // Strip labels are bound to the task's expression language. They do not change how a saved work is judged.
  const strip = Object.values(content.partDefs?.parts ?? {}).filter((piece) => editorOf(piece) === 'strip')
  const texts = localizedFields(PARTS_FILE, content.partDefs)
  const parts = plain(content.partDefs ?? null, new Set([...texts, ...strip]))
  return Object.fromEntries(content.levels.flatMap((level) => {
    const texts = localizedFields(vocabulary.level, level)
    const own = plain(puzzleOf(vocabulary.level, level, vocabulary, courseField), texts)
    return level.tasks.map((task, k) => [task.id, { level: level.id, stamp: hash(`${own}${plain(puzzleOf(shapeAt(vocabulary.level, level, ['tasks', k], { vocabulary }), task, vocabulary), texts)}${parts}`) }])
  }))
}

// Omit board presentation when identifying the work a run executes.
function workOf(work) {
  if (!Array.isArray(work?.nodes) || !Array.isArray(work?.wires)) return work
  return {
    nodes: work.nodes.map(({ id, type, params, in: region }) => ({ id, type, params, region })),
    wires: work.wires.map(({ from, to, port }) => ({ from, to, port })),
  }
}

/**
 * Record a work and the transitive closure of the works it uses. A resolver returns the task key, selected work and
 * its puzzle stamp for each direct dependency. An already seen task can occur several times on a board.
 */
export function solutionStamp(root, references) {
  const works = new Map()
  const identity = (entry) => `${entry.key}@${hash(JSON.stringify([entry.puzzle, workOf(entry.work)]))}`
  const visit = (entry) => {
    const id = identity(entry)
    if (works.has(id)) return
    const dependencies = references(entry)
    works.set(id, {
      id,
      key: entry.key,
      puzzle: entry.puzzle,
      work: workOf(entry.work),
      uses: [...new Set(dependencies.map(identity))].sort(),
    })
    for (const dependency of dependencies) visit(dependency)
  }
  visit(root)
  const ordered = [...works.keys()].sort().map((id) => works.get(id))
  return { root: identity(root), stamp: hash(JSON.stringify([identity(root), ordered])), works: ordered }
}
