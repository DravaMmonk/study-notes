import { blank, fitted, picksOf } from 'table'
import { createRobotCircuits } from '../../core/circuits.js'
import { robotWiring, withDesktopAnchors } from './board.js'
export const robotCircuits = table => createRobotCircuits(table, { wire: robotWiring, place: withDesktopAnchors })

export const freshBoard = (task) => withDesktopAnchors(fitted(blank(), task.given))
export const hasSensors = (board) => board.nodes.some((node) => picksOf(node).length)
