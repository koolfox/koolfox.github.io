"""Small, deterministic learning-strategy experiments (Python standard library).

Representations/data are synthetic. No pretrained model, benchmark, speech
recognizer, or image generator is reproduced. All seeds and workloads are bounded.
"""

import math
import random


def _preset(title, config, bounds=None, choices=None, labels=None):
    return {
        "title_fa": title,
        "config": config,
        "bounds": bounds or {},
        "choices": choices or {},
        "labels_fa": labels or {},
    }


def _b(lo, hi, step=1):
    return {"min": lo, "max": hi, "step": step}


PRESETS = {
    "autoencoder": _preset(
        "بازسازی با گلوگاه خطی",
        {"steps": 50, "learning_rate": 0.08, "seed": 7},
        {
            "steps": _b(0, 200),
            "learning_rate": _b(0.001, 0.15, 0.001),
            "seed": _b(0, 10000),
        },
    ),
    "gan": _preset(
        "زیان و گرادیان مولد و تمایزگر",
        {"real_logit": 1.4, "fake_logit": -1.4},
        {"real_logit": _b(-12, 12, 0.1), "fake_logit": _b(-12, 12, 0.1)},
    ),
    "contrastive": _preset(
        "تطبیق متقابل سه جفت",
        {"temperature": 0.3, "rotation_degrees": 20.0},
        {"temperature": _b(0.05, 5, 0.05), "rotation_degrees": _b(-180, 180, 5)},
    ),
    "multitask": _preset(
        "تعارض دو وظیفه بر سر یک پارامتر",
        {"task_weight": 0.5, "initial_theta": 0.0, "steps": 20, "learning_rate": 0.1},
        {
            "task_weight": _b(0, 1, 0.05),
            "initial_theta": _b(-5, 5, 0.1),
            "steps": _b(0, 100),
            "learning_rate": _b(0.01, 0.5, 0.01),
        },
    ),
    "few-shot": _preset(
        "طبقه‌بندی با نمونه‌های نماینده",
        {"classes": 3, "shots": 3, "query_x": 1.0, "query_y": 0.0, "seed": 7},
        {
            "classes": _b(2, 5),
            "shots": _b(1, 10),
            "query_x": _b(-4, 4, 0.1),
            "query_y": _b(-4, 4, 0.1),
            "seed": _b(0, 10000),
        },
    ),
    "distillation": _preset(
        "تقطیر با دما و برچسب واقعی",
        {"temperature": 3.0, "soft_weight": 0.7, "steps": 40, "learning_rate": 0.1},
        {
            "temperature": _b(0.5, 10, 0.5),
            "soft_weight": _b(0, 1, 0.05),
            "steps": _b(0, 200),
            "learning_rate": _b(0.01, 0.5, 0.01),
        },
    ),
    "compression": _preset(
        "هرس و کمّی‌سازی: خطا و هزینهٔ ذخیره",
        {"bits": 4, "threshold": 0.15},
        {"bits": _b(2, 8), "threshold": _b(0, 2, 0.05)},
    ),
    "active-learning": _preset(
        "انتخاب برچسب با عدم‌قطعیت",
        {"budget": 3, "strategy": "entropy", "seed": 7},
        {"budget": _b(1, 8), "seed": _b(0, 10000)},
        {"strategy": {"entropy": "آنتروپی", "margin": "حاشیه", "random": "تصادفی"}},
    ),
    "reinforcement": _preset(
        "بلمن و یک گام گرادیان سیاست",
        {"discount": 0.9, "iterations": 12, "learning_rate": 0.1},
        {
            "discount": _b(0, 0.99, 0.01),
            "iterations": _b(1, 100),
            "learning_rate": _b(0.01, 0.5, 0.01),
        },
    ),
    "speech": _preset(
        "قاب صوت، طیف و جمع مسیرهای CTC",
        {
            "frequency_bin": 3,
            "frame_size": 32,
            "blank_probability": 0.4,
            "reference": "we learn today",
            "hypothesis": "we learn",
        },
        {
            "frequency_bin": _b(1, 7),
            "frame_size": _b(16, 64, 16),
            "blank_probability": _b(0.05, 0.9, 0.05),
        },
    ),
    "transfer": _preset(
        "مکمل مستقل: انجماد در برابر تنظیم همهٔ وزن‌ها",
        {"steps": 30, "learning_rate": 0.05, "target_slope": 2.0},
        {
            "steps": _b(0, 100),
            "learning_rate": _b(0.001, 0.1, 0.001),
            "target_slope": _b(-3, 3, 0.1),
        },
    ),
}
_LABELS = {
    "steps": "تعداد گام",
    "learning_rate": "نرخ یادگیری",
    "seed": "بذر",
    "real_logit": "لوجیت دادهٔ واقعی",
    "fake_logit": "لوجیت نمونهٔ مولد",
    "temperature": "دما",
    "rotation_degrees": "چرخش ویژگی‌ها (درجه)",
    "task_weight": "وزن وظیفهٔ اول",
    "initial_theta": "پارامتر آغازین",
    "classes": "تعداد کلاس",
    "shots": "نمونه در هر کلاس",
    "query_x": "مختصات اول پرسش",
    "query_y": "مختصات دوم پرسش",
    "soft_weight": "وزن زیان نرم",
    "bits": "بیت وزن",
    "threshold": "آستانهٔ هرس",
    "budget": "بودجهٔ برچسب",
    "strategy": "راهبرد انتخاب",
    "discount": "ضریب تنزیل",
    "iterations": "تعداد تکرار بلمن",
    "frequency_bin": "شمارهٔ بسامد موج",
    "frame_size": "طول قاب",
    "blank_probability": "احتمال نماد خالی",
    "reference": "متن مرجع",
    "hypothesis": "متن پیش‌بینی",
    "target_slope": "شیب وظیفهٔ مقصد",
}
for _spec in PRESETS.values():
    _spec["labels_fa"].update({k: _LABELS[k] for k in _spec["config"]})


def softmax(values, temperature=1.0):
    scaled = [v / temperature for v in values]
    largest = max(scaled)
    terms = [math.exp(v - largest) for v in scaled]
    total = sum(terms)
    return [v / total for v in terms]


def _sigmoid(z):
    return 1 / (1 + math.exp(-z))


def _logsumexp(values):
    m = max(values)
    return m + math.log(sum(math.exp(v - m) for v in values))


def _table(title, columns, rows):
    return {"title_fa": title, "columns": columns, "rows": rows}


def _series(title, points, x="گام", y="زیان"):
    return {
        "title_fa": title,
        "points": [{"x": a, "y": b} for a, b in points],
        "x_label_fa": x,
        "y_label_fa": y,
    }


def _result(c, metrics, tables, series=None, notes=None):
    return {
        "config": c,
        "metrics": metrics,
        "tables": tables,
        "series": series or [],
        "assumptions_fa": [
            "داده‌ها و نمایش‌ها مصنوعی و کوچک‌اند؛ این خروجی معیار عملکرد یک مدل واقعی نیست."
        ]
        + (notes or []),
    }


def _autoencoder(c):
    # Four original 2D observations lie on a line; one hidden linear unit.
    data = [[-1.0, -0.5], [-0.5, -0.25], [0.5, 0.25], [1.0, 0.5]]
    rng = random.Random(c["seed"])
    enc = [rng.uniform(-0.5, 0.5) for _ in range(2)]
    dec = [rng.uniform(-0.5, 0.5) for _ in range(2)]
    curve = []
    for step in range(c["steps"] + 1):
        ge, gd, loss = [0.0, 0.0], [0.0, 0.0], 0.0
        rows = []
        for x in data:
            h = sum(a * b for a, b in zip(enc, x))
            pred = [w * h for w in dec]
            error = [p - v for p, v in zip(pred, x)]
            loss += sum(e * e for e in error) / 8
            dh = sum(e * w for e, w in zip(error, dec)) / 4
            for j in range(2):
                gd[j] += error[j] * h / 4
                ge[j] += dh * x[j]
            rows.append(x + [h] + pred)
        curve.append((step, loss))
        if step < c["steps"]:
            enc = [w - c["learning_rate"] * g for w, g in zip(enc, ge)]
            dec = [w - c["learning_rate"] * g for w, g in zip(dec, gd)]
    return _result(
        c,
        {"initial_mse": curve[0][1], "final_mse": curve[-1][1], "bottleneck_width": 1},
        [
            _table("ورودی، کد و بازسازی", ["x1", "x2", "h", "x1_hat", "x2_hat"], rows),
            _table(
                "وزن‌های آموخته‌شده",
                ["مولفه", "رمزگذار", "رمزگشا"],
                [[i, enc[i], dec[i]] for i in range(2)],
            ),
        ],
        [_series("زیان بازسازی", curve)],
        [
            "خودرمزگذار خطی ۲→۱→۲ بدون بایاس؛ MSE بر ۸ مؤلفه میانگین گرفته می‌شود. این فشرده‌سازی یک مجموعهٔ هم‌خط را می‌آموزد."
        ],
    )


def gan_objectives(real_logit, fake_logit):
    real, fake = _sigmoid(real_logit), _sigmoid(fake_logit)
    return {
        "discriminator_loss": -0.5 * (math.log(real) + math.log1p(-fake)),
        "generator_minimax": 0.5 * math.log1p(-fake),
        "generator_nonsaturating": -0.5 * math.log(fake),
        "minimax_logit_gradient": -0.5 * fake,
        "nonsaturating_logit_gradient": 0.5 * (fake - 1),
        "discriminator_real_gradient": 0.5 * (real - 1),
        "discriminator_fake_gradient": 0.5 * fake,
    }


def _gan(c):
    values = gan_objectives(c["real_logit"], c["fake_logit"])
    return _result(
        c,
        values,
        [
            _table(
                "خروجی تمایزگر",
                ["نمونه", "لوجیت", "احتمال واقعی بودن"],
                [
                    ["واقعی", c["real_logit"], _sigmoid(c["real_logit"])],
                    ["مولد", c["fake_logit"], _sigmoid(c["fake_logit"])],
                ],
            )
        ],
        notes=[
            "هر دسته یک نمونهٔ واقعی و یک نمونهٔ ساختگی دارد. ضریب ۱/۲ قراردادی است. گرادیان‌ها نسبت به لوجیت‌اند؛ برای وزن مولد باید مشتق مسیر تمایزگر نیز اعمال شود. این سناریو شبکهٔ مولد را آموزش نمی‌دهد."
        ],
    )


def contrastive_loss(logits):
    n = len(logits)
    row = [_logsumexp(logits[i]) - logits[i][i] for i in range(n)]
    col = [
        _logsumexp([logits[i][j] for i in range(n)]) - logits[j][j] for j in range(n)
    ]
    return (sum(row) + sum(col)) / (2 * n), row, col


def _contrastive(c):
    a = [2 * math.pi * i / 3 for i in range(3)]
    rotation = math.radians(c["rotation_degrees"])
    logits = [[math.cos(x - y - rotation) / c["temperature"] for y in a] for x in a]
    loss, row, col = contrastive_loss(logits)
    return _result(
        c,
        {
            "symmetric_loss": loss,
            "pair_accuracy": sum(
                max(range(3), key=lambda j: logits[i][j]) == i for i in range(3)
            )
            / 3,
        },
        [
            _table(
                "لوجیت شباهت: قطر، جفت مثبت است",
                ["تصویر", "متن ۰", "متن ۱", "متن ۲"],
                [[i] + z for i, z in enumerate(logits)],
            ),
            _table(
                "دو جهت آنتروپی متقاطع",
                ["جفت", "تصویر به متن", "متن به تصویر"],
                [[i, row[i], col[i]] for i in range(3)],
            ),
        ],
        notes=[
            "سه بردار دوبعدی واحد به‌جای رمزگذار تصویر و متن قرار گرفته‌اند. دما ثابت است؛ وزن رمزگذار آموزش داده نمی‌شود. آنتروپی متقاطع سه‌کلاسه است، نه سه طبقه‌بندی دودویی مستقل."
        ],
    )


def _multitask(c):
    w, theta = c["task_weight"], c["initial_theta"]
    rows = []
    for step in range(c["steps"] + 1):
        g1, g2 = theta - 2, theta + 1
        l1, l2 = 0.5 * g1**2, 0.5 * g2**2
        rows.append([step, theta, l1, l2, w * l1 + (1 - w) * l2, g1, g2, g1 * g2])
        if step < c["steps"]:
            theta -= c["learning_rate"] * (w * g1 + (1 - w) * g2)
    return _result(
        c,
        {
            "final_theta": theta,
            "analytic_optimum": 3 * w - 1,
            "final_loss": rows[-1][4],
            "final_gradient_product": rows[-1][-1],
        },
        [
            _table(
                "گرادیان‌ها و زیان‌ها",
                ["گام", "theta", "L1", "L2", "L", "g1", "g2", "g1*g2"],
                rows,
            )
        ],
        [_series("زیان مشترک", [(r[0], r[4]) for r in rows])],
        [
            "دو وظیفهٔ درجه‌دو بر سر یک پارامتر مشترک رقابت می‌کنند؛ منفی بودن حاصل‌ضرب گرادیان‌ها نشان‌دهندهٔ تعارض محلی است."
        ],
    )


def _few_shot(c):
    rng = random.Random(c["seed"])
    support, prototypes = [], []
    for k in range(c["classes"]):
        center = [
            2 * math.cos(2 * math.pi * k / c["classes"]),
            2 * math.sin(2 * math.pi * k / c["classes"]),
        ]
        points = [
            [center[j] + rng.uniform(-0.5, 0.5) for j in range(2)]
            for _ in range(c["shots"])
        ]
        support.extend([[k] + point for point in points])
        prototypes.append([sum(p[j] for p in points) / c["shots"] for j in range(2)])
    query = [c["query_x"], c["query_y"]]
    distances = [sum((a - b) ** 2 for a, b in zip(query, p)) for p in prototypes]
    probs = softmax([-d for d in distances])
    return _result(
        c,
        {
            "predicted_class": distances.index(min(distances)),
            "support_count": len(support),
            "max_probability": max(probs),
        },
        [
            _table("مجموعهٔ پشتیبان", ["کلاس", "x", "y"], support),
            _table(
                "نمونهٔ نماینده و پرسش",
                ["کلاس", "cx", "cy", "فاصلهٔ مربع", "احتمال"],
                [[k] + p + [distances[k], probs[k]] for k, p in enumerate(prototypes)],
            ),
        ],
        notes=[
            "رمزگذار در این آزمایش همان مختصات ورودی است و از قبل آموزش ندیده است. میانگین هر کلاس تنها با نمونه‌های پشتیبان محاسبه می‌شود؛ پرسش وارد میانگین نمی‌شود."
        ],
    )


def distillation_objective(student, teacher, temperature, weight, label=0):
    p, q = softmax(student, temperature), softmax(teacher, temperature)
    hard = softmax(student)
    kl = sum(a * math.log(a / b) for a, b in zip(q, p))
    hard_loss = _logsumexp(student) - student[label]
    loss = weight * temperature**2 * kl + (1 - weight) * hard_loss
    gradient = [
        weight * temperature * (p[i] - q[i]) + (1 - weight) * (hard[i] - (i == label))
        for i in range(len(p))
    ]
    return loss, gradient, kl, hard_loss


def _distillation(c):
    teacher, student = [4.0, 2.0, -1.0], [0.0, 0.0, 0.0]
    curve = []
    for step in range(c["steps"] + 1):
        loss, grad, kl, hard = distillation_objective(
            student, teacher, c["temperature"], c["soft_weight"]
        )
        curve.append((step, loss))
        if step < c["steps"]:
            student = [z - c["learning_rate"] * g for z, g in zip(student, grad)]
    tp, sp, final = (
        softmax(teacher, c["temperature"]),
        softmax(student, c["temperature"]),
        softmax(student),
    )
    return _result(
        c,
        {
            "initial_loss": curve[0][1],
            "final_loss": loss,
            "teacher_student_kl": kl,
            "hard_label_loss": hard,
        },
        [
            _table(
                "توزیع معلم و دانش‌آموز",
                [
                    "کلاس",
                    "لوجیت معلم",
                    "لوجیت دانش‌آموز",
                    "معلم با دما",
                    "دانش‌آموز با دما",
                    "دانش‌آموز دمای ۱",
                ],
                [[i, teacher[i], student[i], tp[i], sp[i], final[i]] for i in range(3)],
            )
        ],
        [_series("آموزش واقعی سه لوجیت", curve)],
        [
            "معلم ثابت و برچسب واقعی کلاس ۰ است. دانش‌آموز فقط سه لوجیت قابل‌آموزش دارد، نه یک شبکهٔ تصویری. زیان نرم T² KL(q||p) است؛ ثابت آنتروپی معلم از آنتروپی متقاطع حذف شده است."
        ],
    )


def quantize(weights, bits, threshold):
    pruned = [w if abs(w) >= threshold else 0.0 for w in weights]
    qmax = 2 ** (bits - 1) - 1
    scale = max(map(abs, pruned), default=0.0) / qmax
    integers = [int(round(w / scale)) if scale else 0 for w in pruned]
    return pruned, integers, [q * scale for q in integers], scale


def _compression(c):
    weights = [-1.6, -0.72, -0.13, 0.02, 0.18, 0.49, 0.91, 1.2]
    x = [1.0, -1.0, 0.5, 2.0, -0.5, 1.0, 0.25, -1.0]
    pruned, integer, decoded, scale = quantize(weights, c["bits"], c["threshold"])
    y, yp = (
        sum(a * b for a, b in zip(weights, x)),
        sum(a * b for a, b in zip(decoded, x)),
    )
    nz = sum(v != 0 for v in integer)
    dense_bits = len(weights) * c["bits"] + 32
    sparse_bits = nz * (c["bits"] + 3) + 32 + 4
    return _result(
        c,
        {
            "original_output": y,
            "compressed_output": yp,
            "absolute_output_error": abs(yp - y),
            "weight_mse": sum((a - b) ** 2 for a, b in zip(weights, decoded)) / 8,
            "remaining_nonzero": nz,
            "original_storage_bits": 256,
            "quantized_dense_bits": dense_bits,
            "illustrative_sparse_bits": sparse_bits,
            "scale": scale,
        },
        [
            _table(
                "هر وزن تا خروجی",
                ["شماره", "ورودی", "وزن اصلی", "پس از هرس", "عدد صحیح", "بازسازی"],
                [
                    [i, x[i], weights[i], pruned[i], integer[i], decoded[i]]
                    for i in range(8)
                ],
            )
        ],
        notes=[
            "مکمل مستقل فشرده‌سازی: هرس قدرمطلق و کمّی‌سازی متقارن یک بردار ثابت، بدون بازآموزی. بیت ذخیرهٔ متراکم شامل یک مقیاس ۳۲بیتی است. مدل تنک نمایشی برای هر وزن ۳ بیت اندیس و ۴ بیت شمارنده دارد؛ سربار قالب فایل، هم‌ترازی و شتاب واقعی سخت‌افزار مدل نشده‌اند."
        ],
    )


def _active_learning(c):
    # Already-modelled categorical probabilities: no ground-truth leakage.
    pool = [
        [0.90, 0.05, 0.05],
        [0.45, 0.40, 0.15],
        [0.34, 0.33, 0.33],
        [0.60, 0.30, 0.10],
        [0.49, 0.49, 0.02],
        [0.80, 0.10, 0.10],
        [0.55, 0.23, 0.22],
        [0.70, 0.29, 0.01],
    ]
    entropy = [-sum(p * math.log(p) for p in row) for row in pool]
    margin = [
        sorted(row, reverse=True)[0] - sorted(row, reverse=True)[1] for row in pool
    ]
    order = list(range(len(pool)))
    if c["strategy"] == "random":
        random.Random(c["seed"]).shuffle(order)
    elif c["strategy"] == "entropy":
        order.sort(key=lambda i: (-entropy[i], i))
    else:
        order.sort(key=lambda i: (margin[i], i))
    selected = order[: c["budget"]]
    return _result(
        c,
        {
            "selected_count": len(selected),
            "selected_mean_entropy": sum(entropy[i] for i in selected) / len(selected),
        },
        [
            _table(
                "امتیاز تمام نمونه‌های بی‌برچسب",
                ["نمونه", "p0", "p1", "p2", "آنتروپی", "حاشیه", "انتخاب شد"],
                [
                    [i] + row + [entropy[i], margin[i], i in selected]
                    for i, row in enumerate(pool)
                ],
            ),
            _table(
                "ترتیب درخواست برچسب",
                ["اولویت", "نمونه"],
                [[j + 1, i] for j, i in enumerate(selected)],
            ),
        ],
        notes=[
            "این آزمایش فقط انتخاب از مخزن را انجام می‌دهد؛ برچسب انسانی دریافت و مدل بازآموزی نمی‌شود. عدم‌قطعیت زیاد می‌تواند ناشی از دادهٔ خراب باشد؛ افزایش دقت تضمین نمی‌شود."
        ],
    )


def discounted_returns(rewards, discount):
    out, total = [], 0.0
    for reward in reversed(rewards):
        total = reward + discount * total
        out.append(total)
    return list(reversed(out))


def _reinforcement(c):
    # States 0/1 plus terminal 2; actions advance(0) or return(1).
    transitions = [[(1, 0.0), (0, -0.1)], [(2, 1.0), (0, 0.0)]]
    values, curve = [0.0, 0.0, 0.0], []
    for step in range(c["iterations"]):
        q = [
            [reward + c["discount"] * values[nxt] for nxt, reward in actions]
            for actions in transitions
        ]
        updated = [max(row) for row in q] + [0.0]
        curve.append((step + 1, max(abs(a - b) for a, b in zip(updated, values))))
        values = updated
    q = [
        [reward + c["discount"] * values[nxt] for nxt, reward in actions]
        for actions in transitions
    ]
    returns = discounted_returns([0.0, 1.0], c["discount"])
    # Fixed two-action episode under initial uniform policy, separate from V*.
    new_logits = [
        [c["learning_rate"] * g * 0.5, -c["learning_rate"] * g * 0.5] for g in returns
    ]
    return _result(
        c,
        {
            "value_state_0": values[0],
            "value_state_1": values[1],
            "last_value_change": curve[-1][1],
            "episode_return": returns[0],
            "updated_action0_probability": softmax(new_logits[0])[0],
        },
        [
            _table(
                "بلمن بهینه با مدل معلوم",
                ["حالت", "V", "Q پیشروی", "Q بازگشت", "عمل حریصانه"],
                [
                    [
                        i,
                        values[i],
                        q[i][0],
                        q[i][1],
                        max(range(2), key=lambda a: q[i][a]),
                    ]
                    for i in range(2)
                ],
            ),
            _table(
                "یک گام REINFORCE برای مسیر ثابت",
                [
                    "زمان",
                    "پاداش",
                    "بازده آینده",
                    "لوجیت عمل ۰ جدید",
                    "لوجیت عمل ۱ جدید",
                ],
                [[i, [0, 1][i], returns[i]] + new_logits[i] for i in range(2)],
            ),
        ],
        [_series("تغییر ارزش در تکرار بلمن", curve, y="بیشینهٔ تغییر ارزش")],
        [
            "بخش بلمن، مکمل مستقل با مدل انتقال معلوم و حالت پایانی با ارزش صفر است. بخش گرادیان سیاست، یک مسیر از پیش تعیین‌شده با دو عمل پیشروی را از سیاست یکنواخت با گرادیان G∇logπ به‌روز می‌کند؛ اجرای بازی یا برآورد عملکرد نیست. هیچ baseline یا جملهٔ آنتروپی استفاده نشده است."
        ],
    )


def ctc_collapse(path, blank="_"):
    merged = [v for i, v in enumerate(path) if i == 0 or v != path[i - 1]]
    return [v for v in merged if v != blank]


def ctc_probability(probabilities, target, symbols=("_", "a", "b")):
    extended = [0]
    for token in target:
        if token not in symbols[1:]:
            raise ValueError("CTC target must contain nonblank symbols")
        extended.extend([symbols.index(token), 0])
    alpha = [0.0] * len(extended)
    alpha[0] = 1.0
    for row in probabilities:
        if (
            len(row) != len(symbols)
            or any(not math.isfinite(p) or p < 0 for p in row)
            or not math.isclose(sum(row), 1.0, abs_tol=1e-10)
        ):
            raise ValueError("Each CTC row must be a probability distribution")
        nxt = []
        for j, symbol in enumerate(extended):
            total = alpha[j] + (alpha[j - 1] if j else 0.0)
            if j >= 2 and symbol != 0 and symbol != extended[j - 2]:
                total += alpha[j - 2]
            nxt.append(total * row[symbol])
        alpha = nxt
    return alpha[-1] + (alpha[-2] if len(alpha) > 1 else 0.0)


def word_error(reference, hypothesis):
    r, h = reference.split(), hypothesis.split()
    if not r:
        raise ValueError("Reference must contain at least one word")
    dp = list(range(len(h) + 1))
    for i, a in enumerate(r, 1):
        new = [i]
        for j, b in enumerate(h, 1):
            new.append(min(new[-1] + 1, dp[j] + 1, dp[j - 1] + (a != b)))
        dp = new
    return dp[-1], dp[-1] / len(r)


def dft_power(frame):
    n = len(frame)
    return [
        abs(
            sum(
                value
                * complex(
                    math.cos(-2 * math.pi * k * j / n),
                    math.sin(-2 * math.pi * k * j / n),
                )
                for j, value in enumerate(frame)
            )
        )
        ** 2
        / n**2
        for k in range(n)
    ]


def _speech(c):
    n, k = c["frame_size"], c["frequency_bin"]
    waveform = [math.sin(2 * math.pi * k * i / n) for i in range(2 * n)]
    frame = waveform[:n]
    windowed = [
        v * (0.5 - 0.5 * math.cos(2 * math.pi * i / (n - 1)))
        for i, v in enumerate(frame)
    ]
    raw, power = dft_power(frame), dft_power(windowed)
    b = c["blank_probability"]
    probabilities = [
        [b, (1 - b) * 0.8, (1 - b) * 0.2],
        [b, (1 - b) * 0.7, (1 - b) * 0.3],
        [b, (1 - b) * 0.1, (1 - b) * 0.9],
        [b, (1 - b) * 0.2, (1 - b) * 0.8],
    ]
    path = [
        ["_", "a", "b"][max(range(3), key=lambda i: row[i])] for row in probabilities
    ]
    probability = ctc_probability(probabilities, ["a", "b"])
    edits, wer = word_error(c["reference"], c["hypothesis"])
    return _result(
        c,
        {
            "rectangular_peak_bin": max(range(n // 2 + 1), key=lambda i: raw[i]),
            "frame_energy": sum(x * x for x in frame),
            "ctc_target_ab_probability": probability,
            "ctc_target_ab_loss": -math.log(probability),
            "word_edit_distance": edits,
            "word_error_rate": wer,
            "frame_count_50_percent_overlap": 3,
        },
        [
            _table(
                "قاب‌های هم‌پوشان",
                ["شماره", "آغاز", "پایان غیرشامل"],
                [[i, i * (n // 2), i * (n // 2) + n] for i in range(3)],
            ),
            _table(
                "احتمال نمادهای CTC",
                ["زمان", "blank", "a", "b"],
                [[i] + row for i, row in enumerate(probabilities)],
            ),
            _table(
                "رمزگشایی حریصانه",
                ["مسیر", "پس از ادغام تکرار و حذف خالی"],
                [[" ".join(path), "".join(ctc_collapse(path))]],
            ),
        ],
        [
            _series("موج قاب اول", list(enumerate(frame)), "نمونه", "دامنه"),
            _series(
                "طیف توان قاب با پنجرهٔ Hann",
                list(enumerate(power[: n // 2 + 1])),
                "شمارهٔ بسامد",
                "توان |DFT|²/N²",
            ),
        ],
        [
            "موج سینوسی مصنوعی است؛ بسامد با شمارهٔ bin بیان می‌شود، نه هرتز بدون نرخ نمونه‌برداری. طیف یک‌طرفه برای نمایش دو برابر نشده است. CTC احتمال همهٔ مسیرهای سازگار با ab را با برنامه‌ریزی پویا جمع می‌کند؛ مسیر حریصانه الزاماً محتمل‌ترین متن نیست. WER پس از جداسازی با فاصله و بدون یکسان‌سازی حروف/نشانه‌ها محاسبه می‌شود."
        ],
    )


def _transfer(c):
    xs = [-1.0, -0.5, 0.5, 1.0]
    rows, curves = [], []
    for freeze in (True, False):
        feature, head = 0.5, 1.0
        curve = []
        for step in range(c["steps"] + 1):
            errors = [head * feature * x - c["target_slope"] * x for x in xs]
            loss = sum(e * e for e in errors) / len(xs)
            curve.append((step, loss))
            if step < c["steps"]:
                gh = 2 * sum(e * feature * x for e, x in zip(errors, xs)) / len(xs)
                gf = 2 * sum(e * head * x for e, x in zip(errors, xs)) / len(xs)
                head -= c["learning_rate"] * gh
                if not freeze:
                    feature -= c["learning_rate"] * gf
        rows.append(
            [
                "انجماد ویژگی" if freeze else "تنظیم هر دو وزن",
                feature,
                head,
                feature * head,
                loss,
            ]
        )
        curves.append(_series(rows[-1][0], curve))
    return _result(
        c,
        {"frozen_mse": rows[0][-1], "finetuned_mse": rows[1][-1]},
        [
            _table(
                "مقایسه با بودجهٔ گام یکسان",
                ["روش", "وزن ویژگی", "وزن سر", "شیب نهایی", "MSE"],
                rows,
            )
        ],
        curves,
        [
            "مکمل مستقل برای انتقال یادگیری: دو وزن اسکالر با مقدار آغازین یکسان، بدون بازتولید شبکهٔ ازپیش‌آموخته. برتری عمومی هیچ روش از این مثال نتیجه نمی‌شود؛ نرخ یادگیری، داده و تعداد گام اثر دارند."
        ],
    )


_HANDLERS = {
    "autoencoder": _autoencoder,
    "gan": _gan,
    "contrastive": _contrastive,
    "multitask": _multitask,
    "few-shot": _few_shot,
    "distillation": _distillation,
    "compression": _compression,
    "active-learning": _active_learning,
    "reinforcement": _reinforcement,
    "speech": _speech,
    "transfer": _transfer,
}


def run_experiment(scenario, **parameters):
    """Return finite JSON-serializable results; reject unknown/unbounded inputs."""
    if not isinstance(scenario, str) or scenario not in PRESETS:
        raise ValueError("Unknown learning strategy")
    spec = PRESETS[scenario]
    if parameters.keys() - spec["config"].keys():
        raise ValueError("Unknown parameter")
    config = dict(spec["config"], **parameters)
    for key, value in config.items():
        default = spec["config"][key]
        if key in spec["bounds"]:
            bounds = spec["bounds"][key]
            if (
                type(value) not in (int, float)
                or not math.isfinite(value)
                or not bounds["min"] <= value <= bounds["max"]
            ):
                raise ValueError(
                    f"{key}: finite value in [{bounds['min']}, {bounds['max']}] required"
                )
            if type(default) is int and type(value) is not int:
                raise ValueError(f"{key}: integer required")
        elif key in spec["choices"]:
            if not isinstance(value, str) or value not in spec["choices"][key]:
                raise ValueError(f"{key}: unknown choice")
        elif not isinstance(value, str) or len(value) > 600 or len(value.split()) > 80:
            raise ValueError(f"{key}: text limited to 600 characters and 80 words")
    result = _HANDLERS[scenario](config)
    result.update({"scenario": scenario, "title_fa": spec["title_fa"]})
    return result
