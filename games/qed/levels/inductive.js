// Chapter 12 · Numbers and lists, everything in their rule book declared by the player: the types on the declaration
// board (declare.js), the functions on the definition board (define.js, one row per constructor, recursion only on a
// smaller argument). Addition is defined, worked out by hand on the proof board (its equations as givens, Take one and
// Rewrite), then by simp. The declaration gives rules (kit/domains/logic/datatype.js) used with the rule cards like
// any other: the constructors are all different, every value is made by one of them, and induction, done first by
// hand with the two-box Induction part, then by the rule on the machine; one-to-one is proved, from pred. Lists
// (declared, append and length defined, simp with a given) and definitions with a condition (bool declared, le and
// max defined) need nothing from each other; then numbers, lists and why a definition must stop. Each equation proved
// is a rule and a rewrite rule from then on (the course's facts). Practice puts both together. Topics: insertion sort
// (if, insert and sort defined; if's rules with a condition proved); and, after the halting problem, incompleteness,
// Gödel's whole argument in six steps: sentences coded as numbers, proof checking and the diagonal as computations
// Simp works out (machines the levels write, `stated`), then on the proof board true yet unprovable, consistency is
// enough, and no consistent prover proves itself consistent. The challenge is commutativity, which simp would turn
// back and forth for ever.
import { proof } from '../../kit/domains/logic/build.js'
import { flow, script } from './machines.js'
import { TERM_WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const proves = (level) => ({ kind: 'machine', want: 'proved', inputs: GOAL, backtrack: true, words: TERM_WORDS, ...level })
const PROVE = T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.')

// The types and functions are the player's (declare.js, the definition levels below): a level names those it uses,
// and gets the equations in the order of their definitions' rows (def.0, def.1 …).
const NAT = ['nat']
const LIST = ['list']
// Insertion sort: comparison, if, insert, sort, and length for what is proved of it.
const SORT = ['le', 'if', 'ins', 'sort', 'len']
// A function defined on the definition board (define.js): its rows, each with its right side to pick.
const define = (level) => ({ kind: 'define', words: TERM_WORDS, ...level })
const row = (lhs, ...choices) => ({ lhs, choices })
const DEFINE = T('给每一行选一个右边，让每个测试都算对。', 'Pick a right side for every row so that every test works out right.')
// The incompleteness topic: G, provability of a sentence's code, and the codes it needs.
const GOEDEL = { G: T('G', 'G'), Prov: T('{0} 证得出', '{0} is provable'), diag: T('对角 {0}', 'the diagonal of {0}'), d: T('⌜D⌝', '⌜D⌝'), g: T('⌜G⌝', '⌜G⌝'), gn: T('⌜G 证不出⌝', '⌜G is not provable⌝'), gp: T('⌜⌜G⌝ 证得出⌝', '⌜⌜G⌝ is provable⌝'), cs: T('⌜不矛盾⌝', '⌜consistent⌝') }
// The machine levels of the topic: sentences as terms (it rains, ¬, →), their codes (lists of symbol numbers), proofs
// as trees (axioms and Apply), and the diagonal (a sentence with a gap □, and the code of a sentence put in it).
const GOEDEL_TERMS = {
  ...TERM_WORDS,
  rain: T('下雨', 'it rains'), wet: T('地湿', 'the ground is wet'), slip: T('路滑', 'the road is slippery'),
  neg: T('¬{0}', '¬{0}'), imp: T('({0} → {1})', '({0} → {1})'), code: T('⌜{0}⌝', '⌜{0}⌝'),
  one: T('1', '1'), two: T('2', '2'), three: T('3', '3'), four: T('4', '4'),
  ax: T('公理 {0}', 'axiom {0}'), use: T('套用 [{0}] [{1}]', 'apply [{0}] [{1}]'), concl: T('结论 {0}', 'conclusion {0}'), then: T('{0} 接上 {1}', '{0} meets {1}'),
  ok: T('查 {0}', 'check {0}'), isax: T('{0} 是公理', '{0} is an axiom'), fits: T('{0} 对得上 {1}', '{0} fits {1}'), both: T('{0} 且 {1}', '{0} and {1}'),
  nprov: T('「{0} 证不出」', '“{0} cannot be proved”'), dg: T('对角 {0}', 'the diagonal of {0}'), vx: T('□', '□'), qt: T('⌜{0}⌝', '⌜{0}⌝'),
  diag: T('对角 {0}', 'the diagonal of {0}'), sub: T('{0}[□ := {1}]', '{0}[□ := {1}]'), subt: T('{0}[□ := {1}]', '{0}[□ := {1}]'), val: T('值 {0}', 'value {0}'),
}
const defs = (n, from = 0) => Array.from({ length: n }, (_, k) => `def.${from + k}`)
// Induction, then each goal: the cards given, then both sides the same.
const byInduction = (type, ...body) => flow(['rule', `${type}.induct`], { frame: 'each', body: [...body, ['rule', 'refl']] })

export const inductive = [
  // ---------- where numbers come from ----------
  define({
    id: 'def-plus',
    title: T('定义加法', 'Defining addition'),
    fn: 'plus',
    on: 0,
    rows: [row('plus(zero, y)', 'y', 'zero', 's(y)'), row('plus(s(x), y)', 's(plus(x, y))', 'plus(x, y)', 's(plus(s(x), y))', 's(y)')],
    tests: [
      { term: 'plus(s(zero), s(zero))', value: 's(s(zero))' },
      { term: 'plus(s(s(zero)), s(zero))', value: 's(s(s(zero)))' },
      { term: 'plus(zero, s(zero))', value: 's(zero)' },
    ],
    solution: ['y', 's(plus(x, y))'],
    naive: ['y', 's(plus(s(x), y))'],
    brief: DEFINE,
    hint: [T('S x + y 比 x + y 多一。', 'S x + y is one more than x + y.')],
    intro: [{ t: T('数有了，还没有加法。定义一个函数，就是按要拆开的那个数，每个构造子写一行：0 + y 等于什么，S x + y 等于什么。右边可以再用加法，但要拆的数必须变小，否则算不完。', 'There are numbers, but no addition yet. To define a function, write one row for each constructor of the number it takes apart: what 0 + y is, and what S x + y is. A right side may use addition again, but only on a smaller number, or it never finishes.') }],
    after: T('Lean 把这样的定义编译成自然数的递推子 Nat.rec。', 'Lean compiles such a definition into the recursor of the numbers, Nat.rec.'),
  }),
  {
    id: 'nl-plus',
    kind: 'proof',
    title: T('手算 1 + 1', 'One plus one by hand'),
    consts: ['zero'],
    words: TERM_WORDS,
    cases: [],
    tests: [{ premises: { d0: '∀y. plus(zero, y) = y', d1: '∀x. ∀y. plus(s(x), y) = s(plus(x, y))' }, goal: 'plus(s(zero), s(zero)) = s(s(zero))' }],
    brief: T('从加法的两条定义证出 1 + 1 = 2。', 'From the two definitions of addition, prove 1 + 1 = 2.'),
    hint: [
      T('先用<part-ref to="part:allE"></part-ref>，把定义里的 x、y 换成具体的数。', 'Start with <part-ref to="part:allE"></part-ref>, putting particular numbers for the x and y of a definition.'),
      T('第二条定义给出 S (0 + S 0)；第一条算出 0 + S 0，再用等量代换换进去。', 'The second definition gives S (0 + S 0); the first works out 0 + S 0, which Rewrite then puts in.'),
    ],
    intro: [
      { t: T('<level-ref to="def-plus"></level-ref>的两条等式 0 + y = y、S x + y = S (x + y)，在证明板上是两句「对所有」的已知。', 'On the proof board, the two equations of <level-ref to="def-plus"></level-ref>, 0 + y = y and S x + y = S (x + y), are two “for all” givens.') },
    ],
    solution: proof({ e1: ['allE', { t: 'zero' }], e2: ['allE', { t: 's(zero)' }], e3: ['allE', { t: 's(zero)' }], w: ['rewrite', { at: [0] }] }, ['d1>e1.all', 'e1>e2.all', 'd0>e3.all', 'e3>w.eq', 'e2>w.p', 'w>goal'], { premises: ['d0', 'd1'] }),
  },
  // ---------- working them out ----------
  proves({
    id: 'sp-compute',
    title: T('算一算', 'Work it out'),
    defs: ['plus'],
    tests: [{ goal: 'plus(s(zero), s(zero)) = s(s(zero))' }, { goal: 'plus(s(s(zero)), s(zero)) = s(s(s(zero)))' }, { goal: 'plus(zero, s(s(zero))) = s(s(zero))' }],
    brief: PROVE,
    hint: [T('先让化简用两条定义把左边算出来；两边一样以后，用<part-ref to="part:rule"></part-ref>接上<part-ref to="part:refl"></part-ref>。', 'Let Simp work the left side out with the two definitions; once both sides are the same, <part-ref to="part:rule"></part-ref> with <part-ref to="part:refl"></part-ref>.')],
    intro: [{ t: T('定义也是改写规则：<part-ref to="lemma:simp"></part-ref>的规则里多了一组「定义」。<level-ref to="nl-plus"></level-ref>里手算的，可以交给它。', 'A definition is a rewrite rule too: <part-ref to="lemma:simp"></part-ref> now has a group of definitions among its rules. What <level-ref to="nl-plus"></level-ref> did by hand can be left to it.') }],
    solution: script(['simp', ['def.0', 'def.1']], ['rule', 'refl']),
    after: T('在证明助手里，计算就是改写。', 'In a proof assistant, computing is rewriting.'),
  }),
  {
    id: 'def-list',
    title: T('定义拼接和长度', 'Defining append and length'),
    tasks: [
      define({
        step: T('拼接', 'Append'),
        fn: 'app',
        on: 0,
        rows: [row('app(nil, ys)', 'ys', 'nil'), row('app(cons(x, xs), ys)', 'cons(x, app(xs, ys))', 'app(xs, cons(x, ys))', 'cons(x, app(cons(x, xs), ys))')],
        tests: [
          { term: 'app(cons(ann, nil), cons(bo, nil))', value: 'cons(ann, cons(bo, nil))' },
          { term: 'app(cons(ann, cons(bo, nil)), cons(cy, nil))', value: 'cons(ann, cons(bo, cons(cy, nil)))' },
        ],
        solution: ['ys', 'cons(x, app(xs, ys))'],
        naive: ['ys', 'app(xs, cons(x, ys))'],
        brief: DEFINE,
        hint: [T('x :: xs 接上 ys，x 仍在最前面。', 'In x :: xs followed by ys, x is still in front.')],
        intro: [{ t: T('xs ++ ys 把两个列表接起来，拆开的是前一个列表。', 'xs ++ ys joins two lists; the one it takes apart is the first.') }],
      }),
      define({
        step: T('长度', 'Length'),
        fn: 'len',
        on: 0,
        rows: [row('len(nil)', 'zero', 's(zero)'), row('len(cons(x, xs))', 's(len(xs))', 'len(xs)', 's(len(cons(x, xs)))')],
        tests: [{ term: 'len(cons(ann, cons(bo, nil)))', value: 's(s(zero))' }, { term: 'len(nil)', value: 'zero' }],
        solution: ['zero', 's(len(xs))'],
        naive: ['zero', 'len(xs)'],
        brief: DEFINE,
        hint: [T('多一样东西，长度加一。', 'One more thing, one longer.')],
      }),
    ],
    intro: [{ t: T('为列表定义两个函数：拼接和长度。', 'Define two functions on lists: append and length.') }],
  },
  proves({
    id: 'sp-lists',
    title: T('列表也一样', 'Lists too'),
    types: LIST,
    defs: ['app', 'len'],
    tests: [
      { goal: 'len(app(cons(ann, nil), cons(bo, nil))) = s(s(zero))' },
      { goal: 'app(cons(ann, nil), app(cons(bo, nil), cons(cy, nil))) = cons(ann, cons(bo, cons(cy, nil)))' },
      { goal: 'len(app(cons(ann, cons(bo, nil)), nil)) = s(s(zero))' },
    ],
    brief: PROVE,
    hint: [T('四条定义都要用。', 'All four definitions are needed.')],
    intro: [{ t: T('<level-ref to="def-list"></level-ref>定义的 ++ 和 len，也交给化简去算。', 'The ++ and len defined in <level-ref to="def-list"></level-ref> go to Simp too.') }],
    solution: script(['simp', ['def.0', 'def.1', 'def.2', 'def.3']], ['rule', 'refl']),
  }),
  {
    id: 'def-max',
    title: T('比大小，取大的', 'Comparing, and the larger'),
    tasks: [
      define({
        step: T('比大小', 'Comparing'),
        fn: 'le',
        on: 0,
        rows: [row('le(zero, y)', 'tt', 'ff'), row('le(s(x), zero)', 'ff', 'tt'), row('le(s(x), s(y))', 'le(x, y)', 'tt', 'le(s(x), s(y))')],
        tests: [
          { term: 'le(s(zero), s(s(zero)))', value: 'tt' },
          { term: 'le(s(s(zero)), s(zero))', value: 'ff' },
          { term: 'le(zero, zero)', value: 'tt' },
        ],
        solution: ['tt', 'ff', 'le(x, y)'],
        naive: ['tt', 'ff', 'tt'],
        brief: DEFINE,
        hint: [T('两边各去掉一个 S，大小关系不变。', 'Taking one S off each side leaves the comparison as it was.')],
        intro: [{ t: T('x ≤ y 的值是真或假。两个数都要拆开，所以有三行：0 和任何数比，S x 和 0 比，S x 和 S y 比。', 'x ≤ y is true or false. Both numbers are taken apart, so there are three rows: 0 against any number, S x against 0, S x against S y.') }],
      }),
      define({
        step: T('取大的', 'The larger'),
        fn: 'max',
        on: null,
        defs: ['le'],
        rows: [
          { lhs: 'max(x, y)', when: 'le(x, y) = tt', choices: ['y', 'x'] },
          { lhs: 'max(x, y)', when: 'le(x, y) = ff', choices: ['x', 'y'] },
        ],
        tests: [
          { term: 'max(s(zero), s(s(zero)))', value: 's(s(zero))' },
          { term: 'max(s(s(zero)), zero)', value: 's(s(zero))' },
        ],
        solution: ['y', 'x'],
        naive: ['x', 'y'],
        brief: DEFINE,
        hint: [T('看哪一行的条件说 x 不比 y 大。', 'Look for the row whose condition says x is no bigger than y.')],
        intro: [{ t: T('max 不拆数，而看 x ≤ y 的真假：真假各一行，每行带一个<b>条件</b>。', 'max takes no number apart; it looks at whether x ≤ y is true: one row for true, one for false, each with a <b>condition</b>.') }],
      }),
    ],
    intro: [{ t: T('<level-ref to="decl-bool"></level-ref>带来了真和假。先定义比大小，再用它定义取大的。', '<level-ref to="decl-bool"></level-ref> brought true and false. Define comparison first, then the larger of two with it.') }],
  },
  proves({
    id: 'sp-cond',
    title: T('带条件的规则', 'A rule with a condition'),
    defs: ['le', 'max'],
    tests: [{ goal: 'max(s(zero), s(s(zero))) = s(s(zero))' }, { goal: 'max(s(s(zero)), s(zero)) = s(s(zero))' }, { goal: 'max(zero, s(zero)) = s(zero)' }],
    brief: PROVE,
    hint: [
      T('事先不知道该用 max 的哪一条规则：两条都试。', 'Which rule for max applies is not known in advance: try both.'),
      T('条件证不出的那条路，会自行失败。', 'The way whose condition cannot be proved fails by itself.'),
    ],
    intro: [{ t: T('<level-ref to="def-max"></level-ref>里 max 的两行都带条件。带条件的规则改写一处以后，条件成为新目标，排在后面；证出它，这次改写才算成立。', 'Both rows of max in <level-ref to="def-max"></level-ref> carry a condition. Once a rule with a condition rewrites a place, the condition becomes a new goal, queued behind; only when it is proved does the rewrite stand.') }],
    solution: flow({ ways: [
      [['rw', 'def.3'], ['rule', 'refl'], ['simp', ['def.0', 'def.1', 'def.2']], ['rule', 'refl']],
      [['rw', 'def.4'], ['rule', 'refl'], ['simp', ['def.0', 'def.1', 'def.2']], ['rule', 'refl']],
    ] }),
    after: T('Isabelle 的化简器把这类规则叫作条件改写规则。', 'Isabelle’s simplifier calls such rules conditional rewrite rules.'),
  }),
  proves({
    id: 'sp-hyp',
    title: T('拿已知改写', 'Rewriting with a given'),
    adds: ['hyp'],
    defs: ['plus', 'app', 'len'],
    tests: [{ goal: 'plus(a, zero) = a → plus(s(a), zero) = s(a)' }, { goal: 'len(app(l, nil)) = len(l) → len(app(cons(ann, l), nil)) = s(len(l))' }],
    brief: PROVE,
    hint: [
      T('「若」的那一半要先进已知。', 'The “if” half has to be among the givens first.'),
      T('化简的规则里有一条是「已知里的等式」。', 'One of Simp’s rules is “an equation given”.'),
    ],
    intro: [{ t: T('已知里的等式也能当改写规则，把左边换成右边。', 'An equation among the givens can be a rewrite rule too, its left side replaced by its right.') }],
    solution: script(['rule', 'impI'], ['simp', ['def.1', 'def.3', 'def.5', 'hyp']], ['rule', 'refl']),
  }),
  proves({
    id: 'sp-under',
    title: T('在「对所有」底下', 'Under “for all”'),
    defs: ['plus'],
    tests: [{ goal: '∀x. plus(zero, plus(zero, x)) = x' }, { goal: '∀x. ∀y. plus(s(zero), plus(x, y)) = s(plus(x, y))' }],
    brief: PROVE,
    hint: [T('化简之后还剩几层「对所有」。', 'After Simp, some “for all”s are still there.')],
    intro: [{ t: T('目标前面有「对所有」，化简照样改写它里面的式子。', 'With a “for all” in front of the goal, Simp still rewrites what is inside.') }],
    solution: flow(['simp', ['def.0', 'def.1']], { frame: 'repeat', body: [['rule', 'allI']] }, ['rule', 'refl']),
  }),

  // ---------- the declaration's rules ----------
  proves({
    id: 'in-distinct',
    title: T('0 不等于 1', '0 is not 1'),
    types: NAT,
    tests: [{ goal: '¬(zero = s(zero))' }, { goal: '¬(s(s(zero)) = zero)' }, { goal: '¬(zero = s(a))' }],
    brief: PROVE,
    hint: [
      T('¬A 就是 A → ⊥。', '¬A is A → ⊥.'),
      T('「数理规则书」里有 0 = S … 的规则；有一组测试的等式方向相反。', 'The “Rule book of numbers” has rules for 0 = S …; one test has its equation the other way round.'),
    ],
    intro: [
      { t: T('化简算得出 1 + 1，却证不出 0 ≠ 1：没有哪条定义说两者不同。说它们不同的是声明：<level-ref to="decl-nat"></level-ref>的 nat = 0 | S nat 是<wiki-ref to="inductive"></wiki-ref>，它给出的规则都在「数理规则书」里。', 'Simp works out 1 + 1, yet cannot prove 0 ≠ 1: no definition says they differ. The declaration does: nat = 0 | S nat of <level-ref to="decl-nat"></level-ref> is an <wiki-ref to="inductive"></wiki-ref>, and the rules it gives are in the “Rule book of numbers”.') },
    ],
    solution: flow(['rule', 'impI'], { ways: [[['erule', 'nat.distinct1']], [['erule', 'nat.distinct2']]] }),
  }),
  {
    id: 'in-inject',
    title: T('一对一', 'One-to-one'),
    fact: 'inject',
    tasks: [
      define({
        step: T('前一个数', 'The one before'),
        fn: 'pred',
        on: 0,
        rows: [row('pred(zero)', 'zero', 's(zero)'), row('pred(s(x))', 'x', 's(x)', 'pred(x)')],
        tests: [
          { term: 'pred(s(s(zero)))', value: 's(zero)' },
          { term: 'pred(s(zero))', value: 'zero' },
          { term: 'pred(zero)', value: 'zero' },
        ],
        solution: ['zero', 'x'],
        naive: ['zero', 'pred(x)'],
        brief: DEFINE,
        hint: [T('0 前面没有数，就取 0。', 'Nothing comes before 0, so take 0.')],
      }),
      {
        kind: 'proof',
        step: T('S 一对一', 'S is one-to-one'),
        consts: ['zero'],
        words: TERM_WORDS,
        cases: [],
        tests: [{ premises: { p: '∀x. pred(s(x)) = x' }, goal: '∀x. ∀y. s(x) = s(y) → x = y' }],
        brief: T('从 pred 的定义证出：若 S x = S y，则 x = y。', 'From the definition of pred, prove: if S x = S y, then x = y.'),
        hint: [
          T('pred 的定义分别取 a 和 b。', 'Take a, and then b, in pred’s definition.'),
          T('假设的 S a = S b 可以改写其中一句。', 'The assumed S a = S b can rewrite one of them.'),
        ],
        solution: proof({
          gx: ['allI', { x: 'a' }], gy: ['allI', { x: 'b' }, 'gx'], f: ['impI', { A: 's(a) = s(b)' }, 'gy'],
          e1: ['allE', { t: 'a' }, 'f'], e2: ['allE', { t: 'b' }, 'f'], w1: ['rewrite', { at: [0] }, 'f'], w2: ['rewrite', { at: [0] }, 'f'],
        }, ['p>e1.all', 'p>e2.all', 'f#body>w1.eq', 'e1>w1.p', 'w1>w2.eq', 'e2>w2.p', 'w2>f.body', 'f>gy.body', 'gy>gx.body', 'gx>goal'], { premises: ['p'] }),
      },
    ],
    intro: [{ t: T('同一个构造子造出的两个值相等，参数也相等：S a = S b，则 a = b。这叫<wiki-ref to="injectivity"></wiki-ref>。声明没有直接给出这条规则，要借一个函数证出来：pred 取一个数的前一个。', 'Two values made by the same constructor are equal only if their arguments are: if S a = S b, then a = b. This is <wiki-ref to="injectivity"></wiki-ref>. The declaration does not give it as a rule; it is proved with the help of a function, pred, the number before a number.') }],
    after: T('证出的一对一进了「数理规则书」。Lean 的内核里，同一件事叫 noConfusion。', 'The one-to-one proved goes into the “Rule book of numbers”. In Lean’s kernel the same fact is called noConfusion.'),
  },
  proves({
    id: 'in-cases',
    title: T('不是 0，就是后一个', 'Zero, or one after'),
    types: NAT,
    tests: [{ goal: '∀x. x = zero ∨ (∃y. x = s(y))' }],
    brief: PROVE,
    hint: [T('?t 读不出来，就留给后面的某一步去定。', 'If ?t cannot be read off, leave it for a later step to settle.')],
    intro: [{ t: T('声明给出的按情况分写成规则是 ⟦?t = 0 ⟹ ?C; ⋀x. ?t = S x ⟹ ?C⟧ ⟹ ?C：要证 ?C，两种情况各证一遍。', 'The declaration’s cases rule reads ⟦?t = 0 ⟹ ?C; ⋀x. ?t = S x ⟹ ?C⟧ ⟹ ?C: to prove ?C, prove it in each case.') }],
    solution: script(['rule', 'allI'], ['rule', 'nat.exhaust'], ['rule', 'disjI1'], 'assumption', ['rule', 'disjI2'], ['rule', 'exI'], 'assumption'),
  }),
  {
    id: 'in-zero',
    title: T('0 加在右边', 'Zero on the right'),
    fact: 'addZero',
    showcase: T('归纳规则的结论是 ∀x. ?P(x)：倒着用，?P 从目标里读出来，两条前提就是两个目标；第二个目标的已知里，正是对 x 成立的那一句', 'the induction rule concludes ∀x. ?P(x): used backwards, ?P is read off the goal, and its two premises are two goals; among the second goal’s givens is just the sentence for x'),
    tasks: [
      proves({
        step: T('算具体的数', 'The numbers'),
        types: NAT,
        defs: ['plus'],
        tests: [{ goal: 'plus(s(s(zero)), zero) = s(s(zero))' }, { goal: 'plus(s(s(s(zero))), zero) = s(s(s(zero)))' }],
        brief: PROVE,
        hint: [T('化简就够了。', 'Simp is enough.')],
        solution: script(['simp', defs(2)], ['rule', 'refl']),
      }),
      {
        kind: 'proof',
        step: T('在证明板上', 'On the proof board'),
        adds: ['natInd'],
        consts: ['zero'],
        words: TERM_WORDS,
        cases: [],
        tests: [{ premises: { d0: '∀y. plus(zero, y) = y', d1: '∀x. ∀y. plus(s(x), y) = s(plus(x, y))' }, goal: '∀x. plus(x, zero) = x' }],
        brief: T('从加法的两条定义证出：对所有 x，x + 0 = x。', 'From the two definitions of addition, prove x + 0 = x for every x.'),
        hint: [
          T('0 的情况只用第一条定义。', 'The case 0 needs only the first definition.'),
          T('从 a 到 S a：第二条定义算出 S a + 0 = S (a + 0)，框里还有一句假设。', 'From a to S a: the second definition gives S a + 0 = S (a + 0), and the box holds an assumption.'),
        ],
        intro: [{ t: T('新元件「数学归纳法」：在元件上选要证的「对所有 x」。它有两个框：第一个框证 0 的情况；第二个框里有一个数 a，假设句子对 a 成立，证它对 S a 也成立。', 'A new part, “Induction”: choose on it the “for every x” to prove. It has two boxes: the first proves the case 0; in the second there is a number a, the sentence is assumed for a and proved for S a.') }],
        solution: proof({
          n: ['natInd', { P: '∀x. plus(x, zero) = x', x: 'a' }],
          z: ['allE', { t: 'zero' }, 'n/zero'],
          s1: ['allE', { t: 'a' }, 'n/step'], s2: ['allE', { t: 'zero' }, 'n/step'], w: ['rewrite', { at: [0] }, 'n/step'],
        }, ['d0>z.all', 'z>n.zero', 'd1>s1.all', 's1>s2.all', 'n#step>w.eq', 's2>w.p', 'w>n.step', 'n>goal'], { premises: ['d0', 'd1'] }),
      },
      proves({
        step: T('对所有 x', 'For every x'),
        types: NAT,
        defs: ['plus'],
        tests: [{ goal: '∀x. plus(x, zero) = x' }],
        intro: [{ t: T('化简改不动 x + 0：不知道 x 是 0 还是 S 什么。声明给的归纳规则和两个框的元件做的是同一件事：⟦?P(0); ⋀x. ?P(x) ⟹ ?P(S x)⟧ ⟹ ∀x. ?P(x)。', 'Simp cannot change x + 0: x is not known to be 0 or S of something. The induction rule the declaration gives does what the two-box part does: ⟦?P(0); ⋀x. ?P(x) ⟹ ?P(S x)⟧ ⟹ ∀x. ?P(x).') }],
        brief: T('证明对所有 x，x + 0 = x。', 'Prove x + 0 = x for every x.'),
        hint: [
          T('归纳规则的结论是 ∀x. ?P(x)，可以倒着用。', 'The induction rule concludes ∀x. ?P(x), so it can be used backwards.'),
          T('第二个目标的已知里有一句等式。', 'The second goal has an equation among its givens.'),
        ],
        solution: byInduction('nat', ['simp', [...defs(2), 'hyp']]),
        naive: script(['simp', defs(2)], ['rule', 'refl']),
      }),
    ],
    intro: [{ t: T('加法的定义只拆左边的数。0 加在右边，具体的数好算；要对所有 x 成立，就要用声明给的最后一条规则：<wiki-ref to="induction"></wiki-ref>。', 'Addition’s definition takes apart only the number on the left. With 0 on the right, particular numbers are easy; for every x, it takes the declaration’s last rule: <wiki-ref to="induction"></wiki-ref>.') }],
    after: T('x + 0 = x 进了「数理规则书」：证出的等式既是规则，也是化简的改写规则。', 'x + 0 = x goes into the “Rule book of numbers”: an equation proved is a rule, and a rewrite rule for Simp.'),
  },

  // ---------- numbers ----------
  proves({
    id: 'in-succ',
    title: T('S 加在右边', 'S on the right'),
    fact: 'addSucc',
    types: NAT,
    defs: ['plus'],
    tests: [{ goal: '∀x. ∀y. plus(x, s(y)) = s(plus(x, y))' }],
    brief: PROVE,
    hint: [
      T('两个变量：对哪一个归纳？', 'Two variables: which one to induct on?'),
      T('归纳假设要对所有 y 成立才用得上。', 'The induction hypothesis is only of use if it holds for every y.'),
    ],
    solution: byInduction('nat', ['simp', [...defs(2), 'hyp']], ['rule', 'allI']),
    naive: script(['rule', 'allI'], ['rule', 'allI'], ['simp', [...defs(2), 'hyp']], ['rule', 'refl']),
  }),
  proves({
    id: 'in-comm',
    title: T('交换', 'Commutativity'),
    fact: 'addComm',
    types: NAT,
    defs: ['plus'],
    tests: [{ goal: '∀x. ∀y. plus(x, y) = plus(y, x)' }],
    brief: PROVE,
    hint: [
      T('对 x 归纳，看两种情况各卡在哪里。', 'Induct on x, and see where each case gets stuck.'),
      T('卡住的地方，「数理规则书」里已有证出的等式。', 'Where they get stuck, the “Rule book of numbers” already has equations proved.'),
    ],
    solution: byInduction('nat', ['rule', 'allI'], ['simp', [...defs(2), 'addZero', 'addSucc', 'hyp']]),
    naive: byInduction('nat', ['rule', 'allI'], ['simp', [...defs(2), 'hyp']]),
  }),
  proves({
    id: 'in-assoc',
    title: T('结合', 'Associativity'),
    fact: 'addAssoc',
    types: NAT,
    defs: ['plus'],
    tests: [{ goal: '∀x. ∀y. ∀z. plus(plus(x, y), z) = plus(x, plus(y, z))' }],
    brief: PROVE,
    hint: [T('加法的定义拆的是左边的数。', 'Addition’s definition takes apart the number on the left.')],
    solution: byInduction('nat', ['simp', [...defs(2), 'hyp']], { frame: 'repeat', body: [['rule', 'allI']] }),
  }),

  // ---------- lists ----------
  proves({
    id: 'in-appnil',
    title: T('接一个空列表', 'Appending nothing'),
    fact: 'appNil',
    types: LIST,
    defs: ['app', 'len'],
    tests: [{ goal: '∀xs. app(xs, nil) = xs' }],
    brief: PROVE,
    hint: [T('「数理规则书」里有 list 的归纳规则。', 'The “Rule book of numbers” has an induction rule for list.')],
    intro: [{ t: T('<level-ref to="decl-list"></level-ref>声明的 list = [] | x :: xs 也给出同样几类规则；它的归纳从 xs 走到 x :: xs。', 'The list = [] | x :: xs declared in <level-ref to="decl-list"></level-ref> gives the same kinds of rule; its induction steps from xs to x :: xs.') }],
    solution: byInduction('list', ['simp', [...defs(2), 'hyp']]),
  }),
  proves({
    id: 'in-appassoc',
    title: T('拼接也结合', 'Append associates too'),
    fact: 'appAssoc',
    types: LIST,
    defs: ['app', 'len'],
    tests: [{ goal: '∀xs. ∀ys. ∀zs. app(app(xs, ys), zs) = app(xs, app(ys, zs))' }],
    brief: PROVE,
    hint: [T('拼接的定义拆的是哪个列表？', 'Which list does append’s definition take apart?')],
    solution: byInduction('list', ['simp', [...defs(2), 'hyp']], { frame: 'repeat', body: [['rule', 'allI']] }),
  }),
  {
    id: 'in-revapp',
    title: T('倒过来拼', 'Reversing an append'),
    fact: 'revApp',
    tasks: [
      define({
        step: T('定义倒过来', 'Defining reverse'),
        fn: 'rev',
        on: 0,
        defs: ['app'],
        rows: [row('rev(nil)', 'nil'), row('rev(cons(x, xs))', 'app(rev(xs), cons(x, nil))', 'cons(x, rev(xs))', 'app(cons(x, nil), rev(xs))', 'rev(app(xs, cons(x, nil)))')],
        tests: [
          { term: 'rev(cons(ann, cons(bo, cons(cy, nil))))', value: 'cons(cy, cons(bo, cons(ann, nil)))' },
          { term: 'rev(cons(ann, nil))', value: 'cons(ann, nil)' },
        ],
        solution: ['nil', 'app(rev(xs), cons(x, nil))'],
        naive: ['nil', 'cons(x, rev(xs))'],
        brief: DEFINE,
        hint: [T('x :: xs 倒过来，x 在最后。', 'In x :: xs reversed, x comes last.')],
      }),
      proves({
        step: T('倒过来拼', 'Reversing an append'),
        types: LIST,
        defs: ['app', 'len', 'rev'],
        tests: [{ goal: '∀xs. ∀ys. rev(app(xs, ys)) = app(rev(ys), rev(xs))' }],
        brief: PROVE,
        hint: [
          T('[] 的情况要 rev ys = rev ys ++ []；另一种情况，两个 ++ 要换一种结合方式。', 'The [] case needs rev ys = rev ys ++ []; the other needs two ++ grouped the other way.'),
          T('这两件事，「数理规则书」里都有证出的等式。', 'The “Rule book of numbers” has equations proved for both.'),
        ],
        solution: byInduction('list', ['rule', 'allI'], ['simp', [...defs(2), 'def.4', 'def.5', 'appNil', 'appAssoc', 'hyp']]),
        naive: byInduction('list', ['rule', 'allI'], ['simp', [...defs(2), 'def.4', 'def.5', 'hyp']]),
      }),
    ],
    intro: [{ t: T('rev 把列表倒过来。先定义它，再看它和拼接的关系。', 'rev reverses a list. Define it first, then see how it relates to append.') }],
  },

  // ---------- why a definition must stop ----------
  proves({
    id: 'in-noteq',
    title: T('不等于自己的后一个', 'Never the one after itself'),
    fact: 'succNeq',
    types: NAT,
    tests: [{ goal: '∀x. ¬(x = s(x))' }],
    brief: PROVE,
    hint: [
      T('归纳。', 'Induction.'),
      T('两种情况要用到声明给的规则和证出的一对一。', 'The two cases need the declaration’s rules and the one-to-one proved.'),
    ],
    intro: [{ t: T('没有哪个数等于它自己的后一个：x ≠ S x。', 'No number is the one after itself: x ≠ S x.') }],
    solution: script(['rule', 'nat.induct'], ['rule', 'impI'], ['erule', 'nat.distinct1'], ['rule', 'impI'], ['erule', 'inject'], ['erule', 'mp'], 'assumption'),
  }),
  proves({
    id: 'in-loop',
    adds: ['frule'],
    title: T('停不下来的定义', 'A definition that never stops'),
    types: NAT,
    tests: [{ goal: '⊥', hyps: ['∀x. f(x) = s(f(x))'] }],
    brief: PROVE,
    hint: [
      T('「数理规则书」里有一条证出的等式和这句定义正好相冲。', 'The “Rule book of numbers” holds an equation proved that is at odds with this definition.'),
      T('两句「对所有」各取出一句具体的。', 'Take one particular sentence out of each “for all”.'),
    ],
    intro: [{ t: T('有人这样「定义」一个函数：f x = S (f x)。定义板不会收下它：要算 f 0，先得算 f 0，永远算不完。假如收下了，会怎样？', 'Someone “defines” a function like this: f x = S (f x). The definition board would not take it: working out f 0 needs f 0 first, for ever. What if it were taken?') }],
    solution: script(['rule', 'cut'], ['rule', 'succNeq'], ['frule', 'spec'], ['frule', 'spec'], ['erule', 'mp'], 'assumption'),
    after: T('Isabelle 的 fun、Lean 的 def 收下递归定义之前，都要先证明它终止。', 'Isabelle’s fun and Lean’s def both accept a recursive definition only once it is proved to terminate.'),
  }),

  // ---------- practice ----------
  proves({
    id: 'in-len',
    title: T('长度相加', 'Lengths add up'),
    types: LIST,
    defs: ['app', 'len', 'plus'],
    tests: [{ goal: '∀xs. ∀ys. len(app(xs, ys)) = plus(len(xs), len(ys))' }],
    brief: PROVE,
    hint: [T('列表的定义和加法的定义都要用。', 'Both the list definitions and addition’s are needed.')],
    solution: byInduction('list', ['rule', 'allI'], ['simp', [...defs(6), 'hyp']]),
  }),
  proves({
    id: 'in-revrev',
    title: T('倒两次', 'Reversed twice'),
    types: LIST,
    defs: ['app', 'len', 'rev'],
    tests: [{ goal: '∀xs. rev(rev(xs)) = xs' }],
    brief: PROVE,
    hint: [T('化简卡在 rev (rev xs ++ [x]) 上。', 'Simp gets stuck on rev (rev xs ++ [x]).')],
    solution: byInduction('list', ['simp', [...defs(2), 'def.4', 'def.5', 'revApp', 'hyp']]),
    naive: byInduction('list', ['simp', [...defs(2), 'def.4', 'def.5', 'hyp']]),
    after: T('这是 Isabelle 教程里的第一个定理。', 'This is the first theorem of the Isabelle tutorial.'),
  }),
  {
    id: 'in-itsum',
    title: T('累加器求和', 'Summing with an accumulator'),
    tasks: [
      define({
        step: T('求和', 'Sum'),
        fn: 'sum',
        on: 0,
        defs: ['plus'],
        rows: [row('sum(nil)', 'zero', 's(zero)'), row('sum(cons(x, xs))', 'plus(x, sum(xs))', 'sum(xs)', 'plus(x, sum(cons(x, xs)))')],
        tests: [{ term: 'sum(cons(s(zero), cons(s(s(zero)), nil)))', value: 's(s(s(zero)))' }, { term: 'sum(nil)', value: 'zero' }],
        solution: ['zero', 'plus(x, sum(xs))'],
        naive: ['zero', 'sum(xs)'],
        brief: DEFINE,
        hint: [T('x :: xs 的和里有 x。', 'The sum of x :: xs includes x.')],
        intro: [{ t: T('sum 从后往前加。', 'sum adds from the back.') }],
      }),
      define({
        step: T('累加器', 'The accumulator'),
        fn: 'itsum',
        on: 0,
        defs: ['plus'],
        rows: [row('itsum(nil, y)', 'y', 'zero'), row('itsum(cons(x, xs), y)', 'itsum(xs, plus(y, x))', 'itsum(xs, y)', 'itsum(cons(x, xs), plus(y, x))')],
        tests: [{ term: 'itsum(cons(s(zero), cons(s(s(zero)), nil)), zero)', value: 's(s(s(zero)))' }, { term: 'itsum(nil, s(zero))', value: 's(zero)' }],
        solution: ['y', 'itsum(xs, plus(y, x))'],
        naive: ['zero', 'itsum(xs, plus(y, x))'],
        brief: DEFINE,
        hint: [T('走到头时，y 里已经是加好的和。', 'At the end, y already holds the sum.')],
        intro: [{ t: T('itsum 一边往后走，一边把元素加到 y 上，走到头 y 就是和。程序员把这种写法叫作尾递归。', 'itsum walks along adding each element onto y, and at the end y is the sum. Programmers call this tail recursion.') }],
      }),
      proves({
        step: T('一样吗', 'The same?'),
        types: LIST,
        defs: ['plus', 'sum', 'itsum'],
        tests: [{ goal: '∀xs. ∀y. itsum(xs, y) = plus(y, sum(xs))' }],
        brief: PROVE,
        hint: [
          T('每往后走一步，y 都在变。', 'y changes at each step along.'),
          T('[] 的情况要 y + 0 = y；另一种情况，两个 + 要换一种结合方式。', 'The [] case needs y + 0 = y; the other needs two + grouped the other way.'),
        ],
        solution: byInduction('list', ['rule', 'allI'], ['simp', [...defs(6), 'addZero', 'addAssoc', 'hyp']]),
        naive: byInduction('list', ['rule', 'allI'], ['simp', [...defs(6), 'hyp']]),
      }),
    ],
    intro: [{ t: T('两种求和：一种从后往前加，一种带着累加器往后走。两者是否相同？', 'Two sums: one adding from the back, one walking along with an accumulator. Are they the same?') }],
  },

  // ---------- topic: insertion sort ----------
  {
    id: 'sort-ins',
    title: T('插进去', 'Inserting'),
    tasks: [
      define({
        step: T('如果', 'If'),
        fn: 'if',
        on: 0,
        rows: [row('if(tt, v, w)', 'v', 'w'), row('if(ff, v, w)', 'w', 'v')],
        tests: [{ term: 'if(tt, zero, s(zero))', value: 'zero' }, { term: 'if(ff, zero, s(zero))', value: 's(zero)' }],
        solution: ['v', 'w'],
        naive: ['v', 'v'],
        brief: DEFINE,
        hint: [T('if c then v else w：c 为真取 v，为假取 w。', 'if c then v else w: v when c is true, w when it is false.')],
        intro: [{ t: T('程序里的「如果」也是函数：按条件的真假，各写一行。', 'A program’s “if” is a function too: one row for each truth value of its condition.') }],
      }),
      define({
        step: T('插进去', 'Insert'),
        fn: 'ins',
        on: 1,
        defs: ['le', 'if'],
        rows: [
          row('ins(x, nil)', 'cons(x, nil)', 'nil'),
          row('ins(x, cons(y, ys))', 'if(le(x, y), cons(x, cons(y, ys)), cons(y, ins(x, ys)))', 'if(le(x, y), cons(y, ins(x, ys)), cons(x, cons(y, ys)))', 'cons(x, cons(y, ys))'),
        ],
        tests: [
          { term: 'ins(s(zero), cons(zero, cons(s(s(zero)), nil)))', value: 'cons(zero, cons(s(zero), cons(s(s(zero)), nil)))' },
          { term: 'ins(zero, cons(s(zero), nil))', value: 'cons(zero, cons(s(zero), nil))' },
          { term: 'ins(s(s(zero)), cons(zero, nil))', value: 'cons(zero, cons(s(s(zero)), nil))' },
        ],
        solution: ['cons(x, nil)', 'if(le(x, y), cons(x, cons(y, ys)), cons(y, ins(x, ys)))'],
        naive: ['cons(x, nil)', 'cons(x, cons(y, ys))'],
        brief: DEFINE,
        hint: [T('拿 x 和列表的第一个 y 比。', 'Compare x with the first of the list, y.')],
        intro: [{ t: T('ins 把一个数插进排好的列表，拆开的是第二个参数。', 'ins puts a number into a sorted list; it takes apart its second argument.') }],
      }),
      define({
        step: T('排序', 'Sort'),
        fn: 'sort',
        on: 0,
        defs: ['le', 'if', 'ins'],
        rows: [row('sort(nil)', 'nil'), row('sort(cons(x, xs))', 'ins(x, sort(xs))', 'cons(x, sort(xs))', 'ins(x, xs)')],
        tests: [
          { term: 'sort(cons(s(s(zero)), cons(zero, cons(s(zero), nil))))', value: 'cons(zero, cons(s(zero), cons(s(s(zero)), nil)))' },
          { term: 'sort(cons(s(zero), cons(s(zero), cons(zero, nil))))', value: 'cons(zero, cons(s(zero), cons(s(zero), nil)))' },
        ],
        solution: ['nil', 'ins(x, sort(xs))'],
        naive: ['nil', 'ins(x, xs)'],
        brief: DEFINE,
        hint: [T('ins 要的是一个排好的列表。', 'ins wants a sorted list.')],
      }),
      proves({
        step: T('算几个例子', 'A few examples'),
        types: LIST,
        defs: SORT,
        tests: [
          { goal: 'ins(s(zero), cons(zero, cons(s(s(zero)), nil))) = cons(zero, cons(s(zero), cons(s(s(zero)), nil)))' },
          { goal: 'ins(zero, cons(s(zero), nil)) = cons(zero, cons(s(zero), nil))' },
          { goal: 'ins(s(s(zero)), cons(zero, nil)) = cons(zero, cons(s(s(zero)), nil))' },
        ],
        brief: PROVE,
        hint: [T('比大小、「如果」和插入的定义都要用。', 'The definitions of comparison, if and insert are all needed.')],
        solution: script(['simp', defs(9)], ['rule', 'refl']),
      }),
    ],
    intro: [{ t: T('排序是程序，程序也能用等式定义。插入排序把元素一个个插进排好的列表。', 'Sorting is a program, and a program can be defined by equations. Insertion sort puts the elements one by one into a sorted list.') }],
    after: T('定义函数就是写程序，化简就是运行程序。', 'Defining a function is writing a program; Simp runs it.'),
  },
  proves({
    id: 'sort-run',
    title: T('排一排', 'Sorting'),
    types: LIST,
    defs: SORT,
    tests: [
      { goal: 'sort(cons(s(s(zero)), cons(zero, cons(s(zero), nil)))) = cons(zero, cons(s(zero), cons(s(s(zero)), nil)))' },
      { goal: 'sort(cons(s(zero), cons(s(zero), cons(zero, nil)))) = cons(zero, cons(s(zero), cons(s(zero), nil)))' },
    ],
    brief: PROVE,
    hint: [T('还是化简。', 'Simp again.')],
    intro: [{ t: T('交给化简运行<level-ref to="sort-ins"></level-ref>定义的 sort。', 'Run the sort defined in <level-ref to="sort-ins"></level-ref> with Simp.') }],
    solution: script(['simp', defs(11)], ['rule', 'refl']),
    after: T('测试只说明这几个例子排对了；要说每个列表都排得对，需要证明。', 'Tests show only that these examples come out right; to say every list does takes a proof.'),
  }),
  {
    id: 'sort-if',
    title: T('如果就分情况', 'An if is a case split'),
    tasks: [
      proves({
        step: T('条件为真', 'A true condition'),
        fact: 'ifTrue',
        types: ['bool'],
        defs: ['if'],
        tests: [{ goal: '∀u. ∀v. ∀w. u = tt → if(u, v, w) = v' }],
        brief: PROVE,
        hint: [
          T('u = 真 要先进已知。', 'u = true has to be among the givens first.'),
          T('已知里的等式能把 u 换掉。', 'The equation given can replace u.'),
        ],
        solution: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['rule', 'impI'], ['simp', ['def.0', 'def.1', 'hyp']], ['rule', 'refl']),
        naive: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['rule', 'impI'], ['simp', ['def.0', 'def.1']], ['rule', 'refl']),
      }),
      proves({
        step: T('条件为假', 'A false condition'),
        fact: 'ifFalse',
        types: ['bool'],
        defs: ['if'],
        tests: [{ goal: '∀u. ∀v. ∀w. u = ff → if(u, v, w) = w' }],
        brief: PROVE,
        hint: [T('与条件为真时相同。', 'As with a true condition.')],
        solution: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['rule', 'impI'], ['simp', ['def.0', 'def.1', 'hyp']], ['rule', 'refl']),
      }),
    ],
    intro: [{ t: T('if 的定义只认写明的真、假。条件是 c ≤ a 这样的式子时，化简不知道它的真假，就会卡住。从定义证出两条带条件的规则：条件等于真，取「则」那一边；等于假，取「否则」那一边。', 'if’s definition knows only a true or false written out. When the condition is something like c ≤ a, Simp cannot tell which it is, and gets stuck. From the definition, prove two rules with a condition: when the condition equals true, take the “then” side; when false, the “else” side.') }],
    after: T('两条规则进了「数理规则书」。', 'The two rules go into the “Rule book of numbers”.'),
  },
  proves({
    id: 'sort-insLen',
    title: T('插一个，长一格', 'One in, one longer'),
    fact: 'insLen',
    types: [...LIST, 'bool'],
    defs: SORT,
    tests: [{ goal: '∀xs. ∀x. len(ins(x, xs)) = s(len(xs))' }],
    brief: PROVE,
    hint: [
      T('化简以后，第二个目标卡在「若 c ≤ a 则…否则…」上：化简不知道谁大。', 'After Simp, the second goal is stuck on an “if c ≤ a then … else …”: Simp does not know which is bigger.'),
      T('<level-ref to="decl-bool"></level-ref>声明的 bool 有按情况分的规则；<level-ref to="sort-if"></level-ref>证出的规则各管一种情况。', 'The bool declared in <level-ref to="decl-bool"></level-ref> has a cases rule; the rules proved in <level-ref to="sort-if"></level-ref> each cover one case.'),
      T('带条件的规则改写以后，条件排在后面，?t 还没定。', 'After a rewrite with a condition, the condition waits behind, with ?t not yet settled.'),
    ],
    intro: [{ t: T('插进一个元素，列表就长一格。', 'Insert an element and the list is one longer.') }],
    solution: script(
      ['rule', 'list.induct'],
      ['simp', defs(11)], ['rule', 'allI'], ['rule', 'refl'],
      ['rule', 'allI'], ['simp', defs(11)], ['rule', 'bool.exhaust'],
      ['rw', 'ifTrue'], ['simp', defs(11)], ['rule', 'refl'], 'assumption',
      ['rw', 'ifFalse'], ['simp', [...defs(11), 'hyp']], ['rule', 'refl'], 'assumption',
    ),
  }),
  proves({
    id: 'sort-len',
    title: T('一个都不少', 'None lost'),
    types: LIST,
    defs: SORT,
    tests: [{ goal: '∀xs. len(sort(xs)) = len(xs)' }],
    brief: PROVE,
    hint: [T('化简卡在 len (ins x …) 上。', 'Simp gets stuck on len (ins x …).')],
    intro: [{ t: T('排序前后，列表一样长。', 'A list is as long after sorting as before.') }],
    solution: byInduction('list', ['simp', [...defs(11), 'insLen', 'hyp']]),
    naive: byInduction('list', ['simp', [...defs(11), 'hyp']]),
    after: T('程序和它的性质写在同一个系统里，一并证明：这叫<b>程序验证</b>。', 'A program and its properties, written and proved in one system: this is <b>program verification</b>.'),
  }),

  // ---------- topic: true, yet unprovable ----------
  // Gödel's argument in six steps, each with this chapter's tools where it can be: sentences become codes (Simp
  // works them out), proofs become trees whose checking is a computation (so "provable" is "some proof checks"), the
  // diagonal is a computation that hands a sentence its own code, and then three proofs on the board: true yet
  // unprovable, consistency is enough, and no consistent prover proves itself consistent. What stays given is said to
  // be given: that Prov can be written in arithmetic, and the conditions provability meets.
  proves({
    id: 'gd-code',
    title: T('句子变成数', 'Sentences become numbers'),
    words: GOEDEL_TERMS,
    stated: ['code(rain) = cons(one, nil)', 'code(wet) = cons(two, nil)', 'code(neg(x)) = cons(three, code(x))', 'code(imp(x, y)) = cons(four, app(code(x), code(y)))', 'app(nil, ys) = ys', 'app(cons(x, xs), ys) = cons(x, app(xs, ys))'],
    tests: [
      { goal: 'code(neg(rain)) = cons(three, cons(one, nil))' },
      { goal: 'code(imp(rain, wet)) = cons(four, cons(one, cons(two, nil)))' },
      { goal: 'code(neg(imp(rain, neg(wet)))) = cons(three, cons(four, cons(one, cons(three, cons(two, nil)))))' },
    ],
    brief: PROVE,
    hint: [T('六条定义都要用。', 'All six definitions are needed.')],
    intro: [
      { t: T('<level-ref to="u-halt"></level-ref>里，程序可以读程序。这几关讲另一件事：算术可以谈论证明。哥德尔在 1931 年分六步做到这一点；前三步用化简算，后三步在证明板上证。', 'In <level-ref to="u-halt"></level-ref>, programs read programs. These levels show something else: arithmetic can speak of proofs. Gödel did it in 1931 in six steps; the first three are worked out with Simp, the last three proved on the board.') },
      { t: T('第一步是<wiki-ref to="goedel-coding"></wiki-ref>：每个符号对应一个数，下雨是 1，地湿是 2，¬ 是 3，→ 是 4。一句话从左往右写成一串数，→ 写在两边之前，不需要括号。⌜A⌝ 是句子 A 的编码，由四条定义算出。', 'The first step is <wiki-ref to="goedel-coding"></wiki-ref>: each symbol stands for a number, it rains 1, the ground is wet 2, ¬ 3, → 4. A sentence is written left to right as a list of numbers, with → in front of its two sides, so no brackets are needed. ⌜A⌝ is the code of the sentence A, worked out by four definitions.') },
    ],
    solution: script(['simp', defs(6)], ['rule', 'refl']),
    after: T('一串数还能并成一个数（哥德尔把每一位放进一个质数的指数：2^a·3^b·5^c…）。关于句子的事，于是成了关于数的事。', 'A list of numbers can be packed into one number (Gödel put each place in the exponent of a prime: 2^a·3^b·5^c …). Facts about sentences thus become facts about numbers.'),
  }),
  proves({
    id: 'gd-check',
    title: T('检查证明是一次计算', 'Checking a proof is a computation'),
    words: GOEDEL_TERMS,
    stated: [
      'concl(ax(x)) = x', 'concl(use(x, y)) = then(concl(x), concl(y))', 'then(imp(x, y), x) = y',
      'ok(ax(x)) = isax(x)', 'ok(use(x, y)) = both(both(ok(x), ok(y)), fits(concl(x), concl(y)))', 'fits(imp(x, y), x) = tt', 'both(tt, x) = x',
      'isax(rain) = tt', 'isax(imp(rain, wet)) = tt', 'isax(imp(wet, slip)) = tt',
    ],
    tests: [
      { goal: 'ok(use(ax(imp(rain, wet)), ax(rain))) = tt' },
      { goal: 'concl(use(ax(imp(rain, wet)), ax(rain))) = wet' },
      { goal: 'ok(use(ax(imp(wet, slip)), use(ax(imp(rain, wet)), ax(rain)))) = tt' },
      { goal: 'concl(use(ax(imp(wet, slip)), use(ax(imp(rain, wet)), ax(rain)))) = slip' },
    ],
    brief: PROVE,
    hint: [T('十条定义都要用。', 'All ten definitions are needed.')],
    intro: [{ t: T('第二步：证明也写成数。证明是一棵树，叶子是公理，每个分叉是一次套用，和证明板上接的一样；树也能编成数。检查一个证明只看两件事：每片叶子都在公理表里，每次套用都对得上（「若 A 则 B」接上的正是 A）。公理表里有：下雨、下雨 → 地湿、地湿 → 路滑。', 'The second step: proofs become numbers too. A proof is a tree whose leaves are axioms and whose forks are each an Apply, as wired on the board; a tree can be coded as a number. Checking a proof looks at two things: every leaf is in the table of axioms, and every Apply fits (the “if A then B” meets just A). The table holds: it rains, it rains → the ground is wet, the ground is wet → the road is slippery.') }],
    solution: script(['simp', defs(10)], ['rule', 'refl']),
    after: T('「A 证得出」于是成了一句关于数的话：有一个数，是通过检查、结论为 A 的证明。记作 Prov(⌜A⌝)。', '“A can be proved” thus becomes a sentence about numbers: some number is a proof that passes the check and concludes A. It is written Prov(⌜A⌝).'),
  }),
  proves({
    id: 'gd-diag',
    title: T('对角线是一次计算', 'The diagonal is a computation'),
    words: GOEDEL_TERMS,
    stated: [
      'diag(x) = sub(x, qt(x))', 'sub(nprov(x), y) = nprov(subt(x, y))', 'subt(vx, y) = y', 'subt(dg(x), y) = dg(subt(x, y))', 'subt(qt(x), y) = qt(x)',
      'val(qt(x)) = x', 'val(dg(x)) = diag(val(x))',
    ],
    tests: [
      { goal: 'diag(nprov(dg(vx))) = nprov(dg(qt(nprov(dg(vx)))))' },
      { goal: 'val(dg(qt(nprov(dg(vx))))) = nprov(dg(qt(nprov(dg(vx)))))' },
    ],
    brief: PROVE,
    hint: [T('七条定义都要用。', 'All seven definitions are needed.')],
    intro: [
      { t: T('第三步要造一句说「我证不出」的话。难处在于一句话写不进自己的编码：编码比句子长。哥德尔的办法是<wiki-ref to="diagonal"></wiki-ref>：先写一句带空位 □ 的话 D：「对角 □ 证不出」。取对角是一次计算：把一句带空位的话自己的编码 ⌜…⌝ 填进它的空位。', 'The third step makes a sentence that says “I cannot be proved”. The trouble is that a sentence cannot hold its own code: the code is longer than the sentence. Gödel’s way is the <wiki-ref to="diagonal"></wiki-ref>: first write a sentence D with a gap □, “the diagonal of □ cannot be proved”. Taking the diagonal is a computation: put a sentence’s own code ⌜…⌝ into its gap.') },
      { t: T('G 是 D 的对角。第一个目标算出 G；第二个目标算出 G 说到的那句话（对角 ⌜D⌝ 的值）。', 'G is the diagonal of D. The first goal works out G; the second works out the sentence G speaks of (the value of the diagonal of ⌜D⌝).') },
    ],
    solution: script(['simp', defs(7)], ['rule', 'refl']),
    after: T('这就是<b>对角线引理</b>：对任何说法 P(□)，都有一句 G 和 P(⌜G⌝) 等价。', 'This is the <b>diagonal lemma</b>: for any property P(□) there is a sentence G equivalent to P(⌜G⌝).'),
  }),
  {
    id: 'gd-true',
    kind: 'proof',
    title: T('我证不出', 'I cannot be proved'),
    consts: ['g', 'd'],
    words: GOEDEL,
    cases: [],
    tests: [{ premises: { diag: 'G ↔ ¬Prov(diag(d))', calc: 'diag(d) = g', sound: 'Prov(g) → G' }, goal: 'G ∧ ¬Prov(g)' }],
    brief: T('从这三句已知证出：G 成立，而且 G 证不出。', 'From these three givens, prove: G holds, and G cannot be proved.'),
    hint: [
      T('头两句合起来，说的是 G 和「⌜G⌝ 证不出」的关系。', 'The first two givens together relate G to “⌜G⌝ cannot be proved”.'),
      T('先证 G 证不出；G 成立随后就有。', 'Prove first that G cannot be proved; that G holds follows.'),
    ],
    intro: [
      { t: T('第四步。头两句已知来自<level-ref to="gd-diag"></level-ref>：G 说「对角 ⌜D⌝ 证不出」，而对角 ⌜D⌝ 算出来是 ⌜G⌝。Prov 来自<level-ref to="gd-check"></level-ref>：有一个通过检查的证明。真正的定理里，Prov 要用加法和乘法写成一句算术的话，这一步很长，这里当作已知。第三句是<b>可靠</b>：证得出的都是真的（这里只对 G 用到）。', 'The fourth step. The first two givens come from <level-ref to="gd-diag"></level-ref>: G says “the diagonal of ⌜D⌝ cannot be proved”, and the diagonal of ⌜D⌝ works out to ⌜G⌝. Prov comes from <level-ref to="gd-check"></level-ref>: there is a proof that passes the check. In the real theorem Prov must be written as a sentence of arithmetic, with addition and multiplication; that long step is taken as given here. The third given is <b>soundness</b>: what can be proved is true (used here for G alone).') },
    ],
    solution: proof({
      w: ['rewrite', { at: [0] }], e: ['andE'], f: ['impI', { A: 'Prov(g)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], m3: ['mp', {}, 'f'], m4: ['mp'], j: ['andI'],
    }, ['calc>w.eq', 'diag>w.p', 'w>e.ab', 'sound>m1.imp', 'f#body>m1.a', 'e#left>m2.imp', 'm1>m2.a', 'm2>m3.imp', 'f#body>m3.a', 'm3>f.body', 'e#right>m4.imp', 'f>m4.a', 'm4>j.a', 'f>j.b', 'j>goal'], { premises: ['diag', 'calc', 'sound'] }),
    after: T('这是哥德尔第一<wiki-ref to="incompleteness"></wiki-ref>的核心。<level-ref to="kk-one"></level-ref>的说谎者谈真假，推出矛盾；G 谈证不证得出，得到的是一句证不出的真话。', 'This is the heart of Gödel’s first <wiki-ref to="incompleteness"></wiki-ref>. The liar of <level-ref to="kk-one"></level-ref> speaks of truth and yields a contradiction; G speaks of proof and yields a truth that cannot be proved.'),
  },
  {
    id: 'gd-con',
    kind: 'proof',
    title: T('只要不矛盾', 'Consistency is enough'),
    consts: ['g', 'gn', 'gp'],
    words: GOEDEL,
    cases: [],
    tests: [{ premises: { d: 'Prov(g) → Prov(gn)', r: 'Prov(g) → Prov(gp)', con: '¬(Prov(gn) ∧ Prov(gp))' }, goal: '¬Prov(g)' }],
    brief: T('从这三句已知证出：G 证不出。', 'From these three givens, prove: G cannot be proved.'),
    hint: [T('假设 G 证得出。', 'Assume G can be proved.')],
    intro: [
      { t: T('第五步。<level-ref to="gd-true"></level-ref>用了可靠，这个条件太强：证明器说不出「我证得出的都是真的」。只要<wiki-ref to="consistency"></wiki-ref>就够：没有哪句话和它的否定都证得出。', 'The fifth step. <level-ref to="gd-true"></level-ref> used soundness, which is too strong: a prover cannot say of itself that what it proves is true. <wiki-ref to="consistency"></wiki-ref> is enough: no sentence is provable together with its negation.') },
      { t: T('头两句已知讲证明器自己能做的事。第一句：对角线（<level-ref to="gd-diag"></level-ref>）只是一次计算，证明器自己也算得出 G ↔ G 证不出，所以 G 证得出，「G 证不出」也证得出。第二句：检查证明只是一次计算（<level-ref to="gd-check"></level-ref>），G 若有证明，证明器检查那个数，就证得出「⌜G⌝ 证得出」。第三句是不矛盾：「G 证不出」和「⌜G⌝ 证得出」互为否定，不能都证得出。', 'The first two givens are about what the prover itself can do. The first: the diagonal (<level-ref to="gd-diag"></level-ref>) is only a computation, so the prover too works out that G ↔ G cannot be proved; if G can be proved, so can “G cannot be proved”. The second: checking a proof is only a computation (<level-ref to="gd-check"></level-ref>), so if G has a proof, the prover checks that number and proves “⌜G⌝ is provable”. The third is consistency: “G cannot be proved” and “⌜G⌝ is provable” negate each other, and cannot both be provable.') },
    ],
    solution: proof({ f: ['impI', { A: 'Prov(g)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], j: ['andI', {}, 'f'], m3: ['mp', {}, 'f'] }, ['d>m1.imp', 'f#body>m1.a', 'r>m2.imp', 'f#body>m2.a', 'm1>j.a', 'm2>j.b', 'con>m3.imp', 'j>m3.a', 'm3>f.body', 'f>goal'], { premises: ['d', 'r', 'con'] }),
    after: T('这就是第一不完备性定理：一个不矛盾、规则能逐条列出、又能做加法和乘法的证明器，总有一句真话证不出。要连 ¬G 也证不出，哥德尔还需要更强的条件；罗瑟在 1936 年换了一句话，只用不矛盾就够了。', 'That is the first incompleteness theorem: a consistent prover whose rules can be listed one by one and which can do addition and multiplication has a true sentence it cannot prove. To show ¬G cannot be proved either, Gödel needed a stronger condition; Rosser, in 1936, changed the sentence so that consistency alone is enough.'),
  },
  {
    id: 'gd-second',
    kind: 'proof',
    title: T('证不了自己不矛盾', 'It cannot prove itself consistent'),
    consts: ['g', 'gn', 'cs'],
    words: GOEDEL,
    cases: [],
    tests: [{ premises: { f1: 'Prov(cs) → Prov(gn)', f2: 'Prov(gn) → Prov(g)', first: '¬Prov(g)' }, goal: '¬Prov(cs)' }],
    brief: T('从这三句已知证出：「证明器不矛盾」证不出。', 'From these three givens, prove: “the prover is consistent” cannot be proved.'),
    hint: [T('假设它证得出。', 'Assume it can be proved.')],
    intro: [{ t: T('最后一步。⌜不矛盾⌝ 是一句算术的话：「没有哪句话和它的否定都证得出」。头两句已知仍是证明器自己能做的事。第一句：<level-ref to="gd-con"></level-ref>的整个推理，证明器自己也做得出（它证得出「若不矛盾，则 G 证不出」），所以证得出不矛盾，就证得出「G 证不出」。第二句：它证得出「G 证不出，则 G」（对角线），所以证得出「G 证不出」，就证得出 G。第三句是<level-ref to=\"gd-con\"></level-ref>的结论。', 'The last step. ⌜consistent⌝ is a sentence of arithmetic: “no sentence is provable together with its negation”. The first two givens are again what the prover itself can do. The first: the prover can carry out the whole argument of <level-ref to="gd-con"></level-ref> (it proves “if consistent, then G cannot be proved”), so proving consistency would prove “G cannot be proved”. The second: it proves “if G cannot be proved, then G” (the diagonal), so proving “G cannot be proved” would prove G. The third is what <level-ref to=\"gd-con\"></level-ref> proved.') }],
    solution: proof({ f: ['impI', { A: 'Prov(cs)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], m3: ['mp', {}, 'f'] }, ['f1>m1.imp', 'f#body>m1.a', 'f2>m2.imp', 'm1>m2.a', 'first>m3.imp', 'm2>m3.a', 'm3>f.body', 'f>goal'], { premises: ['f1', 'f2', 'first'] }),
    after: T('这是第二不完备性定理，它让希尔伯特「用有限的方法证明数学不矛盾」的计划落了空。所以 Lean、Isabelle 这样的证明助手不去证自己可靠，而是把要信任的东西压到最小：一个很小的核和几条公理。', 'This is the second incompleteness theorem, which ended Hilbert’s programme of proving mathematics consistent by finite means. So proof assistants such as Lean and Isabelle do not prove themselves sound; they keep what must be trusted as small as can be: a little kernel and a few axioms.'),
  },

  // ---------- challenge ----------
  proves({
    id: 'in-circle',
    title: T('会绕圈的化简', 'Simp going round in circles'),
    types: NAT,
    defs: ['plus'],
    tests: [{ goal: '∀x. ∀y. plus(x, s(y)) = s(plus(y, x))' }, { goal: '∀x. ∀y. plus(s(x), y) = plus(y, s(x))' }, { goal: '∀x. plus(x, s(zero)) = s(x)' }],
    brief: PROVE,
    hint: [
      T('交换律交给化简，会把 x + y 改成 y + x，再改回来……', 'Commutativity in Simp turns x + y into y + x and back again …'),
      T('化简以后，有的目标两边已经一样，有的只差一处交换。', 'After Simp, some goals have both sides the same already, others differ by one swap.'),
    ],
    intro: [{ t: T('这几句都要用到交换律。', 'Each of these needs commutativity.') }],
    solution: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['simp', [...defs(2), 'addZero', 'addSucc']], { ways: [[['rule', 'refl']], [['rw', 'addComm'], ['rule', 'refl']]] }),
    naive: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['simp', [...defs(2), 'addZero', 'addSucc', 'addComm']], ['rule', 'refl']),
    after: T('Isabelle 给式子定一个固定的次序，只往「更小」的方向改写，这叫<wiki-ref to="ordered"></wiki-ref>。', 'Isabelle fixes an order on expressions and rewrites only towards the smaller, which is called <wiki-ref to="ordered"></wiki-ref>.'),
  }),
]
