from math import log
probabilities = [0.1,0.49,0.8,0.95]
def entropy(p):
    return -p*log(p)-(1-p)*log(1-p)
uncertainty = [entropy(p) for p in probabilities]
selected = max(range(len(probabilities)),key=lambda i:uncertainty[i])
easy_first = sorted(range(len(probabilities)),key=lambda i:uncertainty[i])
# Supplementary one-step Bellman target, not a trained RL agent.
reward, gamma, next_q = 1.0,0.9,[2.0,3.0]
result = {"entropy":uncertainty,"active_selection":selected,
          "easy_first_order":easy_first,"bellman_target":reward+gamma*max(next_q)}
