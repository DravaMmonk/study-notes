import { imageContext } from '../core/index.js'
import { progress } from 'circuit'
export { grey, rangeOf } from './ui/display.js'

import define from './game.js'
import { displays as imageDisplays } from './ui/displays.js'
import { displays as specialDisplays } from './ui/benches/displays.js'
import { displays as sharedDisplays } from './bench/displays.jsx'
const benchDisplays = { ...sharedDisplays, ...specialDisplays }
export const displays = { ...imageDisplays, ...benchDisplays }
export { default } from './game.js'
export function ImagePlay({ context, work, onChange, phone }) {
  const { task, works } = imageContext(context)
  const game = define(context.content, works, { kernel: context.kernel })
  const Screen = game.kinds[task.kind].Screen
  return <Screen game={game} level={{ ...task, source: task }} saved={work} save={onChange}
    solve={() => {}} fail={() => {}} progress={context.progress ?? progress.fresh()} phone={phone} />
}
export function register(kernel) {
  kernel.play('image:graph', { component: ImagePlay, preview: ImagePlay, define })
  kernel.play('image:board', { component: ImagePlay, preview: ImagePlay, define })
  kernel.play('image:probe', { component: ImagePlay, preview: ImagePlay, define })
  kernel.display('image:hero', imageDisplays['image:hero'])
  kernel.display('image:introduction', imageDisplays['image:introduction'])
  kernel.display('image:circuit', imageDisplays['image:circuit'])
  kernel.display('image:widget-imageKernel', imageDisplays['image:widget-imageKernel'])
  kernel.display('image:catalog', imageDisplays['image:catalog'])
  kernel.display('image:probe', imageDisplays['image:probe'])
  kernel.display('image:display-obscura', benchDisplays['image:display-obscura'])
  kernel.display('image:display-obscuraScreen', benchDisplays['image:display-obscuraScreen'])
  kernel.display('image:display-step', benchDisplays['image:display-step'])
  kernel.display('image:display-knobs', benchDisplays['image:display-knobs'])
  kernel.display('image:display-actions', benchDisplays['image:display-actions'])
  kernel.display('image:display-verdict', benchDisplays['image:display-verdict'])
  kernel.display('image:display-goals', benchDisplays['image:display-goals'])
  kernel.display('image:display-stages', benchDisplays['image:display-stages'])
  kernel.display('image:display-cases', benchDisplays['image:display-cases'])
  kernel.display('image:display-plot', benchDisplays['image:display-plot'])
  kernel.display('image:display-strips', benchDisplays['image:display-strips'])
  kernel.display('image:display-text', benchDisplays['image:display-text'])
  kernel.display('image:display-stats', benchDisplays['image:display-stats'])
  kernel.display('image:display-chips', benchDisplays['image:display-chips'])
  kernel.display('image:display-curve', benchDisplays['image:display-curve'])
  kernel.display('image:display-table', benchDisplays['image:display-table'])
  kernel.display('image:display-progress', benchDisplays['image:display-progress'])
}

export { default as Knob } from './bench/Knob.jsx'
export { default as Plot, Legend } from './bench/Plot.jsx'
export { Rich } from './bench/Rich.jsx'

export { formatValue, knobKind, needText, rowValue, goalOf, limitOf } from '../core/bench.js'
