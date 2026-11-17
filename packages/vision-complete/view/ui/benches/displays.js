import { qualifyItems } from 'kernel/view'
import { SeparableKernels } from './Separable.jsx'
import { AppleChannels, AppleDecision } from './AppleChannels.jsx'
import { HoughPlanes } from './Hough.jsx'
import { RansacCases, RansacTrial } from './Ransac.jsx'
import { CoverPairList, CoverPairs } from './Cover.jsx'
import { GanChart } from './Gan.jsx'
import { ChoiceMatrix, Embedding } from './Contrast.jsx'
import { KernelChoices, KernelRound } from './Kernels.jsx'
import { AttentionRoles } from './AttentionRoles.jsx'
export const displays = qualifyItems('vision-complete', 'display', {
  attentionRoles: AttentionRoles,
  separableKernels: SeparableKernels,
  appleChannels: AppleChannels,
  appleDecision: AppleDecision,
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
