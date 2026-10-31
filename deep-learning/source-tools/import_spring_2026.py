"""Import hash-pinned original PDFs; index their exact PDFium text per page.

All21 source covers were visually checked on2026-10-31: CC BY-NC-SA,
without a printed license version. This observation is not inferred from text.
No PDF bytes or scientific source content are modified by this tool.
"""
import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
TERM = 'spring-2026'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    metadata = ROOT / f'data/metadata/{TERM}.json'
    document = json.loads(metadata.read_text())
    term = document['term']
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    records = []
    for row in term['schedule']:
        if not row['slides']:
            continue
        assert len(row['slides']) == 1
        source = row['slides'][0]
        cached = args.cache / (source['sha256'] + '.pdf')
        data = cached.read_bytes()
        assert hashlib.sha256(data).hexdigest() == source['sha256'], row['id']
        local = f'assets/danna/{TERM}/{row["id"]}.pdf'
        target = ROOT / local
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            assert target.read_bytes() == data, 'Refuse to replace another source'
        else:
            shutil.copyfile(cached, target)
        pdf = pdfium.PdfDocument(str(target))
        assert len(pdf) == source['page_count'], row['id']
        pages = []
        for index in range(len(pdf)):
            page = pdf[index]
            text = page.get_textpage()
            lines = [re.sub(r'\s+', ' ', line).strip()
                     for line in text.get_text_range().splitlines() if line.strip()]
            pages.append({'number': index+1,
                          'source_text_sha256': hashlib.sha256('\n'.join(lines).encode()).hexdigest(),
                          'lines': lines})
            text.close()
            page.close()
        pdf.close()
        catalog = {'schema_version': 1, 'term_id': TERM, 'session_id': row['id'],
                   'source': {'url': source['url'], 'local_url': '/deep-learning/'+local,
                              'sha256': source['sha256'], 'page_count': source['page_count'],
                              'license_notice': 'CC BY-NC-SA; version not printed on cover'},
                   'extractor': {'name': 'pypdfium2', 'version': str(pdfium.PYPDFIUM_INFO)},
                   'pages': pages}
        path = ROOT / f'content/source-slides/{TERM}/{row["id"]}.json'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n')
        records.append({'session_id': row['id'], 'url': source['url'],
                        'retrieved_at_utc': source.get('retrieved_at_utc', term['retrieved_at_utc']),
                        'imported_at_utc': now, 'sha256': source['sha256'],
                        'byte_count': len(data), 'page_count': len(pages), 'local_file': local,
                        'license_evidence': {'page': 1, 'method': 'visual_cover_review',
                                             'observed_badge': 'CC BY-NC-SA',
                                             'version': None, 'reviewed_at_utc': now}})
        print(row['id'], len(pages), 'pages', flush=True)
    identity = {'schema_version': 1, 'term_id': TERM,
                'policy': 'Original source PDFs unchanged; Persian adaptations preserve attribution and CC BY-NC-SA conditions. Own code remains MIT.',
                'records': records}
    (ROOT/f'data/metadata/{TERM}-slide-identity.json').write_text(json.dumps(identity, ensure_ascii=False, indent=2)+'\n')
    term['license'].update({'status': 'visual_cc_by_nc_sa_badges_verified',
                            'notes_fa': 'جلد هر۲۱ فایل اصلی بهار۲۰۲۶ به‌صورت تصویری بررسی شد و نشان CC BY-NC-SA دارد؛ نسخهٔ مجوز روی نشان نوشته نشده است. اصل فایل‌ها بدون تغییر و با انتساب حفظ می‌شود؛ ترجمهٔ وابسته، شرایط غیرتجاری و اشتراک‌گذاری همسان منبع را نگه می‌دارد. مجوز MIT مربوط به کد و محتوای تألیفی مستقل است.',
                            'publication_mode': 'unchanged_local_originals_with_attributed_source_aligned_persian_adaptations'})
    metadata.write_text(json.dumps(document, ensure_ascii=False, indent=2)+'\n')
    print('Imported',len(records),'originals;',sum(r['page_count']for r in records),'pages')


if __name__ == '__main__':
    main()
