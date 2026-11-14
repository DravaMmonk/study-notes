// The logic domain's machine board for BoardScreen (《证明完毕》): how it runs and is judged, what its wires carry and how a
// card shows it, what a test asks and how the board's cards are described to the editor.
//
//   board  { tests, parts(level), start(level), lock(level, saved), fits(saved, level, parts), Value({ v, text, small, bare }),
//            scene(level, test, text) → { sequent, want, choices }, settings(parts, node, level), extra?(node, setParam),
//            nameOf, iconOf, familyOf (level, type), textOf (level, type, revisions): a part's text, words }
import { ArrowRightFromLine, Box, CircuitBoard, Flag, GitFork, Repeat, Rows3, Search, Sigma } from 'lucide-react'
import { L, T, tr } from '../../../shell/i18n.js'
import { WORDS } from '../../../shell/words.js'
import Entries from '../../../shell/Entries.jsx'
import { presetOf, regionsFit, withPreset } from '../../../circuit/index.js'
import { fn, show, tvar } from '../formula.js'
import { MACHINE_PARTS, MACHINE_TESTS, RULE_PART, MATH, choicesOfPart, inputsOf, inputsOfLevel, parseGoal, rulePartsOf, startMachine } from '../machine.js'
import { machineShape } from '../blueprint.js'
import { parseS, ruleText } from '../schematic.js'
import { rewriteText } from '../rewrite.js'
import { say } from '../notation.js'
import { constructorsOf } from '../datatype.js'
import { paramsOf } from '../../../engine/forms.js'
import { certificate, clauseFormula, refuted } from '../resolution.js'
import { elimOf, genRuleText } from '../elimgen.js'
import { nameOf, withRevisions } from './catalog.js'
import { MACHINE_TEXT } from '../partText.js'


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

// A saved board still fits: every card a part the board has, every wire into a port its card has, every card in a
// region of a frame that is there.
const fitsBoard = (circuit, parts) => {
  const byId = new Map(circuit.nodes.map((n) => [n.id, n]))
  return circuit.nodes.every((n) => parts.role(n) !== 'part' || parts.rules[n.type]) && regionsFit(circuit, parts)
    && circuit.wires.every((w) => byId.has(w.to) && parts.inputs(byId.get(w.to)).includes(w.port))
}

/* ---------- machines ---------- */

// A side of an equation (a sentence, a thing, or what a pattern's letter stands for), an equation and a goal, written
// in the level's words: ⋀ for the variables bound around an equation and the things a goal has fixed.
const sideOf = (x, text) => ('t' in x ? text({ op: 'atom', pred: '=', args: [x, x] }).split(' = ')[0] : x.op === 'lam' ? `fun ${x.params.join(' ')} => ${text(x.body)}` : text(x))
const eqText = (e, text) => `${e.bound.length ? `⋀${e.bound.join(' ')}. ` : ''}${sideOf(e.s, text)} ≐ ${sideOf(e.t, text)}`
const goalText = (g, text) => `${g.fixes?.length ? `⋀${g.fixes.join(' ')}. ` : ''}${g.hyps.length ? `${g.hyps.map(text).join(tr('；'))} ⊢ ` : ''}${text(g.goal)}`
/**
 * Equations, a proof state, or a clause set: its clauses (each with the clauses it came from), and once ⊥ is in, ⊥
 * standing out and only the clauses it comes from (the certificate). A list is the kit's Entries: a window ending in
 * how many there are.
 */
function MachineValue({ v, text, small = false }) {
  if (!v) return null
  // The generator's values (chapter 3): a sentence, a rule, a list of them.
  if (v.kind === 'sentence') return <span className="lg-formula"><b data-card-sentence>{text(v.f)}</b></span>
  if (v.kind === 'rule') return <span className="lg-formula"><code data-card-sentence>{genRuleText(v.rule, text)}</code></span>
  if (v.kind === 'any') return <span className="lg-formula"><code data-card-sentence>{genValueText(v, text)}</code></span>
  if (v.kind === 'list') {
    const count = tr(`共 ${v.items.length} 项`, `${v.items.length} item${v.items.length === 1 ? '' : 's'}`)
    if (small) return <span className="lg-clauses is-small"><small>{count}</small></span>
    return <Entries className="lg-clauses" count={count}>{v.items.map((x, k) => <code key={k}>{`${k + 1}. ${genValueText(x, text)}`}</code>)}</Entries>
  }
  if (v.kind === 'rules') {
    const count = tr(`${v.keys.length} 条规则`, `${v.keys.length} rule${v.keys.length === 1 ? '' : 's'}`)
    if (small) return <span className="lg-clauses is-small"><small>{count}</small></span>
    return <Entries className="lg-clauses" count={v.keys.length > 1 && count}>{v.entries.map((e, k) => <code key={k}>{`${k + 1}. ${ruleWritten(e, text)}`}</code>)}</Entries>
  }
  if (v.kind === 'state') {
    const others = v.more?.length ?? 0
    const alt = others > 0 && <small className="lg-alts">{tr(`第 1 种结果，共 ${others + 1} 种`, `result 1 of ${others + 1}`)}</small>
    if (small) return <span className="lg-clauses is-small">{v.error ? <b className="lg-fail-tag">{tr('这一步失败', 'Step failed')}</b> : !v.goals.length ? <b className="lg-bot">{tr('证明完毕')}</b> : <small>{tr(`还有 ${v.goals.length} 个目标`, `${v.goals.length} goal${v.goals.length === 1 ? '' : 's'} left`)}</small>}{alt}</span>
    return (
      <Entries
        className="lg-clauses"
        head={<>
          {v.error && <><b className="lg-fail-tag">{tr('这一步失败', 'Step failed')}</b><small>{L(v.error)}</small></>}
          {!v.goals.length && <b className="lg-bot">{tr('证明完毕')}</b>}
          {alt}
        </>}
        count={v.goals.length > 0 && tr(`${v.goals.length} 个目标`, `${v.goals.length} goal${v.goals.length === 1 ? '' : 's'}`)}
      >
        {v.goals.map((g, k) => <code key={k}>{goalText(g, text)}</code>)}
      </Entries>
    )
  }
  if (v.kind === 'eqs') {
    const fail = v.fail && <b className="lg-fail-tag">{tr('合一失败')}</b>
    const count = v.eqs.length ? tr(`${v.eqs.length} 个等式`, `${v.eqs.length} equation${v.eqs.length === 1 ? '' : 's'}`) : tr('没有等式了')
    if (small) return <span className="lg-clauses is-small">{fail}<small>{count}</small></span>
    return (
      <Entries className="lg-clauses" head={v.fail && <>{fail}<small>{L(v.fail)}</small></>} count={count}>
        {v.eqs.map((e, k) => <code key={k}>{eqText(e, text)}</code>)}
      </Entries>
    )
  }
  const count = tr(`共 ${v.set.length} 条子句`, `${v.set.length} clause${v.set.length === 1 ? '' : 's'}`)
  const bot = refuted(v.set) && <b className="lg-bot">{tr('推出了空子句 ⊥')}</b>
  // Small (a region's edge, a phone block): how many, and whether ⊥ is in.
  if (small) return <span className="lg-clauses is-small">{bot}<small>{count}</small></span>
  const cert = certificate(v.set)
  const shown = cert ?? v.set.map((_, i) => i)
  return (
    <Entries className="lg-clauses" head={bot} count={v.endless ? tr(`${count}，仍在增加`, `${count}, still growing`) : count}>
      {shown.map((i) => <code key={i}>{`${i + 1}. ${text(clauseFormula(v.set[i]))}${v.set[i].from ? ` ← ${v.set[i].from.map((k) => k + 1).join(tr('、'))}` : ''}`}</code>)}
    </Entries>
  )
}

// A generator value in one line.
// A value that takes things first reads as a rule does: ⋀x. in front.
const genValueText = (v, text) => (v.kind === 'sentence' ? text(v.f) : v.kind === 'rule' ? genRuleText(v.rule, text) : v.kind === 'any' ? `⋀${v.vars.join(' ')}. ${genValueText(v.body, text)}` : v.items.map((x) => genValueText(x, text)).join(tr('；')))

const WANT = {
  elim: T('这份声明的消去规则'),
  clauses: T('拆成的子句'),
  refuted: T('推出空子句 ⊥'),
  decide: T('能推出 ⊥ 时推出 ⊥；否则饱和至不再产生新子句'),
  unify: T('解完的等式（能合一时），或者「失败」（不能时）'),
  answers: T('找出所有答案'),
  fails: T('证不出时停止，并报告证不出'),
  proved: T('证明完毕'),
}
const MACHINE_ICONS = { repeat: Repeat, search: Search, each: Rows3 }
// A part's glyph: a rule part's fork, a frame's own, and for a part the player built (a packed part) a circuit board.
const machineIcon = (level, type) => (isRulePart(level, type) ? GitFork : MACHINE_PARTS[type]?.built ? CircuitBoard : MACHINE_ICONS[type] ?? (MACHINE_PARTS[type]?.frames ? Box : Sigma))
// Rule parts (machine.js rulePartsOf): every rule of a level's books comes from the part it belongs to.
const isRulePart = (level, type) => !MACHINE_PARTS[type] && rulePartsOf(level).has(type)
// A sentence in the level's words, in each language, for names made of it.
const inWords = (level, write) => T(write((f) => say(f, level.notation).zh), write((f) => say(f, level.notation).en))
const ruleName = (level, r) => (r.group === 'def' ? inWords(level, (text) => defText(r.text, text)) : r.name)
const MATH_NAME = T('数理规则书')
/** A rule part's name: the rule book of numbers, the proof-board part or lemma it is, or its rule's own name. */
function rulePartName(level, type) {
  if (type === MATH) return MATH_NAME
  const r = rulePartsOf(level).get(type)[0].rule
  if (r.part || level.lemmas?.[type]) return nameOf(level, type)
  return ruleName(level, r)
}
/** A rule of a rule part's, written out: an inference rule, or a rewrite rule (an equation given goes by its name). */
const ruleWritten = (e, say = show) => (e.book === 'rule' ? ruleText(e.rule, say) : rewriteText(e.rule, say) || L(e.rule.name))
/**
 * What a rule part does, without its rules written out: the part shows them (its ticks, or the rule it gives), and
 * the components box lists them.
 */
function rulePartText(level, type) {
  const several = choicesOfPart(rulePartsOf(level).get(type)).length > 1
  const after = T('接入其他规则元件时，本元件的规则排在它们之后。')
  const join = (a, b) => T(`${a.zh}${b.zh}`, `${a.en} ${b.en}`)
  if (type === MATH) return { name: MATH_NAME, desc: join(T('给出这一关的数与列表规则：类型声明生成的规则、定义中的等式和已证出的等式。在元件上添加要给出的规则，按添加顺序排列。'), after) }
  return { name: rulePartName(level, type), desc: join(several ? T('给出这个元件的规则。在元件上添加要给出的规则，按添加顺序排列。') : T('给出这个元件的规则。'), after) }
}
/** The rules a rule part with several offers to tick, each written out in the test's words: [{ value, label }]. */
const usesOf = (level, type, text) => {
  const entries = rulePartsOf(level).get(type)
  return choicesOfPart(entries).map((key) => ({ value: key, label: ruleWritten(entries.find((e) => e.key === key), text) }))
}
const RULES_PORT = T('规则', 'Rules')
const BEFORE_PORT = T('前面')
// A definition as the level writes it, in the level's words: 'c ⟹ l = r'.
function defText(d, text) {
  const [cond, eq] = d.includes('⟹') ? d.split('⟹') : [null, d]
  return `${cond ? `${cond.split(';').map((c) => text(parseS(c.trim()))).join(tr('；'))} ⟹ ` : ''}${text(parseS(eq.trim()))}`
}
const machineName = (level, type) => (isRulePart(level, type) ? rulePartName(level, type) : MACHINE_TEXT[type]?.name ?? type)

/** The editor's description of a machine board (../../../circuit/model.js parts), for a level's inputs. */
function machinePartsFor(level) {
  const labels = new Map(inputsOfLevel(level).map((i) => [i.name, i.label]))
  const shape = machineShape(level)
  const { ruleParts } = shape
  const isRulePart = (_, type) => ruleParts.has(type) && !MACHINE_PARTS[type]
  return {
    ...shape,
    label: (node) => (node.type === 'in' ? labels.get(node.params.name) ?? T('输入', 'Input') : node.type === 'out' ? T('结果', 'Result') : machineName(level, node.type)),
    portLabel: (node, port) => (port === 'rules' ? RULES_PORT : port === 'before' ? BEFORE_PORT : MACHINE_TEXT[node.type]?.frames?.[port] ? T('结果', 'Result') : MACHINE_TEXT[node.type]?.ports?.[port] ?? ''),
    family: (node) => (node.type === 'in' ? 'given' : node.type === 'out' ? 'end' : isRulePart(level, node.type) ? 'rule' : MACHINE_PARTS[node.type]?.frames ? 'box' : 'lemma'),
    icon: (node) => (node.type === 'in' ? ArrowRightFromLine : node.type === 'out' ? Flag : machineIcon(level, node.type)),
    // A frame gives its result, and inside each region what that region opens with.
    outputs: (node) => (MACHINE_PARTS[node.type]?.frames ? [{ key: null, label: T('得出', 'Result'), short: T('得出', 'Result') }, ...MACHINE_PARTS[node.type].frames(node).filter((r) => r.opens).map((r) => ({ key: r.name, label: T('收到'), short: T('收到') }))] : null),
    // A part the player built runs the board that built it: a packed part.
    packed: (node) => Boolean(MACHINE_PARTS[node.type]?.built),
    valueView: () => 'sentence',
    hasSettings: (node) => paramsOf(MACHINE_PARTS[node.type], node).length > 0,
    frames: (node) => (MACHINE_PARTS[node.type]?.frames?.(node) ?? []).map((r) => ({ ...r, label: MACHINE_TEXT[node.type]?.frames?.[r.name] ?? r.name })),
    rules: { ...Object.fromEntries(Object.entries(MACHINE_PARTS).filter(([type]) => type !== 'in' && type !== 'out')), ...Object.fromEntries([...ruleParts.keys()].map((type) => [type, RULE_PART])) },
  }
}

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
    const becomes = test.becomes && (test.becomes.length ? `${tr('变成 ')}${test.becomes.map((r) => (r.length ? r.map((g) => goalText(parseGoal(g), text)).join(' | ') : tr('证完'))).join(tr('，或者 '))}` : tr('这一步失败', 'the step to fail'))
    // The generator's test shows the elimination rule it wants: the specification, one declaration at a time.
    const elim = test.elim && `${tr('消去规则 ')}${genRuleText(elimOf(test), text)}`
    const want = becomes ?? elim ?? L(WANT[test.want ?? level.want])
    const show = (v) => (['sentence', 'rule', 'list'].includes(v.kind) ? genValueText(v, text) : v.kind === 'rules' ? v.entries.map((e) => ruleWritten(e, text)).join(tr('；')) : v.kind === 'state' ? v.goals.map((g) => goalText(g, text)).join(tr('；')) : v.kind === 'eqs' ? v.eqs.map((e) => eqText(e, text)).join(tr('；')) : v.set.map((c) => text(clauseFormula(c))).join(tr('；')))
    return {
      sequent: <>{level.datatypes && <span>{tr('类型')} <b>{Object.entries(level.datatypes).map(([type, d]) => `${type} = ${constructorsOf(d).map((c) => text({ op: 'atom', pred: '=', args: [fn(c.f, c.args.map(tvar)), fn(c.f, c.args.map(tvar))] }).split(' = ')[0]).join(' | ')}`).join(tr('；'))}</b> · </span>}{level.defs?.length > 0 && <span>{tr('定义')} <b>{level.defs.map((d) => defText(d, text)).join(tr('；'))}</b> · </span>}{Object.entries(inputs).map(([name, v]) => <span key={name}>{L(labels.get(name) ?? T('输入', 'Input'))} <b>{show(v)}</b> · </span>)}{tr('要', 'want')} <b>{want}</b></>,
      want: <span className="lg-want">{tr('要', 'Want')} <b>{want}</b></span>,
      choices: { uses: Object.fromEntries([...rulePartsOf(level).keys()].map((type) => [type, usesOf(level, type, text)])) },
    }
  },
  // A rule part lists the rules it gives (and, with several, adds and takes them off); another card's settings are its own.
  settings: (parts, node, level) => (isRulePart(level, node.type)
    ? [{ key: 'use', label: T('给出的规则', 'Its rules'), kind: 'use' }]
    : [
      ...(parts.rules[node.type]?.forms ? [{ key: 'form', kind: 'form' }] : []),
      ...paramsOf(parts.rules[node.type], node).map((key) => ({ key, label: MACHINE_TEXT[node.type]?.params?.[key] ?? key, kind: key })),
    ]),
  nameOf: (level, type) => machineName(level, type),
  textOf: (level, type, revisions = {}) => (isRulePart(level, type) ? rulePartText(level, type) : withRevisions(MACHINE_TEXT[type], revisions[type])),
  iconOf: (level, type) => machineIcon(level, type),
  familyOf: (level, type) => (isRulePart(level, type) ? 'rule' : MACHINE_PARTS[type]?.frames ? 'box' : 'lemma'),
  words: {
    steps: T('元件', 'Parts'),
    go: T('运行全部测试'),
    passed: T('全部通过', 'All passed'),
    pass: T('这组测试通过了。'),
    idle: T('运行时，同一个证明助手依次处理每组测试的输入，每组都须通过。'),
    reached: T('通过', 'Passed'),
    notYet: T('未通过', 'Not yet'),
    noOpen: T('尚未收到输入'),
    empty: T('从上方元件栏选择元件放到板上，从「输入」连到「结果」。'),
  },
}
