# AG5 — Bancada: numeração, peso e caixa já pré-preenchidos

Branch: `exec/ag5-bancada-preenchimento`. Independente das outras.

## Por que

Hoje, ao fechar a análise, o operador digita **tudo** à mão: número da moeda,
peso e caixa. Com 100 moedas num dia — o que aconteceu em 21/09/2026 — isso
deixa de ser digitação e vira fonte de erro: um número pulado quebra a sequência
do acervo, um peso errado entra na fórmula do hash e só se corrige recalculando
a corrente inteira desde o GENESIS.

Nada aqui trava nada. Tudo continua **editável** — o objetivo é que o campo
chegue certo, não que ele fique preso.

## O que fazer

### 1. Numeração sequencial automática

A posição da moeda vem pré-preenchida pela **próxima vaga da caixa
selecionada**. Se a caixa já tem 50 moedas, a próxima é a 51; analisando 20
moedas de uma vez, elas saem 51, 52, 53… até 70.

A ocupação atual de cada caixa já é conhecida — `OcupacaoDaCaixa` em
`src/domain/admin/caixas.ts`, carregada em `BancadaWeb.tsx` como `caixasIniciais`.

Trocar a caixa selecionada **recalcula** a sequência a partir da ocupação da
caixa nova. Um número editado à mão pelo operador não pode ser sobrescrito por
esse recálculo sem que ele perceba.

### 2. Peso padrão do tipo de moeda

O campo `gramas` vem pré-preenchido com o peso padrão do tipo
(`CoinType.pesoPadraoMg` em `src/domain/constants.ts`: 7000 mg para a Entrega da
Bandeira Olímpica, 7840 mg para Direitos Humanos).

Continua editável, e é isso que dá sentido à reprovação: se a balança acusar
outro peso, o operador digita o que viu e reprova com motivo. Reprovar sem
registrar o peso real é reprovar sem prova.

Hoje `BancadaWeb.tsx:38` já preenche o campo quando `item.pesoInicialMg` existe;
o que falta é o padrão do catálogo quando não existe.

### 3. Caixa certa pré-selecionada

A caixa vem pré-selecionada como a **caixa corrente**: aquela onde a última
moeda foi guardada, enquanto houver vaga. Cheia, a seleção passa para a próxima
caixa cadastrada e ativa (EB-001 lotada → EB-002).

O campo hoje é um `<input list="adm-bancada-caixas">` vazio
(`BancadaWeb.tsx:219`), com o `datalist` já filtrando por `cadastrada && ativa`.

## Ordem de leitura

1. `CLAUDE.md`
2. `src/components/admin/bancada/BancadaWeb.tsx` — o formulário inteiro
3. `src/components/admin/bancada/QuadroDeCaixas.tsx`
4. `src/domain/admin/caixas.ts` — `OcupacaoDaCaixa`, capacidade e ocupação
5. `src/server/estacao/analise.ts` — o que o fechamento faz com esses campos
6. `src/server/admin/bancada.ts` — `fecharPelaBancadaWeb`
7. `src/domain/constants.ts` — `pesoPadraoMg` por tipo

## Cuidados

- **O peso entra na fórmula do hash** (`CAMPOS_DA_ANALISE` em
  `src/domain/hash.ts`). Pré-preencher é conveniência de tela; o valor gravado é
  o que estiver no campo na hora de fechar. Não invente peso no servidor.
- A sugestão de número e caixa é **cálculo de tela**, mas a unicidade é do
  servidor: duas bancadas abertas ao mesmo tempo sugeririam a mesma vaga. O
  fechamento precisa recusar posição já ocupada, com mensagem clara, em vez de
  gravar duas moedas na mesma vaga.
- Não mexer na fórmula do hash nem no serviço de fechamento. A bancada web e a
  estação física fecham pelo **mesmo** `src/server/estacao/analise.ts`.

## Fechamento

Sem commit. Rode typecheck, lint, teste e build **uma vez, no fim**, só para
confirmar que a branch está de pé, e **avise que terminou**. O merge e o commit
são feitos depois, por um agente só, com todas as branches juntas.
