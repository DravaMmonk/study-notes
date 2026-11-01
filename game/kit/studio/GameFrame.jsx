// The game played inside the studio: an iframe of studio.html?play (play.jsx), handed the content as the pending
// changeset leaves it each time it changes while it is in view, so an edit plays at once. As a sheet over the form it
// is the game's circuit editor on one board of the level being edited; taking the board back (the game's 「用作 …」)
// closes it.
import { useEffect, useRef, useState } from 'react'
import { Play, X } from 'lucide-react'
import { getLang, tr } from '../shell/i18n.js'

export default function GameFrame({ visible, sheet, onClose, content, play, onTake, reference, onReference }) {
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
  // The studio's theme and language go to the game too.
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  useEffect(() => {
    const onTheme = () => setTheme(document.documentElement.dataset.theme)
    window.addEventListener('themechange', onTheme)
    return () => window.removeEventListener('themechange', onTheme)
  }, [])
  const lang = getLang()
  useEffect(() => {
    if (!ready || !visible) return
    frame.current.contentWindow.postMessage({
      type: 'load', content, level: play?.level ?? null, seed: play?.seed ?? null, take: play?.take ?? null, theme, lang,
    }, window.location.origin)
  }, [ready, visible, content, play, theme, lang])
  return (
    <section className={`studio-play ${visible ? '' : 'is-hidden'} ${sheet ? 'is-sheet' : ''}`}>
      {play?.level && (
        <div className="studio-play-bar">
          <b>{play.level}</b>
          {sheet && play.take && <code>{play.take.path}</code>}
          {!sheet && reference && (
            <button type="button" className="kit-btn is-label" onClick={() => onReference(play.level)}>
              <Play size={14} aria-hidden="true" />{tr('载入参考解', 'Load the reference')}
            </button>
          )}
          {sheet && <><span className="kit-spacer" /><button type="button" className="kit-btn is-label" onClick={onClose}><X size={14} aria-hidden="true" />{tr('关闭', 'Close')}</button></>}
        </div>
      )}
      <iframe ref={frame} title={tr('试玩', 'Play')} src="/studio.html?play" />
    </section>
  )
}
