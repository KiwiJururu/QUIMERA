const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const out=path.join(__dirname,'dist');
const release=String(process.env.QUIMERA_RELEASE||'26');
const sheetPath=path.join(out,'sheet.html'),indexPath=path.join(out,'index.html');
assert.ok(fs.existsSync(sheetPath),'dist/sheet.html ausente');
assert.ok(fs.existsSync(indexPath),'dist/index.html ausente');
const sheet=fs.readFileSync(sheetPath,'utf8'),index=fs.readFileSync(indexPath,'utf8');
function count(text,needle){return text.split(needle).length-1}
function compileFile(file){const src=fs.readFileSync(path.join(out,file),'utf8');new vm.Script(src,{filename:file})}
function localScripts(html){const outFiles=[],re=/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi;let m;while((m=re.exec(html))){const src=m[1];if(!src.startsWith('/'))continue;const file=src.slice(1).split('?')[0];if(file.endsWith('.js'))outFiles.push(file)}return outFiles}

assert.strictEqual(count(sheet,'data-tab="initiative"'),1,'aba Iniciativa duplicada ou ausente');
assert.strictEqual(count(sheet,'id="initiative"'),1,'painel Iniciativa duplicado ou ausente');
for(const id of ['attrs','skills','advantages','mods','resources','creationpa','creationmode','levelup']) assert.strictEqual(count(sheet,'id="'+id+'"'),1,'id crítico inválido: '+id);
for(const asset of ['sheet-data.js','sheet-app.js','sheet-extra.js','sheet-leveldown.js','sheet-refinements.js','sheet-creation-fix.js','sheet-bonus-expansion.js','sheet-npc-generator.js','sheet-resource-fix.js','sheet-initiative-v21.js','sheet-adv-desc-v21.js','sheet-qa-v22.js','sheet-filters.js','dashboard-release.js','dashboard-delete.js','sheet-reference-v26.js']) assert.ok(fs.existsSync(path.join(out,asset)),'asset ausente: '+asset);
assert.ok(!sheet.includes('sheet-initiative-extra.js'),'carregador antigo da iniciativa ainda presente');
assert.ok(sheet.includes('sheet-initiative-v21.js?v='+release),'iniciativa nova não versionada na release atual');
assert.ok(sheet.includes('sheet-adv-desc-v21.js?v='+release),'descrições de vantagens ausentes');
assert.ok(sheet.includes('sheet-qa-v22.js?v='+release),'patch QA ausente');
assert.ok(sheet.includes('sheet-filters.js?v='+release),'filtros de adquiridos ausentes');
assert.ok(sheet.includes('sheet-reference-v26.js?v='+release),'referências rápidas não versionadas na release atual');
assert.ok(index.includes('dashboard-release.js?v='+release),'ajuste final do resumo do painel ausente');
assert.ok(index.includes('dashboard-delete.js?v='+release),'controles de exclusão ausentes');
assert.ok(sheet.includes('name="quimera-release" content="'+release+'"'),'marcador da release ausente na ficha');
assert.ok(index.includes('name="quimera-release" content="'+release+'"'),'marcador da release ausente no painel');

assert.ok(index.includes('initiative-extra.js'),'iniciativa do dashboard ausente');
assert.ok(index.includes('campaignBody'),'corpo da campanha ausente');
assert.ok(index.includes("sb.rpc('create_campaign'"),'criação robusta de campanha via RPC não aplicada');

const loaded=[...new Set([...localScripts(sheet),...localScripts(index)])];
loaded.forEach(file=>{assert.ok(fs.existsSync(path.join(out,file)),'script referenciado ausente: '+file);compileFile(file)});

const filters=fs.readFileSync(path.join(out,'sheet-filters.js'),'utf8');
assert.ok(filters.includes('Mostrar somente perícias adquiridas'),'controle de filtro de perícias ausente');
assert.ok(filters.includes('Mostrar somente vantagens adquiridas'),'controle de filtro de vantagens ausente');
assert.ok(filters.includes('localStorage'),'preferência dos filtros não persistida localmente');
assert.ok(!/\bsave\s*\(/.test(filters),'filtro não deve gravar dados da ficha');

const dashboard=fs.readFileSync(path.join(out,'dashboard-release.js'),'utf8');
for(const key of ['pvMax','psMax','pdMax','attrModifiers'])assert.ok(dashboard.includes(key),'resumo efetivo do painel incompleto: '+key);

const deletion=fs.readFileSync(path.join(out,'dashboard-delete.js'),'utf8');
for(const text of ['Excluir campanha','Excluir personagem','Excluir NPC','Excluir monstro','Digite exatamente o nome da campanha'])assert.ok(deletion.includes(text),'controle de exclusão incompleto: '+text);
assert.ok(deletion.includes("sb.from('campaigns').delete()"),'exclusão de campanha não usa o banco');
assert.ok(deletion.includes("sb.from('characters').delete()"),'exclusão de personagem não usa o banco');
assert.ok(deletion.includes("currentRole!=='master'"),'proteção de exclusão de campanha pelo mestre ausente');
assert.ok(deletion.includes("ch.owner_user_id===user?.id"),'jogador não está limitado ao próprio personagem');
assert.ok(deletion.includes("confirm('Excluir '+label"),'confirmação de exclusão de personagem ausente');
assert.ok(deletion.includes(".eq('campaign_id',currentCampaign.id)"),'exclusão de personagem não está limitada à campanha atual');

const initiative=fs.readFileSync(path.join(out,'initiative-extra.js'),'utf8');
const sheetInitiative=fs.readFileSync(path.join(out,'sheet-initiative-v21.js'),'utf8');
for(const src of [initiative,sheetInitiative])assert.ok(src.includes('QUIMERA_MANUAL_TIE_ORDER_V26'),'desempate manual da iniciativa ausente');
assert.ok(initiative.includes('initiativeTieMove'),'controle de desempate do painel ausente');
assert.ok(sheetInitiative.includes('manualMove'),'controle de desempate da ficha ausente');
assert.ok(sheetInitiative.includes('data-v26-up')&&sheetInitiative.includes('data-v26-down'),'setas de desempate da ficha ausentes');
const stableOrder=list=>list.map((item,index)=>({item,index})).sort((a,b)=>b.item.value-a.item.value||a.index-b.index).map(x=>x.item.id);
assert.deepStrictEqual(stableOrder([{id:'Z',value:12},{id:'A',value:12},{id:'M',value:10}]),['Z','A','M'],'empate voltou a ser reordenado por outro critério');

const reference=fs.readFileSync(path.join(out,'sheet-reference-v26.js'),'utf8');
for(const text of ['Ver descrição','Forçar Sucesso Parcial','Negar Consequência','Aprimoramento','Movimentar no limite','Mais uma vez','Superaquecimento'])assert.ok(reference.includes(text),'referência rápida incompleta: '+text);

const generator=fs.readFileSync(path.join(out,'sheet-npc-generator.js'),'utf8');
assert.ok(generator.includes('Math.floor(Math.random()*3)'),'gerador voltou a escolher sempre a primeira vantagem');
assert.ok(generator.includes('s.char.concept=profile.name'),'arquétipo gerado não está sendo copiado para Conceito');
assert.ok(generator.includes('npcGeneratorClear'),'botão Limpar ficha do mestre ausente');
assert.ok(generator.includes('clearMasterSheet'),'rotina de limpeza da ficha do mestre ausente');
assert.ok(generator.includes("const keptName=s.char?.name||row?.name||''"),'limpeza do mestre deixou de preservar o nome');
assert.ok(generator.includes("s.char.concept=''"),'limpeza do mestre não remove o conceito anterior');

const leveldown=fs.readFileSync(path.join(out,'sheet-leveldown.js'),'utf8');
const refinements=fs.readFileSync(path.join(out,'sheet-refinements.js'),'utf8');
assert.ok(leveldown.includes('Nível retrocedido sem reembolso'),'proteção de reembolso de nível ausente');
assert.ok(refinements.includes('Perícia reduzida sem reembolso'),'proteção de reembolso de perícia ausente');
assert.ok(!leveldown.includes("payment?.source||(s.creation.enabled?'creation':'live')"),'fallback inseguro de nível reapareceu');
assert.ok(!refinements.includes("payment?.source||(s.creation.enabled?'creation':'live')"),'fallback inseguro de perícia reapareceu');

const buildInfo=JSON.parse(fs.readFileSync(path.join(out,'build-info.json'),'utf8'));
assert.strictEqual(String(buildInfo.release),release,'build-info com release incorreta');
for(const feature of ['initiative','free-edit','creation-pa','attribute-bonuses','effective-dashboard-stats','npc-generator','resource-steppers','advantage-descriptions','owned-filters','campaign-delete','character-delete','initiative-manual-ties','mastery-descriptions','pd-quick-reference'])assert.ok(buildInfo.features.includes(feature),'feature ausente no manifesto: '+feature);

const dataSrc=fs.readFileSync(path.join(out,'sheet-data.js'),'utf8')+'\n;globalThis.__Q=Q;';
const sandbox={};vm.createContext(sandbox);new vm.Script(dataSrc,{filename:'sheet-data.js'}).runInContext(sandbox);
const Q=sandbox.__Q;
assert.strictEqual(Q.attrs.length,7,'esperados 7 atributos');
assert.ok(Q.skills.length>=20,'lista de perícias inesperadamente curta');
for(const [attr] of Q.attrs){
  assert.strictEqual(Q.mastery[attr].length,4,'esperadas 4 maestrias em '+attr);
  Q.mastery[attr].forEach((m,i)=>{assert.strictEqual(m.length,3,'descrição de maestria ausente em '+attr+' '+i);assert.ok(String(m[2]).trim().length>10,'descrição de maestria vazia em '+attr+' '+i)});
}
for(const attr of [...Q.attrs.map(x=>x[0]),'SORTE']){
  assert.strictEqual(Q.adv[attr].length,4,'esperados 4 grupos em '+attr);
  Q.adv[attr].forEach((g,i)=>assert.strictEqual(g[1].length,3,'esperadas 3 vantagens em '+attr+' grupo '+i));
}

assert.deepStrictEqual([0,1,2,3,4].map(l=>l+l+1),[1,3,5,7,9],'custos de perícia incorretos');
assert.deepStrictEqual([1,2,3,4].map(l=>10+l),[11,12,13,14],'custos de nível incorretos');
const ca=(con,des,per,armor)=>con+des+per+armor,cs=(per,level,alert)=>per*(alert?2:1)+level;
assert.strictEqual(ca(4,3,2,1),10,'fórmula de CA incorreta');
assert.strictEqual(cs(4,3,false),7,'fórmula de CS normal incorreta');
assert.strictEqual(cs(4,3,true),11,'fórmula de CS em alerta incorreta');

console.log('SELFTEST OK v'+release+' — '+loaded.length+' scripts carregados compilados; estrutura, filtros, painel, exclusões, desempates, referências, gerador, reembolsos, campanhas, regras e fórmulas verificadas.');
