import { playGame } from '../../shell/plays/Play.jsx'
import { spec } from './runtime.js'
import { plays } from './plays.js'
import { sums } from './sums.js'

export default (content) => playGame(content, spec(content), plays, { sums })
