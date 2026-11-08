# Learning design review

These prompts help an agent evaluate a course, task or experiment in context. They are not a fixed checklist or
acceptance gate: select the evidence and level of detail appropriate to the learning goal and user request. Engine
contracts and automated checks are documented separately in `games/DESIGN.md`.

## Routes and concepts

Map actual dependencies between knowledge, representations, tools and tasks. Consider whether a serial route,
parallel routes or optional exploration gives learners the right progression. The current `parallel` implementation
is an AND join. For each significant step, consider what is already known, what is new, what can be observed or
tried, what support is available and how the idea transfers to another case.

## Guidance and synthesis

Explain the situation, assumptions, relevant referents and success criteria as needed. Hints can direct attention to
an observation, comparison or intermediate step. A passing explanation can name and explain the relationship, its
reason and its limits without assuming the player followed the reference solution. Glossary links offer useful
reference material but do not replace a visible observation or reasoning support.

## Experiments and displays

Ask what meaningful choice or inference the activity gives the player, which intervention supplies evidence and
what a different case would reveal. A slider, a choice, or submit-only checking may be useful in context; none by
itself guarantees learning. Check that named objects, units, scales, comparisons and feedback correspond to the
model. Inspect desktop and phone flows when visual presentation or interaction matters.

## Evidence and tools

`npm run pipeline -- <game> pedagogy` reports machine-observable candidates; a clean exit does not establish
teaching quality. `npm run pipeline -- <game> terminology --json` checks the existing registry and reports literal
matches for review. Explain findings with the affected task and evidence; route an absent display or model capability
to the domain rather than assuming copy alone can provide it.

For a complex task, an optional worksheet records: task, prior knowledge, new meaning or representation,
observable action, support available before use and a transfer case. When an existing pipeline asks for findings,
its labels remain useful shorthand: `route-serialisation` (unjustified dependency), `concept-jump` (missing
foundation), `guidance-gap` (insufficient visible support), `principle-synthesis` (missing or overbroad conclusion),
`bench-puzzle` (weak decision or evidence), and `display-semantics` (unclear or misleading display). Choose labels
and severity from the actual learning impact; they are not automatic failures based solely on form.
