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


- The game is built here on the shared kit (`../games/kit/`): `game.html` is every game's page (`src/game.js` loads `../games/kit/app`), `GAME=vision-complete npm run build:game` builds it into `dist-games/vision-complete/`. Its spec — levels, intros, encyclopedia — is `../games/vision-complete/`; what runs it (images, parts, benches, screens) is `../games/kit/domains/image/`. `npm run check` checks every game's levels.
- Design, research notes and the full level map: `../games/vision-complete/DESIGN.md`.
