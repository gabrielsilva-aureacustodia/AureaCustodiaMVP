# Caso do Rogério — nota de R$ 30 do envio que não foi postado (frente H, 17/11/2026)

```
Pedido:   Rogério, item 10a (WS de 9/11): cancelar a nota de R$ 30, cancelar o faturamento e devolver o dinheiro.
Estado:   JÁ RESOLVIDO EM PRODUÇÃO em 14/11/2026. Este arquivo é o REGISTRO do que foi feito, as consultas para
          conferir e o passo a passo para o próximo caso igual. NADA foi executado em produção por esta frente.
Fonte:    leitura somente-leitura de 17/11/2026 (docs/diario/execucoes/pesquisa/h-caso-rogerio.md e
          h-envios-fora-do-corte.md). Código que cobre o próximo caso: docs/MAPA_DO_CANCELAMENTO.md.
```

## 1. Conclusão

**Não há nada a executar para o Rogério.** O envio `RO-ENV-0036` (15 moedas, "Entrega da Bandeira Olímpica", PAC), a
fatura do 1º mês de R$ 30,00 e a NFS-e nº 41 já estão todos encerrados, e o dinheiro voltou **uma vez só**. Rodar o
cancelamento de novo seria, no melhor caso, um "não faz nada" — e por isso não se roda.

O que a frente H entrega é o que **faltou naquela semana**: de 13/11 a 14/11 o envio estava desconsiderado (regra dos
3 dias), mas só o frete tinha voltado; o 1º mês e a nota ficaram de pé até alguém agir à mão. Com o código novo, um
envio igual **criado a partir do corte D-H5** devolve frete, 1º mês e nota juntos no dia do vencimento; um envio
**antigo** como este (criado em 09/11) segue voltando só o frete na regra dos 3 dias — o 1º mês e a nota dele saem pelo
cancelamento manual (botão "Cancelar envio" da logística), que não tem corte.

## 2. O que aconteceu, na ordem real

| Quando (Brasília) | O quê | Onde se vê |
|---|---|---|
| 09/11 14:05 | Envio criado; frete PAC de R$ 41,61 e 1º mês de R$ 30,00 pagos por **saldo**; etiqueta dos Correios emitida; NFS-e nº 41 autorizada (ambiente de produção) | ledger 478–480; `nfse_emissoes` id 63 |
| 10/11 13:10 | Equipe devolveu os R$ 30 por **ajuste manual** de saldo, sem lastro na fatura nem na nota | ledger 501 (`ajuste`) |
| 13/11 06:53 | Regra dos 3 dias: envio **desconsiderado**, frete de R$ 41,61 **estornado**, etiqueta **cancelada**. O 1º mês e a nota **não** foram tocados | ledger 508 (`estorno`); `desconsiderado_em` |
| 14/11 22:36 | Equipe pediu o cancelamento da nota (ação `admin.fiscal.cancelar_nfse`, que **não existe no código da base 9e21fe1**: foi feita fora do repositório) | `audit_log` 1260 |
| 14/11 22:40 | Fatura do 1º mês **paga → cancelada** (estorno oficial de R$ 30 no ledger) e **reversão do ajuste de 10/11** (−R$ 30) para o valor não voltar duas vezes; plano `PLC-000012` cancelado | ledger 518 (`estorno`) e 519 (`ajuste`); `audit_log` 1261 |
| 14/11 22:41 | NFS-e nº 41 **cancelada** na Sefin (evento 101101, motivo 2 "serviço não prestado") — **mesmo mês** da emissão, como o contador exige | `nfse_emissoes.cancelada_em` |

## 3. Estado final em 17/11/2026 (o que conferir)

| Item | Estado | Valor |
|---|---|---|
| Envio `RO-ENV-0036` | desconsiderado, etapa "Protocolo gerado", **0 moeda aceita** | — |
| Frete | `estornado` (13/11) | R$ 41,61 voltou |
| Etiqueta dos Correios | `canceladaEm` gravado (13/11) | sem etiqueta ativa |
| Fatura do 1º mês (`contratacao`) | `cancelada` | R$ 30,00 |
| Plano `PLC-000012` | `cancelado`, `estornado = 0` | o estorno de moeda recusada não foi tocado |
| NFS-e nº 41 | `cancelada`, com `xml_cancelamento` do evento 101101 | R$ 30,00, competência 11/2026 |
| Saldo do cliente × soma do ledger | **R$ 187,30 = R$ 187,30** | fecha |
| R$ 30 de devolução | **um** estorno (518) e a reversão do ajuste (519) | volta uma vez só |
| Nota de custódia "de pé" apontando para fatura cancelada (qualquer cliente) | **nenhuma** | consulta 5 abaixo |

## 4. Consultas de conferência (só leitura)

Regras: rodar dentro de `BEGIN READ ONLY; … ROLLBACK;`, **sem `SET` de sessão** (o pooler do Supabase vaza para o
site), e-mail sempre mascarado. O texto completo de cada consulta, com todas as colunas, está em
`docs/diario/execucoes/pesquisa/h-caso-rogerio.md` e `h-envios-fora-do-corte.md`. Aqui ficam as cinco que respondem
"fechou?":

```sql
BEGIN READ ONLY;

-- 1. A nota nº 41 e o evento de cancelamento
SELECT n.id, n.status, n.numero_nfse, n.valor, n.competencia,
       (n.xml_cancelamento ~ '101101') AS evento_101101,
       to_char(to_timestamp(n.cancelada_em/1000.0) AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS cancelada_em
  FROM aurea.nfse_emissoes n
 WHERE n.servico = 'custodia' AND n.valor = 3000;

-- 2. O envio, o frete e a etiqueta
SELECT e.protocolo, e.etapa_atual, jsonb_array_length(e.codigos_ativos_gerados) AS moedas_aceitas,
       e.frete->>'status' AS frete_status, e.frete->>'valorCents' AS frete_cents,
       (e.pre_postagem->>'canceladaEm') IS NOT NULL AS etiqueta_cancelada,
       e.desconsiderado_em IS NOT NULL AS desconsiderado
  FROM aurea.envios e
 WHERE e.protocolo = 'RO-ENV-0036';

-- 3. A fatura do 1º mês e o plano
SELECT f.id, f.origem, f.status, f.valor_cents, p.id AS plano, p.status AS plano_status, p.estornado AS plano_estornado
  FROM aurea.faturas_custodia f
  JOIN aurea.planos_custodia p ON p.id = f.plano_id
 WHERE p.protocolo_envio = 'RO-ENV-0036' AND f.origem = 'contratacao';

-- 4. O saldo fecha com o ledger?
SELECT split_part(u.name,' ',1) AS primeiro_nome, u.balance AS saldo,
       (SELECT coalesce(sum(l.valor * l.sinal), 0) FROM aurea.ledger_entries l WHERE l.user_email = u.email) AS soma_ledger
  FROM aurea.users u
 WHERE u.email = (SELECT user_email FROM aurea.envios WHERE protocolo = 'RO-ENV-0036');

-- 5. Alguma nota de custódia de pé apontando para fatura cancelada? (esperado: nenhuma linha)
SELECT n.id, n.status, n.numero_nfse, n.valor, n.competencia, f.id AS fatura
  FROM aurea.nfse_emissoes n
  JOIN aurea.faturas_custodia f ON n.chave = 'custodia:' || f.id
 WHERE f.status = 'cancelada' AND n.status NOT IN ('cancelada', 'cancelando');

ROLLBACK;
```

Resultado esperado hoje: (1) `cancelada`, evento verdadeiro, 14/11 22:41; (2) 0 moeda aceita, frete `estornado`,
etiqueta cancelada, desconsiderado; (3) fatura `cancelada`, plano `cancelado` com `estornado = 0`; (4) saldo = soma;
(5) vazia.

## 5. Como cancelar o próximo caso igual (envio não postado + 1º mês + nota)

Com a frente H no ar, **sem mexer no banco e sem "ajuste de saldo"** — o ajuste manual foi justamente o que deixou o
caso do Rogério sem lastro fiscal por quatro dias.

**Quem cancela e onde**

| Situação | Onde | Permissão |
|---|---|---|
| O envio nunca saiu do cliente (vencido, abandonado, pedido do cliente por fora do site) | `/admin/logistica` → linha do envio → **Cancelar envio** | `logistica.expedir` |
| A análise está aberta na bancada e o pacote não chegou ou nunca foi feito | `/admin/bancada` → análise aberta → **Cancelar validação** | `bancada.analisar` |
| O próprio cliente | `/envios` → envio "Ainda não postado" → **Cancelar envio** | só o dono, só envio não postado |

**Passo a passo (equipe)**

1. Abra `/admin/logistica`. O filtro padrão **"Em andamento" esconde envio já vencido** — troque **Situação** para
   **"Todos"** ou busque o protocolo.
2. Na linha do envio, clique em **Cancelar envio**. Escreva o motivo (mínimo de 10 caracteres — fica na trilha de
   auditoria e no extrato do cliente) e confirme.
3. Leia a mensagem que a tela devolve: ela diz quanto voltou ao saldo (frete e 1º mês), a situação da etiqueta e o aviso
   de mês quando a nota é de outro mês.
4. **Envio já postado:** o botão avisa que o **frete NÃO volta** (o objeto já foi cobrado pelos Correios — decisão D-H1,
   uma constante no código). O 1º mês e a nota voltam normalmente. Envio **com moeda aceita** não cancela: o caminho é a
   retirada.
5. **A nota fiscal não sai na hora.** Ela fica `cancelando` até a próxima rodada da fila de notas (todo dia às
   05:00 de Brasília). Para apressar — **principalmente perto da virada do mês, porque o contador exige o cancelamento
   dentro do mês da nota** —, abra `/admin/resultados/fiscal` e use **Enviar fila agora** (permissão `resultados.nfse`).

**O que conferir depois (1 minuto)**

- **Saldo do cliente:** subiu pelo frete (se estava `pago`) + 1º mês (se estava `paga`). Cartão e Pix **não** recebem
  nada: tudo volta para o saldo da conta.
- **Extrato do cliente:** um lançamento `estorno` para o frete e um para a fatura do 1º mês — **nunca dois para a mesma
  coisa**. Segundo clique no botão não devolve nada (o sistema reconhece o envio já cancelado).
- **NFS-e:** `cancelando` logo depois, `cancelada` depois da rodada da fila. Se ficar `cancelando` com erro, o motivo
  aparece no painel fiscal (`/admin/resultados/fiscal`) — não cancelar de novo por fora.
- **Etiqueta:** o cancelamento consulta os Correios e cancela a etiqueta **antes** de devolver qualquer valor. Se os
  Correios estiverem fora do ar, ou o pacote já estiver em atendimento/postado, a tela recusa e **nada muda** (nem
  dinheiro, nem nota): tente de novo em instantes. Se a etiqueta já constar cancelada ou expirada lá, a tentativa
  seguinte segue direto para a devolução, sem cancelar de novo.
- **Trilha:** `audit_log` com `admin.logistica.cancelar_envio` (e `via: logistica` ou `bancada`), com o motivo.

## 6. O que ficou de pé e precisa de decisão do Gabriel

1. **`RO-ENV-0017` (R$ 2,00, mesmo cliente, 1 moeda).** Criado em 16/10, 1º mês pago por saldo em 20/10 (antes da
   emissão automática de NFS-e de 23/10: **não tem nota**), parado em "Protocolo gerado" há 32 dias, sem frete e sem
   etiqueta. **Com o corte D-H5 (ordem do Controle, decisão de cobrança do Gabriel) ele NÃO é devolvido
   automaticamente:** a regra dos 3 dias só devolve o 1º mês de envio criado a partir do corte
   (`DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE` = 1794967250154, isto é, 17/11/2026
   23:00:50 em Brasília, o instante em que o fluxo novo da B foi ao ar). Se o Gabriel quiser devolver os R$ 2,00, é cancelamento **manual** (o manual não tem corte): `/admin/logistica`
   → Situação "Todos" → **Cancelar envio**. Não há nota a cancelar; o estorno reduz a receita de custódia de outubro
   na DRE (que lê o ledger) — vale o contador saber.
2. **`RO-ENV-0045` e o corte.** Está dentro do prazo (vence em 19/11 03:28), com fatura **pendente** e frete só cotado:
   nada de pé hoje. Foi criado em 16/11, **antes do corte**: se o cliente pagar o 1º mês depois do deploy e deixar
   vencer, a devolução automática não o alcança (só o frete, se pago) — o aviso no motivo do envio diz ao cliente que o
   cancelamento do 1º mês é com a equipe, e o botão manual da logística resolve. Pergunta do Gabriel: o corte olha a
   data de **criação** do envio (ordem do Controle, vale agora) ou a de **pagamento** do 1º mês? A comparação vive numa
   função só (`primeiroMesEntraNaDevolucaoAutomatica`, em `src/domain/envios.ts`), então a troca é uma linha (`0` na
   constante liga o retroativo).
3. **Textos fiscais "cobrada por engano".** O estorno no ledger (`derivar.ts`) e a justificativa de cancelamento da
   nota (`pedidos.ts`) dizem "cobrada por engano"; para envio não postado a equipe tinha escrito à mão "cobrada por
   envio que nao foi postado", mais exata. Texto que vai para a Sefin e para o contador é decisão do Gabriel — o código
   da frente H **não** o mexeu.
4. **Frete de envio já postado (D-H1).** Hoje não volta. Troca em uma linha:
   `DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO` em `src/domain/cancelar-envio.ts` (um teste trava o valor e avisa o que muda).
5. **13 faturas pagas sem NFS-e** (R$ 326,00, todas pagas até 22/10, antes da emissão automática). Achado de passagem,
   fora desta frente: o contador pode querer saber.
6. **Rótulo "Em andamento" do painel de logística** esconde envio vencido que ainda segura o 1º mês. Fora do escopo
   (a regra do filtro não foi tocada); está anotado porque cria exatamente o cenário do Rogério.

## 7. Cenários do caso na suíte

O caso entrou como teste, com os números reais (`src/domain/cancelar-envio.test.ts`, grupo "o caso do Rogério já
resolvido em produção"): envio desconsiderado + frete `estornado` + etiqueta cancelada + fatura `cancelada` + plano
`cancelado` → `cancelarEnvio` pela equipe devolve **R$ 0,00**, não mexe no saldo, não pede cancelamento de nota e não
gera nenhum lançamento nem ajuste no ledger. O segundo cenário cobre o `RO-ENV-0017` (R$ 2,00 sem frete, sem etiqueta e
sem nota) **cancelado à mão** e confere o aviso de mês (nota de outubro, cancelamento em novembro). O corte D-H5 tem
os seus próprios cenários: `envios.test.ts` (função do corte, envio antigo × novo), `cancelar-envio.test.ts` (o manual
não tem corte) e `server/shipping/cancelar-envio.test.ts` (a varredura: antigo devolve só o frete; novo devolve
frete + 1º mês e a nota entra em `cancelamentosDeNfse`).
