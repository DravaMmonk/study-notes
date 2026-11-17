# 包插件

当前协议以 `games/DESIGN.md` 第 6.3、6.3.1 节为准。

## 入口与登记

| 入口 | 登记 |
|---|---|
| `core/index.js` | `play`、`kind`、`state`、`check`、`agent`、`object`、`tag` |
| `view/index.jsx` | 配对 `play`、`editor`、`display` |

两边导出 `register(kernel)`，按直接 `uses` 的拓扑顺序加载。检查、基线与文字试玩只加载核心；游戏和 Studio 加载两边。玩法核心提供 `initial/read/write/normalize/run/judge`，视图提供 `component/preview/modes`。视图组件接收 `task/work/onChange/state/context/phone`。

公开导入为 `kernel`、`kernel/view`、`<包>`、`<包>/view`。核心仅访问无界面接口与本核心，视图可访问本核心。包不能访问依赖的内部文件或传递依赖。核心的 import、re-export、动态导入、require 由同一 AST 规则检查。判定保持确定性。

## 数据与含义

`kinds/<名>.json` 声明 `folder/schema/declares/overrides/references/relations/text/studio`。结构、字段扩展、层权限属于数据，含义通过 `kind` 登记。

字段扩展用 `extends: level|task`。任务可用 `play` 限定分支，也可提供共用 `fields` 与 `schema` 判别树。展开到各分支后检查重复与必填字段。

标签使用 `tagKey(member, fullName)`，注册表与来源表均使用相同复合键。代码读者登记本包标签及成员类型，内核登记 `kernel/studio-left` 的 `kind` 集合。贡献沿 `overrides/<命名空间>/tags/<成员类型>/` 写入。所有外部目标须由声明或代码登记提供，统一存在性检查报告。

`set/list/edges` 按字段 schema 合并、检查并记录来源。`list` 拖动写数组，外部贡献可用增删与定位插入补丁。章和游戏配置使用同一注册表，章序、关序与百科顺序分别存于自己的列表。

## 含义钩子

- 内容生命周期包括 `vocabulary/names/identities/indexes/matches/assemble/source/override/validate/stamp`。`derived` 列出派生字段，序列化只写声明。
- 课程含义提供 `dependencies/plan/supplies/readWorks/taskModule/runtimeIds/scope`。内核推进任务与关卡，包派生可用状态、读取作品并判定。
- 作者适配提供 `workspace/operations/selector/textTarget/sourceArguments/search/tools/dependencyGraph/renderWork`。操作集按类型 CRUD，包扩展自己的操作与工具。
- 外壳扩展通过 `shell/settings/mapBadges/referenceName/describeObservation/composeModules` 提供。元件册、工坊、奖励与电路设置由 `circuit` 持有。
- 基线观察通过 `baselineCourse/baselineStructure/baselineRecords/baselineReports` 提供。平台保留通用快照和差异算法。

## Studio

包的 `view/register` 用 `editor` 提供对象类型的分组、编辑器与独立预览；玩法视图提供关卡预览与编辑模式。内核维护工作区、三栏、辅助抽屉、通用 schema/JSON 编辑、章、路线图、文案、覆盖审计和日志。列表默认类型来自合成后的 `kernel/studio-left`，个人选择存在浏览器。

`circuit/view` 提供元件、托盘和阶段链，`logic/view` 提供符号编辑器并复用阶段链。文案定位和对象路径依 schema、声明目录与全名处理。

## 检查与发布

`resolveLayers` 是内容的唯一加载入口。`GAMES_ROOT` 指定独立内容工作区。公开身份由 manifest 与代码登记提供，问题保留 `object`、`path` 等结构化位置。

包契约在 Node 检查核心、观察和动作，通过 Vite 检查视图配对及跨包组装。内核使用小夹具，真实内容各自独立 `check`。`npm run test:zero` 检查空内容、空 Studio 与最小文字游戏；首次安装 Chromium。

迁移对比用 `baseline -- compare`。上线前版本为 `0.0.0`，范围为 `^0.0.0`。源目录锁定允许哈希变化，归档严格校验。发布须显式 `--launch`，版本由工具计算。发布格式与边界见手册第 6.1.1 节。
