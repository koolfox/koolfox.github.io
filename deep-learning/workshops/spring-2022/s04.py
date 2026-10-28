def activation(z):
    return max(0.0, z)
def network(a, b):
    h1 = activation(a + b)
    h2 = activation(a + b - 1)
    return h1 - 2*h2
inputs = [(0,0), (0,1), (1,0), (1,1)]
outputs = [network(a,b) for a,b in inputs]
result = {"outputs": outputs, "absolute_error": sum(abs(y-int(a!=b)) for (a,b),y in zip(inputs,outputs))}
