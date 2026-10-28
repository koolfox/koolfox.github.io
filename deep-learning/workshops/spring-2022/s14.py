from math import sqrt
words = ['cat','dog','car']
embedding = [[1.0,0.0], [0.9,0.1], [0.0,1.0]]
query = [1.0,0.0]
def cosine(a,b):
    return sum(x*y for x,y in zip(a,b))/(sqrt(sum(x*x for x in a))*sqrt(sum(y*y for y in b)))
similarity = [cosine(query,row) for row in embedding]
result = {"cosine_similarity": similarity,
          "nearest": words[max(range(len(words)),key=lambda i:similarity[i])],
          "parameters": len(words)*len(embedding[0])}
