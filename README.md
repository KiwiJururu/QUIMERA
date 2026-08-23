# Quimera Online

Painel online do sistema de RPG **Quimera**, com campanhas, fichas e iniciativa sincronizadas em tempo real.

## Recursos atuais

- cadastro/login simplificado por **nome + senha**;
- várias campanhas por usuário, com criação e entrada por código;
- jogadores com múltiplos personagens;
- ficha automática com CA, CS, PA, perícias, vantagens, bônus, recursos e laços;
- salvamento automático no Supabase e atualização em tempo real;
- iniciativa compartilhada: visível ao grupo e editável apenas pelo mestre;
- painel do mestre com jogadores, NPCs e monstros;
- pastas e subpastas para NPCs/monstros, mover, duplicar e marcar “Em cena”;
- NPCs/monstros com **Edição livre do mestre** opcional ou regras normais da ficha;
- gerador rápido de NPC/monstro por orçamento de PA;
- PA de Criação, retrocesso de nível e descompra de perícias com reembolso;
- bônus/desvantagens de dados e de atributos;
- descrições consultáveis das vantagens;
- filtros opcionais para mostrar apenas perícias e vantagens adquiridas;
- controles rápidos de recursos para NPCs/monstros.

## Build

O build é coordenado por **`build-pipeline.js`**. O `package.json` possui apenas um ponto de entrada (`npm run build`), e a pipeline executa os módulos de transformação em uma ordem explícita, aplica a versão final dos assets e encerra com testes de regressão.

A ideia é manter as features em módulos pequenos sem depender de uma longa cadeia escondida no `package.json`. Scripts antigos que já não faziam parte da aplicação foram removidos para evitar confusão.

Arquivos principais:

- `index.html`: login, campanhas e painel do mestre/jogador;
- `sheet.html`: base da ficha online;
- `build.js`: geração inicial de `dist/`;
- `build-pipeline.js`: ordem central das etapas de build;
- `release-ui.js`: acabamento da release, filtros e versão final dos assets;
- `selftest.js`: testes automáticos de regressão;
- `vercel.json`: rota `/ficha` e cabeçalhos;
- `supabase/migrations`: migrações versionadas do banco.

## Segurança e Supabase

O navegador recebe somente a **publishable key** do Supabase. A proteção dos dados é feita por Row Level Security (RLS): jogadores acessam os próprios personagens, enquanto o mestre administra os dados da campanha, NPCs, monstros e pastas.

A criação de conta usa a Edge Function `friend-signup`, que cria internamente o identificador de autenticação sem expor e-mail ao jogador. A criação de campanha usa a RPC autenticada `create_campaign`.

## CI

O workflow em `.github/workflows/ci.yml` executa `npm run build`. O build falha se alguma feature crítica desaparecer, algum runtime final não compilar ou regras matemáticas essenciais regressarem.
