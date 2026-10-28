threshold = 0.5
# Synthetic observations; these numbers are not image pixels.
feature = [0.1, 0.3, 0.8, 0.9]
truth = [0, 1, 1, 0]
def classify(x):
    return int(x >= threshold)
prediction = [classify(x) for x in feature]
correct = sum(a == b for a, b in zip(prediction, truth))
result = {"prediction": prediction, "accuracy": correct / len(truth)}
