"""Bounded, deterministic sequence experiments; standard library only.

All vectors/projections are small teaching examples, not pretrained models.
Public interface: PRESETS and run_experiment(scenario, **parameters).
"""
from __future__ import annotations

import copy
import math
import random

PRESETS = {
    "recurrent-memory": {"title_fa": "حالت و گرادیان در طول زمان", "config": {"length": 8, "weight": 0.8, "input_weight": 0.5, "bias": 0.0, "target": 0.5, "epochs": 20, "learning_rate": 0.1}},
    "embedding-geometry": {"title_fa": "هندسه بردار و شباهت", "config": {"seed": 7, "dimension": 3, "count": 5, "query_index": 0, "scale": 2.0}},
    "scaled-attention": {"title_fa": "محاسبه توجه مقیاس‌شده", "config": {"seed": 7, "length": 4, "key_dimension": 2, "value_dimension": 2, "temperature": 1.0, "causal": False}},
    "causal-multihead": {"title_fa": "توجه چندسر و ماسک علّی", "config": {"seed": 7, "length": 4, "model_dimension": 4, "heads": 2, "causal": True}},
}


def _number(value, name, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{name} must be finite and in [{low}, {high}]")
    return float(value)


def _integer(value, name, low, high):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f"{name} must be an integer in [{low}, {high}]")
    return value


def _boolean(value, name):
    if not isinstance(value, bool):
        raise ValueError(f"{name} must be a boolean")
    return value


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b, strict=True))


def _matrix(rng, rows, cols):
    return [[rng.uniform(-1, 1) for _ in range(cols)] for _ in range(rows)]


def _matmul(a, b):
    return [[_dot(row, col) for col in zip(*b, strict=True)] for row in a]


def _softmax(values):
    peak = max(values)
    exps = [math.exp(v - peak) for v in values]
    total = sum(exps)
    return [x / total for x in exps]


def recurrent_forward_and_grad(inputs, weight, input_weight, bias, target, initial_state=0.0):
    """Scalar tanh RNN, L=.5*(h_T-target)^2; exact shared-weight BPTT."""
    if not isinstance(inputs, (list, tuple)) or not 1 <= len(inputs) <= 64:
        raise ValueError("inputs must contain 1..64 values")
    xs = [_number(v, "input", -4, 4) for v in inputs]
    w = _number(weight, "weight", -2, 2)
    u = _number(input_weight, "input_weight", -2, 2)
    b = _number(bias, "bias", -2, 2)
    y = _number(target, "target", -1, 1)
    hs = [_number(initial_state, "initial_state", -1, 1)]
    for x in xs:
        hs.append(math.tanh(w * hs[-1] + u * x + b))
    error = hs[-1] - y
    gradients = {"weight": 0.0, "input_weight": 0.0, "bias": 0.0}
    input_gradients = [0.0] * len(xs)
    state_gradients = [0.0] * len(hs)
    state_gradients[-1] = error
    contributions = [0.0] * len(xs)
    for t in range(len(xs) - 1, -1, -1):
        delta = state_gradients[t + 1] * (1 - hs[t + 1] ** 2)
        contributions[t] = delta * hs[t]
        gradients["weight"] += contributions[t]
        gradients["input_weight"] += delta * xs[t]
        gradients["bias"] += delta
        input_gradients[t] = delta * u
        state_gradients[t] = delta * w
    return {"states": hs, "loss": 0.5 * error ** 2, "gradients": gradients, "input_gradients": input_gradients, "state_gradients": state_gradients, "weight_contributions": contributions}


def scaled_attention(queries, keys, values, *, causal=False, temperature=1.0):
    """Explicit softmax(Q K^T / sqrt(d_k) / temperature) V, no dropout."""
    _boolean(causal, "causal")
    temperature = _number(temperature, "temperature", 0.1, 10)
    for name, matrix in [("queries", queries), ("keys", keys), ("values", values)]:
        if not isinstance(matrix, (list, tuple)) or not 1 <= len(matrix) <= 16:
            raise ValueError(f"{name} must have 1..16 rows")
        if not isinstance(matrix[0], (list, tuple)) or not 1 <= len(matrix[0]) <= 16:
            raise ValueError(f"{name} must have 1..16 columns")
        width = len(matrix[0])
        for row in matrix:
            if not isinstance(row, (list, tuple)) or len(row) != width:
                raise ValueError(f"{name} must be rectangular")
            for val in row:
                _number(val, name, -1000, 1000)
    if len(keys) != len(values) or len(queries[0]) != len(keys[0]):
        raise ValueError("Q/K dimensions and K/V lengths must match")
    if causal and len(queries) != len(keys):
        raise ValueError("causal demonstration requires equal Q/K lengths")
    scores, weights, output = [], [], []
    divisor = math.sqrt(len(keys[0])) * temperature
    for i, q in enumerate(queries):
        score = [_dot(q, k) / divisor for k in keys]
        allowed = list(range(i + 1)) if causal else list(range(len(keys)))
        # Masked entries never enter normalization. JSON uses null, not infinity.
        distribution = _softmax([score[j] for j in allowed])
        row = [0.0] * len(keys)
        for j, probability in zip(allowed, distribution, strict=True):
            row[j] = probability
        scores.append([score[j] if j in allowed else None for j in range(len(keys))])
        weights.append(row)
        output.append([sum(row[j] * values[j][k] for j in range(len(keys))) for k in range(len(values[0]))])
    return {"scores": scores, "weights": weights, "output": output}


def _table(title, columns, rows):
    return {"title_fa": title, "columns": columns, "rows": rows}


def _matrix_table(title, matrix):
    return _table(title, ["ردیف"] + [str(i + 1) for i in range(len(matrix[0]))], [[i + 1] + row for i, row in enumerate(matrix)])


def _recurrent(config):
    n = _integer(config["length"], "length", 1, 64)
    w = _number(config["weight"], "weight", -1.5, 1.5)
    u = _number(config["input_weight"], "input_weight", -1.5, 1.5)
    b = _number(config["bias"], "bias", -1, 1)
    target = _number(config["target"], "target", -1, 1)
    epochs = _integer(config["epochs"], "epochs", 0, 100)
    lr = _number(config["learning_rate"], "learning_rate", 0, 0.5)
    xs = [1.0] + [0.0] * (n - 1)
    before = recurrent_forward_and_grad(xs, w, u, b, target)
    history = [before["loss"]]
    trained_w = w
    for _ in range(epochs):
        result = recurrent_forward_and_grad(xs, trained_w, u, b, target)
        # Only w is optimized; explicit projection keeps this classroom experiment bounded.
        trained_w = max(-1.5, min(1.5, trained_w - lr * result["gradients"]["weight"]))
        history.append(recurrent_forward_and_grad(xs, trained_w, u, b, target)["loss"])
    after = recurrent_forward_and_grad(xs, trained_w, u, b, target)
    epsilon = 1e-6
    numeric = (recurrent_forward_and_grad(xs, w + epsilon, u, b, target)["loss"] - recurrent_forward_and_grad(xs, w - epsilon, u, b, target)["loss"]) / (2 * epsilon)
    return {
        "metrics": {"initial_loss": before["loss"], "final_loss": after["loss"], "initial_weight_gradient": before["gradients"]["weight"], "finite_difference_gradient": numeric, "gradient_absolute_error": abs(numeric - before["gradients"]["weight"]), "trained_weight": trained_w, "initial_first_input_gradient": before["input_gradients"][0]},
        "tables": [_table("عبور اولیه و سهم‌های گرادیان", ["گام", "ورودی", "حالت", "مشتق زیان نسبت به ورودی", "سهم مشتق وزن"], [[t + 1, xs[t], before["states"][t + 1], before["input_gradients"][t], before["weight_contributions"][t]] for t in range(n)])],
        "series": [{"name": "حالت پیش از آموزش", "x": list(range(n + 1)), "y": before["states"]}, {"name": "حالت پس از آموزش", "x": list(range(n + 1)), "y": after["states"]}, {"name": "زیان تک‌دنباله", "x": list(range(epochs + 1)), "y": history}],
        "assumptions_fa": ["ورودی یک ضربه و سپس صفر است؛ حالت اولیه صفر و سلول تک‌عددی tanh است.", "فقط وزن بازگشتی روی همین یک دنباله آموزش داده می‌شود؛ تعمیم یا یادگیری زبان آزموده نمی‌شود.", "وزن پس از هر گام به بازه منفی۱٫۵ تا۱٫۵ محدود می‌شود. گرادیان خام پیش از این محدودسازی گزارش می‌شود.", "نمودار گرادیان به زیان هدف آخر وابسته است؛ کوچک‌بودن آن به‌تنهایی آزمون ظرفیت حافظه نیست."]}


def _geometry(config):
    seed = _integer(config["seed"], "seed", 0, 2**31 - 1)
    d = _integer(config["dimension"], "dimension", 2, 8)
    n = _integer(config["count"], "count", 2, 12)
    query = _integer(config["query_index"], "query_index", 0, n - 1)
    scale = _number(config["scale"], "scale", 0.1, 10)
    vectors = _matrix(random.Random(seed), n, d)
    def cosine(a, b):
        denominator = math.sqrt(_dot(a, a) * _dot(b, b))
        if denominator == 0:
            raise ValueError("cosine is undefined for a zero vector")
        return _dot(a, b) / denominator
    q = vectors[query]
    rows = [[i, _dot(q, v), cosine(q, v), math.sqrt(sum((a-b)**2 for a,b in zip(q,v,strict=True)))] for i,v in enumerate(vectors)]
    rotated = [[-v[1], v[0]] + v[2:] for v in vectors]
    error = max(abs(cosine(vectors[i],vectors[j])-cosine(rotated[i],rotated[j])) for i in range(n) for j in range(n))
    scaled = [scale*x for x in q]
    scaling_error = max(abs(cosine(q,v)-cosine(scaled,v)) for v in vectors)
    candidates = sorted((row for row in rows if row[0] != query), key=lambda row: (-row[2], row[0]))
    return {"metrics": {"lookup_parameters": n*d, "query_norm": math.sqrt(_dot(q,q)), "nearest_other_index": candidates[0][0], "rotation_cosine_max_error": error, "positive_scaling_cosine_max_error": scaling_error}, "tables": [_matrix_table("جدول بردارهای ساختگی؛ ردیف همان شناسه توکن است", vectors), _table("فاصله‌ها نسبت به توکن پرسش", ["شناسه", "ضرب داخلی", "شباهت کسینوسی", "فاصله اقلیدسی"], rows), _table("همسایه‌ها بدون خود توکن", ["شناسه", "ضرب داخلی", "شباهت کسینوسی", "فاصله اقلیدسی"], candidates)], "series": [{"name": "شباهت کسینوسی به پرسش", "x": list(range(n)), "y": [r[2] for r in rows]}], "assumptions_fa": ["بردارها تصادفی و با بذر ثابت‌اند؛ نزدیک‌بودن آن‌ها هیچ ادعای معنایی درباره واژه واقعی نمی‌سازد.", "پرسش از رتبه‌بندی همسایه‌های دیگر حذف می‌شود.", "چرخش۹۰درجه در دو محور نخست،تمام فاصله‌ها و کسینوس‌ها را حفظ می‌کند؛معنای جداگانه هر محور تضمین نیست.", "مقیاس مثبت طول پرسش را تغییر می‌دهد ولی کسینوس را ثابت نگه می‌دارد."]}


def _attention(config):
    seed = _integer(config["seed"], "seed", 0, 2**31-1)
    n = _integer(config["length"], "length", 1, 12)
    dk = _integer(config["key_dimension"], "key_dimension", 1, 8)
    dv = _integer(config["value_dimension"], "value_dimension", 1, 8)
    rng = random.Random(seed)
    q,k,v = _matrix(rng,n,dk),_matrix(rng,n,dk),_matrix(rng,n,dv)
    result = scaled_attention(q,k,v,causal=config["causal"],temperature=config["temperature"])
    entropy = [-sum(p*math.log(p) for p in row if p>0) for row in result["weights"]]
    return {"metrics": {"max_row_sum_error": max(abs(sum(row)-1) for row in result["weights"]), "mean_attention_entropy": sum(entropy)/n, "scale_denominator": math.sqrt(dk)*config["temperature"]}, "tables": [_matrix_table("پرسش Q",q),_matrix_table("کلید K",k),_matrix_table("مقدار V",v),_matrix_table("امتیازهای مقیاس‌شده؛ خانه خالی یعنی ممنوع",result["scores"]),_matrix_table("وزن توجه",result["weights"]),_matrix_table("ترکیب وزن‌دار مقادیر",result["output"])], "series": [{"name": "آنتروپی هر ردیف توجه", "x": list(range(1,n+1)), "y": entropy}], "assumptions_fa": ["Q،K،V کوچک و تصادفی‌اند؛ پارامتر زبانی آموخته‌شده‌ای استفاده نمی‌شود.", "دمای کمتر می‌تواند توزیع را تیزتر کند؛اطمینان ظاهری دلیل درستی یا تبیین علّی نیست.", "ماسک علّی فقط کلیدهای آینده را از نرمال‌سازی حذف می‌کند؛وزن خانه ممنوع دقیقاًصفر است."]}


def _multihead(config):
    seed = _integer(config["seed"], "seed", 0, 2**31-1)
    n = _integer(config["length"], "length", 2, 12)
    d = _integer(config["model_dimension"], "model_dimension", 2, 12)
    heads = _integer(config["heads"], "heads", 1, 6)
    causal = _boolean(config["causal"], "causal")
    if d % heads:
        raise ValueError("model_dimension must be divisible by heads")
    dh = d//heads
    rng = random.Random(seed)
    x = _matrix(rng,n,d)
    projections = [_matrix(rng,d,d) for _ in range(4)]
    def evaluate(inputs):
        q,k,v = [_matmul(inputs,m) for m in projections[:3]]
        results = [scaled_attention([row[h*dh:(h+1)*dh] for row in q], [row[h*dh:(h+1)*dh] for row in k], [row[h*dh:(h+1)*dh] for row in v], causal=causal) for h in range(heads)]
        concatenated = [sum((result["output"][i] for result in results),[]) for i in range(n)]
        return _matmul(concatenated,projections[3]),results,concatenated
    output,results,concat = evaluate(x)
    changed = copy.deepcopy(x)
    changed[-1][0] += 3
    changed_output,_,_ = evaluate(changed)
    delta = max(abs(a-b) for ra,rb in zip(output[:-1],changed_output[:-1],strict=True) for a,b in zip(ra,rb,strict=True))
    return {"metrics": {"head_dimension": dh, "output_width": len(output[0]), "projection_parameters_no_bias": 4*d*d, "earlier_output_max_change_after_future_perturbation": delta, "max_attention_row_sum_error": max(abs(sum(row)-1) for result in results for row in result["weights"])}, "tables": [_matrix_table("ورودی X",x)] + [_matrix_table(f"وزن توجه سر {h+1}",result["weights"]) for h,result in enumerate(results)] + [_matrix_table("کنارهم‌گذاری خروجی سرها",concat),_matrix_table("خروجی پس از W_O",output),_table("قرارداد شکل‌ها",["تانسور","سطر","ستون"],[["X",n,d],["Q/K/V هر سر",n,dh],["وزن هر سر",n,n],["خروجی نهایی",n,d]])], "series": [], "assumptions_fa": ["هر سر از ستون‌های جداگانه نگاشت‌های Q،K،V استفاده می‌کند؛خروجی‌ها کنارهم گذاشته و سپس در W_O ضرب می‌شوند.", "مدل فقط بلوک توجه بدون بایاس،dropout،اتصال باقیمانده یا LayerNorm است؛ترانسفورمر کامل نیست.", "تغییر توکن آخر در حالت علّی نباید خروجی‌های قبلی را تغییر دهد؛در حالت بدون ماسک امکان تغییر هست.", "با d_model ثابت،تغییر تعداد سرها در این قرارداد تعداد پارامتر چهار نگاشت را عوض نمی‌کند."]}


def run_experiment(scenario, **parameters):
    """Run one preset with validated overrides; returns only JSON-safe values."""
    if scenario not in PRESETS:
        raise ValueError(f"Unknown scenario: {scenario}")
    config = copy.deepcopy(PRESETS[scenario]["config"])
    unknown = set(parameters)-set(config)
    if unknown:
        raise ValueError(f"Unknown parameters: {sorted(unknown)}")
    config.update(parameters)
    result = {"recurrent-memory": _recurrent,"embedding-geometry": _geometry,"scaled-attention": _attention,"causal-multihead": _multihead}[scenario](config)
    return {"scenario":scenario,"config":config,**result}
