// Chapter 9 · The simplifier: goals that only want one place changed for another that says the same (¬¬A for A, a
// negation pushed in) take too long rule by rule, so laws proved both ways round become rewrite
// rules, used left to right, one place at a time (the rewrite card, kit/domains/logic/rewrite.js). Double negation
// comes first, with the card. Then three lines that need nothing from each other: more laws (arrows to or,
// distribution), De Morgan (the laws, rewriting the other way, the quantifier laws), and rewriting itself (the first
// place, then again and again). With all three, simp is built: a repeat frame round alternatives, one rewrite each.
// Then normal forms (NNF, CNF, and the order of the rules). The drinker paradox, which leans on De Morgan's ¬∀
// shape, is the challenge.
import { proof } from '../../kit/domains/logic/build.js'
import { flow, script } from './machines.js'

const T = (zh, en) => ({ zh, en })
const prove = (task) => ({ kind: 'proof', ...task })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
// A machine on proof states that every card gives every result on (as from the tactics chapter on).
const machineLevel = (want) => (level) => ({ kind: 'machine', want, inputs: GOAL, backtrack: true, ...level })
const becomes = machineLevel('becomes')
const proves = machineLevel('proved')
// A law's last task: the machine board, rewriting with it.
const rewriting = (task) => becomes({ step: T('改写', 'Rewrite'), ...task })
const DAYS = [{ A: 'Sat', B: 'Sun' }, { A: 'Rain', B: 'Wind' }]
const DRINK = [{ P: 'Drinks' }, { P: 'Sings' }]
const THREE = [{ A: 'Rain', B: 'Wind', C: 'Wet' }, { A: 'Sat', B: 'Rest', C: 'Happy' }]
const BRIEF = T('接一台机器，把每个目标变成要的样子。', 'Wire a machine that turns each goal into the one wanted.')

// Addition, lists (append, length) and max, defined by equations (each a rewrite rule, def.0 …).
// The rewrite rules that bring a sentence to negation normal form, and conjunctive normal form after them.
const NNF = ['arrow.elim', 'dneg.elim', 'dm.notOr', 'dm.notAnd', 'dm.notEx', 'dm.notAll']
const CNF = [...NNF, 'dist.orAndR', 'dist.orAndL']

export const simplifier = [
  // ---------- double negation, and the rewrite card ----------
  {
    id: 'sp-dneg',
    title: T('双重否定', 'Double negation'),
    builds: 'dneg',
    tasks: [
      prove({
        step: T('去掉两个 ¬', 'Two ¬s off'),
        tests: [{ premises: { p: '¬¬A' }, goal: 'A' }],
        cases: [{ A: 'Rain' }, { A: 'Locked' }],
        brief: T('实现一个证明器，可以从已知「¬¬下雨」，证明出「下雨」。', 'Build a prover that, from “¬¬it rains”, proves “it rains”.'),
        hint: [T('你手里有一条规则，正好去掉两个 ¬。', 'You hold a rule that takes exactly two ¬s off.')],
        solution: proof({ r: ['raa'] }, ['p>r.nna', 'r>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('加上两个 ¬', 'Two ¬s on'),
        tests: [{ premises: { p: 'A' }, goal: '¬¬A' }],
        cases: [{ A: 'Rain' }, { A: 'Locked' }],
        brief: T('再从「下雨」证明出「¬¬下雨」。', 'Now from “it rains”, prove “¬¬it rains”.'),
        hint: [T('「¬¬下雨」是「¬下雨 → ⊥」：假设「¬下雨」。', '“¬¬it rains” is “¬it rains → ⊥”: assume “¬it rains”.')],
        solution: proof({ f: ['impI', { A: '¬A' }], m: ['mp', {}, 'f'] }, ['f#body>m.imp', 'p>m.a', 'm>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      rewriting({
        adds: ['rw'],
        tests: [
          { goal: 'Wind ∧ ¬¬Rain', becomes: [['Wind ∧ Rain']] },
          { goal: '¬¬Wet → Slip', becomes: [['Wet → Slip']] },
          { goal: '(Rain ∨ ¬¬Wind) ∧ Wet', becomes: [['(Rain ∨ Wind) ∧ Wet']] },
        ],
        intro: [{ t: T('两个方向都证出来了：¬¬A 和 A 互相推得出，句子里哪一处的 ¬¬A 都能直接换成 A。新元件<part-ref to="part:rw"></part-ref>：接进一条改写规则（证出的两个方向，就是一条改写规则的元件），它在第一个目标里找到第一处对得上规则左边的地方，换成右边。', 'Both directions are proved: ¬¬A and A give each other, so a ¬¬A anywhere in a sentence can simply become A. A new part, <part-ref to="part:rw"></part-ref>: wire a rewrite rule into it (a law proved both ways is a rule part for rewriting), and in the first goal it finds the first place that fits the rule’s left side and puts the right side there.') }],
        brief: T('接一台机器，去掉每个目标里的 ¬¬。', 'Wire a machine that takes the ¬¬ out of each goal.'),
        hint: [T('改写接上双重否定的 ¬¬A ⟼ A。', 'Wire double negation’s ¬¬A ⟼ A into Rewrite.')],
        solution: script(['rw', 'dneg.elim']),
      }),
    ],
    intro: [
      { t: T('上一章的证明器，真值表上每一行都真的话都证得出了。可有一类目标，要做的只是把句子里的一处换成说法不同、意思相同的样子：¬¬下雨 换成 下雨，¬(下雨 ∨ 刮风) 换成 ¬下雨 ∧ ¬刮风。在证明板上，要换句子里面的一处，得把整句拆开、换掉、再一层层拼回去；句子套得越深，拼得越久。', 'Last chapter’s prover proves whatever is true on every row. But some goals only want one place in a sentence swapped for another way of saying the same: ¬¬it rains for it rains, ¬(it rains ∨ it is windy) for ¬it rains ∧ ¬it is windy. On the proof board, changing one place inside a sentence means taking the whole sentence apart, swapping it, and putting it back together level by level; the deeper the sentence, the longer it takes.') },
      { t: T('这一章给证明器装上<wiki-ref to="simplifier"></wiki-ref>：先证出两句话互相推得出，再拿这一对当规则，直接在句子里换。Isabelle 和 Lean 的 simp 都是这样的程序。第一对：¬¬A 和 A。', 'This chapter fits the prover with a <wiki-ref to="simplifier"></wiki-ref>: first prove that two sentences give each other, then use the pair as a rule that swaps them right inside a sentence. Isabelle’s and Lean’s simp are such programs. The first pair: ¬¬A and A.') },
    ],
    after: T('¬¬A ⟼ A 是一条<wiki-ref to="rewrite"></wiki-ref>：左边换成右边，靠的是两边互相推得出。两个方向都证过，<part-ref to="lemma:dneg"></part-ref>的两个形状就都是改写规则。改写只换一处：第一处对得上左边的地方。', '¬¬A ⟼ A is a <wiki-ref to="rewrite"></wiki-ref>: its left side becomes its right side, because the two give each other. Both directions are proved, so both shapes of <part-ref to="lemma:dneg"></part-ref> are rewrite rules. A rewrite changes one place: the first that fits the left side.'),
  },

  // ---------- more laws ----------
  {
    id: 'sp-arrow',
    title: T('去掉箭头', 'Arrows away'),
    builds: 'arrow',
    tasks: [
      prove({
        step: T('箭头变成或者', 'Arrow to or'),
        tests: [{ premises: { p: 'A → B' }, goal: '¬A ∨ B' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Alarm', B: 'Up' }],
        brief: T('实现一个证明器，可以从已知「下雨 → 地湿」，证明出「¬下雨 ∨ 地湿」。', 'Build a prover that, from “it rains → the ground is wet”, proves “¬it rains ∨ the ground is wet”.'),
        hint: [T('下不下雨，两边都讨论。', 'Rain or no rain: take both sides.')],
        solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], m: ['mp', {}, 'e/left'], i1: ['orI', { other: '¬A', side: 'left' }, 'e/left'], i2: ['orI', { other: 'B', side: 'right' }, 'e/right'] }, ['l>e.ab', 'p>m.imp', 'e#left>m.a', 'm>i1.a', 'i1>e.left', 'e#right>i2.a', 'i2>e.right', 'e>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('或者变回箭头', 'Or back to an arrow'),
        tests: [{ premises: { p: '¬A ∨ B' }, goal: 'A → B' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Alarm', B: 'Up' }],
        brief: T('再从「¬下雨 ∨ 地湿」证明出「下雨 → 地湿」。', 'Now from “¬it rains ∨ the ground is wet”, prove “it rains → the ground is wet”.'),
        hint: [T('假设「下雨」，再对已知分情况：「¬下雨」那一种撞出矛盾。', 'Assume “it rains”, then take cases on the given: the “¬it rains” case runs into a contradiction.')],
        solution: proof({ f: ['impI', { A: 'A' }], e: ['orE', {}, 'f'], m: ['mp', {}, 'e/left'], b: ['botE', { C: 'B' }, 'e/left'] }, ['p>e.ab', 'e#left>m.imp', 'f#body>m.a', 'm>b.bot', 'b>e.left', 'e#right>e.right', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      rewriting({
        tests: [
          { goal: '(Rain → Wet) ∧ Wind', becomes: [['(¬Rain ∨ Wet) ∧ Wind']] },
          { goal: '¬(Alarm → Up)', becomes: [['¬(¬Alarm ∨ Up)']] },
          { goal: 'Wind ∨ (Rain → Slip)', becomes: [['Wind ∨ (¬Rain ∨ Slip)']] },
        ],
        brief: T('接一台机器，把每个目标里的「若…则…」换成「或者」。', 'Wire a machine that turns the “if … then …” in each goal into an “or”.'),
        hint: [T('改写接上去掉箭头的 A → B ⟼ ¬A ∨ B。', 'Wire Arrows away’s A → B ⟼ ¬A ∨ B into Rewrite.')],
        solution: script(['rw', 'arrow.elim']),
      }),
    ],
    intro: [{ t: T('「下雨，地就湿」和「没下雨，或者地湿」是一回事：只有下雨却不湿的那一行，两句都假。这一对证出来，句子里的 → 就能换成 ¬ 和 ∨。', '“Rain makes the ground wet” and “it does not rain, or the ground is wet” say the same: only the row where it rains and the ground is dry makes either false. With this pair proved, an → in a sentence can become ¬ and ∨.') }],
    after: T('A → B 和 ¬A ∨ B 互相推得出：从左往右要排中律，从右往左不用。<part-ref to="lemma:arrow"></part-ref>的两个形状，也是两条改写规则。', 'A → B and ¬A ∨ B give each other: left to right takes excluded middle, right to left does not. The two shapes of <part-ref to="lemma:arrow"></part-ref> are two rewrite rules as well.'),
  },
  {
    id: 'sp-dist',
    title: T('分配', 'Distribution'),
    builds: 'dist',
    tasks: [
      prove({
        step: T('分到右边', 'Out over the right'),
        tests: [{ premises: { p: 'A ∨ (B ∧ C)' }, goal: '(A ∨ B) ∧ (A ∨ C)' }],
        cases: THREE,
        brief: T('实现一个证明器，可以从已知「下雨 ∨ (刮风 ∧ 地湿)」，证明出「(下雨 ∨ 刮风) ∧ (下雨 ∨ 地湿)」。', 'Build a prover that, from “it rains ∨ (it is windy ∧ the ground is wet)”, proves “(it rains ∨ it is windy) ∧ (it rains ∨ the ground is wet)”.'),
        hint: [T('对已知分情况：每种情况里各拼一个「并且」。', 'Take cases on the given: in each case, join an “and”.')],
        solution: proof({
          e: ['orE'],
          i1: ['orI', { other: 'B', side: 'right' }, 'e/left'], i2: ['orI', { other: 'C', side: 'right' }, 'e/left'], c1: ['andI', {}, 'e/left'],
          s: ['andE', {}, 'e/right'], j1: ['orI', { other: 'A', side: 'left' }, 'e/right'], j2: ['orI', { other: 'A', side: 'left' }, 'e/right'], c2: ['andI', {}, 'e/right'],
        }, ['p>e.ab', 'e#left>i1.a', 'e#left>i2.a', 'i1>c1.a', 'i2>c1.b', 'c1>e.left', 'e#right>s.ab', 's#left>j1.a', 's#right>j2.a', 'j1>c2.a', 'j2>c2.b', 'c2>e.right', 'e>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('合回来', 'Back together'),
        tests: [{ premises: { p: '(A ∨ B) ∧ (A ∨ C)' }, goal: 'A ∨ (B ∧ C)' }],
        cases: THREE,
        brief: T('再从「(下雨 ∨ 刮风) ∧ (下雨 ∨ 地湿)」证明出「下雨 ∨ (刮风 ∧ 地湿)」。', 'Now from “(it rains ∨ it is windy) ∧ (it rains ∨ the ground is wet)”, prove “it rains ∨ (it is windy ∧ the ground is wet)”.'),
        hint: [T('拆开「并且」，对两句「或者」先后分情况：只有两句都不是「下雨」的那一边，才要拼出「刮风 ∧ 地湿」。', 'Split the “and”, then take cases on the two “or”s in turn: only when neither gives “it rains” must you join “it is windy ∧ the ground is wet”.')],
        solution: proof({
          s: ['andE'], o1: ['orE'],
          i1: ['orI', { other: 'B ∧ C', side: 'right' }, 'o1/left'],
          o2: ['orE', {}, 'o1/right'],
          i2: ['orI', { other: 'B ∧ C', side: 'right' }, 'o2/left'],
          c: ['andI', {}, 'o2/right'], i3: ['orI', { other: 'A', side: 'left' }, 'o2/right'],
        }, ['p>s.ab', 's#left>o1.ab', 'o1#left>i1.a', 'i1>o1.left', 's#right>o2.ab', 'o2#left>i2.a', 'i2>o2.left', 'o1#right>c.a', 'o2#right>c.b', 'c>i3.a', 'i3>o2.right', 'o2>o1.right', 'o1>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('分到左边', 'Out over the left'),
        tests: [{ premises: { p: '(A ∧ B) ∨ C' }, goal: '(A ∨ C) ∧ (B ∨ C)' }],
        cases: THREE,
        brief: T('再从「(下雨 ∧ 刮风) ∨ 地湿」证明出「(下雨 ∨ 地湿) ∧ (刮风 ∨ 地湿)」。', 'Now from “(it rains ∧ it is windy) ∨ the ground is wet”, prove “(it rains ∨ the ground is wet) ∧ (it is windy ∨ the ground is wet)”.'),
        hint: [T('和第一段一样，只是左右换了。', 'As in the first task, left and right swapped.')],
        solution: proof({
          e: ['orE'],
          s: ['andE', {}, 'e/left'], i1: ['orI', { other: 'C', side: 'right' }, 'e/left'], i2: ['orI', { other: 'C', side: 'right' }, 'e/left'], c1: ['andI', {}, 'e/left'],
          j1: ['orI', { other: 'A', side: 'left' }, 'e/right'], j2: ['orI', { other: 'B', side: 'left' }, 'e/right'], c2: ['andI', {}, 'e/right'],
        }, ['p>e.ab', 'e#left>s.ab', 's#left>i1.a', 's#right>i2.a', 'i1>c1.a', 'i2>c1.b', 'c1>e.left', 'e#right>j1.a', 'e#right>j2.a', 'j1>c2.a', 'j2>c2.b', 'c2>e.right', 'e>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('合回来（左边）', 'Back together, on the left'),
        tests: [{ premises: { p: '(A ∨ C) ∧ (B ∨ C)' }, goal: '(A ∧ B) ∨ C' }],
        cases: THREE,
        brief: T('最后从「(下雨 ∨ 地湿) ∧ (刮风 ∨ 地湿)」证明出「(下雨 ∧ 刮风) ∨ 地湿」。', 'Last, from “(it rains ∨ the ground is wet) ∧ (it is windy ∨ the ground is wet)”, prove “(it rains ∧ it is windy) ∨ the ground is wet”.'),
        hint: [T('和第二段一样，只是左右换了。', 'As in the second task, left and right swapped.')],
        solution: proof({
          s: ['andE'], o1: ['orE'],
          o2: ['orE', {}, 'o1/left'],
          c: ['andI', {}, 'o2/left'], i1: ['orI', { other: 'C', side: 'right' }, 'o2/left'],
          i2: ['orI', { other: 'A ∧ B', side: 'left' }, 'o2/right'],
          i3: ['orI', { other: 'A ∧ B', side: 'left' }, 'o1/right'],
        }, ['p>s.ab', 's#left>o1.ab', 's#right>o2.ab', 'o1#left>c.a', 'o2#left>c.b', 'c>i1.a', 'i1>o2.left', 'o2#right>i2.a', 'i2>o2.right', 'o2>o1.left', 'o1#right>i3.a', 'i3>o1.right', 'o1>goal'], { premises: ['p'] }),
      }),
      rewriting({
        tests: [
          { goal: 'Rain ∨ (Wind ∧ Wet)', becomes: [['(Rain ∨ Wind) ∧ (Rain ∨ Wet)']] },
          { goal: '(Sat ∧ Rest) ∨ Happy', becomes: [['(Sat ∨ Happy) ∧ (Rest ∨ Happy)']] },
        ],
        brief: T('接一台机器，把每个目标里的「或者」分配到「并且」上。', 'Wire a machine that distributes the “or” in each goal over the “and”.'),
        hint: [T('两种样子，两条改写规则：几条路的元件，每个框放一张改写。', 'Two shapes, two rewrite rules: Alternatives, with a rewrite in each region.')],
        solution: flow({ ways: [[['rw', 'dist.orAndR']], [['rw', 'dist.orAndL']]] }),
      }),
    ],
    intro: [{ t: T('「下雨，或者又刮风又地湿」和「下雨或刮风，并且下雨或地湿」是一回事：「或者」能分配到「并且」上，就像乘法分配到加法上。「并且」在右边、在左边各一对，四个方向，四段证明，最后一段拿它们改写。', '“It rains, or it is windy and wet” and “it rains or is windy, and it rains or is wet” say the same: “or” distributes over “and”, as multiplication over addition. With the “and” on the right and on the left, that is two pairs, four directions, four proofs, and a last task rewriting with them.') }],
    after: T('四个方向都不用反证法。有了<part-ref to="lemma:dist"></part-ref>，「或者」就能一层层压到「并且」底下去；代价是句子变长：一句分到两边，就抄了两遍。', 'None of the four directions needs proof by contradiction. With <part-ref to="lemma:dist"></part-ref>, “or” can be pushed under “and” level by level; the price is length: a sentence distributed over two sides is written out twice.'),
  },

  // ---------- De Morgan ----------
  {
    id: 'demorgan',
    title: T('德摩根', 'De Morgan'),
    builds: 'dm',
    tasks: [
      prove({
        step: T('并非或者', 'Not either'),
        tests: [{ premises: { p: '¬(A ∨ B)' }, goal: '¬A ∧ ¬B' }],
        cases: DAYS,
        brief: T('实现一个证明器，可以从已知「¬(今天是周六 ∨ 今天是周日)」，证明出「¬今天是周六 ∧ ¬今天是周日」。', 'Build a prover that, from “¬(today is Saturday ∨ today is Sunday)”, proves “¬today is Saturday ∧ ¬today is Sunday”.'),
        hint: [T('「¬今天是周六」怎么来？假设「今天是周六」，看它怎样和已知撞出矛盾。「¬今天是周日」同理。', 'Where does “¬today is Saturday” come from? Assume “today is Saturday” and see how it clashes with the given. “¬today is Sunday” the same way.')],
        solution: proof({
          na: ['impI', { A: 'A' }],
          i: ['orI', { other: 'B', side: 'right' }, 'na'],
          m: ['mp', {}, 'na'],
          nb: ['impI', { A: 'B' }],
          i2: ['orI', { other: 'A', side: 'left' }, 'nb'],
          m2: ['mp', {}, 'nb'],
          c: ['andI'],
        }, ['na#body>i.a', 'p>m.imp', 'i>m.a', 'm>na.body', 'nb#body>i2.a', 'p>m2.imp', 'i2>m2.a', 'm2>nb.body', 'na>c.a', 'nb>c.b', 'c>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('两个都不', 'Neither'),
        tests: [{ premises: { p: '¬A ∧ ¬B' }, goal: '¬(A ∨ B)' }],
        cases: DAYS,
        brief: T('再从「¬今天是周六 ∧ ¬今天是周日」，证明出「¬(今天是周六 ∨ 今天是周日)」。', 'Now from “¬today is Saturday ∧ ¬today is Sunday”, prove “¬(today is Saturday ∨ today is Sunday)”.'),
        hint: [T('要证的是一个否定：假设「今天是周六 ∨ 今天是周日」，两种情况各撞出矛盾。', 'The goal is a negation: assume “today is Saturday ∨ today is Sunday” and get a contradiction in each case.')],
        solution: proof({ f: ['impI', { A: 'A ∨ B' }], e: ['andE'], o: ['orE', {}, 'f'], m1: ['mp', {}, 'o/left'], m2: ['mp', {}, 'o/right'] }, ['p>e.ab', 'f#body>o.ab', 'e#left>m1.imp', 'o#left>m1.a', 'm1>o.left', 'e#right>m2.imp', 'o#right>m2.a', 'm2>o.right', 'o>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('有一个不', 'One fails'),
        tests: [{ premises: { p: '¬A ∨ ¬B' }, goal: '¬(A ∧ B)' }],
        cases: DAYS,
        brief: T('再从「¬今天是周六 ∨ ¬今天是周日」，证明出「¬(今天是周六 ∧ 今天是周日)」。', 'Now from “¬today is Saturday ∨ ¬today is Sunday”, prove “¬(today is Saturday ∧ today is Sunday)”.'),
        hint: [T('假设「今天是周六 ∧ 今天是周日」，拆开它；已知的两种情况，各拿一半撞出矛盾。', 'Assume “today is Saturday ∧ today is Sunday” and split it; in each case of the given, one half runs into a contradiction.')],
        solution: proof({ f: ['impI', { A: 'A ∧ B' }], e: ['andE', {}, 'f'], o: ['orE', {}, 'f'], m1: ['mp', {}, 'o/left'], m2: ['mp', {}, 'o/right'] }, ['f#body>e.ab', 'p>o.ab', 'o#left>m1.imp', 'e#left>m1.a', 'm1>o.left', 'o#right>m2.imp', 'e#right>m2.a', 'm2>o.right', 'o>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('并非两个都', 'Not both'),
        tests: [{ premises: { p: '¬(A ∧ B)' }, goal: '¬A ∨ ¬B' }],
        cases: DAYS,
        brief: T('最后从「¬(今天是周六 ∧ 今天是周日)」，证明出「¬今天是周六 ∨ ¬今天是周日」。', 'Last, from “¬(today is Saturday ∧ today is Sunday)”, prove “¬today is Saturday ∨ ¬today is Sunday”.'),
        hint: [
          T('已知没说是哪一个不成立。用排中律：今天是周六，或者不是。', 'The given does not say which one fails. Use excluded middle: today is Saturday, or it is not.'),
          T('是周六的那一边：再假设今天是周日，拼起来就撞上已知，所以「¬今天是周日」。', 'On the Saturday side: assume it is also Sunday; joined, they run into the given, so “¬today is Sunday”.'),
        ],
        solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], g: ['impI', { A: 'B' }, 'e/left'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'], i1: ['orI', { other: '¬A', side: 'left' }, 'e/left'], i2: ['orI', { other: '¬B', side: 'right' }, 'e/right'] }, ['l>e.ab', 'e#left>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>i1.a', 'i1>e.left', 'e#right>i2.a', 'i2>e.right', 'e>goal'], { premises: ['p'] }),
      }),
      rewriting({
        tests: [{ goal: '¬(Rain ∨ Wind) → Wet', becomes: [['¬Rain ∧ ¬Wind → Wet']] }, { goal: 'Wet ∧ ¬(Sat ∧ Sun)', becomes: [['Wet ∧ (¬Sat ∨ ¬Sun)']] }],
        brief: T('接一台机器，把每个目标里的否定推进括号里。', 'Wire a machine that pushes the negation in each goal inside the brackets.'),
        hint: [T('两种样子，两条改写规则，各放进几条路的一个框。', 'Two shapes, two rewrite rules, one in each region of Alternatives.')],
        solution: flow({ ways: [[['rw', 'dm.notOr']], [['rw', 'dm.notAnd']]] }),
      }),
    ],
    intro: [
      { t: T('「既不是周六也不是周日」和「并非（周六或者周日）」说的是一回事；「并非（周六并且周日）」和「不是周六，或者不是周日」也是。否定穿过「或者」变成「并且」，穿过「并且」变成「或者」：这是<wiki-ref to="demorgan"></wiki-ref>。', '“Neither Saturday nor Sunday” and “not (Saturday or Sunday)” say the same thing; so do “not (Saturday and Sunday)” and “not Saturday, or not Sunday”. A negation passing through “or” becomes “and”, through “and” becomes “or”: these are <wiki-ref to="demorgan"></wiki-ref>.') },
      { t: T('两对说法，每对两个方向，四段任务各证一个；四个方向都证出来以后，它们合成一块元件<part-ref to="lemma:dm"></part-ref>，元件上切换四种形状，每一种也是一条改写规则。最后一段拿它们改写。', 'Two pairs of sayings, each pair two ways round: four tasks, one direction each. Once all four are proved they make one part, <part-ref to="lemma:dm"></part-ref>, which switches between the four shapes, each a rewrite rule too. The last task rewrites with them.') },
    ],
    after: T('四个方向里，只有「并非两个都」要靠排中律：它没说是哪一个，经典逻辑却敢说「总有一个」。否定推进括号，「或者」「并且」互换：有了<part-ref to="lemma:dm"></part-ref>，否定能一层层往里推。', 'Of the four directions, only “not both” rests on excluded middle: it does not say which, yet classical logic dares to say “one of them”. A negation pushed inside the brackets swaps “or” and “and”: with <part-ref to="lemma:dm"></part-ref>, negations can be pushed in level by level.'),
  },
  becomes({
    id: 'sp-back',
    title: T('只从左往右', 'Left to right only'),
    tests: [
      { goal: '¬Rain ∧ ¬Wind → Wet', becomes: [['¬(Rain ∨ Wind) → Wet']] },
      { goal: '¬Wet ∨ ¬Slip', becomes: [['¬(Wet ∧ Slip)']] },
      { goal: 'Happy ∧ (¬Sat ∧ ¬Sun)', becomes: [['Happy ∧ ¬(Sat ∨ Sun)']] },
    ],
    brief: T('接一台机器，把每个目标里的两个否定合成一个，提到括号外面。', 'Wire a machine that makes the two negations in each goal one, outside the brackets.'),
    hint: [T('德摩根的另外两个形状。两种样子，两条改写规则，各放进几条路的一个框。', 'The other two shapes of De Morgan. Two shapes, two rewrite rules, one in each region of Alternatives.')],
    intro: [{ t: T('改写规则只从左往右换：¬(A ∨ B) ⟼ ¬A ∧ ¬B 能把否定推进去，却提不出来。要往外提，得用反过来的那个形状：<part-ref to="lemma:dm"></part-ref>的形状两两相反，每一个都是一条改写规则。', 'A rewrite rule only works left to right: ¬(A ∨ B) ⟼ ¬A ∧ ¬B pushes a negation in, but cannot bring it out. To bring it out takes the opposite shape: the shapes of <part-ref to="lemma:dm"></part-ref> come in opposite pairs, and each is a rewrite rule.') }],
    solution: flow({ ways: [[['rw', 'dm.andNot']], [['rw', 'dm.orNot']]] }),
    after: T('一对互相推得出的句子，两个方向是两条改写规则：往哪边改，就选哪一条。', 'Two sentences that give each other make two rewrite rules, one each way: to change one way, choose that one.'),
  }),
  {
    id: 'q-dm',
    title: T('量词的德摩根', 'De Morgan for quantifiers'),
    tasks: [
      prove({
        step: T('一个都没有', 'Not a single one'),
        tests: [{ premises: { p: '¬∃x. P(x)' }, goal: '∀x. ¬P(x)' }],
        cases: DRINK,
        brief: T('实现一个证明器，可以从已知「¬∃x. x在喝酒」（没有人在喝酒），证明出「∀x. ¬x在喝酒」（人人都没喝）。', 'Build a prover that, from “¬∃x. x is drinking” (nobody is drinking), proves “∀x. ¬x is drinking” (everyone is not drinking).'),
        hint: [T('任取一个 a，假设它在喝酒：它就是一个例子，和已知撞出矛盾。', 'Take any a and suppose it is drinking: then it is an example, and it runs into the given.')],
        solution: proof({ g: ['allI', { x: 'a' }], f: ['impI', { A: 'P(a)' }, 'g'], i: ['exI', {}, 'f'], m: ['mp', {}, 'f'] }, ['f#body>i.a', 'p>m.imp', 'i>m.a', 'm>f.body', 'f>g.body', 'g>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('都不，就是没有', 'All not is none'),
        tests: [{ premises: { p: '∀x. ¬P(x)' }, goal: '¬∃x. P(x)' }],
        cases: DRINK,
        brief: T('再从「∀x. ¬x在喝酒」证明出「¬∃x. x在喝酒」。', 'Now from “∀x. ¬x is drinking”, prove “¬∃x. x is drinking”.'),
        hint: [T('假设有人在喝酒，把他拿出来，再从已知里取他。', 'Suppose someone is drinking, take them out, and take them from the given too.')],
        solution: proof({ f: ['impI', { A: '∃x. P(x)' }], e: ['exE', { x: 'a' }, 'f'], a: ['allE', { t: 'a' }, 'e'], m: ['mp', {}, 'e'] }, ['f#body>e.ex', 'p>a.all', 'a>m.imp', 'e#body>m.a', 'm>e.body', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('有一个不', 'One who does not'),
        tests: [{ premises: { p: '∃x. ¬P(x)' }, goal: '¬∀x. P(x)' }],
        cases: DRINK,
        brief: T('再从「∃x. ¬x在喝酒」（有人没在喝酒），证明出「¬∀x. x在喝酒」（并非人人都在喝酒）。', 'Now from “∃x. ¬x is drinking” (someone is not drinking), prove “¬∀x. x is drinking” (not everyone is drinking).'),
        hint: [T('假设人人都在喝酒，把那个没喝的人拿出来，他也在「人人」里。', 'Suppose everyone is drinking; take out the one who is not, who is among “everyone” too.')],
        solution: proof({ f: ['impI', { A: '∀x. P(x)' }], e: ['exE', { x: 'a' }, 'f'], a: ['allE', { t: 'a' }, 'e'], m: ['mp', {}, 'e'] }, ['p>e.ex', 'f#body>a.all', 'e#body>m.imp', 'a>m.a', 'm>e.body', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('并非人人', 'Not everyone'),
        sentences: ['¬∃x. ¬P(x)'],
        tests: [{ premises: { p: '¬∀x. P(x)' }, goal: '∃x. ¬P(x)' }],
        cases: DRINK,
        brief: T('最后从「¬∀x. x在喝酒」（并非人人都在喝酒），证明出「∃x. ¬x在喝酒」（有人没在喝酒）。', 'Last, from “¬∀x. x is drinking” (not everyone is drinking), prove “∃x. ¬x is drinking” (someone is not drinking).'),
        hint: [
          T('已知里没有一个具体的人可以拿来举例。反过来假设「¬∃x. ¬x在喝酒」：没有人不喝。', 'The given names nobody to use as an example. Suppose the opposite, “¬∃x. ¬x is drinking”: nobody fails to drink.'),
          T('在这个假设下，任取一个 a：要是他没喝，他就是一个「没喝的人」，撞上假设。所以他喝了（反证法），人人都喝，又撞上已知。', 'Under that, take any a: if they were not drinking, they would be someone not drinking, against the supposition. So they drink (by contradiction), everyone drinks, and that runs into the given.'),
        ],
        solution: proof({
          k: ['impI', { A: '¬∃x. ¬P(x)' }],
          g: ['allI', { x: 'a' }, 'k'],
          j: ['impI', { A: '¬P(a)' }, 'g'],
          i: ['exI', {}, 'j'],
          mj: ['mp', {}, 'j'],
          r1: ['raa', {}, 'g'],
          m2: ['mp', {}, 'k'],
          r2: ['raa'],
        }, ['j#body>i.a', 'k#body>mj.imp', 'i>mj.a', 'mj>j.body', 'j>r1.nna', 'r1>g.body', 'p>m2.imp', 'g>m2.a', 'm2>k.body', 'k>r2.nna', 'r2>goal'], { premises: ['p'] }),
      }),
      rewriting({
        tests: [{ goal: '¬∀x. Drinks(x)', becomes: [['∃x. ¬Drinks(x)']] }, { goal: 'Wet ∧ ¬∃x. Sings(x)', becomes: [['Wet ∧ (∀x. ¬Sings(x))']] }],
        brief: T('接一台机器，把每个目标里的否定推过量词。', 'Wire a machine that pushes the negation in each goal past the quantifier.'),
        hint: [T('¬∀ 和 ¬∃ 各一条改写规则，各放进几条路的一个框。', 'One rewrite rule for ¬∀ and one for ¬∃, each in a region of Alternatives.')],
        solution: flow({ ways: [[['rw', 'dm.notAll']], [['rw', 'dm.notEx']]] }),
      }),
    ],
    intro: [
      { t: T('「没有人在喝酒」和「人人都没在喝酒」说的是一回事：否定穿过量词，∃ 就变成 ∀。∃ 像一个很长的「或者」，∀ 像一个很长的「并且」，所以这还是德摩根律，只是穿过的是量词。', '“Nobody is drinking” and “everyone is not drinking” say the same: negation passes through the quantifier and ∃ turns into ∀. ∃ is like a long “or” and ∀ a long “and”, so this is De Morgan’s law again, passing through a quantifier.') },
      { t: T('同样是两对说法、四个方向，最后一段拿它们改写。四个方向都证出来，<part-ref to="lemma:dm"></part-ref>上就多四个形状。', 'Again two pairs, four directions, and the last task rewrites with them. Once all four are proved, <part-ref to="lemma:dm"></part-ref> gains four shapes.') },
    ],
    after: T('前三个方向都不用反证法；「并非人人」要用两次：证出了「有一个」，却说不出是谁。直觉主义逻辑不承认这样的「存在」。<part-ref to="lemma:dm"></part-ref>八个形状都齐了：否定穿过「或者」「并且」「存在」「对所有」，都能互相转换，也都能改写。', 'The first three directions need no proof by contradiction; “not everyone” takes it twice: it proves “there is one” without saying who. Intuitionistic logic does not accept such an “exists”. <part-ref to="lemma:dm"></part-ref> has all eight shapes now: a negation passing through “or”, “and”, “there is” and “for all” turns each into the other, and each rewrites.'),
  },

  // ---------- rewriting itself ----------
  becomes({
    id: 'sp-where',
    title: T('第一处', 'The first place'),
    tests: [
      { goal: '¬¬Rain ∧ ¬¬Wind', becomes: [['Rain ∧ Wind']] },
      { goal: '¬¬(¬¬Rain → Wet)', becomes: [['Rain → Wet']] },
      { goal: '¬¬¬¬Wind', becomes: [['Wind']] },
    ],
    brief: BRIEF,
    hint: [T('一张改写换一处，两处就接两张。', 'One rewrite changes one place: two places, two rewrites.')],
    intro: [{ t: T('一张<part-ref to="part:rw"></part-ref>只换一处。一个句子里对得上的地方不止一处时，它换哪一处？从外往里、从左往右，第一处对得上的。这一关的每个目标里都有两处 ¬¬。', 'One <part-ref to="part:rw"></part-ref> changes one place. When a sentence has more than one place that fits, which does it change? Outside in, left to right: the first place that fits. Each goal here has two ¬¬s.') }],
    solution: script(['rw', 'dneg.elim'], ['rw', 'dneg.elim']),
    after: T('「¬¬¬¬刮风」里，第一张改写换的是最外面的两个 ¬：外面先，里面后；同一层，左边先。', 'In “¬¬¬¬it is windy”, the first rewrite takes the outermost two ¬s: outside before inside, and on one level, left before right.'),
  }),
  becomes({
    id: 'sp-repeat',
    title: T('改到改不动', 'Until nothing fits'),
    tests: [
      { goal: '¬¬Rain', becomes: [['Rain']] },
      { goal: '¬¬Rain ∧ ¬¬Wind', becomes: [['Rain ∧ Wind']] },
      { goal: '¬¬(¬¬Rain ∨ ¬¬¬¬Wind)', becomes: [['Rain ∨ Wind']] },
    ],
    brief: BRIEF,
    hint: [T('<part-ref to="part:repeat"></part-ref>把框里的元件一圈一圈地做下去；改写对不上了，就停在前一圈。', 'A <part-ref to="part:repeat"></part-ref> runs what it holds round after round; when the rewrite no longer fits, it stops at the round before.')],
    intro: [{ t: T('这一回，每个目标里 ¬¬ 的个数都不一样：一处、两处、四处。接几张改写都不对：少了换不完，多了的那张对不上，就失败。', 'This time each goal has a different number of ¬¬s: one, two, four. No number of rewrites will do: too few leave some, and one too many fits nothing and fails.') }],
    solution: flow({ frame: 'repeat', body: [['rw', 'dneg.elim']] }),
    naive: script(['rw', 'dneg.elim'], ['rw', 'dneg.elim']),
    after: T('重复框里一张改写，就是「换到一处都不剩」。改写对不上不算错：它告诉重复框该停了。', 'One rewrite in a repeat frame means “until none is left”. A rewrite that fits nothing is no fault: it tells the frame to stop.'),
  }),

  // ---------- simp ----------
  becomes({
    id: 'sp-simp',
    title: T('几条一起', 'Several at once'),
    builds: 'simp',
    builtWith: { rewrites: 'dneg.elim,dm.notOr,dm.notAnd' },
    tests: [
      { goal: '¬(Rain ∨ ¬Wind)', becomes: [['¬Rain ∧ Wind']] },
      { goal: '¬¬¬(Rain ∧ Wind)', becomes: [['¬Rain ∨ ¬Wind']] },
      { goal: '¬(¬Rain ∨ ¬¬Wind) ∧ Wet', becomes: [['(Rain ∧ ¬Wind) ∧ Wet']] },
      { goal: 'Rain ∧ Wet', becomes: [['Rain ∧ Wet']] },
    ],
    brief: T('接一台机器：去掉双重否定，把否定推进「或者」「并且」，一直改到哪一处都改不动，把每个目标变成要的样子。', 'Wire a machine that takes double negations off and pushes negations into “or” and “and” until nothing more changes, turning each goal into the one wanted.'),
    hint: [T('重复框里放几条路，每个框一张改写。', 'Alternatives in a repeat frame, one rewrite in each region.')],
    intro: [{ t: T('一条规则改到底，是重复框里一张改写。这一关要几条规则一起改：每一圈，哪一条对得上，就用哪一条。这就是<b>化简</b>：一组改写规则，改到哪一条都对不上为止。接出的机器会成为新元件<part-ref to="lemma:simp"></part-ref>，改写规则由接进它的规则元件给出，排在一串里。', 'One rule to the end is one rewrite in a repeat frame. Here several rules work together: each round, whichever fits is used. That is <b>simplification</b>: a set of rewrite rules, used until none fits. The machine you wire becomes a new part, <part-ref to="lemma:simp"></part-ref>, its rewrite rules given by the rule parts wired into it, as a list.') }],
    solution: flow({ frame: 'repeat', body: [{ ways: [[['rw', 'dneg.elim']], [['rw', 'dm.notOr']], [['rw', 'dm.notAnd']]] }] }),
    after: T('重复框套着几条路，每条路一张改写：每一圈用第一条对得上的规则改一处，改到哪一条都对不上。这台机器成了元件<part-ref to="lemma:simp"></part-ref>：接进一串改写规则，它就照这台机器那样改下去。', 'A repeat frame round Alternatives, a rewrite on each way: each round the first rule that fits changes one place, until none fits. This machine is now the part <part-ref to="lemma:simp"></part-ref>: wire a list of rewrite rules into it, and it rewrites just as the machine did.'),
  }),

  // ---------- normal forms ----------
  becomes({
    id: 'sp-nnf',
    title: T('否定范式', 'Negation normal form'),
    tests: [
      { goal: '¬(Rain → Wet)', becomes: [['Rain ∧ ¬Wet']] },
      { goal: '¬(Rain ∧ (Wind → Wet))', becomes: [['¬Rain ∨ (Wind ∧ ¬Wet)']] },
      { goal: '¬∀x. Human(x) → Mortal(x)', becomes: [['∃x. Human(x) ∧ ¬Mortal(x)']] },
      { goal: '¬∃x. Bird(x) ∧ ¬Flies(x)', becomes: [['∀x. ¬Bird(x) ∨ Flies(x)']] },
    ],
    brief: BRIEF,
    hint: [T('去掉箭头、去掉双重否定，再把否定推过「或者」「并且」「存在」「对所有」：这些规则都接进化简。', 'Arrows away, double negation off, and negations pushed past “or”, “and”, “there is” and “for all”: wire all of these into Simp.')],
    intro: [{ t: T('<wiki-ref to="nnf"></wiki-ref>：句子里没有 →，¬ 只贴在最小的那一句上。自动证明器动手之前，先把句子化成这个样子。手里的等价律够不够？', '<wiki-ref to="nnf"></wiki-ref>: no → in the sentence, and every ¬ on a smallest sentence. Automatic provers bring a sentence to this shape before anything else. Do the laws in hand reach it?') }],
    solution: script(['simp', NNF]),
    after: T('化简接进六条规则，任何一句都化得成否定范式。每条规则都是证出的等价律，所以化出来的句子和原来的一定等价。', 'Six rules wired into Simp bring any sentence to negation normal form. Each rule is a law proved both ways, so what comes out is sure to be equivalent to what went in.'),
  }),
  becomes({
    id: 'sp-cnf',
    title: T('合取范式', 'Conjunctive normal form'),
    tests: [
      { goal: 'Rain ∨ (Wind ∧ Wet)', becomes: [['(Rain ∨ Wind) ∧ (Rain ∨ Wet)']] },
      { goal: '¬(Rain ∧ Wind) ∨ (Wet ∧ Slip)', becomes: [['(¬Rain ∨ ¬Wind ∨ Wet) ∧ (¬Rain ∨ ¬Wind ∨ Slip)']] },
      { goal: '(Rain → Wet) ∧ (Wind ∨ (Rain ∧ Slip))', becomes: [['(¬Rain ∨ Wet) ∧ ((Wind ∨ Rain) ∧ (Wind ∨ Slip))']] },
    ],
    brief: BRIEF,
    hint: [T('否定范式的规则后面，再加上分配。', 'After the rules for negation normal form, add distribution.')],
    intro: [{ t: T('<wiki-ref to="cnf"></wiki-ref>：先是否定范式，再让「或者」都在「并且」底下，几串「或者」用「并且」连起来。下一步的自动证明，要的就是这个样子。', '<wiki-ref to="cnf"></wiki-ref>: negation normal form first, then every “or” under the “and”s, a few strings of “or” joined by “and”. Automatic proof wants sentences in just this shape.') }],
    solution: script(['simp', CNF]),
    after: T('化出来的每一串「或者」叫一个<wiki-ref to="clause"></wiki-ref>。分配会让句子变长：一句分到两边，就抄了两遍。', 'Each string of “or” that comes out is called a <wiki-ref to="clause"></wiki-ref>. Distribution makes a sentence longer: one sentence distributed over two sides is written out twice.'),
  }),
  becomes({
    id: 'sp-order',
    title: T('先后', 'Which first'),
    tests: [
      { goal: '¬(Rain ∨ (Wind ∧ Wet))', becomes: [['¬Rain ∧ (¬Wind ∨ ¬Wet)']] },
      { goal: '¬(Rain → (Wind ∧ Wet))', becomes: [['Rain ∧ (¬Wind ∨ ¬Wet)']] },
    ],
    brief: T('接一台机器，把每个目标化成最短的合取范式。', 'Wire a machine that brings each goal to its shortest conjunctive normal form.'),
    hint: [T('否定还在外面的时候先分配，「或者」就分进了否定里面。', 'Distribute while a negation is still outside, and the “or” is distributed inside the negation.')],
    intro: [{ t: T('同一组规则，排的先后不一样，化出来的样子也可能不一样：化简每一圈用的是排在最前、对得上的那一条。这一关要的是最短的合取范式。', 'The same rules in a different order may give a different result: each round, Simp uses the first rule in the line that fits. Here the shortest conjunctive normal form is wanted.') }],
    solution: script(['simp', CNF]),
    naive: script(['simp', ['dist.orAndR', 'dist.orAndL', ...NNF]]),
    after: T('先把否定推到底，再分配，分配就不会在否定里面白做一遍。规则的先后，也是化简的一部分。', 'Push negations all the way in, then distribute, and distribution is not wasted inside a negation. The order of the rules is part of the simplifier too.'),
  }),

  // ---------- challenge ----------
  {
    id: 'drinker',
    kind: 'proof',
    title: T('酒鬼悖论', 'The drinker paradox'),
    tests: [{ goal: '∃x. D(x) → ∀y. D(y)' }],
    cases: [{ D: 'Drinks' }, { D: 'Sings' }],
    brief: T('酒吧里至少有一个人。实现一个证明器，不需要任何已知，就能证明出「∃x. x在喝酒 → ∀y. y在喝酒」：有这么一个人，只要他喝酒，大家就都在喝。', 'There is at least one person in the pub. Build a prover that proves “∃x. x is drinking → ∀y. y is drinking” from nothing given: there is someone such that, if they drink, everyone drinks.'),
    hint: [T('别急着找那个人。先问：是不是大家都在喝？', 'Do not look for that person yet. Ask first: is everyone drinking?')],
    solution: proof({
      l: ['lem', { A: '∀y. D(y)' }],
      e: ['orE'],
      h: ['impI', { A: 'D(a)' }, 'e/left'],
      i1: ['exI', {}, 'e/left'],
      q: ['dm', { form: 'notAll' }, 'e/right'],
      f: ['exE', { x: 'a' }, 'e/right'],
      h2: ['impI', { A: 'D(a)' }, 'f'],
      m3: ['mp', {}, 'h2'],
      b: ['botE', { C: '∀y. D(y)' }, 'h2'],
      i2: ['exI', {}, 'f'],
    }, [
      'l>e.ab', 'e#left>h.body', 'h>i1.a', 'i1>e.left',
      'e#right>q.p0', 'q>f.ex', 'f#body>m3.imp', 'h2#body>m3.a', 'm3>b.bot', 'b>h2.body', 'h2>i2.a', 'i2>f.body', 'f>e.right', 'e>goal',
    ]),
    naive: proof({ h: ['impI', { A: 'D(a)' }], i: ['exI'] }, ['h#body>h.body', 'h>i.a', 'i>goal']),
    after: T('大家都在喝，随便哪个人都行；有人没喝，那个人就是：他没喝，「他喝酒就大家都喝」就空着成立了。这句话听着荒唐，却是经典逻辑的定理，靠的是排中律：不知道是哪种情况，两种都讨论。', 'If everyone drinks, anyone will do; if someone does not, that one will: they do not drink, so “if they drink, everyone does” holds emptily. It sounds absurd, yet it is a theorem of classical logic, resting on excluded middle: not knowing which case holds, take both.'),
  },
]
