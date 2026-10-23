# راهنمای یافتن و دریافت داده‌ها؛ قدم‌به‌قدم

> **جای این سند در مسیر:** [نقشهٔ واحد پروژه](course-guide.fa.md) · [جلسات درس](course-sessions.fa.md) · [پروتکل RNA-seq](rnaseq-research-plan.fa.md) · [اصلاح‌ها و موارد باز](comprehensive-review.fa.md).

**هدف:** هر کسی، بدون کمک ما، بتواند همان داده‌هایی را پیدا کند که در این پروژه استفاده شده‌اند و نتایج را کنترل کند. برای هر داده سه چیز آمده است: کجا آن را ببینیم، چگونه دانلود کنیم و چگونه درستی فایل را کنترل کنیم. شناسه‌ها و هش‌ها از فایل‌های `data/metadata/` خوانده شده‌اند.

## ۱. ساختارهای پروتئین (PDB)

**PDB** بانک جهانی ساختارهای سه‌بعدی مولکول‌هاست. هر ساختار یک شناسهٔ چهارحرفی دارد. **RCSB** یکی از درگاه‌های این بانک است.

| شناسه | محتوا | صفحهٔ ساختار | فایل مختصات |
| --- | --- | --- | --- |
| 3WD5 | TNF + Fab آدالیموماب؛ X-ray، `3.1 Å` | [rcsb.org/structure/3WD5](https://www.rcsb.org/structure/3WD5) | `https://files.rcsb.org/download/3WD5.cif` |
| 1TNF | TNF سه‌تایی بدون دارو؛ `2.6 Å` | [rcsb.org/structure/1TNF](https://www.rcsb.org/structure/1TNF) | `https://files.rcsb.org/download/1TNF.cif` |

**دیدن در مرورگر:** در صفحهٔ ساختار، روی نمایشگر Mol* کلیک کنید. زنجیره‌ها را با نام نویسنده ببینید: در 3WD5، `A` برای TNF، `H` برای زنجیرهٔ سنگین و `L` برای زنجیرهٔ سبک.

**دانلود با خط فرمان:**

```sh
curl -O https://files.rcsb.org/download/3WD5.cif
shasum -a 256 3WD5.cif
```

هشی که دریافت کرده‌اید را با `data/metadata/structure-downloads.json` مقایسه کنید. اگر RCSB فایل را بازنگری کرده باشد، هش متفاوت می‌شود. در آن صورت تاریخ دریافت را ثبت کنید و تحلیل را دوباره اجرا کنید.

**اطلاعات کلیدی داخل فایل mmCIF** که برای مقاله لازم است:

| آنچه می‌خواهیم | نام فیلد در mmCIF | مقدار در 3WD5 |
| --- | --- | --- |
| تفکیک‌پذیری | `_refine.ls_d_res_high` | `3.101` |
| R-work / R-free (کیفیت مدل) | `_refine.ls_R_factor_R_work` / `_R_free` | `0.1867` / `0.2750` |
| گروه فضایی و یاخته | `_symmetry.space_group_name_H-M` و `_cell` | `I 21 3`، `161.849 Å` |
| تفاوت توالی با UniProt | `_struct_ref_seq_dif` | جایگاه ۳۱: Asp به‌جای Arg، `conflict` |
| اسمبلی زیستی | `_pdbx_struct_assembly` | «trimeric»، ولی فقط عملگر همانی |

**کنترل اجراشدهٔ سطح:** مقایسه با FreeSASA و دو روش عددی در [گزارش نتایج](full-epitope-results.fa.md?chapter=chapter-4) و [رکورد اجرا](../data/processed/surface-crosscheck.json) ثبت است. فرمان آن در انتهای همین راهنما آمده است. سرویس [PDBe PISA](https://www.ebi.ac.uk/pdbe/pisa/) گزینهٔ دیگری است، اما در پروژه اجرا نشده؛ خروجی پیش‌فرض یک assembly سپرده‌شده را بدون تطبیق زنجیره، تقارن، شعاع و قرارداد مجموع/نصف، با TNF سه‌تایی و Fab گروه‌شده یکسان ندانید.

## ۲. توالی‌ها (UniProt و RefSeq)

| داده | شناسه | لینک | فایل در مخزن |
| --- | --- | --- | --- |
| پروتئین TNF انسانی، مرجع UniProt | P01375 | [uniprot.org/uniprotkb/P01375](https://www.uniprot.org/uniprotkb/P01375) | — |
| mRNA انسانی TNF | NM_000594.4 | [ncbi.nlm.nih.gov/nuccore/NM_000594.4](https://www.ncbi.nlm.nih.gov/nuccore/NM_000594.4) | `data/sequences/TNF_NM_000594.4.fasta` |
| پروتئین TNF، RefSeq | NP_000585.2 | [ncbi.nlm.nih.gov/protein/NP_000585.2](https://www.ncbi.nlm.nih.gov/protein/NP_000585.2) | `data/sequences/TNF_NP_000585.2.fasta` |
| زنجیره‌های Fab در 3WD5 | 3WD5 H/L | از فایل مختصات | `data/sequences/3WD5_H_resolved.fasta` و `3WD5_L_resolved.fasta` |

```sh
curl "https://rest.uniprot.org/uniprotkb/P01375.fasta"
```

**نکتهٔ شماره‌گذاری:** TNF محلول از جایگاه ۷۷ پروتئین کامل شروع می‌شود. پس جایگاه ۲۱ در 3WD5 برابر جایگاه ۹۷ در UniProt است: شمارهٔ 3WD5 به‌علاوهٔ ۷۶. فایل mmCIF این تطبیق را در `_struct_ref_seq` ثبت کرده است (1–157 ↔ 77–233).

## ۳. داده‌های RNA-seq بیماران (GEO)

**GEO** بانک داده‌های بیان ژن در NCBI است. دیتاست آموزشی ما:

| فیلد | مقدار |
| --- | --- |
| شناسه | [GSE138746](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE138746) |
| طراحی | RNA پیش از شروع آدالیموماب یا اتانرسپت؛ پاسخ بالینی در ماه ۶ |
| ماتریس PBMC نویسندگان | ۷۹ ستون نمونه؛ ۳۷ ستون آدالیموماب؛ ۱۸۳۳۳ ردیف ژن |
| فایل متادیتا | `GSE138746_series_matrix.txt.gz` |
| فایل شمارش PBMC | `GSE138746_Counts_Normalization_PBMC.csv.gz` |

```sh
curl -O https://ftp.ncbi.nlm.nih.gov/geo/series/GSE138nnn/GSE138746/matrix/GSE138746_series_matrix.txt.gz
curl -O https://ftp.ncbi.nlm.nih.gov/geo/series/GSE138nnn/GSE138746/suppl/GSE138746_Counts_Normalization_PBMC.csv.gz
```

هش این دو فایل در `data/metadata/ra-rnaseq-learning.json` ثبت شده است. برای ساختن خلاصهٔ گروهی، دو فایل را در `structural-bioinformatics/data/raw/gse138746/` بگذارید (این پوشه commit نمی‌شود) و `scripts/summarize_rnaseq_groups.py` را اجرا کنید. اسکریپت پیش از هر محاسبه هش‌ها را کنترل می‌کند و فقط خلاصهٔ گروه‌ها را می‌نویسد، نه مقدار هر بیمار. **مهم:** این RNA فقط پیش از درمان گرفته شده است. پس «تغییر بیان پس از آدالیموماب» را نمی‌توان از آن برآورد کرد. هر بیمار یک واحد مستقل است، نه هر کتابخانه.

## ۴. داده‌های مقالات مرور‌شده

| مقاله | داده | دسترسی |
| --- | --- | --- |
| Hu 2013 | 3WD5 | آزاد؛ بخش ۱ |
| Bianchi 2026 | دو مدل آدالیموماب/TNF | [Dataverse دانشگاه میلان](https://doi.org/10.13130/RD_UNIMI/FULQXI)؛ CC BY 4.0؛ مدل محاسباتی است، نه ساختار تجربی |
| Marguerie 2025 | RNA-seq حذف SIRPG | [GSE296196](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE296196)؛ گروه آدالیموماب ندارد |
| Gehin 2024 | دادهٔ کارآزمایی ADMYRA | عمومی نیست؛ طبق مقاله با درخواست از Sandoz |
| Tao 2021 | GSE138746 | بخش ۳ |

شرح کامل هر مقاله: [معنی مقاله‌ها](paper-explanations.fa.md) و [مرور و نقد](literature-review.fa.md).

## ۵. بازسازی همهٔ نتایج این مخزن

```sh
uv sync --project structural-bioinformatics --frozen
uv run --project structural-bioinformatics tnf-atlas fetch-structures   # نیاز به اینترنت
uv run --project structural-bioinformatics tnf-atlas analyze
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/analyze_structural_feasibility.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/analyze_full_epitope.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/export_epitope_lab.py
uv run --project structural-bioinformatics pytest -q
```

| خروجی | فایل | سند توضیح |
| --- | --- | --- |
| تماس‌های یک‌زیرواحدی | `data/processed/interface-summary.json` | [روش تماس](structural-method.fa.md) |
| سطح رابط و کنترل جداسازی | `data/processed/structural-feasibility.json` | [تحلیل سطح](structural-feasibility-results.fa.md) |
| اپی‌توپ کامل روی سه‌تایی | `data/processed/full-epitope.json` | [اپی‌توپ کامل](full-epitope-results.fa.md) |
| دادهٔ خرده‌آزمایش‌های مرورگر | `data/processed/epitope-lab.json` | [بخش خرده‌آزمایش‌ها](../?tab=lab#epitope-lab) |
| خلاصهٔ گروهی RNA-seq (فقط میانه و چارک‌ها) | `data/processed/rnaseq-group-summary.json` | [خلاصهٔ گروه‌های پاسخ](../?tab=methods#rnaseq-groups) |

اگر عددی در متن با فایل JSON فرق داشت، فایل JSON مرجع است و متن باید اصلاح شود.

**کنترل FreeSASA:**

```sh
uv run --project structural-bioinformatics --frozen --group validation python structural-bioinformatics/scripts/crosscheck_surface.py
```
