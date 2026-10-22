// Chapter 1 · 真值电路: the first module of the prover. A sentence's truth value is computed by a board of gates, and
// the machine runs the board on every row of the truth table (the way 《状态之图》's robot runs one board on every
// cell). The prover starts with two gates, 与 (and) and 非 (not); the player builds 或 (or) and 如果…那么… from them, then puts a
// puzzle into a sentence and lets the table find the answer.
import { gates } from '../../kit/domains/logic/gates.js'

const T = (zh, en) => ({ zh, en })
/** A reference board for a target sentence: gate cards by id, and wires 'from>to.port' ('x>out' into the output). */
const board = (target, nodes, wires) => gates(nodes, wires, { target })

export const circuits = [
  {
    id: 'g-not',
    kind: 'gates',
    title: T('不是不下雨', 'Not not raining'),
    target: '¬¬Rain',
    adds: ['gNot'],
    brief: T('接一块电路，算出「不是『不下雨』」在每一行是真是假。', 'Wire a board that works out, on every row, whether “it is not the case that it is not raining” is true.'),
    intro: [
      { t: T('纸笔那一章，你一行一行地手填真值表。这一章把这件事交给机器：你只接一块电路，机器把它在每一行上各跑一遍，整张表就填满了。', 'In the pen-and-paper chapter you filled in truth tables by hand, row by row. Now a machine does it: you wire one board, the machine runs it on every row, and the whole table is filled in.') },
      { t: T('板子左边的卡片是「下雨」：哪一行下雨，它就送出真，否则送出假。右边是「这句话」：接到它的线送来什么，这一行这句话就是什么。', 'The card on the left of the board is “it rains”: on a row where it rains it sends out true, otherwise false. On the right is “the sentence”: whatever reaches it is the sentence’s value on that row.') },
      { t: T('新元件<b>非</b>：输入是真，输出假；输入是假，输出真。', 'A new part, <b>Not</b>: true in gives false out; false in gives true out.') },
      { t: T('下面的真值表里，点一行，板上每张卡片就显示它在那一行的值。', 'Click a row of the truth table below, and every card on the board shows its value on that row.') },
    ],
    hint: [T('「不下雨」是一个「非」接在「下雨」后面。再说一次「不是」呢？', '“It is not raining” is a Not after “it rains”. And saying “not” once more?')],
    solution: board('¬¬Rain', { n1: 'gNot', n2: 'gNot' }, ['Rain>n1.a', 'n1>n2.a', 'n2>out']),
    after: T('两个「非」叠在一起，又回到了「下雨」本身：每一行，电路输出都和「下雨」一样。你只接了一次，机器替你算了每一行。', 'Two Nots in a row lead back to “it rains” itself: on every row the board gives the same as “it rains”. You wired it once, and the machine worked out every row.'),
  },
  {
    id: 'g-and',
    kind: 'gates',
    title: T('下雨，但没刮风', 'Rain, but no wind'),
    target: 'Rain ∧ ¬Wind',
    adds: ['gAnd'],
    brief: T('接一块电路，算出「下雨，并且不刮风」在每一行是真是假。', 'Wire a board that works out, on every row, whether “it rains and it is not windy” is true.'),
    intro: [
      { t: T('这次有两件事：下没下雨，刮没刮风。一共四行。', 'Two things this time: does it rain, is it windy. Four rows in all.') },
      { t: T('新元件<b>与</b>：两个输入都是真，才输出真；否则输出假。', 'A new part, <b>And</b>: it outputs true only when both inputs are true; otherwise false.') },
    ],
    hint: [T('要的是两件事同时成立：一件是「下雨」，另一件是「不刮风」。', 'Two things must hold at once: one is “it rains”, the other “it is not windy”.')],
    solution: board('Rain ∧ ¬Wind', { n: 'gNot', a: 'gAnd' }, ['Wind>n.a', 'Rain>a.a', 'n>a.b', 'a>out']),
    after: T('四行里只有一行是真：下了雨，又没刮风。「与」只在两边都真时才真。', 'Only one of the four rows is true: it rained and it was not windy. And is true only when both sides are.'),
  },
  {
    id: 'g-tree',
    kind: 'gates',
    title: T('「非」管到哪里', 'How far Not reaches'),
    target: '¬(Rain ∧ Wind)',
    brief: T('接一块电路，算出「不是『又下雨又刮风』」在每一行是真是假。', 'Wire a board that works out, on every row, whether “it is not the case that it both rains and is windy” is true.'),
    intro: [
      { t: T('否定可以只管一件事，也可以管一整句。「不下雨，并且刮风」和「不是『又下雨又刮风』」听着像，意思却不一样：「不」管的范围不同。', 'Not can apply to one thing, or to a whole sentence. “It is not raining and it is windy” and “it is not the case that it both rains and is windy” sound alike but mean different things: what the Not covers is different.') },
      { t: T('写成符号时，这个范围靠括号标出来。在电路里，它就是「非」接在哪一块后面。', 'Written in symbols, brackets mark how far it reaches. On a board, it is which card the Not comes after.') },
    ],
    hint: [T('「非」要管的是「又下雨又刮风」这一整件事。', 'The Not covers the whole of “it both rains and is windy”.')],
    solution: board('¬(Rain ∧ Wind)', { a: 'gAnd', n: 'gNot' }, ['Rain>a.a', 'Wind>a.b', 'a>n.a', 'n>out']),
    naive: board('¬(Rain ∧ Wind)', { n: 'gNot', a: 'gAnd' }, ['Rain>n.a', 'n>a.a', 'Wind>a.b', 'a>out']),
    after: T('同样两个门，接的先后一换，算出的就是另一句话。一句话的意思，由它是怎样一层层搭起来的决定。', 'The same two gates, wired in another order, compute another sentence. What a sentence means is decided by how it is built up, layer by layer.'),
  },
  {
    id: 'g-or',
    kind: 'gates',
    title: T('下雨或者刮风', 'Rain or wind'),
    target: 'Rain ∨ Wind',
    builds: 'gOr',
    brief: T('只用「与」和「非」，接一块电路，算出「下雨，或者刮风」在每一行是真是假。', 'With only And and Not, wire a board that works out, on every row, whether “it rains or it is windy” is true.'),
    intro: [
      { t: T('「下雨，或者刮风」：至少有一件发生，它就是真的；两件都发生也算。', '“It rains or it is windy”: it is true when at least one of them happens, both included.') },
      { t: T('证明器里还没有「或」这个门。手上只有「与」和「非」。', 'The prover has no Or gate yet. You only have And and Not.') },
    ],
    hint: [
      T('先看它什么时候是假的：四行里只有一行。', 'Look first at when it is false: only one row of the four.'),
      T('那一行是「不下雨，并且不刮风」。这句话是假的时候，「下雨或者刮风」就是真的。', 'That row is “it is not raining and it is not windy”. Whenever that is false, “it rains or it is windy” is true.'),
    ],
    solution: board('Rain ∨ Wind', { n1: 'gNot', n2: 'gNot', a: 'gAnd', n3: 'gNot' }, ['Rain>n1.a', 'Wind>n2.a', 'n1>a.a', 'n2>a.b', 'a>n3.a', 'n3>out']),
    after: T('「或」只在两件都没发生时才假，所以它就是「非（两件都没发生）」。', '“Or” is false only when neither happens, so it is “not (neither happens)”.'),
  },
  {
    id: 'g-imp',
    kind: 'gates',
    title: T('如果下雨，那么地湿', 'If it rains, the ground is wet'),
    target: 'Rain → Wet',
    builds: 'gImp',
    brief: T('接一块电路，算出「如果下雨，那么地湿」在每一行是真是假。', 'Wire a board that works out, on every row, whether “if it rains, then the ground is wet” is true.'),
    intro: [
      { t: T('「如果下雨，那么地湿」的真值表，你在纸笔那一章填过：只有「下了雨，地却没湿」那一行是假的。', 'You filled in the table of “if it rains, then the ground is wet” in the pen-and-paper chapter: only the row “it rained and the ground is not wet” is false.') },
      { t: T('证明器里也还没有这个门。', 'The prover has no gate for it yet either.') },
    ],
    hint: [
      T('它在什么时候一定是真的？没下雨的两行，还有地湿了的两行。', 'When is it surely true? On the two rows without rain, and on the two where the ground is wet.'),
      T('也就是「不下雨，或者地湿」。', 'That is, “it is not raining, or the ground is wet”.'),
    ],
    solution: board('Rain → Wet', { n: 'gNot', o: 'gOr' }, ['Rain>n.a', 'n>o.a', 'Wet>o.b', 'o>out']),
    after: T('「如果 X，那么 Y」和「不 X，或者 Y」每一行都一样。', '“If X, then Y” and “not X, or Y” agree on every row.'),
  },
  {
    id: 'g-always',
    kind: 'gates',
    title: T('怎样都对', 'True whatever happens'),
    target: '(Rain → Wet) ∨ (Wet → Rain)',
    hideTarget: true,
    brief: T('接一块电路，算出「（如果下雨，那么地湿）或者（如果地湿，那么下雨）」在每一行是真是假。', 'Wire a board that works out, on every row, whether “(if it rains, the ground is wet) or (if the ground is wet, it rains)” is true.'),
    hint: [T('先接出两个「如果…那么…」，再用「或」把它们接起来。', 'Wire the two if…thens first, then join them with Or.')],
    solution: board('(Rain → Wet) ∨ (Wet → Rain)', { i1: 'gImp', i2: 'gImp', o: 'gOr' }, ['Rain>i1.a', 'Wet>i1.b', 'Wet>i2.a', 'Rain>i2.b', 'i1>o.a', 'i2>o.b', 'o>out']),
    after: T('四行全是真：这句话不管天气怎样都成立，是一个永真式。电路输出这一列，和输入是什么毫无关系。', 'All four rows are true: the sentence holds whatever the weather, a tautology. The column the board gives does not depend on its inputs at all.'),
  },
  {
    id: 'g-never',
    kind: 'gates',
    title: T('怎样都错', 'False whatever happens'),
    target: '(Rain → Wet) ∧ (Rain ∧ ¬Wet)',
    hideTarget: true,
    brief: T('接一块电路，算出「（如果下雨，那么地湿）并且（下雨，并且地不湿）」在每一行是真是假。', 'Wire a board that works out, on every row, whether “(if it rains, the ground is wet) and (it rains and the ground is not wet)” is true.'),
    hint: [T('它由两半用「与」接成。右边一半自己又是一个「与」。', 'It is two halves joined by And. The right half is itself an And.')],
    solution: board('(Rain → Wet) ∧ (Rain ∧ ¬Wet)', { i: 'gImp', n: 'gNot', a1: 'gAnd', a2: 'gAnd' }, ['Rain>i.a', 'Wet>i.b', 'Wet>n.a', 'Rain>a1.a', 'n>a1.b', 'i>a2.a', 'a1>a2.b', 'a2>out']),
    after: T('四行全是假：没有哪一种天气能让它成立。这样的句子叫矛盾式，也叫不可满足。', 'All four rows are false: no weather makes it hold. Such a sentence is a contradiction, or unsatisfiable.'),
  },
  {
    id: 'g-iff',
    kind: 'gates',
    title: T('两个方向都对', 'Both ways round'),
    target: '(Rain → Wet) ∧ (Wet → Rain)',
    hideTarget: true,
    brief: T('接一块电路，算出「（如果下雨，那么地湿）并且（如果地湿，那么下雨）」在每一行是真是假。', 'Wire a board that works out, on every row, whether “(if it rains, the ground is wet) and (if the ground is wet, it rains)” is true.'),
    hint: [T('两个「如果…那么…」，方向相反，再用「与」接起来。', 'Two if…thens pointing opposite ways, joined by And.')],
    solution: board('(Rain → Wet) ∧ (Wet → Rain)', { i1: 'gImp', i2: 'gImp', a: 'gAnd' }, ['Rain>i1.a', 'Wet>i1.b', 'Wet>i2.a', 'Rain>i2.b', 'i1>a.a', 'i2>a.b', 'a>out']),
    after: T('真的两行，正好是「下雨」和「地湿」一样的两行：都发生，或者都没发生。两个方向都对，就是说两件事同真同假。', 'The two true rows are exactly those where “it rains” and “the ground is wet” agree: both happen, or neither does. Both directions holding means the two are true together and false together.'),
  },
  // Topic: translate what islanders say into logic (and, or, not; if…then; true together) and wire it; the true row is
// the answer. The sentence is said in words only.
  {
    id: 'e-words',
    kind: 'gates',
    title: T('翻译成与或非', 'Into and, or, not'),
    target: '¬(KA ∧ KB)',
    blind: true,
    brief: T('「a 和 b 不都是骑士。」先把这句话翻译成与、或、非，再接成电路，算出它在每一行的真值。', '“a and b are not both knights.” Translate the sentence into and, or and not, then wire it as a board that works out its value on every row.'),
    intro: [
      { t: T('岛上有两个人，a 和 b，每人要么是骑士，要么不是。「a 是骑士」「b 是骑士」是两件小事，它们各是真是假，组成真值表的四行。', 'Two people live on an island, a and b, and each is a knight or is not. “a is a knight” and “b is a knight” are two small facts; whether each is true makes the four rows of the truth table.') },
      { t: T('日常的话要先翻译成逻辑的话，才能接成电路。大致的对照是：「并且」「和」「都」是<b>与</b>；「或者」「至少有一个」是<b>或</b>；「不」「不是」是<b>非</b>。', 'An everyday sentence must be translated into logic before it can be wired. Roughly: “and”, “both” are <b>and</b>; “or”, “at least one” are <b>or</b>; “not”, “it is not the case” are <b>not</b>.') },
      { t: T('翻译时最要紧的是看清每个词管到哪里，就像「非」管到哪里那一关。这一关不给出目标真值那一列。', 'What matters most is how far each word reaches, as in the level on how far Not reaches. This level does not show the target value column.') },
    ],
    hint: [
      T('「不都是」和「都不是」不一样：前者只要有一个不是就成立。', '“Not both” is not “neither”: the first holds as soon as one of them is not a knight.'),
      T('「不都是」就是「至少有一个不是」。可以照字面译成：非（a 是骑士 与 b 是骑士）；也可以译成：（非 a 是骑士）或（非 b 是骑士）。', '“Not both” means “at least one is not”. It can be translated word for word: not (a is a knight and b is a knight); or as: (not a is a knight) or (not b is a knight).'),
    ],
    solution: board('¬(KA ∧ KB)', { a: 'gAnd', n: 'gNot' }, ['KA>a.a', 'KB>a.b', 'a>n.a', 'n>out']),
    // The other translation, (not a) or (not b), passes too: the level checks the column, not the wiring.
    naive: board('¬(KA ∧ KB)', { na: 'gNot', nb: 'gNot', a: 'gAnd' }, ['KA>na.a', 'KB>nb.a', 'na>a.a', 'nb>a.b', 'a>out']),
    after: T('「a 和 b 不都是骑士」有两种译法：照字面是「非（a 是骑士 与 b 是骑士）」，换个说法是「（非 a 是骑士）或（非 b 是骑士）」。两块电路每一行都一样：三行为真，只有两人都是骑士那一行为假。要是译成「（非 a 是骑士）与（非 b 是骑士）」，说的就成了「两个都不是骑士」，只有一行为真。', '“a and b are not both knights” has two translations: word for word, “not (a is a knight and b is a knight)”; said another way, “(not a is a knight) or (not b is a knight)”. The two boards agree on every row: three rows true, only the row where both are knights false. Translated as “(not a is a knight) and (not b is a knight)”, it would say “neither is a knight”, true on one row only.'),
  },
  {
    id: 'e-one',
    kind: 'gates',
    title: T('一个人说话', 'One islander speaks'),
    target: 'KA ↔ (¬KA ∨ ¬KB)',
    blind: true,
    brief: T('a 说：「我们俩里至少有一个是无赖。」把这件事翻译成逻辑语言，接成电路：哪一行 a 的话和他的身份对得上，哪一行就输出真。', 'a says: “At least one of us two is a knave.” Translate this into logic and wire it: the board outputs true on exactly the rows where what a says fits what a is.'),
    intro: [
      { t: T('岛上的人要么是<b>骑士</b>，只说真话；要么是<b>无赖</b>，只说假话。', 'Everyone on the island is a <b>knight</b>, who only tells the truth, or a <b>knave</b>, who only lies.') },
      { t: T('这一关有两个新说法要翻译。「a 是无赖」就是：非（a 是骑士）。「a 说 X」说的是：a 是骑士，X 就是真的；a 是无赖，X 就是假的。也就是「a 是骑士」和 X <b>同真同假</b>，可以译成：（如果 a 是骑士，那么 X）与（如果 X，那么 a 是骑士）。', 'Two new phrases to translate here. “a is a knave” is: not (a is a knight). “a says X” means: if a is a knight, X is true; if a is a knave, X is false. So “a is a knight” and X are <b>true together and false together</b>, which translates to: (if a is a knight, then X) and (if X, then a is a knight).') },
    ],
    hint: [
      T('先翻译 a 的话：「至少有一个是无赖」是「（非 a 是骑士）或（非 b 是骑士）」。', 'Translate what a says first: “at least one is a knave” is “(not a is a knight) or (not b is a knight)”.'),
      T('再翻译「a 说」：「a 是骑士」和 a 的话同真同假，两个方向的「如果…那么…」用「与」接起来。', 'Then translate “a says”: “a is a knight” and what a says are true together and false together, if…then both ways round, joined by And.'),
    ],
    solution: board('KA ↔ (¬KA ∨ ¬KB)', { na: 'gNot', nb: 'gNot', s: 'gOr', i1: 'gImp', i2: 'gImp', a: 'gAnd' }, ['KA>na.a', 'KB>nb.a', 'na>s.a', 'nb>s.b', 'KA>i1.a', 's>i1.b', 's>i2.a', 'KA>i2.b', 'i1>a.a', 'i2>a.b', 'a>out']),
    after: T('整件事译成：「a 是骑士」与「（非 a 是骑士）或（非 b 是骑士）」同真同假。只有一行为真：a 是骑士，b 是无赖。「同真同假」还有别的译法，比如「（a 是骑士 与 X）或（非 a 是骑士 与 非 X）」，每一行都一样。', 'The whole thing translates to: “a is a knight” and “(not a is a knight) or (not b is a knight)” are true together and false together. Only one row is true: a is a knight and b is a knave. “True together, false together” has other translations too, such as “(a is a knight and X) or (not a is a knight and not X)”, which agree on every row.'),
  },
  {
    id: 'e-two',
    kind: 'gates',
    title: T('两个人说话', 'Two islanders speak'),
    target: '(KA ↔ ¬KB) ∧ (KB ↔ KA ∧ KB)',
    blind: true,
    brief: T('a 说：「b 是无赖。」b 说：「我们俩都是骑士。」把两人的话翻译成逻辑语言，接成电路：哪一行两个人的话都和身份对得上，哪一行就输出真。', 'a says: “b is a knave.” b says: “We are both knights.” Translate what both say into logic and wire it: the board outputs true on exactly the rows where what each says fits what they are.'),
    intro: [
      { t: T('这一关有两个人说话。「两个人的话都对得上」就是：a 那一句的翻译，<b>与</b> b 那一句的翻译。「我们俩都是骑士」是：a 是骑士 与 b 是骑士。', 'Two people speak this time. “What both say fits” is: the translation of a’s part <b>and</b> the translation of b’s. “We are both knights” is: a is a knight and b is a knight.') },
    ],
    hint: [
      T('一个人一句：「a 是骑士」和「非 b 是骑士」同真同假；「b 是骑士」和「a 是骑士 与 b 是骑士」同真同假。', 'One sentence per person: “a is a knight” and “not b is a knight”, true together and false together; “b is a knight” and “a is a knight and b is a knight”, likewise.'),
      T('两句都要成立：最后用「与」接起来。', 'Both must hold: join them with And at the end.'),
    ],
    solution: board('(KA ↔ ¬KB) ∧ (KB ↔ KA ∧ KB)', { nb: 'gNot', i1: 'gImp', i2: 'gImp', a1: 'gAnd', ab: 'gAnd', i3: 'gImp', i4: 'gImp', a2: 'gAnd', a3: 'gAnd' }, [
      'KB>nb.a', 'KA>i1.a', 'nb>i1.b', 'nb>i2.a', 'KA>i2.b', 'i1>a1.a', 'i2>a1.b',
      'KA>ab.a', 'KB>ab.b', 'KB>i3.a', 'ab>i3.b', 'ab>i4.a', 'KB>i4.b', 'i3>a2.a', 'i4>a2.b',
      'a1>a3.a', 'a2>a3.b', 'a3>out',
    ]),
    after: T('整件事译成：（「a 是骑士」与「非 b 是骑士」同真同假）与（「b 是骑士」与「a 是骑士 与 b 是骑士」同真同假）。还是只有一行：a 是骑士，b 是无赖。b 的话是假的，正合他无赖的身份。', 'The whole thing translates to: (“a is a knight” and “not b is a knight” true together and false together) and (“b is a knight” and “a is a knight and b is a knight” likewise). Again only one row: a is a knight, b is a knave. What b says is false, just as a knave would say.'),
  },
  {
    id: 'e-three',
    kind: 'gates',
    title: T('三个人说话', 'Three islanders speak'),
    target: '(KA ↔ ¬KB) ∧ (KB ↔ ¬KC) ∧ (KC ↔ ¬KA ∧ ¬KB)',
    blind: true,
    brief: T('a 说：「b 是无赖。」b 说：「c 是无赖。」c 说：「a 和 b 都是无赖。」把三人的话翻译成逻辑语言，接成电路：哪一行三个人的话都和身份对得上，哪一行就输出真。', 'a says: “b is a knave.” b says: “c is a knave.” c says: “a and b are both knaves.” Translate what the three say into logic and wire it: the board outputs true on exactly the rows where what each says fits what they are.'),
    intro: [
      { t: T('三个人说话，表有八行。留意 c 的话：「都是无赖」和「不都是骑士」不是一回事。', 'Three people speak, and the table has eight rows. Mind what c says: “both are knaves” is not the same as “not both are knights”.') },
    ],
    hint: [
      T('「a 和 b 都是无赖」是「（非 a 是骑士）与（非 b 是骑士）」。', '“a and b are both knaves” is “(not a is a knight) and (not b is a knight)”.'),
      T('三个人，三句「同真同假」，再用「与」把三句接起来。', 'Three people, three “true together, false together” sentences, joined by And.'),
    ],
    solution: board('(KA ↔ ¬KB) ∧ (KB ↔ ¬KC) ∧ (KC ↔ ¬KA ∧ ¬KB)', { na: 'gNot', nb: 'gNot', nc: 'gNot', i1: 'gImp', i2: 'gImp', a1: 'gAnd', i3: 'gImp', i4: 'gImp', a2: 'gAnd', c: 'gAnd', i5: 'gImp', i6: 'gImp', a3: 'gAnd', b12: 'gAnd', all: 'gAnd' }, [
      'KA>na.a', 'KB>nb.a', 'KC>nc.a',
      'KA>i1.a', 'nb>i1.b', 'nb>i2.a', 'KA>i2.b', 'i1>a1.a', 'i2>a1.b',
      'KB>i3.a', 'nc>i3.b', 'nc>i4.a', 'KB>i4.b', 'i3>a2.a', 'i4>a2.b',
      'na>c.a', 'nb>c.b', 'KC>i5.a', 'c>i5.b', 'c>i6.a', 'KC>i6.b', 'i5>a3.a', 'i6>a3.b',
      'a1>b12.a', 'a2>b12.b', 'b12>all.a', 'a3>all.b', 'all>out',
    ]),
    after: T('c 的话译成「（非 a 是骑士）与（非 b 是骑士）」，正是「翻译成与或非」那一关里的陷阱：「都不是」。八行里只有一行为真：a 是无赖，b 是骑士，c 是无赖。电路得把八行都跑一遍；人数每多一个，行数就翻一倍。', 'What c says translates to “(not a is a knight) and (not b is a knight)”, exactly the trap of the translation level: “neither”. Of the eight rows only one is true: a is a knave, b a knight, c a knave. The board had to run all eight; each extra islander doubles the rows.'),
  },
  {
    id: 'g-xor',
    kind: 'gates',
    title: T('只有一样', 'Exactly one'),
    target: '(Rain ∨ Wind) ∧ ¬(Rain ∧ Wind)',
    blind: true,
    budget: 4,
    brief: T('「要么下雨，要么刮风，但不会两样都有。」接一块电路算出它，最多用 4 个门。', '“Either it rains or it is windy, but not both.” Wire a board that computes it, with at most 4 gates.'),
    hint: [T('不必一行一行地拼。「至少一样」和「两样都有」，你各用几个门？', 'No need to piece it together row by row. How many gates for “at least one”, and for “both”?')],
    solution: board('(Rain ∨ Wind) ∧ ¬(Rain ∧ Wind)', { o: 'gOr', a: 'gAnd', n: 'gNot', b: 'gAnd' }, ['Rain>o.a', 'Wind>o.b', 'Rain>a.a', 'Wind>a.b', 'a>n.a', 'o>b.a', 'n>b.b', 'b>out']),
    naive: board('(Rain ∨ Wind) ∧ ¬(Rain ∧ Wind)', { n1: 'gNot', n2: 'gNot', a1: 'gAnd', a2: 'gAnd', o: 'gOr' }, ['Wind>n1.a', 'Rain>n2.a', 'Rain>a1.a', 'n1>a1.b', 'n2>a2.a', 'Wind>a2.b', 'a1>o.a', 'a2>o.b', 'o>out']),
    after: T('「只有一样」就是「至少一样，但不是两样都有」：4 个门。逐行拼成「下雨不刮风，或者刮风不下雨」要 5 个。', '“Exactly one” is “at least one, but not both”: 4 gates. Piecing it together row by row, “rain without wind, or wind without rain”, takes 5.'),
  },
]

/** The gates the player builds: each runs as its own function once built (checked against its level). */
export const GATES = {
  gOr: { name: T('或', 'Or'), desc: T('两个输入里至少有一个是真，就输出真；都是假，输出假。', 'Outputs true when at least one input is true; false when both are false.'), ports: ['a', 'b'], f: ([a, b]) => a || b },
  gImp: { name: T('如果…那么…', 'If…then…'), desc: T('只在 a 是真、b 是假时输出假；其余都输出真。', 'Outputs false only when a is true and b is false; true otherwise.'), ports: ['a', 'b'], f: ([a, b]) => !a || b },
}
