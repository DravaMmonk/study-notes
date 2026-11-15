import { useLayoutEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { contentFileFor } from '../engine/content.js'
import { showPath } from '../engine/ops/edit.js'

/** Identify a saved location by its file selection and field path. */
export const inspectorTabKey = (at, path) => JSON.stringify([at, path])

function describe({ at, path }, content) {
  const owner = at.level ?? at.part ?? at.setting
    ?? (at.era !== undefined ? L(content.eras?.[at.era]?.title) || content.eras?.[at.era]?.id : null)
  const file = at.level ? `levels/${at.level}.json` : at.part || at.setting ? 'pieces.json' : at.glossary ? 'glossary.json' : contentFileFor(path)
  const nestedRoot = at.part || at.setting || at.era !== undefined
  const ancestor = nestedRoot && path.length < 2
  const relative = nestedRoot && !ancestor ? path.slice(2) : file === 'trays.json' ? path.slice(1) : path
  const label = [ancestor ? file : owner ?? file, showPath(relative)].filter(Boolean).join(' · ')
  return { label, title: [file, showPath(path)].filter(Boolean).join(' › ') }
}

export default function InspectorTabs({ tabs, active, content, onOpen, onClose }) {
  const selected = useRef(null)
  useLayoutEffect(() => {
    const item = selected.current
    if (!item) return
    const row = item.parentElement
    const left = item.offsetLeft
    const right = left + item.offsetWidth
    if (left < row.scrollLeft) row.scrollLeft = left
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth
  }, [active, tabs.length])
  if (!tabs.length) return null
  return (
    <nav className="insp-tabs" aria-label={tr('配置标签页', 'Configuration tabs')}>
      {tabs.map((tab) => {
        const key = inspectorTabKey(tab.at, tab.path)
        const current = key === active
        const { label, title } = describe(tab, content)
        return (
          <div className={`insp-tab ${current ? 'is-on' : ''}`} key={key} ref={current ? selected : null}>
            <button type="button" className="insp-tab-label" onClick={() => onOpen(tab)} aria-current={current ? 'true' : undefined} title={title}>{label}</button>
            <button type="button" className="insp-tab-close" onClick={() => onClose(tab, current)}
              aria-label={tr(`关闭标签页 ${label}`, `Close tab ${label}`)}><X size={12} aria-hidden="true" /></button>
          </div>
        )
      })}
    </nav>
  )
}
