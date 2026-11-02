// The game's own page as the studio's editor (games/DESIGN.md 6.7): while the studio edits the game it plays
// (../studio/play.jsx), the shell marks each piece of a level's screen that is a field of its content — the title, the
// brief, each hint, each intro page, each task's name, each test, the parts the level brings — and a click on it picks
// that field for the studio's side panel instead of playing. A small + where a list is (a hint, a page, a test, a
// task) adds an item there (EditMarks.jsx). Outside the studio nothing here shows: every mark is empty.
//
// A mark names a field the way the screen knows it, by where it shows: `at`, a path in the level ('hint[1]',
// 'intro[0].t', 'tests[2]'), and `scope`, whether it belongs to the level ('level': its title, its intro, its pass
// text) or to the task played ('task': its brief, hints, tests). The studio finds the field it is in the content: in
// the task when the level is a list of tasks and the task has it, else in the level (../studio/marks.js).
import { createContext, useContext } from 'react'
import { tr } from './i18n.js'

/** { level, task, picked: { at, scope, task } | null, pick(mark), add(mark) } while the studio edits, else null. */
export const EditContext = createContext(null)

export const useEdit = () => useContext(EditContext)

// The field picked, as the studio says it: a mark (its scope null when the level is no list of tasks, so either fits).
export const same = (edit, at, scope) => edit.picked?.at === at && (edit.picked.scope == null || (edit.picked.scope === scope && (scope === 'level' || edit.picked.task === edit.task)))

/**
 * The props that mark an element as field `at` (in `scope`): a click picks it (after `also`, what a click does anyway,
 * such as showing a test), and the one picked is drawn so. Nothing outside the studio.
 */
export function useMark() {
  const edit = useEdit()
  return (at, scope = 'task', also = null) => {
    if (!edit) return {}
    const pick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      also?.()
      edit.pick({ at, scope })
    }
    return {
      'data-edit': at,
      ...(same(edit, at, scope) && { 'data-picked': '' }),
      onClickCapture: pick,
      title: tr(`改 ${at}`, `Edit ${at}`),
    }
  }
}
