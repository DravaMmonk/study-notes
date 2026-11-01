// The game played inside the studio: an iframe of studio.html?play (play.jsx), handed the content as the pending
// changeset leaves it each time it changes while it is in view, so an edit plays at once.
import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { getLang, tr } from '../shell/i18n.js'

export default function GameFrame({ visible, content, play, onTake, reference, onReference }) {
  const frame = useRef(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'ready') setReady(true)
      if (event.data?.type === 'take') onTake(event.data)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onTake])
  useEffect(() => {
    if (!ready || !visible) return
    frame.current.contentWindow.postMessage({
      type: 'load', content, level: play?.level ?? null, seed: play?.seed ?? null, take: play?.take ?? null,
      theme: document.documentElement.dataset.theme, lang: getLang(),
    }, window.location.origin)
  }, [ready, visible, content, play])
  return (
    <section className={`studio-play ${visible ? '' : 'is-hidden'}`}>
      {play?.level && (
        <div className="studio-play-bar">
          <b>{play.level}</b>
          {reference && (
            <button type="button" className="kit-btn is-label" onClick={() => onReference(play.level)}>
              <Play size={14} aria-hidden="true" />{tr('载入参考解', 'Load the reference')}
            </button>
          )}
        </div>
      )}
      <iframe ref={frame} title={tr('试玩', 'Play')} src="/studio.html?play" />
    </section>
  )
}
