# src/server/db/sql-injecao.test.ts

**Arquivo:** `src/server/db/sql-injecao.test.ts`
**Camada:** teste
**Responsável:** Guilherme
**Companheiro:** `sql-injecao.baseline.json` — arquivo gerado, sem MD próprio por ser saída de comando

---

## 19/09/2026 — Criado: linha de base contra SQL injection

**O que foi alterado**

Arquivo novo. Um varredor de caracteres percorre o código, identifica os template
literals que são comandos SQL e extrai as interpolações de cada um. O resultado é
comparado com `sql-injecao.baseline.json`, que registra o que já foi auditado.
Interpolação nova reprova a suíte.

A base atual: **32 arquivos, 56 interpolações, 17 expressões distintas** — todas
verificadas à mão. São nomes de schema e tabela vindos de constante (`${S}`, `${SCHEMA}`,
`${TABLE}`), listas fixas de colunas (`${COLUNAS}`, `${colunasPapel(S)}`), fragmentos
literais de `WHERE` (`${where}`, `${condicoes.join(' AND ')}`) e os `$N` devolvidos por
`param()`.

**Por que foi alterado**

A auditoria de 19/09/2026 varreu os 35 arquivos que executam SQL e **não encontrou
nenhum vetor de injeção**: o repositório interpola o nome do schema e parametriza todo
valor. Mas aquilo foi um retrato de um dia, e nada obrigava a próxima consulta a seguir o
padrão. Este teste transforma "conferimos uma vez" em "é conferido a cada execução".

**O que observar**

**Linha de base, não heurística.** Uma regra esperta ("reprove se não parecer seguro")
erra nos dois sentidos: deixa passar o perigoso e reclama do inofensivo. Falso positivo
vira desabilitação, e guarda desabilitada não guarda nada. Com base registrada, o ruído
hoje é zero e todo SQL novo passa por revisão obrigatória.

**O varredor conta chaves em vez de usar regex** porque o código tem template aninhado de
verdade — `param(...)` com um template dentro —, e regex não conta chaves.

O detector usa `(?<!/)` antes das palavras-chave de SQL. Sem isso, a URL da API do Google
Sheets entra na varredura porque `/values/` casa com `VALUES`. Não era risco, mas fazia o
teste reprovar por motivo que não é dele — e teste que reclama do que não interessa é
teste que ninguém lê. A correção reduziu a base de 19 para 17 expressões.

**Para atualizar depois de revisar uma interpolação nova:**

```
ATUALIZAR_BASELINE=1 npx vitest run src/server/db/sql-injecao.test.ts
```

O diff da base entra no commit e fica visível na revisão. Rodar isso sem olhar o que
mudou desmonta a guarda inteira.
