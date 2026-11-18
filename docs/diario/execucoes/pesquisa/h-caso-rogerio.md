# H · Caso do Rogério em produção — leitura somente-leitura (17/11/2026)

## Conclusão (sem rodeio)

**O caso já foi resolvido em produção. Não há nada a executar.** Existe um único candidato — envio `RO-ENV-0036`, fatura do 1º mês `FAT-2026-11-siqueiraro-1794243902765` (R$ 30,00), NFS-e nº 41 (`nfse_emissoes.id = 63`) — e hoje, 17/11/2026:

| O que o Rogério pediu (10a) | Estado em produção | Quando |
|---|---|---|
| Cancelar a nota de R$ 30 | NFS-e nº 41 **`cancelada`** (evento 101101 registrado, motivo "2 — serviço não prestado") | **14/11 22:41** — emitida em 09/11, **mesmo mês** |
| Cancelar o faturamento | Fatura do 1º mês **`cancelada`**; plano `PLC-000012` **`cancelado`** | 14/11 22:40 |
| Devolver os R$ 30 | **Voltaram ao saldo** (ajuste manual em 10/11, trocado em 14/11 pelo estorno oficial da fatura) | 10/11 e 14/11 |
| Cancelar o envio | Envio **desconsiderado** (regra de 3 dias), etapa "Protocolo gerado", 0 moeda aceita | 13/11 06:53 |
| Frete | R$ 41,61 pagos por saldo em 09/11 e **estornados** automaticamente | 13/11 06:53 |
| Etiqueta dos Correios | **Cancelada** (`canceladaEm` gravado) | 13/11 06:53 |

**Conferência do dinheiro:** saldo atual do cliente = R$ 187,30 = soma dos lançamentos do ledger (R$ 187,30). Há **um** estorno de R$ 30 (lançamento 518), e a reversão do ajuste de 10/11 (lançamento 519, −R$ 30) impede que o valor volte duas vezes. `planos_custodia.estornado = 0` (o caminho do estorno de moeda recusada não foi tocado). Nenhuma nota de custódia "de pé" aponta para fatura cancelada (query 8).

**O que isto muda para a frente H:**
1. T7 (`CASO_ROGERIO.md`) deixa de ser "procedimento para o Controle executar" e vira **registro do que já foi feito + a consulta de verificação**. Executar de novo seria, no melhor caso, um no-op — não rodar nada em produção para este caso.
2. O caso é a **melhor fixture** da suíte: números reais, na ordem real (ver a linha do tempo). Cenário obrigatório: `cancelarEnvio` sobre este envio (já desconsiderado + fatura `cancelada` + nota `cancelada`) tem de dar `ok: true` sem mexer em nada.
3. A lacuna que causou o caso é a do código, e está comprovada: o desconsiderado de 3 dias (13/11) devolveu **só o frete**; o 1º mês e a nota ficaram de pé 5 dias, até alguém agir à mão.
4. A ação `admin.fiscal.cancelar_nfse` que aparece no `audit_log` (14/11 22:36) **não existe no código da base 9e21fe1** (procurei em `src/` e no histórico do Git): foi feita por procedimento avulso, fora do repositório. A equipe ainda não tem tela para cancelar nota — o que dá peso ao T4/T5.

---

## Como a leitura foi feita (e o que NÃO foi feito)

- Conexão: `POSTGRES_URL` do `.env.local` da worktree (a URL nunca foi impressa nem gravada).
- Cada consulta numa transação **`BEGIN READ ONLY` … `ROLLBACK`**, na mesma conexão. **Nenhum `SET` de sessão** (o pooler do Supabase vazaria para o site).
- O script que executa vive no scratchpad da sessão, nunca em `src/` nem em `*.test.ts`:
  `C:\Users\Gabriel\AppData\Local\Temp\claude\9c165b7f0c7d6775\f233bfce-e267-469a-8e1e-34fa3428bcf3\scratchpad\ler-producao.cjs`
  — ele recusa qualquer texto que não comece com `SELECT`/`WITH` ou que tenha verbo de escrita ou `SET`.
- Sem Docker. Nada foi escrito em produção.
- **Privacidade:** e-mail só mascarado. Ressalva: o **id da fatura embute um pedaço do e-mail** (`…-siqueiraro-…`); é o identificador de negócio e fica, mas não replique o endereço inteiro. O campo `audit_log.detalhes` guarda o e-mail **completo** em JSON — a consulta 7 já o mascara por `regexp_replace`. Nenhum CPF, endereço ou telefone foi lido.
- Datas em horário de Brasília por `AT TIME ZONE 'America/Sao_Paulo'` (expressão, não `SET`).
- Números de linha citados no texto são os da worktree em 17/11/2026; `envios.ts` já tem edições não commitadas da Execução, então a linha pode andar.

## Como achar candidatos (3 buscas independentes, 1 resultado cada, o mesmo)

| Busca (pedido) | Candidatos |
|---|---|
| `nfse_emissoes`: serviço `custodia`, valor 3000 | **1** — id 63 |
| `envios`: quantidade 15 | **1** — `RO-ENV-0036` |
| `faturas_custodia`: valor 3000 (qualquer origem) | **1** — a fatura `contratacao` do plano `PLC-000012` |

As três apontam para o mesmo e-mail (confirmado: o usuário é o Rogério — `users.name` começa por "Rogério"; 7 envios na conta) e para o mesmo instante (09/11/2026 14:05). **Não há candidato concorrente nem ambiguidade.**

---

## Consultas (copiáveis — só SELECT; rodar dentro de `BEGIN READ ONLY; … ROLLBACK;`)

### 1. A nota

```sql
SELECT n.id, n.chave, n.servico, n.ref_fato,
       left(split_part(n.tomador_email,'@',1),2) || '***@' || split_part(n.tomador_email,'@',2) AS tomador,
       n.valor, n.quantidade_moedas, n.competencia, n.status, n.ambiente, n.serie, n.n_dps,
       n.numero_nfse, (n.chave_acesso IS NOT NULL) AS tem_chave_acesso,
       (n.xml_cancelamento IS NOT NULL) AS tem_xml_cancelamento,
       (n.xml_cancelamento ~ '101101') AS xml_tem_evento_101101,
       to_char(to_timestamp(n.ocorrido_em/1000.0)   AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS ocorrido_em,
       to_char(to_timestamp(n.autorizada_em/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS autorizada_em,
       to_char(to_timestamp(n.cancelada_em/1000.0)  AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS cancelada_em,
       n.motivo_cancelamento, n.tentativas, n.erros
  FROM aurea.nfse_emissoes n
 WHERE n.servico = 'custodia' AND n.valor = 3000
 ORDER BY n.ocorrido_em;
```

### 2. O envio (frete, etiqueta, etapa, moedas aceitas)

```sql
SELECT e.protocolo,
       left(split_part(e.user_email,'@',1),2) || '***@' || split_part(e.user_email,'@',2) AS cliente,
       e.quantidade, e.tipo_moeda, e.origem, e.etapa_atual, e.modalidade_envio, e.primeiro_mes_pago,
       to_char(to_timestamp(e.created_at/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS criado_em,
       e.codigo_rastreio, (e.data_postagem IS NOT NULL) AS tem_data_postagem,
       (e.data_recebimento IS NOT NULL) AS tem_data_recebimento,
       jsonb_array_length(e.codigos_ativos_gerados) AS moedas_aceitas,
       to_char(to_timestamp(e.desconsiderado_em/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS desconsiderado_em,
       e.motivo_desconsideracao,
       e.frete->>'status' AS frete_status, e.frete->>'valorCents' AS frete_valor_cents, e.frete->>'forma' AS frete_forma,
       to_char(to_timestamp((e.frete->>'pagoEm')::bigint/1000.0)      AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS frete_pago_em,
       to_char(to_timestamp((e.frete->>'estornadoEm')::bigint/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS frete_estornado_em,
       left(e.pre_postagem->>'id', 3) || '…' AS pre_postagem_id_inicio,
       e.pre_postagem->>'codigoServico' AS codigo_servico,
       to_char(to_timestamp((e.pre_postagem->>'criadaEm')::bigint/1000.0)    AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS prepostagem_criada_em,
       to_char(to_timestamp((e.pre_postagem->>'canceladaEm')::bigint/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS prepostagem_cancelada_em
  FROM aurea.envios e
 WHERE e.quantidade = 15;           -- ou: WHERE e.protocolo = 'RO-ENV-0036'
```

### 3. Fatura do 1º mês e plano

```sql
SELECT f.id, f.plano_id, f.origem, f.status, f.valor_cents, f.quantidade_moedas, f.competencia, f.forma_pagamento,
       to_char(to_timestamp(f.data_emissao/1000.0)   AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS emitida_em,
       to_char(to_timestamp(f.data_pagamento/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS paga_em,
       f.cobertura_ate,
       p.protocolo_envio, p.status AS plano_status, p.estornado AS plano_estornado
  FROM aurea.faturas_custodia f
  LEFT JOIN aurea.planos_custodia p ON p.id = f.plano_id
 WHERE f.valor_cents = 3000
 ORDER BY f.data_emissao;
```

### 4. Ledger do cliente desde 09/11 e conferência do saldo

```sql
SELECT l.id, to_char(to_timestamp(l.created_at/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS quando,
       l.tipo, l.valor, l.sinal, l.saldo_apos, l.ref_interna, l.descricao
  FROM aurea.ledger_entries l
 WHERE l.user_email = (SELECT user_email FROM aurea.envios WHERE protocolo = 'RO-ENV-0036')
   AND l.created_at >= (extract(epoch from timestamptz '2026-11-09 00:00:00-03') * 1000)::bigint
 ORDER BY l.id;

SELECT split_part(u.name,' ',1) AS primeiro_nome, u.balance AS saldo_atual,
       (SELECT coalesce(sum(l.valor * l.sinal), 0) FROM aurea.ledger_entries l WHERE l.user_email = u.email) AS soma_ledger
  FROM aurea.users u
 WHERE u.email = (SELECT user_email FROM aurea.envios WHERE protocolo = 'RO-ENV-0036');
```

### 5. Trilha de auditoria (e-mail mascarado dentro do JSON)

```sql
SELECT a.id,
       to_char(to_timestamp(a.created_at/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS quando,
       left(a.ator, 2) || '***' AS ator, a.acao, a.entidade, a.entidade_id,
       left(regexp_replace(a.detalhes::text, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+', '***@***', 'g'), 300) AS detalhes
  FROM aurea.audit_log a
 WHERE a.entidade_id IN ('RO-ENV-0036', 'FAT-2026-11-siqueiraro-1794243902765', 'PLC-000012', '63')
    OR a.detalhes::text LIKE '%RO-ENV-0036%'
    OR a.detalhes::text LIKE '%FAT-2026-11-siqueiraro-1794243902765%'
 ORDER BY a.id;
```

### 6. Mesma lacuna em outro cliente? (envio sem moeda aceita, 1º mês não cancelado)

```sql
SELECT e.protocolo,
       left(split_part(e.user_email,'@',1),2) || '***@' || split_part(e.user_email,'@',2) AS cliente,
       e.quantidade, e.etapa_atual,
       to_char(to_timestamp(e.created_at/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS criado_em,
       (e.data_postagem IS NOT NULL) AS tem_data_postagem,
       to_char(to_timestamp(e.desconsiderado_em/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS desconsiderado_em,
       e.frete->>'status' AS frete_status, (e.pre_postagem IS NOT NULL) AS tem_etiqueta,
       f.id AS fatura_1o_mes, f.status AS fatura_status, f.valor_cents, f.forma_pagamento,
       n.id AS nfse_id, n.status AS nfse_status, n.numero_nfse
  FROM aurea.envios e
  LEFT JOIN aurea.planos_custodia p ON p.protocolo_envio = e.protocolo
  LEFT JOIN aurea.faturas_custodia f ON f.plano_id = p.id AND f.origem = 'contratacao'
  LEFT JOIN aurea.nfse_emissoes n ON n.chave = 'custodia:' || f.id
 WHERE e.origem = 'envio_postal'
   AND jsonb_array_length(e.codigos_ativos_gerados) = 0
   AND e.etapa_atual <> 'Recibo emitido'
   AND f.id IS NOT NULL AND f.status <> 'cancelada'
 ORDER BY e.created_at;
```

### 7. Nota "de pé" apontando para fatura cancelada (qualquer cliente)

```sql
SELECT n.id, n.status, n.numero_nfse, n.valor, n.competencia, f.id AS fatura, f.status AS fatura_status
  FROM aurea.nfse_emissoes n
  JOIN aurea.faturas_custodia f ON n.chave = 'custodia:' || f.id
 WHERE f.status = 'cancelada' AND n.status NOT IN ('cancelada', 'cancelando');
```

> Esquema real conferido por `information_schema` antes das consultas: `envios.frete` e `envios.pre_postagem` são `jsonb`; `faturas_custodia` tem `plano_id`, `origem`, `cobertura_ate`; `planos_custodia.protocolo_envio`, `estornado`; `nfse_emissoes.cancelada_em`, `motivo_cancelamento`, `xml_cancelamento`; `users` usa `name` e `balance` (não há `nome`/`saldo`).

---

## Resultado (dados de produção em 17/11/2026, e-mail mascarado `si***@gmail.com`)

### Nota (consulta 1)

| Campo | Valor |
|---|---|
| `nfse_emissoes.id` | 63 |
| `chave` / `ref_fato` | `custodia:FAT-2026-11-siqueiraro-1794243902765` |
| valor · moedas | 3000 centavos · 15 |
| competência · ambiente | 2026-11-09 · **producao** (nota real, não de teste) |
| série · DPS · **nº da nota** | 1 · 38 · **41** (tem chave de acesso) |
| status | **`cancelada`** |
| ocorrido / autorizada em | 09/11 14:05 / 09/11 14:05 (autorizada no mesmo minuto, tentativa 1) |
| cancelada em | **14/11 22:41** (`xml_cancelamento` presente, contém o evento 101101) |
| motivo gravado | `2\|Custodia FAT-…-1794243902765 cobrada por envio que nao foi postado: valor devolvido ao saldo do cliente, servico nao prestado` |
| erros | nenhum |

### Envio (consulta 2)

| Campo | Valor |
|---|---|
| protocolo | `RO-ENV-0036` — 15 × "Entrega da Bandeira Olímpica", PAC, `origem = envio_postal` |
| criado em | 09/11 14:05 |
| etapa atual | **Protocolo gerado** (nunca chegou a postado nem a recebido) |
| `data_postagem` / `data_recebimento` | ambos vazios |
| moedas aceitas (`codigos_ativos_gerados`) | **0** |
| `primeiro_mes_pago` | `false` (o 1º mês foi pago pelo caminho do plano/saldo, não pela caixa do painel) |
| `desconsiderado_em` | **13/11 06:53** — "Prazo limite de 3 dias para postagem expirado sem postagem nos Correios. O frete pago voltou ao saldo." |
| frete | R$ 41,61 · `estornado` · pago por saldo em 09/11 14:05 · estornado em 13/11 06:53 |
| pré-postagem | criada 09/11 14:05 (`PRn…`, serviço 03301 = PAC reverso), código de objeto gravado; **`canceladaEm` = 13/11 06:53** |

### Fatura e plano (consulta 3)

| Campo | Valor |
|---|---|
| fatura | `FAT-2026-11-siqueiraro-1794243902765` · `origem = contratacao` · competência 2026-11 · 15 moedas · R$ 30,00 |
| emitida / paga | 09/11 14:05 / 09/11 14:05 · forma **saldo** |
| `cobertura_ate` | vazio (nunca cobriu moeda — nenhuma foi aceita) |
| status | **`cancelada`** |
| plano | `PLC-000012`, `protocolo_envio = RO-ENV-0036`, status **`cancelado`**, `estornado = 0` |

### Ledger do cliente desde 09/11 (consulta 4) — só as linhas deste caso e as vizinhas que explicam o saldo

| id | Quando | Tipo | Valor | Sinal | Saldo após | Descrição / ref |
|---|---|---|---|---|---|---|
| 478 | 09/11 14:05 | custodia | 30,00 | 0 | 235,30 | "…15 moeda(s) — **pendente**" (`FAT-…`) |
| 479 | 09/11 14:05 | custodia | 30,00 | −1 | 205,30 | "…15 moeda(s) — **paga**" |
| 480 | 09/11 14:05 | frete | 41,61 | −1 | 163,69 | Frete PAC de `RO-ENV-0036` |
| 501 | 10/11 13:10 | **ajuste** | 30,00 | +1 | 371,79 | "Ajuste manual de saldo autorizado pela equipe — estorno por moeda não enviada" |
| 508 | 13/11 06:53 | **estorno** | 41,61 | +1 | 411,40 | "Estorno do frete do envio `RO-ENV-0036` — desconsiderado sem postagem" |
| 518 | 14/11 22:40 | **estorno** | 30,00 | +1 | 217,30 | "Estorno de custódia cobrada por engano (`FAT-…`)" — o `derivar.ts` lançando fatura paga → cancelada |
| 519 | 14/11 22:40 | **ajuste** | 30,00 | −1 | 187,30 | "Reversão do ajuste manual de 10/11 … o valor volta pelo estorno oficial da fatura" |

(As linhas 489–490, 504 e 513–517 são venda, comissão e custódias de outras moedas, sem relação com o caso.)
**Saldo atual R$ 187,30 = soma do ledger R$ 187,30.** O efeito líquido dos R$ 30: +30 (ajuste 10/11) → +30 −30 (estorno oficial e reversão do ajuste, 14/11) = **+R$ 30 uma vez só**, agora com lastro na fatura cancelada.

### Trilha de auditoria (consulta 5)

| id | Quando | Ação | Observação |
|---|---|---|---|
| 1114–1119 | 09/11 14:05 | `envio.criar`, `custodia.faturar`, `custodia.atualizar_fatura` (traz `nfsePedidas: 1`), `envio.atualizar` ×3 | criação do envio, da fatura, do pagamento por saldo e do frete; a nota foi pedida na própria mutação |
| 1247–1248 | 13/11 06:53 | `envio.atualizar` ×2 (1 lançamento) | o desconsiderado automático (frete estornado, etiqueta cancelada) |
| **1260** | **14/11 22:36** | **`admin.fiscal.cancelar_nfse`**, entidade `nfse_emissoes` / 63 | obs.: "saldo já devolvido por ajuste manual de 10/11 (R$ 30,00)"; motivo "2\|servico nao prestado"; nota 41; ator `ga***` |
| **1261** | **14/11 22:40** | `custodia.atualizar_fatura` | `ajustes: [{diferenca: -3000}]`, 2 lançamentos (518 e 519) |

---

## O que cada achado significa para o cancelamento

1. **A nota estava autorizada, não pendente.** Saiu e foi autorizada no mesmo minuto da compra (09/11 14:05, nº 41, ambiente produção). Logo o cancelamento exige o **evento 101101 na Sefin**, não a simples troca de status local — e foi isso que aconteceu (`xml_cancelamento` com 101101). A janela do contador ("dentro do mês") foi cumprida: emitida em novembro, cancelada em 14/11. A nota ficou `cancelada` cerca de **1 minuto** depois do estorno da fatura (22:40 → 22:41) — ver o item "Quanto tempo a nota fica `cancelando`" no fim: o cancelamento na Sefin não é instantâneo.
2. **Em que mês foi emitida:** novembro/2026 (competência 09/11). Para a regra do código: "avisar a equipe quando a nota for de outro mês" não se aplica a este caso; a frente deve tratar o mês corrente como normal e o mês anterior como alerta.
3. **O frete foi pago** (R$ 41,61 por saldo, 09/11) e **já voltou** (13/11 06:53, regra dos 3 dias). Não há etiqueta ativa: a pré-postagem teve o `canceladaEm` gravado no mesmo instante. Confirma o contrato **H→K**: o estorno de frete devolve `frete.valorCents` inteiro (R$ 41,61).
4. **O 1º mês é a lacuna provada (na base 9e21fe1 e em produção):** o desconsiderado automático só cuida do frete. (A worktree da Execução já tem edição não commitada em `envios.ts` com `devolverPrimeiroMesDoEnvio` — não li nem avaliei; só registro que o T6 está em andamento.) A fatura de R$ 30 ficou `paga` e a nota de pé de 09/11 a 14/11, e só saiu por ação manual (ajuste em 10/11 sem lastro fiscal; regularização em 14/11). É exatamente o que o T6 corrige.
5. **O caminho técnico já funciona em produção:** `fatura paga → cancelada` produziu **um** estorno (`derivar.ts`, descrição "cobrada por engano") e a nota entrou na fila de cancelamento. Isto confirma a "armadilha do estorno duplo" do MD: com `plano.estornado = 0` não houve lançamento duplo. O `cancelarEnvio` deve repetir esse caminho (fatura → `cancelada`, sem tocar `plano.estornadoCents`).
6. **Textos a decidir na Execução (não é decisão fiscal nova):** o ledger do estorno diz "cobrada **por engano**" (`derivar.ts:157`) e a justificativa de cancelamento da nota que o código gera também (`pedidos.ts:200`). Neste caso a equipe gravou à mão "cobrada **por envio que nao foi postado**", mais exata. Para cancelamento de envio não postado, vale um texto próprio (a frente decide; mexer no texto do contador/Sefin é decisão do Gabriel).
7. **O caso é a fixture:** envio `Protocolo gerado`, 15 moedas, fatura `contratacao` paga por saldo, plano 1:1 com o envio via `protocolo_envio`, frete PAC R$ 41,61 pago, etiqueta com `id` e sem postagem. O contrato B↔H "tudo que um envio gerou se acha pelo protocolo" é satisfeito neste registro: `planos_custodia.protocolo_envio` → `faturas_custodia.plano_id` (`origem = contratacao`) → `nfse_emissoes.chave = 'custodia:' + fatura.id`.

## Outros achados (fora do pedido; não investiguei além disto)

- **Nenhum outro envio** tem hoje o 1º mês pago + nota de pé sem moeda aceita (consulta 6 só devolve dois envios, nenhum com nota). **Nenhuma nota de custódia de pé aponta para fatura cancelada** (consulta 7 vazia).
- `RO-ENV-0017` (mesmo cliente, 1 moeda, criado em 16/10): fatura do 1º mês de **R$ 2,00 paga por saldo**, **sem frete, sem etiqueta e sem nota** (nasceu antes da NFS-e automática de 23/10), parado em "Protocolo gerado" há ~32 dias e **nunca gravado como desconsiderado** (`desconsiderado_em` vazio). Motivo: a varredura diária `desconsiderarEnviosVencidos` só seleciona envio com **frete `pago` ou etiqueta ativa** (`src/server/shipping/frete-envio.ts:361`); sem isso o envio só é "desconsiderado" na leitura de tela (`isEnvioDesconsiderado`, `envios.ts:186`) e a gravação só acontece se o dono mexer nele (`custody.ts:244`). É candidato natural a "equipe cancela" (T4); decidir com o Gabriel, não é o caso dos R$ 30.
- `RO-ENV-0045` (outro cliente, 16/11): fatura do 1º mês **pendente** (R$ 2,00) e frete só `cotado` — em aberto e normal; serve de cenário "fatura pendente → só `cancelada`, sem saldo". **Atenção para o T6:** como o filtro da varredura exige frete pago ou etiqueta ativa, este tipo de envio (frete só cotado, ou sem frete) **nunca entra na varredura** — se o T6 devolver o 1º mês só dentro de `desconsiderarEnvio`, ele não dispara para eles. A Execução precisa decidir se alarga o filtro (por exemplo, "ou 1º mês pago") ou aceita que esses casos só saem pelo cancelamento manual.
- Resumo de `nfse_emissoes` hoje: 49 `autorizada` (R$ 447,30), 2 `cancelada` (R$ 32,00: a REN de 01/11 e esta), 13 `rejeitada` sem ambiente (R$ 42,00 no total) — as 13 rejeitadas não foram analisadas aqui.
- **Quanto tempo a nota fica `cancelando` (pergunta do T1).** `vercel.json` roda o faturamento às 08:00 UTC (05:00 de Brasília) e o shipping às 09:00 UTC (06:00); os carimbos "05:13" das notas e "06:53" do desconsiderado são esses jobs, com a folga do plano da Vercel. Lendo o código: o estorno chama `marcarParaCancelar` (`db/estado.ts:128`), que devolve `nfsePedidas > 0` e dispara `agendarEmissaoNfse()` (`state.ts:181`, via `after()`); **mas** `reivindicarCancelamentos` só pega nota `cancelando` parada há mais de **60 s** (`repositories/nfse.ts:312-320`), então o envio imediato **pula** a nota recém-marcada. Ela sai no **próximo** processamento da fila: outra mutação que peça nota, o botão **"Enviar fila"** do painel fiscal (`enviarFilaDeNotas`, permissão `resultados.nfse`) ou o **job diário (~05:00 BRT)**. Os dois casos reais batem: a nota 33 (01/11), estornada em 03/11, foi cancelada às 05:13 de 04/11 (job diário); a do Rogério ficou `cancelando` ~1 minuto (alguém rodou a fila logo depois). Para a equipe: **"cancelamento pedido" ≠ "nota cancelada"; no pior caso a nota fica `cancelando` até a manhã seguinte** — aviso importante nos meses fechando (30/11). Detalhe que a mensagem da tela deve dizer, e que o painel fiscal já permite apressar.
