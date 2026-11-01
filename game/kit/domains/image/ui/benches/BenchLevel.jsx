import Bench from '../../../../shell/bench/Bench.jsx'
import { ObscuraScreen, ObscuraSide } from './Obscura.jsx'
import { HoughPlanes } from './Hough.jsx'
import { RansacCases, RansacTrial } from './Ransac.jsx'
import { CoverPairList, CoverPairs } from './Cover.jsx'
import { GanChart } from './Gan.jsx'
import { ChoiceMatrix, Embedding } from './Contrast.jsx'
import { KernelChoices, KernelRound } from './Kernels.jsx'

// A bench level (kind: 'board') on the kernel's parameter bench, with the image domain's own display items (their
// schemas and what each is for: ../../items/displays.js). Loaded lazily, with every bench's pictures.
const DISPLAYS = {
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
}

export default function BenchLevel({ level, onSolve, theme }) {
  return <Bench bench={level.bench} model={level.model} displays={DISPLAYS} onSolve={onSolve} theme={theme} />
}
