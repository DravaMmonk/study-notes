# Topic 3: How to learn image features

This topic answers: **how does a neural network compute useful features from pixels, step by step?** The first three devices take apart the components of a CNN: multi-channel convolution, pooling and residual connections; the last two look at ideas beyond CNNs: self-attention, which lets every patch "look at" every other patch, and contrastive learning, which learns good representations without labels.

Learning path: [multi-channel punch press](#1-multi-channel-punch-press-lecture-6) → [pooling press](#2-pooling-press-lecture-7) → [residual manifold](#3-residual-manifold-lecture-8) → [attention switchboard](#4-attention-switchboard-lecture-9) → [contrastive turntable](#5-contrastive-turntable-lecture-10). For how a single kernel slides, see [the filter press in Topic 2](02-image-processing.en.md).

## 1. Multi-channel punch press (Lecture 6)

<!-- figure: channel-stack -->

**What this device is**: a gantry punch press. On the left pin bed, each pixel column is made of several stacked slices, one slice per input channel; a turntable holds a row of dies, and on the right is the output pin bed.

**The concept**: a filter is a whole K×K×C_in block that must cover all input channels at once, and one press yields just one number; sweeping all positions yields one activation map. C_out filters give C_out maps, which stacked together form the input to the next layer. Parameter count = (K·K·C_in + 1)·C_out.

**How to play**: use the buttons to change C_in (1/3/4), K (1/3/5) and C_out (1/3/6); ←→ move to the previous or next filter, space pauses, and Home starts again from the beginning.

**What to watch**: whether the number of layers on the side of a die matches the number of slices in a pixel column; the output column grows by one layer each time the die changes; and, in the formula below, the gap between the convolutional layer's parameters (456) and a fully connected layer's parameters (14,455,392).

**Common misconceptions**: thinking a filter acts on only one channel, or that the number of output channels equals the number of input channels. In fact every filter spans all input channels, and the number of output channels is set by the number of filters. The parameter count also does not grow with image size, because the same filter is shared across all positions.

Lecture notes: [Lecture 6 · Colour channels, filters and parameter counts](../06-cnns-i.en.md)

## 2. Pooling press (Lecture 7)

<!-- figure: pool-sorter -->

**What this device is**: a small press with a cross slide. Pin height is the activation value; the press head presses one 2×2 window at a time, and a 2×2 output tray beside it records the result.

**The concept**: max pooling takes the largest response in the window: a flat platen comes down and can only rest on the tallest pin. Average pooling takes the mean: the platen is replaced by a balance beam whose pivot settles at the mean height. With a 2×2 window and stride 2, 4×4 becomes 2×2. Pooling has no parameters to learn.

**How to play**: hover over the pin bed or use the arrow keys to choose a window; press M or space to toggle max / average pooling, and press S or the "Shift left 1" button to shift the input by one cell.

**What to watch**: the platen rests only on the tallest pin (which is highlighted), leaving gaps between it and the other pins. After shifting left, compare with the "before shift" column: max pooling goes 6 8 3 4 → 7 8 3 4, changing only one number, while average pooling changes three. This is "some tolerance to small shifts".

**Common misconceptions**: thinking max pooling "picks the brightest pixel". It picks the strongest response on a feature map, and its input is already a feature computed by the previous layer. Another misconception is that pooling layers also have weights to train.

Lecture notes: [Lecture 7 · Downsampling](../07-cnns-ii.en.md)

## 3. Residual manifold (Lecture 8)

<!-- figure: residual-manifold -->

**What this device is**: a pipeline: on the left is the input header and a large gauge, on the right the loss tank, and in between a series of valve blocks (weight layers F). Each valve block has a bypass pipe with a gate valve, which is the skip connection.

**The concept**: a ResNet's output is y = F(x) + x. In backpropagation, a plain network's gradient is the product of each block's slope and decays with depth; a residual block's slope is 1 + g′, and the 1 from the skip connection passes through unchanged.

**How to play**: space opens and closes the bypass valves (skip connections); ←→ or the buttons change the depth (2 / 4 / 8 blocks). When left alone it automatically alternates between open and closed.

**What to watch**: whether the needles of the small gauges at each block's inlet drop all the way to nearly 0, or stay around 1; the readout of the large gauge at the input and the formula below. With the bypass closed and 8 blocks deep, the input end is left with only 0.6⁸ ≈ 0.017; with it open, about 1. Slopes such as 0.6 in the figure are illustrative values, chosen to show the effect of the repeated product.

**Common misconceptions**: thinking that a deeper network doing worse is always overfitting; in fact the training error also gets worse, so the problem lies in the optimisation itself. Another misconception is that skip connections make the network "compute less": the branch F is still computed, it only needs to learn the residual H(x) − x.

Lecture notes: [Lecture 8 · ResNet residuals](../08-cnns-iii.en.md)

## 4. Attention switchboard (Lecture 9)

<!-- figure: attention-switchboard -->

**What this device is**: an old-fashioned telephone switchboard. A small 4×4 image is cut into 16 patches laid out on the board, and each patch's colour tone represents what it shows. The selected query patch has a plug inserted, with wires running to every patch.

**The concept**: self-attention in the Vision Transformer. The query patch weights each patch with a_j = softmax(q·k_j/√d), and the output y = Σ a_j v_j is a weighted mixture of all patches.

**How to play**: hover the mouse or use the arrow keys to change the query patch. H or a button switches the attention head; P or a button adds / removes the positional encoding.

**What to watch**: how tall each patch's gauge rod is (the weight), and how thick each layer of the glass column on the right is (which patches make up the output). The glass column is always exactly full, because the weights sum to 1.

**Common misconceptions**: attention is not "select one patch and copy it over"; it is a continuous weighting over all patches. Attention itself also has no sense of order: with the positional encoding removed, head 2 gives every patch the same weight, so position has to be added into the tokens.

Lecture notes: [Lecture 9 · Self-attention and multiple heads](../09-vit.en.md)

## 5. Contrastive turntable (Lecture 10)

<!-- figure: contrastive-board -->

**What this device is**: a turntable with two circular tracks. The sliders can only move around the circle, because once the embedding vectors are normalised only their direction remains. Beside it are a hand crank, a loss dial and a 4×4 pegboard.

**The concept**: self-supervised contrastive learning, with loss ℓ = −log( exp(s⁺/τ) / Σ exp(s/τ) ), where s is cosine similarity. Two views of the same image form a positive pair; everything else is a negative. CLIP replaces "the other view" with the paired text, which makes zero-shot classification possible.

**How to play**: space or "Crank one step" trains one step, R restarts; M or a button switches between SimCLR (two views of the same image) and CLIP (image and text).

**What to watch**: whether the sliders at the two ends of a spring turn to the same angle, whether the dial's needle drops to nearly 0, and whether the diagonal of the pegboard rises. In CLIP mode, also see which piece of text the dashed probe points to.

**Common misconceptions**: no class labels are used here; the pairing comes only from "they came from the same image". Training is also not about raising all similarities together, but about making the correct entry win within its row. And zero-shot does not mean recognising anything: the candidate texts must be supplied by the user, and the model only picks the nearest one among them.

Lecture notes: [Lecture 10 · Contrastive loss and CLIP](../10-representations.en.md)

## Putting it together

Each of the three CNN components has one job: multi-channel convolution compresses "the information from all input channels in a small neighbourhood" into one number and shares its parameters across all positions; pooling shrinks the map while keeping strong responses; residual connections keep very deep stacks trainable. ViT takes a different approach: instead of looking only at small neighbourhoods, it lets each patch see all patches in a single step, at the cost of having to add position information explicitly and usually needing more data. Contrastive learning answers "where does the training signal come from": no labels, only the requirement that different views of the same image lie close together in representation space.

## Hands-on self-test

1. On the multi-channel punch press, change C_in from 3 to 1. How does the convolutional layer's parameter count change? What about changing C_out to 6? Does it change when the image gets larger?
2. On the pooling press, shift the input by one cell. Why is max pooling's output more stable than average pooling's?
3. On the residual manifold with the bypass closed, change the depth from 4 to 8. Roughly what fraction of its previous value does the input-end readout become?
4. On the attention switchboard, remove the positional encoding. What happens to the weights? What does this show self-attention is missing?
