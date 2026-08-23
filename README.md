# Quimera Online

Painel online do sistema de RPG **Quimera**, com fichas sincronizadas em tempo real.

## O que já funciona

- cadastro/login com Supabase Auth;
- várias campanhas por usuário;
- criação de campanha e entrada por código;
- jogador escolhe a campanha e pode ter mais de um personagem;
- ficha automática baseada na versão v5 do Quimera;
- salvamento automático da ficha no Supabase;
- atualização em tempo real entre jogador e mestre;
- painel do mestre com resumo de nível, jogador, PV e Defesa;
- NPCs e monstros separados;
- pastas e subpastas para NPCs/monstros;
- mover por seletor ou arrastar e soltar no desktop;
- duplicar NPC/monstro;
- marcar NPC/monstro como “Em cena”;
- painel de sessão ao vivo.

## Arquivos

- `index.html`: login, campanhas e painel do mestre/jogador.
- `sheet.html`: ficha completa online.
- `vercel.json`: rota `/ficha` e cabeçalhos básicos.
- `supabase/migrations`: cópia das migrações aplicadas ao banco.

## Supabase

O frontend usa somente a **publishable key**, que pode ficar no navegador. A proteção dos dados é feita por Row Level Security (RLS): jogadores só acessam os próprios personagens, enquanto o mestre acessa os dados da campanha que administra. NPCs, monstros e pastas são privados para o mestre.

## Antes de liberar cadastro ao público

Depois do primeiro deploy na Vercel, configure em **Supabase → Authentication → URL Configuration**:

- **Site URL**: URL de produção da Vercel;
- **Redirect URLs**: adicione a mesma URL (e previews, se desejar).

Isso garante que o link de confirmação de e-mail volte para o site correto.
