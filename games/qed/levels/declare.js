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
      { t: T('假设卡从托盘拿，卡上选它假设哪一句。一种造法要两样，就把一张接进另一张的「先假设」，顺着线先假设前一句、再假设后一句；串好接进「并且」的造法口，就是一种造法。下面的表格是几种情况：手里有哪些证明，这时该不该证得出。', 'On the declaration board, take assumption cards from the tray and pick on each the sentence it assumes. A card wired into another’s “assumed first” is one way that needs both, assumed along the wire; a card wired into a way of “and” is one way to make it. The table below lists situations: which proofs are at hand, and whether it should then be proved.') },
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
    after: T('两种造法，拆法就分两种情况。拿到一份「或者」的证明，并不知道它是哪种造法造的，只好两种情况都准备好，实际是哪一种就走哪一种：这就是分情况。', 'Two ways, so its case splits in two. Holding a proof of “or”, you do not know which way made it, so both stand ready, and the one it was made by is taken: that is “case by case”.'),
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
    intro: [{ t: T('还差「非」。「不下雨」说的是：要是下雨，就出了矛盾。所以先声明矛盾本身，写作 ⊥：没有哪一种造法造得出它。', '“Not” is left. “It does not rain” says: if it rains, that is a contradiction. So first declare the contradiction itself, written ⊥: no way at all makes it.') }],
    brief: T('矛盾 ⊥：手里有什么，都没有哪一种造法造得出它。写出它的声明。', 'The contradiction ⊥: whatever is at hand, no way makes it. Write its declaration.'),
    hint: [T('怎样都证不出，就是一种造法都没有。', 'Never proved means no way to make it.')],
    solution: isoBoard([]),
    naive: isoBoard(['Rain>1']),
    after: T('一种造法都没有，拆法就一种情况都不用准备：用它的时候，要对每一种造法各准备一个办法，可一种都没有，所以有了矛盾，想要什么都行。「非」不用另外声明：¬A 就是「A → ⊥」的名字，是一个<wiki-ref to="definition"></wiki-ref>。「并且」「或者」「非」都进了证明核，下一章用它们来证明。', 'No way to make it, so its case has nothing to ready: using it means readying one move for each way, and there are none, so from a contradiction, anything follows. “Not” needs no declaration of its own: ¬A is a name for “A → ⊥”, a <wiki-ref to="definition"></wiki-ref>. “And”, “or” and “not” are all in the kernel now; the next chapter proves with them.'),
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
    intro: [{ t: T('「并且」「或者」都只说两句话。换成三句：一种造法要三样，或者三种造法各要一样。', '“And” and “or” speak of two sentences. Make it three: one way needing three, or three ways needing one each.') }],
    after: T('三种造法，拆法就分三种情况：拿到它的证明，要对三种情况各准备一个办法。造法有几种，分情况就分几支。', 'Three ways, so its case splits in three: holding its proof, you ready one move for each. As many ways as there are, so many branches has case by case.'),
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

// Declarations further on, each just before the parts it brings are put to work. "There is", with the quantifiers: one
// way taking a thing and a proof about it; its case is Take the one there is. Equality: one way taking a thing alone,
// a = a; what takes it apart is rewriting, which is not the plain cases (= is a family of sentences indexed by things),
// so the level gives it. The numbers, before induction: 0 needs nothing, the next number needs a number; what takes
// a number apart, with the conclusion already used on the number it was made from, is induction.
export const thingDeclarations = [
  declare({
    id: 'decl-ex',
    adds: ['exI', 'exE'],
    title: T('声明「存在」', 'Declaring “there is”'),
    declare: T('存在', 'there is'),
    target: '∃y. Human(y)',
    sentences: ['Human(x)', 'Mortal(x)'],
    things: ['soc', 'ann'],
    tray: ['thing', 'hyp'],
    tests: [
      { have: { 'Human(soc)': 1 }, make: true },
      { have: { 'Human(ann)': 2 }, make: true },
      { have: { 'Mortal(soc)': 3 }, make: false },
      { have: {}, make: false },
    ],
    intro: [
      { t: T('「对所有」不用声明：任取一样东西证出来，就是对所有东西证出来，这件事证明核本来就会。「存在」不一样：「∃y. y是人」怎样才算证出来？得有某一样东西，再有它是人的证明，比如「苏格拉底是人」。', '“For all” needs no declaration: proved for any thing taken, it is proved for all, and the kernel can do that already. “There is” is different: when is “∃y. y is human” proved? There has to be some thing, and a proof that it is human, such as “Socrates is human”.') },
      { t: T('托盘里多了一张「任取一样东西」：它取一样东西，叫它 x；接在它后面的假设可以提到 x。', 'The tray has a new card, “any thing”: it takes a thing and calls it x; the assumptions after it may mention x.') },
    ],
    brief: T('「存在一个人」：手里有某一样东西是人的证明，就证得出。写出它的声明。', '“There is a human”: proved with a proof that some thing is human at hand. Write its declaration.'),
    hint: [T('一种造法：先取一样东西，再接一张假设，选「x是人」，接进造法 1。', 'One way: take a thing first, then an assumption choosing “x is human”, into way 1.')],
    solution: isoBoard(['⋀x>h', 'h>1'], { h: 'Human(x)' }),
    naive: isoBoard(['h>1'], { h: 'Human(x)' }),
    after: T('一种造法要两样：一样东西，和它是人的证明。拆法取回的也是这两样，可取回的是苏格拉底还是安，要看当初交进去的是谁；用「存在」的时候并不知道，所以那一样东西只能当一个新名字来用。证明板上从此有了举例（这种造法）和拿出那一个（这个拆法）。', 'One way taking two things: a thing, and a proof that it is human. Its case gets back the same two, but whether it is Socrates or Ann depends on what went in; using “there is”, you do not know, so the thing can only be used under a new name. The proof board now has Example (this way) and Take the one there is (this case).'),
  }),
  declare({
    id: 'decl-eq',
    adds: ['rewrite', 'refl'],
    title: T('声明相等', 'Declaring equality'),
    declare: T('相等', 'equal'),
    target: 'a = a',
    binder: 'a',
    sentences: [],
    things: ['phos', 'hesp'],
    tray: ['thing'],
    tests: [
      { goal: 'phos = phos', have: {}, make: true },
      { goal: 'hesp = hesp', have: {}, make: true },
      { goal: 'phos = hesp', have: {}, make: false },
    ],
    take: { premises: ['?a = ?b', '?P(?a)'], conclusion: '?P(?b)' },
    intro: [{ t: T('晨星和昏星是不是同一颗星？要说两样东西相等，先声明相等。凭空能证出哪些「s = t」？只有一种：每样东西都等于它自己。两个名字不一样的，凭空证不出来。', 'Are the Morning Star and the Evening Star one star? To say two things are equal, declare equality first. Which “s = t” can be proved from nothing? Only one kind: each thing equals itself. Two different names, from nothing, cannot be.') }],
    brief: T('相等：任何东西都等于它自己；凭空证不出两个不同名字相等。写出它的声明。', 'Equality: everything equals itself; two different names cannot be proved equal from nothing. Write its declaration.'),
    hint: [T('一种造法，只要取一样东西 a，什么都不用假设。', 'One way that takes a thing a and assumes nothing.')],
    solution: isoBoard(['⋀a>1']),
    naive: isoBoard(['∅>1']),
    after: T('一种造法，只取一样东西：每样东西等于它自己，这就是自反律。它的拆法有点特别：「a = b」只可能是从「a = a」造出来的，所以 b 其实就是 a，关于 a 说的话对 b 也成立。这就是等量代换。证明板上从此有了这两块元件。', 'One way, taking one thing: everything equals itself, which is reflexivity. Its case is a little special: “a = b” can only have been made as “a = a”, so b is really a, and what is said of a holds of b. That is rewriting. The proof board now has both parts.'),
  }),
]

export const natDeclaration = [
  declare({
    id: 'decl-nat',
    title: T('声明自然数', 'Declaring the numbers'),
    declare: T('自然数', 'a number'),
    target: 'Nat',
    sentences: ['Nat'],
    tray: ['hyp', 'none'],
    tests: [
      { have: {}, make: true },
      { have: { Nat: 1 }, make: true, uses: ['Nat'] },
    ],
    take: { premises: ['?P(zero)', '⋀n. ⟦?P(n)⟧ ⟹ ?P(s(n))'], conclusion: '?P(?n)' },
    intro: [{ t: T('化简器把 0、S 0 当现成的东西来算。它们从哪里来？和「并且」一样，靠声明：一个自然数有哪几种造法？', 'The simplifier works with 0 and S 0 as if they were just there. Where do they come from? As with “and”, from a declaration: what are the ways to make a number?') }],
    brief: T('自然数：什么都没有，也造得出一个（0）；手里有一个数，就造得出它的下一个。写出它的声明。', 'A number: one can be made from nothing (0); with a number at hand, the next one can be made. Write its declaration.'),
    hint: [T('两种造法：一种什么都不用假设；另一种假设「自然数」，要的正是一个数。', 'Two ways: one assumes nothing; the other assumes “a number”, taking just a number.')],
    solution: isoBoard(['∅>1', 'Nat>2']),
    naive: isoBoard(['∅>1']),
    after: T('两种造法：0 什么都不要，S 要一个数，造出它的下一个，写作 nat = 0 | S nat。第二种造法要的正是一个自然数，所以拆开一个数时，除了取回它是从哪个数来的，还能先对那个数用上要证的结论：这就是归纳假设。它的拆法就是数学归纳法，下面就用这个声明给出的规则。', 'Two ways: 0 takes nothing, S takes a number and makes the next, written nat = 0 | S nat. The second way takes a number itself, so taking a number apart gets back the number it came from, with what is being proved already used on that number: the induction hypothesis. Its case is mathematical induction, and what follows uses the rules this declaration gives.'),
  }),
]
