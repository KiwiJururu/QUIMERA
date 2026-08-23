const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
let html=fs.readFileSync(sheetPath,'utf8');
html=html.replace(/\?v=\d+/g,'?v=20');
if(!html.includes('/sheet-resource-fix.js')) html=html.replace('</body>','<script src="/sheet-resource-fix.js?v=20"></script></body>');
html=html.replace('</head>',`<style>
.resource-stepper{display:flex;align-items:center;gap:6px;justify-content:flex-end}.resource-stepper button{min-width:42px;padding:7px 9px;font-weight:950}.resource-stepper input{width:72px!important;text-align:center;font-weight:900}.resource-stepper .res-max{white-space:nowrap;font-size:12px}.resource .bar{margin-top:8px}
@media(max-width:520px){.resource-stepper{gap:5px}.resource-stepper button{min-width:40px;padding:8px 7px}.resource-stepper input{width:64px!important}}
</style></head>`);

const runtime=String.raw`(() => {
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&typeof renderResources==='function'&&document.querySelector('#resources')}
  function masterEntity(){return row?.kind==='npc'||row?.kind==='monster'}
  function clampResource(v,max){return Math.max(0,Math.min(Number(max)||0,Number(v)||0))}
  function resourceName(k){return k==='pv'?'Vida':k==='ps'?'Sanidade':'Desgaste'}
  function setBar(bar,value,max){if(bar)bar.style.width=(max?Math.max(0,Math.min(100,value/max*100)):0)+'%'}

  renderResources=function(){
    const M=maxes(),w=document.querySelector('#resources');if(!w)return;w.innerHTML='';
    for(const k of ['pv','ps','pd']){
      if(s.resources[k]==null)s.resources[k]=M[k];
      s.resources[k]=clampResource(s.resources[k],M[k]);
      const d=document.createElement('div');d.className='resource';
      const controls=masterEntity()
        ? '<span class="resource-stepper"><button type="button" data-step="-1">−1</button><input type="number" inputmode="numeric" min="0" max="'+M[k]+'" value="'+s.resources[k]+'"><button type="button" data-step="1">+1</button><span class="res-max">/ '+M[k]+'</span></span>'
        : '<span><input type="number" inputmode="numeric" min="0" max="'+M[k]+'" value="'+s.resources[k]+'" style="width:72px;text-align:center"> / '+M[k]+'</span>';
      const pct=M[k]?s.resources[k]/M[k]*100:0;
      d.innerHTML='<div class="head"><b>'+resourceName(k)+'</b>'+controls+'</div><div class="bar"><i style="width:'+pct+'%"></i></div>';
      const input=d.querySelector('input'),bar=d.querySelector('.bar i');
      input.onfocus=()=>input.select();
      input.oninput=()=>{
        if(input.value==='')return;
        const value=clampResource(input.value,M[k]);s.resources[k]=value;setBar(bar,value,M[k]);save();
      };
      input.onchange=()=>{
        const value=clampResource(input.value,M[k]);s.resources[k]=value;input.value=value;setBar(bar,value,M[k]);save();
      };
      d.querySelectorAll('[data-step]').forEach(btn=>btn.onclick=()=>{
        const value=clampResource((Number(s.resources[k])||0)+Number(btn.dataset.step),M[k]);
        s.resources[k]=value;input.value=value;setBar(bar,value,M[k]);save();
      });
      w.appendChild(d);
    }
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
  let tries=0;const timer=setInterval(()=>{tries++;if(ready()){clearInterval(timer);renderResources();stabilizeNumericEditors()}else if(tries>100)clearInterval(timer)},100);
})();`;
new vm.Script(runtime,{filename:'sheet-resource-fix.js'});
fs.writeFileSync(path.join(out,'sheet-resource-fix.js'),runtime);
fs.writeFileSync(sheetPath,html);
console.log('Quimera v20: recursos NPC/monstro com +/-1 + edicao numerica estabilizada');
