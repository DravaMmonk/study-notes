// A games folder written for the tools' end-to-end tests (../../app/studio.test.js, mcp.test.js): a hub list
// (games.js) and one small data game on the logic domain, three proof levels of its own, so the tests never touch a
// real game (games/DESIGN.md: unit tests never read a real game's levels). Each call writes a fresh folder.
//
//   proofsRoot() → { root, id }   the games folder (in the system's temp folder) and the game's id
//
// The game: `given` (the given is the goal), `apply` (two Applies in a row), `suppose` (an assumption box around them);
// every brief and hint in everyday words, the English side naming “Saturday” and “Assume” for search and replace.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Content is written in one language (../i18n.js); the second word of each text here is what it would say in English.
const T = (zh) => ({ zh })

const ID = 'proofs'

const GAME = {
  domain: 'logic',
  vocabulary: 1,
  title: T('证明 · 测试', 'Proofs · Test'),
  kicker: T('测试', 'Test'),
  lede: T('从套用和假设框搭起证明。', 'Proofs built from Apply and the assumption box.'),
  words: ['everyday'],
  wordSets: {
    everyday: {
      Rain: T('下雨', 'it rains'),
      Wet: T('地湿', 'the ground is wet'),
      Slip: T('路滑', 'the road is slippery'),
      Sat: T('今天是周六', 'today is Saturday'),
      Rest: T('我休息', 'I rest'),
    },
  },
  primitives: ['mp', 'impI'],
  eras: [{
    id: 'ground',
    machine: 'prover',
    foundation: ['given', 'apply', 'suppose'],
    chapter: { title: T('地基', 'The foundation'), question: T('只靠套用和假设框，能搭出什么？', 'What can be built from Apply and the assumption box alone?') },
  }],
}

const GLOSSARY = {
  groups: [{ id: 'logic', title: T('逻辑', 'Logic') }],
  entries: [{
    id: 'proof',
    group: 'logic',
    title: T('证明', 'proof'),
    at: 'given',
    body: [T('从已知一步步接到目标的一块电路。', 'A board that wires the givens, step by step, to the goal.')],
  }],
}

// Its parts (parts.json): Apply and the assumption box over the domain's resources.
const PARTS = {
  parts: {
    mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和 A 得到 B。', 'From A → B and A, B.'), icon: 'GitFork', family: 'rule', inputs: [{ name: 'imp', label: T('A → B') }, { name: 'a', label: T('A') }], compute: 'mp(imp, a)' },
    impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 A，证出 B，得到 A → B。', 'Assume A inside, prove B, get A → B.'), icon: 'Box', family: 'box', inputs: [], settings: [{ key: 'A', control: 'tree', label: T('假设', 'Assume') }], regions: [{ name: 'body', label: T('框内', 'Inside'), opens: true, closes: true }], compute: 'impI(body)' },
  },
}
const LEVELS = {
  given: {
    title: T('照抄', 'Copy'),
    intro: [{ t: T('左边是已知，右边是目标；一根线就是一个<wiki-ref to="proof"></wiki-ref>。', 'The given is on the left, the goal on the right; one wire is a <wiki-ref to="proof"></wiki-ref>.') }],
    after: T('已知为真的话，本身就是一个证明。', 'A given is already a proof of itself.'),
    tasks: [{
      id: 'given',
      kind: 'proof',
      tests: [{ premises: { p: 'A' }, goal: 'A' }],
      cases: [{ A: 'Sat' }, { A: 'Rain' }],
      solution: ['goal <- p'],
      brief: T('已知「今天是周六」，证出「今天是周六」。', 'Given that “today is Saturday”, prove that “today is Saturday”.'),
      hint: [T('从已知连到目标。', 'Wire the given to the goal.')],
    }],
  },
  apply: {
    title: T('套用', 'Apply'),
    symbols: ['→'],
    adds: ['mp'],
    after: T('套用只认形状。', 'Apply looks only at shape.'),
    tasks: [{
      id: 'apply',
      kind: 'proof',
      tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'A' }, goal: 'C' }],
      cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }],
      brief: T('已知「下雨 → 地湿」「地湿 → 路滑」「下雨」，证出「路滑」。', 'Given “it rains → the ground is wet”, “the ground is wet → the road is slippery” and “it rains”, prove “the road is slippery”.'),
      hint: [T('第一块套用给出「地湿」。', 'The first Apply gives “the ground is wet”.')],
      solution: ['m1 = mp(p, r)', 'm2 = mp(q, m1)', 'goal <- m2'],
    }],
  },
  suppose: {
    title: T('假设一下', 'Suppose'),
    adds: ['impI'],
    after: T('要证「如果…那么…」，就假设它的前一半。', 'To prove an “if … then …”, assume its first half.'),
    tasks: [{
      id: 'suppose',
      kind: 'proof',
      tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }],
      cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }],
      brief: T('已知「今天是周六 → 下雨」和「下雨 → 我休息」，证出「今天是周六 → 我休息」。', 'Given “today is Saturday → it rains” and “it rains → I rest”, prove “today is Saturday → I rest”.'),
      hint: [T('框元件上的「假设」选「今天是周六」。', 'On the box, set “Assume” to “today is Saturday”.')],
      solution: ['f = impI[A=A](body: m2) {', '  body {', '    m1 = mp(p, f.body)', '    m2 = mp(q, m1)', '  }', '}', 'goal <- f'],
    }],
  },
}

export function proofsRoot() {
  const root = mkdtempSync(join(tmpdir(), 'games-'))
  mkdirSync(join(root, ID, 'levels'), { recursive: true })
  const put = (file, value) => writeFileSync(join(root, ID, file), `${JSON.stringify(value, null, 2)}\n`)
  put('game.json', GAME)
  put('glossary.json', GLOSSARY)
  put('parts.json', PARTS)
  for (const [id, level] of Object.entries(LEVELS)) put(`levels/${id}.json`, level)
  writeFileSync(join(root, 'games.js'), `export const GAMES = [\n  {\n    id: '${ID}', levels: ${Object.keys(LEVELS).length},\n  },\n]\n`)
  return { root, id: ID }
}
