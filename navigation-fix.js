const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const release=String(process.env.QUIMERA_RELEASE||'30');
const indexPath=path.join(out,'index.html');
const sheetPath=path.join(out,'sheet.html');
let index=fs.readFileSync(indexPath,'utf8');
let sheet=fs.readFileSync(sheetPath,'utf8');

if(!index.includes('/dashboard-navigation-v29.js'))index=index.replace('</body>','<script src="/dashboard-navigation-v29.js?v='+release+'"></script></body>');
if(!sheet.includes('/sheet-navigation-v29.js'))sheet=sheet.replace('</body>','<script src="/sheet-navigation-v29.js?v='+release+'"></script></body>');

function dashboardNavigationRuntime(){
  const MASTER_TABS=new Set(['session','players','npcs','monsters']);
  const PLAYER_TABS=new Set(['players']);
  function allowedTab(tab){return (currentRole==='master'?MASTER_TABS:PLAYER_TABS).has(tab)}
  function folderForTab(tab){
    if(tab!=='npcs'&&tab!=='monsters')return null;
    try{
      const fromRuntime=window.QuimeraFolderSelection?.get?.(tab);
      if(fromRuntime&&fromRuntime!=='all')return fromRuntime;
      const p=new URLSearchParams(location.search);
      if(p.get('tab')===tab&&p.has('folder'))return p.get('folder');
    }catch{}
    return null;
  }
  function campaignUrl(tab=activeTab){
    const u=new URL(location.href);u.pathname='/';u.search='';u.hash='';
    if(currentCampaign?.id){
      u.searchParams.set('campaign',currentCampaign.id);
      if(allowedTab(tab))u.searchParams.set('tab',tab);
      const folder=folderForTab(tab);if(folder)u.searchParams.set('folder',folder);
    }
    return u.pathname+u.search;
  }
  function syncCampaignUrl(tab=activeTab){
    if(!currentCampaign)return;
    const folder=folderForTab(tab);
    history.replaceState({campaign:currentCampaign.id,tab,folder:folder||null},'',campaignUrl(tab));
  }

  if(typeof openCampaign==='function'){
    const previousOpenCampaign=openCampaign;
    openCampaign=async function(id,push=true){
      const before=new URLSearchParams(location.search);
      const requested=before.get('campaign')===String(id)?before.get('tab'):null;
      const result=await previousOpenCampaign.apply(this,arguments);
      if(!currentCampaign)return result;
      if(requested&&allowedTab(requested)&&requested!==activeTab){activeTab=requested;renderCampaignBody()}
      syncCampaignUrl(activeTab);
      return result;
    };
  }

  document.addEventListener('click',event=>{
    const tab=event.target.closest?.('#campaignTabs .tab');
    if(tab&&currentCampaign){setTimeout(()=>syncCampaignUrl(tab.dataset.tab||activeTab),0);return}
    const open=event.target.closest?.('[data-open-sheet]');
    if(!open||!currentCampaign)return;
    event.preventDefault();event.stopImmediatePropagation();
    syncCampaignUrl(activeTab);
    const u=new URL('/ficha',location.origin);
    u.searchParams.set('id',open.dataset.openSheet);
    u.searchParams.set('returnCampaign',currentCampaign.id);
    if(allowedTab(activeTab))u.searchParams.set('returnTab',activeTab);
    const folder=folderForTab(activeTab);if(folder)u.searchParams.set('returnFolder',folder);
    location.href=u.pathname+u.search;
  },true);

  try{
    const p=new URLSearchParams(location.search),tab=p.get('tab');
    if(currentCampaign&&tab&&allowedTab(tab)&&tab!==activeTab){activeTab=tab;renderCampaignBody()}
    if(currentCampaign)syncCampaignUrl(activeTab);
  }catch(error){console.warn('[Quimera navegação painel]',error)}
  window.QuimeraNavigation={sync:syncCampaignUrl,campaignUrl,folderForTab};
}

function sheetNavigationRuntime(){
  function fallbackCampaignUrl(){
    const p=new URLSearchParams(location.search);
    const campaign=p.get('returnCampaign')||row?.campaign_id||'';
    const tab=p.get('returnTab')||'';
    const folder=p.get('returnFolder')||'';
    const u=new URL('/',location.origin);
    if(campaign)u.searchParams.set('campaign',campaign);
    if(tab)u.searchParams.set('tab',tab);
    if(folder&&(tab==='npcs'||tab==='monsters'))u.searchParams.set('folder',folder);
    return u.pathname+u.search;
  }
  function sameOriginPreviousPage(){
    try{
      if(!document.referrer)return false;
      const ref=new URL(document.referrer);
      return ref.origin===location.origin&&!/^\/ficha\/?$/.test(ref.pathname);
    }catch{return false}
  }
  function returnToPrevious(){
    if(sameOriginPreviousPage()&&history.length>1){history.back();return}
    location.href=fallbackCampaignUrl();
  }
  document.addEventListener('click',event=>{
    const back=event.target.closest?.('#back');if(!back)return;
    event.preventDefault();event.stopImmediatePropagation();returnToPrevious();
  },true);
  window.QuimeraReturnToPrevious=returnToPrevious;
}

const dashboard='('+dashboardNavigationRuntime.toString()+')();';
const sheetRuntime='('+sheetNavigationRuntime.toString()+')();';
new vm.Script(dashboard,{filename:'dashboard-navigation-v29.js'});
new vm.Script(sheetRuntime,{filename:'sheet-navigation-v29.js'});
fs.writeFileSync(path.join(out,'dashboard-navigation-v29.js'),dashboard);
fs.writeFileSync(path.join(out,'sheet-navigation-v29.js'),sheetRuntime);
index=index.replace(/\?v=\d+/g,'?v='+release);
sheet=sheet.replace(/\?v=\d+/g,'?v='+release);
fs.writeFileSync(indexPath,index);fs.writeFileSync(sheetPath,sheet);

const infoPath=path.join(out,'build-info.json');
if(fs.existsSync(infoPath)){
  const info=JSON.parse(fs.readFileSync(infoPath,'utf8'));info.release=Number(release);info.features=Array.from(new Set([...(info.features||[]),'navigation-context','folder-navigation-context']));fs.writeFileSync(infoPath,JSON.stringify(info,null,2));
}
console.log('Quimera v'+release+': contexto de campanha, aba e pasta preservado ao abrir e voltar de fichas.');
