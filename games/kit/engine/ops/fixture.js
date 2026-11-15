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
const T = (en) => ({ en })

const ID = 'proofs'

const GAME = {
  domain: 'logic',
  vocabulary: 1,
  title: T('Proofs · Test'),
  kicker: T('Test'),
  lede: T('Proofs built from Apply and the assumption box.'),
  words: ['everyday'],
  wordSets: {
    everyday: {
      Rain: T('it rains'),
      Wet: T('the ground is wet'),
      Slip: T('the road is slippery'),
      Sat: T('today is Saturday'),
      Rest: T('I rest'),
    },
  },
  primitives: ['mp', 'impI'],
  lemmas: {},
  eras: [{
    id: 'ground',
    machine: 'prover',
    foundation: ['given', 'apply', 'suppose'],
    chapter: { title: T('The foundation'), question: T('What can be built from Apply and the assumption box alone?') },
  }],
}

const GLOSSARY = {
  groups: [{ id: 'logic', title: T('Logic') }],
  entries: [{
    id: 'proof',
    group: 'logic',
    title: T('proof'),
    at: 'given',
    body: [T('A board that wires the givens, step by step, to the goal.')],
  }],
}

const LEVELS = {
  given: {
    title: T('Copy'),
    intro: [{ t: T('The given is on the left, the goal on the right; one wire is a <wiki-ref to="proof"></wiki-ref>.') }],
    after: T('A given is already a proof of itself.'),
    tasks: [{
      id: 'given',
      kind: 'proof',
      tests: [{ premises: { p: 'A' }, goal: 'A' }],
      cases: [{ A: 'Sat' }, { A: 'Rain' }],
      solution: ['goal <- p'],
      brief: T('Given that “today is Saturday”, prove that “today is Saturday”.'),
      hint: [T('Wire the given to the goal.')],
    }],
  },
  apply: {
    title: T('Apply'),
    symbols: ['→'],
    adds: ['mp'],
    after: T('Apply looks only at shape.'),
    tasks: [{
      id: 'apply',
      kind: 'proof',
      tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'A' }, goal: 'C' }],
      cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }],
      brief: T('Given “it rains → the ground is wet”, “the ground is wet → the road is slippery” and “it rains”, prove “the road is slippery”.'),
      hint: [T('The first Apply gives “the ground is wet”.')],
      solution: ['m1 = mp(p, r)', 'm2 = mp(q, m1)', 'goal <- m2'],
    }],
  },
  suppose: {
    title: T('Suppose'),
    adds: ['impI'],
    after: T('To prove an “if … then …”, assume its first half.'),
    tasks: [{
      id: 'suppose',
      kind: 'proof',
      tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }],
      cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }],
      brief: T('Given “today is Saturday → it rains” and “it rains → I rest”, prove “today is Saturday → I rest”.'),
      hint: [T('On the box, set “Assume” to “today is Saturday”.')],
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
  for (const [id, level] of Object.entries(LEVELS)) put(`levels/${id}.json`, level)
  writeFileSync(join(root, 'games.js'), `export const GAMES = [\n  {\n    id: '${ID}', levels: ${Object.keys(LEVELS).length},\n  },\n]\n`)
  return { root, id: ID }
}
