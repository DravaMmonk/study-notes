// The studio's + and pick buttons on the game's page (edit.js): nothing outside the studio.
import { Pencil, Plus } from 'lucide-react'
import { tr } from './i18n.js'
import { same, useEdit } from './edit.js'

/** A + that adds an item to the list `at` (in `scope`), after item `index` when given; nothing outside the studio. */
export function AddMark({ at, scope = 'task', index = null, label, className = '' }) {
  const edit = useEdit()
  if (!edit) return null
  return (
    <button type="button" className={`edit-add ${className}`} onClick={(e) => { e.stopPropagation(); edit.add({ at, scope, index }) }} title={tr(`加${label.zh}`, `Add ${label.en}`)}>
      <Plus size={12} aria-hidden="true" />{tr(label.zh, label.en)}
    </button>
  )
}

/** A small button that picks field `at` (in `scope`) where the screen shows it only in part (the parts a level brings
 *  are some of those in its tray); nothing outside the studio. */
export function PickMark({ at, scope = 'task', label, className = '' }) {
  const edit = useEdit()
  if (!edit) return null
  return (
    <button type="button" className={`edit-add is-pick ${className}`} {...(same(edit, at, scope) && { 'data-picked': '' })} onClick={(e) => { e.stopPropagation(); edit.pick({ at, scope }) }}>
      <Pencil size={11} aria-hidden="true" />{tr(label.zh, label.en)}
    </button>
  )
}
