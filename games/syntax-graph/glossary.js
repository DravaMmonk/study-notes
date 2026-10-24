// 句法之图's encyclopedia (the shell's 百科): how the drills work, and how native speakers think about time. An entry
// opens once the level `at` is reached (no `at`: from the start).

const T = (zh, en) => ({ zh, en })

export const groups = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'thinking', title: T('母语者怎么想', 'How native speakers think') },
]

export const entries = [
  {
    id: 'drill', group: 'play', title: T('快练', 'Drills'),
    body: [
      T('每题一行情境、一句话，动词那里空着。从几个现成的说法里挑一个：选对了自动进入下一题，选错了告诉你母语者为什么不这么说，这一题过几题会再出现。一轮里每题都答对过一次才算完；第一次就答错的，下一轮排在最前面。', 'Each item is a line of situation and a sentence with the verb open. Pick one of the ready-made ways to say it: a right pick moves on by itself; a wrong one tells you why a native speaker would not say it, and the item comes back a few items later. A round ends when every item has been got right once; the ones missed on first sight lead the next round.'),
      T('桌面上可以用数字键选，回车进入下一题。', 'On a desktop, number keys pick and Enter moves on.'),
    ],
    see: ['chunks'],
  },
  {
    id: 'machine', group: 'play', title: T('机器替你做的', 'What the machine does'),
    body: [T('选项里的词形都由机器配好：<i>-ed</i>、<i>-s</i>、<i>has / have</i>、<i>is / are</i>、<i>was / were</i> 跟着主语变，代词在主语位置说 <i>we</i>、在别处说 <i>us</i>。这些是规则，母语者说话时不去想它们；你要练的是场合和说法的对应。', 'The machine gets every form right in the options: <i>-ed</i>, <i>-s</i>, <i>has / have</i>, <i>is / are</i>, <i>was / were</i> follow the subject, and a pronoun is <i>we</i> as the subject and <i>us</i> elsewhere. These are rules native speakers do not think about while speaking; what you train is which situation calls for which way of saying it.')],
  },
  {
    id: 'chunks', group: 'thinking', title: T('场合带出说法', 'The situation calls up the words'), at: '1-1',
    body: [
      T('流利的话有很大一部分是成块调出来的固定说法（Pawley & Syder、Wray 的程式化语言研究）。母语者写回复信时，不是先判断“结果还在”再给动词变形，而是“回复审稿人说改好了”这个场合直接带出 <i>We have fixed …</i>。', 'Much of fluent speech is ready-made stretches fetched whole (the research on formulaic language by Pawley and Syder, and by Wray). Writing a response letter, a native speaker does not first judge that “the result stands” and then inflect a verb; the situation of telling a reviewer something is fixed calls up <i>We have fixed …</i> directly.'),
      T('学术写作尤其如此：每一节、每一种写作动作都有一批高度固定的说法。所以这一章按场合分组，一题几秒，练的是“场合 → 说法”的直接联想，而不是一步步推理。', 'Academic writing is especially like this: each section and each move has its stock of set ways of saying things. So this era groups items by situation, a few seconds each, and trains the direct link from situation to wording rather than step-by-step reasoning.'),
      T('能做的只是让每次练习更便宜、更接近真正要写的东西；练习的量本身省不掉。写自己的论文时，改稿阶段专门过一遍时间，也是有效的办法。', 'What a drill can do is make each practice cheap and close to what you will really write; it cannot spare the amount of practice. In your own papers, a revision pass just for the times is an effective habit too.'),
    ],
    see: ['plan', 'viewpoint'],
  },
  {
    id: 'plan', group: 'thinking', title: T('一句话怎么想出来', 'How a sentence is planned'), at: '1-1',
    body: [
      T('心理语言学把说一句话大致分成三步（Levelt 的说话产出模型）：先有要说的意思，时间和视角就在其中；再搭句子的框架；最后把词放进去、念出来，动词的词尾在这一步自动接上。', 'Psycholinguistics splits saying a sentence into roughly three steps (Levelt’s model of speech production): first the meaning, which already holds the time and the viewpoint; then the sentence’s frame; last the words go in and are said, and the verb’s ending is attached at this step.'),
      T('口误能看出这个分工：想说 <i>I’d hear one if I knew it</i>，说成了 <i>I’d know one if I heard it</i>。词干换了位置，时态留在原处。所以时间不是一个后加的词尾，而是意思的一部分。', 'Slips of the tongue show the split: meaning <i>I’d hear one if I knew it</i>, someone says <i>I’d know one if I heard it</i>. The stems swap and the tense stays put. The time is not an ending added later but part of the meaning.'),
      T('这是一个模型，不是说母语者真的等时间定好才想别的：说话是边想边说的，主语常常比动词先想好。', 'This is a model, not a claim that native speakers wait for the time before thinking of anything else: speech is planned as it goes, and the subject is often ready before the verb.'),
    ],
  },
  {
    id: 'viewpoint', group: 'thinking', title: T('时间背后的三个问题', 'The three questions behind a time'), at: '1-2',
    body: [
      T('每一种时间都回答了三个问题：这是一次具体的事，还是不限于哪一次？站在哪一刻说它？从那一刻看，它是整件事、已经做完且结果还在，还是正在进行？选错时，题目下面会写出这里的三个答案。', 'Every time answers three questions: is it one event, or not tied to any one time? Which moment do you stand at to say it? Seen from there, is it the whole event, done with its result standing, or going on? After a wrong pick, the item shows the three answers meant.'),
      T('这三个问题是用来解释的，不是每句都要过一遍的步骤：熟了以后，场合直接带出说法。', 'The questions are for explaining, not steps to run through for every line: with practice, the situation calls up the words directly.'),
    ],
  },
  {
    id: 'perfect', group: 'thinking', title: T('结果还在吗', 'Does the result stand?'), at: '1-2',
    body: [
      T('一件做完的事，结果现在还在、读者现在关心它，就用现在完成时（<i>have done</i>）；只是讲那时的经过，或者结果已经不在了，就用一般过去时（<i>did</i>）。现在完成时不是“更近的过去”。', 'Something done whose result stands now, and matters to the reader now, takes the present perfect (<i>have done</i>); just telling what happened, or a result no longer standing, takes the simple past (<i>did</i>). The present perfect is not a “more recent past”.'),
      T('所以回复审稿人、写进度和公告多用现在完成时；写方法和实验经过多用一般过去时。', 'So replies to reviewers, progress notes and announcements lean on the present perfect; methods and accounts of experiments lean on the simple past.'),
    ],
  },
  {
    id: 'clocks', group: 'thinking', title: T('论文的两只钟', 'A paper’s two clocks'), at: '1-4',
    body: [T('论文里讲当时做了什么（设置、过程、哪一次运行出了什么事），用一般过去时；讲由此得出、你主张一直成立的东西（结论、定理、方法的性质），用一般现在时。同样的词，时间一换，意思就从“一件事”变成“一条规律”：<i>The model failed</i> 是那一次，<i>The model fails</i> 是在下结论。', 'A paper tells what was done (the setup, the procedure, what happened in a given run) in the simple past, and what follows from it and holds (findings, theorems, properties of the method) in the simple present. Change the time and the same words turn from an event into a rule: <i>The model failed</i> is that run; <i>The model fails</i> is a claim.')],
  },
  {
    id: 'progressive', group: 'thinking', title: T('站在里面看', 'Seen from inside'), at: '1-5',
    body: [T('进行体站到一件事里面，看它进行到一半的那一刻，不说做没做完。<i>We checked the proof</i> 是核完了，<i>We were checking the proof</i> 是那时还在核。它还要和一般现在时分开：<i>We update the code</i> 是习惯，<i>We are updating the code</i> 是眼下这一件。', 'The progressive stands inside an event, at a moment while it goes on, and says nothing of whether it was finished. <i>We checked the proof</i> means done; <i>We were checking the proof</i> means under way then. Keep it apart from the simple present: <i>We update the code</i> is a habit; <i>We are updating the code</i> is the one under way.')],
  },
  {
    id: 'before', group: 'thinking', title: T('往回退一步', 'One step back'), at: '1-6',
    body: [T('过去完成时（<i>had done</i>）只在上下文已经有一个过去的时刻、而这件事在它之前时出现。按发生的顺序讲时用不着它。', 'The past perfect (<i>had done</i>) appears only when the context already has a past moment and this came before it. Told in order, it is not needed.')],
  },
]
