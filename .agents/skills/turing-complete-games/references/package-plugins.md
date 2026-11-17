# Package plugins

`games/MODULES.md` is the migration authority. Handbook §6.3.1 describes the implemented protocol.

- `core/index.js` and `view/index.jsx` each export `register(kernel)`. Check, baseline and blind play load
  only core; Vite game and Studio loaders load both in `uses` order. Never import view code from core.
- Core registers `play`, `kind`, `state`, `check`, `agent`, and named tag readers with `tag(fullName, member)`; tag names use `<package>/<name>`, with one member type.
  View registers paired `play`, `editor`, `display`. Other protocol names are `<package>:<name>`; duplicate entries fail.
  Play core owns `initial/read/write/normalize/run/judge`; view owns `component/preview/modes`.
- Public imports are `kernel` and `kernel/view`; direct dependency exports are `<package>` and
  `<package>/view`. Package-local imports remain inside that side, or view may import its own core.
  No dependency internals, transitive dependency authority, computed imports, JSX/CSS/UI libraries in core.
- Object declarations are data in `kinds/<name>.json`: `folder`, JSON `schema`, optional `references`,
  `relations`, `override`, `text`, `studio`. Field extensions use `extends: level|task` and `fields`.
  Use `kind.put/set/remove` and `object.put/set/remove`; never write content JSON by hand.
  Kind full names use `<package>/<kind>`; tags use `tags/<package>/<kind>/<name>.json`.
- Tags use the composite key `<member>:<namespace>/<name>` in `registries.tag`, `content.tags`,
  `sources.tag`, and `kernel.tables.tag`; `overrideHistory` tag events carry `name` and `member`.
  Use public `tagKey(member, fullName)` or `objectOf(content, 'tag', fullName, member)`.
  References stay `#<namespace>/<name>` and resolve in the field's member type; unconstrained collisions fail.
- Core registers `kernel/studio-left` with member `kind`. Packages contribute through
  `overrides/kernel/tags/kind/studio-left.json`; `kernel` cannot name a package. Own declarations use
  `tags/<member>/<name>.json`, foreign contributions use `overrides/<namespace>/tags/<member>/<name>.json`.
  Contributions union in dependency order; `replace` resets, `remove` subtracts. Member provenance lives
  in `sources.tag[key].members`. A contribution needs an exact typed owner declaration or registered reader.
- No short-name conventions or `templates` reader exist. Any object can be copied as a new object;
  curated starts are ordinary tags. Studio must connect typed tag selection/URLs and the single merged
  `kernel/studio-left` collection; an empty collection falls back to all populated object types.
  Leave that UI integration to its owner. Legacy `kit/templates/` is outside this migration.
- Use `text` as the smallest working example. Create an independent package with `new-package --from text`;
  new code and registration names need review, copied content still follows the operation workflow.
- Package core contracts run in Node and check their own examples and blind-play agents. View contracts run
  through Vite, including assembly with another package. Kernel tests use synthetic content. Run `npm test`,
  `npm run lint:kit`, `npm run words -- --check`, builds, and `baseline -- compare` for migration work.
  Never save over the locked migration corpus. Bump vocabulary and keep a snapshot when its public data changes.
- Until steps 3–7, package projections and internal modules share the existing course reader and dispatch.
  Do not add another implementation or permanent fallback. Move circuit first and remove its internal registration.
