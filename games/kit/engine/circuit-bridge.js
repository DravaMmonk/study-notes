// Temporary dependency bridge for modules scheduled to leave the kernel in MODULES.md steps 6–9.
import { grants } from '../../../packages/circuit/core/index.js'
import { symbolGrant } from '../modules/logic/grants.js'
export function registerCircuitConsumers() {
  if (!grants.types.has(symbolGrant.type)) grants.register(symbolGrant)
}
