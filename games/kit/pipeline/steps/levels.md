# Step 3 · Level specs

Turn the supplied blueprint's slots into playable level data using the domain vocabulary and operation set. This
step writes levels and course data, not domain code or the blueprint. Read `games/DESIGN.md` §§1–4 and 5, the
blueprint, vocabulary and a relevant starter or existing level; use `./op list` to inspect available operations.

Design tasks and tests around what the learner can see, do and infer. Choose the appropriate scaffolding and
representative cases, including boundaries and plausible misunderstandings when useful. Check that valid alternative
solutions can satisfy the actual specification. Evaluate benches and other interactions by the evidence and decision
they provide, rather than their form. If a blueprint assumption or domain capability prevents a sound task, report
it to the appropriate earlier step.

Use `level.add`, `level.set`, `game.set` and related operations via `./op --file <file>` (`--dry-run` previews a
changeset). Where starting from a scaffold, update its course and content together; `./eras` provides the blueprint's
course structure. Each changeset is checked as a whole. Run `./check`, `./deps` where useful, and `./gate`.
The existing gate checks content, blueprint conformance and pedagogy lint; it may enforce stricter mechanical
criteria than the handbook's advisory guidance. Report failures, relevant REPORT findings and any substantive
mismatch with the intended design. Summarise the levels, learning evidence and unresolved limitations.
