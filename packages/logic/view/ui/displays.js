import '../logic.css'
import { proofScreen } from './proof.js'
import { gatesScreen } from './gates.js'
import { machineScreen } from './machine.js'
import { declaredLines } from '../../core/iso.js'

export const displays = {
  'logic:proof-screen': proofScreen,
  'logic:gates-screen': gatesScreen,
  'logic:machine-screen': machineScreen,
  'logic:passed': declaredLines,
}
