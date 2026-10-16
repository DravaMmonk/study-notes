# 00 课程概览与历史

## NLP 研究什么

- 自然语言处理 (natural language processing, NLP) 是一个横跨语言学、计算机科学和人工智能的交叉领域。
<!-- Sources: L1 p.14 -->
- 它的核心目标是设计能够处理和分析人类语言数据的算法。
<!-- Sources: L1 p.14 -->
- 大量信息被困在非结构化文本中，因此有用的系统必须先识别出结构、显著要素和关系，才能在这些文本之上进行推理。
<!-- Sources: L1 p.15 -->

## 截至 L11 的课程脉络

- 第一部分涵盖文本预处理、n-gram 语言模型和文本分类。
<!-- Sources: L1 p.20 -->
- 下一部分转向序列标注 (sequence tagging)，然后是前馈、循环和 Transformer 架构。
<!-- Sources: L1 p.20 -->
- 现代部分涵盖预训练模型与大语言模型 (large language model)、提示 (prompting)、后训练 (post-training)、多模态模型以及检索增强生成 (retrieval-augmented generation)。
<!-- Sources: L1 p.21 -->

## 学习要求

- 明确提出的要求包括：提升 Python 技能、跟上阅读进度，以及通过课堂或讨论区参与学习。
<!-- Sources: L1 p.5 -->
- 明确提出的学习成果包括：实际掌握文本分析技术、理解其背后的模型，以及具备阅读研究文献的能力。
<!-- Sources: L1 p.5 -->
- 讲座和研讨课 (workshop) 的材料都在考试范围内。
<!-- Sources: L1 p.6 -->

## 语言的核心难点

- 像 `I made her duck` 这样的短句，可能同时在词类、代词功能和论元结构 (argument structure) 上产生歧义。
<!-- Sources: L1 p.23-24 -->
- 在这个例子中，`duck` 可以是名词也可以是动词，`her` 可以是与格 (dative) 也可以是所有格 (possessive)，`make` 也可以出现在不止一种句法框架中。
<!-- Sources: L1 p.24 -->
- 即使在现代系统中，长上下文任务、错误信息、幻觉 (hallucination)、刻板印象和偏见仍然是活跃的挑战。
<!-- Sources: L1 p.32 -->

## 历史时间线

| 时期 | 课程材料中强调的主要思想 |
| --- | --- |
| 1950s | 图灵的对话测试、乔姆斯基的形式语言理论，以及句法与语义的区分 |
| 1960s-1970s | 符号语法与句法分析、用于 OCR 和作者归属的贝叶斯方法、Brown Corpus |
| 1970s-1980s | 隐马尔可夫模型、噪声信道 (noisy-channel) 解码、语音系统、SHRDLU 与积木世界 (blocks-world) 理解 |
| 1980s-1990s | 有限状态方法、经验主义回归、留出集 (held-out) 评估、IBM 式的概率方法 |
| 1990s-2000s | 更多算力、更多语料，以及逻辑回归和 SVM 等机器学习模型 |
| 2000s 至今 | 深度神经网络、特征工程减少、GPU 扩展，以及通往大语言模型之路 |
<!-- Sources: L1 p.26-31 -->

- `Colorless green ideas sleep furiously` 被用作“语法形式正确但意义不合理”的经典例子。
<!-- Sources: L1 p.26 -->
- Brown Corpus 被描述为一个由 500 篇不同体裁文档组成、共 100 万词的语料库。
<!-- Sources: L1 p.27 -->

## 四个时代的历史

| 时代 | 特征 |
| --- | --- |
| 1950-1969 | 早期机器翻译与早期人工智能 |
| 1970-1992 | 手工构建的基于规则的理解系统 |
| 1993-2012 | 在大规模文本集合上的经验式机器学习 |
| 2013-至今 | 深度学习，随后是大规模自监督语言模型 |
<!-- Sources: Manning 2022 pp.127-129 -->

- 1954 年的 Georgetown-IBM 机器翻译演示略早于 1956 年“人工智能” (`artificial intelligence`) 一词的提出。
<!-- Sources: Manning 2022 pp.127-128 -->
- 2018 年之后的阶段以在海量无标注文本上训练的超大自监督模型为特征。
<!-- Sources: Manning 2022 pp.128-129 -->

## 衔接后续讲座

- Transformer 是当今 NLP 应用中占主导地位的模型家族。
<!-- Sources: Manning 2022 p.130 -->
- BERT 和 GPT 等预训练语言模型是基础模型 (foundation model) 的早期代表，可以适配到许多下游任务。
<!-- Sources: Manning 2022 pp.127, 132 -->
