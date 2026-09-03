# `src/server/actions/` — as Server Actions ⚠️

**Superfície protegida.** Todo caminho por onde dinheiro e titularidade de moeda se movem
passa por aqui.

## Por que esta pasta existe

No monolito, estas funções rodavam no navegador: liam a global `state`, conferiam saldo,
mexiam em saldo alheio e gravavam. **Quem abrisse o console comprava de graça** — bastava
reescrever `buyer.balance`.

Aqui o cliente manda apenas **intenção** (quais ids, qual preço, quantas unidades) e **toda
conferência acontece contra o estado do servidor**, dentro de `mutateState()`, que é onde o
banco está travado.

## O molde de toda ação

```
1. sessão válida?          → 'Sessão expirada.'
2. mutateState(): revalida contra o estado REAL e aplica a regra
3. try/catch devolvendo a mensagem de falha de gravação
```

O retorno é sempre `ActionResult`: `{ ok, message?, error?, data? }`. Sucesso mostra
`message`, falha mostra `error`, e ação sem texto não abre aviso nenhum.

## Arquivos

| Arquivo | Ações | O que move |
|---|---|---|
| `auth.ts` | `login`, `logout` | Sessão |
| `account.ts` | `changePassword`, `updatePersonal`, `toggle2FA`, `toggleNotif`, `deposit` | Dados da conta e **saldo** |
| `market.ts` | `buyLot`, `publishBid`, `cancelBid`, `editBid` | **Dinheiro e moedas** — lado da compra |
| `sell.ts` | `publishOffer`, `cancelLot`, `editLot`, `sellToBid` | **Dinheiro e moedas** — lado da venda |
| `custody.ts` | `createProtocol`, `markPosted`, `advanceAnalysis` | Cria moedas e emite recibos |
| `payments.ts` | `iniciarDeposito` | Grava a intenção e abre a cobrança no gateway (frente C) |
| `signup.ts` | `criarContaSimulada` | Conta de demonstração (RA-15, provisória) |
| `contabil.ts` | `registrarLancamentoManual`, `estornarLancamentoManual`, `definirParametroContabil`, `sincronizarGoogleSheets`, `verificarIntegridadeLedger` | **A base contábil** (M4/M7). Só administradores; não passa por `mutateState` — escreve nas tabelas da 003 e na trilha |

## As travas que não podem cair

Cada uma existe por um defeito real, encontrado e corrigido:

| Trava | Onde | Por quê |
|---|---|---|
| **O tipo do lote sai das moedas, nunca do cliente** | `sell.ts`, `publishOffer` | Aceitar o tipo pela requisição permitiria anunciar uma Bandeira de R$ 285 no livro da Direitos Humanos e casá-la com um bid de R$ 450 |
| **Lote misto é recusado** | `sell.ts` | Um lote tem um preço unitário só; misturar ativos venderia a moeda cara pelo preço da barata |
| **A transferência vem antes do dinheiro** | `market.ts`, `sell.ts` | O original movia saldo e só então transferia, ignorando o retorno — gerava compra fantasma |
| **Conferência de dono em cancelar e editar** | `market.ts`, `sell.ts` | O original filtrava só por id: qualquer conta derrubava o anúncio de qualquer outra |
| **Ninguém compra do próprio anúncio** | `market.ts`, `sell.ts` | Queimava comissão contra si mesmo e inflava o histórico com volume que não existiu |
| **`isNegociavel` no servidor** | `market.ts`, `sell.ts` | O seletor da tela só lista tipos negociáveis, mas a ação é um endpoint HTTP |
| **`Number.isFinite` antes de qualquer conta** | `account.ts`, `deposit` | `Infinity` somado ao saldo o transformaria em `Infinity`, e daí em `null` na serialização |

## O que quebra se você mexer aqui

**Mudar a assinatura de uma ação quebra a tela que a chama**, em tempo de compilação — o
TypeScript aponta. O que ele **não** aponta:

- Remover uma trava da tabela acima. O build passa, os testes passam, e a porta fica aberta
- Mudar o **texto** de uma mensagem. Os textos são cópia literal dos toasts do monolito

## Quem chama estas ações

| Ação | Chamada por |
|---|---|
| `auth.ts` | `components/login/LoginForm.tsx`, `components/shell/Sidebar.tsx` |
| `account.ts` | `components/account/AccountModals.tsx`, `app/(app)/conta/` |
| `market.ts` | `app/(app)/mercado/page.tsx` |
| `sell.ts` | `app/(app)/vender/page.tsx` |
| `custody.ts` | `app/(app)/envios/page.tsx` |
| `contabil.ts` | `components/relatorios/RelatoriosPainel.tsx` |

## Antes de editar

1. Um arquivo `'use server'` **só pode exportar funções assíncronas** — nada de tipos ou
   constantes exportadas
2. A regra de negócio de verdade mora em `src/domain/`. Esta pasta **orquestra**, não
   calcula
3. Se a mudança tocar `domain/market.ts` ou `fees.ts`, **pare e confirme com os sócios**
4. `npm test` verde antes de commitar — os 38 testes cobrem a regra que estas ações aplicam

## O que muda com o Supabase e o Mercado Pago

- `deposit()` **deixa de existir**: a decisão D9 (liquidação direta) elimina o saldo interno
- As demais passam a abrir transação no Supabase em vez de chamar `mutateState()`
- Casar uma ordem passa a **iniciar uma cobrança**; a moeda só troca de dono quando o
  webhook confirma o pagamento

Ver [`docs/DECISOES_D1_D9_E_PLANO.md`](../../../docs/DECISOES_D1_D9_E_PLANO.md).
