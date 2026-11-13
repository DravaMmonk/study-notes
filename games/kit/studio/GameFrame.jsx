// The game's own page in the studio (games/DESIGN.md 6.7): an iframe of studio.html?play (play.jsx), the main view of
// a level. It is handed the content as the pending changeset leaves it each time it changes, the level staying open
// as it is, so an edit shows at once where the player sees it. In edit mode (the default) it is the editor: a click on
// a field on screen picks it for the side panel, a + adds an item, and the field picked is drawn so; in play mode it is
// the game alone. While a board of the level is edited there (`take`), the game's 「用作 …」 sends the board back.
//
//   play: { level, seed, take }  a level opened afresh (on a board, or taking one), at `task`;  go: { task } a task to go to
//   part: a part of parts.json shown instead (its three faces and its logic, ../shell/parts/PartPreview.jsx); picked is
//         then the path picked in it
import { useEffect, useRef, useState } from 'react'
import { CirclePlay, MousePointerClick, Play, X } from 'lucide-react'
import { getLang, tr } from '../shell/i18n.js'

export default function GameFrame({ visible, content, play, part, task, go, edit, picked, onEdit, onMessage, onReference, onCancelTake, reference }) {
  const frame = useRef(null)
  const [ready, setReady] = useState(false)
  const said = useRef(onMessage)
  useEffect(() => {
    said.current = onMessage
  })
  useEffect(() => {
    const hear = (event) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'ready') setReady(true)
      else said.current(event.data)
    }
    window.addEventListener('message', hear)
    return () => window.removeEventListener('message', hear)
  }, [])
  // The studio's theme and language go to the game too.
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  useEffect(() => {
    const onTheme = () => setTheme(document.documentElement.dataset.theme)
    window.addEventListener('themechange', onTheme)
    return () => window.removeEventListener('themechange', onTheme)
  }, [])
  const lang = getLang()
  const send = (message) => frame.current?.contentWindow.postMessage(message, window.location.origin)
  // A level opened afresh only when what is opened changes (not on every edit, nor when the page comes back into
  // view: the frame stays as it was while hidden), with the content as it is then and the task the studio is on.
  const now = useRef({ content, task })
  useEffect(() => {
    now.current = { content, task }
  })
  const opened = useRef({ play: undefined, part: undefined, content: null })
  useEffect(() => {
    if (!ready || !visible) return
    if (part !== undefined) {
      if (opened.current.part === part) return
      send({ type: 'part', content: now.current.content, part, theme, lang })
      opened.current = { play: undefined, part, content: now.current.content }
      return
    }
    if (opened.current.play === play && opened.current.part === undefined) return
    send({ type: 'load', content: now.current.content, level: play?.level ?? null, task: now.current.task, seed: play?.seed ?? null, take: play?.take ?? null, theme, lang })
    opened.current = { play, part: undefined, content: now.current.content }
  }, [ready, visible, play, part]) // eslint-disable-line react-hooks/exhaustive-deps
  // An edit: the new content, the level staying open.
  useEffect(() => {
    if (!ready || !visible || opened.current.content === content) return
    send({ type: 'content', content })
    opened.current = { ...opened.current, content }
  }, [ready, visible, content])
  // The theme and the language, as they change.
  useEffect(() => {
    if (ready) send({ type: 'look', theme, lang })
  }, [ready, theme, lang])
  useEffect(() => {
    if (ready) send({ type: 'edit', on: edit, picked })
  }, [ready, edit, picked, play, part])
  useEffect(() => {
    if (ready && go) send({ type: 'go', task: go.task })
  }, [ready, go])
  return (
    <section className={`studio-play ${visible ? '' : 'is-hidden'}`}>
      <div className="studio-play-bar">
        <span className="play-mode" role="radiogroup" aria-label={tr('模式')}>
          <button type="button" role="radio" aria-checked={edit} className={edit ? 'is-on' : ''} onClick={() => onEdit(true)} title={tr('点画面上的字段在侧栏里改')}><MousePointerClick size={13} aria-hidden="true" />{tr('编辑', 'Edit')}</button>
          <button type="button" role="radio" aria-checked={!edit} className={!edit ? 'is-on' : ''} onClick={() => onEdit(false)}><Play size={13} aria-hidden="true" />{tr('试玩')}</button>
        </span>
        {part !== undefined ? <b>{part}</b> : play?.level && <b>{play.level}</b>}
        {play?.take && <code>{play.take.label}</code>}
        <span className="kit-spacer" />
        {part === undefined && play?.level && reference && !play.take && (
          <button type="button" className="kit-btn is-label" onClick={() => onReference(play.level)}>
            <CirclePlay size={14} aria-hidden="true" />{tr('载入参考解')}
          </button>
        )}
        {play?.take && <button type="button" className="kit-btn is-label" onClick={onCancelTake}><X size={14} aria-hidden="true" />{tr('不用这块板')}</button>}
      </div>
      <iframe ref={frame} title={tr('游戏', 'Game')} src="/studio.html?play" />
    </section>
  )
}
