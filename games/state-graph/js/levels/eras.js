// 状态之图's course by era (games/DESIGN.md): one robot per era. Its main path is a foundation that teaches what it can
// do and unlocks its parts, practice problems in order of difficulty, and its topic series (one per robot for now),
// growing from a small version of its finale; beside it, challenges that push what the robot can already do. The play
// order, the map's chapters and what each level requires all come from here (../../../kit/course.js layout). The
// foundation, the practice and each topic are a chapter on the map ({ title, desc }: its question); a challenge sits
// in the chapter of the level it hangs on.
import { T } from '../i18n.js';

export const ERAS = [
  {
    id: 'paper', machine: null,
    foundation: ['trace', 'lastStep', 'city'],
    chapter: { title: T('格子与箭头', 'Cells and arrows'), desc: T('用小问题的答案，拼出大问题的答案。', 'Build the answer to a big problem out of the answers to small ones.') },
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
    // Until this era is rebuilt (CURRICULUM.md 第 2 代): 回文 and 倒着扫 wait at the start of its practice.
    foundation: ['stairs', 'order'],
    chapter: { title: T('看得更远', 'Seeing further'), desc: T('视野从 3×3 变成 5×5：一格能用上两步之外的格子。', 'The view grows from 3×3 to 5×5: a cell can use cells two steps away.') },
    practice: ['palin', 'dial', 'nim', 'link', 'lcs'],
    practiceChapter: { title: T('远望的问题', 'Problems for Farsight'), desc: T('一个词放上面，一个词放左边；输赢也能填表。', 'One word along the top, the other down the left; winning fits in a table too.') },
    topics: [
      { id: 'edit', code: 'E', levels: ['edit', 'spell'], title: T('改错字', 'Fixing typos'), desc: T('把一个词改成另一个，最少要几步？', 'How few edits turn one word into another?') },
    ],
    challenges: [{ level: 'localalign', after: 'lcs' }, { level: 'piles', after: 'nim' }],
  },
  {
    id: 'reach', machine: 'reach',
    foundation: ['pack', 'knaptable'],
    chapter: { title: T('伸长手臂', 'A longer arm'), desc: T('伸缩臂能够到任意远的一格。', 'A telescopic arm reaches a cell however far away.') },
    practice: ['tagging', 'forward'],
    practiceChapter: { title: T('长臂的问题', 'Problems for Longarm'), desc: T('同一副骨架，用在词和句子上。', 'The same skeleton, on words and sentences.') },
    topics: [
      { id: 'knapsack', code: 'K', levels: ['knapmany', 'knapmix'], title: T('装背包', 'Packing a backpack'), desc: T('有的东西只有一件，有的要多少有多少。', 'Some things come once, some in any number.') },
    ],
    challenges: [{ level: 'roll', after: 'knapmix' }],
  },
  {
    id: 'broom', machine: 'broom',
    foundation: ['prefix', 'rising'],
    chapter: { title: T('一格多来路', 'Many ways in'), desc: T('扫描臂扫过一整段格子，来路的数量不再固定。', 'The sweep arm passes over a whole run of cells, so the number of ways in is no longer fixed.') },
    practice: ['change', 'wordbreak', 'parse'],
    practiceChapter: { title: T('扫帚的问题', 'Problems for Broom'), desc: T('最后一块切在哪里？', 'Where does the last piece start?') },
    topics: [
      { id: 'interval', code: 'I', levels: ['stones', 'twoorders'], title: T('先算谁', 'Who goes first'), desc: T('一段由更短的段拼成：短的先算。', 'A run is made of shorter runs: the short ones go first.') },
    ],
  },
  {
    id: 'stack', machine: 'stack',
    foundation: ['robber', 'breach', 'keydoor'],
    chapter: { title: T('状态不够用', 'When the state falls short'), desc: T('一个数记不住的时候，就多记一件事。', 'When one number can’t remember enough, remember one more thing.') },
    topics: [
      { id: 'state', code: 'D', levels: ['twokeys', 'threekeys', 'enough'], title: T('设计状态', 'Designing the state'), desc: T('该记住什么，这次由你决定。', 'This time, you decide what to remember.') },
    ],
  },
  // Until 回环 is built (CURRICULUM.md 第 6 代): the levels that scan in rounds, on 小方.
  {
    id: 'settle', machine: null,
    foundation: ['loop'],
    chapter: { title: T('扫到不再变', 'Scan until it settles'), desc: T('箭头绕成了圈，就一遍一遍地扫。', 'When the arrows loop round, scan again and again.') },
    practice: ['value', 'arrows'],
    practiceChapter: { title: T('格子世界', 'A grid world'), desc: T('每一格有多好，取决于从这里走得到的最好的格子。', 'How good a cell is depends on the best cell you can reach from it.') },
    challenges: [{ level: 'slip', after: 'arrows' }],
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
export const RETIRED = ['light', 'merge', 'relay', 'swap', 'back', 'why', 'askall', 'memo2', 'selforder'];

/** The map's chapters, in play order: each era's foundation, its practice, then its topics; a challenge joins its
 *  anchor's chapter. */
export const SECTIONS = ERAS.flatMap(era => {
  const sections = [
    { era: era.id, levels: [...era.foundation], name: era.chapter.title, desc: era.chapter.desc },
    ...(era.practice?.length ? [{ era: era.id, levels: [...era.practice], name: era.practiceChapter.title, desc: era.practiceChapter.desc }] : []),
    ...(era.topics ?? []).map(t => ({ era: era.id, topic: t.id, levels: [...t.levels], name: t.title, desc: t.desc })),
  ];
  for (const c of era.challenges ?? []) (sections.find(s => s.levels.includes(c.after)) ?? sections[0]).levels.push(c.level);
  return sections;
});
