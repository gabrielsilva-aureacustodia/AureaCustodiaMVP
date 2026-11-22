# Ficha da frente K — Frete: acréscimo de R$ 4,00

```
ID / branch:   K · manut-frete-mais-4             Onda de merge: 1          Migration reservada: 058 (só se a configuração exigir)
Item do Rogério: 11           Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: o frete cobrado do cliente passa a somar R$ 4,00 ao preço do contrato dos Correios, o valor é um parâmetro editável e o preço do contrato continua guardado à parte.
```

## Pedido do Rogério (as palavras dele)
"Somar 4 reais no valor do faturamento dos Correios."

## Interpretação adotada (a confirmar — **D5**)
Somar R$ 4,00 **ao frete que o site cobra do cliente**, **por objeto postado**, no **envio** (logística reversa) **e** na **retirada**. Hoje o frete é o preço do contrato, **sem margem** (decisão do Gabriel de 22/10/2026). Se o Rogério queria dizer outra coisa (por moeda; só no envio; ajuste na fatura que os Correios mandam), é uma linha para mudar.

## Aceite
- [ ] **Parâmetro `acrescimoDoFreteCents`** (padrão **400**) lido do valor vigente em `src/server/config/` e **editável em `/admin/configuracao`** com histórico (padrão do projeto). **Não é taxa de negociação:** **não** mexer em `TAXAS_PADRAO` nem em `fees.ts`.
- [ ] O valor cobrado = preço do contrato + acréscimo, na **cotação**, no **pagamento** (saldo, Pix, cartão), na **tela** e no **recibo da cobrança**. Texto padrão: "O valor do frete inclui R$ 4,00 de taxa de postagem" (**texto a ser aprovado pelo Gabriel**).
- [ ] **O preço do contrato continua guardado à parte** (`valorContratoCents` e `acrescimoCents`, ou equivalente) para conferir com a fatura que os Correios mandam. `Envio.frete.valorCents` passa a ser o **total cobrado** (contrato com H: o estorno devolve o total).
- [ ] **Fiscal:** o acréscimo **não** gera NFS-e nem entra na DRE por conta própria. Frete era repasse sem nota (contador, 23/10/2026); com acréscimo a classificação muda — **registre a pergunta ao contador** em `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` (você é o dono deste arquivo nesta rodada) e **não invente tratamento**.
- [ ] Testes: cotação com e sem acréscimo, retirada, parâmetro zerado, estorno devolvendo o total. `npm run typecheck` e `npm test` ao fim.

## Ler (e só isto)
`src/lib/shipping/README.md`, `correios.ts` (`calcularFreteCorreios`), `index.ts`, `types.ts` · `src/server/shipping/frete-envio.ts` · `src/server/config/` e `src/server/actions/admin/config.ts` (como o parâmetro vigente é lido e editado) · `docs/EXECUCAO_CORREIOS_CWS.md` · `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` (seção de frete) · `CLAUDE.md` (item "Correios por contrato").

## Touch
`src/lib/shipping/**` (**dono**) · `src/server/config/**` e a tela de configuração (**só** para o parâmetro novo) · `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` (uma linha).

## Do not touch
`src/server/actions/custody.ts` (B — o acréscimo entra **dentro** de `lib/shipping`, para que `custody.ts` não precise mudar) · `fees.ts`, `constants.ts` · `ledger.ts`/`dre.ts` · NFS-e.

## Fora de escopo
Mudar a modalidade (PAC/SEDEX), seguro, embalagem, negociar o contrato dos Correios.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Achar onde o preço do contrato vira valor cobrado (envio e retirada) | mapa no MD |
| T2 | Parâmetro vigente + tela de configuração | editável com histórico |
| T3 | Soma na cotação e no pagamento; contrato guardado à parte | testes |
| T4 | Texto na tela e no recibo + pergunta ao contador | texto no MD para aprovação |
| T5 | Suíte da branch | verde |

## Específico
Não.

## Superfície protegida
Provavelmente nenhuma. Se o parâmetro exigir tocar `constants.ts`/`fees.ts`, **pare** e use o mecanismo de configuração vigente.
