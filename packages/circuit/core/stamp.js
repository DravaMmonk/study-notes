import { canonicalJson, solutionStamp as stamp } from 'kernel'

/** Omit board presentation when identifying the work a run executes. */
function circuitWork(work) {
  if (!Array.isArray(work?.nodes) || !Array.isArray(work?.wires)) return work
  return {
    nodes: work.nodes.map(({ id, type, params, in: region }) => ({ id, type, params, region })),
    wires: work.wires.map(({ from, to, port }) => ({ from, to, port })),
  }
}

export const workSignature = work => canonicalJson(circuitWork(work)) ?? ''
export const solutionStamp = (root, references) => stamp(root, references, circuitWork)
