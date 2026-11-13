import { resolve } from 'node:path'

/** Resolve the entry of a domain. Declarative domains have a plain JavaScript entry. */
export function gameModule(domains, name) {
  return resolve(domains, name, 'game.js')
}
