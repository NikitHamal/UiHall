#!/usr/bin/env python3
"""Portable corpus integrity audit. Does not claim to verify visual descriptions."""
import argparse, collections, hashlib, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def audit(root=ROOT):
 corpus=json.loads((root/'ui-hall/data/corpus.json').read_text());tax=json.loads((root/'stormy-mcp/taxonomy.json').read_text());assets=corpus['assets'];errors=[];warnings=[];byid={};hashes=collections.defaultdict(list)
 for a in assets:
  id=a['id']
  if id in byid:errors.append({'id':id,'issue':'duplicate ID'})
  byid[id]=a
  for key,dimension in [('category','categories'),('type','types')]:
   if a.get(key) not in tax[dimension]:errors.append({'id':id,'issue':'unknown '+key})
  for key,dimension in [('roles','roles'),('style','styles'),('tags','tags')]:
   for value in a.get(key,[]):
    if value not in tax[dimension]:errors.append({'id':id,'issue':f'unknown {key}: {value}'})
  for key in ['src','thumb','clip']:
   rel=a.get(key)
   if not rel:continue
   p=(root/'ui-hall'/rel).resolve()
   if not p.is_relative_to((root/'ui-hall').resolve()):errors.append({'id':id,'issue':'media path outside library','field':key});continue
   if not p.is_file():errors.append({'id':id,'issue':'missing media','field':key,'path':rel})
   elif key=='src':hashes[hashlib.sha256(p.read_bytes()).hexdigest()].append(id)
  if not a.get('description'):warnings.append({'id':id,'issue':'description missing'})
  pal=a.get('palette_detail',[])
  if pal and abs(sum(p['pct'] for p in pal)-100)>2:errors.append({'id':id,'issue':'palette percentages do not sum to approximately 100'})
  if any(not re.fullmatch(r'#[0-9a-fA-F]{6}',p['hex']) or not 0<=p['pct']<=100 for p in pal):errors.append({'id':id,'issue':'invalid palette value'})
  if a.get('clip') and a.get('kind')!='video':warnings.append({'id':id,'issue':'clip on non-video record'})
 actual={'assets':len(assets),'images':sum(a['kind']=='image' for a in assets),'videos':sum(a['kind']=='video' for a in assets),'clips':sum(bool(a.get('clip')) for a in assets),'described':sum(bool(a.get('description')) for a in assets)}
 for key,value in actual.items():
  if corpus['totals'].get(key)!=value:errors.append({'issue':'total drift','field':key})
 for dimension,key in [('categories','category'),('types','type'),('roles','roles'),('styles','style'),('tags','tags')]:
  counts=collections.Counter(v for a in assets for v in (a.get(key,[]) if isinstance(a.get(key),list) else [a.get(key)]))
  for f in corpus[dimension]:
   if f['count']!=counts[f['id']]:errors.append({'issue':'facet count drift','field':dimension,'value':f['id']})
 for group in corpus.get('groups',[]):
  if any(id not in byid for id in group['members']):errors.append({'issue':'unknown group member','group':group['id']})
 js=(root/'ui-hall/data/corpus.js').read_text();match=re.search(r'window.STORMY_CORPUS\s*=\s*(.*);\s*$',js,re.S)
 if not match or json.loads(match[1])!=corpus:errors.append({'issue':'JSON/JS corpus twins differ'})
 reviewed=[{'id':a['id'],**a['review']} for a in assets if a.get('review')]
 return {'totals':actual,'integrity_errors':errors,'warnings':warnings,'exact_duplicate_derivatives':[ids for ids in hashes.values() if len(ids)>1],'scoped_visual_reviews':reviewed,'reviewed_records':len(reviewed),'unreviewed_records':len(assets)-len(reviewed),'source_urls_recorded':sum(bool(a.get('source_url') or a.get('origin',{}).get('url')) for a in assets),'limits':['Integrity checks cannot verify visual descriptions.','Review scope is per record: poster-only and sampled-frame checks are not full playback.','Duplicate bytes can be intentional references or alternate records; no assets were automatically removed.','Original creator attribution and commercial media rights remain incomplete.'],'review_queue':[{'id':a['id'],'title':a['title'],'reason':'No scoped visual review recorded'} for a in assets if not a.get('review')]}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path);args=parser.parse_args();result=audit()
 if args.out:args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
 print(f"Audited {result['totals']['assets']} records: {len(result['integrity_errors'])} integrity errors; {result['reviewed_records']} scoped visual reviews; {result['unreviewed_records']} remain unverified.")
 for error in result['integrity_errors'][:20]:print(error)
 sys.exit(bool(result['integrity_errors']))
if __name__=='__main__':main()
