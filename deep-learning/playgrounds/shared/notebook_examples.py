"""Small commented notebook entry points into the same three native engines."""

import ast


def configuration_cell(source):
    lines = source.splitlines(keepends=True)
    tree = ast.parse(source)
    for statement in tree.body:
        if isinstance(statement, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "CONFIG"
            for target in statement.targets
        ):
            return "# یک عامل را تغییر بده و بقیه را ثابت نگه دار.\n" + "".join(
                lines[statement.lineno - 1:statement.end_lineno]
            )
    raise ValueError("The experiment needs a CONFIG dictionary")


def notebook_for_lab(lab, directory):
    cells = [{"title": "تنظیمات", "source": configuration_cell((directory / "experiment.py").read_text())}]
    if lab == "convolution":
        cells += [
            {"title": "عملیات", "source": "# تابع اعمال فیلتر روی تصویر.\nfrom experiment import calculate\n"},
            {"title": "محاسبه", "source": "# فیلتر، فعال‌سازی و تجمیع با همین تنظیمات محاسبه می‌شوند.\ncalculation = calculate(CONFIG)\n# این آزمایش آموزش وزن ندارد.\nprint(\"فیلتر روی تصویر اعمال شد\")\n"},
            {"title": "خروجی", "source": "# فقط سطر اول را گزارش می‌کنیم؛ همهٔ خانه‌ها در نمودار در دسترس‌اند.\noutput = calculation[\"activated\"]\nresult = {\n    \"rows\": len(output),  # تعداد سطرهای خروجی\n    \"columns\": len(output[0]),  # تعداد ستون‌ها\n    \"first_row\": output[0],  # خروجی پس از فعال‌سازی\n}\n"},
        ]
        files = ["experiment.py", "convolution_lab.py"]
        quizzes = [
            ("یک فیلتر ۳×۳ تک‌کاناله با یک بایاس چند پارامتر دارد؟", ["۹", "۱۰", "۶۴"], 1, "۹ وزن و یک بایاس داریم؛ وزن‌ها میان موقعیت‌های تصویر مشترک‌اند."),
            ("ورودی ۸×۸، فیلتر ۳×۳، گام ۲ و حاشیهٔ صفر چه خروجی‌ای می‌دهد؟", ["۶×۶", "۴×۴", "۳×۳"], 2, "floor((8−3)/2)+1 = 3 برای هر بُعد."),
            ("ReLU با مقدار منفی چه می‌کند؟", ["آن را صفر می‌کند", "علامتش را مثبت می‌کند", "وزن فیلتر را آموزش می‌دهد"], 0, "ReLU(x)=max(0,x)؛ در این آزمایش وزن فیلتر دستی است."),
        ]
    elif lab in {"neuron-xor", "network-playground"}:
        cells += [
            {"title": "ساخت مدل", "source": "# ساخت مدل با وزن‌های اولیه.\nfrom experiment import create_run, train_epochs\n# **CONFIG کلیدهای دیکشنری را به ورودی‌های نام‌دار تابع می‌دهد.\nexperiment = create_run(**CONFIG)\nprint(\"مدل از بذر انتخاب‌شده ساخته شد\")\n"},
            {"title": "آموزش", "source": "# تعداد دوره‌ها را تغییر بده؛ هر دوره یک گذر کامل از آموزش است.\nepochs = 5\n# به‌روزرسانی وزن‌ها در هر دوره.\ntrain_epochs(experiment, epochs)\nprint(\"دورهٔ فعلی:\", experiment.epoch)\n"},
        ]
        if lab == "network-playground":
            report = "# وضعیت همین مدل را می‌خوانیم؛ آزمون نهایی هنوز باز نشده است.\nstate = experiment.snapshot()\nresult = {\n    \"epoch\": state[\"epoch\"],  # تعداد گذرها از آموزش\n    \"train_loss\": state[\"train\"][\"loss\"],  # خطای آموزش\n    \"validation_loss\": state[\"validation\"][\"loss\"],  # خطای دادهٔ اعتبارسنجی\n}\n"
            files = ["experiment.py", "network_playground.py"]
            quizzes = [
                ("وقتی تعداد لایه‌های پنهان صفر است، خروجی این مدل چه فعال‌سازی‌ای دارد؟", ["ReLU", "سیگموید (Sigmoid)", "tanh"], 1, "فعال‌سازی پنهان غیرفعال است؛ خروجی طبقه‌بندی همچنان سیگموید است."),
                ("کدام مجموعه برای انتخاب معماری مناسب است؟", ["آزمون نهایی، پس از هر تغییر", "فقط آموزش", "اعتبارسنجی (Validation)"], 2, "انتخاب با اعتبارسنجی انجام می‌شود؛ ارزیابی نهاییِ آزمون آموزش این اجرا را می‌بندد."),
                ("نرخ یادگیری بزرگ‌تر چه معنایی دارد؟", ["گام بزرگ‌تر؛ کاهش زیان تضمین نیست", "همیشه آموزش بهتر", "لایهٔ پنهان بیشتر"], 0, "اندازهٔ گام پارامترها بیشتر می‌شود؛ منحنی زیان ممکن است ناپایدار شود."),
            ]
        else:
            report = "# خواندن دوره، زیان و پیش‌بینی‌های مدل.\nstate = experiment.snapshot()\nresult = {\n    \"epoch\": state[\"epoch\"],  # تعداد دوره‌ها\n    \"loss\": state[\"loss\"],  # نوع زیان در کنار نمودار نوشته شده است\n    \"predictions\": state[\"predictions\"],  # کلاس چهار ورودی\n}\n"
            files = ["experiment.py", "live_training.py", "logic_gates.py"]
            quizzes = [
                ("یک پرسپترون خطی می‌تواند XOR را دقیق جدا کند؟", ["بله، فقط زمان بیشتری لازم دارد", "خیر؛ XOR خطی جداشدنی نیست", "بله، با تغییر بذر همیشه"], 1, "افزایش زمان آموزش محدودیت مرز خطی را برطرف نمی‌کند."),
                ("دقت روی چهار ردیف جدول درستی چه چیزی را نشان می‌دهد؟", ["تعمیم به همهٔ داده‌های واقعی", "اعتبارسنجی مستقل", "برازش همین چهار نمونه"], 2, "تمام چهار ردیف در آموزش استفاده شده‌اند؛ آزمون جداگانه‌ای وجود ندارد."),
                ("گام گرادیان کدام است؟", ["وزن منهای نرخ یادگیری ضرب در گرادیان", "وزن به‌اضافهٔ گرادیان، همیشه", "فقط تغییر بایاس، برای همهٔ مدل‌ها"], 0, "برای کمینه‌کردن زیان، در خلاف جهت گرادیان حرکت می‌کنیم."),
            ]
        cells.append({"title": "خروجی", "source": report})
    else:
        raise ValueError("Unknown notebook laboratory")
    return {"schema_version": 1, "lab": lab, "cells": cells, "source_files": files,
            "questions": [{"prompt": p, "options": o, "correct": c, "explanation": e}
                          for p, o, c, e in quizzes]}
