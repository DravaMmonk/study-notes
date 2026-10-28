// Chapter 14 · Dependent types and equality (the Lean side): an equation is a type too. Its one way in is rfl, its one
// way out is ▸ (Eq.rec): the rewrite card of chapter 6, whose ticked boxes are the motive. The kernel works sentences
// out by the level's definitions before comparing them, so what computes is equal by rfl and what does not needs a
// proof, an equation proved in chapter 12. Reflection leans on that computing: a decision procedure written as
// definitions, proved right once, after which the kernel computing it is the proof (sound rfl). A type may depend on a value: Vec(n), a vector whose length is in its type
// (only the length is kept, so a vector is a proof of Vec(n)). Then both together: appending, and moving a vector
// across an equation of lengths. The challenge puts one more at the end, where the length does not compute.
import { proof } from '../../kit/domains/logic/build.js'
import { BASIC } from '../../kit/domains/logic/termTree.js'
import { script } from './machines.js'
import { TERM_WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
const PROBLEMS = [T('第一题', 'Problem 1'), T('第二题', 'Problem 2'), T('第三题', 'Problem 3'), T('第四题', 'Problem 4')]
const WRITE = T('用下面的块，拼出这句话的证明项。', 'Build the proof term of this sentence from the pieces below.')
const FORMS = [...BASIC, 'rfl', 'subst']
const WORDS = { ...TERM_WORDS, Vec: T('Vec {0}', 'Vec {0}'), Elem: T('Elem', 'Elem') }
// A level's term tasks, numbered from `from` (after its proof-board tasks).
const write = (list, from = 0) => list.map((task, k) => ({ kind: 'term', step: PROBLEMS[from + k], brief: WRITE, forms: FORMS, words: WORDS, ...task }))
// Reflection: formulas in two letters p and q as data, their value on a row, and the truth table as a program.
const TAUT = [
  'ev(p, x, y) = x', 'ev(q, x, y) = y', 'ev(neg(z), x, y) = bnot(ev(z, x, y))',
  'ev(conj(z, w), x, y) = band(ev(z, x, y), ev(w, x, y))', 'ev(disj(z, w), x, y) = bor(ev(z, x, y), ev(w, x, y))',
  'bnot(tt) = ff', 'bnot(ff) = tt', 'band(tt, y) = y', 'band(ff, y) = ff', 'bor(tt, y) = tt', 'bor(ff, y) = y',
  'taut(z) = band(ev(z, tt, tt), band(ev(z, tt, ff), band(ev(z, ff, tt), ev(z, ff, ff))))',
]
const ALL_DEFS = TAUT.map((_, k) => `def.${k}`)
const DATA = {
  ...TERM_WORDS,
  p: T('p', 'p'), q: T('q', 'q'),
  neg: T('Not {0}', 'Not {0}'), conj: T('And {0} {1}', 'And {0} {1}'), disj: T('Or {0} {1}', 'Or {0} {1}'),
  ev: T('eval {0} {1} {2}', 'eval {0} {1} {2}'), taut: T('taut {0}', 'taut {0}'),
  bnot: T('! {0}', '! {0}'), band: T('{0} && {1}', '{0} && {1}'), bor: T('{0} || {1}', '{0} || {1}'),
  Taut: T('{0} 永远成立', '{0} always holds'),
}
const SOUND = '∀x. taut(x) = tt → Taut(x)'
const COMPLETE = '∀x. taut(x) = ff → ¬Taut(x)'
const reflect = (list) => list.map((task, k) => ({ kind: 'term', step: PROBLEMS[k], brief: WRITE, forms: [...BASIC, 'rfl'], words: DATA, consts: ['p', 'q', 'tt', 'ff'], defs: TAUT, ...task }))
const proves = (level) => ({ kind: 'machine', want: 'proved', inputs: [{ name: 'in', label: T('目标', 'Goal') }], backtrack: true, ...level })
const PROVE = T('设计一个证明助手：证得出的证完；证不出的，停下来说证不出来。', 'Design a proof assistant that proves what can be proved, and of what cannot, stops and says so.')
const STARS = ['phos', 'hesp', 'venus']
const NAT = ['plus(zero, y) = y', 'plus(s(x), y) = s(plus(x, y))']
const ADD_ZERO = '∀x. plus(x, zero) = x'
const ADD_SUCC = '∀x. ∀y. plus(x, s(y)) = s(plus(x, y))'
const VNIL = 'Vec(zero)'
const VCONS = '∀x. Vec(x) → Vec(s(x))'
const APPEND = '∀x. ∀y. Vec(x) → Vec(y) → Vec(plus(x, y))'

export const equality = [
  // ---------- an equation is a type ----------
  {
    id: 'eq-rfl',
    title: T('两边一样', 'Both sides alike'),
    consts: ['ann', ...STARS],
    tasks: write([
      { premises: {}, goal: 'ann = ann', answer: 'rfl', hint: [T('新块 rfl 证的就是两边一样的等式。', 'The new piece rfl proves just an equation whose sides are alike.')] },
      { premises: {}, goal: '∀x. x = x', answer: 'fun a => rfl', hint: [T('任取是 fun：拿到 a，要证的是 a = a。', 'For any is a fun: given a, what is left is a = a.')] },
      { premises: { p: 'phos = hesp' }, goal: 'Bright(phos) → phos = phos', answer: 'fun h => rfl', naive: 'p', hint: [T('要证的等式两边都是晨星，用不着已知。', 'Both sides of the equation are the Morning Star; the given is not needed.')] },
    ]),
    intro: [
      { t: T('化简器把等式当改写规则用，归纳类型一章又证出了一串等式。可等式本身是什么？这一章看 Lean 的回答：<b>a = b 也是一个类型</b>，它的证明项和别的证明项一样由核检查。', 'The simplifier used equations as rewrite rules, and the chapter on inductive types proved a string of them. But what is an equation itself? This chapter looks at Lean’s answer: <b>a = b is a type too</b>, and its proof terms are checked by the kernel like any other.') },
      { t: T('等式的证明项只有一种造法：<b>rfl</b>，证的是两边一样的等式 a = a，相当于证明板上的<part-ref to="part:refl"></part-ref>。证明项板上多了这一块。', 'There is only one way to make a proof of an equation: <b>rfl</b>, which proves an equation a = a whose sides are alike, like <part-ref to="part:refl"></part-ref> on the proof board. The term board gains this piece.') },
    ],
    after: T('造等式的路只有一条：两边一样。a = a 对什么 a 都成立，所以 ∀x. x = x 是一个 fun，每一次都还 rfl。', 'There is one road to an equation: both sides alike. a = a holds for any a, so ∀x. x = x is a fun that gives rfl every time.'),
  },
  {
    id: 'eq-rec',
    title: T('等量代换的证明项', 'The term of rewriting'),
    consts: STARS,
    tasks: [
      {
        kind: 'proof',
        terms: true,
        step: T('接线', 'Wire'),
        consts: STARS,
        tests: [{ premises: { p: 'phos = hesp', q: 'Bright(phos)' }, goal: 'Bright(hesp)', term: 'p ▸ q' }],
        cases: [],
        brief: T('实现一个证明器，可以从已知 p：「晨星 = 昏星」、q：「晨星很亮」证明出「昏星很亮」，看它的证明项。', 'Build a prover that, from p: “the Morning Star = the Evening Star” and q: “the Morning Star is bright”, proves “the Evening Star is bright”, and look at its term.'),
        hint: [T('一个<part-ref to="part:rewrite"></part-ref>，点上晨星那一处。', 'One <part-ref to="part:rewrite"></part-ref>, with the Morning Star ticked.')],
        solution: proof({ w: ['rewrite', { at: [0] }] }, ['p>w.eq', 'q>w.p', 'w>goal'], { premises: ['p', 'q'] }),
      },
      ...write([
        { premises: { p: 'phos = hesp', q: 'Bright(phos)' }, goal: 'Bright(hesp)', answer: 'p ▸ q', hint: [T('「□ ▸ □」：前一个框放等式，后一个框放关于晨星的那句。', '“□ ▸ □”: the equation in the first box, the sentence about the Morning Star in the second.')] },
        { premises: { p: 'phos = hesp', q: 'Seen(hesp)' }, goal: 'Seen(phos)', answer: 'p ▸ q', hint: [T('这回 q 说的是昏星，要证的是晨星：核两个方向都会试。', 'This time q is about the Evening Star and the goal about the Morning Star: the kernel tries both ways.')] },
        { premises: { p: 'phos = hesp', q: 'Bright(phos)', r: '∀x. Bright(x) → Seen(x)' }, goal: 'Seen(hesp)', answer: 'r hesp (p ▸ q)', hint: [T('先由 q 换出「昏星很亮」，再交给 r。', 'First turn q into “the Evening Star is bright”, then give it to r.')] },
      ], 1),
    ],
    showcase: T('证明板上点的框，就是证明项里没写出来的那部分：要证的那句里，哪几处是从等式一边换过来的，叫动机；核从要证的那句和后一个框的类型里把它读出来', 'the boxes ticked on the proof board are the part a term does not write out: which places of the sentence to prove came from one side of the equation, the motive; the kernel reads it off the sentence to prove and the type of the second box'),
    intro: [
      { t: T('用一个等式只有一种办法，在 Lean 里叫 <b>Eq.rec</b>，写作 <b>h ▸ p</b>：h 证 a = b，p 证一句关于 a 的话，h ▸ p 就证把其中几处 a 换成 b 的那句。换哪几处，叫<wiki-ref to="motive"></wiki-ref>。', 'There is only one way to use an equation, called <b>Eq.rec</b> in Lean and written <b>h ▸ p</b>: h proves a = b, p proves a sentence about a, and h ▸ p proves that sentence with some of its a’s replaced by b. Which places are replaced is the <wiki-ref to="motive"></wiki-ref>.') },
      { t: T('它就是证明板上的<part-ref to="part:rewrite"></part-ref>：先接一个，看它写出的证明项；再到证明项板上自己写。', 'It is just <part-ref to="part:rewrite"></part-ref> on the proof board: wire one first and see the term it writes, then write it yourself on the term board.') },
    ],
    after: T('等量代换的证明项是 h ▸ p，卡片上点的框没有写进去：核看着要证的那句，把等式的一边换成另一边，看换出来的是不是 p 证的那句。两边都试，所以 h 的方向不用管。', 'The term of rewriting is h ▸ p, without the ticked boxes: the kernel looks at the sentence to prove, replaces one side of the equation by the other, and sees whether that is what p proves. It tries both sides, so the direction of h does not matter.'),
  },
  {
    id: 'eq-symm',
    title: T('倒过来的证明项', 'The term of turning round'),
    consts: STARS,
    tasks: write([
      { premises: { p: 'phos = hesp' }, goal: 'hesp = phos', answer: 'p ▸ rfl', naive: 'p', hint: [T('<level-ref to="q-sym"></level-ref>里用了<part-ref to="part:refl"></part-ref>和<part-ref to="part:rewrite"></part-ref>，各写成什么？', '<level-ref to="q-sym"></level-ref> used <part-ref to="part:refl"></part-ref> and <part-ref to="part:rewrite"></part-ref>; how is each written?')] },
      { premises: {}, goal: '∀x. ∀y. x = y → y = x', answer: 'fun a b h => h ▸ rfl', hint: [T('三层 fun：两样东西 a、b，和一个 a = b 的证明 h。', 'Three funs: two things a and b, and a proof h of a = b.')] },
      { premises: { p: 'phos = hesp', q: 'Bright(hesp) → Seen(hesp)' }, goal: 'Bright(phos) → Seen(phos)', answer: 'p ▸ q', hint: [T('要证的那句里，晨星出现了两处。', 'The Morning Star appears twice in the sentence to prove.')] },
    ]),
    intro: [{ t: T('<level-ref to="q-sym"></level-ref>在证明板上把等式倒了过来。写成证明项是什么样？', '<level-ref to="q-sym"></level-ref> turned an equation round on the proof board. What does that look like as a term?') }],
    after: T('p ▸ rfl：要证昏星 = 晨星，把昏星换回晨星，剩下的晨星 = 晨星由 rfl 证。等式倒过来不是新规则，是 rfl 和 ▸ 拼出来的。', 'p ▸ rfl: to prove the Evening Star = the Morning Star, turn the Evening Star back into the Morning Star, and rfl proves the Morning Star = the Morning Star that is left. Turning an equation round is no new rule, only rfl and ▸ put together.'),
  },
  {
    id: 'eq-trans',
    title: T('一路相等的证明项', 'The term of equal all along'),
    consts: STARS,
    tasks: write([
      { premises: { p: 'phos = venus', q: 'venus = hesp' }, goal: 'phos = hesp', answer: 'q ▸ p', naive: 'p', hint: [T('用一个等式把要证的那句换一换，换出来的应当正是另一个已知。', 'Use one equation to change the sentence to prove; what comes out should be the other given.')] },
      { premises: { p: 'phos = venus', q: 'hesp = venus' }, goal: 'phos = hesp', answer: 'q ▸ p', hint: [T('q 倒着也一样用：核两边都试。', 'q works the other way round too: the kernel tries both sides.')] },
      { premises: {}, goal: '∀x. ∀y. ∀z. x = y → y = z → x = z', answer: 'fun a b c h k => k ▸ h', hint: [T('五层 fun：三样东西，两个等式。', 'Five funs: three things and two equations.')] },
    ]),
    intro: [{ t: T('<level-ref to="q-trans"></level-ref>把两个等式连成一个。写成证明项。', '<level-ref to="q-trans"></level-ref> joined two equations into one. Write it as a term.') }],
    after: T('q ▸ p：把要证的那句里的昏星换成金星，就是 p；p ▸ q 也行，换的是晨星。自反、对称、传递，写成证明项都只用 rfl 和 ▸。', 'q ▸ p: replace the Evening Star in the sentence to prove by Venus, and that is p; p ▸ q works too, replacing the Morning Star. Reflexive, symmetric, transitive: as terms, all of them use only rfl and ▸.'),
  },
  {
    id: 'eq-motive',
    title: T('换哪几处', 'Which places'),
    consts: STARS,
    tasks: [
      {
        kind: 'proof',
        step: T('只换一处', 'Only one place'),
        tests: [{ premises: { p: 'phos = hesp', q: 'Bright(phos) ∧ Seen(phos)' }, goal: 'Bright(hesp) ∧ Seen(phos)' }],
        cases: [],
        brief: T('实现一个证明器，可以从已知 p：「晨星 = 昏星」、q：「晨星很亮 ∧ 晨星看得见」证明出「昏星很亮 ∧ 晨星看得见」。', 'Build a prover that, from p: “the Morning Star = the Evening Star” and q: “the Morning Star is bright ∧ the Morning Star can be seen”, proves “the Evening Star is bright ∧ the Morning Star can be seen”.'),
        hint: [T('每个框都点上，证出的是哪一句？', 'With every box ticked, which sentence is proved?')],
        solution: proof({ w: ['rewrite', { at: [0] }] }, ['p>w.eq', 'q>w.p', 'w>goal'], { premises: ['p', 'q'] }),
        naive: proof({ w: ['rewrite', { at: [0, 1] }] }, ['p>w.eq', 'q>w.p', 'w>goal'], { premises: ['p', 'q'] }),
      },
      {
        kind: 'proof',
        step: T('两个方向', 'Both ways'),
        tests: [{ premises: { p: 'phos = hesp', q: 'Bright(phos) ∧ Seen(hesp)' }, goal: 'Bright(hesp) ∧ Seen(phos)' }],
        cases: [],
        brief: T('再从已知 p：「晨星 = 昏星」、q：「晨星很亮 ∧ 昏星看得见」证明出「昏星很亮 ∧ 晨星看得见」。', 'Now from p: “the Morning Star = the Evening Star” and q: “the Morning Star is bright ∧ the Evening Star can be seen”, prove “the Evening Star is bright ∧ the Morning Star can be seen”.'),
        hint: [
          T('一处要把晨星换成昏星，另一处要把昏星换成晨星。', 'One place wants the Morning Star turned into the Evening Star, the other the Evening Star into the Morning Star.'),
          T('第二种换法要一个倒过来的等式。', 'The second wants the equation turned round.'),
        ],
        solution: proof(
          { r: ['refl', { t: 'phos' }], s: ['rewrite', { at: [0] }], w1: ['rewrite', { at: [0] }], w2: ['rewrite', { at: [0] }] },
          ['p>s.eq', 'r>s.p', 's>w1.eq', 'q>w1.p', 'p>w2.eq', 'w1>w2.p', 'w2>goal'],
          { premises: ['p', 'q'] },
        ),
      },
    ],
    intro: [{ t: T('一句话里同一样东西可以出现好几次，等量代换换掉的是点上的那几处。', 'One thing can appear several times in a sentence, and rewriting replaces the places ticked.') }],
    after: T('换掉全部和换掉一部分，证出的是不同的两句。动机就是这个选择；写证明项时它不写出来，核从要证的那句里读。', 'Replacing every place and replacing some prove two different sentences. The motive is that choice; a term does not write it, and the kernel reads it from the sentence to prove.'),
  },

  // ---------- two kinds of equality ----------
  {
    id: 'eq-defeq',
    title: T('算出来就相等', 'Equal by computing'),
    consts: ['zero', 'm'],
    tasks: write([
      { premises: {}, goal: 'plus(s(zero), s(zero)) = s(s(zero))', defs: NAT, answer: 'rfl', hint: [T('按加法的定义把左边算出来。', 'Work the left side out by the definition of addition.')] },
      { premises: {}, goal: '∀x. plus(zero, x) = x', defs: NAT, answer: 'fun a => rfl', hint: [T('0 + a 按定义算出来是什么？', 'What does 0 + a work out to by the definition?')] },
      { premises: {}, goal: '∀x. plus(s(zero), x) = s(x)', defs: NAT, answer: 'fun a => rfl', naive: 'rfl', hint: [T('定义算两步。', 'Two steps of the definition.')] },
      { premises: { p: 'Even(plus(s(s(zero)), m))' }, goal: 'Even(s(s(m)))', defs: NAT, answer: 'p', hint: [T('p 的类型算出来是什么？', 'What does the type of p work out to?')] },
    ]),
    intro: [{ t: T('这一关有加法的定义：0 + y = y，S x + y = S (x + y)。核比较两个类型前，先按定义把它们算到底，算出来一样就算一样。', 'This level has the definition of addition: 0 + y = y and S x + y = S (x + y). Before comparing two types, the kernel works them out by the definitions, and if they come out alike they count as alike.') }],
    after: T('1 + 1 = 2 用不着证明，rfl 就够了：核会算。按定义算得出来的相等叫<wiki-ref to="defeq"></wiki-ref>；一个证明的类型也可以按它来换，最后一题的 p 直接就是要的那句。', '1 + 1 = 2 needs no proof; rfl is enough, because the kernel computes. An equality that comes out by working the definitions is a <wiki-ref to="defeq"></wiki-ref>; a proof’s type can be read through it too, so in the last problem p is just the sentence wanted.'),
  },
  // ---------- reflection ----------
  proves({
    id: 'rf-eval',
    title: T('判定程序', 'A decision procedure'),
    words: DATA,
    defs: TAUT,
    tests: [
      { goal: 'taut(disj(p, neg(p))) = tt' },
      { goal: 'taut(conj(p, q)) = ff' },
      { goal: 'taut(disj(neg(conj(p, q)), disj(p, q))) = tt' },
    ],
    brief: PROVE,
    hint: [T('化简接进这一关所有的定义，最后两边一样，用自反律。', 'Wire every definition of this level into Simp; when both sides are alike, use Reflexivity.')],
    intro: [
      { t: T('<level-ref to="au-cert"></level-ref>里，外面的证明器交来证书，核照着重放。另一条路不找证书，靠的是核会按定义去算。公式本身也能写成数据：Or p (Not p) 是一样东西，eval f a b 按定义算出它在 p 取 a、q 取 b 那一行的真假，taut f 把四行都算一遍。这是一个<wiki-ref to="decision"></wiki-ref>：判定一句话是不是永远成立。', 'In <level-ref to="au-cert"></level-ref>, an outside prover hands over a certificate and the kernel replays it. The other road looks for no certificate and leans on the kernel computing by the definitions. A formula can be written as data too: Or p (Not p) is a thing, eval f a b works out by the definitions whether it is true on the row where p is a and q is b, and taut f works out all four rows. It is a <wiki-ref to="decision"></wiki-ref>: it decides whether a sentence always holds.') },
    ],
    solution: script(['simp', ALL_DEFS], ['rule', 'refl']),
    naive: script(['rule', 'refl']),
    after: T('判定程序是用定义写成的，化简按定义一路算下去，算出真就是真，算出假就是假。真值表就是这样一个程序。', 'The decision procedure is written as definitions, and Simp works it out by them all the way: true comes out true, false comes out false. A truth table is just such a program.'),
  }),
  {
    id: 'rf-decide',
    title: T('让核来算', 'Let the kernel compute'),
    tasks: reflect([
      { premises: { sound: SOUND }, goal: 'Taut(disj(p, neg(p)))', answer: 'sound rfl', naive: 'rfl', hint: [T('sound 要一个 taut x = 真 的证明。核会按定义算。', 'sound wants a proof of taut x = true, and the kernel computes by the definitions.')] },
      { premises: { sound: SOUND }, goal: 'Taut(disj(neg(conj(p, q)), disj(p, q)))', answer: 'sound rfl', hint: [T('和第一题一样，x 从要证的那句里读出来。', 'As in the first, x is read off the sentence to prove.')] },
      { premises: { sound: SOUND }, goal: 'Taut(neg(conj(p, neg(p))))', answer: 'sound rfl', hint: [T('还是一样的证明项。', 'The same proof term again.')] },
    ]),
    intro: [{ t: T('已知 sound 说判定程序是对的：taut x 算出真，x 就永远成立。它对所有公式证一次就够了（对公式归纳）。之后每一句，只要核把 taut 算出来。这条路叫<wiki-ref to="reflection"></wiki-ref>，Lean 的 decide 就是这样。', 'The given sound says the decision procedure is right: if taut x works out true, x always holds. It is proved once for every formula (by induction on formulas). After that, each sentence only needs the kernel to work taut out. This road is <wiki-ref to="reflection"></wiki-ref>, and Lean’s decide works this way.') }],
    after: T('三句话三个证明项，都是 sound rfl：证明里没有一步推理，只有一次计算。核检查 rfl 时把 taut 算到底，算的就是一张真值表。', 'Three sentences, three proof terms, all sound rfl: no step of reasoning in them, only one computation. Checking rfl, the kernel works taut out to the end, and what it works out is a truth table.'),
  },
  {
    id: 'rf-false',
    title: T('算出来是假', 'It works out false'),
    tasks: reflect([
      { premises: { sound: SOUND, complete: COMPLETE }, goal: '¬Taut(conj(p, q))', given: 'sound rfl', answer: 'complete rfl', hint: [T('先点检查，看核把 taut 算成了什么。', 'Check first and see what the kernel works taut out to.')] },
      { premises: { sound: SOUND, complete: COMPLETE }, goal: '¬Taut(disj(p, q))', answer: 'complete rfl', naive: 'sound rfl', hint: [T('p 和 q 都假的那一行呢？', 'What of the row where p and q are both false?')] },
      { premises: { sound: SOUND, complete: COMPLETE }, goal: 'Taut(disj(q, neg(q))) ∧ ¬Taut(q)', answer: '⟨sound rfl, complete rfl⟩', hint: [T('一对，两边各算一次。', 'A pair, each side worked out once.')] },
    ]),
    intro: [{ t: T('已知 complete 说：taut x 算出假，x 就不是永远成立。判定程序两个方向都回答。', 'The given complete says: if taut x works out false, x does not always hold. The decision procedure answers both ways.') }],
    after: T('rfl 只认算得出的等式：taut 算出假，sound rfl 就不过。判定程序不会出错地说「是」：要么核算出真，要么算出假，没有第三种。', 'rfl takes only equations that work out: when taut works out false, sound rfl does not pass. The decision procedure cannot wrongly say “yes”: the kernel works out true or false, and there is no third way.'),
  },

  {
    id: 'eq-propeq',
    title: T('要证明的相等', 'Equal by proof'),
    consts: ['zero', 'm'],
    tasks: write([
      { premises: { addZero: ADD_ZERO }, goal: '∀x. plus(x, zero) = x', defs: NAT, answer: 'addZero', naive: 'fun a => rfl', hint: [T('先试 fun a => rfl，看核怎么说。', 'Try fun a => rfl first and see what the kernel says.')] },
      { premises: { p: 'Even(plus(m, zero))', addZero: ADD_ZERO }, goal: 'Even(m)', defs: NAT, answer: 'addZero m ▸ p', naive: 'p', hint: [T('addZero 用在 m 上，得到 m + 0 = m。', 'addZero used on m gives m + 0 = m.')] },
      { premises: { p: 'Even(plus(zero, plus(m, zero)))', addZero: ADD_ZERO }, goal: 'Even(m)', defs: NAT, answer: 'addZero m ▸ p', hint: [T('外层的 0 + 算得掉，里层的 + 0 算不掉。', 'The outer 0 + works out, the inner + 0 does not.')] },
    ]),
    intro: [{ t: T('定义只说 0 和 S x 加上 y 是什么，x 是一个不知道的数时，x + 0 就算不下去了。<level-ref to="in-zero"></level-ref>用归纳证出了 x + 0 = x，这一关它是已知 addZero，用法和别的「对所有」一样：addZero m 证 m + 0 = m。', 'The definition only says what 0 and S x plus y are; when x is a number nobody knows, x + 0 does not work out. <level-ref to="in-zero"></level-ref> proved x + 0 = x by induction, and here it is the given addZero, used like any other “for all”: addZero m proves m + 0 = m.') }],
    after: T('m + 0 = m 是对的，可核算不出来，要一个证明：这叫<wiki-ref to="propeq"></wiki-ref>。用它换掉类型里的一处，要写 ▸；定义相等不用写，核自己会算。', 'm + 0 = m is true, but the kernel cannot work it out, so it takes a proof: a <wiki-ref to="propeq"></wiki-ref>. Using it to replace part of a type takes ▸; a definitional one needs nothing written, since the kernel computes it.'),
  },

  // ---------- dependent types ----------
  {
    id: 'dt-vec',
    title: T('长度写在类型里', 'Length in the type'),
    consts: ['zero', 'm'],
    tasks: write([
      { premises: { vnil: VNIL, vcons: VCONS }, goal: 'Vec(s(s(zero)))', answer: 'vcons (vcons vnil)', naive: 'vcons vnil', hint: [T('vnil 长 0，每用一次 vcons 长一格。', 'vnil is 0 long, and each vcons makes it one longer.')] },
      { premises: { v: 'Vec(m)', vcons: VCONS }, goal: 'Vec(s(s(m)))', answer: 'vcons (vcons v)', hint: [T('vcons 的 x 由它拿到的向量读出来，不用写。', 'The x of vcons is read off the vector it gets; it is not written.')] },
      { premises: { vcons: VCONS }, goal: '∀x. Vec(x) → Vec(s(s(x)))', answer: 'fun a v => vcons (vcons v)', hint: [T('两层 fun：一个长度 a，一个长 a 的向量 v。', 'Two funs: a length a and a vector v of that length.')] },
    ]),
    intro: [
      { t: T('类型还能依赖一个值。<b>Vec n</b> 是长 n 的向量的类型：长度写在类型里。这里只记长度，一个 Vec n 的证明项就是一个长 n 的向量。', 'A type can depend on a value. <b>Vec n</b> is the type of vectors n long: the length is in the type. Only the length is kept here, so a proof term of Vec n is a vector n long.') },
      { t: T('已知 vnil 是空向量，vcons 在一个长 x 的向量前面接一个，得到长 S x 的。vcons 是「对所有 x」，可 x 不用写：核看它拿到的向量是多长，就知道 x 是几。', 'The given vnil is the empty vector, and vcons puts one in front of a vector x long to give one S x long. vcons is “for all x”, yet x is not written: the kernel sees how long the vector it gets is, and so knows x.') },
    ],
    after: T('vcons 的类型 ∀x. Vec x → Vec (S x) 说的是：结果的长度依赖参数的长度。这样的类型叫<wiki-ref to="dependent"></wiki-ref>；x 由别处读出、不用写的参数叫<wiki-ref to="implicit"></wiki-ref>。', 'The type of vcons, ∀x. Vec x → Vec (S x), says the length of the result depends on the length of the argument. Such a type is a <wiki-ref to="dependent"></wiki-ref>; an argument such as x, read off elsewhere and not written, is an <wiki-ref to="implicit"></wiki-ref>.'),
  },
  {
    id: 'dt-head',
    title: T('空的取不出来', 'Nothing to take from empty'),
    consts: ['zero', 'm'],
    tasks: write([
      { premises: { vnil: VNIL, vcons: VCONS, head: '∀x. Vec(s(x)) → Elem' }, goal: 'Elem', given: 'head vnil', answer: 'head (vcons vnil)', hint: [T('先点检查，看核说什么：head 要多长的向量？', 'Check first and see what the kernel says: how long a vector does head want?')] },
      { premises: { v: 'Vec(m)', vcons: VCONS, head: '∀x. Vec(s(x)) → Elem' }, goal: 'Elem', answer: 'head (vcons v)', naive: 'head v', hint: [T('m 可能是 0。', 'm may be 0.')] },
      { premises: { v: 'Vec(s(s(m)))', tail: '∀x. Vec(s(x)) → Vec(x)' }, goal: 'Vec(m)', answer: 'tail (tail v)', naive: 'tail v', hint: [T('tail 去掉最前面一个。', 'tail drops the first one.')] },
    ]),
    intro: [{ t: T('head 取出向量的第一个，它的类型是 ∀x. Vec (S x) → Elem：只收长 S x 的向量，也就是非空的。', 'head takes out a vector’s first element, and its type is ∀x. Vec (S x) → Elem: it takes only vectors S x long, that is, ones that are not empty.') }],
    after: T('取空向量的第一个，在别的语言里是运行时的错；这里是类型错，核在检查时就拒绝了。长度写进类型，有些错在程序跑起来之前就排除了。', 'Taking the first of an empty vector is a runtime error in other languages; here it is a type error, refused by the kernel while checking. With the length in the type, some mistakes are ruled out before the program ever runs.'),
  },

  // ---------- both together ----------
  {
    id: 'dt-app',
    title: T('拼接', 'Appending'),
    consts: ['zero', 'm', 'n'],
    tasks: write([
      { premises: { v: 'Vec(m)', w: 'Vec(n)', append: APPEND }, goal: 'Vec(plus(m, n))', defs: NAT, answer: 'append v w', naive: 'append w v', hint: [T('append 的两个长度都由向量读出来。', 'Both lengths of append are read off the vectors.')] },
      { premises: { v: 'Vec(s(zero))', w: 'Vec(s(zero))', append: APPEND }, goal: 'Vec(s(s(zero)))', defs: NAT, answer: 'append v w', hint: [T('append v w 的类型是 Vec (1 + 1)，核会算。', 'append v w has type Vec (1 + 1), and the kernel computes.')] },
      { premises: { v: 'Vec(m)', one: 'Vec(s(zero))', append: APPEND }, goal: 'Vec(s(m))', defs: NAT, answer: 'append one v', naive: 'append v one', hint: [T('1 + m 和 m + 1，哪一个按定义算得出 S m？', 'Which of 1 + m and m + 1 works out to S m by the definition?')] },
    ]),
    intro: [{ t: T('append 把两个向量拼起来，长度相加：∀x y. Vec x → Vec y → Vec (x + y)。这一关有加法的定义，核会把类型里的加法算出来。', 'append puts two vectors together, and the lengths add: ∀x y. Vec x → Vec y → Vec (x + y). This level has the definition of addition, and the kernel works out the addition in a type.') }],
    after: T('类型里的长度也按定义算：长 1 的接在前面，1 + m 算出来就是 S m；接在后面是 m + 1，算不动。', 'A length in a type is worked out by the definitions too: one put in front gives 1 + m, which works out to S m; put at the end it is m + 1, which does not work out.'),
  },
  {
    id: 'dt-transport',
    title: T('类型里的相等', 'Equality in a type'),
    consts: ['zero', 'm'],
    tasks: write([
      { premises: { v: 'Vec(plus(m, zero))', addZero: ADD_ZERO }, goal: 'Vec(m)', defs: NAT, answer: 'addZero m ▸ v', naive: 'v', hint: [T('<level-ref to="eq-propeq"></level-ref>里怎么把 m + 0 换成 m？', 'How did <level-ref to="eq-propeq"></level-ref> turn m + 0 into m?')] },
      { premises: { v: 'Vec(m)', addZero: ADD_ZERO }, goal: 'Vec(plus(m, zero))', defs: NAT, answer: 'addZero m ▸ v', hint: [T('倒过来也是同一个等式。', 'The other way round is the same equation.')] },
      { premises: { v: 'Vec(m)', vnil: VNIL, append: APPEND, addZero: ADD_ZERO }, goal: 'Vec(m)', defs: NAT, answer: 'addZero m ▸ append v vnil', naive: 'append v vnil', hint: [T('append v vnil 的类型是什么？', 'What is the type of append v vnil?')] },
    ]),
    intro: [{ t: T('一个长 m + 0 的向量，当然就是长 m 的。可核算不出 m + 0 是 m：要拿等式把类型换过去。', 'A vector m + 0 long is of course m long. But the kernel cannot work m + 0 out to m: an equation has to carry the type across.') }],
    after: T('▸ 不只能换一句话里的东西，也能换一个类型：同一个向量，换上一个相等的长度。这叫<wiki-ref to="transport"></wiki-ref>。', '▸ can replace things not only in a sentence but in a type: the same vector, under an equal length. This is called <wiki-ref to="transport"></wiki-ref>.'),
  },

  // ---------- challenge ----------
  {
    id: 'dt-snoc',
    title: T('接在后面', 'At the end'),
    consts: ['zero', 'm'],
    tasks: write([
      {
        premises: { v: 'Vec(m)', snoc: '∀x. Vec(x) → Vec(plus(x, s(zero)))', addZero: ADD_ZERO, addSucc: ADD_SUCC },
        goal: 'Vec(s(m))',
        defs: NAT,
        answer: 'addZero m ▸ addSucc m zero ▸ snoc v',
        naive: 'addSucc m zero ▸ snoc v',
        hint: [
          T('snoc v 长 m + 1，也就是 m + S 0。要的是 S m。', 'snoc v is m + 1 long, that is, m + S 0. S m is wanted.'),
          T('addSucc m 0 把 m + S 0 换成 S (m + 0)；还剩一步。', 'addSucc m 0 turns m + S 0 into S (m + 0); one step is left.'),
        ],
      },
    ]),
    intro: [{ t: T('snoc 在向量后面接一个，长度是 x + 1。拿它从一个长 m 的向量造出长 S m 的。', 'snoc puts one at the end of a vector, making it x + 1 long. Use it to make a vector S m long from one m long.') }],
    after: T('接在后面，长度要两次搬：m + S 0 先成 S (m + 0)，再成 S m。证明助手里写依赖类型的程序，常常就是这样：程序本身很短，长度对上要靠一串等式。', 'At the end, the length takes two moves: m + S 0 first becomes S (m + 0), then S m. Writing dependently typed programs in a proof assistant is often like this: the program is short, and a string of equations makes the lengths fit.'),
  },
]
