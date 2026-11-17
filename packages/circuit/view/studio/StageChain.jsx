import { L, tr, summaryOf, isText, shownName } from 'kernel/view'
// A part's stages under its page (games/DESIGN.md 6.8, 6.7): the part and its stages in order, one picked to
// preview on the page above and to open on the right; what the stage picked changes; and every setting there — what
// the operation declares, what the part narrows, what holds — the ones the stage changes marked. A new stage is added
// at the end, changing nothing yet.
import { Plus } from 'lucide-react'

import { newStageId, stageChain } from '../../core/studio-stages.js'

/** A setting in one line: its control, its range or options, its default, whether it is fixed. */
const settingSum = (setting) => {
  if (!setting) return '—'
  const parts = [setting.control]
  if (setting.min !== undefined || setting.max !== undefined) parts.push(`${setting.min ?? ''}…${setting.max ?? ''}`)
  if (setting.options) parts.push(setting.options.map((option) => option.value).join('|'))
  if (setting.default !== undefined) parts.push(`= ${setting.default}`)
  if (setting.fixed) parts.push(tr('固定', 'fixed'))
  return parts.filter(Boolean).join(' ')
}

/**
 * `part` the full id; `raw` its file; `operations` the kernel's declarations; `stage` the one previewed (null: the
 * part); `onStage(id, path)` picks one (its path in parts/<name>.json); `onAdd(stages)` writes the stages.
 */
export default function StageChain({ part, raw, operations, namespace, stage, pending, editable, onStage, onAdd }) {
  if (!raw) return null
  const chain = stageChain(part, raw, operations)
  const at = chain.find((step) => step.id === stage) ?? chain[0]
  const add = () => {
    const id = newStageId(part, chain.map((step) => step.id))
    onAdd([...(raw.stages ?? []), { id }])
  }
  return (
    <section className="stage-chain" aria-label={tr('阶段', 'Stages')}>
      <div className="stage-steps" role="tablist">
        {chain.map((step) => (
          <button key={step.id} type="button" role="tab" aria-selected={step.id === at.id} className={`stage-step ${step.id === at.id ? 'is-on' : ''}`}
            onClick={() => onStage(step.index ? step.id : null, step.index ? ['stages', step.index - 1] : [])}>
            <small>{step.index}</small><code>{shownName(namespace, step.id)}</code>
          </button>
        ))}
        {editable && <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('新的阶段', 'New stage')} aria-label={tr('新的阶段', 'New stage')} onClick={add}><Plus size={13} aria-hidden="true" /></button>}
      </div>
      {at.index > 0 && (
        <ul className="stage-changes">
          {at.changes.length ? at.changes.map((change) => (
            <li key={change.path.join('.')}><code>{change.path.join('.')}</code><span>{(isText(change.value) ? L(change.value) : summaryOf(change.value, 80)) || '{}'}</span></li>
          )) : <li className="is-empty">—</li>}
        </ul>
      )}
      {at.settings.length > 0 && (
        <table className="stage-settings">
          <thead><tr><th>{tr('设置', 'Setting')}</th><th>{tr('运算声明', 'Declared')}</th><th>{tr('收窄', 'Narrowed')}</th><th>{tr('生效', 'In effect')}</th></tr></thead>
          <tbody>
            {at.settings.map((row) => (
              <tr key={row.key} className={row.changed ? 'is-changed' : ''}>
                <th><code>{row.key}</code></th>
                <td>{row.declared ? settingSum(row.declared) : tr('元件里写全', 'In the part')}</td>
                <td>{row.narrowed ? summaryOf(row.narrowed, 60) : '—'}</td>
                <td>{settingSum(row.effective)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
