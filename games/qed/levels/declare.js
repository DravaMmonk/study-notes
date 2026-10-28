// Chapter 3, second half · Declarations: the kernel has Apply and the box, and no "and", "or" or "contradiction";
// definitions only name what those two prove, so a connective has to come in another way. It comes in by a
// declaration: its ways to make it, each a rule written with assumption cards from the tray (iso.js). Chained cards are
// one way that needs both; cards each into a way of their own are separate ways; no card wired is no way at all. The
// kernel makes a case to take it apart for every way, and each situation tests the declaration against what the
// connective means. `sentences` are what an assumption card may pick. Passing a declaration brings in its proof-board
// parts (`adds`), which chapter 4 puts to work.
import { isoBoard } from '../../kit/domains/logic/iso.js'

const T = (zh, en) => ({ zh, en })
const declare = (level) => ({ kind: 'iso', ...level })

export const declarations = [
  declare({
    id: 'decl-and',
    // What declaring it gives: its way to make it and the kernel's case, as parts of the proof board from here on.
    adds: ['andI', 'andE'],
    title: T('声明「并且」', 'Declaring “and”'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    sentences: ['Rain', 'Wind'],
    tests: [
      { have: { Rain: 1, Wind: 2 }, make: true },
      { have: { Rain: 3 }, make: false },
      { have: { Wind: 4 }, make: false },
      { have: {}, make: false },
    ],
    intro: [
      { t: T('串联、交换、合并，都是用套用和假设框证出来、再起了名字的<wiki-ref to="definition"></wiki-ref>。名字起得再多，能证的还是那些：它们都能换回原来的电路。可有一类话，证明核根本说不出来：「下雨，并且刮风」。没有哪块元件造得出一句「并且」，也没有哪块元件用得掉它。', 'Chain, Swap and Merge are <wiki-ref to="definition"></wiki-ref>s: proofs from Apply and the box, given a name. However many names you give, what can be proved stays the same, since each name swaps back for its circuit. But there is a kind of sentence the kernel cannot say at all: “it rains and it is windy”. No part makes an “and”, and no part uses one up.') },
      { t: T('要让证明核认识「并且」，得先<wiki-ref to="declaration"></wiki-ref>：说清楚它怎样才算证出来。「下雨并且刮风」什么时候证得出？两份证明都在手里的时候。把这句话写成一条规则：假设下雨，再假设刮风，就得到「下雨 ∧ 刮风」，写作 ⟦下雨; 刮风⟧ ⟹ 下雨 ∧ 刮风（<wiki-ref to="rule-arrow"></wiki-ref>）。这是它的一种<b>造法</b>。', 'For the kernel to know “and”, it needs a <wiki-ref to="declaration"></wiki-ref>: when does it count as proved? “It rains and it is windy” is proved when both proofs are at hand. As a rule: assume it rains, then assume it is windy, and you have “it rains ∧ it is windy”, written ⟦it rains; it is windy⟧ ⟹ it rains ∧ it is windy (<wiki-ref to="rule-arrow"></wiki-ref>). That is one <b>way to make</b> it.') },
      { t: T('声明板上，假设卡从托盘拿，卡上选它假设哪一句。一张假设接进另一张的「先假设」，是同一种造法要两样，顺着线先假设前一句、再假设后一句；接进「并且」的造法口，就是一种造法。下面的表格是几种情况：手里有哪些证明，这时该不该证得出。', 'On the declaration board, take assumption cards from the tray and pick on each the sentence it assumes. A card wired into another’s “assumed first” is one way that needs both, assumed along the wire; a card wired into a way of “and” is one way to make it. The table below lists situations: which proofs are at hand, and whether it should then be proved.') },
    ],
    brief: T('「下雨，并且刮风」：两份证明都在手里，才证得出。写出它的声明。', '“It rains and it is windy”: proved only with both proofs at hand. Write its declaration.'),
    hint: [
      T('只有一种造法，要两样：拿两张假设，一张选「下雨」，一张选「刮风」，把「下雨」接进「刮风」的「先假设」。', 'One way, needing both: take two assumptions, one of “it rains” and one of “it is windy”, and wire “it rains” into the “assumed first” of “it is windy”.'),
      T('再把「刮风」接进「并且」的造法 1。', 'Then wire “it is windy” into way 1 of “and”.'),
    ],
    solution: isoBoard(['Rain>Wind', 'Wind>1']),
    naive: isoBoard(['Rain>1', 'Wind>2']),
    after: T('声明好了，核还替你做了一件事。既然只有这一种造法，一份「下雨 ∧ 刮风」的证明里一定装着交进去的那两份，所以能把它们取回来：表格里那一栏就是这个<b>拆法</b>。拆法不用你写，造法定了，它就定了。这条规则也不是证出来的：「并且」原本不存在，声明让证明核从此认得它。', 'Declared, it gets one more thing from the kernel. Since this is the only way to make it, a proof of “it rains ∧ it is windy” must hold the two proofs handed in, so they can be got back: that column of the table is its <b>case</b>. You do not write the case; once the ways are fixed, so is it. Nor was this rule proved: “and” did not exist before, and the declaration is what makes the kernel know it.'),
  }),
  declare({
    id: 'decl-or',
    adds: ['orI', 'orE'],
    title: T('声明「或者」', 'Declaring “or”'),
    declare: T('或者', 'or'),
    target: 'Sat ∨ Sun',
    sentences: ['Sat', 'Sun'],
    tests: [
      { have: { Sat: 1 }, make: true },
      { have: { Sun: 2 }, make: true },
      { have: { Sat: 3, Sun: 4 }, make: true },
      { have: {}, make: false },
    ],
    intro: [{ t: T('「并且」只有一种造法，要两样。「或者」呢？「今天是周六，或者今天是周日」：有一份就够，两份都有也行。一种造法说不出「有一份就够」。', '“And” has one way to make it, needing two things. And “or”? “Today is Saturday or today is Sunday”: one proof is enough, and both will do. One way cannot say “one is enough”.') }],
    brief: T('「今天是周六，或者今天是周日」：手里有其中一份证明就证得出，两份都有也行。写出它的声明。', '“Today is Saturday or today is Sunday”: proved with either proof at hand, and with both. Write its declaration.'),
    hint: [T('两种造法，各要一样：两张假设不串，各接一个造法口。', 'Two ways, each needing one: no chain, each assumption into a way of its own.')],
    solution: isoBoard(['Sat>1', 'Sun>2']),
    naive: isoBoard(['Sat>Sun', 'Sun>1']),
    after: T('两种造法，就有两个拆法。拿到一份「或者」的证明，并不知道它是哪种造法造的，只好两个拆法都准备好，实际是哪一种就走哪一个：这就是分情况。', 'Two ways, so two cases. Holding a proof of “or”, you do not know which way made it, so both cases stand ready, and the one it was made by is taken: that is “case by case”.'),
  }),
  declare({
    id: 'decl-bot',
    adds: ['botE'],
    title: T('声明 ⊥', 'Declaring ⊥'),
    declare: T('矛盾', 'contradiction'),
    symbols: ['⊥'],
    target: '⊥',
    sentences: ['Rain'],
    tests: [
      { have: { Rain: 1 }, make: false },
      { have: {}, make: false },
    ],
    intro: [{ t: T('还差「非」。「不下雨」说的是：要是下雨，就出了矛盾。所以先声明矛盾本身，写作 ⊥：一句不管手里有什么，都不该证得出的话。', '“Not” is left. “It does not rain” says: if it rains, that is a contradiction. So first declare the contradiction itself, written ⊥: a sentence that should never be proved, whatever is at hand.') }],
    brief: T('矛盾 ⊥：一句不管手里有什么，都证不出来的话。写出它的声明。', 'The contradiction ⊥: a sentence that cannot be proved whatever is at hand. Write its declaration.'),
    hint: [T('怎样都证不出，就是一种造法都没有。', 'Never proved means no way to make it.')],
    solution: isoBoard([]),
    naive: isoBoard(['Rain>1']),
    after: T('一种造法都没有，就一个拆法都没有。用它的时候，要对每一种造法各准备一个办法，可一种都没有，所以什么都不用准备：有了矛盾，想要什么都行。「非」不用另外声明：¬A 就是「A → ⊥」的名字，是一个<wiki-ref to="definition"></wiki-ref>。「并且」「或者」「非」都进了证明核，下一章用它们来证明。', 'No way to make it, so no case to take it apart. Using it means readying one move for each way, and there are none, so there is nothing to ready: from a contradiction, anything follows. “Not” needs no declaration of its own: ¬A is a name for “A → ⊥”, a <wiki-ref to="definition"></wiki-ref>. “And”, “or” and “not” are all in the kernel now; the next chapter proves with them.'),
  }),
]

// The optional topic after the three: more shapes a declaration takes. A way that needs three, and three ways; the
// order a way takes its proofs in, which the situations cannot see (`ways`); three ways of two each, a new proposition
// and not a connective (and why "exactly one" cannot be declared); a way that needs nothing (True); a way whose
// assumptions are sentences with → in them (if and only if).
const VOTE = { a1: 'AnnYes', b1: 'BoYes', b2: 'BoYes', c2: 'CyYes', a3: 'AnnYes', c3: 'CyYes' }
const IFF = { f: 'Rain → Wet', g: 'Wet → Rain' }

export const moreDeclarations = [
  {
    id: 'decl-three',
    title: T('三样', 'Three of them'),
    tasks: [
      declare({
        step: T('三样都要', 'All three'),
        declare: T('三样都要', 'all three'),
        target: 'Rain ∧ (Wind ∧ Wet)',
        sentences: ['Rain', 'Wind', 'Wet'],
        tests: [
          { have: { Rain: 1, Wind: 2, Wet: 3 }, make: true },
          { have: { Rain: 4, Wind: 5 }, make: false },
          { have: { Rain: 6, Wet: 7 }, make: false },
          { have: { Wind: 8, Wet: 9 }, make: false },
        ],
        brief: T('「下雨、刮风、地湿，三样都要」：三份证明都在手里才证得出。写出它的声明。', '“It rains, it is windy, the ground is wet: all three”: proved only with all three proofs at hand. Write its declaration.'),
        hint: [T('一种造法，三张假设串成一串。', 'One way: three assumptions in one chain.')],
        solution: isoBoard(['Rain>Wind', 'Wind>Wet', 'Wet>1']),
        naive: isoBoard(['Rain>Wind', 'Wind>1', 'Wet>2']),
        after: T('一种造法串三张假设。平常写的「下雨 ∧ 刮风 ∧ 地湿」却不必另外声明：它读作「下雨 ∧ (刮风 ∧ 地湿)」，两层「并且」，拆的时候也拆两层。', 'One way, three assumptions in a chain. The usual “it rains ∧ it is windy ∧ the ground is wet” needs no declaration of its own, though: it reads “it rains ∧ (it is windy ∧ the ground is wet)”, two “and”s, taken apart twice.'),
      }),
      declare({
        step: T('三选一', 'One of three'),
        declare: T('三选一', 'one of three'),
        target: 'Sat ∨ (Sun ∨ Holiday)',
        sentences: ['Sat', 'Sun', 'Holiday'],
        tests: [
          { have: { Sat: 1 }, make: true },
          { have: { Sun: 2 }, make: true },
          { have: { Holiday: 3 }, make: true },
          { have: {}, make: false },
        ],
        brief: T('「今天是周六、周日，或者放假」：手里有其中任何一份证明就证得出。写出它的声明。', '“Today is Saturday, Sunday, or a holiday”: proved with any one of the three proofs at hand. Write its declaration.'),
        hint: [T('三种造法，各要一样，造法口正好用满。', 'Three ways, each needing one: every way in is used.')],
        solution: isoBoard(['Sat>1', 'Sun>2', 'Holiday>3']),
        naive: isoBoard(['Sat>1', 'Sun>2']),
      }),
    ],
    intro: [{ t: T('「并且」「或者」各要两样。换成三样：一种造法要三样，或者三种造法各要一样。', '“And” and “or” each take two. Make it three: one way needing three, or three ways needing one each.') }],
    after: T('三种造法，三个拆法：拿到它的证明，要对三种情况各准备一个办法。造法有几种，分情况就分几支。', 'Three ways, three cases: holding its proof, you ready one move for each of the three. As many ways as there are, so many branches has case by case.'),
  },
  declare({
    id: 'decl-order',
    title: T('换个顺序', 'The other order'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    sentences: ['Rain', 'Wind'],
    ways: [['Wind', 'Rain']],
    tests: [
      { have: { Rain: 1, Wind: 2 }, make: true },
      { have: { Rain: 3 }, make: false },
      { have: { Wind: 4 }, make: false },
    ],
    intro: [{ t: T('你声明的「并且」，造法先要「下雨」、再要「刮风」。反过来写行不行？表格分得出来吗？', 'The “and” you declared takes “it rains” first, then “it is windy”. Would the other order do? Can the table tell?') }],
    brief: T('写一个先要「刮风」、再要「下雨」的「并且」。', 'Write an “and” that takes “it is windy” first, then “it rains”.'),
    hint: [T('把「刮风」接进「下雨」的「先假设」。', 'Wire “it is windy” into the “assumed first” of “it rains”.')],
    solution: isoBoard(['Wind>Rain', 'Rain>1']),
    naive: isoBoard(['Rain>Wind', 'Wind>1']),
    after: T('两种顺序，每种情况下都一样证得出，表格分不出来。可规则不一样：用它造「并且」时，交证明的顺序跟着变。证明核只认写下来的那一条。', 'In every situation the two orders prove it alike, and the table cannot tell them apart. The rules differ, though: making “and” with it, the proofs go in the other order. The kernel keeps to the rule written down.'),
  }),
  declare({
    id: 'decl-two',
    title: T('至少两样', 'At least two'),
    declare: T('提案通过', 'the motion passes'),
    target: 'Motion',
    sentences: ['AnnYes', 'BoYes', 'CyYes'],
    tests: [
      { have: { AnnYes: 1, BoYes: 2 }, make: true },
      { have: { BoYes: 3, CyYes: 4 }, make: true },
      { have: { AnnYes: 5, CyYes: 6 }, make: true },
      { have: { AnnYes: 7, BoYes: 8, CyYes: 9 }, make: true },
      { have: { AnnYes: 10 }, make: false },
      { have: { CyYes: 11 }, make: false },
    ],
    intro: [{ t: T('声明出来的不一定是连接词。一件事怎样才算成立，只要说得出有哪几种造法，就能声明。', 'What is declared need not be a connective. Whatever counts as holding in a few ways to make it can be declared.') }],
    brief: T('安、博、赛三人投票，至少两人同意，提案就通过。写出「提案通过」的声明。', 'Ann, Bo and Cy vote; with at least two agreeing, the motion passes. Write the declaration of “the motion passes”.'),
    hint: [T('三种造法，每种是两个人同意，两张假设串起来。同一句可以拿好几张假设。', 'Three ways, each two people agreeing, two assumptions in a chain. One sentence may be on several cards.')],
    solution: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2', 'a3>c3', 'c3>3'], VOTE),
    naive: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2'], VOTE),
    after: T('三种造法，各要两个人。可换成「恰好一人同意」就写不出来了：造法只能说「有了什么就造得出」，说不了「有了什么就造不出」。', 'Three ways, two people each. “Exactly one agrees” cannot be written, though: a way can only say what makes it, never what stops it.'),
  }),
  declare({
    id: 'decl-true',
    title: T('声明「真」', 'Declaring True'),
    declare: T('真', 'True'),
    target: 'Truth',
    sentences: ['Rain'],
    tray: ['hyp', 'none'],
    tests: [
      { have: {}, make: true },
      { have: { Rain: 1 }, make: true },
    ],
    intro: [{ t: T('⊥ 一种造法都没有。反过来，一句什么都不要、总证得出的话，该怎么声明？托盘里多了一张「不用假设」。', '⊥ has no way to make it. The other way round: how to declare a sentence that needs nothing and is always proved? The tray has a new card, “assume nothing”.') }],
    brief: T('「真」：不管手里有什么，甚至什么都没有，都证得出。写出它的声明。', 'True: proved whatever is at hand, even nothing at all. Write its declaration.'),
    hint: [T('一种造法，什么都不用：把「不用假设」接进造法 1。', 'One way that needs nothing: wire “assume nothing” into way 1.')],
    solution: isoBoard(['∅>1']),
    naive: isoBoard(['Rain>1']),
    after: T('一种空造法，常写成 ⊤。和 ⊥ 正好相反：⊥ 一种造法都没有，所以怎样都证不出；「真」有一种空造法，所以怎样都证得出。它的拆法什么都取不回：知道「真」，什么也没多知道。', 'One empty way, often written ⊤. Just the opposite of ⊥: ⊥ has no way, so it is never proved; True has one empty way, so it is always proved. Its case gets nothing back: knowing True, you know nothing more.'),
  }),
  declare({
    id: 'decl-iff',
    title: T('声明「当且仅当」', 'Declaring “if and only if”'),
    declare: T('当且仅当', 'if and only if'),
    target: 'Rain ↔ Wet',
    sentences: ['Rain → Wet', 'Wet → Rain'],
    tray: ['hyp', 'none'],
    tests: [
      { have: { 'Rain → Wet': 1, 'Wet → Rain': 2 }, make: true },
      { have: { 'Rain → Wet': 3 }, make: false },
      { have: { 'Wet → Rain': 4 }, make: false },
      { have: {}, make: false },
    ],
    intro: [{ t: T('造法要的不必是一个字母。真值电路里的 ↔ 是两个方向都对：它要的是两句「若…则…」。', 'What a way takes need not be one letter. The ↔ of the truth circuits holds both ways round: it takes two “if … then …”s.') }],
    brief: T('「下雨当且仅当地湿」：两个方向的「若…则…」都在手里才证得出。写出它的声明。', '“It rains if and only if the ground is wet”: proved only with both “if … then …”s at hand. Write its declaration.'),
    hint: [T('两张假设分别假设两个方向，串成一种造法。', 'Two assumptions, one for each direction, chained into one way.')],
    solution: isoBoard(['f>g', 'g>1'], IFF),
    naive: isoBoard(['f>1', 'g>2'], IFF),
    after: T('一种造法，要两个方向。它和「(下雨 → 地湿) ∧ (地湿 → 下雨)」造法一样、拆法也一样：两份证明一起交进去，一起取回来。所以下一章里，↔ 就当成这样一句「并且」来拆。', 'One way, needing both directions. It is made and taken apart just as “(it rains → the ground is wet) ∧ (the ground is wet → it rains)”: both proofs go in together and come back together. So in the next chapter, ↔ is taken apart as just such an “and”.'),
  }),
]
