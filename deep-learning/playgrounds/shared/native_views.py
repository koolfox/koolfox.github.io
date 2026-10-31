"""UI samples evaluated by the actual Python forward function, including edits."""

import math


def visual_state(run, kind, steps=24):
    state = run.snapshot()
    if kind == "neuron-xor":
        points = state["inputs"]
        bound = 1.25
        low = -0.25
        high = 1.25
        forward = run.forward
    else:
        # Import from the edited module in this execution, not a JS reimplementation.
        from network_playground import features

        points = [p["x"] for p in state["points"]]
        bound = max(1.15, *(abs(v) * 1.05 for p in points for v in p))
        low, high = -bound, bound

        def forward(p):
            return run.network.forward(features(p, state["config"]["feature_names"]))

    traces = []
    for point in points:
        activations, logits = forward(point)
        traces.append({"activations": activations, "logits": logits})
    values = []
    for y in range(steps):
        row = []
        for x in range(steps):
            point = [
                low + (x + 0.5) / steps * (high - low),
                high - (y + 0.5) / steps * (high - low),
            ]
            value = forward(point)[0][-1][0]
            if not math.isfinite(value):
                raise ArithmeticError(
                    "Non-finite output from the edited forward function"
                )
            row.append(value)
        values.append(row)
    return {
        **state,
        "probe_traces": traces,
        "surface_grid": {"values": values, "low": low, "high": high},
    }
