# games/ 修改计划：三款游戏上的底座

目标：游戏站只留《视觉完备》《状态之图》《证明完毕》，加上课程笔记引用的 COMP90086 交互（建在视觉领域上）。底座已经按决策二十四拆成基础件，件都登记在 `pieces.json`，studio 按件工作；之前的计划（阶段 A–G）已完成或随游戏的删减作废，在 git 历史里（`78f2a53` 及之前的这个文件）。这份计划只围绕这三款游戏：把它们剩下的自写屏换成内核的基础件，再清掉只为已删游戏留着的东西。

## 现状（2026-11-15）

- 《证明完毕》：全部玩法在内核的屏上，`logic` 自写组件 0 行；门、推理规则、证明助手的元件、引理、等式都是 `games/qed/pieces.json` 的件。
- 《视觉完备》：件在 `pieces.json`；玩法已登记在 `domains/image/plays.js`（图像电路 `graph`、参数台 `board`、探针 `probe`），共用内核的关卡布局。领域还自写 2828 行组件：电路关（`ui/CircuitPlay.jsx`、`ui/TestPanel.jsx`、`ui/useImageCards.jsx`、`ui/phone/Editors.jsx`）、件的演示（`ui/PartDemo.jsx`）、图像视图（`ui/views/`）、参数台（`ui/benches/`）。
- 《状态之图》：件和思路在 `pieces.json`；玩法已登记在 `domains/table/plays.js`，手动棋盘和机器人电路共用棋盘界面。领域还自写 2187 行组件：机器人电路（`ui/modes/Circuit.jsx`）、八种玩法屏（`ui/modes/`）、件的演示（`ui/PartDemo.jsx`）、`ui/BoardView.jsx`、`ui/RobotView.jsx`。
- H.2 已完成。COMP90086 的 `pieces.json` 登记一维三点核和相加两个基础件。课内检验结果与基线一致，英译覆盖从 43/43 增至 53/53。
- 编辑器的预览已接入 studio 和元件箱，接口是 `preview(piece, { game, scene })`，`scene` 取 `card`、`tile` 或 `detail`。
- H.1：移除了旧演示专用的场景图、无头场景钩子、反应世界和电路重复量度。三个脚手架保留，电路预设和逐拍寄存器继续由脚手架使用。

## 阶段 H

### H.3 《视觉完备》的图像电路关上内核的电路屏

- 照 D.5 对《证明完毕》的做法：`graph` 玩法换成内核的 `CircuitScreen`，领域只交值怎么比、怎么读（图像值的显示方法补进内核的显示系统）、运行和这门学科的性质；`CircuitPlay`、`TestPanel`、`useImageCards`、`phone/Editors` 删掉，件的演示走图像编辑器的 `preview`。
- 参数台（`board`）和探针（`probe`）照「不在这份计划里」的第一条留着现有逻辑。
- 验收：`domains/image` 的自写组件只剩参数台和探针用的，数字写进 `engine/components.test.js` 并在提交说明里说明为什么留；检查输出只在译文计数和措辞上可以不同，按类别列出；桌面和手机各走通一关到过关、一关到失败，元件箱打开一个搭出的件。

### H.4 《状态之图》的玩法上内核的基础件

- 机器人电路（`ui/modes/Circuit.jsx`）换成内核的 `CircuitScreen`；八种玩法屏逐个落到规则行、值表（`RowTable`）、玩家检验（`Checks`）、逐步回放这些基础件上，缺的基础件先在内核补；`PartDemo` 走表格编辑器的 `preview`；`BoardView`、`RobotView` 这类棋盘的画法只留领域给的无头数据。
- 验收：`domains/table` 的自写组件降到 0，或几处写明理由；检查输出只在译文计数和措辞上可以不同，按类别列出；八种玩法在桌面和手机上各走通一关。

---

## 之后

《证明完毕》的方向计划（`games/qed/DESIGN.md` §7.1：先在共享层做定义板，再删减章节、衔接证明板和证明助手，数学另起一款游戏）是关卡和玩法的重新设计，不在这份计划里；它的第 1 条要内核的基础件（定义的展开与折叠、三种写规格），动手时另写成一个阶段。

## 约定

- 每个编号条目一次或几次 commit，直接合入 main；条目内硬切换，不留旧路径、兼容层或死代码。
- **行为不变是每一条的验收前提**：动手前存下每款游戏 `npm run check -- <游戏>` 的输出，改完对比。只有条目里写明可以变的地方可以不同，并在提交说明里按类别列出。
- 单元测试只用测试里现写的小内容或领域、模板的 `starter/`，不读任何一款真实游戏。
- 界面改动在浏览器里看桌面和手机，各走通一个任务到过关和一个到失败。
- 开发阶段不保留玩家存档，存档兼容不是任何改动的约束。
- 界面不加次要标签和说明文字。
- 机制先在内核里成形：做某一条时发现缺基础件，停下来在内核补，不在领域里先写一份。

## 不在这份计划里

- **参数台和它的模型**（《视觉完备》的十来个）：照现有逻辑走。去向是被别的玩法取代，或者单独做成一种更自由的关卡设计方式，另行决定。
- 关卡的重新设计。本计划只对内容做机械改动（改字段名、补字段）。

## 已定（执行时不用再问）

**名字**
- 件在代码里叫 `piece`，登记和读面的函数在 `engine/pieces.js`，内容文件是 `pieces.json`，操作是 `piece.*`、`pieces.set`。`part` 只指件在电路上的画法。
- 面在代码里的名字：空位 `holes`、设置 `settings`、区域 `regions`、内部 `inside`、画法 `faces`、保存 `keeps`。
- 一种玩法的配置叫 `play`，按内容里的 `kind` 取：领域在 `domains/<领域>/plays.js` 里写成纯数据，它的 schema 在 `engine/plays.js`。

**失败**
- `at` 是作品里的一个位置，四种写法：件的实例 id（板）、`{ row, slot }`（规则行和表）、从根数起的下标路径（条）、`{ tick }`（逐拍，和前三种可以并用）。
- `hidden` 只管检验给不给看。失败照样带上第一条不过的检验的 `want` 和 `got`。

**缓存**
- 领域对一关的检查经 `engine/check-cache.js` 缓存在本机（`trace-viewer/node_modules/.cache/games-check/<游戏>.json`）；`--fresh`、`npm test` 和副本不读。

**往后传的是谁的作品**
- 搭出的件默认跑玩家通过时的作品，没有就跑参考解。定义出的函数只用参考解（`plays.js` 里写 `gives: 'reference'`）。

## 执行须知

**命令**（都在 `trace-viewer/` 下）
- `npm test` 全部单元测试（约 50 秒）；`npm run lint:kit`；`npm run words -- --check`。
- `npm run check -- <游戏>` 查一款；不写游戏名是全部。
- 基线：动手前 `for g in vision-complete state-graph qed comp90086; do npm run -s check -- $g > <基线目录>/$g.txt; done`，改完同样跑一遍用 `cmp` 比。游戏的名单在 `games/games.js`。
- 词汇表变了要升版本并 `npm run versions` 存下；新版本只能在旧版本上增加。

**改内容只经操作集**
- `npm run op -- <游戏> --file <变更集.json>`，文件是 `{ "why": "…", "ops": [{ "op": "text.set", … }] }`（写成裸数组不报错，但什么都不改，还会留一条空记录）。`npm run op -- list` 列出全部操作。
- 文字只有基准语言；改一句中文要同时 `i18n.set` 新句的英文、并用不带 `to` 的 `i18n.set` 去掉旧句。

**几道只降不升的上限**（搬东西时会碰到，按实际数字改）
- `engine/styles.test.js`：每个区域写死的字号、颜色个数。样式从领域搬进 `shell` 时，`shell` 的上限升、领域的降，总数不许增。
- `engine/components.test.js`：每个领域自写组件的行数，必须正好等于现在的数。

**文字**
- 代码里的界面文字用 `T('中文', 'English')` 或 `tr(…)` 两个参数的写法；只写一个参数时英文要在 `kit/i18n/en.js` 里有。

**在浏览器里看**
- `npx vite --port 5199`，一关的地址是 `/game/<游戏>/index.html?level=<关卡 id>`。
- 全部解锁：打开前往 `localStorage` 写 `<游戏>.v2` 为 `{ "all": true, "seenPower": true, "solved": [], "flags": [], "passed": [], "skippedTasks": [], "stamps": {}, "data": {}, "slots": {}, "built": {}, "best": {}, "introSeen": {} }`。
- 开发服务器第一次打开会重新预构建依赖，页面要重载一次；卡住时删 `node_modules/.vite` 重启。
- 引言的遮罩（`.intro-scrim`）会挡住点击，先按 Esc。界面语言跟浏览器，脚本里设 `locale: 'zh-CN'`。
- 容器里的 Playwright 是全局装的：`NODE_PATH=$(npm root -g) node 脚本.cjs`。

**提交**
- main 上同时有别的会话在推：每次提交前 `git fetch --depth=50 origin main` 再 `git rebase origin/main`，推送用 `git -c push.negotiate=true push origin HEAD:main`。
- 提交说明照仓库的写法：`kit: …`、`image: …`、`table: …`、`logic: …`，一句话说做成了什么，正文说为什么。
- 每一条做完，同一个 commit 里更新 `games/DESIGN.md` 的对应处，并把这份计划里那一条删掉，在「现状」里记一行。

**这一带已知的坑**
- `engine/caught.js` 由 `shell/CircuitScreen.jsx` 和 `shell/Checks.jsx` 使用。
- 带参数的函数项曾因变量在定义前被用到导致页面崩溃。D.1 的浏览器验收覆盖了在定义右边放入带参数的函数项。
- 内核里一次外层求值中，打包的件的各个输出共用一次内部求值（`engine/boards.js` 的 `packed`）。逐步回放里，被几个输出共用的卡只出现一次。

## 没把握的地方

- 《状态之图》八种玩法的屏里，`Seam`（剪缝）、`Breach`（找破绽）、`Policy` 的交互是不是都落得进规则行、值表、玩家检验这几样基础件，是按数据形状判断的，H.4 动手时可能要调整，缺的基础件先在内核补。
- 《视觉完备》的图像值（图、热力图、斜率场）在内核结果区里怎么画：内核的显示系统（`views`）按「数据结构 × 显示方法 × 场景」取，H.3 要补图像这类数据结构的显示方法，画法本身可能仍由领域给成无头的数据。
