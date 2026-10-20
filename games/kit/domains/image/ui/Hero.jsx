import { useEffect, useRef } from 'react'
import { createFigureHost } from '../../../../../trace-viewer/src/figures/host.js'
import { useLang } from '../../../shell/useLang.js'

// The filter press from the notes, running, as the map's illustration.
export default function Hero({ theme }) {
  const slot = useRef(null)
  const figure = useRef(null)
  const lang = useLang()
  // A host's language is fixed, so a language switch rebuilds it.
  useEffect(() => {
    const host = createFigureHost('conv-press', theme, { lang, bare: true })
    figure.current = host
    slot.current.append(host.host)
    return () => host.dispose()
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => figure.current?.setTheme(theme), [theme])
  return <div className="map-hero-figure" ref={slot} />
}
