import { defineCourse, layout } from '../../course.js'
import { judgeWorks } from '../../engine/authoring.js'
import { judgeFor, playFor } from '../../engine/plays.js'
import { taskLevels } from '../../engine/tasks.js'
import { plays } from './plays.js'
import { judgeSums, readSum } from './sums.js'
import { vocabulary } from './vocabulary.js'

export function spec(content) {
  const eras = [{ id: 1, title: content.title, foundation: content.order }]
  const track = layout(eras)
  const levels = track.order.map((id) => {
    const level = content.levels.find((entry) => entry.id === id)
    const tasks = taskLevels(level).map((source) => ({ key: source.taskId, kind: source.kind, brief: source.brief, source }))
    return { ...level, kind: tasks[0].kind, chapter: 1, requires: track.requires.get(id), tasks }
  })
  const chapters = [{ id: 1, title: content.title, track: track.tracks.get(1) }]
  const course = defineCourse({ levels, eras, primitives: [], adds: () => [], builds: () => [], needs: () => null })
  return { id: content.id, title: content.title, domain: '__name__', levels, chapters, course }
}

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

export default { vocabulary, spec, validate }
