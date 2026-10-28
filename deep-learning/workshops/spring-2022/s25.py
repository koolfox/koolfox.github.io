support = {'A':[[0,0],[0,2]], 'B':[[3,0],[3,2]]}
query = [2.8,1.0]
prototype = {label:[sum(p[j] for p in points)/len(points) for j in range(2)] for label,points in support.items()}
distances = {label:sum((a-b)**2 for a,b in zip(query,p)) for label,p in prototype.items()}
result = {"squared_distances": list(distances.values()), "predicted_class":min(distances,key=distances.get),
          "ways":len(support), "support_count":sum(map(len,support.values()))}
