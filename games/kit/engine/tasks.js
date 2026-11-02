// A level is a list of tasks (games/DESIGN.md 4, 6.2): what the level says once — its title, its introduction, its
// pass text, its place in the course — and its tasks, one or more, each a puzzle of the domain done in turn: its brief,
// its hints, its board's ports, its tests, its answers. A level of one task is what was once a plain level; a level
// grows by a task, and two levels become one by putting their tasks in one list. The shell plays each task as the
// level with the task's fields over the level's own (../shell/GameShell.jsx), and so does every domain reading one.
import { S } from './schema.js'

const t = (zh, en) => ({ zh, en })

/** A level's schema: the fields it says once (`once`) and its tasks, each of `task`'s fields and an optional name. */
export const taskLevel = (once, task) => S.obj({
  ...once,
  tasks: S.list(S.obj({
    step: S.opt(S.text({ about: t('这个任务的名字，写在任务条上（一关只有一个任务时不显示）', 'the task’s name on the strip of tasks (not shown when the level has one task)') })),
    ...task,
  }), { min: 1, section: 'tasks', about: t('依次做的任务，最后一个通过就通过这一关', 'the tasks done in turn; passing the last passes the level') }),
})

/** Each task of a level as a level of its own: the level's fields under the task's, its index `task`. */
export const taskLevels = ({ tasks, ...level }) => tasks.map(({ step: _, ...task }, k) => ({ ...level, ...task, task: k }))
