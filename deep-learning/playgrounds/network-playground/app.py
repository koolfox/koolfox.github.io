"""Interactive classification, computed by the inspectable Python engine."""

import json
import sys
import time
from pathlib import Path

from shiny import App, reactive, render, ui

try:
    from network_playground import NetworkExperiment
except ModuleNotFoundError:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "python"))
    from network_playground import NetworkExperiment

HERE = Path(__file__).parent
FEATURE_LABELS = {
    "x1": "x₁",
    "x2": "x₂",
    "x1_squared": "x₁²",
    "x2_squared": "x₂²",
    "x1_x2": "x₁ × x₂",
    "sin_x1": "sin(πx₁)",
    "sin_x2": "sin(πx₂)",
}

app_ui = ui.page_fluid(
    ui.tags.head(
        ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
        ui.tags.link(rel="stylesheet", href="lab.css"),
        ui.tags.link(rel="stylesheet", href="network.css"),
        ui.tags.script(src="plot.js", defer=True),
    ),
    ui.tags.main(
        ui.tags.header(
            ui.tags.a(
                "بازگشت به درس یادگیری ژرف", href="/deep-learning/", target="_top"
            ),
            ui.h1("شبکه چگونه مرز تصمیم را یاد می‌گیرد؟"),
            ui.p(
                "داده، ویژگی و معماری را انتخاب کن. پیش از آموزش حدس بزن کدام تغییر، خطای داده‌های ندیده را کم می‌کند."
            ),
        ),
        ui.tags.div(
            ui.input_select(
                "dataset",
                "شکل داده",
                {
                    "circles": "دو حلقه",
                    "xor": "چهار ربع (XOR)",
                    "linear": "دو سوی یک خط",
                    "spirals": "دو مارپیچ",
                },
            ),
            ui.input_numeric("layers", "تعداد لایه‌های پنهان", 2, min=0, max=3, step=1),
            ui.input_select(
                "activation",
                "تابع فعال‌سازی پنهان",
                {"tanh": "tanh", "relu": "ReLU", "sigmoid": "sigmoid"},
            ),
            ui.panel_conditional(
                "input.layers >= 1",
                ui.input_numeric(
                    "width1", "نورون‌های لایه اول", 4, min=1, max=8, step=1
                ),
            ),
            ui.panel_conditional(
                "input.layers >= 2",
                ui.input_numeric(
                    "width2", "نورون‌های لایه دوم", 4, min=1, max=8, step=1
                ),
            ),
            ui.panel_conditional(
                "input.layers >= 3",
                ui.input_numeric(
                    "width3", "نورون‌های لایه سوم", 4, min=1, max=8, step=1
                ),
            ),
            class_="controls configuration",
        ),
        ui.tags.div(
            ui.input_checkbox_group(
                "features",
                "ویژگی‌های ورودی",
                FEATURE_LABELS,
                selected=["x1", "x2"],
                inline=True,
            ),
            class_="feature-options",
            dir="ltr",
        ),
        ui.tags.details(
            ui.tags.summary("تنظیمات داده و روش یادگیری"),
            ui.tags.div(
                ui.input_numeric(
                    "size", "تعداد کل نمونه‌ها", 200, min=40, max=400, step=20
                ),
                ui.input_numeric(
                    "noise", "انحراف معیار نویز ورودی", 0.05, min=0, max=0.5, step=0.05
                ),
                ui.input_numeric(
                    "seed", "بذر تصادفی", 7, min=0, max=4294967295, step=1
                ),
                ui.input_select(
                    "optimizer",
                    "روش به‌روزرسانی",
                    {"adam": "Adam", "sgd": "SGD", "momentum": "SGD با مومنتوم ۰٫۹"},
                ),
                ui.input_numeric(
                    "learning_rate", "نرخ یادگیری", 0.03, min=0.00001, max=1, step=0.01
                ),
                ui.input_numeric(
                    "batch_size", "اندازه دسته", 20, min=1, max=400, step=1
                ),
                ui.input_select(
                    "regularization",
                    "جریمه وزن‌ها",
                    {"none": "بدون جریمه", "l2": "L2", "l1": "L1"},
                ),
                ui.input_numeric(
                    "regularization_rate",
                    "ضریب جریمه λ",
                    0.001,
                    min=0,
                    max=1,
                    step=0.001,
                ),
                ui.input_numeric(
                    "max_epochs", "سقف دوره آموزش", 1000, min=1, max=3000, step=100
                ),
                class_="controls",
            ),
            ui.p(
                "نویز به مختصات افزوده می‌شود؛ برچسب عوض نمی‌شود. تقسیم طبقه‌بندی‌شدهٔ داده تقریباً ۶۰٪ آموزش، ۲۰٪ اعتبارسنجی و ۲۰٪ آزمون است. با بذر ثابت، تغییر معماری داده‌ها را عوض نمی‌کند.",
                class_="caption",
            ),
        ),
        ui.p(
            "تغییر هر تنظیم، اجرای تازه‌ای می‌سازد. مدل بدون لایه پنهان نیز قابل آزمایش است؛ خروجی نهایی همیشه سیگموید است.",
            class_="caption",
        ),
        ui.tags.div(
            ui.input_action_button("play", "شروع / ادامه", class_="primary"),
            ui.input_action_button("pause", "توقف"),
            ui.input_action_button("step", "یک دوره جلو"),
            ui.input_action_button("reset", "از ابتدا"),
            ui.download_button("experiment", "دریافت آزمایش"),
            class_="actions",
        ),
        ui.tags.p(
            ui.output_text("status", inline=True), role="status", class_="run-status"
        ),
        ui.output_ui("readout"),
        ui.tags.div(
            ui.tags.section(
                ui.h2("مرز تصمیم و نمونه‌ها"),
                ui.tags.canvas(
                    id="decision",
                    width="560",
                    height="480",
                    role="img",
                    aria_label="پیش‌بینی مدل؛ دایره‌ها آموزش و مربع‌ها اعتبارسنجی‌اند",
                ),
                ui.p(
                    "کلاس ۱ آبی و کلاس ۰ سفید است. دایره: آموزش؛ مربع: اعتبارسنجی؛ مثلث: آزمون پس از پایان. زمینه مقدار خروجی مدل را نشان می‌دهد، نه اطمینانِ کالیبره‌شده.",
                    class_="caption",
                ),
            ),
            ui.tags.section(
                ui.h2("خطای آموزش و اعتبارسنجی"),
                ui.tags.canvas(
                    id="loss-chart",
                    width="560",
                    height="280",
                    role="img",
                    aria_label="خط پیوسته آبی: آموزش؛ خط‌چین تیره: اعتبارسنجی",
                ),
                ui.p(
                    "آبی پیوسته: آموزش؛ تیره خط‌چین: اعتبارسنجی. هر دو میانگین BCE بدون جریمه‌اند. هدف بهینه‌ساز، خطای آموزش به‌اضافه جریمه است.",
                    class_="caption",
                ),
                ui.output_ui("metrics_table"),
            ),
            class_="lab-grid",
        ),
        ui.tags.section(
            ui.h2("داخل شبکه"),
            ui.tags.div(
                ui.tags.canvas(
                    id="network",
                    width="960",
                    height="430",
                    role="img",
                    aria_label="لایه‌ها و وزن‌ها؛ اتصال منفی خط‌چین است",
                ),
                class_="network-scroll",
                tabindex="0",
                role="region",
                aria_label="نمودار شبکه؛ روی صفحه کوچک به طرفین حرکت بده",
            ),
            ui.p(
                "ضخامت اتصال با قدر مطلق وزن متناسب است؛ وزن منفی با خط‌چین مشخص می‌شود. مقیاس ضخامت در هر تصویر دوباره تنظیم می‌شود.",
                class_="caption",
            ),
            ui.tags.details(
                ui.tags.summary("مقدار دقیق وزن‌ها و بایاس‌ها"),
                ui.output_code("parameters"),
            ),
        ),
        ui.tags.section(
            ui.h2("ارزیابی نهایی"),
            ui.p(
                "معماری و زمان توقف را با اعتبارسنجی انتخاب کن. وقتی تصمیم نهایی شد، آزمون را باز کن؛ این کار آموزش همین اجرا را می‌بندد."
            ),
            ui.input_action_button("finalize", "پایان آموزش و مشاهده آزمون"),
            ui.output_ui("test_result"),
            ui.p(
                "پس از دیدن آزمون، تنظیم دوباره با همان بذر دیگر ارزیابی مستقل نیست. این دادهٔ مصنوعی، شاهد کارایی مدل روی داده واقعی نیست.",
                class_="caption",
            ),
        ),
        ui.tags.section(
            ui.h2("سه آزمایش پیشنهادی"),
            ui.tags.ol(
                ui.tags.li(
                    "حلقه‌ها را بدون لایه پنهان و با x₁ و x₂ آموزش بده. سپس x₁² و x₂² را جایگزین کن؛ چرا مرز مدل تغییر می‌کند؟"
                ),
                ui.tags.li(
                    "بذر و معماری را ثابت نگه دار و SGD را با Adam مقایسه کن. نرخ یادگیری یکسان، الزاماً مقایسهٔ منصفانه‌ای نیست؛ منحنی هر دو را ثبت کن."
                ),
                ui.tags.li(
                    "نویز را بیشتر کن و شبکهٔ بزرگ‌تر بساز. آیا کاهش خطای آموزش، همراه کاهش خطای اعتبارسنجی است؟ اثر L2 را بررسی کن."
                ),
            ),
        ),
        ui.tags.details(
            ui.tags.summary("تعریف محاسبه و بازتولید"),
            ui.p(
                "BCE از logit محاسبه می‌شود. برای L1 جریمه λΣ|w| و برای L2 جریمه λΣw²/2 است؛ بایاس جریمه نمی‌شود. در Adam مقادیر β₁=۰٫۹، β₂=۰٫۹۹۹ و ε=۱۰⁻⁸ با تصحیح اریب استفاده می‌شوند. تمام دسته‌ها در هر دوره با مولد تصادفی مستقل جابه‌جا می‌شوند."
            ),
            ui.p(
                "دریافت آزمایش شامل تنظیمات، وزن‌ها، داده‌های قابل مشاهده و تاریخچهٔ واقعی است. برای بازتولید، NetworkExperiment را با config بساز و به تعداد epoch دوره اجرا کن."
            ),
            ui.tags.a(
                "کد موتور محاسبه",
                href="/deep-learning/python/network_playground.py",
                target="_blank",
            ),
            ui.p(
                ui.tags.a(
                    "مرجع Adam",
                    href="https://arxiv.org/abs/1412.6980",
                    target="_blank",
                    rel="noopener",
                )
            ),
        ),
        ui.tags.footer(
            "محاسبه زنده پایتون · داده مصنوعی و آزمایش تألیفی مستقل · بدون ارسال داده به سرور آموزشی"
        ),
        class_="lab-shell",
        dir="rtl",
        lang="fa",
    ),
    title="آزمایشگاه شبکه و تعمیم",
)


def server(input, output, session):
    run, running, revision = (
        reactive.value(None),
        reactive.value(False),
        reactive.value(0),
    )
    message = reactive.value("آماده اجرای آزمایش")
    started = [0.0]

    def changed():
        with reactive.isolate():
            revision.set(revision.get() + 1)

    @reactive.effect
    def configure():
        running.set(False)
        try:
            counts = [
                input.layers(),
                input.width1(),
                input.width2(),
                input.width3(),
                input.size(),
                input.seed(),
                input.batch_size(),
                input.max_epochs(),
            ]
            if any(v is None or int(v) != v for v in counts) or not 0 <= counts[0] <= 3:
                raise ValueError("تعدادها باید صحیح و در بازهٔ مشخص باشند")
            state = NetworkExperiment(
                dataset=input.dataset(),
                hidden=[int(v) for v in counts[1 : 1 + int(counts[0])]],
                activation=input.activation(),
                feature_names=list(input.features()),
                size=int(input.size()),
                noise=float(input.noise()),
                seed=int(input.seed()),
                optimizer=input.optimizer(),
                learning_rate=float(input.learning_rate()),
                batch_size=int(input.batch_size()),
                regularization=input.regularization(),
                regularization_rate=float(input.regularization_rate()),
                max_epochs=int(input.max_epochs()),
            )
        except (ValueError, TypeError, OverflowError):
            run.set(None)
            message.set(
                "تنظیمات معتبر نیست؛ بازهٔ عددها و انتخاب دست‌کم یک ویژگی را بررسی کن."
            )
            return
        run.set(state)
        message.set("اجرای تازه آماده است؛ شکل مرز تصمیم را پیش‌بینی کن.")
        changed()

    def advance():
        state = run.get()
        if state is None or state.sealed:
            running.set(False)
            message.set("برای آموزش، اجرای معتبر و باز لازم است.")
            return False
        try:
            state.step()
        except ArithmeticError:
            run.set(None)
            running.set(False)
            message.set(
                "محاسبه از محدوده خارج شد؛ نرخ یادگیری را کاهش بده و دوباره شروع کن."
            )
            return False
        changed()
        return True

    @reactive.effect
    @reactive.event(input.play)
    def play():
        if run.get() and not run.get().sealed:
            started[0] = time.perf_counter()
            running.set(True)
            message.set("آموزش در حال اجراست.")

    @reactive.effect
    @reactive.event(input.pause)
    def pause():
        running.set(False)
        message.set("آموزش متوقف شد؛ وزن‌ها حفظ شده‌اند.")

    @reactive.effect
    @reactive.event(input.step)
    def step():
        running.set(False)
        if advance():
            message.set("یک دوره روی بخش آموزش انجام شد.")

    @reactive.effect
    @reactive.event(input.reset)
    def reset():
        running.set(False)
        if run.get():
            run.set(NetworkExperiment(**run.get().config))
            changed()
            message.set("وزن‌ها، ترتیب دسته‌ها و داده‌ها با همان بذر بازسازی شدند.")

    @reactive.effect
    @reactive.event(input.finalize)
    def finalize():
        running.set(False)
        if run.get():
            run.get().finalize()
            changed()
            message.set("آزمون محاسبه شد؛ آموزش این اجرا بسته است.")

    @reactive.effect
    def tick():
        if not running.get():
            return
        with reactive.isolate():
            if not advance():
                return
            if run.get().epoch >= run.get().config["max_epochs"]:
                running.set(False)
                message.set("سقف دوره‌ها طی شد؛ اکنون می‌توانی آزمون نهایی را بررسی کنی.")
                return
            if time.perf_counter() - started[0] >= 10:
                running.set(False)
                message.set(
                    "اجرا پس از ۱۰ ثانیه متوقف شد؛ ادامه از همین وزن‌ها ممکن است."
                )
                return
        reactive.invalidate_later(0.08)

    @reactive.effect
    @reactive.event(input.tab_hidden, ignore_none=True)
    def hidden():
        if input.tab_hidden():
            running.set(False)
            message.set("با پنهان‌شدن صفحه آموزش متوقف شد.")

    @reactive.calc
    def snapshot():
        revision.get()
        return run.get().snapshot() if run.get() else None

    @reactive.effect
    async def send_plot():
        input.plot_ready()
        await session.send_custom_message("danna_network", snapshot())

    @render.text
    def status():
        return message.get()

    @render.ui
    def readout():
        state = snapshot()
        if not state:
            return ui.p("برای شروع، تنظیمات را اصلاح کن.")
        values = [
            ("دوره", state["epoch"], "epoch"),
            ("پارامتر قابل یادگیری", state["parameter_count"], "parameter-count"),
            ("BCE آموزش", f"{state['train']['loss']:.5f}", "train-loss"),
            ("BCE اعتبارسنجی", f"{state['validation']['loss']:.5f}", "validation-loss"),
        ]
        return ui.tags.dl(
            *(
                ui.tags.div(
                    ui.tags.dt(label), ui.tags.dd(str(value), id=id_, dir="ltr")
                )
                for label, value, id_ in values
            ),
            class_="readout",
        )

    @render.ui
    def metrics_table():
        state = snapshot()
        if not state:
            return None
        rows = [("آموزش", state["train"]), ("اعتبارسنجی", state["validation"])]
        return ui.tags.table(
            ui.tags.thead(
                ui.tags.tr(
                    *(
                        ui.tags.th(t, scope="col")
                        for t in ("بخش", "تعداد", "دقت", "BCE")
                    )
                )
            ),
            ui.tags.tbody(
                *(
                    ui.tags.tr(
                        ui.tags.th(label, scope="row"),
                        ui.tags.td(str(s["count"])),
                        ui.tags.td(f"{s['accuracy']:.1%}", dir="ltr"),
                        ui.tags.td(f"{s['loss']:.5f}", dir="ltr"),
                    )
                    for label, s in rows
                )
            ),
        )

    @render.ui
    def test_result():
        state = snapshot()
        if not state or state["test"] is None:
            return ui.p("نمونه‌ها و نتیجهٔ آزمون هنوز باز نشده‌اند.", id="test-status")
        result = state["test"]
        return ui.p(
            f"آزمون روی {result['count']} نمونه: دقت {result['accuracy']:.1%} و میانگین BCE برابر {result['loss']:.5f}.",
            id="test-status",
        )

    @render.code
    def parameters():
        state = snapshot()
        return (
            json.dumps({key: state[key] for key in ("weights", "biases")}, indent=2)
            if state
            else ""
        )

    @render.download_button(filename="network-experiment.json")
    def experiment():
        yield json.dumps(snapshot(), ensure_ascii=False, indent=2)


app = App(app_ui, server, static_assets=HERE / "www")
