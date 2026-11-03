# Vision Lab: the demonstration course

Status: a hand-designed demonstration of how the course should be cut (games/DESIGN.md §1: levels go where the
difficulty is). It replaces the earlier pipeline-made chapters 0–1 wholesale. `blueprint.json` is the authority for
the knowledge graph, the slots and the order; this note says why the course is cut this way.

Sources: COMP90086 lectures 1–2 and workshop 2 (`docs/Unimelb/26S2/CV/01-introduction.md`, `02-basics.md`).

## The cut

Each lecture topic is judged by importance, difficulty and value before it gets levels:

- **Hard cores** (abstract, far from daily life, what the lectures spend effort on): the inverse problem, depth of
  field, bilinear interpolation. Each gets a ladder of levels climbing from shallow, concrete origins.
- **Learnable steps** (need one worked example): central projection, perspective scaling, scale ambiguity, focus,
  the blur circle, the sampling grid, nearest neighbour, linear interpolation. Each is one rung, and the next rung
  uses it again.
- **Intuitive points** (plain from a sentence): graphics and vision run opposite ways, the acceptable blur. Only named
  in copy and the encyclopedia, never trained.
- **Technical content** (a library's convention): channel order. An optional topic after the main path ends.

Left out for now: vision task types (which answer form a task wants: intuitive, not worth a level), quantisation,
cropping, field of view and pixel units.

## The ladders

One era, three branches of one parallel set, each independent of the others:

| Branch | Rungs | Core it climbs to |
| --- | --- | --- |
| Projection | 1P1 a point through the hole (u = fX/Z) → 1P2 smaller with distance (h = fH/Z) → 1P3 equal images from equal H/Z | 1P4 what one image settles (claims over compatible scenes; a known size settles only its own object) |
| Optics | 1F1 a lens sharpens one distance → 1F2 the blur circle grows with the aperture | 1F3 depth of field (aperture and focus together, focus between the objects) |
| Resampling | 1R1 where new pixels sit (builds the sampling grid) → 1R2 nearest neighbour → 1R3 linear interpolation along a row | 1R4 bilinear interpolation in 2D |

Optional topic after all three: 1T1 channel order (BGR read, RGB shown).

Every bench is judged on submit (predict, then check); every resampling level starts with a hand-worked grid task
before its circuit; every rung carries a naive answer that is the misconception its point replaces.
