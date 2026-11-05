import { useEffect, useRef, useState } from 'react'

/** A value typed into a control, kept while the control has focus, so a preview coming back never undoes typing. */
export function useDraft(value) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  const text = JSON.stringify(value)
  useEffect(() => {
    if (!focused.current) setDraft(JSON.parse(text ?? 'null') ?? undefined)
  }, [text])
  const bind = { onFocus: () => { focused.current = true }, onBlur: () => { focused.current = false } }
  return [draft, setDraft, bind]
}
