data = [[2.0,0.0],[0.0,2.0]]
encoder = [1.0,0.0]
decoder = [1.0,0.0]
latent = [sum(a*w for a,w in zip(x,encoder)) for x in data]
reconstructed = [[z*w for w in decoder] for z in latent]
loss = sum((a-b)**2 for x,y in zip(data,reconstructed) for a,b in zip(x,y))/4
plausible_values = [0.0,2.0]
mean_prediction = sum(plausible_values)/len(plausible_values)
result = {"latent":latent,"reconstruction":reconstructed,"mse":loss,
          "mean_prediction":mean_prediction}
