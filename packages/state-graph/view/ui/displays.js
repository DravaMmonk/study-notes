import { createElement } from 'react'
import './table.css'
import Hero from './hero.jsx'
import { sceneSVG } from './svg.js'
import { robotScreenFor } from './circuitScreen.js'
import { handResources } from './modes/index.js'
import { partDemo } from './partDemo.js'
import { lookIcon } from './looks.js'

function IntroFigure({ fig }) {
  return createElement('div', { className: 'fig', dangerouslySetInnerHTML: { __html: sceneSVG(fig, { pad: 12, maxScale: 1.3 }) } })
}

export const displays = {
  'state-graph:hero': Hero,
  'state-graph:introduction': IntroFigure,
  'state-graph:circuit': robotScreenFor,
  'state-graph:manual': handResources,
  'state-graph:catalog': { partDemo, lookIcon },
}
