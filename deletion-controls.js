const fs=require('fs'),path=require('path'),vm=require('vm');
const out=path.join(__dirname,'dist');
const indexPath=path.join(out,'index.html');
const release=String(process.env.QUIMERA_RELEASE||'25');
let index=fs.readFileSync(indexPath,'utf8');

if(!index.includes('/dashboard-delete.js')){
  index=index.replace('</body>','<script src="/dashboard-delete.js?v='+release+'"></script></body>');
}

function dashboardDeleteRuntime(){
  function campaignDeleteButton(){
    if(currentRole!=='master'||!currentCampaign)return;
    const panel=document.querySelector('#content > .panel');
    const head=panel?.querySelector(':scope > .panel-head');
    if(!head||document.querySelector('#deleteCampaign'))return;
    const right=head.lastElementChild;
    const host=right&&right!==head.firstElementChild?right:head;
    const button=document.createElement('button');
    button.id='deleteCampaign';
    button.className='btn small danger';
    button.type='button';
    button.style.marginTop='8px';
    button.textContent='Excluir campanha';
    button.onclick=openDeleteCampaign;
    host.appendChild(button);
  }

  function openDeleteCampaign(){
    if(currentRole!=='master'||!currentCampaign)return;
    const campaignId=currentCampaign.id;
    const campaignName=String(currentCampaign.name||'');
    showModal('Excluir campanha',
      '<div class="muted" style="line-height:1.5;margin-bottom:12px">Esta ação é permanente. A campanha <b>'+esc(campaignName)+'</b>, seus personagens, NPCs, monstros, pastas e iniciativa serão excluídos.</div>'+ 
      '<div class="field"><label>Para confirmar, digite exatamente o nome da campanha</label><input id="deleteCampaignName" autocomplete="off" placeholder="'+esc(campaignName)+'"></div>'+ 
      '<button id="confirmDeleteCampaign" class="btn danger" style="width:100%">Excluir campanha permanentemente</button>');
    const input=document.querySelector('#deleteCampaignName');
    const button=document.querySelector('#confirmDeleteCampaign');
    if(input)input.focus();
    if(!button)return;
    button.onclick=async()=>{
      if((input?.value||'').trim()!==campaignName.trim())return toast('Digite exatamente o nome da campanha para confirmar.');
      button.disabled=true;button.textContent='Excluindo...';
      const {data,error}=await sb.from('campaigns').delete().eq('id',campaignId).select('id');
      if(error||!data?.length){button.disabled=false;button.textContent='Excluir campanha permanentemente';return toast(error?.message||'Não foi possível excluir a campanha.');}
      closeModal();
      if(channel){sb.removeChannel(channel);channel=null}
      history.replaceState({},'',location.pathname);
      await openHome();
      toast('Campanha excluída.');
    };
  }

  function deleteLabel(ch){return ch.kind==='player'?'Excluir personagem':ch.kind==='npc'?'Excluir NPC':'Excluir monstro'}
  function canDeleteCharacter(ch){
    if(!ch)return false;
    if(ch.kind==='player')return activeTab==='players'&&(currentRole==='master'||ch.owner_user_id===user?.id);
    return currentRole==='master'&&((ch.kind==='npc'&&activeTab==='npcs')||(ch.kind==='monster'&&activeTab==='monsters'));
  }
  async function deleteCharacter(id,button){
    const ch=chars.find(x=>x.id===id);if(!canDeleteCharacter(ch))return;
    const label=ch.kind==='player'?'personagem':ch.kind==='npc'?'NPC':'monstro';
    if(!confirm('Excluir '+label+' “'+ch.name+'”? Esta ação não pode ser desfeita.'))return;
    button.disabled=true;button.textContent='Excluindo...';
    const {data,error}=await sb.from('characters').delete().eq('id',ch.id).eq('campaign_id',currentCampaign.id).select('id');
    if(error||!data?.length){button.disabled=false;button.textContent=deleteLabel(ch);return toast(error?.message||'Não foi possível excluir.');}
    chars=chars.filter(x=>x.id!==ch.id);
    renderCampaignBody();
    toast((ch.kind==='player'?'Personagem':ch.kind==='npc'?'NPC':'Monstro')+' excluído.');
  }
  function decorateCharacterDeletes(){
    if(!currentCampaign)return;
    document.querySelectorAll('.entity[data-char-id]').forEach(card=>{
      const ch=chars.find(x=>x.id===card.dataset.charId);if(!canDeleteCharacter(ch))return;
      const actions=card.querySelector('.entity-actions');if(!actions||actions.querySelector('[data-delete-char]'))return;
      const button=document.createElement('button');button.type='button';button.className='btn small danger';button.dataset.deleteChar=ch.id;button.textContent=deleteLabel(ch);
      button.onclick=()=>deleteCharacter(ch.id,button);actions.appendChild(button);
    });
  }

  if(typeof renderCampaign==='function'){
    const previousRenderCampaign=renderCampaign;
    renderCampaign=function(){const result=previousRenderCampaign.apply(this,arguments);campaignDeleteButton();decorateCharacterDeletes();return result};
  }
  if(typeof renderCampaignBody==='function'){
    const previousRenderCampaignBody=renderCampaignBody;
    renderCampaignBody=function(){const result=previousRenderCampaignBody.apply(this,arguments);decorateCharacterDeletes();return result};
  }
  if(typeof renderPlayers==='function'){
    const previousRenderPlayers=renderPlayers;
    renderPlayers=function(){const result=previousRenderPlayers.apply(this,arguments);decorateCharacterDeletes();return result};
  }
  if(typeof renderLibrary==='function'){
    const previousRenderLibrary=renderLibrary;
    renderLibrary=function(){const result=previousRenderLibrary.apply(this,arguments);decorateCharacterDeletes();return result};
  }

  try{campaignDeleteButton();decorateCharacterDeletes()}catch(error){console.warn('[Quimera exclusão]',error)}
}

const runtime='('+dashboardDeleteRuntime.toString()+')();';
new vm.Script(runtime,{filename:'dashboard-delete.js'});
fs.writeFileSync(path.join(out,'dashboard-delete.js'),runtime);
fs.writeFileSync(indexPath,index);
console.log('Quimera v'+release+': exclusão segura de campanhas e personagens aplicada.');
