# Branches, learning steps and experimental benches

Read with `games/DESIGN.md` §4.3 when planning or reviewing a chapter, a multi-task level, or a non-assembly
interaction. These are authoring and static semantic review requirements, not a substitute for visual inspection
or evidence that the current game already meets them.

## 1. Required routes and optional topics

Start from knowledge dependencies and the parts each reference answer actually consumes, not the current list of
levels. For each proposed serial edge record the fact, representation or reusable part that makes it necessary.
A numbered order, a shared theme or an earlier file is not a dependency.

| Route | Player's choice | Required evidence |
| --- | --- | --- |
| Required parallel routes | Choose which route to study first; complete both before a join that uses both | Shared anchor, independent concepts inside each route, exact prerequisites at each join |
| Required serial route | Continue after learning the thing the next task genuinely needs | The necessary concept or part, with a source and its introduction |
| Optional topic | Choose whether to study it at all | A prerequisite anchor; nothing mandatory depends on its definitions or outputs |

The shared `parallel` contract is an AND join, not “pick one and skip the other.” Do not invent alternative-completion
semantics. If either route is intended to replace the other, specify equivalent competence and a supported completion
rule separately. Do not split merely to make a fork appear. For a wholly serial chapter, explain why each edge is
necessary; `pd-serial-chapter` is only a candidate report, not proof that branching is possible.

Before accepting a branch, walk both study orders. Neither route may cite an unexplained concept from its sibling.
Core lecture ladders remain required; genuinely peripheral material can be optional even if it also occurs in a
lecture. Workshop-only or implementation material stays optional. Update the design before changing actual topology.

## 2. A knowledge inventory at every task boundary

A single `teaches` id does not prove that a level introduces only one idea. For each task list:

- What the learner knows on every prerequisite path, including what earlier tasks actually taught.
- New terms, representation changes, units, geometric conventions and inferential operations.
- Where each is defined, observed and practised, before it is needed.
- What the learner must infer, and the visible evidence that permits that inference.

Distinguish a new name for an already observed thing from an independent reasoning step. Several unfamiliar names
can be explained together when they describe one object; several independent changes cannot be hidden in one task.
When the learner must simultaneously convert physical length to pixels, move an origin and interpret an angle,
show how these steps were acquired. If they were not, request a decomposition or prerequisite correction instead
of adding the final formula to a hint. Foundational steps can be tasks within a level when they serve one question;
a substantial independent point deserves its own question and place on the graph. Never create arithmetic-tool
levels or padding just to increase the count.

Static worksheet (include evidence in the course's review record):

| Level/task | Guaranteed prior knowledge | New meaning or representation | Visible observation/action | Support before use | Transfer check |
| --- | --- | --- | --- | --- | --- |

A checked glossary link verifies access, not understanding. For a hard step, a definition alone may be insufficient:
identify the small observation or action that makes it usable. Apply this to both languages, hints and summaries.

## 3. Guidance and principle-level synthesis

Before solving, an intro establishes the physical or conceptual situation, model assumptions, named referents,
known quantities, the question and the success criterion. Give definitions and conventions; leave the target
relation or construction to discover. A prompt such as “watch the ray” is useful only if the ray is visible then.

Hints repair a specific missing step: what to observe; what to vary while holding something fixed; what contrast
to examine; then, when needed, an intermediate scaffold. They must refer to controls and quantities available in
that task. “Try again” is not guidance, and a recipe for the complete answer is not scaffolding.

After discovery, synthesis explains what relationship the observation establishes, why the model accounts for it,
and the limits of the conclusion. It may state a general relation already discovered and discuss what remains
underdetermined. It must not replay a particular board, target value, or sequence of controls. Definitions needed
before solving cannot be deferred to this summary. Concision follows completeness; neither a decorative slogan
nor a long encyclopedia paragraph is sufficient by itself.

For inverse problems, separate ambiguity from conditional reconstruction: assuming a depth permits one calculation;
it does not recover the actual depth from the image. Never generalise an experiment into claims its controlled
model did not establish (for example, a photograph does not in general determine hidden object counts or intrinsic
surface colours).

## 4. A bench must teach through its interaction

Do not approve a non-assembly level merely because the model and its solver agree. State:

- The question, plausible competing explanations and the learner's meaningful decision.
- Which intervention separates those explanations; what is fixed; what can be observed before and after checking.
- Why scanning a slider or reading a green indicator does not replace the intended reasoning.
- The counterexample or changed case that tests transfer beyond one numeric target.

Discovery and assessment need different visibility. A discovery activity must expose the causal evidence it asks
the learner to inspect. An assessment may withhold a result until submission, but must provide adequate prior
learning and explanatory feedback afterwards. Adding a submit button alone does not turn blind search into a good
puzzle. Where both are needed, design separate phases using supported mechanisms; request domain work instead of
scripting an editor inside content.

## 5. The domain owns the explanatory picture

Read the domain's design contract; for vision this is `games/kit/domains/vision/DESIGN.md`. Require a mapping from
each concept to a named object, mark or measurement on screen, with matching labels in controls and feedback.
A glossary is not a replacement for labels. Check geometry, units, coordinate directions, scales, baseline/changed
states, and the relation between manipulated objects and derived outputs.

Visual quality is part of teaching: readable labels with leaders where needed, a coherent hierarchy of scene,
measurement and action, distinguishable marks beyond colour alone, meaningful motion and direct comparison.
Decorative 3D and more animation are not acceptance criteria. Static source can reveal missing referents, inconsistent
units or visibility contradictions; it cannot establish that text is legible, motion clear or touch interaction
usable. Those require desktop/phone screenshots and actual interaction. Mark them unverified until inspected.

## Review findings and ownership

| Rule | What fails | Owner |
| --- | --- | --- |
| `route-serialisation` | Independent required learning is serialised, or optional learning gates a core route | blueprint |
| `concept-jump` | A task requires several unacquired concepts, representations or operations | blueprint / levels |
| `guidance-gap` | The stated reasoning cannot be followed from visible evidence and reachable hints | levels / copy / domain |
| `principle-synthesis` | A core introduction ends with a name or formula only, or a summary makes an unsupported claim | copy |
| `bench-puzzle` | The bench passes by blind search without exercising the intended concept | blueprint / levels |
| `display-semantics` | A named referent, measurement convention or causal change is missing or misleading | domain |

Use the existing finding shape with `fix: true` for a concrete learning blocker. Cite the level/task, text field or
source function, the missing prior knowledge or visible evidence, and the required repair. Route domain findings to
the domain step; do not ask the copy writer to fake an absent capability. Subjective polish without demonstrated
learning harm is a review note, not a claimed deterministic failure. An uninspected screen is “unverified,” not
“passed” or an invented visual defect.

## Read-only structural check

Run `npm run pipeline -- <game> pedagogy` from `trace-viewer/` (the review agent has `./pedagogy`). It reports
machine-observable risks, including wholly serial chapter topology, without creating a pipeline run, gate or
changeset. REPORT findings do not fail the command; deterministic FAIL findings do. A clean exit is not semantic
approval. Complete the worksheet and resolve the learning blockers through the appropriate design/domain step.

## Registered terminology review

`npm run pipeline -- <game> terminology --json` reads the game's existing glossary and schema-declared content,
without writing content or review state. Titles/aliases form the term names; existing entry bodies are the
explanations, available at their existing `at` level (or globally when omitted). No task-level opening behaviour is
introduced. Before adding a new timing field, specify its UI and migration semantics; do not pretend a metadata
field changes when an explanation can be opened.

Automatic failures cover empty definitions/names, duplicate ids, conflicting names/aliases, unregistered explicit
references and unavailable explanations. Bare occurrences of registered names are review candidates because the
same spelling may be ordinary language. Independently extract technical terms missing from the registry and inspect
domain UI/diagram vocabulary not held in schema-declared content. Every confirmed unregistered or unlinked
professional use blocks semantic approval. The dictionary and text must be corrected through existing glossary/text
operations, not by auto-generating definitions or duplicating the registry.
