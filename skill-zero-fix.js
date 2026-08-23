const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const out=path.join(__dirname,'dist');
const release=String(process.env.QUIMERA_RELEASE||'32');
const bonusPath=path.join(out,'sheet-bonus-expansion.js');
const sheetPath=path.join(out,'sheet.html');

let runtime=fs.readFileSync(bonusPath,'utf8');
const oldSkillCalc=`  function skillCalc(lvl,attr,secondary,name,fam){
    const profBase=sc(attrTotal(attr));
    const prof=secondary?Math.max(0,profBase-1):profBase;
    const mods=dieParts(name,fam);
    const total=Math.max(0,(Number(lvl)||0)+prof+mods.bonus-mods.penalty);
    return {lvl:Number(lvl)||0,prof,bonus:mods.bonus,penalty:mods.penalty,total,die:die(total)};
  }`;
const newSkillCalc=`  function skillCalc(lvl,attr,secondary,name,fam){
    const skillLevel=Number(lvl)||0;
    // Perícia NV 0 não recebe proficiência do atributo. Ela só passa a somar proficiência após ser adquirida.
    const profBase=skillLevel>0?sc(attrTotal(attr)):0;
    const prof=secondary?Math.max(0,profBase-1):profBase;
    const mods=dieParts(name,fam);
    const total=Math.max(0,skillLevel+prof+mods.bonus-mods.penalty);
    return {lvl:skillLevel,prof,bonus:mods.bonus,penalty:mods.penalty,total,die:die(total)};
  }`;
if(!runtime.includes(oldSkillCalc))throw new Error('Trecho de cálculo de perícia não encontrado para correção de NV 0.');
runtime=runtime.replace(oldSkillCalc,newSkillCalc);
new vm.Script(runtime,{filename:'sheet-bonus-expansion.js'});
fs.writeFileSync(bonusPath,runtime);

// Regressões da regra: NV 0 ignora proficiência; a partir de NV 1 ela volta normalmente.
const sc=v=>v>=16?4:v>=12?3:v>=8?2:v>=4?1:0;
const proficiency=(lvl,attr,secondary=false)=>{const base=(Number(lvl)||0)>0?sc(attr):0;return secondary?Math.max(0,base-1):base};
assert.strictEqual(proficiency(0,20,false),0,'NV 0 recebeu proficiência primária');
assert.strictEqual(proficiency(0,20,true),0,'NV 0 recebeu proficiência secundária');
assert.strictEqual(proficiency(1,20,false),4,'NV 1 deixou de receber proficiência primária');
assert.strictEqual(proficiency(1,20,true),3,'NV 1 deixou de receber proficiência secundária');
assert.strictEqual(proficiency(0,8,false),0,'NV 0 recebeu proficiência em atributo 8');

let sheet=fs.readFileSync(sheetPath,'utf8');
sheet=sheet.replace(/\?v=\d+/g,'?v='+release);
fs.writeFileSync(sheetPath,sheet);

const infoPath=path.join(out,'build-info.json');
if(fs.existsSync(infoPath)){
  const info=JSON.parse(fs.readFileSync(infoPath,'utf8'));
  info.release=Number(release);
  info.features=Array.from(new Set([...(info.features||[]),'skill-zero-no-proficiency']));
  fs.writeFileSync(infoPath,JSON.stringify(info,null,2));
}
console.log('Quimera v'+release+': perícias NV 0 não recebem proficiência; regressões verificadas.');
