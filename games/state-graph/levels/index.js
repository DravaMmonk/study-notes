// 状态之图's course: every level, its eras (eras.js), the parts it starts from and the parts solving its levels leaves.
// The table domain (kit/domains/table/course.js) puts them in play order and derives what every level shares.
import { tableCourse } from '../../kit/domains/table/course.js';
import { basics } from './basics.js';
import { machines } from './machines.js';
import { state } from './state.js';
import { strings } from './strings.js';
import { knapsack } from './knapsack.js';
import { skeleton } from './skeleton.js';
import { sweep } from './sweep.js';
import { orders } from './orders.js';
import { states } from './states.js';
import { topdown } from './topdown.js';
import { rounds } from './rounds.js';
import { language } from './language.js';
import { seams } from './seams.js';
import { graduate } from './graduate.js';
import { boxy } from './boxy.js';
import { farsight } from './farsight.js';
import { longarm } from './longarm.js';
import { broom } from './broom.js';
import { layercake } from './layercake.js';
import { loopLevels } from './loop.js';
import { ERAS, RETIRED } from './eras.js';
import { PARTS } from './parts.js';

/**
 * The parts the course starts from. Dynamic programming is about tables, states and orders, not arithmetic, so the
 * arithmetic and logic are primitives: each enters in a level of its own (the merger and its models, the constant
 * and pass gate together, the block gate, the adder, not, the comparator, the divider, the multiplier). What the
 * player builds are boards, packaged as parts once solved (a level's `blueprint`).
 */
export const PRIMITIVES = ['msum', 'mmin', 'mmax', 'many', 'const', 'pass', 'block', 'add', 'not', 'mul'];

export const TABLE = tableCourse({ eras: ERAS, levels: [...basics, ...machines, ...boxy, ...farsight, ...longarm, ...broom, ...layercake, ...loopLevels, ...state, ...strings, ...knapsack, ...skeleton, ...sweep, ...orders, ...states, ...topdown, ...rounds, ...language, ...seams, ...graduate], retired: RETIRED, parts: PARTS, primitives: PRIMITIVES });
export const { LEVELS, REQUIRES, TRACKS, CHAPTERS, LABELS, course } = TABLE;
