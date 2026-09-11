# Critical Debugs — Áurea Custódia

**Documento vivo · reescrito a cada leitura do repositório · lista de tarefas do agente**

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP · branch main
Base:        commit ab3db39 — as três frentes da publicação mergeadas
Gerado em:   11/09/2026 — reescrito após o merge B -> C -> A
Fonte:       repositório · Supabase (conferido por db:check) · navegador com dev no ar
Itens:       4 abertos — 1 defeito de produto, 2 decisões, 1 dívida técnica antiga
```

> **Como usar.** O agente lê este documento **depois** do Ritual de Sessão. Cada item traz
> sintoma, causa, consequência, correção passo a passo e teste de aceite.
>
> **Item resolvido sai deste documento.** O registro de que existiu fica no
> `VERSION_COMPARISON_DAILY.md`.

---

## Índice

| ID | Título | Gravidade | Esforço |
|---|---|---|---|
| **CD-11** | A custódia informa ao cliente um preço que não é o vigente | 🔴 Alta | Médio — depende de decisão |
| **CD-12** | `src/domain/types.ts` não tem dono único | 🟠 Média | Baixo — é regra, não código |
| **CD-08** | Migrar a persistência de produção para Postgres | 🟡 Baixa | — |
| **CD-09** | Comissão do extrato é recalculada, não congelada | 🟡 Baixa | Baixo |

---

# CD-11 — A custódia informa ao cliente um preço que não é o vigente 🔴

**Sintoma.** Em `/conta/extrato`, um sócio com 15 moedas lê:

> `10/09/2026 · Taxa de custódia · Custódia anual de 15 moeda(s) — Pago · R$ 25,00`

Três coisas erradas numa linha só. O modelo vigente é **mensal**, não anual. O valor mensal
de 15 moedas seria R$ 30,00, não R$ 25,00. E R$ 25,00 é valor da **tabela de faixas que a
decisão D-3 aposentou**.

Em `/envios` o mesmo problema com outra roupa: "Taxa de custódia anual (**nova faixa**)" —
"faixa" descreve exatamente o modelo que deixou de existir.

**Causa.** A transição da D-3 ficou pela metade. A frente B construiu o modelo novo
(`faturas_custodia`, faturamento mensal, inadimplência), mas o mecanismo antigo não foi
removido: `state.custodyCharges` continua sendo preenchido pelo seed e continua sendo a fonte
de três textos visíveis. Além disso, `custodyFeeForCount` — que a D-3 mandou sair do código —
sobreviveu como apelido apontando para o cálculo mensal, então o rótulo diz "anual" e a conta
por trás é mensal. Os R$ 25,00 são linha antiga já gravada no Postgres, do tempo das faixas.

**Consequência.** A plataforma comunica um preço de custódia que não corresponde ao que a
empresa decidiu cobrar. Para uma empresa que está sendo cuidadosa com o que promete por
escrito, isso é mais sério do que um defeito de tela.

**Onde está.**

```
src/domain/statement.ts:180    "Custódia anual de N moeda(s)"
src/domain/ledger.ts:207       idem, no livro-razão do contador
src/app/(app)/envios/page.tsx:674  "Taxa de custódia anual (nova faixa)"
src/domain/seed.ts:248         alimenta custodyCharges com custodyFeeForCount
src/domain/fees.ts:43          custodyFeeForCount, o apelido que deveria ter saído
```

**A decisão saiu em 11/09/2026: o `custodyCharges` legado SAI**, e as faturas mensais da
frente B assumem sozinhas. Está registrada na seção 5 do plano executivo, como conclusão da
D-3.

**A execução é o bloco 6 de** `docs/publish_docs/PLANO_PAGAMENTOS_E_CADASTRO.md`. Ela mexe em
`fees.ts` e `types.ts` — superfície protegida, autorizada por essa decisão —, tira
`custodyCharges` do `AppState`, e por isso **sobe `STORE_KEY` para v8 com a migration 013**.
Anda sozinha, sem nada em paralelo: foi sobreposição desse tipo que produziu os dois defeitos
do merge anterior.

**Teste de aceite.** Um sócio abre `/conta/extrato` e lê uma linha de custódia cujo período e
cujo valor batem com a tabela de preços vigente do plano executivo. A palavra "faixa" não
aparece em nenhuma tela.

---

# CD-12 — `src/domain/types.ts` não tem dono único 🟠

**Sintoma.** No merge de 11/09/2026, `src/domain/types.ts` foi o único arquivo que conflitou
nas três frentes. Investigando: a frente B escreveu os tipos da **retirada física**, que são
da frente C. A frente C escreveu os tipos de **aceite legal**, que são da frente A, idênticos
até nos comentários. Quando a frente A entrou, o lado dela do conflito estava **vazio**.

**Causa.** O plano prometia "território de arquivos" por frente, mas `types.ts` é a fonte da
verdade do modelo de dados inteiro — toda frente precisa acrescentar algo ali. Sem um dono
declarado, cada uma escreveu o que precisava, inclusive o que era de outra.

**Consequência.** Desta vez não houve prejuízo porque as definições batiam. Foi sorte, não
desenho: duas frentes escrevendo o mesmo tipo com campos diferentes fariam o merge escolher
um dos dois, e o sistema compilaria com o modelo errado — sem erro, sem teste vermelho.

**Correção.** É regra de processo, não linha de código:

1. `src/domain/types.ts` passa a ter **dono único por rodada** de trabalho paralelo.
2. Frente que precisa de um tipo de outra frente **pede**, não escreve.
3. O `PROTOCOLO_DO_AGENTE.md` ganha isso na regra 5, junto com a superfície protegida.

**Teste de aceite.** Na próxima rodada paralela, `git diff --name-only` de duas branches
quaisquer não mostra `src/domain/types.ts` nas duas.

---

# CD-08 — Migrar a persistência de produção para Postgres 🟡

Mantido da leitura anterior. O Supabase está ligado e com as doze migrations aplicadas, mas
`aurea.aurea_state` — o blob antigo — ainda existe no schema e sai na migration de limpeza do
passo 9 do M1. Ver `docs/prompts/AGENTE_B2_POS_PRODUCAO.md`.

---

# CD-09 — Comissão do extrato é recalculada, não congelada 🟡

Mantido da leitura anterior, e agora com um detalhe novo: o campo `Trade.fee` existe e é
preenchido pela camada de banco, mas `src/domain/statement.ts` continua recalculando com
`tradeFee(price) * qty` em vez de ler o valor gravado. Enquanto a fórmula não mudar, os dois
dão o mesmo número. No dia em que a comissão mudar, o extrato passa a reescrever o passado.

Registrado como RA-06. A troca é decisão dos sócios (CD-09 original).
