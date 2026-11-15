import { sceneSVG } from './svg.js'

export function boardDrawing(scene, opt, onPick, className = 'board sg-board') {
  return { markup: sceneSVG(scene, opt), className, onPick }
}
