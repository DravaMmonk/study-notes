// The worlds a circuit runs in, by name. The world machinery (world(), runCircuit, the robot's window) is in world.js;
// each world lives with its relatives in worlds/.

import { grid, gridYes, piles, tri, lawn } from './worlds/grid.js';
import { strip, pile, coins, words, pieces } from './worlds/line.js';
import { rob1, rob2, ring, prefix, heights, gains } from './worlds/street.js';
import { layerMaze, keysMaze } from './worlds/maze.js';
import { river } from './worlds/river.js';
import { stock } from './worlds/stock.js';
import { align, local } from './worlds/align.js';
import { knap, roll } from './worlds/knap.js';
import { interval } from './worlds/interval.js';
import { vgrid } from './worlds/value.js';
import { tags } from './worlds/tags.js';
import { pic } from './worlds/picture.js';

export { visibleSensors, sensorsOf, windowOf, runCircuit, MAX_ROUNDS } from './world.js';

export const WORLDS = { grid, gridYes, piles, tri, lawn, strip, pile, coins, words, pieces, rob1, rob2, ring, prefix, heights, gains, layers: layerMaze, keys: keysMaze, river, stock, align, local, knap, roll, interval, vgrid, tags, pic };
