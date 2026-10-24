"""Few-shot prototypes and zero-shot matching in hand-designed toy features."""
import numpy as np

# Features represent redness and roundness, not learned CLIP embeddings.
support = np.array([[0.9, 0.8], [1., 1.], [0.1, 0.2], [0., 0.]])
labels = np.array([0, 0, 1, 1])
prototypes = np.array([support[labels == c].mean(0) for c in (0, 1)])
query = np.array([0.8, 0.9])
distances = np.sum((prototypes - query) ** 2, axis=1)
few_shot_class = int(np.argmin(distances))
assert few_shot_class == 0
print("Few-shot class:", few_shot_class)

# Descriptions use centered attributes: -1=absent, +1=present.
# Map image coordinates [0, 1] to the SAME centered space [-1, 1].
descriptions = ["red round object", "blue elongated object"]
text_features = np.array([[1., 1.], [-1., -1.]])
normalized_text = text_features / np.linalg.norm(text_features, axis=1, keepdims=True)
zero_shot_query = 2 * query - 1
normalized_query = zero_shot_query / np.linalg.norm(zero_shot_query)
similarities = normalized_text @ normalized_query
zero_shot_choice = int(np.argmax(similarities))
assert zero_shot_choice == 0
assert np.all(np.abs(similarities) <= 1 + 1e-12)
print("Toy zero-shot description:", descriptions[zero_shot_choice])
print("Cosine similarities:", similarities.round(3))

# Check the opposite region too, rather than only a favorable example.
second_query = 2 * np.array([0.1, 0.2]) - 1
second_scores = normalized_text @ (second_query / np.linalg.norm(second_query))
assert int(np.argmax(second_scores)) == 1
print("Second toy description:", descriptions[int(np.argmax(second_scores))])
