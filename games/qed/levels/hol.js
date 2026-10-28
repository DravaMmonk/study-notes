// Chapter 4's topic · How HOL defines the connectives: Isabelle/HOL declares no connective; it defines each with →
// and ∀ (HOL.thy and_def, or_def): A ∧ B is ∀R. (A → B → R) → R, A ∨ B is ∀R. (A → R) → (B → R) → R. Read with R any
// sentence (here a letter of its own, a sentence like any other), each definition is the rule the declaration's case
// gave; the rules that make and use the connective are proved from it with Apply and the box alone. Optional proofs.
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
const prove = (level) => ({ kind: 'proof', ...level })
const AND = [{ A: 'Rain', B: 'Wind', R: 'Wet' }, { A: 'Sat', B: 'Sun', R: 'Rest' }]
const OR = [{ A: 'Bus', B: 'Bike', R: 'OnTime' }, { A: 'Sat', B: 'Sun', R: 'Rest' }]

export const hol = [
  prove({
    id: 'h-and-make',
    title: T('HOL 的「并且」：造', 'HOL’s “and”: making it'),
    tests: [{ premises: { p: 'A', q: 'B' }, goal: '(A → (B → R)) → R' }],
    cases: AND,
    intro: [
      { t: T('Isabelle/HOL 不声明连接词，而是用已有的 → 定义：「A 并且 B」的意思是「不管 R 是哪一句，只要能从 A、B 推出 R，就有 R」，写成 (A → (B → R)) → R。这里的 R 代表任意一句话。', 'Isabelle/HOL declares no connective; it defines them with the → it has: “A and B” means “whatever sentence R is, if R follows from A and B, then R”, written (A → (B → R)) → R. Here R stands for any sentence.') },
      { t: T('这样定义出来的「并且」，造它的规则不用新加，用套用和假设框就能证出来。', 'With “and” defined this way, the rule that makes it needs no new rule: Apply and the box prove it.') },
    ],
    brief: T('实现一个证明器，可以从已知「下雨」和「刮风」，证明出「(下雨 → (刮风 → 地湿)) → 地湿」。', 'Build a prover that, from “it rains” and “it is windy”, proves “(it rains → (it is windy → the ground is wet)) → the ground is wet”.'),
    hint: [T('假设「下雨 → (刮风 → 地湿)」，套用两次。', 'Assume “it rains → (it is windy → the ground is wet)”, and Apply twice.')],
    solution: proof({ f: ['impI', { A: 'A → (B → R)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['f#body>m1.imp', 'p>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
    after: T('这就是 HOL 的 <code>conjI</code>：它是用定义证出来的定理，不是新规则。', 'This is HOL’s <code>conjI</code>: a theorem proved from the definition, not a new rule.'),
  }),
  prove({
    id: 'h-and-use',
    title: T('HOL 的「并且」：拆', 'HOL’s “and”: taking it apart'),
    tests: [{ premises: { p: '(A → (B → A)) → A' }, goal: 'A' }],
    cases: AND,
    intro: [{ t: T('定义说「不管 R 是哪一句」，那就取 R 为「下雨」：已知变成「(下雨 → (刮风 → 下雨)) → 下雨」。要拆出「下雨」，只差一句「下雨 → (刮风 → 下雨)」。', 'The definition says “whatever sentence R is”, so take R to be “it rains”: the given becomes “(it rains → (it is windy → it rains)) → it rains”. To take out “it rains”, only “it rains → (it is windy → it rains)” is missing.') }],
    brief: T('实现一个证明器，可以从已知「(下雨 → (刮风 → 下雨)) → 下雨」，证明出「下雨」。', 'Build a prover that, from “(it rains → (it is windy → it rains)) → it rains”, proves “it rains”.'),
    hint: [T('缺的那一句，<part-ref to="lemma:axK"></part-ref>直接给得出。', 'The missing sentence is just what <part-ref to="lemma:axK"></part-ref> gives.')],
    solution: proof({ k: ['axK', { A: 'A', B: 'B' }], m: ['mp'] }, ['p>m.imp', 'k>m.a', 'm>goal'], { premises: ['p'] }),
    after: T('取 R 为左边，K 就把左边拆了出来：这是 HOL 的 <code>conjunct1</code>。声明里的拆法是核生成的，这里的拆法是用定义和 K 证出来的。', 'With R the left side, K takes the left side out: HOL’s <code>conjunct1</code>. A declaration’s case is made by the kernel; here it is proved from the definition and K.'),
  }),
  prove({
    id: 'h-or-make',
    title: T('HOL 的「或者」：造', 'HOL’s “or”: making it'),
    tests: [{ premises: { p: 'A' }, goal: '(A → R) → ((B → R) → R)' }],
    cases: OR,
    intro: [{ t: T('「A 或者 B」在 HOL 里定义成「不管 R 是哪一句，只要从 A 能推出 R、从 B 也能推出 R，就有 R」：(A → R) → ((B → R) → R)。', 'In HOL, “A or B” is defined as “whatever sentence R is, if R follows from A and R follows from B, then R”: (A → R) → ((B → R) → R).') }],
    brief: T('实现一个证明器，可以从已知「我坐公交」，证明出「(我坐公交 → 我准时到) → ((我骑车 → 我准时到) → 我准时到)」。', 'Build a prover that, from “I take the bus”, proves “(I take the bus → I arrive on time) → ((I cycle → I arrive on time) → I arrive on time)”.'),
    hint: [T('两层框分别假设两句「若…则…」；里面只用得上第一句。', 'Two boxes assume the two “if … then …”s; inside, only the first is needed.')],
    solution: proof({ f: ['impI', { A: 'A → R' }], g: ['impI', { A: 'B → R' }, 'f'], m: ['mp', {}, 'g'] }, ['f#body>m.imp', 'p>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
    after: T('有了「我坐公交」，第二个办法根本用不上：这是 HOL 的 <code>disjI1</code>。', 'With “I take the bus”, the second move is never needed: HOL’s <code>disjI1</code>.'),
  }),
  prove({
    id: 'h-or-use',
    title: T('HOL 的「或者」：用', 'HOL’s “or”: using it'),
    tests: [{ premises: { p: '(A → R) → ((B → R) → R)', q: 'A → R', r: 'B → R' }, goal: 'R' }],
    cases: OR,
    intro: [{ t: T('有一句定义好的「或者」，又有两个办法，就能得到结论：分情况在 HOL 里不是新规则，而是套用两次。', 'With a defined “or” and two moves, the conclusion follows: in HOL, case by case is no new rule, just Apply twice.') }],
    brief: T('实现一个证明器，可以从已知「(我坐公交 → 我准时到) → ((我骑车 → 我准时到) → 我准时到)」「我坐公交 → 我准时到」「我骑车 → 我准时到」，证明出「我准时到」。', 'Build a prover that, from “(I take the bus → I arrive on time) → ((I cycle → I arrive on time) → I arrive on time)”, “I take the bus → I arrive on time” and “I cycle → I arrive on time”, proves “I arrive on time”.'),
    hint: [T('把两个办法依次交给定义好的「或者」。', 'Hand the two moves to the defined “or”, one after the other.')],
    solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
    after: T('这就是 HOL 的 <code>disjE</code>。两条路比一比：Lean 声明「或者」，核生成两个拆法；HOL 把「拆法」直接写进定义，造和用都由它证出来。', 'This is HOL’s <code>disjE</code>. Compare the two roads: Lean declares “or” and the kernel makes its two cases; HOL writes the cases into the definition, and making and using are both proved from it.'),
  }),
]
