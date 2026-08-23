const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
let html=fs.readFileSync(sheetPath,'utf8');
html=html.replace(/\?v=\d+/g,'?v=22');
if(!html.includes('/sheet-qa-v22.js')) html=html.replace('</body>','<script src="/sheet-qa-v22.js?v=22"></script></body>');
fs.writeFileSync(sheetPath,html);

const runtime=String.raw`(() => {
  function npcNormalMode(){return (row?.kind==='npc'||row?.kind==='monster')&&!s.char?.freeEdit}

  // NPC/Monstro com edição livre desligada deve seguir exatamente o orçamento de atributos da ficha base.
  const previousRenderAttrs=renderAttrs;
  renderAttrs=function(){
    if(!npcNormalMode())return previousRenderAttrs();
    const w=document.querySelector('#attrs');if(!w)return;w.innerHTML='';
    Q.attrs.forEach(([code,name])=>{
      const d=document.createElement('div');d.className='attr';
      d.innerHTML='<b>'+code+'</b><div class="muted">'+name+'</div><input type="number" min="-5" max="20" value="'+(s.attrs[code]??0)+'">';
      const input=d.querySelector('input');
      input.onfocus=()=>input.select();
      input.onchange=()=>{
        const old=Number(s.attrs[code])||0;
        const next=Math.max(-5,Math.min(20,Number(input.value)||0));
        s.attrs[code]=next;
        if(budget().left<0){s.attrs[code]=old;toast('Você não tem pontos de atributo suficientes.');}
        save();renderAll();
      };
      w.appendChild(d);
    });
  };

  // Reativa progressão normal para NPC/Monstro quando a edição livre estiver desligada.
  const previousRenderProgress=renderProgress;
  renderProgress=function(){
    previousRenderProgress();
    if(!npcNormalMode())return;
    const L=Number(s.char.level)||1,cost=10+L,p=paSource();
    const creationPa=document.querySelector('#creationpa'),creationMode=document.querySelector('#creationmode'),up=document.querySelector('#levelup'),hint=document.querySelector('#levelhint');
    if(creationPa)creationPa.disabled=false;
    if(creationMode)creationMode.disabled=false;
    if(up){up.disabled=L>=20||p.v<cost;up.textContent=L>=20?'Nível máximo':'Subir para NV '+(L+1)+' · '+cost+' PA';}
    if(hint)hint.textContent=p.name+': '+p.v+(p.v<cost&&L<20?' · faltam '+(cost-p.v):'');
  };

  const previousRenderStats=renderStats;
  renderStats=function(){
    previousRenderStats();
    if(!npcNormalMode())return;
    const b=budget(),budgetEl=document.querySelector('#budget'),level=document.querySelector('#level');
    if(budgetEl){budgetEl.classList.toggle('over',b.left<0);budgetEl.innerHTML='<b>Pontos de atributo: '+b.spent+'/'+b.total+'</b> · base '+b.base+' + '+b.extra+' por negativos · <b>'+(b.left>=0?b.left+' livres':'excedeu '+Math.abs(b.left))+'</b>';}
    if(level){level.readOnly=true;level.onchange=null;level.onfocus=null;}
  };

  // Compra/descompra de vantagens no modo normal: usa as mesmas regras da ficha de jogador.
  const previousToggleAdv=toggleAdv;
  toggleAdv=function(attr,gi,ai,on){
    if(!npcNormalMode())return previousToggleAdv(attr,gi,ai,on);
    const key=attr+':'+gi+':'+ai;
    const old=groupCount(attr,gi);
    const delta=groupCost(old+(on?1:0))-groupCost(old-(on?0:1));
    if(on){
      if(attr==='SORTE'){
        const src=Q.attrs.map(x=>x[0]).find(code=>freeSlots(code)>0);
        if(!src)return toast('Você precisa de um slot livre em algum atributo.');
        const source=paSource().k;
        if(delta>0&&!spend(delta))return toast('PA insuficiente.');
        s.advantages[key]=true;s.luckSources[key]=src;
        s.advPayments[attr+':'+gi]=[...(s.advPayments[attr+':'+gi]||[]),{amount:delta,source}];
      }else{
        if(freeSlots(attr)<=0)return toast('Sem slot livre nesse atributo.');
        const source=paSource().k;
        if(delta>0&&!spend(delta))return toast('PA insuficiente.');
        s.advantages[key]=true;
        s.advPayments[attr+':'+gi]=[...(s.advPayments[attr+':'+gi]||[]),{amount:delta,source}];
      }
    }else{
      delete s.advantages[key];delete s.luckSources[key];
      const paymentKey=attr+':'+gi,arr=s.advPayments[paymentKey]||[],pay=arr.pop();s.advPayments[paymentKey]=arr;
      if(pay?.amount)refund(pay.amount,pay.source);
    }
    save();renderAll();
  };

  // Se o mestre alternar livre -> normal, garante que os controles sejam reconstruídos no estado correto.
  const previousRenderAll=renderAll;
  renderAll=function(){previousRenderAll();if(npcNormalMode()){try{renderProgress()}catch{}}};
})();`;
new vm.Script(runtime,{filename:'sheet-qa-v22.js'});
fs.writeFileSync(path.join(out,'sheet-qa-v22.js'),runtime);
console.log('Quimera v22 QA: modo normal de NPC/monstro alinhado à ficha base');
