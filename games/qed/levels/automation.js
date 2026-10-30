// Chapter 11 · Automation and certificates: the player's own auto searches rule by rule and soon cannot; automatic
// provers turn a problem into clauses and look only for a contradiction. Clause form first, all of it on proof states
// and kernel steps (by contradiction; Simp on the hypotheses, with ↔ out; ∃ taken out; split, a new card), built into
// Into clauses. Then resolution: proved on the proof board, done by hand, one pair at a time, and a round of it in a
// repeat frame built into the saturator. Handed a goal, the two together say whether it follows. Then two lines that
// need nothing from each other: certificates (the saturator's steps replayed by hand, then by the kernel: the
// reconstructor; and someone else's prover caught out). Practice uses the reconstructor on circuits and the problems of
// chapter 6. The islanders come back, many of them; at the end, the liar grows into what no machine can do, the
// barber to the halting problem; the challenge cancels only what is forced.
import { proof } from '../../kit/domains/logic/build.js'
import { flow, script } from './machines.js'

const T = (zh, en) => ({ zh, en })
const GOAL = [{ name: 'in', label: T('目标', 'Goal') }]
const CLAUSES = [{ name: 'in', label: T('子句', 'Clauses') }]
const machine = (want, inputs = GOAL) => (level) => ({ kind: 'machine', want, inputs, backtrack: true, ...level })
const becomes = machine('becomes')
const proves = machine('proved')
const PROVE = T('设计一个证明助手：推得出的目标证出来，推不出的报告失败。', 'Design a proof assistant that proves the goals that follow and reports failure on those that do not.')
// The rewrite rules that bring hypotheses to conjunctive normal form (↔ out first), as chapter 10 lined them up.
const CNF = ['iff.elim', 'arrow.elim', 'dneg.elim', 'dm.notOr', 'dm.notAnd', 'dm.notEx', 'dm.notAll', 'dist.orAndR', 'dist.orAndL']
const HYPS = { at: 'hyps' }
const NEGATE = [['rule', 'raa'], ['rule', 'impI']]
const INTO = [...NEGATE, ['simp', CNF, HYPS], 'skolem', 'toClauses']


// Islanders in a ring: each calls the next a knave, and the last says the first two are both knaves.
const ring = (n) => {
  const K = 'ABCDEFGHIJ'.split('').slice(0, n).map((c) => `K${c}`)
  return [...K.slice(0, -1).map((k, i) => `${k} ↔ ¬${K[i + 1]}`), `${K.at(-1)} ↔ ¬${K[0]} ∧ ¬${K[1]}`]
}
// The liar made bigger: from X ↔ Y and Y ↔ ¬X, the liar X ↔ ¬X, then ⊥. Its cards go in `region`.
const liarOf = (two, region) => ({
  nodes: {
    s1: ['andE', {}, region], s2: ['andE', {}, region],
    c1: ['chain', {}, region], c2: ['chain', {}, region],
    j: ['andI', {}, region], l: ['liar', {}, region],
  },
  wires: [`${two[0]}>s1.ab`, `${two[1]}>s2.ab`, 's1#left>c1.p0', 's2#left>c1.p1', 's2#right>c2.p0', 's1#right>c2.p1', 'c1>j.a', 'c2>j.b', 'j>l.p0'],
})
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
    brief: T('设计一个证明助手：每个目标都变成 ⊥，要证的那句的否定放进已知。', 'Design a proof assistant that turns each goal into ⊥, with the negation of what was to be proved among the hypotheses.'),
    hint: [T('<part-ref to="part:raa"></part-ref>把要证的 C 变成 ¬¬C，也就是 ¬C → ⊥。', '<part-ref to="part:raa"></part-ref> turns C into ¬¬C, that is, ¬C → ⊥.')],
    intro: [
      { t: T('auto 逐条套用规则，目标一大就搜不动了。<wiki-ref to="automation"></wiki-ref>走另一条路：要证 C，先假设 ¬C，再在已知里找矛盾。Isabelle 的 Sledgehammer 就把目标交给这样的证明器。', 'Auto applies rules one at a time and bogs down as goals grow. An <wiki-ref to="automation"></wiki-ref> takes another road: to prove C, assume ¬C and look for a contradiction among the hypotheses. Isabelle’s Sledgehammer hands goals to provers of this kind.') },
    ],
    solution: script(...NEGATE),
    naive: script(['rule', 'raa']),
  }),
  {
    id: 'au-iff',
    title: T('等价展开', 'Equivalence away'),
    builds: 'iff',
    tasks: [
      {
        kind: 'proof',
        step: T('等价变成两串「或者」', 'Equivalence to two ors'),
        tests: [{ premises: { p: 'A ↔ B' }, goal: '(¬A ∨ B) ∧ (¬B ∨ A)' }],
        cases: [{ A: 'Sat', B: 'Rest' }, { A: 'KA', B: 'KB' }],
        hint: [T('先拆开等价，两个方向分别处理。', 'Split the equivalence first, then deal with each direction.')],
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
        brief: T('设计一个证明助手，把每个目标里的 ↔ 换成两串「或者」。', 'Design a proof assistant that turns the ↔ in each goal into two strings of “or”.'),
        hint: [T('<part-ref to="lemma:iff"></part-ref>的每个形状也是一条改写规则。', 'Each shape of <part-ref to="lemma:iff"></part-ref> is a rewrite rule too.')],
        solution: script(['rw', 'iff.elim']),
      }),
    ],
    intro: [{ t: T('化简器还没有 ↔ 的改写规则，而岛民谜题里，身份和他说的话之间正是 ↔。', 'The simplifier has no rewrite rule for ↔ yet, and in the islander puzzles ↔ is just what joins an islander’s kind to his words.') }],
  },
  becomes({
    id: 'au-hyps',
    title: T('改已知', 'Rewriting the hypotheses'),
    tests: [
      { goal: '⊥', hyps: ['Rain → Wet', 'Rain', '¬Wet'], becomes: [['¬Rain ∨ Wet; Rain; ¬Wet ⊢ ⊥']] },
      { goal: '⊥', hyps: ['Bus ∨ (Bike ∧ Rain)', '¬(Bus → OnTime)'], becomes: [['(Bus ∨ Bike) ∧ (Bus ∨ Rain); Bus ∧ ¬OnTime ⊢ ⊥']] },
      { goal: '⊥', hyps: ['KA ↔ ¬KB', '¬¬KA'], becomes: [['(¬KA ∨ ¬KB) ∧ (KB ∨ KA); KA ⊢ ⊥']] },
    ],
    brief: T('设计一个证明助手，把每个目标的已知都化成合取范式。', 'Design a proof assistant that brings every hypothesis of each goal to conjunctive normal form.'),
    hint: [
      T('<level-ref to="sp-cnf"></level-ref>的那串规则对付不了 ↔。', 'The rules of <level-ref to="sp-cnf"></level-ref> cannot deal with ↔.'),
      T('在那串规则最前面加上<part-ref to="lemma:iff"></part-ref>。', 'Put <part-ref to="lemma:iff"></part-ref> at the front of those rules.'),
    ],
    intro: [{ t: T('要找矛盾的句子都在已知里，化简器却只改过目标。「改哪里」设成「已知」，改写和化简就从上往下查第一个目标的已知，改第一处对得上的。', 'The sentences to search now sit among the hypotheses, but the simplifier has only ever rewritten goals. With Where set to Hypotheses, Rewrite and Simp look through the first goal’s hypotheses from the top and change the first place that fits.') }],
    solution: script(['simp', CNF, HYPS]),
    naive: script(['simp', CNF]),
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
    brief: T('设计一个证明助手，把每个目标的已知化成合取范式，再去掉 ∃。', 'Design a proof assistant that brings each goal’s hypotheses to conjunctive normal form, then takes the ∃s out.'),
    hint: [
      T('¬∀ 先要化成 ∃¬，∃ 才露出来。', '¬∀ must become ∃¬ first, before the ∃ shows.'),
      T('第二个目标里，∃y 在 ∀x 底下：y 跟着 x 变。', 'In the second goal ∃y is under ∀x: y depends on x.'),
    ],
    intro: [{ t: T('子句里只有「对所有」，没有「存在」。已知里的 ∃ 外面没有 ∀ 时，可以像<part-ref to="part:exE"></part-ref>那样取出那一样东西；在 ∀ 底下就不行：「每个人都有父母」，父母随人而变。新元件「Skolem 化」把这样的 ∃ 换成一个<wiki-ref to="skolem"></wiki-ref>，比如 sk1(x)：x 的父母。它只认否定范式里的 ∃。', 'Clauses have only “for all”, no “there is”. An ∃ in a hypothesis with no ∀ outside it can be taken out as <part-ref to="part:exE"></part-ref> does; one under a ∀ cannot: “everyone has a parent”, and the parent depends on the person. The new card “Skolemise” replaces such an ∃ with a <wiki-ref to="skolem"></wiki-ref>, say sk1(x), the parent of x. It takes only an ∃ in negation normal form.') }],
    solution: script(['simp', CNF, HYPS], 'skolem'),
    naive: script('skolem'),
    after: T('Skolem 化前后的已知并不等价，只是同时可满足、同时不可满足，称为<b>等可满足</b>。', 'Skolemising does not keep the hypotheses equivalent, only satisfiable together or not at all: they are <b>equisatisfiable</b>.'),
  }),
  machine('clauses')({
    id: 'au-clauses',
    title: T('子句化', 'Into clauses'),
    builds: 'clausify',
    adds: ['toClauses', 'skolem'],
    tests: [
      { goal: 'Wet', hyps: ['Rain → Wet', 'Rain'], clauses: ['¬Rain ∨ Wet', 'Rain', '¬Wet'] },
      { goal: 'OnTime', hyps: ['Bus ∨ Bike', 'Bus → OnTime', 'Bike → OnTime'], clauses: ['Bus ∨ Bike', '¬Bus ∨ OnTime', '¬Bike ∨ OnTime', '¬OnTime'] },
      { goal: 'Mortal(soc)', hyps: ['∀x. Human(x) → Mortal(x)', 'Human(soc)'], clauses: ['¬Human(x) ∨ Mortal(x)', 'Human(soc)', '¬Mortal(soc)'] },
      { goal: '∀x. Baby(x) → ¬Tamer(x)', hyps: ['∀x. Baby(x) → ¬Logical(x)'], clauses: ['¬Baby(x) ∨ ¬Logical(x)', 'Baby(a)', 'Tamer(a)'] },
    ],
    brief: T('设计一个证明助手，把每个目标拆成子句：要证的那句的否定和已知一起。', 'Design a proof assistant that splits each goal into clauses: the negation of what is to be proved, with the hypotheses.'),
    hint: [
      T('本章前面几关的步骤，依次接上。', 'The steps of this chapter so far, one after another.'),
      T('<level-ref to="au-negate"></level-ref>、<level-ref to="au-hyps"></level-ref>、<level-ref to="au-skolem"></level-ref>，最后「析出子句」。', '<level-ref to="au-negate"></level-ref>, <level-ref to="au-hyps"></level-ref>, <level-ref to="au-skolem"></level-ref>, and last “Into clauses”.'),
    ],
    intro: [{ t: T('新元件「析出子句」把目标是 ⊥ 的证明状态拆开，每一串「或者」一条<wiki-ref to="clause"></wiki-ref>：从这里起，线上传的是子句，不再是证明状态。', 'The new card “Into clauses” takes a proof state whose goal is ⊥ apart, one <wiki-ref to="clause"></wiki-ref> for each string of “or”: from here on, the wire carries clauses, no longer proof states.') }],
    solution: flow(...INTO),
    naive: flow(['simp', CNF, HYPS], 'skolem', 'toClauses'),
  }),

  // ---------- resolution ----------
  {
    id: 'au-resolve',
    kind: 'proof',
    title: T('归结', 'Resolution'),
    builds: 'res',
    tests: [{ premises: { p: 'A ∨ B', q: '¬A ∨ C' }, goal: 'B ∨ C' }],
    cases: [{ A: 'Rain', B: 'Bus', C: 'Wet' }, { A: 'Exam', B: 'Rest', C: 'Study' }],
    hint: [
      T('对第一句分情况。', 'Take cases on the first.'),
      T('下雨的那一边，再对第二句分情况。', 'On the rain side, take cases on the second.'),
    ],
    intro: [{ t: T('子句之间只用一条规则。一条子句里有「下雨」，另一条里有「¬下雨」：下不下雨，总有一条去掉这一项后剩下的部分成立。', 'Between clauses one rule is enough. One clause has “it rains”, the other “¬it rains”: rain or not, one of them still holds with that literal taken away.') }],
    solution: proof({
      e: ['orE'],
      e2: ['orE', {}, 'e/left'],
      m: ['mp', {}, 'e2/left'],
      b: ['botE', { C: 'B ∨ C' }, 'e2/left'],
      o: ['orI', { other: 'B', side: 'left' }, 'e2/right'],
      o2: ['orI', { other: 'C', side: 'right' }, 'e/right'],
    }, ['p>e.ab', 'q>e2.ab', 'e2#left>m.imp', 'e#left>m.a', 'm>b.bot', 'b>e2.left', 'e2#right>o.a', 'o>e2.right', 'e2>e.left', 'e#right>o2.a', 'o2>e.right', 'e>goal'], { premises: ['p', 'q'] }),
    after: T('这条规则叫<wiki-ref to="resolution"></wiki-ref>。', 'This rule is called <wiki-ref to="resolution"></wiki-ref>.'),
  },
  {
    id: 'au-refute',
    adds: ['res'],
    title: T('推出空子句', 'Down to the empty clause'),
    tasks: [
      {
        kind: 'proof',
        step: T('两步', 'Two steps'),
        parts: ['res'],
        tests: [{ premises: { p: '¬A ∨ B', q: 'A', r: '¬B' }, goal: '⊥' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Alarm', B: 'Up' }],
        briefNote: T('只用「归结」。', 'With “Resolve” alone.'),
        hint: [T('「下雨」本身就是一条只有一项的子句。', '“It rains” is itself a clause of one literal.')],
        solution: proof({ r1: ['res'], r2: ['res'] }, ['q>r1.p0', 'p>r1.p1', 'r1>r2.p0', 'r>r2.p1', 'r2>goal'], { premises: ['p', 'q', 'r'] }),
      },
      {
        kind: 'proof',
        step: T('三步', 'Three steps'),
        parts: ['res'],
        tests: [{ premises: { p: 'A ∨ B', q: '¬A ∨ C', r: '¬B ∨ C', s: '¬C' }, goal: '⊥' }],
        cases: [{ A: 'Bus', B: 'Bike', C: 'OnTime' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('再从「我坐公交 ∨ 我骑车」「¬我坐公交 ∨ 我准时到」「¬我骑车 ∨ 我准时到」「¬我准时到」证明出 ⊥。', 'Now prove ⊥ from “I take the bus ∨ I cycle”, “¬I take the bus ∨ I arrive on time”, “¬I cycle ∨ I arrive on time” and “¬I arrive on time”.'),
        hint: [T('两项相同的文字会并成一项。', 'Two copies of the same literal merge into one.')],
        solution: proof({ r1: ['res'], r2: ['res'], r3: ['res'] }, ['p>r1.p0', 'q>r1.p1', 'r1>r2.p0', 'r>r2.p1', 'r2>r3.p0', 's>r3.p1', 'r3>goal'], { premises: ['p', 'q', 'r', 's'] }),
      },
    ],
    intro: [{ t: T('空子句里一个文字都没有，没有一项可能为真：它就是矛盾 ⊥。', 'The empty clause has no literal in it, nothing that could be true: it is the contradiction ⊥.') }],
  },
  {
    id: 'au-onepair',
    kind: 'truth',
    ask: 'sat',
    title: T('一次只消一对', 'One pair at a time'),
    formulas: ['(Rain ∨ Wind) ∧ (¬Rain ∨ ¬Wind)'],
    brief: T('在真值表里找一行，让「下雨 ∨ 刮风」和「¬下雨 ∨ ¬刮风」都为真。', 'Find a row of the truth table where “it rains ∨ it is windy” and “¬it rains ∨ ¬it is windy” are both true.'),
    hint: [T('试试只下雨、不刮风的那一行。', 'Try the row with rain and no wind.')],
    intro: [{ t: T('「归结」碰到两对能消的文字，会拒绝。「下雨 ∨ 刮风」和「¬下雨 ∨ ¬刮风」里就有两对：一次都消掉，什么都不剩，好像推出了矛盾。为什么不能一起消？', '“Resolve” refuses when two pairs could cancel. “It rains ∨ it is windy” and “¬it rains ∨ ¬it is windy” hold two: cancel both at once and nothing is left, as if a contradiction followed. Why not cancel both?') }],
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
    brief: T('设计一个证明助手：推得出 ⊥ 的，推出来；推不出的，一直归结到再也没有新子句。', 'Design a proof assistant that reaches ⊥ where it follows, and where it does not, resolves until no new clause appears.'),
    hint: [
      T('一轮之后，新子句之间可能还有能消的。', 'After one round, the new clauses may still have pairs to cancel.'),
      T('<part-ref to="part:repeat"></part-ref>。', '<part-ref to="part:repeat"></part-ref>.'),
    ],
    intro: [
      { t: T('在<level-ref to="au-refute"></level-ref>里，每一步消哪一对由你挑。证明助手不挑：新元件「一轮归结」把能消的每一对都消一次，新子句加进来，并记下它由哪两条得出。子句里有变量时，一对文字先合一再消：「¬x是人 ∨ x会死」和「苏格拉底是人」，x 合一为苏格拉底。', 'In <level-ref to="au-refute"></level-ref> you chose which pair to cancel at each step. A proof assistant does not choose: the new card “a round of resolution” cancels every pair that can be cancelled, once, adding each new clause along with the two it came from. When clauses have variables, a pair of literals is unified first, then cancelled: “¬x is human ∨ x is mortal” and “Socrates is human”, with x unified to Socrates.') },
    ],
    solution: flow({ frame: 'repeat', body: ['resolve'] }),
    naive: flow('resolve'),
    after: T('归结具有<wiki-ref to="refutation"></wiki-ref>。', 'Resolution has <wiki-ref to="refutation"></wiki-ref>.'),
  }),
  {
    id: 'au-sledge',
    adds: ['saturate', 'clausify'],
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
        brief: T('设计一个证明助手，直接从目标出发：推得出的推出 ⊥，推不出的一直归结到再没有新子句。', 'Design a proof assistant that starts from the goal itself: where the goal follows, reach ⊥; where it does not, resolve until no new clause appears.'),
        hint: [T('本章已经搭出了两个证明助手。', 'This chapter has already built two proof assistants.')],
        solution: flow('clausify', 'saturate'),
        naive: flow('clausify', 'resolve'),
      }),
      {
        kind: 'truth',
        step: T('读出那一行', 'Read the row'),
        ask: 'counter',
        formulas: ['(Bus → OnTime) ∧ (Bike ∨ Bus) → OnTime'],
        intro: [{ t: T('最后一个目标，证明助手饱和完也没有推出 ⊥。', 'On the last goal, the proof assistant saturated without reaching ⊥.') }],
        brief: T('找出一行，让已知都成立，要证的那句却不成立。', 'Find a row where the hypotheses all hold and the goal does not.'),
        hint: [T('看饱和以后只有一个文字的子句。', 'Look at the one-literal clauses after saturating.')],
      },
    ],
    after: T('证明助手推出的 ⊥ 只有它自己担保：子句不是核证出来的。', 'A ⊥ reached by the proof assistant is vouched for by nothing but itself: the clauses were not proved by the kernel.'),
  },

  // ---------- certificates ----------
  {
    id: 'au-cert',
    adds: ['saturate', 'clausify', 'res'],
    title: T('证书', 'The certificate'),
    tasks: [
      machine('refuted')({
        step: T('证明助手找', 'The proof assistant finds'),
        tests: [{ goal: 'Coffee', hyps: ['Alarm → Up', 'Up → Coffee', 'Alarm'] }],
        brief: T('设计一个证明助手，从「闹钟响了 → 我起床了」「我起床了 → 我喝了咖啡」「闹钟响了」推出 ⊥，看结果里的证书。', 'Design a proof assistant that reaches ⊥ from “the alarm rings → I get up”, “I get up → I drink coffee” and “the alarm rings”, and look at the certificate in the result.'),
        hint: [T('<level-ref to="au-sledge"></level-ref>的证明助手就够用。', 'The proof assistant of <level-ref to="au-sledge"></level-ref> will do.')],
        solution: flow('clausify', 'saturate'),
      }),
      {
        kind: 'proof',
        step: T('照着重放', 'Replay it'),
        parts: ['res'],
        tests: [{ premises: { p: '¬A ∨ B', q: '¬B ∨ C', r: 'A', s: '¬C' }, goal: '⊥' }],
        cases: [{ A: 'Alarm', B: 'Up', C: 'Coffee' }],
        brief: T('照证明助手的证书，在证明板上用「归结」从这四条子句推出 ⊥。', 'Following the proof assistant’s certificate, use “Resolve” on the proof board to get ⊥ from these four clauses.'),
        hint: [T('证书里每一条推出的子句都写着它的两条来源。', 'Each clause in the certificate names the two it came from.')],
        solution: proof({ r1: ['res'], r2: ['res'], r3: ['res'] }, ['p>r1.p0', 'r>r1.p1', 'q>r2.p0', 's>r2.p1', 'r1>r3.p0', 'r2>r3.p1', 'r3>goal'], { premises: ['p', 'q', 'r', 's'] }),
      },
    ],
    intro: [{ t: T('饱和器推出几十条子句，推出 ⊥ 用到的只有几条。从 ⊥ 顺着来源往回找，得到的就是一份<wiki-ref to="certificate"></wiki-ref>：哪两条消出哪一条。', 'The saturator makes dozens of clauses, and ⊥ needs only a few. Tracing ⊥ back through where each clause came from gives a <wiki-ref to="certificate"></wiki-ref>: which two cancel into which.') }],
    after: T('找证明难，查证明容易。', 'Finding a proof is hard; checking one is easy.'),
  },
  proves({
    id: 'au-replay',
    title: T('让核重放', 'Let the kernel replay it'),
    builds: 'metis',
    adds: ['replay', 'saturate', 'clausify'],
    tests: [
      { goal: 'Coffee', hyps: ['Alarm → Up', 'Up → Coffee', 'Alarm'] },
      { goal: 'OnTime', hyps: ['Bus ∨ Bike', 'Bus → OnTime', 'Bike → OnTime'] },
      { goal: 'Mortal(soc)', hyps: ['∀x. Human(x) → Mortal(x)', 'Human(soc)'] },
      { goal: '¬Rain', hyps: ['Rain → Wet', '¬Wet'] },
    ],
    brief: T('设计一个证明助手，证完每一个目标：证明助手找证书，核来重放。', 'Design a proof assistant that proves every goal: the proof assistant finds a certificate, the kernel replays it.'),
    hint: [T('证书要先有人找出来，再交给核。', 'Someone has to find the certificate before the kernel can have it.')],
    intro: [{ t: T('新元件「重放」把证书交给核：用到的子句要确实由已知拆出，每一步要由 auto 从它的两条来源证出。全部通过，子句所来自的目标就证完了。', 'The new card “Replay” hands the certificate to the kernel: each clause used must really come out of a hypothesis, and each step must be proved by auto from the two it came from. If all pass, the goal the clauses came from is proved.') }],
    solution: flow('clausify', 'saturate', 'replay'),
    naive: flow('clausify', 'saturate'),
    after: T('Isabelle 里，Sledgehammer 找到的证明也由 metis 交给核重放。', 'In Isabelle, proofs found by Sledgehammer are likewise replayed in the kernel by metis.'),
  }),
  {
    id: 'au-wrong',
    adds: ['replay', 'clausify'],
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
        brief: T('设计一个证明助手，把外部证明器的证书交给核重放。', 'Design a proof assistant that hands the certificate of someone else’s prover to the kernel to replay.'),
        hint: [T('外部证明器只替换找证书的那一步。', 'The other prover stands in only for the step that finds the certificate.')],
        solution: flow('clausify', 'oracle', 'replay'),
      }),
      {
        kind: 'truth',
        step: T('找出那一行', 'Find the row'),
        ask: 'counter',
        formulas: ['(Rain ∨ Wind) ∧ (¬Rain ∨ ¬Wind) → Wet'],
        intro: [{ t: T('核不认第一个目标的证书。', 'The kernel would not take the first goal’s certificate.') }],
        brief: T('找一行，说明第一个目标确实推不出来：已知都成立，要证的不成立。', 'Find a row showing the first goal really does not follow: the hypotheses hold, the goal does not.'),
        hint: [T('想想<level-ref to="au-onepair"></level-ref>。', 'Think back to <level-ref to="au-onepair"></level-ref>.')],
      },
    ],
    intro: [{ t: T('有人给了一个证明器，据说比饱和器快得多：两条子句之间有几对相反的文字，它就一起消掉。它已经摆在板上，每个目标它都推出了 ⊥。', 'Someone hands over a prover said to be far faster than the saturator: it cancels every opposite pair two clauses share, all at once. It is on the board already, and it reaches ⊥ on every goal.') }],
    after: T('外部证明器也落在<wiki-ref to="lcf"></wiki-ref>的设计里：要信的只有核。', 'Outside provers fall within the <wiki-ref to="lcf"></wiki-ref> design too: only the kernel need be trusted.'),
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
    hint: [T('<part-ref to="lemma:metis"></part-ref>。', '<part-ref to="lemma:metis"></part-ref>.')],
    intro: [{ t: T('一块电路可以写成几句等价，每根输出线对应它的输入：和位是「两个输入恰好一个是 1」，进位是「两个输入都是 1」。电路的性质，就是由这几句推得出的话。', 'A circuit can be written as equivalences, one per output wire against its inputs: the sum bit is “exactly one input is 1”, the carry bit “both inputs are 1”. A property of the circuit is whatever follows from them.') }],
    solution: flow('metis'),
    after: T('芯片设计里的<b>形式验证</b>，检查电路也是这个思路。', '<b>Formal verification</b> in chip design checks circuits in this spirit.'),
  }),
  proves({
    id: 'au-machine',
    title: T('证明助手来证', 'Let the proof assistant prove it'),
    tests: [
      { goal: 'Anc(ann, cy)', hyps: ['∀x. ∀y. ∀z. Anc(x, y) ∧ Anc(y, z) → Anc(x, z)', 'Anc(ann, bo)', 'Anc(bo, cy)'] },
      { goal: '∀x. Baby(x) → ¬Tamer(x)', hyps: ['∀x. Baby(x) → ¬Logical(x)', '∀x. Tamer(x) → Respected(x)', '∀x. ¬Logical(x) → ¬Respected(x)'] },
      { goal: 'Flies(ann)', hyps: ['∀x. Bird(x) → Flies(x)', 'Bird(bo)'], want: 'fails' },
    ],
    brief: PROVE,
    hint: [T('<part-ref to="lemma:metis"></part-ref>。', '<part-ref to="lemma:metis"></part-ref>.')],
    intro: [{ t: T('<level-ref to="q-ancestor"></level-ref>和<level-ref to="s-carroll"></level-ref>都亲手证过，这一次交给证明助手。', '<level-ref to="q-ancestor"></level-ref> and <level-ref to="s-carroll"></level-ref> were proved by hand; this time, hand them to the proof assistant.') }],
    solution: flow('metis'),
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
    brief: T('a 说：「b 是无赖。」b 说：「c 是无赖。」c 说：「a 和 b 都是无赖。」设计一个证明助手，证出每个人的身份。', 'a says: “b is a knave.” b says: “c is a knave.” c says: “a and b are both knaves.” Design a proof assistant that proves what each of them is.'),
    intro: [{ t: T('这三个人，<level-ref to="e-three"></level-ref>里接成电路跑遍了八行，<level-ref to="kk-three"></level-ref>里亲手证过。这一次交给证明助手。', 'These three were wired as a circuit and run on all eight rows in <level-ref to="e-three"></level-ref>, and proved by hand in <level-ref to="kk-three"></level-ref>. This time, hand them to the proof assistant.') }],
    solution: flow('metis'),
  }),
  proves({
    id: 'is-silent',
    title: T('推不出的', 'What does not follow'),
    tests: [
      { goal: '¬KC', hyps: ['KA ↔ ¬KB', 'KC ↔ (KA ↔ KB)'] },
      { goal: 'KA', hyps: ['KA ↔ ¬KB', 'KC ↔ (KA ↔ KB)'], want: 'fails' },
      { goal: 'KB', hyps: ['KA ↔ ¬KB', 'KC ↔ (KA ↔ KB)'], want: 'fails' },
    ],
    brief: T('a 说：「b 是无赖。」b 什么也没说。c 说：「a 和 b 是同一种人。」设计一个证明助手：推得出的身份证出来，推不出的报告失败。', 'a says: “b is a knave.” b says nothing. c says: “a and b are the same kind.” Design a proof assistant that proves what follows about them and reports failure on what does not.'),
    hint: [T('不是每个人的身份都定得下来。', 'Not everyone’s kind can be settled.')],
    solution: flow('metis'),
  }),
  proves({
    id: 'is-ten',
    title: T('十个人', 'Ten islanders'),
    tests: [{ goal: 'KA', hyps: ring(10) }, { goal: '¬KB', hyps: ring(10) }, { goal: '¬KJ', hyps: ring(10) }],
    brief: T('十个人排成一圈：a 说「b 是无赖」，b 说「c 是无赖」，……，i 说「j 是无赖」，j 说「a 和 b 都是无赖」。设计一个证明助手，证出几个人的身份。', 'Ten people in a ring: a says “b is a knave”, b says “c is a knave”, …, i says “j is a knave”, and j says “a and b are both knaves”. Design a proof assistant that proves what some of them are.'),
    hint: [T('证明助手不必改。', 'The proof assistant need not change.')],
    solution: flow('metis'),
    after: T('十个人的真值表有 1024 行。判定这类问题的程序叫 <b>SAT 求解器</b>，能处理的变量数以百万计。', 'The truth table for ten people has 1024 rows. Programs that decide problems like this are called <b>SAT solvers</b>, and they handle millions of variables.'),
  }),

  // ---------- topic: what no machine can do ----------
  {
    id: 'u-barber',
    kind: 'proof',
    title: T('理发师', 'The barber'),
    tests: [{ premises: { p: '∃x. ∀y. R(x, y) ↔ ¬R(y, y)' }, goal: '⊥' }],
    cases: [{ R: 'Shaves' }, { R: 'Teaches' }],
    brief: T('村里的理发师说：「我给且只给不给自己刮胡子的人刮胡子。」已知「有这么一个人 x：对所有 y，x 给 y 刮胡子 ↔ y 不给自己刮」，证明出矛盾 ⊥。', 'The village barber says: “I shave exactly those who do not shave themselves.” Given “there is an x such that for every y, x shaves y ↔ y does not shave himself”, prove the contradiction ⊥.'),
    hint: [
      T('先取出那个理发师。', 'Take the barber out first.'),
      T('他给不给自己刮？', 'Does he shave himself?'),
    ],
    intro: [{ t: T('目标推得出时，饱和器迟早推出 ⊥；推不出时，它未必停得下来。有没有一台机器，对每个目标都答得出推得出还是推不出？这个专题从<level-ref to="kk-one"></level-ref>的<part-ref to="lemma:liar"></part-ref>说起。', 'When a goal follows, the saturator reaches ⊥ sooner or later; when it does not, the saturator may never stop. Is there a machine that can say, for every goal, whether it follows? This topic starts from <part-ref to="lemma:liar"></part-ref> in <level-ref to="kk-one"></level-ref>.') }],
    solution: proof({ f: ['exE', { x: 'a' }], a: ['allE', { t: 'a' }, 'f'], l: ['liar', {}, 'f'] }, ['p>f.ex', 'f#body>a.all', 'a>l.p0', 'l>f.body', 'f>goal'], { premises: ['p'] }),
    after: T('这种论证叫<wiki-ref to="diagonal"></wiki-ref>。', 'This kind of argument is the <wiki-ref to="diagonal"></wiki-ref>.'),
  },
  {
    id: 'u-cantor',
    kind: 'proof',
    title: T('康托尔', 'Cantor'),
    tests: [{ premises: { s: '∀z. ∃x. ∀y. P(y, f(x)) ↔ P(y, z)', d: '∃z. ∀y. P(y, z) ↔ ¬P(y, f(y))' }, goal: '⊥' }],
    cases: [{ P: 'In' }],
    brief: T('f 给每个 x 配一个集合 f(x)。已知每个集合都是某个 f(x)（f 是满射）；又有一个集合 z，装的正好是不属于 f(y) 的那些 y。推出矛盾 ⊥。', 'f gives each x a set f(x). Every set is some f(x) (f is onto); and there is a set z holding exactly the y not in f(y). Get the contradiction ⊥.'),
    hint: [
      T('先取出 z，再取出 f(x) 等于 z 的那个 x。', 'Take out z first, then the x whose f(x) is z.'),
      T('两句都取 y = x，会得到 X ↔ Y 和 Y ↔ ¬X。', 'Taking y = x in both gives X ↔ Y and Y ↔ ¬X.'),
      T('由这两句凑出<part-ref to="lemma:liar"></part-ref>要的那句。', 'From these two, build what <part-ref to="lemma:liar"></part-ref> needs.'),
    ],
    solution: (() => {
      const l = liarOf(['a2', 'a3'], 'e2')
      return proof({
        e1: ['exE', { x: 'a' }], a1: ['allE', { t: 'a' }, 'e1'], e2: ['exE', { x: 'b' }, 'e1'],
        a2: ['allE', { t: 'b' }, 'e2'], a3: ['allE', { t: 'b' }, 'e2'], ...l.nodes,
      }, ['d>e1.ex', 's>a1.all', 'a1>e2.ex', 'e2#body>a2.all', 'e1#body>a3.all', ...l.wires, 'l>e2.body', 'e2>e1.body', 'e1>goal'], { premises: ['s', 'd'] })
    })(),
    naive: proof({ e1: ['exE', { x: 'a' }], a3: ['allE', { t: 'a' }, 'e1'], l: ['liar', {}, 'e1'] }, ['d>e1.ex', 'e1#body>a3.all', 'a3>l.p0', 'l>e1.body', 'e1>goal'], { premises: ['s', 'd'] }),
    after: T('这是<b>康托尔定理</b>：一个集合的子集，总比它的元素多。', 'This is <b>Cantor’s theorem</b>: a set always has more subsets than elements.'),
  },
  {
    id: 'u-ls',
    kind: 'proof',
    title: T('不接受自己的程序', 'Programs that reject themselves'),
    tests: [{ premises: { r: '∃x. ∀y. M(x, c(y)) ↔ L(c(y))', ls: '∀y. L(c(y)) ↔ ¬M(y, c(y))' }, goal: '⊥' }],
    cases: [{ M: 'Accepts', L: 'Ls' }],
    brief: T('⟨y⟩ 是图灵机 y 的编码。L_s 装的是不接受自己编码的机器的编码。假设有一台机器 x 识别 L_s，推出矛盾 ⊥。', '⟨y⟩ is the code of the Turing machine y. L_s holds the codes of machines that do not accept their own code. Supposing some machine x recognises L_s, get the contradiction ⊥.'),
    hint: [T('让 x 读它自己的编码。', 'Let x read its own code.')],
    solution: (() => {
      const l = liarOf(['a1', 'a2'], 'e')
      return proof({ e: ['exE', { x: 'a' }], a1: ['allE', { t: 'a' }, 'e'], a2: ['allE', { t: 'a' }, 'e'], ...l.nodes }, ['r>e.ex', 'e#body>a1.all', 'ls>a2.all', ...l.wires, 'l>e.body', 'e>goal'], { premises: ['r', 'ls'] })
    })(),
    after: T('L_s 不是<b>可识别语言</b>。', 'L_s is not a <b>recognisable language</b>.'),
  },
  {
    id: 'u-halt',
    kind: 'proof',
    title: T('停机问题', 'The halting problem'),
    tests: [{ premises: { con: '(∃x. H(x)) → ∃x. ∀y. T(x, c(y)) ↔ ¬T(y, c(y))', red: '(∃x. G(x)) → ∃x. H(x)' }, goal: '¬∃x. G(x)' }],
    cases: [{ H: 'DecH', G: 'DecA', T: 'Halts' }],
    brief: T('已知：要是有判定停机的机器，就能造出一台 x，它在 ⟨y⟩ 上停机恰好当 y 在 ⟨y⟩ 上不停机；要是有判定 A_TM 的机器，就能造出判定停机的机器。证明没有机器判定 A_TM。', 'Given: if some machine decides halting, a machine x can be built that halts on ⟨y⟩ exactly when y does not halt on ⟨y⟩; and if some machine decides A_TM, one deciding halting can be built. Prove no machine decides A_TM.'),
    hint: [
      T('假设有判定 A_TM 的机器。', 'Assume a machine that decides A_TM.'),
      T('最后还是让一台机器读它自己的编码。', 'In the end, a machine still reads its own code.'),
    ],
    solution: proof({
      h: ['impI', { A: '∃x. G(x)' }], m1: ['mp', {}, 'h'], m2: ['mp', {}, 'h'],
      e: ['exE', { x: 'a' }, 'h'], a: ['allE', { t: 'a' }, 'e'], l: ['liar', {}, 'e'],
    }, ['red>m1.imp', 'h#body>m1.a', 'con>m2.imp', 'm1>m2.a', 'm2>e.ex', 'e#body>a.all', 'a>l.p0', 'l>e.body', 'e>h.body', 'h>goal'], { premises: ['con', 'red'] }),
    after: T('从一个问题到另一个，这一步叫<wiki-ref to="reduction"></wiki-ref>。一阶逻辑的可证性同样<wiki-ref to="undecidable"></wiki-ref>：没有程序能对每个目标都答出推得出还是推不出。', 'Passing from one problem to another is a <wiki-ref to="reduction"></wiki-ref>. Provability in first-order logic shows the same <wiki-ref to="undecidable"></wiki-ref>: no program can say, for every goal, whether it follows.'),
  },

  // ---------- challenge ----------
  machine('refuted', CLAUSES)({
    id: 'au-horn',
    title: T('只标被迫的', 'Only what is forced'),
    tests: [
      { clauses: ['Alarm', '¬Alarm ∨ Up', '¬Up ∨ Coffee', '¬Coffee ∨ Awake', '¬Awake ∨ OnTime', '¬OnTime', '¬Rain ∨ Wet', '¬Wet ∨ Slip', '¬Slip ∨ Late', '¬Bus ∨ ¬Bike ∨ Late'], budget: 17 },
      { clauses: ['Exam', '¬Exam ∨ Study', '¬Study ∨ Pass', '¬Pass ∨ Happy', '¬Happy', '¬Hungry ∨ Eat', '¬Eat ∨ Full', '¬Full ∨ Rest', '¬Rest ∨ Sat'], budget: 16 },
    ],
    brief: T('设计一个证明助手推出 ⊥，子句的条数不能超过每组测试的限额。', 'Design a proof assistant that reaches ⊥ without making more clauses than each test allows.'),
    hint: [
      T('有几条子句一开始就只有一个文字。', 'Some clauses have a single literal from the start.'),
      T('只有一个文字的子句，就是已经被迫的事。', 'A one-literal clause is something already forced.'),
    ],
    intro: [{ t: T('饱和器每一圈把每一对都消一遍，大部分新子句用不上。这些子句每条至多一个不带 ¬ 的文字，叫 <b>Horn 子句</b>。', 'Each round the saturator cancels every pair, and most new clauses go unused. In these clauses each has at most one literal without ¬: they are <b>Horn clauses</b>.') }],
    adds: ['resolve'],
    solution: flow({ frame: 'repeat', body: [['resolve', null, { unit: 'unit' }]] }),
    naive: flow('saturate'),
    after: T('SAT 求解器里，这叫<wiki-ref to="unit"></wiki-ref>。', 'In a SAT solver this is called <wiki-ref to="unit"></wiki-ref>.'),
  }),
]
