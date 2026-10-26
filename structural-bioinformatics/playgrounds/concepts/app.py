"""Live, source-inspectable experiments for the general structural course."""

import runpy
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from shiny import App, reactive, render, ui

HERE = Path(__file__).resolve().parent
ENGINE = HERE / "interactive_lab.py"
if not ENGINE.exists():
    ENGINE = HERE.parents[1] / "assets/course/interactive_lab.py"
lab = SimpleNamespace(**runpy.run_path(str(ENGINE)))
PDB = HERE / "1ubq-protein.pdb"
if not PDB.exists():
    PDB = HERE.parents[1] / "assets/course/gromacs/1ubq-protein.pdb"
MODES = {
    "sequence": "توالی DNA و جهت رشته‌ها",
    "geometry": "هم‌ترازی، RMSD و شعاع دوران",
    "energy": "انرژی آزاد و احتمال دو حالت",
    "minimization": "گام‌های کمینه‌سازی انرژی",
    "sampling": "نمونه‌برداری و میانگین بلوک‌ها",
    "graph": "شبکهٔ تماس و انتخاب آستانه",
}
BRIEFS = {
    "sequence": (
        (
            "رشته را در جهت ۵′ به ۳′ می‌خوانیم. مکمل روبه‌روی آن جهت معکوس دارد؛ "
            "برای نوشتن مکمل در جهت ۵′ به ۳′، ترتیب را هم برمی‌گردانیم."
        ),
        (
            "توالی AACGT را وارد کن. پیش‌بینی کن مکمل معکوس چه می‌شود؛ سپس دو "
            "خروجی مکمل را با هم مقایسه کن. تبدیل T به U در این مثال، تبدیل "
            "آموزشی یک رشتهٔ کدکنندهٔ فرضی است."
        ),
        "تعداد حروف یا درصد GC، ساختار سه‌بعدی RNA و مقدار بیان آن را تعیین نمی‌کند.",
        5,
    ),
    "geometry": (
        (
            "RMSD میانگین مربعی فاصلهٔ اتم‌های متناظر را خلاصه می‌کند. هم‌ترازی، "
            "انتقال و چرخش کل مجموعه را حذف می‌کند. شعاع دوران پراکندگی نقاط حول "
            "مرکزشان است."
        ),
        (
            "ابتدا تغییر موضعی را صفر نگه دار و انتقال یا چرخش بده. سپس اتم A:21 "
            "را سه آنگستروم جابه‌جا کن. پیش‌بینی کن کدام اختلاف پس از هم‌ترازی "
            "باقی می‌ماند."
        ),
        (
            "ورودی ۷۶ اتم Cα از 1UBQ است؛ وزن‌ها برابرند. دستکاری مختصات در این "
            "تمرین یک تغییر ساختگی است و مسیر دینامیک مولکولی نیست."
        ),
        8,
    ),
    "energy": (
        (
            "در مدل دوحالته، نسبت جمعیت B به A برابر exp(−ΔG/kBT) است. مقدار مثبت "
            "محور افقی یعنی انرژی آزاد B بالاتر است."
        ),
        (
            "اختلاف را از صفر به ۲ ببر. پیش از دیدن عدد، حدس بزن سهم B بیشتر "
            "می‌شود یا کمتر. سپس علامت اختلاف را عوض کن."
        ),
        (
            "مدل دوحالته و عددها آموزشی‌اند. این منحنی ارتفاع سد یا سرعت "
            "جابه‌جایی میان حالت‌ها را نشان نمی‌دهد."
        ),
        14,
    ),
    "minimization": (
        (
            "برای U=x²، مشتق برابر 2x است. در هر گام، x تازه از رابطهٔ x−α(2x) به "
            "دست می‌آید. α اندازهٔ گام الگوریتم است."
        ),
        (
            "با x اولیهٔ ۴، اندازهٔ گام‌های ۰٫۲۵، ۱ و ۱٫۱ را مقایسه کن. یک گام "
            "جلو برو و قبل از آن مقدار x بعدی را با دست حساب کن."
        ),
        "تابع تک‌متغیره ساختگی است؛ این شمارنده زمان فیزیکی MD یا انرژی یک پروتئین واقعی نیست.",
        16,
    ),
    "sampling": (
        (
            "میانگین کل می‌تواند تفاوت بخش‌های یک سری را پنهان کند. میانگین "
            "بلوک‌ها، میانگین بازه‌های متوالی با طول یکسان است."
        ),
        (
            "نویز را صفر و تغییر نیمهٔ دوم را ۲ قرار بده. میانگین کل و بلوک‌ها را "
            "مقایسه کن. بعد تغییر را صفر و هم‌بستگی را زیاد کن تا اثر وابستگی "
            "نمونه‌های نزدیک را ببینی."
        ),
        (
            "۲۰۰ نمونه با مولد تصادفیِ بذرپذیر ساخته می‌شوند. مدل نویز AR(1) است؛ "
            "این داده مسیر MD یا برآورد مدت لازم برای همگرایی یک پروتئین نیست."
        ),
        22,
    ),
    "graph": (
        (
            "هر گره یک نقطه و هر یال یک فاصلهٔ سه‌بعدی کمتر یا مساوی آستانه است. "
            "درجهٔ گره تعداد همسایه‌های آن است."
        ),
        (
            "در مثال چهارگره‌ای، آستانه را از ۴٫۱ به ۵ آنگستروم ببر. حدس بزن کدام "
            "یال‌ها اضافه می‌شوند. سپس گره انتخاب‌شده و جدول همسایه‌ها را بررسی "
            "کن؛ می‌توانی ورودی واقعی 1UBQ را هم انتخاب کنی."
        ),
        (
            "در دادهٔ پروتئین، گره‌ها Cα هستند. حذف همسایه‌های توالی بر اساس "
            "ترتیب همین زنجیرهٔ پیوسته است. درجهٔ بیشتر، نقش عملکردی مهم‌تر را "
            "به‌تنهایی ثابت نمی‌کند."
        ),
        29,
    ),
}


def controls(mode, *children):
    return ui.panel_conditional(
        f"input.experiment === '{mode}'", ui.div(*children, class_="controls")
    )


app_ui = ui.page_fluid(
    ui.tags.head(
        ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
        ui.tags.link(rel="stylesheet", href="lab.css"),
        ui.tags.script(src="plot.js", defer=True),
    ),
    ui.tags.main(
        ui.tags.header(
            ui.tags.a(
                "بازگشت به سرفصل آموزشی",
                href="/structural-bioinformatics/course.html",
                target="_top",
                id="course-return",
            ),
            ui.h1("آزمایشگاه مفاهیم ساختاری"),
            ui.p("پیش‌بینی کن، یک پارامتر را تغییر بده و نتیجهٔ محاسبه را توضیح بده."),
            ui.tags.a("ویرایش و اجرای کد Python", href="#code-workbench"),
        ),
        ui.input_select("experiment", "انتخاب آزمایش", MODES, selected="geometry"),
        ui.output_ui("brief"),
        controls(
            "sequence",
            ui.input_text_area("dna", "رشتهٔ کدکنندهٔ فرضی؛ ۵′ به ۳′", "ATGGCTTAA", rows=2),
        ),
        controls(
            "geometry",
            ui.input_numeric("shift", "انتقال در x؛ آنگستروم", 10, min=-20, max=20, step=1),
            ui.input_numeric("angle", "چرخش حول z؛ درجه", 0, min=-180, max=180, step=15),
            ui.input_numeric(
                "deformation", "تغییر موضعی A:21؛ آنگستروم", 0, min=-5, max=5, step=0.5
            ),
            ui.input_radio_buttons(
                "coordinate_view",
                "مختصات روی نمودار",
                {"raw": "پیش از هم‌ترازی", "fit": "پس از هم‌ترازی"},
                selected="raw",
                inline=True,
            ),
        ),
        controls(
            "energy",
            ui.input_numeric("delta", "اختلاف انرژی آزاد؛ ΔG/kBT", 2, min=-6, max=6, step=0.25),
        ),
        controls(
            "minimization",
            ui.input_numeric("start", "x اولیه", 4, min=-8, max=8, step=1),
            ui.input_numeric("rate", "اندازهٔ گام α", 0.25, min=0.01, max=1.2, step=0.05),
            ui.input_numeric("steps", "تعداد گام", 6, min=0, max=20, step=1),
            ui.input_action_button("step", "یک گام جلو"),
        ),
        controls(
            "sampling",
            ui.input_numeric("mean_shift", "افزایش میانگین نیمهٔ دوم", 2, min=0, max=4, step=0.5),
            ui.input_numeric("noise", "انحراف معیار نویز", 0.2, min=0, max=1, step=0.1),
            ui.input_numeric(
                "correlation", "وابستگی نویز به نمونهٔ قبلی؛ ρ", 0.8, min=0, max=0.95, step=0.05
            ),
            ui.input_numeric("seed", "بذر تصادفی", 7, min=0, max=99999, step=1),
            ui.input_select(
                "block",
                "تعداد نمونه در هر بلوک",
                {str(i): str(i) for i in (10, 20, 25, 40, 50)},
                selected="25",
            ),
        ),
        controls(
            "graph",
            ui.input_select(
                "dataset",
                "ورودی شبکه",
                {"toy": "چهار نقطهٔ ساختگی", "protein": "1UBQ؛ مختصات واقعی Cα"},
            ),
            ui.input_numeric("cutoff", "آستانهٔ فاصله؛ آنگستروم", 4.1, min=3, max=12, step=0.1),
            ui.input_select(
                "exclude",
                "در ورودی پروتئین، حذف نزدیک‌های توالی",
                {"0": "بدون حذف", "1": "یک همسایه در هر طرف", "2": "دو همسایه در هر طرف"},
            ),
            ui.input_select("node", "گره انتخاب‌شده", {c: c for c in "ABCD"}, selected="B"),
        ),
        ui.div(
            ui.input_action_button("reset", "بازنشانی پارامترهای این آزمایش"),
            ui.tags.button("دریافت نتیجه و یادداشت‌ها", id="download", disabled=True, type="button"),
            class_="actions",
        ),
        ui.p(ui.output_text("status", inline=True), role="status", id="calculation-status"),
        ui.output_ui("readout"),
        ui.tags.canvas(
            id="experiment-plot",
            width="840",
            height="400",
            role="img",
            aria_label="نمودار نتیجهٔ محاسبه؛ عددهای دقیق در جدول زیر آمده‌اند",
        ),
        ui.output_ui("plot_caption"),
        ui.tags.details(ui.tags.summary("جدول عددهای محاسبه‌شده"), ui.output_ui("data_table")),
        ui.tags.section(
            ui.h2("کد Python و مقایسهٔ محاسبات"),
            ui.p(
                "پارامترها و خودِ روش را در کد تغییر بده. اجرای کد دکمهٔ جدا دارد؛ "
                "تغییر کنترل‌های بالای صفحه، پیش‌نویس تو را بازنویسی نمی‌کند."
            ),
            ui.tags.details(
                ui.tags.summary("نام، نوع و مقدار دقیق پارامترها"),
                ui.p("برای دیدن همهٔ ستون‌ها، جدول را افقی جابه‌جا کن.", class_="code-scroll-hint"),
                ui.div(id="code-parameters", class_="code-table-scroll", tabindex="0"),
                open=True,
            ),
            ui.p(id="code-challenge", class_="task"),
            ui.div(
                ui.tags.button(
                    "گرفتن پارامترهای فعلی", id="code-sync", type="button", disabled=True
                ),
                ui.tags.button(
                    "بازگرداندن نمونهٔ مرجع", id="code-reset", type="button", disabled=True
                ),
                class_="actions",
            ),
            ui.p(
                "کد نتیجه را در result می‌گذارد؛ inputs شامل points، labels و هش "
                "ورودی 1UBQ است. NumPy و کتابخانهٔ استاندارد Python آماده‌اند.",
                class_="caption",
            ),
            ui.div(id="code-editor"),
            ui.tags.textarea(
                id="python-source",
                rows="18",
                dir="ltr",
                spellcheck="false",
                aria_label="کد Python قابل ویرایش",
            ),
            ui.p(
                "اجرای کد: Ctrl+Enter یا ⌘+Enter. Tab از ویرایشگر خارج می‌شود.",
                id="code-editor-help",
                class_="caption",
            ),
            ui.p(id="code-save-status", role="status", class_="caption"),
            ui.div(
                ui.tags.button(
                    "اجرای کد", id="code-run", type="button", class_="code-primary", disabled=True
                ),
                ui.tags.button("توقف اجرا", id="code-stop", type="button", disabled=True),
                ui.tags.button(
                    "دریافت کد Python", id="code-download-source", type="button", disabled=True
                ),
                ui.tags.button(
                    "دریافت پروندهٔ اجرای کد",
                    id="code-download-result",
                    type="button",
                    disabled=True,
                ),
                class_="actions",
            ),
            ui.p("در حال دریافت نمونهٔ کد…", id="code-status", role="status"),
            ui.tags.details(
                ui.tags.summary("سه اجرای اخیر این آزمایش"),
                ui.tags.label("اجرای ذخیره‌شده", for_="code-history"),
                ui.tags.select(id="code-history", disabled=True),
                ui.tags.button(
                    "بارگذاری کد این اجرا", id="code-history-load", type="button", disabled=True
                ),
            ),
            ui.tags.section(
                ui.h3("خروجی کد شما"),
                ui.p("مقایسهٔ زیر اختلاف عددی با مرجع را نشان می‌دهد.", class_="caption"),
                ui.p("برای دیدن همهٔ ستون‌ها، جدول را افقی جابه‌جا کن.", class_="code-scroll-hint"),
                ui.div(id="code-comparison", class_="code-table-scroll", tabindex="0"),
                ui.tags.canvas(
                    id="code-plot",
                    width="840",
                    height="400",
                    role="img",
                    aria_label="نمودار خروجی کد شما",
                ),
                ui.div(id="code-legend"),
                ui.div(id="code-table", class_="code-table-scroll", tabindex="0"),
                ui.h3("کنسول Python"),
                ui.tags.pre(id="code-output", dir="ltr", tabindex="0"),
                ui.tags.pre(id="code-error", dir="ltr", tabindex="0", role="status"),
                id="code-result-area",
                hidden=True,
            ),
            id="code-workbench",
            class_="code-workbench",
        ),
        ui.tags.section(
            ui.h2("توضیح خودت را ثبت کن"),
            ui.tags.label("پیش‌بینی من پیش از تغییر پارامتر", for_="prediction"),
            ui.tags.textarea(id="prediction", rows="3", maxlength="6000"),
            ui.tags.label("چه دیدم و چرا؟", for_="reflection"),
            ui.tags.textarea(id="reflection", rows="3", maxlength="6000"),
            ui.p(
                "یادداشت‌ها برای هر آزمایش جدا در همین مرورگر ذخیره می‌شوند.",
                id="note-status",
                role="status",
            ),
        ),
        ui.tags.details(
            ui.tags.summary("روش محاسبه و منبع"),
            ui.p(
                (
                    "موتور محاسبه Python است. نمودار فقط خروجی محاسبه را رسم می‌کند. "
                    "نتیجهٔ دریافتی شامل تنظیمات، مختصات یا سری عددها و نسخهٔ محیط "
                    "اجراست."
                )
            ),
            ui.tags.a(
                "کد قابل دریافت و بررسی",
                href="/structural-bioinformatics/assets/course/interactive_lab.py",
                target="_blank",
            ),
            ui.p(
                ui.tags.a(
                    "منشأ ورودی 1UBQ",
                    href="/structural-bioinformatics/data/metadata/md-teaching-input.json",
                    target="_blank",
                )
            ),
            ui.p(
                ui.tags.a(
                    "راهنمای محاسبات هندسی VMD",
                    href="https://www.ks.uiuc.edu/Research/vmd/current/ug/node138.html",
                    target="_blank",
                    rel="noopener",
                )
            ),
        ),
        ui.tags.footer(
            "Python در مرورگر اجرا می‌شود؛ اجرای نخست به دریافت محیط محاسبه نیاز دارد."
            if sys.platform == "emscripten"
            else "Python در این پیش‌نمایش روی سرور محلی Shiny اجرا می‌شود."
        ),
        class_="lab-shell",
        dir="rtl",
        lang="fa",
    ),
    title="آزمایشگاه مفاهیم ساختاری",
)


def number(value):
    return f"{value:.6g}" if isinstance(value, (int, float)) else str(value)


def table(headers, rows):
    return ui.tags.table(
        ui.tags.thead(ui.tags.tr(*(ui.tags.th(h, scope="col") for h in headers))),
        ui.tags.tbody(
            *(ui.tags.tr(*(ui.tags.td(number(v), dir="ltr") for v in row)) for row in rows)
        ),
    )


def server(input, output, session):
    @reactive.effect
    @reactive.event(input.plot_ready)
    def initial_mode():
        mode = input.plot_ready().get("mode", "geometry")
        if mode in MODES:
            ui.update_select("experiment", selected=mode)

    @reactive.calc
    def snapshot():
        mode = input.experiment()
        try:
            if mode == "sequence":
                state = lab.sequence(input.dna())
            elif mode == "geometry":
                state = lab.geometry(PDB, input.shift(), input.angle(), input.deformation())
            elif mode == "energy":
                state = lab.populations(input.delta())
            elif mode == "minimization":
                state = lab.minimize(input.start(), input.rate(), input.steps())
            elif mode == "sampling":
                state = lab.sampling(
                    input.mean_shift(),
                    input.noise(),
                    input.correlation(),
                    input.seed(),
                    int(input.block()),
                )
            elif mode == "graph":
                state = lab.graph(
                    PDB, input.cutoff(), input.dataset(), int(input.exclude()), input.node()
                )
            else:
                raise ValueError("Unknown experiment")
            state["runtime"] = {"python": sys.version.split()[0], "numpy": np.__version__}
            state["coordinate_view"] = input.coordinate_view()
            return state
        except (ValueError, TypeError, OverflowError):
            return {
                "mode": mode,
                "error": (
                    "ورودی معتبر نیست؛ عددها را در بازهٔ کنار هر کنترل وارد کن. توالی فقط "
                    "می‌تواند ۱ تا ۳۰۰ حرف A، C، G و T داشته باشد."
                ),
            }

    @reactive.effect
    async def send_state():
        input.plot_ready()
        await session.send_custom_message("structural_experiment", snapshot())

    @reactive.effect
    @reactive.event(input.dataset)
    def graph_choices():
        labels = lab.reference(PDB)[0] if input.dataset() == "protein" else list("ABCD")
        selected = "A:21" if input.dataset() == "protein" else "B"
        ui.update_select("node", choices=labels, selected=selected)

    @reactive.effect
    @reactive.event(input.picked_node)
    def picked_node():
        state = snapshot()
        if state["mode"] == "graph" and input.picked_node() in state.get("labels", []):
            ui.update_select("node", selected=input.picked_node())

    @reactive.effect
    @reactive.event(input.step)
    def advance():
        value = input.steps()
        if value is not None and value == int(value) and 0 <= value < 20:
            ui.update_numeric("steps", value=int(value) + 1)

    @reactive.effect
    @reactive.event(input.reset)
    def reset():
        defaults = {
            "geometry": {"shift": 10, "angle": 0, "deformation": 0},
            "energy": {"delta": 2},
            "minimization": {"start": 4, "rate": 0.25, "steps": 6},
            "sampling": {"mean_shift": 2, "noise": 0.2, "correlation": 0.8, "seed": 7},
            "graph": {"cutoff": 4.1},
        }
        for key, value in defaults.get(input.experiment(), {}).items():
            ui.update_numeric(key, value=value)
        if input.experiment() == "sequence":
            ui.update_text_area("dna", value="ATGGCTTAA")
        if input.experiment() == "sampling":
            ui.update_select("block", selected="25")
        if input.experiment() == "geometry":
            ui.update_radio_buttons("coordinate_view", selected="raw")
        if input.experiment() == "graph":
            ui.update_select("dataset", selected="toy")
            ui.update_select("exclude", selected="0")
            ui.update_select("node", choices=list("ABCD"), selected="B")

    @render.ui
    def brief():
        definition, task, limit, topic = BRIEFS[input.experiment()]
        return ui.div(
            ui.p(definition),
            ui.p(task, class_="task"),
            ui.p(limit, class_="caption"),
            ui.tags.a(
                "خواندن توضیح کامل این مبحث",
                href=f"/structural-bioinformatics/course.html?topic={topic}",
                target="_top",
            ),
        )

    @render.text
    def status():
        return snapshot().get("error", "محاسبه با ورودی فعلی انجام شد.")

    @render.ui
    def readout():
        s = snapshot()
        if "error" in s:
            return ui.p("پس از اصلاح ورودی، نتیجه تازه می‌شود.")
        mode = s["mode"]
        if mode == "geometry":
            rows = [
                ("RMSD خام؛ Å", s["raw_rmsd"]),
                ("RMSD پس از هم‌ترازی؛ Å", s["fitted_rmsd"]),
                ("Rg مرجع؛ Å", s["reference_rg"]),
                ("Rg مدل تغییرکرده؛ Å", s["moving_rg"]),
            ]
        elif mode == "sequence":
            rows = [("طول رشته", s["length"]), ("درصد GC", s["gc_percent"])]
        elif mode == "energy":
            rows = [("احتمال B", s["probability_b"]), ("نسبت جمعیت B به A", s["ratio"])]
        elif mode == "minimization":
            rows = [("x نهایی", s["positions"][-1]), ("U نهایی", s["energies"][-1])]
        elif mode == "sampling":
            rows = [
                ("میانگین کل", s["mean"]),
                ("کمترین میانگین بلوک", min(s["block_means"])),
                ("بیشترین میانگین بلوک", max(s["block_means"])),
            ]
        else:
            rows = [
                ("گره", len(s["labels"])),
                ("یال", len(s["edges"])),
                ("درجهٔ گره انتخاب‌شده", len(s["neighbors"])),
            ]
        return ui.tags.dl(
            *(
                ui.div(ui.tags.dt(label), ui.tags.dd(number(value), dir="ltr"))
                for label, value in rows
            ),
            class_="readout",
        )

    @render.ui
    def plot_caption():
        mode = input.experiment()
        captions = {
            "geometry": (
                "تصویر دوبعدی x–y از مختصات سه‌بعدی: مرجع آبی پیوسته و مدل تغییرکرده "
                "نارنجی خط‌چین است. محاسبهٔ RMSD هر سه بُعد را استفاده می‌کند."
            ),
            "sequence": "ستون‌ها شمار هر باز را نشان می‌دهند. ترتیب حروف در جدول ثبت شده است.",
            "energy": "محور افقی ΔG/kBT و محور عمودی احتمال B است؛ نقطه ورودی فعلی را نشان می‌دهد.",
            "minimization": (
                "محور افقی شمار گام الگوریتم و محور عمودی x است. جدول انرژی U را نیز نگه می‌دارد."
            ),
            "sampling": "سری ساختگی آبی، میانگین کل خط‌چین تیره و میانگین هر بلوک پلهٔ نارنجی است.",
            "graph": (
                "یال‌ها از فاصلهٔ سه‌بعدی محاسبه شده‌اند؛ تصویر، نمای x–y است. گره "
                "انتخاب‌شده نارنجی و همسایه‌های آن آبی‌اند. روی یک گره کلیک کن یا از "
                "فهرست انتخاب کن."
            ),
        }
        return ui.p(captions[mode], class_="caption")

    @render.ui
    def data_table():
        s = snapshot()
        if "error" in s:
            return None
        mode = s["mode"]
        if mode == "sequence":
            return table(
                ["نوع رشته", "توالی"],
                [
                    ["DNA 5′→3′", s["config"]["dna"]],
                    ["مکمل 3′→5′", s["complement_3_to_5"]],
                    ["مکمل معکوس 5′→3′", s["reverse_complement_5_to_3"]],
                    ["RNA آموزشی 5′→3′", s["rna_5_to_3"]],
                ],
            )
        if mode == "geometry":
            return table(
                ["جایگاه", "فاصلهٔ خام؛ Å", "پس از هم‌ترازی؛ Å"],
                [
                    [
                        label,
                        float(np.linalg.norm(np.array(s["fixed"][i]) - s["moving"][i])),
                        float(np.linalg.norm(np.array(s["fixed"][i]) - s["fitted"][i])),
                    ]
                    for i, label in enumerate(s["labels"])
                ],
            )
        if mode == "energy":
            return table(
                ["حالت", "احتمال"], [["A", 1 - s["probability_b"]], ["B", s["probability_b"]]]
            )
        if mode == "minimization":
            return table(
                ["گام", "x", "U=x²"],
                [[i, x, s["energies"][i]] for i, x in enumerate(s["positions"])],
            )
        if mode == "sampling":
            return table(["بلوک", "میانگین"], [[i + 1, v] for i, v in enumerate(s["block_means"])])
        return table(["همسایه", "فاصلهٔ سه‌بعدی؛ Å"], s["neighbors"])


app = App(app_ui, server, static_assets=HERE / "www")
