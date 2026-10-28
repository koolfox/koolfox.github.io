from math import exp, sqrt
keys = [[1,0],[0,1],[1,1]]
values = [[2,0],[0,4],[9,9]]
query = [1,1]
position = 1  # zero-based: second token
causal = True
allowed = [not causal or j <= position for j in range(len(keys))]
scores = [sum(a*b for a,b in zip(query,k))/sqrt(2) for k in keys]
maximum = max(s for s,ok in zip(scores,allowed) if ok)
exps = [exp(s-maximum) if ok else 0.0 for s,ok in zip(scores,allowed)]
weights = [x/sum(exps) for x in exps]
context = [sum(a*v[j] for a,v in zip(weights,values)) for j in range(2)]
result = {"attention": weights, "context": context}
