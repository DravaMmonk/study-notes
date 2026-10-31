// A declaration's intro rules (ruleLines.js) as a circuit on the shared phone board (../../circuit/SlotBoard.jsx),
// wired by itself: the player puts blocks in place and never draws a wire. Each rule is a frame (规则) whose region holds
// its premises; a premise is a sentence (a 命题 block) or an assumption frame (假设框), whose regions hold what it
// assumes and the one sentence it shows. A rule that takes any thing sits in a for-any frame (任取), whose region opens
// the thing: a wire runs from it to each sentence that mentions it. Every rule's result runs into the declared sentence
// at the bottom. Where a block sits is all there is; the lines are the save and what the checks read.
//
//   node ids   r<k> rule k · f<k> its for-any frame · p<k>.<j> premise j · u<k>.<j> assumption frame j
//              a<k>.<j>.<i> what it assumes · s<k>.<j> what it shows · decl the declared sentence
import { freeVars } from './formula.js'
import { sentenceOf } from './iso.js'
import { blankLine } from './ruleLines.js'

const T = (zh, en) => ({ zh, en })
export const DECL_ID = 'decl'
/** The blocks of the tray: a rule, a for-any frame, an assumption frame, and each of the level's sentences. */
export const RULE = 'rule'
export const FIX = 'fix'
export const UNDER = 'under'
export const PROP = 'prop'
export const propType = (sentence) => `${PROP}:${sentence}`

/** The board of some lines, wires and all. */
export function graphOf(level, lines) {
  const binder = level.binder ?? 'x'
  const mentions = (s) => freeVars(sentenceOf(level, s)).has(binder)
  const nodes = []
  const wires = []
  const prop = (id, sentence, region, slot, fix) => {
    nodes.push({ id, type: PROP, params: { s: sentence }, in: region, slot })
    if (fix && mentions(sentence)) wires.push({ from: `${fix}#body`, to: id, port: 'x' })
  }
  lines.forEach((line, k) => {
    const fix = line.binds.length ? `f${k}` : null
    if (fix) nodes.push({ id: fix, type: FIX, params: { x: line.binds[0] }, slot: k })
    nodes.push({ id: `r${k}`, type: RULE, params: { k }, ...(fix ? { in: `${fix}/body`, slot: 0 } : { slot: k }) })
    line.needs.forEach((need, j) => {
      const at = `${k}.${j}`
      if (typeof need === 'string') {
        prop(`p${at}`, need, `r${k}/needs`, j, fix)
        wires.push({ from: `p${at}`, to: `r${k}`, port: 'needs' })
        return
      }
      nodes.push({ id: `u${at}`, type: UNDER, params: {}, in: `r${k}/needs`, slot: j })
      wires.push({ from: `u${at}`, to: `r${k}`, port: 'needs' })
      need.under.forEach((s, i) => {
        prop(`a${at}.${i}`, s, `u${at}/hyps`, i, fix)
        wires.push({ from: `a${at}.${i}`, to: `u${at}`, port: 'hyps' })
      })
      if (need.need) {
        prop(`s${at}`, need.need, `u${at}/shows`, 0, fix)
        wires.push({ from: `s${at}`, to: `u${at}`, port: 'shows' })
      }
    })
    if (fix) wires.push({ from: `r${k}`, to: fix, port: 'body' })
    wires.push({ from: fix ?? `r${k}`, to: DECL_ID, port: `c${k + 1}` })
  })
  nodes.push({ id: DECL_ID, type: DECL_ID, params: {} })
  return { nodes, wires }
}

/** The parts of such a board, as the phone board reads them (../../circuit/model.js). */
export function ruleParts(level, lines) {
  const binder = level.binder ?? 'x'
  return {
    role: (n) => (n.type === DECL_ID ? 'sink' : 'part'),
    inputs: (n) => {
      if (n.type === PROP) return lines.some((l) => l.binds.length) && freeVars(sentenceOf(level, n.params.s)).has(binder) ? ['x'] : []
      return { [DECL_ID]: lines.map((_, k) => `c${k + 1}`), [RULE]: ['needs'], [FIX]: ['body'], [UNDER]: ['hyps', 'shows'] }[n.type] ?? []
    },
    frames: (n) => ({
      [RULE]: [{ name: 'needs', label: T('前提', 'Premises'), opens: false }],
      [FIX]: [{ name: 'body', label: T('任取', 'For any'), opens: true }],
      [UNDER]: [{ name: 'hyps', label: T('假设', 'Assuming'), opens: false }, { name: 'shows', label: T('能证出', 'we can show'), opens: false }],
    })[n.type],
    outputs: (n) => (n.type === FIX ? [{ key: null, label: T('规则', 'Rule') }, { key: 'body', label: { zh: binder, en: binder } }] : null),
    portLabel: (n, port) => (n.type === DECL_ID ? T(`规则 ${port.slice(1)}`, `Rule ${port.slice(1)}`) : port === 'x' ? { zh: binder, en: binder } : null),
    family: (n) => ({ [DECL_ID]: 'end', [RULE]: 'rule', [FIX]: 'box', [UNDER]: 'box', [PROP]: 'hyp' })[n.type],
    label: (n) => n.type,
    refuse: () => null,
  }
}

// Where a region sends a block: the list it adds to, as a path down the lines (ruleLines.js), or what it fills.
//   { line, under? } a list of premises (a rule's, or an assumption frame's)   { line, shows } an assumption's conclusion
export function placeOf(region) {
  if (!region) return null
  const [id, name] = region.split('/')
  const at = id.slice(1).split('.').map(Number)
  if (id[0] === 'r' || id[0] === 'f') return { line: at[0] }
  if (id[0] === 'u') return name === 'shows' ? { line: at[0], need: at[1], shows: true } : { line: at[0], need: at[1], under: true }
  return null
}

/**
 * The lines with `type` put in `region` (null: the board itself), or a { zh, en } reason it does not go there. A
 * sentence goes among a rule's premises, an assumption frame's assumptions, or in its conclusion (in place of what was
 * there); an assumption frame among a rule's premises only (one deep); a rule, anywhere: a new rule; a for-any frame
 * on the rule it is put in (or a new rule, on the board).
 */
export function put(lines, type, region, binder = 'x') {
  const place = placeOf(region)
  const withLine = (k, f) => lines.map((l, j) => (j === k ? f(l) : l))
  if (type === RULE) return [...lines, blankLine()]
  if (type === FIX) {
    if (!place) return [...lines, { ...blankLine(), binds: [binder] }]
    if (lines[place.line].binds.length) return T('这条规则已经任取了。', 'This rule already takes a thing.')
    return withLine(place.line, (l) => ({ ...l, binds: [binder] }))
  }
  if (!place) return T('先放一个规则框，再把它放进规则里。', 'Put down a rule first, then put this in it.')
  if (type === UNDER) {
    if (place.under || place.shows) return T('假设框里不能再放假设框。', 'An assumption frame does not go in an assumption frame.')
    return withLine(place.line, (l) => ({ ...l, needs: [...l.needs, { need: null, under: [] }] }))
  }
  const sentence = type.slice(PROP.length + 1)
  if (place.shows || place.under) {
    return withLine(place.line, (l) => ({
      ...l,
      needs: l.needs.map((n, j) => (j !== place.need ? n : place.shows ? { ...n, need: sentence } : { ...n, under: [...n.under, sentence] })),
    }))
  }
  return withLine(place.line, (l) => ({ ...l, needs: [...l.needs, sentence] }))
}

/** The lines without the block `id` (a frame with what is in it); the last rule left goes back to an empty one. */
export function takeOut(lines, id) {
  const at = id.slice(1).split('.').map(Number)
  const withLine = (f) => lines.map((l, j) => (j === at[0] ? f(l) : l))
  const needs = (f) => withLine((l) => ({ ...l, needs: f(l.needs) }))
  switch (id[0]) {
    case 'r': return lines.length > 1 ? lines.filter((_, j) => j !== at[0]) : [blankLine()]
    case 'f': return withLine((l) => ({ ...l, binds: [] }))
    case 'p':
    case 'u': return needs((list) => list.filter((_, j) => j !== at[1]))
    case 'a': return needs((list) => list.map((n, j) => (j === at[1] ? { ...n, under: n.under.filter((_, i) => i !== at[2]) } : n)))
    case 's': return needs((list) => list.map((n, j) => (j === at[1] ? { ...n, need: null } : n)))
    default: return lines
  }
}

/** Where the next block goes after `type` was put in `region`: inside a new assumption frame, the last rule. */
export function nextRegion(lines, type, region) {
  const last = `r${lines.length - 1}/needs`
  if (type === RULE || (type === FIX && !region)) return last
  const place = placeOf(region)
  if (type === UNDER && place) return `u${place.line}.${lines[place.line].needs.length - 1}/hyps`
  if (place?.shows) return `r${place.line}/needs`
  return region ?? last
}
