# 09 Pretrained Models

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

- Encoder-style transformers are strong on understanding tasks because each token representation can use bidirectional context.
<!-- Sources: L11 p.21 -->
- Decoder-style transformers remain naturally suited to generation because each output conditions on left context only.
<!-- Sources: L11 p.22 -->
- Encoder-decoder architectures combine strong input processing with conditional generation.
<!-- Sources: L11 p.23-28 -->

## T5

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
