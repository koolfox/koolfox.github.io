x = [1.0, 2.0]
weights = [0.0, 0.0]
bias = 0.0
target = -1
rate = 0.2
def predict(x, w, b):
    return 1 if sum(a*b for a,b in zip(x,w)) + b >= 0 else -1
before = predict(x, weights, bias)
delta = rate * (target - before)
weights = [w + delta*a for w,a in zip(weights,x)]
bias += delta
result = {"before": before, "delta": delta, "weights": weights,
          "bias": bias, "after": predict(x, weights, bias)}
