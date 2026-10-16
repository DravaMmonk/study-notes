# 09 预训练模型

## 从预训练向量到预训练网络

- 用预训练词向量初始化第一层时，许多下游模型的表现都会提升。
<!-- Sources: L11 p.2 -->
- 下一步是预训练整个网络，而不仅仅是嵌入矩阵。
<!-- Sources: L11 p.3 -->
- 先预训练 (pretraining) 再微调 (fine-tuning) 成为新的默认范式。
<!-- Sources: L11 p.35 -->

## GPT-1

- GPT-1 是一个基于 Transformer、以下一个词预测为训练目标的语言模型。
<!-- Sources: L11 p.6 -->
- BPE 分词、12 层 Transformer、1.1 亿 (110M) 参数以及在 BookCorpus 上预训练，构成了这里所用的 GPT-1 核心概况。
<!-- Sources: L11 p.7 -->
- 微调时添加一个任务头 (task head)，并在目标任务上继续训练整个网络。
<!-- Sources: L11 p.8-10 -->
- 在无标注文本上进行生成式预训练，再进行判别式微调，是其核心的两阶段方法。
<!-- Sources: GPT-1 abstract; GPT-1 Sec.1 -->
- 论文描述的是一个 12 层、仅解码器 (decoder-only) 的 Transformer，采用掩码自注意力 (masked self-attention)、768 维状态、12 个注意力头，以及包含 40,000 次合并的 BPE 词表。
<!-- Sources: GPT-1 Sec.3 -->

## BERT

- BERT 是一个双向 Transformer 编码器，而不是因果解码器 (causal decoder)。
<!-- Sources: L11 p.13-14 -->
- 它的预训练目标是掩码词预测 (masked word prediction)。
<!-- Sources: L11 p.15 -->
- WordPiece 分词、12 层且 1.1 亿参数的 `BERT-base`，以及 24 层且 3.4 亿参数的 `BERT-large`，构成了 BERT 的核心配置。
<!-- Sources: L11 p.16 -->
- 微调时通常使用在开头添加的 `[CLS]` 词元的上下文表示。
<!-- Sources: L11 p.17-19 -->
- 下一句预测 (next sentence prediction) 是第二个预训练目标。
<!-- Sources: BERT abstract; BERT Sec.3 -->
- 论文在掩码语言模型预训练中对 15% 的 WordPiece 词元进行掩码。
<!-- Sources: BERT Sec.3 -->

## 编码器、解码器与编码器-解码器的角色

- 编码器式 Transformer 擅长理解类任务，因为每个词元的表示都可以利用双向上下文。
<!-- Sources: L11 p.21 -->
- 解码器式 Transformer 天然适合生成，因为每个输出只以左侧上下文为条件。
<!-- Sources: L11 p.22 -->
- 编码器-解码器 (encoder-decoder) 架构把强大的输入处理与条件生成结合起来。
<!-- Sources: L11 p.23-28 -->

## T5

- T5 把所有 NLP 问题都转化为文本到文本 (text-to-text) 的格式。
<!-- Sources: L11 p.30-33; T5 abstract; T5 Sec.1 -->
- 它的预训练目标是使用哨兵词元 (sentinel token) 的片段破坏 (span corruption)。
<!-- Sources: L11 p.30 -->
- 考察过的其他目标包括前缀语言建模、掩码语言建模、打乱顺序和丢弃词元。
<!-- Sources: L11 p.31 -->
- 讲座中强调的预训练语料是经过过滤的 `C4` 网页文本。
<!-- Sources: L11 p.32 -->
- 模型规模从 `small (60M)` 到 `11B` 不等。
<!-- Sources: L11 p.34 -->
- `C4` 是 `Colossal Clean Crawled Corpus` 的缩写。
<!-- Sources: T5 Sec.2-3 -->

## 模型比较

| 模型 | 架构 | 预训练目标 | 典型的下游使用方式 |
| --- | --- | --- | --- |
| GPT-1 | 仅解码器 Transformer | 下一个词预测 | 加上任务头后微调整个模型 |
| BERT | 仅编码器 Transformer | 掩码语言模型 + 下一句预测 | 使用 `[CLS]` 或词元状态，再接一个小的任务头 |
| T5 | 编码器-解码器 Transformer | 片段破坏 | 把任务转化为文本到文本的生成 |
<!-- Sources: L11 p.6-34; GPT-1 Sec.1,3; BERT Sec.1,3; T5 abstract, Sec.1-3 -->

## BERT 论文中的模型规模

| 模型 | 层数 `L` | 隐藏维度 `H` | 注意力头数 `A` | 参数量 |
| --- | ---: | ---: | ---: | ---: |
| BERTBASE | 12 | 768 | 12 | 110M |
| BERTLARGE | 24 | 1024 | 16 | 340M |
<!-- Sources: BERT Sec.3 -->

## 范式转变

- 大型自监督语言模型可以适配到许多下游任务，而不必为每个任务完全从零训练单独的模型。
<!-- Sources: L11 p.35; Manning 2022 pp.127,132 -->
- 这正是从面向特定任务的经典 NLP 系统通往现代大语言模型的直接桥梁。
<!-- Sources: L11 p.35; Manning 2022 pp.128-132 -->
