import { resolve } from 'node:path'

/** Resolve the entry of a domain. Declarative domains have a plain JavaScript entry. */
export function gameModule(domains, name) {
  return name === 'circuit' ? resolve(domains, '../../../../packages/circuit/view/index.jsx') : resolve(domains, name, 'game.js')
}
