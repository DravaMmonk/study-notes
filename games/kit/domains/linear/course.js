// A linear game's course, from its content (games/<id>/: game.json, levels, glossary, parts.json; vocabulary.js says what
// may be in it), read by the circuit base (../../engine/board-course.js definedCourse): the play order and level
// tree from its eras, each level's tasks with their tests, reference boards and naive boards, the game's parts as its
// parts.json defines them over the domain's engine resources (ops.js), and the parts its levels build (each running
// the board the player passed its level's last task with). A test's values are read as values on the wires (values.js); a matrix whose rows differ in length is reported.
import { definedCourse } from '../../engine/board-course.js'
import { board } from './board.js'
import { OPS } from './ops.js'
import { fromContent } from './values.js'

const read = (v, name, say) => {
  if (Array.isArray(v) && Array.isArray(v[0]) && v.some((row) => row.length !== v[0].length)) say(`${name}: the rows of a matrix differ in length`)
  return fromContent(v)
}

export const linearCourse = (content) => definedCourse(content, { board, ops: OPS, read })
