// The image domain's own display items for a bench's layout (vocabulary.js display), beside the kernel's
// (games/kit/engine/bench.js KERNEL_DISPLAYS). Each is a picture or an interaction the kernel's plots, strips and knobs
// cannot draw; the components are in ../ui/benches/.
import { T as t } from '../../../shell/i18n.js'

export const DISPLAYS = {
  attentionRoles: { about: t('查询、键、值与注意力输出的图块') },
  separableKernels: { about: t('并排比较两组目标和结果的空间核') },
  appleDecision: { about: t('检查苹果选择并解释错误') },
  appleChannels: { about: t('两只苹果在白光下的 R、G、B 灰度图和数值') },
  obscura: { about: t('暗箱的侧视图：拖动孔板和屏幕（旋钮 Z、s）') },
  obscuraScreen: { about: t('屏幕正面：像的大小、模糊和亮度，目标高度画成一条线') },
  houghPlanes: { about: t('边缘点和找到的线，旁边是 (θ, ρ) 累加器，可放大') },
  ransacTrial: { about: t('一次试验：点、抽中的两点、门槛色带和找到的直线') },
  ransacCases: { about: t('每种外点比例一张卡：轮数旋钮和预算、成功率、每次试验（点一下看它）') },
  coverPairs: { about: t('封面和照片：从一点拖到另一点（或先后点）连成一对（旋钮 pairs），贴回的封面画在照片上') },
  coverPairList: { about: t('已连的点对，可以逐对删除') },
  ganChart: { about: t('真实数据和生成样本的直方图、鉴定员 D(x)、两支笔的历史位置，随回合动起来') },
  embedding: { about: t('嵌入平面：每个测验视图是单位圆上的一点，随训练滑动') },
  choiceMatrix: { about: t('每个视图在其余视图里选搭档的概率表') },
  kernelRound: { about: t('这一轮的输入和输出，带倒计时') },
  kernelChoices: { about: t('四张核卡片，点一张（或按 1–4）作答') },
}
