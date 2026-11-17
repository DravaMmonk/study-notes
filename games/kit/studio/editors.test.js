import test from 'node:test'
import assert from 'node:assert/strict'
import { registerPlugins } from '../engine/plugins.js'
import { editorForType, fieldEditor, fileSchema, contentVocabulary, installStudioPlugins } from './editors.js'
import { browserVocabulary } from './api.js'

test('Studio mounts editors and lists by full object type and keeps unknown types generic', async () => {
  const component = () => null
  const list = () => null
  const control = () => null
  const kernel = await registerPlugins([{ id: 'sample', core: { register(k) {
    k.kind('sample:scene', { type: 'sample/scene', read: value => value,
      studio: { schemas: { scenes: { type: 'any' } } },
      vocabulary: value => ({ ...value, projected: true }),
      validationVocabulary: ({ vocabulary, content }) => ({ ...vocabulary, sceneCount: content.count }),
    })
  } }, view: { register(k) { k.editor('sample:scene', { type: 'sample/scene', component, list, fields: { scene: control } }) } } }], { view: true })
  installStudioPlugins(kernel)
  assert.equal(editorForType('sample/scene').component, component)
  assert.equal(editorForType('sample/scene').list, list)
  assert.equal(editorForType('sample/missing'), undefined)
  assert.equal(fieldEditor('scene'), control)
  const vocabulary = browserVocabulary({ legacyModules: [], packageCode: true, objectKinds: {} })
  assert.equal(vocabulary.projected, true)
  assert.deepEqual(fileSchema(vocabulary, 'scenes'), { type: 'any' })
  assert.equal(contentVocabulary(vocabulary, { count: 2 }).sceneCount, 2)
  assert.equal(contentVocabulary(vocabulary, null), vocabulary)
  installStudioPlugins(null)
  assert.equal(editorForType('sample/scene'), undefined)
})

test('editor registrations reject missing components, invalid slots and duplicate type owners', async () => {
  const register = value => registerPlugins([{ id: 'sample', view: { register(k) { k.editor('sample:scene', value) } } }], { view: true })
  await assert.rejects(register({ type: 'sample/scene' }), /component/)
  await assert.rejects(register({ type: 'sample/scene', component() {}, list: true }), /list/)
  await assert.rejects(registerPlugins([{ id: 'sample', view: { register(k) {
    k.editor('sample:scene', { type: 'sample/scene', component() {} })
    k.editor('sample:other', { type: 'sample/scene', component() {} })
  } } }], { view: true }), /duplicate editor type/)
})
