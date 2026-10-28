x, y = [1.0,2.0], [2.0,4.0]
w = 0.5
penalty = 0.2
rate = 0.1
def mse(weight):
    return sum((weight*a-b)**2 for a,b in zip(x,y))/len(x)
data_gradient = 2*sum((w*a-b)*a for a,b in zip(x,y))/len(x)
penalty_gradient = 2*penalty*w
updated = w-rate*(data_gradient+penalty_gradient)
result = {"data_gradient": data_gradient, "penalty_gradient": penalty_gradient,
          "updated_weight": updated, "data_loss_before": mse(w), "data_loss_after": mse(updated)}
