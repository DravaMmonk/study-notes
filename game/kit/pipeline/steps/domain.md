# Step 2 · Domain (engineer)

This step is code, not content: it runs at the kernel's permission level (games/DIRECTION.md decision 3) and is done
by an engineer or an engineering agent with write access to `games/kit/domains/<domain>/`, never by a content agent.

## Input

The blueprint's `requests` with `status: 'open'`, and its `mechanisms`. A new topic's domain starts from the scaffold
(`npm run new-domain -- <name> --mechanism <m>`, games/DESIGN.md 6.3) before this step.

## Do

For each open request: implement it in the domain as a vocabulary item with its schema (games/DESIGN.md 6.2: one item
is one thing the player can point at on the screen; what only implementation tells apart is one item with
parameters), its implementation, its drawing, the level in words and an attempt judged (the `play` hook), and a unit test. Then set
the request's status through the operation set (`blueprint.set`): `done`, or `declined` with a `note` saying why and
what the course does instead (the blueprint changes to match, and its gate stays clean).

Content stays data: nothing in this step writes a level.

## Gate

`npm run pipeline -- <game> gate domain`: no request open, the domain contract holds for the domain and the game
(`kit/engine/contract.js`), the game passes `npm run check`, and the domain's unit tests pass.
