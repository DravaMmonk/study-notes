import { createSceneRenderer } from 'table/view'
import { W } from '../../core/model/scene.js'
import { ROBOTS } from '../../core/model/robots.js'
import { ICONS } from './glyphs.js'
export const { sceneSVG, robotGlyph, MARKS, markOf } = createSceneRenderer({ W, robots: ROBOTS, icons: ICONS })
