"""Train toy visual question answering by feature fusion; no image encoder."""
import numpy as np

# Each synthetic image stores two attributes: color and shape.
images = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]])
questions = np.eye(2)  # Ask about color, or ask about shape.
x, y = [], []
for image in images:
    for j, question in enumerate(questions):
        # Multiplication lets the question select an image attribute.
        x.append(np.r_[image * question, question, 1.])
        y.append(image[j])
x, y = np.array(x), np.array(y)
w = np.zeros(x.shape[1])
for _ in range(2000):
    p = 1 / (1 + np.exp(-(x @ w)))
    w -= 0.2 * x.T @ (p - y) / len(y)
p = 1 / (1 + np.exp(-(x @ w)))
accuracy = np.mean((p >= 0.5) == y)
assert accuracy == 1.0
print("Training accuracy on eight synthetic questions:", accuracy)
print("Probability of attribute value 1:", p.round(3))
