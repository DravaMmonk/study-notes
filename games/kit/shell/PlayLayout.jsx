import { Fragment } from 'react'
import { Brief, Level } from './Layout.jsx'

export function PlayStage({ play, sections }) {
  return <div className={play.stageClass}>
    {play.sections.map((name) => {
      if (!Object.hasOwn(sections, name)) throw new Error(`Play "${play.view}" has no section "${name}"`)
      return <Fragment key={name}>{sections[name]}</Fragment>
    })}
  </div>
}

export function PlayLayout({ game, level, task, phone, play, ...layout }) {
  const brief = <Brief game={game} level={level} hint={task.hint} phone={phone} />
  return <Level {...layout} phone={phone} className={play.className} brief={brief} />
}
