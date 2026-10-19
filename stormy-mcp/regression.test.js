/** Regression coverage for observable correctness and protocol behavior. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {callTool} from './tools.js';
const file=fileURLToPath(new URL('../ui-hall/data/corpus.json',import.meta.url));
const corpus={...JSON.parse(fs.readFileSync(file,'utf8')),__path:file};
const call=(name,args)=>callTool(name,args,corpus);
let n=0;async function test(name,fn){await fn();n++;console.log('ok '+name);}
await test('unrelated queries do not become evidence through description bonuses',async()=>{
 assert.equal((await call('search_designs',{query:'zzqvnonexistentxyz'})).matched,0);
 assert.equal((await call('design_brief',{screen:'zzqvnonexistentxyz',dark:true,mood:'premium'})).evidence_count,0);
});
await test('pagination has no overlapping IDs and accurate continuation',async()=>{
 const a=await call('search_designs',{query:'',limit:3});const b=await call('search_designs',{query:'',limit:3,offset:a.next_offset});
 assert.equal(a.next_offset,3);assert.equal(b.offset,3);assert.equal(a.results.filter(x=>b.results.some(y=>y.id===x.id)).length,0);
});
await test('input validation rejects negative limits, wrong types and invalid enum items',async()=>{
 for(const args of [{query:'a',limit:-1},{query:'a',category:'website'},{query:'a',orientation:['diagonal']},{query:'a',offset:1.5},{query:'a',extra:true}])await assert.rejects(call('search_designs',args));
 await assert.rejects(call('compare_designs',{ids:['VID-0377','VID-0377']}));
});
await test('named palette values quote printed cards rather than compressed pixel samples',async()=>{
 const r=await call('palette_for',{mood:'raspberry red',count:10});const s=r.named_schemes.find(x=>x.id==='IMG-0055');
 assert.deepEqual(s.colours,corpus.printed_palettes['IMG-0055'].slice(0,2).map(c=>c.hex));assert.equal(s.value_source,'printed on card');
});
await test('implementation plans preserve user goal and reference identity',async()=>{
 const r=await call('implementation_plan',{goal:'Accessible library',ids:['VID-0377','VID-0397']});assert.equal(r.goal,'Accessible library');assert.deepEqual(r.evidence.map(a=>a.id),['VID-0377','VID-0397']);assert.ok(r.acceptance.length>4);
 await assert.rejects(call('implementation_plan',{goal:'Test',ids:['NONEXISTENT']}));
});
await test('motion results resolve existing playable files',async()=>{
 const r=await call('motion_studies',{query:'card',limit:4});assert.ok(r.results.length);for(const a of r.results)assert.ok(fs.existsSync(a.local_clip));
});
const child=spawn(process.execPath,[fileURLToPath(new URL('./server.js',import.meta.url))],{stdio:['pipe','pipe','pipe']});
let buffer='';const pending=new Map();const stray=[];let id=0;
child.stdout.on('data',chunk=>{buffer+=chunk;let nl;while((nl=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,nl);buffer=buffer.slice(nl+1);const msg=JSON.parse(line);if(pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}else stray.push(msg);}});
const rpc=(method,params)=>new Promise((resolve,reject)=>{const key=++id;const t=setTimeout(()=>reject(new Error('RPC timeout')),5000);pending.set(key,r=>{clearTimeout(t);resolve(r)});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:key,method,params})+'\n')});
try {
 await test('current protocol negotiation and readonly annotations',async()=>{const r=await rpc('initialize',{protocolVersion:'2025-11-25'});assert.equal(r.result.protocolVersion,'2025-11-25');const list=await rpc('tools/list');assert.ok(list.result.tools.every(t=>t.annotations.readOnlyHint));});
 await test('native image content matches a real derivative',async()=>{const r=await rpc('tools/call',{name:'asset_image',arguments:{id:'VID-0377'}});assert.equal(r.result.isError,false);const img=r.result.content.find(c=>c.type==='image');assert.equal(img.mimeType,'image/webp');const asset=corpus.assets.find(a=>a.id==='VID-0377');assert.deepEqual(Buffer.from(img.data,'base64'),fs.readFileSync(fileURLToPath(new URL('../ui-hall/'+asset.thumb,import.meta.url))));});
 await test('resources and prompt discovery are usable',async()=>{const resources=await rpc('resources/list');const r=await rpc('resources/read',{uri:resources.result.resources[0].uri});assert.equal(JSON.parse(r.result.contents[0].text).totals.assets,corpus.assets.length);const p=await rpc('prompts/get',{name:'reference_to_interface',arguments:{goal:'A study library'}});assert.ok(p.result.messages[0].content.text.includes('A study library'));});
 await test('notifications produce no reply; malformed payloads return proper errors',async()=>{child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'ping'})+'\n');await rpc('ping');assert.equal(stray.length,0);child.stdin.write('null\n{\n');await rpc('ping');assert.ok(stray.some(m=>m.error?.code===-32600));assert.ok(stray.some(m=>m.error?.code===-32700));});
}finally{child.stdin.end();child.kill();}
console.log(`${n} regression scenarios passed.`);
