import { useEffect, useState } from 'react'
import { Monitor, PanelRight, Plus, Smartphone } from 'lucide-react'
import { L, T, tr } from '../shell/i18n.js'
import { picker } from '../shell/parts/PartSheet.jsx'
import { SCENES, editorFor } from '../shell/parts/previews.js'
import { partAtStage } from './stage-chain.js'

// A part on the studio's part page (games/DESIGN.md 6.7): the scenes its editor draws (../shell/parts/previews.js),
// several side by side over its sheet, a single detail beside it; each scene a pane with its drawing face
// (views.<scene>), picked by a click and added to with its +. Every field drawn carries its path in the part
// (data-pf); in edit mode a click picks it. The scenes share what the player moves on them (`state`), afresh for each
// version of the part.
//
//   game  the game's description, game.partDefs parts.json as the studio edits it      type  the part shown
//   stage  one of its stages shown instead (its definition there)
//   edit  { picked (a path in the part), pick(path), add(path) } or null
//   onTask(task)  a task a field names followed (a built part's chain)      label(task)  how the map numbers it

const PANES = { card: [Monitor, T('电脑端面板')], tile: [Smartphone, T('手机端简略视图')], detail: [PanelRight, T('详情（两端共用）')] }
const at = (path) => JSON.stringify(path)

export default function PartView({ game, type, stage = null, edit, onTask, label }) {
  const declared = game.partDefs?.parts?.[type]
  const raw = declared && stage ? partAtStage(type, declared, stage) : declared
  const state = useState(undefined)
  const [, setState] = state
  useEffect(() => setState(undefined), [type, raw, setState])
  // A part just added shows once the content holding it comes.
  if (!raw) return null
  const part = { type, ...raw }
  const editor = editorFor(part)
  const scenes = SCENES.map((scene) => [scene, editor.preview(part, { game, scene, edit, state })]).filter(([, shown]) => shown)
  const sheet = <editor.Sheet part={part} game={game} edit={edit} state={state} onTask={onTask} label={label} />
  if (scenes.length === 1 && scenes[0][0] === 'detail') {
    return (
      <div className="pp-built" onClickCapture={picker(edit)}>
        <div className="pp-built-board">{scenes[0][1]}</div>
        {sheet}
      </div>
    )
  }
  const pane = ([scene, shown]) => {
    const [Icon, title] = PANES[scene]
    return (
      <section key={scene} className={`pp-pane is-${scene} ${edit?.picked === at(['views', scene]) ? 'is-picked' : ''}`} data-pf={at(['views', scene])}>
        <header title={L(title)}><Icon size={13} aria-hidden="true" />{edit && <button type="button" className="pp-add" title={tr('加一个块')} onClick={(e) => { e.stopPropagation(); edit.add(['views', scene]) }}><Plus size={12} /></button>}</header>
        {shown}
      </section>
    )
  }
  return (
    <div className={`pp ${edit ? 'is-editing' : ''}`} onClickCapture={picker(edit)}>
      <div className="pp-faces">{scenes.map(pane)}</div>
      {sheet}
    </div>
  )
}
