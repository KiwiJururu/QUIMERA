const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const htmlPath=path.join(out,'sheet.html');
let html=fs.readFileSync(htmlPath,'utf8');

const preload=String.raw`(() => {
  const PROJECT_REF='zdhztatcmxxpehbqhvat';
  const SESSION_KEY='sb-'+PROJECT_REF+'-auth-token';
  const syncEl=()=>document.querySelector('#sync');
  function setStatus(text,bad=false){const e=syncEl();if(!e)return;e.textContent=text;e.classList.toggle('bad',bad);e.classList.toggle('ok',!bad)}
  window.addEventListener('error',e=>{setStatus('Erro ao carregar',true);console.error('[Quimera]',e.error||e.message)});
  window.addEventListener('unhandledrejection',e=>{setStatus('Erro de conexão',true);console.error('[Quimera promise]',e.reason)});
  function cachedSession(){
    try{
      const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;
      const parsed=JSON.parse(raw);return parsed?.currentSession||parsed?.session||parsed||null;
    }catch{return null}
  }
  const originalCreate=window.supabase?.createClient?.bind(window.supabase);
  if(originalCreate){
    window.supabase.createClient=(url,key,options)=>{
      const client=originalCreate(url,key,options);window.__quimeraDb=client;
      const originalGet=client.auth.getSession.bind(client.auth);
      client.auth.getSession=async()=>{
        const s=cachedSession();
        if(s?.access_token)return {data:{session:s},error:null};
        return Promise.race([
          originalGet(),
          new Promise(resolve=>setTimeout(()=>resolve({data:{session:null},error:new Error('Tempo limite da sessão')}),4500))
        ]);
      };
      const originalFrom=client.from.bind(client);
      client.from=(table)=>{
        if(table!=='characters'||!cachedSession()?.access_token)return originalFrom(table);
        let mode='select',payload=null,filters={},single=false,selectCols='*';
        const chain={
          select(cols='*'){mode='select';selectCols=cols;return chain},
          update(data){mode='update';payload=data;return chain},
          eq(k,v){filters[k]=v;return chain},
          single(){single=true;return exec()},
          then(resolve,reject){return exec().then(resolve,reject)}
        };
        async function exec(){
          const session=cachedSession();if(!session?.access_token)return {data:null,error:{message:'Sessão não encontrada. Volte à campanha e entre novamente.'}};
          const qs=new URLSearchParams();
          if(mode==='select')qs.set('select',selectCols);
          Object.entries(filters).forEach(([k,v])=>qs.set(k,'eq.'+v));
          const headers={apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
          if(mode==='update')headers.Prefer='return=minimal';
          try{
            const r=await fetch(url+'/rest/v1/characters?'+qs.toString(),{method:mode==='update'?'PATCH':'GET',headers,body:mode==='update'?JSON.stringify(payload):undefined,cache:'no-store'});
            if(!r.ok){let j={};try{j=await r.json()}catch{};return {data:null,error:{message:j.message||('Erro '+r.status+' ao acessar a ficha.')}}}
            if(mode==='update')return {data:null,error:null};
            const data=await r.json();return {data:single?(data[0]||null):data,error:single&&!data[0]?{message:'Ficha não encontrada ou sem permissão.'}:null};
          }catch(e){return {data:null,error:{message:e?.message||'Falha de rede ao acessar a ficha.'}}}
        }
        return chain;
      };
      window.QuimeraRuntime={url,key,client,cachedSession,setStatus};
      return client;
    };
  }
  const tabs=document.querySelector('header .tabs');
  if(tabs&&!document.querySelector('[data-tab="initiative"]')){
    const b=document.createElement('button');b.className='tab';b.dataset.tab='initiative';b.textContent='Iniciativa';tabs.appendChild(b);
  }
  const main=document.querySelector('main');
  if(main&&!document.querySelector('#initiative')){
    const s=document.createElement('section');s.id='initiative';s.className='panel';s.innerHTML='<div class="paper"><h2>Iniciativa</h2><div id="sheetInitiative"><div class="muted">Carregando iniciativa...</div></div></div>';main.appendChild(s);
  }
})();`;

const initiative=String.raw`(() => {
  let started=false,campaign=null,isMaster=false,participants=[],channel=null;
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function runtime(){return window.QuimeraRuntime}
  async function rest(table,{method='GET',query={},body}={}){
    const rt=runtime(),session=rt?.cachedSession();if(!rt||!session?.access_token)throw new Error('Sessão não encontrada.');
    const qs=new URLSearchParams();Object.entries(query).forEach(([k,v])=>qs.set(k,v));
    const headers={apikey:rt.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
    if(method==='PATCH')headers.Prefer='return=representation';
    const r=await fetch(rt.url+'/rest/v1/'+table+(qs.toString()?'?'+qs.toString():''),{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});
    if(!r.ok){let j={};try{j=await r.json()}catch{};throw new Error(j.message||('Erro '+r.status));}return r.status===204?null:r.json();
  }
  function items(){return Array.isArray(campaign?.initiative)?campaign.initiative:[]}
  function sorted(){return [...items()].sort((a,b)=>(Number(b.value)||0)-(Number(a.value)||0)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR'))}
  function kind(k){return k==='player'?'Jogador':k==='npc'?'NPC':k==='monster'?'Monstro':'Outro'}
  function render(){
    const root=$('#sheetInitiative');if(!root)return;const list=sorted();
    root.innerHTML='<div class="initiative-sheet-head"><div class="muted">Ordem pelo resultado do teste, do maior para o menor.</div>'+(isMaster?'<div class="actions"><button id="sheetInitAdd" class="primary">+ Adicionar</button><button id="sheetInitClear" class="danger">Limpar</button></div>':'<span class="pill">somente o mestre edita</span>')+'</div><div class="initiative-sheet-list">'+(list.length?list.map((it,i)=>'<div class="initiative-sheet-row"><b class="initiative-pos">'+(i+1)+'</b><div><strong>'+esc(it.name||'Sem nome')+'</strong><small>'+esc(kind(it.kind))+'</small></div>'+(isMaster?'<input data-init-value="'+esc(it.id)+'" type="number" value="'+(Number(it.value)||0)+'">':'<b class="initiative-value">'+(Number(it.value)||0)+'</b>')+(isMaster?'<button class="danger" data-init-del="'+esc(it.id)+'">×</button>':'')+'</div>').join(''):'<div class="note">A iniciativa ainda não foi preenchida.</div>')+'</div>';
    if(!isMaster)return;
    $('#sheetInitAdd').onclick=openAdd;$('#sheetInitClear').onclick=()=>{if(items().length&&confirm('Limpar toda a iniciativa?'))save([])};
    root.querySelectorAll('[data-init-value]').forEach(inp=>{inp.onfocus=()=>inp.select();inp.onchange=()=>save(items().map(x=>x.id===inp.dataset.initValue?{...x,value:Number(inp.value)||0}:x))});
    root.querySelectorAll('[data-init-del]').forEach(b=>b.onclick=()=>save(items().filter(x=>x.id!==b.dataset.initDel));
  }
  async function save(next){campaign.initiative=next;render();try{const rows=await rest('campaigns',{method:'PATCH',query:{id:'eq.'+campaign.id},body:{initiative:next}});if(rows?.[0])campaign=rows[0]}catch(e){alert(e.message);await loadCampaign();render()}}
  function openAdd(){
    const root=$('#sheetInitiative'),old=$('#initiativeAddBox');if(old){old.remove();return}
    const box=document.createElement('div');box.id='initiativeAddBox';box.className='initiative-add-box';box.innerHTML='<div class="field"><label>Participante</label><select id="initiativePerson"><option value="">Outro / nome manual</option>'+participants.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' — '+esc(kind(c.kind))+'</option>').join('')+'</select></div><div class="field"><label>Nome manual</label><input id="initiativeName" placeholder="Opcional"></div><div class="field"><label>Resultado do teste</label><input id="initiativeRoll" type="number" value="0"></div><button id="initiativeConfirm" class="primary">Adicionar à ordem</button>';root.prepend(box);
    $('#initiativeConfirm').onclick=()=>{const id=$('#initiativePerson').value,c=participants.find(x=>x.id===id),name=$('#initiativeName').value.trim()||c?.name||'';if(!name)return alert('Escolha um participante ou digite um nome.');const it={id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2),character_id:id||null,name,kind:c?.kind||'custom',value:Number($('#initiativeRoll').value)||0};save([...items(),it])};
  }
  async function loadCampaign(){const rows=await rest('campaigns',{query:{id:'eq.'+row.campaign_id,select:'id,name,initiative'}});campaign=rows?.[0]||null}
  async function init(){if(started||typeof row==='undefined'||!row)return;started=true;try{
    const rt=runtime(),session=rt.cachedSession();
    const [campRows,memberRows,charRows]=await Promise.all([
      rest('campaigns',{query:{id:'eq.'+row.campaign_id,select:'id,name,initiative'}}),
      rest('campaign_members',{query:{campaign_id:'eq.'+row.campaign_id,user_id:'eq.'+session.user.id,select:'role'}}),
      rest('characters',{query:{campaign_id:'eq.'+row.campaign_id,is_archived:'eq.false',select:'id,name,kind'}})
    ]);
    campaign=campRows?.[0]||{id:row.campaign_id,initiative:[]};isMaster=memberRows?.[0]?.role==='master';participants=charRows||[];render();
    const db=rt.client;channel=db.channel('sheet-initiative-'+row.campaign_id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'campaigns',filter:'id=eq.'+row.campaign_id},p=>{if(p.new){campaign={...campaign,...p.new};render()}}).subscribe();
  }catch(e){const root=$('#sheetInitiative');if(root)root.innerHTML='<div class="note bad">Não foi possível carregar a iniciativa: '+esc(e.message)+'</div>'}}
  let tries=0;const timer=setInterval(()=>{tries++;if(typeof row!=='undefined'&&row){clearInterval(timer);init()}else if(tries>100){clearInterval(timer);const root=$('#sheetInitiative');if(root)root.innerHTML='<div class="note bad">A ficha não terminou de carregar.</div>'}},100);
})();`;

fs.writeFileSync(path.join(out,'sheet-preload.js'),preload);
fs.writeFileSync(path.join(out,'sheet-initiative.js'),initiative);
new vm.Script(preload,{filename:'sheet-preload.js'});new vm.Script(initiative,{filename:'sheet-initiative.js'});

const base='<script src="/sheet-data.js"></script><script src="/sheet-app.js"></script>';
const baseWithExtra='<script src="/sheet-data.js?v=9"></script><script src="/sheet-preload.js?v=9"></script><script src="/sheet-app.js?v=9"></script>';
if(html.includes(base)) html=html.replace(base,baseWithExtra);
else html=html.replace(/<script src="\/sheet-data\.js[^\"]*"><\/script><script src="\/sheet-app\.js[^\"]*"><\/script>/,baseWithExtra);
// build.js may already have inserted sheet-extra after sheet-app; ensure preload is before app and initiative is last.
html=html.replace('<script src="/sheet-data.js?v=9"></script><script src="/sheet-preload.js?v=9"></script><script src="/sheet-app.js?v=9"></script><script src="/sheet-extra.js"></script>','<script src="/sheet-data.js?v=9"></script><script src="/sheet-preload.js?v=9"></script><script src="/sheet-app.js?v=9"></script><script src="/sheet-extra.js?v=9"></script>');
html=html.replace('<script src="/sheet-master-extra.js"></script>','<script src="/sheet-master-extra.js?v=9"></script>');
if(!html.includes('/sheet-initiative.js'))html=html.replace('</body>','<script src="/sheet-initiative.js?v=9"></script></body>');
html=html.replace('</head>',`<style>
.initiative-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.initiative-sheet-list{display:grid;gap:8px}.initiative-sheet-row{display:grid;grid-template-columns:36px minmax(0,1fr) 82px auto;gap:9px;align-items:center;padding:9px;border:1px solid var(--line);border-radius:10px;background:#fff9ed99}.initiative-sheet-row strong{display:block}.initiative-sheet-row small{display:block;color:#6d6570}.initiative-pos,.initiative-value{color:var(--p);font-size:18px;text-align:center}.initiative-sheet-row input{padding:7px;text-align:center;font-weight:900}.initiative-add-box{display:grid;grid-template-columns:1.4fr 1fr .7fr auto;gap:9px;align-items:end;margin-bottom:12px;padding:10px;border:1px solid var(--line);border-radius:11px;background:#583b8c0c}@media(max-width:700px){.initiative-add-box{grid-template-columns:1fr}.initiative-sheet-row{grid-template-columns:30px minmax(0,1fr) 66px auto}}
</style></head>`);
fs.writeFileSync(htmlPath,html);
console.log('Quimera finalize: fallback de conexão + aba de iniciativa');
