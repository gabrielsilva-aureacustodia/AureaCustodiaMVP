# `docs/fiscal-contabil/` — nota fiscal, contabilidade e taxas

Pasta criada em 22/10/2026 para a frente "NFS-e + controle contábil e financeiro do painel". Reúne o que o sistema
precisa seguir para emitir nota fiscal de cada receita e para registrar cada movimento como a lei e as normas
contábeis brasileiras pedem. A emissão automática de NFS-e (custódia e comissões) vive em `src/domain/nfse/` e `src/server/nfse/` desde 23/10/2026.

## Arquivos

| Arquivo | O que é | Leia quando |
|---|---|---|
| `REGRAS_FISCAIS_E_CONTABEIS.md` | **O documento conclusivo.** As regras R1–R14 que o sistema sempre segue: o que é receita e o que não é (e por quê), NFS-e por fato, códigos de tributação, datas, partidas dobradas, colunas, históricos, correções do painel, taxas do Mercado Pago, conciliação, tributos e guarda | Antes de mexer em ledger, DRE, extrato, cobrança, saque ou painel de resultados |
| `NFSE_MODELOS_DO_CONTADOR.md` | As três NFS-e que o contador emitiu (custódia, comissão de compra, comissão de venda), campo a campo, e o que a reunião de 16/10/2026 decidiu | Para saber de onde veio cada código |
| `API_NFSE_NACIONAL.md` | **A documentação da integração com o governo**: arquitetura, onde a nota nasce, envio, cancelamento, endpoints, segurança, dados, códigos de retorno, operação e testes — com diagramas | Para entender ou mexer na emissão |
| `NFSE_INTEGRACAO_NO_SITE.md` | A emissão automática (implementada em 23/10/2026 para custódia e comissões): o que foi entregue e como foi provado, API, pastas, tabela, fluxo, variáveis | Para mexer na emissão |
| `TAXAS_MERCADO_PAGO.md` | Todas as taxas do Mercado Pago por fluxo da plataforma, com exemplos, como a integração atual registra cada uma e as lacunas | Para custo, DRE e conciliação |
| `LACUNAS_E_PERGUNTAS.md` | O que o código faz hoje diferente das regras, e as perguntas abertas ao contador, ao Mercado Pago e de teste técnico | Para planejar a próxima tarefa |
| `FONTES.md` | Todas as fontes, agrupadas | Para conferir uma afirmação |
| `pesquisa/PESQUISA_NFSE_NACIONAL.md` | Pesquisa completa da NFS-e Nacional (endpoints, leiaute DPS, códigos, BH, regras de rejeição), com fonte por afirmação | Referência técnica |
| `pesquisa/PESQUISA_CONTABIL_E_TRIBUTARIA.md` | Pesquisa completa de escrituração, receita, tributos, plano de contas e lançamentos-modelo com razonetes | Referência contábil |

## Conexões com o resto do repositório

- **`src/domain/ledger.ts`** e **`src/server/db/derivar.ts`** — o livro-razão que as regras R6–R9 estendem.
- **`src/domain/dre.ts`** — a DRE; R12 pede ISS por tipo de serviço (hoje é alíquota única).
- **`src/domain/fees.ts`**, **`constants.ts`** — valores de comissão, custódia e tarifas (superfície protegida).
- **`src/lib/payments/`** e **`src/server/payments/conciliacao.ts`** — integração Mercado Pago descrita em
  `TAXAS_MERCADO_PAGO.md`.
- **`src/app/(admin)/admin/resultados/`** — Central de Resultados (financeiro e contábil) onde os relatórios aparecem.
- **`docs/TERMINOLOGIA_CONTABIL_LIVRO_RAZAO.md`** — a decisão anterior (21/10/2026) sobre retificação e ajuste, que R9
  amplia.
- **`docs/API_RELATORIOS.md`** — exportações que o contador já lê.

## Regras desta pasta

1. Status das regras: **[CONFIRMADO]** (notas ou fala do contador), **[LEI]** (texto oficial), **[PROPOSTA]** (precisa
   do aval do contador). Regra [PROPOSTA] não vira código sem resposta à pergunta correspondente.
2. Resposta do contador → atualizar `REGRAS_FISCAIS_E_CONTABEIS.md` (trocar o selo) e riscar a pergunta em
   `LACUNAS_E_PERGUNTAS.md`, no mesmo commit.
3. Os anexos de `pesquisa/` são o registro da pesquisa de 22/10/2026; não se reescrevem — fato novo entra nos
   documentos de cima.
