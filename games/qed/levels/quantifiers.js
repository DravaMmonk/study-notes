// Chapter 5 · The language of quantifiers and counterexamples: what first-order sentences say and when they are true,
// before any proof. Each quantifier is one level: a sentence built as a formula, then someone's formula for it found
// out wrong by a world (what nitpick looks for); a piece of reasoning written as one sentence, then refuted the same
// way. Puzzles that split a quantifier where it may not are optional; the family topic asks a world questions.

const T = (zh, en) => ({ zh, en })
const consts = ["h", "i", "j", "k", "l", "m", "n"]

// Two families, for the queries: who is whose parent, and who goes to school.
const FAMILY_ONE = {
  title: T('第一家', 'The first family'),
  things: ["i", "j", "k", "l", "m"],
  preds: { Parent: [["i", "j"], ["i", "k"], ["j", "l"], ["k", "m"]], School: ["l"] },
}
const FAMILY_TWO = {
  title: T('第二家', 'The second family'),
  things: ["i", "j", "k", "l", "m", "n"],
  preds: { Parent: [["j", "i"], ["i", "k"], ["i", "l"], ["k", "m"], ["l", "n"]], School: ["k", "l", "m", "n"] },
}
export const families = [FAMILY_ONE, FAMILY_TWO]
const query = (level) => ({ kind: 'query', consts, worlds: families, ...level })
// A translation level: one sentence per task, each built from the same chips (every sentence's words, and the decoys).
const STEPS = [T('第一句', 'Sentence 1'), T('第二句', 'Sentence 2'), T('第三句', 'Sentence 3')]
const sentences = (list, decoys = []) => list.map((task, k) => ({ kind: 'translate', step: STEPS[k], decoys: [...list.filter((_, j) => j !== k).map((t) => t.target), ...decoys], ...task }))
const BRIEF = T('用下面的元件，把这句话拼成公式。', 'Build this sentence as a formula from the parts below.')
// A quantifier said, then found out: first build sentences as formulas (`translate`: { say, target, hint, step? }
// each), then show with a world (what nitpick looks for) that someone's formula for the first is wrong (`wrong`,
// against the one built) or that a piece of reasoning does not follow (`given`, `goal`): each of `counters` a task,
// with the first sentence over it (or its own `say`). Every sentence and wrong formula of the level is among the
// chips of each translation.
const COUNTER = T('造反例', 'Counterexample')
const COUNTER_BRIEF = {
  translation: T('上一段你把这句话拼成了公式；这是别人拼的。造一个世界，让两份译文真假不同。', 'You built this sentence as a formula; this is someone else’s. Build a world where the two differ in truth.'),
  lemma: T('这段推理写成了引理。造一个反例：前提都成立，结论不成立。', 'The reasoning is written as a lemma. Build a counterexample: every premise holds and the goal fails.'),
}
const TRANSLATE = T('翻译', 'Translate')
const world = ({ translate, counters, ...level }) => {
  const formulas = [...translate.map((t) => t.target), ...counters.flatMap((c) => (c.wrong ? [c.wrong] : []))]
  return {
    consts,
    ...level,
    tasks: [
      ...translate.map((t, k) => ({ kind: 'translate', step: translate.length > 1 ? STEPS[k] : TRANSLATE, brief: BRIEF, ...t, decoys: [...formulas.filter((f) => f !== t.target), ...(t.decoys ?? [])] })),
      ...counters.map((c) => ({ kind: 'model', step: COUNTER, say: translate[0].say, ...(c.wrong ? { meant: translate[0].target, brief: COUNTER_BRIEF.translation } : { brief: COUNTER_BRIEF.lemma }), ...c })),
    ],
  }
}
// The first counterexample on either line says what a world is (the entry links only where it opens, at 对所有).
const worldIntro = (linked) => [
  { t: T(`命题逻辑里，一句话的真假看真值表的哪一行。一阶逻辑里，看的是${linked ? '<wiki-ref to="world"></wiki-ref>' : '世界'}：世界里有几样东西，每样东西是什么、和别的东西是什么关系。`, `In propositional logic, whether a sentence is true depends on the row of the truth table. In first-order logic it depends on the ${linked ? '<wiki-ref to="world"></wiki-ref>' : 'world'}: how many things there are, what each is and how they relate.`) },
  { t: T('上方是你的译文，和别人的译文。要说明别人的错了，就造一个世界，让两份译文一真一假：在下面选好有几样东西，再点出每样东西有哪些性质。运行时，上方标出两份译文在这个世界里的真假。', 'Above are your translation and someone else’s. To show theirs is wrong, build a world where the two differ: choose below how many things there are, then tap what holds of each. A run marks above whether each translation is true in this world.') },
]

export const quantifiers = [
  {
    id: 'fo-atoms',
    consts,
    title: T('翻译句子', 'Translating a sentence'),
    tasks: sentences([
      {
        say: T("i是j的父母，j却不喜欢i。", "i is a parent of j, yet j does not like i."),
        target: "Parent(i, j) ∧ ¬Likes(j, i)",
        hint: [
          T('「却」「但是」「而且」在逻辑里都是「并且」∧：两半句都成立。', '“Yet”, “but” and “and” are all ∧ in logic: both halves hold.'),
          T('「①是②的父母」里，谁是 ①、谁是 ②？¬ 只管后半句。', 'In “① is a parent of ②”, who is ①, who is ②? The ¬ covers only the second half.'),
        ],
      },
      {
        say: T("h不是鸟就是人。", "h is either a bird or human."),
        target: "Bird(h) ∨ Human(h)",
        hint: [T('「不是……就是……」里没有「并非」：它说的是两样里至少有一样，用「或者」∨。', '“Either … or …” has no “not” in it: at least one of the two holds, so it is ∨.')],
      },
      {
        say: T("只有j是人，i才喜欢j。", "i likes j only if j is human."),
        target: "Likes(i, j) → Human(j)",
        hint: [T('「只有 A，才 B」说的是：B 成立，A 就一定成立。条件是后半句。', '“Only if A, B” says: if B holds, A must hold. The condition is the second half.')],
      },
    ], ["Mortal(h)"]),
    brief: BRIEF,
    intro: [
      { t: T('命题逻辑里，一个字母代表一整句话：要说每个人会不会死，每人就得用一个字母；「每个人」「有一个人」根本说不出来。', 'In propositional logic a letter stands for a whole sentence: saying whether each person is mortal takes a letter per person, and “everyone” or “someone” cannot be said at all.') },
      { t: T("<wiki-ref to=\"fol\"></wiki-ref>把句子拆开：<b>名字</b>指一样东西，<wiki-ref to=\"predicate\"></wiki-ref>说一样东西是什么，或几样东西之间是什么关系。「h是人」写作 Human(h)，「i喜欢j」写作 Likes(i, j)，位置的顺序有意义。", "<wiki-ref to=\"fol\"></wiki-ref> takes sentences apart: a <b>name</b> stands for a thing, and a <wiki-ref to=\"predicate\"></wiki-ref> says what a thing is or how things relate. “h is human” is written Human(h), “i likes j” Likes(i, j): the order of the places matters.") },
      { t: T('翻译一句话，先找出它的骨架：连接词常常藏在说法里，「却」是「并且」，「不是……就是……」是「或者」，「只有……才……」是「若……则……」，但条件在后面。这一章先不证明，只学怎样说一句话，怎样判断它在一个世界里的真假。', 'To translate a sentence, find its frame first: the connectives often hide in the wording, “yet” is “and”, “either … or …” is “or”, “only if” is “if … then …” with the condition at the end. No proofs in this chapter yet: first how to say a sentence, and how to tell whether it is true in a world.') },
    ],
  },
  world({
    id: 'fo-all',
    symbols: ['∀'],
    title: T('对所有 ∀', 'For all ∀'),
    translate: [{
      say: T('人都会死。', 'Every human is mortal.'),
      target: '∀x. Human(x) → Mortal(x)',
      hint: [
        T('「人都会死」：对每一样东西 x，如果 x 是人，那么 x 会死。', '“Every human is mortal”: for every thing x, if x is human then x is mortal.'),
        T('写成「x 是人 ∧ x 会死」，说的是世上每一样东西都是人。', 'Writing “x is human ∧ x is mortal” says every thing in the world is human.'),
      ],
    }],
    counters: [
      {
        step: T('用了「并且」', 'With “and”'),
        wrong: '∀x. Human(x) ∧ Mortal(x)',
        answer: { size: 1, preds: {} },
        hint: [T('点一样东西，它就「是人」；再点一下，就不是。', 'Tap a thing to make it human; tap again to undo.'), T('这份译文说每样东西都怎样？世界里有一样不是人的东西呢？', 'What does this translation say of every thing? What if the world holds a thing that is not human?')],
        intro: worldIntro(true),
      },
      {
        step: T('条件写反了', 'The condition reversed'),
        wrong: '∀x. Mortal(x) → Human(x)',
        answer: { size: 1, preds: { Human: ['0'] } },
        hint: [T('一个不会死的人。', 'A human who is not mortal.')],
      },
    ],
    intro: [
      { t: T('全称<wiki-ref to="quantifier"></wiki-ref> <b>∀</b> 读作「对所有」：∀x. P(x) 说的是，世上每一样东西 x 都满足 P。', 'The universal <wiki-ref to="quantifier"></wiki-ref> <b>∀</b> reads “for all”: ∀x. P(x) says every thing x in the world satisfies P.') },
      { t: T('先把一句话拼成公式；拼错时，检查器可能给出一个小世界：在那里，你拼的公式和目标真假不同。之后，别人也译了这句话，轮到你用一个世界说明他译错了。', 'First build a sentence as a formula; when it is wrong, the checker may show a small world where it and the target differ. Then someone else has translated the sentence too, and it is your turn to show with a world that they got it wrong.') },
    ],
    after: T('一句话永远成立，是说它在所有世界里都真；世界有无穷多个，大小不限。', 'A sentence that always holds is true in every world, and there are infinitely many worlds, of any size.'),
  }),
  world({
    id: 'm-counter',
    title: T('推不出', 'Does not follow'),
    translate: [{
      say: T("要是人都会死，h又会死，那h就是人。", "If every human is mortal and h is mortal, then h is human."),
      target: "(∀x. Human(x) → Mortal(x)) ∧ Mortal(h) → Human(h)",
      hint: [T('最外面是「如果……那么……」；条件是两句用「并且」连起来，第一句是一整句 ∀。', 'The outermost piece is “if … then …”; the condition is two sentences joined by “and”, the first a whole ∀ sentence.')],
    }],
    counters: [{
      given: ['∀x. Human(x) → Mortal(x)', "Mortal(h)"],
      goal: "Human(h)",
      answer: { size: 1, preds: { Mortal: ['0'] }, consts: { h: 0 } },
      hint: [T("h也可以是一条会死的狗。", "h could be a mortal dog.")],
      intro: [
        { t: T('上方是这段推理写成的引理：横线上是前提，横线下是结论，它说前提都成立时，结论也成立。造一个前提都成立、结论不成立的世界，就说明它推错了。', 'Above is the reasoning written as a lemma: the premises over the line, the goal under it; it says the goal holds whenever the premises do. A world where the premises hold and the goal fails shows it is wrong.') },
        { t: T("名字也要在世界里指一样东西：选好「h」是哪一样。", "A name must stand for a thing in the world too: choose which thing is h.") },
      ],
    }],
    intro: [{ t: T('一段推理也能写成一句话：前提用「并且」连起来，作为「如果……那么……」的条件。', 'A piece of reasoning can be written as one sentence too: the premises joined by “and”, as the condition of an “if … then …”.') }],
    after: T('前提都真、结论为假的世界，叫<wiki-ref to="countermodel"></wiki-ref>。', 'A world where the premises hold and the conclusion fails is a <wiki-ref to="countermodel"></wiki-ref>.'),
  }),
  world({
    id: 'fo-some',
    symbols: ['∃'],
    title: T('存在 ∃', 'There exists ∃'),
    translate: [{
      say: T('有会飞的鸟。', 'Some bird flies.'),
      target: '∃x. Bird(x) ∧ Flies(x)',
      hint: [
        T('「有会飞的鸟」：有一样东西 x，x 是鸟，并且 x 会飞。', '“Some bird flies”: there is a thing x that is a bird and flies.'),
        T('写成「x 是鸟 → x 会飞」，只要世上有一样不是鸟的东西，这句就成立了。', 'Writing “x is a bird → x flies” is made true by anything at all that is not a bird.'),
      ],
    }],
    counters: [{
      step: T('一个也没有', 'Not a single one'),
      wrong: '∃x. Bird(x) → Flies(x)',
      answer: { size: 1, preds: {} },
      hint: [T('世界里要是一只鸟也没有呢？', 'What if the world holds no bird at all?')],
      intro: worldIntro(false),
    }],
    intro: [
      { t: T('新符号 <b>∃</b> 读作「存在」：∃x. P(x) 说的是，世上至少有一样东西 x 满足 P。', 'A new symbol, <b>∃</b>, reads “there exists”: ∃x. P(x) says at least one thing x in the world satisfies P.') },
      { t: T('先把一句话拼成公式；拼错时，检查器可能给出一个小世界：在那里，你拼的公式和目标真假不同。之后，别人也译了这句话，轮到你用一个世界说明他译错了。', 'First build a sentence as a formula; when it is wrong, the checker may show a small world where it and the target differ. Then someone else has translated the sentence too, and it is your turn to show with a world that they got it wrong.') },
    ],
  }),
  world({
    id: 'fo-nested',
    title: T('量词套量词', 'One inside another'),
    translate: [
      { say: T('每样东西都喜欢某样东西。', 'Everything likes something.'), target: '∀x. ∃y. Likes(x, y)', hint: [T('外面是对所有 x，里面是有一个 y：x 喜欢的那样东西，另用一个变量。', 'Outside, every x; inside, some y: the thing x likes takes another variable.')] },
      { say: T('每个人都有父母。', 'Everyone has a parent.'), target: '∀x. Human(x) → ∃y. Parent(y, x)', hint: [T('对所有 x，若 x 是人，则有一个 y 是 x 的父母。', 'For every x, if x is human, then some y is a parent of x.')] },
    ],
    counters: [{
      step: T('先说谁', 'Which comes first'),
      wrong: '∃y. ∀x. Likes(x, y)',
      answer: { size: 2, preds: { Likes: ['0,0', '1,1'] } },
      hint: [
        T('把它想成一个游戏：∀ 由对手挑，∃ 由你挑。第一句是对手先挑 x，你再挑 y；第二句是你先挑 y，对手再挑 x。', 'Think of it as a game: the opponent picks for ∀, you pick for ∃. In the first, the opponent picks x first, then you pick y; in the second you pick y first, then the opponent picks x.'),
        T('每样东西各喜欢自己就行。', 'Let each thing like itself.'),
      ],
    }],
    intro: [{ t: T('量词里面还可以有量词。每个量词有自己的变量，管到它后面的整段：∀x. … ∃y. … 里，x 和 y 各指各的。量词管着的变量是<wiki-ref to="bound"></wiki-ref>；没有量词管着的是<wiki-ref to="free"></wiki-ref>，句子就说不清在讲谁。', 'A quantifier may hold another. Each has its own variable and reaches over everything after it: in ∀x. … ∃y. …, x and y each stand for their own thing. A variable some quantifier covers is a <wiki-ref to="bound"></wiki-ref>; one no quantifier covers is a <wiki-ref to="free"></wiki-ref>, and then the sentence does not say whom it means.') }],
  }),
  {
    id: 'p-only',
    consts,
    title: T('「只有」和「没有」', '“Only” and “none”'),
    tasks: sentences([
      { say: T('只有鸟会飞。', 'Only birds fly.'), target: '∀x. Flies(x) → Bird(x)', hint: [T('「只有鸟会飞」：会飞的，一定是鸟。哪边是条件？', '“Only birds fly”: whatever flies is a bird. Which side is the condition?')] },
      { say: T('不是所有鸟都会飞。', 'Not every bird flies.'), target: '¬∀x. Bird(x) → Flies(x)', hint: [T('最外面是 ¬，管着一整句「鸟都会飞」。', 'The outermost piece is ¬, over the whole of “every bird flies”.')] },
      { say: T("没有人喜欢j。", "Nobody likes j."), target: "¬∃x. Human(x) ∧ Likes(x, j)", hint: [T('「没有人」就是「并非有一个人」：最外面先放 ¬。', '“Nobody” is “not someone”: put ¬ outermost first.')] },
    ]),
    brief: BRIEF,
  },
  // Optional: reasoning that splits a quantifier where it may not, each a sentence to build and a world to refute it.
  world({
    id: 'p-split',
    title: T('∀ 不能随便拆', 'Splitting ∀'),
    translate: [{ say: T('要是什么都是鸟，那什么都会飞；所以鸟都会飞。', 'If everything is a bird, then everything flies; so every bird flies.'), target: '((∀x. Bird(x)) → (∀x. Flies(x))) → (∀x. Bird(x) → Flies(x))', hint: [T('前提是一句「如果……那么……」，两边各是一句 ∀；整段推理又是一句「如果……那么……」。', 'The premise is an “if … then …” with a ∀ sentence on each side; the whole reasoning is another “if … then …”.')] }],
    counters: [{
      given: ['(∀x. Bird(x)) → (∀x. Flies(x))'],
      goal: '∀x. Bird(x) → Flies(x)',
      answer: { size: 2, preds: { Bird: ['0'] } },
      hint: [T('前提的条件「什么都是鸟」，只要有一样东西不是鸟，就不成立。', 'The premise’s condition, “everything is a bird”, fails as soon as one thing is not a bird.')],
    }],
  }),
  world({
    id: 'p-exAnd',
    title: T('∃ 也不能随便拆', 'Splitting ∃'),
    translate: [{ say: T('有鸟，也有会飞的东西，所以有会飞的鸟。', 'There is a bird, and something flies, so some bird flies.'), target: '(∃x. Bird(x)) ∧ (∃x. Flies(x)) → (∃x. Bird(x) ∧ Flies(x))', hint: [T('条件是两句各带自己的 ∃，用「并且」连起来。', 'The condition is two sentences, each with its own ∃, joined by “and”.')] }],
    counters: [{
      given: ['∃x. Bird(x)', '∃x. Flies(x)'],
      goal: '∃x. Bird(x) ∧ Flies(x)',
      answer: { size: 2, preds: { Bird: ['0'], Flies: ['1'] } },
      hint: [T('两个 ∃ 可以指两样不同的东西。', 'The two ∃s may point at two different things.')],
    }],
  }),
  // Topic: asking a family tree questions. One sentence with a free x is a query; the world answers with what it picks.
  query({
    id: 'q-children',
    title: T("谁是i的孩子", "Who are i’s children"),
    say: T("x 是i的孩子。", "x is a child of i."), target: "Parent(i, x)",
    decoys: ['School(x)'],
    brief: T("拼一句带着 x 的话，在每一家里，让它正好选中i的孩子。", "Build a sentence with x in it that picks out exactly i’s children in each family."),
    hint: [T("「i是 x 的父母」。", "“i is a parent of x”.")],
    intro: [
      { t: T('一句话里留一个自由的 x，就成了<wiki-ref to="query"></wiki-ref>：世界里哪些东西代入 x 能让这句话成立，哪些就是答案。数据库的查询语言 SQL，核心就是这样的一阶逻辑。', 'A sentence with one x left free is a <wiki-ref to="query"></wiki-ref>: the things of a world that make it true when put in for x are the answer. At its core, SQL, the language of databases, is first-order logic like this.') },
      { t: T('这里有两家人。同一句查询要在两家里都选对，靠记名字不行。', 'There are two families here. One query must be right in both, so remembering names will not do.') },
    ],
  }),
  query({
    id: 'q-grand',
    title: T('谁当了祖父母', 'Who are grandparents'),
    say: T('x 是某个人的祖父母。', 'x is a grandparent of someone.'), target: '∃y. ∃z. Parent(x, y) ∧ Parent(y, z)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中当了祖父母的人。', 'Build a sentence with x in it that picks out exactly the grandparents in each family.'),
    hint: [T('x 是 y 的父母，y 又是 z 的父母。y 和 z 是谁？存在就行。', 'x is a parent of y, and y of z. Who are y and z? Some, that is all.')],
  }),
  query({
    id: 'q-none',
    title: T('谁没有孩子', 'Who has no children'),
    say: T('x 没有孩子。', 'x has no children.'), target: '¬∃y. Parent(x, y)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中没有孩子的人。', 'Build a sentence with x in it that picks out exactly those with no children in each family.'),
    hint: [T('「x 有孩子」是什么？在它前面加个 ¬。', 'What is “x has a child”? Put a ¬ in front.')],
  }),
  query({
    id: 'q-school',
    title: T('孩子都在上学的家长', 'Parents whose children all go to school'),
    say: T('x 有孩子，而且 x 的孩子都在上学。', 'x has children, and all of x’s children go to school.'), target: '(∃y. Parent(x, y)) ∧ ∀y. Parent(x, y) → School(y)',
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中「有孩子、孩子又都在上学」的人。', 'Build a sentence with x in it that picks out exactly those who have children, all of whom go to school.'),
    hint: [
      T('两件事用 ∧ 连起来：「有孩子」用 ∃，「孩子都在上学」用 ∀。', 'Join two things with ∧: “has children” with ∃, “all children at school” with ∀.'),
      T('只写「孩子都在上学」，没有孩子的人也会被选中：对他们，这句话什么都不用查就成立，叫<wiki-ref to="vacuous"></wiki-ref>。', 'With only “all children at school”, those with no children are picked too: for them it holds with nothing to check, a <wiki-ref to="vacuous"></wiki-ref>.'),
    ],
  }),
]
