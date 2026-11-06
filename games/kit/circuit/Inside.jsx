import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, Pencil } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import Sheet from '../shell/Sheet.jsx'
import SlotBoard from './SlotBoard.jsx'
import { insideAt } from '../engine/trace.js'

// The board a packed part runs (a part the player built: engine/boards.js packed), opened on the board it sits on, the
// same in every game (games/DESIGN.md 6.3, 封装件能打开看里面). It is read only and never drawn inside another board:
// the part's detail window (desktop) or sheet (phone) shows it as the phone's slot board (InsideBoard). Every card on it
// shows what it gives in the part's latest run so far (engine/trace.js insideAt), the card the current step is in or
// computing lit; a packed part on it opens its own window over this one.
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
 *   dense                         a slot board of text
 *
 * Returns { at(path) → the board at `path` (the ids of the parts it is in, outermost first, and its own) with its
 * `view` ({ values, errors, lit }) or null, is(node, board), edit, … }.
 */
export function insideOf({ top, open, edit, trace, card, describe = () => null, sheet = () => null, dense = true }) {
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
    dense,
  }
}

/** A packed part's board on its own, read only (the components box): the board inside it, opened at its root. */
export function PackedBoard(opts) {
  return <InsideBoard inside={insideOf(opts)} path={[]} />
}

const stop = (event) => event.stopPropagation()
const ctxOf = (at, path) => ({ view: at.view, board: at, path, readOnly: true })

/** Inspect a packed part from its compact header; editing stays in the detail window. */
export function PackedTools({ onDetail }) {
  return <button type="button" className="node-tool" aria-label={tr('详情', 'Details')} title={tr('查看详情', 'Inspect details')} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); onDetail() }}><Info size={13} /></button>
}

/** Edit (go to the level that builds the part) beside a read-only detail window's close button. */
const EditAction = ({ onEdit }) => <button type="button" className="ph-head-action" onClick={onEdit} title={tr('在搭出它的关卡中编辑', 'Edit in the level that builds it')}><Pencil size={13} />{tr('编辑', 'Edit')}</button>

/** On a desktop: a packed part's detail window, its description and body and the board it runs; edit beside close. */
export function PackedDetail({ inside, node, at, path, onClose, children }) {
  const ctx = ctxOf(at, path.slice(0, -1))
  return (
    <Sheet title={L(at.parts.label(node))} onClose={onClose} actions={<EditAction onEdit={() => { onClose(); inside.edit(node, at) }} />}>
      <div className="cl-sheet">
        {children ?? <>{inside.describe(node, ctx)}{inside.sheet(node, ctx)}</>}
        <InsideBoard inside={inside} path={path} />
      </div>
    </Sheet>
  )
}

/**
 * In the part's detail window or sheet: the board inside the part at `path` on the phone's slot board, read only, in a
 * window of a fixed height that scrolls, the block the current step is in lit and scrolled to. Tapping a block opens its
 * own sheet over this one (its description and value; a packed part's board in turn, edit beside close).
 */
export function InsideBoard({ inside, path }) {
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
        <Sheet title={L(parts.label(node))} onClose={() => setDetail(null)} actions={inside.is(node, at) && <EditAction onEdit={() => { setDetail(null); inside.edit(node, at) }} />}>
          <div className="cl-sheet cl-readonly">
            {inside.describe(node, ctx)}
            {inside.sheet(node, ctx)}
            {inside.is(node, at) && <InsideBoard inside={inside} path={[...path, node.id]} />}
          </div>
        </Sheet>,
        // Beside the sheet it opens from, so it is drawn in the game's own styles.
        box.current?.closest('.ph-scrim')?.parentElement ?? document.body,
      )}
    </div>
  )
}
