const {spawnSync}=require('child_process');
const path=require('path');

const release=String(process.env.QUIMERA_RELEASE||'26');
const stages=[
  ['Base','build.js'],
  ['Campanhas','campaign-fix.js'],
  ['Painel e ficha online','postbuild.js'],
  ['Progressão e edição livre','afterfix.js'],
  ['PA de criação','creation-fix.js'],
  ['Bônus de atributos','bonus-expansion.js'],
  ['Gerador de NPC/monstro','npc-generator.js'],
  ['Recursos e editores numéricos','resource-fix.js'],
  ['Iniciativa e descrições','initiative-adv-fix.js'],
  ['Correções de regras','qa-fixes.js'],
  ['Interface final e filtros','release-ui.js'],
  ['Controles de exclusão','deletion-controls.js'],
  ['Desempates e referências','review-tools.js'],
  ['Testes de regressão','selftest.js']
];

console.log(`\n=== Quimera release v${release} ===`);
for(const [label,file] of stages){
  console.log(`\n[build] ${label} -> ${file}`);
  const result=spawnSync(process.execPath,[path.join(__dirname,file)],{
    cwd:__dirname,
    stdio:'inherit',
    env:{...process.env,QUIMERA_RELEASE:release}
  });
  if(result.error)throw result.error;
  if(result.status!==0){
    console.error(`[build] Falha em ${file} (código ${result.status}).`);
    process.exit(result.status||1);
  }
}
console.log(`\n=== Quimera v${release}: build e testes concluídos ===\n`);
