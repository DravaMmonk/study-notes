---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Prompting and Instruction Tuning
source_type: lecture+workshop+reading
status: draft
review_priority: high
---

# 11 Prompting and Instruction Tuning

## Big Picture

Prompting adapts a frozen LLM at inference time by changing the text context. Instruction tuning adapts a pretrained model during post-training by supervised fine-tuning on instruction-output pairs, so the model becomes better at following natural-language task descriptions.
<!-- Sources: L13-L14 p.34-41; W8 p.3-5; Wei 2022 abstract -->

The practical distinction is whether model parameters are updated. Prompting and in-context learning do not update weights; instruction tuning is supervised fine-tuning and therefore changes the model.
<!-- Sources: L15-L16 p.3; W8 p.6-9 -->

## Learning Map

- Prerequisite ideas: GPT-style LLMs, in-context learning, supervised fine-tuning, and zero-shot/few-shot evaluation.
<!-- Sources: L13-L14 p.3-5, p.34-41; W8 p.3-5 -->
- Core concepts: prompt engineering, chain-of-thought prompting, supervised fine-tuning, instruction data, FLAN, and Alpaca-style synthetic instruction generation.
<!-- Sources: L13-L14 p.34-66; W8 p.5; Wei 2022 abstract; Chung 2024 abstract -->
- Main procedures: use prompting for no-gradient adaptation; use instruction tuning when the model should reliably follow a broad family of instructions.
<!-- Sources: L13-L14 p.38-51; W8 p.6-9 -->
- Tutorial skills: classify scenarios as in-context learning or instruction tuning and justify the decision by checking whether parameters are updated.
<!-- Sources: W8 p.6-9 -->
- Common traps: confusing system prompts with instruction tuning, assuming chain-of-thought always fixes reasoning, and treating instruction tuning as task-specific fine-tuning on one dataset.
<!-- Sources: L13-L14 p.34-38, p.51-66; W8 p.6-9 -->

## Core Concepts

### Prompting

> [!definition]
> Prompting controls a frozen model by changing the input text it conditions on at inference time.

Prompting can be zero-shot when the prompt contains only an instruction, one-shot when it contains one example, and few-shot when it contains several examples. No gradient updates are performed.
<!-- Sources: L13-L14 p.34; W8 p.3 -->

Prompt engineering can improve performance by making the task format, constraints, and reasoning style clearer, but prompts are bounded by context length and can be sensitive to wording and example order.
<!-- Sources: L13-L14 p.35-38; L15-L16 p.12-14; W8 p.4 -->

### Chain-of-thought prompting

<!-- Figure source: L13-L14 p.38 -->

Chain-of-thought prompting adds intermediate reasoning steps to demonstrations so the model sees a worked reasoning pattern before answering. The lecture presents it as especially relevant for richer and multi-step reasoning tasks.
<!-- Sources: L13-L14 p.35-37 -->

Zero-shot chain-of-thought uses a simple reasoning cue, such as asking the model to proceed step by step, without providing worked examples.
<!-- Sources: L13-L14 p.36 -->

### Instruction tuning

<!-- Figure source: L13-L14 p.44 -->

> [!definition]
> Instruction tuning is supervised fine-tuning on instruction data, where each training example pairs a natural-language prompt with a desired completion.

Instruction tuning is also called post-training or supervised fine-tuning in this part of the course. It differs from ordinary one-task fine-tuning because examples are collected across many task types and expressed as natural-language instructions.
<!-- Sources: L13-L14 p.40-41, p.51; W8 p.5; Wei 2022 abstract -->

The FLAN paper instruction-tunes a 137B pretrained model on more than 60 NLP datasets converted into natural-language instruction templates and evaluates zero-shot generalisation on unseen task types.
<!-- Sources: L13-L14 p.57-64; Wei 2022 abstract, Sec.1 -->

Scaling instruction tuning further means scaling the number of tasks, the model size, and the use of chain-of-thought data. The Flan collection explores these three axes and reports broad improvements across model classes, prompting setups, and evaluation benchmarks.
<!-- Sources: L13-L14 p.64-66; Chung 2024 abstract -->

<!-- Figure source: Chung 2024 p.4 -->

### Alpaca-style instruction data generation

Alpaca-style instruction tuning begins with a small set of human-written seed instruction-output examples, uses a stronger model to generate many additional unique instructions and outputs, then fine-tunes an open model on that generated instruction dataset.
<!-- Sources: L13-L14 p.43-49; W8 p.5 -->

The lecture highlights 175 human-written seed examples, 52K generated unique instructions, and fine-tuning a 7B LLaMA model as the main Alpaca-style workflow.
<!-- Sources: L13-L14 p.44-49 -->

## Methods and Workflows

### Deciding between prompting and instruction tuning

1. Check whether the model weights are updated.
2. If no weights are updated and the task is specified in the input, classify the method as prompting or in-context learning.
3. If instruction-output pairs are used in training and model parameters change, classify the method as instruction tuning.
4. If the prompt only controls style or tone at inference time, classify it as prompting even if it resembles an instruction.
<!-- Sources: L15-L16 p.3; W8 p.6-9 -->

### Instruction tuning workflow

1. Start with a pretrained language model.
2. Collect or convert datasets into instruction-output pairs.
3. Mix many task types so the model learns to follow instructions rather than only one task format.
4. Fine-tune the model with supervised learning.
5. Evaluate on held-out or unseen task types to test instruction-following generalisation.
<!-- Sources: L13-L14 p.40-66; Wei 2022 abstract, Sec.1; Chung 2024 abstract -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Few-shot examples inside the prompt | examples appear at inference time | classify as in-context learning | calling the examples training data |
| Model trained on instruction-output pairs | supervised training updates weights | classify as instruction tuning | calling it prompt engineering |
| Sentiment task solved from wording alone | task is specified by text prompt | classify as zero-shot prompting | assuming task labels imply fine-tuning |
| System prompt controls response style | prompt prepended at inference time | classify as prompting | calling every instruction-like string instruction tuning |
<!-- Sources: L15-L16 p.3; W8 p.6-9 -->

## Key Comparisons

| Method | When adaptation happens | Data format | Weight updates | Strength | Limitation |
| --- | --- | --- | --- | --- | --- |
| Prompting | inference | task description and optional examples | no | quick and cheap to try | sensitive to context and wording |
| Chain-of-thought prompting | inference | reasoning demonstrations or reasoning cue | no | helps multi-step reasoning patterns | can still fail when facts or reasoning are missing |
| Instruction tuning | post-training | instruction-output pairs across tasks | yes | improves zero-shot instruction following | requires curated or generated supervision |
<!-- Sources: L13-L14 p.34-66; W8 p.3-9; Wei 2022 abstract; Chung 2024 abstract -->

## Revision Checklist

- Can classify a scenario as prompting or instruction tuning.
- Can explain why chain-of-thought is a prompting style, not a new model architecture.
- Can describe how FLAN turns existing datasets into instruction data.
- Can explain why scaling tasks and model size matter for instruction tuning.
<!-- Sources: L13-L14 p.34-66; W8 p.3-9; Wei 2022 abstract; Chung 2024 abstract -->

## Active Recall

1. What is the fastest way to tell prompting apart from instruction tuning?
2. Why does instruction tuning improve zero-shot performance on unseen tasks?
3. What does chain-of-thought add to ordinary few-shot prompting?
4. What are the data-collection costs of instruction tuning?
<!-- Sources: L13-L14 p.34-66; W8 p.3-9 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Prompt engineering | Manual design of prompts to control a frozen model. |
| Chain-of-thought | Prompting that includes or requests intermediate reasoning steps. |
| Instruction data | Prompt-completion examples phrased as natural-language tasks. |
| Supervised fine-tuning | Training that updates model parameters using labelled examples. |
| FLAN | A family of instruction-tuned models and datasets focused on zero-shot instruction following. |
<!-- Sources: L13-L14 p.34-66; Wei 2022 abstract; Chung 2024 abstract -->
