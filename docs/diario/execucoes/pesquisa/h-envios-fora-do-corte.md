# H · Envios que ficariam fora do corte — leitura em produção, somente leitura (17/11/2026, à noite)

## Conclusão (sem rodeio)

- **Só 1 envio fica de fora com o 1º mês ainda de pé: `RO-ENV-0017`, R$ 2,00** (1 moeda), pago por saldo em 20/10/2026. **Ele não tem nota fiscal** — nunca houve pedido de NFS-e para essa fatura (foi paga antes da emissão automática de 23/10). Logo, **0 notas autorizadas de mês anterior, 0 notas de pé** entre os candidatos.
- **Soma do 1º mês de pé: R$ 2,00.** Nada a cancelar na Sefin; se o Gabriel quiser devolver, é só saldo.
- O universo pelo seu critério tem **4 envios**: `RO-ENV-0004`, `RO-ENV-0008` e `RO-ENV-0036` **não têm 1º mês de pé** (faturas de R$ 2,00 `canceladas`; as duas primeiras **nunca foram pagas**; a do `0036` é o caso do Rogério, já resolvido).
- **`RO-ENV-0045` NÃO está fora do corte hoje:** foi criado em 16/11 03:28 e só vence em **19/11 03:28**. Tem fatura `pendente` (R$ 2,00) e frete só `cotado` (R$ 59,63), sem etiqueta e sem nota — **nada de pé**. Vira caso se o cliente pagar e não postar (ver "Atenção").
- **Envios com SÓ frete pago (sem 1º mês pago): 0.** O único envio com frete pago entre os candidatos foi o `RO-ENV-0036`, que já teve o frete estornado e o 1º mês cancelado. Nenhum envio vencido tem etiqueta ativa.
- **Só 1 dos 4 está gravado como desconsiderado** (`RO-ENV-0036`). Os outros três estão apenas **vencidos** (sem `desconsiderado_em` no banco) porque a varredura diária só pega envio com frete pago ou etiqueta ativa (`frete-envio.ts:361`, ver `h-caso-rogerio.md`).

## Atenção (decisão de cobrança — é do Gabriel, não minha)

1. **`RO-ENV-0045` e o corte "criado antes do deploy".** Hoje ele não tem dinheiro de pé. Se o cliente pagar a fatura de R$ 2,00 (ou o frete) **depois** do deploy e deixar vencer, o envio terá sido **criado antes do deploy** e, pela regra do corte, ficaria fora da devolução automática **com dinheiro de pé**. Vale decidir se o corte olha a **data de criação do envio** ou a **data de pagamento do 1º mês**.
2. **`RO-ENV-0017` ficou fora da regra dos 3 dias por outro motivo também:** não tem frete nem etiqueta (nasceu em 16/10, antes do frete no site de 22/10), então a varredura nunca o seleciona. Mesmo com a regra nova, nada o alcançaria sozinho.

## Os 4 envios (resultado)

Critério aplicado: `origem = 'envio_postal'` · `codigos_ativos_gerados` vazio · `data_postagem` vazia · (`desconsiderado_em` preenchido **ou** etapa "Protocolo gerado" criada há mais de 3 dias = 259 200 000 ms, a constante `PRAZO_DESCARTE_ENVIO_MS`). `cadastro_sem_envio` fica de fora de propósito: o código nunca o desconsidera (`envios.ts`, `isEnvioDesconsiderado`).

| Protocolo | Cliente | Moedas | Criado | Desconsiderado | Frete (status · valor) | Etiqueta | Plano | Fatura do 1º mês (`contratacao`) | NFS-e | 1º mês de pé? |
|---|---|---|---|---|---|---|---|---|---|---|
| `RO-ENV-0004` | `ga***@aureacustodia.com.br` | 1 | 22/09/2026 | não (só vencido) | — | nunca | `PLC-000008` · `cancelado` | `FAT-2026-09-gabrielsil-1790174925256` · **`cancelada`** · R$ 2,00 · **nunca paga** (ledger só "pendente") | nenhuma | **não** |
| `RO-ENV-0008` | `fe***@gmail.com` | 1 | 02/10/2026 | não (só vencido) | — | nunca | `PLC-000009` · `cancelado` | `FAT-2026-10-ferreiraes-1790983207190` · **`cancelada`** · R$ 2,00 · **nunca paga** | nenhuma | **não** |
| **`RO-ENV-0017`** | `si***@gmail.com` (Rogério) | 1 | 16/10/2026 | não (só vencido) | — | nunca | `PLC-000010` · **`vigente`** | `FAT-2026-10-siqueiraro-1792199547593` · **`paga`** · **R$ 2,00 (200 centavos)** · por **saldo** · emitida 16/10, **paga em 20/10/2026 16:32** (ledger 296 pendente, 303 paga) | **nenhuma** (nem linha em `nfse_emissoes`) | **sim** |
| `RO-ENV-0036` | `si***@gmail.com` (Rogério) | 15 | 09/11/2026 | **sim, 13/11/2026 06:53** | `estornado` · R$ 41,61 | cancelada | `PLC-000012` · `cancelado` | `FAT-2026-11-siqueiraro-1794243902765` · `cancelada` · R$ 30,00 | nº 41 · **`cancelada`** · emitida em 2026-11 (mês atual) | **não** (resolvido) |

Contagens: **1** com 1º mês de pé (R$ 2,00 no total) · **0** com nota autorizada · **0** com nota de mês anterior · **3** sem 1º mês de pé · **0** com só frete.

### Fora do universo, para completar o quadro (consulta de panorama)

| Grupo | Envios | Por que fica fora |
|---|---|---|
| `envio_postal`, "Protocolo gerado", dentro do prazo, sem pagar nada | 1 (`RO-ENV-0045`) | ainda não venceu (19/11 03:28) |
| `envio_postal`, "Recibo emitido", com data de postagem e 0 moeda aceita | 1 | foi postado (critério exige sem postagem); não investiguei |
| `envio_postal`, "Recibo emitido", com moeda aceita | 1 | moeda aceita não cancela |
| `cadastro_sem_envio` ("Recibo emitido") | 36 | não passa pelos Correios, nunca é desconsiderado |

`RO-ENV-0045` em detalhe: cliente `cr***@gmail.com`, 1 moeda, SEDEX, criado 16/11 03:28, plano `PLC-000013` `aguardando_pagamento`, fatura `FAT-2026-11-cristianad-1794810533325` `pendente` R$ 2,00, frete `cotado` R$ 59,63, etiqueta nunca emitida, nota nenhuma.

## O que isto significa para o tratamento manual (fatos, sem decidir)

- **`RO-ENV-0017`** é o único caso. As opções que o Gabriel tem: (a) devolver os R$ 2,00 ao saldo (o ledger registraria um `estorno`; **não há nota para cancelar**; o R$ 2,00 pago em 20/10 entrou no ledger como custódia paga — e, como a DRE lê a receita do ledger, provavelmente já conta como receita sem NFS-e, o que o contador pode querer saber); (b) deixar como está. O envio segue "Protocolo gerado" há 32 dias, sem etiqueta — se for cancelado, não há I/O com os Correios.
- **`RO-ENV-0004` e `RO-ENV-0008`** não pedem nada: fatura cancelada sem nunca ter sido paga (nem dinheiro nem nota).
- **Janela do contador:** nenhuma nota autorizada de mês anterior está envolvida; a única nota ligada a estes envios (nº 41) já foi cancelada em novembro.

## Fora do pedido, observado no caminho (para o Gabriel/contador)

**13 faturas de custódia `paga` não têm NFS-e** (R$ 326,00 no total), todas pagas **até 22/10/2026**, antes da emissão automática de 23/10: 09/2026 — 1 ciclo (R$ 200,00) + 3 de entrada no acervo (R$ 54,00); 10/2026 — 1 ciclo (R$ 2,00), 2 de compra (R$ 4,00), 1 de contratação (R$ 2,00 — é a do `RO-ENV-0017`) e 5 de entrada no acervo (R$ 64,00). Não analisei se há reemissão prevista ou se o contador já tratou.

---

## Como foi lido

Mesmas regras de sempre: `POSTGRES_URL` do `.env.local` (nunca impressa), transação **`BEGIN READ ONLY` … `ROLLBACK`**, **nenhum `SET`**, script de leitura no scratchpad (recusa tudo que não for `SELECT`/`WITH`), e-mail só mascarado. `now()` e `AT TIME ZONE` são expressões, não `SET`. Sem navegador, servidor nem container. O resultado vale para o instante da leitura: o `RO-ENV-0045` entra no universo a partir de 19/11 03:28; refaça a consulta 1 na hora do deploy.

## Consultas (copiáveis — só SELECT; rodar dentro de `BEGIN READ ONLY; … ROLLBACK;`)

### 1. A lista (universo + estado do 1º mês e da nota)

```sql
WITH agora AS (
  SELECT (extract(epoch from now()) * 1000)::bigint AS ms,
         to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes_atual
),
universo AS (
  SELECT e.*
    FROM aurea.envios e, agora a
   WHERE e.origem = 'envio_postal'
     AND jsonb_array_length(e.codigos_ativos_gerados) = 0
     AND e.data_postagem IS NULL
     AND ( e.desconsiderado_em IS NOT NULL
        OR (e.etapa_atual = 'Protocolo gerado' AND e.created_at + 259200000 <= a.ms) )   -- 3 dias
),
detalhe AS (
  SELECT u.protocolo,
         left(split_part(u.user_email,'@',1),2) || '***@' || split_part(u.user_email,'@',2) AS cliente,
         u.quantidade AS moedas,
         to_char(to_timestamp(u.created_at/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS criado_em,
         (u.desconsiderado_em IS NOT NULL) AS desconsiderado,
         to_char(to_timestamp(u.desconsiderado_em/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS desconsiderado_em,
         u.frete->>'status' AS frete_status, (u.frete->>'valorCents')::bigint AS frete_cents,
         CASE WHEN u.pre_postagem IS NULL THEN 'nunca'
              WHEN u.pre_postagem->>'canceladaEm' IS NULL THEN 'ATIVA' ELSE 'cancelada' END AS etiqueta,
         p.id AS plano, p.status AS plano_status,
         f.id AS fatura_1o_mes, f.status AS fatura_status, f.valor_cents AS fatura_cents, f.forma_pagamento,
         to_char(to_timestamp(f.data_pagamento/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS paga_em,
         n.id AS nfse_id, n.status AS nfse_status, n.numero_nfse,
         to_char(to_timestamp(n.autorizada_em/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') AS nfse_mes_emissao,
         (to_char(to_timestamp(n.autorizada_em/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') < a.mes_atual) AS nfse_de_mes_anterior,
         ( f.status = 'paga' OR (n.id IS NOT NULL AND n.status NOT IN ('cancelada')) ) AS primeiro_mes_de_pe,
         (f.id IS NULL) AS sem_fatura_de_1o_mes
    FROM universo u
    CROSS JOIN agora a
    LEFT JOIN aurea.planos_custodia p ON p.protocolo_envio = u.protocolo
    LEFT JOIN aurea.faturas_custodia f ON f.plano_id = p.id AND f.origem = 'contratacao'
    LEFT JOIN aurea.nfse_emissoes n ON n.chave = 'custodia:' || f.id
)
SELECT * FROM detalhe ORDER BY criado_em, protocolo;
```

Para os totais pedidos, troque o `SELECT` final por:

```sql
SELECT count(*) AS envios_no_universo,
       count(*) FILTER (WHERE primeiro_mes_de_pe) AS com_1o_mes_de_pe,
       coalesce(sum(fatura_cents) FILTER (WHERE primeiro_mes_de_pe), 0) AS soma_1o_mes_de_pe_centavos,
       count(*) FILTER (WHERE nfse_status IS NOT NULL AND nfse_status <> 'cancelada') AS com_nota_de_pe,
       count(*) FILTER (WHERE nfse_de_mes_anterior AND nfse_status <> 'cancelada') AS com_nota_de_mes_anterior,
       count(*) FILTER (WHERE NOT primeiro_mes_de_pe AND frete_status = 'pago') AS so_frete_pago
  FROM detalhe;
```

### 2. Envios ainda dentro do prazo (os que podem virar caso)

```sql
WITH agora AS (SELECT (extract(epoch from now()) * 1000)::bigint AS ms)
SELECT e.protocolo,
       left(split_part(e.user_email,'@',1),2) || '***@' || split_part(e.user_email,'@',2) AS cliente,
       e.quantidade AS moedas, e.modalidade_envio,
       to_char(to_timestamp(e.created_at/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS criado_em,
       to_char(to_timestamp((e.created_at + 259200000)/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS vence_em,
       e.frete->>'status' AS frete_status, (e.frete->>'valorCents')::bigint AS frete_cents,
       CASE WHEN e.pre_postagem IS NULL THEN 'nunca' WHEN e.pre_postagem->>'canceladaEm' IS NULL THEN 'ATIVA' ELSE 'cancelada' END AS etiqueta,
       p.id AS plano, p.status AS plano_status,
       f.id AS fatura_1o_mes, f.status AS fatura_status, f.valor_cents AS fatura_cents,
       n.id AS nfse_id, n.status AS nfse_status
  FROM aurea.envios e
  CROSS JOIN agora a
  LEFT JOIN aurea.planos_custodia p ON p.protocolo_envio = e.protocolo
  LEFT JOIN aurea.faturas_custodia f ON f.plano_id = p.id AND f.origem = 'contratacao'
  LEFT JOIN aurea.nfse_emissoes n ON n.chave = 'custodia:' || f.id
 WHERE e.origem = 'envio_postal'
   AND jsonb_array_length(e.codigos_ativos_gerados) = 0
   AND e.data_postagem IS NULL
   AND e.desconsiderado_em IS NULL
   AND e.etapa_atual = 'Protocolo gerado'
   AND e.created_at + 259200000 > a.ms
 ORDER BY e.created_at;
```

### 3. Panorama (de onde vêm os 4)

```sql
SELECT e.origem, e.etapa_atual,
       (e.desconsiderado_em IS NOT NULL) AS desconsiderado,
       (e.data_postagem IS NOT NULL) AS tem_data_postagem,
       (jsonb_array_length(e.codigos_ativos_gerados) > 0) AS tem_moeda_aceita,
       count(*) AS envios
  FROM aurea.envios e
 GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5;
```

### 4. O ledger das três faturas (prova de "nunca paga" × "paga")

```sql
SELECT l.ref_interna AS fatura, l.id,
       to_char(to_timestamp(l.created_at/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS quando,
       l.tipo, l.valor, l.sinal, l.descricao
  FROM aurea.ledger_entries l
 WHERE l.ref_interna IN ('FAT-2026-09-gabrielsil-1790174925256',
                         'FAT-2026-10-ferreiraes-1790983207190',
                         'FAT-2026-10-siqueiraro-1792199547593')
 ORDER BY l.ref_interna, l.id;
```

### 5. (fora do pedido) Faturas pagas sem NFS-e

```sql
SELECT to_char(to_timestamp(f.data_pagamento/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') AS mes_pagamento,
       f.origem, count(*) AS faturas, sum(f.valor_cents) AS total_centavos
  FROM aurea.faturas_custodia f
 WHERE f.status = 'paga' AND f.valor_cents > 0
   AND NOT EXISTS (SELECT 1 FROM aurea.nfse_emissoes n WHERE n.chave = 'custodia:' || f.id)
 GROUP BY 1, 2 ORDER BY 1, 2;
```

> O id da fatura embute um pedaço do e-mail do cliente (`…-siqueiraro-…`); é o identificador de negócio e fica, mas não replique o endereço inteiro. Esquema real conferido por `information_schema` na leitura anterior (ver `h-caso-rogerio.md`).
