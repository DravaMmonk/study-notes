import { useMemo } from 'react'
import { defineGame } from '../index.js'
import { playFor } from '../../engine/plays.js'
import BoardChecks from './BoardChecks.jsx'
import Rows from './Rows.jsx'
import FieldRows from './FieldRows.jsx'
import ScenarioCheck from './ScenarioCheck.jsx'
import TreeWork from './TreeWork.jsx'
import ValueTables from './ValueTables.jsx'

const SCREENS = { once: Rows, check: TreeWork, rows: FieldRows, steps: ScenarioCheck, boards: BoardChecks, table: ValueTables }

/** Assemble the components named by a play, with the domain's value and run resources. */
export function playScreen(plays, resources) {
  return function Play(screen) {
    const source = screen.level.source
    const play = playFor(plays, source)
    const prepare = resources[play.resources]
    const resource = useMemo(() => prepare(source, screen), [prepare, source, screen.progress, screen.saved])
    const Screen = SCREENS[play.judge]
    return <Screen screen={screen} resource={resource} play={play} />
  }
}


/** A game whose tasks are all plays can be defined from its data and domain resources. */
export function playGame(content, { chapters, levels }, plays, resources) {
  const Screen = playScreen(plays, resources)
  const kinds = Object.fromEntries(Object.keys(plays).map((kind) => [kind, { Screen }]))
  return defineGame({ id: content.id, title: content.title, kicker: content.kicker, lede: content.lede, glossary: content.glossary, chapters, levels, kinds })
}
