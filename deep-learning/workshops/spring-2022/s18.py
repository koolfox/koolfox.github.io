from math import log, exp
candidates = {'A':[0.9,0.2,0.8], 'B':[0.6,0.6,0.6]}
length_normalize = False
def score(probabilities):
    value = sum(log(p) for p in probabilities)
    return value/len(probabilities) if length_normalize else value
scores = {name:score(p) for name,p in candidates.items()}
result = {"log_scores": list(scores.values()), "sequence_probabilities":[exp(sum(log(v) for v in p)) for p in candidates.values()],
          "selected": max(scores,key=scores.get)}
