import { playGame } from '../../shell/plays/Play.jsx'
import { spec } from './domain.js'
import { plays } from './plays.js'
import { loadDisplays } from '../../engine/displays.js'

const ui = await loadDisplays(['rows:sums'])

export default (content) => playGame(content, spec(content), plays, { sums: ui['rows:sums'] })
