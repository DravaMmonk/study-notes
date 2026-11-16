import { useMemo, useState } from 'react'
import { ArrowDownFromLine, ArrowUpFromLine, Check, CircuitBoard, Layers, Pin, Plus, Trash2, X } from 'lucide-react'
import CircuitLevel from './CircuitLevel.jsx'
import RunDock from './RunDock.jsx'
import Popover from './Popover.jsx'
import Sheet from './Sheet.jsx'
import Glyph from '../circuit/Glyph.jsx'
import { boardFits } from '../circuit/model.js'
import { isPair, L, sideOf, tr } from './i18n.js'
import {
  draftWorkshop, featureWorkshop, publishWorkshop, removeWorkshopPart, trayKey, trayTypes, workshopEntries, workshopInTray,
} from '../engine/workshop.js'
import { editorOf } from '../engine/pieces.js'
import { sourceOf } from '../engine/wire-source.js'
import {
  addTerminalPort, addWorkshopTerminal, editWorkshopTerminal, flattenWorkshopTerminals, MAX_TERMINAL_PORTS, sideLabels,
  terminalPorts, terminalRole, workshopTerminalParts, WORKSHOP_INPUT, WORKSHOP_OUTPUT,
} from '../engine/workshop-terminals.js'
import './workshop.css'

const silent = { tests: [], states: [] }

function TrayPicker({ tray, trays, choices, onPick }) {
  const [anchor, setAnchor] = useState(null)
  const nameOf = (id) => id ? L(trays[id].name) : tr('元件托盘', 'Parts tray')
  const label = tr('切换托盘', 'Switch tray')
  const close = () => {
    setAnchor(null)
    anchor.focus({ preventScroll: true })
  }
  return (
    <div className="ws-tray-picker">
      <button type="button" className="ws-tray-toggle" title={`${label} · ${nameOf(tray)}`} aria-label={`${label} · ${nameOf(tray)}`}
        aria-expanded={Boolean(anchor)} aria-haspopup="dialog" onClick={(event) => anchor ? close() : setAnchor(event.currentTarget)}>
        <Layers size={17} aria-hidden="true" />
      </button>
      {anchor && <Popover anchor={anchor} title={label} onClose={close} placement="above" className="ws-tray-menu" initialFocus='[aria-pressed="true"]'>
        {[...new Set([...choices, tray])].map((id) => {
          const desc = L(trays[id]?.desc)
          return <button key={id} type="button" className="ws-tray-option" aria-pressed={id === tray} onClick={() => {
            close()
            if (id !== tray) onPick(id)
          }}>
            <span><strong>{nameOf(id)}</strong>{desc && <small>{desc}</small>}</span>
            {id === tray && <Check size={15} aria-hidden="true" />}
          </button>
        })}
      </Popover>}
    </div>
  )
}

/** One saved draft per tray, starting from the circuit task's terminal cards. */
export default function Workshop({ screen, tray = '', carry = false, board, parts, packed, cards, defined, defaults, types, library, available, capture, update }) {
  const { game, phone } = screen
  const trays = game.course?.trays ?? {}
  const slot = trayKey(game.id, tray)
  const base = tray ? trayTypes(trays, tray) : new Set(types)
  const belongs = (piece) => workshopInTray(piece, slot, base)
  const offered = workshopEntries(library).filter((piece) => belongs(piece) && available(piece))
  const allowed = new Set([...types.filter((type) => base.has(type)), ...offered.map(({ id }) => id)])
  const drawn = useMemo(() => workshopTerminalParts(parts), [parts])
  const isPart = (node) => terminalRole(parts, node) === 'part'
  const ends = new Set([WORKSHOP_INPUT, WORKSHOP_OUTPUT, ...board.nodes.filter((node) => !isPart(node)).map(({ type }) => type)])
  const keptPart = (type) => {
    const piece = library.pieces[type]
    return allowed.has(type) || Boolean(piece?.deleted && belongs(piece) && available(piece))
  }
  const fits = (graph) => boardFits(graph, drawn, (type) => ends.has(type) || keptPart(type))
    && graph.nodes.every((node) => isPart(node) ? keptPart(node.type) : ends.has(node.type))

  const blank = useMemo(() => unlockDraft({ ...board, nodes: board.nodes.filter((node) => !isPart(node)), wires: [] }), [board, parts])
  const [draft, setDraft] = useState(() => {
    const kept = library.drafts[slot]
    if (kept && fits(kept.graph)) return unlockDraft(kept.graph, parts, kept.names)
    return carry && fits(board) ? unlockDraft(board) : blank
  })
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState(null)
  const keep = (graph) => {
    setDraft(graph)
    setNotice(null)
    update((current) => draftWorkshop(current, slot, graph === blank ? null : { graph }))
  }

  const featured = new Set(library.featured[slot])
  const items = [...allowed].map((type) => library.pieces[type]
    ? { type, label: library.pieces[type].name, desc: library.pieces[type].description, family: 'built', icon: CircuitBoard, packed: true }
    : cards(type))
  const own = (item) => Boolean(library.pieces[item.type])
  const made = workshopEntries(library).filter((piece) => belongs(piece) && !piece.lineage)

  const remove = (piece) => {
    const saved = update((current) => removeWorkshopPart(current, piece.id))
    setNotice(saved
      ? { text: tr(`已删除「${piece.name}」。`, `Deleted “${piece.name}”.`) }
      : { fail: true, text: tr('未能删除，浏览器存储不可用。', 'Could not delete: browser storage is unavailable.') })
  }

  const normal = (name) => String(L(name) ?? '').normalize('NFKC').trim().toLowerCase()
  const catalog = game.partDefs?.parts ?? {}
  const originalNames = new Set([
    ...[...base].flatMap((type) => Object.hasOwn(catalog, type) && editorOf(catalog[type]) === 'circuit' ? [catalog[type].name] : []),
    ...items.filter((item) => !own(item)).map(({ label }) => label),
    INPUT_LABEL, OUTPUT_LABEL,
  ].flatMap((label) => isPair(label) ? ['zh', 'en'].map((lang) => normal(sideOf(label, lang))) : [normal(label)]))
  const nameTaken = (name, book) => originalNames.has(normal(name)) ||
    workshopEntries(book).some((piece) => belongs(piece) && normal(piece.name) === normal(name))
  const beginPack = () => {
    const { graph, names, order, missing } = flattenWorkshopTerminals(draft, parts, (text) => String(L(text)).trim())
    if (!Object.keys(names.outputs).length || missing.length) {
      setNotice({ fail: true, text: tr('请至少放置一个输出，并接上所有输出端口。', 'Add at least one output and wire every output port.') })
      return
    }
    const wired = new Set(graph.wires.map(({ from }) => from))
    const inputs = order.filter((ref) => wired.has(ref)).map((ref) => names.inputs[ref])
    const outputs = Object.values(names.outputs)
    const valid = (labels) => labels.every((label) => label.trim()) && new Set(labels.map(normal)).size === labels.length
    if (!valid(inputs) || !valid(outputs)) {
      setNotice({ fail: true, text: tr('同一侧的端口标签必须非空且互不重复。', 'Port labels on each side must be nonempty and unique.') })
      return
    }
    if ([...inputs, ...outputs].some((label) => label.includes('|') || label.startsWith('__'))) {
      setNotice({ fail: true, text: tr('端口标签不能包含 | 或以 __ 开头。', 'Port labels cannot contain | or start with __.') })
      return
    }
    setNotice(null)
    setConfirm({ graph, names, order })
  }
  const pack = (name, description) => {
    if (!name) return tr('请输入元件名称。', 'Enter a part name.')
    const duplicate = tr('同一托盘已有这个名称的元件。', 'A part in this tray already has this name.')
    if (nameTaken(name, library)) return duplicate
    const piece = capture(confirm.graph, {
      name, description, tray: slot, names: confirm.names, order: confirm.order, parts: drawn,
    })
    if (!piece) return tr('板上有不能封装的元件。', 'A part on this board cannot be packaged.')
    let taken = false
    const saved = update((current) => {
      taken = nameTaken(name, current)
      return taken ? current : publishWorkshop(current, piece, { id: piece.id })
    })
    if (taken) return duplicate
    if (!saved) return tr('未能保存，浏览器存储不可用。', 'Could not save: browser storage is unavailable.')
    setConfirm(false)
    setNotice({ text: tr(`「${piece.name}」已放入托盘。`, `“${piece.name}” is in the tray.`) })
    return null
  }
  const addTerminal = (role, label) => {
    keep(addWorkshopTerminal(draft, parts, role, String(L(label)), (text) => String(L(text))))
  }
  const picker = <TrayPicker tray={tray} trays={trays} choices={screen.workshopTrays} onPick={screen.onWorkshopTray} />
  const terminals = [
    { type: WORKSHOP_INPUT, label: INPUT_LABEL, icon: ArrowDownFromLine, role: 'source' },
    { type: WORKSHOP_OUTPUT, label: OUTPUT_LABEL, icon: ArrowUpFromLine, role: 'sink' },
  ]
  const shelf = made.length > 0 && (
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
              <button type="button" className="ws-tool ws-remove" aria-label={tr(`删除元件 ${piece.name}`, `Delete part ${piece.name}`)} title={tr('删除元件', 'Delete part')} onClick={() => remove(piece)}><Trash2 size={13} /></button>
            </li>
          )
        })}
      </ul>
    </section>
  )
  const dock = <RunDock meta={notice && <p role="status" className={`ws-notice ${notice.fail ? 'is-fail' : ''}`}>{notice.text}</p>}
    go={{ label: tr('封装为元件', 'Package as a part'), icon: <CircuitBoard size={16} />, attrs: { onClick: beginPack } }} />

  return (
    <>
      <CircuitLevel
        className="ws-level"
        screen={screen} trayNames={tray ? [tray] : []} trayControl={picker}
        trayActions={terminals.map(({ role, ...item }) => ({ ...item, onPick: () => addTerminal(role, item.label) }))}
        board={{ circuit: draft, change: keep, clear: () => keep(blank), clearable: () => draft !== blank }}
        parts={drawn} defaults={defaults} defined={defined} packed={packed} run={silent}
        brief={phone ? null : shelf} results={phone ? shelf : null} scope={`workshop:${slot}`}
        items={items.filter((item) => !own(item) || featured.has(item.type))} folded={items.filter((item) => own(item) && !featured.has(item.type))}
        types={[...allowed]} tabs={false} pad={dock}
        describe={(node) => library.pieces[node.type]?.description ?? null}
        terminalTitle={(node) => L(terminalRole(parts, node) === 'source' ? INPUT_LABEL : OUTPUT_LABEL)}
        terminalDetail={(node, { graph, change, close }) => <TerminalFields node={node} parts={parts} graph={graph} title={drawn.label(node)} family={drawn.family?.(node)}
          change={(terminal) => change(editWorkshopTerminal(graph, parts, node.id, terminal))}
          remove={() => { change(editWorkshopTerminal(graph, parts, node.id, null)); close() }} />}
      />
      {confirm && <PackagePrompt onClose={() => setConfirm(false)} onPack={pack} />}
    </>
  )
}

const INPUT_LABEL = { zh: '输入', en: 'Input' }
const OUTPUT_LABEL = { zh: '输出', en: 'Output' }

function unlockDraft(graph, parts, names) {
  return {
    ...graph, nodes: graph.nodes.map(({ locked, fixed, ...node }) => {
      if (!names || terminalRole(parts, node) === 'part' || node.terminal) return node
      const source = terminalRole(parts, node) === 'source'
      const ports = terminalPorts(parts, node).map((port) => ({
        ...port, label: (source ? names.inputs?.[sourceOf(node.id, port.key)] : names.outputs?.[node.id]) ?? port.label,
      }))
      return { ...node, terminal: { text: parts.label(node) ?? node.id, ports } }
    }),
    wires: graph.wires.map(({ locked, ...wire }) => wire),
  }
}

// A draft terminal's detail: its name, and the ports once they are named apart from it (several ports, or one called
// something else). A terminal with one port of its own name edits both as one.
function TerminalFields({ node, parts, graph, title, family, change, remove }) {
  const text = (label) => String(L(label) ?? '')
  const same = (label) => text(label).normalize('NFKC').trim().toLowerCase()
  const role = terminalRole(parts, node)
  const ports = terminalPorts(parts, node)
  const named = ports.length > 1 || text(ports[0].label).trim() !== text(title).trim()
  const others = sideLabels(graph, parts, role, node.id)
  const bad = (port) => {
    const own = same(port.label)
    return !own || own.includes('|') || own.startsWith('__')
      || [...others, ...ports.filter((item) => item !== port).map(({ label }) => label)].some((label) => same(label) === own)
  }
  const write = (next) => change({ text: title, ports, ...next })
  const add = () => write({
    ports: addTerminalPort(ports, text(title).trim() || text(ports[0].label), [...others, ...ports.map(({ label }) => label)].map(text)),
  })
  const enter = (event) => { if (event.key === 'Enter') event.currentTarget.blur() }
  return (
    <div className="ws-term" data-side={role} data-family={family}>
      <input className="ws-term-name" maxLength={named ? 80 : 24} value={text(title)} placeholder={tr('名称', 'Name')} aria-label={tr('名称', 'Name')}
        aria-invalid={(!named && bad(ports[0])) || undefined} onKeyDown={enter}
        onChange={(event) => write(named ? { text: event.target.value } : { text: event.target.value, ports: [{ ...ports[0], label: event.target.value }] })} />
      {named && <ul className="ws-term-ports">
        {ports.map((port, index) => <li key={port.key ?? ''}>
          <i className="ws-dot" />
          <input maxLength={24} value={text(port.label)} spellCheck={false} aria-label={tr(`端口 ${index + 1}`, `Port ${index + 1}`)} aria-invalid={bad(port) || undefined} onKeyDown={enter}
            onChange={(event) => write({ ports: ports.map((item) => item === port ? { ...item, label: event.target.value } : item) })} />
          {ports.length > 1 && <button type="button" className="ws-tool ws-remove" aria-label={tr(`移除端口 ${text(port.label)}`, `Remove port ${text(port.label)}`)} onClick={() => write({ ports: ports.filter((item) => item !== port) })}><X size={14} /></button>}
        </li>)}
      </ul>}
      <div className="ws-term-foot">
        <button type="button" className="kit-btn is-label" disabled={ports.length >= MAX_TERMINAL_PORTS} onClick={add}><Plus size={15} />{tr('端口', 'Port')}</button>
        <button type="button" className="kit-btn is-label ws-remove" onClick={remove}><Trash2 size={15} />{tr('删除', 'Delete')}</button>
      </div>
    </div>
  )
}

function PackagePrompt({ onClose, onPack }) {
  const [error, setError] = useState(null)
  const submit = (event) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setError(onPack(fields.get('name').trim(), fields.get('description').trim()))
  }
  return (
    <Sheet title={tr('封装为元件', 'Package as a part')} onClose={onClose}>
      <form className="ws-fields" onSubmit={submit} onChange={() => setError(null)}>
        <label>{tr('元件名称', 'Part name')}<input autoFocus name="name" required maxLength={80} /></label>
        <label>{tr('描述', 'Description')}<textarea name="description" rows={3} maxLength={320} /></label>
        {error && <p role="alert" className="ws-notice is-fail">{error}</p>}
        <button type="submit" className="run-go">{tr('确认封装', 'Confirm packaging')}</button>
      </form>
    </Sheet>
  )
}
