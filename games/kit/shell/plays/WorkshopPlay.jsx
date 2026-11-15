import { Brief, Level, PinnedPlay } from '../Layout.jsx'

// A focused exercise that occupies the play area, with the shell's brief and single completion event.
export function workshopScreen(play, Content) {
  return function WorkshopPlay({ game, level, phone, solve, theme }) {
    const brief = <Brief game={game} level={level} hint={level.hint} phone={phone} />
    const stage = <Content level={level} onSolve={() => solve(null)} theme={theme} />
    return <Level phone={phone} className={play.layout} brief={brief} stage={phone && play.pinOnPhone ? <PinnedPlay>{stage}</PinnedPlay> : stage} />
  }
}
