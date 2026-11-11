// The parts of a game in the studio (games/DESIGN.md 6.7, 6.8): every part its parts.json defines — icon, name, type —
// and every setting preset, a row each, in the file's order; findings on a part mark its row. A click opens it (its
// faces on the page, its fields in the rows); + adds a part, blank and ready to be filled in, and opens it. A part is
// copied, renamed and removed from the part's own page (PartEditor in Editor.jsx).
import { Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { iconOf } from '../shell/parts/icons.js'

/** A new part to fill in: one input, one output computed as that input, its name its type. */
export const blankPart = (vocabulary) => ({
  name: { zh: '新元件' },
  desc: { zh: '' },
  icon: 'Box',
  family: Object.keys(vocabulary?.kinds.family ?? {})[0] ?? 'value',
  inputs: [{ name: 'a' }],
  compute: 'a',
})

/** A name for a new part or preset not taken yet. */
export const freeName = (taken, stem) => {
  let k = 1
  while (taken.includes(`${stem}${k}`)) k += 1
  return `${stem}${k}`
}

export default function PartsList({ content, vocabulary, at, found, onSelect, onEdit }) {
  const file = content.partDefs ?? { parts: {} }
  const parts = Object.entries(file.parts ?? {})
  const presets = Object.entries(file.presets ?? {})
  const add = () => {
    const type = freeName(parts.map(([t]) => t), 'part')
    onEdit({ op: 'part.add', part: type, data: blankPart(vocabulary) })
    onSelect({ part: type })
  }
  const addPreset = () => {
    const name = freeName(presets.map(([n]) => n), 'setting')
    onEdit({ op: 'parts.set', path: ['presets', name], value: { control: 'select', options: [{ value: 'a' }, { value: 'b' }] } })
    onSelect({ preset: name })
  }
  return (
    <nav className="parts-list" aria-label={tr('元件', 'Parts')}>
      {parts.map(([type, def]) => {
        const Icon = iconOf(def.icon)
        const n = found(type)
        return (
          <button key={type} type="button" className={`parts-row ${at?.part === type ? 'is-on' : ''}`} onClick={() => onSelect({ part: type })} title={L(def.desc ?? '')}>
            <i className="family-chip" data-family={def.family}>{Icon && <Icon size={12} aria-hidden="true" />}</i>
            <span>{L(def.name)}</span>
            <code>{type}</code>
            {n > 0 && <b className="row-found">{n}</b>}
          </button>
        )
      })}
      <button type="button" className="parts-add" onClick={add} title={tr('加一个元件', 'Add a part')}><Plus size={13} aria-hidden="true" /></button>
      <div className="parts-presets">
        {presets.map(([name, s]) => (
          <button key={name} type="button" className={`parts-row is-preset ${at?.preset === name ? 'is-on' : ''}`} onClick={() => onSelect({ preset: name })}>
            <span>{s.label ? L(s.label) : name}</span>
            <code>{name}</code>
          </button>
        ))}
        <button type="button" className="parts-add" onClick={addPreset} title={tr('加一份设置预设', 'Add a setting preset')}><Plus size={13} aria-hidden="true" /></button>
      </div>
    </nav>
  )
}
