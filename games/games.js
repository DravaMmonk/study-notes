// The games on the hub page. To add a game, put it in its own folder under games/ and add an entry here.
// progress() reads the game's own save in this browser (all games share the site's origin) and returns
// how many levels are done; a game without a save reads as 0.
// `title` is the Chinese name and `en` the English one; topic and desc are { zh, en } pairs (hub.js picks one).
// `page` is the game's own page (games/kit/app): the path drawn on its tab icon and its description for search engines.

const read = key => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } };

export const GAMES = [
  {
    id: 'vision-complete', href: 'vision-complete/index.html', title: '视觉完备', en: 'Vision Complete', topic: { zh: 'COMP90086 · 计算机视觉', en: 'COMP90086 · Computer Vision' },
    desc: {
      zh: '没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。',
      en: 'No lectures, just components, tests and a set of inputs and outputs. Start from “shift the image by one pixel”, build blur, edges, corners and disparity yourself, and end up teaching the machine to see.',
    },
    levels: 58, art: 'pipeline',
    page: { icon: 'M14 20h10v10H14zM40 34h10v10H40zM24 25h16v14', description: '视觉完备 Vision Complete：把计算机视觉课程做成一套解谜关卡。A computer vision course turned into a set of puzzle levels.' },
    progress: () => (read('vision-complete.v1')?.solved || []).length,
  },
  {
    id: 'state-graph', href: 'state-graph/index.html', title: '状态之图', en: 'State Graph', topic: { zh: '从零开始 · 动态规划', en: 'From scratch · Dynamic Programming' },
    desc: {
      zh: '不需要任何编程或算法基础。从格子和箭头出发，让一个小机器人在棋盘上一格一格地算，拼出数路线、比文字、装背包的电路板，再用到博弈、语言、图片和强化学习上。',
      en: 'No programming or algorithms background needed. Starting from cells and arrows, a little robot works across a board cell by cell while you wire up the circuit boards that count routes, compare words and pack a backpack, then carry them over to games, language, pictures and reinforcement learning.',
    },
    levels: 69, art: 'grid',
    page: { icon: 'M14 14h10v10H14zM40 40h10v10H40zM24 19h21v21', description: '状态之图 State Graph：零基础动态规划解谜游戏。Dynamic programming puzzles for complete beginners.' },
    // Saved by the shared game shell under <id>.v1; saves from before it under state-graph-v2.
    progress: () => (read('state-graph.v1')?.solved || Object.keys(read('state-graph-v2')?.done || {})).length,
  },
];
