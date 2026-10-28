from collections import Counter
corpus = {'low':3, 'lower':1}
pairs = Counter()
for word,count in corpus.items():
    for a,b in zip(word,word[1:]):
        pairs[(a,b)] += count
winner = sorted(pairs, key=lambda p:(-pairs[p],p))[0]
tokens = ['red','bird','flies']
position = 1
causal_context = tokens[:position]
masked_context = [t for i,t in enumerate(tokens) if i != position]
result = {"selected_pair": list(winner), "pair_frequency": pairs[winner],
          "causal_context": causal_context, "masked_context": masked_context}
