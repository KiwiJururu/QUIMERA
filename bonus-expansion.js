const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const sheetPath=path.join(out,'sheet.html');
const indexPath=path.join(out,'index.html');
let html=fs.readFileSync(sheetPath,'utf8');

// Release marker: force fresh scripts on mobile.
html=html.replace(/\?v=\d+/g,'?v=18');

// Split the Bônus tab into die modifiers and attribute modifiers.
const modsStart=html.indexOf('<section id="mods" class="panel">');
const modsEnd=modsStart>=0?html.indexOf('</section>',modsStart):-1;
if(modsStart>=0&&modsEnd>=0&&!html.includes('id="attrmodslist"')){
  const segment=html.slice(modsStart,modsEnd);
  let updated=segment
    .replace('<h2>Bônus & desvantagens</h2>','<h2>Bônus & desvantagens de dados</h2>')
    .replace('Adicione níveis de dado positivos ou negativos. Você pode aplicar a tudo, a uma família ou a uma perícia específica.','Estes modificadores alteram níveis de dado. Você pode aplicar a tudo, a uma família ou a uma perícia específica.');
  updated += '<div class="paper"><h2>Bônus & desvantagens de atributos</h2><div class="note">Some ou subtraia valores diretamente dos atributos, como +1 CON ou -2 PER. O valor final é usado em testes, proficiência e valores derivados como CA, CS, PV, PS e PD.</div><div id="attrmodslist"></div><button id="addattrmod">+ Modificador de atributo</button></div>';
  html=html.slice(0,modsStart)+updated+html.slice(modsEnd);
}

if(!html.includes('/sheet-bonus-expansion.js')) html=html.replace('</body>','<script src="/sheet-bonus-expansion.js?v=18"></script></body>');
html=html.replace('</head>',`<style>
.attr-calc{margin-top:6px;padding-top:6px;border-top:1px dashed var(--line);font-size:10px;line-height:1.35;color:#6d6570}.attr-calc b{font-size:11px;color:var(--p)}
.skill-calc{grid-column:1/-1;font-size:10px;line-height:1.35;color:#6d6570;padding:0 2px 2px}.skill-calc b{color:var(--p)}
.attrmodrow{display:grid;grid-template-columns:1.3fr 1fr .9fr .6fr auto;gap:7px;margin:7px 0;align-items:center}.attrmodrow input,.attrmodrow select{min-width:0}.attrmod-total{font-weight:900;color:var(--p)}
@media(max-width:700px){.attrmodrow{grid-template-columns:1fr 1fr}.attrmodrow>*:first-child{grid-column:1/-1}.attrmodrow button{grid-column:2}.skill-calc{font-size:9.5px}}
</style></head>`);
fs.writeFileSync(sheetPath,html);

const runtime=String.raw`(() => {
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&typeof renderAll==='function'&&document.querySelector('#attrs')}
  function ensureAttrMods(){if(!Array.isArray(s.attrModifiers))s.attrModifiers=[]}
  function signedParts(code){
    ensureAttrMods();let bonus=0,penalty=0;
    for(const m of s.attrModifiers){
      if(m.target!=='Geral'&&m.target!==code)continue;
      const n=Math.max(0,Number(m.amount)||0);
      if(m.type==='Desvantagem')penalty+=n;else bonus+=n;
    }
    const base=Number(s.attrs?.[code])||0;
    return {base,bonus,penalty,total:base+bonus-penalty};
  }
  function attrTotal(code){return signedParts(code).total}
  function dieParts(name,fam){
    let bonus=0,penalty=0;
    for(const m of (s.modifiers||[])){
      const ok=m.target==='Geral'||m.target==='Família:'+fam||m.target==='Perícia:'+name;
      if(!ok)continue;
      const n=Math.max(0,Number(m.amount)||0);
      if(m.type==='Desvantagem')penalty+=n;else bonus+=n;
    }
    return {bonus,penalty,net:bonus-penalty};
  }
  function skillCalc(lvl,attr,secondary,name,fam){
    const profBase=sc(attrTotal(attr));
    const prof=secondary?Math.max(0,profBase-1):profBase;
    const mods=dieParts(name,fam);
    const total=Math.max(0,(Number(lvl)||0)+prof+mods.bonus-mods.penalty);
    return {lvl:Number(lvl)||0,prof,bonus:mods.bonus,penalty:mods.penalty,total,die:die(total)};
  }
  function calcText(c){
    return 'Perícia '+c.lvl+' + Prof. '+c.prof+' + Bônus '+c.bonus+' − Desv. '+c.penalty+' = '+c.total+' → '+c.die;
  }

  // Attribute bonuses affect effective values and proficiency, but not creation budget or mastery-slot unlocks.
  const oldMaxes=maxes;
  maxes=function(){
    const L=Number(s.char.level)||1;
    return {pv:Math.max(0,attrTotal('CON')*3+L),ps:Math.max(0,attrTotal('ESP')+attrTotal('INT')+L),pd:Math.max(0,attrTotal('CON')+attrTotal('ESP')+L)};
  };
  eff=function(lvl,attr,sec,name,fam){return skillCalc(lvl,attr,sec,name,fam).total};

  function annotateAttrs(){
    const cards=document.querySelectorAll('#attrs .attr');
    Q.attrs.forEach(([code],i)=>{
      const card=cards[i];if(!card)return;
      const p=signedParts(code);let line=card.querySelector('.attr-calc');
      if(!line){line=document.createElement('div');line.className='attr-calc';card.appendChild(line)}
      line.innerHTML='Base '+p.base+' + Bônus '+p.bonus+' − Desv. '+p.penalty+' = <b>Total '+p.total+'</b>';
    });
  }
  function annotateSkills(){
    for(const fam of ['Físicas','Mentais','Combate']){
      const sec=[...document.querySelectorAll('#skills .skillgroup')].find(x=>x.querySelector('h3')?.textContent===fam);if(!sec)continue;
      const rows=sec.querySelectorAll('.skillrow'),defs=Q.skills.filter(x=>x[0]===fam);
      defs.forEach((def,i)=>{
        const r=rows[i];if(!r)return;
        const [,name,p,ss]=def,lvl=Number(s.skills[name])||0;
        let calc=r.querySelector('.skill-calc');if(!calc){calc=document.createElement('div');calc.className='skill-calc';r.appendChild(calc)}
        const a=skillCalc(lvl,p,false,name,fam);
        let text='<b>'+p+':</b> '+calcText(a);
        if(ss){const b=skillCalc(lvl,ss,true,name,fam);text+=' &nbsp;·&nbsp; <b>'+ss+' secundário:</b> '+calcText(b)}
        calc.innerHTML=text;
      });
    }
  }
  function attrOptions(cur){
    const all=[['Geral','Todos os atributos'],...Q.attrs.map(([c,n])=>[c,n+' ('+c+')'])];
    return all.map(([v,n])=>'<option value="'+v+'" '+(cur===v?'selected':'')+'>'+n+'</option>').join('');
  }
  function renderAttrMods(){
    ensureAttrMods();const w=document.querySelector('#attrmodslist'),add=document.querySelector('#addattrmod');if(!w||!add)return;
    w.innerHTML='';
    if(!s.attrModifiers.length)w.innerHTML='<div class="muted">Nenhum modificador de atributo.</div>';
    s.attrModifiers.forEach((m,i)=>{
      const d=document.createElement('div');d.className='attrmodrow';
      d.innerHTML='<input placeholder="Origem" value="'+String(m.name||'').replace(/"/g,'&quot;')+'"><select>'+attrOptions(m.target||'CON')+'</select><select><option '+(m.type!=='Desvantagem'?'selected':'')+'>Bônus</option><option '+(m.type==='Desvantagem'?'selected':'')+'>Desvantagem</option></select><input type="number" min="1" max="20" value="'+Math.max(1,Number(m.amount)||1)+'"><button class="danger">×</button>';
      const [name,target,type,amount,del]=d.children;
      name.oninput=()=>{m.name=name.value;save()};
      target.onchange=()=>{m.target=target.value;save();renderAll()};
      type.onchange=()=>{m.type=type.value;save();renderAll()};
      amount.onfocus=()=>amount.select();amount.oninput=()=>{if(amount.value==='')return;m.amount=Math.max(1,Math.min(20,Number(amount.value)||1));save();renderAll()};
      del.onclick=()=>{s.attrModifiers.splice(i,1);save();renderAll()};w.appendChild(d);
    });
    add.onclick=()=>{s.attrModifiers.push({name:'',target:'CON',type:'Bônus',amount:1});save();renderAll()};
  }

  const oldRenderStats=renderStats;
  renderStats=function(){
    oldRenderStats();
    const L=Number(s.char.level)||1,con=attrTotal('CON'),des=attrTotal('DES'),per=attrTotal('PER');
    const ca=document.querySelector('#def');if(ca)ca.textContent=con+des+per+(Number(s.char.armor)||0);
    const cs=document.querySelector('#senses');if(cs)cs.textContent=(s.char.alert?per*2:per)+L;
    annotateAttrs();
  };
  const oldRenderSkills=renderSkills;
  renderSkills=function(){oldRenderSkills();annotateSkills()};
  const oldRenderMods=renderMods;
  renderMods=function(){oldRenderMods();renderAttrMods()};
  const oldRenderAll=renderAll;
  renderAll=function(){oldRenderAll();annotateAttrs();annotateSkills();renderAttrMods()};

  window.QuimeraAttributeTotal=attrTotal;
  let tries=0;const timer=setInterval(()=>{tries++;if(ready()){clearInterval(timer);ensureAttrMods();renderAll()}else if(tries>100)clearInterval(timer)},100);
})();`;
new vm.Script(runtime,{filename:'sheet-bonus-expansion.js'});
fs.writeFileSync(path.join(out,'sheet-bonus-expansion.js'),runtime);

// Keep CA/CS summaries on the campaign dashboard aligned with effective attribute bonuses.
let index=fs.readFileSync(indexPath,'utf8');
index=index.replace(/\?v=\d+/g,'?v=18');
if(!index.includes('/dashboard-attr-bonus.js')) index=index.replace('</body>','<script src="/dashboard-attr-bonus.js?v=18"></script></body>');
const dashboard=String.raw`(() => {
  if(typeof summary!=='function')return;
  const oldSummary=summary;
  function total(st,code){let v=Number(st.attrs?.[code])||0;for(const m of (st.attrModifiers||[])){if(m.target!=='Geral'&&m.target!==code)continue;const n=Math.max(0,Number(m.amount)||0);v+=m.type==='Desvantagem'?-n:n}return v}
  summary=function(ch){const o=oldSummary(ch),st=ch.sheet||{},L=Number(st.char?.level??ch.level??1),con=total(st,'CON'),des=total(st,'DES'),per=total(st,'PER');o.ca=con+des+per+(Number(st.char?.armor)||0);o.cs=(st.char?.alert?per*2:per)+L;return o};
  try{if(typeof renderCampaignBody==='function'&&typeof currentCampaign!=='undefined'&&currentCampaign)renderCampaignBody()}catch{}
})();`;
new vm.Script(dashboard,{filename:'dashboard-attr-bonus.js'});
fs.writeFileSync(path.join(out,'dashboard-attr-bonus.js'),dashboard);
fs.writeFileSync(indexPath,index);
console.log('Quimera bonus expansion: attribute modifiers + calculation breakdowns + v18');
