import { tr } from 'kernel/view'
import defineCircuit from './game.js'
import './board/circuit.css'

export { partsFor } from './board/board-parts.js'
export { iconOf } from './parts/icons.js'
export { default as WeightGrid } from './parts/WeightGrid.jsx'
export { definedGame } from './circuit-game.js'
export { default as PartsBook } from './PartsBook.jsx'
export { levelOf } from './PartsBook.jsx'
export { useParts } from './PartsBook.jsx'
export { default as CircuitLevel } from './CircuitLevel.jsx'
export { useLevelBoard } from './CircuitLevel.jsx'
export { useLevelRun } from './CircuitLevel.jsx'
export { circuitScreen } from './CircuitScreen.jsx'
export { useRunHistory } from './useLevelRuns.js'
export { default as ClearButton } from './board/ClearButton.jsx'
export { DEFAULT_VIEWS } from './parts/PartFace.jsx'
export { ICONS } from './parts/icons.js'
export { picker } from './parts/PartSheet.jsx'
export { SCENES } from './parts/previews.js'
export { editorFor } from './parts/previews.js'

import BoardPlay from './BoardPlay.jsx'
export function register(kernel) {
  kernel.display('circuit:part-link', { reference: 'part', icon: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>', action: name => tr(`在元件箱里看 ${name}`, `See ${name} in the components box`) })
  kernel.play('circuit:board', { component: BoardPlay, preview: BoardPlay, define: defineCircuit })
}

export { displays as circuitDisplays } from './mechanism/displays.js'
export { displays as benchDisplays } from './mechanism/bench.jsx'
export { default } from './game.js'
export { defineGame } from './game-definition.js'

export { cardAt, enableDrag } from './drag.js'
export { default as TracePanel } from './TracePanel.jsx'
import './board/wires.css'
export { centerIn, pointIn } from './coordinates.js'

import { displays as screenDisplays } from './mechanism/displays.js'
import { displays as layoutDisplays } from './mechanism/bench.jsx'
export const displays = { ...screenDisplays, ...layoutDisplays }
