import { lazy } from 'react'
import { Brief, Level, PinnedPlay, TaskNavigation } from '../Layout.jsx'

const exercises = {
  parameters: lazy(() => import('../bench/Bench.jsx')),
  gridProbe: lazy(() => import('./GridProbe.jsx')),
}

/** A focused exercise with a shared layout and one completion event. */
export default function WorkshopPlay({ screen, resource, play }) {
  const { game, level, phone, solve, theme } = screen
  const Exercise = exercises[play.judge]
  const brief = <Brief game={game} level={level} hint={level.hint} sections={play.taskBoard} />
  const stage = <Exercise resource={resource} onSolve={() => solve(null)} theme={theme} />
  return <Level phone={phone} className={play.layout} brief={brief} taskNav={<TaskNavigation level={level} />} stage={phone && play.pinOnPhone ? <PinnedPlay>{stage}</PinnedPlay> : stage} />
}
