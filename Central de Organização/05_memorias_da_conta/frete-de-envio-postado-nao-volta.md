---
name: frete-de-envio-postado-nao-volta
description: "Decisão do Gabriel (18/11/2026, D-H1) — envio já postado e cancelado na bancada NÃO devolve o frete ao saldo do cliente; a culpa de moeda que não chegou é dos Correios"
metadata:
  node_type: memory
  type: project
  originSessionId: be4bb47e-10ac-4af0-81a3-cd197a73cc3a
  modified: 2026-11-18T15:13:57.004Z
---

Decisão do Gabriel em 18/11/2026, fechando a pergunta D-H1 da frente H (cancelar envio e nota): quando um envio **já postado** é cancelado pela equipe na bancada ("Cancelar validação"), o **frete NÃO volta para o saldo do cliente**.

**Why:** a Áurea não participa da logística; se a moeda não chegou, a responsabilidade é dos Correios, e o frete já foi cobrado da Áurea pelo contrato. O 1º mês de custódia e a nota fiscal continuam voltando (nenhuma moeda foi aceita); o frete de envio **não postado** sempre volta e a etiqueta é cancelada.

**How to apply:** o código já está assim — `DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO = false` em `src/domain/cancelar-envio.ts`, travada por teste. Não propor trocar. Caso de extravio em que a Áurea decida compensar o cliente é decisão pontual dela, por ajuste de saldo na ficha do usuário, não regra. Ver [[regra-de-negocio-so-com-pergunta]].
