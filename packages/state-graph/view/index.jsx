import { progress } from 'circuit'
import { tableContext } from '../core/index.js'
import define from './game.js'
import { plays } from '../core/plays.js'
import { displays } from './ui/displays.js'
export { displays }
export { default } from './game.js'
export function TablePlay({ context, work, onChange, phone }) {
 const { task, works } = tableContext(context)
 const game = define(context.content, works)
 const Screen = game.kinds[task.play].Screen
 return <Screen game={game} level={{ ...task, source: task }} saved={work} save={onChange}
  solve={() => {}} fail={() => {}} progress={context.progress ?? progress.fresh()} phone={phone} />
}
export function register(kernel) {
 for (const name of Object.keys(plays)) kernel.play(name, { component: TablePlay, preview: TablePlay, define })
 for (const [name, display] of Object.entries(displays)) kernel.display(name, display)
}
