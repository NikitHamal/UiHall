#!/usr/bin/env node
/** CLI adapter to the same implementation and validation used by MCP. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=process.env.UIHALL_ROOT || path.resolve(here,'../../..');
const candidates=[process.env.UIHALL_CORPUS,process.env.STORMY_CORPUS,path.join(repo,'ui-hall/data/corpus.json'),path.resolve(here,'../corpus.json')].filter(Boolean);
const file=candidates.find(f=>fs.existsSync(f));
const engine=[path.join(repo,'stormy-mcp/tools.js'),path.join(here,'lib/tools.mjs')].find(f=>fs.existsSync(f));
const names={search:'search_designs',asset:'get_asset',facets:'list_facets',brief:'design_brief',palette:'palette_for',compare:'compare_pair',image:'asset_image',motion:'motion_studies',plan:'implementation_plan',diff:'compare_designs',stats:'corpus_stats'};
const argv=process.argv.slice(2);const cmd=argv.shift();
if(!cmd || cmd==='--help' || cmd==='help'){
 console.log('UiHall design workbench\nCommands: search, asset, facets, brief, palette, compare, image, motion, plan, diff, stats\nExamples:\n  node scripts/stormy.mjs search "editorial website" --limit 4\n  node scripts/stormy.mjs image VID-0377\n  node scripts/stormy.mjs plan "Design reference library" --ids VID-0377,VID-0397\nOutput: JSON (or asset --markdown). Filters use --category website --surface dark.\nRequires full checkout or UIHALL_ROOT; UIHALL_CORPUS selects a custom corpus.');process.exit(0);
}
try{
 if(!names[cmd])throw new Error(`Unknown command: ${cmd}. Use --help.`);
 if(!file || !engine)throw new Error('UiHall checkout unavailable. Set UIHALL_ROOT to your cloned UiHall repository.');
 const flags={};const positional=[];
 for(let i=0;i<argv.length;i++){
  const arg=argv[i];
  if(!arg.startsWith('--')){positional.push(arg);continue;}
  const [key,inline]=arg.slice(2).split(/=(.*)/s);const next=argv[i+1];
  const raw=inline!==undefined?inline:next&&!next.startsWith('--')?argv[++i]:true;
  flags[key.replaceAll('-','_')]=raw;
 }
 const {TOOLS,callTool}=await import(pathToFileURL(engine));
 const tool=TOOLS.find(t=>t.name===names[cmd]);const args={};
 const primary={search:'query',asset:'id',brief:'screen',palette:'mood',compare:'topic',image:'id',motion:'query',plan:'goal'}[cmd];
 if(primary && positional.length)args[primary]=positional.join(' ');
 for(let [key,value] of Object.entries(flags)){
  if(key==='json')continue;
  if(key==='markdown')key='include_markdown';
  if(key==='motion')key='has_motion';
  const schema=tool.inputSchema.properties[key];
  if(!schema)throw new Error(`Unknown flag --${key}`);
  if(schema.type==='array')value=String(value).split(',');
  else if(schema.type==='integer'){if(value===true)throw new Error(`--${key} needs an integer`);value=Number(value);}
  else if(schema.type==='boolean'){if(![true,'true','false'].includes(value))throw new Error(`--${key} needs true or false`);value=value===true || value==='true';}
  args[key]=value;
 }
 const corpus={...JSON.parse(fs.readFileSync(file,'utf8')),__path:file};
 const result=await callTool(names[cmd],args,corpus,path.dirname(engine));
 console.log(typeof result==='string'?result:JSON.stringify(result,null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
