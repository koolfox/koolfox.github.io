// One query, its keys and values: the same dot-product example as the Python cell.
export async function runAttentionGPU({query, keys, values, scaled}) {
  const finite = row => Array.isArray(row) && row.length > 0 && row.length <= 64
    && row.every(value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e6);
  if (!finite(query) || !Array.isArray(keys) || !Array.isArray(values) || !keys.length
      || keys.length > 64 || keys.length !== values.length || typeof scaled !== 'boolean'
      || !keys.every(row => finite(row) && row.length === query.length)
      || !values.every(row => finite(row) && row.length === values[0].length)) {
    throw Error('ورودی توجه باید بردارها و ماتریس‌های هم‌اندازه و متناهی باشد.');
  }
  if (!navigator.gpu) throw Error('WebGPU در این مرورگر در دسترس نیست؛ اجرای پایتون در دسترس است.');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('مرورگر آداپتور WebGPU ارائه نکرد؛ اجرای پایتون در دسترس است.');
  const device = await adapter.requestDevice(), buffers = [];
  try {
    const n = keys.length, d = query.length, v = values[0].length;
    const input = new Float32Array([...query, ...keys.flat(), ...values.flat()]);
    const count = 2 * n + v, bytes = count * 4;
    function buffer(size, usage) { const value = device.createBuffer({size, usage}); buffers.push(value); return value; }
    const source = buffer(input.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const output = buffer(bytes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const readback = buffer(bytes, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
    device.queue.writeBuffer(source, 0, input);
    // Stable softmax subtracts the maximum before exp, just as in the Python code.
    const shader = device.createShaderModule({code: `
      @group(0) @binding(0) var<storage, read> x: array<f32>;
      @group(0) @binding(1) var<storage, read_write> y: array<f32>;
      @compute @workgroup_size(1) fn main() {
        var maximum = -3.402823e38;
        for (var i = 0u; i < ${n}u; i++) {
          var score = 0.0;
          for (var j = 0u; j < ${d}u; j++) { score += x[j] * x[${d}u + i * ${d}u + j]; }
          score /= ${scaled ? Math.sqrt(d) : 1};
          y[i] = score; maximum = max(maximum, score);
        }
        var total = 0.0;
        for (var i = 0u; i < ${n}u; i++) { y[${n}u + i] = exp(y[i] - maximum); total += y[${n}u + i]; }
        for (var i = 0u; i < ${n}u; i++) { y[${n}u + i] /= total; }
        for (var j = 0u; j < ${v}u; j++) {
          var value = 0.0;
          for (var i = 0u; i < ${n}u; i++) { value += y[${n}u + i] * x[${d + n * d}u + i * ${v}u + j]; }
          y[${2 * n}u + j] = value;
        }
      }`});
    const pipeline = await device.createComputePipelineAsync({layout: 'auto', compute: {module: shader, entryPoint: 'main'}});
    const group = device.createBindGroup({layout: pipeline.getBindGroupLayout(0), entries: [
      {binding: 0, resource: {buffer: source}}, {binding: 1, resource: {buffer: output}},
    ]});
    const encoder = device.createCommandEncoder(), pass = encoder.beginComputePass();
    pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.dispatchWorkgroups(1); pass.end();
    encoder.copyBufferToBuffer(output, 0, readback, 0, bytes); device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const result = [...new Float32Array(readback.getMappedRange())]; readback.unmap();
    if (result.some(value => !Number.isFinite(value))) throw Error('خروجی WebGPU متناهی نیست؛ اندازهٔ ورودی را کاهش بده.');
    return {scores: result.slice(0, n), weights: result.slice(n, 2 * n), output: result.slice(2 * n),
      precision: 'float32', adapter: [adapter.info?.vendor, adapter.info?.architecture, adapter.info?.description].filter(Boolean).join(' / ') || 'WebGPU', fallback: adapter.info?.isFallbackAdapter ?? null};
  } finally { for (const item of buffers) item.destroy(); device.destroy(); }
}
