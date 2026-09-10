# Version Comparison — RESUMO DO DIA

**10/09/2026 · `31558c4` versus `657dd9f` (06/09/2026)**

> Uma página. O que mudou de comportamento desde a última leitura, e o que isso te obriga a
> decidir. A história completa fica em `VERSION_COMPARISON_DAILY.md`, entrada 010.

---

## O que mudou de comportamento desde 06/09

**No sistema: nada.** Nenhuma linha de código de produção mudou nesta sessão. Os seis commits
que apareceram na `origin/main` são merges das pull requests do fork — o método de publicação
funcionando, não mudança de comportamento. O `git diff` entre a sua branch e a `origin/main`
é vazio.

**No projeto: a última frente parada saiu do lugar.** A frente E — o software de análise de
moedas na bancada — estava bloqueada desde 01/09 esperando cinco decisões suas. Agora tem
plano executivo, e o bloqueio caiu de cinco decisões para três.

---

## As duas decisões que você não precisa mais tomar

Elas já estavam respondidas pelo código, e ninguém tinha olhado:

| Pergunta que estava na sua fila | Resposta que o código já dá |
|---|---|
| O número da moeda (`RO-000042`) é reservado antes ou depois da análise? | **Depois.** O código só gera o número quando a etapa chega em "Recibo emitido". Sua sequência já nasce sem buracos |
| Como impedir que duas bancadas peguem o mesmo número? | **Já está impedido.** Toda gravação de estado roda dentro de uma trava do banco. Não dá para duas pegarem o mesmo |

---

## As três que continuam com você

Nenhuma trava a primeira análise. Todas ficam caras se forem respondidas com o cofre cheio.

1. Moeda recusada é **devolvida**, **descartada** ou **guardada** aguardando o cliente? Quem
   paga o frete da devolução?
2. Qual a estrutura física real do cofre — prateleiras, gavetas por prateleira, posições por
   gaveta?
3. Existe **reanálise** quando o cliente discorda da recusa?

---

## Estado das cinco frentes

| Frente | Estado |
|---|---|
| A — banco, ledger e relatórios | Entregue |
| B — login e landing | Entregue |
| C — pagamentos (Mercado Pago) | Entregue |
| D — Correios e logística | Entregue |
| **E — estação de análise** | **Plano escrito, execução por começar** |

Quatro de cinco de pé. O que falta para a plataforma fechar o ciclo é a bancada — o ponto em
que a moeda física vira ativo digital.

---

## Uma armadilha encontrada antes de custar caro

A configuração do TypeScript na raiz compila **todo** arquivo `.ts` do repositório. No minuto
em que a pasta do programa da bancada existir, o build da Vercel quebra — por um motivo que
não se parece com a causa. A correção é uma linha, e ela precisa vir **antes** do primeiro
arquivo do programa, não depois. Está como ação 4 em `PRIMEIRAS_ACOES_DO_DIA.md`.

---

## Base do repositório

| Verificação | Resultado |
|---|---|
| Tipagem | ✅ limpa |
| Testes | ✅ 161 passando |
| Build | ✅ verde |

---

## O que fazer com isto

Ler `docs/PLANO_EXECUTIVO_ESTACAO.md`, seção 2 — as nove funções da bancada. Depois seguir
`PRIMEIRAS_ACOES_DO_DIA.md`.
