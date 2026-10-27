// Chapter 13 · Automation and certificates: the player's own auto searches rule by rule and soon cannot; automatic
// provers turn a problem into clauses and look only for a contradiction. Clause form first, all of it on proof states
// and kernel steps (by contradiction; Simp on the hypotheses, with ↔ out; ∃ taken out; split, a new card), built into
// Into clauses. Then resolution: proved on the proof board, done by hand, one pair at a time, and a round of it in a
// repeat frame built into the saturator. Handed a goal, the two together say whether it follows. Then two lines that
// need nothing from each other: certificates (the saturator's steps replayed by hand, then by the kernel: the
// reconstructor; and someone else's prover caught out) and reflection (a decision procedure defined by equations, run
// by the kernel's computing: rfl). Practice uses the reconstructor on circuits and the problems of chapter 5. The
// islanders come back, many of them; the challenge cancels only what is forced.
import { proof } from '../../kit/domains/logic/build.js'
import { BASIC } from '../../kit/domains/logic/termTree.js'
import { flow, script } from './machines.js'
import { TERM_WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const CLAUSES = [{ name: 'in', label: T('子句', 'Clauses') }]
const machine = (want, inputs = GOAL) => (level) => ({ kind: 'machine', want, inputs, backtrack: true, ...level })
const becomes = machine('becomes')
const proves = machine('proved')
const PROVE = T('接一台机器：证得出的证完；证不出的，停下来说证不出来。', 'Wire a machine that proves what can be proved, and of what cannot, stops and says so.')
// The rewrite rules that bring hypotheses to conjunctive normal form (↔ out first), as chapter 9 lined them up.
const CNF = ['iff.elim', 'arrow.elim', 'dneg.elim', 'dm.notOr', 'dm.notAnd', 'dm.notEx', 'dm.notAll', 'dist.orAndR', 'dist.orAndL']
const HYPS = { at: 'hyps' }
const NEGATE = [['rule', 'raa'], ['rule', 'impI']]
const INTO = [...NEGATE, ['simp', CNF, HYPS], 'skolem', 'toClauses']

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
const PROBLEMS = [T('第一题', 'Problem 1'), T('第二题', 'Problem 2'), T('第三题', 'Problem 3')]
const WRITE = T('用下面的块，拼出这句话的证明项。', 'Build the proof term of this sentence from the pieces below.')
const write = (list) => list.map((task, k) => ({ kind: 'term', step: PROBLEMS[k], brief: WRITE, forms: [...BASIC, 'rfl'], words: DATA, consts: ['p', 'q', 'tt', 'ff'], defs: TAUT, ...task }))

// Islanders in a ring: each calls the next a knave, and the last says the first two are both knaves.
const ring = (n) => {
  const K = 'ABCDEFGHIJ'.split('').slice(0, n).map((c) => `K${c}`)
  return [...K.slice(0, -1).map((k, i) => `${k} ↔ ¬${K[i + 1]}`), `${K.at(-1)} ↔ ¬${K[0]} ∧ ¬${K[1]}`]
}
const ADDER = ['Sum ↔ (InA ∨ InB) ∧ ¬(InA ∧ InB)', 'Carry ↔ InA ∧ InB']

export const automation = [
  // ---------- clause form ----------
  becomes({
    id: 'au-negate',
    title: T('反过来证', 'Proving it backwards'),
    tests: [
      { goal: 'Wet', hyps: ['Rain → Wet', 'Rain'], becomes: [['Rain → Wet; Rain; ¬Wet ⊢ ⊥']] },
      { goal: 'Rain ∨ ¬Rain', becomes: [['¬(Rain ∨ ¬Rain) ⊢ ⊥']] },
      { goal: 'Bus → OnTime', hyps: ['Bus → Up', 'Up → OnTime'], becomes: [['Bus → Up; Up → OnTime; ¬(Bus → OnTime) ⊢ ⊥']] },
    ],
    brief: T('接一台机器：每个目标都变成 ⊥，要证的那句的否定放进已知。', 'Wire a machine that turns each goal into ⊥, with the negation of what was to be proved among the hypotheses.'),
    hint: [T('反证法把要证的 C 变成 ¬¬C，也就是「¬C → ⊥」。', 'By contradiction turns C into ¬¬C, that is “¬C → ⊥”.')],
    intro: [
      { t: T('自己的 auto 一步一步用规则，稍大一点的问题就搜不动。Isabelle 的 sledgehammer 把目标交给外面的<wiki-ref to="automation"></wiki-ref>：它们不管引入还是消去，只做一件事：在一堆句子里找矛盾。要证 C，就假设 ¬C，看能不能推出 ⊥。', 'Your own auto uses rules one step at a time, and soon cannot search a bigger problem. Isabelle’s sledgehammer hands goals to outside programs, each an <wiki-ref to="automation"></wiki-ref>, which know nothing of introduction or elimination and do one thing only: look for a contradiction among a heap of sentences. To prove C, suppose ¬C and see whether ⊥ follows.') },
      { t: T('第一步，在证明状态上把问题翻过来。', 'The first step turns the problem round, on the proof state.') },
    ],
    solution: script(...NEGATE),
    naive: script(['rule', 'raa']),
    after: T('目标成了 ⊥，要证的那句的否定成了一条已知：从这里起，证明器只需要在已知里找矛盾。这两步都是核规则，证完 ⊥，原来的目标就证完了。', 'The goal is ⊥, and the negation of what was to be proved is a hypothesis: from here on, the prover only looks for a contradiction among the hypotheses. Both steps are kernel rules, so proving ⊥ proves the goal.'),
  }),
  {
    id: 'au-iff',
    title: T('去掉等价', 'Equivalence away'),
    builds: 'iff',
    tasks: [
      {
        kind: 'proof',
        step: T('等价变成两串「或者」', 'Equivalence to two ors'),
        tests: [{ premises: { p: 'A ↔ B' }, goal: '(¬A ∨ B) ∧ (¬B ∨ A)' }],
        cases: [{ A: 'Sat', B: 'Rest' }, { A: 'KA', B: 'KB' }],
        brief: T('实现一个证明器，可以从已知「今天是周六 ↔ 我休息」，证明出「(¬今天是周六 ∨ 我休息) ∧ (¬我休息 ∨ 今天是周六)」。', 'Build a prover that, from “today is Saturday ↔ I rest”, proves “(¬today is Saturday ∨ I rest) ∧ (¬I rest ∨ today is Saturday)”.'),
        hint: [T('拆开等价，两个方向各去掉箭头。', 'Split the equivalence and take the arrow out of each direction.')],
        solution: proof({ e: ['andE'], a1: ['arrow'], a2: ['arrow'], c: ['andI'] }, ['p>e.ab', 'e#left>a1.p0', 'e#right>a2.p0', 'a1>c.a', 'a2>c.b', 'c>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('再变回来', 'And back'),
        tests: [{ premises: { p: '(¬A ∨ B) ∧ (¬B ∨ A)' }, goal: 'A ↔ B' }],
        cases: [{ A: 'Sat', B: 'Rest' }, { A: 'KA', B: 'KB' }],
        brief: T('再从「(¬今天是周六 ∨ 我休息) ∧ (¬我休息 ∨ 今天是周六)」证明出「今天是周六 ↔ 我休息」。', 'Now from “(¬today is Saturday ∨ I rest) ∧ (¬I rest ∨ today is Saturday)”, prove “today is Saturday ↔ I rest”.'),
        hint: [T('↔ 就是两个方向的 → 用「并且」连起来。', '↔ is the two directions of → joined by “and”.')],
        solution: proof({ e: ['andE'], a1: ['arrow', { form: 'intro' }], a2: ['arrow', { form: 'intro' }], c: ['andI'] }, ['p>e.ab', 'e#left>a1.p0', 'e#right>a2.p0', 'a1>c.a', 'a2>c.b', 'c>goal'], { premises: ['p'] }),
      },
      becomes({
        step: T('改写', 'Rewrite'),
        tests: [
          { goal: 'Sat ↔ Rest', becomes: [['(¬Sat ∨ Rest) ∧ (¬Rest ∨ Sat)']] },
          { goal: '(KA ↔ ¬KB) ∧ KC', becomes: [['((¬KA ∨ ¬KB) ∧ (¬¬KB ∨ KA)) ∧ KC']] },
        ],
        brief: T('接一台机器，把每个目标里的 ↔ 换成两串「或者」。', 'Wire a machine that turns the ↔ in each goal into two strings of “or”.'),
        hint: [T('改写规则选去掉等价的 A ↔ B ⟼ (¬A ∨ B) ∧ (¬B ∨ A)。', 'Choose Equivalence away’s A ↔ B ⟼ (¬A ∨ B) ∧ (¬B ∨ A) as the rewrite rule.')],
        solution: script(['rw', 'iff.elim']),
      }),
    ],
    intro: [{ t: T('化简器的规则里还没有 ↔。岛民的话都是等价：「a 是骑士」和他说的话同真同假。把它化成「或者」和「并且」，要一对新的等价律。', 'The simplifier’s rules have no ↔ yet, and what the islanders say is all equivalences: “a is a knight” true exactly when what he says is. Bringing it to “or” and “and” takes a new pair of laws.') }],
    after: T('A ↔ B 和 (¬A ∨ B) ∧ (¬B ∨ A) 互相推得出，靠的是<part-ref to="lemma:arrow"></part-ref>的两个形状。<part-ref to="lemma:iff"></part-ref>的两个形状也是两条改写规则。', 'A ↔ B and (¬A ∨ B) ∧ (¬B ∨ A) give each other, by the two shapes of <part-ref to="lemma:arrow"></part-ref>. The two shapes of <part-ref to="lemma:iff"></part-ref> are two rewrite rules as well.'),
  },
  becomes({
    id: 'au-hyps',
    title: T('改已知', 'Rewriting the hypotheses'),
    tests: [
      { goal: '⊥', hyps: ['Rain → Wet', 'Rain', '¬Wet'], becomes: [['¬Rain ∨ Wet; Rain; ¬Wet ⊢ ⊥']] },
      { goal: '⊥', hyps: ['Bus ∨ (Bike ∧ Rain)', '¬(Bus → OnTime)'], becomes: [['(Bus ∨ Bike) ∧ (Bus ∨ Rain); Bus ∧ ¬OnTime ⊢ ⊥']] },
      { goal: '⊥', hyps: ['KA ↔ ¬KB', '¬¬KA'], becomes: [['(¬KA ∨ ¬KB) ∧ (KB ∨ KA); KA ⊢ ⊥']] },
    ],
    brief: T('接一台机器，把每个目标的已知都化成合取范式。', 'Wire a machine that brings every hypothesis of each goal to conjunctive normal form.'),
    hint: [T('<level-ref to="sp-cnf"></level-ref>的规则前面，再加上去掉等价。', 'Put Equivalence away in front of the rules of <level-ref to="sp-cnf"></level-ref>.')],
    intro: [{ t: T('要找矛盾的句子，现在都在已知里，可化简只改目标。化简和改写的卡片上多了一个设定：<b>改哪里</b>，选「已知」，就改第一个目标的已知，从上往下，第一条对得上的那一条。', 'The sentences to search for a contradiction are all among the hypotheses now, but Simp only rewrites the goal. The rewrite and Simp cards gain a setting: <b>where</b>; choose “hypotheses” and they rewrite the first goal’s hypotheses, the first one from the top that a rule fits.') }],
    solution: script(['simp', CNF, HYPS]),
    naive: script(['simp', CNF]),
    after: T('用来改写的都是证出的等价律，改出来的已知和原来的一样强：已知推得出 ⊥，改过的也推得出，反过来也一样。', 'Every rule used is a law proved both ways, so the hypotheses rewritten are exactly as strong as before: if one set gives ⊥, so does the other.'),
  }),
  becomes({
    id: 'au-skolem',
    title: T('∃ 换成函数', '∃ becomes a function'),
    adds: ['skolem'],
    tests: [
      { goal: '⊥', hyps: ['∀x. Bird(x) → Flies(x)', '¬∀x. Bird(x) → Flies(x)'], becomes: [['⋀a. ∀x. ¬Bird(x) ∨ Flies(x); Bird(a) ∧ ¬Flies(a) ⊢ ⊥']] },
      { goal: '⊥', hyps: ['∀x. ∃y. Parent(y, x)'], becomes: [['∀x. Parent(sk1(x), x) ⊢ ⊥']] },
      { goal: '⊥', hyps: ['Human(soc)', '¬∀x. ∃y. Likes(y, x)'], becomes: [['⋀a. Human(soc); ∀y. ¬Likes(y, a) ⊢ ⊥']] },
    ],
    brief: T('接一台机器，把每个目标的已知化成合取范式，再去掉 ∃。', 'Wire a machine that brings each goal’s hypotheses to conjunctive normal form, then takes the ∃s out.'),
    hint: [
      T('¬∀ 先要化成 ∃¬，∃ 才露出来。', '¬∀ must become ∃¬ first, before the ∃ shows.'),
      T('第二个目标里，∃y 在 ∀x 底下：y 跟着 x 变。', 'In the second goal ∃y is under ∀x: y depends on x.'),
    ],
    intro: [{ t: T('子句里只有「对所有」，没有「存在」。已知里的 ∃，前面没有 ∀ 的，就像<part-ref to="part:exE"></part-ref>那样把那一样东西取出来；在 ∀ 底下的不行：「每个人都有父母」，父母是谁跟着这个人变。新元件<part-ref to="part:skolem"></part-ref>把它换成一个新函数 sk1(x)：x 的父母。它只认否定范式里的 ∃。', 'Clauses have only “for all”, no “there is”. An ∃ in a hypothesis with no ∀ outside it is taken out as <part-ref to="part:exE"></part-ref> does; one under a ∀ cannot be: “everyone has a parent”, and who the parent is depends on the person. The new card <part-ref to="part:skolem"></part-ref> puts a new function sk1(x) in its place: the parent of x. It takes only an ∃ in negation normal form.') }],
    solution: script(['simp', CNF, HYPS], 'skolem'),
    naive: script('skolem'),
    after: T('换成<wiki-ref to="skolem"></wiki-ref>以后的已知和原来的<b>不等价</b>：原来只说有这么一个，现在说的是 sk1(x) 就是。可两边同样推得出 ⊥ 或推不出，找矛盾够用了。只是这一步不是已知推出来的，核里做它要选择公理。', 'The hypotheses with a <wiki-ref to="skolem"></wiki-ref> put in are <b>not equivalent</b> to the old ones: those said there is one, these say sk1(x) is it. But each gives ⊥ exactly when the other does, which is all a search for a contradiction needs. Only, this step does not follow from the hypotheses; the kernel would need the axiom of choice for it.'),
  }),
  machine('clauses')({
    id: 'au-clauses',
    title: T('拆成子句', 'Into clauses'),
    builds: 'clausify',
    adds: ['toClauses'],
    tests: [
      { goal: 'Wet', hyps: ['Rain → Wet', 'Rain'], clauses: ['¬Rain ∨ Wet', 'Rain', '¬Wet'] },
      { goal: 'OnTime', hyps: ['Bus ∨ Bike', 'Bus → OnTime', 'Bike → OnTime'], clauses: ['Bus ∨ Bike', '¬Bus ∨ OnTime', '¬Bike ∨ OnTime', '¬OnTime'] },
      { goal: 'Mortal(soc)', hyps: ['∀x. Human(x) → Mortal(x)', 'Human(soc)'], clauses: ['¬Human(x) ∨ Mortal(x)', 'Human(soc)', '¬Mortal(soc)'] },
      { goal: '∀x. Baby(x) → ¬Tamer(x)', hyps: ['∀x. Baby(x) → ¬Logical(x)'], clauses: ['¬Baby(x) ∨ ¬Logical(x)', 'Baby(a)', 'Tamer(a)'] },
    ],
    brief: T('接一台机器，把每个目标拆成子句：要证的那句的否定和已知一起。', 'Wire a machine that splits each goal into clauses: the negation of what is to be proved, with the hypotheses.'),
    hint: [T('反过来证、改已知、Skolem 化，最后拆开。', 'Prove it backwards, rewrite the hypotheses, Skolemise, and split them.')],
    intro: [{ t: T('合取范式里，每一串「或者」叫一条<wiki-ref to="clause"></wiki-ref>。新元件<part-ref to="part:toClauses"></part-ref>把目标是 ⊥ 的证明状态拆成一组子句：线上传的不再是证明状态，而是子句。接出的机器会成为新元件<part-ref to="lemma:clausify"></part-ref>。', 'In conjunctive normal form each string of “or” is a <wiki-ref to="clause"></wiki-ref>. The new card <part-ref to="part:toClauses"></part-ref> splits a proof state whose goal is ⊥ into a set of clauses: what the wire carries is no longer a proof state, but clauses. The machine you wire becomes a new part, <part-ref to="lemma:clausify"></part-ref>.') }],
    solution: flow(...INTO),
    naive: flow(['simp', CNF, HYPS], 'skolem', 'toClauses'),
    after: T('子句里的变量读作「对所有」，取出来的东西成了一个名字。这台机器现在是元件<part-ref to="lemma:clausify"></part-ref>：自动证明器动手之前，先做的就是这一串。', 'A variable in a clause reads as “for all”, and a thing taken out has become a name. This machine is now the part <part-ref to="lemma:clausify"></part-ref>: what an automatic prover does first, before anything else.'),
  }),

  // ---------- resolution ----------
  {
    id: 'au-resolve',
    kind: 'proof',
    title: T('归结', 'Resolution'),
    builds: 'res',
    tests: [{ premises: { p: 'A ∨ B', q: '¬A ∨ C' }, goal: 'B ∨ C' }],
    cases: [{ A: 'Rain', B: 'Bus', C: 'Wet' }, { A: 'Exam', B: 'Rest', C: 'Study' }],
    brief: T('实现一个证明器，可以从已知「下雨 ∨ 我坐公交」和「¬下雨 ∨ 地湿」，证明出「我坐公交 ∨ 地湿」。', 'Build a prover that, from “it rains ∨ I take the bus” and “¬it rains ∨ the ground is wet”, proves “I take the bus ∨ the ground is wet”.'),
    hint: [
      T('对第一句分情况。坐公交的那一边直接拼成 ∨。', 'Take cases on the first. On the bus side, just make the ∨.'),
      T('下雨的那一边，再对第二句分情况：¬下雨和下雨撞出矛盾，矛盾推出一切；地湿那一边拼成 ∨。', 'On the rain side, take cases on the second: ¬it rains clashes with it rains, and from the contradiction anything; on the wet side, make the ∨.'),
    ],
    intro: [{ t: T('子句之间只用一条规则。一条子句里有「下雨」，另一条里有「¬下雨」：下不下雨，总有一条剩下的那一半成立。', 'Between clauses one rule is enough. One clause has “it rains”, the other “¬it rains”: rain or not, what is left of one of them holds.') }],
    solution: proof({
      e: ['orE'],
      e2: ['orE', {}, 'e/left'],
      m: ['mp', {}, 'e2/left'],
      b: ['botE', { C: 'B ∨ C' }, 'e2/left'],
      o: ['orI', { other: 'B', side: 'left' }, 'e2/right'],
      o2: ['orI', { other: 'C', side: 'right' }, 'e/right'],
    }, ['p>e.ab', 'q>e2.ab', 'e2#left>m.imp', 'e#left>m.a', 'm>b.bot', 'b>e2.left', 'e2#right>o.a', 'o>e2.right', 'e2>e.left', 'e#right>o2.a', 'o2>e.right', 'e>goal'], { premises: ['p', 'q'] }),
    after: T('消掉一对相反的文字，剩下的用「或」连起来：这就是<wiki-ref to="resolution"></wiki-ref>，现在是元件<part-ref to="lemma:res"></part-ref>。相反的那一对在子句里的哪个位置都行。', 'Cancel a pair of opposite literals and join what is left with or: that is <wiki-ref to="resolution"></wiki-ref>, now the part <part-ref to="lemma:res"></part-ref>. The opposite pair may stand anywhere in the clauses.'),
  },
  {
    id: 'au-refute',
    title: T('推出空子句', 'Down to the empty clause'),
    tasks: [
      {
        kind: 'proof',
        step: T('两步', 'Two steps'),
        parts: ['res'],
        tests: [{ premises: { p: '¬A ∨ B', q: 'A', r: '¬B' }, goal: '⊥' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Alarm', B: 'Up' }],
        brief: T('实现一个证明器，只用<part-ref to="lemma:res"></part-ref>，从已知「¬下雨 ∨ 地湿」「下雨」「¬地湿」证明出矛盾 ⊥。', 'Build a prover that, with <part-ref to="lemma:res"></part-ref> alone, proves the contradiction ⊥ from “¬it rains ∨ the ground is wet”, “it rains” and “¬the ground is wet”.'),
        hint: [T('「下雨」本身就是一条只有一项的子句。两条子句消完什么都不剩，就是 ⊥。', '“It rains” is itself a clause of one literal. Two clauses that cancel to nothing give ⊥.')],
        solution: proof({ r1: ['res'], r2: ['res'] }, ['q>r1.p0', 'p>r1.p1', 'r1>r2.p0', 'r>r2.p1', 'r2>goal'], { premises: ['p', 'q', 'r'] }),
      },
      {
        kind: 'proof',
        step: T('三步', 'Three steps'),
        parts: ['res'],
        tests: [{ premises: { p: 'A ∨ B', q: '¬A ∨ C', r: '¬B ∨ C', s: '¬C' }, goal: '⊥' }],
        cases: [{ A: 'Bus', B: 'Bike', C: 'OnTime' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('再从「我坐公交 ∨ 我骑车」「¬我坐公交 ∨ 我准时到」「¬我骑车 ∨ 我准时到」「¬我准时到」证明出 ⊥。', 'Now prove ⊥ from “I take the bus ∨ I cycle”, “¬I take the bus ∨ I arrive on time”, “¬I cycle ∨ I arrive on time” and “¬I arrive on time”.'),
        hint: [T('先消掉「我坐公交」，再消掉「我骑车」：两项「我准时到」并成一项。', 'Cancel “I take the bus” first, then “I cycle”: the two “I arrive on time”s become one.')],
        solution: proof({ r1: ['res'], r2: ['res'], r3: ['res'] }, ['p>r1.p0', 'q>r1.p1', 'r1>r2.p0', 'r>r2.p1', 'r2>r3.p0', 's>r3.p1', 'r3>goal'], { premises: ['p', 'q', 'r', 's'] }),
      },
    ],
    intro: [{ t: T('空子句里一个文字都没有，没有一项可能为真：它就是矛盾 ⊥。每一步只问一件事：哪两条子句里有一对相反的文字？', 'The empty clause has no literal in it, nothing that could be true: it is the contradiction ⊥. Each step asks just one thing: which two clauses hold a pair of opposite literals?') }],
    after: T('坐公交也好，骑车也好，都准时到：这是<level-ref to="cases"></level-ref>的分情况。归结把分情况、套用和矛盾压成了一个动作。', 'Bus or bike, I arrive on time: the case split of <level-ref to="cases"></level-ref>. Resolution folds cases, Apply and contradiction into one move.'),
  },
  {
    id: 'au-onepair',
    kind: 'truth',
    ask: 'sat',
    title: T('一次只消一对', 'One pair at a time'),
    formulas: ['(Rain ∨ Wind) ∧ (¬Rain ∨ ¬Wind)'],
    brief: T('在真值表里找一行，让「下雨 ∨ 刮风」和「¬下雨 ∨ ¬刮风」都为真。', 'Find a row of the truth table where “it rains ∨ it is windy” and “¬it rains ∨ ¬it is windy” are both true.'),
    hint: [T('只下雨不刮风，两条各是什么？', 'Rain without wind: what is each clause?')],
    intro: [{ t: T('<part-ref to="lemma:res"></part-ref>碰到两对能消的，会拒绝。「下雨 ∨ 刮风」和「¬下雨 ∨ ¬刮风」里就有两对相反的文字：要是一次把两对都消掉，就什么都不剩了，好像推出了矛盾。为什么不能一起消？', '<part-ref to="lemma:res"></part-ref> refuses when two pairs could cancel. “It rains ∨ it is windy” and “¬it rains ∨ ¬it is windy” hold two such pairs: cancel both at once and nothing is left, as if a contradiction followed. Why not cancel both?') }],
    after: T('下雨不刮风的那一行，两条子句都真：它们不矛盾。只消一对，得到的是「刮风 ∨ ¬刮风」这种永远成立的话，没用；两对一起消，就错了。', 'On the row with rain and no wind both clauses are true: they do not contradict each other. Cancelling one pair gives something like “it is windy ∨ ¬it is windy”, always true and of no use; cancelling both at once is wrong.'),
  },
  machine('decide', CLAUSES)({
    id: 'au-saturate',
    title: T('饱和器', 'The saturator'),
    builds: 'saturate',
    adds: ['resolve'],
    tests: [
      { clauses: ['Bus ∨ Bike', '¬Bus ∨ OnTime', '¬Bike ∨ OnTime', '¬OnTime'] },
      { clauses: ['Alarm', '¬Alarm ∨ Up', '¬Up ∨ Coffee', '¬Coffee ∨ Awake', '¬Awake'] },
      { clauses: ['Bus ∨ Bike', '¬Bus ∨ OnTime', '¬OnTime'] },
      { clauses: ['¬Human(x) ∨ Mortal(x)', 'Human(soc)', '¬Mortal(soc)'] },
    ],
    brief: T('接一台机器：推得出 ⊥ 的，推出来；推不出的，一直归结到再也没有新子句。', 'Wire a machine that reaches ⊥ where it follows, and where it does not, resolves until no new clause appears.'),
    hint: [T('归结一圈还不够：放进重复框。', 'One round of resolution is not enough: put it in a repeat frame.')],
    intro: [
      { t: T('<level-ref to="au-refute"></level-ref>里，每一步消哪一对是你挑的。机器不会挑：新元件<part-ref to="part:resolve"></part-ref>把每一对能消的都消一次，新子句加进来，记下它从哪两条来。', 'In <level-ref to="au-refute"></level-ref> you picked the pair to cancel at each step. A machine does not pick: the new card <part-ref to="part:resolve"></part-ref> cancels every pair that can be cancelled once, adding each new clause with the two it came from.') },
      { t: T('子句里有变量时，一对文字先合一，再消：「¬x是人 ∨ x会死」和「苏格拉底是人」，x 合一成苏格拉底。接出的机器会成为新元件<part-ref to="lemma:saturate"></part-ref>。', 'When clauses have variables, a pair of literals is unified first, then cancelled: “¬x is human ∨ x is mortal” and “Socrates is human”, with x unified to Socrates. The machine you wire becomes a new part, <part-ref to="lemma:saturate"></part-ref>.') },
    ],
    solution: flow({ frame: 'repeat', body: ['resolve'] }),
    naive: flow('resolve'),
    after: T('一直归结到推出 ⊥ 或者推不出新东西：这台机器是<b>饱和器</b>，现在是元件<part-ref to="lemma:saturate"></part-ref>。它不挑，会推出很多用不着的子句；可只要推得出矛盾，它就一定推得出来：归结有<wiki-ref to="refutation"></wiki-ref>。推不出 ⊥ 就停下来的，这组子句能同时成立。', 'Resolving until ⊥ appears or nothing new does: this machine is the <b>saturator</b>, now the part <part-ref to="lemma:saturate"></part-ref>. It does not pick, so it makes many clauses it does not need; but whenever a contradiction can be reached, it reaches it: resolution has <wiki-ref to="refutation"></wiki-ref>. When it stops without ⊥, the clauses can all hold at once.'),
  }),
  {
    id: 'au-sledge',
    title: T('交给证明器', 'Hand it to the prover'),
    tasks: [
      machine('decide')({
        step: T('证明器', 'The prover'),
        tests: [
          { goal: 'Wet', hyps: ['Rain → Wet', 'Rain'] },
          { goal: 'Rain', hyps: ['Rain → Wet', 'Wet'] },
          { goal: 'Mortal(soc)', hyps: ['∀x. Human(x) → Mortal(x)', 'Human(soc)'] },
          { goal: 'OnTime', hyps: ['Bus → OnTime', 'Bike ∨ Bus'] },
        ],
        brief: T('接一台机器：目标推得出，就推出 ⊥；推不出，就饱和到再没有新子句。', 'Wire a machine: where the goal follows, reach ⊥; where it does not, saturate until no new clause appears.'),
        hint: [T('<part-ref to="lemma:clausify"></part-ref>，再<part-ref to="lemma:saturate"></part-ref>。', '<part-ref to="lemma:clausify"></part-ref>, then <part-ref to="lemma:saturate"></part-ref>.')],
        solution: flow('clausify', 'saturate'),
        naive: flow('clausify', 'resolve'),
      }),
      {
        kind: 'truth',
        step: T('读出那一行', 'Read the row'),
        ask: 'counter',
        formulas: ['(Bus → OnTime) ∧ (Bike ∨ Bus) → OnTime'],
        intro: [{ t: T('最后一个目标，机器饱和完也没有推出 ⊥。', 'On the last goal, the machine saturated without reaching ⊥.') }],
        brief: T('找出一行，让已知都成立，要证的那句却不成立。', 'Find a row where the hypotheses all hold and the goal does not.'),
        hint: [T('饱和以后只有一个文字的子句，一条条读出来就是那一行。', 'The one-literal clauses after saturating, read one by one, give the row.')],
      },
    ],
    intro: [{ t: T('化成子句，再饱和：一个目标交给它，它就说得出推得出还是推不出。', 'Into clauses, then saturate: hand it a goal, and it can tell whether the goal follows.') }],
    after: T('没准时到，所以没坐公交，所以骑了车：机器停下来没有 ⊥，饱和的子句就写着一个反例。可它推出 ⊥ 时说的话，只有它自己信：机器板上的子句不是核证出来的。', 'Not on time, so not the bus, so the bike: when the machine stops without ⊥, the saturated clauses spell out a counterexample. But when it reaches ⊥, only the machine vouches for it: clauses on the machine board are not proved by the kernel.'),
  },

  // ---------- certificates ----------
  {
    id: 'au-cert',
    title: T('证书', 'The certificate'),
    tasks: [
      machine('refuted')({
        step: T('机器找', 'The machine finds'),
        tests: [{ goal: 'Coffee', hyps: ['Alarm → Up', 'Up → Coffee', 'Alarm'] }],
        brief: T('接一台机器，从「闹钟响了 → 我起床了」「我起床了 → 我喝了咖啡」「闹钟响了」推出 ⊥，看结果里的证书。', 'Wire a machine that reaches ⊥ from “the alarm rings → I get up”, “I get up → I drink coffee” and “the alarm rings”, and look at the certificate in the result.'),
        hint: [T('和<level-ref to="au-sledge"></level-ref>里的机器一样。', 'The same machine as in <level-ref to="au-sledge"></level-ref>.')],
        solution: flow('clausify', 'saturate'),
      }),
      {
        kind: 'proof',
        step: T('照着重放', 'Replay it'),
        parts: ['res'],
        tests: [{ premises: { p: '¬A ∨ B', q: '¬B ∨ C', r: 'A', s: '¬C' }, goal: '⊥' }],
        cases: [{ A: 'Alarm', B: 'Up', C: 'Coffee' }],
        brief: T('照机器的证书，在证明板上用<part-ref to="lemma:res"></part-ref>重放：从这四条子句推出 ⊥。', 'Replay the machine’s certificate on the proof board with <part-ref to="lemma:res"></part-ref>: ⊥ from these four clauses.'),
        hint: [T('证书里的第 6 条由第 1、3 条来，第 7 条由第 2、4 条来，⊥ 由第 6、7 条来。', 'In the certificate clause 6 comes from 1 and 3, clause 7 from 2 and 4, and ⊥ from 6 and 7.')],
        solution: proof({ r1: ['res'], r2: ['res'], r3: ['res'] }, ['p>r1.p0', 'r>r1.p1', 'q>r2.p0', 's>r2.p1', 'r1>r3.p0', 'r2>r3.p1', 'r3>goal'], { premises: ['p', 'q', 'r', 's'] }),
      },
    ],
    intro: [{ t: T('饱和器推出了几十条子句，推出 ⊥ 用到的只有几条。每条推出来的子句都记着它从哪两条来，顺着 ⊥ 往回找，就是一份<wiki-ref to="certificate"></wiki-ref>：哪两条消出哪一条。', 'The saturator makes dozens of clauses, and ⊥ needs only a few. Each clause made records the two it came from; following ⊥ back gives a <wiki-ref to="certificate"></wiki-ref>: which two cancel into which.') }],
    after: T('机器在一大堆子句里找，你只要照着证书接三张卡片。找证明难，查证明容易：外面的证明器只要交出证书，信不信由核来查。', 'The machine searched a heap of clauses; you only wired three cards along the certificate. Finding a proof is hard and checking one is easy: an outside prover need only hand over its certificate, and the kernel decides whether to believe it.'),
  },
  proves({
    id: 'au-replay',
    title: T('让核重放', 'Let the kernel replay it'),
    builds: 'metis',
    adds: ['replay'],
    tests: [
      { goal: 'Coffee', hyps: ['Alarm → Up', 'Up → Coffee', 'Alarm'] },
      { goal: 'OnTime', hyps: ['Bus ∨ Bike', 'Bus → OnTime', 'Bike → OnTime'] },
      { goal: 'Mortal(soc)', hyps: ['∀x. Human(x) → Mortal(x)', 'Human(soc)'] },
      { goal: '¬Rain', hyps: ['Rain → Wet', '¬Wet'] },
    ],
    brief: T('接一台机器，证完每一个目标：机器找证书，核来重放。', 'Wire a machine that proves every goal: the machine finds a certificate, the kernel replays it.'),
    hint: [T('饱和器后面接重放。', 'Replay after the saturator.')],
    intro: [{ t: T('新元件<part-ref to="part:replay"></part-ref>把证书交给核：用到的已知子句要是从已知拆出来的，每一步要由它的两条父子句用你的 auto 证出来。都过了，子句拆出来的那个目标就证完了。接出的机器会成为新元件<part-ref to="lemma:metis"></part-ref>。', 'The new card <part-ref to="part:replay"></part-ref> hands the certificate to the kernel: each input clause used must come out of a hypothesis, and each step must be proved from its two parents by your auto. If all pass, the goal the clauses came from is proved. The machine you wire becomes a new part, <part-ref to="lemma:metis"></part-ref>.') }],
    solution: flow('clausify', 'saturate', 'replay'),
    naive: flow('clausify', 'saturate'),
    after: T('找证书的可以是任何程序，再快再乱都行，只要交出证书；证完目标的是核。这台机器现在是元件<part-ref to="lemma:metis"></part-ref>。', 'Whatever finds the certificate may be any program, however fast or messy, as long as it hands one over; what proves the goal is the kernel. This machine is now the part <part-ref to="lemma:metis"></part-ref>.'),
  }),
  {
    id: 'au-wrong',
    title: T('证明器错了', 'The prover is wrong'),
    tasks: [
      machine('fails')({
        step: T('重放', 'Replay'),
        parts: ['clausify', 'replay'],
        // Someone else's prover is on the board already: the player wires around it.
        preset: ['c1'],
        tests: [
          { goal: 'Wet', hyps: ['Rain ∨ Wind', '¬Rain ∨ ¬Wind'] },
          { goal: 'Late', hyps: ['Bus ∨ ¬Up', 'Up ∨ ¬Bus'] },
        ],
        adds: ['oracle'],
        brief: T('接一台机器，把<part-ref to="part:oracle"></part-ref>的证书交给核重放。', 'Wire a machine that hands the certificate of <part-ref to="part:oracle"></part-ref> to the kernel to replay.'),
        hint: [T('化成子句，别人的证明器，重放。', 'Into clauses, the other prover, replay.')],
        solution: flow('clausify', 'oracle', 'replay'),
      }),
      {
        kind: 'truth',
        step: T('找出那一行', 'Find the row'),
        ask: 'counter',
        formulas: ['(Rain ∨ Wind) ∧ (¬Rain ∨ ¬Wind) → Wet'],
        intro: [{ t: T('核不认第一个目标的证书。', 'The kernel would not take the first goal’s certificate.') }],
        brief: T('找一行，说明第一个目标确实推不出来：已知都成立，要证的不成立。', 'Find a row showing the first goal really does not follow: the hypotheses hold, the goal does not.'),
        hint: [T('<level-ref to="au-onepair"></level-ref>里那一行，再让地是干的。', 'The row of <level-ref to="au-onepair"></level-ref>, with the ground dry.')],
      },
    ],
    intro: [{ t: T('别人给了一个证明器，说它比饱和器快得多。快，是因为它两条子句之间有几对相反的文字就一起消掉。', 'Someone hands over a prover, said to be far faster than the saturator. It is fast because it cancels every opposite pair two clauses have, all at once.') }, { t: T('它就是<part-ref to="part:oracle"></part-ref>：每个目标它都推出了 ⊥。', 'It is <part-ref to="part:oracle"></part-ref>: it reaches ⊥ on every goal.') }],
    after: T('证明器错了，核不会跟着错：重放到它一次消两对的那一步，核证不出来，目标就没有证完。外面的证明器有多少错，都造不出假定理。', 'The prover is wrong, and the kernel does not follow it: at the step where it cancels two pairs at once, the kernel cannot prove the clause, and the goal stays unproved. However many mistakes an outside prover makes, it cannot make a false theorem.'),
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
    hint: [T('化简里排上这一关所有的定义，最后两边一样，用自反。', 'Line up every definition of this level in Simp; when both sides are alike, use Reflexivity.')],
    intro: [
      { t: T('另一条路不找证书。公式本身也能写成数据：Or p (Not p) 是一样东西，eval f a b 按定义算出它在 p 取 a、q 取 b 那一行的真假，taut f 把四行都算一遍。这是一个<wiki-ref to="decision"></wiki-ref>：判定一句话是不是永远成立。', 'The other road looks for no certificate. A formula can be written as data too: Or p (Not p) is a thing, eval f a b works out by the definitions whether it is true on the row where p is a and q is b, and taut f works out all four rows. It is a <wiki-ref to="decision"></wiki-ref>: it decides whether a sentence always holds.') },
    ],
    solution: script(['simp', ALL_DEFS], ['rule', 'refl']),
    naive: script(['rule', 'refl']),
    after: T('判定程序是用定义写成的，化简按定义一路算下去，算出真就是真，算出假就是假。真值表就是这样一个程序。', 'The decision procedure is written as definitions, and Simp works it out by them all the way: true comes out true, false comes out false. A truth table is just such a program.'),
  }),
  {
    id: 'rf-decide',
    title: T('让核来算', 'Let the kernel compute'),
    tasks: write([
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
    tasks: write([
      { premises: { sound: SOUND, complete: COMPLETE }, goal: '¬Taut(conj(p, q))', given: 'sound rfl', answer: 'complete rfl', hint: [T('先点检查，看核把 taut 算成了什么。', 'Check first and see what the kernel works taut out to.')] },
      { premises: { sound: SOUND, complete: COMPLETE }, goal: '¬Taut(disj(p, q))', answer: 'complete rfl', naive: 'sound rfl', hint: [T('p 和 q 都假的那一行呢？', 'What of the row where p and q are both false?')] },
      { premises: { sound: SOUND, complete: COMPLETE }, goal: 'Taut(disj(q, neg(q))) ∧ ¬Taut(q)', answer: '⟨sound rfl, complete rfl⟩', hint: [T('一对，两边各算一次。', 'A pair, each side worked out once.')] },
    ]),
    intro: [{ t: T('已知 complete 说：taut x 算出假，x 就不是永远成立。判定程序两个方向都回答。', 'The given complete says: if taut x works out false, x does not always hold. The decision procedure answers both ways.') }],
    after: T('rfl 只认算得出的等式：taut 算出假，sound rfl 就不过。判定程序不会出错地说「是」：要么核算出真，要么算出假，没有第三种。', 'rfl takes only equations that work out: when taut works out false, sound rfl does not pass. The decision procedure cannot wrongly say “yes”: the kernel works out true or false, and there is no third way.'),
  },

  // ---------- practice ----------
  proves({
    id: 'au-adder',
    title: T('半加器', 'A half adder'),
    tests: [
      { goal: '¬(Sum ∧ Carry)', hyps: ADDER },
      { goal: 'Carry → InA', hyps: ADDER },
      { goal: 'Sum → InA', hyps: ADDER, want: 'fails' },
      { goal: 'InA ∧ InB → Carry ∧ ¬Sum', hyps: ADDER },
    ],
    brief: PROVE,
    hint: [T('一张<part-ref to="lemma:metis"></part-ref>就够。', 'One <part-ref to="lemma:metis"></part-ref> is enough.')],
    intro: [{ t: T('一块电路可以写成几句等价：每根输出线和它的输入。和位是「两个输入恰好一个是 1」，进位是「两个输入都是 1」。电路的性质，就是由这几句推得出的话。', 'A circuit can be written as equivalences: each output wire against its inputs. The sum bit is “exactly one input is 1”, the carry bit “both inputs are 1”. A property of the circuit is what follows from them.') }],
    solution: flow('metis'),
    after: T('和位和进位不会同时是 1；进位是 1，两个输入都是 1。可「和位是 1，a 就是 1」推不出来：b 是 1 也行。芯片设计里检查电路，用的正是这一套。', 'The sum and carry are never both 1; a carry of 1 means both inputs are 1. But “a sum of 1 means a is 1” does not follow: b being 1 will do. Checking circuits in chip design works just this way.'),
  }),
  proves({
    id: 'au-machine',
    title: T('机器来证', 'Let the machine prove it'),
    tests: [
      { goal: 'Anc(ann, cy)', hyps: ['∀x. ∀y. ∀z. Anc(x, y) ∧ Anc(y, z) → Anc(x, z)', 'Anc(ann, bo)', 'Anc(bo, cy)'] },
      { goal: '∀x. Baby(x) → ¬Tamer(x)', hyps: ['∀x. Baby(x) → ¬Logical(x)', '∀x. Tamer(x) → Respected(x)', '∀x. ¬Logical(x) → ¬Respected(x)'] },
      { goal: 'Flies(ann)', hyps: ['∀x. Bird(x) → Flies(x)', 'Bird(bo)'], want: 'fails' },
    ],
    brief: PROVE,
    hint: [T('还是一张<part-ref to="lemma:metis"></part-ref>。', 'Still one <part-ref to="lemma:metis"></part-ref>.')],
    intro: [{ t: T('<level-ref to="q-ancestor"></level-ref>和<level-ref to="s-carroll"></level-ref>你亲手证过。交给机器。', 'You proved <level-ref to="q-ancestor"></level-ref> and <level-ref to="s-carroll"></level-ref> by hand. Hand them to the machine.') }],
    solution: flow('metis'),
    after: T('亲手接线时，取谁、先拆哪一句要你来想；机器把问题化成子句，合一替你取，证书交给核查。最后一题推不出：博是鸟，安是不是鸟，没有说。', 'Wiring by hand, you had to think which thing to take and what to split first; the machine turns the problem into clauses, unification does the taking, and the certificate goes to the kernel. The last does not follow: Bo is a bird, and whether Ann is, nobody said.'),
  }),

  // ---------- topic: the islanders, many of them ----------
  proves({
    id: 'is-three',
    title: T('三个人', 'Three islanders'),
    tests: [
      { goal: '¬KA', hyps: ['KA ↔ ¬KB', 'KB ↔ ¬KC', 'KC ↔ ¬KA ∧ ¬KB'] },
      { goal: 'KB', hyps: ['KA ↔ ¬KB', 'KB ↔ ¬KC', 'KC ↔ ¬KA ∧ ¬KB'] },
      { goal: '¬KC', hyps: ['KA ↔ ¬KB', 'KB ↔ ¬KC', 'KC ↔ ¬KA ∧ ¬KB'] },
    ],
    brief: T('a 说：「b 是无赖。」b 说：「c 是无赖。」c 说：「a 和 b 都是无赖。」接一台机器，证出每个人的身份。', 'a says: “b is a knave.” b says: “c is a knave.” c says: “a and b are both knaves.” Wire a machine that proves what each of them is.'),
    hint: [T('每个目标问一个人。', 'Each goal asks about one person.')],
    intro: [{ t: T('<level-ref to="e-three"></level-ref>里，这三个人的话接成电路，把八行都跑了一遍；<level-ref to="kk-three"></level-ref>里你亲手证过。这一次，交给机器。', 'In <level-ref to="e-three"></level-ref> these three people’s words were wired as a circuit and run on all eight rows; in <level-ref to="kk-three"></level-ref> you proved it by hand. This time, hand them to the machine.') }],
    solution: flow('metis'),
    after: T('答案和真值表一样：a 和 c 是无赖，b 是骑士。不同的是，机器没有排八行，它只在子句之间找矛盾，再把证书交给核。', 'The answer is the truth table’s: a and c are knaves, b a knight. The difference is that the machine never laid out eight rows; it only looked for contradictions among clauses, then handed the certificate to the kernel.'),
  }),
  proves({
    id: 'is-silent',
    title: T('推不出的', 'What does not follow'),
    tests: [
      { goal: '¬KC', hyps: ['KA ↔ ¬KB', 'KC ↔ (KA ↔ KB)'] },
      { goal: 'KA', hyps: ['KA ↔ ¬KB', 'KC ↔ (KA ↔ KB)'], want: 'fails' },
      { goal: 'KB', hyps: ['KA ↔ ¬KB', 'KC ↔ (KA ↔ KB)'], want: 'fails' },
    ],
    brief: T('a 说：「b 是无赖。」b 什么也没说。c 说：「a 和 b 是同一种人。」接一台机器：证得出的证完，证不出的说证不出来。', 'a says: “b is a knave.” b says nothing. c says: “a and b are the same kind.” Wire a machine that proves what can be proved and says so of what cannot.'),
    hint: [T('不是每个人的身份都定得下来。', 'Not everyone’s kind can be settled.')],
    solution: flow('metis'),
    after: T('c 一定是无赖：a 说 b 是无赖，a 和 b 就不是同一种人，c 说错了。可 a 和 b 谁是骑士，推不出来：两种都对得上。饱和器停下来没有 ⊥，就是在说「不一定」。', 'c must be a knave: a calls b a knave, so a and b are not the same kind, and c is wrong. But which of a and b is the knight does not follow: both fit. The saturator stopping without ⊥ is it saying “not necessarily”.'),
  }),
  proves({
    id: 'is-ten',
    title: T('十个人', 'Ten islanders'),
    tests: [{ goal: 'KA', hyps: ring(10) }, { goal: '¬KB', hyps: ring(10) }, { goal: '¬KJ', hyps: ring(10) }],
    brief: T('十个人排成一圈：a 说「b 是无赖」，b 说「c 是无赖」，……，i 说「j 是无赖」，j 说「a 和 b 都是无赖」。接一台机器，证出几个人的身份。', 'Ten people in a ring: a says “b is a knave”, b says “c is a knave”, …, i says “j is a knave”, and j says “a and b are both knaves”. Wire a machine that proves what some of them are.'),
    hint: [T('还是同一台机器。', 'Still the same machine.')],
    solution: flow('metis'),
    after: T('十个人的真值表有 1024 行。机器从二十来条子句出发，推出几百条，就找到了矛盾。现代的 SAT 求解器做的也是这件事，只是更会挑先消哪一对，能处理上百万个字母。', 'Ten people make a truth table of 1024 rows. The machine starts from about twenty clauses, makes a few hundred, and finds the contradiction. Modern SAT solvers do just this, only far better at picking which pair to cancel first, and handle millions of letters.'),
  }),

  // ---------- challenge ----------
  machine('refuted', CLAUSES)({
    id: 'au-horn',
    title: T('只标被迫的', 'Only what is forced'),
    tests: [
      { clauses: ['Alarm', '¬Alarm ∨ Up', '¬Up ∨ Coffee', '¬Coffee ∨ Awake', '¬Awake ∨ OnTime', '¬OnTime', '¬Rain ∨ Wet', '¬Wet ∨ Slip', '¬Slip ∨ Late', '¬Bus ∨ ¬Bike ∨ Late'], budget: 17 },
      { clauses: ['Exam', '¬Exam ∨ Study', '¬Study ∨ Pass', '¬Pass ∨ Happy', '¬Happy', '¬Hungry ∨ Eat', '¬Eat ∨ Full', '¬Full ∨ Rest', '¬Rest ∨ Sat'], budget: 16 },
    ],
    brief: T('接一台机器推出 ⊥，子句的条数不能超过每组测试的限额。', 'Wire a machine that reaches ⊥ without making more clauses than each test allows.'),
    hint: [
      T('每条子句里至多一个不带 ¬ 的文字（Horn 子句），一开始就有只有一个文字的子句。', 'Each clause has at most one literal without ¬ (Horn clauses), and some clauses have a single literal from the start.'),
      T('只有一个文字的子句，就是已经被迫的事。', 'A one-literal clause is something already forced.'),
    ],
    intro: [{ t: T('饱和器每一圈把每一对都消一遍，大部分新子句用不上。这些子句有一种特别的样子；推出 ⊥ 的时候，子句不能多。', 'Each round the saturator cancels every pair, and most new clauses are never used. These clauses have a special shape, and ⊥ must be reached without making many.') }],
    adds: ['resolve'],
    solution: flow({ frame: 'repeat', body: [['resolve', null, { unit: 'unit' }]] }),
    naive: flow('saturate'),
    after: T('只和单项子句消：每一步把一件被迫的事往下传。对 Horn 子句这就够了，而且快：SAT 求解器里的<wiki-ref to="unit"></wiki-ref>做的就是这件事。', 'Cancelling only with one-literal clauses passes one forced fact along at each step. For Horn clauses that is enough, and fast: <wiki-ref to="unit"></wiki-ref> in a SAT solver does just this.'),
  }),
]
