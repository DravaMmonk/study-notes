import { useMemo, useRef, useState } from 'react'
import { Clock, Quote, Square, Trash2, User, Zap } from 'lucide-react'
import { CanvasEditor, Notice, Palette, SlotBoard, Tray, freeSpot, useSlotEditing } from '../../../circuit/index.js'
import { Brief, CircuitLayout, RunDock, Sheet, TaskCard, TestStatus } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { PORT_LABEL } from '../engine/grammar.js'
import { SINK } from '../engine/lexicon.js'
import { familyOf, featuresOf, partsFor } from '../engine/parts.js'
import { board, check, openPorts } from '../engine/sentence.js'
import Meaning from './Meaning.jsx'
import Sentence from './Sentence.jsx'

// A syntax level, the same in every syntax game: the meaning graph to say, the sentence the board says now, the
// board itself (the kit's circuit editor: the desktop canvas, or the phone's slots and tray) and the run bar. On a
// desktop the meaning graph sits with the task and the sentence in the strip under the board; on a phone both lead
// the page. Running checks the sentence against the meaning graph; a pass solves the level with its word count as
// the score.

const ICONS = { np: Square, pronoun: User, verb: Zap, infl: Clock, sentence: Quote }

// Where a preset card sits on the desktop board: the sentence on the right, the clause's head before it, the verb
// below and the noun phrases above.
const SPOT = { sentence: { x: 640, y: 150 }, infl: { x: 400, y: 120 }, verb: { x: 160, y: 270 }, np: { x: 160, y: 40 } }
const startBoard = (lex, level) => board(lex, level.preset ?? {}, { fixed: true, at: (type) => SPOT[type === SINK ? 'sentence' : type.split(':')[0]] })

const CARD_W = 150
const nextId = (graph) => `n${Math.max(0, ...graph.nodes.map((n) => Number(/^n(\d+)$/.exec(n.id)?.[1] ?? 0))) + 1}`

export default function SyntaxScreen({ game, level, saved, save, solve, progress, phone }) {
  const { lex } = game.syntax
  const spec = level.source
  const parts = useMemo(() => {
    const base = partsFor(lex)
    // A desktop card is as wide as its phrase needs, so no phrase is cut short.
    return { ...base, icon: (node) => ICONS[familyOf(lex, node.type)], cardWidth: (node) => Math.max(CARD_W, Math.round(78 + String(L(base.label(node))).length * 8)) }
  }, [lex])
  const [graph, setGraph] = useState(() => saved?.graph ?? startBoard(lex, spec))
  const [run, setRun] = useState(null) // the last run's result, until the board changes
  const live = useMemo(() => check(lex, spec, graph), [lex, spec, graph])
  const [armed, setArmed] = useState(false)

  const change = (next, { keep } = {}) => {
    setGraph(next)
    save({ graph: next })
    if (!keep) setRun(null)
  }
  const reset = () => change(startBoard(lex, spec))
  const go = () => {
    const result = check(lex, spec, graph)
    setRun(result)
    if (result.pass) solve({ words: result.words, star: result.star })
    return result
  }
  const verdict = run && (run.pass
    ? (run.star ? tr('意思全对。', 'Every part of the meaning matches.') : tr(`意思全对，但用了 ${run.words} 个词；★ 要不超过 ${spec.target} 个。`, `Every part of the meaning matches, but it takes ${run.words} words; the ★ needs at most ${spec.target}.`))
    : !run.complete ? tr(`句子还没接完：${L(openPorts(run.open))}还空着。`, `The sentence is not finished: the ${L(openPorts(run.open))} port is still open.`)
      : tr('句子说的和语义图不一样，看标红的地方。', 'The sentence says something other than the meaning graph: look at what is marked red.'))
  const sense = lex.types().map(lex.part).find((p) => p.kind === 'verb' && p.lemma === spec.meaning.pred).sense
  const best = progress.best[level.id]
  const meaning = <Meaning meaning={spec.meaning} sense={sense} run={run} />
  const sentence = <Sentence run={live} target={spec.target} best={best} />
  const brief = <Brief game={game} level={level} hint={spec.hint} />
  const items = level.palette.map((type) => ({ type, label: lex.part(type).text, desc: featuresOf(lex, type), tag: featuresOf(lex, type), icon: ICONS[familyOf(lex, type)], family: familyOf(lex, type) }))
  const clear = () => {
    if (!armed) {
      setArmed(true)
      window.setTimeout(() => setArmed(false), 2600)
      return
    }
    setArmed(false)
    reset()
  }
  // On a phone the board's toast says how a run went; on a desktop the run bar does.
  const dock = (onGo) => (
    <RunDock
      meta={!phone && verdict && <span className={`sx-verdict ${run.pass ? 'is-pass' : 'is-fail'}`}>{verdict}</span>}
      secondary={graph.nodes.some((n) => parts.removable(n)) ? { label: armed ? tr('确认清空', 'Confirm clear') : tr('清空', 'Clear'), icon: <Trash2 size={16} />, armed, onClick: clear } : null}
      go={{ label: run?.pass ? tr('意思对上了', 'Meaning matches') : tr('对照语义图', 'Check the meaning'), pass: Boolean(run?.pass), onClick: onGo }}
    />
  )
  // A card's line: what the grammar sees in it; after a run, a card in a role that is wrong is marked.
  const wrong = new Set(Object.values(run?.roles ?? {}).filter((r) => !r.ok && r.node).map((r) => r.node))
  const cardClass = (node) => (node.type === SINK && run ? (run.pass ? 'is-pass' : 'is-fail') : wrong.has(node.id) ? 'is-fail' : '')

  if (phone) return <PhoneBoard {...{ lex, graph, change, parts, goal: <>{meaning}{sentence}</>, brief, items, dock, go, reset, cardClass, level }} />

  return (
    <CircuitLayout
      className="sx-level"
      brief={<>{brief}<div className="sx-goal">{meaning}</div></>}
      parts={level.palette.length > 0 && <Palette compact items={items} onAdd={(type) => {
        const [x, y] = freeSpot(graph, { w: CARD_W + 50, dx: CARD_W + 70 })
        change({ ...graph, nodes: [...graph.nodes, { id: nextId(graph), type, x, y }] })
      }} />}
      canvas={
        <CanvasEditor
          graph={graph}
          onChange={change}
          parts={parts}
          scope={level.id}
          width={CARD_W}
          body={(node) => (node.type === SINK
            ? <p className="sx-card-sentence">{live.complete ? live.sentence : tr('等小句接进来', 'Waiting for a clause')}</p>
            : <p className="sx-card-features">{L(featuresOf(lex, node.type))}</p>)}
          cardClass={cardClass}
          emptyNote={{ zh: '从上面一排元件里选一个放上来，再从卡片右侧的圆点连到另一张卡片左侧的圆点。', en: 'Pick a part from the row above, then wire the dot on the right of a card to a dot on the left of another.' }}
        />
      }
      tests={<span className="sx-test">{tr('语义图', 'Meaning graph')}</span>}
      status={<TestStatus states={[run ? (run.pass ? 'pass' : 'fail') : null]} />}
      outputsTitle={tr('板子说出的句子', 'What the board says')}
      outputs={sentence}
      actions={<footer className="run-foot">{dock(go)}</footer>}
    />
  )
}

// The phone: the task, the goal (meaning graph and sentence), the slot board, then the tray and the run bar pinned
// at the bottom, on the kit's phone editing (useSlotEditing). Tapping a block opens what it is; tapping an empty
// slot offers the level's parts.
function PhoneBoard({ lex, graph, change, parts, goal, brief, items, dock, go, reset, cardClass, level }) {
  const root = useRef(null)
  const scroller = useRef(null)
  const [sheet, setSheet] = useState(null) // { node } | { at }
  const editing = useSlotEditing({
    root,
    scroller,
    graph,
    onChange: change,
    parts,
    scope: level.id,
    create: (g, type, at) => {
      const id = nextId(g)
      return { graph: { ...g, nodes: [...g.nodes, { id, type, slot: at }] }, id }
    },
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at) => items.length && setSheet({ at }),
    reset,
  })
  const test = () => {
    editing.unpick()
    const result = go()
    if (!result.pass) editing.say(result.complete ? { zh: '和语义图对不上，看上面标红的地方', en: 'It does not match the meaning graph: look at what is marked red above' } : { zh: `${openPorts(result.open).zh}还空着`, en: `The ${openPorts(result.open).en} port is still open` })
    document.querySelector('.sx-phone .pb-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const node = sheet?.node ? graph.nodes.find((n) => n.id === sheet.node) : null
  return (
    <div className="level-phone level-graph is-split sx-phone">
      <div className="pb" ref={root}>
        <div className="pb-scroll" ref={scroller}>
          <TaskCard>{brief}</TaskCard>
          <section className="sx-goal">{goal}</section>
          <SlotBoard
            graph={graph}
            parts={parts}
            nameOf={editing.nameOf}
            thumb={(n) => <span className="sx-thumb">{L(featuresOf(lex, n.type))}</span>}
            sinkBody={() => <span className="sx-card-sentence">{tr('句子', 'Sentence')}</span>}
            sinkClass={cardClass}
            nodeClass={cardClass}
            picking={editing.picking}
            canLand={editing.canLand}
            onPort={editing.onPort}
            onNode={editing.onNode}
            onSlot={editing.onSlot}
            history={editing.history}
          />
          <p className="pb-howto">{tr('点托盘里的元件放进空格；点一个圆点，再点另一个圆点，把短语接上去。点已接好的输入口就拆掉。', 'Tap a part in the tray to drop it into a slot; tap one dot, then another, to wire a phrase in. Tap a wired input to unplug it.')}</p>
        </div>
        <Tray items={items} onPick={editing.placeFirstFree} />
        <footer className="run-foot">{dock(test)}</footer>
        <Notice editing={editing} />
        {node && (
          <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
            <div className="sx-sheet">
              <p className="sx-card-features">{node.type === SINK ? tr('整句话从这里念出来。', 'The whole sentence is read out here.') : L(featuresOf(lex, node.type))}</p>
              {parts.inputs(node).map((port) => {
                const from = graph.wires.find((w) => w.to === node.id && w.port === port)
                const src = from && graph.nodes.find((n) => n.id === from.from)
                return <p key={port} className="sx-port"><b>{L(PORT_LABEL[port])}</b><span>{src ? editing.nameOf(src) : tr('空着', 'open')}</span></p>
              })}
              {parts.removable(node) && <button className="sx-remove" onClick={() => { editing.remove(node.id); setSheet(null) }}><Trash2 size={15} />{tr('拿掉这一块', 'Remove this block')}</button>}
            </div>
          </Sheet>
        )}
        {sheet?.at !== undefined && (
          <Sheet title={tr(`放进第 ${sheet.at + 1} 格`, `Place in slot ${sheet.at + 1}`)} onClose={() => setSheet(null)}>
            <div className="sx-sheet sx-add">
              {items.map((item) => (
                <button key={item.type} data-family={item.family} onClick={() => { editing.place(item.type, sheet.at); setSheet(null) }}>
                  <b>{L(item.label)}</b><small>{L(item.desc)}</small>
                </button>
              ))}
            </div>
          </Sheet>
        )}
      </div>
    </div>
  )
}
