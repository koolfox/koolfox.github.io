"""Group machine findings and unapplied text proposals by source page.

This report does not alter slides or establish visual or scientific correctness.
Browser evidence from another commit is historical and must be rechecked.
"""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import subprocess


def build_queue(scan, proposals, current_commit):
    rows = {}
    for session, page, viewport, status, findings in scan['records']:
        key = (session, page)
        row = rows.setdefault(key, {'session': session, 'page': page, 'viewports': {}, 'proposals': []})
        if viewport in row['viewports']:
            raise ValueError(f'duplicate scan record: {key} {viewport}')
        row['viewports'][viewport] = {'status': status, 'findings': findings}
    for proposal in proposals:
        key = (proposal['session'], proposal['page'])
        if key not in rows:
            raise ValueError(f'proposal without scan record: {key}')
        if proposal.get('status') != 'needs_review':
            raise ValueError(f'unexpected proposal status: {key}')
        rows[key]['proposals'].append(proposal)
    counts = Counter()
    for row in rows.values():
        findings = {item for view in row['viewports'].values() for item in view['findings']}
        counts.update(findings)
        statuses = {view['status'] for view in row['viewports'].values()}
        row['priority'] = 'fail' if 'fail' in statuses else 'needs_review' if 'needs_review' in statuses else 'measured'
    return {'scan_commit': scan['build_commit'], 'current_commit': current_commit,
            'historical_scan': scan['build_commit'] != current_commit,
            'scan_run': scan.get('run'), 'finding_page_counts': dict(sorted(counts.items())),
            'note': 'Historical measurements and proposed segments require rechecking; no slide is approved or changed.',
            'pages': [rows[k] for k in sorted(rows)]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scan', type=Path, required=True)
    parser.add_argument('--proposals', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    scan = json.loads(args.scan.read_text(encoding='utf-8'))
    proposals = [json.loads(line) for line in args.proposals.read_text(encoding='utf-8').splitlines() if line.strip()]
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    report = build_queue(scan, proposals, commit)
    with args.output.open('x', encoding='utf-8') as handle:
        json.dump(report, handle, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
        handle.write('\n')
    print(f"{len(report['pages'])} pages; historical scan: {report['historical_scan']}; {len(proposals)} proposals")


if __name__ == '__main__':
    main()
