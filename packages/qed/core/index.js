import { S } from 'kernel'

const vocabularyProjection = Symbol.for('study-notes.qed-vocabulary')

/** QED selects named reading dictionaries; logic also accepts inline dictionaries. */
export function register(kernel) {
  kernel.kind('qed:readings', {
    type: 'qed/wordset', read: value => value,
    configuration: { hero: 'game.json' },
    derived: ['wordSets'],
    assemble: ({ registries }) => ({ wordSets: registries['qed/wordset'] ?? {} }),
    packageConfiguration: ({ content }) => ({ words: Object.keys(content.registries['qed/wordset'] ?? {}) }),
    vocabulary(base) {
      if (base[vocabularyProjection]) return base
      const words = S.list(S.either(S.name('qed/wordset'), S.map(S.text())))
      const bind = schema => !schema || typeof schema !== 'object' ? schema : Array.isArray(schema) ? schema.map(bind) : Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, key === 'words' ? { ...words, ...(value.optional && { optional: true }) } : bind(value)]))
      return { ...base, [vocabularyProjection]: true, game: S.obj({ ...bind(base.game).fields, hero: S.opt(S.str({ reference: 'display' })) }), level: bind(base.level),
        capabilities: { ...base.capabilities, display: { ...base.capabilities.display, 'qed:hero': { about: { en: 'QED map illustration' }, role: 'hero' } } } }
    },
  })
}
