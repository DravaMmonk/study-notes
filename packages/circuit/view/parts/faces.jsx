import { applyRules, partDesc } from "../../core/parts/define.js"
import { isFixed, keepFixedSettings } from "../../core/board/presets.js"
import PartFace, { blocksOf } from "./PartFace.jsx"
import { iconOf } from "./icons.js"

// What the shared editors and the circuit level need of defined parts (games/DESIGN.md 6.8): the cards' description
// for the editors (circuit/model.js), the parts to place, and the faces drawn by PartFace. A domain's level screen
// gives the circuit level `defined` = { of(type) → the part resolved or null, defaults(type), ops,
// value(node, ctx, output, face), widgets?, allowed?(type, key) }; the nodes it does not define (the level's own, built parts) stay the domain's.

/** A defined part as the palette, the tray and an empty slot's sheet list it; `allowed(type, key)` the options open here. */
export const definedItem = (type, def, extra = {}, allowed = () => null) => ({ type, label: def.name, desc: partDesc(def, (key) => allowed(type, key)), icon: iconOf(def.icon), family: def.family, ...extra })

/** The settings a node is left with once the player set `patch` (changed: the key set, null for an action). */
export const nextParams = (def, node, patch, changed, ops) => {
  const params = keepFixedSettings(node, { ...node.params, ...patch })
  return applyRules(def, params, changed, ops, (key) => isFixed(node, key))
}

/**
 * The faces of defined parts over a domain's own (shell/CircuitLevel.jsx card): body (the card view), thumb and
 * tileExtra (the phone tile: its value blocks over the name, the rest under it), sheet (the detail view).
 */
export function definedFaces(faces, { defined, change, phone }) {
  const draw = (face, other, blocks) => (node, ctx) => {
    const def = defined.of(node.type, face)
    if (!def) return other?.(node, ctx) ?? null
    const set = ctx?.readOnly ? null : (patch, changed) => change(node, nextParams(def, node, patch, changed, defined.ops))
    return <PartFace def={def} face={face} node={node} ctx={ctx} set={set} defined={defined} phone={phone} roomy={face === 'detail'} blocks={blocks?.(def)} />
  }
  const tile = (pick) => (def) => blocksOf(def, 'tile').filter(([b]) => pick(b.show === 'value'))
  return {
    ...faces,
    body: draw('card', faces.body),
    thumb: draw('tile', faces.thumb, tile((v) => v)),
    tileExtra: draw('tile', faces.tileExtra, tile((v) => !v)),
    detail: draw('detail', faces.detail),
  }
}
