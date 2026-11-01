"""Shared Shiny view for independently tested, editable numerical experiments."""

import json
import math
import traceback
from pathlib import Path

from shiny import App, reactive, render, ui

LABELS = {
    "length": "طول دنباله", "weight": "وزن بازگشتی", "input_weight": "وزن ورودی",
    "bias": "بایاس", "target": "هدف", "epochs": "تعداد دوره", "learning_rate": "نرخ یادگیری",
    "seed": "بذر", "dimension": "بُعد بردار", "count": "تعداد بردار", "query_index": "شمارهٔ بردار پرسش",
    "scale": "ضریب مقیاس", "key_dimension": "بُعد کلید", "value_dimension": "بُعد مقدار",
    "temperature": "دما", "causal": "ماسک علّی", "model_dimension": "بُعد مدل", "heads": "تعداد سرها",
}


def display(value):
    if isinstance(value, float):
        return f"{value:.9g}"
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def build_application(presets, initial, calculate, title, lab_id, here):
    def defaults(scenario):
        config = dict(presets[scenario]["config"])
        if scenario == initial["scenario"]:
            config.update({key: value for key, value in initial.items() if key != "scenario"})
        return config

    app_ui = ui.page_fluid(
        ui.tags.head(
            ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
            ui.tags.link(rel="stylesheet", href="lab.css"),
            ui.tags.script(src="workspace.js", defer=True),
            ui.tags.script(src="operations.js", defer=True),
        ),
        ui.tags.main(
            ui.tags.header(
                ui.tags.a("بازگشت به درس یادگیری ژرف", href="/deep-learning/", target="_top"),
                ui.tags.a("کد و نتیجه", href=f"/deep-learning/playgrounds/{lab_id}/code/", target="_top", class_="code-link"),
                ui.h1(title),
                ui.p("یک سناریو انتخاب کن؛ پارامترها، عددهای محاسبه و خود الگوریتم در دسترس‌اند."),
            ),
            ui.input_select("scenario", "سناریوی آزمایش", {key: item["title_fa"] for key, item in presets.items()}, selected=initial["scenario"]),
            ui.tags.details(
                ui.tags.summary("پارامترهای آزمایش"), ui.output_ui("parameter_controls"),
                ui.p("نام لاتین هر کنترل همان کلید CONFIG است. آرایه‌ها و ماتریس‌ها را با قالب JSON وارد کن.", class_="caption"),
                open=True, data_code_controls="true", class_="experiment-controls",
            ),
            ui.tags.p(ui.output_text("status", inline=True), role="status", class_="run-status"),
            ui.output_ui("results"),
            ui.output_ui("download_control"),
            ui.tags.footer("پایتون زنده · عددهای گرد‌شده برای نمایش؛ مقادیر کامل در فایل نتیجه"),
            class_="lab-shell operations-shell", dir="rtl", lang="fa",
        ), title=title,
    )

    def server(input, output, session):
        @render.ui
        def parameter_controls():
            scenario = input.scenario()
            metadata = presets[scenario]
            controls = []
            for key, value in defaults(scenario).items():
                label = ui.tags.span(metadata.get("labels_fa", {}).get(key, LABELS.get(key, key)), " · ", ui.tags.code(key, dir="ltr"))
                name = "parameter_" + key
                bounds = metadata.get("bounds", {}).get(key, {})
                choices = metadata.get("choices", {}).get(key)
                if isinstance(value, bool):
                    control = ui.input_checkbox(name, label, value)
                elif choices:
                    options = choices if isinstance(choices, dict) else {str(item): str(item) for item in choices}
                    control = ui.input_select(name, label, {str(k): str(v) for k, v in options.items()}, selected=str(value))
                elif isinstance(value, (int, float)):
                    control = ui.input_numeric(name, label, value, min=bounds.get("min"), max=bounds.get("max"), step=bounds.get("step", 1 if isinstance(value, int) else 0.001))
                elif isinstance(value, (list, dict)):
                    control = ui.input_text_area(name, label, json.dumps(value, ensure_ascii=False), rows=3)
                else:
                    control = ui.input_text(name, label, str(value))
                controls.append(control)
            return ui.tags.div(*controls, class_="controls operation-parameters")

        @reactive.calc
        def result():
            try:
                scenario = input.scenario()
                config = {"scenario": scenario}
                for key, default in defaults(scenario).items():
                    raw = input["parameter_" + key]()
                    if raw is None:
                        return None, "پارامترها در حال آماده‌شدن‌اند."
                    if isinstance(default, bool):
                        value = bool(raw)
                    elif isinstance(default, int):
                        number = float(raw)
                        if not math.isfinite(number) or int(number) != number:
                            raise ValueError(f"{key} باید عدد صحیح باشد")
                        value = int(number)
                    elif isinstance(default, float):
                        value = float(raw)
                    elif isinstance(default, (list, dict)):
                        value = json.loads(raw)
                    else:
                        value = str(raw)
                    config[key] = value
                data = calculate(config)
                json.dumps(data, allow_nan=False)
                data = dict(data)
                data["config"] = {"scenario": scenario, **data.get("config", {k: v for k, v in config.items() if k != "scenario"})}
                return data, "محاسبه از روی پارامترهای فعلی انجام شد؛ فرض‌ها و جدول عددها را بررسی کن."
            except Exception as error:
                traceback.print_exc()
                return None, f"محاسبه انجام نشد؛ ورودی یا کد را اصلاح کن. ({error})"

        @render.text
        def status():
            return result()[1]

        @render.ui
        def results():
            data = result()[0]
            if data is None:
                return ui.p("نتیجهٔ معتبر برای نمایش وجود ندارد.")
            children = [ui.tags.dl(*[
                ui.tags.div(ui.tags.dt(ui.tags.code(name, dir="ltr")), ui.tags.dd(display(value), dir="ltr"))
                for name, value in data.get("metrics", {}).items()
            ], class_="readout")]
            for index, series in enumerate(data.get("series", [])):
                title = series.get("title_fa", series.get("name", "روند محاسبه"))
                children.append(ui.tags.figure(ui.tags.figcaption(title), ui.tags.canvas(width="640", height="260", data_series_index=str(index), role="img", aria_label=title), class_="operation-series"))
            for table in data.get("tables", []):
                children.append(ui.tags.div(ui.tags.table(
                    ui.tags.caption(table["title_fa"]),
                    ui.tags.thead(ui.tags.tr(*[ui.tags.th(str(column), scope="col") for column in table["columns"]])),
                    ui.tags.tbody(*[ui.tags.tr(*[ui.tags.td(display(value), dir="auto") for value in row]) for row in table["rows"]]),
                ), class_="operation-table", role="region", aria_label=table["title_fa"], tabindex="0"))
            children.append(ui.tags.section(ui.h2("فرض‌ها و مرز تفسیر"), ui.tags.ul(*[ui.tags.li(text) for text in data.get("assumptions_fa", [])]), class_="interpretation"))
            return ui.tags.div(*children, id="operation-results")

        @render.ui
        def download_control():
            return ui.download_button("experiment", "دریافت عددهای کامل و تنظیمات") if result()[0] is not None else None

        @render.download(filename=lambda: f"{lab_id}-{input.scenario()}.json")
        def experiment():
            yield json.dumps(result()[0], ensure_ascii=False, indent=2, allow_nan=False)

        @reactive.effect
        async def send_state():
            input.operations_ready()
            await session.send_custom_message("danna_operations", result()[0])

    return App(app_ui, server, static_assets=Path(here) / "www")
