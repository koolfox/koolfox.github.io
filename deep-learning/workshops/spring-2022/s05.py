from math import exp, log
x = [2.0, -1.0]
w = [0.3, -0.2]
b = 0.1
target = 1.0
rate = 0.1
def loss(weights):
    z = sum(a*c for a,c in zip(x,weights)) + b
    return log(1 + exp(z)) - target*z
z = sum(a*c for a,c in zip(x,w)) + b
p = 1/(1+exp(-z))
gradient = [(p-target)*a for a in x]
eps = 1e-5
numeric = []
for j in range(len(w)):
    plus, minus = w.copy(), w.copy()
    plus[j] += eps
    minus[j] -= eps
    numeric.append((loss(plus)-loss(minus))/(2*eps))
updated = [a-rate*g for a,g in zip(w,gradient)]
result = {"gradient": gradient, "numeric": numeric,
          "max_difference": max(abs(a-c) for a,c in zip(gradient,numeric)),
          "loss_before": loss(w), "loss_after": loss(updated)}
