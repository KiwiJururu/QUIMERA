const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const htmlPath=path.join(out,'sheet.html');
let html=fs.readFileSync(htmlPath,'utf8');

const preload=String.raw`(() => {
  const REF='zdhztatcmxxpehbqhvat', STORAGE='sb-'+REF+'-auth-token';
  const setStatus=(text,bad=false)=>{const e=document.querySelector('#sync');if(!e)return;e.textContent=text;e.classList.toggle('bad',bad);e.classList.toggle('ok',!bad)};
  function session(){try{const raw=localStorage.getItem(STORAGE);if(!raw)return null;const x=JSON.parse(raw);return x?.currentSession||x?.session||x||null}catch{return null}}
  window.addEventListener('error',e=>{setStatus('Erro ao carregar',true);console.error('[Quimera]',e.error||e.message)});
  window.addEventListener('unhandledrejection',e=>{setStatus('Erro de conexão',true);console.error('[Quimera]',e.reason)});
  const create=window.supabase?.createClient?.bind(window.supabase);
  if(!create)return;
  window.supabase.createClient=(url,key,options)=>{
    const client=create(url,key,options),originalGet=client.auth.getSession.bind(client.auth),originalFrom=client.from.bind(client);
    client.auth.getSession=async()=>{const s=session();if(s?.access_token)return {data:{session:s},error:null};return Promise.race([originalGet(),new Promise(r=>setTimeout(()=>r({data:{session:null},error:new Error('Tempo limite da sessão')}),4500))])};
    client.from=(table)=>{
      if(table!=='characters'||!session()?.access_token)return originalFrom(table);
      let mode='select',payload=null,filters={},one=false,cols='*',promise=null;
      const exec=()=>{if(promise)return promise;promise=(async()=>{const s=session();if(!s?.access_token)return {data:null,error:{message:'Sessão não encontrada. Volte à campanha e entre novamente.'}};const qs=new URLSearchParams();if(mode==='select')qs.set('select',cols);Object.entries(filters).forEach(([k,v])=>qs.set(k,'eq.'+v));const headers={apikey:key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'};if(mode==='update')headers.Prefer='return=minimal';try{const r=await fetch(url+'/rest/v1/characters?'+qs.toString(),{method:mode==='update'?'PATCH':'GET',headers,body:mode==='update'?JSON.stringify(payload):undefined,cache:'no-store'});if(!r.ok){let j={};try{j=await r.json()}catch{};return {data:null,error:{message:j.message||('Erro '+r.status+' ao acessar a ficha.')}}}if(mode==='update')return {data:null,error:null};const data=await r.json();return {data:one?(data[0]||null):data,error:one&&!data[0]?{message:'Ficha não encontrada ou sem permissão.'}:null}}catch(e){return {data:null,error:{message:e?.message||'Falha de rede ao acessar a ficha.'}}}})();return promise};
      const chain={select(c='*'){mode='select';cols=c;return chain},update(v){mode='update';payload=v;return chain},eq(k,v){filters[k]=v;return chain},single(){one=true;return exec()},then(ok,fail){return exec().then(ok,fail)}};return chain;
    };
    window.QuimeraRuntime={url,key,client,session,setStatus};return client;
  };
})();`;
new vm.Script(preload,{filename:'sheet-preload.js'});
fs.writeFileSync(path.join(out,'sheet-preload.js'),preload);

const old='<script src="/sheet-data.js?v=7"></script><script src="/sheet-app.js?v=7"></script><script src="/sheet-extra.js?v=7"></script>';
const fresh='<script src="/sheet-data.js?v=12"></script><script src="/sheet-preload.js?v=12"></script><script src="/sheet-app.js?v=12"></script><script src="/sheet-extra.js?v=12"></script>';
if(!html.includes(old))throw new Error('Scripts v7 da ficha não encontrados.');
html=html.replace(old,fresh)
  .replace('/sheet-master-extra.js?v=7','/sheet-master-extra.js?v=12')
  .replace('/sheet-initiative-extra.js?v=7','/sheet-initiative-extra.js?v=12');
fs.writeFileSync(htmlPath,html);
console.log('Quimera runtime v12: conexão da ficha protegida contra travamento');
