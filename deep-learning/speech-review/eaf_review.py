"""Prepare local utterance clips and an unreviewed audio/text queue."""
import argparse
import csv
import hashlib
import json
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def utterances(path):
    root = ET.parse(path).getroot()
    slots = {x.attrib['TIME_SLOT_ID']: int(x.attrib['TIME_VALUE']) for x in root.iter('TIME_SLOT') if x.get('TIME_VALUE') is not None}
    segments = []
    tier = root.find("TIER[@TIER_ID='utterance_id']")
    text_tier = root.find("TIER[@TIER_ID='utterance']")
    if tier is None or text_tier is None:
        raise ValueError('Expected utterance_id and utterance tiers')
    texts = {}
    for node in text_tier.iter('REF_ANNOTATION'):
        ref = node.attrib['ANNOTATION_REF']
        if ref in texts:
            raise ValueError('Multiple transcriptions for one utterance')
        texts[ref] = node.findtext('ANNOTATION_VALUE', default='')
    for node in tier.iter('ALIGNABLE_ANNOTATION'):
        identifier = node.attrib['ANNOTATION_ID']
        start = slots[node.attrib['TIME_SLOT_REF1']]
        end = slots[node.attrib['TIME_SLOT_REF2']]
        if start < 0 or end <= start or identifier not in texts:
            raise ValueError(f'Invalid timing or missing transcription: {identifier}')
        segments.append((identifier, start, end, texts[identifier]))
    if not segments:
        raise ValueError('No utterances')
    return segments


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--eaf', required=True, type=Path)
    parser.add_argument('--audio', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--limit', type=int, default=None)
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    out = args.output.resolve()
    repo = Path(__file__).resolve().parents[2]
    if out.is_relative_to(repo):
        raise SystemExit('Choose an output outside the repository')
    if out.exists():
        raise SystemExit('Output must not exist')
    rows = utterances(args.eaf)
    if args.limit:
        rows = rows[:args.limit]
    duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(args.audio)], text=True))
    duration_ms = int(duration * 1000)
    out.mkdir(mode=0o700, parents=True)
    queue = []
    for number, (identifier, start, end, text) in enumerate(rows, 1):
        actual_end = min(end, duration_ms)
        if start >= actual_end:
            raise ValueError(f'Utterance outside audio: {identifier}')
        name = f'clip-{number:03}.wav'
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-n', '-ss', f'{start/1000:.3f}', '-i', str(args.audio), '-t', f'{(actual_end-start)/1000:.3f}', '-ac', '1', '-ar', '22050', str(out / name)], check=True)
        queue.append({'clip': name, 'annotation_id': identifier, 'start_ms': start, 'annotation_end_ms': end, 'clip_end_ms': actual_end, 'transcript': text, 'audio_text_review': 'unreviewed', 'pronunciation_review': 'unreviewed', 'notes': ''})
    with (out / 'review.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=queue[0].keys()); writer.writeheader(); writer.writerows(queue)
    metadata = {'source': 'HamBam v3, University of Bamberg', 'source_url': 'https://fd-repo.uni-bamberg.de/records/v80bg-h0243', 'license': 'CC BY 4.0', 'license_url': 'https://fd-repo.uni-bamberg.de/records/v80bg-h0243/files/LICENCE.txt?download=1', 'audio_sha256': digest(args.audio), 'annotation_sha256': digest(args.eaf), 'audio_duration_seconds': duration, 'review_status': 'unreviewed', 'segments': len(queue)}
    (out / 'provenance.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Prepared {len(queue)} unreviewed clips in {out}')


if __name__ == '__main__':
    main()
