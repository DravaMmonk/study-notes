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
        brief: T('实现一个证明器，可以从已知「下雨」和「刮风」，证明出「(下雨 → (刮风 → 地湿)) → 地湿」。', 'Build a prover that, from “it rains” and “it is windy”, proves “(it rains → (it is windy → the ground is wet)) → the ground is wet”.'),
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
        brief: T('实现一个证明器，可以从已知「(下雨 → (刮风 → 下雨)) → 下雨」，证明出「下雨」。', 'Build a prover that, from “(it rains → (it is windy → it rains)) → it rains”, proves “it rains”.'),
        hint: [T('缺的那一句，<part-ref to="lemma:axK"></part-ref>直接给得出。', 'The missing sentence is just what <part-ref to="lemma:axK"></part-ref> gives.')],
        solution: proof({ k: ['axK', { A: 'A', B: 'B' }], m: ['mp'] }, ['p>m.imp', 'k>m.a', 'm>goal'], { premises: ['p'] }),
      },
    ],
    intro: [
      { t: T('第 3 章用声明把「并且」引入了证明核。不声明行不行？只用已有的 → 写出「并且」的意思：「A 并且 B」就是「不管 R 是哪一句，只要能从 A、B 推出 R，就有 R」，写成 (A → (B → R)) → R。这里的 R 代表任意一句话。', 'Chapter 3 brought “and” into the kernel with a declaration. Could it do without? Write what “and” means with the → already there: “A and B” is “whatever sentence R is, if R follows from A and B, then R”, written (A → (B → R)) → R. Here R stands for any sentence.') },
      { t: T('这句话说的，正是拆法做的事：取回两份，拿去推出想要的 R。反过来把它当成定义，造它、拆它的规则就都不用新加，用套用和假设框就能证出来。证明核里写不出「不管哪一句」，所以每次用它都得先选定一个 R。', 'This says just what the case does: get the two back, and use them to reach whatever R you want. Take it the other way, as the definition, and the rules that make it and take it apart need nothing new: Apply and the box prove them. The kernel cannot write “whatever sentence”, so each use picks one R first.') },
    ],
    after: T('取 R 为左边，K 就把左边拆了出来。声明里的拆法是核生成的；这里的拆法，是用定义和 K 证出来的。', 'With R the left side, K takes the left side out. A declaration’s case is made by the kernel; this one is proved from the definition and K.'),
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
        brief: T('实现一个证明器，可以从已知「我坐公交」，证明出「(我坐公交 → 我准时到) → ((我骑车 → 我准时到) → 我准时到)」。', 'Build a prover that, from “I take the bus”, proves “(I take the bus → I arrive on time) → ((I cycle → I arrive on time) → I arrive on time)”.'),
        hint: [T('两层框分别假设两句「若…则…」；里面只用得上第一句。', 'Two boxes assume the two “if … then …”s; inside, only the first is needed.')],
        solution: proof({ f: ['impI', { A: 'A → R' }], g: ['impI', { A: 'B → R' }, 'f'], m: ['mp', {}, 'g'] }, ['f#body>m.imp', 'p>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
        after: T('有了「我坐公交」，第二个办法根本用不上：这就是「或者」左边的那种造法。', 'With “I take the bus”, the second move is never needed: that is the way to make “or” on its left.'),
      },
      {
        kind: 'proof',
        step: T('用', 'Using it'),
        tests: [{ premises: { p: '(A → R) → ((B → R) → R)', q: 'A → R', r: 'B → R' }, goal: 'R' }],
        cases: OR,
        intro: [{ t: T('有一句定义好的「或者」，又有两个办法，就能得到结论：这样定义的「或者」，分情况不是新规则，而是套用两次。', 'With a defined “or” and two moves, the conclusion follows: with “or” defined this way, case by case is no new rule, just Apply twice.') }],
        brief: T('实现一个证明器，可以从已知「(我坐公交 → 我准时到) → ((我骑车 → 我准时到) → 我准时到)」「我坐公交 → 我准时到」「我骑车 → 我准时到」，证明出「我准时到」。', 'Build a prover that, from “(I take the bus → I arrive on time) → ((I cycle → I arrive on time) → I arrive on time)”, “I take the bus → I arrive on time” and “I cycle → I arrive on time”, proves “I arrive on time”.'),
        hint: [T('把两个办法依次交给定义好的「或者」。', 'Hand the two moves to the defined “or”, one after the other.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      },
    ],
    intro: [{ t: T('「或者」也一样，拿它的拆法当定义：「A 或者 B」就是「不管 R 是哪一句，只要从 A 能推出 R、从 B 也能推出 R，就有 R」，写成 (A → R) → ((B → R) → R)。', '“Or” the same way, its case taken as its definition: “A or B” is “whatever sentence R is, if R follows from A and R follows from B, then R”, written (A → R) → ((B → R) → R).') }],
    after: T('两条路比一比：声明「或者」，写的是造法，核生成拆法；定义「或者」，写的是拆法，造法和用法都由它证出来。两条路得到的规则一样。', 'Compare the two roads: declaring “or”, you write its ways to make it and the kernel makes the cases; defining it, you write the case, and making and using are both proved from it. Both roads give the same rules.'),
  },
]
