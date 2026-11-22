# Ficha da frente H — Cancelamento: envio, validação na bancada e nota fiscal

```
ID / branch:   H · manut-cancelar-envio-e-nota    Onda de merge: 3 (depois de B)    Migration reservada: 056 (só se precisar)
Itens do Rogério: 10a, 13 e 14   Prazo: URGENTE — o contador pede cancelar nota dentro do mês (até 30/11/2026, o quanto antes)   Base: 9e21fe1
Aceite em uma frase: dá para cancelar um envio não postado (cliente ou equipe) e a validação na bancada, e tudo que ele gerou — frete, 1º mês, nota fiscal e etiqueta — volta junto, sem estornar duas vezes.
```

## Pedidos do Rogério (as palavras dele)
- **10a:** "Cancelar a nota fiscal emitida para mim de 30 reais, pois não enviei as 15 moedas, cancelar o serviço, o faturamento, o envio e a NF (TULIO DISSE QUE É SEMPRE URGENTE CANCELAR AS NOTAS DENTRO DO MÊS OU O MAIS URGENTE POSSÍVEL)."
- **13:** "Fazer opção de cancelamento de validação na bancada quando o envio não for efetuado (WS de 9/11)."
- **14:** "Cancelar envios que não foram postados, achar uma opção (WS 9/11)."

## O que o código já faz (a frente confere antes de agir)
- `desconsiderarEnvio` (`src/domain/envios.ts`): envio sem postar em 3 dias é **desconsiderado** e **só o frete** volta ao saldo (`Envio.frete.status = 'estornado'`). **O 1º mês (fatura do plano) e a NFS-e dele não voltam** — o R$ 30 do Rogério (15 moedas × R$ 2,00) é exatamente esta lacuna.
- `estornarFaturaPaga` (`src/domain/quitar-fatura.ts`): estorno no ledger **e** cancelamento da NFS-e — **reaproveitar, não reescrever**.
- `PrePostagemRegistro.id` ("usado para cancelar") e `canceladaEm`: a etiqueta dos Correios pode ser cancelada.
- A análise na bancada é **append-only** (`Analise`, hash encadeado): **nada se corrige**; o cancelamento é um **registro novo**.

## Aceite
- [ ] **T1 — `MAPA_DO_CANCELAMENTO.md`:** o que um envio gera (frete, pré-postagem, plano/fatura do 1º mês, NFS-e, análise aberta, moedas/recibos se já aceitas) e **o que cada cancelamento desfaz**; o que existe × a lacuna.
- [ ] **Cliente cancela** envio **não postado** (`envios/page.tsx`, botão na lista): devolve o frete, devolve o 1º mês (`estornarFaturaPaga`: ledger + NFS-e cancelada), **cancela a pré-postagem** nos Correios, marca o envio `cancelado` com motivo. **Histórico nunca se apaga.**
- [ ] **Equipe cancela** (`/admin/logistica`, permissão de logística existente; grava `admin.logistica.cancelar_envio` em `audit_log`; **motivo obrigatório**) — para envio vencido, abandonado ou a pedido.
- [ ] **Cancelar validação na bancada** (`/admin/bancada`): análise aberta cujo envio não chegou ou não foi feito → botão **"Cancelar validação"**: encerra a análise **sem criar moeda**, como **registro novo** (a fórmula do hash e `CAMPOS_DA_ANALISE` **não mudam**) e dispara o mesmo estorno.
- [ ] **Automático:** o "desconsiderado em 3 dias" passa a devolver **também o 1º mês** e a cancelar a NFS-e dele.
- [ ] **NFS-e:** o cancelamento sai pelo caminho existente (`src/domain/nfse/eventos.ts`, `src/server/nfse/sefin.ts`); registrar a data do evento e **conferir a janela de cancelamento** (o contador exige dentro do mês).
- [ ] **Idempotência** (cancelar duas vezes não estorna duas) e **atomicidade** (tudo na mesma `mutateState`). **Moeda já aceita** na análise **não** cancela: orienta (o caminho é a retirada).
- [ ] Testes por cenário: só frete; frete + 1º mês; com etiqueta; já postado (recusa); análise aberta; moeda aceita (recusa); duplo clique.
- [ ] **O caso do Rogério — procedimento pronto e NÃO executado:** consulta de leitura (`BEGIN READ ONLY`) que acha o envio e a NFS-e de R$ 30, e o passo a passo no painel. **Quem executa em produção é o Controle, depois do "sim" do Gabriel.**

## Ler (e só isto)
`src/domain/envios.ts` e `envios.test.ts` · `src/server/shipping/frete-envio.ts` · `src/domain/quitar-fatura.ts` · `src/domain/nfse/eventos.ts`, `pedidos.ts` · `src/server/nfse/emissao.ts`, `sefin.ts` · `src/server/actions/admin/logistica.ts`, `bancada.ts` · `src/server/estacao/analise.ts`, `src/domain/analise.ts` (**ler**, não mudar o hash) · `src/app/(app)/envios/page.tsx` (**só** a lista) · `src/components/admin/bancada/BancadaWeb.tsx` · `src/lib/shipping/cws/` (cancelar pré-postagem) · `docs/PLANO_CANCELAMENTO_COBRANCA_MERCADOPAGO.md` · `docs/EXECUCAO_CORREIOS_CWS.md` · `docs/fiscal-contabil/` (cancelamento de NFS-e).

## Touch
`src/domain/envios.ts` · `src/server/shipping/frete-envio.ts` · **novos** `src/domain/cancelar-envio.ts` e `src/server/actions/cancelar-envio.ts` · `src/server/actions/admin/bancada.ts`, `admin/logistica.ts` · `src/components/admin/bancada/*` · `src/components/envios/CancelarEnvio.tsx` (novo) + **uma linha** na lista de `envios/page.tsx`.

## Do not touch
`src/server/actions/custody.ts` (B — use arquivo novo) · `src/domain/quitar-fatura.ts` (use) · `src/domain/nfse/codigos.ts` (decisão fiscal) · `CAMPOS_DA_ANALISE` e a fórmula do hash · o wizard de envio (B).

## Fora de escopo
Reembolso fora do saldo (devolver dinheiro ao banco/cartão do cliente), cancelar moeda já aceita, mudar a regra dos 3 dias.

## Contratos
- **B↔H:** *tudo o que um envio gerou se acha pelo protocolo.* Leia o `registro/B.md` para saber como B ligou o 1º mês; escreva o estorno contra esse contrato e **teste com fixture** enquanto B não termina.
- **H→F:** cada estorno que H cria precisa aparecer no extrato (F valida).
- **H→K:** o estorno de frete devolve **o total cobrado** (`Envio.frete.valorCents`, incluindo o acréscimo da K, se houver).

## Superfície protegida (anotar)
`types.ts`: campos **opcionais** de cancelamento (por exemplo `canceladoEm`, `motivoCancelamento`, status). Server Actions: dentro do pedido.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Mapa do cancelamento (com o Específico) | `MAPA_DO_CANCELAMENTO.md` |
| T2 | Núcleo no domínio: cancelar envio (frete + 1º mês + NFS-e + etiqueta), idempotente | testes por cenário |
| T3 | Ação do cliente + botão na lista | navegador local |
| T4 | Ação da equipe em `/admin/logistica` com motivo e `audit_log` | teste de permissão e auditoria |
| T5 | "Cancelar validação" na bancada (registro novo, hash intacto) | teste do hash |
| T6 | Desconsiderar automático devolve também o 1º mês e a nota | teste |
| T7 | Procedimento do caso do Rogério + suíte da branch | verde; procedimento no MD |

## Específico (sim)
(1) API dos Correios para **cancelar pré-postagem** (como o projeto já a chama, `lib/shipping/cws`); (2) **achar o caso do Rogério em produção, somente leitura**, e entregar a consulta e o resultado (sem dados pessoais além do necessário).

## Prioridade
**Máxima do pacote.** Se faltar capacidade no Controle, H e B têm preferência.
