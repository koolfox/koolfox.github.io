"""Small, deterministic, untrained multimodal calculations (standard library).

Representations and weights are constructed teaching data, never real-image features.
The API is PRESETS and run_experiment(scenario, **parameters). No file/network I/O.
"""
from __future__ import annotations

import copy
import math

_TEMPERATURE = {"min": 0.25, "max": 3.0, "step": 0.25}
PRESETS = {
    "token-objectives": {
        "title_fa": "اطلاعات مجاز در پیش‌بینی علّی و پوشانده‌شده",
        "config": {"objective": "causal", "right_token": 2, "temperature": 1.0},
        "labels_fa": {"objective": "هدف پیش‌بینی", "right_token": "شناسهٔ توکنِ سمت راست", "temperature": "دمای توزیع"},
        "choices": {"objective": {"causal": "علّی: فقط سمت چپ", "masked": "پوشانده‌شده: چپ و راست"}},
        "bounds": {"right_token": {"min": 0, "max": 3, "step": 1}, "temperature": _TEMPERATURE},
    },
    "caption-sequence": {
        "title_fa": "نمرهٔ کپشن و تفاوت آموزش با تولید",
        "config": {"image_signal": 1.0, "temperature": 1.0, "max_steps": 5},
        "labels_fa": {"image_signal": "ویژگیِ تصویریِ دست‌ساخته", "temperature": "دمای توزیع", "max_steps": "حداکثر گامِ تولید"},
        "bounds": {"image_signal": {"min": -2, "max": 2, "step": 0.25}, "temperature": _TEMPERATURE, "max_steps": {"min": 1, "max": 8, "step": 1}},
    },
    "visual-question": {
        "title_fa": "تغییر سؤال و توجه به ویژگیِ تصویر",
        "config": {"question": "color", "image_variant": 0, "temperature": 1.0},
        "labels_fa": {"question": "سؤال دربارهٔ شیء سمت چپ", "image_variant": "جابه‌جایی رنگ‌های تصویرِ ساختگی", "temperature": "دمای توزیع"},
        "choices": {"question": {"color": "چه رنگی است؟", "location": "کجا قرار دارد؟"}},
        "bounds": {"image_variant": {"min": 0, "max": 1, "step": 1}, "temperature": _TEMPERATURE},
    },
    "visual-dialog": {
        "title_fa": "ارجاع در گفت‌وگو و رتبه‌بندی پاسخ‌ها",
        "config": {"include_history": True, "history_choice": 1, "temperature": 1.0},
        "labels_fa": {"include_history": "استفاده از تاریخچه", "history_choice": "شیءِ معرفی‌شده در تاریخچه", "temperature": "دمای توزیع"},
        "choices": {"history_choice": {0: "شیء قرمزِ سمت چپ", 1: "شیء آبیِ سمت راست"}},
        "bounds": {"temperature": _TEMPERATURE},
    },
}


def _number(value, name, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{name} must be finite and in [{low}, {high}]")
    return float(value)


def _integer(value, name, low, high):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f"{name} must be an integer in [{low}, {high}]")
    return value


def _choice(value, name, choices):
    if not isinstance(value, str) or value not in choices:
        raise ValueError(f"{name} must be one of {choices}")
    return value


def softmax(values, temperature=1.0):
    """Stable probability normalization, with bounded finite inputs."""
    if not isinstance(values, (list, tuple)) or not 1 <= len(values) <= 100:
        raise ValueError("values must contain 1..100 finite scores")
    temperature = _number(temperature, "temperature", 0.25, 3)
    scores = [_number(v, "score", -100, 100) / temperature for v in values]
    peak = max(scores)
    exps = [math.exp(x - peak) for x in scores]
    return [x / sum(exps) for x in exps]


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b, strict=True))


def _table(title, columns, rows):
    return {"title_fa": title, "columns": columns, "rows": rows}


def token_prediction(objective="causal", right_token=2, temperature=1.0):
    """Predict middle target id=1 in [0, 1, right], without its embedding.

    Causal: attention sees only left id=0. Masked: middle input is a zero
    MASK vector and both sides are allowed. This is one attention/readout,
    not a complete GPT or BERT, and no MLM joint likelihood is asserted.
    """
    objective = _choice(objective, "objective", ("causal", "masked"))
    right_token = _integer(right_token, "right_token", 0, 3)
    temperature = _number(temperature, "temperature", 0.25, 3)
    embeddings = [[1.0, 0.0], [0.0, 1.0], [-1.0, 0.0], [0.0, -1.0]]
    inputs = [embeddings[0], [0.0, 0.0], embeddings[right_token]]
    allowed = [0] if objective == "causal" else [0, 1, 2]
    query = [0.5, 1.0]
    scores = [_dot(query, x) / math.sqrt(2) for x in inputs]
    weights = [0.0] * 3
    for i, w in zip(allowed, softmax([scores[i] for i in allowed], temperature), strict=True):
        weights[i] = w
    context = [sum(weights[i] * inputs[i][j] for i in range(3)) for j in range(2)]
    logits = [_dot(context, emb) for emb in embeddings]
    probabilities = softmax(logits, temperature)
    return {"allowed": allowed, "inputs": inputs, "scores": scores, "attention": weights, "context": context, "logits": logits, "probabilities": probabilities, "target": 1, "nll": -math.log(probabilities[1])}


_CAPTION_WORDS = ["گربه", "پرنده", "نشست", "دوید", "EOS"]
_CAPTION_EMBEDDINGS = [0.8, -0.8, 0.3, -0.3, 0.0, 0.0]  # BOS id=5
# Fixed transition biases. All outputs are normalized, including off-path ones.
_CAPTION_BIASES = [[-2, -2, 1.4, 0.4, -0.5], [-2, -2, 0.4, 1.4, -0.5], [-2, -2, -2, -2, 2.0], [-2, -2, -2, -2, 2.0], [-2, -2, -2, -2, 2.0], [0.8, 0.8, -2, -2, -2]]


def caption_step(previous, state, image_signal, temperature=1.0):
    """Scalar tanh recurrent state and affine five-token readout; fixed weights."""
    previous = _integer(previous, "previous", 0, 5)
    state = _number(state, "state", -1, 1)
    image_signal = _number(image_signal, "image_signal", -2, 2)
    temperature = _number(temperature, "temperature", 0.25, 3)
    state = math.tanh(0.5 * state + _CAPTION_EMBEDDINGS[previous] + 0.7 * image_signal)
    weights = [0.8, -0.8, 0.3, -0.3, 0.0]
    logits = [b + w * state for b, w in zip(_CAPTION_BIASES[previous], weights, strict=True)]
    return {"state": state, "logits": logits, "probabilities": softmax(logits, temperature)}


def score_caption(tokens, image_signal=1.0, temperature=1.0):
    """Teacher-forced score for 1..8 target IDs; EOS is not silently appended."""
    if not isinstance(tokens, (list, tuple)) or not 1 <= len(tokens) <= 8:
        raise ValueError("tokens must contain 1..8 targets")
    ids = [_integer(t, "target token", 0, 4) for t in tokens]
    if 4 in ids[:-1]:
        raise ValueError("EOS may only occur at the final target position")
    state, previous, rows, probabilities = 0.0, 5, [], []
    for t, target in enumerate(ids):
        step = caption_step(previous, state, image_signal, temperature)
        state = step["state"]
        p = step["probabilities"][target]
        rows.append([t + 1, "BOS" if previous == 5 else _CAPTION_WORDS[previous], _CAPTION_WORDS[target], state, p, -math.log(p)])
        probabilities.append(p)
        previous = target
    nll = -sum(math.log(p) for p in probabilities)
    return {"rows": rows, "target_probabilities": probabilities, "sequence_probability": math.prod(probabilities), "nll_sum": nll, "nll_mean": nll / len(ids)}


def ranking_metrics(scores, target_index, relevance):
    """Single-query ranking; linear gain, full-list and VisDial positive-count cutoffs."""
    if not isinstance(scores, (list, tuple)) or not 2 <= len(scores) <= 100:
        raise ValueError("scores must have 2..100 entries")
    scores = [_number(x, "score", -100, 100) for x in scores]
    target_index = _integer(target_index, "target_index", 0, len(scores) - 1)
    if not isinstance(relevance, (list, tuple)) or len(relevance) != len(scores):
        raise ValueError("relevance must match scores")
    rel = [_number(x, "relevance", 0, 1) for x in relevance]
    if not any(rel):
        raise ValueError("at least one relevance must be positive")
    order = sorted(range(len(scores)), key=lambda i: (-scores[i], i))
    rank = order.index(target_index) + 1
    dcg = sum(rel[i] / math.log2(k + 2) for k, i in enumerate(order))
    ideal = sum(x / math.log2(k + 2) for k, x in enumerate(sorted(rel, reverse=True)))
    cutoff = sum(x > 0 for x in rel)
    truncated_dcg = sum(rel[i] / math.log2(k + 2) for k, i in enumerate(order[:cutoff]))
    return {"rank": rank, "reciprocal_rank": 1 / rank, "recall_at_1": float(rank <= 1), "recall_at_3": float(rank <= 3), "ndcg": dcg / ideal, "ndcg_visdial": truncated_dcg / ideal, "ndcg_visdial_cutoff": cutoff, "order": order}


def _token(config):
    result = token_prediction(**config)
    altered = token_prediction(**{**config, "right_token": (config["right_token"] + 1) % 4})
    return {"metrics": {"زیانِ هدف میانی": result["nll"], "احتمالِ هدف میانی": result["probabilities"][1], "تغییر بیشینه پس از عوض‌شدن توکنِ راست": max(abs(a-b) for a,b in zip(result["probabilities"],altered["probabilities"],strict=True))},
        "tables": [_table("اطلاعات مجاز برای هدف میانی", ["جایگاه", "ورودی", "مجاز", "ویژگی ۱", "ویژگی ۲", "وزن توجه"], [[i, ["توکن ۰", "MASK؛ هدف فقط در زیان", f"توکن {config['right_token']}"][i], i in result["allowed"], *result["inputs"][i], result["attention"][i]] for i in range(3)]), _table("توزیع خروجی", ["شناسهٔ توکن", "لاجیت", "احتمال", "هدف"], [[i,z,p,i==1] for i,(z,p) in enumerate(zip(result["logits"],result["probabilities"],strict=True))])],
        "assumptions_fa": ["فقط یک پیش‌بینی برای هدفِ میانیِ ثابت ۱ داریم؛ بردار خودِ هدف وارد محاسبه نمی‌شود.", "هدف علّی فقط توکنِ چپ را می‌بیند؛ هدف پوشانده‌شده چپ، بردار صفرِ MASK و راست را می‌بیند.", "بردارها و وزن‌ها دست‌ساخته و بدون آموزش‌اند؛ این یک لایهٔ توجه و سر خروجی است، نه اجرای کامل GPT یا BERT.", "زیانِ MLM یک احتمال شرطی برای جایگاهِ انتخاب‌شده است، نه احتمال مشترکِ نرمال‌شدهٔ کل جمله."]}


def _caption(config):
    signal = _number(config["image_signal"], "image_signal", -2, 2)
    temperature = _number(config["temperature"], "temperature", 0.25, 3)
    max_steps = _integer(config["max_steps"], "max_steps", 1, 8)
    # Fixed reference deliberately does not change when image controls change.
    reference = [0, 2, 4]
    scored = score_caption(reference, signal, temperature)
    previous, state, rows, ids = 5, 0.0, [], []
    for t in range(max_steps):
        step = caption_step(previous, state, signal, temperature)
        state = step["state"]
        predicted = max(range(5), key=lambda i: step["probabilities"][i])
        rows.append([t + 1, "BOS" if previous == 5 else _CAPTION_WORDS[previous], _CAPTION_WORDS[predicted], state, step["probabilities"][predicted]])
        ids.append(predicted)
        previous = predicted
        if predicted == 4:
            break
    return {"metrics": {"احتمالِ کپشنِ مرجع": scored["sequence_probability"], "زیانِ میانگینِ مرجع": scored["nll_mean"], "perplexity مرجع": math.exp(scored["nll_mean"]), "گام‌های تولیدشده": len(ids), "رسیدن به EOS": float(ids[-1] == 4), "تطابق کامل با مرجعِ ساختگی": float(ids == reference)},
        "tables": [_table("نمره‌دهی با پیشوندِ مرجع", ["گام", "ورودی قبلیِ مرجع", "هدف", "حالت", "احتمال هدف", "منفی لگاریتم"], scored["rows"]), _table("تولید greedy با پیشوند خود مدل", ["گام", "ورودی قبلیِ تولیدشده", "انتخاب", "حالت", "احتمال انتخاب"], rows)],
        "assumptions_fa": ["مرجعِ ثابت «گربه نشست EOS» است؛ عوض‌کردن ویژگیِ تصویری، مرجع را پنهانی عوض نمی‌کند.", "سلول یک حالتِ tanh با وزن‌های ثابت و جدول سوگیریِ انتقال دارد؛ این LSTM آموزش‌دیده یا کپشن‌نویس واقعی نیست.", "ویژگیِ تصویری یک عددِ دست‌ساخته است و از فایل تصویر استخراج نشده است.", "تولید در EOS یا سقف گام متوقف می‌شود؛ بریدن در سقف به معنی پایان‌یافتن جمله نیست. دما هم در توجه/خروجیِ مربوط به هر سناریو به‌صراحت اعمال می‌شود."]}


def question_prediction(question="color", image_variant=0, temperature=1.0):
    """Two region records: key=(leftness, rightness), value=(red,blue,left,right)."""
    question = _choice(question, "question", ("color", "location"))
    variant = _integer(image_variant, "image_variant", 0, 1)
    temperature = _number(temperature, "temperature", 0.25, 3)
    values = [[1-variant, variant, 1, 0], [variant, 1-variant, 0, 1]]
    attention = softmax([2.0, 0.0], temperature)  # question explicitly refers to left object
    context = [sum(attention[i] * values[i][j] for i in range(2)) for j in range(4)]
    # Question gates which attribute is relevant; inactive answer family suppressed.
    logits = [4*context[0], 4*context[1], -2.0, -2.0] if question == "color" else [-2.0, -2.0, 4*context[2], 4*context[3]]
    target = variant if question == "color" else 2
    probabilities = softmax(logits, temperature)
    return {"values": values, "attention": attention, "context": context, "logits": logits, "probabilities": probabilities, "target": target}


def _question(config):
    r = question_prediction(**config)
    names = ["قرمز", "آبی", "چپ", "راست"]
    p, y = r["probabilities"], r["target"]
    return {"metrics": {"احتمال پاسخِ مرجعِ ساختگی": p[y], "زیانِ پاسخ": -math.log(p[y]), "Brier چندکلاسه": sum((x-float(i==y))**2 for i,x in enumerate(p)), "آنتروپیِ پاسخ": -sum(x*math.log(x) for x in p)},
        "tables": [_table("دو ناحیهٔ تصویریِ دست‌ساخته", ["ناحیه", "قرمز", "آبی", "چپ", "راست", "وزن توجه"], [[i+1,*v,r["attention"][i]] for i,v in enumerate(r["values"])]), _table("پاسخ‌های شرطی به سؤال", ["پاسخ", "لاجیت", "احتمال", "هدف ساختگی"], [[names[i],r["logits"][i],p[i],i==y] for i in range(4)])],
        "assumptions_fa": ["سؤال همواره دربارهٔ شیء سمت چپ است؛ کنترل سؤال مشخص می‌کند رنگ پرسیده شده یا مکان.", "رنگ و مکان از بازنماییِ دستی می‌آیند؛ شبکهٔ بینایی یا فهم زبان طبیعی اجرا نمی‌شود.", "ضرب توجه و دروازهٔ نوع سؤال، محاسبهٔ واقعیِ همین مدل کوچک است؛ احتمال‌ها عملکرد VQA روی دادهٔ واقعی نیستند.", "Brier اینجا خطای احتمالیِ یک نمونه است؛ برای ادعای کالیبراسیون به مجموعهٔ مستقل و فراوانی‌های تجربی نیاز است."]}


def _dialog(config):
    if not isinstance(config["include_history"], bool):
        raise ValueError("include_history must be boolean")
    choice = _integer(config["history_choice"], "history_choice", 0, 1)
    temperature = _number(config["temperature"], "temperature", 0.25, 3)
    scores = [0.0, 0.0]
    if config["include_history"]:
        scores[choice] = 3.0
    attention = softmax(scores, temperature)
    # Current question: "What color is it?" History determines the referent.
    logits = [4*attention[0],4*attention[1],1.2,-1.0]
    probabilities = softmax(logits, temperature)
    relevance = [float(choice==0),float(choice==1),0.25,0.0]
    rank = ranking_metrics(logits,choice,relevance)
    names = ["قرمز است", "آبی است", "رنگی است", "نمی‌دانم"]
    return {"metrics": {"رتبهٔ پاسخ مرجع": rank["rank"], "معکوس رتبه": rank["reciprocal_rank"], "Recall@1 تک‌پرسش": rank["recall_at_1"], "Recall@3 تک‌پرسش": rank["recall_at_3"], "NDCG کل فهرست": rank["ndcg"], "NDCG با برش VisDial": rank["ndcg_visdial"], "عمق برش VisDial": rank["ndcg_visdial_cutoff"], "احتمالِ پاسخ مرجع": probabilities[choice], "زیانِ پاسخ مرجع": -math.log(probabilities[choice]), "Brier چندکلاسه": sum((p-float(i==choice))**2 for i,p in enumerate(probabilities))},
        "tables": [_table("سؤال فعلی و تاریخچه", ["جزء", "متن"], [["سؤال فعلی", "چه رنگی است؟"], ["تاریخچهٔ در دسترس", ("دربارهٔ شیء سمت چپ حرف می‌زنیم." if choice==0 else "دربارهٔ شیء سمت راست حرف می‌زنیم.") if config["include_history"] else "تاریخچه حذف شده است؛ مرجع مبهم می‌ماند."]]), _table("توجه به مرجعِ ضمیر", ["شیء", "وزن"], [["چپ: قرمز",attention[0]],["راست: آبی",attention[1]]]), _table("رتبه‌بندی گزینه‌ها", ["رتبه", "پاسخ", "لاجیت", "احتمال", "ربطِ ساختگی"], [[k+1,names[i],logits[i],probabilities[i],relevance[i]] for k,i in enumerate(rank["order"])])],
        "assumptions_fa": ["دو شیء و چهار پاسخ دست‌ساخته‌اند. تاریخچه فقط مرجعِ ضمیر را تعیین می‌کند؛ اطلاعات تصویری واقعی وارد نشده است.", "حذف تاریخچه پاسخِ مرجع را عوض نمی‌کند، فقط اطلاعات مدل را کم می‌کند. در تساوی نمره، اندیس کوچک‌تر زودتر قرار می‌گیرد.", "هر دو NDCG از gain خطیِ relevance و log2(rank+1) استفاده می‌کنند. کل فهرست همهٔ رتبه‌ها را می‌سنجد؛ برش VisDial فقط تا تعداد گزینه‌های دارای relevance مثبت است. ربط‌های ۱،۰٫۲۵ و۰ آموزشی‌اند، نه داوری واقعی.", "Recall و معکوس رتبه برای یک پرسش گزارش می‌شوند؛ میانگین‌گیری روی مجموعه‌ای از پرسش‌ها برای گزارش benchmark لازم است.", "دمای مثبت ترتیب ثابتِ لاجیت‌ها را حفظ می‌کند، اما در این مدل پیش از آن توجه به تاریخچه نیز با دما تغییر می‌کند. Brier تک‌نمونه اثباتِ کالیبراسیون نیست."]}


_HANDLERS = {"token-objectives": _token, "caption-sequence": _caption, "visual-question": _question, "visual-dialog": _dialog}


def run_experiment(scenario, **parameters):
    if not isinstance(scenario, str) or scenario not in PRESETS:
        raise ValueError("unknown scenario")
    config = copy.deepcopy(PRESETS[scenario]["config"])
    if set(parameters) - set(config):
        raise ValueError("unknown parameter")
    config.update(parameters)
    result = _HANDLERS[scenario](config)
    result.update(scenario=scenario, title_fa=PRESETS[scenario]["title_fa"], config=config)
    result["assumptions_fa"].insert(0,"همهٔ پارامترها و داده‌ها ثابت و دست‌ساخته‌اند؛ هیچ آموزش، دانلود یا ارزیابی روی دادهٔ واقعی انجام نمی‌شود.")
    return result
