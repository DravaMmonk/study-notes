import { readWorks } from '../../engine/course-model.js'
import { courseLayout } from '../../engine/course-dependencies.js'
import { judgeWorks } from '../../engine/authoring.js'
import { judgeFor, playFor } from '../../engine/plays.js'
import { taskLevels } from '../../engine/tasks.js'
import { plays } from './plays.js'
import { judgeSums, readSum } from './sums.js'
import { vocabulary } from './vocabulary.js'
import { play } from './play.js'

export function* prepare(content) {
  const eras = content.eras
  const track = courseLayout(content)
  const levels = track.order.map((id) => {
    const level = content.levels.find((entry) => entry.id === id)
    const tasks = taskLevels(level, content.taskPositions).map((source) => ({ key: source.taskId, kind: source.kind, brief: source.brief, source }))
    return { ...level, kind: tasks[0].kind, chapter: track.place.get(id).era, requires: track.requires.get(id), tasks }
  })
  const chapters = eras.map(({ id }) => ({ id, title: content.title, track: track.tracks.get(id), rows: track.rows.get(id) }))
  const course = yield { levels, plan: track }
  return { levels, chapters, course }
}

export const spec = (content, works = readWorks(content, prepare)) => ({ id: content.id, title: content.title, ...works })

export function validate({ levels }) {
  return levels.flatMap((level) => level.tasks.flatMap(({ key, source }) => {
    const judge = judgeFor(playFor(plays, source), judgeSums(source.rows))
    const { reference, naive, empty } = judgeWorks(judge, {
      reference: source.rows.map((row) => readSum(row.reference)),
      naive: source.rows.map((row) => readSum(row.naive)),
      empty: source.rows.map(() => null),
    })
    const ok = reference.ok && naive.ok && empty.ok
    return [{ level: level.id, fail: !ok, text: `${key}: equations ${ok ? 'PASS' : 'FAIL'}` }]
  }))
}

const languages = {
  'rows:sum': (text) => {
    try { readSum(text); return null }
    catch (error) { return error.message }
  },
}

export default { prepare, vocabulary, spec, validate, languages, play }
