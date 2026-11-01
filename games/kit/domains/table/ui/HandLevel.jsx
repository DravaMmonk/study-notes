import { PhonePage, Workbench } from '../../../shell/index.js'
import { tr } from '../lang.js'
import { Dock, LevelBrief, TestChips } from './play.jsx'

// A level played by hand (fill, trace, link, pack, breach, policy, seam) on the shared shell: the test board card on
// the workbench's stage (desktop) or at the top of the phone page, the level's cards under the task (desktop) or under
// the board (phone), the run bar at the bottom right or pinned under the page.

/**
 * game, level, phone as the shell gives them; board: the test board (a Scene, or the level's own); tests: chips
 * ({ label, status }) with ti, onTest; note: a line under the board; after: what follows it; panel: the level's
 * cards; dock: the run bar's props (Dock); children: what floats over the page (a toast, a sheet).
 */
export default function HandLevel({ game, level, phone, board, tests, ti, onTest, note, after, panel, dock, rootRef, bcardRef, children }) {
  const cards = <div className="panel">{panel}</div>
  const brief = <LevelBrief game={game} level={level}>{!phone && cards}</LevelBrief>
  const bcard = (
    <section ref={bcardRef} className="bcard" aria-label={tr('棋盘', 'Board')}>
      {tests && <TestChips tests={tests} ti={ti} onTest={onTest} />}
      {board}
      <p className="bnote">{note}</p>
      <div className="sg-after">{after}</div>
    </section>
  )
  const bar = <Dock {...dock} />
  if (phone) {
    return (
      <PhonePage rootRef={rootRef} brief={brief} className="sg-level" dock={bar}>
        {bcard}
        {cards}
        {children}
      </PhonePage>
    )
  }
  return (
    <>
      <Workbench rootRef={rootRef} className="sg-level" brief={brief} stage={bcard} scroll dock={bar} />
      {children}
    </>
  )
}
