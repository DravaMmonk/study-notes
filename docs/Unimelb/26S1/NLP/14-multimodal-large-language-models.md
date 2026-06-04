---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Multimodal Large Language Models
source_type: lecture+reading
status: draft
review_priority: high
---

# 14 Multimodal Large Language Models

## Big Picture

Multimodal large language models extend LLM-style instruction following beyond text so the model can process, understand, and sometimes generate across modalities such as image, video, audio, sensors, and text. The core motivation is that humans combine multiple senses, and single-modality language loses context that may be crucial for interpretation.
<!-- Sources: L19-L20 p.3-12; Liu 2024 Visual Instruction Tuning abstract, Sec.1 -->

The lecture frames MLLMs as an extension of prompting, instruction tuning, PEFT, and human-feedback training into multimodal settings. The key engineering problem is how to connect modality-specific encoders and generators to an LLM backbone while preserving alignment, efficiency, and cross-modal consistency.
<!-- Sources: L19-L20 p.13-20, p.720-983; Liu 2024 Visual Instruction Tuning Sec.1-3; Liu 2024 Improved Baselines abstract -->

## Learning Map

- Prerequisite ideas: LLMs, instruction tuning, PEFT, transformer encoders, visual encoders, and evaluation benchmarks.
<!-- Sources: L19-L20 p.13-20, p.720-983 -->
- Core concepts: modality, MLLM architecture, input projector, output projector, visual/audio encoders, cross-modal alignment, LVLM instruction tuning, multimodal chain-of-thought, and multimodal distillation.
<!-- Sources: L19-L20 p.3-20, p.231-1320; Liu 2024 Visual Instruction Tuning abstract; Liu 2024 Improved Baselines abstract -->
- Main procedures: build modality-specific representations, project them into the LLM space, tune selected bridge modules or adapters, and evaluate on multimodal tasks and benchmarks.
<!-- Sources: L19-L20 p.720-1125; Liu 2024 Visual Instruction Tuning Sec.3; Liu 2024 Improved Baselines Sec.1 -->
- Common traps: treating multimodality as only image captioning, ignoring annotation and privacy costs, or assuming frozen backbones can adapt to every new modality without workarounds.
<!-- Sources: L19-L20 p.231-720, p.760-910 -->

## Core Concepts

### Multimodality

> [!definition]
> Multimodality is the ability of a model to process, understand, and generate data from multiple sources such as text, images, audio, video, and sensors.

Multimodality improves contextual understanding because different modalities carry complementary evidence. For example, sarcasm, actions, medical conditions, or driving scenes may need visual, audio, sensor, and textual evidence together.
<!-- Sources: L19-L20 p.3-12 -->

### Datasets and benchmarks

MLLM tasks include general vision-language tasks such as visual question answering, image captioning, visual reasoning, image-text retrieval, report generation, referring expression tasks, segmentation, and domain-specific tasks in geography, medicine, robotics, autonomous driving, and visually rich documents.
<!-- Sources: L19-L20 p.231-520 -->

Pretraining data can be coarse-grained image-text data from the web, fine-grained image-text descriptions, video-text datasets, or audio-text datasets. Coarse web data is large but noisy; fine-grained descriptions can be higher quality but require stronger generation or annotation pipelines.
<!-- Sources: L19-L20 p.520-650 -->

Dataset creation is difficult because multimodal data collection requires diverse sources and tools, annotation is costly and specialised, labels can be ambiguous, and cross-modal synchronisation must align text, video, audio, or sensor streams.
<!-- Sources: L19-L20 p.650-720 -->

### MLLM architecture

A typical MLLM uses modality-specific encoders, an input projector, an LLM backbone, and optionally output projectors or modality generators. Visual encoders can include ViT/OpenCLIP/DINO-style models, while audio encoders can include HuBERT/BEATs/Whisper/CLAP-style models.
<!-- Sources: L19-L20 p.720-760 -->

Input projectors map non-text modality features into a representation the LLM can use. Output projectors or generators let the model generate modalities such as image, video, or audio.
<!-- Sources: L19-L20 p.720-790 -->

Architecture challenges include dependency on frozen pretrained backbones, high computation from separate encoders and projectors, limited flexibility for new modalities, and inconsistent multimodal evaluation.
<!-- Sources: L19-L20 p.790-924 -->

### Visual instruction tuning

Visual instruction tuning trains a vision-language model to follow image-grounded instructions. LLaVA connects a vision encoder with a language model and instruction-tunes on generated vision-language instruction data.
<!-- Sources: L19-L20 p.983-1125; Liu 2024 Visual Instruction Tuning abstract, Sec.1-3 -->

LLaVA-1.5 shows that strong baselines can come from simple design choices: an MLP connector, CLIP-ViT-L-336px, and academic VQA data with response-formatting prompts.
<!-- Sources: Liu 2024 Improved Baselines abstract, Sec.1 -->

### Multimodal chain-of-thought

Multimodal chain-of-thought introduces reasoning or rationale generation into MLLMs, extending the chain-of-thought idea from text-only prompting to multimodal reasoning.
<!-- Sources: L19-L20 p.1120-1162 -->

### Multimodal knowledge distillation

Knowledge distillation transfers knowledge from a large teacher model to a smaller student model. In multimodal systems, distillation can involve output distributions, intermediate features, attention maps, and multiple teachers for different modalities.
<!-- Sources: L19-L20 p.1162-1320 -->

## Methods and Workflows

### Building an MLLM

1. Choose the target modalities and tasks.
2. Select modality encoders for image, video, audio, sensors, or other inputs.
3. Use an input projector to align modality features with the LLM backbone.
4. Tune bridge modules, projection layers, adapters, or prompts.
5. Evaluate task performance and cross-modal consistency.
<!-- Sources: L19-L20 p.720-1125; Liu 2024 Visual Instruction Tuning Sec.3 -->

### LVLM instruction tuning

1. Build a corpus of image-instruction-target examples.
2. Freeze core vision and language foundation models where appropriate.
3. Fine-tune bridge modules or projection layers.
4. Use diverse instruction templates for captioning, VQA, visual reasoning, and other tasks.
<!-- Sources: L19-L20 p.983-1125; Liu 2024 Visual Instruction Tuning Sec.3 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Modality integration | asks how image/audio enters an LLM | identify encoder plus projector into the LLM backbone | saying raw images are directly tokenised like words |
| Dataset challenge | asks why multimodal data is hard | discuss diversity, annotation cost, privacy, ambiguity, and alignment | mentioning only dataset size |
| LVLM tuning | asks what is tuned in LLaVA/InstructBLIP | identify projection layer or Q-Former-style bridge | saying the entire LLM is always fully fine-tuned |
| Multimodal distillation | asks teacher-student transfer | distinguish hard labels, soft labels, feature distillation, and attention distillation | treating distillation as ordinary supervised training only |
<!-- Sources: L19-L20 p.520-1320; Liu 2024 Visual Instruction Tuning abstract; Liu 2024 Improved Baselines abstract -->

## Key Comparisons

| Component | Role | Risk |
| --- | --- | --- |
| Modality encoder | extracts features from images, audio, video, or sensors | may not cover new or specialised modalities |
| Input projector | aligns modality features with LLM representations | bottleneck for cross-modal grounding |
| LLM backbone | reasons and generates language-conditioned responses | frozen backbone may limit adaptation |
| Modality generator | produces image, video, audio, or other outputs | expensive and hard to evaluate consistently |
<!-- Sources: L19-L20 p.720-924 -->

| Tuning approach | What changes | Typical use |
| --- | --- | --- |
| LVLM instruction tuning | bridge/projection modules and instruction data | visual assistant behaviour |
| Multimodal CoT | rationale generation or reasoning supervision | multi-step multimodal reasoning |
| PEFT/LoRA | small trainable parameter modules | efficient multimodal adaptation |
| Knowledge distillation | student mimics teacher output/features/attention | cheaper MLLM deployment |
<!-- Sources: L19-L20 p.983-1320 -->

## Revision Checklist

- [ ] Can define multimodality and explain why it matters.
- [ ] Can draw the encoder-projector-LLM architecture.
- [ ] Can explain why multimodal dataset creation is hard.
- [ ] Can distinguish visual instruction tuning from visual prompt tuning.
- [ ] Can explain multimodal distillation.
<!-- Sources: L19-L20 p.3-1320; Liu 2024 Visual Instruction Tuning Sec.1-3 -->

## Active Recall

1. What does an input projector do in an MLLM?
2. Why are multimodal labels often more expensive than text-only labels?
3. How does LLaVA use instruction tuning?
4. Why is evaluation harder for MLLMs than text-only LLMs?
5. What can be distilled besides final output labels?
<!-- Sources: L19-L20 p.520-1320; Liu 2024 Visual Instruction Tuning abstract; Liu 2024 Improved Baselines abstract -->

## Glossary

| Term | Meaning |
| --- | --- |
| MLLM | Multimodal large language model. |
| LVLM | Large vision-language model. |
| Input projector | Module that maps modality features into the LLM representation space. |
| Visual instruction tuning | Instruction tuning for image-language tasks. |
| Multimodal CoT | Reasoning or rationale generation across multiple modalities. |
| Knowledge distillation | Training a smaller student model to mimic a larger teacher. |
<!-- Sources: L19-L20 p.3-1320; Liu 2024 Visual Instruction Tuning abstract -->
