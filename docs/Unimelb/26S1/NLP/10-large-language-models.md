---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Large Language Models
source_type: lecture+workshop+reading
status: draft
review_priority: high
---

# 10 Large Language Models

## Big Picture

Large language models extend the earlier pretrained-model paradigm by scaling autoregressive transformer language models in data, parameters, and compute. The central operational change is that many tasks can be specified through text at inference time rather than by building a new task-specific architecture.
<!-- Sources: L12 p.4-5, p.43-44; Workshop W7 p.10-12; Brown 2020 abstract -->

The course progression is: static embeddings give one vector per word type, contextual models such as BERT give token representations conditioned on surrounding text, and decoder-only LLMs use autoregressive next-token prediction plus prompting to perform generation and many classification-style tasks.
<!-- Sources: W7 p.3-4, p.12; L12 p.4-5, p.27-46 -->

## Learning Map

- Prerequisite ideas: transformer self-attention, masked self-attention, pretrained language models, GPT-1, BERT, and T5.
<!-- Sources: L12 p.10-26; W7 p.5-8 -->
- Core concepts: decoder-only transformer, scaling, zero-shot prompting, few-shot prompting, in-context learning, and instruction following.
<!-- Sources: L12 p.27-43; W7 p.10-16; Brown 2020 abstract -->
- Main procedures: specify the task in text, optionally include demonstrations, and let the frozen model condition on the prompt without gradient updates.
<!-- Sources: L12 p.34-40; Brown 2020 abstract -->
- Tutorial skills: distinguish GPT-2 from GPT-3 by scale, training data, and capabilities; distinguish encoder-only, decoder-only, and encoder-decoder LMs.
<!-- Sources: W7 p.12-16 -->
- Common traps: treating in-context learning as fine-tuning, assuming scale alone fixes reasoning, and ignoring context-window limits.
<!-- Sources: L12 p.39-43; L13-L14 p.38; W8 p.3-4 -->

## Core Concepts

### Language model vs large language model

> [!definition]
> A language model predicts the next token from previous tokens; a large language model does this with massive training data, many parameters, and substantial compute.

The modelling objective remains next-token prediction, but scale changes how the model can be used. Once the model is large enough, tasks can often be posed as prompts instead of requiring a separate supervised model for each task.
<!-- Sources: L12 p.4-5, p.31-40; Brown 2020 abstract -->

### Decoder-only transformer

A decoder-only transformer removes the encoder-side sequence-to-sequence structure and focuses on predicting the next token from left context. Masked self-attention prevents each position from attending to future tokens.
<!-- Sources: L12 p.10, p.24-26; W7 p.6-8 -->

Multi-head self-attention computes query, key, and value vectors, turns query-key compatibility into weights through scaling and softmax, and combines value vectors as weighted sums. Multiple heads are concatenated and projected so different representation subspaces can be used jointly.
<!-- Sources: L12 p.12-20; W6 p.3-6; W7 p.7 -->

Residual connections and layer normalisation help transformer models train more effectively by stabilising deep computation.
<!-- Sources: L12 p.22-23; W7 p.5 -->

### Scaling from GPT-1 to GPT-3

<!-- Figure source: L12 p.24 -->

| Model | Training data highlighted in course | Parameters | Layers | Hidden dimension | Capability emphasis |
| --- | --- | ---: | ---: | ---: | --- |
| GPT-1 | BookCorpus / BookCrawl | 117M | 12 | 768 | unsupervised pretraining plus supervised fine-tuning |
| GPT-2 | WebText | 1.5B | 48 | 1600 | zero-shot ability and stronger language modelling |
| GPT-3 | CommonCrawl / filtered web data | 175B | 96 | 12288 | few-shot and in-context learning |
<!-- Sources: L12 p.27-36; L13-L14 p.4; W7 p.15-16; Brown 2020 abstract -->

The main difference between GPT-2 and GPT-3 is scale: GPT-3 uses far more parameters and training data, and this scaling makes zero-shot, one-shot, and few-shot prompting more effective.
<!-- Sources: W7 p.15-16; L12 p.31-40; Brown 2020 abstract -->

### In-context learning

<!-- Figure source: L12 p.34 -->

> [!definition]
> In-context learning solves a new task by placing a task description and optional input-output demonstrations in the prompt, without updating model parameters.

Zero-shot prompting gives only task instructions, one-shot prompting adds one demonstration, and few-shot prompting adds several demonstrations. The model adapts through context at inference time rather than through gradient descent.
<!-- Sources: L12 p.34-40; W8 p.3; Brown 2020 abstract -->

The practical benefit is speed of task setup: no task-specific training run is needed. The cost is that examples consume context, prompt wording and example order can matter, and complex tasks can still require stronger prompting or tuning.
<!-- Sources: L12 p.39-43; L13-L14 p.38; W8 p.4 -->

### Scaling laws and LLaMA

Scaling language models improves performance when model size, dataset size, and compute are scaled together; later compute-optimal work emphasises scaling model size and training tokens together.
<!-- Sources: W7 p.11 -->

LLaMA is presented as a smaller open model family trained longer on larger publicly available text and code data, with architectural changes including pre-normalisation with RMSNorm, SwiGLU activation, and rotary position embeddings.
<!-- Sources: L13-L14 p.22-27 -->

## Methods and Workflows

### Prompt-only task adaptation

1. Write the task in natural language.
2. Add examples when the task format is not obvious.
3. Put the target input after the examples.
4. Interpret the answer as generated text or map it back into labels for classification.
<!-- Sources: L12 p.34-40; Brown 2020 abstract; W8 p.3 -->

This workflow is strongest when the task can be expressed compactly and does not require large amounts of hidden task-specific supervision.
<!-- Sources: L13-L14 p.38; W8 p.4 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| GPT-2 vs GPT-3 comparison | question asks for model size, data, and capabilities | explain that GPT-3 scales parameters and data and supports stronger in-context learning | saying GPT-3 is only a larger GPT-2 without capability change |
| Decoder-only masking | question asks what decoder input can attend to | state that causal masking allows attention only to previous tokens | describing bidirectional BERT-style attention |
| ICL vs fine-tuning | prompt contains examples but no training | classify as in-context learning | saying examples in the prompt are a training set |
<!-- Sources: W7 p.8, p.15-16; W8 p.3, p.6-9 -->

## Key Comparisons

| Concept | Uses gradient updates? | Changes model weights? | Main cost | Best use |
| --- | --- | --- | --- | --- |
| Zero-shot prompting | no | no | prompt design | simple instruction-following tasks |
| Few-shot prompting | no | no | context length | tasks where examples clarify format |
| Fine-tuning | yes | yes | training compute and task data | tasks needing durable task adaptation |
<!-- Sources: L12 p.34-43; W8 p.3-5; Brown 2020 abstract -->

## Revision Checklist

- [ ] Can explain why decoder-only masking is necessary for autoregressive generation.
- [ ] Can distinguish zero-shot, one-shot, few-shot, and fine-tuning.
- [ ] Can compare GPT-1, GPT-2, and GPT-3 using data, parameters, and capabilities.
- [ ] Can state why in-context learning is useful but limited.
<!-- Sources: L12 p.10-43; W7 p.8-16; W8 p.3-4 -->

## Active Recall

1. What changes between GPT-2 and GPT-3 make in-context learning more effective?
2. Why is a decoder-only transformer suitable for next-token prediction?
3. Why is in-context learning not the same as fine-tuning?
4. What are two limitations of prompt-only adaptation?
<!-- Sources: L12 p.24-43; W7 p.15-16; W8 p.3-4 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Autoregressive LM | A language model that predicts each token from previous tokens. |
| Causal mask | An attention mask that prevents access to future tokens. |
| In-context learning | Prompt-based task adaptation without parameter updates. |
| Few-shot prompting | Prompting with a small number of demonstrations. |
| Scaling law | An empirical relationship between model performance and scale factors such as parameters, data, and compute. |
<!-- Sources: L12 p.4-43; W7 p.8-16; W8 p.3 -->
