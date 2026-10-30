// Chapter 3's topic, after the declarations · Connectives without declaring them: “and” and “or” defined with → alone. A ∧ B is
// (A → B → R) → R and A ∨ B is (A → R) → (B → R) → R, read with R any sentence (here a letter of its own, a sentence
// like any other): each definition is the rule the declaration's case gave, and the rules that make and use the
// connective are proved from it with Apply and the box alone. Some provers define the connectives this way (the
// encyclopedia says which); the levels say only what the definition means. Optional proofs.
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
const prove = (level) => ({ kind: 'proof', ...level })
const AND = [{ A: 'Rain', B: 'Wind', R: 'Wet' }, { A: 'Sat', B: 'Sun', R: 'Rest' }]
const OR = [{ A: 'Bus', B: 'Bike', R: 'OnTime' }, { A: 'Sat', B: 'Sun', R: 'Rest' }]

export const hol = [
  {
    id: 'h-and-make',
    title: T('定义「并且」', 'Defining “and”'),
    tasks: [
      {
        kind: 'proof',
        step: T('造', 'Making it'),
        tests: [{ premises: { p: 'A', q: 'B' }, goal: '(A → (B → R)) → R' }],
        cases: AND,
        hint: [T('目标是一句「若…则…」。', 'The goal is an “if … then …”.'), T('假设「下雨 → (刮风 → 地湿)」。', 'Assume “it rains → (it is windy → the ground is wet)”.')],
        solution: proof({ f: ['impI', { A: 'A → (B → R)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['f#body>m1.imp', 'p>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      },
      {
        kind: 'proof',
        step: T('拆', 'Taking it apart'),
        tests: [{ premises: { p: '(A → (B → A)) → A' }, goal: 'A' }],
        cases: AND,
        intro: [{ t: T('定义说的是「不管 R 是哪一句」，R 可以取任何一句，包括 A 本身。', 'The definition says “whatever sentence R is”: R may be any sentence, A itself included.') }],
        hint: [T('要套用已知，还缺哪一句？', 'To apply the given, which sentence is missing?'), T('缺的那一句，<part-ref to="lemma:axK"></part-ref>给得出。', 'The missing sentence is one <part-ref to="lemma:axK"></part-ref> gives.')],
        solution: proof({ k: ['axK', { A: 'A', B: 'B' }], m: ['mp'] }, ['p>m.imp', 'k>m.a', 'm>goal'], { premises: ['p'] }),
      },
    ],
    intro: [
      { t: T('<level-ref to="decl-and"></level-ref>用声明把「并且」引入证明核。另一种办法只用 →：对任意一句 R，把「A 并且 B」写成 (A → (B → R)) → R，意思是「只要从 A 和 B 推得出 R，就有 R」。', '<level-ref to="decl-and"></level-ref> brought “and” into the kernel by a declaration. Another way uses → alone: for any sentence R, write “A and B” as (A → (B → R)) → R, meaning “if R follows from A and B, then R”.') },
      { t: T('本游戏的证明核不能在一句话里说「对所有句子 R」，所以每次使用都要选定 R；固定一个 R 的式子，只是完整定义的一个特例。', 'This game’s kernel cannot say “for every sentence R” inside a sentence, so R is chosen at each use; a formula with one fixed R is only a special case of the full definition.') },
    ],
    after: T('有的证明器正是这样只用 → 定义连接词，而不声明它们。', 'Some provers define the connectives this way, with → alone, instead of declaring them.'),
  },
  {
    id: 'h-or-make',
    title: T('定义「或者」', 'Defining “or”'),
    tasks: [
      {
        kind: 'proof',
        step: T('造', 'Making it'),
        tests: [{ premises: { p: 'A' }, goal: '(A → R) → ((B → R) → R)' }],
        cases: OR,
        hint: [T('目标有两层「若…则…」。', 'The goal has two layers of “if … then …”.')],
        solution: proof({ f: ['impI', { A: 'A → R' }], g: ['impI', { A: 'B → R' }, 'f'], m: ['mp', {}, 'g'] }, ['f#body>m.imp', 'p>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('用', 'Using it'),
        tests: [{ premises: { p: '(A → R) → ((B → R) → R)', q: 'A → R', r: 'B → R' }, goal: 'R' }],
        cases: OR,
        hint: [T('定义好的「或者」本身就是一句「若…则…」。', 'The defined “or” is itself an “if … then …”.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      },
    ],
    intro: [{ t: T('「或者」也可以这样定义：「A 或者 B」就是「不管 R 是哪一句，只要从 A 推得出 R、从 B 也推得出 R，就有 R」，写成 (A → R) → ((B → R) → R)。', '“Or” can be defined the same way: “A or B” is “whatever sentence R is, if R follows from A and R follows from B, then R”, written (A → R) → ((B → R) → R).') }],
    after: T('声明给出引入规则，由它生成消去规则；这样的定义写下的是消去规则，引入规则要从它证出来。', 'A declaration gives the intro rules and the elimination rule is made from them; a definition like this writes down the elimination rule, and the intro rules are proved from it.'),
  },
]
