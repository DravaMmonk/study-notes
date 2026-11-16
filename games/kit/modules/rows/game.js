import { playGame } from '../../shell/plays/Play.jsx'
import { spec } from './runtime.js'
import { plays } from './plays.js'
import { loadDisplays } from '../../engine/displays.js'

const ui = await loadDisplays(['rows:sums'])

export default (content, works = spec(content)) => playGame(content, works, plays, { sums: ui['rows:sums'] })
