---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Pretrained Models
source_type: lecture+reading
status: draft
review_priority: high
---

# 09 Pretrained Models

## Big Picture

Pretrained models extend the idea of pretrained word vectors from an embedding matrix to an entire neural network. Instead of learning a task model from scratch, a large model is first trained on broad self-supervised objectives and then adapted to downstream tasks.
<!-- Sources: L11 p.2-35; GPT-1 abstract; BERT abstract; T5 abstract; Manning 2022 pp.127-132 -->

## Learning Map

- Prerequisite ideas: word embeddings, transformers, encoder/decoder roles, language modelling, and fine-tuning.
<!-- Sources: L11 p.2-35 -->
- Core concepts: generative pretraining, masked language modelling, next sentence prediction, text-to-text transfer, span corruption, and model adaptation.
<!-- Sources: L11 p.6-35; GPT-1 Sec.1,3; BERT Sec.3; T5 abstract, Sec.1-3 -->
- Main procedures: pretrain on a broad self-supervised task, add or reuse a task interface, and fine-tune or cast downstream tasks into the model's format.
<!-- Sources: L11 p.8-35; GPT-1 Sec.1; BERT Sec.3; T5 Sec.1-3 -->
- Tutorial skills: compare GPT-1, BERT, and T5 by architecture, objective, and downstream interface.
<!-- Sources: L11 p.6-34; W7 p.3-4 -->
- Common traps: confusing encoder-only and decoder-only models, assuming all pretrained models use the same objective, or treating T5 as a classifier rather than text-to-text generation.
<!-- Sources: L11 p.13-34 -->

## From pretrained vectors to pretrained networks

- Pretrained word vectors improve many downstream models when used to initialise the first layer.
<!-- Sources: L11 p.2 -->
- The next step is to pretrain the whole network rather than only the embedding matrix.
<!-- Sources: L11 p.3 -->
- Pretraining followed by fine-tuning becomes the new default paradigm.
<!-- Sources: L11 p.35 -->

## GPT-1

- GPT-1 is a transformer-based language model trained with a next-word prediction objective.
<!-- Sources: L11 p.6 -->
- BPE tokenisation, 12 transformer layers, 110M parameters, and BookCorpus pretraining define the core GPT-1 profile used here.
<!-- Sources: L11 p.7 -->
- Fine-tuning adds a task head and continues training the whole network on the target task.
<!-- Sources: L11 p.8-10 -->
- Generative pretraining on unlabeled text followed by discriminative fine-tuning is the core two-stage method.
<!-- Sources: GPT-1 abstract; GPT-1 Sec.1 -->
- The paper describes a 12-layer decoder-only transformer with masked self-attention, 768-dimensional states, 12 heads, and a 40,000-merge BPE vocabulary.
<!-- Sources: GPT-1 Sec.3 -->

## BERT

<!-- Figure source: L11 p.23 -->

- BERT is a bidirectional transformer encoder rather than a causal decoder.
<!-- Sources: L11 p.13-14 -->
- Its pretraining objective is masked word prediction.
<!-- Sources: L11 p.15 -->
- WordPiece tokenisation, `BERT-base` with 12 layers and 110M parameters, and `BERT-large` with 24 layers and 340M parameters define the core BERT configurations.
<!-- Sources: L11 p.16 -->
- Fine-tuning commonly uses the contextual representation of a prepended `[CLS]` token.
<!-- Sources: L11 p.17-19 -->
- Next sentence prediction appears as a second pretraining objective.
<!-- Sources: BERT abstract; BERT Sec.3 -->
- The paper masks 15% of WordPiece tokens during masked-language-model pretraining.
<!-- Sources: BERT Sec.3 -->

## Encoder, decoder, and encoder-decoder roles

<!-- Figure source: L11 p.13 -->

- Encoder-style transformers are strong on understanding tasks because each token representation can use bidirectional context.
<!-- Sources: L11 p.21 -->
- Decoder-style transformers remain naturally suited to generation because each output conditions on left context only.
<!-- Sources: L11 p.22 -->
- Encoder-decoder architectures combine strong input processing with conditional generation.
<!-- Sources: L11 p.23-28 -->

## T5

<!-- Figure source: T5 p.2 -->

- T5 casts every NLP problem into a text-to-text format.
<!-- Sources: L11 p.30-33; T5 abstract; T5 Sec.1 -->
- Its pretraining objective is span corruption with sentinel tokens.
<!-- Sources: L11 p.30 -->
- Alternative objectives considered include prefix language modelling, masked language modelling, shuffling, and token dropping.
<!-- Sources: L11 p.31 -->
- Filtered `C4` web text is the pretraining corpus highlighted in the lecture.
<!-- Sources: L11 p.32 -->
- Model sizes range from `small (60M)` to `11B`.
<!-- Sources: L11 p.34 -->
- `C4` expands to `Colossal Clean Crawled Corpus`.
<!-- Sources: T5 Sec.2-3 -->

## Model comparison

| Model | Architecture | Pretraining objective | Typical downstream use pattern |
| --- | --- | --- | --- |
| GPT-1 | decoder-only transformer | next-word prediction | fine-tune the whole model with a task head |
| BERT | encoder-only transformer | masked LM + next sentence prediction | use `[CLS]` or token states with a small task head |
| T5 | encoder-decoder transformer | span corruption | cast tasks as text-to-text generation |
<!-- Sources: L11 p.6-34; GPT-1 Sec.1,3; BERT Sec.1,3; T5 abstract, Sec.1-3 -->

## BERT paper model sizes

| Model | Layers `L` | Hidden size `H` | Heads `A` | Parameters |
| --- | ---: | ---: | ---: | ---: |
| BERTBASE | 12 | 768 | 12 | 110M |
| BERTLARGE | 24 | 1024 | 16 | 340M |
<!-- Sources: BERT Sec.3 -->

## Paradigm shift

- Large self-supervised language models can be adapted across many downstream tasks instead of training separate models entirely from scratch.
<!-- Sources: L11 p.35; Manning 2022 pp.127,132 -->
- This is the direct bridge from task-specific classical NLP systems to modern large language models.
<!-- Sources: L11 p.35; Manning 2022 pp.128-132 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Architecture comparison | asks GPT/BERT/T5 differences | map GPT to decoder-only, BERT to encoder-only, T5 to encoder-decoder | grouping all as identical transformers |
| Objective comparison | asks what is predicted in pretraining | GPT predicts next token; BERT predicts masked tokens; T5 reconstructs corrupted spans | calling all objectives next-word prediction |
| Fine-tuning interface | asks how downstream tasks are handled | GPT/BERT add task heads or task formatting; T5 casts task as text-to-text | assuming every model uses `[CLS]` |
| Static vs contextual | asks why pretrained networks improve on embeddings | whole network produces context-dependent representations | treating pretrained vectors and BERT as the same level of pretraining |
<!-- Sources: L11 p.2-35; GPT-1 Sec.1,3; BERT Sec.3; T5 Sec.1-3 -->

## Key Comparisons

| Model | Architecture | Pretraining signal | Downstream interface |
| --- | --- | --- | --- |
| GPT-1 | decoder-only | next-word prediction | task head plus fine-tuning |
| BERT | encoder-only | masked LM plus next sentence prediction | `[CLS]` or token states with task head |
| T5 | encoder-decoder | span corruption | every task as text-to-text |
<!-- Sources: L11 p.6-34; GPT-1 Sec.1,3; BERT Sec.3; T5 abstract, Sec.1-3 -->

## Revision Checklist

- [ ] Can explain why pretraining the whole network is more powerful than only using pretrained word vectors.
- [ ] Can compare GPT-1, BERT, and T5.
- [ ] Can explain masked LM and span corruption.
- [ ] Can describe the pretrain-then-fine-tune paradigm.
<!-- Sources: L11 p.2-35; GPT-1 abstract; BERT abstract; T5 abstract -->

## Active Recall

1. Why is GPT-1 naturally suited to generation?
2. Why is BERT bidirectional?
3. How does T5 turn classification into generation?
4. What changed in NLP when pretraining followed by fine-tuning became standard?
<!-- Sources: L11 p.6-35; Manning 2022 pp.127-132 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Pretraining | Initial self-supervised training on broad data. |
| Fine-tuning | Task-specific training after pretraining. |
| Masked LM | Predicting masked tokens from bidirectional context. |
| Span corruption | Reconstructing removed spans marked by sentinel tokens. |
| Text-to-text | Representing every task as text input to text output. |
<!-- Sources: L11 p.2-35; BERT Sec.3; T5 Sec.1-3 -->
