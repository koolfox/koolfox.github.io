"""Inspect actual Python cross-correlation, activation and pooling arithmetic."""

import json
import math
import sys
from pathlib import Path

from shiny import App, reactive, render, ui

HERE = Path(__file__).parent
engine_path = HERE.parents[1] / "python"
if engine_path.is_dir():
    sys.path.insert(0, str(engine_path))

from experiment import CONFIG, calculate

FILTERS = {
    "vertical": [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
    "horizontal": [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
    "average": [[1 / 9] * 3 for _ in range(3)],
    "identity": [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
    "laplacian": [[0, 1, 0], [1, -4, 1], [0, 1, 0]],
}


def number(value):
    return f"{value:.3g}" if value else "0"


def matrix_table(
    matrix, label, selected=None, highlighted=None, padding=0, buttons=False
):
    rows = []
    for r, row in enumerate(matrix):
        cells = []
        for c, value in enumerate(row):
            classes = []
            if selected == (r, c):
                classes.append("selected")
            if highlighted and (r, c) in highlighted:
                classes.append("patch")
            if padding and (
                r < padding
                or c < padding
                or r >= len(matrix) - padding
                or c >= len(row) - padding
            ):
                classes.append("padded")
            title = f"سطر {r + 1}، ستون {c + 1}: {number(value)}"
            content = (
                ui.tags.button(
                    number(value),
                    type="button",
                    data_output_row=str(r),
                    data_output_column=str(c),
                    aria_label=title,
                    aria_pressed="true" if selected == (r, c) else "false",
                )
                if buttons
                else ui.tags.span(number(value), title=title)
            )
            cells.append(ui.tags.td(content, class_=" ".join(classes)))
        rows.append(ui.tags.tr(*cells))
    return ui.tags.div(
        ui.tags.table(
            ui.tags.caption(label), ui.tags.tbody(*rows), class_="matrix", dir="ltr"
        ),
        class_="matrix-scroll",
        role="region",
        aria_label=label,
        tabindex="0",
    )


app_ui = ui.page_fluid(
    ui.tags.head(
        ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
        ui.tags.link(rel="stylesheet", href="lab.css"),
        ui.tags.link(rel="stylesheet", href="convolution.css"),
        ui.tags.script(src="lab.js", defer=True),
    ),
    ui.tags.main(
        ui.tags.header(
            ui.tags.a(
                "بازگشت به درس یادگیری ژرف", href="/deep-learning/", target="_top"
            ),
            ui.h1("یک فیلتر، چندین جای تصویر"),
            ui.p(
                "خانه‌ای از خروجی را انتخاب کن؛ ناحیهٔ ورودی و همهٔ ضرب‌های سازندهٔ آن را ببین. سپس گام، حاشیه یا فیلتر را تغییر بده و نتیجه را پیش‌بینی کن."
            ),
        ),
        ui.tags.div(
            ui.input_select(
                "pattern",
                "تصویر مصنوعی ۸ × ۸",
                {
                    "vertical": "لبهٔ عمودی",
                    "horizontal": "لبهٔ افقی",
                    "diagonal": "قطر",
                    "checker": "شطرنجی",
                    "square": "مربع مرکزی",
                },
                selected=CONFIG["pattern"],
            ),
            ui.input_select(
                "filter",
                "فیلتر آغازین",
                {
                    "custom": "هستهٔ تعریف‌شده در کد",
                    "vertical": "اختلاف چپ و راست",
                    "horizontal": "اختلاف بالا و پایین",
                    "average": "میانگین ۹ خانه",
                    "identity": "کپی خانهٔ مرکزی",
                    "laplacian": "لاپلاسین",
                },
                selected="custom",
            ),
            ui.input_select(
                "stride",
                "گام فیلتر",
                {"1": "۱", "2": "۲", "3": "۳"},
                selected=str(CONFIG["stride"]),
            ),
            ui.input_select(
                "padding",
                "حاشیهٔ صفر در هر طرف",
                {"0": "۰", "1": "۱", "2": "۲"},
                selected=str(CONFIG["padding"]),
            ),
            ui.input_numeric(
                "bias", "بایاس", CONFIG["bias"], min=-10, max=10, step=0.1
            ),
            ui.input_select(
                "pooling",
                "تجمیع پس از فعال‌سازی",
                {
                    "none": "بدون pooling",
                    "max": "بیشینهٔ ۲ × ۲، گام ۲",
                    "average": "میانگین ۲ × ۲، گام ۲",
                },
                selected=CONFIG["pooling"],
            ),
            class_="controls configuration",
        ),
        ui.tags.div(
            ui.input_checkbox(
                "relu", "ReLU پس از فیلتر: منفی‌ها صفر شوند", CONFIG["relu"]
            ),
            ui.input_checkbox(
                "flip", "چرخاندن ۱۸۰ درجهٔ هسته برای convolution ریاضی", CONFIG["flip"]
            ),
            class_="operation-options",
        ),
        ui.tags.details(
            ui.tags.summary("ویرایش ۹ وزن فیلتر"),
            ui.p(
                "فیلتر آغازین، این عددها را پر می‌کند؛ سپس می‌توانی هر وزن را مستقل عوض کنی. همین ۹ وزن در همهٔ جایگاه‌ها استفاده می‌شوند.",
                class_="caption",
            ),
            ui.tags.div(
                *(
                    ui.input_numeric(
                        f"w{r}{c}",
                        f"w[{r + 1},{c + 1}]",
                        CONFIG["kernel"][r][c],
                        min=-10,
                        max=10,
                        step=0.1,
                    )
                    for r in range(3)
                    for c in range(3)
                ),
                class_="kernel-controls",
                dir="ltr",
            ),
        ),
        ui.tags.p(ui.output_text("status", inline=True), role="status"),
        ui.output_ui("readout"),
        ui.tags.div(
            ui.input_numeric("cell_row", "سطر خروجی انتخابی", 1, min=1, max=6, step=1),
            ui.input_numeric(
                "cell_column", "ستون خروجی انتخابی", 1, min=1, max=6, step=1
            ),
            ui.input_action_button("next_cell", "خانهٔ بعدی", class_="primary"),
            class_="selection-controls",
        ),
        ui.p(
            "شماره‌ها از ۱ شروع می‌شوند. روی خانهٔ خروجی هم می‌توانی کلیک کنی. برای جدول بزرگ، ناحیهٔ جدول را افقی حرکت بده.",
            class_="caption",
        ),
        ui.tags.div(
            ui.tags.section(ui.h2("ورودی و پنجرهٔ فعال"), ui.output_ui("input_matrix")),
            ui.tags.section(
                ui.h2("خروجی فیلتر، پیش از ReLU"), ui.output_ui("output_matrix")
            ),
            ui.tags.section(ui.h2("فعال‌سازی و تجمیع"), ui.output_ui("final_matrix")),
            class_="operation-grid",
        ),
        ui.tags.section(
            ui.h2("این خانه چگونه محاسبه شد؟"),
            ui.output_ui("calculation"),
        ),
        ui.tags.section(
            ui.h2("گام، حاشیه و اندازهٔ خروجی"),
            ui.p(
                "برای هر بُعد: اندازهٔ خروجی برابر ",
                ui.tags.bdi("floor((N + 2P − K) / S) + 1", dir="ltr"),
                " است. اینجا ",
                ui.tags.bdi("K = 3", dir="ltr"),
                "؛ قسمت اعشاری کنار گذاشته می‌شود.",
            ),
            ui.p(
                "یک کانال ورودی و یک فیلتر داریم: ۹ وزن و یک بایاس، در مجموع ۱۰ عدد قابل تنظیم. بزرگ‌تر شدن تصویر، تعداد این وزن‌ها را زیاد نمی‌کند. شمار ضرب‌ها مربوط به محاسبهٔ مستقیم همهٔ خانه‌هاست و ضرب در صفرهای حاشیه را هم می‌شمارد؛ شمار پارامتر با هزینهٔ محاسبه یکی نیست."
            ),
            ui.p(
                "در CNN معمولاً نام convolution برای cross-correlation بدون چرخاندن هسته استفاده می‌شود. با گزینهٔ چرخاندن، تفاوت ریاضی را روی فیلتر نامتقارن بررسی کن. pooling این آزمایش حاشیه ندارد؛ پنجرهٔ ناقص انتهایی کنار گذاشته می‌شود."
            ),
        ),
        ui.tags.section(
            ui.h2("سه تمرین کوتاه"),
            ui.tags.ol(
                ui.tags.li(
                    "تصویر لبهٔ عمودی و فیلتر اختلاف چپ و راست را انتخاب کن. پیش از بازکردن محاسبه، پاسخ خانهٔ کنار لبه را حساب کن."
                ),
                ui.tags.li(
                    "حاشیه را از صفر به یک تغییر بده. آیا تعداد وزن‌ها تغییر کرد؟ اندازهٔ خروجی و تعداد ضرب‌ها چطور؟"
                ),
                ui.tags.li(
                    "فیلتر لاپلاسین را با بایاس منفی اجرا کن. پاسخ بیشینه‌گیری با و بدون ReLU را مقایسه کن؛ چرا padding صفر در max pooling با دادهٔ منفی نتیجه را عوض می‌کند؟"
                ),
            ),
            ui.p(
                "این تمرین، عبور داده از فیلتر انتخابی را محاسبه می‌کند. وزن‌ها با داده آموزش نمی‌بینند؛ طبقه‌بندی تصویر و آموزش CNN در آزمایش مستقل بررسی می‌شوند.",
                class_="caption",
            ),
        ),
        ui.tags.div(
            ui.download_button("experiment", "دریافت محاسبه و تنظیمات"),
            class_="actions",
        ),
        ui.tags.details(
            ui.tags.summary("کد و مرجع تعریف عملیات"),
            ui.p(
                ui.tags.a(
                    "موتور مستقل پایتون",
                    href="/deep-learning/python/convolution_lab.py",
                    target="_blank",
                )
            ),
            ui.p(
                ui.tags.a(
                    "تعریف Conv2d در PyTorch",
                    href="https://docs.pytorch.org/docs/2.14/generated/torch.nn.Conv2d.html",
                    target="_blank",
                    rel="noopener",
                )
            ),
            ui.p(
                ui.tags.a(
                    "تعریف MaxPool2d در PyTorch",
                    href="https://docs.pytorch.org/docs/2.14/generated/torch.nn.MaxPool2d.html",
                    target="_blank",
                    rel="noopener",
                )
            ),
        ),
        ui.tags.footer("محاسبهٔ زندهٔ پایتون · تصویر مصنوعی و تمرین تألیفی مستقل"),
        class_="lab-shell",
        dir="rtl",
        lang="fa",
    ),
    title="کارگاه آموزشی دیپ لرنینگ",
)


def server(input, output, session):
    @reactive.effect
    @reactive.event(input.filter)
    def choose_filter():
        if input.filter() == "custom":
            return
        for r, row in enumerate(FILTERS[input.filter()]):
            for c, value in enumerate(row):
                ui.update_numeric(f"w{r}{c}", value=value)

    @reactive.calc
    def snapshot():
        try:
            kernel = [[float(input[f"w{r}{c}"]()) for c in range(3)] for r in range(3)]
            bias = float(input.bias())
            if (
                any(not math.isfinite(v) or abs(v) > 10 for row in kernel for v in row)
                or not math.isfinite(bias)
                or abs(bias) > 10
            ):
                raise ValueError("Weights and bias must be finite and bounded")
            indices = (input.cell_row(), input.cell_column())
            if any(v is None or int(v) != v or v < 1 for v in indices):
                raise ValueError("Cell indices must be positive integers")
            stride, padding = int(input.stride()), int(input.padding())
            if stride not in (1, 2, 3) or padding not in (0, 1, 2):
                raise ValueError("Unsupported stride or padding")
            mode = input.pooling()
            if mode not in ("none", "max", "average"):
                raise ValueError("Unsupported pooling")
            config = {
                "pattern": input.pattern(),
                "kernel": kernel,
                "bias": bias,
                "stride": stride,
                "padding": padding,
                "flip": input.flip(),
                "relu": input.relu(),
                "pooling": mode,
            }
            result = calculate(config)
            activated = result["activated"]
            selected = [
                min(int(indices[0]) - 1, len(activated) - 1),
                min(int(indices[1]) - 1, len(activated[0]) - 1),
            ]
            return {
                "schema_version": 1,
                "execution": "live_python_operations",
                "config": config,
                **result,
                "selected": selected,
            }
        except (ValueError, TypeError, OverflowError):
            return None

    @reactive.effect
    async def send_state():
        input.plot_ready()
        await session.send_custom_message("danna_convolution", snapshot())

    @reactive.effect
    def selection_bounds():
        state = snapshot()
        if state:
            ui.update_numeric(
                "cell_row", value=state["selected"][0] + 1, max=len(state["activated"])
            )
            ui.update_numeric(
                "cell_column",
                value=state["selected"][1] + 1,
                max=len(state["activated"][0]),
            )

    @reactive.effect
    @reactive.event(input.selected_cell, ignore_none=True)
    def selected_cell():
        cell = input.selected_cell()
        state = snapshot()
        if (
            state
            and isinstance(cell, (list, tuple))
            and len(cell) == 2
            and all(type(v) is int for v in cell)
            and 0 <= cell[0] < len(state["activated"])
            and 0 <= cell[1] < len(state["activated"][0])
        ):
            ui.update_numeric("cell_row", value=cell[0] + 1)
            ui.update_numeric("cell_column", value=cell[1] + 1)

    @reactive.effect
    @reactive.event(input.next_cell)
    def next_cell():
        state = snapshot()
        if state:
            rows, columns = len(state["activated"]), len(state["activated"][0])
            index = (state["selected"][0] * columns + state["selected"][1] + 1) % (
                rows * columns
            )
            ui.update_numeric("cell_row", value=index // columns + 1)
            ui.update_numeric("cell_column", value=index % columns + 1)

    @render.text
    def status():
        return (
            "محاسبه آماده است؛ یک خانهٔ خروجی را بررسی کن."
            if snapshot()
            else "تنظیمات معتبر نیست. وزن و بایاس باید بین ۱۰− و ۱۰ و شمارهٔ خانه عدد صحیح مثبت باشد."
        )

    @render.ui
    def readout():
        state = snapshot()
        if not state:
            return None
        raw = state["raw"]
        values = [
            (
                "اندازهٔ خروجی فیلتر",
                f"{raw['output_shape'][1]} × {raw['output_shape'][2]}",
            ),
            ("وزن و بایاس", raw["parameter_count"]),
            ("ضرب در روش مستقیم", raw["multiplications"]),
        ]
        return ui.tags.dl(
            *(
                ui.tags.div(ui.tags.dt(label), ui.tags.dd(str(value), dir="ltr"))
                for label, value in values
            ),
            class_="readout",
        )

    @render.ui
    def input_matrix():
        state = snapshot()
        if not state:
            return None
        pad, stride = state["config"]["padding"], state["config"]["stride"]
        width = 8 + 2 * pad
        padded = [
            [
                state["image"][r - pad][c - pad]
                if pad <= r < pad + 8 and pad <= c < pad + 8
                else 0
                for c in range(width)
            ]
            for r in range(width)
        ]
        r, c = state["selected"]
        highlighted = {
            (r * stride + i, c * stride + j) for i in range(3) for j in range(3)
        }
        return ui.TagList(
            matrix_table(
                padded,
                "ورودی با حاشیه؛ ناحیهٔ آبی پنجرهٔ انتخابی است",
                highlighted=highlighted,
                padding=pad,
            ),
            ui.p("خانه‌های حاشیه با خط‌چین مشخص‌اند.", class_="caption"),
        )

    @render.ui
    def output_matrix():
        state = snapshot()
        return (
            matrix_table(
                state["raw"]["output"],
                "خانه‌های خروجی قابل انتخاب‌اند",
                selected=tuple(state["selected"]),
                buttons=True,
            )
            if state
            else None
        )

    @render.ui
    def final_matrix():
        state = snapshot()
        if not state:
            return None
        content = [
            matrix_table(
                state["activated"],
                "پس از ReLU"
                if state["config"]["relu"]
                else "فعال‌سازی همانی؛ همان پاسخ فیلتر",
            )
        ]
        if state["pooled"]:
            content.append(
                matrix_table(state["pooled"]["output"], "پس از pooling بدون حاشیه")
            )
        return ui.TagList(*content)

    @render.ui
    def calculation():
        state = snapshot()
        if not state:
            return None
        r, c = state["selected"]
        raw = state["raw"]
        terms = raw["terms"][r][c]
        expression = " + ".join(
            f"({number(t['input'])} × {number(t['weight'])})" for t in terms
        )
        expression += f" + ({number(raw['bias'])}) = {number(raw['output'][r][c])}"
        return ui.TagList(
            ui.p(
                f"سطر {r + 1} و ستون {c + 1}: دقیقاً ۹ ضرب و سپس یک بایاس. عددهای نمایش، تا ۳ رقم معنادار گرد شده‌اند؛ دریافت فایل، مقدار کامل را دارد."
            ),
            ui.tags.pre(expression, class_="calculation", dir="ltr"),
            ui.tags.details(
                ui.tags.summary("ورودی، وزن و حاصل هر ضرب"),
                ui.tags.table(
                    ui.tags.thead(
                        ui.tags.tr(
                            *(
                                ui.tags.th(label, scope="col")
                                for label in (
                                    "سطر ورودی (از ۰)",
                                    "ستون ورودی (از ۰)",
                                    "ورودی",
                                    "وزن",
                                    "حاصل",
                                )
                            )
                        )
                    ),
                    ui.tags.tbody(
                        *(
                            ui.tags.tr(
                                *(
                                    ui.tags.td(number(t[key]), dir="ltr")
                                    for key in (
                                        "input_row",
                                        "input_column",
                                        "input",
                                        "weight",
                                        "product",
                                    )
                                )
                            )
                            for t in terms
                        )
                    ),
                    dir="ltr",
                ),
            ),
        )

    @render.download_button(filename="convolution-experiment.json")
    def experiment():
        yield json.dumps(snapshot(), ensure_ascii=False, indent=2)


app = App(app_ui, server, static_assets=HERE / "www")
