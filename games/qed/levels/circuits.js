// Chapter 1 · 真值电路: the first module of the prover. A sentence's truth value is computed by a board of gates, and
// the machine runs the board on every row of the truth table (the way 《状态之图》's robot runs one board on every
// cell). The prover starts with two gates, 与 (and) and 非 (not); the player builds 或 (or) and 若…则… from them, then puts a
// puzzle into a sentence and lets the table find the answer.
import { gates } from '../../kit/domains/logic/gates.js'

const T = (zh, en) => ({ zh, en })
/** A reference board for a target sentence: gate cards by id, and wires 'from>to.port' ('x>out' into the output). */
const board = (target, nodes, wires) => gates(nodes, wires, { target })

export const circuits = [
  {
    id: 'g-not',
    kind: 'gates',
    symbols: ['¬'],
    title: T('不是不下雨', 'Not not raining'),
    target: '¬¬Rain',
    adds: ['gNot'],
    brief: T('接一块电路，算出「不是『不下雨』」在每一行的真值。', 'Wire a board that works out the value of “it is not the case that it is not raining” on every row.'),
    intro: [
      { t: T("真值表要一行一行地填。<wiki-ref to=\"circuit\"></wiki-ref>只接一次，由机器在每一行上运行。", "A truth table is filled in row by row. A <wiki-ref to=\"circuit\"></wiki-ref> is wired once, and the machine runs it on every row.") },
      { t: T("左边的「下雨」输出它在当前行的真值；右边的「这句话」收下电路的输出。", "“It rains” on the left gives its value on the current row; “The sentence” on the right takes the board’s output.") },
      { t: T("新元件<part-ref to=\"part:gNot\"></part-ref>表示否定 <b>¬</b>：输入为真，输出假；输入为假，输出真。", "The new part <part-ref to=\"part:gNot\"></part-ref> stands for negation, <b>¬</b>: true in gives false out, false in gives true out.") },
      { t: T("点真值表的一行，板上会显示各元件在这一行的值。", "Select a row of the truth table to see each part’s value on that row.") },
    ],
    hint: [T('「不下雨」怎样接？再否定一次呢？', 'How is “it is not raining” wired? And negated once more?')],
    solution: board('¬¬Rain', { n1: 'gNot', n2: 'gNot' }, ['Rain>n1.a', 'n1>n2.a', 'n2>out']),
  },
  {
    id: 'g-and',
    kind: 'gates',
    symbols: ['∧'],
    title: T('下雨，但没刮风', 'Rain, but no wind'),
    target: 'Rain ∧ ¬Wind',
    adds: ['gAnd'],
    brief: T('接一块电路，算出「下雨，并且不刮风」在每一行的真值。', 'Wire a board that works out the value of “it rains and it is not windy” on every row.'),
    intro: [
      { t: T('新元件<part-ref to="part:gAnd"></part-ref>，符号 <b>∧</b>：两个输入都为真，才输出真。', 'The new part <part-ref to="part:gAnd"></part-ref>, written <b>∧</b>, outputs true only when both inputs are true.') },
    ],
    hint: [T('两件事要同时成立：「下雨」和「不刮风」。', 'Two things must hold at once: “it rains” and “it is not windy”.')],
    solution: board('Rain ∧ ¬Wind', { n: 'gNot', a: 'gAnd' }, ['Wind>n.a', 'Rain>a.a', 'n>a.b', 'a>out']),
  },
  {
    id: 'g-tree',
    kind: 'gates',
    title: T('「非」管到哪里', 'How far Not reaches'),
    target: '¬(Rain ∧ Wind)',
    brief: T('接一块电路，算出「不是『又下雨又刮风』」在每一行的真值。', 'Wire a board that works out the value of “it is not the case that it both rains and is windy” on every row.'),
    intro: [
      { t: T('「不下雨，并且刮风」和「不是『又下雨又刮风』」听着相近，意思不同：否定管的范围不一样。写成符号时，范围用括号标出。', '“It is not raining and it is windy” and “it is not the case that it both rains and is windy” sound alike but mean different things: the negation covers a different stretch. In symbols, brackets mark that stretch.') },
    ],
    hint: [T('否定管的是哪一部分？', 'Which part does the negation cover?')],
    solution: board('¬(Rain ∧ Wind)', { a: 'gAnd', n: 'gNot' }, ['Rain>a.a', 'Wind>a.b', 'a>n.a', 'n>out']),
    naive: board('¬(Rain ∧ Wind)', { n: 'gNot', a: 'gAnd' }, ['Rain>n.a', 'n>a.a', 'Wind>a.b', 'a>out']),
    after: T('一句话一层层的结构，叫它的<b>语法树</b>。', 'The layered structure of a sentence is its <b>syntax tree</b>.'),
  },
  {
    id: 'g-or',
    kind: 'gates',
    symbols: ['∨'],
    title: T('下雨或者刮风', 'Rain or wind'),
    target: 'Rain ∨ Wind',
    builds: 'gOr',
    brief: T('只用与门和非门，接一块电路，算出「下雨，或者刮风」在每一行的真值。', 'Using only And and Not gates, wire a board that works out the value of “it rains or it is windy” on every row.'),
    intro: [
      { t: T('「或」写作 <b>∨</b>：至少一边为真，它就为真，两边都真也算。证明器里还没有这个门。', '“Or” is written <b>∨</b>: true when at least one side is, both included. The prover has no gate for it yet.') },
    ],
    hint: [
      T('先看它什么时候为假：四行里只有一行。', 'Look first at when it is false: only one row of the four.'),
      T('那一行能用与门和非门描述出来吗？', 'Can that row be described with And and Not?'),
    ],
    solution: board('Rain ∨ Wind', { n1: 'gNot', n2: 'gNot', a: 'gAnd', n3: 'gNot' }, ['Rain>n1.a', 'Wind>n2.a', 'n1>a.a', 'n2>a.b', 'a>n3.a', 'n3>out']),
  },
  {
    id: 'g-imp',
    kind: 'gates',
    title: T('若下雨，则地湿', 'If it rains, the ground is wet'),
    target: 'Rain → Wet',
    builds: 'gImp',
    brief: T('接一块电路，算出「若下雨，则地湿」在每一行的真值。', 'Wire a board that works out the value of “if it rains, then the ground is wet” on every row.'),
    intro: [
      { t: T('<level-ref to="table"></level-ref>填过这句话的真值表。证明器里还没有 → 这个门。', 'You filled in this sentence’s truth table in <level-ref to="table"></level-ref>. The prover has no → gate yet.') },
    ],
    hint: [
      T('它在哪些行为真？这些行有什么共同点？', 'On which rows is it true? What do those rows have in common?'),
      T('没下雨的两行，加上地湿的两行。', 'The two rows without rain, and the two where the ground is wet.'),
    ],
    solution: board('Rain → Wet', { n: 'gNot', o: 'gOr' }, ['Rain>n.a', 'n>o.a', 'Wet>o.b', 'o>out']),
  },
  {
    // A tautology and a contradiction, side by side: the output column says it all.
    id: 'g-always',
    title: T('怎样都对，怎样都错', 'Always true, always false'),
    tasks: [
      {
        kind: 'gates',
        step: T('怎样都对', 'Always true'),
        target: '(Rain → Wet) ∨ (Wet → Rain)',
        hideTarget: true,
        brief: T('接一块电路，算出「（若下雨，则地湿）或者（若地湿，则下雨）」在每一行的真值。', 'Wire a board that works out the value of “(if it rains, the ground is wet) or (if the ground is wet, it rains)” on every row.'),
        hint: [T('这句话由哪几部分组成？', 'What parts is the sentence made of?')],
        solution: board('(Rain → Wet) ∨ (Wet → Rain)', { i1: 'gImp', i2: 'gImp', o: 'gOr' }, ['Rain>i1.a', 'Wet>i1.b', 'Wet>i2.a', 'Rain>i2.b', 'i1>o.a', 'i2>o.b', 'o>out']),
      },
      {
        kind: 'gates',
        step: T('怎样都错', 'Always false'),
        target: '(Rain → Wet) ∧ (Rain ∧ ¬Wet)',
        hideTarget: true,
        brief: T('接一块电路，算出「（若下雨，则地湿）并且（下雨，并且地不湿）」在每一行的真值。', 'Wire a board that works out the value of “(if it rains, the ground is wet) and (it rains and the ground is not wet)” on every row.'),
        hint: [T('它由两半用与门接成，右边一半本身也是一个「并且」。', 'It is two halves joined by an And gate, and the right half is itself an “and”.')],
        intro: [{ t: T('每一行都为假的话叫<wiki-ref to="contradiction"></wiki-ref>。', 'A sentence false on every row is a <wiki-ref to="contradiction"></wiki-ref>.') }],
        solution: board('(Rain → Wet) ∧ (Rain ∧ ¬Wet)', { i: 'gImp', n: 'gNot', a1: 'gAnd', a2: 'gAnd' }, ['Rain>i.a', 'Wet>i.b', 'Wet>n.a', 'Rain>a1.a', 'n>a1.b', 'i>a2.a', 'a1>a2.b', 'a2>out']),
      },
    ],
    intro: [
      { t: T('<wiki-ref to="tautology"></wiki-ref>在电路上是什么样子？接出这句话，看输出那一列。', 'What does a <wiki-ref to="tautology"></wiki-ref> look like as a circuit? Wire this sentence and watch the output column.') },
    ],
  },
  {
    id: 'g-iff',
    kind: 'gates',
    title: T('两个方向都对', 'Both ways round'),
    target: '(Rain → Wet) ∧ (Wet → Rain)',
    hideTarget: true,
    builds: 'gIff',
    symbols: ['↔'],
    intro: [{ t: T('两件事同真同假，叫<wiki-ref to="equivalence"></wiki-ref>，写作 <b>↔</b>。', 'Two things true together and false together are in <wiki-ref to="equivalence"></wiki-ref>, written <b>↔</b>.') }],
    brief: T('接一块电路，算出「（若下雨，则地湿）并且（若地湿，则下雨）」在每一行的真值。', 'Wire a board that works out the value of “(if it rains, the ground is wet) and (if the ground is wet, it rains)” on every row.'),
    hint: [T('这句话由哪几部分组成？', 'What parts is the sentence made of?')],
    solution: board('(Rain → Wet) ∧ (Wet → Rain)', { i1: 'gImp', i2: 'gImp', a: 'gAnd' }, ['Rain>i1.a', 'Wet>i1.b', 'Wet>i2.a', 'Rain>i2.b', 'i1>a.a', 'i2>a.b', 'a>out']),
  },
  // Topic: translate what islanders say into logic (and, or, not; if…then; true together) and wire it; the true row is
// the answer. The sentence is said in words only.
  {
    id: 'e-words',
    kind: 'gates',
    title: T('翻译成与或非', 'Into and, or, not'),
    target: '¬(KA ∧ KB)',
    blind: true,
    brief: T('「a 和 b 不都是骑士。」把这句话译成与、或、非，接成电路，算出它在每一行的真值。', '“a and b are not both knights.” Translate the sentence into and, or and not, and wire a board that works out its value on every row.'),
    intro: [
      { t: T('岛上有两个人，a 和 b，每人要么是骑士，要么不是。「a 是骑士」「b 是骑士」的真假组成真值表的四行。', 'Two people live on an island, a and b, and each is a knight or is not. Whether “a is a knight” and “b is a knight” are true makes the four rows of the truth table.') },
      { t: T('日常的话先要译成与、或、非，才能接成电路。这一关不给出目标那一列。', 'An everyday sentence must first be translated into and, or and not before it can be wired. This level does not show the target column.') },
    ],
    hint: [
      T('「不都是」和「都不是」意思一样吗？', 'Do “not both” and “neither” mean the same?'),
      T('否定管的是哪一部分？', 'Which part does the negation cover?'),
    ],
    solution: board('¬(KA ∧ KB)', { a: 'gAnd', n: 'gNot' }, ['KA>a.a', 'KB>a.b', 'a>n.a', 'n>out']),
    // The other translation, (not a) or (not b), passes too: the level checks the column, not the wiring.
    naive: board('¬(KA ∧ KB)', { na: 'gNot', nb: 'gNot', a: 'gAnd' }, ['KA>na.a', 'KB>nb.a', 'na>a.a', 'nb>a.b', 'a>out']),
  },
  {
    id: 'e-says',
    kind: 'gates',
    title: T('a 说的话', 'What a says'),
    target: 'KA ↔ KB',
    blind: true,
    brief: T('a 说：「b 是骑士。」把「a 说」译成逻辑，接成电路：a 的话和他的身份相符的行，输出真。', 'a says: “b is a knight.” Translate “a says” into logic and wire it: the board outputs true on exactly the rows where what a says fits what a is.'),
    intro: [
      { t: T('岛上的人要么是<b>骑士</b>，只说真话；要么是<b>无赖</b>，只说假话。', 'Everyone on the island is a <b>knight</b>, who only tells the truth, or a <b>knave</b>, who only lies.') },
    ],
    hint: [
      T('a 是骑士时，他的话怎样？a 不是骑士时呢？', 'If a is a knight, what about what he says? And if he is not?'),
      T('「a 是骑士」和 a 的话之间是什么关系？', 'How do “a is a knight” and what a says relate?'),
    ],
    solution: board('KA ↔ KB', { e: 'gIff' }, ['KA>e.a', 'KB>e.b', 'e>out']),
    naive: board('KA ↔ KB', { i: 'gImp' }, ['KA>i.a', 'KB>i.b', 'i>out']),
  },
  {
    id: 'e-one',
    kind: 'gates',
    title: T('一个人说话', 'One islander speaks'),
    target: 'KA ↔ (¬KA ∨ ¬KB)',
    blind: true,
    brief: T('a 说：「我们俩里至少有一个是无赖。」把这件事译成逻辑，接成电路：a 的话和他的身份相符的行，输出真。', 'a says: “At least one of us two is a knave.” Translate this into logic and wire it: the board outputs true on exactly the rows where what a says fits what a is.'),
    hint: [
      T('先译 a 的话，再译「a 说」。', 'Translate what a says first, then “a says”.'),
      T('「a 是无赖」就是「a 不是骑士」。', '“a is a knave” is “a is not a knight”.'),
    ],
    solution: board('KA ↔ (¬KA ∨ ¬KB)', { na: 'gNot', nb: 'gNot', s: 'gOr', e: 'gIff' }, ['KA>na.a', 'KB>nb.a', 'na>s.a', 'nb>s.b', 'KA>e.a', 's>e.b', 'e>out']),
  },
  {
    id: 'e-two',
    kind: 'gates',
    title: T('两个人说话', 'Two islanders speak'),
    target: '(KA ↔ ¬KB) ∧ (KB ↔ KA ∧ KB)',
    blind: true,
    brief: T('a 说：「b 是无赖。」b 说：「我们俩都是骑士。」把两人的话译成逻辑，接成电路：两人的话都和身份相符的行，输出真。', 'a says: “b is a knave.” b says: “We are both knights.” Translate what both say into logic and wire it: the board outputs true on exactly the rows where what each says fits what they are.'),
    hint: [
      T('每个人的话各译一句。', 'Translate what each person says on its own.'),
      T('两句要同时成立。', 'Both must hold at once.'),
    ],
    solution: board('(KA ↔ ¬KB) ∧ (KB ↔ KA ∧ KB)', { nb: 'gNot', e1: 'gIff', ab: 'gAnd', e2: 'gIff', all: 'gAnd' }, [
      'KB>nb.a', 'KA>e1.a', 'nb>e1.b', 'KA>ab.a', 'KB>ab.b', 'KB>e2.a', 'ab>e2.b', 'e1>all.a', 'e2>all.b', 'all>out',
    ]),
  },
  {
    id: 'e-three',
    kind: 'gates',
    title: T('三个人说话', 'Three islanders speak'),
    target: '(KA ↔ ¬KB) ∧ (KB ↔ ¬KC) ∧ (KC ↔ ¬KA ∧ ¬KB)',
    blind: true,
    brief: T('a 说：「b 是无赖。」b 说：「c 是无赖。」c 说：「a 和 b 都是无赖。」把三人的话译成逻辑，接成电路：三人的话都和身份相符的行，输出真。', 'a says: “b is a knave.” b says: “c is a knave.” c says: “a and b are both knaves.” Translate what the three say into logic and wire it: the board outputs true on exactly the rows where what each says fits what they are.'),
    intro: [
      { t: T('三个人，表有八行。', 'Three people, and the table has eight rows.') },
    ],
    hint: [
      T('c 的话里，否定管的是哪一部分？', 'In what c says, which part does the negation cover?'),
      T('三个人的话各译一句，三句要同时成立。', 'Translate each person’s words on their own; all three must hold at once.'),
    ],
    solution: board('(KA ↔ ¬KB) ∧ (KB ↔ ¬KC) ∧ (KC ↔ ¬KA ∧ ¬KB)', { na: 'gNot', nb: 'gNot', nc: 'gNot', e1: 'gIff', e2: 'gIff', c: 'gAnd', e3: 'gIff', b12: 'gAnd', all: 'gAnd' }, [
      'KA>na.a', 'KB>nb.a', 'KC>nc.a',
      'KA>e1.a', 'nb>e1.b', 'KB>e2.a', 'nc>e2.b', 'na>c.a', 'nb>c.b', 'KC>e3.a', 'c>e3.b',
      'e1>b12.a', 'e2>b12.b', 'b12>all.a', 'e3>all.b', 'all>out',
    ]),
    after: T('找一行使几句话同时为真，这类问题叫<wiki-ref to="satisfiable"></wiki-ref>问题（SAT）。', 'Finding a row on which several sentences are all true is the <wiki-ref to="satisfiable"></wiki-ref> problem (SAT).'),
  },
  {
    id: 'e-count',
    kind: 'gates',
    title: T('至少与最多', 'At least and at most'),
    target: '(KA ↔ (¬KA ∨ ¬KB ∨ ¬KC)) ∧ (KB ↔ ((KA ∨ KB) ∧ (KA ∨ KC) ∧ (KB ∨ KC))) ∧ (KC ↔ (¬KA ∨ KB ∨ KC))',
    blind: true,
    brief: T('a 说：「我们三个人里至少有一个无赖。」b 说：「我们三个人里最多有一个无赖。」c 说：「a 不是唯一的骑士。」把三人的话译成逻辑，接成电路：三人的话都和身份相符的行，输出真。', 'a says: “At least one of the three of us is a knave.” b says: “At most one of the three of us is a knave.” c says: “a is not the only knight.” Translate what the three say into logic and wire it: the board outputs true on exactly the rows where what each says fits what they are.'),
    intro: [
      { t: T('「至少」「最多」「唯一」说的是人数，与、或、非里没有数数的门。这类话要先换一种说法，换成只谈每个人是不是骑士的句子。', '“At least”, “at most” and “only” speak of how many, and and, or and not have no gate that counts. Such words must first be said another way, as a sentence about whether each person is a knight.') },
    ],
    hint: [
      T('「至少有一个无赖」：三人之中，哪些人可能是那个无赖？', '“At least one is a knave”: of the three, who might that knave be?'),
      T('「最多有一个无赖」，就是不会有两个人同时是无赖。随便挑两个人，他们之中必须怎样？', '“At most one knave” means no two people are knaves at once. Pick any two people: what must be true of them?'),
      T('「a 不是唯一的骑士」：要么 a 不是骑士，要么还有别的骑士。', '“a is not the only knight”: either a is not a knight, or there is another knight.'),
    ],
    solution: board('(KA ↔ (¬KA ∨ ¬KB ∨ ¬KC)) ∧ (KB ↔ ((KA ∨ KB) ∧ (KA ∨ KC) ∧ (KB ∨ KC))) ∧ (KC ↔ (¬KA ∨ KB ∨ KC))', {
      na: 'gNot', nb: 'gNot', nc: 'gNot',
      o1: 'gOr', o2: 'gOr', e1: 'gIff',
      p1: 'gOr', p2: 'gOr', p3: 'gOr', q1: 'gAnd', q2: 'gAnd', e2: 'gIff',
      r1: 'gOr', r2: 'gOr', e3: 'gIff',
      x1: 'gAnd', x2: 'gAnd',
    }, [
      'KA>na.a', 'KB>nb.a', 'KC>nc.a',
      'na>o1.a', 'nb>o1.b', 'o1>o2.a', 'nc>o2.b', 'KA>e1.a', 'o2>e1.b',
      'KA>p1.a', 'KB>p1.b', 'KA>p2.a', 'KC>p2.b', 'KB>p3.a', 'KC>p3.b', 'p1>q1.a', 'p2>q1.b', 'q1>q2.a', 'p3>q2.b', 'KB>e2.a', 'q2>e2.b',
      'na>r1.a', 'KB>r1.b', 'r1>r2.a', 'KC>r2.b', 'KC>e3.a', 'r2>e3.b',
      'e1>x1.a', 'e2>x1.b', 'x1>x2.a', 'e3>x2.b', 'x2>out',
    ]),
    after: T('只有一行亮：a 是骑士，b、c 都是无赖。「至少一个」是一串「或」；「最多一个」是每两人之间一个「或」，再用「与」连起来；「不是唯一」也是一串「或」。排班这类问题（至少几人到岗、最多几人同时休假、谁不能单独值班）交给 SAT 求解器时，也是这样把计数的话改写成一串「或」再并起来。', 'Only one row lights up: a is a knight, b and c are knaves. “At least one” is a string of “or”s; “at most one” is an “or” for every pair, joined by “and”; “not the only one” is a string of “or”s too. Problems such as rostering (at least so many on duty, at most so many on leave at once, someone who may not work alone) are put to a SAT solver the same way: each counting phrase rewritten as strings of “or”s, joined together.'),
  },
  {
    id: 'g-xor',
    kind: 'gates',
    title: T('只有一样', 'Exactly one'),
    target: '(Rain ∨ Wind) ∧ ¬(Rain ∧ Wind)',
    blind: true,
    budget: 4,
    brief: T('「要么下雨，要么刮风，但不会两样都有。」接一块电路算出它，最多用 4 个门。', '“Either it rains or it is windy, but not both.” Wire a board that computes it, with at most 4 gates.'),
    hint: [T('不必按行拼。照这句话的字面看，它由哪几部分组成？', 'No need to piece it together row by row. Read the sentence as it is said: what parts is it made of?')],
    solution: board('(Rain ∨ Wind) ∧ ¬(Rain ∧ Wind)', { o: 'gOr', a: 'gAnd', n: 'gNot', b: 'gAnd' }, ['Rain>o.a', 'Wind>o.b', 'Rain>a.a', 'Wind>a.b', 'a>n.a', 'o>b.a', 'n>b.b', 'b>out']),
    naive: board('(Rain ∨ Wind) ∧ ¬(Rain ∧ Wind)', { n1: 'gNot', n2: 'gNot', a1: 'gAnd', a2: 'gAnd', o: 'gOr' }, ['Wind>n1.a', 'Rain>n2.a', 'Rain>a1.a', 'n1>a1.b', 'n2>a2.a', 'Wind>a2.b', 'a1>o.a', 'a2>o.b', 'o>out']),
    after: T('这个连接词叫<b>异或</b>（XOR）。', 'This connective is <b>exclusive or</b> (XOR).'),
  },
]

/** The gates the player builds: each runs as its own function once built (checked against its level). */
export const GATES = {
  gOr: { name: T('或 ∨', 'Or ∨'), desc: T('a ∨ b：两个输入里至少有一个是真，就输出真；都是假，输出假。', 'Outputs true when at least one input is true; false when both are false.'), ports: ['a', 'b'], f: ([a, b]) => a || b },
  gImp: { name: T('若…则… →', 'If…then… →'), desc: T('a → b：只在 a 是真、b 是假时输出假；其余都输出真。', 'Outputs false only when a is true and b is false; true otherwise.'), ports: ['a', 'b'], f: ([a, b]) => !a || b },
  gIff: { name: T('等价 ↔', 'Equivalent ↔'), desc: T('a ↔ b：a 和 b 同真或同假时输出真；一真一假时输出假。', 'a ↔ b: outputs true when a and b are both true or both false; false when one is true and the other false.'), ports: ['a', 'b'], f: ([a, b]) => a === b },
}
