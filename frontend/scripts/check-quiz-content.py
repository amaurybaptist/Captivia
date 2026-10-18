#!/usr/bin/env python3
"""Verify editorial/translation sync without network access; emit tiny level counts."""
import collections,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/lib/quiz/data'
categories=['birds','reptiles','insects','fish','mammals','unusual']
counts={}
for category in categories:
    bank=json.loads((DATA/f'{category}.json').read_text())
    images=json.loads((ROOT/f'src/lib/quiz/images/{category}.json').read_text())
    counts[category]=dict(collections.Counter(q['difficulty'] for q in bank))
    assert len(bank)>=200 and len({q['id'] for q in bank})==len(bank),category
    assert all(counts[category].get(d,0)>=40 for d in ['easy','medium','hard']),counts[category]
    fields=['animal','prompt','options','explanation','didYouKnow']
    public=[{**{k:q[k] for k in fields},'imageCaption':images[q['id']]['caption']} for q in bank]
    digest=hashlib.sha256(json.dumps(public,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
    for locale in ['en','de','es','it','pt']:
        path=DATA/'translations'/locale/f'{category}.json'
        translated=json.loads(path.read_text())
        assert translated['sourceSha256']==digest,f'Stale translation: {locale}/{category}'
        assert translated['locale']==locale,path
        assert [q['id'] for q in translated['questions']]==[q['id'] for q in bank],path
        for q in translated['questions']:
            assert len(q['options'])==4,path
            assert len({v.strip().casefold() for v in q['options']})==4,f'Duplicate translated choices: {locale}/{q["id"]}'
            assert all(isinstance(q[k],str) and q[k].strip() for k in ['animal','prompt','explanation','didYouKnow','imageCaption']),path
out=ROOT/'src/lib/quiz/difficulty-counts.json'
out.write_text(json.dumps(counts,ensure_ascii=False,indent=2)+'\n')
print('1 200 questions × 6 langues : associations, fraîcheur des traductions et niveaux vérifiés.')
