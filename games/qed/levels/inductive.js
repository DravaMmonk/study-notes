// Chapter 11 · Inductive types: numbers and lists are declared (nat = 0 | S nat), and a declaration gives rules
// (kit/domains/logic/datatype.js) used with the rule cards like any other: the constructors are all different, each
// is one-to-one, every value is made by one of them, and induction. No new part: the declaration is written by the
// level. First the declaration's rules, ending with induction (0 on the right). Then three lines that need nothing
// from each other: numbers (S on the right, commutativity, associativity), lists (append nil, append associates,
// reverse of an append) and why a definition must stop (x ≠ S x; a definition that never stops proves ⊥). Each
// equation proved is a rule and a rewrite rule from then on (the course's facts). Practice puts both together; the
// topic sorts by insertion; the challenge is commutativity, which simp would turn back and forth for ever.
import { flow, script } from './machines.js'
import { TERM_WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const proves = (level) => ({ kind: 'machine', want: 'proved', inputs: GOAL, backtrack: true, words: TERM_WORDS, ...level })
const PROVE = T('接一台机器，证完每一个目标。', 'Wire a machine that proves every goal.')

const NAT_T = { nat: 'zero | s(nat)' }
const LIST_T = { list: 'nil | cons(elem, list)' }
const NAT = ['plus(zero, y) = y', 'plus(s(x), y) = s(plus(x, y))']
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
const defs = (n, from = 0) => Array.from({ length: n }, (_, k) => `def.${from + k}`)
// Induction, then each goal: the cards given, then both sides the same.
const byInduction = (type, ...body) => flow(['rule', `${type}.induct`], { frame: 'each', body: [...body, ['rule', 'refl']] })

export const inductive = [
  // ---------- the declaration's rules ----------
  proves({
    id: 'in-distinct',
    title: T('0 不等于 1', '0 is not 1'),
    datatypes: NAT_T,
    tests: [{ goal: '¬(zero = s(zero))' }, { goal: '¬(s(s(zero)) = zero)' }, { goal: '¬(zero = s(a))' }],
    brief: PROVE,
    hint: [
      T('¬A 就是 A → ⊥：先用规则选假设框，把等式放进已知，再拿规则对已知选「nat：zero 不等于 s」。', '¬A is A → ⊥: first Rule with the assumption box puts the equation among the givens, then Rule on a given with “nat: zero is not s”.'),
      T('有一组测试的等式是反过来写的：两条规则，走几条路。', 'One test has its equation the other way round: two rules, on Alternatives.'),
    ],
    intro: [
      { t: T('化简器里，数和列表是被算的东西：0、S 0 都是现成的，加法的定义是给定的等式。可「0 不等于 1」，化简证不出来：没有哪条定义说它们不一样。这一章给证明器装上<b>归纳类型</b>：数和列表是怎么来的。', 'In the simplifier, numbers and lists are things to work out: 0 and S 0 are just there, and addition’s definition is equations given. But “0 is not 1” Simp cannot prove: no definition says they differ. This chapter fits the prover with <b>inductive types</b>: where numbers and lists come from.') },
      { t: T('数是<b>声明</b>出来的：nat = 0 | S nat，一个数要么是 0，要么是某个数的后一个 S n。0 和 S 叫<b>构造子</b>。声明只说了这一句，可它给规则书添了一组规则，第一条：不同的构造子造出的值互不相同，0 = S x 不可能成立，从它推出什么都行。Isabelle 的 datatype、Lean 的 inductive 都是这样的声明。', 'Numbers are <b>declared</b>: nat = 0 | S nat, a number is 0 or the one after some number, S n. 0 and S are <b>constructors</b>. The declaration says only that, yet it adds a group of rules to the rule book, the first: values made by different constructors are different, 0 = S x cannot hold, and from it anything follows. Isabelle’s datatype and Lean’s inductive are declarations like this.') },
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
    hint: [T('<part-ref to="part:search"></part-ref>里两条路：已知里有，或者规则对已知选「nat：s 一对一」。', 'Two ways in a <part-ref to="part:search"></part-ref>: Assumption, or Rule on a given with “nat: s is one-to-one”.')],
    intro: [{ t: T('S a = S b，那么 a = b：同一个构造子造出的两个值相等，参数也就相等，这叫<b>一对一</b>。这也是声明给的一条规则。要拆几层，事先不知道。', 'S a = S b, so a = b: two values made by the same constructor are equal only if their arguments are, which is called <b>one-to-one</b>. This too is a rule the declaration gives. How many layers to take off is not known beforehand.') }],
    solution: flow(['rule', 'impI'], { frame: 'search', body: [{ ways: [['assumption'], [['erule', 'nat.inject']]] }] }),
    after: T('互不相同和一对一，合起来说的是：一个数只有一种造法。', 'All different and one-to-one together say: a number is made in one way only.'),
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
    builds: 'addZero',
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
      proves({
        step: T('对所有 x', 'For every x'),
        datatypes: NAT_T,
        defs: NAT,
        tests: [{ goal: '∀x. plus(x, zero) = x' }],
        brief: T('现在证对所有 x，x + 0 = x。化简改不动 x + 0：x 不知道是 0 还是 S 什么。', 'Now prove x + 0 = x for every x. Simp cannot change x + 0: x is not known to be 0 or S of something.'),
        hint: [T('倒着用「nat 的归纳」：两个目标，一个是 0 的情况，一个是从 x 到 S x。每个目标各化简一次，第二个要用上已知里的等式。', 'Use “nat induction” backwards: two goals, the case 0 and the step from x to S x. Simp each goal; the second needs the equation among its givens.')],
        solution: byInduction('nat', ['simp', [...defs(2), 'hyp']]),
        naive: script(['simp', defs(2)], ['rule', 'refl']),
      }),
    ],
    intro: [{ t: T('加法的定义只看左边那个数：0 + y = y，S x + y = S (x + y)。0 加在右边呢？具体的数好办，「对所有 x」就要声明的最后一条规则：<b>归纳</b>。', 'Addition’s definition looks only at the number on the left: 0 + y = y, S x + y = S (x + y). And 0 on the right? For the numbers it is easy; “for every x” takes the declaration’s last rule: <b>induction</b>.') }],
    after: T('每个数都是从 0 一步步 S 出来的：0 的时候成立，从 x 成立能推出 S x 也成立，那就对所有数成立。归纳规则是声明给的：有几个构造子，就有几条前提。证出的 x + 0 = x 成了<part-ref to="lemma:addZero"></part-ref>：从此它是一条规则，也是化简的一条改写规则。', 'Every number is reached from 0 by S, step by step: true at 0, and true at S x whenever at x, means true at every number. The induction rule is the declaration’s: one premise per constructor. The x + 0 = x proved is now <part-ref to="lemma:addZero"></part-ref>: a rule from now on, and a rewrite rule for Simp.'),
  },

  // ---------- numbers ----------
  proves({
    id: 'in-succ',
    title: T('S 加在右边', 'S on the right'),
    builds: 'addSucc',
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. plus(x, s(y)) = s(plus(x, y))' }],
    brief: PROVE,
    hint: [T('对 x 归纳，∀y 留着：已知里那句也就对所有 y 成立。', 'Induct on x and leave ∀y alone: the given is then about every y too.')],
    intro: [{ t: T('S 加在右边：x + S y = S (x + y)。两个变量，对哪一个归纳，哪一个留着？', 'S on the right: x + S y = S (x + y). Two variables: which to induct on, and which to leave?') }],
    solution: byInduction('nat', ['simp', [...defs(2), 'hyp']], ['rule', 'allI']),
    naive: script(['rule', 'allI'], ['rule', 'allI'], ['simp', [...defs(2), 'hyp']], ['rule', 'refl']),
    after: T('归纳假设是「对所有 y，x + S y = S (x + y)」。y 不先固定，假设才用得上：先对谁归纳、哪些留着，是归纳证明里要想的事。这一句成了<part-ref to="lemma:addSucc"></part-ref>。', 'The hypothesis is “for every y, x + S y = S (x + y)”. Leaving y unfixed is what makes it usable: what to induct on and what to leave is what an induction proof makes you think about. This is now <part-ref to="lemma:addSucc"></part-ref>.'),
  }),
  proves({
    id: 'in-comm',
    title: T('交换', 'Commutativity'),
    builds: 'addComm',
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. plus(x, y) = plus(y, x)' }],
    brief: PROVE,
    hint: [T('0 的情况要 y + 0 = y，S 的情况要 y + S x：<part-ref to="lemma:addZero"></part-ref>和<part-ref to="lemma:addSucc"></part-ref>都排进化简。', 'The 0 case needs y + 0 = y, the S case y + S x: line <part-ref to="lemma:addZero"></part-ref> and <part-ref to="lemma:addSucc"></part-ref> up in Simp.')],
    intro: [{ t: T('交换：x + y = y + x。对 x 归纳，两种情况各卡在哪里？', 'Commutativity: x + y = y + x. Induct on x: where does each case get stuck?') }],
    solution: byInduction('nat', ['rule', 'allI'], ['simp', [...defs(2), 'addZero', 'addSucc', 'hyp']]),
    naive: byInduction('nat', ['rule', 'allI'], ['simp', [...defs(2), 'hyp']]),
    after: T('一个用了两条等式的归纳证明。数学书上一句「显然」，到机器上就是这样一层层搭出来的。它成了<part-ref to="lemma:addComm"></part-ref>。', 'An induction standing on two equations. What a book calls “obvious” is built up like this on a machine. It is now <part-ref to="lemma:addComm"></part-ref>.'),
  }),
  proves({
    id: 'in-assoc',
    title: T('结合', 'Associativity'),
    builds: 'addAssoc',
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. ∀z. plus(plus(x, y), z) = plus(x, plus(y, z))' }],
    brief: PROVE,
    hint: [T('对最左边的 x 归纳：定义就是看左边那个数的。', 'Induct on the leftmost x: the definition looks at the number on the left.')],
    intro: [{ t: T('结合：(x + y) + z = x + (y + z)。', 'Associativity: (x + y) + z = x + (y + z).') }],
    solution: byInduction('nat', ['simp', [...defs(2), 'hyp']], { frame: 'repeat', body: [['rule', 'allI']] }),
    after: T('这一次不用任何等式：变量选对了，定义自己就够。它成了<part-ref to="lemma:addAssoc"></part-ref>。', 'No equation this time: with the right variable chosen, the definition is enough. It is now <part-ref to="lemma:addAssoc"></part-ref>.'),
  }),

  // ---------- lists ----------
  proves({
    id: 'in-appnil',
    title: T('接一个空列表', 'Appending nothing'),
    builds: 'appNil',
    datatypes: LIST_T,
    defs: LIST,
    tests: [{ goal: '∀xs. app(xs, nil) = xs' }],
    brief: PROVE,
    hint: [T('倒着用「list 的归纳」，再每个目标化简。', 'Use “list induction” backwards, then simp each goal.')],
    intro: [{ t: T('列表也是声明出来的：list = [] | x :: xs，一个列表要么是空的，要么是在列表 xs 前面接一个 x。声明给的规则一样四类，归纳的第二条前提是从 xs 到 x :: xs。', 'Lists are declared too: list = [] | x :: xs, a list is empty or an x put in front of a list xs. The declaration gives the same four kinds of rule, and induction’s second premise goes from xs to x :: xs.') }],
    solution: byInduction('list', ['simp', [...defs(2), 'hyp']]),
    after: T('和 x + 0 = x 一模一样的证明。数和列表是同一种东西：都是一层层造出来的，叫<b>归纳定义的数据类型</b>。它成了<part-ref to="lemma:appNil"></part-ref>。', 'The very same proof as x + 0 = x. Numbers and lists are the same kind of thing, built up layer by layer: <b>inductively defined datatypes</b>. It is now <part-ref to="lemma:appNil"></part-ref>.'),
  }),
  proves({
    id: 'in-appassoc',
    title: T('拼接也结合', 'Append associates too'),
    builds: 'appAssoc',
    datatypes: LIST_T,
    defs: LIST,
    tests: [{ goal: '∀xs. ∀ys. ∀zs. app(app(xs, ys), zs) = app(xs, app(ys, zs))' }],
    brief: PROVE,
    hint: [T('还是对最左边的那个归纳。', 'Induct on the leftmost again.')],
    intro: [{ t: T('拼接也结合：(xs ++ ys) ++ zs = xs ++ (ys ++ zs)。', 'Appending associates too: (xs ++ ys) ++ zs = xs ++ (ys ++ zs).') }],
    solution: byInduction('list', ['simp', [...defs(2), 'hyp']], { frame: 'repeat', body: [['rule', 'allI']] }),
    after: T('还是和加法结合同一个证明。它成了<part-ref to="lemma:appAssoc"></part-ref>。', 'The same proof as associativity of addition, once more. It is now <part-ref to="lemma:appAssoc"></part-ref>.'),
  }),
  proves({
    id: 'in-revapp',
    title: T('倒过来拼', 'Reversing an append'),
    builds: 'revApp',
    datatypes: LIST_T,
    defs: REV,
    tests: [{ goal: '∀xs. ∀ys. rev(app(xs, ys)) = app(rev(ys), rev(xs))' }],
    brief: PROVE,
    hint: [T('[] 的情况要 rev ys = rev ys ++ []；另一种情况，两个 ++ 要换个结合方式：<part-ref to="lemma:appNil"></part-ref>和<part-ref to="lemma:appAssoc"></part-ref>都排进化简。', 'The [] case needs rev ys = rev ys ++ []; the other one needs two ++ grouped the other way: line <part-ref to="lemma:appNil"></part-ref> and <part-ref to="lemma:appAssoc"></part-ref> up in Simp.')],
    intro: [{ t: T('rev 把列表倒过来：rev [] = []，rev (x :: xs) = rev xs ++ [x]。把两段拼起来再倒过来，和先倒再拼，有什么关系？', 'rev reverses a list: rev [] = [], rev (x :: xs) = rev xs ++ [x]. What has reversing an append to do with reversing first?') }],
    solution: byInduction('list', ['rule', 'allI'], ['simp', [...defs(2), 'def.4', 'def.5', 'appNil', 'appAssoc', 'hyp']]),
    naive: byInduction('list', ['rule', 'allI'], ['simp', [...defs(2), 'def.4', 'def.5', 'hyp']]),
    after: T('倒过来的拼接，是先倒后面那段。两条列表的等式在这里一起用上了。它成了<part-ref to="lemma:revApp"></part-ref>。', 'Reversing an append reverses the back part first. Both list equations were used here. It is now <part-ref to="lemma:revApp"></part-ref>.'),
  }),

  // ---------- why a definition must stop ----------
  proves({
    id: 'in-noteq',
    title: T('不等于自己的后一个', 'Never the one after itself'),
    builds: 'succNeq',
    datatypes: NAT_T,
    tests: [{ goal: '∀x. ¬(x = s(x))' }],
    brief: PROVE,
    hint: [T('倒着用归纳。0 的情况用互不相同；S 的情况，一对一把 S a = S (S a) 拆成 a = S a，正撞上已知。', 'Induction backwards. The 0 case is all different; in the S case, one-to-one takes S a = S (S a) to a = S a, against the given.')],
    intro: [{ t: T('没有哪个数等于它自己的后一个：x ≠ S x。声明给的三条规则一起上。', 'No number is the one after itself: x ≠ S x. Three of the declaration’s rules together.') }],
    solution: script(['rule', 'nat.induct'], ['rule', 'impI'], ['erule', 'nat.distinct1'], ['rule', 'impI'], ['erule', 'nat.inject'], ['erule', 'mp'], 'assumption'),
    after: T('x ≠ S x 成了<part-ref to="lemma:succNeq"></part-ref>。', 'x ≠ S x is now <part-ref to="lemma:succNeq"></part-ref>.'),
  }),
  proves({
    id: 'in-loop',
    title: T('停不下来的定义', 'A definition that never stops'),
    datatypes: NAT_T,
    tests: [{ goal: '⊥', hyps: ['∀x. f(x) = s(f(x))'] }],
    brief: PROVE,
    hint: [
      T('先证一句：用规则选<part-ref to="lemma:succNeq"></part-ref>，把它放进已知。', 'Have first: Rule with <part-ref to="lemma:succNeq"></part-ref> puts it among the givens.'),
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
    hint: [T('对 xs 归纳。列表和加法的定义一起排进化简。', 'Induct on xs. Line up the list definitions and addition’s together in Simp.')],
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
    hint: [T('rev (rev xs ++ [x]) 要用<part-ref to="lemma:revApp"></part-ref>拆开。', 'rev (rev xs ++ [x]) comes apart with <part-ref to="lemma:revApp"></part-ref>.')],
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
    hint: [T('比大小 ≤ 和「若…则…否则…」也都是用等式定义的：前面那些定义都排进化简。', 'The comparison ≤ and the if then else are defined by equations too: line up the definitions before those two in Simp.')],
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
    builds: 'insLen',
    datatypes: { ...LIST_T, bool: 'tt | ff' },
    defs: SORT,
    tests: [{ goal: '∀xs. ∀x. len(ins(x, xs)) = s(len(xs))' }],
    brief: PROVE,
    hint: [
      T('第二个目标化简以后，卡在一个「若 c ≤ a 则…否则…」上：谁大，化简不知道。倒着用「bool 按情况分」，两种情况各用一条带条件的 if 规则改写。', 'After simp, the second goal is stuck on an “if c ≤ a then … else …”: which is bigger, Simp does not know. Use “bool by cases” backwards, and in each case rewrite with one of the if rules with a condition.'),
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
    after: T('程序里每一个「如果」，证明里就是一次分情况；它的条件由带条件的规则交给已知里有去定。这一句成了<part-ref to="lemma:insLen"></part-ref>。', 'Each “if” in a program is a case split in its proof, its condition settled by Assumption once a rule with that condition is used. This is now <part-ref to="lemma:insLen"></part-ref>.'),
  }),
  proves({
    id: 'sort-len',
    title: T('一个都不少', 'None lost'),
    datatypes: LIST_T,
    defs: SORT,
    tests: [{ goal: '∀xs. len(sort(xs)) = len(xs)' }],
    brief: PROVE,
    hint: [T('<part-ref to="lemma:insLen"></part-ref>排进化简。', 'Line <part-ref to="lemma:insLen"></part-ref> up in Simp.')],
    intro: [{ t: T('排序前后，列表一样长。', 'A list is as long after sorting as before.') }],
    solution: byInduction('list', ['simp', [...defs(11), 'insLen', 'hyp']]),
    naive: byInduction('list', ['simp', [...defs(11), 'hyp']]),
    after: T('排序的程序和它的一条性质，在同一个系统里写下、证明。要证它真的排好了序，还要定义「排好了」：这正是在证明器里验证程序的样子。', 'A sorting program and a property of it, written and proved in one system. Proving it really sorts takes defining “sorted” too: that is what verifying a program in a prover looks like.'),
  }),

  // ---------- challenge ----------
  proves({
    id: 'in-circle',
    title: T('会绕圈的化简', 'Simp going round in circles'),
    datatypes: NAT_T,
    defs: NAT,
    tests: [{ goal: '∀x. ∀y. plus(x, s(y)) = s(plus(y, x))' }, { goal: '∀x. ∀y. plus(s(x), y) = plus(y, s(x))' }, { goal: '∀x. plus(x, s(zero)) = s(x)' }],
    brief: PROVE,
    hint: [
      T('交换律排进化简，会把 x + y 改成 y + x，再改回来……', 'Commutativity in Simp turns x + y into y + x and back again …'),
      T('化简以后，有的目标两边已经一样了，有的只差一处交换。', 'After Simp, some goals have both sides the same already, others differ by one swap.'),
    ],
    intro: [{ t: T('这几句都要交换律。', 'Each of these needs commutativity.') }],
    solution: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['simp', [...defs(2), 'addZero', 'addSucc']], { ways: [[['rule', 'refl']], [['rw', 'addComm'], ['rule', 'refl']]] }),
    naive: flow({ frame: 'repeat', body: [['rule', 'allI']] }, ['simp', [...defs(2), 'addZero', 'addSucc', 'addComm']], ['rule', 'refl']),
    after: T('一条规则左右两边只差变量的位置，化简照直用就会绕圈。只在要它的地方用一次改写，就不会。Isabelle 的办法是给式子排一个固定的次序，只往「更小」的方向改，这叫<b>有序重写</b>。', 'A rule whose sides differ only in where the variables go makes Simp go round in circles; used once, by a rewrite, where it is needed, it does not. Isabelle fixes an order on expressions and rewrites only towards the smaller, which is called <b>ordered rewriting</b>.'),
  }),
]
