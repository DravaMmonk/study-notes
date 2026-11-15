// The parts of a game in the studio (games/DESIGN.md 6.7, 6.8): every piece its parts.json defines, primitive or built
// (inside) — icon, name, type — grouped by tray in the order the course gives them (pieces.js), then every setting
// preset, a row each; findings on a part mark its row. A click opens it (its
// faces on the page, its fields in the rows). The two + add a piece and open it: a primitive, blank and ready to be
// filled in; a built piece, made from a task picked (grouped by level, in course order), the work of which runs
// inside it — its ports are that task's board's. A part is copied, renamed and removed from the part's own page
// (PartEditor in Editor.jsx).
import { useRef, useState } from 'react'
import { Box, CircuitBoard, Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { iconOf } from '../shell/parts/icons.js'
import { OptionList, useDismiss } from './Picker.jsx'
import { taskOptionsOf } from './form.js'
import { pieceGroups } from './pieces.js'

/** A new part to fill in: one input, one output computed as that input, its name its type. */
export const blankPart = (vocabulary) => ({
  name: { zh: '新元件' },
  desc: { zh: '' },
  icon: 'Box',
  family: Object.keys(vocabulary?.kinds.family ?? {})[0] ?? 'value',
  inputs: [{ name: 'a' }],
  compute: 'a',
})

/** A new built piece: the work of task `task` runs inside it; named after what the task is called. */
export const builtPart = (task, name) => ({ name: { zh: name || task }, desc: { zh: '' }, inside: [{ task }] })

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
  const [picking, setPicking] = useState(false)
  const box = useRef(null)
  useDismiss(box, picking, () => setPicking(false))
  const tasks = levelOptions ? taskOptionsOf(levelOptions) : []
  const add = () => {
    const type = freeName(parts.map(([t]) => t), 'part')
    onEdit({ op: 'part.add', part: type, data: blankPart(vocabulary) })
    onSelect({ part: type })
  }
  const build = (task) => {
    setPicking(false)
    const picked = tasks.find((o) => o.value === task)
    const type = freeName(parts.map(([t]) => t), 'piece')
    onEdit({ op: 'part.add', part: type, data: builtPart(task, picked?.title && L(picked.title)) })
    onSelect({ part: type })
  }
  const addPreset = () => {
    const name = freeName(presets.map(([n]) => n), 'setting')
    onEdit({ op: 'parts.set', path: ['presets', name], value: { control: 'select', options: [{ value: 'a' }, { value: 'b' }] } })
    onSelect({ preset: name })
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
    <nav className="parts-list" aria-label={tr('元件', 'Parts')}>
      {groups.map((g) => (
        <section key={g.tray ?? ''} className="parts-group">
          {groups.length > 1 && (g.tray ? <span className="parts-tray">{g.tray}</span> : <hr className="parts-rule" />)}
          {g.types.map(row)}
        </section>
      ))}
      <div className="parts-adds" ref={box}>
        <button type="button" className="parts-add" onClick={add} title={tr('加一个基础件', 'Add a primitive piece')}><Plus size={12} aria-hidden="true" /><Box size={13} aria-hidden="true" /></button>
        <button type="button" className="parts-add" onClick={() => setPicking(!picking)} aria-expanded={picking} title={tr('用一个任务的作品搭一个件', 'Build a piece from a task’s work')}><Plus size={12} aria-hidden="true" /><CircuitBoard size={13} aria-hidden="true" /></button>
        {picking && <div className="parts-pick"><OptionList options={tasks} value={null} onPick={build} onClose={() => setPicking(false)} /></div>}
      </div>
      <div className="parts-presets">
        {presets.map(([name, s]) => (
          <button key={name} type="button" className={`parts-row is-preset ${at?.preset === name ? 'is-on' : ''}`} onClick={() => onSelect({ preset: name })}>
            <span>{s.label ? L(s.label) : name}</span>
            <code>{name}</code>
          </button>
        ))}
        <button type="button" className="parts-add" onClick={addPreset} title={tr('加一份设置预设')}><Plus size={13} aria-hidden="true" /></button>
      </div>
    </nav>
  )
}
