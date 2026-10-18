// Designing the state (千层's topic): keys and doors of several colours. The level fixes which keys the state
// remembers, and the table has one layer for every set of them a route could hold; the robot works every layer of
// every cell, and where a key is picked up its probe reaches the layer the routes come from.

import { circ } from '../circuit/components.js';
import { T } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
const FACTS = ['start', 'gain', 'lose', 'shut'];
/** One board for every layer and every maze: count the routes here, stop them at a shut door and where they move on
 *  with a key, and where a key is picked up, take in the routes from the layer without it (up and left there). */
export const KEY_BOARD = circ([['c', 'bp:stamp'], ['b1', 'block'], ['b2', 'block'], ['p', 'msum'], ['g', 'pass'], ['m', 'msum']], [
  'tap:up>c:0', 'tap:left>c:1', 'tap:start>c:2', 'tap:shut>b1:0', 'c>b1:1', 'tap:lose>b2:0', 'b1>b2:1',
  'tap:upPrev>p:0', 'tap:leftPrev>p:1', 'tap:gain>g:0', 'p>g:1', 'b2>m:0', 'g>m:1', 'm>out:cell',
]);

export const states = [
  {
    id: 'twokeys', ch: 13, title: T('两把钥匙', 'Two keys'), short: T('四种可能，四层', 'Four possibilities, four layers'), mode: 'circuit', robot: 'stack',
    intro: [
      { t: T('这一关有<b>红、蓝两把钥匙</b>，也有红门和蓝门。穿过一扇门之前，必须捡过同色的钥匙。', 'This level has <b>a red key and a blue key</b>, and red and blue doors. Before going through a door, you must have picked up the key of its colour.') },
      { t: T('一条路线手里的钥匙有四种可能：都没有、只有红、只有蓝、都有。表就叠成 4 层，每层装着「手里正好有这几把钥匙」的路线。', 'A route can be holding its keys in four ways: none, only red, only blue, or both. So the table is stacked 4 layers deep, each holding the routes “carrying exactly these keys”.') },
    ],
    mission: { goal: T('只能往右或往下走。算出合法路线的条数：四层终点的数加起来。', 'Only right or down. Work out the number of valid routes: the end cells of the four layers, added up.'), how: T('每一格把四层都算一遍。', 'Every cell works out all four layers.') },
    world: 'keys', facts: FACTS, palette: ['bp:stamp', ...KIT], solutionMem: ['red', 'blue'], noTrace: true,
    tests: [
      { R: 3, C: 4, keys: { red: [1, 0], blue: [0, 2] }, doors: [{ at: [1, 3], color: 'blue' }, { at: [2, 2], color: 'red' }] },
      { R: 4, C: 4, keys: { red: [0, 1], blue: [2, 0] }, doors: [{ at: [2, 2], color: 'red' }, { at: [1, 3], color: 'blue' }, { at: [3, 1], color: 'blue' }] },
    ],
    solution: KEY_BOARD,
    hints: [T('先试试「钥匙与门」的电路板。', 'Try the board from “Keys and doors” first.')],
    debrief: { title: T('状态决定了表的形状', 'The state shapes the table'), body: [T('两把钥匙，四种可能：都没有、只有红、只有蓝、都有。每种可能一层，表就有了 4 层，电路板却一点没变。', 'Two keys, four possibilities: none, only red, only blue, both. One layer for each, so the table has 4 layers, yet the circuit board didn’t change at all.')] },
  },
  {
    id: 'threekeys', ch: 13, title: T('三把钥匙', 'Three keys'), short: T('每多记一件事，表就翻一倍', 'Every extra thing doubles the table'), mode: 'circuit', robot: 'stack',
    intro: [
      { t: T('三把钥匙、三种颜色的门。状态三把都记着：一共几层？', 'Three keys and doors of three colours. The state remembers all three keys: how many layers in all?') },
    ],
    mission: { goal: T('算出合法路线的条数：所有层终点的数加起来。', 'Work out the number of valid routes: the end cells of every layer, added up.'), how: T('每一格把每一层都算一遍。', 'Every cell works out every layer.') },
    world: 'keys', facts: FACTS, palette: ['bp:stamp', ...KIT], solutionMem: ['red', 'blue', 'green'], noTrace: true,
    tests: [
      { R: 4, C: 5, keys: { red: [1, 0], blue: [0, 2], green: [2, 1] }, doors: [{ at: [1, 3], color: 'red' }, { at: [2, 3], color: 'blue' }, { at: [3, 2], color: 'green' }] },
      { R: 4, C: 5, keys: { red: [0, 1], blue: [2, 0], green: [1, 2] }, doors: [{ at: [3, 1], color: 'red' }, { at: [1, 4], color: 'green' }, { at: [2, 3], color: 'blue' }, { at: [3, 3], color: 'green' }] },
    ],
    solution: KEY_BOARD,
    debrief: { title: T('状态爆炸', 'State explosion'), body: [T('三把钥匙，8 层；十把钥匙，1,024 层；二十把，一百多万层。每多记一件事，表就翻一倍。', 'Three keys, 8 layers; ten keys, 1,024; twenty, over a million. Every extra thing remembered doubles the table.')] },
  },
  {
    id: 'enough', ch: 13, title: T('记得够不够', 'Just enough?'), short: T('只记会影响未来的事', 'Remember only what affects the future'), mode: 'circuit', robot: 'stack',
    intro: [
      { t: T('还是三把钥匙。可这一关的状态<b>只记红钥匙</b>，表只有 2 层。', 'Three keys again. But this level’s state <b>remembers only the red key</b>, so the table has just 2 layers.') },
    ],
    mission: { goal: T('算出合法路线的条数，看看只记一把钥匙够不够。', 'Work out the number of valid routes, and see whether remembering one key is enough.'), how: T('每一格把两层都算一遍。', 'Every cell works out both layers.') },
    world: 'keys', facts: FACTS, palette: ['bp:stamp', ...KIT], solutionMem: ['red'], noTrace: true,
    tests: [
      { R: 4, C: 5, keys: { red: [2, 0], blue: [0, 1], green: [1, 3] }, doors: [{ at: [2, 2], color: 'red' }, { at: [0, 2], color: 'blue' }] },
      { R: 5, C: 5, keys: { red: [1, 1], blue: [0, 2], green: [3, 0] }, doors: [{ at: [3, 3], color: 'red' }, { at: [0, 3], color: 'blue' }, { at: [2, 4], color: 'red' }] },
    ],
    solution: KEY_BOARD,
    debrief: { title: T('刚好够用', 'Just enough'), body: [T('绿钥匙没有门；蓝门之前一定先捡到蓝钥匙。这两件事<b>不影响未来</b>，不用记。只记红钥匙，2 层就够了。', 'The green key has no door; the blue door always comes after the blue key. These two things <b>don’t affect the future</b>, so there’s no need to remember them. Remembering only the red key, 2 layers are enough.')] },
  },
];
