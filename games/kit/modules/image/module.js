import { registerContentKinds } from '../../engine/content-kinds.js'
import { IMAGE_OPS } from './engine/definitions.js'
import { vocabulary } from './vocabulary.js'

export default {
  id: 'image',
  register(registry) {
    registerContentKinds(registry, 'image')
    registry.vocabulary('image', vocabulary)
    registry.add('display', 'image:hero', { about: { en: 'Image course map illustration' }, role: 'hero' })
    registry.add('display', 'image:introduction', { about: { en: 'Image introduction figure' }, role: 'figure' })
    registry.add('display', 'image:circuit', { about: { en: 'Image circuit cards, readouts and panels' }, role: 'circuit' })
    registry.add('display', 'image:catalog', { about: { en: 'Image card presentation' }, role: 'catalog' })
    registry.add('display', 'image:probe', { about: { en: 'Image probe presentation' }, role: 'probe' })
    registry.implementDisplays(['image:hero', 'image:introduction', 'image:circuit', 'image:widget-imageKernel', 'image:catalog', 'image:probe'], '../modules/image/ui/displays.js')
    registry.implementDisplays(Object.keys(vocabulary.kinds.display), '../modules/image/ui/benches/displays.js')
    registry.implementOperations(IMAGE_OPS)
    registry.add('valueType', 'image:image', { about: { en: 'An image or scalar image with named colour channels', zh: '带颜色通道的图像或标量图像' } })
    registry.add('board', 'image:graph', { about: { en: 'Image data-flow circuit', zh: '图像数据流电路' }, valueTypes: ['image:image'] })
  },
}
