# Fieldnotes

A local-first Markdown reader for the study notes in `../docs`.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The library is generated from every Markdown file under `docs/` whenever the app starts or builds.

## Two languages

Every note is read in English or Chinese. The library lists each note once, by its original `X.md`; the reader opens its translation (`X.zh.md` or `X.en.md`) when that is the reader's language, and the 中/EN button in the top bar switches both the note and the interface. The choice is shared with the notes site and the games (`../games/kit/lang.js`). Folder names come from `../docs/.sections.json`; interface text is in `src/lib/strings.js`. Each language version keeps its own annotations.

The top bar, buttons and note typography are the shared kit's (`../games/kit/ui.css`, `prose.css`), the same as on the notes site and in the games.

## Annotations

Select text in any note to open the annotation toolbar. A highlight can use one of four colours, and the comment action opens the annotation panel for writing a note. Annotations are stored in browser `localStorage`; source Markdown files are never modified.

Use **Export this note** to download the current document's annotations as JSON. Clearing site data also clears local annotations.

## Interactive figures

A note can embed an interactive figure with an HTML comment on its own line:

```markdown
<!-- figure: conv-press -->
```

Obsidian and MkDocs hide the comment; Fieldnotes replaces it with the figure. Each folder in `src/figures/` is one figure and its folder name is its id (the first three keep the ids `conv-press`, `stereo-rangefinder` and `ransac-pegboard`); `src/figures/registry.js` discovers them. The COMP90086 topic pages in `docs/Unimelb/26S2/CV/topics/` gather all sixteen. Each figure is drawn with the isometric kit from the [anatomy](https://github.com/wheresryan22/anatomy) skill (MIT, copied to `src/figures/kit/`) and renders inside a shadow root, so its text never shifts annotation offsets.

Preview one figure on its own at `/figures.html?fig=conv-press&theme=light` (themes: `light`, `dark`, `blueprint`).

## Vision Complete (视觉完备)

`game.html` is a puzzle game that turns COMP90086 into levels in the manner of *Turing Complete*: each level gives a goal, a few parts and a set of test images; the player wires an image pipeline on a board and every test runs live. Solving a level unlocks its part for later levels. Open it from the puzzle icon in the Fieldnotes top bar or at `/game.html`; progress is kept in the browser. It is published at `/study-notes/game/vision-complete/`, under the games hub in `../games/`.

- Shared with 状态之图 through `../games/kit/`: moving cards and pulling wires (`drag.js`), wire geometry and styles (`wires.js`, `wires.css`), the cycle check (`graph.js`), the colour tokens and theme (`tokens.css`, `theme.js`, also used by Fieldnotes). A change there changes both games.

- Design, research notes and the full level map: `src/game/DESIGN.md`.
- Engine: `src/game/engine/` (images, node types, graph evaluation and training).
- Levels: `src/game/levels/` — 58 levels in nine chapters, from wiring a camera to a GAN. Every graph level carries a reference solution and, where the lesson depends on it, a naive one; every board level (`ui/boards/`) has a `verify()`. `npm run levels` checks them all.
