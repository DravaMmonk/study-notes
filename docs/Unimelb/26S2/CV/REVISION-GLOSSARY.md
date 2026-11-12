# COMP90086 复习清单与中英术语表

范围：本目录的 **21 篇内容讲笔记（L01–L17、L19–L22）**，以及这些笔记中明确连接的 Workshop 补充；L18 已取消。这里的“覆盖”指笔记中的主要概念、方法、模型、评价量和常见边界，不把讲义每个例子、截图或阅读链接当成独立术语，也不预测考试范围。

用法：遮住中文解释，先说出英文术语的中文含义，再用自己的话解释它如何工作或何时使用；能做到后勾选。网页上的勾选只在当前页面有效，长期记录可在 Markdown 文件中勾选。每讲标题可返回原笔记查公式、图示和自测题。重复出现的术语只在首次合适的位置解释一次。

## 图像、成像与处理

### [L01 Introduction](01-introduction.md)

- [ ] **Computer vision（计算机视觉）**：从图像推断场景内容、结构或变化。
- [ ] **Image classification（图像分类）**：为整幅图像预测一个或多个类别标签。
- [ ] **Object detection（目标检测）**：同时预测物体类别及其所在的边界框。
- [ ] **Image segmentation（图像分割）**：为像素或区域分配类别、前景或实例身份。
- [ ] **Depth estimation（深度估计）**：估计场景点到相机的距离或相对远近。
- [ ] **Inverse problem（逆问题）**：从二维观测反推三维场景时，多个不同场景可能产生相同图像。
- [ ] **Computer graphics（计算机图形学）**：从场景、材质、光照和相机设定生成图像，与视觉推断的方向相反。
- [ ] **Visual tracking（视觉跟踪）**：在连续图像中维持同一目标的位置或身份。
- [ ] **Augmented reality, AR（增强现实）**：估计现实场景和相机状态后，把虚拟内容对齐并叠加到图像上。

### [L02 Imaging Basics](02-basics.md)

- [ ] **Pinhole camera（针孔相机）**：让光线通过单一光心投影，用简化几何关系描述三维到二维的映射。
- [ ] **Perspective projection（透视投影）**：物体在图像上的大小随深度增加而缩小，简化模型中像高满足 $|h|=fH/Z$。
- [ ] **Focal length（焦距）**：控制投影比例和视角，比较时必须固定传感器大小与单位。
- [ ] **Aperture（光圈）**：镜头允许光进入的开口大小，会影响进光量与景深。
- [ ] **Depth of field（景深）**：在给定成像条件下看起来足够清晰的距离范围。
- [ ] **Lens distortion（镜头畸变）**：实际镜头使直线或位置偏离理想针孔投影的现象。
- [ ] **Adversarial example（对抗样本）**：对输入做有意的小扰动就能使模型预测明显改变，提醒我们高置信度不等于可靠理解。
- [ ] **Pixel and channel（像素与通道）**：像素是图像采样位置，彩色像素通常由多个通道数值表示。
- [ ] **Image coordinates（图像坐标）**：几何坐标常写 $(x,y)$，数组索引通常按行、列访问，二者顺序不能混淆。
- [ ] **Dynamic range and data type（动态范围与数据类型）**：图像的数值表示范围与存储类型有关，`uint8` 的 0–255 不限制浮点中间计算。
- [ ] **Cropping（裁剪）**：只选取原图的一块区域，不改变所选像素的采样间距。
- [ ] **Resampling（重采样）**：在新坐标网格上计算像素值，以改变图像尺寸或几何位置。
- [ ] **Nearest-neighbour interpolation（最近邻插值）**：用最接近目标位置的一个原像素作为输出。
- [ ] **Bilinear interpolation（双线性插值）**：按距离对目标位置周围四个像素加权求值。
- [ ] **Aliasing and anti-aliasing（混叠与抗混叠）**：缩小时高频图案可能被误采成低频假象，因此常先做适当低通滤波。

### [L03 Spatial Filtering](03-filters.md)

- [ ] **Point operation（逐像素运算）**：每个输出像素只依赖同位置的输入值。
- [ ] **Local operation（局部运算）**：每个输出像素由输入图像中一个邻域决定。
- [ ] **Kernel / filter（滤波核／滤波器）**：一个可在图像上滑动的权重阵列，指定邻域值如何组合。
- [ ] **Linear filtering（线性滤波）**：把邻域像素与核权重相乘再求和，形成每个输出值。
- [ ] **Cross-correlation（互相关）**：滤波核不翻转，直接在当前位置与图像邻域逐项相乘求和。
- [ ] **Convolution（卷积）**：先翻转滤波核再做局部加权和，因此对非对称核与互相关不同。
- [ ] **Gaussian smoothing（高斯平滑）**：以中心权重较高的高斯核平均邻域，削弱高频噪声和细节。
- [ ] **Gaussian scale, σ（高斯尺度）**：标准差 $\sigma$ 控制平滑核扩散范围，越大通常模糊越强。
- [ ] **Sobel filter（Sobel 滤波器）**：用带平滑的差分核估计水平或垂直方向的亮度变化。
- [ ] **Sharpening（锐化）**：增强局部变化，使边缘和细节更突出，也可能放大噪声。
- [ ] **Motion blur（运动模糊）**：沿运动方向把多个位置的亮度混合，形成方向性的拖影。
- [ ] **Separable filter（可分离滤波器）**：把二维核写成两个一维核，依次滤波以减少计算量。
- [ ] **Padding / boundary handling（补边／边界处理）**：为图像边缘邻域指定额外值或延拓规则，从而决定边缘输出。
- [ ] **Valid and same output（有效输出与同尺寸输出）**：前者只在核完全覆盖原图时计算，后者通过补边保持目标尺寸。

### [L04 Frequency Filtering](04-fourier.md)

- [ ] **Spatial frequency（空间频率）**：描述图像亮度随位置变化的快慢，而非物体运动速度。
- [ ] **Amplitude and phase（幅度与相位）**：幅度表示各频率成分的强弱，相位决定它们在图像中的排列位置。
- [ ] **Fourier transform（傅里叶变换）**：把空间图像表示为不同二维频率成分的组合。
- [ ] **Frequency spectrum（频谱）**：显示图像各频率成分的分布，中心位置通常对应低频。
- [ ] **Convolution theorem（卷积定理）**：空间域卷积对应频域逐点相乘，可用来设计或计算滤波。
- [ ] **Low-pass filter（低通滤波器）**：保留缓慢变化的成分并抑制细节和噪声。
- [ ] **High-pass filter（高通滤波器）**：保留快速变化的成分，使边缘和细节更显著。
- [ ] **Band-pass filter（带通滤波器）**：仅保留指定频率范围内的成分。
- [ ] **Ringing（振铃）**：频域中突然截断频率会在图像边缘附近产生波纹伪影。
- [ ] **Frequency-domain compression（频域压缩）**：利用部分变换系数承载主要视觉信息，减少需要保存的数据。

### [L05 Image Formation II](05-image-formation-ii.md)

- [ ] **Lambertian reflectance（朗伯反射）**：理想漫反射表面的亮度随入射光与表面法线夹角变化。
- [ ] **Illumination and reflectance（照明与反射率）**：像素亮度同时受光源和表面性质影响，不能把暗处直接判作深色材质。
- [ ] **Spectral response（光谱响应）**：传感器通道把一段波长范围的光整合成数值，而非只读取单个波长。
- [ ] **Colour space（颜色空间）**：用选定坐标系统表示颜色，例如 RGB 或 HSV，以便针对不同任务处理。
- [ ] **Shape from shading（由明暗推断形状）**：利用亮度变化推测表面方向，但未知光照和反射率会造成歧义。
- [ ] **Image gradient（图像梯度）**：以两个方向的偏导数组成向量，描述亮度变化最快的方向与大小。
- [ ] **Edge（边缘）**：亮度快速变化的位置，可能由物体边界、纹理、阴影或高光产生。
- [ ] **Invariance（不变性）**：输入发生指定变化时，所用表示或预测仍保持相同。
- [ ] **Equivariance（等变性）**：输入发生变化时，输出按可预测的对应方式变化。
- [ ] **Tolerance（容忍度）**：模型在有限变化范围内保持表现，而不保证严格数学不变。

## 学习特征与表示

### [L06 Convolutional Neural Networks I](06-cnns-i.md)

- [ ] **Feature representation（特征表示）**：把原始像素变成更适合分类或其他任务的数值描述。
- [ ] **Class imbalance（类别不平衡）**：各类别样本数量差异大时，总体准确率可能掩盖少数类的错误。
- [ ] **Confusion matrix（混淆矩阵）**：按真实类别与预测类别计数，以显示模型主要把哪些类别混淆。
- [ ] **Multilayer perceptron, MLP（多层感知机）**：用全连接层和非线性变换逐层计算特征与类别分数。
- [ ] **Convolutional neural network, CNN（卷积神经网络）**：用局部连接和共享滤波器从图像提取多层特征。
- [ ] **Learned filter（学习得到的滤波器）**：卷积核权重由训练数据和损失优化决定，而非人工固定。
- [ ] **Feature map / activation map（特征图／激活图）**：一个滤波器在各空间位置的响应构成一张输出图。
- [ ] **Multi-channel convolution（多通道卷积）**：每个输出通道综合所有输入通道上的核响应。
- [ ] **Weight sharing（权重共享）**：同一滤波器在不同空间位置复用参数，减少参数量并利用局部模式。
- [ ] **Receptive field（感受野）**：某个输出单元在原输入中能够受到影响的区域。
- [ ] **Stride（步幅）**：滤波核每次移动的距离，增大步幅通常会缩小输出尺寸。
- [ ] **Convolution output size（卷积输出尺寸）**：输出宽高由输入尺寸、核大小、补边与步幅共同决定。

### [L07 Convolutional Neural Networks II](07-cnns-ii.md)

- [ ] **Downsampling（下采样）**：减少特征图的空间采样点，以控制计算量并扩大后续单元的视野。
- [ ] **Max pooling（最大池化）**：对每个局部窗口取最大值，保留最强响应。
- [ ] **Average pooling（平均池化）**：对每个局部窗口取平均值，概括邻域响应。
- [ ] **Overfitting（过拟合）**：模型在训练样本上表现好，却不能可靠推广到新数据。
- [ ] **L1 and L2 regularisation（L1 与 L2 正则化）**：在训练目标中惩罚权重大小，以约束模型复杂度。
- [ ] **Dropout（随机丢弃）**：训练时随机关闭部分激活，降低对特定神经元组合的依赖。
- [ ] **Early stopping（提前停止）**：根据验证集表现停止训练，以避免继续拟合训练集噪声。
- [ ] **Softmax（Softmax 归一化）**：把类别分数转换为总和为一的类别概率。
- [ ] **Cross-entropy loss（交叉熵损失）**：对正确类别的低预测概率施加更大惩罚。
- [ ] **Training / validation / test split（训练／验证／测试划分）**：分别用于拟合参数、选择方案和估计最终泛化表现。
- [ ] **Mini-batch and epoch（小批次与训练轮）**：小批次是一次更新使用的样本集合，训练轮是完整遍历训练集一次。
- [ ] **Learning rate（学习率）**：控制每次参数更新的步长。
- [ ] **Data augmentation（数据增强）**：对训练图像施加标签仍适用的变化，以增加训练样本的变化范围。

### [L08 Convolutional Neural Networks III](08-cnns-iii.md)

- [ ] **Classification accuracy（分类准确率）**：正确预测数占样本总数的比例，解读时仍需检查类别分布和错误类型。
- [ ] **Parameter count and FLOPs（参数量与浮点运算量）**：前者衡量模型需要存储的权重数，后者近似衡量一次推理的计算工作量。
- [ ] **AlexNet（AlexNet 网络）**：早期大规模图像分类 CNN 架构，展示深层卷积特征的实用性。
- [ ] **VGG（VGG 网络）**：通过堆叠小尺寸卷积核逐步扩大感受野。
- [ ] **Inception module（Inception 模块）**：在同一层并行处理多种尺度的特征并合并结果。
- [ ] **Residual connection（残差连接）**：把输入直接加到变换输出上，使网络学习相对于输入的修正。
- [ ] **Depthwise separable convolution（深度可分离卷积）**：先逐通道做空间滤波，再用逐点卷积混合通道以降低计算成本。
- [ ] **MobileNet（MobileNet 网络）**：以深度可分离卷积为核心，面向计算受限场景设计的 CNN 家族。
- [ ] **Compound scaling（复合缩放）**：协调增加网络深度、宽度和输入分辨率，而非只扩大一个维度。
- [ ] **Transfer learning（迁移学习）**：把已有数据上学到的参数或特征用于新任务。
- [ ] **Fine-tuning（微调）**：在预训练模型基础上继续更新部分或全部参数，使其适应目标数据。
- [ ] **Frozen feature extractor（冻结的特征提取器）**：固定预训练主干，仅训练新任务的输出层。

### [L09 Vision Transformers](09-vit.md)

- [ ] **Inductive bias（归纳偏置）**：模型结构预先赋予的假设，例如 CNN 的局部性与平移相关权重共享。
- [ ] **Patch embedding（图块嵌入）**：把图像切成图块并映射为一串向量 token。
- [ ] **Class token, [CLS]（分类 token）**：在图块序列中加入可学习向量，由其最终表示形成整图分类结果。
- [ ] **Positional embedding（位置编码）**：为图块 token 加入位置信息，使模型能区分相同内容出现在何处。
- [ ] **Query, Key, Value（查询、键、值）**：注意力用查询与键计算相关度，再按权重聚合对应的值。
- [ ] **Self-attention（自注意力）**：让同一输入序列的 token 根据彼此相关度交换信息。
- [ ] **Multi-head attention（多头注意力）**：并行学习多组注意力关系，再合并它们的结果。
- [ ] **Transformer encoder block（Transformer 编码器块）**：通常结合多头自注意力、前馈网络、残差连接与归一化更新 token。
- [ ] **Feed-forward network, FFN（前馈网络）**：在 Transformer 块中对各 token 分别施加相同的非线性特征变换。
- [ ] **Vision Transformer, ViT（视觉 Transformer）**：以图块 token 和 Transformer 编码器处理图像的模型。
- [ ] **Attention complexity（注意力计算成本）**：全局注意力需比较 token 两两关系，因此图块更小会显著增加计算量。

### [L10 Representation Learning](10-representations.md)

- [ ] **Self-supervised learning（自监督学习）**：从数据自身构造训练信号，以减少对人工类别标签的依赖。
- [ ] **Contrastive learning（对比学习）**：拉近相关样本的表示并拉远不相关样本的表示。
- [ ] **Positive and negative pairs（正样本对与负样本对）**：分别提供应该相近和应该区分的表示训练关系。
- [ ] **CLIP（图文对比预训练模型）**：通过图像与文本配对的对比训练，把两种模态映射到可比较的表示空间。
- [ ] **Zero-shot classification（零样本分类）**：不在目标类别上重新训练分类头，而用图像与类别文本的相似度预测类别。
- [ ] **Embedding space（嵌入空间）**：表示向量所在的空间，其中距离或相似度用于比较样本关系。
- [ ] **Bag of visual words（视觉词袋）**：统计图像中出现的局部视觉模式，若不加空间编码就会丢失它们的布局。
- [ ] **PCA and t-SNE（主成分分析与 t-SNE）**：把高维表示投影到低维以观察邻居关系，但图上距离不能直接当成原空间距离。
- [ ] **Occlusion sensitivity（遮挡敏感性）**：遮住图像不同区域，观察目标预测如何变化。
- [ ] **Class activation map, CAM（类别激活图）**：把空间特征对特定类别分数的贡献映射回图像位置。
- [ ] **Grad-CAM（梯度加权类别激活图）**：利用目标类别对特征图的梯度权重生成粗略定位热图。
- [ ] **Texture bias（纹理偏置）**：模型可能主要利用局部纹理而非人期望的整体形状作判断。
- [ ] **Distribution shift（分布变化）**：测试数据与训练数据的来源或特征不同，可能导致性能下降。

## 局部特征、匹配与三维

### [L11 Local Features](11-features.md)

- [ ] **Keypoint / interest point（关键点／兴趣点）**：在不同图像中有望重复找到的局部位置。
- [ ] **Detector and descriptor（检测器与描述子）**：前者决定选哪些位置，后者把位置周围的外观编码以便比较。
- [ ] **Corner（角点）**：图像小窗口向多个方向移动都会明显改变外观的位置。
- [ ] **Structure tensor（结构张量）**：汇总局部梯度方向和强度，用于判断窗口沿不同方向变化的程度。
- [ ] **Structure-tensor eigenvalues（结构张量特征值）**：两个特征值分别反映局部窗口沿两个主方向的亮度变化程度。
- [ ] **Harris corner response（Harris 角点响应）**：由结构张量的行列式和迹构造分数，以区分角点、边缘和平坦区。
- [ ] **Non-maximum suppression for keypoints（关键点非极大值抑制）**：只保留局部响应峰值，避免同一角点周围出现密集重复检测。
- [ ] **SIFT（尺度不变特征变换）**：在尺度与方向对齐后，用局部梯度方向统计描述关键点外观。
- [ ] **Scale and orientation alignment（尺度与方向对齐）**：比较特征前统一局部区域大小和主方向，提高跨图像匹配稳定性。

### [L12 Feature Matching](12-feature-matching.md)

- [ ] **Feature correspondence（特征对应）**：判断两幅图中的局部特征是否来自同一场景点。
- [ ] **Noise and outlier（噪声与外点）**：噪声使正确观测偏移，外点则是完全错误的对应或观测。
- [ ] **Geometric consistency（几何一致性）**：正确对应应共同满足同一个变换或相机几何约束。
- [ ] **Hough transform（霍夫变换）**：让观测在参数空间投票，寻找支持同一几何模型的峰值。
- [ ] **RANSAC（随机采样一致性算法）**：反复从最小样本估计模型，选择被最多内点支持的候选。
- [ ] **Inlier（内点）**：在设定误差阈值内符合当前几何模型的观测。
- [ ] **Lowe ratio test（最近邻距离比值检验）**：比较最佳与次佳描述子距离，剔除不够明确的匹配。
- [ ] **FLANN（快速近似最近邻库）**：加速描述子候选检索，但不能替代后续几何一致性检查。
- [ ] **Homography（单应变换）**：用 $3\times3$ 齐次矩阵描述同一平面在两幅透视图像间的映射。
- [ ] **Minimal sample（最小样本）**：估计模型所需的最少独立对应，例如一般平面单应变换需四对点。

### [L13 Depth and Stereo](13-depth-stereo.md)

- [ ] **Monocular depth cue（单目深度线索）**：利用遮挡、透视或已知尺度等图像线索推测远近，但单张图通常缺少绝对尺度。
- [ ] **Stereo baseline（双目基线）**：两台相机光心之间的距离，决定视差转成深度时的几何比例。
- [ ] **Disparity（视差）**：同一场景点在校正后的左右图中对应位置的水平差。
- [ ] **Stereo depth（双目深度）**：在校正的针孔双目模型中由 $Z=fB/d$ 根据焦距、基线和视差求得。
- [ ] **Epipolar search（极线搜索）**：利用双目几何把对应点搜索从整幅图缩小到一条极线。
- [ ] **Window matching cost（窗口匹配代价）**：比较候选对应位置附近的图像块，衡量它们的外观差异。
- [ ] **Smoothness constraint（平滑约束）**：偏好邻近像素具有相近视差，同时要允许真实深度边界。
- [ ] **Occlusion in stereo（双目遮挡）**：某个场景点只在一侧相机可见，因而无法找到有效对应。
- [ ] **Supervised depth learning（监督式深度学习）**：使用真实深度标签训练图像到深度的预测模型。
- [ ] **Stereo self-supervision（双目自监督）**：利用左右图重建的一致性提供深度训练信号，而无需每个像素的深度标签。

### [L14 Two-view Geometry](14-two-view-geometry.md)

- [ ] **Homogeneous coordinates（齐次坐标）**：用可整体缩放的扩展向量表示图像点或直线，便于写成矩阵关系。
- [ ] **Cross product（叉积）**：在齐次二维图像中，两点的叉积给出过它们的直线，两线的叉积给出交点。
- [ ] **Camera intrinsics（相机内参）**：描述焦距、主点等相机内部成像尺度和坐标映射的参数。
- [ ] **Camera extrinsics（相机外参）**：描述相机相对世界或另一相机的旋转与平移。
- [ ] **Camera calibration（相机标定）**：由图像观测估计相机内参、畸变或相机间几何关系。
- [ ] **Epipolar plane（极平面）**：由两相机光心与同一三维点共同确定的平面。
- [ ] **Epipole and epipolar line（极点与极线）**：极点是另一相机光心在图像中的投影，极线是匹配点必须位于的直线。
- [ ] **Essential matrix, E（本质矩阵）**：在归一化相机坐标中编码两相机相对姿态的极线约束。
- [ ] **Fundamental matrix, F（基础矩阵）**：在像素坐标中编码两视图对应点之间的极线约束。
- [ ] **Eight-point algorithm（八点法）**：由至少八对对应点建立线性方程，估计基础矩阵并施加其秩约束。
- [ ] **Stereo rectification（双目校正）**：变换两幅图，使对应点落在同一图像行以简化搜索。
- [ ] **Triangulation（三角化）**：从两条相机观测射线的关系估计三维点位置。
- [ ] **Geometric degeneracy（几何退化）**：相机运动或场景结构使某些三维量无法稳定估计的情况。

## 图像生成

### [L15 Image Generation](15-generation.md)

- [ ] **Generative model（生成模型）**：学习数据分布或产生数据的过程，以采样生成新图像。
- [ ] **Conditional generation（条件生成）**：在类别、文字或图像等给定条件下生成符合条件的样本。
- [ ] **Probability density（概率密度）**：描述连续变量在各位置附近的相对可能性，而不是单点的概率。
- [ ] **Autoencoder, AE（自编码器）**：用编码器压缩输入，再由解码器重建输入。
- [ ] **Bottleneck（瓶颈表示）**：限制潜在表示的容量，迫使模型保留有助于重建的信息。
- [ ] **Latent variable（潜变量）**：生成模型中间使用的隐藏变量，可作为解码或生成的输入。
- [ ] **Variational autoencoder, VAE（变分自编码器）**：让编码器输出潜变量分布，并同时优化重建和分布约束。
- [ ] **Reparameterisation trick（重参数化技巧）**：把随机采样写成固定噪声与可学习参数的函数，使梯度能穿过采样步骤。
- [ ] **Reconstruction loss（重建损失）**：比较解码输出与原图，促使模型保留输入内容。
- [ ] **KL divergence in VAE（VAE 中的 KL 散度）**：约束编码后的潜变量分布靠近选定先验，便于从先验采样。
- [ ] **Prior sampling（先验采样）**：生成时从预设潜变量分布取样，而不是把训练图像送进编码器。

### [L16 Generative Adversarial Networks](16-gans.md)

- [ ] **Generative adversarial network, GAN（生成对抗网络）**：让生成器与判别器通过对抗目标共同训练图像生成。
- [ ] **Generator（生成器）**：把随机变量及可选条件映射为生成图像。
- [ ] **Discriminator（判别器）**：区分真实图像与生成图像，为生成器提供训练信号。
- [ ] **Adversarial objective（对抗目标）**：判别器尝试分辨真假，生成器尝试让生成样本难以分辨。
- [ ] **Mode collapse（模式坍塌）**：生成器反复输出少数类型样本，缺失数据分布中的多样性。
- [ ] **Memorisation（记忆训练样本）**：模型复制或近似复制训练图像，而不是学到可泛化的生成规律。
- [ ] **Inception score（Inception 分数）**：用预训练分类器的预测评估类别置信度和类别多样性，但不能单独证明生成质量。
- [ ] **Conditional GAN（条件 GAN）**：把标签或其他输入同时用于生成与判别，以控制生成内容。
- [ ] **Cycle consistency（循环一致性）**：要求图像经跨域变换再变回原域后尽量恢复原内容，用于缺少成对样本的转换。

### [L17 Diffusion Models](17-diffusion.md)

- [ ] **Diffusion model（扩散模型）**：学习从噪声逐步还原数据的过程，以生成新样本。
- [ ] **Gaussian noise（高斯噪声）**：服从正态分布的随机扰动，独立噪声相加时方差相加。
- [ ] **Noise schedule（噪声日程）**：规定各时间步加入多少噪声，决定信号如何逐渐消失。
- [ ] **Forward diffusion（前向扩散）**：按时间步给真实图像加入噪声，得到逐渐更混乱的状态。
- [ ] **Cumulative noise formula（累计加噪公式）**：直接由原图和随机噪声构造任一时间步的加噪图，无需逐步模拟前面所有状态。
- [ ] **Timestep conditioning（时间步条件）**：把当前噪声程度告知模型，使其针对不同时间步预测。
- [ ] **Noise prediction loss（噪声预测损失）**：训练模型从加噪图及时间步估计当时加入的噪声。
- [ ] **Reverse sampling（反向采样）**：从随机噪声出发，按选定采样规则逐步得到图像。
- [ ] **Latent diffusion（潜空间扩散）**：先把图像压缩到潜空间，在较小表示上执行扩散以降低成本。
- [ ] **Inpainting（图像补全）**：在已知区域约束下生成缺失区域内容。
- [ ] **Sampling cost（采样成本）**：生成时的步骤数和每步模型计算共同影响速度，减少步骤可能改变质量。

## 分割与检测

### [L19 Image Segmentation I](19-segmentation-i.md)

- [ ] **Region segmentation（区域分割）**：按像素相似性把图像划成区域，区域本身未必有语义类别。
- [ ] **Semantic segmentation（语义分割）**：为每个像素预测类别，但同类物体实例可能合在一起。
- [ ] **Instance segmentation（实例分割）**：同时区分每个物体的类别和各自的像素掩码。
- [ ] **K-means clustering（K 均值聚类）**：反复把样本分配给最近中心并更新中心，以形成预定数量的簇。
- [ ] **Gaussian mixture model, GMM（高斯混合模型）**：用多个高斯分布的加权和表示数据群组。
- [ ] **Mean shift（均值漂移）**：反复向邻域的加权均值移动，寻找特征密度较高的模式。
- [ ] **Bandwidth（带宽）**：控制均值漂移或核方法中邻域的范围，从而影响分割粒度。
- [ ] **Spatial-colour feature（空间颜色特征）**：把位置与颜色合成像素表示，使分组同时考虑外观和空间接近性。
- [ ] **Superpixel（超像素）**：把邻近且相似的像素先合成小区域，作为后续处理单元。
- [ ] **Oversegmentation（过分割）**：先划出多于最终目标的小区域，以降低跨越真实边界的风险。
- [ ] **SLIC（简单线性迭代聚类）**：在局部范围内按颜色与位置聚类，并处理超像素连通性。
- [ ] **Region adjacency graph, RAG（区域邻接图）**：把区域当作节点、接壤关系当作边，供区域合并使用。
- [ ] **Stuff and things（连续材质与可数物体）**：前者如天空和草地通常不逐个计数，后者如人和车通常需要区分实例。
- [ ] **GrabCut（GrabCut 前景提取）**：利用用户给定的框和前背景模型，迭代优化前景掩码。
- [ ] **Mask R-CNN（Mask R-CNN）**：在检测框预测之外为每个实例增加像素掩码分支。

### [L20 Image Segmentation II](20-segmentation-ii.md)

- [ ] **Pixel-wise classification（逐像素分类）**：对图像每个位置分别预测语义类别。
- [ ] **Fully convolutional network, FCN（全卷积网络）**：用卷积式输出保持空间结构，产生逐位置预测而非单个整图类别。
- [ ] **Encoder–decoder（编码器—解码器）**：先压缩提取语义特征，再逐步恢复空间分辨率以输出掩码。
- [ ] **Upsampling（上采样）**：增加特征图的空间分辨率，但单纯放大不保证恢复丢失的边界细节。
- [ ] **Max unpooling（最大反池化）**：利用池化时记录的最大值位置，把激活放回较大的稀疏网格。
- [ ] **Transposed convolution（转置卷积）**：把输入位置的加权贡献散布到更大输出网格，并在重叠处求和。
- [ ] **Skip connection in U-Net（U-Net 跳跃连接）**：把编码器早期的高分辨率特征拼接到解码器对应尺度，补回定位信息。
- [ ] **Segmentation loss（分割损失）**：比较预测掩码和目标掩码，可按类别或边界需要调整像素权重。
- [ ] **Focal loss（焦点损失）**：降低容易分类的样本对损失的主导作用，使训练更关注困难样本。
- [ ] **Dice loss（Dice 损失）**：根据预测掩码与真值掩码的重叠程度构造训练损失。
- [ ] **Segment Anything Model, SAM（任意目标分割模型）**：根据点、框等提示产生可能的目标掩码，并可输出多个候选。
- [ ] **Mask quality prediction（掩码质量预测）**：估计候选掩码的质量，帮助从多个输出中选择。

### [L21 Object Detection I](21-object-detection-i.md)

- [ ] **Bounding box（边界框）**：用矩形的坐标和尺寸表示检测目标的位置。
- [ ] **Sliding window（滑动窗口）**：在多个位置和尺度重复运行分类器以寻找物体，通常计算成本较高。
- [ ] **Intersection over union, IoU（交并比）**：用预测框与参考框的交集面积除以并集面积衡量重叠程度。
- [ ] **Region proposal（候选区域）**：先生成可能含物体的区域，再对较少候选做精细分类与定位。
- [ ] **Selective Search（选择性搜索）**：依据相邻区域的相似性逐步合并，产生多尺度候选框。
- [ ] **Bounding-box regression（边界框回归）**：预测框坐标或相对偏移，以修正候选框的位置和大小。
- [ ] **R-CNN（区域卷积神经网络）**：对每个候选区域分别提取 CNN 特征，再分类并修正框。
- [ ] **Fast R-CNN（快速 R-CNN）**：先对整图计算共享特征，再从特征图抽取各候选区域的表示。
- [ ] **RoI pooling（兴趣区域池化）**：把不同大小的候选区域特征汇总为固定尺寸，供检测头使用。
- [ ] **Anchor box（锚框）**：预设不同尺度和长宽比的参考框，供模型预测物体性与偏移。
- [ ] **Region proposal network, RPN（区域候选网络）**：在共享特征图上学习产生候选框，构成 Faster R-CNN 的第一阶段。
- [ ] **Faster R-CNN（更快的 R-CNN）**：用 RPN 替代外部候选搜索，再对候选进行分类与框回归。

### [L22 Object Detection II](22-object-detection-ii.md)

- [ ] **One-stage detector（单阶段检测器）**：直接从图像特征预测类别和框，无需先单独生成候选区域。
- [ ] **YOLO v1（YOLO 第一版）**：把图像划成网格，让网格单元预测框、置信度与类别。
- [ ] **Object query（对象查询）**：DETR 使用的可学习查询向量，用来从图像特征中提取一个候选物体的表示。
- [ ] **DEtection TRansformer, DETR（检测 Transformer）**：把检测结果视作无固定顺序的对象集合，用 Transformer 直接预测类别和框。
- [ ] **Bipartite matching（二分图匹配）**：把预测与真实目标一对一分配，使集合预测可以训练。
- [ ] **No-object class（无物体类别）**：标记没有匹配到真实目标的预测槽位。
- [ ] **Non-maximum suppression, NMS（非极大值抑制）**：按分数保留较好预测框，并删除与其高度重叠的重复框。
- [ ] **Evaluation IoU threshold（评价交并比阈值）**：规定预测框与真实框至少要重叠多少，才能计作一次成功定位。
- [ ] **True positive / false positive / false negative（真正例／假正例／假负例）**：分别表示成功匹配的检测、多余或错误的检测，以及漏检目标。
- [ ] **Precision（精确率）**：成功匹配的预测占全部被判为目标的预测比例。
- [ ] **Recall（召回率）**：成功匹配的真实目标占全部真实目标比例。
- [ ] **Precision–recall curve（精确率—召回率曲线）**：改变置信度阈值后，显示精确率与召回率之间的取舍。
- [ ] **Average precision, AP（平均精确率）**：按指定评价协议汇总一个类别的精确率—召回率表现。
- [ ] **Mean average precision, mAP（平均 AP）**：对指定类别及可能指定的 IoU 阈值下的 AP 取平均，必须说明评价协议。

## 笔记中的 Workshop 补充

以下条目来自逐讲笔记连接的操作练习，**不等同于所有讲义的必修内容**；原 Notebook、题目和答案的位置见[课程首页的 Workshop 对照](README.md)。

- [ ] **BGR versus RGB（BGR 与 RGB 通道顺序）**：OpenCV 常按 BGR 读图，向按 RGB 显示的工具传图前需调整通道。
- [ ] **NumPy view versus copy（NumPy 视图与副本）**：切片可能共享原数组内存，若需要独立修改图像就要明确复制。
- [ ] **Average attention distance（平均注意距离）**：按注意力权重汇总 token 间空间距离，观察某注意力头偏向局部还是远处。
- [ ] **Target-specific Grad-CAM（目标类别相关的 Grad-CAM）**：同一图像换目标类别会改变梯度和热图，所以解释必须附带目标类别。
- [ ] **Harris window parameters（Harris 窗口参数）**：平滑窗口与角点响应参数控制不同步骤，调参时应分别观察检测结果。
- [ ] **Normalized cut（归一化割）**：在图上权衡切断的连接与分组规模，以减少只切出极小区域的倾向。
- [ ] **Stereo block size（双目匹配窗口大小）**：较大的比较窗口通常更稳但可能抹平深度边界，需结合纹理和遮挡观察。
- [ ] **Camera calibration board（相机标定板）**：利用已知几何点的图像位置估计相机参数，并检查重投影误差。
- [ ] **MNIST CNN versus MLP（MNIST 上的 CNN 与 MLP 对照）**：在同一数据与划分下比较保留空间结构和展平像素的模型。
- [ ] **Feature map versus filter（特征图与滤波器）**：滤波器是共享权重，特征图是它在特定输入各位置产生的响应。
