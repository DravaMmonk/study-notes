# Obsidian PDF Study Note Workflow

## Purpose

This document is the standing workflow for converting lecture PDFs and tutorial PDFs into high-quality study and revision notes in this vault.

The output should help a first-time learner understand the overall knowledge framework quickly, then support later revision with clear structure, examples, comparisons, and active recall prompts.

Follow this document together with [NOTE_TAKING_GUIDELINES.md](NOTE_TAKING_GUIDELINES.md). The evidence and source-comment rules in that file still apply.

## Installed Obsidian plugins to use

### PDF reading and extraction

- `PDF++`: Use for Obsidian-native PDF reading, annotation, and navigation when manually inspecting lecture or tutorial PDFs.
- `Text Extractor`: Use when PDF text or image-based content needs extraction for search or review.
- `Omnisearch`: Use for searching notes, PDFs, and OCR text across the vault.
- `PDF Paste`: Use when copying text from PDFs; clean line breaks and hyphenation before turning copied material into notes.

### Writing structure and editing

- `Outliner`: Use for drafting hierarchical topic frameworks before writing full prose.
- `Lapel`: Use heading-level gutter labels to keep section hierarchy visible while editing.
- `Note Refactor`: Use to split large lecture summaries into focused concept notes when a section becomes independently reusable.
- `Advanced Tables`: Use for comparisons, taxonomies, algorithm summaries, and tutorial pattern tables.
- `Admonition`: Use for callout-style blocks such as definitions, warnings, examples, exam traps, and key intuitions.
- `Highlightr`: Use sparingly for visually marking important review targets.
- `Various Complements`: Use as writing assistance only; do not accept completions that add unsupported facts.

### Templates, consistency, and retrieval

- `Templater`: Use for repeatable lecture, tutorial, concept, and revision-note templates.
- `QuickAdd`: Use for fast creation of standard note types once captures/templates are configured.
- `Linter`: Use after writing to standardize Markdown, YAML frontmatter, headings, spacing, and lists.
- `Dataview`: Use for topic indexes, revision dashboards, open questions, and exam checklist aggregation.
- `Tag Wrangler`: Use to keep tags consistent across courses and topics.
- `Better Word Count`: Use when a concise explanation target or revision summary length matters.
- `Smart Connections`: Use to discover related notes; verify any suggested relationship manually before adding links.

### Core Obsidian features to use

- `Outline`: Check whether a note has a clear learning hierarchy.
- `Backlinks` and `Outgoing links`: Connect prerequisites, related concepts, and follow-up topics.
- `Properties`: Store course, topic, source type, status, and review metadata.
- `Bases`: Build course-level or exam-level views from note properties.
- `Templates`: Use for simple non-scripted templates if Templater is unnecessary.
- `Note composer`: Merge or split notes when lecture boundaries do not match concept boundaries.
- `Word count`: Check note size and section balance.

## Core writing principles

### Start with the knowledge framework

Every substantial note should begin by making the structure of the topic visible. Prefer this order:

1. What problem the topic solves.
2. Where it fits in the course.
3. The prerequisite ideas needed to understand it.
4. The main concepts and how they relate.
5. The standard procedures, algorithms, or reasoning patterns.
6. How tutorials apply the lecture concepts.
7. What to remember for revision or exams.

Do not start by narrating the PDF. Start by explaining the topic.

### Make first-time learning easy

For each major concept, include:

- A plain-English intuition.
- A precise definition.
- The conditions where it applies.
- A small example or counterexample.
- A comparison with nearby concepts that are easy to confuse.
- A short explanation of why the concept matters.

Avoid unexplained jargon. If a term is necessary, define it before using it heavily.

### Merge lectures and tutorials by concept

Lecture PDFs usually introduce theory. Tutorial PDFs usually reveal how the theory is used. The final note should combine them by concept, not by file order.

Use this pattern:

- Lecture concept: definition, intuition, formula, workflow.
- Tutorial application: how the concept appears in questions or exercises.
- Revision cue: what a student should be able to do after studying it.

### Preserve evidence without clutter

Visible prose should read like a coherent study note. Source provenance belongs in Markdown comments immediately after the supported block, following `NOTE_TAKING_GUIDELINES.md`.

Example:

```md
Dynamic programming is useful when a problem has overlapping subproblems and an optimal substructure, so intermediate results can be reused instead of recomputed.
<!-- Sources: Lecture 04 p.12-15; Tutorial 04 Q2 -->
```

### Prefer structure over volume

High-quality notes are not longer summaries. They are better organized explanations.

Cut or compress:

- Repeated slide text.
- Administrative content.
- Motivational examples that do not teach a reusable concept.
- Derivations that are not required for understanding or assessment.

Keep or expand:

- Definitions.
- Algorithms.
- Assumptions.
- Edge cases.
- Common mistakes.
- Tutorial question patterns.
- Formula meaning and variable definitions.

## Standard note structure

Use this structure for a lecture-plus-tutorial topic note unless the course material clearly calls for a different shape.

```md
---
course:
semester:
topic:
source_type: lecture+tutorial
status: draft
review_priority:
---

# Topic Name

## Big Picture

- One or two paragraphs that explain what this topic is for and how it fits into the course.

## Learning Map

- Prerequisite ideas:
- Core concepts:
- Main procedures:
- Tutorial skills:
- Common traps:

## Core Concepts

### Concept 1

> [!definition]
> Clear definition.

Intuition, explanation, example, and contrast.

### Concept 2

...

## Methods and Workflows

### Method Name

1. Step one.
2. Step two.
3. Step three.

State assumptions, inputs, outputs, and failure cases.

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
|  |  |  |  |

## Key Comparisons

| Concept A | Concept B | Difference | When to Use |
| --- | --- | --- | --- |
|  |  |  |  |

## Revision Checklist

- [ ] Can explain the big picture without reading the note.
- [ ] Can define each core term.
- [ ] Can solve the tutorial pattern without looking at the solution.
- [ ] Can identify common traps.

## Active Recall

1. Question?
2. Question?
3. Question?

## Glossary

| Term | Meaning |
| --- | --- |
|  |  |
```

## Workflow for summarizing PDFs

### 1. Inventory the sources

Before writing, identify all relevant PDFs:

- Lecture slides.
- Tutorial sheets.
- Tutorial solutions.
- Workshop material.
- Required readings, if directly tied to the lecture.

Record page numbers or slide numbers while reading. Use exact page references in hidden source comments.

### 2. Extract the topic skeleton

Skim headings, learning objectives, formulas, diagrams, and tutorial question titles. Draft a hierarchy before writing detailed prose.

Use `Outliner`, `Outline`, and `Lapel` to check that the hierarchy is coherent.

### 3. Build the conceptual map

Group material into concepts instead of copying slide order. Ask:

- What are the main ideas?
- Which ideas depend on earlier ideas?
- Which ideas are alternatives or contrasts?
- Which ideas become procedures in tutorials?
- Which ideas are likely assessment targets?

### 4. Write explanatory notes

For every core concept, write from intuition to precision:

1. Plain-English intuition.
2. Formal definition or formula.
3. Example.
4. Tutorial usage.
5. Common mistake.

Use tables when comparisons would otherwise become long prose.

### 5. Add retrieval and revision aids

Add:

- Links to prerequisite notes.
- Links to related course topics.
- Tags only when they are stable and reusable.
- Active recall questions.
- Revision checklist items.

Use `Dataview` later to aggregate these across a course.

### 6. Refactor for maintainability

If a section becomes broadly reusable, split it into a concept note with `Note Refactor` and link it from the lecture-topic note.

Keep lecture-topic notes useful as a learning path. Keep concept notes useful as reusable references.

### 7. Clean and verify

Before considering a note finished:

- Run or apply `Linter` rules in Obsidian.
- Check heading hierarchy with `Outline` and `Lapel`.
- Search with `Omnisearch` for duplicate or related notes.
- Use `Smart Connections` to find potential missing links, then verify manually.
- Confirm every factual block has a hidden source comment.
- Confirm tutorial material is integrated into the relevant concepts.

## Quality checklist

A finished note should satisfy all of these:

- The first screen explains the topic's purpose and place in the course.
- The heading structure shows the knowledge framework clearly.
- A new learner can follow the note without reading the slides first.
- Definitions are separated from examples and common mistakes.
- Tutorial applications are connected to lecture concepts.
- Tables are used for comparisons or procedures where they improve scanning.
- Formulas define variables and explain meaning.
- Source comments exist for factual claims, formulas, tables, and diagrams.
- Links connect prerequisites, related topics, and follow-up material.
- The note contains active recall prompts for revision.
- The note avoids unsupported facts and visible source-reporting prose.

## Default behavior for future AI note creation

When I summarize lecture and tutorial PDFs in this vault, I should:

1. Read all supplied course PDFs before finalizing the note structure.
2. Produce concept-organized notes rather than file-by-file summaries.
3. Write for first-time understanding first, then revision efficiency.
4. Preserve source traceability using hidden Markdown comments.
5. Use installed Obsidian plugins and core features according to this workflow.
6. Keep final notes in English unless the user explicitly asks for another language.
