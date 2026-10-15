// The games on the hub page. To add a game, put it in its own folder under games/ and add an entry here.
// progress() reads the game's own save in this browser (all games share the site's origin) and returns
// how many levels are done; a game without a save reads as 0.

const read = key => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } };

export const GAMES = [
  {
    id: 'vision-complete', href: 'vision-complete/', title: '视觉完备', en: 'Vision Complete', topic: 'COMP90086 · 计算机视觉',
    desc: '没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。',
    levels: 57, art: 'pipeline',
    progress: () => (read('vision-complete.v1')?.solved || []).length,
  },
  {
    id: 'state-graph', href: 'state-graph/', title: '状态之图', en: 'State Graph', topic: '从零开始 · 动态规划',
    desc: '不需要任何编程或算法基础。从格子和箭头出发，让一个小机器人在棋盘上一格一格地算，拼出数路线、比文字、装背包的电路板。',
    levels: 27, art: 'grid',
    progress: () => Object.keys(read('state-graph-v2')?.done || {}).length,
  },
];
