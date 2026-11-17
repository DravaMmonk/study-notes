import { registerEditors } from './studio/index.jsx'
import { logicContext } from '../core/index.js'
import { progress } from 'circuit'
import define from './game.js'
import { plays } from '../core/plays.js'
export { displays } from './ui/displays.js'
export { default } from './game.js'

export function LogicPlay({ context, work, onChange, phone }) {
  const { task, works } = logicContext(context)
  const game = define(context.content, works, { kernel: context.kernel })
  const Screen = game.kinds[task.kind].Screen
  return <Screen game={game} level={{ ...task, source: task }} saved={work} save={onChange}
    solve={() => {}} fail={() => {}} progress={context.progress ?? progress.fresh()} phone={phone} />
}
export function register(kernel) {
  registerEditors(kernel)
  for (const name of Object.keys(plays)) kernel.play(name, { component: LogicPlay, preview: LogicPlay, define })
}
