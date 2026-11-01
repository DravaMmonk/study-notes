import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import Sheet from '../shell/Sheet.jsx'
import CanvasEditor from './CanvasEditor.jsx'
import PartActions from './PartActions.jsx'
import SlotBoard from './SlotBoard.jsx'
import { insideAt } from '../engine/trace.js'

// The board a packed part runs (a part the player built: engine/boards.js packed), opened on the board it sits on, the
// same in every game (games/DESIGN.md 6.3, 封装件能打开看里面). It is read only: on a desktop the part's card unfolds
// to show it (InsideBoard), on a phone the part's sheet shows it (InsidePhone). Every card on it shows what it gives in
// the part's latest run so far (engine/trace.js insideAt), the card the current step is in or computing lit; a packed
// part on it opens the same way, here only (not saved).
//
// `inside` (insideOf) says what each packed part runs and how a card on it is drawn.

const nothing = { values: new Map(), errors: new Map(), lit: null }
// An unfolded packed part is at least this wide on a desktop, to show the board inside it.
const OPEN_W = 440

/**
 * What the boards inside packed parts show, from the board they sit on (`top`: { circuit, parts, … }):
 *
 *   open(node, board) → { circuit, parts, … } the board a packed part on `board` runs (null: not a packed part)
 *   edit(node, board)  go to the level that builds it
 *   trace?() → { trace, upTo?, step? } the traced evaluation the top board shows now (engine/circuit.js ctx.trace),
 *              asked for once a part is open; without it the boards inside show how they are wired, without values
 *   card       a card's faces, each (node, ctx), ctx = { view, board, path, readOnly } (shell/CircuitLevel.jsx)
 *   describe, sheet (node, ctx)   a part's description and its sheet's body, on a phone
 *   width, height, dense          the cards' width, the board's height for fitting; a phone board of text
 *
 * Returns { at(path) → the board at `path` (the ids of the parts it is in, outermost first, and its own) with its
 * `view` ({ values, errors, lit }) or null, is(node, board), edit, widen(parts, board) (an unfolded part made wide
 * enough to show its board), … }.
 */
export function insideOf({ top, open, edit, trace, card, describe = () => null, sheet = () => null, width = 140, height, dense = true }) {
  const boards = new Map([['', top]])
  const boardAt = (path) => {
    const key = path.join('/')
    if (!boards.has(key)) {
      const outer = boardAt(path.slice(0, -1))
      const node = outer?.circuit.nodes.find((n) => n.id === path.at(-1))
      boards.set(key, node ? open(node, outer) : null)
    }
    return boards.get(key)
  }
  let traced
  const traceOf = () => (traced === undefined ? (traced = trace?.() ?? null) : traced)
  const is = (node, at) => Boolean(open(node, at))
  return {
    at: (path) => {
      const at = boardAt(path)
      const t = at && traceOf()
      return at && { ...at, view: t ? insideAt(t.trace, path, t) : nothing }
    },
    is,
    edit,
    widen: (parts, at) => ({ ...parts, cardWidth: (n) => { const w = parts.cardWidth?.(n); return n.open && is(n, at) ? Math.max(w ?? 0, OPEN_W) : w } }),
    card: { wireState: (wire, ctx) => (ctx.view.values.get(wire.from) !== undefined ? 'live' : 'dead'), ...card },
    describe: (node, ctx) => describe(node, ctx) ?? null,
    sheet: (node, ctx) => sheet?.(node, ctx) ?? null,
    width,
    height,
    dense,
  }
}

/** A packed part's board on its own, read only (the components box): the board inside it, opened at its root. */
export function PackedBoard({ phone, ...opts }) {
  const inside = insideOf(opts)
  return phone ? <InsidePhone inside={inside} path={[]} /> : <InsideBoard inside={inside} path={[]} />
}

const stop = (event) => event.stopPropagation()
const ctxOf = (at, path) => ({ view: at.view, board: at, path, readOnly: true })

/**
 * A board drawn inside a part on a desktop: its inputs and its result are not cards but the part's own ports, drawn
 * small (cl-edge) on the board's left and right edges, beside the parts they feed or come from, so a wire from an input
 * or to the result still shows how the part is wired and in what order.
 */
export function edged(circuit, parts) {
  const isEnd = (n) => parts.role(n) !== 'part'
  const placed = circuit.nodes.filter((n) => !isEnd(n) && !n.in)
  if (!placed.length) return circuit
  const x0 = Math.min(...placed.map((n) => n.x))
  const x1 = Math.max(...placed.map((n) => n.x + (parts.cardWidth?.(n) ?? 160)))
  const y0 = Math.min(...placed.map((n) => n.y))
  let [ins, outs] = [0, 0]
  const nodes = circuit.nodes.map((n) => {
    if (!isEnd(n)) return n
    return parts.role(n) === 'source' ? { ...n, x: x0 - 150, y: y0 + 60 * ins++ } : { ...n, x: x1 + 60, y: y0 + 60 * outs++ }
  })
  return { ...circuit, nodes }
}
/** The parts of such a board: its inputs and result are narrow. */
export const edgeParts = (parts) => ({ ...parts, cardWidth: (n) => (parts.role(n) === 'part' ? parts.cardWidth?.(n) : 90) })

/** A packed part's tools in its card's header: edit (go to the level that builds it) and unfold the card to show its board. */
export function PackedTools({ node, onEdit, onToggle }) {
  return (
    <>
      <button type="button" className="node-tool" aria-label={tr('编辑', 'Edit')} title={tr('在搭出它的关卡中编辑', 'Edit in the level that builds it')} onPointerDown={stop} onClick={onEdit}><Pencil size={12} /></button>
      <button type="button" className="node-tool" aria-pressed={Boolean(node.open)} aria-label={node.open ? tr('折叠', 'Collapse') : tr('展开', 'Expand')} onPointerDown={stop} onClick={onToggle}>{node.open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
    </>
  )
}

/** On a desktop: the board inside the part at `path`, in its unfolded card. */
export function InsideBoard({ inside, path }) {
  const [opened, setOpened] = useState(() => new Set())
  const at = inside.at(path)
  if (!at) return null
  const { card } = inside
  const parts = edgeParts(at.parts)
  const shown = edged(at.circuit, parts)
  const graph = { ...shown, nodes: shown.nodes.map((n) => (opened.has(n.id) ? { ...n, open: true } : n)) }
  const toggle = (node) => setOpened((was) => {
    const next = new Set(was)
    if (!next.delete(node.id)) next.add(node.id)
    return next
  })
  const ctx = ctxOf(at, path)
  const isPart = (node) => parts.role(node) === 'part'
  return (
    <div className="cl-inside" onPointerDown={stop}>
      <CanvasEditor
        key={path.join('/')}
        readOnly
        focus={at.view.lit}
        graph={graph}
        parts={inside.widen(parts, at)}
        width={inside.width}
        height={inside.height}
        head={(node) => <>{card.head?.(node, ctx)}{inside.is(node, at) && <PackedTools node={node} onEdit={() => inside.edit(node, at)} onToggle={() => toggle(node)} />}</>}
        body={(node) => (isPart(node) ? <>{card.body?.(node, ctx)}{node.open && inside.is(node, at) && <InsideBoard inside={inside} path={[...path, node.id]} />}</> : null)}
        caption={card.caption && ((node) => card.caption(node, ctx))}
        outNote={card.outNote && ((node, key) => card.outNote(node, key, ctx))}
        cardClass={(node) => (isPart(node) ? `${card.cardClass?.(node, ctx) ?? ''} ${node.id === at.view.lit ? 'is-step' : ''}` : 'cl-edge')}
        wireState={(wire) => card.wireState(wire, ctx)}
      />
    </div>
  )
}

/**
 * On a phone, in the part's sheet: the board inside the part at `path` on the phone's slot board, read only, in a
 * window of a fixed height that scrolls, the block the current step is in lit and scrolled to. Tapping a block opens its
 * own sheet over this one (its description and value; a packed part's board in turn, and its edit button).
 */
export function InsidePhone({ inside, path }) {
  const [detail, setDetail] = useState(null)
  const box = useRef(null)
  const at = inside.at(path)
  const lit = at?.view.lit
  useLayoutEffect(() => {
    const el = box.current
    const block = el && lit && el.querySelector(`[data-piece="${CSS.escape(lit)}"]`)
    if (!block) return
    // Scroll the window only, never the sheet or the page.
    const top = block.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
    el.scrollTop = Math.max(0, top - el.clientHeight / 3)
  }, [lit])
  if (!at) return null
  const { card } = inside
  const ctx = ctxOf(at, path)
  const parts = at.parts
  const node = detail && at.circuit.nodes.find((n) => n.id === detail)
  return (
    <div className="cl-inside-phone">
      <div className="cl-inside-scroll" ref={box}>
        <SlotBoard
          fixed
          dense={inside.dense}
          graph={at.circuit}
          parts={parts}
          nameOf={(n) => L(parts.label(n))}
          thumb={(n) => card.thumb?.(n, ctx)}
          tileExtra={card.tileExtra && ((n) => card.tileExtra(n, ctx))}
          sinkBody={(n) => card.sinkBody?.(n, ctx) ?? null}
          outNote={card.outNote && ((n, key) => card.outNote(n, key, ctx))}
          nodeClass={(n) => (n.id === lit ? 'is-step' : '')}
          regionNote={card.regionNote && ((n, region) => card.regionNote(n, region, ctx))}
          resultNote={card.resultNote && ((n, region) => card.resultNote(n, region, ctx))}
          onPort={() => {}}
          onSlot={() => {}}
          onNode={(id) => parts.role(at.circuit.nodes.find((n) => n.id === id) ?? {}) === 'part' && setDetail(id)}
        />
      </div>
      {node && createPortal(
        <Sheet title={L(parts.label(node))} onClose={() => setDetail(null)}>
          <div className="cl-sheet cl-readonly">
            {inside.describe(node, ctx)}
            {inside.sheet(node, ctx)}
            {inside.is(node, at) && <InsidePhone inside={inside} path={[...path, node.id]} />}
            {inside.is(node, at) && <PartActions onEdit={() => { setDetail(null); inside.edit(node, at) }} />}
          </div>
        </Sheet>,
        // Beside the sheet it opens from, so it is drawn in the game's own styles.
        box.current?.closest('.ph-scrim')?.parentElement ?? document.body,
      )}
    </div>
  )
}
