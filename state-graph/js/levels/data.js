// Puzzle data shared by several levels.

export const L5_CELLS = [
  { id: 'H', x: 0, y: 0, label: '家' }, { id: 'A', x: -75, y: 105, label: '书店' }, { id: 'B', x: 75, y: 105, label: '公园' },
  { id: 'C', x: -130, y: 210, label: '邮局' }, { id: 'D', x: 0, y: 210, label: '广场' }, { id: 'E', x: 130, y: 210, label: '菜场' },
  { id: 'F', x: -65, y: 315, label: '车站' }, { id: 'G', x: 65, y: 315, label: '图书馆' }, { id: 'T', x: 0, y: 420, label: '学校' },
];
export const L5_EDGES = [['H', 'A'], ['H', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'F'], ['D', 'G'], ['E', 'G'], ['F', 'T'], ['G', 'T']];
export const L12_COSTS = [[5, 1, 4, 2], [2, 8, 1, 3], [1, 1, 6, 1], [7, 2, 1, 4]];
export const STREET = [2, 7, 9, 3, 1];
export const KEY_MAPS = [
  { R: 3, C: 4, key: [1, 0], doors: [[1, 2]] },
  { R: 4, C: 4, key: [2, 0], doors: [[1, 1], [3, 2]] },
  { R: 4, C: 5, key: [1, 0], doors: [[0, 3], [2, 2], [3, 1]] },
];
export const PACK_A = { W: 5, items: [{ n: '帐篷', w: 4, v: 5 }, { n: '相机', w: 2, v: 3 }, { n: '水壶', w: 3, v: 4 }, { n: '零食', w: 1, v: 1 }] };
export const PACK_B = { W: 10, items: [{ n: '睡袋', w: 6, v: 30 }, { n: '炉具', w: 3, v: 14 }, { n: '帐篷', w: 4, v: 16 }, { n: '急救包', w: 2, v: 9 }, { n: '书', w: 1, v: 1 }] };
export const PACK_C = { W: 7, items: [{ n: '相机', w: 3, v: 4 }, { n: '水壶', w: 4, v: 5 }, { n: '零食', w: 2, v: 3 }] };
