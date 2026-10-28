rate = 0.05
epochs = 40
w = 0.0
# Intentionally different toy targets, to make selection visible.
x = [1.0, 2.0]
train_y = [3.0, 6.0]
valid_y = [2.0, 4.0]
train_loss, valid_loss = [], []
for epoch in range(epochs):
    gradient = 2*sum((w*a-y)*a for a,y in zip(x,train_y))/len(x)
    w -= rate*gradient
    train_loss.append(sum((w*a-y)**2 for a,y in zip(x,train_y))/len(x))
    valid_loss.append(sum((w*a-y)**2 for a,y in zip(x,valid_y))/len(x))
best = min(range(epochs), key=lambda i: valid_loss[i])
result = {"train_loss": train_loss, "validation_loss": valid_loss,
          "selected_epoch": best+1, "selected_validation_loss": valid_loss[best],
          "last_validation_loss": valid_loss[-1]}
