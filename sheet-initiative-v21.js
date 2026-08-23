(() => {
  let campaign = null;
  let role = 'player';
  let chars = [];
  let channel = null;
  let loading = false;

  const listEl = () => document.querySelector('#initiativeSheetList');
  const badgeEl = () => document.querySelector('#initiativeRole');
  const esc = value => {
    const el = document.createElement('span');
    el.textContent = String(value ?? '');
    return el.innerHTML;
  };
  const kind = k => k === 'player' ? 'Jogador' : k === 'npc' ? 'NPC' : k === 'monster' ? 'Monstro' : 'Outro';

  function uidFromSession(session) {
    if (session?.user?.id) return session.user.id;
    try {
      const chunk = String(session?.access_token || '').split('.')[1] || '';
      const normalized = chunk.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalized));
      return payload?.sub || null;
    } catch {
      return null;
    }
  }

  async function restGet(table, query, session) {
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        headers: { apikey: KEY, Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      }),
      6000,
      'tempo limite da iniciativa'
    );
    let body = null;
    try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body?.message || `erro ${response.status}`);
    return Array.isArray(body) ? body : [];
  }

  async function restPatchCampaign(data, session) {
    const query = new URLSearchParams({ id: `eq.${campaign.id}` }).toString();
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/campaigns?${query}`, {
        method: 'PATCH',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(data),
        cache: 'no-store'
      }),
      6000,
      'tempo limite ao salvar iniciativa'
    );
    if (!response.ok) {
      let body = null;
      try { body = await response.json(); } catch {}
      throw new Error(body?.message || `erro ${response.status}`);
    }
  }

  const items = () => Array.isArray(campaign?.initiative) ? campaign.initiative : [];
  const sorted = () => [...items()].sort((a, b) =>
    (Number(b.value) || 0) - (Number(a.value) || 0) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
  );

  function showError(message) {
    const list = listEl();
    const badge = badgeEl();
    if (badge) badge.textContent = 'Falha ao carregar';
    if (!list) return;
    list.innerHTML = `
      <div class="initiative-load-error">
        <b>Não foi possível carregar a iniciativa.</b>
        <div class="muted" style="margin-top:5px">${esc(message || 'Erro desconhecido')}</div>
        <button id="initRetryV21">Tentar novamente</button>
      </div>`;
    list.querySelector('#initRetryV21').onclick = load;
  }

  function render() {
    const list = listEl();
    const badge = badgeEl();
    if (!list || !badge) return;
    const master = role === 'master';
    const ordered = sorted();
    badge.textContent = master ? 'Mestre · edição liberada' : 'Jogador · somente leitura';

    const rows = ordered.length
      ? ordered.map((item, index) => `
        <div class="initiative-sheet-row">
          <div class="initiative-sheet-pos">${index + 1}</div>
          <div>
            <div class="initiative-sheet-name">${esc(item.name || 'Sem nome')}</div>
            <div class="initiative-sheet-kind">${kind(item.kind)}</div>
          </div>
          ${master
            ? `<input data-v21-value="${esc(item.id)}" type="number" value="${Number(item.value) || 0}">`
            : `<div class="initiative-sheet-value">${Number(item.value) || 0}</div>`}
          ${master
            ? `<button data-v21-del="${esc(item.id)}" class="danger">×</button>`
            : '<span></span>'}
        </div>`).join('')
      : '<div class="note">A iniciativa ainda não foi preenchida.</div>';

    list.innerHTML = rows + (master
      ? '<div class="initiative-sheet-actions"><button id="v21Add" class="primary">+ Adicionar</button><button id="v21Clear" class="danger">Limpar</button></div>'
      : '');

    if (!master) return;
    list.querySelector('#v21Add').onclick = openAdd;
    list.querySelector('#v21Clear').onclick = () => {
      if (items().length && confirm('Limpar toda a iniciativa?')) persist([]);
    };
    list.querySelectorAll('[data-v21-value]').forEach(input => {
      input.onfocus = () => input.select();
      input.onchange = () => persist(items().map(item =>
        item.id === input.dataset.v21Value
          ? { ...item, value: Number(input.value) || 0 }
          : item
      ));
    });
    list.querySelectorAll('[data-v21-del]').forEach(button => {
      button.onclick = () => persist(items().filter(item => item.id !== button.dataset.v21Del));
    });
  }

  async function persist(next) {
    if (role !== 'master' || !campaign) return;
    const previous = campaign.initiative;
    campaign.initiative = next;
    render();
    try {
      const result = await withTimeout(
        db.from('campaigns').update({ initiative: next }).eq('id', campaign.id),
        5000,
        'tempo limite ao salvar iniciativa'
      );
      if (result?.error) throw result.error;
    } catch (primaryError) {
      try {
        const session = activeSession || await sessionSafe();
        if (!session?.access_token) throw new Error('sessão expirada');
        await restPatchCampaign({ initiative: next }, session);
      } catch (error) {
        campaign.initiative = previous;
        render();
        toast(error.message || 'Não foi possível salvar a iniciativa.');
      }
    }
  }

  function openAdd() {
    const options = chars.map(char =>
      `<option value="${esc(char.id)}">${esc(char.name)} — ${kind(char.kind)}</option>`
    ).join('');
    const wrap = document.createElement('div');
    wrap.className = 'paper';
    wrap.style.cssText = 'position:fixed;z-index:1000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,460px);box-shadow:0 18px 60px #0006';
    wrap.innerHTML = `
      <h2>Adicionar à iniciativa</h2>
      <div class="field"><label>Participante</label><select id="v21Char"><option value="">Outro / nome manual</option>${options}</select></div>
      <div class="field"><label>Nome manual</label><input id="v21Name" placeholder="Opcional"></div>
      <div class="field"><label>Resultado do teste</label><input id="v21Value" type="number" value="0"></div>
      <div class="row" style="margin-top:10px"><button id="v21Save" class="primary">Adicionar</button><button id="v21Cancel">Cancelar</button></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#v21Cancel').onclick = () => wrap.remove();
    wrap.querySelector('#v21Save').onclick = () => {
      const characterId = wrap.querySelector('#v21Char').value || null;
      const char = chars.find(item => item.id === characterId);
      const customName = wrap.querySelector('#v21Name').value.trim();
      const name = customName || char?.name || '';
      if (!name) return toast('Escolha um participante ou digite um nome.');
      const item = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        character_id: characterId,
        name,
        kind: char?.kind || 'custom',
        value: Number(wrap.querySelector('#v21Value').value) || 0
      };
      wrap.remove();
      persist([...items(), item]);
    };
  }

  async function load() {
    if (loading) return;
    loading = true;
    const list = listEl();
    const badge = badgeEl();
    if (badge) badge.textContent = 'Carregando...';
    if (list) list.innerHTML = '<div class="note">Carregando iniciativa...</div>';

    try {
      let tries = 0;
      while (!row?.campaign_id && tries++ < 80) await new Promise(resolve => setTimeout(resolve, 100));
      if (!row?.campaign_id) throw new Error('campanha da ficha não identificada');

      const session = activeSession || await sessionSafe();
      if (!session?.access_token) throw new Error('sessão expirada');
      const uid = uidFromSession(session);
      if (!uid) throw new Error('usuário da sessão não identificado');

      let campaignRows;
      let memberRows;
      let characterRows;
      try {
        const [campaignQuery, memberQuery, charsQuery] = await Promise.all([
          withTimeout(db.from('campaigns').select('id,name,initiative,owner_id').eq('id', row.campaign_id).single(), 5000, 'tempo limite da campanha'),
          withTimeout(db.from('campaign_members').select('role').eq('campaign_id', row.campaign_id).eq('user_id', uid).maybeSingle(), 5000, 'tempo limite da permissão'),
          withTimeout(db.from('characters').select('id,name,kind').eq('campaign_id', row.campaign_id), 5000, 'tempo limite dos participantes')
        ]);
        if (campaignQuery.error) throw campaignQuery.error;
        campaignRows = [campaignQuery.data];
        memberRows = memberQuery.error ? [] : (memberQuery.data ? [memberQuery.data] : []);
        characterRows = charsQuery.error ? [] : (charsQuery.data || []);
      } catch {
        const campaignQuery = new URLSearchParams({ id: `eq.${row.campaign_id}`, select: 'id,name,initiative,owner_id' }).toString();
        const memberQuery = new URLSearchParams({ campaign_id: `eq.${row.campaign_id}`, user_id: `eq.${uid}`, select: 'role' }).toString();
        const charsQuery = new URLSearchParams({ campaign_id: `eq.${row.campaign_id}`, select: 'id,name,kind' }).toString();
        [campaignRows, memberRows, characterRows] = await Promise.all([
          restGet('campaigns', campaignQuery, session),
          restGet('campaign_members', memberQuery, session).catch(() => []),
          restGet('characters', charsQuery, session).catch(() => [])
        ]);
      }

      if (!campaignRows?.[0]) throw new Error('campanha não encontrada ou sem permissão');
      campaign = campaignRows[0];
      chars = characterRows || [];
      role = campaign.owner_id === uid ? 'master' : (memberRows?.[0]?.role || 'player');
      render();

      try {
        if (channel) db.removeChannel(channel);
        channel = db.channel(`sheet-init-v21-${row.campaign_id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'campaigns',
            filter: `id=eq.${row.campaign_id}`
          }, payload => {
            if (payload.new) {
              campaign = { ...campaign, ...payload.new };
              render();
            }
          })
          .subscribe();
      } catch (error) {
        console.warn('[Quimera iniciativa realtime]', error);
      }
    } catch (error) {
      console.error('[Quimera iniciativa]', error);
      showError(error.message || 'erro ao carregar');
    } finally {
      loading = false;
    }
  }

  window.QuimeraReloadInitiative = load;
  load();
})();
