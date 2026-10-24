"""A perceptron learns linear gates, but cannot represent XOR."""
import numpy as np

x = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
gates = {"AND": [0, 0, 0, 1], "OR": [0, 1, 1, 1],
         "NOR": [1, 0, 0, 0], "XOR": [0, 1, 1, 0]}
for name, labels in gates.items():
    y = np.array(labels)
    weight, bias = np.zeros(2), 0.
    for epoch in range(100):
        for row, target in zip(x, y):
            prediction = int(row @ weight + bias >= 0)
            error = target - prediction
            weight += error * row
            bias += error
    predicted = (x @ weight + bias >= 0).astype(int)
    correct = np.sum(predicted == y)
    print(f"{name}: target={labels}, predicted={predicted.tolist()}, {correct}/4")
    assert (correct == 4) if name != "XOR" else (correct < 4)
# XOR positives require b+w1>=0 and b+w2>=0.
# Its negatives require b<0 and b+w1+w2<0: incompatible sums.
print("XOR requires a nonlinear hidden layer, not more perceptron epochs.")
