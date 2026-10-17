# Drava's Study Notes · Drava 的学习笔记

Lecture notes from the Master of Information Technology at the University of Melbourne, in English and Chinese, plus puzzle games that rebuild a course by hand.

墨尔本大学信息技术硕士的课程笔记，中英双语；另有几款解谜游戏，把一门课亲手搭一遍。

- **Notes · 笔记**: <https://dravammonk.github.io/study-notes/> (MkDocs, from `docs/`)
- **Games · 游戏**: <https://dravammonk.github.io/study-notes/game/index.html>
- **Fieldnotes**: a local reader with highlights and comments (`trace-viewer/`) · 本地阅读器，可高亮和批注

## Courses · 课程

| Semester · 学期 | Course · 课程 |
| --- | --- |
| 2026 S2 | COMP90086 Computer Vision · 计算机视觉 |
| 2026 S1 | COMP90042 Natural Language Processing · 自然语言处理; COMP90050 Advanced Database Systems · 高级数据库系统; SWEN90016 Software Processes and Management · 软件过程与管理 |
| 2025 S2 | COMP90054 AI Planning for Autonomy · 面向自主系统的 AI 规划; COMP90049 Introduction to Machine Learning · 机器学习导论; COMP30026 Models of Computation · 计算模型 |

Self-study · 自学: Stanford CS231n.

## Bilingual notes · 中英双语

Every note has an English and a Chinese version. The file a note was first written in stays `X.md`; its translation sits beside it as `X.zh.md` or `X.en.md`. Folder titles in both languages are in `docs/.sections.json`. The rules are in [`docs/NOTE_TAKING_GUIDELINES.md`](docs/NOTE_TAKING_GUIDELINES.md).

每篇笔记都有中英两个版本：最初写成的文件保持 `X.md`，译文放在旁边，命名为 `X.zh.md` 或 `X.en.md`；文件夹的中英标题在 `docs/.sections.json`。

The language choice is shared by the site, Fieldnotes and the games (`localStorage` key `fieldnotes.lang`, helper `games/kit/lang.js`). On the site, `hooks/i18n.py` pairs each note with its translation, keeps translations out of the nav and sends readers to their language; `docs/javascripts/site.js` adds the 中/EN button.

## One interface kit · 统一的界面工具包

Every page (the notes site, Fieldnotes, the games hub and both games) is built on `games/kit/`, published at `/game/kit/`:

- `tokens.css`: colours for the three themes (paper, night, blueprint), fonts and the type scale · 三套主题配色、字体与字号
- `ui.css`: the top bar, buttons, page hero and cards · 顶栏、按钮、页头与卡片
- `prose.css`: note typography, shared by Fieldnotes and the site · 正文排版
- `lang.js`, `theme.js`, `menu.js`, `bar.js`: language, theme, the top bar's language and theme menus (an icon, then a small menu of choices) and the bar on plain pages · 语言、主题与顶栏按钮
- `circuit/`: the circuit editor both games use (React): the desktop board (drag cards, pull wires from output dots, Delete, ⌘/Ctrl-scroll zoom, fit) and the phone board (slots, tap-tap or drag wiring, tray, undo), on one circuit model, plus the bench the parts box tries each part on; a game brings what its cards show · 两款游戏共用的电路编辑器
- `drag.js`, `wires.js`, `graph.js`, `wires.css`: the editor's gestures, wire geometry, loop check and wire styles · 拖拽、连线几何、成环检测与连线样式
- `shell/`: the game shell both games run on (React): top bar, level map, level rail, 引入, first-run, passed and failed dialogs, parts box, encyclopedia (百科: how to play and the subject's terms, opening as the levels are reached), settings, saved progress, keys, the brief (task, tip, hints one at a time; a folding 任务 card on a phone), the run bar (count, clear, Run) and the desktop workbench and phone page · 两款游戏共用的游戏外壳

The site maps Material for MkDocs onto these tokens in `docs/stylesheets/extra.css` and `overrides/main.html`.

## Games · 游戏

Puzzle games that turn a course into levels, under `games/`, published to `/game/` with the notes: every push to `main` runs `.github/workflows/deploy-site.yml`, which builds both games and then the MkDocs site, whose hook `hooks/games.py` copies them in.

- `games/index.html`: the games hub; the list is in `games/games.js`. · 游戏导航页，游戏列表在 `games/games.js`。
- Both games are content on the shared shell (`games/kit/shell/`) and circuit editor (`games/kit/circuit/`): a game is a `defineGame({ … })` with its chapters, levels, intro figures and one screen per kind of level, plus a `parts` description of its circuit nodes and a `glossary` for the encyclopedia, and differs from the other only there. Both are built from `trace-viewer/` (`npm run build:game`, `npm run build:state-graph`). · 两款游戏只在关卡内容上不同，其余都是共享外壳。
- [Vision Complete · 视觉完备](https://dravammonk.github.io/study-notes/game/vision-complete/index.html): computer vision, 58 levels; content in `trace-viewer/src/game/` (`game.js`, `screens.jsx`), built into `/game/vision-complete/`.
- [State Graph · 状态之图](https://dravammonk.github.io/study-notes/game/state-graph/index.html): dynamic programming from zero, 56 levels; content in `games/state-graph/` (`js/game.jsx`; its modes in `js/modes/` play through `js/screen.jsx`), built into `/game/state-graph/`.

## Local reader · 本地阅读器

`trace-viewer/` contains **Fieldnotes**, a local Markdown reader with search, highlights, comments and JSON export.

```bash
cd trace-viewer
npm install
npm run dev
```

Highlights and comments stay in the current browser and do not modify files under `docs/`. Each language version of a note keeps its own annotations.

## Build the site · 构建网站

```bash
mkdocs serve
```
