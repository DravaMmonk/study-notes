import { Plus } from 'lucide-react'
import { L, tr } from '../i18n.js'
import { iconOf } from './icons.js'
import { settingsOf } from '../../engine/pieces.js'

// A piece's own fields as the studio's piece page draws them (games/DESIGN.md 6.7): each carries its path in the piece
// (data-pf); in edit mode a click picks it (picker, on the page around them), and a + adds an item to a list.
// PieceSheet shows the piece's independent implementations and settings.
//
//   def   the piece as pieces/<name>.json writes it      edit   { picked (a path in the piece), pick(path), add(path) } or null

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

/** A row of chips, one a item of the list `key` of the piece, named by `name`; a + adds one. */
export function Chips({ def, edit, keys, name }) {
  const { mark, add } = marker(edit)
  const rows = keys.filter((key) => Object.keys(def[key] ?? {}).length || edit)
  if (!rows.length) return null
  return rows.map((key) => (
    <ol key={key} className="pp-list is-row">
      <li className="pp-code-label">{key}</li>
      {(Array.isArray(def[key]) ? def[key].map((item, k) => [k, item]) : Object.entries(def[key] ?? {})).map(([k, item]) => <li key={k} className="pp-chip" {...mark([key, k])}>{name(item)}</li>)}
      {edit && <li className="pp-list-add">{add([key])}</li>}
    </ol>
  ))
}

const portName = (p) => (p.label ? L(p.label) : p.name)
const settingName = (s) => (s.label ? L(s.label) : s.key)

/** A primitive's ports, in and out. */
export const Ports = ({ def, edit }) => <Chips def={def} edit={edit} keys={['inputs', 'outputs']} name={portName} />
/** A piece's settings, every one (the faces draw only those a player can move). */
export const Settings = ({ def, edit }) => <Chips def={{ settings: Object.fromEntries(settingsOf(def).map((setting) => [setting.key, setting])) }} edit={edit} keys={['settings']} name={settingName} />

/** A built piece's named implementations. */
export function Implementations({ def, edit }) {
  return <Chips def={def} edit={edit} keys={['inside']} name={(ref) => (
    <><code>{ref.id}</code>{ref.form && <span>{ref.form}</span>}{ref.label && <small>{ref.label}</small>}</>
  )} />
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

export default function PieceSheet({ def, edit }) {
  const { mark } = marker(edit)
  return (
    <div className={`pp-sheet ${edit ? 'is-editing' : ''}`}>
      <Named def={def} edit={edit} />
      <Implementations def={def} edit={edit} />
      {def.card && <div className="pp-code" {...mark(['card'])}><span className="pp-code-label">card</span><code>{def.card}</code></div>}
      <Settings def={def} edit={edit} />
    </div>
  )
}
