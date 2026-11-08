# Step 4 · Copy

Refine the player-facing Chinese and English text and glossary through the operation set. This step changes copy,
not tests, boards or course structure. Read `games/DESIGN.md` §§1 and 4, the blueprint, levels, glossary, game data
and relevant part descriptions.

Write naturally and accurately for the intended learner. Provide the context, assumptions, terms, goals and support
that each task needs. Explanations and examples may be used when they help understanding. Pass text should capture
the principle and its scope without assuming the player used a particular reference solution. Review terminology,
links and prerequisites in both languages; a glossary link is useful reference material, not a substitute for the
reasoning or visual evidence needed to play.

Use `text.set`, `level.patch`, `game.set` and glossary operations through `./op --file <file>`; `--dry-run` previews
changes. `./terminology`, `./lint`, `./check` and `./gate` report the current registry, copy and pipeline checks.
These checks may enforce stricter mechanical criteria than the handbook's advisory teaching guidance. Distinguish
an automatic failure from a judgment about learning, and report limitations or issues owned by earlier steps.
