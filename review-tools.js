const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const release=String(process.env.QUIMERA_RELEASE||'26');
const indexPath=path.join(out,'index.html');
const sheetPath=path.join(out,'sheet.html');
const initiativePath=path.join(out,'initiative-extra.js');
const sheetInitiativePath=path.join(out,'sheet-initiative-v21.js');

let index=fs.readFileSync(indexPath,'utf8');
let sheet=fs.readFileSync(sheetPath,'utf8');
let initiative=fs.readFileSync(initiativePath,'utf8');
let sheetInitiative=fs.readFileSync(sheetInitiativePath,'utf8');

// ---------- Iniciativa: valor continua sendo a regra principal; empates preservam ordem manual. ----------
if(!initiative.includes('QUIMERA_MANUAL_TIE_ORDER_V26')){
  initiative += String.raw`
/* QUIMERA_MANUAL_TIE_ORDER_V26 */
const _renderInitiativeBeforeManualTie=renderInitiative;
initiativeSorted=function(){
  return initiativeItems().map((item,index)=>({item,index})).sort((a,b)=>(Number(b.item.value)||0)-(Number(a.item.value)||0)||a.index-b.index).map(x=>x.item)
};
function initiativeTieCanMove(id,direction){
  const ordered=initiativeSorted(),i=ordered.findIndex(x=>x.id===id),j=i+direction;
  return i>=0&&j>=0&&j<ordered.length&&(Number(ordered[i].value)||0)===(Number(ordered[j].value)||0)
}
async function initiativeTieMove(id,direction){
  const ordered=initiativeSorted(),i=ordered.findIndex(x=>x.id===id),j=i+direction;
  if(i<0||j<0||j>=ordered.length)return;
  if((Number(ordered[i].value)||0)!==(Number(ordered[j].value)||0))return;
  [ordered[i],ordered[j]]=[ordered[j],ordered[i]];
  await persistInitiative(ordered)
}
renderInitiative=function(){
  _renderInitiativeBeforeManualTie();
  const panel=document.querySelector('#initiativePanel');if(!panel)return;
  const hint=panel.querySelector('.initiative-head .muted');
  if(hint)hint.textContent='Maior resultado primeiro. Em empates, o mestre pode ajustar a ordem manualmente.';
  if(currentRole!=='master')return;
  panel.querySelectorAll('.init-row').forEach(row=>{
    const del=row.querySelector('[data-init-del]');if(!del)return;
    const id=del.dataset.initDel;
    const controls=document.createElement('div');controls.className='init-tie-controls';
    const up=document.createElement('button');up.type='button';up.className='btn small';up.textContent='↑';up.title='Subir dentro do empate';up.disabled=!initiativeTieCanMove(id,-1);up.onclick=()=>initiativeTieMove(id,-1);
    const down=document.createElement('button');down.type='button';down.className='btn small';down.textContent='↓';down.title='Descer dentro do empate';down.disabled=!initiativeTieCanMove(id,1);down.onclick=()=>initiativeTieMove(id,1);
    controls.append(up,down,del);row.appendChild(controls)
  })
};
`;
}

if(!index.includes('id="initiative-tie-v26-style"')){
  index=index.replace('</head>',`<style id="initiative-tie-v26-style">
.init-tie-controls{display:flex;align-items:center;gap:4px;justify-content:flex-end}.init-tie-controls .btn{padding:5px 7px;min-width:30px}.init-tie-controls button:disabled{opacity:.28;cursor:default;transform:none;box-shadow:none}
@media(max-width:560px){.init-tie-controls{gap:3px}.init-tie-controls .btn{padding:5px;min-width:27px}}
</style></head>`);
}

if(!sheetInitiative.includes('QUIMERA_MANUAL_TIE_ORDER_V26')){
  const needle='  window.QuimeraReloadInitiative = load;\n  load();';
  if(!sheetInitiative.includes(needle))throw new Error('Ponto de extensão da iniciativa da ficha não encontrado.');
  const tieRuntime=String.raw`  /* QUIMERA_MANUAL_TIE_ORDER_V26 */
  function manualSorted(){
    return items().map((item,index)=>({item,index})).sort((a,b)=>(Number(b.item.value)||0)-(Number(a.item.value)||0)||a.index-b.index).map(x=>x.item);
  }
  function manualCanMove(id,direction){
    const ordered=manualSorted(),i=ordered.findIndex(x=>x.id===id),j=i+direction;
    return i>=0&&j>=0&&j<ordered.length&&(Number(ordered[i].value)||0)===(Number(ordered[j].value)||0);
  }
  function manualMove(id,direction){
    const ordered=manualSorted(),i=ordered.findIndex(x=>x.id===id),j=i+direction;
    if(i<0||j<0||j>=ordered.length)return;
    if((Number(ordered[i].value)||0)!==(Number(ordered[j].value)||0))return;
    [ordered[i],ordered[j]]=[ordered[j],ordered[i]];
    persist(ordered);
  }
  render=function(){
    const list=listEl(),badge=badgeEl();if(!list||!badge)return;
    const master=role==='master',ordered=manualSorted();
    badge.textContent=master?'Mestre · edição liberada':'Jogador · somente leitura';
    const rows=ordered.length?ordered.map((item,index)=>`<div class="initiative-sheet-row"><div class="initiative-sheet-pos">${index+1}</div><div><div class="initiative-sheet-name">${esc(item.name||'Sem nome')}</div><div class="initiative-sheet-kind">${kind(item.kind)}</div></div>${master?`<input data-v21-value="${esc(item.id)}" type="number" value="${Number(item.value)||0}">`:`<div class="initiative-sheet-value">${Number(item.value)||0}</div>`}${master?`<div class="initiative-sheet-tie-controls"><button data-v26-up="${esc(item.id)}" title="Subir dentro do empate" ${manualCanMove(item.id,-1)?'':'disabled'}>↑</button><button data-v26-down="${esc(item.id)}" title="Descer dentro do empate" ${manualCanMove(item.id,1)?'':'disabled'}>↓</button><button data-v21-del="${esc(item.id)}" class="danger">×</button></div>`:'<span></span>'}</div>`).join(''):'<div class="note">A iniciativa ainda não foi preenchida.</div>';
    list.innerHTML=rows+(master?'<div class="initiative-sheet-actions"><button id="v21Add" class="primary">+ Adicionar</button><button id="v21Clear" class="danger">Limpar</button></div>':'');
    if(!master)return;
    list.querySelector('#v21Add').onclick=openAdd;
    list.querySelector('#v21Clear').onclick=()=>{if(items().length&&confirm('Limpar toda a iniciativa?'))persist([])};
    list.querySelectorAll('[data-v21-value]').forEach(input=>{input.onfocus=()=>input.select();input.onchange=()=>persist(items().map(item=>item.id===input.dataset.v21Value?{...item,value:Number(input.value)||0}:item))});
    list.querySelectorAll('[data-v21-del]').forEach(button=>button.onclick=()=>persist(items().filter(item=>item.id!==button.dataset.v21Del)));
    list.querySelectorAll('[data-v26-up]').forEach(button=>button.onclick=()=>manualMove(button.dataset.v26Up,-1));
    list.querySelectorAll('[data-v26-down]').forEach(button=>button.onclick=()=>manualMove(button.dataset.v26Down,1));
  };
`;
  sheetInitiative=sheetInitiative.replace(needle,tieRuntime+needle);
}

sheet=sheet.replace('A ordem é compartilhada com toda a campanha. Apenas o mestre pode editar.','A ordem é compartilhada com toda a campanha. Apenas o mestre pode editar; em empates, ele pode ajustar a posição manualmente.');
if(!sheet.includes('id="initiative-tie-sheet-v26-style"')){
  sheet=sheet.replace('</head>',`<style id="initiative-tie-sheet-v26-style">
.initiative-sheet-tie-controls{display:flex;align-items:center;gap:4px;justify-content:flex-end}.initiative-sheet-tie-controls button{padding:5px 7px;min-width:29px}.initiative-sheet-tie-controls button:disabled{opacity:.28;cursor:default}
@media(max-width:520px){.initiative-sheet-tie-controls{gap:3px}.initiative-sheet-tie-controls button{padding:5px;min-width:26px}}
</style></head>`);
}

// ---------- Referências rápidas: Maestrias e usos de PD do livro. ----------
if(!sheet.includes('/sheet-reference-v26.js'))sheet=sheet.replace('</body>','<script src="/sheet-reference-v26.js?v='+release+'"></script></body>');
if(!sheet.includes('id="reference-v26-style"')){
  sheet=sheet.replace('</head>',`<style id="reference-v26-style">
.mastery-ref-head{display:flex;align-items:center;justify-content:space-between;gap:7px}.mastery-ref-head>span{min-width:0}.mastery-ref-btn{padding:4px 7px!important;font-size:9.5px!important;line-height:1.2;white-space:nowrap}.mastery-ref-desc{margin:6px 0 3px;padding:8px 9px;border-radius:8px;background:#fff9edc9;border:1px solid var(--line);font-size:10.5px;line-height:1.45;color:#514b54}.pd-reference{margin-top:11px;border:1px solid var(--line);border-radius:10px;background:#fff9ed99;overflow:hidden}.pd-reference summary{cursor:pointer;padding:9px 10px;font-size:12px;font-weight:950;color:var(--p);user-select:none}.pd-reference[open] summary{border-bottom:1px dashed var(--line)}.pd-reference-body{padding:9px 11px;display:grid;gap:7px;font-size:11px;line-height:1.45}.pd-reference-item b{color:var(--p)}.pd-reference-foot{padding-top:6px;border-top:1px dashed var(--line);color:#6d6570}
@media(max-width:520px){.mastery-ref-head{align-items:flex-start}.mastery-ref-btn{padding:4px 5px!important}}
</style></head>`);
}

function referenceRuntime(){
  function decorateMasteries(){
    if(typeof Q==='undefined')return;
    const cards=document.querySelectorAll('#masteries .mastery');
    Q.attrs.forEach(([code],cardIndex)=>{
      const card=cards[cardIndex];if(!card)return;
      const rows=card.querySelectorAll('.m'),defs=Q.mastery?.[code]||[];
      defs.forEach((def,i)=>{
        const rowEl=rows[i];if(!rowEl||rowEl.dataset.refDecorated==='1')return;
        const [level,title,desc]=def;rowEl.dataset.refDecorated='1';rowEl.textContent='';
        const head=document.createElement('div');head.className='mastery-ref-head';
        const label=document.createElement('span');label.textContent=level+' — '+title;
        const button=document.createElement('button');button.type='button';button.className='mastery-ref-btn';button.textContent='Ver descrição';
        const panel=document.createElement('div');panel.className='mastery-ref-desc';panel.hidden=true;panel.textContent=desc||'Descrição não disponível.';
        button.onclick=()=>{panel.hidden=!panel.hidden;button.textContent=panel.hidden?'Ver descrição':'Fechar descrição'};
        head.append(label,button);rowEl.append(head,panel);
      });
    });
  }
  function ensurePdReference(){
    if(document.querySelector('#pdReference'))return;
    const resources=document.querySelector('#resources'),paper=resources?.closest('.paper');if(!resources||!paper)return;
    const details=document.createElement('details');details.id='pdReference';details.className='pd-reference';
    details.innerHTML='<summary>Ações de PD — referência rápida</summary><div class="pd-reference-body"><div class="pd-reference-item"><b>Forçar Sucesso Parcial:</b> depois de falhar, gaste PD para transformar a falha em sucesso parcial. Falha normal: 1–2 PD; falha ruim: 2–4 PD; desastre: 5 PD.</div><div class="pd-reference-item"><b>Negar Consequência:</b> gaste 5 PD para evitar um efeito que cairia sobre você, como derrubar, desarmar ou quebrar.</div><div class="pd-reference-item"><b>Aprimoramento:</b> aumente temporariamente o nível de um dado de perícia. 1 nível custa 1 PD; 2 níveis custam 3 PD; o custo segue aumentando conforme os níveis comprados.</div><div class="pd-reference-item"><b>Movimentar no limite:</b> gaste PD para ampliar sua movimentação em metade do valor normal por incremento. O custo aumenta a cada incremento, até o máximo de 4× o movimento padrão.</div><div class="pd-reference-item"><b>Mais uma vez:</b> gaste 2 PD para receber uma ação adicional. Máximo de 2 ações adicionais.</div><div class="pd-reference-foot"><b>0 PD — Superaquecimento:</b> falhas podem causar colapso. Você ainda pode gastar PV como se fossem PD; o estado termina após pelo menos um descanso curto.</div></div>';
    resources.insertAdjacentElement('afterend',details);
  }
  if(typeof renderMastery==='function'){
    const previousRenderMastery=renderMastery;
    renderMastery=function(){const result=previousRenderMastery.apply(this,arguments);decorateMasteries();return result};
  }
  try{decorateMasteries();ensurePdReference()}catch(error){console.warn('[Quimera referências]',error)}
  window.QuimeraQuickReference={refresh:()=>{decorateMasteries();ensurePdReference()}};
}
const reference='('+referenceRuntime.toString()+')();';
new vm.Script(reference,{filename:'sheet-reference-v26.js'});
fs.writeFileSync(path.join(out,'sheet-reference-v26.js'),reference);

// A última etapa mantém cache e manifesto coerentes com a release.
index=index.replace(/\?v=\d+/g,'?v='+release);
sheet=sheet.replace(/\?v=\d+/g,'?v='+release);
fs.writeFileSync(indexPath,index);
fs.writeFileSync(sheetPath,sheet);
new vm.Script(initiative,{filename:'initiative-extra.js'});
new vm.Script(sheetInitiative,{filename:'sheet-initiative-v21.js'});
fs.writeFileSync(initiativePath,initiative);
fs.writeFileSync(sheetInitiativePath,sheetInitiative);

const infoPath=path.join(out,'build-info.json');
if(fs.existsSync(infoPath)){
  const info=JSON.parse(fs.readFileSync(infoPath,'utf8'));info.release=Number(release);info.features=Array.from(new Set([...(info.features||[]),'initiative-manual-ties','mastery-descriptions','pd-quick-reference']));fs.writeFileSync(infoPath,JSON.stringify(info,null,2));
}
console.log('Quimera v'+release+': desempate manual + descrições de Maestria + referência de PD.');
