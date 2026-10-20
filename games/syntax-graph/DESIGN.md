# 句法之图 Syntax Graph · 设计

这份文档只讲本专题的内容。共同的结构、规则和自动检查见 [`games/DESIGN.md`](../DESIGN.md)；引擎在 `games/kit/domains/syntax`。

## 1. 终点与定位

**终点**：学完能亲手写出正确、准确、精简的英语句子和段落，达到学术与商务写作的水平；后期关卡要难到母语者也能从中学到东西。

**定位**：这个游戏练的是**句法结构**和**写作表达**，不是词汇量、听力或口语。语言能力的主体靠大量输入习得，这个游戏不替代它，只负责那部分可以形式化、可以确定性验证的能力：

- 一句话能不能成立（语法：类别、一致、格、框架）；
- 它说的是不是要说的意思（语义：谓词、角色、时与体）；
- 在意思不变的前提下，它是不是更好（代价：词数，以后还有歧义数、信息流）。

## 2. 核心机制

**关卡给语义，玩家写句子。** 对应《图灵完备》的"给真值表，搭电路"：

| 《图灵完备》 | 句法之图 |
|---|---|
| 真值表 / 测试 | 语义图：谓词、参与者及其角色、时与体 |
| 元件 | 词：名词短语、动词、小句的头（INFL） |
| 连线的位宽 | 口的类别和特征：主语口只收主格名词短语，并要和 INFL 一致 |
| 电路输出 | 句子卡片念出的整句 |
| 门数 / 延迟 | 词数（★ 目标），以后还有歧义解析数 |

**两层检查，各管一件事：**

1. **语法在接线时检查**（`engine/grammar.js` 的 `refuse`）：接错的线接不上，并说明是哪条规则——类别、一个短语只占一个位置、格、主谓一致。
2. **语义在运行时检查**（`engine/sentence.js` 的 `check`）：句子能成立以后，把它读回语义，与语义图逐项比对。不对的地方标红，并写出句子实际说成了什么。

所以玩家永远搭不出不合语法的句子，但很容易搭出合语法、意思却不对的句子——这正是第一关就要让人看到的：接得上，不等于意思对。

**代词通过上下文指称。** 代词本身不指任何东西；关卡的 `refer` 写明在这一关的语境里 *she*、*them* 指谁。这是对"前文已提及"的诚实建模，而不是把 *she* 硬编码成某个人。

## 3. 分层：引擎与内容

这个游戏的目录里**只有规格**（见 `games/DESIGN.md` 第 6 节）：

```
games/syntax-graph/
  spec.js          课程：时代、关卡、词库、百科，交给 syntaxCourse
  game.js          交给领域，三行（defineSyntaxGame）
  lexicon.js       词：名词短语、动词（框架、各形式）、INFL（助动词、要求的动词形式、一致）
  levels/clause.js 第一章的关卡规格
  glossary.js      百科
```

引擎在 `games/kit/domains/syntax`，对任何语法游戏都一样：

```
engine/grammar.js   类别、框架、角色、一致、格：接线规则
engine/lexicon.js   读入一个游戏的词库
engine/sentence.js  板子 → 小句树 → 句子与语义 → 与语义图比对
engine/parts.js     元件在共享电路编辑器（kit/circuit）里的描述
engine/course.js    规格 → 关卡、游玩顺序、课程审计（syntaxCourse）
ui/                 关卡页（桌面画布、手机格子）、语义图、句子、地图插图
game.jsx            defineSyntaxGame：规格 → 外壳要的游戏描述
art.js              游戏列表卡片上的插图
validate.js         npm run check：每关的参考答案和陷阱
syntax.test.js      npm test：接线规则、读句子、语义比对
```

关卡交互完全来自共享电路编辑器（`kit/circuit`：桌面 `CanvasEditor`，手机 `SlotBoard` + `useSlotEditing`），和《视觉完备》《状态之图》是同一套。为本专题对 kit 做的升级：桌面画布拒绝一根线时，会在板子上说出原因（手机上原本就有）。

## 4. 一关怎么写

```js
{
  id, title, brief, intro?, hint?,
  meaning: { pred, tense, aspect, gloss, roles: { AGENT: { ent, number, label, note? }, … } },
  palette: { np: [...], verb: [...], infl: [...] },   // 只列这一关的词，包括干扰项
  preset?: { infl, verb, … },                          // 已经在板子上、拿不掉的部分
  refer?: { she: 'reviewer', … },                      // 代词在本关语境里指谁
  target?: 8,                                          // ★ 的词数上限
  answer: { infl, subj, verb, OBJ?, IOBJ?, TO? },      // 参考答案
  traps: [{ answer, fails: 'wire' | 'pred' | 'time' | 'role' | 'star' }],
  debrief: { title, body, note },
}
```

**陷阱是规格的一部分。** 每一关都要写出玩家最可能试的错句，并写明它应该在哪一层被拦下。`npm run check -- syntax-graph` 会跑参考答案（必须通过、拿到 ★）和每个陷阱（必须在写明的那一层失败）。这条检查保证干扰项真的在起作用：比如 1-3 的 `-s + the committees` 必须在接线时就被拒绝，`-ed` 必须在时间上被判错。

**一关一个新想法**（`npm run check` 里的课程审计）：概念按语法划分——名词短语、代词（带格）、每种动词框架、每种体。同一种体的各个时态和一致形式算同一个概念的不同型号。

## 5. 第一章：小句

机体是**小句**：一个主语、一个动词、动词框架要求的宾语、一个定下时间并要求一致的头。

| 关 | 新想法 | 句子 |
|---|---|---|
| 1-1 主语 | 名词短语 | The proposal failed. |
| 1-2 谓语 | 不及物动词 | The chair resigned. |
| 1-3 时与一致 | 一般体的头（-s / ∅ / -ed / will） | The committees meet. |
| 1-4 宾语 | 及物框架 | The committee approved the budget. |
| 1-5 完成体 | 完成体 | The committee has approved the budget. |
| 1-6 格 | 代词 | She reviewed them. |
| 1-7 进行体 | 进行体 | The auditors were reviewing the claims. |
| 1-8 三个口 | 双宾框架（V NP NP / V NP to NP） | The firm will send the client the invoice. ★≤8 |
| 1-9 过去的过去 | 练习 | The auditors had rejected the claim. |
| 1-10 寄给谁 | 练习 | We have sent them the invoices. ★≤6 |
| 专题·催款 S1–S3 | 挂在 1-8 之后 | 收到发票 → 发提醒 → 最后通知 |

1-1、1-2 用 `preset` 把还没教的部分（INFL、动词）先放在板子上，这样第一关只有一个新想法。

## 6. 以后的章节（未做）

| 章 | 机体 | 新机制 | 封装件（玩家搭出后解锁） |
|---|---|---|---|
| 2 部件 | 复句 | 从句（that / who / which）、非谓语、被动 | 定语从句、宾语从句：玩家先用小句搭出，再作为一个元件接到名词短语上 |
| 3 信息流 | 段落里的一句 | 已知在前、新信息在后，尾重，分裂句；语义图标出哪些是已知信息 | 主题化、外置 |
| 4 段落 | 多句 | 衔接、指代、逻辑连接；语义图跨句 | 连接件 |
| 5 语域 | 学术 / 商务 | 名词化；hedging（语义图标出断言强度，用 may / suggest / arguably 精确匹配） | — |
| 6 母语者关卡 | 无歧义的句子 | 验证器枚举全部合法解析，有歧义即失败；悬垂修饰语、平行结构、极限精简 | — |

**诚实的限制：**

- 词库是封闭的。这是解谜，不是自由写作；练出的是结构能力，用词的丰富度要靠别的途径。
- 修辞上的"好"超出可量化指标，只能用词数、歧义数这类代价间接体现。
- 第 6 章的"唯一解析"取决于文法的覆盖度：文法漏掉的歧义，验证器也查不出来。那一章的文法要投入最多。
- 显性的语法知识向流利使用的迁移有限。这个游戏能让人写对、写准长难句，但不是学英语的主力工具。
