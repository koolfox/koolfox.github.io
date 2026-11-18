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
        ui.tags.link(rel="stylesheet", href="bioml-ui.css"),
        ui.tags.link(rel="stylesheet", href="app.css"),
        ui.tags.script(src="vendor/molstar/molstar.js"),
        ui.tags.script(type="module", src="viewer.js"),
    ),
    ui.tags.main(
        {"dir": "rtl", "lang": "fa", "class": "bio-review"},
        ui.tags.header(
            ui.h1("بازبینی پپتید و TNF"),
            ui.p(
                "این نتیجه اکتشافی است. امتیاز Vina نشان‌دهنده میل اتصال آزمایشگاهی "
                "یا اثر درمانی نیست.",
                class_="review-note",
            ),
        ),
        ui.div(
            {"class": "layout"},
            ui.tags.section(
                {"class": "panel controls"},
                ui.h2("نمونه و نتایج"),
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
                    "حالت ذخیره‌شده",
                    {"1": "حالت ۱", "2": "حالت ۲", "3": "حالت ۳"},
                    selectize=False,
                ),
                ui.output_ui("result"),
            ),
            ui.tags.section(
                {"class": "panel visual"},
                ui.div(
                    {"class": "visual-head"},
                    ui.h2("نمای سه‌بعدی"),
                    ui.span("گیرنده آبی، پپتید نارنجی"),
                ),
                ui.div(
                    {
                        "id": "molecule-viewer",
                        "data-state": "loading",
                        "role": "group",
                        "aria-label": "نمای نواری گیرنده و نمای اتم و پیوند پپتید انتخاب‌شده",
                    },
                    ui.div("در حال بارگذاری نمای سه‌بعدی…", class_="bio-status", role="status"),
                ),
                ui.p(
                    "مدل را بچرخانید یا یک اسید آمینه را در نوار توالی انتخاب کنید.",
                    class_="viewer-help",
                ),
                ui.div(
                    {"class": "downloads"},
                    ui.h3("دریافت فایل‌ها"),
                    ui.div(
                        ui.a(
                            "گیرنده PDBQT",
                            href="data/receptor.pdbqt",
                            download="receptor.pdbqt",
                        ),
                        ui.output_ui("pose_download"),
                        ui.output_ui("pymol_download"),
                        class_="download-links",
                    ),
                ),
            ),
        ),
        ui.tags.details(
            {"class": "methods"},
            ui.tags.summary("منبع داده و محدودیت‌ها"),
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
    class_="bio-ui",
    lang="fa",
)


def server(input, output, session):
    @render.ui
    def result():
        seq = input.candidate()
        i = int(input.pose()) - 1
        return ui.tags.dl(
            {
                "class": "metrics",
                "id": "result-values",
                "data-candidate": seq,
                "data-pose": str(i + 1),
            },
            ui.div(
                ui.tags.dt("امتیاز Vina"),
                ui.tags.dd(
                    ui.tags.bdi(ui.strong(f"{SCORES[seq][i]:.3f}"), " kcal/mol", dir="ltr"),
                ),
            ),
            ui.div(
                ui.tags.dt("کمترین فاصله اتم سنگین"),
                ui.tags.dd(ui.tags.bdi(ui.strong(f"{DISTANCES[seq][i]:.3f}"), " Å", dir="ltr")),
            ),
            ui.div(
                ui.tags.dt("اتم سنگین بیرون جعبه"),
                ui.tags.dd(ui.strong("0"), " از ۶۶ اتم پپتید"),
            ),
        )

    @render.ui
    def pymol_download():
        seq = input.candidate()
        pose = int(input.pose())
        return ui.a(
            "دریافت فایل آماده PyMOL (حالت انتخابی)",
            href=f"data/{seq}-{pose}.pml",
            download=f"{seq}-{pose}.pml",
        )

    @render.ui
    def pose_download():
        seq = input.candidate()
        return ui.a("سه حالت پپتید PDBQT", href=f"data/{seq}.pdbqt", download=f"{seq}.pdbqt")


app = App(app_ui, server, static_assets=HERE / "www")
