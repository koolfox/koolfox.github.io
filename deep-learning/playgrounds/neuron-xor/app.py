"""Live Python training; exported with Shinylive for static hosting."""

import json
import sys
import time
from pathlib import Path

from shiny import App, reactive, render, ui

HERE = Path(__file__).parent
engine_path = HERE.parents[1] / "python"
if engine_path.is_dir():
    sys.path.insert(0, str(engine_path))

from experiment import CONFIG, create_run, train_epochs

shared_path = HERE.parent / "shared"
if shared_path.is_dir():
    sys.path.insert(0, str(shared_path))
from topology_ui import topology_panel

MODELS = {
    "perceptron": "پرسپترون آستانه‌ای",
    "linear": "نورون سیگموید",
    "mlp": "شبکه با لایه پنهان",
}

app_ui = ui.page_fluid(
    ui.tags.head(
        ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
        ui.tags.link(rel="stylesheet", href="lab.css"),
        ui.tags.link(rel="stylesheet", href="topology.css"),
        ui.tags.script(src="topology.js", defer=True),
        ui.tags.script(src="plot.js", defer=True),
    ),
    ui.tags.main(
        ui.tags.header(
            ui.tags.a(
                "بازگشت به درس یادگیری ژرف", href="/deep-learning/", target="_top"
            ),
            ui.h1("نورون و مسئله XOR"),
            ui.p(
                "یک مدل انتخاب کن، خروجی را حدس بزن و تغییر مرز تصمیم را هنگام یادگیری ببین."
            ),
            ui.tags.a(
                "دیدن لایه‌ها و عبور ورودی",
                href="#network-structure",
                class_="topology-jump",
            ),
        ),
        ui.tags.div(
            ui.tags.div(
                ui.input_select(
                    "gate",
                    "جدول درستی",
                    {x: x for x in ("AND", "OR", "NAND", "NOR", "XOR", "XNOR")},
                    selected=CONFIG["gate"],
                ),
                ui.input_select("model", "مدل", MODELS, selected=CONFIG["model"]),
                ui.panel_conditional(
                    "input.model === 'mlp'",
                    ui.input_numeric(
                        "hidden",
                        "نورون‌های لایه پنهان",
                        CONFIG["hidden"],
                        min=1,
                        max=32,
                        step=1,
                    ),
                ),
                ui.input_numeric(
                    "learning_rate",
                    "نرخ یادگیری",
                    CONFIG["learning_rate"],
                    min=0.001,
                    max=4,
                    step=0.1,
                ),
                ui.input_numeric(
                    "seed", "بذر تصادفی", CONFIG["seed"], min=0, max=4294967295, step=1
                ),
                ui.input_numeric(
                    "max_epochs",
                    "سقف دوره آموزش",
                    CONFIG["max_epochs"],
                    min=1,
                    max=10000,
                    step=100,
                ),
                class_="controls",
            ),
            ui.p(
                "تغییر تنظیمات یک اجرای تازه می‌سازد. بذر یکسان، وزن‌های آغازین یکسان می‌دهد.",
                class_="caption",
            ),
            class_="configuration",
        ),
        ui.tags.div(
            ui.input_action_button("play", "شروع / ادامه", class_="primary"),
            ui.input_action_button("pause", "توقف"),
            ui.input_action_button("step", "یک دوره جلو"),
            ui.input_action_button("reset", "از ابتدا"),
            ui.download_button("experiment", "دریافت نتیجه و تنظیمات"),
            class_="actions",
        ),
        ui.tags.p(
            ui.output_text("status", inline=True), role="status", class_="run-status"
        ),
        ui.output_ui("readout"),
        topology_panel(),
        ui.tags.div(
            ui.tags.section(
                ui.h2("مرز تصمیم"),
                ui.tags.canvas(
                    id="decision",
                    width="560",
                    height="430",
                    role="img",
                    aria_label="مرز تصمیم مدل؛ خروجی دقیق چهار ورودی در جدول آمده است",
                ),
                ui.p(
                    "نقاط، برچسب هدف را نشان می‌دهند؛ زمینه، خروجی مدل است. رنگ بین نقاط، پاسخ واقعی گیت نیست.",
                    class_="caption",
                ),
            ),
            ui.tags.section(
                ui.h2("از ورودی تا پیش‌بینی"),
                ui.output_ui("truth_table"),
                ui.h2("خطای اندازه‌گیری‌شده"),
                ui.tags.canvas(
                    id="loss-chart",
                    width="560",
                    height="230",
                    role="img",
                    aria_label="تاریخچه خطای واقعی آموزش",
                ),
            ),
            class_="lab-grid",
        ),
        ui.tags.details(
            ui.tags.summary("مقدار دقیق وزن‌ها و بایاس‌ها"), ui.output_code("parameters")
        ),
        ui.tags.section(
            ui.h2("نتیجه را توضیح بده"),
            ui.p(
                "با یک seed ثابت، XOR را با پرسپترون و سپس شبکه چندلایه اجرا کن. آیا افزایش زمان آموزش، محدودیت یک مرز خطی را برطرف می‌کند؟"
            ),
            ui.p(
                "هر چهار حالت جدول درستی برای آموزش استفاده می‌شوند. دقت این جدول، شاهد تعمیم به داده ندیده نیست. این آزمایش دوورودی، تمرین تألیفی مجموعه است؛ مثال اکثریت سه‌ورودی اسلایدها آزمایش جداگانه‌ای است."
            ),
            class_="interpretation",
        ),
        ui.tags.footer(
            "محاسبه زنده پایتون · اجرای قابل بازتولید · بدون ارسال پیشرفت به سرور آموزشی"
        ),
        class_="lab-shell",
        dir="rtl",
        lang="fa",
    ),
    title="کارگاه آموزشی دیپ لرنینگ",
)


def server(input, output, session):
    run = reactive.value(None)
    running = reactive.value(False)
    revision = reactive.value(0)
    message = reactive.value("آماده اجرای آزمایش")
    started = [0.0]

    def changed():
        with reactive.isolate():
            revision.set(revision.get() + 1)

    @reactive.effect
    def configure():
        running.set(False)
        try:
            model = input.model()
            hidden = input.hidden() if model == "mlp" else 1
            for value in (hidden, input.seed(), input.max_epochs()):
                if value is None or int(value) != value:
                    raise ValueError("تعدادها و بذر باید عدد صحیح باشند")
            state = create_run(
                gate=input.gate(),
                model=model,
                hidden=int(hidden),
                learning_rate=float(input.learning_rate()),
                seed=int(input.seed()),
                max_epochs=int(input.max_epochs()),
            )
        except (ValueError, TypeError, OverflowError) as error:
            run.set(None)
            message.set(
                f"تنظیمات معتبر نیست. مقدارها را در بازه مشخص‌شده وارد کن. ({error})"
            )
            return
        run.set(state)
        message.set("وزن‌های آغازین آماده‌اند. پیش از اجرا، خروجی را حدس بزن.")
        changed()

    @reactive.effect
    @reactive.event(input.play)
    def play():
        if run.get() is not None:
            started[0] = time.perf_counter()
            running.set(True)
            message.set("آموزش در حال اجراست؛ می‌توانی هر زمان آن را متوقف کنی.")

    @reactive.effect
    @reactive.event(input.pause)
    def pause():
        running.set(False)
        message.set("آموزش متوقف شد؛ ادامه از همین وزن‌ها انجام می‌شود.")

    @reactive.effect
    @reactive.event(input.step)
    def step():
        running.set(False)
        if run.get() is not None:
            train_epochs(run.get(), 1)
            changed()
            message.set("یک دوره کامل روی چهار ورودی انجام شد.")

    @reactive.effect
    @reactive.event(input.reset)
    def reset():
        running.set(False)
        if run.get() is not None:
            run.set(create_run(**run.get().config))
            changed()
            message.set("همان تنظیمات و بذر، از وزن‌های آغازین بازسازی شدند.")

    @reactive.effect
    def tick():
        if not running.get():
            return
        with reactive.isolate():
            state = run.get()
            if state is None:
                running.set(False)
                return
            train_epochs(state, 40)
            changed()
            if state.epoch >= state.config["max_epochs"]:
                running.set(False)
                message.set(
                    "سقف دوره‌های انتخاب‌شده طی شد. نتیجه و تنظیمات را می‌توانی دریافت کنی."
                )
                return
            if time.perf_counter() - started[0] >= 10:
                running.set(False)
                message.set(
                    "برای پاسخ‌گو ماندن صفحه، اجرا پس از ۱۰ ثانیه متوقف شد؛ ادامه از همین نقطه ممکن است."
                )
                return
        reactive.invalidate_later(0.04)

    @reactive.effect
    @reactive.event(input.tab_hidden, ignore_none=True)
    def hidden():
        if input.tab_hidden():
            running.set(False)
            message.set("با پنهان‌شدن صفحه، آموزش متوقف شد.")

    @reactive.calc
    def snapshot():
        revision.get()
        state = run.get()
        return state.snapshot() if state else None

    @reactive.effect
    async def send_plot():
        input.plot_ready()
        state = snapshot()
        await session.send_custom_message("danna_training", state)

    @render.text
    def status():
        return message.get()

    @render.ui
    def readout():
        state = snapshot()
        if not state:
            return ui.p("برای شروع، تنظیمات را اصلاح کن.")
        label = (
            "میانگین BCE"
            if state["activation"] == "sigmoid"
            else "نسبت طبقه‌بندی نادرست"
        )
        return ui.tags.dl(
            ui.tags.div(
                ui.tags.dt("دوره آموزش"),
                ui.tags.dd(str(state["epoch"]), id="epoch", dir="ltr"),
            ),
            ui.tags.div(
                ui.tags.dt(label),
                ui.tags.dd(f"{state['loss']:.6f}", id="loss", dir="ltr"),
            ),
            ui.tags.div(
                ui.tags.dt("پاسخ درست روی آموزش"),
                ui.tags.dd(
                    f"{round(state['accuracy'] * 4)} / 4", id="accuracy", dir="ltr"
                ),
            ),
            class_="readout",
        )

    @render.ui
    def truth_table():
        state = snapshot()
        if not state:
            return None
        rows = [
            ui.tags.tr(
                ui.tags.td(str(int(x[0]))),
                ui.tags.td(str(int(x[1]))),
                ui.tags.td(str(target)),
                ui.tags.td(f"{value:.5f}"),
                ui.tags.td(str(pred)),
            )
            for x, target, value, pred in zip(
                state["inputs"],
                state["targets"],
                state["probabilities"],
                state["predictions"],
            )
        ]
        return ui.tags.table(
            ui.tags.thead(
                ui.tags.tr(
                    *(
                        ui.tags.th(x, scope="col")
                        for x in ["x₁", "x₂", "هدف", "خروجی", "کلاس"]
                    )
                )
            ),
            ui.tags.tbody(*rows),
            dir="ltr",
        )

    @render.code
    def parameters():
        state = snapshot()
        return (
            json.dumps(
                {"weights": state["weights"], "biases": state["biases"]}, indent=2
            )
            if state
            else ""
        )

    @render.download_button(filename="neuron-xor-experiment.json")
    def experiment():
        yield json.dumps(snapshot(), ensure_ascii=False, indent=2)


app = App(app_ui, server, static_assets=HERE / "www")
