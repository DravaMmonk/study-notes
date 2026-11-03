# 空间与频率处理

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="weighted-sum"></a>
## 像素算子与局部加权和

- 编号：`weighted-sum`
- 分类：**讲义内容**
- 出处：[L03 PDF](../lecture/COMP90086-03-Filters.pdf)，PDF p.6–16；对照 `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt` 相应主题段。
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

像素算子只改当前位置的值，局部算子读取邻域。线性滤波把窗口与核逐项相乘再求和。核是计算规则，窗口是当前读到的数据；同一个核在不同位置可以得到不同响应。

**关卡验收（自拟）**：手算非对称 2×2 核在两个位置的输出，再说明窗口移动时哪些量改变、哪些不变。

<a id="convolution"></a>
## 卷积与互相关

- 编号：`convolution`
- 分类：**讲义内容**
- 出处：[L03 PDF](../lecture/COMP90086-03-Filters.pdf)，PDF p.17–19；对照 `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt` 相应主题段。
- 依赖：[像素算子与局部加权和](02-processing.md#weighted-sum)
- 层级：**任务**

数学卷积要翻转核，互相关直接使用核。对称高斯核会掩盖两者差别，非对称核可以显出方向差异。CNN 通常执行互相关，但沿用卷积名称。

**任务验收（自拟）**：用非对称核计算两种输出；不能用对称核证明实现正确。

<a id="filters"></a>
## 平滑、锐化与高斯核

- 编号：`filters`
- 分类：**讲义内容**
- 出处：[L03 PDF](../lecture/COMP90086-03-Filters.pdf)，PDF p.21–35；对照 `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt` 相应主题段。
- 依赖：[像素算子与局部加权和](02-processing.md#weighted-sum)
- 层级：**关卡**

平均核混合邻域，降低局部变化；高斯核给近处更大权重。锐化强调与平滑结果的差异。核数组尺寸和有效作用范围不是一回事：同样尺寸下，高斯标准差改变实际混合的范围。

**关卡验收（自拟）**：在脉冲与阶跃图上比较平均、高斯和锐化结果，解释核权重和与常量区域的关系。

<a id="gradient"></a>
## 偏导数、梯度与边缘

- 编号：`gradient`
- 分类：**讲义内容**
- 出处：[L05 PDF](../lecture/COMP90086-05-ImageFormationII.pdf)，PDF p.39–45；对照 `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt` 相应主题段。
- 依赖：[像素算子与局部加权和](02-processing.md#weighted-sum)
- 层级：**关卡**

横纵方向差分分别估计亮度变化，合成梯度幅值和方向。大梯度说明图像变化快，不保证那里存在物体边界；阴影、材质和高光都可能产生响应。

**关卡验收（自拟）**：手算小图中心的横纵响应和梯度幅值，区分边缘方向与亮度增长方向。

<a id="padding"></a>
## 边界与输出尺寸

- 编号：`padding`
- 分类：**讲义内容**
- 出处：[L03 PDF](../lecture/COMP90086-03-Filters.pdf)，PDF p.41–46；对照 `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt` 相应主题段。
- 依赖：[卷积与互相关](02-processing.md#convolution)
- 层级：**任务**

窗口跨出图像时需要约定补零、复制、环绕或反射。有效卷积只在完整窗口内计算；补边改变边缘输出。比较两个实现前应先统一核方向、边界和输出坐标。

**任务验收（自拟）**：对同一常量小图分别补零与复制边界，核对边缘输出和有效输出大小。

<a id="separable"></a>
## 空间可分离滤波与计算量

- 编号：`separable`
- 分类：**讲义内容**
- 出处：[L03 PDF](../lecture/COMP90086-03-Filters.pdf)，PDF p.37–40；对照 `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt` 相应主题段。
- 依赖：[卷积与互相关](02-processing.md#convolution)
- 层级：**任务**

若二维核能写成纵向向量与横向向量的外积，可先后做两次一维滤波。大核的每像素乘加量由与 k² 成正比降到与 2k 成正比；并非每个核都能精确这样拆分。

**任务验收（自拟）**：将给定二维核写成外积，并在同一边界约定下比较直接与分步结果。

<a id="sinusoid"></a>
## 频率、幅度与相位

- 编号：`sinusoid`
- 分类：**讲义内容**
- 出处：[L04 PDF](../lecture/COMP90086-04-Fourier.pdf)，PDF p.6–22；对照 `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt` 相应主题段。
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

正弦分量的频率描述变化快慢，幅度描述强弱，相位描述相对位置。傅里叶表示需要复数系数同时携带幅度和相位；只看幅度图不足以重建一般图像。

**关卡验收（自拟）**：分别只改变幅度、频率和相位，预测波形变化并匹配相应参数。

<a id="fourier"></a>
## 二维频谱与傅里叶变换

- 编号：`fourier`
- 分类：**讲义内容**
- 出处：[L04 PDF](../lecture/COMP90086-04-Fourier.pdf)，PDF p.24–35；对照 `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt` 相应主题段。
- 依赖：[频率、幅度与相位](02-processing.md#sinusoid)
- 层级：**关卡**

图像能用不同方向和频率的条纹分量组合表示。显示时常把零频移到中心，并用对数压缩幅值范围。条纹的变化方向决定频谱峰的方向；显示的亮度不是原图像素值。

**关卡验收（自拟）**：把水平、垂直条纹对应到频谱峰；区分中心低频、边缘高频和仅供显示的对数幅值。

<a id="frequency-filter"></a>
## 卷积定理与频率滤波

- 编号：`frequency-filter`
- 分类：**讲义内容**
- 出处：[L04 PDF](../lecture/COMP90086-04-Fourier.pdf)，PDF p.37–44；对照 `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt` 相应主题段。
- 依赖：[二维频谱与傅里叶变换](02-processing.md#fourier)、[卷积与互相关](02-processing.md#convolution)
- 层级：**关卡**

空间卷积对应频域逐点相乘。低通保留缓慢变化，高通突出快速变化，带通保留指定频带。有限数组的离散变换默认周期延拓；要和线性卷积比较，需要一致的补边与裁剪。

**关卡验收（自拟）**：选频域掩码抑制给定周期条纹，保留目标轮廓，并说明与空间域比较时的边界条件。

<a id="ringing"></a>
## 硬截断与振铃

- 编号：`ringing`
- 分类：**讲义内容**
- 出处：[L04 PDF](../lecture/COMP90086-04-Fourier.pdf)，PDF p.45–50；对照 `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt` 相应主题段。
- 依赖：[卷积定理与频率滤波](02-processing.md#frequency-filter)
- 层级：**任务**

突然截断频谱的掩码在空间域对应有波纹的核。图像边缘可能因此出现振铃。平滑的高斯频率响应减弱突然截断，取舍是频带分界不再尖锐。

**任务验收（自拟）**：比较阶跃经硬低通与平滑低通后的边缘，定位过冲，解释它与掩码的关系。

<a id="compression"></a>
## 频域压缩

- 编号：`compression`
- 分类：**讲义内容**
- 出处：[L04 PDF](../lecture/COMP90086-04-Fourier.pdf)，PDF p.52–54；对照 `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt` 相应主题段。
- 依赖：[二维频谱与傅里叶变换](02-processing.md#fourier)
- 层级：**纯文案**

JPEG 把局部图块变换到频率表示并量化系数。损失较多细节可减少存储，强压缩也可能形成块状或边缘伪影。文件大小不能直接当作图像的像素维数。

