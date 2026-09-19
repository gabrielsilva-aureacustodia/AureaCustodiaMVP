# src/server/session.ts

**Arquivo:** `src/server/session.ts`
**Camada:** servidor — porta da aplicação para a sessão
**Responsável:** Guilherme

---

## 19/09/2026 — A criptografia saiu; a API pública continua idêntica

**O que foi alterado**

`getSessionEmail`, `setSession` e `clearSession` seguem com a mesma assinatura e o mesmo
comportamento. O que saiu foi o miolo: `sessionSecret`, `sign`, `signatureMatches`, o
`createHmac` e o `Buffer` foram para `session-core.ts`.

O arquivo ficou com duas responsabilidades: ler e gravar o cookie — o que exige
`cookies()` do `next/headers` — e carregar a barreira `server-only`.

**Por que foi alterado**

O `middleware.ts` precisa conferir a mesma assinatura, e não pode importar um módulo com
`server-only` nem com `node:crypto`. A alternativa era duplicar a criptografia, que é o
tipo de duplicação que um dia deixa de concordar — e a divergência aqui seria silenciosa.

**O que observar**

**Nenhum chamador precisou mudar.** Quem usa a sessão continua importando
`@/server/session`. O núcleo não é para ser importado direto, e há teste reprovando isso.

**O formato do cookie não mudou**, então sessão aberta antes do deploy continua valendo.
É exatamente o que `session-core.test.ts` prova: monta um cookie com o código antigo
(`node:crypto`) e exige que o novo o aceite.

Este arquivo tem `server-only` e por isso fica **fora da suíte** de testes, por decisão
registrada no `vitest.config.mts` — o pacote estoura fora do contexto de servidor do
Next, e é assim que deve ser. A cobertura do que ele faz está no teste do núcleo, e o
caminho completo foi verificado com login real em 19/09.
