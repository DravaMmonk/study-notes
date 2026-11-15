// The parts of a game in the studio (games/DESIGN.md 6.7, 6.8): every piece its pieces.json defines, primitive or built
// (inside) — icon, name, type — grouped by tray in the order the course gives them (pieces.js), then every setting
// preset, a row each; findings on a part mark its row. A click opens it (its
// faces on the page, its fields in the inspector). A single add menu offers the available editors, building from
// a task, and setting presets.
import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { iconOf } from '../shell/parts/icons.js'
import { OptionList, useDismiss } from './Picker.jsx'
import { taskOptionsOf } from './form.js'
import { pieceGroups } from './pieces.js'
import { BLANKS } from '../engine/parts/schema.js'

/** A new built piece: the work of task `task` runs inside it; named after what the task is called. */
export const builtPart = (task, name) => ({ name: { en: name || task }, desc: { en: '' }, inside: [{ task }] })

/** A name for a new part or preset not taken yet. */
export const freeName = (taken, stem) => {
  let k = 1
  while (taken.includes(`${stem}${k}`)) k += 1
  return `${stem}${k}`
}

export default function PartsList({ content, vocabulary, levelOptions, order = [], earned = new Map(), at, found, onSelect, onEdit }) {
  const file = content.partDefs ?? { parts: {} }
  const parts = Object.entries(file.parts ?? {})
  const presets = Object.entries(file.presets ?? {})
  const [adding, setAdding] = useState(null)
  const box = useRef(null)
  useDismiss(box, adding !== null, () => setAdding(null))
  const tasks = levelOptions ? taskOptionsOf(levelOptions) : []
  const blanks = Object.fromEntries(Object.entries(BLANKS).flatMap(([editor, blank]) => {
    const data = blank(vocabulary)
    return data ? [[editor, data]] : []
  }))
  const choices = [
    ...Object.keys(blanks).map((editor) => ({ value: editor, label: editor === 'strip' ? tr('词序条块', 'Strip piece') : tr('电路件', 'Circuit piece') })),
    ...(tasks.length ? [{ value: 'task', label: tr('用任务作品搭件', 'Build from a task') }] : []),
    { value: 'preset', label: tr('设置预设', 'Setting preset') },
  ]
  const add = (data) => {
    const type = freeName(parts.map(([t]) => t), 'part')
    onEdit({ op: 'piece.add', piece: type, data })
    onSelect({ part: type })
  }
  const build = (task) => {
    setAdding(null)
    const picked = tasks.find((o) => o.value === task)
    const type = freeName(parts.map(([t]) => t), 'piece')
    onEdit({ op: 'piece.add', piece: type, data: builtPart(task, picked?.title && L(picked.title)) })
    onSelect({ part: type })
  }
  const addPreset = () => {
    const name = freeName(presets.map(([n]) => n), 'setting')
    onEdit({ op: 'pieces.set', path: ['presets', name], value: { control: 'select', options: [{ value: 'a' }, { value: 'b' }] } })
    onSelect({ preset: name })
  }
  const pickType = (type) => {
    if (type === 'task') {
      setAdding('task')
      return
    }
    setAdding(null)
    if (type === 'preset') addPreset()
    else add(blanks[type])
  }
  const groups = pieceGroups(parts.map(([t]) => t), { trays: content.trays, at: (type) => earned.get(type) ?? null, order, primitives: content.primitives ?? [] })
  const row = (type) => {
    const def = file.parts[type]
    const Icon = iconOf(def.icon ?? (def.inside ? 'CircuitBoard' : null))
    const n = found(type)
    return (
      <button key={type} type="button" className={`parts-row ${at?.part === type ? 'is-on' : ''}`} onClick={() => onSelect({ part: type })} title={L(def.desc ?? '')}>
        <i className="family-chip" data-family={def.family}>{Icon && <Icon size={12} aria-hidden="true" />}</i>
        <span>{L(def.name)}</span>
        <code>{type}</code>
        {n > 0 && <b className="row-found">{n}</b>}
      </button>
    )
  }
  return (
    <nav className="parts-list" aria-label={tr('件', 'Pieces')}>
      {groups.map((g) => (
        <section key={g.tray ?? ''} className="parts-group">
          {groups.length > 1 && (g.tray ? <span className="parts-tray">{g.tray}</span> : <hr className="parts-rule" />)}
          {g.types.map(row)}
        </section>
      ))}
      {presets.length > 0 && (
        <div className="parts-presets">
          {presets.map(([name, s]) => (
            <button key={name} type="button" className={`parts-row is-preset ${at?.preset === name ? 'is-on' : ''}`} onClick={() => onSelect({ preset: name })}>
              <span>{s.label ? L(s.label) : name}</span>
              <code>{name}</code>
            </button>
          ))}
        </div>
      )}
      <div className="parts-adds" ref={box}>
        <button type="button" className="parts-add" onClick={() => setAdding(adding ? null : 'type')} aria-expanded={adding !== null} aria-haspopup="dialog">
          <Plus size={13} aria-hidden="true" />{tr('新增', 'Add')}
        </button>
        {adding && <OptionList key={adding} options={adding === 'task' ? tasks : choices} value={null}
          onPick={adding === 'task' ? build : pickType} onClose={() => setAdding(null)} />}
      </div>
    </nav>
  )
}
