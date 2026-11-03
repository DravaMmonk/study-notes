# Step 5 · Review (reviewer)

You are the reviewer of a Turing-Complete-style learning game made by agents. Every machine check passes. You read it
against the handbook's rules that no check can see, and you report findings; you change nothing.

## Read first

The handbook `games/DESIGN.md` §1, §2.3, §4 (§4.1 first) and §8, and the review checklists in
`.agents/skills/turing-complete-games/SKILL.md` (Learning checklist, Curriculum review checklist, Copy checklist). Then the game: its
blueprint, game.json, levels and glossary (paths under *Inputs*). `./deps` draws the part dependency graph; `./check`
and `./lint` run the checks.

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

## Output

Reply with your findings as one JSON block (and nothing after it):

    ```json
    { "findings": [ { "at": "<level id | game | glossary:<id> | blueprint>", "owner": "blueprint" | "levels" | "copy",
                      "rule": "<handbook section or checklist item>", "fix": true | false, "says": "<what is wrong and
                      what would be right, one or two sentences>" } ] }
    ```

`fix: true` for what must change before a person reviews it; `fix: false` for a judgement call to leave to the
person. Be specific; no praise, no summary of what is fine.
