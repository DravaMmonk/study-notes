// Names and controls for execution services used by construction-led courses.
import { ArrowLeftRight, ArrowRightLeft, Braces, Grid3x3, Move, Radical, Sigma, Waves } from 'lucide-react'
const T = (zh, en) => ({ zh, en })
const card = (zh, en, icon, descZh, descEn) => ({ name: T(zh, en), icon, family: 'image', desc: T(descZh, descEn) })
export const CONSTRUCTION_CARDS = {
  weightedLine: card('三点加权器', 'Weighted line', Sigma, '权重向量按 [前, 中, 后] 排列，读取 -d、当前位置、+d。d=(1,0) 横向，(0,1) 纵向。权重不自动归一化，保留符号和通道；图外遵循所选规则。', 'Read at -d, the current position and +d with weights [first, centre, last]. d=(1,0) is horizontal and (0,1) vertical. Preserve signs and channels without normalising weights; use the selected border rule.'),
  abs: card('绝对值', 'Absolute value', Radical, '逐值去掉正负号，保留大小。图像数值不截断。', 'Remove the sign of each value, retaining its magnitude without clipping.'),
  cosine: card('余弦', 'Cosine', Waves, '输入以周为单位的角度。输出 cos(2πa)：0 周为 1，1/4 周为 0，1/2 周为 −1。数或图逐值计算。', 'Compute cos(2πa) for an angle in turns: 0 gives 1, 1/4 gives 0, 1/2 gives −1. Applies elementwise.'),
  shift: card('偏移取样', 'Offset read', Move, '输出位置 (x,y) 读取输入的 (x+dx,y+dy)。dx 向右、dy 向下为正，须为整数。只改变读取的位置，不改变亮度；图外遵循所选规则。', 'Output (x,y) reads input (x+dx,y+dy). Integer dx is positive right, dy down. Values are unchanged; outside reads use the selected rule.'),
  transpose: card('行列互换', 'Transpose', ArrowLeftRight, '交换图像的行和列。原来的 (x,y) 成为 (y,x)，宽高互换，数值和通道不变。', 'Exchange rows and columns: (x,y) becomes (y,x). Width and height swap; values and channels remain unchanged.'),
  reverse: card('翻转核', 'Reverse table', ArrowRightLeft, '把表旋转 180 度：行序和每行的次序一起反转。不会对图像做滤波。', 'Rotate a table 180 degrees, reversing both axes. No filtering is performed.'),
  windowTable: card('展开邻域', 'Unfold windows', Grid3x3, '核的中心依次对齐每个输出位置。每个位置展开为一行：读数表与权重表按核的书写顺序一一对应。保留 RGB 通道；不翻核、不相乘、不求和。', 'Centre the kernel at each output location. Each location becomes a row of samples and matching written-order weights. RGB is retained. No kernel reversal, multiplication or summation is performed.'),
  reduceRows: card('逐行汇总', 'Reduce rows', Sigma, '每行独立求和或平均，得到一列结果。平均还会除以该行宽度。数值计算自动完成，RGB 各通道分别处理。', 'Independently sum or average each row, producing a column. Mean additionally divides by row width. RGB channels are handled separately.'),
  restore: card('还原形状', 'Restore shape', Braces, '输入是一列逐位置结果，按原来的行序还原为“尺寸参照”的宽高。只排布数据，不做计算。', 'Arrange a column of per-position results into the reference width and height in row order. No arithmetic is performed.'),
  trim: card('有效内部', 'Valid interior', Grid3x3, '横向两端各去掉 rx 列，纵向两端各去掉 ry 行。用于显示邻域完全位于原图内的输出。宽高由系统计算。', 'Remove rx columns at each horizontal edge and ry rows at each vertical edge, exposing outputs whose neighbourhood stays inside. Dimensions are computed automatically.'),
  positions: card('行内位置', 'Row positions', Grid3x3, '生成与图同尺寸的位置表：每行依次保存 0/N、1/N…(N−1)/N。保存的是位置，不是亮度。', 'Generate a same-size position table containing 0/N, 1/N, …, (N−1)/N in each row. These are positions, not intensities.'),
  expandRows: card('展开遍历', 'Expand rows', Braces, '宽为 N 时，把原图每行重复 N 次。另给出每格的位置 x/N、当前重复的索引 k。每行计算一个结果后，用还原形状恢复原宽高。不生成波形或频谱。', 'Repeat every source row N times, where N is its width. Also expose sample positions x/N and repetition indices k. Compute one result per row and restore shape. No waves or spectra are generated.'),
}
export const BORDER_OPTIONS = [['zero', T('图外取 0', 'Zero')], ['clamp', T('延续边缘', 'Replicate edge')], ['wrap', T('周期延续', 'Periodic')], ['reflect', T('镜像延续', 'Reflect')]]
export const BORDER_FIELD = { key: 'outside', label: T('图外假设', 'Outside'), options: BORDER_OPTIONS }
export const AXIS_FIELD = { key: 'axis', label: T('空间轴', 'Axis'), options: [['x', T('横向', 'Horizontal')], ['y', T('纵向', 'Vertical')]] }
export const CONSTRUCTION_FIELDS = { weightedLine: [BORDER_FIELD], shift: [BORDER_FIELD], windowTable: [AXIS_FIELD, BORDER_FIELD], reduceRows: [{ key: 'mode', label: T('汇总', 'Reduction'), options: [['mean', T('平均', 'Mean')], ['sum', T('求和', 'Sum')]] }] }
export const CONSTRUCTION_PORTS = {
  weightedLine: { image: T('图', 'Image'), weights: T('权重向量', 'Weight vector'), d: T('方向 d', 'Direction d') },
  abs: { a: T('值', 'Value') }, cosine: { a: T('角度（周）', 'Angle (turns)') },
  shift: { image: T('图', 'Image'), d: T('位移 d', 'Offset d') },
  transpose: { image: T('图', 'Image') }, reverse: { image: T('表', 'Table') },
  windowTable: { image: T('图', 'Image'), kernel: T('权重表', 'Weights') },
  reduceRows: { image: T('表', 'Table') }, restore: { values: T('逐位置结果', 'Per-position results'), shape: T('尺寸参照', 'Shape reference') },
  trim: { image: T('图', 'Image'), r: T('半径 r', 'Radii r') }, positions: { image: T('尺寸参照', 'Shape reference') }, expandRows: { image: T('图', 'Image') },
}
export const CONSTRUCTION_OUTPUTS = { windowTable: { samples: T('读数', 'Samples'), weights: T('权重', 'Weights') }, expandRows: { values: T('重复读数', 'Repeated values'), position: T('位置 x/N', 'Position x/N'), frequency: T('索引 k', 'Index k') } }
