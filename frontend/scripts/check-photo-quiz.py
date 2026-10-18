#!/usr/bin/env python3
"""Offline delivery checks for the photo game, including reused image provenance."""
import collections,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];LIB=ROOT/'src/lib/quiz';BASE=LIB/'photo'
rows=json.loads((BASE/'animals.json').read_text());images=json.loads((BASE/'images.json').read_text());assets=json.loads((LIB/'image-assets.json').read_text())
assert len(rows)==200 and len({r['id'] for r in rows})==200 and len({r['scientificName'] for r in rows})==200
by_id={r['id']:r for r in rows}
counts=collections.Counter(r['difficulty'] for r in rows)
assert all(counts[d]>=20 for d in ['easy','medium','hard'])
previous={}
for category in ['birds','reptiles','fish','mammals','insects','unusual']:
    bank=json.loads((LIB/f'data/{category}.json').read_text());subjects=json.loads((LIB/f'data/{category}-image-subjects.json').read_text())
    for q in bank:previous.setdefault(subjects[q['id']]['query'],[]).append(q['didYouKnow'])
normalize=lambda s:re.sub(r'[^\w]','',s.casefold())
for r in rows:
    assert r['id'].startswith('photo-') and len(r['distractors'])==3 and len({r['id'],*r['distractors']})==4
    assert all(x in by_id for x in r['distractors'])
    assert all(normalize(r['didYouKnow'])!=normalize(old) for old in previous.get(r['scientificName'],[])),r['id']
    assert r['sourceUrl'].startswith('https://en.wikipedia.org/wiki/')
    image=images[r['id']];asset=assets[r['scientificName']]
    assert image['src']==asset['src'] and image['sourcePage']==asset['sourcePage']
    assert image['creator'] and image['licenseName'] and image['licenseUrl'].startswith('https://creativecommons.org/')
    path=(ROOT/'public'/image['src'].lstrip('/')).resolve();assert path.is_relative_to(ROOT/'public/quiz/images')
    assert hashlib.sha256(path.read_bytes()).hexdigest()==asset['sha256'],r['id']
    assert path.suffix in ['.jpg','.png','.jpeg']
public=[{k:r[k] for k in ['id','animal','recognition','didYouKnow']} for r in rows]
digest=hashlib.sha256(json.dumps(public,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
fr_copy=json.loads((BASE/'locales/fr.json').read_text())
for locale in ['en','de','es','it','pt']:
    content=json.loads((BASE/f'translations/{locale}.json').read_text());assert content['sourceSha256']==digest and content['locale']==locale
    translated=content['animals'];assert [r['id'] for r in translated]==[r['id'] for r in rows]
    names={r['id']:r['animal'] for r in translated}
    for r in rows:assert len({normalize(names[x]) for x in [r['id'],*r['distractors']]})==4,f'{locale}/{r["id"]}'
    for q in translated:
        assert all(q[k].strip() for k in ['animal','recognition','didYouKnow'])
    copy=json.loads((BASE/f'locales/{locale}.json').read_text());assert copy.keys()==fr_copy.keys()
    for key,text in copy.items():assert sorted(re.findall(r'\{\w+\}',text))==sorted(re.findall(r'\{\w+\}',fr_copy[key]))
print(f'200 espèces et photos distinctes, 6 langues, provenance/fichiers/SHA-256, choix et anecdotes vérifiés; niveaux : {dict(counts)}')
