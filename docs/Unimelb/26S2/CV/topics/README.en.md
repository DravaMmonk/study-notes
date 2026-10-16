# COMP90086 Device Gallery

Here the core concepts of the whole course are turned into 16 hands-on "machines". The way each machine moves is the concept itself: the height of a pin is a pixel value, the number of washers is a weight, a spring pulls similar representations together. The machines carry no text; the readout is in the bottom-right corner of the card, and the calculation is shown below the card.

**How to use it**: read the relevant section of the lecture notes first, then play with the matching device; or, when revising, work through them topic by topic, since the "Hands-on self-test" at the end of each note can be answered by operating the devices. Each device runs an automatic demo when left alone; hovering the mouse, the arrow keys and the buttons below the card take over. The devices are only visible when reading in Fieldnotes; Obsidian and MkDocs show the text only.

## Five topics

| Topic | Question it answers | Devices |
| --- | --- | --- |
| [1 How images are formed](01-image-formation.en.md) | Where do pixel values come from? | Pinhole camera · Lambertian studio |
| [2 How to process images](02-image-processing.en.md) | How can a fixed computation change an image? | Filter press · Harmonic synthesiser |
| [3 How to learn image features](03-learning-features.en.md) | How does a network compute features from pixels? | Multi-channel punch press · Pooling press · Residual manifold · Attention switchboard · Contrastive turntable |
| [4 How to match and recover 3D](04-matching-and-3d.en.md) | How do we find corresponding points and compute depth? | Harris probe · Hough voting machine · RANSAC pegboard · Stereo rangefinder · Epipolar rig |
| [5 How to generate new images](05-generation.en.md) | How do we draw a new image from random numbers? | VAE sampler · Real-or-fake test bench |

## Find by lecture

| Lecture | Device | In one sentence |
| --- | --- | --- |
| [02 Image formation and arrays](../02-basics.en.md) | Pinhole camera | Image height = −f·X/Z: the farther away, the smaller, and upside down. |
| [03 Spatial filtering](../03-filters.en.md) | Filter press | Output pixel = window and kernel multiplied element by element, then summed. |
| [04 Frequency filtering](../04-fourier.en.md) | Harmonic synthesiser | A signal is a sum of sinusoids; cutting high frequencies abruptly causes ringing. |
| [05 Light, colour and edges](../05-image-formation-ii.en.md) | Lambertian studio | Brightness = light intensity × reflectance × cosθ, and the three cannot be separated. |
| [06 CNN basics](../06-cnns-i.en.md) | Multi-channel punch press, filter press | One filter spans all input channels and produces one map. |
| [07 Training CNNs](../07-cnns-ii.en.md) | Pooling press | Max pooling keeps only the strongest response and has no parameters. |
| [08 Architectures and transfer](../08-cnns-iii.en.md) | Residual manifold | Skip connections let gradients pass through unchanged, so deep networks can be trained. |
| [09 ViT](../09-vit.en.md) | Attention switchboard | Each patch takes a weighted sum over all patches, with weights summing to 1. |
| [10 Representation learning](../10-representations.en.md) | Contrastive turntable | Two views of the same image are pulled together; everything else is pushed apart. |
| [11 Local features](../11-features.en.md) | Harris probe | A corner: whichever way you shift the window, its content changes. |
| [12 Feature matching](../12-feature-matching.en.md) | Hough voting machine, RANSAC pegboard | Let every point vote and find the most consistent model. |
| [13 Depth and stereo](../13-depth-stereo.en.md) | Stereo rangefinder | z = f·b/d, and the error grows with z². |
| [14 Two-view geometry](../14-two-view-geometry.en.md) | Epipolar rig | A point's correspondence can only lie on one line in the other image. |
| [15 AE and VAE](../15-generation.en.md) | VAE sampler | z = μ + σ·ε, moving the randomness into ε. |
| [16 GAN](../16-gans.en.md) | Real-or-fake test bench | The generator chases the discriminator and may crowd onto a single peak. |

Lecture 1 is an overview of the whole course; its claim that "computer vision is the inverse of graphics" is developed in Topic 1. Any numbers in the devices that are not given in the slides are illustrative values, and are marked as such in the device's description.
