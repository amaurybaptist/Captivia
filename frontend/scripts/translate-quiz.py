#!/usr/bin/env python3
"""Generate versioned static quiz translations. Never used at application runtime.

Google's public text translation endpoint processes only public editorial content;
no user data, credentials or account text is sent. Results are cached by exact
source text + language. Missing/malformed translations fail the build step;
there is no French fallback in a published non-French bank.
"""
import argparse, concurrent.futures, hashlib, json, os, re, sqlite3, threading, time
import urllib.request, urllib.parse, urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/lib/quiz/data'
LOCALES=['en','de','es','it','pt']
CATEGORIES=['birds','reptiles','insects','fish','mammals','unusual']
CACHE=Path(os.environ.get('QUIZ_TRANSLATION_CACHE','/tmp/captivia-quiz-translations.sqlite'))
lock=threading.Lock()
db=sqlite3.connect(CACHE,check_same_thread=False)
db.execute('CREATE TABLE IF NOT EXISTS translations (locale TEXT, source TEXT, result TEXT, PRIMARY KEY(locale,source))')
db.commit()

def cached(locale,text):
    with lock:
        row=db.execute('SELECT result FROM translations WHERE locale=? AND source=?',(locale,text)).fetchone()
        return row[0] if row else None

def translate(locale,texts):
    # Preserve one field per line, with exact count checks before any association.
    placeholders=list(dict.fromkeys(re.findall(r'\{\w+\}', '\n'.join(texts))))
    protection={token:f'987654{index:04d}56789' for index,token in enumerate(placeholders)}
    protected=[s for s in texts]
    for token,marker in protection.items(): protected=[s.replace(token,marker) for s in protected]
    query='\n'.join(protected)
    if any('\n' in s for s in texts): raise ValueError('Embedded newline in field')
    params=urllib.parse.urlencode({'client':'gtx','sl':'fr','tl':locale,'dt':'t','q':query})
    req=urllib.request.Request('https://translate.googleapis.com/translate_a/single?'+params,headers={'User-Agent':'CaptiviaQuizEditorial/1.0'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req,timeout=60) as r: payload=json.load(r)
            result=''.join(x[0] for x in payload[0] if x and x[0]).strip().split('\n')
            if len(result)!=len(texts):
                if len(texts)>1:
                    mid=len(texts)//2
                    return translate(locale,texts[:mid])+translate(locale,texts[mid:])
                raise ValueError('Translation field count mismatch')
            for token,marker in protection.items(): result=[s.replace(marker,token) for s in result]
            for source,value in zip(texts,result):
                if not value.strip(): raise ValueError('Empty translation')
                if set(re.findall(r'\{\w+\}',source))!=set(re.findall(r'\{\w+\}',value)):
                    raise ValueError('Changed interpolation placeholders')
            with lock:
                db.executemany('INSERT OR REPLACE INTO translations VALUES (?,?,?)',[(locale,s,t.strip()) for s,t in zip(texts,result)])
                db.commit()
            time.sleep(.12)
            return [v.strip() for v in result]
        except urllib.error.HTTPError as e:
            if e.code not in (429,500,502,503,504): raise
            delay=max(float(e.headers.get('Retry-After','0')),min(60,2**attempt*3))
            time.sleep(delay)
        except (TimeoutError,urllib.error.URLError):
            if attempt==5: raise
            time.sleep(2**attempt)
    raise RuntimeError('Translation retries exhausted')

def translate_fields(locale,strings):
    unique=list(dict.fromkeys(strings))
    translated={s:cached(locale,s) for s in unique}
    missing=[s for s in unique if translated[s] is None]
    batches=[]; batch=[]; size=0
    for s in missing:
        # Bound URI length, including multibyte French text percent encoding.
        cost=len(urllib.parse.quote(s))+3
        if batch and size+cost>7000: batches.append(batch);batch=[];size=0
        batch.append(s);size+=cost
    if batch:batches.append(batch)
    for b in batches:
        translated.update(zip(b,translate(locale,b)))
    return translated

def strings_in(value):
    if isinstance(value,str): return [value]
    if isinstance(value,list): return [s for v in value for s in strings_in(v)]
    if isinstance(value,dict): return [s for v in value.values() for s in strings_in(v)]
    return []
def replace(value,mapping):
    if isinstance(value,str): return mapping[value]
    if isinstance(value,list):return [replace(v,mapping) for v in value]
    if isinstance(value,dict):return {k:replace(v,mapping) for k,v in value.items()}
    return value

def task(locale,category):
    bank=json.loads((DATA/f'{category}.json').read_text())
    fields=['animal','prompt','options','explanation','didYouKnow']
    images=json.loads((ROOT/f'src/lib/quiz/images/{category}.json').read_text())
    public=[{**{k:q[k] for k in fields}, 'imageCaption': images[q['id']]['caption']} for q in bank]
    raw=json.dumps(public,ensure_ascii=False,sort_keys=True).encode()
    digest=hashlib.sha256(raw).hexdigest()
    target=DATA/'translations'/locale/f'{category}.json'
    if target.exists() and json.loads(target.read_text()).get('sourceSha256')==digest:
        print(f'{locale}/{category}: current; editorial changes retained',flush=True)
        return
    if target.exists() and not args.refresh:
        raise RuntimeError(f'{locale}/{category}: source changed; preserve editorial corrections and review a --refresh explicitly')
    mapping=translate_fields(locale,strings_in(public))
    result=[{'id':q['id'],**replace(text,mapping)} for q,text in zip(bank,public)]
    out=DATA/'translations'/locale
    out.mkdir(parents=True,exist_ok=True)
    target=out/f'{category}.json'
    raw=json.dumps(public,ensure_ascii=False,sort_keys=True).encode()
    artifact={'sourceSha256':hashlib.sha256(raw).hexdigest(),'locale':locale,'questions':result}
    temp=target.with_suffix('.json.tmp')
    temp.write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n')
    temp.replace(target)
    print(f'{locale}/{category}: {len(result)} questions',flush=True)

def ui(locale):
    source=ROOT/'src/lib/quiz/locales/fr.json'
    copy=json.loads(source.read_text())
    mapping=translate_fields(locale,strings_in(copy))
    target=source.with_name(f'{locale}.json')
    translated=replace(copy,mapping)
    if target.exists(): translated.update(json.loads(target.read_text())) # retain editorial improvements
    target.write_text(json.dumps(translated,ensure_ascii=False,indent=2)+'\n')
    print(f'{locale}/interface: complete',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--ui-only',action='store_true')
    parser.add_argument('--no-ui',action='store_true')
    parser.add_argument('--refresh',action='store_true',help='Explicitly regenerate a stale bank; review existing editorial corrections first')
    parser.add_argument('--locale',choices=LOCALES)
    parser.add_argument('--category',choices=CATEGORIES)
    args=parser.parse_args()
    locales=[args.locale] if args.locale else LOCALES
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs=[] if args.no_ui else [pool.submit(ui,l) for l in locales]
        if not args.ui_only: jobs += [pool.submit(task,l,c) for l in locales for c in ([args.category] if args.category else CATEGORIES)]
        for job in concurrent.futures.as_completed(jobs):job.result()
