# Package editors

Studio loads the `PACKAGES` loaders from `virtual:studio-domains` and calls
`registerPlugins(entries, { view: true })` before mounting either workspace or
preview. Package views register one owner per full object type:

```js
kernel.editor('example:scene', {
  type: 'example/scene',
  component: SceneEditor,
  list: SceneList,
})
```

`component` receives `{ kind, full, content, namespace, vocabulary, pending,
onEdit, onOps, onPick, onSelect, onOpen }`. Operations go through the shell's
changeset callbacks. `onPick(path)` opens the shared schema inspector. Objects
without an editor use `ObjectSummary`; lists without a registered `list` use
`GroupedList`. A list receives the shared list props (items, labels, selection,
grouping and creation callbacks); it may derive its own order and row renderer.

Optional editor slots:

- `page`: an isolated preview frame mounted by the existing component selection route.
- `preview`: the component rendered inside the isolated preview frame.
- `fields`: schema view hints mapped to field controls. Controls receive
  `{ field, onSet, ctx, label }`.
- `name`, `groupings`, `relations`: list labels, grouping choices and new relation
  choices. `group` supplies a collection's `name`, `createLabel` and `initial()`.
- `stages`, `onPage`: shared stage display and edit-message handling used by the
  circuit provider. The shell passes callbacks; the provider interprets the data.

Core `kind` registrations may expose `studio` metadata: assembled file `schemas`,
check `rules`, `member(content, type, name)`, `owners(content)`, relation endpoint
`relations`, and collection descriptors (`accepts`, `members`, `types`). The
shell uses these hooks without importing providers. Vocabulary projection uses
the existing `vocabulary` and `validationVocabulary` meaning hooks.

Package views import shared controls and operations from `kernel/view`: named
exports, or the `studio` namespace. The namespace includes selectors, text fields,
source markers, generic fields and rows, list controls and sorting, names,
`objectOp`, `objectOverrideOps`, and `listPatch`/`setPatch`/`edgesPatch`. Prefer live
named imports for values used during module initialization because view entries
can participate in ESM cycles. Package editors may import their own `core/` and
`view/` files; existing package boundary checks still apply.

The remaining `StageChain.jsx` in this directory only mounts the registered stage
component for the unchanged symbol editor. Symbol routing and its dedicated
editor remain pending the logic package migration.
