/* UiHall workbench: local-first study boards and an executable agent handoff. */
const Workbench = (() => {
  let saved = new Set();
  try { const value = JSON.parse(localStorage.getItem('uihall.shortlist') || '[]'); if (Array.isArray(value)) saved = new Set(value.filter(x => typeof x === 'string')); } catch (_) {}
  let timer;
  function notify(message) {
    const node = document.getElementById('toast');
    node.textContent = message; node.hidden = false;
    clearTimeout(timer); timer = setTimeout(() => { node.hidden = true; }, 2400);
  }
  function sync() {
    document.getElementById('boardCount').textContent = saved.size;
    document.getElementById('boardCount').setAttribute('aria-label', saved.size + ' saved references');
    document.querySelectorAll('[data-save-reference]').forEach(button => {
      const on = saved.has(button.dataset.saveReference);
      button.setAttribute('aria-pressed', String(on));
      button.textContent = button.classList.contains('lb-save') ? (on ? 'Remove from shortlist' : 'Add to shortlist') : (on ? '▣' : '⊞');
      button.setAttribute('aria-label', `${on ? 'Remove from' : 'Add to'} shortlist: ${DATA.get(button.dataset.saveReference)?.title || button.dataset.saveReference}`);
    });
  }
  function toggle(id) {
    const had = saved.has(id);
    if (had) saved.delete(id); else saved.add(id);
    try { localStorage.setItem('uihall.shortlist', JSON.stringify([...saved])); } catch (_) { notify('Storage unavailable. Your shortlist is saved for this visit.'); }
    sync();
    if (document.getElementById('boardDialog').open) renderBoard();
  }
  function saveButton(asset) {
    const button = el('button', { type:'button', class:'save-reference', dataset:{saveReference:asset.id}, 'aria-pressed':String(saved.has(asset.id)), 'aria-label': `${saved.has(asset.id) ? 'Remove from' : 'Add to'} shortlist: ${asset.title}`, text:saved.has(asset.id) ? '▣' : '⊞', onclick:()=>toggle(asset.id) });
    return button;
  }
  function renderBoard() {
    const list = document.getElementById('boardItems'); list.replaceChildren();
    const assets = [...saved].map(id => DATA.get(id)).filter(Boolean);
    if (!assets.length) list.append(el('p',{class:'board-intro',text:'Your table is clear. Use the ⊞ on any reference to start a shortlist.'}));
    for (const a of assets) {
      list.append(el('div',{class:'board-item'}, el('img',{src:a.thumb || a.src,alt:''}), el('p',{text:a.title},el('small',{text:`${a.id} / ${fmt.titleCase(a.category)}`})),el('button',{type:'button',text:'Remove', 'aria-label':`Remove ${a.title}`,onclick:()=>toggle(a.id)})));
    }
    document.getElementById('copyBrief').disabled = !assets.length;
  }
  function brief() {
    const goal = document.getElementById('briefGoal').value.trim() || 'Define the product, audience and primary action with me before implementation.';
    return `# UiHall implementation study\n\nGoal: ${goal}\n\n## Reference evidence\n${[...saved].map(id=>DATA.get(id)).filter(Boolean).map(a=>`- ${a.id}: ${a.title}\n  Open: https://nikithamal.github.io/UiHall/ui-hall/#/gallery?asset=${encodeURIComponent(a.id)}\n  Corpus description (not independently reverified): ${a.description || 'Not described.'}\n  Sampled palette: ${(a.palette||[]).join(', ')}\n  Capture note: ${a.quality || 'Not recorded.'}`).join('\n\n')}\n\n## Implementation direction\nOpen and inspect the actual references (MCP: get_asset, asset_image). Identify hierarchy, spacing, density and interaction principles; cite reference IDs for observations. Descriptions are fallible and pixel palettes are not semantic design tokens. Transfer principles, preserve our brand, and create an original composition. Define responsive tokens and focus, empty, loading, error and long-content states. Specify motion purpose, duration, easing and reduced-motion alternative; inspect clips before claiming timing. Check text contrast, keyboard use, 360px layout and media loading in a browser. Explain what was observed, inferred and newly authored. Reference media remains the property of its creators.\n`;
  }
  async function copy(text, button) {
    try { await navigator.clipboard.writeText(text); notify('Copied. Take it into your next build.'); return true; }
    catch (_) {
      const area = el('textarea',{value:text, 'aria-label':'Copy this text'}); document.body.append(area);area.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {} area.remove();
      notify(ok ? 'Copied. Take it into your next build.' : 'Copy unavailable. Try a browser with clipboard access.'); return ok;
    }
  }
  const config = JSON.stringify({mcpServers:{uihall:{command:'node',args:['/absolute/path/to/UiHall/stormy-mcp/server.js']}}},null,2);
  function agents(container) {
    container.dataset.view='grid';container.replaceChildren();
    const page = el('div',{class:'agent-page'});
    page.append(el('section',{class:'agent-intro'},el('p',{class:'eyebrow',text:'REFERENCE → REASONING → IMPLEMENTATION'}),el('h2',{html:'Give your agent<br><em>a better starting point.</em>'}),el('p',{text:'A corpus, an MCP server, and a skill that connects the two. Search real work, inspect the source, and turn what you learn into a deliberate interface.'})));
    const flow = el('div',{class:'agent-flow'});
    for (const [n,title,body] of [['01 / DISCOVER','Find the right evidence.','Search by intent, screen role, style or surface. Retrieve focused references without loading the whole archive into context.'],['02 / UNDERSTAND','Look before you build.','Open images and clips. Separate visible evidence from interpretation. Sampled colours are a starting point, not an accessible theme.'],['03 / MAKE','Translate, then validate.','Use the skill to turn principles into tokens, responsive components and purposeful motion. Test the actual implementation in a browser.']]) flow.append(el('article',{},el('small',{text:n}),el('h3',{text:title}),el('p',{text:body})));
    page.append(flow);
    const install = el('section',{class:'agent-install'},el('h3',{text:'One archive. Your agent of choice.'}),el('p',{text:'Clone the repository, then add this stdio server to your MCP client. Replace the absolute path with your checkout.'}),el('pre',{text:config}),el('button',{class:'btn',type:'button',text:'Copy MCP configuration ↗',onclick:()=>copy(config)}));page.append(install);
    const proof = el('section',{class:'agent-proof'},el('p',{class:'eyebrow',text:'BUILT WITH THE WORKFLOW'}),el('h3',{text:'The archive is its own case study.'}),el('p',{text:'We used UiHall to redesign UiHall. VID-0377 informs restrained contrast and an image-led composition; VID-0397 provides a compact interaction reference. The archive chrome, olive palette, typographic scale and study-table composition are newly authored decisions.'}));
    const refs=el('div',{class:'agent-references'});
    for(const id of ['VID-0377','VID-0397']) { const a=DATA.get(id); if(a) refs.append(el('button',{type:'button',onclick:()=>Lightbox.open(id)},el('img',{src:a.thumb,alt:a.title}),el('span',{text:id+' ↗'}))); } proof.append(refs);
    proof.append(el('p',{html:'Read the repository’s <a href="https://github.com/NikitHamal/UiHall/tree/main/skills/stormy-design" target="_blank" rel="noreferrer">design skill</a> for the workflow. The existing <code>stormy-design</code> folder remains compatible. Start with <code>search_designs</code>, then <code>get_asset</code> and <code>asset_image</code>.'}),el('p',{text:'No API key is required for the local MCP server. UiHall does not call an AI service from this site. Reference media and original product designs are not included in a commercial reuse licence.'}));
    page.append(proof);container.append(page);
  }
  function motionStage(assets) {
    const preferred = ['VID-0397','VID-0400','VID-0430'];
    const selected = preferred.map(id=>assets.find(a=>a.id===id)).filter(Boolean);
    if(!selected.length) selected.push(...assets.slice(0,3));
    const stage = el('section',{class:'motion-stage','aria-label':'Motion study player'});
    const media = el('video',{controls:true,muted:true,playsinline:true,preload:'none',poster:selected[0].src,src:selected[0].clip});
    const title=el('h3',{text:selected[0].title});
    const note=el('p',{text:'Watch the trigger, the transition and what stays still. Recording duration is not transition duration.'});
    const info=el('div',{class:'motion-stage__info'},el('p',{class:'eyebrow',text:'THE MOTION ROOM / PRESS PLAY'}),title,note);
    const tabs=el('div',{class:'motion-stage__tabs',role:'group','aria-label':'Select motion study'});
    selected.forEach((a,i)=>tabs.append(el('button',{type:'button','aria-pressed':String(i===0),text:String(i+1).padStart(2,'0')+' / '+a.id,onclick:()=>{media.pause();media.src=a.clip;media.poster=a.src;media.load();title.textContent=a.title;tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent.includes(a.id))));}})));
    const speed=el('select',{'aria-label':'Playback speed'},...[[.5,'0.5×'],[1,'1×'],[1.5,'1.5×']].map(([value,text])=>el('option',{value:String(value),text,selected:value===1})));
    speed.addEventListener('change',()=>{media.playbackRate=Number(speed.value);});
    info.append(tabs,el('label',{class:'motion-speed',text:'Study speed '},speed));
    stage.append(el('div',{class:'motion-stage__media'},media),info);
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)media.pause();},{threshold:0}).observe(stage);
    return stage;
  }
  async function boot() {
    await DATA.load();
    saved = new Set([...saved].filter(id=>DATA.get(id))); sync();
    document.querySelector('.hero__primary').addEventListener('click',e=>{e.preventDefault();document.getElementById('explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
    const shell=document.getElementById('shell'), sidebar=document.getElementById('sidebar'), toggleButton=document.getElementById('filterToggle'), dismiss=document.getElementById('filterDismiss');
    const closeFilters=()=>{shell.classList.remove('is-mobileopen');toggleButton.focus();};
    document.getElementById('filterClose').onclick=closeFilters;dismiss.onclick=closeFilters;
    const syncFilterVisibility=()=>{const mobile=innerWidth<=960;const open=mobile?shell.classList.contains('is-mobileopen'):!shell.classList.contains('is-collapsed');sidebar.inert=!open;toggleButton.setAttribute('aria-expanded',String(open));dismiss.hidden=!mobile||!open;};
    new MutationObserver(syncFilterVisibility).observe(shell,{attributes:true,attributeFilter:['class']});window.addEventListener('resize',syncFilterVisibility);syncFilterVisibility();
    document.addEventListener('keydown',e=>{if(innerWidth<=960&&shell.classList.contains('is-mobileopen')){if(e.key==='Escape'){e.preventDefault();closeFilters();}if(e.key==='Tab'){const targets=[...sidebar.querySelectorAll('button,input,summary,a')].filter(n=>n.offsetParent!==null&&!n.disabled);const first=targets[0],last=targets.at(-1);if(!sidebar.contains(document.activeElement)||e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}});
    toggleButton.addEventListener('click',()=>{if(innerWidth<=960&&shell.classList.contains('is-mobileopen'))document.getElementById('q').focus();});
    document.getElementById('boardOpen').addEventListener('click',()=>{renderBoard();document.getElementById('boardDialog').showModal();});
    document.getElementById('boardClose').addEventListener('click',()=>document.getElementById('boardDialog').close());
    document.getElementById('copyBrief').addEventListener('click',async()=>{const ok=await copy(brief());document.getElementById('boardStatus').textContent=ok?'Brief copied, including reference IDs and capture caveats.':'Clipboard unavailable; please enable clipboard access.';});
    document.querySelectorAll('[data-open-asset]').forEach(b=>b.addEventListener('click',()=>Lightbox.open(b.dataset.openAsset)));
    document.querySelectorAll('[data-discover]').forEach(b=>b.addEventListener('click',()=>{Filters.resetAll();Filters.setRoute(b.dataset.discover==='motion'?'motion':'gallery');Filters.state.category=b.dataset.discover && b.dataset.discover!=='motion'?[b.dataset.discover]:[];Filters.writeUrl();App.syncControls();App.render();}));
    document.addEventListener('keydown',e=>{if(e.key==='/' && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]') && document.getElementById('lightbox').hidden){e.preventDefault();if(innerWidth<=960)document.getElementById('shell').classList.add('is-mobileopen');document.getElementById('q').focus();}});
    const id = new URLSearchParams(location.hash.split('?')[1]||'').get('asset');if(id && DATA.get(id))Lightbox.open(id);
  }
  document.addEventListener('DOMContentLoaded',()=>boot().catch(()=>{}));
  return {saveButton,toggle,sync,agents,notify,motionStage};
})();
