const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const sheetPath=path.join(out,'sheet.html');
const indexPath=path.join(out,'index.html');
const release=String(process.env.QUIMERA_RELEASE||'23');

let sheet=fs.readFileSync(sheetPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');

// Um único ponto final define a versão de cache de todos os assets gerados.
sheet=sheet.replace(/\?v=\d+/g,'?v='+release);
index=index.replace(/\?v=\d+/g,'?v='+release);

if(!sheet.includes('name="quimera-release"')){
  sheet=sheet.replace('</head>','<meta name="quimera-release" content="'+release+'"></head>');
}
if(!index.includes('name="quimera-release"')){
  index=index.replace('</head>','<meta name="quimera-release" content="'+release+'"></head>');
}

const filterCss=`
<style id="sheet-filter-style">
.sheet-filterbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:10px 0 4px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff9ed80}
.sheet-filter-toggle{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:900;color:var(--p);cursor:pointer;user-select:none}.sheet-filter-toggle input{width:auto;margin:0;accent-color:var(--p)}
.sheet-filter-count{font-size:10px;font-weight:850;color:#6d6570}.sheet-filter-empty{margin-top:12px;padding:14px;text-align:center;border:1px dashed var(--line);border-radius:10px;color:#6d6570;font-size:12px}
@media(max-width:520px){.sheet-filterbar{align-items:flex-start}.sheet-filter-count{width:100%}}
</style>`;
if(!sheet.includes('id="sheet-filter-style"'))sheet=sheet.replace('</head>',filterCss+'</head>');
if(!sheet.includes('/sheet-filters.js'))sheet=sheet.replace('</body>','<script src="/sheet-filters.js?v='+release+'"></script></body>');
if(!index.includes('/dashboard-release.js'))index=index.replace('</body>','<script src="/dashboard-release.js?v='+release+'"></script></body>');

function sheetFiltersRuntime(){
  const STORE='quimera.sheet.filters.v1';
  let state={skillsOwned:false,advantagesOwned:false};

  function loadState(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||'{}');
      state.skillsOwned=!!saved.skillsOwned;
      state.advantagesOwned=!!saved.advantagesOwned;
    }catch{}
  }
  function saveState(){
    try{localStorage.setItem(STORE,JSON.stringify(state))}catch{}
  }
  function filterBar(id,label,checked,onchange){
    const bar=document.createElement('div');
    bar.className='sheet-filterbar';bar.id=id;
    bar.innerHTML='<label class="sheet-filter-toggle"><input type="checkbox" '+(checked?'checked':'')+'><span>'+label+'</span></label><span class="sheet-filter-count"></span>';
    const input=bar.querySelector('input');input.onchange=()=>onchange(!!input.checked);
    return bar;
  }
  function ensureBars(){
    const skillsPaper=document.querySelector('#pericias .paper');
    if(skillsPaper&&!document.querySelector('#skillsFilterBar')){
      const bar=filterBar('skillsFilterBar','Mostrar somente perícias adquiridas',state.skillsOwned,value=>{state.skillsOwned=value;saveState();applySkills()});
      const note=skillsPaper.querySelector('.note');(note||skillsPaper.querySelector('h2')).insertAdjacentElement('afterend',bar);
    }
    const advPaper=document.querySelector('#vantagens .paper');
    if(advPaper&&!document.querySelector('#advantagesFilterBar')){
      const bar=filterBar('advantagesFilterBar','Mostrar somente vantagens adquiridas',state.advantagesOwned,value=>{state.advantagesOwned=value;saveState();applyAdvantages()});
      const note=advPaper.querySelector('.note');(note||advPaper.querySelector('h2')).insertAdjacentElement('afterend',bar);
    }
  }
  function setCount(id,text){const el=document.querySelector('#'+id+' .sheet-filter-count');if(el)el.textContent=text}
  function clearEmpty(root,id){root?.querySelector('#'+id)?.remove()}

  function applySkills(){
    ensureBars();
    const root=document.querySelector('#skills');if(!root||typeof s==='undefined')return;
    clearEmpty(root,'skillsFilterEmpty');
    let total=0,owned=0,visible=0;
    root.querySelectorAll('.skillgroup').forEach(group=>{
      let groupVisible=0;
      group.querySelectorAll('.skillrow').forEach(rowEl=>{
        const name=(rowEl.querySelector('b')?.textContent||'').trim();
        const has=(Number(s.skills?.[name])||0)>0;
        total++;if(has)owned++;
        const show=!state.skillsOwned||has;
        rowEl.style.display=show?'':'none';
        if(show){visible++;groupVisible++}
      });
      group.style.display=(!state.skillsOwned||groupVisible>0)?'':'none';
    });
    setCount('skillsFilterBar',state.skillsOwned?owned+' adquirida'+(owned===1?'':'s')+' exibida'+(owned===1?'':'s'):owned+' de '+total+' adquiridas');
    if(state.skillsOwned&&visible===0){const empty=document.createElement('div');empty.id='skillsFilterEmpty';empty.className='sheet-filter-empty';empty.textContent='Nenhuma perícia adquirida ainda. Desative o filtro para ver todas.';root.appendChild(empty)}
    const toggle=document.querySelector('#skillsFilterBar input');if(toggle&&toggle.checked!==state.skillsOwned)toggle.checked=state.skillsOwned;
  }

  function applyAdvantages(){
    ensureBars();
    const root=document.querySelector('#advantages');if(!root)return;
    clearEmpty(root,'advantagesFilterEmpty');
    let total=0,owned=0,visible=0;
    root.querySelectorAll('.advattr').forEach(attr=>{
      let attrVisible=0;
      attr.querySelectorAll('.advgroup').forEach(group=>{
        let groupVisible=0;
        group.querySelectorAll('.advitem').forEach(item=>{
          const has=!!item.querySelector('input[type="checkbox"]')?.checked;
          total++;if(has)owned++;
          const show=!state.advantagesOwned||has;
          item.style.display=show?'':'none';
          if(show){visible++;groupVisible++;attrVisible++}
        });
        group.style.display=(!state.advantagesOwned||groupVisible>0)?'':'none';
      });
      attr.style.display=(!state.advantagesOwned||attrVisible>0)?'':'none';
    });
    setCount('advantagesFilterBar',state.advantagesOwned?owned+' adquirida'+(owned===1?'':'s')+' exibida'+(owned===1?'':'s'):owned+' de '+total+' adquiridas');
    if(state.advantagesOwned&&visible===0){const empty=document.createElement('div');empty.id='advantagesFilterEmpty';empty.className='sheet-filter-empty';empty.textContent='Nenhuma vantagem adquirida ainda. Desative o filtro para ver todas.';root.appendChild(empty)}
    const toggle=document.querySelector('#advantagesFilterBar input');if(toggle&&toggle.checked!==state.advantagesOwned)toggle.checked=state.advantagesOwned;
  }

  loadState();
  ensureBars();

  if(typeof renderSkills==='function'){
    const previousRenderSkills=renderSkills;
    renderSkills=function(){const result=previousRenderSkills.apply(this,arguments);applySkills();return result};
  }
  if(typeof renderAdvantages==='function'){
    const previousRenderAdvantages=renderAdvantages;
    renderAdvantages=function(){const result=previousRenderAdvantages.apply(this,arguments);applyAdvantages();return result};
  }

  try{applySkills();applyAdvantages()}catch(error){console.warn('[Quimera filtros]',error)}
  window.QuimeraSheetFilters={
    get:()=>({...state}),
    set:(next={})=>{if('skillsOwned'in next)state.skillsOwned=!!next.skillsOwned;if('advantagesOwned'in next)state.advantagesOwned=!!next.advantagesOwned;saveState();applySkills();applyAdvantages()}
  };
}

function dashboardReleaseRuntime(){
  if(typeof summary!=='function')return;
  const previousSummary=summary;
  function total(st,code){
    let value=Number(st.attrs?.[code])||0;
    for(const mod of (st.attrModifiers||[])){
      if(mod.target!=='Geral'&&mod.target!==code)continue;
      const amount=Math.max(0,Number(mod.amount)||0);
      value+=mod.type==='Desvantagem'?-amount:amount;
    }
    return value;
  }
  function current(value,max){
    if(value==null)return max;
    return Math.max(0,Math.min(max,Number(value)||0));
  }
  summary=function(ch){
    const result=previousSummary(ch),st=ch.sheet||{},level=Number(st.char?.level??ch.level??1);
    const con=total(st,'CON'),des=total(st,'DES'),per=total(st,'PER'),intel=total(st,'INT'),esp=total(st,'ESP');
    const pvMax=Math.max(0,con*3+level),psMax=Math.max(0,esp+intel+level),pdMax=Math.max(0,con+esp+level),resources=st.resources||{};
    result.ca=con+des+per+(Number(st.char?.armor)||0);
    result.cs=(st.char?.alert?per*2:per)+level;
    result.pvMax=pvMax;result.psMax=psMax;result.pdMax=pdMax;
    result.pv=current(resources.pv,pvMax);result.ps=current(resources.ps,psMax);result.pd=current(resources.pd,pdMax);
    return result;
  };
  try{if(typeof renderCampaignBody==='function'&&typeof currentCampaign!=='undefined'&&currentCampaign)renderCampaignBody()}catch(error){console.warn('[Quimera painel]',error)}
}

const filtersRuntime='('+sheetFiltersRuntime.toString()+')();';
const dashboardRuntime='('+dashboardReleaseRuntime.toString()+')();';
new vm.Script(filtersRuntime,{filename:'sheet-filters.js'});
new vm.Script(dashboardRuntime,{filename:'dashboard-release.js'});
fs.writeFileSync(path.join(out,'sheet-filters.js'),filtersRuntime);
fs.writeFileSync(path.join(out,'dashboard-release.js'),dashboardRuntime);
fs.writeFileSync(sheetPath,sheet);
fs.writeFileSync(indexPath,index);
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({release:Number(release),built_at:new Date().toISOString(),features:['campaigns','realtime','initiative','free-edit','creation-pa','attribute-bonuses','effective-dashboard-stats','npc-generator','resource-steppers','advantage-descriptions','owned-filters']},null,2));
console.log('Quimera v'+release+': versão final, filtros e resumo efetivo do painel aplicados.');
