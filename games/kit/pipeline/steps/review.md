# Step 5 · Review

Review the course as a learner using the supplied blueprint, game data, levels, glossary and relevant domain
implementation. This step reports findings; it does not change content. Read `games/DESIGN.md` §§1–4 and 8, and
use `.agents/skills/turing-complete-games/references/learning-review.md` when useful. `./deps`, `./check`, `./lint`,
`./pedagogy` and `./terminology --json` provide evidence but do not establish pedagogical quality on their own.

Assess the actual learning goals, dependencies, conceptual load, available guidance and evidence, interactions,
representative tests, alternative solutions, bilingual copy and accuracy of displays. Scale the review to the
course: do not treat a particular number of concepts, levels, links or control types as inherently correct or wrong.
Identify concrete learning harm and its owner; distinguish a judgment call from an issue that blocks use. Note what
was not visually or interactively verified, and route missing capabilities to the domain step.

Return findings as one JSON block and nothing after it:

```json
{ "findings": [{ "at": "<level id | game | glossary:<id> | blueprint>", "owner": "blueprint | domain | levels | copy", "rule": "<relevant concern or check>", "fix": true, "says": "<evidence, impact and suggested repair>" }] }
```

Use `fix: true` for a demonstrated issue requiring repair before review; `fix: false` for a judgment to leave to the
person. Existing machine gates remain in force separately and may enforce stricter criteria than this guidance.
