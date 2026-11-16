import { IMAGE_OPS } from './engine/definitions.js'
import { vocabulary } from './vocabulary.js'

export default {
  id: 'image',
  register(registry) {
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
    registry.add('contentKind', 'image:power', { about: { en: 'Power-on introduction', zh: '上电导语' }, schema: vocabulary.game.fields.power })
    registry.add('contentKind', 'image:box', { about: { en: 'Piece preview configuration', zh: '元件预览配置' }, schema: vocabulary.game.fields.box })
    registry.add('contentKind', 'image:quote', { about: { en: 'A quoted name', zh: '引用的名字' }, schema: { type: 'str' } })
    registry.add('board', 'image:graph', { about: { en: 'Image data-flow circuit', zh: '图像数据流电路' }, valueTypes: ['image:image'] })
  },
}
