# 图像、成像与表示

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="vision-task"></a>
## 视觉任务与输出

- 编号：`vision-task`
- 分类：**讲义内容**
- 出处：[L01 PDF](../lecture/COMP90086-01-Introduction.pdf)，PDF p.6–8、26–30；对照 `transcript/COMP90086_2026_SM2 Week-01-W-transcript.txt` 相应主题段。
- 依赖：无课程内前置
- 层级：**关卡**

视觉系统从图像推断场景。分类输出整图标签，检测输出类别与框，分割输出逐像素标签，深度估计输出距离。先确定答案的结构，才能选模型与评价方法。

**关卡验收（自拟）**：给同一场景的标签、框、掩码和深度图配上任务；必须说明每种输出保留了什么信息。

<a id="pixels"></a>
## 像素、坐标与通道

- 编号：`pixels`
- 分类：**讲义内容**
- 出处：[L02 PDF](../lecture/COMP90086-02-Basics.pdf)，PDF p.22–27；对照 `transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt` 相应主题段。
- 依赖：[视觉任务与输出](01-image-formation.md#vision-task)
- 层级：**关卡**

数字图像是按位置排列的数值。彩色图像每个位置有多个通道；宽、高、通道数是不同维度。几何常写 (x,y)，数组常先行后列。uint8 的 0–255 是存储范围，不代表所有中间计算都只能落在这个范围。

**关卡验收（自拟）**：在非正方形图像中读取指定位置和通道，核对行列；修改一个通道后预测颜色变化。

<a id="projection"></a>
## 针孔投影与深度歧义

- 编号：`projection`
- 分类：**讲义内容**
- 出处：[L02 PDF](../lecture/COMP90086-02-Basics.pdf)，PDF p.10–15；对照 `transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt` 相应主题段。
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

三维点沿穿过光心的射线投到成像面。像高大小满足 |h|=fH/Z；真实像平面在孔后时图像倒立，虚拟平面约定可用正号。同一条射线上的点可以得到同一像点，因此单个像点不直接提供深度。

**关卡验收（自拟）**：统一成像面和长度单位，计算两组 H、Z 相同比例的像高，找出不同场景产生相同投影的情况。

<a id="lens"></a>
## 焦距、光圈与景深

- 编号：`lens`
- 分类：**讲义内容**
- 出处：[L02 PDF](../lecture/COMP90086-02-Basics.pdf)，PDF p.12–17；对照 `transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt` 相应主题段。
- 依赖：[针孔投影与深度歧义](01-image-formation.md#projection)
- 层级：**任务**

镜头收集更多光，并把某个距离附近的点聚焦。焦距影响视角；光圈影响进光量和景深。景深是看起来足够清晰的距离范围，不是所有距离都严格聚焦；不能把针孔和薄透镜当作同一个成像模型。

**任务验收（自拟）**：固定传感器与场景，比较焦距改变的视角；固定焦距，解释光圈变小后进光量与景深的取舍。

<a id="sampling"></a>
## 裁剪、重采样与插值

- 编号：`sampling`
- 分类：**讲义内容**
- 出处：[L02 PDF](../lecture/COMP90086-02-Basics.pdf)，PDF p.34–40；对照 `transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt` 相应主题段。
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

裁剪选取原数组的一部分；缩放需要决定输出位置对应原图何处。最近邻取一个像素，双线性按邻近四点加权。插值能改变采样网格，却不能凭空恢复已经丢失的真实细节。

**关卡验收（自拟）**：在小网格上分别完成裁剪和一次双线性取值，展示输出尺寸及四个权重。

<a id="reflectance"></a>
## 朗伯反射与成像歧义

- 编号：`reflectance`
- 分类：**讲义内容**
- 出处：[L05 PDF](../lecture/COMP90086-05-ImageFormationII.pdf)，PDF p.5–7、22–30；对照 `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt` 相应主题段。
- 依赖：[针孔投影与深度歧义](01-image-formation.md#projection)
- 层级：**关卡**

理想漫反射表面的亮度受光强、反射率和法线与光线夹角共同影响。单个亮度观测不足以同时解出这些量。由明暗恢复形状需要额外假设，阴影和高光也可能打破简化模型。

**关卡验收（自拟）**：用两组不同光强和反射率得到同一亮度；已知夹角时画出多个仍可能的法线方向。

<a id="colour"></a>
## 光谱、三色响应与颜色空间

- 编号：`colour`
- 分类：**讲义内容**
- 出处：[L05 PDF](../lecture/COMP90086-05-ImageFormationII.pdf)，PDF p.9–20；对照 `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt` 相应主题段。
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**任务**

通道值是光谱与传感器敏感度相乘后对波长积分的结果。不同光谱可能产生相同三色响应。RGB、HSV、Lab 是不同表示，不能把 RGB 的一个分量当作单一波长的光。

**任务验收（自拟）**：区分光谱、三通道响应和颜色坐标；解释颜色聚类为何要说明采用哪种空间。

<a id="material"></a>
## 阴影、高光与材质

- 编号：`material`
- 分类：**讲义内容**
- 出处：[L05 PDF](../lecture/COMP90086-05-ImageFormationII.pdf)，PDF p.31–35；对照 `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt` 相应主题段。
- 依赖：[朗伯反射与成像歧义](01-image-formation.md#reflectance)、[光谱、三色响应与颜色空间](01-image-formation.md#colour)
- 层级：**纯文案**

投射阴影来自遮挡光源；镜面高光与观察方向相关。透明与半透明涉及光穿过材质的方式。图像中的亮度突变既可能来自物体边界，也可能来自这些成像因素。

<a id="equivariance"></a>
## 不变性、容忍度与等变性

- 编号：`equivariance`
- 分类：**讲义内容**
- 出处：[L05 PDF](../lecture/COMP90086-05-ImageFormationII.pdf)，PDF p.36–53；对照 `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt` 相应主题段。
- 依赖：[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**任务**

不变性要求输入发生指定变化时表示不变；等变性要求输出随输入以对应方式变化；容忍度只说明变化带来的影响较小。局部滤波的平移等变不等于分类结果对一切平移严格不变，边界与采样也会影响性质。

**任务验收（自拟）**：平移图像后分别比较边缘图的位置与整图类别，指出各自应满足的性质和适用条件。

