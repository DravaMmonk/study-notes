import * as play from '../run.js'
import { street } from './street.js'

// What the market domain declares of its screen (../../../shell/CircuitScreen.jsx circuitScreen): each shop's price
// and what it showed the tick before down the left, each shop's price down the right; by the results, the street as a
// chart a shop (street.js).
export const screen = {
  play,
  says: (r) => r.error ?? r.fail?.why,
  registers: { registers: [], top: 9, numbers: true },
  scene: street,
}
