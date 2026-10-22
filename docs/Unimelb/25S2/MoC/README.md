# COMP30026 Models of Computation（计算模型）

学期：**25S2**。[Canvas 课程页](https://canvas.lms.unimelb.edu.au/courses/215477)。讲者：Cezary Kaliszyk、William Umboh。

这套笔记面向第一次学习逻辑与计算理论的同学。每篇先说明这一讲要回答的问题，再按讲义顺序展开：**选出的课件页是主要参照**，每张截图后面紧跟中文说明，讲清该看哪里、图里的状态、箭头、表格或推导说明了什么；表格、Mermaid 图和手算过程只在补充课件没有展开的内容时保留。**重点／难点／易错**表示学习时需要多花注意力的地方，不代表对考试范围的预测。学生 Apple Notes 是次要来源，自拟例子与课外内容单独标明，可选的延伸内容折叠起来，末尾用自测题检查理解。

## 按知识模块学习

| 模块 | 学习顺序 | 要建立的能力 |
| --- | --- | --- |
| 课程导论 | [01 导论](01-introduction.md) | 理解“把问题编码成逻辑、再问可满足性”的思路 |
| 命题逻辑与机械证明 | [02 命题逻辑](02-propositional-logic.md) → [03 归结法](03-resolution.md) | 用真值表与等价律分析公式；化 CNF；用归结做反驳证明 |
| 谓词逻辑与自动推理 | [04 谓词逻辑](04-predicate-logic.md) → [05 合一与自动推理](05-unification-automated-reasoning.md) | 翻译英语句子；在模型中判断真假；Skolem 化；求 mgu 并做谓词归结 |
| 正则语言 | [06 有限自动机](06-finite-automata.md) → [07 确定化与最小化](07-nfa-determinisation-minimisation.md) → [08 正则表达式](08-regular-expressions.md) → [09 证明不正则](09-non-regularity.md) | 设计 DFA/NFA、在三种表示间转换、用愚弄集与封闭性证明不正则 |
| 上下文无关语言 | [10 CFG 与 PDA](10-cfl-pda.md) | 写文法、识别歧义、设计下推自动机 |
| 可计算性 | [11 图灵机](11-turing-machines.md) → [12 通用性与不可判定](12-decidability-universality.md) → [13 归约与不可识别](13-unrecognisable-reductions.md) | 区分可识别与可判定；用对角线、归约与封闭性证明“不可能” |

跟课时按文件编号 01–13 阅读，编号与讲次的对应见下方“讲次、PDF 与笔记”；复习时可按上表的模块阅读，或从[第 13 篇的全课总表与复习地图](13-unrecognisable-reductions.md#topic-5)出发。跨讲重复的概念只在一处详细解释，其他地方用链接指回。本地没有 Tutorial 或 Workshop 资料，所以没有练习对应表。

## 资源与来源

- [资源完整性](RESOURCE-STATUS.md)：2026-10-22 核对，按讲次列出本地课件、Apple Notes 与尚未取得的资料。
- [materials.json](materials.json)：每个文件的 Canvas 来源链接、SHA-256、大小、页数和首页摘录。

2026 年 10 月 21 日恢复了第 1–16、18 讲，第 19 讲（两部分）以及第 21–24 讲的课件，原始文件名保持不变。2026-10-22 已补回第 20 讲的 2025 年 Canvas 原件（16 页），并从 MIT OpenCourseWare 找到第 17 讲所引用的同课程、同年份 Lecture 4 PDF（13 页）；后者与已失效的 PowerPoint 尚未做逐字节比较。第 10 篇的文法部分和第 11 篇第 6 节仍待用新资料重新核对，当前“覆盖有限”指笔记整合状态，而非原文件缺失。

讲义截图编号均指 **PDF 页码**，未必等于页脚印刷编号：L01–L14、L18 的课件是逐步展开的动画页，截图选每张幻灯片展开最完整的一页，页序远大于页脚编号；`w*.pdf` 与 L24 第 2–11 页是课堂手写板书，也选写完整的一页。一篇笔记只用一份 PDF 时文件名为 `slide-XX.png`，用多份 PDF 时为 `slide-<简称>-XX.png`（例如 `slide-l18-21.png`、`slide-w11l2-07.png`），图片说明里也带同样的简称。

### 讲次、PDF 与笔记

| 讲次 | 主题 | 本地 PDF | 笔记 |
| --- | --- | --- | --- |
| L01 | 导论 | `lecture/01.pdf` | [01](01-introduction.md) |
| L02–L03 | 命题逻辑；推论与可满足性 | `lecture/02.pdf`、`03.pdf` | [02](02-propositional-logic.md) |
| L04–L05 前半 | 归结法；复习 | `lecture/04.pdf`、`05.pdf` 第 1–54 页 | [03](03-resolution.md) |
| L05 后半–L08 | 谓词逻辑：语法、语义、子句形式 | `lecture/05.pdf` 第 56–69 页、`06.pdf`、`07.pdf`、`08.pdf` | [04](04-predicate-logic.md) |
| L09–L10 | 合一与归结；自动推理 | `lecture/09.pdf`、`10.pdf` | [05](05-unification-automated-reasoning.md) |
| L11–L12 | 有限自动机入门；语言运算；NFA | `lecture/w6l1-slides.pdf`、`w6l2-slides.pdf` | [06](06-finite-automata.md) |
| L13 | NFA 确定化与最小化 | `lecture/13.pdf` | [07](07-nfa-determinisation-minimisation.md) |
| L14 | 正则表达式 | `lecture/14.pdf` | [08](08-regular-expressions.md) |
| L15–L16 | 证明不正则 | `lecture/w8l1-slides.pdf`、`w8l2-slides.pdf` | [09](09-non-regularity.md) |
| L17 | CFG 与 PDA（Sipser 幻灯片） | `lecture/Sipser-Lecture-4-CFG-PDA.pdf`（MIT OCW PDF） | [10](10-cfl-pda.md)（依据 Apple Notes） |
| L18 | 下推自动机 | `lecture/16.pdf` | [10](10-cfl-pda.md) |
| L19 | 前半：收尾 CFL；后半：图灵机入门 | `lecture/w10l1part1.pdf`；`lecture/Lecture 19 Part 2 - Turing machines prelecture.pdf` | [10](10-cfl-pda.md)、[11](11-turing-machines.md) |
| L20 | 丘奇–图灵论题 | `lecture/Lecture 20 - TM Variants and Decidable Languages.pdf` | [11](11-turing-machines.md)（依据 Apple Notes，覆盖有限） |
| L21–L22 | 通用图灵机；对角线；不可判定 | `lecture/w11l1.pdf`、`w11l2.pdf` | [12](12-decidability-universality.md) |
| L23 | 归约；封闭性；不可识别问题 | `lecture/w12l1.pdf` | [13](13-unrecognisable-reductions.md) |
| L24 | 收尾图灵机（Rice 定理、难解性）与全课复习 | `lecture/Lecture 24.pdf` | [13](13-unrecognisable-reductions.md) |

讲次以 PDF 首页内容为准，而不是文件名：

- `16.pdf` 首页写的是 **Lecture 18 Pushdown Automata**；
- `w10l1part1.pdf` 首页写“Wrap up CFL · Intro to TM”，是 **第 19 讲前半**（第 10 周第 1 讲），不是第 17 讲；
- `w6l1/w6l2`、`w8l1/w8l2`、`w11l1/w11l2`、`w12l1` 依次对应第 11–12、15–16、21–22、23 讲；
- `Lecture 24.pdf` 第 16–17 页的两张总表页脚写着 2023 年复习课，是被收进本学期课件的旧页。

笔记中的来源注释使用以下简称： `L01`–`L14` 指 `lecture/NN.pdf`； `L18 (16.pdf)` 指 `lecture/16.pdf`； `W6L1`、`W6L2`、`W8L1`、`W8L2`、`W10L1part1`、`W11L1`、`W11L2`、`W12L1` 指对应的 `w*.pdf`； `L19-TM` 指 `Lecture 19 Part 2 - Turing machines prelecture.pdf`； `L24` 指 `Lecture 24.pdf`。页码一律是 PDF 页序。

### 课件与学生笔记中发现的问题

整理时对照课件发现的笔误或省略，在对应笔记的截图旁说明，不改动原文件：

- L09 第 5 页有一处 `}` 应为右圆括号；L09 第 11 页提出“ $L(x)$ 与 $L(y)$ 能否合一”但没有给出答案，笔记补上（[05](05-unification-automated-reasoning.md)）；
- W6L2 第 3 页 `0110` 的计算路径漏写了回到 $q_1$ 的一步；第 8 页把 $L^*$ 写成 $\{L^k\mid k\ge0\}$ ，应为这些语言的并（[06](06-finite-automata.md)）；
- W8L2 第 9 页第一行写的是并，但高亮的规则用的是交（[09](09-non-regularity.md)）；
- 对角线论证的“各位加 1”在遇到 9 和双重小数表示时需要另选数字，作为延伸内容补充（[12](12-decidability-universality.md#topic-3)）。

学生笔记中的错误以“易错”或“延伸内容”标出，例如 PDA 转移中 ${\$}$ 与 $\varepsilon$ 的读法（[10](10-cfl-pda.md#topic-4)）、“恰好大小的愚弄集未必能构造”的说法（[09](09-non-regularity.md)）、克林闭包判定器按等长切段（[13](13-unrecognisable-reductions.md#topic-3)）。

### Apple Notes 导入

2026-10-22 从 Apple Notes 文件夹 CS/25S2/MoC 导入 20 条学生笔记，作为次要来源：它们决定讲解的侧重点，并保留了一些有用的例子与直觉；与课件冲突或有误的地方在笔记中以“易错”说明。

| Apple Note | 并入的笔记 |
| --- | --- |
| Lec01-02 Basic Concepts | [01](01-introduction.md)、[02](02-propositional-logic.md) |
| Lec03 Formula、Equivalence Cheatsheet | [02](02-propositional-logic.md)（量词规则并入 [04](04-predicate-logic.md)） |
| ★1 Resolution & Refutation | [03](03-resolution.md) |
| LEC05-06 Predicate Logic、LEC07 Languages | [04](04-predicate-logic.md)（“LEC07 Languages”的内容实为谓词逻辑语义：论域、解释、模型） |
| ★2 Resolution for Predicate Logic | [04](04-predicate-logic.md)、[05](05-unification-automated-reasoning.md) |
| LEC09 Unification、LEC10 Automated Reasoning | [05](05-unification-automated-reasoning.md) |
| LEC11-12 Finite Automata | [06](06-finite-automata.md) |
| LEC13 NFA Determinisation and Minimisation | [07](07-nfa-determinisation-minimisation.md) |
| LEC14 Regular Expressions | [08](08-regular-expressions.md) |
| LEC15-16 Proving Non-regularity | [09](09-non-regularity.md) |
| LEC17-18 Context-free Language & Pushdown Automaton | [10](10-cfl-pda.md) |
| LEC19 Turing Machine、LEC20 Church-Turing Thesis | [11](11-turing-machines.md) |
| LEC21-22 Universality of Turing Machines | [12](12-decidability-universality.md) |
| LEC23-24 Identify Unrecognisable Problems | [13](13-unrecognisable-reductions.md) |
| ★3 Languages、★ Review | [10](10-cfl-pda.md)、[12](12-decidability-universality.md)、[13](13-unrecognisable-reductions.md) |

有意未导入：

- “Assignment 1”笔记：作业内容，不在公开仓库中发布；
- “LEC19 Turing Machine”末尾一段与课程无关的墨尔本地区编码列表；
- Apple Notes 中的图片（课件截图、录播白板截图、文字说明截图）：图形统一改用从 PDF 重新渲染的页面，或改写成表格、公式与 Mermaid 图；有用的文字内容已改写进笔记。没有发现需要单独保留的学生自绘图。

### 本地目录

| 本地目录 | 内容 |
| --- | --- |
| `lecture/` | 25 份讲义 PDF（含新补回的 L20 和 L17 的 MIT OCW PDF） |
| `assets/<笔记名>/` | 从讲义 PDF 以 110 dpi 重新渲染、选入笔记的页面 PNG |
| `materials.json` | 资料来源与校验记录 |

二进制资料（PDF 与渲染图）被 Git 忽略，只存在于本地副本；Downloads 中的原件已复制并保留。
