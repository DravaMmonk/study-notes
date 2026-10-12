import { Check, Lock } from 'lucide-react'
import { CHAPTERS, LEVELS, isOpen } from '../levels/index.js'
import { PLANNED } from '../levels/planned.js'

// The level map: one column per chapter, each a short route of levels with their prerequisites.
export default function LevelMap({ solved, onOpen }) {
  const done = LEVELS.filter((level) => solved.has(level.id)).length
  return (
    <main className="level-map">
      <header className="map-head">
        <p className="map-kicker">COMP90086 · {done} / {LEVELS.length} 关</p>
        <h1>视觉完备</h1>
        <p className="map-lede">没有讲解，只有元件、测试图和一块显示屏。从“把图挪一格”开始，自己搭出模糊、边缘、角点、视差，最后让机器学会看。</p>
      </header>
      <div className="map-chapters">
        {CHAPTERS.map((chapter) => {
          const levels = LEVELS.filter((level) => level.chapter === chapter.id)
          const planned = PLANNED[chapter.id] ?? []
          return (
            <section key={chapter.id} className={`map-chapter ${chapter.planned ? 'is-planned' : ''}`}>
              <header>
                <span className="chapter-index">第 {chapter.id} 章 · {chapter.lecture}</span>
                <h2>{chapter.title}</h2>
                <p>{chapter.question}</p>
              </header>
              <ol>
                {levels.map((level) => {
                  const open = isOpen(level, solved)
                  const finished = solved.has(level.id)
                  return (
                    <li key={level.id}>
                      <button className={`map-level ${finished ? 'is-solved' : open ? 'is-open' : 'is-locked'}`} disabled={!open} onClick={() => onOpen(level.id)}>
                        <span className="map-level-id">{level.id}</span>
                        <span className="map-level-title">{level.title}</span>
                        {finished ? <Check size={14} /> : open ? null : <Lock size={13} />}
                      </button>
                    </li>
                  )
                })}
                {planned.map(([id, title]) => (
                  <li key={id}>
                    <span className="map-level is-planned" title="已设计，待开放">
                      <span className="map-level-id">{id}</span>
                      <span className="map-level-title">{title}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </main>
  )
}
