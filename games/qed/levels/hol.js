// Chapter 4's topic · Connectives without declaring them: “and” and “or” defined with → alone. A ∧ B is
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
    title: T('只用 → 的「并且」', '“And” with → alone'),
    tasks: [
      {
        kind: 'proof',
        step: T('造', 'Making it'),
        tests: [{ premises: { p: 'A', q: 'B' }, goal: '(A → (B → R)) → R' }],
        cases: AND,
        hint: [T('假设「下雨 → (刮风 → 地湿)」，套用两次。', 'Assume “it rains → (it is windy → the ground is wet)”, and Apply twice.')],
        solution: proof({ f: ['impI', { A: 'A → (B → R)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['f#body>m1.imp', 'p>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
        after: T('造「并且」的规则不用声明：它是从定义证出来的定理。', 'The rule that makes “and” needs no declaration: it is a theorem proved from the definition.'),
      },
      {
        kind: 'proof',
        step: T('拆', 'Taking it apart'),
        tests: [{ premises: { p: '(A → (B → A)) → A' }, goal: 'A' }],
        cases: AND,
        intro: [{ t: T('定义说「不管 R 是哪一句」，那就取 R 为「下雨」：已知变成「(下雨 → (刮风 → 下雨)) → 下雨」。要拆出「下雨」，只差一句「下雨 → (刮风 → 下雨)」。', 'The definition says “whatever sentence R is”, so take R to be “it rains”: the given becomes “(it rains → (it is windy → it rains)) → it rains”. To take out “it rains”, only “it rains → (it is windy → it rains)” is missing.') }],
        hint: [T('缺的那一句，<part-ref to="lemma:axK"></part-ref>直接给得出。', 'The missing sentence is just what <part-ref to="lemma:axK"></part-ref> gives.')],
        solution: proof({ k: ['axK', { A: 'A', B: 'B' }], m: ['mp'] }, ['p>m.imp', 'k>m.a', 'm>goal'], { premises: ['p'] }),
      },
    ],
    intro: [
      { t: T("在声明章节中，「并且」通过规则加入证明核。本专题考察另一种编码：对选定的命题 R，用已有的 → 写出 (A → (B → R)) → R。它表达：若 R 可由 A 和 B 推出，则 R 成立。", "The declarations chapter added “and” to the kernel through rules. This topic examines another encoding: for a chosen proposition R, write (A → (B → R)) → R using →. It says that if R follows from A and B, then R holds.") },
      { t: T("这个式子对应合取消去的思路：利用 A 和 B 推出所需的 R。本游戏的证明核不能在公式内量化所有命题，因此每次使用时必须选定 R；单个固定的 R 不等于完整的全称编码。", "This formula follows the idea of conjunction elimination: use A and B to establish the required R. The game’s kernel cannot quantify over all propositions inside a formula, so R must be selected for each use; a single fixed R is not the full universally quantified encoding.") },
    ],
    after: T('取 R 为左边，K 就把左边拆了出来。声明的消去规则是由引入规则生成的；这里的消去规则，是用定义和 K 证出来的。', 'With R the left side, K takes the left side out. A declaration’s elimination rule is made from its ways in; this one is proved from the definition and K.'),
  },
  {
    id: 'h-or-make',
    title: T('只用 → 的「或者」', '“Or” with → alone'),
    tasks: [
      {
        kind: 'proof',
        step: T('造', 'Making it'),
        tests: [{ premises: { p: 'A' }, goal: '(A → R) → ((B → R) → R)' }],
        cases: OR,
        hint: [T('两层框分别假设两句「若…则…」；里面只用得上第一句。', 'Two boxes assume the two “if … then …”s; inside, only the first is needed.')],
        solution: proof({ f: ['impI', { A: 'A → R' }], g: ['impI', { A: 'B → R' }, 'f'], m: ['mp', {}, 'g'] }, ['f#body>m.imp', 'p>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
        after: T('有了「我坐公交」，第二个办法根本用不上：这就是「或者」左边的那条引入规则。', 'With “I take the bus”, the second move is never needed: that is the way to make “or” on its left.'),
      },
      {
        kind: 'proof',
        step: T('用', 'Using it'),
        tests: [{ premises: { p: '(A → R) → ((B → R) → R)', q: 'A → R', r: 'B → R' }, goal: 'R' }],
        cases: OR,
        intro: [{ t: T('有一句定义好的「或者」，又有两个办法，就能得到结论：这样定义的「或者」，分情况不是新规则，而是套用两次。', 'With a defined “or” and two moves, the conclusion follows: with “or” defined this way, case by case is no new rule, just Apply twice.') }],
        hint: [T('把两个办法依次交给定义好的「或者」。', 'Hand the two moves to the defined “or”, one after the other.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      },
    ],
    intro: [{ t: T('「或者」也一样，拿它的消去规则当定义：「A 或者 B」就是「不管 R 是哪一句，只要从 A 能推出 R、从 B 也能推出 R，就有 R」，写成 (A → R) → ((B → R) → R)。', '“Or” the same way, its case taken as its definition: “A or B” is “whatever sentence R is, if R follows from A and R follows from B, then R”, written (A → R) → ((B → R) → R).') }],
    after: T('两条路比一比：声明「或者」，写的是引入规则，消去规则由它生成；定义「或者」，写的是消去规则，引入规则和用法都由它证出来。两条路得到的规则一样。', 'Compare the two roads: declaring “or”, you write its ways to make it and its elimination rule is made from them; defining it, you write the case, and making and using are both proved from it. Both roads give the same rules.'),
  },
]
