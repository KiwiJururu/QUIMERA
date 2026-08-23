const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
let html=fs.readFileSync(sheetPath,'utf8');
html=html.replace(/\?v=\d+/g,'?v=19');
if(!html.includes('/sheet-npc-generator.js')) html=html.replace('</body>','<script src="/sheet-npc-generator.js?v=19"></script></body>');
html=html.replace('</head>',`<style>
.attr-total-big{font-size:30px;line-height:1;font-weight:950;color:var(--p);margin:8px 0 5px}.attr-base-editor{display:flex;align-items:center;justify-content:center;gap:6px}.attr-base-editor small{font-size:9px;font-weight:900;color:#756c78;text-transform:uppercase;letter-spacing:.04em}.attr-base-editor input{width:58px!important;padding:5px 6px!important;font-size:13px!important;font-weight:850!important;text-align:center}.npc-generator-box{margin-top:14px}.npc-generator-controls{display:grid;grid-template-columns:minmax(130px,190px) auto;gap:9px;align-items:end;margin-top:10px}.npc-generator-result{margin-top:10px}.npc-generator-result b{color:var(--p)}
@media(max-width:520px){.npc-generator-controls{grid-template-columns:1fr}.attr-total-big{font-size:27px}}
</style></head>`);

const runtime=String.raw`(() => {
  const ATTRS=['CON','FOR','DES','INT','PER','CAR','ESP'];
  const PROFILES=[
    {name:'Equilibrado',w:{CON:2,FOR:2,DES:2,INT:2,PER:2,CAR:2,ESP:2},skills:['Fortitude','Movimento','Observação','Técnica','Briga','Persuasão','Sobrevivência']},
    {name:'Combatente',w:{CON:4,FOR:5,DES:3,INT:1,PER:2,CAR:1,ESP:2},skills:['Briga','Técnica','Aparar','Potência','Fortitude','Intimidação','Desviar']},
    {name:'Ágil',w:{CON:2,FOR:2,DES:5,INT:2,PER:4,CAR:1,ESP:1},skills:['Agilidade','Movimento','Desviar','Precisão','Visão','Pilotar','Técnica']},
    {name:'Mental',w:{CON:1,FOR:1,DES:2,INT:5,PER:4,CAR:2,ESP:2},skills:['Investigação','Ciências','Astúcia','Observação','Cuidados','Sobrevivência','Ocultismo']},
    {name:'Social',w:{CON:2,FOR:1,DES:2,INT:2,PER:3,CAR:5,ESP:3},skills:['Persuasão','Atração','Inspiração','Observação','Compostura','Presença','Astúcia']},
    {name:'Místico',w:{CON:2,FOR:1,DES:1,INT:3,PER:3,CAR:2,ESP:5},skills:['Ocultismo','Presença','Compostura','Liberação','Observação','Investigação','Fortitude']},
    {name:'Resistente',w:{CON:5,FOR:3,DES:1,INT:2,PER:2,CAR:1,ESP:3},skills:['Fortitude','Postura','Briga','Aparar','Compostura','Intimidação','Sobrevivência']}
  ];
  function ready(){return typeof s!=='undefined'&&typeof row!=='undefined'&&row&&typeof renderAll==='function'&&document.querySelector('#attrs')}
  function totalAttr(code){return typeof window.QuimeraAttributeTotal==='function'?window.QuimeraAttributeTotal(code):(Number(s.attrs?.[code])||0)}
  function decorateAttrTotals(){
    const cards=document.querySelectorAll('#attrs .attr');
    Q.attrs.forEach(([code],i)=>{
      const card=cards[i];if(!card)return;const input=card.querySelector('input');if(!input)return;
      let big=card.querySelector('.attr-total-big');if(!big){big=document.createElement('div');big.className='attr-total-big';const name=card.querySelector('.muted');(name||card.firstChild).insertAdjacentElement('afterend',big)}
      big.textContent=totalAttr(code);
      let editor=card.querySelector('.attr-base-editor');if(!editor){editor=document.createElement('div');editor.className='attr-base-editor';editor.innerHTML='<small>Base</small>';input.insertAdjacentElement('beforebegin',editor);editor.appendChild(input)}
    });
  }
  function randWeighted(weights){
    const entries=Object.entries(weights),sum=entries.reduce((z,x)=>z+Math.max(0,Number(x[1])||0),0);let r=Math.random()*sum;
    for(const [k,v] of entries){r-=Math.max(0,Number(v)||0);if(r<=0)return k}return entries[0][0];
  }
  function choose(arr){return arr[Math.floor(Math.random()*arr.length)]}
  function levelCost(level){return 10+level}
  function skillBuyCost(level){return level>=5?null:level+level+1}
  function resetMechanical(){
    s.char.level=1;s.char.pa=0;s.char.freeEdit=false;
    s.attrs={CON:0,FOR:0,DES:0,INT:0,PER:0,CAR:0,ESP:0};
    s.skills={};s.advantages={};s.luckSources={};s.advPayments={};s.levelPayments=[];s.skillPayments={};
    s.modifiers=[];s.attrModifiers=[];s.resources={pv:null,ps:null,pd:null};
  }
  function spendCreation(amount){amount=Number(amount)||0;if((Number(s.creation.pa)||0)<amount)return false;s.creation.pa-=amount;return true}
  function buildLevels(totalBudget){
    const levelBudget=Math.floor(totalBudget*0.55);let spent=0,L=1;
    while(L<20){const c=levelCost(L);if(spent+c>levelBudget||!spendCreation(c))break;s.levelPayments.push({fromLevel:L,toLevel:L+1,amount:c,source:'creation'});spent+=c;L++}
    s.char.level=L;return spent;
  }
  function buildAttrs(profile){
    const points=(Number(s.char.level)||1)*2;
    for(let i=0;i<points;i++){
      const weights={};for(const c of ATTRS){const current=Number(s.attrs[c])||0;weights[c]=(profile.w[c]||1)*Math.max(.3,1-current/10)}
      const c=randWeighted(weights);s.attrs[c]=(Number(s.attrs[c])||0)+1;
    }
  }
  function buildSkills(profile){
    const preferred=[...profile.skills];const all=Q.skills.map(x=>x[1]);let guard=0;
    while((Number(s.creation.pa)||0)>0&&guard++<3000){
      const pool=Math.random()<0.82?preferred:all;
      let candidates=pool.map(name=>({name,lvl:Number(s.skills[name])||0})).filter(x=>x.lvl<5&&skillBuyCost(x.lvl)<=s.creation.pa);
      if(!candidates.length)candidates=all.map(name=>({name,lvl:Number(s.skills[name])||0})).filter(x=>x.lvl<5&&skillBuyCost(x.lvl)<=s.creation.pa);
      if(!candidates.length)break;
      candidates.sort((a,b)=>a.lvl-b.lvl||Math.random()-.5);
      const band=candidates.slice(0,Math.max(2,Math.ceil(candidates.length*.45))),pick=choose(band),cost=skillBuyCost(pick.lvl);
      if(!spendCreation(cost))break;
      s.skills[pick.name]=pick.lvl+1;
      if(!Array.isArray(s.skillPayments[pick.name]))s.skillPayments[pick.name]=[];
      s.skillPayments[pick.name].push({fromLevel:pick.lvl,toLevel:pick.lvl+1,amount:cost,source:'creation'});
    }
  }
  function buildFreeAdvantages(){
    for(const code of ATTRS){
      const slots=[4,8,12,16].filter(n=>(Number(s.attrs[code])||0)>=n).length;if(!slots)continue;
      const groups=(Q.adv[code]||[]).map((g,gi)=>({gi,name:g[0]}));
      for(let n=0;n<Math.min(slots,groups.length);n++){
        const idx=Math.floor(Math.random()*groups.length),g=groups.splice(idx,1)[0],key=code+':'+g.gi+':0';s.advantages[key]=true;
      }
    }
  }
  function generateNpc(total){
    total=Math.max(0,Math.floor(Number(total)||0));if(!total)return toast('Informe uma quantidade de PA maior que zero.');
    if(!confirm('Gerar novamente substituirá nível, atributos, perícias, vantagens e bônus mecânicos atuais. Continuar?'))return;
    const profile=choose(PROFILES);resetMechanical();
    if(!s.creation||typeof s.creation!=='object')s.creation={enabled:true,pa:total};s.creation.enabled=true;s.creation.pa=total;
    buildLevels(total);buildAttrs(profile);buildFreeAdvantages();buildSkills(profile);
    const left=Number(s.creation.pa)||0,spent=total-left;
    save();renderAll();
    const result=document.querySelector('#npcGeneratorResult');if(result)result.innerHTML='<b>'+profile.name+'</b> · NV '+s.char.level+' · '+spent+' PA distribuídos'+(left?' · '+left+' PA restantes':' · orçamento totalmente usado');
    toast('Ficha gerada: '+profile.name+'.');
  }
  function ensureGenerator(){
    if(row?.kind!=='npc'&&row?.kind!=='monster')return;
    if(document.querySelector('#npcGeneratorBox'))return;
    const geral=document.querySelector('#geral');if(!geral)return;
    const box=document.createElement('div');box.id='npcGeneratorBox';box.className='paper npc-generator-box';
    box.innerHTML='<h2>Gerador rápido</h2><div class="note">Para NPCs e monstros genéricos: informe apenas o orçamento total de PA. O gerador escolhe um perfil, calcula o nível, distribui os pontos de atributo, compra perícias e seleciona vantagens gratuitas disponíveis. Depois você pode ajustar a ficha normalmente.</div><div class="npc-generator-controls"><div class="field"><label>PA para distribuir</label><input id="npcGeneratorPa" type="number" min="1" value="30"></div><button id="npcGeneratorGo" class="primary">Gerar ficha automática</button></div><div id="npcGeneratorResult" class="npc-generator-result muted"></div>';
    const creation=document.querySelector('#creationPaper');if(creation)creation.insertAdjacentElement('beforebegin',box);else geral.appendChild(box);
    box.querySelector('#npcGeneratorGo').onclick=()=>generateNpc(box.querySelector('#npcGeneratorPa').value);
  }
  const prevRenderAll=renderAll;renderAll=function(){prevRenderAll();decorateAttrTotals();ensureGenerator()};
  let tries=0;const timer=setInterval(()=>{tries++;if(ready()){clearInterval(timer);renderAll()}else if(tries>100)clearInterval(timer)},100);
})();`;
new vm.Script(runtime,{filename:'sheet-npc-generator.js'});
fs.writeFileSync(path.join(out,'sheet-npc-generator.js'),runtime);
fs.writeFileSync(sheetPath,html);
console.log('Quimera v19: atributo total em destaque + gerador rapido de NPC');
