import { useState } from 'react'
import { tr } from '../shell/i18n.js'

export default function SourceEditor({ source, onApply }) {
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const changed = draft !== null && draft.text !== source
  const apply = () => {
    if (draft.base !== source) {
      setError(tr('配置已更新。请重置源码后再编辑。', 'The configuration changed. Reset the source before editing again.'))
      return
    }
    try {
      onApply(JSON.parse(draft.text))
      setDraft(null)
      setError('')
    } catch (error) {
      setError(error instanceof SyntaxError ? tr('JSON 格式无效。', 'Invalid JSON.') : error.message)
    }
  }
  return (
    <div className="insp-source-editor">
      <textarea className="field-area is-code" value={draft?.text ?? source} rows={Math.min(28, Math.max(6, source.split('\n').length + 1))}
        aria-label={tr('JSON 源码', 'JSON source')} spellCheck={false}
        onChange={(event) => { setDraft({ base: draft?.base ?? source, text: event.target.value }); setError('') }} />
      <div className="insp-source-actions">
        <button type="button" className="kit-btn is-label" disabled={draft === null} onClick={() => { setDraft(null); setError('') }}>{tr('重置', 'Reset')}</button>
        <button type="button" className="kit-btn is-label is-solid" onClick={apply} disabled={!changed}>{tr('加入变更集', 'Add to changeset')}</button>
      </div>
      {error && <p className="field-bad" role="alert">{error}</p>}
    </div>
  )
}
