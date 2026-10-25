import { createElement } from 'react'
import { evaluate } from '../../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { FAMILIES, describe, familyOf, iconOf } from '../catalog.js'
import { L, keyOf, tr } from '../../../../shell/i18n.js'
import ValueView from '../views/ValueView.jsx'
import { formatNumber, kindOf } from '../views/views.js'
import { insertAfter } from './ops.js'
import Sheet from '../../../../shell/Sheet.jsx'

// Pieces the phone circuit screen shares: the chip that shows a setting and the sheet for adding a part (each
// previewed where it would go).

export function ParamChip({ param, value }) {
  if (param.kind === 'select') return <>{L(param.options.find(([v]) => v === value)?.[1]) ?? value}</>
  if (param.kind === 'kernel') {
    return (
      <span className="ph-mini-kernel" aria-label={param.learnable ? tr('训练出的 3×3 核', 'Trained 3×3 kernel') : tr('3×3 核', '3×3 kernel')}>
        {value.map((w, i) => <i key={i} style={{ '--w': Math.max(-1, Math.min(1, w)) }} />)}
      </span>
    )
  }
  return <><i>{L(param.label)}</i>{formatNumber(value ?? 0)}</>
}

// Every part, grouped by family, each previewed reading `previewFrom` on the current test.
export function AddSheet({ level, graph, previewFrom, test, title, theme, onAdd, onClose }) {
  const groups = Object.entries(FAMILIES).map(([key, family]) => [family, level.palette.filter((type) => familyOf(type) === key)]).filter(([, types]) => types.length)
  const previewOf = (type) => {
    const { graph: trial, id } = insertAfter(graph, previewFrom, type, null)
    const { values, errors } = evaluate(trial, test.inputs)
    return errors.get(id) ? null : values.get(id)
  }
  return (
    <Sheet title={title} onClose={onClose}>
      {groups.map(([family, types]) => (
        <section key={keyOf(family.label)} className="ph-group">
          <h3>{L(family.label)}</h3>
          <div className="ph-parts">
            {types.map((type) => {
              const value = previewOf(type)
              return (
                <button key={type} className="ph-part" data-family={familyOf(type)} onClick={() => onAdd(type)}>
                  <span className="ph-part-preview">
                    {value ? <ValueView img={value} size={kindOf(value) === 'signal' ? 92 : 64} theme={theme} /> : <span className="ph-part-need">{inputsOf(type).length > 1 ? tr(`${inputsOf(type).length} 个输入`, `${inputsOf(type).length} inputs`) : tr('加上看看', 'Add to see')}</span>}
                  </span>
                  <span className="ph-part-text">
                    <b><i className="family-chip">{createElement(iconOf(type), { size: 12, strokeWidth: 1.8 })}</i>{L(NODE_TYPES[type].label)}{level.fresh?.includes(type) && <em className="pb-new">{tr('新', 'new')}</em>}</b>
                    <small>{describe(type)}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </Sheet>
  )
}
