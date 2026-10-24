// Era 1 · 时间和视角 (time and viewpoint): before a native speaker says a word, they know when the thing is and from
// where they look at it. Each level gives a situation from a computer science paper and its review; the player decides
// the time and the viewpoint (and puts the words in place), and the machine says it, forms and agreement included.
// Only level specs: the situation, the meaning, the words on offer, the reference answer, why each wrong time is wrong
// here, and the traps the level must turn down. How a clause is filled and checked is the syntax domain's
// (games/kit/domains/syntax).

const T = (zh, en) => ({ zh, en })
const role = (ent, number, label, note) => ({ ent, number, label, ...(note ? { note } : {}) })
const at = (tense, aspect) => ({ tense, aspect })
const WE = role('author', 'pl', T('我们（作者）', 'we (the authors)'), T('说话人', 'the speakers'))
const US = { we: 'author' }

export const levels = [
  // ---- Tutorial: the strip, the situation, and the machine saying the forms ----
  {
    id: '1-1',
    title: T('先定时间', 'Time first'),
    brief: T('读情境，定下时间。主语和动词已经放好。', 'Read the situation and set the time. The subject and the verb are in place.'),
    intro: [
      { t: T('在这里，一句话是一排按顺序排好的<b>位置</b>，每个位置只收一种词。词放进去，句子就念出来。', 'Here a sentence is a row of <b>places</b> in order, and each place takes one kind of word. Put words in, and the sentence reads itself out.') },
      { t: T('每一关先给一段<b>情境</b>：这句话在什么场合、接着什么说。下面的<b>语义图</b>说要讲的事和参与者，但不说时间。时间要你从情境里判断。', 'Each level starts with a <b>situation</b>: where the sentence is said and what it follows. The <b>meaning graph</b> below gives what happens and who takes part, but not the time. The time is yours to judge from the situation.') },
      { t: T('词形不用你管：<i>-ed</i>、<i>-s</i>、<i>has</i> 还是 <i>have</i>、<i>we</i> 还是 <i>us</i>，机器会配好。你只做说英语的人开口前要做的决定，第一个就是时间。', 'You never handle the forms: <i>-ed</i>, <i>-s</i>, <i>has</i> or <i>have</i>, <i>we</i> or <i>us</i>, the machine gets them right. You make only the decisions an English speaker makes before speaking, and the first is the time.') },
      { t: T('时间不是选一个词，而是回答句子下面的三个问题：这是一次具体的事吗？你站在哪一刻说它？从那一刻看，它是什么样子？答完了，时间才定下来；在那之前，其余的位置都锁着。有的答案要到后面才用得上，先是灰的。', 'The time is not a word to pick: it is three questions under the sentence. Is this one event? Which moment do you stand at to say it? Seen from there, what does it look like? Once they are answered the time is set; until then, the other places are locked. Some answers are greyed out until they are needed.') },
    ],
    hint: [T('你说这句话时，训练是还没开始，还是早就跑完了？站在哪一刻说最自然？', 'As you write this, is the training yet to start, or long over? Which moment is it natural to speak from?')],
    context: [T('写训练日志的总结。训练昨晚就跑完了，这一句报告模型的情况。', 'You are summing up the training log. The run finished last night; this line reports how the model did.')],
    meaning: { pred: 'converge', ...at('past', 'simple'), roles: { THEME: role('model', 'sg', T('模型', 'model')) } },
    palette: { time: ['future.simple', 'past.simple'] },
    preset: { SUBJ: 'model', V: 'converge' },
    why: { 'future.simple': T('<i>will converge</i> 说的是还没发生的事，可训练昨晚就跑完了。', '<i>will converge</i> talks about something yet to happen, but the run finished last night.') },
    answer: { SUBJ: 'model', TIME: 'past.simple', V: 'converge' },
    traps: [{ answer: { SUBJ: 'model', TIME: 'future.simple', V: 'converge' }, fails: 'time' }],
    debrief: {
      title: T('The model converged.', 'The model converged.'),
      body: [
        T('你没有碰动词，它自己从 <i>converge</i> 变成了 <i>converged</i>：时间一定，动词说成什么形式就跟着定了。', 'You never touched the verb, yet <i>converge</i> became <i>converged</i> by itself: once the time is set, the form the verb is said in follows.'),
        T('母语者说话也是这样：先有“这件事已经过去了”这个意思，<i>-ed</i> 是最后自动接上的，说的人不会觉得自己在“加”词尾。', 'Native speakers work the same way: the sense that “this is over” comes first, and the <i>-ed</i> is attached last, without the speaker feeling they are “adding” an ending.'),
      ],
      note: T('先定时间；词形跟着时间走。', 'Set the time first; the forms follow the time.'),
    },
  },
  {
    id: '1-2',
    title: T('放词', 'Placing words'),
    brief: T('读情境，定下时间，再把词放进句子。', 'Read the situation, set the time, then put the words into the sentence.'),
    intro: [
      { t: T('这一关，主语、动词和宾语也由你来放。点一个词，它会进第一个能放它的空位；先点一个位置，再点词，就放进那个位置。', 'This time the subject, the verb and the object are yours to place too. Tap a word and it goes into the first empty place that takes it; tap a place first, then a word, to put it there.') },
      { t: T('谁做、对谁做，靠<b>位置</b>分：动词前面的是做事的一方，后面的是事情落到的东西。', 'Who does what to whom is told by <b>position</b>: before the verb is the one acting, after it is what the action lands on.') },
    ],
    hint: [T('先回答时间的三个问题，再看语义图：谁拒了谁？', 'Answer the three time questions first, then read the graph: who turned down what?')],
    context: [T('讲去年那次投稿的结局，论文后来改投了别的会议。', 'You are telling how last year’s submission ended; the paper later went to another venue.')],
    meaning: { pred: 'reject', ...at('past', 'simple'), roles: { AGENT: role('committee', 'sg', T('程序委员会', 'programme committee')), THEME: role('paper', 'sg', T('论文', 'paper')) } },
    palette: { time: ['future.simple', 'past.simple'], np: ['paper', 'committee'], verb: ['accept', 'reject'] },
    why: { 'future.simple': T('<i>will reject</i> 是在预告，可这是去年就有了结局的事。', '<i>will reject</i> is a forecast, but this ended last year.') },
    answer: { SUBJ: 'committee', TIME: 'past.simple', V: 'reject', OBJ: 'paper' },
    traps: [
      { answer: { SUBJ: 'paper', TIME: 'past.simple', V: 'reject', OBJ: 'committee' }, fails: 'role' },
      { answer: { SUBJ: 'committee', TIME: 'past.simple', V: 'accept', OBJ: 'paper' }, fails: 'pred' },
      { answer: { SUBJ: 'committee', TIME: 'future.simple', V: 'reject', OBJ: 'paper' }, fails: 'time' },
    ],
    debrief: {
      title: T('The committee rejected the paper.', 'The committee rejected the paper.'),
      body: [
        T('换一个动词，<i>-ed</i> 还留在原处：放 <i>accept</i> 就念成 <i>accepted</i>。词尾属于时间定下的框架，不属于哪一个动词。母语者的口误也是这样：想说 <i>I’d hear one if I knew it</i>，说成 <i>I’d know one if I heard it</i>，词换了位置，时态留在原处。', 'Swap the verb and the <i>-ed</i> stays put: <i>accept</i> comes out as <i>accepted</i>. The ending belongs to the frame the time set up, not to any one verb. Native speakers’ slips show it: meaning <i>I’d hear one if I knew it</i>, someone says <i>I’d know one if I heard it</i>; the words swap, and the tense stays where it was.'),
      ],
      note: T('先定时间，搭好框架，再把词放进去；谁做什么，靠位置。', 'Set the time, build the frame, then put the words in; position says who does what.'),
    },
  },

  // ---- Does the result still stand? (present perfect against past simple) ----
  {
    id: '1-3',
    title: T('补上了', 'It’s in'),
    brief: T('以作者的口吻回复审稿人。', 'Answer the reviewer, in the authors’ voice.'),
    intro: [
      { t: T('第二问可以站在<b>现在</b>了，第三问多了一个答案：<b>已经做完，结果还在</b>。同一件做完的事，可以站在那时看，只讲那时做了；也可以站在现在，看它留下的结果。', 'The second question can now stand at <b>now</b>, and the third has a new answer: <b>is done, and its result stands</b>. A thing that was done can be seen from then, saying only that it was done; or from now, looking at the result it left.') },
      { t: T('说英语的人每说一件做完的事，都要先问一句：这个结果现在还在吗？读者现在关心的是它吗？', 'Each time an English speaker mentions something done, they first ask: does its result stand now, and is that what the reader cares about now?') },
    ],
    hint: [T('审稿人读你的回复时，想知道的是“那时做没做”，还是“现在有没有”？', 'When the reviewer reads your reply, do they want to know whether you did it then, or whether it is there now?')],
    context: [
      T('审稿人 2 要求补一组消融实验。你们补好了，放在附录 C 里。', 'Reviewer 2 asked for an ablation study. It is done, and it sits in Appendix C.'),
      T('这是回复信里回应他这条意见的一句。', 'This is the line of your response that answers that point.'),
    ],
    meaning: { pred: 'add', ...at('present', 'perfect'), roles: { AGENT: WE, THEME: role('ablation', 'sg', T('消融实验', 'ablation')) } },
    refer: US,
    palette: { time: ['past.simple', 'present.perfect'], np: ['we', 'ablation'], verb: ['add'] },
    why: { 'past.simple': T('<i>We added the ablation</i> 只讲那时做了这件事。审稿人读回复时想知道的是现在：它补上了没有、在不在论文里。结果还在、和现在有关，母语者用现在完成时。', '<i>We added the ablation</i> only says it was done then. Reading your reply, the reviewer wants to know about now: is it in the paper? The result stands and matters now, so a native speaker uses the present perfect.') },
    answer: { SUBJ: 'we', TIME: 'present.perfect', V: 'add', OBJ: 'ablation' },
    traps: [{ answer: { SUBJ: 'we', TIME: 'past.simple', V: 'add', OBJ: 'ablation' }, fails: 'time' }],
    debrief: {
      title: T('We have added the ablation.', 'We have added the ablation.'),
      body: [
        T('<i>added</i> 和 <i>have added</i> 说的是同一件事，区别在说话人站在哪：一般过去时站在那时，现在完成时站在现在，看的是结果。回复审稿人时，几乎每一句“改好了”都是现在完成时。', '<i>added</i> and <i>have added</i> report the same event; what differs is where the speaker stands. The simple past stands then; the present perfect stands now and looks at the result. In a reply to reviewers, nearly every “done” line is in the present perfect.'),
      ],
      note: T('先问：这件事的结果现在还在吗，读者现在关心它吗？', 'Ask first: does the result stand now, and does the reader care about it now?'),
    },
  },
  {
    id: '1-4',
    title: T('当时怎么做的', 'What we did'),
    brief: T('以作者的口吻写“实验设置”里的一句。', 'Write a line of the experimental setup, in the authors’ voice.'),
    hint: [T('这一节是在报告进度，还是在讲当时的经过？', 'Is this section reporting progress, or telling what happened then?')],
    context: [
      T('论文的“实验设置”一节，按顺序交代当时是怎么做的。上一句是 <i>All runs used the same random seed.</i>', 'The experimental setup of your paper, telling in order how things were done. The line before is <i>All runs used the same random seed.</i>'),
      T('这些模型前文已经提过。', 'The models were introduced earlier.'),
    ],
    meaning: { pred: 'evaluate', ...at('past', 'simple'), roles: { AGENT: WE, THEME: role('model', 'pl', T('模型', 'models'), T('前文已提及', 'mentioned earlier')) } },
    refer: { we: 'author', they: 'model', it: 'model' },
    palette: { time: ['present.perfect', 'past.simple'], np: ['it', 'we', 'they'], verb: ['evaluate'] },
    why: { 'present.perfect': T('<i>We have evaluated them</i> 会让读者去想“到现在为止”，像是在汇报进度。这里是在叙述当时的经过，上一句也是一般过去时，接着用一般过去时。', '<i>We have evaluated them</i> makes the reader think “so far”, as if reporting progress. This is the story of what was done, and the line before is in the simple past; carry on in it.') },
    answer: { SUBJ: 'we', TIME: 'past.simple', V: 'evaluate', OBJ: 'they' },
    traps: [
      { answer: { SUBJ: 'we', TIME: 'present.perfect', V: 'evaluate', OBJ: 'they' }, fails: 'time' },
      { answer: { SUBJ: 'we', TIME: 'past.simple', V: 'evaluate', OBJ: 'it' }, fails: 'role' },
    ],
    debrief: {
      title: T('We evaluated them.', 'We evaluated them.'),
      body: [
        T('方法和实验设置讲的是一段经过，钉在那时，所以用一般过去时；和现在有没有关系，在这里不是读者要的。', 'Methods and setup tell a sequence of events pinned to then, so they take the simple past; whether it bears on now is not what the reader wants here.'),
        T('<i>them</i> 是机器配的：同一个“它们”，在动词后面就说成 <i>them</i>。', 'The machine chose <i>them</i>: the same “they”, placed after the verb, is said <i>them</i>.'),
      ],
      note: T('讲经过，站在那时：一般过去时。', 'Telling what happened, you stand then: simple past.'),
    },
  },
  {
    id: '1-5',
    title: T('可以下载了', 'Out now'),
    brief: T('以作者的口吻写项目主页上的一条更新。', 'Write an update on the project page, in the authors’ voice.'),
    hint: [T('这条更新要读者知道的是哪件事：那天发生过，还是现在能用？', 'What should readers take from this update: that it happened one day, or that it is usable now?')],
    context: [T('项目主页上的更新。代码之前没公开，今天起可以下载。', 'An update on the project page. The code was not public before; from today it can be downloaded.')],
    meaning: { pred: 'release', ...at('present', 'perfect'), roles: { AGENT: WE, THEME: role('code', 'sg', T('代码', 'code')) } },
    refer: US,
    palette: { time: ['future.simple', 'past.simple', 'present.perfect'], np: ['code', 'we'], verb: ['release', 'update'] },
    why: {
      'past.simple': T('<i>We released the code</i> 只说哪天发布过，没说现在能不能下载。更新公告的重点正是现在可以用了。', '<i>We released the code</i> only says it came out one day, not whether it can be downloaded now. The whole point of the update is that it is usable now.'),
      'future.simple': T('<i>will release</i> 是预告，可代码已经可以下载了。', '<i>will release</i> is a forecast, but the code can already be downloaded.'),
    },
    answer: { SUBJ: 'we', TIME: 'present.perfect', V: 'release', OBJ: 'code' },
    traps: [
      { answer: { SUBJ: 'we', TIME: 'past.simple', V: 'release', OBJ: 'code' }, fails: 'time' },
      { answer: { SUBJ: 'we', TIME: 'present.perfect', V: 'update', OBJ: 'code' }, fails: 'pred' },
    ],
    debrief: {
      title: T('We have released the code.', 'We have released the code.'),
      body: [T('新闻和公告爱用现在完成时：它告诉读者“现在的情况变了”，这正是完成体的用处。', 'News items and announcements favour the present perfect: the body tells the reader that “the situation now has changed”, which is just what the perfect is for.')],
      note: T('“现在有了、现在能用”：现在完成时。', '“It is here now, usable now”: present perfect.'),
    },
  },
  {
    id: '1-6',
    title: T('又投回来了', 'Back again'),
    brief: T('讲这篇论文去年的一段经历。', 'Tell part of this paper’s history from last year.'),
    hint: [T('撤稿的结果，现在还在吗？', 'Does the result of the withdrawal still stand?')],
    context: [
      T('这篇论文去年投过一次，被作者撤下；改完之后又投了回来，眼下在审稿中。', 'The paper went in last year and the authors pulled it out; revised, it went back in and is under review today.'),
      T('这一句讲去年那次撤稿。', 'This line is about last year’s withdrawal.'),
    ],
    meaning: { pred: 'withdraw', ...at('past', 'simple'), roles: { AGENT: role('author', 'pl', T('作者', 'authors')), THEME: role('paper', 'sg', T('论文', 'paper')) } },
    palette: { time: ['present.perfect', 'past.simple'], np: ['paper', 'authors'], verb: ['withdraw', 'reject'] },
    why: { 'present.perfect': T('<i>have withdrawn</i> 说撤稿的结果到现在还在：论文现在不在审稿里。可它已经投回来了。结果不在了，就只剩那时的一件事，用一般过去时。', '<i>have withdrawn</i> says the withdrawal still stands: the paper is out of review now. But it is back in review. With the result gone, what is left is an event back then: simple past.') },
    answer: { SUBJ: 'authors', TIME: 'past.simple', V: 'withdraw', OBJ: 'paper' },
    traps: [
      { answer: { SUBJ: 'authors', TIME: 'present.perfect', V: 'withdraw', OBJ: 'paper' }, fails: 'time' },
      { answer: { SUBJ: 'paper', TIME: 'past.simple', V: 'withdraw', OBJ: 'authors' }, fails: 'role' },
    ],
    debrief: {
      title: T('The authors withdrew the paper.', 'The authors withdrew the paper.'),
      body: [T('现在完成时不是“离现在更近的过去”，而是“现在还看得到它的结果”。结果已经被后来的事抹掉了，再近也用一般过去时。', 'The present perfect is not a “more recent past”; it means “its result can still be seen now”. Once later events have undone the result, the simple past it is, however recent.')],
      note: T('结果不在了，就站回那时。', 'When the result is gone, stand back in then.'),
    },
  },

  // ---- A finding or a run? (the two clocks of a paper: present simple against past simple) ----
  {
    id: '1-7',
    title: T('结论', 'The finding'),
    brief: T('写“结果”一节里总结表 2 的一句。', 'Write the line in the results section that sums up Table 2.'),
    intro: [
      { t: T('第一问的另一个答案打开了：<b>不限于哪一次</b>。它不指哪一次发生的事，说的是现在、以后都对的事：性质、规律、习惯。这样的事不用再问站在哪一刻。', 'The first question’s other answer opens: <b>not tied to one time</b>. It points to no single event; it says what is true now and from now on: a property, a rule, a habit. Such a thing needs no moment to stand at.') },
      { t: T('一篇论文里有两只钟：讲当时做了什么，是一只；讲由此得出、你主张成立的东西，是另一只。', 'A paper runs two clocks: one for what was done then, and one for what you claim holds because of it.') },
    ],
    hint: [T('这句话是在记录那几次实验里发生了什么，还是在下结论？', 'Is this line recording what happened in those runs, or drawing a conclusion?')],
    context: [T('表 2 下面的总结：在全部五个数据集上，你们的方法都比几个基线好。这一句是整篇论文要读者带走的主张。', 'The summary under Table 2: on all five datasets your method beats the baselines. This line is the claim the paper wants its readers to take away.')],
    meaning: { pred: 'outperform', ...at('present', 'simple'), roles: { AGENT: role('method', 'sg', T('方法', 'method'), T('本文提出的', 'the one this paper proposes')), THEME: role('baseline', 'pl', T('基线', 'baselines')) } },
    palette: { time: ['past.simple', 'present.perfect', 'present.simple'], np: ['baselines', 'method', 'baseline'], verb: ['outperform'] },
    why: {
      'past.simple': T('<i>outperformed</i> 把它说成那几次实验里发生过的事。结论是你主张现在、以后都成立的，用一般现在时。', '<i>outperformed</i> makes it something that happened in those runs. A finding is what you claim holds now and later: simple present.'),
      'present.perfect': T('<i>has outperformed</i> 像是在数到目前为止赢过几次，说的仍是经历，不是结论。', '<i>has outperformed</i> sounds like counting the wins so far: still a history, not a claim.'),
    },
    answer: { SUBJ: 'method', TIME: 'present.simple', V: 'outperform', OBJ: 'baselines' },
    traps: [
      { answer: { SUBJ: 'method', TIME: 'past.simple', V: 'outperform', OBJ: 'baselines' }, fails: 'time' },
      { answer: { SUBJ: 'method', TIME: 'present.simple', V: 'outperform', OBJ: 'baseline' }, fails: 'role' },
    ],
    debrief: {
      title: T('The method outperforms the baselines.', 'The method outperforms the baselines.'),
      body: [T('用一般现在时报告结论，是在替它担保：它不只在那次成立。也正因为如此，结论句要配得上实验。', 'Reporting a finding in the simple present vouches for it: it holds beyond that one time. That is also why the claim must match the evidence.')],
      note: T('结论不限于哪一次：一般现在时。', 'A finding is not tied to one time: simple present.'),
    },
  },
  {
    id: '1-8',
    title: T('那一次', 'That one run'),
    brief: T('交代实验里的一个意外。', 'Report an incident from the experiments.'),
    hint: [T('五次里的一次，是规律吗？', 'One run in five: is that a rule?')],
    context: [T('“实验设置”里交代一件意外：五次运行里有一次，模型没有收敛。这一句只讲那一次。', 'The setup reports an incident: in one of five runs, the model did not converge. This line is about that run only.')],
    meaning: { pred: 'fail', ...at('past', 'simple'), roles: { THEME: role('model', 'sg', T('模型', 'model')) } },
    palette: { time: ['present.simple', 'past.simple'], np: ['models', 'model'], verb: ['converge', 'fail'] },
    why: { 'present.simple': T('<i>The model fails</i> 是在下结论：这个模型会失败。可这只是五次里的一次，是一段经过，用一般过去时。', '<i>The model fails</i> is a claim: this model fails. But it was one run in five, an event, so it takes the simple past.') },
    answer: { SUBJ: 'model', TIME: 'past.simple', V: 'fail' },
    traps: [
      { answer: { SUBJ: 'model', TIME: 'present.simple', V: 'fail' }, fails: 'time' },
      { answer: { SUBJ: 'models', TIME: 'past.simple', V: 'fail' }, fails: 'role' },
    ],
    debrief: {
      title: T('The model failed.', 'The model failed.'),
      body: [T('同样的词，换成一般现在时就从一件事变成一条规律。审稿人读到 <i>The model fails</i>，会以为你在承认方法本身有问题。', 'The same words in the simple present turn an event into a rule. A reviewer reading <i>The model fails</i> would take it as an admission that the method itself is broken.')],
      note: T('一次发生的事：一般过去时；一直成立的事：一般现在时。', 'Something that happened once: simple past; something that holds: simple present.'),
    },
  },
  {
    id: '1-9',
    title: T('定理', 'The theorem'),
    brief: T('陈述第 4 节证明的定理。', 'State the theorem proved in Section 4.'),
    hint: [T('定理在什么时候成立？', 'When does a theorem hold?')],
    context: [T('第 4 节证明了一个定理：这几个算法总会终止。引言里要陈述这个定理。', 'Section 4 proves a theorem: these algorithms always terminate. The introduction states it.')],
    meaning: { pred: 'terminate', ...at('present', 'simple'), roles: { THEME: role('algorithm', 'pl', T('算法', 'algorithms'), T('不止一个', 'more than one')) } },
    palette: { time: ['past.simple', 'future.simple', 'present.simple'], np: ['algorithm', 'algorithms'], verb: ['converge', 'terminate'] },
    why: {
      'past.simple': T('<i>terminated</i> 说的是哪次运行里停下来了。定理不是一件发生过的事，它一直成立。', '<i>terminated</i> says they stopped in some run. A theorem is not an event; it always holds.'),
      'future.simple': T('<i>will terminate</i> 是对将来的预测；定理说的是任何时候都对。', '<i>will terminate</i> predicts the future; a theorem is true at any time.'),
    },
    answer: { SUBJ: 'algorithms', TIME: 'present.simple', V: 'terminate' },
    traps: [
      { answer: { SUBJ: 'algorithms', TIME: 'past.simple', V: 'terminate' }, fails: 'time' },
      { answer: { SUBJ: 'algorithm', TIME: 'present.simple', V: 'terminate' }, fails: 'role' },
    ],
    debrief: {
      title: T('The algorithms terminate.', 'The algorithms terminate.'),
      body: [T('机器替你配了 <i>terminate</i> 而不是 <i>terminates</i>：主语是复数。一般现在时是唯一要看主语的“一般”时间，这件事交给机器就好。', 'The machine chose <i>terminate</i>, not <i>terminates</i>: the subject is plural. The simple present is the only simple time that depends on the subject, and that part is the machine’s to handle.')],
      note: T('性质、定理、结论：一般现在时。', 'Properties, theorems, findings: simple present.'),
    },
  },

  // ---- Seen from inside (progressive) ----
  {
    id: '1-10',
    title: T('核到一半', 'Halfway through'),
    brief: T('以作者的口吻回复审稿人。', 'Answer the reviewer, in the authors’ voice.'),
    intro: [
      { t: T('第三问又多了一个答案：<b>正在进行，还没完</b>。不看整件事，而是站到它里面，看它进行到一半的那一刻。', 'The third question has another answer: <b>is going on, not finished</b>. Instead of the whole event, you stand inside it and look at a moment while it goes on.') },
    ],
    hint: [T('来信那一刻，核查做完了吗？', 'When the letter came, was the check finished?')],
    context: [
      T('审稿人 1 来信指出证明里有一处漏洞。来信那天，你们对这个证明的逐行核查到了第 3 节，一共 5 节。', 'Reviewer 1 wrote to point out a gap in the proof. On the day the letter came, your line-by-line check of the proof stood at Section 3 of 5.'),
      T('这一句讲来信那天你们的核查。', 'This line is about your check on the day the letter came.'),
    ],
    meaning: { pred: 'check', ...at('past', 'progressive'), roles: { AGENT: WE, THEME: role('proof', 'sg', T('证明', 'proof')) } },
    refer: US,
    palette: { time: ['past.simple', 'past.progressive'], np: ['proof', 'we'], verb: ['check'] },
    why: { 'past.simple': T('<i>We checked the proof</i> 说的是核查做完了。来信那一刻，核查还在进行；站到里面看，用进行体。', '<i>We checked the proof</i> says the check was done. At the moment the letter came it was still going on; seen from inside, that is the progressive.') },
    answer: { SUBJ: 'we', TIME: 'past.progressive', V: 'check', OBJ: 'proof' },
    traps: [{ answer: { SUBJ: 'we', TIME: 'past.simple', V: 'check', OBJ: 'proof' }, fails: 'time' }],
    debrief: {
      title: T('We were checking the proof.', 'We were checking the proof.'),
      body: [T('<i>checked</i> 和 <i>were checking</i> 都是过去，差别在看的角度：一个从外面看整件事，一个从里面看那一刻。写审稿回复时，这正是“已核实”和“当时在核”的区别。', '<i>checked</i> and <i>were checking</i> are both past; they differ in where you look from: outside, at the whole event, or inside, at a moment. In a reply to reviewers, that is the difference between “verified” and “being verified at the time”.')],
      note: T('站在里面、看那一刻：进行体。', 'Standing inside, at a moment: progressive.'),
    },
  },
  {
    id: '1-11',
    title: T('还在改', 'Still at it'),
    brief: T('以作者的口吻写项目主页上的一句。', 'Write a line on the project page, in the authors’ voice.'),
    hint: [T('改完了吗？这是习惯，还是眼下的事？', 'Is it finished? Is it a habit, or what is going on now?')],
    context: [T('项目主页。下一版的代码改了一半，这一句告诉访客代码的近况。', 'The project page. The next version of the code is half done; this line tells visitors where the code stands.')],
    meaning: { pred: 'update', ...at('present', 'progressive'), roles: { AGENT: WE, THEME: role('code', 'sg', T('代码', 'code')) } },
    refer: US,
    palette: { time: ['present.simple', 'present.perfect', 'present.progressive'], np: ['code', 'we'], verb: ['update', 'release'] },
    why: {
      'present.simple': T('<i>We update the code</i> 说的是习惯：我们（经常）会更新代码。眼下正在做、还没完的事，用进行体。', '<i>We update the code</i> describes a habit: we update the code (from time to time). Something going on now and not finished takes the progressive.'),
      'present.perfect': T('<i>We have updated the code</i> 说已经改完、结果在了；可它还没改完。', '<i>We have updated the code</i> says it is done and the result is there; but it is not finished.'),
    },
    answer: { SUBJ: 'we', TIME: 'present.progressive', V: 'update', OBJ: 'code' },
    traps: [
      { answer: { SUBJ: 'we', TIME: 'present.simple', V: 'update', OBJ: 'code' }, fails: 'time' },
      { answer: { SUBJ: 'we', TIME: 'present.perfect', V: 'update', OBJ: 'code' }, fails: 'time' },
    ],
    debrief: {
      title: T('We are updating the code.', 'We are updating the code.'),
      body: [T('三个说法里只有它说出“还没完”。中文一个“在”字就够了；英语要先决定站在哪看，形式才跟着出来。', 'Of the three, only this one says “not finished”. Chinese can leave that to a single particle; English first decides where to look from, and the form follows.')],
      note: T('眼下进行、还没完：现在进行时。', 'Going on now and not finished: present progressive.'),
    },
  },

  // ---- Before then (past perfect) ----
  {
    id: '1-12',
    title: T('那时之前', 'Before then'),
    brief: T('讲一段经过里先发生的那件事。', 'Tell the earlier of two past events.'),
    intro: [
      { t: T('站在<b>过去某一刻</b>，也能看<b>已经做完，结果还在</b>的事：那一刻之前就做完了的事。', 'Standing at <b>a moment in the past</b>, you can also see something that <b>is done, and its result stands</b>: done before that moment.') },
    ],
    hint: [T('两件事都在过去。哪件在前？你站在哪一刻？', 'Both events are past. Which came first, and where are you standing?')],
    context: [
      T('讲一段经过。上一句是 <i>The reviews arrived in May.</i> 可作者撤稿是在那之前两周。', 'Telling what happened. The line before is <i>The reviews arrived in May.</i> But the authors pulled the paper two weeks before that.'),
      T('这一句接着讲撤稿。', 'This line goes on to the withdrawal.'),
    ],
    meaning: { pred: 'withdraw', ...at('past', 'perfect'), roles: { AGENT: role('author', 'pl', T('作者', 'authors')), THEME: role('paper', 'sg', T('论文', 'paper')) } },
    palette: { time: ['past.simple', 'present.perfect', 'past.perfect'], np: ['paper', 'authors'], verb: ['withdraw'] },
    why: {
      'past.simple': T('两件都是过去的事。只说 <i>withdrew</i>，读者会按说的顺序理解先后，像是先收到意见再撤稿。先发生的那件要再往回退一步。', 'Both events are past. With just <i>withdrew</i>, readers take them in the order told, as if the reviews came first. The earlier one has to step back once more.'),
      'present.perfect': T('<i>have withdrawn</i> 站在现在看；这里要站在“审稿意见寄到”那一刻往回看。', '<i>have withdrawn</i> looks from now; here you look back from the moment the reviews arrived.'),
    },
    answer: { SUBJ: 'authors', TIME: 'past.perfect', V: 'withdraw', OBJ: 'paper' },
    traps: [
      { answer: { SUBJ: 'authors', TIME: 'past.simple', V: 'withdraw', OBJ: 'paper' }, fails: 'time' },
      { answer: { SUBJ: 'authors', TIME: 'present.perfect', V: 'withdraw', OBJ: 'paper' }, fails: 'time' },
    ],
    debrief: {
      title: T('The authors had withdrawn the paper.', 'The authors had withdrawn the paper.'),
      body: [T('过去完成时就是把“已经做完，结果还在”从现在搬到过去：站的位置从现在换成过去的某一刻。所以它一定要有一个“那时”作参照，在上下文里，或者在同一句的从句里。', 'The past perfect is “up to now · the result stands” moved into the past: you stand at a past moment instead of now. So it always needs a “then” to look back from, in the context or in a clause of the same sentence.')],
      note: T('站在过去某一刻往回看：过去完成时。', 'Looking back from a moment in the past: past perfect.'),
    },
  },

  // ---- Topic · 投稿 (submitting a paper): one round of review, every viewpoint on offer ----
  {
    id: '1-S1',
    title: T('读完了', 'Read'),
    brief: T('投稿之后，给合作者的一句近况。', 'After submission, a status line to your co-authors.'),
    intro: [
      { t: T('这一组关卡是一轮审稿：审稿人读论文，作者递交答辩意见，最后发出终稿。每一句都要你自己判断时间和视角，可选的不止两个。', 'This series is one round of review: the reviewers read the paper, the authors send a rebuttal, and the final version goes out. In each line the time and viewpoint are yours to judge, from more than two choices.') },
    ],
    hint: [T('读完了没有？这和现在有关吗？', 'Have they finished reading? Does that matter now?')],
    context: [T('审稿系统显示：三份审稿意见都齐了。你写信把这个近况告诉合作者。', 'The review system now lists all three reviews as complete. You write to your co-authors with the news.')],
    meaning: { pred: 'read', ...at('present', 'perfect'), roles: { AGENT: role('reviewer', 'pl', T('审稿人', 'reviewers')), THEME: role('paper', 'sg', T('论文', 'paper')) } },
    palette: { time: ['past.simple', 'present.progressive', 'present.perfect'], np: ['paper', 'reviewer', 'reviewers'], verb: ['read', 'check'] },
    why: {
      'past.simple': T('<i>The reviewers read the paper</i> 只说他们读过，合作者想知道的是现在的状态：意见到齐了没有。', '<i>The reviewers read the paper</i> only says they read it; your co-authors want the state now: are the reports in?'),
      'present.progressive': T('<i>are reading</i> 说还在读，可他们已经读完、意见都交了。', '<i>are reading</i> says they are still at it, but they have finished and submitted.'),
    },
    answer: { SUBJ: 'reviewers', TIME: 'present.perfect', V: 'read', OBJ: 'paper' },
    traps: [
      { answer: { SUBJ: 'reviewers', TIME: 'past.simple', V: 'read', OBJ: 'paper' }, fails: 'time' },
      { answer: { SUBJ: 'reviewers', TIME: 'present.progressive', V: 'read', OBJ: 'paper' }, fails: 'time' },
    ],
    debrief: {
      title: T('The reviewers have read the paper.', 'The reviewers have read the paper.'),
      body: [T('<i>read</i> 的过去式和过去分词都写作 <i>read</i>：只看动词分不出时间，是前面的 <i>have</i> 说出了“到现在、结果还在”。', 'The past and past participle of <i>read</i> are both <i>read</i>: the verb alone cannot tell the time; the <i>have</i> in front says “up to now, the result stands”.')],
      note: T('近况、进度：先问结果在不在。', 'Status and progress: ask first whether the result stands.'),
    },
  },
  {
    id: '1-S2',
    title: T('答辩', 'Rebuttal'),
    brief: T('以作者的口吻，按时间顺序回顾上周的事。用的词越少越好。', 'In the authors’ voice, go over last week in order. The fewer words, the better.'),
    hint: [T('这是在按日子讲经过。接收方放在哪最省词？', 'This is a day-by-day account. Where does the recipient go to save words?')],
    context: [
      T('写给合作者的回顾，按时间顺序讲上周。你的笔记：周一，审稿意见到；周三，答辩意见给编辑。', 'A recap for your co-authors, telling last week in order. Your notes: Monday, reviews in; Wednesday, rebuttal to the editor.'),
      T('这一句讲周三那件事。', 'This line is about Wednesday.'),
    ],
    meaning: { pred: 'send', ...at('past', 'simple'), roles: { AGENT: WE, RECIPIENT: role('editor', 'sg', T('编辑', 'editor')), THEME: role('rebuttal', 'sg', T('答辩意见', 'rebuttal'), T('一份', 'one')) } },
    refer: US,
    target: 6,
    palette: { time: ['present.perfect', 'past.perfect', 'past.simple'], np: ['rebuttals', 'editor', 'we', 'rebuttal'], verb: ['send-to', 'send'] },
    why: {
      'present.perfect': T('按日子讲经过，每件事都钉在那一天（周三），站在那时说：一般过去时。<i>have sent</i> 会把它拉回现在。', 'A day-by-day account pins each event to its day (Wednesday): stand then, simple past. <i>have sent</i> drags it back to now.'),
      'past.perfect': T('<i>had sent</i> 要有一个更晚的过去时刻作参照。这里按顺序讲，周三就是那一刻本身。', '<i>had sent</i> needs a later past moment to look back from. Told in order, Wednesday is the moment itself.'),
    },
    answer: { SUBJ: 'we', TIME: 'past.simple', V: 'send', IOBJ: 'editor', OBJ: 'rebuttal' },
    traps: [
      { answer: { SUBJ: 'we', TIME: 'present.perfect', V: 'send', IOBJ: 'editor', OBJ: 'rebuttal' }, fails: 'time' },
      { answer: { SUBJ: 'we', TIME: 'past.simple', V: 'send-to', OBJ: 'rebuttal', TO: 'editor' }, fails: 'star' },
    ],
    debrief: {
      title: T('We sent the editor a rebuttal.', 'We sent the editor a rebuttal.'),
      body: [T('<i>send the editor a rebuttal</i> 比 <i>send a rebuttal to the editor</i> 省一个词。两种都对，这里要的是更短的那种。', '<i>send the editor a rebuttal</i> saves a word over <i>send a rebuttal to the editor</i>. Both are right; here the shorter one is wanted.')],
      note: T('按日子讲经过：一般过去时。', 'A day-by-day account: simple past.'),
    },
  },
  {
    id: '1-S3',
    title: T('终稿', 'Final version'),
    brief: T('以作者的口吻写回复信的最后一句。用的词越少越好。', 'Write the last line of the response letter, in the authors’ voice. The fewer words, the better.'),
    hint: [T('终稿发出去了吗？', 'Has the final version gone out yet?')],
    context: [T('回复信的最后一句。论文录用之后，终稿要发给几位审稿人；这一句是你们的承诺。审稿人前文已经提过。', 'The last line of the response. Once the paper is accepted, the final version is to go to the reviewers; this line is your promise. The reviewers were mentioned earlier.')],
    meaning: { pred: 'send', ...at('future', 'simple'), roles: { AGENT: WE, RECIPIENT: role('reviewer', 'pl', T('审稿人', 'reviewers'), T('前文已提及', 'mentioned earlier')), THEME: role('version', 'sg', T('终稿', 'final version')) } },
    refer: { we: 'author', they: 'reviewer' },
    target: 7,
    palette: { time: ['present.perfect', 'present.progressive', 'future.simple'], np: ['versions', 'they', 'we', 'version'], verb: ['send-to', 'send'] },
    why: {
      'present.perfect': T('<i>have sent</i> 说已经发了；可终稿要等录用之后才发。', '<i>have sent</i> says it has gone out; the final version waits for acceptance.'),
      'present.progressive': T('<i>are sending</i> 说眼下正在发；可现在还没到发的时候。（口语里它也能说定好的安排，但回复信里的承诺，母语者用 <i>will</i>。）', '<i>are sending</i> says it is going out now, and it is not time yet. (In speech it can also mean a fixed arrangement, but for a promise in a response letter, native writers use <i>will</i>.)'),
    },
    answer: { SUBJ: 'we', TIME: 'future.simple', V: 'send', IOBJ: 'they', OBJ: 'version' },
    traps: [
      { answer: { SUBJ: 'we', TIME: 'present.perfect', V: 'send', IOBJ: 'they', OBJ: 'version' }, fails: 'time' },
      { answer: { SUBJ: 'we', TIME: 'future.simple', V: 'send-to', OBJ: 'version', TO: 'they' }, fails: 'star' },
    ],
    debrief: {
      title: T('We will send them the final version.', 'We will send them the final version.'),
      body: [T('一轮审稿往来，用到了这一章的几种视角：现在完成时报告近况，一般过去时讲经过，<i>will</i> 作承诺。机器把 <i>they</i> 说成了 <i>them</i>，因为它在动词后面。', 'One round of review used the viewpoints of this era: the present perfect for status, the simple past for the story, <i>will</i> for a promise. The machine said <i>they</i> as <i>them</i>, because it comes after the verb.')],
      note: T('承诺以后要做的事：will。', 'A promise about what you will do: will.'),
    },
  },
]
