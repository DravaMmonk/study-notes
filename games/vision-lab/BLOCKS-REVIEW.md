# Block and compact-placement acceptance

## Scope and wiring

Blocks store root component identities, leaving fixed inputs/outputs and current ungrouped parts outside.
Exclusive membership, removal of empty blocks, explicit empty presets, inclusive row selection and centre-based
rectangle selection have synthetic tests. Removing a block does not remove components or wires; blueprint text
contains no blocks. The old divider modules and Arrange actions have been removed.

The user's follow-up requires wiring to remain unchanged. The existing curves, ordinary port placement, port
hit targets and connection policy are retained. Only a hidden block substitutes real endpoint identifiers on its
boundary stubs. Proposed orthogonal routing and tight-phone side rails were withdrawn. Layout measurements
sample the existing desktop curve function rather than substituting a new renderer.

## Scanner geometry comparison

Both measurements use the same complete scanner reference circuit and prior-course membership. The baseline is
`cdb5232b`'s `pipelineLayout`; the new implementation receives a 1160px viewport width. This is a normalised
layout benchmark, not screenshot-pixel measurements: cards are 184px wide; terminals are 150px tall; ports-only
working cards are `max(70, 48 + 20 × input count)` high, with a 46px port offset. Every connection is measured,
including those presented as labels. Length and crossing counts sample each original cubic curve at 32 intervals;
shared endpoints are not crossings. The same size and curve conventions apply to both layouts.

| Measure | Before | After |
| --- | ---: | ---: |
| Bounding area, px² | 2,309,184 | 2,050,048 |
| Longest wire, px | 2,792 | 1,207 |
| Crossings | 26 | 26 |
| Total wire length, px | 11,196 | 10,865 |

Area falls by 11.2%, the longest wire by 56.8%, and total length by 3.0%; crossings are unchanged. The benchmark
does not establish that every wire in every viewport becomes shorter. A required single chain can exceed the
available width; readability and existing saved placements take precedence over squeezing every card on screen.
The synthetic fixture independently bounds all four measurements and checks deterministic placement, port
alignment, independent branches, private constants and stable mode-change anchors. SVG output is unchanged.

## Browser acceptance

The 27-node scanner was reviewed on desktop and at 390 × 844. Desktop rectangle selection created a block with
exactly the two selected component centres, preserving stored x/y coordinates and every graph wire. Hidden mode
replaced the selected block's cards with a narrow header and real endpoint stubs; pressing a stub restored the
prior visible mode. A saved `lastView` also preserves restoration through reload.

On phones, default presentation has full-size cards, no backdrop, and edge-to-edge block rules. Manual
partitioning plus compact view supplies backdrops and the Partition button. Selecting rows 0 and 1 created the
expected inclusive member list without changing the 27-node circuit. Hidden phone stubs restored the hidden
members. The header component is shared with desktop. Desktop settings omit Manual partitioning; Arrange is
absent on both devices. Settings remain device preferences, separate from puzzle progress.

## Final verification

420 tests passed after integration with the concurrent grid-view update, together with course checks, vocabulary checks, duplication, styles and all-game builds. A
browser check confirms the scanner still passes after grouping and view changes, and its ordinary wire paths
still use the existing cubic renderer. Dragging a component persists through reload without moving any other
stored component. Escape cancels an active rectangle without creating a block. A hidden block saved after full
view restores full view after reload. Hidden headers sit above wire hit areas so their stubs remain clickable.

The block/header, editor and settings integration is one hard switch: it removes the row-divider data/rendering
path together, so there is no compatibility layer retaining two grouping models. The temporary implementation
plan is consolidated into the design handbook after acceptance.

## Phone container follow-up

Phone containers now fill internal holes with add/drop slots and reserve one complete insertion row after the
last occupied row. A 390 × 844 review of level 1-5 added a constant through an internal slot: the component
count increased within that block, and another complete insertion row remained available. Dragging that
constant to an outside slot removed its membership without extending the former block. All 17 existing wires
remained unchanged. Container projection preserves stored desktop coordinates and relative internal holes.

With Manual partitioning off, preset members have no drag handle or Move action. Move validation also rejects
swaps that would indirectly move a protected member. Manual partitioning restores these actions. Hidden phone
headers retain the shared grey group background and padding around the title row.
The existing ordinary port controls and cubic wire renderer are unchanged.

426 tests pass, including six new container tests for holes, insertion, detachment, cross-container swaps,
protected members and empty-container removal. Course checks, vocabulary checks, duplication, styles and
all-game builds also pass.
