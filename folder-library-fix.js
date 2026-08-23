const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const release=String(process.env.QUIMERA_RELEASE||'30');
const indexPath=path.join(out,'index.html');
let index=fs.readFileSync(indexPath,'utf8');

if(!index.includes('/dashboard-folders-v30.js'))index=index.replace('</body>','<script src="/dashboard-folders-v30.js?v='+release+'"></script></body>');
if(!index.includes('id="folder-library-v30-style"'))index=index.replace('</head>',`<style id="folder-library-v30-style">
.folder-row[data-folder-select]{cursor:pointer}.folder-row[data-folder-select]:focus{outline:2px solid var(--purple);outline-offset:2px}.folder.folder-active>.folder-row{background:rgba(88,59,140,.14);box-shadow:inset 3px 0 0 var(--purple)}.folder-count{font-size:10px;font-weight:900;color:var(--muted);white-space:nowrap}.folder-library-title{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.folder-library-title .badge{font-size:10px}.folder-empty-note{margin-top:10px}.folder-row .folder-name{min-width:0}
</style></head>`);

function folderRuntime(){
  const selected={npc:null,monster:null};
  const tabForKind=kind=>kind==='npc'?'npcs':'monsters';
  const kindForTab=tab=>tab==='npcs'?'npc':tab==='monsters'?'monster':null;
  function availableFolder(kind,id){return folders.some(f=>f.id===id&&(f.kind===kind||f.kind==='mixed'))}
  function normalize(kind,value){
    if(value==='none'||value==='all')return value;
    return availableFolder(kind,value)?value:'all';
  }
  function selectionFromUrl(kind){
    try{
      const p=new URLSearchParams(location.search);
      if(p.get('tab')===tabForKind(kind)&&p.has('folder'))return normalize(kind,p.get('folder'));
    }catch{}
    return 'all';
  }
  function currentSelection(kind){
    if(selected[kind]==null)selected[kind]=selectionFromUrl(kind);
    selected[kind]=normalize(kind,selected[kind]);
    return selected[kind];
  }
  function folderName(kind,value){
    if(value==='all')return 'Todos';
    if(value==='none')return 'Sem pasta';
    return folders.find(f=>f.id===value)?.name||'Todos';
  }
  function syncFolderUrl(kind,value){
    if(activeTab!==tabForKind(kind)||!currentCampaign)return;
    const u=new URL(location.href);u.searchParams.set('campaign',currentCampaign.id);u.searchParams.set('tab',activeTab);
    if(value==='all')u.searchParams.delete('folder');else u.searchParams.set('folder',value);
    history.replaceState({campaign:currentCampaign.id,tab:activeTab,folder:value},'',u.pathname+u.search);
  }
  function setSelection(kind,value,{render=true}={}){
    selected[kind]=normalize(kind,value);syncFolderUrl(kind,selected[kind]);if(render)renderLibrary(kind);
  }
  function directCount(kind,folderId){return chars.filter(c=>c.kind===kind&&(folderId==='none'?!c.folder_id:c.folder_id===folderId)).length}
  function folderTreeV30(kind,parent=null){
    const active=currentSelection(kind);
    return folders.filter(f=>(f.parent_id||null)===parent&&(f.kind===kind||f.kind==='mixed')).map(f=>{
      const count=directCount(kind,f.id),on=active===f.id;
      return '<div class="folder '+(on?'folder-active':'')+'" data-folder-drop="'+esc(f.id)+'"><div class="folder-row" data-folder-select="'+esc(f.id)+'" role="button" tabindex="0"><span>📁</span><span class="folder-name">'+esc(f.name)+'</span><span class="folder-count">'+count+'</span><button class="btn small" data-add-sub="'+esc(f.id)+'" title="Criar subpasta">+</button></div><div class="folder-children">'+folderTreeV30(kind,f.id)+'</div></div>';
    }).join('');
  }
  folderTree=function(kind,parent=null){return folderTreeV30(kind,parent)};

  const previousBindEntityActions=bindEntityActions;
  bindEntityActions=function(){
    previousBindEntityActions();
    document.querySelectorAll('[data-move]').forEach(select=>{
      select.onchange=async()=>{
        const ch=chars.find(x=>x.id===select.dataset.move);if(!ch)return;
        const old=ch.folder_id||null,next=select.value||null;select.disabled=true;
        const {error}=await sb.from('characters').update({folder_id:next}).eq('id',ch.id).eq('campaign_id',currentCampaign.id);
        select.disabled=false;
        if(error){select.value=old||'';toast(error.message);return}
        ch.folder_id=next;toast(next?'Movido para a pasta.':'Movido para Sem pasta.');
        if(activeTab===tabForKind(ch.kind))renderLibrary(ch.kind);
      };
    });
  };

  bindFolderDrops=function(kind){
    document.querySelectorAll('[data-folder-drop]').forEach(el=>{
      el.ondragover=e=>{e.preventDefault();el.classList.add('drop')};
      el.ondragleave=()=>el.classList.remove('drop');
      el.ondrop=async e=>{
        e.preventDefault();e.stopPropagation();el.classList.remove('drop');
        const id=e.dataTransfer.getData('text/plain'),ch=chars.find(x=>x.id===id);if(!ch||ch.kind!==kind)return;
        const next=el.dataset.folderDrop||null,old=ch.folder_id||null;
        const {error}=await sb.from('characters').update({folder_id:next}).eq('id',id).eq('campaign_id',currentCampaign.id);
        if(error){ch.folder_id=old;toast(error.message);return}
        ch.folder_id=next;toast(next?'Movido para a pasta.':'Movido para Sem pasta.');renderLibrary(kind);
      };
    });
  };

  createFolder=function(kind,parentId){
    const parentOptions=folders.filter(f=>f.kind===kind||f.kind==='mixed').map(f=>'<option value="'+esc(f.id)+'" '+(parentId===f.id?'selected':'')+'>'+esc(f.name)+'</option>').join('');
    showModal('Nova pasta','<div class="field"><label>Nome</label><input id="folderName" placeholder="Ex.: NPCs da Cidade Baixa"></div><div class="field"><label>Dentro de</label><select id="folderParent"><option value="">Raiz</option>'+parentOptions+'</select></div><button id="saveFolder" class="btn primary" style="width:100%">Criar pasta</button>');
    document.querySelector('#saveFolder').onclick=async()=>{
      const name=document.querySelector('#folderName').value.trim();if(!name)return toast('Digite um nome para a pasta.');
      const payload={campaign_id:currentCampaign.id,parent_id:document.querySelector('#folderParent').value||null,name,kind};
      const {data,error}=await sb.from('folders').insert(payload).select('*').single();if(error)return toast(error.message);
      folders.push(data);closeModal();selected[kind]=data.id;syncFolderUrl(kind,data.id);renderLibrary(kind);toast('Pasta criada.');
    };
  };

  renderLibrary=function(kind){
    const title=kind==='npc'?'NPCs':'Monstros',all=chars.filter(c=>c.kind===kind),choice=currentSelection(kind);
    const filtered=choice==='all'?all:choice==='none'?all.filter(c=>!c.folder_id):all.filter(c=>c.folder_id===choice);
    const activeName=folderName(kind,choice);
    document.querySelector('#campaignBody').innerHTML='<div class="panel-head"><div><div class="folder-library-title"><h3 style="margin:0">Biblioteca de '+title+'</h3><span class="badge">'+esc(activeName)+'</span></div><div class="muted">Clique em uma pasta para ver apenas o conteúdo dela. Arraste no computador ou use o seletor de pasta em cada ficha para mover itens.</div></div><div class="actions"><input id="entitySearch" class="search" placeholder="Buscar '+title.toLowerCase()+'..."><button id="newFolder" class="btn">+ Pasta</button><button id="newEntity" class="btn primary">+ '+(kind==='npc'?'NPC':'Monstro')+'</button></div></div><div class="split" style="margin-top:12px"><aside class="sidebar"><div class="muted" style="font-weight:900;margin-bottom:6px">PASTAS</div><div class="folder '+(choice==='all'?'folder-active':'')+'"><div class="folder-row" data-folder-select="all" role="button" tabindex="0"><span>🗃️</span><span class="folder-name">Todos</span><span class="folder-count">'+all.length+'</span></div></div><div id="folderRoot" class="folder '+(choice==='none'?'folder-active':'')+'" data-folder-drop=""><div class="folder-row" data-folder-select="none" role="button" tabindex="0"><span>🗂️</span><span class="folder-name">Sem pasta</span><span class="folder-count">'+directCount(kind,'none')+'</span></div></div>'+folderTreeV30(kind)+'</aside><div><div id="entityGrid" class="entity-grid">'+(filtered.map(c=>entityCard(c,{master:true,kind,showMove:true})).join('')||'<div class="empty">Nenhum '+(kind==='npc'?'NPC':'monstro')+' nesta pasta.</div>')+'</div></div></div>';
    bindEntityActions();bindFolderDrops(kind);
    document.querySelector('#newFolder').onclick=()=>createFolder(kind,null);document.querySelector('#newEntity').onclick=()=>createCharacter(kind);
    document.querySelectorAll('[data-add-sub]').forEach(b=>b.onclick=e=>{e.stopPropagation();createFolder(kind,b.dataset.addSub)});
    document.querySelectorAll('[data-folder-select]').forEach(el=>{
      const select=()=>setSelection(kind,el.dataset.folderSelect);
      el.onclick=e=>{if(e.target.closest('[data-add-sub]'))return;select()};
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}};
    });
    document.querySelector('#entitySearch').oninput=e=>{const needle=e.target.value.trim().toLowerCase();document.querySelectorAll('#entityGrid .entity').forEach(el=>{const ch=chars.find(x=>x.id===el.dataset.charId);el.classList.toggle('hidden',!!needle&&!String(ch?.name||'').toLowerCase().includes(needle))})};
  };

  const previousRenderCampaignBody=renderCampaignBody;
  renderCampaignBody=function(){
    const kind=kindForTab(activeTab);if(kind&&selected[kind]==null)selected[kind]=selectionFromUrl(kind);
    return previousRenderCampaignBody.apply(this,arguments);
  };

  window.QuimeraFolderSelection={
    get(tabOrKind){const kind=tabOrKind==='npc'||tabOrKind==='monster'?tabOrKind:kindForTab(tabOrKind);return kind?currentSelection(kind):'all'},
    set(tabOrKind,value){const kind=tabOrKind==='npc'||tabOrKind==='monster'?tabOrKind:kindForTab(tabOrKind);if(kind)setSelection(kind,value)},
    refresh(){const kind=kindForTab(activeTab);if(kind)renderLibrary(kind)}
  };
}

const runtime='('+folderRuntime.toString()+')();';
new vm.Script(runtime,{filename:'dashboard-folders-v30.js'});
fs.writeFileSync(path.join(out,'dashboard-folders-v30.js'),runtime);
index=index.replace(/\?v=\d+/g,'?v='+release);
fs.writeFileSync(indexPath,index);

const infoPath=path.join(out,'build-info.json');
if(fs.existsSync(infoPath)){
  const info=JSON.parse(fs.readFileSync(infoPath,'utf8'));info.release=Number(release);info.features=Array.from(new Set([...(info.features||[]),'folder-browsing','folder-immediate-move']));fs.writeFileSync(infoPath,JSON.stringify(info,null,2));
}
console.log('Quimera v'+release+': pastas de NPCs/monstros navegáveis e movimentação imediata.');
