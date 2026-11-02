"""Small, lazy browser entry points for verified released source models."""

from html import escape
import json
from pathlib import Path


def build_model_pages(root, output, asset_revision=""):
    root, output = Path(root), Path(output)
    models = json.loads((root / "models/source-models.json").read_text())["models"]
    written = []
    for model in models:
        identity = model["id"]
        if not identity or any(
            c not in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in identity
        ):
            raise ValueError("Invalid model route")
        target = output / "models" / identity / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(model_page(model, asset_revision))
        written.append(target)
    return written


def model_page(model, revision=""):
    identity, title = escape(model["id"], quote=True), escape(model["title_fa"])
    revision = escape(str(revision), quote=True)
    return f'''<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · دیپ لرنینگ</title>
<link rel="stylesheet" href="/deep-learning/assets/course.css">
<link rel="stylesheet" href="/deep-learning/assets/source-model-app.css?v={revision}">
<script type="module" src="/deep-learning/assets/source-model-app.js?v={revision}"></script>
</head><body class="model-app" data-model-id="{identity}">
<header><h1>{title}</h1><p data-architecture></p></header>
<main><form data-model-form><fieldset data-inputs><legend>ورودی</legend><div data-input-controls></div></fieldset>
<p class="model-input-note" data-input-note></p>
<div class="model-actions"><button class="primary" type="submit" data-run disabled>بارگیری و اجرا</button><button type="button" data-cancel hidden>لغو</button><button type="button" data-release hidden>آزادسازی مدل</button></div>
<p class="model-size" data-download-size></p>
<div class="model-progress" data-progress-region hidden><progress aria-label="پیشرفت بارگیری" data-progress></progress><p role="status" data-progress-text></p></div>
<p class="model-error" role="alert" data-error hidden></p></form>
<section class="model-results" aria-labelledby="results-title"><h2 id="results-title">پیش‌بینی مدل</h2><p data-empty>ورودی را انتخاب کن و مدل را اجرا کن.</p>
<div data-results></div><p class="model-agreement" data-agreement hidden></p><p class="model-device" data-device></p>
<details data-tokens-panel hidden><summary>توکن‌های ورودی</summary><p class="model-tokens" dir="ltr" data-tokens></p></details>
</section></main><noscript>برای اجرای مدل، جاوااسکریپت مرورگر را فعال کن.</noscript></body></html>'''
