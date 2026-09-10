# Relatório do Agente A

**Acumulativo. Uma seção por sessão, a mais recente no topo.**
Responde sempre quatro coisas: o que entrou, o que foi testado e como, o que ficou de
manual, e o que o próximo agente precisa saber (regra 11 do
[`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).

---

# Sessão 1 · Fase 0 — terminologia e vitrine · 10/09/2026

**Branch:** `feat/auth-landing` (ver *O que o próximo precisa saber*).
**Base:** `27040ea`, com typecheck, lint, 192 testes e build verdes antes de qualquer edição.

## 1. O que entrou

### F0.1 — a linguagem que o jurídico proibiu

Trinta e seis trechos de texto visível, em treze arquivos. As trocas que o cliente enxerga:

| Antes | Depois | Onde |
|---|---|---|
| Recibo NFT de Custódia | Recibo de Custódia | título da tela, certificado e PDF |
| Meus recibos NFT | Meus recibos | menu lateral, painel inicial, topo |
| Vender ativo | Vender moeda | menu lateral, painel inicial, topo |
| Ativo em foco | Moeda em foco | mercado |
| Ativo: *(rótulo)* | Moeda: | mercado, vender, certificado, PDF |
| Código do ativo | Código da moeda | certificado, auditoria |
| Moedas tokenizadas | Moedas em custódia | minha conta |
| Ativos à venda / à compra | Moedas à venda / à compra | minha conta |
| Escolha os ativos | Escolha as moedas | vender |
| Todos os ativos exibidos | Todas as moedas exibidas | auditoria |
| `Codigo_Ativo` | `Codigo_Moeda` | coluna da planilha exportada |
| "custódia, **tokenização** e negociação" | "custódia e marketplace" | descrição do site |

**O que NÃO foi tocado, de propósito:**

- **"ativo" como adjetivo** — "Recibos ativos", "Produtos ativos", "Meus anúncios ativos",
  "Conta ativa: Ativo". Ali a palavra quer dizer *em funcionamento*, não *bem patrimonial*.
  Trocar viraria absurdo.
- **A tela de comparações** (`/graficos/comparacoes`) e a legenda dela no topo. Gabriel
  liberou em 10/09/2026: "no caso da BTC (e de toda a página de comparações com o resto do
  mercado) não tem problema você usar esses termos". O que cria enquadramento é a Áurea
  chamar o *próprio* produto de ativo digital — dizer que o Bitcoin é um não é sobre ela.
  Vale notar o contraste na própria tela: "Real Olímpico: **recibo de custódia** com lastro
  físico" ao lado de "BTC: ativo digital escasso".
- **`token` técnico** — `AUREA_RELATORIOS_TOKEN`, `tokens.css`, tokens de OAuth. Outro
  sentido da palavra; renomear quebraria variável de ambiente e o sistema de cores.
- **Os termos de uso e a política de privacidade** — ali "criptoativo" e "investimento"
  aparecem no **posicionamento negativo** ("não é..."), que a seção 1.3 do plano executivo
  exige por escrito.

### F0.2 — os identificadores internos (D-4)

`Nft` → `Recibo`, `NftStatus` → `StatusRecibo`, `Coin.nft` → `Coin.recibo`,
`nextNftCode` → `nextCodigoRecibo`, `downloadNftReceipt` → `baixarReciboPdf`.

Arquivos e pastas movidos com `git mv`, preservando histórico:

```
src/components/nft/            → src/components/recibo/
src/components/nft/NftCard.tsx → src/components/recibo/ReciboCard.tsx
src/lib/pdf/nft-receipt.ts     → src/lib/pdf/recibo-pdf.ts
src/styles/nft.css             → src/styles/recibo.css
```

Classes CSS `.nft-*` → `.recibo-*`. O `@import` do CSS ficou **na mesma posição** dentro de
`globals.css`, e `responsive.css` continua sendo o **último** — a cascata depende disso e foi
conferida linha a linha.

**O prefixo do código do recibo também mudou: `NFT-000042` → `REC-000042`.** Isso não estava
no plano; foi levantado e aprovado pelo Gabriel em 10/09/2026. Era a palavra proibida mais
visível do produto inteiro — aparecia no certificado, no PDF baixado, na tabela de auditoria,
na lista da conta e nos relatórios do contador.

`STORE_KEY` subiu para `aurea-market-v7`.

### F0.3 — o aviso de lacre

> ~~"Envie a moeda em seu lacre original, ou em recipiente/plástico/caixa segura, para
> preservar sua conservação..."~~
>
> **"Envie a moeda em envelope lacrado, para preservar sua conservação até a validação da
> nossa equipe."**

E no topo da auditoria: "Moedas físicas recebidas, ~~lacradas~~ **conferidas** e vinculadas".

### F0.4 — o nome da contraparte sai da vitrine (D-5)

Arquivo novo `src/domain/contraparte.ts`: `codigoContraparte(id)` devolve quatro
hexadecimais do `sha256Hex` que já existia em `domain/hash.ts` — puro, determinístico, sem
I/O. Mais `apelidoVendedor()` e `apelidoComprador()`, que montam `Vendedor #A93F`.

Deriva do **id da oferta**, como a D-5 determinou, e o efeito é desejado: duas ofertas da
mesma pessoa ganham códigos diferentes, então ninguém monta de fora o retrato de quanto um
vendedor tem em estoque ou com que frequência opera.

Cinco pontos corrigidos — **dois não estavam no plano**:

| Arquivo | Situação |
|---|---|
| `components/market/LotCard.tsx` | no plano |
| `components/market/BidRow.tsx` | no plano |
| `app/(app)/mercado/page.tsx` | no plano |
| `components/sell/SellerBidRow.tsx` | **não estava** — o vendedor via o nome de quem ofertou |
| `app/(app)/vender/page.tsx`, modal de venda direta | **não estava** — o mesmo nome, na confirmação |

Quando a oferta é da própria sessão, a tela continua dizendo **"você"**.

### Banco

| Migration | O que faz |
|---|---|
| `005_renomeia_recibos.sql` | `aurea.nfts` → `aurea.recibos`, preservando dados, chaves, índices e a FK. Religa o RLS |
| `006_prefixo_rec.sql` | Reescreve os 149 códigos já gravados, de `NFT-` para `REC-` |

Numeradas 005 e 006 porque a **004 já era do `analise_estacao`** — a bancada, que veio na
`feat/auth-landing`. O plano dizia "migration 004"; estava desatualizado.

## 2. O que foi testado, e como

### Os quatro comandos

```
npm run typecheck   ✓
npm run lint        ✓
npm test            ✓  30 arquivos · 197 testes (192 antes + 5 novos de contraparte.test.ts)
npm run build       ✓  23 páginas, sem warning novo
```

### A varredura de terminologia

```
grep -rn "NFT\|token\|cripto\|ativo digital\|investimento" src/ --include="*.tsx"
```

Nenhuma ocorrência em texto do produto. O que sobrou cai em quatro categorias legítimas:
tela de comparações (liberada), `token` técnico, posicionamento negativo dos termos de uso, e
comentários que **registram** por que a palavra saiu.

### As doze telas, com `npm run dev` no ar

Entrei como `rogeriopena@testeaurea.com.br` e depois como `alex@testeaurea.com.br`, senha
`12345678`. O que cliquei e o que apareceu:

| # | Tela | O que confirmei na tela |
|---|---|---|
| 1 | Início | Menu com "Vender moeda" e "Meus recibos"; os cartões idem |
| 2 | Mercado | `Vendedor #D829`, `#EBE7`, `#A5EB`; `Comprador #938B`, `#4706`, `#1542`, `#46C1`; "Moeda em foco" |
| 3 | Vender | "Colocar moeda à venda", "Escolha as moedas", `Comprador #938B` nas ofertas recebidas |
| 3b | Modal "Vender direto" | Abri clicando no botão: "**Moeda:** Entrega da Bandeira Olímpica" e "**Comprador #938B**" |
| 4 | Meus recibos | `REC-000001` … `REC-000015` |
| 5 | Recibo aberto, `/recibos/RO-000003` | Título "Recibo de Custódia", `REC-000003`, campo "Moeda", "Dados da moeda", "Código da moeda". O rótulo **CÓDIGO SIMULADO** continua lá |
| 6 | Envios, passo 1 | "Envie a moeda em **envelope lacrado**". Na linha do tempo, "recibo de custódia emitido" |
| 7 | Minha conta | "Moedas em custódia", "Moedas à venda", "Moedas à compra", `RO-000029 · REC-000029` |
| 8 | Extrato | Números conferem; **achei aqui o nome da contraparte** — ver seção 3 |
| 9 | Configurações | "Conta ativa: Ativo", "Produtos ativos" — adjetivo, mantidos de propósito |
| 10 | Gráficos | "Moedas em custódia: 149"; tabela de auditoria por tipo |
| 11 | Comparações | "Real Olímpico: recibo de custódia com lastro físico" · "BTC: ativo digital escasso" (liberado) |
| 12 | Auditoria | "recebidas, **conferidas** e vinculadas", coluna **CÓDIGO DA MOEDA**, coluna **RECIBO**, `REC-000153` |

**Console do navegador e log do servidor:** limpos. O único erro registrado é anterior à
migration (`relation "aurea.recibos" does not exist`, no primeiro login antes de eu aplicar a
005). Depois disso, nada.

### O que a Camada 2 quebrou, e por quê

O ponto de parada previa abortar se mais de um teste quebrasse **sem explicação em uma
frase**. Quebraram três, cada um com uma causa só:

1. `db.test.ts` truncava e conferia a tabela pelo nome antigo (`aurea.nfts`), e a lista de
   tabelas esperadas é alfabética — `recibos` teve de mudar de posição.
2. `scripts/db-check.mjs` guarda a mesma lista, e ficou de fora do meu renome porque eu varri
   só `src/`.
3. `analise.test.ts` — `codigoRecibo` é um dos campos da fórmula do hash da análise, então
   trocar `NFT-000042` por `REC-000042` mudou os dois hashes congelados. **Recalculei com
   `node:crypto`**, como o cabeçalho daquele arquivo exige, em vez de copiar a saída do
   código sob teste. A fórmula não mudou; só a entrada.

Nada exigiu RA-24. Nenhum atalho novo foi assumido nesta sessão.

## 3. O que ficou de manual

Em [`PENDENCIAS_MANUAIS_AGENTE_A.md`](PENDENCIAS_MANUAIS_AGENTE_A.md):

- **D-6** 🔴 — endereço real dos Correios. Dono: **Gabriel**. Enquanto não vier, nenhuma
  etiqueta pode ser gerada de verdade, nem para teste.
- **A-2** 🟡 — **o extrato da conta ainda escreve o nome da contraparte**
  (`src/domain/statement.ts:113` e `:131`): "Compra de Rozane", "Venda para Rogério Pena", e
  o mesmo na planilha exportada. A D-5 falou da *vitrine*, e a vitrine está resolvida — mas
  basta concluir uma compra para descobrir quem era o `#D829`. **Não mexi**: é extensão da
  decisão dos sócios, e há argumento honesto dos dois lados, já que o extrato é o registro
  financeiro da própria pessoa. O arquivo registra o meio-termo possível.
- **A-1** ✅ — migrations 005 e 006 aplicadas no Supabase durante a sessão, com autorização.

## 4. O que o próximo agente precisa saber

**1. O trabalho está em `feat/auth-landing`, não na `main`.** O plano mandava trabalhar
direto na `main`, mas a `main` não tem `docs/publish_docs/` nem a bancada de análise física —
as duas vieram nesta branch. Trabalhar na `main` deixaria os cinco arquivos da bancada que
leem `coin.recibo` sem renomear, e o merge depois bateria de frente com a pasta renomeada.
Gabriel faz o merge de `feat/auth-landing` para a `main`.

**2. `STORE_KEY` não zera banco Postgres.** Descobri isso na prática, e a suposição errada
está corrigida em `src/domain/constants.ts`. A chave só reinicia o store **em memória** e o
blob antigo; com Postgres o estado vive em tabelas, e quem faz a troca de formato é a
migration. Subir a versão e esquecer a migration deixa a aplicação lendo um formato que o
banco não tem.

**3. Ordem obrigatória em qualquer ambiente novo:** código primeiro, migration depois.
Aplicar a 005 antes de o código correspondente estar no ar derruba a aplicação inteira,
inclusive o login.

**4. A próxima migration é a 007.** As 004, 005 e 006 estão ocupadas.

**5. Se for renomear qualquer coisa, varra além de `src/`.** `scripts/db-check.mjs` mantém
uma lista de tabelas esperadas de que ninguém lembra.

**6. Para escrever texto do produto:** o filtro não é a palavra, é o **sujeito da frase**. Se
o sujeito é a Áurea, o recibo, a moeda custodiada ou o marketplace, a palavra proibida sai.
Se o sujeito é BTC, ETH, ouro ou bolsa — comparação com o mercado de fora —, ela fica.
