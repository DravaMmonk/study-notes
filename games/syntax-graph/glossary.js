// 句法之图's encyclopedia (the shell's 百科): how the game is played, what the machine does for you, and the native
// speaker's decisions it teaches. An entry opens once the level `at` is reached (no `at`: from the start).

const T = (zh, en) => ({ zh, en })

export const groups = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'thinking', title: T('母语者怎么想', 'How native speakers think') },
]

export const entries = [
  {
    id: 'situation', group: 'play', title: T('情境和语义图', 'Situation and meaning graph'),
    body: [
      T('每一关先给一段<b>情境</b>：这句话在哪里说、接着什么说、读者已经知道什么。下面的<b>语义图</b>说要讲的事、参与者和它们的<b>角色</b>，但不说时间和视角：那是要你从情境里判断的。', 'Each level starts with a <b>situation</b>: where the sentence is said, what it follows, what the reader already knows. The <b>meaning graph</b> below gives what happens, who takes part and their <b>roles</b>, but not the time and viewpoint: those are yours to judge from the situation.'),
      T('运行后，语义图上每一处都会标出对不对；时间选错了，会写出母语者为什么不这么说。', 'After a run, every part of the graph is marked right or wrong; for a wrong time, you are told why a native speaker would not say it.'),
    ],
    see: ['places', 'machine'],
  },
  {
    id: 'places', group: 'play', title: T('位置', 'Places'),
    body: [
      T('句子是一排按语序排好的位置：主语，然后是谓语里的时间、动词和动词要的宾语。下面的括号标出哪些位置合成一个成分。', 'A sentence is a row of places in reading order: the subject, then the predicate’s time, verb and the objects the verb needs. The brackets underneath show which places make up one constituent.'),
      T('点一个词，它会进第一个能放它的空位；先点一个位置，再点词，就放进那个位置。点已放好的词把它拿掉。亮起的位置是建议先定的那个：时间总在最前。', 'Tap a word and it goes into the first empty place that takes it; tap a place first and then a word to put it there. Tap a placed word to take it out. The lit place is the one to settle next: the time always comes first.'),
      T('有的关给出词数目标，用更少的词拿到 ★。', 'Some levels set a word target: hit it to earn the ★.'),
    ],
    see: ['situation'],
  },
  {
    id: 'machine', group: 'play', title: T('机器替你做的', 'What the machine does'),
    body: [
      T('词形全由机器配：动词的 <i>-ed</i>、<i>-s</i>、<i>-ing</i> 和过去分词，<i>has / have</i>、<i>is / are</i>、<i>was / were</i> 和主语的一致，代词在主语位置说 <i>we</i>、在别处说 <i>us</i>。这些是规则，母语者说话时不去想它们。', 'The machine handles every form: the verb’s <i>-ed</i>, <i>-s</i>, <i>-ing</i> and past participle, agreement in <i>has / have</i>, <i>is / are</i>, <i>was / were</i>, and a pronoun said <i>we</i> as the subject and <i>us</i> elsewhere. These are rules, and native speakers do not think about them while speaking.'),
      T('你做的是规则替不了的决定：这件事从哪里看、谁当主语、哪个词放在哪。', 'What you make are the decisions no rule makes for you: where to look at the event from, what the subject is, which word goes where.'),
    ],
  },
  {
    id: 'plan', group: 'thinking', title: T('一句话怎么想出来', 'How a sentence is planned'), at: '1-2',
    body: [
      T('心理语言学把说一句话大致分成三步（Levelt 的说话产出模型）：先有要说的意思，时间和视角就在其中；再搭句子的框架，时间落在谓语开头的位置上；最后把词放进去、念出来，动词的词尾在这一步按框架自动接上。', 'Psycholinguistics splits saying a sentence into roughly three steps (Levelt’s model of speech production): first the meaning, which already holds the time and the viewpoint; then the sentence’s frame, with the time in its place at the start of the predicate; last the words go in and are said, and the verb’s ending is attached by the frame at this step.'),
      T('口误能看出这个分工：想说 <i>I’d hear one if I knew it</i>，说成了 <i>I’d know one if I heard it</i>。词干换了位置，时态留在原处。时态是框架的一部分，词是后来填进去的。不规则动词（<i>went</i>、<i>withdrew</i>）是整个记住、整个取出来的。', 'Slips of the tongue show the split: meaning <i>I’d hear one if I knew it</i>, someone says <i>I’d know one if I heard it</i>. The stems swap places and the tense stays put: the tense is part of the frame, and the words are filled in later. Irregular verbs (<i>went</i>, <i>withdrew</i>) are remembered and fetched whole.'),
      T('这是一个模型，不是说母语者真的等时间定好才想别的：说话是边想边说的，主语常常比动词先想好。它说的是，时间属于意思本身，从一开始就在，而不是说到动词时才补上的。', 'This is a model, not a claim that native speakers wait for the time before thinking of anything else: speech is planned as it goes, and the subject is often ready before the verb. What it says is that the time belongs to the meaning itself and is there from the start, not patched on when the verb comes.'),
    ],
    see: ['viewpoint'],
  },
  {
    id: 'viewpoint', group: 'thinking', title: T('时间和视角', 'Time and viewpoint'), at: '1-3',
    body: [
      T('<b>时间</b>说事情在什么时候：过去、现在、将来。<b>视角</b>说从哪里看它：从外面看整件事（一般）、站在之后看它留下的结果（完成）、站到里面看进行中的一刻（进行）。英语每一句都要两样都定下来；中文常常一样都不标。', '<b>Time</b> says when: past, present, future. <b>Viewpoint</b> says where you look from: outside, at the whole event (simple); after it, at the result it left (perfect); inside, at a moment while it goes on (progressive). Every English sentence settles both; Chinese often marks neither.'),
    ],
    see: ['perfect', 'clocks', 'progressive'],
  },
  {
    id: 'perfect', group: 'thinking', title: T('结果还在吗', 'Does the result stand?'), at: '1-3',
    body: [
      T('说一件做完的事之前，母语者先问：它的结果现在还在吗，读者现在关心的是它吗？是，就站在现在看（<i>have done</i>）；只是讲那时的经过，或者结果已经不在了，就站在那时（<i>did</i>）。', 'Before mentioning something done, a native speaker asks: does its result stand now, and is that what the reader cares about now? If so, they look from now (<i>have done</i>); if they are just telling what happened, or the result is gone, they stand then (<i>did</i>).'),
      T('所以回复审稿人、写进度和公告，多用现在完成时；写方法和实验经过，多用一般过去时。现在完成时不是“更近的过去”。', 'So replies to reviewers, progress notes and announcements lean on the present perfect; methods and accounts of experiments lean on the simple past. The present perfect is not a “more recent past”.'),
      T('把这个视角整个搬到过去，就是过去完成时（<i>had done</i>）：站在过去某一刻往回看。', 'Move this viewpoint wholly into the past and you get the past perfect (<i>had done</i>): looking back from a moment in the past.'),
    ],
  },
  {
    id: 'clocks', group: 'thinking', title: T('论文的两只钟', 'A paper’s two clocks'), at: '1-7',
    body: [
      T('论文里讲当时做了什么（设置、过程、哪一次运行出了什么事），用一般过去时；讲由此得出、你主张一直成立的东西（结论、定理、方法的性质），用一般现在时。', 'A paper tells what was done then (the setup, the procedure, what happened in a given run) in the simple past, and what follows from it and holds (findings, theorems, properties of the method) in the simple present.'),
      T('同样的词，时间一换，意思就从“一件事”变成“一条规律”：<i>The model failed</i> 是那一次，<i>The model fails</i> 是在下结论。', 'Change the time and the same words turn from an event into a rule: <i>The model failed</i> is that run; <i>The model fails</i> is a claim.'),
    ],
  },
  {
    id: 'progressive', group: 'thinking', title: T('站在里面看', 'Seen from inside'), at: '1-10',
    body: [
      T('进行体站到一件事里面，看它进行到一半的那一刻：它不说做没做完。<i>We checked the proof</i> 是核完了，<i>We were checking the proof</i> 是那时还在核。', 'The progressive stands inside an event, at a moment while it goes on, and says nothing of whether it was finished. <i>We checked the proof</i> means the check was done; <i>We were checking the proof</i> means it was under way then.'),
      T('现在进行时还要和一般现在时分开：一般现在时说习惯或一直成立的事，现在进行时说眼下正在做、还没完的事。', 'The present progressive must also be kept apart from the simple present: the simple present says a habit or what always holds; the present progressive says what is going on now and not finished.'),
    ],
  },
]
