import '../logic.css'
import Hero from './Hero.jsx'
import { proofScreen } from './proof.js'
import { gatesScreen } from './gates.js'
import { machineScreen } from './machine.js'
import { declaredLines } from '../iso.js'

export const displays = {
  'logic:hero': Hero,
  'logic:proof-screen': proofScreen,
  'logic:gates-screen': gatesScreen,
  'logic:machine-screen': machineScreen,
  'logic:passed': declaredLines,
}
