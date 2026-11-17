import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { L } from './i18n.js'
import { useLang } from './useLang.js'
import Show from '../views/Show.jsx'

/** Embed a drawing whose host maintains its own state. */
export function FigureHost({ mount, name, theme, bare = false }) {
  const slot = useRef(null)
  const figure = useRef(null)
  const lang = useLang()
  useEffect(() => {
    const host = mount(name, theme, { lang, ...(bare ? { bare: true } : { stage: true }) })
    figure.current = host
    slot.current.append(host.host)
    return () => host.dispose()
    // A host's language is fixed. Theme changes are delivered to the existing host below.
  }, [mount, name, lang, bare]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => figure.current?.setTheme(theme), [theme])
  return <div className={bare ? 'map-hero-figure' : 'figure-stage'} ref={slot} />
}

/** The shell draws an introduction's illustration or input-to-output diagram. */
export default function IntroFigure({ art, inputs, outputs, operation, caption }) {
  return (
    <figure className={`intro-figure${art ? ' is-art' : ''}`}>
      {art || (
        <div className="intro-flow">
          {inputs.length > 0 && <Values items={inputs} />}
          {operation ? (
            <span className="intro-operation">{inputs.length > 0 && <ArrowRight size={16} />}<b>{L(operation)}</b><ArrowRight size={16} /></span>
          ) : <ArrowRight size={18} className="intro-arrow" />}
          <Values items={outputs} />
        </div>
      )}
      {caption && <figcaption>{L(caption)}</figcaption>}
    </figure>
  )
}

function Values({ items }) {
  return (
    <span className="intro-values">
      {items.map(({ label, value, views }, index) => (
        <span key={index} className="intro-value">
          <Show value={value} scene="card" views={views} />
          <small>{L(label)}</small>
        </span>
      ))}
    </span>
  )
}
