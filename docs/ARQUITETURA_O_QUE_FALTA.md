# Arquitetura — o que ainda falta e o que pode melhorar

**A leitura de quem passou por todo o código depois das três frentes, do ledger e da DRE**

```
Escrito em: 03/09/2026, madrugada, no check-up geral
Base:       main em e612aaa + correções do check-up (ver docs/CHECKUP_GERAL_03_09.md)
Tom:        cada item diz o que existe hoje, por que está assim, o que custa e como se paga.
            Nada aqui é urgente por si só — a urgência está em docs/EXECUCOES_MANUAIS_PENDENTES.md
```

> **Para o Rogério, em uma frase:** a casa está de pé e as paredes são sólidas; o que falta
> é o que se faz depois de morar um mês — trocar o que foi provisório, ligar o que depende
> de terceiros, e decidir quatro ou cinco coisas que só os sócios decidem.

---

# 1. O que está bem resolvido (e não se mexe)

| Decisão | Por que é boa |
|---|---|
| **Três camadas** (`domain` puro → `server` → `app/components`) com `server-only` como barreira de compilador | Regra de negócio testável sem infraestrutura; segredo não vai ao navegador por construção |
| **`mutateState` como único caminho de mutação**, com `FOR UPDATE` numa linha só | Concorrência resolvida por construção, não por disciplina |
| **Gravação por diff**, não por reescrita | Uma compra grava cinco linhas, não um JSON de 100 KB |
| **Ledger derivado do diff**, com hash encadeado, na mesma transação | Não existe saldo alterado sem lançamento; adulteração é detectável |
| **Nada no schema `public`, RLS em tudo** | A API REST automática do Supabase não expõe nada |
| **Idempotência e intenção de depósito como chaves do banco** | Dois webhooks simultâneos não creditam duas vezes, em nenhuma instância |
| **Alíquota nenhuma no código** | Passivo fiscal não nasce de um número digitado por engano |
| **Dinheiro em centavos inteiros**, ponta a ponta | `parseFloat` só existe nas duas bordas (digitação e API dos Correios) |

---

# 2. Provisórios que precisam sair

| # | O quê | Onde | Sai quando |
|---|---|---|---|
| 2.1 | **Login sem senha e cadastro simulado** (RA-15) | ✅ removidos na frente A | Pago em 06/09/2026 |
| 2.2 | **Dois motores atrás da mesma fachada** (`store/` blob + `db/` tabelas) | `src/server/store/`, ramo antigo de `state.ts`, `STORE_KEY` | Sessão B-2, uma semana depois da virada |
| 2.3 | **Blob antigo no banco** (`aurea.aurea_state`) | Supabase | Migration `003_limpeza` na B-2 |
| 2.4 | **Senha em texto puro** (`ACCOUNTS`, `user.pass`) | só contingência local RA-17 | Remover após recriar os sócios no Auth |
| 2.5 | **Contingência de login** | `actions/auth.ts` | Quando as contas dos sócios existirem no Supabase Auth |

---

# 3. Modelo de dados — o que o ledger e o Auth vão pedir

## 3.1 Identidade: e-mail como chave primária

`users.email` é a chave de tudo (moedas, ofertas, negociações, ledger). O Supabase Auth
identifica por UUID. **Não trocar a chave agora** — seria reescrever todas as tabelas e o
domínio. O caminho barato: uma tabela `identidades (auth_uid PK, email UNIQUE REFERENCES
users)` na entrada do M2, e o e-mail continua sendo a chave interna. Troca de e-mail vira
uma operação explícita e auditada, não um `UPDATE` casual.

## 3.2 Papéis: administrador por variável de ambiente

`ehAdmin` lê `AUREA_ADMIN_EMAILS` ou, sem ela, as sete contas do seed (RA-16.a). Funciona
para sete sócios; não funciona com contador, funcionário ou cliente. Com o Auth: coluna
`papel` em `users` (`socio | contador | cliente`), e `ehAdmin` lê o banco.

## 3.3 Depósito sem referência externa

`Deposit` tem só `userEmail`, `valor`, `date`. O ledger grava todo depósito como "Depósito
simulado em conta", mesmo quando veio do gateway — a conciliação gateway × ledger não
consegue distinguir. **Campo opcional `ref?: string` em `Deposit`** (aditivo, como
`Trade.fee?`), preenchido pela conciliação com o `external_reference`. É superfície
protegida (`types.ts`): pede o "sim" do Gabriel, e é uma linha.

## 3.4 Envio sem modalidade nem remetente

`Envio` não guarda PAC/SEDEX nem o endereço de origem. A tela já pergunta os dois e
descarta; a etiqueta (`/api/envios/etiqueta/[protocolo]`) sai com `SEDEX` fixo e um
endereço de remetente **placeholder**. Falta: `modalidade?` e `remetente?` em `Envio` +
migration `004` com as colunas + `createProtocol` recebendo os dois. Idem: `types.ts`.

## 3.5 Cobrança de custódia: registrada, não debitada

Entra no ledger com sinal zero (RA-16.f). É decisão de negócio; quando for "debitar",
vira um lançamento `custodia` com sinal −1 e a DRE já sabe ler.

---

# 4. Desempenho — o que fica caro com volume

| # | Hoje | Custa quando | Como se paga |
|---|---|---|---|
| 4.1 | **Estado inteiro** carregado a cada leitura e escrita — 9 consultas (RA-13.b), inclusive no polling de 10 s de cada conta | Centenas de contas, milhares de moedas | Seletores por fatia (`getUsuario`, `getLivro(tipo)`), e o polling pedindo só o que a tela mostra |
| 4.2 | **Fila única de escrita** — toda mutação trava `aurea.seq` (RA-13.a) | Dezenas de compras por segundo | `mutateBook(tipoMoeda, fn)` para as ações de mercado; o resto continua na fila |
| 4.3 | `structuredClone` + diff por JSON a cada mutação | Estado com dezenas de MB | Diff por versão de linha (`updated_at`) em vez de comparar JSON |
| 4.4 | Polling de 10 s em `/api/state` | Muitas abas abertas | SSE ou `revalidate` curto com ETag; hoje é aceitável |
| 4.5 | **Cron diário** (plano Hobby) | Cliente esperando o rastreio | Plano Pro e `*/6` horas, sem mudar código |

Nenhum dos cinco importa com sete sócios. Todos importam no dia em que houver cliente real.

---

# 5. Pagamentos — o que ainda é frágil

| # | O quê | Risco | Como se paga |
|---|---|---|---|
| 5.1 | Crédito e conclusão da intenção em **transações separadas** (`mutateState` → `concluir`) | Queda entre as duas deixa a intenção em `creditando` com o saldo já creditado; o reenvio do gateway não credita de novo (a intenção não está `pendente`), mas o status fica errado | Um job de reconciliação: intenções `creditando` há mais de 10 min → conferir o ledger e corrigir o status. Ou mover `concluir` para dentro de `mutateState` via `after`-hook no `Executor` |
| 5.2 | `after()` do Next como "fila" | Sem retentativa própria: depende do reenvio do gateway | Aceitável no MVP; com volume, fila (QStash/Vercel Queues) |
| 5.3 | Simulador sem token devolve pagamento com referência própria | O crédito **não** pode ser demonstrado localmente | Fazer o simulador ler a intenção pela referência (`payment_id` anotado) — 20 linhas |
| 5.4 | Sem **limite de frequência** de depósito (metade do RA-07) | Repetir R$ 100 mil sem teto | Decisão D10 → regra em `domain/payments.ts` |
| 5.5 | Saque não existe | — | D10 primeiro |

---

# 6. Testes — o que a suíte prova e o que ela não prova

**Prova bem:** domínio (motor, taxas, DRE, hash, ledger), planejador de diff, camada de
banco contra Postgres embutido (migrations, RLS, semeadura, ida e volta, concorrência de
evento e intenção), conciliação (três entregas, um crédito), webhook (HMAC real, 400, 401),
cron, acesso aos relatórios (novo), conciliação administrativa (novo).

**Não prova:**

| # | Lacuna | Como se paga |
|---|---|---|
| 6.1 | **Server Actions** de mercado, venda, custódia e conta (RA-04) | Parametrizar pelo `Executor` como a camada de banco e rodar contra o PGlite |
| 6.2 | Rotas de `/api/relatorios/*` e `dados.ts` (RA-16.c) — só a autorização está coberta | Testar a rota com sessão/token e `dados.ts` sem banco |
| 6.3 | Espera real no `FOR UPDATE` com duas conexões | `AUREA_DB_TEST_URL` uma vez (bloco 1.4 das execuções manuais) |
| 6.4 | Telas — nenhum teste de componente | Vitest + Testing Library nas três telas com regra (mercado, vender, envios) |
| 6.5 | Ponta a ponta no navegador | Playwright com o simulador; a suíte atual já roda em 6 s, cabe |

**Armadilha registrada:** rodar a suíte com o `npm run dev` de pé mata um worker e o
resumo fica verde com testes a menos. Confira sempre o número de arquivos e testes.

---

# 7. Simplicidade — o que dá para tirar ou juntar

| # | O quê | Situação |
|---|---|---|
| 7.1 | `src/lib/payments/idempotencia.ts`: o seletor `repositorioIdempotencia()` e as funções de conveniência (`tentarRegistrarEvento`, `executarComIdempotencia`…) **só o próprio teste usa** — a rota usa `src/server/payments/repositorios.ts` | Candidatas a remoção junto com o teste, ou manter como utilitário puro. Decidir na C-4 |
| 7.2 | Duas implementações do adaptador de idempotência em memória | **Resolvido no check-up**: o servidor reusa a classe da biblioteca |
| 7.3 | `conciliacao-ledger.ts` (frente C) e o relatório `analise` de `dados.ts` (frente B) se sobrepõem | Unificar: `/api/admin/conciliacao` pode virar mais um relatório de `dados.ts`, com os mesmos três formatos |
| 7.4 | Dois aplicadores de migration (`migrar.ts` para testes, `db-migrate.mjs` para a linha de comando) | Aceito e documentado; a SQL é uma só |
| 7.5 | Três adaptadores de blob (`memory`, `redis`, `postgres`) em `store/` | Saem na B-2; hoje só `memory` roda |
| 7.6 | `docs/` com cinco "relatórios de execução" da frente C e três "o que falta" por frente | Arquivar em `docs/historico/` e deixar um índice; ver 9.2 |

---

# 8. Segurança — além do que já está em RISCOS_ASSUMIDOS

| # | Ponto | Estado |
|---|---|---|
| 8.1 | `/api/admin/conciliacao` só exigia sessão | **Corrigido no check-up** — exige administrador, com teste |
| 8.2 | Token de relatórios na URL (RA-16.b) | Aceito para o `IMPORTDATA`; rotacionar ao trocar de contador |
| 8.3 | `/entrar-demo` (RA-15) | **Removido em 06/09/2026** |
| 8.4 | Sem limite de tentativas no login | Pago no Supabase; resta somente a contingência local RA-17 |
| 8.5 | Sem cabeçalhos de segurança (CSP, HSTS) em `next.config.mjs` | Cinco linhas; entra antes do cliente real |
| 8.6 | Logs com `console.*` e sem correlação | Um logger mínimo com id de requisição, quando houver mais de uma pessoa lendo log |
| 8.7 | Alerta de `ajuste` no ledger só no log | Com cliente real: e-mail ou Slack a cada `ajuste` — é o sinal de que alguma ação mexeu em saldo por caminho desconhecido |

---

# 9. Documentação e processo

## 9.1 O que funciona

README em cada pasta com "o que quebra se você mexer aqui"; `ATALHOS.md` na pasta e
`RISCOS_ASSUMIDOS.md` na raiz, em par; diário append-only. É raro e vale manter.

## 9.2 O que virou ruído

- **Cópias na raiz.** Três vezes documentos de `docs/` foram copiados para a raiz do
  repositório, uma delas desatualizada. Regra: a raiz tem `CLAUDE.md`, `AGENTS.md`,
  `README.md`, `RISCOS_ASSUMIDOS.md` e configuração — nada mais.
- **Relatórios sobrepostos.** `RELATORIO_EXECUCAO_BRANCH_C…`, `RELATORIO_AUDITORIA…`,
  `RELATORIO_FINAL_FRENTE_C…`, `EXECUCAO_BRANCH_C_O_QUE_FALTA`, `EXECUCAO_FINAL_AGENTE_C`
  contam a mesma história cinco vezes. Proposta: `docs/historico/` para os que já cumpriram
  o papel, e `docs/README.md` apontando só para os vivos.
- **Numeração de RA disputada.** Duas frentes em paralelo escolheram "RA-16". Regra: quem
  abre a seção reserva o número no índice **no primeiro commit**, antes de escrever o texto.

---

# 10. A ordem que eu seguiria

1. **Blocos 1 e 2** de `EXECUCOES_MANUAIS_PENDENTES.md` — produção sobre tabelas, frente A
   dentro, provisórios fora.
2. **3.3 e 3.4** (campos `ref` em `Deposit`, `modalidade`/`remetente` em `Envio`) — dois
   campos opcionais, uma migration `004`, e a etiqueta e a conciliação passam a ser
   verdadeiras.
3. **5.1** (reconciliação de intenções presas) e **5.3** (simulador que credita) — fecham
   o ciclo do depósito sem depender do Rogério.
4. **6.1** — testes das Server Actions. É o maior buraco de cobertura e o mais barato de
   fechar com o desenho atual.
5. **B-2**, uma semana depois.
6. **4.x** só quando houver volume. Não antes.
