import { useState } from 'react'
import { ArrowUpRight, Plus } from 'lucide-react'
import { L, tr } from '../i18n.js'
import { iconOf } from './icons.js'
import SettingField from './SettingField.jsx'
import { defaultOf } from '../../engine/parts/define.js'

// A piece's own fields as the studio's piece page draws them (games/DESIGN.md 6.7): each carries its path in the piece
// (data-pf); in edit mode a click picks it (picker, on the page around them), and a + adds an item to a list.
// PieceSheet is a built piece's — beside the board it runs, its name and description, the descriptions it grows along
// the course, the tasks whose work runs inside (each form an upgrade chain of tasks, a step's label on it), the engine
// resource its card runs instead, its settings; the rows it is made of (revisions, ports, settings) are a primitive's
// too (../../circuit/preview.jsx). SettingSheet previews a setting definition.
//
//   def   the piece as pieces.json writes it      edit   { picked (a path in the piece), pick(path), add(path) } or null

const at = (path) => JSON.stringify(path)

/** The props that mark an element as the piece's field at `path`, and a + that adds an item to the list at `path`. */
export const marker = (edit) => ({
  mark: (path) => ({ 'data-pf': at(path), ...(edit?.picked === at(path) ? { 'data-picked': '' } : {}) }),
  add: (path) => edit && <button type="button" className="pp-add" title={tr('加一项')} onClick={(e) => { e.stopPropagation(); edit.add(path) }}><Plus size={12} /></button>,
})

/** In edit mode, a click on a marked element picks its field (a + adds instead). */
export const picker = (edit) => (e) => {
  if (!edit || e.target.closest('.pp-add, .pp-adds, .pp-go')) return
  const hit = e.target.closest('[data-pf]')
  if (!hit) return
  e.preventDefault()
  e.stopPropagation()
  edit.pick(JSON.parse(hit.dataset.pf))
}

/** The descriptions a piece grows along the course: from level `at` on (→), or once level `by` is passed (✓). */
export function Revisions({ def, edit }) {
  const { mark, add } = marker(edit)
  if (!def.revisions?.length && !edit) return null
  return (
    <ol className="pp-list">
      {(def.revisions ?? []).map((r, k) => (
        <li key={k} className="pp-code" {...mark(['revisions', k])}>
          <span className="pp-code-label">{r.at ? `${r.at} →` : r.by ? `${r.by} ✓` : ''}</span>
          <span>{L(r.desc)}</span>
        </li>
      ))}
      {edit && <li className="pp-list-add">{add(['revisions'])}</li>}
    </ol>
  )
}

/** A row of chips, one a item of the list `key` of the piece, named by `name`; a + adds one. */
export function Chips({ def, edit, keys, name }) {
  const { mark, add } = marker(edit)
  const rows = keys.filter((key) => def[key]?.length || edit)
  if (!rows.length) return null
  return rows.map((key) => (
    <ol key={key} className="pp-list is-row">
      <li className="pp-code-label">{key}</li>
      {(def[key] ?? []).map((item, k) => <li key={k} className="pp-chip" {...mark([key, k])}>{name(item)}</li>)}
      {edit && <li className="pp-list-add">{add([key])}</li>}
    </ol>
  ))
}

const portName = (p) => (p.label ? L(p.label) : p.name)
const settingName = (s) => (s.label ? L(s.label) : s.key)

/** A primitive's ports, in and out. */
export const Ports = ({ def, edit }) => <Chips def={def} edit={edit} keys={['inputs', 'outputs']} name={portName} />
/** A piece's settings, every one (the faces draw only those a player can move). */
export const Settings = ({ def, edit }) => <Chips def={def} edit={edit} keys={['settings']} name={settingName} />

/**
 * What runs inside a built piece: its references, one row a form (or one row when none is written), each an upgrade
 * chain — the work of each step's task replaces the one before. A step picks its reference; its arrow goes to the task;
 * a + adds a reference (its task picked in the side panel). `label(task)` is how the map numbers a task.
 */
export function Chains({ def, edit, onTask, label = (task) => task }) {
  const { mark, add } = marker(edit)
  const forms = new Map()
  for (const [k, ref] of (def.inside ?? []).entries()) forms.set(ref.form ?? '', [...(forms.get(ref.form ?? '') ?? []), [ref, k]])
  return (
    <div className="pp-chains">
      {[...forms].map(([form, steps]) => (
        <ol key={form} className="pp-chain">
          {form && <li className="pp-code-label">{form}</li>}
          {steps.map(([ref, k], n) => [
            n > 0 && <li key={`${k}>`} className="pp-arrow" aria-hidden="true">→</li>,
            <li key={k} className="pp-step" {...mark(['inside', k])}>
              <span title={ref.task}>{label(ref.task)}</span>
              {ref.label && <small>{ref.label}</small>}
              {onTask && <button type="button" className="pp-go" title={tr('打开这个任务')} onClick={(e) => { e.stopPropagation(); onTask(ref.task) }}><ArrowUpRight size={12} /></button>}
            </li>,
          ])}
        </ol>
      ))}
      {edit && <div className="pp-list-add">{add(['inside'])}</div>}
    </div>
  )
}

/** A piece's icon and name over what it does: the faces every piece has. */
export function Named({ def, edit }) {
  const { mark } = marker(edit)
  const Icon = iconOf(def.icon ?? 'CircuitBoard')
  return (
    <>
      <header className="pp-sheet-head">
        {Icon && <i className="family-chip" data-family={def.family} {...mark([def.icon ? 'icon' : 'family'])}><Icon size={13} aria-hidden="true" /></i>}
        <h3 {...mark(['name'])}>{L(def.name)}</h3>
      </header>
      <p className="pf-desc" {...mark(['desc'])}>{L(def.desc)}</p>
    </>
  )
}

export default function PieceSheet({ def, edit, onTask, label }) {
  const { mark } = marker(edit)
  return (
    <div className={`pp-sheet ${edit ? 'is-editing' : ''}`}>
      <Named def={def} edit={edit} />
      <Revisions def={def} edit={edit} />
      <Chains def={def} edit={edit} onTask={onTask} label={label} />
      {def.card && <div className="pp-code" {...mark(['card'])}><span className="pp-code-label">card</span><code>{def.card}</code></div>}
      <Settings def={def} edit={edit} />
    </div>
  )
}

/** A setting definition of pieces.json: the control it draws (moved as a player would), its label and its options. */
export function SettingSheet({ name, setting, game, edit }) {
  const { mark } = marker(edit)
  const [value, setValue] = useState(undefined)
  if (!setting) return null
  const { label: _, ...rest } = setting
  const shown = { key: name, ...rest }
  return (
    <div className="pp-built">
      <div className={`pp-sheet ${edit ? 'is-editing' : ''}`} onClickCapture={picker(edit)}>
        <h3 {...mark(['label'])}>{setting.label ? L(setting.label) : name}</h3>
        <div {...mark(['control'])}>
          <SettingField setting={shown} value={value ?? defaultOf(setting)} allowed={null} roomy widgets={game.defined?.widgets} language={game.defined?.language} onChange={setValue} />
        </div>
        <Chips def={setting} edit={edit} keys={['options']} name={(o) => (o.label ? L(o.label) : String(o.value))} />
      </div>
    </div>
  )
}
