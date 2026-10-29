// Chapter 12 · Numbers and lists: a sum worked out by hand on the proof board (the definitions as givens, Take one
// and Rewrite), then by simp with the definitions as rewrite rules: lists, rules with conditions, a given, under ∀.
// Then numbers and lists are declared (nat = 0 | S nat), and a declaration gives rules (kit/domains/logic/datatype.js)
// used with the rule cards like any other: the constructors are all different, each is one-to-one, every value is
// made by one of them, and induction, done first by hand with the two-box Induction part, then by the rule on the
// machine. Then three lines that need nothing from each other: numbers (S on the right, commutativity, associativity),
// lists (append nil, append associates, reverse of an append) and why a definition must stop (x ≠ S x; a definition
// that never stops proves ⊥). Each equation proved is a rule and a rewrite rule from then on (the course's facts).
// Practice puts both together. Topics: insertion sort; and, after the halting problem, incompleteness (a sentence
// that says it cannot be proved: true, yet unprovable; consistency is enough; no consistent prover proves itself
// consistent), on the proof board with the coding and the diagonal given. The challenge is commutativity, which simp
// would turn back and forth for ever.
import { proof } from '../../kit/domains/logic/build.js'
import { flow, script } from './machines.js'
import { TERM_WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const proves = (level) => ({ kind: 'machine', want: 'proved', inputs: GOAL, backtrack: true, words: TERM_WORDS, ...level })
const PROVE = T('设计一个证明助手，证完每一个目标。', 'Design a proof assistant that proves every goal.')

const NAT_T = { nat: 'zero | s(nat)' }
const LIST_T = { list: 'nil | cons(elem, list)' }
const NAT = ['plus(zero, y) = y', 'plus(s(x), y) = s(plus(x, y))']
const MAX = ['le(zero, y) = tt', 'le(s(x), zero) = ff', 'le(s(x), s(y)) = le(x, y)', 'le(x, y) = tt ⟹ max(x, y) = y', 'le(x, y) = ff ⟹ max(x, y) = x']
const LIST = ['app(nil, ys) = ys', 'app(cons(x, xs), ys) = cons(x, app(xs, ys))', 'len(nil) = zero', 'len(cons(x, xs)) = s(len(xs))']
const REV = [...LIST, 'rev(nil) = nil', 'rev(cons(x, xs)) = app(rev(xs), cons(x, nil))']
const SUM = [...NAT, 'sum(nil) = zero', 'sum(cons(x, xs)) = plus(x, sum(xs))', 'itsum(nil, y) = y', 'itsum(cons(x, xs), y) = itsum(xs, plus(y, x))']
// Insertion sort, and two rules for if with a condition (each follows from if's definition, by cases on the condition).
const SORT = [
  'le(zero, y) = tt', 'le(s(x), zero) = ff', 'le(s(x), s(y)) = le(x, y)', 'if(tt, u, v) = u', 'if(ff, u, v) = v',
  'ins(x, nil) = cons(x, nil)', 'ins(x, cons(y, ys)) = if(le(x, y), cons(x, cons(y, ys)), cons(y, ins(x, ys)))',
  'sort(nil) = nil', 'sort(cons(x, xs)) = ins(x, sort(xs))', 'len(nil) = zero', 'len(cons(x, xs)) = s(len(xs))',
  'u = tt ⟹ if(u, v, w) = v', 'u = ff ⟹ if(u, v, w) = w',
]
// The incompleteness topic: G, provability of a sentence's code, and the codes it needs.
const GOEDEL = { G: T('G', 'G'), Prov: T('{0} 证得出', '{0} is provable'), g: T('⌜G⌝', '⌜G⌝'), gn: T('⌜G 证不出⌝', '⌜G is not provable⌝'), gp: T('⌜⌜G⌝ 证得出⌝', '⌜⌜G⌝ is provable⌝'), cs: T('⌜不矛盾⌝', '⌜consistent⌝') }
const defs = (n, from = 0) => Array.from({ length: n }, (_, k) => `def.${from + k}`)
// Induction, then each goal: the cards given, then both sides the same.
const byInduction = (type, ...body) => flow(['rule', `${type}.induct`], { frame: 'each', body: [...body, ['rule', 'refl']] })

export const inductive = [
  // ---------- by hand ----------
  {
    id: 'nl-plus',
    kind: 'proof',
    title: T('手算 1 + 1', 'One plus one by hand'),
    consts: ['zero'],
    words: TERM_WORDS,
    cases: [],
    tests: [{ premises: { d0: '∀y. plus(zero, y) = y', d1: '∀x. ∀y. plus(s(x), y) = s(plus(x, y))' }, goal: 'plus(s(zero), s(zero)) = s(s(zero))' }],
    brief: T('从加法的两条定义证明出 1 + 1 = 2。', 'From the two definitions of addition, prove 1 + 1 = 2.'),
    hint: [
      T('先用取一个，把定义里的 x、y 换成具体的数。', 'First Take one, putting particular numbers in for the x and y of a definition.'),
      T('第二条定义算出 S (0 + S 0)；再用第一条算出 0 + S 0，用等量代换把它换进去。', 'The second definition gives S (0 + S 0); the first works out 0 + S 0, and Rewrite puts it in.'),
    ],
    intro: [
      { t: T('自动证明器在一堆句子里找矛盾，却多半不会归纳：「对每一个数都成立」，它找不出证明。这一章让证明器认识数和列表：它们怎么算，从哪里来，对每一个都成立的事怎么证。', 'An automatic prover looks for a contradiction among a heap of sentences, but mostly cannot do induction: “for every number”, it finds no proof of. This chapter teaches the prover numbers and lists: how they are worked out, where they come from, and how something is proved for every one.') },
      { t: T('「一加一等于二」怎么证？数可以这样搭出来：0，S 0（0 后面那个数），S S 0……加法用两个等式定义：0 + y = y，S x + y = S (x + y)。在证明板上，这两条定义就是两句已知。', 'How is “one plus one is two” proved? Numbers can be built like this: 0, S 0 (the number after 0), S S 0 … Addition is defined by two equations: 0 + y = y, and S x + y = S (x + y). On the proof board, the two definitions are two givens.') },
    ],
    solution: proof({ e1: ['allE', { t: 'zero' }], e2: ['allE', { t: 's(zero)' }], e3: ['allE', { t: 's(zero)' }], w: ['rewrite', { at: [0] }] }, ['d1>e1.all', 'e1>e2.all', 'd0>e3.all', 'e3>w.eq', 'e2>w.p', 'w>goal'], { premises: ['d0', 'd1'] }),
    after: T('三次取一个、一次代换，才算完 1 + 1。数一大，手算就没完没了；可每一步做的都一样：拿一条定义，把对得上左边的地方换成右边。', 'Three Take ones and a Rewrite, just for 1 + 1. With bigger numbers, working by hand never ends; yet every step is the same: take a definition, and where its left side fits, put its right side.'),
  },
  // ---------- working them out ----------
  proves({
    id: 'sp-compute',
    title: T('算一算', 'Work it out'),
    words: TERM_WORDS,
    defs: NAT,
    tests: [{ goal: 'plus(s(zero), s(zero)) = s(s(zero))' }, { goal: 'plus(s(s(zero)), s(zero)) = s(s(s(zero)))' }, { goal: 'plus(zero, s(s(zero))) = s(s(zero))' }],
    brief: PROVE,
    hint: [T('化简用两条定义，把左边算出来；两边一样了，用规则接上<part-ref to="part:refl"></part-ref>。', 'Simp with the two definitions works the left side out; once both sides are the same, Rule with <part-ref to="part:refl"></part-ref>.')],
    intro: [{ t: T('<level-ref to="nl-plus"></level-ref>里每一步做的都一样：拿一条定义，从左往右换。定义就是改写规则：<part-ref to="lemma:simp"></part-ref>的规则里多了一组「定义」，交给它去算。', 'Every step in <level-ref to="nl-plus"></level-ref> was the same: take a definition and replace left to right. A definition is a rewrite rule: among <part-ref to="lemma:simp"></part-ref>’s rules there is now a group of definitions, to work it out.') }],
    solution: script(['simp', ['def.0', 'def.1']], ['rule', 'refl']),
    after: T('化简把定义从左往右一遍遍用，直到左边算成一个数；两边一样，就是自反律。证明助手的「计算」，就是改写。', 'Simp uses the definitions left to right again and again until the left side is worked out to a number; both sides the same is reflexivity. Computing, for the proof assistant, is rewriting.'),
  }),
  proves({
    id: 'sp-lists',
    title: T('列表也一样', 'Lists too'),
    words: TERM_WORDS,
    defs: LIST,
    tests: [
      { goal: 'len(app(cons(ann, nil), cons(bo, nil))) = s(s(zero))' },
      { goal: 'app(cons(ann, nil), app(cons(bo, nil), cons(cy, nil))) = cons(ann, cons(bo, cons(cy, nil)))' },
      { goal: 'len(app(cons(ann, cons(bo, nil)), nil)) = s(s(zero))' },
    ],
    brief: PROVE,
    hint: [T('四条定义都接进化简。', 'Wire all four definitions into Simp.')],
    intro: [{ t: T('列表也这样搭：[] 是空列表，x :: xs 是把 x 放在列表 xs 前面。拼接 ++ 和长度 len 也各用两个等式定义，一个管空列表，一个管前面多了一个的。', 'Lists are built the same way: [] is the empty list, and x :: xs puts x in front of the list xs. Appending ++ and length len are each defined by two equations, one for the empty list and one for a list with one more in front.') }],
    solution: script(['simp', ['def.0', 'def.1', 'def.2', 'def.3']], ['rule', 'refl']),
    after: T('数和列表一个样：都是从最简单的那一个（0、[]）一步步搭出来，函数按它是怎么搭的分两种情况定义，化简照着定义算。', 'Numbers and lists are alike: each built step by step from the simplest one (0, []), with functions defined by how it was built, in two cases, and Simp works them out by those definitions.'),
  }),
  proves({
    id: 'sp-cond',
    title: T('带条件的规则', 'A rule with a condition'),
    words: TERM_WORDS,
    defs: MAX,
    tests: [{ goal: 'max(s(zero), s(s(zero))) = s(s(zero))' }, { goal: 'max(s(s(zero)), s(zero)) = s(s(zero))' }, { goal: 'max(zero, s(zero)) = s(zero)' }],
    brief: PROVE,
    hint: [
      T('max 的两条规则，各走一条路：改写一处，再证两边一样，再证条件。', 'The two rules for max, one way each: rewrite, prove both sides the same, then prove the condition.'),
      T('条件证不出来的那条路，自己就失败了。', 'The way whose condition cannot be proved fails by itself.'),
    ],
    intro: [{ t: T('max 用带<b>条件</b>的等式定义：x ≤ y 是真时，max x y = y；是假时，max x y = x。带条件的规则改写一处以后，条件成了一个新目标，排在后面：证出了它，这一处才算改对了。', 'max is defined by equations with a <b>condition</b>: when x ≤ y is true, max x y = y; when false, max x y = x. A rule with a condition, once it rewrites a place, leaves the condition as a new goal behind: only once it is proved was the rewrite right.') }],
    solution: flow({ ways: [
      [['rw', 'def.3'], ['rule', 'refl'], ['simp', ['def.0', 'def.1', 'def.2']], ['rule', 'refl']],
      [['rw', 'def.4'], ['rule', 'refl'], ['simp', ['def.0', 'def.1', 'def.2']], ['rule', 'refl']],
    ] }),
    after: T('条件证不出来，那一处就不该那样改。化简器遇到带条件的规则，就是这样做的：先试着证条件，证得出才改。', 'If the condition cannot be proved, that place should not be changed that way. That is what a simplifier does with a rule that has a condition: it tries to prove the condition, and rewrites only if it can.'),
  }),
  proves({
    id: 'sp-hyp',
    title: T('拿已知改写', 'Rewriting with a given'),
    adds: ['hyp'],
    words: TERM_WORDS,
    defs: [...NAT, ...LIST],
    tests: [{ goal: 'plus(a, zero) = a → plus(s(a), zero) = s(a)' }, { goal: 'len(app(l, nil)) = len(l) → len(app(cons(ann, l), nil)) = s(len(l))' }],
    brief: PROVE,
    hint: [T('先用规则接上假设框，把「若」的那一半放进已知。改写规则里有一条是「已知里的等式」。', 'First Rule with the assumption box, putting the “if” half among the givens. One of the rewrite rules is “an equation given”.')],
    intro: [{ t: T('目标是「若…则…」时，前一半先用假设框倒着放进已知。已知里的一句等式，也能当改写规则：左边换成右边。', 'When the goal is an “if … then …”, the assumption box backwards puts its first half among the givens. An equation among the givens is a rewrite rule too: its left side becomes its right.') }],
    solution: script(['rule', 'impI'], ['simp', ['def.1', 'def.3', 'def.5', 'hyp']], ['rule', 'refl']),
    after: T('已知里的等式和定义一样，都能当改写规则。用假设框把条件放进已知，再拿它改写结论：条件在结论里一直有效。', 'An equation given is a rewrite rule, as a definition is. The assumption box puts the condition among the givens, and it rewrites the conclusion: the condition holds throughout the conclusion.'),
  }),
  proves({
    id: 'sp-under',
    title: T('在「对所有」底下', 'Under “for all”'),
    words: TERM_WORDS,
    defs: NAT,
    tests: [{ goal: '∀x. plus(zero, plus(zero, x)) = x' }, { goal: '∀x. ∀y. plus(s(zero), plus(x, y)) = s(plus(x, y))' }],
    brief: PROVE,
    hint: [T('先化简，再把「对所有」倒着拆掉，有几层拆几层，最后两边一样。', 'Simp first, then take the “for all”s apart backwards, as many as there are, and both sides are the same.')],
    intro: [{ t: T('目标前面有「对所有」，化简照样改它里面的句子：x 不管是什么，0 + x 都能改成 x。', 'With a “for all” in front of the goal, Simp still rewrites inside: whatever x is, 0 + x can become x.') }],
    solution: flow(['simp', ['def.0', 'def.1']], { frame: 'repeat', body: [['rule', 'allI']] }, ['rule', 'refl']),
    after: T('改写只看形状：∀ 管着的 x 也只是一个名字，0 + x 照样对得上 0 + y 那条规则的左边。', 'Rewriting looks only at shape: the x bound by ∀ is just a name, and 0 + x fits the left side of the rule 0 + y all the same.'),
  }),

  // ---------- the declaration's rules ----------
  proves({
    id: 'in-distinct',
    title: T('0 不等于 1', '0 is not 1'),
    datatypes: NAT_T,
    tests: [{ goal: '¬(zero = s(zero))' }, { goal: '¬(s(s(zero)) = zero)' }, { goal: '¬(zero = s(a))' }],
    brief: PROVE,
    hint: [
      T('¬A 就是 A → ⊥：先用规则接上假设框，把等式放进已知，再拿规则对已知接上「数理规则书」里 0 = S … 那一条。', '¬A is A → ⊥: first Rule with the assumption box puts the equation among the givens, then Rule on a given with the 0 = S … rule of the “Rule book of numbers”.'),
      T('有一组测试的等式是反过来写的：两条规则，走几条路。', 'One test has its equation the other way round: two rules, on Alternatives.'),
    ],
    intro: [
      { t: T('化简器里，数和列表是被算的东西：0、S 0 都是现成的，加法的定义是给定的等式。可「0 不等于 1」，化简证不出来：没有哪条定义说它们不一样。这一章给证明器装上<wiki-ref to="inductive"></wiki-ref>：数和列表是怎么来的。', 'In the simplifier, numbers and lists are things to work out: 0 and S 0 are just there, and addition’s definition is equations given. But “0 is not 1” Simp cannot prove: no definition says they differ. This chapter fits the prover with the <wiki-ref to="inductive"></wiki-ref>: where numbers and lists come from.') },
      { t: T('<level-ref to="decl-nat"></level-ref>声明了自然数：nat = 0 | S nat，一个数要么是 0，要么是某个数的后一个 S n。0 和 S 这两条引入规则叫<wiki-ref to="constructor"></wiki-ref>。声明只说了这一句，可它给规则书添了一组规则，第一条：不同的构造子造出的值互不相同，0 = S x 不可能成立，从它推出什么都行。', '<level-ref to="decl-nat"></level-ref> declared the numbers: nat = 0 | S nat, a number is 0 or the one after some number, S n. 0 and S, the two ways, are each a <wiki-ref to="constructor"></wiki-ref>. The declaration says only that, yet it adds a group of rules to the rule book, the first: values made by different constructors are different, 0 = S x cannot hold, and from it anything follows.') },
    ],
    solution: flow(['rule', 'impI'], { ways: [[['erule', 'nat.distinct1']], [['erule', 'nat.distinct2']]] }),
    after: T('0 和 S x 由不同的构造子造出，所以不相等：这不是一条另加的公理，是声明本身的意思。两个方向各是一条规则。', '0 and S x come from different constructors, so they differ: not an axiom added, but what the declaration means. Each way round is a rule.'),
  }),
  proves({
    id: 'in-inject',
    title: T('一对一', 'One-to-one'),
    datatypes: NAT_T,
    tests: [{ goal: 's(a) = s(b) → a = b' }, { goal: 's(s(a)) = s(s(b)) → a = b' }],
    brief: PROVE,
    hint: [T('<part-ref to="part:search"></part-ref>里两条路：已知里有，或者规则对已知接上「数理规则书」里 S … = S … 那一条。', 'Two ways in a <part-ref to="part:search"></part-ref>: Assumption, or Rule on a given with the S … = S … rule of the “Rule book of numbers”.')],
    intro: [{ t: T('S a = S b，那么 a = b：同一个构造子造出的两个值相等，参数也就相等，这叫<wiki-ref to="injectivity"></wiki-ref>。这也是声明给的一条规则。要拆几层，事先不知道。', 'S a = S b, so a = b: two values made by the same constructor are equal only if their arguments are, which is called <wiki-ref to="injectivity"></wiki-ref>. This too is a rule the declaration gives. How many layers to take off is not known beforehand.') }],
    solution: flow(['rule', 'impI'], { frame: 'search', body: [{ ways: [['assumption'], [['erule', 'nat.inject']]] }] }),
    after: T('互不相同和一对一，合起来说的是：一个数只有一条引入规则。', 'All different and one-to-one together say: a number is made in one way only.'),
  }),
  proves({
    id: 'in-cases',
    title: T('不是 0，就是后一个', 'Zero, or one after'),
    datatypes: NAT_T,
    tests: [{ goal: '∀x. x = zero ∨ (∃y. x = s(y))' }],
    brief: PROVE,
    hint: [T('先任取，再按情况分；在第一种情况里，已知里有会把 ?t 定下来。', 'For any first, then by cases; in the first case, Assumption settles ?t.')],
    intro: [{ t: T('每个数不是 0，就是某个数的后一个：这是<b>按情况分</b>，声明给的又一条规则 ⟦?t = 0 ⟹ ?C; ⋀x. ?t = S x ⟹ ?C⟧ ⟹ ?C：要证 ?C，两种情况各证一遍。?t 是谁，目标里读不出来，留给后面。', 'Every number is 0 or the one after some number: <b>by cases</b>, another rule the declaration gives, ⟦?t = 0 ⟹ ?C; ⋀x. ?t = S x ⟹ ?C⟧ ⟹ ?C: to prove ?C, prove it in each case. Who ?t is cannot be read off the goal, and is left for later.') }],
    solution: script(['rule', 'allI'], ['rule', 'nat.exhaust'], ['rule', 'disjI1'], 'assumption', ['rule', 'disjI2'], ['rule', 'exI'], 'assumption'),
    after: T('?t 在第一种情况里由已知里有定成了 a，第二种情况的已知跟着变成 a = S x。一个 ? 等到能定的地方再定，和规则与元变量一章一样。', '?t was settled as a by Assumption in the first case, and the second case’s given became a = S x with it. A ?-letter waits for the place that settles it, as in the chapter on rules and metavariables.'),
  }),
  {
    id: 'in-zero',
    title: T('0 加在右边', 'Zero on the right'),
    fact: 'addZero',
    showcase: T('归纳规则的结论是 ∀x. ?P(x)：倒着用，?P 从目标里读出来，两条前提就是两个目标；第二个目标的已知里，正是对 x 成立的那一句', 'the induction rule concludes ∀x. ?P(x): used backwards, ?P is read off the goal, and its two premises are two goals; among the second goal’s givens is just the sentence for x'),
    tasks: [
      proves({
        step: T('算具体的数', 'The numbers'),
        datatypes: NAT_T,
        defs: NAT,
        tests: [{ goal: 'plus(s(s(zero)), zero) = s(s(zero))' }, { goal: 'plus(s(s(s(zero))), zero) = s(s(s(zero)))' }],
        brief: PROVE,
        hint: [T('化简就够：S 在前面，定义就套得上。', 'Simp is enough: with S in front, the definition fits.')],
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
        brief: T('从加法的两条定义证明出：对所有 x，x + 0 = x。', 'From the two definitions of addition, prove x + 0 = x for every x.'),
        hint: [
          T('0 的情况：第一条定义取 0。', 'The case 0: take 0 in the first definition.'),
          T('从 a 到 S a：第二条定义取 a、再取 0，得到 S a + 0 = S (a + 0)；框里假设的 a + 0 = a，用等量代换换进去。', 'From a to S a: the second definition with a, then 0, gives S a + 0 = S (a + 0); the a + 0 = a the box assumes goes in by Rewrite.'),
        ],
        intro: [{ t: T('新元件「数学归纳法」：在元件上选要证的「对所有 x」，它有两个框。第一个框证 0 的情况；第二个框里有一个数 a，假设对 a 成立，证对 S a 也成立。', 'A new part, “Induction”: choose on it the “for every x” to prove; it has two boxes. The first proves the case 0; in the second there is a number a, the sentence is assumed for a, and proved for S a.') }],
        solution: proof({
          n: ['natInd', { P: '∀x. plus(x, zero) = x', x: 'a' }],
          z: ['allE', { t: 'zero' }, 'n/zero'],
          s1: ['allE', { t: 'a' }, 'n/step'], s2: ['allE', { t: 'zero' }, 'n/step'], w: ['rewrite', { at: [0] }, 'n/step'],
        }, ['d0>z.all', 'z>n.zero', 'd1>s1.all', 's1>s2.all', 'n#step>w.eq', 's2>w.p', 'w>n.step', 'n>goal'], { premises: ['d0', 'd1'] }),
      },
      proves({
        step: T('对所有 x', 'For every x'),
        datatypes: NAT_T,
        defs: NAT,
        tests: [{ goal: '∀x. plus(x, zero) = x' }],
        intro: [{ t: T('在证明助手上，化简改不动 x + 0：x 不知道是 0 还是 S 什么。声明给的归纳规则，做的正是那块两个框的元件做的事：⟦?P(0); ⋀x. ?P(x) ⟹ ?P(S x)⟧ ⟹ ∀x. ?P(x)。', 'On the proof assistant, Simp cannot change x + 0: x is not known to be 0 or S of something. The induction rule the declaration gives does just what the two-box part did: ⟦?P(0); ⋀x. ?P(x) ⟹ ?P(S x)⟧ ⟹ ∀x. ?P(x).') }],
        brief: T('证明对所有 x，x + 0 = x。', 'Prove x + 0 = x for every x.'),
        hint: [T('倒着用「数理规则书」里 nat 的归纳规则（结论是 ∀x. ?P(x)）：两个目标，一个是 0 的情况，一个是从 x 到 S x。每个目标各化简一次，第二个要用上已知里的等式。', 'Use the nat induction rule of the “Rule book of numbers” backwards (it concludes ∀x. ?P(x)): two goals, the case 0 and the step from x to S x. Simp each goal; the second needs the equation among its givens.')],
        solution: byInduction('nat', ['simp', [...defs(2), 'hyp']]),
        naive: script(['simp', defs(2)], ['rule', 'refl']),
      }),
    ],
    intro: [{ t: T('加法的定义只看左边那个数：0 + y = y，S x + y = S (x + y)。0 加在右边呢？具体的数好办，「对所有 x」就要声明的最后一条规则：<wiki-ref to="induction"></wiki-ref>。', 'Addition’s definition looks only at the number on the left: 0 + y = y, S x + y = S (x + y). And 0 on the right? For the numbers it is easy; “for every x” takes the declaration’s last rule: <wiki-ref to="induction"></wiki-ref>.') }],
    after: T('每个数都是从 0 一步步 S 出来的：0 的时候成立，从 x 成立能推出 S x 也成立，那就对所有数成立。归纳规则是声明给的：有几个构造子，就有几条前提。证出的 x + 0 = x 进了「数理规则书」：从此它是一条规则，也是化简的一条改写规则。', 'Every number is reached from 0 by S, step by step: true at 0, and true at S x whenever at x, means true at every number. The induction rule is the declaration’s: one premise per constructor. The x + 0 = x proved goes into the “Rule book of numbers”: a rule from now on, and a rewrite rule for Simp.'),
  },

  // ---------- numbers ----------
  proves({
    id: 'in-succ',
    title: T('S 加在右边', 'S on the right'),
    fact: 'addSucc',
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. plus(x, s(y)) = s(plus(x, y))' }],
    brief: PROVE,
    hint: [T('对 x 归纳，∀y 留着：已知里那句也就对所有 y 成立。', 'Induct on x and leave ∀y alone: the given is then about every y too.')],
    intro: [{ t: T('S 加在右边：x + S y = S (x + y)。两个变量，对哪一个归纳，哪一个留着？', 'S on the right: x + S y = S (x + y). Two variables: which to induct on, and which to leave?') }],
    solution: byInduction('nat', ['simp', [...defs(2), 'hyp']], ['rule', 'allI']),
    naive: script(['rule', 'allI'], ['rule', 'allI'], ['simp', [...defs(2), 'hyp']], ['rule', 'refl']),
    after: T('归纳假设是「对所有 y，x + S y = S (x + y)」。y 不先固定，假设才用得上：先对谁归纳、哪些留着，是归纳证明里要想的事。这一句也进了「数理规则书」。', 'The hypothesis is “for every y, x + S y = S (x + y)”. Leaving y unfixed is what makes it usable: what to induct on and what to leave is what an induction proof makes you think about. This goes into the “Rule book of numbers” too.'),
  }),
  proves({
    id: 'in-comm',
    title: T('交换', 'Commutativity'),
    fact: 'addComm',
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. plus(x, y) = plus(y, x)' }],
    brief: PROVE,
    hint: [T('0 的情况要 y + 0 = y，S 的情况要 y + S x：在「数理规则书」上勾上证出的 x + 0 = x 和 x + S y = S (x + y)，接进化简。', 'The 0 case needs y + 0 = y, the S case y + S x: tick the x + 0 = x and x + S y = S (x + y) proved on the “Rule book of numbers”, and wire it into Simp.')],
    intro: [{ t: T('交换：x + y = y + x。对 x 归纳，两种情况各卡在哪里？', 'Commutativity: x + y = y + x. Induct on x: where does each case get stuck?') }],
    solution: byInduction('nat', ['rule', 'allI'], ['simp', [...defs(2), 'addZero', 'addSucc', 'hyp']]),
    naive: byInduction('nat', ['rule', 'allI'], ['simp', [...defs(2), 'hyp']]),
    after: T('一个用了两条等式的归纳证明。数学书上一句「显然」，到证明助手上就是这样一层层搭出来的。它也进了「数理规则书」。', 'An induction standing on two equations. What a book calls “obvious” is built up like this on a proof assistant. It goes into the “Rule book of numbers” too.'),
  }),
  proves({
    id: 'in-assoc',
    title: T('结合', 'Associativity'),
    fact: 'addAssoc',
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. ∀z. plus(plus(x, y), z) = plus(x, plus(y, z))' }],
    brief: PROVE,
    hint: [T('对最左边的 x 归纳：定义就是看左边那个数的。', 'Induct on the leftmost x: the definition looks at the number on the left.')],
    intro: [{ t: T('结合：(x + y) + z = x + (y + z)。', 'Associativity: (x + y) + z = x + (y + z).') }],
    solution: byInduction('nat', ['simp', [...defs(2), 'hyp']], { frame: 'repeat', body: [['rule', 'allI']] }),
    after: T('这一次不用任何等式：变量选对了，定义自己就够。它也进了「数理规则书」。', 'No equation this time: with the right variable chosen, the definition is enough. It goes into the “Rule book of numbers” too.'),
  }),

  // ---------- lists ----------
  proves({
    id: 'in-appnil',
    title: T('接一个空列表', 'Appending nothing'),
    fact: 'appNil',
    datatypes: LIST_T,
    defs: LIST,
    tests: [{ goal: '∀xs. app(xs, nil) = xs' }],
    brief: PROVE,
    hint: [T('倒着用「数理规则书」里 list 的归纳规则，再每个目标化简。', 'Use the list induction rule of the “Rule book of numbers” backwards, then simp each goal.')],
    intro: [{ t: T('列表也是声明出来的：list = [] | x :: xs，一个列表要么是空的，要么是在列表 xs 前面接一个 x。声明给的规则一样四类，归纳的第二条前提是从 xs 到 x :: xs。', 'Lists are declared too: list = [] | x :: xs, a list is empty or an x put in front of a list xs. The declaration gives the same four kinds of rule, and induction’s second premise goes from xs to x :: xs.') }],
    solution: byInduction('list', ['simp', [...defs(2), 'hyp']]),
    after: T('和 x + 0 = x 一模一样的证明。数和列表是同一种东西：都是一层层造出来的<wiki-ref to="inductive"></wiki-ref>。它也进了「数理规则书」。', 'The very same proof as x + 0 = x. Numbers and lists are the same kind of thing, built up layer by layer: each is an <wiki-ref to="inductive"></wiki-ref>. It goes into the “Rule book of numbers” too.'),
  }),
  proves({
    id: 'in-appassoc',
    title: T('拼接也结合', 'Append associates too'),
    fact: 'appAssoc',
    datatypes: LIST_T,
    defs: LIST,
    tests: [{ goal: '∀xs. ∀ys. ∀zs. app(app(xs, ys), zs) = app(xs, app(ys, zs))' }],
    brief: PROVE,
    hint: [T('还是对最左边的那个归纳。', 'Induct on the leftmost again.')],
    intro: [{ t: T('拼接也结合：(xs ++ ys) ++ zs = xs ++ (ys ++ zs)。', 'Appending associates too: (xs ++ ys) ++ zs = xs ++ (ys ++ zs).') }],
    solution: byInduction('list', ['simp', [...defs(2), 'hyp']], { frame: 'repeat', body: [['rule', 'allI']] }),
    after: T('还是和加法结合同一个证明。它也进了「数理规则书」。', 'The same proof as associativity of addition, once more. It goes into the “Rule book of numbers” too.'),
  }),
  proves({
    id: 'in-revapp',
    title: T('倒过来拼', 'Reversing an append'),
    fact: 'revApp',
    datatypes: LIST_T,
    defs: REV,
    tests: [{ goal: '∀xs. ∀ys. rev(app(xs, ys)) = app(rev(ys), rev(xs))' }],
    brief: PROVE,
    hint: [T('[] 的情况要 rev ys = rev ys ++ []；另一种情况，两个 ++ 要换个结合方式：在「数理规则书」上勾上证出的 xs ++ [] = xs 和 (xs ++ ys) ++ zs = xs ++ (ys ++ zs)，接进化简。', 'The [] case needs rev ys = rev ys ++ []; the other one needs two ++ grouped the other way: tick the xs ++ [] = xs and (xs ++ ys) ++ zs = xs ++ (ys ++ zs) proved on the “Rule book of numbers”, and wire it into Simp.')],
    intro: [{ t: T('rev 把列表倒过来：rev [] = []，rev (x :: xs) = rev xs ++ [x]。把两段拼起来再倒过来，和先倒再拼，有什么关系？', 'rev reverses a list: rev [] = [], rev (x :: xs) = rev xs ++ [x]. What has reversing an append to do with reversing first?') }],
    solution: byInduction('list', ['rule', 'allI'], ['simp', [...defs(2), 'def.4', 'def.5', 'appNil', 'appAssoc', 'hyp']]),
    naive: byInduction('list', ['rule', 'allI'], ['simp', [...defs(2), 'def.4', 'def.5', 'hyp']]),
    after: T('倒过来的拼接，是先倒后面那段。两条列表的等式在这里一起用上了。它也进了「数理规则书」。', 'Reversing an append reverses the back part first. Both list equations were used here. It goes into the “Rule book of numbers” too.'),
  }),

  // ---------- why a definition must stop ----------
  proves({
    id: 'in-noteq',
    title: T('不等于自己的后一个', 'Never the one after itself'),
    fact: 'succNeq',
    datatypes: NAT_T,
    tests: [{ goal: '∀x. ¬(x = s(x))' }],
    brief: PROVE,
    hint: [T('倒着用归纳。0 的情况用互不相同；S 的情况，一对一把 S a = S (S a) 拆成 a = S a，正撞上已知。', 'Induction backwards. The 0 case is all different; in the S case, one-to-one takes S a = S (S a) to a = S a, against the given.')],
    intro: [{ t: T('没有哪个数等于它自己的后一个：x ≠ S x。声明给的三条规则一起上。', 'No number is the one after itself: x ≠ S x. Three of the declaration’s rules together.') }],
    solution: script(['rule', 'nat.induct'], ['rule', 'impI'], ['erule', 'nat.distinct1'], ['rule', 'impI'], ['erule', 'nat.inject'], ['erule', 'mp'], 'assumption'),
    after: T('x ≠ S x 进了「数理规则书」。', 'x ≠ S x goes into the “Rule book of numbers”.'),
  }),
  proves({
    id: 'in-loop',
    adds: ['frule'],
    title: T('停不下来的定义', 'A definition that never stops'),
    datatypes: NAT_T,
    tests: [{ goal: '⊥', hyps: ['∀x. f(x) = s(f(x))'] }],
    brief: PROVE,
    hint: [
      T('先证一句：用规则接上「数理规则书」里证出的 x ≠ S x，把它放进已知。', 'Have first: Rule with the x ≠ S x proved, from the “Rule book of numbers”, puts it among the givens.'),
      T('再往前推两次<part-ref to="part:allE"></part-ref>，从两句「对所有」各取出一句，让它们撞上。', 'Then Forward with <part-ref to="part:allE"></part-ref> twice, one sentence out of each “for all”, and let them clash.'),
    ],
    intro: [{ t: T('有人这样「定义」一个函数：f x = S (f x)。要算 f 0，先得算 f 0，永远算不完。在证明器里，这样一句定义不只是算不完：它和 x ≠ S x 放在一起，就推出矛盾。', 'Someone “defines” a function like this: f x = S (f x). Working out f 0 needs f 0 first, for ever. In a prover such a definition does worse than never finish: put beside x ≠ S x, it proves a contradiction.') }],
    solution: script(['rule', 'cut'], ['rule', 'succNeq'], ['frule', 'spec'], ['frule', 'spec'], ['erule', 'mp'], 'assumption'),
    after: T('f 0 = S (f 0) 撞上 f 0 ≠ S (f 0)：一句停不下来的定义，让证明器什么都证得出来。所以 Isabelle 的 fun、Lean 的 def 接受一个递归定义之前，先要证明它一定会停：每一次调用自己，参数都更小。按构造子一层层拆的递归，参数一定更小，自己就停得下来。', 'f 0 = S (f 0) against f 0 ≠ S (f 0): one definition that never stops lets the prover prove anything. That is why Isabelle’s fun and Lean’s def accept a recursive definition only once it is proved to stop: every call of itself on a smaller argument. Recursion that takes a value apart constructor by constructor always has a smaller argument, and stops by itself.'),
  }),

  // ---------- practice ----------
  proves({
    id: 'in-len',
    title: T('长度相加', 'Lengths add up'),
    datatypes: LIST_T,
    defs: [...LIST, ...NAT],
    tests: [{ goal: '∀xs. ∀ys. len(app(xs, ys)) = plus(len(xs), len(ys))' }],
    brief: PROVE,
    hint: [T('对 xs 归纳。列表和加法的定义一起接进化简。', 'Induct on xs. Wire the list definitions and addition’s together into Simp.')],
    intro: [{ t: T('len (xs ++ ys) = len xs + len ys：列表的定义和加法的定义，在一个证明里见面。', 'len (xs ++ ys) = len xs + len ys: list definitions and addition’s meet in one proof.') }],
    solution: byInduction('list', ['rule', 'allI'], ['simp', [...defs(6), 'hyp']]),
    after: T('两个数据类型的定义一起化简，归纳只对列表做：x :: xs 的长度，正是 S (len xs)。', 'The definitions of two datatypes simp together, and the induction is on the list alone: the length of x :: xs is just S (len xs).'),
  }),
  proves({
    id: 'in-revrev',
    title: T('倒两次', 'Reversed twice'),
    datatypes: LIST_T,
    defs: REV,
    tests: [{ goal: '∀xs. rev(rev(xs)) = xs' }],
    brief: PROVE,
    hint: [T('rev (rev xs ++ [x]) 要用证出的 rev (xs ++ ys) = rev ys ++ rev xs 拆开。', 'rev (rev xs ++ [x]) comes apart with the rev (xs ++ ys) = rev ys ++ rev xs proved.')],
    intro: [{ t: T('一个列表倒过来，再倒过来，还是它自己。', 'A list reversed and reversed again is itself.') }],
    solution: byInduction('list', ['simp', [...defs(2), 'def.4', 'def.5', 'revApp', 'hyp']]),
    naive: byInduction('list', ['simp', [...defs(2), 'def.4', 'def.5', 'hyp']]),
    after: T('这是 Isabelle 教程里的第一个定理。它要先证倒过来拼，那一条又要先证 ++ 的两条：真正的证明大多是这样，一串引理垫在下面。', 'This is the first theorem of the Isabelle tutorial. It needs reversing an append first, and that needs the two about ++: real proofs are mostly like this, a stack of lemmas underneath.'),
  }),
  proves({
    id: 'in-itsum',
    title: T('累加器求和', 'Summing with an accumulator'),
    datatypes: LIST_T,
    defs: SUM,
    tests: [{ goal: '∀xs. ∀y. itsum(xs, y) = plus(y, sum(xs))' }],
    brief: PROVE,
    hint: [
      T('对 xs 归纳，∀y 留着：每往后走一步，y 都在变。', 'Induct on xs and leave ∀y alone: y changes at each step along.'),
      T('[] 的情况要 y + 0 = y；另一种情况，两个 + 要换个结合方式。', 'The [] case needs y + 0 = y; in the other, two + grouped the other way.'),
    ],
    intro: [{ t: T('sum 从后往前加：sum (x :: xs) = x + sum xs。itsum 一边往后走，一边把元素加到 y 上，走到头 y 就是和（程序员叫它尾递归）。两种求和是一回事吗？', 'sum adds from the back: sum (x :: xs) = x + sum xs. itsum walks along adding each element onto y, and at the end y is the sum (programmers call it tail recursive). Are the two sums the same?') }],
    solution: byInduction('list', ['rule', 'allI'], ['simp', [...defs(6), 'addZero', 'addAssoc', 'hyp']]),
    naive: byInduction('list', ['rule', 'allI'], ['simp', [...defs(6), 'hyp']]),
    after: T('真正想要的是 itsum xs 0 = sum xs。可直接对它归纳会卡住：归纳假设说的是从 0 开始，往后走一步，累加器就不是 0 了。把 0 换成任意的 y，命题更强，归纳假设也更强，反而证得出来：先加强命题，是归纳证明里最常用的一招。', 'What was really wanted is itsum xs 0 = sum xs. But inducting on that gets stuck: the hypothesis is about starting from 0, and one step on the accumulator is no longer 0. With any y for 0 the statement is stronger, the hypothesis stronger with it, and the proof goes through: strengthening the statement is the commonest move in induction.'),
  }),

  // ---------- topic: insertion sort ----------
  proves({
    id: 'sort-ins',
    title: T('插进去', 'Inserting'),
    datatypes: LIST_T,
    defs: SORT,
    tests: [
      { goal: 'ins(s(zero), cons(zero, cons(s(s(zero)), nil))) = cons(zero, cons(s(zero), cons(s(s(zero)), nil)))' },
      { goal: 'ins(zero, cons(s(zero), nil)) = cons(zero, cons(s(zero), nil))' },
      { goal: 'ins(s(s(zero)), cons(zero, nil)) = cons(zero, cons(s(s(zero)), nil))' },
    ],
    brief: PROVE,
    hint: [T('比大小 ≤ 和「若…则…否则…」也都是用等式定义的：前面那些定义都接进化简。', 'The comparison ≤ and the if then else are defined by equations too: wire the definitions before those two into Simp.')],
    intro: [{ t: T('排序是程序，程序也能用等式定义：ins 把一个数插进排好的列表，比前面那个小就放前面，不然往后走。先算几个例子。', 'Sorting is a program, and a program can be defined by equations: ins puts a number into a sorted list, in front if it is no bigger than the first, else further along. Work out a few examples first.') }],
    solution: script(['simp', defs(11)], ['rule', 'refl']),
    after: T('定义一个函数，就是写一个程序；化简，就是运行它。', 'Defining a function is writing a program; Simp is running it.'),
  }),
  proves({
    id: 'sort-run',
    title: T('排一排', 'Sorting'),
    datatypes: LIST_T,
    defs: SORT,
    tests: [
      { goal: 'sort(cons(s(s(zero)), cons(zero, cons(s(zero), nil)))) = cons(zero, cons(s(zero), cons(s(s(zero)), nil)))' },
      { goal: 'sort(cons(s(zero), cons(s(zero), cons(zero, nil)))) = cons(zero, cons(s(zero), cons(s(zero), nil)))' },
    ],
    brief: PROVE,
    hint: [T('还是化简。', 'Simp again.')],
    intro: [{ t: T('sort [] = []，sort (x :: xs) = ins x (sort xs)：把元素一个个插进去。', 'sort [] = [], sort (x :: xs) = ins x (sort xs): insert the elements one by one.') }],
    solution: script(['simp', defs(11)], ['rule', 'refl']),
    after: T('跑几个例子，只能说明这几个排对了。要说每个列表都排得对，得证明。', 'Running examples only shows these few come out right. To say every list does, takes a proof.'),
  }),
  proves({
    id: 'sort-insLen',
    title: T('插一个，长一格', 'One in, one longer'),
    fact: 'insLen',
    datatypes: { ...LIST_T, bool: 'tt | ff' },
    defs: SORT,
    tests: [{ goal: '∀xs. ∀x. len(ins(x, xs)) = s(len(xs))' }],
    brief: PROVE,
    hint: [
      T('第二个目标化简以后，卡在一个「若 c ≤ a 则…否则…」上：谁大，化简不知道。倒着用「数理规则书」里 bool 按情况分的规则，两种情况各用一条带条件的 if 规则改写。', 'After simp, the second goal is stuck on an “if c ≤ a then … else …”: which is bigger, Simp does not know. Use the bool by-cases rule of the “Rule book of numbers” backwards, and in each case rewrite with one of the if rules with a condition.'),
      T('带条件的规则改写以后，条件排在后面；已知里有拿它去对 ?t = 真，?t 就定下来了。', 'After a rewrite with a condition, the condition waits behind; Assumption fits it to ?t = true, and ?t is settled.'),
    ],
    intro: [{ t: T('插进一个元素，列表就长一格。程序里有一个「如果」，证明里就要分一次情况：bool = 真 | 假 也是一个声明，它也有按情况分的规则。', 'Insert an element and the list is one longer. An “if” in a program is a case split in its proof: bool = true | false is a declaration too, with its own by-cases rule.') }],
    solution: script(
      ['rule', 'list.induct'],
      ['simp', defs(11)], ['rule', 'allI'], ['rule', 'refl'],
      ['rule', 'allI'], ['simp', defs(11)], ['rule', 'bool.exhaust'],
      ['rw', 'def.11'], ['simp', defs(11)], ['rule', 'refl'], 'assumption',
      ['rw', 'def.12'], ['simp', [...defs(11), 'hyp']], ['rule', 'refl'], 'assumption',
    ),
    after: T('程序里每一个「如果」，证明里就是一次分情况；它的条件由带条件的规则交给已知里有去定。这一句也进了「数理规则书」。', 'Each “if” in a program is a case split in its proof, its condition settled by Assumption once a rule with that condition is used. This goes into the “Rule book of numbers” too.'),
  }),
  proves({
    id: 'sort-len',
    title: T('一个都不少', 'None lost'),
    datatypes: LIST_T,
    defs: SORT,
    tests: [{ goal: '∀xs. len(sort(xs)) = len(xs)' }],
    brief: PROVE,
    hint: [T('在「数理规则书」上勾上证出的 len (ins x xs) = S (len xs)，接进化简。', 'Tick the len (ins x xs) = S (len xs) proved on the “Rule book of numbers”, and wire it into Simp.')],
    intro: [{ t: T('排序前后，列表一样长。', 'A list is as long after sorting as before.') }],
    solution: byInduction('list', ['simp', [...defs(11), 'insLen', 'hyp']]),
    naive: byInduction('list', ['simp', [...defs(11), 'hyp']]),
    after: T('排序的程序和它的一条性质，在同一个系统里写下、证明。要证它真的排好了序，还要定义「排好了」：这正是在证明器里验证程序的样子。', 'A sorting program and a property of it, written and proved in one system. Proving it really sorts takes defining “sorted” too: that is what verifying a program in a prover looks like.'),
  }),

  // ---------- topic: true, yet unprovable ----------
  {
    id: 'gd-true',
    kind: 'proof',
    title: T('我证不出', 'I cannot be proved'),
    consts: ['g'],
    words: GOEDEL,
    cases: [],
    tests: [{ premises: { diag: 'G ↔ ¬Prov(g)', sound: 'Prov(g) → G' }, goal: 'G ∧ ¬Prov(g)' }],
    brief: T('从这两句已知证明出：G 成立，而且 G 证不出。', 'From these two givens, prove: G holds, and G cannot be proved.'),
    hint: [
      T('先证 G 证不出：假设它证得出，由可靠得到 G，再由 G 得到它证不出。', 'First prove G cannot be proved: assume it can, get G by soundness, and from G that it cannot.'),
      T('有了「G 证不出」，等价的另一个方向就给出 G。', 'With “G cannot be proved”, the other direction of the equivalence gives G.'),
    ],
    intro: [
      { t: T('<level-ref to="kk-one"></level-ref>里的说谎者说「我是无赖」，推出矛盾。哥德尔把它换了一个词：「我证不出」。', 'The liar of <level-ref to="kk-one"></level-ref> says “I am a knave”, and that gives a contradiction. Gödel changed one word: “I cannot be proved”.') },
      { t: T('句子能编成数（<wiki-ref to="goedel-coding"></wiki-ref>），「编号是 x 的句子证得出」就成了一句关于数的话 Prov(x)。再用<level-ref to="u-barber"></level-ref>的对角线，造出一句 G，说的正是「G 证不出」：已知里的 G ↔ ¬Prov(⌜G⌝)。编码和对角线这两步很长，这里当作已知；另一句已知说证明器是可靠的：证得出的都是真的。', 'A sentence can be coded as a number (<wiki-ref to="goedel-coding"></wiki-ref>), so “the sentence numbered x can be proved” becomes a sentence about numbers, Prov(x). The diagonal of <level-ref to="u-barber"></level-ref> then builds a sentence G that says just “G cannot be proved”: the given G ↔ ¬Prov(⌜G⌝). Coding and the diagonal take long, so they are given here; the other given says the prover is sound: what it proves is true.') },
    ],
    solution: proof({
      e: ['andE'], f: ['impI', { A: 'Prov(g)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], m3: ['mp', {}, 'f'], m4: ['mp'], j: ['andI'],
    }, ['diag>e.ab', 'sound>m1.imp', 'f#body>m1.a', 'e#left>m2.imp', 'm1>m2.a', 'm2>m3.imp', 'f#body>m3.a', 'm3>f.body', 'e#right>m4.imp', 'f>m4.a', 'm4>j.a', 'f>j.b', 'j>goal'], { premises: ['diag', 'sound'] }),
    after: T('G 是真的，却证不出：这是哥德尔的第一<wiki-ref to="incompleteness"></wiki-ref>（1931）。说谎者说的是真假，就推出矛盾；G 说的是证不证得出，矛盾就变成了一句证不出的真话。只要证明器的规则能一条条列出来、又能谈论数，就总有这样一句 G，再加多少规则也补不完。', 'G is true, yet cannot be proved: Gödel’s first <wiki-ref to="incompleteness"></wiki-ref> (1931). Speaking of truth, the liar gives a contradiction; speaking of proof, G turns the contradiction into a truth that cannot be proved. As long as a prover’s rules can be listed one by one and it can speak of numbers, there is such a G, and no number of new rules fills the gap.'),
  },
  {
    id: 'gd-con',
    kind: 'proof',
    title: T('只要不矛盾', 'Consistency is enough'),
    consts: ['g', 'gn', 'gp'],
    words: GOEDEL,
    cases: [],
    tests: [{ premises: { d: 'Prov(g) → Prov(gn)', r: 'Prov(g) → Prov(gp)', con: '¬(Prov(gn) ∧ Prov(gp))' }, goal: '¬Prov(g)' }],
    brief: T('从这三句已知证明出：G 证不出。', 'From these three givens, prove: G cannot be proved.'),
    hint: [T('假设 G 证得出，两句「若…则…」各套用一次，拼起来就和第三句矛盾。', 'Assume G can be proved, apply each “if … then …” once, and the two together contradict the third.')],
    intro: [
      { t: T('<level-ref to="gd-true"></level-ref>用了一句很强的已知：证得出的都是真的。哥德尔要的少得多：只要证明器不矛盾，不会既证出一句话、又证出它的否定。这叫<wiki-ref to="consistency"></wiki-ref>。', '<level-ref to="gd-true"></level-ref> used a strong given: what is proved is true. Gödel needs far less: only that the prover never proves both a sentence and its negation. This is <wiki-ref to="consistency"></wiki-ref>.') },
      { t: T('这一关的已知都只说「证得出」：G ↔ ¬Prov(⌜G⌝) 本身证得出，所以证得出 G，就证得出「G 证不出」；证得出一句话，也就证得出「它证得出」。最后一句是不矛盾：这两句不会都证得出。', 'The givens here speak only of proof: G ↔ ¬Prov(⌜G⌝) can itself be proved, so proving G proves “G cannot be proved”; and proving a sentence proves “it can be proved”. The last is consistency: those two are never both proved.') },
    ],
    solution: proof({ f: ['impI', { A: 'Prov(g)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], j: ['andI', {}, 'f'], m3: ['mp', {}, 'f'] }, ['d>m1.imp', 'f#body>m1.a', 'r>m2.imp', 'f#body>m2.a', 'm1>j.a', 'm2>j.b', 'con>m3.imp', 'j>m3.a', 'm3>f.body', 'f>goal'], { premises: ['d', 'r', 'con'] }),
    after: T('只要证明器不矛盾，G 就证不出。用到的只是「证得出」的几条性质，每一条都能在算术里证出来；可靠性用不着了。', 'As long as the prover is consistent, G cannot be proved. All it used were a few properties of proof, each provable in arithmetic; soundness is no longer needed.'),
  },
  {
    id: 'gd-second',
    kind: 'proof',
    title: T('证不了自己不矛盾', 'It cannot prove itself consistent'),
    consts: ['g', 'gn', 'cs'],
    words: GOEDEL,
    cases: [],
    tests: [{ premises: { f1: 'Prov(cs) → Prov(gn)', f2: 'Prov(gn) → Prov(g)', first: '¬Prov(g)' }, goal: '¬Prov(cs)' }],
    brief: T('从这三句已知证明出：「证明器不矛盾」证不出。', 'From these three givens, prove: “the prover is consistent” cannot be proved.'),
    hint: [T('假设它证得出，顺着两句「若…则…」一路套用，撞上第三句。', 'Assume it can be proved, apply your way along the two “if … then …”s, and run into the third.')],
    intro: [{ t: T('「证明器不矛盾」也能写成一句关于数的话，编号记作 ⌜不矛盾⌝。<level-ref to="gd-con"></level-ref>的论证本身也能在系统里做一遍，所以证得出「不矛盾」，就证得出「G 证不出」；G ↔ ¬Prov(⌜G⌝) 证得出，所以证得出「G 证不出」，就证得出 G。第三句是那一关的结论：系统不矛盾，G 就证不出。', '“The prover is consistent” can be written as a sentence about numbers too, numbered ⌜consistent⌝. The argument of <level-ref to="gd-con"></level-ref> can itself be carried out inside the system, so proving “consistent” proves “G cannot be proved”; and since G ↔ ¬Prov(⌜G⌝) can be proved, proving “G cannot be proved” proves G. The third given is that level’s conclusion: if the system is consistent, G cannot be proved.') }],
    solution: proof({ f: ['impI', { A: 'Prov(cs)' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], m3: ['mp', {}, 'f'] }, ['f1>m1.imp', 'f#body>m1.a', 'f2>m2.imp', 'm1>m2.a', 'first>m3.imp', 'm2>m3.a', 'm3>f.body', 'f>goal'], { premises: ['f1', 'f2', 'first'] }),
    after: T('一个不矛盾、又能谈论数的证明器，证不出自己不矛盾：这是第二不完备性定理。要相信一台证明器不矛盾，得站到它外面去。这台证明器的核也一样：信它，是因为它小，人看得清每一条规则，而不是它证明了自己。', 'A consistent prover that can speak of numbers cannot prove itself consistent: the second incompleteness theorem. To trust that a prover is consistent, one must stand outside it. So with this prover’s kernel: it is trusted because it is small and every rule can be seen, not because it proved itself.'),
  },

  // ---------- challenge ----------
  proves({
    id: 'in-circle',
    title: T('会绕圈的化简', 'Simp going round in circles'),
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. plus(x, s(y)) = s(plus(y, x))' }, { goal: '∀x. ∀y. plus(s(x), y) = plus(y, s(x))' }, { goal: '∀x. plus(x, s(zero)) = s(x)' }],
    brief: PROVE,
    hint: [
      T('交换律接进化简，会把 x + y 改成 y + x，再改回来……', 'Commutativity in Simp turns x + y into y + x and back again …'),
      T('化简以后，有的目标两边已经一样了，有的只差一处交换。', 'After Simp, some goals have both sides the same already, others differ by one swap.'),
    ],
    intro: [{ t: T('这几句都要交换律。', 'Each of these needs commutativity.') }],
    solution: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['simp', [...defs(2), 'addZero', 'addSucc']], { ways: [[['rule', 'refl']], [['rw', 'addComm'], ['rule', 'refl']]] }),
    naive: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['simp', [...defs(2), 'addZero', 'addSucc', 'addComm']], ['rule', 'refl']),
    after: T('一条规则左右两边只差变量的位置，化简照直用就会绕圈。只在要它的地方用一次改写，就不会。Isabelle 的办法是给式子排一个固定的次序，只往「更小」的方向改，这叫<wiki-ref to="ordered"></wiki-ref>。', 'A rule whose sides differ only in where the variables go makes Simp go round in circles; used once, by a rewrite, where it is needed, it does not. Isabelle fixes an order on expressions and rewrites only towards the smaller, which is called <wiki-ref to="ordered"></wiki-ref>.'),
  }),
]
