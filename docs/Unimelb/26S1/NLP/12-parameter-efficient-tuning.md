---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Parameter Efficient Tuning
source_type: lecture+reading
status: draft
review_priority: high
---

# 12 Parameter Efficient Tuning

## Big Picture

Full fine-tuning updates every parameter in a pretrained model, which becomes impractical as model size grows. Parameter-efficient tuning keeps most of the pretrained model fixed and trains a much smaller set of task-specific parameters.
<!-- Sources: L15-L16 p.10-17; Hu 2022 abstract -->

This topic sits between prompt-only adaptation and full fine-tuning. It tries to recover much of fine-tuning's task performance while keeping storage, compute, and deployment costs closer to a frozen-model setup.
<!-- Sources: L15-L16 p.12-17, p.23-25; Hu 2022 abstract; Lester 2021 abstract -->

## Learning Map

- Prerequisite ideas: full fine-tuning, in-context learning, transformer layers, embeddings, and matrix multiplication.
<!-- Sources: L15-L16 p.2-17; Hu 2022 Sec.1 -->
- Core concepts: parameter composition, input composition, function composition, pruning, LoRA, prompt tuning, adapters, and IA3.
<!-- Sources: L15-L16 p.23-60 -->
- Main procedures: freeze base weights, add a small trainable module or prompt, train only the new parameters, and reuse the base model across tasks.
<!-- Sources: L15-L16 p.17, p.33-55; Hu 2022 abstract; Lester 2021 abstract -->
- Common traps: equating prompt tuning with manual prompt engineering, assuming all PEFT methods have no inference overhead, and ignoring that prompt tuning performs best at scale.
<!-- Sources: L15-L16 p.59-60, p.63-69, p.83-85; Lester 2021 abstract -->

## Core Concepts

### Why partial tuning returns

Fine-tuning all parameters is expensive for very large models, can be unstable, and can cause catastrophic forgetting. In-context learning avoids training but can be inefficient, prompt-sensitive, and weaker than tuning on difficult tasks.
<!-- Sources: L15-L16 p.10-16 -->

Parameter-efficient fine-tuning updates only a small subset of parameters or adds small trainable components while the pretrained backbone stays frozen.
<!-- Sources: L15-L16 p.17; Hu 2022 abstract -->

### Three computation functions

<!-- Figure source: L15-L16 p.23 -->

| Family | Main idea | Representative methods | Main trade-off |
| --- | --- | --- | --- |
| Parameter composition | decompose or combine parameter updates | pruning, sparse fine-tuning, LoRA | strong parameter efficiency, but pruning may need retraining |
| Input composition | adapt by adding or learning inputs | prompt tuning, prefix-style prompts | very small parameter count, but context length and model scale matter |
| Function composition | add task-specific functions or modules | adapters, IA3, mixture-style modules | strong performance, but added functions can increase inference work |
<!-- Sources: L15-L16 p.23-25, p.56-60, p.69-85 -->

### LoRA

<!-- Figure source: L15-L16 p.36 -->

> [!definition]
> LoRA freezes the pretrained weight matrix and learns a low-rank update, represented as the product of two smaller trainable matrices.

For a frozen weight matrix \(W\), LoRA learns a change \(\Delta W\) through two smaller matrices \(A\) and \(B\), so the adapted layer uses \(W + BA\) or an equivalent low-rank update depending on convention.
<!-- Sources: L15-L16 p.33-39; Hu 2022 abstract, Sec.1 -->

If \(W\) is \(1024 \times 1024\) and the rank is \(r=8\), the trainable matrices contain \(2 \times 1024 \times 8 = 16{,}384\) parameters, far fewer than the original million-parameter matrix.
<!-- Sources: L15-L16 p.36 -->

LoRA's deployment advantage is that its learned matrices can be merged into the frozen weights, so it does not introduce additional inference latency compared with a fully fine-tuned dense layer.
<!-- Sources: L15-L16 p.42; Hu 2022 abstract, Sec.1 -->

### Prompt tuning

<!-- Figure source: Lester 2021 p.2 -->

> [!definition]
> Prompt tuning learns continuous soft prompt embeddings that are prepended to the model input while the language model itself remains frozen.

Prompt tuning differs from prompt engineering because the prompt is learned by backpropagation rather than manually written as discrete text. It differs from full fine-tuning because it updates only a small learned prompt, not the full model.
<!-- Sources: L15-L16 p.61-65; Lester 2021 abstract -->

Prompt tuning becomes more competitive as model size increases; the course explicitly warns that it performs poorly at smaller model sizes and on harder tasks.
<!-- Sources: L15-L16 p.68-69; Lester 2021 abstract -->

### Adapters and IA3

Adapters add small task-specific functions inside transformer layers, commonly using a down-projection, activation, and up-projection after attention or feed-forward blocks.
<!-- Sources: L15-L16 p.75 -->

IA3 multiplies learned vectors with keys and values in self-attention and with intermediate feed-forward activations, adapting model behaviour through lightweight learned scaling.
<!-- Sources: L15-L16 p.76 -->

Function composition methods such as adapters, Compacter, and IA3 can match or outperform standard fine-tuning in the lecture comparison, but added functions can increase the number of operations.
<!-- Sources: L15-L16 p.83-85 -->

## Methods and Workflows

### Choosing a PEFT family

1. If you can insert or train small parameter updates inside a model and want strong task adaptation, start with parameter composition such as LoRA.
2. If the model must remain frozen and only inputs can be changed, use input composition such as prompt tuning or prompt engineering.
3. If you need modular task/domain behaviours that can be switched or composed, use function composition such as adapters.
<!-- Sources: L15-L16 p.26-32, p.61-62, p.73-82 -->

### LoRA workflow

1. Freeze the pretrained layer weights.
2. Insert low-rank trainable matrices for the target projection layers.
3. Train only the low-rank matrices on task data.
4. At deployment, use the base model plus task-specific LoRA weights, optionally merging the low-rank update into the original weights.
<!-- Sources: L15-L16 p.33-42, p.77-80; Hu 2022 abstract, Sec.1 -->

## Tutorial Patterns

| Scenario | Best classification | Reason |
| --- | --- | --- |
| Adapt an open-source LLM to legal text with limited compute | Parameter composition | LoRA-like updates train a small parameter set instead of the whole model |
| Use an API model where weights cannot be changed | Input composition | only prompts or soft input-side controls are available |
| Switch among summarisation, classification, and translation behaviours using lightweight modules | Parameter and function composition | task-specific adapters can be loaded into one base model |
| Add a retriever, reranker, or planner around the LLM | Function composition | external functions change the system behaviour beyond input wording |
<!-- Sources: L15-L16 p.86-87 -->

## Key Comparisons

| Method | Trainable object | Updates base model? | Inference overhead | Typical use |
| --- | --- | --- | --- | --- |
| Full fine-tuning | all model parameters | yes | no extra modules | maximum task-specific adaptation when compute is available |
| Prompt engineering | discrete text prompt | no | consumes context | quick no-training adaptation |
| Prompt tuning | soft prompt embeddings | no | consumes input/context capacity | frozen model with trainable task prompt |
| LoRA | low-rank update matrices | no direct base-weight update during training | no extra latency when merged | efficient domain or task adaptation |
| Adapters | inserted small neural modules | no | added operations | modular task-specific behaviours |
<!-- Sources: L15-L16 p.61-85; Hu 2022 abstract; Lester 2021 abstract -->

## Revision Checklist

- [ ] Can explain why full fine-tuning becomes less practical for LLMs.
- [ ] Can write the LoRA idea as a frozen matrix plus a low-rank update.
- [ ] Can distinguish prompt tuning from prompt engineering.
- [ ] Can choose between parameter, input, and function composition for a scenario.
<!-- Sources: L15-L16 p.10-87; Hu 2022 abstract; Lester 2021 abstract -->

## Active Recall

1. Why can LoRA use far fewer trainable parameters than full fine-tuning?
2. Why does prompt tuning become more competitive at larger model scale?
3. Which PEFT family is most appropriate when only the input can be changed?
4. What deployment trade-off do adapters introduce compared with LoRA?
<!-- Sources: L15-L16 p.33-85; Hu 2022 abstract; Lester 2021 abstract -->

## Glossary

| Term | Meaning |
| --- | --- |
| PEFT | Parameter-efficient fine-tuning; adapting a model with few trainable parameters. |
| Low rank | A compressed matrix representation with rank much smaller than the full dimension. |
| LoRA | Low-Rank Adaptation, a PEFT method that trains low-rank weight updates. |
| Soft prompt | A learned continuous prompt embedding rather than manually written text. |
| Adapter | A small trainable module inserted into a pretrained network. |
| IA3 | A lightweight method using learned multiplicative vectors inside transformer computations. |
<!-- Sources: L15-L16 p.23-85; Hu 2022 abstract; Lester 2021 abstract -->
