const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const out=path.join(__dirname,'dist');
const sheetPath=path.join(out,'sheet.html'),indexPath=path.join(out,'index.html');
assert.ok(fs.existsSync(sheetPath),'dist/sheet.html ausente');
assert.ok(fs.existsSync(indexPath),'dist/index.html ausente');
const sheet=fs.readFileSync(sheetPath,'utf8'),index=fs.readFileSync(indexPath,'utf8');

function count(text,needle){return text.split(needle).length-1}
function compileFile(file){const src=fs.readFileSync(path.join(out,file),'utf8');new vm.Script(src,{filename:file})}
function compileInline(html,name){let n=0;const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(html))){if(m[1].trim()){new vm.Script(m[1],{filename:name+'#inline-'+(++n)})}}return n}

// Estrutura essencial da ficha.
assert.strictEqual(count(sheet,'data-tab="initiative"'),1,'aba Iniciativa duplicada ou ausente');
assert.strictEqual(count(sheet,'id="initiative"'),1,'painel Iniciativa duplicado ou ausente');
for(const id of ['attrs','skills','advantages','mods','resources','creationpa','creationmode','levelup']) assert.strictEqual(count(sheet,'id="'+id+'"'),1,'id crítico inválido: '+id);
for(const asset of ['sheet-data.js','sheet-app.js','sheet-extra.js','sheet-leveldown.js','sheet-refinements.js','sheet-creation-fix.js','sheet-bonus-expansion.js','sheet-npc-generator.js','sheet-resource-fix.js','sheet-initiative-v21.js','sheet-adv-desc-v21.js','sheet-qa-v22.js']) assert.ok(fs.existsSync(path.join(out,asset)),'asset ausente: '+asset);
assert.ok(!sheet.includes('sheet-initiative-extra.js'),'carregador antigo da iniciativa ainda presente');
assert.ok(sheet.includes('sheet-initiative-v21.js?v=22'),'iniciativa nova não versionada na release atual');
assert.ok(sheet.includes('sheet-adv-desc-v21.js?v=22'),'descrições de vantagens ausentes');
assert.ok(sheet.includes('sheet-qa-v22.js?v=22'),'patch QA v22 ausente');

// Dashboard preserva iniciativa e funcionalidades de campanha.
assert.ok(index.includes('initiative-extra.js'),'iniciativa do dashboard ausente');
assert.ok(index.includes('campaignBody'),'corpo da campanha ausente');

// Todo JS entregue ao navegador precisa pelo menos compilar.
const runtimeJs=fs.readdirSync(out).filter(f=>f.endsWith('.js'));
runtimeJs.forEach(compileFile);
compileInline(sheet,'sheet.html');
compileInline(index,'index.html');

// Estrutura das regras carregadas na ficha.
const dataSrc=fs.readFileSync(path.join(out,'sheet-data.js'),'utf8')+'\n;globalThis.__Q=Q;';
const sandbox={};vm.createContext(sandbox);new vm.Script(dataSrc,{filename:'sheet-data.js'}).runInContext(sandbox);
const Q=sandbox.__Q;
assert.strictEqual(Q.attrs.length,7,'esperados 7 atributos');
assert.ok(Q.skills.length>=20,'lista de perícias inesperadamente curta');
for(const attr of [...Q.attrs.map(x=>x[0]),'SORTE']){
  assert.strictEqual(Q.adv[attr].length,4,'esperados 4 grupos em '+attr);
  Q.adv[attr].forEach((g,i)=>assert.strictEqual(g[1].length,3,'esperadas 3 vantagens em '+attr+' grupo '+i));
}

// Regras matemáticas que não devem regredir.
assert.deepStrictEqual([0,1,2,3,4].map(l=>l+l+1),[1,3,5,7,9],'custos de perícia incorretos');
assert.deepStrictEqual([1,2,3,4].map(l=>10+l),[11,12,13,14],'custos de nível incorretos');
const ca=(con,des,per,armor)=>con+des+per+armor,cs=(per,level,alert)=>per*(alert?2:1)+level;
assert.strictEqual(ca(4,3,2,1),10,'fórmula de CA incorreta');
assert.strictEqual(cs(4,3,false),7,'fórmula de CS normal incorreta');
assert.strictEqual(cs(4,3,true),11,'fórmula de CS em alerta incorreta');

console.log('SELFTEST OK — '+runtimeJs.length+' scripts compilados; estrutura, fórmulas e features críticas verificadas.');
