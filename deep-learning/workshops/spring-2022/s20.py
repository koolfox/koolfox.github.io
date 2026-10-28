objects = [{'side':'left','color':'red'}, {'side':'right','color':'blue'}]
history_side = 'right'
use_history = True
def score(obj):
    return float(obj['side'] == history_side) if use_history else 0.0
scores = [score(obj) for obj in objects]
selected = max(range(len(objects)),key=lambda i:scores[i])
result = {"scores": scores, "selected_object": selected,
          "answer_color": objects[selected]['color']}
