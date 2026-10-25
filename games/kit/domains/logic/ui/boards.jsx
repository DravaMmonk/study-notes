// The logic domain's boards for BoardScreen (《证明完毕》): how each runs and is judged, what its wires carry and how a
// card shows it, what a test asks and how the board's cards are described to the editor.
//
//   board  { tests, parts(level), start(level), fits(saved, level, parts), Value({ v, text, small, bare }),
//            scene(level, test, text) → { sequent, want, choices }, settings(parts, node, lemmas), extra?(node, setParam),
//            nameOf, iconOf, familyOf (lemmas, type), textOf (lemmas, type, revisions): a part's text, words }
import { ArrowRightFromLine, Box, Flag, Repeat, Sigma } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import { regionsFit } from '../../../circuit/index.js'
import { startProof } from '../build.js'
import { FORMULA_TEXT, occurrences, parse, replaceAtoms, replaceTerm, show, tvar } from '../formula.js'
import { sayTerm } from '../notation.js'
import { choicesOf } from '../choices.js'
import { LOGIC_TESTS } from '../proof.js'
import { MACHINE_PARTS, MACHINE_TESTS, inputsOf, inputsOfLevel } from '../machine.js'
import { refuted } from '../clauses.js'
import { clauseFormulaOf } from '../unify.js'
import { parseTh } from '../theory.js'
import { printTerm } from '../pterm.js'
import { MACHINE_TEXT, familyOf, iconOf, nameOf, partsFor, settingsOf, textOf, withRevisions } from './catalog.js'

const T = (zh, en) => ({ zh, en })

/* ---------- proofs ---------- */

/** A judgment: the formula proved, the hypotheses it still rests on, and (from chapter 6, `terms`) its proof term. */
function Judgment({ v, text, small = false, bare = false, terms = false }) {
  if (!v) return null
  const hyps = [...v.hyps.values()]
  return (
    <span className={`lg-formula ${small ? 'is-small' : ''}`}>
      <b>{text(v.formula)}</b>
      {terms && v.term && <code className="lg-term" title={tr('证明项', 'Proof term')}>{printTerm(v.term)}</code>}
      {!small && !bare && hyps.length > 0 && <small>{tr('依赖', 'from')} {hyps.map(text).join(tr('；', '; '))}</small>}
    </span>
  )
}

const premiseNames = (level) => Object.keys(level.schema.premises ?? {}).sort().join()
const names = (circuit) => circuit.nodes.filter((n) => n.type === 'premise').map((n) => n.params.name).sort().join()
// A saved board still fits: every card a part the board has, every wire into a port its card has, every card in a
// region of a frame that is there.
const fitsBoard = (circuit, parts) => {
  const byId = new Map(circuit.nodes.map((n) => [n.id, n]))
  return circuit.nodes.every((n) => parts.role(n) !== 'part' || parts.rules[n.type]) && regionsFit(circuit, parts)
    && circuit.wires.every((w) => byId.has(w.to) && parts.inputs(byId.get(w.to)).includes(w.port))
}

export const PROOF = {
  tests: LOGIC_TESTS,
  parts: (level) => partsFor(level.lemmas, Object.keys(level.schema.premises ?? {})),
  start: startProof,
  fits: (saved, level, parts) => names(saved) === premiseNames(level) && fitsBoard(saved, parts),
  Value: Judgment,
  // A card holds the schema's letters and shows them as this test's sentences, so its choices are the schema's own
  // sentences (../choices.js), renamed whenever the test changes.
  scene: (level, test, text) => {
    const consts = level.consts ?? []
    const goal = parse(test.goal, { consts })
    const premises = Object.values(test.premises ?? {}).map((t) => parse(t, { consts }))
    const offer = choicesOf(level)
    const sentence = (f) => ({ value: show(f), label: text(replaceAtoms(f, test.subst)) })
    return {
      // Chapter 6 names each premise (its proof term is that name) and may ask for the proof's term too.
      sequent: <>{premises.length > 0 && <>{tr('已知', 'Given')} <b>{Object.entries(test.premises).map(([name, t]) => `${level.terms ? `${name}: ` : ''}${text(parse(t, { consts }))}`).join(tr('；', '; '))}</b> · </>}{tr('要证', 'prove')} <b>{text(goal)}</b>{test.term && <> · {tr('证明项要是', 'with the proof term')} <code className="lg-term">{test.term}</code></>}</>,
      want: <span className="lg-want">{tr('要证', 'Prove')} <b>{text(goal)}</b>{test.term && <><br />{tr('证明项要是', 'Proof term')} <code className="lg-term">{test.term}</code></>}</span>,
      choices: {
        formula: offer.formula.map(sentence),
        exists: offer.exists.map(sentence),
        term: offer.term.map((t) => ({ value: t, label: L(sayTerm(parse(`${t} = ${t}`, { consts }).args[0], level.notation)) })),
        name: offer.name.map((v) => ({ value: v, label: v })),
      },
    }
  },
  settings: (parts, node, lemmas) => settingsOf(parts.rules, node, lemmas),
  extra: (node, setParam, { ins, text }) => (node.type === 'orI' ? (
    <div className="lg-side" role="group" aria-label={tr('另一边放在', 'Other side goes')} onPointerDown={(e) => e.stopPropagation()}>
      <span>{tr('另一边放', 'Other side')}</span>
      {[['left', tr('左', 'left')], ['right', tr('右', 'right')]].map(([side, label]) => (
        <button key={side} type="button" aria-pressed={(node.params.side ?? 'right') === side} onClick={() => setParam(node.id, 'side', side)}>{label}</button>
      ))}
    </div>
  ) : node.type === 'rewrite' && <Occurrences node={node} ins={ins} setParam={setParam} text={text} />),
  nameOf,
  textOf,
  iconOf,
  familyOf,
  words: {
    steps: T('步数', 'Steps'),
    go: T('检查证明', 'Check proof'),
    passed: T('证明完毕', 'Q.E.D.'),
    pass: T('目标证出来了，没有留下开着的假设。', 'The goal is proved, with no hypothesis left open.'),
    idle: T('检查时每组测试都要过：目标收到的是不是要证的那句，还有没有没关上的假设。', 'Checking runs every test: does the goal receive the sentence to prove, and is any hypothesis left open?'),
    reached: T('证到了', 'Proved'),
    notYet: T('还没有', 'Not yet'),
    noOpen: T('还没有假设', 'nothing assumed yet'),
    empty: T('从上面一排元件里选一条规则放上来，再从卡片右侧的圆点连到另一张卡片左侧的圆点。', 'Pick a rule from the row above, then wire a dot on the right of a card to a dot on the left of another.'),
  },
}

// A rewrite card's choice: φ with every s in a box, ticked to be replaced by t. The boxes appear once s = t and φ
// are wired in.
const MARK = '\u0001'
function Occurrences({ node, ins, setParam, text }) {
  const [e, p] = [ins.eq?.formula, ins.p?.formula]
  // A term in the level's words: the left side of t = t as the board writes it.
  const say = (t) => text({ op: 'atom', pred: '=', args: [t, t] }).split(' = ')[0]
  if (!e || !p) return <span className="lg-mark">{tr('接上 s = t 和 φ(s)，这里会框出每一个 s', 'Wire in s = t and φ(s), and each s shows here in a box')}</span>
  if (e.op !== 'atom' || e.pred !== '=') return null
  const s = e.args[0]
  const n = occurrences(p, s)
  if (!n) return null
  const at = node.params.at ?? []
  const toggle = (k) => setParam(node.id, 'at', at.includes(k) ? at.filter((x) => x !== k) : [...at, k].sort((a, b) => a - b))
  // φ written with a marker for each occurrence, then cut at the markers.
  const pieces = text(replaceTerm(p, s, (k) => tvar(`${MARK}${k}${MARK}`), () => true)).split(new RegExp(`${MARK}(\\d+)${MARK}`))
  const term = say(s)
  return (
    <div className="lg-occ" role="group" aria-label={tr('选出要换掉的', 'Choose which to replace')} onPointerDown={(ev) => ev.stopPropagation()}>
      <small>{tr(`点框选出要换成 ${say(e.args[1])} 的地方`, `Tick where it becomes ${say(e.args[1])}`)}</small>
      <span className="lg-occ-text">
        {pieces.map((piece, i) => (i % 2 ? (
          <button key={i} type="button" aria-pressed={at.includes(Number(piece))} onClick={() => toggle(Number(piece))}>{term}</button>
        ) : <span key={i}>{piece}</span>))}
      </span>
    </div>
  )
}

/* ---------- machines ---------- */

const SHOWN = 6
/** A formula, or a clause set: its clauses (the first few), and ⊥ standing out once it is in. */
function MachineValue({ v, text, small = false }) {
  if (!v) return null
  if (v.kind === 'formula') return <span className={`lg-formula ${small ? 'is-small' : ''}`}><b>{text(v.f)}</b></span>
  if (v.kind === 'state') {
    if (small) return <span className="lg-clauses is-small">{v.error ? <b className="lg-fail-tag">{tr('这一步不行', 'This step fails')}</b> : !v.goals.length ? <b className="lg-bot">{tr('证完了', 'Proved')}</b> : <small>{tr(`还有 ${v.goals.length} 个目标`, `${v.goals.length} goal${v.goals.length === 1 ? '' : 's'} left`)}</small>}</span>
    return (
      <span className="lg-clauses">
        {v.error && <><b className="lg-fail-tag">{tr('这一步不行', 'This step fails')}</b><small>{L(v.error)}</small></>}
        {!v.goals.length && <b className="lg-bot">{tr('没有目标了：证完了', 'No goals left: proved')}</b>}
        {v.goals.slice(0, SHOWN).map((g, k) => (
          <code key={k}>{g.hyps.length > 0 && <small className="lg-hyps">{g.hyps.map(text).join(tr('；', '; '))} ⊢ </small>}{text(g.goal)}</code>
        ))}
        {v.goals.length > 0 && <small>{tr(`${v.goals.length} 个目标`, `${v.goals.length} goal${v.goals.length === 1 ? '' : 's'}`)}</small>}
      </span>
    )
  }
  if (v.kind === 'eqs') {
    const term = (t) => L(sayTerm(t, null))
    return (
      <span className={`lg-clauses ${small ? 'is-small' : ''}`}>
        {v.fail && <b className="lg-fail-tag">{tr('合一失败', 'No unifier')}</b>}
        {!small && v.fail && <small>{L(v.fail)}</small>}
        {(small ? [] : v.eqs.slice(0, SHOWN)).map(([s, t], k) => <code key={k}>{term(s)} = {term(t)}</code>)}
        <small>{v.eqs.length ? tr(`${v.eqs.length} 个等式`, `${v.eqs.length} equation${v.eqs.length === 1 ? '' : 's'}`) : tr('没有等式了', 'No equations left')}</small>
      </span>
    )
  }
  const count = tr(`共 ${v.set.length} 条子句`, `${v.set.length} clause${v.set.length === 1 ? '' : 's'}`)
  const bot = refuted(v.set) && <b className="lg-bot">{tr('推出了空子句 ⊥', 'The empty clause ⊥ is in')}</b>
  // Small (a region's edge, a phone block): how many, and whether ⊥ is in.
  if (small) return <span className="lg-clauses is-small">{bot}<small>{count}</small></span>
  const shown = v.set.filter((c) => c.length).slice(0, SHOWN)
  return (
    <span className="lg-clauses">
      {bot}
      {shown.map((c) => <code key={c.join()}>{text(clauseFormulaOf(c))}</code>)}
      <small>{v.set.length > shown.length + (refuted(v.set) ? 1 : 0) ? tr(`…… ${count}`, `… ${count}`) : count}</small>
    </span>
  )
}

const WANT = {
  noDneg: T('和输入等价，没有 ¬¬', 'equivalent to the input, with no ¬¬'),
  noArrow: T('和输入等价，没有 → 和 ↔', 'equivalent to the input, with no → or ↔'),
  nnf: T('和输入等价的否定范式', 'an equivalent NNF'),
  cnf: T('和输入等价的合取范式', 'an equivalent CNF'),
  refuted: T('推出空子句 ⊥', 'the empty clause ⊥'),
  decide: T('推得出 ⊥ 就推出来；推不出，就饱和到再没有新子句', '⊥ if it follows; otherwise saturated, with no new clause left'),
  entails: T('推得出就推出 ⊥；推不出，就饱和到再没有新子句', '⊥ if it follows; otherwise saturated, with no new clause left'),
  unify: T('解完的等式（能合一时），或者「失败」（不能时）', 'the solved equations (when they unify), or “failed” (when not)'),
  prenex: T('前束范式', 'prenex form'),
  skolem: T('Skolem 化以后的样子', 'the Skolemised form'),
  clauseForm: T('这句话的子句形式', 'this sentence’s clause form'),
  foRefuted: T('推出空子句 ⊥', 'the empty clause ⊥'),
  proved: T('没有目标了：证完', 'no goals left: proved'),
}
const MACHINE_ICONS = { repeat: Repeat, saturate: Sigma }
const machineName = (type) => MACHINE_TEXT[type]?.name ?? type

/** The editor's description of a machine board (../../../circuit/model.js parts), for a level's inputs. */
function machinePartsFor(level) {
  const labels = new Map(inputsOfLevel(level).map((i) => [i.name, i.label]))
  return {
    inputs: (node) => (node.type === 'out' ? ['in'] : node.type === 'in' ? [] : MACHINE_PARTS[node.type]?.inputs ?? []),
    role: (node) => (node.type === 'in' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    label: (node) => (node.type === 'in' ? labels.get(node.params.name) ?? T('输入', 'Input') : node.type === 'out' ? T('结果', 'Result') : machineName(node.type)),
    portLabel: (node, port) => (MACHINE_TEXT[node.type]?.frames?.[port] ? T('结果', 'Result') : MACHINE_TEXT[node.type]?.ports?.[port] ?? ''),
    family: (node) => (node.type === 'in' ? 'given' : node.type === 'out' ? 'end' : MACHINE_PARTS[node.type]?.frames ? 'box' : 'lemma'),
    icon: (node) => (node.type === 'in' ? ArrowRightFromLine : node.type === 'out' ? Flag : MACHINE_ICONS[node.type] ?? (MACHINE_PARTS[node.type]?.frames ? Box : Sigma)),
    // A frame gives its result, and inside each region what that region opens with.
    outputs: (node) => (MACHINE_PARTS[node.type]?.frames ? [{ key: null, label: T('得出', 'Result'), short: T('得出', 'Result') }, ...MACHINE_PARTS[node.type].frames().filter((r) => r.opens).map((r) => ({ key: r.name, label: T('收到', 'Receives'), short: T('收到', 'Receives') }))] : null),
    cardWidth: (node) => (MACHINE_PARTS[node.type]?.frames ? 260 : node.type === 'in' || node.type === 'out' ? 190 : 170),
    frames: (node) => (MACHINE_PARTS[node.type]?.frames?.(node) ?? []).map((r) => ({ ...r, label: MACHINE_TEXT[node.type]?.frames?.[r.name] ?? r.name })),
    text: FORMULA_TEXT,
    rules: Object.fromEntries(Object.entries(MACHINE_PARTS).filter(([type]) => type !== 'in' && type !== 'out')),
  }
}

const startMachine = (level) => ({
  nodes: [...inputsOfLevel(level).map((i, k) => ({ id: i.name, type: 'in', params: { name: i.name }, x: 20, y: 40 + k * 130 })), { id: 'out', type: 'out', params: { name: 'out' }, x: 900, y: 40 }],
  wires: [],
})
const inputNames = (circuit) => circuit.nodes.filter((n) => n.type === 'in').map((n) => n.params.name).sort().join()

export const MACHINE = {
  tests: MACHINE_TESTS,
  parts: (level) => machinePartsFor(level),
  start: startMachine,
  fits: (saved, level, parts) => inputNames(saved) === inputNames(startMachine(level)) && fitsBoard(saved, parts),
  Value: MachineValue,
  scene: (level, test, text) => {
    const inputs = inputsOf(test)
    const labels = new Map(inputsOfLevel(level).map((i) => [i.name, i.label]))
    const want = L(WANT[test.want ?? level.want])
    const term = (t) => L(sayTerm(t, null))
    const show = (v) => (v.kind === 'state' ? v.goals.map((g) => `${g.hyps.length ? `${g.hyps.map(text).join(tr('；', '; '))} ⊢ ` : ''}${text(g.goal)}`).join(tr('；', '; ')) : v.kind === 'formula' ? text(v.f) : v.kind === 'eqs' ? v.eqs.map(([s, t]) => `${term(s)} = ${term(t)}`).join(tr('；', '; ')) : v.set.map((c) => text(clauseFormulaOf(c))).join(tr('；', '; ')))
    return {
      sequent: <>{level.defs?.length > 0 && <span>{tr('定义', 'Definitions')} <b>{level.defs.map((d) => text(parseTh(d))).join(tr('；', '; '))}</b> · </span>}{Object.entries(inputs).map(([name, v]) => <span key={name}>{L(labels.get(name) ?? T('输入', 'Input'))} <b>{show(v)}</b> · </span>)}{tr('要', 'want')} <b>{want}</b></>,
      want: <span className="lg-want">{tr('要', 'Want')} <b>{want}</b></span>,
      choices: [],
    }
  },
  settings: () => [],
  nameOf: (_lemmas, type) => machineName(type),
  textOf: (_lemmas, type, revisions = {}) => withRevisions(MACHINE_TEXT[type], revisions[type]),
  iconOf: (_lemmas, type) => MACHINE_ICONS[type] ?? (MACHINE_PARTS[type]?.frames ? Box : Sigma),
  familyOf: (_lemmas, type) => (MACHINE_PARTS[type]?.frames ? 'box' : 'lemma'),
  words: {
    steps: T('卡片', 'Cards'),
    go: T('运行全部测试', 'Run every test'),
    passed: T('全部通过', 'All passed'),
    pass: T('这组测试通过了。', 'This test passes.'),
    idle: T('运行时每组测试都要过：同一台机器，换一个输入再跑一遍。', 'Running checks every test: the same machine, run again on each input.'),
    reached: T('对了', 'Right'),
    notYet: T('还不对', 'Not yet'),
    noOpen: T('还没有收到东西', 'nothing received yet'),
    empty: T('从上面一排元件里选一张放上来，从「输入」接到「结果」。', 'Pick a part from the row above, and wire it from the input to the result.'),
  },
}
