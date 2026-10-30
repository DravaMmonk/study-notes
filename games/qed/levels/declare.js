// Chapter 3, second half · Declarations: the kernel has Apply and the box, and no "and", "or" or "contradiction";
// definitions only name what those two prove, so a connective has to come in another way. It comes in by a
// declaration: its ways to make it, each a rule written with premise cards (⟦⟧), Join (;) and wires (⟹) from the tray
// (iso.js). Joined cards are one way that needs both; cards each into a way of their own are separate ways; a card wired
// into another's port is a premise that needs it first; no card wired is no way at all. It starts with the one the
// kernel knows already, → (the box and Apply). Each situation tests the declaration against what the connective
// means. `sentences` are what a premise card may pick.
//
// What takes it apart is not written: the ways in are all the ways there are, so its elimination rule is made from
// them (iso.js declaredRules), as Lean and Isabelle make it, and the pass text says so. Passing a declaration brings in
// its ways in and its elimination rule as proof-board parts (`adds`), which chapter 4 puts to work. Chapter 12 has the
// player build the machine that makes it (the elimination rule generator).
import { isoBoard } from '../../kit/domains/logic/iso.js'
import { TERM_WORDS } from './words.js'
import { machine } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
const declare = (level) => ({ kind: 'iso', ...level })
// The generator's tests: declarations, their letters metavariables, each its sentence, its ways in and the
// elimination rule they make, which concludes any ?R (elimgen.js).
const DECLS = {
  and: { it: '?A ∧ ?B', ways: ['⟦?A; ?B⟧ ⟹ ?A ∧ ?B'], elim: ['?A ∧ ?B', '⟦?A; ?B⟧ ⟹ ?R'] },
  three: { it: '?A ∧ (?B ∧ ?C)', ways: ['⟦?A; ?B; ?C⟧ ⟹ ?A ∧ (?B ∧ ?C)'], elim: ['?A ∧ (?B ∧ ?C)', '⟦?A; ?B; ?C⟧ ⟹ ?R'] },
  iff: { it: '?A ↔ ?B', ways: ['⟦?A → ?B; ?B → ?A⟧ ⟹ ?A ↔ ?B'], elim: ['?A ↔ ?B', '⟦?A → ?B; ?B → ?A⟧ ⟹ ?R'] },
  truth: { it: 'Truth', ways: ['Truth'], elim: ['Truth', '?R'] },
  or: { it: '?A ∨ ?B', ways: ['⟦?A⟧ ⟹ ?A ∨ ?B', '⟦?B⟧ ⟹ ?A ∨ ?B'], elim: ['?A ∨ ?B', '⟦?A⟧ ⟹ ?R', '⟦?B⟧ ⟹ ?R'] },
  oneOfThree: { it: '?A ∨ (?B ∨ ?C)', ways: ['⟦?A⟧ ⟹ ?A ∨ (?B ∨ ?C)', '⟦?B⟧ ⟹ ?A ∨ (?B ∨ ?C)', '⟦?C⟧ ⟹ ?A ∨ (?B ∨ ?C)'], elim: ['?A ∨ (?B ∨ ?C)', '⟦?A⟧ ⟹ ?R', '⟦?B⟧ ⟹ ?R', '⟦?C⟧ ⟹ ?R'] },
  bot: { it: '⊥', ways: [], elim: ['⊥'] },
  ex: { it: '∃y. ?P(y)', ways: ['⋀x. ⟦?P(x)⟧ ⟹ ∃y. ?P(y)'], elim: ['∃y. ?P(y)', '⋀x. ⟦?P(x)⟧ ⟹ ?R'] },
  nat: { it: 'Nat', ways: ['Nat', '⟦Nat⟧ ⟹ Nat'], elim: ['Nat', '?R', '⟦Nat⟧ ⟹ ?R'] },
  // Two variables bound by one way: Keep ⋀ sets both aside at once.
  exTwo: { it: '∃u. ∃v. ?P(u, v)', ways: ['⋀x y. ⟦?P(x, y)⟧ ⟹ ∃u. ∃v. ?P(u, v)'], elim: ['∃u. ∃v. ?P(u, v)', '⋀x y. ⟦?P(x, y)⟧ ⟹ ?R'] },
  two: { it: 'Motion', ways: ['⟦AnnYes; BoYes⟧ ⟹ Motion', '⟦BoYes; CyYes⟧ ⟹ Motion', '⟦AnnYes; CyYes⟧ ⟹ Motion'], elim: ['Motion', '⟦AnnYes; BoYes⟧ ⟹ ?R', '⟦BoYes; CyYes⟧ ⟹ ?R', '⟦AnnYes; CyYes⟧ ⟹ ?R'] },
}
const RULECRAFT = ['anyR', 'swapConcl', 'consFront', 'mkRule']
const generator = (level) => ({
  kind: 'machine',
  want: 'elim',
  inputs: [{ name: 'it', label: T('它', 'It') }, { name: 'ways', label: level.single ? T('引入规则', 'Intro rule') : T('引入规则（一串）', 'Intro rules (a list)') }],
  ...level,
})
// The generator for a list of ways in: each one's conclusion put as ?R, inside For each; the declared sentence first.
// The generator after chapter 6: each way's things taken set aside while its conclusion is swapped.
const GENERATOR_ANY = machine({ r: ['anyR'], e: ['eachOf'], a: ['keepBound', {}, 'e'], s: ['swapConcl', {}, 'a'], c: ['consFront'], m: ['mkRule'] }, ['ways>e.in', 'e#body>a.in', 'a#body>s.rule', 'r>s.to', 's>a.body', 'a>e.body', 'it>c.first', 'e>c.rest', 'c>m.premises', 'r>m.conclusion', 'm>out'], { inputs: ['it', 'ways'] })
const GENERATOR = machine({ r: ['anyR'], e: ['eachOf'], s: ['swapConcl', {}, 'e'], c: ['consFront'], m: ['mkRule'] }, ['ways>e.in', 'e#body>s.rule', 'r>s.to', 's>e.body', 'it>c.first', 'e>c.rest', 'c>m.premises', 'r>m.conclusion', 'm>out'], { inputs: ['it', 'ways'] })

// "If … then …": its sentence, and the cases its declaration is checked on.
const IMP = {
  declare: T('若…则…', 'if … then …'),
  target: 'Rain → Wet',
  sentences: ['Rain', 'Wet'],
  tests: [
    { given: ['Wet'], make: true },
    { given: ['Rain', 'Wet'], make: true },
    { given: ['Rain'], make: false },
    { given: [], make: false },
    { given: ['Rain → Wet'], goal: 'Rain', make: false },
    { given: ['Rain → Wet'], goal: 'Wet', make: false },
    { given: ['Rain → Wet', 'Rain'], goal: 'Wet', make: true },
  ],
}
const ALL = ['given', 'goal', 'make']

export const declarations = [
  declare({
    // The connective the kernel has known since chapter 2: its one way in is the box, the elimination rule made from it
    // gives back the premise as a rule, and with what it needs, that is Apply. Nothing new for the proof board.
    id: 'decl-imp',
    title: T('声明「若…则…」', 'Declaring “if … then …”'),
    ...IMP,
    tray: ['hyp'],
    intro: [
      { t: T('此前我们用「若…则…」（→）推理时，一直假定证明核已经认识它。证明核不会自动认识新符号及相关规则：在依赖类型论中，可以通过<wiki-ref to="declaration"></wiki-ref>来拟定新符号的构建和使用规则。', 'When reasoning with “if … then …” (→), we have assumed that the proof kernel already knows it. A kernel does not automatically know new symbols or their rules: in dependent type theory, a <wiki-ref to="declaration"></wiki-ref> can specify how a new symbol is constructed and used.') },
      { t: T('一条规则写作「⟦前提⟧ ⟹ 结论」：满足前提，就可以得到结论。<wiki-ref to="rule-arrow"></wiki-ref>连接的是规则的前提和结论；→ 则是命题里的「若…则…」。', 'A rule is written “⟦premises⟧ ⟹ conclusion”: if its premises hold, the conclusion follows. The <wiki-ref to="rule-arrow"></wiki-ref> connects the premises and conclusion of a rule; → means “if … then …” within a statement.') },
      { t: T('<wiki-ref to="intro-rule"></wiki-ref>说明怎样证明带有某个连接词的命题。例如，在假设 A 的条件下证出 B，就能通过<part-ref to="part:impI"></part-ref>得到 A → B。假设框就是「若…则…」的引入规则。', 'An <wiki-ref to="intro-rule"></wiki-ref> says how to prove a statement with a connective. For example, a proof of B under the assumption A gives A → B through the <part-ref to="part:impI"></part-ref>. The assumption box is the introduction rule for “if … then …”.') },
      { t: T('<wiki-ref to="elim-rule"></wiki-ref>说明怎样使用带有某个连接词的命题。例如，由 A → B 和 A，可以通过<part-ref to="part:mp"></part-ref>得到 B。套用就是「若…则…」的消去规则。', 'An <wiki-ref to="elim-rule"></wiki-ref> says how to use a statement with a connective. For example, A → B and A give B through <part-ref to="part:mp"></part-ref>. Apply is the elimination rule for “if … then …”.') },
      { t: T('先从熟悉的「若…则…」开始，写出假设框对应的引入规则。', 'Start with the familiar “if … then …” and write the introduction rule corresponding to the assumption box.') },
    ],
    brief: T('如果假设「下雨」后能推出「地湿」，就可以引入「下雨 → 地湿」。请写出它的声明。', 'If “the ground is wet” can be proved assuming “it rains”, we can introduce “it rains → the ground is wet”. Write its declaration.'),
    hint: [
      T('这条引入规则要求在假设「下雨」的条件下推出「地湿」。', 'The introduction rule requires “the ground is wet” to be proved under the assumption “it rains”.'),
      T('将「下雨」接到「地湿」的「它的前提」输入口，再将「地湿」接到「引入规则 1」。', 'Connect “it rains” to the “Its premises” input of “the ground is wet”, then connect “the ground is wet” to “Intro rule 1”.'),
    ],
    solution: isoBoard(['Rain>Wet', 'Wet>1']),
    naive: isoBoard(['Wet>1']),
    after: T('你可能已经注意到，声明板会根据引入规则生成<wiki-ref to="elim-rule"></wiki-ref>。这是因为声明列出了构建该命题的全部方式：要使用它，就可以逐一考虑这些方式。', 'You may have noticed that the declaration board generates an <wiki-ref to="elim-rule"></wiki-ref> from the introduction rules. This is possible because the declaration lists all the ways to construct the statement: using it means considering each of those ways.'),
  }),
  declare({
    // Writing test cases, before writing more declarations: a free case agreeing with the player's own right
    // declaration, then one disagreeing with someone's wrong one; last, the two directions on one declaration, the
    // declared sentence as the goal (how it is made) and as a premise (what follows from it): 3-1's naive declaration,
    // which no case of the first direction can tell from the right one.
    id: 'decl-check',
    title: T('检验声明', 'Checking a declaration'),
    ...IMP,
    solution: isoBoard(['Rain>Wet', 'Wet>1']),
    intro: [
      { t: T('<b>检验条例</b>用来检查声明是否符合我们想表达的意思。每条条例描述一种情况：有哪些<b>前提</b>、要推导什么<b>目标</b>，以及在这些前提下，目标<b>预期</b>能否推导出来。', 'A <b>test case</b> checks whether a declaration captures the intended meaning. Each case describes a situation: the available <b>premises</b>, the <b>goal</b>, and whether the goal is <b>expected</b> to follow from those premises.') },
      { t: T('声明规定了哪些推导可以成立。运行检验时，证明器会按声明给出<b>结果</b>，再与条例中的预期比较。结果不符，就说明声明在这种情况下没有表达出我们想要的意思。', 'A declaration specifies which derivations are allowed. When a test runs, the prover gives a <b>result</b> according to the declaration and compares it with the expectation. A mismatch shows that the declaration does not capture the intended meaning in that situation.') },
      { t: T('本关先为自己写的声明编写一条结果相符的条例，再为另一份声明找一条结果不符的条例，最后从两个方向检验同一份声明。', 'In this level, first write a case that agrees with your own declaration, then find a case that disagrees with another declaration, and last check one declaration in two directions.') },
    ],
    tasks: [
      {
        kind: 'iso',
        step: T('正确的声明', 'A right declaration'),
        play: 'audit',
        want: 'agree',
        carry: 'decl-imp',
        boards: [{ board: isoBoard(['Rain>Wet', 'Wet>1']) }],
        slots: 1,
        answer: [{ given: ['Wet'], make: true }],
        naive: [{ given: ['Rain'], make: true }],
        intro: [{ t: T('板上是你在<level-ref to="decl-imp"></level-ref>写的声明。找出一种情况，使这份声明的结果与预期相符，并将这个情况填入表内。', 'The board holds your declaration from <level-ref to="decl-imp"></level-ref>. Find a situation in which its result agrees with your expectation, and enter it in the table.') }],
        brief: T('找出一种情况：预期符合需求，声明的结果与预期相符。', 'Find a situation where the expectation meets the requirement and the declaration’s result agrees with it.'),
        hint: [T('先定下前提和目标，再按需求想：这时目标该不该推得出？', 'Choose the premises and the goal first, then ask what the requirement says: should the goal be derivable?')],
      },
      {
        // Someone's declaration that makes it from rain alone: wrong both ways.
        kind: 'iso',
        step: T('错误的声明', 'A wrong declaration'),
        play: 'audit',
        boards: [{ board: isoBoard(['Rain>1']) }],
        slots: 1,
        answer: [{ given: ['Rain'], make: false }],
        naive: [{ given: ['Rain', 'Wet'], make: true }],
        intro: [{ t: T('板上换成了别人写的声明。找出一种情况，使这份声明的结果与预期不符，并将这个情况填入表内。', 'The board now holds someone else’s declaration. Find a situation in which its result disagrees with your expectation, and enter it in the table.') }],
        brief: T('找出一种情况：预期符合需求，声明的结果却与预期不符。', 'Find a situation where the expectation meets the requirement but the declaration’s result disagrees with it.'),
        hint: [T('这份声明要的前提和需求一样吗？', 'Does this declaration ask for the same premise as the requirement?')],
      },
      {
        // 3-1's naive declaration, ⟦Wet⟧ ⟹ Rain → Wet: as a goal it is made exactly when the requirement makes it, so
        // only a case using it as a premise reveals that its elimination rule gives back Wet outright.
        kind: 'iso',
        step: T('两个方向', 'Two directions'),
        play: 'audit',
        boards: [{ board: isoBoard(['Wet>1']) }],
        slots: [
          { given: ['Wet'], make: true, fixed: ['given', 'goal', 'make'] },
          { given: ['Rain → Wet'], keep: ['Rain → Wet'], fixed: [] },
        ],
        answer: [
          { given: ['Wet'], make: true },
          { given: ['Rain → Wet'], goal: 'Wet', make: false },
        ],
        naive: [
          { given: ['Wet'], make: true },
          { given: ['Rain → Wet'], goal: 'Rain', make: false },
        ],
        intro: [
          { t: T('检验一份声明，要从两个方向入手。<b>引入方向</b>以声明的命题为目标，检验在什么前提下可以得到它；<b>使用方向</b>把它放进前提，检验有了它之后能推出什么。引入规则决定前一个方向，由引入规则生成的消去规则决定后一个方向。', 'A declaration is checked from two directions. The <b>introduction direction</b> takes the declared statement as the goal and checks under which premises it can be obtained; the <b>use direction</b> puts it among the premises and checks what follows from it. The intro rules decide the first direction; the elimination rule generated from them decides the second.') },
          { t: T('板上的声明只要求「地湿」，就引入「下雨 → 地湿」。第 1 条条例已经写好，它从引入方向检验：结果与预期相符。事实上，从这个方向写出的任何条例，这份声明都能通过。', 'The declaration on the board introduces “it rains → the ground is wet” from “the ground is wet” alone. Case 1 is already written and checks the introduction direction: the result agrees with the expectation. In fact this declaration passes every case written from this direction.') },
        ],
        brief: T('补全第 2 条条例，从使用方向找出这份声明的错误。', 'Complete case 2 to reveal this declaration’s fault from the use direction.'),
        hint: [
          T('这份声明的消去规则是怎样的？它从「下雨 → 地湿」交还什么？', 'What is this declaration’s elimination rule? What does it give back from “it rains → the ground is wet”?'),
          T('按需求，单凭「下雨 → 地湿」，能推出什么，推不出什么？', 'According to the requirement, what follows from “it rains → the ground is wet” alone, and what does not?'),
        ],
        after: T('只从引入方向检验，这份声明找不出错误：只要已经有「地湿」，「下雨 → 地湿」确实成立。但它的消去规则直接交还「地湿」，于是单凭「下雨 → 地湿」也能推出「地湿」，不必先有「下雨」。引入规则写得不准确，问题可能只在使用时暴露，所以两个方向都要检验。', 'From the introduction direction alone this declaration shows no fault: once “the ground is wet” holds, “it rains → the ground is wet” does hold. But its elimination rule gives back “the ground is wet” outright, so “it rains → the ground is wet” alone yields “the ground is wet”, without “it rains” first. An inexact intro rule may show its fault only in use, so both directions must be checked.'),
      },
    ],
    after: T('检验条例只能找出声明的错误，证明不了声明正确。', 'Test cases can show a declaration wrong; they cannot show it right.'),
  }),
  declare({
    id: 'decl-and',
    // What declaring it gives: its way to make it and the elimination rule made from it, parts of the proof board from
    // here on.
    adds: ['andI', 'andE'],
    title: T('声明「并且」', 'Declaring “and”'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    sentences: ['Rain', 'Wind'],
    tests: [
      { given: ['Rain', 'Wind'], make: true },
      { given: ['Rain'], make: false },
      { given: ['Wind'], make: false },
      { given: [], make: false },
      { given: ['Rain ∧ Wind'], goal: 'Rain', make: true },
      { given: ['Rain ∧ Wind'], goal: 'Wind', make: true },
      { given: ['Rain ∧ Wind'], goal: 'Wet', make: false },
      { given: ['Rain ∧ Wind', 'Rain → (Wind → Wet)'], goal: 'Wet', make: true },
    ],
    intro: [
      { t: T('在<level-ref to="decl-imp"></level-ref>中，我们为证明核已经认识的「若…则…」写了声明。现在要让证明核认识新的连接词「并且」：它表示两句话都成立。', 'In <level-ref to="decl-imp"></level-ref>, we declared “if … then …”, which the kernel already knew. Now we want to introduce a new connective, “and”: both statements must hold.') },
      { t: T('声明要符合这个意思。先检验两份有错误的声明，再自己写一份。', 'A declaration must capture that meaning. First, examine two faulty declarations; then write one yourself.') },
    ],
    tasks: [
      {
        // Someone's declaration with each sentence a way of its own (too weak): wrong whichever way it is checked.
        kind: 'iso',
        step: T('过弱的声明', 'A declaration too weak'),
        play: 'audit',
        want: 'expose',
        boards: [{ board: isoBoard(['Rain>1', 'Wind>2']) }],
        slots: [
          { make: false, fixed: ['goal', 'make'] },
          { given: ['Rain ∧ Wind'], keep: ['Rain ∧ Wind'], make: true, fixed: ['make'] },
        ],
        answer: [
          { given: ['Rain'], make: false },
          { given: ['Rain ∧ Wind'], goal: 'Rain', make: true },
        ],
        naive: [
          { given: ['Rain', 'Wind'], make: false },
          { given: ['Rain ∧ Wind'], goal: 'Rain', make: true },
        ],
        intro: [
          { t: T('板上是一份别人写的「并且」声明。它的引入条件<b>过弱</b>：有些本不够证明「并且」的前提，也被它接受了。', 'The board holds someone else’s declaration of “and”. Its introduction conditions are <b>too weak</b>: it accepts premises that should not be enough to prove an “and” statement.') },
          { t: T('声明既决定何时能引入「下雨 ∧ 刮风」，也决定有了它能推出什么。请从这两个方向各写一条检验条例，找出声明的错误。', 'A declaration determines both when “it rains ∧ it is windy” can be introduced and what follows from it. Write a test case for each direction to expose the error.') },
        ],
        brief: T('编写两条检验条例，使预期符合需求，这份声明的结果都和预期不符。', 'Write two test cases whose expectations meet the requirement and with which this declaration’s results both disagree.'),
        hint: [T('这份声明的引入规则各要几样？按需求，「并且」要几样？', 'How much does each of this declaration’s intro rules need? How much does “and” need, by the requirement?')],
      },
      {
        // A declaration asking for a third proof besides the two (too strong).
        kind: 'iso',
        step: T('过强的声明', 'A declaration too strong'),
        play: 'audit',
        want: 'expose',
        boards: [{ board: isoBoard(['Rain+Wind+Wet>1']) }],
        slots: [
          { make: true, fixed: ['goal', 'make'] },
          { given: ['Rain ∧ Wind'], keep: ['Rain ∧ Wind'], make: false, fixed: ['make'] },
        ],
        answer: [
          { given: ['Rain', 'Wind'], make: true },
          { given: ['Rain ∧ Wind'], goal: 'Wet', make: false },
        ],
        naive: [
          { given: ['Rain', 'Wind', 'Wet'], make: true },
          { given: ['Rain ∧ Wind'], goal: 'Wet', make: false },
        ],
        intro: [{ t: T('板上换成了另一份「并且」声明。这次引入条件<b>过强</b>：有些本来足够证明「并且」的前提，却不能通过这份声明。请再次从引入和使用两个方向检验。', 'The board now holds another declaration of “and”. Its introduction conditions are <b>too strong</b>: premises that should be enough to prove an “and” statement are not enough under this declaration. Check both introduction and use again.') }],
        brief: T('编写两条检验条例，使预期符合需求，这份声明的结果都和预期不符。', 'Write two test cases whose expectations meet the requirement and with which this declaration’s results both disagree.'),
        hint: [T('按需求，「并且」要哪几样？这份声明的引入规则要哪几样？', 'What does “and” need, by the requirement? What does this declaration’s intro rule ask for?')],
      },
      {
        kind: 'iso',
        step: T('编写声明', 'Write the declaration'),
        intro: [{ t: T('现在请按「并且」的意思写出自己的声明。托盘里的<b>拼接</b>可以把几组前提合成一组；规则中的分号表示这些前提一起需要。', 'Now write your own declaration to capture the meaning of “and”. The tray has <b>Join</b>, which combines groups of premises into one; the semicolon in a rule means those premises are required together.') }],
        brief: T('「下雨并且刮风」只在「下雨」和「刮风」都已证出时才能引入。写出它的声明。', '“It rains and it is windy” may be introduced only when “it rains” and “it is windy” are both proved. Write its declaration.'),
        hint: [
          T('只有一条引入规则，它同时要两样。', 'There is one introduction rule, and it needs both at once.'),
          T('两张前提分别选「下雨」和「刮风」，都接进拼接，再把拼接接进引入规则 1。', 'Take two premises, “it rains” and “it is windy”, wire both into a Join, and the Join into intro rule 1.'),
        ],
      },
    ],
    solution: isoBoard(['Rain+Wind>1']),
    naive: isoBoard(['Rain>1', 'Wind>2']),
    after: T('「并且」原本不在证明核里，声明让证明核从此认得它。', '“And” was not in the kernel before; the declaration is what makes the kernel know it.'),
  }),
  declare({
    id: 'decl-or',
    adds: ['orI', 'orE'],
    title: T('声明「或者」', 'Declaring “or”'),
    declare: T('或者', 'or'),
    target: 'Sat ∨ Sun',
    sentences: ['Sat', 'Sun'],
    tests: [
      { given: ['Sat'], make: true },
      { given: ['Sun'], make: true },
      { given: ['Sat', 'Sun'], make: true },
      { given: [], make: false },
      { given: ['Sat ∨ Sun'], goal: 'Sat', make: false },
      { given: ['Sat ∨ Sun', 'Sat → Rest', 'Sun → Rest'], goal: 'Rest', make: true },
      { given: ['Sat ∨ Sun', 'Sat → Rest'], goal: 'Rest', make: false },
    ],
    intro: [{ t: T('「今天是周六，或者今天是周日」：两句中证出任何一句，就能引入，两句都证出也一样。板上这份「或者」的声明不符合这项需求：先写检验条例找出它的错误，再自己写一份。', '“Today is Saturday or today is Sunday” may be introduced once either sentence is proved, and likewise when both are. The declaration of “or” on the board does not meet it: first write test cases that find its fault, then write one yourself.') }],
    tasks: [
      {
        // Someone's declaration with a way for Saturday only.
        kind: 'iso',
        step: T('找出错误', 'Find the fault'),
        play: 'audit',
        boards: [{ board: isoBoard(['Sat>1']) }],
        slots: 1,
        caseGoal: 'Sat',
        answer: [{ given: ['Sat ∨ Sun'], goal: 'Sat', make: false }],
        naive: [{ given: ['Sat'], goal: 'Sat', make: true }],
        brief: T('目标固定为「今天是周六」。编写一条检验条例，使预期符合需求，这份声明的结果却和预期不符。', 'The goal is fixed to “today is Saturday”. Write a test case whose expectation meets the requirement but with which this declaration’s result disagrees.'),
        hint: [T('手里有「周六 ∨ 周日」时，按需求能确定今天是周六吗？', 'With “Saturday ∨ Sunday” at hand, does the requirement let you conclude it is Saturday?')],
      },
      {
        // The goal fixed to "I rest": the case must use the declaration (its elimination rule), whose only case hands
        // back Saturday.
        kind: 'iso',
        step: T('以「我休息」为目标', 'With “I rest” as the goal'),
        play: 'audit',
        boards: [{ board: isoBoard(['Sat>1']) }],
        slots: 1,
        caseGoal: 'Rest',
        answer: [{ given: ['Sat ∨ Sun', 'Sat → Rest'], goal: 'Rest', make: false }],
        naive: [{ given: ['Sat ∨ Sun', 'Sat → Rest', 'Sun → Rest'], goal: 'Rest', make: true }],
        brief: T('目标固定为「我休息」。编写一条检验条例，使这份声明的结果与预期不符。', 'The goal is fixed to “I rest”. Write a test case on which this declaration’s result disagrees with the expectation.'),
        hint: [T('目标不是「或者」本身，前提里就要有「周六 ∨ 周日」：这条条例检验的是它的消去规则。按需求，什么时候推不出「我休息」？', 'The goal is not “or” itself, so “Saturday ∨ Sunday” must be among the premises: the case tests its elimination rule. By the requirement, when does “I rest” not follow?')],
        after: T('消去规则由引入规则生成，所以检验消去规则的条例，也能找出引入规则的错误。', 'The elimination rule is made from the intro rules, so a case that tests the elimination rule can also find a fault in the intro rules.'),
      },
      {
        kind: 'iso',
        step: T('编写声明', 'Write the declaration'),
        brief: T('从空板写出「或者」的声明，使它符合需求。', 'Write the declaration of “or” from an empty board, so that it meets the requirement.'),
        hint: [T('需求包含两种互不相干的情形，每种只要一样。', 'The requirement has two separate situations, each needing one thing.')],
      },
    ],
    solution: isoBoard(['Sat>1', 'Sun>2']),
    naive: isoBoard(['Sat>1']),
    after: T('由「或者」的引入规则生成的消去规则，就是常说的<b>分情况推理</b>。', 'The elimination rule made from the intro rules of “or” is what is usually called <b>reasoning by cases</b>.'),
  }),
  declare({
    id: 'decl-bot',
    title: T('声明 ⊥', 'Declaring ⊥'),
    adds: ['botE'],
    declare: T('矛盾', 'contradiction'),
    symbols: ['⊥'],
    target: '⊥',
    sentences: ['Rain'],
    tests: [
      { given: ['Rain'], make: false },
      { given: [], make: false },
      { given: ['⊥'], goal: 'Wet', make: true },
    ],
    intro: [{ t: T('「非」还不在证明核里。本游戏把 ¬A 定义为 A → ⊥，所以先声明表示矛盾的 ⊥。', '“Not” is not in the kernel yet. This game defines ¬A as A → ⊥, so first declare ⊥, which stands for a contradiction.') }],
    brief: T('矛盾 ⊥：不管手里有什么，都证不出它。写出它的声明。', 'The contradiction ⊥: whatever is at hand, it cannot be proved. Write its declaration.'),
    hint: [T('怎样都证不出，需要几条引入规则？', 'If it can never be proved, how many introduction rules does it need?')],
    solution: isoBoard([]),
    naive: isoBoard(['Rain>1']),
    after: T('由它生成的消去规则，就是常说的<b>爆炸原理</b>：有了矛盾，什么都证得出。「非」不用另外声明：¬A 是「A → ⊥」的<wiki-ref to="definition"></wiki-ref>。', 'The elimination rule made from it is what is usually called the <b>principle of explosion</b>: from a contradiction, anything can be proved. “Not” needs no declaration of its own: ¬A is a <wiki-ref to="definition"></wiki-ref> of “A → ⊥”.'),
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
          { given: ['Rain', 'Wind', 'Wet'], make: true },
          { given: ['Rain', 'Wind'], make: false },
          { given: ['Rain', 'Wet'], make: false },
          { given: ['Wind', 'Wet'], make: false },
          { given: ['Rain ∧ (Wind ∧ Wet)'], goal: 'Wind', make: true },
          { given: ['Rain ∧ (Wind ∧ Wet)'], goal: 'Slip', make: false },
          { given: ['Rain ∧ (Wind ∧ Wet)', 'Wet → Slip'], goal: 'Slip', make: true },
        ],
        brief: T('「下雨、刮风、地湿，三样都要」：三句都已证出才能引入。写出它的声明。', '“It rains, it is windy, the ground is wet: all three”: introduced only when all three are proved. Write its declaration.'),
        hint: [T('一条引入规则能要几样？', 'How many things can one introduction rule need?')],
        solution: isoBoard(['Rain+Wind+Wet>1']),
        naive: isoBoard(['Rain+Wind>1', 'Wet>2']),
        after: T('平常写的「A ∧ B ∧ C」读作「A ∧ (B ∧ C)」，是两层「并且」，不必另外声明。', 'The usual “A ∧ B ∧ C” reads “A ∧ (B ∧ C)”, two “and”s, and needs no declaration of its own.'),
      }),
      declare({
        step: T('三选一', 'One of three'),
        declare: T('三选一', 'one of three'),
        target: 'Sat ∨ (Sun ∨ Holiday)',
        sentences: ['Sat', 'Sun', 'Holiday'],
        tests: [
          { given: ['Sat'], make: true },
          { given: ['Sun'], make: true },
          { given: ['Holiday'], make: true },
          { given: [], make: false },
          { given: ['Sat ∨ (Sun ∨ Holiday)'], goal: 'Sat', make: false },
          { given: ['Sat ∨ (Sun ∨ Holiday)', 'Sat → Rest', 'Sun → Rest', 'Holiday → Rest'], goal: 'Rest', make: true },
          { given: ['Sat ∨ (Sun ∨ Holiday)', 'Sat → Rest', 'Sun → Rest'], goal: 'Rest', make: false },
        ],
        brief: T('「今天是周六、周日，或者放假」：三句中证出任何一句就能引入。写出它的声明。', '“Today is Saturday, Sunday, or a holiday”: introduced once any one of the three is proved. Write its declaration.'),
        hint: [T('三种情形互不相干，每种只要一样。', 'Three separate situations, each needing one thing.')],
        solution: isoBoard(['Sat>1', 'Sun>2', 'Holiday>3']),
        naive: isoBoard(['Sat>1', 'Sun>2']),
      }),
    ],
    intro: [{ t: T('「并且」「或者」都只连接两句话。这一关换成三句。', '“And” and “or” each join two sentences. Here there are three.') }],
  },
  declare({
    id: 'decl-order',
    title: T('换个顺序', 'The other order'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    sentences: ['Rain', 'Wind'],
    ways: [['Wind', 'Rain']],
    tests: [
      { given: ['Rain', 'Wind'], make: true },
      { given: ['Rain'], make: false },
      { given: ['Wind'], make: false },
      { given: ['Rain ∧ Wind'], goal: 'Rain', make: true },
      { given: ['Rain ∧ Wind'], goal: 'Wet', make: false },
    ],
    intro: [{ t: T('<level-ref to="decl-and"></level-ref>里的「并且」先要「下雨」、再要「刮风」。反过来写行不行？检验条例分得出来吗？', 'The “and” of <level-ref to="decl-and"></level-ref> takes “it rains” first, then “it is windy”. Would the other order do? Can test cases tell?') }],
    brief: T('写一个先要「刮风」、再要「下雨」的「并且」。', 'Write an “and” that takes “it is windy” first, then “it rains”.'),
    hint: [T('拼接的前提有先后。', 'The premises of a Join come in order.')],
    solution: isoBoard(['Wind+Rain>1']),
    naive: isoBoard(['Rain+Wind>1']),
    after: T('检验条例只看推得出什么，看不出规则的写法；证明核却只认写下来的那一条。', 'Test cases see only what can be derived, not how a rule is written; the kernel keeps to the rule written down.'),
  }),
  declare({
    id: 'decl-two',
    title: T('至少两样', 'At least two'),
    declare: T('提案通过', 'the motion passes'),
    target: 'Motion',
    sentences: ['AnnYes', 'BoYes', 'CyYes'],
    tests: [
      { given: ['AnnYes', 'BoYes'], make: true },
      { given: ['BoYes', 'CyYes'], make: true },
      { given: ['AnnYes', 'CyYes'], make: true },
      { given: ['AnnYes', 'BoYes', 'CyYes'], make: true },
      { given: ['AnnYes'], make: false },
      { given: ['CyYes'], make: false },
      { given: ['Motion'], goal: 'AnnYes', make: false },
      { given: ['Motion', 'AnnYes → Happy', 'BoYes → Happy'], goal: 'Happy', make: true },
      { given: ['Motion', 'AnnYes → Happy'], goal: 'Happy', make: false },
    ],
    intro: [{ t: T('声明的不一定是连接词：一件事有哪几种成立的方式，说得清楚，就能声明。', 'What is declared need not be a connective: whatever holds in ways that can be spelled out can be declared.') }],
    brief: T('安、博、赛三人投票，至少两人同意，提案就通过。写出「提案通过」的声明。', 'Ann, Bo and Cy vote; with at least two agreeing, the motion passes. Write the declaration of “the motion passes”.'),
    hint: [T('两人同意有几种组合？', 'How many pairs can agree?'), T('同一句话可以出现在几张前提上。', 'One sentence may be on several premise cards.')],
    solution: isoBoard(['a1+b1>1', 'b2+c2>2', 'a3+c3>3'], VOTE),
    naive: isoBoard(['a1+b1>1', 'b2+c2>2'], VOTE),
    after: T('「恰好一人同意」却写不成声明：引入规则只能说有了什么就造得出，说不了有了什么就造不出。', '“Exactly one agrees” cannot be declared, though: an introduction rule can say what makes a sentence, never what stops it.'),
  }),
  declare({
    id: 'decl-true',
    title: T('声明「真」', 'Declaring True'),
    declare: T('真', 'True'),
    target: 'Truth',
    sentences: ['Rain'],
    tray: ['hyp', 'none'],
    tests: [
      { given: [], make: true },
      { given: ['Rain'], make: true },
      { given: ['Truth'], goal: 'Moon', make: false },
      { given: ['Truth', 'Rain', 'Rain → Wet'], goal: 'Wet', make: true },
    ],
    intro: [{ t: T('反过来，一句什么都不要、总证得出的话，该怎么声明？托盘里新添了「无前提」。', 'The other way round from ⊥: how is a sentence declared that needs nothing and is always proved? The tray now has “no premise”.') }],
    brief: T('「真」：不管手里有什么，甚至什么都没有，都证得出。写出它的声明。', 'True: proved whatever is at hand, even with nothing at all. Write its declaration.'),
    hint: [T('它需要几条引入规则，每条要几样？', 'How many introduction rules does it need, and how much does each need?')],
    solution: isoBoard(['∅>1']),
    naive: isoBoard(['Rain>1']),
    after: T('「真」常写作 ⊤，和 ⊥ 正好相对：知道它成立，并没有多知道什么。', 'True is often written ⊤, the very opposite of ⊥: knowing it holds tells you nothing more.'),
  }),
  declare({
    id: 'decl-iff',
    title: T('声明「当且仅当」', 'Declaring “if and only if”'),
    declare: T('当且仅当', 'if and only if'),
    target: 'Rain ↔ Wet',
    sentences: ['Rain → Wet', 'Wet → Rain'],
    tray: ['hyp', 'none'],
    tests: [
      { given: ['Rain → Wet', 'Wet → Rain'], make: true },
      { given: ['Rain → Wet'], make: false },
      { given: ['Wet → Rain'], make: false },
      { given: [], make: false },
      { given: ['Rain ↔ Wet'], goal: 'Rain → Wet', make: true },
      { given: ['Rain ↔ Wet', 'Wet'], goal: 'Rain', make: true },
      { given: ['Rain ↔ Wet'], goal: 'Rain', make: false },
    ],
    intro: [{ t: T('前提不必是一个字母，也可以是含 → 的句子。', 'A premise need not be a single letter; it can be a sentence with → in it.') }],
    brief: T('「下雨当且仅当地湿」：两个方向的「若…则…」都在手里才证得出。写出它的声明。', '“It rains if and only if the ground is wet”: proved only with both “if … then …”s at hand. Write its declaration.'),
    hint: [T('需求要的两样，是同时都要，还是有一样就够？', 'Does the requirement need both at once, or is either enough?')],
    solution: isoBoard(['f+g>1'], IFF),
    naive: isoBoard(['f>1', 'g>2'], IFF),
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
      { given: ['Human(soc)'], make: true },
      { given: ['Human(ann)'], make: true },
      { given: ['Mortal(soc)'], make: false },
      { given: [], make: false },
      { given: ['∃y. Human(y)'], goal: 'Human(soc)', make: false },
      { given: ['∃y. Human(y)', '∀x. Human(x) → Mortal(x)'], goal: '∃y. Mortal(y)', make: true },
      { given: ['∃y. Human(y)', '∀x. Human(x) → Mortal(x)'], goal: 'Mortal(soc)', make: false },
    ],
    intro: [
      { t: T('「对所有」不用声明：任取一样东西证出来，就是对所有东西证出来，证明核本来就会。「存在」不同：「∃y. y是人」要有某一样东西，再有它是人的证明，比如「苏格拉底是人」。', '“For all” needs no declaration: proved for any thing taken, it is proved for all, and the kernel can already do that. “There is” is different: “∃y. y is human” needs some thing and a proof that it is human, such as “Socrates is human”.') },
      { t: T('托盘里新添了「任取一样东西」：它取一样东西，叫它 x；拼在它后面的前提可以提到 x。', 'The tray now has “any thing”: it takes a thing and calls it x; premises joined after it may mention x.') },
    ],
    brief: T('「存在一个人」：手里有某一样东西是人的证明，就能引入。写出它的声明。', '“There is a human”: introduced with a proof that some thing is human. Write its declaration.'),
    hint: [T('引入规则要两样：一样东西，和关于它的一句话。', 'The introduction rule needs two things: a thing, and a sentence about it.'), T('先取一样东西，再拼上一张前提「x是人」。', 'Take a thing first, then join a premise “x is human”.')],
    solution: isoBoard(['⋀x+h>1'], { h: 'Human(x)' }),
    naive: isoBoard(['h>1'], { h: 'Human(x)' }),
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
      { given: [], goal: 'phos = phos', make: true },
      { given: [], goal: 'hesp = hesp', make: true },
      { given: [], goal: 'phos = hesp', make: false },
    ],
    take: { premises: ['?a = ?b', '?P(?a)'], conclusion: '?P(?b)' },
    intro: [{ t: T('晨星和昏星是不是同一颗星？要说两样东西相等，先要声明相等。', 'Are the Morning Star and the Evening Star one star? To say two things are equal, equality has to be declared first.') }],
    brief: T('相等：任何东西都等于它自己；凭空证不出两个不同名字相等。写出它的声明。', 'Equality: everything equals itself; two different names cannot be proved equal from nothing. Write its declaration.'),
    hint: [T('凭空证得出的「s = t」，两边有什么共同之处？', 'What do the two sides of an “s = t” proved from nothing have in common?')],
    solution: isoBoard(['⋀a>1']),
    naive: isoBoard(['∅>1']),
    after: T('这条引入规则就是<b>自反律</b>；相等的消去规则是<b>等量代换</b>。', 'This introduction rule is <b>reflexivity</b>; the elimination rule of equality is <b>substitution</b>.'),
  }),
]

// Chapter 3, an optional branch beside the declarations · The elimination rule generator: the step that makes every
// declaration's elimination rule, built by hand on a machine board whose wires carry rules (elimgen.js). Two levels
// with little help: one way in, which builds the part, then a list of them, its first upgrade on the same board; the
// tests are the declarations met so far, and a hidden one of a new proposition, so passing shows the generator works
// for any declaration of those shapes. Every later generator level upgrades the part on the board it runs then
// (games/DESIGN.md): chapter 6's ways that take things first (gen-ex), and what it cannot do yet (the induction
// hypothesis, an indexed family) in optional levels too, never on the main path.
export const generators = [
  generator({
    id: 'gen-one',
    single: true,
    builds: 'elimGen',
    title: T('拆开它', 'Taking it apart'),
    // The parts that take rules apart and put them together.
    adds: RULECRAFT,
    tests: [DECLS.and, DECLS.three, DECLS.iff, DECLS.truth],
    intro: [
      { t: T('每声明一样东西，证明核都由它的引入规则生成<wiki-ref to="elim-rule"></wiki-ref>。这条支线把证明核里做这一步的部分亲手搭出来。', 'Each time something is declared, the kernel makes its <wiki-ref to="elim-rule"></wiki-ref> from the ways in. This branch builds that part of the kernel by hand.') },
      { t: T('这块板上，线上传的是规则本身。两个输入：声明的那句话（字母换成了 ?A、?B，生成的规则要对任何句子都成立），和它的<wiki-ref to="intro-rule"></wiki-ref>。托盘里的元件把规则拆开、拼起来。每组测试是一份只有一条引入规则的声明，和要生成的消去规则。', 'On this board the wires carry rules themselves. Two inputs: the declared sentence (its letters turned into ?A and ?B, since the rule made must hold for any sentences) and its <wiki-ref to="intro-rule"></wiki-ref>. The parts in the tray take rules apart and put them together. Each test is a declaration with one way in, and the elimination rule to make.') },
    ],
    brief: T('设计一个证明助手：由只有一条引入规则的声明，生成它的消去规则。', 'Design a proof assistant that makes the elimination rule of a declaration with one introduction rule.'),
    hint: [T('比一比引入规则和要生成的消去规则：哪一部分原样搬过去了，哪一部分换掉了？', 'Compare the way in with the elimination rule to make: which part carries over as it is, and which is replaced?')],
    solution: machine({ r: ['anyR'], s: ['swapConcl'], c: ['consFront'], m: ['mkRule'] }, ['ways>s.rule', 'r>s.to', 'it>c.first', 's>c.rest', 'c>m.premises', 'r>m.conclusion', 'm>out'], { inputs: ['it', 'ways'] }),
  }),
  generator({
    id: 'gen-each',
    title: T('每一条', 'One for each'),
    builds: 'elimGen',
    adds: [...RULECRAFT, 'eachOf'],
    tests: [DECLS.and, DECLS.or, DECLS.three, DECLS.oneOfThree, DECLS.iff, DECLS.truth, DECLS.bot],
    // A shape not met yet: a new proposition of three ways.
    hidden: [DECLS.two],
    intro: [{ t: T('板上是你在<level-ref to="gen-one"></level-ref>搭的生成器，在它上面改。这一次输入的引入规则是一串，有几条都行，一条都没有也行。新元件「逐项处理」是一个框：对一串里的每一项各执行一遍，框里输出的东西排成新的一串。', 'The board holds the generator you built in <level-ref to="gen-one"></level-ref>; change it there. This time the intro rules come as a list, of any length, even empty. The new part For each is a frame: it runs once on each item of a list, and what it outputs inside forms a new list.') }],
    brief: T('设计一个证明助手：由一份声明的一串引入规则，生成它的消去规则。', 'Design a proof assistant that makes a declaration’s elimination rule from its list of intro rules.'),
    hint: [T('一串引入规则和要生成的消去规则，各有几项？', 'How many items does the list of intro rules have, and how many the elimination rule to make?')],
    solution: GENERATOR,
    after: T('<part-ref to="lemma:elimGen"></part-ref>现在跑的是这块电路。Lean 的内核也这样由一个类型的各个构造子生成它的<wiki-ref to="recursor"></wiki-ref>，所以不让人手写消去规则。', 'The <part-ref to="lemma:elimGen"></part-ref> now runs this board. Lean’s kernel likewise makes a type’s <wiki-ref to="recursor"></wiki-ref> from its constructors, which is why it never lets you write an elimination rule.'),
  }),
  generator({
    id: 'gen-ex',
    title: T('生成器遇上任取', 'The generator meets “any”'),
    builds: 'elimGen',
    adds: [...RULECRAFT, 'eachOf', 'keepBound'],
    tests: [DECLS.and, DECLS.or, DECLS.bot, DECLS.iff, DECLS.ex],
    // A way that binds two variables.
    hidden: [DECLS.exTwo],
    intro: [
      { t: T('板上是你当前的<part-ref to="lemma:elimGen"></part-ref>。<level-ref to="decl-ex"></level-ref>的引入规则 ⋀x. ⟦?P(x)⟧ ⟹ ∃y. ?P(y) 先任取一样东西 x：在生成器里，它是约束了 x 的规则，不是一条普通的规则，「替换结论」不接受它。', 'The board holds your <part-ref to="lemma:elimGen"></part-ref> as it is now. The intro rule of <level-ref to="decl-ex"></level-ref>, ⋀x. ⟦?P(x)⟧ ⟹ ∃y. ?P(y), first takes any thing x: in the generator it is a rule binding x, not a plain rule, and Swap conclusion does not accept it.') },
      { t: T('新元件「保留⋀」是一个框：规则以约束变量开头时，框里处理其后的规则，输出时在前面放回同样的约束变量；没有约束变量时，框里直接处理输入。', 'The new part Keep ⋀ is a frame: when a rule begins with bound variables, the frame works on the rule after them and puts the same bound variables back in front of its output; when there are none, the frame works on the input itself.') },
    ],
    brief: T('升级消去规则生成器，使引入规则带约束变量时也能生成消去规则。', 'Upgrade the elimination rule generator so that it also works when an intro rule has bound variables.'),
    hint: [T('比一比「存在」的引入规则和要生成的那种情况：哪一部分没有变？', 'Compare the intro rule of “there is” with the case to make: which part stays the same?')],
    solution: GENERATOR_ANY,
    naive: GENERATOR,
    after: T('<part-ref to="part:exE"></part-ref>要给那样东西起一个新名字，原因就在这里。', 'This is why <part-ref to="part:exE"></part-ref> gives that thing a new name.'),
  }),
]

// Chapter 12 · Types are declared on the same board: a way is a constructor, an assumption of the type itself its
// argument of that type, a thing card an element (`datatype`, iso.js typeOf). Passing one puts the type in the course
// (course.js); the rules the kernel makes of it (cases, induction, the constructors all different) show when it is
// passed, and what makes them so is said there.
const TYPE = (level) => declare({ words: TERM_WORDS, ...level })
export const typeDeclarations = [
  TYPE({
    id: 'decl-nat',
    title: T('声明自然数', 'Declaring the numbers'),
    declare: T('自然数', 'a number'),
    target: 'Nat',
    sentences: ['Nat'],
    tray: ['hyp', 'none'],
    datatype: { type: 'nat', ctors: ['zero', 's'], args: { Nat: 'nat' } },
    tests: [
      { given: [], make: true },
      { given: ['Nat'], make: true, uses: ['Nat'] },
    ],
    intro: [
      { t: T('自动证明器在一堆句子里找矛盾，却多半不会归纳；化简器能改写，可「1 + 1 = 2」怎么证？数从哪里来？这一章从头构造数和列表，规则书里的每一条都由你声明。', 'An automatic prover hunts for a contradiction among sentences, yet mostly cannot do induction; Simp rewrites, but how is “1 + 1 = 2” proved? Where do numbers come from? This chapter builds numbers and lists from the start, and you declare every rule in the book.') },
      { t: T('数也靠声明。这一次声明的是一种东西，它的引入规则叫<wiki-ref to="constructor"></wiki-ref>：每条造出一个数。', 'Numbers too come from a declaration. This time what is declared is a kind of thing, and its introduction rules are called <wiki-ref to="constructor"></wiki-ref>s: each makes a number.') },
    ],
    brief: T('自然数：什么都没有，也造得出一个（0）；有了一个数，就造得出它的下一个。写出它的声明。', 'A number: one can be made from nothing (0); given a number, the next one can be made. Write its declaration.'),
    hint: [T('需求说了两种造法。', 'The requirement names two ways to make one.'), T('第二种造法要的前提，正是一个数。', 'The premise of the second way is a number itself.')],
    solution: isoBoard(['∅>1', 'Nat>2']),
    naive: isoBoard(['∅>1']),
    after: T('这样声明出来的类型叫<wiki-ref to="inductive"></wiki-ref>。证明核由它生成三样规则：按情况分、归纳、构造子互不相同。', 'A type declared this way is an <wiki-ref to="inductive"></wiki-ref>. The kernel makes three kinds of rule from it: cases, induction, and the constructors all being different.'),
  }),
  TYPE({
    id: 'decl-list',
    title: T('声明列表', 'Declaring lists'),
    declare: T('列表', 'a list'),
    target: 'List',
    sentences: ['List'],
    things: ['ann', 'bo'],
    tray: ['thing', 'hyp', 'none'],
    datatype: { type: 'list', ctors: ['nil', 'cons'], args: { List: 'list' } },
    ways: [[], ['⋀x', 'List']],
    tests: [
      { given: [], make: true },
      { given: ['List'], make: true, uses: ['List'] },
    ],
    intro: [{ t: T('列表是一串东西：空的 []，或者在一个列表前面再放一样东西，写作 x :: xs。', 'A list is a row of things: the empty one [], or a thing put in front of a list, written x :: xs.') }],
    brief: T('列表：什么都没有，也造得出一个（空列表）；任取一样东西，再有一个列表，就造得出把它放在前面的列表。写出它的声明。', 'A list: one can be made from nothing (the empty list); taking any thing and a list, the list with that thing in front can be made. Write its declaration.'),
    hint: [T('第二种造法要两样：一样东西，和一个列表。', 'The second way needs two things: a thing, and a list.')],
    solution: isoBoard(['∅>1', '⋀x+l>2'], { l: 'List' }),
    naive: isoBoard(['∅>1', 'l>2'], { l: 'List' }),
  }),
  TYPE({
    id: 'decl-bool',
    title: T('声明真假', 'Declaring true and false'),
    declare: T('真假值', 'a truth value'),
    target: 'Bool',
    sentences: ['Bool'],
    tray: ['none'],
    datatype: { type: 'bool', ctors: ['tt', 'ff'], args: {} },
    ways: [[], []],
    tests: [{ given: [], make: true }],
    intro: [{ t: T('比大小的结果不是一句话，而是一个值：真或者假。它们也是声明出来的一种东西。', 'The result of a comparison is not a sentence but a value: true or false. They too are a kind of thing that is declared.') }],
    brief: T('真假值：真什么都不要，假也什么都不要，是两样不同的东西。写出它的声明。', 'A truth value: true needs nothing, false needs nothing, and they are two different things. Write its declaration.'),
    hint: [T('真和假各要几样？', 'How much does each of true and false need?')],
    solution: isoBoard(['∅1>1', '∅2>2']),
    naive: isoBoard(['∅1>1']),
    after: T('程序里的每一个「如果」，在证明里就是对真假值分一次情况。', 'Every “if” in a program is, in a proof, a split into cases on a truth value.'),
  }),
  // Optional, for whoever built the generator: what it makes of the numbers, cases with no induction hypothesis.
  generator({
    id: 'gen-nat',
    title: T('生成器遇上自然数', 'The generator meets the numbers'),
    tests: [DECLS.nat],
    intro: [{ t: T('把自然数的声明交给<part-ref to="lemma:elimGen"></part-ref>，看它生成什么，再和声明给出的归纳法比一比。', 'Hand the declaration of the numbers to the <part-ref to="lemma:elimGen"></part-ref>, see what it makes, and compare it with the induction the declaration gives.') }],
    brief: T('设计一个证明助手：生成自然数的消去规则。', 'Design a proof assistant that makes the elimination rule of the numbers.'),
    hint: [T('生成器已经在元件箱里。', 'The generator is already in the parts box.')],
    solution: machine({ g: ['elimGen'] }, ['it>g.it', 'ways>g.ways', 'g>out'], { inputs: ['it', 'ways'] }),
    after: T('生成器给出的只是按情况分，少了归纳假设：要生成归纳规则，得先认出哪条引入规则要的正是声明的那种东西。', 'The generator gives only cases, without the induction hypothesis: to make the induction rule, it must first see which introduction rule takes the very kind of thing being declared.'),
  }),
]
