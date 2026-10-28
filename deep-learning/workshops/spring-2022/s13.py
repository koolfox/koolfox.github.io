from math import tanh
sequence = [1.0,0.0,0.0,0.0]
recurrent_weight = 0.7
input_weight = 1.0
h = 0.1
sensitivity = 1.0
states, derivatives = [], []
for x in sequence:
    h = tanh(recurrent_weight*h+input_weight*x)
    sensitivity *= recurrent_weight*(1-h*h)
    states.append(h)
    derivatives.append(sensitivity)
result = {"states": states, "sensitivity_to_initial_state": derivatives}
