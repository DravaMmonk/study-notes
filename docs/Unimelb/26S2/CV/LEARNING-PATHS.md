# COMP90086 专题主线、任务与补充关

这是笔记的学习路线及后续关卡设计依据，**不是已实现的游戏关卡清单**。每项可操作目标见链接词条的“验收（自拟）”；原有游戏和章节 0–1 设计本次未修改。

主线只使用当前讲义有依据的概念。分类为“应用举例”或“只在 Workshop 出现”的项目全部放在可选专题。每条的直接依赖可点击回读，跨专题依赖在词条中明确列出；不要求把所有专题编号当成唯一线性顺序。

重要起点必须实际完成：**像素坐标 → 局部加权和 → 通道；类别分数 → 损失 → 数据划分；点与线 → 相机 → 极线；概率 → 噪声方差 → 前向扩散；区域 → 邻接图；框 → IoU → 一对一匹配 → P–R → AP。** 这些都安排为关卡，不只出现在开场文字中。关卡和任务通过的是明确计算、构造、诊断或追踪行为，不把记术语当验收。

## 1. 图像怎样形成和表示

| 顺序 | 词条 | 层级 | 直接前置 |
| --- | --- | --- | --- |
| 1.1 | [视觉任务与输出](encyclopedia/01-image-formation.md#vision-task) | 关卡 | 无 |
| 1.2 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) | 关卡 | [视觉任务与输出](encyclopedia/01-image-formation.md#vision-task) |
| 1.3 | [针孔投影与深度歧义](encyclopedia/01-image-formation.md#projection) | 关卡 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 1.4 | [裁剪、重采样与插值](encyclopedia/01-image-formation.md#sampling) | 关卡 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 1.5 | [朗伯反射与成像歧义](encyclopedia/01-image-formation.md#reflectance) | 关卡 | [针孔投影与深度歧义](encyclopedia/01-image-formation.md#projection) |
| 1.6 | [光谱、三色响应与颜色空间](encyclopedia/01-image-formation.md#colour) | 任务 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 1.7 | [不变性、容忍度与等变性](encyclopedia/01-image-formation.md#equivariance) | 任务 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |

## 2. 怎样用固定规则处理图像

| 顺序 | 词条 | 层级 | 直接前置 |
| --- | --- | --- | --- |
| 2.1 | [像素算子与局部加权和](encyclopedia/02-processing.md#weighted-sum) | 关卡 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 2.2 | [卷积与互相关](encyclopedia/02-processing.md#convolution) | 任务 | [像素算子与局部加权和](encyclopedia/02-processing.md#weighted-sum) |
| 2.3 | [平滑、锐化与高斯核](encyclopedia/02-processing.md#filters) | 关卡 | [像素算子与局部加权和](encyclopedia/02-processing.md#weighted-sum) |
| 2.4 | [偏导数、梯度与边缘](encyclopedia/02-processing.md#gradient) | 关卡 | [像素算子与局部加权和](encyclopedia/02-processing.md#weighted-sum) |
| 2.5 | [边界与输出尺寸](encyclopedia/02-processing.md#padding) | 任务 | [卷积与互相关](encyclopedia/02-processing.md#convolution) |
| 2.6 | [频率、幅度与相位](encyclopedia/02-processing.md#sinusoid) | 关卡 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 2.7 | [二维频谱与傅里叶变换](encyclopedia/02-processing.md#fourier) | 关卡 | [频率、幅度与相位](encyclopedia/02-processing.md#sinusoid) |
| 2.8 | [卷积定理与频率滤波](encyclopedia/02-processing.md#frequency-filter) | 关卡 | [二维频谱与傅里叶变换](encyclopedia/02-processing.md#fourier)、[卷积与互相关](encyclopedia/02-processing.md#convolution) |

## 3. 怎样学习可用的特征

| 顺序 | 词条 | 层级 | 直接前置 |
| --- | --- | --- | --- |
| 3.1 | [分类表示与神经网络](encyclopedia/03-learning.md#recognition) | 关卡 | [视觉任务与输出](encyclopedia/01-image-formation.md#vision-task)、[像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 3.2 | [多通道卷积与参数共享](encyclopedia/03-learning.md#channels) | 关卡 | [卷积与互相关](encyclopedia/02-processing.md#convolution)、[分类表示与神经网络](encyclopedia/03-learning.md#recognition) |
| 3.3 | [步幅、尺寸与感受野](encyclopedia/03-learning.md#stride) | 任务 | [多通道卷积与参数共享](encyclopedia/03-learning.md#channels)、[边界与输出尺寸](encyclopedia/02-processing.md#padding) |
| 3.4 | [最大池化与平均池化](encyclopedia/03-learning.md#pooling) | 关卡 | [多通道卷积与参数共享](encyclopedia/03-learning.md#channels) |
| 3.5 | [Softmax 与交叉熵](encyclopedia/03-learning.md#classification-loss) | 关卡 | [分类表示与神经网络](encyclopedia/03-learning.md#recognition) |
| 3.6 | [训练、验证与测试](encyclopedia/03-learning.md#train-split) | 关卡 | [Softmax 与交叉熵](encyclopedia/03-learning.md#classification-loss) |
| 3.7 | [正则化、Dropout 与提前停止](encyclopedia/03-learning.md#regularisation) | 任务 | [训练、验证与测试](encyclopedia/03-learning.md#train-split) |
| 3.8 | [批次、学习率与增强](encyclopedia/03-learning.md#optimisation) | 任务 | [训练、验证与测试](encyclopedia/03-learning.md#train-split) |
| 3.9 | [小核堆叠与多尺度结构](encyclopedia/03-learning.md#receptive-field) | 任务 | [步幅、尺寸与感受野](encyclopedia/03-learning.md#stride) |
| 3.10 | [残差连接](encyclopedia/03-learning.md#residual) | 关卡 | [多通道卷积与参数共享](encyclopedia/03-learning.md#channels)、[分类表示与神经网络](encyclopedia/03-learning.md#recognition) |
| 3.11 | [深度可分离卷积与模型缩放](encyclopedia/03-learning.md#depthwise) | 任务 | [多通道卷积与参数共享](encyclopedia/03-learning.md#channels)、[小核堆叠与多尺度结构](encyclopedia/03-learning.md#receptive-field) |
| 3.12 | [迁移学习与微调](encyclopedia/03-learning.md#transfer) | 任务 | [训练、验证与测试](encyclopedia/03-learning.md#train-split)、[分类表示与神经网络](encyclopedia/03-learning.md#recognition) |
| 3.13 | [归纳偏置与图块 token](encyclopedia/03-learning.md#patches) | 关卡 | [不变性、容忍度与等变性](encyclopedia/01-image-formation.md#equivariance)、[多通道卷积与参数共享](encyclopedia/03-learning.md#channels) |
| 3.14 | [Query、Key、Value 与自注意力](encyclopedia/03-learning.md#attention) | 关卡 | [归纳偏置与图块 token](encyclopedia/03-learning.md#patches) |
| 3.15 | [位置编码与 Transformer 块](encyclopedia/03-learning.md#position) | 任务 | [Query、Key、Value 与自注意力](encyclopedia/03-learning.md#attention)、[残差连接](encyclopedia/03-learning.md#residual) |
| 3.16 | [自监督与对比学习](encyclopedia/03-learning.md#contrastive) | 关卡 | [Softmax 与交叉熵](encyclopedia/03-learning.md#classification-loss)、[批次、学习率与增强](encyclopedia/03-learning.md#optimisation) |
| 3.17 | [CLIP 与零样本分类](encyclopedia/03-learning.md#clip) | 任务 | [自监督与对比学习](encyclopedia/03-learning.md#contrastive) |
| 3.18 | [遮挡、CAM 与表示检查](encyclopedia/03-learning.md#interpretability) | 任务 | [分类表示与神经网络](encyclopedia/03-learning.md#recognition)、[多通道卷积与参数共享](encyclopedia/03-learning.md#channels) |

## 4. 怎样匹配并恢复三维

| 顺序 | 词条 | 层级 | 直接前置 |
| --- | --- | --- | --- |
| 4.1 | [关键点、检测器与描述子](encyclopedia/04-geometry.md#keypoint) | 关卡 | [偏导数、梯度与边缘](encyclopedia/02-processing.md#gradient)、[不变性、容忍度与等变性](encyclopedia/01-image-formation.md#equivariance) |
| 4.2 | [结构张量与 Harris 角点](encyclopedia/04-geometry.md#harris) | 关卡 | [关键点、检测器与描述子](encyclopedia/04-geometry.md#keypoint)、[像素算子与局部加权和](encyclopedia/02-processing.md#weighted-sum) |
| 4.3 | [SIFT 描述与尺度方向对齐](encyclopedia/04-geometry.md#sift) | 任务 | [关键点、检测器与描述子](encyclopedia/04-geometry.md#keypoint)、[偏导数、梯度与边缘](encyclopedia/02-processing.md#gradient) |
| 4.4 | [噪声、外点与几何一致性](encyclopedia/04-geometry.md#outlier) | 关卡 | [SIFT 描述与尺度方向对齐](encyclopedia/04-geometry.md#sift) |
| 4.5 | [Hough 参数空间投票](encyclopedia/04-geometry.md#hough) | 关卡 | [偏导数、梯度与边缘](encyclopedia/02-processing.md#gradient)、[噪声、外点与几何一致性](encyclopedia/04-geometry.md#outlier) |
| 4.6 | [RANSAC 与采样次数](encyclopedia/04-geometry.md#ransac) | 关卡 | [噪声、外点与几何一致性](encyclopedia/04-geometry.md#outlier) |
| 4.7 | [描述子比值检验](encyclopedia/04-geometry.md#ratio-test) | 任务 | [SIFT 描述与尺度方向对齐](encyclopedia/04-geometry.md#sift) |
| 4.8 | [平面单应变换](encyclopedia/04-geometry.md#homography) | 关卡 | [RANSAC 与采样次数](encyclopedia/04-geometry.md#ransac)、[描述子比值检验](encyclopedia/04-geometry.md#ratio-test) |
| 4.9 | [单视图深度线索](encyclopedia/04-geometry.md#depth-cues) | 任务 | [针孔投影与深度歧义](encyclopedia/01-image-formation.md#projection) |
| 4.10 | [校正双目的视差与深度](encyclopedia/04-geometry.md#disparity) | 关卡 | [针孔投影与深度歧义](encyclopedia/01-image-formation.md#projection) |
| 4.11 | [双目窗口代价与全局约束](encyclopedia/04-geometry.md#stereo-matching) | 关卡 | [校正双目的视差与深度](encyclopedia/04-geometry.md#disparity)、[噪声、外点与几何一致性](encyclopedia/04-geometry.md#outlier) |
| 4.12 | [齐次点、直线与叉积](encyclopedia/04-geometry.md#homogeneous) | 关卡 | [像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 4.13 | [相机内参、外参与标定](encyclopedia/04-geometry.md#calibration) | 关卡 | [齐次点、直线与叉积](encyclopedia/04-geometry.md#homogeneous)、[针孔投影与深度歧义](encyclopedia/01-image-formation.md#projection) |
| 4.14 | [极平面、极点与极线](encyclopedia/04-geometry.md#epipolar) | 关卡 | [相机内参、外参与标定](encyclopedia/04-geometry.md#calibration) |
| 4.15 | [本质矩阵与基础矩阵](encyclopedia/04-geometry.md#fundamental) | 关卡 | [极平面、极点与极线](encyclopedia/04-geometry.md#epipolar)、[RANSAC 与采样次数](encyclopedia/04-geometry.md#ransac) |
| 4.16 | [双目校正、三角化与退化](encyclopedia/04-geometry.md#rectification) | 任务 | [本质矩阵与基础矩阵](encyclopedia/04-geometry.md#fundamental)、[校正双目的视差与深度](encyclopedia/04-geometry.md#disparity)、[平面单应变换](encyclopedia/04-geometry.md#homography) |
| 4.17 | [监督与双目自监督深度](encyclopedia/04-geometry.md#learned-depth) | 任务 | [双目窗口代价与全局约束](encyclopedia/04-geometry.md#stereo-matching)、[训练、验证与测试](encyclopedia/03-learning.md#train-split) |

## 5. 怎样从分布生成图像

| 顺序 | 词条 | 层级 | 直接前置 |
| --- | --- | --- | --- |
| 5.1 | [概率密度与条件生成](encyclopedia/05-generation.md#probability) | 关卡 | [视觉任务与输出](encyclopedia/01-image-formation.md#vision-task) |
| 5.2 | [自编码器与瓶颈](encyclopedia/05-generation.md#autoencoder) | 关卡 | [分类表示与神经网络](encyclopedia/03-learning.md#recognition)、[Softmax 与交叉熵](encyclopedia/03-learning.md#classification-loss) |
| 5.3 | [VAE、重参数化与两项损失](encyclopedia/05-generation.md#vae) | 关卡 | [自编码器与瓶颈](encyclopedia/05-generation.md#autoencoder)、[概率密度与条件生成](encyclopedia/05-generation.md#probability) |
| 5.4 | [潜空间采样与编辑](encyclopedia/05-generation.md#latent-sampling) | 任务 | [VAE、重参数化与两项损失](encyclopedia/05-generation.md#vae) |
| 5.5 | [GAN 的生成器与判别器](encyclopedia/05-generation.md#gan) | 关卡 | [概率密度与条件生成](encyclopedia/05-generation.md#probability)、[分类表示与神经网络](encyclopedia/03-learning.md#recognition) |
| 5.6 | [对抗平衡与模式坍塌](encyclopedia/05-generation.md#gan-stability) | 任务 | [GAN 的生成器与判别器](encyclopedia/05-generation.md#gan) |
| 5.7 | [记忆、逼真度与多样性](encyclopedia/05-generation.md#generation-evaluation) | 关卡 | [对抗平衡与模式坍塌](encyclopedia/05-generation.md#gan-stability)、[训练、验证与测试](encyclopedia/03-learning.md#train-split) |
| 5.8 | [条件 GAN 与循环一致性](encyclopedia/05-generation.md#conditional-gan) | 任务 | [GAN 的生成器与判别器](encyclopedia/05-generation.md#gan) |
| 5.9 | [高斯噪声与方差相加](encyclopedia/05-generation.md#gaussian-noise) | 关卡 | [概率密度与条件生成](encyclopedia/05-generation.md#probability)、[像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 5.10 | [前向扩散与累计信号](encyclopedia/05-generation.md#forward-diffusion) | 关卡 | [高斯噪声与方差相加](encyclopedia/05-generation.md#gaussian-noise) |
| 5.11 | [时间条件与噪声预测训练](encyclopedia/05-generation.md#noise-prediction) | 关卡 | [前向扩散与累计信号](encyclopedia/05-generation.md#forward-diffusion)、[分类表示与神经网络](encyclopedia/03-learning.md#recognition) |
| 5.12 | [反向生成与采样器边界](encyclopedia/05-generation.md#reverse-diffusion) | 关卡 | [时间条件与噪声预测训练](encyclopedia/05-generation.md#noise-prediction) |
| 5.13 | [潜空间扩散](encyclopedia/05-generation.md#latent-diffusion) | 任务 | [自编码器与瓶颈](encyclopedia/05-generation.md#autoencoder)、[反向生成与采样器边界](encyclopedia/05-generation.md#reverse-diffusion) |
| 5.14 | [条件扩散与补全](encyclopedia/05-generation.md#conditional-diffusion) | 任务 | [反向生成与采样器边界](encyclopedia/05-generation.md#reverse-diffusion)、[CLIP 与零样本分类](encyclopedia/03-learning.md#clip) |

## 6. 怎样得到区域与像素标签

| 顺序 | 词条 | 层级 | 直接前置 |
| --- | --- | --- | --- |
| 6.1 | [区域、语义与实例分割](encyclopedia/06-segmentation.md#segmentation) | 关卡 | [视觉任务与输出](encyclopedia/01-image-formation.md#vision-task)、[像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 6.2 | [颜色聚类、K-means 与 GMM](encyclopedia/06-segmentation.md#clustering) | 任务 | [区域、语义与实例分割](encyclopedia/06-segmentation.md#segmentation)、[光谱、三色响应与颜色空间](encyclopedia/01-image-formation.md#colour) |
| 6.3 | [Mean shift 的加权均值与模式](encyclopedia/06-segmentation.md#mean-shift) | 关卡 | [颜色聚类、K-means 与 GMM](encyclopedia/06-segmentation.md#clustering)、[像素算子与局部加权和](encyclopedia/02-processing.md#weighted-sum)、[高斯噪声与方差相加](encyclopedia/05-generation.md#gaussian-noise) |
| 6.4 | [空间颜色特征与带宽](encyclopedia/06-segmentation.md#bandwidth) | 关卡 | [Mean shift 的加权均值与模式](encyclopedia/06-segmentation.md#mean-shift)、[像素、坐标与通道](encyclopedia/01-image-formation.md#pixels) |
| 6.5 | [超像素与过分割](encyclopedia/06-segmentation.md#superpixels) | 关卡 | [区域、语义与实例分割](encyclopedia/06-segmentation.md#segmentation) |
| 6.6 | [SLIC 的局部聚类与连通处理](encyclopedia/06-segmentation.md#slic) | 关卡 | [超像素与过分割](encyclopedia/06-segmentation.md#superpixels)、[颜色聚类、K-means 与 GMM](encyclopedia/06-segmentation.md#clustering)、[偏导数、梯度与边缘](encyclopedia/02-processing.md#gradient) |
| 6.7 | [区域邻接图与合并](encyclopedia/06-segmentation.md#rag) | 关卡 | [超像素与过分割](encyclopedia/06-segmentation.md#superpixels) |
| 6.8 | [逐像素分类与全卷积网络](encyclopedia/06-segmentation.md#fcn) | 关卡 | [多通道卷积与参数共享](encyclopedia/03-learning.md#channels)、[Softmax 与交叉熵](encyclopedia/03-learning.md#classification-loss)、[区域、语义与实例分割](encyclopedia/06-segmentation.md#segmentation) |
| 6.9 | [编码解码与空间分辨率](encyclopedia/06-segmentation.md#encoder-decoder) | 关卡 | [逐像素分类与全卷积网络](encyclopedia/06-segmentation.md#fcn)、[最大池化与平均池化](encyclopedia/03-learning.md#pooling) |
| 6.10 | [最大反池化](encyclopedia/06-segmentation.md#unpooling) | 关卡 | [编码解码与空间分辨率](encyclopedia/06-segmentation.md#encoder-decoder)、[最大池化与平均池化](encyclopedia/03-learning.md#pooling) |
| 6.11 | [转置卷积与重叠求和](encyclopedia/06-segmentation.md#transpose-conv) | 关卡 | [编码解码与空间分辨率](encyclopedia/06-segmentation.md#encoder-decoder)、[卷积与互相关](encyclopedia/02-processing.md#convolution) |
| 6.12 | [U-Net 的跨尺度特征拼接](encyclopedia/06-segmentation.md#unet) | 关卡 | [编码解码与空间分辨率](encyclopedia/06-segmentation.md#encoder-decoder)、[转置卷积与重叠求和](encyclopedia/06-segmentation.md#transpose-conv) |
| 6.13 | [SAM 的提示与候选掩码](encyclopedia/06-segmentation.md#sam) | 任务 | [Query、Key、Value 与自注意力](encyclopedia/03-learning.md#attention)、[编码解码与空间分辨率](encyclopedia/06-segmentation.md#encoder-decoder) |

## 7. 怎样定位物体并评价

| 顺序 | 词条 | 层级 | 直接前置 |
| --- | --- | --- | --- |
| 7.1 | [检测框与滑动窗口](encyclopedia/07-detection.md#detection) | 关卡 | [视觉任务与输出](encyclopedia/01-image-formation.md#vision-task)、[分类表示与神经网络](encyclopedia/03-learning.md#recognition) |
| 7.2 | [交并比 IoU](encyclopedia/07-detection.md#iou) | 关卡 | [检测框与滑动窗口](encyclopedia/07-detection.md#detection) |
| 7.3 | [候选区域与 Selective Search](encyclopedia/07-detection.md#proposals) | 关卡 | [检测框与滑动窗口](encyclopedia/07-detection.md#detection)、[区域邻接图与合并](encyclopedia/06-segmentation.md#rag) |
| 7.4 | [边界框回归](encyclopedia/07-detection.md#box-regression) | 关卡 | [候选区域与 Selective Search](encyclopedia/07-detection.md#proposals) |
| 7.5 | [R-CNN 的区域分类与训练](encyclopedia/07-detection.md#rcnn) | 任务 | [候选区域与 Selective Search](encyclopedia/07-detection.md#proposals)、[边界框回归](encyclopedia/07-detection.md#box-regression)、[迁移学习与微调](encyclopedia/03-learning.md#transfer) |
| 7.6 | [共享特征与 RoI pooling](encyclopedia/07-detection.md#roi-pooling) | 关卡 | [R-CNN 的区域分类与训练](encyclopedia/07-detection.md#rcnn)、[最大池化与平均池化](encyclopedia/03-learning.md#pooling) |
| 7.7 | [Faster R-CNN、锚框与 RPN](encyclopedia/07-detection.md#rpn) | 关卡 | [共享特征与 RoI pooling](encyclopedia/07-detection.md#roi-pooling)、[边界框回归](encyclopedia/07-detection.md#box-regression) |
| 7.8 | [YOLO v1 的网格预测](encyclopedia/07-detection.md#yolo) | 关卡 | [检测框与滑动窗口](encyclopedia/07-detection.md#detection)、[边界框回归](encyclopedia/07-detection.md#box-regression)、[Softmax 与交叉熵](encyclopedia/03-learning.md#classification-loss) |
| 7.9 | [DETR、对象查询与集合预测](encyclopedia/07-detection.md#detr) | 关卡 | [Query、Key、Value 与自注意力](encyclopedia/03-learning.md#attention)、[位置编码与 Transformer 块](encyclopedia/03-learning.md#position)、[检测框与滑动窗口](encyclopedia/07-detection.md#detection) |
| 7.10 | [集合匹配损失](encyclopedia/07-detection.md#set-matching) | 关卡 | [DETR、对象查询与集合预测](encyclopedia/07-detection.md#detr)、[边界框回归](encyclopedia/07-detection.md#box-regression) |
| 7.11 | [非极大值抑制 NMS](encyclopedia/07-detection.md#nms) | 关卡 | [交并比 IoU](encyclopedia/07-detection.md#iou)、[检测框与滑动窗口](encyclopedia/07-detection.md#detection) |
| 7.12 | [检测评估的一对一匹配](encyclopedia/07-detection.md#detection-matching) | 关卡 | [交并比 IoU](encyclopedia/07-detection.md#iou)、[非极大值抑制 NMS](encyclopedia/07-detection.md#nms) |
| 7.13 | [精确率、召回率与 P–R 曲线](encyclopedia/07-detection.md#precision-recall) | 关卡 | [检测评估的一对一匹配](encyclopedia/07-detection.md#detection-matching) |
| 7.14 | [AP、mAP 与评价协议](encyclopedia/07-detection.md#map) | 关卡 | [精确率、召回率与 P–R 曲线](encyclopedia/07-detection.md#precision-recall) |

## 补充关与支线任务

这些讲义词条不占用上面的主线步位；重要的操作边界安排为补充任务，背景安排为纯文案。它们的前置仍沿用词条声明，不以“补充”删除重要训练。

| 词条 | 形式 | 为什么保留 |
| --- | --- | --- |
| [焦距、光圈与景深](encyclopedia/01-image-formation.md#lens) | 补充任务 | 补足视角、聚焦与景深的取舍。 |
| [阴影、高光与材质](encyclopedia/01-image-formation.md#material) | 纯文案 | 解释成像模型的适用边界。 |
| [空间可分离滤波与计算量](encyclopedia/02-processing.md#separable) | 补充任务 | 训练计算拆分与等价性检查。 |
| [硬截断与振铃](encyclopedia/02-processing.md#ringing) | 补充任务 | 检查频域截断带来的边缘伪影。 |
| [频域压缩](encyclopedia/02-processing.md#compression) | 纯文案 | 连接频率表示与存储。 |
| [注意力的成本与数据取舍](encyclopedia/03-learning.md#attention-cost) | 纯文案 | 说明全局关系的计算和数据成本。 |
| [纹理偏置与分布变化](encyclopedia/03-learning.md#robustness) | 纯文案 | 限制由准确率到泛化的推论。 |
| [可数物体与连续材质](encyclopedia/06-segmentation.md#stuff-things) | 纯文案 | 说明实例计数的对象范围。 |
| [GrabCut 与框内前景背景](encyclopedia/06-segmentation.md#grabcut) | 补充任务 | 补足传统交互前背景分离。 |
| [分割损失与掩码质量预测](encyclopedia/06-segmentation.md#mask-loss) | 补充任务 | 补足边界加权、掩码学习与质量评分。 |
| [Mask R-CNN 与实例掩码](encyclopedia/07-detection.md#instance-mask) | 补充任务 | 连接目标检测与实例分割。 |
| [视觉词袋与空间信息](encyclopedia/03-learning.md#bag-features) | 补充任务 | 对照忽略布局与利用空间结构的表示。 |
| [PCA、t-SNE 与表示邻居](encyclopedia/03-learning.md#embedding-view) | 补充任务 | 避免误读表示可视化。 |
| [分类准确率与错误分析](encyclopedia/03-learning.md#classification-metrics) | 补充任务 | 补足分类结果的协议与错误分析。 |
| [生成模型的质量与采样成本](encyclopedia/05-generation.md#generation-cost) | 纯文案 | 限制对步数、质量与效率的泛化。 |

## 可选专题：Workshop 与应用

这些项目不解锁必修主线，也不成为任何讲义词条的必修前置。仅在 Workshop 里操作讲义概念，并不意味着该概念本身只来自 Workshop。

| 词条 | 分类 | 形式 |
| --- | --- | --- |
| [OpenCV 的 BGR 与数组副本](encyclopedia/08-optional.md#bgr) | 只在 Workshop 出现 | 可选任务 |
| [平均注意距离](encyclopedia/08-optional.md#attention-distance) | 只在 Workshop 出现 | 可选任务 |
| [同图不同目标的 Grad-CAM 实验](encyclopedia/08-optional.md#gradcam-practice) | 应用举例 | 可选任务 |
| [扩散的 1000 步实现实验](encyclopedia/08-optional.md#diffusion-schedule-practice) | 应用举例 | 可选任务 |
| [Normalized cut 图分割实验](encyclopedia/08-optional.md#normalised-cut-practice) | 只在 Workshop 出现 | 可选任务 |
| [从像素高度计算焦距](encyclopedia/08-optional.md#camera-example) | 应用举例 | 可选任务 |
| [Workshop 5 补充：沿原题计算参数与输出](encyclopedia/08-optional.md#cnn-parameter-practice) | 应用举例 | 可选任务 |
| [Workshop：把训练流程连起来](encyclopedia/08-optional.md#mnist-practice) | 应用举例 | 可选任务 |
| [Workshop 5 补充：保留原设计的可分离 CNN](encyclopedia/08-optional.md#separable-cnn-practice) | 应用举例 | 可选任务 |
| [Workshop 5 补充：滤波器与特征图不是同一件事](encyclopedia/08-optional.md#feature-map-practice) | 应用举例 | 可选任务 |
| [Workshop 7：把窗口参数与评分参数分开](encyclopedia/08-optional.md#harris-api-practice) | 应用举例 | 可选任务 |
| [Workshop 7：从描述子候选到书封面定位](encyclopedia/08-optional.md#matching-practice) | 应用举例 | 可选任务 |
| [Workshop 8：调窗口时观察什么](encyclopedia/08-optional.md#stereo-practice) | 应用举例 | 可选任务 |
| [Workshop 8：先标定，再检查极线](encyclopedia/08-optional.md#calibration-practice) | 应用举例 | 可选任务 |
| [Workshop 9：从重建走向生成](encyclopedia/08-optional.md#generation-practice) | 应用举例 | 可选任务 |

## 依赖与验收约束

每个任务只在声明的前置掌握后安排。学习路线表的相邻项只是推荐阅读顺序，不能凭相邻位置凭空建立知识依赖。若某专题依赖另一专题，先沿依赖链接完成对应词条，而非强制学完整个专题。当前关系图已检查编号唯一、依赖存在、无环，并保证可选内容不进入必修前置。

[完整词条与知识图](encyclopedia/README.md) · [逐讲核对记录](SOURCE-AUDIT.md)
