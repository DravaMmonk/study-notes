// Chapter 8 · Classical logic: the player's own auto runs into a wall, sentences true on every row that no search with
// introduction and elimination rules proves; the kernel gains one rule, proof by contradiction (from ¬¬A, A), and
// excluded middle comes of it. Then three lines that need nothing from each other: proof by contradiction on the proof
// board, excluded middle with cases, and proof by contradiction on the machine, once by hand before auto. The
// knights-and-knaves topic goes on from the truth-circuit chapter's islanders; Peirce's law is the challenge.
import { proof } from '../../kit/domains/logic/build.js'
import { gates } from '../../kit/domains/logic/gates.js'
import { script } from './metavars.js'

const T = (zh, en) => ({ zh, en })
const BRIEF = T('接一台机器：证得出的证完；证不出的，停下来说证不出来。', 'Wire a machine that proves what can be proved, and of what cannot, stops and says so.')
const each = (level) => ({ kind: 'machine', want: 'proved', inputs: [{ name: 'in', label: T('目标', 'Goal') }], backtrack: true, ...level })

// ¬¬(A ∨ ¬A): assuming ¬(A ∨ ¬A), it gives ¬A, and ¬A gives A ∨ ¬A against it.
const lemDeniedNodes = {
  f: ['impI', { A: '¬(A ∨ ¬A)' }],
  na: ['impI', { A: 'A' }, 'f'],
  i: ['orI', { other: '¬A', side: 'right' }, 'na'],
  m: ['mp', {}, 'na'],
  i2: ['orI', { other: 'A', side: 'left' }, 'f'],
  m2: ['mp', {}, 'f'],
}
const lemDeniedWires = ['na#body>i.a', 'f#body>m.imp', 'i>m.a', 'm>na.body', 'na>i2.a', 'f#body>m2.imp', 'i2>m2.a', 'm2>f.body']
const lemDenied = proof(lemDeniedNodes, [...lemDeniedWires, 'f>goal'])
// Knights and knaves, one islander: A ↔ ¬A gives ⊥. Split it: A → ¬A merges into ¬A, and ¬A gives A back.
const k1 = proof({ e: ['andE'], g: ['merge'], m1: ['mp'], m2: ['mp'] }, ['p>e.ab', 'e#left>g.p0', 'e#right>m1.imp', 'g>m1.a', 'g>m2.imp', 'm1>m2.a', 'm2>goal'], { premises: ['p'] })

// An islander level's two tasks (../../kit/shell/GameShell.jsx): translate what is said into a truth circuit, with the
// gates built in the truth-circuit chapter, then prove from it.
const board = (target, nodes, wires) => gates(nodes, wires, { target })
const translate = (task) => ({ kind: 'gates', step: T('翻译', 'Translate'), blind: true, parts: ['gNot', 'gAnd', 'gOr', 'gImp', 'gIff'], ...task })
const prove = (task) => ({ kind: 'proof', step: T('证明', 'Prove'), ...task })

export const classical = [
  // ---------- the wall ----------
  each({
    id: 'c-wall',
    title: T('auto 证不出的', 'What auto cannot prove'),
    tests: [
      { goal: '¬¬(Rain ∨ ¬Rain)' },
      { goal: '(Rain → Wet) → (¬Wet → ¬Rain)' },
      { goal: '¬¬Rain → Rain', want: 'fails' },
      { goal: 'Rain ∨ ¬Rain', want: 'fails' },
      { goal: '((Rain → Wet) → Rain) → Rain', want: 'fails' },
    ],
    brief: BRIEF,
    hint: [T('不用新元件：你手里的 auto 搜遍了还证不完，就会停下来说证不出来。', 'No new part: the auto you hold stops and says so when it has searched everything without finishing.')],
    intro: [
      { t: T('上一章造出的 auto，连接词一章的大多数关一个元件就证完了。这一章先拿它去试五句话。每一句，真值表上的每一行都是真的。', 'The auto built last chapter proves most levels of the connectives chapter on its own. This chapter starts by trying it on five sentences, every one of them true on every row of its truth table.') },
      { t: T('证不出来，有两种可能：搜得不够，或者这套规则本来就证不出。auto 搜遍了还证不完，会停下来说一声。', 'When a proof does not come, there are two possibilities: the search was not wide enough, or the rules cannot prove it at all. When auto has searched everything without finishing, it stops and says so.') },
    ],
    solution: script('auto'),
    after: T('五句都永远成立，auto 却只证出前两句；后三句它搜遍了，没有一条路走得到头。不是搜得不够：auto 用的是证明核的全部引入和消去规则，这三句光靠它们就是证不出来。证明核要多一条规则。', 'All five always hold, yet auto proves only the first two; the other three it searched through, and no path reached the end. The search was not too narrow: auto uses every introduction and elimination rule of the kernel, and those alone cannot prove these three. The kernel needs one more rule.'),
  }),
  {
    id: 'raa',
    title: T('要么成立，要么不成立', 'It holds or it does not'),
    builds: 'lem',
    tasks: [
      {
        kind: 'proof',
        step: T('不可否定', 'Undeniable'),
        tests: [{ goal: '¬¬(A ∨ ¬A)' }],
        cases: [{ A: 'Rain' }, { A: 'Exam' }],
        brief: T('实现一个证明器，不需要任何已知，就能证明出「¬¬(下雨 ∨ ¬下雨)」。', 'Build a prover that proves “¬¬(it rains ∨ ¬it rains)” from nothing given.'),
        hint: [
          T('直接证「下雨 ∨ ¬下雨」是不行的：你不知道该选哪一边。', 'Proving “it rains ∨ ¬it rains” directly will not work: you do not know which side to choose.'),
          T('假设「¬(下雨 ∨ ¬下雨)」，然后把这个假设用两次。', 'Assume “¬(it rains ∨ ¬it rains)”, and then use that assumption twice.'),
        ],
        solution: lemDenied,
        naive: proof({ f: ['impI', { A: '¬(A ∨ ¬A)' }], i: ['orI', { other: '¬A', side: 'right' }, 'f'] }, ['f#body>i.a', 'i>f.body', 'f>goal']),
        after: T('假设「¬(下雨 ∨ ¬下雨)」：先由它得出「¬下雨」，再由「¬下雨」得出「下雨 ∨ ¬下雨」，和它自己矛盾。证明器证不出「下雨 ∨ ¬下雨」，却证得出「否认它会矛盾」：真值表上永真的话，证明器不一定证得出。', 'Assume “¬(it rains ∨ ¬it rains)”: it gives “¬it rains”, and “¬it rains” gives “it rains ∨ ¬it rains”, which contradicts it. The prover cannot prove “it rains ∨ ¬it rains”, but it can prove that denying it is a contradiction: not everything true on every row is provable by the prover.'),
      },
      {
        kind: 'proof',
        step: T('反证法', 'By contradiction'),
        // Goes on with the proof just made: its board opens with it.
        carries: true,
        adds: ['raa'],
        tests: [{ goal: 'A ∨ ¬A' }],
        sentences: ['¬(A ∨ ¬A)'],
        cases: [{ A: 'Rain' }, { A: 'Exam' }],
        brief: T('刚证出的是「否认它会矛盾」，离「下雨 ∨ ¬下雨」只差去掉两个 ¬。数学家天天走这一步：「假设它不成立，推出矛盾，所以它成立。」新规则<part-ref to="part:raa"></part-ref>：由「并非并非 某句」得到那句。把它接在刚才的证明后面，证明出「下雨 ∨ ¬下雨」。', 'What you just proved is that denying it is a contradiction; “it rains ∨ ¬it rains” is two ¬s away. Mathematicians take that step every day: “suppose it fails; that is a contradiction; so it holds.” A new rule, <part-ref to="part:raa"></part-ref>: from “not not a sentence”, the sentence. Add it after the proof you just made, and prove “it rains ∨ ¬it rains”.'),
        hint: [T('反证法接在最外面那个框的后面。', 'By contradiction goes right after the outermost box.')],
        solution: proof({ ...lemDeniedNodes, r: ['raa'] }, [...lemDeniedWires, 'f>r.nna', 'r>goal']),
      },
    ],
    intro: [
      { t: T('<level-ref to="c-wall"></level-ref>里，auto 证不出「下雨 ∨ ¬下雨」。在证明板上也一样：证 ∨ 只有一条路，先证出其中一边，可「下雨」和「¬下雨」你一个也证不出。', 'In <level-ref to="c-wall"></level-ref>, auto could not prove “it rains ∨ ¬it rains”. The proof board fares no better: an ∨ is proved only one way, by proving one side first, and you can prove neither “it rains” nor “¬it rains”.') },
      { t: T('退一步：先证明「否认它会导致矛盾」，也就是「¬¬(下雨 ∨ ¬下雨)」。auto 证得出这一句；离「下雨 ∨ ¬下雨」，只差两个 ¬。', 'Step back, and first prove that denying it leads to a contradiction: “¬¬(it rains ∨ ¬it rains)”. auto proves that one; it is two ¬s from “it rains ∨ ¬it rains”.') },
      { t: T('证明器在这里有两种做法：Isabelle 的 HOL 从一开始就给证明核加上这一步，Lean 的核不加，要用时另外请出一条公理。这一关走前一条路。', 'Provers part ways here: Isabelle’s HOL gives its kernel this step from the start, while Lean’s kernel does without and calls in an axiom when needed. This level takes the first way.') },
    ],
    after: T('auto 证不出的那句话，现在证出来了，这块电路是元件<part-ref to="lemma:lem"></part-ref>：任何一句话，要么成立，要么不成立。不用反证法的逻辑叫<b>直觉主义逻辑</b>：每个「或」都要说出是哪一边。加上反证法就是<b>经典逻辑</b>：真值表上每一行都真的话，都证得出来。', 'The sentence auto could not prove is now proved, and this circuit is the part <part-ref to="lemma:lem"></part-ref>: any sentence holds or it does not. Logic without proof by contradiction is called <b>intuitionistic</b>: every “or” must say which side. Add it and you have <b>classical</b> logic, where everything true on every row can be proved.'),
  },
  {
    id: 'byContra',
    kind: 'proof',
    title: T('反证', 'Proof by contradiction'),
    tests: [{ premises: { p: '¬A → B', q: '¬A → ¬B' }, goal: 'A' }],
    cases: [{ A: 'Locked', B: 'Moon' }, { A: 'Rain', B: 'Wet' }],
    brief: T('实现一个证明器，可以从已知「¬门锁着 → 月亮是奶酪做的」和「¬门锁着 → ¬月亮是奶酪做的」，证明出「门锁着」。', 'Build a prover that, from “¬the door is locked → the moon is made of cheese” and “¬the door is locked → ¬the moon is made of cheese”, proves “the door is locked”.'),
    hint: [T('像<level-ref to="notI"></level-ref>一样，只是这次假设的是「¬门锁着」。框给出「¬¬门锁着」，剩下一步交给反证法。', 'As in <level-ref to="notI"></level-ref>, only this time assume “¬the door is locked”. The box gives “¬¬the door is locked”; By contradiction does the last step.')],
    intro: [{ t: T('「假设门没锁，就会推出矛盾，所以门锁着。」这就是反证法的完整样子：一个框，加上去掉两个 ¬。', '“Suppose the door is not locked; that leads to a contradiction; so it is locked.” This is proof by contradiction in full: a box, then dropping two ¬s.') }],
    solution: proof({ f: ['impI', { A: '¬A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], m3: ['mp', {}, 'f'], r: ['raa'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'f#body>m2.a', 'm2>m3.imp', 'm1>m3.a', 'm3>f.body', 'f>r.nna', 'r>goal'], { premises: ['p', 'q'] }),
    after: T('框的那一半，你在这一章已经做过很多遍；反证法只是最后一步。', 'The box half you have done many times this chapter; By contradiction is just the last step.'),
  },
  {
    id: 'c-contra',
    kind: 'proof',
    title: T('逆否，反过来', 'The contrapositive, backwards'),
    tests: [{ premises: { p: '¬B → ¬A' }, goal: 'A → B' }],
    cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Exam', B: 'Study' }],
    brief: T('实现一个证明器，可以从已知「¬地湿 → ¬下雨」，证明出「下雨 → 地湿」。', 'Build a prover that, from “¬the ground is wet → ¬it rains”, proves “it rains → the ground is wet”.'),
    hint: [
      T('假设「下雨」，要证的是「地湿」：假设它不成立，看会不会撞上「下雨」。', 'Assume “it rains”; the goal is “the ground is wet”: suppose it fails, and see whether that runs into “it rains”.'),
      T('里面的框给出「¬¬地湿」，反证法去掉两个 ¬。', 'The inner box gives “¬¬the ground is wet”, and By contradiction drops the two ¬s.'),
    ],
    intro: [{ t: T('<level-ref to="contra"></level-ref>由「下雨 → 地湿」得到「¬地湿 → ¬下雨」，没用反证法。反过来，从逆否推回原句，要证的是一句没有 ¬ 的话，只能靠反证。', '<level-ref to="contra"></level-ref> got “¬the ground is wet → ¬it rains” from “it rains → the ground is wet” without proof by contradiction. The other way, from the contrapositive back to the sentence, the goal has no ¬ in it, and only proof by contradiction reaches it.') }],
    solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: '¬B' }, 'f'], m1: ['mp', {}, 'g'], m2: ['mp', {}, 'g'], r: ['raa', {}, 'f'] }, ['p>m1.imp', 'g#body>m1.a', 'm1>m2.imp', 'f#body>m2.a', 'm2>g.body', 'g>r.nna', 'r>f.body', 'f>goal'], { premises: ['p'] }),
    after: T('有了反证法，逆否和原句才真正可以互相推出：证「若 P 则 Q」，改证「若非 Q 则非 P」也行。没有它，只有一个方向。', 'With proof by contradiction a sentence and its contrapositive really give each other: to prove “if P then Q”, proving “if not Q then not P” will do. Without it, only one way works.'),
  },
  {
    id: 'lemCases',
    kind: 'proof',
    title: T('两边都讨论', 'Take both sides'),
    tests: [{ premises: { p: 'A → B', q: '¬A → B' }, goal: 'B' }],
    cases: [{ A: 'Rain', B: 'Coffee' }, { A: 'Bus', B: 'OnTime' }],
    brief: T('实现一个证明器，可以从已知「下雨 → 我喝了咖啡」和「¬下雨 → 我喝了咖啡」，证明出「我喝了咖啡」。', 'Build a prover that, from “it rains → I drink coffee” and “¬it rains → I drink coffee”, proves “I drink coffee”.'),
    hint: [T('排中律给出「下雨 ∨ ¬下雨」，再分情况。', 'Excluded middle gives “it rains ∨ ¬it rains”; then take cases.')],
    intro: [{ t: T('下雨我喝咖啡，不下雨我也喝咖啡，所以我喝了咖啡。可分情况要一句 ∨，已知里没有：排中律给你一句。', 'Rain or no rain, I drink coffee, so I drank coffee. But Case by case needs an ∨, and none is given: Excluded middle gives you one.') }],
    solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], m1: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }, ['l>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>e.left', 'q>m2.imp', 'e#right>m2.a', 'm2>e.right', 'e>goal'], { premises: ['p', 'q'] }),
    after: T('排中律加分情况：不知道是哪一边，就两边都讨论。', 'Excluded middle plus Case by case: not knowing which, take both.'),
  },
  {
    id: 'c-either',
    kind: 'proof',
    title: T('不是这样就是那样', 'One way or the other'),
    tests: [{ premises: { p: 'A → B', q: '¬A → C' }, goal: 'B ∨ C' }],
    cases: [{ A: 'Rain', B: 'Bus', C: 'Bike' }, { A: 'Exam', B: 'Study', C: 'Rest' }],
    brief: T('实现一个证明器，可以从已知「下雨 → 我坐公交」和「¬下雨 → 我骑车」，证明出「我坐公交 ∨ 我骑车」。', 'Build a prover that, from “it rains → I take the bus” and “¬it rains → I cycle”, proves “I take the bus ∨ I cycle”.'),
    hint: [T('下不下雨，两边都讨论；每一边证出的，各放进 ∨ 的一边。', 'Rain or no rain, take both sides; what each side proves goes on its own side of the ∨.')],
    intro: [{ t: T('下雨就坐公交，不下雨就骑车。不知道下不下雨，可总有一样。<level-ref to="lemCases"></level-ref>两种情况证出同一句话；这一回两种情况证出的不一样。', 'If it rains I take the bus, if not I cycle. Whether it rains I do not know, but one of the two it is. In <level-ref to="lemCases"></level-ref> both cases proved the same sentence; this time they prove different ones.') }],
    solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], m1: ['mp', {}, 'e/left'], i1: ['orI', { other: 'C', side: 'right' }, 'e/left'], m2: ['mp', {}, 'e/right'], i2: ['orI', { other: 'B', side: 'left' }, 'e/right'] }, ['l>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>i1.a', 'i1>e.left', 'q>m2.imp', 'e#right>m2.a', 'm2>i2.a', 'i2>e.right', 'e>goal'], { premises: ['p', 'q'] }),
    after: T('两边证出的不一样，就各放进「或者」的一边，两种情况就证出同一句了。', 'When the two sides prove different things, put each on its own side of an “or”, and the two cases prove the same sentence.'),
  },
  each({
    id: 's-lem',
    title: T('auto 加一步反证法', 'auto, after one step by contradiction'),
    tests: [{ goal: '¬¬Rain → Rain' }, { goal: '(¬Rain → Rain) → Rain' }],
    brief: BRIEF,
    hint: [T('反证法要自己用一次：倒着用它，目标就成了「并非并非」。', 'Use proof by contradiction once yourself: backwards, it makes the goal a “not not”.')],
    intro: [{ t: T('<level-ref to="c-wall"></level-ref>里 auto 证不出这样的句子。现在规则书里多了<part-ref to="part:raa"></part-ref>，写成规则是 ⟦¬¬?A⟧ ⟹ ?A。可 auto 只用引入和消去规则：反证法的结论对上任何目标，放进搜索里，每个目标都会被它换成「并非并非」，再换一次，一直换下去，每一步都是新目标。', 'In <level-ref to="c-wall"></level-ref> auto could not prove sentences like these. Now the rule book holds <part-ref to="part:raa"></part-ref>, as a rule ⟦¬¬?A⟧ ⟹ ?A. But auto uses only introduction and elimination rules: proof by contradiction concludes any goal, and put in the search it would turn every goal into a “not not”, and again, without end, each step a new goal.') }],
    solution: script(['rule', 'impI'], ['rule', 'raa'], 'auto'),
    naive: script('auto'),
    after: T('反证法只在最外面用一次，剩下的交给 auto。只用引入和消去规则证得出的，正是直觉主义逻辑的定理；反证法要另外给，也要人决定在哪里用。', 'Proof by contradiction once, outermost, and auto does the rest. What introduction and elimination rules alone prove is exactly intuitionistic logic; proof by contradiction must be given besides, and someone must decide where it goes.'),
  }),
  // ---------- topic: knights and knaves ----------
  {
    id: 'kk-one',
    title: T('一个岛民', 'One islander'),
    tasks: [
      translate({
        target: 'KA ↔ ¬KA',
        brief: T('一个岛民 a 说：「我是无赖。」把这件事翻译成逻辑语言，接成电路：哪一行 a 的话和他的身份对得上，哪一行就输出真。', 'An islander a says: “I am a knave.” Translate this into logic and wire it: the board outputs true on exactly the rows where what a says fits what a is.'),
        hint: [T('「我是无赖」就是「¬a 是骑士」；「a 说」就是「a 是骑士」和他的话等价。', '“I am a knave” is “¬a is a knight”; “a says” is “a is a knight” equivalent to what he says.')],
        solution: board('KA ↔ ¬KA', { n: 'gNot', e: 'gIff' }, ['KA>n.a', 'KA>e.a', 'n>e.b', 'e>out']),
        after: T('译成「a 是骑士 ↔ ¬a 是骑士」，两行都是假：他是骑士也好，是无赖也好，都对不上。真值表把两种身份都试了一遍；接下来，证明器要从这句话直接推出矛盾，不必一行一行地试。', 'It translates to “a is a knight ↔ ¬a is a knight”, false on both rows: knight or knave, it does not fit. The truth table tried both; next, the prover must get a contradiction from the sentence directly, without trying row by row.'),
      }),
      prove({
        tests: [{ premises: { p: 'A ↔ ¬A' }, goal: '⊥' }],
        cases: [{ A: 'KA' }, { A: 'KC' }],
        brief: T('一个岛民说：「我是无赖。」证明这话不可能有人说：实现一个证明器，可以从已知「a 是骑士 ↔ ¬a 是骑士」（也就是「(a 是骑士 → ¬a 是骑士) ∧ (¬a 是骑士 → a 是骑士)」）证明出矛盾 ⊥。', 'An islander says: “I am a knave.” Prove nobody can say that: build a prover that, from “a is a knight ↔ ¬a is a knight” (that is “(a is a knight → ¬a is a knight) ∧ (¬a is a knight → a is a knight)”), proves the contradiction ⊥.'),
        hint: [
          T('拆开 ∧ 也能拆 ↔：拆出「a 是骑士 → ¬a 是骑士」和「¬a 是骑士 → a 是骑士」。', 'Split ∧ splits a ↔ too: into “a is a knight → ¬a is a knight” and “¬a is a knight → a is a knight”.'),
          T('「¬a 是骑士」就是「a 是骑士 → ⊥」，第一句里的「a 是骑士」说了两遍。', '“¬a is a knight” is “a is a knight → ⊥”, so the first one states “a is a knight” twice.'),
        ],
        solution: k1,
      }),
    ],
    intro: [
      { t: T('岛上的人要么是<b>骑士</b>，永远说真话；要么是<b>无赖</b>，永远说假话。', 'Everyone on the island is a <b>knight</b>, who always tells the truth, or a <b>knave</b>, who always lies.') },
      { t: T('一个岛民说了一句话，「他是骑士」就和他说的话<b>等价</b>：<level-ref to="e-says"></level-ref>里翻译过，写成 <b>↔</b>；证明器里怎样拆开它，<level-ref to="iffUse"></level-ref>里做过。', 'If an islander says something, “he is a knight” is <b>equivalent</b> to what he says: you translated that in <level-ref to="e-says"></level-ref>, written <b>↔</b>; how the prover takes it apart, you did in <level-ref to="iffUse"></level-ref>.') },
    ],
    after: T('拆开等价，合并重复的条件，再两次套用撞出矛盾。谁都说不出「我是无赖」：骑士说不出假话，无赖说不出真话。这就是「说谎者悖论」的岛上版本。', 'Split the equivalence, merge the repeated condition, then apply twice into a contradiction. Nobody can say “I am a knave”: a knight cannot say something false, and a knave cannot say something true. It is the island’s version of the liar paradox.'),
  },
  {
    id: 'kk-two',
    title: T('两个岛民', 'Two islanders'),
    tasks: [
      translate({
        target: 'KA ↔ ¬KA ∧ ¬KB',
        brief: T('岛上有 a、b 两个人，a 说：「我们俩都是无赖。」把这件事翻译成逻辑语言，接成电路：哪一行 a 的话和他的身份对得上，哪一行就输出真。', 'Two people, a and b; a says: “We are both knaves.” Translate this into logic and wire it: the board outputs true on exactly the rows where what a says fits what a is.'),
        hint: [T('「我们俩都是无赖」是「¬a 是骑士 ∧ ¬b 是骑士」；「a 说」是「a 是骑士」和它等价。', '“We are both knaves” is “¬a is a knight ∧ ¬b is a knight”; “a says” makes “a is a knight” equivalent to it.')],
        solution: board('KA ↔ ¬KA ∧ ¬KB', { na: 'gNot', nb: 'gNot', both: 'gAnd', e: 'gIff' }, ['KA>na.a', 'KB>nb.a', 'na>both.a', 'nb>both.b', 'KA>e.a', 'both>e.b', 'e>out']),
        after: T('四行里只有一行为真：a 是无赖，b 是骑士。真值表给出了答案，可它是把四种情况挨个试出来的；接下来，证明器要从 a 的话一步步推出这个答案。', 'Only one of the four rows is true: a is a knave and b a knight. The truth table found the answer by trying all four cases; next, the prover must reason its way from what a says to that answer.'),
      }),
      prove({
        tests: [{ premises: { p: 'A ↔ ¬A ∧ ¬B' }, goal: '¬A ∧ B' }],
        cases: [{ A: 'KA', B: 'KB' }, { A: 'KC', B: 'KD' }],
        brief: T('第一个岛民说：「我们俩都是无赖。」实现一个证明器，可以从已知「a 是骑士 ↔ ¬a 是骑士 ∧ ¬b 是骑士」证明出「¬a 是骑士 ∧ b 是骑士」。', 'The first islander says: “We are both knaves.” Build a prover that, from “a is a knight ↔ ¬a is a knight ∧ ¬b is a knight”, proves “¬a is a knight ∧ b is a knight”.'),
        hint: [
          T('「¬a 是骑士」：假设 a 是骑士，他的话就成了真的，可话里说他是无赖。', '“¬a is a knight”: suppose a is a knight; then what he says is true, and it says he is a knave.'),
          T('有了「¬a 是骑士」，接上「他的话 → a 是骑士」，就知道他的话是假的。再用反证法：假设「¬b 是骑士」，他的话就成了真的。', 'With “¬a is a knight”, joined after “his statement → a is a knight”, his statement is false. Then by contradiction: assume “¬b is a knight”, and his statement comes true.'),
        ],
        solution: proof({
          e: ['andE'],
          na: ['impI', { A: 'A' }],
          m1: ['mp', {}, 'na'],
          s: ['andE', {}, 'na'],
          m2: ['mp', {}, 'na'],
          t: ['chain'],
          nnb: ['impI', { A: '¬B' }],
          c: ['andI', {}, 'nnb'],
          m3: ['mp', {}, 'nnb'],
          b: ['raa'],
          both: ['andI'],
        }, ['p>e.ab', 'e#left>m1.imp', 'na#body>m1.a', 'm1>s.ab', 's#left>m2.imp', 'na#body>m2.a', 'm2>na.body', 'e#right>t.p0', 'na>t.p1', 'na>c.a', 'nnb#body>c.b', 't>m3.imp', 'c>m3.a', 'm3>nnb.body', 'nnb>b.nna', 'na>both.a', 'b>both.b', 'both>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('第二个岛民什么也没说。可第一个人的话里提到了他，就够推出他是什么人了。', 'The second islander says nothing. But the first one’s statement mentions him, and that is enough to work out what he is.') }],
    after: T('第一个人不能是骑士（那他就说了假话），所以是无赖；无赖的话是假的，所以「两个都是无赖」不成立：第二个人是骑士。', 'The first cannot be a knight (he would have said something false), so he is a knave; a knave’s words are false, so “both are knaves” fails: the second is a knight.'),
  },
  {
    id: 'kk-three',
    title: T('骑士与无赖', 'Knights and knaves'),
    tasks: [
      translate({
        target: 'KA ↔ ¬KA ∨ KB',
        brief: T('岛上有 a、b 两个人，a 说：「我是无赖，或者 b 是骑士。」把这件事翻译成逻辑语言，接成电路：哪一行 a 的话和他的身份对得上，哪一行就输出真。', 'Two people, a and b; a says: “I am a knave, or b is a knight.” Translate this into logic and wire it: the board outputs true on exactly the rows where what a says fits what a is.'),
        hint: [T('a 的话是「¬a 是骑士 ∨ b 是骑士」；「a 说」是「a 是骑士」和它等价。', 'What a says is “¬a is a knight ∨ b is a knight”; “a says” makes “a is a knight” equivalent to it.')],
        solution: board('KA ↔ ¬KA ∨ KB', { na: 'gNot', o: 'gOr', e: 'gIff' }, ['KA>na.a', 'na>o.a', 'KB>o.b', 'KA>e.a', 'o>e.b', 'e>out']),
        after: T('只有一行为真：两个人都是骑士。表上看得出答案；接下来，证明器要说清它为什么非得如此。', 'Only one row is true: both are knights. The table shows the answer; next, the prover must show why it has to be so.'),
      }),
      prove({
        tests: [{ premises: { p: 'A ↔ ¬A ∨ B' }, goal: 'A ∧ B' }],
        cases: [{ A: 'KA', B: 'KB' }, { A: 'KC', B: 'KD' }],
        brief: T('第一个岛民说：「我是无赖，或者另一个人是骑士。」两个人各是什么？实现一个证明器，可以从已知「a 是骑士 ↔ ¬a 是骑士 ∨ b 是骑士」证明出「a 是骑士 ∧ b 是骑士」。', 'The first islander says: “I am a knave, or the other one is a knight.” What is each of them? Build a prover that, from “a is a knight ↔ ¬a is a knight ∨ b is a knight”, proves “a is a knight ∧ b is a knight”.'),
        hint: [
          T('a 是不是骑士，两边都讨论：排中律加分情况。是骑士，就是了；是无赖，他的话就成了真的。', 'Whether a is a knight, take both sides: Excluded middle and cases. A knight, done; a knave, and his statement comes true.'),
          T('有了「a 是骑士」，他的话就是真的；再对他的话分情况，「我是无赖」那一半会撞出矛盾。', 'With “a is a knight”, his statement is true; take cases on it, and the “I am a knave” half runs into a contradiction.'),
        ],
        solution: proof({
          e: ['andE'],
          l: ['lem', { A: 'A' }],
          o: ['orE'],
          i: ['orI', { other: 'B', side: 'right' }, 'o/right'],
          m: ['mp', {}, 'o/right'],
          says: ['mp'],
          c: ['orE'],
          m2: ['mp', {}, 'c/left'],
          no: ['botE', { C: 'B' }, 'c/left'],
          both: ['andI'],
        }, ['p>e.ab', 'l>o.ab', 'o#left>o.left', 'o#right>i.a', 'e#right>m.imp', 'i>m.a', 'm>o.right', 'e#left>says.imp', 'o>says.a', 'says>c.ab', 'c#left>m2.imp', 'o>m2.a', 'm2>no.bot', 'no>c.left', 'c#right>c.right', 'o>both.a', 'c>both.b', 'both>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('这一次，先自己想清楚答案，再把它证出来。', 'This time, work out the answer yourself first, then prove it.') }],
    after: T('两个都是骑士。如果第一个人是无赖，他的话就成了真话，无赖说不出真话；所以他是骑士，他的话是真的，而「我是无赖」那一半是假的，只能是另一个人是骑士。', 'Both are knights. If the first were a knave his statement would be true, and a knave cannot say something true; so he is a knight, his statement is true, and since “I am a knave” is false, the other must be a knight.'),
  },
  // ---------- challenge ----------
  {
    id: 'peirce',
    kind: 'proof',
    title: T('皮尔士律', 'Peirce’s law'),
    tests: [{ goal: '((A → B) → A) → A' }],
    cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Exam', B: 'Pass' }],
    brief: T('实现一个证明器，不需要任何已知，就能证明出「((下雨 → 地湿) → 下雨) → 下雨」。', 'Build a prover that proves “((it rains → the ground is wet) → it rains) → it rains”. from nothing given'),
    hint: [
      T('框里对「下雨 ∨ ¬下雨」分情况。下雨的那一边，什么都不用做。', 'Inside the box, take cases on “it rains ∨ ¬it rains”. On the raining side there is nothing to do.'),
      T('不下雨的那一边：「¬下雨」能给出「下雨 → 地湿」（假设下雨，就矛盾了，矛盾推出一切）。', 'On the other side: “¬it rains” gives “it rains → the ground is wet” (assume it rains: contradiction, and from that anything).'),
    ],
    intro: [{ t: T('一句只有 → 的话，证明器没有反证法时证不出来，有了就证得出。它看着古怪，真值表上每一行却都真。', 'A sentence with nothing but →, unprovable by the prover without proof by contradiction and provable with it. It looks strange, yet it is true on every row.') }],
    solution: proof({ f: ['impI', { A: '(A → B) → A' }], l: ['lem', { A: 'A' }, 'f'], e: ['orE', {}, 'f'], g: ['impI', { A: 'A' }, 'e/right'], m: ['mp', {}, 'g'], b: ['botE', { C: 'B' }, 'g'], m2: ['mp', {}, 'e/right'] }, ['l>e.ab', 'e#left>e.left', 'e#right>m.imp', 'g#body>m.a', 'm>b.bot', 'b>g.body', 'f#body>m2.imp', 'g>m2.a', 'm2>e.right', 'e>f.body', 'f>goal']),
    naive: proof({ f: ['impI', { A: '(A → B) → A' }] }, ['f#body>f.body', 'f>goal']),
    after: T('排中律、分情况、矛盾推出一切，三样一起用。古典逻辑里最出名的怪句子之一，就这样证完了。', 'Excluded middle, cases and ex falso together. One of classical logic’s most famous odd sentences, proved.'),
  },
]
