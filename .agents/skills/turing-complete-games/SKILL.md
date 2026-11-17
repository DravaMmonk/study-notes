---
name: turing-complete-games
description: Design, extend or review the learning games in study-notes (games/ and packages/, built on games/kit) — curricula, chapters, levels, parts, stages, and component-wiring interaction.
---

# 类图灵完备学习游戏

## 范围与依据

用于 `games/` 的游戏、`packages/` 的内容与机制，以及共享内核。

工作前阅读相关内容。

1. `games/DESIGN.md` 是当前架构的唯一手册。第 1、2、4 节讲课程和任务，第 5 节讲检查与开发规范，第 6 节讲实现，第 7 节讲作者流程。
2. `games/DIRECTION.md`、`games/PLAN.md` 记录方向与待办。
3. 对应游戏的 `DESIGN.md`、`CURRICULUM.md` 记录专题选择。
4. 相关包与游戏数据、`vocabulary` 工具。选操作前读 `npm run op -- list`。

实现变化同步写回手册和受影响的游戏设计。保留无关修改，遵守用户指定的工作边界。

## 三层与插件

- 内核负责内容系统、操作集、检查框架、Studio 外壳，以及地图、任务、检验、通关、解锁和存档流程。
- 包提供机制与内容，可带 `core/index.js` 和 `view/index.jsx`，两边均导出 `register(kernel)`。游戏只用数据选包、编排章、路线图、文案与允许的覆盖。
- 新玩法放进包。只供一个包使用的实现留在该包，第二个包需要时再提到被依赖的包。
- 核心登记 `play`、`kind`、`state`、`check`、`agent`、对象与标签读者；视图登记配对 `play`、`editor`、`display`。作品格式由核心定义。
- 检查、基线、文字试玩只加载核心；游戏与 Studio 按 `uses` 拓扑加载两边。
- 公开导入为 `kernel`、`kernel/view`、直接依赖的 `<包>`、`<包>/view`。核心只读本核心与无界面导出；视图可读本核心。包内部路径、传递依赖、计算导入、核心中的 JSX/CSS/界面库与 Node I/O 均由边界检查拒绝。
- 判定确定，随机使用传入种子。数据经操作集修改，代码经提交与审查修改。
- 专用 Studio 编辑器由包的视图登记。内核保留三工作区、三栏、辅助抽屉、通用 schema/JSON 编辑、文案、编排、覆盖审计和日志。

协议与当前包职责见 [references/package-plugins.md](references/package-plugins.md) 和手册第 6.3.1、6.5、6.7 节。

## 内容与对象

- `engine/resolver.js:resolveLayers` 是已安装内容的唯一加载入口。内容根、`GAMES_ROOT`、源目录、代码入口、归档位置归解析器。游戏、构建和编排只读解析后的公开数据。
- `package.json` 声明版本、`kernel` 范围和直接 `uses` 范围表。引用只授权本包与直接依赖。游戏 `game.json.packages` 选全依赖闭包，第一项是主包；加载按拓扑，游戏最后。
- 一个对象一个文件。关卡在 `levels/`，词条在 `entries/`，关系在 `relations/`，百科分组在 `sections/`；其余目录由类型声明。文件名给 id，任务、阶段和菜单保留内部 id。
- 对象全名为 `<包>/<名>`，游戏命名空间为 `@<游戏>`，标签引用为 `#<全名>`。本包短引用在组装时限定全名。
- `kinds/<名>.json` 用数据声明对象结构、目录、关系端点、文案和 Studio 元数据。含义由代码 `kind` 登记。字段扩展使用 `extends: level|task`，任务可用 `play` 限定 schema 分支；共用字段与判别树展开后仍保持必填和防重定义约束。
- 所有类型声明 `declares: package|game` 与 `overrides: { package?: [字段路径], game?: [字段路径] }`。`*` 允许全部字段，`$text` 允许文案。包可声明游戏层类型，同一注册表与 `layerProblems` 处理两层。
- 关卡、任务、标签、关系、词条、百科分组和包类型在包层声明。章和游戏配置在游戏层声明。游戏覆盖按声明权限执行，通常为文案与 `requires.edges`。
- 章在 `games/<游戏>/chapters/<名>.json`，全名 `@<游戏>/<名>`，保存具体 `levels: list<level>` 与路线图 `rows`。游戏配置的 `chapters: list<chapter>` 给章序，`encyclopedia: list<section>` 给百科分组顺序。导入标签一次性展开。
- 包逐关独立检查与试玩。包没有课程、章、解锁图或学习进度。电路单关试玩使用自身托盘，省略时提供全部可发放对象与阶段。

## 集合、标签与覆盖

- 字段 schema 决定集合语义。`set<T>` 无序且不重复，`list<T>` 有序且不重复，`edges<T>` 为无环有向边。合并、引用、来源与编辑共用 `engine/collections.js`。
- `set`、`edges` 覆盖用 `{ add, remove }`；`list` 另支持 `{ insert: [{ before|after, values }] }`。数组整份替换，省略的字段保留。嵌套对象列表按 `id`，边按端点和 `game` 定位。
- 标签身份是成员类型加全名，存于 `tags/<成员类型>/<名>.json`。包类型目录使用全类型名，例如 `tags/logic/symbol/`。注册表用 `tagKey(member, name)` 读取。
- 标签用于分组、批量引用和代码读者标记。托盘、百科分组与章用自己的有序列表。Studio 分组成员由 `orderedMembers(content, ids, kind)` 按先修与名字排列。
- 覆盖位于当前层的 `overrides/<命名空间>/`，沿被覆盖对象的原目录。文案覆盖用 `i18n/<lang>.json`。集合增量可独立贡献，替换和普通字段覆盖要求依赖顺序。
- 成员来源在 `sources[kind][identity].collections[fieldPath][memberKey]`，值为贡献层列表。标签用复合键，边键序列化 `[from,to,game|null]`，覆盖历史保留。
- 内核登记 `kernel/studio-left`，成员类型 `kind`，各包向它贡献默认资源类型。`kernel` 保留。个人显示选择存在浏览器。
- 任何外部目标都须有声明或代码登记。统一存在性检查收集 schema 引用、覆盖目标、集合补丁、标签、关系、发放引用和依赖选择，对照 manifest 公开面与登记表。保持问题的 `rule/layer/kind/target/member?/reason/at/says/object/path`。Studio 使用结构化位置。

## 新建与修改

- 新对象复制本包或依赖的任意对象，或从 schema 起步；最小任务内容由玩法核心提供。精选起点用普通标签组织。
- 新包用 `npm run new-package -- <id> --from <包>` 或 `--empty`。新游戏用 `npm run new-game -- <id> --from <游戏>` 或 `create_game`，再通过选包与章操作编排。
- id 创建后保持不变，包含任务、阶段与章。显示名称通过文案修改；新身份通过明确新增与删除表达。移动任务保持 id。
- 可翻译字段用稳定 `@键`，本层语言表为 `i18n/<lang>.json`。用 `text.set` 与对象字段路径修改，标签键用 `@tag.<名>.title/desc`。
- 内容修改用 CLI、MCP `modify` 或 Studio 的变更集 `{ "why": "...", "ops": [...] }`，先预览、校验再写入。批量迁移可用临时脚本，随后对每个受影响目标执行 `adopt --why`，脚本不保留。

## 发放与电路

- `circuit` 持有发放、阶段、托盘、工坊、电路求值、蓝图、元件编辑器与课程派生状态。内核进度只推进任务和关卡。
- `grants.register({ type, used })` 登记可发放类型与作品读者。元件为 `circuit/part`，符号为 `logic/symbol`，各自登记。发放字段和托盘可混合对象全名，同名跨类型报歧义。
- `course.state(at, flags)` 按类型返回状态。`adds` 带来对象，`local` 限在引入处，`opens` 在任务开始开放阶段，`awards` 在通过后开放，`gives/withholds` 只调整当前任务。工坊与 `replaces` 归元件。
- 对象本身是第一阶段，`stages` 列后续线性升级。元件在 `parts/` 选包登记的 `op` 并收窄设置；设置内联，表达式用于交互、约束与读数。
- 封装元件以 `inside` 保存参考作品和 variant，任务用 `publishes` 发布实际通过的玩家作品，`awards` 决定阶段。选择与依赖闭包保持一致。
- 桌面和手机编辑器在 `packages/circuit/view/board/`，共用图、接线拒绝、区域和保存检查。框由 `framePart(own, regions)` 定义，区域按 `key` 求值。修改共用编辑器时检查实际消费者。

## 关卡与文案

按手册第 5.1 节评审。

- 从真实问题与已有知识引入能力，按实际认知负担拆任务。
- 新能力在引入任务中发挥作用，并在后续任务或封装作品中使用；调整引入位置时保留课程动机。
- 首次体验通过中间状态、对照或失败展示抽象机制。说明写进设计文档。
- 重复结构考虑抽象，结合终局任务的独立价值判断复用。
- 实际查看松散元件、手机操作与任务负担，按需要拆分或形成中间作品。
- 文案交代情境、条件、目标与必要术语。通关文字解释原理与适用范围，多解任务保持措辞适用于不同解法。
- 中文和英文分别自然准确；跨手机与桌面共享文案用控件名定位。
- 检查证明技术性质，教学判断结合内容与试玩证据。复杂课程可参照 [references/learning-review.md](references/learning-review.md)。

## 界面与验证

- 改界面前读手册第 6.9 节，地图读第 2.6 节。保持紧凑布局，必要信息只说一次，手机先保证可操作。
- 外壳共用任务导航、运行栏、结果和通关流程。包提供主区，基础控件与已有包组件通过公开接口复用。
- 任务内最后一次运行保存在内存，按任务和存档切换恢复；离关清除。兼容旧版 iOS Safari。
- 按第 7.0 节选择验证范围。纯文档检查 diff 和引用；界面或交互变化检查桌面与手机实际流程。
- 内核测试用测试现写的小内容，机制组合显式安装夹具；真实包与游戏分别 `check`。带代码的包提供核心、视图配对与跨包契约。
- 内核改动运行 `npm test`、`npm run lint:kit`、`npm run words -- --check`。零内容验收运行 `npm run test:zero`，首次先 `npx playwright install chromium`。命令均在 `trace-viewer/`。
- 行为迁移运行 `npm run baseline -- compare`，保留锁定语料。报告检查范围、结果和未验证项。
- 上线前版本保持 `0.0.0`，范围 `^0.0.0`。源目录哈希漂移允许继续工作，归档保持严格校验。`deps -- lock` 刷新快照，`deps -- upgrade` 显式升级。
- 首发须明确执行 `publish -- <包|kernel> --launch`，自动定为 `1.0.0`。版本随后由公开面与依赖方检查观察计算，平台行为探测待补。`releases/` 排除在 Git 外。
- 可选流水线保留 `domain` 步骤名，由工程师实现包机制需求。教学闸门与内核技术检查分别按各自职责使用。
