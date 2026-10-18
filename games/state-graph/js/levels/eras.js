// 状态之图's course by era (games/DESIGN.md): one robot per era. Its main path is a foundation that teaches what it can
// do and unlocks its parts, practice problems in order of difficulty, and its topic series (one per robot for now),
// growing from a small version of its finale; beside it, challenges that push what the robot can already do. The play
// order, the map's chapters and what each level requires all come from here (../../../kit/course.js layout). On the
// map each era is one chapter, named after its robot (its `chapter.desc` the question it answers); inside it the
// foundation, the practice, each topic and the challenges are groups split by dashed lines.
import { T, tr, lazy } from '../i18n.js';
import { ROBOTS } from '../circuit/robots.js';

export const ERAS = [
  {
    id: 'paper', machine: null,
    foundation: ['trace', 'lastStep', 'city'],
    chapter: { title: T('纸笔', 'Pen and paper'), desc: T('用小问题的答案，拼出大问题的答案。', 'Build the answer to a big problem out of the answers to small ones.') },
  },
  {
    id: 'scout', machine: 'scout',
    foundation: ['copy', 'confluence', 'origin', 'stamp', 'rocks', 'cheapest', 'reach'],
    chapter: { title: T('造一台机器', 'Build a machine'), desc: T('机器人在每一格上运行同一块电路板；拼好的电路板会变成元件。', 'On every cell the robot runs the same circuit board, and a finished board becomes a component.') },
    practice: ['slant', 'maxcoins', 'pascal', 'pits'],
    practiceChapter: { title: T('小方的问题', 'Problems for Boxy'), desc: T('同一副骨架，问不同的问题；表也可以换形状。', 'The same skeleton asked new questions; a table can change shape too.') },
    topics: [
      { id: 'seam', code: 'S', levels: ['seamline', 'seamslant', 'seam', 'carve'], title: T('图里的缝', 'Seams in a picture'), desc: T('在一张图里，找一条最不起眼的缝。', 'Find the least noticeable seam in a picture.') },
    ],
    challenges: [{ level: 'lawn', after: 'pits' }],
  },
  {
    id: 'ranger', machine: 'ranger',
    foundation: ['stairs', 'order', 'nim', 'palin'],
    chapter: { title: T('看得更远', 'Seeing further'), desc: T('视野从 3×3 变成 5×5：一格能用上两步之外的格子。', 'The view grows from 3×3 to 5×5: a cell can use cells two steps away.') },
    practice: ['brokenstairs', 'link', 'lcs', 'lps'],
    practiceChapter: { title: T('远望的问题', 'Problems for Farsight'), desc: T('一个词放上面，一个词放左边；输赢也能填表。', 'One word along the top, the other down the left; winning fits in a table too.') },
    topics: [
      { id: 'edit', code: 'E', levels: ['replace', 'edit', 'spell'], title: T('拼写纠错', 'Spelling correction'), desc: T('输错一个词，找出词典里最接近的那个。', 'A word is mistyped: find the closest one in the dictionary.') },
    ],
    challenges: [{ level: 'parity', after: 'nim' }, { level: 'localalign', after: 'lcs' }, { level: 'piles', after: 'nim' }],
  },
  {
    id: 'reach', machine: 'reach',
    foundation: ['frog', 'frogfar', 'safefrog'],
    chapter: { title: T('伸长手臂', 'A longer arm'), desc: T('伸缩臂能够到任意远的一格。', 'A telescopic arm reaches a cell however far away.') },
    practice: ['tagging', 'forward'],
    practiceChapter: { title: T('长臂的问题', 'Problems for Longarm'), desc: T('同一副骨架，用在词和句子上。', 'The same skeleton, on words and sentences.') },
    topics: [
      { id: 'knapsack', code: 'K', levels: ['pack', 'knaptable', 'knapmany', 'knapmix'], title: T('背包', 'The backpack'), desc: T('容量有限，拿什么最值钱？', 'With limited room, what is most worth taking?') },
    ],
    // 压成一行 is not in CURRICULUM.md's tree; it stays as a second challenge.
    challenges: [{ level: 'coinways', after: 'knapmany' }, { level: 'roll', after: 'knapmix' }],
  },
  {
    id: 'broom', machine: 'broom',
    foundation: ['prefix', 'rising'],
    chapter: { title: T('一格多来路', 'Many ways in'), desc: T('扫描臂扫过一整段格子，来路的数量不再固定。', 'The sweep arm passes over a whole run of cells, so the number of ways in is no longer fixed.') },
    practice: ['stones', 'twoorders', 'parse', 'change'],
    practiceChapter: { title: T('扫帚的问题', 'Problems for Broom'), desc: T('一段由更短的段拼成：短的先算。', 'A run is made of shorter runs: the short ones go first.') },
    topics: [
      { id: 'words', code: 'W', levels: ['wordbreak', 'wordcost', 'segment'], title: T('切单词', 'Cutting words'), desc: T('一串没有空格的字母，切成词典里的词。', 'A string with no spaces, cut into dictionary words.') },
    ],
    challenges: [{ level: 'maxsub', after: 'rising' }],
  },
  {
    id: 'stack', machine: 'stack',
    foundation: ['robber', 'breach', 'keydoor'],
    chapter: { title: T('状态不够用', 'When the state falls short'), desc: T('一个数记不住的时候，就多记一件事。', 'When one number can’t remember enough, remember one more thing.') },
    practice: ['stock1', 'cooldown'],
    practiceChapter: { title: T('千层的问题', 'Problems for Layercake'), desc: T('每种状态一层。', 'One layer for each state.') },
    challenges: [{ level: 'ring', after: 'robber' }],
    topics: [
      { id: 'state', code: 'D', levels: ['twokeys', 'threekeys', 'enough'], title: T('设计状态', 'Designing the state'), desc: T('该记住什么，这次由你决定。', 'This time, you decide what to remember.') },
    ],
  },
  {
    id: 'settle', machine: 'loop',
    foundation: ['loop'],
    chapter: { title: T('扫到不再变', 'Scan until it settles'), desc: T('箭头绕成了圈，就一遍一遍地扫。', 'When the arrows loop round, scan again and again.') },
    practice: ['value', 'arrows'],
    practiceChapter: { title: T('格子世界', 'A grid world'), desc: T('每一格有多好，取决于从这里走得到的最好的格子。', 'How good a cell is depends on the best cell you can reach from it.') },
    topics: [
      { id: 'value', code: 'V', levels: ['treasure', 'slip', 'ice'], title: T('格子世界', 'The grid world'), desc: T('机器人在格子里找宝藏，越远的宝藏越不值钱。', 'The robot hunts for treasure on a grid, and the further it is, the less it is worth.') },
    ],
  },
  {
    id: 'graduate', machine: null,
    foundation: ['disguise'],
    chapter: { title: T('毕业', 'Graduation'), desc: T('认出伪装起来的老朋友。', 'Recognise old friends in disguise.') },
  },
];

/**
 * A level's number, as in CURRICULUM.md: on an era's main path the era and its place ('1-4'; the foundation runs on
 * into the practice), in a topic the topic's letter and its place ('S2'), and C1, C2… for an era's challenges.
 */
export const LABELS = new Map(ERAS.flatMap((era, e) => [
  ...[...era.foundation, ...(era.practice ?? [])].map((id, k) => [id, `${e}-${k + 1}`]),
  ...(era.topics ?? []).flatMap(t => t.levels.map((id, k) => [id, `${t.code}${k + 1}`])),
  ...(era.challenges ?? []).map((c, k) => [c.level, `C${k + 1}`]),
]));

/** Levels the new tree leaves out: written, but not played. */
export const RETIRED = ['light', 'merge', 'relay', 'dial', 'swap', 'back', 'why', 'askall', 'memo2', 'selforder'];

/** The map's chapters, one per era in play order: named after the era's robot (or the era's own title where there is
 *  none), its levels in groups: the foundation, the practice, each topic, then the challenges. */
export const CHAPTERS = ERAS.map((era, e) => ({
  era: era.id,
  kicker: era.id === 'graduate' ? T('最后', 'Last') : lazy(() => tr(`第 ${e} 代`, `Era ${e}`)),
  name: era.machine ? ROBOTS[era.machine].name : era.chapter.title,
  desc: era.chapter.desc,
  groups: [era.foundation, era.practice ?? [], ...(era.topics ?? []).map(t => t.levels), (era.challenges ?? []).map(c => c.level)].filter(g => g.length),
  levels: [...era.foundation, ...(era.practice ?? []), ...(era.topics ?? []).flatMap(t => t.levels), ...(era.challenges ?? []).map(c => c.level)],
}));
