import { useMemo, useState } from 'react'
import { CircuitBoard, Pin, Plus, X } from 'lucide-react'
import CircuitLevel from './CircuitLevel.jsx'
import Glyph from '../circuit/Glyph.jsx'
import { boardFits } from '../circuit/model.js'
import { L, tr } from './i18n.js'
import {
  addWorkshopPort, draftWorkshop, dropWorkshopPort, featureWorkshop, nameWorkshopPort, trayKey, trayTypes,
  workshopEntries, workshopInTray, workshopPorts,
} from '../engine/workshop.js'
import './workshop.css'

const silent = { tests: [], states: [] }

/**
 * The workshop page (games/DESIGN.md 6.9): one draft board per tray, on the same editor as a circuit level, beside the
 * interface it is packaged with (its name, what it does, its input and output ports) and the parts already made on
 * this tray. The circuit screen that plays the tray's boards brings what a level's board has (`board`: the terminals a
 * draft starts from, with the task's own board when `carry`), and the player library.
 */
export default function Workshop({ screen, tray = '', carry = false, board, parts, packed, cards, defined, defaults, types, library, available, capture, put, update }) {
  const { game, phone } = screen
  const trays = game.course?.trays ?? {}
  const slot = trayKey(game.id, tray)
  const base = tray ? trayTypes(trays, tray) : new Set(types)
  const belongs = (piece) => workshopInTray(piece, slot, base)
  const offered = workshopEntries(library).filter((piece) => belongs(piece) && available(piece))
  const allowed = new Set([...types.filter((type) => base.has(type)), ...offered.map(({ id }) => id)])
  const isPart = (node) => parts.role(node) === 'part'
  const ends = new Set(board.nodes.filter((node) => !isPart(node)).map(({ type }) => type))
  const fits = (graph) => boardFits(graph, parts, (type) => ends.has(type) || allowed.has(type))
    && graph.nodes.every((node) => (isPart(node) ? allowed : ends).has(node.type))
  // A fresh draft's ports take the names the board's terminals show, where those tell them apart.
  const fresh = (graph) => {
    const shown = (node) => String(L(parts.label(node)))
    const names = Object.fromEntries(['inputs', 'outputs'].map((side) => {
      const own = workshopPorts(graph, parts)[side].filter((port) => port.plain).map((port) => [port.ref, shown(graph.nodes.find(({ id }) => id === port.node))])
      return [side, Object.fromEntries(own.filter(([, name]) => name && own.filter(([, other]) => other === name).length === 1))]
    }))
    return { graph, names }
  }
  const blank = useMemo(() => fresh({ ...board, nodes: board.nodes.filter((node) => !isPart(node)), wires: [] }), [board])
  const [draft, setDraft] = useState(() => {
    const kept = library.drafts[slot]
    if (kept && fits(kept.graph)) return kept
    return carry && fits(board) ? fresh(board) : blank
  })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notice, setNotice] = useState(null)
  const keep = (next) => {
    setDraft(next)
    setNotice(null)
    update((current) => draftWorkshop(current, slot, next === blank ? null : next))
  }
  const ports = workshopPorts(draft.graph, parts, draft.names)
  // A terminal of the draft reads as the port it becomes.
  const drawn = useMemo(() => {
    const named = new Map([...ports.inputs, ...ports.outputs].filter((port) => port.plain).map((port) => [port.node, port.name]))
    return { ...parts, label: (node) => named.get(node.id) ?? parts.label(node) }
  }, [parts, draft])

  const featured = new Set(library.featured[slot])
  const items = [...allowed].map((type) => library.pieces[type]
    ? { type, label: library.pieces[type].name, desc: library.pieces[type].description, family: 'built', icon: CircuitBoard, packed: true }
    : cards(type))
  const own = (item) => Boolean(library.pieces[item.type])
  const made = workshopEntries(library).filter((piece) => belongs(piece) && !piece.lineage)

  const pack = () => {
    if (!ports.outputs.every((port) => port.wired)) return setNotice({ fail: true, text: tr('每个输出都需要接上线。', 'Wire every output.') })
    const piece = capture(draft.graph, {
      name: name.trim(), description: description.trim(), tray: slot,
      names: draft.names, order: ports.inputs.map(({ ref }) => ref),
    })
    if (!piece) return setNotice({ fail: true, text: tr('板上有不能封装的元件。', 'A part on this board cannot be packaged.') })
    if (!put(piece)) return setNotice({ fail: true, text: tr('未能保存，浏览器存储不可用。', 'Could not save: browser storage is unavailable.') })
    setName('')
    setDescription('')
    setNotice({ text: tr(`「${piece.name}」已放入托盘。`, `“${piece.name}” is in the tray.`) })
  }
  const rename = (side, ref, text) => {
    const names = nameWorkshopPort(draft.names, ports, side, ref, text)
    if (names) keep({ ...draft, names })
  }
  const add = (side) => keep({ ...draft, graph: addWorkshopPort(draft.graph, parts, side) })
  const drop = (side, ref) => {
    const { [ref]: _gone, ...rest } = draft.names[side] ?? {}
    keep({ graph: dropWorkshopPort(draft.graph, parts, side, ref), names: { ...draft.names, [side]: rest } })
  }

  const face = (
    <div className="ws-panel">
      <form className="ws-face" onSubmit={(event) => { event.preventDefault(); pack() }}>
        <input className="ws-name" required maxLength={80} value={name} placeholder={tr('元件名称', 'Part name')} aria-label={tr('元件名称', 'Part name')} onChange={(event) => setName(event.target.value)} />
        <textarea className="ws-desc" rows={2} maxLength={320} value={description} placeholder={tr('它做什么', 'What it does')} aria-label={tr('描述', 'Description')} onChange={(event) => setDescription(event.target.value)} />
        {[['inputs', tr('输入', 'Inputs')], ['outputs', tr('输出', 'Outputs')]].map(([side, title]) => {
          const list = ports[side]
          const spare = list.filter((port) => port.plain).length > 1
          return (
            <section key={side} className="ws-ports" data-side={side}>
              <header>
                <h2>{title}</h2>
                {list.some((port) => port.plain) && <button type="button" className="ws-tool" aria-label={tr(`添加${title}`, `Add to ${title}`)} onClick={() => add(side)}><Plus size={14} /></button>}
              </header>
              <ul>
                {list.map((port) => (
                  <li key={port.ref} className={port.wired ? 'is-wired' : ''}>
                    <i className="ws-dot" title={port.wired ? undefined : side === 'inputs' ? tr('未接线，不计入接口', 'Not wired: left out of the interface') : tr('未接线', 'Not wired')} />
                    <PortName port={port} valid={(text) => Boolean(nameWorkshopPort(draft.names, ports, side, port.ref, text))} onName={(text) => rename(side, port.ref, text)} />
                    {port.plain && spare && <button type="button" className="ws-tool" aria-label={tr(`移除 ${port.name}`, `Remove ${port.name}`)} onClick={() => drop(side, port.ref)}><X size={13} /></button>}
                  </li>
                ))}
                {!list.length && <li className="ws-none">{tr('从板上的输入元件连线后出现', 'Appears once a wire reads a source on the board')}</li>}
              </ul>
            </section>
          )
        })}
        <button type="submit" className="ws-pack"><CircuitBoard size={16} /><span>{tr('封装为元件', 'Package as a part')}</span></button>
        {notice && <p role="status" className={`ws-notice ${notice.fail ? 'is-fail' : ''}`}>{notice.text}</p>}
      </form>
      {made.length > 0 && (
        <section className="ws-shelf">
          <header><h2>{tr('我的元件', 'My parts')}</h2></header>
          <ul>
            {made.map((piece) => {
              const on = featured.has(piece.id)
              return (
                <li key={piece.id} data-family="built">
                  <i className="family-chip"><Glyph icon={CircuitBoard} size={12} /></i>
                  <span title={piece.description || undefined}>{piece.name}</span>
                  <small>{piece.inputs.length} → {piece.outputs.length}</small>
                  <button type="button" className={`ws-tool ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={tr(`把 ${piece.name} 固定在托盘主区`, `Pin ${piece.name} to the tray`)} title={tr('固定在托盘主区', 'Pin to the tray')} onClick={() => update((current) => featureWorkshop(current, slot, piece.id, !on))}><Pin size={13} /></button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )

  return (
    <CircuitLevel
      className="ws-level"
      screen={screen} trayNames={tray ? [tray] : []}
      board={{ circuit: draft.graph, change: (graph) => keep({ ...draft, graph }), clear: () => keep(blank) }}
      parts={drawn} defaults={defaults} defined={defined} packed={packed} run={silent}
      brief={phone ? null : face} below={phone ? face : null} scope={`workshop:${slot}`}
      items={items.filter((item) => !own(item) || featured.has(item.type))} folded={items.filter((item) => own(item) && !featured.has(item.type))}
      types={[...allowed]} tabs={false} pad={null}
      describe={(node) => library.pieces[node.type]?.description ?? null}
    />
  )
}

// A port's name, edited in place: Enter or leaving the field takes it, Escape or a name that will not do puts the old one back.
function PortName({ port, valid, onName }) {
  const [text, setText] = useState(null)
  const done = () => {
    if (text !== null && text.trim() !== port.name) onName(text)
    setText(null)
  }
  return (
    <input
      className="ws-port-name" value={text ?? port.name} maxLength={24} spellCheck={false}
      aria-label={tr('端口名称', 'Port name')} aria-invalid={text !== null && text.trim() !== port.name && !valid(text) ? true : undefined}
      onChange={(event) => setText(event.target.value)} onBlur={done}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
        if (event.key === 'Escape') { setText(null); event.stopPropagation() }
      }}
    />
  )
}
