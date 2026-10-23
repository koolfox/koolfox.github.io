"""Render all thirty course sessions from course-sessions.json with resolvable source links."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(project=PROJECT):
    curriculum = json.loads((project / "data/metadata/course-sessions.json").read_text())
    records = json.loads((project / "data/metadata/review-sources.json").read_text())
    sources = {item["id"]: item for item in records["sources"]}
    fa = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
    out = [
        "# درس‌نامهٔ سی جلسه؛ از مفهوم تا تمرین و مقاله",
        "",
        "این درس‌نامه ترتیب همان سرفصل ۳۰ جلسه‌ای را دنبال می‌کند. "
        "هشت هفتهٔ سایت هشت بستهٔ ارائهٔ دانشجو هستند و تاریخ یا سرعت تدریس استاد را "
        "تعیین نمی‌کنند. "
        "شروع هر بسته به رسیدن کلاس به پیش‌نیازهای آن وابسته است.",
        "",
        "برای استفاده: ابتدا [نقشهٔ پروژه](course-guide.fa.md)، سپس جلسهٔ جاری همین درس‌نامه، "
        "و بعد [بستهٔ ارائهٔ هفتگی](weekly-plan.fa.md) را باز کنید. "
        "[مسیر RNA-seq و RA](rnaseq-research-plan.fa.md) مکمل این سرفصل است.",
        "",
        "هر جلسه سؤال، توضیح، تمرین، تحویلی و منبع دارد. "
        "تمرین پیشنهادی یا نمونهٔ دستور تا وقتی خروجی و شرایط اجرای آن ثبت نشده، "
        "نتیجهٔ اجراشده نیست. "
        "وضعیت دسترسی منابع و موارد حل‌نشده در [گزارش "
        "بازبینی](comprehensive-review.fa.md) آمده است.",
        "",
    ]
    for entry in curriculum["sessions"]:
        num = str(entry["session"]).translate(fa)
        out.extend(
            [
                f"## جلسهٔ {num}. {entry['title']}",
                "",
                f"**پرسش جلسه:** {entry['question']}",
                "",
                entry["lesson"],
                "",
                f"**مثال توضیح‌داده‌شده:** {entry['worked_example']}",
                "",
                f"**خودسنجی:** {entry['self_check']}",
                "",
                f"**پاسخ و علت:** {entry['answer']}",
                "",
                f"**تمرین مرحله‌ای:** {entry['exercise']}",
                "",
                f"**تحویلی و معیار پایان:** {entry['deliverable']}",
                "",
            ]
        )
        links = []
        for key in entry["sources"]:
            source = sources[key]
            href = source.get("url") or "../" + source["path"]
            links.append(f"[{source['title']}]({href})")
        out.extend(["**منابع این جلسه:** " + "؛ ".join(links), ""])
    return "\n".join(out)


if __name__ == "__main__":
    (PROJECT / "docs/course-sessions.fa.md").write_text(render())
