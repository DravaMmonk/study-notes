// The worlds a board runs in, by name (the vocabulary's worlds). The world machinery (world(), the robot's window) is in
// world.js; each world lives with its relatives in worlds/.

import { grid, gridYes, piles, tri, lawn } from './worlds/grid.js';
import { strip, pile, coins, pieces } from './worlds/line.js';
import { rob1, rob2, prefix, heights, gains } from './worlds/street.js';
import { ring } from './worlds/ring.js';
import { keysMaze } from './worlds/maze.js';
import { river } from './worlds/river.js';
import { stock } from './worlds/stock.js';
import { align, local } from './worlds/align.js';
import { knap, roll } from './worlds/knap.js';
import { interval } from './worlds/interval.js';
import { vgrid } from './worlds/value.js';
import { tags } from './worlds/tags.js';
import { pic } from './worlds/picture.js';

export { visibleSensors, sensorsOf, windowOf } from './world.js';

export const WORLDS = { grid, gridYes, piles, tri, lawn, strip, pile, coins, pieces, rob1, rob2, ring, prefix, heights, gains, keys: keysMaze, river, stock, align, local, knap, roll, interval, vgrid, tags, pic };
