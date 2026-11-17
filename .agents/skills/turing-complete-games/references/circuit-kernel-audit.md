# Circuit and logic extraction audit

## Step 10 boundary

All gameplay providers are packages: circuit, rows, tick-bus, image, table and logic.
State-graph owns its concrete table worlds/robots; QED owns reading dictionaries and its illustration.
Every package imports only public kernel/dependency exports. Core never imports view.

Removed native paths and entries:

- `games/kit/modules/logic/**` and the now-empty modules directory.
- `engine/circuit-bridge.js`, including kernel/resolver invocation.
- `engine/content-kinds.js`, its native symbol/wordset catalog and dedicated symbol authoring/search.
- Kernel's logic module/vocabulary registration, native runtime/game/Studio preparation dispatch,
  native display bundle glob, `game-module.js`, and logic baseline report dispatch.
- Circuit's symbol observation and logic-family-specific symbol handling. Generic grant registration
  handles all provider types; logic owns symbol work readers and baseline structure.

Logic registers `logic/symbol` with circuit's public `grants.register` inside its own register.
QED's kind is `qed/wordset`; symbol/tag file paths follow their declared folders and full kind names.

## Remaining bridges

None in kernel production code. `engine/baseline-value.js` retains only documented frozen-corpus
name/type/palette normalization. Synthetic tests may install package entries explicitly.
Copy starters remain under templates until the authoring/template migration; they are data, not native runtimes.

## Studio handoff

`games/kit/studio/**` is untouched, including tests. Its imports of retired `content-kinds.js`
and its native symbol selectors/types must migrate to package declarations/editors in step 11.
The owner must update `copy.js`, `object-types.js`, `object-file.js`, `SymbolEditor.jsx` and dependent tests.
Kernel/application bridges now load only package core/view entries.

## Reproducible scan

```sh
rg -n 'modules/logic|circuit-bridge|content-kinds|registerCircuitConsumers|legacyModules' games/kit/engine games/kit/app -g '*.js' -g '*.jsx' -g '*.mjs'
find games/kit/modules -type f
```

The production scan should have no matches, apart from synthetic test inputs if explicitly retained.
The modules directory should not exist. Studio's retired imports are recorded separately, never patched here.
