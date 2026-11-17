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

export function tagReaderProblems(content, kernel) {
  const problems = []
  for (const [key, source] of Object.entries(content.sources?.tag ?? {})) {
    if (!source.declaration && !kernel.tables.tag.has(key)) problems.push({ at: `tags/${key}`, says: 'tag has no declaration or registered reader' })
  }
  for (const [key, reader] of kernel.tables.tag) {
    if (!content.registries.kind?.[reader.member]) problems.push({ at: `tags/${key}`, says: `unknown tag member type ${reader.member}` })
  }
  return problems
}

export const describeTask = task => ({ title: firstText(task.title), brief: firstText(task.brief) })
