---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Retrieval-Augmented and Knowledge-Augmented LMs
source_type: lecture+reading
status: draft
review_priority: high
---

# 15 Retrieval and Knowledge-Augmented LMs

## Big Picture

Retrieval-augmented language models use external datastores or knowledge bases so generation is not limited to static parametric knowledge. The model can look up supporting documents or facts during inference and use them as context before producing an answer.
<!-- Sources: L21 p.3-7; Borgeaud 2022 abstract, Sec.2 -->

Knowledge-augmented LMs extend this idea from unstructured retrieved text to structured knowledge such as knowledge graphs and commonsense resources. This is important because relevant facts are not always useful reasoning paths, and parametric knowledge can be stale, opaque, or difficult to verify.
<!-- Sources: L21 p.15-25, p.27-40; Zhao 2024 abstract, Sec.1 -->

## Learning Map

- Prerequisite ideas: LLM prompting, vector similarity, indexing, transformers, knowledge graphs, and chain-of-thought prompting.
<!-- Sources: L21 p.3-25; Zhao 2024 Sec.1 -->
- Core concepts: datastore, retriever, top-k documents, RAG, frozen RAG, RETRO, sparse retrieval, dense retrieval, knowledge graph, KG-CoT, ConceptNet, and ATOMIC.
<!-- Sources: L21 p.3-40; Borgeaud 2022 Sec.2; Zhao 2024 abstract, Sec.1 -->
- Main procedures: retrieve relevant context, add it to the prompt or architecture, generate with evidence, or construct KG reasoning paths for the LLM.
<!-- Sources: L21 p.7-25; Borgeaud 2022 Sec.2; Zhao 2024 Sec.1 -->
- Common traps: assuming all retrieved text is reliable, confusing retrieval relevance with reasoning usefulness, or ignoring indexing cost during training.
<!-- Sources: L21 p.20-25, p.32-37; Zhao 2024 Sec.1; Borgeaud 2022 Sec.4.4 -->

## Core Concepts

### Retrieval-augmented language model

> [!definition]
> A retrieval-augmented LM retrieves relevant information from an external datastore or knowledge base and conditions generation on that information.

RAG can be summarised as retrieve, add, generate: retrieve relevant information, add it to the user prompt or model context, then generate an answer using the augmented context.
<!-- Sources: L21 p.3-7 -->

Retrieval improves interpretability and control because retrieved sources can be traced and cited, but it also introduces retrieval quality, relevance, and datastore governance problems.
<!-- Sources: L21 p.10-15; Borgeaud 2022 Broader Impact Statement -->

### Two RALM paths

One path builds a language model with a built-in retrieval component, as in RETRO. This treats retrieval as part of the architecture and raises technical questions about datastore granularity, retriever representation, and how retrieved contexts are integrated into transformer layers.
<!-- Sources: L21 p.7-15; Borgeaud 2022 Sec.2 -->

The second path treats retrieval as a tool used by an already powerful frozen LLM. In this pattern, a retrieval API or search engine is called when needed and returned results are inserted into context.
<!-- Sources: L21 p.7-9 -->

### RETRO

RETRO retrieves chunks of 64 tokens using frozen BERT representations and integrates retrieved contexts through extra encoder/cross-attention machinery inside a transformer.
<!-- Sources: L21 p.34-38; Borgeaud 2022 Sec.2 -->

The lecture highlights that RETRO uses 150M to 7B parameter LMs with a datastore up to about 2T tokens and can obtain comparable performance to GPT-3 on the Pile with far fewer parameters, although it is not a specialised QA model.
<!-- Sources: L21 p.13-15, p.34-38; Borgeaud 2022 abstract, Sec.4 -->

Training retrieval-augmented models is hard because both the LM and retriever/index may be large, and updating an index during training is expensive.
<!-- Sources: L21 p.39-45; Borgeaud 2022 Sec.2 -->

### Knowledge graphs

A knowledge graph is a directed labelled graph where entities are nodes and relationships are labelled edges. Knowledge graphs can integrate structured, semi-structured, and unstructured sources into a connected representation.
<!-- Sources: L21 p.47-52 -->

Domain-specific knowledge graphs can be used in clinical, financial, and legal settings where specialist knowledge matters.
<!-- Sources: L21 p.53-56 -->

### KG-CoT

KG-CoT uses a small graph reasoning model to build explicit reasoning paths over a knowledge graph, then provides those paths to a large LLM for knowledge-aware question answering.
<!-- Sources: L21 p.57-60; Zhao 2024 abstract, Sec.1 -->

KG-CoT addresses two problems: LLM parametric knowledge may be unavailable, outdated, or unreliable, and fragmented retrieved facts may be relevant without forming a coherent reasoning path.
<!-- Sources: L21 p.57-60; Zhao 2024 abstract, Sec.1 -->

### Commonsense knowledge

Commonsense resources such as ConceptNet and ATOMIC encode everyday semantic or event knowledge that can augment LMs in tasks requiring implicit world knowledge.
<!-- Sources: L21 p.62-69 -->

## Methods and Workflows

### RAG workflow

1. Store documents, chunks, or facts in a datastore.
2. Represent the query and datastore items for retrieval.
3. Search for top-k relevant items using sparse or dense retrieval.
4. Add retrieved context to the prompt or integrate it inside the architecture.
5. Generate the answer and preserve evidence traceability where possible.
<!-- Sources: L21 p.3-25 -->

### KG reasoning workflow

1. Identify entities or concepts in the question.
2. Retrieve or traverse relevant graph relations.
3. Build explicit reasoning paths rather than isolated facts.
4. Provide the paths as knowledge chains to the LLM.
5. Generate a knowledge-aware answer.
<!-- Sources: L21 p.47-60; Zhao 2024 abstract, Sec.1 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| RAG architecture | prompt plus datastore and top-k documents | describe retrieve-add-generate | saying the LM memorised the answer |
| RETRO detail | asks about built-in retrieval | mention 64-token chunks, frozen BERT retriever, and architecture integration | treating RETRO as ordinary prompt-only RAG |
| Training difficulty | asks why RALM training is hard | explain index updates and LM training are both expensive | focusing only on model size |
| KG-CoT | asks why KG paths help | explain coherent graph reasoning paths over isolated facts | assuming relevance equals usefulness |
<!-- Sources: L21 p.3-60; Borgeaud 2022 Sec.2; Zhao 2024 Sec.1 -->

## Key Comparisons

| Approach | External source | Integration | Main strength | Main risk |
| --- | --- | --- | --- | --- |
| Frozen RAG | search API or datastore | retrieved text in prompt | easy to add to existing LLMs | retrieval quality and context limits |
| RETRO | large text datastore | architecture-level retrieval | scale with fewer parameters | training and indexing complexity |
| KG-CoT | knowledge graph | explicit reasoning paths in prompt | interpretable knowledge-aware reasoning | KG coverage and path quality |
| Commonsense KG | semantic/event graph | retrieved commonsense facts or paths | implicit everyday knowledge | noisy or incomplete commonsense coverage |
<!-- Sources: L21 p.7-69; Borgeaud 2022 abstract, Sec.2; Zhao 2024 abstract, Sec.1 -->

## Revision Checklist

- [ ] Can explain retrieve-add-generate.
- [ ] Can distinguish built-in retrieval from frozen RAG.
- [ ] Can explain why retrieval helps interpretability.
- [ ] Can explain why a KG path can be better than isolated retrieved facts.
- [ ] Can name ConceptNet and ATOMIC as commonsense knowledge resources.
<!-- Sources: L21 p.3-69; Borgeaud 2022 Sec.2; Zhao 2024 Sec.1 -->

## Active Recall

1. Why can external retrieval reduce pressure on parametric memory?
2. What design choices define a RALM datastore?
3. Why is RETRO not just a normal prompt with search results?
4. What is the cognition gap between retrievers and LLM reasoning?
5. Why does commonsense knowledge matter for VQA or QA?
<!-- Sources: L21 p.3-69; Borgeaud 2022 Sec.2; Zhao 2024 Sec.1 -->

## Glossary

| Term | Meaning |
| --- | --- |
| RAG | Retrieval-augmented generation. |
| Datastore | External collection of documents, chunks, or facts for retrieval. |
| Sparse retrieval | Retrieval based on sparse lexical signals. |
| Dense retrieval | Retrieval using learned dense vector representations. |
| RETRO | Retrieval-Enhanced Transformer using retrieved chunks in the architecture. |
| Knowledge graph | Directed labelled graph of entities and relations. |
| KG-CoT | Chain-of-thought prompting over knowledge graphs. |
<!-- Sources: L21 p.3-69; Borgeaud 2022 Sec.2; Zhao 2024 abstract -->
