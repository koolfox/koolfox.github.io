"""Compare a plain linear stack with identity-skip residual blocks."""
import numpy as np

# A scalar residual block is h_next = h + w*h, with derivative 1+w.
def stack(value, weight, depth, residual):
    gradient = 1.
    for layer in range(depth):
        factor = weight + (1 if residual else 0)
        value = factor * value
        gradient *= factor
    return value, gradient

weight, depth = 0.01, 20
plain_value, plain_gradient = stack(2., weight, depth, False)
residual_value, residual_gradient = stack(2., weight, depth, True)
print(f"Plain stack: value={plain_value:.3e}, gradient={plain_gradient:.3e}")
print(f"Residual stack: value={residual_value:.4f}, gradient={residual_gradient:.4f}")
epsilon = 1e-5
numerical = (stack(2 + epsilon, weight, depth, True)[0]
             - stack(2 - epsilon, weight, depth, True)[0]) / (2 * epsilon)
assert np.isclose(numerical, residual_gradient)
assert np.isclose(residual_gradient, (1 + weight) ** depth)
assert stack(2., 0., depth, True) == (2., 1.)
assert plain_gradient < 1e-30
print("Zero residual branch preserves input and unit gradient.")
# Skip paths do not guarantee stability: weight=-1 cancels the identity here.
assert stack(2., -1., depth, True) == (0., 0.)
