// Chapter 2 · The kernel: the prover's first proving module, built on two parts: Apply uses an "if … then …" up, the
// assumption box makes one. Each is met on its own line (Apply with a few short exercises from different angles;
// the box with K, proved by nesting boxes), then both together. K and S, proved with boxes, become parts and are
// practised; Chain, Swap and Merge are built with boxes and stay in the prover. The challenges hold the box back and prove with K, S and
// Apply alone, the way a prover with only axioms works.
// Each level is a pattern (letters appear only here) plus test cases: one proof must hold on every set of sentences,
// and on the pattern in bare letters, the last test. Brief, intro and pass texts use the first case (rain)
// as their example.
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
// A → A from K and S (一个前提也没有).
const identity = proof({
  s: ['axS', { A: 'A', B: 'A → A', C: 'A' }],
  k1: ['axK', { A: 'A', B: 'A → A' }],
  m1: ['mp'],
  k2: ['axK', { A: 'A', B: 'A' }],
  m2: ['mp'],
}, ['s>m1.imp', 'k1>m1.a', 'm1>m2.imp', 'k2>m2.a', 'm2>goal'])

export const era1 = [
  {
    id: 'copy',
    kind: 'proof',
    title: T('照抄', 'Copy'),
    tests: [{ premises: { p: 'A' }, goal: 'A' }],
    cases: [{ A: 'Rain' }, { A: 'Bus' }],
    solution: proof({}, ['p>goal'], { premises: ['p'] }),
    hint: [T('已知的圆点在右边，目标的圆点在左边。', 'A given’s dot is on its right; the goal’s dot is on its left.')],
    intro: [
      { t: T("基本命题每多一个，真值表的行数就翻一倍。证明器的新模块<wiki-ref to=\"kernel\"></wiki-ref>换一种办法：从前提出发，按<wiki-ref to=\"rule\"></wiki-ref>一步步推出结论。", "Each extra atom doubles the rows of a truth table. The prover’s new module, the <wiki-ref to=\"kernel\"></wiki-ref>, works another way: from premises to a conclusion, one <wiki-ref to=\"rule\"></wiki-ref> at a time.") },
      { t: T("板左边的<b>已知</b>是前提，右边的<b>目标</b>是要证的命题。一根线传的是一句已经证出的话。", "The <b>givens</b> on the left are the premises; the <b>goal</b> on the right is the proposition to prove. A wire carries a sentence already proved.") },
      { t: T("下方的<b>测试</b>把同一个命题模式里的字母换成不同的句子，最后一个就是字母本身。同一块电路要通过每一个测试。", "The <b>tests</b> below put different sentences in place of the letters of one pattern, the last being the letters themselves. One board must pass them all.") },
    ],
  },
  {
    id: 'mp',
    title: T('套用', 'Apply'),
    tasks: [
      {
        kind: 'proof',
        step: T('套用', 'Apply'),
        tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'A' }, goal: 'C' }],
        cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Alarm', B: 'Up', C: 'OnTime' }],
        adds: ['mp'],
        hint: [
          T('先只看「下雨 → 地湿」和「下雨」。', 'Look first at just “it rains → the ground is wet” and “it rains”.'),
          T('套用的输出和已知一样，也能接进别的元件。', 'An Apply’s output, like a given, can go into another part.'),
        ],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'r>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      },
      {
        kind: 'proof',
        step: T('用不着的已知', 'A given you do not need'),
        tests: [{ premises: { p: 'A → B', q: 'C → B', r: 'C', s: 'B → D' }, goal: 'D' }],
        cases: [{ A: 'Bus', B: 'OnTime', C: 'Bike', D: 'Happy' }, { A: 'Coffee', B: 'Awake', C: 'Tea', D: 'Pass' }],
        hint: [T('从目标倒着想：哪一句能给出「我很开心」？', 'Work back from the goal: which sentence can give “I am happy”?')],
        intro: [{ t: T("已知不一定都用得上。", "Not every given is needed.") }],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['q>m1.imp', 'r>m1.a', 's>m2.imp', 'm1>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r', 's'] }),
      },
    ],
    intro: [
      { t: T("新元件<part-ref to=\"part:mp\"></part-ref>是一条证明规则：一个输入接 A → B，另一个接 A，输出 B。", "The new part <part-ref to=\"part:mp\"></part-ref> is a proof rule: one input takes A → B, the other A, and it outputs B.") },
      { t: T("元件从上方的元件栏放到板上。输入对不上时，元件会显示它要的和收到的。", "Parts go onto the board from the tray above. When an input does not fit, the part shows what it wants and what it got.") },
    ],
    after: T("这条规则在逻辑学里叫<b>肯定前件式</b>（modus ponens）。", "Logicians call this rule <b>modus ponens</b>."),
  },
  {
    id: 'assume',
    title: T('加一个假设', 'An assumption'),
    showcase: 'a box has a region and two dots, and what is made inside leaves only through its conclusion',
    tasks: [
      {
        kind: 'proof',
        step: T('加一个假设', 'One assumption'),
        tests: [{ premises: { p: 'A' }, goal: 'B → A' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Coffee', B: 'Late' }],
        adds: ['impI'],
        briefNote: T('用假设框。', 'With the assumption box.'),
        hint: [
          T('目标「若」后面的是什么？', 'What follows the “if” in the goal?'),
          T('框里看得见板上的已知。', 'From inside the box, the givens on the board are visible.'),
        ],
        solution: proof({ f: ['impI', { A: 'B' }] }, ['p>f.body', 'f>goal'], { premises: ['p'] }),
        naive: proof({ f: ['impI', { A: 'B' }] }, ['p>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('再加一个假设', 'One more assumption'),
        tests: [{ premises: { p: 'A' }, goal: 'B → (C → A)' }],
        cases: [{ A: 'Rain', B: 'Sat', C: 'Wind' }, { A: 'Coffee', B: 'Late', C: 'Tea' }],
        hint: [
          T('目标里有几个 →？', 'How many →s are in the goal?'),
        ],
        intro: [
          { t: T('框里可以再放框。里面的框看得见外面框的假设，也看得见板上的已知。', 'A box can sit inside a box. The inner one sees the outer one’s assumption and the givens on the board.') },
        ],
        solution: proof({ f: ['impI', { A: 'B' }], g: ['impI', { A: 'C' }, 'f'] }, ['p>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
      },
    ],
    intro: [
      { t: T('怎样证明「若 A，则 B」？可以先暂时假设 A，再看能否在这个条件下证明 B。<wiki-ref to="assumption"></wiki-ref>只是推理的出发点，并不表示 A 已经成立。', 'How can we prove “if A, then B”? We can temporarily assume A and prove B under that condition. An <wiki-ref to="assumption"></wiki-ref> is a starting point for reasoning; it does not assert that A already holds.') },
      { t: T('<part-ref to="part:impI"></part-ref>用一个框表示这段推理。在元件上选择假设 A，框内就可以使用它；将框内证出的 B 接到「结论」，框外便得到 A → B。', 'The <part-ref to="part:impI"></part-ref> represents this reasoning with a box. Choose A as the assumption on the part and it becomes available inside. Connect the B proved inside to “Conclusion”, and the box gives A → B outside.') },
      { t: T('离开框后，临时假设 A 不再作为已知；框外的结论说明的是：如果 A 成立，那么 B 成立。证明中用到的其他已知仍然保留。', 'Outside the box, the temporary assumption A is no longer a given. The conclusion says that if A holds, B follows; any other givens used in the proof still remain.') },
    ],
  },
  {
    id: 'box',
    kind: 'proof',
    title: T('先假设，再套用', 'Assume, then apply'),
    tests: [{ premises: { p: 'A → (B → C)', q: 'B' }, goal: 'A → C' }],
    cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }, { A: 'Alarm', B: 'Coffee', C: 'Awake' }],
    briefNote: T('用假设框。', 'With the assumption box.'),
    hint: [
      T('目标「若」后面的是什么？', 'What follows the “if” in the goal?'),
      T('先点一下框里的空白，再放元件，元件就落在框里。', 'Click the empty space inside the box first, and the parts you place next land in it.'),
    ],
    intro: [
      { t: T('周六的话，下雨我就在家休息。今天下雨了。', 'On a Saturday, if it rains I rest at home. It is raining.') },
    ],
    solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
  },
  {
    id: 's',
    kind: 'proof',
    title: T('在条件下套用', 'Apply under a condition'),
    tests: [{ goal: '(A → (B → C)) → ((A → B) → (A → C))' }],
    cases: [{ A: 'Rain', B: 'Wind', C: 'Wet' }, { A: 'Exam', B: 'Study', C: 'Pass' }],
    builds: 'axS',
    hint: [
      T('数一数最外层有几个 →。', 'Count the outermost →s.'),
      T('最里面的框里，三个假设都看得见。', 'Inside the innermost box, all three assumptions are visible.'),
    ],
    intro: [{ t: T('下雨的时候，只要刮风，就地湿；下雨的时候，一定刮风。那么下雨的时候，就地湿：这是在「下雨」这个条件下套用。这句话叫 <part-ref to="lemma:axS"></part-ref>。', 'When it rains, if it is windy the ground is wet; when it rains, it is windy. So when it rains, the ground is wet: Apply under the condition “it rains”. This sentence is called <part-ref to="lemma:axS"></part-ref>.') }],
    solution: proof({ f: ['impI', { A: 'A → (B → C)' }], g: ['impI', { A: 'A → B' }, 'f'], h: ['impI', { A: 'A' }, 'g'], m1: ['mp', {}, 'h'], m2: ['mp', {}, 'h'], m3: ['mp', {}, 'h'] }, ['f#body>m1.imp', 'h#body>m1.a', 'g#body>m2.imp', 'h#body>m2.a', 'm1>m3.imp', 'm2>m3.a', 'm3>h.body', 'h>g.body', 'g>f.body', 'f>goal']),
  },
  {
    id: 'chain',
    kind: 'proof',
    title: T('接起来', 'Join them'),
    tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }],
    cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Alarm', B: 'Up', C: 'OnTime' }],
    builds: 'chain',
    hint: [T('目标是一句「若下雨，则…」。', 'The goal is “if it rains, then …”.')],
    intro: [
      { t: T('证出的证明可以存成元件，以后直接用，不必再开框。几种常用的推理，先各造一个。', 'A proof, once wired, can be kept as a part and used from then on without opening a box. First, a part for each of a few moves that come up all the time.') },
      { t: T('下雨，就地湿；地湿，就路滑。所以下雨，就路滑。凭直觉一步就到，证明核却没有这条规则。', 'If it rains, the ground is wet; if the ground is wet, the road is slippery. So if it rains, the road is slippery. One step by instinct, but the kernel has no such rule.') },
    ],
    solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
    after: T("证出来、留着再用的结论叫<wiki-ref to=\"lemma\"></wiki-ref>。这样的元件只是给一段证明起的名字，即<wiki-ref to=\"definition\"></wiki-ref>，不增加能证的东西。", "A proved result kept for reuse is a <wiki-ref to=\"lemma\"></wiki-ref>. Such a part is only a name for a proof, a <wiki-ref to=\"definition\"></wiki-ref>, and adds nothing to what can be proved."),
  },
  {
    id: 'k',
    title: T('多一个条件也无妨', 'One more condition does no harm'),
    builds: 'axK',
    tasks: [
      {
        kind: 'proof',
        step: T('假设什么，就得到什么', 'What you assume, you have'),
        tests: [{ goal: 'A → A' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        hint: [T('框里看得见哪些话？', 'What can be seen from inside the box?')],
        solution: proof({ f: ['impI', { A: 'A' }] }, ['f#body>f.body', 'f>goal']),
      },
      {
        kind: 'proof',
        step: T('多一个条件也无妨', 'An extra condition'),
        tests: [{ goal: 'A → (B → A)' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Coffee', B: 'Late' }],
        hint: [
          T('目标里有几个 →？', 'How many →s are in the goal?'),
          T('里面的框看得见外面框的假设。', 'The inner box sees the outer box’s assumption.'),
        ],
        intro: [
          { t: T('已经成立的事，加上什么条件都还成立：不管刮不刮风，下雨就是下雨。这句话叫 <part-ref to="lemma:axK"></part-ref>。', 'What holds still holds under any extra condition: windy or not, it rains. The sentence is called <part-ref to="lemma:axK"></part-ref>.') },
        ],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'B' }, 'f'] }, ['f#body>g.body', 'g>f.body', 'f>goal']),
      },
    ],
    intro: [{ t: T('这一关没有已知。', 'This level has no givens.') }],
    after: T('在没有框的<wiki-ref to="hilbert"></wiki-ref>里，K 是一条不用证的<wiki-ref to="axiom"></wiki-ref>。', 'In a <wiki-ref to="hilbert"></wiki-ref>, which has no box, K is an <wiki-ref to="axiom"></wiki-ref>, taken without proof.'),
  },
  {
    id: 'twice',
    kind: 'proof',
    title: T('同一个条件说两遍', 'The same condition twice'),
    tests: [{ premises: { p: 'A → (A → B)' }, goal: 'A → B' }],
    cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Hungry', B: 'Eat' }],
    hint: [
      T('目标是一句「若下雨，则…」。', 'The goal is “if it rains, then …”.'),
      T('框里的一句假设能用几次？', 'How many times can an assumption in a box be used?'),
    ],
    intro: [
      { t: T('「下雨 → (下雨 → 地湿)」把条件「下雨」说了两遍。直觉上，说一遍就够了。', '“it rains → (it rains → the ground is wet)” states the condition “it rains” twice. Surely once is enough.') },
    ],
    builds: 'merge',
    solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'm1>m2.imp', 'f#body>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p'] }),
    naive: proof({ m: ['mp'] }, ['p>m.imp', 'p>m.a', 'm>goal'], { premises: ['p'] }),
  },
  // ---- practice with Apply alone ----

  {
    id: 'nested',
    title: T('一句里套着一句', 'One inside another'),
    tasks: [
      {
        kind: 'proof',
        step: T('一句里套着一句', 'A sentence inside a sentence'),
        tests: [{ premises: { p: 'A', q: 'A → (B → C)', r: 'B' }, goal: 'C' }],
        cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }, { A: 'Exam', B: 'Study', C: 'Pass' }],
        hint: [T('套用的结果本身也可以是一句「若…则…」。', 'What Apply gives can itself be an “if … then …”.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['q>m1.imp', 'p>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      },
      {
        kind: 'proof',
        step: T('推出来的规则', 'A rule you proved'),
        tests: [{ premises: { p: 'A', q: 'A → (B → C)', r: '(B → C) → D' }, goal: 'D' }],
        cases: [{ A: 'Sat', B: 'Rain', C: 'Rest', D: 'Happy' }, { A: 'Alarm', B: 'Coffee', C: 'Awake', D: 'OnTime' }],
        hint: [T('最后一句已知的前件是什么？', 'What is the antecedent of the last given?')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['q>m1.imp', 'p>m1.a', 'r>m2.imp', 'm1>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      },
    ],
    intro: [
      { t: T('一条条件命题的结论也可以是另一条条件命题。例如，「若今天是周六，则（若下雨，则我休息）」说的是：在今天是周六的条件下，「若下雨，则我休息」成立。', 'The conclusion of a conditional can itself be another conditional. For example, “if today is Saturday, then (if it rains, I rest)” says that the whole statement “if it rains, I rest” holds on the condition that today is Saturday.') },
      { t: T('括号表明哪些话属于同一层。一次套用得到的结论可以是一整条条件命题；这条命题也能像其他已知一样，作为之后推理的前提。', 'The parentheses show which parts belong together. One use of Apply can produce an entire conditional, which can then serve as a premise in further reasoning, just like a given.') },
    ],
  },
  // ---- practice with the box ----
  // ---- the parts at work ----
  {
    id: 'swap',
    kind: 'proof',
    title: T('换一换条件的顺序', 'Swap the conditions'),
    tests: [{ premises: { p: 'A → (B → C)' }, goal: 'B → (A → C)' }],
    cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }, { A: 'Exam', B: 'Study', C: 'Pass' }],
    builds: 'swap',
    hint: [
      T('目标里有几个 →？', 'How many →s are in the goal?'),
      T('最里面的框里，两个条件都看得见。', 'Inside the innermost box, both conditions are visible.'),
    ],
    intro: [
      { t: T('「周六的话，下雨我就休息」和「下雨的话，周六我就休息」说的是一回事，可证明核只认证出来的东西。', '“On a Saturday, if it rains I rest” and “if it rains, on a Saturday I rest” say the same thing, but the kernel only accepts what is proved.') },
    ],
    solution: proof({ f: ['impI', { A: 'B' }], g: ['impI', { A: 'A' }, 'f'], m1: ['mp', {}, 'g'], m2: ['mp', {}, 'g'] }, ['p>m1.imp', 'g#body>m1.a', 'm1>m2.imp', 'f#body>m2.a', 'm2>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
  },
  {
    id: 'mergeUse',
    kind: 'proof',
    title: T('接起来，再合并', 'Chain, then merge'),
    tests: [{ premises: { p: 'A → B', q: 'B → (A → C)' }, goal: 'A → C' }],
    cases: [{ A: 'Alarm', B: 'Up', C: 'OnTime' }, { A: 'Exam', B: 'Study', C: 'Pass' }],
    hint: [T('用<part-ref to="lemma:chain"></part-ref>以后，「闹钟响了」说了两遍。', 'After <part-ref to="lemma:chain"></part-ref>, “the alarm rings” is said twice.')],
    solution: proof({ c: ['chain'], g: ['merge'] }, ['p>c.p0', 'q>c.p1', 'c>g.p0', 'g>goal'], { premises: ['p', 'q'] }),
  },
  {
    id: 'mergeLong',
    kind: 'proof',
    title: T('绕一大圈', 'A long way round'),
    tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'C → (D → (A → E))', d: 'D' }, goal: 'A → E' }],
    cases: [{ A: 'Alarm', B: 'Up', C: 'Coffee', D: 'Bus', E: 'OnTime' }, { A: 'Rain', B: 'Wet', C: 'Slip', D: 'Bike', E: 'Fall' }],
    hint: [T('接成一段以后，「我坐公交」卡在两遍「闹钟响了」中间。', 'Once joined into one piece, “I take the bus” sits between the two “the alarm rings”s.')],
    intro: [{ t: T('三句已知首尾相接，最后又绕回起点「闹钟响了」。', 'Three givens meet end to end, and the last comes back round to the start, “the alarm rings”.') }],
    solution: proof({ c1: ['chain'], c2: ['chain'], w: ['swap'], m: ['mp'], g: ['merge'] }, ['p>c1.p0', 'q>c1.p1', 'c1>c2.p0', 'r>c2.p1', 'c2>w.p0', 'w>m.imp', 'd>m.a', 'm>g.p0', 'g>goal'], { premises: ['p', 'q', 'r', 'd'] }),
  },
  {
    id: 'mergeBoth',
    kind: 'proof',
    title: T('对不上的两句', 'Two that do not meet'),
    tests: [{ premises: { p: 'A → (A → B)', q: 'A → (B → C)' }, goal: 'A → C' }],
    cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Hungry', B: 'Eat', C: 'Full' }],
    hint: [
      T('两句都以「下雨」开头，所以首尾接不上。', 'Both start with “it rains”, so they do not meet end to end.'),
      T('能不能让第二句以「地湿」开头？', 'Can the second be made to start with “the ground is wet”?'),
    ],
    solution: proof({ g1: ['merge'], w: ['swap'], c: ['chain'], g2: ['merge'] }, ['p>g1.p0', 'q>w.p0', 'g1>c.p0', 'w>c.p1', 'c>g2.p0', 'g2>goal'], { premises: ['p', 'q'] }),
  },
  // The topic without the box: K, S and Apply alone, the way a prover with only axioms works, harder each time.
  {
    id: 'x-k',
    title: T('不用框：K 和 S', 'Without the box: K and S'),
    without: ['impI', 'chain', 'swap', 'merge'],
    tasks: [
      {
        kind: 'proof',
        step: T('不用框加条件', 'A condition without a box'),
        tests: [{ premises: { p: 'A' }, goal: 'B → A' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Coffee', B: 'Late' }],
        briefNote: T('不用假设框。', 'Without the assumption box.'),
        hint: [T('K 说的是什么？', 'What does K say?')],
        solution: proof({ k: ['axK', { A: 'A', B: 'B' }], m: ['mp'] }, ['k>m.imp', 'p>m.a', 'm>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('不用框在条件下套用', 'Under a condition without a box'),
        tests: [{ premises: { p: 'A → (B → (C → D))', q: 'A → B' }, goal: 'A → (C → D)' }],
        cases: [{ A: 'Sat', B: 'Rain', C: 'Hungry', D: 'Eat' }, { A: 'Exam', B: 'Study', C: 'Coffee', D: 'Awake' }],
        briefNote: T('不用假设框。', 'Without the assumption box.'),
        hint: [
          T('在条件下套用，是 S 的事。', 'Apply under a condition is what S does.'),
          T('S 的三句不一定都是一个词。', 'S’s three sentences need not each be a single word.'),
        ],
        solution: proof({ s: ['axS', { A: 'A', B: 'B', C: 'C → D' }], m1: ['mp'], m2: ['mp'] }, ['s>m1.imp', 'p>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>goal'], { premises: ['p', 'q'] }),
      },
    ],
    intro: [
      { t: T('这个专题拿走框，只剩套用和证出的 K、S。早期的证明器就是这样：一条规则，其余的出发点都是<wiki-ref to="axiom"></wiki-ref>。这样的证明器叫<wiki-ref to="hilbert"></wiki-ref>。', 'This topic takes the box away, leaving Apply and the K and S you proved. Early provers were like this: one rule, and every other starting point an <wiki-ref to="axiom"></wiki-ref>. Such a prover is a <wiki-ref to="hilbert"></wiki-ref>.') },
    ],
  },
  {
    id: 'x-self',
    kind: 'proof',
    title: T('不用框恒等', 'Identity without a box'),
    tests: [{ goal: 'A → A' }],
    cases: [{ A: 'Rain' }, { A: 'Sat' }],
    without: ['impI', 'chain', 'swap', 'merge'],
    briefNote: T('不用假设框。', 'Without the assumption box.'),
    hint: [
      T('从 S 开始：S 套用两次之后得到的是什么？', 'Start from S: what does it give after two Applies?'),
      T('S 的第二句不一定是一个词。S 要的两句，都能用 K 造。', 'S’s second sentence need not be a single word. Both sentences S then needs can be made with K.'),
    ],
    solution: proof({
      s: ['axS', { A: 'A', B: 'A → A', C: 'A' }],
      k1: ['axK', { A: 'A', B: 'A → A' }],
      m1: ['mp'],
      k2: ['axK', { A: 'A', B: 'A' }],
      m2: ['mp'],
    }, ['s>m1.imp', 'k1>m1.a', 'm1>m2.imp', 'k2>m2.a', 'm2>goal']),
  },
  {
    id: 'x-merge',
    kind: 'proof',
    title: T('不用框合并', 'Merging without a box'),
    sentences: ['A → A'],
    tests: [{ premises: { p: 'A → (A → B)' }, goal: 'A → B' }],
    cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Hungry', B: 'Eat' }],
    without: ['impI', 'chain', 'swap', 'merge'],
    briefNote: T('不用假设框。', 'Without the assumption box.'),
    hint: [
      T('已知能接进哪一种 S？', 'Which S can the given go into?'),
      T('S 和已知套用以后，还差什么？它在<level-ref to="x-self"></level-ref>里拼过。', 'After S is applied to the given, what is still missing? You pieced it together in <level-ref to="x-self"></level-ref>.'),
    ],
    solution: proof({
      s: ['axS', { A: 'A', B: 'A', C: 'B' }],
      m: ['mp'],
      s2: ['axS', { A: 'A', B: 'A → A', C: 'A' }],
      k1: ['axK', { A: 'A', B: 'A → A' }],
      m1: ['mp'],
      k2: ['axK', { A: 'A', B: 'A' }],
      m2: ['mp'],
      m3: ['mp'],
    }, ['s>m.imp', 'p>m.a', 's2>m1.imp', 'k1>m1.a', 'm1>m2.imp', 'k2>m2.a', 'm>m3.imp', 'm2>m3.a', 'm3>goal'], { premises: ['p'] }),
  },
  {
    id: 'x-chain',
    kind: 'proof',
    title: T('不用框接起来', 'Joining without a box'),
    tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }],
    cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Alarm', B: 'Up', C: 'OnTime' }],
    without: ['impI', 'chain', 'swap', 'merge'],
    briefNote: T('不用假设框。', 'Without the assumption box.'),
    hint: [
      T('有框时，证明是什么样子？框里的每一步，没有框时由谁来做？', 'What does the proof look like with a box? Without one, what does each step inside it?'),
      T('框里的套用是在条件「下雨」下做的。', 'The Apply inside the box happens under the condition “it rains”.'),
    ],
    solution: proof({
      k: ['axK', { A: 'B → C', B: 'A' }],
      m1: ['mp'],
      s: ['axS', { A: 'A', B: 'B', C: 'C' }],
      m2: ['mp'],
      m3: ['mp'],
    }, ['k>m1.imp', 'q>m1.a', 's>m2.imp', 'm1>m2.a', 'm2>m3.imp', 'p>m3.a', 'm3>goal'], { premises: ['p', 'q'] }),
    after: T('任何一个框都能换成 K、S 和套用，这叫<wiki-ref to="deduction"></wiki-ref>。', 'Any box can be traded for K, S and Apply: the <wiki-ref to="deduction"></wiki-ref>.'),
  },
  {
    id: 'x-swap',
    // The proof's steps name sentences the premise and goal do not hold whole: the card offers them too.
    sentences: ['(A → B) → (A → C)'],
    kind: 'proof',
    title: T('不用框换顺序', 'Reordering without a box'),
    tests: [{ premises: { p: 'A → (B → C)' }, goal: 'B → (A → C)' }],
    cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }, { A: 'Exam', B: 'Study', C: 'Pass' }],
    without: ['impI', 'chain', 'swap', 'merge'],
    briefNote: T('不用假设框。', 'Without the assumption box.'),
    hint: [
      T('已知能接进哪一种 S？套用以后得到什么？', 'Which S can the given go into, and what does Apply then give?'),
      T('还缺的一段，K 能不能补上？两段首尾相接以后，照<level-ref to="x-chain"></level-ref>接起来。', 'Can K supply the missing piece? Once two pieces meet end to end, join them as in <level-ref to="x-chain"></level-ref>.'),
    ],
    solution: proof({
      s: ['axS', { A: 'A', B: 'B', C: 'C' }],
      m1: ['mp'],
      k: ['axK', { A: 'B', B: 'A' }],
      k2: ['axK', { A: '(A → B) → (A → C)', B: 'B' }],
      m2: ['mp'],
      s2: ['axS', { A: 'B', B: 'A → B', C: 'A → C' }],
      m3: ['mp'],
      m4: ['mp'],
    }, ['s>m1.imp', 'p>m1.a', 'k2>m2.imp', 'm1>m2.a', 's2>m3.imp', 'm2>m3.a', 'm3>m4.imp', 'k>m4.a', 'm4>goal'], { premises: ['p'] }),
  },
]
