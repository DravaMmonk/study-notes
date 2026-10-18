// The worlds a circuit runs in, by name. The world machinery (world(), runCircuit, the robot's window) is in world.js;
// each world lives with its relatives in worlds/.

import { grid, gridYes, piles, tri, lawn } from './worlds/grid.js';
import { strip, pile, coins, words } from './worlds/line.js';
import { rob1, rob2, prefix, heights } from './worlds/street.js';
import { layerMaze, keysMaze } from './worlds/maze.js';
import { align, local } from './worlds/align.js';
import { knap, roll } from './worlds/knap.js';
import { interval } from './worlds/interval.js';
import { vgrid } from './worlds/value.js';
import { tags } from './worlds/tags.js';
import { pic } from './worlds/picture.js';

export { visibleSensors, sensorsOf, windowOf, runCircuit, MAX_ROUNDS } from './world.js';

export const WORLDS = { grid, gridYes, piles, tri, lawn, strip, pile, coins, words, rob1, rob2, prefix, heights, layers: layerMaze, keys: keysMaze, align, local, knap, roll, interval, vgrid, tags, pic };
