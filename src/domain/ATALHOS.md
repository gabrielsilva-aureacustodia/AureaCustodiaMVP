# Atalhos assumidos nesta pasta

> Notas locais dos atalhos de teste e segurança tomados em `src/domain/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../RISCOS_ASSUMIDOS.md).

**Esta é a pasta mais bem coberta do repositório** — 38 testes em quatro arquivos. Os
atalhos abaixo são pontuais e conhecidos, não lacunas de cobertura.

---

## RA-05 🟠 — o hash do recibo é simulado

**Arquivo:** `codes.ts`, função `genHash()`

```typescript
// gera '0xA1B2...C3D4' com Math.random()
```

O recibo NFT exibe um hash com cara de registro on-chain que **não prova nada**: não é
determinístico (a mesma moeda gera hash diferente a cada chamada), não é encadeado, e não
se reproduz em outra máquina.

**Isto é declarado, não escondido.** O rótulo "código simulado" no QR do recibo é requisito
de negócio e não sai — a interface não pode sugerir verificação externa que não existe.

**Como se paga:** SHA-256 determinístico e encadeado, com a fórmula **documentada e
congelada** (quais campos entram, em que ordem, com que separador e normalização — um
espaço a mais muda o hash). Compartilha implementação com a trilha de auditoria da Fase 3 e
com o hash da estação de validação física.

**Atualização de 03/09/2026 (frente B, M4):** a implementação existe — `hash.ts` é o SHA-256
puro com a fórmula congelada, e o ledger já a usa em toda linha. **O recibo NFT continua com
`genHash()`**: trocar o hash de recibos já emitidos muda o texto do certificado, e a regra de
transição é decisão dos sócios (ver `docs/EXECUCAO_AGENTE_B_LEDGER_DRE.md`, 4.5). Metade paga.

---

## RA-06 🟠 — a comissão do extrato é recalculada, não congelada

**Arquivo:** `statement.ts`

`userStatement()` chama `tradeFee(t.price)` para cada venda, recalculando a comissão a
partir das constantes **atuais**. O tipo `Trade` não grava a comissão que foi efetivamente
cobrada.

A decisão original é defensável: não gravar evita que tela e execução divirjam, e enquanto
as taxas não mudam os dois valores são idênticos.

**O problema:** no dia em que `FEE_PCT` ou `FEE_FIXED` mudarem, **o extrato muda o
passado**. Um extrato impresso hoje e o mesmo extrato impresso depois dirão valores
diferentes para a mesma venda. Numa contestação, os dois documentos são prova e se
contradizem.

**Por que não foi corrigido:** gravar a comissão no `Trade` altera `types.ts` — superfície
protegida, fonte da verdade do modelo — e obrigava rotação de `AUREA_STORE_KEY`.

**Atualização de 02/09/2026 (frente B):** `Trade` ganhou o campo **opcional** `fee?` — a
comissão total congelada na gravação, coluna `fee` de `aurea.trades`. Com o estado em
tabelas, não há mais chave de blob a rotacionar. O motor e as ações continuam criando o
`Trade` sem o campo; a camada de banco o preenche ao gravar e o devolve na leitura.
**`statement.ts` continua recalculando** — trocar para `t.fee ?? tradeFee(t.price) * qty` é
uma linha, e é a decisão CD-09, dos sócios.

**Como se paga:** a linha acima, depois do "sim". O ledger do M4 herda o valor gravado.

**Atualização de 03/09/2026 (M4):** o ledger e a DRE já leem `t.fee` — a receita da empresa
não recalcula. Só o extrato da conta (`statement.ts`) ainda recalcula, e continua sendo a
decisão CD-09.

---

## RA-02 🔴 — senhas em texto puro no catálogo

**Arquivo:** `constants.ts`, `ACCOUNTS`

As sete contas de teste têm senha literal (`'12345678'`). O tipo `User` também aceita
`pass?: string` em texto puro, para a senha trocada pelo usuário.

**Como se paga:** Supabase Auth (Fase 2). A plataforma deixa de conhecer senha.

---

## O que NÃO é atalho nesta pasta

Para não confundir dívida com decisão:

- **`Math.random()` no `seed.ts`** é proposital — a "cara" da demonstração varia a cada
  semeadura, e os testes afirmam faixas e propriedades, nunca valores sorteados.
- **`AppState` como blob JSON** é o desenho atual, não um atalho. Muda na Fase 1.
- **A ausência de teste em `src/server/`** pertence àquela pasta, não a esta.
