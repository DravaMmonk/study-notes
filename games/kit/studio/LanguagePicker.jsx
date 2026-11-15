import { useState } from 'react'
import { isLanguageCode } from '../engine/i18n.js'
import { tr } from '../shell/i18n.js'

export default function LanguagePicker({ label, value, options, onChange, onAdd }) {
  const [draft, setDraft] = useState(null)
  const [invalid, setInvalid] = useState(false)
  const submit = (event) => {
    event.preventDefault()
    let lang
    try {
      lang = Intl.getCanonicalLocales(draft.trim())[0]
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
    }
    if (!lang || !isLanguageCode(lang)) {
      setInvalid(true)
      return
    }
    onAdd(options.find((option) => option.value.toLowerCase() === lang.toLowerCase())?.value ?? lang)
    setDraft(null)
  }
  return (
    <div className="copy-language" role="columnheader">
      <label>
        <span>{label}</span>
        <select value={value} onChange={(event) => {
          if (event.target.value === '+') { setDraft(''); setInvalid(false) }
          else { onChange(event.target.value); setDraft(null) }
        }}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          <option value="+">{tr('新增语言…', 'Add language…')}</option>
        </select>
      </label>
      {draft !== null && (
        <form className="copy-add-language" onSubmit={submit}>
          <input autoFocus className="field-input" value={draft} placeholder="fr, ja, pt-BR" aria-label={tr('语言代码', 'Language code')}
            aria-invalid={invalid} onChange={(event) => { setDraft(event.target.value); setInvalid(false) }}
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || event.nativeEvent.isComposing) return
              event.preventDefault()
              setDraft(null)
            }} />
          <button type="submit" className="kit-btn is-label">{tr('添加', 'Add')}</button>
          <button type="button" className="kit-btn is-label" onClick={() => setDraft(null)}>{tr('取消', 'Cancel')}</button>
          {invalid && <small role="alert">{tr('请输入有效的语言代码', 'Enter a valid language code')}</small>}
        </form>
      )}
    </div>
  )
}
