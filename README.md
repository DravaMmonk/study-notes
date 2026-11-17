# Drava's Study Notes

[简体中文（中国大陆）](https://dravammonk.github.io/study-notes/index.zh.html)

Source for the university course notes. The learning games (Course Puzzles, <https://dravammonk.github.io/games/>) live in their own repository, [DravaMmonk/games](https://github.com/DravaMmonk/games); a note embeds a level from that published site.

- **Notes**: <https://dravammonk.github.io/study-notes/> (MkDocs, from `docs/`)
- **Fieldnotes**: a local reader with highlights and comments (`trace-viewer/`)

## Courses

| Semester | Course |
| --- | --- |
| 2026 S2 | COMP90086 Computer Vision |
| 2026 S1 | COMP90042 Natural Language Processing; COMP90050 Advanced Database Systems; SWEN90016 Software Processes and Management |
| 2025 S2 | COMP90054 AI Planning for Autonomy; COMP90049 Introduction to Machine Learning; COMP30026 Models of Computation |

Self-study: Stanford CS231n.

How notes are written is in [`docs/NOTE_TAKING_GUIDELINES.md`](docs/NOTE_TAKING_GUIDELINES.md).

## Shared interface

The notes site and Fieldnotes share the top bar, themes and note typography in `ui/` (a copy of the games' kit files, kept here so the notes build on their own). The site packages them at `/assets/kit/`:

- `tokens.css`: colours for the three themes (paper, night, blueprint), fonts and the type scale
- `ui.css`: the top bar, buttons, page hero and cards
- `prose.css`: note typography, shared by Fieldnotes and the site
- `lang.js`, `theme.js`, `menu.js`, `overlays.js`: language, theme, and the top bar's language and theme menus

The site maps Material for MkDocs onto these tokens in `docs/stylesheets/extra.css` and `overrides/main.html`.

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

`.github/workflows/deploy-site.yml` builds only MkDocs and publishes to this repository's `gh-pages` branch. `hooks/ui.py` copies the shared CSS/JavaScript files in `ui/` and turns a note's `<!-- task: … -->` line into an embedded level of the published games. Node.js is not required to build the notes.
