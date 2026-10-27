// Chapter 9 · The simplifier: goals that only want "work it out" or "push the negation in" take too long rule by
// rule, so equivalences proved once are turned into rewrite rules, used left to right. The laws come first, each a
// level of proof-board tasks (De Morgan, propositional and for quantifiers). The drinker paradox, which leans on
// De Morgan's ¬∀ shape, is the challenge.
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
const prove = (task) => ({ kind: 'proof', ...task })
const DAYS = [{ A: 'Sat', B: 'Sun' }, { A: 'Rain', B: 'Wind' }]
const DRINK = [{ P: 'Drinks' }, { P: 'Sings' }]

export const simplifier = [
  // ---------- laws proved to be rules ----------
  {
    id: 'demorgan',
    title: T('德摩根', 'De Morgan'),
    builds: 'dm',
    tasks: [
      prove({
        step: T('并非或者', 'Not either'),
        tests: [{ premises: { p: '¬(A ∨ B)' }, goal: '¬A ∧ ¬B' }],
        cases: DAYS,
        brief: T('实现一个证明器，可以从已知「¬(今天是周六 ∨ 今天是周日)」，证明出「¬今天是周六 ∧ ¬今天是周日」。', 'Build a prover that, from “¬(today is Saturday ∨ today is Sunday)”, proves “¬today is Saturday ∧ ¬today is Sunday”.'),
        hint: [T('「¬今天是周六」怎么来？假设「今天是周六」，看它怎样和已知撞出矛盾。「¬今天是周日」同理。', 'Where does “¬today is Saturday” come from? Assume “today is Saturday” and see how it clashes with the given. “¬today is Sunday” the same way.')],
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
        hint: [T('要证的是一个否定：假设「今天是周六 ∨ 今天是周日」，两种情况各撞出矛盾。', 'The goal is a negation: assume “today is Saturday ∨ today is Sunday” and get a contradiction in each case.')],
        solution: proof({ f: ['impI', { A: 'A ∨ B' }], e: ['andE'], o: ['orE', {}, 'f'], m1: ['mp', {}, 'o/left'], m2: ['mp', {}, 'o/right'] }, ['p>e.ab', 'f#body>o.ab', 'e#left>m1.imp', 'o#left>m1.a', 'm1>o.left', 'e#right>m2.imp', 'o#right>m2.a', 'm2>o.right', 'o>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('有一个不', 'One fails'),
        tests: [{ premises: { p: '¬A ∨ ¬B' }, goal: '¬(A ∧ B)' }],
        cases: DAYS,
        brief: T('再从「¬今天是周六 ∨ ¬今天是周日」，证明出「¬(今天是周六 ∧ 今天是周日)」。', 'Now from “¬today is Saturday ∨ ¬today is Sunday”, prove “¬(today is Saturday ∧ today is Sunday)”.'),
        hint: [T('假设「今天是周六 ∧ 今天是周日」，拆开它；已知的两种情况，各拿一半撞出矛盾。', 'Assume “today is Saturday ∧ today is Sunday” and split it; in each case of the given, one half runs into a contradiction.')],
        solution: proof({ f: ['impI', { A: 'A ∧ B' }], e: ['andE', {}, 'f'], o: ['orE', {}, 'f'], m1: ['mp', {}, 'o/left'], m2: ['mp', {}, 'o/right'] }, ['f#body>e.ab', 'p>o.ab', 'o#left>m1.imp', 'e#left>m1.a', 'm1>o.left', 'o#right>m2.imp', 'e#right>m2.a', 'm2>o.right', 'o>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('并非两个都', 'Not both'),
        tests: [{ premises: { p: '¬(A ∧ B)' }, goal: '¬A ∨ ¬B' }],
        cases: DAYS,
        brief: T('最后从「¬(今天是周六 ∧ 今天是周日)」，证明出「¬今天是周六 ∨ ¬今天是周日」。', 'Last, from “¬(today is Saturday ∧ today is Sunday)”, prove “¬today is Saturday ∨ ¬today is Sunday”.'),
        hint: [
          T('已知没说是哪一个不成立。用排中律：今天是周六，或者不是。', 'The given does not say which one fails. Use excluded middle: today is Saturday, or it is not.'),
          T('是周六的那一边：再假设今天是周日，拼起来就撞上已知，所以「¬今天是周日」。', 'On the Saturday side: assume it is also Sunday; joined, they run into the given, so “¬today is Sunday”.'),
        ],
        solution: proof({ l: ['lem', { A: 'A' }], e: ['orE'], g: ['impI', { A: 'B' }, 'e/left'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'], i1: ['orI', { other: '¬A', side: 'left' }, 'e/left'], i2: ['orI', { other: '¬B', side: 'right' }, 'e/right'] }, ['l>e.ab', 'e#left>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>i1.a', 'i1>e.left', 'e#right>i2.a', 'i2>e.right', 'e>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [
      { t: T('「既不是周六也不是周日」和「并非（周六或者周日）」说的是一回事；「并非（周六并且周日）」和「不是周六，或者不是周日」也是。否定穿过「或者」变成「并且」，穿过「并且」变成「或者」：这是<b>德摩根律</b>。', '“Neither Saturday nor Sunday” and “not (Saturday or Sunday)” say the same thing; so do “not (Saturday and Sunday)” and “not Saturday, or not Sunday”. A negation passing through “or” becomes “and”, through “and” becomes “or”: these are <b>De Morgan’s laws</b>.') },
      { t: T('两对说法，每对两个方向，四段任务各证一个。四个方向都证出来以后，它们合成一块元件<part-ref to="lemma:dm"></part-ref>，元件上切换四种形状。', 'Two pairs of sayings, each pair two ways round: four tasks, one direction each. Once all four are proved they make one part, <part-ref to="lemma:dm"></part-ref>, which switches between the four shapes.') },
    ],
    after: T('四个方向里，只有「并非两个都」要靠排中律：它没说是哪一个，经典逻辑却敢说「总有一个」。四个方向都齐了，现在你有了元件<part-ref to="lemma:dm"></part-ref>。', 'Of the four directions, only “not both” rests on excluded middle: it does not say which, yet classical logic dares to say “one of them”. All four directions are in hand, and now you have the part <part-ref to="lemma:dm"></part-ref>.'),
  },
  {
    id: 'q-dm',
    title: T('量词的德摩根', 'De Morgan for quantifiers'),
    tasks: [
      prove({
        step: T('一个都没有', 'Not a single one'),
        tests: [{ premises: { p: '¬∃x. P(x)' }, goal: '∀x. ¬P(x)' }],
        cases: DRINK,
        brief: T('实现一个证明器，可以从已知「¬∃x. x在喝酒」（没有人在喝酒），证明出「∀x. ¬x在喝酒」（人人都没喝）。', 'Build a prover that, from “¬∃x. x is drinking” (nobody is drinking), proves “∀x. ¬x is drinking” (everyone is not drinking).'),
        hint: [T('任取一个 a，假设它在喝酒：它就是一个例子，和已知撞出矛盾。', 'Take any a and suppose it is drinking: then it is an example, and it runs into the given.')],
        solution: proof({ g: ['allI', { x: 'a' }], f: ['impI', { A: 'P(a)' }, 'g'], i: ['exI', {}, 'f'], m: ['mp', {}, 'f'] }, ['f#body>i.a', 'p>m.imp', 'i>m.a', 'm>f.body', 'f>g.body', 'g>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('都不，就是没有', 'All not is none'),
        tests: [{ premises: { p: '∀x. ¬P(x)' }, goal: '¬∃x. P(x)' }],
        cases: DRINK,
        brief: T('再从「∀x. ¬x在喝酒」证明出「¬∃x. x在喝酒」。', 'Now from “∀x. ¬x is drinking”, prove “¬∃x. x is drinking”.'),
        hint: [T('假设有人在喝酒，把他拿出来，再从已知里取他。', 'Suppose someone is drinking, take them out, and take them from the given too.')],
        solution: proof({ f: ['impI', { A: '∃x. P(x)' }], e: ['exE', { x: 'a' }, 'f'], a: ['allE', { t: 'a' }, 'e'], m: ['mp', {}, 'e'] }, ['f#body>e.ex', 'p>a.all', 'a>m.imp', 'e#body>m.a', 'm>e.body', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('有一个不', 'One who does not'),
        tests: [{ premises: { p: '∃x. ¬P(x)' }, goal: '¬∀x. P(x)' }],
        cases: DRINK,
        brief: T('再从「∃x. ¬x在喝酒」（有人没在喝酒），证明出「¬∀x. x在喝酒」（并非人人都在喝酒）。', 'Now from “∃x. ¬x is drinking” (someone is not drinking), prove “¬∀x. x is drinking” (not everyone is drinking).'),
        hint: [T('假设人人都在喝酒，把那个没喝的人拿出来，他也在「人人」里。', 'Suppose everyone is drinking; take out the one who is not, who is among “everyone” too.')],
        solution: proof({ f: ['impI', { A: '∀x. P(x)' }], e: ['exE', { x: 'a' }, 'f'], a: ['allE', { t: 'a' }, 'e'], m: ['mp', {}, 'e'] }, ['p>e.ex', 'f#body>a.all', 'e#body>m.imp', 'a>m.a', 'm>e.body', 'e>f.body', 'f>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('并非人人', 'Not everyone'),
        sentences: ['¬∃x. ¬P(x)'],
        tests: [{ premises: { p: '¬∀x. P(x)' }, goal: '∃x. ¬P(x)' }],
        cases: DRINK,
        brief: T('最后从「¬∀x. x在喝酒」（并非人人都在喝酒），证明出「∃x. ¬x在喝酒」（有人没在喝酒）。', 'Last, from “¬∀x. x is drinking” (not everyone is drinking), prove “∃x. ¬x is drinking” (someone is not drinking).'),
        hint: [
          T('已知里没有一个具体的人可以拿来举例。反过来假设「¬∃x. ¬x在喝酒」：没有人不喝。', 'The given names nobody to use as an example. Suppose the opposite, “¬∃x. ¬x is drinking”: nobody fails to drink.'),
          T('在这个假设下，任取一个 a：要是他没喝，他就是一个「没喝的人」，撞上假设。所以他喝了（反证法），人人都喝，又撞上已知。', 'Under that, take any a: if they were not drinking, they would be someone not drinking, against the supposition. So they drink (by contradiction), everyone drinks, and that runs into the given.'),
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
      { t: T('「没有人在喝酒」和「人人都没在喝酒」说的是一回事：否定穿过量词，∃ 就变成 ∀。∃ 像一个很长的「或者」，∀ 像一个很长的「并且」，所以这还是德摩根律，只是穿过的是量词。', '“Nobody is drinking” and “everyone is not drinking” say the same: negation passes through the quantifier and ∃ turns into ∀. ∃ is like a long “or” and ∀ a long “and”, so this is De Morgan’s law again, passing through a quantifier.') },
      { t: T('同样是两对说法、四个方向。证出的每一个方向，<part-ref to="lemma:dm"></part-ref>上就多一个形状。', 'Again two pairs, four directions. Each direction proved adds a shape to <part-ref to="lemma:dm"></part-ref>.') },
    ],
    after: T('前三个方向都不用反证法；「并非人人」要用两次：证出了「有一个」，却说不出是谁。直觉主义逻辑不承认这样的「存在」。<part-ref to="lemma:dm"></part-ref>八个形状都齐了：否定穿过「或者」「并且」「存在」「对所有」，都能互相转换。', 'The first three directions need no proof by contradiction; “not everyone” takes it twice: it proves “there is one” without saying who. Intuitionistic logic does not accept such an “exists”. <part-ref to="lemma:dm"></part-ref> has all eight shapes now: a negation passing through “or”, “and”, “there is” and “for all” turns each into the other.'),
  },

  // ---------- challenge ----------
  {
    id: 'drinker',
    kind: 'proof',
    title: T('酒鬼悖论', 'The drinker paradox'),
    tests: [{ goal: '∃x. D(x) → ∀y. D(y)' }],
    cases: [{ D: 'Drinks' }, { D: 'Sings' }],
    brief: T('酒吧里至少有一个人。实现一个证明器，不需要任何已知，就能证明出「∃x. x在喝酒 → ∀y. y在喝酒」：有这么一个人，只要他喝酒，大家就都在喝。', 'There is at least one person in the pub. Build a prover that proves “∃x. x is drinking → ∀y. y is drinking” from nothing given: there is someone such that, if they drink, everyone drinks.'),
    hint: [T('别急着找那个人。先问：是不是大家都在喝？', 'Do not look for that person yet. Ask first: is everyone drinking?')],
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
    after: T('大家都在喝，随便哪个人都行；有人没喝，那个人就是：他没喝，「他喝酒就大家都喝」就空着成立了。这句话听着荒唐，却是经典逻辑的定理，靠的是排中律：不知道是哪种情况，两种都讨论。', 'If everyone drinks, anyone will do; if someone does not, that one will: they do not drink, so “if they drink, everyone does” holds emptily. It sounds absurd, yet it is a theorem of classical logic, resting on excluded middle: not knowing which case holds, take both.'),
  },
]
