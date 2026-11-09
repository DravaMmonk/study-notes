import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Columns2, Group, Info, EyeOff, Plus, Redo2, Spline, Square, Undo2, Waypoints } from 'lucide-react'
import { blockRows, rowMembers } from './blocks.js'
import { foldedPartsOf } from './folding.js'
import BlockHeader from './BlockHeader.jsx'
import { WORDS } from '../shell/words.js'
import { useSetting } from '../shell/useSetting.js'
import { labelledConnections, sourceLabel, blockOwners, wireKey } from './connections.js'
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
  const tagged = new Set(JSON.parse(el.dataset.labelled ?? '[]'))
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
    if (!shown(w) || tagged.has(wireKey(w))) continue
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

export default function SlotBoard({ blocks = null, onPartitionHint, canMove = () => true, graph, parts, nameOf, thumb, tileExtra, sinkBody, sinkClass, picking, moving, canLand, onPort, onNode, onSlot, fixed = false, nodeClass, outNote, history, onClear, onChange, types, dense = false, regionNote, resultNote, widthOf = () => null }) {
  const board = useRef(null)
  const [linkCursor, setLinkCursor] = useState({ from: null, at: -1 })
  const [linkedSource, setLinkedSource] = useState(null)
  const [manualBlocks] = useSetting('manualBlocks')
  const [connectionLabels] = useSetting('connectionLabels')
  const [partitioning,setPartitioning]=useState(false)
  const [startRow,setStartRow]=useState(null)
  const [hoverRow,setHoverRow]=useState(null)
  const groups = blocks?.items ?? []
  const foldedParts = foldedPartsOf(graph, groups)
  const owner = blockOwners(groups)
  const labels = connectionLabels ? labelledConnections(graph, groups, parts, (w) => {
    const a = graph.nodes.find((n) => n.id === srcNode(w.from)), b = graph.nodes.find((n) => n.id === w.to)
    return [[a.x ?? 0, a.y ?? 0], [b.x ?? 0, b.y ?? 0]]
  }) : []
  const jump = (w, id) => {
    setLinkedSource(w.from)
    if (id === w.to) {
      const targets = labels.filter((wire) => wire.from === w.from)
      const index = linkCursor.from === w.from ? (linkCursor.at + 1) % targets.length : 0
      setLinkCursor({ from: w.from, at: index })
      id = targets[index].to
    }
    const stage = owner.get(id)
    if (stage) blocks.open(stage)
    requestAnimationFrame(() => board.current?.querySelector(`[data-piece="${CSS.escape(id)}"], [data-terminal="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }
  const tags = (ids) => {
    const incoming = new Set(), outgoing = new Set()
    return <span className="phone-wire-tags">{labels.flatMap((w) => {
      const src = srcNode(w.from), key = wireKey(w), name = sourceLabel(w, graph, parts)
      const out = ids.has(src) && !outgoing.has(w.from), into = ids.has(w.to) && !incoming.has(w.from)
      if (out) outgoing.add(w.from)
      if (into) incoming.add(w.from)
      return [out && <button key={`${key}:out`} type="button" data-wire-tag={key} className={linkedSource === w.from ? 'is-linked' : ''} onClick={(e) => { e.stopPropagation(); jump(w, w.to) }}>{name} →</button>, into && <button key={`${key}:in`} type="button" data-wire-tag={key} className={linkedSource === w.from ? 'is-linked' : ''} onClick={(e) => { e.stopPropagation(); jump(w, src) }}>← {name}</button>].filter(Boolean)
    })}</span>
  }
  useEffect(() => {
    if (!blocks?.active) return
    requestAnimationFrame(() => board.current?.querySelector(`[data-piece="${CSS.escape(blocks.active)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [blocks?.active])
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
  const pickRow=(row,placed)=>{
    if(startRow===null){setStartRow(row);setHoverRow(row)}
    else{blocks.create(rowMembers(graph,parts,startRow,row,placed));setStartRow(null);setPartitioning(false)}
  }
  useEffect(()=>{if(!manualBlocks){setPartitioning(false);setStartRow(null)}},[manualBlocks])
  useEffect(()=>{
    onPartitionHint?.(partitioning ? {
      text: L(startRow===null ? WORDS.partitionStart : WORDS.partitionEnd),
      cancel: ()=>{setPartitioning(false);setStartRow(null)},
    } : null)
  },[partitioning,startRow,onPartitionHint])
  // Up to four sinks to a row, the rows as even as they can be: five go 3 + 2, eight 4 + 4.
  const cols = (n) => ({ '--cols': n <= 4 ? n : Math.ceil(n / Math.ceil(n / 4)) })
  const regionsOf = (node) => parts.frames?.(node) ?? []
  const own = (node) => new Set(regionsOf(node).map((r) => r.name))

  // Wires are drawn after layout from where the dots really are, and again while a wire is dragged. A card's entry
  // animation moves its dots without resizing the board, so wires are drawn again once it ends.
  useLayoutEffect(() => {
    const el = board.current
    if (!el) return undefined
    const draw = () => drawWires(el, graph, parts)
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(el)
    el.addEventListener('animationend', draw)
    return () => {
      observer.disconnect()
      el.removeEventListener('animationend', draw)
    }
  })

  const dotClass = (p, extra = '') => {
    if (!picking) return extra
    if (p === picking) return `${extra} is-picked`
    return `${extra} ${canLand(p) ? 'is-target' : 'is-dim'}`
  }
  const used = (src) => graph.wires.some((w) => w.from === src)
  // A block's output dot, or (parts.outputs) a row of them, each under its short name and what it carries (outNote).
  // They wrap onto more rows inside the block; more than WIDE of them and the block takes a row of its own.
  const outDots = (node, folded = false) => {
    // A frame's regions give their values inside it; its own output is the one under the block.
    const listed = parts.outputs?.(node)?.filter((o) => !own(node).has(o.key)) ?? null
    const outs = listed && !(listed.length === 1 && listed[0].key === null) ? listed : null
    if (!outs) return <span className="pb-out">{dot(outPort(node.id), tr(`${nameOf(node)} 的输出`, `${nameOf(node)} output`), `is-out ${used(node.id) ? 'is-wired' : ''} ${parts.portClass?.(node, null) ?? ''}`)}</span>
    return (
      <span className="pb-out is-many">
        {outs.map((o) => {
          const src = srcOf(node, o.key)
          const note = !folded && outNote?.(node, o.key)
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
  function grid(region, style) {
    const placed=placement(graph,parts,region,{fixed}),{cell,span,cols,free,rows,size}=placed
    const ranges=region===null?blockRows(graph,parts,placed).map(b=>({...b,view:groups.find(g=>g.id===b.id)?.view??b.view})):[]
    const hidden=new Set(ranges.filter(b=>b.view==='hidden').flatMap(b=>Array.from({length:b.end-b.start},(_,k)=>b.start+k)))
    const rowTrack=new Map(),headTrack=new Map(),tracks=[]
    for(let row=0;row<rows;row++){
      for(const b of ranges.filter(b=>b.start===row)){headTrack.set(b.id,tracks.length+1);tracks.push('auto')}
      if(!hidden.has(row)){rowTrack.set(row,tracks.length+1);tracks.push(ranges.some(b=>b.view==='ports'&&row>=b.start&&row<b.end)?'minmax(var(--compact-slot-height),auto)':'minmax(var(--slot-height),auto)')}
    }
    const at=(slot,[w,h]=[1,1])=>({gridRow:`${region===null?rowTrack.get(Math.floor(slot/cols)):Math.floor(slot/cols)+1} / span ${h}`,gridColumn:`${slot%cols+1} / span ${w}`})
    const selected=(row)=>partitioning&&startRow!==null&&row>=Math.min(startRow,hoverRow??startRow)&&row<=Math.max(startRow,hoverRow??startRow)
    const out=[]
    const reveal=(b,id)=>{blocks.open(b.id);requestAnimationFrame(()=>board.current?.querySelector(`[data-piece="${CSS.escape(id)}"]`)?.scrollIntoView({block:'center'}))}
    for(const block of ranges){
      const first=headTrack.get(block.id),last=rowTrack.get(block.end-1)??first
      out.push(<div key={`head-${block.id}`} data-block={block.id} data-pick-row={block.start} className={`pb-block-head is-rule ${block.view==='hidden'?'is-hidden':''}`} style={{gridRow:first,gridColumn:`1 / span ${cols}`}}>
        <BlockHeader block={block} editable={!fixed} onEdit={(patch)=>blocks.edit(block.id,patch)} />
        {block.view==='hidden'&&<><span className="block-stubs is-input">{block.ins.map(w=><button key={`${w.to}.${w.port}`} className="pb-dot is-in is-wired" data-p={inPort(w.to,w.port)} aria-label={nameOf(graph.nodes.find(n=>n.id===w.to))} onClick={()=>reveal(block,w.to)}><i /></button>)}</span><span className="block-stubs is-output">{[...new Set(block.outs.map(w=>w.from))].map(src=><button key={src} className="pb-dot is-out is-wired" data-p={outPort(src)} aria-label={nameOf(graph.nodes.find(n=>n.id===srcNode(src)))} onClick={()=>reveal(block,srcNode(src))}><i /></button>)}</span>{tags(new Set(block.nodes))}</>}
      </div>)
      if(block.view!=='hidden')out.push(<div key={`end-${block.id}`} className="pb-block-end" aria-hidden="true" style={{gridRow:last,gridColumn:`1 / span ${cols}`}} />)
    }
    for(const [id,slot]of cell){
      const row=Math.floor(slot/cols)
      if(region===null&&hidden.has(row))continue
      const node=graph.nodes.find(n=>n.id===id),isFolded=foldedParts.has(id)
      if((parts.frames?.(node)??[]).length){out.push(frameBlock(node,slot,region,at(slot,span.get(id))));continue}
      const extra=!isFolded&&tileExtra?.(node)
      out.push(<div key={id} className={`pb-cell ${isFolded?'is-body-folded':''} ${selected(row)?'is-block-selected':''}`} data-slot={slot} data-pick-row={row} data-region={region??''} style={at(slot)}>
        <div className={`pb-tile ${isFolded?'is-body-folded':''} ${parts.packed?.(node)?'is-packed':''} ${nodeClass?.(node)??''} ${moving===id?'is-moving':''}`} data-piece={id} data-drag={fixed||partitioning||!canMove(id)?undefined:true} data-family={parts.family(node)} style={parts.cardStyle?.(node)} role="button" tabIndex={0} onClick={()=>onNode(id)} aria-label={nameOf(node)}>
          <span className={`pb-ins ${parts.inputs(node).length>1?'is-many':''}`}>{inputs(node)}</span>
          <span className="pb-name">{icon(node)}{nameOf(node)}<Info size={12} aria-hidden="true" /></span>
          {!isFolded&&<span className="pb-thumb">{thumb(node,84)}</span>}{extra&&<span className="pb-param">{extra}</span>}{outDots(node,isFolded)}
        </div>{tags(new Set([id]))}
      </div>)
    }
    for(const slot of free){
      const row=Math.floor(slot/cols)
      if(region===null&&hidden.has(row))continue
      out.push(<div key={`slot-${slot}`} className={`pb-cell ${ranges.some(b=>b.view==='ports'&&row>=b.start&&row<b.end)?'is-body-folded':''} ${selected(row)?'is-block-selected':''}`} data-slot={slot} data-pick-row={row} data-region={region??''} style={at(slot)}>{fixed?<div className="pb-cell is-blank" />:<button type="button" className="pb-slot" onClick={()=>onSlot(slot,region)} aria-label={tr('在这一格放置元件','Place a part in this slot')}><Plus size={20} /></button>}</div>)
    }
    return <div className={`pb-grid ${region?'is-region':'is-blocks'}`} data-cols={cols} data-size={size} style={{...style,...(region===null?{gridTemplateRows:tracks.join(' ')}:{})}} onClickCapture={region===null&&partitioning?(event)=>{const row=event.target.closest('[data-pick-row]')?.dataset.pickRow;if(row!==undefined){event.stopPropagation();event.preventDefault();pickRow(Number(row),placed)}}:undefined} onPointerOver={partitioning?(event)=>{const row=event.target.closest('[data-pick-row]')?.dataset.pickRow;if(row!==undefined)setHoverRow(Number(row))}:undefined}>{out}</div>
  }

  // A frame: rows of the grid it sits in, for each region a row for its head, the region's rows, and a row for its
  // foot, the dot its result goes into; its name (held to drag it) and inputs over them, its output under them.
  function frameBlock(node, slot, region, style) {
    const isFolded = foldedParts.has(node.id)
    const ports = inputs(node)
    let row = 1
    const regions = regionsOf(node).map((r) => {
      const rows = placement(graph, parts, `${node.id}/${r.name}`, { fixed }).rows
      const section = (
        <section key={r.name} className="pb-region" style={{ gridRow: `${row} / span ${rows + 2}` }}>
          {/* Its head row: its name, and the value it opens with the dot that gives it. */}
          <header className="pb-region-head">
            {regionsOf(node).length > 1 && <b>{L(r.label)}</b>}
            {r.opens && <em>{L(parts.outputs?.(node)?.find((o) => o.key === r.name)?.label ?? '')}</em>}
            {!isFolded && regionNote?.(node, r.name)}
            {r.opens && <span className="pb-out">{dot(outPort(srcOf(node, r.name)), tr(`${nameOf(node)} 的${L(r.label)}假设`, `${nameOf(node)} ${L(r.label)}: assumption`), `is-out ${used(srcOf(node, r.name)) ? 'is-wired' : ''}`)}</span>}
          </header>
          {grid(`${node.id}/${r.name}`, { gridRow: `2 / span ${rows}` })}
          {/* Its foot row: the dot its result goes into, and what the frame gives. */}
          <footer className="pb-closes">
            <span className="pb-ins">
              <span className="pb-in">{dot(inPort(node.id, r.name), tr(`${nameOf(node)} 的${L(parts.portLabel?.(node, r.name) ?? '')}`, `${nameOf(node)} ${L(parts.portLabel?.(node, r.name) ?? '')}`), `is-in ${feeding(graph, node.id, r.name) ? 'is-wired' : 'is-open'}`)}</span>
            </span>
            <em>{L(parts.portLabel?.(node, r.name) ?? '')}</em>
            {!isFolded && resultNote?.(node, r.name)}
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
          <div className="pb-frame-head" data-drag={fixed || !canMove(node.id) ? undefined : true} role="button" tabIndex={0} onClick={() => onNode(node.id)} aria-label={nameOf(node)}>
            <span className="pb-name">{icon(node)}{nameOf(node)}</span>
            {!isFolded && tileExtra?.(node) && <span className="pb-param">{tileExtra(node)}</span>}
          </div>
          {width && !isFolded && (
            <button type="button" className="pb-frame-width" onClick={() => width.set(!width.narrow)} aria-label={width.narrow ? tr('单列，点击切换为双列', 'One column; tap for two') : tr('双列，点击切换为单列', 'Two columns; tap for one')} title={width.narrow ? tr('单列', 'One column') : tr('双列', 'Two columns')}>
              {width.narrow ? <Square size={14} aria-hidden="true" /> : <Columns2 size={14} aria-hidden="true" />}
            </button>
          )}
          {regions}
          {outDots(node, isFolded)}
        </div>
      </div>
    )
  }
  return (
    <div className={`pb-board ${dense ? 'is-dense' : ''}`} ref={board} data-picked={picking ?? undefined} data-moving={moving ?? undefined} data-wires={wires} data-labelled={JSON.stringify(labels.map(wireKey))}>
      <div className="pb-tools">
        {!fixed && <SaveSlots phone board={{ graph, parts, change: onChange, types: onChange && types }} />}
        {/* Always there on an editable board; greyed out while there is nothing to clear (no onClear). */}
        {!fixed && <span className="pb-steps pb-clear"><ClearButton onClear={onClear} size={16} /></span>}
        {!fixed&&manualBlocks&&blocks&&<button type="button" className="pb-partition" aria-label={L(WORDS.partition)} aria-pressed={partitioning} onClick={()=>{setPartitioning(!partitioning);setStartRow(null)}}><Group size={16} /></button>}
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
          <div key={node.id} className={`pb-term ${(parts.outputs?.(node)?.length ?? 0) > WIDE ? 'is-wide' : ''} ${nodeClass?.(node) ?? ''}`} data-family={parts.family(node)} data-terminal={node.id} data-io={tr('输入', 'IN')} style={parts.cardStyle?.(node)} role="button" tabIndex={0} onClick={() => onNode(node.id)}>
            {/* A source may take an input too (a reader told which layer to read). */}
            {parts.inputs(node).length > 0 && <span className={`pb-ins ${parts.inputs(node).length > 1 ? 'is-many' : ''}`}>{inputs(node)}</span>}
            <span className="pb-thumb">{thumb(node, 64)}</span>
            <span className="pb-name">{nameOf(node)}</span>
            {tileExtra?.(node) && <span className="pb-param">{tileExtra(node)}</span>}
            {outDots(node)}
            {tags(new Set([node.id]))}
          </div>
        ))}
      </div>

      {grid(null)}

      <div className="pb-terms is-outputs" style={cols(sinks.length)}>
        {sinks.map((node) => (
          <div key={node.id} className={`pb-term is-output ${sinkClass?.(node) ?? ''} ${nodeClass?.(node) ?? ''}`} data-family={parts.family(node)} data-terminal={node.id} data-io={tr('输出', 'OUT')} role="button" tabIndex={0} onClick={() => onNode(node.id)}>
            <span className={`pb-ins ${parts.inputs(node).length > 1 ? 'is-many' : ''}`}>{inputs(node)}</span>
            {(sinkBody ? sinkBody(node) : <span className="pb-thumb">{thumb(node, 64)}</span>)}
            {tags(new Set([node.id]))}
            <span className="pb-name">{nameOf(node)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
