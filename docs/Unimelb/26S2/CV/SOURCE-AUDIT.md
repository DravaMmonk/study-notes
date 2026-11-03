# COMP90086 逐讲来源核对与纠错记录

核对日期：**2026-11-03**。范围是本地归档的 22 份现行 PDF、22 份按周转写和 Week 1–11 Notebook。未重新登录 Canvas；这份记录不声明当前线上发布状态。原始文件名、PDF 页数、SHA-256、两处本地副本一致性与 Notebook 解析记录见 [本地清单](LOCAL-SOURCE-AUDIT.json)。旧的 [资源导入清单](RESOURCE-INVENTORY.json) 保留历史身份，不伪装成这次线上复查。

核对方法：先检查 PDF 标题与页序、转写开头和主题段，再对照笔记中的概念、公式与操作解释；优先完整补充 L17、L19–22。L1–16 以已有笔记为基础核对核心概念、来源与依赖，并移出 Workshop 应用。**这不是所有转写逐句校订记录，也不是重新执行模型得出的实验报告。** PDF 选图的布局与箭头需另行视觉核对；当前 L22 截图按新版重新生成。

词条中 PDF 页码是实际文件页序；转写没有稳定时间戳时以文件名及主题定位，不编造分钟数。除非标作可核对的原话，中文解释均为笔记对课程内容的转述。当前词条图由讲义、可选 Workshop 和应用三类组成；学习层级不表示考试权重。

## 逐讲记录

| 讲次 | PDF 与页数 | 对照转写 | 本次处理 |
| --- | --- | --- | --- |
| 01 | [COMP90086-01-Introduction.pdf](lecture/COMP90086-01-Introduction.pdf)，35 页 | `Week-01-W-transcript.txt` | 按任务输出建立学习入口。 |
| 02 | [COMP90086-02-Basics.pdf](lecture/COMP90086-02-Basics.pdf)，41 页 | `Week-01-F-transcript.txt` | 坐标、通道、投影和插值分开设任务；Workshop 操作移入可选。 |
| 03 | [COMP90086-03-Filters.pdf](lecture/COMP90086-03-Filters.pdf)，47 页 | `Week-02-W-transcript.txt` | 补齐局部加权和、核方向、边界和可分离计算的前置关系。 |
| 04 | [COMP90086-04-Fourier.pdf](lecture/COMP90086-04-Fourier.pdf)，58 页 | `Week-02-F-transcript.txt` | 区分频率幅相、频谱、卷积定理与振铃。 |
| 05 | [COMP90086-05-ImageFormationII.pdf](lecture/COMP90086-05-ImageFormationII.pdf)，53 页 | `Week-03-W-transcript.txt` | 连接反射、颜色、梯度与不变性；保留成像假设。 |
| 06 | [COMP90086-06-CNNsI.pdf](lecture/COMP90086-06-CNNsI.pdf)，54 页 | `Week-03-F-transcript.txt` | 把通道参数与输出形状设为独立学习起点。 |
| 07 | [COMP90086-07-CNNsII.pdf](lecture/COMP90086-07-CNNsII.pdf)，41 页 | `Week-04-W-transcript.txt` | 损失、数据划分、池化和训练流程分层；原参数题与 MNIST 移入可选。 |
| 08 | [COMP90086-08-CNNsIII.pdf](lecture/COMP90086-08-CNNsIII.pdf)，48 页 | `Week-04-F-transcript.txt` | 区分空间可分离与深度可分离；原比较实验移入可选。 |
| 09 | [COMP90086-09-ViT.pdf](lecture/COMP90086-09-ViT.pdf)，35 页 | `Week-05-W-transcript.txt` | 补齐图块、位置、注意力和词袋的关系；平均注意距离为 Workshop 独有可选。 |
| 10 | [COMP90086-10-representations.pdf](lecture/COMP90086-10-representations.pdf)，44 页 | `Week-05-F-transcript.txt` | 按当前页码整理表示邻居、PCA/t-SNE、CAM/Grad-CAM 和鲁棒性；实作移入可选。 |
| 11 | [COMP90086-11-features.pdf](lecture/COMP90086-11-features.pdf)，31 页 | `Week-06-W-transcript.txt` | 拆开检测、Harris 矩阵与描述子；API 参数练习移入可选。 |
| 15 | [COMP90086-15-Generation.pdf](lecture/COMP90086-15-Generation.pdf)，47 页 | `Week-08-W-transcript.txt` | 区分概率、AE、VAE 两项损失与采样；原练习移入可选。 |
| 16 | [COMP90086-16-GANs.pdf](lecture/COMP90086-16-GANs.pdf)，41 页 | `Week-08-F-transcript.txt` | 区分对抗优化、坍塌、记忆/逼真/多样性与非配对条件生成。 |
| 17 | [COMP90086-17-Diffusion.pdf](lecture/COMP90086-17-Diffusion.pdf)，36 页 | `Week-09-W-transcript.txt` | 扩写独立噪声方差、累计信号、预测目标和下一状态估计；明确高斯记法和采样公式的范围。 |
| 19 | [COMP90086-19-Segmentation.pdf](lecture/COMP90086-19-Segmentation.pdf)，50 页 | `Week-10-W-transcript.txt` | 补 GMM 对照、Mean shift 更新、SLIC 低梯度初始化/连通处理、GrabCut 与实例方法。带宽图方向复核正确，未改反。 |
| 20 | [COMP90086-20-Segmentation2.pdf](lecture/COMP90086-20-Segmentation2.pdf)，47 页 | `Week-10-F-transcript.txt` | 补反池化的索引限制、转置卷积重叠手算、损失和质量预测；SAM 续讲见 Week 11 W。 |
| 21 | [COMP90086-21-ObjectDetection.pdf](lecture/COMP90086-21-ObjectDetection.pdf)，55 页 | `Week-11-W-transcript.txt` | 取消预习标记；补原 R-CNN 分阶段训练、RoI 量化、RPN 损失；现行版 55 页。 |
| 22 | [COMP90086-22-ObjectDetection2.pdf](lecture/COMP90086-22-ObjectDetection2.pdf)，36 页 | `Week-11-F-transcript.txt` | 旧 58 页主线替换为当前 36 页：补 DETR 与集合匹配，更新截图页码，补逐项 TP/FP 与 P–R 计算。 |
| 23 | [COMP90086-23-Revision.pdf](lecture/COMP90086-23-Revision.pdf)，20 页 | `Week-12-W-transcript.txt` | 复习讲作为全课主题覆盖交叉索引，不把考试复习提示或行政事项做成新技术词条。 |
| 12 | [COMP90086_12_feature-matching.pdf](lecture/COMP90086_12_feature-matching.pdf)，29 页 | `Week-06-F-transcript.txt` | 把外点、投票、抽样概率、比值检验和单应分开；保留原练习文字与代码方向不一致的说明。 |
| 13 | [COMP90086_13_depth-stereo.pdf](lecture/COMP90086_13_depth-stereo.pdf)，32 页 | `Week-07-W-transcript.txt` | 区分深度线索、视差误差、窗口代价与学习深度；纠正原笔记“Week 8 无答案”的过时文字。 |
| 14 | [COMP90086_14_two-view-geometry.pdf](lecture/COMP90086_14_two-view-geometry.pdf)，33 页 | `Week-07-F-transcript.txt` | 以齐次点线作实际关卡起点；保留内外参、F/E、退化与尺度限制。 |

## 课程编号

用户已确认第 18 讲取消。课程按原编号从第 17 讲接到第 19 讲，不将跳号计为资源缺失，也不设置占位页面或待补任务。

## 版本和教学边界

- L21、L22 当前封面是 Semester 2, 2026；版权行的 2021 不是授课年份。旧笔记把版权或旧版本年份混在一起，现已改写。
- L22 新版把核心替代方法改为 YOLO 与 DETR；SSD 不再作为当前讲义主线。Mask R-CNN 在 L19 有现行依据，概念保留在检测与实例分割的连接处。
- L17 p.21 的高斯记法使用标准差，换成均值／协方差记法时噪声协方差是 beta×I。p.27 是课件更新示意；笔记不据此声称所有确定性采样都叫 cold diffusion，也不扩写未经本课程来源核对的采样器名称。
- L20 p.43 的 focal loss 文字是教学简述；笔记只保留损失的作用分工，不把简述提升为通用定义。SAM 的文本提示概念也不能当作每个演示界面都实际开放的功能。
- L19 的 Normalized cut 具体操作只来自 Workshop 11，进入可选专题。Grad-CAM 概念在 L10 讲义中，水果图的类别切换才是 Workshop 应用，二者分类分开。
- Week 8、Week 11 答案均已归档；本次只解析和阅读相关 Notebook，不重新训练或下载模型。

## 可继续核对的边界

未归档的线上更新、外部阅读全文没有在这次工作中取得。不把这些写成“已补齐”。L1–16 原有插图与逐字引语未逐项重新渲染／重转写；本次新增的词条采用主题转述，不新增未经核实的引语。后续若要做逐句转写勘误，可沿本表与词条 PDF 页码继续，不影响已完成的概念整理。

[词条百科与知识图](encyclopedia/README.md) · [专题主线与补充关](LEARNING-PATHS.md)

## 本次验证

121 个词条编号唯一、依赖存在且无环；所有词条都有主线、补充或可选位置。必修前置不依赖可选词条。修改页与新词条的文件链接、输出 HTML 锚点和数学块检查通过；原有逐字引语按对应转写进行文字匹配，未新增无法核对的引语。主干和完整知识图均由关系数据导出为 SVG，避免依赖阅读器不支持的 Mermaid 渲染。

笔记页面构建成功，并在浏览器检查词条索引、依赖图及扩散公式。整站默认构建仍报告其他课程旧图片、装置图原有锚点及部分附带游戏构建警告；仅笔记构建没有新增 CV 修改页警告。未执行游戏验证或模型训练，因此此处不报告游戏关卡上线或实验复现。
