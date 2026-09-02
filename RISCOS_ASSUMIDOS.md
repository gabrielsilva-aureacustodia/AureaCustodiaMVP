# Riscos assumidos e atalhos tomados

**Documento compilador · raiz do repositório · leitura obrigatória antes de cliente real**

```
Aberto em:     01/09/2026
Atualizado em: 02/09/2026
Autorizado por: Gabriel Silva (sócio)
Regra:         todo atalho registrado aqui E na pasta do arquivo modificado
```

> **Para que serve este documento.** A prioridade declarada é ter o site e a plataforma
> prontos logo, e para isso é aceitável pular etapas de teste e de segurança. A
> contrapartida é que **nada do que foi pulado fica implícito**: cada atalho é registrado
> aqui, e também numa nota dentro da pasta do arquivo afetado.
>
> Atalho não registrado vira defeito esquecido. Este documento responde, numa olhada, "o
> que esta plataforma deve ao próprio rigor?".
>
> **Nada aqui é bug a consertar sem combinar.** São dívidas conscientes, com data e dono.

## Como ler

| Marca | Significa |
|---|---|
| 🔴 **Crítico** | Precisa ser pago **antes do primeiro cliente real** |
| 🟠 **Alto** | Precisa ser pago antes de escalar, ou no primeiro sinal de problema |
| 🟡 **Médio** | Dívida conhecida, sem prazo curto |

## Índice

| ID | Atalho | Grau | Pasta afetada |
|---|---|---|---|
| **RA-01** | Custódia de dinheiro de terceiros sem parecer jurídico | 🔴 | `src/server/actions/`, `src/lib/payments/` |
| **RA-02** | Senhas em texto puro | 🔴 | `src/domain/`, `src/server/actions/` |
| **RA-03** | Sem termos de uso nem política de privacidade | 🔴 | `src/app/` |
| **RA-04** | `src/server/` sem cobertura de teste — **parcialmente pago em 02/09** (`db/` tem 31 testes) | 🟠 | `src/server/actions/`, `session.ts` |
| **RA-05** | Hash do recibo é simulado | 🟠 | `src/domain/` |
| **RA-06** | Comissão do extrato recalculada, não congelada — **metade paga em 02/09** (coluna `fee`) | 🟠 | `src/domain/` |
| **RA-07** | Depósito sem idempotência nem limite de frequência | 🟠 | `src/server/actions/` |
| **RA-08** | Persistência em Redis, sem garantia de concorrência — **pago por construção com `POSTGRES_URL`** | 🟡 | `src/server/store/` |
| **RA-09** | Dois controles não operáveis por teclado | 🟡 | `src/components/` |
| **RA-10** | Recálculos sem memoização | 🟡 | `src/app/`, `src/components/` |
| **RA-11** | Repositório público de propósito | 🟡 | — |
| **RA-12** | Senha do banco Supabase trafegou por chat **e foi commitada em documento** | 🔴 | `docs/` |
| **RA-13** | Atalhos da migração para tabelas (M1): fila única, estado inteiro, extrato, verificação sem Supabase, `store/` mantido | 🟠 | `src/server/db/` |

---

# RA-01 — Custódia de dinheiro de terceiros sem parecer jurídico 🔴

```
Decidido em: 02/09/2026 · REVERTE a decisão D9 de 01/09/2026
Dono:        Gabriel · pendente de discussão com os sócios
Pasta:       src/server/actions/ · src/lib/payments/ (a criar)
```

## O que foi decidido

Em 01/09 a decisão D9 foi **liquidação direta**: o comprador pagaria, o gateway dividiria na
hora, e a plataforma nunca guardaria dinheiro. Isso evitava a questão regulatória por
construção.

Em 02/09 a decisão foi **revertida**, e por um motivo legítimo: a liquidação direta quebrava
a compra instantânea. Um bid parado no livro não pode cobrar antecipadamente, então casar
uma ordem viraria "iniciar uma cobrança" e a moeda só trocaria de dono quando o webhook
confirmasse — um estado intermediário que a plataforma não tem hoje e que muda a experiência
inteira do mercado.

**A decisão nova:** a Áurea **recebe o depósito, guarda o dinheiro na conta dela e depois
distribui ao cliente.** Saldo interno, como o simulado de hoje, mas com dinheiro real.

## O risco que isso assume

Guardar e movimentar dinheiro de terceiros, e liquidar negociações entre clientes com esse
saldo, **pode configurar arranjo ou conta de pagamento** sob a regulação do Banco Central.
É diferente de uma loja que cobra pelos próprios produtos.

**Não é ilegal, e não é impedimento** — é uma pergunta que precisa de resposta escrita de um
advogado, porque a resposta muda a arquitetura e pode implicar obrigações de reporte,
segregação de recursos e até autorização.

Havia uma saída que evitava a pergunta (a liquidação direta), e ela foi conscientemente
trocada por velocidade de entrega e simplicidade de experiência.

## O que precisa acontecer

1. **Parecer jurídico escrito**, antes de o primeiro real entrar. A pergunta ao advogado:
   *"Uma plataforma que recebe depósitos de clientes, mantém saldo em nome deles e liquida
   negociações entre eles usando esse saldo configura arranjo de pagamento ou conta de
   pagamento sob a regulação vigente? Se sim, quais obrigações decorrem?"*
2. **Segregação de recursos:** o dinheiro dos clientes não pode ficar misturado ao caixa
   operacional da empresa. Conta separada, no mínimo.
3. **Reconciliação diária** entre o extrato bancário e o ledger da plataforma.

## Enquanto isso não acontece

O ambiente segue **simulado**: o depósito soma um número, com teto de R$ 100.000, e não há
dinheiro real em lugar nenhum. **A integração com o Mercado Pago não deve ser ligada em
produção antes do parecer.** Construir a integração é seguro; ativá-la com dinheiro real é
o que depende da resposta.

> **Para o Rogério:** hoje é ficha de fliperama — não existe dinheiro de verdade. Quando o
> gateway entrar, a Áurea passa a segurar dinheiro que é dos clientes, e isso é uma
> atividade que o Banco Central regula. Não é proibido; é que precisa de parecer antes,
> porque a resposta pode exigir conta separada e uma série de controles.

---

# RA-02 — Senhas em texto puro 🔴

```
Herdado do MVP · Pasta: src/domain/constants.ts, src/server/actions/auth.ts e account.ts
```

As senhas das sete contas estão em texto puro, tanto em `ACCOUNTS` quanto em `user.pass`.
Não há hash de nenhum tipo.

**Consequência:** quem lê o repositório entra em qualquer conta. Hoje é aceito porque as
contas são fictícias e não há dinheiro real.

**Como se paga:** a migração para **Supabase Auth** (Fase 2) resolve de uma vez — o
Supabase guarda hash e a plataforma deixa de conhecer senha. Se por algum motivo o Supabase
Auth não entrar, o substituto é Argon2id (`@node-rs/argon2`), nunca bcrypt.

**Item 1.2 do Bloco 1** de `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`.

---

# RA-03 — Sem termos de uso nem política de privacidade 🔴

```
Herdado · vira bloqueante com a landing page · Pasta: src/app/
```

O projeto não tem termos de uso com aceite versionado nem política de privacidade.

Enquanto as contas eram sete e fictícias, dava para adiar. **A landing page com cadastro
público muda isso:** cadastrar usuário é coletar dado pessoal, e a LGPD exige finalidade
declarada e base legal.

**Como se paga:** os dois documentos escritos por advogado, mais o registro de **qual versão
foi aceita e quando**, por usuário. O aceite precisa acontecer no cadastro, não depois.

**A landing pode ser construída antes disso. O cadastro não pode ser aberto ao público.**

---

# RA-04 — `src/server/` sem cobertura de teste 🟠

```
Pasta: src/server/
```

Os 38 testes cobrem `src/domain/` — a regra de negócio pura. **A camada de servidor não tem
nenhum:** as Server Actions, o `mutateState`, a sessão e os três adaptadores de persistência
são exercitados só manualmente.

**Por que ficou assim:** o `import 'server-only'` (que fecha a barreira do RA anterior)
impede importar esses módulos numa suíte Node comum. Testar de verdade exige teste de
integração com banco, que é trabalho de outra ordem.

**Consequência:** a regra que essas ações aplicam está testada; a **orquestração** não. Um
erro na ordem das conferências, ou uma trava removida sem querer, passa pelo build e pelos
testes.

**Como se paga:** teste de integração contra o Supabase, na Fase 1, quando o banco já for
real e houver o que apontar.

**Atualização de 02/09/2026 (frente B):** a nova camada `src/server/db/` nasceu com **29
testes** — 16 do planejador de diff e 13 de integração contra um Postgres real embutido
(PGlite), cobrindo migration, semeadura, ida e volta do estado, compra simultânea, envios
simultâneos e o wizard completo. A saída foi separar o único módulo que carrega segredo
(`client.ts`, com `server-only`) da orquestração, que é parametrizada e testável. **Continuam
descobertos:** `session.ts`, `actions/*` e o ramo antigo de `state.ts`/`store/`.

---

# RA-05 — Hash do recibo é simulado 🟠

```
Pasta: src/domain/codes.ts, linha ~23
```

`genHash()` usa `Math.random()`. O recibo NFT exibe um hash com cara de registro on-chain
que **não prova nada**: não é determinístico, não é encadeado, e não se reproduz.

O rótulo "código simulado" no QR é deliberado e não sai — a interface não pode sugerir
verificação externa que não existe.

**Como se paga:** SHA-256 determinístico e encadeado, com a fórmula documentada e congelada
(quais campos, em que ordem, com que separador e normalização). Compartilha implementação
com a trilha de auditoria da Fase 3 e com o hash da estação de validação.

---

# RA-06 — Comissão do extrato recalculada, não congelada 🟠

```
Pasta: src/domain/statement.ts · era o CD-09
```

`statement.ts` chama `tradeFee(t.price)` a cada leitura. O `Trade` não grava a comissão
efetivamente cobrada.

**Consequência:** no dia em que `FEE_PCT` ou `FEE_FIXED` mudarem, **o extrato muda o
passado**. Um extrato impresso hoje e o mesmo extrato impresso depois dirão valores
diferentes para a mesma venda. Numa contestação, os dois são prova e se contradizem.

**Como se paga:** o ledger da Fase 3 resolve naturalmente — o lançamento grava o valor
cobrado no momento e o extrato lê o que foi gravado.

**Atualização de 02/09/2026 (frente B):** a metade que cabe ao banco está paga. `aurea.trades`
tem a coluna `fee`, toda negociação nova entra com a comissão congelada, e `Trade.fee?` a
carrega na leitura. **O extrato ainda recalcula** — ligar `statement.ts` ao campo é a decisão
CD-09, dos sócios. Ver RA-13.c.

---

# RA-07 — Depósito sem idempotência nem limite de frequência 🟠

```
Pasta: src/server/actions/account.ts
```

`deposit()` não tem chave de idempotência nem limite por período — o teto de R$ 100.000 é
**por operação**. A modal desabilita o botão durante o envio, o que resolve o duplo clique,
mas uma requisição repetida processaria de novo.

**Consequência hoje:** nenhuma, é dinheiro simulado entre sete sócios.

**Consequência quando o Mercado Pago entrar:** grave. Todo gateway reenvia webhook — por
timeout, por retentativa, por falha de rede. Sem idempotência, **o mesmo pagamento credita
duas vezes**.

**Como se paga:** tabela de eventos processados com o id do evento do gateway como chave
única. Evento repetido é descartado antes de qualquer efeito. **Não é opcional na Fase 4.**

---

# RA-08 — Persistência em Redis, sem garantia de concorrência 🟡

```
Pasta: src/server/store/ · verificado na Vercel em 01/09/2026
```

A camada ativa em produção é **Redis (Vercel KV)**. Concorrência é "última gravação vence":
duas ações no mesmo segundo podem fazer uma desaparecer em silêncio.

O adaptador Postgres, que resolve com `SELECT … FOR UPDATE`, **já existe e está testado** —
falta só a variável de ambiente.

**Consequência hoje:** irrelevante com sete sócios. **Inaceitável com cliente real.**

**Como se paga:** a Fase 1 (Supabase Postgres) resolve por construção.

**Atualização de 02/09/2026 (frente B):** resolvido por construção quando `POSTGRES_URL` está
definida — `mutateState` passa a rodar em transação com `FOR UPDATE` sobre `aurea.seq`, e
duas compras simultâneas viram uma compra e uma recusa (testado). **Falta confirmar que a
variável está correta na Vercel** e que a produção subiu sobre tabelas — passo do Gabriel
(ver `docs/HANDOFF_FRENTE_B_BANCO.md`). Até lá, sem a variável, a produção continua no Redis.

---

# RA-09 — Dois controles não operáveis por teclado 🟡

```
Pasta: src/components/
```

O aceite de termos (`.terms`, em `/vender`) e o "Sair" (`.logout`, na Topbar) são
`<div>`/`<span>` com `onClick`, sem `role` nem `tabIndex`. **Quem navega por teclado não
consegue acioná-los.**

São herdados do port fiel do monolito. Os componentes criados depois (`Folder`,
`TipoSelector`) já nasceram acessíveis, o que deixou uma inconsistência dentro da mesma
tela.

**Como se paga:** trocar por `<button>` com `aria-*`. É meia hora de trabalho; ficou de fora
porque a regra da época era não refatorar o que não foi pedido.

---

# RA-10 — Recálculos sem memoização 🟡

```
Pasta: src/app/(app)/mercado, src/app/(app)/vender, src/app/(app)/conta/extrato
```

As telas reconstroem agrupamentos e o extrato inteiro a cada render, e o `AppProvider` traz
estado novo a cada 10 segundos. Nenhum está em `useMemo`.

**Consequência hoje:** imperceptível — 7 contas, ~90 moedas, poucas ofertas. **Com centenas
de ofertas, vira lentidão visível.**

**Como se paga:** `useMemo` nos pontos mapeados. Não foi feito porque otimização prematura
esconde mais do que resolve.

---

# RA-11 — Repositório público de propósito 🟡

```
Decisão do Gabriel · reversível a qualquer momento
```

O repositório está **público no GitHub deliberadamente**, para facilitar que agentes
diversos leiam e trabalhem nele sem fricção de autenticação. Gabriel fecha quando as
edições terminarem.

**Consequência:** o `DEV_SECRET` de desenvolvimento está legível, e as senhas de teste do
RA-02 também. Ambos só valem no ambiente de demonstração.

**Não é defeito e não deve ser sinalizado como tal.** Está aqui por completude do
documento, não como pendência.

---

# RA-12 — Senha do banco Supabase trafegou por chat 🔴

```
Ocorrido em: 02/09/2026, durante a configuração do Supabase
Agravado em: 02/09/2026, commit 0a7d517 — a senha ROTACIONADA foi commitada em documento
Dono:        Gabriel
```

> ⚠️ **Agravamento (achado da frente B, 02/09/2026, madrugada).** O documento
> `docs/PROXIMOS_PASSOS_SUPABASE.md` foi commitado (`0a7d517`) e enviado ao GitHub **com a
> senha nova em texto puro**, nas duas connection strings. O repositório é público (RA-11):
> a senha está no histórico do git, acessível a qualquer pessoa, e continuará lá mesmo
> depois de removida do arquivo. A frente B **removeu a senha do documento atual** (o que
> não apaga o histórico) e subiu este risco para 🔴.
>
> **O que precisa acontecer, nesta ordem:** (1) resetar a senha no Supabase com *Generate a
> password*; (2) atualizar `POSTGRES_URL` e `POSTGRES_URL_DIRECT` na Vercel e no `.env.local`;
> (3) redeploy. Reescrever o histórico do git é decisão do Gabriel, não do agente — e não
> resolve: a senha já pode ter sido copiada. A rotação resolve.

**O que aconteceu.** Durante a configuração, a senha do banco foi colada no chat para que eu
pudesse montar as connection strings. Também houve o pedido de guardá-la em documento no
repositório.

**O que NÃO foi feito, e por quê.** A senha **não foi commitada**. O repositório está público
(RA-11): credencial em commit público é varrida por bots em minutos e fica permanente no
histórico do git — remover depois exige reescrever o histórico e ainda assim já foi copiada.
É também o que o `CLAUDE.md` proíbe explicitamente.

O que foi documentado em `docs/referencia/INFRAESTRUTURA_SUPABASE.md` são os parâmetros
públicos: host, porta, usuário, região e qual variável recebe o quê. **Nenhum deles serve
para nada sem a senha.**

**Exposição real:** a senha existe no histórico desta conversa. Não é exposição pública, mas
também não é o lugar de uma credencial de produção.

**Como se paga — trinta segundos:**

1. Supabase → **Settings → Database → Reset database password**
2. **Generate a password**, copiar para o gerenciador de senhas
3. Atualizar `POSTGRES_URL` e `POSTGRES_URL_DIRECT` na Vercel (percent-encoding, se houver
   caractere especial)
4. **Redeploy** — a variável antiga vale até o build seguinte

Fazer isso **depois** que o ambiente estiver estável, para não misturar dois problemas caso
algo falhe.

---

# RA-13 — Atalhos da migração para tabelas (módulo M1) 🟠

```
Decidido em: 02/09/2026 · frente B (banco e backend), branch feat/banco-supabase
Dono:        Gabriel
Pasta:       src/server/db/ — nota local em src/server/db/ATALHOS.md
```

O estado saiu do blob JSON e virou dez tabelas no schema `aurea`, **sem tocar no motor de
casamento e sem mudar a assinatura de `getState()`/`mutateState()`** — a obrigação da frente
B para com as outras duas. Para entregar isso numa sessão, cinco atalhos foram tomados. Cada
um tem nota própria em `src/server/db/ATALHOS.md`; aqui vai o resumo.

| | Atalho | Grau | Como se paga |
|---|---|---|---|
| **a** | **Uma fila de escrita para tudo.** Toda mutação trava a linha única de `seq`; não há trava por livro de ordens | 🟡 | `mutateBook(tipoMoeda, fn)` para as ações de mercado, quando houver volume |
| **b** | **Estado inteiro carregado a cada leitura e escrita** (9 consultas). Os ~30 pontos de leitura em `src/app/` não foram recortados — **por contrato**, essas pastas não são da frente B | 🟡 | Depois do merge das três frentes, seletores por fatia |
| **c** | **Comissão gravada, extrato recalcula.** `trades.fee` existe e é preenchida; `statement.ts` ainda ignora | 🟠 | Uma linha em `statement.ts`, após o "sim" dos sócios (CD-09). Fecha o RA-06 |
| **d** | **Verificado contra Postgres embutido, não contra o Supabase.** A senha local estava desatualizada e o agente não podia aplicá-la. A migration **não foi aplicada em produção** e o `FOR UPDATE` com duas conexões reais não foi exercitado — o Postgres embutido tem uma conexão só e prova o caminho da recusa, não a espera na trava | 🟠 | `npm run db:migrate` e, uma vez, `AUREA_DB_TEST_URL=… npm test` — dois comandos do Gabriel, no passo 4 da Fase 0 de `docs/CUTOVER_BANCO_PRODUCAO.md` |
| **e** | **`src/server/store/` continua no repositório**, como caminho sem `POSTGRES_URL`, e o adaptador de blob em `store/postgres.ts` virou **código morto** | 🟡 | Commit de remoção após a produção rodar sobre tabelas (passo 9 do M1), com prompt em `docs/prompts/AGENTE_B2_POS_PRODUCAO.md` |

**Atualização de 03/09/2026.** Duas correções que mudam o que se faz, não só o que se diz:

- **A documentação chamava o `store/` de "rede de segurança". Estava errado.** Com
  `POSTGRES_URL` definida, o adaptador de blob nunca é selecionado; **remover a variável de
  um deploy que já roda sobre tabelas manda a aplicação para Redis ou memória, não para o
  blob**. O rollback é o "Instant Rollback" da Vercel para o build anterior. Corrigido em
  `src/server/db/README.md`, `src/server/store/README.md` e `src/server/db/ATALHOS.md`.
- **A ordem da virada é migration antes do merge.** A produção já tem `POSTGRES_URL`; o
  deploy novo procura `aurea.seq` na primeira requisição e, sem ela, derruba o site
  inteiro, login incluído. O roteiro está em `docs/CUTOVER_BANCO_PRODUCAO.md`.

O RA-13.d **continua aberto**: `npm run db:check` confirmou em 03/09 que a senha do
`.env.local` segue recusada, então nenhuma consulta desta frente jamais tocou o banco real.

**Consequência hoje:** nenhuma para os sete sócios. **O que muda com cliente real:** (b) vira
gargalo de desempenho e (c) vira contradição em extrato impresso.

**Decisão que precisa de ratificação dos sócios:** `src/domain/types.ts` ganhou o campo
**opcional** `Trade.fee?` — não muda comportamento nenhum, mas `types.ts` é superfície
protegida. A frente B considerou a adição segura (opcional, aditiva, pedida pelo prompt da
frente) e a fez; se os sócios discordarem, é uma linha a reverter.

---

## Onde cada atalho está anotado na própria pasta

| Pasta | Arquivo com a nota |
|---|---|
| `src/domain/` | [`ATALHOS.md`](src/domain/ATALHOS.md) |
| `src/server/` | [`ATALHOS.md`](src/server/ATALHOS.md) |
| `src/server/actions/` | [`ATALHOS.md`](src/server/actions/ATALHOS.md) |
| `src/server/store/` | [`ATALHOS.md`](src/server/store/ATALHOS.md) |
| `src/server/db/` | [`ATALHOS.md`](src/server/db/ATALHOS.md) |
| `src/components/` | [`ATALHOS.md`](src/components/ATALHOS.md) |
| `src/app/` | [`ATALHOS.md`](src/app/ATALHOS.md) |
