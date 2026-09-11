# Critical Debugs — Áurea Custódia

**Documento vivo · reescrito a cada leitura do repositório · lista de tarefas do agente**

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP · branch main
Base:        commit 2cc7194 — publicado e conferido em produção
Gerado em:   11/09/2026 — reescrito após o merge e após a execução do plano
             de pagamentos
Fonte:       repositório · Supabase (conferido por db:check) · navegador com dev no ar
Itens:       2 abertos + 1 observação. CD-11 foi RESOLVIDO em 11/09/2026 — a
             custódia antiga saiu do código e do banco (migration 013)
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
| **CD-12** | `src/domain/types.ts` não tem dono único | 🟠 Média | Baixo — é regra, não código |
| **CD-13** | Aviso de hidratação do React em produção | 🟡 Baixa | Baixo — só quando tocar em tema |
| **CD-08** | Migrar a persistência de produção para Postgres | 🟡 Baixa | — |
| **CD-09** | Comissão do extrato é recalculada, não congelada | 🟡 Baixa | Baixo |

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

# CD-13 — Aviso de hidratação do React em produção 🟡

**Sintoma.** O console de produção registra `Minified React error #418` em toda tela.

**Causa.** O script anti-flash de tema, no `<head>` do layout raiz, escreve `data-theme` no
`<body>` **antes** de o React hidratar — é ele que impede a tela de piscar branco em quem usa
tema claro. O React percebe que o DOM saiu do que o servidor mandou e registra o aviso.

**Consequência.** Nenhuma, hoje: o erro é **recuperável**, o React re-renderiza e todas as
telas foram conferidas em produção com o conteúdo certo. No servidor de desenvolvimento o
aviso nem aparece, o que é o motivo de ele ter passado tanto tempo sem ser notado.

**Idade.** Existe desde `ea0a5f3`, o commit do port original das doze telas. Não é regressão.

**Correção, quando alguém mexer em tema.** O caminho usual é `suppressHydrationWarning` no
elemento que o script altera, ou mover a decisão de tema para um cookie lido no servidor —
aí o HTML já nasce certo e o script deixa de ser necessário. **Não vale abrir uma tarefa só
para isso** enquanto não houver outro motivo para tocar no tema.

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
