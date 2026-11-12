# COMP90086 复习清单与中英术语表

范围：本目录的 **21 篇内容讲笔记（L01–L17、L19–L22）**，以及这些笔记中明确连接的 Workshop 补充；L18 已取消。这里的“覆盖”指笔记中的主要概念、方法、模型、评价量和常见边界，不把讲义每个例子、截图或阅读链接当成独立术语，也不预测考试范围。

每条术语依次列出英文名称、中文译名、英文解释和中文解释。复习时可以先遮住释义，试着用英文说出术语的含义，再对照两种解释勾选。网页上的勾选只在当前页面有效，长期记录可在 Markdown 文件中勾选。每讲标题可返回原笔记查公式、图示和自测题。

## 图像、成像与处理

### [L01 Introduction](01-introduction.md)

- [ ] **Computer vision（计算机视觉）**

    Computer vision infers the content, structure or changes of a scene from images.

    从图像推断场景内容、结构或变化。

- [ ] **Image classification（图像分类）**

    Image classification predicts one or more labels for an entire image.

    为整幅图像预测一个或多个类别标签。

- [ ] **Object detection（目标检测）**

    Object detection predicts what objects are present and where their bounding boxes are.

    同时预测物体类别及其所在的边界框。

- [ ] **Image segmentation（图像分割）**

    Image segmentation assigns categories, foreground labels or instance identities to pixels or regions.

    为像素或区域分配类别、前景或实例身份。

- [ ] **Depth estimation（深度估计）**

    Depth estimation predicts how far scene points are from the camera, either in absolute or relative terms.

    估计场景点到相机的距离或相对远近。

- [ ] **Inverse problem（逆问题）**

    An inverse problem asks us to infer a scene from its images, which can be ambiguous because different scenes may produce the same image.

    从二维观测反推三维场景时，多个不同场景可能产生相同图像。

- [ ] **Computer graphics（计算机图形学）**

    Computer graphics generates images from a description of the scene, materials, lighting and camera.

    从场景、材质、光照和相机设定生成图像，与视觉推断的方向相反。

- [ ] **Visual tracking（视觉跟踪）**

    Visual tracking follows the position or identity of an object across successive frames.

    在连续图像中维持同一目标的位置或身份。

- [ ] **Augmented reality, AR（增强现实）**

    Augmented reality aligns virtual content with the real scene and overlays it on the camera view.

    估计现实场景和相机状态后，把虚拟内容对齐并叠加到图像上。

### [L02 Imaging Basics](02-basics.md)

- [ ] **Pinhole camera（针孔相机）**

    A pinhole camera models projection from a 3D scene onto a 2D image plane through a single optical centre.

    让光线通过单一光心投影，用简化几何关系描述三维到二维的映射。

- [ ] **Perspective projection（透视投影）**

    Under perspective projection, the apparent size of an object decreases as its depth increases, with image height magnitude equal to focal length times object height divided by depth in the simple model.

    物体在图像上的大小随深度增加而缩小，简化模型中像高满足 $|h|=fH/Z$。

- [ ] **Focal length（焦距）**

    Focal length sets the projection scale and affects the field of view for a given sensor size.

    控制投影比例和视角，比较时必须固定传感器大小与单位。

- [ ] **Aperture（光圈）**

    The aperture is the opening that admits light through the lens and affects both light intake and depth of field.

    镜头允许光进入的开口大小，会影响进光量与景深。

- [ ] **Depth of field（景深）**

    Depth of field is the range of distances that appear acceptably sharp under the chosen imaging conditions.

    在给定成像条件下看起来足够清晰的距离范围。

- [ ] **Lens distortion（镜头畸变）**

    Lens distortion shifts image points away from their ideal pinhole projections and can make straight lines appear curved.

    实际镜头使直线或位置偏离理想针孔投影的现象。

- [ ] **Adversarial example（对抗样本）**

    An adversarial example is an input deliberately perturbed to mislead a model, sometimes with only a small visible change.

    对输入做有意的小扰动就能使模型预测明显改变，提醒我们高置信度不等于可靠理解。

- [ ] **Pixel and channel（像素与通道）**

    A pixel is an image sample at a spatial location, often represented by several channel values in a colour image.

    像素是图像采样位置，彩色像素通常由多个通道数值表示。

- [ ] **Image coordinates（图像坐标）**

    Geometric coordinates usually give the horizontal coordinate first, while image arrays are typically indexed by row and then column.

    几何坐标常写 $(x,y)$，数组索引通常按行、列访问，二者顺序不能混淆。

- [ ] **Dynamic range and data type（动态范围与数据类型）**

    The storage type constrains the range of values an image can store, while intermediate floating point calculations may use a wider range.

    图像的数值表示范围与存储类型有关，`uint8` 的 0–255 不限制浮点中间计算。

- [ ] **Cropping（裁剪）**

    Cropping selects a region of the original image and preserves the spacing of the selected samples.

    只选取原图的一块区域，不改变所选像素的采样间距。

- [ ] **Resampling（重采样）**

    Resampling computes pixel values on a new grid to resize or geometrically transform an image.

    在新坐标网格上计算像素值，以改变图像尺寸或几何位置。

- [ ] **Nearest-neighbour interpolation（最近邻插值）**

    Nearest-neighbour interpolation uses the value of the closest source pixel at each target location.

    用最接近目标位置的一个原像素作为输出。

- [ ] **Bilinear interpolation（双线性插值）**

    Bilinear interpolation blends the four surrounding source pixels using weights based on the target's horizontal and vertical position.

    按距离对目标位置周围四个像素加权求值。

- [ ] **Aliasing and anti-aliasing（混叠与抗混叠）**

    Aliasing makes high-frequency patterns appear as spurious lower frequencies after downsampling, and low-pass filtering beforehand can reduce it.

    缩小时高频图案可能被误采成低频假象，因此常先做适当低通滤波。

### [L03 Spatial Filtering](03-filters.md)

- [ ] **Point operation（逐像素运算）**

    A point operation computes each output pixel from the input at the same position.

    每个输出像素只依赖同位置的输入值。

- [ ] **Local operation（局部运算）**

    A local operation computes each output pixel from a neighbourhood of input pixels.

    每个输出像素由输入图像中一个邻域决定。

- [ ] **Kernel / filter（滤波核／滤波器）**

    A filter kernel is an array of weights that specifies how to combine neighbouring pixel values.

    一个可在图像上滑动的权重阵列，指定邻域值如何组合。

- [ ] **Linear filtering（线性滤波）**

    Linear filtering computes each output as a weighted sum of neighbouring input values.

    把邻域像素与核权重相乘再求和，形成每个输出值。

- [ ] **Cross-correlation（互相关）**

    Cross-correlation multiplies the image neighbourhood by the kernel as given and sums the products.

    滤波核不翻转，直接在当前位置与图像邻域逐项相乘求和。

- [ ] **Convolution（卷积）**

    Convolution flips the kernel before taking the local weighted sum, which changes the result for an asymmetric kernel.

    先翻转滤波核再做局部加权和，因此对非对称核与互相关不同。

- [ ] **Gaussian smoothing（高斯平滑）**

    Gaussian smoothing averages nearby pixels with a Gaussian kernel to attenuate high-frequency noise and detail.

    以中心权重较高的高斯核平均邻域，削弱高频噪声和细节。

- [ ] **Gaussian scale, σ（高斯尺度）**

    The standard deviation sets the spread of a Gaussian kernel, with larger values typically producing stronger blur.

    标准差 $\sigma$ 控制平滑核扩散范围，越大通常模糊越强。

- [ ] **Sobel filter（Sobel 滤波器）**

    A Sobel filter estimates a horizontal or vertical intensity derivative by combining finite differences with smoothing.

    用带平滑的差分核估计水平或垂直方向的亮度变化。

- [ ] **Sharpening（锐化）**

    Sharpening boosts local intensity changes to emphasise edges and detail and can also amplify noise.

    增强局部变化，使边缘和细节更突出，也可能放大噪声。

- [ ] **Motion blur（运动模糊）**

    Motion blur combines light from multiple positions along the motion path, producing directional streaks.

    沿运动方向把多个位置的亮度混合，形成方向性的拖影。

- [ ] **Separable filter（可分离滤波器）**

    A separable filter applies a two-dimensional kernel as two successive one-dimensional filters to reduce computation.

    把二维核写成两个一维核，依次滤波以减少计算量。

- [ ] **Padding / boundary handling（补边／边界处理）**

    Boundary handling defines how values outside the image are supplied or how positions near the border are treated.

    为图像边缘邻域指定额外值或延拓规则，从而决定边缘输出。

- [ ] **Valid and same output（有效输出与同尺寸输出）**

    Valid filtering uses positions where the kernel lies entirely inside the input, while same filtering uses padding to preserve spatial size at unit stride.

    前者只在核完全覆盖原图时计算，后者通过补边保持目标尺寸。

### [L04 Frequency Filtering](04-fourier.md)

- [ ] **Spatial frequency（空间频率）**

    Spatial frequency describes how rapidly image intensity varies with position.

    描述图像亮度随位置变化的快慢，而非物体运动速度。

- [ ] **Amplitude and phase（幅度与相位）**

    Amplitude gives the strength of a frequency component, while phase determines how that component aligns with the others in space.

    幅度表示各频率成分的强弱，相位决定它们在图像中的排列位置。

- [ ] **Fourier transform（傅里叶变换）**

    The Fourier transform expresses an image as a combination of two-dimensional frequency components.

    把空间图像表示为不同二维频率成分的组合。

- [ ] **Frequency spectrum（频谱）**

    A frequency spectrum shows how image content is distributed across frequencies, with low frequencies at the centre when the spectrum is shifted.

    显示图像各频率成分的分布，中心位置通常对应低频。

- [ ] **Convolution theorem（卷积定理）**

    The convolution theorem relates convolution in the spatial domain to pointwise multiplication in the frequency domain.

    空间域卷积对应频域逐点相乘，可用来设计或计算滤波。

- [ ] **Low-pass filter（低通滤波器）**

    A low-pass filter preserves slowly varying image components and attenuates fine detail and high-frequency noise.

    保留缓慢变化的成分并抑制细节和噪声。

- [ ] **High-pass filter（高通滤波器）**

    A high-pass filter retains rapid intensity variations, emphasising edges and fine detail.

    保留快速变化的成分，使边缘和细节更显著。

- [ ] **Band-pass filter（带通滤波器）**

    A band-pass filter retains components within a specified range of frequencies.

    仅保留指定频率范围内的成分。

- [ ] **Ringing（振铃）**

    Ringing is an oscillatory artefact near sharp image transitions that can arise from abrupt frequency cutoffs.

    频域中突然截断频率会在图像边缘附近产生波纹伪影。

- [ ] **Frequency-domain compression（频域压缩）**

    Frequency-domain compression reduces storage by preserving or encoding the transform coefficients that carry the most useful information.

    利用部分变换系数承载主要视觉信息，减少需要保存的数据。

### [L05 Image Formation II](05-image-formation-ii.md)

- [ ] **Lambertian reflectance（朗伯反射）**

    For an ideal Lambertian surface, reflected brightness depends on the cosine of the angle between the incident light direction and the surface normal.

    理想漫反射表面的亮度随入射光与表面法线夹角变化。

- [ ] **Illumination and reflectance（照明与反射率）**

    Image intensity depends on both the incident illumination and the surface reflectance, so darkness alone cannot identify a dark material.

    像素亮度同时受光源和表面性质影响，不能把暗处直接判作深色材质。

- [ ] **Spectral response（光谱响应）**

    A sensor channel's spectral response determines how light at different wavelengths contributes to its measured value.

    传感器通道把一段波长范围的光整合成数值，而非只读取单个波长。

- [ ] **Colour space（颜色空间）**

    A colour space represents colours in a chosen coordinate system such as RGB or HSV.

    用选定坐标系统表示颜色，例如 RGB 或 HSV，以便针对不同任务处理。

- [ ] **Shape from shading（由明暗推断形状）**

    Shape from shading uses brightness variations to infer surface orientation, with ambiguities when lighting and reflectance are unknown.

    利用亮度变化推测表面方向，但未知光照和反射率会造成歧义。

- [ ] **Image gradient（图像梯度）**

    The image gradient combines horizontal and vertical intensity derivatives to give the direction and magnitude of steepest increase.

    以两个方向的偏导数组成向量，描述亮度变化最快的方向与大小。

- [ ] **Edge（边缘）**

    An image edge is a rapid intensity change that may come from an object boundary, texture, shadow or highlight.

    亮度快速变化的位置，可能由物体边界、纹理、阴影或高光产生。

- [ ] **Invariance（不变性）**

    Invariance means that a representation or prediction stays the same under a specified transformation of the input.

    输入发生指定变化时，所用表示或预测仍保持相同。

- [ ] **Equivariance（等变性）**

    Equivariance means that a transformation of the input induces a corresponding transformation of the output.

    输入发生变化时，输出按可预测的对应方式变化。

- [ ] **Tolerance（容忍度）**

    Tolerance means that performance remains acceptable across a limited range of input changes.

    模型在有限变化范围内保持表现，而不保证严格数学不变。

## 学习特征与表示

### [L06 Convolutional Neural Networks I](06-cnns-i.md)

- [ ] **Feature representation（特征表示）**

    A feature representation encodes raw pixels in a numerical form that is useful for a task such as classification.

    把原始像素变成更适合分类或其他任务的数值描述。

- [ ] **Class imbalance（类别不平衡）**

    Class imbalance occurs when some classes have far more examples than others, allowing overall accuracy to hide errors on rare classes.

    各类别样本数量差异大时，总体准确率可能掩盖少数类的错误。

- [ ] **Confusion matrix（混淆矩阵）**

    A confusion matrix counts examples by true and predicted class to show which classes the model confuses.

    按真实类别与预测类别计数，以显示模型主要把哪些类别混淆。

- [ ] **Multilayer perceptron, MLP（多层感知机）**

    A multilayer perceptron applies fully connected layers and nonlinearities to compute features or prediction scores.

    用全连接层和非线性变换逐层计算特征与类别分数。

- [ ] **Convolutional neural network, CNN（卷积神经网络）**

    A convolutional neural network uses local connections and shared filters to learn a hierarchy of image features.

    用局部连接和共享滤波器从图像提取多层特征。

- [ ] **Learned filter（学习得到的滤波器）**

    A learned filter has weights fitted to the training data by optimising the model's loss.

    卷积核权重由训练数据和损失优化决定，而非人工固定。

- [ ] **Feature map / activation map（特征图／激活图）**

    A feature map records a filter's response at different spatial locations.

    一个滤波器在各空间位置的响应构成一张输出图。

- [ ] **Multi-channel convolution（多通道卷积）**

    In a standard multichannel convolution, each output channel combines responses from all input channels.

    每个输出通道综合所有输入通道上的核响应。

- [ ] **Weight sharing（权重共享）**

    Weight sharing reuses the same filter parameters across spatial locations, reducing the number of learned weights.

    同一滤波器在不同空间位置复用参数，减少参数量并利用局部模式。

- [ ] **Receptive field（感受野）**

    A receptive field is the region of the original input that can influence a given output unit.

    某个输出单元在原输入中能够受到影响的区域。

- [ ] **Stride（步幅）**

    Stride is the number of positions the filter advances at each step, with larger strides typically producing smaller outputs.

    滤波核每次移动的距离，增大步幅通常会缩小输出尺寸。

- [ ] **Convolution output size（卷积输出尺寸）**

    The spatial size of a convolution output depends on the input size, kernel size, padding and stride.

    输出宽高由输入尺寸、核大小、补边与步幅共同决定。

### [L07 Convolutional Neural Networks II](07-cnns-ii.md)

- [ ] **Downsampling（下采样）**

    Downsampling reduces the number of spatial samples in a feature map, cutting computation and letting later units cover a larger region of the original input.

    减少特征图的空间采样点，以控制计算量并扩大后续单元的视野。

- [ ] **Max pooling（最大池化）**

    Max pooling retains the largest activation within each local window.

    对每个局部窗口取最大值，保留最强响应。

- [ ] **Average pooling（平均池化）**

    Average pooling summarises each local window by taking the mean of its activations.

    对每个局部窗口取平均值，概括邻域响应。

- [ ] **Overfitting（过拟合）**

    Overfitting occurs when a model performs well on its training examples but generalises poorly to new data.

    模型在训练样本上表现好，却不能可靠推广到新数据。

- [ ] **L1 and L2 regularisation（L1 与 L2 正则化）**

    L1 and L2 regularisation penalise absolute and squared parameter values respectively to constrain the fitted model.

    在训练目标中惩罚权重大小，以约束模型复杂度。

- [ ] **Dropout（随机丢弃）**

    Dropout randomly sets some activations to zero during training to reduce dependence on particular combinations of units.

    训练时随机关闭部分激活，降低对特定神经元组合的依赖。

- [ ] **Early stopping（提前停止）**

    Early stopping uses validation performance to decide when to stop training and retain a checkpoint.

    根据验证集表现停止训练，以避免继续拟合训练集噪声。

- [ ] **Softmax（Softmax 归一化）**

    Softmax converts class scores into non-negative probabilities that sum to one.

    把类别分数转换为总和为一的类别概率。

- [ ] **Cross-entropy loss（交叉熵损失）**

    For a single class label, cross-entropy penalises the model more as its predicted probability for the correct class decreases.

    对正确类别的低预测概率施加更大惩罚。

- [ ] **Training / validation / test split（训练／验证／测试划分）**

    Training data fit model parameters, validation data guide model selection, and test data estimate final generalisation performance.

    分别用于拟合参数、选择方案和估计最终泛化表现。

- [ ] **Mini-batch and epoch（小批次与训练轮）**

    A mini-batch contains the examples used for one update, while an epoch is one pass through the training set.

    小批次是一次更新使用的样本集合，训练轮是完整遍历训练集一次。

- [ ] **Learning rate（学习率）**

    The learning rate controls the step size used to update model parameters.

    控制每次参数更新的步长。

- [ ] **Data augmentation（数据增强）**

    Data augmentation increases training variation through transformations that preserve the intended labels.

    对训练图像施加标签仍适用的变化，以增加训练样本的变化范围。

### [L08 Convolutional Neural Networks III](08-cnns-iii.md)

- [ ] **Classification accuracy（分类准确率）**

    Classification accuracy is the fraction of examples predicted correctly, and it can hide errors on underrepresented classes.

    正确预测数占样本总数的比例，解读时仍需检查类别分布和错误类型。

- [ ] **Parameter count and FLOPs（参数量与浮点运算量）**

    Parameter count measures how many values the model stores, while FLOPs estimate the floating point operations required for a specified computation.

    前者衡量模型需要存储的权重数，后者近似衡量一次推理的计算工作量。

- [ ] **AlexNet（AlexNet 网络）**

    AlexNet is an early deep CNN that demonstrated the effectiveness of learned convolutional features for large-scale image classification.

    早期大规模图像分类 CNN 架构，展示深层卷积特征的实用性。

- [ ] **VGG（VGG 网络）**

    VGG stacks small convolutional kernels to build progressively larger receptive fields.

    通过堆叠小尺寸卷积核逐步扩大感受野。

- [ ] **Inception module（Inception 模块）**

    An Inception module processes features at several scales in parallel and combines the resulting maps.

    在同一层并行处理多种尺度的特征并合并结果。

- [ ] **Residual connection（残差连接）**

    A residual connection adds the input to a learned transformation so the block can learn a correction to its input.

    把输入直接加到变换输出上，使网络学习相对于输入的修正。

- [ ] **Depthwise separable convolution（深度可分离卷积）**

    A depthwise separable convolution filters each channel spatially and then mixes channels with a pointwise convolution.

    先逐通道做空间滤波，再用逐点卷积混合通道以降低计算成本。

- [ ] **MobileNet（MobileNet 网络）**

    MobileNet uses depthwise separable convolutions to reduce the cost of running a CNN on resource-constrained devices.

    以深度可分离卷积为核心，面向计算受限场景设计的 CNN 家族。

- [ ] **Compound scaling（复合缩放）**

    Compound scaling increases network depth, width and input resolution together in a coordinated way.

    协调增加网络深度、宽度和输入分辨率，而非只扩大一个维度。

- [ ] **Transfer learning（迁移学习）**

    Transfer learning reuses parameters or features learned on one dataset or task for another.

    把已有数据上学到的参数或特征用于新任务。

- [ ] **Fine-tuning（微调）**

    Fine-tuning updates some or all pretrained parameters to adapt the model to the target data.

    在预训练模型基础上继续更新部分或全部参数，使其适应目标数据。

- [ ] **Frozen feature extractor（冻结的特征提取器）**

    A frozen feature extractor keeps the pretrained backbone fixed while a new output head is trained.

    固定预训练主干，仅训练新任务的输出层。

### [L09 Vision Transformers](09-vit.md)

- [ ] **Inductive bias（归纳偏置）**

    An inductive bias is an assumption built into a model, such as locality and spatial weight sharing in CNNs.

    模型结构预先赋予的假设，例如 CNN 的局部性与平移相关权重共享。

- [ ] **Patch embedding（图块嵌入）**

    Patch embedding divides an image into patches and projects each patch into a vector token.

    把图像切成图块并映射为一串向量 token。

- [ ] **Class token, [CLS]（分类 token）**

    A class token is a learned vector added to the patch sequence whose final representation can be used to classify the image.

    在图块序列中加入可学习向量，由其最终表示形成整图分类结果。

- [ ] **Positional embedding（位置编码）**

    Positional embeddings give patch tokens location information so the model can distinguish where image content appears.

    为图块 token 加入位置信息，使模型能区分相同内容出现在何处。

- [ ] **Query, Key, Value（查询、键、值）**

    Attention compares queries with keys to produce weights and then uses those weights to combine values.

    注意力用查询与键计算相关度，再按权重聚合对应的值。

- [ ] **Self-attention（自注意力）**

    Self-attention lets tokens in the same sequence exchange information according to learned relevance scores.

    让同一输入序列的 token 根据彼此相关度交换信息。

- [ ] **Multi-head attention（多头注意力）**

    Multi-head attention computes several attention patterns in parallel and combines their outputs.

    并行学习多组注意力关系，再合并它们的结果。

- [ ] **Transformer encoder block（Transformer 编码器块）**

    A Transformer encoder block typically uses multi-head self-attention and a feed-forward network with residual connections and normalisation.

    通常结合多头自注意力、前馈网络、残差连接与归一化更新 token。

- [ ] **Feed-forward network, FFN（前馈网络）**

    The feed-forward network in a Transformer block applies the same nonlinear transformation to each token independently.

    在 Transformer 块中对各 token 分别施加相同的非线性特征变换。

- [ ] **Vision Transformer, ViT（视觉 Transformer）**

    A Vision Transformer processes an image as a sequence of patch tokens using a Transformer encoder.

    以图块 token 和 Transformer 编码器处理图像的模型。

- [ ] **Attention complexity（注意力计算成本）**

    Global self-attention compares all token pairs, so smaller patches can greatly increase its computational cost.

    全局注意力需比较 token 两两关系，因此图块更小会显著增加计算量。

### [L10 Representation Learning](10-representations.md)

- [ ] **Self-supervised learning（自监督学习）**

    Self-supervised learning constructs training targets from the data itself, reducing the need for manually assigned labels.

    从数据自身构造训练信号，以减少对人工类别标签的依赖。

- [ ] **Contrastive learning（对比学习）**

    Contrastive learning brings related examples closer in representation space and separates them from selected negatives.

    拉近相关样本的表示并拉远不相关样本的表示。

- [ ] **Positive and negative pairs（正样本对与负样本对）**

    Positive pairs identify examples whose representations should be similar, while negative pairs provide examples to distinguish.

    分别提供应该相近和应该区分的表示训练关系。

- [ ] **CLIP（图文对比预训练模型）**

    CLIP uses paired images and text to train encoders whose outputs can be compared in a shared embedding space.

    通过图像与文本配对的对比训练，把两种模态映射到可比较的表示空间。

- [ ] **Zero-shot classification（零样本分类）**

    Zero-shot classification predicts a label by comparing an image with candidate class descriptions without training a new classifier on those labels.

    不在目标类别上重新训练分类头，而用图像与类别文本的相似度预测类别。

- [ ] **Embedding space（嵌入空间）**

    An embedding space contains vector representations that can be compared using distances or similarity scores.

    表示向量所在的空间，其中距离或相似度用于比较样本关系。

- [ ] **Bag of visual words（视觉词袋）**

    A bag of visual words counts local visual patterns and loses their spatial arrangement unless location is encoded separately.

    统计图像中出现的局部视觉模式，若不加空间编码就会丢失它们的布局。

- [ ] **PCA and t-SNE（主成分分析与 t-SNE）**

    PCA and t-SNE reduce high-dimensional representations for visual inspection, with distances in the display potentially differing from those in the original space.

    把高维表示投影到低维以观察邻居关系，但图上距离不能直接当成原空间距离。

- [ ] **Occlusion sensitivity（遮挡敏感性）**

    Occlusion sensitivity measures how a target prediction changes when different image regions are hidden.

    遮住图像不同区域，观察目标预测如何变化。

- [ ] **Class activation map, CAM（类别激活图）**

    A class activation map shows where spatial features contribute to a chosen class score.

    把空间特征对特定类别分数的贡献映射回图像位置。

- [ ] **Grad-CAM（梯度加权类别激活图）**

    Grad-CAM uses gradients of a target class score to weight feature maps and produce a coarse localisation heat map.

    利用目标类别对特征图的梯度权重生成粗略定位热图。

- [ ] **Texture bias（纹理偏置）**

    Texture bias is a tendency to rely on local texture more than overall shape when making predictions.

    模型可能主要利用局部纹理而非人期望的整体形状作判断。

- [ ] **Distribution shift（分布变化）**

    Distribution shift occurs when the data seen at evaluation differ systematically from the training data and may reduce performance.

    测试数据与训练数据的来源或特征不同，可能导致性能下降。

## 局部特征、匹配与三维

### [L11 Local Features](11-features.md)

- [ ] **Keypoint / interest point（关键点／兴趣点）**

    A keypoint is a local image position that can often be found again in another view.

    在不同图像中有望重复找到的局部位置。

- [ ] **Detector and descriptor（检测器与描述子）**

    A detector selects image locations, while a descriptor encodes the appearance around those locations for comparison.

    前者决定选哪些位置，后者把位置周围的外观编码以便比较。

- [ ] **Corner（角点）**

    A corner is a location where shifting a small window in different directions causes substantial changes in appearance.

    图像小窗口向多个方向移动都会明显改变外观的位置。

- [ ] **Structure tensor（结构张量）**

    The structure tensor summarises local image gradients to describe how strongly a patch changes in different directions.

    汇总局部梯度方向和强度，用于判断窗口沿不同方向变化的程度。

- [ ] **Structure-tensor eigenvalues（结构张量特征值）**

    The two structure tensor eigenvalues measure the strength of local intensity variation along the two principal directions.

    两个特征值分别反映局部窗口沿两个主方向的亮度变化程度。

- [ ] **Harris corner response（Harris 角点响应）**

    The Harris response uses the determinant and trace of the structure tensor to distinguish corners from edges and flat regions.

    由结构张量的行列式和迹构造分数，以区分角点、边缘和平坦区。

- [ ] **Non-maximum suppression for keypoints（关键点非极大值抑制）**

    Non-maximum suppression keeps local peaks in the response map to avoid reporting several detections for one corner.

    只保留局部响应峰值，避免同一角点周围出现密集重复检测。

- [ ] **SIFT（尺度不变特征变换）**

    SIFT describes a keypoint using local gradient orientation statistics after aligning the scale and orientation.

    在尺度与方向对齐后，用局部梯度方向统计描述关键点外观。

- [ ] **Scale and orientation alignment（尺度与方向对齐）**

    Scale and orientation alignment normalise a patch's size and dominant direction before descriptors are compared across views.

    比较特征前统一局部区域大小和主方向，提高跨图像匹配稳定性。

### [L12 Feature Matching](12-feature-matching.md)

- [ ] **Feature correspondence（特征对应）**

    A feature correspondence links two image features that are taken to represent the same scene point.

    判断两幅图中的局部特征是否来自同一场景点。

- [ ] **Noise and outlier（噪声与外点）**

    Noise perturbs otherwise valid observations, while outliers are observations or matches that are inconsistent with the model.

    噪声使正确观测偏移，外点则是完全错误的对应或观测。

- [ ] **Geometric consistency（几何一致性）**

    Geometric consistency requires candidate correspondences to agree with a common transformation or camera geometry constraint.

    正确对应应共同满足同一个变换或相机几何约束。

- [ ] **Hough transform（霍夫变换）**

    The Hough transform lets observations vote in parameter space and uses vote peaks to identify supported models.

    让观测在参数空间投票，寻找支持同一几何模型的峰值。

- [ ] **RANSAC（随机采样一致性算法）**

    RANSAC repeatedly fits a model to a minimal sample and selects the candidate with the strongest inlier support.

    反复从最小样本估计模型，选择被最多内点支持的候选。

- [ ] **Inlier（内点）**

    An inlier is an observation that agrees with the current model within a chosen error threshold.

    在设定误差阈值内符合当前几何模型的观测。

- [ ] **Lowe ratio test（最近邻距离比值检验）**

    Lowe's ratio test compares the nearest and second-nearest descriptor distances to reject ambiguous matches.

    比较最佳与次佳描述子距离，剔除不够明确的匹配。

- [ ] **FLANN（快速近似最近邻库）**

    FLANN accelerates approximate nearest-neighbour search for descriptor matches, with geometric consistency checked separately.

    加速描述子候选检索，但不能替代后续几何一致性检查。

- [ ] **Homography（单应变换）**

    A homography maps corresponding image points on a common scene plane through a three-by-three projective matrix.

    用 $3\times3$ 齐次矩阵描述同一平面在两幅透视图像间的映射。

- [ ] **Minimal sample（最小样本）**

    A minimal sample is the smallest nondegenerate set of correspondences needed to estimate a model, such as four point pairs for a general planar homography.

    估计模型所需的最少独立对应，例如一般平面单应变换需四对点。

### [L13 Depth and Stereo](13-depth-stereo.md)

- [ ] **Monocular depth cue（单目深度线索）**

    A monocular depth cue uses evidence such as occlusion, perspective or known size to infer depth from one image, typically without a known absolute scale.

    利用遮挡、透视或已知尺度等图像线索推测远近，但单张图通常缺少绝对尺度。

- [ ] **Stereo baseline（双目基线）**

    The stereo baseline is the distance between the two camera centres and sets the scale for converting disparity to depth.

    两台相机光心之间的距离，决定视差转成深度时的几何比例。

- [ ] **Disparity（视差）**

    Disparity is the horizontal difference between the image locations of the same scene point in a rectified stereo pair.

    同一场景点在校正后的左右图中对应位置的水平差。

- [ ] **Stereo depth（双目深度）**

    For a rectified pinhole stereo pair, depth equals focal length times baseline divided by disparity.

    在校正的针孔双目模型中由 $Z=fB/d$ 根据焦距、基线和视差求得。

- [ ] **Epipolar search（极线搜索）**

    Epipolar search restricts the candidate matches for a point to its epipolar line in the other image.

    利用双目几何把对应点搜索从整幅图缩小到一条极线。

- [ ] **Window matching cost（窗口匹配代价）**

    A window matching cost measures how different the patches around two candidate corresponding locations are.

    比较候选对应位置附近的图像块，衡量它们的外观差异。

- [ ] **Smoothness constraint（平滑约束）**

    A smoothness constraint encourages neighbouring pixels to have similar disparities while allowing genuine depth discontinuities.

    偏好邻近像素具有相近视差，同时要允许真实深度边界。

- [ ] **Occlusion in stereo（双目遮挡）**

    Stereo occlusion occurs when a scene point is visible in one camera but hidden in the other, leaving no valid match.

    某个场景点只在一侧相机可见，因而无法找到有效对应。

- [ ] **Supervised depth learning（监督式深度学习）**

    Supervised depth learning trains a model to predict depth from images using ground-truth depth labels.

    使用真实深度标签训练图像到深度的预测模型。

- [ ] **Stereo self-supervision（双目自监督）**

    Stereo self-supervision uses consistency between reconstructed and observed views as a training signal without requiring per-pixel depth labels.

    利用左右图重建的一致性提供深度训练信号，而无需每个像素的深度标签。

### [L14 Two-view Geometry](14-two-view-geometry.md)

- [ ] **Homogeneous coordinates（齐次坐标）**

    Homogeneous coordinates represent points and lines with vectors defined up to a nonzero scale, making projective operations easier to express as matrix products.

    用可整体缩放的扩展向量表示图像点或直线，便于写成矩阵关系。

- [ ] **Cross product（叉积）**

    In homogeneous image coordinates, the cross product of two points gives their joining line and that of two lines gives their intersection.

    在齐次二维图像中，两点的叉积给出过它们的直线，两线的叉积给出交点。

- [ ] **Camera intrinsics（相机内参）**

    Camera intrinsics describe the mapping from normalised camera coordinates to pixels through parameters such as focal length and principal point.

    描述焦距、主点等相机内部成像尺度和坐标映射的参数。

- [ ] **Camera extrinsics（相机外参）**

    Camera extrinsics describe rotation and translation between the camera and a reference coordinate frame.

    描述相机相对世界或另一相机的旋转与平移。

- [ ] **Camera calibration（相机标定）**

    Camera calibration uses image measurements to estimate intrinsics, lens distortion or the relative geometry of cameras.

    由图像观测估计相机内参、畸变或相机间几何关系。

- [ ] **Epipolar plane（极平面）**

    An epipolar plane passes through both camera centres and a scene point.

    由两相机光心与同一三维点共同确定的平面。

- [ ] **Epipole and epipolar line（极点与极线）**

    An epipole is the projection of the other camera centre, while an epipolar line is the line on which the corresponding image point must lie.

    极点是另一相机光心在图像中的投影，极线是匹配点必须位于的直线。

- [ ] **Essential matrix, E（本质矩阵）**

    The essential matrix encodes the epipolar constraint between two cameras in normalised camera coordinates.

    在归一化相机坐标中编码两相机相对姿态的极线约束。

- [ ] **Fundamental matrix, F（基础矩阵）**

    The fundamental matrix encodes the epipolar constraint between corresponding points in image pixel coordinates.

    在像素坐标中编码两视图对应点之间的极线约束。

- [ ] **Eight-point algorithm（八点法）**

    The eight-point algorithm estimates the fundamental matrix from a linear system built from at least eight point pairs and enforces a rank-two constraint.

    由至少八对对应点建立线性方程，估计基础矩阵并施加其秩约束。

- [ ] **Stereo rectification（双目校正）**

    Stereo rectification transforms both views so corresponding points lie on the same image row, simplifying the search.

    变换两幅图，使对应点落在同一图像行以简化搜索。

- [ ] **Triangulation（三角化）**

    Triangulation estimates a 3D point by combining the viewing rays from two cameras.

    从两条相机观测射线的关系估计三维点位置。

- [ ] **Geometric degeneracy（几何退化）**

    Geometric degeneracy occurs when the scene structure or camera motion leaves some geometric quantities underdetermined or poorly constrained.

    相机运动或场景结构使某些三维量无法稳定估计的情况。

## 图像生成

### [L15 Image Generation](15-generation.md)

- [ ] **Generative model（生成模型）**

    A generative model learns a data distribution or a process for sampling new images.

    学习数据分布或产生数据的过程，以采样生成新图像。

- [ ] **Conditional generation（条件生成）**

    Conditional generation produces samples guided by an input such as a class label, text prompt or image.

    在类别、文字或图像等给定条件下生成符合条件的样本。

- [ ] **Probability density（概率密度）**

    A probability density describes how probability is distributed over a continuous variable, with interval probabilities obtained by integration.

    描述连续变量在各位置附近的相对可能性，而不是单点的概率。

- [ ] **Autoencoder, AE（自编码器）**

    An autoencoder uses an encoder to compress its input and a decoder to reconstruct it.

    用编码器压缩输入，再由解码器重建输入。

- [ ] **Bottleneck（瓶颈表示）**

    A bottleneck limits the capacity of the latent representation, encouraging it to retain information useful for reconstruction.

    限制潜在表示的容量，迫使模型保留有助于重建的信息。

- [ ] **Latent variable（潜变量）**

    A latent variable is an unobserved quantity used by a model to represent or generate data.

    生成模型中间使用的隐藏变量，可作为解码或生成的输入。

- [ ] **Variational autoencoder, VAE（变分自编码器）**

    A variational autoencoder learns a latent distribution for each input and balances reconstruction with a constraint on that distribution.

    让编码器输出潜变量分布，并同时优化重建和分布约束。

- [ ] **Reparameterisation trick（重参数化技巧）**

    The reparameterisation trick expresses sampling as a function of independent noise and learned parameters so gradients can flow through the sample.

    把随机采样写成固定噪声与可学习参数的函数，使梯度能穿过采样步骤。

- [ ] **Reconstruction loss（重建损失）**

    Reconstruction loss measures how much the decoded output differs from the original input.

    比较解码输出与原图，促使模型保留输入内容。

- [ ] **KL divergence in VAE（VAE 中的 KL 散度）**

    In a VAE, the KL term encourages the encoder's latent distribution to stay close to a chosen prior that can be sampled at generation time.

    约束编码后的潜变量分布靠近选定先验，便于从先验采样。

- [ ] **Prior sampling（先验采样）**

    Prior sampling generates an input for the decoder by drawing a latent variable from a prespecified distribution.

    生成时从预设潜变量分布取样，而不是把训练图像送进编码器。

### [L16 Generative Adversarial Networks](16-gans.md)

- [ ] **Generative adversarial network, GAN（生成对抗网络）**

    A generative adversarial network trains a generator and a discriminator against each other to produce realistic samples.

    让生成器与判别器通过对抗目标共同训练图像生成。

- [ ] **Generator（生成器）**

    The generator maps random variables and optional conditions to synthetic images.

    把随机变量及可选条件映射为生成图像。

- [ ] **Discriminator（判别器）**

    The discriminator distinguishes real images from generated ones and supplies a training signal to the generator.

    区分真实图像与生成图像，为生成器提供训练信号。

- [ ] **Adversarial objective（对抗目标）**

    The adversarial objective rewards the discriminator for telling real and generated samples apart and trains the generator to make that distinction harder.

    判别器尝试分辨真假，生成器尝试让生成样本难以分辨。

- [ ] **Mode collapse（模式坍塌）**

    Mode collapse occurs when a generator repeatedly produces a narrow range of outputs and misses much of the data distribution's diversity.

    生成器反复输出少数类型样本，缺失数据分布中的多样性。

- [ ] **Memorisation（记忆训练样本）**

    Memorisation occurs when a model reproduces training images closely enough to raise doubts about whether it can generalise.

    模型复制或近似复制训练图像，而不是学到可泛化的生成规律。

- [ ] **Inception score（Inception 分数）**

    The Inception score uses a pretrained classifier to reward confident predictions per image and diverse predicted classes across images as a limited measure of generation quality.

    用预训练分类器的预测评估类别置信度和类别多样性，但不能单独证明生成质量。

- [ ] **Conditional GAN（条件 GAN）**

    A conditional GAN provides the same conditioning information to the generator and discriminator to guide the output.

    把标签或其他输入同时用于生成与判别，以控制生成内容。

- [ ] **Cycle consistency（循环一致性）**

    Cycle consistency encourages a translation into another domain and back to reconstruct the original input, which helps train on unpaired examples.

    要求图像经跨域变换再变回原域后尽量恢复原内容，用于缺少成对样本的转换。

### [L17 Diffusion Models](17-diffusion.md)

- [ ] **Diffusion model（扩散模型）**

    A diffusion model learns a reverse process that progressively turns noise into new data samples.

    学习从噪声逐步还原数据的过程，以生成新样本。

- [ ] **Gaussian noise（高斯噪声）**

    Gaussian noise follows a normal distribution, and the variances of independent noise terms add when the terms are summed.

    服从正态分布的随机扰动，独立噪声相加时方差相加。

- [ ] **Noise schedule（噪声日程）**

    A noise schedule specifies the noise added at each timestep and determines how quickly the original signal fades.

    规定各时间步加入多少噪声，决定信号如何逐渐消失。

- [ ] **Forward diffusion（前向扩散）**

    Forward diffusion progressively corrupts a clean image by adding noise over successive timesteps.

    按时间步给真实图像加入噪声，得到逐渐更混乱的状态。

- [ ] **Cumulative noise formula（累计加噪公式）**

    The cumulative noise formula samples a noisy image at a chosen timestep directly from the clean image and random noise.

    直接由原图和随机噪声构造任一时间步的加噪图，无需逐步模拟前面所有状态。

- [ ] **Timestep conditioning（时间步条件）**

    Timestep conditioning tells the model which noise level it is handling so it can adapt its prediction.

    把当前噪声程度告知模型，使其针对不同时间步预测。

- [ ] **Noise prediction loss（噪声预测损失）**

    A noise prediction loss penalises the difference between the noise added to an image and the model's estimate at the given timestep.

    训练模型从加噪图及时间步估计当时加入的噪声。

- [ ] **Reverse sampling（反向采样）**

    Reverse sampling starts from random noise and applies a chosen sequence of denoising updates to obtain an image.

    从随机噪声出发，按选定采样规则逐步得到图像。

- [ ] **Latent diffusion（潜空间扩散）**

    Latent diffusion runs the diffusion process on a compressed image representation to reduce computation.

    先把图像压缩到潜空间，在较小表示上执行扩散以降低成本。

- [ ] **Inpainting（图像补全）**

    Inpainting generates content for missing image regions while using the known regions as context.

    在已知区域约束下生成缺失区域内容。

- [ ] **Sampling cost（采样成本）**

    Sampling cost depends on the number of generation steps and the computation per step, and changing the step count can affect quality.

    生成时的步骤数和每步模型计算共同影响速度，减少步骤可能改变质量。

## 分割与检测

### [L19 Image Segmentation I](19-segmentation-i.md)

- [ ] **Region segmentation（区域分割）**

    Region segmentation groups pixels into similar regions, which need not correspond to named object classes.

    按像素相似性把图像划成区域，区域本身未必有语义类别。

- [ ] **Semantic segmentation（语义分割）**

    Semantic segmentation predicts a class for each pixel without assigning separate identities to objects of the same class.

    为每个像素预测类别，但同类物体实例可能合在一起。

- [ ] **Instance segmentation（实例分割）**

    Instance segmentation predicts the class and pixel mask of each individual object.

    同时区分每个物体的类别和各自的像素掩码。

- [ ] **K-means clustering（K 均值聚类）**

    K-means alternates between assigning examples to their nearest centre and updating the centres for a preset number of clusters.

    反复把样本分配给最近中心并更新中心，以形成预定数量的簇。

- [ ] **Gaussian mixture model, GMM（高斯混合模型）**

    A Gaussian mixture model represents a distribution as a weighted sum of Gaussian components.

    用多个高斯分布的加权和表示数据群组。

- [ ] **Mean shift（均值漂移）**

    Mean shift moves each estimate towards the weighted mean of nearby samples to find modes of the feature density.

    反复向邻域的加权均值移动，寻找特征密度较高的模式。

- [ ] **Bandwidth（带宽）**

    Bandwidth sets the scale of the neighbourhood in a kernel method and affects the granularity of the resulting groups.

    控制均值漂移或核方法中邻域的范围，从而影响分割粒度。

- [ ] **Spatial-colour feature（空间颜色特征）**

    A spatial-colour feature combines pixel location and colour so grouping can account for appearance and proximity.

    把位置与颜色合成像素表示，使分组同时考虑外观和空间接近性。

- [ ] **Superpixel（超像素）**

    A superpixel groups nearby, similar pixels into a small region that can be processed as a unit.

    把邻近且相似的像素先合成小区域，作为后续处理单元。

- [ ] **Oversegmentation（过分割）**

    Oversegmentation creates more regions than the final result needs to reduce the risk of crossing meaningful boundaries.

    先划出多于最终目标的小区域，以降低跨越真实边界的风险。

- [ ] **SLIC（简单线性迭代聚类）**

    SLIC builds superpixels by locally clustering colour and position features and then enforcing connectivity.

    在局部范围内按颜色与位置聚类，并处理超像素连通性。

- [ ] **Region adjacency graph, RAG（区域邻接图）**

    A region adjacency graph represents regions as nodes and shared boundaries as edges to support region merging.

    把区域当作节点、接壤关系当作边，供区域合并使用。

- [ ] **Stuff and things（连续材质与可数物体）**

    Stuff refers to amorphous regions such as sky or grass, while things are countable objects whose instances can be distinguished.

    前者如天空和草地通常不逐个计数，后者如人和车通常需要区分实例。

- [ ] **GrabCut（GrabCut 前景提取）**

    GrabCut uses a user-provided box and foreground and background models to iteratively refine a foreground mask.

    利用用户给定的框和前背景模型，迭代优化前景掩码。

- [ ] **Mask R-CNN（Mask R-CNN）**

    Mask R-CNN adds a branch that predicts a pixel mask for each detected object instance.

    在检测框预测之外为每个实例增加像素掩码分支。

### [L20 Image Segmentation II](20-segmentation-ii.md)

- [ ] **Pixel-wise classification（逐像素分类）**

    Pixel-wise classification predicts a semantic class at each image location.

    对图像每个位置分别预测语义类别。

- [ ] **Fully convolutional network, FCN（全卷积网络）**

    A fully convolutional network retains spatial structure and produces predictions at individual locations.

    用卷积式输出保持空间结构，产生逐位置预测而非单个整图类别。

- [ ] **Encoder–decoder（编码器—解码器）**

    An encoder–decoder extracts features at reduced resolution and then restores spatial resolution to produce a dense output such as a mask.

    先压缩提取语义特征，再逐步恢复空间分辨率以输出掩码。

- [ ] **Upsampling（上采样）**

    Upsampling increases spatial resolution, but simply enlarging a feature map cannot guarantee recovery of lost boundary detail.

    增加特征图的空间分辨率，但单纯放大不保证恢复丢失的边界细节。

- [ ] **Max unpooling（最大反池化）**

    Max unpooling uses stored pooling indices to place activations back into a larger sparse grid.

    利用池化时记录的最大值位置，把激活放回较大的稀疏网格。

- [ ] **Transposed convolution（转置卷积）**

    Transposed convolution places each input's weighted contributions onto an output grid and sums them where they overlap.

    把输入位置的加权贡献散布到更大输出网格，并在重叠处求和。

- [ ] **Skip connection in U-Net（U-Net 跳跃连接）**

    A U-Net skip connection concatenates high-resolution encoder features with decoder features at the corresponding scale to recover localisation detail.

    把编码器早期的高分辨率特征拼接到解码器对应尺度，补回定位信息。

- [ ] **Segmentation loss（分割损失）**

    A segmentation loss compares predicted and target masks and may weight pixels differently by class or boundary importance.

    比较预测掩码和目标掩码，可按类别或边界需要调整像素权重。

- [ ] **Focal loss（焦点损失）**

    Focal loss downweights well-classified examples so harder examples contribute more to training.

    降低容易分类的样本对损失的主导作用，使训练更关注困难样本。

- [ ] **Dice loss（Dice 损失）**

    Dice loss penalises poor overlap between predicted and ground-truth masks.

    根据预测掩码与真值掩码的重叠程度构造训练损失。

- [ ] **Segment Anything Model, SAM（任意目标分割模型）**

    The Segment Anything Model uses prompts such as points or boxes to predict one or more candidate masks.

    根据点、框等提示产生可能的目标掩码，并可输出多个候选。

- [ ] **Mask quality prediction（掩码质量预测）**

    Mask quality prediction estimates how well each candidate mask fits the intended region to help select an output.

    估计候选掩码的质量，帮助从多个输出中选择。

### [L21 Object Detection I](21-object-detection-i.md)

- [ ] **Bounding box（边界框）**

    A bounding box is a rectangle whose coordinates and dimensions represent an object's location.

    用矩形的坐标和尺寸表示检测目标的位置。

- [ ] **Sliding window（滑动窗口）**

    A sliding-window detector applies a classifier at multiple positions and scales, which can be computationally expensive.

    在多个位置和尺度重复运行分类器以寻找物体，通常计算成本较高。

- [ ] **Intersection over union, IoU（交并比）**

    Intersection over union measures overlap by dividing the area shared by two boxes by the total area covered by either box.

    用预测框与参考框的交集面积除以并集面积衡量重叠程度。

- [ ] **Region proposal（候选区域）**

    A region proposal is a candidate area likely to contain an object that can be examined more closely for classification and localisation.

    先生成可能含物体的区域，再对较少候选做精细分类与定位。

- [ ] **Selective Search（选择性搜索）**

    Selective Search merges neighbouring regions by similarity to generate candidate boxes at several scales.

    依据相邻区域的相似性逐步合并，产生多尺度候选框。

- [ ] **Bounding-box regression（边界框回归）**

    Bounding-box regression predicts coordinates or offsets that refine a box's position and size.

    预测框坐标或相对偏移，以修正候选框的位置和大小。

- [ ] **R-CNN（区域卷积神经网络）**

    R-CNN extracts CNN features separately for each region proposal, then classifies the region and refines its box.

    对每个候选区域分别提取 CNN 特征，再分类并修正框。

- [ ] **Fast R-CNN（快速 R-CNN）**

    Fast R-CNN computes a shared feature map for the entire image and extracts features for each proposal from that map.

    先对整图计算共享特征，再从特征图抽取各候选区域的表示。

- [ ] **RoI pooling（兴趣区域池化）**

    RoI pooling converts features from regions of different sizes into fixed-size outputs for the detection head.

    把不同大小的候选区域特征汇总为固定尺寸，供检测头使用。

- [ ] **Anchor box（锚框）**

    An anchor box is a reference box with a preset scale and aspect ratio from which the model predicts objectness and coordinate offsets.

    预设不同尺度和长宽比的参考框，供模型预测物体性与偏移。

- [ ] **Region proposal network, RPN（区域候选网络）**

    A region proposal network learns to generate candidate boxes from shared feature maps in the first stage of Faster R-CNN.

    在共享特征图上学习产生候选框，构成 Faster R-CNN 的第一阶段。

- [ ] **Faster R-CNN（更快的 R-CNN）**

    Faster R-CNN replaces external proposal search with a learned proposal network and then classifies and refines the proposals.

    用 RPN 替代外部候选搜索，再对候选进行分类与框回归。

### [L22 Object Detection II](22-object-detection-ii.md)

- [ ] **One-stage detector（单阶段检测器）**

    A one-stage detector predicts classes and boxes directly from image features without a separate region proposal stage.

    直接从图像特征预测类别和框，无需先单独生成候选区域。

- [ ] **YOLO v1（YOLO 第一版）**

    YOLO v1 uses image grid cells to predict bounding boxes, confidence scores and class probabilities.

    把图像划成网格，让网格单元预测框、置信度与类别。

- [ ] **Object query（对象查询）**

    An object query is a learned vector that DETR uses to retrieve features for one potential object.

    DETR 使用的可学习查询向量，用来从图像特征中提取一个候选物体的表示。

- [ ] **DEtection TRansformer, DETR（检测 Transformer）**

    DETR uses a Transformer to predict an unordered set of object classes and bounding boxes.

    把检测结果视作无固定顺序的对象集合，用 Transformer 直接预测类别和框。

- [ ] **Bipartite matching（二分图匹配）**

    Bipartite matching assigns predictions to ground-truth objects one-to-one during training so the output can be treated as an unordered set.

    把预测与真实目标一对一分配，使集合预测可以训练。

- [ ] **No-object class（无物体类别）**

    The no-object class is the training target for prediction slots unmatched to any ground-truth object.

    标记没有匹配到真实目标的预测槽位。

- [ ] **Non-maximum suppression, NMS（非极大值抑制）**

    Non-maximum suppression keeps higher-scoring boxes and discards lower-scoring boxes whose overlap exceeds a threshold.

    按分数保留较好预测框，并删除与其高度重叠的重复框。

- [ ] **Evaluation IoU threshold（评价交并比阈值）**

    The evaluation IoU threshold sets the minimum overlap a prediction must meet to match a ground-truth box under the scoring protocol.

    规定预测框与真实框至少要重叠多少，才能计作一次成功定位。

- [ ] **True positive / false positive / false negative（真正例／假正例／假负例）**

    A true positive is a correctly matched detection, a false positive is an incorrect or duplicate detection, and a false negative is a missed ground-truth object.

    分别表示成功匹配的检测、多余或错误的检测，以及漏检目标。

- [ ] **Precision（精确率）**

    Precision is the proportion of reported detections that are true positives.

    成功匹配的预测占全部被判为目标的预测比例。

- [ ] **Recall（召回率）**

    Recall is the proportion of ground-truth objects that are correctly detected.

    成功匹配的真实目标占全部真实目标比例。

- [ ] **Precision–recall curve（精确率—召回率曲线）**

    A precision–recall curve shows how precision and recall change as the detection confidence threshold varies.

    改变置信度阈值后，显示精确率与召回率之间的取舍。

- [ ] **Average precision, AP（平均精确率）**

    Average precision summarises a class's precision–recall curve under a specified evaluation protocol.

    按指定评价协议汇总一个类别的精确率—召回率表现。

- [ ] **Mean average precision, mAP（平均 AP）**

    Mean average precision averages AP across classes and, depending on the evaluation protocol, across IoU thresholds.

    对指定类别及可能指定的 IoU 阈值下的 AP 取平均，必须说明评价协议。

## 笔记中的 Workshop 补充

以下条目来自逐讲笔记连接的操作练习，**不等同于所有讲义的必修内容**；原 Notebook、题目和答案的位置见[课程首页的 Workshop 对照](README.md)。

- [ ] **BGR versus RGB（BGR 与 RGB 通道顺序）**

    OpenCV commonly reads colour images in BGR order, so the channels need reordering for a tool that expects RGB.

    OpenCV 常按 BGR 读图，向按 RGB 显示的工具传图前需调整通道。

- [ ] **NumPy view versus copy（NumPy 视图与副本）**

    A NumPy slice can share memory with the original array, while an explicit copy allows independent modification.

    切片可能共享原数组内存，若需要独立修改图像就要明确复制。

- [ ] **Average attention distance（平均注意距离）**

    Average attention distance weights the spatial distances between tokens by their attention weights to describe how locally an attention head focuses.

    按注意力权重汇总 token 间空间距离，观察某注意力头偏向局部还是远处。

- [ ] **Target-specific Grad-CAM（目标类别相关的 Grad-CAM）**

    Target-specific Grad-CAM uses the chosen class score to compute gradients, so changing the target can change the heat map for the same image.

    同一图像换目标类别会改变梯度和热图，所以解释必须附带目标类别。

- [ ] **Harris window parameters（Harris 窗口参数）**

    Harris window parameters control gradient smoothing or aggregation, while the response parameter controls corner scoring.

    平滑窗口与角点响应参数控制不同步骤，调参时应分别观察检测结果。

- [ ] **Normalized cut（归一化割）**

    A normalised cut divides the weight of cut edges by the total connection weight of each group to discourage splitting off tiny regions.

    在图上权衡切断的连接与分组规模，以减少只切出极小区域的倾向。

- [ ] **Stereo block size（双目匹配窗口大小）**

    A larger stereo matching window can give more stable matches but may blur depth boundaries, especially near occlusions.

    较大的比较窗口通常更稳但可能抹平深度边界，需结合纹理和遮挡观察。

- [ ] **Camera calibration board（相机标定板）**

    A camera calibration board provides image points of known geometry for estimating camera parameters and checking reprojection error.

    利用已知几何点的图像位置估计相机参数，并检查重投影误差。

- [ ] **MNIST CNN versus MLP（MNIST 上的 CNN 与 MLP 对照）**

    An MNIST comparison evaluates a CNN that preserves spatial structure and an MLP that takes flattened pixels on the same data split.

    在同一数据与划分下比较保留空间结构和展平像素的模型。

- [ ] **Feature map versus filter（特征图与滤波器）**

    A filter stores shared weights, while its feature map records how those weights respond at different locations in a particular input.

    滤波器是共享权重，特征图是它在特定输入各位置产生的响应。
