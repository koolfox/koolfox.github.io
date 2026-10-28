votes = ['red']*3 + ['blue']*7
prediction = 'red'
assert len(votes) == 10
# Mean agreement over the ten subsets of nine annotators.
scores = []
for left_out in range(10):
    matches = sum(v == prediction for i,v in enumerate(votes) if i != left_out)
    scores.append(min(matches/3,1))
result = {"subset_scores": scores, "vqa_score": sum(scores)/10,
          "full_set_approximation": min(votes.count(prediction)/3,1)}
