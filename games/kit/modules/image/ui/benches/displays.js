import { qualifyItems } from '../../../../engine/capabilities.js'
import { SeparableKernels } from './Separable.jsx'
import { AppleChannels, AppleDecision } from './AppleChannels.jsx'
import { ObscuraScreen, ObscuraSide } from './Obscura.jsx'
import { HoughPlanes } from './Hough.jsx'
import { RansacCases, RansacTrial } from './Ransac.jsx'
import { CoverPairList, CoverPairs } from './Cover.jsx'
import { GanChart } from './Gan.jsx'
import { ChoiceMatrix, Embedding } from './Contrast.jsx'
import { KernelChoices, KernelRound } from './Kernels.jsx'
import { AttentionRoles } from './AttentionRoles.jsx'

// The image domain's display items for the kernel bench. Their schemas live in ../../items/displays.js.
export const displays = qualifyItems('image', 'display', {
  attentionRoles: AttentionRoles,
  separableKernels: SeparableKernels,
  appleChannels: AppleChannels,
  appleDecision: AppleDecision,
  obscura: ObscuraSide,
  obscuraScreen: ObscuraScreen,
  houghPlanes: HoughPlanes,
  ransacTrial: RansacTrial,
  ransacCases: RansacCases,
  coverPairs: CoverPairs,
  coverPairList: CoverPairList,
  ganChart: GanChart,
  embedding: Embedding,
  choiceMatrix: ChoiceMatrix,
  kernelRound: KernelRound,
  kernelChoices: KernelChoices,
})
