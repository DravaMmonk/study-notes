# games/ 修改计划（依据内核与领域审查）

目标：把 DIRECTION §2「领域仍是真实成本」降下来，并在开放（决策七、八）之前补齐内容安全、迁移正确性和修改日志完整性。

## 约定

- 每个编号条目一次 commit，直接合入 main；条目内硬切换，不留旧路径、兼容层或死代码。
- 原型关卡不重做。本计划只对 game.json 做机械改动（补 id、改形状、填 expected），不改关卡设计。
- 内核测试一律用合成的最小领域与内容，不引用任何真实游戏的关、任务 id 或数量。
- 涉及 studio 与外壳的 UI 改动：不加次要标签和说明文字，让布局本身表达结构。
- 每条给出验收标准；未达标不算完成。

---

## 阶段 0　止血（独立小改，先做）

### 0.1 领域小语言解析失败改为报告

- 新增「解析型」schema 类型契约，照 `S.board` 的做法：在 spec 阶段解析，解析器返回 `{value}` 或 `{error: {at, message}}`；解析器抛异常视为领域 bug，不由内核兜住。
- logic 的公式、qed 的证明脚本、`define` 的 `lhs` / `when` 全部改用该类型；解析结果随 spec 缓存，运行时不再二次解析。
- `check.js`：逐游戏检查，一款失败不中断其余，最终以非零码退出。
- `changeset.js:114`：`checkGame` 移进 `try`，任何失败都在 `finally` 中执行 `ws.restore(start)`。
- 验收：合成领域里把公式字段写成 `)))not a formula`，`checkGame` 报出文件与字段路径而不抛出；changeset 失败后工作区与起点逐字节一致。

### 0.2 首页进度键

- `shell/progress.js` 导出 `key(id)`；`games.js`、`scaffold.js` 改为调用它，仓库中不再出现字面量 `.v1` / `.v2` 进度键。
- 验收：通一关后首页进度非 0；grep 无字面量进度键。

### 0.3 state-graph 同义反复的测试

- table 领域的关级 `tests` 改为必须带显式 `expected`；删除 `table/course.js:173` 用参考解生成 expected 的逻辑。
- 为 change / prefix / robber / twoorders 四关逐条填写 expected（人工核对，不从参考解导出）。
- 验收：把任一关 tests 改成 `[{R:'x'}]`，check 报 FAIL。

### 0.4 残留清理

- 删除 `app/vite.js:13` 的 `legacyEntry`。
- 修正 `course.js:2-4` 头注释：搭出的元件运行玩家自己的电路。
- 删除 `shell/index.js:36` 对不存在的 `progress.legacy()` 的描述。
- 删除 logic 的 `level.maxSize` 死钩子。
- `i18n.js` 导出 `T`，删除各领域的约 100 处本地定义。

---

## 阶段 1　迁移正确性

### 1.1 任务一律带 id

- 内核任务 schema 要求 `id`（关内唯一）；不再有位置键 `<level>#<k>`。
- 一次性脚本为 logic / image / table / agent / can / syntax / qed 的无 id 任务补 id，同时在各游戏 `saves` 写一步 `retask`（位置键 → id），已有存档无损迁过来。
- studio 通用列表控件对 tasks 改发 `task.add / task.remove / task.move / task.set`（按 id），换序不再产生迁移。
- 验收：合成内容中交换两个任务顺序，迁移为空；删除一个任务，只 drop 该任务的板。

### 1.2 先修与解锁迁移改由前后内容推导

- `migrate.js` 不再按 op 类型分支：对每个 op 比较组装前后的课程布局，统一推导 `solve`。`game.set path=eras`、`level.move`、`builds` / `unlocks` 跨关移动都走同一条路。
- 修 `scaffold/circuit/vocabulary.js:57-67`：`eras` 用 `S.level()`，使 `level.rename` 能跟到 game.json 的 eras。
- 验收：同一重排分别用 `game.set eras` 和 `level.move` 完成，产出的迁移相同；把一个元件的 `builds` 从 A 挪到 B，产出对应 `solve`；rename 后 eras 中无旧名。

### 1.3 失效（stale）改为内核默认

- 词汇表字段标注所属 section；内核默认比较每个关/任务中 section 为 tests / puzzle 的字段，有变化即 drop 该键的板。领域只能把判定收窄，不能退回缺省不迁。
- logic / syntax / vision 现有实现中与默认等价的部分删除。
- `parts.set` 改元件端口或设置时产出新迁移步 `part.changed`，加载存档时 drop 含该元件的板。
- 验收：在 can / agent / image / table / net 的合成等价内容上改测试、端口、预设板，旧板均被 drop；改元件端口只 drop 用到它的板。

### 1.4 删除 `save.retype`

- 删除 `operations.js:75` 这条无内容变更、`inverse: []` 的手写后门。确有需要的场景由 1.2 / 1.3 的推导覆盖。

---

## 阶段 2　电路领域底座

这一阶段决定阶段 6.5 重做六款游戏的成本。

### 2.1 统一关卡形状，组装后内容不可变

- 只保留一种形状：`level.tasks[]`，每项带 id；`S.by('kind'|'mode')` 的判别下放到任务；table 的 `stages` 改为任务，存档 `{stage, boards}` 通过 `retask` 迁到标准按任务键存。
- `course.js` 的 `layout()` 产出独立的派生结构，不再写回 `L.ch`、`L.intro`；check 与 dev 模式下对组装后的 content 做深冻结。ops / studio 中为此每次重新 `ws.content()` 的规避代码随之删除。
- 验收：内核中只有一种关卡遍历；对冻结内容的任何写入在测试中直接报错。

### 2.2 内核电路底座

位置：内核新增电路领域模块，API：

- `boardOf({FIXED, portsIn, portsOut})` → `fixedOf / startBoard / fits / fromText / toText / wiring`。文本读写直接复用 `circuit/text.js` 的 `read()`，保留其严格检查（一口一线、端口重名），并吸收 net 的修正（portsIn / portsOut）。
- `courseOf(content, {isPart})` → `defineCourse` 的全部钩子；领域只提供「什么算元件」这一个判定。
- `checkCircuitTasks({spec, run})`：参考解通过、空板不通过（含隐藏测试）、naive 不通过（复用 `contract.js` 的 `naiveInPlace`）、封装件单独通过；全部测试取自 `tests.js` 的 `withHidden`。
- 跑测形状统一为 `engine/tests.js` 的 `runLevel`；电路领域的 `run.js` 只导出单例运行函数。image、logic 一并对齐。
- 词汇表公共字段（ERA / ITEM / AFTER / GAME / ONCE / TASK）由内核从课程布局定义导出，领域直接引用。
- 玩家搭出的板由 `spec(content)` 闭包持有，取消模块级 `const OWN = new Map()`。
- 验收：合成电路领域的单元测试覆盖上述全部函数；同一领域的两份 spec 在同一进程中互不影响。

### 2.3 五个领域切到底座

- tick-bus / circuit / net / can / vision 硬切到 2.2；各自的 board.js、validate.js、course.js 中被底座覆盖的部分全部删除，领域只剩 `run.js`、结果区与文案。
- 两个脚手架模板合并为一个，建在底座上。
- 验收：用重复度脚本（同审查口径，提交到仓库）复测，跨 ≥3 个文件逐字重复的比例在各类文件均降到 10% 以下；脚手架生成的新领域中，非 `run.js` / 结果区 / 文案的代码不超过 50 行。五款游戏 check 全过、存档可读。

---

## 阶段 3　开放前的硬要求

### 3.1 富文本白名单

- schema 的 text 类型在 check 时解析标记，只允许 `<b> <i> <code> <strong>` 与现有三种 `-ref`，属性同样按白名单；其他一律报错。
- 内核新增共享富文本组件，把解析结果渲染成 React 元素；删除 `Layout.jsx:17`、`Dialogs.jsx`、`Encyclopedia.jsx:69`、`IntroSheet.jsx:41` 的 `dangerouslySetInnerHTML`，以及各 game.jsx 的 `html: true` 开关。
- image 的 `figure` 改为引用领域清单中注册的图（封闭集合），不再是指向 trace-viewer 源码的路径字符串。
- `widget: custom` 的 params 由组件声明 schema，组件只收到 params，不再拿到整个 node。
- 验收：brief 中写入 `<script>` 或 `onerror=`，check 报错；外壳源码中无 `dangerouslySetInnerHTML`。

### 3.2 引用与文案字段由 schema 驱动

- 新增 `S.ref(kind)`，check 时验证目标存在；替换 logic 的 `PART`（`adds`）、table 的 `unlock` / `fold`、glossary 的 `see` / `group`。
- `checks.js:95` 的「词条只在已开放处链接」改为遍历 schema 中所有 text 类型字段，删除写死的字段名表。
- `ops/tools.js:144` 的摘要字段、`PartsBook.jsx:133` 的筛选维度改由词汇表声明。
- 验收：合成领域用新字段名写文案，链接检查照样生效；`adds: ['nonexistent']` 在 schema 阶段报错。

### 3.3 parts.json 表达式

- `if` 改为惰性求值（求值器特例，不增加节点类型），`if(eq(b,0), a, over(a,b))` 在 b=0 时不再除零。
- 内置函数声明参数类型，check 阶段按 `in` / `set` 的已知类型做静态检查。
- 验收：`round(<图像>)` 在 check 阶段报错；上述 `if` 用例通过。

### 3.4 词汇表版本

- 新增 `describe(vocabulary)`，输出规范化快照；每个领域按版本存快照。
- 测试：当前版本快照与 `describe()` 一致；第 N+1 版快照是第 N 版的超集（只增不删）；内容声明的版本必须是已有快照版本，且 ≥1。
- 现有历史版本无法可靠重建，基线重置（见待定决策 1）。

### 3.5 修改日志完整性

- 日志条目记录每个文件的 before / after 哈希。
- `write()` 写前核对盘上哈希与 openGame 时一致，不一致即冲突、不写。
- studio 的 modify 必须带 base（seq + 哈希），日志头不等于 base 即拒绝。
- 日志追加加跨进程文件锁，seq 在锁内分配。
- undo 前核对各文件当前哈希等于该条 after，否则拒绝。
- check 报告文件与日志头不一致（手改）；新增 `adopt`，把手改作为一条记录收进日志。
- 8 款游戏各写一条基线记录（见待定决策 2）。
- 验收：两个进程并发 modify，后者被拒；手改文件后 undo 被拒、check 报漂移。

### 3.6 课程审计规则归位

- `carry-unseen`、`topic-finale` 在内核 `audit()` 中实现，删除 net / table 各自的实现。
- 验收：内核 `RULE_TEXT` 中每条规则都有内核实现与合成用例。

---

## 阶段 4　运行时加载内容

在决定阶段 7 的发布形态之前完成。

- 构建只打包领域代码；`app/vite.js` 的 gameModule 不再在模块顶层 import game.json。
- 外壳运行时取回组装好的 content，经 spec 校验后调用 `defineGame`。
- 验收：生产构建下改 game.json 并刷新即生效，无需重建；校验失败时外壳显示报告而非白屏。

---

## 待定决策

1. **词汇表基线**：建议所有领域当前词汇表记为第 1 版，所有内容声明 1（syntax-graph 现写 1、领域写 2，统一归 1）。替代方案是从 git 历史重建第 1 版，但无法证明重建结果就是当时的词汇表。
2. **network 的 changes.jsonl**：#15 与现有 game.json 已脱节。建议废弃现有日志，与其余 7 款一起从基线开始。
3. **table 的 stages 转任务**（2.1）：机械可行，但会改变该游戏的关内流程呈现，需确认可以接受。

## 顺序与依赖

阶段 0 → 1 → 2 → 3 → 4。阶段内依赖：1.1 先于 1.3；2.1 先于 2.2；3.2 的 `S.ref` 可提前到阶段 2 之前，不影响其他条目。
