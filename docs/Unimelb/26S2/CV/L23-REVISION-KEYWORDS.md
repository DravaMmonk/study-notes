# COMP90086 L23 复习 PPT 关键词

依据 2026 Semester 2 的 `lecture/COMP90086-23-Revision.pdf`（20 页）整理。页码对应 PDF。第 6 页说明复习范围包括整学期的 **lectures and workshops（讲课与实习课）**，第 7–16 页列出供回顾的专题。例题的解题关键词参考 Week 12 W 转写及相应讲次笔记。

## 第 2–6 页 · 考试与题型用语

| PPT 页码 | 英文关键词 | 中文提示 |
| --- | --- | --- |
| 2 | on-campus · closed book · reading time · writing time · permitted materials | 校内考试、闭卷、读题时间、作答时间、允许携带的用品 |
| 3 | short answer · definition · parameter · compare · example | 简答通常约两句。可能要求给定义、说明参数作用、比较方法或举例。 |
| 4 | numerical example · algorithmic computation · toy dataset · show your steps | 在小规模数据上手算算法，写出关键中间步骤。 |
| 5 | longer answer · compare and contrast · outline · theoretical motivation · derive | 结合场景比较方法、概述步骤、说明理论动机或推导。 |
| 6 | exam coverage · lectures and workshops | 按整学期的讲课与实习课复习。 |

## 第 7–16 页 · 专题关键词

| PPT 页码与专题 | 英文关键词及中文对照 | 对应笔记 |
| --- | --- | --- |
| **7 · Image formation I** 图像形成 I | pinhole camera model（针孔相机模型）、intrinsic parameters（内参）、extrinsic parameters（外参）、image resampling（图像重采样） | [L02 成像](02-basics.md)、[L14 相机参数](14-two-view-geometry.md) |
| **8 · Image filtering** 图像滤波 | filtering operation（滤波运算）、common filter types（常见滤波器类型）、properties of convolution（卷积性质）、boundary handling（边界处理）、Fourier domain（傅里叶域）、spatial and frequency domains（空间域与频率域） | [L03 空间滤波](03-filters.md)、[L04 频域滤波](04-fourier.md) |
| **9 · Image formation II** 图像形成 II | diffuse reflectance model（漫反射模型）、colour representation（颜色表示）、colour space（颜色空间）、feature invariance（特征不变性）、tolerance（容忍度）、edge detection（边缘检测） | [L05 亮度、颜色与边缘](05-image-formation-ii.md) |
| **10 · Convolutional neural networks** 卷积神经网络 | CNN layer types（CNN 层类型）、parameters（参数）、image preprocessing（图像预处理）、data augmentation（数据增强）、architecture（网络架构）、architectural decisions（架构设计选择）、training（训练）、fine-tuning（微调） | [L06 CNN 基础](06-cnns-i.md)、[L07 训练](07-cnns-ii.md)、[L08 架构](08-cnns-iii.md) |
| **11 · ViT and representation learning** 视觉 Transformer 与表示学习 | Vision Transformer（视觉 Transformer）、inductive bias（归纳偏置）、ViT versus CNN（ViT 与 CNN 的差异）、contrastive learning（对比学习）、visualisation（可视化）、interpretation（解释）、invariance（不变性）、generalisation（泛化） | [L09 ViT](09-vit.md)、[L10 表示学习](10-representations.md) |
| **12 · Local features and matching** 局部特征与匹配 | feature detection（特征检测）、Harris corners（Harris 角点）、feature descriptors（特征描述子）、feature matching（特征匹配）、Hough transform（霍夫变换）、RANSAC（随机采样一致性） | [L11 局部特征](11-features.md)、[L12 特征匹配](12-feature-matching.md) |
| **13 · 3D, depth and stereo** 三维、深度与双目 | camera calibration（相机标定）、stereo depth（双目深度）、disparity（视差）、feature matching（特征匹配）、epipolar geometry（极线几何）、single-view depth（单视图深度）、depth cues（深度线索）、classification（分类） | [L13 深度与双目](13-depth-stereo.md)、[L14 两视图几何](14-two-view-geometry.md) |
| **14 · Image generation** 图像生成 | generative models（生成模型）、discriminative models（判别模型）、autoencoders（自编码器）、GANs（生成对抗网络）、diffusion models（扩散模型）、evaluation methods（评价方法） | [L15 自编码器与 VAE](15-generation.md)、[L16 GAN](16-gans.md)、[L17 扩散](17-diffusion.md) |
| **15 · Image segmentation** 图像分割 | semantic segmentation（语义分割）、instance segmentation（实例分割）、clustering（聚类）、mean shift（均值漂移）、superpixels（超像素）、fully convolutional network, FCN（全卷积网络）、upsampling（上采样）、SAM（任意目标分割模型）、U-Net | [L19 分割 I](19-segmentation-i.md)、[L20 分割 II](20-segmentation-ii.md) |
| **16 · Object detection** 目标检测 | problem formulation（任务定义）、region proposal（区域候选）、R-CNN、YOLO、DETR、intersection over union, IoU（交并比）、mean average precision, mAP（平均 AP） | [L21 检测 I](21-object-detection-i.md)、[L22 检测 II](22-object-detection-ii.md) |

第 15 页把 FCN 展开成了 *fully-connected networks*。按 L20 的语义分割内容，FCN 应写作 **fully convolutional network（全卷积网络）**。[L20 分割 II](20-segmentation-ii.md)

## 第 17–20 页 · 例题关键词

| PPT 页码 | 题目关键词 | 作答时要用到的词 |
| --- | --- | --- |
| **17** | intrinsic vs. extrinsic（内参和外参）、feature descriptor（特征描述子）、AE vs. VAE（自编码器和变分自编码器） | **focal length / principal point**（焦距、主点）对比 **rotation / translation**（旋转、平移）。描述子要 **distinctive**（能区分不同点）且对相关变换 **robust**（稳健）。VAE 记 **latent distribution / prior / KL divergence**（潜变量分布、先验、KL 散度）。 |
| **18** | cross-correlation（互相关）、kernel（核）、valid（只算核完整落在图像内的位置）、no padding（无补边） | **element-wise multiplication / sum**（逐元素相乘再求和）。核与图像都是 $3\times3$，只有一个有效位置，结果为 **34**。 |
| **19** | main object vs. background（主体还是背景）、CNN vs. ViT（两类模型如何检查） | **occlusion / target score**（遮挡、目标类别分数）。分别遮挡主体和背景，观察分数变化。CNN 可辅以 **Grad-CAM**，ViT 可辅以 **attention visualisation**（注意力可视化）。 |
| **20** | feature maps（特征图）、downsampling（下采样）、upsampling（上采样）、encoder–decoder（编码器—解码器）、U-Net | 下采样记 **max pooling / strided convolution**（最大池化、带步幅卷积）。上采样记 **transposed convolution / max unpooling**（转置卷积、最大反池化）。编码器通过下采样降低计算量并扩大感受野 **receptive field**，解码器恢复空间分辨率 **spatial resolution**。 |

相关复习资料包括 [中英术语表](REVISION-GLOSSARY.md)、[计算题型摘要](EXAM-CALCULATION-TYPES.md)和[概念题英文短答](EXAM-CONCEPT-ANSWERS.md)。
