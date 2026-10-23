// The logic domain's boards for BoardScreen (《证明完毕》): how each runs and is judged, what its wires carry and how a
// card shows it, what a test asks and how the board's cards are described to the editor.
//
//   board  { tests, parts(level), start(level), fits(saved, level, parts), Value({ v, text, small, bare }),
//            scene(level, test, text) → { sequent, want, choices }, settings(parts, node, lemmas), extra?(node, setParam),
//            nameOf, descOf, iconOf, familyOf (lemmas, type), words }
import { ArrowRightFromLine, Box, Flag, Repeat, Sigma } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import { regionsFit } from '../../../circuit/index.js'
import { startProof } from '../build.js'
import { allVars, parse, replaceAtoms, show } from '../formula.js'
import { compoundTerms, patternsOf, sayTerm, subformulas } from '../notation.js'
import { HOLE, LOGIC_TESTS } from '../proof.js'
import { MACHINE_PARTS, MACHINE_TESTS, inputsOf, inputsOfLevel } from '../machine.js'
import { clauseFormula, refuted } from '../clauses.js'
import { MACHINE_TEXT, descOf, familyOf, iconOf, nameOf, partsFor, settingsOf } from './catalog.js'

const T = (zh, en) => ({ zh, en })

/* ---------- proofs ---------- */

/** A judgment: the formula proved, and the hypotheses it still rests on. */
function Judgment({ v, text, small = false, bare = false }) {
  if (!v) return null
  const hyps = [...v.hyps.values()]
  return (
    <span className={`lg-formula ${small ? 'is-small' : ''}`}>
      <b>{text(v.formula)}</b>
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
  // sentences, renamed whenever the test changes.
  scene: (level, test, text) => {
    const consts = level.consts ?? []
    const goal = parse(test.goal, { consts })
    const premises = Object.values(test.premises ?? {}).map((t) => parse(t, { consts }))
    const schema = [...Object.values(level.schema.premises ?? {}), level.schema.goal].map((t) => parse(t, { consts }))
    // Terms: the level's names and the variables its sentences use, then a few more; a new variable, from those.
    const vars = [...new Set([...schema.flatMap((f) => [...allVars(f)]), 'x', 'y', 'z'])].filter((v) => v !== HOLE)
    // Compound terms the sentences use (s(x), the successor of x) are terms to pick too.
    const compound = [...new Set(schema.flatMap((f) => compoundTerms(f)))]
    return {
      sequent: <>{premises.length > 0 && <>{tr('已知', 'Given')} <b>{premises.map(text).join(tr('；', '; '))}</b> · </>}{tr('要证', 'prove')} <b>{text(goal)}</b></>,
      want: <span className="lg-want">{tr('要证', 'Prove')} <b>{text(goal)}</b></span>,
      choices: {
        formula: subformulas(schema).map((f) => ({ value: show(f), label: text(replaceAtoms(f, test.subst)) })),
        term: [...consts, ...vars, ...compound].map((t) => ({ value: t, label: L(sayTerm(parse(`${t} = ${t}`, { consts }).args[0], level.notation)) })),
        var: vars.map((v) => ({ value: v, label: v })),
        pattern: patternsOf(schema).map((f) => ({ value: show(f), label: text(replaceAtoms(f, test.subst)) })),
      },
    }
  },
  settings: (parts, node, lemmas) => settingsOf(parts.rules, node.type, lemmas),
  extra: (node, setParam) => node.type === 'orI' && (
    <div className="lg-side" role="group" aria-label={tr('另一边放在', 'Other side goes')} onPointerDown={(e) => e.stopPropagation()}>
      <span>{tr('另一边放', 'Other side')}</span>
      {[['left', tr('左', 'left')], ['right', tr('右', 'right')]].map(([side, label]) => (
        <button key={side} type="button" aria-pressed={(node.params.side ?? 'right') === side} onClick={() => setParam(node.id, 'side', side)}>{label}</button>
      ))}
    </div>
  ),
  nameOf,
  descOf,
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

/* ---------- machines ---------- */

const SHOWN = 6
/** A formula, or a clause set: its clauses (the first few), and ⊥ standing out once it is in. */
function MachineValue({ v, text, small = false }) {
  if (!v) return null
  if (v.kind === 'formula') return <span className={`lg-formula ${small ? 'is-small' : ''}`}><b>{text(v.f)}</b></span>
  const count = tr(`共 ${v.set.length} 条子句`, `${v.set.length} clause${v.set.length === 1 ? '' : 's'}`)
  const bot = refuted(v.set) && <b className="lg-bot">{tr('推出了空子句 ⊥', 'The empty clause ⊥ is in')}</b>
  // Small (a region's edge, a phone block): how many, and whether ⊥ is in.
  if (small) return <span className="lg-clauses is-small">{bot}<small>{count}</small></span>
  const shown = v.set.filter((c) => c.length).slice(0, SHOWN)
  return (
    <span className="lg-clauses">
      {bot}
      {shown.map((c) => <code key={c.join()}>{text(clauseFormula(c))}</code>)}
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
    outputs: (node) => (MACHINE_PARTS[node.type]?.frames ? [{ key: null, label: T('得出', 'Result'), short: T('得出', 'Result') }, { key: 'body', label: T('这一圈', 'This round'), short: T('这一圈', 'This round') }] : null),
    cardWidth: (node) => (MACHINE_PARTS[node.type]?.frames ? 260 : node.type === 'in' || node.type === 'out' ? 190 : 170),
    frames: (node) => (MACHINE_PARTS[node.type]?.frames?.(node) ?? []).map((r) => ({ ...r, label: MACHINE_TEXT[node.type]?.frames?.[r.name] ?? r.name })),
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
    const show = (v) => (v.kind === 'formula' ? text(v.f) : v.set.map((c) => text(clauseFormula(c))).join(tr('；', '; ')))
    return {
      sequent: <>{Object.entries(inputs).map(([name, v]) => <span key={name}>{L(labels.get(name) ?? T('输入', 'Input'))} <b>{show(v)}</b> · </span>)}{tr('要', 'want')} <b>{want}</b></>,
      want: <span className="lg-want">{tr('要', 'Want')} <b>{want}</b></span>,
      choices: [],
    }
  },
  settings: () => [],
  nameOf: (_lemmas, type) => machineName(type),
  descOf: (_lemmas, type) => MACHINE_TEXT[type]?.desc,
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
