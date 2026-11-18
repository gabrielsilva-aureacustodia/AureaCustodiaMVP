# `src/lib/shipping/` — Correios e logística

Cliente dos Correios: frete, pré-postagem com etiqueta oficial, rastreio e CEP. Desde 22/10/2026 fala
com a **API CWS do contrato Platinum 1** (nº 9912766936, cartão de postagem 0080378641, DR 20).

## Arquivos

```
src/lib/shipping/
├── types.ts            Tipos do módulo; ModalidadeEnvio = 'PAC' | 'SEDEX'; dimensoesParaMoedas()
├── correios.ts         calcularFreteCorreios() — preço/prazo do contrato + o acréscimo do frete, ou tabela local sem contrato
├── acrescimo.ts        Regra pura do acréscimo (R$ 4,00 de padrão), a soma e a frase da tela (sem server-only)
├── acrescimo-vigente.ts O valor vigente em /admin/configuracao, lido por import() dinâmico (server-only)
├── tracking.ts         atualizarRastreiosEmLote() — a porta do job de rastreio
├── cep.ts              consultarCep() — CEP oficial dos Correios, ViaCEP de reserva (LGPD: nada gravado)
├── endereco-central.ts Caixa Postal 7990 (sem server-only: a tela lê o mesmo valor que a etiqueta)
├── index.ts            Barril de exportações (server-only por arrasto — tela importa endereco-central direto)
└── cws/                A API CWS — tudo server-only
    ├── config.ts       Variáveis CORREIOS_*, códigos de serviço, adicional de valor declarado
    ├── cliente.ts      chamarCws(): token de 24h pedido e renovado sozinho, 401 renova e repete uma vez
    ├── preco-prazo.ts  cotarServico(); reaisParaCents() ("31,59" → 3159)
    ├── prepostagem.ts  criarPrePostagem(), cancelarPrePostagem(), consultarPrePostagem(), baixarRotuloPdf()
    ├── rastro.ts       rastrearObjetos() em lotes de 50; status pelo código do evento SRO
    ├── cep.ts          consultarCepCorreios()
    └── cws.test.ts     Testes com fetch dublê (nenhum teste chama a API real)
```

## Variáveis de ambiente

| Variável | O que é |
|---|---|
| `CORREIOS_USUARIO` | Login do Meu Correios (o CNPJ, só números) |
| `CORREIOS_CODIGO_ACESSO` | Código de acesso gerado em cws.correios.com.br → Gestão de acesso a API's. **Segredo.** Gerar outro invalida o anterior |
| `CORREIOS_CARTAO_POSTAGEM` | `0080378641` |
| `CORREIOS_CONTRATO` | `9912766936` |
| `CORREIOS_DR` | `20` (Minas Gerais) |

Sem as cinco, `correiosConfigurado()` é falso: o frete vira **estimativa local** (`origem: 'tabela'`, e a tela diz
isso), o rastreio volta "indisponível" com o motivo, e a pré-postagem não acontece — o envio segue pelo balcão.
`CORREIOS_TOKEN` não existe mais: o token vence em 24h e é o servidor que o gera.

## Serviços do contrato que a plataforma usa

| Sentido | PAC | SEDEX | Quem paga |
|---|---|---|---|
| Entrada — cliente → custódia (**logística reversa**) | 03301 PAC REVERSO | 03247 SEDEX REVERSO | O cliente, no site, pelo preço do contrato **mais o acréscimo do frete**; os Correios faturam a Áurea só o contrato |
| Saída — custódia → cliente (retirada) | 03298 PAC CONTRATO AG | 03220 SEDEX CONTRATO AG | Coberto pela taxa de retirada (fixa, no painel): nenhuma ação cota a saída |

Valor declarado: **SEDEX usa o adicional `019`, PAC usa `064`** (019 no PAC dá `ERP-054`). Mínimo R$ 24,50.

## O acréscimo do frete (frente K, 18/11/2026 — item 11 do Rogério)

O cliente paga o preço do contrato **mais um valor por objeto postado**: R$ 4,00 de padrão, parâmetro
`acrescimoDoFreteCents` no grupo **Operacional** de `/admin/configuracao` (com histórico; **não é taxa de
negociação**, não toca `fees.ts` e não publica versão da Tabela de Taxas). Pedido do Rogério: "somar 4 reais no
valor do faturamento dos Correios"; o Gabriel confirmou em 18/11/2026 (D5): **por objeto postado, só no envio**.

- **Onde soma:** dentro de `calcularFreteCorreios`, para que a estimativa do passo 1, o frete que se paga e a tela
  leiam o mesmo número sem nenhuma Server Action saber dele. `acrescimoCents` na entrada fixa o valor (teste,
  script); sem ele vale o parâmetro vigente (`acrescimo-vigente.ts`).
- **O que a cotação devolve:** `valorContratoCents` (o que os Correios cobram — é com ele que se confere a fatura
  deles), `acrescimoCents` e `valorTotalCents` = contrato + acréscimo (o que o cliente paga).
- **O que se grava:** `Envio.frete.valorCents` é o **total cobrado** (saldo, Pix, cartão, ledger `frete` e o estorno
  do cancelamento leem esse número), com `valorContratoCents` e `acrescimoCents` ao lado. Frete cotado antes da
  frente K não tem os dois campos: o contrato é o próprio total (`dividirFreteCobrado`). `envios.frete` é jsonb:
  sem migration.
- **Parâmetro zerado** = frete igual ao contrato, como era. Valor inválido no banco vale zero, nunca reduz o frete.
- **Retirada:** não cota frete dos Correios; paga a taxa fixa do painel, e o acréscimo **não** vale para ela. Uma
  cotação de saída (nenhuma ação a faz hoje) sai sem acréscimo.
- **Fiscal (em aberto):** sem NFS-e e sem tratamento próprio na DRE até o contador responder — ver
  `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md`. O total entra no ledger `frete`, como todo frete.

## Regras que este módulo garante

1. **Nunca carta comum** — `ModalidadeEnvio` só tem PAC e SEDEX (risco de confisco de moeda circulante).
2. **Declaração de conteúdo** sempre "Moeda comemorativa / colecionável"; a DCe é emitida pelos Correios.
3. **Nenhum número inventado em silêncio.** Com contrato, falha dos Correios sobe como `ErroCorreios` com as
   mensagens deles; até 22/10/2026 ela caía calada numa tabela e a tela mostrava frete falso como oficial.
4. **O código de rastreio nasce na pré-postagem**, nos Correios. A API de rastreio só enxerga objetos do nosso
   contrato (`SRO-009: Objeto não pertence ao contrato`) — objeto postado pelo cliente no balcão não tem rastreio
   automático.
5. **Rastreio só pelo job agendado** (`src/server/shipping/rastreios.ts`), nunca por visita de tela.
6. **CEP sem histórico** (LGPD). Com contrato, CEP que a base oficial não conhece é inválido — nada de endereço
   de demonstração numa etiqueta de verdade.

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/server/shipping/` | Job de rastreio e repositório de retiradas; `frete-envio.ts` emite a pré-postagem do envio |
| `src/server/actions/custody.ts` | Cotação, pagamento do frete e etiqueta do envio |
| `src/server/actions/admin/logistica.ts` | Etiqueta da retirada pelo painel |
| `src/server/payments/conciliacao.ts` | Liquida o frete pago por Pix/cartão (`frete_envio`) |
| `src/app/api/envios/etiqueta/`, `src/app/api/retiradas/etiqueta/` | Servem o PDF oficial dos Correios |
| `src/app/api/cron/shipping/` | O job diário |

Execução e testes reais contra a API: `docs/EXECUCAO_CORREIOS_CWS.md`. Atalhos: `ATALHOS.md`.
