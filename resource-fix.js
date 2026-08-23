const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
const release=String(process.env.QUIMERA_RELEASE||'33');
let html=fs.readFileSync(sheetPath,'utf8');
html=html.replace(/\?v=\d+/g,'?v='+release);
if(!html.includes('/sheet-resource-fix.js')) html=html.replace('</body>','<script src="/sheet-resource-fix.js?v='+release+'"></script></body>');
html=html.replace('</head>',`<style>
.resource-stepper{display:flex;align-items:center;gap:6px;justify-content:flex-end}.resource-stepper button{min-width:42px;padding:7px 9px;font-weight:950}.resource-stepper input{width:72px!important;text-align:center;font-weight:900}.resource-stepper .res-max{white-space:nowrap;font-size:12px}.resource .bar{margin-top:8px}
.resource-stage-row{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:start;margin-top:8px}.resource-stage-badge{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:10px;font-weight:950;white-space:nowrap;background:#fffaf0}.resource-stage-badge.ok{color:var(--ok);border-color:#356c4f55;background:#356c4f0c}.resource-stage-badge.warn{color:var(--warn);border-color:#9a5d2455;background:#9a5d240c}.resource-stage-badge.bad{color:var(--bad);border-color:#8d333355;background:#8d33330c}.resource-stage-effect{font-size:10.5px;line-height:1.4;color:#625967}.resource-stage-reference{grid-column:1/-1;margin-top:10px;border:1px solid var(--line);border-radius:10px;background:#fff9ed80;padding:8px 10px}.resource-stage-reference>summary{cursor:pointer;font-size:11px;font-weight:950;color:var(--p)}.resource-stage-reference-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:9px}.resource-stage-reference h4{margin:0 0 6px;color:var(--p)}.resource-stage-item{font-size:10px;line-height:1.4;padding:6px 0;border-top:1px dashed var(--line)}.resource-stage-item:first-of-type{border-top:0}.resource-stage-item b{color:var(--ink)}.resource-stage-range{font-size:9px;font-weight:850;color:#756c78}.resource-stage-note{font-size:9.5px;color:#756c78;margin-top:7px}
@media(max-width:700px){.resource-stage-reference-grid{grid-template-columns:1fr}.resource-stage-row{grid-template-columns:1fr}.resource-stage-badge{width:max-content}}
@media(max-width:520px){.resource-stepper{gap:5px}.resource-stepper button{min-width:40px;padding:8px 7px}.resource-stepper input{width:64px!important}}
</style></head>`);

const runtime=String.raw`(() => {
  const STAGES={
    pv:[
      {name:'Saudável',tone:'ok',range:'Acima de 2/3 do PV máximo',effect:'Nenhuma condição adicional.',current:'Nenhuma condição adicional.'},
      {name:'Ferido',tone:'warn',range:'Acima de 1/3 até 2/3',effect:'Manco: manobras físicas ficam mais custosas ou difíceis. Mão ruim: após um choque, uma falha pode fazer você perder o item ou ficar vulnerável.',current:'Manco: manobras físicas ficam mais custosas ou difíceis. Mão ruim: após um choque, uma falha pode fazer você perder o item ou ficar vulnerável.'},
      {name:'Crítico',tone:'bad',range:'De 1 até 1/3',effect:'Respiração curta: não pode forçar testes. Instável: um novo acerto pode levar diretamente a 0 PV quando fizer sentido. Potência reduzida: ataques físicos perdem 0,25x de potência.',current:'Mantém os efeitos de Ferido. Respiração curta: não pode forçar testes. Instável: um novo acerto pode levar a 0 PV. Potência física reduzida em 0,25x.'},
      {name:'Morrendo',tone:'bad',range:'0 PV',effect:'Na primeira queda da cena, restam 3 turnos antes da morte; novas quedas reduzem esse tempo em 1. Outros podem tentar estabilizar 1 vez por turno. Sacrificar permite morrer imediatamente para realizar um último ataque crítico.',current:'Morrendo: 3 turnos na primeira queda; novas quedas reduzem o contador em 1. Outros podem estabilizar 1 vez por turno. Sacrificar permite um último ataque crítico.'}
    ],
    ps:[
      {name:'Firme',tone:'ok',range:'Acima de 2/3 do PS máximo',effect:'Nenhuma condição adicional.',current:'Nenhuma condição adicional.'},
      {name:'Abalado',tone:'warn',range:'Acima de 1/3 até 2/3',effect:'Desesperado: a primeira falha da cena recebe uma consequência desastrosa. Tique: ao entrar em Abalado, o mestre determina um sinal recorrente.',current:'Desesperado: a primeira falha da cena recebe uma consequência desastrosa. Tique: o mestre determina um sinal recorrente.'},
      {name:'Alucinado',tone:'bad',range:'De 1 até 1/3',effect:'Crise: um gatilho forte, grande baque ou falha crítica pode causar um surto; o efeito depende da situação.',current:'Mantém os efeitos de Abalado. Crise: gatilho forte, grande baque ou falha crítica pode causar um surto.'},
      {name:'Insano',tone:'bad',range:'0 PS',effect:'Fica Insano por 3 turnos e não pode entrar em Insanidade novamente na mesma cena. Pode gastar 1 ponto de Laço para voltar a Abalado ou ser trazido de volta por outra pessoa; sem estabilização, recebe um trauma permanente.',current:'Insano por 3 turnos. Pode gastar 1 Laço para voltar a Abalado ou ser estabilizado por outra pessoa; se não for estabilizado, recebe um trauma permanente.'}
    ],
    pd:[
      {name:'Enérgico',tone:'ok',range:'Acima de 2/3 do PD máximo',effect:'Nenhuma condição adicional.',current:'Nenhuma condição adicional.'},
      {name:'Ofegante',tone:'warn',range:'Acima de 1/3 até 2/3',effect:'Fraqueza: posturas ou efeitos longos ficam difíceis de manter sem se comprometer. Cambaleando: falhas tendem a trazer consequências piores.',current:'Fraqueza: posturas ou efeitos longos ficam difíceis de manter. Cambaleando: falhas tendem a trazer consequências piores.'},
      {name:'Exausto',tone:'bad',range:'De 1 até 1/3',effect:'Pó da rabiola: continuar gastando Desgaste pode provocar colapso. Corpo mole: você fica fisicamente mais fraco e ataques tendem a afetá-lo mais.',current:'Mantém os efeitos de Ofegante. Pó da rabiola: continuar gastando PD pode provocar colapso. Corpo mole: você fica fisicamente mais fraco e ataques tendem a afetá-lo mais.'},
      {name:'Superaquecimento',tone:'bad',range:'0 PD',effect:'Qualquer falha pode causar colapso. Ainda é possível agir gastando PV como se fossem PD. O estado só termina depois de pelo menos um descanso curto.',current:'Superaquecimento: qualquer falha pode causar colapso. Você pode gastar PV como PD e o estado só termina após pelo menos um descanso curto.'}
    ]
  };
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&typeof renderResources==='function'&&document.querySelector('#resources')}
  function clampResource(v,max){return Math.max(0,Math.min(Number(max)||0,Number(v)||0))}
  function resourceName(k){return k==='pv'?'Vida':k==='ps'?'Sanidade':'Desgaste'}
  function stageIndex(cur,max){cur=Number(cur)||0;max=Number(max)||0;if(max<=0||cur<=0)return 3;const r=cur/max;if(r>2/3)return 0;if(r>1/3)return 1;return 2}
  function stageInfo(k,cur,max){return STAGES[k][stageIndex(cur,max)]}
  function setBar(bar,value,max){if(bar)bar.style.width=(max?Math.max(0,Math.min(100,value/max*100)):0)+'%'}
  function updateResourceVisual(card,k,value,max){
    setBar(card.querySelector('.bar i'),value,max);
    const info=stageInfo(k,value,max),badge=card.querySelector('.resource-stage-badge'),effect=card.querySelector('.resource-stage-effect');
    if(badge){badge.className='resource-stage-badge '+info.tone;badge.textContent='Marco: '+info.name}
    if(effect)effect.textContent=info.current;
  }
  function stageReference(open){
    const details=document.createElement('details');details.id='resourceStageReference';details.className='resource-stage-reference';details.open=!!open;
    let body='<summary>Marcos dos recursos — resumo dos efeitos</summary><div class="resource-stage-note">Os recursos são divididos em três marcos. Ao entrar em um marco pior, você mantém também as limitações dos anteriores.</div><div class="resource-stage-reference-grid">';
    for(const k of ['pv','ps','pd']){
      body+='<div><h4>'+resourceName(k)+'</h4>';
      for(const info of STAGES[k])body+='<div class="resource-stage-item"><b>'+info.name+'</b> <span class="resource-stage-range">· '+info.range+'</span><div>'+info.effect+'</div></div>';
      body+='</div>';
    }
    details.innerHTML=body+'</div>';return details;
  }

  renderResources=function(){
    const M=maxes(),w=document.querySelector('#resources');if(!w)return;const refOpen=!!w.querySelector('#resourceStageReference')?.open;w.innerHTML='';
    for(const k of ['pv','ps','pd']){
      if(s.resources[k]==null)s.resources[k]=M[k];
      s.resources[k]=clampResource(s.resources[k],M[k]);
      const d=document.createElement('div');d.className='resource';
      const controls='<span class="resource-stepper"><button type="button" data-step="-1">−1</button><input type="number" inputmode="numeric" min="0" max="'+M[k]+'" value="'+s.resources[k]+'"><button type="button" data-step="1">+1</button><span class="res-max">/ '+M[k]+'</span></span>';
      d.innerHTML='<div class="head"><b>'+resourceName(k)+'</b>'+controls+'</div><div class="bar"><i></i></div><div class="resource-stage-row"><span class="resource-stage-badge"></span><span class="resource-stage-effect"></span></div>';
      const input=d.querySelector('input');updateResourceVisual(d,k,s.resources[k],M[k]);
      input.onfocus=()=>input.select();
      input.oninput=()=>{
        if(input.value==='')return;
        const value=clampResource(input.value,M[k]);s.resources[k]=value;updateResourceVisual(d,k,value,M[k]);save();
      };
      input.onchange=()=>{
        const value=clampResource(input.value,M[k]);s.resources[k]=value;input.value=value;updateResourceVisual(d,k,value,M[k]);save();
      };
      d.querySelectorAll('[data-step]').forEach(btn=>btn.onclick=()=>{
        const value=clampResource((Number(s.resources[k])||0)+Number(btn.dataset.step),M[k]);
        s.resources[k]=value;input.value=value;updateResourceVisual(d,k,value,M[k]);save();
      });
      w.appendChild(d);
    }
    w.appendChild(stageReference(refOpen));
  };

  function stabilizeNumericEditors(){
    document.querySelectorAll('#attrmodslist .attrmodrow').forEach((r,i)=>{
      const input=r.querySelector('input[type="number"]'),m=s.attrModifiers?.[i];if(!input||!m)return;
      input.onfocus=()=>input.select();
      input.oninput=()=>{
        if(input.value==='')return;
        m.amount=Math.max(1,Math.min(20,Number(input.value)||1));save();
        try{renderStats();renderSkills();renderResources()}catch{}
      };
      input.onchange=()=>{m.amount=Math.max(1,Math.min(20,Number(input.value)||1));input.value=m.amount;save();try{renderStats();renderSkills();renderResources()}catch{}};
    });
  }

  const prevRenderAll=renderAll;
  renderAll=function(){prevRenderAll();stabilizeNumericEditors()};
  window.QuimeraResourceStages={stage:(kind,current,max)=>stageInfo(kind,current,max).name,all:STAGES};
  let tries=0;const timer=setInterval(()=>{tries++;if(ready()){clearInterval(timer);renderResources();stabilizeNumericEditors()}else if(tries>100)clearInterval(timer)},100);
})();`;
new vm.Script(runtime,{filename:'sheet-resource-fix.js'});

// Regressões dos marcos: mesmas faixas usadas pela ficha original (terços do recurso, 0 como estado extremo).
function stageIndexTest(cur,max){cur=Number(cur)||0;max=Number(max)||0;if(max<=0||cur<=0)return 3;const r=cur/max;if(r>2/3)return 0;if(r>1/3)return 1;return 2}
assert.strictEqual(stageIndexTest(10,12),0,'recurso acima de 2/3 deveria estar no primeiro marco');
assert.strictEqual(stageIndexTest(8,12),1,'exatamente 2/3 deveria entrar no segundo marco');
assert.strictEqual(stageIndexTest(5,12),1,'recurso entre 1/3 e 2/3 deveria estar no segundo marco');
assert.strictEqual(stageIndexTest(4,12),2,'exatamente 1/3 deveria entrar no terceiro marco');
assert.strictEqual(stageIndexTest(1,12),2,'recurso baixo deveria estar no terceiro marco');
assert.strictEqual(stageIndexTest(0,12),3,'zero deveria usar o estado extremo do recurso');
for(const text of ['Saudável','Ferido','Crítico','Morrendo','Firme','Abalado','Alucinado','Insano','Enérgico','Ofegante','Exausto','Superaquecimento','Marcos dos recursos — resumo dos efeitos'])assert.ok(runtime.includes(text),'marco/resumo ausente: '+text);

fs.writeFileSync(path.join(out,'sheet-resource-fix.js'),runtime);
fs.writeFileSync(sheetPath,html);
console.log('Quimera v'+release+': +/-1, marcos de PV/PS/PD e resumo dos efeitos restaurados.');
