from math import exp, log
teacher = [3.0,1.0,0.0]
student = [0.0,0.0,0.0]
temperature = 2.0
rate = 0.1
def softmax(logits):
    scaled = [x/temperature for x in logits]
    values = [exp(x-max(scaled)) for x in scaled]
    return [x/sum(values) for x in values]
q, p = softmax(teacher), softmax(student)
# Gradient of T^2 * CE(q, softmax(student/T)) w.r.t. student logits.
gradient = [temperature*(a-b) for a,b in zip(p,q)]
updated = [s-rate*g for s,g in zip(student,gradient)]
result = {"teacher_probabilities":q,"student_gradient":gradient,
          "student_after":softmax(updated),"teacher_entropy":-sum(x*log(x) for x in q)}
