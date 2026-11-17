export { mountDetach } from './detach.js'
import Hero from './Hero.jsx'
export const displays = { 'qed:hero': Hero }
export function register(kernel) {
  kernel.display('qed:hero', Hero)
}
