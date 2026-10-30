// Chapter 9 · Classical logic: the player's own auto runs into a wall, sentences true on every row that no search with
// introduction and elimination rules proves; the kernel gains one rule, proof by contradiction (from ¬¬A, A), and
// excluded middle comes of it. Then three lines that need nothing from each other: proof by contradiction on the proof
// board, excluded middle with cases, and proof by contradiction on the machine, once by hand before auto. Then the
// equivalences, pairs of sentences proved to give each other, most of them by contradiction or excluded middle:
// double negation, arrows to or and distribution on one line, De Morgan (connectives, then quantifiers) on another.
// Each is a part with a shape for each direction, which the simplifier (next chapter) rewrites with. The
// knights-and-knaves topic goes on from the truth-circuit chapter's islanders; Peirce's law and the drinker paradox
// are the challenges.
import { proof } from '../../kit/domains/logic/build.js'
import { gates } from '../../kit/domains/logic/gates.js'
import { script } from './machines.js'

const T = (zh, en) => ({ zh, en })
const BRIEF = T('设计一个证明助手：完成需要证明的测试目标，对指定的失败目标报告失败。', 'Design a proof assistant that proves the required test goals and reports failure for the designated failure cases.')
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
const DAYS = [{ A: 'Sat', B: 'Sun' }, { A: 'Rain', B: 'Wind' }]
const DRINK = [{ P: 'Drinks' }, { P: 'Sings' }]
const THREE = [{ A: 'Rain', B: 'Wind', C: 'Wet' }, { A: 'Sat', B: 'Rest', C: 'Happy' }]

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
    hint: [T('用手里的 auto 逐句试，看哪几句证不出。', 'Try each with the auto you have, and see which it cannot prove.')],
    intro: [
      { t: T('这五句在真值表的每一行都为真。<part-ref to="lemma:auto"></part-ref>证得出几句？', 'These five sentences are true on every row of their truth tables. How many does <part-ref to="lemma:auto"></part-ref> prove?') },
      { t: T('搜不到证明，未必就没有证明：也可能是搜索的方法或深度不够。', 'A search that finds no proof does not show there is none: the method or the depth may fall short.') },
    ],
    solution: script('auto'),
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
        hint: [
          T('要证的是一个否定，不必证出「或者」的哪一边。', 'The goal is a negation; neither side of the “or” has to be proved.'),
          T('假设「¬(下雨 ∨ ¬下雨)」，这个假设要用两次。', 'Assume “¬(it rains ∨ ¬it rains)”; that assumption is used twice.'),
        ],
        solution: lemDenied,
        naive: proof({ f: ['impI', { A: '¬(A ∨ ¬A)' }], i: ['orI', { other: '¬A', side: 'right' }, 'f'] }, ['f#body>i.a', 'i>f.body', 'f>goal']),
      },
      {
        kind: 'proof',
        step: T("双重否定消去", "Double-negation elimination"),
        // Goes on with the proof just made: its board opens with it.
        carries: true,
        adds: ['raa'],
        tests: [{ goal: 'A ∨ ¬A' }],
        sentences: ['¬(A ∨ ¬A)'],
        cases: [{ A: 'Rain' }, { A: 'Exam' }],
        intro: [{ t: T('由 ¬¬A 推出 A，叫<b>双重否定消去</b>。现有的规则推不出它，只能作为一条<wiki-ref to="axiom"></wiki-ref>加进证明核：<part-ref to="part:raa"></part-ref>。', 'From ¬¬A, infer A: this is <b>double-negation elimination</b>. The rules so far cannot derive it; it can only come into the kernel as an <wiki-ref to="axiom"></wiki-ref>, <part-ref to="part:raa"></part-ref>.') }],
        brief: T('证出「下雨 ∨ ¬下雨」。', 'Prove “it rains ∨ ¬it rains”.'),
        hint: [
          T('刚才的证明已经给出「¬¬(下雨 ∨ ¬下雨)」。', 'The proof you just made already gives “¬¬(it rains ∨ ¬it rains)”.'),
          T('把<part-ref to="part:raa"></part-ref>接在最外层假设框的输出后面。', 'Wire <part-ref to="part:raa"></part-ref> after the outermost assumption box.'),
        ],
        solution: proof({ ...lemDeniedNodes, r: ['raa'] }, [...lemDeniedWires, 'f>r.nna', 'r>goal']),
      },
    ],
    intro: [
      { t: T('<level-ref to="c-wall"></level-ref>里，auto 证不出「下雨 ∨ ¬下雨」，<wiki-ref to="lem"></wiki-ref>的一例。先证一句弱一些的：「¬¬(下雨 ∨ ¬下雨)」，否认它就会矛盾。', 'In <level-ref to="c-wall"></level-ref>, auto could not prove “it rains ∨ ¬it rains”, an instance of <wiki-ref to="lem"></wiki-ref>. First a weaker sentence: “¬¬(it rains ∨ ¬it rains)”, that denying it is a contradiction.') },
    ],
    after: T('没有双重否定消去的规则，是<wiki-ref to="intuitionistic"></wiki-ref>；加上它，就是<wiki-ref to="classical"></wiki-ref>。经典命题逻辑里，真值表上每一行都真的句子都证得出。', 'The rules without double-negation elimination are <wiki-ref to="intuitionistic"></wiki-ref>; with it, <wiki-ref to="classical"></wiki-ref>. In classical propositional logic, every sentence true on every row has a proof.'),
  },
  {
    id: 'byContra',
    kind: 'proof',
    title: T('反证', 'Proof by contradiction'),
    tests: [{ premises: { p: '¬A → B', q: '¬A → ¬B' }, goal: 'A' }],
    cases: [{ A: 'Locked', B: 'Moon' }, { A: 'Rain', B: 'Wet' }],
    hint: [
      T('要证的「门锁着」里没有 ¬。先想想怎样得到「¬¬门锁着」。', 'The goal, “the door is locked”, has no ¬ in it. First think how to get “¬¬the door is locked”.'),
      T('和<level-ref to="notI"></level-ref>一样用框，只是这次假设「¬门锁着」。', 'Use a box as in <level-ref to="notI"></level-ref>, only this time assume “¬the door is locked”.'),
    ],
    intro: [{ t: T('「假设门没锁，就会推出矛盾，所以门锁着。」这是<b>反证法</b>。', '“Suppose the door is not locked; that leads to a contradiction; so it is locked.” This is <b>proof by contradiction</b>.') }],
    solution: proof({ f: ['impI', { A: '¬A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], m3: ['mp', {}, 'f'], r: ['raa'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'f#body>m2.a', 'm2>m3.imp', 'm1>m3.a', 'm3>f.body', 'f>r.nna', 'r>goal'], { premises: ['p', 'q'] }),
  },
  {
    id: 'c-contra',
    kind: 'proof',
    title: T('逆否，反过来', 'The contrapositive, backwards'),
    tests: [{ premises: { p: '¬B → ¬A' }, goal: 'A → B' }],
    cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Exam', B: 'Study' }],
    hint: [
      T('先假设「下雨」，要证的就是「地湿」，一句没有 ¬ 的话。', 'Assume “it rains” first; what remains is “the ground is wet”, with no ¬ in it.'),
      T('「地湿」怎么来，和<level-ref to="byContra"></level-ref>一样。', '“The ground is wet” comes the way it did in <level-ref to="byContra"></level-ref>.'),
    ],
    intro: [{ t: T('<level-ref to="mt"></level-ref>从原句推出了它的<wiki-ref to="contrapositive"></wiki-ref>。这一回反过来，从逆否推回原句。', '<level-ref to="mt"></level-ref> derived a sentence’s <wiki-ref to="contrapositive"></wiki-ref> from it. This time the other way: from the contrapositive back to the sentence.') }],
    solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: '¬B' }, 'f'], m1: ['mp', {}, 'g'], m2: ['mp', {}, 'g'], r: ['raa', {}, 'f'] }, ['p>m1.imp', 'g#body>m1.a', 'm1>m2.imp', 'f#body>m2.a', 'm2>g.body', 'g>r.nna', 'r>f.body', 'f>goal'], { premises: ['p'] }),
  },
  {
    id: 'lemCases',
    kind: 'proof',
    title: T('两边都讨论', 'Take both sides'),
    tests: [{ premises: { p: 'A → B', q: '¬A → B' }, goal: 'B' }],
    cases: [{ A: 'Rain', B: 'Coffee' }, { A: 'Bus', B: 'OnTime' }],
    hint: [
      T('下雨和不下雨，两种情况都讨论。', 'Rain and no rain: take both cases.'),
      T('分情况要一句「或者」，已知里没有。', 'Taking cases needs an “or”, and none is given.'),
    ],
    intro: [{ t: T('下雨我喝咖啡，不下雨我也喝咖啡，所以我喝了咖啡。', 'If it rains I drink coffee; if it does not, I drink coffee too. So I drank coffee.') }],
    solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], m1: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }, ['l>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>e.left', 'q>m2.imp', 'e#right>m2.a', 'm2>e.right', 'e>goal'], { premises: ['p', 'q'] }),
  },
  {
    id: 'c-either',
    kind: 'proof',
    title: T('不是这样就是那样', 'One way or the other'),
    tests: [{ premises: { p: 'A → B', q: '¬A → C' }, goal: 'B ∨ C' }],
    cases: [{ A: 'Rain', B: 'Bus', C: 'Bike' }, { A: 'Exam', B: 'Study', C: 'Rest' }],
    hint: [
      T('下不下雨，两边都讨论。', 'Rain or no rain: take both sides.'),
      T('分情况时，两边要证出同一句话。', 'When taking cases, both sides must prove the same sentence.'),
    ],
    intro: [{ t: T('下雨就坐公交，不下雨就骑车。不知道下不下雨，可总有一样。', 'If it rains I take the bus; if not, I cycle. I do not know whether it will rain, but it will be one or the other.') }],
    solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], m1: ['mp', {}, 'e/left'], i1: ['orI', { other: 'C', side: 'right' }, 'e/left'], m2: ['mp', {}, 'e/right'], i2: ['orI', { other: 'B', side: 'left' }, 'e/right'] }, ['l>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>i1.a', 'i1>e.left', 'q>m2.imp', 'e#right>m2.a', 'm2>i2.a', 'i2>e.right', 'e>goal'], { premises: ['p', 'q'] }),
  },
  each({
    id: 's-lem',
    title: T('auto 加一步反证法', 'auto, after one step by contradiction'),
    tests: [{ goal: '¬¬Rain → Rain' }, { goal: '(¬Rain → Rain) → Rain' }],
    brief: BRIEF,
    hint: [
      T('auto 本身不必改。', 'auto itself need not change.'),
      T('在 auto 之前，自己先用几条规则。', 'Before auto, apply a few rules yourself.'),
    ],
    intro: [{ t: T('规则书里多了<part-ref to="part:raa"></part-ref>，写成规则是 ⟦¬¬?A⟧ ⟹ ?A。auto 只用引入和消去规则；这条规则的结论对得上任何目标，放进搜索，就会把每个目标换成「并非并非」，再换一次，没有尽头。', 'The rule book now holds <part-ref to="part:raa"></part-ref>, as a rule ⟦¬¬?A⟧ ⟹ ?A. auto uses only introduction and elimination rules; this rule’s conclusion fits any goal, and in the search it would turn every goal into a “not not”, and again, without end.') }],
    solution: script(['rule', 'impI'], ['rule', 'raa'], 'auto'),
    naive: script('auto'),
  }),
  // ---------- equivalences: pairs of sentences that give each other, the laws the simplifier rewrites with ----------
  {
    id: 'c-dneg',
    title: T('双重否定律', 'Double negation'),
    builds: 'dneg',
    tasks: [
      prove({
        step: T('去掉两个 ¬', 'Two ¬s off'),
        tests: [{ premises: { p: '¬¬A' }, goal: 'A' }],
        cases: [{ A: 'Rain' }, { A: 'Locked' }],
        hint: [T('手里有一条规则正好去掉两个 ¬。', 'One rule you hold takes exactly two ¬s off.')],
        solution: proof({ r: ['raa'] }, ['p>r.nna', 'r>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('加上两个 ¬', 'Two ¬s on'),
        tests: [{ premises: { p: 'A' }, goal: '¬¬A' }],
        cases: [{ A: 'Rain' }, { A: 'Locked' }],
        brief: T('再从「下雨」证明出「¬¬下雨」。', 'Now from “it rains”, prove “¬¬it rains”.'),
        hint: [T('「¬¬下雨」就是「¬下雨 → ⊥」。', '“¬¬it rains” is “¬it rains → ⊥”.')],
        solution: proof({ f: ['impI', { A: '¬A' }], m: ['mp', {}, 'f'] }, ['f#body>m.imp', 'p>m.a', 'm>f.body', 'f>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [
      { t: T('两句话能互相推出，说的就是同一件事，这叫<wiki-ref to="equivalence"></wiki-ref>。「¬¬下雨」和「下雨」就是一对。', 'Two sentences that each give the other say the same thing: they are in <wiki-ref to="equivalence"></wiki-ref>. “¬¬it rains” and “it rains” are such a pair.') },
      { t: T('两个方向都证出后，合成一个元件，元件上切换方向。', 'Once both directions are proved, they make one part that switches between the two.') },
    ],
  },
  {
    id: 'c-arrow',
    title: T('蕴涵析取互化', 'Arrows away'),
    builds: 'arrow',
    tasks: [
      prove({
        step: T('箭头变成或者', 'Arrow to or'),
        tests: [{ premises: { p: 'A → B' }, goal: '¬A ∨ B' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Alarm', B: 'Up' }],
        hint: [T('已知没说下不下雨。', 'The given does not say whether it rains.')],
        solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], m: ['mp', {}, 'e/left'], i1: ['orI', { other: '¬A', side: 'left' }, 'e/left'], i2: ['orI', { other: 'B', side: 'right' }, 'e/right'] }, ['l>e.ab', 'p>m.imp', 'e#left>m.a', 'm>i1.a', 'i1>e.left', 'e#right>i2.a', 'i2>e.right', 'e>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('或者变回箭头', 'Or back to an arrow'),
        tests: [{ premises: { p: '¬A ∨ B' }, goal: 'A → B' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Alarm', B: 'Up' }],
        brief: T('再从「¬下雨 ∨ 地湿」证明出「下雨 → 地湿」。', 'Now from “¬it rains ∨ the ground is wet”, prove “it rains → the ground is wet”.'),
        hint: [
          T('先假设「下雨」，再对已知分情况。', 'Assume “it rains” first, then take cases on the given.'),
          T('「¬下雨」那种情况和假设矛盾；矛盾推出一切。', 'The “¬it rains” case contradicts the assumption, and a contradiction gives anything.'),
        ],
        solution: proof({ f: ['impI', { A: 'A' }], e: ['orE', {}, 'f'], m: ['mp', {}, 'e/left'], b: ['botE', { C: 'B' }, 'e/left'] }, ['p>e.ab', 'e#left>m.imp', 'f#body>m.a', 'm>b.bot', 'b>e.left', 'e#right>e.right', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('「下雨，地就湿」和「没下雨，或者地湿」是一回事：两句都只在下雨而地不湿的那一行为假。', '“If it rains, the ground is wet” and “it does not rain, or the ground is wet” say the same: each is false only on the row where it rains and the ground is dry.') }],
  },
  {
    id: 'c-dist',
    title: T('分配律', 'Distribution'),
    builds: 'dist',
    tasks: [
      prove({
        step: T('分到右边', 'Out over the right'),
        tests: [{ premises: { p: 'A ∨ (B ∧ C)' }, goal: '(A ∨ B) ∧ (A ∨ C)' }],
        cases: THREE,
        hint: [T('已知是一句「或者」。', 'The given is an “or”.')],
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
        hint: [
          T('拆开「并且」，得到两句「或者」。', 'Split the “and” into its two “or”s.'),
          T('两句「或者」先后分情况。只有两句都不给出「下雨」时，才要「刮风 ∧ 地湿」。', 'Take cases on the two “or”s in turn. Only when neither gives “it rains” is “it is windy ∧ the ground is wet” needed.'),
        ],
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
    ],
    intro: [{ t: T('「下雨，或者又刮风又地湿」和「下雨或刮风，并且下雨或地湿」是一回事：「或者」分配到「并且」上，就像乘法分配到加法上。「并且」在右边、在左边各一对，共四个方向。', '“It rains, or it is windy and wet” and “it rains or is windy, and it rains or is wet” say the same: “or” distributes over “and”, as multiplication does over addition. With the “and” on the right and on the left, that makes two pairs, four directions.') }],
  },
  {
    id: 'demorgan',
    title: T('德摩根律', 'De Morgan'),
    builds: 'dm',
    tasks: [
      prove({
        step: T('并非或者', 'Not either'),
        tests: [{ premises: { p: '¬(A ∨ B)' }, goal: '¬A ∧ ¬B' }],
        cases: DAYS,
        hint: [
          T('要证的两半各是一个否定。', 'Each half of the goal is a negation.'),
          T('假设「今天是周六」，看它怎样和已知矛盾。', 'Assume “today is Saturday” and see how it contradicts the given.'),
        ],
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
        hint: [
          T('要证的是一个否定。', 'The goal is a negation.'),
          T('假设「今天是周六 ∨ 今天是周日」，两种情况各推出矛盾。', 'Assume “today is Saturday ∨ today is Sunday” and get a contradiction in each case.'),
        ],
        solution: proof({ f: ['impI', { A: 'A ∨ B' }], e: ['andE'], o: ['orE', {}, 'f'], m1: ['mp', {}, 'o/left'], m2: ['mp', {}, 'o/right'] }, ['p>e.ab', 'f#body>o.ab', 'e#left>m1.imp', 'o#left>m1.a', 'm1>o.left', 'e#right>m2.imp', 'o#right>m2.a', 'm2>o.right', 'o>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('有一个不', 'One fails'),
        tests: [{ premises: { p: '¬A ∨ ¬B' }, goal: '¬(A ∧ B)' }],
        cases: DAYS,
        brief: T('再从「¬今天是周六 ∨ ¬今天是周日」，证明出「¬(今天是周六 ∧ 今天是周日)」。', 'Now from “¬today is Saturday ∨ ¬today is Sunday”, prove “¬(today is Saturday ∧ today is Sunday)”.'),
        hint: [
          T('要证的又是一个否定。', 'The goal is again a negation.'),
          T('假设「今天是周六 ∧ 今天是周日」，再对已知分情况。', 'Assume “today is Saturday ∧ today is Sunday”, then take cases on the given.'),
        ],
        solution: proof({ f: ['impI', { A: 'A ∧ B' }], e: ['andE', {}, 'f'], o: ['orE', {}, 'f'], m1: ['mp', {}, 'o/left'], m2: ['mp', {}, 'o/right'] }, ['f#body>e.ab', 'p>o.ab', 'o#left>m1.imp', 'e#left>m1.a', 'm1>o.left', 'o#right>m2.imp', 'e#right>m2.a', 'm2>o.right', 'o>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('并非两个都', 'Not both'),
        tests: [{ premises: { p: '¬(A ∧ B)' }, goal: '¬A ∨ ¬B' }],
        cases: DAYS,
        brief: T('最后从「¬(今天是周六 ∧ 今天是周日)」，证明出「¬今天是周六 ∨ ¬今天是周日」。', 'Last, from “¬(today is Saturday ∧ today is Sunday)”, prove “¬today is Saturday ∨ ¬today is Sunday”.'),
        hint: [
          T('已知没说哪一个不成立。', 'The given does not say which one fails.'),
          T('今天是周六，或者不是：两边都讨论。', 'Today is Saturday, or it is not: take both sides.'),
        ],
        solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], g: ['impI', { A: 'B' }, 'e/left'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'], i1: ['orI', { other: '¬A', side: 'left' }, 'e/left'], i2: ['orI', { other: '¬B', side: 'right' }, 'e/right'] }, ['l>e.ab', 'e#left>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>i1.a', 'i1>e.left', 'e#right>i2.a', 'i2>e.right', 'e>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [
      { t: T('「既不是周六也不是周日」和「并非（周六或者周日）」是一回事；「并非（周六并且周日）」和「不是周六，或者不是周日」也是。这是<wiki-ref to="demorgan"></wiki-ref>。', '“Neither Saturday nor Sunday” and “not (Saturday or Sunday)” say the same; so do “not (Saturday and Sunday)” and “not Saturday, or not Sunday”. These are <wiki-ref to="demorgan"></wiki-ref>.') },
    ],
  },
  {
    id: 'q-dm',
    title: T('量词的德摩根律', 'De Morgan for quantifiers'),
    tasks: [
      prove({
        step: T('一个都没有', 'Not a single one'),
        tests: [{ premises: { p: '¬∃x. P(x)' }, goal: '∀x. ¬P(x)' }],
        cases: DRINK,
        hint: [
          T('任取一个 a，要证的是「¬a在喝酒」。', 'Take any a; the goal is “¬a is drinking”.'),
          T('假设 a 在喝酒，它就是已知所否认的那种例子。', 'Suppose a is drinking: then a is just the kind of example the given denies.'),
        ],
        solution: proof({ g: ['allI', { x: 'a' }], f: ['impI', { A: 'P(a)' }, 'g'], i: ['exI', {}, 'f'], m: ['mp', {}, 'f'] }, ['f#body>i.a', 'p>m.imp', 'i>m.a', 'm>f.body', 'f>g.body', 'g>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('都不，就是没有', 'All not is none'),
        tests: [{ premises: { p: '∀x. ¬P(x)' }, goal: '¬∃x. P(x)' }],
        cases: DRINK,
        brief: T('再从「∀x. ¬x在喝酒」证明出「¬∃x. x在喝酒」。', 'Now from “∀x. ¬x is drinking”, prove “¬∃x. x is drinking”.'),
        hint: [
          T('要证的是一个否定：假设有人在喝酒。', 'The goal is a negation: suppose someone is drinking.'),
          T('把这个人取出来，已知对他也成立。', 'Take that person out; the given holds of them too.'),
        ],
        solution: proof({ f: ['impI', { A: '∃x. P(x)' }], e: ['exE', { x: 'a' }, 'f'], a: ['allE', { t: 'a' }, 'e'], m: ['mp', {}, 'e'] }, ['f#body>e.ex', 'p>a.all', 'a>m.imp', 'e#body>m.a', 'm>e.body', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('有一个不', 'One who does not'),
        tests: [{ premises: { p: '∃x. ¬P(x)' }, goal: '¬∀x. P(x)' }],
        cases: DRINK,
        brief: T('再从「∃x. ¬x在喝酒」（有人没在喝酒），证明出「¬∀x. x在喝酒」（并非人人都在喝酒）。', 'Now from “∃x. ¬x is drinking” (someone is not drinking), prove “¬∀x. x is drinking” (not everyone is drinking).'),
        hint: [
          T('假设人人都在喝酒。', 'Suppose everyone is drinking.'),
          T('把那个没喝的人取出来：他也在「人人」之中。', 'Take out the one who is not drinking: they are among “everyone” too.'),
        ],
        solution: proof({ f: ['impI', { A: '∀x. P(x)' }], e: ['exE', { x: 'a' }, 'f'], a: ['allE', { t: 'a' }, 'e'], m: ['mp', {}, 'e'] }, ['p>e.ex', 'f#body>a.all', 'e#body>m.imp', 'a>m.a', 'm>e.body', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('并非人人', 'Not everyone'),
        sentences: ['¬∃x. ¬P(x)'],
        tests: [{ premises: { p: '¬∀x. P(x)' }, goal: '∃x. ¬P(x)' }],
        cases: DRINK,
        brief: T('最后从「¬∀x. x在喝酒」（并非人人都在喝酒），证明出「∃x. ¬x在喝酒」（有人没在喝酒）。', 'Last, from “¬∀x. x is drinking” (not everyone is drinking), prove “∃x. ¬x is drinking” (someone is not drinking).'),
        hint: [
          T('已知里没有一个具体的人可以举出来。试试反证。', 'The given names nobody to point to. Try proof by contradiction.'),
          T('假设「¬∃x. ¬x在喝酒」，再看能不能证出人人都在喝酒。', 'Assume “¬∃x. ¬x is drinking”, and see whether everyone drinking follows.'),
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
    ],
    intro: [
      { t: T('「没有人在喝酒」和「人人都没在喝酒」是一回事。∃ 像一个很长的「或者」，∀ 像一个很长的「并且」，所以<wiki-ref to="demorgan"></wiki-ref>对量词也成立。', '“Nobody is drinking” and “everyone is not drinking” say the same. ∃ is like a long “or” and ∀ a long “and”, so <wiki-ref to="demorgan"></wiki-ref> hold for quantifiers too.') },
      { t: T('四个方向都证出后，<part-ref to="lemma:dm"></part-ref>多出四个形状。', 'Once all four directions are proved, <part-ref to="lemma:dm"></part-ref> gains four shapes.') },
    ],
  },
  // ---------- topic: knights and knaves ----------
  {
    id: 'kk-one',
    title: T('一个岛民', 'One islander'),
    builds: 'liar',
    tasks: [
      translate({
        target: 'KA ↔ ¬KA',
        brief: T('岛民 a 说：「我是无赖。」把这句话接成电路：a 的话和他的身份相符的那几行，输出真。', 'An islander a says: “I am a knave.” Wire it as a circuit: it outputs true on the rows where what a says fits what a is.'),
        hint: [T('「我是无赖」就是「¬a 是骑士」。', '“I am a knave” is “¬a is a knight”.')],
        solution: board('KA ↔ ¬KA', { n: 'gNot', e: 'gIff' }, ['KA>n.a', 'KA>e.a', 'n>e.b', 'e>out']),
      }),
      prove({
        tests: [{ premises: { p: 'A ↔ ¬A' }, goal: '⊥' }],
        cases: [{ A: 'KA' }, { A: 'KC' }],
        intro: [{ t: T('证明谁也说不出「我是无赖」：从它的翻译推出矛盾。', 'Prove that nobody can say “I am a knave”: derive a contradiction from its translation.') }],
        hint: [
          T('先把 ↔ 拆成两个方向。', 'First split the ↔ into its two directions.'),
          T('「¬a 是骑士」就是「a 是骑士 → ⊥」。', '“¬a is a knight” is “a is a knight → ⊥”.'),
        ],
        solution: k1,
      }),
    ],
    intro: [
      { t: T('岛上的人要么是<b>骑士</b>，永远说真话；要么是<b>无赖</b>，永远说假话。', 'Everyone on the island is a <b>knight</b>, who always tells the truth, or a <b>knave</b>, who always lies.') },
      { t: T('岛民说一句话，「他是骑士」就和他的话<wiki-ref to="equivalence"></wiki-ref>，写成 ↔。翻译见<level-ref to="e-says"></level-ref>，证明器上拆开 ↔ 见<level-ref to="iffUse"></level-ref>。', 'When an islander says something, “he is a knight” is in <wiki-ref to="equivalence"></wiki-ref> with what he says, written ↔. You translated this in <level-ref to="e-says"></level-ref>, and took ↔ apart on the prover in <level-ref to="iffUse"></level-ref>.') },
    ],
    after: T('这是<wiki-ref to="liar"></wiki-ref>在岛上的样子。', 'This is the island’s form of the <wiki-ref to="liar"></wiki-ref>.'),
  },
  {
    id: 'kk-two',
    title: T('两个岛民', 'Two islanders'),
    tasks: [
      translate({
        target: 'KA ↔ ¬KA ∧ ¬KB',
        brief: T('岛上有 a、b 两人，a 说：「我们俩都是无赖。」把这句话接成电路：a 的话和他的身份相符的那几行，输出真。', 'Two islanders, a and b; a says: “We are both knaves.” Wire it as a circuit: it outputs true on the rows where what a says fits what a is.'),
        hint: [T('「我们俩都是无赖」就是「¬a 是骑士 ∧ ¬b 是骑士」。', '“We are both knaves” is “¬a is a knight ∧ ¬b is a knight”.')],
        solution: board('KA ↔ ¬KA ∧ ¬KB', { na: 'gNot', nb: 'gNot', both: 'gAnd', e: 'gIff' }, ['KA>na.a', 'KB>nb.a', 'na>both.a', 'nb>both.b', 'KA>e.a', 'both>e.b', 'e>out']),
      }),
      prove({
        tests: [{ premises: { p: 'A ↔ ¬A ∧ ¬B' }, goal: '¬A ∧ B' }],
        cases: [{ A: 'KA', B: 'KB' }, { A: 'KC', B: 'KD' }],
        brief: T('已知「a 是骑士 ↔ ¬a 是骑士 ∧ ¬b 是骑士」，证明出「¬a 是骑士 ∧ b 是骑士」。', 'Given “a is a knight ↔ ¬a is a knight ∧ ¬b is a knight”, prove “¬a is a knight ∧ b is a knight”.'),
        hint: [
          T('先证「¬a 是骑士」：假设 a 是骑士，看他的话说了什么。', 'First prove “¬a is a knight”: suppose a is a knight, and look at what he says.'),
          T('a 是无赖，他的话就是假的。b 是骑士这一半，试试反证。', 'If a is a knave, his statement is false. For the half about b, try proof by contradiction.'),
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
    intro: [{ t: T('b 什么也没说，可 a 的话提到了他。', 'b says nothing, but what a says mentions him.') }],
  },
  {
    id: 'kk-three',
    title: T('骑士与无赖', 'Knights and knaves'),
    tasks: [
      translate({
        target: 'KA ↔ ¬KA ∨ KB',
        brief: T('岛上有 a、b 两人，a 说：「我是无赖，或者 b 是骑士。」把这句话接成电路：a 的话和他的身份相符的那几行，输出真。', 'Two islanders, a and b; a says: “I am a knave, or b is a knight.” Wire it as a circuit: it outputs true on the rows where what a says fits what a is.'),
        hint: [T('a 的话是「¬a 是骑士 ∨ b 是骑士」。', 'What a says is “¬a is a knight ∨ b is a knight”.')],
        solution: board('KA ↔ ¬KA ∨ KB', { na: 'gNot', o: 'gOr', e: 'gIff' }, ['KA>na.a', 'na>o.a', 'KB>o.b', 'KA>e.a', 'o>e.b', 'e>out']),
      }),
      prove({
        tests: [{ premises: { p: 'A ↔ ¬A ∨ B' }, goal: 'A ∧ B' }],
        cases: [{ A: 'KA', B: 'KB' }, { A: 'KC', B: 'KD' }],
        brief: T('已知「a 是骑士 ↔ ¬a 是骑士 ∨ b 是骑士」，证明出「a 是骑士 ∧ b 是骑士」。', 'Given “a is a knight ↔ ¬a is a knight ∨ b is a knight”, prove “a is a knight ∧ b is a knight”.'),
        hint: [
          T('先证「a 是骑士」：他是不是骑士，两边都讨论。', 'First prove “a is a knight”: take both sides of whether he is.'),
          T('a 是骑士，他的话就是真的；再对他的话分情况。', 'If a is a knight, his statement is true; then take cases on it.'),
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
  },
  // ---------- challenges ----------
  {
    id: 'peirce',
    kind: 'proof',
    title: T('皮尔士律', 'Peirce’s law'),
    tests: [{ goal: '((A → B) → A) → A' }],
    cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Exam', B: 'Pass' }],
    hint: [
      T('下不下雨，两边都讨论。', 'Rain or no rain: take both sides.'),
      T('不下雨的那一边，要设法得到「下雨 → 地湿」。', 'On the side where it does not rain, find a way to get “it rains → the ground is wet”.'),
    ],
    intro: [{ t: T('这句话只有 →，看着古怪，真值表上每一行却都真。', 'This sentence has nothing but →. It looks strange, yet it is true on every row.') }],
    solution: proof({ f: ['impI', { A: '(A → B) → A' }], l: ['lem', { A: 'A' }, 'f'], e: ['orE', {}, 'f'], g: ['impI', { A: 'A' }, 'e/right'], m: ['mp', {}, 'g'], b: ['botE', { C: 'B' }, 'g'], m2: ['mp', {}, 'e/right'] }, ['l>e.ab', 'e#left>e.left', 'e#right>m.imp', 'g#body>m.a', 'm>b.bot', 'b>g.body', 'f#body>m2.imp', 'g>m2.a', 'm2>e.right', 'e>f.body', 'f>goal']),
    naive: proof({ f: ['impI', { A: '(A → B) → A' }] }, ['f#body>f.body', 'f>goal']),
    after: T('这是皮尔士律。在只有 → 的语言里，加上它就得到经典逻辑。', 'This is Peirce’s law. Added to a language of → alone, it gives classical logic.'),
  },
  {
    id: 'drinker',
    kind: 'proof',
    title: T('酒鬼悖论', 'The drinker paradox'),
    tests: [{ goal: '∃x. D(x) → ∀y. D(y)' }],
    cases: [{ D: 'Drinks' }, { D: 'Sings' }],
    brief: T('酒吧里至少有一个人。不需要任何已知，证明出「∃x. x在喝酒 → ∀y. y在喝酒」：有这么一个人，只要他喝酒，大家就都在喝。', 'There is at least one person in the pub. Prove “∃x. x is drinking → ∀y. y is drinking” from nothing given: there is someone such that, if they drink, everyone drinks.'),
    hint: [
      T('别急着找那个人。先问：是不是大家都在喝？', 'Do not look for that person yet. Ask first: is everyone drinking?'),
      T('不是大家都在喝时，<part-ref to="lemma:dm"></part-ref>能给出什么？', 'If not everyone is drinking, what does <part-ref to="lemma:dm"></part-ref> give?'),
    ],
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
    after: T('听着荒唐，却是经典逻辑的定理：证明说有这么一个人，却不指出是谁。', 'It sounds absurd, yet it is a theorem of classical logic: the proof says such a person exists without saying who.'),
  },
]
