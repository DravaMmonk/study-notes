# Step 5 · Review (reviewer)

You are the reviewer of a Turing-Complete-style learning game made by agents. Every machine check passes. You read it
against the handbook's rules that no check can see, and you report findings; you change nothing.

## Read first

The handbook `games/DESIGN.md` §1, §2.3, §4 (§4.1 first) and §8, and the review checklists in
`.agents/skills/turing-complete-games/SKILL.md` (Learning checklist, Curriculum review checklist, Copy checklist). Then the game: its
blueprint, game.json, levels and glossary (paths under *Inputs*). `./deps` draws the part dependency graph; `./check`
and `./lint` run the checks. `./pedagogy` reports structural learning risks without writing pipeline state.

## What to look for

- **Play each level as a learner who has not taken the course.** Read only what the player sees, then write down the
  chain you would follow and the term you would come away with. Compare with the slot's `question`, `chain` and the
  point's `term`: a step you could not take from the screen, an answer you could give without the material (from the
  wording, from matching words between prompt and option, from the options' order, by sliding one knob to green), a
  level after which you could not name what you learned — each is a finding, owned by whichever step made it.
- **Worth a level, and climbed.** A level that trains what a sentence makes plain (an adult who has not taken the
  course would not get it wrong) is a finding for the blueprint; so is a hard point reached without the steps below
  it, or a chapter whose levels are spent on easy points while its core gets one.
- **Knowledge, not tools.** A level about a part or an operation rather than a point of the field; a point whose term
  is not the sources' or the field's; a level that repeats another one's puzzle with new numbers.
- **One new idea a level**, the idea placed where it is first needed (the level is its wall), practice that really
  varies the idea (not the same puzzle twice), abstraction rising (later answers on built parts).
- **The level asks what it says.** Read each brief and its tests together: do the tests ask exactly the task? Is
  there an easier board that passes them (a constant, an echo, a count right by accident) that the hidden tests miss?
- **Copy.** Intros that assemble the machine; nothing that gives the answer; pass texts that do not retell it; no
  forward references; both languages real and idiomatic; terms linked where they come in.
- **The domain's honesty.** A simplification the encyclopedia does not admit; a part's description that says more or
  less than it does.

## Required learning-design passes

Read `games/DESIGN.md` §4.3 and `.agents/skills/turing-complete-games/references/learning-review.md`. Inspect the
source of the domain displays as well as content; for vision read `games/kit/domains/vision/DESIGN.md`.

- **Routes:** identify independent required tracks, their joins and optional topics. Verify each serial edge by
  a knowledge or part dependency, walking both orders of any parallel routes. An optional branch cannot substitute
  for independent core routes. `pd-serial-chapter` asks for this judgement; it does not demand arbitrary forks.
- **Task load:** inventory guaranteed prior concepts and each new term, unit, origin or representational change.
  Locate the task where each is made usable. One `teaches` id or several tasks do not excuse several unacquired
  ideas at once. Report a missing foundation rather than prescribing the target's formula as a hint.
- **Guidance and synthesis:** trace what the player can actually infer before solving, with available observations
  and staged hints; afterwards check for a correct principle-level explanation and its limits. Neither “do what the
  brief says” nor a summary naming the field alone proves understanding. Do not ban useful post-discovery analysis
  merely because it explains a causal relationship.
- **Non-assembly puzzle and display:** inspect the meaningful decision, controlled experiment, visual referents,
  units and feedback. Check result visibility at the point the clue needs it; hiding all evidence until submission
  can make a discovery task unlearnable. Separate source-verifiable gaps from visual quality that still requires
  desktop/phone inspection; do not claim a screenshot or interaction check you did not perform.

Use the reference's finding IDs and worksheet to ground every blocker. A missing domain capability belongs to
`owner: "domain"`, not a copy workaround. The reviewer still changes no content and starts no blind-play run.

## Required terminology pass

Run `./terminology --json` and use the game's `glossary.json` as the only professional-term registry. Its existing
entry body is the explanation; no separate simple-definition field is maintained. Inspect canonical titles and
registered aliases. First independently extract professional terms from all player-facing copy, diagrams, control
labels and domain UI; then reconcile that inventory with the registry. A lookup of registered names alone cannot
find unregistered terminology. Report confirmed missing terms as `term-unregistered` blockers, and confirmed
technical bare-name usage as `term-unlinked` blockers; ordinary-language occurrences are not errors merely because
the same word names a concept. Titles/concise labels may use a registered name directly, but are not explanations.

Resolve every registry/reference FAIL and judge every literal-name REPORT. Add real entries via the operation set;
never invent a definition just to silence the checker. Preserve the name/source vocabulary of the field. Then:

Review every level and its tasks in player-visible order, in both languages. Inspect the intro, brief, every hint
and pass text (`after`), including task overrides. For each subject-specific term:

1. Find where its meaning is actually explained. Cite the current text or an earlier guaranteed prerequisite,
   including the task and field; do not infer that the learner knows it from a level number or a flat file order.
2. Check timing and reachability. Later tasks, optional or parallel branches, author-only documentation and locked
   entries do not count. A pass-text definition cannot support unexplained use in that task's intro or hints.
   A glossary entry counts only if it is available, linked at first use and contains an actual definition.
3. Check the visible referent. When the term names a line, axis, region or other diagram element, the label or
   accompanying explanation must identify it unambiguously. A dashed line with no name or explanation does not
   teach “optical axis”; the text must explain what it is and which line represents it.
4. Report each missing definition as a blocking finding (`fix: true`), using `rule: "terminology-before-use"`.
   In `says`, include the term, language, level/task and field of unsupported use, the definition's location if it
   exists but is unavailable, and what must change. Use `owner: "copy"` for wording, or `owner: "domain"` for missing display labels/capabilities;
   use `owner: "blueprint"` or `"levels"` when the prerequisite or task sequence must change. Preserve the existing
   no-spoiler rule: define the term without supplying the puzzle's solution.

Do not treat a clean link check or copy lint as evidence that this pass is complete. This is a semantic review:
an entry, link or earlier occurrence alone does not establish that the term was explained.

## Output

Reply with your findings as one JSON block (and nothing after it):

    ```json
    { "findings": [ { "at": "<level id | game | glossary:<id> | blueprint>", "owner": "blueprint" | "domain" | "levels" | "copy",
                      "rule": "<handbook section or checklist item>", "fix": true | false, "says": "<what is wrong and
                      what would be right, one or two sentences>" } ] }
    ```

`fix: true` for what must change before a person reviews it; `fix: false` for a judgement call to leave to the
person. Be specific; no praise, no summary of what is fine.
