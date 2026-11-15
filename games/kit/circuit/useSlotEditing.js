import { srcNode } from '../engine/wire-source.js'
import { slotPortAt } from './slot-ports.js'
import { useEffect, useRef, useState } from 'react'
import { enableDrag } from '../drag.js'
import { L, tr } from '../shell/i18n.js'
import { NO_CARD_PORT, portOnCard } from './card-ports.js'
import { byId, canRemoveCard, connectWire, ends, fitsSlotEdit, isPart, layout, parsePort, placement, removeNode, unplugWire, wireRefusal } from './model.js'
import { keepLocked, leavesLockedRegion, lockedCards, PRESET_CARD_REFUSAL } from './presets.js'
import { drawWires } from './SlotBoard.jsx'
import { blockAtSlot, movePhonePart, transferBlockMembers } from './blocks.js'
import { regionAddress, regionsFit, regionsOf } from './regions.js'
import { useHistory } from './useHistory.js'
import { usePickedPort } from './usePickedPort.js'
import { visibleSlot } from './visibleSlot.js'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)
export const NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

/**
 * How the phone board is edited, the same in every game. Wires go dot to dot: tap one dot, then another (or the
 * block itself), or drag between them; tapping a wired input unplugs it. Parts come from the tray: tap to drop into
 * the next free slot, or hold and drag into a slot; holding a placed part moves it, and dragging it back onto the
 * tray removes it. A part's sheet can also start a move (startMove): the next slot tapped takes it, and tapping another
 * part swaps the two. A frame's regions are grids of their own (model.js placement): a slot there is the same, and a
 * part dragged into one moves into the frame, or out of it onto the board. Every change can be undone and redone (useHistory).
 *
 * @param graph, onChange(graph), parts            the circuit and the game's description of its nodes (model.js)
 * @param create(graph, type, at, region) → { graph, id }  add a part of `type` in slot `at` of `region` (null: the
 *                                                 board itself; the game makes its nodes)
 * @param label(node)                              a block's own name (without its number)
 * @param openNode(id), openSlot(at, region)       the game's sheets for a block and an empty slot
 * @param root, scroller                           refs to the element that holds the board and tray, and to the board's
 *                                                 scrolling pane (drags start inside `root` and scroll `scroller`)
 * @param scope                                    names the board for undo (a level's stage)
 * @returns state and handlers for SlotBoard (`history`: its undo and redo), Tray and Notice
 */
const NO_VISIBLE_SLOT = { zh: '眼前没有能放这个元件的空格位。', en: 'There is no visible slot for this part.' }
const DOES_NOT_FIT = { zh: '这个元件放不进这一格。', en: 'This part does not fit in this slot.' }

export function useSlotEditing({ graph, onChange: given, parts, create, label, openNode, openSlot, root, scroller, scope, canMove = () => true }) {
  const [picking, setPicking] = usePickedPort(graph, parts)
  const [moving, setMoving] = useState(null) // a part's id, while choosing the slot it moves to
  // A change never takes off what the level locked on the board (presets.js keepLocked).
  const onChange = (next, options) => given(keepLocked(graph, next), options)
  const history = useHistory(graph, onChange, scope)
  const [toast, setToast] = useState(null) // a { zh, en } pair, read in the current language when shown
  const { sources, steps, sinks } = layout(graph, parts)
  const protectedIds = lockedCards(graph)
  const canRemove = (node) => canRemoveCard(parts, node, protectedIds)
  const wouldLeave = (node, region) => leavesLockedRegion(protectedIds, node, region)
  // Parts are numbered in reading order: the board's slots, and a frame's regions right after the frame.
  const orderOf = (g) => {
    const ordered = []
    const walk = (region) => {
      const { cell } = placement(g, parts, region)
      for (const id of [...cell.keys()].sort((x, y) => cell.get(x) - cell.get(y))) {
        ordered.push(id)
        for (const r of regionsOf(parts, byId(g, id))) walk(regionAddress(id, r.name))
      }
    }
    walk(null)
    return ordered
  }
  const ordered = orderOf(graph)
  // A part's name with its number on board `g` (the board as it is, or as it is about to be).
  const nameIn = (g, node, order = g === graph ? ordered : orderOf(g)) => {
    if (!node) return ''
    if (!isPart(parts, node)) return L(label(node))
    const index = order.indexOf(node.id)
    return `${NUMBERS[index] ?? `#${index + 1}`} ${L(label(node))}`
  }
  const nameOf = (node) => nameIn(graph, node)
  const edit = (next, note) => {
    onChange(next)
    setToast(note ?? null)
  }
  const step = (go) => () => {
    buzz()
    go()
    setToast(null)
    setPicking(null)
  }
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(timer)
  }, [toast])

  // Wiring: a source (an output dot) to a sink (an input dot), in either order.
  const canLand = (p) => {
    const wire = picking && ends(picking, p)
    return Boolean(wire && !wireRefusal(graph, parts, wire))
  }
  const wire = (a, b) => {
    const next = connectWire(graph, parts, ends(a, b))
    if (next.reason) {
      buzz(20)
      setToast(next.reason)
      return false
    }
    buzz()
    edit(next.graph)
    return true
  }
  const onPort = (p) => {
    const side = parsePort(p)
    setMoving(null)
    if (!picking) {
      if (side.side === 'in') {
        const next = unplugWire(graph, side.id, side.port)
        if (next.reason) {
          buzz(20)
          setToast(next.reason)
          return
        }
        if (next.from !== null) {
          buzz([6, 30, 6])
          edit(next.graph, { zh: '拆掉了一根线', en: 'Unplugged a wire' })
          return
        }
      }
      buzz(4)
      setPicking(p)
      return
    }
    if (picking === p) return setPicking(null)
    if (parsePort(picking).side === side.side) return setPicking(p)
    if (wire(picking, p)) setPicking(null)
  }
  const wireToCard = (p, id) => {
    const to = portOnCard(graph, parts, p, byId(graph, id))
    if (to) return wire(p, to)
    setToast(NO_CARD_PORT)
    return false
  }
  const movePart = (id, at, region) => {
    const node = byId(graph, id)
    setMoving(null)
    if (!node) return
    if (wouldLeave(node, region)) return setToast(PRESET_CARD_REFUSAL)
    const moved = movePhonePart(graph, parts, id, at, region, canMove)
    if (!moved) return setToast(DOES_NOT_FIT)
    if (moved.graph === graph) return
    const name = nameOf(node)
    const other = moved.other && nameOf(byId(graph, moved.other))
    buzz()
    edit(moved.graph, other
      ? { zh: `「${name}」和「${other}」换了位置`, en: `Swapped "${name}" and "${other}"` }
      : { zh: `把「${name}」移到了这一格`, en: `Moved "${name}" here` })
  }
  const startMove = (id) => {
    if (!canMove(id) || parts.role(byId(graph, id) ?? {}) !== 'part') return
    setPicking(null)
    setMoving(id)
  }
  // While a dot is picked, tapping a block wires it too; while a part is moving, tapping another part swaps them;
  // otherwise it opens the block's sheet.
  const onNode = (id) => {
    if (moving) {
      const node = byId(graph, id)
      const slot = placement(graph, parts, node.in ?? null).cell.get(id)
      if (id === moving || !isPart(parts, node) || slot === undefined) return setMoving(null)
      return movePart(moving, slot, node.in ?? null)
    }
    if (picking) {
      if (wireToCard(picking, id)) setPicking(null)
      return
    }
    buzz(4)
    openNode(id)
  }
  const onSlot = (at, region = null) => {
    setPicking(null)
    if (moving) return movePart(moving, at, region)
    openSlot?.(at, region)
  }

  const resizeFrame = (id, span) => {
    history.separate()
    setToast(null)
    setPicking(null)
    setMoving(null)
    onChange({ ...graph, nodes: graph.nodes.map((node) => {
      if (node.id !== id) return node
      const { span: _span, ...rest } = node
      return span === undefined ? rest : { ...rest, span }
    }) }, { keep: true })
  }

  // Placing parts. Wiring is always the player's.
  const placeMade = (made, at, region) => {
    const { id } = made
    const next = graph.blocks === undefined ? made.graph : transferBlockMembers(made.graph,parts,[{id,block:blockAtSlot(graph,parts,at,region)}])
    const name = nameIn(next, byId(next, id))
    buzz()
    edit(next, { zh: `放下了「${name}」 · 从圆点拉线接上`, en: `Placed "${name}" · wire it up from the dots` })
  }
  const partAt = (type, slot, region) => {
    const before = placement(graph, parts, region)
    if (!before.free.includes(slot)) return null
    const candidate = create(graph, type, slot, region)
    const node = byId(candidate.graph, candidate.id)
    if (!isPart(parts, node) || (node.in ?? null) !== region || !regionsFit(candidate.graph, parts)) return null
    const slots = new Map(before.cell).set(node.id, slot)
    return fitsSlotEdit(placement(candidate.graph, parts, region), slots) ? candidate : null
  }
  const place = (type, at, region = null) => {
    const made = partAt(type, at, region)
    if (made) placeMade(made, at, region)
    else setToast(DOES_NOT_FIT)
  }
  const placeFirstFree = (type) => {
    const pane = scroller.current
    const board = root.current?.querySelector('.pb-board')
    if (!pane || !board) return
    const bounds = pane.getBoundingClientRect()
    const tools = board.querySelector('.pb-tools')?.getBoundingClientRect()
    const top = Math.max(0, bounds.top, tools && tools.top <= bounds.top ? tools.bottom : bounds.top)
    const bottom = Math.min(window.innerHeight, bounds.bottom)
    const slots = [...board.querySelectorAll('.pb-cell > .pb-slot')].map((button) => {
      const rect = button.getBoundingClientRect()
      const { slot, region } = button.parentElement.dataset
      return { slot: Number(slot), region: region || null, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
    })
    let made
    const target = visibleSlot(slots, { top, bottom, left: Math.max(0, bounds.left), right: Math.min(window.innerWidth, bounds.right) }, ({ slot, region }) => {
      made = partAt(type, slot, region)
      return Boolean(made)
    })
    setPicking(null)
    setMoving(null)
    if (target) placeMade(made, target.slot, target.region)
    else setToast(NO_VISIBLE_SLOT)
  }
  const remove = (id) => {
    if (protectedIds.has(id)) return setToast(PRESET_CARD_REFUSAL)
    const node = byId(graph, id)
    if (!canRemove(node)) return
    buzz([6, 40, 6])
    setMoving(null)
    edit(removeNode(graph, parts, id), { zh: `删除了「${nameOf(node)}」`, en: `Deleted "${nameOf(node)}"` })
  }

  // Drag and drop on the board, the tray and the dots, through the kit's drag.js. Handlers read the latest state
  // through a ref.
  const latest = useRef(null)
  useEffect(() => {
    latest.current = { graph, parts, wire, place, movePart, remove, canMove, unpick: () => setPicking(null), wireToCard }
  })
  useEffect(() => {
    const el = root.current
    if (!el) return undefined
    const board = () => el.querySelector('.pb-board')
    const handlers = {
      scroller: scroller.current,
      portAt: slotPortAt,
      start: (g) => g.kind === 'port' && latest.current.unpick(),
      // drag.js has applied the part's transform before this callback; read the moved ports, including frame contents.
      move: (g) => {
        const el = board()
        if (el) drawWires(el, latest.current.graph, latest.current.parts, g.kind === 'port' ? { from: g.id, x: g.x, y: g.y } : undefined)
      },
      drop: (g) => {
        const now = latest.current
        const over = g.over
        const slot = over?.dataset.slot !== undefined && over ? Number(over.dataset.slot) : null
        const region = over?.dataset.region || null
        if (g.kind === 'port' && over) {
          if (over.dataset.p && over.dataset.p !== g.id) now.wire(g.id, over.dataset.p)
          else if (over.dataset.piece) now.wireToCard(g.id, over.dataset.piece)
        }
        if (g.kind === 'tray' && slot !== null) now.place(g.id, slot, region)
        if (g.kind === 'piece' && over) {
          if (slot !== null) now.movePart(g.id, slot, region)
          else if (now.canMove(g.id)) now.remove(g.id)
        }
        if (board()) drawWires(board(), now.graph, now.parts)
      },
      end: () => board() && drawWires(board(), latest.current.graph, latest.current.parts),
    }
    return enableDrag(el, () => handlers)
  }, [])

  // While a dot is picked, or a part is moving, the banner says what to tap next.
  const pickNote = moving ? tr(`把「${nameOf(byId(graph, moving))}」移到哪一格？请点击目标格子`, `Where should "${nameOf(byId(graph, moving))}" go? Tap a slot`) : picking && (() => {
    const p = parsePort(picking)
    const node = byId(graph, srcNode(p.id))
    const many = parts.inputs(node).length > 1
    return p.side === 'out'
      ? tr(`「${nameOf(node)}」要接到哪里？请点击一个输入口（元件顶部的圆点）或目标元件`, `Where should "${nameOf(node)}" connect? Tap an input (a dot on top of a part) or the part itself`)
      : tr(`「${nameOf(node)}」${many ? `的 ${L(parts.portLabel?.(node, p.port) ?? p.port)} ` : ''}读哪个结果？点一个输出口（元件底下的圆点），或点那个元件`, `Which result does "${nameOf(node)}"${many ? ` ${L(parts.portLabel?.(node, p.port) ?? p.port)}` : ''} read? Tap an output (a dot under a part), or the part itself`)
  })()

  return {
    picking, moving, startMove, unpick: () => { setPicking(null); setMoving(null) }, canLand, onPort, onNode, onSlot, nameOf,
    place, placeFirstFree, resizeFrame, remove, canRemove, edit, toast, say: setToast, pickNote,
    history: { ...history, undo: step(history.undo), redo: step(history.redo) },
    sources, steps, sinks,
  }
}
