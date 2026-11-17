# Package plugins

`games/MODULES.md` is the migration authority. Handbook §6.3.1 describes the implemented protocol.

- `core/index.js` and `view/index.jsx` each export `register(kernel)`. Check, baseline and blind play load
  only core; Vite game and Studio loaders load both in `uses` order. Never import view code from core.
- Core registers `play`, `kind`, `state`, `check`, `agent`, arbitrary typed objects with `object(kind, fullName, value = {})`, and named tag readers with `tag(fullName, member)`; tag names use `<package>/<name>`, with one member type.
  View registers paired `play`, `editor`, `display`. Other protocol names are `<package>:<name>`; duplicate entries fail.
  Play core owns `initial/read/write/normalize/run/judge`; view owns `component/preview/modes`.
- Public imports are `kernel` and `kernel/view`; direct dependency exports are `<package>` and
  `<package>/view`. Package-local imports remain inside that side, or view may import its own core.
  No dependency internals, transitive dependency authority, computed imports, JSX/CSS/UI libraries in core.
- Object declarations are data in `kinds/<name>.json`: `folder`, JSON `schema`, optional `references`,
  `relations`, `declares`, `overrides`, `text`, `studio`. Field extensions use `extends: level|task` and `fields`.
  Use `kind.put/set/remove` and `object.put/set/remove`; never write content JSON by hand.
  Kind full names use `<package>/<kind>`; tags use `tags/<package>/<kind>/<name>.json`.
- Tags use the composite key `<member>:<namespace>/<name>` in `registries.tag`, `content.tags`,
  `sources.tag`, and `kernel.tables.tag`; `overrideHistory` tag events carry `name` and `member`.
  Use public `tagKey(member, fullName)` or `objectOf(content, 'tag', fullName, member)`.
  References stay `#<namespace>/<name>` and resolve in the field's member type; unconstrained collisions fail.
- Core registers `kernel/studio-left` with member `kind`. Packages contribute through
  `overrides/kernel/tags/kind/studio-left.json`; `kernel` cannot name a package. Own declarations use
  `tags/<member>/<name>.json`, foreign contributions use `overrides/<namespace>/tags/<member>/<name>.json`.
  Use `values: { add: [...] }` to union contributions, `remove` to subtract, and an array to replace.
  Member provenance lives in `sources.tag[key].collections.values`. A contribution needs an exact typed owner declaration or registered reader.
- No short-name conventions or `templates` reader exist. Any object can be copied as a new object;
  curated starts are ordinary tags. Studio must connect typed tag selection/URLs and the single merged
  `kernel/studio-left` collection; an empty collection falls back to all populated object types.
  Leave that UI integration to its owner. Remaining native `kit/templates/` entries migrate with their mechanisms; rows/tick-bus examples now live in their packages.
- Use `text` as the smallest working example. Create an independent package with `new-package --from text`;
  new code and registration names need review, copied content still follows the operation workflow.
- Package core contracts run in Node and check their own examples and blind-play agents. View contracts run
  through Vite, including assembly with another package. Kernel tests use synthetic content. Run `npm test`,
  `npm run lint:kit`, `npm run words -- --check`, builds, and `baseline -- compare` for migration work.
  Never save over the locked migration corpus. Workspace source changes do not invalidate locks. Refresh locks to record current snapshots. Archive dependencies retain strict version/hash pins. Publication requires `publish -- <package|kernel> --launch`; compatibility previews expose a proposed version without writing it. Versions remain `0.0.0` and ranges `^0.0.0` before launch. Publication computes semantic versions from manifests and dependent check observations; vocabulary has no separate version line. See DESIGN.md 6.1.1 for release metadata and Studio data sources.
- Installed layers enter through `engine/resolver.js:resolveLayers`; content roots and source/code locations belong
  to that resolver. Game consumers use resolved public data. The workspace existence projection is
  `engine/existence.js:publicSurfaces`, backed by installed declarations and registered object readers. The same check covers schema refs,
  overrides, tag contributions, relation endpoints, trays/grants and package selections; code registrations count
  for every object type. Preserve `{ rule: "exists", at, layer, kind, target, member?, reason, says }` in reports.
  Missing targets are diagnostics, not separate loader exceptions. Tag copy uses `@tag.<name>.title/desc`.
- Native consumers use the public circuit work reader until their extraction in steps 7–10.
  Keep a single implementation of each reader and judge.


Circuit owns its content semantics through `kind` meanings. The kernel stores typed registries and interprets
schemas. Meanings supply qualification, nested identities, reference indexes/matching, assembly/source serialization,
validation and stamps. `derived` fields are excluded from source serialization. Custom relation endpoints
come from declaration `relations`. Circuit declares `circuit/part`, `circuit/tray` and `circuit/quote`.

Course dependency inference, supplies, native work readers and runtime selection are meaning hooks.
`state`, `check` and paired `play` registrations own derived availability, verdicts and work execution.
Kernel progress only performs task/level transitions. Authoring projections, part operations, flow/dependency
and rendering tools live in circuit and enter the shared operation/tool framework through meaning hooks.
The public grant registry remains `grants.register({ type, used })` for its native consumers.

Shared shell components own layout, interaction, run controls and save-slot context. Circuit's game definition
supplies shell panels/actions, settings, map rewards, reference display metadata and observation descriptions.
A view receives `context` and `phone` alongside task/work state. Studio's current editors remain usable through
the same schemas and operation metadata; moving the specialized editors into the package is step 11.

Only `engine/circuit-bridge.js` (logic symbol grants) and the two remaining native modules' public circuit
imports are temporary bridges. Remove them as their consumers move in steps 7–10. Synthetic kernel tests
install explicit circuit fixtures. Baseline observers are provided by kind meanings and compare full reports.

## Step 6 collection and Studio handoff

Schemas use `{ type: "set"|"list", of: { type: "str", reference: "<kind-or-group>" } }`.
`edges` uses `of: { type: "obj", fields: { from: <reference>, to: <reference>, ... } }` as produced by `S.edges`.
The kernel composes fields, checks references and cycles, and records contributors. There are no per-kind merge hooks.
Package kinds require `declares` and `overrides`; vocabulary returns `kindPolicies` for workspace filtering.

Read `registries.game["@<game>/config"]`, `registries.chapter` and `content.chapters` for authoring; `eras` remains the runtime route projection.
Use `chapter.put/set/remove` for chapter files, `text.set` with a chapter selector for chapter copy, `game.set` for chapter order and encyclopedia section order, `tag.set` for set values,
`section.set` or `object.set` for ordered members, and `relation.set` for edges.
`override.put` writes field patches in its data. Use list arrays for drag reorder and collection patches for foreign contributions.
Dedicated Studio controls remain with the Studio owner. Only schema fixtures, sorted expectations and the retired
tag-move assertion were mechanically updated in Studio tests.

Game configuration collections have the same audit shape in `sources.game["@<game>/config"].collections`.
The shell reads section member lists directly so list order reaches the displayed encyclopedia.

## Step 7 extracted mechanisms

`rows` and `tick-bus` register their plays through package core/view entries. Their ordinary sample levels
and bus parts live at package root, with no chapters or course. Both declare `uses.circuit: ^0.0.0`.
Only table and logic retain native circuit import bridges.

`kinds/*.json` task extensions can include `play: <package>:<play>`. Scoped fields form their own generic
play-task branch after common extensions; unscoped fields retain strict no-redefinition behavior.
This preserves distinct native/package schemas for the same field name. Display discovery resolves each
package separately; public package imports are available in Node through `package-imports.mjs`.


## Step 8 extracted image mechanism

`image/core` registers graph, probe and parameter-bench plays and shares the existing production
work readers with checks, package play, blind play and baseline observations. `image/view` pairs
all three plays and registers their displays. View definitions receive `{ kernel, vocabulary }`
as their third argument so bench layouts use the assembled display registry.
Vision-specific scenes, bench models and displays register through vision-complete's core/view
entries. Its catalog is an assembly-derived value, never a process-global extension of image.
Comp90086 and vision-complete own independent power/box kinds and namespaced folders.
Native templates now remain only for logic/table. Image contracts use synthetic package levels.

The vocabulary tool sends object declarations once in `objectKinds`, policy fields in `kindPolicies`,
and the projected vocabulary separately. Schema alternatives try matching literal discriminators
first and stop after a valid branch. Invalid values retain the complete original diagnostic selection.
Configuration-file ownership is validated after selected core entries register their fields.


Scoped task declarations may combine shared `fields` with a `schema` discriminator tree.
The platform extends every branch with those fields and the common task identity/play fields,
rejecting redefinitions. Image graph scenes use this to retain correlated setup/test schemas
without repeating common graph fields in every declaration.

State-graph also selects image explicitly to preserve its historical standalone package palette,
which exposed the global image primitive inventory before extraction. This dependency preserves
the locked package observations. The corresponding game selects the complete closure.


Kind-declaration discriminator schemas may provide shared `fields` beside `cases`.
Registration expands them into every object branch and rejects collisions. Bench declarations
share their layout, knob and goal schemas this way. Source declarations retain their compact form.
Resolved layers are reused when listing games and loading package code. Unchanged source files
reuse parsed import metadata while dependency authority is checked on every call. Quick previews
reuse their computed changes when rendering a diff and preserve unchanged JSON containers directly.
