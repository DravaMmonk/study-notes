import { useEffect, useRef } from 'react'
import { createFigureHost } from '../../../../../trace-viewer/src/figures/host.js'
import { useLang } from '../../../shell/useLang.js'

// An anatomy-kit figure used as a level's stage: the game passes its state in as props and hears what
// the player changes inside the drawing through onChange.
export default function FigureStage({ name, theme, props, onChange, className = '' }) {
  const box = useRef(null)
  const host = useRef(null)
  const latest = useRef(props)
  const lang = useLang()
  const listener = useRef(onChange)

  useEffect(() => {
    listener.current = onChange
    latest.current = props
  })

  useEffect(() => {
    const figure = createFigureHost(name, theme, { lang, stage: true, props: latest.current, onChange: (change) => listener.current?.(change) })
    box.current.append(figure.host)
    host.current = figure
    return () => {
      figure.dispose()
      host.current = null
    }
    // The figure mounts once per name and language (a host's language is fixed, so a switch rebuilds it with
    // the latest props); theme and props reach it through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, lang])

  useEffect(() => {
    host.current?.setTheme(theme)
  }, [theme])

  useEffect(() => {
    host.current?.update(props)
  }, [props])

  return <div ref={box} className={`figure-stage ${className}`} />
}
