"""Train a scalar linear RNN to sum a sequence using backpropagation."""
import numpy as np

rng = np.random.default_rng(11)
x = rng.uniform(-0.5, 0.5, (80, 4))
y = x.sum(axis=1)
input_weight, recurrent_weight = 0.3, 0.5
for step in range(1500):
    states = [np.zeros(len(x))]
    for time in range(x.shape[1]):
        states.append(input_weight * x[:, time] + recurrent_weight * states[-1])
    error = states[-1] - y
    d_state = 2 * error / len(x)
    d_input, d_recurrent = 0., 0.
    for time in reversed(range(x.shape[1])):
        d_input += np.sum(d_state * x[:, time])
        d_recurrent += np.sum(d_state * states[time])
        d_state = d_state * recurrent_weight
    input_weight -= 0.1 * d_input
    recurrent_weight -= 0.1 * d_recurrent
# New sequences, including a different length.
test = rng.uniform(-0.5, 0.5, (20, 6))
state = np.zeros(len(test))
for time in range(test.shape[1]):
    state = input_weight * test[:, time] + recurrent_weight * state
mse = np.mean((state - test.sum(axis=1)) ** 2)
print(f"Learned input weight={input_weight:.4f}, recurrence={recurrent_weight:.4f}")
print(f"Held-out length-6 sequence MSE: {mse:.8f}")
assert mse < 1e-6
# Identity activation makes this a linear RNN, not an LSTM or language model.
