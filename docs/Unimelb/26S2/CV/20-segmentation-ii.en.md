# COMP90086 Lecture 20 - Image Segmentation II

Sources: `lecture/COMP90086-20-Segmentation2.pdf` (47 pages); `transcript/COMP90086_2026_SM2 Week-10-F-transcript.txt` (2026-10-09); the Week 11 segmentation exercise. Imported 2026-10-13; PDF page numbers are used below. The continuation on SAM is available at the start of `transcript/COMP90086_2026_SM2 Week-11-W-transcript.txt` (2026-10-14, added in this update).

This lecture answers: **how can a network predict a class for every pixel while preserving object boundaries?**

Learning path: [Encoding and decoding](#topic-1) → [Upsampling](#topic-2) → [U-Net](#topic-3) → [SAM](#topic-4). The key point is the relationship between spatial resolution and semantic information; the hard part is that upsampling does not recover all of the original information.

<a id="topic-1"></a>
## 1. From whole-image classification to per-pixel classification

A classification network usually gives the whole image one class; semantic segmentation must output a class map whose positions correspond to the input. Cropping a patch for every pixel and running the network on each would recompute a great deal of overlapping content.

An FCN (fully convolutional network) lets the whole image share convolutional computation and keeps spatial feature maps. At the end, a $1\times1$ convolution can turn the feature channels at each position into class scores; it mixes channel information rather than squeezing the whole image into one pixel.

![PDF 13 - Encoder and decoder](assets/20-segmentation-ii/slide-13.png)

Reading the figure from left to right: the encoder reduces width and height and extracts information over larger extents; the decoder then enlarges the feature maps and outputs the pixel classes on the right. In the figure $D_1,D_2,D_3$ denote numbers of channels, a different quantity from image width and height.

During training, the cross-entropy of the class prediction can be computed at every labelled position. The prediction map must keep positional correspondence with the label map; predicting the whole-image class correctly is no substitute for getting pixel boundaries right.

<a id="topic-2"></a>
## 2. Hard part: how to enlarge a feature map

Interpolation fills in intermediate positions by a fixed rule; max unpooling uses the max locations remembered during pooling to put values back in their corresponding positions; transposed convolution uses learnable weights to produce a larger feature map.

![PDF 23 - Transposed convolution as a matrix operation](assets/20-segmentation-ii/slide-23.png)

Look at the shapes of the left and right matrices: an ordinary convolution can be written as a matrix multiplication, and transposed convolution uses the transpose of that matrix, swapping the direction of connections between input and output. **Transposing is not inverting**, so it does not guarantee restoring the detail lost before downsampling.

The slide example shows the connection pattern. The actual output size also depends on parameters such as stride, padding and kernel, so the name alone does not tell you by how many times it enlarges.

<a id="topic-3"></a>
## 3. U-Net: sending early localisation information back

![PDF 33 - U-Net architecture](assets/20-segmentation-ii/slide-33.png)

The left side of the U progressively downsamples and the right side progressively upsamples. The horizontal grey arrows send encoder features at the matching scale to the decoder, where they are concatenated with the upsampled result. Features at the bottom help understand content over larger extents, while the features passed across help pin down the location of details.

**Common mistake**: the skip connection here is feature concatenation and should not automatically be read as the element-wise addition in ResNet. Page 34 of the slides also weights the boundaries between cells, showing that the loss function can emphasise especially important, easily confused positions.

<a id="topic-4"></a>
## 4. SAM: a user prompt decides which part to segment

![PDF 39 - SAM architecture](assets/20-segmentation-ii/slide-39.png)

The image enters the image encoder, prompts such as points and boxes enter the prompt encoder, and both are fed to the mask decoder, which outputs candidate masks. A mask expresses "which pixels belong to the indicated region"; it does not automatically name every region.

At the start of the 9 October recording, the lecturer demonstrated with receipts: clicking one receipt gives the corresponding region; when adjacent receipts are very close in colour and their edges are not obvious, it still makes mistakes. This shows that a prompt narrows down the target, but cannot guarantee the boundary is entirely correct.

A single point may also refer to part of an object or the whole object. Page 42 of the slides handles this ambiguity with multiple candidate outputs. When reading the diagram, distinguish the prompt concepts it supports from the features actually exposed in a particular demo interface.

## Self-test for this lecture

1. What is gained when the encoder lowers resolution, and what is lost?
2. Why can transposed convolution not guarantee recovery of the original image?
3. How is giving SAM one point different from asking a network to classify every pixel?
