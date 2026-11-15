import { SlidersHorizontal } from 'lucide-react'
import { settingControlOptions } from '../engine/parts/schema.js'
import { L, tr } from '../shell/i18n.js'
import { freeName } from './PartsList.jsx'
import { AddMenu } from './Picker.jsx'

export default function SettingsList({ file, vocabulary, selected, onSelect, onEdit }) {
  const settings = Object.entries(file?.settings ?? {})
  const controls = settingControlOptions(vocabulary)
  const add = (control) => {
    const setting = freeName(settings.map(([id]) => id), 'setting')
    onEdit({ op: 'setting.add', setting, data: controls.find(({ value }) => value === control).data })
    onSelect(setting)
  }
  return (
    <nav className="parts-list" aria-label={tr('设置', 'Settings')}>
      <div className="sidebar-add">
        <AddMenu options={controls} onPick={add} />
      </div>
      {settings.map(([id, setting]) => (
        <button key={id} type="button" className={`parts-row ${selected === id ? 'is-on' : ''}`}
          aria-current={selected === id ? 'true' : undefined} onClick={() => onSelect(id)} title={L(setting.about ?? '')}>
          <i className="family-chip"><SlidersHorizontal size={12} aria-hidden="true" /></i>
          <span>{L(setting.label) || id}</span>
          {setting.label && <code>{id}</code>}
        </button>
      ))}
    </nav>
  )
}
