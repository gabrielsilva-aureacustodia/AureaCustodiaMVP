# docs/alteracoes — registro de alterações do Guilherme

```
Projeto:     Áurea Custódia / Real Olímpico
Criado em:   18/09/2026
Escopo:      alterações feitas a partir de 18/09/2026 (não é retroativo)
Entrada:     RELATORIO-Guilherme.md — o relatório por dia
```

> **Como usar.** Esta pasta responde a duas perguntas diferentes, e é por isso que ela
> tem dois tipos de arquivo:
>
> - **"O que foi feito no dia 18?"** → `RELATORIO-Guilherme.md`, o relatório cronológico.
> - **"Por que este arquivo está assim?"** → o MD espelhado do próprio arquivo.
>
> Quem está retomando o trabalho lê o relatório. Quem abriu um arquivo e não entendeu
> uma linha lê o MD daquele arquivo.

---

## A regra

**Todo arquivo alterado ganha um MD correspondente**, com o mesmo caminho, sob
`docs/alteracoes/`, e o sufixo `-Guilherme`:

| Arquivo alterado | MD de documentação |
|---|---|
| `src/domain/market.ts` | `docs/alteracoes/src/domain/market.ts-Guilherme.md` |
| `src/app/(app)/vender/page.tsx` | `docs/alteracoes/src/app/(app)/vender/page.tsx-Guilherme.md` |
| `package.json` | `docs/alteracoes/package.json-Guilherme.md` |

**Por que o caminho é espelhado e não uma pasta plana.** Este projeto tem dezenas de
`page.tsx`, vários `README.md` e mais de um `route.ts`. Numa pasta plana, o segundo
`page.tsx` documentado sobrescreveria o primeiro — e o erro seria silencioso, porque
nada quebra: só a documentação errada fica no lugar da certa. O caminho completo torna
a colisão impossível por construção.

**A extensão do arquivo original fica no nome.** É `market.ts-Guilherme.md`, não
`market-Guilherme.md`. Assim `page.tsx` e um eventual `page.css` na mesma pasta não
disputam o mesmo MD.

---

## O que NÃO entra aqui

- **Os próprios arquivos desta pasta.** Documentar a documentação recursivamente não
  ajuda ninguém. O `RELATORIO-Guilherme.md` já registra quando esta pasta muda.
- **Arquivos gerados**: `package-lock.json`, `.next/`, `node_modules/`. O que importa
  é a decisão registrada em `package.json-Guilherme.md`, não o lock que a decisão gerou.
- **Alterações que não tocam arquivo**, como criar uma branch. Essas vivem só no
  relatório do dia.

---

## O modelo de um MD de arquivo

Cada MD acumula entradas **por data**, a mais recente no topo — um arquivo muda muitas
vezes ao longo do projeto, e o histórico dentro do próprio MD é o que mostra como ele
chegou ao estado atual.

```markdown
# src/domain/market.ts

**Arquivo:** `src/domain/market.ts`
**Camada:** domínio — regra de negócio pura
**Responsável:** Guilherme

---

## 18/09/2026 — Título curto da alteração

**O que foi alterado**

O que mudou de concreto, em nível de função ou de bloco. Nomes reais, não paráfrase.

**Por que foi alterado**

O motivo. Se corrigiu um defeito: qual era o sintoma e o que o causava. Se atendeu a
um pedido: de quem veio e o que se queria. Esta é a seção que justifica o MD existir —
o "o quê" o `git diff` já conta sozinho.

**O que observar**

Efeito colateral, risco, regra de negócio tocada, teste que cobre. O que a próxima
pessoa precisa saber antes de mexer aqui de novo.

**Commit:** `abc1234`
```

---

## Três regras que mantêm isto útil

**1. O MD entra no mesmo commit da alteração.** Documentação escrita depois é
documentação escrita de memória, e memória inventa motivo. Se o commit muda
`src/domain/fees.ts`, ele leva `docs/alteracoes/src/domain/fees.ts-Guilherme.md` junto.

**2. O "porquê" é obrigatório; o "o quê" é resumo.** O `git diff` já mostra cada linha
alterada com precisão perfeita — e não mostra nada sobre a intenção. Um MD que só
descreve o diff em português é trabalho perdido.

**3. Alteração na superfície protegida exige a decisão junto.** O `CLAUDE.md` lista
`src/domain/constants.ts`, `fees.ts`, `market.ts`, `types.ts`, o contrato de
`src/server/store/types.ts` e as Server Actions como pontos que exigem parada e
decisão dos sócios. Mexeu num deles, o MD registra **quem autorizou e quando** — não
basta o motivo técnico.
