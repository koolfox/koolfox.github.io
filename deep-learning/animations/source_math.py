"""Exact source examples shared by the films and their numerical acceptance checks."""
from math import exp

IMAGE = [[1, 1, 1, 0, 0], [0, 1, 1, 1, 0], [0, 0, 1, 1, 1],
         [0, 0, 1, 1, 0], [0, 1, 1, 0, 0]]
KERNEL = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
QUERY = [1, 0, 2]
KEYS = [[0, 1, 1], [4, 4, 0], [2, 3, 1]]
VALUES = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]


def attention():
    scores = [sum(q * k for q, k in zip(QUERY, row)) for row in KEYS]
    numerators = [exp(score - max(scores)) for score in scores]
    weights = [value / sum(numerators) for value in numerators]
    output = [sum(weight * row[j] for weight, row in zip(weights, VALUES))
              for j in range(3)]
    return scores, weights, output


def convolution():
    return [[sum(IMAGE[r + i][c + j] * KERNEL[i][j]
                 for i in range(3) for j in range(3))
             for c in range(3)] for r in range(3)]


def backprop():
    sigmoid = lambda value: 1 / (1 + exp(-value))
    z4, z5 = 0.2 - 0.5 - 0.4, -0.3 + 0.2 + 0.2
    o4, o5 = sigmoid(z4), sigmoid(z5)
    z6 = -0.3 * o4 - 0.2 * o5 + 0.1
    o6 = sigmoid(z6)
    e6 = (o6 - 1) * o6 * (1 - o6)
    return dict(z4=z4, z5=z5, z6=z6, o4=o4, o5=o5, o6=o6,
                loss=(1 - o6) ** 2, e6=e6,
                e4=e6 * -0.3 * o4 * (1 - o4),
                e5=e6 * -0.2 * o5 * (1 - o5))
