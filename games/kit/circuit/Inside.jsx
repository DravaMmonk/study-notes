import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, Pencil } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import Sheet from '../shell/Sheet.jsx'
import CanvasEditor from './CanvasEditor.jsx'
import PartActions from './PartActions.jsx'
import SlotBoard from './SlotBoard.jsx'
import { insideAt } from '../engine/trace.js'

// The board a packed part runs (a part the player built: engine/boards.js packed), opened on the board it sits on, the
// same in every game (games/DESIGN.md 6.3, 封装件能打开看里面). It is read only and never drawn inside another board:
// on a desktop the part's detail window shows it (InsideBoard), on a phone the part's sheet (InsidePhone). Every card on
// it shows what it gives in the part's latest run so far (engine/trace.js insideAt), the card the current step is in or
// computing lit; a packed part on it opens its own detail window over this one.
//
// `inside` (insideOf) says what each packed part runs and how a card on it is drawn.

const nothing = { values: new Map(), errors: new Map(), lit: null }

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
 * `view` ({ values, errors, lit }) or null, is(node, board), edit, … }.
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

/** A packed part's tools in its card's header on a desktop: edit (go to the level that builds it) and its details. */
export function PackedTools({ onEdit, onDetail }) {
  return (
    <>
      <button type="button" className="node-tool" aria-label={tr('编辑', 'Edit')} title={tr('在搭出它的关卡中编辑', 'Edit in the level that builds it')} onPointerDown={stop} onClick={onEdit}><Pencil size={12} /></button>
      <button type="button" className="node-tool" aria-label={tr('详情', 'Details')} title={tr('查看详情', 'Inspect details')} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); onDetail() }}><Info size={13} /></button>
    </>
  )
}

/** On a desktop: the board inside the part at `path`, in its detail window. */
export function InsideBoard({ inside, path }) {
  const [detail, setDetail] = useState(null)
  const box = useRef(null)
  const at = inside.at(path)
  if (!at) return null
  const { card } = inside
  const parts = edgeParts(at.parts)
  const ctx = ctxOf(at, path)
  const isPart = (node) => parts.role(node) === 'part'
  const node = detail && at.circuit.nodes.find((n) => n.id === detail)
  return (
    <div className="cl-inside" ref={box} onPointerDown={stop}>
      <CanvasEditor
        key={path.join('/')}
        readOnly
        focus={at.view.lit}
        graph={edged(at.circuit, parts)}
        parts={parts}
        width={inside.width}
        height={inside.height}
        head={(n) => <>{card.head?.(n, ctx)}{inside.is(n, at) && <PackedTools onEdit={() => inside.edit(n, at)} onDetail={() => setDetail(n.id)} />}</>}
        body={(n) => (isPart(n) ? card.body?.(n, ctx) : null)}
        caption={card.caption && ((n) => card.caption(n, ctx))}
        outNote={card.outNote && ((n, key) => card.outNote(n, key, ctx))}
        cardClass={(n) => (isPart(n) ? `${card.cardClass?.(n, ctx) ?? ''} ${n.id === at.view.lit ? 'is-step' : ''}` : 'cl-edge')}
        wireState={(wire) => card.wireState(wire, ctx)}
      />
      {node && createPortal(
        <PackedDetail inside={inside} node={node} at={at} path={[...path, node.id]} onClose={() => setDetail(null)} />,
        // Beside the window it opens from, so it is drawn in the game's own styles.
        box.current?.closest('.ph-scrim')?.parentElement ?? document.body,
      )}
    </div>
  )
}

/** On a desktop: a packed part's detail window, its description and body, the board it runs and its edit button. */
export function PackedDetail({ inside, node, at, path, onClose, children }) {
  const ctx = ctxOf(at, path.slice(0, -1))
  return (
    <Sheet title={L(at.parts.label(node))} onClose={onClose} footer={<PartActions onEdit={() => { onClose(); inside.edit(node, at) }} />}>
      <div className="cl-sheet">
        {children ?? <>{inside.describe(node, ctx)}{inside.sheet(node, ctx)}</>}
        <InsideBoard inside={inside} path={path} />
      </div>
    </Sheet>
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
