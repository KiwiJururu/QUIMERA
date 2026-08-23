const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
let html=fs.readFileSync(sheetPath,'utf8');

// Force a fresh copy on mobile browsers after every release.
html=html.replace(/\?v=\d+/g,'?v=16');

// Guarantee the initiative tab and panel even if an earlier build transform changes.
if(!html.includes('data-tab="initiative"')){
  html=html.replace('<button class="tab" data-tab="notas">Laços & Notas</button>','<button class="tab" data-tab="notas">Laços & Notas</button><button class="tab" data-tab="initiative">Iniciativa</button>');
}
if(!html.includes('id="initiative"')){
  html=html.replace('</main>','<section id="initiative" class="panel"><div class="paper"><div class="initiative-sheet-head"><div><h2>Iniciativa</h2><div class="muted">A ordem é compartilhada com toda a campanha. Apenas o mestre pode editar.</div></div><span id="initiativeRole" class="pill">Carregando...</span></div><div id="initiativeSheetList" class="initiative-sheet-list"><div class="note">Carregando iniciativa...</div></div></div></section></main>');
}

// Move PA de Criacao to the bottom of the Geral page so progression stays compact.
const creationInner='<div><div class="note">Para criar personagens avançados, defina apenas um orçamento de <b>PA de Criação</b>. O jogador escolhe quanto gastar em nível, perícias e vantagens.</div><div class="row" style="margin-top:8px"><input id="creationpa" type="number" min="0" placeholder="PA de criação" style="max-width:150px"><label><input id="creationmode" type="checkbox" style="width:auto"> usar PA de criação</label></div></div>';
if(html.includes(creationInner)){
  html=html.replace(creationInner,'');
  html=html.replace('<div class="paper"><h2>Progressão</h2><div class="grid g2">','<div class="paper"><h2>Progressão</h2><div class="grid">');
}
if(!html.includes('id="creationPaper"')){
  const generalStart=html.indexOf('<section id="geral"');
  const generalEnd=generalStart>=0?html.indexOf('</section>',generalStart):-1;
  if(generalEnd>=0){
    const creationPaper='<div class="paper" id="creationPaper"><h2>Criação avançada</h2><div class="note">Use esta área apenas na criação de personagens acima do nível 1. Defina um orçamento de <b>PA de Criação</b>; esses PA podem ser gastos em nível, perícias e vantagens.</div><div class="row" style="margin-top:10px"><input id="creationpa" type="number" min="0" placeholder="PA de criação" style="max-width:170px"><label><input id="creationmode" type="checkbox" style="width:auto"> usar PA de criação</label></div></div>';
    html=html.slice(0,generalEnd)+creationPaper+html.slice(generalEnd);
  }
}

if(!html.includes('/sheet-leveldown.js')) html=html.replace('</body>','<script src="/sheet-leveldown.js?v=16"></script></body>');
if(!html.includes('/sheet-refinements.js')) html=html.replace('</body>','<script src="/sheet-refinements.js?v=16"></script></body>');
html=html.replace('</head>',`<style>
.free-edit-box{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#583b8c0b}.free-edit-box label{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink)}.free-edit-box input{width:auto}.skill-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}.skill-actions button{padding:6px 8px;font-size:11px}.skill-actions .sell{border-color:var(--warn);color:var(--warn)}
@media(max-width:800px){.skill-actions{grid-column:1/-1;justify-content:stretch}.skill-actions button{flex:1}}
</style></head>`);
fs.writeFileSync(sheetPath,html);

const leveldown=String.raw`(() => {
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&document.querySelector('#levelup')}
  function freeEdit(){return row?.kind!=='player'&&!!s.char.freeEdit}
  function ensureButton(){
    const up=document.querySelector('#levelup');if(!up)return null;
    let down=document.querySelector('#leveldown');
    if(!down){down=document.createElement('button');down.id='leveldown';down.className='danger';down.type='button';up.insertAdjacentElement('afterend',down)}
    const L=Number(s.char.level)||1;
    down.disabled=L<=1;
    if(freeEdit()) down.textContent=L<=1?'Nível mínimo':'↶ Voltar para NV '+(L-1);
    else {
      const refund=10+Math.max(1,L-1);
      down.textContent=L<=1?'Nível mínimo':'↶ Voltar para NV '+(L-1)+' · devolve '+refund+' PA';
    }
    down.onclick=()=>rollbackLevel();
    return down;
  }
  function rollbackLevel(){
    const L=Number(s.char.level)||1;if(L<=1)return;
    if(freeEdit()){
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
    if(freeEdit()||L>=20)return;
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

const refinements=String.raw`(() => {
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&typeof renderAll==='function'}
  function isNpcOrMonster(){return row?.kind==='npc'||row?.kind==='monster'}
  function freeEditOn(){return isNpcOrMonster()&&!!s.char.freeEdit}
  function ensureFreeEditToggle(){
    if(!isNpcOrMonster())return;
    let box=document.querySelector('#freeEditBox');
    const budget=document.querySelector('#budget');
    if(!budget)return;
    if(!box){box=document.createElement('div');box.id='freeEditBox';box.className='free-edit-box';budget.insertAdjacentElement('beforebegin',box)}
    box.innerHTML='<label><input id="freeEditToggle" type="checkbox" '+(s.char.freeEdit?'checked':'')+'><span><b>Edição livre do mestre</b><br><span class="muted">Desative para usar as mesmas regras de PA, atributos, perícias e vantagens da ficha base.</span></span></label>';
    box.querySelector('#freeEditToggle').onchange=e=>{s.char.freeEdit=!!e.target.checked;save();renderAll();toast(s.char.freeEdit?'Edição livre ativada.':'Regras normais ativadas.')};
  }

  // All master overrides from sheet-master-extra consult this function dynamically.
  if(typeof isMasterEntity==='function') isMasterEntity=function(){return isNpcOrMonster()&&!!s.char.freeEdit};

  const previousRenderStats=renderStats;
  renderStats=function(){previousRenderStats();ensureFreeEditToggle()};

  const previousRenderSkills=renderSkills;
  renderSkills=function(){
    if(freeEditOn())return previousRenderSkills();
    let w=document.querySelector('#skills');w.innerHTML='';
    if(!s.skillPayments||typeof s.skillPayments!=='object')s.skillPayments={};
    for(const fam of ['Físicas','Mentais','Combate']){
      const sec=document.createElement('div');sec.className='skillgroup';sec.innerHTML='<h3>'+fam+'</h3>';
      Q.skills.filter(x=>x[0]===fam).forEach(([_,n,p,ss])=>{
        const l=Number(s.skills[n])||0,buyCost=skillCost(l),refundCost=l>0?(l-1)+l:0,pa=paSource();
        const r=document.createElement('div');r.className='skillrow';
        const buy=buyCost==null?'<span class="pill">Máx.</span>':'<button class="buy" '+(pa.v<buyCost?'disabled':'')+'>'+(pa.v<buyCost?'Bloqueado':'Comprar')+' · '+buyCost+' PA</button>';
        const sell=l>0?'<button class="sell">Descomprar · +'+refundCost+' PA</button>':'';
        r.innerHTML='<b>'+n+'</b><span>NV '+l+'</span><span class="die">'+die(eff(l,p,false,n,fam))+(ss?'<small class="muted"> / '+die(eff(l,ss,true,n,fam))+'</small>':'')+'</span><span class="sc muted">SC '+p+(ss?'/'+ss:'')+'</span><span class="skill-actions">'+buy+sell+'</span>';
        const buyBtn=r.querySelector('.buy');
        if(buyBtn)buyBtn.onclick=()=>{const source=paSource().k;if(!spend(buyCost))return toast('PA insuficiente.');if(!Array.isArray(s.skillPayments[n]))s.skillPayments[n]=[];s.skillPayments[n].push({fromLevel:l,toLevel:l+1,amount:buyCost,source});s.skills[n]=l+1;save();renderAll()};
        const sellBtn=r.querySelector('.sell');
        if(sellBtn)sellBtn.onclick=()=>{
          if(l<=0)return;
          let payment=null,arr=Array.isArray(s.skillPayments[n])?s.skillPayments[n]:[];
          for(let i=arr.length-1;i>=0;i--){if(Number(arr[i]?.toLevel)===l){payment=arr.splice(i,1)[0];break}}
          s.skillPayments[n]=arr;
          const amount=Number(payment?.amount)||refundCost,source=payment?.source||(s.creation.enabled?'creation':'live');
          s.skills[n]=l-1;refund(amount,source);save();renderAll();toast('Perícia descomprada e '+amount+' PA devolvidos.');
        };
        sec.appendChild(r);
      });
      w.appendChild(sec);
    }
  };

  // Re-render once after all wrappers are installed.
  let tries=0;const timer=setInterval(()=>{tries++;if(ready()){clearInterval(timer);if(s.char.freeEdit==null)s.char.freeEdit=false;renderAll()}else if(tries>80)clearInterval(timer)},100);
})();`;
new vm.Script(refinements,{filename:'sheet-refinements.js'});
fs.writeFileSync(path.join(out,'sheet-refinements.js'),refinements);
console.log('Quimera afterfix: free edit toggle + skill refunds + creation PA at bottom + v16');
