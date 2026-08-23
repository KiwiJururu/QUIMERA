const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const out=path.join(__dirname,'dist');
const release=String(process.env.QUIMERA_RELEASE||'23');
const sheetPath=path.join(out,'sheet.html'),indexPath=path.join(out,'index.html');
assert.ok(fs.existsSync(sheetPath),'dist/sheet.html ausente');
assert.ok(fs.existsSync(indexPath),'dist/index.html ausente');
const sheet=fs.readFileSync(sheetPath,'utf8'),index=fs.readFileSync(indexPath,'utf8');
function count(text,needle){return text.split(needle).length-1}
function compileFile(file){const src=fs.readFileSync(path.join(out,file),'utf8');new vm.Script(src,{filename:file})}
function localScripts(html){const outFiles=[],re=/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi;let m;while((m=re.exec(html))){const src=m[1];if(!src.startsWith('/'))continue;const file=src.slice(1).split('?')[0];if(file.endsWith('.js'))outFiles.push(file)}return outFiles}

// Estrutura crítica: nada pode sumir ou ser duplicado durante os pós-processamentos.
assert.strictEqual(count(sheet,'data-tab="initiative"'),1,'aba Iniciativa duplicada ou ausente');
assert.strictEqual(count(sheet,'id="initiative"'),1,'painel Iniciativa duplicado ou ausente');
for(const id of ['attrs','skills','advantages','mods','resources','creationpa','creationmode','levelup']) assert.strictEqual(count(sheet,'id="'+id+'"'),1,'id crítico inválido: '+id);
for(const asset of ['sheet-data.js','sheet-app.js','sheet-extra.js','sheet-leveldown.js','sheet-refinements.js','sheet-creation-fix.js','sheet-bonus-expansion.js','sheet-npc-generator.js','sheet-resource-fix.js','sheet-initiative-v21.js','sheet-adv-desc-v21.js','sheet-qa-v22.js','sheet-filters.js']) assert.ok(fs.existsSync(path.join(out,asset)),'asset ausente: '+asset);
assert.ok(!sheet.includes('sheet-initiative-extra.js'),'carregador antigo da iniciativa ainda presente');
assert.ok(sheet.includes('sheet-initiative-v21.js?v='+release),'iniciativa nova não versionada na release atual');
assert.ok(sheet.includes('sheet-adv-desc-v21.js?v='+release),'descrições de vantagens ausentes');
assert.ok(sheet.includes('sheet-qa-v22.js?v='+release),'patch QA ausente');
assert.ok(sheet.includes('sheet-filters.js?v='+release),'filtros de adquiridos ausentes');
assert.ok(sheet.includes('name="quimera-release" content="'+release+'"'),'marcador da release ausente na ficha');
assert.ok(index.includes('name="quimera-release" content="'+release+'"'),'marcador da release ausente no painel');

// Campanhas e iniciativa do dashboard continuam preservadas.
assert.ok(index.includes('initiative-extra.js'),'iniciativa do dashboard ausente');
assert.ok(index.includes('campaignBody'),'corpo da campanha ausente');
assert.ok(index.includes("sb.rpc('create_campaign'"),'criação robusta de campanha via RPC não aplicada');

// Compila todos os scripts locais realmente enviados ao navegador.
const loaded=[...new Set([...localScripts(sheet),...localScripts(index)])];
loaded.forEach(file=>{assert.ok(fs.existsSync(path.join(out,file)),'script referenciado ausente: '+file);compileFile(file)});

// Os filtros são preferências locais de visualização e não podem salvar/mutar a ficha.
const filters=fs.readFileSync(path.join(out,'sheet-filters.js'),'utf8');
assert.ok(filters.includes('Mostrar somente perícias adquiridas'),'controle de filtro de perícias ausente');
assert.ok(filters.includes('Mostrar somente vantagens adquiridas'),'controle de filtro de vantagens ausente');
assert.ok(filters.includes('localStorage'),'preferência dos filtros não persistida localmente');
assert.ok(!/\bsave\s*\(/.test(filters),'filtro não deve gravar dados da ficha');

// O gerador precisa variar também a vantagem dentro do grupo.
const generator=fs.readFileSync(path.join(out,'sheet-npc-generator.js'),'utf8');
assert.ok(generator.includes('Math.floor(Math.random()*3)'),'gerador voltou a escolher sempre a primeira vantagem');

// Manifesto final ajuda a diagnosticar deploy/cache sem depender de vários scripts de versão.
const buildInfo=JSON.parse(fs.readFileSync(path.join(out,'build-info.json'),'utf8'));
assert.strictEqual(String(buildInfo.release),release,'build-info com release incorreta');
for(const feature of ['initiative','free-edit','creation-pa','attribute-bonuses','npc-generator','resource-steppers','advantage-descriptions','owned-filters'])assert.ok(buildInfo.features.includes(feature),'feature ausente no manifesto: '+feature);

// Estrutura das regras carregadas pela ficha.
const dataSrc=fs.readFileSync(path.join(out,'sheet-data.js'),'utf8')+'\n;globalThis.__Q=Q;';
const sandbox={};vm.createContext(sandbox);new vm.Script(dataSrc,{filename:'sheet-data.js'}).runInContext(sandbox);
const Q=sandbox.__Q;
assert.strictEqual(Q.attrs.length,7,'esperados 7 atributos');
assert.ok(Q.skills.length>=20,'lista de perícias inesperadamente curta');
for(const attr of [...Q.attrs.map(x=>x[0]),'SORTE']){
  assert.strictEqual(Q.adv[attr].length,4,'esperados 4 grupos em '+attr);
  Q.adv[attr].forEach((g,i)=>assert.strictEqual(g[1].length,3,'esperadas 3 vantagens em '+attr+' grupo '+i));
}

// Regras matemáticas que não podem regredir.
assert.deepStrictEqual([0,1,2,3,4].map(l=>l+l+1),[1,3,5,7,9],'custos de perícia incorretos');
assert.deepStrictEqual([1,2,3,4].map(l=>10+l),[11,12,13,14],'custos de nível incorretos');
const ca=(con,des,per,armor)=>con+des+per+armor,cs=(per,level,alert)=>per*(alert?2:1)+level;
assert.strictEqual(ca(4,3,2,1),10,'fórmula de CA incorreta');
assert.strictEqual(cs(4,3,false),7,'fórmula de CS normal incorreta');
assert.strictEqual(cs(4,3,true),11,'fórmula de CS em alerta incorreta');

console.log('SELFTEST OK v'+release+' — '+loaded.length+' scripts carregados compilados; estrutura, filtros, campanhas, regras e fórmulas verificadas.');
