import { sourceOf, srcNode } from "../../core/wire-source.js"
import { sameJson } from 'kernel/view'

import { cardWidth } from "../../core/board/card-size.js"
import { useElementSize } from 'kernel/view'

import { usePointerSession } from 'kernel/view'

import useBlockDrag from "./useBlockDrag.js"
import { containerUnderPointer } from "../../core/board/dropTarget.js"
import { assignBlock, rectangleMembers } from "../../core/board/blocks.js"
import { WORDS } from '../words.js'

import BlockHeader from "./BlockHeader.jsx"
import { useSetting } from 'kernel/view'

import { useWorkspaceKeys } from 'kernel/view'

import { useEffect, useEffectEvent, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { foldedPartsOf } from "../../core/board/folding.js"
import ClearButton from "./ClearButton.jsx"
import { labelledConnections, sourceLabel, blockOwners, wireKey } from "../../core/board/connections.js"
import { layoutAt, pipelineLayout, reflowLayout } from "../../core/board/layout.js"
import SaveSlots from "./SaveSlots.jsx"
import { ChevronDown, ChevronRight, Maximize, Group, Minus, Plus, Redo2, Trash2, Undo2, X } from 'lucide-react'
import { cardAt } from '../drag.js'
import { enableDrag } from '../drag.js'

import { curve as kitCurve } from '../../core/wires.js'
import { pointIn } from '../coordinates.js'

import { L, tr } from 'kernel/view'

import Glyph from "./Glyph.jsx"
import { cardPorts, namesPorts, NO_CARD_PORT, portOnCard } from "../../core/board/card-ports.js"
import { moveInto } from "../../core/board/frames.js"
import { isOpenRegion, regionAddress, regionsOf } from "../../core/board/regions.js"
import { canRemoveCard, clearSpot, connectWire, ends, inPort, isPart, outPort, parsePort, removeNode, unplugWire, wireRefusal } from "../../core/board/model.js"
import { leavesLockedRegion, lockedCards, lockedRefusal, PRESET_CARD_REFUSAL } from "../../core/board/presets.js"
import { useCircuitEdits } from "./useCircuitEdits.js"
import { historyKey } from 'kernel/view'

import { usePickedPort } from "./usePickedPort.js"
import { alignTerminals, spaceNodes } from "../../core/board/spacing.js"

// The desktop circuit board, the same in every game: parts are cards, wires run from a card's output (a dot on its
// right) to another card's input (a dot on its left). Drag a card by its header to move it; drag from an output dot
// to an input dot, or onto a card, to wire it, or click one dot and then another (or the card), as on the phone;
// click a wired input to take its wire off and carry it to another input. A card can open its own details; the ×
// removes it. Drag the background to pan, pinch or ⌘/Ctrl-scroll to zoom, and use the corner buttons to zoom or fit.
// every edit can be undone and redone there too, or with ⌘/Ctrl-Z, ⇧⌘/Ctrl-Z and Ctrl-Y. A wire the game refuses
// (parts.refuse) is not made, and its reason shows at the top of the board for a moment.
//
// The game says what its cards are (`parts`, see model.js) and what a card shows under its ports (`body`); the
// board does the rest. Moving cards goes through the kit's drag.js: cards are [data-part] with their header as the
// [data-drag] handle, ports are [data-p] (model.js port ids). Wires run between the dots where they are drawn,
// measured after each render.
//
// A frame (parts.frames, frames.js) is a card with regions below its body, where cards sit and are moved, wired and
// taken off like any other. A region that opens a value shows it as a dot at its left edge, and its result goes into
// a dot at its right edge. A card dragged onto a region moves into it, or out of it onto the board; clicking a region
// (or a card in it, or the frame) makes it where the next new card goes (`onTarget`). A frame folds to its card.

// The elements of this board's own layer that match a selector: not those of a board drawn inside one of its cards
// (a built part unfolded), whose ids may be the same.
const ownIn = (layer, selector) => [...(layer?.querySelectorAll(selector) ?? [])].filter((el) => el.closest('.board-layer') === layer)
// A region's least size, and the room kept round the cards in it.
const REGION = { w: 240, h: 120, pad: 24 }
const clampZoom = (z) => Math.min(1.5, Math.max(0.35, Math.round(z * 100) / 100))
const curve = (a, b) => kitCurve(a, b, 'x', 48)
const atPosition = (node, positions) => {
  const at = positions?.get(node.id)
  return at && (at.x !== node.x || at.y !== node.y) ? { ...node, ...at } : node
}

function pointerPose(pointers) {
  const points = [...pointers.values()]
  const mid = points.reduce(([x, y], point) => [x + point[0] / points.length, y + point[1] / points.length], [0, 0])
  const spread = points.length > 1 ? Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]) : 0
  return { mid, spread }
}

/**
 * @param graph, onChange(graph, { keep })   `keep`: a change to save that does not change what the circuit computes
 *   (a card moved, a view switched), so the game need not re-run it.
 * @param parts      the game's description of its nodes (model.js)
 * @param body(node) what a card shows under its ports (settings, its value…)
 * @param head(node) extra marks in a card's header (a pass/fail badge…)
 * @param inspect(node) the action that opens a card's details, if it has any
 * @param caption(node) a fixed card's line under its title (what it carries)
 * @param outNote(node, key) beside each of a card's several outputs (parts.outputs), after its name: what it carries.
 *   Those outputs run down the card's right edge; the body starts on the row below the lowest port on either side.
 * @param cardClass(node), wireState(wire) → 'live' | 'dead' | null, height (for fitting), emptyNote
 * With `refit` the circuit is fitted again whenever the board changes
 * size (a bench in the parts box, whose panel can open narrow and then grow). `regionNote(node, region)` is what a
 * region's left edge says beside its dot (the assumption it makes), `resultNote(node, region)` what its right edge
 * says beside the dot its result goes into (what the frame gives); `onTarget(region | null)` hears where a new card
 * should go; `onClear` puts a clear button (it asks first) at the start of the corner's tools. In a level, the board's bottom
 * left corner switches between the level's saved boards and shows the board as text (SaveSlots); `types`, the parts
 * this level offers, lets text be imported onto it; `corner` is whatever the game puts beside it. `minFit` is the smallest zoom a fit may
 * choose: a circuit too big for the board at it starts at its top left, and the rest is a pan away. An editable board
 * receives both its change callback and its history. A display without them only pans, zooms and fits.
 */
export default function CanvasEditor({ blocks = null, graph, onChange, history, parts, body, head, caption, outNote, cardClass, wireState, height = 230, emptyNote, corner, types, refit = false, minFit = 0, regionNote, resultNote, onTarget, onClear, inspect }) {
  const [connectionLabels] = useSetting('connectionLabels')
  const readOnly = !onChange
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 })
  const protectedIds = lockedCards(graph)
  const removable = (node) => canRemoveCard(parts, node, protectedIds)
  const [presentation, setPresentation] = useState(null)
  const paintedGraph = useRef(graph.nodes)
  useLayoutEffect(() => {
    const previous = paintedGraph.current
    paintedGraph.current = graph.nodes
    if (previous === graph.nodes) return
    const previousById = new Map(previous.map((node) => [node.id, node]))
    setPresentation((current) => current && new Map(graph.nodes.filter((node) => !node.in).map((node) => {
      const before = previousById.get(node.id)
      const kept = before && !before.in && node.x === before.x && node.y === before.y ? current.get(node.id) : null
      return [node.id, kept ?? { x: node.x ?? 0, y: node.y ?? 0 }]
    })))
  }, [graph.nodes])
  const [linkCursor, setLinkCursor] = useState({ from: null, at: -1 })
  const [linkedSource, setLinkedSource] = useState(null)
  const [focus, setFocus] = useState(null)
  const foldedNodes = foldedPartsOf(graph, blocks?.items ?? [])
  const [partitioning,setPartitioning]=useState(false)
  const [selectionRect,setSelectionRect]=useState(null)
  const committed=useRef(false)
  const { track: trackSelection, cancel: cancelSelection } = usePointerSession()
  const lastModes=useRef(new Map())
  const [selected, setSelected] = useState(null) // { node: id } or { wire }
  const [drag, setDrag] = useState(null)
  const [dropBlock, setDropBlock] = useState(null)
  const [dropInto, setDropInto] = useState(null) // the region a dragged card would go into, lit while it hovers
  const [picking, setPicking] = usePickedPort(graph, parts)
  const [pointer, setPointer] = useState(null) // where the pointer is on the board while a dot is picked
  // A new pick (or none) starts without a pointer, so the draft wire waits for the pointer to move instead of reaching
  // for where the last pick's pointer was.
  const pick = (dot) => {
    setPicking(dot)
    setPointer(null)
  }
  // Where the dots and cards are drawn (in the layer's own pixels), measured after each render: { ports, sizes }.
  const [geo, setGeo] = useState({ ports: {}, sizes: {} })
  const geoRef = useRef(geo)
  const [, redraw] = useReducer((n) => n + 1, 0)
  // The region the next new card goes into ('<frame>/<region>'), or null for the board itself.
  const [chosen, setTarget] = useState(null)
  const target = isOpenRegion(graph, parts, chosen) ? chosen : null
  useEffect(() => {
    if (chosen && !target) setTarget(null)
    onTarget?.(target)
  }, [target, chosen])
  // Why the last wire tried was refused (parts.refuse), shown on the board for a moment, as the phone board does.
  const [refused, setRefused] = useState(null)
  useEffect(() => {
    if (!refused) return undefined
    const timer = setTimeout(() => setRefused(null), 4200)
    return () => clearTimeout(timer)
  }, [refused])
  const surface = useRef(null)
  const layer = useRef(null)
  const pointers = useRef(new Map())
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const size = useElementSize(surface)
  const available = size?.width || Infinity
  const widthOf = (node) => node.hiddenBlock ? node.w : cardWidth(parts, node, available)
  const placed = graph.nodes.filter((n) => isPart(parts, n)).length
  // Frames are drawn first, under the plain cards: a frame's backdrop sits below the wires (so those inside it show),
  // so a card drawn before a frame would have the frame's contents over it and its backdrop under it.
  const layered = (nodes) => [...nodes.filter((n) => regionsOf(parts, n).length), ...nodes.filter((n) => !regionsOf(parts, n).length)]
  const groups = blocks?.items ?? []
  const hiddenNodes=foldedPartsOf(graph,groups,'hidden')
  let visible = layered(graph.nodes.filter((n) => !n.in&&!hiddenNodes.has(n.id)))
  const sizeOf = (node) => node.hiddenBlock ? [node.w, node.h] : geo.sizes[node.id] ?? [widthOf(node), height]
  const dimensions = (id) => {
    const [w, h] = sizeOf(byId.get(id))
    return { w, h }
  }
  const gapOf = (name) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0
  const gaps = { gapX: gapOf('--board-gap-x'), gapY: gapOf('--board-gap-y') }
  const spacing = { pad: gapOf('--block-pad'), head: gapOf('--block-head-height') }
  const arrange = () => pipelineLayout(graph, groups, {
    sizeOf: (node) => dimensions(node.id),
    roleOf: parts.role,
    width: surface.current?.clientWidth ?? 1100,
    height: surface.current?.clientHeight ?? Infinity,
    ...gaps,
    ...spacing,
    portY: (id, key, side) => geo.offsets?.[side === 'out' ? outPort(sourceOf(id, key)) : inPort(id, key)] ?? 46,
  })
  const freshPlan = blocks ? arrange() : null
  const needsLayout = blocks?.initial || graph.nodes.some((node) => !node.in && (!Number.isFinite(node.x) || !Number.isFinite(node.y)))
  const storedPositions = new Map(graph.nodes.filter((node) => !node.in).map((node) => {
    const proposed = blocks?.unplaced?.includes(node.id) ? freshPlan.nodes.get(node.id) : null
    return [node.id, proposed ?? { x: node.x ?? 0, y: node.y ?? 0 }]
  }))
  const positions = presentation ?? (needsLayout ? freshPlan?.nodes : storedPositions)
  const painting = blocks ? layoutAt(freshPlan, positions, dimensions, spacing) : null
  visible = visible.map((node) => atPosition(node, positions))
  const units = new Map(painting?.units.filter((unit) => unit.block).map((unit) => [unit.block, unit]))
  const hiddenUnits = groups.filter((block) => block.view === 'hidden').map((block) => ({
    ...units.get(block.id), id: `hidden:${block.id}`, hiddenBlock: block,
  }))
  const top=[...visible,...hiddenUnits]
  useLayoutEffect(() => {
    if (!blocks) return
    const savedViews = new Map((graph.blocks ?? []).map(({ id, view }) => [id, view]))
    const changed = groups.filter((block) => lastModes.current.has(block.id) && lastModes.current.get(block.id).shown !== block.view)
    const edited = groups.find((block) => lastModes.current.has(block.id) && lastModes.current.get(block.id).saved !== savedViews.get(block.id))
    const anchor = edited ?? changed.find((block) => block.nodes.includes(blocks.active)) ?? changed[0]
    lastModes.current = new Map(groups.map(({ id, view }) => [id, { shown: view, saved: savedViews.get(id) }]))
    const measuredTop = top.every((node) => geo.sizes[node.id])
    if (anchor || (!presentation && groups.length && measuredTop)) {
      const cards = new Map(ownIn(layer.current, '.node[data-node]').map((el) => [el.dataset.node, { w: el.offsetWidth, h: el.offsetHeight }]))
      const anchors = anchor && !edited ? storedPositions : positions
      const measured = layoutAt(freshPlan, anchors, (id) => cards.get(id) ?? dimensions(id), spacing)
      const placed = reflowLayout(measured, anchor?.id, gaps).nodes
      setPresentation(placed)
      if (edited) {
        const nodes = graph.nodes.map((node) => atPosition(node, placed))
        if (nodes.some((node, index) => node !== graph.nodes[index])) onChange({ ...graph, nodes }, { keep: true, automatic: true })
      }
      return
    }
    if (!presentation && measuredTop) setPresentation(positions)
    if ((needsLayout || blocks.unplaced?.length) && !committed.current && measuredTop) {
      committed.current = true
      onChange({ ...graph, nodes: graph.nodes.map((node) => atPosition(node, positions)) }, { keep: true, automatic: true })
    }
  })
  const at = (p) => geo.ports[p] ?? null

  // Measure every dot and card once the board is drawn; a change draws again (a card moved, a frame grown).
  useLayoutEffect(() => {
    const root = layer.current
    if (!root) return
    const ports = {}, offsets = {}
    for (const el of ownIn(root, '[data-p]')) {
      const box = el.getBoundingClientRect()
      const card = el.closest('[data-node]')
      if (card) offsets[el.dataset.p] = (box.top + box.height / 2 - card.getBoundingClientRect().top) / view.zoom
      ports[el.dataset.p] = pointIn(root, box.left + box.width / 2, box.top + box.height / 2).map(Math.round)
    }
    const sizes = {...geoRef.current.sizes}
    for (const el of ownIn(root, '[data-node]')) sizes[el.dataset.node] = [el.offsetWidth, el.offsetHeight]
    // Resolve preset collisions on first measurement and when live previews change size, never on a drag alone.
    const resized = Object.entries(sizes).some(([id, size]) => size.some((value, k) => value !== geoRef.current.sizes[id]?.[k]))
    if (resized && !groups.length && !drag && !readOnly) {
      const drawn = painting ? { ...graph, nodes: graph.nodes.map((node) => atPosition(node, positions)) } : graph
      const opening = !Object.keys(geoRef.current.sizes).length
      const aligned = opening && !blocks ? alignTerminals(drawn, sizes, parts.role) : drawn
      const spaced = spaceNodes(aligned, sizes)
      if (spaced !== drawn) {
        if (painting) setPresentation(null)
        onChange(spaced, { keep: true, automatic: true })
        return
      }
    }
    const next = { ports, sizes, offsets }
    if (sameJson(next, geoRef.current)) return
    geoRef.current = next
    setGeo(next)
  })

  // Fit the entire circuit into the available board area.
  const fit = () => {
    const box = surface.current?.getBoundingClientRect()
    if (!box || !box.width || !top.length) return
    // A board with no input cards keeps their column (from the board's left edge, 0) in view: its outputs stay right.
    const open = blocks && !top.some((n) => parts.role(n) === 'source')
    const xs = [...top.flatMap((n) => [n.x, n.x + sizeOf(n)[0]]), ...(open ? [0] : [])]
    const ys = top.flatMap((n) => [n.y, n.y + sizeOf(n)[1]])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const pad = 36
    const fitted = Math.min(1.1, (box.width - pad * 2) / (x1 - x0), (box.height - pad * 2) / (y1 - y0))
    const zoom = clampZoom(Math.max(minFit, fitted))
    const spare = box.width - (x1 - x0) * zoom
    setView({ x: Math.max(pad, spare / 2) - x0 * zoom, y: pad - y0 * zoom, zoom })
  }
  // A card just added (a new part, a removal undone) that lands over another card where it sits (the board, or a
  // region) moves to the nearest spot clear of them all, as they are drawn: a frame is far bigger than a card.
  // Until it has moved, it is not yet seen as added, so the view follows it to where it lands.
  const seen = useRef(null)
  const moving = useRef(false)
  useLayoutEffect(() => {
    const before = seen.current
    seen.current = new Set(graph.nodes.map((n) => n.id))
    moving.current = false
    const added = before && graph.nodes.filter((n) => !before.has(n.id))
    if (added?.length !== 1 || graph.nodes.length !== before.size + 1) return
    const [node] = added
    // A terminal added to the board (the workshop's ports) stands where it was put, in its own column.
    if (parts.role(node) !== 'part') return
    const drawn = (n) => {
      const el = ownIn(layer.current, `[data-node="${CSS.escape(n.id)}"]`)[0]
      return el ? [el.offsetWidth, el.offsetHeight] : sizeOf(n)
    }
    const others = (groups.length ? top : graph.nodes).filter((n) => n.id !== node.id && (n.in ?? null) === (node.in ?? null))
    const beside = others.map((n) => [n.x, n.y, ...drawn(n)])
    const size = drawn(node)
    // On the board itself a card goes left of the outputs, as wide as it is drawn, at the height it was given (or
    // the outputs' top): a card reaching past their left edge is brought back, and one in the way of another moves
    // on leftwards or down. Elsewhere it moves right or down from where the layout would put it.
    const sinks = node.in ? [] : others.filter((n) => !n.hiddenBlock && parts.role(n) === 'sink' && Number.isFinite(n.x))
    const edge = Math.min(...sinks.map((n) => n.x)) - Math.max(gapOf('--board-gap-x'), 56)
    const want = sinks.length ? [Math.min(node.x ?? edge, edge - size[0]), Number.isFinite(node.y) ? node.y : Math.min(...sinks.map((n) => n.y))] : null
    const candidate = want ? { x: want[0], y: want[1] } : arrange().nodes.get(node.id) ?? node
    const spot = clearSpot(beside, size, [candidate.x, candidate.y], 16, want ? -1 : 1) ?? (want && (want[0] !== node.x || want[1] !== node.y) ? want : null)
    if (!spot) return
    moving.current = true
    onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, x: spot[0], y: spot[1] } : n)) }, { keep: true })
  })

  // Fit once the board first has a real size.
  const fitted = useRef(false)
  const fitOnResize = useEffectEvent(() => {
    if (!size?.width || (fitted.current && !refit)) return
    fitted.current = true
    fit()
  })
  // A board that already has its size (one opened in place of another: a level's next task) is fitted before it is
  // first painted, once its cards are measured, so the circuit never shows unfitted for a frame.
  useLayoutEffect(() => {
    if (fitted.current || !surface.current?.getBoundingClientRect().width) return
    if (top.length && !top.every((n) => geo.sizes[n.id])) return
    fitted.current = true
    fit()
  })
  useEffect(() => {
    fitOnResize()
  }, [size])

  // A card that appears outside the visible board (a new part, an input just lit) brings the whole circuit back into
  // view, so nothing the player adds is ever off-screen.
  const known = useRef(null)
  useEffect(() => {
    if (moving.current) return
    const ids = new Set(top.map((n) => n.id))
    const before = known.current
    known.current = ids
    if (!before || !fitted.current) return
    const added = top.filter((n) => !before.has(n.id))
    const box = surface.current?.getBoundingClientRect()
    if (!added.length || !box) return
    const outside = added.some((n) => {
      const x = n.x * view.zoom + view.x
      const y = n.y * view.zoom + view.y
      const width = widthOf(n)
      return x < 0 || y < 0 || x + width * view.zoom > box.width || y + 60 * view.zoom > box.height
    })
    if (outside) fit()
  })

  const selectedWire = selected?.wire
  const selectionRefusal = selectedWire
    ? lockedRefusal(graph, selectedWire.to, selectedWire.port)
    : protectedIds.has(selected?.node) ? PRESET_CARD_REFUSAL : null
  const removeSelected = () => {
    if (!selected) return
    if (selectionRefusal) setRefused(selectionRefusal)
    else if (selectedWire) onChange(unplugWire(graph, selectedWire.to, selectedWire.port).graph)
    else if (selected.node && removable(byId.get(selected.node))) onChange(removeNode(graph, parts, selected.node))
    setSelected(null)
  }
  // Delete or Backspace removes the selection; Escape drops it. ⌘/Ctrl-Z undoes, ⇧⌘/Ctrl-Z or Ctrl-Y redoes, unless
  // a dialog over another board has the keys.
  useWorkspaceKeys((event) => {
    if (readOnly) return
    if (/input|select|textarea/i.test(document.activeElement?.tagName)) return
    const key = event.key.toLowerCase()
    if(key==='escape'&&partitioning){cancelSelection();setPartitioning(false);setSelectionRect(null);return}
    if (historyKey(event, history)) return
    if (event.key === 'Escape' && picking) return pick(null)
    if (!selected) return
    if (event.key === 'Escape') return setSelected(null)
    if (event.key !== 'Delete' && event.key !== 'Backspace') return
    event.preventDefault()
    removeSelected()
  }, { allowOverlay: (_, overlay) => overlay.contains(surface.current) })

  const zoomAt = (factor, cx, cy) =>
    setView((v) => {
      const zoom = clampZoom(v.zoom * factor)
      const k = zoom / v.zoom
      return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
    })

  const beginPartition = (event) => {
    if (event.button > 0 || !event.isPrimary || event.target.closest('.block-header,.board-zoom,.board-corner')) return
    event.preventDefault()
    event.stopPropagation()
    const start = pointIn(layer.current, event.clientX, event.clientY)
    let end = start
    trackSelection(event, {
      move(next) {
        end = pointIn(layer.current, next.clientX, next.clientY)
        setSelectionRect([start, end])
      },
      finish(commit) {
        if (commit) {
          const ids = rectangleMembers(graph, parts, [start, end], (node) => painting?.nodes.get(node.id) ?? node, sizeOf)
          if (ids.length) blocks.create(ids)
        }
        setSelectionRect(null)
        setPartitioning(false)
      },
    })
    setSelectionRect([start, start])
  }
  // Background: one pointer pans, two pointers pinch-zoom around their midpoint.
  // Any press on the background pans: not one on a card, a wire, a control or a window floating over the board.
  // A press on a region's empty floor pans too, and makes it where new cards go.
  const beginPan = (event) => {
    const card = event.target.closest('.node')
    const field = event.target.closest('.frame-field')
    if (event.button > 0 || (card && !card.contains(field)) || event.target.closest('.kw, button, input, select, label, .board-zoom')) return
    setSelected(null)
    pick(null)
    setTarget(field?.dataset.region ?? null)
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, [event.clientX, event.clientY])
  }
  const movePointer = (event) => {
    if (picking) setPointer(pointIn(layer.current, event.clientX, event.clientY))
    const active = pointers.current
    if (!active.has(event.pointerId)) return
    const before = pointerPose(active)
    active.set(event.pointerId, [event.clientX, event.clientY])
    const now = pointerPose(active)
    const box = event.currentTarget.getBoundingClientRect()
    setView((v) => {
      let { x, y, zoom } = v
      if (before.spread > 0) {
        const next = clampZoom(zoom * (now.spread / before.spread))
        const k = next / zoom
        const cx = now.mid[0] - box.left
        const cy = now.mid[1] - box.top
        x = cx - (cx - x) * k
        y = cy - (cy - y) * k
        zoom = next
      }
      return { zoom, x: x + now.mid[0] - before.mid[0], y: y + now.mid[1] - before.mid[1] }
    })
  }
  const endPan = (event) => pointers.current.delete(event.pointerId)

  useEffect(() => {
    const node = surface.current
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const box = node.getBoundingClientRect()
      zoomAt(event.deltaY > 0 ? 0.92 : 1.08, event.clientX - box.left, event.clientY - box.top)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  const addWire = (wire) => {
    const next = connectWire(graph, parts, wire)
    setRefused(next.reason ?? null)
    if (next.reason) return false
    onChange(next.graph)
    return true
  }
  const wireToCard = (from, id) => {
    const to = portOnCard(graph, parts, from, byId.get(id))
    if (to) return addWire(ends(from, to))
    setRefused(NO_CARD_PORT)
    return false
  }
  const connectTo = (source, over) => {
    const from = outPort(source)
    const target = over?.dataset.p
    if (target && parsePort(target).side === 'in') addWire(ends(from, target))
    else if (over?.dataset.part) wireToCard(from, over.dataset.part)
  }
  // With nothing picked, clicking a wired input takes its wire off that input and leaves it in hand, still on its
  // output: click another input (or a card) to plug it in there, or anywhere else to drop it. Any other dot is picked.
  const clickPort = (p) => {
    const at = parsePort(p)
    if (!picking && at.side === 'in') {
      const next = unplugWire(graph, at.id, at.port)
      if (next.reason) return setRefused(next.reason)
      if (next.from !== null) {
        setRefused(null)
        onChange(next.graph)
        return pick(outPort(next.from))
      }
    }
    if (!picking || picking === p) return pick(picking === p ? null : p)
    const wire = ends(picking, p)
    if (!wire) pick(p)
    else if (addWire(wire)) pick(null)
  }
  const clickCard = (id) => {
    if (wireToCard(picking, id)) pick(null)
  }
  const portClass = (p) => {
    if (!picking) return ''
    if (p === picking) return 'is-picked'
    const wire = ends(picking, p)
    return wire && !wireRefusal(graph, parts, wire) ? 'is-target' : ''
  }

  // Choosing a card makes its region where new cards go; choosing a frame, its first region.
  const choose = (node) => {
    setSelected({ node: node.id })
    const first = regionsOf(parts, node)[0]
    setTarget(first && !node.fold ? regionAddress(node.id, first.name) : node.in ?? null)
  }
  // The region under a dragged card's pointer (not one of its own), or null for the board: anywhere inside its outline
  // counts, its head too, not just the field its cards sit on. Its field is returned, where the card's place counts from.
  const fieldAt = g => containerUnderPointer(layer.current,g,'.frame-region')?.querySelector(':scope > .frame-field') ?? null
  const blockAt = g => isPart(parts, byId.get(g.id))&&!fieldAt(g)
    ? containerUnderPointer(layer.current,g,'.circuit-block')?.dataset.block??null : null
  // A card dropped lands where it was let go: in the region under the pointer, or on the board. The board has no edge,
  // so a card goes as far up or left as it is taken; a region's cards stay inside its field, which starts at 0.
  const place = (g) => {
    const root = layer.current
    const node = byId.get(g.id)
    const field = fieldAt(g)
    const box = g.el.getBoundingClientRect()
    const [x0, y0] = pointIn(root, box.left, box.top)
    const [ox, oy] = field ? pointIn(root, field.getBoundingClientRect().left, field.getBoundingClientRect().top) : [0, 0]
    const floor = (v) => (field ? Math.max(0, v) : v)
    const [x, y] = [floor(Math.round(x0 + g.dx - ox)), floor(Math.round(y0 + g.dy - oy))]
    const region = field?.dataset.region ?? null
    // A locked part moves only within the region it sits in: let go elsewhere, it goes back.
    if (leavesLockedRegion(protectedIds, node, region)) {
      setRefused(PRESET_CARD_REFUSAL)
      setTarget(node.in ?? null)
      return
    }
    const positioned = region === (node.in ?? null)
      ? { ...graph, nodes: graph.nodes.map(n=>n.id===g.id?{...n,x,y}:n) }
      : moveInto(graph,parts,g.id,region,x,y)
    if (positioned === graph) {
      setTarget(node.in ?? null)
      return
    }
    const next=assignBlock(positioned,parts,g.id,region===null?blockAt(g):null)
    onChange(next, { keep: next.wires.length === graph.wires.length })
    setTarget(region)
  }

  // Wires are pulled from outputs; a drag that starts on an input does nothing.
  const handlers = useRef(null)
  useLayoutEffect(() => {
    handlers.current = {
      start(g) {
        if (g.kind === 'part') choose(byId.get(g.id))
        if (g.kind === 'port') pick(null)
      },
      move(g) {
        if (g.kind === 'part') {
          redraw()
          // The region under the pointer lights up, the one the card is already in too: dropped now, it stays there.
          const region = fieldAt(g)?.dataset.region ?? null
          setDropInto(leavesLockedRegion(protectedIds, byId.get(g.id), region) ? null : region)
          setDropBlock(blockAt(g))
        }
        if (g.kind === 'port' && parsePort(g.id).side === 'out') {
          const [x, y] = pointIn(layer.current, g.x, g.y)
          setDrag({ from: parsePort(g.id).id, x, y })
        }
      },
      drop(g) {
        setDrag(null)
        setDropInto(null)
        setDropBlock(null)
        if (g.kind === 'part') place(g)
        if (g.kind === 'port' && parsePort(g.id).side === 'out') connectTo(parsePort(g.id).id, g.over)
      },
      end() {
        setDrag(null)
        setDropInto(null)
        setDropBlock(null)
        redraw()
      },
    }
  })
  useEffect(() => enableDrag(surface.current, () => handlers.current), [])

  // A card, and for a frame its regions with the cards inside them.
  function card(node) {
    const role = parts.role(node)
    const openDetail = inspect?.(node)
    const folded = foldedNodes.has(node.id)
    const { inputs: ports, outputs, regions } = cardPorts(parts, node)
    const named = namesPorts(parts, node, (label) => String(L(label)))
    const plainOutput = outputs.length === 1 && outputs[0].key === null && !named
    const icon = parts.icon?.(node)
    const wired = (src) => graph.wires.some((w) => w.from === src)
    const outDot = (src, extra = '') => <i className={`port port-out ${wired(src) ? 'is-wired' : ''} ${portClass(outPort(src))} ${extra}`} data-p={outPort(src)} title={tr('点击后再点击另一个元件的输入口，也可以直接拖动连接')} onClick={() => clickPort(outPort(src))}><i /></i>
    const inDot = (port, extra = '') => {
      const wired = graph.wires.some((w) => w.to === node.id && w.port === port)
      return <i className={`port port-in ${wired ? 'is-wired' : ''} ${portClass(inPort(node.id, port))} ${extra}`} data-p={inPort(node.id, port)} title={wired && !picking ? tr('点击取下这根连线，再点击其他输入口重新连接') : undefined} onClick={() => clickPort(inPort(node.id, port))}><i /></i>
    }
    return (
      <div
        key={node.id}
        data-node={node.id}
        data-part={node.id}
        data-family={parts.family(node)}
        data-io={role === 'source' ? tr('输入', 'IN') : role === 'sink' ? tr('输出', 'OUT') : undefined}
        className={`node is-${role} ${parts.packed?.(node) ? 'is-packed' : ''} ${regions.length ? 'is-frame' : ''} ${node.fold ? 'is-folded' : ''} ${folded ? 'is-body-folded' : ''} ${selected?.node === node.id ? 'is-selected' : ''} ${cardClass?.(node) ?? ''}`}
        role={openDetail ? 'button' : undefined}
        tabIndex={openDetail ? 0 : undefined}
        aria-label={openDetail ? tr(`查看 ${L(parts.label(node))} 的详情`, `Inspect ${L(parts.label(node))}`) : undefined}
        onKeyDown={openDetail && ((event) => {
          if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
          event.preventDefault()
          openDetail()
        })}
        onClick={(picking || openDetail) ? (event) => {
          if (cardAt(event.target) !== event.currentTarget || event.target.closest('.frame-regions')?.closest('[data-part]') === event.currentTarget) return
          if (picking) clickCard(node.id)
          else openDetail()
        } : undefined}
        style={{ left: node.x, top: node.y, [regions.length ? 'minWidth' : 'width']: widthOf(node), ...parts.cardStyle?.(node) }}
      >
        {regions.length > 0 && <div className="frame-back" />}
        <div className="node-head" data-drag onPointerDown={() => choose(node)}>
          <div className="node-heading">
            {regions.length > 0 && (
              <button className="frame-fold" aria-label={node.fold ? tr('展开') : tr('折叠', 'Collapse')} aria-expanded={!node.fold} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, fold: !n.fold } : n)) }, { keep: true })}>
                {node.fold ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
            {icon && <i className="family-chip"><Glyph icon={icon} size={12} /></i>}
            <span className="node-title">{L(parts.label(node))}</span>
          </div>
          <div className="node-actions">
            {head?.(node)}
            {removable(node) && (
              <button className="node-delete" aria-label={tr('删除元件')} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(removeNode(graph, parts, node.id))}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        {/* Port rails flank the body so settings and values start beside the first port row. */}
        <div className="node-ports">
          <div className="node-inputs">
            {ports.map((port) => (
              <span key={port} className="node-port-label">
                {inDot(port, parts.portClass?.(node, port) ?? '')}
                {node.terminal && !named ? '' : L(parts.portLabel?.(node, port)) ?? ''}
              </span>
            ))}
          </div>
          <div className="node-body">
            {!folded && caption && role !== 'part' && <span className={`node-carries ${role === 'source' ? 'is-input' : ''}`}>{L(caption(node))}</span>}
            {!folded && body?.(node)}
          </div>
          <div className="node-outputs">
            {!plainOutput && outputs.map((o) => (
              <span key={o.key} className="node-port-out">
                {o.glyph ? <span className="node-out-name is-glyph" title={L(o.label)} dangerouslySetInnerHTML={{ __html: o.glyph }} /> : <span className="node-out-name" title={L(o.label)}>{L(o.short ?? o.label)}</span>}
                {!folded && outNote?.(node, o.key)}
                {outDot(sourceOf(node.id, o.key), parts.portClass?.(node, null, o.key) ?? '')}
              </span>
            ))}
          </div>
          {plainOutput && outDot(node.id, parts.portClass?.(node, null) ?? '')}
        </div>
        {regions.length > 0 && !node.fold && (
          <div className="frame-regions">
            {regions.map((r) => {
              const key = regionAddress(node.id, r.name)
              const inside = graph.nodes.filter((n) => n.in === key)
              const w = Math.max(REGION.w, ...inside.map((n) => n.x + sizeOf(n)[0] + REGION.pad))
              const h = Math.max(REGION.h, ...inside.map((n) => n.y + sizeOf(n)[1] + REGION.pad))
              return (
                <section key={r.name} className={`frame-region ${target === key ? 'is-target' : ''} ${dropInto === key ? 'is-drop' : ''}`}>
                  <header className="frame-region-head">
                    {r.opens && outDot(sourceOf(node.id, r.name), 'frame-open')}
                    <span className="frame-region-name">{L(r.label)}</span>
                    {regionNote?.(node, r.name)}
                    <span className="frame-region-result">{L(parts.portLabel?.(node, r.name)) ?? ''}{resultNote?.(node, r.name)}{inDot(r.name, 'frame-close')}</span>
                  </header>
                  <div className="frame-field" data-region={key} style={{ width: w, height: h }}>
                    {layered(inside).map(card)}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const dragBlock=useBlockDrag({graph,parts,layer,zoom:view.zoom,onChange,redraw,positions:painting?.nodes})
  const stageFrame = (block) => {
    const { x, y, w, h } = units.get(block.id)
    const hidden = block.view === 'hidden'
    const reveal=(id)=>{blocks.open(block.id);setFocus(id);choose(byId.get(id))}
    return <section key={block.id} data-block={block.id} data-node={hidden ? `hidden:${block.id}` : undefined} className={`circuit-block ${hidden?'is-hidden':''} ${dropBlock===block.id?'is-drop':''}`} style={{ left: x, top: y, width: w, ...(hidden ? { minHeight: h } : { height: h }) }}>
      <BlockHeader block={block} editable={!readOnly} onEdit={(patch)=>blocks.edit(block.id,patch)} onDragStart={readOnly?undefined:e=>dragBlock(e,block)} />
      {hidden&&<><span className="block-stubs is-input" onPointerDown={e=>e.stopPropagation()}>{block.ins.map(w=><button type="button" key={`${w.to}.${w.port}`} className="port port-in is-wired" data-p={inPort(w.to,w.port)} title={L(parts.label(byId.get(w.to)))} aria-label={L(parts.label(byId.get(w.to)))} onClick={()=>reveal(w.to)}><i /></button>)}</span><span className="block-stubs is-output" onPointerDown={e=>e.stopPropagation()}>{[...new Set(block.outs.map(w=>w.from))].map(src=><button type="button" key={src} className="port port-out is-wired" data-p={outPort(src)} title={L(parts.label(byId.get(srcNode(src))))} aria-label={L(parts.label(byId.get(srcNode(src))))} onClick={()=>reveal(srcNode(src))}><i /></button>)}</span></>}
    </section>
  }

  useEffect(()=>{if(blocks?.active)setFocus(blocks.active)},[blocks?.active])
  const labels = new Set((connectionLabels ? labelledConnections(graph, groups, parts, (w) => [at(outPort(w.from)), at(inPort(w.to, w.port))]) : []).map(wireKey))
  const jump = (wire, toward) => {
    setLinkedSource(wire.from)
    const targets = graph.wires.filter((w) => w.from === wire.from && labels.has(wireKey(w)))
    const index = linkCursor.from === wire.from ? (linkCursor.at + 1) % targets.length : 0
    if (toward === 'to') setLinkCursor({ from: wire.from, at: index })
    const id = toward === 'to' ? targets[index].to : srcNode(wire.from)
    const owner = blockOwners(groups).get(id)
    if (owner) blocks.open(owner)
    setSelected({ node: id })
    setFocus(id)
  }
  useEffect(() => {
    if (!focus) return
    const original = byId.get(focus), n = original && { ...original, ...painting?.nodes.get(focus) }, el = surface.current
    if (n && el) setView((v) => ({ ...v, x: el.clientWidth / 2 - ((n.x ?? 0) + sizeOf(n)[0] / 2) * v.zoom, y: el.clientHeight / 2 - ((n.y ?? 0) + sizeOf(n)[1] / 2) * v.zoom }))
    setFocus(null)
  }, [focus])
  const wireTags = (wire, a, b) => {
    const name = sourceLabel(wire, graph, parts)
    const length = Math.min(220, Math.max(76, [...name].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 11 : 6.5), 20)))
    return <g key={wireKey(wire)} className={`wire-tags ${linkedSource === wire.from ? 'is-linked' : ''}`}>
      {[...(graph.wires.find((w) => w.from === wire.from && labels.has(wireKey(w))) === wire ? [[a, 'to', 12]] : []), [b, 'from', -length - 12]].map(([p, toward, dx]) => <g key={toward} role="button" tabIndex={0} aria-label={tr(`沿 ${name} 跳转`, `Follow ${name}`)} data-wire-tag={wireKey(wire)} onPointerDown={(e) => e.stopPropagation()} onClick={() => jump(wire, toward)} onKeyDown={(e) => e.key === 'Enter' && jump(wire, toward)}>
        <path d={`M${p[0]},${p[1]}h${toward === 'to' ? 12 : -12}`} /><rect x={p[0] + dx} y={p[1] - 10} width={length} height={20} rx={4} /><text x={p[0] + dx + 6} y={p[1] + 4}>{name}</text><title>{name}</title>
      </g>)}
    </g>
  }
  const centre = () => {
    const box = surface.current.getBoundingClientRect()
    return [box.width / 2, box.height / 2]
  }
  const selectedNode = selected?.node ? byId.get(selected.node) : null
  const canDelete = !selectionRefusal && (Boolean(selectedWire) || removable(selectedNode))

  return (
    <div className={`board kit-board ${picking ? 'is-picking' : ''} ${readOnly ? 'is-readonly' : ''}`} ref={surface} onPointerDownCapture={partitioning ? beginPartition : undefined}
      onPointerDown={beginPan} onPointerMove={movePointer} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}>
      <div className="board-grid" style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px` }} />
      {!placed && emptyNote && <p className="board-empty">{L(emptyNote)}</p>}
      <div className="board-layer" ref={layer} onAnimationEnd={redraw} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0' }}>
        {groups.map(stageFrame)}
        <svg className="board-wires" width="4000" height="3000">
          {graph.wires.map((wire) => {
            const [a, b] = [at(outPort(wire.from)), at(inPort(wire.to, wire.port))]
            const from = byId.get(srcNode(wire.from))
            if (!a || !b || !from) return null
            if (labels.has(wireKey(wire))) return null
            const d = curve(a, b)
            const active = selected?.wire?.to === wire.to && selected?.wire?.port === wire.port
            const state = wireState?.(wire)
            return (
              <g
                key={`${wire.to}.${wire.port}`}
                className={`kw ${active ? 'is-selected' : ''} ${state === 'live' ? 'is-live' : state === 'dead' ? 'is-dead' : ''} ${parts.wireClass?.(wire) ?? ''} ${parts.wireKind ? `kind-${parts.wireKind(wire, graph)}` : ''}`}
                data-family={parts.family(from)}
                style={parts.wireStyle?.(wire, graph)}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setSelected({ wire })
                }}
              >
                <path className="kw-halo" d={d} />
                <path className="kw-line" d={d} />
                {state === 'live' && <path className="kw-flow" d={d} />}
                <path className="kw-hit" d={d} />
              </g>
            )
          })}
          {drag && at(outPort(drag.from)) && <path className="kw-draft" d={curve(at(outPort(drag.from)), [drag.x, drag.y])} />}
          {picking && pointer && at(picking) && <path className="kw-draft" d={parsePort(picking).side === 'out' ? curve(at(picking), pointer) : curve(pointer, at(picking))} />}
        </svg>
        {visible.map(card)}
        {selectionRect&&<div className="block-selection" style={{left:Math.min(selectionRect[0][0],selectionRect[1][0]),top:Math.min(selectionRect[0][1],selectionRect[1][1]),width:Math.abs(selectionRect[1][0]-selectionRect[0][0]),height:Math.abs(selectionRect[1][1]-selectionRect[0][1])}} />}
        {labels.size > 0 && <svg className="board-wires board-labels" width="4000" height="3000">{graph.wires.filter((w) => labels.has(wireKey(w))).map((w) => {
          const a = at(outPort(w.from)), b = at(inPort(w.to, w.port))
          return a && b ? wireTags(w, a, b) : null
        })}</svg>}
      </div>

      {canDelete && (
        <button className="board-delete" onPointerDown={(e) => e.stopPropagation()} onClick={removeSelected}>
          <Trash2 size={14} /> {selected.wire ? tr('删除连线') : tr('删除元件')}
        </button>
      )}
      {refused && <p className="board-refusal" role="status">{L(refused)}</p>}
      {!readOnly && (
        <div className="board-corner" onPointerDown={(e) => e.stopPropagation()}>
          <SaveSlots board={{ graph, parts, change: onChange, types }} />
          {corner}
        </div>
      )}
      <div className="board-zoom" onPointerDown={(e) => e.stopPropagation()}>
        {!readOnly && (
          <>
            {onClear && <><ClearButton onClear={onClear} /><i className="board-zoom-rule" aria-hidden="true" /></>}
            <button onClick={history.undo} disabled={!history.canUndo} aria-label={tr('撤销')} title={tr('撤销（⌘/Ctrl+Z）')}><Undo2 size={14} /></button>
            <button onClick={history.redo} disabled={!history.canRedo} aria-label={tr('重做')} title={tr('重做（⇧⌘/Ctrl+Z）')}><Redo2 size={14} /></button>
            <i className="board-zoom-rule" aria-hidden="true" />
          </>
        )}
        {!readOnly&&blocks&&<button type="button" aria-label={L(WORDS.partition)} aria-pressed={partitioning} onClick={()=>{if(partitioning)cancelSelection();setPartitioning(!partitioning);setSelectionRect(null)}}><Group size={14} /></button>}
        <button onClick={() => zoomAt(0.85, ...centre())} aria-label={tr('缩小')}><Minus size={14} /></button>
        <output>{Math.round(view.zoom * 100)}%</output>
        <button onClick={() => zoomAt(1 / 0.85, ...centre())} aria-label={tr('放大')}><Plus size={14} /></button>
        <button onClick={fit} aria-label={tr('适配画布')}><Maximize size={13} /></button>
      </div>
    </div>
  )
}

/** An independently edited canvas, such as a component preview. */
export function EditableCanvas({ graph, onChange, scope, ...props }) {
  const { change, history } = useCircuitEdits(graph, onChange, scope)
  return <CanvasEditor {...props} graph={graph} onChange={change} history={history} />
}
