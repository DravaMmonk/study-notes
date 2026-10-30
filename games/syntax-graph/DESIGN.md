# 句法之图 Syntax Graph · 设计

这份文档只讲本专题的内容。共同的结构、规则和自动检查见 [`games/DESIGN.md`](../DESIGN.md)；引擎在 `games/kit/domains/syntax`。

## 1. 终点与定位

**终点**：拿到一篇计算机论文里的任何长句，能拆出它的主干，说清每个修饰成分挂在哪个词上；后期的句子要难到母语读者也得读两遍。

**定位**：这个游戏练的是**读懂句子结构**，不是词汇、听说，也不是逐句的写作套路。以中文为母语的读者读长难句，卡在三处：

- **找不到主干**：主语和谓语之间隔着一长串修饰，动词前面最近的名词往往不是主语。
- **分不清挂在哪**：介词短语、定语从句、分词短语修饰的是哪个词，是名词还是动作。
- **看不出边界**：从句、并列、插入语从哪里开始、管到哪里。

这三件事都能写成确定的答案，由机器判对错，所以适合做成谜题。

**改版记录**：之前的几版教的是“母语者造句的思维”：先定时间和视角（搭句子、三个问题、按场合快练、肉鸽式投稿）。试玩的结论是，懂时态含义的人在那里练的仍是理解，习惯要靠大量阅读和写作，游戏帮不上多少；而长难句的结构分析是游戏能确定判分、又真正卡住读者的地方。所以整体硬切换到拆句，旧关卡、快练和投稿模式连同引擎代码都已删除（存档第 6 版清空进度）。

**场景**：句子仿照计算机论文和审稿的写法自写，不摘抄真实论文：引言、方法、实验设置、结果、局限、数据集说明。

## 2. 核心机制

**一关给一个长句，玩家把它拆开。** 只有两个动作：

1. **折**：选中一段修饰成分，选它是哪种结构（介词短语、定语从句……），再点它修饰的那个词。这一段就收成一块，挂在那个词上，显示成「定语从句 → method」。修饰成分里面的修饰成分先折，外面那块把里面折好的一起收进去。
2. **标**：修饰成分折干净以后，剩下的就是主干。选一段，标成主语、谓语、宾语或表语。

**对应《图灵完备》：结构是元件，折叠是封装。** 每种结构（介词短语、定语从句，以后的分词短语、同位语……）由引入它的那一关带来，之后一直能用。折叠就是把一串词收成一个元件：后面的句子越来越长，玩家靠先把学过的结构一块块折起来，才看得清主干。

**机器判什么：**

| 判断 | 规则 |
|---|---|
| 折 | 每一块的范围、结构、挂在哪个词上，都要和答案一致。挂错了，给出“这样挂是什么意思”（关卡写的 `misread`，没有就用通用的一句）。没折的只报个数，不指位置：让玩家自己找。 |
| 标 | 主语、宾语、表语：标的词都要属于答案里那个名词短语，并且包含中心词（限定词、形容词可多可少）。谓语：整个动词词组，一个词不多不少。标错了，给出关卡写的 `misrole`（比如“主语若是复数，谓语该是 are”）；标进了没折的修饰成分，就说“里面还混着修饰成分”。一个成分都没标时只说“还没有标出主干”，不透露这句有哪几个成分。 |
| 放的时候 | 折的范围不能切开已经折好的一块；挂的词要在这一块外面、还没被折掉；**修饰成分跟着它修饰的词走**：一个词被折进更大的一块时，挂在它上面的修饰成分也必须在这块里面（否则拒绝并说明）。 |

**约定（玩家要知道的）：**

- 只折**跟在中心词后面**的修饰成分和状语；名词前面的限定词、形容词、名词修饰语不折，算名词短语的一部分。
- 挂在动作上的修饰成分（状语），挂在谓语的**实义动词**上（*has grown* 挂 *grown*）；句首带逗号的状语、指整句的 *which*，也挂在主干的谓语上。
- 不属于主干、也不是要折的修饰成分的词（程度副词等）留在原处，不标。

**评分**：对照的次数，越少越好；第一次对照就全对得 ★。通关窗口写出这句的主干。

**界面**：句子用衬线体排成一行行可点的词和折好的块；主干的成分用各自颜色的下划线和小字标出。点一个词开始、再点一个词结束，选中的一段下面出现托盘：主干的几个成分、「折成 X」的几种结构、选中一块折好的成分时还有「拆开」。选了结构以后，句子里可点的词带虚线，点一个就挂上。桌面和手机是同一套交互。

## 3. 分层：引擎与内容

这个游戏的目录里只有规格：

```
games/syntax-graph/
  spec.js               课程：章、关卡、百科、存档迁移，交给 syntaxCourse
  game.js               交给领域（defineSyntaxGame）
  levels/skeleton.js    第一章：主干
  levels/attach.js      第二章：挂在哪
  levels/relative.js    第三章：定语从句
  glossary.js           百科：玩法、句子成分、结构
```

引擎在 `games/kit/domains/syntax`：

```
engine/sentence.js   分词；关卡答案从词变成下标（resolve）；折、拆开、标；放的时候的拒绝；对照（check）；主干；折的先后（order）
engine/types.js      主干的成分（ROLES）和可以折成的结构（TYPES）：名称和说明
engine/course.js     规格 → 关卡、游玩顺序、每关能用的成分和结构（reach）、课程审计
ui/Analyze.jsx       关卡页
game.jsx             defineSyntaxGame：元件箱（成分和结构）、通关窗口里的主干
validate.js          npm run check：每句的答案自洽、能按某个顺序折出来、只用到这一关已有的东西、对照自己能通过
syntax.test.js       npm test
```

## 4. 一关怎么写

```js
{
  id, title, brief, intro?, hint?,
  adds?: ['rel'],                        // 这一关带来的成分或结构（'role:subj'、'pp'、'rel'）
  sentence: 'The method that we propose requires no labeled data.',
  folds: [{ span: 'that we propose', type: 'rel', to: 'method', misread?: { 词: { zh, en } } }],
  roles: { subj: 'The method', verb: 'requires', obj: 'no labeled data' },
  misrole?: { verb: { propose: { zh, en } }, obj: { '*': { zh, en } } },
  given?: ['…'],                         // 已经折好、拆不开的块（给后面的长句做支架）
  debrief: { title, body, note },
}
```

答案用词写，不用下标：`span` 和 `to` 在句子里出现不止一次时，写 `change#2`。`misread` 的键是另一个可挂的词，`misrole` 的键是玩家标出的、还立着的那几个词（小写），`'*'` 表示这句话根本没有这个成分时说什么。几句话一起练的一关写成 `tasks: [{ step, brief, hint?, after?, …同上 }]`。

**写句子的纪律：**

- 答案必须唯一。一个修饰成分挂两个词都说得通的句子不要（*the accuracy of the model on the test set* 这类）；要练“看意思挂”，就写成只有一种挂法说得通的句子，并写出另一种挂法的 `misread`。
- 每个可能的误读都写成意思上的后果（“这样就成了‘装在一块 GPU 上的那个模型’”），不写语法名词。
- 引言讲这一关的结构是什么、为什么前面的手段不够；不说这一句该怎么拆。

## 5. 第一到三章

| 关 | 新东西 / 练习维度 | 句子 |
|---|---|---|
| **第一章 主干** | | |
| 1-1 主干 | 主语、谓语、宾语；标的操作（showcase） | Our method outperforms all existing baselines. |
| 1-2 折起来 | 介词短语；折的操作 | The running time of the algorithm grows quadratically. |
| 1-3 宾语后面 | 换方向：修饰成分在宾语后 | We describe an algorithm with linear running time. |
| 1-4 一串套一串 | 加层数：三层嵌套 | The weights of the last layer of the decoder in our model are initialized randomly. |
| 1-5 是什么 | 表语（系动词） | The main contribution of this paper is a new loss function for imbalanced data. |
| 1-6 最近的不是主语 | 辨真伪：主谓一致认主语 | The output of the attention layers is a weighted sum of the values. |
| 1-7 两头都长 | 组合 | A small change in the weights of the first layer causes a large change in the output of the network. |
| **第二章 挂在哪** | | |
| 2-1 修饰动作 | 状语：挂在动词上 | We train the model on a single GPU. |
| 2-2 句首的介词短语 | 换外观：句首、逗号 | In this paper, we propose a new attention mechanism. |
| 2-3 一句里两个方向 | 组合：里层挂名词、外层挂动词 | We evaluate the method on three benchmarks for image classification. |
| 2-4 看意思挂 | 辨真伪：同形不同挂（两个任务） | We compare models with different depths. / We compare our model with the baseline. |
| 2-5 不是最近的那个 | 去支架：名词自带介词 | We report the speedup of our implementation over the reference code. |
| 2-6 挂哪都有 | 组合 | Since 2019, the size of language models has grown by a factor of a thousand. |
| **第三章 定语从句** | | |
| 3-1 两个动词 | 定语从句、关系词 | The method that we propose requires no labeled data. |
| 3-2 逗号里的 which | 换外观：非限制性 | Our model, which has seven billion parameters, runs on a single GPU. |
| 3-3 没有 that | 去支架：省略关系词 | The features we extract are invariant to rotation. |
| 3-4 从句里也有修饰 | 加层数 | The approach that we describe in Section 4 reduces the memory that the attention layer requires. |
| 3-5 挂哪个名词 | 辨真伪：从句的单复数认先行词 | We report the accuracy of the models that were trained on ImageNet. |
| 3-6 指整件事的 which | 指整句的 which | The training loss increases after ten epochs, which suggests overfitting. |
| 3-7 藏起来的从句 | 辨真伪：省略关系词 + 介词留在句尾 | The data the model was trained on came from three hospitals. |
| 3-8 一句数据集说明 | 组合 | The dataset that we release with this paper contains images that were collected from public sources in 2023. |

三章都是同一台“读者”，后一章延续前一章（`keeps: 'all'`）：学过的结构一直能用。

## 6. 以后的章节（未做）

| 章 | 新结构 | 关卡里的难点 |
|---|---|---|
| 4 分词与非谓语 | 分词短语（*trained on ImageNet*、*using a single GPU*）、不定式（*to reduce the cost*） | 过去分词作定语和作谓语分不清（*The model trained on X outperforms …*）；悬垂分词 |
| 5 宾语从句与主语从句 | *We show that …*、*Whether X holds is unclear* | 从句整块当宾语或主语：主干的一个成分本身是一句话；*that* 引导宾语从句和定语从句的区别 |
| 6 并列与省略 | *and*、*or*、*but*、*as well as*；并列中的省略 | *and* 连的是两个名词、两个动词还是两个句子；*X and Y of Z* 的范围 |
| 7 状语从句与插入语 | *Although*、*because*、*when*、*if* 从句；破折号、括号里的插入 | 状语从句在句首、句中；插入语打断主干 |
| 8 名词化与长主语 | *The ability of the model to generalize to unseen distributions …* | 名词化把动作藏进名词；长主语后面才出谓语 |
| 9 母语读者也要读两遍 | 结构歧义、花园路径句、比较结构 | 验证器列出全部合法拆法，有歧义的句子要求标出靠意思排除的那个 |

后期可以加两种任务：**改写**（把一个难读的句子拆成两句、把长主语后移，判分看意思是否不变、主干是否变短）和**读整段**（一段摘要里几句的主干连起来读）。

## 7. 诚实的限制

- 句子是自写的，模仿论文的写法；真实论文里的句子更乱，也更常有两种挂法都说得通的地方。游戏只收答案唯一的句子，练出的是典型结构的识别。
- 判分只看结构（范围、挂在哪、主干），不看是否读懂了术语和内容。
- 结构分析是读懂长句的必要条件，不是充分条件；大量阅读仍是主体。
- 约定（只折后置修饰、状语挂实义动词、主语可以不带限定词）是为了判分确定而定的，和语法书的分析不完全一样。
