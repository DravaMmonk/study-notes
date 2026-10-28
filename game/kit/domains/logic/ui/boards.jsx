// The logic domain's boards for BoardScreen (《证明完毕》): how each runs and is judged, what its wires carry and how a
// card shows it, what a test asks and how the board's cards are described to the editor.
//
//   board  { tests, parts(level), start(level), lock(level, saved), fits(saved, level, parts), Value({ v, text, small, bare }),
//            scene(level, test, text) → { sequent, want, choices }, settings(parts, node, level), extra?(node, setParam),
//            nameOf, iconOf, familyOf (level, type), textOf (level, type, revisions): a part's text, words }
import { ArrowRightFromLine, Box, Flag, GitFork, Repeat, Rows3, Search, Sigma } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import Entries from '../../../shell/Entries.jsx'
import { presetOf, regionsFit, withPreset } from '../../../circuit/index.js'
import { startProof } from '../build.js'
import { FORMULA_TEXT, fn, occurrences, parse, replaceAtoms, replaceTerm, show, tvar } from '../formula.js'
import { choicesOf } from '../choices.js'
import { LOGIC_TESTS } from '../proof.js'
import { MACHINE_PARTS, MACHINE_TESTS, RULE_PART, MATH, choicesOfPart, inputsOf, inputsOfLevel, parseGoal, rulePartsOf } from '../machine.js'
import { parseS, ruleText } from '../schematic.js'
import { rewriteText } from '../rewrite.js'
import { say, sayTerm } from '../notation.js'
import { constructorsOf } from '../datatype.js'
import { paramsOf } from '../../../engine/forms.js'
import { portsOf } from '../../../engine/circuit.js'
import { certificate, clauseFormula, refuted } from '../resolution.js'
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

// A board's start with the level's preset in place (`preset`: ids of its reference answer, course.js), and the preset
// put back into a saved board (a board saved before the level had one, or before it changed).
const withLevel = (start) => {
  const presetFor = (level) => {
    if (!level.preset) return null
    const fixed = new Set(start(level).nodes.map((n) => n.id))
    return presetOf(level.solution, level.preset, fixed)
  }
  return { start: (level) => withPreset(start(level), presetFor(level)), lock: (level, saved) => withPreset(saved, presetFor(level)) }
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
  ...withLevel(startProof),
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
      premiseNames: Object.keys(test.premises ?? {}),
      want: <span className="lg-want">{tr('要证', 'Prove')} <b>{text(goal)}</b>{test.term && <><br />{tr('证明项要是', 'Proof term')} <code className="lg-term">{test.term}</code></>}</span>,
      choices: {
        formula: offer.formula.map(sentence),
        exists: offer.exists.map(sentence),
        term: offer.term.map((t) => ({ value: t, label: L(sayTerm(parse(`${t} = ${t}`, { consts }).args[0], level.notation)) })),
        name: offer.name.map((v) => ({ value: v, label: v })),
      },
    }
  },
  settings: (parts, node, level) => settingsOf(parts.rules, node, level.lemmas),
  extra: (node, setParam, { ins, text }) => (node.type === 'orI' ? (
    <div className="lg-side" role="group" aria-label={tr('另一边放在', 'Other side goes')} onPointerDown={(e) => e.stopPropagation()}>
      <span>{tr('另一边放', 'Other side')}</span>
      {[['left', tr('左', 'left')], ['right', tr('右', 'right')]].map(([side, label]) => (
        <button key={side} type="button" aria-pressed={(node.params.side ?? 'right') === side} onClick={() => setParam(node.id, 'side', side)}>{label}</button>
      ))}
    </div>
  ) : node.type === 'rewrite' && <Occurrences node={node} ins={ins} setParam={setParam} text={text} />),
  nameOf: (level, type) => nameOf(level.lemmas ?? {}, type),
  textOf: (level, type, revisions) => textOf(level.lemmas ?? {}, type, revisions),
  iconOf: (level, type) => iconOf(level.lemmas ?? {}, type),
  familyOf: (level, type) => familyOf(level.lemmas ?? {}, type),
  words: {
    steps: T('步数', 'Steps'),
    go: T('检查证明', 'Check proof'),
    passed: T('证明完毕', 'Q.E.D.'),
    pass: T('目标证出来了，没有留下开着的假设。', 'The goal is proved, with no hypothesis left open.'),
    idle: T('检查时每组测试都要过：目标收到的是不是要证的那句，还有没有没关上的假设。', 'Checking runs every test: does the goal receive the sentence to prove, and is any hypothesis left open?'),
    reached: T('证到了', 'Proved'),
    notYet: T('还没有', 'Not yet'),
    noOpen: T('还没有假设', 'nothing assumed yet'),
    empty: T('从上面一排元件里选一条规则放上来，再从元件右侧的圆点连到另一个元件左侧的圆点。', 'Pick a rule from the row above, then wire a dot on the right of a part to a dot on the left of another.'),
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

// A side of an equation (a sentence, a thing, or what a pattern's letter stands for), an equation and a goal, written
// in the level's words: ⋀ for the variables bound around an equation and the things a goal has fixed.
const sideOf = (x, text) => ('t' in x ? text({ op: 'atom', pred: '=', args: [x, x] }).split(' = ')[0] : x.op === 'lam' ? `fun ${x.params.join(' ')} => ${text(x.body)}` : text(x))
const eqText = (e, text) => `${e.bound.length ? `⋀${e.bound.join(' ')}. ` : ''}${sideOf(e.s, text)} ≐ ${sideOf(e.t, text)}`
const goalText = (g, text) => `${g.fixes?.length ? `⋀${g.fixes.join(' ')}. ` : ''}${g.hyps.length ? `${g.hyps.map(text).join(tr('；', '; '))} ⊢ ` : ''}${text(g.goal)}`
/**
 * Equations, a proof state, or a clause set: its clauses (each with the clauses it came from), and once ⊥ is in, ⊥
 * standing out and only the clauses it comes from (the certificate). A list is the kit's Entries: a window ending in
 * how many there are.
 */
function MachineValue({ v, text, small = false }) {
  if (!v) return null
  if (v.kind === 'rules') {
    const count = tr(`${v.keys.length} 条规则`, `${v.keys.length} rule${v.keys.length === 1 ? '' : 's'}`)
    if (small) return <span className="lg-clauses is-small"><small>{count}</small></span>
    return <Entries className="lg-clauses" count={v.keys.length > 1 && count}>{v.entries.map((e, k) => <code key={k}>{`${k + 1}. ${ruleWritten(e, text)}`}</code>)}</Entries>
  }
  if (v.kind === 'state') {
    const others = v.more?.length ?? 0
    const alt = others > 0 && <small className="lg-alts">{tr(`第 1 种结果，共 ${others + 1} 种`, `result 1 of ${others + 1}`)}</small>
    if (small) return <span className="lg-clauses is-small">{v.error ? <b className="lg-fail-tag">{tr('这一步不行', 'This step fails')}</b> : !v.goals.length ? <b className="lg-bot">{tr('证完了', 'Proved')}</b> : <small>{tr(`还有 ${v.goals.length} 个目标`, `${v.goals.length} goal${v.goals.length === 1 ? '' : 's'} left`)}</small>}{alt}</span>
    return (
      <Entries
        className="lg-clauses"
        head={<>
          {v.error && <><b className="lg-fail-tag">{tr('这一步不行', 'This step fails')}</b><small>{L(v.error)}</small></>}
          {!v.goals.length && <b className="lg-bot">{tr('没有目标了：证完了', 'No goals left: proved')}</b>}
          {alt}
        </>}
        count={v.goals.length > 0 && tr(`${v.goals.length} 个目标`, `${v.goals.length} goal${v.goals.length === 1 ? '' : 's'}`)}
      >
        {v.goals.map((g, k) => <code key={k}>{goalText(g, text)}</code>)}
      </Entries>
    )
  }
  if (v.kind === 'eqs') {
    const fail = v.fail && <b className="lg-fail-tag">{tr('合一失败', 'No unifier')}</b>
    const count = v.eqs.length ? tr(`${v.eqs.length} 个等式`, `${v.eqs.length} equation${v.eqs.length === 1 ? '' : 's'}`) : tr('没有等式了', 'No equations left')
    if (small) return <span className="lg-clauses is-small">{fail}<small>{count}</small></span>
    return (
      <Entries className="lg-clauses" head={v.fail && <>{fail}<small>{L(v.fail)}</small></>} count={count}>
        {v.eqs.map((e, k) => <code key={k}>{eqText(e, text)}</code>)}
      </Entries>
    )
  }
  const count = tr(`共 ${v.set.length} 条子句`, `${v.set.length} clause${v.set.length === 1 ? '' : 's'}`)
  const bot = refuted(v.set) && <b className="lg-bot">{tr('推出了空子句 ⊥', 'The empty clause ⊥ is in')}</b>
  // Small (a region's edge, a phone block): how many, and whether ⊥ is in.
  if (small) return <span className="lg-clauses is-small">{bot}<small>{count}</small></span>
  const cert = certificate(v.set)
  const shown = cert ?? v.set.map((_, i) => i)
  return (
    <Entries className="lg-clauses" head={bot} count={v.endless ? tr(`${count}，还在变多`, `${count}, and still growing`) : count}>
      {shown.map((i) => <code key={i}>{`${i + 1}. ${text(clauseFormula(v.set[i]))}${v.set[i].from ? ` ← ${v.set[i].from.map((k) => k + 1).join(tr('、', ', '))}` : ''}`}</code>)}
    </Entries>
  )
}

const WANT = {
  clauses: T('拆成的子句', 'the clauses it splits into'),
  refuted: T('推出空子句 ⊥', 'the empty clause ⊥'),
  decide: T('推得出 ⊥ 就推出来；推不出，就饱和到再没有新子句', '⊥ if it follows; otherwise saturated, with no new clause left'),
  unify: T('解完的等式（能合一时），或者「失败」（不能时）', 'the solved equations (when they unify), or “failed” (when not)'),
  answers: T('找出所有答案', 'every answer'),
  fails: T('证不出来时，停下来说证不出来', 'when it cannot be proved, to stop and say so'),
  proved: T('没有目标了：证完', 'no goals left: proved'),
}
const MACHINE_ICONS = { repeat: Repeat, saturate: Sigma, search: Search, each: Rows3 }
// Rule parts (machine.js rulePartsOf): every rule of a level's books comes from the part it belongs to.
const isRulePart = (level, type) => !MACHINE_PARTS[type] && rulePartsOf(level).has(type)
// A sentence in the level's words, in each language, for names made of it.
const inWords = (level, write) => T(write((f) => say(f, level.notation).zh), write((f) => say(f, level.notation).en))
const ruleName = (level, r) => (r.group === 'def' ? inWords(level, (text) => defText(r.text, text)) : r.name)
const MATH_NAME = T('数理规则书', 'Rule book of numbers')
/** A rule part's name: the rule book of numbers, the proof-board part or lemma it is, or its rule's own name. */
function rulePartName(level, type) {
  if (type === MATH) return MATH_NAME
  const r = rulePartsOf(level).get(type)[0].rule
  if (r.part || level.lemmas?.[type]) return nameOf(level.lemmas ?? {}, type)
  return ruleName(level, r)
}
/** A rule of a rule part's, written out: an inference rule, or a rewrite rule (an equation given goes by its name). */
const ruleWritten = (e, say = show) => (e.book === 'rule' ? ruleText(e.rule, say) : rewriteText(e.rule, say) || L(e.rule.name))
/** What a rule part gives: each of its rules, written out. */
function rulePartText(level, type) {
  const entries = rulePartsOf(level).get(type)
  const lines = choicesOfPart(entries).map((key) => ruleWritten(entries.find((e) => e.key === key)))
  if (type === MATH) {
    return {
      name: MATH_NAME,
      desc: T(`这一关的数与列表规则：类型声明给出的、定义里的等式、已经证出的等式。元件上勾选给出哪几条：${lines.join('；')}。接进别的规则元件时，接在它们后面。`, `This level’s rules of numbers and lists: those its declarations give, its definitions’ equations and the equations proved so far. Tick on the part which it gives: ${lines.join('; ')}. Wired another rule part, it comes after their rules.`),
    }
  }
  return {
    name: rulePartName(level, type),
    desc: T(`给出规则：${lines.join('；')}。接进别的规则元件时，接在它们后面。`, `Gives the rule: ${lines.join('; ')}. Wired another rule part, it comes after their rules.`),
  }
}
/** The rules a rule part with several offers to tick, each written out in the test's words: [{ value, label }]. */
const usesOf = (level, type, text) => {
  const entries = rulePartsOf(level).get(type)
  return choicesOfPart(entries).map((key) => ({ value: key, label: ruleWritten(entries.find((e) => e.key === key), text) }))
}
const RULES_PORT = T('规则', 'Rules')
const BEFORE_PORT = T('前面', 'Before')
// A definition as the level writes it, in the level's words: 'c ⟹ l = r'.
function defText(d, text) {
  const [cond, eq] = d.includes('⟹') ? d.split('⟹') : [null, d]
  return `${cond ? `${cond.split(';').map((c) => text(parseS(c.trim()))).join(tr('；', '; '))} ⟹ ` : ''}${text(parseS(eq.trim()))}`
}
const machineName = (level, type) => (isRulePart(level, type) ? rulePartName(level, type) : MACHINE_TEXT[type]?.name ?? type)

/** The editor's description of a machine board (../../../circuit/model.js parts), for a level's inputs. */
function machinePartsFor(level) {
  const labels = new Map(inputsOfLevel(level).map((i) => [i.name, i.label]))
  return {
    inputs: (node) => (node.type === 'out' ? ['in'] : node.type === 'in' ? [] : MACHINE_PARTS[node.type] ? portsOf(MACHINE_PARTS[node.type], node) : isRulePart(level, node.type) ? portsOf(RULE_PART, node) : []),
    role: (node) => (node.type === 'in' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    label: (node) => (node.type === 'in' ? labels.get(node.params.name) ?? T('输入', 'Input') : node.type === 'out' ? T('结果', 'Result') : machineName(level, node.type)),
    portLabel: (node, port) => (port === 'rules' ? RULES_PORT : port === 'before' ? BEFORE_PORT : MACHINE_TEXT[node.type]?.frames?.[port] ? T('结果', 'Result') : MACHINE_TEXT[node.type]?.ports?.[port] ?? ''),
    family: (node) => (node.type === 'in' ? 'given' : node.type === 'out' ? 'end' : isRulePart(level, node.type) ? 'rule' : MACHINE_PARTS[node.type]?.frames ? 'box' : 'lemma'),
    icon: (node) => (node.type === 'in' ? ArrowRightFromLine : node.type === 'out' ? Flag : isRulePart(level, node.type) ? GitFork : MACHINE_ICONS[node.type] ?? (MACHINE_PARTS[node.type]?.frames ? Box : Sigma)),
    // A frame gives its result, and inside each region what that region opens with.
    outputs: (node) => (MACHINE_PARTS[node.type]?.frames ? [{ key: null, label: T('得出', 'Result'), short: T('得出', 'Result') }, ...MACHINE_PARTS[node.type].frames(node).filter((r) => r.opens).map((r) => ({ key: r.name, label: T('收到', 'Receives'), short: T('收到', 'Receives') }))] : null),
    // A part the player built runs the board that built it: a packed part.
    packed: (node) => Boolean(MACHINE_PARTS[node.type]?.built),
    // A built part unfolded shows the board it runs inside its card.
    cardWidth: (node) => (MACHINE_PARTS[node.type]?.frames ? 260 : node.type === 'in' || node.type === 'out' ? 190 : MACHINE_PARTS[node.type]?.built && node.open ? 480 : 170),
    frames: (node) => (MACHINE_PARTS[node.type]?.frames?.(node) ?? []).map((r) => ({ ...r, label: MACHINE_TEXT[node.type]?.frames?.[r.name] ?? r.name })),
    text: FORMULA_TEXT,
    rules: { ...Object.fromEntries(Object.entries(MACHINE_PARTS).filter(([type]) => type !== 'in' && type !== 'out')), ...Object.fromEntries([...rulePartsOf(level).keys()].map((type) => [type, RULE_PART])) },
  }
}

const startMachine = (level) => ({
  nodes: [...inputsOfLevel(level).map((i, k) => ({ id: i.name, type: 'in', params: { name: i.name }, x: 20, y: 40 + k * 130 })), { id: 'out', type: 'out', params: { name: 'out' }, x: 900, y: 40 }],
  wires: [],
})
const inputNames = (circuit) => circuit.nodes.filter((n) => n.type === 'in').map((n) => n.params.name).sort().join()

export const MACHINE = {
  tests: MACHINE_TESTS,
  // Inputs and results hold equations, goals or clauses: shown in full, in a box sized as a step's result in the run.
  ioBox: true,
  parts: (level) => machinePartsFor(level),
  ...withLevel(startMachine),
  fits: (saved, level, parts) => inputNames(saved) === inputNames(startMachine(level)) && fitsBoard(saved, parts),
  Value: MachineValue,
  scene: (level, test, text) => {
    const inputs = inputsOf(test, level)
    const labels = new Map(inputsOfLevel(level).map((i) => [i.name, i.label]))
    // A step's results, each its goals, or that it cannot be done.
    const becomes = test.becomes && (test.becomes.length ? `${tr('变成 ', 'it to become ')}${test.becomes.map((r) => (r.length ? r.map((g) => goalText(parseGoal(g), text)).join(' | ') : tr('证完', 'proved'))).join(tr('，或者 ', ', or '))}` : tr('这一步失败', 'the step to fail'))
    const want = becomes ?? L(WANT[test.want ?? level.want])
    const show = (v) => (v.kind === 'rules' ? v.entries.map((e) => ruleWritten(e, text)).join(tr('；', '; ')) : v.kind === 'state' ? v.goals.map((g) => goalText(g, text)).join(tr('；', '; ')) : v.kind === 'eqs' ? v.eqs.map((e) => eqText(e, text)).join(tr('；', '; ')) : v.set.map((c) => text(clauseFormula(c))).join(tr('；', '; ')))
    return {
      sequent: <>{level.datatypes && <span>{tr('类型', 'Types')} <b>{Object.entries(level.datatypes).map(([type, d]) => `${type} = ${constructorsOf(d).map((c) => text({ op: 'atom', pred: '=', args: [fn(c.f, c.args.map(tvar)), fn(c.f, c.args.map(tvar))] }).split(' = ')[0]).join(' | ')}`).join(tr('；', '; '))}</b> · </span>}{level.defs?.length > 0 && <span>{tr('定义', 'Definitions')} <b>{level.defs.map((d) => defText(d, text)).join(tr('；', '; '))}</b> · </span>}{Object.entries(inputs).map(([name, v]) => <span key={name}>{L(labels.get(name) ?? T('输入', 'Input'))} <b>{show(v)}</b> · </span>)}{tr('要', 'want')} <b>{want}</b></>,
      want: <span className="lg-want">{tr('要', 'Want')} <b>{want}</b></span>,
      choices: { uses: Object.fromEntries([...rulePartsOf(level).keys()].map((type) => [type, usesOf(level, type, text)])) },
    }
  },
  // A rule part with several rules ticks which it gives; another card's settings are its own.
  settings: (parts, node, level) => (isRulePart(level, node.type)
    ? (choicesOfPart(rulePartsOf(level).get(node.type)).length > 1 ? [{ key: 'use', label: T('给出哪几条', 'Which rules'), kind: 'use' }] : [])
    : [
      ...(parts.rules[node.type]?.forms ? [{ key: 'form', kind: 'form' }] : []),
      ...paramsOf(parts.rules[node.type], node).map((key) => ({ key, label: MACHINE_TEXT[node.type]?.params?.[key] ?? key, kind: key })),
    ]),
  nameOf: (level, type) => machineName(level, type),
  textOf: (level, type, revisions = {}) => (isRulePart(level, type) ? rulePartText(level, type) : withRevisions(MACHINE_TEXT[type], revisions[type])),
  iconOf: (level, type) => (isRulePart(level, type) ? GitFork : MACHINE_ICONS[type] ?? (MACHINE_PARTS[type]?.frames ? Box : Sigma)),
  familyOf: (level, type) => (isRulePart(level, type) ? 'rule' : MACHINE_PARTS[type]?.frames ? 'box' : 'lemma'),
  words: {
    steps: T('元件', 'Cards'),
    go: T('运行全部测试', 'Run every test'),
    passed: T('全部通过', 'All passed'),
    pass: T('这组测试通过了。', 'This test passes.'),
    idle: T('运行时每组测试都要过：同一个证明助手，换一个输入再跑一遍。', 'Running checks every test: the same proof assistant, run again on each input.'),
    reached: T('对了', 'Right'),
    notYet: T('还不对', 'Not yet'),
    noOpen: T('还没有收到东西', 'nothing received yet'),
    empty: T('从上面一排元件里选一张放上来，从「输入」接到「结果」。', 'Pick a part from the row above, and wire it from the input to the result.'),
  },
}
