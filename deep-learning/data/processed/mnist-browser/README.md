# Authentic MNIST browser subset

Authors: Yann LeCun, Corinna Cortes and Christopher J.C. Burges.

This contains2,000training images and500validation images, all selected from
MNIST's official60,000-image training partition. Each class contributes200/50
images. The official10,000-image test partition is not read or published here.
This is image-disjoint validation, not a claim of writer-disjoint evaluation.

`manifest.json` contains every original zero-based IDX index, the deterministic
selection algorithm, original archive checksums/retrieval evidence and the
published byte hashes. `pixels.bin` stores2,500consecutive28×28grayscale uint8
images; the first2,000are training. `labels.bin` stores corresponding digits.
The browser converts pixels tofloat32/255; there is no fitted normalization.

The dataset publisher's [pinned card](https://huggingface.co/datasets/ylecun/mnist/blob/77f3279092a1c1579b2250db8eafed0ad422088c/README.md)
declares MIT. The card revision and SHA-256 are recorded in the manifest. The
original archives were obtained through the PyTorch-maintained S3 mirror listed
in the same manifest; the IDX bytes are independently checked before selection.
The selection/generator and laboratory code follow the site's MIT license.

Regenerate from verified ignored raw files:

```sh
python3 deep-learning/scripts/prepare_mnist_browser.py
```

The live laboratory trains a declared small CNN, not historical LeNet-5.
Its browser output is a fresh training run, not the repository's separate
full-data native benchmark. This subset's validation accuracy must not be
presented as official MNIST test accuracy.
