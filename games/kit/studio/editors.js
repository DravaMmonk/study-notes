// The Studio shell consumes a registration owned by its current browser assembly.
let plugins = null
export function installStudioPlugins(kernel) { plugins = kernel }
export const registeredEditors = () => [...(plugins?.tables.editor.values() ?? [])]
export const editorRoute = (selection = null) => registeredEditors().find(editor => editor.route && (!selection || selection[editor.route.selector] !== undefined))?.route
export const editorForType = type => [...(plugins?.tables.editor.values() ?? [])].find(editor => editor.type === type)
export const registeredMeanings = () => [...(plugins?.tables.kind.values() ?? [])]
export const fieldEditor = kind => [...(plugins?.tables.editor.values() ?? [])].map(editor => editor.fields?.[kind]).find(Boolean)
export const editorRules = () => Object.assign({}, ...registeredMeanings().map(meaning => meaning.studio?.rules))
export const fileSchema = (vocabulary, field) => (vocabulary?.meanings ?? registeredMeanings()).map(meaning => meaning.studio?.schemas?.[field]).find(Boolean)
export const contentVocabulary = (vocabulary, content) => !content ? vocabulary : (vocabulary?.meanings ?? registeredMeanings()).reduce((value, meaning) => meaning.validationVocabulary?.({ vocabulary: value, content }) ?? value, vocabulary)
export const memberInfo = (content, kind, name) => registeredMeanings().map(meaning => meaning.studio?.member?.(content, kind, name)).find(Boolean) ?? content?.registries?.[kind]?.[name]
export const memberOwners = content => new Map(registeredMeanings().flatMap(meaning => meaning.studio?.owners?.(content) ?? []))
export const collectionProvider = type => registeredMeanings().map(meaning => meaning.studio?.collections?.[type]).find(Boolean)
export const relationType = name => registeredMeanings().map(meaning => meaning.studio?.relations?.[name]).find(Boolean)
