# Note Taking Guidelines

## Purpose

- These notes are evidence-backed study notes rather than free-form summaries.
- Every factual claim must be traceable to lecture slides, workshop slides, assigned readings, or linked papers stored or referenced for the course.
- For lecture and tutorial PDF summarization, also follow [OBSIDIAN_PDF_STUDY_NOTE_WORKFLOW.md](OBSIDIAN_PDF_STUDY_NOTE_WORKFLOW.md).

## Source annotation rules

- Put provenance in Markdown comments, not in visible prose.
- Use HTML comments in the form `<!-- Sources: ... -->`.
- Place the comment immediately after the paragraph, bullet, formula, table, or list block it supports.
- Default to one source comment per bullet or paragraph.
- A single source comment may follow a tightly coupled block only when it unambiguously covers every assertion in that block.
- If a statement combines information from multiple sources, list all of them in the same comment.

## Visible writing rules

- Write claims directly.
- Do not use source-reporting phrasing in visible text, such as:
  - `The lecture says...`
  - `The reading argues...`
  - `JM3 notes...`
- Do not expose inline citations like `[Sources: ...]` in rendered Markdown.
- Keep the visible text focused on the concept, definition, method, result, or comparison itself.

## Evidence boundary rules

- Do not add unsupported background knowledge.
- Do not merge several source claims into a stronger claim unless that stronger wording is explicitly supported.
- When a lecture and a reading make the same point, cite both only if both are actually used.
- If a formula or table is derived directly from a slide or paper, cite that source in a Markdown comment immediately below the display block.

## Visualisation rules

- Add tables when they improve comparisons, taxonomies, workflows, or architecture summaries.
- Add LaTeX formulas when the course material presents the method mathematically and the formula materially improves the note.
- Keep formulas and tables source-backed in the same way as prose.
- Do not add decorative diagrams that introduce unstated relationships.

## File structure rules

- Prefer one file per lecture topic cluster rather than one file per raw PDF.
- Start with the concept, not with commentary about the source.
- Use short sections with stable headings so the note can be reviewed quickly before class, tutorials, or exams.
- Keep all documentation text and all Markdown comments in English.

## Local material handling rules

- Course source files and external readings may be stored locally for reference.
- Store raw materials inside gitignored directories such as `lecture/`, `workshop/`, `tutorial/`, and `readings/`.
- Commit only the cleaned Markdown notes unless the task explicitly requires otherwise.

## Minimal example

```md
- Hidden Markov models factor sequence labelling into transition and emission probabilities.
<!-- Sources: L6 p.4-7; JM3 Ch.17.4 -->

$$
\hat{t}_{1:n} = \arg\max_{t_{1:n}} \prod_{i=1}^{n} P(w_i \mid t_i) P(t_i \mid t_{i-1})
$$
<!-- Sources: L6 p.4-5 -->
```
