# COMP90086 易错点、难点与概念题英文短答

这是一份基于现行 [21 篇内容讲笔记](README.md)、本地 2026 年 Lecture 23 复习讲义和 2021 年练习考试整理的**答题练习稿**。复习讲义把短答题描述为通常约两句话，并提示可能考定义、参数作用、方法比较及应用问题；它没有给出本页的题目或标准答案。下面的英文是依据笔记重新写的参考表述，**不是官方评分答案，也不表示这些题会出现**。旧练习卷里不属于现行笔记主线的内容没有移入本页。

使用方式：先遮住英文，口头说出“是什么／怎样工作／成立条件或局限”，再与参考答法比较。计算步骤和公式另见[计算题型摘要](EXAM-CALCULATION-TYPES.md)，术语检索见[中英术语表](REVISION-GLOSSARY.md)。

## 一、最容易混淆的判断

| 知识点 | 容易误写 | 应写清的区别 |
| --- | --- | --- |
| [视觉任务](01-introduction.md) | 分类置信度高就说明理解场景 | 分类、检测、分割和深度的**输出结构不同**；高分不保证依据正确或能泛化。 |
| [投影与数组](02-basics.md) | $(x,y)$ 直接等于数组 `[x,y]`；毫米、米、像素可直接混算 | 图像几何常先横后纵，数组常先行后列；焦距和视差、物高和距离要分别统一单位。 |
| [重采样](02-basics.md) | 插值能找回缩小前的所有细节 | 插值估计新网格的值；降采样前若保留过高频率，可能发生混叠。 |
| [空间滤波](03-filters.md) | 卷积、互相关、补边方式可以不说明 | 非对称核下翻核与否会改变结果；边界规则还会影响边缘数值和输出尺寸。 |
| [频域滤波](04-fourier.md) | 频谱幅度决定全部图像结构；硬切低频没有代价 | 相位关系影响图像结构；理想硬截断可能产生振铃。 |
| [亮度与边缘](05-image-formation-ii.md) | 暗像素一定是暗材质，强边缘一定是物体边界 | 光照、反射率和几何共同影响亮度；阴影、纹理和高光也能产生强边缘。 |
| [CNN 参数](06-cnns-i.md) | 输出位置越多，权重就成倍增加 | 每个卷积核覆盖全部输入通道，同一核在空间位置共享；滤波器数量决定输出通道数。 |
| [训练与评估](07-cnns-ii.md) | 反复看测试集选模型；Softmax 高概率等于真实可靠 | 验证集用于选择，测试集留作最终评估；概率是模型输出，仍需检查错误、校准和分布变化。 |
| [结构设计](08-cnns-iii.md) · [U-Net](20-segmentation-ii.md) | ResNet skip 与 U-Net skip 都是同一种加法；两种“可分离”卷积相同 | ResNet 常逐元素相加，U-Net 跨尺度拼接；空间可分离拆横纵核，深度可分离拆空间滤波与通道混合。 |
| [ViT 与可解释性](09-vit.md) · [表示学习](10-representations.md) | 能看全图就等于理解长距离关系；热图能证明因果依据 | 全局可见只是结构能力，关系仍需学习；注意力或 Grad-CAM 热图是针对输入和目标的检查线索。 |
| [Harris 与 SIFT](11-features.md) | 梯度大就是角点；SIFT 128 维等于 128 个点 | 角点需在两个主方向都有显著变化；128 维是**一个**关键点的局部描述子。 |
| [匹配与几何](12-feature-matching.md) · [两视图](14-two-view-geometry.md) | 最近邻描述子必然对应；$Fp$ 是另一图的点；一个 $H$ 能解释任意三维场景 | 最近邻只是候选，需几何验证；$Fp$ 是极线；单应主要适用于平面或特定相机运动。 |
| [双目深度](13-depth-stereo.md) | 任意两张图都可套 $Z=fB/d$；最低窗口代价一定正确 | 简式要求已知相机参数和对齐约定；无纹理、重复纹理、遮挡都可使最佳候选仍错误。 |
| [生成模型](15-generation.md) · [GAN](16-gans.md) · [扩散](17-diffusion.md) | AE 重建好就能任意采样；GAN 图清晰就有多样性；扩散生成是在恢复某张固定原图 | 可采样潜空间、真实性与多样性、从噪声生成的目标分别需要独立检查。 |
| [分割](19-segmentation-i.md) · [SAM](20-segmentation-ii.md) | 同色区域就是一个物体；SAM 的提示能保证唯一、正确的掩码 | 聚类不自动产生语义或实例；提示限定目标，但候选和边界仍可能有歧义。 |
| [检测评价](21-object-detection-i.md) · [L22](22-object-detection-ii.md) | NMS 的 IoU 阈值等于评价阈值；召回率到 1 就说明 AP 完美 | NMS 比较**预测与预测**，评价比较**预测与真值**；AP 还受排序与插值协议影响。 |

## 二、需要串起来理解的难点

1. **从世界到像素再反推世界**：场景几何、照明、材质和传感器共同产生像素，因此单张图的亮度、颜色或大小通常不能唯一确定深度、法线或物体性质。[L02](02-basics.md) · [L05](05-image-formation-ii.md)
2. **从局部加权到频域与 CNN**：固定核计算局部响应，卷积定理解释频域等价；CNN 让多通道核从数据中学习，并在空间共享权重，必须分别追踪核是否翻转、边界、通道、尺寸与参数。[L03](03-filters.md) · [L04](04-fourier.md) · [L06](06-cnns-i.md)
3. **从模型结构到训练证据**：池化、残差、图块与注意力改变信息流，损失和训练划分决定怎样学习；架构有能力处理某种关系，不意味着已从数据学会或能在新分布上泛化。[L07](07-cnns-ii.md) · [L08](08-cnns-iii.md) · [L09](09-vit.md) · [L10](10-representations.md)
4. **从局部相似到三维约束**：检测器找点、描述子给候选、比值检验和 RANSAC 排外点，随后用 $H$ 解释平面、用 $E/F$ 限制两视图对应，再由可靠视差或三角化恢复深度。[L11](11-features.md) · [L12](12-feature-matching.md) · [L13](13-depth-stereo.md) · [L14](14-two-view-geometry.md)
5. **从重建到真正生成**：AE 的瓶颈服务重建，VAE 用先验与 KL 约束潜空间，GAN 用判别反馈训练，扩散则学习逐步去噪；四者的训练信号、采样入口和失败方式不同。[L15](15-generation.md) · [L16](16-gans.md) · [L17](17-diffusion.md)
6. **从像素分组到实例与检测评估**：聚类和超像素先组织区域，FCN/U-Net 预测逐像素类别或掩码，检测器输出框；最后还需按类别、IoU 阈值和一对一匹配计算 Precision、Recall、AP。[L19](19-segmentation-i.md) · [L20](20-segmentation-ii.md) · [L21](21-object-detection-i.md) · [L22](22-object-detection-ii.md)

## 三、重要概念题：英文短答参考表述

以下问题覆盖复习讲义点名的主题、旧练习卷仍适用于现行笔记的概念，以及逐讲自测中的核心辨析。英文答案以短答题常见的**约两句**为长度；若题目要求“比较并举例”或“解释步骤”，应按题意扩展。

### 图像形成与处理

1. **What is the difference between computer vision and computer graphics?**<br>中文抓手：推断与生成的方向。<br>**Answer (English):** Computer graphics generates an image from a scene description, camera and lighting. Computer vision works in the opposite direction, inferring scene properties from images, often with ambiguous solutions. [L01](01-introduction.md)

2. **How do intrinsic and extrinsic camera parameters differ?**<br>中文抓手：相机内部成像映射与位姿。<br>**Answer (English):** Intrinsic parameters describe how camera coordinates map to image coordinates, including focal length and principal point. Extrinsic parameters describe the camera's rotation and translation relative to a chosen reference frame. [L14](14-two-view-geometry.md)

3. **Why can two different spectra produce the same RGB values?**<br>中文抓手：三个通道把完整光谱压缩成三个响应。<br>**Answer (English):** Each RGB channel integrates light across a range of wavelengths according to its spectral sensitivity. Different spectral distributions can therefore yield the same three channel responses under the same camera and lighting conditions. [L05](05-image-formation-ii.md)

4. **How do convolution and cross-correlation differ?**<br>中文抓手：非对称核是否翻转。<br>**Answer (English):** Both compute a weighted sum over a local image neighbourhood. Mathematical convolution flips the kernel before applying it, whereas cross-correlation uses the kernel as given; they agree for symmetric kernels. [L03](03-filters.md)

5. **Why must a filtering question specify a boundary rule?**<br>中文抓手：边缘缺邻居，补值影响结果。<br>**Answer (English):** A kernel centred near an image border extends beyond the observed pixels. Valid filtering omits those positions, while padding supplies values outside the image and can change both the output size and border responses. [L03](03-filters.md)

6. **How are spatial convolution and frequency-domain filtering related?**<br>中文抓手：卷积定理、频域逐点相乘。<br>**Answer (English):** The Fourier transform converts spatial convolution into pointwise multiplication of the image and filter spectra. After multiplying the spectra, an inverse transform returns the filtered image, subject to the chosen boundary convention. [L04](04-fourier.md)

7. **Why is a strong image edge not necessarily an object boundary?**<br>中文抓手：亮度变化有多种来源。<br>**Answer (English):** An edge detector responds to rapid image intensity changes. Such changes can come from texture, shadows or highlights as well as object boundaries, while a low-contrast boundary may produce a weak response. [L05](05-image-formation-ii.md)

8. **Why may an image need anti-aliasing before downsampling?**<br>中文抓手：先压低新采样网格无法表示的高频。<br>**Answer (English):** Downsampling removes samples and lowers the spatial frequencies the output grid can represent. Without suitable low-pass filtering first, high-frequency image patterns may reappear as false lower-frequency patterns. [L02](02-basics.md) · [L04](04-fourier.md)

### CNN、ViT 与表示学习

1. **Why are CNNs more parameter-efficient than fully connected layers on images?**<br>中文抓手：局部连接、权重共享。<br>**Answer (English):** A convolutional filter uses local connections and reuses the same weights across spatial positions. This exploits image structure without learning a separate weight set for every location. [L06](06-cnns-i.md)

2. **What are three ways to reduce overfitting in a CNN?**<br>中文抓手：数据增强、正则化、提前停止。<br>**Answer (English):** Use label-preserving data augmentation to increase training variation, regularisation such as dropout to constrain the model, and early stopping based on validation performance. These measures reduce dependence on training-specific patterns, but their effect should be checked on held-out data. [L07](07-cnns-ii.md)

3. **Why use a residual connection in a deep CNN?**<br>中文抓手：学习修正量，改善深层优化。<br>**Answer (English):** A residual block adds its input to a learned transformation, so the layers learn a change to the input rather than the entire mapping. The direct path helps information and gradients pass through a deep network. [L08](08-cnns-iii.md)

4. **How does depthwise separable convolution reduce computation?**<br>中文抓手：逐通道空间滤波，再逐点混通道。<br>**Answer (English):** A depthwise convolution applies one spatial filter per input channel, and a pointwise convolution then mixes the channels. This factorisation usually uses fewer parameters and operations than a standard convolution with the same input and output channel counts. [L08](08-cnns-iii.md)

5. **Why does a Vision Transformer need positional information?**<br>中文抓手：自注意力本身不记录图块原位置。<br>**Answer (English):** Self-attention can compare patch tokens but does not by itself encode where each patch came from in the image. Positional embeddings add location information so the model can use spatial arrangement. [L09](09-vit.md)

6. **What do queries, keys and values do in self-attention?**<br>中文抓手：算相关度，再加权读信息。<br>**Answer (English):** A query is compared with keys to produce attention weights for other tokens. The weights are then used to combine their value vectors into an updated representation. [L09](09-vit.md)

7. **How does contrastive learning obtain a training signal without class labels?**<br>中文抓手：同图不同视图为正对，批内其他样本作候选。<br>**Answer (English):** Augmentations create related views of the same image, which provide positive pairs without manual class labels. A contrastive loss makes each positive pair more similar than the selected negative pairs in the batch. [L10](10-representations.md)

8. **How can CLIP perform zero-shot classification?**<br>中文抓手：图像与类别文字在共同表示空间比较。<br>**Answer (English):** CLIP maps an image and candidate text descriptions into a shared embedding space. It predicts a class by comparing the image with the class descriptions, without training a new classifier on those target classes. [L10](10-representations.md)

9. **What can a Grad-CAM or attention map tell us, and what can it not prove?**<br>中文抓手：针对目标的诊断线索，非因果证明。<br>**Answer (English):** Such maps can show which regions or token relationships are highlighted for a chosen input and target. They are diagnostic visualisations, not proof that the model uses those regions causally or understands the scene as a person does. [L10](10-representations.md)

10. **How could you check whether a classifier relies on the object or the background?**<br>中文抓手：分别遮挡目标和背景，观察目标分数；热图只作辅助。<br>**Answer (English):** Occlude the object and background in controlled comparisons and measure how the target score changes. Grad-CAM for a CNN or attention visualisations for a ViT can suggest regions to inspect, but the visualisation alone does not establish causal reliance. [L10](10-representations.md)

### 局部特征与三维几何

1. **Why does Harris detect corners rather than just strong edges?**<br>中文抓手：两个主方向都要有明显变化。<br>**Answer (English):** The structure tensor measures how much a local patch changes under small shifts in different directions. A corner has substantial change in both principal directions, whereas an edge has weak change along the edge. [L11](11-features.md)

2. **What is the difference between a keypoint detector and a descriptor?**<br>中文抓手：选位置与编码外观。<br>**Answer (English):** A detector selects repeatable image locations. A descriptor encodes the appearance around each selected location so that candidates can be compared across images. [L11](11-features.md)

3. **Why is descriptor nearest-neighbour matching insufficient on its own?**<br>中文抓手：最近不代表正确，需要几何一致性。<br>**Answer (English):** The closest descriptor may still belong to a different scene point, especially in repetitive or low-texture regions. Ratio testing and a geometric model can reject ambiguous matches and inconsistent correspondences. [L12](12-feature-matching.md)

4. **How do Hough voting and RANSAC handle outliers differently?**<br>中文抓手：参数网格投票与最小样本提案。<br>**Answer (English):** Hough voting accumulates support in a discretised parameter space and looks for peaks. RANSAC repeatedly fits a model from a minimal random sample and counts the observations consistent with that model. [L12](12-feature-matching.md)

5. **When is a homography an appropriate correspondence model?**<br>中文抓手：同一平面或特定纯旋转情形。<br>**Answer (English):** A homography maps corresponding image points on a common plane under perspective projection. It can also describe certain camera-motion cases such as pure rotation, but it is not a general point-to-point mapping for arbitrary 3D scenes. [L12](12-feature-matching.md) · [L14](14-two-view-geometry.md)

6. **What assumptions are needed for the simple stereo-depth formula?**<br>中文抓手：已标定、对齐、正确对应与统一单位。<br>**Answer (English):** The relation $Z=fB/d$ assumes a calibrated, rectified stereo pair and a correct correspondence, with focal length and disparity in matching units. A smaller disparity indicates greater depth, but correspondence and disparity errors make distant estimates less reliable. [L13](13-depth-stereo.md)

7. **What is the difference between an essential matrix and a fundamental matrix?**<br>中文抓手：归一化相机坐标与像素坐标。<br>**Answer (English):** The essential matrix expresses the epipolar constraint in normalised camera coordinates and depends on relative camera pose. The fundamental matrix expresses the corresponding constraint in image pixel coordinates and also incorporates camera intrinsics. [L14](14-two-view-geometry.md)

8. **What makes a local descriptor useful for matching across views?**<br>中文抓手：同一点变化后仍相近，不同点仍能区分。<br>**Answer (English):** A useful descriptor should be repeatable for the same scene point despite relevant image changes, such as scale, rotation or moderate lighting variation. It should also be distinctive enough to separate different points; geometric verification is still needed after descriptor matching. [L11](11-features.md) · [L12](12-feature-matching.md)

### 图像生成

1. **Why is a VAE more suitable for sampling than a plain autoencoder?**<br>中文抓手：AE 只学重建，VAE 还约束潜空间分布。<br>**Answer (English):** A plain autoencoder learns to reconstruct encoded training inputs but does not ensure that arbitrary latent samples decode to plausible images. A VAE trains a latent distribution towards a prior, while balancing that constraint with reconstruction, so samples can be drawn from the prior. [L15](15-generation.md)

2. **What is mode collapse in a GAN, and how might it be noticed?**<br>中文抓手：逼真却只覆盖少数模式。<br>**Answer (English):** Mode collapse occurs when the generator produces only a small range of outputs while still fooling the discriminator. Repeated or near-duplicate generated samples and poor coverage of the training distribution are warning signs; image sharpness alone cannot reveal the problem. [L16](16-gans.md)

3. **What is learned during diffusion training, and what happens at generation time?**<br>中文抓手：训练知道加入的噪声，生成从随机噪声开始。<br>**Answer (English):** During training, the model sees a noisy image and its timestep and learns to estimate the added noise or the original image. During generation, it starts from random noise and repeatedly applies a specified reverse sampling procedure to produce a new image. [L17](17-diffusion.md)

### 分割与目标检测

1. **How do region, semantic and instance segmentation differ?**<br>中文抓手：相似区域、逐像素类别、逐个物体身份。<br>**Answer (English):** Region segmentation groups pixels by image similarity without necessarily naming the regions. Semantic segmentation assigns a class to each pixel, while instance segmentation also separates distinct objects of the same class. [L19](19-segmentation-i.md)

2. **Why does U-Net use both downsampling and skip connections?**<br>中文抓手：扩大感受野与补回高分辨率定位。<br>**Answer (English):** Downsampling lets the encoder capture broader context, and upsampling restores spatial resolution for a dense output. Skip connections concatenate earlier high-resolution features with decoder features to improve localisation. [L20](20-segmentation-ii.md)

3. **Why can a prompt-based segmenter return several masks?**<br>中文抓手：一个点或框可能对应不同粒度的目标。<br>**Answer (English):** A point or box can be ambiguous about whether the target is a whole object, one of its parts or a larger region. A prompt-based model can propose several masks and estimate their quality, but the prompt does not guarantee a unique correct boundary. [L20](20-segmentation-ii.md)

4. **How do region-proposal and single-stage detectors differ?**<br>中文抓手：先候选再分类定位，与一次性直接预测。<br>**Answer (English):** Region-proposal methods first select candidate regions and then classify and refine them using shared or region-level features. Single-stage methods predict classes and boxes directly over the image features, avoiding a separate proposal stage. [L21](21-object-detection-i.md) · [L22](22-object-detection-ii.md)

5. **How does DETR handle duplicate predictions?**<br>中文抓手：对象查询、集合预测、一对一匹配。<br>**Answer (English):** DETR predicts a fixed set of object slots and uses one-to-one matching between predictions and ground-truth objects during training. Unmatched slots are assigned a no-object target, so the original set-prediction approach does not rely on conventional non-maximum suppression. [L22](22-object-detection-ii.md)

6. **How do NMS and detection evaluation use IoU differently?**<br>中文抓手：预测框之间去重，与预测框对真值判定。<br>**Answer (English):** NMS compares predicted boxes with other predicted boxes to remove duplicates before evaluation. Evaluation compares predictions with unused ground-truth boxes of the same class under a specified IoU threshold, so the two thresholds serve different purposes. [L22](22-object-detection-ii.md)

7. **What is the difference between precision, recall, AP and mAP?**<br>中文抓手：单阈值比例、整条曲线、跨类别或协议平均。<br>**Answer (English):** Precision measures the fraction of reported detections that are correct, and recall measures the fraction of ground-truth objects found. AP summarises a class's precision–recall curve under a stated protocol, while mAP averages the specified AP values across classes and possibly IoU thresholds. [L22](22-object-detection-ii.md)

## 英文答题自检

- **Define the object of the question**：先说明该方法输入与输出，不只写一个术语名。
- **State the mechanism**：用一个因果句说明为什么能达到该效果，例如 “because the filter weights are shared across spatial positions”。
- **Qualify the claim**：加上必要条件或局限，例如 “for a calibrated, rectified stereo pair” 或 “under the stated evaluation protocol”。
- **Compare on one axis at a time**：比较方法时明确比较的是输入、表示、计算、输出还是评价，不用 “better” 代替具体依据。
