const fs=require('fs'),path=require('path');
const out=path.join(__dirname,'dist'),sheetPath=path.join(out,'sheet.html');
let html=fs.readFileSync(sheetPath,'utf8');

html=html.replace(/\?v=\d+/g,'?v=21');
html=html.replace(/<script src="\/sheet-initiative-extra\.js\?v=\d+"><\/script>/g,'');
if(!html.includes('/sheet-initiative-v21.js')) html=html.replace('</body>','<script src="/sheet-initiative-v21.js?v=21"></script></body>');
if(!html.includes('/sheet-adv-desc-v21.js')) html=html.replace('</body>','<script src="/sheet-adv-desc-v21.js?v=21"></script></body>');
html=html.replace('</head>',`<style>
.adv-desc-btn{margin-left:auto;padding:4px 8px!important;font-size:10px!important;line-height:1.2;border-radius:8px;white-space:nowrap}.advitem>label{display:flex;align-items:center;gap:7px;min-width:0}.advitem{position:relative}.adv-desc-panel{margin-top:8px;padding:9px 10px;border-radius:9px;border:1px solid var(--line);background:#fff9edb8;font-size:11px;line-height:1.45;color:#514b54}.adv-desc-panel b{color:var(--p)}
.initiative-load-error{padding:12px;border:1px solid #b64a4a55;border-radius:10px;background:#b64a4a0b}.initiative-load-error button{margin-top:8px}
@media(max-width:520px){.adv-desc-btn{padding:4px 6px!important;font-size:9.5px!important}.advitem>label{flex-wrap:wrap}.adv-desc-btn{margin-left:25px}}
</style></head>`);

fs.copyFileSync(path.join(__dirname,'sheet-initiative-v21.js'),path.join(out,'sheet-initiative-v21.js'));
fs.copyFileSync(path.join(__dirname,'sheet-adv-desc-v21.js'),path.join(out,'sheet-adv-desc-v21.js'));
fs.writeFileSync(sheetPath,html);
console.log('Quimera v21: iniciativa robusta + descrições de vantagens');
