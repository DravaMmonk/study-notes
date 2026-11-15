// The games on the hub page. Each games/<id>/game.json selects a course from a content package.
// `title` is the Chinese name and `en` the English one; topic and desc are { zh, en } pairs (hub.js picks one).
// `levels` is how many levels the game has, as its spec lists them; `npm run check` fails when the two differ.
// `page` is the game's own page (games/kit/app): the path drawn on its tab icon and its description for search engines.
// `dev` marks a game still in development: its card says so. `hidden` keeps a page off the hub (a trial reached by
// its address alone); it is still built and published like any game.

export const GAMES = [
  {
    id: 'vision-complete', href: 'vision-complete/index.html', title: '视觉完备', en: 'Vision Complete', topic: { zh: '计算机视觉', en: 'Computer Vision' },
    desc: {
      zh: '从把图像挪一格开始。亲手接线实现模糊、寻找边缘和角点，再从两张图像估计深度。',
      en: 'Start by shifting an image one pixel. Wire together components to blur images, find edges and corners, and measure depth from two views.',
    },
    levels: 151, art: 'pipeline',
    page: { icon: 'M14 20h10v10H14zM40 34h10v10H40zM24 25h16v14', description: '视觉完备 Vision Complete：用图像处理元件接线解谜。A computer vision puzzle game built around wiring image-processing circuits.' },
  },
  {
    id: 'state-graph', href: 'state-graph/index.html', title: '状态之图', en: 'State Graph', topic: { zh: '动态规划', en: 'Dynamic Programming' },
    desc: {
      zh: '不需要任何编程或算法基础。从格子和箭头出发，让一个小机器人在棋盘上一格一格地算，拼出数路线、比文字、装背包的电路板，再用到博弈、语言、图片和强化学习上。',
      en: 'No programming or algorithms background needed. Starting from cells and arrows, a little robot works across a board cell by cell while you wire up the circuit boards that count routes, compare words and pack a backpack, then carry them over to games, language, pictures and reinforcement learning.',
    },
    levels: 69, art: 'grid',
    page: { icon: 'M14 14h10v10H14zM40 40h10v10H40zM24 19h21v21', description: '状态之图 State Graph：零基础动态规划解谜游戏。Dynamic programming puzzles for complete beginners.' },
  },
  {
    id: 'qed', href: 'qed/index.html', title: '证明完毕', en: 'Q.E.D.', topic: { zh: '形式化证明', en: 'Formal Proof' },
    desc: {
      zh: '不需要任何逻辑学基础。从真值表开始，把推理规则当成元件，一块一块搭出证明；造出假设框，再去岛上分辨骑士和无赖。',
      en: 'No logic background needed. Starting from truth tables, wire up proofs with rules of inference as parts; get an assumption box, then sort the knights from the knaves on an island.',
    },
    levels: 230, art: 'detach', dev: true,
    page: { icon: 'M14 16h14v10H14zM36 38h14v10H36zM28 21h15v17', description: '证明完毕 Q.E.D.：把形式化证明做成一套解谜关卡。Formal proof as a set of puzzle levels.' },
  },
  {
    id: 'comp90086', href: 'comp90086/index.html', title: '计算机视觉笔记', en: 'Computer Vision Notes', topic: { zh: 'COMP90086 笔记版', en: 'COMP90086 notes edition' },
    desc: { zh: '嵌在 COMP90086 笔记里的交互：每个知识点动手一次，先预测，再看结果。', en: 'The interactions inside the COMP90086 notes: try each idea once, predicting first and then seeing what happens.' },
    levels: 3, art: 'pipeline', hidden: true,
    page: { icon: 'M16 32h32M32 16v32', description: '计算机视觉笔记 Computer Vision Notes：COMP90086 笔记里的交互。The interactions inside the COMP90086 notes.' },
  },
];
