# Drava's Study Notes
## 🎓 Master of Information Technology in the University of Melbourne

### 🗓️ 2026 Semester 1

#### 📘 Natural Language Processing - COMP90042

### 🗓️ 2025 Semester 2

#### 📘 AI Planning for Autonomy - COMP90054




## 💻 Other

- [游戏](https://dravammonk.github.io/study-notes/game/)：把课程做成解谜关卡的学习游戏，都在 `games/` 下，推送后由 `.github/workflows/deploy-games.yml` 发布到 `/game/`。
  - `games/index.html`：游戏导航页，游戏列表在 `games/games.js`，新游戏放进 `games/` 并在这里加一项。
  - `games/kit/`：两款游戏共享的底层——元件拖动与拉线（`drag.js`）、连线几何（`wires.js`）、成环检测（`graph.js`）、配色与主题（`tokens.css`、`theme.js`）、连线样式（`wires.css`）。改这里，两款游戏一起变。
  - [视觉完备](https://dravammonk.github.io/study-notes/game/vision-complete/)：计算机视觉解谜，57 关，源码在 `trace-viewer/src/game/`（React，构建后发布到 `/game/vision-complete/`）。
  - [状态之图](https://dravammonk.github.io/study-notes/game/state-graph/)：从零开始的动态规划解谜，27 关，源码在 `games/state-graph/`（无构建的 ES 模块：`js/circuit` 是电路引擎与编辑器，`js/levels` 是关卡数据，`js/modes` 是各类玩法）。






## 📚 Reference

## Local reader

The `trace-viewer` directory contains **Fieldnotes**, a local Markdown reader with search, highlights, comments, and JSON export.

```bash
cd trace-viewer
npm install
npm run dev
```

Highlights and comments stay in the current browser and do not modify files under `docs/`.
