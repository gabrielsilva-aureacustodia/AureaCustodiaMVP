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
| **Correios** | ❌ desligado | `CORREIOS_TOKEN`, `CORREIOS_CARTAO_POSTAGEM` | **Contrato comercial** — e falta código, seção 3 |
| **WhatsApp do atendimento** | ❌ desligado | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `WHATSAPP_WEBHOOK_SECRET` | Decisão sua + hospedagem |

> **A diferença que importa.** No WhatsApp, **o código está pronto e só falta a variável**. O
> Correios é o único em que **falta função no código também** — e é isso que a seção 3 explica.
> A aba Integrações não sabe dizer isso: ela só conta variável.

---

## 2. O que acontece hoje, na prática, com os dois desligados

- **Correios:** cotação de frete, etiqueta e rastreio usam o **adaptador determinístico** — os
  números são plausíveis e consistentes, mas **não são reais**. Um código de rastreio gerado hoje
  não existe nos Correios.
- **WhatsApp:** as respostas de `/admin/cs` ficam registradas só no painel; o webhook responde 503.

---

## 3. Correios — o que falta de código, e não só de credencial

Esta é a parte que a aba Integrações não mostra. Ela só sabe dizer "faltam duas variáveis". Mas
mesmo com as duas variáveis em mãos, **três funções não existem** e a integração não fecharia.

### 3.1 O que já está pronto

| Função | Arquivo | O que faz |
|---|---|---|
| Cotação de frete | [`correios.ts:75`](../src/lib/shipping/correios.ts) | Com credencial, chama `api.correios.com.br/preco/v1/nacional` e lê `pcFinal`, `prazoEntrega` e `vlSeguro`. Sem credencial, cai no adaptador determinístico |
| Rastreio de objeto | [`tracking.ts:43`](../src/lib/shipping/tracking.ts) | Com credencial, chama `api.correios.com.br/sro/v1/objetos/{codigo}` e traduz os eventos. Tem cache |
| Etiqueta para impressão | `src/app/api/envios/etiqueta/[protocolo]/route.ts` | Monta a etiqueta em HTML, pronta para imprimir, com a Caixa Postal 7990 e o CEP 30315-970 como destinatário |

Essas três trocam de adaptador sozinhas no instante em que as variáveis existirem. Para elas, é
verdade que "é troca de credencial, não de código".

### 3.2 O que falta — função 1: renovar o token de acesso

**O problema.** O código usa `CORREIOS_TOKEN` como um valor fixo, lido do ambiente e mandado
direto no cabeçalho:

```ts
// src/lib/shipping/correios.ts:88-89
const tokenCorreios = process.env.CORREIOS_TOKEN
const temCredenciais = Boolean(tokenCorreios && process.env.CORREIOS_CARTAO_POSTAGEM)
```

Mas a API CWS dos Correios **não entrega um token permanente**. O que o contrato dá são um
**usuário** e um **código de acesso**; com eles se chama `POST /token/v1/autentica/cartaopostagem`
e recebe-se um token que **vale cerca de 24 horas**.

**O efeito se ligar assim mesmo:** funciona no primeiro dia e para no segundo, com os Correios
devolvendo 401. E o código, ao receber um erro, **cai silenciosamente no adaptador determinístico**
— então ninguém percebe que parou: os fretes continuam aparecendo, errados, e os rastreios
continuam inventados.

**O que precisa existir:** uma função que guarde usuário, código de acesso e cartão de postagem,
peça o token quando não houver um válido em memória, e o renove sozinha antes de expirar. As
variáveis passariam a ser `CORREIOS_USUARIO`, `CORREIOS_CODIGO_ACESSO` e
`CORREIOS_CARTAO_POSTAGEM` — e `CORREIOS_TOKEN` deixaria de fazer sentido como variável de
ambiente.

### 3.3 O que falta — função 2: pré-postagem de verdade

**O problema.** O código de rastreio de cada envio é **inventado**, em dois lugares diferentes:

```ts
// src/lib/shipping/correios.ts:172
export function gerarCodigoRastreioSimulado(modalidade: ModalidadeEnvio): string

// src/server/actions/custody.ts:219
envio.codigoRastreio = 'BR' + Math.floor(400000000 + Math.random() * 99000000) + 'BR'
```

Um código de rastreio real **nasce nos Correios**, quando se registra uma pré-postagem
(`POST /prepostagem/v1/prepostagens`) e eles devolvem o número do objeto. Sem essa chamada, o
rastreio da 3.1 vai consultar um código que não existe — e receber "objeto não encontrado" para
sempre.

**O que precisa existir:** uma função de pré-postagem que mande remetente, destinatário,
dimensões, peso, valor declarado e a declaração de conteúdo, e **grave o código devolvido** no
envio. Só depois disso o rastreio real faz sentido.

### 3.4 O que falta — função 3: rastrear também o que sai

**✅ Resolvido em 18/09/2026 pela E8.** O job passou a acompanhar também a retirada `postada` com
código, e o retrato vai para `aurea.rastreios` com `retirada_id` (migration 030). Falta só **aplicar
a migration em produção** — item 3 da seção 4.

### 3.5 Como a operação funciona até lá

Não está parada. O modo atual é o **balcão**: a etiqueta em HTML é impressa, colada na encomenda e
postada numa agência, pagando no balcão. O que falta é o **faturamento por contrato** e o rastreio
automático. A [`tutoriais/TUTORIAL_CORREIOS_CONTRATO.md`](tutoriais/TUTORIAL_CORREIOS_CONTRATO.md)
descreve esse fluxo e o estado do contrato.

### 3.6 A ordem certa de resolver

1. **Fechar o contrato comercial** (Correios Empresas / API CWS). Só ele produz usuário, código de
   acesso e cartão de postagem. Leva dias, e nada de código adianta antes.
2. **Escrever a função de autenticação** (3.2). Sem ela, as outras duas não têm como chamar a API.
3. **Escrever a pré-postagem** (3.3) e passar a gravar o código real no envio.
4. **A E8 já cobre** o rastreio da saída (3.4).

Os passos 2 e 3 são uma branch de código, com as credenciais em mãos. Estimativa honesta: não dá
para escrever e testar de verdade sem o contrato, porque a API CWS não tem ambiente de teste
aberto — o que se escreve sem credencial só pode ser conferido com dublê.

---

## 4. O que fazer agora, na ordem

| # | O que | Quem | Bloqueia? |
|---|---|---|---|
| ~~1~~ | ~~Mercado Pago, `CRON_SECRET`, `AUREA_RELATORIOS_TOKEN`~~ | — | ✅ feito em 18/09 |
| ~~2~~ | ~~Executar a **E8**~~ | — | ✅ feito em 18/09 — ver `execucao-pendencias/relatorios/E8.md` |
| 3 | **Aplicar a migration 030** em produção: `AUREA_DB_SCHEMA=aurea npm run db:migrate` | Você, um comando | Não — sem ela o rastreio da retirada não grava, e o log diz isso |
| 4 | Contrato dos Correios | Comercial | Não — a operação segue no modo balcão |
| 5 | Funções 3.2 e 3.3 dos Correios | Agente de código, **depois** do contrato | Não |
| 6 | WhatsApp | Você decide, Cowork executa | Não |
