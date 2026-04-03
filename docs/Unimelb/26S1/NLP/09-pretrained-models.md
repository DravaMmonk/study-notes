# 09 Pretrained Models

## Source Pack
- Lecture: `L11 Pretrained Models (v1)`, pp. 2-36.
- Historical reading connection: Christopher D. Manning, "Human Language Understanding & Reasoning", *Daedalus* 151(2), 2022.
- Papers:
  - Radford et al., "Improving Language Understanding by Generative Pre-Training" (GPT-1).
  - Devlin et al., "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding".
  - Raffel et al., "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer" (T5).

## Why Pretrain Whole Models
- The lecture first revisits pretrained word vectors: they help because the first layer of an NLP model can start from learned embeddings instead of random weights. [Source: L11 p.2]
- It then pushes the idea further: even with pretrained embeddings, most network weights are still random, so the natural next step is to pretrain the whole network. [Source: L11 p.3]
- The lecture's closing summary names `pretrain + fine-tune` as the new paradigm for building NLP models. [Source: L11 p.35]

## GPT-1

### Core Setup
- The lecture describes GPT-1 as a transformer-based language model whose pretraining objective is next-word prediction. [Source: L11 p.6]
- The GPT-1 paper presents the same setup as a two-stage framework: unsupervised language-model pretraining on a large corpus, followed by supervised fine-tuning on labelled tasks. [Source: GPT-1 §3]
- In the paper, the language model is a multi-layer Transformer decoder with positional embeddings, and the supervised stage adds only a small task-specific output layer. [Source: GPT-1 §3.1-3.2]

### Model Details
- The lecture lists byte-pair encoding as the tokenisation scheme, 12 Transformer layers with 110M parameters, and BookCorpus as the pretraining corpus. [Source: L11 p.7]
- The lecture further characterises BookCorpus as roughly 7K books spanning different genres and containing long stretches of contiguous text. [Source: L11 p.7]

### Fine-tuning Pattern
- For downstream classification, the lecture adds a randomly initialised classification layer after the full input has been processed, then fine-tunes the whole network. [Source: L11 p.8]
- Its sentiment-classification example uses the last token representation as the input to a softmax classifier. [Source: L11 p.9]
- For question answering and other structured tasks, the GPT-1 paper says inputs are converted into ordered token sequences so the same pretrained model can process them with minimal architecture changes. [Source: GPT-1 §3.3]

## BERT

### Why It Was Different
- The BERT abstract says the model is designed to pretrain deep bidirectional representations by conditioning jointly on left and right context in all layers. [Source: BERT Abstract]
- The lecture summarises this as bidirectional self-attention: each target word attends to both left and right context words. [Source: L11 p.13]
- The paper argues that this removes the unidirectionality limitation of previous left-to-right pretraining approaches, which is especially important for sentence-level and token-level tasks. [Source: BERT §1]

### Pretraining Objective
- The lecture presents masked word prediction as the core BERT objective. [Source: L11 p.15]
- The paper calls this masked language modelling, where a subset of input tokens is masked and the model predicts the originals from context; it reports masking 15% of WordPiece tokens. [Source: BERT §3.1]
- The paper also adds next sentence prediction during pretraining to learn text-pair representations. [Source: BERT §1, §3.1]

### Model and Input Details
- The lecture lists WordPiece tokenisation, BERT-base with 12 Transformer layers and 110M parameters, and BERT-large with 24 layers and 340M parameters. [Source: L11 p.16]
- The paper matches these two model sizes and says the model architecture is a multi-layer bidirectional Transformer encoder. [Source: BERT §3]
- The lecture says BERT is pretrained on Wikipedia plus BookCorpus and trained on multiple GPUs over several days. [Source: L11 p.16]
- For downstream tasks, the lecture and paper both use the special `[CLS]` token as the aggregate sequence representation for classification. [Source: L11 p.17; BERT §3]

### Encoder Bias
- The lecture explicitly labels BERT's architecture as a Transformer encoder and says it gives better contextual representations but is not suitable for text generation after pretraining. [Source: L11 p.21]

## GPT vs BERT in the Lecture
- The lecture labels GPT's unidirectional Transformer as a decoder and BERT's bidirectional Transformer as an encoder. [Source: L11 pp. 21-22]
- In the lecture's comparison, encoder-style models are stronger on classification, while decoder-style models handle both classification and generation but are weaker on classification than encoder models. [Source: L11 pp. 21-22]

## T5

### Architecture and Objective
- The lecture motivates T5 as a way to combine encoder-style understanding and decoder-style generation through an encoder-decoder architecture. [Source: L11 pp. 23-28]
- The T5 paper likewise says its model family is based on the Transformer architecture and treats transfer learning through a text-to-text framework. [Source: T5 §2, §2.1]
- The lecture gives span corruption as the pretraining objective, where spans are replaced by sentinel tokens and reconstructed by the decoder. [Source: L11 p.30]
- The paper identifies the same denoising setup as the main objective that performed best in their study. [Source: T5 §3.1.4, §3.2.2]

### Data and Task Formulation
- The lecture says T5 pretrains on Filtered C4, a filtered web-text corpus, and explicitly notes that quality matters in addition to quantity. [Source: L11 p.32]
- The paper expands C4 as the "Colossal Clean Crawled Corpus" and states that it is built from cleaned Common Crawl text. [Source: T5 pp. 2-3]
- The lecture's downstream recipe is to cast all tasks as text-to-text problems and fine-tune with next-word prediction on the target text. [Source: L11 p.33]
- The paper uses the same "text-to-text" framing as its central design principle. [Source: T5 pp. 2-3]

### Sizes and Benchmarks
- The lecture lists the released T5 sizes as small (60M), base (220M), large (770M), 3B, and 11B. [Source: L11 p.34]
- It also highlights GLUE, CNN/DM summarisation, and WMT machine translation as representative evaluation settings. [Source: L11 p.34]

## Overall Shift in NLP
- The lecture's concluding message is that downstream NLP models no longer start from scratch once pretraining is available. [Source: L11 p.35]
- Manning's 2022 historical essay makes the same larger point: large self-supervised pretrained models can now be adapted either by fine-tuning or, for the largest models, sometimes by prompting alone. [Source: Manning 2022, pp. 131-133]
- The lecture finally ties this to scale, stating that performance appears to keep improving as models get larger, leading directly into the large-language-model era. [Source: L11 p.35]
