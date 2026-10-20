import { useEffect, useRef, useState } from 'react'
import { ChevronDown, PanelLeftClose } from 'lucide-react'
import { L, tr } from './i18n.js'
import { LevelTree } from './LevelMap.jsx'

// The level drawer, pulled out from the left over a level: every chapter as its level tree (the map's, compact), the
// current chapter open and the current level marked. Picking a level switches to it directly, without the map.
export default function LevelDrawer({ game, current, solved, all, onOpen, onClose }) {
  const levels = game.levels
  const chapterOf = levels.find((level) => level.id === current)?.chapter
  const [openChapters, setOpenChapters] = useState(() => new Set([chapterOf]))
  const list = useRef(null)
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'center' })
  }, [current])

  const toggle = (id) =>
    setOpenChapters((open) => {
      const next = new Set(open)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <nav className="level-drawer" aria-label={tr('关卡', 'Levels')}>
      <header className="drawer-head">
        <span>{tr('关卡', 'Levels')}</span>
        <small>{levels.filter((level) => solved.has(level.id)).length} / {levels.length}</small>
        <button className="drawer-close" onClick={onClose} aria-label={tr('收起关卡', 'Hide levels')} title={tr('收起关卡', 'Hide levels')}><PanelLeftClose size={16} /></button>
      </header>
      <div className="drawer-list" ref={list}>
        {game.chapters.map((chapter) => {
          const inChapter = levels.filter((level) => level.chapter === chapter.id)
          if (!inChapter.length) return null
          const finished = inChapter.filter((level) => solved.has(level.id)).length
          const expanded = openChapters.has(chapter.id)
          return (
            <section key={chapter.id} className={`drawer-chapter ${chapter.id === chapterOf ? 'is-current' : ''}`}>
              <button className="drawer-chapter-head" onClick={() => toggle(chapter.id)} aria-expanded={expanded}>
                <span className="drawer-chapter-index">{chapter.number ?? chapter.id}</span>
                <span className="drawer-chapter-title">{L(chapter.title)}</span>
                <span className="drawer-chapter-count">{finished}/{inChapter.length}</span>
                <ChevronDown size={14} className="drawer-chevron" />
              </button>
              {expanded && <LevelTree game={game} track={chapter.track} byId={new Map(inChapter.map((level) => [level.id, level]))} solved={solved} all={all} current={current} compact onOpen={onOpen} />}
            </section>
          )
        })}
      </div>
    </nav>
  )
}
