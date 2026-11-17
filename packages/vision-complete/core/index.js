import { S } from 'kernel'
import { displayItems } from 'image'
import { extendVocabulary } from 'image'
import { imageItems } from './image-items.js'
export function register(kernel) {
  kernel.kind('vision-complete:power', { type: 'vision-complete/power', read: value => value, configuration: { power: 'course.json' },
    vocabulary: base => ({ ...base, game: S.obj({ ...base.game.fields, power: S.opt(S.name('vision-complete/power')) }) }),
  })
  kernel.kind('vision-complete:box', { type: 'vision-complete/box', read: value => value, configuration: { box: 'course.json' },
    vocabulary: base => ({ ...base, game: S.obj({ ...base.game.fields, box: S.opt(S.name('vision-complete/box')) }) }),
  })
  kernel.kind('vision-complete:imageItems', {
    type: 'level', read: value => value, derived: ['imageItems'],
    assemble: () => ({ imageItems }),
    vocabulary(base) {
      const items = (all, schema) => Object.fromEntries(Object.entries(all).map(([name, item]) => [name, schema(item)]))
      return extendVocabulary(base, { module: 'vision-complete', kinds: {
        scene: items(imageItems.scenes, item => ({ about: item.about, params: item.setup, test: item.test })),
        benchModel: items(imageItems.benches, item => ({ about: item.about, params: item.setup, stage: item.stage, case: item.case })),
        display: Object.fromEntries(Object.entries(displayItems(imageItems.displays)).filter(([name]) => name.startsWith('vision-complete:'))),
      } })
    },
  })
}
