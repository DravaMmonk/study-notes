// Temporary dependency bridge for modules scheduled to leave the kernel in MODULES.md steps 7–10.
import { grants } from '../../../packages/circuit/core/index.js'
import { symbolGrant } from '../modules/logic/grants.js'
export function registerCircuitConsumers(provider) {
  const registry = provider?.grants ?? grants
  if (!registry.types.has(symbolGrant.type)) registry.register(symbolGrant)
}
