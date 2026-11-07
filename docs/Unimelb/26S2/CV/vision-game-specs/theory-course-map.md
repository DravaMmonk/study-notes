# Vision Lab theory course map

This is a new curriculum design for COMP90086. It takes its subject coverage from the
[course chapter inventory](chapter-map.md) and its approach to claims and counterexamples from
[QED](../../../../../games/qed/DESIGN.md). The opening route below specifies the player actions.
Later units give the dependency and learning target. Their puzzles and source-page references
will be specified before authoring.

## The theory board

A board expresses a claim about images. An input may be a patch, a coordinate, a kernel or a
coefficient. An edge shows how one quantity determines another. A player can use the board to
predict a result, compare two expressions, or make a counterexample. The runner deals with
traversal, storage, broadcasting and the mechanics of producing a picture.

The main route introduces one new decision at a time. The player should be able to start
without hints, using a move they have already made or a new control demonstrated in place.
When a claim needs a counterexample, start with a small space of editable inputs and a visible
way to tell success from failure. Open-ended construction can follow in an elective.

Use one or two sentences to introduce the situation. Put the informative comparison on the
board. Completion text names what the player just observed and points to the next question.
The encyclopedia can give the full notation and derivation.

## Course map

Arrows represent prerequisite knowledge. A unit opens as soon as its listed foundations are
available. Parallel units reuse that foundation and can be taken in either order.

| Unit | Prerequisites | Judgment the player takes away |
| --- | --- | --- |
| A · Read and compare an image | — | Decide whether a difference comes from changed readings, changed correspondence or the comparison rule. |
| B · Neighbourhoods, kernels and scale | A | Predict what a local operator responds to, what it suppresses and where its result depends on assumptions. |
| C · Frequency, phase and reconstruction | B through local smoothing; the final comparison also uses convolution and boundaries | Distinguish repetition, strength and placement. Choose a representation that isolates an unwanted pattern. |
| D · Image formation and colour | A | Distinguish changes in observed light from changes in the scene; test where invariance holds. |
| E · Geometry and correspondence | A; B for local descriptors | Separate appearance similarity from geometric agreement. Recognise when a transformation is supported by the matches. |
| F · Cameras and depth | E through correspondence | Explain ambiguity in one view and what additional observations make depth recoverable. |
| G · Learning and generalisation | B through neighbourhoods | Distinguish a useful representation from a model that succeeds only on its training cases. Compare local, pooled and contextual evidence. |
| H · Attention, representations and retrieval | G | Decide what makes two patches or images related and test whether a representation uses the intended evidence. |
| I · Grouping and segmentation | B and D | Choose what should count as a region, a class or an instance. Predict how appearance, location and scale change a grouping. |
| J · Spatial predictions and their evaluation | G and I | Match predictions to targets and choose metrics that expose the relevant mistakes in boxes and masks. |
| K · Reconstruction and generation | C through reconstruction, and G | Distinguish information retained by an encoding, assumptions used to reconstruct, and variation produced by a model. |
| L · Diagnosing visual models | G; examples draw from H and J when open | Test whether apparent success depends on foreground evidence, background shortcuts or the evaluation protocol. |

A and B form the shared opening. D opens after A. C, E and G open from the parts of B they need.
An advanced example may draw on a later concept as an elective without adding a prerequisite
to a whole unit.

## Opening route

Each row is a short main-route level. The Evidence column specifies what the board makes visible.
The transfer at the end of each unit combines familiar moves on a different sample.

### A · Read and compare an image

| Level | Player action | Evidence |
| --- | --- | --- |
| A1 · Read a pixel | Select a given position on a small image. Compare its readout with the same position in a differently displayed copy. | Display and numerical reading are separate. |
| A2 · Which way did it change? | Connect the same pair of readings to a signed difference and compare a lightened spot with a darkened spot. | Equal-sized changes can have opposite signs. |
| A3 · Count both directions | Use the size of each difference to mark both kinds of spot. | Taking magnitude discards direction and retains size. |
| A4 · A good part moved | Shift a clean observation by one cell and inspect which false marks disappear when its positions line up. | Comparison requires correspondence. |
| A5 · A defect that stays | Align an observation that also contains a missing mark. | Alignment removes displacement evidence while the defect remains. |
| A6 · What counts as a defect? | Change a tolerance to accept ordinary variation and reject a clear defect. Then inspect a pair the same tolerance cannot separate. | A threshold is a decision rule with consequences for misses and false alarms. |
| A7 · A new inspection sheet | Align an unfamiliar sample, choose a tolerance, and identify the residual the evidence supports. | The same decisions transfer to a different image. |

### B · Neighbourhoods, kernels and scale

| Level | Player action | Evidence |
| --- | --- | --- |
| B1 · Move one bright point | Move a single bright point through a small image and watch which output cells change. | Each output depends on a local neighbourhood. |
| B2 · Same neighbours, different weights | Adjust one weight and compare its effect on the point image and a flat patch. | Support sets who contributes; the weights set how much. |
| B3 · Keep a flat patch flat | Match the original brightness of two flat patches by adjusting one free weight. | The sum of weights determines the gain on a constant interior. |
| B4 · A kernel with an arrow | Compare two named kernel conventions on a symmetric kernel, then turn one asymmetric kernel around a bright point. | The written direction matters; symmetry can conceal the difference. |
| B5 · What lies outside? | Drag the point from the interior to an edge. Compare two preset outside rules on both positions. | Border assumptions affect results whose support crosses the frame. |
| B6 · The stroke and the speck | Increase smoothing on a sheet containing one speck and one thin stroke. Choose the view that preserves the feature requested in the task. | Smoothing trades detail for suppression of small variation. |
| B7 · One edge, two directions | Rotate a simple edge and inspect two signed responses. Reverse contrast and compare their strength. | Directional components describe change; magnitude measures its strength. |
| B8 · Make a two-axis kernel | Adjust a row and a column to match a small target weight table. The board shows their outer product. | Each entry depends on one factor from each axis. |
| B9 · One pass and two passes | Connect one input to a preset 2D operator and to two preset 1D operators. Match their weights and compare outputs. | With matching outside rules, the outer-product kernel has two equivalent expressions. |
| B10 · A kernel that will not split | Compare a target whose rows are scaled copies with one whose rows disagree. Use an already matched row and expose a conflicting entry in another. | A single outer product imposes a relationship between rows. |
| B11 · A new paper scan | Select a scale and compare edge responses on a new scan with faint ink and nuisance texture. | The right scale depends on the structure the task needs to keep. |

After B6 the first part of C can open. B7 and B8–B10 have no dependency on each other. B11
depends on the scale and edge lessons. The first version can show all of B as one suggested
path, while keeping these prerequisites separate in the content graph.

### C · Frequency, phase and reconstruction

| Level | Player action | Evidence |
| --- | --- | --- |
| C1 · Same average, different stripes | Compare two rows with the same mean; change the repetition count while holding mean and amplitude fixed. | Mean and frequency answer different questions. |
| C2 · A reference wave | Align a reference with a stripe, then change the reference repetition count and compare the match readout. | A frequency-specific measurement responds to a matching period. |
| C3 · The stripe that reads zero | Slide a stripe while keeping its amplitude and repetition count fixed. Find the position where one reference reads zero. | One projection can miss a present signal. |
| C4 · The other projection | Reuse that example and inspect two references one quarter-cycle apart. Move the stripe again and compare the two readings with their joint magnitude. | Two components carry phase; their length carries amplitude. |
| C5 · Same magnitude, different position | Compare two shifted rows and reconstruct one with the other's phase. | Magnitude alone loses placement. |
| C6 · Which pair belongs to which direction? | Change repetition in one axis at a time and locate the corresponding pair in the 2D spectrum. | Spatial variation along each axis has a corresponding frequency axis. |
| C7 · The row filter's blind direction | Run a row filter on two grids with different directions of variation. Inspect what it sees as a per-row constant. | A one-axis analysis cannot distinguish every two-axis pattern. |
| C8 · Remove a pair and look again | Turn off one pair of frequencies and reconstruct a scan. Compare the lost interference with any useful structure sharing the band. | A filter selects frequencies; different structures can share them. |
| C9 · What the cutoff adds | Compare hard and gradual cutoffs on a step. Inspect the reconstructed edge at the same zoom. | An abrupt frequency cutoff can introduce spatial ripples. |
| C10 · Two views of the same filtering | Feed a periodic sample to two preset paths for the same filter and compare outputs. Change only one path's border rule to expose the mismatch. | The convolution theorem relates two expressions under matching conventions. |
| C11 · A new scan with two patterns | Choose which spectral pairs to suppress, reconstruct, and check that specified marks survive. | The frequency model supports a practical choice on an unfamiliar image. |

C1–C5 build the representation needed for C6–C8. C9 and C10 are independent follow-ups to C8;
C10 also needs B4 and B5. Display the examples in real space alongside the relevant coefficient
view. Include formula labels after the observations that give them meaning.

## Optional implementation branches

| Branch | Opens after | What the player implements |
| --- | --- | --- |
| E1 · Spatial operators | B9; later upgrades need the relevant boundary and cost lessons | A general spatial processor, then an implementation with cheaper factored passes. Carry the last passed circuit forward. Expose loop shape, storage and operation counts here. |
| E2 · Frequency instruments | C4, then C6 and C10 for later upgrades | A single-bin projection, a row analysis and synthesis, then their two-axis composition. Expose index expansion, normalisation bookkeeping and data layout here. |
| E3 · Fit and measure | G, then J | An explicit training loop and an evaluation pipeline. Expose batching, state updates, matching and accumulation here. |

Electives can build reusable parts within their own upgrade chains. Main-route theory tools are
available at their teaching point, so completing a branch never gates the next theory lesson.

## Authoring gate

For each level, record the prerequisite move, the new decision, the visible evidence, one
plausible wrong prediction, and the source. Treat different input numbers as cases unless they
expose a new failure mode. If an observation admits several explanations, give the player a
second observation that can distinguish them.

Prototype A1–A7 and B1–B7 before expanding the rest of the map. Review with hints hidden.
Watch whether a new learner can start from the board, recover from a wrong prediction, and
use the result in the next level. Treat a failure to get started as a missing affordance or
prerequisite. Treat a successful run with no transferable observation as a reason to redesign
the puzzle.
