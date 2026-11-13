import { useSetting } from './useSetting.js'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { blockPreset, blocksOf, createBlock, editBlock, withNewSlots, newPartSlot, phoneBlockBoard, blockOfPart } from '../circuit/blocks.js'
import { Info } from 'lucide-react'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, spotIn, useSlotEditing } from '../circuit/index.js'
import Glyph from '../circuit/Glyph.jsx'
import { InsideBoard, PackedDetail, PackedTools, insideOf } from '../circuit/Inside.jsx'
import { WORDS } from './words.js'
import { L, tr, T } from './i18n.js'
import { Brief, PhonePage, Text } from './Layout.jsx'
import RunDock from './RunDock.jsx'
import Sheet from './Sheet.jsx'
import TestTabs from './TestTabs.jsx'
import { useEdit } from './edit.js'
import { PickMark } from './EditMarks.jsx'
import { usePlayback } from './usePlayback.jsx'
import { useKeptVerdict } from './useKeptVerdict.js'
import Workbench, { TestStatus } from './Workbench.jsx'
import { definedFaces, definedParts } from './parts/faces.jsx'

// A circuit level, the same in every game (games/DESIGN.md 6.3): the board the player wires on the shared editor
// (a desktop's canvas, a phone's slot board), the parts to place (palette, tray), the level's saved boards (the
// editor's corner), the tests and how they stand, the run (step, pause, go on, skip to the end) with the run bar, the
// last run kept on the board while the level is open, passing and failing, the brief with its hints, and the packed
// parts on the board: each opens, read only, to show the board it runs, with what every card on it gives at the step
// shown, so a run can be followed into it (circuit/Inside.jsx). A domain's level screen brings only what is its own:
//
//   const board = useLevelBoard(screen, { open, fresh })    the board the level opens on, and clearing
//   const run = useLevelRun(screen, board, { tests, steps | judge, … })    how it runs and is judged
//   return <CircuitLevel screen={screen} board={board} run={run} parts={…} view={…} card={…} results={…} … />
//
// what a card shows of the board's values (`card`, each face given (node, ctx), ctx = { view, board, path, readOnly }:
// the level's board, or the board inside a packed part), what the results show (a test board, a waveform, a step
// log), its part catalogue (`items`) and its own panels (in the brief, under the board, in a part's sheet).

/**
 * The board of a circuit level. open(saved) → the board the level opens on (a saved one that still fits, an upgrade
 * from the board a part runs, a board carried from the level before…); fresh() → its start (clearing goes back to it).
 * Returns { circuit, change(next, { keep }), clear(), version }: a change with `keep` (a card moved, a packed part
 * unfolded, a view switched) is saved but changes nothing the board computes, so a run on it stands; `version` counts
 * the changes that do. Clearing is there while the board holds a part the level did not lock, or while
 * `clearable(circuit)` says it would take something else away.
 */
export function useLevelBoard(screen, { open, fresh, clearable }) {
  const [state, setState] = useState(() => ({ circuit: open(screen.saved), version: 0 }))
  const change = (next, { keep = false } = {}) => {
    setState((s) => ({ circuit: next, version: keep ? s.version : s.version + 1 }))
    screen.save(next)
  }
  return { circuit: state.circuit, version: state.version, change, clear: () => change(fresh()), clearable }
}

/**
 * How a circuit level runs and is judged: either step by step (`steps`, usePlayback.jsx) or in one go (`judge`,
 * useKeptVerdict.js); either way the last run stands on the board until it changes, and the level opens on it again.
 *
 *   tests     [{ label, hidden?, sample? }] the tests shown (a hidden test is listed once the level is solved; a sample,
 *             after the tests, is a larger picture the board also runs on, never judged; judge levels only)
 *   steps     { of(k) → test k's steps, check(k) → why test k is wrong or '', final?() → why the whole run fails }
 *   judge()   → { pass, results: [{ pass, reason }], score? }: every test checked at once
 *   hidden    { count, fails() → how many fail, words: { note, failed(n) } } hidden tests run with every run and
 *             only say how many fail
 *   score()   the score the level is passed with (judge: the verdict's)
 *   onSolve?  instead of passing the level when every test passes (another stage follows, the board must still be made
 *             a part…); onFail?(run) when a stepped run stops short; guard?() → true when a run may not start yet
 *   at        the test a level opens on
 */
export function useLevelRun(screen, board, { tests, steps = null, judge = null, hidden = null, score, onSolve, onFail, guard, at: first = 0 }) {
  const [at, setAt] = useState(first)
  const solve = (s) => (onSolve ? onSolve(s) : screen.solve(s))
  const hiddenFails = () => (hidden?.count ? hidden.fails() : 0)
  const missed = (n) => (n ? hidden.words.failed(n) : '')
  const playback = usePlayback({
    count: tests.length,
    stepsOf: (k) => (steps ? steps.of(k) : []),
    check: (k) => steps?.check(k) ?? '',
    final: () => steps?.final?.() || missed(hiddenFails()),
    onSolve: () => solve(score?.()),
    onFail,
    onTest: setAt,
    board: board.version,
    kept: steps ? screen.lastRun : undefined,
    onKeep: steps ? screen.keepRun : undefined,
  })
  const judged = () => {
    const v = judge()
    return { ...v, hiddenFailed: v.pass ? hiddenFails() : 0 }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun: !steps && screen.lastRun, keepRun: steps ? () => {} : screen.keepRun }, () => judged())
  // A change to what the board computes drops the verdict on it.
  const version = useRef(board.version)
  useEffect(() => {
    if (version.current === board.version) return
    version.current = board.version
    if (!steps) setVerdict(null)
  }, [board.version])
  const check = () => {
    if (guard?.()) return
    const v = judged()
    setVerdict(v)
    if (v.pass && !v.hiddenFailed) solve(v.score ?? score?.())
    else if (!v.pass) setAt(Math.max(0, v.results.findIndex((r) => !r.pass)))
  }
  const states = steps ? playback.states : tests.map((t, k) => (verdict && !t.sample ? (verdict.results[k]?.pass ? 'pass' : 'fail') : null))
  const passed = steps ? playback.passed : Boolean(verdict?.pass && !verdict.hiddenFailed)
  const live = Boolean(playback.run && !playback.run.over)
  const shownAt = Math.min(at, tests.length - 1)
  const failedHidden = steps ? (playback.run?.final && hiddenFails()) || 0 : verdict?.hiddenFailed ?? 0
  return {
    tests,
    stepped: Boolean(steps),
    at: shownAt,
    select: setAt,
    states,
    passed,
    /** The stepped run (usePlayback's), or null; the verdict of a check in one go, or null. */
    run: steps ? playback.run : null,
    verdict: steps ? null : verdict,
    playback,
    /** How test `at` stands after the last run or check: { pass, reason } or undefined. */
    result: steps ? playback.run?.results[shownAt] : verdict?.results[shownAt],
    /** Whether the last run or check is over (or none was made): its verdict stands. */
    over: steps ? Boolean(playback.run?.over) : Boolean(verdict),
    /** The hidden tests that failed the last run, when every test shown passed. */
    hiddenFailed: failedHidden,
    hidden: hidden?.count ? { count: hidden.count, failed: failedHidden, note: failedHidden ? missed(failedHidden) : hidden.words.note } : null,
    /** The run bar's buttons, given the big button's labels (RunDock). */
    dock: ({ go, done }) => {
      if (!steps) return { go: { label: passed ? done : go, pass: passed, onClick: check } }
      const d = playback.dock({ go, done })
      if (!guard) return d
      const guarded = (f) => () => (live || !guard() ? f() : null)
      return { controls: d.controls.map((c) => (c.key === 'step' ? { ...c, onClick: guarded(c.onClick) } : c)), go: { ...d.go, onClick: guarded(d.go.onClick) } }
    },
  }
}

const EMPTY = T('从上方元件栏选择元件放到板上，再从元件右侧的圆点连线到另一元件左侧的圆点。')
const nothing = { values: new Map(), errors: new Map() }

/**
 * The level on the screen: a desktop's workbench or a phone's page (Workbench.jsx, Layout.jsx PhonePage).
 *
 *   screen          the level screen's props (GameShell)          board, run    useLevelBoard, useLevelRun
 *   parts           the editor's description of the cards (circuit/model.js)
 *   defined         the parts a game defines as data (games/DESIGN.md 6.8, parts/faces.jsx): { of(type) → the part
 *                   resolved or null, defaults(type), ops, value(node, ctx, output, face), widgets?, allowed?(type, key) };
 *                   their cards, tiles, details, settings and new nodes are the kernel's, `parts` and `card` only the
 *                   domain's other nodes'
 *   items, folded   the parts to place [{ type, label, desc, icon, family, packed?, fresh?, tag? }] and those folded away
 *   create?(graph, type, { slot, region }) → { graph, id }   a new card (default: `defaults(type)` its settings, in a free spot)
 *   view            what the board shows now: { values, errors } (the default wire state reads it)
 *   card            the faces of a card, each (node, ctx): body, head, caption, cardClass, outNote (node, key, ctx),
 *                   wireState (wire, ctx), regionNote / resultNote (node, region, ctx); on a phone thumb, tileExtra,
 *                   sinkBody, sinkClass, nodeClass
 *   canvas          more for the desktop editor: width, height, emptyNote, corner, minFit, overlay
 *   dense           the phone board is a board of text (SlotBoard dense)
 *   brief           { text, tip, hint, children } the brief (Layout.jsx Brief), with the level's own panels under it
 *   results, resultsTitle, resultsAside   what a run gives (the strip on a desktop, below the board on a phone)
 *   below           on a phone, under the board (what a run shows as it goes, the level's own panels)
 *   follow          on a phone, { began, key }: while a run shows under the board, the page keeps to its bottom
 *   describe(node, ctx), sheet(node, ctx)   a card's detail content: description and body (default: card.body)
 *   details         offer the same detail sheet from desktop card headers
 *   addSheet?({ at, region, place, close })   the sheet for an empty slot (default: the parts, each with what it does)
 *   packed          { open(node, board) → { circuit, parts, … } the board a packed part runs (null: not one),
 *                     edit(node, board) go to the level that builds it, trace() → { trace, upTo?, step? } the traced
 *                     evaluation the board shows now (engine/circuit.js ctx.trace), or null }
 *   words           { go, done } the run button     meta, pad   the run bar's line; an element in its place (a keypad)
 *   tabs            false: the tests are picked in the results, not in tabs
 *   scope           names the board for undo (a level's stage; default the level)
 */
export default function CircuitLevel({ screen, board, run, stages = null, parts: given, defined = null, items = [], folded = [], create, defaults = () => ({}), view = nothing, card: faces = {}, canvas = {}, dense = true, brief = {}, results, resultsTitle, resultsAside, below, follow, describe, sheet, details = false, addSheet, packed, words, meta, pad, tabs = true, scope, className = '', rootRef }) {
  const { game, level, phone } = screen
  const stored = board.circuit
  const ownRoot = useRef(null)
  const root = rootRef ?? ownRoot
  const edit = useEdit()
  const [target, setTarget] = useState(null) // the frame region a new card goes into (desktop)
  const [detail, setDetail] = useState(null)
  const parts = useMemo(() => (defined ? definedParts(given, defined.of) : given), [given, defined?.of])
  const circuit = useMemo(() => withNewSlots(blockPreset(stored, stages?.stages ?? [], parts), parts), [stored, stages, parts])
  const change = (next, options = {}) => board.change(next, options)
  const displayedBoard = { ...board, circuit, change }
  // A defined part's settings change on the board it is on (the level's: packed boards are read only).
  const setNode = (node, params) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params } : n)) })
  const own = { wireState: (wire, ctx) => (ctx.view?.values.get(wire.from) !== undefined ? 'live' : 'dead'), ...faces }
  const card = defined ? definedFaces(own, { defined, change: setNode, phone }) : own
  const isDefined = (node) => Boolean(defined?.of(node.type))
  const detailOf = (node, c) => (isDefined(node) ? card.detail(node, c) : (sheet ?? card.body)?.(node, c))

  const describeOf = (node, c) => {
    const text = !isDefined(node) && describe?.(node, c)
    return text ? <p className="cl-desc">{String(L(text))}</p> : null
  }
  // Packed parts: what each one runs, and what every card inside it gives at the step shown.
  const top = { circuit, parts, top: true }
  // The boards inside packed parts hold defined parts too.
  const opened = packed && defined ? { ...packed, open: (node, at) => { const r = packed.open(node, at); return r && { ...r, parts: definedParts(r.parts, defined.of) } } } : packed
  const inside = packed ? insideOf({ top, ...opened, card, describe: describeOf, sheet: detailOf }) : null
  const isPacked = (node, at) => Boolean(inside?.is(node, at))
  const ctx = { view, board: top, path: [], readOnly: false }
  const step = packed?.trace?.()?.step
  const blockItems = blocksOf(circuit, parts)
  const active = step?.path?.[0] ?? step?.id
  const blockView = { items: blockItems.map((b) => b.view === 'hidden' && b.nodes.includes(active) ? { ...b, view: b.lastView ?? 'ports' } : b), active,
    initial: stored.blocks === undefined,
    unplaced: stored.nodes.filter(n=>!n.in&&parts.role(n)==='part'&&!Number.isInteger(n.slot)).map(n=>n.id),
    edit: (id, patch) => change(editBlock(circuit, parts, id, patch), { keep: true }),
    create: (nodes) => change(createBlock(circuit, parts, nodes), { keep: true }),
    open: (id) => { const b = blockItems.find((b) => b.id === id); if (b?.view === 'hidden') change(editBlock(circuit, parts, id, { view: b.lastView ?? 'ports' }), { keep: true }) },
  }

  const all = [...items, ...folded]
  const types = all.map((item) => item.type)
  const make = create ?? ((graph, type, { slot, region } = {}) => {
    const taken = new Set(graph.nodes.map((n) => n.id))
    let k = 1
    while (taken.has(`${type}${k}`)) k += 1
    const id = `${type}${k}`
    const [x, y] = spotIn(graph, region ?? null)
    return { id, graph: { ...graph, nodes: [...graph.nodes, { id, type, params: defined?.of(type) ? defined.defaults(type) : defaults(type), x, y, ...(slot !== undefined ? { slot } : {}), ...(region ? { in: region } : {}) }] } }
  })
  // A new card goes into the region chosen last, while its frame is there and open.
  const into = target && circuit.nodes.some((n) => n.id === target.split('/')[0] && !n.fold) ? target : null
  const add = (type) => change(make(circuit, type, { region: into, ...(!into ? { slot: newPartSlot(circuit, parts) } : {}) }).graph)
  const onClear = circuit.nodes.some((n) => parts.role(n) === 'part' && !n.locked) || board.clearable?.(circuit) ? board.clear : null

  const briefEl = <Brief game={game} level={level} text={brief.text} tip={brief.tip} hint={brief.hint}>{brief.children}</Brief>
  const dock = pad ?? <RunDock meta={meta} {...run.dock(words ?? { go: L(WORDS.run), done: L(WORDS.passed) })} />
  const testTabs = tabs && <TestTabs tests={run.tests} states={run.states} index={run.at} onSelect={run.select} phone={phone} />

  if (phone) {
    return (
      <PhoneLevel {...{ blocks: blockView, screen, board: displayedBoard, parts, ctx, card, inside, all, items, folded, types, make, describeOf, sheet: detailOf, addSheet, dense, below, follow, results: (resultsTitle || resultsAside) && results ? <><header className="wb-pane-head"><span>{resultsTitle}</span>{resultsAside}</header>{results}</> : results, onClear, root, scope: scope ?? level.id, className }} brief={briefEl} tests={testTabs} dock={dock} />
    )
  }
  const detailNode = circuit.nodes.find((node) => node.id === detail)
  return <>
    <Workbench
      rootRef={root}
      className={`cl-level ${className}`}
      brief={briefEl}
      parts={(all.length > 0 || edit) && <>{all.length > 0 && <Palette compact items={items} folded={folded} onAdd={add} />}<PickMark at="adds" scope="level" label={{ zh: '带来的元件', en: 'Parts it brings' }} /></>}
      stage={
        <div className="cl-stage">
          <div className="cl-board">
            <CanvasEditor
              blocks={blockView}
              key={`${level.id}:${board.key ?? ''}`}
              scope={scope ?? level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={canvas.width ?? 140}
              height={canvas.height}
              minFit={canvas.minFit}
              overlay={canvas.overlay}
              corner={canvas.corner}
              body={card.body && ((node) => card.body(node, ctx))}
              head={(node) => <>{card.head?.(node, ctx)}{(details || isDefined(node)) && !isPacked(node, top) && <button type="button" className="node-tool" aria-label={tr(`查看 ${L(parts.label(node))} 的详情`, `Inspect ${L(parts.label(node))}`)} title={tr('查看详情')} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setDetail(node.id) }}><Info size={13} /></button>}{inside && isPacked(node, top) && <PackedTools onDetail={() => setDetail(node.id)} />}</>}
              caption={card.caption && ((node) => card.caption(node, ctx))}
              outNote={card.outNote && ((node, key) => card.outNote(node, key, ctx))}
              cardClass={card.cardClass && ((node) => card.cardClass(node, ctx))}
              wireState={(wire) => card.wireState(wire, ctx)}
              regionNote={card.regionNote && ((node, region) => card.regionNote(node, region, ctx))}
              resultNote={card.resultNote && ((node, region) => card.resultNote(node, region, ctx))}
              onTarget={setTarget}
              onClear={onClear}
              types={types}
              emptyNote={all.length > 0 && (canvas.emptyNote ?? EMPTY)}
            />
          </div>
        </div>
      }
      tests={testTabs}
      status={<TestStatus states={run.states.filter((_, k) => !run.tests[k].sample)} hidden={run.hidden} />}
      results={results}
      resultsTitle={resultsTitle}
      resultsAside={resultsAside}
      dock={dock}
    />
    {detailNode && (isPacked(detailNode, top)
      ? <PackedDetail inside={inside} node={detailNode} at={top} path={[detailNode.id]} onClose={() => setDetail(null)}>{describeOf(detailNode, ctx)}{detailOf(detailNode, ctx)}</PackedDetail>
      : <Sheet title={String(L(parts.label(detailNode)))} onClose={() => setDetail(null)}><div className="cl-sheet">{describeOf(detailNode, ctx)}{detailOf(detailNode, ctx)}</div></Sheet>)}
  </>
}

// The level on a phone: the shared slot board, the tests pinned at the top, the results below the board, the tray and the run
// bar; a sheet for a card (what it is, its settings and value, the board inside a packed part, move and delete) and
// for an empty slot.
function PhoneLevel({ blocks, screen, board, parts, ctx, card, inside, all, items, folded, types, make, describeOf, sheet: sheetBody, addSheet, dense, below, follow, results, onClear, root, scope, className, brief, tests, dock }) {
  const { circuit: sourceCircuit, change } = board
  const circuit = useMemo(()=>phoneBlockBoard(sourceCircuit,parts),[sourceCircuit,parts])
  const [manualBlocks] = useSetting('manualBlocks')
  const canMove = (id) => manualBlocks || !blockOfPart(circuit,id)?.startsWith('course:')
  const [sheet, setSheet] = useState(null) // { node } or { slot, region }
  const [partitionHint, setPartitionHint] = useState(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    canMove,
    onChange: change,
    parts,
    create: (graph, type, at, region) => make(graph, type, { slot: at, region }),
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at, region) => all.length > 0 && setSheet({ slot: at, region }),
    root,
    scroller,
    scope,
  })
  // While a run shows under the board, the page sits at its bottom (no scrolling to watch), until the player scrolls away.
  const pinned = useRef(false)
  const was = useRef(false)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !follow) return
    if (!follow.began) { pinned.current = false; return }
    if (!was.current) pinned.current = true
    if (pinned.current) el.scrollTop = el.scrollHeight
  }, [follow?.began, follow?.key])
  useLayoutEffect(() => { was.current = Boolean(follow?.began) })
  const onScroll = () => {
    const el = scroller.current
    if (follow?.began && el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4
  }
  const close = () => setSheet(null)
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  const role = node && parts.role(node)
  const removable = node && !node.locked && (parts.removable ? parts.removable(node) : role === 'part')
  const packedHere = node && inside?.is(node, ctx.board)
  const desc = node && describeOf(node, ctx)
  const body = node && sheetBody(node, ctx)
  const place = (type) => { editing.place(type, sheet.slot, sheet.region); close() }
  return (
    <PhonePage rootRef={root} scrollRef={scroller} onScroll={follow ? onScroll : undefined} className={`cl-phone ${className}`} brief={brief} tests={tests} tray={<Tray items={items} folded={folded} onPick={editing.placeFirstFree} />} results={results} dock={dock}>
      <SlotBoard
        blocks={blocks}
        onPartitionHint={setPartitionHint}
        canMove={canMove}
        dense={dense}
        graph={circuit}
        parts={parts}
        nameOf={editing.nameOf}
        thumb={card.thumb && ((n) => card.thumb(n, ctx))}
        tileExtra={card.tileExtra && ((n) => card.tileExtra(n, ctx))}
        sinkBody={(n) => (card.sinkBody ?? card.body)?.(n, ctx)}
        sinkClass={card.sinkClass && ((n) => card.sinkClass(n, ctx))}
        nodeClass={card.nodeClass && ((n) => card.nodeClass(n, ctx))}
        outNote={card.outNote && ((n, key) => card.outNote(n, key, ctx))}
        regionNote={card.regionNote && ((n, region) => card.regionNote(n, region, ctx))}
        resultNote={card.resultNote && ((n, region) => card.resultNote(n, region, ctx))}
        picking={editing.picking}
        moving={editing.moving}
        canLand={editing.canLand}
        onPort={editing.onPort}
        onNode={editing.onNode}
        onSlot={editing.onSlot}
        widthOf={editing.widthOf}
        history={editing.history}
        onClear={onClear}
        onChange={change}
        types={types}
      />
      {below}
      <Notice editing={editing} prompt={partitionHint} />
      {node && (desc || body || packedHere || removable) && (
        <Sheet title={editing.nameOf(node)} onClose={close} footer={(packedHere || role === 'part' || removable) && <PartActions onEdit={packedHere ? () => { close(); inside.edit(node, ctx.board) } : null} onMove={role === 'part' && canMove(node.id) ? () => { editing.startMove(node.id); close() } : null} onRemove={removable ? () => { editing.remove(node.id); close() } : null} />}>
          <div className="cl-sheet">
            {desc}
            {body}
            {packedHere && <InsideBoard inside={inside} path={[node.id]} />}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (addSheet ? addSheet({ at: sheet.slot, region: sheet.region, place, close }) : (
        <Sheet title={tr('放在这一格')} onClose={close}>
          <div className="cl-add">
            {all.map((item) => (
              <button key={item.type} type="button" data-family={item.family} className={item.packed ? 'is-packed' : ''} onClick={() => place(item.type)}>
                <b>{item.icon && <i className="family-chip"><Glyph icon={item.icon} size={12} /></i>}{L(item.label)}{item.fresh && <em className="pb-new">{tr('新')}</em>}</b>
                {item.desc && <Text as="small" text={item.desc} />}
              </button>
            ))}
          </div>
        </Sheet>
      ))}
    </PhonePage>
  )
}
