// A circuit game's course, from its course configuration and content package ( vocabulary.js says what
// may be in it), read by the circuit base (../../engine/board-course.js definedCourse): the play order and level
// tree from its eras, each level's tasks with their tests, reference boards and naive boards, the game's parts as its
// pieces.json defines them over the domain's engine resources (ops.js), and the parts its levels build (each running
// the board the player passed its level's last task with).
import { definedCourse } from '../../engine/board-course.js'
import { board } from './board.js'
import { OPS } from './ops.js'

export const circuitCourse = (content) => definedCourse(content, { board, ops: OPS })
