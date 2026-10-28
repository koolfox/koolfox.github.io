from itertools import product
p_a = 0.3
frame = {'a':p_a, '_':1-p_a}
def collapse(path):
    merged = [c for i,c in enumerate(path) if i==0 or c!=path[i-1]]
    return ''.join(c for c in merged if c!='_')
mass = {}
for path in product(frame, repeat=2):
    text = collapse(path)
    mass[text] = mass.get(text,0)+frame[path[0]]*frame[path[1]]
reference, hypothesis = ['we','learn'], ['we','learn','today']
row = list(range(len(hypothesis)+1))
for i,a in enumerate(reference,1):
    next_row = [i]
    for j,b in enumerate(hypothesis,1):
        next_row.append(min(row[j]+1,next_row[-1]+1,row[j-1]+(a!=b)))
    row = next_row
result = {"ctc_probability_a":mass.get('a',0),"ctc_total_mass":sum(mass.values()),
          "ctc_probability_aa":mass.get('aa',0),"word_error_rate":row[-1]/len(reference)}
