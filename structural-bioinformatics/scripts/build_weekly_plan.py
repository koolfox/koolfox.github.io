"""Retired weekly-plan URL: retain a textual pointer to the one chapter curriculum."""

from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(*_args):
    return (
        "# برنامهٔ ارائه در همان فصل‌های درس\n\n"
        "برنامهٔ هفتگیِ مستقل کنار گذاشته شده است. "
        "[صفحهٔ واحد درس](../index.html) را باز و از فصل موردنظر، "
        "بخش «ارائه و آزمون» را انتخاب کنید. "
        "[متن ارائه‌ها](chapter-presentation.fa.md) نیز مطابق همان نه فصل است.\n"
    )


if __name__ == "__main__":
    (PROJECT / "docs/weekly-plan.fa.md").write_text(render())
