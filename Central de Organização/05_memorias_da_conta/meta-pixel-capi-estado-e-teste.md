---
name: meta-pixel-capi-estado-e-teste
description: Pixel e API de Conversões da Meta do Real Olímpico estão no ar e comprovados (15/11/2026); como testar o evento do servidor sem prejudicar a campanha
metadata:
  node_type: memory
  type: project
  originSessionId: 73b8f254-9459-49aa-94d9-ca42b533bbe0
  modified: 2026-11-15T19:55:41.035Z
---

Pixel (ID 1445788774389944, conta de anúncios 24176712608600366) e API de Conversões estão ligados e comprovados em produção desde 15/11/2026: o cadastro por e-mail chega à Meta pelo navegador e pelo servidor com o MESMO event ID (deduplica, conta um). Token em `META_CAPI_ACCESS_TOKEN` (Vercel, produção, sensível). Relatório completo: `docs/META_PIXEL_RELATORIO_2026-11-14.md`; guia: `docs/META_PIXEL.md`; risco LGPD em RA-61.

**Why:** a campanha "Tráfego para Cadastro" precisa medir o cadastro. O Pixel por si só leva a URL à Meta, então áreas com dado de gente na URL (`/admin`, `/painel`, `/recibos/`, `/conta/aceites`, `/relatorios`) ficam sem rastreio; o snippet desliga `fbq.disablePushState` porque a contagem automática do Pixel vazava a URL de /relatorios na navegação interna.

**How to apply:**
- Para ver o evento do SERVIDOR em tempo real, ele só aparece na aba "Eventos de teste" se a produção tiver `META_TEST_EVENT_CODE` (o código TESTxxxx fica na aba, canal Site). A Visão geral da Meta atrasa até 30 min. Colocar a variável é TEMPORÁRIO: com ela, todo cadastro real pelo servidor vai para a lista de teste e não conta na campanha. Tirar logo depois e redeployar.
- A CLI da Vercel recusa `env rm` sem confirmação humana (`--yes` não basta): o Gabriel roda `npx vercel env rm NOME production --scope aurea-custodia --confirm-name NOME`. Env nova só vale em deploy novo; commit vazio na `main` dispara.
- Recarregar a aba "Eventos de teste" perde a sessão; reselecionar o canal Site traz de volta o mesmo código.
- Gerar o token da API de Conversões deu "Acesso de desenvolvedor restrito" até a conta de desenvolvedor ser verificada; depois funcionou. Runtime logs da Vercel (plano Hobby) só guardam 1 h e não mostram invocação quente sem console.log.
- Contas de teste de produção (`teste.pixel`, `pixel2`..`pixel5` @example.com): só o LOGIN (auth.users) foi apagado em 15/11/2026, com `node scripts/apagar-contas-de-teste.mjs --so-login` (script local, não commitado; sem flag só confere). As linhas de `aurea.users` (saldo 0) FICAM de propósito: `ledger_entries` e `aceites_documentos` têm corrente de hash GLOBAL (hash_anterior = hash da linha anterior de qualquer conta), e apagar linha do meio quebra a prova das contas seguintes. Conta nova de teste sempre deixa 1 lançamento `saldo_inicial` e 4 aceites; por isso conta de teste em produção não se apaga de aurea.* — melhor evitar criar. Eu não apago nada em produção sem o Gabriel.
- Apagar o usuário no Supabase Auth NÃO derruba a sessão aberta: o JWT continua valendo até expirar (~3 h) e o app respondia 200 para a conta apagada (aurea.users ainda existe). Para encerrar na hora, sair pelo botão "Sair da conta" (há um tour de boas-vindas que cobre o botão; "Pular tudo" antes). Possível melhoria, só com o Gabriel: validar o usuário no servidor (getUser) em vez de confiar só no JWT.
- Não testar tela que a conta não alcança (recibo de moeda inexistente derrubou a página).
