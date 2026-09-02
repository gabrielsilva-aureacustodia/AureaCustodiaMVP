# `docs/prompts/` — as mensagens de abertura de cada frente

Cada arquivo aqui é um **prompt pronto para copiar e colar** como primeira mensagem de um
chat dedicado a uma frente de trabalho.

| Arquivo | Frente | Branch |
|---|---|---|
| `AGENTE_A_LOGIN_LANDING.md` | Login, cadastro e landing page | `feat/auth-landing` |
| `AGENTE_B_BANCO_BACKEND.md` | Banco de dados e backend | `feat/banco-supabase` |
| `AGENTE_C_PAGAMENTOS_CORREIOS.md` | Mercado Pago e Correios | `feat/pagamentos-correios` |
| `AGENTE_C2_CORRECOES.md` | Correções da frente C apontadas na auditoria de 03/09 (não depende da B) | `feat/pagamentos-correios` |
| `AGENTE_C3_INTEGRACAO.md` | Ligar pagamentos e rastreio ao estado — **só depois do merge da B** | `feat/pagamentos-integracao` |

## Antes de abrir qualquer frente

Leia **[`../FRENTES_PARALELAS.md`](../FRENTES_PARALELAS.md)**. Ele define quem edita o quê,
a ordem de merge e a obrigação que torna o paralelismo possível — a frente B preservar a
assinatura de `getState()` e `mutateState()`.

## Por que os prompts apontam para documentos em vez de repetir o conteúdo

Regra que vale aqui como vale no código: **duas cópias da mesma informação divergem no
primeiro dia em que alguém atualiza só uma.** O prompt diz o que ler e na ordem certa; a
verdade fica num lugar só.

## Ao mudar uma frente

Se o escopo de uma frente mudar, atualize **o prompt e o `FRENTES_PARALELAS.md` juntos** —
prompt que contradiz o contrato é pior que prompt nenhum.
