"""Edit the actual kernel and operation order used by the displayed result."""

from convolution_lab import correlate, pattern, pool

CONFIG = {
    "pattern": "vertical",
    "kernel": [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
    "bias": 0.0,
    "stride": 1,
    "padding": 0,
    "flip": False,
    "relu": False,
    "pooling": "none",
}


def calculate(config):
    image = pattern(config["pattern"])
    raw = correlate(
        [image],
        [config["kernel"]],
        config["bias"],
        config["stride"],
        config["padding"],
        config["flip"],
    )
    activated = [
        [max(0, value) if config["relu"] else value for value in row]
        for row in raw["output"]
    ]
    pooled = (
        pool(activated, mode=config["pooling"]) if config["pooling"] != "none" else None
    )
    return {"image": image, "raw": raw, "activated": activated, "pooled": pooled}
