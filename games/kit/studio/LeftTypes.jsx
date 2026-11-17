// Which object types the build workspace's left column lists (games/MODULES.md 5.4): by default what the packages'
// `studio-left` tags say; each author can tick their own here, kept in their browser and never written to a package.
import { useRef, useState } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { usePickerPopup } from './Picker.jsx'

/** An object type's name as [zh, en] for tr(): its declared text, or its pair. */
export const typeName = (info) => (Array.isArray(info?.name) ? info.name : info?.name ? [L(info.name), L(info.name)] : [info?.type ?? '', info?.type ?? ''])

/**
 * The switcher's last button: `types` every listable type ({ type, name, icon? }), `shown` those listed, `chosen`
 * whether the author picked them (else the packages' default); `onChoose(types | null)` keeps a choice or drops it.
 */
export default function LeftTypes({ types, shown, chosen, onChoose }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef(null)
  return (
    <>
      <button ref={anchor} type="button" className={`side-tabs-types ${chosen ? 'is-chosen' : ''}`} aria-haspopup="dialog" aria-expanded={open}
        aria-label={tr('左栏列出的类型', 'Types listed here')} title={tr('左栏列出的类型', 'Types listed here')} onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={13} aria-hidden="true" />
      </button>
      {open && <TypeChoice types={types} shown={shown} chosen={chosen} onChoose={onChoose} anchor={anchor} onClose={() => setOpen(false)} />}
    </>
  )
}

function TypeChoice({ types, shown, chosen, onChoose, anchor, onClose }) {
  const overlay = usePickerPopup(anchor, onClose, { fullWidth: false })
  // The listed ones first, in their order, then the rest in the content's.
  const ordered = [...shown.map((type) => types.find((t) => t.type === type)).filter(Boolean), ...types.filter(({ type }) => !shown.includes(type))]
  const toggle = (type) => onChoose(shown.includes(type) ? shown.filter((t) => t !== type) : [...shown, type])
  return (
    <div ref={overlay} className="pick-pop is-floating left-types" role="dialog" aria-label={tr('左栏列出的类型', 'Types listed here')}>
      <ul className="pick-list">
        {ordered.map((info) => {
          const on = shown.includes(info.type)
          return (
            <li key={info.type}>
              <button type="button" className={`left-types-item ${on ? 'is-on' : ''}`} role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(info.type)}>
                <span className="left-types-check">{on && <Check size={12} aria-hidden="true" />}</span>
                <span>{tr(...typeName(info))}</span>
                <code>{info.type}</code>
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className="left-types-reset" disabled={!chosen} onClick={() => onChoose(null)}>{tr('用包的默认', 'Use the packages’ default')}</button>
    </div>
  )
}
