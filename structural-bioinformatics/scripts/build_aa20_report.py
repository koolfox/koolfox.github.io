"""Render the 20-candidate technical result table from its recorded JSON."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(report):
    lines = [
        "# نتیجهٔ تک‌به‌تک ۲۰ دی‌پپتید در آزمون فنی",
        "",
        "این جدول از اجرای 1UBQ و فایل JSON ذخیره‌شده ساخته شده است. "
        "هر توالی با A شروع می‌شود و حرف دوم یکی از ۲۰ آمینواسید استاندارد است. "
        "این یک آزمون فنی است، نه آزمون TNF یا اندازه‌گیری اتصال.",
        "",
        "| توالی | تعداد حالت ذخیره‌شده | امتیاز نخست Vina (kcal/mol) | "
        "کمترین فاصلهٔ اتم سنگین در حالت‌ها (Å) | یادداشت |",
        "|---|---:|---:|---:|---|",
    ]
    for row in report["candidates"]:
        poses = row["poses"]
        minimum = min(p["minimum_heavy_atom_distance_angstrom"] for p in poses)
        note = "تماس نزدیک؛ بررسی دقیق‌تر" if minimum < 2.5 else "نیازمند اعتبارسنجی"
        lines.append(
            f"| `{row['sequence']}` | {len(poses)} | `{poses[0]['vina_score_kcal_mol']:.3f}` | "
            f"`{minimum:.3f}` | {note} |"
        )
    lines.extend(
        [
            "",
            "درخواست سه حالت همیشه به ذخیرهٔ سه حالت منجر نشده است؛ تعداد واقعی در جدول آمده است. "
            "حد ۲٫۵ آنگستروم اینجا فقط برای علامت‌گذاری است و بدون نوع اتم و هندسه، "
            "نوع برهم‌کنش را تعیین نمی‌کند. امتیاز Vina میل اتصال یا اثربخشی نیست.",
            "",
            "[گزارش محاسبات و هش‌ها](../data/processed/general-aa20-demo.json) · "
            "[ورودی ساختار 1UBQ](../assets/course/gromacs/1ubq-protein.pdb)",
            "",
        ]
    )
    return "\n".join(lines)


def main():
    report = json.loads((PROJECT / "data/processed/general-aa20-demo.json").read_text())
    (PROJECT / "docs/aa20-results.fa.md").write_text(render(report))


if __name__ == "__main__":
    main()
