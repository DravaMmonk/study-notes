import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import Sheet from '../shell/Sheet.jsx'
import { lookupBoard } from './packed-boards.js'
import { portNotes } from './card-ports.js'
import Schematic from './Schematic.jsx'
import TerminalInfo from './TerminalInfo.jsx'
import { insideAt } from '../engine/trace.js'

// The board a packed part runs (a part the player built: engine/boards.js packed), opened on the board it sits on, the
// same in every game (games/DESIGN.md 6.3, 封装件能打开看里面). It is read only and never drawn inside another board:
// the part's detail window (desktop) or sheet (phone) shows it as a schematic (InsideBoard, Schematic.jsx). Once the
// part has run, every chip on it shows what it gives in the part's latest run so far (engine/trace.js insideAt), the
// chip the current step is in or computing lit; a packed part on it opens its own window over this one.
//
// `inside` (insideOf) says what each packed part runs and how a card on it is drawn.

const nothing = { values: new Map(), errors: new Map(), lit: null }

/**
 * What the boards inside packed parts show, from the board they sit on (`top`: { circuit, parts, … }):
 *
 *   open(node, board) → { circuit, parts, … } the board a packed part on `board` runs (null: not a packed part)
 *   edit(node, board)  return an action that opens the level that builds it, when there is one
 *   trace?() → { trace, upTo?, step? } the traced evaluation the top board shows now (engine/circuit.js ctx.trace),
 *              asked for once a part is open; without it the boards inside show how they are wired, without values
 *   card       a card's faces, each (node, ctx), ctx = { view, board, path, readOnly } (shell/CircuitLevel.jsx)
 *   describe, sheet (node, ctx)   a part's description and its sheet's body
 *
 * Returns { at(path) → the board at `path` (the ids of the parts it is in, outermost first, and its own) with its
 * `view` ({ values, errors, lit }) or null, is(node, board), edit, … }.
 */
export function insideOf({ top, open, edit, trace, card, describe = () => null, sheet = () => null }) {
  const boardAt = lookupBoard(top, open)
  let traced
  const traceOf = () => (traced === undefined ? (traced = trace?.() ?? null) : traced)
  const is = (node, at) => Boolean(node && open(node, at))
  return {
    at: (path) => {
      const at = boardAt(path)
      const t = at && traceOf()
      return at && { ...at, view: t ? insideAt(t.trace, path, t) : nothing }
    },
    is,
    edit,
    card,
    describe: (node, ctx) => describe(node, ctx) ?? null,
    sheet: (node, ctx) => sheet?.(node, ctx) ?? null,
  }
}

/** A packed part's board on its own, read only (the components box): the board inside it, opened at its root. */
export function PackedBoard(opts) {
  return <InsideBoard inside={insideOf(opts)} path={[]} />
}

const ctxOf = (at, path) => ({ view: at.view, board: at, path, readOnly: true })

/** Edit (go to the level that builds the part) beside a read-only detail window's close button. */
const EditAction = ({ onEdit }) => <button type="button" className="ph-head-action" onClick={onEdit} title={tr('在搭出它的关卡中编辑')}><Pencil size={13} />{tr('编辑', 'Edit')}</button>

/** On a desktop: a packed part's detail window, its description and body and the board it runs; edit beside close. */
export function PackedDetail({ inside, node, at, path, onClose, children }) {
  const ctx = ctxOf(at, path.slice(0, -1))
  const edit = inside.edit(node, at)
  return (
    <Sheet title={L(at.parts.label(node))} onClose={onClose} actions={edit && <EditAction onEdit={() => { onClose(); edit() }} />}>
      <div className="cl-sheet">
        {children ?? <>{inside.describe(node, ctx)}{inside.sheet(node, ctx)}</>}
        <InsideBoard inside={inside} path={path} />
      </div>
    </Sheet>
  )
}

/**
 * In the part's detail window or sheet: the board inside the part at `path` as a schematic, in a window that scrolls
 * once the board outgrows it, the chip the current step is in lit and scrolled to.
 * A packed part on it opens its own sheet over this one (its description and value, its board in turn, edit beside close).
 */
export function InsideBoard({ inside, path }) {
  const [detail, setDetail] = useState(null)
  const box = useRef(null)
  const at = inside.at(path)
  const lit = at?.view.lit
  useLayoutEffect(() => {
    const el = box.current
    const chip = el && lit && el.querySelector(`[data-piece="${CSS.escape(lit)}"]`)
    if (!chip) return
    // Scroll the window only, never the sheet or the page.
    const top = chip.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
    el.scrollTop = Math.max(0, top - el.clientHeight / 3)
  }, [lit])
  if (!at) return null
  const { card } = inside
  const ctx = ctxOf(at, path)
  const parts = at.parts
  // A chip holds something only once the run has reached it: an untouched board is its wiring alone.
  const reached = (n) => at.view.values.has(n.id) || at.view.errors.has(n.id)
  const node = detail && at.circuit.nodes.find((n) => n.id === detail)
  const packedPart = node && parts.role(node) === 'part'
  const edit = packedPart && inside.edit(node, at)
  return (
    <div className="cl-inside" ref={box}>
      <Schematic
        graph={at.circuit}
        parts={parts}
        value={card.thumb && ((n) => (reached(n) ? card.thumb(n, ctx) : null))}
        param={card.tileExtra && ((n) => card.tileExtra(n, ctx))}
        {...portNotes(card, ctx)}
        lit={lit}
        onOpen={(id) => {
          const picked = at.circuit.nodes.find((n) => n.id === id)
          if (parts.role(picked) !== 'part' || inside.is(picked, at)) setDetail(id)
        }}
      />
      {node && createPortal(
        <Sheet title={L(parts.label(node))} onClose={() => setDetail(null)} actions={edit && <EditAction onEdit={() => { setDetail(null); edit() }} />}>
          <div className="cl-sheet cl-readonly">
            {inside.describe(node, ctx)}
            {inside.sheet(node, ctx)}
            {packedPart ? <InsideBoard inside={inside} path={[...path, node.id]} /> : <TerminalInfo node={node} parts={parts} />}
          </div>
        </Sheet>,
        // Beside the sheet it opens from, so it is drawn in the game's own styles.
        box.current?.closest('.ph-scrim')?.parentElement ?? document.body,
      )}
    </div>
  )
}
