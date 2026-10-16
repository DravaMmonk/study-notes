# Topic 2: How to process images

This topic answers: **how can a simple, fixed computation change an image?** There are two ways to look at the same thing: in space, each output pixel is a weighted sum of its neighbours; in frequency, an image is a superposition of many sine waves, and filtering multiplies each frequency by a coefficient. The two devices demonstrate these two views.

Learning path: the [filter press](#1-filter-press-lectures-3-and-6) shows "slide, multiply, add" in space → the [harmonic synthesiser](#2-harmonic-synthesiser-lecture-4) shows "which waves to keep" in frequency.

## 1. Filter press (Lectures 3 and 6)

<!-- figure: conv-press -->

**What this device is**: the pin bed on the left is a 7×7 greyscale image, and the height of each pin is that pixel's brightness. A gantry beam carries a 3×3 press head; the number of washers stacked on each stud on top of the head is the kernel weight at that position, and dark washers mean negative weights. The output tray on the right records the result of each press.

**The concept**: linear filtering / convolution: place the kernel at one position, multiply the nine pixels by the nine weights element by element and add them up to get one output pixel g(i,j) = Σ h·f. Padding P and stride S determine the output size: ⌊(N − K + 2P) / S⌋ + 1.

**How to play**: move the mouse over the pin bed or the output tray and the press head follows to the matching window; the arrow keys step one cell at a time. The buttons below switch the kernel (mean, Gaussian, Sobel x, sharpen), cross-correlation / convolution, padding 0 / 1 and stride 1 / 2.

**What to watch**: the two small 3×3 tables below the card are this press's "window ⊙ kernel", with the result after the equals sign. With Sobel, watch the output tray: pins are tallest where light meets dark, nearly 0 in flat regions, and negative pins have hollow tops. Set padding to 1 and the output grows from 5×5 to 7×7; set stride to 2 and the head jumps two cells at a time, roughly halving the output.

**Common misconceptions**: convolution and cross-correlation differ only in whether the kernel is first rotated by 180°. Symmetric kernels such as mean and Gaussian look the same after rotation, so switching shows no change; Sobel is antisymmetric left to right, so switching swaps the signs of the left and right columns. Also, the kernel size is not the Gaussian scale σ, and the output size is not necessarily the input size.

Lecture notes: [Lecture 3 · Linear filtering and borders](../03-filters.en.md); [Lecture 6 · Output size, stride and padding](../06-cnns-i.en.md)

## 2. Harmonic synthesiser (Lecture 4)

<!-- figure: harmonic-analyser -->

**What this device is**: a mechanical synthesiser. Eight wheels turn at different multiples of a base speed, and a cord adds up their up-and-down motion and passes it to a pen that draws on moving paper.

**The concept**: a signal is a sum of sine waves; a square wave = Σ (4/πk)·sin kt. Low-pass / high-pass filtering multiplies each frequency by a mask H(k): the kept wheels turn as usual, while the filtered-out wheels have their pins pushed back to the wheel centre and contribute nothing.

**How to play**: hover over a wheel or press the left/right keys to set the cut-off; a button or the space bar toggles between a hard cut-off and a Gaussian mask; a button or the H key toggles low-pass / high-pass.

**What to watch**: the ripples on the paper on either side of a jump; readouts such as "5 harmonics kept · overshoot 9%"; and the pins pushed back to the wheel centre that no longer move.

**Common misconceptions**: thinking that adding more harmonics removes the overshoot. With a hard cut-off the overshoot stays at about 9% of the jump (the Gibbs phenomenon); only the ripples get narrower. A Gaussian mask produces almost no ringing, at the cost of blunter edges; this is the trade-off between "ringing" and "blurring".

Lecture notes: [Lecture 4 · Low-pass, high-pass and ringing](../04-fourier.en.md)

## Putting it together

The two devices are two sides of the same thing. The convolution theorem says that convolving with a kernel h in space equals multiplying by h's spectrum in frequency. A mean kernel is "average the nine neighbours" in space and a low-pass that weakens high frequencies in frequency; Sobel highlights changes in brightness, which amounts to keeping higher frequencies. The ripples produced by a "hard cut-off" on the synthesiser correspond in space to a very wide kernel with positive and negative oscillations, which is also why Gaussians are preferred over an ideal low-pass for smoothing.

## Hands-on self-test

1. On the filter press, apply Sobel x to the same window. How are the results in "cross-correlation" and "convolution" mode related?
2. For a 7×7 image and a 3×3 kernel, what padding keeps the output at 7×7? What is the output after changing to stride 2?
3. On the synthesiser, raise the cut-off from 3 harmonics to 8. How does the overshoot percentage change? And with a Gaussian mask?
