import { useState } from 'react'
import { Plus } from 'lucide-react'
import { L, tr } from '../i18n.js'
import { iconOf } from './icons.js'
import SettingField from './SettingField.jsx'

// A piece's own fields as the studio's part page draws them (games/DESIGN.md 6.7): each carries its path in the piece
// (data-pf); in edit mode a click picks it, and a + adds an item to a list. PieceSheet is a built piece's — beside the
// board it runs, its name and description, the descriptions it grows along the course, the tasks whose work runs
// inside (with each one's form and label), the engine resource its card runs instead, its settings; the rows it is
// made of (revisions, ports, settings) are a primitive's too (PartPreview.jsx). PresetSheet is a setting preset's.
//
//   def   the piece as parts.json writes it      edit   { picked (a path in the piece), pick(path), add(path) } or null

const at = (path) => JSON.stringify(path)

/** The props that mark an element as the piece's field at `path`, and a + that adds an item to the list at `path`. */
export const marker = (edit) => ({
  mark: (path) => ({ 'data-pf': at(path), ...(edit?.picked === at(path) ? { 'data-picked': '' } : {}) }),
  add: (path) => edit && <button type="button" className="pp-add" title={tr('加一项')} onClick={(e) => { e.stopPropagation(); edit.add(path) }}><Plus size={12} /></button>,
})

/** In edit mode, a click on a marked element picks its field (a + adds instead). */
export const picker = (edit) => (e) => {
  if (!edit || e.target.closest('.pp-add, .pp-adds')) return
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
const settingName = (s) => (s.label ? L(s.label) : s.key ?? s.use)

/** A primitive's ports, in and out. */
export const Ports = ({ def, edit }) => <Chips def={def} edit={edit} keys={['inputs', 'outputs']} name={portName} />
/** A piece's settings, every one (the faces draw only those a player can move). */
export const Settings = ({ def, edit }) => <Chips def={def} edit={edit} keys={['settings']} name={settingName} />

export default function PieceSheet({ def, edit }) {
  const { mark } = marker(edit)
  const Icon = iconOf(def.icon ?? 'CircuitBoard')
  return (
    <div className={`pp-sheet ${edit ? 'is-editing' : ''}`} onClickCapture={picker(edit)}>
      <header className="pp-sheet-head">
        {Icon && <i className="family-chip" data-family={def.family} {...mark([def.icon ? 'icon' : 'family'])}><Icon size={13} aria-hidden="true" /></i>}
        <h3 {...mark(['name'])}>{L(def.name)}</h3>
      </header>
      <p className="pf-desc" {...mark(['desc'])}>{L(def.desc)}</p>
      <Revisions def={def} edit={edit} />
      <ol className="pp-list">
        {def.inside.map((ref, k) => (
          <li key={k} className="pp-code" {...mark(['inside', k])}>
            <span className="pp-code-label">{ref.task}</span>
            <code>{[ref.form, ref.label].filter(Boolean).join(' · ')}</code>
          </li>
        ))}
      </ol>
      {def.card && <div className="pp-code" {...mark(['card'])}><span className="pp-code-label">card</span><code>{def.card}</code></div>}
      <Settings def={def} edit={edit} />
    </div>
  )
}

/** A setting preset of parts.json: the control it draws (moved as a player would), its label and its options. */
export function PresetSheet({ name, setting, game, edit }) {
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
          <SettingField setting={shown} value={value ?? setting.default ?? setting.options?.[0]?.value} allowed={null} roomy widgets={game.defined?.widgets} language={game.defined?.language} onChange={setValue} />
        </div>
        <Chips def={setting} edit={edit} keys={['options']} name={(o) => (o.label ? L(o.label) : String(o.value))} />
      </div>
    </div>
  )
}
