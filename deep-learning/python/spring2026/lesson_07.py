"""Follow the input gradient through deep sigmoid and ReLU chains."""
import numpy as np

# Each layer has weight 1 and bias 0; only the activation differs.
def chain(value, depth, activation):
    gradient = 1.
    for layer in range(depth):
        if activation == "sigmoid":
            value = 1 / (1 + np.exp(-value))
            gradient *= value * (1 - value)
        else:
            gradient *= float(value > 0)
            value = max(0., value)
    return value, gradient

for depth in [1, 5, 20]:
    sigmoid_value, sigmoid_grad = chain(1., depth, "sigmoid")
    relu_value, relu_grad = chain(1., depth, "relu")
    print(f"depth={depth}: sigmoid gradient={sigmoid_grad:.3e}, "
          f"positive-path ReLU gradient={relu_grad:.3f}")
# Check the chain rule numerically where the derivative is still measurable.
epsilon = 1e-5
numerical = (chain(1 + epsilon, 3, "sigmoid")[0]
             - chain(1 - epsilon, 3, "sigmoid")[0]) / (2 * epsilon)
assert np.isclose(numerical, chain(1., 3, "sigmoid")[1])
assert chain(1., 20, "sigmoid")[1] < 1e-12
assert chain(1., 20, "relu")[1] == 1
assert chain(-1., 20, "relu")[1] == 0
print("Negative-input ReLU gradient:", chain(-1., 20, "relu")[1])
# ReLU does not guarantee stable gradients for arbitrary weights or inputs.
