// The worlds a circuit runs in, by name. The world machinery (world(), runCircuit, the robot's window) is in world.js;
// each world lives with its relatives in worlds/.

import { grid, gridYes, piles } from './worlds/grid.js';
import { strip, pile, coins, words } from './worlds/line.js';
import { rob1, rob2, prefix, heights } from './worlds/street.js';
import { keyMaze, keysMaze } from './worlds/maze.js';
import { align, local } from './worlds/align.js';
import { knap, roll } from './worlds/knap.js';
import { interval } from './worlds/interval.js';
import { vgrid } from './worlds/value.js';
import { tags } from './worlds/tags.js';

export { visibleTaps, readTap, windowOf, runCircuit, MAX_ROUNDS } from './world.js';

export const WORLDS = { grid, gridYes, piles, strip, pile, coins, words, rob1, rob2, prefix, heights, key: keyMaze, keys: keysMaze, align, local, knap, roll, interval, vgrid, tags };
