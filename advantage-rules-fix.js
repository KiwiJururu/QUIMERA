const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const release=String(process.env.QUIMERA_RELEASE||'31');
const sheetPath=path.join(out,'sheet.html');
let sheet=fs.readFileSync(sheetPath,'utf8');

if(!sheet.includes('/sheet-advantage-rules-v31.js'))sheet=sheet.replace('</body>','<script src="/sheet-advantage-rules-v31.js?v='+release+'"></script></body>');
if(!sheet.includes('id="advantage-rules-v31-style"'))sheet=sheet.replace('</head>',`<style id="advantage-rules-v31-style">
.adv-price-legend{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:9px 0 3px;padding:8px 9px;border:1px solid var(--line);border-radius:10px;background:#fff9ed80;font-size:10.5px;color:#625967}.adv-price-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:999px;padding:4px 7px;background:#fffaf0;font-weight:900;color:var(--p)}.adv-price-chip.free{color:var(--ok);border-color:#356c4f55;background:#356c4f0c}.adv-price-chip.paid{color:var(--warn);border-color:#9a5d2455;background:#9a5d240c}
.advgroup h3{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.advgroup h3>.pill{margin-left:auto}.adv-next-cost{font-size:9.5px;font-weight:950;padding:4px 7px;border-radius:999px;border:1px solid var(--line);background:#fffaf0;white-space:nowrap}.adv-next-cost.free{color:var(--ok);border-color:#356c4f55}.adv-next-cost.paid{color:var(--warn);border-color:#9a5d2455}.adv-next-cost.full,.adv-next-cost.blocked{color:var(--bad);border-color:#8d333355}.adv-slot-summary{font-size:10px;font-weight:850;color:#6d6570;margin:4px 0 7px}.adv-slot-summary.over{color:var(--bad);font-weight:950}
.advitem>label .adv-item-cost{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;min-width:54px;padding:3px 6px;border:1px solid var(--line);border-radius:999px;font-size:9.5px;font-weight:950;white-space:nowrap;background:#fffaf0;color:var(--p)}.advitem>label .adv-item-cost.free{color:var(--ok);border-color:#356c4f55}.advitem>label .adv-item-cost.paid{color:var(--warn);border-color:#9a5d2455}.advitem>label .adv-item-cost.unavailable{color:var(--bad);border-color:#8d333355;background:#8d333308}.advitem>label .adv-item-cost.owned{color:var(--p);background:#583b8c0c}.advitem>label .adv-desc-btn{margin-left:0}.advitem.adv-unavailable{opacity:.58}.advitem.adv-unavailable input{cursor:not-allowed}
@media(max-width:520px){.adv-price-legend{align-items:flex-start}.advgroup h3>.pill{margin-left:0}.advitem>label .adv-item-cost{margin-left:25px}.advitem>label .adv-desc-btn{margin-left:0}}
</style></head>`);

function advantageRulesRuntime(){
  function isMasterFreeEdit(){return (row?.kind==='npc'||row?.kind==='monster')&&!!s.char?.freeEdit}
  function rulesConstrained(){return row?.kind==='player'||((row?.kind==='npc'||row?.kind==='monster')&&!s.char?.freeEdit)}
  function nextPrice(attr,gi){const n=groupCount(attr,gi);if(n>=3)return null;return groupCost(n+1)-groupCost(n)}
  function remainingSlots(attr){
    if(attr==='SORTE')return Q.attrs.reduce((total,[code])=>total+Math.max(0,Number(freeSlots(code))||0),0);
    return Math.max(0,Number(freeSlots(attr))||0);
  }
  function canAcquire(attr,gi,ai,{notify=false}={}){
    const key=attr+':'+gi+':'+ai;
    if(s.advantages?.[key]||!rulesConstrained())return true;
    const remaining=remainingSlots(attr);
    if(remaining<=0){
      if(notify)toast(attr==='SORTE'?'Você não possui nenhum slot livre para sacrificar em Sorte.':'Todos os slots de '+attr+' já estão ocupados.');
      return false;
    }
    const price=nextPrice(attr,gi);
    const source=paSource();
    if(price!=null&&price>0&&Number(source?.v||0)<price){
      if(notify)toast('Esta vantagem custa '+price+' PA. Faltam '+(price-Number(source?.v||0))+' PA.');
      return false;
    }
    return true;
  }

  const previousToggleAdv=toggleAdv;
  toggleAdv=function(attr,gi,ai,on){
    if(on&&!canAcquire(attr,gi,ai,{notify:true})){
      try{renderAdvantages()}catch{}
      return;
    }
    return previousToggleAdv.apply(this,arguments);
  };

  function ensureLegend(){
    const paper=document.querySelector('#vantagens .paper');if(!paper||paper.querySelector('#advPriceLegend'))return;
    const legend=document.createElement('div');legend.id='advPriceLegend';legend.className='adv-price-legend';
    legend.innerHTML='<b>Preço dentro de cada grupo:</b><span class="adv-price-chip free">1ª · Grátis</span><span class="adv-price-chip paid">2ª · 5 PA</span><span class="adv-price-chip paid">3ª · +10 PA</span><span class="muted">3 vantagens = 15 PA no total. Cada vantagem ainda consome 1 slot.</span>';
    const filter=paper.querySelector('#advantagesFilterBar'),note=paper.querySelector('.note'),anchor=filter||note||paper.querySelector('h2');anchor?.insertAdjacentElement('afterend',legend);
  }

  function decorateAdvantages(){
    ensureLegend();
    const root=document.querySelector('#advantages');if(!root||typeof Q==='undefined'||typeof s==='undefined')return;
    const attrs=[...Q.attrs.map(x=>x[0]),'SORTE'];
    root.querySelectorAll('.advattr').forEach((attrEl,attrIndex)=>{
      const attr=attrs[attrIndex];if(!attr)return;
      const title=attrEl.querySelector(':scope > h2');
      let summary=attrEl.querySelector(':scope > .adv-slot-summary');
      if(!summary){summary=document.createElement('div');summary.className='adv-slot-summary';title?.insertAdjacentElement('afterend',summary)}
      if(attr==='SORTE'){
        const free=remainingSlots('SORTE');summary.textContent=isMasterFreeEdit()?'Edição livre do mestre · Sorte não limita slots neste modo.':'Sorte sacrifica slots de atributos · '+free+' slot'+(free===1?'':'s')+' disponível'+(free===1?'':'is');summary.classList.toggle('over',rulesConstrained()&&free<=0&&luckKeys().length>0);
      }else{
        const total=slots(s.attrs?.[attr]),used=selectedAttr(attr)+luckUsed(attr),free=Math.max(0,total-used);summary.textContent=isMasterFreeEdit()?'Edição livre do mestre · '+used+' selecionada'+(used===1?'':'s'):'Slots: '+used+'/'+total+' usados · '+free+' livre'+(free===1?'':'s');summary.classList.toggle('over',rulesConstrained()&&used>total);
      }

      attrEl.querySelectorAll('.advgroup').forEach((groupEl,gi)=>{
        const count=groupCount(attr,gi),spent=groupCost(count),price=nextPrice(attr,gi),header=groupEl.querySelector('h3');
        const oldPill=header?.querySelector('.pill');if(oldPill)oldPill.textContent=count+'/3 · gasto '+spent+' PA';
        let next=header?.querySelector('.adv-next-cost');if(!next&&header){next=document.createElement('span');next.className='adv-next-cost';header.appendChild(next)}
        if(next){
          next.className='adv-next-cost';
          if(count>=3){next.textContent='Grupo completo';next.classList.add('full')}
          else if(rulesConstrained()&&remainingSlots(attr)<=0){next.textContent='Sem slot livre';next.classList.add('blocked')}
          else if(price===0){next.textContent='Próxima: Grátis';next.classList.add('free')}
          else{next.textContent='Próxima: '+price+' PA';next.classList.add('paid')}
        }

        groupEl.querySelectorAll('.advitem').forEach((item,ai)=>{
          const input=item.querySelector('input[type="checkbox"]'),label=item.querySelector('label');if(!input||!label)return;
          const key=attr+':'+gi+':'+ai,on=!!s.advantages?.[key],priceNow=nextPrice(attr,gi),source=paSource();
          let chip=label.querySelector('.adv-item-cost');if(!chip){chip=document.createElement('span');chip.className='adv-item-cost';const desc=label.querySelector('.adv-desc-btn');label.insertBefore(chip,desc||null)}
          let unavailable=false,titleText='';chip.className='adv-item-cost';
          if(on){chip.textContent='Adquirida';chip.classList.add('owned');input.disabled=false}
          else if(isMasterFreeEdit()){chip.textContent='Livre';chip.classList.add('free');input.disabled=false}
          else {
            const noSlot=remainingSlots(attr)<=0,noPa=!noSlot&&priceNow!=null&&priceNow>0&&Number(source?.v||0)<priceNow;
            unavailable=noSlot||noPa;
            if(noSlot){chip.textContent='Sem slot';chip.classList.add('unavailable');titleText=attr==='SORTE'?'Nenhum atributo possui slot livre para sacrificar.':'Todos os slots deste atributo estão ocupados.'}
            else if(noPa){const missing=priceNow-Number(source?.v||0);chip.textContent=priceNow+' PA · faltam '+missing;chip.classList.add('unavailable');titleText='PA insuficiente para esta compra.'}
            else if(priceNow===0){chip.textContent='Grátis';chip.classList.add('free')}
            else{chip.textContent=priceNow+' PA';chip.classList.add('paid')}
            input.disabled=unavailable;
          }
          item.classList.toggle('adv-unavailable',unavailable);input.title=titleText;
        });
      });
    });
  }

  const previousRenderAdvantages=renderAdvantages;
  renderAdvantages=function(){const result=previousRenderAdvantages.apply(this,arguments);decorateAdvantages();return result};
  try{decorateAdvantages()}catch(error){console.warn('[Quimera vantagens v31]',error)}
  window.QuimeraAdvantageRules={canAcquire:(attr,gi,ai)=>canAcquire(attr,gi,ai),refresh:()=>decorateAdvantages()};
}

const runtime='('+advantageRulesRuntime.toString()+')();';
new vm.Script(runtime,{filename:'sheet-advantage-rules-v31.js'});
fs.writeFileSync(path.join(out,'sheet-advantage-rules-v31.js'),runtime);
sheet=sheet.replace(/\?v=\d+/g,'?v='+release);
fs.writeFileSync(sheetPath,sheet);

const infoPath=path.join(out,'build-info.json');
if(fs.existsSync(infoPath)){const info=JSON.parse(fs.readFileSync(infoPath,'utf8'));info.release=Number(release);info.features=Array.from(new Set([...(info.features||[]),'advantage-slot-guard','advantage-price-ui']));fs.writeFileSync(infoPath,JSON.stringify(info,null,2))}
console.log('Quimera v'+release+': limite de slots reforçado + preços de vantagens mais claros.');
