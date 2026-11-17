// One thin projection lets package plays share the existing course and task dispatch.
import { readWorks } from './course-model.js'
import { courseLayout } from './course-dependencies.js'
import { taskLevels } from './tasks.js'
import { firstText } from './i18n.js'

export function pluginRuntime(id, kernel, vocabulary) {
  function* prepare(content) {
    const plan = courseLayout(content)
    const levels = plan.order.map(name => {
      const level = content.levels.find(level => level.id === name)
      const tasks = taskLevels(level, content.taskPositions).map(source => ({ ...source, key: source.taskId, kind: source.play, source }))
      return { ...level, tasks, kind: tasks[0].kind, chapter: plan.place.get(name).era, requires: plan.requires.get(name), unlocks: [] }
    })
    const course = yield { levels, plan }
    return { levels, course, chapters: (content.eras ?? []).map(era => ({ ...era, track: plan.tracks.get(era.id), rows: plan.rows.get(era.id) })) }
  }
  const spec = (content, works = readWorks(content, prepare)) => ({ id: content.id, title: content.title, ...works, pluginContent: content })
  const context = ctx => ({ ...ctx, task: ctx.level.source ?? ctx.level, kernel })
  return { id, kernel, vocabulary, prepare, spec,
    validate: spec => kernel.checks({ content: spec.pluginContent, levels: spec.levels, package: id }),
    play: {
      open(ctx) { const c = context(ctx); return kernel.tables.agent.get(c.task.play).observe(c) },
      attempt(ctx, work) { const c = context(ctx); return kernel.tables.agent.get(c.task.play).act(c, work) },
    },
  }
}

export function evaluatePlay(kernel, task, work, context = {}) {
  const play = kernel.tables.play.get(task.play)
  if (!play) throw new Error(`unknown play ${task.play}`)
  const ctx = { ...context, kernel, task, state: kernel.state(context) }
  const normalized = play.normalize(play.read(work, ctx), ctx)
  const report = play.run(normalized, ctx)
  return { work: play.write(normalized, ctx), report, verdict: play.judge(report, ctx) }
}

const distance = (a, b) => {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 0; i < a.length; i++) {
    const next = [i + 1]
    for (let j = 0; j < b.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (a[i] === b[j] ? 0 : 1)))
    row = next
  }
  return row[b.length]
}
export function tagReaderProblems(content, kernel) {
  const problems = []
  for (const [name, tag] of Object.entries(content.registries.tag)) {
    const [owner, local] = name.split('/')
    const reader = kernel.tables.tag.get(`${owner}:${local}`) ?? kernel.tables.tag.get(local)
    if (reader && !reader.kinds.includes('*') && !reader.kinds.includes(tag.kind)) problems.push({ at: `tags/${name}`, says: `${local} expects ${reader.kinds.join(', ')}, got ${tag.kind}` })
    if (!reader) {
      const reserved = [...kernel.tables.tag.keys()].find(key => distance(local, key.split(':').at(-1)) <= 2)
      if (reserved) problems.push({ at: `tags/${name}`, says: `unread convention ${local}; did you mean ${reserved}?` })
    }
  }
  return problems
}

export const describeTask = task => ({ title: firstText(task.title), brief: firstText(task.brief) })
