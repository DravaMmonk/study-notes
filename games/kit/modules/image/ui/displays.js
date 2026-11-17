import '../../../../../trace-viewer/src/index.css'
import '../image.css'
import { imageHero, imageIntroduction } from './intro.js'
import { imageCircuit } from './circuit.js'
import { rangeOf } from './display.js'
import { familyOf, iconOf } from './catalog.js'
import { WeightGrid } from '../../../../../packages/circuit/view/index.jsx'

export const displays = {
  'image:hero': imageHero,
  'image:introduction': imageIntroduction,
  'image:circuit': imageCircuit,
  'image:widget-imageKernel': WeightGrid,
  'image:catalog': { familyOf, iconOf },
  'image:probe': ({ probe }) => ({ ...probe, rangeFor: rangeOf }),
}
