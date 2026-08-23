const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
let html=fs.readFileSync(sheetPath,'utf8');

// Force a fresh copy on mobile browsers after every release.
html=html.replace(/\?v=\d+/g,'?v=15');

// Guarantee the initiative tab and panel even if an earlier build transform changes.
if(!html.includes('data-tab="initiative"')){
  html=html.replace('<button class="tab" data-tab="notas">Laços & Notas</button>','<button class="tab" data-tab="notas">Laços & Notas</button><button class="tab" data-tab="initiative">Iniciativa</button>');
}
if(!html.includes('id="initiative"')){
  html=html.replace('</main>','<section id="initiative" class="panel"><div class="paper"><div class="initiative-sheet-head"><div><h2>Iniciativa</h2><div class="muted">A ordem é compartilhada com toda a campanha. Apenas o mestre pode editar.</div></div><span id="initiativeRole" class="pill">Carregando...</span></div><div id="initiativeSheetList" class="initiative-sheet-list"><div class="note">Carregando iniciativa...</div></div></div></section></main>');
}
if(!html.includes('/sheet-leveldown.js')) html=html.replace('</body>','<script src="/sheet-leveldown.js?v=15"></script></body>');
fs.writeFileSync(sheetPath,html);

const leveldown=String.raw`(() => {
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&document.querySelector('#levelup')}
  function ensureButton(){
    const up=document.querySelector('#levelup');if(!up)return null;
    let down=document.querySelector('#leveldown');
    if(!down){down=document.createElement('button');down.id='leveldown';down.className='danger';down.type='button';up.insertAdjacentElement('afterend',down)}
    const L=Number(s.char.level)||1;
    down.disabled=L<=1;
    if(row.kind==='player'){
      const refund=10+Math.max(1,L-1);
      down.textContent=L<=1?'Nível mínimo':'↶ Voltar para NV '+(L-1)+' · devolve '+refund+' PA';
    }else down.textContent=L<=1?'Nível mínimo':'↶ Voltar para NV '+(L-1);
    down.onclick=()=>rollbackLevel();
    return down;
  }
  function rollbackLevel(){
    const L=Number(s.char.level)||1;if(L<=1)return;
    if(row.kind!=='player'){
      s.char.level=L-1;save();renderAll();return;
    }
    const amount=10+(L-1);
    let payment=null;
    if(Array.isArray(s.levelPayments)){
      for(let i=s.levelPayments.length-1;i>=0;i--){if(Number(s.levelPayments[i]?.toLevel)===L){payment=s.levelPayments.splice(i,1)[0];break}}
    }else s.levelPayments=[];
    const source=payment?.source||(s.creation.enabled?'creation':'live');
    s.char.level=L-1;
    if(source==='creation')s.creation.pa=(Number(s.creation.pa)||0)+(payment?.amount||amount);
    else s.char.pa=Math.min(10+(L-1),(Number(s.char.pa)||0)+(payment?.amount||amount));
    save();renderAll();toast('Nível retrocedido e PA devolvido.');
  }
  const oldRenderProgress=renderProgress;
  renderProgress=function(){oldRenderProgress();ensureButton()};
  const up=document.querySelector('#levelup');
  if(up){up.onclick=()=>{
    const L=Number(s.char.level)||1;
    if(row?.kind!=='player'||L>=20)return;
    const amount=10+L,source=paSource().k;
    if(!spend(amount))return;
    if(!Array.isArray(s.levelPayments))s.levelPayments=[];
    s.levelPayments.push({fromLevel:L,toLevel:L+1,amount,source});
    s.char.level=L+1;save();renderAll();
  }}
  let n=0;const t=setInterval(()=>{n++;if(ready()){clearInterval(t);ensureButton()}else if(n>80)clearInterval(t)},100);
})();`;
new vm.Script(leveldown,{filename:'sheet-leveldown.js'});
fs.writeFileSync(path.join(out,'sheet-leveldown.js'),leveldown);
console.log('Quimera afterfix: level rollback + initiative guarantee + v15');
