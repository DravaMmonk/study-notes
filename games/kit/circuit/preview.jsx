import { useMemo } from 'react'
import CanvasEditor from './CanvasEditor.jsx'
import SlotBoard from './SlotBoard.jsx'
import { L, tr } from '../shell/i18n.js'
import { evalSettings } from '../engine/parts/define.js'
import PartFace from '../shell/parts/PartFace.jsx'
import { definedParts, nextParams } from '../shell/parts/faces.jsx'
import PieceSheet, { Chains, Ports, Revisions, Settings, marker } from '../shell/parts/PieceSheet.jsx'

// The circuit editor's pieces drawn (games/DESIGN.md 6.7, 6.8). A primitive's scenes are its three faces — the desktop
// card on the game's own canvas, the phone tile on its slot board, the detail both share — drawn by the game's page
// (game.defined), so its icons, colours and controls are the player's; its settings move as a player would move them
// (rules followed, readouts and actions live) and the three scenes share them (`state`); nothing is wired to it, so
// its value shows as a placeholder. A built piece's detail is the board it runs, as the game draws it (game.parts.demo);
// so is any piece's in the parts box, where the game may draw a bench to try it on.
// The Sheet is the fields no scene draws: a primitive's revisions, ports, every setting, what it computes and its
// interaction as pieces.json writes them; a built piece's own fields (../shell/parts/PieceSheet.jsx).
//
//   preview(piece, { game, scene, edit?, state?, entry?, phone?, progress? })   piece: pieces.json's entry with its `type`;
//     state [params, set] the settings the scenes share; entry the parts box's entry it is shown in

const NONE = { values: new Map(), errors: new Map() }
const at = (path) => JSON.stringify(path)
const base = { inputs: () => [], role: () => 'part', label: () => '', portLabel: () => '', family: () => null, icon: () => null, outputs: () => null, packed: () => false }

function Code({ path, label, text, picked, ok = null }) {
  return (
    <div className={`pp-code ${picked === at(path) ? 'is-picked' : ''}`} data-pf={at(path)}>
      {label && <span className="pp-code-label">{label}</span>}
      <code>{text}</code>
      {ok !== null && <i className={`pp-code-now ${ok ? 'is-ok' : 'is-no'}`} aria-label={ok ? tr('此刻成立') : tr('此刻不成立')} />}
    </div>
  )
}

/** A part's settings as the scenes share them: its defaults until one is moved. */
const paramsOf = (type, defined, [params]) => params ?? defined.defaults(type)

function Face({ piece, game, scene, edit, state }) {
  const { type } = piece
  const defined = game.defined
  const def = defined.of(type)
  const params = paramsOf(type, defined, state)
  const setParams = state[1]
  const parts = useMemo(() => definedParts(base, defined.of, defined.ops), [defined])
  const node = { id: 'p', type, params, x: 40, y: 30 }
  const graph = { nodes: [node], wires: [] }
  const set = (patch, changed) => setParams((p) => nextParams(def, p ?? defined.defaults(type), patch, changed, defined.ops))
  const ctx = { view: NONE, board: { circuit: graph, parts }, path: [], readOnly: false }
  const value = () => <span className="pp-value">{tr('值', 'value')}</span>
  const shown = { ...defined, value }
  const { mark } = marker(edit)
  const face = (name, extra = {}) => <PartFace def={def} face={name} node={node} ctx={ctx} set={set} defined={shown} mark={mark} {...extra} />
  const tile = (pick) => (d) => (d.views?.tile ? d.views.tile.map((b, k) => [b, ['views', 'tile', k]]) : [[{ show: 'value' }, null], [{ show: 'summary' }, null]]).filter(([b]) => pick(b.show === 'value'))
  if (scene === 'card') {
    return (
      <div className="pp-canvas">
        <CanvasEditor graph={graph} parts={parts} height={260} onChange={(g) => { const n = g.nodes.find((x) => x.id === 'p'); if (n) setParams(n.params ?? {}) }} body={() => face('card')} />
      </div>
    )
  }
  if (scene === 'tile') {
    return (
      <div className="pp-slots">
        <SlotBoard fixed graph={graph} parts={parts} nameOf={() => L(def.name)} thumb={() => face('tile', { blocks: tile((v) => v)(def) })} tileExtra={() => face('tile', { blocks: tile((v) => !v)(def) })} onPort={() => {}} onSlot={() => {}} onNode={() => {}} />
      </div>
    )
  }
  return (
    <div className="pp-detail">
      <h3 {...mark(['name'])}>{L(def.name)}</h3>
      {face('detail', { roomy: true })}
    </div>
  )
}

// A piece the game defines (its primitives, and in some games built pieces with a card of their own) has faces; any
// other built piece shows the board it runs.
const faced = (piece, game) => Boolean(game.defined?.of(piece.type))

export function preview(piece, { game, scene, edit = null, state = [undefined, () => {}], entry = null, phone = false, progress = {} }) {
  if (!entry && faced(piece, game)) return <Face piece={piece} game={game} scene={scene} edit={edit} state={state} />
  // In the parts box (`entry`), and for a built piece without faces, the detail is what the game draws to try the
  // piece on: a built piece's board, a bench.
  if (scene !== 'detail' || (!entry && !piece.inside)) return null
  const shown = entry ?? game.parts?.all.find((p) => p.piece === piece.type) ?? { key: piece.type, piece: piece.type }
  return game.parts?.demo?.(shown, { phone, progress }) ?? null
}

/** The fields no scene draws: a faced piece's rows of fields and what it computes, or a built piece's sheet. */
export function Sheet({ piece, game, edit, state = [undefined, () => {}], onTask, label }) {
  if (!faced(piece, game)) return <PieceSheet def={piece} edit={edit} onTask={onTask} label={label} />
  const defined = game.defined
  const def = defined.of(piece.type)
  const params = paramsOf(piece.type, defined, state)
  // What it computes, one expression an output; a part that keeps an input computes nothing.
  const compute = def.keeps ? [] : typeof def.compute === 'string' ? [['', def.compute]] : Object.entries(def.compute)
  return (
    <div className="pp-logic">
      <Revisions def={piece} edit={edit} />
      {piece.inside ? <Chains def={piece} edit={edit} onTask={onTask} label={label} /> : <Ports def={piece} edit={edit} />}
      <Settings def={piece} edit={edit} />
      {compute.map(([o, text]) => <Code key={o || 'out'} path={['compute', ...(o ? [o] : [])]} label={o || null} text={text} picked={edit?.picked} />)}
      {def.keeps && <Code path={['keeps']} label="keeps" text={`${def.keeps.input} → $${def.keeps.register}`} picked={edit?.picked} />}
      {(def.rules ?? []).map((r, k) => <Code key={`r${k}`} path={['rules', k]} label={r.on ? `on ${r.on}` : 'on *'} picked={edit?.picked} text={`${r.when ? `when ${r.when} → ` : ''}${Object.entries(r.set).map(([key, text]) => `${key} = ${text}`).join('; ')}`} />)}
      {(def.checks ?? []).map((c, k) => <Code key={`c${k}`} path={['checks', k]} label="check" picked={edit?.picked} text={c.holds} ok={Boolean(evalSettings(c.holds, def, params, defined.ops))} />)}
      {edit && (
        <div className="pp-adds">
          <button type="button" onClick={() => edit.add(['rules'])}>+ rule</button>
          <button type="button" onClick={() => edit.add(['checks'])}>+ check</button>
        </div>
      )}
    </div>
  )
}

export default { preview, Sheet }
