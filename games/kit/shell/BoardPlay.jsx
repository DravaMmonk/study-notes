import { Dock, TestChips } from './BoardControls.jsx'
import { L } from './i18n.js'
import { Brief, PhonePage } from './Layout.jsx'
import Workbench from './Workbench.jsx'

/**
 * A board can be the work itself, or a world displayed below another editor. The configuration supplies its
 * placement and classes. The domain supplies the world, its actions, and any editor specific to its values.
 */
export default function BoardPlay({
  play, game, level, phone, text, tip, hint, board, tests, ti, onTest, status, note, after, panel, dock,
  rootRef, bcardRef, editor, parts, tray, scrollRef, children,
}) {
  const layout = play.layout
  const inStage = layout.board === 'stage'
  const cards = inStage && <div className={layout.panelClass}>{panel}</div>
  const brief = <Brief game={game} level={level} text={text} tip={tip} hint={hint}>{!phone && cards}</Brief>
  const tabs = tests && <TestChips tests={tests} ti={ti} onTest={onTest} />
  const noteLine = <p className={layout.noteClass}>{note}</p>
  const bcard = (
    <section ref={bcardRef} className={layout.cardClass} aria-label={L(layout.boardLabel)}>
      {inStage && tabs}
      {board}
      {(inStage || phone) && noteLine}
      <div className={layout.afterClass}>{after}</div>
    </section>
  )
  const bar = <Dock {...dock} />
  if (phone) {
    return (
      <PhonePage rootRef={rootRef} scrollRef={scrollRef} brief={brief} className={layout.phoneClass} dock={bar}
        tests={inStage ? null : tabs} tray={tray} results={inStage ? undefined : bcard}>
        {inStage ? bcard : children}
        {cards}
        {editor}
        {inStage && children}
      </PhonePage>
    )
  }
  return (
    <>
      <Workbench rootRef={rootRef} className={layout.desktopClass} brief={brief} parts={parts} stage={inStage ? bcard : editor}
        scroll={inStage} tests={inStage ? null : tabs} status={status} results={inStage ? undefined : bcard}
        resultsAside={inStage ? undefined : noteLine} dock={bar} />
      {children}
    </>
  )
}
