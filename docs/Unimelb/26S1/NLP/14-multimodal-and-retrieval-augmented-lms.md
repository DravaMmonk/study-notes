---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Multimodal and Retrieval-Augmented Language Models
source_type: reading
status: draft
review_priority: medium
---

# 14 Multimodal and Retrieval-Augmented Language Models

## Big Picture

Later course topics move from adapting language-only models to extending LMs with other information sources: images, retrieved text, and structured knowledge graphs. The common problem is that parametric memory inside model weights is limited, difficult to update, and not always enough for grounded or knowledge-intensive tasks.
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract, Sec.1; Borgeaud 2022 abstract, Sec.2; Zhao 2024 abstract, Sec.1 -->

This note is reading-backed because L19-L21 lecture slides are not currently in the repository. It organises the downloaded readings into a study framework for multimodality and retrieval.
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract; Liu 2024 Improved Baselines abstract; Borgeaud 2022 abstract; Zhao 2024 abstract -->

## Learning Map

- Prerequisite ideas: instruction tuning, transformer encoders and decoders, in-context learning, and hallucination in LLM outputs.
<!-- Sources: Liu 2024 Visual Instruction Tuning Sec.1-2; Zhao 2024 Sec.1 -->
- Core concepts: visual instruction tuning, large multimodal models, vision-language connector, retrieval-enhanced transformers, and knowledge-graph chain-of-thought.
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract; Liu 2024 Improved Baselines abstract; Borgeaud 2022 abstract, Sec.2; Zhao 2024 abstract -->
- Main procedures: connect a vision encoder to an LLM, retrieve text chunks during language modelling, or generate reasoning paths over a knowledge graph before prompting an LLM.
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract, Sec.1; Borgeaud 2022 Sec.2; Zhao 2024 abstract, Sec.1 -->
- Common traps: treating all retrieval as reliable grounding, assuming retrieved facts automatically form a reasoning path, and confusing visual instruction tuning with visual prompt tuning.
<!-- Sources: Liu 2024 Visual Instruction Tuning Sec.2; Zhao 2024 abstract, Sec.1; Borgeaud 2022 Sec.4.4 -->

## Core Concepts

### Visual instruction tuning

<!-- Figure source: Liu 2024 Visual Instruction Tuning p.3 -->

> [!definition]
> Visual instruction tuning adapts a multimodal model to follow language-image instructions, usually by training on image-instruction-response data.

LLaVA connects a CLIP-style visual encoder with a language decoder and tunes the combined system on generated vision-language instruction data.
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract, Sec.1 -->

The original LLaVA work uses language-only GPT-4 to help generate multimodal instruction-following data from image-text pairs, then instruction-tunes a large multimodal model on that data.
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract, Sec.3 -->

Visual instruction tuning differs from visual prompt tuning: visual instruction tuning targets instruction-following ability in a multimodal assistant, while visual prompt tuning is a parameter-efficient adaptation method.
<!-- Sources: Liu 2024 Visual Instruction Tuning Sec.2; L15-L16 p.67 -->

### Improved LLaVA baselines

LLaVA-1.5 shows that simple design choices can produce strong multimodal baselines: a CLIP-ViT-L-336px visual encoder, an MLP projection connector, and added academic-task-oriented VQA data with response-formatting prompts.
<!-- Sources: Liu 2024 Improved Baselines abstract, Sec.1 -->

The paper emphasises reproducible, data-efficient baselines: the final 13B checkpoint uses 1.2M publicly available training samples and finishes full training in about one day on a single 8-A100 node.
<!-- Sources: Liu 2024 Improved Baselines abstract -->

### Retrieval-enhanced language modelling

<!-- Figure source: Borgeaud 2022 p.3 -->

> [!definition]
> Retrieval-augmented language modelling conditions generation on external retrieved text rather than relying only on parametric memory.

RETRO retrieves neighbouring text chunks from a database with trillions of tokens and integrates them into an autoregressive transformer through a retrieval-enhanced architecture.
<!-- Sources: Borgeaud 2022 abstract, Sec.2 -->

RETRO retrieves at the chunk level to reduce storage and computation, uses frozen BERT embeddings as retrieval keys, and augments each chunk with nearest-neighbour retrieved chunks.
<!-- Sources: Borgeaud 2022 Sec.2 -->

Retrieval can improve factuality and interpretability by making some external evidence visible, but retrieval data can also introduce bias, leakage, or irrelevant neighbours if not controlled.
<!-- Sources: Borgeaud 2022 Sec.4.4, Broader Impact Statement -->

### Knowledge-graph chain-of-thought

<!-- Figure source: Zhao 2024 p.3 -->

KG-CoT targets knowledge-intensive question answering by generating explicit reasoning paths over a knowledge graph before prompting the LLM.
<!-- Sources: Zhao 2024 abstract, Sec.1 -->

The method combines a large LLM with a smaller step-by-step graph reasoning model. The graph model scores relations, traverses high-confidence KG paths, and turns those paths into chains of knowledge for the LLM.
<!-- Sources: Zhao 2024 abstract, Sec.1 -->

KG-CoT addresses two limitations of ordinary LLM prompting: parametric knowledge may be outdated or unreliable, and fragmented retrieved facts may not provide a coherent reasoning path.
<!-- Sources: Zhao 2024 abstract, Sec.1 -->

## Methods and Workflows

### Building a visual instruction model

1. Start with an image-text data source.
2. Convert image-text pairs into instruction-following examples.
3. Connect a visual encoder to an LLM through a projection or connector.
4. Tune the model on visual instruction data.
5. Evaluate both conversational instruction following and task-oriented VQA benchmarks.
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract, Sec.3; Liu 2024 Improved Baselines abstract, Sec.1 -->

### Retrieval-augmented generation pattern

1. Build or select an external text or knowledge database.
2. Encode queries or chunks for retrieval.
3. Retrieve relevant neighbours or facts.
4. Inject retrieved information into the model context or architecture.
5. Generate the answer while tracking whether retrieved evidence is relevant and current.
<!-- Sources: Borgeaud 2022 Sec.2; Zhao 2024 abstract, Sec.1 -->

## Key Comparisons

| Approach | External source | How it enters the model | Best suited for | Main risk |
| --- | --- | --- | --- | --- |
| Visual instruction tuning | images plus language instructions | vision encoder and connector into LLM | multimodal assistants and VQA | weak visual grounding or hallucination |
| RETRO-style retrieval | large text database | retrieved chunks integrated during language modelling | factual continuation and retrieval-aware LM | leakage, irrelevant retrieval, retrieval bias |
| KG-CoT | structured knowledge graph | explicit reasoning paths used in prompting | knowledge-intensive QA | KG coverage and path quality |
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract; Liu 2024 Improved Baselines abstract; Borgeaud 2022 abstract, Sec.2; Zhao 2024 abstract, Sec.1 -->

## Revision Checklist

- [ ] Can explain how LLaVA connects vision and language components.
- [ ] Can distinguish visual instruction tuning from visual prompt tuning.
- [ ] Can describe why retrieval helps with parametric knowledge limitations.
- [ ] Can explain why knowledge-graph paths may be more useful than isolated retrieved facts.
<!-- Sources: Liu 2024 Visual Instruction Tuning Sec.1-2; Borgeaud 2022 abstract, Sec.2; Zhao 2024 abstract, Sec.1 -->

## Active Recall

1. What problem does a vision-language connector solve in LLaVA?
2. Why does RETRO retrieve chunks rather than individual tokens?
3. What are the two challenges KG-CoT is designed to address?
4. Why can retrieval improve factuality but still introduce risk?
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract, Sec.1; Borgeaud 2022 Sec.2, Broader Impact Statement; Zhao 2024 abstract, Sec.1 -->

## Glossary

| Term | Meaning |
| --- | --- |
| LMM | Large multimodal model, a model that handles language plus another modality such as vision. |
| Visual instruction tuning | Instruction tuning for image-language tasks. |
| Vision-language connector | A module that maps visual features into a form usable by a language model. |
| RETRO | Retrieval-Enhanced Transformer, a language model architecture that retrieves text chunks. |
| KG-CoT | Chain-of-thought prompting over knowledge graphs for knowledge-aware question answering. |
<!-- Sources: Liu 2024 Visual Instruction Tuning abstract; Liu 2024 Improved Baselines abstract; Borgeaud 2022 abstract; Zhao 2024 abstract -->
