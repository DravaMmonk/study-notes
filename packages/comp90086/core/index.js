import { S } from 'kernel'
export function register(kernel) {
  kernel.kind('comp90086:power', { type: 'comp90086/power', read: value => value, configuration: { power: 'course.json' },
    vocabulary: base => ({ ...base, game: S.obj({ ...base.game.fields, power: S.opt(S.name('comp90086/power')) }) }),
  })
  kernel.kind('comp90086:box', { type: 'comp90086/box', read: value => value, configuration: { box: 'course.json' },
    vocabulary: base => ({ ...base, game: S.obj({ ...base.game.fields, box: S.opt(S.name('comp90086/box')) }) }),
  })
}
