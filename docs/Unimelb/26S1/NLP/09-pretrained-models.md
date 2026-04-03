# 09 Pretrained Models

## Scope

- Lecture: `L11 Pretrained Models`.
- Readings and linked papers:
  - `BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding`,
  - `Improving Language Understanding by Generative Pre-Training`,
  - `Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer`.

## From pretrained vectors to pretrained networks

- The lecture starts from a familiar point: pretrained word vectors already improve many downstream models when used to initialise the first layer. [Sources: L11 p.2]
- The next question is whether the same idea can be applied to the whole network rather than only the embedding matrix. [Sources: L11 p.3]
- The lecture concludes with the general pretrain-fine-tune paradigm: downstream models should no longer be trained entirely from scratch. [Sources: L11 p.35]

## GPT-1

### What the lecture highlights

- The lecture introduces GPT-1 as a transformer-based language model with a next-word prediction objective. [Sources: L11 p.6]
- Its listed training details are subword tokenisation with BPE, 12 transformer layers, 110M parameters, and pretraining on BookCorpus. [Sources: L11 p.7]
- For downstream classification tasks, the lecture adds a task-specific classifier on top of the final representation and fine-tunes the whole network. [Sources: L11 p.8-9]
- For question answering, the lecture treats answer prediction as locating answer tokens in context. [Sources: L11 p.10]

### What the GPT paper adds

- The GPT paper presents the model as a two-stage procedure: generative language-model pretraining on a large unlabeled corpus, followed by discriminative fine-tuning on each target task. [Sources: GPT-1 paper, abstract and Section 1]
- It uses BooksCorpus for pretraining. [Sources: GPT-1 paper, Section 3]
- The architecture is described as a 12-layer decoder-only transformer with masked self-attention, 768-dimensional states, and 12 attention heads. [Sources: GPT-1 paper, Section 3]
- The paper states that the vocabulary is built with byte-pair encoding using 40,000 merges. [Sources: GPT-1 paper, Section 3]
- The paper reports gains on natural language inference, question answering, semantic similarity, and text classification tasks, including MultiNLI, RTE, QQP, and SST-2. [Sources: GPT-1 paper, abstract and results sections]

## BERT

### What the lecture highlights

- The lecture introduces BERT as a bidirectional transformer encoder rather than a causal decoder. [Sources: L11 p.13-14]
- Its pretraining objective is masked word prediction. [Sources: L11 p.15]
- The listed training details are WordPiece tokenisation, a `BERT-base` model with 12 layers and 110M parameters, and a `BERT-large` model with 24 layers and 340M parameters, pretrained on Wikipedia plus BookCorpus. [Sources: L11 p.16]
- For downstream tasks, the lecture prepends a special `[CLS]` token and feeds its contextual representation to a new classification layer. [Sources: L11 p.17-19]
- The lecture compares encoder and decoder families directly: encoder models give stronger contextual representations for understanding tasks but are not naturally suited to generation, whereas decoder models can generate but classify less strongly. [Sources: L11 p.21-23]

### What the BERT paper adds

- The BERT paper argues that previous pretraining approaches were limited by unidirectionality and introduces masked language modelling to pretrain deep bidirectional representations. [Sources: BERT paper, abstract and Section 1]
- The paper adds next sentence prediction as a second pretraining task for learning text-pair relations. [Sources: BERT paper, abstract and Section 3]
- It defines `BERTBASE` as `L=12, H=768, A=12, 110M parameters` and `BERTLARGE` as `L=24, H=1024, A=16, 340M parameters`. [Sources: BERT paper, Section 3]
- The paper masks 15% of WordPiece tokens during MLM pretraining. [Sources: BERT paper, Section 3]
- It reports strong results on GLUE tasks including MNLI, QQP, SST-2, CoLA, and RTE. [Sources: BERT paper, Section 4]

## Encoder-decoder motivation

- The lecture uses encoder versus decoder differences to motivate a combined architecture that keeps strong bidirectional input processing while still supporting generation. [Sources: L11 p.21-28]
- The encoder-decoder explanation in the lecture is that the encoder processes the input sequence, and the decoder then generates the output sequence while attending back to encoder states. [Sources: L11 p.23-28]

## T5

### What the lecture highlights

- The lecture introduces T5 as the `Text-to-Text Transfer Transformer`. [Sources: L11 p.30]
- Its pretraining objective in the lecture is span corruption with sentinel tokens. [Sources: L11 p.30]
- The lecture also lists several alternative objectives that were considered, including prefix language modelling, masked language modelling, shuffling, and token dropping, but says span corruption worked best empirically. [Sources: L11 p.31]
- The lecture describes the pretraining corpus as filtered `C4` web text and emphasises that corpus quality matters, not just quantity. [Sources: L11 p.32]
- Fine-tuning is done by casting every task into text-to-text form, including translation. [Sources: L11 p.33]
- The lecture lists T5 sizes from `small (60M)` through `11B` and says the largest models are close to human performance on some benchmarks. [Sources: L11 p.34]

### What the T5 paper adds

- The T5 paper's core claim is that every NLP problem can be cast into a text-to-text format with a unified training objective. [Sources: T5 paper, abstract and Section 1]
- It introduces the `Colossal Clean Crawled Corpus (C4)` as a large cleaned English web corpus for pretraining. [Sources: T5 paper, Sections 2 and 3]
- The paper evaluates the framework on GLUE, SuperGLUE, CNN/Daily Mail summarisation, SQuAD question answering, and WMT translation tasks. [Sources: T5 paper, Section 3]
- The text-to-text framing is meant to align pretraining and fine-tuning under a consistent sequence-generation view of tasks. [Sources: T5 paper, Section 2]

## Comparative summary

- GPT-1 is a decoder-only, causal transformer pretrained with next-word prediction, then fine-tuned for downstream tasks. [Sources: L11 p.6-10; GPT-1 paper, Sections 1 and 3]
- BERT is an encoder-only, bidirectional transformer pretrained with masked language modelling plus next sentence prediction, then fine-tuned with small task heads such as `[CLS]` classification layers. [Sources: L11 p.13-20; BERT paper, Sections 1 and 3]
- T5 is an encoder-decoder model that casts both pretraining and downstream tasks into text generation. [Sources: L11 p.23-34; T5 paper, Sections 1-3]

## What changes in the overall NLP paradigm

- The lecture's final message is that pretraining followed by fine-tuning becomes the new standard paradigm for building NLP models. [Sources: L11 p.35]
- Manning's essay places BERT and GPT-3 within the broader emergence of foundation models: large self-supervised models that can be adapted across many downstream tasks. [Sources: Manning 2022, pp. 127, 132]
- This is the conceptual bridge from classical task-specific NLP to modern large language models. [Sources: L11 p.35; Manning 2022, pp. 128-132]
