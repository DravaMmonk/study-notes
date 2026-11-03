# Drava's Study Notes

[简体中文（中国大陆）](https://dravammonk.github.io/study-notes/index.zh.html)

Source for two independent sites: university course notes and Course Puzzles, a collection of learning games. The sites have separate builds and deployments, with no navigation links between them.

- **Notes**: <https://dravammonk.github.io/study-notes/> (MkDocs, from `docs/`)
- **Games**: <https://dravammonk.github.io/games/>
- **Fieldnotes**: a local reader with highlights and comments (`trace-viewer/`)

## Courses

| Semester | Course |
| --- | --- |
| 2026 S2 | COMP90086 Computer Vision |
| 2026 S1 | COMP90042 Natural Language Processing; COMP90050 Advanced Database Systems; SWEN90016 Software Processes and Management |
| 2025 S2 | COMP90054 AI Planning for Autonomy; COMP90049 Introduction to Machine Learning; COMP30026 Models of Computation |

Self-study: Stanford CS231n.

How notes are written is in [`docs/NOTE_TAKING_GUIDELINES.md`](docs/NOTE_TAKING_GUIDELINES.md).

## One interface kit

Every page (the notes site, Fieldnotes, the games hub and both games) is built on `games/kit/`, shared as source. The notes package their UI assets at `/assets/kit/`; the games bundle their own assets:

- `tokens.css`: colours for the three themes (paper, night, blueprint), fonts and the type scale
- `ui.css`: the top bar, buttons, page hero and cards
- `prose.css`: note typography, shared by Fieldnotes and the site
- `lang.js`, `theme.js`, `menu.js`, `bar.js`: language, theme, the top bar's language and theme menus (an icon, then a small menu of choices) and the bar on plain pages
- `circuit/`: the circuit editor both games use (React): the desktop board (drag cards, pull wires from output dots, Delete, ⌘/Ctrl-scroll zoom, fit) and the phone board (slots, tap-tap or drag wiring, tray, undo), on one circuit model, plus the bench the components box tries each part on; a game brings what its cards show
- `drag.js`, `wires.js`, `graph.js`, `wires.css`: the editor's gestures, wire geometry, loop check and wire styles
- `shell/`: the game shell both games run on (React): top bar, level map, level rail, intro pages, first-run, passed and failed dialogs, components box, encyclopedia (how to play and the subject's terms, opening as the levels are reached), settings, saved progress, keys, the brief (task, tip, hints one at a time; a folding task card on a phone), the run bar (count, clear, Run) and the desktop workbench and phone page
- `course.js`: the course rules every game follows (eras, level roles, which levels open which, and the course audit)
- `engine/`: what every game runs on, whatever its subject: evaluating a circuit, boards inside boards and packed circuits, a machine walking a table, running a level's tests, and `npm run check` (every game's audit and reference answers)
- `domains/`: one folder per subject — its values, parts, worlds, views, level screens and checks: `image/` (Vision Complete), `table/` (State Graph)
- `app/`: every game's page and build

The site maps Material for MkDocs onto these tokens in `docs/stylesheets/extra.css` and `overrides/main.html`.

## Games

Puzzle games that turn a course into levels, under `games/`, published as **Course Puzzles** at `/games/`. `.github/workflows/deploy-games.yml` checks and builds the games, then publishes only the static output to the `DravaMmonk/games` repository's `gh-pages` branch. Game source stays in this repository; the destination contains build artifacts only.

- `games/index.html`: the games hub; the list is in `games/games.js`.
- A game's folder holds only its spec: its course, levels, tests, reference answers, intros and encyclopedia (`spec.js`, and `game.js` handing it to its domain). Everything that runs is in `games/kit/`. `npm run check` checks every game and `npm run build:games` builds them all, from `trace-viewer/` (`GAME=<id> npm run build:game` builds one). How the games are designed is in [`games/DESIGN.md`](games/DESIGN.md).
- [Vision Complete](https://dravammonk.github.io/games/vision-complete/index.html): computer vision, 58 levels; spec in `games/vision-complete/` on the image domain, built into `/games/vision-complete/`.
- [State Graph](https://dravammonk.github.io/games/state-graph/index.html): dynamic programming from zero, 69 levels across seven robots; spec in `games/state-graph/` (the level tree in `CURRICULUM.md`) on the table domain, built into `/games/state-graph/`.

Build and preview the complete standalone site:

```bash
cd trace-viewer
npm ci
npm run build:games
npm run preview:games
```

`trace-viewer/dist-games/` is the publish directory: `index.html` is the hub, each game has its own `<id>/index.html`, and all runtime assets are included. No MkDocs build is needed. `GAME=<id> npm run build:game` rebuilds just one game without clearing the rest of the site.

The games workflow uses the `GAMES_DEPLOY_KEY` repository secret: the private half of a write-enabled SSH deploy key registered only on `DravaMmonk/games`. Enable GitHub Pages there from `gh-pages`, directory `/`.

## Local reader

`trace-viewer/` contains **Fieldnotes**, a local Markdown reader with search, highlights, comments and JSON export.

```bash
cd trace-viewer
npm install
npm run dev
```

Highlights and comments stay in the current browser and do not modify files under `docs/`.

## Build the notes

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

`.github/workflows/deploy-site.yml` builds only MkDocs and publishes to this repository's `gh-pages` branch. `hooks/ui.py` copies the six shared CSS/JavaScript files the notes need; it never builds or publishes games. Node.js is not required to build the notes.
