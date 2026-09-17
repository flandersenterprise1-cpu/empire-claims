#!/usr/bin/env python3
"""
Aflac Final Expense drug list -> structured rows.

The drug list marks, for each medication, which products it is unacceptable
for. Those marks are red circled crosses drawn as vector graphics, not text,
so no text extractor recovers them -- pdftotext returns the drug names and
conditions but silently drops every mark. Transcribing 99 pages by eye would
be both slow and unverifiable.

Instead each page is read twice and the two readings are joined by position:

  * pdftotext -bbox gives every word with its coordinates, in PDF points.
  * the page is rendered at 150dpi. Row boundaries come from the table itself --
    the union of its horizontal rules and the transitions of its alternating row
    shading -- so a drug name that wraps over several lines stays one row. The
    red marks are then found by colour, clustered into the four product columns,
    and assigned to whichever row band they fall in.

Detecting rows from the ruling rather than from line spacing matters: many
entries wrap ("DASABUVIR, OMBITASVIR, PARITAPREVIR, AND RITONAVIR" runs to four
lines), and splitting on line breaks attaches each row's marks to whichever
fragment happened to line up with them.

A row whose mark columns cannot be resolved is reported, never guessed.

Columns, from the legend: 1 Final Expense Preferred, 2 Final Expense Standard,
3 Final Expense Modified, 4 Medicare supplement.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

DPI = 150
SCALE = DPI / 72.0
COLUMNS = ['fe_preferred', 'fe_standard', 'fe_modified', 'medicare_supplement']
# Marks sit right of this x (points); the legend key on the lower left does not.
MIN_MARK_X_PT = 240.0
# Header/footer bands to ignore, in points from the top.
HEADER_Y_PT = 50.0


def words_for_page(pdf: Path, page: int):
    xml = subprocess.run(
        ['pdftotext', '-bbox', '-f', str(page), '-l', str(page), str(pdf), '-'],
        capture_output=True, text=True, check=True).stdout
    out = []
    for m in re.finditer(
        r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', xml):
        x0, y0, x1, y1, text = m.groups()
        out.append({'x0': float(x0), 'y0': float(y0), 'x1': float(x1), 'y1': float(y1),
                    'text': text})
    return out


def row_boundaries(png: Path):
    """Row boundaries in points, from the table's rules and shading."""
    a = np.asarray(Image.open(png).convert('RGB')).astype(int)
    h = a.shape[0]
    sub = a[:, 45:795]

    dark = (sub.sum(axis=2) < 420).mean(axis=1)
    rules = {y for y in range(h) if dark[y] > 0.80}

    shaded = (((sub[..., 2] - sub[..., 0]) > 6) & (sub[..., 2] > 200)
              & (sub[..., 0] > 170)).mean(axis=1) > 0.5
    edges = {y for y in range(1, h) if shaded[y] != shaded[y - 1]}

    ys = sorted(rules | edges)
    merged = []
    for y in ys:
        if merged and y - merged[-1] <= 3:
            continue
        merged.append(y)
    return [y / SCALE for y in merged]


def marks_for_page(png: Path):
    """Red mark centres as (x_pt, y_pt)."""
    a = np.asarray(Image.open(png).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    red = (r > 120) & (r - g > 60) & (r - b > 60)
    ys, xs = np.nonzero(red)
    if len(xs) == 0:
        return []
    pts = sorted(zip(xs.tolist(), ys.tolist()))
    # Flood-fill style clustering: group pixels into blobs.
    seen = set()
    blobs = []
    grid = {}
    for x, y in pts:
        grid.setdefault(x // 8, []).append((x, y))
    for x, y in pts:
        if (x, y) in seen:
            continue
        stack = [(x, y)]
        blob = []
        while stack:
            cx, cy = stack.pop()
            if (cx, cy) in seen:
                continue
            seen.add((cx, cy))
            blob.append((cx, cy))
            for key in (cx // 8 - 1, cx // 8, cx // 8 + 1):
                for nx, ny in grid.get(key, ()):
                    if (nx, ny) not in seen and abs(nx - cx) <= 3 and abs(ny - cy) <= 3:
                        stack.append((nx, ny))
        if len(blob) < 30:          # stray antialiasing
            continue
        bx = sum(p[0] for p in blob) / len(blob) / SCALE
        by = sum(p[1] for p in blob) / len(blob) / SCALE
        blobs.append((bx, by))
    return [(x, y) for x, y in blobs if x >= MIN_MARK_X_PT and y >= HEADER_Y_PT]


def rows_for_page(words, marks, boundaries):
    """Assemble one row per table band, then attach that band's marks."""
    bands = [(boundaries[i], boundaries[i + 1]) for i in range(len(boundaries) - 1)]
    if not bands:
        return [], ['no table row boundaries detected']

    rows = []
    for top, bottom in bands:
        name = ' '.join(
            w['text'] for w in sorted(words, key=lambda w: (w['y0'], w['x0']))
            if w['x0'] < 120 and top <= w['y0'] < bottom
            and w['text'] not in ('DRUG', 'NAME'))
        condition = ' '.join(
            w['text'] for w in sorted(words, key=lambda w: (w['y0'], w['x0']))
            if 120 <= w['x0'] < MIN_MARK_X_PT and top <= w['y0'] < bottom
            and w['text'] != 'CONDITION')
        if not name.strip():
            continue
        if name.startswith('Indicates that'):
            break
        rows.append({'name': name, 'condition': condition, 'band0': top, 'band1': bottom,
                     'columns': []})

    problems = []
    xs = sorted({round(x) for x, _ in marks})
    centres = []
    for x in xs:
        if not centres or x - centres[-1][-1] > 12:
            centres.append([x])
        else:
            centres[-1].append(x)
    centre_pts = [sum(c) / len(c) for c in centres]
    if len(centre_pts) > 4:
        problems.append(f'found {len(centre_pts)} mark columns, expected at most 4')

    for mx, my in marks:
        idx = min(range(len(centre_pts)), key=lambda i: abs(centre_pts[i] - mx))
        target = next((r for r in rows if r['band0'] <= my < r['band1']), None)
        if target is None:
            problems.append(f'mark at y={my:.1f} matched no drug row')
            continue
        target['columns'].append(idx)
    return rows, problems


def main(pdf_path, out_path, first=1, last=None):
    pdf = Path(pdf_path)
    n = int(subprocess.run(['pdfinfo', str(pdf)], capture_output=True, text=True)
            .stdout.split('Pages:')[1].split()[0])
    last = int(last) if last else n
    all_rows, all_problems = [], []
    with tempfile.TemporaryDirectory() as tmp:
        for page in range(int(first), last + 1):
            subprocess.run(['pdftoppm', '-r', str(DPI), '-png', '-f', str(page), '-l', str(page),
                            str(pdf), f'{tmp}/p'], check=True, capture_output=True)
            png = next(Path(tmp).glob('p-*.png'), None)
            if png is None:
                all_problems.append(f'page {page}: render produced no image')
                continue
            words = words_for_page(pdf, page)
            rows, problems = rows_for_page(
                words, marks_for_page(png), row_boundaries(png))
            png.unlink()
            for r in rows:
                cols = sorted(set(r['columns']))
                all_rows.append({
                    'page': page,
                    'drug': re.sub(r'\\s+', ' ', r['name']).strip(),
                    'condition': re.sub(r'\s+', ' ', r['condition']).strip(),
                    'products': [COLUMNS[c] for c in cols if c < len(COLUMNS)],
                })
            all_problems += [f'page {page}: {p}' for p in problems]
    Path(out_path).write_text(json.dumps(
        {'rows': all_rows, 'problems': all_problems}, indent=1))
    marked = sum(1 for r in all_rows if r['products'])
    print(f'{len(all_rows)} rows from pages {first}-{last}; {marked} carry at least one mark')
    if all_problems:
        print(f'{len(all_problems)} problem(s):')
        for p in all_problems[:10]:
            print('  ' + p)


if __name__ == '__main__':
    main(*sys.argv[1:])
