"""Independent local Persian teaching decks, separate from upstream review state."""

import hashlib
import json
import re
from functools import lru_cache
from html.parser import HTMLParser

from source_catalog import ROOT, require


TERMS = {
    "شبکه‌های پیش‌خور": "Feedforward Neural Networks",
    "شبکهٔ پیش‌خور": "Feedforward Neural Network",
    "پیش‌خور": "Feedforward",
    "پیش خور": "Feedforward",
    "لایه‌های پنهان": "Hidden Layers",
    "لایهٔ پنهان": "Hidden Layer",
    "لایه پنهان": "Hidden Layer",
    "تابع فعال‌سازی": "Activation Function",
    "پس‌انتشار": "Backpropagation",
    "پرسپترون": "Perceptron",
    "بایاس": "Bias",
    "تابع زیان": "Loss Function",
    "زیان": "Loss",
    "وزن‌ها": "Weights",
    "وزن": "Weight",
    "نرخ یادگیری": "Learning Rate",
    "دادهٔ آموزش": "Training Data",
    "دادهٔ آزمون": "Test Data",
    "طبقه‌بندی": "Classification",
    "رگرسیون": "Regression",
    "دقت": "Accuracy",
    "بیش‌برازش": "Overfitting",
    "کم‌برازش": "Underfitting",
    "ابرپارامتر": "Hyperparameter",
    "پارامتر": "Parameter",
    "لایهٔ خروجی": "Output Layer",
    "لایهٔ ورودی": "Input Layer",
    "ویژگی": "Feature",
    "گرادیان": "Gradient",
    "نزول گرادیان": "Gradient Descent",
    "مرز تصمیم": "Decision Boundary",
    "اعتبارسنجی": "Validation",
    "تعمیم": "Generalization",
    "برازش": "Fitting",
    "منظم‌سازی": "Regularization",
    "توقف زودهنگام": "Early Stopping",
    "افزایش داده": "Data Augmentation",
    "کانولوشن": "Convolution",
    "پردازش زبان طبیعی": "Natural Language Processing",
    "تعبیهٔ واژه": "Word Embedding",
    "خودتوجهی": "Self-Attention",
    "توجه چندسر": "Multi-Head Attention",
    "توجه": "Attention",
    "ترنسفورمر": "Transformer",
    "شبکهٔ بازگشتی": "Recurrent Neural Network",
    "حالت پنهان": "Hidden State",
    "انتقال یادگیری": "Transfer Learning",
    "یادگیری خودنظارتی": "Self-Supervised Learning",
    "یادگیری چندوظیفه‌ای": "Multi-Task Learning",
    "یادگیری کم‌نمونه": "Few-Shot Learning",
    "یادگیری بی‌نمونه": "Zero-Shot Learning",
    "یادگیری تقویتی": "Reinforcement Learning",
    "فشرده‌سازی مدل": "Model Compression",
    "تقطیر دانش": "Knowledge Distillation",
    "کوانتیزه‌سازی": "Quantization",
    "هرس": "Pruning",
    "خودرمزگذار": "Autoencoder",
    "بازنمایی": "Representation",
    "تشخیص شیء": "Object Detection",
    "بخش‌بندی معنایی": "Semantic Segmentation",
    "شرح تصویر": "Image Captioning",
    "پرسش‌وپاسخ بصری": "Visual Question Answering",
    "گفت‌وگوی بصری": "Visual Dialog",
    "تعبیه": "Embedding",
}
TERM_PATTERN = re.compile(
    r"(?<![\w\u200c])(?:"
    + "|".join(re.escape(t) for t in sorted(TERMS, key=len, reverse=True))
    + r")(?![\w\u200c])"
)


class BilingualSlide(HTMLParser):
    """Annotate first mentions without rewriting code, math or HTML attributes."""

    protected = {"pre", "code", "textarea", "script", "style", "math", "svg", "h1"}

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output, self.seen, self.depth = [], set(), 0

    def handle_starttag(self, tag, attrs):
        self.output.append(self.get_starttag_text())
        if tag in self.protected:
            self.depth += 1

    def handle_startendtag(self, tag, attrs):
        self.output.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        self.output.append(f"</{tag}>")
        if tag in self.protected:
            self.depth -= 1

    def handle_data(self, value):
        def annotate(match):
            term = match.group()
            english = TERMS[term]
            if english in self.seen:
                return term
            self.seen.add(english)
            if value[match.end() :].lstrip().lower().startswith(f"({english.lower()})"):
                return term
            return term + f' <bdi dir="ltr">({english})</bdi>'

        self.output.append(value if self.depth else TERM_PATTERN.sub(annotate, value))

    def handle_entityref(self, name):
        self.output.append(f"&{name};")

    def handle_charref(self, name):
        self.output.append(f"&#{name};")


def bilingual_slide(markup):
    parser = BilingualSlide()
    visible = re.sub(r"<[^>]+>", "", markup)
    parser.seen.update(
        english
        for english in TERMS.values()
        if re.search(r"\(" + re.escape(english) + r"\)", visible, re.IGNORECASE)
    )
    parser.feed(markup)
    return "".join(parser.output)


def formula_html(unit, root=ROOT):
    cache = json.loads((root / "content/slides/math/spring-2022.json").read_text())
    record = cache["sessions"][unit["session_id"]]
    require(
        record["latex_sha256"]
        == hashlib.sha256(unit["formula_latex"].encode()).hexdigest(),
        "Stale LaTeX: run npm ci --prefix deep-learning/math-tools, then npm run --prefix deep-learning/math-tools render",
    )
    return record["html"]


@lru_cache(maxsize=4)
def original_slide_files(root=ROOT):
    """Only visually licensed, byte-verified originals can become local references."""
    manifest = json.loads(
        (root / "data/metadata/spring-2022-slide-identity.json").read_text()
    )
    files = {}
    for record in manifest["records"]:
        relative = record.get("local_file")
        if not relative:
            continue
        require(
            relative.startswith("assets/danna/spring-2022/")
            and ".." not in relative.split("/"),
            "Invalid original-slide path",
        )
        path = root / relative
        require(
            not any(p.is_symlink() for p in (path, *path.parents))
            and hashlib.sha256(path.read_bytes()).hexdigest() == record["sha256"],
            "Original-slide bytes differ from the reviewed source",
        )
        files[record["url"]] = (record["sha256"], "/deep-learning/" + relative)
    return files


def original_slide_url(source, root=ROOT):
    if isinstance(source, str):
        local = original_slide_files(root).get(source)
        return local[1] if local else source
    local = original_slide_files(root).get(source["url"])
    return local[1] if local and local[0] == source["sha256"] else source["url"]


def load_slides(term_id, root=ROOT):
    path = root / f"content/slides/{term_id}.json"
    if not path.exists():
        return {}, {}
    document = json.loads(path.read_text())
    require(
        document["schema_version"] == 1 and document["term_id"] == term_id,
        "Invalid local deck identity",
    )
    require(document["license"] == "MIT", "Independent deck license missing")
    require(
        document["supervisor_fa"] and document["source_policy"], "Deck identity missing"
    )
    rows = json.loads((root / f"data/metadata/{term_id}.json").read_text())["term"][
        "schedule"
    ]
    expected = {r["id"] for r in rows if r["slides"]}
    result = {}
    for unit in document["sessions"]:
        identity = unit["session_id"]
        require(
            identity in expected and identity not in result,
            "Duplicate or non-teaching deck",
        )
        for key in ("intro_fa", "formula", "formula_explanation_fa", "pitfall_fa"):
            require(
                isinstance(unit[key], str) and unit[key].strip(),
                f"Empty slide field: {key}",
            )
        require(
            len(unit["ideas_fa"]) == 3 and all(unit["ideas_fa"]),
            "Deck needs three topic-specific ideas",
        )
        result[identity] = unit
    require(set(result) == expected, "Every slide lesson needs a local Persian deck")
    return document, result
