# Integrações — o que falta, e o que falta de código nos Correios

```
Conferido em: 18/09/2026, na main 9fbfa6a
Fontes:       src/domain/admin/integracoes.ts (a lista que a aba Integrações lê)
              vercel env ls production
              src/lib/shipping/correios.ts, tracking.ts, ATALHOS.md
Pergunta que este documento responde: "falta só o Correios, ou tem mais?"
```

---

## 1. A resposta curta: faltam dois, e o Correios é o mais fundo

A aba Integrações conhece **nove serviços**. Sete estão ligados e **dois estão desligados**.

| Serviço | Estado | Variáveis | Quem resolve |
|---|---|---|---|
| Banco de dados (Postgres) | ✅ **ligado** | — | — |
| Login (Supabase Auth) | ✅ **ligado** | — | — |
| Chave de serviço do Supabase | ✅ **ligado** | — | — |
| Estação da bancada | ✅ **ligado** | — | — |
| Pagamento (Mercado Pago) | ✅ **ligado em 18/09** | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX` | feito pelo Cowork |
| Tarefas agendadas | ✅ **ligado em 18/09** | `CRON_SECRET` | feito |
| Relatórios por API e Google Sheets | ✅ **ligado em 18/09** | `AUREA_RELATORIOS_TOKEN` | feito |
| **Correios** | ✅ ligado em 22/10/2026 | `CORREIOS_USUARIO`, `CORREIOS_CODIGO_ACESSO`, `CORREIOS_CARTAO_POSTAGEM`, `CORREIOS_CONTRATO`, `CORREIOS_DR` | Contrato Platinum 1 e API CWS — seção 3 |
| **WhatsApp do atendimento** | ❌ desligado | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `WHATSAPP_WEBHOOK_SECRET` | Decisão sua + hospedagem |

> **A diferença que importa.** No WhatsApp, **o código está pronto e só falta a variável**. O
> **Atualização de 22/10/2026:** os Correios foram ligados (seção 3). O texto da seção 2 sobre eles é
> histórico.
> A aba Integrações não sabe dizer isso: ela só conta variável.

---

## 2. O que acontece hoje, na prática, com os dois desligados

- **Correios (até 22/10/2026):** cotação de frete, etiqueta e rastreio usavam o **adaptador
  determinístico**. Hoje só valem sem as variáveis `CORREIOS_*`, e a tela avisa.
- **WhatsApp:** as respostas de `/admin/cs` ficam registradas só no painel; o webhook responde 503.

---

## 3. Correios — ✅ resolvido em 22/10/2026

O contrato comercial saiu (Platinum 1, nº 9912766936, cartão 0080378641, DR 20) e as três funções que
esta seção pedia foram escritas, contra a API real:

- **Token renovado sozinho** (`src/lib/shipping/cws/cliente.ts`): usuário + código de acesso geram o token
  de 24 h, guardado em memória e renovado antes de vencer. `CORREIOS_TOKEN` deixou de existir.
- **Pré-postagem de verdade** (`src/lib/shipping/cws/prepostagem.ts`): o envio do cliente é logística
  reversa, com o frete pago no site pelo preço do contrato (`src/server/shipping/frete-envio.ts`); a
  retirada ganha etiqueta de saída pelo painel (`src/server/actions/admin/logistica.ts`). O código de
  rastreio nasce nos Correios e a etiqueta é o PDF oficial.
- **Rastreio da entrada e da saída** (`src/lib/shipping/cws/rastro.ts`, job em `src/server/shipping/`), em
  lotes de 50, com avanço automático do envio para "Envio postado" e da retirada para `postada`/`entregue`.

Execução, testes reais e decisões: `docs/EXECUCAO_CORREIOS_CWS.md`. Atalhos que ficaram: RA-59.

## 4. O que fazer agora, na ordem

| # | O que | Quem | Bloqueia? |
|---|---|---|---|
| ~~1~~ | ~~Mercado Pago, `CRON_SECRET`, `AUREA_RELATORIOS_TOKEN`~~ | — | ✅ feito em 18/09 |
| ~~2~~ | ~~Executar a **E8**~~ | — | ✅ feito em 18/09 — ver `execucao-pendencias/relatorios/E8.md` |
| 3 | **Aplicar a migration 030** em produção: `AUREA_DB_SCHEMA=aurea npm run db:migrate` | Você, um comando | Não — sem ela o rastreio da retirada não grava, e o log diz isso |
| 4 | Contrato dos Correios | ✅ 22/10/2026 | — |
| 5 | Funções 3.2 e 3.3 dos Correios | ✅ 22/10/2026 — aplicar a migration 043 em produção | — |
| 6 | WhatsApp | Você decide, Cowork executa | Não |
