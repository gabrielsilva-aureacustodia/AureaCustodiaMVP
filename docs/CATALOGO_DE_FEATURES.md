# Catálogo de features — o que foi pedido, o que existe, o que falta

```
Atualizado em: 01/09/2026 · commit base a2b33e4
Escopo:        tudo que o Gabriel pediu desde o início desta frente de trabalho
```

> **Para que serve este documento.** É a lista única do que foi pedido, em que estado está
> e onde mora no código. Substitui a necessidade de reler a conversa para saber se algo já
> foi feito. Cada feature tem **estado**, **onde vive** e **o que ainda falta**.

## Legenda de estado

| Marca | Significa |
|---|---|
| ✅ **Pronto** | Implementado, verificado e em produção |
| 🟡 **Pronto, muda em breve** | Funciona hoje, mas será substituído por decisão já tomada |
| 🔵 **Especificado** | Decidido e documentado, ainda não implementado |
| ⚪ **Aguardando decisão** | Depende de resposta que ainda não veio |

---

# Bloco 1 — Mercado multi-ativo *(entregue)*

## 1.1 ✅ Ofertar várias moedas ao mesmo preço

**Já existia antes do pedido.** O campo "Quantidade a ofertar" seleciona as N primeiras
moedas livres, e o anúncio vira um **lote** que aceita compra parcial.

**Onde vive:** `publishOffer()` em `src/server/actions/sell.ts` · `lotId` em
`src/domain/types.ts` · tela em `src/app/(app)/vender/page.tsx`

## 1.2 ✅ Oferta de compra com execução automática

**Já existia.** `publishBid()` publica e roda o motor em seguida; se houver oferta de venda
igual ou mais barata, a compra acontece na hora.

**Onde vive:** `publishBid()` em `src/server/actions/market.ts` · `matchOrders()` em
`src/domain/market.ts`

## 1.3 ✅ Hierarquia de ordem e ativação automática

**Já existia, e é regra protegida.** Prioridade **preço-tempo**: compras da mais alta para
a mais baixa, vendas da mais barata para a mais cara, empate resolvido por quem publicou
primeiro (`createdAt`).

**O que mudou:** agora vale **dentro de cada tipo de moeda**. Cada ativo tem sua própria
fila; um bid de Direitos Humanos nunca consome uma oferta de Bandeira, por mais barata que
esteja.

**Onde vive:** `matchOrders()` em `src/domain/market.ts` · **coberto por 38 testes** em
`src/domain/market.test.ts`

## 1.4 ✅ Moeda dos Direitos Humanos

R$ 1 de 1998, cinquentenário da Declaração Universal. Bimetálica, 27 mm, 7,84 g, tiragem de
**600.000** — a menor do Plano Real. Segundo ativo negociável da plataforma.

**Valores simulados:** R$ 380 a R$ 520, histórico em torno de R$ 450. Faixa pesquisada em
lojas numismáticas (agosto/2026): ~R$ 350 em MBC, ~R$ 590 em Soberba, ~R$ 600 em FC —
estreitada para o centro porque a plataforma não classifica estado de conservação.

**As sete contas de teste nascem com 1 a 3 delas**, recortadas do total de cada conta — não
somadas, para a faixa da taxa de custódia não mudar.

**Onde vive:** `COIN_TYPES` em `src/domain/constants.ts` · arte em
`src/components/svg/CoinArt.tsx` (globo + figura humana, **sem anéis olímpicos**) · seed em
`src/domain/seed.ts`

## 1.5 ✅ Pastas e seletor de tipo

A lista corrida virou **pastas por categoria** ("Moedas Olímpicas", "Moeda dos Direitos
Humanos"), com um **seletor de tipo** antes — é ele que diz a que moeda o preço unitário se
refere.

Um anúncio continua sendo de **um tipo só**: lote misto é recusado no servidor, porque um
lote tem um preço unitário e misturar ativos venderia a moeda cara pelo preço da barata.

**Onde vive:** `src/components/market/Folder.tsx` · `src/components/market/TipoSelector.tsx`
· `src/components/sell/CoinPicker.tsx` · estilos em `src/styles/market.css`

---

# Bloco 2 — Conta e extrato

## 2.1 🟡 Depósito em conta (simulado)

Botão junto ao saldo em *Minha conta*, teto de R$ 100.000 por operação, aviso de "simulado"
na própria modal.

> ⚠️ **Esta feature será removida.** A decisão **D9** (liquidação direta com split no
> gateway) elimina o conceito de saldo interno — não haverá para onde depositar. Sai na
> Fase 4 do plano, junto com `DEPOSITO_MAX` e a linha "Depósito" do extrato.

**Onde vive:** `deposit()` em `src/server/actions/account.ts` · `ModalDeposito` em
`src/components/account/AccountModals.tsx`

## 2.2 ✅ Extrato da conta com exportação

Rota `/conta/extrato`, com filtros por tipo de movimentação e exportação em **CSV e XLSX**
(o XLSX leva aba de resumo).

Não confundir com a auditoria pública: aquela é o estoque de todas as contas e não leva
dado de proprietário; esta é de uma conta só, com dinheiro, contraparte e comissão à vista.

**Formatos:** CSV é texto puro e não precisa de biblioteca; XLSX reaproveita o SheetJS que a
auditoria já carrega. PDF e XML ficaram de fora — as linhas saem prontas de
`src/domain/statement.ts`, então o caminho está aberto se o contador pedir.

**Onde vive:** `src/domain/statement.ts` · `src/lib/export/statement-export.ts` ·
`src/app/(app)/conta/extrato/page.tsx` · testado em `src/domain/statement.test.ts`

### Limitações escritas na própria tela

Sem elas o extrato *parece* errado a quem for conferir:

- A **taxa de custódia é registrada mas não é debitada** do saldo — não existe ação de
  pagamento no MVP
- A plataforma guarda **apenas a cobrança vigente**, sem histórico de cobranças anteriores
- O **saldo inicial** das contas de demonstração não aparece como depósito

## 2.3 ✅ Credenciais fora da tela de login

**Decisão dos sócios, 01/09/2026.** A tela imprimia os sete e-mails e a senha comum embaixo
do botão "Entrar" — conveniente enquanto só os sócios abriam a página, inaceitável quando a
URL passou a ser mostrada a terceiros.

As credenciais continuam válidas; o que mudou é que não são mais anunciadas.

**Onde vive:** removido de `src/components/login/LoginForm.tsx` · documentado em
`docs/referencia/CONTAS_DE_TESTE.md`

---

# Bloco 3 — Infraestrutura *(entregue nesta frente)*

Não foram pedidas como feature, mas eram pré-requisito para tudo que vem depois.

| # | O quê | Estado |
|---|---|---|
| 3.1 | **38 testes versionados** do motor, extrato, `parsePrice` e seed (Vitest) | ✅ |
| 3.2 | **`server-only`** — import de módulo de servidor em Client Component quebra o build | ✅ |
| 3.3 | **`xlsx` vendorizado** — `npm install` não depende mais de CDN de terceiro | ✅ |
| 3.4 | **ESLint configurado** — `npm run lint` roda sem assistente interativo | ✅ |
| 3.5 | **CI no GitHub Actions** — lint → typecheck → test → build a cada push | ✅ |
| 3.6 | **Produção recusa subir sem `SESSION_SECRET`** em vez de degradar em silêncio | ✅ |

---

# Bloco 4 — O que vem agora *(especificado, não implementado)*

Detalhe completo em [`DECISOES_D1_D9_E_PLANO.md`](DECISOES_D1_D9_E_PLANO.md).

> A **landing page com cadastro** (4.6b) entrou no pedido em 01/09/2026 e depende da Fase 2
> (Supabase Auth) para o cadastro funcionar — a página em si pode vir antes.

## 4.1 🟢 Fundação Supabase — tabelas relacionais

**Entregue em 02/09/2026 na branch `feat/banco-supabase`** (frente B) — ver
[`HANDOFF_FRENTE_B_BANCO.md`](HANDOFF_FRENTE_B_BANCO.md).

O estado saiu do blob JSON único e virou dez tabelas no schema `aurea`. O motor de casamento
**não foi reescrito**: roda dentro da transação sobre o `AppState`, e os 38 testes passaram
sem alteração. `getState()`/`mutateState()` mantiveram a assinatura.

| Critério de aceite | Estado |
|---|---|
| Os 38 testes passam sem alteração | ✅ |
| Duas compras simultâneas da mesma oferta: uma vence, a outra recebe recusa | ✅ testado (PGlite); contra o Supabase real depende do Gabriel |
| Dois envios simultâneos não geram o mesmo `RO-` | ✅ idem |
| O ambiente sobe do zero com o seed | ✅ |
| `npm run build` verde | ✅ |
| Nenhuma tabela em `public` | ✅ testado; `npm run db:migrate` confere |
| Migration aplicada no Supabase e produção sobre tabelas | ⏳ passo do Gabriel |
| Remoção de `src/server/store/` (passo 9) | ⏳ após a produção rodar sobre tabelas |

## 4.2 🔵 Supabase Auth com Google

Google é integração nativa do Supabase Auth. Resolve de uma vez a dívida de senhas em texto
puro.

⚪ **Aguardando decisão:** as sete contas de teste migram ou são recriadas?

## 4.3 🔵 Ledger financeiro e trilha de auditoria

Tabela append-only: nunca se altera linha, corrige-se com lançamento inverso. **Resolve o
CD-09 naturalmente** — o lançamento grava a comissão do momento, e o extrato para de mudar
o passado.

A trilha com hash encadeado **compartilha implementação** com o hash da estação de
validação. Faz-se uma vez, usa-se nos dois lugares.

## 4.4 🔵 Mercado Pago com liquidação direta

O comprador paga, o gateway divide na hora: parte do vendedor para a conta dele, comissão
para a Áurea. **A plataforma nunca guarda o dinheiro.**

Travas inegociáveis: nunca tocar em número de cartão; nunca creditar no retorno da tela
(só no webhook); assinatura de webhook verificada; idempotência por id de evento; fila em
vez de processamento síncrono.

⚪ **Aguardando decisão:** como funciona bid a preço-limite sem saldo interno? Vendedor sem
conta no gateway pode publicar oferta?

## 4.5 🔵 Correios com API oficial

Interface própria em `src/lib/shipping/`. As três restrições do Gabriel viram tipo e
validação:

- **Declarar como moeda colecionável**
- **PAC ou SEDEX** — `type ModalidadeEnvio = 'PAC' | 'SEDEX'`
- **Nunca carta comum** — o regimento dos Correios permite confisco de dinheiro circulável
  em carta, e moeda comemorativa é dinheiro circulável. A trava é de tipo, não de aviso

Rastreio por **agendamento** (cron), nunca por carregamento de página.

## 4.6 🔵 DRE sob Lucro Presumido

Estrutura contábil pronta, **alíquotas como configuração externa**. Mesmo com o regime
decidido, a alíquota efetiva depende de faturamento e muda por lei.

## 4.6b 🔵 Landing page e cadastro de usuário

**Pedido em 01/09/2026.** Hoje a raiz `/` é a tela de login — quem chega no endereço cai
direto num formulário, sem nenhuma explicação do que é a plataforma.

### O que muda de rota

```
/            → landing page (nova, pública)
/entrar      → o login de hoje (movido de /)
/cadastrar   → cadastro (novo)
```

> ⚠️ **Mover a raiz é mudança estrutural.** O `(app)/layout.tsx` redireciona quem não tem
> sessão para `/`, e `page.tsx` redireciona quem tem sessão para `/inicio`. Os dois
> precisam apontar para `/entrar` no mesmo commit, senão o usuário deslogado cai na landing
> em vez do login e o fluxo entra em laço.

### A landing — uma página só

Deliberadamente simples. **O foco é o cadastro**, não a apresentação.

- Logo, nome e uma frase do que é a Áurea Custódia
- Três ou quatro blocos curtos explicando o conceito (custódia física → recibo digital →
  marketplace)
- **Dois botões, como em qualquer plataforma: "Criar conta" e "Entrar"**
- Rodapé com CNPJ e os links legais

A copy é escrita para o Gabriel editar depois — o que importa nesta entrega é a estrutura e
os caminhos funcionando.

### O cadastro

- **Continuar com Google** (Supabase Auth, integração nativa — decisão D4)
- **Cadastro por e-mail com verificação**: a conta nasce sem poder operar; o link no
  e-mail libera
- E-mail transacional para a verificação (Resend, com SPF/DKIM/DMARC em
  `aureacustodia.com.br` — sem isso a mensagem cai em spam, e e-mail de confirmação que não
  chega é cadastro que não acontece)

**Depende da Fase 2** (Supabase Auth). A landing em si pode ser construída antes; o cadastro
funcional, não.

### ⚪ O que trava esta feature, e não é técnico

**Cadastrar usuário é coletar dado pessoal**, e o projeto ainda não tem:

- **Termos de uso com aceite versionado**
- **Política de privacidade**

Já constam como pendência no `CLAUDE.md` e no Bloco 1 de `PRE_LANCAMENTO_CLIENTES_REAIS.md`.
Enquanto as sete contas eram fictícias, dava para adiar. **Uma tela que convida estranhos a
se cadastrarem muda isso**: o aceite precisa existir na hora do cadastro, com registro de
qual versão foi aceita e quando.

Não é impedimento para construir a landing — é impedimento para **abrir o cadastro ao
público**.

### O que eu tenho para escrever a copy

Suficiente para um primeiro rascunho: identidade da empresa (AUREA CUSTODIA LTDA, CNPJ
68.071.452/0001-06, nome fantasia Real Olímpico), o conceito de custódia física com recibo
digital, o marketplace com comissão de 0,5% + R$ 1,00 por moeda, as faixas de custódia
anual, os dois ativos negociáveis, e as logos aprovadas em `/brand/`.

### O que eu **não** tenho, e preciso do Gabriel

| Falta | Por quê importa |
|---|---|
| Texto institucional oficial (missão, promessa) | O que eu escrever é rascunho meu, não a voz da marca |
| ~~Existe seguro?~~ **RESPONDIDO 02/09: haverá seguro.** Falta definir seguradora, cobertura e valores | Posso dizer que o acervo será segurado, mas **não** posso citar seguradora, valor ou percentual até a apólice existir |
| Fotos do cofre ou das instalações | Página de custódia sem imagem do lugar é menos convincente |
| Endereço e canal de atendimento | Rodapé de plataforma financeira costuma exigir |
| Termos de uso e política de privacidade | Bloqueiam o cadastro público (acima) |

**Sobre o seguro em particular:** é a única lacuna que eu me recuso a preencher por conta
própria. Afirmar cobertura que não existe é promessa que a empresa teria de honrar.

## 4.7 ⚪ Estação de validação física

Bloqueada pelas cinco decisões do D7, delegadas a chat próprio. Questionário completo em
[`referencia/QUESTIONARIO_D7_ESTACAO.md`](referencia/QUESTIONARIO_D7_ESTACAO.md).

---

# Dívidas conhecidas que não são feature

Registradas para não parecerem esquecidas. Detalhe na seção 8 de
[`MUDANCAS_MERCADO_MULTI_ATIVO.md`](MUDANCAS_MERCADO_MULTI_ATIVO.md).

| Dívida | Gravidade | Nota |
|---|---|---|
| Extrato não inclui o saldo inicial como linha de abertura | 🔸 | Some quando o ledger entrar (4.3) |
| Comissão do extrato recalculada em vez de congelada | ⚠️ | **CD-09** — resolve com o ledger |
| Aceite de termos e "Sair" não operáveis por teclado | 🔸 | Herdado do port; componentes novos já são acessíveis |
| Recálculos sem memoização nas telas de mercado e venda | 🔸 | Irrelevante na escala atual |
| Depósito sem idempotência nem limite de frequência | 🔸 | Some com a liquidação direta (4.4) |
| `src/server/` sem cobertura de teste | ⚠️ | O `server-only` impede testar em Node comum; exige teste de integração |
