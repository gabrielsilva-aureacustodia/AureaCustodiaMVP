# Riscos assumidos e atalhos tomados

**Documento compilador · raiz do repositório · leitura obrigatória antes de cliente real**

```
Aberto em:     01/09/2026
Atualizado em: 06/09/2026
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
| **RA-01** | Custódia de dinheiro de terceiros — **risco assumido em 11/09/2026; gateway liberado para produção** | ✅ | `src/server/actions/`, `src/lib/payments/` |
| **RA-02** | Senhas em texto puro — **pago no fluxo Supabase; resta a contingência do seed** | 🔴 | `src/domain/`, `src/server/actions/` |
| **RA-03** | Sem termos de uso nem política de privacidade — **pago em 13/09/2026** (Termos v1.0, hash canônico, cadeia de aceites, migration 016) | ✅ | `src/app/`, `src/domain/`, `src/server/` |
| **RA-04** | `src/server/` sem cobertura de teste — **parcialmente pago em 02/09** (`db/` tem 31 testes) | 🟠 | `src/server/actions/`, `session.ts` |
| **RA-05** | Hash do recibo é simulado | 🟠 | `src/domain/` |
| **RA-06** | Comissão do extrato congelada nos dois lados — **pago em 13/09/2026** (migration 014 e extrato) | ✅ | `src/domain/`, `src/server/db/` |
| **RA-07** | Depósito sem idempotência — **pago em 03/09** (`aurea.payment_events`); falta o limite de frequência | 🟡 | `src/server/payments/` |
| **RA-08** | Persistência em Redis, sem garantia de concorrência — **pago por construção com `POSTGRES_URL`** | 🟡 | `src/server/store/` |
| **RA-09** | Dois controles não operáveis por teclado | 🟡 | `src/components/` |
| **RA-10** | Recálculos sem memoização | 🟡 | `src/app/`, `src/components/` |
| **RA-11** | Repositório público de propósito | 🟡 | — |
| **RA-12** | Senha do banco Supabase trafegou por chat **e foi commitada em documento** | 🔴 | `docs/` |
| **RA-13** | Atalhos da migração para tabelas (M1): fila única, estado inteiro, extrato, verificação sem Supabase, `store/` mantido | 🟠 | `src/server/db/` |
| **RA-14** | Atalhos da frente C — **a, d e e pagos em 03/09**; restam b e c, que dependem de credencial | 🟡 | `src/lib/payments/`, `src/lib/shipping/`, `src/app/api/` |
| **RA-15** | Cadastro simulado e entrada sem senha — **pago em 06/09/2026** | ✅ | arquivos removidos |
| **RA-16** | Atalhos do ledger, da DRE e dos relatórios (M4/M7): admin por variável, token na URL, sem teste de rota, Sheets não exercitado, ledger desde o seed, custódia com sinal zero, `ajuste` | 🟠 | `src/server/relatorios/`, `src/server/db/`, `src/app/api/relatorios/` |
| **RA-17** | Contingência temporária do login do seed quando o Supabase não está configurado | 🟡 | `src/server/actions/auth.ts`, `src/server/auth/` |
| **RA-18** | Cadastro aberto sem exigir `AUREA_SIGNUP_ENABLED` nem versões legais em variável | 🟡 | `src/server/auth/config.ts` |
| **RA-19** | Contas de demonstração entram pelo catálogo local, sem passar pelo Supabase | 🟠 | `src/domain/constants.ts`, `src/server/actions/auth.ts` |
| **RA-20** | Executável da bancada sem assinatura digital (SmartScreen na 1ª execução) | 🟡 | `estacao/` |
| **RA-21** | Papel único na bancada: quem analisa é quem aprova, sem segregação de função | 🟡 | `src/server/estacao/`, `src/domain/analise.ts` |
| **RA-22** | Endereçamento físico da cápsula como texto digitado, sem estrutura de cofre | 🟡 | `src/server/estacao/`, `estacao/renderer/` |
| **RA-23** | Vídeo não é obrigatório para fechar a análise | 🟡 | `src/app/api/estacao/`, `estacao/main.js` |
| **RA-24** | Compra direta via gateway cobra comissão apenas do vendedor — temporário até B1.4 unificar | 🟡 | `src/server/payments/` |
| **RA-25** | Prazos operacionais provisórios estipulados nos Termos de Uso v1.0 | 🟡 | `src/domain/documentos-legais/`, `src/app/termos/` |
| **RA-26** | SAC provisoriamente operado via e-mail único (`suporte@aureacustodia.com.br`) | 🟡 | `src/app/suporte/`, `src/domain/documentos-legais/` |
| **RA-30** | Gravação de `recebimentos_gateway` fora da transação do estado | 🟡 | `src/server/payments/` |
| **RA-32** | Competência contábil de pagamentos calculada em UTC | 🟡 | `src/domain/custody.ts`, `src/server/payments/` |
| **RA-40** | Painel administrativo: quem está no bootstrap do ambiente entra como `dev`, inclusive quando o banco falha | 🟠 | `src/server/admin/` |
| **RA-41** | Registro de uso sem consentimento de rastreamento, sem prazo de retenção e agregado em memória com teto | 🟡 | `src/server/admin/`, `src/app/api/eventos/` |
| **RA-42** | WhatsApp do atendimento por QR code (Evolution API, não oficial): risco de banimento do número, webhook sem assinatura do corpo, conversas sem prazo de retenção | 🟠 | `src/lib/mensageria/`, `src/app/api/webhooks/whatsapp/` |
| **RA-43** | Conta criada pelo painel com senha provisória, sem segundo fator e sem troca obrigatória; link de redefinição sem tela de nova senha | 🟡 | `src/server/admin/` |
| **RA-44** | Desativar conta bloqueia o login pelo Supabase; a entrada pelo catálogo e a sessão já aberta dependem da checagem da frente A | 🟡 | `src/server/admin/` |
| **RA-45** | Bancada web: sem gravação local nem retomada depois de recarregar a página; linha do painel fora da transação da análise; regra de peso copiada da rota | 🟡 | `src/server/admin/`, `src/components/admin/bancada/` |
| **RA-46** | Taxa e prazo mudados no painel valem na hora, sem aviso prévio; a faixa pede aceite da versão nova sem bloquear operação; publicação do documento em transação separada | 🟠 | `src/server/config/`, `src/server/admin/` |
| **RA-47** | Leitura da configuração que falha cai no padrão do código, sem trava; a compra direta pelo gateway e a análise da estação ainda usam a tabela e o catálogo do código | 🟡 | `src/server/config/` |
| **RA-48** | O e-mail do Gabriel está no código como `dev` do painel em qualquer ambiente, e a entrada `/painel` diz com qual conta a pessoa está | 🟡 | `src/server/admin/`, `src/domain/admin/` |

---

# RA-01 — Custódia de dinheiro de terceiros ✅ ASSUMIDO em 11/09/2026

```
Decidido em: 02/09/2026 · REVERTE a decisão D9 de 01/09/2026
Dono:        Gabriel · pendente de discussão com os sócios
Pasta:       src/server/actions/ · src/lib/payments/
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

## ✅ ENCERRADO em 11/09/2026 — decisão do Gabriel

**O risco foi assumido, e o gateway está liberado para produção.** Gabriel, em 11/09/2026:
*"FECHE O RA-01. JÁ FOI DECIDIDO PERMITIR. Se necessário for vamos colocar mais cláusulas
nos termos e condições."*

O que isso muda em código: `payments.ts` deixou de forçar o endereço de sandbox e voltou a
respeitar a variável `MP_SANDBOX`, que é quem escolhe entre teste e produção. Sandbox segue
sendo o **padrão**; `MP_SANDBOX="false"` liga produção. Isso é configuração de ambiente, não
trava.

**Este item não é mais pré-requisito de nada.** Ele fica registrado porque a decisão foi
tomada com o risco conhecido, e é isso que este arquivo serve para guardar.

## O que continua sendo boa prática, sem travar nada

1. **Segregação de recursos:** o dinheiro dos clientes não deveria ficar misturado ao caixa
   operacional da empresa. Conta separada, no mínimo. É controle interno, e depende da
   operação bancária, não do código.
2. **Reconciliação diária** entre o extrato bancário e o ledger da plataforma. A conciliação
   já existe em `src/server/payments/conciliacao.ts`; o que falta é a rotina de conferir
   contra o extrato do banco.
3. **Cláusulas nos termos** descrevendo a guarda de saldo — o caminho que o próprio Gabriel
   apontou, e que é trabalho do Felipe, não de engenharia.

> **Para o Rogério:** a partir de agora pode entrar dinheiro de verdade. A Áurea vai segurar
> saldo que é dos clientes, o que é uma atividade que o Banco Central regula, e os sócios
> decidiram seguir assim e tratar isso por contrato. A decisão está registrada aqui com a
> data, que é o que permite explicar depois por que foi feita assim.

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

# RA-03 — Termos de uso e política de privacidade ✅ PAGO em 13/09/2026

```
Herdado · Pago em 13/09/2026 pelo Agente A (feat/a3-termos-oficiais)
Pasta: src/app/termos, src/app/privacidade, src/app/taxas, src/app/suporte, src/domain/documentos-legais, src/server/db/migrations/016_documentos_e_aceites.sql
```

O projeto contava com minutas preliminares sem prova formal de aceite e sem a redação jurídica especializada.

**Como foi pago:**
1. A minuta jurídica oficial elaborada pelo advogado (`2026-09-13_minuta_termos_de_uso_v1`) foi integralmente codificada no domínio (`src/domain/documentos-legais/termos-de-uso-v1.ts`), contendo 17 capítulos, direitos, obrigações, prazos e regras do marketplace e da custódia física.
2. A Política de Privacidade (`politica-privacidade-v1.ts`) e a Tabela de Taxas (`tabela-de-taxas-v1.ts`) foram estruturadas no domínio com cálculo dinâmico da operação de R$ 200,00 e menção ao frete dos Correios.
3. Normalização canônica estrita (`canonico.ts`) com hash SHA-256 congelado (`eeffba3c0218116aedc8b559d82003c0584a1060e12d344ce5d74d72be855421`).
4. Cláusula compromissória de arbitragem (Lei 9.307/1996, art. 4º, § 2º) destacada em negrito no corpo do texto (Capítulo 14.4), com aceite específico e opcional (não bloqueia cadastro nem negociação).
5. Prova jurídica formal: tabela imutável `aurea.aceites_documentos` encadeada matematicamente por hash SHA-256 a partir de gênesis com 64 zeros, gravando IP, User-Agent, carimbo temporal ISO-8601 UTC e hash canônico do documento.
6. Páginas públicas dedicadas: `/termos`, `/privacidade`, `/taxas` e `/suporte` (SAC).
7. Folha de comprovante formal auditável e imprimível com CSS `@media print` em `/conta/aceites/[id]`.

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

# RA-06 — Comissão do extrato recalculada, não congelada ✅ PAGO em 13/09/2026 (A1)

```
Pasta: src/domain/statement.ts · era o CD-09
```

`statement.ts` chamava `tradeFee(t.price)` a cada leitura. O `Trade` não gravava a comissão
efetivamente cobrada nos dois lados.

**Consequência anterior:** no dia em que as taxas mudassem, o extrato mudaria o passado.

**✅ ENCERRADO em 13/09/2026 pela Frente A (Agente A, A1):**
- A migration `014_comissao_dois_lados.sql` adicionou as colunas `fee_comprador` e `fee_vendedor`
  em `aurea.trades`, com restrição `fee = fee_comprador + fee_vendedor`.
- `Trade` em `src/domain/types.ts` e `TradeRegistro` em `src/server/db/diff.ts` agora mantêm
  `feeComprador` e `feeVendedor` congeladas.
- `src/domain/statement.ts` lê diretamente `t.feeComprador` e `t.feeVendedor ?? t.fee`, registrando
  a comissão de compra e venda sem nenhum recálculo retroativo.
- CD-09 foi formalmente resolvido.

---

# RA-07 — Depósito sem idempotência nem limite de frequência 🟡

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

**Estado em 03/09/2026 — a idempotência está PAGA.** A tabela `aurea.payment_events` entrou na migration 002, e a reivindicação de um evento é um `INSERT … ON CONFLICT (gateway, event_id) DO NOTHING RETURNING`: quem recebe linha processa, quem não recebe descarta. Há uma segunda trava no crédito, sobre `aurea.payment_intents` (`UPDATE … WHERE status = 'pendente' RETURNING`), para o caso de duas entregas simultâneas. Provado em `src/server/db/payments.test.ts` e `src/server/payments/conciliacao.test.ts`.

**O que continua aberto:** o LIMITE DE FREQUÊNCIA. Não há teto por período nem por saldo acumulado — o teto de R$ 100.000 continua sendo por operação, sem limite de repetição. É uma das quatro perguntas de negócio em aberto (ver `docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md`), e depende de decisão dos sócios, não de código.

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

# RA-14 — Atalhos da frente C (Mercado Pago e Correios) 🟠

```
Módulo:  src/lib/payments/ · src/lib/shipping/ · src/app/api/
Criado:  03/09/2026 (Sessão C-2)
Dono:    Agente C
```

> **Atualização de 03/09/2026 (sessão C-3).** Três dos cinco subitens foram pagos: a
> idempotência passou para o banco (a), o cron ganhou agendamento (d) e o webhook passou a
> responder antes de conciliar (e). Os que continuam abertos são (b) e (c), e os dois
> dependem de credencial, não de código.

Registrado na mesma estrutura dos atalhos das frentes A e B para manter conformidade:

- **RA-14.a — Idempotência em memória — ✅ PAGO em 03/09/2026.** A tabela
  `aurea.payment_events` entrou na migration 002, e a reivindicação é um
  `INSERT … ON CONFLICT (gateway, event_id) DO NOTHING RETURNING`. Quem arbitra é a chave
  primária, não a memória de um processo — que em serverless nasce vazia a cada cold start.
  O adaptador em memória continua existindo para `npm run dev` sem banco, e é escolhido por
  `bancoConfigurado()`. Provado em `src/server/db/payments.test.ts` (reivindicações
  simultâneas, uma só vence) e em `src/server/payments/conciliacao.test.ts` (três entregas,
  um crédito).
- **RA-14.b — Simulador determinístico sem credenciais:** Na ausência de `MP_ACCESS_TOKEN_TEST`
  ou contrato dos Correios, as bibliotecas devolvem respostas simuladas determinísticas para
  manter testes e desenvolvimento local 100% operacionais.
- **RA-14.c — Assinatura de webhook em desenvolvimento:** A assinatura HMAC-SHA256 é
  estritamente validada por padrão; apenas é aceita sem chave se
  `MP_WEBHOOK_ALLOW_UNSIGNED="true"` estiver presente no ambiente de desenvolvimento local.
- **RA-14.d — Cron de rastreio sem agendamento ativo — ✅ PAGO em 03/09/2026.** O bloco
  `crons` entrou no `vercel.json`, a rota lê os envios pendentes de `getState()` e grava em
  `aurea.rastreios`, e a tela de envios lê de lá por `/api/rastreios`. **A cadência é
  DIÁRIA** porque o plano Hobby da Vercel só permite uma execução por dia; com plano Pro, a
  mesma rota aceita cadência maior sem mudar código. Falta o `CRON_SECRET` na Vercel — é
  configuração, não código.
- **RA-14.e — Processamento do webhook antes da resposta — ✅ PAGO em 03/09/2026.** A rota
  responde 200 e concilia dentro de `after()` do `next/server`. Há um fallback deliberado:
  fora do escopo de requisição `after()` LANÇA, e sem a proteção a exceção viraria 500 — que
  é justamente o que faz o Mercado Pago reenviar. No fallback a tarefa roda solta, sem
  `await`.

---
# RA-15 — Cadastro simulado e entrada sem senha ✅ PAGO

```
Criado em: 03/09/2026, a pedido do Gabriel, para poder abrir a plataforma na hora
Dono:      Gabriel
Pasta:     src/app/criar-conta/ · src/app/entrar-demo/ · src/server/actions/signup.ts
Pago em:   06/09/2026, pela frente A (feat/auth-landing)
```

As rotas provisórias `/criar-conta` e `/entrar-demo`, a ação `signup.ts` e o formulário
`SignupForm.tsx` foram removidos. O único cadastro passa a ser `/cadastrar`, com identidade
no Supabase Auth, confirmação por e-mail ou Google OAuth e aceite legal versionado.

| | Atalho | Grau | Como se paga |
|---|---|---|---|
| **a** | `/criar-conta` sem confirmação | ✅ pago | substituído por `/cadastrar` |
| **b** | `/entrar-demo` sem senha | ✅ pago | rota removida |
| **c** | senha do cadastro em texto puro | ✅ pago | credencial passa a viver no Supabase Auth |

O provisionamento de R$ 5.000,00 e seis moedas fictícias foi preservado, mas agora acontece
somente no servidor depois de o Supabase confirmar a identidade. O navegador não escolhe
saldo nem acervo.

---

# RA-17 — Contingência temporária das contas do seed 🟡

```
Decidido em: 06/09/2026
Dono:        Gabriel
Pasta:       src/server/actions/auth.ts · src/server/auth/
```

Enquanto `SUPABASE_URL` e a chave publicável não existirem num ambiente, `/entrar` ainda
aceita as sete contas do seed com a senha histórica. Quando o Supabase está configurado,
esse caminho não roda: senha, cadastro, Google OAuth e troca de senha usam o Auth externo.

O atalho existe para desenvolvimento local e para não bloquear as frentes durante o
rebase. Ele pode ser removido depois que todas as contas dos sócios forem recriadas no
Supabase e todos os ambientes tiverem as variáveis de Auth.

---


# RA-16 — Atalhos do ledger, da DRE e dos relatórios (módulos M4 e M7) 🟠

```
Decidido em: 03/09/2026 · frente B (banco e backend)
Dono:        Gabriel
Pastas:      src/server/relatorios/ (ATALHOS.md) · src/server/db/ (ATALHOS.md, RA-16.e–g)
             src/server/actions/ (ATALHOS.md, RA-16.c) · src/app/ (ATALHOS.md, RA-16.b)
```

O livro-razão, a trilha de auditoria, a DRE e a camada de relatórios entraram numa sessão,
sem tocar em nenhuma Server Action existente e sem mudar a assinatura de `mutateState`. Para
isso, sete atalhos:

| | Atalho | Grau | Como se paga |
|---|---|---|---|
| **a** | **Administrador é quem está em `AUREA_ADMIN_EMAILS`**, ou, sem a variável, as 7 contas do seed. Não há papel de usuário no modelo | 🟠 | O M2 (Supabase Auth) traz identidade com papel; `ehAdmin` passa a ler o banco |
| **b** | **O token de integração viaja na URL** (`?token=`), porque o `IMPORTDATA` do Sheets não manda cabeçalho. Fica visível na fórmula e no log; lê todos os relatórios, inclusive extratos de todas as contas. Só leitura; desligado sem a variável | 🟠 | Rotacionar ao trocar de contador; preferir o push por conta de serviço; ou um token por relatório |
| **c** | **Rotas de `/api/relatorios` sem teste.** Testados: serialização, JWT, regra pura e a gravação do ledger no PGlite | 🟡 | Parametrizar `dados.ts` pelo `Executor` e testar rotas com sessão/token/recusa |
| **d** | **O push para o Google Sheets nunca foi executado contra o Google** (sem conta de serviço no ambiente). JWT provado localmente | 🟡 | Passos 1–5 de `docs/INTEGRACAO_GOOGLE_SHEETS.md` e um clique |
| **e** | **O ledger começa na semeadura**; nada do blob antigo é migrado. `saldo_apos` de linhas do histórico fictício pode ficar negativo no meio | 🟡 | Aceito: a produção recomeça do seed no cutover (RA-08) |
| **f** | **Custódia entra no ledger com sinal zero** — registrada, não debitada, como o extrato já diz | 🟡 | Decisão de negócio: debitar a custódia do saldo |
| **g** | **Saldo alterado por caminho desconhecido vira `ajuste`**, com aviso no log, em vez de exceção. O livro sempre fecha; a linha fica visível para alguém explicar | 🟡 | Manter zero: o relatório `analise` mostra a soma; toda ação nova precisa de fato gerador reconhecido em `derivar.ts` |

> **Atualização de 03/09/2026 (check-up geral).** Parte do **(c)** foi paga: a regra de
> acesso ganhou `src/server/relatorios/acesso.test.ts` (8 testes: `ehAdmin`, token, matriz
> sessão × token) e `/api/admin/conciliacao` — que exigia só sessão — passou a exigir
> administrador, com 4 testes. Continuam sem teste as rotas de `/api/relatorios/*` em si e
> `dados.ts`. Ver `docs/CHECKUP_GERAL_03_09.md`.

> **Atualização de 15/09/2026 (E3).** O arquivo de ações contábeis sem papel foi
> removido (`src/server/actions/contabil.ts`). `acesso.test.ts` deixou de testar a
> versão síncrona antiga e passou a conferir as exportações do módulo e a prioridade
> da sessão. A matriz sessão × chave de integração está em `acesso-painel.test.ts`.

**O que NÃO é atalho:** nenhuma alíquota em código (é requisito do M7); catálogos contábeis
upsertados do domínio (uma fonte só); lançamento manual corrigido por estorno (append-only).

**Meio pagos por esta entrega:** RA-05 (o SHA-256 existe e o ledger o usa; o recibo NFT ainda
usa `genHash()`) e RA-06 (o ledger e a DRE leem a comissão gravada; o extrato da conta ainda
recalcula — CD-09).

**Consequência hoje:** nenhuma para os sete sócios. **Com cliente real:** (a) e (b) viram
controle de acesso de verdade; (f) vira receita não cobrada.

> **Para o Rogério:** a plataforma ganhou um livro-caixa que ninguém edita sem deixar marca,
> e uma DRE que nasce dele. O que falta é de cadastro — quem pode ver, e a planilha do
> contador — e uma decisão: se a taxa de custódia passa a ser descontada do saldo.

---

## Onde cada atalho está anotado na própria pasta

| Pasta | Arquivo com a nota |
|---|---|
| `src/domain/` | [`ATALHOS.md`](src/domain/ATALHOS.md) |
| `src/server/` | [`ATALHOS.md`](src/server/ATALHOS.md) |
| `src/server/actions/` | [`ATALHOS.md`](src/server/actions/ATALHOS.md) |
| `src/server/store/` | [`ATALHOS.md`](src/server/store/ATALHOS.md) |
| `src/server/db/` | [`ATALHOS.md`](src/server/db/ATALHOS.md) |
| `src/server/relatorios/` | [`ATALHOS.md`](src/server/relatorios/ATALHOS.md) |
| `src/components/` | [`ATALHOS.md`](src/components/ATALHOS.md) |
| `src/app/` | [`ATALHOS.md`](src/app/ATALHOS.md) |
| `src/lib/payments/` | [`ATALHOS.md`](src/lib/payments/ATALHOS.md) |
| `src/lib/shipping/` | [`ATALHOS.md`](src/lib/shipping/ATALHOS.md) |
| `src/server/admin/` | [`ATALHOS.md`](src/server/admin/ATALHOS.md) |
| `src/app/api/eventos/` | [`ATALHOS.md`](src/app/api/eventos/ATALHOS.md) |
| `src/lib/mensageria/` | [`ATALHOS.md`](src/lib/mensageria/ATALHOS.md) |
| `src/server/config/` | [`ATALHOS.md`](src/server/config/ATALHOS.md) |
| `src/components/admin/bancada/` | [`ATALHOS.md`](src/components/admin/bancada/ATALHOS.md) |

# RA-18 — Cadastro aberto por padrão 🟡

O cadastro exigia três variáveis para abrir: `AUREA_SIGNUP_ENABLED=true`,
`AUREA_TERMS_VERSION` e `AUREA_PRIVACY_VERSION`. Faltando qualquer uma, a tela
`/cadastrar` mostrava "Cadastro temporariamente fechado" e a Server Action recusava —
foi o que aconteceu em produção em 06/09/2026, derrubando a função que era a mais
urgente do projeto.

Decisão do Gabriel na mesma data: em fase de teste, a função se entrega liberada. O
cadastro agora abre sempre que o Supabase Auth existir no ambiente, que é dependência
técnica real e não trava de conformidade. O aceite continua gravado com versão e data,
usando `rascunho-teste-2026-09-06` quando não houver variável.

O que fica em aberto: a coleta de dados pessoais passa a ser possível antes dos
documentos legais revisados. Aceitável enquanto o ambiente tem sete contas de sócios,
sem cliente real. Antes do primeiro cliente real, os documentos precisam estar vigentes
e a versão vigente precisa vir de variável — ver `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`.

# RA-19 — Contas de demonstração entram sem o Supabase 🟠

As contas de `ACCOUNTS`, entre elas a do Rogério em `rogerio@aureacustodia.com.br`,
entram por comparação direta de senha no catálogo local, **antes de qualquer chamada ao
Supabase**. Se a integração de login estiver fora do ar, com chave errada, com o envio de
e-mail no limite ou com o OAuth quebrado, a apresentação do site continua funcionando.

Decisão do Gabriel em 06/09/2026, depois de um dia inteiro em que a integração de login
impediu qualquer demonstração. É rede de segurança de apresentação, não de produção.

O que isso assume: essas senhas estão em texto puro no repositório, que é público — o
mesmo risco já registrado no RA-02 e RA-11, agora valendo também quando o Supabase está
configurado e funcionando. Quem lê o código entra nessas contas.

Antes do primeiro cliente real, `loginDoCatalogoLocal()` sai de `src/server/actions/auth.ts`
e as contas de demonstração são apagadas. Item do Bloco 1 de
`docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`.

# RA-20 — O executável da bancada não é assinado digitalmente 🟡

`AureaEstacao.exe` sai do `electron-builder` sem certificado de assinatura de código. Na
primeira execução em cada notebook, o Windows mostra "O Windows protegeu o computador".
Contorna-se com **Mais informações → Executar assim mesmo**, e o aviso não volta naquela
máquina.

Decisão de 10/09/2026, junto com a entrega da frente E. A bancada tem um ou dois notebooks
e quem opera é sócio. Um certificado custa entre US$ 200 e 400 por ano e exige validação da
empresa — custo e prazo que não se justificam para provar a um sócio que o programa que ele
mandou construir é confiável.

Deixa de valer no dia em que houver operador contratado que não seja sócio. Aí o aviso deixa
de ser inconveniência e vira problema de confiança: a pessoa não tem como distinguir este
programa de um malware, e treinar alguém a ignorar avisos do Windows é treinar a ignorar o
próximo, que pode ser verdadeiro.

Nota em `estacao/ATALHOS.md`.

# RA-21 — Papel único na bancada: quem analisa é quem aprova 🟡

Não há segregação de função na estação. O operador registra o veredito e ele mesmo o
homologa: `analise.aprovador` recebe sempre o mesmo valor de `analise.operador`.

Decisão D7c do Gabriel, em 10/09/2026. São dois sócios operando uma bancada; exigir duas
pessoas para cada moeda transformaria a homologação em gargalo antes de existir fila.

**O conserto já foi barateado.** O campo `aprovador` está na fórmula do hash desde o
primeiro dia, separado do `operador` (ver `CAMPOS_DA_ANALISE` em `src/domain/analise.ts`).
Quando a segregação chegar, o campo passa a receber outro valor e a fórmula não muda —
nenhum recibo emitido é invalidado. Acrescentá-lo depois exigiria recalcular a corrente
inteira e registrar a troca.

Deixa de valer quando houver cliente real e due diligence: segregação de função é a primeira
coisa que auditoria procura em custódia de bem de terceiro. O mesmo conjunto de papéis
também sustenta o registro de quem autorizou um estorno, na frente C — decidir diferente nos
dois lugares cria dois sistemas de permissão.

Nota em `estacao/ATALHOS.md`.

# RA-22 — Endereçamento físico da cápsula é texto digitado 🟡

O endereço da moeda no cofre é um campo de texto (`caixa`) e um número opcional (`posicao`),
ambos digitados pelo operador. Não há validação de que a caixa existe, de que a posição está
livre, nem inventário conferível.

Decisão D7e do Gabriel, em 10/09/2026. A estrutura física hoje é um conjunto de caixinhas de
acrílico rotuladas — o exemplo real é `Caixa EB 001`, onde EB é Entrega da Bandeira. Modelar
prateleira, gaveta e posição antes de existir prateleira seria inventar uma estrutura para
depois descobrir que não é a do cofre.

O formato adotado já cresce: `EB-001` carrega o tipo da moeda no próprio código, então
outros tipos entram como `DH-001` sem virar outro esquema.

O que custa enquanto durar: erro de digitação não é detectado, duas moedas podem ser
gravadas na mesma posição sem que nada acuse, e achar uma cápsula depende de o operador ter
digitado certo.

Deixa de valer quando o cofre tiver estrutura definida — a pergunta está aberta desde
10/09/2026. **Migrar endereçamento depois significa mexer fisicamente em cada cápsula**,
então quanto antes a estrutura existir, mais barato.

Nota em `estacao/ATALHOS.md`.

# RA-23 — O vídeo não é obrigatório para fechar a análise 🟡

`POST /api/estacao/analise/fechar` aceita `caminhoVideo` nulo. É possível fechar um
procedimento sem ter gravado nada.

Decisão de 10/09/2026, e o motivo é que o contrário é pior. Vídeo obrigatório significa que
uma câmera com cabo solto, um balde do Supabase ainda não criado ou uma internet caída
**impedem a moeda de ser analisada** — com a moeda já fora da cápsula, na mesa. A gravação é
prova; a análise é operação. Travar a operação na prova inverte a prioridade.

No lugar da trava, o campo entra no hash: uma análise sem vídeo tem `caminhoVideo` vazio no
texto hasheado, permanentemente e de forma visível. Não dá para alegar depois que o vídeo
existia.

Deixa de valer quando houver cliente real: aí o vídeo faz parte do que foi contratado, e a
ausência dele precisa aparecer como pendência na tela de quem administra — não
necessariamente como trava.

Nota em `estacao/ATALHOS.md`.

---

# RA-24 — Compra direta pelo gateway cobra taxa apenas do vendedor 🟡

```
Pasta: src/server/payments/ · temporário até B1.4
```

Na compra direta de lote do mercado via Pix/cartão pelo gateway (`iniciarCompraDireta`), a
cobrança no gateway repassa o preço anunciado e retém taxa apenas do vendedor ao liquidar. No
mercado interno com saldo em conta, o comprador paga a comissão de compra (A1).

**Consequência:** temporariamente, enquanto o Agente B não concluir B1.4 e unificar o split de
pagamentos com `TAXAS_PADRAO`, compras via gateway cobram comissão apenas do vendedor.

**Como se paga:** Agente B implementa B1.4, alinhando a cobrança do gateway com `TAXAS_PADRAO`
e os 4 lançamentos contábeis.

Nota em `docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md`.

---

# RA-25 — Prazos operacionais provisórios estipulados nos Termos de Uso v1.0 🟡

```
Decidido em: 13/09/2026
Dono:        Gabriel Silva (sócio)
Pasta:       src/domain/documentos-legais/ · src/app/termos/
```

Os Termos de Uso oficiais v1.0 fixam prazos operacionais específicos para a prestação do serviço:
1. Data de vigência: 14/09/2026.
2. Prazo para validação e autenticação física na bancada de custódia (`estacao`): 2 (dois) dias úteis após o recebimento da encomenda.
3. Prazo para emissão e disponibilização do recibo de venda autenticado: até 1 (uma) hora após a confirmação da negociação.
4. Prazo para disponibilização de saldo de depósito em conta de pagamento após compensação bancária: até 2 (dois) dias úteis.

**Consequência:** Esses prazos vinculam contratualmente a sociedade perante os usuários cadastrados. Caso a demanda física na bancada de custódia exceda a capacidade de análise em 2 dias úteis, ou haja atraso operacional na compensação, a plataforma poderá incorrer em descumprimento de SLA contratual.

**Como se paga:** Monitorar a volumetria de recebimentos e análises da bancada de custódia; calibrar os prazos com a equipe jurídica após os primeiros 30 dias de operação comercial real se os prazos precisarem de ajuste de escala.

---

# RA-26 — Canal provisório de SAC exclusivamente por e-mail 🟡

```
Decidido em: 13/09/2026
Dono:        Gabriel Silva (sócio)
Pasta:       src/app/suporte/ · src/domain/documentos-legais/
```

Os Termos de Uso e a página pública `/suporte` disponibilizam o canal de Serviço de Atendimento ao Consumidor (SAC) exclusivamente através do e-mail `suporte@aureacustodia.com.br`, com prazo de resposta estipulado em até 5 (cinco) dias úteis, conforme disposições gerais de proteção ao consumidor.

Canais corporativos de voz (telefone 0800 ou fixo) e WhatsApp oficial ainda estão em processo de contratação e integração de telefonia pela sociedade.

**Consequência:** O atendimento ao usuário fica restrito à comunicação assíncrona por correio eletrônico, exigindo triagem diária e monitoramento manual da caixa postal até a implantação de uma ferramenta integrada de helpdesk.

**Como se paga:** Contratação de linha telefônica institucional / WhatsApp Business verificado e integração do canal de atendimento diretamente ao painel administrativo (Admin C3) ou plataforma omnichannel dedicada.

---

# RA-30 — Gravação de recebimentos_gateway fora da transação do estado 🟡

```
Módulo:     src/server/payments/conciliacao.ts · src/server/payments/recebimentos.ts
Criado em:  14/09/2026 (Finalizações · Frente B · B1)
Dono:       Agente B
```

A gravação detalhada de `aurea.recebimentos_gateway` (valor bruto, valor pago, tarifa do gateway,
valor líquido, parcelas, competência) é executada logo após `mutateState`, fora da trava de
mutação do estado da plataforma.

A inserção é estritamente idempotente (`INSERT INTO aurea.recebimentos_gateway ... ON CONFLICT (payment_id) DO NOTHING`).
Se houver falha de infraestrutura no exato milissegundo entre a conclusão do crédito no estado e
a inserção contábil do gateway, o cliente recebe o crédito mas o lançamento contábil do recebimento
não é gravado.

**Mitigação:** A operação é logada e reprocessável a qualquer momento via evento do gateway
(`paymentId`), sem risco de duplicar o crédito do cliente ou estornar estado já validado.

---

# RA-32 — Competência contábil de pagamentos calculada em UTC 🟡

```
Módulo:     src/domain/custody.ts · src/server/payments/conciliacao.ts
Criado em:  14/09/2026 (Finalizações · Frente B · B1)
Dono:       Agente B
```

A função pura de domínio `competenciaAtual(aprovadoEm)` opera estritamente em tempo universal (UTC).

Como o fuso oficial de Brasília é UTC-3, pagamentos aprovados no gateway entre 21h00 e 23h59 do
último dia de um mês no horário local (ex.: 31 de janeiro às 22h00 em São Paulo) viram 01h00 do dia
1º de fevereiro em UTC, recebendo a competência contábil do mês seguinte (`2026-02`).

**Mitigação:** A plataforma adota UTC unificado para carimbos de tempo, fechamento de faturas e
livro-razão, garantindo consistência matemática e eliminando anomalias de horário de verão ou
fusos regionais brasileiros na auditoria contábil.

---

# RA-40 — Bootstrap do painel administrativo pelo ambiente 🟠

```
Decidido em: 12/09/2026 (plano do Admin, seções 5.3 e 11) · entregue na C1, 14/09/2026
Dono:        Gabriel
Pasta:       src/server/admin/ (ATALHOS.md)
```

O painel `/admin` tem papéis e membros no banco (migration 020), mas **quem está em
`AUREA_ADMIN_EMAILS`** — ou, sem a variável, **nas contas de demonstração de `ACCOUNTS`** —
entra como `dev`, com todas as permissões, sempre que a tabela de membros não conhece o
e-mail. E se a leitura dos papéis **falhar** (migration ainda não aplicada, instabilidade do
banco), vale só esse bootstrap, em vez de a tela cair.

**Por quê:** nada pode trancar o Gabriel fora do painel — nem uma tabela vazia no primeiro
deploy, nem a janela entre publicar o código e rodar `db:migrate`.

**O que isso assume:**

- sem `AUREA_ADMIN_EMAILS`, as contas de demonstração são `dev` no painel. É a mesma regra que
  já decidia quem lia a DRE (RA-16.a), agora com a tela de equipe junto;
- durante uma falha do banco, um e-mail do ambiente que a tela tinha rebaixado volta a entrar
  como `dev` até o banco responder. Só vale para quem está na variável.

**Deixa de valer antes do primeiro cliente real:** `AUREA_ADMIN_EMAILS` com os e-mails reais
da equipe (o que tira as contas de demonstração do bootstrap), a equipe cadastrada na tela
`/admin/equipe`, e as contas de demonstração removidas (RA-19).

> **Para o Rogério:** o painel reconhece a equipe por uma lista cadastrada nele mesmo. Para
> ninguém ficar de fora enquanto essa lista está vazia, quem está na lista da Vercel entra como
> desenvolvedor. Antes de ter cliente, essa lista da Vercel passa a ter só os e-mails de verdade.

# RA-41 — Registro de uso sem consentimento e sem retenção definida 🟡

```
Decidido em: 12/09/2026 (plano do Admin, seção 11) · entregue na C1, 14/09/2026
Dono:        Gabriel
Pastas:      src/server/admin/ (ATALHOS.md) · src/app/api/eventos/ (ATALHOS.md)
```

Desde a C1 a plataforma anota, para quem está logado, cada página aberta e cada clique em
elemento marcado com `data-uso`, em `aurea.eventos_uso` (migration 021). É o que alimenta a
tela de Uso do painel: páginas mais abertas, horário de pico, jornada até a primeira venda.

**Três atalhos juntos:**

| | Atalho | Como se paga |
|---|---|---|
| **a** | **Sem aviso nem consentimento de rastreamento.** É ambiente de teste com contas de sócios | Aviso na política de privacidade e, se o jurídico pedir, opção de recusar, antes de cliente real |
| **b** | **Sem prazo de retenção nem expurgo.** A tabela só cresce | Rotina de expurgo com prazo decidido pelo jurídico (LGPD) — já listada como "fica para depois" no plano do Admin |
| **c** | **A tela agrega em memória**, com teto de 50 mil eventos e 20 mil linhas de trilha por período; passou do teto, ela avisa | Agregar em SQL quando o volume justificar |

**O que já foi feito para diminuir o risco, e não é atalho:** nada de IP, nada de user agent
completo (só a plataforma resumida), caminho sem query string e com identificadores e e-mails
trocados por `[id]`, e o registro nunca interrompe a navegação.

> **Para o Rogério:** o painel passou a contar quais telas os sócios abrem, para entender como a
> plataforma é usada. Não guarda endereço de internet nem o que a pessoa digitou. Antes de ter
> cliente, isso precisa aparecer na política de privacidade, com um prazo para apagar.

# RA-42 — WhatsApp do atendimento por QR code, sem a API oficial 🟠

```
Decidido em: 12/09/2026 (plano do Admin, seções 3 e 11) · entregue na C2, 14/09/2026
Dono:        Gabriel
Pastas:      src/lib/mensageria/ (ATALHOS.md) · src/app/api/webhooks/whatsapp/
```

A caixa de conversas `/admin/cs` fala com o WhatsApp pela **Evolution API**, que conecta o número
lendo um QR code — sem aprovação da Meta, em minutos. Quatro atalhos juntos:

| | Atalho | Como se paga |
|---|---|---|
| **a** | **Integração não oficial.** O WhatsApp não autoriza esse uso; o número pode ser banido se o volume de mensagens disparar ou se muitos contatos denunciarem | Adaptador da API oficial (Meta Cloud API) atrás da mesma interface, `ProvedorMensageria`, sem tocar na tela |
| **b** | **O webhook não tem assinatura do corpo.** A Evolution só manda um cabeçalho: um JWT de 10 minutos assinado com o segredo (`jwt_key`) ou o próprio segredo como Bearer. Quem capturar um cabeçalho válido injeta mensagem falsa dentro da validade (ou para sempre, no modo Bearer) | A API oficial assina cada corpo com HMAC (`X-Hub-Signature-256`); usar o modo `jwt_key` enquanto isso |
| **c** | **Conversas, telefones e notas sem prazo de retenção** nem rotina de expurgo (LGPD) | Prazo decidido pelo jurídico e expurgo, antes de cliente real |
| **d** | **Mídia recebida não é guardada.** O arquivo que o cliente manda só abre no aparelho, a não ser que a Evolution tenha armazenamento próprio ligado | Armazenamento privado (nunca público — regra das etiquetas com endereço) quando o atendimento precisar |

**O que não é atalho:** sem provedor configurado, nada quebra — o adaptador de registro local
mantém a tela e diz, na própria mensagem, que ela ficou só no painel; mensagem reentregue pelo
webhook não duplica (`id_no_provedor` único); estado de entrega nunca anda para trás.

> **Para o Rogério:** o WhatsApp da empresa passa a ser atendido dentro do painel, ao lado da
> ficha do cliente. A ligação é feita por um programa que lê o QR code, como o WhatsApp Web — é
> rápido e barato, mas não é o caminho oficial, e o WhatsApp pode bloquear o número se ele for
> usado para disparo em massa. O caminho oficial entra depois sem refazer a tela.

# RA-43 — Conta criada pelo painel com senha provisória 🟡

```
Decidido em: 12/09/2026 (plano do Admin, seção 11) · entregue na C2, 14/09/2026
Dono:        Gabriel
Pasta:       src/server/admin/ (ATALHOS.md)
```

"Criar conta" e "Redefinir senha" na ficha do usuário podem **definir uma senha provisória**, que o
atendente digita e passa à pessoa. A senha vai direto ao Supabase Auth pela chave de serviço e não
fica gravada na plataforma nem na trilha. O que isso assume:

- **não há segundo fator** nem **troca obrigatória** no primeiro acesso — a senha provisória vale até
  a pessoa trocá-la em Minha conta;
- quem digitou a senha a conhece, e o canal por onde ela é passada fica por conta da equipe;
- o **link de redefinição por e-mail** leva ao callback de login, que autentica a pessoa, mas o site
  ainda não tem a tela "defina sua nova senha" sem pedir a senha atual — o pedido está com a frente A
  (`docs/finalizacoes/PENDENCIAS_AGENTE_C.md`). Até lá, a senha provisória é o caminho que funciona
  inteiro.

**Deixa de valer antes do primeiro cliente real:** troca obrigatória no primeiro acesso, tela de nova
senha no fluxo de recuperação e segundo fator para a equipe.

> **Para o Rogério:** a equipe consegue criar a conta de alguém e dar uma senha inicial, para quem
> não quer se cadastrar sozinho. Antes de ter cliente, o site vai obrigar a pessoa a trocar essa
> senha no primeiro acesso.

# RA-44 — Desativar conta fecha o login pelo Supabase; o resto espera a frente A 🟡

```
Decidido em: 14/09/2026 (C2, na falta de desenho no plano do Admin) · entregue na C2
Dono:        Gabriel
Pasta:       src/server/admin/ (ATALHOS.md)
```

"Desativar conta" na ficha faz duas coisas: **bloqueia a identidade no Supabase Auth** (quem entra
por senha ou Google não entra mais) e **registra quem desativou, quando e por quê** em
`aurea.admin_situacao_contas`. O que ainda passa:

- **as contas do catálogo de demonstração** (RA-19), que entram sem Supabase;
- **a sessão já aberta**: o cookie do app vale até 7 dias e não pergunta de novo;
- **sem `SUPABASE_SERVICE_ROLE_KEY`** no ambiente, só o registro é feito — a tela diz isso.

O dono das portas de entrada (login, callback e casco do app) é a frente A. A função que elas
chamam já existe — `contaDesativada(email)` em `src/server/admin/situacao.ts`, que responde "ativa"
quando o banco falha e para qualquer conta da equipe do painel — e o pedido está em
`docs/finalizacoes/PENDENCIAS_AGENTE_C.md`.

> **Para o Rogério:** desativar uma conta já impede a pessoa de entrar de novo. Quem estiver com o
> site aberto no momento continua dentro até sair; a outra frente de trabalho vai fechar essa porta
> também.
---

# RA-45 — Bancada web: rede estável, sem retomada e sem gravação local 🟡

```
Decidido em: 12/09/2026 (plano do Admin, seção 11) · entregue na C3, 14/09/2026
Dono:        Gabriel
Pastas:      src/server/admin/ (ATALHOS.md) · src/components/admin/bancada/ (ATALHOS.md)
```

A bancada de análise no navegador (`/admin/bancada`) fecha o procedimento pelo mesmo serviço da
estação Electron — `fecharAnalise()` de `src/server/estacao/analise.ts` —, na mesma corrente de
hashes. O que ela **não** faz, e a estação faz:

- **não grava o vídeo em disco antes de subir.** Se a internet cair durante o envio, a cópia fica
  num link "Baixar a gravação" que vale só enquanto a página estiver aberta;
- **não sobrevive a recarregar a página** no meio do procedimento: o que foi digitado se perde
  (a análise não foi gravada, então nada fica pela metade no banco);
- **a linha `admin.bancada.analisar` vai para a trilha depois da análise, em outra transação.** O
  serviço da estação abre a própria transação e não recebe executor de fora. Se o processo cair
  entre os dois passos, a análise fica gravada sem a linha do painel — continua identificada pelo
  `operador` (o e-mail do membro), que entra no hash, e pela trilha derivada do próprio estado.

Duas coisas a mais que valem saber:

- **as regras de peso e de motivo de recusa existem em três lugares** — a rota da estação (sem
  exportação), o programa Electron e `src/domain/admin/bancada.ts`. O teste do painel congela a
  faixa de 1 g a 100 g; mudar uma cópia sem as outras faria as bancadas discordarem;
- **a posição já ocupada só é recusada pela bancada web.** A rota da estação não confere caixas
  (RA-22 continua valendo para ela).

Deixa de valer quando a bancada de verdade usar a web com rede estável comprovada, ou quando a
estação passar a chamar a mesma validação. Para bancada sem rede estável, o `.exe` da pasta
`estacao/`.

> **Para o Rogério:** dá para analisar moeda direto pelo painel, com câmera do computador. Só não
> recarregue a página no meio: o que foi preenchido some. Com internet ruim, use o programa do
> notebook, que guarda tudo antes de enviar.

---

# RA-46 — Taxa e prazo mudados no painel valem na hora 🟠

```
Decidido em: 13/09/2026 (tabela 6 do plano de finalizações) · entregue na C3, 14/09/2026
Dono:        Gabriel
Pastas:      src/server/config/ (ATALHOS.md) · src/server/admin/ (ATALHOS.md)
```

Desde a C3, as taxas (os campos de `TabelaDeTaxas`), o limite de depósito, o ciclo de
sincronização, os prazos dos Termos e os canais de atendimento são editados em
`/admin/configuracao`. Cada mudança grava o valor, uma linha append-only em
`aurea.config_historico` e `admin.config.<grupo>` na trilha — na mesma transação — e publica versão
nova da Tabela de Taxas ou dos Termos. O que isso assume:

- **a taxa nova vale para a próxima operação, sem aviso prévio.** Negociação já feita, plano já
  contratado e retirada já pedida guardam o valor da hora em que aconteceram;
- **a faixa de versão nova no topo do app pede o aceite, mas não bloqueia nada** (decisão do
  Gabriel: nenhuma trava). Quem não aceitar continua operando com a tabela nova;
- **a publicação do documento é da A3 e abre a própria transação.** Se falhar, a taxa já vale e a
  Tabela publicada fica atrasada; a tela mostra "Publicar a versão vigente" até alguém completar;
- **a versão publicada vale a partir do momento da publicação**, mesmo quando a data escrita no
  texto dos Termos é outra.

Deixa de valer com uma regra comercial de antecedência para mudança de taxa (os Termos podem
exigir), se os sócios quiserem uma.

> **Para o Rogério:** mudar a taxa no painel muda a cobrança a partir da próxima operação, e a
> Tabela de Taxas do site ganha versão nova com o valor novo. Os clientes veem um aviso para aceitar,
> mas conseguem continuar usando.

---

# RA-47 — Configuração que não lê cai no padrão do código 🟡

```
Decidido em: 14/09/2026 (C3) · entregue na C3
Dono:        Gabriel
Pasta:       src/server/config/ (ATALHOS.md)
```

`carregarConfiguracaoDoSite()` lê a configuração a cada operação, sem cópia em memória. Se o banco
não responder, ela **devolve o padrão do código** — `TAXAS_PADRAO`, `COIN_TYPES`, `DEPOSITO_MAX` — e
registra o erro no log, em vez de derrubar o mercado. Durante uma falha dessas, uma taxa mudada no
painel deixa de valer até o banco voltar.

E dois pontos ainda leem a tabela e o catálogo do código, porque os arquivos são da frente B e o
painel não os edita:

- **a compra direta de lote pelo gateway** (`src/server/payments/conciliacao.ts`) desconta a
  comissão padrão do vendedor — é o RA-24, que já espera a B1.4;
- **a análise da estação** (`src/server/estacao/analise.ts`) decide se o tipo tem mercado pelo
  catálogo do código ao calcular o valor de entrada da moeda. Tipo novo marcado como negociável no
  painel nasce com o valor do meio da faixa, e não com a mediana, até a frente B passar o catálogo.

Os pedidos estão em `docs/finalizacoes/PENDENCIAS_AGENTE_C.md`.

---

# RA-48 — O e-mail do Gabriel é `dev` do painel pelo código 🟡

```
Decidido em: 14/09/2026 (entrada própria do painel) · entregue no mesmo dia
Dono:        Gabriel
Pastas:      src/server/admin/ (ATALHOS.md) · src/domain/admin/ (src/domain/ATALHOS.md)
```

Com o painel publicado, o Gabriel abriu o link e viu o site do cliente: `/admin` sem sessão ia para
`/entrar`, que depois do login sempre leva a `/inicio`, e o e-mail dele não estava no bootstrap — a
Vercel não lista `AUREA_ADMIN_EMAILS` com ele, e sem a variável só as contas do seed entram. O
guarda mandava a conta para `/inicio` sem aviso.

O que foi feito, e o atalho que isso carrega:

- `EMAILS_FIXOS_DA_EQUIPE` em `src/domain/admin/permissoes.ts` tem `gabriel.silva@aureacustodia.com.br`,
  que entra como `dev` com ou sem a variável. **Quem controla esse e-mail no Supabase Auth controla o
  painel inteiro**; o repositório é público, então a lista é visível. A linha da tabela de membros
  continua valendo sobre ela, inclusive para rebaixar.
- A entrada `/painel` mostra, para a conta logada que não é da equipe, qual é o e-mail — nada além do
  que a própria pessoa digitou.

**Como se paga:** antes de cliente real, o Gabriel cadastrado como membro em `/admin/equipe`, a lista
fixa esvaziada e `AUREA_ADMIN_EMAILS` definida na Vercel com os e-mails da equipe.