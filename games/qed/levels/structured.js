// Chapter 15 · Structured proofs (graduation): a proof written for people to read, as Isar writes it, have … show,
// each row one card of the proof board. No new rule: by after a row is a card (a rule, a lemma) or a tactic built
// before (auto, simp, metis, induction), and a block (proof … qed) is a box: assume for an assumption box, fix for For
// any, obtain for Take the one there is. Reading first (each row's by chosen, then the same proof wired), then writing
// (a missing have, a whole proof in one line, fix, obtain), then whole proofs written from nothing.
import { proof } from '../../kit/domains/logic/build.js'
import { TERM_WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
// A script task: the rows of `given` to start from; `locked`: only each row's by may change.
const script = (task) => ({ kind: 'script', ...task })
const read = (task) => script({ step: T('读', 'Read'), locked: true, brief: T('这段脚本每一句后面的 by 还空着。选出每一句用的规则。', 'Each row’s by is still empty in this script. Choose the rule each row uses.'), ...task })
const wire = (task) => ({ kind: 'proof', step: T('接线', 'Wire'), cases: [], brief: T('在证明板上接出这段脚本写的证明。', 'Wire on the proof board the proof this script writes.'), ...task })
const WRITE = T('写一段脚本，证出要证的那句。', 'Write a script that proves the sentence.')
const ADDER = { s: 'Sum ↔ (InA ∨ InB) ∧ ¬(InA ∧ InB)', c: 'Carry ↔ InA ∧ InB' }

// Rain makes it wet, and wet makes it slip: the opening script, and its proof wired.
const CHAIN = [
  { k: 'show', stmt: 'Rain → Wet ∧ Slip', by: 'proof' },
  { k: 'assume', stmt: 'Rain' },
  { k: 'have', stmt: 'Wet', using: ['p', 'a1'], by: 'rule:mp' },
  { k: 'have', stmt: 'Slip', using: ['q', 'h1'], by: 'rule:mp' },
  { k: 'show', stmt: 'Wet ∧ Slip', using: ['h1', 'h2'], by: 'rule:conjI' },
]
const blank = (rows) => rows.map((r) => (r.by && r.by !== 'proof' ? { ...r, by: '' } : r))
const BOXES = [
  { k: 'show', stmt: 'Rain → (Wind → Wet)', by: 'proof' },
  { k: 'assume', stmt: 'Rain' },
  { k: 'show', stmt: 'Wind → Wet', by: 'proof' },
  { k: 'assume', stmt: 'Wind' },
  { k: 'have', stmt: 'Rain ∧ Wind', using: ['a1', 'a2'], by: 'rule:conjI' },
  { k: 'show', stmt: 'Wet', using: ['p', 'h1'], by: 'rule:mp' },
]

export const structured = [
  // ---------- reading scripts ----------
  {
    id: 'sc-rows',
    title: T('一句一个元件', 'A row is a part'),
    tasks: [
      read({
        premises: { p: 'Rain → Wet', q: 'Wet → Slip' },
        goal: 'Rain → Wet ∧ Slip',
        given: blank(CHAIN),
        answer: CHAIN,
        naive: CHAIN.map((r, k) => (k === 2 ? { ...r, by: 'rule:conjI' } : r)),
        hint: [T('由「下雨」和「下雨 → 地湿」得出「地湿」，用的是哪一条规则？', 'From “it rains” and “it rains → the ground is wet” to “the ground is wet”: which rule is that?')],
      }),
      wire({
        tests: [{ premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Wet ∧ Slip' }],
        script: CHAIN,
        hint: [T('proof 到 qed 是一个假设框，assume 是框里的假设。', 'proof to qed is an assumption box, and assume is what it assumes.')],
        solution: proof({ f: ['impI', { A: 'Rain' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], c: ['andI', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm1>c.a', 'm2>c.b', 'c>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [
      { t: T('<wiki-ref to="provers"></wiki-ref>里的证明也可以写给人读，这叫<wiki-ref to="scripts"></wiki-ref>。这一章的脚本照 Isabelle 的 Isar 写法：have 证出路上的一句，show 证出要证的那句，by 后面写这一句用的规则或证明助手，using 后面写它用到的事实；proof … qed 是一个块。', 'Proofs in a <wiki-ref to="provers"></wiki-ref> can also be written for people to read: a <wiki-ref to="scripts"></wiki-ref>. This chapter’s scripts follow Isabelle’s Isar: have proves a sentence on the way, show the one wanted, by names the rule or proof assistant a row uses and using the facts it uses; proof … qed is a block.') },
    ],
    after: T('脚本和证明电路是同一个证明的两种写法。', 'A script and a proof circuit are two ways of writing one proof.'),
  },
  {
    id: 'sc-block',
    title: T('块套着块', 'Blocks in blocks'),
    tasks: [
      read({
        premises: { p: 'Rain ∧ Wind → Wet' },
        goal: 'Rain → (Wind → Wet)',
        given: blank(BOXES),
        answer: BOXES,
        naive: BOXES.map((r, k) => (k === 4 ? { ...r, by: 'rule:mp' } : r)),
        hint: [T('有了「下雨」和「刮风」，要「下雨 ∧ 刮风」。', 'With “it rains” and “it is windy”, “it rains ∧ it is windy” is wanted.')],
      }),
      wire({
        tests: [{ premises: { p: 'Rain ∧ Wind → Wet' }, goal: 'Rain → (Wind → Wet)' }],
        script: BOXES,
        hint: [T('两个框，一个套在另一个里面。', 'Two boxes, one inside the other.')],
        solution: proof({ f: ['impI', { A: 'Rain' }], g: ['impI', { A: 'Wind' }, 'f'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'] }, ['f#body>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('块里还可以套块。', 'A block can hold another block.') }],
  },
  script({
    id: 'sc-tactic',
    title: T('by 后面是一个证明助手', 'A proof assistant after by'),
    locked: true,
    premises: ADDER,
    goal: '¬(Sum ∧ Carry)',
    given: blank([
      { k: 'show', stmt: '¬(Sum ∧ Carry)', by: 'proof' },
      { k: 'assume', stmt: 'Sum ∧ Carry' },
      { k: 'have', stmt: 'Carry', using: ['a1'], by: 'rule:conjunct2' },
      { k: 'have', stmt: 'InA ∧ InB', using: ['c', 'h1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['s', 'a1', 'h2'], by: 'metis' },
    ]),
    answer: [
      { k: 'show', stmt: '¬(Sum ∧ Carry)', by: 'proof' },
      { k: 'assume', stmt: 'Sum ∧ Carry' },
      { k: 'have', stmt: 'Carry', using: ['a1'], by: 'rule:conjunct2' },
      { k: 'have', stmt: 'InA ∧ InB', using: ['c', 'h1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['s', 'a1', 'h2'], by: 'metis' },
    ],
    naive: [
      { k: 'show', stmt: '¬(Sum ∧ Carry)', by: 'proof' },
      { k: 'assume', stmt: 'Sum ∧ Carry' },
      { k: 'have', stmt: 'Carry', using: ['a1'], by: 'rule:conjunct2' },
      { k: 'have', stmt: 'InA ∧ InB', using: ['c', 'h1'], by: 'rule:mp' },
      { k: 'show', stmt: '⊥', using: ['s', 'a1', 'h2'], by: 'rule:mp' },
    ],
    brief: T('选出每一句的 by。', 'Choose each row’s by.'),
    hint: [
      T('由等价和「进位是 1」得出两个输入都是 1，一个元件不够。', 'From the equivalence and “the carry is 1” to both inputs being 1: one part is not enough.'),
      T('最后一句要在三句话里找出矛盾。', 'The last row looks for a contradiction among three sentences.'),
    ],
    intro: [{ t: T('by 后面也可以是造好的证明助手：自建 auto、化简、证明重建器。它们只用规则，所以这一句照样由核证出。', 'by may also be followed by a proof assistant already built: your own auto, Simp, the reconstructor. They use only rules, so the row is still proved by the kernel.') }],
    after: T('人写结构，证明助手补小步：真正的证明大多这样分工。', 'People write the structure and proof assistants fill in the small steps: most real proofs are shared out this way.'),
  }),

  // ---------- writing scripts ----------
  {
    id: 'sc-have',
    title: T('补一句 have', 'A missing have'),
    tasks: [
      script({
        step: T('第一题', 'Problem 1'),
        brief: T('这段脚本少了一句。补上它。', 'This script is a row short. Put it in.'),
        premises: { p: 'Rain → Wet', q: 'Wet → Slip', r: 'Rain' },
        goal: 'Slip',
        given: [{ k: 'show', stmt: 'Slip', using: ['q', 'h1'], by: 'rule:mp' }],
        answer: [{ k: 'have', stmt: 'Wet', using: ['p', 'r'], by: 'rule:mp' }, { k: 'show', stmt: 'Slip', using: ['q', 'h1'], by: 'rule:mp' }],
        hint: [T('show 用到的 h1 还没有。新加的一行排在选中的那一行后面；要排到它前面，先删掉它再重写。', 'The h1 that show uses is not there yet. A new row goes after the row selected; to put one in front, remove that row and write it again.')],
      }),
      script({
        step: T('第二题', 'Problem 2'),
        brief: T('这段脚本少了两句。补上它们。', 'This script is two rows short. Put them in.'),
        premises: { p: 'Rain ∧ Wind', q: 'Wind → Wet', r: 'Rain → Bus' },
        goal: 'Wet ∧ Bus',
        given: [{ k: 'show', stmt: 'Wet ∧ Bus', using: ['h3', 'h4'], by: 'rule:conjI' }],
        answer: [
          { k: 'have', stmt: 'Rain', using: ['p'], by: 'rule:conjunct1' },
          { k: 'have', stmt: 'Wind', using: ['p'], by: 'rule:conjunct2' },
          { k: 'have', stmt: 'Wet', using: ['q', 'h2'], by: 'rule:mp' },
          { k: 'have', stmt: 'Bus', using: ['r', 'h1'], by: 'rule:mp' },
          { k: 'show', stmt: 'Wet ∧ Bus', using: ['h3', 'h4'], by: 'rule:conjI' },
        ],
        hint: [T('先把「下雨 ∧ 刮风」拆成两句。', 'First split “it rains ∧ it is windy” into two.')],
      }),
    ],
    intro: [{ t: T('写脚本时，常常先写最后一句 show，再往前补它用到的事实，一句一句 have 出来。', 'A script is often written from its last show backwards: the facts it uses are filled in before it, one have at a time.') }],
  },
  {
    id: 'sc-show',
    title: T('一行就够', 'One row is enough'),
    tasks: [
      script({ step: T('第一题', 'Problem 1'), brief: WRITE, premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', answer: [{ k: 'show', stmt: 'Rain → Slip', using: ['p', 'q'], by: 'auto' }], naive: [{ k: 'show', stmt: 'Rain → Slip', using: ['p', 'q'], by: 'rule:mp' }], hint: [T('用到的事实都写在 using 里，剩下的交给 auto。', 'Put the facts used after using, and leave the rest to auto.')] }),
      script({ step: T('第二题', 'Problem 2'), brief: WRITE, premises: {}, goal: '((Rain → Wet) → Rain) → Rain', answer: [{ k: 'show', stmt: '((Rain → Wet) → Rain) → Rain', by: 'metis' }], naive: [{ k: 'show', stmt: '((Rain → Wet) → Rain) → Rain', by: 'auto' }], hint: [T('<level-ref to="peirce"></level-ref>：auto 证不出来的。', '<level-ref to="peirce"></level-ref>: auto cannot prove it.')] }),
      script({ step: T('第三题', 'Problem 3'), brief: WRITE, premises: {}, goal: 'plus(s(zero), s(zero)) = s(s(zero))', consts: ['zero'], words: TERM_WORDS, defs: ['plus'], simp: ['def.0', 'def.1'], answer: [{ k: 'show', stmt: 'plus(s(zero), s(zero)) = s(s(zero))', by: 'simp' }], naive: [{ k: 'show', stmt: 'plus(s(zero), s(zero)) = s(s(zero))', by: 'rule:refl' }], hint: [T('这一关的化简会按加法的定义算。', 'This level’s Simp works by the definition of addition.')] }),
    ],
    intro: [{ t: T('一句话若由你造的证明助手一步证完，脚本里就只写一行：show … by auto。', 'When a proof assistant you built proves a sentence outright, the script is a single row: show … by auto.') }],
  },
  script({
    id: 'sc-fix',
    title: T('fix 是全称概括', 'fix is For any'),
    brief: WRITE,
    premises: { p: '∀x. Student(x) → Human(x)', q: '∀x. Human(x) → Mortal(x)' },
    goal: '∀x. Student(x) → Mortal(x)',
    things: ['a'],
    sentences: ['Student(a)', 'Human(a)', 'Mortal(a)', 'Student(a) → Mortal(a)'],
    answer: [
      { k: 'show', stmt: '∀x. Student(x) → Mortal(x)', by: 'proof' },
      { k: 'fix', thing: 'a' },
      { k: 'assume', stmt: 'Student(a)' },
      { k: 'have', stmt: 'Human(a)', using: ['p', 'a1'], by: 'auto' },
      { k: 'show', stmt: 'Mortal(a)', using: ['q', 'h1'], by: 'auto' },
    ],
    naive: [
      { k: 'show', stmt: '∀x. Student(x) → Mortal(x)', by: 'proof' },
      { k: 'assume', stmt: 'Student(a)' },
      { k: 'show', stmt: 'Mortal(a)', using: ['p', 'q', 'a1'], by: 'auto' },
    ],
    hint: [T('块里先 fix 一样东西。', 'In the block, fix a thing first.')],
    intro: [{ t: T('要证「对所有 x」，块的第一句是 fix：任取一样东西，给它起个名字。', 'To prove “for all x”, the block starts with fix: take any thing and give it a name.') }],
  }),
  script({
    id: 'sc-obtain',
    title: T('obtain 拆开 ∃', 'obtain takes ∃ apart'),
    brief: WRITE,
    premises: { p: '∀x. Bird(x) → Flies(x)' },
    goal: '¬∃x. Bird(x) ∧ ¬Flies(x)',
    things: ['b'],
    sentences: ['Bird(b) ∧ ¬Flies(b)', 'Flies(b)'],
    answer: [
      { k: 'show', stmt: '¬∃x. Bird(x) ∧ ¬Flies(x)', by: 'proof' },
      { k: 'assume', stmt: '∃x. Bird(x) ∧ ¬Flies(x)' },
      { k: 'obtain', thing: 'b', stmt: 'Bird(b) ∧ ¬Flies(b)', using: ['a1'] },
      { k: 'have', stmt: 'Flies(b)', using: ['p', 'o1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['o1', 'h1'], by: 'auto' },
    ],
    naive: [
      { k: 'show', stmt: '¬∃x. Bird(x) ∧ ¬Flies(x)', by: 'proof' },
      { k: 'assume', stmt: '∃x. Bird(x) ∧ ¬Flies(x)' },
      { k: 'have', stmt: 'Flies(b)', using: ['p', 'a1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['a1', 'h1'], by: 'auto' },
    ],
    hint: [T('假设真有这样一只鸟。', 'Suppose there is such a bird.')],
    intro: [{ t: T('有了一句「存在」，obtain 把那一样东西拿出来，起个名字，后面的句子都能用它。', 'Given a “there is”, obtain takes that thing out and names it, and the rows after it can use it.') }],
  }),

  // ---------- whole proofs ----------
  script({
    id: 'sc-knights',
    title: T('骑士与无赖，写成脚本', 'Knights and knaves, as a script'),
    brief: T('a 说：「b 是无赖。」c 说：「a 和 b 是同一种人。」写一段脚本，证明 c 是无赖。', 'a says: “b is a knave.” c says: “a and b are the same kind.” Write a script that proves c is a knave.'),
    premises: { a: 'KA ↔ ¬KB', c: 'KC ↔ (KA ↔ KB)' },
    goal: '¬KC',
    answer: [
      { k: 'show', stmt: '¬KC', by: 'proof' },
      { k: 'assume', stmt: 'KC' },
      { k: 'have', stmt: 'KA ↔ KB', using: ['c', 'a1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['a', 'h1'], by: 'metis' },
    ],
    naive: [{ k: 'show', stmt: '¬KC', using: ['a', 'c'], by: 'auto' }],
    hint: [
      T('假设 c 是骑士，他的话就成立。', 'Suppose c is a knight: then what he says holds.'),
      T('a 和 b 是同一种人，又一个说另一个是无赖：这个矛盾交给证明重建器。', 'a and b the same kind, and one calling the other a knave: hand that contradiction to the reconstructor.'),
    ],
    intro: [{ t: T('把证明写给人看：假设了什么，推出什么，矛盾在哪里；每一步交给合适的证明助手。', 'Write the proof for people: what is supposed, what follows, where the contradiction lies; each step handed to the right proof assistant.') }],
  }),
  script({
    id: 'sc-revrev',
    title: T('倒两次，写成脚本', 'Reversed twice, as a script'),
    brief: WRITE,
    premises: {},
    goal: '∀xs. rev(rev(xs)) = xs',
    types: ['list'],
    defs: ['app', 'rev'],
    words: TERM_WORDS,
    simp: ['def.0', 'def.1', 'def.2', 'def.3', 'revApp'],
    answer: [{ k: 'show', stmt: '∀xs. rev(rev(xs)) = xs', by: 'induct' }],
    naive: [{ k: 'show', stmt: '∀xs. rev(rev(xs)) = xs', by: 'simp' }],
    hint: [T('对 xs 归纳，每种情况化简。', 'Induction on xs, and Simp on each case.')],
    intro: [{ t: T('这一关的化简集合里有列表的定义和<level-ref to="in-revapp"></level-ref>证出的那条等式。', 'This level’s simp set holds the definitions of lists and the equation proved in <level-ref to="in-revapp"></level-ref>.') }],
  }),
  script({
    id: 'sc-barber',
    title: T('毕业：理发师', 'Graduation: the barber'),
    brief: T('「有一个人，给且只给不给自己刮胡子的人刮胡子。」写一段脚本，证明没有这样的人。', '“There is someone who shaves exactly those who do not shave themselves.” Write a script that proves there is no such person.'),
    premises: {},
    goal: '¬∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)',
    things: ['b'],
    sentences: ['∀y. Shaves(b, y) ↔ ¬Shaves(y, y)', 'Shaves(b, b) ↔ ¬Shaves(b, b)'],
    answer: [
      { k: 'show', stmt: '¬∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)', by: 'proof' },
      { k: 'assume', stmt: '∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)' },
      { k: 'obtain', thing: 'b', stmt: '∀y. Shaves(b, y) ↔ ¬Shaves(y, y)', using: ['a1'] },
      { k: 'have', stmt: 'Shaves(b, b) ↔ ¬Shaves(b, b)', using: ['o1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['h1'], by: 'metis' },
    ],
    naive: [
      { k: 'show', stmt: '¬∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)', by: 'proof' },
      { k: 'assume', stmt: '∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)' },
      { k: 'show', stmt: '⊥', using: ['a1'], by: 'metis' },
    ],
    hint: [
      T('假设有这么一个人，把他拿出来，叫他 b。', 'Suppose there is such a person; take him out and call him b.'),
      T('b 给不给自己刮？', 'Does b shave himself?'),
    ],
    intro: [{ t: T('最后一段脚本，用上这台证明器的每一层。', 'A last script, using every layer of this prover.') }],
    after: T('证明器从两个元件长到这里，没有一步是核不认的。', 'The prover grew from two parts to this, and not one step was one the kernel would not take.'),
  }),
]
