import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Columns2, EyeOff, Plus, Redo2, Spline, Square, Undo2, Waypoints } from 'lucide-react'
import ClearButton from './ClearButton.jsx'
import SaveSlots from './SaveSlots.jsx'
import { L, tr } from '../shell/i18n.js'
import Glyph from './Glyph.jsx'
import { feeding, inPort, layout, outPort, parsePort, placement, srcNode, srcOf } from './model.js'

// The phone circuit board, the same in every game: the sources on top, parts in a two-column grid of slots that
// keep their place, the sinks at the bottom. A block's inputs are dots on its top edge and its output a dot on its
// bottom edge; wires run between the dots. What a block shows (its value, a picture) is the game's (`thumb`).

/**
 * Wires from each output dot down (or round) to the input dot it feeds; `live` is a wire being dragged. The board's
 * `data-wires` says which wires show: all of them, all but the sources' ('parts'), or none; a picked dot's own block
 * (`data-picked`) still shows its wires either way.
 */
export function drawWires(el, graph, parts, live) {
  const svg = el.querySelector('.pb-wires')
  if (!svg) return
  const mode = el.dataset.wires ?? 'all'
  const picked = el.dataset.picked ? srcNode(parsePort(el.dataset.picked).id) : null
  const isSource = (id) => parts.role(graph.nodes.find((n) => n.id === id) ?? {}) === 'source'
  const shown = (w) => mode === 'all' || srcNode(w.from) === picked || w.to === picked || (mode === 'parts' && !isSource(srcNode(w.from)))
  const origin = el.getBoundingClientRect()
  const at = (p) => {
    const dot = el.querySelector(`[data-p="${CSS.escape(p)}"]`)
    if (!dot) return null
    const box = dot.getBoundingClientRect()
    return [box.left + box.width / 2 - origin.left, box.top + box.height / 2 - origin.top]
  }
  const middle = el.clientWidth / 2
  const f = (n) => n.toFixed(1)
  const curve = ([ax, ay], [bx, by]) => {
    const drop = Math.max(28, Math.abs(by - ay) / 2)
    // A wire that has to climb loops out sideways instead of cutting through the blocks.
    if (by < ay + 10) {
      const side = (bx >= ax ? 1 : -1) * 70
      return `M${f(ax)},${f(ay)} C${f(ax + side)},${f(ay + drop)} ${f(bx + side)},${f(by - drop)} ${f(bx)},${f(by)}`
    }
    // A wire that runs down past a whole row turns toward the middle of the board at once, so it is clear of the
    // short wire to the block just below and never reads as passing through that block's input.
    if (by - ay > 150) {
      const side = (ax < middle ? 1 : -1) * 96
      const back = Math.abs(bx - ax) < 30 ? side : 0
      return `M${f(ax)},${f(ay)} C${f(ax + side)},${f(ay + 30)} ${f(bx + back)},${f(by - drop)} ${f(bx)},${f(by)}`
    }
    return `M${f(ax)},${f(ay)} C${f(ax)},${f(ay + drop)} ${f(bx)},${f(by - drop)} ${f(bx)},${f(by)}`
  }
  const family = (id) => parts.family(graph.nodes.find((n) => n.id === id) ?? {})
  // A game may colour a wire itself (by its source, say) instead of by family.
  const style = (w) => Object.entries(parts.wireStyle?.(w, graph) ?? {}).map(([k, v]) => `${k}:${v}`).join(';')
  // A game whose wires carry different kinds of thing (data, handles, order) names each wire's kind.
  const kind = (w) => (parts.wireKind ? ` kind-${parts.wireKind(w, graph)}` : '')
  let markup = ''
  for (const w of graph.wires) {
    if (!shown(w)) continue
    const a = at(outPort(w.from))
    const b = at(inPort(w.to, w.port))
    if (!a || !b) continue
    const d = curve(a, b)
    markup += `<path class="pb-casing" d="${d}"/><path class="pb-wire${kind(w)}" data-family="${family(srcNode(w.from))}" style="${style(w)}" d="${d}"/>`
  }
  if (live) {
    const a = at(live.from)
    if (a) {
      const b = [live.x - origin.left, live.y - origin.top]
      markup += `<path class="pb-wire is-live" d="${live.from.startsWith('o|') ? curve(a, b) : curve(b, a)}"/>`
    }
  }
  // Translated parts and the SVG itself must not permanently enlarge the board's scroll extent.
  svg.setAttribute('width', el.clientWidth)
  svg.setAttribute('height', el.clientHeight)
  svg.innerHTML = markup
}

// Which wires the board shows, the player's choice, remembered in this browser: all, all but the sources', or none.
const WIRE_MODES = [
  { id: 'all', Icon: Spline, label: { zh: '全部接线', en: 'All wires' } },
  { id: 'parts', Icon: Waypoints, label: { zh: '隐藏输入接线', en: 'No input wires' } },
  { id: 'none', Icon: EyeOff, label: { zh: '隐藏接线', en: 'No wires' } },
]
const WIRES_KEY = 'kit.wires'
const readMode = () => {
  try {
    const m = window.localStorage.getItem(WIRES_KEY)
    return WIRE_MODES.some((x) => x.id === m) ? m : 'all'
  } catch {
    return 'all'
  }
}

/**
 * @param graph, parts                     the circuit and the game's description of its nodes (model.js)
 * @param nameOf(node)                     a block's name (with its number, for parts)
 * @param thumb(node, size)                what a block shows; sinkBody(node) what a sink shows; tileExtra(node) a line
 *                                         under a part's name (a setting); sinkClass(node) a sink's state
 * @param picking, moving, canLand(p), onPort(p), onNode(id), onSlot(at)    from useSlotEditing
 * @param fixed                            a circuit that is only looked at and tried (a bench in the parts box): just its
 *                                         own blocks, no empty slots to fill
 * @param nodeClass(node)                  extra classes for a block (the selected one, the one a bench is about)
 * @param outNote(node, key)               over each of a block's several outputs (parts.outputs), under its name: what
 *                                         it carries
 * @param widthOf(id)                      a frame's width on the board, { narrow, set(narrow) }, or null when it
 *                                         has no choice (useSlotEditing widthOf): a button in its top right corner
 *                                         switches two columns and one with each tap
 * @param history                          undo and redo beside the wire display switch (useSlotEditing's `history`)
 * @param onClear                          clears the board: a button just left of undo and redo, which asks first;
 *                                          without it the button stays, greyed out
 *                                         (the row starts with the switcher between the level's saved boards, SaveSlots)
 * @param onChange(graph), types           a board given these can be read in from text (SaveSlots): the editor's
 *                                         change, and the parts this level offers
 * @param dense                            a board of text: thin blocks, each one's name over its value
 * @param regionNote(node, region)         in a frame's region (frames.js), what the value it opens is (or, for a
 *                                         region that opens none, what the frame holds there: the thing a
 *                                         for-any box takes, say);
 *        resultNote(node, region)         and beside the dot its result goes into, what the frame gives (a frame's
 *                                         block shows nothing else of it)
 *
 * A frame is a block a row wide: its own inputs on top, its output under it, and between them each region, a grid
 * of its own (model.js placement) between two dashed lines: on the top one the dot of the value the region opens (as
 * on the desktop board), on the bottom one the dot its result goes into, with what the frame gives. Parts are placed in it, and dragged in and out of it, as on the
 * board.
 */
/** The most outputs a source holds before it takes a row of its own (two rows of four dots, on a phone's half row). */
const WIDE = 8

export default function SlotBoard({ stages = null, graph, parts, nameOf, thumb, tileExtra, sinkBody, sinkClass, picking, moving, canLand, onPort, onNode, onSlot, fixed = false, nodeClass, outNote, history, onClear, onChange, types, dense = false, regionNote, resultNote, widthOf = () => null }) {
  const board = useRef(null)
  const [openStage, setOpenStage] = useState(null)
  const groups = stages?.stages ?? []
  const owner = new Map(groups.flatMap((s) => s.nodes.map((id) => [id, s.id])))
  useEffect(() => {
    if (!stages?.active) return
    const id = owner.get(stages.active)
    setOpenStage(id ?? null)
    requestAnimationFrame(() => board.current?.querySelector(`[data-piece="${CSS.escape(stages.active)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [stages?.active])
  const [wires, setWires] = useState(readMode)
  const mode = WIRE_MODES.find((m) => m.id === wires)
  const next = WIRE_MODES[(WIRE_MODES.indexOf(mode) + 1) % WIRE_MODES.length]
  const cycle = () => {
    setWires(next.id)
    try {
      window.localStorage.setItem(WIRES_KEY, next.id)
    } catch {
      // The choice still holds for this visit.
    }
  }
  const { sources, sinks } = layout(graph, parts)
  // Up to four sinks to a row, the rows as even as they can be: five go 3 + 2, eight 4 + 4.
  const cols = (n) => ({ '--cols': n <= 4 ? n : Math.ceil(n / Math.ceil(n / 4)) })
  const regionsOf = (node) => parts.frames?.(node) ?? []
  const own = (node) => new Set(regionsOf(node).map((r) => r.name))

  // Wires are drawn after layout from where the dots really are, and again while a wire is dragged.
  useLayoutEffect(() => {
    const el = board.current
    if (!el) return undefined
    const inside = groups.length ? { ...graph, wires: graph.wires.filter((w) => owner.get(srcNode(w.from)) === owner.get(w.to)) } : graph
    const draw = () => drawWires(el, inside, parts)
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(el)
    return () => observer.disconnect()
  })

  const dotClass = (p, extra = '') => {
    if (!picking) return extra
    if (p === picking) return `${extra} is-picked`
    return `${extra} ${canLand(p) ? 'is-target' : 'is-dim'}`
  }
  const used = (src) => graph.wires.some((w) => w.from === src)
  // A block's output dot, or (parts.outputs) a row of them, each under its short name and what it carries (outNote).
  // They wrap onto more rows inside the block; more than WIDE of them and the block takes a row of its own.
  const outDots = (node) => {
    // A frame's regions give their values inside it; its own output is the one under the block.
    const listed = parts.outputs?.(node)?.filter((o) => !own(node).has(o.key)) ?? null
    const outs = listed && !(listed.length === 1 && listed[0].key === null) ? listed : null
    if (!outs) return <span className="pb-out">{dot(outPort(node.id), tr(`${nameOf(node)} 的输出`, `${nameOf(node)} output`), `is-out ${used(node.id) ? 'is-wired' : ''} ${parts.portClass?.(node, null) ?? ''}`)}</span>
    return (
      <span className="pb-out is-many">
        {outs.map((o) => {
          const src = srcOf(node, o.key)
          const note = outNote?.(node, o.key)
          return (
            <span key={o.key} className={`pb-o ${note ? 'has-note' : ''}`}>
              {(outs.length > 1 || note) && (o.glyph ? <em className="is-glyph" title={L(o.label)} dangerouslySetInnerHTML={{ __html: o.glyph }} /> : <em>{L(o.short ?? o.label)}</em>)}
              {note}
              {dot(outPort(src), tr(`${nameOf(node)} 的输出 ${L(o.label)}`, `${nameOf(node)} output ${L(o.label)}`), `is-out ${used(src) ? 'is-wired' : ''} ${parts.portClass?.(node, null, o.key) ?? ''}`)}
            </span>
          )
        })}
      </span>
    )
  }
  const dot = (p, label, extra = '') => (
    <button
      key={p}
      type="button"
      className={`pb-dot ${dotClass(p, extra)}`}
      data-p={p}
      onClick={(event) => {
        event.stopPropagation()
        onPort(p)
      }}
      aria-label={label}
    >
      <i />
    </button>
  )
  const inputs = (node) => {
    const ports = parts.inputs(node).filter((p) => !own(node).has(p))
    return ports.map((port) => {
      const from = graph.nodes.find((n) => n.id === srcNode(feeding(graph, node.id, port)))
      const tag = ports.length > 1 ? L(parts.portLabel?.(node, port) ?? port) : ''
      // Beside a wired input, where it reads from: a part's number, or a source's name. A wire between two parts
      // stacked in one column is short, so this says what it connects even where the wire is hard to see.
      const source = from && (parts.role(from) === 'source' ? nameOf(from) : nameOf(from).split(' ')[0])
      return (
        <span key={port} className="pb-in">
          {dot(inPort(node.id, port), tr(`${nameOf(node)} 的输入${tag ? ` ${tag}` : ''}${from ? `（读 ${nameOf(from)}，点一下拆掉）` : ''}`, `${nameOf(node)} input${tag ? ` ${tag}` : ''}${from ? ` (reads ${nameOf(from)}; tap to unplug)` : ''}`), `${from ? 'is-in is-wired' : 'is-in is-open'} ${parts.portClass?.(node, port) ?? ''}`)}
          {tag && <em>{tag}</em>}
          {source && <b className="pb-src" data-family={parts.family(from)}>{source}</b>}
        </span>
      )
    })
  }
  const icon = (node) => {
    const i = parts.icon?.(node)
    // A packed part's glyph sits on its solid family chip, as on the desktop card.
    return i ? <i className={`pb-glyph ${parts.packed?.(node) ? 'family-chip' : ''}`}><Glyph icon={i} size={12} strokeWidth={2} /></i> : null
  }

  // A grid of slots: the board's, or a region's inside a frame (`region`, rows of the frame's own grid: placement).
  function grid(region, style, members = null, stage = false) {
    const whole = placement(graph, parts, region, { fixed })
    const subset = members ? { ...graph, nodes: graph.nodes.filter((n) => members.has(n.id)).sort((a, b) => (a.slot ?? Infinity) - (b.slot ?? Infinity)).map((n) => ({ ...n, slot: undefined })) } : graph
    const { cell, span, cols, size, free } = placement(subset, parts, region, { fixed: fixed || stage })
    const original = (slot, id) => members ? id ? whole.cell.get(id) : whole.free[free.indexOf(slot)] ?? whole.size + free.indexOf(slot) : slot
    const at = (slot, [w, h] = [1, 1]) => ({ gridRow: `${Math.floor(slot / cols) + 1} / span ${h}`, gridColumn: `${(slot % cols) + 1} / span ${w}` })
    const out = []
    for (const [id, slot] of cell) {
      const node = graph.nodes.find((n) => n.id === id)
      if ((parts.frames?.(node) ?? []).length) { out.push(frameBlock(node, slot, region, at(slot, span.get(id)))); continue }
      const extra = tileExtra?.(node)
      out.push(
        <div key={node.id} className="pb-cell" data-slot={original(slot)} data-region={region ?? ''} style={at(slot)}>
          <div className={`pb-tile ${parts.packed?.(node) ? 'is-packed' : ''} ${nodeClass?.(node) ?? ''} ${moving === node.id ? 'is-moving' : ''}`} data-piece={node.id} data-drag={fixed ? undefined : true} data-family={parts.family(node)} style={parts.cardStyle?.(node)} role="button" tabIndex={0} onClick={() => onNode(node.id)} aria-label={nameOf(node)}>
            <span className={`pb-ins ${parts.inputs(node).length > 1 ? 'is-many' : ''}`}>{inputs(node)}</span>
            <span className="pb-thumb">{thumb(node, 84)}</span>
            <span className="pb-name">{icon(node)}{nameOf(node)}</span>
            {extra && <span className="pb-param">{extra}</span>}
            {outDots(node)}
          </div>
        </div>,
      )
    }
    for (const slot of free) {
      out.push(fixed || stage
        ? <div key={`slot-${slot}`} className="pb-cell is-blank" style={at(slot)} />
        : (
          <div key={`slot-${slot}`} className="pb-cell" data-slot={slot} data-region={region ?? ''} style={at(slot)}>
            <button type="button" className="pb-slot" onClick={() => onSlot(original(slot), region)} aria-label={tr('在这一格放置元件', 'Place a part in this slot')}><Plus size={20} /></button>
          </div>
        ))
    }
    return <div className={`pb-grid ${region ? 'is-region' : ''}`} data-cols={cols} data-size={size} style={style}>{out}</div>
  }

  // A frame: rows of the grid it sits in, for each region a row for its head, the region's rows, and a row for its
  // foot, the dot its result goes into; its name (held to drag it) and inputs over them, its output under them.
  function frameBlock(node, slot, region, style) {
    const ports = inputs(node)
    let row = 1
    const sections = regionsOf(node).map((r) => {
      const rows = placement(graph, parts, `${node.id}/${r.name}`, { fixed }).rows
      const section = (
        <section key={r.name} className="pb-region" style={{ gridRow: `${row} / span ${rows + 2}` }}>
          {/* Its head row: its name, and the value it opens with the dot that gives it. */}
          <header className="pb-region-head">
            {regionsOf(node).length > 1 && <b>{L(r.label)}</b>}
            {r.opens && <em>{L(parts.outputs?.(node)?.find((o) => o.key === r.name)?.label ?? '')}</em>}
            {regionNote?.(node, r.name)}
            {r.opens && <span className="pb-out">{dot(outPort(srcOf(node, r.name)), tr(`${nameOf(node)} 的${L(r.label)}假设`, `${nameOf(node)} ${L(r.label)}: assumption`), `is-out ${used(srcOf(node, r.name)) ? 'is-wired' : ''}`)}</span>}
          </header>
          {grid(`${node.id}/${r.name}`, { gridRow: `2 / span ${rows}` })}
          {/* Its foot row: the dot its result goes into, and what the frame gives. */}
          <footer className="pb-closes">
            <span className="pb-ins">
              <span className="pb-in">{dot(inPort(node.id, r.name), tr(`${nameOf(node)} 的${L(parts.portLabel?.(node, r.name) ?? '')}`, `${nameOf(node)} ${L(parts.portLabel?.(node, r.name) ?? '')}`), `is-in ${feeding(graph, node.id, r.name) ? 'is-wired' : 'is-open'}`)}</span>
            </span>
            <em>{L(parts.portLabel?.(node, r.name) ?? '')}</em>
            {resultNote?.(node, r.name)}
          </footer>
        </section>
      )
      row += rows + 2
      return section
    })
    const width = fixed ? null : widthOf(node.id)
    return (
      <div key={node.id} className="pb-cell is-frame" data-slot={slot} data-region={region ?? ''} style={style}>
        <div className={`pb-frame ${parts.packed?.(node) ? 'is-packed' : ''} ${nodeClass?.(node) ?? ''} ${moving === node.id ? 'is-moving' : ''}`} data-piece={node.id} data-family={parts.family(node)} style={parts.cardStyle?.(node)}>
          {ports.length > 0 && <span className={`pb-ins ${ports.length > 1 ? 'is-many' : ''}`}>{ports}</span>}
          <div className="pb-frame-head" data-drag={fixed ? undefined : true} role="button" tabIndex={0} onClick={() => onNode(node.id)} aria-label={nameOf(node)}>
            <span className="pb-name">{icon(node)}{nameOf(node)}</span>
            {tileExtra?.(node) && <span className="pb-param">{tileExtra(node)}</span>}
          </div>
          {width && (
            <button type="button" className="pb-frame-width" onClick={() => width.set(!width.narrow)} aria-label={width.narrow ? tr('单列，点击切换为双列', 'One column; tap for two') : tr('双列，点击切换为单列', 'Two columns; tap for one')} title={width.narrow ? tr('单列', 'One column') : tr('双列', 'Two columns')}>
              {width.narrow ? <Square size={14} aria-hidden="true" /> : <Columns2 size={14} aria-hidden="true" />}
            </button>
          )}
          {sections}
          {outDots(node)}
        </div>
      </div>
    )
  }
  return (
    <div className={`pb-board ${dense ? 'is-dense' : ''}`} ref={board} data-picked={picking ?? undefined} data-moving={moving ?? undefined} data-wires={wires}>
      <div className="pb-tools">
        {!fixed && <SaveSlots phone board={{ graph, parts, change: onChange, types: onChange && types }} />}
        {/* Always there on an editable board; greyed out while there is nothing to clear (no onClear). */}
        {!fixed && <span className="pb-steps pb-clear"><ClearButton onClear={onClear} size={16} /></span>}
        {history && (
          <span className="pb-steps">
            <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label={tr('撤销', 'Undo')} title={tr('撤销', 'Undo')}><Undo2 size={16} /></button>
            <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label={tr('重做', 'Redo')} title={tr('重做', 'Redo')}><Redo2 size={16} /></button>
          </span>
        )}
        <button type="button" className="pb-wiremode" onClick={cycle} aria-label={tr(`接线显示：${L(mode.label)}，点击切换为「${L(next.label)}」`, `Wires: ${L(mode.label)}; tap to switch to "${L(next.label)}"`)}>
          <mode.Icon size={15} aria-hidden="true" />
          <span>{L(mode.label)}</span>
        </button>
      </div>
      <svg className="pb-wires" aria-hidden="true" />
      <div className="pb-terms is-sources">
        {sources.map((node) => (
          <div key={node.id} className={`pb-term ${(parts.outputs?.(node)?.length ?? 0) > WIDE ? 'is-wide' : ''} ${nodeClass?.(node) ?? ''}`} data-family={parts.family(node)} data-io={tr('输入', 'IN')} style={parts.cardStyle?.(node)} role="button" tabIndex={0} onClick={() => onNode(node.id)}>
            {/* A source may take an input too (a reader told which layer to read). */}
            {parts.inputs(node).length > 0 && <span className={`pb-ins ${parts.inputs(node).length > 1 ? 'is-many' : ''}`}>{inputs(node)}</span>}
            <span className="pb-thumb">{thumb(node, 64)}</span>
            <span className="pb-name">{nameOf(node)}</span>
            {tileExtra?.(node) && <span className="pb-param">{tileExtra(node)}</span>}
            {outDots(node)}
          </div>
        ))}
      </div>

      {groups.length > 0 ? <div className="phone-stages">{groups.map((s, k) => {
        const expanded = openStage === s.id
        const outputs = [...new Set(s.outs.map((w) => w.from))]
        const Icon = expanded ? ChevronDown : ChevronRight
        return <section key={s.id} className={`phone-stage ${expanded ? 'is-expanded' : ''}`} data-stage={s.id}>
          {k > 0 && <span className="phone-stage-arrow" aria-hidden="true">↓</span>}
          <button type="button" className="phone-stage-head" aria-expanded={expanded} onClick={() => setOpenStage(expanded ? null : s.id)}><Icon size={16} /><b>{L(s.label)}</b><span className="phone-stage-chain">{s.nodes.map((id) => L(parts.label(graph.nodes.find((n) => n.id === id)))).join(' → ')}</span><span className="phone-stage-values">{outputs.map((src) => <span key={src}>{stages.value?.(src, 'card')}</span>)}</span></button>
          {expanded && grid(null, null, new Set(s.nodes), true)}
        </section>
      })}{grid(null, null, new Set(stages.loose))}</div> : grid(null)}

      <div className="pb-terms is-outputs" style={cols(sinks.length)}>
        {sinks.map((node) => (
          <div key={node.id} className={`pb-term is-output ${sinkClass?.(node) ?? ''} ${nodeClass?.(node) ?? ''}`} data-family={parts.family(node)} data-io={tr('输出', 'OUT')} role="button" tabIndex={0} onClick={() => onNode(node.id)}>
            <span className={`pb-ins ${parts.inputs(node).length > 1 ? 'is-many' : ''}`}>{inputs(node)}</span>
            {sinkBody ? sinkBody(node) : <span className="pb-thumb">{thumb(node, 64)}</span>}
            <span className="pb-name">{nameOf(node)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
