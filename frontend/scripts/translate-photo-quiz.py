#!/usr/bin/env python3
"""Editorial only. Translate public photo-game text; never called at runtime."""
import importlib.util,json,hashlib,concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('quiz_translator',ROOT/'scripts/translate-quiz.py')
tr=importlib.util.module_from_spec(spec);spec.loader.exec_module(tr)
BASE=ROOT/'src/lib/quiz/photo'
rows=json.loads((BASE/'animals.json').read_text())
public=[{k:r[k] for k in ['id','animal','recognition','didYouKnow']} for r in rows]
fields=[{k:v for k,v in r.items() if k!='id'} for r in public]
digest=hashlib.sha256(json.dumps(public,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
copy=json.loads((BASE/'locales/fr.json').read_text())
def run(locale):
 out=BASE/'translations'/f'{locale}.json';out.parent.mkdir(exist_ok=True)
 if out.exists():
  assert json.loads(out.read_text())['sourceSha256']==digest, 'Source changed; preserve and update editorial corrections explicitly'
 else:
  mapping=tr.translate_fields(locale,tr.strings_in(fields))
  translated=[{'id':r['id'],**tr.replace(text,mapping)} for r,text in zip(rows,fields)]
  # Reuse names already reviewed in the knowledge quiz where a precise name exists.
  prior={}
  for category in tr.CATEGORIES:
   subjects=json.loads((ROOT/f'src/lib/quiz/data/{category}-image-subjects.json').read_text())
   bank=json.loads((ROOT/f'src/lib/quiz/data/{category}.json').read_text())
   translated_old=json.loads((ROOT/f'src/lib/quiz/data/translations/{locale}/{category}.json').read_text())['questions']
   for old,oldtext in zip(bank,translated_old):
    query=subjects[old['id']]['query']
    if old['animal']==subjects[old['id']]['subject']:prior.setdefault(query,oldtext['animal'])
  for row,text in zip(rows,translated):
   if row['scientificName'] in prior:text['animal']=prior[row['scientificName']]
  out.write_text(json.dumps({'locale':locale,'sourceSha256':digest,'animals':translated},ensure_ascii=False,indent=2)+'\n')
 target=BASE/'locales'/f'{locale}.json'
 if not target.exists():
  translated=tr.replace(copy,tr.translate_fields(locale,tr.strings_in(copy)))
  target.write_text(json.dumps(translated,ensure_ascii=False,indent=2)+'\n')
 print(locale,'200 photo animals + interface',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(run,['en','de','es','it','pt']))
