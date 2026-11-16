"""Offline Shiny review of two explicitly approved exploratory docking examples."""

from pathlib import Path

from shiny import App, render, ui

HERE = Path(__file__).resolve().parent
SCORES = {"TWNSGHID": [-2.425, -2.190, -1.901], "DIHGNSWT": [-1.822, -1.737, 0.506]}
DISTANCES = {
    "TWNSGHID": [2.822622893693026, 3.0268191224452083, 2.9298133046322246],
    "DIHGNSWT": [2.823174277298517, 2.8811827432497235, 2.8494102898670137],
}

app_ui = ui.page_fluid(
    ui.tags.head(
        ui.tags.meta(charset="utf-8"),
        ui.tags.link(rel="stylesheet", href="vendor/molstar/molstar.css"),
        ui.tags.link(rel="stylesheet", href="app.css"),
        ui.tags.script(src="vendor/molstar/molstar.js"),
        ui.tags.script(type="module", src="viewer.js"),
    ),
    ui.div(
        {"dir": "rtl", "lang": "fa", "class": "shell"},
        ui.h1("بررسی پپتید و TNF"),
        ui.div(
            {"class": "warning"},
            "این نتیجه اکتشافی است؛ امتیاز Vina، میل اتصال آزمایشگاهی یا اثر درمانی نیست.",
        ),
        ui.div(
            {"class": "layout"},
            ui.div(
                {"class": "panel controls"},
                ui.h2("انتخاب نمونه"),
                ui.input_select(
                    "candidate",
                    "پپتید",
                    {
                        "TWNSGHID": "TWNSGHID · قطعه انتخابی آدالیموماب",
                        "DIHGNSWT": "DIHGNSWT · توالی درهم‌ریخته",
                    },
                    selectize=False,
                ),
                ui.input_select(
                    "pose",
                    "حالت داکینگ",
                    {"1": "حالت ۱", "2": "حالت ۲", "3": "حالت ۳"},
                    selectize=False,
                ),
                ui.output_ui("result"),
                ui.h3("فایل‌های مختصات"),
                ui.a("دریافت گیرنده PDBQT", href="data/receptor.pdbqt", download="receptor.pdbqt"),
                ui.br(),
                ui.output_ui("pose_download"),
                ui.br(),
                ui.output_ui("pymol_download"),
            ),
            ui.div(
                {"class": "panel visual"},
                ui.div(
                    {"class": "visual-head"},
                    ui.h2("نمای سه‌بعدی"),
                    ui.span("گیرنده · آبی  /  پپتید · نارنجی"),
                ),
                ui.div(
                    {
                        "id": "molecule-viewer",
                        "data-state": "loading",
                        "role": "img",
                        "aria-label": "نمای نواری گیرنده و نمای اتم و پیوند پپتید انتخاب‌شده",
                    },
                    "در حال آماده‌سازی نمایشگر…",
                ),
                ui.p(
                    "مدل را بچرخانید یا روی یک اسید آمینه در نوار توالی کلیک کنید.",
                    class_="small",
                ),
            ),
        ),
        ui.tags.details(
            {"class": "methods"},
            ui.tags.summary("درباره داده و محدودیتها"),
            ui.p(
                "گیرنده یک مونومر TNF آماده شده از 7TA3 است. توالی درهم ریخته "
                "ترکیب یکسانی دارد، اما کنترل منفی تجربی تایید شده نیست."
            ),
            ui.p(
                "پیوندهای پپتید و ساختار ثانویه گیرنده برای نمایش تخمین زده شده اند. "
                "فایل پپتید شامل سه حالت است؛ باز شدن اسکریپت در PyMOL بررسی نشده است."
            ),
            ui.p(
                "هر دو اجرا با جعبه ثابت، بذر ۴۲ و یک شکل اولیه انجام شده اند. جستجو به "
                "۲۵٬۰۰۰ ارزیابی و بهینه سازی MMFF94 به ۵٬۰۰۰ گام محدود بود. کنترل هندسی "
                "فاصله اتمهای سنگین و خروج از جعبه را بررسی میکند؛ نبود برخورد شدید "
                "به معنای درستی حالت اتصال نیست."
            ),
            ui.p(
                "برای نتیجه گیری به کنترلهای بیشتر، بذرها و شکلهای اولیه مستقل، روش مناسب "
                "پپتید منعطف، هدف چندزنجیره ای و آزمون تجربی نیاز است."
            ),
            ui.p(
                "منبع ساختار: ",
                ui.a(
                    "RCSB PDB: 7TA3",
                    href="https://www.rcsb.org/structure/7TA3",
                    target="_blank",
                    rel="noopener noreferrer",
                ),
                "؛ فایلهای این نمونه مشتقات آماده سازی و داکینگ هستند. مشخصات و SHA-256 "
                "در README همراه برنامه ثبت شده اند.",
            ),
        ),
    ),
)


def server(input, output, session):
    @render.ui
    def result():
        seq = input.candidate()
        i = int(input.pose()) - 1
        return ui.div(
            {
                "class": "metrics",
                "id": "result-values",
                "data-candidate": seq,
                "data-pose": str(i + 1),
            },
            ui.div(
                ui.span("امتیاز Vina"),
                ui.strong(f"{SCORES[seq][i]:.3f}"),
                ui.tags.small("kcal/mol"),
            ),
            ui.div(
                ui.span("کمترین فاصله اتم سنگین"),
                ui.strong(f"{DISTANCES[seq][i]:.3f}"),
                ui.tags.small("Å"),
            ),
            ui.div(
                ui.span("اتم سنگین بیرون جعبه"), ui.strong("0"), ui.tags.small("از ۶۶ اتم پپتید")
            ),
        )

    @render.ui
    def pymol_download():
        seq = input.candidate()
        pose = int(input.pose())
        return ui.a(
            "دریافت فایل آماده PyMOL", href=f"data/{seq}-{pose}.pml", download=f"{seq}-{pose}.pml"
        )

    @render.ui
    def pose_download():
        seq = input.candidate()
        return ui.a("دریافت سه حالت پپتید PDBQT", href=f"data/{seq}.pdbqt", download=f"{seq}.pdbqt")


app = App(app_ui, server, static_assets=HERE / "www")
