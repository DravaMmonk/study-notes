// 状态之图's course by era (games/DESIGN.md): one robot per era. Its main path is a foundation that teaches what it can
// do and unlocks its parts, practice problems in order of difficulty, and its topic series (one per robot for now),
// growing from a small version of its finale; beside it, challenges that push what the robot can already do. The play
// order, the map's chapters and what each level requires all come from here (../../../kit/course.js layout). On the
// map each era is one chapter, named after its robot (its `chapter.desc` the question it answers), drawn as its level
// tree.
import { T, tr, lazy } from '../../kit/domains/table/i18n.js';
import { ROBOTS } from '../../kit/domains/table/circuit/robots.js';
import { eraLevels, pathLevels } from '../../kit/course.js';

// A named series on the main path, as one branch of a `parallel` set: sets of series that need nothing from each
// other are played in any order, all of them before the path goes on.
const series = (id, zh, en, levels) => ({ id, title: T(zh, en), levels });

export const ERAS = [
  {
    id: 'paper', machine: null,
    foundation: ['trace', 'lastStep', 'city'],
    chapter: { title: T('纸笔', 'Pen and paper'), desc: T('用小问题的答案，拼出大问题的答案。', 'Build the answer to a big problem out of the answers to small ones.') },
  },
  {
    id: 'scout', machine: 'scout',
    foundation: ['copy', 'confluence', 'origin', 'stamp', { parallel: [series('rocks', '石头', 'Rocks', ['rocks', 'reach']), series('cost', '花费', 'Costs', ['cheapest'])] }],
    chapter: { title: T('造一台机器', 'Build a machine'), desc: T('机器人在每一格上运行同一块电路板；拼好的电路板会变成元件。', 'On every cell the robot runs the same circuit board, and a finished board becomes a component.') },
    practice: [{ parallel: [series('shape', '换形状', 'New shapes', ['slant', 'pascal']), series('coins', '金币', 'Coins', ['maxcoins'])] }, 'pits'],
    topics: [
      { id: 'seam', code: 'S', after: 'cheapest', levels: ['seamline', 'seamslant', 'seam', 'carve'], title: T('图里的缝', 'Seams in a picture'), desc: T('在一张图里，找一条最不起眼的缝。', 'Find the least noticeable seam in a picture.') },
    ],
    challenges: [{ level: 'lawn', after: 'pascal' }],
  },
  {
    id: 'ranger', machine: 'ranger',
    // One new thing a level: two rings of view, scanning backwards, a game of yes / no, the two words a table compares
    // (连线不交叉 is the alignment table by hand), scanning by length.
    foundation: ['stairs', { parallel: [series('back', '倒着扫', 'Scanning backwards', ['order']), series('win', '输赢', 'Winning', ['nim'])] }, 'link', 'lcs', 'palin'],
    chapter: { title: T('看得更远', 'Seeing further'), desc: T('看得更远：两步之外的格子；看得更全：表头上的两个词；还能换个方向扫。', 'It sees further, two cells away; it sees more, the two words a table compares; and it can scan the other way round.') },
    practice: [{ parallel: [series('broken', '坏台阶', 'Broken steps', ['brokenstairs']), series('lps', '回文子序列', 'Palindromic subsequences', ['lps'])] }],
    topics: [
      { id: 'edit', code: 'E', after: 'lcs', levels: ['replace', 'edit', 'spell'], title: T('拼写纠错', 'Spelling correction'), desc: T('输错一个词，找出词典里最接近的那个。', 'A word is mistyped: find the closest one in the dictionary.') },
    ],
    challenges: [{ level: 'parity', after: 'nim' }, { level: 'localalign', after: 'lcs' }, { level: 'piles', after: 'nim' }],
  },
  {
    id: 'reach', machine: 'reach',
    foundation: ['frog', { parallel: [series('jump', '跳法', 'Ways to jump', ['frogfar', 'safefrog']), series('sentence', '句子', 'Sentences', ['tagging', 'forward'])] }],
    chapter: { title: T('伸长手臂', 'A longer arm'), desc: T('伸缩臂能够到任意远的一格。', 'A telescopic arm reaches a cell however far away.') },
    topics: [
      { id: 'knapsack', code: 'K', after: 'frogfar', levels: ['pack', 'knaptable', 'knapmany', 'knapmix'], title: T('背包', 'The backpack'), desc: T('容量有限，拿什么最值钱？', 'With limited room, what is most worth taking?') },
    ],
    // 压成一行 is not in CURRICULUM.md's tree; it stays as a second challenge.
    challenges: [{ level: 'coinways', after: 'knapmany' }, { level: 'roll', after: 'knapmix' }],
  },
  {
    id: 'broom', machine: 'broom',
    foundation: ['prefix', 'rising'],
    chapter: { title: T('一格多来路', 'Many ways in'), desc: T('扫描臂扫过一整段格子，来路的数量不再固定。', 'The sweep arm passes over a whole run of cells, so the number of ways in is no longer fixed.') },
    practice: [{ parallel: [series('interval', '区间', 'Intervals', ['stones', 'twoorders', 'parse']), series('change', '零钱', 'Change', ['change'])] }],
    topics: [
      { id: 'words', code: 'W', after: 'rising', levels: ['wordbreak', 'wordcost', 'segment'], title: T('切单词', 'Cutting words'), desc: T('一串没有空格的字母，切成词典里的词。', 'A string with no spaces, cut into dictionary words.') },
    ],
    challenges: [{ level: 'maxsub', after: 'prefix' }],
  },
  {
    id: 'stack', machine: 'stack',
    foundation: ['robber', 'breach', 'keydoor'],
    chapter: { title: T('状态不够用', 'When the state falls short'), desc: T('一个数记不住的时候，就多记一件事。', 'When one number can’t remember enough, remember one more thing.') },
    practice: ['stock1', 'cooldown'],
    challenges: [{ level: 'ring', after: 'robber' }],
    topics: [
      { id: 'state', code: 'D', after: 'keydoor', levels: ['twokeys', 'threekeys', 'enough'], title: T('设计状态', 'Designing the state'), desc: T('该记住什么，这次由你决定。', 'This time, you decide what to remember.') },
    ],
  },
  {
    id: 'settle', machine: 'loop',
    foundation: ['loop'],
    chapter: { title: T('扫到不再变', 'Scan until it settles'), desc: T('箭头绕成了圈，就一遍一遍地扫。', 'When the arrows loop round, scan again and again.') },
    practice: ['value', 'arrows'],
    topics: [
      { id: 'value', code: 'V', after: 'value', levels: ['treasure', 'slip', 'ice'], title: T('格子世界', 'The grid world'), desc: T('机器人在格子里找宝藏，越远的宝藏越不值钱。', 'The robot hunts for treasure on a grid, and the further it is, the less it is worth.') },
    ],
  },
];

/**
 * A level's number, as in CURRICULUM.md: on an era's main path the era and its place ('1-4'; the foundation runs on
 * into the practice), in a topic the topic's letter and its place ('S2'), and C1, C2… for an era's challenges.
 */
export const LABELS = new Map(ERAS.flatMap((era, e) => [
  ...pathLevels([...era.foundation, ...(era.practice ?? [])]).map((id, k) => [id, `${e}-${k + 1}`]),
  ...(era.topics ?? []).flatMap(t => t.levels.map((id, k) => [id, `${t.code}${k + 1}`])),
  ...(era.challenges ?? []).map((c, k) => [c.level, `C${k + 1}`]),
]));

/** Levels the new tree leaves out: written, but not played. */
export const RETIRED = ['light', 'merge', 'relay', 'dial', 'disguise', 'swap', 'back', 'why', 'askall', 'memo2', 'selforder'];

/** The map's chapters, one per era in play order: named after the era's robot (or the era's own title where there is
 *  none), and its levels. */
export const CHAPTERS = ERAS.map((era, e) => ({
  era: era.id,
  kicker: lazy(() => tr(`第 ${e} 代`, `Era ${e}`)),
  name: era.machine ? ROBOTS[era.machine].name : era.chapter.title,
  desc: era.chapter.desc,
  levels: eraLevels(era),
}));
