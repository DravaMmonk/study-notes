# Step 1 · Course blueprint

Develop the course blueprint from the supplied sources, topic brief and current domain vocabulary. This step writes
`blueprint.json` through the operation set; it does not write levels, copy or domain code.

Read `games/DESIGN.md` §§1–4 and 6.5, the source materials, `games/kit/pipeline/blueprint.js` (schema and audit),
and the supplied vocabulary. Consider the learner's goals and prior knowledge, the concepts and dependencies,
meaningful activities, the intended course scope, and what the domain can express. Use the handbook as guidance:
choose the number of levels, task structure, routes and scaffolding for the topic, not from a fixed teaching formula.
The current `parallel` layout requires all routes before the join.

Describe the course, sources, knowledge, machines, mechanisms, parts, eras, series and slots in the schema's terms.
Record `requests` for needed domain or kernel capabilities, with affected slots and status. Explain deferred scope,
design tradeoffs and uncertain prerequisites. For each slot, provide enough of its question, actions and evidence
for the level designer to develop and review it. Texts are written in the game's base language and ids follow the schema.

Write a changeset with `blueprint.put` or `blueprint.set` and run `./op --file <file>`, then `./gate`. The existing
blueprint audit has both FAIL and REPORT findings; it may enforce stricter mechanical criteria than the handbook's
advisory teaching guidance. Resolve reported failures through the pipeline's supported workflow, and explain any
mismatch between a check and a sound design rather than presenting the check as educational proof. Report the
blueprint's shape, important choices, requests, remaining reports and uncertainties.
