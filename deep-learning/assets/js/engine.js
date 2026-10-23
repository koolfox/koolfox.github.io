/**
 * Forward evaluation only. Training is performed by python/logic_gates.py.
 * weights[layer][output][input] and biases[layer][output] are exported checkpoints.
 * Explicit activation avoids coupling numerical behavior to interface state.
 */
export function predictCheckpoint(checkpoint, inputs, activation) {
    if (!['hard_threshold', 'sigmoid'].includes(activation)) {
        throw new Error(`Unsupported activation: ${activation}`);
    }
    let values = [...inputs];
    checkpoint.weights.forEach((layer, layerIndex) => {
        values = layer.map((weights, outputIndex) => {
            const z = weights.reduce(
                (sum, weight, inputIndex) => sum + weight * values[inputIndex],
                checkpoint.biases[layerIndex][outputIndex],
            );
            if (activation === 'hard_threshold') return z >= 0 ? 1 : 0;
            // Numerically stable sigmoid, matching the Python reference.
            if (z >= 0) return 1 / (1 + Math.exp(-z));
            const exp = Math.exp(z);
            return exp / (1 + exp);
        });
    });
    return values[0];
}
