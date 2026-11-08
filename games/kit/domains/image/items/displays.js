// The image domain's own display items for a bench's layout (vocabulary.js display), beside the kernel's
// (games/kit/engine/bench.js KERNEL_DISPLAYS). Each is a picture or an interaction the kernel's plots, strips and knobs
// cannot draw; the components are in ../ui/benches/.
import { T as t } from '../../../shell/i18n.js'

export const DISPLAYS = {
  appleDecision: { about: t('检查苹果选择并解释错误', 'check the apple selection and explain a wrong choice') },
  appleChannels: { about: t('两只苹果在白光下的 R、G、B 灰度图和数值', 'grayscale R, G and B images and values for two apples under neutral light') },
  obscura: { about: t('暗箱的侧视图：拖动孔板和屏幕（旋钮 Z、s）', 'the camera obscura from the side: drag the plate and the screen (knobs Z, s)') },
  obscuraScreen: { about: t('屏幕正面：像的大小、模糊和亮度，目标高度画成一条线', 'the screen from the front: the image’s size, blur and brightness, with the goal height as a line') },
  houghPlanes: { about: t('边缘点和找到的线，旁边是 (θ, ρ) 累加器，可放大', 'the edge points and the lines found, beside the (θ, ρ) accumulator, which zooms') },
  ransacTrial: { about: t('一次试验：点、抽中的两点、门槛色带和找到的直线', 'one trial: the points, the two drawn, the threshold band and the line found') },
  ransacCases: { about: t('每种外点比例一张卡：轮数旋钮和预算、成功率、每次试验（点一下看它）', 'a card per outlier ratio: the rounds knob and budget, the success rate, each trial (tap one to see it)') },
  coverPairs: { about: t('封面和照片：从一点拖到另一点（或先后点）连成一对（旋钮 pairs），贴回的封面画在照片上', 'the cover and the photo: drag from a point to another (or tap both) to pair them (knob pairs); the pasted cover is drawn on the photo') },
  coverPairList: { about: t('已连的点对，可以逐对删除', 'the pairs made, each removable') },
  ganChart: { about: t('真实数据和生成样本的直方图、鉴定员 D(x)、两支笔的历史位置，随回合动起来', 'the histograms of real and generated samples, the judge’s D(x) and the pens’ history, moving turn by turn') },
  embedding: { about: t('嵌入平面：每个测验视图是单位圆上的一点，随训练滑动', 'the embedding plane: each quiz view a point on the unit circle, gliding as it trains') },
  choiceMatrix: { about: t('每个视图在其余视图里选搭档的概率表', 'the table of each view’s chances of picking each other view as its partner') },
  kernelRound: { about: t('这一轮的输入和输出，带倒计时', 'this round’s input and output, with the clock') },
  kernelChoices: { about: t('四张核卡片，点一张（或按 1–4）作答', 'four kernel cards: tap one (or press 1–4) to answer') },
}
