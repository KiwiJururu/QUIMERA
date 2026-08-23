const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
let html=fs.readFileSync(sheetPath,'utf8');
html=html.replace(/\?v=\d+/g,'?v=17');
if(!html.includes('/sheet-creation-fix.js')) html=html.replace('</body>','<script src="/sheet-creation-fix.js?v=17"></script></body>');

const runtime=String.raw`(() => {
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&typeof renderProgress==='function'&&document.querySelector('#creationpa')&&document.querySelector('#creationmode')}
  function freeEditOn(){return (row?.kind==='npc'||row?.kind==='monster')&&!!s.char?.freeEdit}
  function ensureState(){if(!s.creation||typeof s.creation!=='object')s.creation={enabled:false,pa:0};if(s.creation.enabled==null)s.creation.enabled=false;if(s.creation.pa==null)s.creation.pa=0}
  function updateStatus(){
    ensureState();
    const input=document.querySelector('#creationpa'),toggle=document.querySelector('#creationmode'),paper=document.querySelector('#creationPaper');
    if(!input||!toggle)return;
    const locked=freeEditOn();
    input.disabled=locked;toggle.disabled=locked;
    if(document.activeElement!==input)input.value=Math.max(0,Number(s.creation.pa)||0);
    toggle.checked=!!s.creation.enabled;
    let status=document.querySelector('#creationPaStatus');
    if(paper&&!status){status=document.createElement('div');status.id='creationPaStatus';status.className='note';status.style.marginTop='10px';paper.appendChild(status)}
    if(status){
      if(locked)status.innerHTML='<b>Edição livre ativa.</b> PA de Criação fica pausado até desativar a edição livre.';
      else if(s.creation.enabled)status.innerHTML='<b>PA de Criação ativo:</b> '+Math.max(0,Number(s.creation.pa)||0)+' PA restantes. Compras e níveis usam este saldo.';
      else status.innerHTML='<b>PA de Criação inativo.</b> Compras e níveis usam o PA normal da ficha.';
    }
  }
  function bindCreation(){
    ensureState();
    const input=document.querySelector('#creationpa'),toggle=document.querySelector('#creationmode');
    if(!input||!toggle)return;
    input.disabled=freeEditOn();toggle.disabled=freeEditOn();
    input.onfocus=()=>input.select();
    input.oninput=()=>{
      if(freeEditOn())return;
      s.creation.pa=Math.max(0,Number(input.value)||0);
      save();updateStatus();
    };
    input.onchange=()=>{if(!freeEditOn()){s.creation.pa=Math.max(0,Number(input.value)||0);save();renderAll()}};
    toggle.onchange=()=>{
      if(freeEditOn()){toggle.checked=!!s.creation.enabled;return;}
      s.creation.enabled=!!toggle.checked;
      save();renderAll();toast(s.creation.enabled?'PA de Criação ativado.':'PA de Criação desativado.');
    };
    updateStatus();
  }
  const previousRenderProgress=renderProgress;
  renderProgress=function(){previousRenderProgress();updateStatus()};
  const previousRenderAll=renderAll;
  renderAll=function(){previousRenderAll();bindCreation()};
  let tries=0;const timer=setInterval(()=>{tries++;if(ready()){clearInterval(timer);ensureState();bindCreation();renderAll()}else if(tries>100)clearInterval(timer)},100);
})();`;
new vm.Script(runtime,{filename:'sheet-creation-fix.js'});
fs.writeFileSync(path.join(out,'sheet-creation-fix.js'),runtime);
fs.writeFileSync(sheetPath,html);
console.log('Quimera creation fix: PA de Criacao reativado fora da edicao livre + v17');
