# `src/components/` — a interface

Client Components, organizados **uma subpasta por área da aplicação**.

## Estrutura

| Subpasta | O que sustenta | Usada por |
|---|---|---|
| `providers/` | `AppProvider` (estado + ciclo de 10s) e `ThemeProvider` | **Toda a aplicação** |
| `shell/` | `Sidebar` e `Topbar` — o casco autenticado | `(app)/layout.tsx` |
| `ui/` | `Modal` e `Toast` — primitivos compartilhados | Toda tela que abre modal ou avisa |
| `login/` | `LoginForm` | `app/page.tsx` |
| `market/` | `LotCard`, `BidRow`, `Folder`, `TipoSelector` | **`/mercado` e `/vender`** |
| `sell/` | `CoinPicker`, `SellerBidRow` | `/vender` |
| `account/` | As modais de conta (dados, senha, notificações, depósito) | `/conta` e `/conta/configuracoes` |
| `nft/` | `NftCard` e `Certificate` | `/recibos` e `/recibos/[coinId]` |
| `custody/` | `WizardSteps`, `Timeline`, `PhotoSlot` | `/envios` |
| `charts/` | `LineChart`, `Sparkline` | `/graficos` e subrotas |
| `reports/` | `PeriodTabs` | `/graficos` |
| `relatorios/` | `RelatoriosPainel` — DRE, ledger, auditoria, lançamentos, alíquotas, exportação e Google Sheets. Ver [README próprio](relatorios/README.md) | `/relatorios` (só administradores) |
| `home/` | `HomeStats`, `HomeBlocks` | `/inicio` |
| `svg/` | `CoinArt`, `QrCode` | Recibos, mercado, venda, certificado |

## Os dois componentes que atravessam tudo

### `providers/AppProvider.tsx`

Substitui as globais `state` e `session` do monolito e o ciclo de sincronização de 10
segundos. Entrega três coisas via `useApp()`:

- `state` — o estado como o servidor devolveu na última leitura
- `me` — atalho para `state.users[session]`
- `admin` — decidido no servidor pelo `(app)/layout`; só liga o item "Relatórios" do menu
- `run(fn)` — dispara a Server Action, mostra o toast e relê o estado

**`run()` é o contrato de escrita da UI inteira.** Nenhuma tela chama uma Server Action
diretamente sem passar por ele — é o que garante que toda mutação seja seguida de releitura.

### `svg/CoinArt.tsx`

A arte das moedas. **Motivo novo exige atenção:** os traçados são cópia literal do monolito,
coordenada por coordenada, e qualquer ajuste "de bom gosto" muda a arte de recibos já
emitidos.

⚠️ **Anéis olímpicos não podem aparecer** em arte de moeda — risco de propriedade
intelectual do COB. Vale inclusive para moedas que não são olímpicas.

## Componentes compartilhados entre telas

Estes são os que exigem mais cuidado, porque uma edição atinge duas telas:

| Componente | Compartilhado por | Cuidado |
|---|---|---|
| `market/Folder` | `/mercado` e `/vender` | Puramente apresentacional: **quem controla o que está aberto é a página** |
| `market/TipoSelector` | `/mercado` (dois usos) e `/vender` | A prop `name` precisa ser única na página, senão os dois seletores se desmarcam |
| `account/AccountModals` | `/conta` e `/conta/configuracoes` | Duas telas, um conjunto de modais |
| `ui/Modal`, `ui/Toast` | Todas | Mudança aqui atinge a aplicação inteira |

## Regras desta pasta

1. **Nunca importar `@/server/*`.** O `server-only` faz o build quebrar — a barreira é o
   compilador, não a boa vontade
2. **Componente compartilhado é apresentacional.** Quem tem o estado é a página; duas fontes
   para a mesma resposta fazem a lista discordar do contador ao lado dela
3. **Alvo de toque mínimo: 44px** em qualquer controle
4. **Controle que abre e fecha conteúdo é `<button>`**, com `aria-expanded` — não `<div>`
   com `onClick`
5. Os nomes de classe CSS são os do monolito (`.btn`, `.panel`, `.offer`) e **não viram CSS
   Modules**

## Dívida de acessibilidade conhecida

Dois controles herdados do port **não são operáveis por teclado**: o aceite de termos
(`.terms`, em `/vender`) e o "Sair" (`.logout`, na Topbar). São `<div>`/`<span>` com
`onClick`, sem `role` nem `tabIndex`.

Os componentes novos (`Folder`, `TipoSelector`) já nasceram acessíveis — o que deixou uma
inconsistência dentro da mesma tela. Está na seção 8 de
[`docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`](../../docs/MUDANCAS_MERCADO_MULTI_ATIVO.md).

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `providers/AppProvider.tsx` | **Toda tela autenticada** |
| `ui/Modal.tsx`, `ui/Toast.tsx` | Toda tela que abre modal ou avisa |
| `shell/Topbar.tsx` | O título de todas as telas |
| `market/*` | `/mercado` **e** `/vender` |
| `svg/CoinArt.tsx` | Recibos, certificados, mercado e venda |
