export { createSceneRenderer } from './svg.js'
import { createSceneRenderer } from './svg.js'
export function register(kernel) { kernel.display('table:scene', createSceneRenderer) }
