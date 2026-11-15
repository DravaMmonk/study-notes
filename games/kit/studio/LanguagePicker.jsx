import { useId, useState } from 'react'
import { isLanguageCode } from '../engine/i18n.js'


export default function LanguagePicker({ label, value, options, onChange }) {
  const id = useId()
  const [draft, setDraft] = useState(null)
  const commit = () => {
    const lang = draft?.trim()
    if (lang && isLanguageCode(lang)) onChange(lang)
    setDraft(null)
  }
  return (
    <label className="i18n-language">
      {label}
      <input className="field-input i18n-lang" list={id} value={draft ?? value} onBlur={commit}
        onChange={(event) => {
          const lang = event.target.value
          if (options.includes(lang)) {
            onChange(lang)
            setDraft(null)
          } else setDraft(lang)
        }}
        onKeyDown={(event) => { if (event.key === 'Enter') commit() }} />
      <datalist id={id}>{options.map((lang) => <option key={lang} value={lang} />)}</datalist>
    </label>
  )
}
