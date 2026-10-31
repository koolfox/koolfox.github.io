"""Explicit cross-correlation, kernel flipping and unpadded pooling.

Channels-first inputs; one output filter. CNN convolution normally means
cross-correlation, as documented by torch.nn.Conv2d. This operation laboratory
does not fit weights or claim to reproduce a trained CNN.
"""

import math


def rectangular(matrix):
    if not matrix or not matrix[0] or any(len(row) != len(matrix[0]) for row in matrix):
        raise ValueError("Expected a nonempty rectangular matrix")
    if any(not math.isfinite(v) for row in matrix for v in row):
        raise ValueError("All entries must be finite")
    return len(matrix), len(matrix[0])


def output_size(size, kernel, stride=1, padding=0):
    for value in (size, kernel, stride):
        if type(value) is not int or value < 1:
            raise ValueError("Sizes and stride must be positive integers")
    if type(padding) is not int or padding < 0:
        raise ValueError("Padding must be a nonnegative integer")
    result = (size + 2 * padding - kernel) // stride + 1
    if result < 1:
        raise ValueError("Kernel does not fit the padded input")
    return result


def correlate(channels, kernels, bias=0.0, stride=1, padding=0, flip=False):
    if not channels or len(channels) != len(kernels):
        raise ValueError("Each input channel needs exactly one kernel slice")
    height, width = rectangular(channels[0])
    kh, kw = rectangular(kernels[0])
    if any(rectangular(x) != (height, width) for x in channels):
        raise ValueError("Input channel shapes must match")
    if any(rectangular(k) != (kh, kw) for k in kernels):
        raise ValueError("Kernel slice shapes must match")
    if not math.isfinite(bias):
        raise ValueError("Bias must be finite")
    oh, ow = (
        output_size(height, kh, stride, padding),
        output_size(width, kw, stride, padding),
    )
    output, explanations = [], []
    for r in range(oh):
        line, line_terms = [], []
        for c in range(ow):
            terms = []
            for channel, (source, kernel) in enumerate(zip(channels, kernels)):
                for i in range(kh):
                    for j in range(kw):
                        y, x = r * stride + i - padding, c * stride + j - padding
                        padded = not (0 <= y < height and 0 <= x < width)
                        value = 0.0 if padded else source[y][x]  # بیرون تصویر، مقدار حاشیه صفر است
                        ki, kj = (kh - 1 - i, kw - 1 - j) if flip else (i, j)
                        weight = kernel[ki][kj]  # همین وزن هسته در همهٔ پنجره‌ها مشترک است
                        terms.append(
                            {
                                "channel": channel,
                                "input_row": y,
                                "input_column": x,
                                "kernel_row": ki,
                                "kernel_column": kj,
                                "padded": padded,
                                "input": value,
                                "weight": weight,
                                "product": value * weight,
                            }
                        )
            result = sum(term["product"] for term in terms) + bias  # مجموع سهم‌های پنجره، سپس بایاس؛ تغییر این خط خروجی واقعی را عوض می‌کند
            if not math.isfinite(result):
                raise ArithmeticError("Non-finite convolution result")
            line.append(result)  # یک خانهٔ خروجی ساخته شد
            line_terms.append(terms)
        output.append(line)
        explanations.append(line_terms)
    return {
        "output": output,
        "terms": explanations,
        "bias": bias,
        "input_shape": [len(channels), height, width],
        "output_shape": [1, oh, ow],
        "kernel_shape": [len(kernels), kh, kw],
        "stride": stride,
        "padding": padding,
        "operation": "convolution_with_flipped_kernel" if flip else "cross_correlation",
        "parameter_count": len(kernels) * kh * kw + 1,
        "multiplications": oh * ow * len(kernels) * kh * kw,
        "multiplication_convention": "Dense direct evaluation includes products with padded zeros; no implementation optimization or bias addition counted.",
    }


def pool(matrix, size=2, stride=2, mode="max"):
    height, width = rectangular(matrix)
    oh, ow = output_size(height, size, stride), output_size(width, size, stride)
    if mode not in ("max", "average"):
        raise ValueError("Choose max or average pooling")
    result, windows = [], []
    for r in range(oh):
        line, line_windows = [], []
        for c in range(ow):
            values = [
                matrix[r * stride + i][c * stride + j]
                for i in range(size)
                for j in range(size)
            ]
            line.append(max(values) if mode == "max" else sum(values) / len(values))
            line_windows.append(values)
        result.append(line)
        windows.append(line_windows)
    return {
        "output": result,
        "windows": windows,
        "mode": mode,
        "size": size,
        "stride": stride,
        "padding": 0,
    }


def pattern(name, size=8):
    if type(size) is not int or not 4 <= size <= 16:
        raise ValueError("Pattern size must be an integer from 4 to 16")
    if name not in ("vertical", "horizontal", "diagonal", "checker", "square"):
        raise ValueError("Unknown synthetic pattern")
    return [
        [
            float(
                {
                    "vertical": c >= size // 2,
                    "horizontal": r >= size // 2,
                    "diagonal": c >= r,
                    "checker": (r + c) % 2 == 0,
                    "square": size // 4 <= r < 3 * size // 4
                    and size // 4 <= c < 3 * size // 4,
                }[name]
            )
            for c in range(size)
        ]
        for r in range(size)
    ]
