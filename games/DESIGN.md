# 类图灵完备游戏设计手册

这份手册适用于建在共享 kit（`games/kit`）上的所有游戏，包括已有的《视觉完备》《状态之图》《证明完毕》、COMP90086 笔记交互及以后的新游戏。各游戏自己的设计文档（例如 `games/vision-complete/DESIGN.md`）记录本专题的内容；本手册汇总设计经验、现有引擎结构和自动检查；教学设计建议供判断参考，具体实现及检查行为单独说明。

**目标**：引擎和视图做好以后，作者只需填入一个专题的教学内容，学习者就能用《图灵完备》的方式学会它：从少量能力起步，用预设承载固定计算，亲手设计有实现选择的组合，逐层建立可复用的机器。

对《图灵完备》本身关卡手法的研究，见《视觉完备》设计文档的第 1 节。

---

## 1. 设计取向

这些是辅助判断的经验，不是关卡的验收模板。面向具体主题、玩家和用户要求选择合适的形式；不要为了满足条目制造关卡、限制解法或掩盖更好的设计。自动检查的现有行为见第 5 节：检查结果是需要理解和处理的工程事实，并不代替教学判断。

- **让玩家在行动中理解问题。** 从领域目标和学习者已有知识出发，选择构建、实验、观察、调试、推理或其他适合的互动；让玩家能从材料和反馈得到作答所需的证据。
- **把复杂问题拆到可理解。** 看实际的概念、表示、约定和推理负担，再决定一个任务、一组任务还是几关。简单内容可以直接说明；难点可用对比、支架、反例和逐步组合引入。数量和顺序由学习价值决定。
- **让课程有方向。** 按依赖组织能力和应用；对于确实独立的内容，可用并行路线。让玩家理解为什么需要新能力，以及以前学到的东西在哪里继续有用；不强求每个主题都表现成一台机器。
- **保留有意义的选择。** 规格和测试描述要解决的问题，让不同正确方案成立。工具、预设和提示服务于知识目标，是否让玩家自行实现、实验或直接使用，要看它带来的学习价值。
- **解释原理，而非假定接法。** 文案给出必要的情境、条件与操作入口；通关后总结发现了什么、为何成立以及适用范围，不把参考解写成玩家的解法。
- **以实际体验为准。** 兼顾中英文、屏幕空间、可访问性和手机操作。自动检查证明它能检查的性质；教学效果、图示清晰度和交互仍需结合内容及实际页面评估。

**现有实现。** 学习者搭出的封装元件可运行其通过时保存的电路；固定计算可由预设提供。课程用 `adds`、`replaces` 和 `local` 描述元件的提供、沿用和替换，托盘配置决定显示顺序和二级菜单，任务用 `gives`、`withholds` 为自己增删元件和阶段（第 2.8 节）；参考解未使用的可用元件一般折叠在「更多」中。任务、存档和关卡树的具体行为见第 2、4、6 节。

## 2. 课程结构

**包提供对象，游戏编排课程。** 关卡设计在 `packages/<包>/` 里做：关卡、元件、词条各自独立，标签把同种对象收成集合，关系写先修和元件取代。标签没有教学含义，也不规定一关只能属于一个组；同一关可以出现在几个标签里。包之间可以依赖和覆盖，基础元件可以放进库包共用（第 6.1 节）。

**章是游戏层的内核对象。** 游戏配置 `game.json` 的 `chapters` 是 `list<chapter>`，给出章的全名和顺序。每章独立写在 `games/<游戏>/chapters/<章>.json`，全名为 `@<游戏>/<章>`。章的 `levels: list<level>` 保存具体关卡全名，`rows` 保存路线图。章文案和现有 `machine` 字段随章保存。原本用数字 id 编号的章增加 `number`，保留现有地图编号。游戏配置的 `encyclopedia: list<section>` 保留百科分组的显示顺序，分组内顺序取其 `values`。`course.json` 保留 `optional`、`skippable`、开局配置及工作单。导入标签会一次性展开并写入章的列表，之后由游戏维护顺序。

```json
// games/qed/game.json
{ "chapters": ["@qed/paper"] }
// games/qed/chapters/paper.json
{
  "chapter": { "title": "@course.eras.paper.chapter.title" },
  "levels": ["qed/table", "qed/always", "qed/onerow"],
  "rows": [["qed/table"], ["qed/always", null, "qed/onerow"]]
}
```

**先修来自关系。** 包的 `relations/<名>.json` 声明 `requires`；一条边两端都在课程里才生效。游戏要改变它，就覆盖这份关系，不另写一套依赖图。普通前置要求通过；来源关可跳过时，普通边改等它的前置，带 `required: true` 的边仍要求通过来源关。跨游戏边写 `{ "from": "qed/table", "game": "qed", "to": "…" }`，读取来源游戏的通过记录。参考解所需能力也参与技术依赖检查。关内任务的 `optional` 和课程的可选关分开。

游戏只检查它选入的关；没选入的关和在那里打开的百科不进入这款游戏。托盘上的元件或阶段有没有关带来，只在完整选入相关包的游戏上判断。`primitives`、`views`、`words`、`open` 等开局设置归游戏；`adds`、`local` 归关卡或任务，`replaces` 归包的关系。游戏只能覆盖文案和关卡关系，不能改关卡内容、元件、阶段、标签或托盘；行为不同就建一个依赖原包的新包。

**包没有课程。** 它可以只有元件，也可以只有依赖别包的关卡。包检查逐关独立运行；单关试玩使用这一关的托盘和任务，没有章、解锁和进度。不写托盘时提供全部件和阶段。内核的 `package-play.js` 提供临时单关运行壳，不生成可保存的包课程。

**存档按任务记。** `kit/shell/progress.js` 保存关卡通过记录和成绩，以及按任务全名保存的板、存档槽、通过记录和发布作品。任务可以重排、移到另一关，记录仍跟着任务走；id 一经建立不能改。`kit/engine/stamp.js` 按任务的谜题、测试及元件定义计算戳，文案和版面不参与；谜题改变时清理对应任务，元件定义变化可使全部任务失效。开发阶段不要求存档迁移。

### 2.1 机体与时代

机体描述学习者能操作的环境和外部能力，时代是课程分组；一门课也可以围绕同一机体逐章扩展能力。设计时说明能力的来历和变化，让玩家理解已有工具在新问题中的作用。

### 2.2 能力引入

引入关为后续问题建立必要的概念和能力。根据主题选择直接说明、示范、实验或构建；注意新模型、表示和操作之间的认知跨度。什么时候介绍工具、是否保存玩家实现，以课程目标和后续用途决定。

### 2.3 练习关

练习帮助玩家迁移和辨别，而非重复同一道题。可变化方向、复杂度、提示、组合和边界情况；同一关的多个任务或测试也能承担这些变化。不必为每个知识点或维度规定固定数量。

### 2.4 按问题组织关卡

围绕一个完整应用、延伸问题或机制原理设计一串关卡。按实际依赖接线，按教学需要安排关卡顺序。

### 2.5 延伸挑战

挑战可以在熟悉的能力上增加推理、组合或资源约束；依据目标提供反例、提示和足够有区分力的测试。当前引擎将挑战作为可选支线，具体审计见第 5 节。

资源约束写成任务的 `withholds`（第 2.8 节）：列出的元件（原始的或搭出的）这个任务不给，玩家已有也从托盘收起，写进板的文本时当作不认识的元件拒绝；参考解用到它，检查就报错。需要收窄设置时声明适当的元件阶段。约束要逼出一个想法，不只是逼玩家把收起的元件再搭一遍。例如同时收起差分和乘，让玩家发现翻倍数列的差分就是它自己晚一项。

### 2.6 关卡地图

地图把关卡画成按钮节点组成的树（`kit/shell/LevelMap.jsx` 的 `LevelTree`），规则是：
- 居中排列；几个关卡并排时整组居中。
- 地图按章内先修关系分层，同一层依课程顺序排列，每行最多三关。跨章先修通过锁关提示查看。
- 关卡统一用章号和章内数字序号，取自 `levels` 的顺序。关卡的内容 ID 用于编排板、引用和存档。
- 可选关用虚线描边，关卡分别显示「可选」和「可跳过」标签。里程碑用较大的按钮，包括每章第一关、首次引入元件、阶段或解锁作品的关。按钮右侧显示玩法图标，通关后可显示成绩。线路图的解锁标记显示电路元件。通关弹窗列出本次新获得的元件，以及在课程中刚满足全部前置的关卡。
- 游戏 `chapters/<章>.json` 的 `rows` 保存本章路线图布局，成员写关卡全名：每一行从左到右放哪些关卡，`null` 是空位，用来让关卡排得更整齐；一行最多三个位置，关卡要在它每个章内前置的下面。没有保存布局，或布局没写到的关卡，在满足已有布局的前提下按上面的规则排（`kit/course.js` 的 `mapRows`）：按先修关系一层一层排在前面各层的行之后，每行最多三关，排在它前置的下面、需要它的已排关卡的上面（插进的行把下面的行往下推）。
- 排得紧：一关只往下排到必须的位置（它的来路和同一列上面那关的下方，再避开横穿它这一列的连线拐弯），同一行的关不必对齐；连线上没有标签时，两关之间只留一小段线。
- 点一个还锁着的关，它和所有还要先通过的关一起高亮（跨章也算），并列出现在就能做的那几关，点一下直接去。
- 每关下面的连线上标出它带来的东西：这一关新带来的原始元件（这一关打开后显示名字，`introductions`），和通过它解锁的元件（通过后显示名字）。

先修边的挂靠位置也要考虑版面：一串支线挂在已经排满的位置，会被挤到下面，连线还会穿过别的关卡；这时换一个同样具备前置的挂靠关。

### 2.7 时代之间

时代之间可用新的问题、能力或情境说明学习方向；是否设置过渡任务取决于它是否有教学作用。

### 2.8 一关手里有什么

**进度给默认，任务再增删。** `packages/circuit/core/course.js` 和 `course-model.js` 用一个课程模型计算所有玩法的可发放对象、托盘和作品，不按领域另算。

- **托盘**是 `trays/<名>.json` 的对象，关卡或任务用 `tray` 引用。实际可用的是托盘成员与已解锁能力的交集；参考解用到的元件和 `featuredParts` 进入主区，其余折进「更多」。菜单、标题和工坊开关属于托盘，不从标签猜。
- **开放的单位是可发放对象或阶段。** 元件和符号都已登记，对象本身是第一阶段，`stages` 依次列后续阶段（第 6.8 节）。引用元件就是引用第一阶段，引用后续阶段会就地升级同一张卡。没有 `元件.设置`、`元件.设置=取值` 的派生项。
- `adds` 带来元件或符号，`local` 让同处声明的对象只在本关或任务使用，不带到后面。`opens` 在任务开始时开放阶段；`awards` 在任务通过后开放，关卡的 `awards` 在最后一个任务通过后开放。
- `gives` 只为当前任务多给元件、符号或阶段，`withholds` 收起它们，已有也不给。参考解使用不可用的元件、符号、阶段或设置会报错。
- 任务之间也有进度：能拿到先前任务发布的作品；发布哪个元件及 variant 由 `publishes` 声明，通关后保留实际判定的玩家作品。封装元件默认跑玩家的通过作品，没有才用参考作品；玩法可以明确选参考作品。

托盘可引用最终阶段，让包的独立试玩取得完整能力；游戏仍按学习进度决定阶段。托盘卡片与作品按基础元件 id 保存，阶段不是另一张卡。`replaces` 用于不同元件之间的升级、合并，同一元件的升级只用阶段。

**登记与查找。** `packages/circuit/core/grants.js` 集中保存可发放类型登记表及对象、阶段查找。`packages/circuit/core/mechanism/grants.js` 提供元件登记，`modules/logic/grants.js` 提供符号登记，各自的 `used(work)` 读取作品使用的对象，第二参数可提供该类型的定义表。发放字段的 schema 引用种类是 `grant`，直接写对象全名，可混写类型；同名跨两种可发放类型会报歧义，未登记类型的对象不能进入发放字段或托盘。`course.state(at, flags)` 按类型交付 `{ "circuit/part": { [全名]: 当前阶段定义 }, symbol: { [全名]: 当前阶段定义 } }`；证明板读取元件，填句子条读取符号。工坊和 `replaces` 只处理元件。

**符号独立声明。** 《证明完毕》的八个公式连接词在 `packages/qed/symbols/`，文案键用 `@symbol.<名>.…`，标签在 `tags/symbol/`，覆盖在 `overrides/<命名空间>/symbols/`。符号只声明标记、文案、图标和可选阶段。元件由 `circuit` 登记为 `circuit/part`；`symbol` 仍由内核的逻辑模块声明，第 9 步迁为 `logic/symbol`。Studio 单列符号，托盘编辑器和阶段链共用发放模型。

## 3. 基本元素和引擎里的对应

| 元素 | 含义 | 在引擎里 |
|---|---|---|
| 传感器 | 关卡给电路的一个有名字的值：一张测试图、机器人看到的一格、脚下格子的一条信息 | `packages/circuit/core/board/sensors.js` 的统一形状 `{ id, label, short?, type, family?, named? }` |
| 输入元件 | 电路板上固定的输入，按传感器的种类分（《状态之图》：视野、本格信息），不能放也不能删。元件一开始没有输出口；学习者点一个传感器（在元件上，或在输入窗口里），元件就多一个读它的输出口，再点一下就去掉 | `modules/table/model/parts.js` 的输入元件（读到的传感器存在 `params.picks`）；kit 的 `parts.outputs` 支持一个元件多个输出 |
| 原始元件 | 课程起点，内部不在本专题关心的范围 | 课程声明的 `primitives`（`games/kit/course.js`） |
| 中层元件 / 封装元件 | 学习者搭出、解锁后当一个元件用，打开能看里面 | `parts/<名>.json` 的 `inside` 存自带参考作品的版本，任务通过 `publishes` 声明它发布的元件版本（课程钩子 `needs` / `builds`）；`packages/circuit/core/boards.js` 的 `packed` 把通关时记下的电路当一个元件跑 |
| 规格 | 传感器、输出、测试、隐藏测试 | 各游戏的关卡数据（数据游戏：`levels/<id>.json`，字段由内核词汇表给出 schema） |
| 参考解 / naive 解 | 证明规格可解 / 证明直觉解法不够 | 数据游戏写成蓝图文本；`npm run check` 运行它们（各模块的 `validate`） |
| 反例 | 失败时具体的那组输入、期望、实际，以及第一处偏离 | 各游戏的失败面板（《状态之图》能定位到第一格算错） |
| 代价 | 元件数、求值步数、读取次数、表的大小 | `kit/engine/test-run.js` 的 `score` 钩子；《视觉完备》算计算量 |
| 世界 | 机体工作的地方：一张图、一张表、一排房子 | `modules/table/model/worlds/`；《视觉完备》测试数据 |
| 词汇表 | 内容能引用的全部项：元件、世界、机体、玩法、引言图、诊断条件…… | `kit/engine/kernel.js` 汇总 `modules/<模块>/vocabulary.js` 的能力声明 |

---

## 4. 一关怎么写

### 4.1 设计一关

先想清楚玩家要理解什么、已有怎样的基础，以及要通过什么观察或操作得到结论。一个任务可以承载几个相关步骤；多个任务也可以围绕同一个问题。依据实际难度决定拆分，不以每关概念数量、任务数量或公式形式机械判断质量。

审阅时可问：题目是否有清楚的情境、已知条件和目标？玩家能否看到需要比较的材料、调整适当的控制，并从失败或反例中理解问题？测试能否区分典型误解、边界和不同正确解法？通关后能否说清领域里的原理及其适用范围？

蓝图（`blueprint.json`）可记录知识点的术语、出处、依赖、难度和误解，以及关卡的 `question`、`chain`、`teaches` 和 `facet`；字段和当前流水线的检查见第 7.2 节。把这些记录当作设计与沟通工具，而不是代替对玩家体验的判断。

### 4.2 示例：从问题到体验

例如教授最近邻插值，可以让玩家面对新像素落在原像素之间的情形，比较不同取值及边界约定，再通过不同尺寸的测试检验。是否采用手算、电路或图示，取决于学习目标；通关后解释方法的领域含义，而不是假定玩家采用了参考电路。

#### 关卡数据与玩法

以下字段和玩法描述当前实现；具体字段由内核词汇表决定：

**常见内容：**

- **目标**：描述任务及所需条件。
- **传感器和输出**：读什么，写什么。
- **测试**：选取有代表性的例子和边界；领域可支持隐藏测试。
- **参考解和 naive 解**：当前检查会运行参考解及提供的 naive 解；检查行为见第 5 节。
- **新元件和托盘**：不写可用元件（之前出现或搭出的元件自动带过来）；只写这一关新带来的原始元件（`adds`），游戏有几套托盘时用 `tray` 写这一关选用的分组，单个名称或按顺序排列的名称列表。参考解用到的元件和 `featuredParts` 指定的可用元件放在主区，其余可用元件折叠。一个任务要比默认多拿或少拿几项（元件、设置、取值），写 `grants`、`withhold`；一项设置或取值要到某一关才出现，在那一关的任务上写 `opens`（第 2.8 节）。
- **预置**（可选）：板上一开始就摆好的元件，或拼好的一段电路（`preset`，取参考解里的几个元件及其外层框：它们之间、它们和关卡给的输入输出之间的线一起摆上）。玩家能挪动这些元件（只在它所在的区域里），不能删，也不能改这些线；预置元件空着的口由玩家接。元件上的设置默认由玩家改，每个预置元件可以单独固定它的设置：全部（`{ id, fixed: true }`），或其中几项（`fixed: [设置名]`），固定的设置在元件上只显示、不能改。用在一关的谜题围着一块现成的东西转的时候：别人给的证明器，摆在板上让玩家接上核去查它。
- **产出**（如果有）：通过后解锁的元件和它的接口（板上的输入就是它的输入口）。
- **提示**：按需要提供观察方向、支架或示例。
- **过关点题**：解释玩家理解的领域知识、作用及适用范围，参照下方文案建议。
- **按电路图检验**（可选的玩法，所有游戏都能用，和拼电路并列）：关卡不让玩家从空板拼起，而是给出几块电路（`play` 加 `boards: [{ label?, board }]`），每块就是一个测试案例，测试条上的标签就是它们，点一个标签，画布上就换成那一块；运行时逐块检验。标签用共用的 `TestTabs`，放在和拼电路关的测试一样的位置：桌面在测试条的头部，手机在界面顶部（滚动区之外）。
  - **纠错**（`play: 'audit'`）：每块电路固定、不能改，各错在一处。玩家改的是这一关的一份配置（领域给出它的编辑器：《证明完毕》是一张检验条例表，写下手里有哪些证明、按需求该不该证得出），一块电路在这份配置上暴露出错误，这个测试就通过。配置本身要合需求（期望写错时停下并指出哪一条不符），所以不能靠乱填过关；配置越小越好。判定有三种（关卡的 `want`）：默认是**抓住**（至少一处和预期不符）；**相符**（`want: 'agree'`：每一处的结果都和预期相符，用来练「怎样检验一块对的电路」）；**全部暴露**（`want: 'expose'`：每一处都和预期不符）。配置可以事先摆好几条（《证明完毕》的 `slots: [条例]`），每条写明哪些格子已经填好、不能改（`fixed`），或者一格里哪几项必须留着、玩家还能再加（《证明完毕》条例的 `keep`：前提里固定有某一句），玩家只填空着的格子；全部填好的那几条不用运行，一开始就显示结果。电路也可以是玩家在先修关里自己拼的那块（`carry`：那一关的 id；没有存档时用那一关的参考解）。
  内核的 `kit/shell/plays/BoardChecks.jsx` 组合规则行、检验条例表、作品保存、测试标签（`TestTabs`）和逐块回放（`usePlayback`）。领域给出被检验作品的展示、条例字段和判定报告。作者检查和界面回放使用同一份报告，先检查条例有没有写完、预期是否正确，再检验给出的声明。恢复作品时，固定格与必保留前提以关卡为准；参考条例按同样的字段约束检查。题目可以直接取参考解的 naive 解，或参考解各改错一处（变异）。
- **填表格**（可选的玩法部件，所有游戏共用）：玩家逐行填写的表（《证明完毕》的检验条例）用 `kit/shell/RowTable.jsx`。桌面上直接在表格里改：能改的列给出就地编辑器（列的 `edit(row, set, k)`：游戏自己的编辑器，或 `FormFields.jsx` 里的小号字段 `InlineChoice`；《证明完毕》的前提和目标是一句话，点开后在旁边的提示框里用填句子条拼），行尾 × 删除，表下的小按钮添一行空的。手机上表格本身只显示，列表式的列（`align: 'start'`）靠左，其余列和列头居中，放在固定窗口里可以左右滚动，每列按文字撑宽、超过约 16 个字才换行，每行加高便于点按，添加按钮是表下一个大按钮。桌面上是紧凑的表，添加按钮是表下一个小的虚线按钮。手机上点一行就弹出这一行的底部单子，和别的弹窗（假设框等）一样：改了立即生效，没有保存按钮，× 或点遮罩关闭，底部一个「删除」；「添加」先添一行空的再打开它的单子。游戏只给出列（`columns`）和表单的字段（`form(row, set, k)`、新行 `blank()`），字段用共用的 `kit/shell/FormFields.jsx`：`Field`（带标签的一块，里面放游戏自己的编辑器）、`ChoiceField`（几项并排的按钮选一项）。`fixed`：行数事先定好（关卡预先摆好几行空的），不能添加也不能删除，只能填写。手机上表格下方提示一句「点按任意一行即可修改」（`tip` 可以换成游戏自己的说法）。运行结果这类只读的列，由游戏在单元格里显示，表单不管。
- **一关是一串任务。** 一关说一次的东西（标题、引言、点题、带来和搭出的元件）写在关上，谜题（目标、提示、板的口、测试、参考解和 naive 解）是它的任务（`tasks`，至少一个），按顺序做：前一个通过才能做下一个，最后一个过了才算过关。只有一个任务的关就是普通的一关，任务条不显示；关长出第二个任务，就是在列表里加一个。词汇表用 `kit/engine/tasks.js` 的 `taskLevel(一次的字段, 任务的字段)` 写一关的 schema，模块读一关时用 `taskLevels(关)` 一个任务一个任务地读（每个任务是关的字段上盖着任务自己的字段），外壳也这样玩（`kit/shell/GameShell.jsx`）；搭出的元件跑它发布的 variant 所指的通过作品。拆成几个任务用在同一个问题换一种机器再做一遍的时候，比如骑士与无赖先把岛民的话翻译成真值电路，再用证明器证出来；也用在同一个想法用到两处的时候，比如《视觉完备》的补边，先给平移补边，再给滤波补边，不拆成两关。每个任务有 id（`id`）：整款游戏里唯一，也不能是别的关的 id；只有一个任务的关通常就用关的 id，新任务由操作集起名（`<关>_<n>`，建立后 id 不再更改）。玩家存下的东西按任务 id 记（`kit/shell/progress.js`：每个任务的板、通过了哪些任务），所以任务在关内换位置、插进新的、挪进别的关，板和通过与否都跟着它走；几关合成一关就是把任务挪过去、删掉空了的关。任务有名字（`step`，写在任务条上）；前一个任务搭出的能力，后一个可按发布和奖励取得（`publishes`、`awards`），整关通过才作为解锁列出；从上一个任务的板接着做的写 `carries`。每个任务的点题（任务的 `after`）只说这一个任务得到了什么，可以带出下一个要做的事，但不透露它的做法。一个任务要交代新东西（新元件、新规则、上一个任务留下的问题）时，写自己的引言（任务的 `intro`）：第一次做到它时弹出，之后随时能从引言按钮重看；第一个任务的引言接在整关引言后面。各模块的关卡都是这个形状，内核里只有这一种关卡遍历（`taskLevel` 是内核词汇表里唯一的关卡 schema，契约检查）：一关的玩法（`kind`、`mode`）写在任务上，几种玩法就是任务的 `S.by`，判别可以再套一层（《视觉完备》先按 `kind` 再按 `scene`，《状态之图》先按 `mode` 再按 `world`）。《状态之图》原来的「阶段」就是任务：一个阶段一个任务，接着上一阶段的板做的写 `carries`。模块读课程时不往内容里写（检查、操作集和开发页面都把内容深冻结了再读），它推出来的东西另起对象。

**文案建议。** 引言交代情境、必要的术语和假设，任务说明目标，提示依据玩家需要提供观察方向或适当支架。通关文字围绕问题的原理、名称、作用和边界展开；对多解问题，不把一种参考解说成玩家的做法。深度和篇幅按内容决定，适度示例或公式可服务于理解。

中文和英文各自自然、准确；共享手机和桌面文案时用控件名称而非依赖屏幕位置。名称、术语和引用要与内容一致，重排后检查先修关系和链接的可用性。元件说明以功能、输入输出及相关约定为主。

**现有内容能力。** 元件说明使用双语纯文本；正文可用 `<level-ref>`、`<part-ref>` 和 `<wiki-ref>` 引用已注册的关卡、元件和词条，链接显示的名字随内容更新。元件的后续 `stages` 可增量更新说明和卡片；阶段何时开放按第 2.8 节的 `opens`、`awards` 规则；选项说明由元件定义提供。词汇表中的引用和可用性由 `npm run check` 检查。

### 4.3 术语、路线与互动评审

`entries/<名>.json` 保存术语名称、解释、别名和开放位置，`sections/` 组织显示分组；`npm run pipeline -- <game> terminology` 可以辅助发现注册与引用问题。词条、正文和图示各自承担适合的解释，不要把链接当作理解的替代，也不必机械地避免必要的说明。

审阅路线时，检查各路径实际依赖的知识与能力；审阅任务时，检查新概念、单位、表示、可见证据和迁移机会。实验或选择题同样应让玩家有可观察的依据和有意义的判断。适当时可用 `.agents/skills/turing-complete-games/references/learning-review.md` 中的检查视角；桌面与手机上的可读性和操作需要实际查看。

---

## 5. 规则与自动检查

内核检查技术正确性和课程能否玩通：schema、引用、依赖和覆盖、端口与运算的值类型、设置、参考解通过、naive 解失败、作品实现无环、解锁可达和托盘上的元件或阶段有关带来。教学质量由关卡作者和评审判断。

| 检查 | 实现 |
|---|---|
| 元件存在，非原始元件在可用之前已由先修关搭出 | `not-built`、`own-level`、`built-later` |
| 可选关的作品只供依赖它的关使用，重复发布遵守先修链 | `optional-built`、`upgrade-order` |
| 关卡有课程位置，机体已可用且能执行所需机制 | `unplaced`、`machine`、`mechanism` |
| 沿用作品的来源关是先修，托盘成员和阶段确实被引入 | `carry-unseen`、`tray-unmet` |
| 引用存在、标签和关系无环、覆盖来源明确、游戏仅覆盖文案和关卡关系 | 对象和内容检查 |
| 章的路线图一行最多三个位置，后置关在前置关之后 | 游戏 `chapter` 对象的 `rows` 检查 |
| 元件的行为与签名一致，参考解通过、naive 解失败 | 元件契约和逐任务检查 |

`npm run check` 在 `trace-viewer` 目录运行。技术问题可暂记在游戏 `course.json` 的 `open` 工作单；新问题或已解决但未移除的工作单项目使检查失败。包检查不生成课程，逐关独立验证。教学建议不进入 `open`，也不影响 check 的通过与否。

### 5.1 关卡开发规范

以下规范供人和 agent 在设计、试玩和评审时遵守，不是自动审计规则，也不需要教学元数据。

- **按真实问题引入能力。** 一次围绕一个主要新想法组织任务，比较元件、设置或阶段带来的认知负担；几个元件是否属于同一个想法由作者结合问题判断，不声明概念标签。旧 `many-new` 的关切在这里评审，不机械计算元件数。
- **引入后尽快使用。** 新能力应在引入它的任务里发挥作用，并在后续任务或封装元件里继续使用。若它要等几个无关的新能力之后才用到，重新考虑引入位置；不为满足次数或间隔而补关。这取代 `idle-idea`。
- **首次体验能观察到意义。** 不把一句说明就能理解的工具拆成只放单个元件直连目标的关。假设框、区域、回溯等用法本身抽象时，可以安排专门体验，但应通过中间状态、对比或失败让玩家看见机制。理由写在关卡设计文档中，不在内容里声明 `showcase`。这取代 `bare-intro`。
- **形成可复用的抽象。** 检查搭出的作品是否在后续任务中复用；若参考解反复照抄已可封装的结构，判断是否应改用封装元件或调整课程位置。终局作品可以有独立价值，不必为每个作品安排后继关。这取代 `unused`、`bypass`。
- **控制当前任务的操作负担。** 看分段之后仍需操作多少个元件、手机是否能理解和完成；必要时拆任务、形成中间作品或减少无关元件。八个松散元件可以作为评审提示，不是 `open-crowded` 硬上限。
- **明确能力的来源。** 通常通过构建获得可复用作品，已有条件或借用工具可以由任务给出；不要为避免旧 `granted` 规则强迫玩家重造它。依赖已能携带的元件通常不用重复列在 `adds`，但重复声明不是 `carried` 技术错误。
- **按试玩证据判断难度。** 比较相邻任务的尝试、提示、放弃和用时，结合样本量与玩家背景诊断突增；不由固定比例或次数阈值自动判定 `difficulty-spike`。

玩家看到的「新」按这条先修路线中元件或阶段的首次引入计算，后续任务不重复标记；并行分支各按自己的先修计算。它不是认知负担的评分，也不按想法合并。新阶段显示在原元件卡片上。

---

## 6. 引擎：内核与内容

包提供机制和内容，游戏以纯数据编排。包可有无界面的 `core/index.js` 和界面的 `view/index.jsx`，两者导出 `register(kernel)`；内容仍经操作集写入。`MODULES.md` 第 5–8 步已完成。`circuit` 的内容含义、运行和外壳扩展位于 `packages/circuit`，`rows`、`tick-bus` 已成为依赖 `circuit` 的独立包，其余两个既有模块继续通过公开导出使用它。新增玩法使用包协议。Studio 的元件、托盘和阶段链编辑器交接属于第 11 步。

| 位置 | 职责 |
|---|---|
| `kit/engine/`、`kit/course.js` | 平台注册表、组装、路线拓扑、检查框架、操作集 |
| `kit/modules/<模块>/` | 尚未迁出的 logic、table |
| `packages/circuit/core/` | 电路求值、蓝图、元件、阶段、托盘、发放状态、工坊和原生读者 |
| `packages/rows/`、`packages/tick-bus/` | 等式行、逐拍总线的核心、视图、字段声明和普通起步对象 |
| `packages/circuit/view/` | 画板、电路屏、读数、元件册、工坊、训练控件和专用样式 |
| `kit/strip/`、`kit/shell/`、`kit/views/` | 外壳、通用呈现，以及尚待所属模块迁出的编辑部件 |
| `kit/templates/<模板>/starter/` | 复制起步的内容，不被依赖 |
| `packages/<包>/` | 对象、依赖、文案、覆盖；可带 `core/`、`view/` 机制代码 |
| `games/<游戏>/` | 选包、课程、入口文案和允许的覆盖 |

参考解、naive 解、预置板和玩家蓝图共用 `packages/circuit/core/board/text.js`。端口名、设置值和蓝图标识用 ASCII，符号放在标签里；内容全名接受 `/`，能力名用 `:`。框与区域、端口接线、电路运行报告、封装作品和失败位置由 `circuit` 处理。判定使用播种的随机数，不读时钟或未播种随机数；模块实现走代码审查，内容不能写函数或计算脚本。

### 6.1 内容：对象、依赖和覆盖

**命名空间和全名。** 包的对象全名是 `<包>/<名>`；游戏自有文案用 `@<游戏>/<键>` 的命名空间，避免同名游戏和包混淆。在声明文件内引用本包可写短名，引用别包写全名；标签引用前加 `#`。文案字段的 `@` 是引用标记，例如游戏文案组装为 `@@qed/chapter.paper.title`。组装后模块、检查、页面和存档都读全名。

每种对象一张注册表，名字在同种里唯一。标签的成员种类写进路径；标签身份是「成员类型 + 全名」，不同成员类型可以同名。组装后用 `registries.tag[tagKey(member, fullName)]`（键为 `<成员类型>:<全名>`）读取；`content.tags`、`sources.tag` 同键，`overrideHistory` 的标签事件携带 `member`。引用仍写 `#<命名空间>/<名>`，在字段期望的成员类型里查找；不限成员类型时，同名多类型报歧义。元件和它的阶段也共用名字空间。

| 对象 | 包内文件 | 职责 |
|---|---|---|
| 关卡 `level` | `levels/<名>.json` | 关卡与有独立 id 的任务 |
| 元件 `circuit/part` | `parts/<名>.json` | 运算或封装作品、设置、阶段、外观 |
| 符号 `symbol` | `symbols/<名>.json` | 填句子条的连接词，含 `mark`、`name`、`desc`、`icon` 和可选 `stages` |
| 词条 `entry` | `entries/<名>.json` | 百科正文、关联和开放位置 |
| 标签 `tag` | `tags/<对象类型>/<名>.json` | 同种对象的无序集合，可嵌套，不成环 |
| 关系 `relation` | `relations/<名>.json` | `requires`、`replaces` 的有向边 |
| 托盘 `circuit/tray` | `trays/<名>.json` | 可发放对象和阶段的 `values`、二级 `menus`、标题、说明、`workshop` |
| 百科分组 `section` | `sections/<名>.json` | 标题、说明和词条或词条标签的 `values` |
| 对象类型 `kind` | `kinds/<名>.json` | schema、目录、引用方、关系、覆盖、文案与左栏声明；全名 `<包>/<名>` |
| 章 `chapter` | 游戏 `chapters/<名>.json` | `levels: list<level>`、`rows`、文案与显示配置 |
| 游戏配置 `game` | 游戏 `game.json` | 选包、`chapters: list<chapter>`、入口文案 |
| 包声明的对象 | `<声明目录>/<名>.json` | 自动参与引用、标签、关系、覆盖、来源、文案和操作集 |
| 尚待迁出的内容种类 | `<种类>/<名>.json` | `wordset`、`quote`、`power`、`box` 暂随旧模块 |

一个对象一个文件，文件名提供 id，文件不再重复存对象 id。任务、阶段、菜单等对象内部的身份仍写在内部。标签只提供集合和 Studio 的名字、说明，不承担托盘、百科分组或概念功能；同一个词条可进几个分组，未分组的归「其它」。组装后的 `glossary`、`partDefs` 和 `eras` 是运行与显示投影，不是可写文件。

**集合字段按 schema 工作。** `set<T>` 无序且不重复，`list<T>` 有序且不重复，`edges<T>` 是无环有向边。`T` 用成员 schema 表示，例如 `{ "type": "str", "reference": "circuit/grant" }`；类型组由包登记的引用匹配提供。标签的 `values` 是 `set`，托盘的 `values` 和 `menus[].values`、百科分组的 `values`、章的 `levels` 与游戏配置的 `chapters`、`encyclopedia` 是 `list`。`menus` 是以 `id` 为身份的对象列表。托盘先按 `menus` 顺序显示菜单，再按 `values` 顺序显示直接成员，菜单内部各自保留 `values` 顺序，`workshop` 省略表示可进工坊。

关系文件写 `{ kind, edges: [{ from, to, required?, game? }] }`。`requires` 的 `edges` 是 `edges<level>`，`replaces` 是 `edges<circuit/part>`。先修关系的标签端点按集合边界连接。内核统一检查集合成员引用、重复、标签嵌套环和有向环。Studio 用 `orderedMembers(content, ids, kind)` 按先修和名字排列分组成员，标签名称按全名排列。

**依赖。** `package.json` declares `version`, a `kernel` range, and direct `uses` as a range map. 包只可引用自身和直接依赖的对象，依赖不传递授权、不成环。游戏 `game.json` 的 `packages` 必须列全依赖闭包，至少一个包。加载按依赖拓扑排序，平局按包名，游戏最后；The first key in the ordered `packages` map selects the primary package. Selection order does not change topological loading.

**解析和公开面。** `engine/resolver.js` 的 `resolveLayers` 是读取游戏、包和依赖的唯一入口，产出拓扑排序的层；检查、操作集、Studio 服务端、构建、单关试玩、基线和 MCP 共用。内容根目录由解析器解释：默认当前工作区（从 `trace-viewer/` 运行时取其父目录），可传 `root` 或用 `GAMES_ROOT` 覆盖。平台的安装位置不决定内容位置。游戏工作区只消费解析后的公开数据，依赖并发校验也重新解析层，不扫描包的内部文件。Vite 从已解析层取得代码入口。

**要先存在。** `engine/existence.js` 按 schema 的 `ref`、`name`、`level`、`task`、`call`、`reference` 类型遍历字段、分支、列表和映射键，再收集覆盖目标、标签及其增删成员、关系端点、托盘与发放成员、`uses` 和游戏 `packages`。展开前保留贡献目标，检查对照 `publicSurfaces` 中所属命名空间的声明和代码登记身份；覆盖本身不能证明目标存在。公开面现在来自工作区层，第 4 步由 manifest 提供，检查不访问文件系统。缺失、歧义、未声明依赖共用 `{ rule: "exists", at, layer, kind, target, member?, reason, says }`，`reason` 为 `missing`、`ambiguous` 或 `undeclared dependency`；`says` 如 `missing target tag library/all (member level)`。加载负责解析与必要的结构判断，引用展开只做集合、类型和成环处理，不另报目标不存在。

**覆盖。** 凡是改别人的对象，都写在覆盖者的 `overrides/<命名空间>/` 下，原声明不动。覆盖路径由 `engine/layers.js` 与操作集统一解释：关卡用 `levels/<名>.json`，元件用 `parts/<名>.json`，符号用 `symbols/<名>.json`，词条用 `entries/<名>.json`，标签用 `tags/<种类>/<名>.json`，关系、托盘、百科分组分别用 `relations/`、`trays/`、`sections/`，其它内容种类用自身目录；文案用 `i18n/<lang>.json`。

| 字段类型 | 覆盖补丁 |
|---|---|
| `set<T>`、`edges<T>` | `{ "add": […], "remove": […] }` |
| `list<T>` | 同上，并支持 `{ "insert": [{ "before": <成员>, "values": […] }] }` 或 `after` |
| 普通值 | 写集合数组表示整份替换，未写的字段保留 |
| 文案 | i18n 按键合并，后层覆盖前层 |

`engine/collections.js` 统一完成字段合并。嵌套对象列表用 `id` 定位成员，边用 `from`、`to`、可选的 `game` 定位，移除边时无需重复 `required`。独立包可向同一对象提交集合字段的增量补丁，纯集合贡献按加载顺序合并。整份替换或覆盖普通字段的独立覆盖要求明确依赖。成员来源存于 `sources[kind][name].collections[fieldPath][memberKey] = [layer, …]`。标签键用 `tagKey`，边键是 `[from,to,game或null]` 的 JSON，嵌套路径例如 `menus[qed/proof-and].values`。游戏配置的来源身份为 `sources.game["@<游戏>/config"]`，其中 `collections.chapters` 和 `collections.encyclopedia` 同样记录成员贡献。原始标签引用保留自身贡献来源，展开时可沿对应标签的同一份来源表查询成员。`overrideHistory` 保留覆盖前后值。

**每种对象类型显式声明层权限。** `declares` 是 `package` 或 `game`，`overrides` 按覆盖层列出字段路径。`*` 允许全部字段，`$text` 允许 schema 中的文案字段。未列出的层和字段不能覆盖。包声明示例为 `{ "declares": "package", "overrides": { "package": ["*"], "game": ["$text"] } }`。内核类型的定义在 `kind-policy.js`，包类型在 `kinds/`，`layerProblems` 按同样的两个属性报告 `rule: "layer"`。

| 内核类型 | 谁能声明 | 包层覆盖 | 游戏层覆盖 |
|---|---|---|---|
| level、task、tag、entry、section、kind | package | 全部字段 | 文案 |
| relation | package | 全部字段 | 文案，requires 另允许 edges |
| chapter、game | game | 无 | 全部字段 |
| i18n | 各自语言表 | 文案键 | 文案键 |

**检查命令**（`trace-viewer/`）：`npm run check -- <游戏>` 查课程和选入的关；`npm run check -- --package <包>` 不生成课程，先查对象、引用、依赖和覆盖，再查元件的类型与设置，最后逐关检查参考解通过、naive 解失败。课程解锁、托盘引入来源、章和进度只在游戏上查。不写目标时查全部游戏，再查没有游戏玩的包；同名时用 `--game`、`--package` 区分。

包和游戏各有 `i18n/<lang>.json`、`changes.jsonl`。游戏另有 `game.json`、`course.json`、`chapters/`，可有作者侧 `blueprint.json`、`pipeline.json`。`resolver.js` 读盘，`content.js` 组装；页面加载构建出的 `content.json` 和语言文件，`publish:content` 检查后只发布内容。文件按职责放，开发按对象做：Studio 聚合对象的定义、文案、标签、关系和覆盖，不要求作者来回找文件。

### 6.1.1 Versions, locks and releases

All commands run in `trace-viewer/`.

```sh
npm run deps -- lock --package arithmetic
npm run deps -- lock --game qed
npm run deps -- upgrade --game qed [package]
npm run publish -- arithmetic --launch
npm run publish -- kernel --launch
```

Before launch, packages declare `{ "version": "0.0.0", "kernel": "^0.0.0", "uses": {} }`. All dependency ranges remain `^0.0.0`. Publication is disabled unless `--launch` is explicitly supplied.
Games declare `kernel` and an ordered `packages` range map. The first key is the primary package.
Ranges accept full `x.y.z`, `^x.y.z`, and `~x.y.z` only, with SemVer zero-major caret boundaries.
`lock.json` belongs to each target and pins the entire selected dependency graph plus `kernel` to
`{ "version": "0.0.0", "hash": "<sha256>" }`. Package locks exclude the package itself.
The target lock is authoritative for that assembly. Package locks govern independent package checks.
A range mismatch, missing/extra lock entry or changed archive dependency hash is a structured `dependency`
problem with `layer`, `kind`, `target`, `reason`, `object`, `path`, `at` and `says`. Export/build refuses
these problems. Lock updates are explicit. `upgrade` updates selections and runs the target check.
A named upgrade retains the other exact archive pins. Workspace source changes do not invalidate retained pins.
Package selection operations take a required `range`; adding/removing a selection updates the game lock.

`resolveLayers` is the only content loading entry. It prefers a workspace source directory, treated as
the unpublished next revision, and computes its manifest. Otherwise it validates the indexed zip hash,
extracts the selected locked release and uses the same layer reader. Archive packages are read-only.
Existence checking consumes manifest identities, including typed tags and code registrations.
Pending author edits use their recalculated public surface. Workspace source and local platform hash drift does not invalidate locks.

The local release store is `releases/` at the resolved workspace root, overridable with
`GAMES_RELEASES`. `index.json` indexes exact versions and archive/content SHA-256 hashes.
The first release of every package and platform is `1.0.0`, enabled explicitly with `--launch`.
The release store is outside Git.
Remote URL stores and platform installation belong to the later repository split.

Publication checks the package in an isolated package workspace and runs its `test/*.test.js`
contracts. Code packages require contracts. The manifest records qualified objects and hashes,
object-type declarations, typed tags, code names, core/view exported interface names, file hashes,
compatibility findings and affected dependents. All source files are archived except generated
`manifest.json`, transient author locks, OS metadata and dependency/VCS directories. `lock.json`
is included and hashed. Author history `changes.jsonl` is archived and file-verified, but excluded
from content identity so adopting an unchanged authoring state does not invalidate dependency locks.

Structural comparison permits new identities, optional schema fields and widening alternatives.
Removal or narrowed contracts conservatively count as breaking, including unreferenced identities.
Dependent package/game checks run against the previous archive and current source with lock freshness
excluded only in those internal probes. Their exit status/stdout/stderr are compared. A break or changed
observation increments major, additions increment minor, and unchanged public/observed behavior increments
patch. First publication starts at `1.0.0`. Publication reports all installed transitive dependents on
breaking/behavior changes. These check observations are finite evidence. Platform behavior probes remain
pending; its current publication compares structure only.

Studio consumes `packages` and `games` tool metadata for ranges and lock status. Package records include
`manifest` and `compatibility` (`type`, `changes`, `added`, `previous`, `next`, `proposed`, `affected`,
`behaviorStatus`). Before launch, `next` is null and `proposed` is informational. Preview is structural and marks behavior `pending-publication`; published manifests
store completed comparison results. Direct Node consumers may use `packageCompatibility` and
`resolveLayers().lockStatus`. Version/status/compatibility presentation remains Studio work.

### 6.2 一份词汇表与 schema

模块向 `engine/capabilities.js` 注册能力，`engine/kernel.js` 拼成**一份词汇表**。能力按种类分表：值类型、运算、原始元件、板、任务、内容项、显示、语言、内容种类；名字为 `<模块>:<名>`，与内容对象的 `/` 区分。`describe` 打印完整声明，运行按内容所用能力选择模块和 schema 投影，不把包绑定到模块。

- **值类型决定能不能接。** 运算声明输入、输出、可选输入、区域的类型和参数；元件的端口与调用须匹配。数、图像、公式、表等类型由模块注册；当前一个运算全名只登记一个实现，重复注册拒绝，不按值类型自动挑同名实现。实现可声明联合类型或动态值。`arithmetic` 的四则元件使用数值运算；跨模块共享不表示同一元件可直接处理图像，仍看运算和板的类型契约。
- **schema 是数据。** `engine/schema.js` 的 `S.text()`、`S.obj()`、`S.ref()`、`S.call()`、`S.level()`、`S.task()`、`S.board()`、`S.syntax()` 描述字段、引用、蓝图和小语言。提示 `view`、`step`、`section` 只帮助编辑器选通用控件。语言由模块注册读法，不把函数塞进内容。
- **文字只带内核标记。** `engine/markup.js` 校验强调和引用等允许的标记，外壳绘制，不把内容当 HTML 插入；自画 SVG 的模块仍须转义。
- **Platform and package versions.** `kit/platform.json` owns the platform semantic version. Vocabulary declarations remain the schema/capability API, with no separate version number or historical vocabulary snapshots. Release manifests record the public surface. `npm run publish -- kernel --launch` explicitly enables publication, compares platform structure and computes its version. Before launch all versions stay at `0.0.0`. Package publication also compares dependent check observations.
- 内容只选择能力、填参数和组织对象。新机制经包的 `core/`、`view/` 代码提交和契约测试提供，不通过内容表达式绕过协议。旧模块词汇表在迁出期间保留。

### 6.3 模块契约与一个课程模型

`kit/modules/<模块>/module.js` 注册能力；`runtime.js` 提供 `vocabulary`、`prepare`、`spec`、`validate`、`play`，可提供名字与语言读法。`engine/contract.js` 检查声明、实现和工具入口，页面侧通过注册的显示能力加载实现，通用渲染器不直接引用模块 UI 或 CSS。

`kit/course.js` 保留路线拓扑。`packages/circuit/core/course-model.js` 与 `core/course.js` 负责元件、阶段、托盘、`local`、`replaces`、`gives`、`opens`、`awards`、`withholds` 和发布状态。`kit/shell/progress.js` 记录任务、关卡和作品槽位，包通过显式回调保存自己的扩展状态。模块负责读自己的任务和作品、运行和反馈，适配层不再重写课程。引理、等式、函数和训练等行为由元件与任务声明触发，不按包所属模块开关。

契约还检查蓝图读写往返不变、参考解通过和 naive 解失败；封装元件运行交来的玩家作品，明确声明内置实现的例外须有理由。失败保留结构化位置、应得、实得和原因，界面、作者检查和文字试玩共用判定及运行报告。

**技术层与规范层分开。** 内核只查 schema、引用、类型、答案和课程能否玩通。怎样引入新想法、何时复用、首次遭遇能否观察清楚、手机操作负担是否合理，由第 5.1 节的关卡开发规范评审。没有概念标签、`concept()` 或对应的教学元数据；技术检查通过不证明教学质量。作者流水线的蓝图与教学 lint 是另外的评审辅助，不恢复成课程模型的硬规则。

**测试不认识真实游戏。** 单元测试用测试内的小内容或 `kit/templates/<模板>/starter/`，不读真实关卡、任务 id 或关卡数。真实内容由操作集和 `npm run check` 检查。改内核跑 `npm test`、`npm run lint:kit`、`npm run words -- --check`；Public-surface changes are versioned automatically during publication.行为重构对比游戏的检查输出，只接受事先说明的差异。

### 6.3.1 包插件协议（第 2 步）

`packages/<包>/core/index.js` 和 `view/index.jsx` 均导出 `register(kernel)`，按直接 `uses` 的拓扑顺序登记。检查、基线与 `play_task`（`game` 或 `package`、`level`、可选 `task`、`work`）只加载包的核心；游戏与 Studio 的 Vite 入口同时加载两份。公开导出使用 `kernel`（`kit/engine/index.js`）、`kernel/view`（`kit/app/view.jsx`），依赖包用 `<包>` 与 `<包>/view`，禁止深入依赖内部路径。

- 核心可调 `object(kind, fullName, value = {})`（登记代码持有的任意对象类型实例）、`play(name, { initial, read, write, normalize, run, judge })`、`kind(name, { type, read })`、`state(name, derive)`、`check(name, check)`、`agent(name, { observe, act })`、`tag(fullName, member)`。标签读者登记本包的 `<包>/<名>` 与单个成员类型；其它登记名字必须是本包的 `<包>:<名>`；每张协议表内重名报错。`kernel.meanings(type, value, context)` 调用该类型登记的含义；`judge` 返回 `{ pass, score? }`，`evaluatePlay(kernel, task, work, context)` 统一读取、规范化、运行、判定、保存。
- 视图可调 `play(name, { component, preview, modes? })`、`editor(name, { type, ...editor })`、`display(name, display)`。核心与视图的玩法名配对；孤立视图报错，游戏实际用到只有核心的玩法时报错。主区组件接收 `{ task, work, onChange, state, context, phone }`，内核负责保存、检验与通关。Studio 可直接读取 `kernel.tables.playView` 的预览、编辑模式，以及 `editor`、`display` 表。
- 新任务用 `play: "text:answer"` 选择玩法。`text` 是无元件依赖的最小插件：五关分别演示精确匹配、忽略大小写与空白、正则、带非负容差的数值、多个可接受答案。配置为 `answerRule`、`referenceAnswer`、`wrongAnswers`、可选 `choices`；检查参考答案通过且全部错误答案失败。正则每次创建，拒绝有状态的 `g`/`y` 标志。
- `kinds/<名>.json` 的对象声明是 `{ folder, schema, references?, relations?, override?, text?, studio? }`。`schema` 使用 `S` 的 JSON 结构；`references` 列出允许引用它的对象类型；`relations` 将关系名映射为 `{ from, to }` 对象类型；`override` 是 `replace`（默认）或 `append`（合并 `values`）；`text` 列出文案字段路径（列表元素用 `*`）；`studio` 是 `{ name, icon, group? }`。对象类型全名 `<包>/<名>`，实例全名 `<包>/<对象名>`。实例标签在 `tags/<对象类型全名>/<名>.json`，覆盖沿声明目录写入 `overrides/<命名空间>/`。
- 字段扩展用 `{ extends: "level" | "task", fields: { 字段: schema } }`，不能重定义已有字段。内核类型与保留目录不能用包声明替换。`kind.put/set/remove` 编辑定义，`object.put/set/remove` 用 `{ kind, name, data? }` 编辑声明实例；代码目录不属于操作集。
- 代码读取的标签归读者所有。内核登记 `kernel/studio-left`，成员类型为 `kind`；`kernel` 是保留命名空间，不能用作包名。包用 `kernel.tag("包/名字", "成员类型")` 登记，登记表 `kernel.tables.tag` 使用相同的复合键。自己声明写 `tags/<成员类型>/<名>.json`，贡献给读者或依赖标签写 `overrides/<命名空间>/tags/<成员类型>/<名>.json`。所有对象类型的目标都必须由所属包声明或由代码登记；标签还须匹配成员类型。不存在的目标统一由存在性检查报告。标签文案键使用 `@tag.<名>.title`、`@tag.<名>.desc`，托盘继续使用 `@tray.`。没有短名跨包合并或 `templates` 约定标签。新对象复制任意已有对象或从 schema 起步；精选起点可用普通标签。Studio 的左栏读取、标签打开与地址携带成员类型的界面接入另行完成。
- `plugin-boundaries.js` 用 AST 同时检查静态 import、re-export、动态 import 和 require，拒绝计算出的导入路径。核心只能引用公开无界面接口与本核心，禁止界面库、JSX、CSS、Node I/O；视图可读本核心。`npm run check` 加载代码前检查，`lint:kit` 使用同一规则覆盖包代码。核心判定应保持确定性，只使用传入种子，不访问时间、文件或网络。

对象类型的含义由 `kind` 登记提供。内核依 schema 读取、覆盖、展开引用和检查字段，调用含义对象完成派生。`circuit:part` 解释元件、阶段、发放和 `replaces`，`circuit:tray` 解释托盘及菜单，`circuit:quote` 读取引语。它们的文件类型分别是 `circuit/part`、`circuit/tray`、`circuit/quote`。`relations` 声明给出自定义关系的端点类型。

- 内容生命周期包括 `vocabulary`、`names`、`identities`、`indexes`、`matches`、`assemble`、`source`、`override`、`validate` 和 `stamp`。派生字段由 `derived` 列明，`source` 给出派生注册表对应的源对象，写回时只序列化声明。`configuration` 为扩展字段声明所属配置文件。内核无需理解元件和发放字段。
- 课程含义通过 `dependencies`、`plan`、`supplies`、`readWorks`、`taskModule`、`runtimeIds` 和 `scope` 参与通用课程组装。`state` 返回包的派生状态，`check` 判定作品，`play` 负责作品读写、运行和盲玩。现有五个原生消费者使用包的两阶段读者适配。内核进度只推进任务和关卡。
- 创作适配使用 `workspace`、`operations`、`selector`、`textTarget`、`sourceArguments`、`search`、`tools`、`dependencyGraph` 和 `renderWork`，共享操作集保持通用对象 CRUD。`part.*`、`parts.*`、`level.blueprint`、`level.adds` 和 `flow` 实现在包内。类型 schema 和文案定位由包提供。
- 外壳通过游戏的 `shell`、`settings`、`mapBadges`、`referenceName`、`describeObservation`、`composeModules` 接口挂载包行为，引用显示器由 `display` 登记元数据定义。元件册、工坊、元件奖励、连接标签设置和元件样式归包。`Workbench`、`Library`、运行控件、存档上下文和输入交互是共享布局部件。
- 基线观察由含义对象的 `baselineCourse`、`baselineStructure`、`baselineRecords`、`baselineReports` 提供，继续比较完整作品、顺序、结果和轨迹。引擎工具保存通用快照与差异算法。

临时桥接仅有 `engine/circuit-bridge.js` 的逻辑符号发放登记，以及 `kit/modules/{image,table,logic}` 经 `circuit` 公开导出的调用。前者在 logic 迁包时删除，后者随第 7–10 步各自迁出时删除。内核测试的 `ops/fixture.js` 显式安装 circuit 测试夹具。Studio 保留现有专用编辑界面，读取包声明和通用操作的契约，后续由第 11 步交接编辑器。
包的测试在 `packages/<包>/test/`：核心在 Node 中单独登记、检查自己的关卡、观察和提交盲玩作品；视图用 Vite 配对并挂载外壳，另测跨包组装。内核测试只构造小夹具。新代码包不在已锁定的旧基线语料中时明确报告，由契约测试覆盖，旧基线缺失仍报错，禁止用 `save` 更新迁移验收结果。

### 6.4 参数台

**电路拼不出来的机制用参数台**（机体的物理传感器、连续信号的采样、几万步的训练、几百次随机试验、一场对抗）：玩家不接线，只转旋钮、按按钮，看模拟怎么变。所有参数台是同一个界面（`packages/image/view/bench/Bench.jsx`），数据和判定在 `packages/image/core/bench.js`（node 下也能跑，`npm run check` 用它）。当前参数台由两个图像内容包使用，随图像机制放在 `image`；新消费者通过包依赖复用。

《视觉完备》2-3、2-4 的频率探针是图像模块的参数台模型 `bench.model: probe`。0-2、0-6 的黑箱探针是 `kind: probe` 玩法，玩家通过切换测试图和检查输入输出选择黑箱操作。两种玩法共用 `workshop` 的页面和内核的像素显示，分别用参数目标和选择答案判定。

波形参数台、频率探针、电路波形元件和测试场景从图像模块的 `engine/waves.js` 取波形和采样点。频率探针从画出的乘积曲线取样计算平均值。采样台用 `engine/fourier.js` 里的逐轴变换重建曲线，图像频谱的行与列也用这个变换。

一关的参数台全是数据，选模块的项、填参数：

| 字段 | 内容 |
|---|---|
| `model`、`setup` | 模拟：模块词汇表 `benchModel` 里的一项和它的参数。模型是代码：由旋钮算出一组有名字的量（`view`），会自己走的（训练、对抗、限时的轮）还有状态和动作（`start`、`act`，`after` 要求隔多久自动做一个动作，比如倒计时） |
| `knobs` | 旋钮：一段刻度（`min`、`max`、`step`）、一张表里的第几个（`values`）、几个选项之一（`choices`，`look: dot` 画成大小不同的圆点）、开关（`toggle`）、一列东西（`list`，在图上点出来）；`fixed` 只显示，`drawn` 在图上拖、不另画控件，`perCase` 每个情形一个值；`format`、`unit` 定读数怎么写 |
| `cases` | 几个情形，同一组旋钮要在每个上都过（几张图、几种外点比例）；头上一排切换，每个带对错 |
| `stages` | 一步一步走：每步的标题、说明、开哪几个旋钮（`opens`）、起点（`start`）、目标、过了说什么（`win`）、没过说什么（`status`），加上模型要的字段；过了才有「下一步」，走过的步可以回去。一个量有几个参数时一步开一个旋钮（第 1 节） |
| `actions` | 按钮：模型的一个动作（`act`，可以 `repeat` 若干次、每次隔 `every` 毫秒，运行中旋钮和别的按钮锁住，`always` 的除外），或把几个旋钮放回起点（`reset`） |
| `goal` | 目标：对模型算出的量的几条限制（`of` 加 `atLeast`、`atMost`、`above`、`below`，`near` 时比的是离它多远，`abs` 比大小，`is`、`not` 比相等），全部满足才过；一步可以有自己的目标。目标一条一行画出来，带此刻的值和要求（`≥ 40%`、`30 ± 1 mm`） |
| `check` | 目标怎样判：`live`（默认）随旋钮实时判；`submit` 只在玩家按「检查这个设置」时判，在那之前目标只写出要求、不显示读数，画面里模型算出的结果（成的像、光线、模糊）也不画，旋钮动了就要再检查一次。只开一个旋钮的一步用它，玩家才会先想再试，而不是拖到变绿（第 4.1 节） |
| `layout` | 版面：`head`（一行）、`main`（主卡）、`side`（旁栏，`split` 定宽）、`foot`（下面几行）；每处是一列块：显示项，或卡片（`panel`，`dock` 在手机上停在底部）、一列（`stack`）、一行（`row`，`narrow` 第一列窄） |

**显示项是封闭的。** `image` 包给：步骤说明、旋钮、按钮、结论（分步的带「下一步」）、目标、步骤列表、情形切换、曲线图（指向一处读数）、像素行、一段字、读数块、标签、小曲线、表、进度点。字可以写定，也可以是模型算出的（`{ of: 名字 }`）。每一项都可以 `when`、`unless` 一个模型的量（限时的轮在玩和不在玩时显示不同的东西），`with` 把别的项嵌进它里面。内容包补共享显示项画不出来的图和交互，每一项要说得出为什么通用的不行：《视觉完备》的暗箱侧视图（在图上拖孔板和屏幕）、屏幕正面、霍夫的点和累加器（栅格加叠层）、RANSAC 的一次试验和每种比例一张卡、封面配点（在两张图之间拖）和点对列表、GAN 的分布图、对比学习的嵌入圆和选择表、核速判的一轮和四张核卡（限时作答）。GAN、嵌入圆和暗箱共用 `views/useTween.js` 调度动画。嵌入圆给出沿圆周短弧的插值，减少动态时各视图直接显示最新值。

`npm run check` 对每个参数台跑模型项的 `verify`。检查某组旋钮能否过关时，用界面也调用的 `benchRun`，按当前阶段和每个情形计算模型结果及目标判定。`passingSettings` 用相同的判定逐个试设定。模块可以额外验证课程要求，例如霍夫粗分箱把两条线合并、RANSAC 的天真设置未达标。

霍夫和 RANSAC 共用图像模块里的直线坐标与有种子的点噪声。RANSAC 的点是否着色为内点由拟合使用的距离决定。内核的 `views/canvas.js` 提供像素画布和主题颜色，网格预览、霍夫累加器与图像配准共用像素写入。图像电路只在点样本足够时开始抽样。


### 6.5 机制目录

词序条、规则行、真值表和造世界共用作品的读取与保存。《证明完毕》的规则板按顺序读完所有引入规则，参考解与玩家作品共用可填写性检查和推导判定。规则板和证明助手用同一套规则与任取变量的写法（`schematic.js`）。证明与合一共用公式比较（`formula.js`），从各自最近的量词或函数参数确定每个变量的绑定位置。定义和改写也使用同一套项比较。规则板实例化和证明助手代入函数参数使用 `substMany`，只替换自由变量并保留代入项本身的作用域。命题实例化会给可能捕获代入式自由名字的量词换名。单次判定的玩法共用检查与清除上次判定的流程。结论行由 `Verdict` 显示，反例等详细反馈由玩法各自排版。玩法资源负责各自作品的形状、判定和反馈内容。

一个专题先选机制和已有能力，再建包。机制是玩家手上的动作和运行方式；同一机制可以用不同包里的元件。下表是 kit 现有的全部机制。

| 机制 | 玩家做什么 | 适合 | 内核里的元件 | 例子 | 缺什么 |
|---|---|---|---|---|---|
| 数据流电路 | 把元件接成一块板，输入一次流到输出 | 输入定了结果就定了的东西：图像处理的流水线、逻辑门、公式变换、协议头的字段 | `packages/circuit/core/circuit.js`、`packages/circuit/core/boards.js`（封装元件）、`packages/circuit/core/board/`、`view/board/`（蓝图文本和编辑器）、`packages/circuit/view/CircuitLevel.jsx` | 《证明完毕》的真值电路、《视觉完备》和 COMP90086 的图像电路；脚手架的 `circuit` 模板 | 机器人电路也使用 `CircuitScreen`，见逐步机器 |
| 逐步机器 | 搭一块板，机器按顺序在每一格、每一行、每一轮上跑它一遍 | 一张表一格格填（动态规划）、逐行处理、一轮轮调用（agent 循环） | `packages/circuit/core/machine.js`（`walk`）、`CircuitScreen`、`shell/usePlayback.jsx` | 《状态之图》（机器人填表） | 内核负责装配与步进。表格模块提供世界、传感器选项和状态，作者检查与玩家共用逐格判定 |
| 逐拍总线 | 搭一块每拍跑一遍的板，几个节点共用一根线，寄存卡跨拍保存 | 状态随时间变：时序逻辑、总线和链路协议、计时和重传 | `packages/tick-bus/core/ticks.js`、`boards.js` 的 `holds`、`shell/Timeline.jsx`、`CircuitLevel`；脚手架 `tick-bus` | `tick-bus` 入门游戏 | 有脚手架覆盖基本收发和寄存器 |
| 框 | 在元件的区域里摆元件，区域给出局部的值，只能在框里用 | 局部假设与作用域：假设推理、函数体、循环体 | `packages/circuit/core/board/frames.js`（`framePart`），两个编辑器和 `model.js` 管区域 | 《证明完毕》的假设框、消去框 | 只在一个模块用过；它是电路上的一项，不单独成模板 |
| 词序条 / 分析 | 往一排类型化的位置里点词，或把一行词折成结构 | 写出或拆开一段有结构的文字：公式、证明项、句子 | `kit/strip/`（词序条） | 《证明完毕》拼公式、`rows` 入门游戏写等式 | 界面共用，内容由模块的语言与判定给出 |
| 填表 | 逐行写一张表，每格一个编辑器 | 写清单式的规格：检验条例、情形、规则行 | `shell/RowTable.jsx`、`shell/FormFields.jsx` | 《证明完毕》的检验条例 | 内核按模块提供的列与值编辑器装配 |
| 规则行 + 一次判定 | 给几行各写出它的空位（一句话、一个式子），再检查一次；检验用的条例不给看，只说第一处不对 | 声明和定义：一个连接词的几种造法、一个函数在每种造法上的等式 | `shell/RuleRows.jsx`、`shell/useCheckOnce.js`，空位的编辑器用词序条 | 《证明完毕》的规则板和定义、`rows` 入门游戏（均通过 `plays.js` 配置） | 模块提供行的形状、编辑资源和判定 |
| 参数台 | 转旋钮、按按钮，看模拟怎么变 | 拼不出电路的机制：连续量、采样、几万步训练、随机试验、物理传感器、对抗 | `packages/image/core/bench.js`、`packages/image/view/bench/`（第 6.4 节） | 《视觉完备》的暗箱、波、训练、RANSAC 等 | 只有一个模块用过；没有脚手架模板 |
| 黑箱探针 | 切换示例、对照输入和输出的像素读数，再选出黑箱做了什么 | 从几组输入输出推断同一个操作 | `packages/image/core/grid-probe.js`、`packages/image/view/GridProbe.jsx`、`views/grid/` | 《视觉完备》0-2、0-6 | 模块提供示例、黑箱运算和答案 |
| 纠错 | 拿到几块别人的板，写一份检验条例去暴露错误 | 检验和评审：找出错的证明、错的规格、错的实现 | `shell/plays/BoardChecks.jsx`、`shell/Checks.jsx`、`shell/TestTabs.jsx` | 《证明完毕》的 `play: 'audit'` | 模块提供每块板的判定 |
| 手动关 | 玩家自己当机器，一步步做机器以后要做的事 | 机器出现之前的前因：先手做，再搭 | `shell/plays/ManualBoardPlay.jsx`（棋盘、任务卡、动作栏、容量选择、数字键盘和对照图） | 《状态之图》的填格、走路、连图、背包、找破绽、策略与剪缝 | 模块提供动作和判定数据 |

**给新专题选机制。** 按专题的核心动作逐条问，一个专题常常用到几种，各放在需要它的章里：

1. 答案是不是输入定了就定了、算一次就出来？是：数据流电路（脚手架 `circuit`）。
2. 时间是不是专题的一部分：有状态、有先后、几方共用一条通道、要等、要超时？是：逐拍总线。
3. 是不是同一块小机器在一个结构上一格格、一轮轮重复？是：逐步机器。
4. 推理里要不要"先假设、再收回"，或者有局部的作用域？要：在电路上加框。
5. 产物是不是一段有结构的文字？是：词序条或分析。
6. 要发现的是不是连续的参数、统计规律，或者步数多到接不出来？是：参数台。
7. 要练的是不是判断别人的东西对不对？是：用纠错玩法，在给定的几块板上运行自己写的检验。
8. 机器出现之前，玩家是不是该先自己当一回机器？是：手动关，放在机器那一章之前。

以计算机网络专题为例，线上的位、帧、冲突和重传都是时间里的事，主体是逐拍总线；报文头的解析是数据流电路；窗口大小、丢包率和吞吐量的关系是参数台；路由表的收敛是逐步机器。选定以后用 `npm run new-package -- <包> --template <模板>` 起步；需要同时建游戏用 `npm run new-game -- <游戏> --template <模板>`，复用已有游戏的包和开局设置用 MCP/Studio 的 `create_game`（`id`、`from`、`title`），再通过选包操作调整。现有原生模板为 `logic`、`table`，其他机制复用包。`rows`、`tick-bus` 的起步关卡和逐拍元件已成为对应包里的普通对象，用 `new-package --from rows` 或 `--from tick-bus` 复制；包没有课程或章。模板复制起步包；模板中的游戏和课程样例只供建游戏使用，不成为包课程。共享并持续更新的元件做成库包，由 `uses` 依赖，例如 `arithmetic`，不靠反复复制模板。新机制在包中实现并过核心、视图契约测试。新包也可用 `npm run new-package -- <包> --from text` 复制现有插件；`--empty` 只建立包清单。

### 6.6 play 钩子（盲玩暂停）

**盲玩暂时停用，也不出现在流水线、npm 命令、`check` 和 MCP 里。** 它的代码留在 `kit/engine/play/`（一局的记录、统计、CLI、盲玩 agent），恢复时再写回这一节和流水线。

留下来在用的是模块的 `play` 钩子（`runtime.js`）：它把输入、输出、托盘里的元件和可见测试写成文字，并按关卡界面的规则判定尝试。图像电路、机器人电路、门电路、证明板、机器板和逐拍总线脚手架的页面与文字入口共用 `game.circuit` 的任务入口。打开时先校验当前任务的存档，再用起始板或继承板。元件和端口取自同一个任务视图。作者工具 `run_tests` 靠它在不开浏览器的情况下跑一块板。新运行模块照样给出这个钩子。它给出的文字只包含玩家当前可见的内容。

### 6.7 studio

Studio 是操作集上的编辑器，按作者的职责分成三个工作区（`kit/studio/Studio.jsx`）：

| 工作区 | 打开什么 | 改什么 |
|---|---|---|
| 构建 | 一个包 | 元件、关卡、词条、标签、关系、托盘、百科分组、内容种类及覆盖；文案只作参考 |
| 编排 | 一款游戏 | 选包、章的有序关卡列表、可选与可跳过、路线图 `rows`；依赖编辑写成包关系的覆盖 |
| 文案 | 一个包或一款游戏 | 本层各语言、术语与引用，以及允许的文案覆盖 |

**三个栏各有一件事。** 顶栏切工作区和包或游戏，并放全局命令、语言与主题。左栏是资源区，构建按关卡、元件、符号、词条及其标签、托盘、关系、百科分组列对象，另有能力和覆盖；编排列包、章、覆盖；文案按对象或文件列文字。组可折叠，一个对象可出现多次；点组名编辑组对象，搜索放在资源种类之后。来源和覆盖链始终可查，依赖包的对象只读，要改先「在本包覆盖」。

中栏放复杂、跨对象、需要直接看见的编辑：关卡单关试玩、元件的板、阶段链、标签、托盘、百科分组、关系板、章的接线板和路线图、能力说明、覆盖差异、语言对照。右栏随选择显示 schema 控件或原始 JSON，id 只显示。左栏按职责找资源，中栏按对象工作，右栏补任意字段，不再靠旧的「画面、字段、文案、比较、变更」顶栏页签分流程。

**关系和路线图分开。** 包关系板编辑 `requires`、`replaces` 的 `edges`，编排板增删先修边写成游戏覆盖。章内编号顺序编辑 `registries.chapter` 中对应对象的 `levels`，路线图编辑 `rows`，章序编辑游戏配置的 `chapters`。集合来源来自 `sources` 的 `collections`。Studio 的新列表、勾选和关系板控件由 Studio 会话接入这套数据与操作协议。


**修改只有一份待定变更集。** 画面、配置、检查、文案和 diff 都读 `preview` 的同一份结果；应用调用 `modify`，撤销调用日志 `undo`。画面上的内容字段可点进右栏，包画面使用单关试玩，不借任何游戏的课程。审计、变更集和日志放在中栏的辅助抽屉。桌面可调栏宽，窄屏按工作区现有响应式呈现；样式和交互由 Studio 共用组件维护。

`npm run studio` 打开 `trace-viewer/studio.html`。`kit/app/studio.js` 只把 `engine/ops/tools.js` 的工具映射到 HTTP，不另写内容逻辑；快预览和慢检查分开调度，写入等待检查并核对并发状态。`GAMES_ROOT` 指向含 `games/` 与 `packages/` 的副本，供试改。任何 agent 也需要的能力先做成共用工具，再接界面。

### 6.8 元件、设置和阶段

`circuit/part` 与 `circuit/tray` 的结构分别声明在 `packages/circuit/kinds/part.json`、`tray.json`。关卡和任务的发放字段由 `level-grants.json`、`task-grants.json` 扩展，`replaces` 在元件类型声明中定义。元件标签使用 `tags/circuit/part/`，覆盖保留 `overrides/<namespace>/parts/`、`trays/` 以及相同的标签路径。

`circuit` 导出 `grants.register({ type, used })`。元件自行登记；暂留内核的逻辑模块通过 `engine/circuit-bridge.js` 登记 `symbol`。第 9 步迁出逻辑时，将登记放进 `logic/core/register` 并删除此桥接。派生可用状态按 `circuit/part`、`symbol` 等登记类型分别返回。

Studio 的资源分组、地址参数和文件路径已跟随对象类型名做机械调整。左栏按包声明类型动态生成、专用编辑器和阶段链的 `editor` 挂载由第 10 步完成。

**元件是能力、参数和外观。** `packages/<包>/parts/<名>.json` 选择内核运算 `op`，不写 `compute`。端口、参数和值类型来自运算声明，元件只收窄范围、默认值、选项或固定状态，补上名字、图标、端口标签和视图；每个输出分别选运算时写 `op: { 输出: 运算名 }`。元件属于包，可以放在库包里共用，游戏不复制或覆盖它的行为。

```json
{
  "op": "image:gauss", "name": "@part.gauss.name",
  "settings": { "sigma": { "min": 0.5, "max": 2.5 }, "border": { "fixed": true } },
  "stages": [{ "id": "gauss-border", "settings": { "border": {} } }]
}
```

**设置写在元件里。** 对应运算参数的设置只写差异，`{}` 恢复运算参数的完整声明；不对应参数的设置（例如拼公式的 `tree`）须写全控件与值。没有设置对象、独立设置文件或 `setting.*` 操作。设置可有 `label`、`about`、`default`、`fixed`、`when`，选项可有说明；动态选项由内核能力提供。

**阶段是同一可发放对象的线性升级。** 符号阶段可以修改 `mark`、`name`、`desc`、`icon`。元件阶段的规则如下。 第一阶段就是元件自身，`stages` 只列后续阶段，每个 id 与元件共用包内命名空间。阶段相对前一阶段增量修改设置、说明和卡片；`remove` 去掉选项，`add` 加回运算声明的选项。开放阶段升级原卡，想要两种独立玩法则建两个元件。阶段 id 不可改；元件之间的升级用 `replaces` 关系。

**封装元件引用作品。** `inside` 保存 variant 及自带参考作品和接口，任务用 `publishes` 发布 `{ part, variant }`，显式 `awards` 决定通过后开放的阶段。玩家的通过作品按元件和 variant 保存，`holds().inside()` 按可用路径选择；没有玩家作品才用参考，玩法可明确选参考作品。定义、引理、门、机器等均走同一登记和课程模型，不另用 `revisions` 表。

**设置的控件只有八种**，都是内核的（`packages/circuit/view/parts/SettingField.jsx`），桌面卡片上紧凑、手机单子里加大，同一份定义：

| `control` | 是什么 | 自己的字段 | 值 |
|---|---|---|---|
| `select` | 下拉框 | `options` | 选项的 `value`（ASCII 字） |
| `buttons` | 小按钮组 | `options`，`layout`：`row`（一行，会折行）、`column`、`grid`（两两一行）、`pad`（上下左右四向，选项是 `up`、`left`、`right`、`down`） | 同上 |
| `number` | 数字 | `min`、`max`、`step`、`integer`、`unit`、`stepper`（两边加 − / +） | 数 |
| `slider` | 拖拉条 | `min`、`max`（必填）、`step`、`unit`、`marks`（刻度） | 数 |
| `toggle` | 开关 | `on`、`off`（两端的字） | 真假 |
| `list` | 依次选几项 | `options`，或 `from` | 选了的选项，按选的先后 |
| `tree` | 拼一句 | `optional`（可以不填） | 一句话的文字：屏幕给出这个任务、这个测试的语言（`CircuitScreen` 的 `language`），词序条拼出（`strip/TreePick.jsx`） |
| `custom` | 自定义 | `widget`（模块 `widget` 种类的一项）、`params`（合那一项的 schema） | 那一项说 |

卡片的数字输入和卷积核权重直接传递数字。桌面的方向键、配置的加减按钮与 Studio 数字字段使用同一套步进和边界规则。桌面手输与手机小键盘也共用分数和科学计数的解析。


**表达式只管交互和读数。** `rules` 在设置变化后按序写其它设置；`checks` 判断设置是否合法；视图的 `readout.expr`、`action.set`、`when` 也可用 `packages/circuit/core/parts/expr.js` 的 ASCII 设置表达式。它们不是元件的计算实现，元件直接调用选中的运算。检查核对设置名、参数、默认值、图标、控件和引用的能力。

**三面视图**（`views`）：`card` 是桌面画布上卡片的主体，`tile` 是手机格位上的简略视图（`value` 块画在元件名上面，其余的块画在下面），`detail` 是两边共用的详情（桌面卡片头上的 ⓘ、手机点开元件的单子，控件加大）。每一面是一列块，不写就用默认：卡片是全部设置加值，格位是值加一行设置摘要，详情是说明、全部设置和值。只剩一个可选值的设置不画（课程只放出了一个）。块（`show`）：

| 块 | 画什么 | 字段 |
|---|---|---|
| `value` | 输出上的值，模块画（`defined.value(node, ctx, output, face)`：卡片上一个数、一张小图，详情里逐个输出细看） | `output`（几个输出时选一个） |
| `settings` | 设置的控件 | `keys`（只画这几个，默认全部） |
| `setting` | 一个设置：控件，或它此刻的值的字（`as: 'label'`） | `key`、`as` |
| `summary` | 一行设置摘要 | `text`：带 `{设置}` 的一句话；不写就是各设置的值的字，用「·」隔开 |
| `readout` | 由设置算出的一个读数 | `label`、`expr`（只读设置的表达式）、`unit`、`digits` |
| `action` | 一个按钮，按下把几个设置改成算出的值 | `label`、`set: { 设置: 表达式 }`、`when`（表达式：为假时按钮变灰） |
| `text` | 一段固定的字 | `text` |
| `desc` | 元件的说明 | |
| `ports` | 输入口和输出口，带名字 | |
| `widget` | 模块的显示项 | `widget`、`params` |
| `row` | 几个块排成一行 | `blocks: [块…]` |

例：一张「邻域加权」卡片上画方向、三个权重和边界，下面一个读数「权重和」（`plus(plus($a, $b), $c)`）和一个按钮「使权重和为 1」（`set: { a: over($a, plus(plus($a, $b), $c)), … }`，`when: ne(plus(plus($a, $b), $c), 0)`）；格位上一行 `{axis} [{a}, {b}, {c}]`。


`packages/circuit/core/parts/define.js` 把组装后的元件定义编成运行元件；`packages/circuit/view/parts/` 共用控件和视图，模块仅注册内核尚无的值显示或 widget。`partDefs.parts` 是内存投影，`parts.set`、`parts.unset` 的路径仍从 `parts.<元件>` 开始，写盘会落回单个元件文件。新增、删除用 `part.add`、`part.remove`；文案用带对象路径和语言的 `text.set`。

### 6.9 界面

**Registered displays (DESIGN.md §6.2–6.3).** Modules declare printable display capabilities in
`module.js` under qualified names and register lazy implementation loaders with `implementDisplays`.
`engine/displays.js` resolves these names and caches each implementation bundle. Module `ui/displays.js`
entries own their styles, map illustrations, introduction figures, circuit presentation resources and pass panels.
Game adapters select capabilities by name and bind course data; shared shell/views never import module UI or CSS.
Production game builds keep the virtual game entry and asynchronous module adapters together in a dedicated
chunk, so display bundles can import work helpers without cycling through an awaiting adapter.
Bench layouts resolve both string and parameterized display calls (including nested `with` blocks) through the
same registry. Common bench displays and `Knob` are provided by `image/view` in `packages/image/view/bench`. Metadata-only view/family/mark entries continue to describe generic value rendering.

**Unlock all.** The progress dialog can open all levels, tasks, parts and encyclopedia entries without marking any task
passed. Clearing play progress turns off Unlock all and restores the normal prerequisites. Normally a level is complete once every required task has passed. With all content unlocked, passing the last required task completes the level without returning to earlier tasks. A carried circuit opens on the prerequisite's passed board; if all content is unlocked and that prerequisite has not been passed, it opens on the reference board instead. A later pass replaces this starting point with the player's passing board, while a board already edited in the destination remains the player's own. Optional tasks are only recorded and grant their own rewards when actually completed.

所有游戏共用的界面原则和交互约定，改界面时照着做、改动时保持。颜色、字号、间距、圆角取 `kit/tokens.css` 的变量（几套主题都在那里调），这里不抄数值；某一款游戏特有的界面写在那款游戏自己的设计文档里。

**任务板。** 玩法用 `taskBoard` 选择显示的内容：关卡标题（`title`）、简报（`brief`）、短提示（`tip`）、可展开的提示（`hints`）、题面附加陈述（`statement`）、计数（`readouts`）和其他补充面板（`extras`）。省略时显示玩法提供的内容。任务切换和跳过是独立的导航控件。

**结果表格。** 电路测试和逐行编辑的测试表共用表格组件。少于四列时按内容取宽并居中；列宽有上限，较长文字换行。宽表在自身窗口内横向滚动。

**弹窗滚动。** 弹窗主体只纵向滚动。较宽的表格、公式和电路图在各自的窗口内横向滚动。

**托盘二级菜单。** 手机上在主托盘正上方弹出一行，横向滚动；电脑端在菜单按钮下方弹出一列。打开或关闭菜单时，主托盘里的元件位置不动。

**工坊托盘切换。** 手机上切换按钮固定在托盘左端，元件在按钮右侧横向滚动。电脑端按钮位于元件列表首项。托盘可在 Studio 的「元件」页设为 `workshop: false`，只供关卡内使用。省略时允许含电路元件的托盘在工坊使用。

**桌面蓝图落位。** 新卡按依赖分列。移开挡住工作区的输出后，新卡逐张避开已有卡和本次已经放好的新卡。未分组的画布按量到的卡片尺寸校正间距，位置校正独立于接线和判定。

**桌面分组。** 绘制、拖动和切换显示共用同一套分组边界。展开或收起时，切换的组保持锚点，碰到它的单元按画布上的实际位置向下避让。手动切换显示和拖动都会保存画面上的位置。逐步运行时按需临时展开当前组。

**手机分组。** 折叠组为实际存在的输入、输出各留出半个端口触区。端口圆点保留完整的点按范围，显示按钮位于两侧触区之间。

**手机浏览器缩放。** 原生双指缩放时，关卡外壳仍按布局视口定高，浏览器负责平移放大后的页面。正常比例下，软件键盘打开时，外壳用可视视口调整运行栏位置。

**卡片多宽。** 共用编辑器按元件的口、区域、设置、内部作品和值视图的声明计算宽度。手机格位用 `game.json` 中这块板所选的整套托盘取样，包含声明过的自搭元件。没有命名托盘的课程用全课程的原语和声明过的自搭元件作为一套。以出现最多的宽度选列数，并列取窄的。列数在 2、3、4 中取放得下该宽度与列缝的最多列数，至少两列，每格的计算下限是一个端口触区加两侧内边距。在同一可用宽度下，同一托盘的每一关列数和格宽一致。框内沿用外层格线，框默认占整行。较窄的元件拉满一格，较宽的元件按声明宽度分格，端口也必须排得下。卡面句子最多两行，余下以省略号表示，详情显示全文。 手机格位、分组和新增元件共用整块占位检查。新增元件跳过已占的格位和分组的插入行。《状态之图》只提供桌面起始位置，手机格位由内核按实际宽度分配。

**手机落位。** 新增、拖动和点选移动共用同一套放置逻辑。框落入空格时可收窄到目标行可用的列数，较宽的卡片会占用包含目标格的连续列。与落位重叠的元件顺延到后面的空格，其他元件保留原位。进出框时按作用域规则保留接线。受保护的元件和同一区域的交换仍遵守原有约束。

**手机上手动收窄框。** 框的详情页按钮按格数循环切换宽度。板上的 `span` 记录占用的列数，省略时占整行。收窄的框可以和别的卡或框并排，里面各区域按这个框占用的格数排；嵌套框也受所在区域的列数限制。分类讨论的两个区域仍然上下排列。收窄和放开都能单独撤销和重做。

**手机行缝。** 空格位的大小也按托盘定，一块板上处处一样，同一个托盘的每一关也一样：宽是一格（见上），高是这个托盘里最常见的那一档卡片高度（并列时取矮的）。虚线框就画这么大，不是格子中间一条 44 像素的窄条，也不跟着旁边更高的卡拉长；它和同一行的卡顶边对齐。一整行空格位就是这么高。不同的托盘可以得出不同的大小；看的是托盘里定下的元件，不是这一关手头的，也不是板上摆着的，所以编辑时不变，换一关也不变。需要更多空间的内容撑开所在行，图片视图沿用预览所需的高度。板和框的每个区域都以一整行空格位结尾。放元件占用末排后，下方立即留出一整排新的空位。32 像素的行缝由圆点直径和一行端口标签的高度相加得到，空行和区域边缘也用同一档。44 像素见方的端口触区以圆点为中心，跨过卡边。触区重叠时，离触点最近的圆心所属的端口响应，等距时按板上的绘制顺序取先出现的端口。卡只有一个输出时用底边圆点表示，多个输出保留各自的名字。接线沿用原有的曲线。

**手机框。** 任意宽度的框都把标题和第一个区域的读数排在同一格位行中。标题和普通元件使用同样的间距和字号。框直接显示区域值，多区域框把分支名放在值旁边。缺少连线或配置时占用正常读数的一行，文字真正换行时才增高所在行。同一行的框和其他卡片、空槽共用行高。假设出口在假设行底边正中，结论入口在结论行顶边正中，框的输出在框底边正中。点按标题、读数或留白打开详情。框和普通元件在同样的位置长按后拖动，快速滑动仍可滚动。端口、空槽和内部元件各自响应。框的详情用共用操作按钮切换宽度、移动或删除。嵌套框也用同一套排版。

**顶部栏。** 游戏导航页、地图和关卡共用 `kit/shell/TopBar.jsx`：设置按钮始终靠右，打开同一个设置面板；导航页提供语言和主题，游戏中再提供该游戏适用的设备设置。

**Mathematical text.** Shared markup accepts `\( … \)` for inline LaTeX and `\[ … \]` for display
LaTeX. The math renderer and fonts load on demand. KaTeX renders mathematical fonts and accessible MathML; prose is never treated
as HTML. Math delimiters are parsed before markup tags, so inequalities inside formulas are not tags. Code
spans remain literal. Long formulas use explicit aligned/gathered lines and contained horizontal scrolling
when needed; they must not widen the phone page. Formula syntax is checked with the installed KaTeX version.

**Circuit blocks.** Course provenance (`packages/circuit/core/stages.js`) supplies block presets and the `open-crowded`
audit. Board layout stores `blocks: [{ id, note?, view, nodes }]`, with node identities rather than row dividers.
Each root component belongs to at most one block; fixed input/output cards and current ungrouped work stay
outside. A newly selected block takes its members from previous blocks; empty blocks disappear. Explicit empty
lists remain empty. Presets apply only before blocks have been written: prior course groups use `ports`, with
the course stage name as their note. Blocks, slots and desktop coordinates never affect blueprint text, execution
or judging. There is no divider model or Arrange command.

Every block uses the single `packages/circuit/view/board/BlockHeader.jsx` component: note, component count and full/ports/hidden
controls, with words from the shared registry. Full shows the original cards; ports omits their bodies while
retaining heads and actual ports. Hidden shows only a narrow header with boundary port stubs. Clicking a stub or
paired label restores the prior visible mode and reveals the component. Optional layout metadata `lastView`
remembers that mode across reloads. A running step inside a hidden block temporarily reveals it without changing
the stored mode. Notes, modes and deletion use the same header on both devices. Deleting a block keeps its nodes.

Desktop Partition is always available in the canvas tools. A dragged rectangle selects component centres; Escape
or a second press cancels. Passive token-based backdrops follow member bounds, with no independent block drag
surface. A desktop header drag handle moves every member by the same canvas-space delta in all three views.
The move is one undoable layout edit, preserves internal frame-local positions and wiring, and is unavailable
in read-only boards. Escape cancels the preview. Individual desktop component drops use the same pointer-inside
container hit testing and border highlight as assumption-frame regions. Dropping inside a block assigns that
membership; dropping outside all blocks removes it, deleting an emptied block. A semantic frame region takes
priority when both containers overlap. Only root editable components belong to blocks; fixed I/O stays outside.
Position and membership commit as one undoable edit, with graph wires preserved for ordinary block transfers.
Membership changes reuse the existing phone regrouping layout so both views retain the same members.
Phone Partition appears with Manual partitioning enabled: pick a start row then an end row, both
inclusive. A bottom instruction banner names the current step and offers Cancel; choosing the start row changes
the prompt to the end row. Phones always use two edge-to-edge horizontal rules with the header on the first,
without block backdrops or container padding. There is no separate compact-view switch or device preference.
Full shows complete cards; ports shows heads and actual ports in place. Hidden reduces a block to its header,
retaining the grey header background with no padding. Actual endpoint stubs use the upper/lower edges on phones
and left/right edges on desktop. Phone title buttons open a rename sheet with an explicit Save action. Its input uses the touch-input type
token (at least 16 px) to avoid Safari focus zoom while preserving browser zoom controls.

Compact placement has two layers in `packages/circuit/core/board/layout.js`: dependency columns within a block, upstream barycentre
ordering and actual-port alignment; then block/loose units wrap by viewport width, with independent branches
stacked and private constants/sources beside their consumer. Phone blocks act as slot containers: every internal
hole is an add/drop slot and one complete empty row follows the last occupied row. Layout metadata `slot` and
`rows` records the container origin and reserved extent. Dropping or adding inside a container assigns membership;
dropping outside detaches it rather than extending the old block. Swaps transfer both memberships with their
positions. Preset-block members cannot be moved on phones while Manual partitioning is off, including moves
from the detail sheet; their ports remain operable. Hidden phone headers retain the shared grey group background without container padding.
Phone members occupy contiguous two-column rows.
Tapping a tray part fills the topmost, leftmost visible root-board slot. If none is visible, nothing is placed and
no message is shown. Explicit drops still choose their destination, including slots within frames.
Gaps, padding and header sizes use shared tokens. Initial layout and newly carried/added components may be
placed; existing saved coordinates are retained. View changes make temporary room after the changed unit while
holding its anchor, without saving those shifts. The headless SVG renderer retains its original column layout.
Synthetic layout tests bound area, longest wire, crossings and total wire length.

Wiring is unchanged: graph connections, port interaction, ordinary port placement and the original curve renderer
are preserved. Block presentation may substitute boundary stubs only while hidden. The shared existing label
policy and the player's label preference remain in force; this revision does not reroute or bundle the wires.

**Player settings.** A gear in the shared game bar opens a desktop popover or phone sheet on both maps
and levels. Language and theme are choices inside this panel, retaining the site-wide `fieldnotes.lang` and
`fieldnotes.theme` preferences. Their separate top-bar menus are removed from games. The kit alone registers presentation/editing
preferences in `shell/settings.js`; `useSetting` supplies reactive reads and writes. `when(game)` hides irrelevant
options. Device preferences share one `games.settings` localStorage key, partitioned by game, outside puzzle
progress and stamps. Storage access is guarded; unavailable or invalid preferences use defaults.

The panel separates display and editing with a rule, uses one short name and control per row, and ends with
Restore defaults. Manual partitioning starts off and appears only on phones where circuit grouping is meaningful. The phone
Partition button follows this setting; desktop Partition is independent of it. Existing blocks
and their view controls remain available. Connection labels
default off on desktop, where the real ports and continuous wires preserve the data flow without duplicate name
tags, and on on phones, where long wires cross many scrolling rows. An explicit device preference overrides both
defaults. Grid display offers the game's available choices only when there is more than one, sharing its stored
choice with every value and results row through `views/choice.js`. Results view switches use a single button that
cycles the available views. Defaults give the simplest experience. New settings may alter presentation or editing,
never the puzzle, judging or amount of hints. Content and domains cannot register settings.

**版本更新**：发布版游戏在打开、回到前台和停留期间检查页面资源与内容；发现新版本就提示刷新，刷新后去关卡导航页，不沿用网址里的关卡参数。网络错误不当作更新。发布版启动失败时会请求最新页面。若页面引用了新版入口资源，就保留原链接自动重载一次。开发服务器不检查发布版本。游戏进度仍由存档版本规则管理。

**原则**

- **布局自己说话。** 不加次要的标签和说明：一块东西是什么，由它的位置和样子说清楚。结果区不加「测试 N」之类的标题，测试标签已经说了是哪一个；同一件事不说两遍：预期和结果里一样的输入只写一次。说明只在不写就看不懂时才写。
- **信息要密。** 能写在一行的不拆成两栏，不留只为对齐的空白；空间先给玩的地方和结果。
- **所有游戏一样。** 基本的界面和交互都由 kit 的共用件给（本节最后的「共用的件」），模块只交内容，不另排版面、不另做一套控件；改一个共用件就是改所有游戏，要在每种用到它的玩法上看一遍。
- **手机上的可操作性先于画面完整性。** 核心检查按钮使用共用运行栏；画面不能挤出控件，也不能把不可横向滚动的输入表藏在屏外。需要横向阅读的表明确提供滚动区域；彩色图编辑一次选择一个像素，再显示带通道名称的输入。输入与主要按钮至少有 44px 的触摸范围，并实际检查窄屏、滚动和键盘弹出后的操作。
- **浮层操作。** 可点外部关闭的菜单、选项列表和编辑浮层共用层级判定。按在最上层浮层或其触发按钮内时，保留下方浮层。存档菜单因外部点按关闭时先保存正在编辑的名称。Escape 只交给当前画在最上面的浮层。引言上的百科或前往确认关掉后，引言仍停在原页。引言在最上层时，方向键用来翻页。浮层挡住的工作区暂停快捷键，正在进行的拖动优先响应 Escape 并取消。
- **兼容手机浏览器。** 不用较新的 JavaScript API（例如 `Map.groupBy`），旧版 iOS Safari 上会整页白屏；手机上点开元件也要试一遍。拖着手机格位上的元件或框时（连同贴边自动滚动），每挪一下都重画连着它的线，线头跟着口此刻的位置；放下或取消时回到排好的版面，拖的过程中不改任何接线。自动滚动只在原来的区域里滚，挪动中的元件和线不会把可滚动的画布永久撑大。
- 电路元件、框和结果区的拖动共享单指针追踪。放开才提交，取消或离开界面时清掉预览和监听。画布平移和双指缩放由画布捕获各个指针。

**版面规范**

这几条让「布局自己说话」可以检查：分组、主次和归属由间距、对齐、字重和形状表达，不靠加标签和边框。

- **由外向内。** 先定区域，再放内容。关卡的区域由 `Workbench` 和 `PhonePage` 给定（任务、玩的地方、结果、运行栏；手机上是测试标签、滚动区、托盘），每个区域有确定的尺寸策略（定宽、填满或封顶）和滚动归属。内容只填进区域，不在里面另包一层容器。区域里面的间距一律取间距阶梯；写死像素的只有结构尺寸，而且都有名字：全局的（栏高、栏宽、格位高）在 `kit/tokens.css`，只属于一个件的几何（给固定元件让出的位置、工具条和端口的大小）写成它规则里的变量（`--tool-h: 32px`）。
- **一个区域一条内容线。** 区域给内边距，子元素不带外边距；文字和控件的左缘落在同一条线上，只有悬停和选中的底色越过它。检查：沿区域左缘画一条竖线，每个标签都碰到它。
- **间距取阶梯，分三级，级差看得出。** 阶梯是 `--sp-1` 到 `--sp-11`：2、4、6、8、12、16、24、32、48、64、96px；负的外边距写成 `calc(var(--sp-n) * -1)`，抵消父级内边距时取父级的同一级。只有 1px 及以下的细线微调可以写字面值。一项之内（标签和值、图标和文字）用近距 `--gap-local`，同组并列的项用组距 `--gap-group`，不同的关注点之间用段距 `--gap-section`；三级依次加大，不用一个值铺满一处。检查：去掉所有边框，仍能只凭间距说出分组。
- **用最弱的容器。** 先用间距分组；不够再用细线（`--hairline`、`--rule`：并列的行之间、表头和滚动内容之间）；再用分组底色（`--group`，如电路块）；卡片只给自成一体的东西（板上的元件、弹窗、单子）。一串记录（测试、步骤、条目、关卡列表）画成行，不给每一项套卡片。
- **一个区域一个主角，主次靠字重和颜色。** 文字只用两种颜色：`--ink` 是主，`--muted` 是次；`--faint` 只给不可用的状态和占位。字号按角色取 tokens，相邻两级必须看得出差别；不靠把字缩小来降级。检查：眯起眼看，先读到主角，再是辅助，最后是分组。
- **圆角按角色，嵌套同心。** 文字里的标记（行内代码、高亮）和笔记的雕刻风格块用 `--r-xs`，内部的小件（标签、小按钮）用 `--r-sm`，控件和元件卡片用 `--r-md`，面板、单子、弹窗、菜单和提示条用 `--r-lg`，圆点、药丸形和细条用 `--r-full`。嵌套时内圆角等于外圆角减去两者之间的间距，内角不比外角圆；选中和焦点的描边沿它所属的形状走。
- **同一行的控件同一高度。** 一行里的按钮、选择框和输入框共用一个尺寸和基线。看上去紧凑的控件可以有更大的点按范围，但点按范围不撑开版面。
- **每个区域写明窄屏时怎么变。** 在手机宽度下，一个区域保留、改排（并排改为上下）、收进抽屉或单子，还是去掉，由它的共用件决定并写在这一节；不让内容在窄屏上碰运气。

**版面**

- **每一关的版面都一样**（`kit/shell/Workbench.jsx` 和 `Layout.jsx` 的 `PhonePage`，关卡界面只交出各块内容，不自己排版面）。桌面：左边是任务；中间上方是玩的地方（画布、表、句子条……，可以带一行元件 `parts`）；下方是结果条：头部是测试标签和通过情况（有的话），下面左边是结果区（运行或检查给出的东西：输出、测试棋盘、运行过程、检查的结论；头部只放读数、视图开关这类控件），右下角一列是运行栏，检查、运行按钮永远在这里。结果条按内容定高，拖它的上沿可以调高矮。手机：一页，测试标签钉在顶上，中间滚动：任务卡、玩的地方，结果区接在玩的地方下面，不另开抽屉；底下是托盘和运行栏，运行栏固定在最底下。点运行或检查（或步进）时，页面滚到结果区刚好露出来。
- **关卡导航。** 地图是关卡树（第 2.6 节）。关卡里的关卡列表是从左侧拉出的抽屉，直接画每章的关卡树（紧凑尺寸），标出当前关，不做成列表，也不常驻占用版面。
- **通关窗口**只有"留在这里"和"返回关卡导航"，不直接跳到下一关；回到地图时，页面直接跳到刚才那一关（不平滑滚过去），并在顶部插图加载完之前一直对准它。外壳的滚动都写明 `behavior: 'instant'`，不受某款游戏页面带进来的全局 `scroll-behavior` 影响（《视觉完备》借用的笔记站样式里有 `html { scroll-behavior: smooth }`）。

**板上**

- **端口都是圆点。** 还没接线的输入口，圆点里多一个小圈（`--port-mark`：浅色主题淡灰，深色主题偏浅，各主题在 `tokens.css` 里调过），接上线就去掉，用来和输出口区分；桌面画布和手机格位一样，其他形状的端口，小圈跟着端口的形状（《状态之图》的菱形端口里是小菱形，`--port-mark-radius`）。
- **手机端输入口不显示接入来源标签。** 连线和端口名称照常显示，端口的无障碍名称保留来源与拆线提示；跨段连线标签仍按玩家设置显示。
- **手机上点托盘里的元件，放进眼前的空格位。** 电路编辑器把板上和各层框内的空格一起按屏幕上的位置排序，先从上到下，再从左到右。它沿用放置时的区域和格位检查，跳过放不进的空格，把第一个可用格及其区域交给放置操作。当前视野没有能放这个元件的空格时，板上显示提示。
- **输入就是输入元件。** 机体读到的东西（视野、本格信息、手臂）直接画在画布的输入元件里，点一下就接上或断开，桌面和手机同一个模型；不另设一块输入面板。输入元件可以比其他元件宽（`parts.cardWidth`），默认摆放位置要按元件宽度留出间距，不能叠在一起。手机格位的行、列之间留出间隔，减少相邻空格误触；输入元件和输出元件按里面的东西定宽、居中排：一个数、一张图或一条函数是紧凑的一块，一句长命题宽到整排再折行；放得下就并排（有很多输出口的宽元件独占一行）。
- **预置的元件和线锁在板上。** 关卡的预置（第 4 节）由外壳放进新板和旧存档里（`packages/circuit/core/board/presets.js` 的 `withPreset`），标成 `locked`。共用的两个编辑器都守着它：每次改动都保护锁住的元件和线（`keepLocked`，蓝图导入、撤销也一样）；锁住的线不能拆、不能换（`lockedRefusal`，在板上说明原因）；锁住的元件、预置线两端的元件以及包住它们的外层框只能在原区域内挪动，删除按钮不会出现；固定的设置项沿用预置值，元件上的控件禁用，联动规则也跳过这些项。清空回到关卡的起点，预置还在。
- **手机上点开一个元件**，弹出的单子只有：它是什么、它的设置、它在当前测试上的结果，最后是「拿掉这一块」（`circuit/RemoveButton.jsx`）。接线只在板上点圆点完成，单子里不再给"读哪个结果"之类改接线的入口，所有游戏一样。
- **元件详情弹窗**共用 `kit/shell/Sheet.jsx`。点按元件打开详情。手机上从底部弹出，电脑上居中显示。

**点一个按钮填一样东西**（一句话、一个值）用 `kit/shell/Popover.jsx`：桌面上在按钮旁弹出一个指着它的框，像装着编辑器的提示框，点框外或按 Esc 关掉；手机上是底部单子。改了立即生效，没有保存按钮。整关就是填这一样东西的（翻译关）不用它，编辑器直接摆在台面上。
- **撤销和重做**在桌面画布和手机格位上都有。**清空**也是画布自己的工具（`onClear`：桌面在右下角工具条最前面，手机在撤销、重做左侧），点了先弹窗确认，清空后仍可撤销；不放在运行栏里。手机格位和词序条上的清空按钮一直在，板上没有可清空的东西时变灰、不能点（kit 的 `ClearButton` 不给 `onClear` 就是这样）。
- **手机电路工具条**随板滚动并吸顶，初始布局在工具条下方为输入卡顶部的标签预留空间。
- **一关可以存多块电路。** 每个拼电路的关卡都能新建（空白或复制当前）、切换、重命名、删除几块电路图（`shell/slots.js`）。正在玩的那块就是这一关的存档（`progress.data`），其余的等在 `progress.slots` 里；切换时外壳让关卡界面从选中的那块重新开始。切换器由外壳经 `SlotsContext` 交给编辑器，不经过各模块的界面：桌面在画布左下角（游戏自己的角落工具，如《视觉完备》的「全部画成」，用 `corner` 放在它右边），手机在撤销、重做那一行的最左端。
- **电路的文本形式就是蓝图。** 多存档菜单里有「以文本查看 / 复制」和「从文本导入」（`packages/circuit/core/board/text.js`、`BlueprintDialog.jsx`）：把当前这块板写成纯 ASCII 文本，可以复制、存成 .txt，在任何记事本里改，再粘贴或打开文件导入；导入替换当前这块板，可以撤销。文本只写电路算什么（元件、设置、接线、框的嵌套），不写版面：同名同类型的元件留在原位，新元件由编辑器排开。写法：`名字 = 类型[设置](输入, …)`，按输入口顺序写来源，`_` 留空，`来源.键` 指多个输出里的一个；框写成按区域分开的代码块，区域给出的值读作 `框.区域`；接到关卡给的节点写 `out <- a`。蓝图可省略关卡已经放好的元件和线。导入先保留这些预置，再校验新接线。写出预置的原样可以导入，改动预置的类型、区域、固定设置或接线会按行报错。桌面、手机和蓝图用同一套接线判定，检查两端是否存在、预置线、环路、区域和模块的类型规则。设置让已选端口消失时，编辑器清掉这次选中。 重新打开存档、继承板或封装元件时，按该任务的元件和端口重新检查整块板。存档不合时打开关卡起点，搭出的元件使用参考作品。机器人先按当前任务的传感器配置调整电路。导入时按编辑器的规则逐条检查（只能用这一关托盘里的元件、不成环、框里的东西不带出框、口的类型相容），出错按行列出。**元件的类型、口名和设置值都要是 ASCII**：新元件的口名和设置值直接用 ASCII 起名，显示用的符号放在标签里（《视觉完备》的平移方向是 `right`、`down`，按钮上画箭头；重参数化的口是 `mu`、`sigma`、`eps`，标签是 μ、σ、ε）。展示用的记号本来就是符号的（《证明完毕》的公式），由模块的 `parts.text` 在写出和读回时换成 ASCII 拼法（`->`、`&`、`|`、`~`、`forall x.`）；关卡给的节点上玩家能改的东西（《状态之图》输入元件读哪几格）由 `parts.text.sets` 列出，随蓝图一起写出；蓝图里的线读到一个还没打开的格子时，由 `parts.text.opens` 替它打开（只要这一关给了那一格）：蓝图写了读哪一格，就不用先在机器人视野里点开。
- 蓝图、桌面和手机的排版以及图像网络约束共用连线的依赖遍历。蓝图保留同层的元件顺序，手机格位保留按接线发现同层元件的顺序。图像的层数和瓶颈约束按来源元件追踪每个命名输出。

**运行和结果**

- **测试棋盘**在画布下方的测试条里，居中，默认格子不大（《状态之图》26–34px）；表太大时在条里滚动，不撑满屏幕。
- **测试标签共用 `TestTabs`。** 电路、手动棋盘、参数台和元件预览都提供案例和当前选项；参数台还给出每个案例的通过状态，元件预览的标签只切换示例。Studio 只在关卡级测试上挂编辑标记。元件箱和 Studio 经同一个 `parts.preview(part, { progress })` 取得样例、模拟和封装内部数据，由电路编辑器绘制；样例与模拟共用最新结果、已修改和未运行三种显示状态。
- **运行时每一步都重绘。** 测试一步一步跑时，每一步都要重画元件上的值，不能只重画棋盘；单步和连续运行都要看得到每个元件此刻的结果。
- **最后一次运行留在板上，直到离开这一关。** 一块板跑完以后（通过或失败，或停在单步的某一步），在关内切换任务、换一块存档再换回来，看到的都还是那次运行：每个测试的状态、停下的那一步、元件上的值、步骤列表。通关后玩家要能在关内回头查看结果。离开这一关（回地图或去别的关）运行就清空，不进存档，刷新页面也不留。完整游戏页和笔记嵌入页共用 `useLevelRuns`，在内存里按「任务 · 存档」给当前关的每块板记一个标记，关卡界面从 `lastRun` 读、用 `keepRun` 写（用 `CircuitLevel` 的电路关自动接上）：`usePlayback` 记走到了第几步（传 `kept`、`onKeep`），一次性检查的界面记「检查过」（`shell/useCheckOnce.js`），《状态之图》记跑到了哪个测试。打开时界面照当前这块板把运行重放到那里，不再弹通关或失败的窗口；板一改标记就清掉，删掉的存档连同它的标记一起删。关内重新打开关卡界面的只有换任务和换存档（外壳按「任务 · 存档」给界面换 key），所以有任务或有存档切换器的玩法才要接 `lastRun`；两样都没有的（《状态之图》的手动玩法、《视觉完备》的探针关和参数台）运行就留在界面自己的状态里，它正好活到离开这一关。关内别的事（关卡抽屉、引言、百科、窗口跨过手机宽度）都不能重新打开关卡界面。跑完后板上显示整块板的运行结果：输入的值、没接到结果上的元件给出什么或缺什么，和运行前一样，只多了测试的状态。
- 电路编辑器、蓝图、存档和封装元件共用 `packages/circuit/core/board/regions.js` 的区域地址和嵌套检查。卡片只能放进现存的区域，框不能直接或间接放进自己的区域。区域布局、折叠与证明中的假设层数沿用同一份父子关系。 元件设置会增减区域时，计算和画面按同一条件显示区域。有元件的区域要先移出元件，关卡锁住的接线保持原样。空区域关闭时，设置和断开的普通线作为一次编辑保存，可一起撤销。
- 桌面电路、手机电路和封装元件示意图共用卡片端口与读数接入（`packages/circuit/core/board/card-ports.js`）。框的假设与结论接线口放在对应区域，点卡片接线按卡片对外的第一个输出处理。
- **封装元件能打开看里面。** 一块封装元件跑的是学习者的电路（第 1 节），它里面的每个元件也是运行的一步，步骤写明它在哪几块元件里（外层在前），主板上点亮最外面那块元件。画布里不套画布。桌面和手机都点按封装元件打开详情。详情窗（手机上是单子）里贴出这块电路的示意图，桌面和手机一样（`packages/circuit/view/board/Schematic.jsx`，只看不改：小元件自上而下按数据流分行，每个只有名字、设置和值，细线接在上下边缘，没有端口圆点、空格位和工具；跨行的线在经过的行里留出过孔，从元件之间穿过，不压在元件上；板自己的输入和结果是顶上和底下的一行小标签；框是套着各区域的一块底色，区域里又是一张示意图。还没运行到的元件不显示值。超出窗口高度才滚动，当前这一步所在的元件滚到眼前；里面的封装元件可以点开，在上面再弹出它自己的详情，里面又是它的电路，标题栏关闭按钮旁是一个小的「编辑」）。板上元件的单子在手机上把「编辑」和「移动」「删除」并排放在底下；桌面的详情窗按桌面排：「编辑」是标题栏里关闭按钮旁的一个小按钮，不占一整行。封装元件在桌面画布、手机格位、元件列表和托盘上用自己的标记和原始元件分开（`parts.packed`）：类别小方块是实心的（类别的颜色作底，图标反白），图标由游戏给（《证明完毕》是电路板），说的是「里面是一块电路」。电路上每个元件显示这块元件到当前这一步为止最近一次运行里的值，当前这一步所在或正在算的元件亮起并滚到眼前。步骤多（一次 auto 几百上千步）时，靠运行的快进和步进看；性能不够时，宁可去掉改板时的即时预览或「跳到结果」，也保留逐步运行。真值电路上的门显示当前这一行的值，逐拍电路里的元件显示当前这一拍的值。这些都由 circuit 包处理（`packages/circuit/view/board/Inside.jsx`，`packages/circuit/core/trace.js` 的 `insideAt`）：模块只说一块封装元件跑哪块板、此刻的轨迹是哪一条（`packages/circuit/core/boards.js` 的 `packed` 在轨迹里给里面每个元件记下 `path`；逐拍世界的板节点传 `traced` 就每拍留一条），用的是 `CircuitLevel` 的 `packed`；元件箱里的封装元件用同一套（`PackedBoard`，只读，没有值）。详情窗和步骤日志通过 `packages/circuit/core/board/packed-boards.js` 逐层查找封装元件，按各层所在关卡和该元件的设置解析内部作品及编辑去向。
- **多条目的值是一个能滚动的窗口。** 一个值有很多条（子句集、证明状态的目标、等式、模型的上下文……）时，一律用 kit 的 `shell/Entries.jsx` 显示：条目在一个能滚动的窗口里，一条一行，窗口下面固定一行写共有多少条，不跟着滚；不到这么多行时窗口跟着变矮。窗口多少行（含共计那一行）、最多列多少条，按用的地方配：默认板上（桌面画布、手机格位、运行过程）5 行、20 条，单子里（`Sheet` 经 `EntriesSize` 给出）13 行、50 条；别的地方用 `EntriesSize` 给它里面的一切另定，单个列表也可以直接写 `lines`、`max`。行高默认是 12px 字一行，模块的行更高时在样式里设 `--entry-row`。
- **读数放在预览里。** 指针在图上时，数值显示在输入输出的预览里，不在元件上浮出坐标。
- 点选网格时，读数固定在该格旁。格子随页面滚动移位、改变窗口尺寸或点到网格外时收起读数。

**值怎么显示：数据形状 × 显示方式 × 场景**

游戏里显示一个值的每一处——板上的元件、元件详情、结果区、引言和点题旁的图、文字里的一个值——都经 kit 的显示组件（`kit/views/`，和 `circuit/`、`studio/` 平级；形状、显示方式、场景的数据在 `kit/engine/views.js`）。

电路板和参数台通过 `views/useElementSize.js` 读取容器尺寸。像素图按原比例直接排版，数值网格在可滚动的框里保留可读的格宽。

参数台在画面上拖动时，通过 `views/svg-point.js` 在指针的页面坐标和 SVG 的局部坐标之间换算。封面配点用同一套换算将两张图的点连到叠层上。

暗箱把拖动中的位置实时交给模型，封面配点在松手时确定落点，剖面图实时切换扫描行。它们共用指针追踪和取消。取消时收起拖动提示，封面配点清除未完成的连线。

参数台的曲线和电路的结果曲线共用 SVG 坐标换算、纵轴投影和连续线段的绘制。参数台的刻度、样本吸附与阶梯线，以及电路的应得值与容差带，由各自的视图组织。

参数台的像素条把一行样本交给 `GridPicture`。它和探针示例共用像素着色，参数台按版面把单行拉满。

图像判分和结果区用每格最大的通道误差来计数、着色和标记。曲线和箭头也共用包含边界的容差判定。非有限值计入误差，曲线在该采样点断开，用失败标记显示位置。

黑箱探针和电路结果区通过 `engine/grid.js` 的 `readCell` 联动读数。选中格的中心按图像相对位置换算到另一张图，返回对应格的坐标和原始值。探针用同一结果画标记和写读数。结果区的像素、剖面和频谱读数集中显示在图下方。剖面按同一相对高度选扫描行，再按所选列的相对位置读每张图。频谱按以零频为中心的有符号频率索引读同类频谱，缺少该频率时显示「—」。二维频谱的数值采用图上各自的对数归一化强度。桌面悬停和手机点按均可读取。数值网格和读数共用 RGB 标签，文字试玩和作者工具通过同一个像素读取按行写出灰度值或 `(R,G,B)` 三元组。

- **形状**：`scalar`（一个值，写成字：数、是或否、向量）、`grid`（`{ w, h, c, data }`：矩阵、图像、一行数）、`bits`（每拍一个 0 或 1）、`ticks`（每拍一个值）、`list`（按顺序的几个值）。
- **显示方式**：一种显示方式画一种或几种形状，同一种形状可以有几种。现有 `value`；`grid` 的 `numbers`（每格写出数）、`pixels`（画成图）、平面上的箭头三种读法，各是一种显示方式，由内容写明、不按列数猜（两行的网格每列是一支箭头，画在淡淡的整数格上；应得画成虚线箭头，差的箭头标红；不写尺寸）：`plane`（每列从原点出发）、`carried`（正好两列，读作 2 × 2 矩阵：整张格子跟着两支箭头推过去，单位正方形的像按是否翻面着两种底色）、`chain`（各列首尾相接，后一支从前一支的箭头尖出发，再从原点画出它们的和）；一块板上和它的结果区里的箭头共用一个画框（`PlaneExtent`，取这个测试的值和整次运行的值里伸得最远的），长一倍的箭头在每张卡片上都画得长一倍、`plot`（函数图像：每行是列号的函数，样本是从零起的竖线和点，应得是同一坐标上的圈，差的点标红，指着一列在图上方读数；按一个绘图单位一像素画，宽度随样本数走，样本少就窄，框窄了才缩小）、`profile`（剖面：图上一条能拖的扫描线，下面是那一行的函数图像，每个样本对着它那一列）、`surface`（地形：每格的值是高度，画成立体的面）、`slope`（坡度：淡化的图上画等值线，箭头是梯度，指向变大最快的方向，越长越陡）、`spectrum`（频谱：零频在中间；一两行画成各频率幅度 |F|/n 的函数图像，应得画在同一坐标上；一张图画成对数强度图，均值不参与缩放）；`bits` 的 `wave`、`bits`/`ticks` 的 `bands`、`ticks` 的 `terms`（逐项：每拍一列写出数，几条泳道合起来像一张表；有它或 `dots` 的时间轴把列放宽到写得下最长的数）和 `dots`（数列图：较高的一条泳道，每项一个点，应得是同一刻度上的圈，零在范围内时画一条虚线）；`list` 的 `sequence`。新的显示方式加进库里，所有游戏、所有场景都能用；模块不写自己的显示方式。
- **一种显示方式可以只画它形状里的一部分值**（`VIEWS` 的 `fits`）：`plane` 只画两行、至多六列的灰度网格，`carried` 只画其中正好两列的，`chain` 只画至少两列的，`plot` 只画一两行的灰度网格，`profile`、`surface` 只画至少两行两列的灰度网格，`slope` 只画至少三行三列的，`spectrum` 只画至多 128 × 128 的灰度网格。一处能用的显示方式是列出的里面画得了这个值的（`usable`；结果区按应得、给出的值判断）：默认列表里画不了的不出现，内容明写在 `results` 里的画不了算检查问题。
- **场景**是封闭的几种，决定画多大、有没有坐标轴、能不能指着读数、能不能切换，调用的地方不传这些：
  - `card` 板上元件里：缩略，网格在数值格下且格子少时写出数，否则画成小图；
  - `detail` 元件详情：完整，带坐标轴，指着一格读出它的值（可以附上它怎么算出来的）；能画成几种显示方式时，值的标签旁有切换；
  - `results` 结果区：结果对应得，并排或上下对齐，不同的地方标出来，逐拍的几行共用一根时间轴（`Results.jsx`）；可在标题旁切换。图像结果行提供相同画法时，共用一排画法按钮；
  - `figure` 引言和点题旁的图：框按值的大小定，可以标出一格、点选一格；示例不能切换显示方式，用玩家选的，或作者只列出的一种；样本取自已知函数时（波形之类）把函数一起给出（`curve`），函数图像照常把样本连线，整条函数曲线画成灰色背景；
  - `inline` 文字里：一行高。
- **显示方式按每一个值记**（`views/picks.js`）：一个值是任务的一个输入或输出、板上一个元件的一个输出（`id#口`），或封装元件里的一个值（前面加上它所在的几层元件）。在元件详情里换，元件上的缩略图跟着换（逐拍运行的板上，详情里是元件每个值到这一拍为止的一条时间线，模块不另给详情时由 kit 画）；输入、输出元件和结果区里它那一行是同一个值，在哪边换两边都跟着变。别的值不受影响。选择按游戏和任务记在这台设备上，不进存档和蓝图：换显示方式不改板，也不清掉上一次运行。没选过的值，用任务的口写的 `view`，没写就用列出的第一种。引言图不切换。
- 所有给玩家读的数都按同一种写法（`kit/engine/number.js`）：最多几位小数，去掉二进制浮点的尾巴和末尾的 0，−0 写成 0。
- 图表、灰度图、网格读数和 Studio 矩阵底色经 `finiteExtent` 读取有限数值的范围。各视图按自己的刻度和亮度规则显示这些值。

模块只交两样：值，以及一个值写成字的写法（`show`）。模块自己画的东西只剩不是值的画面：渲染出的场景照片、几何示意、参数台的模型显示项。

**编排是内容**

- `game.json` 的 `views` 给每种形状默认的显示方式（`{ "grid": ["numbers", "pixels"] }`），没写的形状用库里的第一种。
- 任务的 `views`（同样的写法）换掉它写到的形状的默认显示方式，管这个任务的板上元件、详情和结果区。
- 任务的一个输入或输出可以写 `view`：它的值起初画成哪种（在列出的里面才算）。在工作室的画面编辑模式里，换一个输入、输出元件或它结果行的显示方式，就是写它的 `view`（作为一条待定的变更），不记成设备上的选择。
- **结果区**：模块只说一个任务的结果区能显示哪些东西（`entries`：每个口一项，形状、给出的值、结果、应得），不排它们；任务的 `results` 是结果区的几行 `[{ of: 口, views?, label? }]`，按顺序。任务不写 `results` 时是模块给的默认几行：输出；逐拍的板在前面再加进线和输入。
- **电路玩法的显示配置。** `plays.js` 可用 `results: 'hidden'` 隐藏结果区，用 `output: 'target'` 让输出元件显示当前测试的应得值。颜色取自同一份逐输出判定。单次判定的电路在有输出时更新颜色，检查过但没有输出也显示失败色。测试选择和运行栏仍可用。
- **手机电路卡片。** `tileSettings: 'hidden'` 把配置摘要收进详情，格位保留元件名称和运行读数。
- **Module screen resources.** Circuit modules provide display resources such as port labels, readouts and figures through registered display capabilities. `packages/circuit/view/CircuitScreen.jsx` composes the shared screen; game adapters bind the registered resources to course data. Module contracts check registration and loading, and shared renderers may not import module UI or CSS directly (DESIGN.md §6.2–6.3).
- **修改给定的电路**：任务照常写 `tests`、`solution`。`starter` 是打开时摆在板上的蓝图，玩家编辑电路，内核按任务的测试判定。玩家编写检验来找错误的关卡走第 6.5 节的纠错玩法。
- **一个测试的附图**。电路屏可从 `figure({ task, test, run, at })` 取得附图，桌面排在结果旁，手机排在结果上方。附图可按当前运行步骤更新。
- **引言和点题**：引言的一页可以带 `show`，一关可以带 `afterShow`（显示在点题旁），写一个值：`{ shape, value, views?, label? }`，值按内容的写法写（网格写成一行行的数或 [R, G, B]，位写成 0、1、. 组成的字符串），kit 在 `figure` 场景里画它。
- **一处列一种显示方式，玩家就不能换；列几种，第一种是起始，玩家可以切换。** 结果区里几行可选的显示方式相同时，头部只有一个切换，切一次全都换；不同的行各自在标签旁切换。
- `npm run check` 查：结果区每一行的 `of` 是这个任务能显示的东西；每一处列出的显示方式画得了它的形状和它的值（结果区按参考解跑出的值），每一行至少有一种画得了；内容写的值合它的形状。
- **判定是结果区的第一行**，桌面和手机一样，一次判完的关判完就有，逐步运行的停下时有。

**用词**（`kit/shell/words.js`，模块不另起说法）

| 意思 | 写法 |
|---|---|
| 板跑出来的 / 要求的 | 结果 / 应得（样张上，参考解跑出的也叫应得） |
| 运行键 | 一步步跑的关：运行；一次判完的关：检查；通过以后：通过 |
| 单步、跳到结果 | 单步、跳到结果 |
| 测试标签 | 有名字的测试写名字，没有的写「测试 N」；样张写「样张」 |
| 没有值 / 没接线 | 「—」/ 待接线 |

**读数**：左栏任务下面的几个数（元件数、代价、步数、调用数……）用 `packages/circuit/view/Readouts.jsx`：一行几格，数在上、名字在下，样子和位置所有游戏一样；不加「评分」之类的标题。

**样式只取 tokens。** 字号、颜色、圆角、间距用 `kit/tokens.css` 的变量。直接写出的字号（样式表里的 px）、间距和圆角（样式表里超过 1px 的 px）、颜色（样式表和代码里的色值）由 `npm run styles` 数出来（`kit/engine/styles.js`）：kit 自己的样式表、共用件（`shell`、`circuit`、`views`、`strip`）、每个模块和模板各一项；`npm test` 给每一项设上限（`styles.test.js`），只降不升，间距和圆角处处是零，新模块全是零。studio 有自己更紧的一组值（第 6.7 节），不在其内。笔记站（`docs/stylesheets`）和 Fieldnotes（`trace-viewer/src`）用同一套间距和圆角，但不在这项统计里。

**共用的件**

关卡界面只交各块内容，版面和交互由下面这几样给（第 6.3 节说明模块如何接注册能力）。版面是 `kit/shell/Workbench.jsx` 和 `Layout.jsx` 的 `PhonePage`：关卡给 `results` 就有结果区（还没有内容时传 `null`：桌面上留着空的结果区，手机上不显示），不给就没有；运行栏交 `dock`（一个 `RunDock`），版面替它套上 `run-foot`。

- **电路关由 circuit 包提供界面。** 拼电路的关卡用 `packages/circuit/view/CircuitLevel.jsx`：`useLevelBoard(屏幕, { open, fresh, clearable? })` 管板（打开时用哪块：存档合不合、升级、带过来的板由模块的 `open` 决定；清空回到 `fresh()`；`change(板, { keep })` 里 `keep` 的改动——挪元件、换显示——只存档，不算改了板，运行和结论留着）；`useLevelRun(屏幕, 板, { tests, steps | judge, hidden?, score?, onSolve?, onFail?, guard? })` 管运行和判定：测试标签后面可以跟一个「样张」（`tests` 里 `sample: true` 的一项，只用于一次判完的关）：一张较大的图，板也在上面跑，只看效果、不判定，不计入通过数；`steps`（每个测试的步骤、检查、`final`）逐步跑（`usePlayback`），`judge` 一次判完（`useCheckOnce`），两种都把最后一次运行留在板上。**默认一次判完、直接出结果**；只有一步一步的运算过程本身就是要看的东西时才用 `steps`（证明的推导、一拍一拍的总线、一轮一轮的循环），逐像素算一整张图的电路关用 `judge`；隐藏测试每次一并跑。公开测试和整板约束通过后，桌面和手机的结果区说明有几个隐藏测试失败。通过后按玩法配置公开；`onSolve` 让模块在全过时另做打算（还有下一段、板还不能做成元件），`onFail` 在逐步运行停在失败上时调用，`guard` 在还不能运行时拦下。`<CircuitLevel>` 管版面和其余一切：桌面工作台（元件栏、画布、存档切换、测试标签、通过情况、结果条、运行栏）和手机页（格位板、板下的结果区、托盘、元件的单子和空格的单子、清空、撤销）、框的区域里加元件、简介和提示、封装元件的「编辑」和详情。模块只交：元件描述（`parts`）、元件目录（`items`、`folded`）、新元件的设置（`defaults`，或整个 `create`）、此刻板上的值（`view`）、元件的几面（`card`：`body`、`head`、`cardClass`、`outNote`、`wireState`、`regionNote`、`resultNote`，手机上 `thumb`、`tileExtra`、`sinkBody`、`sinkClass`、`nodeClass`，每面都拿 `(node, ctx)`，`ctx` 是 `{ view, board, path, readOnly }`：同一套画法既画关卡的板，也画封装元件里面的板）、结果区（`results` 等）、手机上板下面的东西（`below`，`follow` 让页面跟着跑到底）、单子里的说明和内容（`describe`、`sheet`，或整个 `addSheet`）、封装元件（`packed`：`open(node, board)` 给出它跑的那块板和画它的 `parts`，`edit` 去搭它的那一关，`trace()` 给出板上此刻显示的那次求值的轨迹）和运行键的字。模块自己的面板放进任务板（由 `taskBoard` 选取）、结果区或单子里，不另排版面。
- **步进运行用共用的 kit。** React 界面的关卡用 `shell/usePlayback.jsx`：给它每个测试的步骤和检查，它管运行、步进、暂停/继续、跳到结果、第一个测试慢后面快、遇到失败的一步或不对的测试立刻停、全过才通关，并生成运行栏的控制按钮（`dock()`，手机上小按钮只剩图标，和运行键同一行）。当前这一步的元件加 `is-step` 类（桌面画布和手机格位都有样式，出错时加 `is-step-fail`），输出区用 `shell/StepLog.jsx` 列出每一步的结果，列表和每条结果都限高、超出滚动。电路类的板用 `packages/circuit/core/circuit.js` 的轨迹直接得到步骤。步骤日志是电路屏的一项功能：屏的声明写 `log: true`，跑一次的板就在结果下面列出到当前为止的每一步（`packages/circuit/core/trace.js` 的 `traceSteps`）：元件按它所在的板取名，搭出的元件里的一步前面依次写上它所在的元件（`自建 auto › 回溯搜索 · 第 1 轮`），框进入的轮次和元件自己说的动作（轨迹项的 `round`、`inner`）接在名字后面，算不出的一步标红并说明原因。板上的设置怎么写成蓝图文本由板自己给（`circuitBoard` 的 `text`），所以导入的蓝图和内容里的读法一致。现在用它的：《证明完毕》的机器板（规则与元变量一章起）和真值电路板，都经 `CircuitLevel`。《状态之图》的机器人电路和自动剪缝都用 `usePlayback`，由 `paceOf` 计算节奏；自动剪缝一开始就标出第一条缝，每帧从模块读出图像、缝和累计条数。顶部栏的「设置」可选自动步进速度（`0.5×`、`1×`、`2×`），按游戏保存在当前浏览器里，默认 `1×`，下一次运行时生效。倍率只缩放自动步进的等待时间。参数台的动作间隔和限时由关卡和模型定义。

### 元件工坊

工坊是游戏壳里的一个页面（`packages/circuit/view/Workshop.jsx`，地址带 `?workshop=<托盘>`），入口在游戏的关卡地图，离开时回到地图。托盘左端的图标按钮向上弹出菜单，列出已开放的电路元件托盘及其名称和描述。每个托盘各有一张草稿，随改动保存在工坊存档里，首次打开和清空后都从只有输入输出牌的板开始。

普通关卡点击输入输出牌，详情只标出它是输入还是输出；端口另有名称时（多个端口，或唯一的端口不与牌同名）逐行列出。工坊从托盘首端放置新的输入输出牌，新牌带一个端口，牌与端口同名，名称在同侧不重复（「输入」「输入 2」）。点牌打开详情：标题是它的类型，下面是名称；只有一个同名端口时改名即同时改牌和端口，添加端口后才逐行列出端口标签，每行可改名、可移除，移除端口时一并移除它的接线。同侧重复、为空或含保留字符的标签即时标红。草稿牌与关卡里的输入输出牌同样配色和图标。

牌面遵循同一条规则（`packages/circuit/core/board/card-ports.js` 的 `namesPorts`）：端口不另有名称时只显示牌名；另有名称时牌名退为小字，端口名写在牌内、各自的圆点旁，手机上牌宽随名称伸展，名称不压牌名、不伸出牌外。工坊仍用运行栏的主按钮封装，点击后在确认弹窗编辑元件名称与描述，同托盘内的元件名称必须不同。

封装时按卡片顺序保存端口，未接线的输入不计入接口，每个输出必须接线，同侧端口标签不得重复。封装保存内部电路、嵌套版本和实际用到的基础元件与设置。手动作品在托盘折叠区出现，也可在「我的元件」固定到主区。

工坊数据保存在同站点的浏览器存档中，独立于关卡存档。玩家可从「我的元件」删除手动封装，托盘随即移除该元件，已有电路和嵌套封装保留原版本。任务通过后，`publishes` 用同一个封装入口生成作品，使用内容预填的名称和描述。新版本取代工坊里的旧自动版本，已放置到电路的实例保留创建时的版本。不同游戏在运行方式兼容且目标任务提供所需基础元件和设置时，可以放置同一个封装。关卡判定中的元件数和计算量按封装内部的组成计算。

兼容性由模块、基础元件的端口、区域、运算、校验条件和引用所指向的实际设置决定。内联设置的显示文案和控件排版可各自修改。

关卡把工坊元件的端口和信号类型加入当前电路，蓝图导入、接线和恢复存档据此检查整张板。托盘上合并显示的型号仍保留各自的蓝图类型。

继承任务使用同一份工坊接口检查上一段的作品和当前板。封装在当前任务可用时，随原有卡片和有效接线一同带入。

课程奖励从 `progress.built` 读取各自任务的通关作品。完整页面、笔记嵌入和文字试玩都按实际判定的作品写入，直接运行任务的起始板也会保存它。通关后切换槽位或编辑草稿时，课程奖励仍使用最近通过的作品。

通关板包含工坊元件时，内核在通关及载入时按板上保存的版本从同站点工坊取得它们。课程奖励的求值、回放和内部示意图都解析这些版本。后来发布新版或在另一关限制托盘，只影响可新放置的元件。

### 6.10 多语言文案

**磁盘格式。** 可翻译字段用 `@键` 引用，组装为命名空间全名。每层自己的文案在 `i18n/<lang>.json`；覆盖其它层的文案在 `overrides/<命名空间>/i18n/<lang>.json`，按键合并。包和游戏都遵循此规则，游戏只覆盖本游戏选用的包，不改包原文。各语言都是扁平的「键 → 文本」表。元件的文案字段例如：

```json
{
  "name": "@part.counter.name",
  "desc": "@part.counter.desc"
}
```

`packages/state-graph/i18n/zh.json` 中的对应条目：

```json
{ "part.counter.name": "路线计数器" }
```

`en.json` 中同一键的值为 `Route Counter`。`inside[].id`、端口 ID、公式和解题蓝图等玩法数据按各自的 schema 读取。内核和模块的通用界面用语由自己的词表维护。发布时，`content.json` 引用独立的语言文件。页面打开时载入这些文件，切换语言时用同一个语言代码更新界面和内容。

**编辑和预览。** Studio 根据 schema 枚举可翻译字段，用字段路径定位控件，再用该字段的键读取两列文本。每次编辑继续提交带 `lang` 的 `text.set`；操作集按字段归属更新对应的语言文件。待定变更集同时提供配置和文案给预览，配置源码面板显示键，文案表和试玩画面显示解析后的文本。某语言缺词时，文案表留空，预览标明缺失。流水线按所选范围和语言报告缺少的键。

**键的生命周期。** 键在创建字段时分配，属于课程或内容包。改写文案、重排列表、移动时沿用原键。复制成独立字段时分配新键并复制已有语言。删除字段时清理它独占的键。涉及配置和语言文件的修改在同一变更集中预览、校验、应用和撤销。

**校验。** 配置引用须指向所属语言表的文案键。各语言分别校验文本标记和链接。迁移保留字段原有的各语言文本，文案键和语种变更不影响任务的存档标识。

---

## 7. 作者流程

先理解主题、学习者、已有课程和当前实现，再决定需要哪些目标、交互、路线与内容。设计和实现应保持对应，变更时更新受影响的设计文档。可以用蓝图、依赖图（`npm run deps -- <游戏>`）、原型和参考解帮助判断，但不必为每项工作套用同一套设计步骤。

内容经第 7.1 节的操作集修改；新专题可使用第 7.2 节流水线。检查的范围按第 7.0 节选择；改动界面或交互时观察相应桌面、手机流程。对流水线和自动检查报告，结合实现及教学目标判断，并说明仍未解决的限制。

### Task-scoped capability introduction

评估任务边界时，留意玩家在每条先修路线实际见过的概念、工具和设置。必要时先提供观察、解释或练习，避免多个陌生表示同时成为障碍；工具的开放和存档行为按相应领域与内核实现核对。

### 7.0 Verification by impact

Start with the smallest meaningful check of the changed behaviour and its direct consumers. File count alone
does not determine impact: a shared evaluator can affect many games, while a long copy edit may affect no execution.

| Changed scope | Required verification | Broaden when |
| --- | --- | --- |
| Documentation or process instructions | Diff/format review and changed references | An executable command or contract is also changed |
| Game copy or curriculum data | Operation-set validation of that game; copy or topology gates only for the changed concern | New dependencies, references, task contracts or built-part consumers are affected |
| Game UI, CSS or interaction | Changed-JS lint, that game's build, and the changed desktop/phone flow | Shared widgets or layouts have additional consumers |
| Domain calculation or evaluation | Relevant domain test files, affected-game checks, and direct packed-part/consumer cases | Evaluation or representation contracts change across domains |
| Shared shell, circuit or engine module | That module's tests and affected consumer checks; representative UI flows for interaction changes | The shared API changes or affected consumers cannot be bounded confidently |
| Save stamp, schema, registry or dependencies | Relevant stamp/schema/replay/contract tests and all identified consumers | A repository-wide contract or dependency is affected; then run the full relevant suite |

Commands use existing entry points; no new validation runner is needed:

```sh
# From the repository root: run only the relevant test file(s).
node --import games/kit/engine/package-imports.mjs --test packages/image/test/image.test.js

# From trace-viewer/: name the game for checks and builds.
npm run check -- vision-complete
GAME=vision-complete npm run build:game
```

A successful operation-set check counts as the affected game's content check until relevant content or validation
code changes. Reuse passed results for an unchanged scope; committing, amending or pushing alone does not invalidate
them. A failure expands verification along the failing dependency, rather than automatically selecting every suite.
Linux syscall conformance belongs to Unix model changes, not unrelated domain or interface edits.

Finish implementation and necessary review before submitting one release. Add late changes only when they block
correctness or the requested behaviour. Report the selected checks and any unverified boundary accurately.

Local verification and deployment are separate scopes. `deploy-games.yml` only builds and publishes the complete
site; `test-kit.yml` runs the kit's unit tests when kit code changes. Neither replays a game. Content changes are
gated only by the studio and the operation set, and the compatibility corpus (`npm run check` over every game,
`games/DIRECTION.md` decision 17), which shows a kit change that broke a game's reference solutions, is run on the
platform by whoever develops a game or the kit (`npm run check`, the MCP `audit`), never by a GitHub workflow.
A documentation-only local change does not require a deployment.

### 7.1 内容只经操作修改

**对象的 id 一经建立就不能改。** 关卡、任务、元件、阶段、词条、标签、关系、托盘、百科分组、章的 id 都是对外接口。没有改名操作；要换 id，就新建一个再删掉旧的。普通字段编辑、整对象替换和覆盖也不能更改 id。任务或章节列表可重排、单独新增、单独删除；同一次列表替换不能同时去掉旧 id 和加入新 id，须拆成明确的新增和删除。

内容层的每一处修改都是操作集（`kit/engine/ops/operations.js`）里的一个**操作**，不手改 JSON：人在命令行里或 studio 里（第 6.7 节）、agent 经 MCP，跑的都是同一套操作，走同一道门。几个操作合成一个**变更集**，当一次修改：

```json
{ "why": "为什么改", "ops": [{ "op": "level.set", "level": "intro", "path": "tray", "value": "basics" }] }
```

| 操作 | 做什么 |
|---|---|
| `level.set/unset/patch/replace`、`level.blueprint`、`level.adds` | 编辑本包关卡字段、蓝图和引入的元件 |
| `level.add/remove`、`task.add/remove/move` | 创建、删除关卡；按稳定任务 id 拆合、重排或移动任务 |
| `part.add/remove`、`parts.set/unset` | 编辑本包元件及其设置、阶段和外观 |
| `entry.put/set/patch/remove` | 编辑词条 |
| `tag.put/set/remove`、`relation.put/set/remove`、`tray.put/set/remove`、`section.put/set/remove` | 编辑集合、关系和呈现对象；内容种类也有同名操作族 |
| `game.set/unset` | 编辑入口或课程字段，章顺序写 `chapters[].levels`，布局写 `rows` |
| `game.package.add/remove` | 修改选包；参数 `package`，可选 `at` 只控制选择列表位置 |
| `override.put/remove` | 在当前 `layer` 覆盖或移除覆盖；`kind`、`name` 指向被覆盖的全名 |
| `text.set`、`text.override` | 按对象字段路径和 `lang` 写本层文案或游戏覆盖；`value: null` 恢复原文 |

**按层写入。** `opScope` 划分包和游戏职责；打开包只改本包声明和覆盖，打开游戏只改游戏编排和允许的覆盖。`openPackage` 不借游戏。构建和文案工作区可以打开同一包，分工不同，归属相同；依赖包的声明始终只读。

选包、覆盖也参与预览、失败恢复、日志、撤销和并发校验。加包前须选全直接依赖，去包时仍有编排关卡或别包依赖它就拒绝，不能移除最后一个包。改变选包立即重新组装内容并选择运行模块，写入只动游戏层，写盘前还核对所读包是否被并发修改。

**一个变更集怎么跑**（`ops/changeset.js`）：每个操作先按它参数的 schema 查（提到的关必须存在），再依次改内存里的内容，哪一个失败整个变更集作废；然后按打开的包或游戏跑对应的 `npm run check` 检查（词汇表、课程审计、文案和链接、领域检查：参考解跑测试、naive 解失败）。全部清零才写盘，否则什么都不写，并列出每一处问题。写盘时只动改了的行（两格缩进，112 列内的简单对象或列表紧凑写入），游戏 `games.js` 里的关卡数跟着改，修改日志 `changes.jsonl` 加一行，记下撤销它的变更集。写盘、记日志在当前层的锁里做（`changes.lock`，写着持有它的进程；进程死了留下的锁会被接手）：盘上的文件和打开游戏时读到的不一样就拒绝（另一个写者先改了）；调用方给了 `base`（它看到的日志最后一条的序号，`preview`、`log` 给出 `head`；studio 总是给）而日志已经往前走了，也拒绝。撤销只从那一条留下的状态往回改：它改过的文件此后又变了（手改、后来的修改），就拒绝。文件在操作集之外被改过，`log`、`npm run check` 报出来（不算失败），`npm run op -- <游戏> adopt --why …` 把现状收进日志。

**命令行**（`trace-viewer` 目录下）：

```
npm run op -- list                                         列出操作和参数
npm run op -- <游戏> <操作> 键=值 …                          跑一个操作（值是 JSON 就按 JSON 读）
npm run op -- <游戏> --file 变更集.json                      跑一个变更集
npm run op -- <游戏> undo                                   撤销日志里最后一次还没撤销的修改（撤销本身也是一次修改，也记日志）
npm run op -- <游戏> log                                    看修改日志
npm run op -- --package <包> --file 变更集.json              独立修改包
npm run op -- --package <包> adopt --why "…"                将外部迁移收进包日志
```

加 `--dry-run` 只打印 diff、不写盘；`--why "…"` 写明为什么（记进修改日志）；`--json` 输出 JSON。

**MCP**（`npm run mcp`，stdio 上的 JSON-RPC；仓库根目录的 `.mcp.json` 已把它登记成 Claude Code 的项目级 `games` 服务器：在仓库根目录启动 Claude Code，第一次用时批准它即可；要只给自己登记，在仓库根目录跑 `claude mcp add --transport stdio games -- node games/kit/engine/ops/mcp.js`。服务器要用 `trace-viewer/node_modules` 里的 vite，先在 `trace-viewer` 里 `npm install`）：工具只是同一套操作和检查的薄皮，没有自己的逻辑。

| 工具 | 做什么 |
|---|---|
| `vocabulary` | 统一内核词汇表（`describe`）及当前内容所用的 schema 投影和全部操作的参数 schema：写内容之前先读它 |
| `audit` | 和 `npm run check -- <游戏>` 一样的检查 |
| `modify` | 跑一个变更集；`dryRun` 只看 diff |
| `run_reference` | 一关的参考解和 naive 解经模块检查跑测试，给出提到这一关的那几行（《状态之图》的模块只在失败时提到一关） |
| `blueprint` | 读一关的每块板的蓝图文本；给了 `text` 就经 `level.blueprint` 写进去 |
| `render` | 一关或它的一块板写成文字（给了什么、要做什么、各块板的蓝图）；`format: svg` 把各块板画成 SVG（`packages/circuit/core/board/svg.js`），模块给 `scene` 的再画这一关（第 6.7 节）；给 `changeset` 就画变更集留下的样子。PNG 画不了，直说 |
| `deps` | 元件依赖图（Mermaid 或 DOT） |
| `preview` | 一个变更集留下的整款游戏，不写盘：内容、`check` 的每一行和它说的是哪几关、每个文件改前改后、失败的是第几个操作、修改日志（`check: false` 只按词汇表查内容，快）。studio 靠它显示一切 |
| `seed` | 按字段路径读取一块板（默认第一个任务的参考解），以该任务的端口和元件生成存档数据。Studio 打开该任务并在板上载入它。 等待期间切换任务或修改内容会作废这次载入。 |
| `names` | 链接显示的名字：每关的关号和标题、元件箱里每个元件的名字（和它是哪个元件、在哪一关拿到）、每个词条的标题，和文案里可以照字面引用的名字（studio 的链接小块、文案检查和元件列表的排序用它） |
| `flow` | 一个元件在课程里的流转（`packages/circuit/core/flow.js` 的 `partFlow`，从课程推出，不加数据）：一开始就在手上、哪一关带来、哪一关（或它的哪个任务）只在那里给或扣下、哪一关来了取代它的元件、升级链每一步在哪个任务；每一项给出关、任务和内容里说这件事的字段路径 |
| `run_tests` | 按字段路径定位蓝图和任务（默认第一个任务的参考解），经模块的 `play` 钩子跑该任务的可见测试和隐藏测试：每个测试关卡界面怎么画（给了什么、应当是什么）、过没过、界面说了什么；钩子不支持的玩法说明原因 |
| `log`、`undo` | 修改日志；撤销最后一次还没撤销的修改（和 `npm run op -- <游戏> undo` 一样）；给了 `seq`（调用方看到的那一次），日志在那之后又变了就拒绝 |
| `search` | 在整款游戏里搜索（变更集留下的样子）：文字的每一面（链接标签里面不算）、板的每一行、关卡和词条的 id；每处给出文件、关、路径和匹配的位置（`kit/engine/ops/search.js`） |
| `replace` | 把搜索到的换掉，写成一个变更集，不写盘：一段文字一个 `text.set`、一块板一个 `level.blueprint`，每处改前改后，和找到但不换的 id；再交给 `modify`（先 `dryRun`） |
| `history` | git 里某一版（默认 HEAD）的一个文件：一关、`game.json` 或游戏文件夹里的其他文件；游戏文件夹不在 git 里时（`GAMES_ROOT` 的副本）照实说 |

环境变量 `GAMES_ROOT` 指向含 `games/` 和 `packages/` 的项目副本，供作者工具试改动。

**studio**（`npm run studio`，第 6.7 节）：同一组工具开在开发服务器上，人在一个页面上走完上面的流程。读一章（文案表）、改文字和字段（在画面上点它，或在字段页点它，侧栏里改；任务、提示、测试在画面上点「+」加）、全游戏搜索替换和几关一起改（都先列出要加的操作）、挪关（拖到树上的槽位）、改板（侧栏里的蓝图，或者在游戏的电路编辑器里改完点「用作 …」）；每改一处就是待定变更集里的一个操作，审计栏随即重算，画面玩的就是改过的内容；最后在辅助抽屉的变更集中逐个看操作和每个文件的字段级 diff，写一句为什么，应用；修改日志里的最后一次可以撤销。agent 交来的变更集（`{ why, ops }` 的 JSON 文件，MCP 的 `modify` 收的那种）在辅助抽屉的变更集中打开，就成了待定的变更集：一样能读、能改、能玩，再应用或放弃；agent 已经写进去的修改在修改日志里，同样能撤销。

### 7.2 agent 流水线

**一个新专题由 agent 一步步做出来，每一步一份 brief、一道闸门**（方向见 `games/DIRECTION.md` 第 4 节）。流水线对所有专题都一样，放在 `kit/pipeline/`：每一步的 brief（`steps/<步>.md`，给做这一步的 agent 读的全部要求）、每一步读什么写什么和它的闸门（`steps.js`）、课程蓝图的 schema 和审计（`blueprint.js`）、文案 lint（`lint.js`）、命令 `npm run pipeline`（`pipeline.mjs`）。每一步的产物都是内容层的数据，经操作集写进去（第 7.1 节）；闸门的每一条失败都叫得出一条规则。

| 步 | 谁做 | 读 | 写 | 闸门 |
|---|---|---|---|---|
| `blueprint` | 课程设计 agent | 课程资料（讲义、笔记、游戏文件夹里的设计文档）、手册第 1、2、4.1、6.5、8 节、内核词汇表 | `blueprint.json`（`blueprint.put`、`blueprint.set`）：先是知识点，再是 slot | 蓝图审计（`bp-…`，下面） |
| `domain` | 工程师（代码，决策三的内核权限） | 蓝图的 `requests`、`mechanisms` | 内核模块代码；每条需求的状态（`done`，或 `declined` 带 `note`） | 没有还开着的需求；模块契约（第 6.3 节）；`check`；模块的单元测试 |
| `levels` | 关卡设计 agent | 蓝图（每个 slot 的问题和思维链）、词汇表、手册第 2、4、5 节 | 包内关卡和游戏的 `chapters`、`primitives`（`level.add`、`game.set`……） | `check` 清零（参考解通过、naive 解失败、审计全开）；关卡合蓝图（术语链接除外）；教学 lint（`pd-…`，下面） |
| `copy` | 文案 agent | 蓝图（每个知识点的术语、出处、墙，每个 slot 的问题）、关卡、手册第 1、4 节 | 全部文字和百科（`text.set`、`entry.put`……） | `check`；合蓝图（含术语链接）；文案 lint（`copy-…`）；教学 lint |
| `review` | 评审 agent | 手册和 skill 的两张核对单、整款游戏 | 只写发现（它最后交出的 JSON：在哪、归哪一步、违反哪一条、`fix` 要不要改） | 最后一次评审没有还没解决的 `fix` |
| `queue` | — | — | 评审队列里的一项（`pipeline.json` 的 `review`：这款游戏修改日志里的变更集） | 上面每一道闸门此刻都还清零 |

流水线仍保留 `domain` 这个步骤名，表示内核能力需求处理，不再生成领域目录；旧 brief 中关于领域路径和脚手架的说明不能作为当前写盘依据。

**一个 agent 只拿到它这一步的东西。** `npm run pipeline -- <游戏> run <步>` 起一个新的 `claude -p`，在一个空的临时目录里：brief 加上这一步的输入（文件的路径、上一次没过的闸门、评审留给这一步要改的发现、这一次的范围 `--scope`），能读任何文件，只能在自己的目录里写，只能运行这一步的几个命令（`./op` 跑变更集，`./check`，`./gate` 这一步的闸门，`./deps`，`./eras` 蓝图排出的内部 `eras` 投影（写课程时转换为 `chapters` 与关系），`./lint`；评审没有 `./op`）。跑完记下用量、每个命令跑了几次和失败了几次、写进去的变更集（修改日志的序号）和它的报告，再跑一遍闸门；全部记进 `pipeline.json`。没过就再跑一次：上一次的闸门失败和评审的发现成了下一次的输入。`domain` 这一步是代码，不由内容 agent 做；评审的发现修好以后，用 `npm run pipeline -- <游戏> resolve <k> --why "…"` 记下是哪个变更集修的，或者再评审一次。`status` 列出每一步的闸门和跑过几次，`brief <步>` 打出一个 agent 会拿到的全部文字。

**课程蓝图**（`blueprint.json`，schema 是 `kit/pipeline/blueprint.js` 的 `BLUEPRINT`）：专题、学习者、终点和这一次做到哪（`scope`，往后的写进 `deferred`）；从机制目录里选的机制；机体阶梯（每台机体会什么、缺什么）；**知识点**（`knowledge`：本领域的术语、说的是什么、出处、撞上的墙、纠正的错误、是讲义的理论还是技术内容；第 4.1 节）；原始元件（每个写明为什么接不出来）和搭出的元件（由什么搭成），原始元件是工具，不是知识点；每一章是一串系列（地基、练习、专题、挑战；同一个 `parallel` 的几个系列是一个并行组），每个系列是一串 slot：一个 slot 就是将来的一关，写它的 id、做什么（`task`）、玩家要回答的问题（`question`）、从问题到答案的思维链（`chain`，至少两步）、带来的那一个知识点（`teaches`；主线上只能是讲义的理论）或练习露出的侧面（`facet`）、加的原始元件、搭出的元件、参考解站在哪些元件和知识点上（`uses`）、练习变化的是哪个维度（第 2.3 节），挑战写 naive 解；最后是向领域和内核提的需求（决策三的需求通道）。`erasOf` 生成旧的内部章节、编号与连线投影；它仍是流水线蓝图比对的格式，不是 `course.json` 的写盘格式，不能直接把它写成课程。

**蓝图审计**（`auditBlueprint`）在一关都还没有的时候就按第 1、2、4.1 节查编排：`bp-refs`、`bp-unique` 名字都有定义、不重复；`bp-source` 每个知识点注出处，出处是 `sources` 里的一份材料；`bp-part-point` 知识点不是原始元件（id 或术语不是原始元件的 id 或名字：工具不是知识；搭出的元件可以就是知识点）；`bp-knowledge` 每个 slot 都在做某个知识点（带来一个，或在 `uses` 里练一个），什么知识点也不做的 slot 是凑数；`bp-taught` 每个要练的知识点有一处带来；`bp-trivial` 一句话就懂的点（`intuitive`）不做成关、不当练习的内容，`bp-mentioned` 它们只由某一关提到（`mentions`）；`bp-depends` 一个点搭在其上的点，在每条通向它的路上都先出现；`bp-shallow` 难点（`hard`）之前至少有两关在教它依赖的点；`bp-core-none` 每章标出核心；只报告的 `bp-ladder`：主线上通往核心的关不到一半；`bp-main-tech` 主线（地基、练习）上的关不带来、不用技术内容的知识点，它们只在可选专题里；`bp-adds-teaches` 加原始元件的 slot 带来需要它的那个知识点；`bp-facet` 练习 slot 写出它露出的新侧面；`bp-question` 每个 slot 写出问题和至少两步的思维链；`bp-point` 每个知识点写出术语、出处和 `basis`（schema 只管能写什么，好让这些字段出现之前写成的蓝图仍然读得进来；必须写全由审计要求）；`bp-placed` 每个原始元件、搭出的元件恰好有一处带来；`bp-order` 一个 slot（和一个搭出的元件）站在的东西，在通向它的每条路上都已经有了（按先修关系，并行组的另一路不算）；`bp-first-use` 知识点在带来它的那一关用上；`bp-unused` 搭出的元件后面有人站在它上面；`bp-practice` 一组练习不重复维度、以组合或辨真伪收尾；`bp-branch` 主线上前后两个系列，后一个用不着前一个的任何东西时，该是并行组；`bp-parallel` 并行组两到三路、互不依赖；`bp-abstraction` 一章最后一个系列站在这一章搭出的元件上；`bp-machine` 用到的能力机体会；`bp-challenge` 挑战不带新东西、有 naive 解；`bp-tray` 有几套托盘时每一章都写它用哪一套。只报告、由人判断的：`bp-reuse`（一个知识点在再来两个知识点之前没有再用上，或主线后面再没用到：它是不是通过部件复用、或由后面的关链回来）、`bp-bare`（只放它带来的东西）、`bp-lonely`（一个知识点后面没有练习关：它的测试和任务够不够，看第 2.3 节）、`bp-heavy`（一个知识点占了四关以上：每关都是新侧面吗）、`bp-open`（还开着的需求）。

**关卡合蓝图**（`conformance`）：每个 slot 恰好一关、内部 `eras` 投影和 `primitives` 与蓝图一致、每关的 `adds`、`builds` 是它的 slot 的、参考解用到 slot 的 `uses` 里的每一个元件、slot 有 naive 解的关也有（某个任务有）；`bp-entry` 每个知识点有同 id 的百科词条，在带来它的那一关打开；`bp-term` 带来知识点的那一关在玩家读到的文字里链接这个词条；`bp-main-link` 主线上的关不链接技术内容的词条。

**教学 lint**（`lintPedagogy`，`kit/pipeline/pedagogy.js`，第 4.1 节里能机械看出的几种）：`pd-repeat-board` 两关的参考解是同一块板（不管元件叫什么名字，比的是元件、设置和接法）；`pd-repeat-text` 玩家读到的一段话（引言的一页、目标、提示、点题、naive 解为什么错）一字不差地出现在两处；只报告的 `pd-slide`：实验台的一步只开一个旋钮、目标读数实时显示，拖到变绿就能过；`pd-quiz`：一个任务只是点选答案（选择题）。它们看得见形式，看不见意思：是不是工具关、判断题是不是不看材料就能答、思维链有没有落在屏幕上，由评审逐关读。

**文案 lint**（`lintCopy`，`check` 已经查链接和按位置指关卡，这里补手册第 4 节能机械看出的）：`copy-banned` 口语、翻译腔和「卡片」「方块」；`copy-ahead` 往后透露；`copy-length` 目标、引言一段、提示、点题的长度上限；`copy-intro-part` 引言一开口就是新元件；`copy-after-part` 点题链接了元件（多半在复述接法）；`copy-brief-why` 目标里讲理由。

**闸门漏掉、后面一步抓到的，改成检查。** 原型有一关的参考解用了五十个元件，盲玩者只接一根直通线也能过，因为测试只检查接收端收到什么。此后电路预设可以检查空板和单根线直通能否通过，参考解本身是直通时例外。能机械查的设计问题做成检查。难点编排、机制练习和元件复用等问题回到课程设计重做。

**评审队列**：`npm run pipeline -- <游戏> queue` 把每一道闸门再跑一遍，全部清零时在 `pipeline.json` 记下 `review: { status: 'pending', changes: [修改日志的序号…] }`。人在 studio 里评审（第 6.7 节）：修改日志里是 agent 写下的每一个变更集，各带它的「为什么」，能逐个撤销；要改的就地改，成为人自己的变更集。要退回给 agent 的，写成评审意见：`npm run pipeline -- <游戏> comment <在哪> --owner <步> --why "…"`，游戏退出队列，那一步下一次跑的时候把这些意见当作输入（决策五的「驳回并写意见」；studio 的评审页签还没有写意见的入口，接上时写的就是这一处）。

---

## 8. 常见问题

评审时可留意：学习目标被琐碎操作掩盖；引入的能力没有动机或后续用途；难点与前置知识之间跨度过大；重复关卡缺乏新的判断；材料或反馈不足以支持推理；题目只靠猜选项或拖动到绿灯；点题把参考解当成唯一做法；并行与可选路线的文案假定玩家走过其他路线。这些都是调查线索，结合具体关卡判断，不是按形式一律否定。

---

## 9. 实例：《状态之图》按代际重排（游戏章对象）

以下实例记录各课程曾采用的设计选择，供比较，不是其他课程必须照搬的模板。

按本手册从头设计的新关卡树见 [`state-graph/CURRICULUM.md`](state-graph/CURRICULUM.md)。下面是现有关卡按代际重排后的样子，在新关卡树做出来之前它是线上的版本。

**原始元件。** 动态规划讲的是表、状态和顺序，不是算术，所以算术和逻辑元件都是原始元件，各自在一关里第一次出现：
- 汇合器及其型号（加起来、取较小、取较大、任一是）；
- 常数和放行闸（一起出现）、拦截闸、加法器、取反、乘法器。

学习者搭出的东西是电路板：路线计数器、最省格、择优器、区间合并器、编辑距离器、打折器，通关后作为元件解锁，跑的就是学习者通关时的那块电路板。搭它的那一关，板上的输入就是元件的口：视野和本格信息里读的格子；元件要的口在那一关的世界里没有对应的格子时（最省格的第三条来路），板上多一个只属于这一关的输入，在这一关里一直是「—」。通关时板子只能读元件的口，而且每个口都要读到，否则元件会和板子做的不一样。

**代际**（每一代：地基 → 练习 → 专题系列，挑战挂在旁边）：

| 时代 | 地基 | 练习（按难度） | 专题系列 | 挑战 |
|---|---|---|---|---|
| 0 纸笔 | 找路线、只看最后一步、棋盘城市（还没有机器人，手算） | — | — | — |
| 1 小方 | 传话、两路汇合、认出起点、落石、能不能到、最省力、走不到的路口 | 斜街、最值钱的路、杨辉三角、有坑也有价 | 图里的缝（一根柱子 → 可以斜着走 → 最不起眼的缝 → 剪掉它） | 最大的正方形 |
| 2 远望 | 爬楼梯、倒着算、拿石子、连线不交叉、对齐表、回文 | 有坏台阶的楼梯、最长回文子序列 | 拼写纠错（改一个字母 → 改错字 → 你是想打这个词吗） | 奇还是偶、找最像的一段、两堆石子 |
| 3 长臂 | 青蛙过河、跳得更远、安全过河 | 猜词性、这句话有多可能 | 背包（装背包 → 背包表 → 每件可以拿多次 → 混合背包） | 凑零钱有几种、压成一行 |
| 4 扫帚 | 前面所有的、越来越高 | 合并石子、顺序不止一种、句子的骨架、凑零钱 | 切单词（最少几块 → 有的词更贵 → 分词） | 最大的一段 |
| 5 千层 | 不能连着偷、找出破绽、钥匙与门 | 买卖一次股票、冷冻期 | 设计状态（两把钥匙 → 三把钥匙 → 记得够不够） | 环形街道 |
| 6 回环 | 绕一圈 | 格子世界、箭头自己长出来 | 格子世界（往右往下找宝藏 → 会打滑的地板 → 有冰有地） | — |

`npm run check` 对《状态之图》已经清零。

长臂的背包系列可以当作样板：
- 伸缩臂在地基里由青蛙过河教会，背包专题从手装背包开始；
- 专题是"装背包 → 背包表 → 每件可以拿多次 → 混合背包"。混合背包给每件物品一个"能不能拿多次"的事实，它的参考解因此也能直接解前一关和 0/1 背包表；
- 测试选的是让"全都只拿一次"和"全都能拿多次"两种想法都答错的背包。

## 10. 实例：《视觉完备》

每一章是一个 chapter（`games/vision-complete/chapters/`）：主线是步骤（新元件和紧跟的小练习交替），专题和挑战挂在各自需要的那一关之后；主线按机制整理成带名字的系列；互不依赖的系列排成并行组（比如第 1 章的「锐化」和「找边」，第 8 章的「对抗」和「扩散」），先后随意，全部通过才继续。哪些关能并行，按元件依赖判断：一关用到的元件，搭出它的关必须在它之前。全部 12 章（第 0–11 章）都已这样重排，技术检查通过，抽象链由作者评审：

- 能拼出来的元件都由玩家拼：ReLU = 相乘 + 阈值，取较大 = ReLU 再加回去，最大池化 = 取较大 + 平移 + 隔点取样，Sigmoid = exp + 加常数 + 相除；
- 拼不出来的原元件用探测关引入（平移、阈值），或声明为原始元件（cos、exp、相除、开方、求平均、全图最大值、频域相乘、可学习的数）；
- 「放大解锁」：一个频率的探针搭好后，解锁对每个频率都做探针的「频谱」；
- 机关台只留给拼不出来的机制（暗箱、采样、几万步的训练）。
- 按话题分托盘：第 0–3 章的流水线元件加上第 4 章不学习的那几样（exp、ReLU、取较大、最大池化）是共同底座。第 0–5 章用流水线托盘（`pipeline`）；第 6、7 章转向几何（`geometry`），第 8 章转到潜空间生成（`generative`），第 9–11 章从生成回到逐像素、再到框和注意力（`recognition`），这三套托盘都从这份底座起，再加上本段自己的元件。第 10 章还要用第 6 章搭出的非极大值抑制，第 11 章还要用第 5 章的注意力，所以后面几套托盘也列上它们（没用到时折叠起来）。可学习 3×3 核列在生成托盘上，第 8 章一开始就在「更多」里，修旧照片那一关不必再带来。

打开抽象链审计时，报出了五个搭出后再没人用的元件，按两种办法处理：
- 有后续价值的，补一道真用上它的练习，放在不用它会很长的地方：多通道 3×3 核之后的「蓝天与黄沙」（三个核加两次加法收成一个元件），残差块之后的「再深一倍」（十二层，每层一个元件，不用它就是二十四张）。两道新关都用游戏自己的训练器验证过能训出来。
- 只是一课的（锐化、纵向差分、位置编码），关照样留着，但不再做成元件。

## 11. 实例：《证明完毕》的章怎么排

`games/qed/DESIGN.md` 的第 3、4 节是这几条规则落到一个课程上的样子，这里只点出各条在哪里起作用。

- **练习，而不是一关一个定律。** 连接词一章每条规则后面跟一组按维度变化的练习，定律不当关卡的主题，而是练习里自然出现的目标。
- **墙在前，元件在后。** 反证法不在连接词一章发下来：玩家先搭出只用引入和消去规则的 auto，看它搜遍了也证不出排中律，再给核加上反证法（经典逻辑一章）。
- **放在被核心用到的地方。** 德摩根、双重否定在连接词一章就能证，但它们的用处是化简器把否定推进去，所以在化简器一章证出，最后一段任务马上当改写规则用；证明项在规则与元变量、策略、化简器几章都用不上，放在建在它上面的归纳类型、依赖类型之前。
- **不依赖的就分支。** 合一器造好以后，倒着用规则和高阶模式是两路；策略一章的组合子和回溯是两路，搜索和按形状拆又是两路。
- **基础元件最少。** 策略的原始元件只有用规则和已知里有，规则对已知、往前推、拆目标、用已知、auto 都是搭出来的；化简器的原始元件只有改写一处，化简是重复框、几条路和改写搭出来的。
- **专题挂在它要回答的问题后面。** 「机器做不到的事」（理发师到停机问题）只用量词规则和说谎者，但它回答的是自动化一章留下的问题（饱和器证不出时停不下来，有没有机器能判定一切），所以放在自动化最后；不完备性要用数，挂在数与列表一章，接在停机问题后面。
- **元件讲机制在前，填块写法在后。** 《证明完毕》前面的章都用元件接线（真值电路、证明板、机器板），把机制讲完；证明即程序、依赖类型与相等、结构化证明这三章换成写出来的证明（证明项、脚本），放在最后。反射要用证明项和定义相等，所以从自动化一章挪到依赖类型与相等，排在定义相等之后。
- **一个主题讲完再换。** 数和列表原来分在化简器（算）和归纳类型（声明、归纳）两章，现在是一章：证明板上手算 → 化简算 → 声明 → 证明板上手做归纳 → 机器上的归纳规则 → 不完备性。新机制先在证明板上手做一遍（两个框的归纳元件），机器上的规则才有前因。
- **不为一关造机器。** 证明即程序一章原来用化简搭一台「化简证明」，只在下一关用一次，又把玩家拉回机器板；现在弯路就在证明板上接出算下来的那一个，计算交给后面的定义相等。
- **检查要分清规则的性质。** 归纳不是一阶逻辑的推论，用它的证明关在反模型检查里会被误报「证不出」；检查只对一阶的证明做反模型搜索。

## 12. 笔记版：嵌在笔记里的交互

游戏从零搭一台逐层长大的机器；笔记版只做一件事：读者读完一段，马上在这一段讲的那个点上动手，看见它的核心思想。两者共用内核能力，内容各自编排（`games/DIRECTION.md` 决策十二）。第一门课是 COMP90086，逐个知识点的设计见 `games/comp90086/DESIGN.md`。 笔记里的图像电路从 `packages/comp90086/parts/` 取一维三点核和相加，计算共用图像模块的能力。

### 12.1 形状

- **一门课一款数据游戏，`game.json` 写 `mode: "notes"`。** 一章对应笔记的一讲，一关对应一个词条：关的 id 就是词条的锚点 id（`convolution`、`iou`），任务按需要。没有关卡树和解锁，所有关打开；元件属于各自选用的包（`packages/<包>/parts/`），需要共享就依赖库包，搭出的元件在笔记里是预制元件，跑它那一关的参考解，可以打开看里面。
- **检查只管内容对不对，不管编排。** 词汇表、参考解通过、naive 解失败、参数台的课成立、选择判定的 naive 判错、文案的链接照常；课程技术审计（托盘和关卡树等）是为一台逐层长大的机器写的，`mode: "notes"` 的游戏不跑它们。
- **嵌入。** 笔记里单独一行写 `<!-- task: <游戏>/<命名空间>/<关> -->`。它嵌入的是这款游戏自己的页面（`?embed&level=…&lang=…`，`kit/app/main.jsx` 交给 `kit/shell/EmbedShell.jsx`），放在 iframe 里，页面把自己的高度告诉笔记，所以笔记的样式和游戏互不干扰：Fieldnotes 在阅读器里换（`trace-viewer/src/lib/content.js`、`src/figures/task.js`），笔记站在构建时换（`hooks/ui.py`，游戏的发布地址是 `mkdocs.yml` 的 `extra.games`；`docs/javascripts/site.js` 按页面的语言填上地址、跟着高度）。主题跟着共用的存储键走。共用版面（`Workbench`、`PhonePage`、`Brief`）读 `kit/shell/embed.js` 的上下文，排成笔记里的一块：没有任务栏、标题、地图、存档切换、引言窗和通关窗口，上面那段正文就是引言，下面那段正文就是点题；只留任务的一句话、玩的地方（板定高）、结果区和运行键，一角一个「展开」去这款游戏的关卡页。游戏页和嵌入页共用 `progress`，按任务 id 记，也共用任务切换状态与作品继承。跳过可选任务会写进进度。一个任务过了，结果留在原地，下一个任务从任务条打开。
- **旧插图硬切换。** `trace-viewer/src/figures` 里的装置图是只演示、不检验的手写交互。一个词条做成笔记关时，笔记里的那张图换成它，注册表里没人用的图删掉，不并存。

### 12.2 给一个知识点选交互

拼电路只适合「由什么构成」。每个知识点按下面五步选，选的是读者动手的地方，不是画面的样子：

1. 一句话写出核心思想，尽量写成一个关系或一个不变式（「像高与深度成反比」）。
2. 找出读者该动的「因」：它定控件（拖、拨、点、单步、拼）。
3. 找出「果」最显眼的表示：它定视图（原图、放大窗、频谱、曲线、三维场景、特征空间）。
4. 找一个现实锚点：真实照片、真实设备的参数、真实模型的输出。
5. 先预测再揭晓：挑一个直觉会答错的情形，读者先答，再动手看。

**验收**：遮住正文只玩交互，读者说得出第 1 步那句话。说不出，换交互，不加说明文字。

### 12.3 交互原型

一个知识点只用一个主交互。原型是内核的元件（交互和判定），模块补注册的显示能力和模型，知识点只写数据：用哪个原型、哪张图、开哪个控件、先预测什么。

| 原型 | 读者动什么 → 看到什么 | 适合的核心思想 | 在内核里 |
|---|---|---|---|
| 仪器台 `bench` | 拨参数 → 实物和读数跟着变 | 连续的因果关系 | 已有：参数台（第 6.4 节），`check: 'submit'` 就是先预测 |
| 局部窗口 | 在真实图上移动一个窗口 → 旁边放大窗口里的数和算出的响应 | 局部运算在整图上的效果 | 待实现：随指针移动的窗口和旁边的放大计算。现有 `probe` 是第 6.5 节的黑箱探针 |
| 联动 `linked` | 改一个视图 → 另一个视图跟着变 | 表示之间的变换（频谱、潜空间、颜色空间） | 缺：两个视图共用一个可编辑的值；显示方式有 `spectrum`，没有在频谱上画掩码 |
| 场景 `scene` | 在图上或三维场景里拖点、线、相机 → 几何关系跟着变 | 投影和多视图几何 | 部分：参数台的 `drawn`、`list` 旋钮能在图上拖和点 |
| 回放 `replay` | 单步、拖时间轴、中途插手 → 过程一步步走 | 迭代、搜索和随机过程 | 部分：参数台的模型有状态和动作，能单步；缺可拖的时间轴 |
| 度量 `measure` | 在真实样例上拖框、拖阈值 → 指标实时算出 | 评价指标与判定 | 部分：`drawn` 旋钮能拖；缺真实照片上的框和阈值线 |
| 对照 `contrast` | 选出两个情形中哪个成立 → 并排看两者 | 歧义、不变性、概念边界 | 缺：选择判定（由数据算出哪个情形成立） |
| 追踪 `trace` | 点流水线的一段 → 那里的值和形状 | 网络和流水线里数据怎样流 | 缺：任意通道数的张量值（H×W×C） |
| 拼电路 `circuit` | 补一块、接两根、改一处 → 结果对上 | 由什么构成 | 已有：`CircuitLevel`，起始板（`starter`）；锁住的预置（第 4 节）由电路预置的锁定规则统一提供 |

### 12.4 现实锚点与检查

- **真实照片**：自己拍的或许可明确的公开图（数据集按其许可，出处写进百科）。笔记关跑领域的内置实现，不跑读者的电路，图可以比游戏的样张大；上限按实测定，不凭估计。
- **真实设备参数**：手机主摄、双目相机这类，写明是哪一类设备、数是量级还是规格书的值。
- **真实模型输出**：注意力图、CLIP 相似度、SAM 掩码、扩散的轨迹这类在浏览器里跑不动的，预先算好存成数据，只能在这组数据里选；交互不假装能接受任意输入。
- **每个交互都有一个检查**：判定由数据算出（参数台的目标、选择判定的判据、电路的测试），不由作者逐条写死；先预测的答案和读者交的答案按同一个判定走。只演示、没有检查的不算做完。先预测常常是这一关的第一个任务（选择判定），动手是第二个。
- **检查问的是要推理的东西**：答案要从核心思想推出来，最好是直觉会答错的情形（只许挪孔板时暗箱的像怎样放大一倍、拆不开的拉普拉斯能不能由一维核算出、两道波只差哪一个数）。看一眼就知道的事（图里有没有红箱子）、照着题面就能答的不算。
- **按笔记词条设计互动**：每个互动围绕所在词条的核心思想设计。
- **布局自己说话**：交互里只有一句先预测的问题，不加标题和说明；它是什么、在讲什么，由上下文的正文说。

### 上线前的版本与发布

包与平台的版本统一为 `0.0.0`，包、游戏和起步内容中的依赖范围统一为 `^0.0.0`。工作区源目录是当前实现的唯一版本。解析器检查依赖集合和范围，源目录及本地平台的锁定哈希变化不阻止检查、组装或构建。从发布库解析的归档继续检查锁定的版本与内容哈希，归档本身继续校验归档哈希。`deps -- lock` 显式刷新锁定快照。

`publish` 默认拒绝执行，首发时显式使用 `npm run publish -- <包|kernel> --launch`。这个开关启用已有的检查、契约验证和发布流程，第一次发布自动选择 `1.0.0`。兼容性预览继续返回改动级别、受影响的包和游戏及候选版本 `proposed`，`next` 为 `null`，预览不写版本。

### Step 7 package boundary

`rows` owns addition work parsing, judging and tree presentation. `tick-bus` owns line arbitration,
the two-phase tick runner, tick reports, textual tick play and bus cards. Both depend directly on
`circuit` at `^0.0.0`; no installed game or other content package currently consumes either mechanism.
The package examples retain their local object/task ids and use `play: rows:equation` or `tick-bus:board`.
The copied examples have no package course. Remaining native templates migrate with their mechanisms.

Task field declarations may specify `play` with `extends: task`. These fields extend only that play's
generic task branch; required fields remain required. Unscoped extensions still apply to every task and
reject redefinitions. This lets a native task and a package task use different schemas for a field such as
`rows`. Display discovery resolves each package independently, rather than combining unrelated schemas.
Node's package preload installs the same public dependency map used by content loading.


### Step 8 image package boundary

`image` 直接依赖 `circuit`，提供图像运算、接线图、探针、参数台、判定、盲玩和配对的显示入口。
`vision-complete` 保存专用场景、实验台和显示项；两包共用的 filter 场景、obscura/wave 模型和暗箱显示项留在 `image`。
`vision-complete` 与 `comp90086` 各自声明 `<包>/power`、`<包>/box`，对象目录也以包名区分。
两个内容包及对应游戏都直接选用 `image`，版本保持 `0.0.0`。
参数台显示项使用 `image:display-*`。包显示定义接收组装后的插件注册表，按同一套显示登记渲染版面。
图像任务使用 `play`；核心作品仍共用同一份读写和运行实现。Studio 的专用编辑器适配由其负责人继续处理。


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
