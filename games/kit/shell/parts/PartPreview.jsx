import { useEffect, useMemo, useState } from 'react'
import { Monitor, PanelRight, Plus, Smartphone } from 'lucide-react'
import CanvasEditor from '../../circuit/CanvasEditor.jsx'
import SlotBoard from '../../circuit/SlotBoard.jsx'
import { L, tr } from '../i18n.js'
import { evalSettings } from '../../engine/parts/define.js'
import PartFace from './PartFace.jsx'
import { definedParts, nextParams } from './faces.jsx'

// A defined part as the studio designs it (games/DESIGN.md 6.7, 6.8): its three faces side by side — the desktop
// card on the game's own canvas, the phone tile on its slot board, the detail both share — drawn by the game's page
// (studio.html?play), so its icons, colours and controls are the player's; under them what it computes and its
// interaction, as the expressions parts.json writes. Its settings move as a player would move them (rules followed,
// readouts and actions live); nothing is wired to it, so its value shows as a placeholder.
//
//   game      the game's description; game.defined = { of(type), defaults(type), ops, widgets? } (the domain's game.jsx)
//   type      the part shown          edit      { picked (a path in the part), pick(path), add(path) } or null
// Every block, setting, expression and face carries the path of what it is in the part (data-pf); in edit mode a
// click picks it, and a face's + adds a block to it.

const NONE = { values: new Map(), errors: new Map() }
const at = (path) => JSON.stringify(path)
const base = { inputs: () => [], role: () => 'part', label: () => '', portLabel: () => '', family: () => null, icon: () => null, outputs: () => null, cardWidth: () => null, packed: () => false }

function Code({ path, label, text, picked, ok = null }) {
  return (
    <div className={`pp-code ${picked === at(path) ? 'is-picked' : ''}`} data-pf={at(path)}>
      {label && <span className="pp-code-label">{label}</span>}
      <code>{text}</code>
      {ok !== null && <i className={`pp-code-now ${ok ? 'is-ok' : 'is-no'}`} aria-label={ok ? tr('此刻成立') : tr('此刻不成立')} />}
    </div>
  )
}

export default function PartPreview({ game, type, edit }) {
  const defined = game.defined
  const def = defined.of(type)
  const [params, setParams] = useState(() => defined.defaults(type))
  useEffect(() => setParams(defined.defaults(type)), [type, def]) // eslint-disable-line react-hooks/exhaustive-deps
  const parts = useMemo(() => definedParts(base, defined.of), [defined])
  if (!def) return <p className="pp-none">{tr(`parts.json 里没有元件 ${type}`, `parts.json has no part ${type}`)}</p>
  const node = { id: 'p', type, params, x: 40, y: 30 }
  const graph = { nodes: [node], wires: [] }
  const set = (patch, changed) => setParams((p) => nextParams(def, p, patch, changed, defined.ops))
  const ctx = { view: NONE, board: { circuit: graph, parts }, path: [], readOnly: false }
  const value = () => <span className="pp-value">{tr('值', 'value')}</span>
  const shown = { ...defined, value }
  const mark = (path) => ({ 'data-pf': at(path), ...(edit?.picked && at(path) === edit.picked ? { 'data-picked': '' } : {}) })
  const face = (name, extra = {}) => <PartFace def={def} face={name} node={node} ctx={ctx} set={set} defined={shown} mark={mark} {...extra} />
  const tile = (pick) => (d) => (d.views?.tile ? d.views.tile.map((b, k) => [b, ['views', 'tile', k]]) : [[{ show: 'value' }, null], [{ show: 'summary' }, null]]).filter(([b]) => pick(b.show === 'value'))
  const pick = (e) => {
    if (!edit || e.target.closest('.pp-add, .pp-adds')) return
    const hit = e.target.closest('[data-pf]')
    if (!hit) return
    e.preventDefault()
    e.stopPropagation()
    edit.pick(JSON.parse(hit.dataset.pf))
  }
  const pane = (name, Icon, title, children) => (
    <section className={`pp-pane is-${name} ${edit?.picked === at(['views', name]) ? 'is-picked' : ''}`} data-pf={at(['views', name])}>
      <header title={title}><Icon size={13} aria-hidden="true" />{edit && <button type="button" className="pp-add" title={tr('加一个块')} onClick={(e) => { e.stopPropagation(); edit.add(['views', name]) }}><Plus size={12} /></button>}</header>
      {children}
    </section>
  )
  const compute = typeof def.compute === 'string' ? [['', def.compute]] : Object.entries(def.compute)
  return (
    <div className={`pp ${edit ? 'is-editing' : ''}`} onClickCapture={pick}>
      <div className="pp-faces">
        {pane('card', Monitor, tr('电脑端面板'), (
          <div className="pp-canvas">
            <CanvasEditor graph={graph} parts={parts} width={def.width ?? 150} height={260} onChange={(g) => { const n = g.nodes.find((x) => x.id === 'p'); if (n) setParams(n.params ?? {}) }} body={() => face('card')} />
          </div>
        ))}
        {pane('tile', Smartphone, tr('手机端简略视图'), (
          <div className="pp-slots">
            <SlotBoard fixed graph={graph} parts={parts} nameOf={() => L(def.name)} thumb={() => face('tile', { blocks: tile((v) => v)(def) })} tileExtra={() => face('tile', { blocks: tile((v) => !v)(def) })} onPort={() => {}} onSlot={() => {}} onNode={() => {}} />
          </div>
        ))}
        {pane('detail', PanelRight, tr('详情（两端共用）'), (
          <div className="pp-detail">
            <h3 {...mark(['name'])}>{L(def.name)}</h3>
            {face('detail', { roomy: true })}
          </div>
        ))}
      </div>
      <div className="pp-logic">
        {compute.map(([o, text]) => <Code key={o || 'out'} path={['compute', ...(o ? [o] : [])]} label={o || null} text={text} picked={edit?.picked} />)}
        {(def.rules ?? []).map((r, k) => <Code key={`r${k}`} path={['rules', k]} label={r.on ? `on ${r.on}` : 'on *'} picked={edit?.picked} text={`${r.when ? `when ${r.when} → ` : ''}${Object.entries(r.set).map(([key, text]) => `${key} = ${text}`).join('; ')}`} />)}
        {(def.checks ?? []).map((c, k) => <Code key={`c${k}`} path={['checks', k]} label="check" picked={edit?.picked} text={c.holds} ok={Boolean(evalSettings(c.holds, def, params, defined.ops))} />)}
        {edit && (
          <div className="pp-adds">
            <button type="button" onClick={() => edit.add(['rules'])}>+ rule</button>
            <button type="button" onClick={() => edit.add(['checks'])}>+ check</button>
          </div>
        )}
      </div>
    </div>
  )
}
