import { useState } from 'react'
import { CircuitBoard } from 'lucide-react'
import CircuitLevel from './CircuitLevel.jsx'
import Sheet from './Sheet.jsx'
import { L, tr } from './i18n.js'
import { featureWorkshop, trayKey, trayTypes, workshopEntries, workshopInTray } from '../engine/workshop.js'

const silent = { tests: [], states: [] }
const unreadable = () => tr('这张板需要有已接线的输出，且内部元件必须支持封装。', 'Wire every output and use parts that support workshop packaging.')

export default function Workshop({ screen, board, parts, packed, cards, defined, defaults, types, library, initial, available, capture, put, update, onClose }) {
  const trays = screen.game.course?.trays ?? {}
  const names = Object.keys(trays)
  if (!names.length) names.push('')
  const [tray, setTray] = useState(() => names.includes(initial) ? initial : names[0])
  const [draft, setDraft] = useState(() => fitsTray(board, tray) ? board : { ...board, nodes: board.nodes.filter((n) => parts.role(n) !== 'part'), wires: [] })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notice, setNotice] = useState('')
  const slot = trayKey(screen.game.id, tray)
  function baseTypes(active) { return active ? trayTypes(trays, active) : new Set(types) }
  function belongs(piece, active) { return workshopInTray(piece, trayKey(screen.game.id, active), baseTypes(active)) }
  function choices(active) {
    const entries = baseTypes(active)
    return new Set([...types.filter((id) => entries.has(id)), ...workshopEntries(library).filter((piece) => belongs(piece, active) && available(piece)).map(({ id }) => id)])
  }
  function fitsTray(graph, active) {
    const allowed = choices(active)
    return graph.nodes.every((node) => parts.role(node) !== 'part' || (allowed.has(node.type) || (library.pieces[node.type] && available(library.pieces[node.type]) && belongs(library.pieces[node.type], active))))
  }
  const allowed = choices(tray)
  const personal = workshopEntries(library).filter((piece) => belongs(piece, tray) && !piece.lineage)
  const featured = new Set(library.featured[slot])
  const items = [...allowed].map((type) => library.pieces[type]
    ? { type, label: library.pieces[type].name, family: 'built', icon: CircuitBoard, packed: true }
    : cards(type))
  const pack = () => {
    const piece = name.trim() && fitsTray(draft, tray) && capture(draft, { name: name.trim(), description: description.trim(), tray: slot })
    if (!piece) return setNotice(unreadable())
    if (!put(piece)) return setNotice(tr('工坊写入失败。', 'Could not save to the workshop.'))
    setName('')
    setDescription('')
    setNotice(tr('已保存到托盘折叠区。', 'Saved in the tray’s More section.'))
  }
  return (
    <Sheet title={tr('元件工坊', 'Component workshop')} onClose={onClose} className="workshop-sheet">
      <div className="workshop">
        <label>{tr('托盘', 'Tray')} <select value={tray} onChange={(event) => {
          const next = event.target.value
          if (fitsTray(draft, next)) {
            setTray(next)
            setNotice('')
            if (!draft.wires.length && !draft.nodes.some((node) => parts.role(node) === 'part')) screen.onWorkshopTray?.(next)
          }
          else setNotice(tr('新托盘缺少板上的元件。', 'The other tray lacks parts on this board.'))
        }}>
          {names.map((id) => <option key={id} value={id}>{id || tr('默认', 'Default')}</option>)}
        </select></label>
        <CircuitLevel screen={{ ...screen, game: { ...screen.game, course: null } }} board={{ circuit: draft, change: setDraft, clear: () => setDraft({ ...draft, nodes: draft.nodes.filter((n) => parts.role(n) !== 'part'), wires: [] }) }} parts={parts}
          defaults={defaults} defined={defined} packed={packed} run={silent} brief={null} scope={`workshop:${screen.level.id}`}
          items={items.filter(({ type }) => !library.pieces[type] || featured.has(type))} folded={items.filter(({ type }) => library.pieces[type] && !featured.has(type))}
          types={[...allowed]} canvas={{ height: 310 }} tabs={false} pad={<span />} />
        <form className="workshop-form" onSubmit={(event) => { event.preventDefault(); pack() }}>
          <label>{tr('名称', 'Name')} <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>{tr('描述', 'Description')} <input maxLength={320} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <button type="submit" className="kit-btn">{tr('封装为元件', 'Package as component')}</button>
        </form>
        {notice && <p role="status">{L(notice)}</p>}
        {personal.map(({ id, name: label }) => (
          <label className="workshop-feature" key={id}><input type="checkbox" checked={featured.has(id)} onChange={(event) => {
            if (!update((previous) => featureWorkshop(previous, slot, id, event.target.checked))) setNotice(tr('工坊写入失败。', 'Could not save to the workshop.'))
          }} /> {label} · {tr('放在主区', 'Show in main tray')}</label>
        ))}
      </div>
    </Sheet>
  )
}
