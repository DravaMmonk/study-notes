// Era 1 · 时间和视角 (time and viewpoint), as drills: short items in the writing situations of a computer science paper
// and its review, each a one-line situation and a sentence whose verb group is left to pick. A native writer does not
// reason a time out clause by clause; the situation calls up its way of saying things. So each level gathers the
// situations that share a time, many items deep, and its debrief names the sentence frames that go with them.
// Only level specs (games/kit/domains/syntax/engine/drill.js says what an item is); the machine says every option.

const T = (zh, en) => ({ zh, en })
const item = (zh, en, words, answer, why) => ({ context: T(zh, en), words, answer, why })

const PAST = 'past.simple'
const FUTURE = 'future.simple'
const GENERAL = 'present.simple'
const PERFECT = 'present.perfect'
const PAST_PERFECT = 'past.perfect'
const NOW_GOING = 'present.progressive'
const THEN_GOING = 'past.progressive'

export const levels = [
  {
    id: '1-1',
    kind: 'drill',
    title: T('过去还是将来', 'Done or to come'),
    brief: T('每题一句：读情境，选出动词的说法。', 'One line each: read the situation and pick how the verb is said.'),
    move: T('训练日志与计划', 'Logs and plans'),
    intro: [
      { t: T('这一章不搭句子，只练一件事：一个场合一出现，动词该怎么说就跟着出来。每题给一行情境和一句话，动词那里空着，从几个现成的说法里挑一个。', 'This era builds no sentences; it trains one thing: once a situation is there, the way the verb is said comes with it. Each item gives a line of situation and a sentence with the verb left open; pick one of the ready-made ways to say it.') },
      { t: T('选对了自动进入下一题；选错了会告诉你为什么，这一题过几题会再出现。一轮里每题都答对过一次才算完。不求想得深，求做得多：一题几秒钟。', 'A right pick moves on by itself; a wrong one tells you why, and the item comes back a few items later. A round ends when every item has been got right once. Aim for many, not deep: a few seconds an item.') },
    ],
    hint: [T('先看情境里的时间点：它在说这句话之前，还是之后？', 'Look for the point in time in the situation: before you say this, or after?')],
    items: [
      item('训练日志的总结：训练昨晚就跑完了。', 'Summing up the log: the run finished last night.', { SUBJ: 'model', V: 'converge' }, PAST, { [FUTURE]: T('训练昨晚就跑完了，不是还没发生的事。', 'The run finished last night; it is not still to come.') }),
      item('投稿系统下周一截止，这一句说你们的打算。', 'Submissions close next Monday; this line says what you plan.', { SUBJ: 'we', V: 'submit', OBJ: 'paper' }, FUTURE, { [PAST]: T('截止在下周，提交还没发生。', 'The deadline is next week; the submission has not happened.') }),
      item('讲去年那次投稿的结局。', 'How last year’s submission ended.', { SUBJ: 'committee', V: 'reject', OBJ: 'paper' }, PAST, { [FUTURE]: T('去年就有了结局。', 'It ended last year.') }),
      item('明天组会的议程，这一句说你们要做什么。', 'Tomorrow’s group meeting agenda; this line says what you will do.', { SUBJ: 'we', V: 'show', OBJ: 'results' }, FUTURE, { [PAST]: T('组会在明天，还没开。', 'The meeting is tomorrow; it has not happened.') }),
      item('实验记录：第二轮实验昨天跑砸了。', 'Lab notes: the second experiment went wrong yesterday.', { SUBJ: 'experiment', V: 'fail' }, PAST, { [FUTURE]: T('是昨天的事。说成将来，像是在预言它会失败。', 'It was yesterday. Said in the future, it sounds like a prediction that it will fail.') }),
      item('会议日程：程序委员会下个月公布录用结果。', 'The conference schedule: the committee’s decisions come out next month.', { SUBJ: 'committee', V: 'announce', OBJ: 'decision' }, FUTURE, { [PAST]: T('公布在下个月，还没到。', 'It is next month; not yet.') }),
      item('周报：上周的工作是评估几个基线。', 'Weekly report: last week’s work was evaluating the baselines.', { SUBJ: 'we', V: 'evaluate', OBJ: 'baselines' }, PAST, { [FUTURE]: T('上周的事，已经做了。', 'Last week; it is done.') }),
      item('回复信的结尾：录用之后公开代码，这是承诺。', 'The end of a response letter: the code goes public on acceptance, as a promise.', { SUBJ: 'we', V: 'release', OBJ: 'code' }, FUTURE, { [PAST]: T('录用之后才公开，现在还没有。', 'It goes public after acceptance, not yet.') }),
    ],
    debrief: {
      title: T('过去还是将来', 'Done or to come'),
      body: [
        T('你没有选过任何词尾：选的是说法，<i>converged</i>、<i>will submit</i> 都是整块出来的。母语者也是这样，时间一定，整个说法就跟着来。', 'You never chose an ending: you chose a way of saying it, and <i>converged</i> or <i>will submit</i> came whole. Native speakers work the same way: once the time is set, the whole phrase comes with it.'),
        T('计划、截止、承诺：<i>We will …</i>。日志、周报里做过的事：<i>We …-ed</i>。', 'Plans, deadlines, promises: <i>We will …</i>. Things done, in logs and weekly reports: <i>We …-ed</i>.'),
      ],
      note: T('看情境里的时间点在说话之前还是之后。', 'Is the point in time before you speak, or after?'),
    },
  },
  {
    id: '1-2',
    kind: 'drill',
    title: T('回复审稿人', 'Answering reviewers'),
    brief: T('回复信里的一句句“已经改好”。读情境，选出动词的说法。', 'Line after line of “done” in a response letter. Read the situation and pick how the verb is said.'),
    move: T('回复审稿人', 'Response to reviewers'),
    intro: [
      { t: T('这一组多了一种说法：<i>have</i> + 过去分词。同一件做完的事，可以只讲那时做了，也可以讲它现在的结果：论文里已经有了、能用了。', 'A new way of saying it here: <i>have</i> + past participle. A thing that was done can be told as done back then, or by its result now: it is in the paper, it can be used.') },
    ],
    hint: [T('审稿人读这句话时，关心的是那时做没做，还是论文现在是什么样？', 'Reading this, does the reviewer care whether it was done back then, or what the paper is like now?')],
    items: [
      item('审稿人 2 要求补一组消融实验。补好了，在附录 C。', 'Reviewer 2 asked for an ablation study. It is done and in Appendix C.', { SUBJ: 'we', V: 'add', OBJ: 'ablation' }, PERFECT, { [PAST]: T('只说那时做了。审稿人关心的是现在：它在不在论文里。', 'That only says it was done. The reviewer cares about now: is it in the paper?') }),
      item('审稿人指出第 3 节有个笔误，改正后的版本已经上传。', 'A reviewer spotted a typo in Section 3; the corrected version is uploaded.', { SUBJ: 'we', V: 'fix', OBJ: 'typo' }, PERFECT, { [PAST]: T('回复信报告的是论文现在的状态，不是哪天改的。', 'A response letter reports the paper as it stands now, not the day of the fix.') }),
      item('审稿人要代码。仓库今天起公开。', 'A reviewer asked for the code. The repository is public from today.', { SUBJ: 'we', V: 'release', OBJ: 'code' }, PERFECT, { [PAST]: T('重点是现在能拿到代码。', 'The point is that the code can be had now.') }),
      item('审稿人质疑定理 2 的证明。新的证明写进了修改稿。', 'A reviewer questioned the proof of Theorem 2. The new proof is in the revision.', { SUBJ: 'we', V: 'revise', OBJ: 'proof' }, PERFECT, { [PAST]: T('修改稿里现在就是新证明，这是审稿人要看到的。', 'The revision now carries the new proof; that is what the reviewer needs to see.') }),
      item('审稿人问基线是什么时候跑的。答：去年三月。', 'A reviewer asks when the baselines were run. Answer: last March.', { SUBJ: 'we', V: 'run', OBJ: 'baselines' }, PAST, { [PERFECT]: T('问的是哪一次，答案钉在去年三月，就站在那时说。', 'The question is about when; the answer is pinned to last March, so speak from then.') }),
      item('审稿人 3 嫌讨论太短。扩写后的讨论在第 6 节。', 'Reviewer 3 found the discussion too short. The longer one is in Section 6.', { SUBJ: 'we', V: 'extend', OBJ: 'discussion' }, PERFECT, { [PAST]: T('第 6 节现在就是扩写后的样子。', 'Section 6 now carries the longer version.') }),
      item('写给合作者：审稿系统显示三份意见都齐了。', 'To your co-authors: the system shows all three reviews in.', { SUBJ: 'reviewers', V: 'read', OBJ: 'paper' }, PERFECT, { [PAST]: T('合作者要的是现在的进度：意见到齐了。', 'Your co-authors want the state now: the reviews are in.') }),
      item('解释投稿历史：去年撤过一次稿，后来又投回来，现在在审。', 'Explaining the history: the paper was pulled last year, came back, and is under review now.', { SUBJ: 'authors', V: 'withdraw', OBJ: 'paper' }, PAST, { [PERFECT]: T('撤稿的结果已经不在了：论文又投回来了。结果不在，就只是那时的一件事。', 'The withdrawal no longer stands: the paper is back. With the result gone, it is just an event back then.') }),
    ],
    debrief: {
      title: T('回复审稿人', 'Answering reviewers'),
      body: [
        T('回复信里几乎每一句“改好了”都是一个句式：<i>We have added / fixed / revised / extended …</i>。审稿人读信时关心的是现在的论文。', 'Nearly every “done” line in a response letter is one frame: <i>We have added / fixed / revised / extended …</i>. The reviewer reads it for the paper as it is now.'),
        T('例外是被问到“什么时候”，或者结果已经不在了：那就回到一般过去时。', 'The exceptions are a “when?” question, or a result that no longer stands: back to the simple past.'),
      ],
      note: T('回复信：We have …；问到哪一次：We …-ed。', 'Response letters: We have …; asked about when: We …-ed.'),
    },
  },
  {
    id: '1-3',
    kind: 'drill',
    title: T('方法与经过', 'Methods'),
    brief: T('论文里讲“当时怎么做的”。读情境，选出动词的说法。', 'The part of a paper that tells how it was done. Read the situation and pick how the verb is said.'),
    move: T('方法与实验设置', 'Methods and setup'),
    hint: [T('这一句是在讲当时的经过，还是在报告到现在为止的进度？', 'Is this line telling what happened back then, or reporting progress so far?')],
    items: [
      item('“实验设置”一节，按顺序交代当时怎么做的。', 'The setup section, telling in order how it was done.', { SUBJ: 'we', V: 'train', OBJ: 'models' }, PAST, { [PERFECT]: T('这是在讲当时的经过，不是汇报进度。', 'This tells what was done then; it is not a progress report.') }),
      item('上一句 <i>All runs used the same seed.</i>，接着讲。', 'The line before: <i>All runs used the same seed.</i> Go on.', { SUBJ: 'we', V: 'evaluate', OBJ: 'baselines' }, PAST, { [PERFECT]: T('上一句已经在讲经过，接着用同一个时间。', 'The line before tells the story; keep its time.') }),
      item('数据一节：数据是去年采的。', 'The data section: the data were gathered last year.', { SUBJ: 'we', V: 'collect', OBJ: 'data' }, PAST, { [PERFECT]: T('去年的事，钉在那时。', 'Last year: pinned to then.') }),
      item('交代一件意外：五次运行里有一次模型没收敛。', 'An incident: one run in five did not converge.', { SUBJ: 'model', V: 'fail' }, PAST, { [GENERAL]: T('说成一般现在时，就成了规律：这个模型会失败。可那只是一次。', 'In the simple present it becomes a rule: this model fails. It was one run.') }),
      item('评测一节：在三个数据集上做了测试。', 'Evaluation: the method was tried on three datasets.', { SUBJ: 'we', V: 'test', OBJ: 'method' }, PAST, { [PERFECT]: T('这是在讲当时做的测试，读者要的是经过。', 'This tells the tests that were run; the reader wants the account.') }),
      item('给导师的周报：到目前为止，评估了三个模型。', 'A weekly report to your supervisor: three models evaluated so far.', { SUBJ: 'we', V: 'evaluate', OBJ: 'models' }, PERFECT, { [PAST]: T('周报说的是到现在的进度，不是那几天的经过。', 'A weekly report gives progress up to now, not the story of those days.') }),
      item('第一轮审稿时，审稿人 1 检查过这个证明。', 'In the first round, Reviewer 1 went over this proof.', { SUBJ: 'reviewer', V: 'check', OBJ: 'proof' }, PAST, { [PERFECT]: T('“第一轮审稿时”把它钉在那时。', '“In the first round” pins it to then.') }),
    ],
    debrief: {
      title: T('方法与经过', 'Methods'),
      body: [
        T('方法、设置、数据、哪一次运行出了什么事：<i>We trained / collected / evaluated …</i>，一路一般过去时，整节保持一致。', 'Methods, setup, data, what happened in one run: <i>We trained / collected / evaluated …</i>, simple past all the way, kept steady through the section.'),
        T('周报和进度汇报是另一个场合：<i>So far, we have …</i>。', 'Weekly reports and progress notes are another situation: <i>So far, we have …</i>.'),
      ],
      note: T('讲经过：We …-ed；报进度：We have …。', 'Telling what happened: We …-ed; reporting progress: We have ….'),
    },
  },
  {
    id: '1-4',
    kind: 'drill',
    title: T('结论与定理', 'Findings'),
    brief: T('论文里你主张一直成立的东西。读情境，选出动词的说法。', 'What a paper claims holds. Read the situation and pick how the verb is said.'),
    move: T('结果、结论、相关工作', 'Results, findings, related work'),
    intro: [
      { t: T('这一组多了一种说法：一般现在时。它不指哪一次，说的是现在、以后都对的事：性质、规律、结论。', 'A new way of saying it here: the simple present. It points to no single time; it says what is true now and from now on: a property, a rule, a finding.') },
    ],
    hint: [T('这是在记录那一次发生了什么，还是在主张一件不限于哪一次的事？', 'Is this recording what happened once, or claiming something not tied to any one time?')],
    items: [
      item('表 2 下面的总结：五个数据集上都比基线好。这是全文的主张。', 'Under Table 2: better than the baselines on all five datasets. This is the paper’s claim.', { SUBJ: 'method', V: 'outperform', OBJ: 'baselines' }, GENERAL, { [PAST]: T('结论不只在那几次成立。说成过去时，像是只发生过一次。', 'A finding holds beyond those runs. In the past tense it sounds like a one-off.'), [PERFECT]: T('像在数到目前赢了几次，仍是经历，不是结论。', 'It sounds like counting the wins so far: a history, not a claim.') }),
      item('引言里陈述第 4 节证明的定理：这些算法总会终止。', 'The introduction states Section 4’s theorem: these algorithms always terminate.', { SUBJ: 'algorithms', V: 'terminate' }, GENERAL, { [PAST]: T('定理不是发生过的事，它一直成立。', 'A theorem is not an event; it always holds.') }),
      item('讨论一节：这些结果和你们的主张对得上。', 'Discussion: these results bear out your claim.', { SUBJ: 'results', V: 'support', OBJ: 'claim' }, GENERAL, { [PAST]: T('结果支持主张，这层关系现在就成立。', 'The results back the claim, and that holds now.') }),
      item('交代一件意外：五次运行里有一次模型没收敛。', 'An incident: one run in five did not converge.', { SUBJ: 'model', V: 'fail' }, PAST, { [GENERAL]: T('那只是一次，不是规律。', 'That was one run, not a rule.') }),
      item('相关工作：前人那篇论文提出了这个方法（2019 年）。', 'Related work: the earlier paper put this method forward (in 2019).', { SUBJ: 'authors', V: 'propose', OBJ: 'method' }, PAST, { [GENERAL]: T('“提出”是 2019 年发生的事。', 'Putting it forward happened in 2019.') }),
      item('方法的局限：训练离不开人工标注。', 'A limitation: training cannot do without human labels.', { SUBJ: 'method', V: 'require', OBJ: 'labels' }, GENERAL, { [PAST]: T('这是方法的性质，现在也是这样。', 'This is a property of the method; it is so now too.') }),
      item('引言里描述一种普遍现象：这类模型容易过拟合。', 'The introduction describes a known tendency: models of this kind overfit easily.', { SUBJ: 'models', V: 'overfit' }, GENERAL, { [PAST]: T('说的是这类模型的倾向，不是哪一次。', 'This is a tendency of such models, not one occasion.') }),
    ],
    debrief: {
      title: T('结论与定理', 'Findings'),
      body: [
        T('一篇论文有两只钟：讲当时做了什么用一般过去时，讲你主张成立的东西用一般现在时。<i>We evaluated the method on five datasets. It outperforms the baselines.</i>', 'A paper runs two clocks: what was done, in the simple past; what you claim holds, in the simple present. <i>We evaluated the method on five datasets. It outperforms the baselines.</i>'),
        T('常用句式：<i>Our method outperforms … ; These results support … ; X requires …</i>。相关工作里，前人“做了什么”用过去时，他们的结论仍成立时用现在时。', 'Frames: <i>Our method outperforms … ; These results support … ; X requires …</i>. In related work, what others did is past; their findings that still hold are present.'),
      ],
      note: T('一次发生的：过去时；一直成立的：一般现在时。', 'Happened once: past; holds: simple present.'),
    },
  },
  {
    id: '1-5',
    kind: 'drill',
    title: T('正在进行', 'Under way'),
    brief: T('还没完的事。读情境，选出动词的说法。', 'Things not finished. Read the situation and pick how the verb is said.'),
    move: T('进度与经过', 'Progress and accounts'),
    intro: [
      { t: T('这一组多了一种说法：<i>be</i> + <i>-ing</i>。不看整件事，而是站到它里面，看它进行到一半的那一刻。', 'A new way of saying it here: <i>be</i> + <i>-ing</i>. Instead of the whole event, you stand inside it, at a moment while it goes on.') },
    ],
    hint: [T('那一刻，这件事做完了没有？是一件事，还是一种习惯？', 'At that moment, was it finished? Is it one event, or a habit?')],
    items: [
      item('项目主页：下一版的代码改了一半。', 'The project page: the next version of the code is half done.', { SUBJ: 'we', V: 'update', OBJ: 'code' }, NOW_GOING, { [GENERAL]: T('那是习惯（我们会更新代码）。这里是眼下没做完的一件事。', 'That is a habit (we update the code). This is one thing under way.'), [PERFECT]: T('说成已经改完了，可它只改了一半。', 'That says it is finished; it is half done.') }),
      item('审稿人来信那天，你们逐行核查证明，核到第 3 节（共 5 节）。', 'The day the reviewer wrote, your line-by-line check of the proof stood at Section 3 of 5.', { SUBJ: 'we', V: 'check', OBJ: 'proof' }, THEN_GOING, { [PAST]: T('说成核完了。来信那一刻核查还在进行。', 'That says the check was done; at that moment it was still going.') }),
      item('项目主页：代码每月更新一次。', 'The project page: the code is updated once a month.', { SUBJ: 'we', V: 'update', OBJ: 'code' }, GENERAL, { [NOW_GOING]: T('每月一次是习惯，不是眼下这一件。', 'Once a month is a habit, not one thing under way now.') }),
      item('写给合作者：审稿系统显示“审稿中”，意见还没交。', 'To your co-authors: the system says “under review”; no reports yet.', { SUBJ: 'reviewers', V: 'read', OBJ: 'paper' }, NOW_GOING, { [PERFECT]: T('说成已经读完了，可意见还没交。', 'That says they have finished; no reports are in.') }),
      item('解释数据为什么不全：机房断电那一刻，模型训练到一半。', 'Why the logs are incomplete: when the power failed, training was half done.', { SUBJ: 'we', V: 'train', OBJ: 'model' }, THEN_GOING, { [PAST]: T('说成训练完了。断电那一刻训练还在进行。', 'That says the training finished; at the outage it was still going.') }),
      item('给导师的近况：第二轮实验跑到一半。', 'An update for your supervisor: the second round of experiments is half run.', { SUBJ: 'we', V: 'run', OBJ: 'experiments' }, NOW_GOING, { [PERFECT]: T('说成已经跑完了，可才跑到一半。', 'That says they are done; they are half run.') }),
    ],
    debrief: {
      title: T('正在进行', 'Under way'),
      body: [
        T('近况和进度里，还没完的事：<i>We are running / updating …</i>；讲经过时，“那一刻正在做”：<i>We were checking … when …</i>。', 'In updates, something not finished: <i>We are running / updating …</i>; in an account, “in the middle of it at that moment”: <i>We were checking … when …</i>.'),
        T('和一般现在时分开：<i>We update the code</i> 是习惯，<i>We are updating the code</i> 是眼下这一件。', 'Keep it apart from the simple present: <i>We update the code</i> is a habit; <i>We are updating the code</i> is the one under way.'),
      ],
      note: T('还没完：be + -ing。', 'Not finished: be + -ing.'),
    },
  },
  {
    id: '1-6',
    kind: 'drill',
    title: T('那时之前', 'Before then'),
    brief: T('讲经过时，先发生的那件事。读情境，选出动词的说法。', 'In an account, the thing that came first. Read the situation and pick how the verb is said.'),
    move: T('讲一段经过', 'Telling what happened'),
    intro: [
      { t: T('这一组多了一种说法：<i>had</i> + 过去分词。站在过去的某一刻往回看，那一刻之前已经做完的事。', 'A new way of saying it here: <i>had</i> + past participle. Standing at a moment in the past, looking back at what was already done by then.') },
    ],
    hint: [T('上一句定下了一个过去的时刻。这件事在它之前，还是按顺序接着它？', 'The line before sets a moment in the past. Is this before it, or next in order?')],
    items: [
      item('上一句 <i>The reviews arrived in May.</i> 撤稿是在那之前两周。', 'The line before: <i>The reviews arrived in May.</i> The withdrawal came two weeks earlier.', { SUBJ: 'authors', V: 'withdraw', OBJ: 'paper' }, PAST_PERFECT, { [PAST]: T('读者会按说的顺序理解：先收到意见，再撤稿。先发生的要再往回退一步。', 'Readers take events in the order told: reviews first, then the withdrawal. The earlier one steps back once more.'), [PERFECT]: T('这是站在现在看；这里要站在五月那一刻往回看。', 'That looks from now; here you look back from May.') }),
      item('上一句 <i>The deadline passed on Friday.</i> 你们周三就交了。', 'The line before: <i>The deadline passed on Friday.</i> You had sent it in on Wednesday.', { SUBJ: 'we', V: 'submit', OBJ: 'paper' }, PAST_PERFECT, { [PAST]: T('按说的顺序会被理解成截止之后才交。往回退一步，才说得出“之前”。', 'In the order told it reads as after the deadline. Stepping back says “before”.') }),
      item('按发生顺序讲：周一投稿，周五收到确认。这一句讲周一。', 'Told in order: submitted Monday, confirmation Friday. This line is Monday.', { SUBJ: 'we', V: 'submit', OBJ: 'paper' }, PAST, { [PAST_PERFECT]: T('按顺序讲，这件事本身就是那一刻，不用往回退。', 'Told in order, this is the moment itself; no stepping back.') }),
      item('上一句 <i>The committee met in June.</i> 那时三位审稿人都读完了。', 'The line before: <i>The committee met in June.</i> By then all three reviewers were done reading.', { SUBJ: 'reviewers', V: 'read', OBJ: 'paper' }, PAST_PERFECT, { [PAST]: T('只说读了，读者分不出是在开会之前还是之后。', 'Just “read” leaves it unclear whether it was before the meeting or after.'), [PERFECT]: T('这是站在现在看；这里要站在六月开会那一刻。', 'That looks from now; here you stand at the June meeting.') }),
      item('上一句 <i>The bug report came on Tuesday.</i> 你们周一就修好了。', 'The line before: <i>The bug report came on Tuesday.</i> You had fixed it on Monday.', { SUBJ: 'we', V: 'fix', OBJ: 'bug' }, PAST_PERFECT, { [PAST]: T('按说的顺序会被理解成收到报告后才修。往回退一步，才说得出“已经”。', 'In the order told it reads as fixed after the report. Stepping back says “already”.') }),
    ],
    debrief: {
      title: T('那时之前', 'Before then'),
      body: [
        T('过去完成时只在需要“往回退一步”时出现：上下文里已经有一个过去的时刻，而这件事在它之前。<i>The reviews arrived in May. The authors had withdrawn the paper two weeks before.</i>', 'The past perfect appears only to step back once: the context already has a past moment, and this came before it. <i>The reviews arrived in May. The authors had withdrawn the paper two weeks before.</i>'),
        T('按发生的顺序讲时用不着它；用多了反而累赘。', 'Told in order, it is not needed; overused, it clutters.'),
      ],
      note: T('有了过去的那一刻，又要说它之前：had + 过去分词。', 'A past moment set, and something before it: had + past participle.'),
    },
  },
  {
    id: '1-7',
    kind: 'drill',
    title: T('一封回复信', 'A response letter'),
    brief: T('同一封回复信里的几句，时间各不相同。读情境，选出动词的说法。', 'Lines from one response letter, each with its own time. Read the situation and pick how the verb is said.'),
    move: T('回复信，从头到尾', 'A response letter, start to end'),
    hint: [T('每一句先想场合：报告改好了、讲当时、下结论、讲还没完的事，还是承诺？', 'For each line, think of the situation first: reporting a fix, telling what happened, claiming, something not finished, or a promise?')],
    items: [
      item('回应审稿人 2：消融实验补好了，在附录 C。', 'To Reviewer 2: the ablation is done and in Appendix C.', { SUBJ: 'we', V: 'add', OBJ: 'ablation' }, PERFECT, { [PAST]: T('回复信报告的是论文现在的样子。', 'A response letter reports the paper as it is now.'), [NOW_GOING]: T('说成还在补，可已经补完了。', 'That says it is still going; it is done.') }),
      item('回应审稿人 1：结论不变，方法依然优于基线。', 'To Reviewer 1: the finding stands; the method still beats the baselines.', { SUBJ: 'method', V: 'outperform', OBJ: 'baselines' }, GENERAL, { [PAST]: T('这是你仍然主张的结论，不只是那几次的记录。', 'This is a claim you still make, not a record of those runs.'), [PERFECT]: T('像在数赢了几次，不是结论。', 'It sounds like counting wins, not a claim.') }),
      item('解释第一版的问题：投第一版时用的是旧数据集。', 'Explaining the first version: it used the old dataset.', { SUBJ: 'we', V: 'use', OBJ: 'dataset' }, PAST, { [PERFECT]: T('那是第一版时的事，现在已经换了。', 'That was in the first version; it has been replaced.'), [GENERAL]: T('说成一直这样用，可现在已经不用了。', 'That says you always use it; you no longer do.') }),
      item('回应审稿人 3：新的一轮实验跑到一半，结果会补进终稿。', 'To Reviewer 3: a new round of experiments is half run; the results will go into the final version.', { SUBJ: 'we', V: 'run', OBJ: 'experiments' }, NOW_GOING, { [PERFECT]: T('说成已经跑完了，可才跑到一半。', 'That says they are done; they are half run.'), [FUTURE]: T('不是还没开始，已经在跑了。', 'It has not still to start; it is running.') }),
      item('信的最后：录用之后公开代码。', 'The end of the letter: the code goes public on acceptance.', { SUBJ: 'we', V: 'release', OBJ: 'code' }, FUTURE, { [PERFECT]: T('说成已经公开了，可要等录用之后。', 'That says it is public already; it waits for acceptance.'), [NOW_GOING]: T('承诺以后做的事，回复信里用 <i>will</i>。', 'A promise about later takes <i>will</i> in a response letter.') }),
      item('回应审稿人 1 提到的笔误：改正后的版本已经上传。', 'On the typo Reviewer 1 found: the corrected version is uploaded.', { SUBJ: 'we', V: 'fix', OBJ: 'typo' }, PERFECT, { [PAST]: T('报告的是现在：论文里已经改正了。', 'This reports now: the paper is corrected.') }),
    ],
    debrief: {
      title: T('一封回复信', 'A response letter'),
      body: [T('一封信里五种时间各司其职：<i>We have added …</i> 报告改好的，<i>The method outperforms …</i> 坚持结论，<i>We used …</i> 讲当时，<i>We are running …</i> 说还在做的，<i>We will release …</i> 作承诺。场合一认出来，说法就跟着来。', 'One letter, five times, each with its job: <i>We have added …</i> reports a fix, <i>The method outperforms …</i> stands by a claim, <i>We used …</i> tells what happened, <i>We are running …</i> says what is under way, <i>We will release …</i> makes a promise. Know the situation, and the way of saying it follows.')],
      note: T('先认场合，再说话。', 'Know the situation first; the words follow.'),
    },
  },
]
