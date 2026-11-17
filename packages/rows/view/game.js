import { playGame } from 'kernel/view'
import { spec } from '../core/runtime.js'
import { plays } from '../core/plays.js'
import { displays as ui } from './displays.js'



export default (content, works = spec(content)) => playGame(content, works, plays, { sums: ui['rows:sums'] })
