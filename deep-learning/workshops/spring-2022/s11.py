x, target = 2.0, 1.0
encoder, head = 0.5, 0.5
freeze_encoder = True
rate = 0.1
feature = encoder*x
prediction = head*feature
error = prediction-target
grad_head = error*feature
grad_encoder = error*head*x
new_head = head-rate*grad_head
new_encoder = encoder if freeze_encoder else encoder-rate*grad_encoder
result = {"encoder_gradient": grad_encoder, "head_gradient": grad_head,
          "encoder_after": new_encoder, "head_after": new_head,
          "prediction_after": new_head*new_encoder*x}
