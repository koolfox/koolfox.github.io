scores = [[2,1,0,-1], [0,3,2,1], [3,0,1,2]]
truth = [0,2,3]
k = 2
def top_k(row, k):
    return sorted(range(len(row)), key=lambda j: row[j], reverse=True)[:k]
hits = [int(y in top_k(row,k)) for row,y in zip(scores,truth)]
result = {"hits": hits, "top_k_accuracy": sum(hits)/len(hits),
          "top_1_accuracy": sum(top_k(row,1)[0]==y for row,y in zip(scores,truth))/len(truth)}
