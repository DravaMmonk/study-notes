import { Suspense } from 'react'
import { Brief, Level, PinnedPlay } from './Layout.jsx'
import { tr } from './i18n.js'

// A focused exercise that occupies the play area, with the shell's brief and single completion event.
export function workshopScreen(contents) {
  return function WorkshopPlay({ game, level, play, phone, solve, theme }) {
    const Content = contents[play.resources]
    const brief = <Brief game={game} level={level} hint={level.hint} phone={phone} />
    const stage = <Suspense fallback={<div className="board-loading">{tr('载入中…')}</div>}>
      <Content level={level} onSolve={() => solve(null)} theme={theme} />
    </Suspense>
    return <Level phone={phone} className={play.layout} brief={brief} stage={phone && play.pinOnPhone ? <PinnedPlay>{stage}</PinnedPlay> : stage} />
  }
}
