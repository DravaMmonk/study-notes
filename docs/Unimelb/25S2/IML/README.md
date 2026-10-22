# COMP90049 Introduction to Machine Learning

这套笔记面向刚入门机器学习的学习者（学期 **25S2**，[Canvas 课程](https://canvas.lms.unimelb.edu.au/courses/213823)）。每讲先说明要解决的问题，再按专题展开：选用的讲义页是主要参照，每张截图旁说明看什么、图表示什么，公式旁解释每个符号。**重点／难点／易错**表示学习时需要多花注意力的地方，不代表对考试范围的预测。补充资料简短列出或折叠，末尾用自测问题检查理解。00 与 07–15 是依据讲义和 Apple Notes 写成的中文原稿（英文译本为 `.en.md`）；01–06 是较早写成的英文原稿（中文译本为 `.zh.md`），这次没有改写。

## 按知识模块学习

| 模块 | 学习顺序 | 要建立的能力 |
| --- | --- | --- |
| 基本概念 | [00 机器学习的基本概念](00-ml-concepts.md) → [01 概率](01-probability.zh.md) | 分清任务类型、属性类型，掌握熵与贝叶斯规则 |
| 经典监督模型 | [02 KNN](02-KNN.zh.md) → [03 决策树](03-DT.zh.md) → [04 朴素贝叶斯](04-NB.zh.md) → [05 线性与逻辑回归](05-LR.zh.md) → [07 优化](07-optimisation.md) → [06 SVM](06-SVM.zh.md) | 看懂每个模型的假设、训练方式与决策边界 |
| 评估与特征 | [08 评估与泛化](08-evaluation.md) → [09 特征选择](09-feature-selection.md) | 正确切分数据、选指标，诊断偏差与方差 |
| 神经网络 | [10 感知机、神经网络与反向传播](10-neural-networks.md) | 从单个神经元走到多层网络及其训练 |
| 超越监督学习 | [11 无监督学习：聚类](11-unsupervised-learning.md) → [12 半监督、主动学习与预训练](12-semi-supervised-learning.md) | 在标签很少或没有标签时学习 |
| 组合与应用 | [13 集成学习](13-ensemble-learning.md) → [14 算法偏差与公平](14-bias-fairness.md) → [15 异常检测](15-anomaly-detection.md) | 组合模型，并思考模型在真实世界中的影响 |

跟课时按讲次阅读：文件编号 00 与 07–15 按讲次排列，01–06 沿用旧稿编号，不完全按讲次（01 概率对应第 4 讲，02 KNN 对应第 3 讲）；复习时可按上表的专题阅读。第 7–8 讲的线性/逻辑回归模型已在 05 中，07 只补其中的优化部分（目标函数、最大似然推导、梯度下降），因为 05 没有讲梯度下降。跨讲重复的概念只在主要笔记中详细解释，其他地方链接回去。

| 讲义（`lecture/`） | 主题 | 笔记 |
| --- | --- | --- |
| `01-introduction.pdf`、`02-mlconcepts.pdf` | 课程介绍、数学回顾、机器学习概念 | [00](00-ml-concepts.md) |
| `03-knn.pdf` | K 近邻 | [02](02-KNN.zh.md) |
| `04-probability theory and modelling.pdf` | 概率论与概率建模 | [01](01-probability.zh.md) |
| `05-decisiontrees.pdf` | 决策树 | [03](03-DT.zh.md) |
| `06-naivebayes.pdf` | 朴素贝叶斯 | [04](04-NB.zh.md) |
| `07-linearregression.pdf`、`08-logisticregression.pdf`（及 `.pptx`） | 线性回归、逻辑回归 | [05](05-LR.zh.md)（模型）、[07](07-optimisation.md)（优化与梯度下降） |
| `09-svm-1.pdf`、`10-svm-2.pdf` | 支持向量机及扩展 | [06](06-SVM.zh.md) |
| `11-evaluation-1.pdf`、`12-evaluation-2.pdf` | 评估、泛化、偏差与方差 | [08](08-evaluation.md) |
| `13-featureselection.pdf` | 特征选择 | [09](09-feature-selection.md) |
| `14-perceptron.pdf`、`15_Neural_Networks.pdf`、`16-backprop.pdf` | 感知机、多层感知机、反向传播 | [10](10-neural-networks.md) |
| `17-academic_writing.pdf` | 学术写作（项目报告写法） | 未单独成篇 |
| `18-unsupervised.pdf` | 无监督学习与聚类 | [11](11-unsupervised-learning.md) |
| `19-semisupervised.pdf` | 半监督学习、主动学习、数据增强、预训练 | [12](12-semi-supervised-learning.md) |
| `20-ensembles.pdf` | 集成学习 | [13](13-ensemble-learning.md) |
| `21-bias-fairness.pdf` | 算法偏差与公平 | [14](14-bias-fairness.md) |
| `22-anomalydetection.pdf` | 异常检测 | [15](15-anomaly-detection.md) |

本地没有 Tutorial 或 Workshop 资料，因此不设练习对应表。

## 资源与来源

- [资源完整性](RESOURCE-STATUS.md)：2026-10-22 按周核对本地讲义、练习、答案与 Apple Notes，并列出缺失或需要区分的项目。
- [资源清单与校验值](materials.json)：每个文件的稳定来源 URL、SHA-256、大小、PDF 页数与首页摘录。

**讲义恢复。** 讲义于 **2026 年 10 月 21 日** 恢复：第 1–22 讲 PDF，以及第 8 讲提供的 PowerPoint；第 7、8 讲的 PDF 是在对应 Canvas 页面内找到的。第 6–11 周的内容包括评估、特征选择、感知机、神经网络与反向传播、无监督与半监督学习、集成学习、公平与偏差、异常检测。原始文件名保持不变；Downloads 中的原件已复制并保留。

**Apple Notes 导入。** 2026-10-22 从 Apple Notes 文件夹 CS/25S2/IML 导入了 29 篇笔记中与新主题相关的内容，作为第二来源决定重点、补充学生自己的理解：

- 已并入新笔记：★0 Introduction、★2 Feature Engineering、★3 Models（→ 00）；W4P2 Optimisation、★4 Optimisation（→ 07）；W6L11 Evaluation、W6L12 Generalisation、★5 Evaluation、★5.1 Bias vs. Variance（→ 08）；W7L13 Feature Selection、★1 Statistics（互信息部分）、★3.4 Cross-Model Strategies（正则化部分）（→ 09）；W7L14 Perception - Neural Network I、W8L15-16 Neural Network、★3.2 Multi-layer Perceptron、★3.1 Classic Supervised Learning（感知机部分）（→ 10）；W9L18 Unsupervised Learning、★5 的聚类指标（→ 11）；W10L19 Weakly supervised learning（→ 12）；W10L20 Ensemble Learning、★3.3 Ensemble Learning（→ 13）；W11L21 Bias & Fairness（→ 14）；W11L22 Anomaly Detection（→ 15）。
- 有意未导入：W02L03 K-Nearest Neighbours、W02L04 Probability、W03L05 Decision Trees、W3L06 Naive Bayes、W4P1 Linear & Logistic Regression、W5P1 Support Vector Machines、W5P2 SVM Extension Strategy，以及 ★3.1 中这些模型的部分——它们的主题已由 01–06 覆盖，本次没有修改这些旧笔记；★3.4 中的多分类策略（OvR、OvO、softmax）也属于 05/06 的范围，其中 OvO 不在课件里。这批 Apple Notes 中没有作业、项目或考试题目。
- 第 17 讲（学术写作）讲的是项目报告的写法，没有新的机器学习概念，未单独成篇；第 19 讲 p.41–42 的考试例题没有转载。

**文件名与内容不一致。** `15_Neural_Networks.pdf` 封面写 “Lecture 16”（与 `16-backprop.pdf` 同号）；`18-unsupervised.pdf` 封面写 “Lecture 19”（与 `19-semisupervised.pdf` 同号）。笔记按文件名编号与课程顺序归档。`01-introduction.pdf` 从 p.31 起页脚印刷编号比 PDF 页序大 1。

**发现的课件错误。** 以下问题在笔记中紧挨对应截图标为 `延伸内容` 或 `补充`：第 8 讲 p.40 的求和上限（应对 $N$ 个样本求和，而不是 $F$ 个特征）；第 18 讲 p.90 的条件熵与同质性数值；第 22 讲 p.25 的方差与 z 值（重算后 $z\approx2.99$ ）。本次重排时另核出几处较小的问题：第 2 讲 p.35 的计数、第 11 讲 p.42 的 F1 舍入、第 14 讲 p.35 的范数写法（应为 $\lVert x\rVert^2=x\cdot x$ ）、第 18 讲 p.85 的分母与条件熵写反、第 22 讲 p.41 的相对密度（应约为 8.8，课件写 9.1），各在对应笔记的截图旁说明。

讲义截图编号均指 **PDF 页序**，未必等于页脚印刷编号。笔记中的 `L07`、`L18` 等指 `lecture/` 中文件名前缀的编号，页码 `p.N` 同样是 PDF 页序。一篇笔记只用一份 PDF 时截图名为 `slide-XX.png`；用到多份时为 `slide-lNN-XX.png`，图注写作 `L14 slide 12 - ...`。

| 本地目录 | 内容 |
| --- | --- |
| `lecture/` | 22 份讲义 PDF 与第 8 讲的 `.pptx`，共 23 个文件 |
| `assets/<笔记名>/` | 00 与 07–15 选用的讲义页 PNG 截图 |
| `materials.json` | 来源、校验值与页数记录 |

原始讲义和截图被 Git 忽略，只存在于本地检出中，不提交到版本库。
