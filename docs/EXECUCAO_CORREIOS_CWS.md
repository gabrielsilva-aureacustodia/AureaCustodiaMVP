# Execução — integração com a API CWS dos Correios (contrato Platinum 1)

Branch `feat/correios-cws` (a partir de `main` em `c68b24b`). Aberta em 22/10/2026.
Este MD é material de trabalho: não se commita antes do fim da execução (ver memória
`commit-so-depois-do-merge`). Atualizado a cada tópico fechado.

## O que mudou no mundo

A AUREA CUSTODIA LTDA tem contrato com os Correios (nº 9912766936, cartão de postagem
0080378641, DR 20). Com ele vem a API CWS (`https://api.correios.com.br`), que substitui o que o
código fazia "de faz de conta":

| Antes (até 22/10/2026) | Agora |
|---|---|
| `CORREIOS_TOKEN` fixo no ambiente — vence em 24h e o código caía calado no adaptador simulado | Token gerado pelo servidor com usuário + código de acesso, guardado em memória e renovado antes de vencer |
| Frete tabelado inventado (`baseFreteCents = 2800`) | Preço e prazo reais do contrato (APIs Preço e Prazo) |
| Cliente postava no balcão pagando varejo e digitava o código | **Cliente paga o frete do contrato no site**; o servidor gera a pré-postagem de **logística reversa** e a etiqueta oficial dos Correios; o código de rastreio nasce nos Correios |
| Rastreio em `/sro/v1/objetos` (endereço errado) e campo `dtCriacao` (não existe) | `/srorastro/v1/objetos`, até 50 códigos por chamada, campo `dtHrCriado` |
| Retirada: operador digitava o código | Painel gera a pré-postagem de saída e imprime a etiqueta oficial |
| CEP pelo ViaCEP | CEP oficial dos Correios, com ViaCEP de reserva |

**Decisão do Gabriel (22/10/2026): o cliente paga o frete do envio no site**, pelo preço do
contrato, sem margem (repasse). Formas: saldo, Pix ou cartão — o mesmo painel da retirada.

**Regra técnica que pesa na decisão:** a API de rastreio só devolve eventos de objetos do NOSSO
contrato (`SRO-009: Objeto não pertence ao contrato`). Objeto postado no balcão pelo cliente não
tem rastreio automático; por isso o envio passa a nascer como pré-postagem do contrato.

## Variáveis de ambiente (já cadastradas na Vercel e no `.env.local`)

```
CORREIOS_USUARIO          login do Meu Correios (CNPJ)
CORREIOS_CODIGO_ACESSO    código de acesso gerado no CWS (segredo)
CORREIOS_CARTAO_POSTAGEM  0080378641
CORREIOS_CONTRATO         9912766936
CORREIOS_DR               20
```

`CORREIOS_TOKEN` deixa de existir. Sem as variáveis, frete e rastreio caem no adaptador
determinístico (desenvolvimento local), **e a tela diz isso** — nunca em silêncio.

## O que os testes reais de 22/10/2026 mostraram

- Token por cartão de postagem: produção, 24h, 14 APIs liberadas.
- Preço (SP→BH, 300 g, caixa 16×11×6, VD R$ 300): SEDEX contrato (03220) e SEDEX reverso (03247)
  R$ 31,59; PAC contrato (03298) e PAC reverso (03301) R$ 21,14. **Valor declarado: SEDEX usa o
  adicional `019`, PAC usa `064`** (019 no PAC dá `ERP-054`).
- Prazo: SEDEX 1 dia útil, PAC 5 (SP→BH).
- Pré-postagem reversa (`logisticaReversa: "S"`, serviço 03301) criada e **cancelada** no mesmo
  minuto: devolve `id` (`PRI…`), `codigoObjeto` (`AP…BR`), status 7→2 (Pendente→Pré-postado),
  `modalidadePagamento: 2` (a faturar), validade padrão de 90 dias, DCe emitida pelos Correios,
  e acrescenta sozinho o adicional `015` (posta restante) por o destino ser caixa postal.
- Rótulo: `POST /v1/prepostagens/rotulo/assincrono/pdf` → `idRecibo`; `GET
  /v1/prepostagens/rotulo/download/assincrono/{idRecibo}` → `{ dados: <PDF base64>, nome }`.
  O PDF sai com "Contrato 9912766936 · PAC REVERSO", código de barras e destinatário.
- Rastro: o objeto pré-postado já tem evento `FC/82` "Etiqueta emitida — Aguardando postagem";
  cancelado vira `FC/84`.
- Cancelamento: `DELETE /v1/prepostagens/{id}` → `{"resultadoCancelamento":"Cancelamento realizado com sucesso!"}`.

## Contratos compartilhados (fundação — tópico 1)

`src/lib/shipping/cws/` (tudo `server-only`):

| Arquivo | Exporta |
|---|---|
| `config.ts` | `lerConfigCorreios()`, `correiosConfigurado()`, `SERVICOS_CORREIOS`, `ADICIONAL_VALOR_DECLARADO` |
| `cliente.ts` | `chamarCws()`, `ErroCorreios`, `_resetTokenParaTestes()` |
| `preco-prazo.ts` | `cotarServico()` |
| `prepostagem.ts` | `criarPrePostagem()`, `cancelarPrePostagem()`, `baixarRotuloPdf()`, `consultarPrePostagem()` |
| `rastro.ts` | `rastrearObjetos()` (lote de até 50), `statusDoEvento()` |
| `cep.ts` | `consultarCepCorreios()` |

Serviços: entrada (cliente → custódia, logística reversa) **PAC 03301 / SEDEX 03247**; saída
(custódia → cliente, retirada) **PAC 03298 / SEDEX 03220**.

## Camada compartilhada (já feita no tópico 1 — os agentes NÃO editam)

- `src/domain/types.ts`: `Envio.frete?: FreteEnvio | null`, `Envio.prePostagem?: PrePostagemRegistro | null`,
  `Retirada.prePostagem?: PrePostagemRegistro | null`, e as interfaces `FreteEnvio` e `PrePostagemRegistro`.
- `src/server/db/migrations/043_correios_contrato.sql`: colunas `envios.frete`, `envios.pre_postagem`,
  `retiradas.pre_postagem` (jsonb); ledger aceita `frete`; intenções aceitam `frete_envio`.
- `src/server/db/repositories/envios.ts`, `retiradas.ts` e `normalizarEnvio` em `src/server/db/diff.ts`
  já gravam e leem os campos novos.
- `src/lib/shipping/**` inteiro (fundação). Quem precisar de algo novo ali, pede — não edita.

## Acordos entre os tópicos (o que um entrega e o outro usa)

1. **Envio:** ao emitir a pré-postagem, grava `envio.prePostagem` **e** `envio.codigoRastreio =
   prePostagem.codigoObjeto`. A etapa continua "Protocolo gerado" e `dataPostagem` continua `null` — quem
   marca a postagem é o rastreio, quando os Correios registram o objeto.
2. **Retirada:** ao emitir a etiqueta pelo painel, grava `retirada.prePostagem` e `retirada.codigoRastreio`, e
   leva a retirada de `paga` para `separacao` (se já estiver em `separacao`, só grava). Não marca `postada`.
3. **Rastreio:** o job consulta (a) envios com `codigoRastreio`, fora da última etapa e não desconsiderados,
   e (b) retiradas em `separacao` ou `postada` com código. Avança sozinho:
   - envio em "Protocolo gerado" → "Envio postado" quando o último status do SRO for `postado`,
     `em_transito`, `saiu_para_entrega`, `aguardando_retirada` ou `entregue` (`dataPostagem` = hora do
     primeiro evento que não seja `aguardando_postagem`/`cancelado`);
   - retirada `separacao` → `postada` na mesma condição, e `postada` → `entregue` quando `entregue`.
   "Recebido pela custódia" passou a vir do "entregue" dos Correios em 30/10/2026 (a marcação manual não tinha mais tela); ver `docs/diario/execucoes/2026-10-30--balcao-correios.md`.

## Tópicos

1. **Fundação CWS** — os arquivos acima, `calcularFreteCorreios` real, `consultarCep` com CEP
   oficial, testes com `fetch` dublê. (eu)
2. **Envio com frete pago** — `Envio.frete` e `Envio.prePostagem` no domínio; ações de cotar,
   pagar (saldo/Pix/cartão) e emitir a pré-postagem; tipo de pagamento `frete_envio` na
   conciliação; lançamento `frete` no ledger (migration 043 com a lista inteira) e na DRE;
   passo 4 da tela de envio; rota da etiqueta servindo o PDF oficial. (agente)
3. **Retirada com etiqueta oficial** — ação do painel que emite a pré-postagem de saída, grava o
   código e leva a retirada de `paga` para `separacao` (acordo 2); rota de etiqueta da retirada servindo o PDF oficial;
   botão no `/admin/logistica`. (agente)
4. **Rastreio** — `atualizarRastreiosEmLote` sobre `rastrearObjetos`; o job avança o envio de
   "Protocolo gerado" para "Envio postado" quando os Correios registram a postagem, e a retirada
   de `postada` para `entregue` quando entregue; `/api/rastreios` e integrações leem
   `correiosConfigurado()`. (agente)
5. **Integração e documentação** — suíte, typecheck, build, READMEs, `.env.example`,
   `INTEGRACOES_O_QUE_FALTA.md`, `RISCOS_ASSUMIDOS.md` + `ATALHOS.md`, CLAUDE.md. (eu)

## Andamento

- [x] 1. Fundação (22/10) — `src/lib/shipping/cws/`, tipos, migration 043, repositórios; 29 testes
- [x] 2. Envio (22/10) — `src/server/shipping/frete-envio.ts`, ações de frete em `custody.ts`, `frete_envio` na conciliação, ledger `frete`, DRE "Frete repassado ao cliente", varredura de envios vencidos no cron, passo 4 da tela com cotação real (conferida no navegador: SEDEX R$ 32,80 / PAC R$ 23,18 para 2 moedas SP→BH)
- [x] 3. Retirada (22/10) — `src/server/actions/admin/logistica.ts` (emitir/cancelar/postar manual), rota da etiqueta em PDF, `ExpedicaoDaRetirada` no painel; 72 testes da área verdes
- [x] 4. Rastreio (22/10) — job com avanço automático (envio postado; retirada postada/entregue), retrato bom não é apagado por `indisponivel`/`nao_encontrado`, rótulos em `src/domain/rastreio.ts`, integrações e `.env.example` com as cinco variáveis
- [x] 5. Integração e docs (22/10) — 146 arquivos / 1.346 testes verdes, typecheck e build limpos; READMEs, RA-59, INTEGRACOES, CLAUDE.md. **Falta:** aplicar a migration 043 em produção junto do commit
