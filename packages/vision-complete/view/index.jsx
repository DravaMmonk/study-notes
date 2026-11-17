import { displays } from './ui/benches/displays.js'
export { displays } from './ui/benches/displays.js'
export function register(kernel) {
  kernel.display('vision-complete:display-attentionRoles', displays['vision-complete:display-attentionRoles'])
  kernel.display('vision-complete:display-separableKernels', displays['vision-complete:display-separableKernels'])
  kernel.display('vision-complete:display-appleChannels', displays['vision-complete:display-appleChannels'])
  kernel.display('vision-complete:display-appleDecision', displays['vision-complete:display-appleDecision'])
  kernel.display('vision-complete:display-houghPlanes', displays['vision-complete:display-houghPlanes'])
  kernel.display('vision-complete:display-ransacTrial', displays['vision-complete:display-ransacTrial'])
  kernel.display('vision-complete:display-ransacCases', displays['vision-complete:display-ransacCases'])
  kernel.display('vision-complete:display-coverPairs', displays['vision-complete:display-coverPairs'])
  kernel.display('vision-complete:display-coverPairList', displays['vision-complete:display-coverPairList'])
  kernel.display('vision-complete:display-ganChart', displays['vision-complete:display-ganChart'])
  kernel.display('vision-complete:display-embedding', displays['vision-complete:display-embedding'])
  kernel.display('vision-complete:display-choiceMatrix', displays['vision-complete:display-choiceMatrix'])
  kernel.display('vision-complete:display-kernelRound', displays['vision-complete:display-kernelRound'])
  kernel.display('vision-complete:display-kernelChoices', displays['vision-complete:display-kernelChoices'])
}
