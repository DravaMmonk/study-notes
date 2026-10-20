// Puzzle data shared by several levels.

import { T } from '../../kit/domains/table/i18n.js';

export const L5_CELLS = [
  { id: 'H', x: 0, y: 0, label: T('家', 'Home') }, { id: 'A', x: -75, y: 105, label: T('书店', 'Books') }, { id: 'B', x: 75, y: 105, label: T('公园', 'Park') },
  { id: 'C', x: -130, y: 210, label: T('邮局', 'Post') }, { id: 'D', x: 0, y: 210, label: T('广场', 'Square') }, { id: 'E', x: 130, y: 210, label: T('菜场', 'Market') },
  { id: 'F', x: -65, y: 315, label: T('车站', 'Station') }, { id: 'G', x: 65, y: 315, label: T('图书馆', 'Library') }, { id: 'T', x: 0, y: 420, label: T('学校', 'School') },
];
export const L5_EDGES = [['H', 'A'], ['H', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'F'], ['D', 'G'], ['E', 'G'], ['F', 'T'], ['G', 'T']];
export const L12_COSTS = [[5, 1, 4, 2], [2, 8, 1, 3], [1, 1, 6, 1], [7, 2, 1, 4]];
export const STREET = [2, 7, 9, 3, 1];
export const KEY_MAPS = [
  { R: 3, C: 4, key: [1, 0], doors: [[1, 2]] },
  { R: 4, C: 4, key: [2, 0], doors: [[1, 1], [3, 2]] },
  { R: 4, C: 5, key: [1, 0], doors: [[0, 3], [2, 2], [3, 1]] },
];
export const PACK_A = { W: 5, items: [{ n: T('帐篷', 'tent'), w: 4, v: 5 }, { n: T('相机', 'camera'), w: 2, v: 3 }, { n: T('水壶', 'bottle'), w: 3, v: 4 }, { n: T('零食', 'snacks'), w: 1, v: 1 }] };
export const PACK_B = { W: 10, items: [{ n: T('睡袋', 'sleeping bag'), w: 6, v: 30 }, { n: T('炉具', 'stove'), w: 3, v: 14 }, { n: T('帐篷', 'tent'), w: 4, v: 16 }, { n: T('急救包', 'first aid kit'), w: 2, v: 9 }, { n: T('书', 'book'), w: 1, v: 1 }] };
export const PACK_C = { W: 7, items: [{ n: T('相机', 'camera'), w: 3, v: 4 }, { n: T('水壶', 'bottle'), w: 4, v: 5 }, { n: T('零食', 'snacks'), w: 2, v: 3 }] };
