
import '../image.css'
import { imageHero, imageIntroduction } from './intro.js'
import { imageCircuit } from './circuit.js'
import { rangeOf } from './display.js'
import { familyOf, iconOf } from './catalog.js'
import { WeightGrid } from 'circuit/view'

export const displays = {
  'image:hero': imageHero,
  'image:introduction': imageIntroduction,
  'image:circuit': imageCircuit,
  'image:widget-imageKernel': WeightGrid,
  'image:catalog': { familyOf, iconOf },
  'image:probe': ({ probe }) => ({ ...probe, rangeFor: rangeOf }),
}
