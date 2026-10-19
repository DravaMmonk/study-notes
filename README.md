# Drava's Study Notes

[简体中文（中国大陆）](https://dravammonk.github.io/study-notes/index.zh.html)

Lecture notes from the Master of Information Technology at the University of Melbourne, plus puzzle games that rebuild a course by hand.

- **Notes**: <https://dravammonk.github.io/study-notes/> (MkDocs, from `docs/`)
- **Games**: <https://dravammonk.github.io/study-notes/game/index.html>
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

Every page (the notes site, Fieldnotes, the games hub and both games) is built on `games/kit/`, published at `/game/kit/`:

- `tokens.css`: colours for the three themes (paper, night, blueprint), fonts and the type scale
- `ui.css`: the top bar, buttons, page hero and cards
- `prose.css`: note typography, shared by Fieldnotes and the site
- `lang.js`, `theme.js`, `menu.js`, `bar.js`: language, theme, the top bar's language and theme menus (an icon, then a small menu of choices) and the bar on plain pages
- `circuit/`: the circuit editor both games use (React): the desktop board (drag cards, pull wires from output dots, Delete, ⌘/Ctrl-scroll zoom, fit) and the phone board (slots, tap-tap or drag wiring, tray, undo), on one circuit model, plus the bench the components box tries each part on; a game brings what its cards show
- `drag.js`, `wires.js`, `graph.js`, `wires.css`: the editor's gestures, wire geometry, loop check and wire styles
- `shell/`: the game shell both games run on (React): top bar, level map, level rail, intro pages, first-run, passed and failed dialogs, components box, encyclopedia (how to play and the subject's terms, opening as the levels are reached), settings, saved progress, keys, the brief (task, tip, hints one at a time; a folding task card on a phone), the run bar (count, clear, Run) and the desktop workbench and phone page
- `course.js`: the course rules both games follow (eras, level roles, which levels open which, and the audit `node games/check-course.js` runs)

The site maps Material for MkDocs onto these tokens in `docs/stylesheets/extra.css` and `overrides/main.html`.

## Games

Puzzle games that turn a course into levels, under `games/`, published to `/game/` with the notes: every push to `main` runs `.github/workflows/deploy-site.yml`, which builds both games and then the MkDocs site, whose hook `hooks/games.py` copies them in.

- `games/index.html`: the games hub; the list is in `games/games.js`.
- Both games are content on the shared shell (`games/kit/shell/`) and circuit editor (`games/kit/circuit/`): a game is a `defineGame({ … })` with its chapters, levels, intro figures and one screen per kind of level, plus a `parts` description of its circuit nodes and a `glossary` for the encyclopedia, and differs from the other only there. Both are built from `trace-viewer/` (`npm run build:game`, `npm run build:state-graph`). How the games are designed is in [`games/DESIGN.md`](games/DESIGN.md).
- [Vision Complete](https://dravammonk.github.io/study-notes/game/vision-complete/index.html): computer vision, 58 levels; content in `trace-viewer/src/game/` (`game.js`, `screens.jsx`), built into `/game/vision-complete/`.
- [State Graph](https://dravammonk.github.io/study-notes/game/state-graph/index.html): dynamic programming from zero, 69 levels across seven robots; content in `games/state-graph/` (`js/game.jsx`; its modes in `js/modes/` play through `js/screen.jsx`; the level tree in `CURRICULUM.md`), built into `/game/state-graph/`.

## Local reader

`trace-viewer/` contains **Fieldnotes**, a local Markdown reader with search, highlights, comments and JSON export.

```bash
cd trace-viewer
npm install
npm run dev
```

Highlights and comments stay in the current browser and do not modify files under `docs/`.

## Build the site

```bash
mkdocs serve
```
