from math import exp
query = [1.0,0.0]
keys = [[1.0,0.0],[0.0,1.0]]
values = [[2.0,0.0],[0.0,4.0]]
temperature = 1.0
def dot(a,b):
    return sum(x*y for x,y in zip(a,b))
scores = [dot(query,key)/temperature for key in keys]
exps = [exp(x-max(scores)) for x in scores]
attention = [x/sum(exps) for x in exps]
context = [sum(a*v[j] for a,v in zip(attention,values)) for j in range(2)]
result = {"attention": attention, "context": context, "weight_sum": sum(attention)}
