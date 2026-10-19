#!/usr/bin/env node
/** UiHall MCP: dependency-free stdio transport (newline-delimited JSON-RPC).
 * stdout is exclusively protocol traffic; diagnostics go to stderr.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { TOOLS, callTool } from './tools.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
let corpus;
function loadCorpus() {
  if (corpus) return corpus;
  const candidates = [process.env.UIHALL_CORPUS, process.env.STORMY_CORPUS, path.resolve(HERE,'../ui-hall/data/corpus.json'), path.join(HERE,'corpus.json')].filter(Boolean);
  const file = candidates.find(file => fs.existsSync(file));
  if (!file) throw new Error('Corpus not found. Set UIHALL_CORPUS to corpus.json or use the full UiHall checkout.');
  const value = JSON.parse(fs.readFileSync(file,'utf8'));
  if (!Array.isArray(value.assets)) throw new Error('Invalid corpus: assets must be an array.');
  corpus = { ...value, __path:file };return corpus;
}
const send = value => process.stdout.write(JSON.stringify(value)+'\n');
const reply = (id,result) => send({jsonrpc:'2.0',id,result});
const fail = (id,code,message) => send({jsonrpc:'2.0',id,error:{code,message}});
const resource = {uri:'uihall://corpus/overview',name:'UiHall corpus overview',description:'Live corpus totals, vocabulary and interpretation limits.',mimeType:'application/json'};
const workflow = {name:'reference_to_interface',description:'Design an original interface from inspected references.',arguments:[{name:'goal',description:'Product, audience and primary action',required:true}]};
async function handle(msg) {
  if (!msg || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || ('id' in msg && typeof msg.id !== 'number' && typeof msg.id !== 'string' && msg.id !== null)) return fail(null,-32600,'Invalid JSON-RPC request');
  const {id,method,params} = msg;
  if (id === undefined) return; // notifications never receive a response
  switch(method) {
    case 'initialize': return reply(id,{protocolVersion:PROTOCOLS.includes(params?.protocolVersion)?params.protocolVersion:PROTOCOLS[0],capabilities:{tools:{listChanged:false},resources:{subscribe:false,listChanged:false},prompts:{listChanged:false}},serverInfo:{name:'stormy',title:'UiHall design workbench',version:'2.0.0'},instructions:'UiHall provides design references, not verified product specifications. Search, inspect actual images with asset_image, compare references, then create an implementation_plan. Inherited descriptions may be wrong. Pixel samples are not semantic tokens; validate final text contrast. Inspect motion clips before claiming timing/easing. Original media is for reference; rights are not granted.'});
    case 'ping': return reply(id,{});
    case 'tools/list': return reply(id,{tools:TOOLS.map(t=>({...t,annotations:{title:t.name.replaceAll('_',' '),readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}))});
    case 'tools/call': {
      if (!params || typeof params.name !== 'string') return fail(id,-32602,'Tool name is required');
      if (!TOOLS.some(t=>t.name===params.name)) return fail(id,-32602,`Unknown tool: ${params.name}`);
      try {
        const c=loadCorpus(); const args=params.arguments ?? {};
        const out=await callTool(params.name,args,c,HERE);
        const content=[{type:'text',text:typeof out==='string'?out:JSON.stringify(out,null,1)}];
        if(params.name==='asset_image' && args.embed!==false && args.which!=='original') {
          const a=c.assets.find(a=>a.id===args.id);
          const root=fs.realpathSync(path.resolve(path.dirname(c.__path),'..'));
          const relative=args.which==='web'?a.src:(a.thumb||a.src);
          if(!relative)throw new Error('No image derivative is recorded for this asset.');
          const imagePath=fs.realpathSync(path.resolve(root,relative));
          if(!imagePath.startsWith(root+path.sep))throw new Error('Asset path must stay within the corpus media root.');
          const stat=fs.statSync(imagePath);if(stat.size>5*1024*1024)throw new Error('Image exceeds 5 MB. Request which=thumb or embed=false.');
          const ext=path.extname(imagePath).toLowerCase();const mime={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'}[ext];
          if(!mime)throw new Error('Unsupported image format.');
          content.push({type:'image',data:fs.readFileSync(imagePath).toString('base64'),mimeType:mime});
        }
        return reply(id,{content,isError:false,...(typeof out==='object'?{structuredContent:out}:{})});
      }catch(error){return reply(id,{content:[{type:'text',text:error.message}],isError:true});}
    }
    case 'resources/list': return reply(id,{resources:[resource]});
    case 'resources/templates/list': return reply(id,{resourceTemplates:[]});
    case 'resources/read': {
      if(params?.uri!==resource.uri)return fail(id,-32602,'Unknown resource URI');
      const c=loadCorpus();return reply(id,{contents:[{uri:resource.uri,mimeType:resource.mimeType,text:JSON.stringify({totals:c.totals,categories:c.categories,limits:['Descriptions are inherited and unverified.','Palettes are sampled pixels; semantic role is inferred.','Source attribution and reuse rights are incomplete.']})}]});
    }
    case 'prompts/list':return reply(id,{prompts:[workflow]});
    case 'prompts/get': {
      if(params?.name!==workflow.name || typeof params?.arguments?.goal!=='string')return fail(id,-32602,'Supply reference_to_interface and a goal string');
      return reply(id,{description:workflow.description,messages:[{role:'user',content:{type:'text',text:`Design for this goal: ${params.arguments.goal}\nSearch UiHall with search_designs or design_brief. Open relevant references using asset_image. Compare observed structure, density, typography and states; cite IDs. Use motion_studies if interaction matters, then inspect the clips. Use implementation_plan to capture decisions. Preserve product/brand constraints. Author an original composition, label new tokens as authored, test accessibility and responsive states in a browser, and report actual evidence and limits.`}}]});
    }
    default:return fail(id,-32601,`Method not found: ${method}`);
  }
}
try {const c=loadCorpus();process.stderr.write(`[uihall] corpus loaded: ${c.assets.length} assets from ${c.__path}\n`);}catch(e){process.stderr.write(`[uihall] ${e.message}\n`);}
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
let queue=Promise.resolve();
lines.on('line',line=>{
  if(!line.trim())return;
  if(Buffer.byteLength(line)>1024*1024){fail(null,-32600,'Request exceeds 1 MB');return;}
  let msg;try{msg=JSON.parse(line);}catch{fail(null,-32700,'Parse error');return;}
  queue=queue.then(()=>handle(msg)).catch(e=>{if(msg?.id!==undefined)fail(msg.id,-32603,e.message);else process.stderr.write(`[uihall] ${e.message}\n`);});
});
lines.on('close',()=>queue.finally(()=>{process.exitCode=0;}));
