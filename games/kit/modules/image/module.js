import { IMAGE_OPS } from './engine/definitions.js'
import { vocabulary } from './vocabulary.js'

export default {
  id: 'image',
  register(registry) {
    registry.vocabulary('image', vocabulary)
    registry.implementOperations(IMAGE_OPS)
    registry.add('valueType', 'image:image', { about: { en: 'An image or scalar image with named colour channels', zh: '带颜色通道的图像或标量图像' } })
    registry.add('contentKind', 'image:power', { about: { en: 'Power-on introduction', zh: '上电导语' }, schema: vocabulary.game.fields.power })
    registry.add('contentKind', 'image:box', { about: { en: 'Piece preview configuration', zh: '元件预览配置' }, schema: vocabulary.game.fields.box })
    registry.add('contentKind', 'image:quote', { about: { en: 'A quoted name', zh: '引用的名字' }, schema: { type: 'str' } })
    registry.add('board', 'image:graph', { about: { en: 'Image data-flow circuit', zh: '图像数据流电路' }, valueTypes: ['image:image'] })
  },
}
