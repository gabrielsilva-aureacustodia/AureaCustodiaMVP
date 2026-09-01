# Leitura do Repositório — RESUMO

**28/08/2026 · commit `8e0f0a5` · primeira leitura**

---

## O que li

Repositório inteiro, do primeiro commit ao atual. 13 commits, 100 arquivos, 12.590 linhas em
`src/`, todos do seu usuário, entre 15 e 19 de agosto.

---

## O que existe hoje

- **13 telas com URL própria**, Next.js 15 + TypeScript
- **Mercado com dois ativos** (Bandeira Olímpica e Direitos Humanos), um livro de ordens
  para cada
- **3 formas de guardar dados** — memória, Redis, Postgres — escolhidas sozinhas por variável
  de ambiente
- **Extrato de conta** com exportação CSV e XLSX
- **Cotação real** de BTC/ETH/USDT
- **Camada de processo versionada:** `CLAUDE.md`, `/commit`, `/publicar` e três documentos em
  `docs/`

---

## O que NÃO existe

| Falta | Consequência |
|---|---|
| Teste automatizado | O motor que decide quem compra de quem não tem rede |
| Configuração de ESLint | `npm run lint` não roda; abre um assistente |
| CI no GitHub | Build e typecheck dependem só de você lembrar |
| Tela de retirada (4.3) | Não há porta de saída para a moeda do cliente |
| Tela de tutoriais com aceite | Foi decidido em 08/07 e nunca foi feito |
| Opção de seguro no envio | Também decidido em 08/07 |

---

## O que achei de errado

| Gravidade | O quê |
|---|---|
| 🔴 **Crítico** | `SESSION_SECRET` pode não existir na Vercel — sem ela, qualquer um entra como qualquer usuário |
| 🔴 **Crítico** | `.env.example` manda usar `aurea-market-v5`; o código está em v6. Se alguém seguir, o mercado mistura as duas moedas em silêncio |
| 🟠 Alto | Contagem de divergências autorizadas está em três números diferentes (2, 5 e 6) |
| 🟠 Alto | Nenhum teste versionado |
| 🟠 Alto | A proteção que impede vazar senha de banco para o navegador é só um comentário |
| 🟠 Alto | A biblioteca `xlsx` vem de um servidor de terceiro, fora do npm. Se ele cair, nenhum deploy funciona |
| 🟡 Médio | Não se sabe se a produção está em Redis ou Postgres |
| 🟡 Médio | Sem ESLint, sem CI |
| 🟡 Médio | A comissão do extrato é recalculada — se a taxa mudar, o extrato muda o passado |
| 🔵 Baixo | Branch `Useful-Data` está órfã e não pode ser mesclada |

**Detalhe de cada um, com passo a passo:** `CRITICAL_DEBUGS.md`

---

## Uma coisa boa que merece registro

O repositório tem uma **autocrítica escrita pelo próprio autor** da última entrega, listando o
que ficou pior e o que faria diferente. Boa parte dos problemas acima eu não descobri: já
estavam escritos. Só virei tarefa. Isso é raro e economiza dias.

---

## O Ritual de Sessão mudou?

**Foi criado hoje**, versão 1.0. Duas coisas nele contrariam o guia antigo:

1. **Não defina `AUREA_STORE_KEY` no `.env.local`.** Deixe ausente ou comentada.
2. Se o `npm install` falhar com erro 403, é o CDN da SheetJS — não é o projeto.

---

## Para hoje

Ver `PRIMEIRAS_ACOES_DO_DIA.md`. São quatro ações, e as duas primeiras não exigem código.
