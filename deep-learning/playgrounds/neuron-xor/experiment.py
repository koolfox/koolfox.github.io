"""Edit this experiment, then run the app to apply the new configuration."""

from live_training import TrainingRun

CONFIG = {
    "gate": "XOR",
    "model": "mlp",
    "hidden": 4,
    "learning_rate": 1.0,
    "seed": 7,
    "max_epochs": 6000,
}


def create_run(**config):
    return TrainingRun(**config)


def train_epochs(experiment, count=1):
    # The same function drives both single-step and continuous training.
    experiment.step(count)
