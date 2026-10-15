import { useEffect, useRef } from 'react'
import { createFigureHost } from '../../figures/host.js'

// An anatomy-kit figure used as a level's stage: the game passes its state in as props and hears what
// the player changes inside the drawing through onChange.
export default function FigureStage({ name, theme, props, onChange, className = '' }) {
  const box = useRef(null)
  const host = useRef(null)
  const first = useRef(props)
  const listener = useRef(onChange)

  useEffect(() => {
    listener.current = onChange
  })

  useEffect(() => {
    const figure = createFigureHost(name, theme, { stage: true, props: first.current, onChange: (change) => listener.current?.(change) })
    box.current.append(figure.host)
    host.current = figure
    return () => {
      figure.dispose()
      host.current = null
    }
    // The figure mounts once per name; theme and props reach it through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  useEffect(() => {
    host.current?.setTheme(theme)
  }, [theme])

  useEffect(() => {
    host.current?.update(props)
  }, [props])

  return <div ref={box} className={`figure-stage ${className}`} />
}
