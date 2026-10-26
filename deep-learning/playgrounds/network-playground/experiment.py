"""Change one factor at a time; keep the seed fixed for comparisons."""

from network_playground import NetworkExperiment

CONFIG = {
    "dataset": "circles",
    "feature_names": ["x1", "x2"],
    "hidden": [4, 4],
    "activation": "tanh",
    "optimizer": "adam",
    "learning_rate": 0.03,
    "batch_size": 20,
    "regularization": "none",
    "regularization_rate": 0.001,
    "size": 200,
    "noise": 0.05,
    "seed": 7,
    "max_epochs": 1000,
}


def create_run(**config):
    return NetworkExperiment(**config)


def train_epochs(experiment, count=1):
    experiment.step(count)
