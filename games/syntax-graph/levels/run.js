// The submission run (games/kit/domains/syntax/engine/run.js): era 1's phrasings, put to use on a route that is new
// each time. Only the run's spec: its credibility, the phrasings a player starts with and can win, the stops, and the
// situation templates the comments are drawn from. Each template is one situation said the same way, in several fills;
// `twist` marks the situations that look like another one.

const T = (zh, en) => ({ zh, en })
const fill = (zh, en, words) => ({ context: T(zh, en), words })

const PAST = 'past.simple'
const FUTURE = 'future.simple'
const GENERAL = 'present.simple'
const PERFECT = 'present.perfect'
const PAST_PERFECT = 'past.perfect'
const NOW_GOING = 'present.progressive'
const THEN_GOING = 'past.progressive'

const templates = [
  {
    id: 'fixed',
    answer: PERFECT,
    why: {
      [PAST]: T('只说那时做了。审稿人关心的是现在：论文里有没有。', 'That only says it was done. The reviewer cares about now: is it in the paper?'),
      [NOW_GOING]: T('说成还在做，可已经做完了。', 'That says it is still going; it is done.'),
    },
    fills: [
      fill('审稿人要求补一组消融实验。补好了，在附录 C。', 'A reviewer asked for an ablation. It is done and in Appendix C.', { SUBJ: 'we', V: 'add', OBJ: 'ablation' }),
      fill('审稿人指出第 3 节的笔误。改正后的版本已上传。', 'A reviewer spotted a typo in Section 3. The corrected version is up.', { SUBJ: 'we', V: 'fix', OBJ: 'typo' }),
      fill('审稿人质疑定理 2 的证明。修改稿里是新证明。', 'A reviewer questioned the proof of Theorem 2. The revision carries a new one.', { SUBJ: 'we', V: 'revise', OBJ: 'proof' }),
      fill('审稿人嫌讨论太短。扩写后的在第 6 节。', 'A reviewer found the discussion too short. The longer one is in Section 6.', { SUBJ: 'we', V: 'extend', OBJ: 'discussion' }),
      fill('审稿人要代码。仓库今天起公开。', 'A reviewer asked for the code. The repository is public from today.', { SUBJ: 'we', V: 'release', OBJ: 'code' }),
    ],
  },
  {
    id: 'status',
    answer: PERFECT,
    why: { [PAST]: T('合作者要的是现在的状况，不是哪天发生的。', 'Your co-authors want how things stand now, not the day it happened.') },
    fills: [
      fill('写给合作者：系统显示论文已提交成功。', 'To your co-authors: the system shows the paper as submitted.', { SUBJ: 'we', V: 'submit', OBJ: 'paper' }),
      fill('写给合作者：录用结果已经公布，可以查了。', 'To your co-authors: the decisions are out and can be checked.', { SUBJ: 'committee', V: 'announce', OBJ: 'decision' }),
      fill('写给导师：几个模型都训练好了，可以开始评测。', 'To your supervisor: the models are all trained; evaluation can start.', { SUBJ: 'we', V: 'train', OBJ: 'models' }),
    ],
  },
  {
    id: 'methods',
    answer: PAST,
    why: {
      [PERFECT]: T('这是在讲当时的经过，不是汇报进度。', 'This tells what was done then; it is not a progress report.'),
      [GENERAL]: T('说成一般现在时，像是在描述一种常规做法，而不是这篇论文当时做的。', 'In the simple present it reads like a standing practice, not what this paper did.'),
    },
    fills: [
      fill('“实验设置”一节，按顺序交代当时怎么做的。', 'The setup section, telling in order how it was done.', { SUBJ: 'we', V: 'train', OBJ: 'models' }),
      fill('数据一节：数据是去年采的。', 'The data section: the data were gathered last year.', { SUBJ: 'we', V: 'collect', OBJ: 'data' }),
      fill('上一句 <i>All runs used the same seed.</i>，接着讲。', 'The line before: <i>All runs used the same seed.</i> Go on.', { SUBJ: 'we', V: 'evaluate', OBJ: 'baselines' }),
      fill('评测一节：在三个数据集上做了测试。', 'Evaluation: the method was tried on three datasets.', { SUBJ: 'we', V: 'test', OBJ: 'method' }),
    ],
  },
  {
    id: 'when',
    answer: PAST,
    twist: true,
    why: { [PERFECT]: T('问的是哪一次，答案钉在那个时间，就站在那时说。', 'The question is about when; the answer is pinned to that time, so speak from then.') },
    fills: [
      fill('回复信里，审稿人问基线是什么时候跑的。答：去年三月。', 'In the response: a reviewer asks when the baselines were run. Answer: last March.', { SUBJ: 'we', V: 'run', OBJ: 'baselines' }),
      fill('回复信里，审稿人问数据是哪年采的。答：2024 年夏天。', 'In the response: a reviewer asks when the data were gathered. Answer: summer 2024.', { SUBJ: 'we', V: 'collect', OBJ: 'data' }),
      fill('回复信里，审稿人问模型在投稿前训练了多久。答：投稿前一周训练完。', 'In the response: a reviewer asks when training ended. Answer: a week before submission.', { SUBJ: 'we', V: 'train', OBJ: 'models' }),
    ],
  },
  {
    id: 'undone',
    answer: PAST,
    twist: true,
    why: { [PERFECT]: T('结果已经不在了，就只剩那时的一件事。', 'The result no longer stands; what is left is an event back then.') },
    fills: [
      fill('投稿历史：去年撤过一次稿，后来又投回来，眼下在审。', 'The history: pulled last year, back in review now.', { SUBJ: 'authors', V: 'withdraw', OBJ: 'paper' }),
      fill('代码曾经公开过，后来因许可问题撤下了。这一句讲那次公开。', 'The code went public once, then came down over a licence. This line is about that release.', { SUBJ: 'we', V: 'release', OBJ: 'code' }),
      fill('这个程序错误修过一次，上周又出现了。这一句讲那次修复。', 'This bug was fixed once and came back last week. This line is about that fix.', { SUBJ: 'we', V: 'fix', OBJ: 'bug' }),
    ],
  },
  {
    id: 'once',
    answer: PAST,
    twist: true,
    why: { [GENERAL]: T('说成一般现在时就成了规律。可那只是一次。', 'In the simple present it becomes a rule. It was once.') },
    fills: [
      fill('五次运行里有一次模型没收敛。这一句只讲那一次。', 'One run in five did not converge. This line is about that run only.', { SUBJ: 'model', V: 'fail' }),
      fill('实验记录：第二轮实验昨天跑砸了。', 'Lab notes: the second experiment went wrong yesterday.', { SUBJ: 'experiment', V: 'fail' }),
    ],
  },
  {
    id: 'claim',
    answer: GENERAL,
    why: {
      [PAST]: T('结论不只在那几次成立。说成过去时，像是只发生过一次。', 'A finding holds beyond those runs. In the past tense it sounds like a one-off.'),
      [PERFECT]: T('像在数到目前为止的经历，不是结论。', 'It sounds like a tally so far, not a claim.'),
    },
    fills: [
      fill('表 2 下面的总结：五个数据集上都比基线好。这是全文的主张。', 'Under Table 2: better than the baselines on all five datasets. This is the paper’s claim.', { SUBJ: 'method', V: 'outperform', OBJ: 'baselines' }),
      fill('讨论一节：这些结果和你们的主张对得上。', 'Discussion: these results bear out your claim.', { SUBJ: 'results', V: 'support', OBJ: 'claim' }),
      fill('局限一节：训练离不开人工标注。', 'Limitations: training cannot do without human labels.', { SUBJ: 'method', V: 'require', OBJ: 'labels' }),
    ],
  },
  {
    id: 'rule',
    answer: GENERAL,
    why: { [PAST]: T('这是一直成立的性质，不是哪一次发生的事。', 'This always holds; it is not something that happened once.') },
    fills: [
      fill('引言里陈述第 4 节的定理：这些算法总会终止。', 'The introduction states Section 4’s theorem: these algorithms always terminate.', { SUBJ: 'algorithms', V: 'terminate' }),
      fill('引言里描述一种普遍现象：这类模型容易过拟合。', 'The introduction describes a known tendency: models of this kind overfit easily.', { SUBJ: 'models', V: 'overfit' }),
    ],
  },
  {
    id: 'habit',
    answer: GENERAL,
    twist: true,
    why: { [NOW_GOING]: T('这是习惯，不是眼下这一件。', 'This is a habit, not one thing under way now.') },
    fills: [
      fill('项目主页：代码每月更新一次。', 'The project page: the code is updated once a month.', { SUBJ: 'we', V: 'update', OBJ: 'code' }),
      fill('项目主页：每次发版前都会在三个数据集上测一遍。', 'The project page: every release is tested on three datasets first.', { SUBJ: 'we', V: 'test', OBJ: 'method' }),
    ],
  },
  {
    id: 'promise',
    answer: FUTURE,
    why: {
      [PERFECT]: T('说成已经做了，可要等录用之后。', 'That says it is done already; it waits for acceptance.'),
      [NOW_GOING]: T('承诺以后做的事，回复信里用 <i>will</i>。', 'A promise about later takes <i>will</i> in a response letter.'),
    },
    fills: [
      fill('回复信的结尾：录用之后公开代码，这是承诺。', 'The end of the response: the code goes public on acceptance, as a promise.', { SUBJ: 'we', V: 'release', OBJ: 'code' }),
      fill('回复审稿人：终稿里会补上这组消融实验。', 'To a reviewer: the final version will carry the ablation.', { SUBJ: 'we', V: 'add', OBJ: 'ablation' }),
      fill('回复审稿人：终稿里会扩写讨论。', 'To a reviewer: the final version will have a longer discussion.', { SUBJ: 'we', V: 'extend', OBJ: 'discussion' }),
    ],
  },
  {
    id: 'plan',
    answer: FUTURE,
    why: { [PAST]: T('那是还没到的事。', 'That has not come yet.') },
    fills: [
      fill('投稿系统下周一截止，这一句说你们的打算。', 'Submissions close next Monday; this line says what you plan.', { SUBJ: 'we', V: 'submit', OBJ: 'paper' }),
      fill('会议日程：程序委员会下个月公布结果。', 'The schedule: the committee’s decisions come out next month.', { SUBJ: 'committee', V: 'announce', OBJ: 'decision' }),
    ],
  },
  {
    id: 'going',
    answer: NOW_GOING,
    why: {
      [PERFECT]: T('说成已经做完了，可才做到一半。', 'That says it is done; it is half done.'),
      [GENERAL]: T('那是习惯；这里是眼下没做完的一件事。', 'That is a habit; this is one thing under way.'),
    },
    fills: [
      fill('项目主页：下一版的代码改了一半。', 'The project page: the next version of the code is half done.', { SUBJ: 'we', V: 'update', OBJ: 'code' }),
      fill('给导师的近况：第二轮实验跑到一半。', 'An update for your supervisor: the second round is half run.', { SUBJ: 'we', V: 'run', OBJ: 'experiments' }),
      fill('回复审稿人：定理 3 的证明正在重写，还没写完。', 'To a reviewer: the proof of Theorem 3 is being rewritten, not finished.', { SUBJ: 'we', V: 'revise', OBJ: 'proof' }),
    ],
  },
  {
    id: 'midway',
    answer: THEN_GOING,
    why: { [PAST]: T('说成做完了。那一刻还在进行。', 'That says it was finished; at that moment it was still going.') },
    fills: [
      fill('审稿人来信那天，你们核查证明核到第 3 节（共 5 节）。', 'The day the reviewer wrote, your check of the proof stood at Section 3 of 5.', { SUBJ: 'we', V: 'check', OBJ: 'proof' }),
      fill('解释日志为什么不全：机房断电那一刻，训练到一半。', 'Why the logs are incomplete: when the power failed, training was half done.', { SUBJ: 'we', V: 'train', OBJ: 'model' }),
    ],
  },
  {
    id: 'before',
    answer: PAST_PERFECT,
    why: {
      [PAST]: T('读者会按说的顺序理解先后。先发生的那件要再往回退一步。', 'Readers take events in the order told. The earlier one steps back once more.'),
      [PERFECT]: T('这是站在现在看；这里要站在上一句的那一刻往回看。', 'That looks from now; here you look back from the moment of the line before.'),
    },
    fills: [
      fill('上一句 <i>The reviews arrived in May.</i> 撤稿是在那之前两周。', 'The line before: <i>The reviews arrived in May.</i> The withdrawal came two weeks earlier.', { SUBJ: 'authors', V: 'withdraw', OBJ: 'paper' }),
      fill('上一句 <i>The deadline passed on Friday.</i> 你们周三就交了。', 'The line before: <i>The deadline passed on Friday.</i> You had sent it in on Wednesday.', { SUBJ: 'we', V: 'submit', OBJ: 'paper' }),
      fill('上一句 <i>The bug report came on Tuesday.</i> 你们周一就修好了。', 'The line before: <i>The bug report came on Tuesday.</i> You had fixed it on Monday.', { SUBJ: 'we', V: 'fix', OBJ: 'bug' }),
    ],
  },
]

export const levels = [
  {
    id: '1-R',
    kind: 'run',
    title: T('一次投稿', 'One submission'),
    brief: T('从第一轮审稿意见走到程序委员会。路线每次都不一样。', 'From the first reviews to the programme committee, on a route that is new each time.'),
    intro: [
      { t: T('这一关可以一直玩下去：每次投稿，路线、意见和顺序都重新生成，你以前答错的情境会更常出现。', 'This one is for playing again and again: each submission draws a new route, new comments and a new order, and situations you have got wrong before turn up more often.') },
      { t: T('<b>可信度</b>是你的底气：说错一条意见就扣掉它的分量，扣完就被拒稿。<b>句式本</b>里是你能用的说法：一开始只有三种，每过一站审稿意见，可以再收进一种。同一种说法用对三次就算<b>熟练</b>，之后每用对一次恢复 1 点可信度。', '<b>Credibility</b> is what you stand on: a wrong answer costs the comment’s weight, and at none the paper is rejected. Your <b>phrasebook</b> holds the ways of saying you can use: three to begin with, and one more to take after each round of reviews. A phrasing used right three times is <b>practised</b>, and from then on each right use restores a point.') },
      { t: T('路上会遇到：<b>审稿意见</b>（普通的一轮）、<b>二号审稿人</b>（专挑看起来像、其实不是的情境，扣得更重）、<b>改稿夜</b>（休息恢复可信度，或者重做答错过的意见）。最后是<b>程序委员会</b>。', 'On the way: <b>reviews</b> (an ordinary round), <b>Reviewer 2</b> (who favours situations that look like something else, and costs more), and <b>revision nights</b> (rest for credibility, or redo what you got wrong). At the end, the <b>programme committee</b>.') },
    ],
    hint: [T('先认场合：报告改好了、讲当时、下结论、说还没完的事、承诺，还是讲“在那之前”。', 'Know the situation first: reporting a fix, telling what happened, claiming, something not finished, a promise, or “before then”.')],
    run: {
      credibility: 12,
      rows: 7,
      start: [PAST, FUTURE, PERFECT],
      rewards: [GENERAL, NOW_GOING, THEN_GOING, PAST_PERFECT],
      stops: {
        reviews: { comments: 3, weight: 2 },
        strict: { comments: 4, weight: 3, twists: 2 },
        committee: { comments: 6, weight: 3, twists: 2 },
        night: {},
      },
      templates,
    },
    debrief: {
      title: T('录用', 'Accepted'),
      body: [T('一次投稿里，几种说法都得在对的场合拿出来。再投一次，路线和意见都会换；你答错过的情境会更常出现，直到它们不再出错。', 'One submission asks for each phrasing in its place. Submit again and the route and comments change; the situations you got wrong will come up more, until they stop going wrong.')],
      note: T('场合一认出来，说法就跟着来。', 'Know the situation, and the words follow.'),
    },
  },
]
