import { useMemo } from 'react'
import { CircuitLevel, StepLog, useLevelBoard, useLevelRun } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { isFixed, outputsOf, srcOf, within } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { runLevel } from '../../../engine/tests.js'
import { parse } from '../formula.js'
import { inductionCases } from '../proof.js'
import { say } from '../notation.js'
import { ScriptView } from './ScriptScreen.jsx'
import FormulaField from './FormulaField.jsx'
import { SentenceButton } from './SentencePick.jsx'
import { formOf } from '../../../engine/forms.js'
import { machineSteps, machineViewAt } from './stepping.js'
import { openRef } from '../../../shell/refs.js'
import { X } from 'lucide-react'
import { MACHINE_PARTS } from '../machine.js'
import { syncOwn } from '../built.js'

// A level of the logic domain played on the kit's circuit level (../../../shell/CircuitLevel.jsx, 《证明完毕》): a
// proof, whose wires carry proved judgments, or a machine, whose wires carry formulas and clause sets (boards.jsx says
// how each runs, is judged and shows what its wires carry). The level's inputs are on the left and what it must reach
// on the right; a frame (a proof's assumption box, a machine's repeat frame) holds cards in its regions on the same
// board (../../../circuit/frames.js). Every card shows what it gives right now on the test picked; the run bar checks
// every test, which completes the level. The tests above the strip switch the case everywhere, the cards' choices
// included. A board whose tests can be traced (a machine: boards.jsx) runs step by step instead: the card computing
// lights up, the board shows what had been computed by then, the strip lists every step's result, and the run stops at
// the first step or test that fails. A part the player built runs the board that built it, and its cards' steps are
// steps of the run: opened (the kit's packed parts), that board shows its cards' values in the part's latest run so
// far, with the card computing lit. Either way the board's last run is kept: the level, or a task of it, opens on it.

const T = (zh, en) => ({ zh, en })

/** The screen for one board (boards.jsx), as a level kind's Screen. */
export const boardScreen = (board) => function LogicBoard(props) { return <BoardScreen board={board} screen={props} /> }

function BoardScreen({ board, screen }) {
  const { game, level: entry, flags, progress, phone } = screen
  const level = entry.source
  // The parts the player built run the boards that last passed their levels.
  syncOwn(progress.built)
  const parts = useMemo(() => board.parts(level), [board, level])
  // A saved board that no longer fits the level or the game starts fresh: an upgrade from the board its part runs now.
  const lb = useLevelBoard(screen, {
    open: (saved) => {
      if (saved?.nodes && board.fits(saved, level, parts)) return board.lock(level, saved)
      const from = level.upgrades?.opens().circuit
      return from && board.fits(from, level, parts) ? board.lock(level, from) : board.start(level)
    },
    fresh: () => board.start(level),
  })
  const { circuit, change } = lb
  const tests = level.tests
  // What the player has here, of the parts this board runs (../../../course.js offer).
  const offered = useMemo(() => game.logic.offerIn(level, flags), [game, level, flags])
  const palette = offered.shown.filter((t) => parts.rules[t])
  const folded = offered.folded.filter((t) => parts.rules[t])

  // Step by step, on a board that can trace its run: each test traced once per board.
  const stepped = Boolean(board.tests.trace)
  // A card's name on its own board: the level's, or the board a built part runs (drawn with its level's parts).
  const partsOf = useMemo(() => {
    const made = new Map([[level, parts]])
    return (lvl) => made.get(lvl) ?? made.set(lvl, board.parts(lvl)).get(lvl)
  }, [board, level, parts])
  const name = (node, lvl = level) => (partsOf(lvl).role(node) === 'part' ? board.nameOf(lvl, node.type) : partsOf(lvl).label(node))
  const opens = (type) => level.built?.[type]?.opens?.() ?? null
  const traces = useMemo(() => new Map(), [board, level, lb.version])
  const tracedOf = (k) => {
    if (!traces.has(k)) {
      const traced = board.tests.trace(level, circuit, tests[k])
      traces.set(k, { ...traced, steps: machineSteps(traced, circuit, level, { name, partName: (type) => board.nameOf(level, type), opens, isRulePart: (type) => !MACHINE_PARTS[type], failing: (tests[k].want ?? level.want) === 'fails' || tests[k].becomes?.length === 0 }) })
    }
    return traces.get(k)
  }
  const run = useLevelRun(screen, lb, {
    tests,
    ...(stepped
      ? { steps: { of: (k) => tracedOf(k).steps, check: (k) => board.tests.check(level, tests[k], tracedOf(k).run.outputs)[0].reason } }
      : { judge: () => {
        const r = runLevel(board.tests, level, circuit)
        return { pass: r.pass, score: r.score, results: r.results.map((x) => ({ pass: x.pass, reason: x.checks[0].reason })) }
      } }),
    score: () => board.tests.score(level, circuit),
  })
  const test = tests[run.at]
  const live = useMemo(() => board.tests.runTest(level, circuit, test), [board, level, circuit, test])
  const onThis = run.run && run.run.test === run.at
  const view = onThis ? machineViewAt(tracedOf(run.at), tracedOf(run.at).steps, run.run.step) : live
  const stepNow = onThis && run.run.step >= 0 ? tracedOf(run.at).steps[run.run.step] ?? null : null
  // A step inside a built part lights the part on the level's board.
  const stepClass = (node) => ((stepNow?.path[0] ?? stepNow?.id) === node.id ? `is-step ${stepNow.failed ? 'is-step-fail' : ''}` : '')

  const setParam = (id, key, value) => !circuit.nodes.some((n) => n.id === id && isFixed(n, key)) && change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  // Formulas in the level's notation (everyday sentences, symbols once introduced: notation.js).
  const notation = test.symbolic ? { ...level.notation, words: level.symbolicWords ?? null, propertyWords: false } : level.notation
  const text = (f) => L(say(f, notation))
  const scene = board.scene({ ...level, notation }, test, text)
  // From chapter 7 on (`terms`) every card shows its proof term too.
  const Value = (props) => <board.Value {...props} terms={Boolean(level.terms)} />
  const result = run.result
  const best = progress.best?.[level.id]
  // A part's description as it reads in this level (the game's revisions along the course: defineGame textAt), on the
  // board it sits on (the level's, or the one a built part runs).
  const descOf = (type, lvl = level) => game.textAt(board.textOf(lvl, type, lvl.revisions), entry.id)?.desc
  // The shapes a card of a part with forms offers here: its first, and every one an upgrade passed before brings.
  const formsOf = (type) => game.textAt(board.textOf(level, type, level.revisions), entry.id)?.forms ?? []
  const itemOf = (type) => ({ type, label: board.nameOf(level, type), desc: descOf(type), icon: board.iconOf(level, type), family: board.familyOf(level, type), packed: parts.packed?.({ type }), fresh: entry.fresh?.includes(type) })

  // What a card is drawn with: on the level's board, its own; inside a built part, that part's board, read only.
  const own = { board: { ...board, Value }, parts, level, circuit, view, scene, setParam, text, formsOf }
  const inner = new WeakMap()
  const facesOf = (ctx) => {
    if (!ctx.readOnly) return own
    if (!inner.has(ctx.board)) {
      const at = ctx.board
      inner.set(at, { board: { ...board, Value }, parts: at.parts, level: at.level, circuit: at.circuit, view: at.view, scene: board.scene(at.level, at.level.tests[0], text), setParam: () => {}, text, formsOf: () => [] })
    }
    return inner.get(ctx.board)
  }
  // What a region opens with (or that it opens with nothing yet): at its left edge, or first in its grid on a phone.
  const small = (v) => (v ? <Value v={v} text={text} small /> : null)
  const regionNote = (node, region, ctx) => {
    if (ctx.readOnly) return small(ctx.view.values.get(srcOf(node, region)))
    // A for-any box opens no assumption: its region holds the thing it takes.
    if (node.type === 'allI') return node.params?.x ? <span className="lg-taken">{tr('任取的是', 'Taken:')} <b>{node.params.x}</b></span> : <i className="lg-mark">{tr('尚未命名', 'not named yet')}</i>
    const v = view.values.get(srcOf(node, region))
    return v ? <Value v={v} text={text} small /> : <i className="lg-mark">{L(board.words.noOpen)}</i>
  }
  // By a region's result: what the frame gives (or why it gives nothing yet); each box of Induction proves its own case.
  const resultNote = (node, region, ctx) => {
    if (ctx.readOnly) return small(ctx.view.values.get(node.id))
    if (node.type === 'natInd' && region) {
      let want = null
      try { const G = parse(node.params?.P ?? '', { consts: level.consts ?? [] }); if (G.op === '∀' && node.params?.x) want = inductionCases(G, node.params.x, level.consts)[region] } catch { want = null }
      return want ? <span className="lg-taken">{tr('要证', 'To prove')} <b>{text(want)}</b></span> : <i className="lg-mark">{tr('请先选择要证的句子和名字', 'choose the sentence to prove and the name first')}</i>
    }
    const [v, error] = [view.values.get(node.id), view.errors.get(node.id)]
    if (v) return <Value v={v} text={text} small />
    return error && error !== MISSING ? <span className="lg-error">{L(error)}</span> : <i className="lg-mark">{tr('尚未接线', 'nothing wired in yet')}</i>
  }
  const passed = run.passed
  const sinkMark = (node) => (parts.role(node) === 'sink' && result ? (result.pass ? 'is-pass' : 'is-fail') : '')
  // The steps of the test shown, so far: what each card gave, the current one marked.
  const shown = stepped ? run.playback.shown(run.at) : { list: [], at: -1 }
  const stepLog = <StepLog steps={shown.list.map((s) => ({ label: s.label, value: s.value ? <Value v={s.value} text={text} /> : null, failed: s.failed }))} at={shown.at} />
  const verdictText = result ? (result.pass ? L(board.words.pass) : L(result.reason)) : null
  const began = Boolean(run.run && (run.run.step >= 0 || run.run.results.length > 0 || run.run.test > 0))
  const verdict = verdictText && <p className={`lg-verdict ${result.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>
  // On a phone the run shows under the board, in a window of a fixed size, from its first step on.
  const below = stepped ? began && (
    <section className="lg-preview">
      <h3>{tr('运行过程', 'The run')}</h3>
      {shown.list.length > 0 ? stepLog : <p className="lg-mark lg-preview-empty">{onThis ? tr('这组测试开始运行……', 'Running this test…') : tr('这组测试尚未运行。', 'This test has not run yet.')}</p>}
      {verdict}
    </section>
  ) : verdict

  return (
    <CircuitLevel
      screen={screen}
      board={lb}
      run={run}
      className="lg-level"
      parts={parts}
      items={palette.map(itemOf)}
      folded={folded.map(itemOf)}
      view={view}
      card={{
        body: (node, ctx) => <CardBody node={node} {...facesOf(ctx)} />,
        head: (node, ctx) => (!ctx.readOnly && parts.role(node) === 'sink' && result ? <em className="node-verdict">{L(result.pass ? board.words.reached : board.words.notYet)}</em> : null),
        cardClass: (node, ctx) => (ctx.readOnly ? 'lg-node' : `lg-node ${sinkMark(node)} ${stepClass(node)}`),
        wireState: (wire, ctx) => (ctx.view.values.get(wire.from) ? 'live' : 'dead'),
        regionNote,
        resultNote,
        ...phoneFaces(Value, text, facesOf),
        sinkClass: (node, ctx) => (ctx.readOnly ? '' : sinkMark(node)),
        nodeClass: (node, ctx) => (ctx.readOnly ? '' : stepClass(node)),
      }}
      canvas={{ width: 160, height: 150, emptyNote: board.words.empty }}
      brief={{
        text: level.kind === 'proof' ? tests.at(-1).caseBrief : undefined,
        hint: level.hint,
        children: (
          <>
            {level.script && <ScriptView rows={level.script} text={(t) => text(parse(t, { consts: [...(level.consts ?? []), ...(level.things ?? [])] }))} />}
            <section className="lg-score">
              <div className="stat-row">
                <div className="stat"><b>{board.tests.score(level, circuit).steps}</b><span>{L(board.words.steps)}</span></div>
                {level.budget !== undefined && <div className="stat"><b>{level.budget}</b><span>{tr('最多', 'At most')}</span></div>}
                {best && <div className="stat"><b>{best.steps}</b><span>{tr('最少', 'Best')}</span></div>}
              </div>
            </section>
          </>
        ),
      }}
      describe={(node, ctx) => (facesOf(ctx).parts.role(node) === 'part' ? descOf(node.type, facesOf(ctx).level) : null)}
      results={phone ? undefined : (
        <div className="lg-strip">
          <p className="lg-sequent">{scene.sequent}</p>
          {stepLog}
          <p className={`lg-verdict ${result ? (result.pass ? 'is-pass' : 'is-fail') : ''}`}>{verdictText ?? L(board.words.idle)}</p>
        </div>
      )}
      below={below}
      follow={stepped && { began, key: run.run ? `${run.run.test}:${run.run.step}:${run.run.results.length}` : '' }}
      words={{ go: L(board.words.go), done: L(board.words.passed) }}
      packed={stepped && {
        // A part the player built runs the board that built it (the level's own built parts, at any depth).
        open: (node) => {
          const at = MACHINE_PARTS[node.type]?.built && opens(node.type)
          return at && { ...at, parts: partsOf(at.level) }
        },
        edit: (node) => openRef('level', opens(node.type).level.id),
        // The test shown, traced: up to the step shown, or its whole run.
        trace: () => {
          const traced = tracedOf(run.at)
          const upTo = stepNow ? stepNow.at : onThis && run.run.step < 0 ? -1 : traced.trace.length - 1
          return { trace: traced.trace, upTo, step: stepNow }
        },
      }}
    />
  )
}

// The shapes a part with forms offers on its card here: its first, and those `more` brings, each with its label (its
// text's `forms`, [{ key, label }]).
const shapesOf = (part, text, more) => part.forms.filter((k, i) => i === 0 || more.includes(k)).map((k) => ({ key: k, label: text?.forms?.find((f) => f.key === k)?.label ?? k }))
const DEPTHS = [2, 3, 4, 5, 6, 8, 10, 12]
const WAYS = [2, 3, 4, 5, 6]

// What a machine board's input and result hold (`board.ioBox`), written out in full, in a box sized as a step's result
// in the run (shell StepLog): as tall as what it holds, up to that result's height, and scrolling past it.
const IoBox = ({ children }) => <div className="lg-io" onPointerDown={(e) => e.stopPropagation()}>{children}</div>

// The rules a rule part gives, in the order it gives them, each written out: × takes one off (never the last), and
// a menu under them adds one it does not give yet, at the end. A part with one rule only shows it.
function RuleList({ label, value, onChange, choices, disabled }) {
  const kept = value.filter((k) => choices.some((c) => c.value === k))
  const rest = choices.filter((c) => !kept.includes(c.value))
  const labelOf = (k) => choices.find((c) => c.value === k).label
  return (
    <div className="lg-rules" role="group" aria-label={L(label)} onPointerDown={(e) => e.stopPropagation()}>
      {kept.map((k) => (
        <div key={k} className="lg-rule">
          <code>{labelOf(k)}</code>
          {kept.length > 1 && !disabled && <button type="button" aria-label={tr('移除这条规则', 'Remove this rule')} onClick={() => onChange(kept.filter((x) => x !== k))}><X size={13} /></button>}
        </div>
      ))}
      {rest.length > 0 && !disabled && (
        <select value="" aria-label={tr('添加规则', 'Add a rule')} onChange={(e) => e.target.value && onChange([...kept, e.target.value])}>
          <option value="">{tr('＋ 添加规则', '+ Add a rule')}</option>
          {rest.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      )}
    </div>
  )
}

// One setting on a card: what kind it is decides how it is chosen (board.settings).
function Setting({ s, node, board, parts, level, circuit, scene, setParam, formsOf }) {
  const value = node.params[s.key] ?? ''
  const set = (v) => setParam(node.id, s.key, v)
  // A setting the level's preset fixed only shows (../../../circuit/model.js).
  const disabled = isFixed(node, s.key)
  switch (s.kind) {
    case 'form': return <FormulaField label={board.textOf(level, node.type)?.formLabel ?? T('形状', 'Shape')} value={formOf(parts.rules[node.type], node)} onChange={set} choices={shapesOf(parts.rules[node.type], board.textOf(level, node.type), formsOf(node.type)).map((o) => ({ value: o.key, label: L(o.label) }))} required disabled={disabled} />
    // A rule part's own rule, when it has several (../machine.js rulePartsOf).
    case 'use': return <RuleList label={s.label} value={value || [scene.choices.uses[node.type][0].value]} onChange={set} choices={scene.choices.uses[node.type]} disabled={disabled} />
    // As many regions as the frame has: never fewer than the last one holding something.
    case 'ways': {
      const regions = parts.frames(node).map((r) => r.name)
      const held = regions.filter((r) => circuit.nodes.some((n) => n.in === `${node.id}/${r}`) || circuit.wires.some((w) => (w.to === node.id && w.port === r) || w.from === `${node.id}#${r}`))
      const least = Math.max(2, ...held.map((r) => regions.indexOf(r) + 1))
      return <FormulaField label={s.label} value={String(value || 2)} onChange={set} choices={WAYS.filter((n) => n >= least).map((n) => ({ value: String(n), label: tr(`${n} 条`, `${n}`) }))} required disabled={disabled} />
    }
    case 'depth': return <FormulaField label={s.label} value={String(value)} onChange={set} choices={DEPTHS.map((d) => ({ value: String(d), label: tr(`${d} 层`, `${d} levels`) }))} blank={T('不限', 'No limit')} disabled={disabled} />
    case 'at': return <FormulaField label={s.label} value={value} onChange={set} choices={[{ value: 'hyps', label: tr('已知', 'Hypotheses') }]} blank={T('目标', 'Goal')} disabled={disabled} />
    case 'unit': return <FormulaField label={s.label} value={value} onChange={set} choices={[{ value: 'unit', label: tr('只和单项子句', 'One-literal clauses only') }]} blank={T('任意两条', 'Any two')} disabled={disabled} />
    // A sentence is built on the strip (SentencePick.jsx) from the pieces of the level's sentences; a thing is picked.
    case undefined: case 'formula': case 'exists': return (
      <div className="lg-field" onPointerDown={(e) => e.stopPropagation()}>
        <span>{L(s.label)}</span>
        <SentenceButton value={value} onChange={set} build={scene.build} title={s.label} placeholder={s.blank ?? T('拼一句', 'Build a sentence')} scope={`${node.id}:${s.key}`} disabled={disabled} clearable={Boolean(s.blank)} />
      </div>
    )
    default: return <FormulaField label={s.label} value={value} onChange={set} choices={scene.choices[s.kind]} blank={s.blank} disabled={disabled} />
  }
}

// Under a card's ports: its settings, and what it gives (or why it cannot yet); a frame shows that by its regions'
// results instead, and folded, how much it holds.
function CardBody({ node, board, parts, level, circuit, view, scene, setParam, text, formsOf }) {
  const { Value } = board
  const value = view.values.get(node.id)
  const error = view.errors.get(node.id)
  const role = parts.role(node)
  const regions = new Set(parts.frames(node).map((r) => r.name))
  const outs = parts.outputs(node)?.filter((o) => !regions.has(o.key))
  const multi = outs && !(outs.length === 1 && outs[0].key === null) ? outs : null
  const held = regions.size ? within(circuit, node.id).size : 0
  const problem = error && <span className={`lg-error ${error === MISSING ? 'is-missing' : ''}`}>{error === MISSING ? tr('等待接线', 'Not wired yet') : L(error)}</span>
  const settings = board.settings(parts, node, level)
  // A rule part shows the rules it gives of its own (its list); what comes in before them shows on the parts wired in.
  const ruled = settings.some((s) => s.kind === 'use')
  return (
    <div className="lg-card">
      {role === 'sink' && scene.want}
      {settings.map((s) => <Setting key={s.key} s={s} node={node} board={board} parts={parts} level={level} circuit={circuit} scene={scene} setParam={setParam} formsOf={formsOf} />)}
      {board.extra?.(node, setParam, { ins: Object.fromEntries(circuit.wires.filter((w) => w.to === node.id).map((w) => [w.port, view.values.get(w.from)])), text })}
      {node.fold && <span className="lg-held">{held ? tr(`框内 ${held} 步`, held === 1 ? '1 step inside' : `${held} steps inside`) : tr('框内为空', 'Empty')}</span>}
      {role === 'source' && (board.ioBox ? <IoBox><Value v={value} text={text} /></IoBox> : <Value v={value} text={text} bare />)}
      {role === 'sink' && board.ioBox && !problem && <IoBox><Value v={value} text={text} /></IoBox>}
      {role !== 'source' && !(role === 'sink' && board.ioBox && !problem) && (!regions.size || node.fold) && !(ruled && !problem) && (problem || (multi ? multi.map((o) => (
        <span key={o.key} className="lg-out"><em>{L(o.short)}</em><Value v={view.values.get(srcOf(node, o.key))} text={text} /></span>
      )) : <Value v={value} text={text} />))}
    </div>
  )
}

// What a phone block shows: a frame what it gives outside (what it opens shows in its regions), a source its value in
// full, any other its value small; and a sink what the level wants and what reaches it.
function phoneFaces(Value, text, facesOf) {
  const thumb = (n, ctx) => {
    const { board, parts, view } = facesOf(ctx)
    const error = view.errors.get(n.id)
    const outs = parts.frames(n).length ? [] : outputsOf(parts, n)
    if (outs.length > 1) return <span className="lg-chips">{outs.map((o) => <span key={o.key} className="lg-out"><em>{L(o.short)}</em><Value v={view.values.get(srcOf(n, o.key))} text={text} small /></span>)}</span>
    if (error) return error === MISSING ? <i className="lg-mark">{tr('待接线', 'unwired')}</i> : <span className="lg-error">{L(error)}</span>
    if (board.ioBox && parts.role(n) === 'source') return <IoBox><Value v={view.values.get(n.id)} text={text} /></IoBox>
    return <Value v={view.values.get(n.id)} text={text} small />
  }
  const sinkBody = (n, ctx) => {
    const { board, view, scene } = facesOf(ctx)
    return (
      <span className="lg-sink">
        {scene.want}
        {board.ioBox ? <IoBox><Value v={view.values.get(n.id)} text={text} /></IoBox> : <Value v={view.values.get(n.id)} text={text} small />}
      </span>
    )
  }
  return { thumb, sinkBody }
}
