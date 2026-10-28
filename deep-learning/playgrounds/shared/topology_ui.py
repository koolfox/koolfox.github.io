"""Shared presentation of the actual network, independent of training controls."""

from shiny import ui


def topology_panel():
    return ui.tags.section(
        ui.h2("لایه‌ها و جریان محاسبه"),
        ui.tags.p("در انتظار وزن‌های مدل…", id="network-architecture", class_="caption"),
        ui.tags.div(
            ui.tags.div(
                ui.tags.label("ورودیِ عبور رو به جلو", for_="network-probe"),
                ui.tags.select(ui.tags.option("در انتظار داده"), id="network-probe"),
            ),
            ui.tags.button(
                "نمایش عبور ورودی",
                type="button",
                id="network-forward",
                class_="btn primary",
            ),
            ui.tags.button(
                "نمایش همهٔ مقدارها", type="button", id="network-reveal", class_="btn"
            ),
            class_="network-actions",
        ),
        ui.tags.div(
            ui.tags.canvas(
                id="network",
                width="960",
                height="430",
                role="img",
                aria_label="لایه‌ها و وزن‌های واقعی؛ مقدار هر نورون در جدول هم آمده است",
            ),
            class_="network-scroll",
            tabindex="0",
            role="region",
            aria_label="نمودار لایه‌ها؛ در صفحهٔ کوچک افقی حرکت بده",
        ),
        ui.tags.p(
            "برای عبور ثابت، آموزش را متوقف کن. عدد دایره گرد شده است؛ جدول جزئیات بیشتری دارد. حرکت فقط ترتیب محاسبه را نشان می‌دهد.",
            class_="caption",
        ),
        ui.tags.p(
            "خط‌چین: وزن منفی؛ ضخامت: بزرگی وزن. اگر لایه بیش از هشت نورون داشته باشد، هشت مورد اول رسم می‌شوند و همهٔ مقدارها در جدول‌اند.",
            class_="caption",
        ),
        ui.tags.p("", id="network-flow-status", role="status", class_="caption"),
        ui.tags.p(
            "در نمایش کوچک، نمودار را افقی حرکت بده؛ هنگام نمایش عبور، نمای نمودار لایهٔ فعال را دنبال می‌کند.",
            class_="caption network-scroll-hint",
        ),
        ui.tags.div(id="network-trace", class_="network-trace"),
        id="network-structure",
        class_="network-focus",
        aria_label="ساختار و عبور رو به جلوی شبکه",
    )
